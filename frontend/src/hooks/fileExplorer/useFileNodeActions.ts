/**
 * ====================================================================
 * 🏷️ 파일명 : useFileNodeActions.ts
 * 🎯 주요기능 : 파일 탐색기 개별 노드(FileTreeItem)의 생성·이름변경·삭제·드래그앤드롭 이동·컨텍스트 액션 제어 훅
 * 🚨 @PATCH : 2026-11-14 — [폴더 생성/이름변경/삭제 및 컨텍스트 메뉴 폴더 기본 서식 설정 연동]:
 *             1) 하위 폴더 생성(createFolder) 및 폴더 서식 설정(folderStyle) 시 setFolderDefaultProfile로 폴더별 디폴트 서식 저장·관리
 *             2) 폴더 이름 변경(renameFolderDefaultProfile) 및 폴더 삭제(removeFolderDefaultProfile) 시 매핑 자동 동기화
 * 🚨 @PATCH : 2026-11-04 — [FileTreeItem 모듈화 분리 및 1·2단계 표준 주석·오류 진단(logError/logWarn) 적용]
 *             1) FileTreeItem(2,221줄)에서 파일/폴더 CRUD(생성/이름변경/삭제), 드래그앤드롭 이동, 단축키 트리거 액션을 전용 훅으로 분리
 *             2) onrivi-source-comments 및 onrivi-error-handling 스킬 규격에 맞춰 5대 필수 필드(file, func, doing, target, error) 적용
 * ====================================================================
 */

import React, { useState, useCallback } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { useDragHighlight } from '@/hooks/useDragHighlight';
import { FileNode } from '@/lib/indexedDbHelper';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { vfsCreateFile, vfsCreateFolder, vfsRename, vfsDelete, vfsReadFile } from '@/lib/virtualFileSystem';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  trashDriveItem,
  renameDriveItem,
  createDriveMarkdownFile,
  createDriveFolder,
  moveDriveItemWithUndo
} from '@/lib/gdrive/googleDriveClient';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import {
  setFolderDefaultProfile,
  getFolderDefaultProfileId,
  renameFolderDefaultProfile,
  removeFolderDefaultProfile,
} from '@/lib/folderProfileStorage';

/**
 * ==== [snapshotFsaDirectory] ====
 * 🎯 역할 : 브라우저 File System Access API 폴더의 하위 파일/폴더 구조를 재귀적으로 스냅샷 추출 (삭제 되돌리기용)
 * 📥 파라미터 :
 *   - dirHandle (any) : 스냅샷을 추출할 대상 디렉터리 핸들
 *   - prefix (string) : 상위 상대 경로 접두사
 * 📤 반환값 : Promise<{ relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[]>
 */
