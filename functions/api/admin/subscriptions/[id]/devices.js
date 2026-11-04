// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] adminServerError 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-10-08 — UUID 정규표현식 5그룹(8-4-4-4-12) 누락 수정
import { withDbTransaction, apiJson } from '../../../_db.js';
import { checkAdminAuth, adminServerError } from '../../_shared.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestPost({ request, env, params }) {
  const auth = await checkAdminAuth(request, env, ['SUPER']);
  if (auth.error) return apiJson({ success: false, error: auth.error }, auth.status || 403);
  let body;
  try { body = await request.json(); } catch { return apiJson({ success: false, error: '요청 형식이 올바르지 않습니다.' }, 400); }
  const reason = String(body.reason || '').trim();
  if (!UUID.test(params.id) || (body.deviceId && !UUID.test(body.deviceId)) || reason.length < 3 || reason.length > 500) {
    return apiJson({ success: false, error: '대상 ID 또는 사유가 올바르지 않습니다.' }, 400);
  }
  try {
    const result = await withDbTransaction(env, async db => {
      const subscription = await db.query('SELECT id, user_id FROM public.subscriptions WHERE id = $1 FOR UPDATE', [params.id]);
      if (!subscription.rows.length) return { status: 404, error: '구독을 찾을 수 없습니다.' };
      if (body.deviceId) {
        const found = await db.query('SELECT id FROM public.license_activations WHERE id = $1 AND subscription_id = $2 FOR UPDATE', [body.deviceId, params.id]);
        if (!found.rows.length) return { status: 404, error: '이 구독의 기기를 찾을 수 없습니다.' };
      }
      const changed = body.deviceId
        ? await db.query(`UPDATE public.license_activations SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = $1
            WHERE id = $2 AND subscription_id = $3 AND is_active = true RETURNING id`, [auth.user.id, body.deviceId, params.id])
        : await db.query(`UPDATE public.license_activations SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = $1
            WHERE subscription_id = $2 AND is_active = true RETURNING id`, [auth.user.id, params.id]);
      if (changed.rows.length) await db.query(`INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES ($1, $2, $3, $4)`, [subscription.rows[0].user_id, auth.user.id,
        body.deviceId ? 'LICENSE_DEVICE_DEACTIVATE' : 'LICENSE_DEVICES_DEACTIVATE',
        `subscription=${params.id}; device=${body.deviceId || 'ALL'}; count=${changed.rows.length}; ${reason}`]);
      return { status: 200, changed: changed.rows.length };
    });
    return result.error ? apiJson({ success: false, error: result.error }, result.status) : apiJson({ success: true, changed: result.changed });
  } catch (error) {
    return adminServerError(request, error, 'functions/api/admin/subscriptions/[id]/devices.js', 'deactivate_subscription_devices');
  }
}
