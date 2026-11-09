// ====================================================================
// 📊 [OMD-ELECTRON-knowledgeApi-0001] electron/desktopKnowledgeApi.cjs
// 🎯 @KICK  : 데스크톱 전용 로컬 SQLite 지식 베이스 엔진 및 /api/knowledge/* 라우팅 핸들러
// 🛡️ @GUARD : Rule 1(표준 주석 규격), Rule 2(대문자 코드값), Rule 7(SQLite All-or-Nothing 원트랜잭션 무결성)
// 🚨 @PATCH : 2026-11-08 — [main.js 1단계 모듈 분리] main.js의 SQLite 지식엔진(2,100줄)을 electron/desktopKnowledgeApi.cjs로 격리 모듈화
// 🔗 @CALLS : node:sqlite, node:fs, node:path, node:crypto
// ====================================================================

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

/**
 * ========================================================================================
 * [함수명] resolveSafeResourceFolder - 사용자 리소스 폴더의 실제 경로를 안전하게 확인 및 정규화
 *
 * @param {string} [folder] - 리소스 폴더명 또는 절대경로
 * @returns {string} 안전하게 검증된 리소스 폴더 절대경로
 * ==========================================================================================
 */
function resolveSafeResourceFolder(folder) {
  let clean = (folder && typeof folder === 'string' ? folder.trim() : '') || 'Onrivi_Asset';

  // 🛡️ [AES 암호화 문자열 원천 방어] 로컬스토리지 AES 암호문(U2FsdGVkX1...)이 유입된 경우 기본값 치환
  if (clean.startsWith('U2FsdGVkX1') || clean === '') {
    clean = 'Onrivi_Asset';
  }

  // 1) 이미 절대 경로인 경우: 실제 존재하는지 확인 후, 만약 없다면 다른 드라이브 확인
  if (path.isAbsolute(clean)) {
    if (fs.existsSync(clean)) return clean;
    const baseName = path.basename(clean);
    const candidateDrives = ['D:\\', 'C:\\', 'E:\\', 'F:\\'];
    for (const drive of candidateDrives) {
      const candidate = path.join(drive, baseName);
      if (fs.existsSync(path.join(candidate, 'db', 'onrivi_knowledge.db')) || fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return clean;
  }

  // 2) 상대 경로(예: 'Onrivi_Asset')인 경우: 실제 onrivi_knowledge.db 또는 폴더가 존재하는 드라이브 우선 탐색
  const candidateDrives = ['D:\\', 'C:\\', 'E:\\', 'F:\\'];
  for (const drive of candidateDrives) {
    const candidate = path.join(drive, clean);
    if (fs.existsSync(path.join(candidate, 'db', 'onrivi_knowledge.db')) || fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const cwd = process.cwd();
  const rootDrive = (cwd && path.parse(cwd).root) || 'C:\\';
  return path.join(rootDrive, clean);
}

/**
 * ========================================================================================
 * [함수명] getKnowledgeDbPath - 지정된 리소스 폴더의 onrivi_knowledge.db 절대경로를 반환
 *
 * @param {string} resourceFolder - 리소스 폴더 경로
 * @returns {string|null} SQLite DB 파일 절대경로
 * ==========================================================================================
 */
function getKnowledgeDbPath(resourceFolder) {
  const safe = resolveSafeResourceFolder(resourceFolder);
  if (!safe) return null;
  return path.join(safe, 'db', 'onrivi_knowledge.db');
}

/**
 * ========================================================================================
 * [함수명] applyDesktopKnowledgeSchema - SQLite DB 테이블, FTS5 인덱스 스키마 자동 구성
 *
 * @param {object} db - DatabaseSync SQLite 연결 인스턴스
 * ==========================================================================================
 */
function applyDesktopKnowledgeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#06C755',
      created_at TEXT NOT NULL
    );
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
      chunk_type TEXT DEFAULT 'section',
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
      chunk_id UNINDEXED,
      document_id UNINDEXED,
      heading_title,
      keywords,
      chunk_text
    );
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

  try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;"); } catch {}
  try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_type TEXT DEFAULT 'section';"); } catch {}
  try { db.exec("UPDATE document_chunks SET chunk_text = (SELECT f.chunk_text FROM document_chunks_fts f WHERE f.chunk_id = document_chunks.id) WHERE chunk_text IS NULL OR chunk_text = '';"); } catch {}
}

const desktopDbCache = new Map();

/**
 * ========================================================================================
 * [함수명] getDesktopKnowledgeDb - SQLite DB 인스턴스 획득 및 WAL 모드/캐싱 관리
 *
 * @param {string} resourceFolder - 리소스 폴더 경로
 * @param {boolean} [autoCreate=false] - 파일 부재 시 자동 생성 여부
 * @returns {object|null} DatabaseSync SQLite 인스턴스
 * ==========================================================================================
 */
function getDesktopKnowledgeDb(resourceFolder, autoCreate = false) {
  const dbPath = getKnowledgeDbPath(resourceFolder);
  if (!dbPath) return null;
  if (!autoCreate && !fs.existsSync(dbPath)) return null;

  if (desktopDbCache.has(dbPath)) {
    const cached = desktopDbCache.get(dbPath);
    try {
      cached.prepare('SELECT 1').get();
      return cached;
    } catch {
      try { cached.close(); } catch {}
      desktopDbCache.delete(dbPath);
    }
  }

  const dbDir = path.dirname(dbPath);
  if (autoCreate && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const { DatabaseSync } = require('node:sqlite');
  let db = null;
  try {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout = 10000;');

    // 🚨 저널 모드 설정: 이미 wal이면 배타적 락을 요구하는 PRAGMA journal_mode = WAL; 재실행을 건너뜀 (잠금 충돌 원천 방어)
    try {
      const modeRow = db.prepare('PRAGMA journal_mode;').get();
      if (modeRow && modeRow.journal_mode !== 'wal') {
        db.exec('PRAGMA journal_mode = WAL;');
      }
    } catch (walErr) {
      console.warn('[getDesktopKnowledgeDb] journal_mode WAL skipped:', walErr?.message);
    }

    try { db.exec('PRAGMA synchronous = NORMAL;'); } catch {}
    try { db.exec('PRAGMA foreign_keys = ON;'); } catch {}

    applyDesktopKnowledgeSchema(db);
    desktopDbCache.set(dbPath, db);
    return db;
  } catch (err) {
    console.error('[getDesktopKnowledgeDb] Failed to open/init database:', err?.message);
    if (db) {
      try { db.close(); } catch {}
    }
    throw err;
  }
}

function decodeFileBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';
  let i = 0;
  let isUtf8 = true;
  while (i < buffer.length) {
    if (buffer[i] <= 0x7f) {
      i += 1;
      continue;
    }
    if (buffer[i] >= 0xc2 && buffer[i] <= 0xdf) {
      if (i + 1 < buffer.length && buffer[i + 1] >= 0x80 && buffer[i + 1] <= 0xbf) {
        i += 2;
        continue;
      }
    } else if (buffer[i] >= 0xe0 && buffer[i] <= 0xef) {
      if (
        i + 2 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf
      ) {
        i += 3;
        continue;
      }
    } else if (buffer[i] >= 0xf0 && buffer[i] <= 0xf4) {
      if (
        i + 3 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf &&
        buffer[i + 3] >= 0x80 &&
        buffer[i + 3] <= 0xbf
      ) {
        i += 4;
        continue;
      }
    }
    isUtf8 = false;
    break;
  }

  if (isUtf8) {
    return buffer.toString('utf8');
  }

  try {
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

const MAX_DESKTOP_SECTION_LINES = 150;

function chunkMarkdownByHeadingsHelper(docId, markdownText, documentTitle = '') {
  if (!markdownText || !markdownText.trim()) return [];
  const lines = markdownText.split(/\r?\n/);
  const totalLines = lines.length;
  const boundaries = [];
  const headingStack = [];

  const cleanDocTitle = (documentTitle || '').trim().replace(/\.md$/i, '');
  const isMetaOnly = markdownText.trimStart().startsWith('---');
  const initialTitle = cleanDocTitle 
    ? (isMetaOnly ? `[${cleanDocTitle}] 서두 및 메타정보` : `[${cleanDocTitle}] 서두 및 개요`)
    : (isMetaOnly ? '서두 및 메타정보' : '개요 (서론)');
  const initialPath = cleanDocTitle
    ? `${cleanDocTitle} > ${isMetaOnly ? '서두 및 메타정보' : '서두'}`
    : (isMetaOnly ? '서두 및 메타정보' : '개요');

  let currentSection = {
    headingTitle: initialTitle,
    headingLevel: 0,
    headingPath: initialPath,
    startLine: 1,
  };

  const headingRegex = /^(#{1,6})\s+(.+)$/;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].replace(/\r$/, '');
    const match = line.match(headingRegex);

    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      if (i > 0 && i >= currentSection.startLine) {
        boundaries.push({
          ...currentSection,
          endLine: i,
        });
      }

      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, title });

      const rawPath = headingStack.map(h => h.title).join(' > ');
      const headingPath = cleanDocTitle ? `${cleanDocTitle} > ${rawPath}` : rawPath;

      currentSection = {
        headingTitle: title,
        headingLevel: level,
        headingPath,
        startLine: i + 1,
      };
    }
  }

  boundaries.push({
    ...currentSection,
    endLine: totalLines,
  });

  const rawChunks = [];
  let chunkCounter = 0;

  for (const b of boundaries) {
    const sectionLines = lines.slice(b.startLine - 1, b.endLine);
    const text = sectionLines.join('\n').trim();

    if (!text) continue;
    if (isMetaOrAuxiliaryChunk(b.headingTitle, text, b.startLine, b.endLine)) {
      continue;
    }

    const lineCount = b.endLine - b.startLine + 1;

    if (lineCount <= MAX_DESKTOP_SECTION_LINES) {
      rawChunks.push({
        chunkIndex: chunkCounter++,
        headingTitle: b.headingTitle,
        headingLevel: b.headingLevel,
        headingPath: b.headingPath,
        startLine: b.startLine,
        endLine: b.endLine,
        chunkText: text,
      });
    } else {
      let subStartLine = b.startLine;
      let currentSubLines = [];

      for (let i = 0; i < sectionLines.length; i++) {
        const line = sectionLines[i];
        currentSubLines.push(line);

        if (line.trim() === '' && currentSubLines.length >= 40) {
          const subEndLine = b.startLine + i;
          const subText = currentSubLines.join('\n').trim();
          if (subText) {
            rawChunks.push({
              chunkIndex: chunkCounter++,
              headingTitle: `${b.headingTitle} (Part ${rawChunks.length + 1})`,
              headingLevel: b.headingLevel,
              headingPath: b.headingPath,
              startLine: subStartLine,
              endLine: subEndLine,
              chunkText: subText,
            });
          }
          currentSubLines = [];
          subStartLine = subEndLine + 1;
        }
      }

      if (currentSubLines.length > 0) {
        const subText = currentSubLines.join('\n').trim();
        if (subText) {
          rawChunks.push({
            chunkIndex: chunkCounter++,
            headingTitle: rawChunks.length > 0 ? `${b.headingTitle} (Part ${rawChunks.length + 1})` : b.headingTitle,
            headingLevel: b.headingLevel,
            headingPath: b.headingPath,
            startLine: subStartLine,
            endLine: b.endLine,
            chunkText: subText,
          });
        }
      }
    }
  }

  return rawChunks.map((chunk, idx) => {
    const cLines = chunk.chunkText.split('\n');
    const summary = cLines.slice(0, 3).join(' ').slice(0, 200).trim();
    const keywords = [chunk.headingTitle].filter(Boolean);

    return {
      id: `${docId}_chunk_${idx}`,
      documentId: docId,
      chunkIndex: idx,
      headingTitle: chunk.headingTitle,
      headingLevel: chunk.headingLevel,
      headingPath: chunk.headingPath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      chunkSummary: summary,
      keywords,
      chunkText: chunk.chunkText,
    };
  });
}

