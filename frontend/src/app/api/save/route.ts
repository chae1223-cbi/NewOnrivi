// ====================================================================
// 📊 [OMD-API-save-0001] route.ts ➔ Save File API
// 🎯 @KICK  : 웹 및 데스크톱 환경에서 파일 저장 처리 및 404 에러 원천 방어
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 정규화, 로컬 디스크 안전 저장
// 🚨 @PATCH : **2026-10-03** — [웹/데스크톱 404 원천 방어 및 저장 API 구현]: Next.js /api/save 엔드포인트 신설로 콘솔 404 에러 원천 차단
// 🔗 @CALLS : node:fs, node:path, NextResponse
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

function cleanPath(inputPath: string): string {
  let clean = (inputPath || '').trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();
  clean = clean.replace(/^file:\/\/\/?([a-zA-Z]:)/i, '$1');
  clean = clean.replace(/^file:\/\/\//i, '');
  clean = clean.replace(/^file:\/\//i, '');
  if (clean.includes('#')) {
    clean = clean.split('#')[0];
  }
  return clean.replace(/\\/g, '/').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { filePath: rawPath, path: rawPathAlt, content } = body;
    const targetPath = rawPath || rawPathAlt;

    if (!targetPath || typeof content !== 'string') {
      return NextResponse.json(
        { ok: false, status: 'FAILED', code: 'PARAM_MISSING', message: '경로 및 내용이 필요합니다.' },
        { status: 200 }
      );
    }

    const normalized = cleanPath(targetPath);
    const parentDir = path.dirname(normalized);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(normalized, content, 'utf-8');

    return NextResponse.json({
      ok: true,
      success: true,
      status: 'SUCCESS',
      code: 'SAVED_DISK',
      path: normalized,
      savedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[/api/save POST Error]:', err);
    return NextResponse.json(
      { ok: false, success: false, status: 'FAILED', code: 'SERVER_ERROR', message: err?.message || '저장 중 오류가 발생했습니다.' },
      { status: 200 }
    );
  }
}
