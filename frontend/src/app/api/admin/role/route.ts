/** 🚨 @PATCH : 2026-11-02 — pre_mfa 쿼리 파라미터 지원으로 로그인 직후 관리자 사전 검증 지원 */
/** 🚨 @PATCH : 2026-11-02 — 관리자 화면의 권한 표시를 서버 인증 결과로 제공한다. */
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const allowPreMfa = url.searchParams.get('pre_mfa') === 'true';
  const result = await verifyAdmin(request, false, allowPreMfa);
  if (!result.user) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ admin_role: result.adminRole });
}
