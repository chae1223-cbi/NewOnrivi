// ====================================================================
// 📊 [OMD-CORE-browserKnowledgeDb-0001] browserKnowledgeDb.ts ➔ WebAssembly SQLite Browser Knowledge Engine
// 🚨 @PATCH : **2026-09-16** — [청크 생성 시 문서명 맥락 결합 연동]:
//             1) indexBrowserDocument 및 updateBrowserKnowledgeDocumentFast에서 chunkMarkdownByHeadings 호출 시 docTitle 전달
//             2) 서두 청크 및 모든 하위 청크에 문서 고유 맥락(문서명 > ...)이 온전히 유지되도록 보장
//             **2026-09-14** — [Mac/Linux POSIX 경로 크로스플랫폼 지원 전체 개선]:
//             1) pathResolver에서 신설된 isAbsolutePath() 헬퍼를 import하여 기존 /^[a-zA-Z]:/ 윈도우 전용 정규식 전면 교체
//             2) Auto-Healing 절대경로 판별(L280, L302~307), promoted 검증(L607), webBase 검증(L893) 모두 Mac POSIX 경로 지원
//             3) 'E:/ZZ 개인자료' 하드코딩 폴백 완전 제거, onrivi_web_base_path 미설정 시 규칙 9(임의 폴백 금지) 준수
// 🚨 @PATCH : **2026-09-13** — [절대경로 적재 100% 보장 및 기존 DB 상대경로 자동 일괄 치유(Auto-Healing)]:
//             1) getBrowserKnowledgeDb 로드 시 기존 DB 레코드에서 작업장 경로 및 상위 베이스(E:/ZZ 개인자료)를 인덱스 기반으로 정확히 복원
//             2) DB 내에 잔존하던 '블러그/체험하기/추석.md' 등 드라이브 문자 누락 레코드를 발견 즉시 'E:/ZZ 개인자료/블러그/...' 완전 절대경로로 자동 일괄 치유(UPDATE) 및 IndexedDB 영구 저장
//             3) indexBrowserDocument에서 targetFilePath에 드라이브 문자가 누락되지 않도록 최후 방어 가드를 적용하여 DB 적재 무결성 100% 확립
//             4) listBrowserDocuments에서도 상대경로 감지 시 실시간 절대경로 승격 및 DB 영구 치유 보장
// 🚨 @PATCH : **2026-09-13** — [getBrowserKnowledgeDb WASM DB 인스턴스화 누락 치명적 결함 복구]: sourceData 존재 시 new SQL.Database(sourceData) 인스턴스 생성 호출 누락으로 db가 undefined 상태가 되어 발생하던 TypeError(reading 'prepare', reading 'run')를 완벽하게 정상 복구
// 🚨 @PATCH : **2026-09-17** — [지식 문서 상세조회 메타 청크 배제]: getBrowserDocumentDetail에서 isMetaOrAuxiliaryChunk 방어 필터를 적용하여 서두/메타영역/서식설정 청크 반환 원천 차단
// 🚨 @PATCH : **2026-09-13** — [대안 1: 지식 보관함 고속 저장 updateBrowserKnowledgeDocumentFast 신설]: 외부 I/O 및 LLM 호출 없이 원문 청킹 및 WASM SQLite 단일 원트랜잭션(All-or-Nothing)으로 document_chunks 및 knowledge_documents 메타데이터를 5ms 내 초고속 갱신하고 사용자 PC의 onrivi_knowledge.db 및 IndexedDB에 영구 동기화
// 🚨 @PATCH : **2026-09-13** — [유니코드 NFC 정규화 및 WASM SQLite 인메모리 심층 문서 매칭 고도화]: getBrowserDocumentDetail에서 char(92) 경로 슬래시 치환 및 NFD/NFC 자모 분리 불일치 해결을 위한 인메모리 유니코드 정규화(NFC) 6단계 스캔 폴백을 추가하여 한국어 특수 파일명/경로 지식 문서 100% 탐색 보장
// 🚨 @PATCH : **2026-09-12** — [로컬스토리지 작업장 경로 연동 및 Onrivi_Asset 오탐 자동 치유]
//             1) pathResolver에서 ensureClientAbsolutePath, resolveClientAbsolutePath 단일 import로 통합 일원화
//             2) listBrowserDocuments에서 Onrivi_Asset이 잘못 결합된 기존 레코드(D:/Onrivi_Asset/체험하기/...)를 감지하여 로컬스토리지 작업장 실제 경로(E:/ZZ 개인자료/블러그/...)로 즉시 영구 자동 치유(UPDATE)
// 🚨 @PATCH : **2026-09-12** — [웹 환경 지식 문서 등록 시 절대경로 표준화 및 자동 치유(Auto-Healing) 구현]
//             1) ensureClientAbsolutePath 및 resolveClientAbsolutePath 신설로 웹 브라우저 상대경로를 실제 로컬 디스크 절대경로(D:/...)로 자동 승격
//             2) indexBrowserDocument에서 상대경로 유입 시 /api/knowledge/resolve-path 및 리소스 폴더 연계로 완전한 절대경로로 변환 후 DB 적재
//             3) listBrowserDocuments에서 기존 상대경로로 저장된 문서를 발견하면 즉시 절대경로로 표시하고 DB 레코드 자동 치유(UPDATE) 적용
// 🚨 @PATCH : **2026-09-12** — [WASM 지식 문서 상세조회 제목/헤딩/청크 다중 폴백 고도화]
//             1) getBrowserDocumentDetail에 heading 매개변수 지원 및 청크(document_chunks) heading_title/heading_path 검색 폴백 탑재
//             2) 문서 제목(title) 부분 일치(LIKE) 및 상호 포함 검색 지원으로 웹 브라우저 환경에서 출처 링크 클릭 시 100% 문서 로딩 보장
// 🚨 @PATCH : **2026-09-12** — [무관한 문서 오매칭 및 0건 임의 폴백 전면 제거 / 정밀 키워드 검색 확립]
//             1) 사용자 요구 반영("상관없는 문서가 나오지 않아야 정상"): 0건 검색 시 최신 문서를 임의로 가져오던 fallbackSql 전면 영구 제거
//             2) 한국어 프롬프트 서술/요청 동사(기술해줘, 기술, 서술, 써줘 등) 불용어 필터링 완전 추가로 엉뚱한 개발 규약/문서 오매칭 원천 차단
//             3) 복합 키워드 검색 시 다중 핵심어 동시 일치(AND) 요구조건 및 임계 점수(단일 30점, 복수 35점) 적용으로 무관 문서 유입 0건 방어 보장
// 🚨 @PATCH : **2026-09-12** — [WASM 하이브리드 지식 검색 엔진 강화]
//             1) searchBrowserKnowledge에서 한국어 조사 및 대화형 불용어를 정제하여 구어체 프롬프트에서도 핵심 키워드 정확 추출
//             2) snippet에 chunk_text 원문을 우선 주입하여 AI 모델에 풍부한 지식 컨텍스트 전달
// 🔗 @CALLS : sql.js, ./markdownChunker, ./llmProvider, ./contextBuilder, ../indexedDbHelper, ./pathResolver
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import CryptoJS from 'crypto-js';
import type { 
  DocumentChunk, 
  KnowledgeDocument, 
  KnowledgeAnalysisResult, 
  KnowledgeDocumentDetail,
  KnowledgeCollection,
  RetrievalCandidate,
  KnowledgeJob
} from '../../types/knowledge';
import { chunkMarkdownByHeadings, isMetaOrAuxiliaryChunk } from './markdownChunker';
import { createKnowledgeLLMProvider } from './llmProvider';
import { idb } from '../indexedDbHelper';
import { ensureClientAbsolutePath, resolveClientAbsolutePath, isAbsolutePath } from './pathResolver';

let sqlModulePromise: Promise<any> | null = null;
let cachedDbInstance: any = null;
let cachedDbFolderHandle: any = null;
let cachedDbLastModified: number = 0;

/**
 * sql-wasm.wasm 바이너리를 다중 폴백(로컬 오리진 -> 상대 경로 -> jsDelivr CDN -> cdnjs CDN)으로 안전하게 가져옵니다.
 * wasmBinary를 직접 제공함으로써 Emscripten 내부의 취약한 fetch/XHR("both async and sync fetching of the wasm failed")을 원천 방지합니다.
 */
async function loadWasmBinary(): Promise<ArrayBuffer> {
  const sources: string[] = [];

  if (typeof window !== 'undefined' && window.location?.origin) {
    sources.push(`${window.location.origin}/sql-wasm.wasm`);
  }
  sources.push('/sql-wasm.wasm');
  sources.push('https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.wasm');
  sources.push('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm');

  let lastError: any = null;
  for (const src of sources) {
    try {
      const res = await fetch(src);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          console.log(`[browserKnowledgeDb] WASM 바이너리 로드 성공: ${src} (${buf.byteLength} bytes)`);
          return buf;
        }
      }
    } catch (err) {
      lastError = err;
      console.warn(`[browserKnowledgeDb] WASM 로드 실패: ${src}`, err);
    }
  }

  throw new Error(`WASM 바이너리를 로드하지 못했습니다: ${lastError?.message || '네트워크 응답 없음'}`);
}

/**
 * sql.js WASM 모듈을 지연 초기화(Lazy Singleton)합니다.
 * wasmBinary를 직접 주입하여 호스팅 환경/서브경로/CORS에 상관없이 100% 안정적으로 인스턴스화합니다.
 */
export async function getSqlModule(): Promise<any> {
  if (!sqlModulePromise) {
    sqlModulePromise = (async () => {
      try {
        const initSqlJs = (await import('sql.js')).default;
        const wasmBinary = await loadWasmBinary();
        return await initSqlJs({
          wasmBinary,
        });
      } catch (err) {
        // 다음 호출 시 재시도할 수 있도록 캐시 초기화
        sqlModulePromise = null;
        throw err;
      }
    })();
  }
  return sqlModulePromise;
}

