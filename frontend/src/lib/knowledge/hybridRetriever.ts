// ====================================================================
// 📊 [OMD-CORE-hybridRetriever-0001] hybridRetriever.ts ➔ Hybrid Search Retriever
// 🎯 @KICK  : SQLite FTS5 전문 검색, 후보군 내 상대 정규화(Candidate-Relative Normalization), 태그/헤딩/우선순위 가중 합산 검색 엔진 구현
// 🛡️ @GUARD : 음수 BM25 왜곡 방지, 0건 검색 방어, 컬렉션 필터링, 개별 점수 보존
// 🚨 @PATCH : **2026-09-16** — [의미 기반 RAG 표준 청킹(Semantic Chunking) 연동 및 원자적 표(Table) 가점화]:
//             1) RetrievalCandidate에 chunkType('section' | 'paragraph' | 'table' | 'code') 필드 연동
//             2) 표(Table) 질의 감지 시 표 청크 우선순위 우대 가점(+15) 부여 및 단독 청크 문맥 독립성 보장
// 🚨 @PATCH : **2026-09-16** — [메타/서식/SEO/해시태그 청크 100% 원천 배제(isMetaOrAuxiliaryChunk)]:
//             사용자 요청("메터는 지식자료에서 제외시켜줘")을 완벽 반영하여, FTS 및 LIKE 검색 결과에서
//             YAML 프론트매터, CSS 프로필 서식설정, SEO 키워드, 해시태그, 이미지 프롬프트 등 지식 가치 없는 부속 청크를 원천 필터링
// 🚨 @PATCH : **2026-09-16** — [Auto-RAG 한국어 자연어 질의 정밀 추출 및 FTS5 AND->OR 다중 티어 매칭 보강]: 1) 구어체 질문 불용어(최근, 요즘, 현재, 주요 등) 및 접미사(내용, 관련) 정제 추가 2) FTS5 AND 검색 결과 부재 시 OR 검색 및 제목/태그 LIKE 다중 티어 폴백 지원 3) 메타 청크 감점 및 제안이유/요약 실질 본문 가점화로 RAG 컨텍스트 품질 극대화
// 🚨 @PATCH : **2026-09-12** — [무관한 문서 오매칭 및 0건 임의 폴백 전면 제거 / 정밀 키워드 FTS5 검색 확립]
//             1) 사용자 요구 반영("상관없는 문서가 나오지 않아야 정상"): FTS 0건 검색 시 최신 문서를 임의로 가져오던 fallbackSql 전면 영구 제거
//             2) 한국어 프롬프트 서술/요청 동사(기술해줘, 기술, 서술, 써줘 등) 불용어 필터링 완전 추가로 엉뚱한 개발 규약/문서 오매칭 원천 차단
//             3) 복합 검색어 대상 FTS5 AND 결합(`"${t}"* AND "${t2}"*`) 적용으로 모든 핵심어가 존재하는 경우에만 매칭되도록 검색 정밀도 대폭 격상
// 🚨 @PATCH : **2026-09-12** — [하이브리드 지식 검색 엔진 고도화: chunk_text 전체 발췌, 한국어 조사/불용어 필터링, 활성 청크 다중 상태 지원]
//             1) buildFtsQuery에서 한국어 조사 및 대화형 불용어를 정제하여 구어체 질의에서도 핵심 명사 키워드가 정확히 추출되도록 개선
//             2) document_chunks의 chunk_text 원문 컬럼을 추출하여 단순 요약문이 아닌 실제 청크 본문이 RAG 프롬프트에 주입되도록 보강
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] normalizeCandidateBm25, buildWeightedQuery, retrieveKnowledgeCandidates 최초 구현
// 🔗 @CALLS : node:sqlite, ../../types/knowledge.ts
// ====================================================================

import type { RetrievalCandidate, KnowledgeQuery } from '../../types/knowledge';
import { isMetaOrAuxiliaryChunk } from './markdownChunker';