/**
 * 메타데이터, 서식 설정(Frontmatter), SEO 키워드, 해시태그, 이미지 프롬프트 등
 * 검색 지식 가치가 없는 부속 청크인지 여부를 판별합니다.
 */
function isMetaOrAuxiliaryChunk(heading, text, startLine, endLine) {
  const h = (heading || '').toLowerCase();
  const t = (text || '').trim();

  // 1. 프론트매터 및 CSS 서식설정
  if (t.startsWith('---') && (Number(startLine) <= 2 || t.includes('css_profile') || t.includes('#서식설정') || t.includes('서식설정') || t.includes('title:') || t.includes('layout:'))) {
    return true;
  }

  // 2. 메타/부속 헤딩 키워드
  const metaKeywords = [
    '메타정보', '메타영역', '서두 및 메타', '서식설정', '문서 서식',
    'seo 키워드', 'seo키워드', '해시태그', '제목 후보', '제목후보',
    '이미지 생성', '1:1 이미지', '이미지 프롬프트'
  ];
  if (metaKeywords.some(mk => h.includes(mk))) {
    return true;
  }

  // 3. 무의미한 빈 헤딩 또는 플레이스홀더
  if (/^[0-9.]*\s*본문$/.test(h) && t.length < 50) return true;
  if (/^법률\s*제\s*호$/.test(h) && t.length < 50) return true;

  // 4. 문서 최상단 단순 제목/구분선 헤더 (실질 본문 30자 미만)
  if (Number(startLine) <= 3 && Number(endLine) <= 6) {
    const stripped = t.replace(/^[#\s\-*_>]+/gm, '').trim();
    if (stripped.length < 30) return true;
  }

  return false;
}

/**
 * 텍스트 내부에서 문자열 리터럴과 이스케이프(\")를 고려하여
 * 균형 잡힌 최상위 중괄호 '{' ~ '}' 블록들을 모두 추출합니다.
 */
function extractBalancedJsonBlocks(text) {
  const blocks = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          blocks.push(text.substring(startIndex, i + 1));
          startIndex = -1;
        }
      }
    }
  }
  return blocks;
}

/**
 * LLM이 출력한 불완전하거나 비표준인 JSON 문자열을 표준 JSON 문법으로 보정합니다.
 */
function repairJsonString(raw) {
  let s = (raw || '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9-]*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
  }
  s = s.replace(/\r\n/g, '\n');
  s = s
    .replace(/:\s*string\b/gi, ': "string"')
    .replace(/:\s*number\b/gi, ': 80')
    .replace(/:\s*boolean\b/gi, ': true');
  s = s.replace(/,\s*([\]}])/g, '$1');
  if (!s.includes('"') && s.includes("'")) {
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  }
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 문자열 리터럴 내부의 제어문자(개행, 탭) 및 미이스케이프 내부 큰따옴표 자동 수리
  let inString = false;
  let escape = false;
  let fixed = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      fixed += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      fixed += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        fixed += ch;
      } else {
        // 다음 비공백 문자 탐색으로 종결 따옴표 여부 확인
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        const nextChar = s[j];
        if (j >= s.length || nextChar === ',' || nextChar === ':' || nextChar === '}' || nextChar === ']') {
          inString = false;
          fixed += ch;
        } else {
          // 문자열 내부 미이스케이프 따옴표 이스케이프 처리
          fixed += '\\"';
        }
      }
      continue;
    }
    if (inString) {
      if (ch === '\n') {
        fixed += '\\n';
        continue;
      }
      if (ch === '\r') continue;
      if (ch === '\t') {
        fixed += '\\t';
        continue;
      }
    }
    fixed += ch;
  }

  return fixed;
}

/**
 * JSON 파싱이 전면 실패한 경우에도 AI 텍스트에서 summary, key_points, tags, search_terms를 정규식으로 안전하게 추출합니다.
 */
