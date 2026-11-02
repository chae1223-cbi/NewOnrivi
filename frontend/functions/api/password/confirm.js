// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { withDbTransaction } from '../_db.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export async function onRequestOptions() {
  return new Response(null, { headers });
}

export async function onRequestPost({ request, env }) {
  try {
    const { p_email, p_new_password, p_access_token, p_user_access_token } = await request.json();
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';
    const token = p_access_token || p_user_access_token;
    if (!email || typeof p_new_password !== 'string' || !token) {
      return reply({ success: false, code: 'INVALID_PARAMS', message: '필수 파라미터가 누락되었습니다.' }, 400);
    }
    if (p_new_password.length < 8 || p_new_password.length > 20 ||
        !/[a-z]/.test(p_new_password) || !/\d/.test(p_new_password) ||
        !/[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]/.test(p_new_password)) {
      return reply({ success: false, code: 'INVALID_PASSWORD', message: '비밀번호 조건을 확인해 주세요.' }, 400);
    }
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase Auth is not configured');
    }
    const userResponse = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return reply({ success: false, code: 'TOKEN_INVALID', message: '재설정 세션이 만료되었습니다.' }, 401);
    const user = await userResponse.json();
    if (!user?.id || user.email?.toLowerCase() !== email) {
      return reply({ success: false, code: 'TOKEN_INVALID', message: '재설정 계정이 일치하지 않습니다.' }, 401);
    }

    // 재설정 기록 잠금·사용 완료 표시를 한 DB 트랜잭션으로 처리한다.
    // Auth의 비밀번호 변경은 외부 서비스 호출이라 DB COMMIT까지 원자적으로 묶을 수 없다.
    const result = await withDbTransaction(env, async (db) => {
      const resets = await db.query(`
        SELECT id FROM public.password_resets
        WHERE created_by = $1 AND lower(email) = $2 AND used = false
          AND is_deleted = false AND expires_at > now()
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [user.id, email]);
      if (!resets.rows.length) {
        return { success: false, code: 'TOKEN_INVALID', message: '유효한 재설정 요청이 없습니다.' };
      }
      const authUpdate = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: p_new_password }),
      });
      if (!authUpdate.ok) throw new Error('PW_UPDATE_ERROR');
      await db.query(`
        UPDATE public.password_resets SET used = true, updated_at = now(), updated_by = $2
        WHERE id = $1`, [resets.rows[0].id, user.id]);
      return { success: true, code: 'RESET_COMPLETE', message: '비밀번호가 변경되었습니다.' };
    });
    return reply(result, result.success ? 200 : 400);
  } catch (error) {
    console.error('[/api/password/confirm] failed', error);
    const authError = error?.message === 'PW_UPDATE_ERROR';
    return reply({ success: false, code: authError ? 'PW_UPDATE_ERROR' : 'DB_ERROR', message: authError ? '비밀번호 변경에 실패했습니다.' : '재설정 요청을 처리할 수 없습니다.' }, 500);
  }
}
