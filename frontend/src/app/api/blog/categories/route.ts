// 🚨 @PATCH : 2026-11-02 — 블로그 카테고리 조회를 PostgreSQL sql 태그로 일원화 (supabaseAdmin REST 제거)
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await sql`
      SELECT c.code_value AS value, c.code_name AS name,
             (c.is_use AND g.is_use) AS active
      FROM public.common_codes c
      JOIN public.common_code_groups g ON g.group_code = c.group_code
      WHERE c.group_code = 'BLOG_CATEGORY'
      ORDER BY c.sort_order ASC, c.code_value ASC
    `;

    return NextResponse.json({
      categories: rows.map(r => ({
        value: r.value,
        name: r.name,
        active: Boolean(r.active),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[blog categories] local list failed', error);
    return NextResponse.json({ error: '블로그 분류 조회 실패' }, { status: 500 });
  }
}
