// @ts-nocheck
// ====================================================================
// 📊 [OMD-CORE-useMonacoSetup-0001] useMonacoSetup ➔ Monaco Setup & Lifecycle Engine
// 🚨 @PATCH : 2026-11-05 — [초기 모델 수정 오판 방지]: 비활성 탭 모델 이벤트가 활성 문서 본문과 저장 상태를 덮어쓰지 않도록 차단.
// 🚨 @PATCH : 2026-11-05 — [시작 렌더링 부담 축소]: 에디터 마운트 시 활성 탭의 모델만 만들고 나머지는 선택할 때 생성한다.
// 🚨 @PATCH : **2026-11-04** — [useMonacoSetup.ts 1순위 모듈 분리 리팩토링 (2,617라인 ➔ 슬림화)]:
//             1) 표(Table) 정렬/이동 및 리스트/인용구/제목 자동 완성 단축키를 monacoTableAndListCommands.ts로 격리
//             2) 클립보드 붙여넣기 및 드래그 앤 드롭 인디케이터 처리를 monacoClipboardAndDrop.ts로 격리
//             3) 슬래시/[[ 위키링크 자동완성 프로바이더 및 Suggest 위젯 스타일 주입을 monacoCompletionProviders.ts로 격리
// 🚨 @PATCH : **2026-10-31** — [플로팅 서식 툴바 유지 보장 및 커서 이동 시 자동 닫힘 방어]:
//             1) onDidChangeCursorSelection에서 e.selection.isEmpty() 시 플로팅 툴바를 자동 닫던 로직을 제거하여 마우스 클릭 또는 엔터로 서식 적용 시에도 툴바가 유지되도록 개선
//             2) editor.onMouseDown(에디터 클릭) 및 ESC 단축키 입력 시에만 플로팅 툴바가 닫히도록 사용자 명세 완벽 준수
// 🚨 @PATCH : **2026-10-28** — [번호 리스트 자동 생성 행에서 하위 레벨 글머리 기호(-, *, +) 즉시 전환 지원]:
//             1) 번호 리스트 엔터 개행 시 자동 생성된 '3. ' 또는 Tab 들여쓰기된 '    1. ' 상태에서 '-', '*', '+' 입력 후 Space를 누르면 상위 번호 항목의 하위 레벨 글머리 기호 리스트('    - ')로 즉시 자동 치환
// 🚨 @PATCH : **2026-10-24** — [인용문(>) 탭(Tab) 들여쓰기 및 Shift+Tab 내어쓰기 완전 지원]:
//             1) 인용구(>) 줄에서 커서 위치(접두사/본문/줄 끝)와 무관하게 Tab 입력 시 항상 행 시작에 2칸 들여쓰기 공백을 삽입하여 목록 하위 인용구 및 중첩 인용문 구성 보장
//             2) 인용구(>) 줄에서 Shift+Tab 입력 시 앞쪽 들여쓰기 공백(최대 2칸) 또는 중첩 기호(>>)를 자연스럽게 소거하여 내어쓰기 지원
// 🚨 @PATCH : **2026-10-22** — [구분선(HR) 줄에서 Enter 시 새 문단 생성]:
//             1) 리스트 자동완성 Enter 액션에 구분선(---, ***, ___) 판별 가드를 리스트 판단보다 먼저 배치하여 구분선 줄에서 Enter 시 아래 빈 줄로 커서 이동(빈 줄 없으면 삽입)
// 🚨 @PATCH : **2026-10-22** — [제목 태그(#) + 스페이스 자동 번호 삽입]:
//             1) 에디터에서 '## ' 형태 입력 후 스페이스를 치면 활성 CSS 프로필의 headingNumbering 설정에 따라
//                제목 번호(예: 1., I., 가., 1.1)를 자동으로 삽입하는 custom-space-heading-number addAction 추가
// 🔗 @CALLS : registerSignatureCleanup, applySafeMarkdownMonarchTokenizer, registerMonacoTableAndListCommands, registerMonacoClipboardAndDrop, registerMonacoCompletionProviders
// ====================================================================