/**
 * FTS5 BM25 점수(작을수록 우수)를 Top-K 후보군 내에서 0~100 스케일로 상대 정규화합니다.
 */
export function normalizeCandidateBm25(candidates: Array<{ rawBm25: number }>): number[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) return [100];

  const scores = candidates.map(c => c.rawBm25);
  const best = Math.min(...scores);   // FTS5는 작을수록 높은 일치도
  const worst = Math.max(...scores);

  if (best === worst) {
    return candidates.map(() => 100);
  }

  // Best = 100점, Worst = 0점
  return scores.map(score => {
    const normalized = ((worst - score) / (worst - best)) * 100;
    return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
  });
}

/**
 * 사용자 질의어를 분해하여 정확 일치 및 전방 일치 구문을 조합합니다.
 */
/**
 * 질의어에서 불용어와 조사를 제거하고 유의미한 검색 키워드 목록을 추출합니다.
 */
export function extractKeywords(rawQuery: string): string[] {
  const rawTerms = rawQuery
    .replace(/[^\w\s가-힣]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);

  if (rawTerms.length === 0) return [];

  const termsSet = new Set<string>();
  const josaRegex = /(은|는|이|가|을|를|의|에|에게|에서|로|으로|와|과|도|만|처럼|같이|부터|까지|하고|하여|해서|해줘|해줄래|해주세요|인|인스턴스|에는|에도|에게는|에게도|과도|와도)?$/;
  const conversationalStopwords = new Set([
    '최근', '요즘', '현재', '과거', '주요', '기존', '새로운', '신규',
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
    '관련', '관련된', '관련한', '관련하여', '관해서', '관하여', '관한', '관해',
    '대해', '대해서', '대하여', '대한',
    '내용', '글', '글을', '문서', '자료', '정보', '항목', '방법', '방식', '사항',
    '무엇', '어떤', '어떻게', '있는', '있는지', '있는가', '인가', '가장', '위', '아래', '통해', '위해',
    '대략', '자세히', '상세히', '친절히', '간단히', '명확히', '모두', '전부',
    '것', '것에', '것을', '것이', '것은'
  ]);

  for (const t of rawTerms) {
    const lower = t.toLowerCase();
    let stripped = lower.replace(josaRegex, '');
    if (stripped.length > 3 && stripped.endsWith('내용')) stripped = stripped.slice(0, -2);
    if (stripped.length > 3 && stripped.endsWith('관련')) stripped = stripped.slice(0, -2);

    if (conversationalStopwords.has(lower) || conversationalStopwords.has(stripped)) {
      continue;
    }
    if (stripped.length >= 2) {
      termsSet.add(stripped);
    } else if (lower.length >= 2 && !conversationalStopwords.has(lower)) {
      termsSet.add(lower);
    }
  }

  return Array.from(termsSet);
}

/**
 * 사용자 질의어를 분해하여 정확 일치 및 전방 일치 구문을 조합합니다.
 */
export function buildFtsQuery(rawQuery: string): string {
  const terms = extractKeywords(rawQuery);
  if (terms.length === 0) return '';

  // 1. 복합 검색어일 경우: 전체 구문 일치 또는 핵심어 전체 AND 결합을 최우선 적용하여 무관 문서 유입 차단
  if (terms.length > 1) {
    const phrase = `"${terms.join(' ')}"`;
    const andGroup = terms.map(t => `"${t}"*`).join(' AND ');
    return `(${phrase}) OR (${andGroup})`;
  }

  // 2. 단일 검색어: 전방 일치 및 정확 일치
  return `"${terms[0]}"* OR "${terms[0]}"`;
}

/**
 * SQLite 지식 DB에서 하이브리드 검색을 수행하여 순위화된 후보 청크 배열을 반환합니다.
 */
