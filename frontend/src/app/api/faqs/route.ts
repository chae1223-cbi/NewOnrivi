/** 🚨 @PATCH : 2026-11-02 — FAQ 조회·등록을 PostgreSQL로 통일한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminMode = url.searchParams.get('admin') === 'true';
    if (adminMode) {
      const auth = await verifyAdmin(request);
      if (!auth.user) return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const faqs = adminMode
      ? await sql`SELECT * FROM public.faqs ORDER BY sort_order ASC`
      : await sql`SELECT * FROM public.faqs WHERE is_active = true ORDER BY sort_order ASC`;
    return NextResponse.json(faqs);
  } catch (error: any) {
    console.error('Failed to fetch faqs:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await verifyAdmin(request);
    if (authErr || !user) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { question, answer, sort_order, is_active } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: '질문과 답변을 모두 입력해주세요.' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO public.faqs (question, answer, sort_order, is_active)
      VALUES (${question}, ${answer}, ${sort_order || 0}, ${is_active ?? true}) RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error('Failed to create faq:', error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
