import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 로컬 Next 개발 API도 운영 Pages Function과 같은 소유권·웹 기기 조건을 사용한다.
export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!authResponse.ok) return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
    const user = await authResponse.json();
    if (!user?.id) return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });

    const body = await request.json();
    const targetDeviceUuid: string | null = body.target_device_uuid ?? null;
    const currentDeviceUuid: string = body.current_device_uuid;
    const fallbackDeviceUuid: string | null = body.fallback_device_uuid ?? null;
    if (body.activation_id !== undefined ||
        (targetDeviceUuid !== null && (typeof targetDeviceUuid !== 'string' || !targetDeviceUuid.trim() || targetDeviceUuid.length > 200)) ||
        typeof currentDeviceUuid !== 'string' || !currentDeviceUuid.trim() || currentDeviceUuid.length > 200 ||
        (fallbackDeviceUuid !== null && (typeof fallbackDeviceUuid !== 'string' || fallbackDeviceUuid.length > 200))) {
      return NextResponse.json({ success: false, message: '현재 기기 또는 해제 대상 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const deleted = await sql.begin(async (tx) => {
      const rows = await tx`
        DELETE FROM public.license_activations AS activation
        USING public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id
          AND subscription.user_id = ${user.id}::uuid
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
          AND (${targetDeviceUuid?.trim() || null}::text IS NULL OR activation.device_uuid = ${targetDeviceUuid?.trim() || null}::text)
          AND activation.device_uuid <> ${currentDeviceUuid.trim()}
          AND (${fallbackDeviceUuid?.trim() || null}::text IS NULL OR activation.device_uuid <> ${fallbackDeviceUuid?.trim() || null})
        RETURNING activation.id`;
      return rows.length;
    });

    if (targetDeviceUuid && deleted === 0) {
      return NextResponse.json({ success: false, message: '해제할 수 있는 웹 세션을 찾지 못했습니다.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted, message: `${deleted}개의 웹 세션을 해제했습니다.` });
  } catch (error) {
    console.error('[dashboard-sessions] web session deletion failed', error);
    return NextResponse.json({ success: false, message: '웹 세션 해제 중 문제가 발생했습니다.' }, { status: 500 });
  }
}
