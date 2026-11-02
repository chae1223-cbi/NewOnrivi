// ====================================================================
// 📊 [OMD-API-knowledgeCollection-0001] route.ts ➔ Knowledge Collection API
// 🎯 @KICK  : 지식 컬렉션(카테고리) 목록 조회, 등록/수정, 삭제 제공
// 🛡️ @GUARD : Node.js 서버 환경 보장, 컬렉션 삭제 시 문서 외래키 안전 NULL 전이
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-002, KUI-006 연동용 컬렉션 CRUD API 라우트 최초 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  getResourceKnowledgeDbPath, 
  initKnowledgeDatabase, 
  getKnowledgeCollections,
  upsertKnowledgeCollection,
  deleteKnowledgeCollection
} from '@/lib/knowledge/knowledgeDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceFolder = searchParams.get('resourceFolder') || 'Onrivi_Asset';
    const dbPath = getResourceKnowledgeDbPath(resourceFolder);
    const db = initKnowledgeDatabase(dbPath);

    const collections = getKnowledgeCollections(db);
    return NextResponse.json({ ok: true, collections });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/collection',
      stage: 'collection_operation',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, color, resourceFolder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: '컬렉션 이름이 필요합니다.' }, { status: 400 });
    }

    const safeFolder = resourceFolder || 'Onrivi_Asset';
    const dbPath = getResourceKnowledgeDbPath(safeFolder);
    const db = initKnowledgeDatabase(dbPath);

    const collection = upsertKnowledgeCollection(db, {
      name: name.trim(),
      description: description?.trim(),
      color
    });

    return NextResponse.json({ ok: true, collection });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/collection',
      stage: 'collection_operation',
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get('id');
    const resourceFolder = searchParams.get('resourceFolder') || 'Onrivi_Asset';

    if (!collectionId) {
      return NextResponse.json({ ok: false, message: '컬렉션 ID가 필요합니다.' }, { status: 400 });
    }

    const dbPath = getResourceKnowledgeDbPath(resourceFolder);
    const db = initKnowledgeDatabase(dbPath);

    deleteKnowledgeCollection(db, collectionId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/collection',
      stage: 'collection_operation',
    });
  }
}
