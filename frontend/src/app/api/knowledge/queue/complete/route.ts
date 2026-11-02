// ====================================================================
// 📊 [OMD-API-knowledgeQueueComplete-0001] route.ts ➔ Knowledge Queue Complete API
// 🎯 @KICK  : 로컬 SQLite 큐 작업의 성공(SUCCESS) 완료 또는 실패(지수 백오프 재스케줄링/FAILED) 처리
// 🛡️ @GUARD : Node.js 서버 환경 보장, 재시도 횟수(maxRetries 3) 초과 방어
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 작업 완료 및 지수 백오프 제어 엔드포인트 최초 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  getResourceKnowledgeDbPath, 
  initKnowledgeDatabase, 
  completeKnowledgeJob 
} from '@/lib/knowledge/knowledgeDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, success, errorLog, backoffSeconds, resourceFolder } = body;

    if (!jobId) {
      return NextResponse.json({ ok: false, message: 'jobId가 필요합니다.' }, { status: 400 });
    }

    const safeFolder = resourceFolder || 'Onrivi_Asset';
    const dbPath = getResourceKnowledgeDbPath(safeFolder);
    const db = initKnowledgeDatabase(dbPath);

    completeKnowledgeJob(db, jobId, {
      success: Boolean(success),
      errorLog,
      backoffSeconds
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/queue/complete',
      stage: 'complete_queue_job',
    });
  }
}
