"use client";

// ====================================================================
// 📊 [OMD-FILE-FileTreeItem-0001] FileTreeItem ➔ FileTreeItem
// 🎭 역할(Role) : Core (핵심 도메인 뷰 — 파일 탐색기 트리 항목 컴포넌트)
// 🎯 @KICK  : 파일 탐색기 트리 항목 렌더링 및 지연 로딩/선택/폴더 토글 제어 (액션 훅 및 컨텍스트 메뉴 위임)
// 🚨 @PATCH : **2026-11-14** — [폴더별 디폴트 서식 배지 표시 및 폴더 생성/설정 모달 연동]:
//             1) 하위 폴더 생성(createFolder) 및 폴더 기본 서식 설정(folderStyle) 시 PromptModal에 showStyleSelector 연동
//             2) 디폴트 서식이 지정된 폴더에 서식명 배지 및 툴팁 표시, 우클릭 메뉴에 '폴더 기본 서식 설정' 트리거 전달
// 🚨 @PATCH : **2026-11-11** — [선택 폴더 가져오기 연동]: 폴더 클릭·우클릭 시 파일 열기 대상 폴더를 탐색기 가져오기 훅에 전달
// 🚨 @PATCH : **2026-11-04** — [1순위 모듈화 분리 및 렌더링 성능 최적화]:
//             1) 2,221줄이던 단일 파일에서 CRUD/드래그앤드롭 액션 로직을 `useFileNodeActions.ts` 훅으로, 컨텍스트 메뉴 포털 및 지식 베이스 메뉴를 `FileTreeContextMenu.tsx`로 분리
//             2) 모든 트리 노드에 상시 마운트되던 `<PromptModal />`을 `promptConfig.isOpen` 조건부 마운트로 최적화하여 대규모 파일 트리 렌더링 성능 개선
//             3) 1·2단계 표준 주석 및 `logWarn` 진단 규격 적용
// 🚨 @PATCH : **2026-10-27** — [파일/폴더 생성 및 이름 변경 프롬프트 모달 타이틀 문장 부호 표준화]: 타이틀 끝의 콜론(:)을 마침표(.)로 변경하여 일관된 문장 부호 스타일 적용
// 🚨 @PATCH : **2026-10-04** — [다른 폴더의 동일 파일명 삭제 시 현재 열린 탭 오종료 결함 해결]: handleDelete 내 단순 파일명 일치(currentFileName === node.name) 시 openFile(null) 강제 호출 로직을 제거하고, file:close-tab-by-path에 isDir 플래그를 추가하여 정확한 경로 기반으로만 탭 닫기 수행
// 🚨 @PATCH : **2026-10-04** — [구글 드라이브 드래그앤드롭 이동(handleDrop) GDRIVE 분기 추가]: 드래그로 폴더 간 이동 시 GDRIVE 환경에서 moveDriveItem 호출로 Drive API 기반 실제 이동 수행
// 🚨 @PATCH : **2026-10-03** — [파일/폴더 삭제 시 열린 탭 즉시 닫기 driveId/name 전면 연동]: handleDelete 시 file:close-tab-by-path에 driveId/name/path 일괄 전달하여 삭제된 파일 탭 미종료 결함 해결
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브(GDRIVE) 파일/폴더 삭제, 생성, 이름 변경 지원 및 /api/delete 404 차단]
// 🔗 @CALLS : @/hooks/fileExplorer/useFileNodeActions, @/components/sidebar/explorer/FileTreeContextMenu
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@/components/icons/Icon';
import { FileNode, getFileIcon } from '@/lib/indexedDbHelper';
import PromptModal from '@/components/PromptModal';
import { msg } from '@/lib/systemMessages';
import { useToast } from '@/components/ToastProvider';
import { logWarn } from '@/lib/errorDiagnostics';
import { useFileNodeActions, snapshotFsaDirectory } from '@/hooks/fileExplorer/useFileNodeActions';
import FileTreeContextMenu from '@/components/sidebar/explorer/FileTreeContextMenu';
import { getFolderDefaultProfileEntry, getAvailableProfilesSnapshot } from '@/lib/folderProfileStorage';

