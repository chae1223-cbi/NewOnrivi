/**
 * ====================================================================
 * 🏷️ 파일명 : FileExplorerPanel.tsx
 * 🎭 역할(Role) : Core (핵심 도메인 뷰 — 좌측 사이드바 파일 탐색기 패널)
 * 🎯 주요기능 : 워크스페이스 폴더 트리 탐색, 루트 파일/폴더 생성, 지연 로딩 및 하위 훅/컨텍스트 메뉴 위임
 * 🚨 @PATCH : 2026-11-12 — [구글 드라이브 탐색기 새로고침 최적화]:
 *             1) triggerRefreshRoot 시 구글 드라이브 단기 캐시(clearDriveChildrenCache) 소거 및 강제 갱신 연동
 *             2) 사이드바 활성화 시 자동 리프레시를 비강제(false)로 전환하여 불필요한 중복 스캔 제거
 * 🚨 @PATCH : 2026-11-04 — [1순위 모듈화 분리 및 누락 임포트 복원]:
 *             1) 2,945줄이던 단일 패널에서 클립보드·되돌리기·루트 드래그앤드롭을 `useExplorerUndoClipboard.ts`로, 외부 문서 가져오기를 `useDocumentImporter.ts`로, 루트 컨텍스트 메뉴 및 가져오기 오버레이를 `ExplorerRootContextMenu.tsx`로 분리
 *             2) `knowledgeClient` 명시적 임포트를 복원하고 1·2단계 표준 주석 및 `logError`/`logWarn` 진단 규격 적용
 * 🚨 @PATCH : 2026-11-04 — [에디터 실행 시 탐색기 패널 자동 리프레시 보강 & 주석/에러 표준화]
 *             1) 로컬/클라우드 드라이브(rootFolder) 연결 상태에서 탐색기 활성화 시 refreshFileList(true) 자동 실행 보장
 *             2) 1·2단계 표준 주석 및 모든 파일/폴더/가져오기 예외 경로에 logError/logWarn 적용 (규칙 3 Core 역할 준수)
 * 🚨 @PATCH : 2026-11-04 — [LeftSidebar 모듈화 분리] LeftSidebar에서 파일 탐색기 트리, 워크스페이스 바, 파일/폴더 CRUD 및 컨텍스트 메뉴, 가져오기 로직을 독립 패널 컴포넌트로 분리
 * ====================================================================
 */
// @ts-nocheck
"use client";

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings } from '@/lib/resourceSettings';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileTreeItem from '@/components/FileTreeItem';
import { FileNode } from '@/lib/indexedDbHelper';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import PromptModal from '@/components/PromptModal';
import { Icon } from '@/components/icons/Icon';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import { msg } from '@/lib/systemMessages';
import { useUIStore } from '@/store/useUIStore';
import { useEditorContext } from '@/context/EditorContext';
import { hasValidDriveToken } from '@/lib/gdrive/googleDriveClient';
import { knowledgeClient, canAccessKnowledgeDb } from '@/lib/knowledge/knowledgeClient';
import { useExplorerUndoClipboard } from '@/hooks/fileExplorer/useExplorerUndoClipboard';
import { useDocumentImporter } from '@/hooks/fileExplorer/useDocumentImporter';
import ExplorerRootContextMenu, { ExplorerImportOverlays } from '@/components/sidebar/explorer/ExplorerRootContextMenu';

const BROWSER_STORAGE_NAME = '브라우저 로컬 저장소';

interface FileExplorerPanelProps {
  isActive: boolean;
  isDarkMode: boolean;
}

/**
 * ========================================================================================
 * [컴포넌트명] FileExplorerPanel - 좌측 사이드바 워크스페이스 파일 탐색기 패널
 *
 * @param {FileExplorerPanelProps} props - 탭 활성화 여부(isActive) 및 다크모드 상태(isDarkMode)
 * @returns {JSX.Element} 파일 탐색기 패널 뷰
 * ==========================================================================================
 */
