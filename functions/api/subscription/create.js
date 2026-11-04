// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계]: 4xx 비즈니스 예외 반환 직전 console.warn 사전 로깅 연동
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시로 정밀 진단 연계
// 🚨 @PATCH : 2026-11-01 — 공통 서버 오류 응답으로 요청 ID와 실패 위치를 연결한다.
import { getAuthUser, withDbTransaction, apiJson } from '../_db.js';
import { serverError } from '../_server-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_CODE = /^[A-Z][A-Z0-9_]{1,49}$/;

export async function onRequestOptions() {
  return new Response(null, { headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  } });
}

const failure = (code, message, status) => {
  console.warn(`[ClientWarn] HTTP ${status} · ${code} · ${message} [경로: /api/subscription/create]`);
  return apiJson({ success: false, code, message }, status);
};
const randomHex = size => Array.from(crypto.getRandomValues(new Uint8Array(size)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();

export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthUser(request, env);
    if (!user?.id || !UUID.test(user.id)) return failure('UNAUTHORIZED', '다시 로그인해 주세요.', 401);

    const body = await request.json();
    const planCode = String(body.p_plan_name || '').trim().toUpperCase();
    const billingInterval = String(body.p_billing_interval || '').trim().toLowerCase();
    const deviceUuid = body.p_device_uuid;
    if (!PLAN_CODE.test(planCode) || planCode === 'READER' || !['trial', 'month', 'year'].includes(billingInterval) ||
        typeof deviceUuid !== 'string' || !deviceUuid.trim() || deviceUuid.length > 200 ||
        (body.p_user_id && body.p_user_id !== user.id)) {
      return failure('INVALID_PARAMS', '요금제 또는 기기 정보가 올바르지 않습니다.', 400);
    }

    const outcome = await withDbTransaction(env, async db => {
      // 사용자 행 잠금으로 같은 계정의 동시 신청과 무료 재신청 검사를 직렬화한다.
      const owner = await db.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [user.id]);
      if (!owner.rows.length) return { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.', status: 404 };

      const selected = await db.query(`
        SELECT plan_code, sys_type, is_free, price_monthly, price_yearly
        FROM public.pricing_plans WHERE plan_code = $1 AND is_active = true FOR SHARE`, [planCode]);
      const plan = selected.rows[0];
      if (!plan) return { code: 'PLAN_NOT_AVAILABLE', message: '선택할 수 없는 요금제입니다.', status: 400 };
      // TODO(payment): 결제 승인 검증이 연결되기 전에는 유료 구독을 생성하지 않는다.
      if (plan.is_free !== true) return { code: 'PAYMENT_NOT_READY', message: '유료 요금제는 결제 서비스 준비 중입니다.', status: 503 };
      if (!['WEB', 'DESKTOP'].includes(String(plan.sys_type).toUpperCase())) {
        return { code: 'PLAN_NOT_AVAILABLE', message: '지원하지 않는 요금제 유형입니다.', status: 400 };
      }

      const isFree = plan.is_free === true;
      const cycle = isFree ? 'TRIAL' : billingInterval === 'year' ? 'YEARLY' : 'MONTHLY';
      const amount = isFree ? 0 : Number(billingInterval === 'year' ? plan.price_yearly : plan.price_monthly);
      if ((isFree && billingInterval !== 'trial') || (!isFree && (billingInterval === 'trial' || !Number.isFinite(amount) || amount <= 0))) {
        return { code: 'INVALID_CYCLE', message: '이 요금제에서 선택할 수 없는 결제 주기입니다.', status: 400 };
      }

      const previous = await db.query(`
        SELECT plan_name FROM public.subscriptions
        WHERE user_id = $1 AND plan_name <> 'READER' ORDER BY created_at DESC LIMIT 1`, [user.id]);
      if (isFree && previous.rows.length) {
        return { code: 'FREE_ALREADY_USED', message: '무료 이상 요금제 신청 이력이 있어 무료 요금제를 다시 신청할 수 없습니다.', status: 409 };
      }

      const current = await db.query(`
        SELECT plan_name, billing_cycle FROM public.subscriptions
        WHERE user_id = $1 AND is_active = true AND plan_status IN ('ACTIVE', 'FREE')
        ORDER BY created_at DESC LIMIT 1`, [user.id]);
      if (current.rows[0]?.plan_name === planCode && current.rows[0]?.billing_cycle === cycle) {
        return { code: 'ALREADY_CURRENT', message: '이미 이용 중인 요금제입니다.', status: 409 };
      }

      const subId = crypto.randomUUID();
      const licenseKey = randomHex(8);
      const verifyKey = randomHex(8);
      // TODO(payment): 결제 승인과 금액 검증이 연결되면 유료 신청 경로를 별도로 개방한다.
      const paymentNo = `SUB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex(4)}`;
      const period = isFree ? '14 days' : cycle === 'YEARLY' ? '1 year' : '1 month';

      await db.query(`
        UPDATE public.subscriptions SET plan_status = 'EXPIRED', is_active = false, updated_at = now(), updated_by = $1
        WHERE user_id = $1 AND is_active = true`, [user.id]);
      await db.query(`
        UPDATE public.license_activations AS activation SET is_active = false, updated_at = now(), updated_by = $1
        FROM public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id AND subscription.user_id = $1 AND activation.is_active = true`, [user.id]);
      await db.query(`
        INSERT INTO public.subscriptions
          (id, user_id, created_by, updated_by, plan_name, plan_status, billing_cycle,
           license_key, verify_key, payment_no, max_devices, price_amount,
           current_period_start, current_period_end, is_active, created_at, updated_at)
        VALUES ($1, $2, $2, $2, $3, 'ACTIVE', $4, $5, $6, $7, 1, $8,
                now(), now() + $9::interval, true, now(), now())`,
        [subId, user.id, planCode, cycle, licenseKey, verifyKey, paymentNo, amount, period]);

      // 웹 플랜은 현재 탭만 등록한다. 데스크톱은 실제 설치 기기에서 별도로 활성화한다.
      if (String(plan.sys_type).toUpperCase() === 'WEB') {
        await db.query(`
          INSERT INTO public.license_activations
            (subscription_id, device_uuid, device_name, activated_at, updated_at, is_active, created_by, updated_by)
          VALUES ($1, $2, 'Web SaaS', now(), now(), true, $3, $3)`, [subId, deviceUuid, user.id]);
      }
      return { success: true, code: 'SUCCESS', message: '요금제가 활성화되었습니다.',
        subscription_id: subId, license_id: subId, license_key: licenseKey, verify_key: verifyKey, payment_no: paymentNo };
    });
    if (!outcome.success) return failure(outcome.code, outcome.message, outcome.status);
    return apiJson(outcome);
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/subscription/create.js',
      stage: 'onRequestPost',
      doing: '신규 요금제 활성화 및 DB 트랜잭션 기록 중',
      target: body?.plan_name || 'PLAN',
      message: '요금제 변경에 실패했습니다.'
    });
  }
}
