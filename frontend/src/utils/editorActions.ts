import { clearMarkdownFormatting } from '@/lib/clearMarkdownFormatting';
// @ts-nocheck
// 🚨 @PATCH : **2026-11-10** — [인라인 코드와 다른 서식(굵게/기울기/밑줄/취소선) 공존 스마트 래핑 지원]:
//             1) 선택 영역에 기존 서식 태그(**, *, ~~, <u> 등)가 있을 때 인라인 코드로 감싸면 서식 태그를 외부에 유지하고 내부 텍스트만 백틱으로 감싸서(예: **`텍스트`**) 서식이 함께 반영되도록 구현
//             2) 서식 태그 내에 이미 백틱이 있는 경우 인라인 코드 버튼 재클릭 시 내부 백틱만 깔끔하게 토글 해제 지원
// 🚨 @PATCH : **2026-10-31** - [인라인 서식 빈 커서 상태에서 동일 버튼 클릭 시 태그 취소(토글 해제) 지원]: 커서가 서식 태그(**|**, <u>|</u> 등) 사이 또는 감싸진 단어 내에 있을 때 동일 서식 버튼 재클릭 시 태그를 자동 제거하여 일반 텍스트로 복귀
// 🚨 @PATCH : **2026-10-17** - [코드블록/머메이드 및 다행 텍스트(수식 등) 삽입 시 하단 빈 행 자동 추가 및 커서 이동] insertBlockTag 종료 태그 뒤에 빈 행(\n\n)을 자동 추가하고, insertAtCursor에서 다행 텍스트 삽입 시 마지막 줄 끝으로 커서를 안착시켜 마우스 클릭 및 연속 작업을 지원
// 🚨 @PATCH : **2026-10-02** - [미디어 삽입 Range 호환성 강화 및 즉각 상태 동기화] insertMediaAtCursor 내 Range 객체 생성 시 monaco 전역 참조 안전 폴백 및 updateContent 즉시 동기화 연동
// 🚨 @PATCH : 2026-09-06 - [미디어 삽입 후 2행 자동 추가 및 커서 이동] insertMediaAtCursor 함수 신규 추가: 이미지·동영상·지도 마크다운 삽입 후 자동으로 빈 줄 2행을 추가하고 커서를 마지막 빈 행 끝에 위치시켜 즉시 이어 입력 가능하도록 구현

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0005] editorActions ➔ scrollToLine
// 🎯 @KICK  : Monaco 에디터 내에서 특정 라인 번호로 스크롤하고 포커스를 이동시킨다
// 🛡️ @GUARD : editorRef.current가 없으면 early return
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-010] scrollToLine 함수 (추출된 유틸리티)
 * @description Monaco 에디터 내에서 특정 라인 번호로 스크롤하고 커서 위치를 해당 라인의 첫 번째 열로 이동한 뒤 포커스를 줍니다.
 * @param editorRef 에디터 인스턴스 Ref 객체
 * @param lineNumber 에디터에서 이동하고자 하는 대상 라인 번호
 */
export const scrollToLine = (editorRef: any, lineNumber: number) => {
  if (editorRef.current) {
    const editor = editorRef.current;
    editor.revealLineInCenter(lineNumber);
    editor.setPosition({ lineNumber, column: 1 });
    editor.focus();
  }
};

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0004] editorActions ➔ insertAtCursor
// 🎯 @KICK  : 현재 커서 위치 또는 마지막 선택 영역에 텍스트를 주입한다
// 🛡️ @GUARD : editorRef.current가 없으면 early return, selection 검증 후 처리
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-011] insertAtCursor 함수 (추출된 유틸리티)
 * @description 에디터의 현재 커서 위치 또는 마지막으로 선택된 영역에 텍스트를 주입하고 Monaco 에디터 토크나이저를 강제로 갱신합니다.
 * @param editorRef 에디터 인스턴스 Ref 객체
 * @param lastSelectionRef 마지막 선택 영역 Ref 객체
 * @param text 삽입할 텍스트 내용
 */
