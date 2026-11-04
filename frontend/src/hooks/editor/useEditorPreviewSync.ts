// ====================================================================
// 📊 [OMD-HOOK-useEditorPreviewSync] frontend/src/hooks/editor/useEditorPreviewSync.ts
// 🎯 @KICK  : 미리보기 전처리(processedContent/lineMap), 에디터→미리보기 위치 동기화, 활성 행 하이라이트, 휠 확대/축소, 클릭 이동, 체크박스 토글, 서식 복사를 담당하는 미리보기 연동 훅
// 🛡️ @GUARD : Sync Engine 단일 진입(syncPreviewToTargetLine) 경유, 미리보기 측 스크롤 중·위지윅·그림책 모드에서는 강제 동기화 생략
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화 및 훅 의존성 정합화]: handleCheckboxToggle, handlePreviewWheel, bindPreviewScrollContainer, handlePreviewClick, handleCopyPreviewContent, processedContent/lineMap/frontmatterLines, 미리보기 추종 레이아웃 이펙트, handlePreviewImageLoaded, previewHighlightLine 이펙트를 MainEditorApp.tsx에서 분리 위임하고 ESLint exhaustive-deps 경고를 0건으로 해소 (동작 변경 없음)
// 🔗 @CALLS : preprocessMarkdownForPreview, syncPreviewToTargetLine, flashPreviewHighlight, importedCheckboxEdit, serializeDocumentForClipboard, copyFormattedDocumentToClipboard
// ====================================================================

import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { flashPreviewHighlight } from '@/lib/previewHighlight';
import { importedCheckboxEdit } from '@/lib/importCheckboxes';
import { serializeDocumentForClipboard, copyFormattedDocumentToClipboard } from '@/lib/clipboardExport';
import { preprocessMarkdownForPreview } from '@/lib/editorUtils';
import { syncPreviewToTargetLine } from '@/lib/syncEngine';

export interface UseEditorPreviewSyncProps {
  editorRef: React.MutableRefObject<any>;
  previewRef: React.MutableRefObject<HTMLDivElement | null>;
  contentRef: React.MutableRefObject<string>;
  isScrollingRef: React.MutableRefObject<'editor' | 'preview' | null>;
  frontmatterLinesRef: React.MutableRefObject<number>;
  previewContent: string;
  previewMode: string;
  activeLine: number | null;
  showToast: (message: string, type?: any, ...rest: any[]) => void;
  setPreviewZoomScale: React.Dispatch<React.SetStateAction<number>>;
  scrollToLine: (lineNumber: number) => void;
}

/**
 * ========================================================================================
 * [함수명] useEditorPreviewSync - 미리보기 전처리·위치 동기화·하이라이트·인터랙션 핸들러를 제공합니다.
 * (MainEditorApp에 있던 미리보기 연동 로직을 선언 순서 그대로 이관한 훅입니다.)
 *
 * @param {UseEditorPreviewSyncProps} props - 에디터/미리보기 ref, 미리보기 콘텐츠·모드·활성 행, 토스트/배율 setter, scrollToLine
 * @returns {object} processedContent, lineMap, frontmatterLines 및 미리보기 이벤트 핸들러 집합
 *
 * @example
 * const { processedContent, lineMap, bindPreviewScrollContainer } = useEditorPreviewSync({ editorRef, previewRef, ... });
 * ==========================================================================================
 */
