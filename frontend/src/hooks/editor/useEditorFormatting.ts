// ====================================================================
// 📊 [OMD-HOOK-useEditorFormatting] frontend/src/hooks/editor/useEditorFormatting.ts
// 🎯 @KICK  : Monaco 텍스트 삽입·서식 조작(접두사/감싸기/블록 태그/링크), 표 변환·붙여넣기 정제 위임, 문서 미디어 교체·편집, 날짜 삽입, AI 초안 적용을 담당하는 서식 조작 훅
// 🛡️ @GUARD : 위지윅 수식 삽입 대기(visualFormulaInsertRef) 우선 처리, 활성 탭/원본 범위 불일치 시 미디어 교체 차단, 제한 사용자 편집 차단
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화]: insertAtCursor, scrollToLine, insertBlockTag, wrapSelection, insertLink, parseHtmlTableToMarkdown, sanitizePastedText, fixMarkdownTable, replaceDocumentMedia, editDocumentMedia, applyLinePrefix, removePrefix, quickWrap, handleInsertFormattedDate, handleAIDraftApply를 MainEditorApp.tsx에서 분리 위임 (동작 변경 없음)
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

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0048] MainEditorApp.tsx ➔ insertAtCursor
  // 🎯 @KICK  : 커서 위치 텍스트 삽입을 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.insertAtCursor
  // ====================================================================
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

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0049] MainEditorApp.tsx ➔ findLineNumberByHeading
  // 🎯 @KICK  : 제목 줄 검색을 utilsEditorActions에 위임
  // 🔗 @CALLS : utilsEditorActions.findLineNumberByHeading
  // ====================================================================
  const findLineNumberByHeading = (content: string, heading: string): number => {
    return utilsEditorActions.findLineNumberByHeading(content, heading);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0050] MainEditorApp.tsx ➔ scrollToLine
  // 🎯 @KICK  : 에디터 특정 줄로 스크롤을 utilsEditorActions에 위임
  // 🔗 @CALLS : utilsEditorActions.scrollToLine
  // ====================================================================
  const scrollToLine = (lineNumber: number) => {
    utilsEditorActions.scrollToLine(editorRef, lineNumber);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0052] MainEditorApp.tsx ➔ insertBlockTag
  // 🎯 @KICK  : 블록 태그 감싸기를 utilsEditorActions에 위임
  // 🔗 @CALLS : utilsEditorActions.insertBlockTag
  // ====================================================================
  const insertBlockTag = (startTag: string, endTag: string, defaultText: string = "") => {
    utilsEditorActions.insertBlockTag(editorRef, startTag, endTag, defaultText);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0053] MainEditorApp.tsx ➔ wrapSelection
  // 🎯 @KICK  : 선택 영역 감싸기/풀기를 utilsEditorActions에 위임
  // 🔗 @CALLS : utilsEditorActions.wrapSelection
  // ====================================================================
  const wrapSelection = (before: string, after: string = before, defaultText: string = "") => {
    utilsEditorActions.wrapSelection(editorRef, lastSelectionRef, before, after, defaultText);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0054] MainEditorApp.tsx ➔ insertLink
  // 🎯 @KICK  : 커서에 마크다운 링크 삽입, URL 플레이스홀더 텍스트 자동 선택
  // 🛡️ @GUARD : 현재 선택이 비어있으면 lastSelectionRef 사용; 선택 텍스트와 빈 경우 모두 처리
  // 🔗 @CALLS : editor.focus, editor.getSelection, editor.executeEdits, editor.setSelection
  // ====================================================================
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

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0061] MainEditorApp.tsx ➔ parseHtmlTableToMarkdown
  // 🎯 @KICK  : HTML 표를 마크다운으로 변환하는 작업을 paste handlers에 위임
  // 🔗 @CALLS : utilsPasteHandlers.parseHtmlTableToMarkdown
  // ====================================================================
  const parseHtmlTableToMarkdown = (html: string) => {
    return utilsPasteHandlers.parseHtmlTableToMarkdown(html, showToast);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0062] MainEditorApp.tsx ➔ sanitizePastedText
  // 🎯 @KICK  : 붙여넣기 텍스트 정제를 paste handlers에 위임
  // 🔗 @CALLS : utilsPasteHandlers.sanitizePastedText
  // ====================================================================
  const sanitizePastedText = (text: string, skipTsvConversion = false) => {
    return utilsPasteHandlers.sanitizePastedText(text, skipTsvConversion);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0063] MainEditorApp.tsx ➔ fixMarkdownTable
  // 🎯 @KICK  : 마크다운 표 수정을 paste handlers에 위임
  // 🔗 @CALLS : utilsPasteHandlers.fixMarkdownTable
  // ====================================================================
  const fixMarkdownTable = (text: string) => {
    return utilsPasteHandlers.fixMarkdownTable(text);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0064.1] MainEditorApp.tsx ➔ replaceDocumentMedia / editDocumentMedia
  // 🎯 @KICK  : 미리보기에서 선택한 이미지/영상/지도 원본 코드를 찾아 교체하거나 편집 모달을 엽니다
  // 🛡️ @GUARD : 활성 탭 ID 또는 원본 범위 텍스트가 달라졌으면 교체 거부; 제한 사용자 편집 차단
  // 🔗 @CALLS : mediaSourceRange, visualImageDetails
  // ====================================================================
  const replaceDocumentMedia = (range: any, code: string) => {
    if (range.documentId !== activeTabIdRef.current || contentRef.current.slice(range.from,range.to) !== range.source) return false;
    const next = contentRef.current.slice(0,range.from) + code.trim() + contentRef.current.slice(range.to);
    contentRef.current = next; updateContent(next);
    setTabs(previous=>previous.map(tab=>tab.id===range.documentId?{...tab,content:next,isModified:true}:tab));
    return true;
  };
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

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx ➔ applyLinePrefix & removePrefix
  // 🎯 @KICK  : 선택된 줄 접두사 서식 적용 및 서식 제거를 utilsEditorActions에 위임
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 440줄 Monaco 서식 조작부를 utilsEditorActions로 위임
  // 🔗 @CALLS : utilsEditorActions.applyLinePrefix, utilsEditorActions.removePrefix
  // ====================================================================
  const applyLinePrefix = useCallback((prefixType: 'orderedList' | 'list' | 'quote' | 'check' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', alertType?: string) => {
    utilsEditorActions.applyLinePrefix(editorRef, lastSelectionRef, prefixType, alertType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePrefix = useCallback(() => {
    utilsEditorActions.removePrefix(editorRef, lastSelectionRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0069] MainEditorApp.tsx ➔ quickWrap
  // 🎯 @KICK  : 빠른 서식 감싸기를 utilsEditorActions에 위임
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] utilsEditorActions로 위임
  // 🔗 @CALLS : utilsEditorActions.quickWrap
  // ====================================================================
  const quickWrap = useCallback((format: 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
    utilsEditorActions.quickWrap(editorRef, lastSelectionRef, format);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0070.1] MainEditorApp.tsx ➔ handleInsertFormattedDate
  // 🎯 @KICK  : 선택한 날짜/시간 서식 문자열을 위지윅 편집기 또는 Monaco 커서 위치에 삽입
  // 🛡️ @GUARD : 위지윅 편집기가 활성화된 경우 visualCommandRef 우선 사용
  // 🔗 @CALLS : visualCommandRef, insertAtCursor
  // ====================================================================
  const handleInsertFormattedDate = useCallback((formattedDate: string) => {
    if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current) {
      visualCommandRef.current('INSERT_TEXT:' + formattedDate);
    } else {
      insertAtCursor(formattedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertAtCursor]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0075] MainEditorApp.tsx ➔ handleAIDraftApply
  // 🎯 @KICK  : AI 초안 모달 결과를 삽입/교체/덧붙이기 방식으로 Monaco 본문에 반영
  // 🛡️ @GUARD : Monaco 모델/전역 객체 미존재 시 편집 생략; executeEdits로 Ctrl+Z 실행취소 보장
  // 🔗 @CALLS : editor.executeEdits, updateContent, showToast
  // ====================================================================
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