export const insertAtCursor = (editorRef: any, lastSelectionRef: any, text: string) => {
  if (!text) return false;
  if (editorRef.current) {
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return false;
    let selection = editor.getSelection();
    if (!selection && lastSelectionRef.current) {
      selection = lastSelectionRef.current;
    }
    if (!selection) {
      const position=editor.getPosition?.() || {lineNumber:1,column:1};
      selection={startLineNumber:position.lineNumber,startColumn:position.column,endLineNumber:position.lineNumber,endColumn:position.column};
    }
    if (selection) {
      const range = model.validateRange({startLineNumber:selection.startLineNumber,startColumn:selection.startColumn,
        endLineNumber:selection.endLineNumber,endColumn:selection.endColumn});
      editor.pushUndoStop();
      const inserted=editor.executeEdits("insert", [{ range, text, forceMoveMarkers: true }]);
      editor.pushUndoStop();
      if (!inserted) return false;
      
      const lines = text.split('\n');
      const nextLine = range.startLineNumber + lines.length - 1;
      const nextCol = lines.length > 1 ? lines[lines.length - 1].length + 1 : range.startColumn + text.length;
      try {
        editor.setPosition?.({ lineNumber: nextLine, column: nextCol });
      } catch (_) {}

      try {
        const model = editor.getModel();
        if (model && typeof model.forceTokenization === 'function') {
          const startLine = selection.startLineNumber;
          const lineCount = text.split('\n').length;
          for (let i = startLine; i <= startLine + lineCount; i++) {
            model.forceTokenization(i);
          }
        }
        editor.layout();
      } catch (_) {}

      editor.focus();
      return true;
    }
  }
  return false;
};

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0004b] editorActions ➔ insertMediaAtCursor
// 🎯 @KICK  : 이미지·동영상·지도 마크다운을 현재 커서 행의 다음 행에 삽입하고
//             자동으로 빈 줄 2행을 추가한 뒤 커서를 마지막 빈 행 1열에 위치시킨다
// 🛡️ @GUARD : editorRef.current 없으면 early return
// ====================================================================
// 📊 [OMD-EDIT-editorActions-0004b] editorActions ➔ insertMediaAtCursor
// 🎯 @KICK  : 이미지·동영상·지도 마크다운을 커서 위치에 삽입하고,
//             자동으로 2개 빈 행(\n\n)을 추가한 뒤 커서를 마지막 빈 행 1열에 완벽 안착시킨다
// 🛡️ @GUARD : editorRef.current 없으면 early return
// 🚨 @PATCH : 2026-09-06 v3 - 모달 닫힘 후 포커스 복원 시 이전 행(이미지 행)으로 커서가 튀는 버그 원천 차단:
//             모달 언마운트 타이밍(0ms, 50ms, 150ms) 3단계 커서/선택영역/스크롤 강제 고정, updateContent 즉각 동기화 지원
// 🔗 @CALLS : editor.executeEdits, editor.setPosition, editor.setSelection, editor.revealLineInCenter, updateContent
// ====================================================================
/**
 * [OMD-EDIT-editorActions-0004b] insertMediaAtCursor
 * @description 이미지·동영상·지도 마크다운을 현재 커서 행 끝에 삽입하고,
 *              빈 줄 2행(\n\n)을 자동 추가한 뒤 커서를 2번째 빈 행 첫 열에 위치시킨다.
 */
export const insertMediaAtCursor = (
  editorRef: any,
  lastSelectionRef: any,
  text: string,
  updateContent?: (val: string, force?: boolean) => void
) => {
  if (!editorRef.current) return;
  const editor = editorRef.current;
  const model = editor.getModel();
  if (!model) return;

  // ─── 1. 삽입 기준 행 결정 ─────────────────────────────────────────
  const pos = editor.getPosition();
  const baseLine =
    pos?.lineNumber ??
    lastSelectionRef?.current?.startLineNumber ??
    1;

  // ─── 2. 삽입 텍스트 구성 ─────────────────────────────────────────
  // 미디어 마크다운 앞뒤 공백 및 개행 정리
  const cleanText = text.replace(/^\n+/, '').replace(/\n+$/, '');
  const currentContent = model.getLineContent(baseLine).trim();
  const prefix = currentContent.length > 0 ? '\n' : '';
  // prefix + 미디어 한 줄 + 엔터 2회(\n\n)
  const fullText = `${prefix}${cleanText}\n\n`;

  // ─── 3. Collapsed range (현재 행 끝) 에 삽입 ─────────────────────
  const endCol = model.getLineLength(baseLine) + 1;
  const insertRange = (window as any).monaco?.Range 
    ? new (window as any).monaco.Range(baseLine, endCol, baseLine, endCol)
    : { startLineNumber: baseLine, startColumn: endCol, endLineNumber: baseLine, endColumn: endCol };

  editor.pushUndoStop();
  editor.executeEdits('insertMedia', [{ range: insertRange, text: fullText, forceMoveMarkers: true }]);
  editor.pushUndoStop();

  // ─── 4. 타깃 라인 계산 (삽입된 전체 줄 수의 마지막 빈 행) ─────────
  const addedNewlines = (fullText.match(/\n/g) || []).length;
  const targetLine = Math.min(baseLine + addedNewlines, model.getLineCount());

  try {
    if (typeof model.forceTokenization === 'function') {
      for (let i = baseLine; i <= targetLine + 1; i++) {
        model.forceTokenization(i);
      }
    }
    editor.layout();
  } catch (_) {}

  // ─── 5. 커서 및 선택영역을 마지막 빈 행으로 이동시키는 단일 헬퍼 ─────
  const applyTargetCursor = () => {
    if (!editorRef.current) return;
    const ed = editorRef.current;
    const m = ed.getModel();
    if (!m) return;
    const maxLines = m.getLineCount();
    const finalLine = Math.min(targetLine, maxLines);

    ed.setPosition({ lineNumber: finalLine, column: 1 });
    if ((window as any).monaco?.Range) {
      ed.setSelection(new (window as any).monaco.Range(finalLine, 1, finalLine, 1));
    } else {
      ed.setSelection({ selectionStartLineNumber: finalLine, selectionStartColumn: 1, positionLineNumber: finalLine, positionColumn: 1 });
    }
    ed.revealLineInCenter(finalLine);
    ed.focus();
  };

  // 모달 언마운트 및 브라우저 포커스 복원 이벤트에 덮어써지지 않도록 3단계로 강제 안착
  applyTargetCursor();
  setTimeout(applyTargetCursor, 50);
  setTimeout(applyTargetCursor, 150);

  // ─── 6. React 상태 및 미리보기 lineMap 즉각 동기화 ─────────────────
  if (typeof updateContent === 'function') {
    updateContent(model.getValue(), true);
  }
};



