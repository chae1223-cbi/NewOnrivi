// @ts-nocheck
// ============================================================================
// 📂 파일명 : frontend/src/hooks/editor/monacoTableAndListCommands.ts
// 📌 역할   : Monaco 에디터 표(Table) 정렬·이동·행 편집 및 리스트/인용구/제목 자동 번호 단축키 등록 모듈
// 🚨 @PATCH : 2026-11-04 — [useMonacoSetup.ts 모듈 분리 리팩토링 (1순위 아키텍처 경량화)]:
//             1) 표 너비 계산·자동 정렬(getVisualLength, padVisual, formatTableBlock, setTableColumnAlign) 추출
//             2) Tab / Shift+Tab 리스트·인용구·표 셀 이동 및 custom-space-heading-number, autoRenumberList, custom-enter-list-auto 추출
//             3) 표 행 삽입/삭제(Ctrl+Shift+=, Ctrl+Shift+-, Ctrl+Enter) 및 Ctrl+K, Ctrl+F, Ctrl+H 커맨드 추출
// 🔗 @CALLS : headingFormat, headingSetting, headingMarker, outlineMarker, hasHeadingNumber, countHeadingsUpTo, openAndFocusFindWidget
// ============================================================================

import { openAndFocusFindWidget } from '@/utils/findWidgetHelper';
import {
  headingFormat,
  headingSetting,
  headingMarker,
  outlineMarker,
  hasHeadingNumber,
  countHeadingsUpTo,
} from '@/lib/headingNumbering';

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : 문자열의 시각적 폭(한글/CJK 2칸, 영문/숫자 1칸) 계산
 * ----------------------------------------------------------------------------
 */
export const getVisualLength = (str: string): number => {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x2e80 || (code >= 0xac00 && code <= 0xd7a3)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
};

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : 목표 시각적 폭에 맞추어 우측 공백 패딩 추가
 * ----------------------------------------------------------------------------
 */
export const padVisual = (str: string, targetVisualLen: number): string => {
  const currentLen = getVisualLength(str);
  const needed = targetVisualLen - currentLen;
  if (needed <= 0) return str;
  return str + ' '.repeat(needed);
};

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : 해당 행이 마크다운 표(Table) 행인지 판별
 * ----------------------------------------------------------------------------
 */
export const isTableLine = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('|')) return false;
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return pipeCount >= 2;
};

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : 해당 행이 마크다운 표 구분선(Divider) 행인지 판별
 * ----------------------------------------------------------------------------
 */
export const isTableDividerLine = (text: string): boolean => {
  const trimmed = text.trim();
  if (!isTableLine(trimmed)) return false;
  const inner = trimmed.substring(1, trimmed.length - 1);
  const parts = inner.split('|');
  return parts.every(part => /^[ \t]*:?-+:?[ \t]*$/.test(part));
};

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : 표 행에서 각 셀의 시작/끝 컬럼 범위 배열 산출
 * ----------------------------------------------------------------------------
 */
export const getCellRanges = (lineContent: string, lineNumber = 1) => {
  const ranges: { lineNumber: number; startColumn: number; endColumn: number; isEmpty: boolean; startCol: number; endCol: number; contentStartCol: number; contentEndCol: number }[] = [];
  const pipeIndices: number[] = [];
  for (let i = 0; i < lineContent.length; i++) {
    if (lineContent[i] === '|') {
      if (i > 0 && lineContent[i - 1] === '\\') continue;
      pipeIndices.push(i);
    }
  }
  if (pipeIndices.length < 2) return { ranges: [], pipeIndices: [] };
  for (let i = 0; i < pipeIndices.length - 1; i++) {
    const startIdx = pipeIndices[i] + 1;
    const endIdx = pipeIndices[i + 1];
    const rawText = lineContent.substring(startIdx, endIdx);
    const hasLeftSpace = rawText.startsWith(' ');
    const hasRightSpace = rawText.endsWith(' ');
    const trimLeft = hasLeftSpace ? 1 : 0;
    const trimRight = hasRightSpace ? 1 : 0;
    const cellStartCol = startIdx + 1 + trimLeft;
    const cellEndCol = endIdx + 1 - trimRight;
    const coreText = rawText.substring(trimLeft, rawText.length - trimRight);
    const isEmpty = coreText.trim().length === 0;

    ranges.push({
      lineNumber,
      startColumn: cellStartCol,
      endColumn: cellEndCol,
      isEmpty,
      startCol: startIdx + 1,
      endCol: endIdx + 1,
      contentStartCol: cellStartCol,
      contentEndCol: cellEndCol,
    });
  }
  return { ranges, pipeIndices };
};

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : Monaco 에디터에 표·리스트·인용구·제목 자동 번호 관련 커맨드/액션 일괄 등록
 * ----------------------------------------------------------------------------
 */
