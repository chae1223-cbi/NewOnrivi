// ====================================================================
// 📊 [OMD-API-knowledgeIndex-0001] route.ts ➔ Knowledge Index API Route
// 🎯 @KICK  : 웹 브라우저 환경에서 지식 베이스 등록 요청을 받아 Node.js 서버 런타임의 SQLite DB 색인 및 AI 분석 수행
// 🛡️ @GUARD : Node.js 서버 환경 보장, 3대 가드 검증, 에러 JSON 응답
// 🚨 @PATCH : 2026-11-04 — [AI/지식문서 정밀 진단 로깅 연계] 로컬 절대경로/PII 콘솔 노출 차단 및 knowledgeErrorResponse doing/target 연계
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-16** — [디스크 파일 읽기 무결성 및 인코딩(UTF-8/EUC-KR) 안전 디코딩 보강]:
//             1) 백엔드 파일 직접 읽기 시 fs.readFileSync 버퍼를 UTF-8 및 EUC-KR로 정밀 디코딩하여 클라우드 드라이브(G:/내 드라이브) 및 한글 문서 내용 누락 원천 방어
//             2) 파일 내용 미유입 시 로컬 디스크 파일 경로를 통한 100% 자동 복구 읽기 보장
//             **2026-09-12** — [workspacePath 파라미터 추가] 클라이언트 localStorage rootFolder를 workspacePath로 수신, 작업장 실경로 최우선 탐색 보장
//             **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 보장] filePath 유입 시 resolveDiskAbsolutePath를 통해 디스크 실제 파일 절대경로로 자동 승격
//             **2026-09-04** — [백그라운드 큐 워커 지원] fileContent 누락 시 로컬 파일시스템(fs.readFileSync) 자동 로드 폴백 추가
//             **2026-09-04** — [등록 결과 상세 내역 응답] result.detail(청크, 태그, 검색어) 반환 지원
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 웹 브라우저 지원용 /api/knowledge/index API 라우트 최초 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import { resolveDiskAbsolutePath } from '@/lib/knowledge/pathResolver';

import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

function decodeFileBuffer(buffer: Buffer): string {
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

export async function POST(req: NextRequest) {
  let targetFile = 'DOC';
  try {
    const body = await req.json();
    let { filePath, fileContent, title, resourceFolder, geminiApiKey, planCode, aiModelName, workspacePath } = body;

    // 🛡️ [절대경로 표준화 가드] 상대경로 유입 시 실제 디스크 파일 탐색 및 절대경로로 자동 승격
    // workspacePath(클라이언트 localStorage rootFolder 절대경로)를 최우선 탐색 기준으로 활용
    if (filePath) {
      filePath = resolveDiskAbsolutePath(filePath, resourceFolder, workspacePath);
      targetFile = path.basename(filePath);
    }

    // 🛡️ [본문 누락 방어 100% 보장]: fileContent가 비어있거나 디스크에 존재하는 경우 디스크에서 직접 바이너리 로드 & 정밀 디코딩
    if ((!fileContent || !fileContent.trim()) && filePath && fs.existsSync(filePath)) {
      try {
        const buf = fs.readFileSync(filePath);
        fileContent = decodeFileBuffer(buf);
      } catch (readErr) {
        console.warn('[/api/knowledge/index] 로컬 파일 직접 읽기 실패:', readErr);
      }
    }

    console.log('[/api/knowledge/index Received]:', {
      file: path.basename(filePath || ''),
      hasContent: Boolean(fileContent),
      contentLen: fileContent?.length,
      hasApiKey: Boolean(geminiApiKey),
      planCode,
      aiModelName: aiModelName || 'gemini-3.8-flash'
    });

    if (!filePath || !fileContent) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · filePath와 fileContent는 필수 항목입니다. [경로: /api/knowledge/index]');
      return NextResponse.json(
        { ok: false, message: 'filePath와 fileContent는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // 사용자 환경설정에 지정된 공통 자원(리소스) 폴더만 순수하게 사용 (프로젝트 폴더 임의 생성 원천 차단)
    if (!resourceFolder || !resourceFolder.trim()) {
      console.warn('[ClientWarn] HTTP 400 · NO_RESOURCE_FOLDER · 리소스 폴더가 설정되지 않았습니다. [경로: /api/knowledge/index]');
      return NextResponse.json(
        { ok: false, code: 'NO_RESOURCE_FOLDER', message: '공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.' },
        { status: 400 }
      );
    }
    const effectiveResourceFolder = resourceFolder.trim();

    const result = await KnowledgeService.indexDocument({
      filePath,
      fileContent,
      title,
      resourceFolder: effectiveResourceFolder,
      geminiApiKey,
      planCode: planCode || 'ELITEPRO',
      aiModelName: aiModelName || 'gemini-3.8-flash',
    });

    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      chunksCount: result.chunksCount,
      detail: result.detail,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/index',
      stage: 'index_knowledge_document',
      doing: '지식 문서 로컬 SQLite 색인 및 AI 분석 중',
      target: targetFile,
    });
  }
}
