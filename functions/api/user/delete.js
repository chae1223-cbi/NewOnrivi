// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] serverError 및 4xx [ClientWarn] 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (body, status = 200) => {
  if (status >= 400 && status < 500) {
    console.warn(`[ClientWarn] HTTP ${status} · ${body?.code || 'WARN'} · ${body?.message || '클라이언트 요청 경고'} [경로: /api/user/delete]`);
  }
  return new Response(JSON.stringify(body), { status, headers });
};

export async function onRequestOptions() {
  return new Response(null, { headers });
}

export async function onRequestPost({ request, env }) {
  try {
    const { p_user_id } = await request.json();
    const user = await getAuthUser(request, env);
    if (!user?.id) return reply({ success: false, code: 'UNAUTHORIZED', message: '다시 로그인해 주세요.' }, 401);
    if (p_user_id !== user.id) return reply({ success: false, code: 'FORBIDDEN', message: '본인 계정만 탈퇴할 수 있습니다.' }, 403);

    await withDbTransaction(env, async (db) => {
      const owner = await db.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [user.id]);
      if (!owner.rows.length) throw new Error('회원 정보를 찾을 수 없습니다.');
      await db.query(`
        DELETE FROM public.license_activations
        WHERE subscription_id IN (SELECT id FROM public.subscriptions WHERE user_id = $1)`, [user.id]);
      await db.query(`
        UPDATE public.subscriptions
        SET is_active = false, plan_status = 'CANCELED', updated_at = now()
        WHERE user_id = $1`, [user.id]);
      await db.query(`
        UPDATE public.users
        SET is_deleted = true, deleted_at = now(), updated_at = now(), updated_by = $1
        WHERE id = $1`, [user.id]);
      await db.query(`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES ($1, null, 'USER_WITHDRAW', '사용자 본인 자진 탈퇴')`, [user.id]);
    });
    return reply({ success: true, code: 'SUCCESS', message: '회원 탈퇴가 처리되었습니다.' });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/user/delete.js',
      stage: 'delete_user_account',
      doing: '회원 자진 탈퇴 및 세션 정리 트랜잭션 중',
      target: user?.id || 'USER',
      message: '회원 탈퇴를 처리할 수 없습니다.'
    });
  }
}