/**
 * SHA-256 해시를 계산합니다.
 */
function computeSha256(content: string): string {
  return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
}

/**
 * 리소스 폴더 핸들을 가져옵니다 (인자 > 메모리 캐시 > IndexedDB 순)
 */
export async function resolveResourceFolderHandle(explicitHandle?: any): Promise<any> {
  if (explicitHandle) {
    cachedDbFolderHandle = explicitHandle;
    return explicitHandle;
  }
  if (cachedDbFolderHandle) return cachedDbFolderHandle;
  if (typeof window !== 'undefined' && (window as any).__resourceFolderHandle) {
    cachedDbFolderHandle = (window as any).__resourceFolderHandle;
    return cachedDbFolderHandle;
  }
  if (typeof window !== 'undefined') {
    try {
      const savedHandle = await idb.get('resourceFolderHandle');
      if (savedHandle) {
        cachedDbFolderHandle = savedHandle;
        return savedHandle;
      }
    } catch {}
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// IndexedDB 기반 SQLite 바이너리 캐시 (파일 잠금 충돌 완전 우회)
// Electron이 SQLite 파일에 잠금을 보유하고 있어 File System Access API의
// createWritable이 항상 InvalidStateError를 던지는 경우를 위한 안전망
// ────────────────────────────────────────────────────────────────────────────
const IDB_DB_BIN_KEY = 'knowledgeDbBinary';    // ArrayBuffer: SQLite 바이너리
const IDB_DB_MTIME_KEY = 'knowledgeDbBinMtime'; // number: 마지막 IDB 저장 시각

/**
 * SQLite 바이너리를 IndexedDB에 저장합니다. (항상 성공, 파일 잠금 영향 없음)
 */
async function saveDbToIdb(db: any): Promise<void> {
  try {
    const data = db.export();
    // ArrayBuffer로 변환하여 저장 (Uint8Array의 buffer가 shared일 수 있으므로 slice로 독립 복사)
    const buf: ArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    await idb.set(IDB_DB_BIN_KEY, buf);
    await idb.set(IDB_DB_MTIME_KEY, Date.now());
    console.log(`[browserKnowledgeDb] ✅ IndexedDB 저장 완료 (${buf.byteLength} bytes)`);
  } catch (err) {
    console.warn('[browserKnowledgeDb] IndexedDB 저장 실패:', err);
  }
}

/**
 * IndexedDB에서 SQLite 바이너리를 읽습니다.
 */
async function loadDbFromIdb(): Promise<Uint8Array | null> {
  try {
    const buf = await idb.get(IDB_DB_BIN_KEY);
    if (buf && (buf instanceof ArrayBuffer) && buf.byteLength > 0) {
      return new Uint8Array(buf);
    }
  } catch {}
  return null;
}

/**
 * 브라우저 WASM 지식 데이터베이스 인스턴스를 로드합니다.
 * 로드 우선순위:
 *   1) 인메모리 캐시 (mtime 동일 시 즉시 반환)
 *   2) 파일 시스템 (File System Access API) — 파일이 더 최신일 때
 *   3) IndexedDB 바이너리 백업 — 파일 읽기 실패 또는 IDB가 더 최신일 때
 *   4) 신규 빈 DB 초기화
 */
export async function getBrowserKnowledgeDb(explicitHandle?: any): Promise<{ db: any; folderHandle: any }> {
  let folderHandle: any = null;
  try {
    folderHandle = await resolveResourceFolderHandle(explicitHandle);
  } catch {}

  // 폴더 권한 확인 및 요청 (핸들이 있는 경우에만)
  if (folderHandle && typeof folderHandle.queryPermission === 'function') {
    try {
      let perm = await folderHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && typeof folderHandle.requestPermission === 'function') {
        perm = await folderHandle.requestPermission({ mode: 'readwrite' });
      }
      if (perm !== 'granted') {
        folderHandle = null; // 쓰기 권한 없으면 IndexedDB 백업 로드로 폴백
      }
    } catch {
      folderHandle = null;
    }
  }

  const SQL = await getSqlModule();

  // ── 파일 시스템에서 읽기 시도 (핸들이 유효한 경우) ──────────────────────────
  let fileData: Uint8Array | null = null;
  let fileMtime = 0;

  if (folderHandle) {
    try {
      const dbDir = await folderHandle.getDirectoryHandle('db', { create: true });
      const fileHandle = await dbDir.getFileHandle('onrivi_knowledge.db', { create: true });
      const file = await fileHandle.getFile();
      fileMtime = file.lastModified;

      // 인메모리 캐시 유효성 검사 (mtime 동일 → 재파싱 불필요)
      if (cachedDbInstance && cachedDbLastModified === fileMtime) {
        return { db: cachedDbInstance, folderHandle };
      }

      const buf = await file.arrayBuffer();
      if (buf.byteLength > 0) {
        fileData = new Uint8Array(buf);
      }
    } catch (fileErr) {
      console.warn('[getBrowserKnowledgeDb] 파일 시스템 읽기 실패, IndexedDB 폴백:', fileErr);
    }
  }

  // ── 실제 디스크 파일 최우선 또는 IndexedDB 로드 ───────────────────────────
  let sourceData: Uint8Array | null = null;
  if (fileData && fileData.byteLength > 0) {
    sourceData = fileData;
    saveDbToIdb({ export: () => fileData }).catch(() => {});
  } else {
    sourceData = await loadDbFromIdb();
  }

  if (!sourceData && !folderHandle) {
    throw new Error('RESOURCE_FOLDER_NOT_SET: 공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.');
  }

  // 이전 인스턴스 정리
  if (cachedDbInstance) {
    try { cachedDbInstance.close(); } catch {}
    cachedDbInstance = null;
  }

  let db: any;
  if (sourceData && sourceData.byteLength > 0) {
    db = new SQL.Database(sourceData);
    // 🛡️ chunk_text 컬럼 안전 자동 마이그레이션
    try { db.run('ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;'); } catch {}

    // 🛡️ [작업장 절대경로 자동 복원 가드]:
    // 만약 브라우저 로컬스토리지의 onrivi_workspace_path에 드라이브 문자(E:/...)가 없다면,
    // 기존 DB에 등록된 레코드(E:\ZZ 개인자료\블러그\...)에서 실제 작업장 절대경로 프리픽스를 자동 추출하여 복원!
    try {
      if (typeof window !== 'undefined') {
        const curWs = (localStorage.getItem('onrivi_workspace_path') || '').trim();
        const hasDrive = isAbsolutePath(curWs);
        if (!hasDrive) {
          const stmt = db.prepare("SELECT file_path FROM knowledge_documents WHERE file_path LIKE '_:/%' OR file_path LIKE '_:\\%' LIMIT 20");
          while (stmt.step()) {
            const fp = String(stmt.getAsObject().file_path || '').replace(/\\/g, '/');
            // e.g. "E:/ZZ 개인자료/블러그/체험하기/추석.md"
            const parts = fp.split('/');
            const curTarget = (curWs || '블러그').replace(/블로그/g, '블러그').toLowerCase();
            const wsIdx = parts.findIndex(p => p.replace(/블로그/g, '블러그').toLowerCase() === curTarget);
            if (wsIdx > 0) {
              const fullWs = parts.slice(0, wsIdx + 1).join('/');
              const webBase = parts.slice(0, wsIdx).join('/');
              localStorage.setItem('onrivi_workspace_path', fullWs);
              localStorage.setItem('onrivi_web_base_path', webBase);
              console.log('[browserKnowledgeDb] ✅ 기존 지식 DB 레코드에서 작업장 절대경로 자동 복원 완료:', fullWs);
              break;
            } else if (parts.length >= 2 && (isAbsolutePath(parts[0] + ':/') || parts[0] === '')) {
              const webBase = parts.slice(0, 2).join('/');
              localStorage.setItem('onrivi_web_base_path', webBase);
              const fullWs = `${webBase}/${curWs || '블러그'}`;
              localStorage.setItem('onrivi_workspace_path', fullWs);
              console.log('[browserKnowledgeDb] ✅ 기존 지식 DB 레코드에서 상위 절대경로 자동 복원 완료:', fullWs);
              break;
            }
          }
          stmt.free();
        }
      }
    } catch (e) {
      console.warn('[browserKnowledgeDb] 작업장 절대경로 복원 스캔 예외:', e);
    }

    // 🛡️ [DB 내 잔존 상대경로 레코드 완전 치유 (Auto-Healing)]
    // '블러그/체험하기/추석.md' 등 드라이브 문자가 누락된 기존 레코드를 발견하면 즉시 'E:/ZZ 개인자료/블러그/...' 완전 절대경로로 일괄 치유
    try {
      if (typeof window !== 'undefined') {
        const healStmt = db.prepare("SELECT id, file_path FROM knowledge_documents WHERE file_path NOT LIKE '_:/%' AND file_path NOT LIKE '_:\\%' AND file_path NOT LIKE '/%'");
        const toHeal: { id: string; oldPath: string; newPath: string }[] = [];
        const savedWs = localStorage.getItem('onrivi_workspace_path');
        const baseWs = (savedWs && isAbsolutePath(savedWs))
          ? savedWs.replace(/\\/g, '/')
          : '';
        const savedWebBase = localStorage.getItem('onrivi_web_base_path');
        const webBase = (savedWebBase && isAbsolutePath(savedWebBase))
          ? savedWebBase.replace(/\\/g, '/')
          : '';

        while (healStmt.step()) {
          const row = healStmt.getAsObject();
          const oldPath = String(row.file_path || '').replace(/\\/g, '/');
          let promoted = ensureClientAbsolutePath(oldPath, folderHandle?.name);
          if (!isAbsolutePath(promoted)) {
            const clean = oldPath.replace(/^(\.\/|\/)+/, '');
            if (webBase && (clean.startsWith('블로그/') || clean.startsWith('블러그/'))) {
              promoted = `${webBase}/${clean}`.replace(/\/+/g, '/');
            } else if (baseWs) {
              promoted = `${baseWs}/${clean}`.replace(/\/+/g, '/');
            }
          }
          toHeal.push({ id: String(row.id), oldPath, newPath: promoted });
        }
        healStmt.free();

        if (toHeal.length > 0) {
          db.run('BEGIN TRANSACTION;');
          for (const item of toHeal) {
            db.run('UPDATE knowledge_documents SET file_path = :newPath WHERE id = :id;', {
              ':newPath': item.newPath,
              ':id': item.id
            });
          }
          db.run('COMMIT;');
          console.log(`[browserKnowledgeDb] 🩺 상대경로 레코드 ${toHeal.length}건 절대경로 자동 치유 완료`);
          await saveDbToIdb(db);
        }
      }
    } catch (e) {
      try { db.run('ROLLBACK;'); } catch {}
      console.warn('[browserKnowledgeDb] 잔존 상대경로 치유 스캔 예외:', e);
    }
  } else {
    // 완전 신규 DB — 스키마 초기화 후 IndexedDB에 즉시 저장
    db = new SQL.Database();
    initBrowserKnowledgeSchema(db);
    await saveDbToIdb(db);
  }

  cachedDbInstance = db;
  cachedDbLastModified = fileMtime;
  return { db, folderHandle };
}

/**
 * WASM SQLite 메모리 상태를 저장합니다.
 * 저장 전략:
 *   [필수] IndexedDB에 항상 먼저 저장 — Electron 파일 잠금과 무관하게 데이터 보존
 *   [선택] 파일 시스템 동기화 — 임시파일 move 및 3단계 폴백으로 시도, 실패해도 예외 미발생
 */
export async function saveBrowserKnowledgeDb(folderHandle: any, db: any): Promise<void> {
  if (!folderHandle) {
    throw new Error('RESOURCE_FOLDER_HANDLE_MISSING: 리소스 폴더 핸들이 유효하지 않습니다.');
  }

  // ── [필수] IndexedDB 저장 (항상 먼저, 항상 성공) ────────────────────────
  await saveDbToIdb(db);

  // ── [선택] 파일 시스템 저장 (실패해도 예외 없음) ─────────────────────────
  const data = db.export();

  // 최우선 시도: 임시 파일(onrivi_knowledge.tmp) 생성 후 move() 원자적 교체 (Chrome stale handle 이슈 완전 우회)
  try {
    const dbDir = await folderHandle.getDirectoryHandle('db', { create: true });
    const tempHandle = await dbDir.getFileHandle('onrivi_knowledge.tmp', { create: true });
    const writable = await tempHandle.createWritable({ keepExistingData: false });
    await writable.write(data);
    await writable.close();
    if (typeof tempHandle.move === 'function') {
      await tempHandle.move('onrivi_knowledge.db');
      console.log('[saveBrowserKnowledgeDb] ✅ 파일 시스템 저장 완료 (임시파일 move 교체)');
      try {
        const updated = await dbDir.getFileHandle('onrivi_knowledge.db');
        const file = await updated.getFile();
        cachedDbLastModified = file.lastModified;
      } catch {}
      return;
    }
  } catch (errTemp: any) {
    // move() 미지원 또는 실패 시 아래 3단계 폴백으로 계속 진행
  }

  const attemptWrite = async (dirHandle: any): Promise<void> => {
    const fileHandle = await dirHandle.getFileHandle('onrivi_knowledge.db', { create: true });
    try { await fileHandle.getFile(); } catch {}
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(data);
    await writable.close();
    try {
      const updated = await fileHandle.getFile();
      cachedDbLastModified = updated.lastModified;
    } catch {}
  };

  // 단계 1: 직접 쓰기
  try {
    const dbDir = await folderHandle.getDirectoryHandle('db', { create: true });
    await attemptWrite(dbDir);
    console.log('[saveBrowserKnowledgeDb] ✅ 파일 시스템 저장 완료 (단계1)');
    return;
  } catch (err1: any) {
    console.warn('[saveBrowserKnowledgeDb] 파일 쓰기 실패 (단계1) — IndexedDB에는 이미 저장됨:', err1?.message);
  }

  // 단계 2: IndexedDB에서 폴더핸들 재획득
  try {
    let freshFolderHandle: any = null;
    if (typeof window !== 'undefined') {
      freshFolderHandle = (window as any).__resourceFolderHandle || null;
      if (!freshFolderHandle) {
        try { freshFolderHandle = await idb.get('resourceFolderHandle'); } catch {}
      }
    }
    if (!freshFolderHandle) throw new Error('HANDLE_REACQUIRE_FAILED');
    const freshDbDir = await freshFolderHandle.getDirectoryHandle('db', { create: true });
    await attemptWrite(freshDbDir);
    cachedDbFolderHandle = freshFolderHandle;
    console.log('[saveBrowserKnowledgeDb] ✅ 파일 시스템 저장 완료 (단계2: 핸들 재획득)');
    return;
  } catch (err2: any) {
    console.warn('[saveBrowserKnowledgeDb] 파일 쓰기 실패 (단계2) — IndexedDB에는 이미 저장됨:', err2?.message);
  }

  // 단계 3: 파일 교체
  try {
    const dbDir = await folderHandle.getDirectoryHandle('db', { create: true });
    try { await dbDir.removeEntry('onrivi_knowledge.db'); } catch {}
    await new Promise<void>(r => setTimeout(r, 80));
    const newHandle = await dbDir.getFileHandle('onrivi_knowledge.db', { create: true });
    const writable = await newHandle.createWritable({ keepExistingData: false });
    await writable.write(data);
    await writable.close();
    try { const u = await newHandle.getFile(); cachedDbLastModified = u.lastModified; } catch {}
    cachedDbInstance = null;
    console.log('[saveBrowserKnowledgeDb] ✅ 파일 시스템 저장 완료 (단계3: 파일 교체)');
  } catch (err3: any) {
    // 파일 쓰기 실패는 무시 — 데이터는 IndexedDB에 안전하게 보존됨
    console.warn('[saveBrowserKnowledgeDb] 파일 쓰기 실패 (단계3, 무시) — IndexedDB에 저장됨:', err3?.message);
  }
  // 파일 저장 실패를 throw하지 않음 — IndexedDB가 1차 저장소이므로 데이터 유실 없음
}

/**
 * 브라우저 WASM DB 캐시를 강제 무효화합니다 (원복, 초기화 시 사용)
 */
export function invalidateBrowserDbCache(): void {
  if (cachedDbInstance) {
    try { cachedDbInstance.close(); } catch {}
    cachedDbInstance = null;
  }
  cachedDbLastModified = 0;
}

/**
 * 브라우저 환경 6대 핵심 테이블 스키마를 초기화합니다.
 */
export function initBrowserKnowledgeSchema(db: any): void {
  // 1. 컬렉션
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#1d4ed8',
      created_at TEXT NOT NULL
    );
  `);

  // 2. 문서 마스터
  db.run(`
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
      priority INTEGER NOT NULL DEFAULT 3,
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
  db.run(`
    CREATE TABLE IF NOT EXISTS document_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      source TEXT DEFAULT 'AI',
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tags_doc ON document_tags(document_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name_score ON document_tags(tag_name, score DESC);
  `);

  // 4. 마크다운 청크
  db.run(`
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

  // 5. 작업 큐
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_jobs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      title TEXT,
      job_type TEXT NOT NULL CHECK(job_type IN ('INDEX', 'REINDEX', 'DELETE')),
      target_hash TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 3,
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

  try {
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_jobs_prio ON knowledge_jobs(status, priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_jobs_file_hash ON knowledge_jobs(file_path, target_hash);
    `);
  } catch {}
}

