// ====================================================================
// 📊 [OMD-CORE-knowledgeDb-0001] knowledgeDb.ts ➔ Knowledge SQLite Engine
// 🎯 @KICK  : 리소스 폴더({resourceFolder}/db/onrivi_knowledge.db) SQLite FTS5 데이터베이스 인프라 및 원자적 트랜잭션 관리
// 🚨 @PATCH : **2026-09-17** — [지식 문서 상세조회 메타 청크 배제]: getDocumentDetailFromDb에서 isMetaOrAuxiliaryChunk 방어 필터를 적용하여 서두/메타영역/서식설정 청크 노출 원천 차단
// 🚨 @PATCH : **2026-09-13** — [유니코드 NFC 정규화 및 Node SQLite 인메모리 심층 문서 매칭 고도화]: getDocumentDetailFromDb에서 char(92) 경로 슬래시 치환 및 NFD/NFC 자모 분리 불일치 해결을 위한 인메모리 유니코드 정규화(NFC) 6단계 스캔 폴백을 추가하여 한국어 특수 파일명/경로 지식 문서 100% 탐색 보장
// 🚨 @PATCH : **2026-09-12** — [지식 문서 상세조회 제목/헤딩/청크 다중 폴백 고도화] getDocumentDetailFromDb에 heading 매개변수 지원 및 청크(document_chunks) heading_title/heading_path 검색 폴백, 제목 부분 일치(LIKE) 지원
//             **2026-09-11** — [SQLite database is locked 치명적 자동 복구 파괴 방어 및 백업 파일 복사 폴백] initKnowledgeDatabase에서 database is locked / busy 경합 발생 시 auto-recovery(DB 삭제 및 빈 DB 덮어쓰기)로 진입하지 않고 즉시 예외를 발생시키도록 보호하고, backupKnowledgeDatabase에서 잠금 경합 시 직접 파일 복사 폴백을 지원하여 DB 파괴를 원천 방어
//             **2026-09-06** — [실제 리소스 폴더 드라이브 자동 순회 탐색] resolveSafeResourceFolder에서 'Onrivi_Asset' 또는 'C:\Onrivi_Asset' 유입 시 실제 D:\, C:\, E:\ 드라이브를 순회하여 onrivi_knowledge.db가 존재하는 실제 드라이브를 찾아 연결 — 데스크톱/로컬 환경 탐색기 📗 지식문서 표시 정상화
//             **2026-09-06** — [AES 암호화 문자열 원천 방어 및 리소스 폴더 정규화] resolveSafeResourceFolder에서 로컬스토리지 AES 암호문(U2FsdGVkX1...)이 폴더명으로 유입 시 D:\U2FsdGVkX1... 등 엉뚱한 폴더와 가짜 DB 생성을 원천 방어하도록 복호화 및 Onrivi_Asset 표준 폴더로 강제 정규화
//             **2026-09-06** — [document_chunks chunk_text 스키마 통일 및 자동 마이그레이션] Web WASM SQLite와의 스키마 불일치(table document_chunks has no column named chunk_text)를 해결하기 위해 DDL에 chunk_text TEXT를 추가하고 기존 DB 로드 시 ALTER TABLE 및 FTS5 동기화 자동 마이그레이션 탑재
//             **2026-09-06** — [경로 정규화 및 파일명 매칭 폴백 강화] getDocumentDetailFromDb에서 OS/브라우저별 슬래시/역슬래시 차이 및 상대/절대경로 불일치 시에도 파일명 및 정규화 경로로 문서를 유연하게 식별하도록 검색 쿼리 고도화
//             **2026-09-05** — [백업 사유(Reason) 및 문서 수/대표제목 메타데이터 시스템 탑재] 백업 생성, DB 초기화, 원복 시 백업 사유(reason)와 등록 문서 건수/대표 제목을 backups_manifest.json에 실시간 기록/관리하고 백업 목록에 투명하게 노출 지원
//             **2026-09-05** — [SQLite 동시성 잠금(busy_timeout) 및 파일 디스크립터 누수 방어] PRAGMA busy_timeout = 10000 적용으로 동시 요청 시 database is locked 원천 방지, tryOpenAndInit 실패 시 인스턴스 즉시 close 및 Windows EBUSY 방어용 빈 DB 복사 폴백 구축, 캐시 헬스체크를 SELECT 1로 경량화
//             **2026-09-05** — [SQLite 손상 및 WAL 불일치 자동 복구(Auto-Repair) 탑재] database disk image is malformed 발생 시 캐시 무효화 및 잔여 -wal/-shm 자동 정리/재연결 자가 치유 로직 구축, closeKnowledgeDatabase 시 journal_mode=DELETE 전환으로 WAL 잔류 0% 보장
//             **2026-09-05** — [백업 단일 원칙 및 초기화/원복 사전 자동 백업 확립] DB 초기화(resetKnowledgeDatabase) 및 외부/로컬 원복(restoreKnowledgeDatabase) 수행 시 현재 운영 DB를 backups 폴더에 자동 스냅샷 백업 후 안전하게 초기화/교체하도록 파이프라인 표준화. backups 폴더 오염 방지 및 임시 파일 격리/자동 소제 적용
//             **2026-09-05** — [Windows EBUSY 파일잠금 방어 및 원자적 DB 완전 초기화] resetKnowledgeDatabase 실행 시 Windows 파일 잠금(EBUSY)으로 인한 초기화 무효화 현상을 원천 방어하도록 사전 SQL TRUNCATE/VACUUM 원트랜잭션 실행 후 언링크 및 재초기화 파이프라인 완비
//             **2026-09-05** — 지식 데이터베이스 완전 초기화(resetKnowledgeDatabase), WAL 체크포인트 기반 스냅샷 백업(backupKnowledgeDatabase), 백업 목록 조회(listKnowledgeBackups), 사전 검증 및 안전 원복(restoreKnowledgeDatabase), 백업 삭제 지원 함수 구축
//             **2026-09-04** — [서버 부하 방어 및 커넥션 싱글톤] 동일 dbPath에 대한 DatabaseSync 인스턴스 메모리 캐시 풀을 구축하여 불필요한 파일 재오픈 및 중복 DDL 실행 오버헤드 원천 제거 (initKnowledgeDatabase)
//             **2026-09-04** — [재색인 등록문서 엄격 가드] enqueueKnowledgeJob에서 jobType이 REINDEX인 경우 반드시 knowledge_documents에 사전 등록된 문서만 큐에 적재하도록 무결성 가드 적용 (미등록 문서 재색인 원천 차단)
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] legacy knowledge_jobs 테이블의 knowledge_documents 외래키 제약조건 제거 마이그레이션 적용 (선행 검증 및 비동기 작업 큐 등록 무결성 보장)
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 로컬 SQLite 기반 knowledge_jobs 큐 엔진(중복 억제, 6단계 파이프라인 진행률, 지수 백오프, 비정상 종료 자동 복구) 및 컬렉션 CRUD 연동
//             **2026-09-04** — [지식 문서 상세 분석 조회 함수 구현] getDocumentDetailFromDb 함수 추가하여 문서 메타, 청크 목록, FTS5 텍스트, 지식 태그를 원자적으로 조회 지원
//             **2026-09-04** — [SQLite 원트랜잭션(All-or-Nothing) 무결성 보장] saveCompleteKnowledgeDocumentAtomic 신규 구현하여 문서 마스터, 청크, FTS5, 태그를 단일 트랜잭션으로 원자적 저장 및 오류 시 완전 롤백
//             **2026-09-04** — [브라우저 환경 리소스 폴더 안전 승격] 웹 FilePicker 폴더명(Onrivi_Asset)을 루트 드라이브(D:\Onrivi_Asset)로 안전 승격하여 프로젝트 소스 루트 오염 방지 및 경로 에러 완벽 해결 (resolveSafeResourceFolder)
//             **2026-09-04** — [Webpack node:module 빌드 에러 완전 해결] Node 24 process.getBuiltinModule 표준 적용
//             **2026-09-04** — [사용자 지시 반영] DB 경로를 {resourceFolder}/db/onrivi_knowledge.db로 변경하고 리소스 폴더 미설정 시 차단 가드 적용
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] Node.js 내장 node:sqlite 기반 6대 테이블 및 FTS5 스키마 팩토리 초기화 최초 구현
// 🔗 @CALLS : process.getBuiltinModule
// ====================================================================

