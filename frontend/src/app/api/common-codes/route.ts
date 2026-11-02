// ====================================================================
// 📊 [OMD-API-commonCodes-route-0001] /api/common-codes
// 🎯 @KICK  : Next.js 공통코드 안전 조회 API
// 🛡️ @GUARD : is_use = true 활성 코드만 노출, SQL 파라미터 바인딩, 브라우저 직접 테이블 접근 배제
// 🚨 @PATCH : 2026-11-02 — 클라이언트 브라우저의 common_codes 직접 조회를 서버 API로 전환
// 🔗 @CALLS : sql
// ====================================================================
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupCode = searchParams.get('group_code')?.trim() || null;

    let rows;
    if (groupCode) {
      rows = await sql`
        SELECT group_code, code_value, code_name, sort_order
        FROM public.common_codes
        WHERE is_use = true AND group_code = ${groupCode}
        ORDER BY sort_order ASC, code_value ASC
      `;
    } else {
      rows = await sql`
        SELECT group_code, code_value, code_name, sort_order
        FROM public.common_codes
        WHERE is_use = true
        ORDER BY group_code ASC, sort_order ASC, code_value ASC
      `;
    }

    return NextResponse.json({ success: true, data: rows }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      }
    });
  } catch (error: any) {
    console.error('[/api/common-codes] Query error:', error);
    return NextResponse.json({ success: false, error: '공통 코드를 조회할 수 없습니다.' }, { status: 500 });
  }
}
