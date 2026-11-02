import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 로컬 개발 서버도 운영 Pages Function과 동일한 사용자 소유권 조건으로 조회한다.
export async function GET(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!authResponse.ok) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    const user = await authResponse.json();
    if (!user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const deviceUuid = new URL(request.url).searchParams.get('device_uuid');
    if (!deviceUuid || deviceUuid.length > 200) return NextResponse.json({ error: '기기 정보가 올바르지 않습니다.' }, { status: 400 });

    const rows = await sql`
      SELECT 1 FROM public.license_activations AS activation
      JOIN public.subscriptions AS subscription ON subscription.id = activation.subscription_id
      WHERE subscription.user_id = ${user.id}::uuid AND activation.device_uuid = ${deviceUuid}
        AND lower(trim(coalesce(activation.device_name, ''))) IN ('web saas', 'web browser')
      LIMIT 1
    `;
    return NextResponse.json({ exists: rows.length > 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[session-status] local lookup failed', error);
    return NextResponse.json({ error: '세션 확인에 실패했습니다.' }, { status: 500 });
  }
}
