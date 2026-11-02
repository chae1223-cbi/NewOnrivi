// ====================================================================
// 📊 [OMD-API-knowledgeSearch-0001] route.ts ➔ Knowledge Search Candidates API
// 🎯 @KICK  : 하이브리드 RAG 검색(FTS5 + 태그) 후보 청크 목록 및 관련도 점수 반환
// 🛡️ @GUARD : 로컬 DB 직접 조회, 토큰 절약 (LLM 비호출 순수 검색 모드)
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-003 전용 하이브리드 청크 검색 엔드포인트 신규 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, resourceFolder, geminiApiKey, planCode, collectionId, limit } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { ok: false, message: '검색할 키워드를 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json(
        { ok: false, code: 'NO_RESOURCE_FOLDER', message: '리소스 폴더가 지정되지 않았습니다.' },
        { status: 400 }
      );
    }

    const candidates = KnowledgeService.searchCandidates({
      query: query.trim(),
      resourceFolder: resourceFolder.trim(),
      geminiApiKey: geminiApiKey || '',
      planCode: planCode || 'ELITEPRO',
      collectionId: collectionId || undefined,
      limit: limit || 30,
    });

    return NextResponse.json({
      ok: true,
      candidates,
      total: candidates.length,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/search',
      stage: 'search_knowledge_documents',
    });
  }
}
