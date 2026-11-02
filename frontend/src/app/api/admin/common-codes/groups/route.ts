/** 🚨 @PATCH : 2026-11-02 — 공통코드 그룹 CRUD를 PostgreSQL 트랜잭션으로 통일한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { SYSTEM_MESSAGES } from '@/constants/messages';

const failure = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });
const dbFailure = () => failure(SYSTEM_MESSAGES.DATABASE_ERROR.text, 500);

export async function GET(request: Request) {
  try {
    const { user, error } = await verifyAdmin(request);
    if (!user) return failure(error || '관리자 인증이 필요합니다.', 403);
    const rows = await sql`SELECT * FROM public.common_code_groups ORDER BY sort_order ASC, group_code ASC`;
    return NextResponse.json({ success: true, data: rows });
  } catch { return dbFailure(); }
}

export async function POST(request: Request) {
  try {
    const { user } = await verifyAdmin(request, true);
    if (!user) return failure('관리자 인증이 필요합니다.', 403);
    const { group_code, group_name, description, sort_order, is_use } = await request.json();
    if (!group_code || !group_name) return failure('필수 파라미터 누락', 400);
    const groupCode = String(group_code).toUpperCase();
    const exists = await sql.begin(async tx => {
      const found = await tx`SELECT group_code FROM public.common_code_groups WHERE group_code = ${groupCode} LIMIT 1`;
      if (found.length) return true;
      await tx`INSERT INTO public.common_code_groups ${tx({
        group_code: groupCode, group_name, description: description || '',
        sort_order: sort_order || 0, is_use: is_use !== undefined ? is_use : true,
        created_by: user.id, updated_by: user.id,
      })}`;
      return false;
    });
    if (exists) return failure('이미 존재하는 그룹 코드입니다.', 400);
    return NextResponse.json({ success: true, message: '그룹 코드가 생성되었습니다.' });
  } catch { return dbFailure(); }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await verifyAdmin(request, true);
    if (!user) return failure('관리자 인증이 필요합니다.', 403);
    const { group_code, group_name, description, sort_order, is_use } = await request.json();
    if (!group_code) return failure('필수 파라미터 누락', 400);
    const values = Object.fromEntries(Object.entries({ group_name, description, sort_order, is_use,
      updated_by: user.id, updated_at: new Date().toISOString() }).filter(([, value]) => value !== undefined));
    await sql`UPDATE public.common_code_groups SET ${sql(values)} WHERE group_code = ${group_code}`;
    return NextResponse.json({ success: true, message: '그룹 코드가 수정되었습니다.' });
  } catch { return dbFailure(); }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await verifyAdmin(request, true);
    if (!user) return failure('관리자 인증이 필요합니다.', 403);
    const groupCode = new URL(request.url).searchParams.get('group_code');
    if (!groupCode) return failure('필수 파라미터 누락', 400);
    await sql`DELETE FROM public.common_code_groups WHERE group_code = ${groupCode}`;
    return NextResponse.json({ success: true, message: '그룹 코드가 삭제되었습니다.' });
  } catch { return dbFailure(); }
}