export function registerMonacoTableAndListCommands(editor: any, monaco: any, depsRef: any) {
  const {
    tabSizeRef,
    setFloatingToolbar,
    lastSelectionRef,
    previewModeRef,
    previewRef,
    isScrollingRef,
    scrollTimeoutRef
  } = depsRef.current;

  // 1. 표 블록 너비 및 정렬 자동 서식화 (formatTableBlock)
  const formatTableBlock = (editorInstance: any, targetLineNumber: number) => {
    const model = editorInstance.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    let startLine = targetLineNumber;
    let endLine = targetLineNumber;

    while (startLine > 1 && isTableLine(model.getLineContent(startLine - 1))) {
      startLine--;
    }
    while (endLine < lineCount && isTableLine(model.getLineContent(endLine + 1))) {
      endLine++;
    }

    const rows: { lineNumber: number; content: string; isDivider: boolean; cells: string[] }[] = [];
    let maxCols = 0;

    for (let i = startLine; i <= endLine; i++) {
      const content = model.getLineContent(i);
      const isDivider = isTableDividerLine(content);
      const trimmed = content.trim();
      const inner = trimmed.substring(1, trimmed.length - 1);

      const cells: string[] = [];
      let currentCell = "";
      for (let j = 0; j < inner.length; j++) {
        if (inner[j] === '|') {
          if (j > 0 && inner[j - 1] === '\\') {
            currentCell += '|';
          } else {
            cells.push(currentCell);
            currentCell = "";
          }
        } else {
          currentCell += inner[j];
        }
      }
      cells.push(currentCell);

      const trimmedCells = cells.map(c => c.trim());
      maxCols = Math.max(maxCols, trimmedCells.length);

      rows.push({
        lineNumber: i,
        content,
        isDivider,
        cells: trimmedCells
      });
    }

    if (rows.length === 0 || maxCols === 0) return;

    const colWidths = Array(maxCols).fill(0);
    for (const row of rows) {
      if (row.isDivider) continue;
      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const cellText = row.cells[colIdx] || "";
        const visualLen = getVisualLength(cellText);
        colWidths[colIdx] = Math.max(colWidths[colIdx], visualLen);
      }
    }

    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      colWidths[colIdx] = Math.max(3, colWidths[colIdx]);
    }

    const edits: any[] = [];
    for (const row of rows) {
      let formattedLine = "|";
      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const cellText = row.cells[colIdx] || "";
        const width = colWidths[colIdx];
        if (row.isDivider) {
          const text = cellText.trim();
          const alignLeft = text.startsWith(':');
          const alignRight = text.endsWith(':');
          let dividerStr = "";
          if (alignLeft && alignRight) {
            dividerStr = ":" + "-".repeat(Math.max(1, width - 2)) + ":";
          } else if (alignLeft) {
            dividerStr = ":" + "-".repeat(Math.max(2, width - 1));
          } else if (alignRight) {
            dividerStr = "-".repeat(Math.max(2, width - 1)) + ":";
          } else {
            dividerStr = "-".repeat(Math.max(3, width));
          }
          formattedLine += ` ${dividerStr} |`;
        } else {
          const padded = padVisual(cellText, width);
          formattedLine += ` ${padded} |`;
        }
      }
      const originalLine = model.getLineContent(row.lineNumber);
      const indentMatch = originalLine.match(/^([ \t]*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const finalLineText = indent + formattedLine;

      if (finalLineText !== originalLine) {
        edits.push({
          range: new monaco.Range(row.lineNumber, 1, row.lineNumber, originalLine.length + 1),
          text: finalLineText
        });
      }
    }

    if (edits.length > 0) {
      editorInstance.pushUndoStop();
      editorInstance.executeEdits("formatTable", edits);
      editorInstance.pushUndoStop();
    }
  };

  // 2. 표 현재 열 정렬 변경 (setTableColumnAlign)
  const setTableColumnAlign = (align: 'left' | 'center' | 'right') => {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;

    const curLineNum = position.lineNumber;
    const curLineContent = model.getLineContent(curLineNum);
    if (!isTableLine(curLineContent)) return;

    const lineCount = model.getLineCount();
    let startLine = curLineNum;
    while (startLine > 1 && isTableLine(model.getLineContent(startLine - 1))) {
      startLine--;
    }
    let endLine = curLineNum;
    while (endLine < lineCount && isTableLine(model.getLineContent(endLine + 1))) {
      endLine++;
    }

    let dividerLineNum = -1;
    for (let l = startLine; l <= endLine; l++) {
      if (isTableDividerLine(model.getLineContent(l))) {
        dividerLineNum = l;
        break;
      }
    }
    if (dividerLineNum === -1) return;

    const { pipeIndices } = getCellRanges(curLineContent, curLineNum);
    if (pipeIndices.length < 2) return;

    let colIndex = 0;
    for (let i = 0; i < pipeIndices.length - 1; i++) {
      if (position.column >= pipeIndices[i] + 1 && position.column <= pipeIndices[i + 1] + 1) {
        colIndex = i;
        break;
      }
    }

    const dividerContent = model.getLineContent(dividerLineNum);
    const rawPipes: number[] = [];
    for (let i = 0; i < dividerContent.length; i++) {
      if (dividerContent[i] === '|') {
        if (i > 0 && dividerContent[i - 1] === '\\') continue;
        rawPipes.push(i);
      }
    }
    if (rawPipes.length < 2) return;

    const parts: string[] = [];
    for (let i = 0; i < rawPipes.length - 1; i++) {
      parts.push(dividerContent.substring(rawPipes[i] + 1, rawPipes[i + 1]));
    }

    if (colIndex >= parts.length) return;

    let newAlignStr = ' :--- ';
    if (align === 'center') newAlignStr = ' :---: ';
    else if (align === 'right') newAlignStr = ' ---: ';
    else newAlignStr = ' :--- ';

    parts[colIndex] = newAlignStr;
    const newDividerLine = '|' + parts.join('|') + '|';

    editor.pushUndoStop();
    editor.executeEdits('setTableColumnAlign', [{
      range: new monaco.Range(dividerLineNum, 1, dividerLineNum, dividerContent.length + 1),
      text: newDividerLine,
      forceMoveMarkers: true
    }]);
    editor.pushUndoStop();
    formatTableBlock(editor, curLineNum);
  };

  (editor as any).setTableColumnAlign = setTableColumnAlign;
  if (typeof window !== 'undefined') {
    (window as any).setTableColumnAlign = setTableColumnAlign;
  }

  // Alt + Shift + L / C / R: 표 열 정렬 단축키
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => setTableColumnAlign('left'));
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyC, () => setTableColumnAlign('center'));
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => setTableColumnAlign('right'));

  // 3. Tab 커맨드 (표 다음 셀 이동 / 신규 행 추가 + 리스트/인용구 들여쓰기)
  editor.addCommand(monaco.KeyCode.Tab, () => {
    try {
      const contextKeyService = (editor as any)._contextKeyService;
      const isSuggestVisible = contextKeyService?.getContextKeyValue('suggestWidgetVisible') === true;
      const isSnippetMode = contextKeyService?.getContextKeyValue('inSnippetMode') === true;
      if (isSuggestVisible) { editor.trigger('keyboard', 'acceptSelectedSuggestion', null); return; }
      if (isSnippetMode) { editor.trigger('keyboard', 'jumpToNextSnippetPlaceholder', null); return; }
    } catch (_) {}

    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model || !selection) return;

    const position = editor.getPosition();
    let isTable = false;
    if (position) {
      let lineContent = model.getLineContent(position.lineNumber);
      if (isTableLine(lineContent) && !isTableDividerLine(lineContent)) {
        isTable = true;
        if (!lineContent.trimEnd().endsWith('|')) {
          editor.pushUndoStop();
          editor.executeEdits("appendPipe", [{
            range: new monaco.Range(position.lineNumber, lineContent.length + 1, position.lineNumber, lineContent.length + 1),
            text: " |",
            forceMoveMarkers: true
          }]);
          editor.pushUndoStop();
          lineContent = model.getLineContent(position.lineNumber);
        }

        const { ranges, pipeIndices } = getCellRanges(lineContent, position.lineNumber);
        if (ranges.length > 0) {
          let currentCellIdx = -1;
          for (let i = 0; i < pipeIndices.length - 1; i++) {
            const leftCol = pipeIndices[i] + 1;
            const rightCol = pipeIndices[i + 1] + 2;
            if (position.column >= leftCol && position.column <= rightCol) {
              currentCellIdx = i;
              break;
            }
          }

          if (currentCellIdx !== -1) {
            if (currentCellIdx < ranges.length - 1) {
              const nextCell = ranges[currentCellIdx + 1];
              editor.setSelection(new monaco.Selection(
                nextCell.lineNumber, nextCell.startColumn,
                nextCell.lineNumber, nextCell.endColumn
              ));
              return;
            } else {
              let targetLine = position.lineNumber + 1;
              const lineCount = model.getLineCount();
              if (targetLine <= lineCount) {
                let nextLineContent = model.getLineContent(targetLine);
                if (isTableLine(nextLineContent) && isTableDividerLine(nextLineContent)) {
                  targetLine++;
                  if (targetLine <= lineCount) {
                    nextLineContent = model.getLineContent(targetLine);
                  } else {
                    nextLineContent = "";
                  }
                }

                if (isTableLine(nextLineContent)) {
                  const nextLineRanges = getCellRanges(nextLineContent, targetLine).ranges;
                  if (nextLineRanges.length > 0) {
                    const firstCell = nextLineRanges[0];
                    editor.setSelection(new monaco.Selection(
                      firstCell.lineNumber, firstCell.startColumn,
                      firstCell.lineNumber, firstCell.endColumn
                    ));
                    return;
                  }
                }
              }

              const cellCount = ranges.length;
              const newRowText = "\n|" + "  |".repeat(cellCount);
              const lastLineMaxCol = model.getLineMaxColumn(position.lineNumber);
              editor.pushUndoStop();
              editor.executeEdits("insertTableRow", [{
                range: new monaco.Range(position.lineNumber, lastLineMaxCol, position.lineNumber, lastLineMaxCol),
                text: newRowText,
                forceMoveMarkers: true
              }]);
              editor.pushUndoStop();

              const newRowNumber = position.lineNumber + 1;
              const newRowContent = model.getLineContent(newRowNumber);
              const newRowRanges = getCellRanges(newRowContent, newRowNumber).ranges;
              if (newRowRanges.length > 0) {
                const firstCell = newRowRanges[0];
                editor.setSelection(new monaco.Selection(
                  firstCell.lineNumber, firstCell.startColumn,
                  firstCell.lineNumber, firstCell.endColumn
                ));
              }

              if (isScrollingRef) isScrollingRef.current = 'editor';
              if (scrollTimeoutRef?.current) clearTimeout(scrollTimeoutRef.current);
              if (scrollTimeoutRef) scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 300);
              setTimeout(() => {
                if (previewRef?.current) {
                  const targetElement = previewRef.current.querySelector(`[data-line="${newRowNumber}"]`) as HTMLElement;
                  if (targetElement) {
                    targetElement.scrollIntoView({ block: 'center', behavior: 'auto' });
                  }
                }
              }, 80);
              return;
            }
          }
        }
      }
    }

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;
    const indentSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;
    const isSingleCursor = startLine === endLine && selection.isEmpty();
    let cursorInPrefix = !isSingleCursor;

    let hasList = false;
    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      if (/^[ \t]*([-*+]|\d+[\.\)]|>)/.test(lineContent)) {
        hasList = true;
        break;
      }
    }

    if (isSingleCursor && hasList) {
      const currentLineContent = model.getLineContent(startLine);
      const isQuoteLine = /^[ \t\u200b\u00a0]*>+/.test(currentLineContent);
      if (isQuoteLine) {
        cursorInPrefix = true;
      } else {
        const listPrefixMatch = currentLineContent.match(
          /^([ \t\u200b\u00a0]*(?:[-*+][ \t]+\[[ xX]\]|[-*+]|\d+[\.\)])[ \t\u200b\u00a0]*)/
        );
        if (listPrefixMatch) {
          const prefixLength = listPrefixMatch[1].length;
          cursorInPrefix = selection.startColumn <= prefixLength + 1;
        } else {
          cursorInPrefix = false;
        }
      }
    }

    if (hasList && !isTable) {
      if (isSingleCursor && !cursorInPrefix) {
        editor.pushUndoStop();
        editor.executeEdits("insertTabSpaces", [{
          range: selection,
          text: " ".repeat(indentSize),
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();
        return;
      }

      editor.pushUndoStop();
      const edits: any[] = [];
      const virtualLines = new Map<number, string>();
      const getLine = (lineIdx: number) => virtualLines.has(lineIdx) ? virtualLines.get(lineIdx)! : model.getLineContent(lineIdx);

      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const match = lineContent.match(/^([ \t\u200b\u00a0]*)(\d+)\.([ \t\u200b\u00a0]+)(.*)/);
        if (match) {
          const oldIndent = match[1];
          const numStr = match[2];
          const dotSpace = match[3];
          const newIndent = oldIndent + " ".repeat(indentSize);

          let newNum = 1;
          if (i > 1) {
            const prevLine = getLine(i - 1);
            const prevMatch = prevLine.match(/^([ \t\u200b\u00a0]*)(\d+)\.([ \t\u200b\u00a0]+)(.*)/);
            if (prevMatch && prevMatch[1] === newIndent) {
              newNum = parseInt(prevMatch[2], 10) + 1;
            }
          }
          const prefixLength = oldIndent.length + numStr.length + 1 + dotSpace.length;
          const newPrefix = newIndent + newNum + "." + dotSpace;
          const newLineContent = newPrefix + match[4];
          virtualLines.set(i, newLineContent);

          edits.push({
            range: new monaco.Range(i, 1, i, prefixLength + 1),
            text: newPrefix
          });
        } else if (/^[ \t\u200b\u00a0]*>+/.test(lineContent)) {
          const quoteIndentStep = 2;
          const newLineContent = " ".repeat(quoteIndentStep) + lineContent;
          virtualLines.set(i, newLineContent);
          edits.push({
            range: new monaco.Range(i, 1, i, 1),
            text: " ".repeat(quoteIndentStep)
          });
        } else {
          const newLineContent = " ".repeat(indentSize) + lineContent;
          virtualLines.set(i, newLineContent);
          edits.push({
            range: new monaco.Range(i, 1, i, 1),
            text: " ".repeat(indentSize)
          });
        }
      }
      editor.executeEdits("indentList", edits);
      editor.pushUndoStop();
      setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
    } else if (!isTable) {
      const contextKeyService = (editor as any)._contextKeyService;
      const isSuggestVisible = contextKeyService?.getContextKeyValue('suggestWidgetVisible') === true;
      if (isSuggestVisible) {
        editor.trigger('keyboard', 'acceptSelectedSuggestion', null);
      } else {
        editor.trigger("keyboard", "tab", null);
      }
    }
  });

  // 4. 제목 자동 번호 삽입 (Space)
  editor.addAction({
    id: 'custom-space-heading-number',
    label: '제목 번호 자동삽입 (Space)',
    keybindings: [monaco.KeyCode.Space],
    precondition: 'editorTextFocus && !suggestWidgetVisible && !findWidgetVisible && !editorReadonly',
    run: () => {
      if (depsRef.current.isComposingRef?.current) {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const position = editor.getPosition();
      const model = editor.getModel();
      if (!position || !model) {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const lineContent = model.getLineContent(position.lineNumber);

      if (position.column === lineContent.length + 1) {
        const listToBulletMatch = lineContent.match(/^([ \t]*)(\d+)[\.\)][ \t]+([-*+])$/);
        if (listToBulletMatch) {
          const existingIndent = listToBulletMatch[1];
          const numVal = parseInt(listToBulletMatch[2], 10);
          const bulletChar = listToBulletMatch[3];
          const stepSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;
          let targetIndent = existingIndent;
          if (!existingIndent) {
            const prevLine = position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '';
            const prevListMatch = prevLine.match(/^([ \t]*)(?:\d+[\.\)]|[-*+])[ \t]+/);
            if (prevListMatch || numVal > 1) {
              targetIndent = (prevListMatch ? prevListMatch[1] : '') + ' '.repeat(stepSize);
            }
          }
          const newPrefix = `${targetIndent}${bulletChar} `;
          editor.pushUndoStop();
          editor.executeEdits('ordered-to-nested-bullet', [{
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
            text: newPrefix,
            forceMoveMarkers: true,
          }]);
          editor.setPosition({
            lineNumber: position.lineNumber,
            column: newPrefix.length + 1,
          });
          editor.pushUndoStop();
          return;
        }
      }

      const headingMatch = lineContent.match(/^(#{1,6}) $/);
      if (!headingMatch || position.column !== lineContent.length + 1) {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const headingLevel = headingMatch[1].length;
      const profile = depsRef.current.resolveEffectiveDocumentProfile?.(
        depsRef.current.contentRef?.current || ''
      );
      const headingFormats = profile?.headingNumbering || [];
      const fmt = headingFormat(headingFormats[headingLevel - 1]);

      if (!headingFormats.length || fmt === 'none') {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const allLines = Array.from(
        { length: model.getLineCount() },
        (_, i) => model.getLineContent(i + 1)
      );
      const counts = countHeadingsUpTo(
        allLines,
        position.lineNumber - 1,
        headingFormats
      );
      counts[headingLevel - 1]++;
      counts.fill(0, headingLevel);

      const setting = headingSetting(headingFormats[headingLevel - 1]);
      const marker = fmt === 'decimal-outline'
        ? outlineMarker(headingFormats, counts, headingLevel - 1)
        : (headingMarker(setting, counts[headingLevel - 1]) || '');

      if (!marker) {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const afterHashSpace = lineContent.slice(headingLevel + 1);
      if (hasHeadingNumber(afterHashSpace)) {
        editor.trigger('keyboard', 'type', { text: ' ' });
        return;
      }

      const insertCol = headingLevel + 2;
      editor.executeEdits('heading-auto-number', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: insertCol,
          endLineNumber: position.lineNumber,
          endColumn: insertCol,
        },
        text: marker + ' ',
      }]);
      editor.setPosition({
        lineNumber: position.lineNumber,
        column: insertCol + marker.length + 1,
      });
    },
  });

  // 5. Shift + Enter (<br> 삽입) 및 Ctrl + K (AI 어시스턴트)
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
    const position = editor.getPosition();
    if (!position) return;
    editor.executeEdits("insertBr", [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: "<br>",
      forceMoveMarkers: true
    }]);
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
    if (typeof window !== 'undefined' && (window as any).dispatchEditorCommand) {
      (window as any).dispatchEditorCommand('AI_MODAL');
    }
  });

  // 6. Shift + Tab (표 역방향 셀 이동 + 리스트/인용구 내어쓰기)
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Tab, () => {
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model || !selection) return;

    const position = editor.getPosition();
    if (position) {
      const lineContent = model.getLineContent(position.lineNumber);
      if (isTableLine(lineContent) && !isTableDividerLine(lineContent)) {
        const { ranges, pipeIndices } = getCellRanges(lineContent, position.lineNumber);
        if (ranges.length > 0) {
          let currentCellIdx = -1;
          for (let i = 0; i < pipeIndices.length - 1; i++) {
            const leftCol = pipeIndices[i] + 1;
            const rightCol = pipeIndices[i + 1] + 2;
            if (position.column >= leftCol && position.column <= rightCol) {
              currentCellIdx = i;
              break;
            }
          }

          if (currentCellIdx !== -1) {
            if (currentCellIdx > 0) {
              const prevCell = ranges[currentCellIdx - 1];
              editor.setSelection(new monaco.Selection(
                prevCell.lineNumber, prevCell.startColumn,
                prevCell.lineNumber, prevCell.endColumn
              ));
              return;
            } else {
              let targetLine = position.lineNumber - 1;
              if (targetLine >= 1) {
                let prevLineContent = model.getLineContent(targetLine);
                if (isTableLine(prevLineContent) && isTableDividerLine(prevLineContent)) {
                  targetLine--;
                  if (targetLine >= 1) {
                    prevLineContent = model.getLineContent(targetLine);
                  } else {
                    prevLineContent = "";
                  }
                }

                if (isTableLine(prevLineContent)) {
                  const prevLineRanges = getCellRanges(prevLineContent, targetLine).ranges;
                  if (prevLineRanges.length > 0) {
                    const lastCell = prevLineRanges[prevLineRanges.length - 1];
                    editor.setSelection(new monaco.Selection(
                      lastCell.lineNumber, lastCell.startColumn,
                      lastCell.lineNumber, lastCell.endColumn
                    ));

                    if (isScrollingRef) isScrollingRef.current = 'editor';
                    if (scrollTimeoutRef?.current) clearTimeout(scrollTimeoutRef.current);
                    if (scrollTimeoutRef) scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 200);
                    setTimeout(() => {
                      if (previewRef?.current) {
                        const targetElement = previewRef.current.querySelector(`[data-line="${targetLine}"]`) as HTMLElement;
                        if (targetElement) {
                          targetElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                        }
                      }
                    }, 50);
                    return;
                  }
                }
              }
            }
          }
        }
      }
    }

    const isSingleCursor = selection.startLineNumber === selection.endLineNumber && selection.isEmpty();
    if (isSingleCursor && position) {
      const lineContent = model.getLineContent(position.lineNumber);
      const isQuote = /^[ \t\u200b\u00a0]*>+/.test(lineContent);
      if (isQuote) {
        const spaceMatch = lineContent.match(/^([ \t\u200b\u00a0]+)(>+)/);
        if (spaceMatch) {
          const removeLen = Math.min(spaceMatch[1].length, 2);
          editor.pushUndoStop();
          editor.executeEdits("outdentQuote", [{
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, removeLen + 1),
            text: "",
            forceMoveMarkers: true
          }]);
          editor.pushUndoStop();
          return;
        }
        const nestedMatch = lineContent.match(/^([ \t\u200b\u00a0]*)(>{2,})/);
        if (nestedMatch) {
          const startCol = nestedMatch[1].length + 1;
          editor.pushUndoStop();
          editor.executeEdits("outdentQuote", [{
            range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, startCol + 1),
            text: "",
            forceMoveMarkers: true
          }]);
          editor.pushUndoStop();
          return;
        }
        return;
      }

      const listMatch = lineContent.match(
        /^([ \t\u200b\u00a0]*(?:[-*+][ \t]+\[[ xX]\]|[-*+]|\d+[\.\)])[ \t\u200b\u00a0]*)/
      );
      if (listMatch) {
        const prefixLength = listMatch[1].length;
        if (position.column > prefixLength + 1) {
          const indentSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;
          const beforeCursorText = lineContent.substring(0, position.column - 1);
          const spaceMatch = beforeCursorText.match(/(?:[ \u200b\u00a0]{1,4}|\t)$/);
          if (spaceMatch && spaceMatch[0].length > 0) {
            const deleteLen = Math.min(spaceMatch[0].length, indentSize);
            const startCol = position.column - deleteLen;
            editor.pushUndoStop();
            editor.executeEdits("removeTabSpaces", [{
              range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column),
              text: "",
              forceMoveMarkers: true
            }]);
            editor.pushUndoStop();
          }
          return;
        }
      }
    }

    editor.trigger('keyboard', 'outdent', null);
    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
  }, "textInputFocus && !suggestWidgetVisible && !inSnippetMode");

  // 7. 리스트 번호 자동 정렬 액션 (autoRenumberList)
  editor.addAction({
    id: 'autoRenumberList',
    label: 'Auto Renumber Lists',
    run: () => {
      const model = editor.getModel();
      if (!model) return;

      const selection = editor.getSelection();
      if (!selection) return;

      const position = selection.startLineNumber;
      let blockStart = position;
      let blockEnd = position;

      const isDividerLine = (lineStr: string) => /^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(lineStr);
      const isBreakTagLine = (lineStr: string) => /^[ \t]*<br\s*\/?>[ \t]*$/i.test(lineStr);
      const isHeadingLine = (lineStr: string) => /^[ \t]*#{1,6}\s/.test(lineStr);
      const isQuoteLine = (lineStr: string) => /^[ \t]*>/.test(lineStr);
      const isCodeFenceLine = (lineStr: string) => /^[ \t]*(?:```|~~~)/.test(lineStr);
      const isNumberedLine = (lineStr: string) => /^[ \t]*\d+\.(?:\s+|$)/.test(lineStr);
      const isTaskLine = (lineStr: string) => /^[ \t]*[-*+]\s+\[[ xX]?\](?:\s+|$)/.test(lineStr);
      const isBulletLine = (lineStr: string) => !isDividerLine(lineStr) && !isTaskLine(lineStr) && /^[ \t]*[-*+](?:\s+|$)/.test(lineStr);
      const isListLine = (lineStr: string) => !isDividerLine(lineStr) && (isNumberedLine(lineStr) || isBulletLine(lineStr) || isTaskLine(lineStr));

      while (blockStart > 1) {
        const prevContent = model.getLineContent(blockStart - 1);
        if (prevContent.trim() === '' || isBreakTagLine(prevContent) || isDividerLine(prevContent) || isHeadingLine(prevContent) || isQuoteLine(prevContent) || isCodeFenceLine(prevContent)) {
          break;
        }
        if (isListLine(prevContent)) {
          blockStart--;
        } else {
          break;
        }
      }

      const lineCount = model.getLineCount();
      while (blockEnd < lineCount) {
        const nextContent = model.getLineContent(blockEnd + 1);
        if (nextContent.trim() === '' || isBreakTagLine(nextContent) || isDividerLine(nextContent) || isHeadingLine(nextContent) || isQuoteLine(nextContent) || isCodeFenceLine(nextContent)) {
          break;
        }
        if (isListLine(nextContent)) {
          blockEnd++;
        } else {
          break;
        }
      }

      const edits: any[] = [];
      const indentStack: { indent: string, count: number, type: 'number' | 'bullet' | 'task' }[] = [];

      for (let i = blockStart; i <= blockEnd; i++) {
        const lineContent = model.getLineContent(i);
        if (lineContent.trim() === '' || isBreakTagLine(lineContent) || isDividerLine(lineContent) || isHeadingLine(lineContent)) {
          indentStack.length = 0;
          continue;
        }

        const match = lineContent.match(/^([ \t]*)([-*+]|\d+\.)([ \t]+)(.*)/);
        if (!match) {
          indentStack.length = 0;
          continue;
        }

        const currentIndent = match[1];
        const marker = match[2];
        const rest = match[4];
        const isTask = /^\[[ xX]?\](?:\s+|$)/.test(rest);
        const isNumbered = /^\d+\.$/.test(marker);
        const itemType: 'number' | 'bullet' | 'task' = isTask ? 'task' : (isNumbered ? 'number' : 'bullet');

        let stackIndex = -1;
        for (let s = 0; s < indentStack.length; s++) {
          if (indentStack[s].indent === currentIndent) {
            stackIndex = s;
            break;
          }
        }

        if (stackIndex !== -1) {
          indentStack.splice(stackIndex + 1);
          if (indentStack[stackIndex].type !== itemType) {
            indentStack[stackIndex].type = itemType;
            indentStack[stackIndex].count = isNumbered ? (parseInt(marker, 10) || 1) : 1;
          }
        } else {
          while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent.length > currentIndent.length) {
            indentStack.pop();
          }
          if (indentStack.length === 0 || indentStack[indentStack.length - 1].indent !== currentIndent) {
            const initialCount = isNumbered ? (parseInt(marker, 10) || 1) : 1;
            indentStack.push({ indent: currentIndent, count: initialCount, type: itemType });
          }
          stackIndex = indentStack.length - 1;
        }

        if (isNumbered) {
          const currentCount = indentStack[stackIndex].count;
          const newMarker = currentCount + ".";
          if (marker !== newMarker) {
            const oldPrefixLength = currentIndent.length + marker.length + match[3].length;
            const newPrefix = currentIndent + newMarker + match[3];
            edits.push({
              range: new monaco.Range(i, 1, i, oldPrefixLength + 1),
              text: newPrefix
            });
          }
          indentStack[stackIndex].count++;
        } else {
          indentStack[stackIndex].count = 1;
        }
      }

      if (edits.length > 0) {
        editor.pushUndoStop();
        editor.executeEdits("autoRenumber", edits);
        editor.pushUndoStop();
      }
    }
  });

  // 8. 리스트/구분선/인용구 자동완성 Enter 액션 (custom-enter-list-auto)
  editor.addAction({
    id: 'custom-enter-list-auto',
    label: '리스트 자동완성 (Enter)',
    keybindings: [monaco.KeyCode.Enter],
    precondition: 'editorTextFocus && !findWidgetVisible && !suggestWidgetVisible && !editorReadonly',
    run: () => {
      try {
        const findCtrl = editor.getContribution('editor.contrib.findController') as any;
        if (findCtrl?.getState?.()?.isRevealed) {
          return;
        }
      } catch (_) {}

      try {
        const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
        if (suggestCtrl?.widget?.value?.suggestWidgetVisible?.get?.()) {
          editor.trigger('keyboard', 'acceptSelectedSuggestion', {});
          return;
        }
      } catch (_) {}

      const position = editor.getPosition();
      if (!position) return;
      const selection = editor.getSelection();

      if (selection && !selection.isEmpty()) {
        editor.executeEdits("replaceSelectionWithNewline", [{
          range: selection,
          text: "\n",
          forceMoveMarkers: true
        }]);
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const lineNumber = position.lineNumber;
      const lineContent = model.getLineContent(lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);
      const afterCursor = lineContent.substring(position.column - 1);

      const taskRegex = /^([ \t]*)([-*+])[ \t]+\[([ xX])\](?:[ \t]+(.*)|)$/;
      const orderRegex = /^([ \t]*)(\d+)\.(?:[ \t]+(.*)|)$/;
      const listRegex = /^([ \t]*)([-*+])(?:[ \t]+(.*)|)$/;
      const quoteRegex = /^([ \t]*)(>+)(?:[ \t]+(.*)|)$/;

      let match: RegExpMatchArray | null = null;

      const isCurrentLineDivider = /^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(lineContent);
      if (isCurrentLineDivider) {
        const lineCount = model.getLineCount();
        const nextLineNumber = lineNumber + 1;
        if (nextLineNumber <= lineCount) {
          const nextLineContent = model.getLineContent(nextLineNumber);
          if (nextLineContent.trim() === '') {
            editor.setPosition({ lineNumber: nextLineNumber, column: 1 });
          } else {
            editor.executeEdits('insertNewlineAfterHR', [{
              range: new monaco.Range(lineNumber, model.getLineMaxColumn(lineNumber), lineNumber, model.getLineMaxColumn(lineNumber)),
              text: '\n',
              forceMoveMarkers: true
            }]);
            editor.setPosition({ lineNumber: nextLineNumber, column: 1 });
          }
        } else {
          editor.executeEdits('insertNewlineAfterHR', [{
            range: new monaco.Range(lineNumber, model.getLineMaxColumn(lineNumber), lineNumber, model.getLineMaxColumn(lineNumber)),
            text: '\n',
            forceMoveMarkers: true
          }]);
          editor.setPosition({ lineNumber: lineNumber + 1, column: 1 });
        }
        return;
      }

      if ((match = beforeCursor.match(taskRegex))) {
        const indent = match[1];
        const marker = match[2];
        const text = match[4] || '';

        if (text.trim() === '' && afterCursor.trim() === '') {
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
          editor.executeEdits("removeBullet", [{
            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
            text: indent,
            forceMoveMarkers: true
          }]);
        } else {
          const insertText = `\n${indent}${marker} [ ] ${afterCursor}`;
          editor.executeEdits("insertBullet", [{
            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          const nextLine = lineNumber + 1;
          const nextColumn = indent.length + marker.length + 6 + 1;
          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
        }
        return;
      }

      if ((match = beforeCursor.match(orderRegex))) {
        const indent = match[1];
        const numStr = match[2];
        const text = match[3] || '';

        if (text.trim() === '' && afterCursor.trim() === '') {
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
          editor.executeEdits("removeBullet", [{
            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
            text: indent,
            forceMoveMarkers: true
          }]);
        } else {
          const nextNum = parseInt(numStr, 10) + 1;
          const insertText = `\n${indent}${nextNum}. ${afterCursor}`;
          editor.executeEdits("insertBullet", [{
            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          const nextLine = lineNumber + 1;
          const nextColumn = indent.length + String(nextNum).length + 2 + 1;
          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
        }
        return;
      }

      if ((match = beforeCursor.match(listRegex))) {
        const indent = match[1];
        const marker = match[2];
        const text = match[3] || '';

        if (text.trim() === '' && afterCursor.trim() === '') {
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
          editor.executeEdits("removeBullet", [{
            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
            text: indent,
            forceMoveMarkers: true
          }]);
        } else {
          const insertText = `\n${indent}${marker} ${afterCursor}`;
          editor.executeEdits("insertBullet", [{
            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          const nextLine = lineNumber + 1;
          const nextColumn = indent.length + marker.length + 1 + 1;
          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
        }
        return;
      }

      if ((match = beforeCursor.match(quoteRegex))) {
        const indent = match[1];
        const quote = match[2];
        const text = match[3] || '';

        if (text.trim() === '' && afterCursor.trim() === '') {
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
          editor.executeEdits("removeBullet", [{
            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
            text: indent,
            forceMoveMarkers: true
          }]);
        } else {
          const insertText = `\n${indent}${quote} ${afterCursor}`;
          editor.executeEdits("insertBullet", [{
            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          const nextLine = lineNumber + 1;
          const nextColumn = indent.length + quote.length + 1 + 1;
          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
        }
        return;
      }

      const indentMatch = beforeCursor.match(/^([ \t]*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      editor.executeEdits("insertNewline", [{
        range: new monaco.Range(lineNumber, position.column, lineNumber, position.column),
        text: `\n${indent}`,
        forceMoveMarkers: true
      }]);
      const nextLine = lineNumber + 1;
      const nextColumn = indent.length + 1;
      editor.setPosition({ lineNumber: nextLine, column: nextColumn });
    }
  });

  // 9. 표 행 삽입 및 삭제 단축키 (Ctrl+Shift+=, Ctrl+Shift+-)
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Equal, () => {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    const lineContent = model.getLineContent(position.lineNumber);
    if (isTableLine(lineContent)) {
      const { ranges } = getCellRanges(lineContent, position.lineNumber);
      const cellCount = ranges.length;
      if (cellCount > 0) {
        const newRowText = "|" + "  |".repeat(cellCount) + "\n";
        editor.pushUndoStop();
        editor.executeEdits("insertTableRowAbove", [{
          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
          text: newRowText,
          forceMoveMarkers: false
        }]);
        editor.pushUndoStop();

        const newRanges = getCellRanges(model.getLineContent(position.lineNumber), position.lineNumber).ranges;
        if (newRanges.length > 0) {
          editor.setSelection(new monaco.Selection(
            position.lineNumber, newRanges[0].startColumn,
            position.lineNumber, newRanges[0].endColumn
          ));
        }
      }
    }
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Minus, () => {
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    const lineContent = model.getLineContent(position.lineNumber);
    if (isTableLine(lineContent)) {
      if (isTableDividerLine(lineContent)) return;
      editor.pushUndoStop();
      const lineMaxCol = model.getLineMaxColumn(position.lineNumber);
      let range: any;
      if (position.lineNumber < model.getLineCount()) {
        range = new monaco.Range(position.lineNumber, 1, position.lineNumber + 1, 1);
      } else if (position.lineNumber > 1) {
        const prevMaxCol = model.getLineMaxColumn(position.lineNumber - 1);
        range = new monaco.Range(position.lineNumber - 1, prevMaxCol, position.lineNumber, lineMaxCol);
      } else {
        range = new monaco.Range(position.lineNumber, 1, position.lineNumber, lineMaxCol);
      }
      editor.executeEdits("deleteTableRow", [{ range, text: "" }]);
      editor.pushUndoStop();
    }
  });

  // 10. Ctrl+Space: 슬래시 명령어 또는 플로팅 서식 툴바 토글
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
    const position = editor.getPosition();
    const model = editor.getModel();

    if (position && model) {
      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);
      const slashMatch = beforeCursor.match(/\/([a-zA-Z0-9]*)$/);
      if (slashMatch) {
        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        return;
      }
    }

    setFloatingToolbar((prev: any) => {
      if (prev.visible) return { ...prev, visible: false };
      let targetPosition = editor.getPosition();
      const selection = editor.getSelection();
      const activeSelection = (selection && !selection.isEmpty()) ? selection : lastSelectionRef.current;
      if (activeSelection && !activeSelection.isEmpty()) {
        targetPosition = activeSelection.getStartPosition();
      }
      if (!targetPosition) return prev;
      const visiblePos = editor.getScrolledVisiblePosition(targetPosition);
      if (!visiblePos) return prev;
      const safeLeft = Math.max(10, visiblePos.left);
      return { visible: true, top: Math.max(0, visiblePos.top - 10), left: safeLeft };
    });
  });

  // 11. Ctrl+F, Ctrl+H 찾기/바꾸기
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
    openAndFocusFindWidget(editor, false);
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
    openAndFocusFindWidget(editor, previewModeRef.current !== 'both');
  });

  return { formatTableBlock, setTableColumnAlign };
}