export default function FileExplorerPanel({ isActive, isDarkMode }: FileExplorerPanelProps) {
  const {
    currentFileName,
    showToast, fileList, rootFolder, resourceFolder, resourceFolderHandle, workspaceType,
    openFile, currentFileNode, refreshFileList, openTabPaths = [],
    askConfirm, isMergeMode = false, selectedMergeNodes = [],
    toggleMergeNodeSelect, onOpenMergeModal,
    onSelectRootFolder, onRestoreFolder, previewMode, setPreviewMode,
    licenseStatus,
    setIsMergeMode, setSelectedMergeNodes,
    geminiApiKey,
    connectGoogleDrive, disconnectGoogleDrive,
    isDriveAuthExpired
  } = useEditorContext();

  const [isReconnectingDrive, setIsReconnectingDrive] = useState(false);
  const isGdriveAuthNeeded = rootFolder?.type === 'GDRIVE' && (isDriveAuthExpired || !hasValidDriveToken());

  const handleReconnectDrive = async () => {
    if (isReconnectingDrive) return;
    setIsReconnectingDrive(true);
    try {
      if (connectGoogleDrive) {
        await connectGoogleDrive(false);
      }
    } catch (err: any) {
      logError({
        file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
        func: 'handleReconnectDrive',
        doing: '만료된 구글 드라이브 세션을 재연결하는 작업',
        target: rootFolder?.name || 'GDRIVE',
        error: err
      });
      showToast?.(err?.message || '구글 드라이브 재접속에 실패했습니다.', 'error');
    } finally {
      setIsReconnectingDrive(false);
    }
  };

  const searchHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = searchHighlightTimeoutRef.current;
    return () => {
      if (timer) clearTimeout(timer);
      if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
        try {
          (CSS as any).highlights.delete('onrivi-search-text-highlight');
        } catch {}
      }
    };
  }, []);

  const isRestrictedUser = !!(
    licenseStatus?.isExpired ||
    licenseStatus?.isRestricted ||
    licenseStatus?.planName?.includes('제한') ||
    licenseStatus?.planName?.includes('만료')
  );
  const rootFolderDisplayName = rootFolder?.type === 'GDRIVE'
    ? `☁️ ${(rootFolder.name || '작업장').split('/').pop()}`
    : (rootFolder?.name
        ? (rootFolder.handle?.name || rootFolder.name.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || rootFolder.name)
        : '');
  const onCancelMerge = () => {
    if (setIsMergeMode) setIsMergeMode(false);
    if (setSelectedMergeNodes) setSelectedMergeNodes([]);
  };

  const {
    isSidebarOpen, setIsSidebarOpen,
    sidebarTab, setSidebarTab
  } = useUIStore();

  const [, setDrives] = useState<FileNode[]>([]);
  const [, setIsDrivesLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSelectedRoot, setIsSelectedRoot] = useState(false);
  const rootItemRef = useRef<HTMLDivElement>(null);
  const explorerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (rootItemRef.current && !rootItemRef.current.contains(e.target as Node)) {
        setIsSelectedRoot(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMenuMouseEnter = () => {
    if (contextCloseTimerRef.current) {
      clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (contextMenu) {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = setTimeout(() => {
        setContextMenu(null);
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClose);
      window.addEventListener('close-context-menus', handleClose);
      return () => {
        window.removeEventListener('click', handleClose);
        window.removeEventListener('close-context-menus', handleClose);
      };
    }
  }, [contextMenu]);

  // 🧠 등록된 지식 문서 경로 목록 동기화 (데스크톱 전용 기능)
  useEffect(() => {
    if (!isDesktop) return;

    const syncKnowledgeDocs = async () => {
      const effectiveResourceFolder = getEffectiveResourceFolder();
      if (!effectiveResourceFolder || getResourceSettings()?.kind === 'drive') return;

      const effectiveApiKey = (
        geminiApiKey ||
        (typeof window !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') ||
        (() => {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
            return raw ? JSON.parse(raw).geminiApiKey || '' : '';
          } catch { return ''; }
        })() ||
        'DUMMY_KEY_FOR_LIST'
      );

      const canUseDb = await canAccessKnowledgeDb();
      if (!canUseDb) return;

      try {
        const docs = await knowledgeClient.listDocuments({
          resourceFolder: effectiveResourceFolder,
          geminiApiKey: effectiveApiKey,
          planCode: 'ELITEPRO',
          resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
        });
        if (Array.isArray(docs)) {
          const paths = docs.map((d: any) => d.filePath || d.file_path).filter(Boolean);
          localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(paths));
          window.dispatchEvent(new CustomEvent('knowledge:updated'));
        }
      } catch {}
    };

    syncKnowledgeDocs();

    window.addEventListener('knowledge:updated-from-hub', syncKnowledgeDocs);
    window.addEventListener('knowledge:refresh', syncKnowledgeDocs);
    window.addEventListener('file:refresh-all-directories', syncKnowledgeDocs);
    return () => {
      window.removeEventListener('knowledge:updated-from-hub', syncKnowledgeDocs);
      window.removeEventListener('knowledge:refresh', syncKnowledgeDocs);
      window.removeEventListener('file:refresh-all-directories', syncKnowledgeDocs);
    };
  }, [resourceFolder, geminiApiKey, isDesktop]);

  // 📂 [미리보기/외부 폴더 링크 클릭 시 사이드바 트리 자동 펼침 및 포커스 하이라이트]
  useEffect(() => {
    const handleFocusTreeFolder = async (e: any) => {
      const { folderPath, folderName } = e.detail || {};
      if (!folderPath) return;
      try {
        if (!isSidebarOpen) setIsSidebarOpen(true);
        if (sidebarTab !== 'explorer') setSidebarTab('explorer');

        const saved = localStorage.getItem('onrivi_expanded_paths');
        const paths: string[] = saved ? JSON.parse(saved) : [];
        const norm = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
        const rootName = (rootFolder?.name || '').replace(/\\/g, '/').replace(/\/+$/, '');

        let relativeToRoot = norm;
        if (rootName && (norm === rootName || norm.startsWith(rootName + '/'))) {
          relativeToRoot = norm.slice(rootName.length).replace(/^\/+/, '');
        }

        const candidatePaths = [norm, relativeToRoot].filter(Boolean);
        for (const candidate of candidatePaths) {
          const parts = candidate.split('/').filter(Boolean);
          let cur = '';
          for (const part of parts) {
            cur = cur ? `${cur}/${part}` : (candidate.startsWith('/') ? `/${part}` : part);
            if (!paths.some(p => p.replace(/\\/g, '/').replace(/\/+$/, '') === cur)) {
              paths.push(cur);
            }
          }
        }

        localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: relativeToRoot || norm }
        }));

        const normParts = norm.split('/').filter(Boolean);
        const displayName = folderName || normParts[normParts.length - 1] || '폴더';
        showToast(`'📁 ${displayName}' 폴더를 탐색기에서 열었습니다.`, 'info');

        setTimeout(() => {
          try {
            const allItems = Array.from(document.querySelectorAll('[data-path]')) as HTMLElement[];
            const normTarget = norm.toLowerCase();
            const relTarget = relativeToRoot.toLowerCase();
            const targetBase = (normParts[normParts.length - 1] || '').toLowerCase();

            const targetEl = allItems.find(el => {
              const p = (el.getAttribute('data-path') || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
              return p === normTarget || p === relTarget || (targetBase && p.endsWith('/' + targetBase)) || p === targetBase;
            });

            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              targetEl.focus();
              targetEl.classList.add('ring-2', 'ring-[#1d4ed8]', 'bg-[#1d4ed8]/15', 'rounded-lg', 'shadow-xs');
              setTimeout(() => {
                targetEl?.classList.remove('ring-2', 'ring-[#1d4ed8]', 'bg-[#1d4ed8]/15', 'rounded-lg', 'shadow-xs');
              }, 2500);
            }
          } catch (domErr) {
            logWarn({
              file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
              func: 'handleFocusTreeFolder',
              doing: '탐색기 폴더 링크 클릭 후 대상 DOM 노드를 하이라이트하는 작업',
              target: folderPath,
              error: domErr,
            });
          }
        }, 220);
      } catch (err) {
        logWarn({
          file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
          func: 'handleFocusTreeFolder',
          doing: '미리보기/외부 폴더 링크 클릭 시 사이드바 트리를 자동 펼치는 작업',
          target: folderPath,
          error: err,
        });
      }
    };

    window.addEventListener('app:focus-tree-folder', handleFocusTreeFolder);
    return () => {
      window.removeEventListener('app:focus-tree-folder', handleFocusTreeFolder);
    };
  }, [isSidebarOpen, setIsSidebarOpen, sidebarTab, setSidebarTab, refreshFileList, showToast, rootFolder?.name]);

  const {
    clipboardNode,
    hasUndoableMove,
    lastUndoType,
    isDragOverRoot,
    handleCancelCut,
    handleUndoMove,
    triggerUndo,
    handleCopyNode,
    handleCutNode,
    handlePasteNode,
    handleDragOverRoot,
    handleDragLeaveRoot,
    handleDropRoot,
  } = useExplorerUndoClipboard({
    rootFolder,
    workspaceType,
    currentFileNode,
    isRestrictedUser,
    refreshFileList,
    showToast,
  });

  const {
    isImporting,
    importFileInputRef,
    pendingImportFile,
    setPendingImportFile,
    showImportSource,
    setShowImportSource,
    importNameRef,
    targetImportNodeRef,
    targetImportParentHandleRef,
    chooseImportDestination,
    openImportPicker,
    handleImportFile,
  } = useDocumentImporter({
    rootFolder,
    resourceFolderHandle,
    workspaceType,
    fileList,
    isRestrictedUser,
    openFile,
    refreshFileList,
    showToast,
  });

  // 📝 루트 디렉토리 생성을 위한 Prompt 상태 제어 및 비동기 처리
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    type: 'createFile' | 'createFolder' | null;
    error?: string;
  }>({ isOpen: false, title: '', defaultValue: '', type: null, error: '' });

  // ⌨️ [루트 액션 트리거]
  const triggerCreateRootFile = useCallback(() => {
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: '루트 워크스페이스에 생성할 새 파일의 이름을 입력하세요.',
      defaultValue: 'untitled.md',
      type: 'createFile'
    });
  }, []);

  const triggerCreateRootFolder = useCallback(() => {
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: '루트 워크스페이스에 생성할 새 폴더의 이름을 입력하세요.',
      defaultValue: '',
      type: 'createFolder'
    });
  }, []);

  const triggerCopyRoot = useCallback(() => {
    setContextMenu(null);
    handleCopyNode();
  }, [handleCopyNode]);

  const triggerCutRoot = useCallback(() => {
    setContextMenu(null);
    handleCutNode();
  }, [handleCutNode]);

  const triggerPasteRoot = useCallback(() => {
    setContextMenu(null);
    handlePasteNode();
  }, [handlePasteNode]);

  const triggerCancelCutRoot = useCallback(() => {
    setContextMenu(null);
    handleCancelCut();
  }, [handleCancelCut]);

  const triggerUndoMoveRoot = useCallback(() => {
    setContextMenu(null);
    handleUndoMove();
  }, [handleUndoMove]);

  const triggerRefreshRoot = useCallback(async () => {
    setContextMenu(null);
    if (rootFolder?.type === 'GDRIVE') {
      try {
        const { clearDriveChildrenCache } = await import('@/lib/gdrive/googleDriveClient');
        clearDriveChildrenCache();
      } catch {}
    }
    await refreshFileList(true);
    window.dispatchEvent(new CustomEvent('file:refresh-all-directories', { detail: { force: true } }));
  }, [refreshFileList, rootFolder?.type]);

  const triggerImportRoot = useCallback(() => {
    setContextMenu(null);
    targetImportNodeRef.current = null;
    targetImportParentHandleRef.current = null;
    void openImportPicker();
  }, [openImportPicker, targetImportNodeRef, targetImportParentHandleRef]);

  const triggerRevealRoot = useCallback(async () => {
    setContextMenu(null);
    const targetPath = (workspaceType === 'local' ? rootFolder?.name : rootFolder?.path) || rootFolder?.path || rootFolder?.name;
    const api = (window as any).electronAPI;
    if (api?.openPath && targetPath) {
      await api.openPath(targetPath);
    }
  }, [workspaceType, rootFolder]);

  /**
   * ==== [onPromptConfirm] ====
   * 🎯 역할 : PromptModal 확인 시 루트 워크스페이스에 새 파일(.md/.bib) 또는 새 폴더 생성
   */
  const onPromptConfirm = async (name: string) => {
    const type = promptConfig.type;
    setPromptConfig({ ...promptConfig, isOpen: false });
    if (!name) return;

    const rootPath = rootFolder?.name || '';

    if (type === 'createFile') {
      const finalName = (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.bib')) ? name : `${name}.md`;

      if (fileList.some((c: any) => c.name.toLowerCase() === finalName.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, isOpen: true, error: '이미 같은 이름의 파일이 존재합니다.' }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));
        if (rootFolder?.type === 'GDRIVE') {
          const { getSavedDriveToken, getSavedWorkspaceInfo, createDriveMarkdownFile } = await import('@/lib/gdrive/googleDriveClient');
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const targetFolderId = rootFolder?.id || wsInfo?.workspaceFolderId;
          if (token && targetFolderId) {
            const newFile = await createDriveMarkdownFile(token, targetFolderId, finalName, '');
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({
              name: finalName,
              kind: 'file',
              path: `${rootFolder?.path || 'GoogleDrive'}/${finalName}`,
              driveId: newFile.id,
              id: newFile.id
            });
            showToast(`'${finalName}' 파일이 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (rootFolder?.handle) {
            const handle = await rootFolder.handle.getFileHandle(finalName, { create: true });
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', handle, path: finalName }, rootFolder?.handle);
          } else {
            const { vfsCreateFile } = await import('@/lib/virtualFileSystem');
            vfsCreateFile('', finalName);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', path: finalName });
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFile) {
            const result = await api.createFile(rootPath, finalName);
            if (result.success) {
              await refreshFileList();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
              openFile({ name: finalName, kind: 'file', path: result.path });
            }
          } else {
            const { vfsCreateFile } = await import('@/lib/virtualFileSystem');
            vfsCreateFile('', finalName);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            openFile({ name: finalName, kind: 'file', path: finalName });
          }
        }
      } catch (e) {
        logError({
          file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
          func: 'onPromptConfirm',
          doing: '루트 워크스페이스에 새 마크다운 파일을 생성하는 작업',
          target: finalName,
          error: e
        });
        showToast('생성 실패: ' + e, 'error');
      }
    } else if (type === 'createFolder') {
      if (fileList.some((c: any) => c.name.toLowerCase() === name.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, isOpen: true, error: '이미 같은 이름의 폴더가 존재합니다.' }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));
        if (rootFolder?.type === 'GDRIVE') {
          const { getSavedDriveToken, getSavedWorkspaceInfo, createDriveFolder } = await import('@/lib/gdrive/googleDriveClient');
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const targetFolderId = rootFolder?.id || wsInfo?.workspaceFolderId;
          if (token && targetFolderId) {
            await createDriveFolder(token, name, targetFolderId);
            await refreshFileList();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`'${name}' 폴더가 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (rootFolder?.handle) {
            await rootFolder.handle.getDirectoryHandle(name, { create: true });
          } else {
            const { vfsCreateFolder } = await import('@/lib/virtualFileSystem');
            vfsCreateFolder('', name);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFolder) {
            await api.createFolder(rootPath, name);
          } else {
            const { vfsCreateFolder } = await import('@/lib/virtualFileSystem');
            vfsCreateFolder('', name);
          }
        }
        await refreshFileList();
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
      } catch (e) {
        logError({
          file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
          func: 'onPromptConfirm',
          doing: '루트 워크스페이스에 새 폴더를 생성하는 작업',
          target: name,
          error: e
        });
        showToast('생성 실패: ' + e, 'error');
      }
    }
  };

  useEffect(() => {
    setIsDesktop(typeof window !== 'undefined' && !!(window as any).electronAPI);
  }, []);

  /**
   * ==== [fetchDrives] ====
   * 🎯 역할 : electronAPI 또는 REST API를 통해 시스템 드라이브 목록 조회
   */
  const fetchDrives = async () => {
    setIsDrivesLoading(true);
    try {
      const api = (window as any).electronAPI;
      if (api?.getDrives) {
        const list = await api.getDrives();
        setDrives(list.map((d: string) => ({ name: d, kind: 'directory' as const, path: d + '\\', children: [] })));
      } else if (!api) {
        const res = await fetch(getApiUrl('/api/drives'));
        if (res.ok) {
          setDrives(await res.json());
        }
      }
    } catch (err) {
      logWarn({
        file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
        func: 'fetchDrives',
        doing: '시스템 로컬 드라이브 목록을 조회하는 작업',
        target: '/api/drives',
        error: err
      });
      msg.warn('드라이브 목록 조회 실패', err);
    } finally {
      setIsDrivesLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarTab === 'explorer' && isDesktop) {
      fetchDrives();
    }
  }, [sidebarTab, isDesktop]);

  // 🔄 에디터 실행 또는 탐색기 탭 활성화 시 연결된 로컬/클라우드 드라이브 목록 자동 리프레시
  useEffect(() => {
    if (!isActive || !rootFolder || (rootFolder as any)?.needPermission) return;
    const isConnected = !!(
      rootFolder.handle ||
      rootFolder.type === 'GDRIVE' ||
      rootFolder.name === BROWSER_STORAGE_NAME ||
      rootFolder.path ||
      rootFolder.name
    );
    if (isConnected && typeof refreshFileList === 'function') {
      refreshFileList(false);
    }
  }, [isActive, rootFolder, refreshFileList]);

  /**
   * ==== [handleLazyLoad] ====
   * 🎯 역할 : 하위 폴더 확장 시 Google Drive, 브라우저 FSA, VFS, Electron IPC 중 현재 환경에 맞춰 자식 노드 목록을 지연 로딩
   */
  const handleLazyLoad = async (node: FileNode): Promise<FileNode[]> => {
    try {
      if ((node as any).driveId || rootFolder?.type === 'GDRIVE') {
        const { getSavedDriveToken, fetchDriveFileNodes } = await import('@/lib/gdrive/googleDriveClient');
        const token = getSavedDriveToken();
        const folderId = (node as any).driveId || (node as any).id;
        if (token && folderId) {
          const children = await fetchDriveFileNodes(token, folderId, node.path || node.name);
          return children;
        }
      }

      if (workspaceType === 'browser') {
        if (node.handle) {
          const children: FileNode[] = [];
          for await (const entry of node.handle.values()) {
            const kind = entry.kind === 'directory' ? 'directory' : 'file';
            const path = node.path ? `${node.path}/${entry.name}` : entry.name;
            if (kind === 'file') {
              const nameLower = entry.name.toLowerCase();
              if (!nameLower.endsWith('.md') && !nameLower.endsWith('.markdown') && !nameLower.endsWith('.bib')) {
                continue;
              }
            }
            children.push({
              name: entry.name,
              kind,
              path,
              handle: entry
            });
          }
          children.sort((a, b) => {
            if (a.kind !== b.kind) {
              return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
          return children;
        } else {
          const { getVfsFiles } = await import('@/lib/virtualFileSystem');
          const allVfs = getVfsFiles();
          const findChildren = (nodes: FileNode[]): FileNode[] => {
            for (const n of nodes) {
              if (n.path === node.path) return n.children || [];
              if (n.kind === 'directory' && n.children) {
                const found = findChildren(n.children);
                if (found.length > 0 || n.path === node.path) return found;
              }
            }
            return [];
          };
          return findChildren(allVfs);
        }
      }

      const api = (window as any).electronAPI;
      if (api?.listDirectory) {
        return await api.listDirectory(node.path);
      }
      const res = await fetch(getApiUrl(`/api/list-files?path=${encodeURIComponent(node.path || '')}`));
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
        if (typeof window !== 'undefined' && node.path) {
          try {
            const saved = localStorage.getItem('onrivi_expanded_paths');
            if (saved) {
              const normPath = node.path.replace(/\\/g, '/');
              const paths = JSON.parse(saved).filter((p: string) => {
                const np = p.replace(/\\/g, '/');
                return np !== normPath && !np.startsWith(normPath + '/');
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            }
          } catch {}
        }
        throw err;
      }
      logWarn({
        file: 'frontend/src/components/sidebar/FileExplorerPanel.tsx',
        func: 'handleLazyLoad',
        doing: '하위 폴더의 파일/디렉터리 목록을 지연 로딩하는 작업',
        target: node.path || node.name,
        error: err
      });
      msg.warn('폴더 목록 조회 실패', err);
      return [];
    }
  };

  return (
    <>
      <ExplorerImportOverlays
        showImportSource={showImportSource}
        setShowImportSource={setShowImportSource}
        openImportPicker={openImportPicker}
        importFileInputRef={importFileInputRef}
        chooseImportDestination={chooseImportDestination}
        pendingImportFile={pendingImportFile}
        setPendingImportFile={setPendingImportFile}
        fileList={fileList}
        rootFolder={rootFolder}
        workspaceType={workspaceType}
        targetImportNodeRef={targetImportNodeRef}
        targetImportParentHandleRef={targetImportParentHandleRef}
        importNameRef={importNameRef}
        handleImportFile={handleImportFile}
        isImporting={isImporting}
      />
      <div className={`flex flex-col flex-1 min-h-0 ${!isActive ? 'hidden' : ''}`}>
        {/* 항상 표시되는 워크스페이스 선택 바 */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#E2E8F0] dark:border-white/[0.08] transition-colors backdrop-blur-xs ${
            isDragOverRoot ? 'bg-blue-500/15 border-blue-400 dark:border-blue-500' : 'bg-white/40 dark:bg-white/[0.02]'
          }`}
          onDragOver={handleDragOverRoot}
          onDragLeave={handleDragLeaveRoot}
          onDrop={handleDropRoot}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('close-context-menus'));
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide shrink-0">작업장 실폴더</span>
          {typeof window !== 'undefined' && !(window as any).electronAPI && rootFolder?.type !== 'GDRIVE' && (
            <button
              type="button"
              className="shrink-0 px-1.5 py-1 rounded text-[11px] font-bold text-blue-700 hover:bg-blue-50"
              title="파일을 삭제하지 않고 기본 브라우저 작업장으로 연결을 초기화합니다."
              onClick={() => window.dispatchEvent(new Event('onrivi:reset-browser-workspace'))}
            >
              초기화
            </button>
          )}
          <button
            onClick={onSelectRootFolder}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[12px] font-bold transition-all
              bg-white/95 dark:bg-[#202328] hover:bg-white dark:hover:bg-[#282C33]
              border border-slate-300 dark:border-zinc-700 hover:border-[#1d4ed8] dark:hover:border-[#1d4ed8]
              text-slate-800 dark:text-zinc-100 hover:text-[#1d4ed8] dark:hover:text-[#1d4ed8]
              shadow-2xs truncate"
            title={rootFolder?.name ? `워크스페이스 변경 (현재: ${rootFolder.name})` : '워크스페이스 폴더 선택'}
          >
            <Icon
              name="FolderTree"
              size={14}
              strokeWidth={1.75}
              className="shrink-0 text-current opacity-75"
            />
            <span className="truncate font-bold">
              {rootFolderDisplayName || '폴더를 선택하세요'}
            </span>
            {isGdriveAuthNeeded && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-500 text-white rounded-full shrink-0 shadow-2xs animate-pulse">
                재연결
              </span>
            )}
          </button>
          {rootFolder?.type === 'GDRIVE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (disconnectGoogleDrive) disconnectGoogleDrive();
              }}
              title="개인 웹드라이브 연결을 해제하고 내 PC 로컬 작업장으로 돌아갑니다."
              className="px-2 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>🔌</span>
              <span>로컬 복귀</span>
            </button>
          )}
        </div>

        <div
          ref={explorerScrollRef}
          className={`flex-1 overflow-y-auto [scrollbar-gutter:stable] explorer-scrollbar p-2 ${sidebarTab !== 'explorer' ? 'hidden' : ''}`}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[role="treeitem"]')) {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('close-context-menus'));
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          {(rootFolder as any)?.needPermission ? (
            <div className="text-zinc-500 dark:text-zinc-400 text-[12px] text-center py-5 space-y-2.5 px-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 space-y-1.5 text-left">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  ⚠️ 이전 폴더 연결 대기
                </p>
                <p className="text-[12px] leading-relaxed opacity-90">
                  브라우저 보안 제약으로 인해 새로고침 후 폴더 권한 승인이 필요합니다. 아래 버튼을 눌러 이전 폴더(<strong>{rootFolder?.name}</strong>)의 복구를 승인하세요.
                </p>
              </div>
              <button
                onClick={onRestoreFolder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[12px] font-bold transition-all shadow-md shadow-amber-500/20"
              >
                🔄 워크스페이스 복구
              </button>
            </div>
          ) : rootFolder?.handle || (isDesktop && rootFolder?.name) || rootFolder?.name === BROWSER_STORAGE_NAME || rootFolder?.type === 'GDRIVE' ? (
            <div
              className={`space-y-0.5 min-h-[50px] transition-colors rounded-lg ${isDragOverRoot ? 'bg-blue-500/10 border-2 border-dashed border-blue-500/50' : ''}`}
              onDragOver={handleDragOverRoot}
              onDragLeave={handleDragLeaveRoot}
              onDrop={handleDropRoot}
            >
              <div
                ref={rootItemRef}
                tabIndex={0}
                role="treeitem"
                aria-selected={isSelectedRoot}
                onMouseDown={() => {
                  setIsSelectedRoot(true);
                  rootItemRef.current?.focus();
                }}
                onClick={() => {
                  setIsSelectedRoot(true);
                  explorerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDragOver={handleDragOverRoot}
                onDragLeave={handleDragLeaveRoot}
                onDrop={handleDropRoot}
                className={`group relative flex items-center justify-between px-1.5 py-1 text-[12px] font-bold border-b border-outline-variant/20 mb-1 cursor-pointer rounded-t transition-colors focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]/40 ${
                  isSelectedRoot
                    ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs rounded-lg'
                    : isDragOverRoot
                      ? 'bg-blue-500/20 ring-1 ring-blue-500 text-blue-700 dark:text-blue-400 font-extrabold'
                      : 'text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                onKeyDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

                  const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
                  const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

                  if (isCtrl && e.key === 'F5') {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerRefreshRoot();
                    return;
                  }
                  if (isRestrictedUser) return;
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'o' || e.key === 'O')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerImportRoot();
                    return;
                  }
                  if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCreateRootFolder();
                    return;
                  }
                  if (e.altKey && !isCtrl && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCreateRootFile();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCopyRoot();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCutRoot();
                    return;
                  }
                  if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerPasteRoot();
                    return;
                  }
                  if (e.shiftKey && e.altKey && (e.key === 'R' || e.key === 'r')) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerRevealRoot();
                    return;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('close-context-menus'));
                  setContextMenu({ x: e.clientX, y: e.clientY });
                }}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 font-bold">
                  <Icon name="FolderTree" size={14} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">{rootFolderDisplayName}</span>
                </div>

                {contextMenu && (
                  <ExplorerRootContextMenu
                    contextMenu={contextMenu}
                    setContextMenu={setContextMenu}
                    isRestrictedUser={isRestrictedUser}
                    clipboardNode={clipboardNode}
                    hasUndoableMove={hasUndoableMove}
                    lastUndoType={lastUndoType}
                    handleMenuMouseEnter={handleMenuMouseEnter}
                    handleMenuMouseLeave={handleMenuMouseLeave}
                    handleCancelCut={handleCancelCut}
                    triggerUndo={triggerUndo}
                    triggerCreateRootFile={triggerCreateRootFile}
                    triggerCreateRootFolder={triggerCreateRootFolder}
                    triggerCopyRoot={triggerCopyRoot}
                    triggerCutRoot={triggerCutRoot}
                    triggerPasteRoot={triggerPasteRoot}
                    triggerCancelCutRoot={triggerCancelCutRoot}
                    triggerUndoMoveRoot={triggerUndoMoveRoot}
                    triggerRefreshRoot={triggerRefreshRoot}
                    triggerImportRoot={triggerImportRoot}
                    triggerRevealRoot={triggerRevealRoot}
                  />
                )}
              </div>

              {isMergeMode && (
                <div className="flex flex-col gap-1 px-1.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mx-0.5 mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-semibold text-blue-700 dark:text-blue-300">
                      병합 모드 ({selectedMergeNodes.length}개 선택됨)
                    </span>
                    <button
                      onClick={onCancelMerge}
                      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                      title="병합 취소"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <button
                    onClick={onOpenMergeModal}
                    disabled={selectedMergeNodes.length < 2}
                    className="w-full px-1.5 py-0.5 text-[12px] font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-md transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    병합 실행
                  </button>
                </div>
              )}

              {isGdriveAuthNeeded && fileList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 my-2 text-center bg-gradient-to-b from-blue-50/70 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl shadow-xs space-y-3 mx-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-sm border border-blue-100 dark:border-zinc-700/60 flex items-center justify-center text-2xl">
                    <span role="img" aria-label="cloud">☁️</span>
                  </div>
                  <div className="space-y-1 px-1">
                    <h4 className="font-extrabold text-[13px] text-zinc-900 dark:text-zinc-100">
                      개인 웹드라이브 재접속 필요
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
                      보안을 위해 1시간 후 구글 인증 세션이 만료되었습니다. 작성하신 문서와 폴더는 안전하게 보관되어 있습니다.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isReconnectingDrive}
                      onClick={handleReconnectDrive}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-blue-400 text-white rounded-xl text-[12px] font-extrabold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                    >
                      {isReconnectingDrive ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>연결 중...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="RotateCw" size={13} strokeWidth={2.2} />
                          <span>개인 웹드라이브 다시 연결</span>
                        </>
                      )}
                    </button>
                    {disconnectGoogleDrive && (
                      <button
                        type="button"
                        onClick={() => disconnectGoogleDrive()}
                        className="w-full px-2 py-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      >
                        연결 해제하고 로컬로 돌아가기
                      </button>
                    )}
                  </div>
                </div>
              ) : fileList.length === 0 ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-[12px] text-center py-6 px-3 space-y-3">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {rootFolder?.type === 'GDRIVE' ? '☁️ 웹드라이브 작업장에 파일이 없습니다.' : '연결된 폴더에 파일이 없습니다.'}
                  </p>
                  {rootFolder?.type === 'GDRIVE' ? (
                    <div className="flex flex-col gap-2 pt-1">
                      {disconnectGoogleDrive && (
                        <button
                          type="button"
                          onClick={() => disconnectGoogleDrive()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-[12px] font-bold shadow transition-all cursor-pointer"
                        >
                          <span>🏠</span>
                          <span>내 PC 로컬 작업장으로 복귀</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerCreateRootFile()}
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                      >
                        + 새 문서 만들기
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerCreateRootFile()}
                      className="text-[#1d4ed8] hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      + 새 문서 만들기
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {isGdriveAuthNeeded && (
                    <div className="mb-2 p-2 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold min-w-0">
                        <span>⚠️</span>
                        <span className="truncate">인증 만료 (저장/동기화 위해 재연결)</span>
                      </div>
                      <button
                        onClick={handleReconnectDrive}
                        disabled={isReconnectingDrive}
                        className="shrink-0 px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-[11px] font-bold cursor-pointer"
                      >
                        다시 연결
                      </button>
                    </div>
                  )}
                  {fileList
                    .filter((node: any) => node.kind === 'directory' || node.name.toLowerCase().endsWith('.md') || node.name.toLowerCase().endsWith('.markdown') || node.name.toLowerCase().endsWith('.bib'))
                    .map((node: any, i: number) => (
                      <FileTreeItem
                        key={node.path || node.name + i}
                        node={node}
                        parentHandle={rootFolder?.handle || null}
                        level={0}
                        openFile={openFile}
                        previewMode={previewMode}
                        setPreviewMode={setPreviewMode}
                        currentFileName={currentFileName}
                        currentFilePath={currentFileNode?.path}
                        workspaceType={workspaceType}
                        refreshParent={async () => {
                          await refreshFileList();
                          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                        }}
                        onRefreshAll={async () => {
                          await refreshFileList();
                          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                        }}
                        openTabPaths={openTabPaths}
                        isRestrictedUser={isRestrictedUser}
                        askConfirm={askConfirm}
                        isMergeMode={isMergeMode}
                        selectedMergeNodes={selectedMergeNodes}
                        toggleMergeNodeSelect={toggleMergeNodeSelect}
                        onLazyLoad={handleLazyLoad}
                      />
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-zinc-700 dark:text-zinc-200 text-center space-y-4 px-3 py-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#1d4ed8] shadow-sm">
                <span className="text-2xl">☁️</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[14px] font-extrabold text-zinc-900 dark:text-zinc-100">
                  작업장이 아직 비어있습니다
                </p>
                <p className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  구글 계정만 연결하면 별도 설정 없이<br />
                  <strong className="text-[#1d4ed8] dark:text-blue-400 font-bold">온리비 서재(작업장)</strong>가 자동 생성됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (connectGoogleDrive) connectGoogleDrive();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-[13px] font-extrabold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-base">☁️</span>
                <span>개인 웹드라이브 연결</span>
              </button>

              <div className="w-full flex items-center gap-2 my-1">
                <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">또는</span>
                <div className="h-px bg-slate-300 dark:bg-zinc-700 flex-1" />
              </div>

              <button
                type="button"
                onClick={onSelectRootFolder}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-[12px] font-bold border border-slate-300 dark:border-zinc-700 transition-all cursor-pointer"
              >
                <span>📁</span>
                <span>내 컴퓨터 폴더 선택</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {promptConfig.isOpen && (
        <PromptModal
          isOpen={promptConfig.isOpen}
          title={promptConfig.title}
          defaultValue={promptConfig.defaultValue}
          error={promptConfig.error}
          onConfirm={onPromptConfirm}
          onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false, error: '' })}
        />
      )}
    </>
  );
}
