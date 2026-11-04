// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시 및 4xx 비즈니스 예외 console.warn 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction, apiJson } from '../_db.js';
import { serverError } from '../_server-error.js';

// 로그아웃할 탭의 웹 세션만 사용자 소유권을 확인한 뒤 삭제한다.
export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthUser(request, env);
    if (!user?.id) {
      console.warn('[ClientWarn] HTTP 401 · UNAUTHORIZED · 로그인이 필요합니다. [경로: /api/device/logout-session]');
      return apiJson({ success: false, message: '로그인이 필요합니다.' }, 401);
    }
    const { device_uuid: deviceUuid } = await request.json().catch(() => ({}));
    if (typeof deviceUuid !== 'string' || !deviceUuid.trim() || deviceUuid.length > 200) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · 현재 탭 정보가 올바르지 않습니다. [경로: /api/device/logout-session]');
      return apiJson({ success: false, message: '현재 탭 정보가 올바르지 않습니다.' }, 400);
    }

    const deleted = await withDbTransaction(env, async (db) => {
      const result = await db.query(`
        DELETE FROM public.license_activations AS activation
        USING public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id
          AND subscription.user_id = $1
          AND activation.device_uuid = $2
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
        RETURNING activation.id`, [user.id, deviceUuid.trim()]);
      return result.rowCount;
    });
    return apiJson({ success: true, deleted });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/device/logout-session.js',
      stage: 'DELETE_SESSION',
      doing: '웹 탭 세션 해제(DELETE) 트랜잭션 쿼리 중',
      target: 'device_uuid',
      message: '웹 세션 해제에 실패했습니다.'
    });
  }
}
