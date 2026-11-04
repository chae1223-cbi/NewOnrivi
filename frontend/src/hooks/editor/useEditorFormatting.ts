// ====================================================================
// 📊 [OMD-HOOK-useEditorFormatting] frontend/src/hooks/editor/useEditorFormatting.ts
// 🎯 @KICK  : Monaco 텍스트 삽입·서식 조작(접두사/감싸기/블록 태그/링크), 표 변환·붙여넣기 정제 위임, 문서 미디어 교체·편집, 날짜 삽입, AI 초안 적용을 담당하는 서식 조작 훅
// 🛡️ @GUARD : 위지윅 수식 삽입 대기(visualFormulaInsertRef) 우선 처리, 활성 탭/원본 범위 불일치 시 미디어 교체 차단, 제한 사용자 편집 차단
// 🚨 @PATCH : 2026-11-04 — [주석 표준화] 내부 함수 2단계 JSDoc 표준화 및 식별 배너 파일명 최신화
//             2026-11-04 — [MainEditorApp 모듈화]: insertAtCursor, scrollToLine, insertBlockTag, wrapSelection, insertLink, parseHtmlTableToMarkdown, sanitizePastedText, fixMarkdownTable, replaceDocumentMedia, editDocumentMedia, applyLinePrefix, removePrefix, quickWrap, handleInsertFormattedDate, handleAIDraftApply를 MainEditorApp.tsx에서 분리 위임 (동작 변경 없음)
// 🔗 @CALLS : utilsEditorActions, utilsPasteHandlers, mediaSourceRange, visualImageDetails
// ====================================================================

import { useCallback, useEffect } from 'react';
import * as utilsEditorActions from '@/utils/editorActions';
import * as utilsPasteHandlers from '@/utils/pasteHandlers';
import { mediaSourceRange } from '@/lib/mediaSourceRange';
import { visualImageDetails } from '@/lib/visualDocumentCodec';

type ShowToast = (message: string, type?: any, ...rest: any[]) => void;

