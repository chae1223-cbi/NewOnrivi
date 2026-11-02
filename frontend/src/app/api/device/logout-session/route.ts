import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// 현재 로그인 계정의 현재 웹 탭만 해제한다. 결제번호 캐시에 의존하지 않는다.
export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!authResponse.ok) return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
    const user = await authResponse.json();
    if (!user?.id) return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });

    const { device_uuid: deviceUuid } = await request.json();
    if (typeof deviceUuid !== 'string' || !deviceUuid.trim() || deviceUuid.length > 200) {
      return NextResponse.json({ success: false, message: '현재 탭 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const deleted = await sql.begin(async (tx) => {
      const rows = await tx`
        DELETE FROM public.license_activations AS activation
        USING public.subscriptions AS subscription
        WHERE activation.subscription_id = subscription.id
          AND subscription.user_id = ${user.id}::uuid
          AND activation.device_uuid = ${deviceUuid.trim()}
          AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
        RETURNING activation.id
      `;
      return rows.length;
    });
    return NextResponse.json({ success: true, deleted }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[logout-session] delete failed', error);
    return NextResponse.json({ success: false, message: '웹 세션 해제에 실패했습니다.' }, { status: 500 });
  }
}
