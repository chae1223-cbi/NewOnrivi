// ====================================================================
// 📊 [OMD-CORE-contextBuilder-0001] contextBuilder.ts ➔ Context Builder & Token Budget
// 🎯 @KICK  : 검색된 청크 후보군에서 문서 다양성(동일 문서 최대 3개) 및 토큰 예산(기본 4,000자)을 적용하여 LLM 컨텍스트 구성
// 🛡️ @GUARD : 단일 문서 쏠림 방지, 컨텍스트 토큰 초과 방어, 출처 라인 점프 메타데이터 생성
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] Source Diversity 및 Token Budget 기반 buildPromptContext 최초 구현
// 🔗 @CALLS : ../../types/knowledge.ts
// ====================================================================

import type { RetrievalCandidate, ContextEvidenceItem } from '../../types/knowledge';

export interface PromptContextResult {
  contextText: string;
  evidenceList: ContextEvidenceItem[];
}

const DEFAULT_TOKEN_BUDGET = 4000; // 기본 최대 문자수
const MAX_CHUNKS_PER_DOCUMENT = 3;  // 동일 문서 청크 채택 최대 수
const MAX_TOTAL_CHUNKS = 8;        // 최종 채택 청크 최대 수

/**
 * 하이브리드 검색 후보군을 바탕으로 토큰 예산과 문서 다양성을 적용한 프롬프트 컨텍스트를 빌드합니다.
 */
export function buildPromptContext(
  candidates: RetrievalCandidate[],
  readFileSlice: (filePath: string, startLine: number, endLine: number) => string,
  maxBudget: number = DEFAULT_TOKEN_BUDGET
): PromptContextResult {
  if (!candidates || candidates.length === 0) {
    return { contextText: '', evidenceList: [] };
  }

  // 1. Source Diversity 필터링: 한 문서당 최대 3개 청크 채택
  const docChunkCount: Record<string, number> = {};
  const selectedChunks: RetrievalCandidate[] = [];

  for (const cand of candidates) {
    const count = docChunkCount[cand.documentId] || 0;
    if (count < MAX_CHUNKS_PER_DOCUMENT) {
      selectedChunks.push(cand);
      docChunkCount[cand.documentId] = count + 1;
    }
    if (selectedChunks.length >= MAX_TOTAL_CHUNKS) break;
  }

  // 2. Token Budget 관리 및 원문 슬라이싱 로드
  const evidenceList: ContextEvidenceItem[] = [];
  const contextParts: string[] = [];
  let currentLength = 0;

  for (const cand of selectedChunks) {
    let textSnippet = '';
    try {
      textSnippet = readFileSlice(cand.filePath, cand.startLine, cand.endLine);
    } catch {
      continue; // 파일 읽기 실패 시 스킵
    }

    if (!textSnippet || !textSnippet.trim()) continue;

    // 토큰 한도 검사
    if (currentLength + textSnippet.length > maxBudget && evidenceList.length > 0) {
      // 첫 청크가 이미 들어간 상태에서 예산 초과 시 중단
      break;
    }

    currentLength += textSnippet.length;

    const evidenceItem: ContextEvidenceItem = {
      documentTitle: cand.documentTitle || cand.headingTitle,
      filePath: cand.filePath,
      headingPath: cand.headingPath || cand.headingTitle,
      startLine: cand.startLine,
      endLine: cand.endLine,
      content: textSnippet,
      relevanceScore: cand.finalScore,
    };
    evidenceList.push(evidenceItem);

    contextParts.push(
      `[출처 문서: ${cand.filePath} (Line ${cand.startLine}~${cand.endLine}) - ${cand.headingPath || cand.headingTitle}]\n${textSnippet}`
    );
  }

  const contextText = contextParts.join('\n\n---\n\n');

  return {
    contextText,
    evidenceList,
  };
}