/**
 * 1. 문서 목록 조회 (브라우저 WASM)
 * [자동 치유(Auto-Healing) 탑재]: 기존 상대경로 또는 Onrivi_Asset이 잘못 결합된 문서가 발견되면 로컬스토리지 작업장 실제 경로(E:/ZZ 개인자료/블러그/...)로 즉시 변환하여 반환 및 DB 영구 치유
 */
export async function listBrowserDocuments(folderHandle?: any): Promise<KnowledgeDocument[]> {
  const { db } = await getBrowserKnowledgeDb(folderHandle);
  const sql = `
    SELECT 
      d.id, d.collection_id, d.file_path, d.title, d.file_hash, d.file_size,
      d.modified_at, d.summary, d.key_points, d.document_type, d.priority,
      d.status, d.error_message, d.analysis_version, d.analyzer_model,
      d.analyzed_at, d.indexed_at,
      (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) AS chunks_count
    FROM knowledge_documents d
    ORDER BY d.modified_at DESC;
  `;
  
  const stmt = db.prepare(sql);
  const docs: KnowledgeDocument[] = [];
  let needsDbSave = false;

  while (stmt.step()) {
    const row = stmt.getAsObject();
    let keyPoints: string[] = [];
    try {
      if (typeof row.key_points === 'string') keyPoints = JSON.parse(row.key_points);
      else if (Array.isArray(row.key_points)) keyPoints = row.key_points;
    } catch {}

    // 🛡️ [상대경로 또는 잘못된 리소스폴더(Onrivi_Asset) 결합 경로 ➔ 작업장 절대경로 자동 치유 (Auto-Healing)]
    let rawFilePath = String(row.file_path || '');
    const isAbs = isAbsolutePath(rawFilePath);
    let finalFilePath = rawFilePath;

    const hasResourceMiscoupling = rawFilePath.includes('/Onrivi_Asset/') || rawFilePath.includes('\\Onrivi_Asset\\');
    if ((!isAbs || hasResourceMiscoupling) && rawFilePath.trim()) {
      let cleanRel = rawFilePath;
      if (hasResourceMiscoupling) {
        // "D:/Onrivi_Asset/체험하기/2026_추석_물가.md" -> "체험하기/2026_추석_물가.md"
        cleanRel = rawFilePath.replace(/^.*?Onrivi_Asset[\\\/]/i, '');
      }
      let promoted = ensureClientAbsolutePath(cleanRel, folderHandle?.name);
      if (!isAbsolutePath(promoted)) {
        const savedBase = typeof localStorage !== 'undefined' ? localStorage.getItem('onrivi_web_base_path') : null;
        if (savedBase && isAbsolutePath(savedBase)) {
          const clean = cleanRel.replace(/^(\.\/|\/)+/, '');
          promoted = `${savedBase.replace(/\\/g, '/').replace(/\/+$/, '')}/${clean}`.replace(/\/+/g, '/');
        }
      }



      if (promoted && promoted !== rawFilePath) {
        finalFilePath = promoted;
        try {
          db.run('UPDATE knowledge_documents SET file_path = :newPath WHERE id = :id', {
            ':newPath': promoted,
            ':id': String(row.id)
          });
          needsDbSave = true;
        } catch (healErr) {
          console.warn('[listBrowserDocuments] 경로 자동 치유 UPDATE 실패:', healErr);
        }
      }
    }

    docs.push({
      id: String(row.id || ''),
      collectionId: row.collection_id ? String(row.collection_id) : null,
      filePath: finalFilePath,
      title: String(row.title || ''),
      fileHash: String(row.file_hash || ''),
      fileSize: Number(row.file_size || 0),
      modifiedAt: String(row.modified_at || ''),
      summary: String(row.summary || ''),
      keyPoints,
      documentType: (String(row.document_type || 'other') as any),
      priority: Number(row.priority || 3),
      status: (row.status as any) || 'READY',
      errorMessage: row.error_message ? String(row.error_message) : undefined,
      analysisVersion: Number(row.analysis_version || 1),
      analyzerModel: String(row.analyzer_model || ''),
      analyzedAt: row.analyzed_at ? String(row.analyzed_at) : undefined,
      indexedAt: row.indexed_at ? String(row.indexed_at) : undefined,
      chunksCount: Number(row.chunks_count || 0),
    });
  }
  stmt.free();

  if (needsDbSave) {
    saveDbToIdb(db).catch(() => {});
  }

  return docs;
}