export interface UseEditorFormattingProps {
  editorRef: React.MutableRefObject<any>;
  previewRef: React.MutableRefObject<HTMLDivElement | null>;
  lastSelectionRef: React.MutableRefObject<any>;
  contentRef: React.MutableRefObject<string>;
  activeTabIdRef: React.MutableRefObject<string | null>;
  previewModeRef: React.MutableRefObject<any>;
  visualFormulaInsertRef: React.MutableRefObject<((formula: string) => boolean | void) | null>;
  visualMediaInsertRef: React.MutableRefObject<{ kind: string; documentId: string; insert: (code: string) => boolean } | null>;
  visualCommandRef: React.MutableRefObject<((command: string) => boolean) | null>;
  isRestrictedUser: boolean;
  showToast: ShowToast;
  updateContent: (next: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  setEditingImageInfo: (info: any) => void;
  setIsImageModalOpen: (open: boolean) => void;
  setMediaDialogSource: (source: { kind: 'video' | 'map'; source: string } | null) => void;
  setIsMapModalOpen: (open: boolean) => void;
  setYoutubeInitialUrl: (url: string | null) => void;
  setIsYoutubeModalOpen: (open: boolean) => void;
  setIsAIDraftModalOpen: (open: boolean) => void;
}

/**
 * ========================================================================================
 * [함수명] useEditorFormatting - Monaco 에디터 서식 조작 및 텍스트 삽입 핸들러 묶음을 제공합니다.
 * (MainEditorApp에 있던 서식/삽입 관련 핸들러를 동일한 동작으로 이관한 훅입니다.)
 *
 * @param {UseEditorFormattingProps} props - 에디터/미리보기 ref, 상태 setter, 토스트 함수
 * @returns {object} insertAtCursor, scrollToLine, wrapSelection 등 서식 조작 핸들러 집합
 *
 * @example
 * const { insertAtCursor, quickWrap } = useEditorFormatting({ editorRef, previewRef, ... });
 * ==========================================================================================
 */
export function useEditorFormatting(props: UseEditorFormattingProps) {
  const {
    editorRef,
    previewRef,
    lastSelectionRef,
    contentRef,
    activeTabIdRef,
    previewModeRef,
    visualFormulaInsertRef,
    visualMediaInsertRef,
    visualCommandRef,
    isRestrictedUser,
    showToast,
    updateContent,
    setTabs,
    setEditingImageInfo,
    setIsImageModalOpen,
    setMediaDialogSource,
    setIsMapModalOpen,
    setYoutubeInitialUrl,
    setIsYoutubeModalOpen,
    setIsAIDraftModalOpen,
  } = props;

  /**
   * ========================================================================================
   * [함수명] insertAtCursor - 커서 위치 텍스트 삽입을 수행합니다 (수식 삽입 대기 콜백 우선 처리).
   *
   * @param {string} text - 삽입할 텍스트
   * @returns {boolean} 삽입 성공 여부
   * ==========================================================================================
   */
  const insertAtCursor = useCallback((text: string) => {
    if (visualFormulaInsertRef.current) {
      visualFormulaInsertRef.current(text);
      visualFormulaInsertRef.current = null;
      return true;
    }
    return utilsEditorActions.insertAtCursor(editorRef, lastSelectionRef, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003.2] 지식 베이스 질의응답 답변 에디터 커서 삽입 리스너
  useEffect(() => {
    const handleInsert = (e: CustomEvent) => {
      const text = e.detail;
      if (text && typeof text === 'string') {
        insertAtCursor(text);
      }
    };

    // 📁 [탐색기 폴더 연결 커서 위치 삽입 리스너]
    const handleInsertFolderLink = (e: CustomEvent) => {
      const { link, folderName } = e.detail || {};
      if (!link) return;
      const editor = editorRef.current;
      if (editor && activeTabIdRef.current && previewModeRef.current !== 'preview') {
        insertAtCursor(link);
        showToast(`'${folderName || '폴더'}' 폴더 연결이 커서 위치에 삽입되었습니다.`, 'success');
      } else {
        showToast(`'${folderName || '폴더'}' 폴더 연결 링크가 클립보드에 복사되었습니다.`, 'info');
      }
    };

    window.addEventListener('app:insert-at-cursor', handleInsert as any);
    window.addEventListener('app:insert-folder-link', handleInsertFolderLink as any);
    return () => {
      window.removeEventListener('app:insert-at-cursor', handleInsert as any);
      window.removeEventListener('app:insert-folder-link', handleInsertFolderLink as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, insertAtCursor]);

  /**
   * ========================================================================================
   * [함수명] findLineNumberByHeading - 마크다운 본문에서 특정 제목 텍스트가 위치한 행 번호를 검색합니다.
   *
   * @param {string} content - 마크다운 원문
   * @param {string} heading - 찾을 제목 텍스트
   * @returns {number} 1-based 행 번호
   * ==========================================================================================
   */
  const findLineNumberByHeading = (content: string, heading: string): number => {
    return utilsEditorActions.findLineNumberByHeading(content, heading);
  };

  /**
   * ========================================================================================
   * [함수명] scrollToLine - Monaco 에디터를 지정한 행 번호로 스크롤 및 포커스 이동시킵니다.
   *
   * @param {number} lineNumber - 이동할 대상 행 번호
   * @returns {void}
   * ==========================================================================================
   */
  const scrollToLine = (lineNumber: number) => {
    utilsEditorActions.scrollToLine(editorRef, lineNumber);
  };

  /**
   * ========================================================================================
   * [함수명] insertBlockTag - 선택 영역을 블록 시작/종료 태그로 감쌉니다.
   *
   * @param {string} startTag - 시작 태그
   * @param {string} endTag - 종료 태그
   * @param {string} [defaultText=''] - 선택 영역이 없을 때 삽입할 기본 텍스트
   * @returns {void}
   * ==========================================================================================
   */
  const insertBlockTag = (startTag: string, endTag: string, defaultText: string = "") => {
    utilsEditorActions.insertBlockTag(editorRef, startTag, endTag, defaultText);
  };

  /**
   * ========================================================================================
   * [함수명] wrapSelection - 선택 영역을 인라인 서식 기호(예: **, *, ~~)로 감싸거나 해제합니다.
   *
   * @param {string} before - 앞쪽 감싸기 기호
   * @param {string} [after=before] - 뒤쪽 감싸기 기호
   * @param {string} [defaultText=''] - 기본 텍스트
   * @returns {void}
   * ==========================================================================================
   */
  const wrapSelection = (before: string, after: string = before, defaultText: string = "") => {
    utilsEditorActions.wrapSelection(editorRef, lastSelectionRef, before, after, defaultText);
  };

  /**
   * ========================================================================================
   * [함수명] insertLink - 커서 위치에 마크다운 링크 문법을 삽입하고 URL 입력 위치를 선택합니다.
   *
   * @returns {void}
   * ==========================================================================================
   */
  const insertLink = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.focus();

    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();
    const selectedText = model.getValueInRange(selection);

    if (selectedText) {
      const textToInsert = `[${selectedText}](https://)`;
      const range = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      };
      editor.pushUndoStop();
      editor.executeEdits("insertLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      const cursorColumn = selection.startColumn + 1 + selectedText.length + 2 + 8;

      editor.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: cursorColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: cursorColumn
      });
    } else {
      const textToInsert = `[홈페이지명](https://)`;
      const range = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      };
      editor.pushUndoStop();
      editor.executeEdits("insertLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      const startColumn = selection.startColumn + 1;
      const endColumn = startColumn + 5;

      editor.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: startColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: endColumn
      });
    }
  };

