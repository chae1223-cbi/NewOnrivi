export const SESSION_QUERY = `
WITH selected AS MATERIALIZED (
  SELECT s.id AS subscription_id, s.user_id, s.plan_name, s.plan_status,
    s.is_active AS subscription_active, s.current_period_end,
    a.id AS activation_id, a.is_active AS activation_active, a.device_name,
    coalesce(a.updated_at, a.activated_at) AS last_seen
  FROM public.subscriptions s
  LEFT JOIN LATERAL (
    SELECT id, is_active, device_name, updated_at, activated_at
    FROM public.license_activations
    WHERE subscription_id = s.id AND device_uuid = $1
    ORDER BY activated_at DESC LIMIT 1
  ) a ON true
  WHERE ($2::text IS NULL OR s.payment_no = $2)
    AND ($3::uuid IS NULL OR s.user_id = $3::uuid)
  ORDER BY (a.id IS NOT NULL) DESC, s.current_period_end DESC NULLS LAST
  LIMIT 1
), evaluated AS MATERIALIZED (
  SELECT *, upper(coalesce(plan_name, '')) <> 'READER'
    AND upper(coalesce(plan_status, '')) IN ('ACTIVE', 'FREE')
    AND (subscription_active = true OR upper(plan_status) = 'FREE')
    AND (current_period_end IS NULL OR current_period_end > now())
    AND NOT (upper(plan_name) = 'DESKTOP_ONLY'
      AND lower(trim(coalesce(device_name, ''))) IN ('web saas', 'web browser')) AS eligible
  FROM selected
), heartbeat AS (
  UPDATE public.license_activations a
  SET updated_at = now(), updated_by = e.user_id,
    is_active = CASE WHEN NOT e.eligible THEN false ELSE a.is_active END
  FROM evaluated e
  WHERE a.id = e.activation_id
    AND (coalesce(a.updated_at, a.activated_at) < now() - interval '55 seconds'
      OR (a.is_active = true AND NOT e.eligible))
  RETURNING a.id
)
SELECT activation_id, activation_active, eligible, plan_name, plan_status,
  last_seen < now() - interval '5 minutes' AS idle_expired
FROM evaluated`;

export async function checkSession(body, user, query) {
  const device = body?.p_device_uuid, payment = body?.p_payment_no || null;
  if (typeof device !== 'string' || !device.trim() || device.length > 200 ||
      payment !== null && (typeof payment !== 'string' || payment.length > 200)) {
    return { status: 400, data: { success: false, code: 'INVALID_PARAMS' } };
  }
  // Older desktop/web clients retain their existing payment+device lookup.
  // New web requests always verify JWT ownership in the query above.
  if (!user && !payment) return { status: 401, data: { success: false, code: 'UNAUTHORIZED' } };
  const rows = await query(SESSION_QUERY, [device, payment, user?.id || null]);
  const row = rows[0], exists = !!row?.activation_id;
  const active = exists && row.eligible === true && row.activation_active === true;
  return { status: 200, data: {
    success: true, exists, has_session: active, is_restricted: exists && !active,
    is_terminated: !exists, max_devices: row?.eligible ? 1 : 0,
    reason: !exists ? 'TERMINATED' : !row.eligible ? 'PLAN_EXPIRED' : !active ? 'RESTRICTED' : 'ACTIVE',
    idle_expired: row?.idle_expired === true, plan_name: row?.plan_name || null,
    plan_status: row?.plan_status || null
  } };
}
