// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시 및 4xx 비즈니스 예외 console.warn 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction, apiJson } from '../_db.js';
import { serverError } from '../_server-error.js';

// 다른 브라우저에서 세션을 해제했는지 확인한다. 현재 사용자 소유의 웹 세션만 조회한다.
export async function onRequestGet({ request, env }) {
  try {
    const user = await getAuthUser(request, env);
    if (!user?.id) {
      console.warn('[ClientWarn] HTTP 401 · UNAUTHORIZED · 로그인이 필요합니다. [경로: /api/device/session-status]');
      return apiJson({ error: '로그인이 필요합니다.' }, 401);
    }

    const deviceUuid = new URL(request.url).searchParams.get('device_uuid');
    if (!deviceUuid || deviceUuid.length > 200) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · 기기 정보가 올바르지 않습니다. [경로: /api/device/session-status]');
      return apiJson({ error: '기기 정보가 올바르지 않습니다.' }, 400);
    }

    const exists = await withDbTransaction(env, async db => {
      const result = await db.query(`
        SELECT 1 FROM public.license_activations AS activation
        JOIN public.subscriptions AS subscription ON subscription.id = activation.subscription_id
        WHERE subscription.user_id = $1 AND activation.device_uuid = $2
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
        LIMIT 1`, [user.id, deviceUuid]);
      return result.rows.length > 0;
    });
    return apiJson({ exists });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/device/session-status.js',
      stage: 'CHECK_SESSION',
      doing: '웹 기기 세션 유효 상태 조회 쿼리 중',
      target: 'device_uuid',
      message: '세션 확인에 실패했습니다.'
    });
  }
}
