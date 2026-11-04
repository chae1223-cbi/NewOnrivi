// ====================================================================
// 📊 [OMD-HOOK-useFileExplorer-0001] frontend/src/hooks/useFileExplorer.ts
// 🎯 @KICK  : useDriveSync, useLocalVfs, useDocumentOpener 서브 훅들을 조율하고 일관된 단일 I/O 인터페이스 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리)에 따라 2,590줄의 거대 훅을 3대 도메인 서브 훅으로 전면 모듈화 분리하고 기존 API 계약 100% 보존
// 🚨 @PATCH : 2026-11-04 — [주석 표준화]: onrivi-source-comments 2단계 표준 양식(파일 헤더 및 내부 함수 JSDoc 구분선) 전면 반영
// 🚨 @PATCH : 2026-11-04 — [에디터 실행 시 로컬/클라우드 탐색기 자동 리프레시 복원]: rootFolder 연결/복원 시 refreshFileList(true) 즉시 호출, 작업장 절대경로(onrivi_workspace_path) 자동 보강 및 사이드바 자동 표시 연동
// 🚨 @PATCH : 2026-11-04 — [런타임 버그 수정]: useLocalVfs에 setIsDriveAuthExpired, setIsDriveConnected, setCurrentFileNode, currentFileName, currentFileParentHandleRef, setActiveTabId, setContent 전달 및 useDocumentOpener에 sessionRestoringRef 전달
// 🚨 @PATCH : 2026-11-04 — [useFileExplorer 2,590줄 ➔ 3대 도메인 서브 훅 모듈화 분리]:
//             1) 구글 드라이브 동기화 ➔ useDriveSync.ts
//             2) 문서 열기 및 경로 점프 ➔ useDocumentOpener.ts
//             3) 로컬 VFS 및 물리 저장 ➔ useLocalVfs.ts
//             4) useFileExplorer.ts는 상위 조합 및 이벤트 리스너 골격만 유지하는 슬림 파사드 훅으로 경량화 (Rule 3 준수)
// 🔗 @CALLS : useDriveSync, useLocalVfs, useDocumentOpener
// ====================================================================
// @ts-nocheck
import { useCallback, useRef, useEffect } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { isAbsolutePath } from '@/lib/knowledge/pathResolver';
import { useDriveSync } from '@/hooks/fileExplorer/useDriveSync';
import { useDocumentOpener } from '@/hooks/fileExplorer/useDocumentOpener';
import { useLocalVfs } from '@/hooks/fileExplorer/useLocalVfs';

/**
 * ========================================================================================
 * [함수명] useFileExplorer - 워크스페이스 파일 탐색·저장·열기·클라우드 동기화 통합 파사드 훅
 *
 * @param {object} params - 에디터 참조, 탭 상태, 워크스페이스 상태 및 모달/토스트 제어 콜백
 * @returns {object} refreshFileList, selectRootFolder, restoreFolderPermission, handleFileOpenByPath, handleFileClick, saveFile, connectGoogleDrive, disconnectGoogleDrive, isDriveAuthExpired, isDriveConnected
 *
 * @example
 * const { refreshFileList, handleFileClick, saveFile } = useFileExplorer({ editorRef, contentRef, ... });
 * ==========================================================================================
 */
