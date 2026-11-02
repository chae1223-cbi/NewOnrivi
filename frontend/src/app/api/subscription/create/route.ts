import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_CODE = /^[A-Z][A-Z0-9_]{1,49}$/;
const failure = (code: string, message: string, status: number) => NextResponse.json({ success: false, code, message }, { status });

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !anonKey) return failure('UNAUTHORIZED', '다시 로그인해 주세요.', 401);
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!authResponse.ok) return failure('UNAUTHORIZED', '다시 로그인해 주세요.', 401);
    const user = await authResponse.json();
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

    const outcome = await sql.begin(async tx => {
      // 계정 행을 잠가 두 요청의 무료 이력 검사와 플랜 변경을 순서대로 처리한다.
      const owner = await tx`SELECT id FROM public.users WHERE id = ${user.id}::uuid FOR UPDATE`;
      if (!owner.length) return { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.', status: 404 };
      const selected = await tx`
        SELECT plan_code, sys_type, is_free, price_monthly, price_yearly
        FROM public.pricing_plans WHERE plan_code = ${planCode} AND is_active = true FOR SHARE`;
      const plan = selected[0];
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

      const previous = await tx`
        SELECT plan_name FROM public.subscriptions
        WHERE user_id = ${user.id}::uuid AND plan_name <> 'READER' ORDER BY created_at DESC LIMIT 1`;
      if (isFree && previous.length) {
        return { code: 'FREE_ALREADY_USED', message: '무료 이상 요금제 신청 이력이 있어 무료 요금제를 다시 신청할 수 없습니다.', status: 409 };
      }
      const current = await tx`
        SELECT plan_name, billing_cycle FROM public.subscriptions
        WHERE user_id = ${user.id}::uuid AND is_active = true AND plan_status IN ('ACTIVE', 'FREE')
        ORDER BY created_at DESC LIMIT 1`;
      if (current[0]?.plan_name === planCode && current[0]?.billing_cycle === cycle) {
        return { code: 'ALREADY_CURRENT', message: '이미 이용 중인 요금제입니다.', status: 409 };
      }

      const subId = crypto.randomUUID();
      const licenseKey = crypto.randomBytes(8).toString('hex').toUpperCase();
      const verifyKey = crypto.randomBytes(8).toString('hex').toUpperCase();
      // TODO(payment): 결제 승인과 금액 검증이 연결되면 유료 신청 경로를 별도로 개방한다.
      const paymentNo = `SUB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const period = isFree ? '7 days' : cycle === 'YEARLY' ? '1 year' : '1 month';

      await tx`
        UPDATE public.subscriptions SET plan_status = 'EXPIRED', is_active = false, updated_at = now(), updated_by = ${user.id}::uuid
        WHERE user_id = ${user.id}::uuid AND is_active = true`;
      await tx`
        UPDATE public.license_activations AS activation SET is_active = false, updated_at = now(), updated_by = ${user.id}::uuid
        FROM public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id AND subscription.user_id = ${user.id}::uuid AND activation.is_active = true`;
      await tx`
        INSERT INTO public.subscriptions
          (id, user_id, created_by, updated_by, plan_name, plan_status, billing_cycle,
           license_key, verify_key, payment_no, max_devices, price_amount,
           current_period_start, current_period_end, is_active, created_at, updated_at)
        VALUES (${subId}::uuid, ${user.id}::uuid, ${user.id}::uuid, ${user.id}::uuid, ${planCode}, 'ACTIVE', ${cycle},
                ${licenseKey}, ${verifyKey}, ${paymentNo}, 1, ${amount},
                now(), now() + ${period}::interval, true, now(), now())`;
      if (String(plan.sys_type).toUpperCase() === 'WEB') {
        await tx`
          INSERT INTO public.license_activations
            (subscription_id, device_uuid, device_name, activated_at, updated_at, is_active, created_by, updated_by)
          VALUES (${subId}::uuid, ${deviceUuid}, 'Web SaaS', now(), now(), true, ${user.id}::uuid, ${user.id}::uuid)`;
      }
      return { success: true, code: 'SUCCESS', message: '요금제가 활성화되었습니다.',
        subscription_id: subId, license_id: subId, license_key: licenseKey, verify_key: verifyKey, payment_no: paymentNo };
    });
    if (!outcome.success) return failure(outcome.code, outcome.message, outcome.status ?? 400);
    return NextResponse.json(outcome, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[/api/subscription/create] transaction failed', error);
    return failure('SERVER_ERROR', '요금제 변경에 실패했습니다.', 500);
  }
}