// ====================================================================
// 📊 [OMD-EDIT-editorActions-0003] editorActions ➔ findLineNumberByHeading
// 🎯 @KICK  : 문서 내에서 특정 제목 텍스트가 위치한 라인 번호를 탐색한다
// 🛡️ @GUARD : content나 heading이 falsy이면 1 반환, 매칭 실패 시에도 1 반환
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-012] findLineNumberByHeading 함수 (추출된 유틸리티)
 * @description 문서 내에서 특정 제목(Heading) 텍스트가 위치한 라인 번호를 탐색합니다.
 * @param content 전체 문서 내용
 * @param heading 찾고자 하는 대상 제목 텍스트
 * @returns 대상 제목이 발견된 라인 번호 (기본값: 1)
 */
export const findLineNumberByHeading = (content: string, heading: string): number => {
  if (!content || !heading) return 1;
  const lines = content.split('\n');
  const cleanTarget = heading.toLowerCase().replace(/\s+/g, '').normalize('NFC');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^#{1,6}\s+(.*)$/);
    if (match) {
      const headingText = match[1].trim();
      const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
      if (cleanHeading === cleanTarget) {
        return i + 1;
      }
    }
  }
  return 1;
};

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0002] editorActions ➔ insertBlockTag
// 🎯 @KICK  : 선택 영역 또는 커서 위치를 블록 태그로 감싼다
// 🛡️ @GUARD : editorRef.current가 없으면 early return, selection이 없으면 return
// 🚨 @PATCH : 2026-09-11 - [코드블록 기본 언어 markdown 설정 및 언어명 자동 선택 지원] startTag가 ```markdown 등으로 시작하는 코드블록 삽입 시, 본문 대신 첫 행의 언어 식별자(markdown)를 Monaco Selection으로 자동 선택하여 곧바로 언어 변경 타이핑이 가능하도록 개선
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-013] insertBlockTag 함수 (추출된 유틸리티)
 * @description 선택된 영역 또는 커서 위치를 HTML/마크다운 블록 태그(예: 코드 블록, 인용구 등)로 감싸줍니다.
 * @param editorRef 에디터 인스턴스 Ref 객체
 * @param startTag 시작 태그
 * @param endTag 종료 태그
 * @param defaultText 선택 영역이 없을 때 삽입할 기본 텍스트
 */
export const insertBlockTag = (editorRef: any, startTag: string, endTag: string, defaultText: string = "") => {
  if (!editorRef.current) return;
  const editor = editorRef.current;
  let selection = editor.getSelection();
  if (!selection) return;

  const model = editor.getModel();
  const text = model.getValueInRange(selection);

  // 💡 코드 블록 언어명 감지 (예: ```markdown)
  const langMatch = startTag.match(/^```([a-zA-Z0-9_-]+)/);

  if (text) {
    const newText = `${startTag}\n${text}\n${endTag}\n\n`;
    editor.pushUndoStop();
    editor.executeEdits("insertBlockTag", [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);
    editor.pushUndoStop();
    const linesAdded = startTag.split('\n').length;
    if (langMatch) {
      const lang = langMatch[1];
      const startCol = 4; // 1-based: 1 + 3(```)
      editor.setSelection(new (window as any).monaco.Selection(
        selection.startLineNumber,
        startCol,
        selection.startLineNumber,
        startCol + lang.length
      ));
    } else {
      editor.setSelection(new (window as any).monaco.Selection(
        selection.startLineNumber + linesAdded,
        selection.startColumn,
        selection.endLineNumber + linesAdded,
        selection.endColumn
      ));
    }
  } else {
    const textToWrap = defaultText;
    const newText = textToWrap ? `${startTag}\n${textToWrap}\n${endTag}\n\n` : `${startTag}\n\n${endTag}\n\n`;
    editor.pushUndoStop();
    editor.executeEdits("insertBlockTag", [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);
    editor.pushUndoStop();

    const linesAdded = startTag.split('\n').length;
    if (langMatch) {
      // 💡 [코드블록 언어 즉시 수정] markdown 등 언어 식별자 텍스트를 선택하여 곧바로 키보드 타이핑으로 언어 변경 가능
      const lang = langMatch[1];
      const startCol = 4; // 1-based: 1 + 3(```)
      editor.setSelection(new (window as any).monaco.Selection(
        selection.startLineNumber,
        startCol,
        selection.startLineNumber,
        startCol + lang.length
      ));
    } else if (textToWrap) {
      editor.setSelection(new (window as any).monaco.Selection(
        selection.startLineNumber + linesAdded,
        1,
        selection.startLineNumber + linesAdded,
        1 + textToWrap.length
      ));
    } else {
      editor.setPosition({
        lineNumber: selection.startLineNumber + linesAdded,
        column: 1
      });
    }
  }
  editor.focus();
  try {
    const model = editor.getModel();
    if (model && typeof model.forceTokenization === 'function') {
      const startLine = selection.startLineNumber;
      const endLine = selection.endLineNumber;
      const linesAdded = startTag.split('\n').length + endTag.split('\n').length + 2;
      for (let i = startLine; i <= endLine + linesAdded; i++) {
        model.forceTokenization(i);
      }
    }
    editor.layout();
  } catch (_) {}

  editor.focus();
};

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0001] editorActions ➔ wrapSelection
// 🎯 @KICK  : 선택된 텍스트를 지정된 문자열로 감싸거나 토글 방식으로 제거한다
// 🛡️ @GUARD : 이전 선택 영역이 없거나 비어 있으면 early return
// 🚨 @PATCH : **2026-09-03** — 선택된 텍스트에 서식(Bold/Italic 등) 적용 시 텍스트 앞뒤 태그만 분리 주입하고 pushUndoStop을 적용하여, Ctrl+Z 실행취소 시 텍스트는 보존되고 태그만 단독 취소되도록 개선
// 🔗 @CALLS : 없음
// ====================================================================
function extractOuterFormatting(text: string): { prefix: string; inner: string; suffix: string } {
  let prefix = '';
  let suffix = '';
  let inner = text;

  const pairs: [string, string][] = [
    ['***', '***'],
    ['___', '___'],
    ['**', '**'],
    ['__', '__'],
    ['*', '*'],
    ['_', '_'],
    ['~~', '~~'],
    ['<u>', '</u>'],
    ['<del>', '</del>'],
    ['<s>', '</s>'],
  ];

  let matched = true;
  while (matched) {
    matched = false;
    for (const [openTag, closeTag] of pairs) {
      if (
        inner.startsWith(openTag) &&
        inner.endsWith(closeTag) &&
        inner.length >= openTag.length + closeTag.length
      ) {
        prefix += openTag;
        suffix = closeTag + suffix;
        inner = inner.slice(openTag.length, inner.length - closeTag.length);
        matched = true;
        break;
      }
    }
  }

  return { prefix, inner, suffix };
}

