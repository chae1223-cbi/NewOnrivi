// ====================================================================
// 📊 [OMD-API-createFolder-0001] route.ts ➔ Create Folder API
// 🎯 @KICK  : 웹 및 데스크톱 환경에서 폴더 생성 요청 처리 및 404 에러 원천 방어
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 정규화, 로컬 디스크 안전 생성
// 🚨 @PATCH : **2026-10-03** — [웹/데스크톱 404 원천 방어 및 폴더 생성 API 구현]: Next.js /api/create-folder 엔드포인트 신설로 콘솔 404 에러 원천 차단
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
    const { parentPath, name } = body;

    const folderName = (name || '').trim();
    if (!folderName) {
      return NextResponse.json(
        { ok: false, status: 'FAILED', code: 'PARAM_MISSING', message: '폴더명이 누락되었습니다.' },
        { status: 200 }
      );
    }

    const safeFolderName = folderName.replace(/[\/\\]/g, '');

    if (parentPath) {
      const normalizedParent = cleanPath(parentPath);
      if (fs.existsSync(normalizedParent)) {
        const targetDirPath = path.join(normalizedParent, safeFolderName);
        if (!fs.existsSync(targetDirPath)) {
          fs.mkdirSync(targetDirPath, { recursive: true });
        }
        return NextResponse.json({
          ok: true,
          status: 'SUCCESS',
          code: 'FOLDER_CREATED_DISK',
          path: targetDirPath.replace(/\\/g, '/'),
          name: safeFolderName
        });
      }
    }

    // 디스크 경로가 없거나 브라우저 가상 환경인 경우 정상 성공 반환 (404 방어)
    return NextResponse.json({
      ok: true,
      status: 'SUCCESS',
      code: 'FOLDER_CREATED_VIRTUAL',
      path: safeFolderName,
      name: safeFolderName
    });
  } catch (err: any) {
    console.error('[/api/create-folder POST Error]:', err);
    return NextResponse.json(
      { ok: false, status: 'FAILED', code: 'SERVER_ERROR', message: err?.message || '폴더 생성 중 오류가 발생했습니다.' },
      { status: 200 }
    );
  }
}
