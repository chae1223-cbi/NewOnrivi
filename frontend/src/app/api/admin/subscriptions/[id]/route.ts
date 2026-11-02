/** 🚨 @PATCH : 2026-09-30 — 구독 ID UUID 정규표현식 검증 오류(5개 세그먼트 표준 규격) 수정 (400 Bad Request 해결) */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin(request);
  if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ success: false, error: '구독 ID가 올바르지 않습니다.' }, { status: 400 });
  try {
    const current = await sql`
      SELECT s.id, s.user_id, u.email, u.nick_name,
        s.plan_name, s.plan_status, s.billing_cycle, s.license_key, s.payment_no, s.price_amount,
        s.is_active, s.max_devices, s.current_period_start, s.current_period_end,
        s.created_at, s.updated_at, s.canceled_at,
        CASE WHEN s.payment_no LIKE 'ADMIN-FREE-%' THEN 'ADMIN_FREE'
             WHEN s.payment_no LIKE 'ADMIN-PAID-%' THEN 'ADMIN_PAID'
             WHEN s.billing_cycle = 'TRIAL' THEN 'TRIAL' ELSE 'UNKNOWN' END AS grant_type
      FROM public.subscriptions s JOIN public.users u ON u.id = s.user_id
      WHERE s.id = ${params.id}::uuid`;
    if (!current.length) return NextResponse.json({ success: false, error: '구독을 찾을 수 없습니다.' }, { status: 404 });
    const userId = current[0].user_id;
    const [history, devices, audits] = await Promise.all([
      sql`SELECT id, plan_name, plan_status, billing_cycle, is_active, current_period_start, current_period_end, created_at
          FROM public.subscriptions WHERE user_id = ${userId}::uuid ORDER BY created_at DESC, id DESC LIMIT 100`,
      sql`SELECT id, subscription_id, device_name, left(device_uuid, 8) AS device_hint,
            activated_at, deactivated_at, is_active, updated_at
          FROM public.license_activations WHERE subscription_id = ${params.id}::uuid
          ORDER BY activated_at DESC LIMIT 100`,
      sql`SELECT l.id, l.action_type, l.reason, l.created_at, u.email AS admin_email
          FROM public.user_audit_logs l LEFT JOIN public.users u ON u.id = l.admin_id
          WHERE l.target_user_id = ${userId}::uuid AND l.action_type IN ('PLAN_CHANGE', 'KILL_SESSION', 'LICENSE_DEVICE_DEACTIVATE', 'LICENSE_DEVICES_DEACTIVATE')
          ORDER BY l.created_at DESC LIMIT 100`
    ]);
    return NextResponse.json({ success: true, current: current[0], history, devices, audits }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/subscriptions] detail failed', error);
    return NextResponse.json({ success: false, error: '구독 상세를 불러오지 못했습니다.' }, { status: 500 });
  }
}
