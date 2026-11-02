import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { p_activation_id } = body;

    if (!p_activation_id) {
      return NextResponse.json({ success: false, code: 'INVALID_PARAM', message: '기기 접속 ID가 필요합니다.' }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM license_activations WHERE id = ${p_activation_id} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, code: 'NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.' });
    }

    return NextResponse.json({ success: true, code: 'SUCCESS', message: '기기가 해제되었습니다.' });
  } catch (error: any) {
    console.error('[/api/rpc/device/delete] Error:', error);
    return NextResponse.json({ success: false, code: 'ERROR', message: error.message }, { status: 500 });
  }
}
