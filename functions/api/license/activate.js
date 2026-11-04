// ====================================================================
// 📊 [OMD-API-licenseActivate-0001] functions/api/license/activate.js
// 🎯 @KICK  : Cloudflare Functions 기반 라이선스 기기 활성화 엔드포인트
// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] serverError 및 4xx [ClientWarn] 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : **2026-10-03** — [세션 제어권 인수 시 타 세션 제한사용자 유지]: force_takeover 시 기존 세션을 DELETE 하지 않고 is_active = false로 업데이트하여 타 세션이 세션아웃 없이 제한사용자(미리보기 전용) 상태로 전환되도록 지원
// ====================================================================
import { getAuthUser, withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';

// 웹 편집 좌석은 legacy max_devices와 무관하게 사용자당 1개다.
// 데스크톱 지정 장치는 웹 좌석을 차지하지 않는다.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEB_NAMES = new Set(['web saas', 'web browser']);
const response = (data, status = 200) => {
  if (status >= 400 && status < 500) {
    console.warn(`[ClientWarn] HTTP ${status} · ${data?.code || 'WARN'} · ${data?.message || '클라이언트 요청 경고'} [경로: /api/license/activate]`);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
};

export async function onRequestOptions() {
  return new Response(null, { headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  } });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const licenseId = body.p_license_id;
    const deviceUuid = body.p_device_uuid;
    const deviceName = body.p_device_name;
    if (!UUID.test(licenseId) || typeof deviceUuid !== 'string' || !deviceUuid.trim() || deviceUuid.length > 200 ||
        typeof deviceName !== 'string' || !deviceName.trim() || deviceName.length > 100) {
      return response({ success: false, code: 'INVALID_PARAMS', message: '기기 또는 구독 정보가 올바르지 않습니다.' }, 400);
    }

    const isWeb = WEB_NAMES.has(deviceName.trim().toLowerCase());
    const isDesktop = deviceName.toLowerCase().includes('desktop');
    if (!isWeb && !isDesktop) return response({ success: false, code: 'INVALID_PARAMS', message: '지원하지 않는 기기 유형입니다.' }, 400);

    const webUser = isWeb ? await getAuthUser(request, env) : null;
    if (isWeb && !webUser?.id) {
      return response({ success: false, code: 'UNAUTHORIZED', message: '편집 권한 확인을 위해 다시 로그인해 주세요.' }, 401);
    }

    const result = await withDbTransaction(env, async (db) => {
      const subResult = await db.query(`
        SELECT id, user_id, is_active, plan_name, plan_status, current_period_end
        FROM public.subscriptions WHERE id = $1`, [licenseId]);
      const sub = subResult.rows[0];
      if (!sub) return { success: false, code: 'NOT_FOUND', message: '구독을 찾을 수 없습니다.' };
      if (isWeb && sub.user_id !== webUser.id) {
        return { success: false, code: 'FORBIDDEN', message: '본인 구독의 웹 세션만 전환할 수 있습니다.' };
      }

      // 사용자 행 잠금으로 같은 계정의 동시 등록 요청을 직렬화한다.
      const owner = await db.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [sub.user_id]);
      if (!owner.rows.length) return { success: false, code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' };

      const status = String(sub.plan_status).toUpperCase();
      const planName = String(sub.plan_name).toUpperCase();
      const eligible = !body.p_is_expired && planName !== 'READER' &&
        (!isWeb || planName !== 'DESKTOP_ONLY') &&
        ['ACTIVE', 'FREE'].includes(status) && (sub.is_active === true || status === 'FREE') &&
        (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());

      if (isWeb) {
        // 하트비트가 5분 넘게 중단된 웹 세션만 정리한다. 데스크톱은 건드리지 않는다.
        await db.query(`
          UPDATE public.license_activations AS activation
          SET is_active = false, updated_at = now()
          FROM public.subscriptions AS subscription
          WHERE activation.subscription_id = subscription.id AND subscription.user_id = $1
            AND activation.is_active = true
            AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
            AND coalesce(activation.updated_at, activation.activated_at) < now() - interval '5 minutes'`, [sub.user_id]);

        if (body.p_force_takeover === true && eligible) {
          await db.query(`
            UPDATE public.license_activations AS activation
            SET is_active = false, updated_at = now()
            FROM public.subscriptions AS subscription
            WHERE activation.subscription_id = subscription.id AND subscription.user_id = $1
              AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
              AND NOT (activation.subscription_id = $2 AND activation.device_uuid = $3)`, [sub.user_id, licenseId, deviceUuid]);
        }
      }

      const existing = await db.query(`
        SELECT id FROM public.license_activations
        WHERE subscription_id = $1 AND device_uuid = $2
        ORDER BY activated_at DESC LIMIT 1 FOR UPDATE`, [licenseId, deviceUuid]);

      let active = eligible;
      if (active && isWeb) {
        const count = await db.query(`
          SELECT count(*)::int AS total
          FROM public.license_activations AS activation
          JOIN public.subscriptions AS subscription ON subscription.id = activation.subscription_id
          WHERE subscription.user_id = $1 AND activation.is_active = true
            AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
            AND ($2::uuid IS NULL OR activation.id <> $2::uuid)`, [sub.user_id, existing.rows[0]?.id || null]);
        active = count.rows[0].total < 1;
      }

      let activationId;
      if (existing.rows.length) {
        activationId = existing.rows[0].id;
        await db.query(`
          UPDATE public.license_activations
          SET activated_at = now(), updated_at = now(), is_active = $2,
              device_name = $3, updated_by = $4
          WHERE id = $1`, [activationId, active, deviceName, sub.user_id]);
      } else {
        const inserted = await db.query(`
          INSERT INTO public.license_activations
            (subscription_id, device_uuid, device_name, activated_at, updated_at, is_active, created_by, updated_by)
          VALUES ($1, $2, $3, now(), now(), $4, $5, $5)
          RETURNING id`, [licenseId, deviceUuid, deviceName, active, sub.user_id]);
        activationId = inserted.rows[0].id;
      }

      if (!eligible) return { success: false, code: 'RESTRICTED_PLAN', message: '현재 요금제는 웹 편집을 사용할 수 없습니다.', max_devices: 0, activation_id: activationId };
      if (!active) return { success: false, code: 'EXCEED_MAX_DEVICES', message: '다른 웹 브라우저에서 이미 편집 중입니다.', max_devices: 1, activation_id: activationId };
      return { success: true, code: 'SUCCESS', message: '기기가 활성화되었습니다.', max_devices: 1, activation_id: activationId };
    });
    return response(result);
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/license/activate.js',
      stage: 'activate_license_session',
      doing: '기기 라이선스 세션 활성화 및 등록 중',
      target: (typeof licenseId !== 'undefined' ? licenseId : 'LICENSE'),
      message: '세션 등록 중 문제가 발생했습니다.'
    });
  }
}
