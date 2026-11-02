// 🚨 @PATCH : 2026-11-02 — [외부 Auth MFA REST 루프 제거 및 PostgreSQL 원트랜잭션 전환]:
//             1) listUsers() 50명 제한 검색 버그 및 N+1 DELETE fetch 루프 완전 제거
//             2) public.users 이메일 조회 + auth.mfa_factors 삭제를 단일 원자적 PostgreSQL 트랜잭션으로 통합
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.user) return NextResponse.json({ error: auth.error }, { status: 403 });
    const adminId = auth.user.id;

    const { email } = await request.json().catch(() => ({}));
    if (!email) {
      return NextResponse.json({ error: '이메일이 제공되지 않았습니다.' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const outcome = await sql.begin(async (tx) => {
      const userRes = await tx`
        SELECT id, email FROM public.users
        WHERE LOWER(email) = ${normalizedEmail}
        LIMIT 1
      `;
      if (userRes.length === 0) {
        return { success: false, error: '사용자를 찾을 수 없습니다.', status: 404 };
      }
      const targetUserId = userRes[0].id;

      await tx`
        DELETE FROM auth.mfa_challenges
        WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = ${targetUserId}::uuid)
      `;
      const deleteRes = await tx`
        DELETE FROM auth.mfa_factors
        WHERE user_id = ${targetUserId}::uuid
      `;

      const deletedCount = deleteRes.count || 0;

      await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${targetUserId}::uuid, ${adminId}::uuid, 'MFA_RESET', ${'Reset ' + deletedCount + ' MFA factors for ' + normalizedEmail})
      `;

      return { success: true, count: deletedCount };
    });

    if (!outcome.success) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status || 400 });
    }

    if (outcome.count === 0) {
      return NextResponse.json({ message: '등록된 인증 기기가 없습니다.' }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${outcome.count}개의 인증 기기가 성공적으로 초기화되었습니다.`
    });

  } catch (error: any) {
    console.error('OTP Reset Error:', error);
    return NextResponse.json({ error: '초기화 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
