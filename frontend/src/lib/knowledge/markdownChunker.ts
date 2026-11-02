// ====================================================================
// 📊 [OMD-CORE-markdownChunker-0001] markdownChunker.ts ➔ Markdown Semantic Chunker
// 🎯 @KICK  : 마크다운 텍스트를 AST/헤딩 구조 기반으로 분석하여 라인 범위 및 heading_path를 보존하는 청크 배열로 분할
// 🛡️ @GUARD : 헤딩 없는 서두 문단 처리, 150줄 초과 대형 섹션 2차 분할, 빈 문서 방어
// 🚨 @PATCH : **2026-09-16** — [의미 기반 RAG 표준 청킹 엔진(Semantic Chunker) 전면 고도화]:
//             1) 표(Table) 원자성(Atomic Chunk) 완벽 보존: 마크다운 표(|...|)가 포함된 섹션은 행 단위 분할을 원천 차단하고 chunkType: 'table'로 보존하여 종합 질의 성능 극대화
//             2) 독립성(Self-contained) 보장 문맥 헤더: 각 청크 최상단에 [문서명 > 상위섹션 > 현재헤딩]을 자동 주입하여 청크 단독으로도 질문에 완벽 답변 가능하도록 구성
//             3) 대형 섹션 스마트 2차 분할 & 오버랩(Overlap): 1,000자 초과 섹션만 문단(\n\n) 단위로 분할하고 이전 문단 마지막 1문장(최대 60자)을 오버랩 연결하여 문맥 단절 방지, 150자 미만 고아 청크 병합 방어
// 🚨 @PATCH : **2026-09-16** — [메타데이터/서식/SEO/해시태그/이미지프롬프트 청크 인덱싱 원천 제외(isMetaOrAuxiliaryChunk)]:
//             사용자 요청("메터는 지식자료에서 제외시켜줘")에 따라 YAML 프론트매터, CSS 프로필 서식설정, 제목 후보, SEO 키워드,
//             해시태그, 이미지 생성 프롬프트 및 실질 본문 없는 최상단 제목 껍데기 청크를 청킹 단계에서 100% 원천 스킵 처리
// 🚨 @PATCH : **2026-09-16** — [윈도우 CRLF(\r\n) 정규식 매칭 호환성 보장]: 윈도우 파일 줄바꿈(\r)으로 인해 헤딩 정규식 매칭이 누락되어 전체가 1개 청크로 묶이던 버그를 /\r?\n/ 및 \r 제거로 해결하여 대상 문서 13개 청크 정상 분할
// 🚨 @PATCH : **2026-09-16** — [청크 의미 식별 강화 및 문서 맥락 결합]:
//             1) 헤딩 이전 서두 청크를 모호한 '개요 (서론)' 대신 '[문서명] 서두 및 개요'로 명명하여 단독 조회 시에도 출처 명확화
//             2) documentTitle 매개변수를 지원하여 모든 청크의 headingPath에 최상위 문서 맥락(문서명 > ...) 자동 주입
//             3) 서두 영역이 YAML 프론트매터/메타영역인 경우 '[문서명] 문서 서식 및 메타정보'로 구체화
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] heading_path 계층 구조 추적 및 대형 섹션 문단 분할 청커 최초 구현
// 🔗 @CALLS : 없음
// ====================================================================

import type { DocumentChunk } from '../../types/knowledge';

export interface RawChunkResult {
  chunkIndex: number;
  headingTitle: string;
  headingLevel: number;
  headingPath: string;
  startLine: number;
  endLine: number;
  chunkText: string;
  chunkType?: 'section' | 'paragraph' | 'table' | 'code';
  contextHeader?: string;
}

const MAX_CHUNK_CHARS = 1000; // 300~500 토큰 (한글 800~1,000자)
const MAX_CHUNK_LINES = 40;

/**
 * 텍스트 구조 분석을 통해 청크 유형(테이블, 코드, 문단, 섹션)을 자동 감지합니다.
 */
export function detectChunkType(text: string): 'section' | 'paragraph' | 'table' | 'code' {
  const t = text.trim();
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length >= 2 && tableLines.length >= lines.length * 0.4) {
    return 'table';
  }
  if (t.includes('```')) {
    return 'code';
  }
  return 'section';
}

/**
 * 메타데이터, 서식 설정(Frontmatter), SEO 키워드, 해시태그, 이미지 프롬프트 등
 * 지식 가치가 없는 부속 청크인지 판별하여 인덱싱 및 검색에서 배제합니다.
 */