/**
 * [ONR-15-014] wrapSelection 함수 (추출된 유틸리티)
 * @description 현재 드래그 선택된 텍스트의 앞뒤를 지정된 문자열로 감싸거나 토글식으로 제거합니다.
 */
export const wrapSelection = (editorRef: any, lastSelectionRef: any, before: string, after: string = before, defaultText: string = "") => {
  if (editorRef.current) {
    const editor = editorRef.current;
    const refreshTokens = (start: number, end: number) => {
      try {
        const model = editor.getModel();
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = start; i <= end; i++) {
            model.forceTokenization(i);
          }
        }
        editor.layout();
      } catch (_) {}
    };

    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();

    let startLine = selection.startLineNumber;
    let startCol = selection.startColumn;
    let endLine = selection.endLineNumber;
    let endCol = selection.endColumn;
    let text = model.getValueInRange(selection);

    let adjusted = false;
    while (text.length > 0 && (text[0] === '\r' || text[0] === '\n')) {
      adjusted = true;
      if (text[0] === '\n') {
        startLine++;
        startCol = 1;
      } else {
        startCol++;
      }
      text = text.slice(1);
    }
    while (text.length > 0 && (text[text.length - 1] === '\r' || text[text.length - 1] === '\n')) {
      adjusted = true;
      const lastChar = text[text.length - 1];
      if (lastChar === '\n') {
        endLine--;
        endCol = model.getLineMaxColumn(endLine);
      } else {
        endCol = Math.max(1, endCol - 1);
      }
      text = text.slice(0, -1);
    }

    if (adjusted) {
      selection = new (window as any).monaco.Selection(startLine, startCol, endLine, endCol);
    }

    const isEmpty = !text || text.length === 0;

    // 🌟 [인라인 코드와 다른 서식(굵게/기울기/밑줄/취소선) 공존 스마트 래핑]
    if (before === '`' && after === '`' && !isEmpty) {
      const { prefix, inner, suffix } = extractOuterFormatting(text);
      if (prefix || suffix) {
        let newText: string;
        if (inner.startsWith('`') && inner.endsWith('`') && inner.length >= 2) {
          // 이미 인라인 코드로 감싸져 있는 경우 -> 인라인 코드만 토글 해제
          newText = prefix + inner.slice(1, -1) + suffix;
        } else {
          // 서식 태그(굵게, 기울기, 밑줄, 취소선 등)를 바깥에 유지하고 내부 텍스트만 백틱으로 감싸서 서식 동시 반영 보장
          newText = prefix + '`' + inner + '`' + suffix;
        }
        const range = new (window as any).monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
        editor.pushUndoStop();
        editor.executeEdits("wrap-inline-code-smart", [{ range, text: newText, forceMoveMarkers: true }]);
        editor.pushUndoStop();

        setTimeout(() => {
          if (!selection) return;
          const startLine = selection.startLineNumber;
          const startCol = selection.startColumn;
          editor.setSelection(new (window as any).monaco.Selection(
            startLine,
            startCol,
            startLine,
            startCol + newText.length
          ));
          refreshTokens(startLine, startLine);
        }, 10);
        editor.focus();
        return;
      }
    }

    if (before && after && text.startsWith(before) && text.endsWith(after) && text.length >= (before.length + after.length)) {
      const stripped = text.slice(before.length, text.length - after.length);

      const range = new (window as any).monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      );
      editor.pushUndoStop();
      editor.executeEdits("toggle-off-inside", [{ range, text: stripped, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      setTimeout(() => {
        if (!selection) return;
        const startLine = selection.startLineNumber;
        const startCol = selection.startColumn;
        editor.setSelection(new (window as any).monaco.Selection(
          startLine,
          startCol,
          startLine,
          startCol + stripped.length
        ));
        refreshTokens(startLine, startLine);
      }, 10);
      editor.focus();
      return;
    }

    if (before && after) {
      const startLine = selection.startLineNumber;
      const startCol = selection.startColumn;
      const endLine = selection.endLineNumber;
      const endCol = selection.endColumn;

      if (startLine === endLine && startCol > before.length) {
        const rangeBefore = new (window as any).monaco.Range(startLine, startCol - before.length, startLine, startCol);
        const rangeAfter = new (window as any).monaco.Range(endLine, endCol, endLine, endCol + after.length);

        const textBefore = model.getValueInRange(rangeBefore);
        const textAfter = model.getValueInRange(rangeAfter);

        if (textBefore === before && textAfter === after) {
          const fullRange = new (window as any).monaco.Range(startLine, startCol - before.length, endLine, endCol + after.length);
          editor.pushUndoStop();
          editor.executeEdits("toggle-off-outside", [{ range: fullRange, text: text, forceMoveMarkers: true }]);
          editor.pushUndoStop();

          setTimeout(() => {
            if (!selection) return;
            editor.setSelection(new (window as any).monaco.Selection(
              startLine,
              startCol - before.length,
              endLine,
              startCol - before.length + text.length
            ));
            refreshTokens(startLine, endLine);
          }, 10);
          editor.focus();
          return;
        }
      }
    }

    if (!isEmpty) {
      // 💡 [태그 분리 삽입 스마트 엔진]
      // 텍스트가 선택된 상태에서 서식 적용 시, 텍스트 자체를 치환하지 않고
      // 텍스트 앞(start)과 뒤(end)에 태그만 독립 주입합니다.
      // 이렇게 하면 Ctrl+Z(실행취소) 시 원본 텍스트는 100% 안전하게 보존되고 오직 '태그'만 취소되어
      // 사용자가 방금 입력한 문자가 통째로 날아가는 현상을 완벽하게 방지합니다!
      const edits = [];
      if (before) {
        edits.push({
          range: new (window as any).monaco.Range(startLine, startCol, startLine, startCol),
          text: before,
          forceMoveMarkers: true
        });
      }
      if (after) {
        edits.push({
          range: new (window as any).monaco.Range(endLine, endCol, endLine, endCol),
          text: after,
          forceMoveMarkers: true
        });
      }

      editor.pushUndoStop();
      editor.executeEdits("wrap-tag", edits);
      editor.pushUndoStop();

      setTimeout(() => {
        if (!selection) return;
        const selectStart = startCol + (before ? before.length : 0);
        const selectEnd = (startLine === endLine) ? (endCol + (before ? before.length : 0)) : endCol;
        editor.setSelection(new (window as any).monaco.Selection(
          startLine,
          selectStart,
          endLine,
          selectEnd
        ));
        refreshTokens(startLine, endLine);
      }, 10);
      editor.focus();
      return;
    }

    // 선택 영역이 비어 있는 경우: 동일 서식 태그가 이미 존재하면 취소(토글 해제)
    if (isEmpty && before && after) {
      const startLine = selection.startLineNumber;
      const startCol = selection.startColumn;

      // 1) 커서가 바로 태그 사이에 위치한 경우: before|after (예: **|**)
      if (startCol > before.length) {
        const rangeBefore = new (window as any).monaco.Range(startLine, startCol - before.length, startLine, startCol);
        const rangeAfter = new (window as any).monaco.Range(startLine, startCol, startLine, startCol + after.length);
        if (model.getValueInRange(rangeBefore) === before && model.getValueInRange(rangeAfter) === after) {
          const fullRange = new (window as any).monaco.Range(startLine, startCol - before.length, startLine, startCol + after.length);
          editor.pushUndoStop();
          editor.executeEdits("toggle-off-empty-tags", [{ range: fullRange, text: "", forceMoveMarkers: true }]);
          editor.pushUndoStop();
          editor.setPosition({ lineNumber: startLine, column: startCol - before.length });
          refreshTokens(startLine, startLine);
          editor.focus();
          return;
        }
      }

      // 2) 커서가 감싸진 단어 내부에 위치한 경우 (예: **단|어**)
      const lineContent = model.getLineContent(startLine);
      const beforeIdx = lineContent.lastIndexOf(before, startCol - 1);
      if (beforeIdx >= 0) {
        const afterIdx = lineContent.indexOf(after, beforeIdx + before.length);
        if (afterIdx >= 0 && (startCol - 1) <= afterIdx + after.length) {
          const innerText = lineContent.slice(beforeIdx + before.length, afterIdx);
          const fullRange = new (window as any).monaco.Range(startLine, beforeIdx + 1, startLine, afterIdx + after.length + 1);
          editor.pushUndoStop();
          editor.executeEdits("toggle-off-word", [{ range: fullRange, text: innerText, forceMoveMarkers: true }]);
          editor.pushUndoStop();
          editor.setPosition({ lineNumber: startLine, column: Math.max(beforeIdx + 1, startCol - before.length) });
          refreshTokens(startLine, startLine);
          editor.focus();
          return;
        }
      }
    }

    // 선택 영역이 비어 있는 경우: defaultText를 포함하여 통째로 삽입
    const textToWrap = defaultText || "";
    const range = new (window as any).monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );
    editor.pushUndoStop();
    editor.executeEdits("wrap-empty", [{ range, text: `${before}${textToWrap}${after}`, forceMoveMarkers: true }]);
    editor.pushUndoStop();

    setTimeout(() => {
      if (!selection) return;
      const startLine = selection.startLineNumber;
      const startCol = selection.startColumn;
      const endLine = selection.endLineNumber;
      const endCol = selection.endColumn;

      if (startLine === endLine) {
        const selectStart = startCol + before.length;
        const selectEnd = defaultText ? selectStart + defaultText.length : endCol + before.length;
        editor.setSelection(new (window as any).monaco.Selection(
          startLine,
          selectStart,
          endLine,
          selectEnd
        ));
      } else {
        editor.setSelection(new (window as any).monaco.Selection(
          startLine,
          startCol,
          endLine,
          endCol + after.length
        ));
      }
      refreshTokens(startLine, endLine);
    }, 10);
    editor.focus();
  }
};


