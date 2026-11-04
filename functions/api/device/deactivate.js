// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계 완성] 4xx 클라이언트 경고 pre-logging 추가 및 failure 헬퍼 표준화
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction/getAuthUser로 교체
// 🚨 @PATCH : 2026-11-03 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시로 정밀 진단 연계
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling, skills/onrivi-common-codes 준수]
//             1) Supabase REST API 호출을 PostgreSQL 단일 트랜잭션(withDbTransaction)으로 전환
//             2) 사용자 소유권(user_id) 교차 검증 및 기기 접속 세션 원자적 해제(DELETE)
//             3) serverError 연동으로 진단 ID(request_id) 추적성 보장
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

const failure = (code, message, status = 400) => {
  if (status >= 400 && status < 500) {
    console.warn(`[ClientWarn] HTTP ${status} · ${code} · ${message} [경로: /api/device/deactivate]`);
  }
  return new Response(JSON.stringify({ success: false, code, message }), {
    status,
    headers: corsHeaders,
  });
};

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    const authUser = await getAuthUser(request, env);
    body = await request.json().catch(() => ({}));
    const { p_activation_id, p_payment_no, p_device_uuid, p_user_id } = body;

    const targetUserId = (p_user_id && UUID.test(p_user_id))
      ? p_user_id
      : (authUser?.id || null);

    const outcome = await withDbTransaction(env, async db => {
      // 1. Activation ID로 바로 해제하는 경우 (대시보드 기기 해제)
      if (p_activation_id) {
        if (!UUID.test(p_activation_id)) {
          return { success: false, code: 'INVALID_PARAMS', message: '유효한 기기 식별자가 아닙니다.', status: 400 };
        }

        // 소유권 검증 (해당 유저의 세션이거나 해당 유저의 구독에 속한 기기인지)
        if (targetUserId) {
          const actQuery = await db.query(`
            SELECT a.id, a.created_by, s.user_id as sub_owner_id
            FROM public.license_activations a
            LEFT JOIN public.subscriptions s ON s.id = a.subscription_id
            WHERE a.id = $1
            FOR UPDATE OF a
          `, [p_activation_id]);

          if (!actQuery.rows.length) {
            return { success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.', status: 200 };
          }

          const actRow = actQuery.rows[0];
          const isOwner = actRow.created_by === targetUserId || actRow.sub_owner_id === targetUserId;
          if (!isOwner) {
            return { success: false, code: 'FORBIDDEN', message: '본인의 기기 접속 세션만 해제할 수 있습니다.', status: 403 };
          }
        }

        const delResult = await db.query(`
          DELETE FROM public.license_activations
          WHERE id = $1
          RETURNING id
        `, [p_activation_id]);

        if (delResult.rowCount === 0) {
          return { success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.', status: 200 };
        }

        return { success: true, code: 'SUCCESS', message: '기기가 해제되었습니다.', status: 200 };
      }

      // 2. 결제번호 + 디바이스 UUID로 해제하는 경우 (에디터 로그아웃)
      if (p_payment_no && p_device_uuid) {
        const subParams = [p_payment_no];
        let subSql = `SELECT id FROM public.subscriptions WHERE payment_no = $1`;
        if (targetUserId) {
          subSql += ` AND user_id = $2`;
          subParams.push(targetUserId);
        }

        const subRes = await db.query(subSql, subParams);
        if (!subRes.rows.length) {
          return { success: false, code: 'NOT_FOUND', message: '해당 결제번호의 구독 정보를 찾을 수 없습니다.', status: 200 };
        }

        const subscriptionId = subRes.rows[0].id;
        const delResult = await db.query(`
          DELETE FROM public.license_activations
          WHERE subscription_id = $1 AND device_uuid = $2
          RETURNING id
        `, [subscriptionId, p_device_uuid]);

        if (delResult.rowCount === 0) {
          return { success: false, code: 'NOT_FOUND', message: '해당 세션을 찾을 수 없습니다.', status: 200 };
        }

        return { success: true, code: 'SUCCESS', message: '세션이 해제되었습니다.', status: 200 };
      }

      return { success: false, code: 'INVALID_PARAMS', message: '필수 파라미터가 누락되었습니다.', status: 400 };
    });

    if (outcome.status >= 400 && outcome.status < 500) {
      console.warn(`[ClientWarn] HTTP ${outcome.status} · ${outcome.code} · ${outcome.message} [경로: /api/device/deactivate]`);
    }

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
      source: 'functions/api/device/deactivate.js',
      stage: 'deactivate_device',
      doing: '기기 세션 원격 해제 DB 트랜잭션 중',
      target: body?.p_device_uuid || 'DEVICE',
      message: '기기 해제 처리 중 일시적인 시스템 오류가 발생했습니다.',
    });
  }
}
