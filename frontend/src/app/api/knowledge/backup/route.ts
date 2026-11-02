// ====================================================================
// 📊 [OMD-API-knowledgeBackup-0001] route.ts ➔ Knowledge DB Backup API
// 🎯 @KICK  : 지식 데이터베이스 백업 생성(WAL 체크포인트 복사), 백업 목록 조회, 파일 다운로드, 백업 삭제
// 🛡️ @GUARD : 리소스 폴더 격리, 무결성 검증
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-05** — [백업 사유(Reason) 입력 지원] POST 요청 body에서 reason 파라미터를 받아 백업 메타데이터에 기록 연동
//             **2026-09-05** — 지식 DB 백업 생성, 목록 조회, 직접 파일 다운로드 및 삭제 API 엔드포인트 신설
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { 
  backupKnowledgeDatabase, 
  listKnowledgeBackups, 
  deleteKnowledgeBackup, 
  resolveSafeResourceFolder,
  getResourceKnowledgeDbPath
} from '@/lib/knowledge/knowledgeDb';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

// GET: 백업 목록 조회 또는 백업 파일 다운로드
export async function GET(req: NextRequest) {
  try {
    const resourceFolder = req.nextUrl.searchParams.get('resourceFolder');
    const fileName = req.nextUrl.searchParams.get('fileName');
    const download = req.nextUrl.searchParams.get('download');

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json({ ok: false, message: '리소스 폴더 경로가 전달되지 않았습니다.' }, { status: 400 });
    }

    const cleanFolder = resolveSafeResourceFolder(resourceFolder);

    // 1. 현재 실시간 DB 직접 다운로드
    if (download === 'current') {
      const dbPath = getResourceKnowledgeDbPath(cleanFolder, false);
      if (!fs.existsSync(dbPath)) {
        return NextResponse.json({ ok: false, message: '데이터베이스 파일이 존재하지 않습니다.' }, { status: 404 });
      }
      const fileBuffer = fs.readFileSync(dbPath);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const downloadName = `onrivi_knowledge_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.db`;
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${downloadName}"`,
        },
      });
    }

    // 2. 특정 백업 파일 다운로드
    if (download === 'true' && fileName) {
      const cleanName = path.basename(fileName);
      const backupPath = path.join(cleanFolder, 'db', 'backups', cleanName);
      if (!fs.existsSync(backupPath)) {
        return NextResponse.json({ ok: false, message: '요청한 백업 파일을 찾을 수 없습니다.' }, { status: 404 });
      }
      const fileBuffer = fs.readFileSync(backupPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${cleanName}"`,
        },
      });
    }

    // 3. 백업 목록 조회
    const backups = listKnowledgeBackups(cleanFolder);
    return NextResponse.json({ ok: true, backups });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/backup',
      stage: 'backup_knowledge_db',
    });
  }
}

// POST: 신규 백업 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceFolder, reason } = body;

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json({ ok: false, message: '리소스 폴더 경로가 전달되지 않았습니다.' }, { status: 400 });
    }

    const cleanFolder = resolveSafeResourceFolder(resourceFolder);
    const backup = backupKnowledgeDatabase(cleanFolder, reason);
    const backups = listKnowledgeBackups(cleanFolder);

    return NextResponse.json({
      ok: true,
      backup,
      backups,
      message: `지식 데이터베이스 백업(${backup.fileName})이 성공적으로 생성되었습니다. (사유: ${backup.reason || '기본 백업'})`,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/backup',
      stage: 'backup_knowledge_db',
    });
  }
}

// DELETE: 백업 파일 삭제
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceFolder, fileName } = body;

    if (!resourceFolder || !resourceFolder.trim() || !fileName) {
      return NextResponse.json({ ok: false, message: '리소스 폴더 및 파일명이 필요합니다.' }, { status: 400 });
    }

    const cleanFolder = resolveSafeResourceFolder(resourceFolder);
    deleteKnowledgeBackup(cleanFolder, fileName);
    const backups = listKnowledgeBackups(cleanFolder);

    return NextResponse.json({
      ok: true,
      backups,
      message: '백업 파일이 안전하게 삭제되었습니다.',
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/backup',
      stage: 'backup_knowledge_db',
    });
  }
}
