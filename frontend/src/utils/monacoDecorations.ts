/**
 * ============================================================================
 * 🏷️ 파일명 : monacoDecorations.ts
 * 🎯 주요기능 :
 *   - 마크다운 구문 강조(코드블록, 인용문, 표, 제목, 굵게, 기울임, 취소선)용 Monaco 에디터 인라인·라인 데코레이션 계산 및 적용
 *   - CommonMark 코드블록 마스크(getCodeBlockLineMask) 기반으로 코드 내부 구문 오탐 원천 방지
 * 🚨 @PATCH :
 *   - 2026-11-04 : 주석 표준화(1·2단계) 적용
 *   - 2026-11-04 : MainEditorApp.updateDecorations 본문을 순수 유틸 applyMarkdownDecorations로 분리 이관
 * ============================================================================
 */

import { getCodeBlockLineMask } from '@/lib/editorUtils';

/**
 * ============================================================================
 * [applyMarkdownDecorations]
 * Monaco 모델 전체 라인을 스캔하여 마크다운 구문 강조 데코레이션을 적용합니다.
 *
 * @param {any} editor - Monaco 에디터 인스턴스
 * @param {{ current: any }} decorationsCollectionRef - editor.createDecorationsCollection() 결과를 담은 Ref
 * ============================================================================
 */
export function applyMarkdownDecorations(editor: any, decorationsCollectionRef: { current: any }): void {
  if (!editor || typeof window === 'undefined' || !(window as any).monaco) return;
  const model = editor.getModel();
  if (!model) return;

  const lines = model.getLinesContent();
  const newDecorations: any[] = [];
  const Range = (window as any).monaco.Range;

  // ✏️ [Code Block] CommonMark 기반 코드블록 영역 마스크 생성 (이중 코드블록 전체 범위 100% 매핑)
  const codeBlockMask = getCodeBlockLineMask(lines);

  lines.forEach((line: string, i: number) => {
    const lineNumber = i + 1;

    // ✏️ [Code Block] 라인 배경 데코레이션 주입 (이중 중첩 코드블록 내부 포함 전체 라인 연속 유지)
    if (codeBlockMask[i]) {
      newDecorations.push({
        range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
        options: {
          isWholeLine: true,
          className: 'monaco-codeblock-line',
          linesDecorationsClassName: 'monaco-codeblock-gutter'
        }
      });
      return;
    }

    // ✏️ [Quote] 인용문 라인 배경 및 테두리 데코레이션 주입
    if (line.trim().startsWith('>')) {
      newDecorations.push({
        range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
        options: {
          isWholeLine: true,
          className: 'monaco-quote-line'
        }
      });
    }

    // ✏️ [Table] 표 구문 라인 배경 및 테두리 데코레이션 주입
    if (line.trim().startsWith('|')) {
      newDecorations.push({
        range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
        options: {
          isWholeLine: true,
          className: 'monaco-table-line'
        }
      });
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const prefixLen = level + 1;
      newDecorations.push({
        range: new Range(lineNumber, 1, lineNumber, prefixLen + 1),
        options: { inlineClassName: `monaco-md-syntax monaco-heading-syntax monaco-h${level}-syntax` }
      });
      const cName = `monaco-h${level}-text`;
      newDecorations.push({
        range: new Range(lineNumber, prefixLen + 1, lineNumber, line.length + 1),
        options: { inlineClassName: cName }
      });
    }

    // Bold
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(line)) !== null) {
      const start = match.index + 1;
      const end = start + match[0].length;
      newDecorations.push({
        range: new Range(lineNumber, start, lineNumber, start + 2),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, end - 2, lineNumber, end),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, start + 2, lineNumber, end - 2),
        options: { inlineClassName: 'monaco-bold-text' }
      });
    }

    // Italic
    const italicRegex = /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g;
    while ((match = italicRegex.exec(line)) !== null) {
      const start = match.index + 1;
      const end = start + match[0].length;
      newDecorations.push({
        range: new Range(lineNumber, start, lineNumber, start + 1),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, end - 1, lineNumber, end),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, start + 1, lineNumber, end - 1),
        options: { inlineClassName: 'monaco-italic-text' }
      });
    }

    // Strikethrough
    const strikeRegex = /~~(.*?)~~/g;
    while ((match = strikeRegex.exec(line)) !== null) {
      const start = match.index + 1;
      const end = start + match[0].length;
      newDecorations.push({
        range: new Range(lineNumber, start, lineNumber, start + 2),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, end - 2, lineNumber, end),
        options: { inlineClassName: 'monaco-md-syntax' }
      });
      newDecorations.push({
        range: new Range(lineNumber, start + 2, lineNumber, end - 2),
        options: { inlineClassName: 'monaco-strikethrough-text' }
      });
    }
  });

    if (decorationsCollectionRef.current) {
      decorationsCollectionRef.current.set(newDecorations);
    }
}