function extractLlmJsonFieldsFallback(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const result = {};

  // 1. summary 추출
  const summaryMatch = raw.match(/["']summary["']\s*:\s*"([^"]+)"/i) ||
                       raw.match(/["']summary["']\s*:\s*"([\s\S]*?)(?:"\s*,\s*"\w+"|\s*"\s*[\r\n])/i);
  if (summaryMatch && summaryMatch[1]) {
    result.summary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  }

  // 2. key_points 추출
  const kpBlockMatch = raw.match(/["']key_points["']\s*:\s*\[([\s\S]*?)\]/i);
  if (kpBlockMatch && kpBlockMatch[1]) {
    const lines = [...kpBlockMatch[1].matchAll(/"([^"\r\n]+)"/g)].map(m => m[1].replace(/\\"/g, '"').trim()).filter(Boolean);
    if (lines.length > 0) result.key_points = lines;
  }

  // 3. tags 추출
  const tagsBlockMatch = raw.match(/["']tags["']\s*:\s*\[([\s\S]*?)\]/i);
  if (tagsBlockMatch && tagsBlockMatch[1]) {
    const tagMatches = [...tagsBlockMatch[1].matchAll(/\{[^{}]*?["']name["']\s*:\s*["']([^"']+)["'][^{}]*?\}/gi)];
    if (tagMatches.length > 0) {
      result.tags = tagMatches.map(m => {
        const name = m[1].trim();
        const scoreMatch = m[0].match(/["']score["']\s*:\s*([0-9]+)/i);
        return { name, score: scoreMatch ? Number(scoreMatch[1]) : 85 };
      });
    }
  }

  // 4. search_terms 추출
  const stBlockMatch = raw.match(/["']search_terms["']\s*:\s*\[([\s\S]*?)\]/i);
  if (stBlockMatch && stBlockMatch[1]) {
    const terms = [...stBlockMatch[1].matchAll(/"([^"\r\n]+)"/g)].map(m => m[1].trim()).filter(Boolean);
    if (terms.length > 0) result.search_terms = terms;
  }

  if (result.summary || (result.key_points && result.key_points.length > 0)) {
    return result;
  }
  return null;
}

/**
 * LLM 응답 텍스트로부터 최선의 JSON 객체를 파싱 및 복원하여 반환합니다.
 */
function parseAndRepairLlmJson(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const trimmed = rawText.trim();
  try { return JSON.parse(trimmed); } catch (_) {}

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const inside = codeBlockMatch[1].trim();
    try { return JSON.parse(inside); } catch (_) {}
    try { return JSON.parse(repairJsonString(inside)); } catch (_) {}
  }

  const blocks = extractBalancedJsonBlocks(trimmed);
  if (blocks.length > 0) {
    if (blocks.length === 1) {
      try { return JSON.parse(blocks[0]); } catch (_) {}
      try { return JSON.parse(repairJsonString(blocks[0])); } catch (_) {}
    } else {
      const merged = {};
      let parseSuccessCount = 0;
      for (const block of blocks) {
        let blockParsed = null;
        try { blockParsed = JSON.parse(block); } catch (_) {
          try { blockParsed = JSON.parse(repairJsonString(block)); } catch (_) {}
        }
        if (blockParsed && typeof blockParsed === 'object' && !Array.isArray(blockParsed)) {
          Object.assign(merged, blockParsed);
          parseSuccessCount++;
        }
      }
      if (parseSuccessCount > 0) return merged;
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.substring(firstBrace, lastBrace + 1);
    try { return JSON.parse(repairJsonString(slice)); } catch (_) {}
  }

  // 5단계: 정규식 기반 주요 필드 복원 폴백
  return extractLlmJsonFieldsFallback(trimmed);
}

/**
 * ========================================================================================
 * [함수명] handleDesktopKnowledgeApi - 데스크톱 /api/knowledge/* HTTP 요청 라우팅 및 SQLite 처리
 *
 * @param {Request} request - Fetch Request 객체
 * @param {string} pathname - 상대 URL 경로 (예: api/knowledge/list)
 * @param {URL} url - 전체 파싱된 URL 객체
 * @returns {Promise<Response>} HTTP Response 응답 객체
 * ==========================================================================================
 */
async function handleDesktopKnowledgeApi(request, pathname, url) {
  try {
    let body = {};
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch (err) {
        console.warn('[DesktopKnowledgeApi] Body parse warning:', err.message);
      }
    }

    const subPath = pathname.replace(/^api\/knowledge\/?/, '').split('?')[0].replace(/\/$/, '');
    const resourceFolder = body.resourceFolder || url.searchParams.get('resourceFolder');

    // 1. 등록 지식 문서 목록 조회 (list)
    if (subPath === 'list') {
      if (!resourceFolder || !resourceFolder.trim()) {
        return Response.json(
          { ok: false, code: 'NO_RESOURCE_FOLDER', message: '공통 자원(리소스) 폴더가 설정되지 않았습니다.', documents: [] },
          { status: 400 }
        );
      }
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) {
        return Response.json({ ok: true, documents: [] });
      }

      const docs = db.prepare(`
        SELECT 
          d.id,
          d.file_path,
          d.title,
          d.file_hash,
          d.file_size,
          d.modified_at,
          d.summary,
          d.key_points,
          d.document_type,
          d.priority,
          d.status,
          d.error_message,
          d.analyzer_model,
          d.analyzed_at,
          d.indexed_at,
          (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) as chunk_count
        FROM knowledge_documents d
        ORDER BY d.indexed_at DESC
      `).all();

      const getTagsStmt = db.prepare('SELECT tag_name, score FROM document_tags WHERE document_id = ? ORDER BY score DESC');
      const documents = docs.map(doc => {
        let tags = [];
        try { tags = getTagsStmt.all(doc.id); } catch {}
        let keyPoints = [];
        if (typeof doc.key_points === 'string') {
          try { keyPoints = JSON.parse(doc.key_points); } catch {}
        } else if (Array.isArray(doc.key_points)) {
          keyPoints = doc.key_points;
        }
        return {
          ...doc,
          key_points: keyPoints,
          tags
        };
      });

      return Response.json({ ok: true, documents });
    }

    // 2. 큐 작업 현황 통계 (queue/stats)
    if (subPath === 'queue/stats') {
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) {
        return Response.json({
          ok: true,
          stats: {
            total: 0,
            completed: 0,
            running: 0,
            queued: 0,
            failed: 0,
            percent: 0,
            activeWorkers: 0,
            maxWorkers: 2,
            isPaused: false,
            rateLimitStatus: 'NORMAL'
          }
        });
      }

      let rows = [];
      try {
        rows = db.prepare(`
          SELECT status, COUNT(*) as count
          FROM knowledge_jobs
          GROUP BY status
        `).all();
      } catch (tableErr) {
        console.warn('[DesktopKnowledgeApi] knowledge_jobs table query failed, returning zero stats:', tableErr?.message);
        return Response.json({
          ok: true,
          stats: {
            total: 0,
            completed: 0,
            running: 0,
            queued: 0,
            failed: 0,
            percent: 0,
            activeWorkers: 0,
            maxWorkers: 2,
            isPaused: false,
            rateLimitStatus: 'NORMAL'
          }
        });
      }

      let total = 0, queued = 0, running = 0, success = 0, failed = 0;
      for (const r of rows) {
        const count = Number(r.count || 0);
        total += count;
        if (r.status === 'QUEUED') queued = count;
        else if (r.status === 'RUNNING') running = count;
        else if (r.status === 'SUCCESS') success = count;
        else if (r.status === 'FAILED') failed = count;
      }
      const percent = total > 0 ? Math.round((success / total) * 100) : 0;

      return Response.json({
        ok: true,
        stats: {
          total,
          completed: success,
          running,
          queued,
          failed,
          percent,
          activeWorkers: Math.min(running, 2),
          maxWorkers: 2,
          isPaused: false,
          rateLimitStatus: 'NORMAL'
        }
      });
    }

    // 3. 지식 컬렉션 CRUD (collection)
    if (subPath === 'collection') {
      if (request.method === 'GET') {
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (!db) return Response.json({ ok: true, collections: [] });

        const rows = db.prepare(`
          SELECT c.id, c.name, c.description, COALESCE(c.color, '#06C755') as color, c.created_at,
                 COUNT(d.id) as documentCount
          FROM knowledge_collections c
          LEFT JOIN knowledge_documents d ON d.collection_id = c.id
          GROUP BY c.id
          ORDER BY c.name ASC
        `).all();

        const collections = rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          color: r.color,
          createdAt: r.created_at,
          documentCount: Number(r.documentCount || 0)
        }));
        return Response.json({ ok: true, collections });
      }

      if (request.method === 'POST') {
        const { name, description, color } = body;
        if (!name || !name.trim()) {
          return Response.json({ ok: false, message: '컬렉션 이름이 필요합니다.' }, { status: 400 });
        }
        const db = getDesktopKnowledgeDb(resourceFolder, true);
        const id = body.id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const safeColor = color || '#06C755';
        db.prepare(`
          INSERT INTO knowledge_collections (id, name, description, color, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            description = excluded.description,
            color = excluded.color
        `).run(id, name.trim(), description?.trim() || null, safeColor, now);
        const saved = db.prepare('SELECT * FROM knowledge_collections WHERE name = ?').get(name.trim());
        return Response.json({
          ok: true,
          collection: {
            id: saved.id,
            name: saved.name,
            description: saved.description,
            color: saved.color,
            createdAt: saved.created_at
          }
        });
      }

      if (request.method === 'DELETE') {
        const colId = url.searchParams.get('id') || body.id;
        if (!colId) return Response.json({ ok: false, message: '컬렉션 ID가 필요합니다.' }, { status: 400 });
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (db) {
          db.exec('BEGIN TRANSACTION;');
          try {
            db.prepare('UPDATE knowledge_documents SET collection_id = NULL WHERE collection_id = ?').run(colId);
            db.prepare('DELETE FROM knowledge_collections WHERE id = ?').run(colId);
            db.exec('COMMIT;');
          } catch (e) {
            db.exec('ROLLBACK;');
            throw e;
          }
        }
        return Response.json({ ok: true });
      }
    }

    // 4. 지식 문서 상세 정보 (detail)
    if (subPath === 'detail') {
      const docId = url.searchParams.get('docId') || url.searchParams.get('documentId') || body.documentId || body.docId;
      const filePath = url.searchParams.get('filePath') || body.filePath;
      if (!docId && !filePath) {
        return Response.json({ ok: false, message: 'documentId 또는 filePath가 필요합니다.' }, { status: 400 });
      }
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: false, message: '문서를 찾을 수 없습니다.' }, { status: 404 });

      let doc = null;
      if (docId) {
        doc = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(docId);
      } else if (filePath) {
        doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ?').get(filePath);
        if (!doc) {
          const normSlash = filePath.replace(/\\/g, '/');
          const normBack = filePath.replace(/\//g, '\\');
          doc = db.prepare("SELECT * FROM knowledge_documents WHERE replace(file_path, '\\', '/') = ? OR replace(file_path, '/', '\\') = ?").get(normSlash, normBack);
        }
        if (!doc) {
          const fileName = filePath.split(/[/\\]/).pop() || '';
          if (fileName) {
            doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ? OR file_path LIKE ? OR file_path LIKE ? LIMIT 1').get(
              fileName,
              `%/${fileName}`,
              `%\\${fileName}`
            );
          }
        }
      }
      if (!doc) {
        return Response.json({ ok: false, message: '문서를 찾을 수 없습니다.' }, { status: 404 });
      }

      const tags = db.prepare('SELECT tag_name, score FROM document_tags WHERE document_id = ? ORDER BY score DESC').all(doc.id);
      const chunks = db.prepare(`
        SELECT c.id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
               c.start_line, c.end_line, c.chunk_summary, c.keywords,
               COALESCE(c.chunk_text, f.chunk_text, '') as chunk_text
        FROM document_chunks c
        LEFT JOIN document_chunks_fts f ON f.chunk_id = c.id
        WHERE c.document_id = ?
        ORDER BY c.chunk_index ASC
      `).all(doc.id);

      const validDbChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.heading_title, c.chunk_text, c.start_line, c.end_line));

      let keyPoints = [];
      try { keyPoints = typeof doc.key_points === 'string' ? JSON.parse(doc.key_points) : (doc.key_points || []); } catch {}

      const detail = {
        documentId: doc.id,
        filePath: doc.file_path,
        title: doc.title,
        fileSize: doc.file_size,
        modifiedAt: doc.modified_at,
        status: doc.status,
        summary: doc.summary || '',
        keyPoints,
        documentType: doc.document_type || 'other',
        tags: tags.map(t => ({ name: t.tag_name, score: t.score })),
        searchTerms: [],
        analyzerModel: doc.analyzer_model || 'gemini-3.8-flash',
        chunksCount: validDbChunks.length,
        chunks: validDbChunks.map(c => ({
          id: c.id,
          chunkIndex: c.chunk_index,
          headingTitle: c.heading_title || '',
          headingLevel: c.heading_level || 0,
          headingPath: c.heading_path || '',
          startLine: c.start_line,
          endLine: c.end_line,
          chunkSummary: c.chunk_summary || '',
          keywords: c.keywords ? (typeof c.keywords === 'string' ? c.keywords.split(',').map(s => s.trim()) : c.keywords) : [],
          chunkText: c.chunk_text || ''
        }))
      };

      return Response.json({ ok: true, detail });
    }

    // 5. 지식 문서 삭제 (delete)
    if (subPath === 'delete') {
      const { documentId, filePath, deleteAllErrors } = body;
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: true, success: true, deletedCount: 0 });

      if (deleteAllErrors) {
        const errorDocs = db.prepare("SELECT id FROM knowledge_documents WHERE status = 'ERROR'").all();
        if (errorDocs.length > 0) {
          db.exec('BEGIN TRANSACTION;');
          try {
            for (const row of errorDocs) {
              db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM knowledge_jobs WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(row.id);
            }
            db.exec('COMMIT;');
          } catch (e) {
            db.exec('ROLLBACK;');
            throw e;
          }
        }
        return Response.json({ ok: true, success: true, deletedCount: errorDocs.length });
      }

      let targetId = documentId;
      if (!targetId && filePath) {
        let row = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ?').get(filePath);
        if (!row) {
          const normSlash = filePath.replace(/\\/g, '/');
          const normBack = filePath.replace(/\//g, '\\');
          row = db.prepare("SELECT id FROM knowledge_documents WHERE replace(file_path, '\\', '/') = ? OR replace(file_path, '/', '\\') = ?").get(normSlash, normBack);
        }
        if (!row) {
          const fileName = filePath.split(/[/\\]/).pop() || '';
          if (fileName) {
            row = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ? OR file_path LIKE ? OR file_path LIKE ? LIMIT 1').get(
              fileName,
              `%/${fileName}`,
              `%\\${fileName}`
            );
          }
        }
        if (row) targetId = row.id;
      }
      if (targetId) {
        db.exec('BEGIN TRANSACTION;');
        try {
          db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM knowledge_jobs WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(targetId);
          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }
      }
      return Response.json({ ok: true, success: true });
    }

    // 6. 리소스 폴더 및 DB 초기화 (init)
    if (subPath === 'init') {
      const { forceReset, reason } = body;
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 설정되지 않았습니다.' }, { status: 400 });

      for (const dir of ['profiles', 'prompt', 'bible', 'media', 'db']) {
        const p = path.join(safeFolder, dir);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      }

      const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      // 초기화 전 자동 스냅샷 백업
      if (forceReset && fs.existsSync(dbPath)) {
        try {
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const snapName = `knowledge_backup_before_reset_${ts}.db`;
          
          let snapDocCount = 0;
          let snapDocTitles = [];
          if (desktopDbCache.has(dbPath)) {
            try {
              const curDb = desktopDbCache.get(dbPath);
              const cnt = curDb.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get();
              snapDocCount = cnt?.c || 0;
              snapDocTitles = curDb.prepare('SELECT title FROM knowledge_documents LIMIT 5').all().map(r => r.title);
              curDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
            } catch {}
          }
          fs.copyFileSync(dbPath, path.join(backupsDir, snapName));

          const manifestPath = path.join(backupsDir, 'backups_manifest.json');
          let manifest = {};
          try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
          manifest[snapName] = {
            reason: reason || '지식 DB 초기화 직전 자동 백업',
            docCount: snapDocCount,
            docTitles: snapDocTitles,
            createdAt: new Date().toISOString()
          };
          try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}
        } catch (snapErr) {
          console.warn('[handleDesktopKnowledgeApi] Reset snapshot failed:', snapErr);
        }
      }

      const db = getDesktopKnowledgeDb(resourceFolder, true);
      if (forceReset && db) {
        db.exec('BEGIN TRANSACTION;');
        try {
          db.prepare('DELETE FROM document_chunks_fts;').run();
          db.prepare('DELETE FROM document_tags;').run();
          db.prepare('DELETE FROM document_chunks;').run();
          db.prepare('DELETE FROM knowledge_documents;').run();
          db.prepare('DELETE FROM knowledge_jobs;').run();
          db.prepare('DELETE FROM knowledge_collections;').run();
          db.exec('COMMIT;');
          try { db.exec('VACUUM;'); } catch {}
        } catch (e) {
          db.exec('ROLLBACK;');
        }
      }

      // 최신 백업 목록 조회하여 반환
      let backups = [];
      try {
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '지식 데이터베이스 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {}

      return Response.json({ ok: true, message: '지식 데이터베이스가 성공적으로 초기화되었습니다.', path: safeFolder, backups });
    }

    // 7. 작업 큐 관리 (queue)
    if (subPath === 'queue') {
      if (request.method === 'GET') {
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (!db) return Response.json({ ok: true, jobs: [], total: 0 });

        let query = 'SELECT * FROM knowledge_jobs';
        const params = [];
        if (status && status !== 'ALL') {
          query += ' WHERE status = ?';
          params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const jobs = db.prepare(query).all(...params);
        return Response.json({ ok: true, jobs, total: jobs.length });
      }

      if (request.method === 'POST') {
        const { action } = body;
        const db = getDesktopKnowledgeDb(resourceFolder, true);

        if (action === 'ENQUEUE_BATCH') {
          const items = body.items || body.jobs || [];
          let enqueued = 0, suppressed = 0;
          for (const it of items) {
            const targetHash = it.targetHash || '';
            const existing = db.prepare(`
              SELECT id FROM knowledge_jobs
              WHERE file_path = ? AND target_hash = ? AND status IN ('QUEUED', 'RUNNING')
            `).get(it.filePath, targetHash);
            if (existing) {
              suppressed++;
              continue;
            }
            const docId = it.documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const now = new Date().toISOString();
            db.prepare(`
              INSERT INTO knowledge_jobs (id, document_id, file_path, title, job_type, target_hash, priority, status, current_step, retry_count, max_retries, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'QUEUED', 0, 3, ?)
            `).run(jobId, docId, it.filePath, it.title || null, it.jobType || 'INDEX', targetHash, it.priority || 3, now);
            enqueued++;
          }
          return Response.json({ ok: true, enqueued, enqueuedCount: enqueued, suppressed });
        }

        if (action === 'CANCEL') {
          db.prepare("UPDATE knowledge_jobs SET status = 'CANCELLED' WHERE id = ? AND status IN ('QUEUED', 'RUNNING')").run(body.jobId);
          return Response.json({ ok: true });
        }

        if (action === 'RETRY') {
          db.prepare("UPDATE knowledge_jobs SET status = 'QUEUED', retry_after = NULL, error_log = NULL WHERE status = 'FAILED'").run();
          return Response.json({ ok: true });
        }

        if (action === 'CLEAR_COMPLETED') {
          db.prepare("DELETE FROM knowledge_jobs WHERE status = 'SUCCESS'").run();
          return Response.json({ ok: true });
        }

        if (action === 'CLEAR_FAILED') {
          db.prepare("DELETE FROM knowledge_jobs WHERE status = 'FAILED'").run();
          return Response.json({ ok: true });
        }

        // 단일 작업 등록
        const { documentId, filePath, title, targetHash, priority, jobType } = body;
        if (!filePath) return Response.json({ ok: false, message: 'filePath가 필요합니다.' }, { status: 400 });
        const docId = documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO knowledge_jobs (id, document_id, file_path, title, job_type, target_hash, priority, status, current_step, retry_count, max_retries, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'QUEUED', 0, 3, ?)
        `).run(jobId, docId, filePath, title || null, jobType || 'INDEX', targetHash || '', priority || 3, now);
        const job = db.prepare('SELECT * FROM knowledge_jobs WHERE id = ?').get(jobId);
        return Response.json({ ok: true, job });
      }
    }

    // 8. 큐 다음 작업 선점 (queue/pop)
    if (subPath === 'queue/pop') {
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: true, job: null });
      const nowIso = new Date().toISOString();
      const candidate = db.prepare(`
        SELECT * FROM knowledge_jobs
        WHERE status = 'QUEUED'
          AND (retry_after IS NULL OR retry_after <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(nowIso);
      if (!candidate) {
        return Response.json({ ok: true, job: null });
      }
      db.prepare("UPDATE knowledge_jobs SET status = 'RUNNING', started_at = ? WHERE id = ?").run(nowIso, candidate.id);
      const popped = db.prepare('SELECT * FROM knowledge_jobs WHERE id = ?').get(candidate.id);
      return Response.json({ ok: true, job: popped });
    }

    // 9. 큐 작업 파이프라인 단계 갱신 (queue/step)
    if (subPath === 'queue/step') {
      const { jobId, step, errorLog } = body;
      if (!jobId || !step) return Response.json({ ok: false, message: 'jobId와 step이 필요합니다.' }, { status: 400 });
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (db) {
        db.prepare("UPDATE knowledge_jobs SET current_step = ?, error_log = COALESCE(?, error_log) WHERE id = ?").run(step, errorLog || null, jobId);
      }
      return Response.json({ ok: true });
    }

    // 10. 큐 작업 완료/실패 처리 (queue/complete)
    if (subPath === 'queue/complete') {
      const { jobId, success, errorLog, backoffSeconds } = body;
      if (!jobId) return Response.json({ ok: false, message: 'jobId가 필요합니다.' }, { status: 400 });
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (db) {
        const nowIso = new Date().toISOString();
        if (success) {
          db.prepare("UPDATE knowledge_jobs SET status = 'SUCCESS', completed_at = ?, error_log = NULL WHERE id = ?").run(nowIso, jobId);
        } else {
          const job = db.prepare('SELECT retry_count, max_retries FROM knowledge_jobs WHERE id = ?').get(jobId);
          const retryCount = (job?.retry_count || 0) + 1;
          const maxRetries = job?.max_retries || 3;
          if (retryCount >= maxRetries) {
            db.prepare("UPDATE knowledge_jobs SET status = 'FAILED', retry_count = ?, completed_at = ?, error_log = ? WHERE id = ?").run(retryCount, nowIso, errorLog || null, jobId);
          } else {
            const delaySec = backoffSeconds || Math.pow(2, retryCount) * 2;
            const retryAfter = new Date(Date.now() + delaySec * 1000).toISOString();
            db.prepare("UPDATE knowledge_jobs SET status = 'QUEUED', retry_count = ?, retry_after = ?, error_log = ? WHERE id = ?").run(retryCount, retryAfter, errorLog || null, jobId);
          }
        }
      }
      return Response.json({ ok: true });
    }

    // 11. 마크다운 문서 색인 및 AI 분석 (index)
    if (subPath === 'index') {
      let { filePath, fileContent, title, geminiApiKey, aiModelName } = body;
      if (!fileContent && filePath && fs.existsSync(filePath)) {
        try { fileContent = decodeFileBuffer(fs.readFileSync(filePath)); } catch {}
      }
      if (!filePath || !fileContent) {
        return Response.json({ ok: false, message: 'filePath와 fileContent는 필수 항목입니다.' }, { status: 400 });
      }

      const db = getDesktopKnowledgeDb(resourceFolder, true);
      const crypto = require('crypto');
      const existingDoc = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ? OR file_path = ?').get(filePath, filePath.replace(/\\/g, '/'));
      const docId = existingDoc?.id || `doc_${crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 16)}`;
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      const fileSize = Buffer.byteLength(fileContent, 'utf-8');
      const docTitle = title || path.basename(filePath).replace(/\.md$/i, '') || '문서';
      const nowIso = new Date().toISOString();

      // 청킹 (고도화된 청커에 docTitle 전달)
      const chunks = chunkMarkdownByHeadingsHelper(docId, fileContent, docTitle);

      // AI 분석 실패 또는 키 미제공 시 본문 및 청크 기반의 의미 있는 정형 데이터 폴백 생성 (절대 "~마크다운 문서입니다", "#마크다운", "#지식문서" 금지)
      // 1) 문서 내 '3줄 요약', '요약', '개요' 섹션 본문 자동 탐지
      let docSummary = '';
      const summarySectionMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?(?:.*요약|.*개요)[\s\S]*?(?=(?:^###|\n---|$(?![\r\n])))/im);
      if (summarySectionMatch) {
        const summaryLines = summarySectionMatch[0]
          .split(/\r?\n/)
          .slice(1)
          .map(l => l.replace(/^>\s*/, '').replace(/^[0-9*.\-]+\s*/, '').replace(/\*\*/g, '').trim())
          .filter(l => l.length > 10);
        if (summaryLines.length > 0) {
          docSummary = summaryLines.slice(0, 3).join(' ');
        }
      }

      // 2) 요약 섹션이 없으면 본문 첫 실질 문단(30자 이상, 안내문구 제외) 추출
      if (!docSummary) {
        const mainSectionMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?본문[\s\S]*/i);
        const contentToSearch = mainSectionMatch ? mainSectionMatch[0] : fileContent;
        const paras = contentToSearch
          .replace(/^---[\s\S]*?---\s*/, '')
          .split(/\r?\n\r?\n/)
          .map(p => p.replace(/^[#*>\-!\[\]()]+\s*/gm, '').replace(/\*\*/g, '').trim())
          .filter(p => p.length > 30 && !p.startsWith('http') && !p.includes('온리비 어서'));
        if (paras.length > 0) {
          docSummary = paras[0].slice(0, 250);
        }
      }

      // 3) 태그 자동 추출:
      // (1) 문서 내 해시태그(#...) 또는 키워드 감지
      const extractedTags = [];
      const hashtagMatch = fileContent.match(/#[가-힣a-zA-Z0-9_]{2,}/g);
      if (hashtagMatch) {
        const unique = [...new Set(hashtagMatch.map(t => t.replace(/^#/, '')))]
          .filter(t => !['서식설정', '마크다운', '지식문서', '텍스트', '문서'].includes(t));
        unique.slice(0, 8).forEach((t, i) => {
          extractedTags.push({ name: t, score: Math.max(70, 95 - i * 3) });
        });
      }

      // (2) 해시태그가 없을 경우 문서 제목, 볼드 메타데이터, 헤딩에서 실질적인 도메인 키워드 자동 추출
      if (extractedTags.length === 0) {
        const cleanTitle = docTitle.replace(/^[A-Z0-9_\-\[\]]+/, '').replace(/[_\s\-\[\]()]+/g, ' ').trim();
        const titleWords = (cleanTitle || docTitle).split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2 && !['문서', '블로그', '정리'].includes(w));

        const metaWords = [];
        const metaMatches = [...fileContent.matchAll(/\*\*(?:문서명|프로젝트명|적용 대상|문서 유형|핵심 가치|주제)\*\*:\s*([^\n\r]+)/g)];
        for (const m of metaMatches) {
          const words = m[1].replace(/[_\s\-\[\]():/]+/g, ' ').split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2);
          metaWords.push(...words);
        }

        const headingWords = [];
        for (const c of chunks) {
          if (c.headingTitle && !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText)) {
            const hText = c.headingTitle.replace(/^[0-9.]+\s*/, '').replace(/[_\s\-\[\]():/]+/g, ' ').trim();
            if (hText && !/^(메타|서식|CSS|프로필)/i.test(hText)) {
              const words = hText.split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2 && !['우리가', '얻는', '대한', '위한', '개요', '목적', '정리'].includes(w));
              headingWords.push(...words);
            }
          }
        }

        const stopWords = new Set(['PRD', 'CHA', '000', '001', 'Overview', 'Target', 'Personas', 'Architecture', 'v1', 'v2', 'v2.0', 'Approved', '문서']);
        const combined = [...new Set([...titleWords, ...metaWords, ...headingWords])].filter(w => w.length >= 2 && !stopWords.has(w));
        combined.slice(0, 8).forEach((w, i) => {
          extractedTags.push({ name: w, score: Math.max(70, 95 - i * 3) });
        });
      }

      if (extractedTags.length === 0) {
        extractedTags.push({ name: docTitle.replace(/^[0-9_]+/, '').slice(0, 15), score: 90 });
      }

      // 4) SEO 키워드 섹션 감지
      const seoMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?SEO\s*키워드[\s\S]*?(?=(?:^###|\n---|$(?![\r\n])))/i);
      const searchTerms = [];
      if (seoMatch) {
        const rawTerms = seoMatch[0].split(/\r?\n/).slice(1).join(' ')
          .split(/[,，\s]+/)
          .map(t => t.trim())
          .filter(t => t.length >= 2 && !['SEO', '키워드'].includes(t));
        searchTerms.push(...[...new Set(rawTerms)].slice(0, 8));
      }

      // 5) 핵심 요점(key_points): 제목 껍데기만 읽지 않고, 제목과 그 안의 실제 하위 항목/근거/질문 본문을 종합하여 유효한 정보로 추출
      const keyPoints = [];
      chunks.forEach(c => {
        const title = (c.headingTitle || '').trim();
        if (
          !title ||
          /^(메타정보|서식설정|해시태그|SEO|바쁜|제목\s*후보|이미지|[0-9.]*\s*제목|[0-9.]*\s*SEO|[0-9.]*\s*해시태그|[0-9.]*\s*바쁜|[0-9.]*\s*이미지|[0-9.]*\s*1:1)/i.test(title) ||
          title.includes('서두 및 메타정보') ||
          /^[0-9.]*\s*본문$/i.test(title)
        ) {
          return;
        }

        const cleanTitle = title
          .replace(/^[0-9.]*\s*/, '')
          .replace(/^[📌💡\s]+/, '')
          .replace(/\s*\([^)]*(?:가지|개|추천)[^)]*\)/g, '')
          .trim();

        const chunkText = c.chunkText || '';
        const bodyLines = chunkText
          .split(/\r?\n/)
          .slice(1)
          .filter(l => !l.startsWith('>') && !l.startsWith('![') && !l.includes('온리비') && !l.includes('onrivi.com'));

        const cleanBody = bodyLines.join('\n');

        // 1) 본문 내 번호 매겨진 볼드체 항목 탐색 (예: **1. 동네 소규모...**)
        const boldMatches = [...cleanBody.matchAll(/\*\*(?:[0-9]+[.)]\s*)?([^*:\n]+)\*\*/g)];
        const items = boldMatches
          .map(m => m[1].trim())
          .filter(item => item.length >= 4 && !item.startsWith('이미지') && !item.startsWith('의안') && !item.startsWith('대표발의') && !item.startsWith('발의일자'));

        if (items.length >= 2) {
          const summaryItems = items.slice(0, 3).map(it => it.replace(/^[0-9]+[.)]\s*/, '')).join(' / ');
          keyPoints.push(`[${cleanTitle}] ${summaryItems}`);
          return;
        }

        // 2) 불릿 리스트 탐색
        const bulletMatches = [...cleanBody.matchAll(/^\s*[*+-]\s*(?:\*\*([^*]+)\*\*\s*[:：]?)?\s*([^\n\r]+)/gm)];
        if (bulletMatches.length > 0) {
          const bulletSummaries = bulletMatches
            .map(m => {
              const t = m[1] ? m[1].trim() : '';
              const d = m[2] ? m[2].trim().replace(/\*\*/g, '') : '';
              if (t && d && !d.startsWith(t)) {
                return `${t}: ${d.slice(0, 40)}`;
              }
              return t || d;
            })
            .filter(s => s.length > 3 && !s.includes('의안번호'));

          if (bulletSummaries.length > 0) {
            keyPoints.push(`[${cleanTitle}] ${bulletSummaries.slice(0, 2).join(' / ')}`);
            return;
          }
        }

        // 3) 질문이나 본문 실제 내용 문단 추출
        const paragraphs = cleanBody
          .split(/\r?\n\r?\n/)
          .map(p => p.replace(/^[#*>\-!\[\]()]+\s*/gm, '').replace(/\*\*/g, '').trim())
          .filter(p => p.length > 25 && !p.startsWith('http') && !p.startsWith('하단'));

        if (paragraphs.length > 0) {
          const focusPara = paragraphs.find(p => /개요|목적|배경|요건|정의|핵심|특징|기준|방침|기능|절차|규약|설계/i.test(p));
          const chosenPara = (focusPara || paragraphs[0]).replace(/\r?\n/g, ' ').slice(0, 110);
          keyPoints.push(`[${cleanTitle}] ${chosenPara}`);
        } else {
          keyPoints.push(cleanTitle);
        }
      });

      let analysis = {
        summary: docSummary || `${docTitle}: 본 문서의 핵심 주제, 요구사항 및 주요 도메인 지식 정보를 정리한 문서입니다.`,
        key_points: keyPoints.length > 0 ? keyPoints.slice(0, 6) : [docTitle],
        document_type: 'guide',
        tags: extractedTags,
        search_terms: searchTerms.length > 0 ? searchTerms : [docTitle, ...keyPoints.slice(0, 4)]
      };

      if (geminiApiKey && geminiApiKey.trim()) {
        try {
          const modelToUse = (aiModelName || 'gemini-3.8-flash').trim();
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiApiKey.trim()}`;
          const isGemma = modelToUse.toLowerCase().startsWith('gemma');

          const prompt = `You are a professional knowledge base (RAG) document analysis AI.
Analyze the given markdown document and respond with ONLY a single valid JSON object.
CRITICAL: Do NOT write any introduction, greetings, or markdown explanations. Start your response directly with { and end with }.

[ANALYSIS GUIDELINES]:
1. summary: Summarize the core topic, real-world domain, objectives, and key contents of THIS SPECIFIC document in 2~3 clear Korean sentences. DO NOT say "이 문서는 마크다운 문서입니다".
2. key_points: CRITICAL: NEVER just output superficial headings or table of contents titles. Instead, synthesize the heading AND the actual detailed sub-bullets, arguments, requirements, or facts underneath into informative, substantive sentences (3~6 points).
3. tags: Extract 5~10 specific domain tags strictly from THIS document (e.g. project names, domain terms, core features, technologies, entities) with scores 60~100. NEVER use generic tags like "#마크다운" or "#지식문서". NEVER output tags from other unrelated domains.
4. search_terms: Extract 5~10 search query terms that users would use to find THIS specific document.

[JSON OUTPUT FORMAT]:
{
  "summary": "해당 문서의 핵심 주제, 목적, 주요 내용을 포괄하는 명확한 요약문 (2~3문장)",
  "key_points": [
    "[분야 또는 섹션명 1] 세부 실질 내용 1",
    "[분야 또는 섹션명 2] 세부 실질 내용 2",
    "[분야 또는 섹션명 3] 세부 실질 내용 3"
  ],
  "document_type": "guide",
  "tags": [
    { "name": "문서_핵심_키워드1", "score": 95 },
    { "name": "문서_도메인_용어2", "score": 90 }
  ],
  "search_terms": ["문서 관련 검색어 1", "문서 관련 검색어 2"]
}

[MARKDOWN DOCUMENT]:
${fileContent.slice(0, 15000)}`;

          let attempts = 0;
          const maxAttempts = 3;
          while (attempts < maxAttempts) {
            try {
              attempts++;
              const requestBody = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: isGemma ? { temperature: 0.2 } : { responseMimeType: 'application/json', temperature: 0.2 }
              };

              const aiRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const textOut = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textOut) {
                  const parsed = parseAndRepairLlmJson(textOut);

                  if (parsed && typeof parsed === 'object') {
                    if (parsed.summary && typeof parsed.summary === 'string' && !parsed.summary.includes('마크다운 문서입니다')) {
                      analysis.summary = parsed.summary;
                    }
                    if (Array.isArray(parsed.key_points) && parsed.key_points.length > 0) {
                      analysis.key_points = parsed.key_points;
                    }
                    if (parsed.document_type) {
                      analysis.document_type = parsed.document_type;
                    }
                    if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                      const filteredTags = parsed.tags.filter(t => {
                        const name = (typeof t === 'string' ? t : t?.name || '').replace(/^#/, '').trim();
                        return name && !['마크다운', '지식문서', '문서', '텍스트'].includes(name);
                      }).map(t => typeof t === 'string' ? { name: t.replace(/^#/, '').trim(), score: 85 } : { name: String(t.name).replace(/^#/, '').trim(), score: Number(t.score) || 80 });

                      if (filteredTags.length > 0) {
                        analysis.tags = filteredTags;
                      }
                    }
                    if (Array.isArray(parsed.search_terms) && parsed.search_terms.length > 0) {
                      analysis.search_terms = parsed.search_terms;
                    }
                    break;
                  } else {
                    console.warn(`[DesktopKnowledgeApi] AI 응답에서 JSON 파싱 실패 (시도 ${attempts}/${maxAttempts}). 스마트 본문 추출 폴백을 준비합니다.`);
                    if (attempts < maxAttempts) {
                      await new Promise(r => setTimeout(r, 1000));
                      continue;
                    }
                  }
                }
                break;
              } else if (attempts < maxAttempts) {
                console.warn(`[DesktopKnowledgeApi] AI 분석 ${attempts}회차 HTTP ${aiRes.status}. 3초 후 재시도합니다...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
            } catch (aiAttemptErr) {
              if (attempts < maxAttempts) {
                console.warn(`[DesktopKnowledgeApi] AI 분석 ${attempts}회차 통신오류. 3초 후 재시도합니다...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
              throw aiAttemptErr;
            }
          }
        } catch (aiErr) {
          console.warn('[DesktopKnowledgeApi] AI analysis fallback used:', aiErr.message);
        }
      }

      // 메타/보조 청크 제외한 실질 청크 필터링 (트랜잭션 및 반환 공통 스코프)
      const validChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText, c.startLine, c.endLine));

      // Rule 7 준수: 단일 트랜잭션으로 원자적 쓰기 (All-or-Nothing)
      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(docId);
        db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(docId);
        db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(docId);

        db.prepare(`
          INSERT INTO knowledge_documents (
            id, file_path, title, file_hash, file_size, modified_at,
            summary, key_points, document_type, priority, status,
            analyzer_model, analyzed_at, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?)
          ON CONFLICT(file_path) DO UPDATE SET
            title = excluded.title,
            file_hash = excluded.file_hash,
            file_size = excluded.file_size,
            modified_at = excluded.modified_at,
            summary = excluded.summary,
            key_points = excluded.key_points,
            document_type = excluded.document_type,
            priority = excluded.priority,
            status = 'READY',
            error_message = NULL,
            analyzer_model = excluded.analyzer_model,
            analyzed_at = excluded.analyzed_at,
            indexed_at = excluded.indexed_at
        `).run(
          docId, filePath, docTitle, fileHash, fileSize, nowIso,
          analysis.summary, JSON.stringify(analysis.key_points), analysis.document_type, 3,
          aiModelName || 'gemini-3.8-flash', nowIso, nowIso
        );

        const insertChunkStmt = db.prepare(`
          INSERT INTO document_chunks (
            id, document_id, chunk_index, heading_title, heading_level,
            heading_path, start_line, end_line, chunk_summary, keywords, chunk_text, chunk_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertFtsStmt = db.prepare(`
          INSERT INTO document_chunks_fts (
            chunk_id, document_id, heading_title, keywords, chunk_text
          ) VALUES (?, ?, ?, ?, ?)
        `);

        for (const c of validChunks) {
          const kwStr = Array.isArray(c.keywords) ? c.keywords.join(', ') : (c.keywords || '');
          insertChunkStmt.run(
            c.id, docId, c.chunkIndex, c.headingTitle || null, c.headingLevel || 0,
            c.headingPath || null, c.startLine, c.endLine, c.chunkSummary || null, kwStr,
            c.chunkText || '', c.chunkType || 'section'
          );
          insertFtsStmt.run(
            c.id, docId, c.headingTitle || '', kwStr, c.chunkText || ''
          );
        }

        if (Array.isArray(analysis.tags)) {
          const insertTagStmt = db.prepare(`
            INSERT INTO document_tags (document_id, tag_name, score, source)
            VALUES (?, ?, ?, 'AI')
          `);
          for (const t of analysis.tags) {
            if (t && t.name) {
              insertTagStmt.run(docId, String(t.name).trim(), Math.min(100, Math.max(0, Number(t.score || 80))));
            }
          }
        }

        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }

      const detail = {
        documentId: docId,
        filePath,
        title: docTitle,
        fileSize,
        modifiedAt: nowIso,
        status: 'READY',
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        documentType: analysis.document_type,
        tags: analysis.tags,
        searchTerms: analysis.search_terms,
        analyzerModel: aiModelName || 'gemini-3.8-flash',
        chunksCount: validChunks.length,
        chunks: validChunks
      };

      return Response.json({ ok: true, documentId: docId, chunksCount: validChunks.length, detail });
    }

    // 12. 하이브리드/FTS 검색 (search)
    if (subPath === 'search') {
      const { query, limit = 20 } = body;
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db || !query || !query.trim()) return Response.json({ ok: true, candidates: [] });

      // 1. 한국어 자연어/구어체 프롬프트에서 핵심 검색 키워드 추출
      const stopwords = new Set([
        '최근', '요즘', '현재', '과거', '주요', '기존', '새로운', '신규',
        '관련', '관련된', '관련한', '관련하여', '관해서', '관하여', '관한', '관해',
        '대해', '대해서', '대하여', '대한',
        '알려줘', '알려줄래', '알려주세요', '알려', '알려주기',
        '설명해줘', '설명해', '설명해주세요', '설명',
        '요약해줘', '요약해', '요약해주세요', '요약',
        '정리해줘', '정리해', '정리해주세요', '정리',
        '찾아줘', '찾아줄래', '찾아주세요', '검색해줘', '검색',
        '말해줘', '말해줄래', '말해주세요', '이야기',
        '써줘', '써주세요', '써줄래', '작성해줘', '작성', '작성하기',
        '가르쳐줘', '가르쳐주세요', '보여줘', '보여주세요',
        '무엇', '어떤', '어떻게', '있는', '있는지', '있는가', '인가',
        '내용', '내용을', '내용은', '내용이', '내용과', '정보', '자료', '문서', '항목', '사항'
      ]);
      const josaRegex = /(은|는|이|가|을|를|의|에|에게|에서|로|으로|와|과|도|만|처럼|같이|부터|까지|하고|하여|해서|해줘|해줄래|해주세요|인|인스턴스|에는|에도|에게는|에게도|과도|와도)?$/;

      const cleanedQuery = query.replace(/[^\w\s가-힣]/g, ' ').trim();
      const rawTokens = cleanedQuery.split(/\s+/).filter(Boolean);
      const keywordsSet = new Set();

      for (const token of rawTokens) {
        const word = token.toLowerCase();
        let stripped = word.replace(josaRegex, '');
        if (stripped.length > 3 && stripped.endsWith('내용')) stripped = stripped.slice(0, -2);
        if (stripped.length > 3 && stripped.endsWith('관련')) stripped = stripped.slice(0, -2);

        if (stopwords.has(word) || stopwords.has(stripped)) continue;

        if (stripped.length >= 2) {
          keywordsSet.add(stripped);
        } else if (word.length >= 2 && !stopwords.has(word)) {
          keywordsSet.add(word);
        }
      }

      const keywords = Array.from(keywordsSet);
      if (keywords.length === 0 && cleanedQuery) {
        keywords.push(...cleanedQuery.split(/\s+/).filter(w => w.length >= 2));
      }

      if (keywords.length === 0) {
        return Response.json({ ok: true, candidates: [] });
      }

      const candidateMap = new Map();
      const addCandidate = (r, baseScore, matchType) => {
        if (isMetaOrAuxiliaryChunk(r.heading_title, r.chunk_text, r.start_line, r.end_line)) {
          return;
        }
        if (!candidateMap.has(r.chunk_id)) {
          candidateMap.set(r.chunk_id, { ...r, baseScore, matchType });
        }
      };

      // 2-1. FTS5 AND 검색 (모든 키워드 일치 청크 우선)
      if (keywords.length > 1) {
        const andGroup = keywords.map(k => `"${k}"*`).join(' AND ');
        try {
          const andRows = db.prepare(`
            SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                   c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                   COALESCE(c.chunk_type, 'section') as chunk_type,
                   d.title as doc_title, d.file_path, d.file_hash, d.priority,
                   bm25(document_chunks_fts) as rank
            FROM document_chunks_fts f
            JOIN document_chunks c ON c.id = f.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE document_chunks_fts MATCH ?
              AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
            ORDER BY rank ASC
            LIMIT ?
          `).all(andGroup, limit);

          for (const r of andRows) {
            addCandidate(r, 95, 'AND');
          }
        } catch (ftsErr) {
          console.warn('[DesktopKnowledgeApi] FTS AND search error:', ftsErr.message);
        }
      }

      // 2-2. FTS5 OR 검색 보강 (AND 결과가 부족한 경우)
      if (candidateMap.size < limit * 2) {
        const orGroup = keywords.map(k => `"${k}"*`).join(' OR ');
        try {
          const orRows = db.prepare(`
            SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                   c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                   COALESCE(c.chunk_type, 'section') as chunk_type,
                   d.title as doc_title, d.file_path, d.file_hash, d.priority,
                   bm25(document_chunks_fts) as rank
            FROM document_chunks_fts f
            JOIN document_chunks c ON c.id = f.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE document_chunks_fts MATCH ?
              AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
            ORDER BY rank ASC
            LIMIT ?
          `).all(orGroup, limit * 3);

          for (const r of orRows) {
            addCandidate(r, 85, 'OR');
          }
        } catch (ftsErr) {
          console.warn('[DesktopKnowledgeApi] FTS OR search error:', ftsErr.message);
        }
      }

      // 2-3. 문서 제목(Title), 태그(Tag), 헤딩(Heading) LIKE 검색 보강
      if (candidateMap.size < limit) {
        for (const kw of keywords) {
          if (candidateMap.size >= limit * 2) break;
          try {
            const likeRows = db.prepare(`
              SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                     c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                     COALESCE(c.chunk_type, 'section') as chunk_type,
                     d.title as doc_title, d.file_path, d.file_hash, d.priority,
                     999 as rank
              FROM document_chunks c
              JOIN knowledge_documents d ON d.id = c.document_id
              WHERE (d.title LIKE ? OR c.heading_title LIKE ? OR c.keywords LIKE ?)
                AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
              ORDER BY c.chunk_index ASC
              LIMIT ?
            `).all(`%${kw}%`, `%${kw}%`, `%${kw}%`, limit);

            for (const r of likeRows) {
              addCandidate(r, 75, 'LIKE');
            }
          } catch {}
        }
      }

      // 3. 실질 본문 및 원자적 표 우대 가중치 계산
      const substantiveKeywords = ['제안이유', '주요내용', '요약', '실질적인 변화', '법률안', '개정안', '의안 정보', '시행 시기', '원스트라이크'];
      const tableQueryKeywords = ['표', '대비표', '일정', '번호', '비교', '현행', '개정안', '스펙', '정보'];
      const isTableQuery = tableQueryKeywords.some(tk => query.includes(tk));

      const ranked = Array.from(candidateMap.values()).map(c => {
        let score = c.baseScore;
        const heading = (c.heading_title || '').toLowerCase();

        if (substantiveKeywords.some(s => heading.includes(s))) {
          score += 10;
        }
        if (c.chunk_type === 'table') {
          score += isTableQuery ? 15 : 5;
        }
        const textLen = (c.chunk_text || '').length;
        if (textLen > 200) score += 5;

        const snippet = c.chunk_text || c.chunk_summary || '';
        const finalScore = Math.max(10, Math.min(100, score));

        return {
          id: c.chunk_id,
          chunkId: c.chunk_id,
          documentId: c.document_id,
          chunkIndex: c.chunk_index,
          headingTitle: c.heading_title,
          headingLevel: c.heading_level,
          headingPath: c.heading_path || c.heading_title,
          startLine: Number(c.start_line),
          endLine: Number(c.end_line),
          chunkSummary: c.chunk_summary,
          keywords: c.keywords,
          chunkText: c.chunk_text,
          chunkType: c.chunk_type || 'section',
          documentTitle: c.doc_title || c.heading_title,
          docTitle: c.doc_title || c.heading_title,
          filePath: c.file_path,
          fileHash: c.file_hash,
          priority: c.priority,
          snippet,
          matchSnippet: snippet.slice(0, 150),
          score: finalScore,
          finalScore,
          rank: c.rank
        };
      });

      ranked.sort((a, b) => b.score - a.score);
      const candidates = ranked.slice(0, limit);

      return Response.json({ ok: true, candidates, total: candidates.length });
    }

    // 13. 백업 및 복원 (backup, restore)
    if (subPath === 'backup') {
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 없습니다.' }, { status: 400 });
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      if (request.method === 'GET') {
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try {
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          }
        } catch {}

        const download = url.searchParams.get('download');
        const fileName = url.searchParams.get('fileName');

        if (download === 'current') {
          const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
          if (!fs.existsSync(dbPath)) return Response.json({ ok: false, message: 'DB 파일이 없습니다.' }, { status: 404 });
          const fileBuffer = fs.readFileSync(dbPath);
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          const dlName = `onrivi_knowledge_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.db`;
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${dlName}"`,
            }
          });
        }

        if (download === 'true' && fileName) {
          const cleanName = path.basename(fileName);
          const backupPath = path.join(backupsDir, cleanName);
          if (!fs.existsSync(backupPath)) return Response.json({ ok: false, message: '백업 파일을 찾을 수 없습니다.' }, { status: 404 });
          const fileBuffer = fs.readFileSync(backupPath);
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${cleanName}"`,
            }
          });
        }

        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        const backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '수동 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return Response.json({ ok: true, backups });
      }

      if (request.method === 'POST') {
        const { reason } = body;
        const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
        if (!fs.existsSync(dbPath)) return Response.json({ ok: false, message: '백업할 DB 파일이 없습니다.' }, { status: 404 });

        // WAL 체크포인트 수행하여 최신 데이터가 .db 파일에 물리적으로 쓰여지도록 보장
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        let docCount = 0;
        let docTitles = [];
        if (db) {
          try {
            db.exec('PRAGMA wal_checkpoint(PASSIVE);');
            const docs = db.prepare('SELECT title FROM knowledge_documents LIMIT 5').all();
            docCount = Number(db.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get()?.c || 0);
            docTitles = docs.map(d => d.title);
          } catch {}
        }

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const backupFileName = `knowledge_backup_${ts}.db`;
        const destPath = path.join(backupsDir, backupFileName);
        fs.copyFileSync(dbPath, destPath);

        const effectiveReason = reason && reason.trim() ? reason.trim() : (docCount > 0 ? `등록 문서 ${docCount}건 보존 백업` : '수동 백업');

        // backups_manifest.json 갱신
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try {
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          }
        } catch {}
        manifest[backupFileName] = {
          reason: effectiveReason,
          docCount,
          docTitles,
          createdAt: now.toISOString()
        };
        try {
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}

        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        const backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '수동 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return Response.json({
          ok: true,
          backup: { fileName: backupFileName, path: destPath, reason: effectiveReason },
          backups,
          message: `지식 데이터베이스 백업(${backupFileName})이 성공적으로 생성되었습니다.`
        });
      }

      if (request.method === 'DELETE') {
        const fileName = url.searchParams.get('fileName') || body.fileName;
        if (!fileName) return Response.json({ ok: false, message: '파일명이 필요합니다.' }, { status: 400 });
        const cleanName = path.basename(fileName);
        const target = path.join(backupsDir, cleanName);
        if (fs.existsSync(target)) fs.unlinkSync(target);

        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        try {
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            if (manifest[cleanName]) {
              delete manifest[cleanName];
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            }
          }
        } catch {}

        return Response.json({ ok: true, message: '백업 파일이 삭제되었습니다.' });
      }
    }

    if (subPath === 'restore') {
      const { backupFileName, fileName, reason, uploadedFileBase64, uploadedFileName } = body;
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 없습니다.' }, { status: 400 });
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');

      // 사전 안전 스냅샷 백업 (공통)
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const preRestoreName = `knowledge_backup_before_restore_${ts}.db`;
      const manifestPath = path.join(backupsDir, 'backups_manifest.json');
      let manifest = {};
      try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}

      if (fs.existsSync(dbPath)) {
        try {
          // DB 스냅샷 생성 전 문서 수 및 대표 제목 안전 조회
          let snapDocCount = 0;
          let snapDocTitles = [];
          if (desktopDbCache.has(dbPath)) {
            try {
              const curDb = desktopDbCache.get(dbPath);
              const cnt = curDb.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get();
              snapDocCount = cnt?.c || 0;
              snapDocTitles = curDb.prepare('SELECT title FROM knowledge_documents LIMIT 5').all().map(r => r.title);
              curDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
              curDb.close();
            } catch {}
            desktopDbCache.delete(dbPath);
          }

          fs.copyFileSync(dbPath, path.join(backupsDir, preRestoreName));
          manifest[preRestoreName] = {
            reason: reason || '원복 직전 자동 스냅샷',
            docCount: snapDocCount,
            docTitles: snapDocTitles,
            createdAt: new Date().toISOString()
          };
        } catch (snapErr) {
          console.warn('[handleDesktopKnowledgeApi] Pre-restore snapshot failed:', snapErr);
        }
      }

      // DB 캐시 비우기 + 잔여 WAL/SHM 제거
      if (desktopDbCache.has(dbPath)) {
        try { desktopDbCache.get(dbPath).close(); } catch {}
        desktopDbCache.delete(dbPath);
      }
      try { fs.unlinkSync(`${dbPath}-wal`); } catch {}
      try { fs.unlinkSync(`${dbPath}-shm`); } catch {}

      // ── 분기 A: 외부 파일 base64 업로드 원복 ──
      if (uploadedFileBase64 && uploadedFileName) {
        try {
          const buf = Buffer.from(uploadedFileBase64, 'base64');
          fs.writeFileSync(dbPath, buf);
        } catch (err) {
          return Response.json({ ok: false, message: `업로드 파일 쓰기 실패: ${err.message}` }, { status: 500 });
        }
        try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}
        const restoredDb2 = getDesktopKnowledgeDb(resourceFolder, false);
        let documents2 = [];
        if (restoredDb2) {
          try { documents2 = restoredDb2.prepare('SELECT id, file_path, title FROM knowledge_documents').all(); } catch {}
        }
        let backups2 = [];
        try {
          const files2 = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
          backups2 = files2.map(f => {
            const stat = fs.statSync(path.join(backupsDir, f));
            const m = manifest[f] || {};
            return {
              fileName: f,
              filePath: path.join(backupsDir, f),
              size: stat.size,
              createdAt: m.createdAt || stat.birthtime.toISOString(),
              reason: m.reason || '지식 데이터베이스 백업',
              docCount: typeof m.docCount === 'number' ? m.docCount : 0,
              docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
            };
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {}

        return Response.json({
          ok: true,
          message: `업로드된 파일(${uploadedFileName})로 지식 데이터베이스가 성공적으로 원복되었습니다.`,
          documents: documents2,
          backups: backups2
        });
      }

      // ── 분기 B: 기존 백업 파일에서 원복 ──
      const targetFileName = backupFileName || fileName;
      if (!targetFileName) return Response.json({ ok: false, message: '필수 인자가 누락되었습니다.' }, { status: 400 });
      const srcBackup = path.join(backupsDir, targetFileName);
      if (!fs.existsSync(srcBackup)) return Response.json({ ok: false, message: '백업 파일을 찾을 수 없습니다.' }, { status: 404 });

      fs.copyFileSync(srcBackup, dbPath);
      try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}

      // 복원 후 문서 목록 및 최신 백업 목록 조회
      const restoredDb = getDesktopKnowledgeDb(resourceFolder, false);
      let documents = [];
      if (restoredDb) {
        try { documents = restoredDb.prepare('SELECT id, file_path, title FROM knowledge_documents').all(); } catch {}
      }

      let backups = [];
      try {
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '지식 데이터베이스 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {}

      return Response.json({ 
        ok: true, 
        message: `지식 데이터베이스가 성공적으로 원복되었습니다. (${targetFileName})`,
        documents,
        backups
      });
    }

    return Response.json({ ok: false, message: `지원되지 않는 로컬 지식 엔드포인트: ${subPath}` }, { status: 404 });
  } catch (err) {
    console.error('[DesktopKnowledgeApi Error]:', err);
    return Response.json({ ok: false, message: err?.message || '지식 API 처리 중 내부 오류 발생' }, { status: 500 });
  }
}

module.exports = {
  resolveSafeResourceFolder,
  getKnowledgeDbPath,
  applyDesktopKnowledgeSchema,
  getDesktopKnowledgeDb,
  handleDesktopKnowledgeApi,
};
