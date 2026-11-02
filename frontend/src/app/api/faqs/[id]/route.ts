/** 🚨 @PATCH : 2026-11-02 — FAQ 수정·삭제를 PostgreSQL로 통일한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SYSTEM_MESSAGES } from '@/constants/messages';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error: authErr } = await verifyAdmin(request);
    if (authErr || !user) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    const { id } = params;
    const body = await request.json();
    const { question, answer, sort_order, is_active } = body;

    const rows = await sql`
      UPDATE public.faqs SET
        question = CASE WHEN ${question !== undefined} THEN ${question ?? null} ELSE question END,
        answer = CASE WHEN ${answer !== undefined} THEN ${answer ?? null} ELSE answer END,
        sort_order = CASE WHEN ${sort_order !== undefined} THEN ${sort_order ?? null} ELSE sort_order END,
        is_active = CASE WHEN ${is_active !== undefined} THEN ${is_active ?? null} ELSE is_active END,
        updated_at = now()
      WHERE id = ${id} RETURNING *
    `;
    if (!rows.length) throw new Error('FAQ not found');
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error(`Failed to update faq ${params.id}:`, error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error: authErr } = await verifyAdmin(request);
    if (authErr || !user) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const { id } = params;

    await sql`DELETE FROM public.faqs WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Failed to delete faq ${params.id}:`, error);
    return NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