export { snapshotFsaDirectory };

interface FileTreeItemProps {
  node: FileNode;
  parentHandle: any;
  level: number;
  openFile: (node: FileNode | null, parentHandle?: any) => void;
  previewMode: 'edit' | 'both' | 'preview' | 'css-style';
  setPreviewMode: (v: 'edit' | 'both' | 'preview' | 'css-style') => void;
  currentFileName: string;
  currentFilePath?: string;
  workspaceType: string;
  refreshParent: () => void;
  onRefreshAll?: () => void;
  openTabPaths?: string[];
  askConfirm: (config: { title: string; message: string; onConfirm: () => void; isDanger?: boolean }) => void;
  siblings?: FileNode[];
  isMergeMode?: boolean;
  selectedMergeNodes?: FileNode[];
  toggleMergeNodeSelect?: (node: FileNode) => void;
  onLazyLoad?: (node: FileNode) => Promise<FileNode[]>;
  isRestrictedUser?: boolean;
}

/**
 * ========================================================================================
 * [컴포넌트명] FileTreeItem - 파일 탐색기 개별 파일/폴더 트리 노드 뷰
 *
 * @param {FileTreeItemProps} props - 트리 노드 데이터, 깊이(level), 워크스페이스 핸들러
 * @returns {JSX.Element} 파일 트리 항목 및 재귀 하위 노드 뷰
 * ==========================================================================================
 */