import { registerSignatureCleanup } from '@/lib/signatureCleanup';
import { useRef } from 'react';
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from '@/lib/syncEngine';
import { applySafeMarkdownMonarchTokenizer } from '@/lib/editorThemes';
import { registerMonacoTableAndListCommands } from './monacoTableAndListCommands';
import { registerMonacoClipboardAndDrop } from './monacoClipboardAndDrop';
import { injectMonacoSuggestStyles, registerMonacoCompletionProviders } from './monacoCompletionProviders';

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : Monaco 에디터 마운트 및 생명주기 관리 훅
 * ----------------------------------------------------------------------------
 * - 입력값(Params) : deps (MainEditorApp 의존성 객체)
 * - 반환값(Returns) : { handleMount }
 * ----------------------------------------------------------------------------
 */
export function useMonacoSetup(deps: any) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const handleMount = (editor: any, monaco: any) => {
    const {
      editorRef, tabsRef, activeTabIdRef, contentRef, isComposingRef, previewDebounceRef,
      setContent, setTabs, previewModeRef, previewRef, isScrollingRef,
      setIsEditorReady, themePalette, EDITOR_THEMES, updateDecorations,
      decorationsCollectionRef, isEditorHovered, prevCursorLineRef,
      setActiveLine, setCursorLine, setCursorColumn, setFloatingToolbar, lastSelectionRef,
    } = deps;

    editorRef.current = editor;
    registerSignatureCleanup(editor, monaco);
    if (typeof window !== 'undefined') {
      (window as any).monaco = monaco;
    }
    applySafeMarkdownMonarchTokenizer(monaco);

    // 💡 [슬래시 자동완성 서식설명 열 왼쪽 정렬 동적 주입]
    injectMonacoSuggestStyles();

    // 🔒 나란히 보기(previewMode === 'both') 프로그래밍 편집 통과 래퍼
    const rawExecuteEdits = editor.executeEdits.bind(editor);
    const rawPushUndoStop = editor.pushUndoStop.bind(editor);
    const rawUpdateOptions = editor.updateOptions.bind(editor);
    const shouldKeepReadOnly = () =>
      Boolean(depsRef.current?.isRestrictedUser) ||
      (depsRef.current?.tabsRef?.current?.length ?? 0) === 0 ||
      depsRef.current?.previewModeRef?.current === 'both';

    editor.pushUndoStop = () => {
      if (depsRef.current?.isRestrictedUser || (depsRef.current?.tabsRef?.current?.length ?? 0) === 0) {
        return false;
      }
      const lockAfter = shouldKeepReadOnly();
      if (lockAfter) rawUpdateOptions({ readOnly: false, domReadOnly: false });
      try {
        return rawPushUndoStop();
      } finally {
        if (lockAfter) rawUpdateOptions({ readOnly: true, domReadOnly: true });
      }
    };

    editor.executeEdits = (source: any, edits: any, endCursorState?: any) => {
      if (depsRef.current?.isRestrictedUser || (depsRef.current?.tabsRef?.current?.length ?? 0) === 0) {
        return false;
      }
      const lockAfter = shouldKeepReadOnly();
      if (lockAfter) rawUpdateOptions({ readOnly: false, domReadOnly: false });
      try {
        return rawExecuteEdits(source, edits, endCursorState);
      } finally {
        if (lockAfter) rawUpdateOptions({ readOnly: true, domReadOnly: true });
      }
    };

    // 고대비 지속성 커서 DOM 엘리먼트
    const editorDomNode = editor.getDomNode();
    const persistentCaret = document.createElement('div');
    persistentCaret.setAttribute('aria-hidden', 'true');
    persistentCaret.style.cssText = [
      'position:absolute',
      'z-index:1000',
      'width:5px',
      'min-width:5px',
      'background:#2563eb',
      'pointer-events:none',
      'display:none',
      'border-radius:2px',
      'box-shadow:0 0 3px rgba(37,99,235,.8)',
      'will-change:transform,height'
    ].join(';');
    editorDomNode?.appendChild(persistentCaret);

    const updatePersistentCaret = () => {
      if (previewModeRef.current === 'both' || !editorDomNode?.isConnected || !editor.hasTextFocus?.()) {
        persistentCaret.style.display = 'none';
        return;
      }
      const position = editor.getPosition();
      const visiblePosition = position && editor.getScrolledVisiblePosition(position);
      if (!visiblePosition) {
        persistentCaret.style.display = 'none';
        return;
      }
      persistentCaret.style.display = 'block';
      persistentCaret.style.height = `${Math.max(16, visiblePosition.height)}px`;
      persistentCaret.style.transform = `translate(${Math.round(visiblePosition.left)}px, ${Math.round(visiblePosition.top)}px)`;
    };

    editor.onDidFocusEditorText(() => requestAnimationFrame(updatePersistentCaret));
    editor.onDidBlurEditorText(() => { persistentCaret.style.display = 'none'; });
    editor.onDidLayoutChange(() => requestAnimationFrame(updatePersistentCaret));

    // 탭 및 모델 초기화
    const updatedTabs = tabsRef.current.map((tab: any) => {
      if (tab.id !== activeTabIdRef.current) return tab;
      const isDisposed = tab.model && typeof tab.model.isDisposed === 'function' && tab.model.isDisposed();
      if (!tab.model || isDisposed) {
        const model = monaco.editor.createModel(tab.content, 'markdown');
        model.onDidChangeContent((e) => {
          if ((model as any).__isSyncingVisualModel) return;
          if (activeTabIdRef.current !== tab.id) return;
          if (e && e.changes && e.changes.some(c => c.text === '1. ' || c.text === '1.')) {
            setTimeout(() => editor.getAction('autoRenumberList')?.run(), 100);
          }
          const val = model.getValue();
          setContent(val);
          setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, content: val, isModified: val !== t.content } : t));
        });
        return { ...tab, model };
      }
      return tab;
    });
    setTabs(updatedTabs);

    const activeTab = updatedTabs.find(t => t.id === activeTabIdRef.current);
    if (activeTab && activeTab.model && !(typeof activeTab.model.isDisposed === 'function' && activeTab.model.isDisposed())) {
      try {
        editor.setModel(activeTab.model);
      } catch (err) {
        console.warn('[useMonacoSetup] setModel failed, fallback to setValue:', err);
        editor.setValue(contentRef.current);
      }
    } else {
      editor.setValue(contentRef.current);
    }

    // IME 조합 감지 락
    setTimeout(() => {
      const textarea = editor.getDomNode()?.querySelector('textarea');
      if (textarea) {
        textarea.addEventListener('compositionstart', () => {
          isComposingRef.current = true;
        });
        textarea.addEventListener('compositionend', () => {
          isComposingRef.current = false;
          requestAnimationFrame(() => {
            if (editorRef.current === editor) {
              updateDecorations(editor);
              setContent(editor.getValue());
              editor.focus();
              updatePersistentCaret();
            }
          });
        });
      }
    }, 100);

    // 1. 표 / 리스트 / 인용구 / 단축키 일괄 등록
    registerMonacoTableAndListCommands(editor, monaco, depsRef);

    // 에디터 옵션 및 타이포그래피 최적화
    editor.updateOptions({
      scrollBeyondLastLine: false,
      fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
      fontLigatures: true,
      fontWeight: deps.editorFontWeight === 'bold' ? '700' : deps.editorFontWeight === 'semibold' ? '600' : deps.editorFontWeight === 'medium' ? '500' : '400',
      lineHeight: 28,
      letterSpacing: 0,
      cursorWidth: 5,
      padding: { top: 28, bottom: 28 },
      lineNumbers: 'off',
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 0,
      glyphMargin: false,
      folding: false,
      automaticLayout: true,
      wordWrap: 'on',
      wrappingStrategy: 'advanced',
      wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
      wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',
      cursorSurroundingLines: 0,
      cursorSurroundingLinesStyle: 'all',
      occurrencesHighlight: false,
      selectionHighlight: false,
      scrollbar: {
        vertical: previewModeRef.current === 'both' ? 'hidden' : 'visible',
        horizontal: previewModeRef.current === 'both' ? 'hidden' : 'auto',
        handleMouseWheel: previewModeRef.current !== 'both',
        verticalScrollbarSize: 16,
        horizontalScrollbarSize: 10,
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false
      }
    });

    document.fonts.load("500 16px 'Pretendard Variable'").then(() => {
      if (editorRef.current === editor) {
        monaco.editor.remeasureFonts();
        editor.layout();
      }
    }).catch(() => undefined);

    if (themePalette) {
      monaco.editor.setTheme(themePalette);
    }

    try {
      const textarea = editor.getDomNode()?.querySelector('textarea');
      if (textarea) textarea.setAttribute('spellcheck', 'false');
    } catch (_) { }

    setTimeout(() => { editor.layout(); }, 50);

    editor.onDidFocusEditorText(() => {
      editor.layout();
    });

    editor.onDidBlurEditorText(() => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }
      setTimeout(() => {
        if (editorRef.current) {
          const latestVal = editorRef.current.getValue();
          setContent(latestVal);
        }
      }, 100);
    });

    let cursorSyncLock = false;
    let cursorSyncLockTimeout: any = null;

    editor.onDidChangeModel(() => {
      requestAnimationFrame(() => {
        updateDecorations(editor);
      });
    });

    // 스크롤 동기화 변수 및 핸들러
    let isTyping = false;
    let typingTimeout: any = null;
    let rafSyncId: number | null = null;
    let rafCursorSyncId: number | null = null;
    let prevCursorCol = 1;
    let bookWheelUntil = 0;
    const bookWheelDom = editor.getDomNode();
    const handleBookWheel = () => {
      if (!previewRef.current?.querySelector('.book-page[data-line]')) return;
      bookWheelUntil = Date.now() + 500;
      if (rafCursorSyncId) { cancelAnimationFrame(rafCursorSyncId); rafCursorSyncId = null; }
      cursorSyncLock = false;
    };
    bookWheelDom?.addEventListener('wheel', handleBookWheel, { passive: true, capture: true });
    editor.onDidDispose(() => bookWheelDom?.removeEventListener('wheel', handleBookWheel, true));

    const syncPreviewFromEditor = () => {
      if (previewRef.current?.querySelector('.visual-document-editor')) return;
      if (previewModeRef.current !== 'both' || !previewRef.current) return;
      if (isScrollingRef.current === 'preview') return;

      const content = editor.getValue();
      if (rafSyncId) cancelAnimationFrame(rafSyncId);
      rafSyncId = requestAnimationFrame(() => {
        rafSyncId = null;
        syncPreviewFromEditorScroll(previewRef.current, editor, content);
      });
    };

    let rafCursorStateId: number | null = null;

    const syncPreviewFromCursor = (lineNumber: number, column?: number) => {
      if (previewRef.current?.querySelector('.visual-document-editor')) return;
      if (Date.now() < bookWheelUntil) return;
      if (previewModeRef.current !== 'both' || !previewRef.current) return;
      if (isScrollingRef.current === 'preview') return;

      cursorSyncLock = true;
      if (cursorSyncLockTimeout) clearTimeout(cursorSyncLockTimeout);
      cursorSyncLockTimeout = setTimeout(() => {
        cursorSyncLock = false;
      }, 150);

      if (rafCursorSyncId) cancelAnimationFrame(rafCursorSyncId);
      rafCursorSyncId = requestAnimationFrame(() => {
        rafCursorSyncId = null;
        if (previewRef.current) {
          const content = editor.getValue();
          syncPreviewToTargetLine(previewRef.current, lineNumber, content, { column });
        }
      });
    };

    let decorationsTimeout: any = null;
    editor.onDidChangeModelContent(() => {
      isTyping = true;
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        isTyping = false;
      }, 300);

      if (decorationsTimeout) clearTimeout(decorationsTimeout);
      decorationsTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          const hadTextFocus = editor.hasTextFocus?.();
          updateDecorations(editor);
          if (hadTextFocus && !editor.hasTextFocus?.()) editor.focus();
        });
      }, 120);

      requestAnimationFrame(updatePersistentCaret);
    });

    let isSuggestSuppressed = false;

    const closeSuggestWidget = () => {
      isSuggestSuppressed = true;
      try {
        editor.trigger('keyboard', 'hideSuggestWidget', {});
        const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
        if (suggestCtrl && suggestCtrl.widget && suggestCtrl.widget.value) {
          suggestCtrl.widget.value.hide();
        }
      } catch (_) {}
    };

    const handleEscape = () => {
      try {
        const findCtrl = editor.getContribution('editor.contrib.findController') as any;
        if (findCtrl?.getState?.()?.isRevealed) {
          findCtrl.closeFindWidget();
          editor.focus();
          return;
        }
      } catch (_) {}

      closeSuggestWidget();
      setFloatingToolbar(prev => prev.visible ? { ...prev, visible: false } : prev);
    };

    editor.addCommand(monaco.KeyCode.Escape, handleEscape);

    editor.onKeyUp((e) => {
      if (e.keyCode === monaco.KeyCode.Escape || e.browserEvent?.key === 'Escape') {
        handleEscape();
        return;
      }

      if (isSuggestSuppressed) {
        return;
      }

      const position = editor.getPosition();
      const model = editor.getModel();
      if (position && model) {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1);
        if (/(^|\s)\/\S*$/.test(beforeCursor)) {
          editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        }
      }
    });

    // 테마 설정
    EDITOR_THEMES.forEach(t => {
      const isDark = t.base === 'vs-dark';
      monaco.editor.defineTheme(t.id, {
        base: t.base,
        inherit: true,
        rules: [
          ...(t.rules || []),
          { token: 'punctuation', foreground: isDark ? 'e2e8f0' : '1e293b' },
          { token: 'delimiter.markdown', foreground: '60a5fa', fontStyle: 'bold' },
          { token: 'string.link.markdown', foreground: '94a3b8' },
          { token: 'variable.md', foreground: 'f59e0b' }
        ],
        colors: {
          ...t.colors,
          'editor.background': isDark ? '#0b1120' : '#eef2f6',
          'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
          'editor.foreground': isDark ? '#e2e8f0' : '#1e293b',
          'editorLineNumber.foreground': isDark ? '#475569' : '#64748b',
          'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB',
          'editorCursor.foreground': isDark ? '#38bdf8' : '#1d4ed8',
          'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
          'editorIndentGuide.background': '#88888815',
          'editorIndentGuide.activeBackground': '#88888830',
        }
      });
    });
    monaco.editor.setTheme(themePalette);

    decorationsCollectionRef.current = editor.createDecorationsCollection();
    updateDecorations(editor);
    setIsEditorReady(true);

    // 2. 클립보드 붙여넣기 및 드래그 앤 드롭 등록
    registerMonacoClipboardAndDrop(editor, monaco, depsRef);

    const container = editor.getContainerDomNode();
    container?.addEventListener('mouseenter', () => { isEditorHovered.current = true; });
    container?.addEventListener('mouseleave', () => { isEditorHovered.current = false; });

    let editorMouseDown = false;
    let editorMouseAnchor: { lineNumber: number; column: number } | null = null;

    editor.onMouseDown((e: any) => {
      editorMouseDown = true;
      if (e.target?.position) {
        const clickedLine = e.target.position.lineNumber;
        editorMouseAnchor = {
          lineNumber: clickedLine,
          column: e.target.position.column
        };
        setActiveLine(clickedLine);
        setCursorLine(clickedLine);
        if (e.target.position.column) {
          setCursorColumn(e.target.position.column);
          window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line: clickedLine, column: e.target.position.column } }));
        }
      }
    });

    editor.onMouseUp(() => {
      editorMouseDown = false;
      editorMouseAnchor = null;
    });

    editor.onDidChangeModelContent((e) => {
      if (e && e.changes && e.changes.some(c => c.text === '1. ' || c.text === '1.')) {
        setTimeout(() => editor.getAction('autoRenumberList')?.run(), 150);
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      if (previewModeRef.current === 'both' && editor.hasTextFocus()) {
        window.dispatchEvent(new CustomEvent('onrivi:source-cursor', { detail: { offset: editor.getModel()?.getOffsetAt(e.position) } }));
      }

      const currentLine = e.position.lineNumber;
      const currentCol = e.position.column;
      const hasLineChanged = prevCursorLineRef.current !== currentLine;
      const colDiff = Math.abs(currentCol - prevCursorCol);
      const hasWrappedRowChanged = colDiff >= 20;
      const lineCount = editor.getModel()?.getLineCount() ?? 0;
      const isNearEnd = lineCount > 0 && currentLine >= lineCount - 1;
      prevCursorLineRef.current = currentLine;
      prevCursorCol = currentCol;

      if (rafCursorStateId) cancelAnimationFrame(rafCursorStateId);
      rafCursorStateId = requestAnimationFrame(() => {
        rafCursorStateId = null;
        updatePersistentCaret();
        setActiveLine(currentLine);
        setCursorLine(currentLine);
        setCursorColumn(currentCol);
        window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line: currentLine, column: currentCol } }));
      });

      if ((!isTyping || e.reason === 3) && (hasLineChanged || e.reason === 3 || hasWrappedRowChanged || isNearEnd)) {
        syncPreviewFromCursor(currentLine, currentCol);
      }

      if (e.reason === 3) {
        try {
          const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
          if (suggestCtrl && suggestCtrl.widget && suggestCtrl.widget.value) {
            suggestCtrl.widget.value.hide();
          }
        } catch (_) {
          editor.trigger('keyboard', 'hideSuggestWidget', {});
        }
      }
    });

    editor.onDidScrollChange((e) => {
      if (!e.scrollTopChanged) return;
      updatePersistentCaret();
      if (isScrollingRef.current === 'preview') return;
      if (previewModeRef.current !== 'both' || !previewRef.current) return;
      if (isTyping) return;
      if (cursorSyncLock) return;
      syncPreviewFromEditor();
    });

    // 소프트 줄바꿈(Word wrap) 경계면 방향키 2단계 연속 이동 보정
    const handleWordWrapArrowNavigation = (e: any): boolean => {
      try {
        const isRight = e.keyCode === monaco.KeyCode.RightArrow || e.browserEvent?.key === 'ArrowRight';
        const isLeft = e.keyCode === monaco.KeyCode.LeftArrow || e.browserEvent?.key === 'ArrowLeft';
        if (!isRight && !isLeft) return false;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return false;

        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) return false;

        const viewModel = (editor as any)._viewModel;
        if (!viewModel || !viewModel.coordinatesConverter) return false;

        const cursorStates = viewModel.getCursorStates?.();
        if (!cursorStates || cursorStates.length !== 1) return false;

        const currentCursor = cursorStates[0];
        const curViewPos = currentCursor?.viewState?.position;
        if (!curViewPos) return false;

        const modelPos = editor.getPosition();
        if (!modelPos) return false;

        const converter = viewModel.coordinatesConverter;
        const viewLeft = converter.convertModelPositionToViewPosition(modelPos, 0);
        const viewRight = converter.convertModelPositionToViewPosition(modelPos, 1);
        if (!viewLeft || !viewRight) return false;

        if (viewLeft.lineNumber !== viewRight.lineNumber) {
          if (isRight && curViewPos.lineNumber === viewLeft.lineNumber && curViewPos.column >= viewLeft.column) {
            e.preventDefault();
            e.stopPropagation();
            e.browserEvent?.stopImmediatePropagation?.();

            const newViewState = currentCursor.viewState.move(false, viewRight.lineNumber, viewRight.column, 0);
            viewModel.setCursorStates('keyboard', 3, [{ modelState: null, viewState: newViewState }]);
            viewModel.revealAllCursors('keyboard', true);
            updatePersistentCaret();
            return true;
          }

          if (isLeft && curViewPos.lineNumber === viewRight.lineNumber && curViewPos.column <= viewRight.column) {
            e.preventDefault();
            e.stopPropagation();
            e.browserEvent?.stopImmediatePropagation?.();

            const newViewState = currentCursor.viewState.move(false, viewLeft.lineNumber, viewLeft.column, 0);
            viewModel.setCursorStates('keyboard', 3, [{ modelState: null, viewState: newViewState }]);
            viewModel.revealAllCursors('keyboard', true);
            updatePersistentCaret();
            return true;
          }
        }
      } catch (err) {
        console.warn('[useMonacoSetup] handleWordWrapArrowNavigation error:', err);
      }
      return false;
    };

    editor.onKeyDown((e) => {
      if (handleWordWrapArrowNavigation(e)) {
        return;
      }

      if (e.keyCode === monaco.KeyCode.Escape || e.browserEvent?.key === 'Escape') {
        handleEscape();
      } else if (
        e.keyCode !== monaco.KeyCode.Shift &&
        e.keyCode !== monaco.KeyCode.Ctrl &&
        e.keyCode !== monaco.KeyCode.Alt
      ) {
        isSuggestSuppressed = false;
      }

      if (e.keyCode === monaco.KeyCode.Enter && !isComposingRef.current) {
        setTimeout(() => {
          const pos = editor.getPosition();
          if (pos) {
            editor.revealPositionInCenterIfOutsideViewport(pos);
          }
        }, 10);
      }
    });

    editor.onMouseDown(() => {
      editor.trigger('mouse', 'hideSuggestWidget', {});
      setFloatingToolbar(prev => prev.visible ? { ...prev, visible: false } : prev);
    });

    editor.onDidChangeCursorSelection((e) => {
      if (!e.selection.isEmpty()) {
        lastSelectionRef.current = e.selection;
      } else {
        lastSelectionRef.current = null;
      }

      if (editorMouseDown && editorMouseAnchor && e.source === 'mouse' && !e.selection.isEmpty()) {
        const sel = e.selection;
        const anchorMatchStart = sel.startLineNumber === editorMouseAnchor.lineNumber && sel.startColumn === editorMouseAnchor.column;
        const anchorMatchEnd = sel.endLineNumber === editorMouseAnchor.lineNumber && sel.endColumn === editorMouseAnchor.column;
        if (!anchorMatchStart && !anchorMatchEnd) {
          const aL = editorMouseAnchor.lineNumber, aC = editorMouseAnchor.column;
          const fL = sel.positionLineNumber, fC = sel.positionColumn;
          const forward = aL < fL || (aL === fL && aC < fC);
          editor.setSelection({
            startLineNumber: forward ? aL : fL,
            startColumn: forward ? aC : fC,
            endLineNumber: forward ? fL : aL,
            endColumn: forward ? fC : aC
          });
        }
      }
    });

    // 3. 슬래시 및 [[ 위키링크 자동완성 프로바이더 등록
    registerMonacoCompletionProviders(editor, monaco, depsRef);

    editor.onDidDispose(() => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    });
  };

  return { handleMount };
}
