// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction } from '../_db.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const randomHex = size => Array.from(crypto.getRandomValues(new Uint8Array(size)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

export async function onRequestOptions() {
  return new Response(null, { headers });
}

export async function onRequestPost({ request, env }) {
  try {
    const { p_id, p_email, p_provider, p_nick_name, p_password } = await request.json();
    if (p_password !== undefined) {
      return reply({ success: false, code: 'INVALID_PARAMS', message: '비밀번호는 인증 서비스의 재설정 절차로 변경해 주세요.' }, 400);
    }
    const user = await getAuthUser(request, env);
    if (!user?.id) return reply({ success: false, code: 'UNAUTHORIZED', message: '다시 로그인해 주세요.' }, 401);
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';
    if (user.id !== p_id || !email || user.email?.toLowerCase() !== email) {
      return reply({ success: false, code: 'FORBIDDEN', message: '본인 계정만 저장할 수 있습니다.' }, 403);
    }
    const provider = String(p_provider || user.app_metadata?.provider || 'EMAIL').trim().toUpperCase();
    const nickName = typeof p_nick_name === 'string' ? p_nick_name.trim() : null;

    await withDbTransaction(env, async (db) => {
      await db.query(`
        INSERT INTO public.users
          (id, created_by, created_at, updated_by, updated_at, email, provider, is_deleted, deleted_at, nick_name)
        VALUES ($1, $1, now(), $1, now(), $2, $3, false, null, $4)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email, provider = EXCLUDED.provider,
          updated_by = EXCLUDED.id, updated_at = now(),
          is_deleted = false, deleted_at = null,
          nick_name = COALESCE(EXCLUDED.nick_name, users.nick_name)`,
        [user.id, email, provider, nickName]);

      // 신규 가입자 14일 무료 체험(APPRENTICE) 자동 발급: 기존 구독 이력이 없는 경우에만 원자적 생성
      const subExists = await db.query(
        'SELECT id FROM public.subscriptions WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      if (!subExists.rows.length) {
        const subId = crypto.randomUUID();
        const licenseKey = randomHex(8);
        const verifyKey = randomHex(8);
        const paymentNo = `TRIAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex(4)}`;
        await db.query(`
          INSERT INTO public.subscriptions
            (id, user_id, created_by, updated_by, plan_name, plan_status, billing_cycle,
             license_key, verify_key, payment_no, max_devices, price_amount,
             current_period_start, current_period_end, is_active, created_at, updated_at)
          VALUES ($1, $2, $2, $2, 'APPRENTICE', 'ACTIVE', 'TRIAL',
                  $3, $4, $5, 1, 0,
                  now(), now() + interval '14 days', true, now(), now())`,
          [subId, user.id, licenseKey, verifyKey, paymentNo]
        );
      }
    });
    // Auth 프로필은 DB 밖의 서비스다. 실패해도 저장된 사용자 원장은 유지한다.
    if (nickName !== null && env.SUPABASE_SERVICE_ROLE_KEY && env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const profile = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_metadata: { ...user.user_metadata, nick_name: nickName, name: nickName } }),
        });
        if (!profile.ok) console.warn('[/api/user/upsert] Auth metadata sync failed', profile.status);
      } catch (error) {
        console.warn('[/api/user/upsert] Auth metadata sync failed', error);
      }
    }
    return reply({ success: true, code: 'SUCCESS', message: '사용자 정보가 저장되었습니다.' });
  } catch (error) {
    console.error('[/api/user/upsert] failed', error);
    return reply({ success: false, code: 'DB_ERROR', message: '사용자 정보를 저장할 수 없습니다.' }, 500);
  }
}