export function isMetaOrAuxiliaryChunk(
  heading: string,
  text: string,
  startLine: number,
  endLine: number
): boolean {
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
 * 마크다운 원문을 헤딩 구조, 표 원자성, 문맥 독립성 기반 의미 청크로 분할합니다.
 */
export function chunkMarkdownByHeadings(
  documentId: string,
  markdownText: string,
  documentTitle?: string
): DocumentChunk[] {
  if (!markdownText || !markdownText.trim()) {
    return [];
  }

  const lines = markdownText.split(/\r?\n/);
  const totalLines = lines.length;

  interface SectionBoundary {
    headingTitle: string;
    headingLevel: number;
    headingPath: string;
    startLine: number; // 1-indexed
    endLine: number;
  }

  const boundaries: SectionBoundary[] = [];
  const headingStack: { level: number; title: string }[] = [];

  const cleanDocTitle = (documentTitle || '').trim().replace(/\.md$/i, '');
  const isMetaOnly = markdownText.trimStart().startsWith('---');
  const initialTitle = cleanDocTitle 
    ? (isMetaOnly ? `[${cleanDocTitle}] 서두 및 메타정보` : `[${cleanDocTitle}] 서두 및 개요`)
    : (isMetaOnly ? '서두 및 메타정보' : '개요 (서론)');
  const initialPath = cleanDocTitle
    ? `${cleanDocTitle} > ${isMetaOnly ? '서두 및 메타정보' : '서두'}`
    : (isMetaOnly ? '서두 및 메타정보' : '개요');

  let currentSection: {
    headingTitle: string;
    headingLevel: number;
    headingPath: string;
    startLine: number;
  } = {
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

      // 이전 섹션이 존재하면 경계 닫기
      if (i > 0 && i >= currentSection.startLine) {
        boundaries.push({
          ...currentSection,
          endLine: i, // 헤딩 직전 줄까지
        });
      }

      // 헤딩 스택 갱신 (트리 경로 유지)
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
        startLine: i + 1, // 1-indexed
      };
    }
  }

  // 마지막 섹션 닫기
  boundaries.push({
    ...currentSection,
    endLine: totalLines,
  });

  // 의미 기반 청크 정제 및 표 원자성·문맥 독립성 보장 분할
  const rawChunks: RawChunkResult[] = [];
  let chunkCounter = 0;

  for (const b of boundaries) {
    const sectionLines = lines.slice(b.startLine - 1, b.endLine);
    const text = sectionLines.join('\n').trim();

    if (!text) continue; // 빈 줄만 있는 섹션 스킵
    if (isMetaOrAuxiliaryChunk(b.headingTitle, text, b.startLine, b.endLine)) {
      continue; // 지식 가치가 없는 메타/부속 청크는 인덱싱에서 원천 제외
    }

    const lineCount = b.endLine - b.startLine + 1;
    const charCount = text.length;
    const contextHeader = cleanDocTitle ? `[${b.headingPath}]` : `[${b.headingTitle}]`;

    // 1) 표(Table)가 포함되어 있거나 일반 적정 크기(<= 1,000자, <= 40줄)인 경우 -> 단일 원자적 청크
    const isTable = detectChunkType(text) === 'table';
    if (isTable || (lineCount <= MAX_CHUNK_LINES && charCount <= MAX_CHUNK_CHARS)) {
      const selfContainedText = `${contextHeader}\n${text}`;
      rawChunks.push({
        chunkIndex: chunkCounter++,
        headingTitle: b.headingTitle,
        headingLevel: b.headingLevel,
        headingPath: b.headingPath,
        startLine: b.startLine,
        endLine: b.endLine,
        chunkText: selfContainedText,
        chunkType: isTable ? 'table' : detectChunkType(text),
        contextHeader,
      });
    } else {
      // 2) 1,000자 초과 대형 섹션: 문단(\n\n) 단위 스마트 2차 분할 & 이전 문단 마지막 문장 오버랩
      let subStartLine = b.startLine;
      let currentSubLines: string[] = [];
      let lastSentenceOverlap = '';

      for (let j = 0; j < sectionLines.length; j++) {
        const curLine = sectionLines[j];
        currentSubLines.push(curLine);

        const isLastLine = j === sectionLines.length - 1;
        const currentSubText = currentSubLines.join('\n');
        const reachedLimit = currentSubText.length >= 700 || currentSubLines.length >= 30;
        const remainingChars = sectionLines.slice(j + 1).join('\n').trim().length;
        // 잔여 분량이 너무 작으면(<150자) 고아 청크를 방지하기 위해 현재 청크에 합침
        const isParagraphBreak = curLine.trim() === '' && reachedLimit && remainingChars >= 150;

        if (isParagraphBreak || isLastLine) {
          const subEndLine = b.startLine + j;
          let subText = currentSubLines.join('\n').trim();

          if (subText) {
            // 문맥 단절 방지를 위한 이전 문단 마지막 문장 오버랩 결합
            if (lastSentenceOverlap && !subText.startsWith(lastSentenceOverlap)) {
              subText = `(...${lastSentenceOverlap})\n${subText}`;
            }

            const selfContainedText = `${contextHeader} (Part ${rawChunks.length + 1})\n${subText}`;
            rawChunks.push({
              chunkIndex: chunkCounter++,
              headingTitle: b.headingTitle,
              headingLevel: b.headingLevel,
              headingPath: `${b.headingPath} (Part ${rawChunks.length + 1})`,
              startLine: subStartLine,
              endLine: subEndLine,
              chunkText: selfContainedText,
              chunkType: detectChunkType(subText),
              contextHeader,
            });

            // 다음 청크용 오버랩 추출 (마지막 문장의 최대 60자)
            const sentences = subText.split(/(?<=[.?!])\s+/).filter(Boolean);
            if (sentences.length > 0) {
              const last = sentences[sentences.length - 1].trim();
              lastSentenceOverlap = last.length > 60 ? last.slice(-60) : last;
            }
          }

          subStartLine = subEndLine + 1;
          currentSubLines = [];
        }
      }
    }
  }

  return rawChunks.map((rc, idx) => ({
    id: `${documentId}_chunk_${idx}`,
    documentId,
    chunkIndex: rc.chunkIndex,
    headingTitle: rc.headingTitle,
    headingLevel: rc.headingLevel,
    headingPath: rc.headingPath,
    startLine: rc.startLine,
    endLine: rc.endLine,
    chunkText: rc.chunkText,
    chunkType: rc.chunkType,
    contextHeader: rc.contextHeader,
  }));
}