import type { 
  DocumentChunk, 
  KnowledgeDocument, 
  KnowledgeAnalysisResult, 
  KnowledgeDocumentDetail,
  KnowledgeJob,
  KnowledgeJobStep,
  KnowledgeCollection
} from '../../types/knowledge';
import { isMetaOrAuxiliaryChunk } from './markdownChunker';

function getNodeModules() {
  if (typeof window !== 'undefined') {
    return { DatabaseSync: null, fs: null, path: null };
  }
  try {
    // Node 22.3+ / Node 24 내장 글로벌 process.getBuiltinModule (Webpack 번들러가 정적 분석하지 않음)
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      const sqlite = proc.getBuiltinModule('node:sqlite');
      const fs = proc.getBuiltinModule('node:fs');
      const path = proc.getBuiltinModule('node:path');
      return {
        DatabaseSync: sqlite?.DatabaseSync || null,
        fs,
        path,
      };
    }
  } catch {
    // ignore
  }
  return { DatabaseSync: null, fs: null, path: null };
}

/**
 * 리소스 폴더 경로를 안전한 절대 경로로 정규화합니다.
 * - 브라우저 파일 피커 API는 보안상 드라이브 문자 없는 폴더명(예: 'Onrivi_Asset')만 반환하므로,
 *   서버 작업 디렉토리(process.cwd()) 내부가 아닌 현재 드라이브의 루트(예: 'D:\\Onrivi_Asset')로 안전하게 승격하여
 *   프로젝트 소스 루트 오염을 100% 방지하고 로컬 파일시스템의 실제 리소스 폴더를 찾도록 보장합니다.
 */
export function resolveSafeResourceFolder(resourceFolder: string | null | undefined): string {
  if (!resourceFolder || !resourceFolder.trim()) {
    throw new Error('RESOURCE_FOLDER_NOT_SET: 공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.');
  }

  const cleanFolder=resourceFolder.trim();
  if(cleanFolder===':memory:') return cleanFolder;
  if(cleanFolder.startsWith('gdrive://')) throw new Error('드라이브 지식 DB 직접 사용은 지원되지 않습니다. 환경설정에서 로컬 리소스 폴더를 선택해 주세요.');
  const {path,fs}=getNodeModules();
  if(!path || !path.isAbsolute(cleanFolder)) throw new Error('환경설정의 리소스 폴더 절대경로가 필요합니다.');
  if(fs && !fs.existsSync(cleanFolder)) throw new Error('환경설정의 리소스 폴더를 찾을 수 없습니다.');
  return cleanFolder;
}

/**
 * 리소스 폴더 내에 SQLite 지식 DB 파일이 실제로 존재하는지 확인합니다.
 */
export function hasKnowledgeDatabase(resourceFolder: string | null | undefined): boolean {
  if (!resourceFolder || !resourceFolder.trim()) return false;
  const { fs, path } = getNodeModules();
  if (!fs || !path) return false;
  try {
    const safeFolder = resolveSafeResourceFolder(resourceFolder);
    if (safeFolder === ':memory:') return true;
    const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
    return fs.existsSync(dbPath);
  } catch {
    return false;
  }
}

/**
 * 리소스 폴더 내 SQLite 지식 DB 경로를 반환합니다.
 * @throws {Error} 리소스 폴더가 지정되지 않았거나 빈 문자열인 경우 RESOURCE_FOLDER_NOT_SET 예외 발생
 */
