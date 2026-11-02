// ====================================================================
// 📊 [OMD-API-knowledgeRestore-0001] route.ts ➔ Knowledge DB Restore API
// 🎯 @KICK  : 백업 파일로부터 지식 데이터베이스 원복 (기존 로컬 백업 선택 또는 신규 DB 파일 업로드)
// 🛡️ @GUARD : 사전 스냅샷 자동 생성, SQLite 지식 DB 무결성 사전 검증 후 원자적 교체
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-06** — [Base64 인코딩 파일 업로드 원복 분기 및 backupFileName 호환 지원] Electron 환경에서 전달되는 uploadedFileBase64 원복 처리 및 파라미터 호환성 강화로 로컬호스트/프로드 웹/데스크톱 규격 100% 동기화
//             **2026-09-05** — [원복 사전 백업 사유(Reason) 전달] 로컬 백업 선택 원복 및 외부 DB 업로드 원복 시 전달받은 reason을 restoreKnowledgeDatabase에 전달하여 백업 메타데이터에 온전히 기록
//             **2026-09-05** — [외부 프로세스 DB 파일 잠금 안내 고도화] 외부 프로그램(DB Browser for SQLite 등)에 의해 onrivi_knowledge.db가 잠겨있을 때 구체적인 안내 메시지(500) 반환
//             **2026-09-05** — [백업 단일 원칙 확립] 외부 업로드 원복 시 임시 파일 격리 저장 및 원복 전 현재 DB 자동 스냅샷 백업 보장, 원복 후 갱신된 백업 목록 반환
//             **2026-09-05** — [긴급 원복 직접 교체] 외부 업로드 DB로 활성 지식 DB(db/onrivi_knowledge.db) 직접 교체 및 복원된 문서 목록 즉시 반환 연동
//             **2026-09-05** — 지식 DB 시점 원복(Restore) 및 파일 업로드 원복 엔드포인트 신설
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  restoreKnowledgeDatabase, 
  listKnowledgeBackups,
  resolveSafeResourceFolder 
} from '@/lib/knowledge/knowledgeDb';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // A. 파일 업로드 기반 원복 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const resourceFolder = formData.get('resourceFolder') as string;
      const file = formData.get('backupFile') as File | null;
      const reason = formData.get('reason') as string | null;

      if (!resourceFolder || !resourceFolder.trim()) {
        return NextResponse.json({ ok: false, message: '리소스 폴더 경로가 필요합니다.' }, { status: 400 });
      }
      if (!file) {
        return NextResponse.json({ ok: false, message: '복원할 백업 파일(.db)이 업로드되지 않았습니다.' }, { status: 400 });
      }

      const cleanFolder = resolveSafeResourceFolder(resourceFolder);
      const dbDir = path.join(cleanFolder, 'db');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 외부 업로드 파일은 backups 폴더를 오염시키지 않도록 db 폴더 하위의 숨김 임시 파일로 격리 저장
      const tempUploadName = `.temp_restore_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.db`;
      const tempUploadPath = path.join(dbDir, tempUploadName);

      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(tempUploadPath, Buffer.from(arrayBuffer));

      const cleanupTempFiles = () => {
        for (const ext of ['', '-wal', '-shm']) {
          const p = tempUploadPath + ext;
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch {}
          }
        }
      };

      try {
        // 데이터베이스 원복 수행:
        // 1) 현재 DB가 존재하면 backups 폴더에 knowledge_backup_YYYYMMDD_HHMMSS.db 로 자동 백업 (사유 포함)
        // 2) 업로드된 임시 DB로 onrivi_knowledge.db 1:1 교체
        restoreKnowledgeDatabase(cleanFolder, tempUploadPath, reason || undefined);
      } finally {
        // 복원 완료 후 임시 업로드 파일 및 관련 -wal/-shm 흔적 없이 완전 삭제
        cleanupTempFiles();
      }

      // 복원된 DB의 실제 등록 문서 목록 즉시 조회
      const documents = KnowledgeService.listDocuments({
        resourceFolder: cleanFolder,
        geminiApiKey: 'DUMMY_FOR_LIST',
        planCode: 'ELITEPRO',
      });

      // 갱신된 백업 목록 조회 (원복 직전 생성된 현재 DB 백업 포함)
      const backups = listKnowledgeBackups(cleanFolder);

      return NextResponse.json({
        ok: true,
        message: `업로드된 파일(${file.name})로 지식 데이터베이스가 성공적으로 교체 원복되었습니다. (현재 DB 자동 백업 완료, 복원된 문서: ${documents.length}건)`,
        documents,
        backups,
      });
    }

    // B. 기존 저장된 백업 파일 선택 원복 또는 JSON base64 업로드 원복 (application/json)
    const body = await req.json().catch(() => ({}));
    const { resourceFolder, fileName, backupFileName, reason, uploadedFileBase64, uploadedFileName } = body;
    const targetFileName = backupFileName || fileName || uploadedFileName;

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json({ ok: false, message: '리소스 폴더가 필요합니다.' }, { status: 400 });
    }

    const cleanFolder = resolveSafeResourceFolder(resourceFolder);

    // B-1. Base64 인코딩 파일 업로드 원복 처리
    if (uploadedFileBase64 && uploadedFileName) {
      const dbDir = path.join(cleanFolder, 'db');
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      const tempUploadName = `.temp_restore_upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.db`;
      const tempUploadPath = path.join(dbDir, tempUploadName);
      fs.writeFileSync(tempUploadPath, Buffer.from(uploadedFileBase64, 'base64'));

      try {
        restoreKnowledgeDatabase(cleanFolder, tempUploadPath, reason || undefined);
      } finally {
        for (const ext of ['', '-wal', '-shm']) {
          const p = tempUploadPath + ext;
          if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
        }
      }

      const documents = KnowledgeService.listDocuments({
        resourceFolder: cleanFolder,
        geminiApiKey: 'DUMMY_FOR_LIST',
        planCode: 'ELITEPRO',
      });
      const backups = listKnowledgeBackups(cleanFolder);

      return NextResponse.json({
        ok: true,
        message: `업로드된 파일(${uploadedFileName})로 지식 데이터베이스가 성공적으로 원복되었습니다. (문서: ${documents.length}건)`,
        documents,
        backups,
      });
    }

    // B-2. 기존 로컬 백업 파일 선택 원복
    if (!targetFileName) {
      return NextResponse.json({ ok: false, message: '복원 대상 백업 파일명이 필요합니다.' }, { status: 400 });
    }

    const cleanName = path.basename(targetFileName);
    const sourceBackupPath = path.join(cleanFolder, 'db', 'backups', cleanName);

    if (!fs.existsSync(sourceBackupPath)) {
      return NextResponse.json({ ok: false, message: '복원 대상 백업 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 1) 현재 DB 자동 백업 (사유 포함) 후 2) 선택된 백업 파일로 교체 원복
    restoreKnowledgeDatabase(cleanFolder, sourceBackupPath, reason);

    // 복원된 DB의 실제 등록 문서 목록 즉시 조회
    const documents = KnowledgeService.listDocuments({
      resourceFolder: cleanFolder,
      geminiApiKey: 'DUMMY_FOR_LIST',
      planCode: 'ELITEPRO',
    });

    const backups = listKnowledgeBackups(cleanFolder);

    return NextResponse.json({
      ok: true,
      message: `백업 시점(${cleanName})으로 지식 데이터베이스가 성공적으로 원복되었습니다. (원복 직전 DB 자동 백업 완료, 복원된 문서: ${documents.length}건)`,
      documents,
      backups,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/restore',
      stage: 'restore_knowledge_db',
    });
  }
}
