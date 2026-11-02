// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling 준수]
//             1) REST fetch를 PostgreSQL 직접 쿼리(withDbTransaction)로 전환하여 원자성 확보
//             2) serverError 연동으로 오류 추적성 보장
import { withDbTransaction } from '../../_db.js';
import { serverError } from '../../_server-error.js';

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

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { p_activation_id } = body;

    if (!p_activation_id || !UUID.test(p_activation_id)) {
      return new Response(JSON.stringify({ success: false, code: 'INVALID_PARAM', message: '유효한 기기 접속 ID가 필요합니다.' }), { status: 400, headers: corsHeaders });
    }

    const outcome = await withDbTransaction(env, async db => {
      const delRes = await db.query(`
        DELETE FROM public.license_activations
        WHERE id = $1
        RETURNING id
      `, [p_activation_id]);

      if (delRes.rowCount === 0) {
        return { success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.', status: 200 };
      }

      return { success: true, code: 'SUCCESS', message: '기기가 해제되었습니다.', status: 200 };
    });

    return new Response(JSON.stringify(outcome), { status: outcome.status, headers: corsHeaders });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/rpc/device/delete.js',
      stage: 'delete_device_rpc',
      message: '기기 삭제 처리 중 오류가 발생했습니다.',
    });
  }
}