export const snapshotFsaDirectory = async (
  dirHandle: any,
  prefix = ''
): Promise<{ relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[]> => {
  const items: { relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[] = [];
  for await (const [name, entry] of dirHandle.entries()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === 'directory') {
      items.push({ relativePath: rel, kind: 'directory' });
      items.push(...await snapshotFsaDirectory(entry, rel));
    } else if (entry.kind === 'file') {
      items.push({ relativePath: rel, kind: 'file', content: await entry.getFile() });
    }
  }
  return items;
};

export interface PromptConfigState {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  type: 'rename' | 'createFile' | 'createFolder' | 'folderStyle' | null;
  initialProfileId?: string;
  error?: string;
}

export interface UseFileNodeActionsParams {
  node: FileNode;
  parentHandle: any;
  workspaceType: string;
  isRestrictedUser: boolean;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  localChildren: FileNode[] | null;
  setLocalChildren: React.Dispatch<React.SetStateAction<FileNode[] | null>>;
  siblings?: FileNode[];
  openFile: (node: FileNode | null, parentHandle?: any) => void;
  refreshParent: () => void;
  refreshThisDirectory: (force?: boolean) => Promise<void>;
  onRefreshAll?: () => void;
  askConfirm: (config: { title: string; message: string; onConfirm: () => void; isDanger?: boolean }) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
}

/**
 * ==== [useFileNodeActions] ====
 * 🎯 역할 : 파일 트리 노드의 드래그앤드롭 이동, 이름변경/생성 프롬프트 처리, 삭제 및 컨텍스트 트리거 핸들러를 제공하는 커스텀 훅
 * 📥 파라미터 : UseFileNodeActionsParams
 * 📤 반환값 : 드래그 핸들러, 프롬프트 상태/핸들러, 컨텍스트 메뉴 액션 트리거 함수 객체
 */
export function useFileNodeActions({
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
}: UseFileNodeActionsParams) {
  const [promptConfig, setPromptConfig] = useState<PromptConfigState>({
    isOpen: false,
    title: '',
    defaultValue: '',
    type: null,
    error: '',
  });

  const [isDragOver, setIsDragOver] = useDragHighlight();

  /**
   * ==== [dispatchMovedEvent] ====
   * 🎯 역할 : 파일/폴더 이동 완료 시 트리 갱신 이벤트(file:moved)와 열린 탭 경로 동기화 이벤트(file:tab-renamed)를 발송
   */
  const dispatchMovedEvent = useCallback((srcPath: string, tgtPath: string, newPath?: string, sourceName?: string, newHandle?: any) => {
    const normSrc = srcPath.replace(/\\/g, '/');
    const normTgt = tgtPath.replace(/\\/g, '/');
    const srcParentPath = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
    const tgtParentPath = normTgt.includes('/') ? normTgt.substring(0, normTgt.lastIndexOf('/')) : '';

    window.dispatchEvent(new CustomEvent('file:moved', {
      detail: { sourceParentPath: srcParentPath, targetParentPath: tgtParentPath, targetPath: normTgt }
    }));

    if (newPath && sourceName) {
      window.dispatchEvent(new CustomEvent('file:tab-renamed', {
        detail: { oldPath: srcPath, newPath, newName: sourceName, newHandle }
      }));
    }
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('sourcePath', node.path || '');
    e.dataTransfer.setData('sourceName', node.name);
    e.dataTransfer.setData('sourceKind', node.kind);
    e.dataTransfer.effectAllowed = 'move';
    if (typeof window !== 'undefined') {
      (window as any)._draggedNode = node;
      (window as any)._draggedNodeParentHandle = parentHandle;
      const normPath = (node.path || '').replace(/\\/g, '/');
      const lastSlash = normPath.lastIndexOf('/');
      (window as any)._draggedNodeParentPath = lastSlash !== -1 ? normPath.substring(0, lastSlash) : '';
    }
  }, [node, parentHandle]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isRestrictedUser || !Array.from(e.dataTransfer.types).includes('sourcepath')) {
      setIsDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (node.kind === 'directory') {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  }, [isRestrictedUser, node.kind, setIsDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, [setIsDragOver]);

  /**
   * ==== [handleDrop] ====
   * 🎯 역할 : 파일/폴더 드래그 앤 드롭 이동 처리 (Google Drive, Electron, 브라우저 FSA, VFS 지원)
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    setIsDragOver(false);
    if (isRestrictedUser) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (node.kind !== 'directory') return;

    const sourcePath = e.dataTransfer.getData('sourcePath');
    const sourceName = e.dataTransfer.getData('sourceName');
    const sourceKind = e.dataTransfer.getData('sourceKind');
    const draggedNode = typeof window !== 'undefined' ? (window as any)._draggedNode : null;
    const draggedNodeParent = typeof window !== 'undefined' ? (window as any)._draggedNodeParentHandle : null;

    if (sourcePath === node.path) return;
    if (draggedNode && draggedNode.kind === 'directory' && node.path && draggedNode.path) {
      const normNode = (node.path || '').replace(/\\/g, '/').toLowerCase();
      const normDragged = (draggedNode.path || '').replace(/\\/g, '/').toLowerCase();
      if (normNode === normDragged || normNode.startsWith(normDragged + '/')) {
        showToast('하위 폴더로는 이동할 수 없습니다.', 'warning');
        return;
      }
    }

    try {
      if (workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud')) {
        const token = getSavedDriveToken();
        const srcDriveId = draggedNode?.driveFileId || draggedNode?.driveId || (draggedNode as any)?.id;
        const destDriveId = (node as any).driveFileId || (node as any).driveId || (node as any).id;
        if (!token) {
          showToast('구글 드라이브 토큰이 없습니다. 다시 연결해 주세요.', 'error');
          return;
        }
        if (!srcDriveId || !destDriveId) {
          showToast('구글 드라이브 파일 ID를 찾을 수 없습니다.', 'error');
          return;
        }
        if (srcDriveId === destDriveId) return;
        const srcParentDriveId = (draggedNode as any)?.parentDriveId || (draggedNode as any)?.parentId;
        await moveDriveItemWithUndo(token, srcDriveId, destDriveId, srcParentDriveId, { name: sourceName, kind: sourceKind });
        showToast(`'${sourceName}' 이동 완료`, 'success');
        onRefreshAll?.();
        refreshParent();
        await refreshThisDirectory(true);
        return;
      }

      if (workspaceType === 'local') {
        const cleanDestDir = (node.path || '').replace(/[/\\]+$/, '');
        const sep = cleanDestDir.includes('/') && !cleanDestDir.includes('\\') ? '/' : '\\';
        const newPath = cleanDestDir ? `${cleanDestDir}${sep}${sourceName}` : sourceName;
        const api = (window as any).electronAPI;
        if (api?.moveFile) {
          const res = await api.moveFile(sourcePath, newPath);
          if (res && res.error) throw new Error(res.error);
        } else if (api?.renameFile) {
          await api.renameFile(sourcePath, newPath);
        } else {
          vfsRename(sourcePath, newPath);
        }

        showToast(`'${sourceName}' 이동 완료`, 'success');
        dispatchMovedEvent(sourcePath, node.path || '', newPath, sourceName);

        if (sourceKind === 'directory' && sourcePath) {
          try {
            const saved = localStorage.getItem('onrivi_expanded_paths');
            let paths: string[] = saved ? JSON.parse(saved) : [];
            const nodePath = node.path;
            if (nodePath) {
              const normNodePath = nodePath.replace(/\\/g, '/').toLowerCase();
              if (!paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normNodePath)) {
                paths.push(nodePath);
              }
            }
            const normSrc = sourcePath.replace(/\\/g, '/').toLowerCase();
            paths = paths.map((p: string) => {
              const np = p.replace(/\\/g, '/');
              if (np.toLowerCase() === normSrc) return newPath;
              if (np.toLowerCase().startsWith(normSrc + '/')) {
                const sub = np.substring(normSrc.length);
                return `${newPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
              }
              return p;
            });
            localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
          } catch {}
        }

        const normSrc = sourcePath.replace(/\\/g, '/');
        const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
        window.dispatchEvent(new CustomEvent('file:push-undo-action', {
          detail: {
            type: 'move',
            srcPath: sourcePath,
            destPath: newPath,
            srcDirPath: srcDir,
            destDirPath: node.path || '',
            name: sourceName,
            kind: sourceKind || 'file',
            workspaceType: 'local'
          }
        }));

        onRefreshAll?.();
        refreshParent();
        await refreshThisDirectory(true);
      } else if (workspaceType === 'browser') {
        if (draggedNode && draggedNode.handle) {
          const targetDirHandle = node.handle;
          if (!targetDirHandle) return;

          let finalNewHandle: any = null;
          if (draggedNode.kind === 'file') {
            const file = await draggedNode.handle.getFile();
            const text = await file.text();
            const newFileHandle = await targetDirHandle.getFileHandle(draggedNode.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(text);
            await writable.close();
            if (draggedNodeParent) {
              await draggedNodeParent.removeEntry(draggedNode.name);
            }
            finalNewHandle = newFileHandle;
          } else if (draggedNode.kind === 'directory') {
            const newDirHandle = await targetDirHandle.getDirectoryHandle(draggedNode.name, { create: true });

            const copyDirectory = async (srcDir: FileSystemDirectoryHandle, destDir: FileSystemDirectoryHandle) => {
              for await (const entry of (srcDir as any).values()) {
                if (entry.kind === 'file') {
                  const file = await entry.getFile();
                  const text = await file.text();
                  const newFileHandle = await destDir.getFileHandle(entry.name, { create: true });
                  const writable = await newFileHandle.createWritable();
                  await writable.write(text);
                  await writable.close();
                } else if (entry.kind === 'directory') {
                  const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                  await copyDirectory(entry, newSubDir);
                }
              }
            };

            await copyDirectory(draggedNode.handle, newDirHandle);
            if (draggedNodeParent) {
              await draggedNodeParent.removeEntry(draggedNode.name, { recursive: true });
            }
            finalNewHandle = newDirHandle;
          }
          showToast(`'${draggedNode.name}' 이동 완료`, 'success');
          const newPath = node.path ? `${node.path}/${draggedNode.name}` : draggedNode.name;
          dispatchMovedEvent(sourcePath, node.path || '', newPath, draggedNode.name, finalNewHandle);
          onRefreshAll?.();
          refreshParent();
          await refreshThisDirectory();
        } else if (sourcePath) {
          const oldPath = sourcePath;
          const normalizedPath = oldPath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const filename = lastSlashIndex !== -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath;
          const newPath = node.path ? `${node.path}/${filename}` : filename;

          vfsRename(oldPath, newPath);
          showToast(`'${filename}' 이동 완료`, 'success');
          dispatchMovedEvent(oldPath, node.path || '', newPath, filename);
          onRefreshAll?.();
          refreshParent();
          await refreshThisDirectory();
        }
      }
    } catch (e) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
        func: 'handleDrop',
        doing: '드래그 앤 드롭으로 파일 또는 폴더를 대상 디렉터리로 이동하는 작업',
        target: `${sourceName || sourcePath} -> ${node.path || node.name}`,
        error: e,
      });
      showToast('이동 실패: ' + e, 'error');
    }
  }, [isRestrictedUser, node, workspaceType, showToast, onRefreshAll, refreshParent, refreshThisDirectory, dispatchMovedEvent, setIsDragOver]);

  /**
   * ==== [onPromptConfirm] ====
   * 🎯 역할 : 이름 변경/파일 생성/폴더 생성/폴더 기본 서식 설정 프롬프트 모달 확인 시 실제 파일시스템/드라이브/VFS 및 서식 매핑 반영 수행
   */
  const onPromptConfirm = useCallback(async (name: string, selectedProfileId?: string) => {
    const type = promptConfig.type;
    setPromptConfig(prev => ({ ...prev, isOpen: false }));

    if (type === 'folderStyle') {
      setFolderDefaultProfile(node, selectedProfileId || 'system-1');
      showToast(`'${node.name}' 폴더의 기본 서식이 저장되었습니다.`, 'success');
      return;
    }

    if (!name) return;

    if (type === 'rename') {
      if (name === node.name) return;
      const finalName = node.kind === 'file' && !(name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.markdown') || name.toLowerCase().endsWith('.bib')) ? `${name}.md` : name;

      if (siblings?.some(s => s.name.toLowerCase() === finalName.toLowerCase() && s.path !== node.path)) {
        setPromptConfig(prev => ({ ...prev, isOpen: true, error: '이미 같은 이름의 항목이 존재합니다.' }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          if (token && targetDriveId) {
            await renameDriveItem(token, targetDriveId, finalName);
            const oldPath = node.path || node.name;
            node.name = finalName;
            const normalizedPath = oldPath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedPath.lastIndexOf('/');
            const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
            const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;
            if (node.kind === 'directory') {
              renameFolderDefaultProfile(oldPath, newPath);
            }
            node.path = newPath;
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            window.dispatchEvent(new CustomEvent('file:tab-renamed', {
              detail: { oldPath, newPath, newName: finalName }
            }));
            showToast(`'${finalName}'(으)로 이름이 변경되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            if (node.kind === 'file') {
              const file = await node.handle.getFile();
              const text = await file.text();
              const newHandle = await parentHandle.getFileHandle(finalName, { create: true });
              const writable = await newHandle.createWritable();
              await writable.write(text);
              await writable.close();
              await parentHandle.removeEntry(node.name);

              const oldPath = node.path || '';
              const normalizedPath = oldPath.replace(/\\/g, '/');
              const lastSlashIndex = normalizedPath.lastIndexOf('/');
              const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
              const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;

              node.handle = newHandle;
              node.name = finalName;
              node.path = newPath;

              refreshParent();
              window.dispatchEvent(new CustomEvent('file:tab-renamed', {
                detail: { oldPath, newPath, newName: finalName, newHandle }
              }));
            } else if (node.kind === 'directory') {
              const newDirHandle = await parentHandle.getDirectoryHandle(finalName, { create: true });

              const copyDirectory = async (srcDir: FileSystemDirectoryHandle, destDir: FileSystemDirectoryHandle) => {
                for await (const entry of (srcDir as any).values()) {
                  if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const newFileHandle = await destDir.getFileHandle(entry.name, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(text);
                    await writable.close();
                  } else if (entry.kind === 'directory') {
                    const newSubDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                    await copyDirectory(entry, newSubDir);
                  }
                }
              };

              await copyDirectory(node.handle, newDirHandle);
              await parentHandle.removeEntry(node.name, { recursive: true });

              const oldPath = node.path || '';
              const normalizedPath = oldPath.replace(/\\/g, '/');
              const lastSlashIndex = normalizedPath.lastIndexOf('/');
              const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
              const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;

              node.handle = newDirHandle;
              node.name = finalName;
              node.path = newPath;
              renameFolderDefaultProfile(oldPath, newPath);
              node.children = [];
              setLocalChildren(null);

              refreshParent();
              refreshThisDirectory(true);

              window.dispatchEvent(new CustomEvent('file:tab-renamed', {
                detail: { oldPath, newPath, newName: finalName, newHandle: newDirHandle }
              }));

              try {
                const raw = localStorage.getItem('onrivi_expanded_paths');
                if (raw) {
                  const paths: string[] = JSON.parse(raw);
                  const updated = paths.map(p => {
                    if (p === oldPath) return newPath;
                    if (p.startsWith(oldPath + '/')) return newPath + p.substring(oldPath.length);
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch {}
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          } else if (node.path) {
            const oldPath = node.path;
            const normalizedPath = oldPath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedPath.lastIndexOf('/');
            const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
            const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;
            const isDir = node.kind === 'directory';

            vfsRename(oldPath, newPath);
            if (isDir) {
              renameFolderDefaultProfile(oldPath, newPath);
            }
            node.path = newPath;
            node.name = finalName;
            if (isDir) {
              node.children = [];
              setLocalChildren(null);
            }
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:tab-renamed', {
              detail: { oldPath, newPath, newName: finalName }
            }));

            if (isDir) {
              try {
                const raw = localStorage.getItem('onrivi_expanded_paths');
                if (raw) {
                  const paths: string[] = JSON.parse(raw);
                  const updated = paths.map(p => {
                    if (p === oldPath) return newPath;
                    if (p.startsWith(oldPath + '/')) return newPath + p.substring(oldPath.length);
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch {}
              refreshThisDirectory(true);
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          }
        } else {
          const api = (window as any).electronAPI;
          const cleanOldPath = (node.path || '').replace(/[/\\]+$/, '');
          const normalizedPath = cleanOldPath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const parentPath = lastSlashIndex !== -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
          const finalParentPath = parentPath.replace(/\//g, '\\');
          const newPath = (finalParentPath ? `${finalParentPath}\\${finalName}` : finalName).normalize('NFC');
          const isDir = node.kind === 'directory';

          if (api?.renameFile) {
            await api.renameFile(cleanOldPath, newPath);
          } else {
            vfsRename(cleanOldPath, newPath);
          }
          if (isDir) {
            renameFolderDefaultProfile(cleanOldPath, newPath);
          }

          node.path = newPath;
          node.name = finalName;
          if (isDir) {
            node.children = [];
            setLocalChildren(null);
          }
          refreshParent();

          if (isDir) {
            try {
              const raw = localStorage.getItem('onrivi_expanded_paths');
              if (raw) {
                const paths: string[] = JSON.parse(raw);
                const normOld = cleanOldPath.replace(/\\/g, '/').toLowerCase();
                const updated = paths.map(p => {
                  const normP = p.replace(/[/\\]+$/, '').replace(/\\/g, '/').toLowerCase();
                  if (normP === normOld) return newPath;
                  if (normP.startsWith(normOld + '/')) {
                    return newPath + p.substring(cleanOldPath.length);
                  }
                  return p;
                });
                localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
              }
            } catch {}
            refreshThisDirectory(true);
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
              detail: { force: true, targetDir: newPath }
            }));
          }

          window.dispatchEvent(new CustomEvent('file:tab-renamed', {
            detail: { oldPath: cleanOldPath, newPath, newName: finalName }
          }));
        }
      } catch (e) {
        const isDir = node.kind === 'directory';
        logError({
          file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
          func: 'onPromptConfirm(rename)',
          doing: `${isDir ? '폴더' : '파일'} 이름을 변경하는 작업`,
          target: `${node.name} -> ${finalName}`,
          error: e,
        });
        showToast((isDir ? '폴더' : '파일') + ' 이름 변경 실패: ' + e, 'error');
      }
    } else if (type === 'createFile') {
      const finalName = (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.bib')) ? name : `${name}.md`;

      if (node.children?.some(c => c.name.toLowerCase() === finalName.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, isOpen: true, error: '이미 같은 이름의 파일이 존재합니다.' }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const parentDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id || wsInfo?.workspaceFolderId;
          if (token && parentDriveId) {
            const newDoc = await createDriveMarkdownFile(token, parentDriveId, finalName, '');
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = node.path ? `${node.path}/${finalName}` : finalName;
            openFile({
              name: finalName,
              kind: 'file',
              path: filePath,
              driveId: newDoc.id,
              driveFileId: newDoc.id,
              id: newDoc.id
            }, node.handle);
            showToast(`'${finalName}' 파일이 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            const handle = await node.handle.getFileHandle(finalName, { create: true });
            refreshParent();
            const filePath = node.path ? `${node.path}/${finalName}` : finalName;
            openFile({ name: finalName, kind: 'file', handle, path: filePath }, node.handle);
          } else if (node.path) {
            vfsCreateFile(node.path, finalName);
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = `${node.path}/${finalName}`;
            openFile({ name: finalName, kind: 'file', path: filePath }, node.handle);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFile) {
            const result = await api.createFile(node.path, finalName);
            if (result.success) {
              await refreshThisDirectory();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
              openFile({ name: finalName, kind: 'file', path: result.path }, node.handle);
            }
          } else if (node.path) {
            vfsCreateFile(node.path, finalName);
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            const filePath = `${node.path}/${finalName}`;
            openFile({ name: finalName, kind: 'file', path: filePath }, node.handle);
          }
        }
      } catch (e) {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
          func: 'onPromptConfirm(createFile)',
          doing: '하위 디렉터리에 새 마크다운 파일을 생성하는 작업',
          target: `${node.path || node.name}/${finalName}`,
          error: e,
        });
        showToast('생성 실패: ' + e, 'error');
      }
    } else if (type === 'createFolder') {
      if (node.children?.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        setPromptConfig(prev => ({ ...prev, isOpen: true, error: '이미 같은 이름의 폴더가 존재합니다.' }));
        return;
      }

      try {
        setPromptConfig(prev => ({ ...prev, isOpen: false, error: '' }));

        const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
        if (isDriveNode) {
          const token = getSavedDriveToken();
          const wsInfo = getSavedWorkspaceInfo();
          const parentDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id || wsInfo?.workspaceFolderId;
          if (token && parentDriveId) {
            const createdFolderId = await createDriveFolder(token, name, parentDriveId);
            const newFolderPath = node.path ? `${node.path}/${name}` : name;
            if (selectedProfileId) {
              setFolderDefaultProfile(
                { path: newFolderPath, name, driveId: createdFolderId, id: createdFolderId },
                selectedProfileId
              );
            }
            setIsOpen(true);
            await refreshThisDirectory();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`'${name}' 폴더가 구글 드라이브에 생성되었습니다.`, 'success');
            return;
          }
        }

        if (workspaceType === 'browser') {
          if (node.handle) {
            await node.handle.getDirectoryHandle(name, { create: true });
          } else if (node.path) {
            vfsCreateFolder(node.path, name);
          }
        } else {
          const api = (window as any).electronAPI;
          if (api?.createFolder) {
            await api.createFolder(node.path, name);
          } else if (node.path) {
            vfsCreateFolder(node.path, name);
          }
        }

        setIsOpen(true);
        const newFolderPath = node.path ? `${node.path}/${name}` : name;
        if (selectedProfileId) {
          setFolderDefaultProfile({ path: newFolderPath, name }, selectedProfileId);
        }
        await refreshThisDirectory();
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        window.dispatchEvent(new CustomEvent('file:select-node', { detail: { path: newFolderPath } }));
      } catch (e) {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
          func: 'onPromptConfirm(createFolder)',
          doing: '하위 디렉터리에 새 폴더를 생성하는 작업',
          target: `${node.path || node.name}/${name}`,
          error: e,
        });
        showToast('생성 실패: ' + e, 'error');
      }
    }
  }, [promptConfig.type, node, siblings, workspaceType, parentHandle, refreshParent, refreshThisDirectory, setLocalChildren, openFile, setIsOpen, showToast]);

  /**
   * ==== [handleDelete] ====
   * 🎯 역할 : 파일/폴더 삭제 시 되돌리기(Undo) 백업 스냅샷 생성 후 삭제 및 열린 탭 자동 종료 수행
   */
  const handleDelete = useCallback(async (e: any) => {
    if (e?.stopPropagation) e.stopPropagation();

    const isDir = node.kind === 'directory';
    const rawChildren = localChildren !== null ? localChildren : node.children;
    const hasChildren = isDir && rawChildren && rawChildren.length > 0;

    askConfirm({
      title: isDir ? '폴더 삭제' : '파일 삭제',
      message: isDir
        ? (hasChildren
            ? `'${node.name}' 폴더와 그 안의 모든 하위 파일/폴더를 완전히 삭제하시겠습니까?`
            : `'${node.name}' 폴더를 정말 삭제하시겠습니까?`)
        : `'${node.name}' 파일을 정말 삭제하시겠습니까?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          let content: any = '';
          let backupPath = '';
          let items: any[] = [];
          const isDriveNode = !!((node as any).driveId || (node as any).driveFileId || workspaceType === 'cloud' || (typeof window !== 'undefined' && localStorage.getItem('workspaceType') === 'cloud'));
          const driveToken = isDriveNode ? getSavedDriveToken() : null;
          const driveItemId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          if (isDriveNode && (!driveToken || !driveItemId)) {
            showToast('구글 드라이브 연결과 삭제 대상 정보를 확인해 주세요.', 'error');
            return;
          }

          try {
            if (isDriveNode) {
              // Drive folders remain intact in the trash; never back them up through OS APIs.
            } else if (!isDir) {
              if (workspaceType === 'browser') {
                if (node.handle) {
                  const f = await node.handle.getFile();
                  content = f;
                } else if (node.path) {
                  content = vfsReadFile(node.path) || '';
                }
              } else {
                const api = (window as any).electronAPI;
                if (api?.readFromPath && node.path) {
                  const res = await api.readFromPath(node.path);
                  content = res?.content || '';
                } else if (node.path) {
                  const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
                  if (res.ok) {
                    const data = await res.json();
                    content = data.content || '';
                  }
                }
              }
            } else {
              if (workspaceType === 'browser') {
                if (node.handle) {
                  items = await snapshotFsaDirectory(node.handle);
                } else if (node.path) {
                  try {
                    const normPath = node.path.replace(/\\/g, '/').toLowerCase();
                    const allKeys = localStorage.keys();
                    for (const k of allKeys) {
                      if (k.startsWith('vfs:')) {
                        const filePath = k.slice(4);
                        const normFp = filePath.replace(/\\/g, '/').toLowerCase();
                        if (normFp.startsWith(normPath + '/')) {
                          const rel = filePath.slice(node.path.length).replace(/^[/\\]+/, '');
                          items.push({ relativePath: rel, kind: 'file', content: localStorage.getItem(k) || '' });
                        }
                      }
                    }
                  } catch (vfsErr) {
                    logWarn({
                      file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
                      func: 'handleDelete',
                      doing: 'VFS 폴더 삭제 전 하위 파일 스냅샷을 백업하는 작업',
                      target: node.path || node.name,
                      error: vfsErr,
                    });
                  }
                }
              } else {
                const api = (window as any).electronAPI;
                if (api?.backupFolderForUndo && node.path) {
                  const res = await api.backupFolderForUndo(node.path);
                  if (res?.success && res.backupPath) {
                    backupPath = res.backupPath;
                  } else throw new Error(res?.error || '폴더를 백업하지 못했습니다.');
                }
              }
            }
          } catch (err) {
            throw new Error('복원용 백업을 만들지 못해 삭제하지 않았습니다: ' + ((err as any).message || err));
          }

          const normalizedPath = (node.path || node.name).replace(/\\/g, '/');
          const lastSlash = normalizedPath.lastIndexOf('/');
          const parentPath = lastSlash !== -1 ? normalizedPath.substring(0, lastSlash) : '';

          const undoAction = {
            type: 'delete',
            name: node.name,
            path: node.path || node.name,
            parentPath,
            kind: node.kind,
            content,
            backupPath,
            items,
            parentHandle,
            workspaceType: isDriveNode ? 'cloud' : workspaceType,
            driveId: isDriveNode ? driveItemId : undefined,
            accountEmail: isDriveNode ? getSavedWorkspaceInfo()?.userEmail : undefined,
          };

          if (isDriveNode) {
            const token = getSavedDriveToken();
            const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
            if (token && targetDriveId) {
              await trashDriveItem(token, targetDriveId);
              if (isDir && node.path) {
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
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            } else {
              showToast('구글 드라이브 삭제 대상 식별자가 누락되었습니다.', 'error');
              return;
            }
          } else if (workspaceType === 'browser') {
            if (node.handle) {
              await parentHandle.removeEntry(node.name, { recursive: true });
              if (isDir && node.path) {
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
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            } else if (node.path) {
              vfsDelete(node.path);
              if (isDir && node.path) {
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
              refreshParent();
              window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            }
          } else {
            const api = (window as any).electronAPI;
            if (api?.deleteFile) {
              await api.deleteFile(node.path);
            } else if (node.path) {
              vfsDelete(node.path);
            }
            if (isDir && node.path) {
              try {
                const saved = localStorage.getItem('onrivi_expanded_paths');
                if (saved) {
                  const normPath = node.path.replace(/\\/g, '/').toLowerCase();
                  const paths = JSON.parse(saved).filter((p: string) => {
                    const np = p.replace(/\\/g, '/').toLowerCase();
                    return np !== normPath && !np.startsWith(normPath + '/');
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
                }
              } catch {}
            }
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          }

          window.dispatchEvent(new CustomEvent('file:push-undo-action', { detail: undoAction }));
          const targetDriveId = (node as any).driveId || (node as any).driveFileId || (node as any).id;
          if (isDir) {
            removeFolderDefaultProfile(node.path || node.name, undefined, targetDriveId);
          }
          window.dispatchEvent(new CustomEvent('file:tab-deleted', { detail: { deletedPath: node.path || node.name, driveId: targetDriveId } }));
          window.dispatchEvent(new CustomEvent('file:close-tab-by-path', {
            detail: {
              path: node.path || node.name,
              name: node.name,
              driveId: targetDriveId,
              isDir,
            }
          }));
          showToast(`[${node.name}] ${isDir ? '폴더' : '파일'}가 삭제되었습니다.`, 'success');
        } catch (e: any) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useFileNodeActions.ts',
            func: 'handleDelete',
            doing: '파일 또는 폴더를 삭제하고 백업 스냅샷을 등록하는 작업',
            target: node.path || node.name,
            error: e,
          });
          const errStr = e.message || e.toString();
          showToast('삭제 실패: ' + errStr, 'error');
        }
      }
    });
  }, [node, showToast, localChildren, askConfirm, workspaceType, parentHandle, refreshParent]);

  const triggerCreateFile = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 파일의 이름을 입력하세요.`,
      defaultValue: 'untitled.md',
      type: 'createFile',
    });
  }, [node.name, setContextMenu]);

  const triggerCreateFolder = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const parentProfileId = getFolderDefaultProfileId(node) || 'system-1';
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}]에 생성할 새 폴더의 이름을 입력하세요.`,
      defaultValue: '',
      type: 'createFolder',
      initialProfileId: parentProfileId,
    });
  }, [node, setContextMenu]);

  const triggerFolderStyle = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const currentFolderProfileId = getFolderDefaultProfileId(node, undefined, false) || 'NONE';
    setPromptConfig({
      isOpen: true,
      title: `[${node.name}] 폴더의 기본 서식을 설정합니다.`,
      defaultValue: node.name,
      type: 'folderStyle',
      initialProfileId: currentFolderProfileId,
    });
  }, [node, setContextMenu]);

  const triggerRename = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const isDir = node.kind === 'directory';
    setPromptConfig({
      isOpen: true,
      title: isDir
        ? `'${node.name}' 폴더의 새 이름을 입력하세요.`
        : `'${node.name}' 파일의 새 이름을 입력하세요.`,
      defaultValue: node.name,
      type: 'rename',
    });
  }, [node.kind, node.name, setContextMenu]);

  const triggerCopy = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:copy-node', {
      detail: { node, parentHandle }
    }));
  }, [node, parentHandle, setContextMenu]);

  const triggerCut = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:cut-node', {
      detail: { node, parentHandle }
    }));
  }, [node, parentHandle, setContextMenu]);

  const triggerPaste = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    if (node.kind === 'directory' && !isOpen) {
      setIsOpen(true);
    }
    window.dispatchEvent(new CustomEvent('file:paste-node', {
      detail: {
        targetDirNode: node,
        targetHandle: node.kind === 'directory' ? node.handle : parentHandle
      }
    }));
  }, [node, parentHandle, isOpen, setIsOpen, setContextMenu]);

  const triggerReveal = useCallback(async (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    const api = (window as any).electronAPI;
    if (node.kind === 'file' && api?.showItemInFolder && node.path) {
      await api.showItemInFolder(node.path);
    } else if (api?.openPath && node.path) {
      await api.openPath(node.path);
    }
  }, [node.kind, node.path, setContextMenu]);

  const triggerCancelCut = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:cancel-cut'));
  }, [setContextMenu]);

  const triggerUndoMove = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    window.dispatchEvent(new CustomEvent('file:undo-move'));
  }, [setContextMenu]);

  const triggerDelete = useCallback((e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();
    setContextMenu(null);
    handleDelete(e);
  }, [handleDelete, setContextMenu]);

  return {
    promptConfig,
    setPromptConfig,
    isDragOver,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    onPromptConfirm,
    handleDelete,
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
  };
}
