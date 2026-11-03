// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction/getAuthUser로 교체
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시로 정밀 진단 연계
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) Supabase REST API 호출을 PostgreSQL 단일 트랜잭션(withDbTransaction)으로 전환
//             2) 사용자 인증(getAuthUser) 및 구독 소유권(user_id)과 활성 상태(is_active=true) 행 잠금(FOR UPDATE) 검증
//             3) 구독 취소 시 영향 행 수(rowCount === 1) 원자적 검증 및 롤백 보장
//             4) 예기치 못한 예외 발생 시 공통 오류 처리(serverError) 연동으로 request_id 추적성 및 안전한 한국어 응답 보장
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

    if (p_user_id && p_user_id !== authUser.id) {
      return failure('FORBIDDEN', '본인의 구독만 해지할 수 있습니다.', 403);
    }

    const outcome = await withDbTransaction(env, async db => {
      // 1) 대상 소유권 및 활성 구독 상태 행 잠금 확인
      const subResult = await db.query(`
        SELECT id, user_id, plan_name, plan_status, is_active
        FROM public.subscriptions
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `, [p_subscription_id, authUser.id]);

      if (!subResult.rows.length || subResult.rows[0].is_active !== true) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: '해지할 구독을 찾을 수 없습니다.',
          status: 200,
        };
      }

      // 2) 구독 CANCELED 처리 및 is_active = false 갱신 (영향 행 수 검증)
      const updateResult = await db.query(`
        UPDATE public.subscriptions
        SET plan_status = 'CANCELED',
            is_active = false,
            canceled_at = now(),
            updated_at = now(),
            updated_by = $2
        WHERE id = $1 AND user_id = $2 AND is_active = true
        RETURNING id
      `, [p_subscription_id, authUser.id]);

      if (updateResult.rowCount !== 1) {
        throw new Error('SUBSCRIPTION_CANCEL_FAILED: 구독 해지 처리 중 영향 행 수 불일치');
      }

      return {
        success: true,
        code: 'SUCCESS',
        message: '구독이 해지되었습니다.',
        status: 200,
      };
    });

    return new Response(JSON.stringify({
      success: outcome.success,
      code: outcome.code,
      message: outcome.message,
    }), {
      status: outcome.status,
      headers: corsHeaders,
    });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/subscription/cancel.js',
      stage: 'cancel_subscription',
      doing: '구독 해지 DB 트랜잭션 처리 중',
      target: subscription_id,
      message: '구독 해지 처리 중 일시적인 시스템 오류가 발생했습니다.',
    });
  }
}
