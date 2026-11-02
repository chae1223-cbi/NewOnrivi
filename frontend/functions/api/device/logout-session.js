// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
import { getAuthUser, withDbTransaction, apiJson } from '../_db.js';

// 로그아웃할 탭의 웹 세션만 사용자 소유권을 확인한 뒤 삭제한다.
export async function onRequestPost({ request, env }) {
  try {
    const user = await getAuthUser(request, env);
    if (!user?.id) return apiJson({ success: false, message: '로그인이 필요합니다.' }, 401);
    const { device_uuid: deviceUuid } = await request.json();
    if (typeof deviceUuid !== 'string' || !deviceUuid.trim() || deviceUuid.length > 200) {
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
    console.error('[logout-session] delete failed', error);
    return apiJson({ success: false, message: '웹 세션 해제에 실패했습니다.' }, 500);
  }
}
