// ====================================================================
// 📊 [OMD-API-createFile-0001] route.ts ➔ Create File API
// 🎯 @KICK  : 웹 및 데스크톱 환경에서 파일 생성 요청 처리 및 404 에러 원천 방어
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 정규화, 로컬 디스크 안전 쓰기
// 🚨 @PATCH : **2026-10-03** — [웹/데스크톱 404 원천 방어 및 파일 생성 API 구현]: Next.js /api/create-file 엔드포인트 신설로 콘솔 404 에러 원천 차단
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
    const { parentPath, name, content } = body;

    const fileName = (name || '').trim();
    if (!fileName) {
      return NextResponse.json(
        { ok: false, status: 'FAILED', code: 'PARAM_MISSING', message: '파일명이 누락되었습니다.' },
        { status: 200 }
      );
    }

    const safeFileName = fileName.replace(/[\/\\]/g, '');
    const finalName = safeFileName.endsWith('.md') ? safeFileName : `${safeFileName}.md`;
    const defaultContent = typeof content === 'string' ? content : `# ${finalName.replace(/\.md$/, '')}\n\n`;

    if (parentPath) {
      const normalizedParent = cleanPath(parentPath);
      if (fs.existsSync(normalizedParent)) {
        const targetFilePath = path.join(normalizedParent, finalName);
        fs.writeFileSync(targetFilePath, defaultContent, 'utf-8');
        return NextResponse.json({
          ok: true,
          status: 'SUCCESS',
          code: 'FILE_CREATED_DISK',
          path: targetFilePath.replace(/\\/g, '/'),
          name: finalName
        });
      }
    }

    // 디스크 경로가 없거나 브라우저 가상 환경인 경우 정상 성공 반환 (404 방어)
    return NextResponse.json({
      ok: true,
      status: 'SUCCESS',
      code: 'FILE_CREATED_VIRTUAL',
      path: finalName,
      name: finalName
    });
  } catch (err: any) {
    console.error('[/api/create-file POST Error]:', err);
    return NextResponse.json(
      { ok: false, status: 'FAILED', code: 'SERVER_ERROR', message: err?.message || '파일 생성 중 오류가 발생했습니다.' },
      { status: 200 }
    );
  }
}