export const useFileExplorer = ({
  editorRef,
  contentRef,
  currentFileNode,
  currentFileName,
  lastSavedContentRef,
  currentFileParentHandleRef,
  tabsRef,
  isSearchOpen,
  activeTabIdRef,
  setContent,
  setCurrentFileName,
  setCurrentFileNode,
  setTabs,
  setActiveTabId,
  setSaveStatus,
  setIsSidebarOpen,
  setIsSearchOpen,
  setHelpContent,
  setHelpTitle,
  setPreviewModeRaw,
  previewModeRef,
  isEditorMountedRef,
  showToast,
  createNewTab,
  switchTab,
  rootFolder,
  setRootFolder,
  fileList,
  setFileList,
  workspaceType,
  setWorkspaceType,
  licenseStatus,
  sessionRestoringRef,
  setConfirmConfig
}: any) => {

  const isRestrictedUser = licenseStatus?.isExpired ||
    licenseStatus?.isRestricted ||
    licenseStatus?.planName?.includes('미인증') ||
    licenseStatus?.planName?.includes('제한사용자');

  const rootFolderRef = useRef<any>(rootFolder);
  rootFolderRef.current = rootFolder;
  useEffect(() => {
    rootFolderRef.current = rootFolder;
  }, [rootFolder]);

  const localEnvironmentRef = useRef<any>(null);
  const driveEnvironmentRef = useRef<any>(null);
  const storageSwitchRef = useRef(false);

  /**
   * ========================================================================================
   * [함수명] captureEnvironment - 로컬↔클라우드 작업장 전환 전 현재 열린 탭·콘텐츠·폴더 스냅샷을 캡처합니다.
   *
   * @returns {object} 루트 폴더, 탭 목록, 활성 탭 ID, 본문 및 파일 노드 스냅샷 객체
   * ==========================================================================================
   */
  const captureEnvironment = useCallback(() => ({
    root: rootFolderRef.current,
    tabs: tabsRef.current.map(t => ({
      ...t,
      content: t.id === activeTabIdRef?.current ? contentRef.current : t.content,
    })),
    activeId: activeTabIdRef?.current,
    content: contentRef.current,
    fileNode: currentFileNode,
    fileName: currentFileName,
    parentHandle: currentFileParentHandleRef.current,
    savedContent: lastSavedContentRef.current,
  }), [tabsRef, activeTabIdRef, contentRef, currentFileNode, currentFileName, currentFileParentHandleRef, lastSavedContentRef]);

  /**
   * ========================================================================================
   * [함수명] restoreEnvironment - 저장된 작업장 환경 스냅샷으로부터 탭·활성 문서·본문 상태를 복원합니다.
   *
   * @param {any} environment - captureEnvironment로 저장된 스냅샷 객체
   * @returns {void}
   * ==========================================================================================
   */
  const restoreEnvironment = useCallback((environment: any) => {
    const tabs = environment?.tabs || [];
    tabsRef.current = tabs;
    if (activeTabIdRef) activeTabIdRef.current = environment?.activeId || null;
    contentRef.current = environment?.content || '';
    lastSavedContentRef.current = environment?.savedContent || '';
    if (currentFileParentHandleRef) currentFileParentHandleRef.current = environment?.parentHandle || null;
    setTabs(tabs);
    setActiveTabId(environment?.activeId || null);
    setContent(environment?.content || '');
    setCurrentFileName(environment?.fileName || '');
    setCurrentFileNode(environment?.fileNode || null);
  }, [tabsRef, activeTabIdRef, contentRef, lastSavedContentRef, currentFileParentHandleRef, setTabs, setActiveTabId, setContent, setCurrentFileName, setCurrentFileNode]);

  // 1. 구글 드라이브 동기화 서브 훅 연동
  const {
    isDriveAuthExpired,
    setIsDriveAuthExpired,
    isDriveConnected,
    setIsDriveConnected,
    connectGoogleDrive,
    disconnectGoogleDrive
  } = useDriveSync({
    rootFolderRef,
    setRootFolder,
    workspaceType,
    setWorkspaceType,
    setFileList,
    setIsSidebarOpen,
    showToast,
    tabsRef,
    setTabs,
    activeTabIdRef,
    contentRef,
    lastSavedContentRef,
    setSaveStatus,
    captureEnvironment,
    restoreEnvironment,
    localEnvironmentRef,
    driveEnvironmentRef,
    storageSwitchRef
  });

  // 2. 로컬 VFS 및 파일 저장/스캔 서브 훅 연동
  const {
    refreshFileList,
    selectRootFolder,
    restoreFolderPermission,
    saveFile
  } = useLocalVfs({
    rootFolder,
    setRootFolder,
    rootFolderRef,
    fileList,
    setFileList,
    workspaceType,
    setWorkspaceType,
    tabsRef,
    setTabs,
    activeTabIdRef,
    contentRef,
    lastSavedContentRef,
    setSaveStatus,
    setIsSidebarOpen,
    showToast,
    connectGoogleDrive,
    setIsDriveAuthExpired,
    setIsDriveConnected,
    currentFileNode,
    setCurrentFileNode,
    currentFileName,
    setCurrentFileName,
    currentFileParentHandleRef,
    setActiveTabId,
    setContent,
  });

  // 3. 문서 오픈 및 경로 탐색 서브 훅 연동
  const {
    handleFileOpenByPath,
    handleFileClick
  } = useDocumentOpener({
    editorRef,
    contentRef,
    currentFileNode,
    currentFileName,
    lastSavedContentRef,
    currentFileParentHandleRef,
    tabsRef,
    isSearchOpen,
    activeTabIdRef,
    setContent,
    setCurrentFileName,
    setCurrentFileNode,
    setTabs,
    setActiveTabId,
    setSaveStatus,
    setIsSidebarOpen,
    setIsSearchOpen,
    setHelpContent,
    setHelpTitle,
    setPreviewModeRaw,
    previewModeRef,
    isEditorMountedRef,
    showToast,
    createNewTab,
    switchTab,
    rootFolder,
    rootFolderRef,
    fileList,
    workspaceType,
    licenseStatus,
    isRestrictedUser,
    sessionRestoringRef,
  });

  // 4. 전역 새로고침 이벤트 및 워크스페이스 감시자 등록 (에디터 실행 및 폴더 연결 시 탐색기 자동 리프레시)
  useEffect(() => {
    let unwatchElectron: (() => void) | null = null;
    let focusTimer: any = null;

    if (rootFolder) {
      // 로컬스토리지 내 작업장 절대경로 자동 보강 (지식문서 하이라이트 직결용)
      try {
        const savedWs = localStorage.getItem('onrivi_workspace_path');
        if (!savedWs || !isAbsolutePath(savedWs.replace(/\\/g, '/'))) {
          const folderName = rootFolder.path || rootFolder.name || '';
          if (folderName && isAbsolutePath(folderName.replace(/\\/g, '/'))) {
            localStorage.setItem('onrivi_workspace_path', folderName.replace(/\\/g, '/'));
          } else if (folderName && folderName !== 'browser-storage') {
            const webBase = (localStorage.getItem('onrivi_web_base_path') || '').replace(/\\/g, '/').replace(/\/+$/, '');
            const targetFolder = folderName.replace(/\\/g, '/').split('/').pop() || folderName;
            if (webBase && isAbsolutePath(webBase)) {
              const combined = `${webBase}/${targetFolder}`;
              localStorage.setItem('onrivi_workspace_path', combined);
            }
          }
        }
      } catch {}

      // 에디터 시작 또는 로컬/클라우드 드라이브 연결 복원 시 사이드바 열기 및 탐색기 즉시 강제 리프레시
      setIsSidebarOpen?.(true);
      refreshFileList(true);

      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api && workspaceType === 'local') {
        const targetWatchPath = rootFolder.path || rootFolder.name;
        if (targetWatchPath && api.watchWorkspace) {
          api.watchWorkspace(targetWatchPath);
          unwatchElectron = api.onWorkspaceChanged?.(() => {
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
              refreshFileList();
            }, 80);
          });
        }
      }
    } else {
      setFileList([]);
    }

    const handleGlobalRefresh = (e?: Event) => {
      const isForce = (e as CustomEvent)?.detail?.force === true;
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        refreshFileList(isForce);
      }, 50);
    };
    window.addEventListener('file:refresh-all-directories', handleGlobalRefresh);

    const handleFocusRefresh = () => {
      if (rootFolder) {
        if (focusTimer) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
          refreshFileList();
        }, 400);
      }
    };
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      if (unwatchElectron) unwatchElectron();
      if (focusTimer) clearTimeout(focusTimer);
      window.removeEventListener('file:refresh-all-directories', handleGlobalRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, [rootFolder, refreshFileList, setFileList, setIsSidebarOpen, workspaceType]);

  return {
    refreshFileList,
    selectRootFolder,
    restoreFolderPermission,
    handleFileOpenByPath,
    handleFileClick,
    saveFile,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveAuthExpired,
    isDriveConnected
  };
};
