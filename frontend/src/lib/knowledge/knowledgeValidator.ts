// ====================================================================
// 📊 [OMD-CORE-knowledgeValidator-0001] knowledgeValidator.ts ➔ LLM Analysis Validator
// 🎯 @KICK  : LLM(Gemini 등)의 정형 분석 JSON 출력을 DB에 적재하기 전 길이, 점수 범위(0~100), 태그 포맷을 엄격 검증
// 🛡️ @GUARD : 비정형/누락 데이터 기본값 대체, 태그 점수 0~100 clamp, 악성/과도한 길이 슬라이싱
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 애플리케이션 검증 계층 validateKnowledgeAnalysis 최초 구현
// 🔗 @CALLS : 없음
// ====================================================================

import type { KnowledgeAnalysisResult } from '../../types/knowledge';

const ALLOWED_DOCUMENT_TYPES = ['technical', 'meeting', 'guide', 'memo', 'note', 'other'] as const;

/**
 * LLM 응답 객체를 검증하고 정규화된 KnowledgeAnalysisResult 객체로 변환합니다.
 */
export function validateKnowledgeAnalysis(rawData: any): KnowledgeAnalysisResult {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('INVALID_ANALYSIS_OUTPUT: LLM 출력 데이터가 올바른 JSON 객체가 아닙니다.');
  }

  // 1. 요약 (최대 500자)
  const summary = String(rawData.summary || '').trim().slice(0, 500);

  // 2. 핵심 요점 (최대 5개, 개당 150자)
  const rawKeyPoints = Array.isArray(rawData.key_points) 
    ? rawData.key_points 
    : Array.isArray(rawData.keyPoints) 
      ? rawData.keyPoints 
      : [];
  
  const keyPoints = rawKeyPoints
    .map((kp: any) => String(kp || '').trim().slice(0, 150))
    .filter((kp: string) => kp.length > 0)
    .slice(0, 5);

  // 3. 문서 타입
  const docTypeStr = String(rawData.document_type || rawData.documentType || 'other').toLowerCase();
  const documentType = (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(docTypeStr)
    ? (docTypeStr as KnowledgeAnalysisResult['documentType'])
    : 'other';

  // 4. 태그 및 점수 (0 ~ 100 clamp, 최대 30개)
  const rawTags = Array.isArray(rawData.tags) ? rawData.tags : [];
  const tagsMap = new Map<string, number>();

  for (const t of rawTags) {
    if (!t || typeof t !== 'object') continue;
    const name = String(t.name || t.tag || '').trim().replace(/^#/, '');
    if (!name || name.length > 50) continue;

    const rawScore = Number(t.score);
    const score = isNaN(rawScore) ? 50 : Math.max(0, Math.min(100, Math.round(rawScore)));

    // 중복 태그 시 더 높은 점수 유지
    const existing = tagsMap.get(name);
    if (existing === undefined || score > existing) {
      tagsMap.set(name, score);
    }
  }

  const tags = Array.from(tagsMap.entries())
    .map(([name, score]) => ({ name, score }))
    .slice(0, 30);

  // 5. 한국어 확장 검색어 (searchTerms / keywords: 최대 20개)
  const rawTerms = Array.isArray(rawData.search_terms)
    ? rawData.search_terms
    : Array.isArray(rawData.searchTerms)
      ? rawData.searchTerms
      : Array.isArray(rawData.keywords)
        ? rawData.keywords
        : [];

  const searchTermsSet = new Set<string>();
  for (const term of rawTerms) {
    const cleaned = String(term || '').trim();
    if (cleaned.length >= 2 && cleaned.length <= 40) {
      searchTermsSet.add(cleaned);
    }
  }

  const searchTerms = Array.from(searchTermsSet).slice(0, 20);

  return {
    summary,
    keyPoints,
    documentType,
    tags,
    searchTerms,
  };
}