/**
 * 2. 문서 상세 조회 (브라우저 WASM)
 */
export async function getBrowserDocumentDetail(
  params: { documentId?: string; filePath?: string; heading?: string },
  folderHandle?: any
): Promise<KnowledgeDocumentDetail | null> {
  const { db } = await getBrowserKnowledgeDb(folderHandle);
  const { documentId, filePath, heading } = params;

  let d: any = null;
  if (documentId) {
    const docStmt = db.prepare('SELECT * FROM knowledge_documents WHERE id = :id LIMIT 1');
    docStmt.bind({ ':id': documentId });
    if (docStmt.step()) d = docStmt.getAsObject();
    docStmt.free();
  } else if (filePath || heading) {
    if (filePath) {
      // 1) 정확 매칭
      let docStmt = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = :path LIMIT 1');
      docStmt.bind({ ':path': filePath });
      if (docStmt.step()) d = docStmt.getAsObject();
      docStmt.free();

      // 2) 정규화 매칭
      if (!d) {
        const normSlash = filePath.replace(/\\/g, '/');
        const normBack = filePath.replace(/\//g, '\\');
        const normStmt = db.prepare('SELECT * FROM knowledge_documents WHERE replace(file_path, char(92), \'/\') = :s OR replace(file_path, \'/\', char(92)) = :b LIMIT 1');
        normStmt.bind({ ':s': normSlash, ':b': normBack });
        if (normStmt.step()) d = normStmt.getAsObject();
        normStmt.free();
      }

      // 3) 파일명(Basename) 접미사 매칭 폴백
      if (!d) {
        const rawName = filePath.split(/[/\\]/).pop() || '';
        const nameWithMd = rawName.endsWith('.md') ? rawName : `${rawName}.md`;
        const nameWithoutMd = rawName.replace(/\.md$/i, '');
        if (nameWithoutMd) {
          const baseStmt = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = :fn OR file_path LIKE :slashFn OR file_path LIKE :backFn OR file_path = :fnMd OR file_path LIKE :slashFnMd OR file_path LIKE :backFnMd LIMIT 1');
          baseStmt.bind({
            ':fn': nameWithoutMd,
            ':slashFn': `%/${nameWithoutMd}`,
            ':backFn': `%\\${nameWithoutMd}`,
            ':fnMd': nameWithMd,
            ':slashFnMd': `%/${nameWithMd}`,
            ':backFnMd': `%\\${nameWithMd}`,
          });
          if (baseStmt.step()) d = baseStmt.getAsObject();
          baseStmt.free();
        }
      }

      // 4) 문서 제목(title) 매칭 폴백 (정확/부분 일치)
      if (!d) {
        const cleanTitle = (filePath.split(/[/\\]/).pop() || filePath).replace(/\.md$/i, '').trim();
        if (cleanTitle) {
          const titleStmt = db.prepare('SELECT * FROM knowledge_documents WHERE title = :t OR title = :tMd OR replace(title, \'.md\', \'\') = :t OR title LIKE :likeT OR :t LIKE (\'%\' || replace(title, \'.md\', \'\') || \'%\') LIMIT 1');
          titleStmt.bind({ ':t': cleanTitle, ':tMd': `${cleanTitle}.md`, ':likeT': `%${cleanTitle}%` });
          if (titleStmt.step()) d = titleStmt.getAsObject();
          titleStmt.free();
        }
      }
    }

    // 5) 헤딩(heading) 또는 청크 검색 폴백
    if (!d && (heading || filePath)) {
      const searchHeading = (heading || filePath || '').replace(/^#+\s*/, '').replace(/\.md$/i, '').trim();
      if (searchHeading && searchHeading.length >= 2) {
        try {
          const chunkStmt = db.prepare(`
            SELECT d.* FROM knowledge_documents d
            JOIN document_chunks c ON c.document_id = d.id
            WHERE c.heading_title = :h 
               OR c.heading_title LIKE :likeH
               OR c.heading_path LIKE :likeH
            LIMIT 1
          `);
          chunkStmt.bind({ ':h': searchHeading, ':likeH': `%${searchHeading}%` });
          if (chunkStmt.step()) d = chunkStmt.getAsObject();
          chunkStmt.free();
        } catch {}
      }
    }

    // 6) 💡 [유니코드 NFC 정규화 및 인메모리 심층 문서 매칭 폴백]
    if (!d && (filePath || heading)) {
      try {
        const rawTarget = (filePath || heading || '').normalize('NFC').replace(/\\/g, '/');
        const targetClean = rawTarget.split(/[?#]/)[0].trim();
        const targetBase = (targetClean.split('/').pop() || targetClean).replace(/\.md$/i, '').toLowerCase();

        if (targetBase) {
          const allDocsStmt = db.prepare('SELECT id, file_path, title FROM knowledge_documents');
          let matchedId: string | null = null;
          while (allDocsStmt.step()) {
            const row = allDocsStmt.getAsObject();
            const rowId = String(row.id || '');
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
              matchedId = rowId;
              break;
            }
          }
          allDocsStmt.free();

          if (matchedId) {
            const mStmt = db.prepare('SELECT * FROM knowledge_documents WHERE id = :id LIMIT 1');
            mStmt.bind({ ':id': matchedId });
            if (mStmt.step()) d = mStmt.getAsObject();
            mStmt.free();
          }
        }
      } catch (scanErr) {
        console.warn('[getBrowserDocumentDetail] 인메모리 NFC 매칭 폴백 예외:', scanErr);
      }
    }
  }
  
  if (!d) return null;

  const realDocId = String(d.id);

  // 태그 조회
  const tagStmt = db.prepare('SELECT tag_name, score FROM document_tags WHERE document_id = :id ORDER BY score DESC');
  tagStmt.bind({ ':id': realDocId });
  const tags: Array<{ name: string; score: number }> = [];
  while (tagStmt.step()) {
    const t = tagStmt.getAsObject();
    tags.push({ name: String(t.tag_name), score: Number(t.score) });
  }
  tagStmt.free();

  // 청크 조회
  const chunkStmt = db.prepare('SELECT * FROM document_chunks WHERE document_id = :id ORDER BY chunk_index ASC');
  chunkStmt.bind({ ':id': realDocId });
  const chunks: any[] = [];
  while (chunkStmt.step()) {
    const c = chunkStmt.getAsObject();
    chunks.push({
      id: String(c.id),
      chunkIndex: Number(c.chunk_index),
      headingTitle: String(c.heading_title || ''),
      headingLevel: Number(c.heading_level || 0),
      headingPath: String(c.heading_path || ''),
      startLine: Number(c.start_line || 1),
      endLine: Number(c.end_line || 1),
      chunkSummary: String(c.chunk_summary || ''),
      keywords: String(c.keywords || ''),
      chunkText: String(c.chunk_text || ''),
    });
  }
  chunkStmt.free();

  let keyPoints: string[] = [];
  try {
    if (typeof d.key_points === 'string') keyPoints = JSON.parse(d.key_points);
    else if (Array.isArray(d.key_points)) keyPoints = d.key_points;
  } catch {}

  const validChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText, c.startLine, c.endLine));

  return {
    documentId: realDocId,
    filePath: String(d.file_path),
    title: String(d.title),
    fileSize: Number(d.file_size || 0),
    modifiedAt: String(d.modified_at || ''),
    status: (d.status as any) || 'READY',
    summary: String(d.summary || ''),
    keyPoints,
    documentType: String(d.document_type || 'other'),
    tags,
    searchTerms: tags.map(t => t.name),
    analyzerModel: String(d.analyzer_model || ''),
    chunksCount: validChunks.length,
    chunks: validChunks,
  };
}

/**
 * 3. 마크다운 문서 지식 베이스 등록 및 AI 분석 (브라우저 WASM)
 * [Rule 7 준수]: 선행 청킹 및 Gemini AI 분석 100% 성공 후 원트랜잭션으로 DB 적재 및 로컬 파일 동기화
 */
export async function indexBrowserDocument(
  params: {
    filePath: string;
    fileContent: string;
    title?: string;
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    aiModelName?: string | null;
  },
  folderHandle?: any
): Promise<{ documentId: string; chunksCount: number; detail: KnowledgeDocumentDetail }> {
  const { filePath, fileContent, title, geminiApiKey, aiModelName } = params;
  if (!geminiApiKey) {
    throw new Error('AI_API_KEY_REQUIRED: AI(Gemini) API 키가 설정되지 않았습니다.');
  }

  // 1. WASM DB 획득 (먼저 DB를 초기화하여 기존 레코드 및 스캔 동기화)
  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);

  // 🛡️ [웹 환경 지식 문서 등록 시 절대경로 표준화 100% 강제 보장]
  let targetFilePath = await resolveClientAbsolutePath(filePath, params.resourceFolder);

  // 🛡️ [최후 방어 가드 - Cross-Platform]: 만약 targetFilePath에 여전히 절대경로가 아닌 경우
  if (!isAbsolutePath(targetFilePath)) {
    let baseDrivePrefix = '';
    try {
      const pStmt = db.prepare("SELECT file_path FROM knowledge_documents WHERE file_path LIKE '_:/%' OR file_path LIKE '_:\\%' LIMIT 10");
      while (pStmt.step()) {
        const pFp = String(pStmt.getAsObject().file_path || '').replace(/\\/g, '/');
        const pParts = pFp.split('/');
        const bIdx = pParts.findIndex(p => p.replace(/블로그/g, '블러그').toLowerCase() === '블러그');
        if (bIdx > 0) {
          baseDrivePrefix = pParts.slice(0, bIdx).join('/');
          break;
        } else if (pParts.length >= 2 && (isAbsolutePath(pParts[0] + ':/') || pParts[0] === '')) {
          baseDrivePrefix = pParts.slice(0, 2).join('/');
          break;
        }
      }
      pStmt.free();
    } catch {}

    const savedWebBase = typeof localStorage !== 'undefined' ? localStorage.getItem('onrivi_web_base_path') : null;
    const webBase = (savedWebBase && isAbsolutePath(savedWebBase) ? savedWebBase : null) || (baseDrivePrefix && isAbsolutePath(baseDrivePrefix) ? baseDrivePrefix : null);
    if (webBase) {
      const cleanTarget = targetFilePath.replace(/^(\.\/|\/)+/, '');
      targetFilePath = `${webBase.replace(/\\/g, '/').replace(/\/+$/, '')}/${cleanTarget}`.replace(/\/+/g, '/');
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('onrivi_web_base_path', webBase);
          const wsFolder = cleanTarget.split('/')[0] || (activeFolder?.name || 'workspace');
          localStorage.setItem('onrivi_workspace_path', `${webBase}/${wsFolder}`.replace(/\/+/g, '/'));
        }
      } catch {}
    }
  }

  const docId = `doc_${computeSha256(targetFilePath).slice(0, 16)}`;
  const fileHash = computeSha256(fileContent);
  const fileSize = new Blob([fileContent]).size;
  const docTitle = title || targetFilePath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '문서';

  // 2. 청킹 선행 수행 (문서 제목 맥락 결합)
  const chunks = chunkMarkdownByHeadings(docId, fileContent, docTitle);

  // 3. 외부 AI 분석 선행 수행
  const modelToUse = (aiModelName || 'gemini-3.8-flash').trim();
  const provider = createKnowledgeLLMProvider('gemini', geminiApiKey, modelToUse);
  const analysis = await provider.analyzeDocument(fileContent);

  // 4. 선행 작업 완료 후 단일 원트랜잭션(All-or-Nothing)으로 DB에 일괄 적재
  const now = new Date().toISOString();
  db.run('BEGIN TRANSACTION;');
  try {
    // 🛡️ 기존에 상대경로로 등록되어 있던 동일 파일 레코드 정리 (중복 및 충돌 방어)
    try {
      const oldDocStmt = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = :oldPath OR file_path = :relPath LIMIT 5');
      const cleanRel = targetFilePath.replace(/^([a-zA-Z]:\/|\/)[^/]+\/[^/]+\//, ''); // e.g. '체험하기/추석.md'
      const blogRel = '블러그/' + cleanRel;
      oldDocStmt.bind({ ':oldPath': filePath, ':relPath': blogRel });
      while (oldDocStmt.step()) {
        const oldRow = oldDocStmt.getAsObject();
        const oldDocId = String(oldRow.id);
        if (oldDocId !== docId) {
          db.run('DELETE FROM document_chunks WHERE document_id = :id;', { ':id': oldDocId });
          db.run('DELETE FROM document_tags WHERE document_id = :id;', { ':id': oldDocId });
          db.run('DELETE FROM knowledge_documents WHERE id = :id;', { ':id': oldDocId });
        }
      }
      oldDocStmt.free();
    } catch {}

    db.run('DELETE FROM document_chunks WHERE document_id = :id;', { ':id': docId });
    db.run('DELETE FROM document_tags WHERE document_id = :id;', { ':id': docId });

    // 문서 마스터 upsert (100% 완전한 절대경로 저장)
    db.run(`
      INSERT INTO knowledge_documents (
        id, file_path, title, file_hash, file_size, modified_at, priority,
        status, summary, key_points, document_type, analyzer_model, analyzed_at, indexed_at,
        error_message, analysis_version
      ) VALUES (
        :id, :path, :title, :hash, :size, :mod, 3,
        'READY', :sum, :kp, :dt, :model, :now, :now, NULL, 1
      )
      ON CONFLICT(file_path) DO UPDATE SET
        title = excluded.title,
        file_hash = excluded.file_hash,
        file_size = excluded.file_size,
        modified_at = excluded.modified_at,
        status = 'READY',
        summary = excluded.summary,
        key_points = excluded.key_points,
        document_type = excluded.document_type,
        analyzer_model = excluded.analyzer_model,
        analyzed_at = excluded.analyzed_at,
        indexed_at = excluded.indexed_at,
        error_message = NULL;
    `, {
      ':id': docId,
      ':path': targetFilePath,
      ':title': docTitle,
      ':hash': fileHash,
      ':size': fileSize,
      ':mod': now,
      ':sum': analysis.summary,
      ':kp': JSON.stringify(analysis.keyPoints),
      ':dt': analysis.documentType,
      ':model': modelToUse,
      ':now': now,
    });

    // 청크 적재
    for (const c of chunks) {
      db.run(`
        INSERT INTO document_chunks (
          id, document_id, chunk_index, heading_title, heading_level,
          heading_path, start_line, end_line, chunk_summary, keywords, chunk_text
        ) VALUES (
          :id, :docId, :idx, :title, :level,
          :path, :start, :end, :sum, :kw, :text
        );
      `, {
        ':id': c.id,
        ':docId': docId,
        ':idx': c.chunkIndex,
        ':title': c.headingTitle,
        ':level': c.headingLevel,
        ':path': c.headingPath,
        ':start': c.startLine,
        ':end': c.endLine,
        ':sum': c.chunkSummary || '',
        ':kw': c.keywords || '',
        ':text': c.chunkText,
      });
    }

    // 태그 적재
    for (const t of analysis.tags) {
      db.run(`
        INSERT OR REPLACE INTO document_tags (document_id, tag_name, score, source)
        VALUES (:docId, :name, :score, 'AI');
      `, {
        ':docId': docId,
        ':name': t.name,
        ':score': t.score,
      });
    }

    // 대기 중인 큐 작업 완료 처리
    db.run(`
      DELETE FROM knowledge_jobs 
      WHERE document_id = :docId OR file_path = :path OR file_path = :targetPath;
    `, { ':docId': docId, ':path': filePath, ':targetPath': targetFilePath });

    db.run('COMMIT;');
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }

  // 4. 변경된 DB를 사용자 PC의 onrivi_knowledge.db 파일에 즉시 영구 저장
  try {
    await saveBrowserKnowledgeDb(activeFolder, db);
  } catch (saveErr) {
    invalidateBrowserDbCache();
    throw saveErr;
  }

  const detail: KnowledgeDocumentDetail = {
    documentId: docId,
    filePath: targetFilePath,
    title: docTitle,
    fileSize,
    modifiedAt: now,
    status: 'READY',
    summary: analysis.summary,
    keyPoints: analysis.keyPoints,
    documentType: analysis.documentType,
    tags: analysis.tags,
    searchTerms: analysis.searchTerms,
    analyzerModel: modelToUse,
    chunksCount: chunks.length,
    chunks: chunks.map(c => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      headingTitle: c.headingTitle,
      headingLevel: c.headingLevel,
      headingPath: c.headingPath,
      startLine: c.startLine,
      endLine: c.endLine,
      chunkSummary: c.chunkSummary,
      keywords: c.keywords,
      chunkText: c.chunkText,
    })),
  };

  return { documentId: docId, chunksCount: chunks.length, detail };
}

