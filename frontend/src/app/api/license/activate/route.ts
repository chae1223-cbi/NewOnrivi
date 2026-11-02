import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { insertLicenseActivationQuery } from '@/lib/db/queries/licenseQueries';

// 로컬 Next API도 서버의 단일 DB 트랜잭션으로 웹 편집 좌석 1개를 판정한다.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { p_license_id, p_device_uuid, p_device_name, p_user_id, p_is_expired, p_force_takeover } = body;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(p_license_id) || typeof p_device_uuid !== 'string' || !p_device_uuid.trim() || p_device_uuid.length > 200 ||
        typeof p_device_name !== 'string' || !p_device_name.trim() || p_device_name.length > 100 ||
        !(['web saas', 'web browser'].includes(p_device_name.trim().toLowerCase()) || p_device_name.toLowerCase().includes('desktop'))) {
      return NextResponse.json({ success: false, code: 'INVALID_PARAMS', message: '기기 또는 구독 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const isWeb = ['web saas', 'web browser'].includes(p_device_name.trim().toLowerCase());
    if (isWeb) {
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!token || !supabaseUrl || !anonKey) {
        return NextResponse.json({ success: false, code: 'UNAUTHORIZED', message: '다시 로그인해 주세요.' }, { status: 401 });
      }
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (!authResponse.ok) {
        return NextResponse.json({ success: false, code: 'UNAUTHORIZED', message: '다시 로그인해 주세요.' }, { status: 401 });
      }
      const authUser = await authResponse.json();
      const owners = await sql`SELECT user_id FROM public.subscriptions WHERE id = ${p_license_id}::uuid`;
      if (!authUser?.id || owners[0]?.user_id !== authUser.id) {
        return NextResponse.json({ success: false, code: 'FORBIDDEN', message: '본인 구독의 웹 세션만 전환할 수 있습니다.' }, { status: 403 });
      }
    }

    const result = await insertLicenseActivationQuery(
      sql, p_license_id, p_device_uuid, p_device_name, p_user_id,
      p_is_expired === true, p_force_takeover === true,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/license/activate] transaction failed', error);
    return NextResponse.json({ success: false, code: 'SERVER_ERROR', message: '세션 등록 중 문제가 발생했습니다.' }, { status: 500 });
  }
}
