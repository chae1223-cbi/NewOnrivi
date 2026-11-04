// ====================================================================
// 📊 [OMD-HOOK-useFileExplorer-0001] useFileExplorer.ts ➔ 워크스페이스 파일 탐색 통합 파사드 훅
// 🎯 @KICK  : useDriveSync, useLocalVfs, useDocumentOpener 서브 훅들을 조율하고 일관된 단일 I/O 인터페이스 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리)에 따라 2,590줄의 거대 훅을 3대 도메인 서브 훅으로 전면 모듈화 분리하고 기존 API 계약 100% 보존
// 🚨 @PATCH : 2026-11-04 — [런타임 버그 수정]: useLocalVfs에 setIsDriveAuthExpired, setIsDriveConnected, setCurrentFileNode, currentFileName, currentFileParentHandleRef, setActiveTabId, setContent 전달 및 useDocumentOpener에 sessionRestoringRef 전달
// 🚨 @PATCH : 2026-11-04 — [useFileExplorer 2,590줄 ➔ 3대 도메인 서브 훅 모듈화 분리]:
//             1) 구글 드라이브 동기화 ➔ useDriveSync.ts (~400줄)
//             2) 문서 열기 및 경로 점프 ➔ useDocumentOpener.ts (~1,300줄)
//             3) 로컬 VFS 및 물리 저장 ➔ useLocalVfs.ts (~850줄)
//             4) useFileExplorer.ts는 상위 조합 및 이벤트 리스너 골격만 유지하는 슬림 파사드 훅으로 경량화 (Rule 3 준수)
// 🔗 @CALLS : useDriveSync, useLocalVfs, useDocumentOpener
// ====================================================================
// @ts-nocheck
import { useCallback, useRef, useEffect } from 'react';
import { useDriveSync } from '@/hooks/fileExplorer/useDriveSync';
import { useDocumentOpener } from '@/hooks/fileExplorer/useDocumentOpener';
import { useLocalVfs } from '@/hooks/fileExplorer/useLocalVfs';

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
  useEffect(() => {
    rootFolderRef.current = rootFolder;
  }, [rootFolder]);

  const localEnvironmentRef = useRef<any>(null);
  const driveEnvironmentRef = useRef<any>(null);
  const storageSwitchRef = useRef(false);

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

  // 4. 전역 새로고침 이벤트 및 워크스페이스 감시자 등록
  useEffect(() => {
    let unwatchElectron: (() => void) | null = null;
    let focusTimer: any = null;

    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (rootFolder && api && workspaceType === 'local') {
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
  }, [rootFolder, refreshFileList, setFileList, workspaceType]);

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
