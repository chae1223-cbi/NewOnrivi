/** 🚨 @PATCH : 2026-10-08 — 파라미터 세부 검증 오류 메시지 분리 개선 */
/** 🚨 @PATCH : 2026-09-28 — SUPER 관리자의 플랜·무료/유료·사용기간·필수 사유 수동 변경을 단일 DB 트랜잭션으로 처리 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_CODE = /^[A-Z][A-Z0-9_]{1,49}$/;

const failure = (code: string, message: string, status: number) =>
  NextResponse.json({ success: false, code, message }, { status });

export async function POST(request: Request) {
  const admin = await verifyAdmin(request, true);
  if (!admin.user) return failure('FORBIDDEN', admin.error || '관리자 권한이 필요합니다.', 403);

  try {
    const body = await request.json();
    const userId = String(body.userId || '');
    const planCode = String(body.planCode || '').trim().toUpperCase();
    const billingCycle = String(body.billingCycle || '').trim().toUpperCase();
    const grantType = String(body.grantType || '').trim().toUpperCase();
    const durationValue = Number(body.durationValue);
    const durationUnit = String(body.durationUnit || '').trim().toUpperCase();
    const reason = String(body.reason || '').trim();
    if (reason.length < 3 || reason.length > 500) {
      return failure('REASON_REQUIRED', '변경 사유를 3자 이상 500자 이하로 입력해 주세요.', 400);
    }
    const maxDuration = durationUnit === 'DAY' ? 3650 : durationUnit === 'MONTH' ? 120 : durationUnit === 'YEAR' ? 10 : 0;
    if (!UUID.test(userId)) {
      return failure('INVALID_USER_ID', '유효한 사용자 ID(UUID)가 아닙니다.', 400);
    }
    if (!PLAN_CODE.test(planCode)) {
      return failure('INVALID_PLAN_CODE', '유효한 요금제 코드가 아닙니다.', 400);
    }
    if (!['TRIAL', 'MONTHLY', 'YEARLY', 'NONE'].includes(billingCycle)) {
      return failure('INVALID_BILLING_CYCLE', '유효한 결제 주기 구분이 아닙니다.', 400);
    }
    if (!['FREE', 'PAID'].includes(grantType)) {
      return failure('INVALID_GRANT_TYPE', '유효한 제공 구분이 아닙니다.', 400);
    }
    if (planCode === 'READER' ? (durationValue !== 0 || durationUnit !== 'NONE') :
        (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > maxDuration)) {
      return failure('INVALID_DURATION', '사용 기간 설정이 올바르지 않습니다.', 400);
    }

    const result = await sql.begin(async tx => {
      const owner = await tx`SELECT id FROM public.users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!owner.length) return { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.', status: 404 };

      const selected = await tx`
        SELECT plan_code, sys_type, is_free, price_monthly, price_yearly FROM public.pricing_plans
        WHERE plan_code = ${planCode} AND is_active = true FOR SHARE`;
      const plan = selected[0];
      if (!plan) return { code: 'PLAN_NOT_AVAILABLE', message: '사용할 수 없는 요금제입니다.', status: 400 };
      if (!['WEB', 'DESKTOP'].includes(String(plan.sys_type).toUpperCase())) {
        return { code: 'PLAN_NOT_AVAILABLE', message: '지원하지 않는 요금제 유형입니다.', status: 400 };
      }

      const isReader = planCode === 'READER';
      const isTrial = !isReader && plan.is_free === true;
      if ((isReader || plan.is_free === true) && grantType !== 'FREE') {
        return { code: 'INVALID_GRANT_TYPE', message: '무료 요금제는 유료 이용으로 등록할 수 없습니다.', status: 400 };
      }
      if ((isReader && billingCycle !== 'NONE') || (isTrial && billingCycle !== 'TRIAL') ||
          (!isReader && !isTrial && !['MONTHLY', 'YEARLY'].includes(billingCycle))) {
        return { code: 'INVALID_CYCLE', message: '요금제에 맞는 기간을 선택해 주세요.', status: 400 };
      }
      if (!isReader && !isTrial &&
          !(Number(billingCycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly) > 0)) {
        return { code: 'INVALID_CYCLE', message: '선택한 기간은 해당 요금제에서 제공하지 않습니다.', status: 400 };
      }

      const current = await tx`
        SELECT plan_name, billing_cycle FROM public.subscriptions
        WHERE user_id = ${userId}::uuid AND is_active = true AND plan_status IN ('ACTIVE', 'FREE')
        ORDER BY created_at DESC LIMIT 1`;
      if (isReader && !current.length) return { code: 'ALREADY_CURRENT', message: '이미 Reader 상태입니다.', status: 409 };
      if (isTrial) {
        const previous = await tx`
          SELECT 1 FROM public.subscriptions WHERE user_id = ${userId}::uuid
          AND plan_name <> 'READER' LIMIT 1`;
        if (previous.length) return { code: 'FREE_ALREADY_USED', message: '무료 이상 요금제 이력이 있어 체험을 다시 부여할 수 없습니다.', status: 409 };
      }

      await tx`
        UPDATE public.license_activations AS activation
        SET is_active = false, updated_at = now(), updated_by = ${admin.user.id}::uuid
        FROM public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id
          AND subscription.user_id = ${userId}::uuid AND activation.is_active = true`;
      await tx`
        UPDATE public.license_activations SET is_active = false, updated_at = now(),
          updated_by = ${admin.user.id}::uuid
        WHERE created_by = ${userId}::uuid AND is_active = true`;
      await tx`
        UPDATE public.subscriptions SET plan_status = 'EXPIRED', is_active = false,
          updated_at = now(), updated_by = ${admin.user.id}::uuid
        WHERE user_id = ${userId}::uuid AND is_active = true`;

      let subscriptionId: string | null = null;
      if (!isReader) {
        subscriptionId = crypto.randomUUID();
        const period = `${durationValue} ${durationUnit.toLowerCase()}${durationValue === 1 ? '' : 's'}`;
        const licenseKey = crypto.randomBytes(8).toString('hex').toUpperCase();
        const verifyKey = crypto.randomBytes(8).toString('hex').toUpperCase();
        const paymentNo = `ADMIN-${grantType}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        // TODO(payment): 수동 유료 선택도 실제 결제 승인이 아니므로 수납 금액은 0으로 기록한다.
        await tx`
          INSERT INTO public.subscriptions
            (id, user_id, created_by, updated_by, plan_name, plan_status, billing_cycle,
             license_key, verify_key, payment_no, max_devices, price_amount,
             current_period_start, current_period_end, is_active, created_at, updated_at)
          VALUES (${subscriptionId}::uuid, ${userId}::uuid, ${admin.user.id}::uuid, ${admin.user.id}::uuid,
                  ${planCode}, 'ACTIVE', ${billingCycle}, ${licenseKey}, ${verifyKey}, ${paymentNo}, 1, 0,
                  now(), now() + ${period}::interval, true, now(), now())`;
      }

      await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${userId}::uuid, ${admin.user.id}::uuid, 'PLAN_CHANGE',
                ${`${current[0]?.plan_name || 'READER'} → ${planCode} (${grantType}, ${durationValue} ${durationUnit}): ${reason}`})`;
      return { success: true, planCode, grantType, subscriptionId };
    });

    if (!result.success) return failure(result.code || 'PLAN_CHANGE_FAILED', result.message || '요금제 변경에 실패했습니다.', result.status || 400);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/users/plan] transaction failed', error);
    return failure('SERVER_ERROR', '요금제 변경에 실패했습니다.', 500);
  }
}