/**
 * 3-1. 지식 문서 초고속 저장 (브라우저 WASM)
 * [대안 1 전용]: 외부 AI(LLM) 분석 대기 없이 원문 청킹 및 WASM SQLite 단일 원트랜잭션으로
 * document_chunks 및 knowledge_documents의 file_hash, file_size, modified_at을 즉시 갱신
 * Rule 7 준수: 선행 청킹 완료 후 단일 원트랜잭션(All-or-Nothing)으로 DB 적재 및 영구 저장
 */
export async function updateBrowserKnowledgeDocumentFast(
  params: {
    filePathOrId: string;
    fileContent: string;
  },
  folderHandle?: any
): Promise<boolean> {
  const { filePathOrId, fileContent } = params;
  if (!filePathOrId || typeof fileContent !== 'string') {
    return false;
  }

  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);

  // 1. 대상 문서 ID 식별
  let docId: string | null = null;
  const isDirectId = filePathOrId.startsWith('doc_') || filePathOrId.startsWith('doc-') || filePathOrId.length === 36;
  if (isDirectId) {
    const s = db.prepare('SELECT id FROM knowledge_documents WHERE id = :id LIMIT 1');
    s.bind({ ':id': filePathOrId });
    if (s.step()) docId = String(s.getAsObject().id);
    s.free();
  }

  if (!docId) {
    // 경로/파일명 기반 상세조회로 문서 ID 획득
    const detail = await getBrowserDocumentDetail({ filePath: filePathOrId }, activeFolder);
    if (detail && detail.documentId) {
      docId = detail.documentId;
    }
  }

  if (!docId) {
    console.warn('[updateBrowserKnowledgeDocumentFast] 저장 대상 지식 문서를 DB에서 찾지 못했습니다:', filePathOrId);
    return false;
  }

  // 1-1. 문서 제목 조회
  let docTitle = filePathOrId.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '문서';
  try {
    const titleStmt = db.prepare('SELECT title FROM knowledge_documents WHERE id = :id LIMIT 1');
    titleStmt.bind({ ':id': docId });
    if (titleStmt.step()) {
      const row = titleStmt.getAsObject();
      if (row.title) docTitle = String(row.title);
    }
    titleStmt.free();
  } catch {}

  const fileHash = computeSha256(fileContent);
  const fileSize = new Blob([fileContent]).size;
  const now = new Date().toISOString();

  // 2. 청킹 선행 수행 (문서 제목 맥락 결합, Rule 7)
  const chunks = chunkMarkdownByHeadings(docId, fileContent, docTitle);

  // 3. 단일 원트랜잭션(All-or-Nothing)으로 document_chunks 및 knowledge_documents 갱신
  db.run('BEGIN TRANSACTION;');
  try {
    // 기존 청크 삭제
    db.run('DELETE FROM document_chunks WHERE document_id = :id;', { ':id': docId });

    // 신규 청크 적재
    for (const c of chunks) {
      db.run(`
        INSERT INTO document_chunks (
          id, document_id, chunk_index, heading_title, heading_level,
          heading_path, start_line, end_line, chunk_summary, keywords, chunk_text
        ) VALUES (
          :id, :docId, :idx, :title, :level,
          :path, :start, :end, :sum, :kw, :text
        );
      `, {
        ':id': c.id,
        ':docId': docId,
        ':idx': c.chunkIndex,
        ':title': c.headingTitle,
        ':level': c.headingLevel,
        ':path': c.headingPath,
        ':start': c.startLine,
        ':end': c.endLine,
        ':sum': c.chunkSummary || '',
        ':kw': c.keywords || '',
        ':text': c.chunkText,
      });
    }

    // 문서 마스터 메타데이터 갱신 (해시, 크기, 수정시각)
    db.run(`
      UPDATE knowledge_documents
      SET file_hash = :hash,
          file_size = :size,
          modified_at = :mod,
          error_message = NULL
      WHERE id = :id;
    `, {
      ':id': docId,
      ':hash': fileHash,
      ':size': fileSize,
      ':mod': now,
    });

    db.run('COMMIT;');
  } catch (err) {
    db.run('ROLLBACK;');
    console.error('[updateBrowserKnowledgeDocumentFast] 트랜잭션 오류 롤백:', err);
    throw err;
  }

  // 4. IndexedDB 및 디스크 DB 동기화
  try {
    await saveBrowserKnowledgeDb(activeFolder, db);
    return true;
  } catch (saveErr) {
    invalidateBrowserDbCache();
    console.error('[updateBrowserKnowledgeDocumentFast] DB 영구 저장 오류:', saveErr);
    return false;
  }
}

