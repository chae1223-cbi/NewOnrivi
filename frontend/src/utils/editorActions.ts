// @ts-nocheck
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
