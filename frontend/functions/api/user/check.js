// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { withDbTransaction } from '../_db.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

export async function onRequestPost({ request, env }) {
  try {
    const { p_email, p_id } = await request.json();
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const byId = uuid.test(p_id || '');
    if (!email && !byId) return reply({ exists: false, is_deleted: false }, 400);

    const user = await withDbTransaction(env, async (db) => {
      const result = await db.query(`
        SELECT id, email, nick_name, provider, created_at, updated_at, is_deleted
        FROM public.users
        WHERE ${byId ? 'id = $1' : 'lower(email) = $1'}
        LIMIT 1`, [byId ? p_id : email]);
      return result.rows[0];
    });
    return reply(user ? { exists: true, ...user } : { exists: false, is_deleted: false });
  } catch (error) {
    console.error('[/api/user/check] failed', error);
    return reply({ exists: false, code: 'DB_ERROR', message: '회원 정보를 확인할 수 없습니다.' }, 500);
  }
}
