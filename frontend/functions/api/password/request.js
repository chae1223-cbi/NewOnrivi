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
const sent = { success: true, code: 'SENT', message: '계정이 있다면 비밀번호 재설정 이메일이 발송됩니다.' };

export async function onRequestOptions() {
  return new Response(null, { headers });
}

export async function onRequestPost({ request, env }) {
  try {
    const { p_email, p_redirect_url } = await request.json();
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) return reply({ success: false, code: 'INVALID_PARAMS', message: '이메일을 입력해 주세요.' }, 400);
    const origin = new URL(request.url).origin;
    const redirect = p_redirect_url ? new URL(p_redirect_url, origin) : new URL('/reset-password', origin);
    if (redirect.origin !== origin || redirect.pathname !== '/reset-password') {
      return reply({ success: false, code: 'INVALID_REDIRECT', message: '재설정 주소가 올바르지 않습니다.' }, 400);
    }
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Supabase Auth is not configured');

    // DB 조회·기록은 하나의 트랜잭션으로 처리한다. 메일 발송 자체는 외부 서비스이므로 DB가 원자성을 보장할 수 없다.
    const result = await withDbTransaction(env, async (db) => {
      const users = await db.query(`
        SELECT id FROM public.users WHERE lower(email) = $1 AND is_deleted = false LIMIT 1`, [email]);
      if (!users.rows.length) return sent;
      const userId = users.rows[0].id;
      await db.query(`
        INSERT INTO public.password_resets
          (created_by, updated_by, email, token, expires_at, used, is_deleted)
        VALUES ($1, $1, $2, $3, now() + interval '30 minutes', false, false)`,
      [userId, email, crypto.randomUUID()]);
      const mail = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect.toString())}`, {
        method: 'POST',
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!mail.ok) throw new Error('MAIL_ERROR');
      return sent;
    });
    return reply(result);
  } catch (error) {
    console.error('[/api/password/request] failed', error);
    const mailError = error?.message === 'MAIL_ERROR';
    return reply({ success: false, code: mailError ? 'MAIL_ERROR' : 'DB_ERROR', message: mailError ? '메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '재설정 요청을 처리할 수 없습니다.' }, 500);
  }
}
