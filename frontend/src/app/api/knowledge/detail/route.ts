// ====================================================================
// 📊 [OMD-API-knowledgeDetail-0001] route.ts ➔ Knowledge Document Detail API Route
// 🎯 @KICK  : 특정 지식 문서의 전체 상세 내역(AI 요약, 키포인트, 태그, 모든 청크 계층 및 라인 정보) 조회
// 🛡️ @GUARD : Node.js 서버 환경 보장, 리소스 폴더 안전 승격, 존재하지 않는 문서 404 방어
// 🚨 @PATCH : 2026-11-04 — [AI/지식문서 정밀 진단 로깅 연계] doing/target 컨텍스트 및 4xx 사전 경고 로깅 추가
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-12** — [지식 문서 상세조회 heading 파라미터 연동] POST/GET 핸들러에 heading 매개변수 지원
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-004] 지식 문서 상세 정보 조회 엔드포인트 신규 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let targetDoc = 'DETAIL';
  try {
    const body = await req.json();
    const { documentId, filePath, heading, resourceFolder, geminiApiKey, planCode } = body;
    targetDoc = documentId || (filePath ? path.basename(filePath) : (heading || 'DETAIL'));
if (!documentId && !filePath && !heading) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · documentId, filePath 또는 heading이 필요합니다. [경로: /api/knowledge/detail]');
      return NextResponse.json(
        { ok: false, message: 'documentId, filePath 또는 heading이 필요합니다.' },
        { status: 400 }
      );
    }

    const detail = KnowledgeService.getDocumentDetail({
      documentId,
      filePath,
      heading,
      resourceFolder: (resourceFolder || 'Onrivi_Asset').trim(),
      geminiApiKey: geminiApiKey || 'DUMMY_KEY',
      planCode: planCode || 'ELITEPRO',
    });

    if (!detail) {
      return NextResponse.json(
        { ok: false, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      detail,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/detail',
      stage: 'get_knowledge_document_detail',
      doing: '지식 문서 상세 정보 조회 중',
      target: targetDoc,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('docId') || searchParams.get('documentId') || undefined;
    const filePath = searchParams.get('filePath') || undefined;
    const heading = searchParams.get('heading') || undefined;
    const resourceFolder = searchParams.get('resourceFolder') || 'Onrivi_Asset';
    const planCode = searchParams.get('planCode') || 'ELITEPRO';

    if (!documentId && !filePath && !heading) {
      return NextResponse.json(
        { ok: false, message: 'documentId, filePath 또는 heading이 필요합니다.' },
        { status: 400 }
      );
    }

    const detail = KnowledgeService.getDocumentDetail({
      documentId,
      filePath,
      heading,
      resourceFolder: resourceFolder.trim(),
      geminiApiKey: 'DUMMY_KEY',
      planCode,
    });

    if (!detail) {
      return NextResponse.json(
        { ok: false, message: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      detail,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/detail',
      stage: 'get_knowledge_document_detail',
    });
  }
}
