// 🚨 @PATCH : 2026-11-04 — [오류 진단 로깅 4단계]: serverError에 doing, target 명시 및 4xx 비즈니스 예외 console.warn 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction, apiJson } from '../_db.js';
import { serverError } from '../_server-error.js';

// 대시보드 전용 해제: 검증된 계정의 웹 세션만 한 SQL 명령으로 삭제한다.
// 기존 /api/device/deactivate는 로그아웃·데스크톱에서도 사용하므로 변경하지 않는다.
export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthUser(request, env);
    if (!user?.id) {
      console.warn('[ClientWarn] HTTP 401 · UNAUTHORIZED · 로그인이 필요합니다. [경로: /api/device/dashboard-sessions]');
      return apiJson({ success: false, message: '로그인이 필요합니다.' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const targetDeviceUuid = body.target_device_uuid ?? null;
    const currentDeviceUuid = body.current_device_uuid;
    const fallbackDeviceUuid = body.fallback_device_uuid ?? null;
    if (body.activation_id !== undefined ||
        (targetDeviceUuid !== null && (typeof targetDeviceUuid !== 'string' || !targetDeviceUuid.trim() || targetDeviceUuid.length > 200)) ||
        typeof currentDeviceUuid !== 'string' || !currentDeviceUuid.trim() || currentDeviceUuid.length > 200 ||
        (fallbackDeviceUuid !== null && (typeof fallbackDeviceUuid !== 'string' || fallbackDeviceUuid.length > 200))) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · 현재 기기 또는 해제 대상 정보가 올바르지 않습니다. [경로: /api/device/dashboard-sessions]');
      return apiJson({ success: false, message: '현재 기기 또는 해제 대상 정보가 올바르지 않습니다.' }, 400);
    }

    const deleted = await withDbTransaction(env, async (db) => {
      const result = await db.query(`
        DELETE FROM public.license_activations AS activation
        USING public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id
          AND subscription.user_id = $1
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
          AND ($2::text IS NULL OR activation.device_uuid = $2::text)
          AND activation.device_uuid <> $3
          AND ($4::text IS NULL OR activation.device_uuid <> $4)
        RETURNING activation.id`, [user.id, targetDeviceUuid?.trim() || null, currentDeviceUuid.trim(), fallbackDeviceUuid?.trim() || null]);
      return result.rowCount;
    });

    if (targetDeviceUuid && deleted === 0) {
      console.warn(`[ClientWarn] HTTP 404 · NOT_FOUND · 해제할 수 있는 웹 세션을 찾지 못했습니다. [대상: ${targetDeviceUuid}]`);
      return apiJson({ success: false, message: '해제할 수 있는 웹 세션을 찾지 못했습니다.' }, 404);
    }
    return apiJson({ success: true, deleted, message: `${deleted}개의 웹 세션을 해제했습니다.` });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/device/dashboard-sessions.js',
      stage: 'DELETE_DASHBOARD_SESSIONS',
      doing: '대시보드 웹 세션 일괄 해제 트랜잭션 쿼리 중',
      target: 'dashboard_device_session',
      message: '웹 세션 해제 중 문제가 발생했습니다.'
    });
  }
}