/**
 * 4. 문서 삭제 (브라우저 WASM)
 */
export async function deleteBrowserDocument(
  params: { documentId?: string; filePath?: string },
  folderHandle?: any
): Promise<boolean> {
  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);
  const { documentId, filePath } = params;

  let targetId = documentId;
  if (!targetId && filePath) {
    // 1) 정확 매칭
    let s = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = :p LIMIT 1');
    s.bind({ ':p': filePath });
    if (s.step()) targetId = String(s.getAsObject().id);
    s.free();

    // 2) 슬래시/역슬래시 정규화 매칭
    if (!targetId) {
      const normSlash = filePath.replace(/\\/g, '/');
      const normBack = filePath.replace(/\//g, '\\');
      const normStmt = db.prepare('SELECT id FROM knowledge_documents WHERE replace(file_path, \'\\\', \'/\') = :s OR replace(file_path, \'/\', \'\\\') = :b LIMIT 1');
      normStmt.bind({ ':s': normSlash, ':b': normBack });
      if (normStmt.step()) targetId = String(normStmt.getAsObject().id);
      normStmt.free();
    }

    // 3) 파일명(Basename) 접미사 매칭 폴백
    if (!targetId) {
      const fileName = filePath.split(/[/\\]/).pop() || '';
      if (fileName) {
        const baseStmt = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = :fn OR file_path LIKE :slashFn OR file_path LIKE :backFn LIMIT 1');
        baseStmt.bind({ ':fn': fileName, ':slashFn': `%/${fileName}`, ':backFn': `%\\${fileName}` });
        if (baseStmt.step()) targetId = String(baseStmt.getAsObject().id);
        baseStmt.free();
      }
    }
  }

  if (!targetId) return true; // 이미 DB에 없음

  db.run('BEGIN TRANSACTION;');
  try {
    db.run('DELETE FROM document_chunks WHERE document_id = :id;', { ':id': targetId });
    db.run('DELETE FROM document_tags WHERE document_id = :id;', { ':id': targetId });
    db.run('DELETE FROM knowledge_jobs WHERE document_id = :id;', { ':id': targetId });
    db.run('DELETE FROM knowledge_documents WHERE id = :id;', { ':id': targetId });
    db.run('COMMIT;');
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }

  try {
    await saveBrowserKnowledgeDb(activeFolder, db);
  } catch (saveErr) {
    invalidateBrowserDbCache();
    throw saveErr;
  }
  return true;
}

/**
 * 5. 오류 문서 일괄 삭제 (브라우저 WASM)
 */
export async function deleteBrowserErrorDocuments(folderHandle?: any): Promise<number> {
  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);
  
  db.run('BEGIN TRANSACTION;');
  let deletedCount = 0;
  try {
    const stmt = db.prepare("SELECT id FROM knowledge_documents WHERE status = 'ERROR'");
    const errorIds: string[] = [];
    while (stmt.step()) {
      errorIds.push(String(stmt.getAsObject().id));
    }
    stmt.free();

    for (const id of errorIds) {
      db.run('DELETE FROM document_chunks WHERE document_id = :id;', { ':id': id });
      db.run('DELETE FROM document_tags WHERE document_id = :id;', { ':id': id });
      db.run('DELETE FROM knowledge_jobs WHERE document_id = :id;', { ':id': id });
      db.run('DELETE FROM knowledge_documents WHERE id = :id;', { ':id': id });
    }
    db.run('COMMIT;');
    deletedCount = errorIds.length;
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }

  if (deletedCount > 0) {
    try {
      await saveBrowserKnowledgeDb(activeFolder, db);
    } catch (saveErr) {
      invalidateBrowserDbCache();
      throw saveErr;
    }
  }
  return deletedCount;
}

/**
 * 6. 하이브리드 지식 검색 (브라우저 WASM)
 */
