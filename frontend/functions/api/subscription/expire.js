// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction/getAuthUser로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) 다중 REST fetch 호출을 PostgreSQL 단일 트랜잭션(withDbTransaction)으로 통합하여 All-or-Nothing 무결성 보장
//             2) 구독 만료(EXPIRED) -> 기기 세션 비활성화(is_active=false) -> READER 요금제 발급을 단일 트랜잭션 원자적 처리
//             3) 사용자 인증(getAuthUser) 및 소유권 검증, FOR UPDATE 행 잠금 적용
//             4) serverError 공통 처리 연동으로 request_id 추적성 확보
import { getAuthUser, withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

const failure = (code, message, status = 400) =>
  new Response(JSON.stringify({ success: false, code, message }), {
    status,
    headers: corsHeaders,
  });

export async function onRequestPost({ request, env }) {
  try {
    const authUser = await getAuthUser(request, env);
    if (!authUser?.id || !UUID.test(authUser.id)) {
      return failure('UNAUTHORIZED', '인증이 필요하거나 세션이 만료되었습니다.', 401);
    }

    const body = await request.json().catch(() => ({}));
    const { p_subscription_id, p_user_id } = body;

    if (!p_subscription_id || !UUID.test(p_subscription_id)) {
      return failure('INVALID_PARAMS', '유효한 구독 식별자(ID)가 필요합니다.', 400);
    }

    const userId = (p_user_id && UUID.test(p_user_id)) ? p_user_id : authUser.id;
    if (userId !== authUser.id) {
      return failure('FORBIDDEN', '본인의 구독만 만료 처리할 수 있습니다.', 403);
    }

    const outcome = await withDbTransaction(env, async db => {
      // 1. 기존 구독 정보 확인 및 행 잠금
      const subResult = await db.query(`
        SELECT id, user_id, plan_name, plan_status, is_active, current_period_end
        FROM public.subscriptions
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `, [p_subscription_id, userId]);

      if (!subResult.rows.length) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: '만료 처리할 구독을 찾을 수 없습니다.',
          status: 200,
        };
      }

      // 2. 대상 구독 EXPIRED 처리
      await db.query(`
        UPDATE public.subscriptions
        SET plan_status = 'EXPIRED',
            is_active = false,
            canceled_at = now(),
            updated_at = now(),
            updated_by = $2
        WHERE id = $1 AND plan_status <> 'EXPIRED'
      `, [p_subscription_id, userId]);

      // 3. 해당 구독의 기기 세션 비활성화 (Realtime 유지 및 제한사용자 전환)
      await db.query(`
        UPDATE public.license_activations
        SET is_active = false,
            updated_at = now(),
            updated_by = $2
        WHERE subscription_id = $1 AND is_active = true
      `, [p_subscription_id, userId]);

      // 4. 사용자의 다른 활성 유료 요금제 존재 여부 확인
      const activeSubs = await db.query(`
        SELECT id, payment_no, plan_name
        FROM public.subscriptions
        WHERE user_id = $1 AND is_active = true AND plan_status IN ('ACTIVE', 'FREE')
        ORDER BY created_at DESC LIMIT 1
      `, [userId]);

      let newSubId = null;
      let newPaymentNo = null;

      if (activeSubs.rows.length > 0) {
        newSubId = activeSubs.rows[0].id;
        newPaymentNo = activeSubs.rows[0].payment_no;
      } else {
        // 5. 유료 요금제가 없는 경우 평생 무료 읽기 전용(READER) 플랜 자동 신규 생성 및 발급
        const readerPaymentNo = `READER-${Date.now()}`;
        const readerLicenseKey = `READER-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
        const readerVerifyKey = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
        const newReaderId = crypto.randomUUID();

        const insertResult = await db.query(`
          INSERT INTO public.subscriptions (
            id, user_id, plan_name, plan_status, billing_cycle, is_active,
            max_devices, price_amount, current_period_start, current_period_end,
            payment_no, license_key, verify_key, created_at, updated_at,
            created_by, updated_by
          ) VALUES (
            $1, $2, 'READER', 'ACTIVE', 'FREE', true,
            1, 0, now(), '9999-12-31T23:59:59.000Z',
            $3, $4, $5, now(), now(),
            $2, $2
          ) RETURNING id, payment_no
        `, [newReaderId, userId, readerPaymentNo, readerLicenseKey, readerVerifyKey]);

        newSubId = insertResult.rows[0].id;
        newPaymentNo = insertResult.rows[0].payment_no;
      }

      return {
        success: true,
        code: 'SUCCESS',
        message: '구독 만료 처리 및 READER 요금제 자동 전환이 완료되었습니다.',
        status: 200,
        new_subscription_id: newSubId,
        new_payment_no: newPaymentNo,
      };
    });

    return new Response(JSON.stringify(outcome), {
      status: outcome.status,
      headers: corsHeaders,
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/subscription/expire.js',
      stage: 'expire_subscription',
      message: '구독 만료 처리 중 일시적인 시스템 오류가 발생했습니다.',
    });
  }
}
