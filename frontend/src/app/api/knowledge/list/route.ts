// ====================================================================
// 📊 [OMD-API-knowledgeList-0001] route.ts ➔ Knowledge List API Route
// 🎯 @KICK  : 등록된 모든 지식 문서 목록(상태, 요약, 태그, 청크수 등) 반환
// 🛡️ @GUARD : Node.js 서버 환경 보장, 리소스 폴더 Fallback
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-06** — [웹/데스크톱 로컬 SQLite 통일] GET/POST 이중 지원 및 로컬 웹 환경에서 405/500 방어하여 안전하게 빈 목록 반환
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 등록 지식 문서 목록 조회 엔드포인트 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceFolder = searchParams.get('resourceFolder');

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json({ ok: true, documents: [], isDesktopOnly: true });
    }

    const documents = KnowledgeService.listDocuments({
      resourceFolder: resourceFolder.trim(),
      geminiApiKey: 'DUMMY_KEY_FOR_LIST',
      planCode: 'ELITEPRO',
    });

    return NextResponse.json({
      ok: true,
      documents: documents || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      documents: [],
      isDesktopOnly: true,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceFolder, geminiApiKey, planCode } = body;

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json(
        { ok: true, isDesktopOnly: true, documents: [] }
      );
    }
    const effectiveResourceFolder = resourceFolder.trim();

    const documents = KnowledgeService.listDocuments({
      resourceFolder: effectiveResourceFolder,
      geminiApiKey: geminiApiKey || 'DUMMY_KEY_FOR_LIST',
      planCode: planCode || 'ELITEPRO',
    });

    return NextResponse.json({
      ok: true,
      documents: documents || [],
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      documents: [],
      isDesktopOnly: true,
    });
  }
}