  /**
   * ========================================================================================
   * [함수명] parseHtmlTableToMarkdown - HTML 표 마크업을 GFM 마크다운 표로 변환합니다.
   *
   * @param {string} html - HTML 문자열
   * @returns {string} 변환된 마크다운 표 문자열
   * ==========================================================================================
   */
  const parseHtmlTableToMarkdown = (html: string) => {
    return utilsPasteHandlers.parseHtmlTableToMarkdown(html, showToast);
  };

  /**
   * ========================================================================================
   * [함수명] sanitizePastedText - 붙여넣은 텍스트의 불필요한 공백 및 TSV 표를 정제합니다.
   *
   * @param {string} text - 원본 텍스트
   * @param {boolean} [skipTsvConversion=false] - TSV 표 자동 변환 생략 여부
   * @returns {string} 정제된 텍스트
   * ==========================================================================================
   */
  const sanitizePastedText = (text: string, skipTsvConversion = false) => {
    return utilsPasteHandlers.sanitizePastedText(text, skipTsvConversion);
  };

  /**
   * ========================================================================================
   * [함수명] fixMarkdownTable - 깨진 마크다운 표 구분선 및 열 개수를 자동 보정합니다.
   *
   * @param {string} text - 마크다운 텍스트
   * @returns {string} 보정된 마크다운 텍스트
   * ==========================================================================================
   */
  const fixMarkdownTable = (text: string) => {
    return utilsPasteHandlers.fixMarkdownTable(text);
  };

  /**
   * ========================================================================================
   * [함수명] replaceDocumentMedia - 문서 내 지정된 원본 미디어 코드 범위를 새 마크다운 코드로 교체합니다.
   *
   * @param {any} range - 원본 미디어 범위 정보 (documentId, from, to, source)
   * @param {string} code - 교체할 새 마크다운 코드
   * @returns {boolean} 교체 성공 여부
   * ==========================================================================================
   */
  const replaceDocumentMedia = (range: any, code: string) => {
    if (range.documentId !== activeTabIdRef.current || contentRef.current.slice(range.from,range.to) !== range.source) return false;
    const next = contentRef.current.slice(0,range.from) + code.trim() + contentRef.current.slice(range.to);
    contentRef.current = next; updateContent(next);
    setTabs(previous=>previous.map(tab=>tab.id===range.documentId?{...tab,content:next,isModified:true}:tab));
    return true;
  };

