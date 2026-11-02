// ====================================================================
// 📊 [OMD-API-knowledgeInit-0001] route.ts ➔ Resource Folder Initialization Route
// 🎯 @KICK  : 리소스 폴더 생성 시 5대 디렉토리(profiles, prompt, bible, media, db) 및 onrivi_knowledge.db 일괄 생성
// 🛡️ @GUARD : 절대 경로 검증, 6대 테이블 및 FTS5 스키마 완벽 초기화
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-05** — [초기화 사전 백업 사유(Reason) 전달] forceReset 요청 시 클라이언트로부터 전달받은 백업 사유(reason)를 resetKnowledgeDatabase에 전달하여 백업 메타데이터에 온전히 기록
//             **2026-09-05** — [초기화 전 자동 백업 확립] DB 초기화(forceReset) 요청 시 현재 운영 DB를 backups 폴더에 자동 스냅샷 백업 후 안전하게 초기화 진행 및 갱신된 백업 목록 반환
//             **2026-09-05** — [지식 DB 완전 초기화 안정성 강화] Windows 환경 파일 잠금 대비 안전한 TRUNCATE 및 재초기화 로직 연동
//             **2026-09-04** — [브라우저 리소스 폴더 안전 승격 연동] resolveSafeResourceFolder 적용으로 브라우저 폴더명도 5대 디렉토리 및 DB 완벽 자동 생성
//             **2026-09-04** — [사용자 지시 완벽 반영] 리소스 폴더 5대 디렉토리 및 DB 일괄 생성 엔드포인트 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeDb
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { getResourceKnowledgeDbPath, initKnowledgeDatabase, hasKnowledgeDatabase, resolveSafeResourceFolder } from '@/lib/knowledge/knowledgeDb';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceFolder, forceReset, reason } = body;

    if (!resourceFolder || !resourceFolder.trim()) {
      return NextResponse.json(
        { ok: false, message: '리소스 폴더 경로가 전달되지 않았습니다.' },
        { status: 400 }
      );
    }

    const cleanFolder = resolveSafeResourceFolder(resourceFolder);

    // ⚡ 완전 초기화(forceReset: true) 요청인 경우 현재 DB 사전 자동 백업 후 안전한 빈 스키마 초기화
    if (forceReset) {
      const { resetKnowledgeDatabase, listKnowledgeBackups } = await import('@/lib/knowledge/knowledgeDb');
      const backupInfo = resetKnowledgeDatabase(cleanFolder, reason);
      const backups = listKnowledgeBackups(cleanFolder);
      return NextResponse.json({
        ok: true,
        message: backupInfo
          ? `현재 데이터베이스를 안전하게 백업(${backupInfo.fileName}, 사유: ${backupInfo.reason || '초기화 전 자동 백업'})한 후 성공적으로 초기화되었습니다.`
          : '지식 데이터베이스가 성공적으로 완전 초기화되었습니다.',
        backup: backupInfo,
        backups,
        path: cleanFolder,
      });
    }

    // 1. 5대 하위 디렉토리 일괄 생성
    const subDirs = ['profiles', 'prompt', 'bible', 'media', 'db'];
    for (const dir of subDirs) {
      const dirPath = path.join(cleanFolder, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // 2. 기본 파일 생성 (기존 파일 보존)
    const profilesFile = path.join(cleanFolder, 'profiles', 'userCssProfiles.json');
    if (!fs.existsSync(profilesFile)) {
      fs.writeFileSync(profilesFile, '[]', 'utf-8');
    }

    const promptDir = path.join(cleanFolder, 'prompt');
    const aiPromptsFile = path.join(promptDir, 'ai_prompts.json');
    if (!fs.existsSync(aiPromptsFile)) {
      fs.writeFileSync(aiPromptsFile, '{}', 'utf-8');
    }
    const aiPresetsFile = path.join(promptDir, 'ai_presets.json');
    if (!fs.existsSync(aiPresetsFile)) {
      fs.writeFileSync(aiPresetsFile, '[]', 'utf-8');
    }
    const templatesFile = path.join(promptDir, 'promptTemplates.json');
    if (!fs.existsSync(templatesFile)) {
      fs.writeFileSync(templatesFile, '[]', 'utf-8');
    }

    const bibFile = path.join(cleanFolder, 'bible', 'references.bib');
    if (!fs.existsSync(bibFile)) {
      fs.writeFileSync(bibFile, '', 'utf-8');
    }

    // 3. db/onrivi_knowledge.db 생성 (★ 이미 존재하면 일체 손대지 않고 기존 데이터 100% 보존!)
    if (!hasKnowledgeDatabase(cleanFolder)) {
      const dbPath = getResourceKnowledgeDbPath(cleanFolder, true);
      initKnowledgeDatabase(dbPath);
    }

    return NextResponse.json({
      ok: true,
      message: '리소스 폴더의 5대 디렉토리 및 onrivi_knowledge.db가 성공적으로 초기화되었습니다.',
      path: cleanFolder,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/init',
      stage: 'init_knowledge_db',
    });
  }
}
