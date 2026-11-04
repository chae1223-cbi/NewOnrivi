// ====================================================================
// 📊 [OMD-HOOK-useEditorLifecycleEffects] frontend/src/hooks/editor/useEditorLifecycleEffects.ts
// 🎯 @KICK  : 탭 이름 변경·삭제·라인 점프 이벤트 리스너, 분할 화면 읽기 전용 가드, 에디터 테마·옵션 동기화, 제한사용자 웰컴 정리, 사이드바 리사이즈, 탭 전환 모드/미리보기 동기화, 자동 저장(autoSave), 목차(TOC) 생성 훅
// 🛡️ @GUARD : 동일 파일명 타 경로 오종료 방어, 5초 자동저장 무한루프 및 번들 도움말 덮어쓰기 차단, 코드블록 내부 헤딩 오탐 방지
// 🚨 @PATCH : 2026-11-04 — [주석 표준화] 내부 핸들러 함수(handleMouseMove, stopResizing, startResizing) 2단계 JSDoc 표준화 적용
//             2026-11-04 — [MainEditorApp 모듈화 및 훅 의존성 정합화]: 탭/파일 생명주기 이벤트, 에디터 설정 동기화, 제한사용자 웰컴 정리, 자동 저장, TOC 계산을 MainEditorApp.tsx에서 분리 위임하고 ESLint exhaustive-deps 경고를 0건으로 해소 (동작 변경 없음)
// 🔗 @CALLS : applySafeMarkdownMonarchTokenizer, syncPreviewToTargetLine, syncPreviewFromEditorScroll, getCodeBlockLineMask, createHeadingNumberer, isBundledDocumentPath
// ====================================================================

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { EDITOR_THEMES, applySafeMarkdownMonarchTokenizer } from '@/lib/editorThemes';
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from '@/lib/syncEngine';
import { getCodeBlockLineMask } from '@/lib/editorUtils';
import { createHeadingNumberer } from '@/lib/headingNumbering';
import { DEFAULT_PROFILE } from '@/constants/cssProfile';
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { FileNode } from '@/lib/indexedDbHelper';
import { CssProfile } from '@/types/cssProfile';

export interface UseEditorLifecycleEffectsProps {
  mounted: boolean;
  isEditorReady: boolean;
  editorRef: React.MutableRefObject<any>;
  previewRef: React.MutableRefObject<HTMLDivElement | null>;
  tabs: any[];
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  tabsRef: React.MutableRefObject<any[]>;
  activeTabId: string | null;
  setActiveTabId: React.Dispatch<React.SetStateAction<string | null>>;
  activeTabIdRef: React.MutableRefObject<string | null>;
  prevActiveTabRef: React.MutableRefObject<string | null>;
  prevCursorLineRef: React.MutableRefObject<number | null>;
  switchTab: (id: string) => void;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  currentFileNode: FileNode | null;
  setCurrentFileNode: React.Dispatch<React.SetStateAction<FileNode | null>>;
  currentFileName: string;
  setCurrentFileName: React.Dispatch<React.SetStateAction<string>>;
  previewMode: 'edit' | 'both' | 'preview' | 'css-style';
  setPreviewModeRaw: React.Dispatch<React.SetStateAction<'edit' | 'both' | 'preview' | 'css-style'>>;
  previewModeRef: React.MutableRefObject<'edit' | 'both' | 'preview' | 'css-style'>;
  lastGeneralPreviewModeRef: React.MutableRefObject<'edit' | 'both' | 'preview' | 'css-style'>;
  isEditorMountedRef: React.MutableRefObject<boolean>;
  handleFileOpenByPath?: (filePath: string, anchor?: string) => Promise<void>;
  themePalette: string;
  fontSize: number;
  wordWrap: 'on' | 'off';
  editorFontWeight: string;
  editorHighContrast: boolean;
  isA4GuardEnabled: boolean;
  isLicenseChecking: boolean;
  isDuplicateInstance: boolean;
  isRestrictedUser: boolean;
  effectiveLicenseStatus: any;
  licenseStatus: any;
  sessionRestoringRef: React.MutableRefObject<boolean>;
  helpContent: string | null;
  isResizing: React.MutableRefObject<boolean>;
  setSidebarWidth: (w: number) => void;
  lastSavedContentRef: React.MutableRefObject<string>;
  setSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'saving' | 'unsaved' | ''>>;
  autoSave: any;
  saveFile: (content?: string, targetNode?: FileNode | null) => Promise<boolean>;
  profiles: CssProfile[];
  activeProfileId: string;
}

/**
 * ========================================================================================
 * [함수명] useEditorLifecycleEffects - 탭/파일 이벤트·테마·모드·자동저장 이펙트 및 TOC·리사이즈 핸들러 훅
 *
 * @param {UseEditorLifecycleEffectsProps} props - 에디터 전역 상태 및 ref 집합
 * @returns {{ toc: Array<{ id: string; text: string; level: number; lineNumber: number }>, startResizing: (e: React.MouseEvent) => void, stopResizing: () => void, handleMouseMove: (e: MouseEvent) => void }}
 * ==========================================================================================
 */
