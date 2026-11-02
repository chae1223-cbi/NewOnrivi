/** 🚨 @PATCH : 2026-09-30 — 디바이스 해제 API의 UUID 정규표현식 검증 오류(5개 세그먼트 표준 규격) 수정 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await verifyAdmin(request, true);
  if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  let body: { deviceId?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 }); }
  const reason = String(body.reason || '').trim();
  if (!UUID.test(params.id) || (body.deviceId && !UUID.test(body.deviceId)) || reason.length < 3 || reason.length > 500) {
    return NextResponse.json({ success: false, error: '대상 ID 또는 사유가 올바르지 않습니다.' }, { status: 400 });
  }
  try {
    const result = await sql.begin(async tx => {
      const subscriptions = await tx`SELECT id, user_id FROM public.subscriptions WHERE id = ${params.id}::uuid FOR UPDATE`;
      if (!subscriptions.length) return { status: 404, error: '구독을 찾을 수 없습니다.' };
      if (body.deviceId) {
        const found = await tx`SELECT id FROM public.license_activations WHERE id = ${body.deviceId}::uuid AND subscription_id = ${params.id}::uuid FOR UPDATE`;
        if (!found.length) return { status: 404, error: '이 구독의 기기를 찾을 수 없습니다.' };
      }
      const changed = body.deviceId
        ? await tx`UPDATE public.license_activations SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = ${auth.user.id}::uuid
            WHERE id = ${body.deviceId}::uuid AND subscription_id = ${params.id}::uuid AND is_active = true RETURNING id`
        : await tx`UPDATE public.license_activations SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = ${auth.user.id}::uuid
            WHERE subscription_id = ${params.id}::uuid AND is_active = true RETURNING id`;
      if (changed.length) await tx`
        INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
        VALUES (${subscriptions[0].user_id}::uuid, ${auth.user.id}::uuid,
          ${body.deviceId ? 'LICENSE_DEVICE_DEACTIVATE' : 'LICENSE_DEVICES_DEACTIVATE'},
          ${`subscription=${params.id}; device=${body.deviceId || 'ALL'}; count=${changed.length}; ${reason}`})`;
      return { status: 200, changed: changed.length };
    });
    if ('error' in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, changed: result.changed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/subscriptions] device deactivate failed', error);
    return NextResponse.json({ success: false, error: '기기를 해제하지 못했습니다.' }, { status: 500 });
  }
}