// ====================================================================
// 📊 [OMD-EDIT-editorActions-0007] editorActions ➔ applyLinePrefix & removePrefix
// 🎯 @KICK  : Monaco 줄 접두사 서식(제목, 목록, 인용구, 체크박스 등) 적용/취소 및 서식 지우기
// 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] MainEditorApp에서 480줄 접두사/감싸기 로직을 editorActions로 이관
// ====================================================================
  export const applyLinePrefix = (editorRef: any, lastSelectionRef: any, prefixType: 'orderedList' | 'list' | 'quote' | 'check' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', alertType?: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;

    // ─────────────────────────────────────────────────────────────
    // 1. 제목 (H1 ~ H6) 토글/취소 처리
    // ─────────────────────────────────────────────────────────────
    if (prefixType.startsWith('h') && prefixType.length === 2 && !isNaN(Number(prefixType[1]))) {
      const targetLevel = Number(prefixType[1]);
      const targetPrefix = '#'.repeat(targetLevel) + ' ';

      // 선택된 모든 줄이 이미 해당 레벨의 제목인지 확인
      let allAlreadyTarget = true;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const headingMatch = lineContent.match(/^(\s*)(#{1,6})\s+(.*)/);
        if (!headingMatch || headingMatch[2].length !== targetLevel) {
          allAlreadyTarget = false;
          break;
        }
      }

      const edits = [];
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const match = lineContent.match(/^(\s*)(#{1,6})\s*(.*)/);
        if (allAlreadyTarget) {
          // 🔥 취소: 이미 해당 제목이 설정되어 있으므로 # 기호를 제거하여 일반 문단으로 복귀
          if (match) {
            const indent = match[1] || '';
            const rest = match[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${rest}`,
              forceMoveMarkers: true
            });
          }
        } else {
          // 적용/변경: 기존 제목 기호가 있으면 해당 레벨로 치환, 없으면 접두사 추가
          if (match) {
            const indent = match[1] || '';
            const rest = match[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${targetPrefix}${rest}`,
              forceMoveMarkers: true
            });
          } else {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const rest = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${targetPrefix}${rest}`,
              forceMoveMarkers: true
            });
          }
        }
      }

      editor.pushUndoStop();
      editor.executeEdits("toggleHeading", edits);
      editor.pushUndoStop();

      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= endLine; i++) {
            model.forceTokenization(i);
          }
        }
        editor.layout();
      } catch (_) { }

      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Alert 인용구 토글/취소 처리
    // ─────────────────────────────────────────────────────────────
    if (prefixType === 'quote' && alertType) {
      // 선택된 줄 중 이미 동일한 Alert 태그를 가지고 있는지 확인
      let allAlreadyThisAlert = true;
      let alertCount = 0;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const existingAlertMatch = lineContent.match(/^(\s*>+\s*)\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\](.*)/i);
        if (existingAlertMatch) {
          alertCount++;
        } else if (lineContent.trim()) {
          allAlreadyThisAlert = false;
        }
      }

      if (alertCount > 0 && allAlreadyThisAlert) {
        // 🔥 취소: 이미 동일한 Alert 인용구이므로 Alert 태그 및 인용구 제거하여 일반 문단으로 복귀
        const edits = [];
        for (let i = startLine; i <= endLine; i++) {
          const lineContent = model.getLineContent(i);
          const clean = lineContent.replace(/^(\s*)>+\s*(\[!.*?\])?\s*/i, '$1');
          edits.push({
            range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
            text: clean,
            forceMoveMarkers: true
          });
        }
        editor.pushUndoStop();
        editor.executeEdits("cancelAlertQuote", edits);
        editor.pushUndoStop();
        try {
          if (model && typeof model.forceTokenization === 'function') {
            for (let i = startLine; i <= endLine; i++) model.forceTokenization(i);
          }
          editor.layout();
        } catch (_) { }
        editor.focus();
        return;
      }

      // 💡 [Alert 인용구 빈 줄 단독 커서 삽입]
      if (selection.isEmpty()) {
        const lineContent = model.getLineContent(startLine);
        if (lineContent.trim() === '') {
          const insertText = `> [!${alertType}]\n> \n\n`;
          editor.pushUndoStop();
          editor.executeEdits("insertAlertQuote", [{
            range: new (window as any).monaco.Range(startLine, 1, startLine, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          editor.setPosition({ lineNumber: startLine + 1, column: 3 });
          editor.pushUndoStop();
          editor.focus();
          return;
        }
      }

      const edits = [];
      let addedAlertHeaderLine = false;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const existingAlertMatch = lineContent.match(/^(\s*>+\s*)\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\](.*)/i);
        if (existingAlertMatch) {
          const prefix = existingAlertMatch[1];
          const rest = existingAlertMatch[2];
          edits.push({
            range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
            text: `${prefix}[!규칙${alertType}]${rest}`.replace('!규칙', '!'),
            forceMoveMarkers: true
          });
        } else if (i === startLine) {
          addedAlertHeaderLine = true;
          const quoteMatch = lineContent.match(/^(\s*)(>+\s*)(.*)/);
          if (quoteMatch) {
            const indent = quoteMatch[1] || '';
            const quotes = quoteMatch[2] || '> ';
            const text = quoteMatch[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> [!${alertType}]\n${indent}${quotes}${text}`,
              forceMoveMarkers: true
            });
          } else {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const text = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> [!${alertType}]\n${indent}> ${text}`,
              forceMoveMarkers: true
            });
          }
        } else {
          const quoteMatch = lineContent.match(/^(\s*)(>+\s*)(.*)/);
          if (!quoteMatch) {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const text = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> ${text}`,
              forceMoveMarkers: true
            });
          }
        }
      }

      editor.pushUndoStop();
      editor.executeEdits("applyAlertQuote", edits);
      const quoteEndLine = endLine + (addedAlertHeaderLine ? 1 : 0);
      const quoteEndCol = model.getLineContent(quoteEndLine).length + 1;
      editor.executeEdits("appendQuoteEmptyLine", [{
        range: new (window as any).monaco.Range(quoteEndLine, quoteEndCol, quoteEndLine, quoteEndCol),
        text: '\n\n',
        forceMoveMarkers: false
      }]);
      editor.setPosition({ lineNumber: quoteEndLine, column: quoteEndCol });
      editor.pushUndoStop();
      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= Math.min(model.getLineCount(), endLine + 3); i++) model.forceTokenization(i);
        }
        editor.layout();
      } catch (_) { }
      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. 일반 서식 (quote, list, orderedList, check) 토글/취소 판단
    // ─────────────────────────────────────────────────────────────
    let allAlreadyHavePrefix = true;
    let nonEmptyCount = 0;
    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      if (!lineContent.trim()) continue;
      nonEmptyCount++;

      if (prefixType === 'quote') {
        if (!lineContent.match(/^\s*>+\s*/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'list') {
        if (!lineContent.match(/^\s*[-*+]\s+/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'orderedList') {
        if (!lineContent.match(/^\s*\d+\.\s+/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'check') {
        if (!lineContent.match(/^\s*- \[[ xX]\]\s+/)) { allAlreadyHavePrefix = false; break; }
      }
    }

    if (nonEmptyCount > 0 && allAlreadyHavePrefix) {
      // 🔥 취소: 이미 동일한 기능이 설정되어 있으므로 접두사 제거 (취소 토글)
      const edits = [];
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        if (!lineContent.trim()) continue;

        let cleanLine = lineContent;
        if (prefixType === 'quote') {
          cleanLine = lineContent.replace(/^(\s*)>+\s*/, '$1');
        } else if (prefixType === 'list') {
          cleanLine = lineContent.replace(/^(\s*)[-*+]\s+/, '$1');
        } else if (prefixType === 'orderedList') {
          cleanLine = lineContent.replace(/^(\s*)\d+\.\s+/, '$1');
        } else if (prefixType === 'check') {
          cleanLine = lineContent.replace(/^(\s*)- \[[ xX]\]\s+/, '$1');
        }

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
          text: cleanLine,
          forceMoveMarkers: true
        });
      }

      editor.pushUndoStop();
      editor.executeEdits("cancelPrefix", edits);
      editor.pushUndoStop();
      setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= endLine; i++) model.forceTokenization(i);
        }
        editor.layout();
      } catch (_) { }
      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 일반 서식 신규 적용
    // ─────────────────────────────────────────────────────────────
    const edits = [];
    let counter = 1;
    const selectedIndents = Array.from({length:endLine-startLine+1},(_,index)=>model.getLineContent(startLine+index))
      .filter(line=>line.trim()).map(line=>line.match(/^[ \t]*/)?.[0] || '');
    const orderedIndent = selectedIndents.reduce((shortest,indent)=>indent.length<shortest.length?indent:shortest,selectedIndents[0] || '');
    if (prefixType === 'orderedList') {
      for (let j = startLine - 1; j > 0; j--) {
        const prevLine = model.getLineContent(j);
        if (prevLine.trim() === '') break;
        const match = prevLine.match(/^(\s*)(\d+)\.\s/);
        if (match) {
          counter = parseInt(match[2], 10) + 1;
          break;
        }
        if (startLine - j > 10) break;
      }
    }

    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      const match = lineContent.match(/^(\s*)(>+\s*)?((?:- \[[ xX]\]|[-*+]|\d+\.)\s+)?(.*)/);
      if (prefixType === 'orderedList' && !lineContent.trim()) continue;

      if (match) {
        const indent = prefixType === 'orderedList' && endLine > startLine ? orderedIndent : match[1] || '';
        const quotes = match[2] || '';
        const listSymbol = match[3] || '';
        let text = match[4] || '';
        if (prefixType === 'orderedList') text = text.replace(/^(?:[ \t]*\d+\\?[.)](?:[ \t]+|(?=[가-힣])))+/, '');

        let newQuotes = quotes;
        let newListSymbol = listSymbol;

        if (prefixType === 'quote') {
          newQuotes = quotes ? '>' + quotes : '> ';
        } else {
          let targetListSymbol = '';
          if (prefixType === 'orderedList') {
            targetListSymbol = `${counter}. `;
            counter++;
          } else if (prefixType === 'list') {
            targetListSymbol = '- ';
          } else if (prefixType === 'check') {
            targetListSymbol = '- [ ] ';
          }
          newListSymbol = targetListSymbol;
        }

        const textStartIndex = lineContent.length - text.length;
        const newPrefix = `${indent}${newQuotes}${newListSymbol}`;

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, textStartIndex + 1),
          text: newPrefix,
          forceMoveMarkers: true
        });
      } else {
        let fallbackPrefix = '';
        if (prefixType === 'orderedList') {
          fallbackPrefix = `${counter}. `;
          counter++;
        } else if (prefixType === 'list') {
          fallbackPrefix = '- ';
        } else if (prefixType === 'quote') {
          fallbackPrefix = '> ';
        } else if (prefixType === 'check') {
          fallbackPrefix = '- [ ] ';
        }

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, 1),
          text: fallbackPrefix,
          forceMoveMarkers: true
        });
      }
    }

    editor.pushUndoStop();
    editor.executeEdits("applyPrefix", edits);
    if (prefixType === 'quote') {
      const quoteEndLine = endLine;
      const quoteEndCol = model.getLineContent(quoteEndLine).length + 1;
      editor.executeEdits("appendQuoteEmptyLine", [{
        range: new (window as any).monaco.Range(quoteEndLine, quoteEndCol, quoteEndLine, quoteEndCol),
        text: '\n\n',
        forceMoveMarkers: false
      }]);
      editor.setPosition({ lineNumber: quoteEndLine, column: quoteEndCol });
    }
    editor.pushUndoStop();
    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);

    try {
      const model = editor.getModel();
      if (model && typeof model.forceTokenization === 'function') {
        const maxTokenLine = Math.min(model.getLineCount(), endLine + (prefixType === 'quote' ? 3 : 0));
        for (let i = startLine; i <= maxTokenLine; i++) {
          model.forceTokenization(i);
        }
      }
      editor.layout();
    } catch (_) { }

    editor.focus();
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0066] MainEditorApp.tsx ➔ removePrefix
  // 🎯 @KICK  : 선택 영역에서 마크다운 서식 태그 제거: 굵게, 기울임, 취소선, 코드, 링크, 제목, 목록
  // 🛡️ @GUARD : 빈 선택 영역을 전체 줄로 확장 처리; 정규식 기반 정리로 선행 공백 보존
  // 🚨 @PATCH : 구문 강조 새로고침을 위해 편집 후 forceTokenization
  // 🔗 @CALLS : editor.getSelection, editor.executeEdits, model.forceTokenization, editor.layout
  // ====================================================================
  export const removePrefix = (editorRef: any, lastSelectionRef: any) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();

    let rangeToProcess = selection;
    if (selection.isEmpty()) {
      const cursorLine = selection.positionLineNumber;
      const lineLen = model.getLineLength(cursorLine);
      rangeToProcess = new (window as any).monaco.Range(cursorLine, 1, cursorLine, lineLen + 1);
    }

    const selectedText = model.getValueInRange(rangeToProcess);
    const cleanedText = clearMarkdownFormatting(selectedText);

    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
    editor.pushUndoStop();
    editor.executeEdits("removeMarkdownTags", [
      {
        range: rangeToProcess,
        text: cleanedText,
        forceMoveMarkers: true
      }
    ]);
    editor.pushUndoStop();

    // [WBS SYNC-02] 주입 직후 구문 강조와 배경 스타일이 즉시 화면에 렌더링되도록 Monaco 모델의 강제 토큰화 수동 격발
    try {
      const model = editor.getModel();
      if (model && typeof model.forceTokenization === 'function') {
        const startLine = rangeToProcess.startLineNumber;
        const endLine = rangeToProcess.endLineNumber;
        for (let i = startLine; i <= endLine; i++) {
          model.forceTokenization(i);
        }
      }
      editor.layout();
    } catch (_) { }

    editor.focus();
  };

  // ====================================================================