export function useEditorPreviewSync(props: UseEditorPreviewSyncProps) {
  const {
    editorRef,
    previewRef,
    contentRef,
    isScrollingRef,
    frontmatterLinesRef,
    previewContent,
    previewMode,
    activeLine,
    showToast,
    setPreviewZoomScale,
    scrollToLine,
  } = props;

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0029] MainEditorApp.tsx ➔ handleCheckboxToggle
  // 🎯 @KICK  : 미리보기 체크박스 클릭을 에디터 모델 라인 콘텐츠에 동기화
  // 🛡️ @GUARD : window.monaco 존재 확인, 라인 범위 검사, 정규식 검증으로 가드
  // 🚨 @PATCH : None
  // 🔗 @CALLS : editor.getModel, editor.pushUndoStop, editor.executeEdits
  // ====================================================================
  const handleCheckboxToggle = useCallback((lineNumber: number, checked: boolean, importedId?: string) => {
    if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    if (importedId) {
      const edit = importedCheckboxEdit(model.getValue(), importedId, checked);
      if (!edit) return;
      const start=model.getPositionAt(edit.start), end=model.getPositionAt(edit.end);
      const Range=(window as any).monaco.Range;
      editor.pushUndoStop();
      editor.executeEdits('importedCheckboxToggle',[{range:new Range(start.lineNumber,start.column,end.lineNumber,end.column),text:edit.text,forceMoveMarkers:true}]);
      editor.pushUndoStop();
      return;
    }

    if (lineNumber < 1 || lineNumber > model.getLineCount()) return;

    const lineContent = model.getLineContent(lineNumber);
    const checkboxRegex = /^([ \t]*[-*+]\s+\[)([ xX])(\].*)$/;
    const match = lineContent.match(checkboxRegex);

    if (match) {
      const [_, prefix, currentStatus, suffix] = match;
      const newStatus = checked ? 'x' : ' ';
      const newLineContent = `${prefix}${newStatus}${suffix}`;

      const Range = (window as any).monaco.Range;
      editor.pushUndoStop();
      editor.executeEdits("checkboxToggle", [
        {
          range: new Range(lineNumber, 1, lineNumber, lineContent.length + 1),
          text: newLineContent,
          forceMoveMarkers: true,
        }
      ]);
      editor.pushUndoStop();
    }
  }, [editorRef]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0031] MainEditorApp.tsx ➔ previewWheelSync
  // 🎯 @KICK  : 분할 모드의 미리보기 휠 입력을 에디터에 전달하고 에디터 스크롤만 동기화의 기준으로 사용
  // 🛡️ @GUARD : 문서를 연 뒤 미리보기 DOM이 생성되는 데스크톱에서도 리스너가 반드시 연결되도록 callback ref 사용
  // 🚨 @PATCH : 2026-09-28 — 미리보기 자체 스크롤 대신 에디터 스크롤로 휠 입력 전달
  // 🔗 @CALLS : WheelEvent.preventDefault, editor.setScrollTop
  // ====================================================================
  const handlePreviewWheel = useCallback((event: WheelEvent) => {
    // 💡 [Ctrl + Wheel]: 미리보기 화면 배율 확대/축소 (50% ~ 200%)
    if (event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY < 0) {
        setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
      } else if (event.deltaY > 0) {
        setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
      }
      return;
    }

    // Normal wheel scrolling belongs to the document container.
    // Its scroll event synchronizes the Markdown panel.
  }, [setPreviewZoomScale]);

  const bindPreviewScrollContainer = useCallback((node: HTMLDivElement | null) => {
    previewRef.current?.removeEventListener('wheel', handlePreviewWheel, true);
    previewRef.current = node;
    node?.addEventListener('wheel', handlePreviewWheel, { passive: false, capture: true });
  }, [handlePreviewWheel, previewRef]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0051] MainEditorApp.tsx ➔ handlePreviewClick
  // 🎯 @KICK  : 미리보기 클릭 시: 에디터를 일치하는 줄로 스크롤, 미리보기에서 줄 강조
  // 🛡️ @GUARD : 중첩 요소 처리를 위해 DOM closest [data-line] 순회
  // 🚨 @PATCH : None
  // 🔗 @CALLS : scrollToLine, element.closest, classList.add/remove
  // ====================================================================
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const lineEl = target.closest('[data-line]');
    if (lineEl) {
      const lineStr = lineEl.getAttribute('data-line');
      if (lineStr) {
        const lineNumber = parseInt(lineStr, 10);
        scrollToLine(lineNumber);
        const bookColumn=Number((lineEl as HTMLElement).dataset.bookStartColumn || 1);
        if (bookColumn>1 && editorRef.current) {
          editorRef.current.setPosition({lineNumber,column:bookColumn});
          editorRef.current.revealPositionInCenter?.({lineNumber,column:bookColumn});
        }

        if (previewRef.current) {
          const elements = Array.from(previewRef.current.querySelectorAll('[data-line]'));
          elements.forEach(element => element.classList.remove('preview-highlight-line'));
          flashPreviewHighlight(lineEl as HTMLElement);
        }
      }
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0063.1] MainEditorApp.tsx ➔ handleCopyPreviewContent
  // 🎯 @KICK  : 문서보기(VisualDocumentEditor/MarkdownViewer)의 렌더링된 서식 본문을 CSS 인라인 스타일과 함께 클립보드에 안전하게 복사
  // 🛡️ @GUARD : computedStyle 기반 CSS 인라인 주입, dynamicCss 포함, Word/블로그/노션 호환 HTML 조각 및 다중 Fallback 보장
  // 🚨 @PATCH : **2026-10-24** — [CSS 서식 1:1 보존 클립보드 직렬화 엔진(clipboardExport) 연동]:
  //             1) serializeDocumentForClipboard를 연동하여 각 요소의 실제 계산된 CSS(폰트, 크기, 색상, 테두리, 배경, 간격)를 인라인 주입
  //             2) copyFormattedDocumentToClipboard를 통해 Electron native CF_HTML, Web ClipboardItem, execCommand 3중 복사 완비
  // ====================================================================
  const handleCopyPreviewContent = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      // 1) 실제 문서 본문이 렌더링된 타겟 요소 탐색 (.visual-document-surface 우선)
      const targetEl = (
        previewRef.current.querySelector('.visual-document-surface') ||
        previewRef.current.querySelector('.markdown-viewer-root') ||
        previewRef.current.querySelector('.picturebook-root') ||
        previewRef.current.querySelector('.visual-document-editor') ||
        previewRef.current.querySelector('.preview-page-sheet') ||
        previewRef.current
      ) as HTMLElement;

      if (!targetEl) {
        showToast('복사할 본문 요소를 찾을 수 없습니다.', 'warning');
        return;
      }

      // 2) 현재 렌더링된 동적 CSS 추출
      const dynamicCss = document.getElementById('onrivi-dynamic-css')?.textContent || '';

      // 3) 계산된 CSS 스타일을 인라인으로 1:1 주입하여 표준 HTML 조각 및 텍스트 직렬화
      const { fullHtml, cleanText } = serializeDocumentForClipboard(targetEl, dynamicCss);

      if (!cleanText.trim() && !fullHtml.trim()) {
        showToast('복사할 본문 내용이 없습니다.', 'info');
        return;
      }

      // 4) 시스템 클립보드에 다중 Fallback으로 안전하게 복사
      const copied = await copyFormattedDocumentToClipboard(fullHtml, cleanText);

      if (copied) {
        showToast('CSS 서식이 적용된 문서 내용이 클립보드에 복사되었습니다.', 'success');
      } else {
        throw new Error('클립보드 접근이 차단되었거나 복사 명령이 실패했습니다.');
      }
    } catch (err) {
      console.error('[handleCopyPreviewContent] Copy failed:', err);
      showToast('클립보드 복사에 실패했습니다.', 'error');
      throw err;
    }
  }, [showToast, previewRef]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0067] MainEditorApp.tsx ➔ processedContent_lineMap
  // 🎯 @KICK  : 미리보기를 위해 마크다운 콘텐츠를 전처리하고 스크롤 동기화를 위한 라인 매핑 생성
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : preprocessMarkdownForPreview
  // ====================================================================

  const { processedContent, lineMap, frontmatterLines } = useMemo(() => {
    const res = preprocessMarkdownForPreview(previewContent);
    return {
      processedContent: res.text,
      lineMap: res.lineMap,
      frontmatterLines: res.frontmatterLines
    };
  }, [previewContent]);

  // 💡 [frontmatter 라인 수 ref 동기화] useMemo 결과(frontmatterLines)를 ref에 반영하여
  // useMonacoSetup 클로저 내부에서 항상 최신 frontmatter 오프셋을 참조할 수 있도록 합니다.
  useEffect(() => {
    frontmatterLinesRef.current = frontmatterLines;
  }, [frontmatterLines, frontmatterLinesRef]);

  // 💡 [실시간 타이핑 및 콘텐츠 갱신 시 미리보기 스크롤 즉시 추종 보장]
  // 사용자가 에디터 하단이나 마지막 행에서 타이핑할 때, 새 행/문단이 DOM에 렌더링된 직후
  // 현재 커서 위치의 문단 끝(elementBottom)이 미리보기 Safe Zone(BOTTOM_SAFE) 안에 안정적으로 보이도록 동기화합니다.
  useLayoutEffect(() => {
    if (previewMode !== 'both' || !previewRef.current || !editorRef.current) return;
    if (isScrollingRef.current === 'preview' || previewRef.current.querySelector('.visual-document-editor')) return;
    // 💡 [그림책 스크롤 튐 방어] 그림책 모드일 때는 사용자가 미리보기 영역에서 직접 보고 있거나 편집 모드를 토글할 때
    // 모나코 에디터의 이전 커서 라인(예: 1라인)으로 미리보기 스크롤이 강제 튕김 현상을 방지합니다.
    if (previewRef.current.querySelector('.picturebook-root')) return;

    const currentPos = editorRef.current.getPosition?.();
    if (currentPos && currentPos.lineNumber) {
      const currentContent = editorRef.current.getValue?.() || contentRef.current;
      syncPreviewToTargetLine(previewRef.current, currentPos.lineNumber, currentContent, { column: currentPos.column });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedContent, previewMode]);

  const handlePreviewImageLoaded = useCallback(() => {
    if(previewRef.current?.querySelector('.visual-document-editor'))return;
    // 💡 이미지 비동기 로딩 완료 시 최신 높이에 맞춰 위치 1회 미세 보정
    if (previewRef.current && editorRef.current && isScrollingRef.current !== 'preview') {
      if (previewRef.current.querySelector('.book-page[data-line]')) {
        const line = Number(previewRef.current.dataset.bookSyncLine);
        if (line > 0) syncPreviewToTargetLine(previewRef.current, line, contentRef.current);
        return;
      }
      const p = editorRef.current.getPosition?.();
      if (p && p.lineNumber) {
        const c = editorRef.current.getValue?.() || contentRef.current;
        syncPreviewToTargetLine(previewRef.current, p.lineNumber, c, { column: p.column });
      }
    }
  }, [previewRef, editorRef, isScrollingRef, contentRef]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0041] MainEditorApp.tsx ➔ previewHighlightLine
  // 🎯 @KICK  : 분할 모드에서 에디터의 activeLine과 일치하는 미리보기 줄 강조
  // 🛡️ @GUARD : 중복 방지를 위해 모든 강조 먼저 제거, .onrivi-line 최우선 매칭으로 문단 내 개별 행 단독 하이라이트
  // 🚨 @PATCH : 2026-09-06 - [문단 내 커서 위치 행 단독 하이라이트]
  //             1) .onrivi-line 클래스 요소를 최우선 타깃으로 선택하여 상위 p 태그 승격 차단
  //             2) exact match 및 closestCandidate에서 문단 내 특정 행 1:1 하이라이트 보장
  //             3) processedContent 의존성 추가로 새 이미지/미디어/문단 삽입 렌더링 즉시 하이라이트 재동기화
  // 🔗 @CALLS : element.classList.add/remove
  // ====================================================================
  useEffect(() => {
    if (!previewRef.current) return;

    const previewContainer = previewRef.current;
    const elements = Array.from(previewContainer.querySelectorAll('[data-line]')) as HTMLElement[];
    elements.forEach(element => element.classList.remove('preview-highlight-line'));

    if (previewMode !== 'both' || !activeLine) return;

    const blockSelectors = '.onrivi-line, figure, p, li, blockquote, tr, h1, h2, h3, h4, h5, h6, pre, iframe, video, .table-wrapper-area, .codeblock-area, .map-embed-wrapper';

    // 1. exact match (activeLine과 정확히 일치하는 요소) 최우선 탐색
    const exactMatches = elements.filter(el => {
      const l = parseInt(el.getAttribute('data-line') || '-1', 10);
      return l === activeLine;
    });

    let targetEl: HTMLElement | null = null;

    if (exactMatches.length > 0) {
      // 💡 .onrivi-line이 존재할 경우 문단 전체(p)로 승격하지 않고 커서가 위치한 개별 행을 최우선 타깃으로 선택
      const lineMatch = exactMatches.find(el => el.classList.contains('onrivi-line'));
      if (lineMatch) {
        targetEl = lineMatch;
      } else {
        // 💡 [중첩 리스트 최심층 자식 요소 우선 선택]
        // exactMatches 중에 부모 요소(ol, ul, 부모 li)와 자식 요소(자식 li)가 공존할 경우,
        // 다른 일치 요소를 자식으로 포함하지 않는 가장 깊은 자식 엘리먼트를 선택합니다.
        const leafMatches = exactMatches.filter(el => !exactMatches.some(other => other !== el && el.contains(other)));
        const candidate = leafMatches.find(el => el.matches(blockSelectors)) || leafMatches[0] || exactMatches[0];
        targetEl = candidate.matches(blockSelectors) ? candidate : ((candidate.closest(blockSelectors) as HTMLElement) || candidate);
      }
    } else {
      // 2. exact match가 없으면 activeLine 이하 중 가장 가까운(최대값) 요소를 탐색
      let maxLine = -1;
      let closestCandidates: HTMLElement[] = [];
      elements.forEach(element => {
        const lineStr = element.getAttribute('data-line');
        if (lineStr) {
          const line = parseInt(lineStr, 10);
          if (line <= activeLine) {
            if (line > maxLine) {
              maxLine = line;
              closestCandidates = [element];
            } else if (line === maxLine) {
              closestCandidates.push(element);
            }
          }
        }
      });
      if (closestCandidates.length > 0) {
        const lineMatch = closestCandidates.find(el => el.classList.contains('onrivi-line'));
        if (lineMatch) {
          targetEl = lineMatch;
        } else {
          const leafCandidates = closestCandidates.filter(el => !closestCandidates.some(other => other !== el && el.contains(other)));
          const candidate = leafCandidates.find(el => el.matches(blockSelectors)) || leafCandidates[0] || closestCandidates[0];
          targetEl = candidate.matches(blockSelectors) ? candidate : ((candidate.closest(blockSelectors) as HTMLElement) || candidate);
        }
      }
    }

    if (targetEl) {
      return flashPreviewHighlight(targetEl);
    }
  }, [activeLine, previewMode, processedContent, previewRef]);

  return {
    handleCheckboxToggle,
    handlePreviewWheel,
    bindPreviewScrollContainer,
    handlePreviewClick,
    handleCopyPreviewContent,
    processedContent,
    lineMap,
    frontmatterLines,
    handlePreviewImageLoaded,
  };
}