export function retrieveKnowledgeCandidates(
  db: any,
  queryParams: KnowledgeQuery
): RetrievalCandidate[] {
  const { query, collectionId, limit = 20 } = queryParams;
  if (!query || !query.trim()) return [];

  const keywords = extractKeywords(query);
  const ftsQuery = buildFtsQuery(query);

  let rawRows: any[] = [];

  const baseSelect = `
    SELECT 
      c.id AS chunk_id,
      c.document_id,
      c.heading_title,
      c.heading_path,
      c.start_line,
      c.end_line,
      c.chunk_summary,
      c.chunk_text,
      COALESCE(c.chunk_type, 'section') AS chunk_type,
      d.file_path,
      d.title AS document_title,
      d.file_hash,
      d.priority,
      d.summary AS doc_summary,
      bm25(document_chunks_fts) AS raw_bm25
    FROM document_chunks_fts fts
    JOIN document_chunks c ON fts.chunk_id = c.id
    JOIN knowledge_documents d ON c.document_id = d.id
  `;

  // 1단계: FTS5 AND 결합 검색 (최우선 정밀 매칭)
  if (ftsQuery) {
    let sql = `
      ${baseSelect}
      WHERE document_chunks_fts MATCH ?
        AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
    `;

    const params: any[] = [ftsQuery];
    if (collectionId) {
      sql += ' AND d.collection_id = ?';
      params.push(collectionId);
    }
    sql += ' ORDER BY raw_bm25 ASC LIMIT ?';
    params.push(limit);

    try {
      const stmt = db.prepare(sql);
      rawRows = (stmt.all ? stmt.all(...params) : stmt.all(params)) as any[];
    } catch {
      rawRows = [];
    }
  }

  // 2단계: AND 검색 결과가 부족하거나 없을 경우 FTS5 OR 결합 검색으로 보강
  if (rawRows.length < limit && keywords.length > 1) {
    const orFtsQuery = keywords.map(t => `"${t}"*`).join(' OR ');
    let orSql = `
      ${baseSelect}
      WHERE document_chunks_fts MATCH ?
        AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
    `;
    const orParams: any[] = [orFtsQuery];
    if (collectionId) {
      orSql += ' AND d.collection_id = ?';
      orParams.push(collectionId);
    }
    orSql += ' ORDER BY raw_bm25 ASC LIMIT ?';
    orParams.push(limit * 2);

    try {
      const orStmt = db.prepare(orSql);
      const orRows = (orStmt.all ? orStmt.all(...orParams) : orStmt.all(orParams)) as any[];
      const existingIds = new Set(rawRows.map(r => r.chunk_id));
      for (const r of orRows) {
        if (!existingIds.has(r.chunk_id)) {
          rawRows.push(r);
          existingIds.add(r.chunk_id);
        }
      }
    } catch {}
  }

  // 3단계: 여전히 결과가 없을 경우 문서 제목 및 헤딩 LIKE 매칭 보강
  if (rawRows.length === 0 && keywords.length > 0) {
    for (const kw of keywords) {
      if (rawRows.length >= limit) break;
      try {
        let likeSql = `
          SELECT 
            c.id AS chunk_id,
            c.document_id,
            c.heading_title,
            c.heading_path,
            c.start_line,
            c.end_line,
            c.chunk_summary,
            c.chunk_text,
            COALESCE(c.chunk_type, 'section') AS chunk_type,
            d.file_path,
            d.title AS document_title,
            d.file_hash,
            d.priority,
            d.summary AS doc_summary,
            999 AS raw_bm25
          FROM document_chunks c
          JOIN knowledge_documents d ON c.document_id = d.id
          WHERE (d.title LIKE ? OR c.heading_title LIKE ? OR c.keywords LIKE ?)
            AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
        `;
        const likeParams: any[] = [`%${kw}%`, `%${kw}%`, `%${kw}%`];
        if (collectionId) {
          likeSql += ' AND d.collection_id = ?';
          likeParams.push(collectionId);
        }
        likeSql += ' ORDER BY c.chunk_index ASC LIMIT ?';
        likeParams.push(limit);

        const likeStmt = db.prepare(likeSql);
        const likeRows = (likeStmt.all ? likeStmt.all(...likeParams) : likeStmt.all(likeParams)) as any[];
        const existingIds = new Set(rawRows.map(r => r.chunk_id));
        for (const r of likeRows) {
          if (!existingIds.has(r.chunk_id)) {
            rawRows.push(r);
            existingIds.add(r.chunk_id);
          }
        }
      } catch {}
    }
  }

  // 메타데이터, 서식 설정, SEO/해시태그 등 비본문 부속 청크 100% 원천 배제
  rawRows = rawRows.filter(r => !isMetaOrAuxiliaryChunk(r.heading_title, r.chunk_text, Number(r.start_line), Number(r.end_line)));

  if (rawRows.length === 0) return [];

  // 1. BM25 상대 정규화 (0~100)
  const normalizedBm25Scores = normalizeCandidateBm25(
    rawRows.map(r => ({ rawBm25: Number(r.raw_bm25) }))
  );

  // 2. 복합 점수 산출
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const substantiveKeywords = ['제안이유', '주요내용', '요약', '실질적인 변화', '법률안', '개정안', '의안 정보', '시행 시기', '원스트라이크'];
  const tableQueryKeywords = ['표', '대비표', '일정', '번호', '비교', '현행', '개정안', '스펙', '정보'];
  const isTableQuery = tableQueryKeywords.some(tk => query.includes(tk));

  const candidates: RetrievalCandidate[] = rawRows.map((row, idx) => {
    const normalizedFtsScore = normalizedBm25Scores[idx];

    // 태그 관련도 점수 조회
    let tagScore = 50;
    try {
      const tagStmt = db.prepare(`
        SELECT score FROM document_tags 
        WHERE document_id = ? 
        ORDER BY score DESC LIMIT 1
      `);
      const tagRow = (tagStmt.get ? tagStmt.get(row.document_id) : null) as any;
      if (tagRow) tagScore = Number(tagRow.score);
    } catch {}

    // 헤딩 일치 점수
    const headingText = String(row.heading_path || row.heading_title || '').toLowerCase();
    const headingMatches = queryWords.filter(w => headingText.includes(w)).length;
    const headingScore = queryWords.length > 0 
      ? Math.min(100, Math.round((headingMatches / queryWords.length) * 100))
      : 0;

    // 사용자 지정 중요도 (1~5★ -> 20~100점)
    const priorityScore = Math.min(100, Math.max(20, Number(row.priority || 3) * 20));

    // 실질 본문 및 원자적 표 가점
    let penaltyBonus = 0;
    if (substantiveKeywords.some(s => headingText.includes(s))) penaltyBonus += 10;
    if (row.chunk_type === 'table') {
      penaltyBonus += isTableQuery ? 15 : 5;
    }
    if ((row.chunk_text || '').length > 200) penaltyBonus += 5;

    // 최종 복합 점수: FTS 50% + Tag 25% + Heading 15% + Priority 10% + Bonus/Penalty
    const baseFinal = Math.round(
      (normalizedFtsScore * 0.50) +
      (tagScore * 0.25) +
      (headingScore * 0.15) +
      (priorityScore * 0.10)
    );
    const finalScore = Math.max(10, Math.min(100, baseFinal + penaltyBonus));

    return {
      documentId: row.document_id,
      chunkId: row.chunk_id,
      filePath: row.file_path,
      documentTitle: row.document_title || row.heading_title,
      headingTitle: row.heading_title,
      headingPath: row.heading_path,
      startLine: Number(row.start_line),
      endLine: Number(row.end_line),
      fileHash: row.file_hash,
      rawBm25: Number(row.raw_bm25),
      normalizedFtsScore,
      tagScore,
      headingScore,
      priorityScore,
      finalScore,
      score: finalScore,
      chunkType: row.chunk_type || 'section',
      snippet: row.chunk_text || row.chunk_summary || row.doc_summary || '',
    };
  });

  // 최종 점수 기준 내림차순 정렬
  return candidates.sort((a, b) => b.finalScore - a.finalScore);
}
