// 🚨 @PATCH : 2026-11-02 — [외부 Auth MFA REST 루프 제거 및 PostgreSQL 원트랜잭션 전환]:
//             1) listUsers() 50명 제한 검색 버그 및 N+1 DELETE fetch 루프 완전 제거
//             2) public.users 이메일 조회 + auth.mfa_factors 삭제를 단일 원자적 PostgreSQL 트랜잭션으로 통합
import { jsonResponse, handleOptions, checkAdminAuth, adminServerError } from '../_shared.js';
import { withDbTransaction } from '../../_db.js';
import { DB_CODES } from '../../_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
       return jsonResponse({ error: authResult.error }, authResult.status);
    }
    const adminId = authResult.user.id;

    const { email } = await request.json().catch(() => ({}));

    if (!email) {
      return jsonResponse({ error: '이메일이 제공되지 않았습니다.' }, 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const outcome = await withDbTransaction(env, async db => {
      // 1. 사용자 ID 조회
      const userRes = await db.query(
        'SELECT id, email FROM public.users WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (!userRes.rows.length) {
        return { success: false, error: '사용자를 찾을 수 없습니다.', status: 404 };
      }
      const targetUserId = userRes.rows[0].id;

      // 2. challenges 및 factors 원자적 삭제
      await db.query(
        'DELETE FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE user_id = $1)',
        [targetUserId]
      );
      const deleteRes = await db.query(
        'DELETE FROM auth.mfa_factors WHERE user_id = $1',
        [targetUserId]
      );

      const deletedCount = deleteRes.rowCount || 0;

      // 3. 감사 로그 적재
      await db.query(
        `INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
         VALUES ($1, $2, 'MFA_RESET', $3)`,
        [targetUserId, adminId, `Reset ${deletedCount} MFA factors for ${normalizedEmail}`]
      );

      return { success: true, count: deletedCount };
    });

    if (!outcome.success) {
      return jsonResponse({ error: outcome.error }, outcome.status || 400);
    }

    if (outcome.count === 0) {
      return jsonResponse({ message: '등록된 인증 기기가 없습니다.' }, 200);
    }

    return jsonResponse({ 
      success: true, 
      message: `${outcome.count}개의 인증 기기가 성공적으로 초기화되었습니다.`
    });

  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/mfa/reset.js', 'mfa_reset');
  }
}