export function getResourceKnowledgeDbPath(resourceFolder: string | null | undefined, autoCreateDir = true): string {
  const safeFolder = resolveSafeResourceFolder(resourceFolder);
  const { fs, path } = getNodeModules();

  const dbDir = path ? path.join(safeFolder, 'db') : `${safeFolder}/db`;

  if (autoCreateDir && fs && safeFolder !== ':memory:' && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path ? path.join(dbDir, 'onrivi_knowledge.db') : `${dbDir}/onrivi_knowledge.db`;
}

// 🛡️ [서버 부하 방어] 프로세스 레벨 SQLite 데이터베이스 연결 풀 / 싱글톤 인스턴스 캐시
const g = globalThis as any;
if (!g.__onriviDbInstanceCache) {
  g.__onriviDbInstanceCache = new Map<string, any>();
}
const dbInstanceCache: Map<string, any> = g.__onriviDbInstanceCache;

/**
 * SQLite 지식 데이터베이스 인스턴스를 초기화하고 6대 스키마를 생성합니다.
 * 동일한 dbPath에 대해서는 최초 1회만 스키마를 생성하고 메모리 캐시 인스턴스를 반환하여
 * 파일 디스크립터 누수 및 중복 DDL 실행 오버헤드를 원천 방어합니다.
 */
export function initKnowledgeDatabase(dbPath: string): any {
  if (dbPath !== ':memory:' && dbInstanceCache.has(dbPath)) {
    const cachedDb = dbInstanceCache.get(dbPath);
    try {
      cachedDb.prepare('SELECT 1').get();
      return cachedDb;
    } catch {
      try {
        try { cachedDb.exec('PRAGMA wal_checkpoint(TRUNCATE);'); cachedDb.exec('PRAGMA journal_mode = DELETE;'); } catch {}
        cachedDb.close();
      } catch {}
      dbInstanceCache.delete(dbPath);
    }
  }

  const { DatabaseSync, fs, path } = getNodeModules();
  if (!DatabaseSync) {
    throw new Error('SQLITE_NOT_AVAILABLE: 현재 런타임 환경에서 node:sqlite를 로드할 수 없습니다.');
  }

  if (dbPath !== ':memory:' && fs && path) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const tryOpenAndInit = () => {
    const instance = new DatabaseSync(dbPath);
    try {
      instance.exec('PRAGMA busy_timeout = 10000;');
      if (dbPath !== ':memory:') {
        instance.exec('PRAGMA journal_mode = WAL;');
      }
      instance.exec('PRAGMA foreign_keys = ON;');
      applyKnowledgeSchema(instance);
      return instance;
    } catch (e) {
      try { instance.close(); } catch {}
      throw e;
    }
  };

  let db: any = null;
  try {
    db = tryOpenAndInit();
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    const errCode = (err?.code || '').toLowerCase();
    const isLocked = err?.errcode === 5 ||
      err?.errcode === 6 ||
      errMsg.includes('database is locked') ||
      errMsg.includes('busy') ||
      errMsg.includes('ebusy') ||
      errCode.includes('busy') ||
      errCode.includes('locked');

    // 🚨 database is locked 경합 시 DB 파일 삭제/초기화(Auto-recovery)를 절대 시도하지 않고 즉시 throw
    if (isLocked) {
      console.warn('[initKnowledgeDatabase] Database is locked by another process, aborting init without file removal:', err?.message);
      try { if (db) db.close(); } catch {}
      throw new Error(`DATABASE_LOCKED: 데이터베이스가 다른 프로세스(Electron 또는 외부 프로그램)에 의해 잠겨 있습니다 (${err?.message}). 잠시 후 다시 시도해 주세요.`);
    }

    console.warn('[initKnowledgeDatabase] DB open or schema init failed (corrupted/malformed), initiating auto-recovery:', err?.message);
    try { if (db) db.close(); } catch {}
    db = null;

    if (dbPath !== ':memory:' && fs) {
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
      try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch {}

      try {
        db = tryOpenAndInit();
      } catch (retryErr: any) {
        const retryErrMsg = (retryErr?.message || '').toLowerCase();
        if (retryErrMsg.includes('database is locked') || retryErrMsg.includes('busy')) {
          throw new Error(`DATABASE_LOCKED: 데이터베이스가 잠겨 있어 복구할 수 없습니다 (${retryErr?.message}).`);
        }
        console.error('[initKnowledgeDatabase] File still malformed, rebuilding clean database:', retryErr?.message);
        try { if (db) db.close(); } catch {}
        try { fs.unlinkSync(dbPath); } catch {}
        try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
        try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch {}

        // Windows EBUSY 파일 잠금 방어: unlink가 실패했을 경우 빈 DB 복사로 파일 내용 강제 교체 (유효한 SQLite 3 헤더 보장)
        if (fs.existsSync(dbPath) && path) {
          try {
            const blankTemp = path.join(path.dirname(dbPath), `temp_blank_${Date.now()}.db`);
            const blankDb = new DatabaseSync(blankTemp);
            blankDb.exec('PRAGMA journal_mode = DELETE;');
            blankDb.exec('PRAGMA user_version = 1;');
            blankDb.close();
            fs.copyFileSync(blankTemp, dbPath);
            try { fs.unlinkSync(blankTemp); } catch {}
          } catch {}
        }

        db = tryOpenAndInit();
      }
    } else {
      throw err;
    }
  }

  if (dbPath !== ':memory:') {
    dbInstanceCache.set(dbPath, db);
  }

  return db;
}

/**
 * 지식 데이터베이스 6대 핵심 테이블 및 FTS5 스키마를 생성/보정합니다.
 */
function applyKnowledgeSchema(db: any): void {
  // 1. 지식 컬렉션
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#1d4ed8',
      created_at TEXT NOT NULL
    );
  `);

  // 2. 지식 문서 마스터
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      collection_id TEXT,
      file_path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      modified_at TEXT NOT NULL,
      summary TEXT,
      key_points TEXT,
      document_type TEXT DEFAULT 'other',
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK(status IN ('REGISTERED', 'INDEXING', 'READY', 'OUTDATED', 'DISABLED', 'ERROR')),
      error_message TEXT,
      analysis_version INTEGER NOT NULL DEFAULT 1,
      analyzer_model TEXT,
      analyzed_at TEXT,
      indexed_at TEXT,
      FOREIGN KEY(collection_id) REFERENCES knowledge_collections(id) ON DELETE SET NULL
    );
  `);

  // 3. 지식 태그
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      source TEXT DEFAULT 'AI',
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tags_doc ON document_tags(document_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name_score ON document_tags(tag_name, score DESC);
  `);

  // 4. 마크다운 청크 메타데이터
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      heading_title TEXT,
      heading_level INTEGER,
      heading_path TEXT,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      chunk_summary TEXT,
      keywords TEXT,
      chunk_text TEXT,
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
  `);

  // 5. FTS5 전문 검색 가상 테이블
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
      chunk_id UNINDEXED,
      document_id UNINDEXED,
      heading_title,
      keywords,
      chunk_text
    );
  `);

  // 6. 백그라운드 작업 큐 (KUI-007, KUI-008, KUI-009)
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_jobs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      title TEXT,
      job_type TEXT NOT NULL CHECK(job_type IN ('INDEX', 'REINDEX', 'DELETE')),
      target_hash TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
      current_step TEXT DEFAULT 'QUEUED',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      retry_after TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      error_log TEXT
    );
  `);

  // 🛡️ 안전한 스키마 마이그레이션 (기존 DB 호환성 보장 - 인덱스 생성 전 선행 컬럼 추가)
  try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;"); } catch {}
  try { db.exec("UPDATE document_chunks SET chunk_text = (SELECT f.chunk_text FROM document_chunks_fts f WHERE f.chunk_id = document_chunks.id) WHERE chunk_text IS NULL OR chunk_text = '';"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN file_path TEXT;"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN title TEXT;"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN current_step TEXT DEFAULT 'QUEUED';"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN retry_count INTEGER DEFAULT 0;"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN max_retries INTEGER DEFAULT 3;"); } catch {}
  try { db.exec("ALTER TABLE knowledge_jobs ADD COLUMN retry_after TEXT;"); } catch {}
  try { db.exec("ALTER TABLE knowledge_collections ADD COLUMN color TEXT DEFAULT '#1d4ed8';"); } catch {}

  // 🛡️ 기존 DB의 knowledge_jobs 테이블에 걸려있던 knowledge_documents 외래키 제약조건 제거 (Rule 7: 선행 검증 후 원자적 쓰기 준수)
  try {
    const fkList = db.prepare("PRAGMA foreign_key_list(knowledge_jobs);").all() as any[];
    if (fkList && fkList.some(fk => fk.table === 'knowledge_documents')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        BEGIN TRANSACTION;
        CREATE TABLE knowledge_jobs_migrated (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          title TEXT,
          job_type TEXT NOT NULL CHECK(job_type IN ('INDEX', 'REINDEX', 'DELETE')),
          target_hash TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
          status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
          current_step TEXT DEFAULT 'QUEUED',
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          retry_after TEXT,
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT,
          error_log TEXT
        );
        INSERT INTO knowledge_jobs_migrated (
          id, document_id, file_path, title, job_type, target_hash,
          priority, status, current_step, retry_count, max_retries, retry_after, created_at, started_at, completed_at, error_log
        ) SELECT 
          id, document_id, COALESCE(file_path, ''), COALESCE(title, ''), job_type, target_hash,
          priority, status, COALESCE(current_step, 'QUEUED'), COALESCE(retry_count, 0), COALESCE(max_retries, 3), retry_after, created_at, started_at, completed_at, error_log
        FROM knowledge_jobs;
        DROP TABLE knowledge_jobs;
        ALTER TABLE knowledge_jobs_migrated RENAME TO knowledge_jobs;
        COMMIT;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch {}

  // 인덱스 안전 생성
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_prio ON knowledge_jobs(status, priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_jobs_file_hash ON knowledge_jobs(file_path, target_hash);
    `);
  } catch {}
}

/**
 * 청크 메타데이터와 FTS5 인덱스를 단일 트랜잭션으로 원자적 동기화합니다.
 */
export function syncDocumentChunksAtomic(
  db: any,
  documentId: string,
  chunks: DocumentChunk[]
): void {
  db.exec('BEGIN TRANSACTION;');
  try {
    const delFts = db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?');
    delFts.run(documentId);

    const delChunks = db.prepare('DELETE FROM document_chunks WHERE document_id = ?');
    delChunks.run(documentId);

    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, heading_title, heading_level,
        heading_path, start_line, end_line, chunk_summary, keywords, chunk_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFts = db.prepare(`
      INSERT INTO document_chunks_fts (
        chunk_id, document_id, heading_title, keywords, chunk_text
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const c of chunks) {
      insertChunk.run(
        c.id,
        documentId,
        c.chunkIndex,
        c.headingTitle,
        c.headingLevel,
        c.headingPath,
        c.startLine,
        c.endLine,
        c.chunkSummary || '',
        c.keywords || '',
        c.chunkText || ''
      );

      insertFts.run(
        c.id,
        documentId,
        c.headingTitle,
        c.keywords || '',
        c.chunkText
      );
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * 지식 문서를 등록하거나 업데이트합니다.
 */
export function upsertKnowledgeDocument(
  db: any,
  doc: {
    id: string;
    filePath: string;
    title: string;
    fileHash: string;
    fileSize: number;
    modifiedAt: string;
    priority?: number;
    status?: string;
  }
): void {
  const stmt = db.prepare(`
    INSERT INTO knowledge_documents (
      id, file_path, title, file_hash, file_size, modified_at, priority, status, analysis_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      file_hash = excluded.file_hash,
      file_size = excluded.file_size,
      modified_at = excluded.modified_at,
      status = excluded.status;
  `);

  stmt.run(
    doc.id,
    doc.filePath,
    doc.title,
    doc.fileHash,
    doc.fileSize,
    doc.modifiedAt,
    doc.priority || 3,
    doc.status || 'REGISTERED'
  );
}

/**
 * AI 분석 결과(요약, 요점, 태그, 점수)를 원자적으로 반영하고 READY로 전이합니다.
 */
export function saveKnowledgeAnalysisAtomic(
  db: any,
  documentId: string,
  analysis: KnowledgeAnalysisResult,
  analyzerModel: string = 'gemini-flash'
): void {
  db.exec('BEGIN TRANSACTION;');
  try {
    const updateDoc = db.prepare(`
      UPDATE knowledge_documents
      SET summary = ?,
          key_points = ?,
          document_type = ?,
          analyzer_model = ?,
          analyzed_at = ?,
          indexed_at = ?,
          status = 'READY',
          error_message = NULL
      WHERE id = ?
    `);

    const now = new Date().toISOString();
    updateDoc.run(
      analysis.summary,
      JSON.stringify(analysis.keyPoints),
      analysis.documentType,
      analyzerModel,
      now,
      now,
      documentId
    );

    const delTags = db.prepare('DELETE FROM document_tags WHERE document_id = ?');
    delTags.run(documentId);

    const insertTag = db.prepare(`
      INSERT INTO document_tags (document_id, tag_name, score, source)
      VALUES (?, ?, ?, 'AI')
    `);

    for (const tag of analysis.tags) {
      insertTag.run(documentId, tag.name, tag.score);
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * 지식 문서 마스터, 청크 메타데이터, FTS5 인덱스, 지식 태그를
 * 단 하나의 SQLite 트랜잭션(All-or-Nothing)으로 원자적 저장합니다.
 * 중간에 어떤 오류라도 발생하면 즉시 ROLLBACK되어 비정상/오류 데이터가 DB에 남지 않습니다.
 */
export function saveCompleteKnowledgeDocumentAtomic(
  db: any,
  params: {
    document: {
      id: string;
      filePath: string;
      title: string;
      fileHash: string;
      fileSize: number;
      modifiedAt: string;
      priority?: number;
    };
    chunks: DocumentChunk[];
    analysis: KnowledgeAnalysisResult;
    analyzerModel: string;
  }
): void {
  const { document: doc, chunks, analysis, analyzerModel } = params;
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. 기존 연관 데이터(FTS, 청크, 태그) 정리
    db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(doc.id);
    db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(doc.id);
    db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(doc.id);

    // 2. 문서 마스터 등록 (완전한 READY 상태로 원자적 저장)
    const upsertDoc = db.prepare(`
      INSERT INTO knowledge_documents (
        id, file_path, title, file_hash, file_size, modified_at, priority,
        status, summary, key_points, document_type, analyzer_model, analyzed_at, indexed_at,
        error_message, analysis_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?, ?, ?, ?, NULL, 1)
      ON CONFLICT(file_path) DO UPDATE SET
        title = excluded.title,
        file_hash = excluded.file_hash,
        file_size = excluded.file_size,
        modified_at = excluded.modified_at,
        priority = excluded.priority,
        status = 'READY',
        summary = excluded.summary,
        key_points = excluded.key_points,
        document_type = excluded.document_type,
        analyzer_model = excluded.analyzer_model,
        analyzed_at = excluded.analyzed_at,
        indexed_at = excluded.indexed_at,
        error_message = NULL;
    `);

    upsertDoc.run(
      doc.id,
      doc.filePath,
      doc.title,
      doc.fileHash,
      doc.fileSize,
      doc.modifiedAt,
      doc.priority || 3,
      analysis.summary,
      JSON.stringify(analysis.keyPoints),
      analysis.documentType,
      analyzerModel || 'gemini-3.8-flash',
      now,
      now
    );

    // 3. 청크 및 FTS5 색인 저장
    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, heading_title, heading_level,
        heading_path, start_line, end_line, chunk_summary, keywords, chunk_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFts = db.prepare(`
      INSERT INTO document_chunks_fts (
        chunk_id, document_id, heading_title, keywords, chunk_text
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const c of chunks) {
      insertChunk.run(
        c.id,
        doc.id,
        c.chunkIndex,
        c.headingTitle,
        c.headingLevel,
        c.headingPath,
        c.startLine,
        c.endLine,
        c.chunkSummary || '',
        Array.isArray(c.keywords) ? c.keywords.join(', ') : (c.keywords || ''),
        c.chunkText || ''
      );

      insertFts.run(
        c.id,
        doc.id,
        c.headingTitle,
        c.keywords || '',
        c.chunkText
      );
    }

    // 4. 지식 태그 저장
    if (analysis.tags && analysis.tags.length > 0) {
      const insertTag = db.prepare(`
        INSERT INTO document_tags (document_id, tag_name, score, source)
        VALUES (?, ?, ?, 'AI')
      `);

      for (const tag of analysis.tags) {
        insertTag.run(doc.id, tag.name, tag.score);
      }
    }

    // 5. 모든 작업이 완벽히 성공했을 때만 단일 커밋
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * DB에서 특정 문서의 전체 상세 내역(AI 요약, 키포인트, 태그, 청크 계층 및 라인 정보)을 조회합니다.
 */
export function getDocumentDetailFromDb(
  db: any,
  params: { documentId?: string; filePath?: string; heading?: string }
): KnowledgeDocumentDetail | null {
  const { documentId, filePath, heading } = params;

  let doc: any = null;
  if (documentId) {
    doc = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(documentId);
  } else if (filePath || heading) {
    if (filePath) {
      // 1) 정확 매칭
      doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ?').get(filePath);
      // 2) 슬래시/역슬래시 정규화 매칭
      if (!doc) {
        const normSlash = filePath.replace(/\\/g, '/');
        const normBack = filePath.replace(/\//g, '\\');
        doc = db.prepare('SELECT * FROM knowledge_documents WHERE replace(file_path, char(92), \'/\') = ? OR replace(file_path, \'/\', char(92)) = ?').get(normSlash, normBack);
      }
      // 3) 파일명(Basename) 접미사 매칭 폴백
      if (!doc) {
        const rawName = filePath.split(/[/\\]/).pop() || '';
        const nameWithMd = rawName.endsWith('.md') ? rawName : `${rawName}.md`;
        const nameWithoutMd = rawName.replace(/\.md$/i, '');
        if (nameWithoutMd) {
          doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ? OR file_path LIKE ? OR file_path LIKE ? OR file_path = ? OR file_path LIKE ? OR file_path LIKE ? LIMIT 1').get(
            nameWithoutMd,
            `%/${nameWithoutMd}`,
            `%\\${nameWithoutMd}`,
            nameWithMd,
            `%/${nameWithMd}`,
            `%\\${nameWithMd}`
          );
        }
      }
      // 4) 문서 제목(title) 매칭 폴백 (정확/부분 일치)
      if (!doc) {
        const cleanTitle = (filePath.split(/[/\\]/).pop() || filePath).replace(/\.md$/i, '').trim();
        if (cleanTitle) {
          doc = db.prepare('SELECT * FROM knowledge_documents WHERE title = ? OR title = ? OR replace(title, \'.md\', \'\') = ? OR title LIKE ? OR ? LIKE (\'%\' || replace(title, \'.md\', \'\') || \'%\') LIMIT 1').get(
            cleanTitle,
            `${cleanTitle}.md`,
            cleanTitle,
            `%${cleanTitle}%`,
            cleanTitle
          );
        }
      }
    }

    // 5) 헤딩(heading) 또는 청크 검색 폴백
    if (!doc && (heading || filePath)) {
      const searchHeading = (heading || filePath || '').replace(/^#+\s*/, '').replace(/\.md$/i, '').trim();
      if (searchHeading && searchHeading.length >= 2) {
        try {
          doc = db.prepare(`
            SELECT d.* FROM knowledge_documents d
            JOIN document_chunks c ON c.document_id = d.id
            WHERE c.heading_title = ?
               OR c.heading_title LIKE ?
               OR c.heading_path LIKE ?
            LIMIT 1
          `).get(
            searchHeading,
            `%${searchHeading}%`,
            `%${searchHeading}%`
          );
        } catch {}
      }
    }

    // 6) 💡 [유니코드 NFC 정규화 및 인메모리 심층 문서 매칭 폴백]
    if (!doc && (filePath || heading)) {
      try {
        const rawTarget = (filePath || heading || '').normalize('NFC').replace(/\\/g, '/');
        const targetClean = rawTarget.split(/[?#]/)[0].trim();
        const targetBase = (targetClean.split('/').pop() || targetClean).replace(/\.md$/i, '').toLowerCase();

        if (targetBase) {
          const allDocs = db.prepare('SELECT id, file_path, title FROM knowledge_documents').all() as any[];
          for (const row of allDocs) {
            const rowPath = String(row.file_path || '').normalize('NFC').replace(/\\/g, '/');
            const rowTitle = String(row.title || '').normalize('NFC').toLowerCase();
            const rowBase = (rowPath.split('/').pop() || '').replace(/\.md$/i, '').toLowerCase();

            if (
              rowPath.toLowerCase() === targetClean.toLowerCase() ||
              rowPath.toLowerCase().endsWith('/' + targetBase + '.md') ||
              rowPath.toLowerCase().endsWith('/' + targetBase) ||
              rowBase === targetBase ||
              rowTitle === targetBase ||
              (targetBase.length >= 3 && (rowTitle.includes(targetBase) || targetBase.includes(rowTitle))) ||
              (targetBase.length >= 3 && (rowBase.includes(targetBase) || targetBase.includes(rowBase)))
            ) {
              doc = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(row.id);
              break;
            }
          }
        }
      } catch {}
    }
  }

  if (!doc) return null;

  const chunks = db.prepare(`
    SELECT c.id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path, 
           c.start_line, c.end_line, c.chunk_summary, c.keywords,
           COALESCE(c.chunk_text, f.chunk_text, '') as chunk_text
    FROM document_chunks c
    LEFT JOIN document_chunks_fts f ON f.chunk_id = c.id
    WHERE c.document_id = ?
    ORDER BY c.chunk_index ASC
  `).all(doc.id) as any[];

  const tags = db.prepare(`
    SELECT tag_name as name, score
    FROM document_tags
    WHERE document_id = ?
    ORDER BY score DESC
  `).all(doc.id) as any[];

  let keyPoints: string[] = [];
  try {
    if (doc.key_points) {
      keyPoints = JSON.parse(doc.key_points);
    }
  } catch {}

  let searchTerms: string[] = [];
  try {
    if (doc.search_terms) {
      searchTerms = JSON.parse(doc.search_terms);
    }
  } catch {}

  const validChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.heading_title, c.chunk_text, c.start_line, c.end_line));

  return {
    documentId: doc.id,
    filePath: doc.file_path,
    title: doc.title,
    fileSize: doc.file_size,
    modifiedAt: doc.modified_at,
    status: doc.status,
    summary: doc.summary || '',
    keyPoints,
    documentType: doc.document_type || 'other',
    tags: tags || [],
    searchTerms,
    analyzerModel: doc.analyzer_model || 'Gemini',
    chunksCount: validChunks.length,
    chunks: validChunks.map(c => {
      let keywordsArr: string[] = [];
      if (Array.isArray(c.keywords)) {
        keywordsArr = c.keywords;
      } else if (typeof c.keywords === 'string') {
        try {
          keywordsArr = JSON.parse(c.keywords);
        } catch {
          keywordsArr = c.keywords.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      return {
        id: c.id,
        chunkIndex: c.chunk_index,
        headingTitle: c.heading_title,
        headingLevel: c.heading_level,
        headingPath: c.heading_path,
        startLine: c.start_line,
        endLine: c.end_line,
        chunkSummary: c.chunk_summary,
        keywords: keywordsArr,
        chunkText: c.chunk_text,
      };
    }),
  };
}

// ====================================================================
// 🧠 컬렉션 (Knowledge Collection) CRUD
// ====================================================================

export function getKnowledgeCollections(db: any): KnowledgeCollection[] {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.description, COALESCE(c.color, '#1d4ed8') as color, c.created_at,
           COUNT(d.id) as documentCount
    FROM knowledge_collections c
    LEFT JOIN knowledge_documents d ON d.collection_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    createdAt: r.created_at,
    documentCount: Number(r.documentCount || 0)
  }));
}

export function upsertKnowledgeCollection(
  db: any, 
  collection: { id?: string; name: string; description?: string; color?: string }
): KnowledgeCollection {
  const id = collection.id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const color = collection.color || '#1d4ed8';

  db.prepare(`
    INSERT INTO knowledge_collections (id, name, description, color, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      color = excluded.color
  `).run(id, collection.name, collection.description || null, color, now);

  const saved = db.prepare('SELECT * FROM knowledge_collections WHERE name = ?').get(collection.name) as any;
  return {
    id: saved.id,
    name: saved.name,
    description: saved.description,
    color: saved.color,
    createdAt: saved.created_at,
  };
}

export function deleteKnowledgeCollection(db: any, collectionId: string): void {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE knowledge_documents SET collection_id = NULL WHERE collection_id = ?').run(collectionId);
    db.prepare('DELETE FROM knowledge_collections WHERE id = ?').run(collectionId);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// ====================================================================
// 🚀 로컬 지식 작업 큐 (Knowledge Queue Engine)
// ====================================================================

/**
 * 작업을 큐에 등록합니다.
 * 중복 방지 규칙(Duplicate Job Suppression):
 * 동일한 file_path에 대해 동일한 target_hash를 가진 QUEUED 또는 RUNNING 작업이 이미 있으면 신규 등록을 억제(null 반환)합니다.
 */
export function enqueueKnowledgeJob(
  db: any,
  job: {
    documentId: string;
    filePath: string;
    title?: string;
    jobType?: 'INDEX' | 'REINDEX' | 'DELETE';
    targetHash: string;
    priority?: number;
  }
): KnowledgeJob | null {
  const priority = job.priority ?? 3;
  const jobType = job.jobType ?? 'INDEX';

  // 🛡️ [무결성 가드] 재색인(REINDEX)은 반드시 지식 보관함(knowledge_documents)에 등록된 문서만 허용 (미등록 문서 큐 적재 원천 차단)
  if (jobType === 'REINDEX') {
    const isDocRegistered = db.prepare(`
      SELECT id FROM knowledge_documents 
      WHERE file_path = ? OR id = ? OR replace(file_path, '\\', '/') = replace(?, '\\', '/')
    `).get(job.filePath, job.documentId, job.filePath);

    if (!isDocRegistered) {
      return null; // 지식 보관함 등록 문서가 아니면 재색인 큐 등록 거부
    }
  }

  const existing = db.prepare(`
    SELECT * FROM knowledge_jobs
    WHERE file_path = ? AND target_hash = ? AND status IN ('QUEUED', 'RUNNING')
  `).get(job.filePath, job.targetHash) as any;

  if (existing) {
    return null; // 중복 억제 (Duplicate Job Suppression)
  }

  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO knowledge_jobs (
      id, document_id, file_path, title, job_type, target_hash,
      priority, status, current_step, retry_count, max_retries, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'QUEUED', 0, 3, ?)
  `).run(id, job.documentId, job.filePath, job.title || '', jobType, job.targetHash, priority, now);

  return {
    id,
    documentId: job.documentId,
    filePath: job.filePath,
    title: job.title,
    jobType,
    targetHash: job.targetHash,
    priority,
    status: 'QUEUED',
    currentStep: 'QUEUED',
    retryCount: 0,
    maxRetries: 3,
    createdAt: now
  };
}

/**
 * 다음으로 실행할 우선순위 높은 작업을 원자적으로 선점하여 RUNNING 상태로 전이합니다.
 */
export function getNextKnowledgeJob(db: any): KnowledgeJob | null {
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    const job = db.prepare(`
      SELECT * FROM knowledge_jobs
      WHERE status = 'QUEUED' AND (retry_after IS NULL OR retry_after <= ?)
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `).get(now) as any;

    if (!job) {
      db.exec('COMMIT;');
      return null;
    }

    db.prepare(`
      UPDATE knowledge_jobs
      SET status = 'RUNNING', started_at = ?, current_step = 'HASH'
      WHERE id = ?
    `).run(now, job.id);

    db.exec('COMMIT;');

    return {
      id: job.id,
      documentId: job.document_id,
      filePath: job.file_path,
      title: job.title,
      jobType: job.job_type,
      targetHash: job.target_hash,
      priority: job.priority,
      status: 'RUNNING',
      currentStep: 'HASH',
      retryCount: job.retry_count || 0,
      maxRetries: job.max_retries || 3,
      createdAt: job.created_at,
      startedAt: now
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * 작업의 현재 단계(step)를 업데이트합니다.
 */
export function updateJobStep(db: any, jobId: string, step: KnowledgeJobStep, errorLog?: string): void {
  db.prepare(`
    UPDATE knowledge_jobs
    SET current_step = ?, error_log = COALESCE(?, error_log)
    WHERE id = ?
  `).run(step, errorLog || null, jobId);
}

/**
 * 작업을 완료 또는 지수 백오프/실패 처리합니다.
 */
export function completeKnowledgeJob(
  db: any,
  jobId: string,
  result: {
    success: boolean;
    errorLog?: string;
    backoffSeconds?: number;
  }
): void {
  const now = new Date().toISOString();
  const current = db.prepare('SELECT * FROM knowledge_jobs WHERE id = ?').get(jobId) as any;
  if (!current) return;

  if (result.success) {
    db.prepare(`
      UPDATE knowledge_jobs
      SET status = 'SUCCESS', current_step = 'COMPLETED', completed_at = ?, error_log = NULL
      WHERE id = ?
    `).run(now, jobId);
  } else {
    const nextRetry = (current.retry_count || 0) + 1;
    const maxRetries = current.max_retries || 3;

    if (nextRetry <= maxRetries && result.backoffSeconds) {
      const retryAfterTime = new Date(Date.now() + result.backoffSeconds * 1000).toISOString();
      db.prepare(`
        UPDATE knowledge_jobs
        SET status = 'QUEUED', current_step = 'QUEUED', retry_count = ?, retry_after = ?, error_log = ?
        WHERE id = ?
      `).run(nextRetry, retryAfterTime, result.errorLog || 'Retry scheduled', jobId);
    } else {
      db.prepare(`
        UPDATE knowledge_jobs
        SET status = 'FAILED', current_step = 'FAILED', retry_count = ?, completed_at = ?, error_log = ?
        WHERE id = ?
      `).run(nextRetry, now, result.errorLog || 'Execution failed', jobId);
    }
  }
}

/**
 * 특정 작업을 취소합니다.
 */
export function cancelKnowledgeJob(db: any, jobId: string): void {
  db.prepare(`
    UPDATE knowledge_jobs
    SET status = 'CANCELLED', current_step = 'FAILED', completed_at = ?
    WHERE id = ? AND status IN ('QUEUED', 'RUNNING')
  `).run(new Date().toISOString(), jobId);
}

/**
 * 실패한 모든(또는 특정) 작업들을 QUEUED로 리셋하여 재시도합니다.
 */
export function retryFailedKnowledgeJobs(db: any, jobIds?: string[]): number {
  if (jobIds && jobIds.length > 0) {
    const placeholders = jobIds.map(() => '?').join(',');
    const info = db.prepare(`
      UPDATE knowledge_jobs
      SET status = 'QUEUED', current_step = 'QUEUED', retry_count = 0, retry_after = NULL, error_log = NULL
      WHERE status = 'FAILED' AND id IN (${placeholders})
    `).run(...jobIds);
    return info.changes;
  } else {
    const info = db.prepare(`
      UPDATE knowledge_jobs
      SET status = 'QUEUED', current_step = 'QUEUED', retry_count = 0, retry_after = NULL, error_log = NULL
      WHERE status = 'FAILED'
    `).run();
    return info.changes;
  }
}

/**
 * 앱 재실행 시 RUNNING 상태로 남아있던 고아 작업들을 QUEUED로 자동 복구합니다.
 */
export function recoverStaleRunningJobs(db: any): number {
  const info = db.prepare(`
    UPDATE knowledge_jobs
    SET status = 'QUEUED', current_step = 'QUEUED'
    WHERE status = 'RUNNING'
  `).run();
  return info.changes;
}

/**
 * 전체 큐 상태 요약 통계를 반환합니다.
 */
export function getQueueStats(db: any): { total: number; queued: number; running: number; success: number; failed: number } {
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM knowledge_jobs
    GROUP BY status
  `).all() as any[];

  let total = 0, queued = 0, running = 0, success = 0, failed = 0;
  for (const r of rows) {
    const count = Number(r.count || 0);
    total += count;
    if (r.status === 'QUEUED') queued = count;
    else if (r.status === 'RUNNING') running = count;
    else if (r.status === 'SUCCESS') success = count;
    else if (r.status === 'FAILED') failed = count;
  }

  return { total, queued, running, success, failed };
}

/**
 * 작업 목록을 조회합니다 (KUI-007, KUI-008, KUI-009 지원).
 */
export function listKnowledgeJobs(db: any, limit = 50, status?: string): KnowledgeJob[] {
  let query = 'SELECT * FROM knowledge_jobs';
  const params: any[] = [];
  if (status && status !== 'ALL') {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    id: r.id,
    documentId: r.document_id,
    filePath: r.file_path,
    title: r.title,
    jobType: r.job_type,
    targetHash: r.target_hash,
    priority: r.priority,
    status: r.status,
    currentStep: r.current_step,
    retryCount: r.retry_count || 0,
    maxRetries: r.max_retries || 3,
    retryAfter: r.retry_after,
    createdAt: r.created_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    errorLog: r.error_log,
  }));
}

/**
 * 캐시된 SQLite 데이터베이스 연결을 닫고 캐시 풀에서 안전하게 제거합니다.
 */
export function closeKnowledgeDatabase(dbPath: string): void {
  if (dbInstanceCache.has(dbPath)) {
    const db = dbInstanceCache.get(dbPath);
    try {
      if (db) {
        try {
          db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
          db.exec('PRAGMA journal_mode = DELETE;');
        } catch {}
        if (typeof db.close === 'function') {
          db.close();
        }
      }
    } catch (e) {
      console.warn('[closeKnowledgeDatabase] Error closing db:', e);
    }
    dbInstanceCache.delete(dbPath);
  }
}

/**
 * 지식 데이터베이스(onrivi_knowledge.db)를 완전히 초기화(Wipe)하고 깨끗한 빈 스키마로 재구축합니다.
 * Windows 환경의 EBUSY 파일 잠금 이슈를 원천 방어하기 위해:
 * 1) 열려 있는 DB에서 모든 테이블의 레코드를 단일 트랜잭션으로 원자적 TRUNCATE/DELETE 및 VACUUM 수행
 * 2) WAL 체크포인트 TRUNCATE 실행
 * 3) 커넥션 종료 후 파일 언링크 시도 (성공 시 완전 신규 파일 생성, 실패하더라도 이미 데이터는 100% 비워진 상태 보장)
 * 4) 깨끗한 빈 스키마 재초기화
 */
export function resetKnowledgeDatabase(resourceFolder: string, reason?: string): KnowledgeBackupInfo | null {
  const dbPath = getResourceKnowledgeDbPath(resourceFolder, false);
  let backupInfo: KnowledgeBackupInfo | null = null;
  const { fs } = getNodeModules();

  // 0단계: 초기화 직전 현재 데이터베이스 자동 스냅샷 백업 생성
  if (fs && fs.existsSync(dbPath)) {
    try {
      const stat = fs.statSync(dbPath);
      if (stat.size > 100) {
        const resetReason = reason && reason.trim() 
          ? reason.trim() 
          : '[초기화 직전 자동 백업] 데이터베이스 전체 초기화 수행 전 스냅샷';
        backupInfo = backupKnowledgeDatabase(resourceFolder, resetReason);
        console.info(`[resetKnowledgeDatabase] Pre-reset snapshot backup created: ${backupInfo.fileName}`);
      }
    } catch (e) {
      console.warn('[resetKnowledgeDatabase] Pre-reset backup warning (proceeding to clean reset):', e);
    }
  }

  // 1단계: 기존 DB가 열려있거나 존재하면 모든 테이블의 레코드를 원자적으로 완전 삭제 (Windows EBUSY 대비)
  try {
    const db = initKnowledgeDatabase(dbPath);
    if (db) {
      db.exec(`
        BEGIN TRANSACTION;
        DELETE FROM document_chunks_fts;
        DELETE FROM document_tags;
        DELETE FROM document_chunks;
        DELETE FROM knowledge_documents;
        DELETE FROM knowledge_jobs;
        DELETE FROM knowledge_collections;
        COMMIT;
      `);
      try {
        db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
        db.exec('VACUUM;');
      } catch (checkpointErr) {
        console.warn('[resetKnowledgeDatabase] checkpoint/vacuum warning:', checkpointErr);
      }
    }
  } catch (cleanErr) {
    console.warn('[resetKnowledgeDatabase] table clean error:', cleanErr);
  }

  // 2단계: 캐시 풀 및 핸들 닫기
  closeKnowledgeDatabase(dbPath);

  // 3단계: 파일 언링크 시도 (잠금이 풀려있다면 완전 신규 파일로 재생성)
  if (fs) {
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath); } catch (e) { console.info('[resetKnowledgeDatabase] db locked on unlink (safe, cleaned by SQL):', (e as any)?.code || e); }
    }
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch {}
    }
  }

  // 4단계: 깨끗한 6대 테이블 및 FTS5 스키마 신규 재초기화
  initKnowledgeDatabase(dbPath);

  return backupInfo;
}

export interface KnowledgeBackupInfo {
  fileName: string;
  filePath: string;
  size: number;
  createdAt: string;
  reason?: string;
  docCount?: number;
  docTitles?: string[];
}

/**
 * backups_manifest.json 파일에서 각 백업의 사유(reason) 및 메타데이터를 로드합니다.
 */
function getBackupsManifest(safeFolder: string): Record<string, { reason: string; docCount: number; docTitles: string[]; createdAt?: string }> {
  const { fs, path } = getNodeModules();
  if (!fs || !path) return {};
  const manifestPath = path.join(safeFolder, 'db', 'backups', 'backups_manifest.json');
  if (!fs.existsSync(manifestPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * backups_manifest.json 파일에 백업 메타데이터를 저장합니다.
 */
function saveBackupsManifest(safeFolder: string, manifest: Record<string, any>): void {
  const { fs, path } = getNodeModules();
  if (!fs || !path) return;
  const backupDir = path.join(safeFolder, 'db', 'backups');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch {}
  }
  const manifestPath = path.join(backupDir, 'backups_manifest.json');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[saveBackupsManifest] Failed to write manifest:', e);
  }
}

/**
 * 지식 데이터베이스의 현재 상태를 백업 파일로 저장합니다.
 * 사용자가 입력한 백업 사유(reason)와 당시 등록된 문서 건수 및 대표 제목을 함께 기록합니다.
 */
export function backupKnowledgeDatabase(resourceFolder: string, reason?: string): KnowledgeBackupInfo {
  const { fs, path } = getNodeModules();
  if (!fs || !path) {
    throw new Error('FILESYSTEM_NOT_AVAILABLE: 파일 시스템 모듈을 사용할 수 없습니다.');
  }

  const safeFolder = resolveSafeResourceFolder(resourceFolder);
  const backupDir = path.join(safeFolder, 'db', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dbPath = getResourceKnowledgeDbPath(resourceFolder, true);
  let docCount = 0;
  let docTitles: string[] = [];
  let backupDone = false;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let fileName = `knowledge_backup_${timestamp}.db`;
  let backupPath = path.join(backupDir, fileName);
  if (fs.existsSync(backupPath)) {
    fileName = `knowledge_backup_${timestamp}_${now.getMilliseconds().toString().padStart(3, '0')}.db`;
    backupPath = path.join(backupDir, fileName);
  }

  try {
    const db = initKnowledgeDatabase(dbPath);

    // 1. 현재 DB의 등록 문서 통계 및 대표 제목 조회
    try {
      const countRow = db.prepare('SELECT count(*) as c FROM knowledge_documents').get();
      docCount = Number(countRow?.c || 0);
      const titleRows = db.prepare('SELECT title FROM knowledge_documents ORDER BY modified_at DESC LIMIT 3').all() as any[];
      docTitles = titleRows.map((r: any) => r.title).filter(Boolean);
    } catch {}

    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      console.warn('[backupKnowledgeDatabase] wal_checkpoint warning:', e);
    }

    try {
      const cleanBackupPath = backupPath.replace(/\\/g, '/');
      db.exec(`VACUUM INTO '${cleanBackupPath}';`);
      backupDone = true;
    } catch (vacErr) {
      console.warn('[backupKnowledgeDatabase] VACUUM INTO warning, fallback to checkpoint copy:', vacErr);
    }
  } catch (dbErr: any) {
    console.warn('[backupKnowledgeDatabase] DB open failed during backup, fallback to direct file copy:', dbErr?.message);
    if (!fs.existsSync(dbPath)) {
      throw dbErr;
    }
  }

  if (!backupDone) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`DB_NOT_FOUND: 백업 대상 원본 DB 파일이 존재하지 않습니다: ${dbPath}`);
    }
    fs.copyFileSync(dbPath, backupPath);
  }
  const stats = fs.statSync(backupPath);

  // 백업 파일 생성 직후 혹시 모를 임시 -wal/-shm 소제
  for (const ext of ['-wal', '-shm']) {
    const extra = backupPath + ext;
    if (fs.existsSync(extra)) {
      try { fs.unlinkSync(extra); } catch {}
    }
  }

  const effectiveReason = reason && reason.trim()
    ? reason.trim()
    : (docCount > 0 ? `등록 문서 ${docCount}건 보관 시점` : '초기 빈 지식 데이터베이스 백업');

  // 메타데이터 매니페스트(backups_manifest.json)에 사유 및 문서 정보 실시간 기록
  try {
    const manifest = getBackupsManifest(safeFolder);
    manifest[fileName] = {
      reason: effectiveReason,
      docCount,
      docTitles,
      createdAt: now.toISOString(),
    };
    saveBackupsManifest(safeFolder, manifest);
  } catch (mErr) {
    console.warn('[backupKnowledgeDatabase] manifest save warning:', mErr);
  }

  return {
    fileName,
    filePath: backupPath,
    size: stats.size,
    createdAt: now.toISOString(),
    reason: effectiveReason,
    docCount,
    docTitles,
  };
}

/**
 * 저장된 지식 데이터베이스 백업 목록을 조회합니다 (최신순 정렬).
 * 각 백업 파일의 사유(reason), 문서 수, 대표 제목 메타데이터를 매니페스트에서 결합 반환합니다.
 */
export function listKnowledgeBackups(resourceFolder: string): KnowledgeBackupInfo[] {
  const { fs, path, DatabaseSync } = getNodeModules();
  if (!fs || !path) return [];

  const safeFolder = resolveSafeResourceFolder(resourceFolder);
  const backupDir = path.join(safeFolder, 'db', 'backups');
  if (!fs.existsSync(backupDir)) return [];

  try {
    const files = fs.readdirSync(backupDir);

    // backups 폴더 오염 방어: 모든 -wal, -shm 및 비정상 upload_restore_* / .temp_* 찌꺼기 파일 자동 소제
    for (const f of files) {
      if (f.endsWith('-wal') || f.endsWith('-shm')) {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
      } else if (f.startsWith('upload_restore_') || (f.startsWith('.') && f !== 'backups_manifest.json')) {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
      }
    }

    const manifest = getBackupsManifest(safeFolder);
    let manifestDirty = false;

    const cleanedFiles = fs.readdirSync(backupDir);
    const dbFiles = cleanedFiles.filter((f: string) => f.endsWith('.db') && !f.startsWith('.'));

    const results: KnowledgeBackupInfo[] = dbFiles.map((f: string) => {
      const fullPath = path.join(backupDir, f);
      const stat = fs.statSync(fullPath);
      const meta = manifest[f];

      let reason = meta?.reason;
      let docCount = meta?.docCount;
      let docTitles = meta?.docTitles;

      // 매니페스트에 정보가 없는 레거시 백업 파일의 경우 1회 자동 검사하여 사유/문서수 백필
      if (!meta && DatabaseSync) {
        try {
          const inspectDb = new DatabaseSync(fullPath, { readOnly: true });
          inspectDb.exec('PRAGMA busy_timeout = 3000;');
          const countRow = inspectDb.prepare('SELECT count(*) as c FROM knowledge_documents').get();
          docCount = Number(countRow?.c || 0);
          const titleRows = inspectDb.prepare('SELECT title FROM knowledge_documents ORDER BY modified_at DESC LIMIT 3').all() as any[];
          docTitles = titleRows.map((r: any) => r.title).filter(Boolean);
          inspectDb.close();

          reason = docCount > 0 ? `등록 문서 ${docCount}건 보관 시점` : '초기 빈 데이터베이스 백업';
          manifest[f] = {
            reason,
            docCount,
            docTitles,
            createdAt: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
          };
          manifestDirty = true;
        } catch {
          reason = '지식 데이터베이스 백업';
          docCount = 0;
          docTitles = [];
        }
      }

      return {
        fileName: f,
        filePath: fullPath,
        size: stat.size,
        createdAt: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
        reason: reason || '지식 데이터베이스 백업',
        docCount: docCount ?? 0,
        docTitles: docTitles || [],
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (manifestDirty) {
      saveBackupsManifest(safeFolder, manifest);
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * 지정된 백업 파일로부터 지식 데이터베이스를 안전하게 원복(Restore)합니다.
 * 복원 직전 현재 DB의 자동 스냅샷을 생성하여 만일의 사태에 대비하며, 원복 사유를 함께 기록합니다.
 */
export function restoreKnowledgeDatabase(resourceFolder: string, sourceBackupPath: string, reason?: string): KnowledgeBackupInfo | null {
  const { fs, DatabaseSync, path } = getNodeModules();
  if (!fs || !DatabaseSync || !path) {
    throw new Error('FILESYSTEM_NOT_AVAILABLE: 파일 시스템 또는 SQLite를 사용할 수 없습니다.');
  }

  if (!fs.existsSync(sourceBackupPath)) {
    throw new Error('BACKUP_FILE_NOT_FOUND: 복원 대상 백업 파일을 찾을 수 없습니다.');
  }

  // 원복 대상 파일이 유효한 SQLite 지식 DB인지 사전 검증
  let testDb: any = null;
  try {
    testDb = new DatabaseSync(sourceBackupPath, { readOnly: true });
    testDb.exec('PRAGMA busy_timeout = 5000;');
    testDb.prepare('SELECT count(*) FROM knowledge_documents').get();
  } catch (e: any) {
    throw new Error(`INVALID_BACKUP_FILE: 올바른 지식 데이터베이스 백업 파일이 아닙니다 (${e?.message || '검증 실패'}).`);
  } finally {
    if (testDb) {
      try { testDb.close(); } catch {}
    }
    // 검증 시 생성된 임시 -wal / -shm 파일 즉각 소제
    for (const ext of ['-wal', '-shm']) {
      const extra = sourceBackupPath + ext;
      if (fs.existsSync(extra)) {
        try { fs.unlinkSync(extra); } catch {}
      }
    }
  }

  const dbPath = getResourceKnowledgeDbPath(resourceFolder, true);
  let preRestoreBackup: KnowledgeBackupInfo | null = null;

  // 1. 현재 DB가 존재할 경우 사전 안전 스냅샷 자동 생성 (현재 활성 DB 백업)
  if (fs.existsSync(dbPath)) {
    try {
      const stat = fs.statSync(dbPath);
      if (stat.size > 100) {
        const defaultReason = reason && reason.trim()
          ? reason.trim()
          : `[원복 직전 자동 백업] ${path.basename(sourceBackupPath)} 시점으로 원복 전 스냅샷`;
        preRestoreBackup = backupKnowledgeDatabase(resourceFolder, defaultReason);
        console.info(`[restoreKnowledgeDatabase] Pre-restore snapshot created: ${preRestoreBackup.fileName} (사유: ${defaultReason})`);
      }
    } catch (e) {
      console.warn('[restoreKnowledgeDatabase] Pre-restore snapshot skipped:', e);
    }
  }

  // 2. 기존 DB 연결 완전 해제 (journal_mode=DELETE 전환으로 WAL/SHM 즉각 정리)
  closeKnowledgeDatabase(dbPath);

  // 3. 기존 WAL/SHM 임시 파일 삭제
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) try { fs.unlinkSync(walPath); } catch {}
  if (fs.existsSync(shmPath)) try { fs.unlinkSync(shmPath); } catch {}

  // 4. 백업 파일로 교체 덮어쓰기 (외부 DB 또는 선택 백업 DB로 현재 DB 1:1 대체)
  try {
    fs.copyFileSync(sourceBackupPath, dbPath);
  } catch (copyErr: any) {
    if (copyErr?.code === 'EBUSY') {
      throw new Error('DATABASE_LOCKED: 데이터베이스 파일(onrivi_knowledge.db)이 외부 프로그램(DB Browser for SQLite 등)에서 열려 있어 복원할 수 없습니다. 열려 있는 DB 뷰어 프로그램을 닫은 후 다시 시도해 주세요.');
    }
    throw copyErr;
  }

  // 덮어쓴 후 남아있을 수 있는 잔여 WAL/SHM 즉시 소제
  if (fs.existsSync(walPath)) try { fs.unlinkSync(walPath); } catch {}
  if (fs.existsSync(shmPath)) try { fs.unlinkSync(shmPath); } catch {}

  // 5. 복원된 데이터베이스 인스턴스 재연결 및 검증
  try {
    initKnowledgeDatabase(dbPath);
  } catch (initErr: any) {
    if (initErr?.message?.includes('locked') || initErr?.code === 'ERR_SQLITE_ERROR') {
      throw new Error('DATABASE_LOCKED: 데이터베이스 파일이 외부 프로그램(DB Browser for SQLite 등)에 의해 잠겨 있습니다. 외부 프로그램을 닫은 후 다시 시도해 주세요.');
    }
    throw initErr;
  }

  return preRestoreBackup;
}

/**
 * 백업 파일을 삭제하고 매니페스트에서도 함께 제거합니다.
 */
export function deleteKnowledgeBackup(resourceFolder: string, fileName: string): void {
  const { fs, path } = getNodeModules();
  if (!fs || !path) throw new Error('FILESYSTEM_NOT_AVAILABLE');

  const safeFolder = resolveSafeResourceFolder(resourceFolder);
  const cleanName = path.basename(fileName);
  const backupPath = path.join(safeFolder, 'db', 'backups', cleanName);

  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }

  // 매니페스트에서 메타데이터 정리
  try {
    const manifest = getBackupsManifest(safeFolder);
    if (manifest[cleanName]) {
      delete manifest[cleanName];
      saveBackupsManifest(safeFolder, manifest);
    }
  } catch {}
}