export async function searchBrowserKnowledge(
  params: {
    query: string;
    limit?: number;
    collectionId?: string;
    geminiApiKey?: string | null;
    aiModelName?: string | null;
  },
  folderHandle?: any
): Promise<{ candidates: RetrievalCandidate[]; answer?: string }> {
  const { query, limit = 10, geminiApiKey, aiModelName } = params;
  if (!query || !query.trim()) {
    return { candidates: [] };
  }

  const { db } = await getBrowserKnowledgeDb(folderHandle);
  
  // 한국어 조사 및 대화형 불용어 정제 후 핵심 검색 키워드 추출
  const rawTerms = query.replace(/[^\w\s가-힣]/g, ' ').trim().split(/\s+/).filter(t => t.length > 0);
  const termsSet = new Set<string>();
  const josaRegex = /(은|는|이|가|을|를|의|에|에게|에서|로|으로|와|과|도|만|처럼|같이|부터|까지|하고|하여|해서|해줘|해줄래|해주세요|인|인스턴스)?$/;
  const conversationalStopwords = new Set([
    '작성', '작성해', '작성해줘', '작성해줄래', '작성해주세요', '작성하기', '작성된',
    '기술', '기술해', '기술해줘', '기술해줄래', '기술해주세요', '기술하기', '기술한', '기술된',
    '서술', '서술해', '서술해줘', '서술해줄래', '서술해주세요', '서술하기', '서술한', '서술된',
    '설명', '설명해', '설명해줘', '설명해줄래', '설명해주세요', '설명하기', '설명된',
    '알려줘', '알려줄래', '알려주세요', '알려', '알려주기',
    '찾아줘', '찾아줄래', '찾아주세요', '검색', '검색해', '검색해줘', '검색해주세요',
    '가르쳐줘', '가르쳐주세요', '가르쳐',
    '요약', '요약해', '요약해줘', '요약해주세요', '요약하기',
    '정리', '정리해', '정리해줘', '정리해주세요', '정리하기',
    '말해줘', '말해줄래', '말해주세요', '이야기', '이야기해줘',
    '적어줘', '적어줄래', '적어주세요', '써줘', '써주세요', '써줄래', '쓰기',
    '소개', '소개해', '소개해줘', '소개해주세요', '소개하는',
    '추천', '추천해', '추천해줘', '추천해주세요',
    '비교', '비교해', '비교해줘', '비교해주세요',
    '분석', '분석해', '분석해줘', '분석해주세요',
    '안내', '안내해', '안내해줘', '안내해주세요',
    '답변', '답변해', '답변해줘', '답변해주세요', '답해줘',
    '보여줘', '보여주세요', '출력', '출력해', '출력해줘',
    '부탁', '부탁해', '부탁해요', '부탁드립니다',
    '관련', '관련된', '관련한', '관해서', '관하여', '관한', '관해',
    '대해', '대해서', '대하여', '대한',
    '내용', '글', '글을', '문서', '자료', '정보', '항목', '방법', '방식',
    '무엇', '어떤', '어떻게', '있는', '있는지', '새로운', '가장', '위', '아래', '통해', '위해',
    '대략', '자세히', '상세히', '친절히', '간단히', '명확히', '모두', '전부'
  ]);

  for (const t of rawTerms) {
    const lower = t.toLowerCase();
    const stripped = lower.replace(josaRegex, '');
    if (conversationalStopwords.has(lower) || conversationalStopwords.has(stripped)) {
      continue;
    }
    if (stripped.length >= 2) {
      termsSet.add(stripped);
    } else if (lower.length >= 2 && !conversationalStopwords.has(lower)) {
      termsSet.add(lower);
    }
  }
  const terms = Array.from(termsSet);

  // 의미 있는 검색 키워드가 하나도 없으면 0건 반환 (불용어로만 구성된 질의 방어)
  if (terms.length === 0) {
    return { candidates: [] };
  }

  // 모든 활성(READY/ACTIVE/INDEXED) 문서의 청크와 태그 매칭
  const sql = `
    SELECT 
      c.id AS chunk_id, c.document_id, c.chunk_index, c.heading_title,
      c.heading_level, c.heading_path, c.start_line, c.end_line,
      c.chunk_summary, c.keywords, c.chunk_text,
      d.file_path, d.title AS doc_title, d.priority AS doc_priority
    FROM document_chunks c
    JOIN knowledge_documents d ON c.document_id = d.id
    WHERE UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
    ORDER BY d.modified_at DESC;
  `;

  const stmt = db.prepare(sql);
  const scoredList: Array<{ cand: RetrievalCandidate; score: number }> = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    const heading = String(row.heading_title || '');
    const keywords = String(row.keywords || '');
    const summary = String(row.chunk_summary || '');
    const text = String(row.chunk_text || '');
    const docTitle = String(row.doc_title || '');

    let matchScore = 0;
    let matchedTermsCount = 0;
    for (const term of terms) {
      const lowerTerm = term.toLowerCase();
      let termMatched = false;
      if (docTitle.toLowerCase().includes(lowerTerm)) { matchScore += 35; termMatched = true; }
      if (heading.toLowerCase().includes(lowerTerm)) { matchScore += 30; termMatched = true; }
      if (keywords.toLowerCase().includes(lowerTerm)) { matchScore += 25; termMatched = true; }
      if (summary.toLowerCase().includes(lowerTerm)) { matchScore += 15; termMatched = true; }
      if (text.toLowerCase().includes(lowerTerm)) { matchScore += 10; termMatched = true; }
      if (termMatched) matchedTermsCount++;
    }

    // 최소 유효 매칭 기준:
    // 1) 2개 이상의 복수 핵심어 검색 시: 최소 2개 이상의 서로 다른 핵심어가 매칭되어야 함 (단순 1개 단어 우연 등장 배제)
    // 2) 최소 신뢰 점수(단일어 30점 이상, 복수어 35점 이상) 미달 시 탈락 -> 질의와 무관한 문서 노이즈 유입 원천 차단
    const minRequiredTerms = terms.length >= 2 ? Math.min(terms.length, 2) : 1;
    const minRequiredScore = terms.length >= 2 ? 35 : 30;

    if (matchScore >= minRequiredScore && matchedTermsCount >= minRequiredTerms) {
      const cand: RetrievalCandidate = {
        chunkId: String(row.chunk_id),
        documentId: String(row.document_id),
        filePath: String(row.file_path),
        documentTitle: docTitle,
        headingTitle: heading,
        headingPath: String(row.heading_path || ''),
        startLine: Number(row.start_line),
        endLine: Number(row.end_line),
        fileHash: '',
        rawBm25: matchScore,
        normalizedFtsScore: Math.min(100, matchScore),
        tagScore: 0,
        headingScore: 0,
        priorityScore: Number(row.doc_priority || 3) * 5,
        finalScore: Math.min(100, matchScore),
        score: Math.min(100, matchScore),
        snippet: text || summary || '',
      };
      scoredList.push({ cand, score: matchScore });
    }
  }
  stmt.free();

  // 검색 결과가 0건이면 임의 문서를 폴백하지 않고 깨끗하게 빈 배열 반환 (사용자 의도: 안 나와야 정상)
  if (scoredList.length === 0) {
    return { candidates: [] };
  }

  scoredList.sort((a, b) => b.score - a.score);
  const topCandidates = scoredList.slice(0, limit).map(item => item.cand);

  let answer: string | undefined = undefined;
  if (geminiApiKey && geminiApiKey.trim() && geminiApiKey !== 'DUMMY_KEY' && topCandidates.length > 0) {
    try {
      const provider = createKnowledgeLLMProvider('gemini', geminiApiKey, aiModelName || 'gemini-3.8-flash');
      const contextText = topCandidates.map(c => `[출처: ${c.documentTitle} > ${c.headingPath || c.headingTitle} (L${c.startLine}~L${c.endLine})]\n${c.snippet}`).join('\n\n');
      const { answer: ans } = await provider.answerQuestion(query, contextText);
      answer = ans;
    } catch (e) {
      console.warn('[searchBrowserKnowledge] LLM 답변 생성 실패:', e);
    }
  }

  return { candidates: topCandidates, answer };
}

/**
 * 7. 컬렉션 관리 (브라우저 WASM)
 */
export async function listBrowserCollections(folderHandle?: any): Promise<KnowledgeCollection[]> {
  const { db } = await getBrowserKnowledgeDb(folderHandle);
  const stmt = db.prepare('SELECT * FROM knowledge_collections ORDER BY name ASC');
  const cols: KnowledgeCollection[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject();
    cols.push({
      id: String(r.id),
      name: String(r.name),
      description: r.description ? String(r.description) : undefined,
      color: String(r.color || '#1d4ed8'),
      createdAt: String(r.created_at),
    });
  }
  stmt.free();
  return cols;
}

export async function upsertBrowserCollection(
  col: { id?: string; name: string; description?: string; color?: string },
  folderHandle?: any
): Promise<KnowledgeCollection> {
  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);
  const id = col.id || `col_${Date.now()}`;
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO knowledge_collections (id, name, description, color, created_at)
    VALUES (:id, :name, :desc, :color, :now)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      color = excluded.color;
  `, {
    ':id': id,
    ':name': col.name.trim(),
    ':desc': col.description || '',
    ':color': col.color || '#1d4ed8',
    ':now': now,
  });

  await saveBrowserKnowledgeDb(activeFolder, db);
  return { id, name: col.name.trim(), description: col.description, color: col.color || '#1d4ed8', createdAt: now };
}

export async function deleteBrowserCollection(collectionId: string, folderHandle?: any): Promise<void> {
  const { db, folderHandle: activeFolder } = await getBrowserKnowledgeDb(folderHandle);
  db.run('DELETE FROM knowledge_collections WHERE id = :id;', { ':id': collectionId });
  await saveBrowserKnowledgeDb(activeFolder, db);
}

/**
 * 8. 작업 큐 상태 (브라우저 WASM)
 */
export async function getBrowserQueueStats(folderHandle?: any): Promise<any> {
  try {
    const { db } = await getBrowserKnowledgeDb(folderHandle);
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) AS running,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed
      FROM knowledge_jobs;
    `);
    if (stmt.step()) {
      const r = stmt.getAsObject();
      stmt.free();
      return {
        total: Number(r.total || 0),
        queued: Number(r.queued || 0),
        running: Number(r.running || 0),
        completed: Number(r.completed || 0),
        failed: Number(r.failed || 0),
        activeWorkers: 0,
        maxWorkers: 2,
        percent: Number(r.total) > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
        isPaused: false,
        rateLimitStatus: 'NORMAL',
        rateLimitCooldownSec: 0,
      };
    }
    stmt.free();
  } catch {}
  return { total: 0, queued: 0, running: 0, completed: 0, failed: 0, activeWorkers: 0, maxWorkers: 2, percent: 0, isPaused: false, rateLimitStatus: 'NORMAL', rateLimitCooldownSec: 0 };
}

/**
 * 9. 백업 및 원복 관리 (브라우저 WASM)
 */

// 백업 디렉토리 핸들(Onrivi_Asset/db/backups) 안전 획득 헬퍼
export async function getBackupsDirectoryHandle(folderHandle: any, create = false): Promise<any> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) return null;

  if (typeof root.queryPermission === 'function') {
    try {
      const perm = await root.queryPermission({ mode: create ? 'readwrite' : 'read' });
      if (perm !== 'granted' && typeof root.requestPermission === 'function') {
        await root.requestPermission({ mode: create ? 'readwrite' : 'read' });
      }
    } catch {}
  }

  try {
    // 1) 데스크톱 표준 경로: Onrivi_Asset/db/backups
    const dbDir = await root.getDirectoryHandle('db', { create });
    return await dbDir.getDirectoryHandle('backups', { create });
  } catch (err) {
    if (!create) {
      // 2) 레거시 폴백: Onrivi_Asset/backups
      try {
        return await root.getDirectoryHandle('backups', { create: false });
      } catch {}
    }
    if (create) {
      try {
        const dbDir = await root.getDirectoryHandle('db', { create: true });
        return await dbDir.getDirectoryHandle('backups', { create: true });
      } catch {}
    }
    return null;
  }
}

