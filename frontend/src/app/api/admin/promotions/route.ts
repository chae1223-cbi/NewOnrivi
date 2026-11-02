/** 🚨 @PATCH : 2026-11-02 — 프로모션과 신청자 조회·변경을 관리자 PostgreSQL API로 통일한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { SYSTEM_MESSAGES } from '@/constants/messages';
const deny = (error: string | null) => NextResponse.json({ error }, { status: 403 });
const fail = () => NextResponse.json({ error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });

export async function GET(request: Request) {
  try {
    const result = await verifyAdmin(request);
    if (!result.user) return deny(result.error);
    const code = new URL(request.url).searchParams.get('code');
    if (code) return NextResponse.json(await sql`SELECT * FROM public.promotion_subscribers WHERE promotion_code = ${code} ORDER BY created_at DESC`);
    const data = await sql.begin(async tx => {
      const promotions = await tx`SELECT * FROM public.promotions ORDER BY created_at DESC`;
      const counts = await tx`SELECT count(*)::int AS total_count,
        count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today_count FROM public.promotion_subscribers`;
      return { promotions, totalCount: counts[0].total_count, todayCount: counts[0].today_count };
    });
    return NextResponse.json(data);
  } catch { return fail(); }
}

export async function POST(request: Request) {
  try {
    const result = await verifyAdmin(request, true);
    if (!result.user) return deny(result.error);
    const { code, title, description, start_date, end_date, is_active } = await request.json();
    if (!code || !title) return NextResponse.json({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, { status: 400 });
    const rows = await sql`INSERT INTO public.promotions (code, title, description, start_date, end_date, is_active)
      VALUES (${code}, ${title}, ${description}, ${start_date}, ${end_date}, ${is_active}) RETURNING *`;
    return NextResponse.json(rows[0]);
  } catch { return fail(); }
}

export async function PATCH(request: Request) {
  try {
    const result = await verifyAdmin(request, true);
    if (!result.user) return deny(result.error);
    const { original_code, code, title, description, start_date, end_date, is_active } = await request.json();
    if (!original_code) return NextResponse.json({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, { status: 400 });
    const rows = await sql`UPDATE public.promotions SET code = COALESCE(${code ?? null}, code),
      title = COALESCE(${title ?? null}, title), description = COALESCE(${description ?? null}, description),
      start_date = ${start_date ?? null}, end_date = ${end_date ?? null},
      is_active = COALESCE(${is_active ?? null}, is_active) WHERE code = ${original_code} RETURNING *`;
    return NextResponse.json(rows[0] || null);
  } catch { return fail(); }
}

export async function DELETE(request: Request) {
  try {
    const result = await verifyAdmin(request, true);
    if (!result.user) return deny(result.error);
    const code = new URL(request.url).searchParams.get('code');
    if (!code) return NextResponse.json({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, { status: 400 });
    await sql`DELETE FROM public.promotions WHERE code = ${code}`;
    return NextResponse.json({ success: true });
  } catch { return fail(); }
}
