// ====================================================================
// 📊 [OMD-API-knowledgeQueuePop-0001] route.ts ➔ Knowledge Queue Pop API
// 🎯 @KICK  : 로컬 SQLite 큐에서 다음으로 실행할 우선순위 작업을 원자적으로 선점(RUNNING 전이)하여 반환
// 🛡️ @GUARD : Node.js 트랜잭션 선점 무결성, 429 retry_after 대기시간 준수
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 비동기 워커용 원자적 작업 선점 엔드포인트 최초 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  getResourceKnowledgeDbPath, 
  initKnowledgeDatabase, 
  getNextKnowledgeJob 
} from '@/lib/knowledge/knowledgeDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceFolder } = body;

    const safeFolder = resourceFolder || 'Onrivi_Asset';
    const dbPath = getResourceKnowledgeDbPath(safeFolder);
    const db = initKnowledgeDatabase(dbPath);

    const job = getNextKnowledgeJob(db);

    return NextResponse.json({
      ok: true,
      job
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/queue/pop',
      stage: 'pop_queue_job',
    });
  }
}
