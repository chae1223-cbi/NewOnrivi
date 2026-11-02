// ====================================================================
// 📊 [OMD-API-fileContent-0001] route.ts ➔ Local File Content Reader & Writer API
// 🎯 @KICK  : 웹 브라우저 환경에서 작업장 외부/절대경로(file:///) 파일의 실제 로컬 디스크 파일 내용을 안전하게 읽기 및 쓰기
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 정규화, UTF-8/EUC-KR 디코딩, 쓰기 안전성
// 🚨 @PATCH : **2026-09-16** — [디스크 파일 부재 시 콘솔 404 에러 억제 및 notFound 200 반환]: 존재하지 않거나 삭제된 파일 조회 시 HTTP 404 대신 status 200과 { ok: false, notFound: true }를 반환하여 브라우저 콘솔의 불필요한 빨간색 404 리소스 로드 에러 원천 방어
// 🚨 @PATCH : **2026-09-13** — [작업장 외부 절대경로(file:///) 파일 읽기 및 쓰기 Next.js API 엔드포인트 신설]
// 🔗 @CALLS : node:fs, node:path, @/lib/knowledge/pathResolver
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDiskAbsolutePath } from '@/lib/knowledge/pathResolver';

export const dynamic = 'force-dynamic';

function normalizeTargetFilePath(inputPath: string): string {
  let clean = (inputPath || '').trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}

  // file:///, file://, 꺾쇠, 따옴표 제거
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();
  clean = clean.replace(/^file:\/\/\/?([a-zA-Z]:)/i, '$1');
  clean = clean.replace(/^file:\/\/\//i, '');
  clean = clean.replace(/^file:\/\//i, '');

  // 앵커(#...) 분리
  if (clean.includes('#')) {
    clean = clean.split('#')[0];
  }

  return clean.replace(/\\/g, '/').trim();
}

function decodeFileBuffer(buffer: Buffer): string {
  // UTF-8 검증
  let i = 0;
  let isUtf8 = true;
  while (i < buffer.length) {
    if (buffer[i] <= 0x7f) {
      i += 1;
      continue;
    }
    if (buffer[i] >= 0xc2 && buffer[i] <= 0xdf) {
      if (i + 1 < buffer.length && buffer[i + 1] >= 0x80 && buffer[i + 1] <= 0xbf) {
        i += 2;
        continue;
      }
    } else if (buffer[i] >= 0xe0 && buffer[i] <= 0xef) {
      if (
        i + 2 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf
      ) {
        i += 3;
        continue;
      }
    } else if (buffer[i] >= 0xf0 && buffer[i] <= 0xf4) {
      if (
        i + 3 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf &&
        buffer[i + 3] >= 0x80 &&
        buffer[i + 3] <= 0xbf
      ) {
        i += 4;
        continue;
      }
    }
    isUtf8 = false;
    break;
  }

  if (isUtf8) {
    return buffer.toString('utf8');
  }

  try {
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPath = searchParams.get('path');
    const workspacePath = searchParams.get('workspacePath') || undefined;

    if (!rawPath) {
      return NextResponse.json(
        { ok: false, message: 'path 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const normalized = normalizeTargetFilePath(rawPath);
    let resolvedPath = normalized;

    // 절대경로인지 확인 (Windows C:/..., D:/..., E:/... 또는 POSIX /...)
    const isWindowsAbsolute = /^[a-zA-Z]:[/\\]/.test(normalized);
    const isPosixAbsolute = normalized.startsWith('/');

    if (!isWindowsAbsolute && !isPosixAbsolute && workspacePath) {
      try {
        resolvedPath = resolveDiskAbsolutePath(normalized, undefined, workspacePath);
      } catch {}
    }

    // 파일 존재 여부 검사
    if (!fs.existsSync(resolvedPath)) {
      // 역슬래시/슬래시 교체 재시도
      const altPath = resolvedPath.includes('/') ? resolvedPath.replace(/\//g, '\\') : resolvedPath.replace(/\\/g, '/');
      if (fs.existsSync(altPath)) {
        resolvedPath = altPath;
      } else {
        return NextResponse.json(
          { ok: false, notFound: true, message: `디스크에서 파일을 찾을 수 없습니다: ${resolvedPath}` },
          { status: 200 }
        );
      }
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json(
        { ok: false, message: `해당 경로는 파일이 아닙니다: ${resolvedPath}` },
        { status: 400 }
      );
    }

    const buffer = fs.readFileSync(resolvedPath);
    const content = decodeFileBuffer(buffer);
    const fileName = path.basename(resolvedPath);

    return NextResponse.json({
      ok: true,
      content,
      path: resolvedPath.replace(/\\/g, '/'),
      title: fileName,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    console.error('[/api/file-content GET Error]:', err);
    return NextResponse.json(
      { ok: false, message: err?.message || '파일을 읽는 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: rawPath, content } = body;

    if (!rawPath || typeof content !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'path와 content가 필요합니다.' },
        { status: 400 }
      );
    }

    const normalized = normalizeTargetFilePath(rawPath);
    if (!fs.existsSync(normalized)) {
      // 부모 디렉토리 생성
      const parentDir = path.dirname(normalized);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

    fs.writeFileSync(normalized, content, 'utf8');

    return NextResponse.json({
      ok: true,
      message: '파일이 성공적으로 저장되었습니다.',
      path: normalized,
    });
  } catch (err: any) {
    console.error('[/api/file-content POST Error]:', err);
    return NextResponse.json(
      { ok: false, message: err?.message || '파일 저장 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
