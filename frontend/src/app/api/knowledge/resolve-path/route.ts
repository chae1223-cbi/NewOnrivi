// ====================================================================
// 📊 [OMD-API-knowledgeResolvePath-0001] route.ts ➔ Knowledge File Path Resolver API
// 🎯 @KICK  : 웹 브라우저 환경에서 유입된 파일 상대경로를 서버 로컬 디스크 실제 파일시스템과 대조하여 완전한 절대경로로 자동 승격
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), 경로 탈출 방지, 존재하지 않을 시 안전 베이스 절대경로 승격
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-13** — [규칙 9: 임의 폴백 원천 금지] 작업장 경로 부재 시 D:\ 등 임의 폴백을 방어하고, 유효하지 않은 경로 접근 시 명확한 에러 메시지 반환
//             **2026-09-12** — [작업장 루트 절대경로 1회 획득 지원] filePath가 빈 문자열이더라도 workspacePath가 전달된 경우 400 에러 없이 resolveDiskAbsolutePath를 호출하여 E:/ZZ 개인자료/블러그 작업장 절대경로 즉시 반환 지원
//             **2026-09-12** — [workspacePath 파라미터 추가] 클라이언트가 localStorage의 rootFolder 절대경로를 workspacePath로 전달하면 resolveDiskAbsolutePath 최우선 탐색에 활용하여 E:\ZZ 개인자료\블러그 등 작업장 경로를 정확히 반영
//             **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 보장] 웹 환경 상대경로를 실제 OS 드라이브 절대경로(D:/...)로 탐색/승격하는 API 신규 구현
// 🔗 @CALLS : node:fs, node:path, @/lib/knowledge/pathResolver
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import fs from 'node:fs';
import { resolveDiskAbsolutePath } from '@/lib/knowledge/pathResolver';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filePath, resourceFolder, workspacePath } = body;

    const filePathStr = typeof filePath === 'string' ? filePath : '';
    const wsPathStr = typeof workspacePath === 'string' ? workspacePath : '';

    if (!filePathStr && !wsPathStr) {
      return NextResponse.json(
        { ok: false, message: 'filePath 또는 workspacePath는 필수 문자열입니다.' },
        { status: 400 }
      );
    }

    const resolvedPath = resolveDiskAbsolutePath(filePathStr, resourceFolder, wsPathStr);

    return NextResponse.json({
      ok: true,
      originalPath: filePath,
      resolvedPath,
      exists: fs.existsSync(resolvedPath),
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/resolve-path',
      stage: 'resolve_knowledge_path',
    });
  }
}