const FileTreeItem = ({
  node: rawNode,
  parentHandle,
  level,
  openFile,
  previewMode,
  setPreviewMode,
  currentFileName,
  currentFilePath,
  workspaceType,
  refreshParent,
  onRefreshAll,
  openTabPaths,
  askConfirm,
  siblings,
  isMergeMode = false,
  selectedMergeNodes = [],
  toggleMergeNodeSelect,
  onLazyLoad,
  isRestrictedUser = false,
}: FileTreeItemProps) => {
  const { showToast } = useToast();

  const isDesktop = typeof window !== 'undefined' && (
    !!(window as any).electronAPI ||
    navigator.userAgent.toLowerCase().includes('electron') ||
    new URLSearchParams(window.location.search).get('env') === 'desktop'
  );

  const itemRef = useRef<HTMLDivElement>(null);
  const [isCut, setIsCut] = useState(false);
  const [hasClipboardCut, setHasClipboardCut] = useState(false);
  const [hasUndoableMove, setHasUndoableMove] = useState(false);
  const [lastUndoType, setLastUndoType] = useState<'move' | 'delete'>('move');

  useEffect(() => {
    const checkIsCut = () => {
      const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
      if (clip && clip.op === 'cut' && clip.node) {
        const clipPath = (clip.node.path || clip.node.name || '').replace(/\\/g, '/').toLowerCase();
        const myPath = (rawNode.path || rawNode.name || '').replace(/\\/g, '/').toLowerCase();
        setIsCut(clipPath === myPath);
        setHasClipboardCut(true);
      } else {
        setIsCut(false);
        setHasClipboardCut(false);
      }
    };
    checkIsCut();
    window.addEventListener('file:clipboard-changed', checkIsCut);
    return () => {
      window.removeEventListener('file:clipboard-changed', checkIsCut);
    };
  }, [rawNode.path, rawNode.name]);

  useEffect(() => {
    const onMoveHistoryChanged = (e: any) => {
      setHasUndoableMove((e.detail?.count || 0) > 0);
      if (e.detail?.lastType) {
        setLastUndoType(e.detail.lastType);
      }
    };
    window.addEventListener('file:move-history-changed', onMoveHistoryChanged);
    return () => {
      window.removeEventListener('file:move-history-changed', onMoveHistoryChanged);
    };
  }, []);

  // 🛡️ 백엔드/VFS 노드 규격(type: 'dir'/'file' -> kind) 자동 호환 안전장치
  const node = React.useMemo(() => {
    const kind = rawNode.kind || ((rawNode as any).type === 'dir' || (rawNode as any).type === 'directory' ? 'directory' : 'file');
    return { ...rawNode, kind };
  }, [rawNode]);

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('onrivi_expanded_paths');
      if (saved && node.path) {
        const paths: string[] = JSON.parse(saved);
        const normalizedPath = node.path.replace(/\\/g, '/');
        return paths.some(p => p.replace(/\\/g, '/') === normalizedPath);
      }
    } catch {
      // Safe guard
    }
    return false;
  });

  const [localChildren, setLocalChildren] = useState<FileNode[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleItemMouseLeave = () => {
    if (contextMenu) {
      if (contextCloseTimerRef.current) clearTimeout(contextCloseTimerRef.current);
      contextCloseTimerRef.current = setTimeout(() => {
        setContextMenu(null);
      }, 150);
    }
  };

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

  // 📌 폴더 펼침/접힘 상태 변경 시 localStorage 동기화
  useEffect(() => {
    if (node.kind !== 'directory' || !node.path) return;
    try {
      const saved = localStorage.getItem('onrivi_expanded_paths');
      let paths: string[] = saved ? JSON.parse(saved) : [];
      const normalizedPath = node.path.replace(/\\/g, '/');

      if (isOpen) {
        if (!paths.some(p => p.replace(/\\/g, '/') === normalizedPath)) {
          paths.push(node.path);
        }
      } else {
        paths = paths.filter(p => p.replace(/\\/g, '/') !== normalizedPath);
      }
      localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
    } catch {
      // Safe guard
    }
  }, [isOpen, node.path, node.kind]);

  // 📌 폴더가 열려있는(isOpen) 상태로 복구되었는데 자식 데이터가 없거나 비어있는 경우 자동으로 비동기 지연 로드 복원
  useEffect(() => {
    if (isOpen && node.kind === 'directory' && (!localChildren || localChildren.length === 0) && onLazyLoad) {
      setIsLoading(true);
      onLazyLoad(node)
        .then((children) => {
          setLocalChildren(children);
        })
        .catch((err) => {
          if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
            setIsOpen(false);
            if (typeof refreshParent === 'function') {
              refreshParent();
            }
          } else {
            logWarn({
              file: 'frontend/src/components/FileTreeItem.tsx',
              func: 'useEffect(lazyLoadOnOpen)',
              doing: '복원된 열린 폴더의 하위 목록을 지연 로드하는 작업',
              target: node.path || node.name,
              error: err,
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, node.path, node.kind, onLazyLoad]);

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

  React.useEffect(() => {
    if (node.children !== undefined && node.children !== null) {
      if (node.children.length === 0 && localChildren && localChildren.length > 0) {
        return;
      }
      if (node.children.length === 0 && isOpen) {
        return;
      }
      setLocalChildren(node.children);
    }
  }, [node.children, localChildren, isOpen]);

  /**
   * ==== [refreshThisDirectory] ====
   * 🎯 역할 : 현재 디렉토리 노드의 자식 목록을 지연 로딩(onLazyLoad)으로 갱신 (250ms 쿨다운 락 포함)
   */
  const isDirRefreshingRef = useRef(false);
  const lastDirRefreshTimeRef = useRef(0);
  const refreshThisDirectory = useCallback(async (force = false) => {
    if (node.kind !== 'directory' || !onLazyLoad) return;
    const now = Date.now();
    if (!force && (isDirRefreshingRef.current || now - lastDirRefreshTimeRef.current < 250)) {
      return;
    }
    isDirRefreshingRef.current = true;
    lastDirRefreshTimeRef.current = now;
    setIsLoading(true);
    try {
      const children = await onLazyLoad(node);
      setLocalChildren(children);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('could not be found')) {
        setIsOpen(false);
        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          if (saved && node.path) {
            const normPath = node.path.replace(/\\/g, '/');
            const paths = JSON.parse(saved).filter((p: string) => {
              const np = p.replace(/\\/g, '/');
              return np !== normPath && !np.startsWith(normPath + '/');
            });
            localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
          }
        } catch {}
        if (typeof refreshParent === 'function') {
          refreshParent();
        }
      } else {
        logWarn({
          file: 'frontend/src/components/FileTreeItem.tsx',
          func: 'refreshThisDirectory',
          doing: '현재 디렉터리 노드의 자식 목록을 재갱신하는 작업',
          target: node.path || node.name,
          error: err,
        });
        msg.warn('폴더 재갱신 실패', err);
      }
    } finally {
      setIsLoading(false);
      isDirRefreshingRef.current = false;
    }
  }, [node, onLazyLoad, refreshParent]);

  const refreshThisDirectoryRef = useRef(refreshThisDirectory);
  refreshThisDirectoryRef.current = refreshThisDirectory;
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (node.kind !== 'directory' || !node.path) return;
      const normNodePath = node.path.replace(/\\/g, '/').toLowerCase();
      const matches =
        normNodePath === (detail.sourceParentPath || '').replace(/\\/g, '/').toLowerCase() ||
        normNodePath === (detail.targetParentPath || '').replace(/\\/g, '/').toLowerCase() ||
        normNodePath === (detail.targetPath || '').replace(/\\/g, '/').toLowerCase();
      if (matches) refreshThisDirectoryRef.current(true);
    };

    const refreshAllHandler = (e?: Event) => {
      if (node.kind !== 'directory') return;
      const detail = (e as CustomEvent)?.detail;
      const isForce = detail?.force === true;
      const targetDir = detail?.targetDir ? detail.targetDir.replace(/\\/g, '/') : null;
      const normNodePath = node.path ? node.path.replace(/\\/g, '/') : '';

      if (targetDir) {
        const targetDirLower = targetDir.toLowerCase();
        const normNodePathLower = normNodePath.toLowerCase();
        if (normNodePathLower === targetDirLower || targetDirLower.startsWith(normNodePathLower + '/')) {
          setIsOpen(true);
          refreshThisDirectoryRef.current(true);
          return;
        }
      }

      if (isOpen) {
        refreshThisDirectoryRef.current(isForce);
      }
    };

    const selectNodeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.path || !node.path) return;
      const normTarget = detail.path.replace(/\\/g, '/').toLowerCase();
      const normThis = node.path.replace(/\\/g, '/').toLowerCase();
      if (normTarget === normThis && node.kind === 'directory') {
        openFile(node, parentHandle);
      }
    };

    window.addEventListener('file:moved', handler);
    window.addEventListener('file:refresh-all-directories', refreshAllHandler);
    window.addEventListener('file:select-node', selectNodeHandler);

    return () => {
      window.removeEventListener('file:moved', handler);
      window.removeEventListener('file:refresh-all-directories', refreshAllHandler);
      window.removeEventListener('file:select-node', selectNodeHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.kind, node.path, isOpen]);

  const {
    promptConfig,
    setPromptConfig,
    isDragOver,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onPromptConfirm,
    triggerCreateFile,
    triggerCreateFolder,
    triggerFolderStyle,
    triggerRename,
    triggerCopy,
    triggerCut,
    triggerPaste,
    triggerReveal,
    triggerCancelCut,
    triggerUndoMove,
    triggerDelete,
  } = useFileNodeActions({
    node,
    parentHandle,
    workspaceType,
    isRestrictedUser,
    isOpen,
    setIsOpen,
    localChildren,
    setLocalChildren,
    siblings,
    openFile,
    refreshParent,
    refreshThisDirectory,
    onRefreshAll,
    askConfirm,
    showToast,
    setContextMenu,
  });

  /**
   * ==== [handleClick] ====
   * 🎯 역할 : 파일 트리 노드 클릭 시 폴더 토글/지연 로드, 파일 열기, 병합 선택 처리
   */
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    itemRef.current?.focus();
    if (isMergeMode && node.kind === 'file' && node.name.toLowerCase().endsWith('.md')) {
      if (toggleMergeNodeSelect) toggleMergeNodeSelect(node);
      return;
    }
    if (node.kind === 'directory') {
      window.dispatchEvent(new CustomEvent('file-explorer:folder-selected', { detail: { node, parentHandle } }));
      openFile(node, parentHandle);
      const willOpen = !isOpen;
      if (willOpen && onLazyLoad && (!localChildren || localChildren.length === 0)) {
        setIsLoading(true);
        onLazyLoad(node).then((children: FileNode[]) => {
          setLocalChildren(children);
          setIsLoading(false);
          setIsOpen(true);
        }).catch(() => setIsLoading(false));
      } else {
        setIsOpen(willOpen);
      }
    } else if (node.kind === 'file') {
      openFile(node, parentHandle);
      setTimeout(() => itemRef.current?.focus(), 50);
      setTimeout(() => itemRef.current?.focus(), 150);
    }
  };

  const isSelected = (() => {
    if (currentFilePath && node.path) {
      const normCur = currentFilePath.replace(/\\/g, '/').toLowerCase();
      const normNode = node.path.replace(/\\/g, '/').toLowerCase();
      return normCur === normNode;
    }
    if (currentFilePath || node.path) {
      return false;
    }
    if (currentFileName && node.name) {
      return currentFileName.toLowerCase() === node.name.toLowerCase();
    }
    return false;
  })();

  const isMergeSelected = node.kind === 'file' && selectedMergeNodes.some(n => n.path ? n.path === node.path : n.name === node.name);
  const isMarkdown = node.kind === 'file' && node.name.toLowerCase().endsWith('.md');
  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

  // 🧠 지식 베이스 등록 여부 추적 (데스크톱 전용 기능)
  const [isKnowledgeRegistered, setIsKnowledgeRegistered] = useState(false);
  useEffect(() => {
    if (!isDesktop || !isMarkdown) {
      setIsKnowledgeRegistered(false);
      return;
    }
    const checkRegistered = () => {
      try {
        const registeredList = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
        if (!Array.isArray(registeredList) || registeredList.length === 0) {
          setIsKnowledgeRegistered(false);
          return;
        }

        const norm = (s: string) => (s || '').replace(/\\/g, '/').toLowerCase().trim();
        const myPath = norm(node.path || node.name);
        const myName = norm(node.name);

        const matched = registeredList.some((rawP: string) => {
          const p = norm(rawP);
          return (
            p === myPath ||
            p === myName ||
            p.endsWith('/' + myName) ||
            myPath.endsWith('/' + p) ||
            p.endsWith(myPath) ||
            myPath.endsWith(p)
          );
        });

        setIsKnowledgeRegistered(matched);
      } catch {
        setIsKnowledgeRegistered(false);
      }
    };

    checkRegistered();
    window.addEventListener('knowledge:updated', checkRegistered);
    window.addEventListener('file:refresh-all-directories', checkRegistered);
    return () => {
      window.removeEventListener('knowledge:updated', checkRegistered);
      window.removeEventListener('file:refresh-all-directories', checkRegistered);
    };
  }, [node.path, node.name, isMarkdown, isDesktop]);

  // 🎨 폴더별 디폴트 서식 지정 상태 추적
  const [folderProfileName, setFolderProfileName] = useState<string | null>(null);
  useEffect(() => {
    if (node.kind !== 'directory') {
      setFolderProfileName(null);
      return;
    }
    const syncFolderProfile = () => {
      const entry = getFolderDefaultProfileEntry(node, undefined, false);
      if (!entry?.profileId) {
        setFolderProfileName(null);
        return;
      }
      const allProfiles = getAvailableProfilesSnapshot();
      const matched = allProfiles.find(p => p.id === entry.profileId);
      setFolderProfileName(matched?.name || entry.profileName || null);
    };
    syncFolderProfile();
    window.addEventListener('onrivi:folder_profiles_updated', syncFolderProfile);
    window.addEventListener('onrivi:profiles_updated', syncFolderProfile);
    return () => {
      window.removeEventListener('onrivi:folder_profiles_updated', syncFolderProfile);
      window.removeEventListener('onrivi:profiles_updated', syncFolderProfile);
    };
  }, [node]);

  return (
    <div className="select-none">
      {promptConfig.isOpen && (
        <PromptModal
          isOpen={promptConfig.isOpen}
          title={promptConfig.title}
          defaultValue={promptConfig.defaultValue}
          error={promptConfig.error}
          showStyleSelector={promptConfig.type === 'createFolder' || promptConfig.type === 'folderStyle'}
          initialProfileId={promptConfig.initialProfileId || 'system-1'}
          hideTextInput={promptConfig.type === 'folderStyle'}
          onConfirm={onPromptConfirm}
          onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false, error: '' })}
        />
      )}
      <div
        ref={itemRef}
        data-path={node.path}
        data-kind={node.kind}
        title={folderProfileName ? `${node.name} (폴더 기본 서식: ${folderProfileName})` : node.name}
        tabIndex={0}
        role="treeitem"
        aria-selected={isSelected}
        draggable={!isMergeMode && !isRestrictedUser}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseLeave={handleItemMouseLeave}
        onMouseDown={() => {
          itemRef.current?.focus();
        }}
        onKeyDown={(e) => {
          if (isMergeMode || isRestrictedUser) return;
          const target = e.target as HTMLElement;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

          const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

          if (e.key === 'F2') {
            e.preventDefault();
            e.stopPropagation();
            triggerRename(e);
            return;
          }
          if (e.key === 'Delete') {
            e.preventDefault();
            e.stopPropagation();
            triggerDelete(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
            e.stopPropagation();
            triggerCopy(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
            e.preventDefault();
            e.stopPropagation();
            triggerCut(e);
            return;
          }
          if (isCmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
            e.preventDefault();
            e.stopPropagation();
            triggerPaste(e);
            return;
          }
          if (isCmdOrCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O') && node.kind === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } }));
            return;
          }
          if (e.altKey && !isCmdOrCtrl && (e.key === 'N' || e.key === 'n') && node.kind === 'directory') {
            e.preventDefault();
            e.stopPropagation();
            triggerCreateFile(e);
            return;
          }
        }}
        className={`group relative flex items-center w-full py-1 pr-2 my-0.5 rounded-lg transition-colors duration-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]/40 ${
          isSelected
            ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-sm'
            : isDragOver
              ? 'bg-[#1d4ed8]/20 ring-1 ring-[#1d4ed8]'
              : 'text-[#2A2A2A] dark:text-[#D4D4D4] hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 hover:text-black dark:hover:text-white hover:shadow-2xs'
        } ${isCut ? 'opacity-40 italic' : ''}`}
        style={{
          paddingLeft: `${(level * 12) + 8}px`,
          fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif"
        }}
        onClick={handleClick}
        onContextMenu={(e) => {
          if (isMergeMode) return;
          e.preventDefault();
          e.stopPropagation();
          if (node.kind === 'directory') window.dispatchEvent(new CustomEvent('file-explorer:folder-selected', { detail: { node, parentHandle } }));
          window.dispatchEvent(new CustomEvent('close-context-menus'));
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center mr-0.5 opacity-60 origin-center">
          {node.kind === 'directory' ? (
            isOpen ? <Icon name="ArrowDown" size={12} /> : <Icon name="ArrowRight" size={12} />
          ) : null}
        </span>

        {isMergeMode && isMarkdown && (
          <input
            type="checkbox"
            checked={isMergeSelected}
            onChange={() => toggleMergeNodeSelect?.(node)}
            className="w-2.5 h-2.5 mr-1.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-1 cursor-pointer shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 origin-center text-current">
          {getFileIcon(node, isSelected, isOpen)}
        </span>

        <span className="ml-1.5 truncate text-[12px] font-bold text-left flex-1 flex items-center gap-1">
          <span className="truncate">{node.name}</span>
          {node.kind === 'directory' && folderProfileName && (
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 border border-blue-500/20 truncate max-w-[92px] shrink-0"
              title={`폴더 기본 서식: ${folderProfileName}`}
            >
              {folderProfileName}
            </span>
          )}
          {isKnowledgeRegistered && (
            <span className="text-[11px] shrink-0 select-none animate-in fade-in zoom-in-75 duration-200" title="지식 베이스에 등록된 문서입니다">📗</span>
          )}
        </span>

        {contextMenu && !isMergeMode && (
          <FileTreeContextMenu
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            node={node}
            parentHandle={parentHandle}
            currentFilePath={currentFilePath}
            isRestrictedUser={isRestrictedUser}
            isMac={isMac}
            isMarkdown={isMarkdown}
            hasClipboardCut={hasClipboardCut}
            hasUndoableMove={hasUndoableMove}
            lastUndoType={lastUndoType}
            isKnowledgeRegistered={isKnowledgeRegistered}
            setIsKnowledgeRegistered={setIsKnowledgeRegistered}
            handleMenuMouseEnter={handleMenuMouseEnter}
            handleMenuMouseLeave={handleMenuMouseLeave}
            triggerCreateFile={triggerCreateFile}
            triggerCreateFolder={triggerCreateFolder}
            triggerFolderStyle={triggerFolderStyle}
            folderProfileName={folderProfileName}
            triggerRename={triggerRename}
            triggerCopy={triggerCopy}
            triggerCut={triggerCut}
            triggerPaste={triggerPaste}
            triggerReveal={triggerReveal}
            triggerCancelCut={triggerCancelCut}
            triggerUndoMove={triggerUndoMove}
            triggerDelete={triggerDelete}
            showToast={showToast}
          />
        )}
      </div>

      {node.kind === 'directory' && isOpen && (() => {
        const rawChildren = localChildren !== null ? localChildren : node.children;
        if (!rawChildren) return null;
        const children = rawChildren.filter(child => child.kind === 'directory' || child.name.toLowerCase().endsWith('.md') || child.name.toLowerCase().endsWith('.markdown') || child.name.toLowerCase().endsWith('.bib'));
        if (isLoading) {
          return <div className="text-[10px] text-zinc-400 pl-6 py-1 italic">불러오는 중...</div>;
        }
        return (
          <div className="mt-px">
            {children.length === 0 && (
              <div className="text-[10px] text-zinc-400 pl-6 py-1 italic">빈 폴더</div>
            )}
            {children.map((child) => (
              <FileTreeItem
                key={child.path || (node.path ? `${node.path}/${child.name}` : child.name)}
                node={child}
                parentHandle={node.handle}
                level={level + 1}
                openFile={openFile}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                currentFileName={currentFileName}
                currentFilePath={currentFilePath}
                workspaceType={workspaceType}
                refreshParent={refreshThisDirectory}
                onRefreshAll={onRefreshAll}
                openTabPaths={openTabPaths}
                askConfirm={askConfirm}
                siblings={children}
                isMergeMode={isMergeMode}
                selectedMergeNodes={selectedMergeNodes}
                toggleMergeNodeSelect={toggleMergeNodeSelect}
                onLazyLoad={onLazyLoad}
                isRestrictedUser={isRestrictedUser}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default FileTreeItem;