// ====================================================================
// 📊 [OMD-EDIT-editorActions-0008] editorActions ➔ quickWrap
// 🎯 @KICK  : 선택 영역 또는 현재 줄을 제목/인용구/코드 서식으로 감싸기
// ====================================================================
  export const quickWrap = (editorRef: any, lastSelectionRef: any, format: 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if (!selection) return;
    const model = editor.getModel();
    if (!model) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;

    // No selection → auto-select entire current line
    if (selection.isEmpty()) {
      const pos = editor.getPosition();
      if (!pos) return;
      const lineNum = pos.lineNumber;
      const lineContent = model.getLineContent(lineNum);
      editor.setSelection(new monaco.Selection(
        lineNum, 1,
        lineNum, lineContent.length + 1
      ));
      selection = editor.getSelection();
      if (!selection || selection.isEmpty()) return;
    }

    switch (format) {
      case 'h1': wrapSelection(editorRef, lastSelectionRef, '# ', '', ''); break;
      case 'h2': wrapSelection(editorRef, lastSelectionRef, '## ', '', ''); break;
      case 'h3': wrapSelection(editorRef, lastSelectionRef, '### ', '', ''); break;
      case 'quote': applyLinePrefix(editorRef, lastSelectionRef, 'quote'); break;
      case 'code': insertBlockTag(editorRef, '```markdown', '```', '코드'); break;
    }
    editor.focus();
  };

