// ====================================================================
// 📊 [OMD-HOOK-useEditorCommands] frontend/src/hooks/editor/useEditorCommands.ts
// 🎯 @KICK  : 에디터 툴바, 플로팅 툴바, 슬래시 메뉴 및 단축키 통합 명령 디스패처
// 🛡️ @GUARD : 비인증 사용자 제한 명령 차단, 모드별(WYSIWYG/Monaco) 분기 및 자동 포커스 보장
// 🚨 @PATCH : 2026-11-10 — [서명/발신인 서식 모달 오픈 연결]:
//             1) SIGNATURE 명령 실행 시 onrivi:open-signature-modal 이벤트를 디스패치하여 정렬/문구 커스텀 대화상자 호출
// 🚨 @PATCH : 2026-11-04 — [주석 표준화] 1단계 파일 헤더 및 2단계 useEditorCommands/dispatchCommand JSDoc 표준화 적용
//             2026-11-04 — [setIsAboutModalOpen 미정의 식별자 제거] 사용되지 않던 setIsAboutModalOpen 옵션 속성을 제거하여 런타임 ReferenceError 해결
//             2026-11-04 — [MainEditorApp 모듈화] MainEditorApp에서 435줄의 명령 디스패처를 독립 훅으로 분리
// 🔗 @CALLS : handlers, editorRef, previewRef, visualCommandRef, showToast
// ====================================================================

import { useCallback } from 'react';
import { EditorCommandType } from '@/types/editorCommand';

export interface UseEditorCommandsOptions {
  isRestrictedUser: boolean;
  handlers: any;
  previewModeRef: React.MutableRefObject<string>;
  previewRef: React.MutableRefObject<any>;
  visualCommandRef: React.MutableRefObject<any>;
  editorRef: React.MutableRefObject<any>;
  executingVisualSourceActionRef: React.MutableRefObject<any>;
  currentFileNodeRef: React.MutableRefObject<any>;
  pendingVisualExportRef: React.MutableRefObject<any>;
  emojiTargetRef: React.MutableRefObject<any>;
  activeTabIdRef: React.MutableRefObject<string>;
  youtubeEditRangeRef: React.MutableRefObject<any>;
  handleInsertFormattedDate: (s: string) => void;
  handleSaveToWebDrive: () => Promise<void>;
  handleSaveToLocal: () => Promise<void>;
  setPreviewMode: (mode: any) => void;
  insertAtCursor: (text: string) => void;
  removePrefix: () => void;
  quickWrap: (format: any) => void;
  selectResourceFolder: () => Promise<any>;
  selectRootFolder: (type: any, handle: any) => Promise<any>;
  showToast: (msg: string, type?: string) => void;
  setPreviewFindReplaceMode: (b: boolean) => void;
  setDirectEditEnabled: (b: boolean) => void;
  setIsPreviewFindOpen: (b: boolean) => void;
  setMonacoDatePickerPos: (pos: any) => void;
  setIsMonacoDatePickerOpen: (b: boolean) => void;
  setIsStyleModalOpen: (b: boolean) => void;
  setIsCitationModalOpen: (b: boolean) => void;
  setIsReferenceModalOpen: (b: boolean) => void;
  setIsSettingsModalOpen: (b: boolean) => void;
  setSettingsModalInitialTab: (tab: any) => void;
  setIsHelpModalOpen: (b: boolean) => void;
  setIsLicenseModalOpen: (b: boolean) => void;
  setFloatingToolbar: (updater: any) => void;
  setIsEmojiPanelOpen: (b: any) => void;
  setAiEditorContext: (ctx: any) => void;
  setAiDraftInitialMode: (mode: any) => void;
  setIsAIDraftModalOpen: (b: boolean) => void;
  setIsToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setThemePalette: (theme: any) => void;
  setIsDarkMode: (b: boolean) => void;
  setIsMergeMode: (b: boolean) => void;
  setIsNewDocumentModalOpen: (b: boolean) => void;
  rootFolder: any;
  directEditEnabled: boolean;
  previewMode: string;
  setPreviewZoomScale: React.Dispatch<React.SetStateAction<number>>;
  setSidebarTab: (tab: any) => void;
  setIsSearchOpen: (b: boolean) => void;
  activeTabId: string;
  geminiApiKey: string;
  setYoutubeInitialUrl: (url: string | null) => void;
  setIsCalendarModalOpen: (b: boolean) => void;
}

