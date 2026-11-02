/**
 * 🚨 @PATCH (2026-07-22): Next.js API 라우트용 upload-image 프록시 엔드포인트 신설 (Cloudflare R2 버킷 업로드 404 완벽 방어)
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const resp = await fetch('https://onrivi.com/api/upload-image', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (error: any) {
    console.error('[/api/upload-image] Proxy Error:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
