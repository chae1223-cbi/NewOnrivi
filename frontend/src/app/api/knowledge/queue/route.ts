// ====================================================================
// 📊 [OMD-API-knowledgeQueue-0001] route.ts ➔ Knowledge Queue Management API
// 🎯 @KICK  : 로컬 SQLite 작업 큐 조회(GET/POST), 대량 작업 등록(중복 억제), 작업 취소, 실패 작업 일괄 재시도 제공
// 🛡️ @GUARD : Duplicate Job Suppression(동일 파일/해시 중복 차단), Node.js 환경 보장, GET/POST 이중 지원
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-007, KUI-008, KUI-009 연동용 큐 관리 API(GET/POST) 고도화
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  getResourceKnowledgeDbPath, 
  initKnowledgeDatabase, 
  enqueueKnowledgeJob,
  listKnowledgeJobs,
  cancelKnowledgeJob,
  retryFailedKnowledgeJobs,
  recoverStaleRunningJobs
} from '@/lib/knowledge/knowledgeDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const resourceFolder = searchParams.get('resourceFolder') || 'Onrivi_Asset';
    const status = searchParams.get('status') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const dbPath = getResourceKnowledgeDbPath(resourceFolder);
    const db = initKnowledgeDatabase(dbPath);

    const jobs = listKnowledgeJobs(db, limit, status);
    return NextResponse.json({ ok: true, jobs, total: jobs.length });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/queue',
      stage: 'queue_operation',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, resourceFolder } = body;

    const safeFolder = resourceFolder || 'Onrivi_Asset';
    const dbPath = getResourceKnowledgeDbPath(safeFolder);
    const db = initKnowledgeDatabase(dbPath);

    if (action === 'ENQUEUE_BATCH') {
      const items = body.items || body.jobs || [];
      let enqueued = 0;
      let suppressed = 0;

      for (const it of items) {
        const docId = it.documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const res = enqueueKnowledgeJob(db, {
          documentId: docId,
          filePath: it.filePath,
          title: it.title,
          targetHash: it.targetHash,
          priority: it.priority || 3,
          jobType: it.jobType || 'INDEX'
        });
        if (res) enqueued++;
        else suppressed++;
      }

      return NextResponse.json({ 
        ok: true, 
        enqueued, 
        enqueuedCount: enqueued, 
        suppressed 
      });
    }

    if (action === 'LIST') {
      const limit = body.limit || 50;
      const status = body.status;
      const jobs = listKnowledgeJobs(db, limit, status);
      return NextResponse.json({ ok: true, jobs });
    }

    if (action === 'CANCEL') {
      const { jobId } = body;
      if (jobId) {
        cancelKnowledgeJob(db, jobId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'RETRY_FAILED') {
      const { jobIds } = body;
      const retried = retryFailedKnowledgeJobs(db, jobIds);
      return NextResponse.json({ 
        ok: true, 
        retried, 
        retriedCount: retried 
      });
    }

    if (action === 'RECOVER_STALE') {
      const recovered = recoverStaleRunningJobs(db);
      return NextResponse.json({ ok: true, recovered });
    }

    return NextResponse.json({ ok: false, message: '알 수 없는 action입니다.' }, { status: 400 });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/queue',
      stage: 'queue_operation',
    });
  }
}
