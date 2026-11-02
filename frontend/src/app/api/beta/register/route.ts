/** 🚨 @PATCH : 2026-11-02 — 베타 등록을 PostgreSQL로 통일하고 중복 오류를 기존 409 응답으로 처리한다. */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SYSTEM_MESSAGES } from '@/constants/messages';

export async function POST(request: Request) {
  try {
    const { email, promotion_code } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: '유효한 이메일 주소를 입력해주세요.' }, { status: 400 });
    }
    if (!promotion_code) {
      return NextResponse.json({ success: false, message: '유효하지 않은 프로모션입니다.' }, { status: 400 });
    }

    await sql`INSERT INTO public.promotion_subscribers (email, promotion_code) VALUES (${email}, ${promotion_code})`;

    return NextResponse.json({ success: true, message: '사전 등록이 완료되었습니다.' });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, message: '이미 사전 등록된 이메일입니다!' }, { status: 409 });
    }
    console.error('[/api/beta/register] 오류:', error?.code || error?.name);
    return NextResponse.json({ success: false, message: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
