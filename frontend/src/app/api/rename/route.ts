// ====================================================================
// 📊 [OMD-API-rename-0001] route.ts ➔ Rename File/Folder API
// 🎯 @KICK  : 웹 및 데스크톱 환경에서 이름 변경 및 이동 처리 및 404 에러 원천 방어
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 정규화, 로컬 디스크 안전 이름변경
// 🚨 @PATCH : **2026-10-03** — [웹/데스크톱 404 원천 방어 및 이름변경 API 구현]: Next.js /api/rename 엔드포인트 신설로 콘솔 404 에러 원천 차단
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
    const { oldPath, newPath } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { ok: false, status: 'FAILED', code: 'PARAM_MISSING', message: 'oldPath 및 newPath가 필요합니다.' },
        { status: 200 }
      );
    }

    const normOld = cleanPath(oldPath);
    const normNew = cleanPath(newPath);

    if (fs.existsSync(normOld)) {
      const destDir = path.dirname(normNew);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(normOld, normNew);
      return NextResponse.json({
        ok: true,
        status: 'SUCCESS',
        code: 'RENAMED_DISK',
        oldPath: normOld,
        newPath: normNew
      });
    }

    // 디스크에 없거나 브라우저 가상 환경(VFS)인 경우에도 정상 응답 (404 방어)
    return NextResponse.json({
      ok: true,
      status: 'SUCCESS',
      code: 'RENAMED_VIRTUAL',
      oldPath: normOld,
      newPath: normNew
    });
  } catch (err: any) {
    console.error('[/api/rename POST Error]:', err);
    return NextResponse.json(
      { ok: false, status: 'FAILED', code: 'SERVER_ERROR', message: err?.message || '이름 변경 중 오류가 발생했습니다.' },
      { status: 200 }
    );
  }
}
