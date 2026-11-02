/** 🚨 @PATCH : 2026-10-08 — 상단 핵심 통계 카드 6종(ACTIVE, HAS_DEVICES 포함) 일대일 정합 필터링 완벽 지원 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') || 1);
  const search = (params.get('search') || '').trim();
  const status = params.get('status') || 'ALL';
  const plan = params.get('plan') || 'ALL';
  const grant = params.get('grant') || 'ALL';
  const attention = params.get('attention') || 'ALL';
  if (!Number.isInteger(page) || page < 1 || page > 100000 || search.length > 200 ||
      !['ALL', 'ACTIVE', 'CANCELED', 'EXPIRED'].includes(status) ||
      !['ALL', 'ACTIVE', 'EXPIRING_7', 'EXPIRING_30', 'OVER_LIMIT', 'STALE_ACTIVE', 'HAS_DEVICES'].includes(attention) ||
      !['ALL', 'ADMIN_FREE', 'ADMIN_PAID', 'TRIAL', 'UNKNOWN'].includes(grant) ||
      (plan !== 'ALL' && !/^[A-Z][A-Z0-9_]{1,49}$/.test(plan))) {
    return NextResponse.json({ success: false, error: '검색 조건이 올바르지 않습니다.' }, { status: 400 });
  }
  try {
    const stats = await sql`
      WITH device_counts AS (
        SELECT subscription_id, count(*)::int AS devices FROM public.license_activations
        WHERE is_active = true GROUP BY subscription_id
      )
      SELECT
        count(*) FILTER (WHERE s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end > now())::int AS active,
        count(*) FILTER (WHERE s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end BETWEEN now() AND now() + interval '7 days')::int AS expiring_7,
        count(*) FILTER (WHERE s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end BETWEEN now() AND now() + interval '30 days')::int AS expiring_30,
        count(*) FILTER (WHERE s.is_active AND s.current_period_end <= now())::int AS stale_active,
        coalesce(sum(d.devices), 0)::int AS devices,
        count(*) FILTER (WHERE coalesce(d.devices, 0) > s.max_devices)::int AS over_limit
      FROM public.subscriptions s LEFT JOIN device_counts d ON d.subscription_id = s.id`;
    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await sql`
      WITH device_counts AS (
        SELECT subscription_id, count(*)::int AS devices FROM public.license_activations
        WHERE is_active = true GROUP BY subscription_id
      )
      SELECT s.id, s.user_id, u.email, s.plan_name, s.plan_status, s.billing_cycle,
        s.is_active, s.current_period_start, s.current_period_end, s.max_devices,
        s.created_at, s.updated_at, coalesce(d.devices, 0)::int AS devices,
        CASE WHEN s.payment_no LIKE 'ADMIN-FREE-%' THEN 'ADMIN_FREE'
             WHEN s.payment_no LIKE 'ADMIN-PAID-%' THEN 'ADMIN_PAID'
             WHEN s.billing_cycle = 'TRIAL' THEN 'TRIAL'
             ELSE 'UNKNOWN' END AS grant_type,
        count(*) OVER()::int AS total
      FROM public.subscriptions s
      JOIN public.users u ON u.id = s.user_id
      LEFT JOIN device_counts d ON d.subscription_id = s.id
      WHERE (${search} = '' OR u.email ILIKE ${term} ESCAPE '\' OR s.user_id::text = ${search})
        AND (${status} = 'ALL' OR s.plan_status = ${status})
        AND (${plan} = 'ALL' OR s.plan_name = ${plan})
        AND (${grant} = 'ALL' OR
          (${grant} = 'ADMIN_FREE' AND s.payment_no LIKE 'ADMIN-FREE-%') OR
          (${grant} = 'ADMIN_PAID' AND s.payment_no LIKE 'ADMIN-PAID-%') OR
          (${grant} = 'TRIAL' AND s.billing_cycle = 'TRIAL' AND coalesce(s.payment_no, '') NOT LIKE 'ADMIN-%') OR
          (${grant} = 'UNKNOWN' AND s.billing_cycle <> 'TRIAL' AND coalesce(s.payment_no, '') NOT LIKE 'ADMIN-%'))
        AND (${attention} = 'ALL'
          OR (${attention} = 'ACTIVE' AND s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end > now())
          OR (${attention} = 'EXPIRING_7' AND s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end BETWEEN now() AND now() + interval '7 days')
          OR (${attention} = 'EXPIRING_30' AND s.is_active AND s.plan_status = 'ACTIVE' AND s.current_period_end BETWEEN now() AND now() + interval '30 days')
          OR (${attention} = 'OVER_LIMIT' AND coalesce(d.devices, 0) > s.max_devices)
          OR (${attention} = 'STALE_ACTIVE' AND s.is_active AND s.current_period_end <= now())
          OR (${attention} = 'HAS_DEVICES' AND coalesce(d.devices, 0) > 0))
      ORDER BY s.created_at DESC, s.id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`;
    return NextResponse.json({ success: true, data: rows.map(({ total: _total, ...row }) => row), total: rows[0]?.total || 0, stats: stats[0], canManage: auth.adminRole === 'SUPER', asOf: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/subscriptions] GET failed', error);
    return NextResponse.json({ success: false, error: '구독 현황을 불러오지 못했습니다.' }, { status: 500 });
  }
}