export function useEditorLifecycleEffects(props: UseEditorLifecycleEffectsProps) {
  const {
    mounted,
    isEditorReady,
    editorRef,
    previewRef,
    tabs,
    setTabs,
    tabsRef,
    activeTabId,
    setActiveTabId,
    activeTabIdRef,
    prevActiveTabRef,
    prevCursorLineRef,
    switchTab,
    content,
    setContent,
    currentFileNode,
    setCurrentFileNode,
    currentFileName,
    setCurrentFileName,
    previewMode,
    setPreviewModeRaw,
    previewModeRef,
    lastGeneralPreviewModeRef,
    isEditorMountedRef,
    handleFileOpenByPath,
    themePalette,
    fontSize,
    wordWrap,
    editorFontWeight,
    editorHighContrast,
    isA4GuardEnabled,
    isLicenseChecking,
    isDuplicateInstance,
    isRestrictedUser,
    effectiveLicenseStatus,
    licenseStatus,
    sessionRestoringRef,
    helpContent,
    isResizing,
    setSidebarWidth,
    lastSavedContentRef,
    setSaveStatus,
    autoSave,
    saveFile,
    profiles,
    activeProfileId,
  } = props;

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012b] MainEditorApp.tsx ➔ file:tab-renamed listener
  // 🎯 @KICK  : 탐색기에서 파일/폴더 이름 변경 시 새 탭을 열지 않고 기존 탭 메타데이터만 갱신
  // 🛡️ @GUARD : oldPath가 현재 열린 탭과 일치하거나 하위 경로에 포함될 때만 동작
  // 🚨 @PATCH : **2026-09-18** — [폴더명 변경 시 열린 탭 경로·브레드크럼 동기화 및 탭 순서/활성 노드 일괄 갱신]
  // 🔗 @CALLS : setCurrentFileName, setCurrentFileNode, setTabs, setActiveTabId
  // ====================================================================
  useEffect(() => {
    const handler = (e: Event) => {
      const { oldPath, newPath, newName, newHandle } = (e as CustomEvent).detail;
      if (!oldPath || !newPath) return;

      const cleanOld = oldPath.replace(/[/\\]+$/, '');
      const cleanNew = newPath.replace(/[/\\]+$/, '');
      const normOld = cleanOld.replace(/\\/g, '/');
      const normNew = cleanNew.replace(/\\/g, '/');
      const normOldLower = normOld.toLowerCase();

      // 현재 열린 파일이 변경/이동된 파일이거나 변경된 폴더 하위에 있을 때
      setTabs(prev => {
        const updatedTabs = prev.map(t => {
          const rawPath = t.path || '';
          const cleanTabPath = rawPath.replace(/[/\\]+$/, '');
          const tabPath = cleanTabPath.replace(/\\/g, '/');
          const tabPathLower = tabPath.toLowerCase();

          if (tabPathLower === normOldLower) {
            // 정확히 이름 변경/이동된 파일
            const targetId = (t.id === t.path || t.id === oldPath || t.id.replace(/\\/g, '/').toLowerCase() === normOldLower) ? cleanNew : t.id;
            return {
              ...t,
              id: targetId,
              name: newName,
              path: cleanNew,
              node: { ...t.node, name: newName, path: cleanNew, ...(newHandle ? { handle: newHandle } : {}) }
            };
          } else if (tabPathLower.startsWith(normOldLower + '/')) {
            // 이름 변경/이동된 폴더의 하위 파일
            const subRel = tabPath.substring(normOld.length);
            const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && rawPath.includes('\\'));
            const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
            const updatedPath = `${cleanNew}${subRelFormatted}`;
            const targetId = (t.id === t.path || t.id.replace(/\\/g, '/').toLowerCase() === tabPathLower) ? updatedPath : t.id;
            return {
              ...t,
              id: targetId,
              path: updatedPath,
              node: { ...t.node, path: updatedPath }
            };
          }
          return t;
        });

        // 💡 tabsRef 및 로컬스토리지 onrivi_tabs_order 동기화
        tabsRef.current = updatedTabs;
        try {
          const tabOrders = updatedTabs.map(t => ({ id: t.id, name: t.name, path: t.path }));
          localStorage.setItem('onrivi_tabs_order', JSON.stringify(tabOrders));
        } catch (_) {}

        return updatedTabs;
      });

      // 활성 탭 식별자(activeTabId)도 함께 갱신
      const curActive = activeTabIdRef.current || '';
      if (curActive) {
        const cleanActive = curActive.replace(/[/\\]+$/, '');
        const normActive = cleanActive.replace(/\\/g, '/');
        const normActiveLower = normActive.toLowerCase();

        if (normActiveLower === normOldLower || cleanActive === cleanOld) {
          setActiveTabId(cleanNew);
          activeTabIdRef.current = cleanNew;
        } else if (normActiveLower.startsWith(normOldLower + '/')) {
          const subRel = normActive.substring(normOld.length);
          const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && curActive.includes('\\'));
          const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
          const updatedActive = `${cleanNew}${subRelFormatted}`;
          setActiveTabId(updatedActive);
          activeTabIdRef.current = updatedActive;
        }
      }

      // 현재 활성 파일(currentFileNode) 및 파일명 동시 갱신
      setCurrentFileNode(prev => {
        if (!prev) return prev;
        const curPath = (prev.path || '').replace(/[/\\]+$/, '');
        const normCur = curPath.replace(/\\/g, '/');
        const normCurLower = normCur.toLowerCase();

        if (normCurLower === normOldLower) {
          setCurrentFileName(newName);
          return { ...prev, name: newName, path: cleanNew, ...(newHandle ? { handle: newHandle } : {}) };
        } else if (normCurLower.startsWith(normOldLower + '/')) {
          const subRel = normCur.substring(normOld.length);
          const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && curPath.includes('\\'));
          const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
          const updatedPath = `${cleanNew}${subRelFormatted}`;
          return { ...prev, path: updatedPath };
        }
        return prev;
      });
    };
    window.addEventListener('file:tab-renamed', handler);
    return () => window.removeEventListener('file:tab-renamed', handler);
  }, [activeTabIdRef, setActiveTabId, setCurrentFileName, setCurrentFileNode, setTabs, tabsRef]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012c] MainEditorApp.tsx ➔ file:close-tab-by-path listener
  // 🎯 @KICK  : 탐색기에서 파일/폴더 삭제 시 해당 열린 탭을 즉시 닫고 에디터 정리
  // 🛡️ @GUARD : 삭제된 경로와 일치하거나 하위 경로에 속한 모든 탭 정리, 활성 탭 전환 또는 빈 탭 처리
  // 🚨 @PATCH : **2026-10-03** — [파일 삭제 시 열린 탭 자동 닫기 전면 강화]: driveId 일치, path 끝부분(endsWith) 매칭 및 name 일치 다중 검증 탑재
  // 🔗 @CALLS : setTabs, switchTab, setContent, setCurrentFileName, setCurrentFileNode, setActiveTabId
  // ====================================================================
  useEffect(() => {
    const handleCloseTabByPath = (e: Event) => {
      const { path, name, driveId, isDir } = (e as CustomEvent).detail || {};
      if (!path && !name && !driveId) return;

      const normTarget = (path || '').replace(/\\/g, '/').toLowerCase();
      const targetFileName = (name || (normTarget ? normTarget.split('/').pop() : '') || '').toLowerCase();
      const hasTargetSlash = normTarget.includes('/');

      // 🛡️ [동일 파일명 오종료 방어]: 삭제된 파일 또는 삭제된 폴더 하위에 속한 탭들만 엄격하게 필터링
      const tabsToClose = tabsRef.current.filter(t => {
        // 1. Google Drive 고유 ID 일치 확인 (가장 확실한 식별자)
        const tabDriveId = (t as any).driveFileId || (t as any).driveId || (t as any).id;
        if (driveId && tabDriveId && String(driveId) === String(tabDriveId)) {
          return true;
        }

        const tabPath = (t.path || '').replace(/\\/g, '/').toLowerCase();
        const hasTabSlash = tabPath.includes('/');

        // 2. 정확한 경로 일치 (파일 또는 폴더 경로가 100% 동일)
        if (normTarget && tabPath && tabPath === normTarget) {
          return true;
        }

        // 3. 폴더 삭제 시: 해당 폴더 하위에 속한 탭들 닫기
        if (normTarget && tabPath && (isDir || normTarget.endsWith('/'))) {
          const folderPrefix = normTarget.endsWith('/') ? normTarget : normTarget + '/';
          if (tabPath.startsWith(folderPrefix)) {
            return true;
          }
        }

        // 4. 경로 끝부분 매칭: 단, 양쪽 모두 디렉토리 경로 구분자(/)를 포함하고 있을 때만!
        // (예: 절대경로 D:/project/folderA/test.md vs 상대경로 folderA/test.md)
        // 🚨 단일 파일명(test.md)만으로 endsWith 매칭을 수행하면 다른 폴더의 동명 파일이 닫히므로 차단
        if (hasTargetSlash && hasTabSlash) {
          if (tabPath.endsWith('/' + normTarget) || normTarget.endsWith('/' + tabPath)) {
            return true;
          }
        }

        // 5. 경로가 양쪽 모두 완전히 없는(미저장 가상 파일 등) 경우에만 한하여 파일명 단독 비교
        if (!normTarget && !tabPath && targetFileName) {
          const tabName = (t.name || '').toLowerCase();
          if (tabName === targetFileName) {
            return true;
          }
        }

        // 그 외: 다른 경로에 있는 동일 파일명의 파일은 절대 닫지 않음!
        return false;
      });

      if (tabsToClose.length === 0) return;

      tabsToClose.forEach(tab => {
        if (tab.model) {
          try { tab.model.dispose(); } catch {}
        }
      });

      const closeIds = new Set(tabsToClose.map(t => t.id));
      const nextTabs = tabsRef.current.filter(t => !closeIds.has(t.id));
      tabsRef.current = nextTabs;
      setTabs(nextTabs);

      if (activeTabIdRef.current && closeIds.has(activeTabIdRef.current)) {
        if (nextTabs.length > 0) {
          switchTab(nextTabs[0].id);
        } else {
          setContent('');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
          setActiveTabId(null);
          if (editorRef.current) {
            editorRef.current.setValue('');
          }
        }
      }
    };
    window.addEventListener('file:close-tab-by-path', handleCloseTabByPath);
    return () => window.removeEventListener('file:close-tab-by-path', handleCloseTabByPath);
  }, [setTabs, switchTab, setContent, setCurrentFileName, setCurrentFileNode, setActiveTabId, activeTabIdRef, editorRef, tabsRef]);

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003] 지식 베이스 / 출처 링크 에디터 파일 열기 및 라인 점프 리스너
  useEffect(() => {
    const handleOpenFileAtLine = async (e: CustomEvent) => {
      const { filePath, startLine } = e.detail || {};
      if (!filePath && !startLine) return;

      if (previewModeRef.current === 'preview' && setPreviewModeRaw) {
        setPreviewModeRaw('both');
        previewModeRef.current = 'both';
        isEditorMountedRef.current = true;
        lastGeneralPreviewModeRef.current = 'both';
      }

      const normTarget = (filePath || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
      const targetBase = normTarget.split('/').pop() || '';
      const currentPath = (currentFileNode?.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
      const currentName = (currentFileName || '').toLowerCase().normalize('NFC');

      const isAlreadyActive = filePath && (
        currentPath === normTarget ||
        (currentPath && normTarget && currentPath.endsWith('/' + targetBase)) ||
        currentName === targetBase ||
        currentName === targetBase.replace(/\.md$/i, '')
      );

      if (isAlreadyActive && editorRef.current && startLine) {
        editorRef.current.revealPositionInCenter({ lineNumber: startLine, column: 1 }, 1);
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 });
        editorRef.current.focus();

        const lineEl = document.querySelector(`[data-line="${startLine}"]`) as HTMLElement;
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lineEl.classList.add('preview-highlight-line');
          setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
        }
        return;
      }

      if (filePath && handleFileOpenByPath) {
        const anchor = startLine ? `L${startLine}` : undefined;
        await handleFileOpenByPath(filePath, anchor);
      } else if (editorRef.current && startLine) {
        editorRef.current.revealPositionInCenter({ lineNumber: startLine, column: 1 }, 1);
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 });
        editorRef.current.focus();
      }
    };

    window.addEventListener('app:open-file-at-line', handleOpenFileAtLine as any);
    return () => window.removeEventListener('app:open-file-at-line', handleOpenFileAtLine as any);
  }, [handleFileOpenByPath, currentFileNode, currentFileName, setPreviewModeRaw, editorRef, isEditorMountedRef, lastGeneralPreviewModeRef, previewModeRef]);

  useEffect(()=>{
    const isInsideMarkdownPane=(target:EventTarget|null)=>target instanceof Element && Boolean(target.closest('#onrivi-markdown-pane'));
    const blockWheel=(event:WheelEvent)=>{
      if(previewModeRef.current==='both' && isInsideMarkdownPane(event.target)){event.preventDefault();event.stopImmediatePropagation();}
    };
    const blockMutationEvent=(event:Event)=>{
      if(previewModeRef.current==='both' && isInsideMarkdownPane(event.target)){event.preventDefault();event.stopImmediatePropagation();}
    };
    const blockKeyDown=(event:KeyboardEvent)=>{
      if(previewModeRef.current!=='both' || !isInsideMarkdownPane(event.target))return;
      const key=event.key;
      const lower=key.toLowerCase();
      const isAllowedShortcut=(event.ctrlKey || event.metaKey) && !event.altKey && (lower==='c' || lower==='a' || lower==='f' || lower==='s');
      const isAllowedNav=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Escape','Shift','Control','Alt','Meta'].includes(key);
      if(isAllowedShortcut || isAllowedNav)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener('wheel',blockWheel,{passive:false,capture:true});
    document.addEventListener('beforeinput',blockMutationEvent,true);
    document.addEventListener('paste',blockMutationEvent,true);
    document.addEventListener('cut',blockMutationEvent,true);
    document.addEventListener('drop',blockMutationEvent,true);
    document.addEventListener('keydown',blockKeyDown,true);
    const isPaneReadOnly = tabs.length === 0 || isRestrictedUser || previewMode === 'both';
    editorRef.current?.updateOptions({
      readOnly: isPaneReadOnly,
      domReadOnly: isPaneReadOnly,
      scrollbar:{vertical:previewMode==='both'?'hidden':'visible',horizontal:previewMode==='both'?'hidden':'auto',handleMouseWheel:previewMode!=='both'}
    });
    return()=>{
      document.removeEventListener('wheel',blockWheel,true);
      document.removeEventListener('beforeinput',blockMutationEvent,true);
      document.removeEventListener('paste',blockMutationEvent,true);
      document.removeEventListener('cut',blockMutationEvent,true);
      document.removeEventListener('drop',blockMutationEvent,true);
      document.removeEventListener('keydown',blockKeyDown,true);
    };
  },[previewMode,activeTabId,tabs.length,isRestrictedUser,editorRef,previewModeRef]);

  // 📊 [OMD-CORE-MainEditorApp-0032] MainEditorApp.tsx ➔ darkModeDOMClass
  // 🎯 @KICK  : Tailwind 다크 모드를 위해 documentElement에 'dark' 클래스 토글
  // 🛡️ @GUARD : SSR 불일치 방지를 위해 마운트 후에만 실행
  // 🚨 @PATCH : None
  // 🔗 @CALLS : document.documentElement.classList.add/remove
  // ====================================================================

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('dark');
  }, [mounted]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0033] MainEditorApp.tsx ➔ editorSettingsSync
  // 🎯 @KICK  : 설정 또는 에디터 마운트 변경 시 테마, 폰트 크기, 줄 바꿈 재적용
  // 🛡️ @GUARD : 레이스 컨디션 방지를 위해 mounted && isEditorReady로 가드
  // 🚨 @PATCH : 2026-06-23 — 라이선스 만료/제한 여부(isExpired) 변경 시 readOnly/domReadOnly 동기화 연동 추가
  // 🔗 @CALLS : monaco.editor.setTheme, editor.updateOptions, requestAnimationFrame
  // ====================================================================
  useEffect(() => {
    if (mounted && isEditorReady && editorRef.current) {
      // 1. 테마 및 고대비(High Contrast) 모드 강제 적용
      if ((window as any).monaco) {
        const monaco = (window as any).monaco;
        applySafeMarkdownMonarchTokenizer(monaco);
        EDITOR_THEMES.forEach(t => {
          const isDark = t.base === 'vs-dark';
          const defaultFg = isDark ? '#e2e8f0' : '#1e293b';
          const defaultPunctuation = isDark ? 'e2e8f0' : '1e293b';
          const activeFg = editorHighContrast ? (isDark ? '#ffffff' : '#000000') : defaultFg;
          const activePunctuation = editorHighContrast ? (isDark ? 'ffffff' : '000000') : defaultPunctuation;

          monaco.editor.defineTheme(t.id, {
            base: t.base,
            inherit: true,
            rules: [
              ...(t.rules || []),
              { token: 'punctuation', foreground: activePunctuation },
              { token: 'delimiter.markdown', foreground: editorHighContrast ? (isDark ? '38bdf8' : '1d4ed8') : '60a5fa', fontStyle: 'bold' },
              { token: 'string.link.markdown', foreground: isDark ? '94a3b8' : '64748b' },
              { token: 'variable.md', foreground: 'f59e0b' }
            ],
            colors: {
              ...t.colors,
              'editor.background': isDark ? '#0b1120' : '#eef2f6',
              'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
              'editor.foreground': activeFg,
              'editorLineNumber.foreground': isDark ? '#475569' : '#64748b',
              'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB',
              'editorCursor.foreground': '#38bdf8',
              'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
              'editorIndentGuide.background': '#88888815',
              'editorIndentGuide.activeBackground': '#88888830',
            }
          });
        });
        monaco.editor.setTheme(themePalette);
      }
      // 2. 에디터 옵션(폰트 크기, 글꼴 굵기, 줄 바꿈, 읽기 전용 여부) 강제 동기화
      const isPaneReadOnly = tabs.length === 0 || isRestrictedUser || previewMode === 'both';
      editorRef.current.updateOptions({
        fontSize: fontSize || 16,
        mouseWheelZoom: false,
        lineHeight: Math.round((fontSize || 16) * 1.75), // 글자 크기에 비례하는 동일 행간
        fontWeight: editorFontWeight === 'bold' ? '700' : editorFontWeight === 'semibold' ? '600' : editorFontWeight === 'medium' ? '500' : '400',
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
        padding: { top: 28, bottom: 28 },
        wordWrap: wordWrap,
        wrappingStrategy: 'advanced',
        wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
        wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',
        readOnly: isPaneReadOnly,
        domReadOnly: isPaneReadOnly,
        lineNumbers: 'off',
        lineNumbersMinChars: 0,
        lineDecorationsWidth: 8,
        glyphMargin: false,
        folding: false,
        cursorSmoothCaretAnimation: 'off',
        scrollbar: { verticalScrollbarSize: 16 },
      });
      // 3. 레이아웃 리플로우 강제 트리거 및 비동기 웹폰트 로딩 후 글자 폭 재계산 (핵심 버그 수정)
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
      document.fonts.ready.then(() => {
        if ((window as any).monaco) {
          (window as any).monaco.editor.remeasureFonts();
        }
      });
    }
  }, [themePalette, fontSize, wordWrap, editorFontWeight, editorHighContrast, mounted, isEditorReady, isRestrictedUser, previewMode, tabs.length, editorRef]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0034] MainEditorApp.tsx ➔ darkModePaletteSync
  // 🎯 @KICK  : 다크모드(isDarkMode)는 강제 비활성화되어 있으므로 자동 테마 전환을 수행하지 않음
  // 🛡️ @GUARD : 없음
  // 🚨 @PATCH : 2026-07-09 — 다크 테마가 isDarkMode=false여도 강제로 onrivi-light로 되돌려지던 버그 수정. effect를 무효화하여 사용자가 설정에서 선택한 테마를 유지하도록 변경.
  // 🔗 @CALLS : 없음
  // ====================================================================
  useEffect(() => {
    // isDarkMode는 항상 false로 고정되어 있으므로 아무 동작도 하지 않음
  }, []);

  // 💡 [Step 2 리팩토링으로 profilesSave, activeProfileSave, resolveEffectiveDocumentProfile, frontmatter 동기화는 useEditorProfiles로 이관됨]

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0041] MainEditorApp.tsx ➔ a4_guard_auto_save
  // 🎯 @KICK  : isA4GuardEnabled 가드 상태가 변경될 때마다 localStorage에 즉시 보존.
  // 🛡️ @GUARD : Electron 및 일반 브라우저 환경 지원
  // 🚨 @PATCH : **2026-08-12** — 초기 생성 (A4 가드 레이아웃 보존 기능)
  // 🔗 @CALLS : 없음
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isA4GuardEnabled', String(isA4GuardEnabled));
    }
  }, [isA4GuardEnabled]);



  // 💡 [Step 2 리팩토링으로 handleProfileChange, 제목 넘버링, 가로형 그림책 레거시 프로필 동기화는 useEditorProfiles로 이관됨]

  // 🟢 [권한 기반 초기 화면 제어: 웰컴 탭 영구 잠금 및 강제 노출 로직 2026-07-05]
  const prevRestrictedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted || isLicenseChecking) return;

    // 제한 사용자 조건: 사용 기간 만료 혹은 웹에서 동시 접속을 초과하여 인증을 상실한 경우, 또는 다중 탭 실행 시
    const isRestrictedUser = isDuplicateInstance ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자');

    if (prevRestrictedRef.current === isRestrictedUser) return;
    prevRestrictedRef.current = isRestrictedUser;

    if (isRestrictedUser) {
      if (previewModeRef.current !== 'preview') {
        lastGeneralPreviewModeRef.current = previewModeRef.current;
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    } else {
      const restored = lastGeneralPreviewModeRef.current || 'preview';
      if (previewModeRef.current !== restored) {
        setPreviewModeRaw(restored);
        previewModeRef.current = restored;
      }
    }

    setTabs(prev => {
      const hasWelcome = prev.some(t => t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab);
      if (!hasWelcome) return prev;
      const cleaned = prev.filter(t => !(t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab));
      if (cleaned.length === 0) {
        setActiveTabId(null);
        setContent(localStorage.getItem('onrivi_content') || '');
        setCurrentFileName('새 파일.md');
        setCurrentFileNode(null);
      }
      return cleaned;
    });
  }, [mounted, isLicenseChecking, isDuplicateInstance, effectiveLicenseStatus, lastGeneralPreviewModeRef, previewModeRef, setActiveTabId, setContent, setCurrentFileName, setCurrentFileNode, setPreviewModeRaw, setTabs]);

  // 📊 [OMD-EDIT-MainEditorApp-0040] MainEditorApp.tsx ➔ dynamicTitleBar
  // 🎯 @KICK  : document.title을 'Onrivi Author'로 고정 (탭 UI가 파일명 표시하므로)
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : 2026-06-22 — 파일명 제거, 'Onrivi Author'만 표시 (탭으로 대체)
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Onrivi Author';
    }
  }, []);

  // 💡 [OMD-CORE-MainEditorApp-0041] previewHighlightLine 훅은 processedContent 선언 이후(Line 4870)로 이동되었습니다 (TDZ 방어).
  // 💡 [OMD-SYNC-DEPRECATED] 스크롤 동기화 및 휠 차단 로직은 Monaco Setup 내부 단일 리스너(onDidScrollChange)로 완전히 마이그레이션되어 이곳의 중복 훅은 삭제되었습니다.

  /**
   * ========================================================================================
   * [함수명] handleMouseMove - 사이드바 크기 조정 드래그 시 너비(150px~600px)를 계산하여 반영합니다.
   *
   * @param {MouseEvent} e - 마우스 이동 이벤트
   * @returns {void}
   * ==========================================================================================
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 600) {
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ========================================================================================
   * [함수명] stopResizing - 사이드바 크기 조정을 종료하고 전역 마우스 리스너 및 커서를 복원합니다.
   *
   * @returns {void}
   * ==========================================================================================
   */
  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, [handleMouseMove, isResizing]);

  /**
   * ========================================================================================
   * [함수명] startResizing - 사이드바 크기 조정 드래그를 시작하고 전역 마우스 리스너를 등록합니다.
   *
   * @param {React.MouseEvent} e - 마우스 다운 이벤트
   * @returns {void}
   * ==========================================================================================
   */
  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, stopResizing, isResizing]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0046] MainEditorApp.tsx ➔ tabModeSync
  // 🎯 @KICK  : 탭 전환 시 도움말은 미리보기 전용으로 강제하고 일반 문서는 직전의 전역 에디터 모드로 복구 동기화
  // 🛡️ @GUARD : 라이선스 만료 시 preview 모드로 가드
  // 🚨 @PATCH : 2026-07-04 — 신규 추가
  // 🔗 @CALLS : setPreviewModeRaw
  // ====================================================================
  useEffect(() => {
    if (!mounted || !activeTabId) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    if (activeTab.name === '도움말.md') {
      // 💡 1. 도움말 탭은 예외없이 무조건 미리보기 전용('preview') 고정
      if (previewModeRef.current !== 'preview') {
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    } else if (activeTab.isStyleTab === true) {
      // 💡 2. 서식설정 전용 탭: 모드 전환 없이 현재 모드 유지 (CssStyleForm은 Ctrl+Shift+S로만 토글)
    } else {
      // 💡 3. 그 외 일반 마크다운 문서들은 전역으로 공유되는 마크다운 보기 모드를 그대로 상속 및 유지
      const target = isRestrictedUser ? 'preview' : lastGeneralPreviewModeRef.current;
      if (previewModeRef.current !== target) {
        setPreviewModeRaw(target);
        previewModeRef.current = target;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, mounted, isRestrictedUser, helpContent]);
  // 🟢 [권한 기반 초기 화면 제어: 웰컴 탭 차단 및 강제 노출 로직 2026-07-05]
  // 초기 로딩 후 제한 사용자인지 판단하여 웰컴 페이지를 남기거나, 일반 사용자면 지웁니다.
  const hasHandledWelcomeRef = useRef(false);

  useEffect(() => {
    if (!mounted || isLicenseChecking || hasHandledWelcomeRef.current || sessionRestoringRef.current) return;

    console.log('[WELCOME#2] FIRED! isExpired=%o planName=%o tabsRef=%o', effectiveLicenseStatus.isExpired, effectiveLicenseStatus.planName, tabsRef.current.map((t: any) => t.name));

    // 이펙트를 단 한 번만 실행하여 다른 컴포넌트나 훅이 웰컴탭을 덮어쓰거나 무한루프 도는 것을 원천 방지
    hasHandledWelcomeRef.current = true;

    // 제한 사용자 조건: 사용 기간 만료 혹은 웹에서 동시 접속을 초과하여 인증을 상실한 경우 (undefined 방어를 위해 Optional Chaining 추가), 또는 다중 탭 중복 실행 시
    const isRestrictedUser = isDuplicateInstance ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자');

    // tabs 상태값 대신 refs로 현재 상황을 안전하게 스냅샷
    const hasWelcome = tabsRef.current.some(t => t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab);

      // 1. [정상/전체 사용자]: 웰컴 페이지 강제 삭제 (빈 문서 시작)
      if (hasWelcome) {
        const cleaned = tabsRef.current.filter(t => !(t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab));
        setTabs(cleaned);
        if (cleaned.length === 0) {
          setActiveTabId(null);
          // 시작 페이지 없이(Empty) 시작하도록 요청됨 -> 로컬 스토리지에 남아있는 게 있다면 복원하거나 빈 문자열.
          const localDraft = localStorage.getItem('onrivi_content');
          setContent(localDraft || '');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
        }
    }
  }, [mounted, isLicenseChecking, isDuplicateInstance, effectiveLicenseStatus, sessionRestoringRef, setActiveTabId, setContent, setCurrentFileName, setCurrentFileNode, setTabs, tabsRef]);
  useEffect(() => {
    if (currentFileNode && activeTabId) {
      if (prevActiveTabRef.current !== activeTabId) {
        prevActiveTabRef.current = activeTabId;
          const activeTab = tabsRef.current.find(t => t.id === activeTabId);
          if (!activeTab?.isModified) lastSavedContentRef.current = content;
          setSaveStatus(activeTab?.isModified ? 'unsaved' : 'saved');
          return;
      }
      const isUnsaved = content !== lastSavedContentRef.current;
      setSaveStatus(isUnsaved ? 'unsaved' : 'saved');
      setTabs(prev => {
        const cur = prev.find(t => t.id === activeTabId);
        if (cur && cur.isModified === isUnsaved) return prev;
        return prev.map(t =>
          t.id === activeTabId
            ? { ...t, isModified: isUnsaved }
            : t
        );
      });
    }
  }, [content, currentFileNode, activeTabId, lastSavedContentRef, prevActiveTabRef, setSaveStatus, setTabs, tabsRef]);

  // 💡 [탭 전환 시 에디터 기준 미리보기 1:1 완벽 동기화 보장]
  useEffect(() => {
    if (!activeTabId || previewMode !== 'both' || !previewRef.current || !editorRef.current) return;

    // 탭 전환 시 직전 커서 라인 캐시 리셋 (마우스/방향키 이동 즉시 반응 보장)
    prevCursorLineRef.current = null;

    const performSync = () => {
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview || preview.querySelector('.visual-document-editor')) return;

      const editorTop = editor.getScrollTop?.() ?? 0;
      const pos = editor.getPosition?.();
      if (editorTop <= 2 && (!pos || pos.lineNumber <= 1)) {
        if (preview.scrollTop !== 0) {
          preview.scrollTop = 0;
        }
        return;
      }

      const currentContent = editor.getValue?.() || content;
      if (pos && pos.lineNumber > 1) {
        syncPreviewToTargetLine(preview, pos.lineNumber, currentContent);
      } else {
        syncPreviewFromEditorScroll(preview, editor, currentContent);
      }
    };

    // DOM 렌더링 완료 타이밍에 맞춰 보장 실행
    requestAnimationFrame(performSync);
    const t1 = setTimeout(performSync, 80);

    return () => {
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, previewMode]);
  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0047] MainEditorApp.tsx ➔ autoSave
  // 🎯 @KICK  : 콘텐츠 변경 및 autoSave 활성화 시 5초 디바운스 후 파일 자동 저장
  // 🛡️ @GUARD : 콘텐츠가 비어있거나, 미리보기 모드가 변경 중이거나, 콘텐츠가 변경되지 않았으면 건너뜀; 5초 디바운스 정리
  // 🚨 @PATCH : **2026-10-19** — [5초 자동저장 무한 루프 척결 및 텍스트 덮어쓰기 방어]:
  //             1) 자동 저장 중 불필요한 Frontmatter 강제 주입(updateCssProfileInFrontmatter) 및 setContent/model.pushEditOperations 호출 전면 배제 (백그라운드 물리 디스크 저장 전담)
  //             2) 저장 시작 직후 lastSavedContentRef 즉시 갱신 및 setTabs 불필요한 배열 재생성 가드로 무한 루프 및 텍스트 덮어쓰기 원천 차단
  //             3) autoSave useEffect 내 setCurrentFileNode 직접 호출을 배제하여 React 렌더링 무한 루프 종식
  // 🔗 @CALLS : saveFile, setSaveStatus, setTimeout, clearTimeout
  // ====================================================================
  useEffect(() => {
    // 🌟 [세이프티 가드 1]: 원고 본문이 비어있거나 데이터가 초기화되기 전 상태라면 
    // 시스템 오염 저장을 원천 차단합니다.
    if (!content || content.trim() === "") {
      return;
    }

    const activeTab = tabsRef.current?.find(t => t.id === activeTabIdRef.current);
    const effectiveFileNode = activeTab ? (activeTab.node || (activeTab.path ? { name: activeTab.name, path: activeTab.path, kind: 'file' } : null)) : currentFileNode;

    // Bundled help has no writable target until the user saves a copy.
    if (activeTab?.isBundledHelp || isBundledDocumentPath(effectiveFileNode?.path)) return;

    // 🌟 [세이프티 가드 2]: 유저가 뷰 모드(분할/에디터/프리뷰)를 변환하는 찰나의 순간에는 
    // 컴포넌트 오염 타이밍이므로 자동 저장을 생략하고 무조건 대기시킵니다.
    if (typeof autoSave === 'number' && autoSave > 0 && effectiveFileNode && licenseStatus.isActivated) {
      if (content === lastSavedContentRef.current) return;

      setSaveStatus('saving');
      const savingTabId = activeTab?.id;
      const timer = setTimeout(async () => {
        if (savingTabId && activeTabIdRef.current !== savingTabId) return;
        const saveContent = content;
        const success = await saveFile(saveContent, effectiveFileNode);
        setSaveStatus(success ? 'saved' : 'unsaved');
        if (success) {
          lastSavedContentRef.current = saveContent;
          console.log(`✏️ [Onrivi Guard] 자동 저장 완료 (${autoSave}초)`);
          // 자동 저장 후 현재 탭의 isModified 상태를 false로 복구 (불필요한 re-render 방어)
          setTabs(prev => {
            const currentTab = prev.find(t => t.id === activeTabIdRef.current);
            if (!currentTab || (!currentTab.isModified && currentTab.content === saveContent)) return prev;
            return prev.map(t =>
              t.id === activeTabIdRef.current ? { ...t, isModified: false, content: saveContent } : t
            );
          });
        } else {
          lastSavedContentRef.current = '';
        }
      }, autoSave * 1000); // 🕒 설정된 초(seconds) 기반 디바운스
      return () => clearTimeout(timer);
    }
  }, [content, autoSave, currentFileNode, saveFile, licenseStatus.isActivated, currentFileName, activeTabIdRef, lastSavedContentRef, setSaveStatus, setTabs, tabsRef]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0074] MainEditorApp.tsx ➔ toc
  // 🎯 @KICK  : 마크다운 제목에서 목차를 생성하고 코드 블록은 건너뜁니다
  // 🛡️ @GUARD : BOM 문자를 제거하고 코드 블록 펜스를 감지하여 오탐을 방지합니다
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const toc = useMemo(() => {
    if (typeof content !== 'string') return [];
    // 윈도우 스타일의 개행(\r\n)과 일반 개행(\n) 모두를 안전하게 분리
    const lines = content.split(/\r?\n/);
    const items: { id: string, text: string, level: number, lineNumber: number }[] = [];
    const codeBlockMask = getCodeBlockLineMask(lines);
    const headingNumber = createHeadingNumberer(activeProfileId === 'default' ? [] : (profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE).headingNumbering);
    lines.forEach((line, index) => {
      if (codeBlockMask[index]) return;
      const trimmed = line.trim();

      // UTF-8 BOM(\ufeff)을 제거하고, 양쪽 공백이 정리된 깨끗한 텍스트로 헤더를 매칭
      const cleanLine = trimmed.replace(/^\ufeff/, '');
      const match = cleanLine.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
          let text = match[2].trim();
          
          // 💡 개요(TOC)에서 마크다운 태그가 그대로 노출되는 현상 방지
          text = text.replace(/\*\*(.*?)\*\*/g, '$1') // 굵게 **
                     .replace(/__(.*?)__/g, '$1') // 굵게 __
                     .replace(/\*(.*?)\*/g, '$1') // 기울임 *
                     .replace(/_(.*?)_/g, '$1') // 기울임 _
                     .replace(/~~(.*?)~~/g, '$1') // 취소선 ~~
                     .replace(/`(.*?)`/g, '$1') // 인라인 코드
                     .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 링크 [텍스트](URL) -> 텍스트
                     .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // 이미지 ![텍스트](URL) -> 텍스트
                     .replace(/<[^>]*>?/gm, ''); // HTML 태그 제거
                     
          const marker = headingNumber(level, text);
          if (marker) text = marker + ' ' + text;
          const lineNumber = index + 1;
        items.push({
          id: `toc-line-${lineNumber}`,
          text,
          level,
          lineNumber
        });
      }
    });
    return items;
  }, [content, profiles, activeProfileId]);

  return {
    toc,
    handleMouseMove,
    stopResizing,
    startResizing,
  };
}
