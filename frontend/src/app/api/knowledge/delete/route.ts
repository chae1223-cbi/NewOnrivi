// ====================================================================
// 📊 [OMD-API-knowledgeDelete-0001] route.ts ➔ Knowledge Delete API Route
// 🎯 @KICK  : 등록된 특정 지식 문서 및 관련 청크/FTS5 원자적 삭제
// 🛡️ @GUARD : Node.js 서버 환경 보장, 트랜잭션 롤백 보장
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [오류 문서 일괄 삭제 API 지원] deleteAllErrors 플래그 추가로 ERROR 상태 문서 원터치 일괄 청소 제공
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 지식 문서 삭제 엔드포인트 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, filePath, resourceFolder, geminiApiKey, planCode, deleteAllErrors } = body;

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json(
        { ok: false, code: 'NO_RESOURCE_FOLDER', message: '공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.', success: false },
        { status: 400 }
      );
    }
    const effectiveResourceFolder = resourceFolder.trim();

    // 1. 오류 문서 일괄 삭제 처리
    if (deleteAllErrors) {
      const deletedCount = KnowledgeService.deleteErrorDocuments({
        resourceFolder: effectiveResourceFolder,
        geminiApiKey: geminiApiKey || 'DUMMY_KEY_FOR_DELETE',
        planCode: planCode || 'ELITEPRO',
      });

      return NextResponse.json({
        ok: true,
        success: true,
        deletedCount,
      });
    }

    // 2. 단일 문서 삭제 처리
    if (!documentId && !filePath) {
      return NextResponse.json(
        { ok: false, message: '삭제할 documentId 또는 filePath가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const success = KnowledgeService.deleteDocument({
      documentId,
      filePath,
      resourceFolder: effectiveResourceFolder,
      geminiApiKey: geminiApiKey || 'DUMMY_KEY_FOR_DELETE',
      planCode: planCode || 'ELITEPRO',
    });

    return NextResponse.json({
      ok: true,
      success,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/delete',
      stage: 'delete_knowledge_document',
    });
  }
}