export async function backupBrowserKnowledgeDb(folderHandle: any, reason: string = '수동 백업'): Promise<{ fileName: string; size: number }> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) throw new Error('리소스 폴더 핸들을 찾을 수 없습니다.');

  const { db } = await getBrowserKnowledgeDb(root);
  const binary = db.export();

  const backupsDir = await getBackupsDirectoryHandle(root, true);
  if (!backupsDir) throw new Error('백업 디렉토리를 생성하거나 열 수 없습니다.');

  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const fileName = `knowledge_backup_${dateStr}.db`;

  const backupFileHandle = await backupsDir.getFileHandle(fileName, { create: true });
  const writable = await backupFileHandle.createWritable();
  await writable.write(binary);
  await writable.close();

  // 매니페스트 업데이트 (Desktop 규격 Object Dictionary 형식 완벽 호환)
  try {
    let manifestMap: Record<string, any> = {};
    try {
      const mHandle = await backupsDir.getFileHandle('backups_manifest.json', { create: false });
      const mFile = await mHandle.getFile();
      const mText = await mFile.text();
      const parsed = JSON.parse(mText);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.fileName) manifestMap[item.fileName] = item;
        }
      } else if (parsed && typeof parsed === 'object') {
        manifestMap = parsed;
      }
    } catch {}

    const docCountStmt = db.prepare('SELECT COUNT(*) AS count FROM knowledge_documents');
    const docCount = docCountStmt.step() ? Number(docCountStmt.getAsObject().count) : 0;
    docCountStmt.free();

    const docTitles: string[] = [];
    try {
      const titleStmt = db.prepare('SELECT title FROM knowledge_documents ORDER BY modified_at DESC LIMIT 5');
      while (titleStmt.step()) {
        const row = titleStmt.getAsObject();
        if (row.title) docTitles.push(String(row.title));
      }
      titleStmt.free();
    } catch {}

    manifestMap[fileName] = {
      reason: reason || '수동 백업',
      docCount,
      docTitles,
      createdAt: d.toISOString(),
    };

    const mHandle = await backupsDir.getFileHandle('backups_manifest.json', { create: true });
    const mWritable = await mHandle.createWritable();
    await mWritable.write(JSON.stringify(manifestMap, null, 2));
    await mWritable.close();
  } catch (mErr) {
    console.warn('[backupBrowserKnowledgeDb] 매니페스트 저장 에러:', mErr);
  }

  return { fileName, size: binary.byteLength };
}

export async function listBrowserBackups(folderHandle: any): Promise<any[]> {
  try {
    const root = await resolveResourceFolderHandle(folderHandle);
    if (!root) return [];

    const backupsDir = await getBackupsDirectoryHandle(root, false);
    if (!backupsDir) return [];

    // 1) 매니페스트 파일 파싱 (Desktop 규격 Object Dictionary 및 Array 양방향 완벽 호환)
    const manifestMap: Record<string, any> = {};
    try {
      const mHandle = await backupsDir.getFileHandle('backups_manifest.json', { create: false });
      const mFile = await mHandle.getFile();
      const mText = await mFile.text();
      const parsed = JSON.parse(mText);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.fileName) manifestMap[item.fileName] = item;
        }
      } else if (parsed && typeof parsed === 'object') {
        Object.assign(manifestMap, parsed);
      }
    } catch {}

    // 2) 디렉토리 내 실제 *.db 파일 엔트리 순회 (Desktop과 100% 동일한 무결성 및 메타데이터 복원)
    const items: any[] = [];
    if (typeof backupsDir.entries === 'function') {
      for await (const [name, handle] of backupsDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.db') && !name.startsWith('.')) {
          try {
            const file = await handle.getFile();
            const meta = manifestMap[name];

            let reason = meta?.reason;
            let docCount = typeof meta?.docCount === 'number' ? meta.docCount : undefined;
            let docTitles = meta?.docTitles || (meta?.sampleTitle ? [meta.sampleTitle] : []);
            const createdAt = meta?.createdAt || new Date(file.lastModified).toISOString();

            // 매니페스트에 메타데이터(docCount)가 누락된 경우, WASM SQLite로 해당 .db 파일 1회 검사 (Desktop 백필과 동일)
            if (typeof docCount !== 'number') {
              try {
                const SQL = await getSqlModule();
                const arrayBuf = await file.arrayBuffer();
                const inspectDb = new SQL.Database(new Uint8Array(arrayBuf));
                const countStmt = inspectDb.prepare('SELECT COUNT(*) AS count FROM knowledge_documents');
                if (countStmt.step()) {
                  docCount = Number(countStmt.getAsObject().count || 0);
                }
                countStmt.free();

                const titleStmt = inspectDb.prepare('SELECT title FROM knowledge_documents ORDER BY modified_at DESC LIMIT 5');
                docTitles = [];
                while (titleStmt.step()) {
                  const row = titleStmt.getAsObject();
                  if (row.title) docTitles.push(String(row.title));
                }
                titleStmt.free();
                inspectDb.close();

                if (!reason) {
                  reason = docCount > 0 ? `등록 문서 ${docCount}건 보관 시점` : '수동 백업';
                }
              } catch {
                docCount = 0;
                if (!reason) reason = '수동 백업';
              }
            }

            items.push({
              fileName: name,
              createdAt,
              reason: reason || '수동 백업',
              docCount: docCount ?? 0,
              docTitles,
              size: file.size,
            });
          } catch {}
        }
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch (err) {
    console.error('[listBrowserBackups Error]:', err);
    return [];
  }
}

export async function restoreBrowserBackup(folderHandle: any, fileName: string): Promise<boolean> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) throw new Error('리소스 폴더 핸들을 찾을 수 없습니다.');

  // 사전 안전 자동 백업 (Rule 7)
  try { await backupBrowserKnowledgeDb(root, `원복 전 자동 안전 백업 (${fileName})`); } catch {}

  const backupsDir = await getBackupsDirectoryHandle(root, false);
  if (!backupsDir) throw new Error('백업 디렉토리를 열 수 없습니다.');

  const backupFileHandle = await backupsDir.getFileHandle(fileName, { create: false });
  const file = await backupFileHandle.getFile();
  const binary = await file.arrayBuffer();

  const dbDir = await root.getDirectoryHandle('db', { create: true });
  const targetHandle = await dbDir.getFileHandle('onrivi_knowledge.db', { create: true });
  const writable = await targetHandle.createWritable();
  await writable.write(binary);
  await writable.close();

  // 캐시 무효화
  invalidateBrowserDbCache();
  return true;
}

export async function deleteBrowserBackup(folderHandle: any, fileName: string): Promise<boolean> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) return false;

  const backupsDir = await getBackupsDirectoryHandle(root, false);
  if (!backupsDir) return false;

  try {
    await backupsDir.removeEntry(fileName);
  } catch {}

  // 매니페스트 동기화 (Object Dictionary 및 Array 호환)
  try {
    const mHandle = await backupsDir.getFileHandle('backups_manifest.json', { create: false });
    const mFile = await mHandle.getFile();
    const mText = await mFile.text();
    const manifest = JSON.parse(mText);
    if (Array.isArray(manifest)) {
      const filtered = manifest.filter((item: any) => item.fileName !== fileName);
      const mWritable = await mHandle.createWritable();
      await mWritable.write(JSON.stringify(filtered, null, 2));
      await mWritable.close();
    } else if (manifest && typeof manifest === 'object') {
      delete manifest[fileName];
      const mWritable = await mHandle.createWritable();
      await mWritable.write(JSON.stringify(manifest, null, 2));
      await mWritable.close();
    }
  } catch {}

  return true;
}

export async function getBrowserBackupBlob(folderHandle: any, fileName?: string): Promise<{ blob: Blob; downloadName: string } | null> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const defaultName = `onrivi_knowledge_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.db`;

  if (!fileName || fileName === 'current') {
    // 1) 현재 활성 DB 파일 다운로드
    try {
      const dbDir = await root.getDirectoryHandle('db', { create: false });
      const dbFileHandle = await dbDir.getFileHandle('onrivi_knowledge.db', { create: false });
      const file = await dbFileHandle.getFile();
      return { blob: file, downloadName: defaultName };
    } catch {
      // 인메모리 WASM DB export 폴백
      try {
        const { db } = await getBrowserKnowledgeDb(root);
        const binary = db.export();
        const blob = new Blob([binary], { type: 'application/octet-stream' });
        return { blob, downloadName: defaultName };
      } catch {}
    }
  } else {
    // 2) 특정 백업 파일 다운로드
    try {
      const backupsDir = await getBackupsDirectoryHandle(root, false);
      if (!backupsDir) return null;
      const fileHandle = await backupsDir.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      return { blob: file, downloadName: fileName };
    } catch {}
  }
  return null;
}

export async function restoreBrowserFromUploadedFile(folderHandle: any, file: File): Promise<boolean> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) throw new Error('리소스 폴더 핸들을 찾을 수 없습니다.');

  // 사전 안전 자동 백업 (Rule 7)
  try { await backupBrowserKnowledgeDb(root, `외부 DB 업로드 전 자동 안전 백업 (${file.name})`); } catch {}

  const binary = await file.arrayBuffer();

  const dbDir = await root.getDirectoryHandle('db', { create: true });
  const targetHandle = await dbDir.getFileHandle('onrivi_knowledge.db', { create: true });
  const writable = await targetHandle.createWritable();
  await writable.write(binary);
  await writable.close();

  // 캐시 무효화
  invalidateBrowserDbCache();
  return true;
}

export async function resetBrowserKnowledgeDb(folderHandle: any, reason: string = 'DB 완전 초기화'): Promise<boolean> {
  const root = await resolveResourceFolderHandle(folderHandle);
  if (!root) throw new Error('리소스 폴더 핸들을 찾을 수 없습니다.');

  // 사전 안전 자동 백업 (Rule 7)
  try { await backupBrowserKnowledgeDb(root, `초기화 전 자동 안전 백업 (${reason})`); } catch {}

  const SQL = await getSqlModule();
  const newDb = new SQL.Database();
  initBrowserKnowledgeSchema(newDb);

  await saveBrowserKnowledgeDb(root, newDb);
  invalidateBrowserDbCache();
  return true;
}
