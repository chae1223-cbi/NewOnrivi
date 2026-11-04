// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] adminServerError 연동
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-10-08 — UUID 정규표현식 5그룹(8-4-4-4-12) 누락 수정
import { withDbTransaction, apiJson } from '../../../_db.js';
import { checkAdminAuth, adminServerError } from '../../_shared.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestGet({ request, env, params }) {
  const auth = await checkAdminAuth(request, env);
  if (auth.error) return apiJson({ success: false, error: auth.error }, auth.status || 403);
  if (!UUID.test(params.id)) return apiJson({ success: false, error: '구독 ID가 올바르지 않습니다.' }, 400);
  try {
    const result = await withDbTransaction(env, async db => {
      const current = await db.query(`
        SELECT s.id, s.user_id, u.email, s.plan_name, s.plan_status, s.billing_cycle,
          s.is_active, s.max_devices, s.current_period_start, s.current_period_end,
          s.created_at, s.updated_at, s.canceled_at,
          CASE WHEN s.payment_no LIKE 'ADMIN-FREE-%' THEN 'ADMIN_FREE'
               WHEN s.payment_no LIKE 'ADMIN-PAID-%' THEN 'ADMIN_PAID'
               WHEN s.billing_cycle = 'TRIAL' THEN 'TRIAL' ELSE 'UNKNOWN' END AS grant_type
        FROM public.subscriptions s JOIN public.users u ON u.id = s.user_id WHERE s.id = $1`, [params.id]);
      if (!current.rows.length) return null;
      const userId = current.rows[0].user_id;
      const history = await db.query(`SELECT id, plan_name, plan_status, billing_cycle, is_active, current_period_start, current_period_end, created_at
        FROM public.subscriptions WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`, [userId]);
      const devices = await db.query(`SELECT id, subscription_id, device_name, left(device_uuid, 8) AS device_hint,
        activated_at, deactivated_at, is_active, updated_at FROM public.license_activations
        WHERE subscription_id = $1 ORDER BY activated_at DESC LIMIT 100`, [params.id]);
      const audits = await db.query(`SELECT l.id, l.action_type, l.reason, l.created_at, u.email AS admin_email
        FROM public.user_audit_logs l LEFT JOIN public.users u ON u.id = l.admin_id
        WHERE l.target_user_id = $1 AND l.action_type IN ('PLAN_CHANGE', 'KILL_SESSION', 'LICENSE_DEVICE_DEACTIVATE', 'LICENSE_DEVICES_DEACTIVATE')
        ORDER BY l.created_at DESC LIMIT 100`, [userId]);
      return { current: current.rows[0], history: history.rows, devices: devices.rows, audits: audits.rows };
    });
    return result ? apiJson({ success: true, ...result }) : apiJson({ success: false, error: '구독을 찾을 수 없습니다.' }, 404);
  } catch (error) {
    return adminServerError(request, error, 'functions/api/admin/subscriptions/[id]/index.js', 'get_subscription_detail');
  }
}
