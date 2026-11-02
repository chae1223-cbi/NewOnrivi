// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) verifyUser로 사용자 인증 및 소유권(user_id) 검증
//             2) FOR UPDATE 행 잠금 및 영향 행 수 검증
//             3) 응답 계약 및 에러 코드 표준화 (SUCCESS, NOT_FOUND, INVALID_PARAMS, UNAUTHORIZED, FORBIDDEN, DATABASE_ERROR)
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyUser } from '@/lib/authVerify';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { p_subscription_id, p_user_id } = body;

    if (!p_subscription_id || !UUID.test(p_subscription_id)) {
      return NextResponse.json({ success: false, code: 'INVALID_PARAMS', message: '유효한 구독 식별자(ID)가 필요합니다.' }, { status: 400 });
    }

    const { user, error: authError } = await verifyUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, code: 'UNAUTHORIZED', message: '인증이 필요하거나 세션이 만료되었습니다.' }, { status: 401 });
    }

    if (p_user_id && p_user_id !== user.id) {
      return NextResponse.json({ success: false, code: 'FORBIDDEN', message: '본인의 구독만 해지할 수 있습니다.' }, { status: 403 });
    }

    const result = await sql.begin(async (tx) => {
      // 1. 대상 구독 잠금 및 활성 상태 확인
      const existing = await tx`
        SELECT id, plan_name, is_active
        FROM public.subscriptions
        WHERE id = ${p_subscription_id} AND user_id = ${user.id}
        FOR UPDATE
      `;

      if (existing.length === 0 || !existing[0].is_active) {
        return { success: false, code: 'NOT_FOUND', message: '해지할 구독을 찾을 수 없습니다.' };
      }

      // 2. 구독 상태를 CANCELED 및 is_active = false로 변경 (단일 원자적 쓰기)
      const updatedSub = await tx`
        UPDATE public.subscriptions
        SET plan_status = 'CANCELED',
            is_active = false,
            canceled_at = now(),
            updated_at = now(),
            updated_by = ${user.id}
        WHERE id = ${p_subscription_id}
          AND user_id = ${user.id}
          AND is_active = true
        RETURNING id
      `;

      if (updatedSub.length !== 1) {
        throw new Error('구독 해지 처리 중 영향 행 수 불일치가 발생했습니다.');
      }

      return { success: true, code: 'SUCCESS', message: '구독이 해지되었습니다.' };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[/api/subscription/cancel] Transaction failed:', error);
    return NextResponse.json({
      success: false,
      code: 'DATABASE_ERROR',
      message: '구독 해지 처리 중 일시적인 시스템 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
