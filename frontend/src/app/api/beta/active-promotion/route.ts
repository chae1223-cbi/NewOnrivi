/** 🚨 @PATCH : 2026-11-02 — 활성 프로모션 조회를 PostgreSQL로 통일하고 실패를 오류 응답으로 전달한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SYSTEM_MESSAGES } from '@/constants/messages';

export async function GET() {
  try {
    // is_active = true이고 기간이 유효한 프로모션 1개 조회
    const rows = await sql`
      SELECT code, title, description, end_date FROM public.promotions
      WHERE is_active = true AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
      ORDER BY created_at DESC LIMIT 1
    `;
    return NextResponse.json({ promotion: rows[0] || null });
  } catch (error: any) {
    console.error('[/api/beta/active-promotion] 오류:', error?.code || error?.name);
    return NextResponse.json({ promotion: null, message: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