/**
 * ========================================================================================
 * [함수명] useEditorCommands - 에디터 툴바·플로팅 툴바·슬래시 메뉴·단축키 통합 명령 디스패처 훅
 *
 * @param {UseEditorCommandsOptions} options - 에디터 핸들러, 모달 제어 함수 및 뷰 모드 참조
 * @returns {{ dispatchCommand: (type: EditorCommandType, payload?: any) => void }}
 * ==========================================================================================
 */
export function useEditorCommands({
  isRestrictedUser,
  handlers,
  previewModeRef,
  previewRef,
  visualCommandRef,
  editorRef,
  executingVisualSourceActionRef,
  currentFileNodeRef,
  pendingVisualExportRef,
  emojiTargetRef,
  activeTabIdRef,
  youtubeEditRangeRef,
  handleInsertFormattedDate,
  handleSaveToWebDrive,
  handleSaveToLocal,
  setPreviewMode,
  insertAtCursor,
  removePrefix,
  quickWrap,
  selectResourceFolder,
  selectRootFolder,
  showToast,
  setPreviewFindReplaceMode,
  setDirectEditEnabled,
  setIsPreviewFindOpen,
  setMonacoDatePickerPos,
  setIsMonacoDatePickerOpen,
  setIsStyleModalOpen,
  setIsCitationModalOpen,
  setIsReferenceModalOpen,
  setIsSettingsModalOpen,
  setSettingsModalInitialTab,
  setIsHelpModalOpen,
  setIsLicenseModalOpen,
  setFloatingToolbar,
  setIsEmojiPanelOpen,
  setAiEditorContext,
  setAiDraftInitialMode,
  setIsAIDraftModalOpen,
  setIsToolbarOpen,
  setIsSidebarOpen,
  setThemePalette,
  setIsDarkMode,
  setIsMergeMode,
  setIsNewDocumentModalOpen,
  rootFolder,
  directEditEnabled,
  previewMode,
  setPreviewZoomScale,
  setSidebarTab,
  setIsSearchOpen,
  activeTabId,
  geminiApiKey,
  setYoutubeInitialUrl,
  setIsCalendarModalOpen,
}: UseEditorCommandsOptions) {
  /**
   * ========================================================================================
   * [함수명] dispatchCommand - 명령 타입(EditorCommandType)과 페이로드를 받아 적절한 에디터/모달 동작을 실행합니다.
   *
   * @param {EditorCommandType} type - 실행할 에디터 명령 식별자
   * @param {any} [payload] - 명령 부가 데이터 (예: 날짜 문자열, 인용문 타입 등)
   * @returns {void}
   * ==========================================================================================
   */
  const dispatchCommand = useCallback((type: EditorCommandType, payload?: any) => {
    const restrictedCommands = [
      'OPEN_FILE', 'OPEN_WORKSPACE', 'EXIT', 'GLOBAL_SEARCH', 'COPY_ALL',
      'TOGGLE_SIDEBAR', 'TOGGLE_TOOLBAR', 'TOGGLE_MODE',
      'SETTINGS', 'SETTINGS_SHORTCUTS', 'SETTINGS_ACCOUNT', 'HELP', 'LICENSE'
    ];
    if (isRestrictedUser && !restrictedCommands.includes(type)) return;
    if (type === 'UNDO' || type === 'REDO') {
      if (previewModeRef.current === 'edit') {
        if (type === 'UNDO') handlers.undo(); else handlers.redo();
      } else if (!previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input') || !visualCommandRef.current?.(type)) {
        showToast('문서의 본문 편집에서 실행취소·다시실행을 사용할 수 있습니다.', 'info');
      }
      return;
    }
    if ((type === 'FIND' || type === 'REPLACE') && previewModeRef.current !== 'edit') {
      setPreviewFindReplaceMode(type === 'REPLACE');
      if (type === 'REPLACE') setDirectEditEnabled(true);
      setIsPreviewFindOpen(true);
      return;
    }
    if (type === 'NOW' || type === 'CALENDAR') {
      if (typeof payload === 'string' && payload) {
        handleInsertFormattedDate(payload);
        return;
      }
      // 1) 문서보기(Visual Document Editor) 모드인 경우, 문서보기 커서 위치에 바로 팝업 오픈!
      if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.(type)) {
        return;
      }
      // 2) Monaco 에디터 모드인 경우, Monaco 커서 위치에 팝업 오픈!
      const editor = editorRef.current;
      const position = editor?.getPosition();
      const visiblePosition = position && editor?.getScrolledVisiblePosition(position);
      const editorRect = editor?.getDomNode()?.getBoundingClientRect();
      const left = editorRect && visiblePosition
        ? Math.min(editorRect.left + visiblePosition.left, Math.max(16, window.innerWidth - 380))
        : Math.max(16, (window.innerWidth - 350) / 2);
      const top = editorRect && visiblePosition
        ? editorRect.top + visiblePosition.top + visiblePosition.height
        : Math.max(16, window.innerHeight / 2 - 200);
      setMonacoDatePickerPos({ top, left });
      setIsMonacoDatePickerOpen(true);
      return;
    }
    if (type === 'TOGGLE_CSS_STYLE') {
      setIsStyleModalOpen(true);
      return;
    }
    if (type === 'ADD_REFERENCE') {
      setIsReferenceModalOpen(true);
      return;
    }
    if (!executingVisualSourceActionRef.current && previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input') && visualCommandRef.current?.(type)) return;
    if (!executingVisualSourceActionRef.current && previewRef.current?.querySelector('.visual-document-editor') && [
      'UNDERLINE', 'STRIKETHROUGH', 'IMAGE', 'VIDEO', 'MAP', 'TABLE', 'QUICK_TABLE',
      'INSERT_TABLE_ROW', 'DELETE_TABLE_ROW', 'CHART', 'CODE', 'CHECK',
      'REMOVE_PREFIX', 'DOC_LINK', 'MERGE',
    ].includes(type)) {
      showToast('이 기능은 현재 마크다운 보기에서 사용할 수 있습니다.', 'info');
      return;
    }

    // [WBS SYNC-01] 명령어 실행 초입 단계에 반드시 editor.focus()를 강제 격발하여 브라우저 포커스 뺏김 방지 및 포지션 최우선 확보 (단, 전역 검색은 검색 입력창 포커스를 위해 제외)
    let editorPosition = null;
    if (editorRef.current && type !== 'GLOBAL_SEARCH') {
      const editor = editorRef.current;
      editor.focus();
      editorPosition = editor.getPosition();
    }

    // 1. 에디터 텍스트 비조작 명령어 (상태 제어 및 파일 입출력 위임)
    switch (type as any) {
      // 파일 관련
      case 'NEW_FILE': {
        setIsNewDocumentModalOpen(true);
        return;
      }
      case 'OPEN_FILE':
        window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT'));
        return;
      case 'OPEN_WORKSPACE': selectRootFolder('current', null); return;
      case 'SAVE': handlers.save(); return;
      case 'SAVE_AS':
        if (rootFolder?.type === 'GDRIVE' || currentFileNodeRef.current?.driveId || currentFileNodeRef.current?.driveFileId) {
          handleSaveToWebDrive();
        } else {
          handleSaveToLocal();
        }
        return;
      case 'EXIT': handlers.exit(); return;

      // 내보내기 관련
      case 'PRINT':
      case 'EXPORT_HTML':
      case 'EXPORT_EPUB':
      case 'EXPORT_PNG':
      case 'EXPORT_DOCX':
      case 'EXPORT_HWPX':
      case 'OPEN_EXPORT': {
        // Export uses the existing read-only renderer, never editor controls or
        // immutable source placeholders. Wait for that renderer to mount.
        // PDF previews and print clone the mounted editor. Switching renderers here
        // discards editor-only layout (including blank paragraphs) before the modal opens.
        if (type !== 'PRINT' && type !== 'OPEN_EXPORT' && directEditEnabled && previewRef.current?.querySelector('.visual-document-editor')) {
          pendingVisualExportRef.current = type;
          setDirectEditEnabled(false);
          setPreviewMode('preview');
          return;
        }
        // 🔒 [내보내기 방어 가드]: 나란히 보기(both) 및 미리보기(preview) 모두 즉시 사출 지원, 편집 모드일 때만 자동 전환
        if (previewMode !== 'preview' && previewMode !== 'both') {
          pendingVisualExportRef.current = type;
          setPreviewMode('preview');
          return;
        }
        if (type === 'PRINT') handlers.print();
        else if (type === 'EXPORT_HTML') handlers.exportHTML();
        else if (type === 'EXPORT_EPUB') handlers.exportEPUB();
        else if (type === 'EXPORT_PNG') handlers.exportPNG();
        else if (type === 'EXPORT_DOCX') handlers.exportDOCX();
        else if (type === 'EXPORT_HWPX') handlers.exportHWPX();
        else if (type === 'OPEN_EXPORT') handlers.openExport();
        return;
      }
      // 보기/제어 관련 (문서보기 확대/축소로 일원화)
      case 'ZOOM_IN':
        setPreviewZoomScale((prev: number) => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
        return;
      case 'ZOOM_OUT':
        setPreviewZoomScale((prev: number) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
        return;
      case 'ZOOM_RESET':
        setPreviewZoomScale(1.0);
        return;
      case 'UNDO': handlers.undo(); return;
      case 'REDO': handlers.redo(); return;
      case 'FIND': handlers.find(); return;
      case 'REPLACE': handlers.replace(); return;
      case 'PAGEBREAK': {
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('PAGEBREAK')) {
          return;
        }
        insertAtCursor('\n\n<!-- onrivi:page-break -->\n\n');
        return;
      }
      case 'GLOBAL_SEARCH':
        setIsSidebarOpen(true);
        setSidebarTab('search');
        setIsSearchOpen(true);
        handlers.globalSearch();
        return;
      case 'SETTINGS':
        setIsSettingsModalOpen(true);
        return;
      case 'SETTINGS_SHORTCUTS':
        setSettingsModalInitialTab('shortcuts');
        setIsSettingsModalOpen(true);
        return;
      case 'SETTINGS_ACCOUNT':
        setSettingsModalInitialTab('account');
        setIsSettingsModalOpen(true);
        return;
      case 'SELECT_RESOURCE_FOLDER':
        selectResourceFolder();
        return;
      case 'TOGGLE_CSS_STYLE':
        setIsStyleModalOpen(true);
        return;
      case 'ADD_REFERENCE':
        setIsReferenceModalOpen(true);
        return;
      case 'ABOUT': handlers.about(); return;
      case 'HELP': handlers.help(); return;
      case 'LICENSE': handlers.license(); return;
      case 'TOGGLE_FLOATING_TOOLBAR': {
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        handlers.toggleFloatingToolbar(); 
        return;
      }
      case 'TOGGLE_EMOJI_PANEL': {
        const visual = previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input');
        emojiTargetRef.current = {
          tabId: activeTabIdRef.current,
          visual: !!visual && !editorRef.current?.hasTextFocus(),
          selection: editorRef.current?.getSelection(),
        };
        setIsEmojiPanelOpen((open: boolean) => !open);
        return;
      }
      case 'AI_DRAFT': {
        window.dispatchEvent(new Event('onrivi:open-inline-ai'));
        return;
      }
      case 'OPEN_AI_WRITER': {
        if (!geminiApiKey) {
          showToast('설정에서 Gemini API 키를 먼저 등록해주세요.', 'warning');
          setIsSettingsModalOpen(true);
          return;
        }
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        const editor = editorRef.current;
        const selection = editor ? editor.getSelection() : null;
        const model = editor ? editor.getModel() : null;
        let selectedText = '';
        let fullText = '';
        if (editor && model) {
          fullText = model.getValue();
          if (selection && !selection.isEmpty()) {
            selectedText = model.getValueInRange(selection);
          }
        }
        setAiEditorContext({ selectedText, fullText });
        setAiDraftInitialMode('editorial');
        setIsAIDraftModalOpen(true);
        return;
      }
      case 'AUTO_RENUMBER':
        console.log('[DEBUG] AUTO_RENUMBER dispatched! Triggering autoRenumberList...');
        setTimeout(() => editorRef.current?.getAction('autoRenumberList')?.run(), 100);
        break;
      case 'SLASH_COMMAND': {
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        const editor = editorRef.current;
        if (editor) {
          editor.focus();
          const position = editor.getPosition();
          if (position) {
            editor.executeEdits('slash-trigger', [
              {
                range: new ((window as any).monaco || (window as any).Range || Object).Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: '/',
                forceMoveMarkers: true
              }
            ]);
            setTimeout(() => {
              editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            }, 50);
          }
        }
        return;
      }
      case 'CLEAN_DOC': {
        const visualEditorEl = previewRef.current?.querySelector('.visual-document-editor');
        const visualHasFocus = Boolean(visualEditorEl?.contains(document.activeElement));
        if (visualEditorEl && (previewModeRef.current === 'preview' || visualHasFocus) && visualCommandRef.current?.('CLEAN_DOC')) {
          return;
        }
        handlers.cleanDoc();
        return;
      }
      case 'COPY_ALL': handlers.copyAll(); return;
      // 🎯 TOOLBAR_ITEMS '푸터' 그룹 토글 명령어 (handlers에 없으므로 직접 상태 변환)
      case 'TOGGLE_TOOLBAR': setIsToolbarOpen((prev: boolean) => !prev); return;
      case 'TOGGLE_SIDEBAR': setIsSidebarOpen((prev: boolean) => !prev); return;
      case 'TOGGLE_MODE':
        if (isRestrictedUser) {
          setPreviewMode('preview');
          return;
        }
        setPreviewMode((prev: any) => {
          if (prev === 'css-style') return prev;
          if (prev === 'edit') return 'both';
          if (prev === 'both') return 'preview';
          return 'edit';
        });
        return;
      case 'TOGGLE_THEME':
        // 사용자 요청으로 테마 변경 기능 비활성화
        return;
      /*
       * TOGGLE_CSS_STYLE — CssStyleForm 패널 토글 (Ctrl+Shift+S)
 * - css-style 모드: 좌측 50%가 CssStyleForm(서식 정의), 우측 50%가 미리보기
       * - 다시 누르면 'both'(편집+미리보기 분할)로 복귀
       */
      // TOGGLE_CSS_STYLE is merged above with SETTINGS
      case 'MERGE':
        if (previewModeRef.current === 'preview') {
          showToast("미리보기 모드에서는 문서 병합을 사용할 수 없습니다.", 'warning');
          return;
        }
        setIsMergeMode(true);
        return;
    }

    // 2. 에디터 본문 서식 조작 명령어 (포커스 가드 강제 추적)
    if (!editorRef.current) return;
    const editor = editorRef.current;

    // [WBS SYNC-01] 이미 초입부에서 editor.focus() 및 getPosition()을 최우선 확보하였으므로 중복 호출 제거
    const MODAL_COMMANDS: EditorCommandType[] = ['IMAGE', 'VIDEO', 'YOUTUBE', 'MAP', 'TABLE', 'LATEX', 'MATH', 'LINK'];

    const selection = editor.getSelection();

    const model = editor.getModel();
    if (!model || !selection) return;

    // 💡 [실행취소 단위 격리] 서식 적용 전 직전 타이핑과의 실행취소(Undo) 단계를 명확히 분리하여,
    //    Ctrl+Z 시 타이핑했던 글자까지 지워지지 않고 서식 태그만 깔끔하게 취소되도록 경계 설정
    editor.pushUndoStop();

    switch (type as any) {
      // 서식 관련
      case 'BOLD': handlers.bold(); break;
      case 'FOOTNOTE': handlers.footnote(); break;
      case 'ORGANIZE_FOOTNOTES':
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('ORGANIZE_FOOTNOTES')) {
          break;
        }
        handlers.organizeFootnotes();
        break;
      case 'ITALIC': handlers.italic(); break;
      case 'INLINE_CODE': handlers.inlineCode(); break;
      case 'UNDERLINE': handlers.underline(); break;
      case 'STRIKETHROUGH': handlers.strikethrough(); break;
      case 'H1': handlers.h1(); break;
      case 'H2': handlers.h2(); break;
      case 'H3': handlers.h3(); break;
      case 'H4': handlers.h4(); break;
      case 'H5': handlers.h5(); break;
      case 'H6': handlers.h6(); break;
      case 'HR': handlers.hr(); break;
      case 'ORDERED_LIST': handlers.orderedList(); break;
      case 'LIST': handlers.list(); break;
      case 'QUOTE': handlers.quote(payload); break;
      case 'QUOTE_NOTE': handlers.quote('NOTE'); break;
      case 'QUOTE_TIP': handlers.quote('TIP'); break;
      case 'QUOTE_IMPORTANT': handlers.quote('IMPORTANT'); break;
      case 'QUOTE_WARNING': handlers.quote('WARNING'); break;
      case 'QUOTE_CAUTION': handlers.quote('CAUTION'); break;
      case 'CHECK':
      case 'CHECKLIST': handlers.check(); break;
      case 'ERASER':
      case 'REMOVE_PREFIX': handlers.removePrefix(); break;

      // 삽입 관련
      case 'LINK': handlers.link(); break;
      case 'DOCLINK': handlers.doclink(); break;
      case 'IMAGE': handlers.image(); break;
      case 'CITE': setIsCitationModalOpen(true); break;
      case 'YOUTUBE':
      case 'VIDEO': {
        const selText = model.getValueInRange(selection);
        const mdLink = selText.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
        if (mdLink) {
          setYoutubeInitialUrl(mdLink[2]);
          youtubeEditRangeRef.current = new ((window as any).monaco).Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
          );
        } else {
          setYoutubeInitialUrl(null);
          youtubeEditRangeRef.current = null;
        }
        handlers.video();
        break;
      }
      case 'NOW':
      case 'CALENDAR': {
        if (typeof payload === 'string' && payload) {
          handleInsertFormattedDate(payload);
        } else {
          setIsCalendarModalOpen(true);
        }
        break;
      }
      case 'MAP': handlers.map(); break;
      case 'TABLE': handlers.table(); break;
      case 'QUICK_TABLE': handlers.quickTable(); break;
      case 'INSERT_TABLE_ROW': handlers.insertTableRow(); break;
      case 'DELETE_TABLE_ROW': handlers.deleteTableRow(); break;
      case 'CODE':
      case 'CODE_BLOCK': handlers.code(); break;
      case 'CHART': handlers.chart(); break;
      case 'LATEX':
      case 'MATH': {
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('MATH')) {
          return;
        }
        handlers.math();
        break;
      }
      case 'SIGNATURE': {
        window.dispatchEvent(new CustomEvent('onrivi:open-signature-modal'));
        break;
      }

      // ★ 퀵 래핑 (Quick Transform)
      case 'WRAP_H1': handlers.quickWrap('h1'); break;
      case 'WRAP_H2': handlers.quickWrap('h2'); break;
      case 'WRAP_H3': handlers.quickWrap('h3'); break;
      case 'WRAP_QUOTE': handlers.quickWrap('quote'); break;
      case 'WRAP_CODE': handlers.quickWrap('code'); break;

      default:
        showToast(`알 수 없는 명령어: ${type}`, 'warning');
        break;
    }

    // 🛡️ 모달이 팝업되는 명령어는 에디터로 포커스를 뺏기지 않도록 예외 처리
    // (IMAGE, VIDEO, MAP, TABLE, LATEX, MATH, LINK 계열은 모달 입력 필드가 포커스를 가져야 함)
    // [WBS SYNC-02] 50ms 비동기 지연을 두어 에디터 버퍼의 완전 기록 후 토큰 리프레시 및 레이아웃 재적용으로 글자 겹침 완벽 해결
    setTimeout(() => {
      try {
        if (editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          const selection = editor.getSelection();
          if (model && selection) {
            const startLine = selection.startLineNumber;
            const endLine = selection.endLineNumber;
            for (let i = startLine; i <= endLine; i++) {
              if (model && typeof model.forceTokenization === 'function') {
                model.forceTokenization(i);
              }
            }
            editor.layout();
          }
        }
      } catch (_) { }
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers, isRestrictedUser]);

  return { dispatchCommand };
}