  /**
   * ========================================================================================
   * [함수명] editDocumentMedia - 미리보기에서 선택한 이미지·영상·지도 원본 범위를 찾아 편집 모달을 엽니다.
   *
   * @param {'image' | 'video' | 'map'} kind - 미디어 종류
   * @param {string} path - 미디어 경로 또는 URL
   * @param {number} line - 문서 행 번호
   * @returns {void}
   * ==========================================================================================
   */
  const editDocumentMedia = (kind:'image'|'video'|'map',path:string,line:number) => {
    if (isRestrictedUser) return;
    const found = mediaSourceRange(contentRef.current,kind,path,line);
    if (!found) {showToast('원본 미디어 위치를 찾지 못했습니다.','warning');return;}
    const range = {...found,documentId:activeTabIdRef.current,documentMedia:true};
    if (kind==='image') {
      const details = visualImageDetails(found.source);
      const params = new URLSearchParams(details.path.split('?')[1] || '');
      const captionPos = params.get('caption');
      setEditingImageInfo({
        path: details.path,
        alt: details.alt,
        width: params.get('width') || '',
        height: params.get('height') || '',
        align: params.get('align') || 'center',
        captionPos: (captionPos === 'top' || captionPos === 'bottom') ? captionPos : undefined,
        range
      });
      setIsImageModalOpen(true);
    } else {
      visualMediaInsertRef.current = {kind,documentId:range.documentId as string,insert:code=>replaceDocumentMedia(range,code)};
      setMediaDialogSource({kind,source:found.source});
      if(kind==='map')setIsMapModalOpen(true);else{setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
    }
  };

  /**
   * ========================================================================================
   * [함수명] applyLinePrefix - 선택한 줄들에 목록·인용문·체크리스트·제목(H1~H6) 접두사 서식을 적용합니다.
   *
   * @param {'orderedList' | 'list' | 'quote' | 'check' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'} prefixType - 접두사 종류
   * @param {string} [alertType] - 인용문 알림 타입 (NOTE, TIP 등)
   * @returns {void}
   * ==========================================================================================
   */
  const applyLinePrefix = useCallback((prefixType: 'orderedList' | 'list' | 'quote' | 'check' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', alertType?: string) => {
    utilsEditorActions.applyLinePrefix(editorRef, lastSelectionRef, prefixType, alertType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ========================================================================================
   * [함수명] removePrefix - 선택한 줄들의 마크다운 블록/인라인 서식 기호를 제거합니다.
   *
   * @returns {void}
   * ==========================================================================================
   */
  const removePrefix = useCallback(() => {
    utilsEditorActions.removePrefix(editorRef, lastSelectionRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ========================================================================================
   * [함수명] quickWrap - 선택한 영역에 빠른 블록 변환(H1~H3, 인용문, 코드블록)을 적용합니다.
   *
   * @param {'h1' | 'h2' | 'h3' | 'quote' | 'code'} format - 변환 서식 종류
   * @returns {void}
   * ==========================================================================================
   */
  const quickWrap = useCallback((format: 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
    utilsEditorActions.quickWrap(editorRef, lastSelectionRef, format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ========================================================================================
   * [함수명] handleInsertFormattedDate - 포맷된 날짜/시간 문자열을 위지윅 또는 Monaco 커서 위치에 삽입합니다.
   *
   * @param {string} formattedDate - 삽입할 날짜/시간 문자열
   * @returns {void}
   * ==========================================================================================
   */
  const handleInsertFormattedDate = useCallback((formattedDate: string) => {
    if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current) {
      visualCommandRef.current('INSERT_TEXT:' + formattedDate);
    } else {
      insertAtCursor(formattedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertAtCursor]);

  /**
   * ========================================================================================
   * [함수명] handleAIDraftApply - AI 초안 모달의 결과물을 삽입·교체·덧붙이기 방식으로 본문에 반영합니다.
   *
   * @param {string} draftContent - 반영할 AI 생성 마크다운 텍스트
   * @param {'insert' | 'replace' | 'append'} action - 반영 방식
   * @param {'selection' | 'document' | 'none'} [scope='none'] - 적용 범위
   * @returns {void}
   * ==========================================================================================
   */
  const handleAIDraftApply = (draftContent: string, action: 'insert' | 'replace' | 'append', scope: 'selection' | 'document' | 'none' = 'none') => {
    setIsAIDraftModalOpen(false); // Close modal

    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition() || { lineNumber: 1, column: 1 };
      const selection = editor.getSelection();
      const model = editor.getModel();
      const monacoObj = typeof window !== 'undefined' && (window as any).monaco ? (window as any).monaco : null;

      if (model && monacoObj) {
        if (action === 'insert') {
          const insertText = `\n\n${draftContent}\n\n`;
          editor.executeEdits("AI_DRAFT_INSERT", [{
            range: new monacoObj.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: insertText,
            forceMoveMarkers: true
          }]);
          editor.setPosition({ lineNumber: position.lineNumber + 2, column: 1 });
          editor.revealPositionInCenter({ lineNumber: position.lineNumber + 2, column: 1 }, 1);
          showToast("작성된 초안이 본문에 삽입되었습니다. (Ctrl+Z 실행취소 가능)", "success");
        } else if (action === 'replace') {
          if (scope === 'document') {
            const fullRange = model.getFullModelRange();
            editor.executeEdits("AI_MODAL_REPLACE_DOC", [{
              range: fullRange,
              text: draftContent,
              forceMoveMarkers: true
            }]);
            showToast("문서 전체가 새로 작성된 내용으로 덮어씌워졌습니다.", "success");
          } else if (selection && !selection.isEmpty()) {
            editor.executeEdits("AI_MODAL_REPLACE", [{
              range: selection,
              text: draftContent,
              forceMoveMarkers: true
            }]);
            showToast("기존 텍스트가 덮어씌워졌습니다. (Ctrl+Z 실행취소 가능)", "success");
          }
        } else if (action === 'append') {
          let endLine = model.getLineCount();
          if (selection && !selection.isEmpty() && scope !== 'document') {
            endLine = selection.endLineNumber;
          }
          const endCol = model.getLineMaxColumn(endLine);
          const insertRange = new monacoObj.Range(endLine, endCol, endLine, endCol);

          const formattedText = `\n\n---\n#### [AI 교정문]\n${draftContent}\n---\n`;
          editor.executeEdits("AI_MODAL_APPEND", [{
            range: insertRange,
            text: formattedText,
            forceMoveMarkers: true
          }]);
          showToast("선택된 내용 아래에 덧붙여졌습니다.", "success");
        }
      }
      editor.focus();
      updateContent(editor.getValue());
    }
  };

  return {
    insertAtCursor,
    findLineNumberByHeading,
    scrollToLine,
    insertBlockTag,
    wrapSelection,
    insertLink,
    parseHtmlTableToMarkdown,
    sanitizePastedText,
    fixMarkdownTable,
    replaceDocumentMedia,
    editDocumentMedia,
    applyLinePrefix,
    removePrefix,
    quickWrap,
    handleInsertFormattedDate,
    handleAIDraftApply,
  };
}
