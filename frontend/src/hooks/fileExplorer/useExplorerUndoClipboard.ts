/**
 * ====================================================================
 * 🏷️ 파일명 : useExplorerUndoClipboard.ts
 * 🎯 주요기능 : 파일 탐색기 전역 클립보드(복사/잘라내기/붙여넣기), 이동·삭제 실행 취소(Undo), 루트 드래그앤드롭 제어 훅
 * 🚨 @PATCH : 2026-11-04 — [FileExplorerPanel 모듈화 분리 및 누락 임포트 복원, 1·2단계 주석·오류 진단(logError/logWarn) 적용]
 *             1) FileExplorerPanel에서 복사/잘라내기/붙여넣기, 이동·삭제 되돌리기(Undo), 루트 드래그앤드롭 로직을 전용 훅으로 분리
 *             2) googleDriveClient(moveDriveItem, restoreDriveItem, copyDriveFile 등) 및 copyImageToClipboard 명시적 임포트로 런타임 ReferenceError 원천 차단
 *             3) onrivi-source-comments 및 onrivi-error-handling 스킬 규격 준수
 * ====================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { assertUndoNameAvailable } from '@/lib/explorerUndo';
import { useDragHighlight } from '@/hooks/useDragHighlight';
import { FileNode } from '@/lib/indexedDbHelper';
import { vfsRename, vfsCopyItem, vfsMoveItem } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  moveDriveItem,
  moveDriveItemWithUndo,
  restoreDriveItem,
  copyDriveFile,
  copyDriveFolderRecursive,
} from '@/lib/gdrive/googleDriveClient';
import { copyImageToClipboard } from '@/lib/mediaMarkup';

const BROWSER_STORAGE_NAME = '브라우저 로컬 저장소';

/**
 * ==== [restoreFsaDirectory] ====
 * 🎯 역할 : 브라우저 File System Access API 환경에서 백업된 폴더 구조 스냅샷을 재귀적으로 복원
 */
export const restoreFsaDirectory = async (
  parentHandle: any,
  folderName: string,
  items: { relativePath: string; kind: 'file' | 'directory'; content?: string | Blob }[]
) => {
  if (!parentHandle) throw new Error('복원할 폴더의 접근 권한을 확인해 주세요.');
  await assertUndoNameAvailable(parentHandle, folderName);
  const folderHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });
  const dirHandles = new Map<string, any>();
  dirHandles.set('', folderHandle);

  for (const item of items) {
    const parts = item.relativePath.split('/');
    if (item.kind === 'directory') {
      let current = folderHandle;
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!dirHandles.has(currentPath)) {
          const sub = await current.getDirectoryHandle(part, { create: true });
          dirHandles.set(currentPath, sub);
          current = sub;
        } else {
          current = dirHandles.get(currentPath)!;
        }
      }
    } else if (item.kind === 'file') {
      const fileName = parts.pop()!;
      let targetDir = folderHandle;
      if (parts.length > 0) {
        let curr = folderHandle;
        let cp = '';
        for (const p of parts) {
          cp = cp ? `${cp}/${p}` : p;
          if (!dirHandles.has(cp)) {
            const sub = await curr.getDirectoryHandle(p, { create: true });
            dirHandles.set(cp, sub);
            curr = sub;
          } else {
            curr = dirHandles.get(cp)!;
          }
        }
        targetDir = curr;
      }
      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(item.content || '');
      await writable.close();
    }
  }
};

export interface MoveActionItem {
  type: 'move';
  srcPath: string;
  destPath: string;
  srcDirPath: string;
  destDirPath: string;
  name: string;
  kind: 'file' | 'directory';
  workspaceType: string;
  sourceParentHandle?: any;
  destParentHandle?: any;
  srcNode?: FileNode;
  driveId?: string;
  srcParentDriveId?: string;
  destParentDriveId?: string;
  accountEmail?: string;
}

export interface DeleteActionItem {
  type: 'delete';
  path: string;
  parentPath: string;
  name: string;
  kind: 'file' | 'directory';
  workspaceType: string;
  content?: any;
  backupPath?: string;
  items?: any[];
  parentHandle?: any;
  driveId?: string;
  accountEmail?: string;
}

export type UndoActionItem = MoveActionItem | DeleteActionItem;

export interface UseExplorerUndoClipboardParams {
  rootFolder: any;
  workspaceType: string;
  currentFileNode: FileNode | null;
  isRestrictedUser: boolean;
  refreshFileList: (silent?: boolean) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * ==== [useExplorerUndoClipboard] ====
 * 🎯 역할 : 탐색기 복사/잘라내기/붙여넣기, 이동·삭제 되돌리기(Undo) 히스토리 스택, 루트 드래그앤드롭 이동을 통합 제어하는 커스텀 훅
 * 📥 파라미터 : UseExplorerUndoClipboardParams
 * 📤 반환값 : 클립보드 상태, Undo 상태, 복사/잘라내기/붙여넣기/되돌리기 핸들러, 루트 드래그앤드롭 핸들러
 */
export function useExplorerUndoClipboard({
  rootFolder,
  workspaceType,
  currentFileNode,
  isRestrictedUser,
  refreshFileList,
  showToast,
}: UseExplorerUndoClipboardParams) {
  const [clipboardNode, setClipboardNode] = useState<{ node: FileNode; parentHandle?: any; op?: 'copy' | 'cut' } | null>(null);
  const undoHistoryRef = useRef<UndoActionItem[]>([]);
  const undoBusyRef = useRef(false);
  const [hasUndoableMove, setHasUndoableMove] = useState(false);
  const [lastUndoType, setLastUndoType] = useState<'move' | 'delete'>('move');
  const [isDragOverRoot, setIsDragOverRoot] = useDragHighlight();

  /**
   * ==== [handleCancelCut] ====
   * 🎯 역할 : 잘라내기(cut) 선택 상태를 취소하고 반투명 시각 피드백을 즉시 해제
   */
  const handleCancelCut = useCallback(() => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (!clip || clip.op !== 'cut') return;

    const nodeName = clip.node?.name || '항목';
    setClipboardNode(null);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = null;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
    }
    showToast(`'${nodeName}' 잘라내기가 취소되었습니다.`, 'info');
  }, [clipboardNode, showToast]);

  /**
   * ==== [dispatchMovedEvent] ====
   * 🎯 역할 : 이동 완료 시 디렉토리 갱신 이벤트(file:moved) 및 열린 탭 동기화 이벤트(file:tab-renamed) 발송
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

  /**
   * ==== [handleUndoMove] ====
   * 🎯 역할 : 이동(move) 또는 삭제(delete) 이력 스택에서 직전 작업을 꺼내어 원래 상태로 완벽 복원
   */
  const handleUndoMove = useCallback(async () => {
    if (undoBusyRef.current || isRestrictedUser) return;
    undoBusyRef.current = true;
    try {
      const history = undoHistoryRef.current;
      if (history.length === 0) {
        showToast('되돌릴 작업이 없습니다.', 'info');
        return;
      }

      const lastAction = history.pop();
      setHasUndoableMove(history.length > 0);
      const nextLastType = history.length > 0 ? history[history.length - 1].type : 'move';
      setLastUndoType(nextLastType);
      window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: nextLastType } }));

      if (!lastAction) return;

      if (lastAction.type === 'move' || (!(lastAction as any).type && (lastAction as any).srcPath)) {
        const moveAction = lastAction as MoveActionItem;
        const { srcPath, destPath, srcDirPath, name, kind, sourceParentHandle, destParentHandle, workspaceType: moveWorkspaceType } = moveAction;
        const isDir = kind === 'directory';

        try {
          const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

          if (moveWorkspaceType === 'cloud') {
            const token = getSavedDriveToken();
            if (!token || !moveAction.driveId || !moveAction.srcParentDriveId) throw new Error('웹드라이브 연결과 원래 폴더를 확인해 주세요.');
            if (moveAction.accountEmail && moveAction.accountEmail !== getSavedWorkspaceInfo()?.userEmail) throw new Error('이 작업을 실행한 웹드라이브 계정으로 연결해 주세요.');
            await moveDriveItem(token, moveAction.driveId, moveAction.srcParentDriveId, moveAction.destParentDriveId);
          } else if ((moveWorkspaceType || workspaceType) === 'local' && api) {
            if (api?.moveFile) {
              const res = await api.moveFile(destPath, srcPath, { failIfExists: true });
              if (res?.success === false || res?.error) throw new Error(res.error || '원래 위치로 이동하지 못했습니다.');
            } else if (api?.renameFile) {
              await api.renameFile(destPath, srcPath);
            } else {
              const res = await fetch(getApiUrl('/api/rename'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: destPath, newPath: srcPath })
              });
              if (!res.ok) throw new Error('되돌리기 API 호출 실패');
            }
            if (isDir && destPath && srcPath) {
              try {
                const saved = localStorage.getItem('onrivi_expanded_paths');
                if (saved) {
                  const normDest = destPath.replace(/\\/g, '/').toLowerCase();
                  const paths: string[] = JSON.parse(saved);
                  const updated = paths.map(p => {
                    const normP = p.replace(/\\/g, '/').toLowerCase();
                    if (normP === normDest || normP.startsWith(normDest + '/')) {
                      return srcPath + p.slice(destPath.length);
                    }
                    return p;
                  });
                  localStorage.setItem('onrivi_expanded_paths', JSON.stringify(updated));
                }
              } catch (e) {
                logWarn({
                  file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
                  func: 'handleUndoMove',
                  doing: '이동 되돌리기 후 폴더 펼침 상태(onrivi_expanded_paths)를 복원하는 작업',
                  target: srcPath,
                  error: e,
                });
              }
            }
          } else if (destParentHandle && sourceParentHandle) {
            await assertUndoNameAvailable(sourceParentHandle, name);
            if (isDir) {
              const copyDirRecursive = async (sourceDirHandle: any, targetParentHandle: any, dirName: string) => {
                const newDir = await targetParentHandle.getDirectoryHandle(dirName, { create: true });
                for await (const [entryName, entryHandle] of sourceDirHandle.entries()) {
                  if (entryHandle.kind === 'directory') {
                    await copyDirRecursive(entryHandle, newDir, entryName);
                  } else {
                    const f = await entryHandle.getFile();
                    const newF = await newDir.getFileHandle(entryName, { create: true });
                    const w = await newF.createWritable();
                    await w.write(f);
                    await w.close();
                  }
                }
              };
              const targetDir = await destParentHandle.getDirectoryHandle(name);
              await copyDirRecursive(targetDir, sourceParentHandle, name);
              await destParentHandle.removeEntry(name, { recursive: true });
            } else {
              const fileHandle = await destParentHandle.getFileHandle(name);
              const file = await fileHandle.getFile();
              const newFileHandle = await sourceParentHandle.getFileHandle(name, { create: true });
              const writable = await newFileHandle.createWritable();
              await writable.write(file);
              await writable.close();
              await destParentHandle.removeEntry(name);
            }
          } else if (destPath && srcPath) {
            vfsMoveItem(destPath, srcDirPath);
          }

          if (moveWorkspaceType !== 'cloud') dispatchMovedEvent(destPath, srcDirPath, srcPath, name);
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: srcDirPath }
          }));
          showToast(`'${name}'을(를) 원래 위치로 되돌렸습니다.`, 'success');
        } catch (err: any) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
            func: 'handleUndoMove',
            doing: '이동된 파일/폴더를 원래 위치로 되돌리는(Undo) 작업',
            target: destPath || name,
            error: err
          });
          showToast(`이동 되돌리기 실패: ${err.message || err}`, 'error');
          history.push(lastAction);
          setHasUndoableMove(true);
          setLastUndoType('move');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: 'move' } }));
        }
      } else if (lastAction.type === 'delete') {
        const delAction = lastAction as DeleteActionItem;
        const { path, parentPath, name, kind, content = '', backupPath, items = [], parentHandle } = delAction;
        const isDir = kind === 'directory';
        const deleteWorkspaceType = delAction.workspaceType || workspaceType;
        try {
          if (deleteWorkspaceType === 'cloud') {
            const token = getSavedDriveToken();
            if (!token || !delAction.driveId) throw new Error('웹드라이브 연결과 복원할 항목 ID를 확인해 주세요.');
            if (delAction.accountEmail && delAction.accountEmail !== getSavedWorkspaceInfo()?.userEmail) throw new Error('이 항목을 삭제한 웹드라이브 계정으로 연결해 주세요.');
            await restoreDriveItem(token, delAction.driveId);
            await refreshFileList(true);
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            showToast(`삭제되었던 '${name}'을(를) 웹드라이브에 복원했습니다.`, 'success');
          } else if (isDir) {
            if (deleteWorkspaceType === 'browser') {
              if (parentHandle) {
                await restoreFsaDirectory(parentHandle, name, items);
              } else {
                const { vfsCreateFolder, vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
                vfsCreateFolder(parentPath, name);
                for (const item of items) {
                  const subParent = item.relativePath.includes('/')
                    ? `${path}/${item.relativePath.substring(0, item.relativePath.lastIndexOf('/'))}`
                    : path;
                  const fileName = item.relativePath.includes('/')
                    ? item.relativePath.substring(item.relativePath.lastIndexOf('/') + 1)
                    : item.relativePath;
                  const filePath = `${path}/${item.relativePath}`;
                  vfsCreateFile(subParent, fileName);
                  vfsWriteFile(filePath, item.content || '');
                }
              }
            } else {
              const api = (window as any).electronAPI;
              if (api?.restoreFolderFromUndo && backupPath) {
                const res = await api.restoreFolderFromUndo(backupPath, path);
                if (res?.success === false || res?.error) throw new Error(res.error || '폴더 복원에 실패했습니다.');
              } else throw new Error('폴더 백업을 찾을 수 없어 복원하지 못했습니다.');
            }

            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              const paths: string[] = saved ? JSON.parse(saved) : [];
              const normPath = path.replace(/\\/g, '/').toLowerCase();
              if (!paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normPath)) {
                paths.push(path);
                localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
              }
            } catch {}

            await refreshFileList(true);
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
              detail: { force: true, targetDir: parentPath }
            }));
            showToast(`삭제되었던 '${name}' 폴더를 탐색기에 복원했습니다.`, 'success');
          } else {
            if (deleteWorkspaceType === 'browser') {
              if (parentHandle && kind === 'file') {
                await assertUndoNameAvailable(parentHandle, name);
                const handle = await parentHandle.getFileHandle(name, { create: true });
                const w = await handle.createWritable();
                await w.write(content);
                await w.close();
              } else {
                const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
                vfsCreateFile(parentPath, name);
                vfsWriteFile(path, content);
              }
            } else {
              const api = (window as any).electronAPI;
              if (api?.createFile && api?.saveFile) {
                const res = await api.createFile(parentPath, name);
                if (res?.success) {
                  const saved = await api.saveFile(res.path || path, content);
                  if (saved === false || saved?.success === false) throw new Error(saved?.error || '복원한 파일을 저장하지 못했습니다.');
                } else throw new Error(res?.error || '복원할 파일을 만들지 못했습니다.');
              } else {
                const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
                vfsCreateFile(parentPath, name);
                vfsWriteFile(path, content);
              }
            }
            await refreshFileList(true);
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
              detail: { force: true, targetDir: parentPath }
            }));
            showToast(`삭제되었던 '${name}'을(를) 탐색기에 복원했습니다.`, 'success');
          }
        } catch (err: any) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
            func: 'handleUndoMove',
            doing: '삭제된 파일/폴더를 복원하는(Undo) 작업',
            target: path || name,
            error: err
          });
          showToast(`삭제 되돌리기 실패: ${err.message || err}`, 'error');
          history.push(lastAction);
          setHasUndoableMove(true);
          setLastUndoType('delete');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: history.length, lastType: 'delete' } }));
        }
      }
    } finally {
      undoBusyRef.current = false;
    }
  }, [workspaceType, refreshFileList, showToast, dispatchMovedEvent, isRestrictedUser]);

  /**
   * ==== [triggerUndo] ====
   * 🎯 역할 : 되돌리기 단축키(Ctrl+Z) 통합 트리거 (잘라내기 취소 우선, 그 다음 이동/삭제 되돌리기)
   */
  const triggerUndo = useCallback(() => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (clip && clip.op === 'cut') {
      handleCancelCut();
      return;
    }
    if (undoHistoryRef.current.length > 0) {
      handleUndoMove();
    } else {
      showToast('되돌릴 작업이 없습니다.', 'info');
    }
  }, [clipboardNode, handleCancelCut, handleUndoMove, showToast]);

  const handleCopyNode = useCallback((targetNode?: FileNode, parentHandle?: any) => {
    const nodeToCopy = targetNode || currentFileNode;
    if (!nodeToCopy) {
      showToast('복사할 파일 또는 폴더를 선택하세요.', 'warning');
      return;
    }
    const item = { node: nodeToCopy, parentHandle, op: 'copy' as const };
    setClipboardNode(item);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = item;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: item }));
    }

    const isImageFile = nodeToCopy.kind === 'file' && /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(nodeToCopy.name);
    if (isImageFile) {
      const imgPath = nodeToCopy.path || nodeToCopy.name;
      void copyImageToClipboard(imgPath);
    }

    showToast(`'${nodeToCopy.name}'이(가) 클립보드에 복사되었습니다.`, 'success');
  }, [currentFileNode, showToast]);

  const handleCutNode = useCallback((targetNode?: FileNode, parentHandle?: any) => {
    const nodeToCut = targetNode || currentFileNode;
    if (!nodeToCut) {
      showToast('잘라낼 파일 또는 폴더를 선택하세요.', 'warning');
      return;
    }

    const item = { node: nodeToCut, parentHandle, op: 'cut' as const };
    setClipboardNode(item);
    if (typeof window !== 'undefined') {
      (window as any)._omdClipboardNode = item;
      window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: item }));
    }
    showToast(`'${nodeToCut.name}'이(가) 잘라내기되었습니다. 붙여넣을 위치를 선택하세요.`, 'info');
  }, [currentFileNode, showToast]);

  /**
   * ==== [handlePasteNode] ====
   * 🎯 역할 : 클립보드에 복사/잘라낸 파일 또는 폴더를 대상 디렉토리에 붙여넣기/이동 수행
   */
  const handlePasteNode = useCallback(async (targetDirNode?: FileNode, targetHandle?: any) => {
    const clip = clipboardNode || (typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null);
    if (!clip || !clip.node) {
      showToast('클립보드에 복사되거나 잘라낸 파일 또는 폴더가 없습니다.', 'warning');
      return;
    }

    const srcNode = clip.node;
    const isCut = clip.op === 'cut';
    let destDirPath = targetDirNode ? (targetDirNode.path || '') : '';
    if (!targetDirNode) {
      if (workspaceType === 'local') {
        destDirPath = (rootFolder?.name || rootFolder?.path || '');
      } else {
        destDirPath = (rootFolder?.path && rootFolder.path !== BROWSER_STORAGE_NAME && rootFolder.path !== '브라우저 로컬 저장소')
          ? rootFolder.path
          : '';
      }
    }

    if (targetDirNode && targetDirNode.kind === 'file') {
      const lastSlash = Math.max(destDirPath.lastIndexOf('\\'), destDirPath.lastIndexOf('/'));
      destDirPath = lastSlash >= 0 ? destDirPath.substring(0, lastSlash) : '';
    }

    if (isCut && srcNode.path) {
      const normSrc = srcNode.path.replace(/\\/g, '/').toLowerCase();
      const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
      const normDest = destDirPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      if (normSrc === normDest || srcDir === normDest) {
        showToast('동일한 위치로는 이동할 수 없습니다.', 'warning');
        return;
      }
      if (srcNode.kind === 'directory' && (normDest === normSrc || normDest.startsWith(normSrc + '/'))) {
        showToast('하위 폴더로는 이동할 수 없습니다.', 'warning');
        return;
      }
    }

    try {
      if (workspaceType === 'cloud' || rootFolder?.type === 'GDRIVE') {
        const token = getSavedDriveToken();
        if (!token) {
          showToast('구글 드라이브 인증 토큰이 없습니다. 다시 연결해 주세요.', 'error');
          return;
        }

        const srcDriveId = (srcNode as any).driveFileId || (srcNode as any).driveId || (srcNode as any).id;
        if (!srcDriveId) {
          showToast('구글 드라이브 파일 ID를 찾을 수 없습니다.', 'error');
          return;
        }

        let destDriveId: string | undefined;
        if (targetDirNode && targetDirNode.kind === 'directory') {
          destDriveId = (targetDirNode as any).driveFileId || (targetDirNode as any).driveId || (targetDirNode as any).id;
        }
        if (!destDriveId) {
          const wsInfo = getSavedWorkspaceInfo();
          destDriveId = wsInfo?.workspaceFolderId;
        }
        if (!destDriveId) {
          showToast('붙여넣기 대상 폴더를 확인할 수 없습니다.', 'error');
          return;
        }

        if (isCut) {
          const srcParentDriveId = (srcNode as any).parentDriveId || (srcNode as any).parentId;
          await moveDriveItemWithUndo(token, srcDriveId, destDriveId, srcParentDriveId, srcNode);
          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          const isFolder = srcNode.kind === 'directory';
          if (isFolder) {
            await copyDriveFolderRecursive(token, srcDriveId, destDriveId, srcNode.name);
          } else {
            const ext = srcNode.name.match(/\.[^.]+$/)?.[0] ?? '';
            const base = ext ? srcNode.name.slice(0, -ext.length) : srcNode.name;
            const wsInfo = getSavedWorkspaceInfo();
            const isSameFolder = destDriveId === wsInfo?.workspaceFolderId;
            const copyName = isSameFolder ? `${base}_copy${ext}` : srcNode.name;
            await copyDriveFile(token, srcDriveId, destDriveId, copyName);
          }
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', { detail: { force: true } }));
        return;
      }

      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (workspaceType === 'local' && api) {
        if (srcNode.path) {
          const cleanDestDir = destDirPath.replace(/[/\\]+$/, '');
          const sep = cleanDestDir.includes('/') ? '/' : '\\';
          const newPath = cleanDestDir ? `${cleanDestDir}${sep}${srcNode.name}` : srcNode.name;

          if (isCut) {
            let movedPath = newPath;
            if (api?.moveFile) {
              const res = await api.moveFile(srcNode.path, newPath);
              if (res && res.error) throw new Error(res.error);
              if (res && res.newPath) movedPath = res.newPath;
            } else if (api?.renameFile) {
              await api.renameFile(srcNode.path, newPath);
            }
            showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
            dispatchMovedEvent(srcNode.path, cleanDestDir, movedPath, srcNode.name);

            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              const normCleanDest = cleanDestDir.replace(/\\/g, '/').toLowerCase();
              if (cleanDestDir && !paths.some(p => p.replace(/\\/g, '/').toLowerCase() === normCleanDest)) {
                paths.push(cleanDestDir);
              }
              if (srcNode.kind === 'directory' && srcNode.path) {
                const normSrc = srcNode.path.replace(/\\/g, '/').toLowerCase();
                paths = paths.map((p: string) => {
                  const np = p.replace(/\\/g, '/').toLowerCase();
                  if (np === normSrc) return movedPath;
                  if (np.startsWith(normSrc + '/')) {
                    const sub = p.substring(srcNode.path!.length);
                    return `${movedPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
                  }
                  return p;
                });
              }
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch (expErr) {
              logWarn({
                file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
                func: 'handlePasteNode',
                doing: '로컬 파일/폴더 이동 후 펼침 경로(onrivi_expanded_paths)를 갱신하는 작업',
                target: cleanDestDir,
                error: expErr,
              });
            }

            const normSrc = srcNode.path.replace(/\\/g, '/');
            const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
            undoHistoryRef.current.push({
              type: 'move',
              srcPath: srcNode.path,
              destPath: movedPath,
              srcDirPath: srcDir,
              destDirPath: cleanDestDir,
              name: srcNode.name,
              kind: srcNode.kind || 'file',
              workspaceType: 'local',
              srcNode
            });
            setHasUndoableMove(true);
            setLastUndoType('move');
            window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

            setClipboardNode(null);
            if (typeof window !== 'undefined') {
              (window as any)._omdClipboardNode = null;
              window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
            }
          } else {
            if (api?.copyFile) {
              const res = await api.copyFile(srcNode.path, newPath);
              if (res && res.error) throw new Error(res.error);
              showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
            }
          }
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: cleanDestDir }
          }));
          return;
        }
      }

      const effectiveDirHandle = targetHandle || (targetDirNode?.kind === 'directory' ? targetDirNode.handle : null) || rootFolder?.handle;
      if (effectiveDirHandle && typeof effectiveDirHandle.getFileHandle === 'function') {
        const srcName = srcNode.name;
        const isDir = srcNode.kind === 'directory';
        let ext = '';
        let baseName = srcName;
        if (!isDir) {
          const extMatch = srcName.match(/\.[^.]+$/);
          ext = extMatch ? extMatch[0] : '';
          baseName = ext ? srcName.slice(0, -ext.length) : srcName;
        }

        let newName = srcName;
        let counter = 0;
        while (true) {
          try {
            const checkName = counter === 0
              ? srcName
              : `${baseName}_copy${counter > 1 ? counter : ''}${ext}`;
            if (isDir) {
              await effectiveDirHandle.getDirectoryHandle(checkName);
            } else {
              await effectiveDirHandle.getFileHandle(checkName);
            }
            counter++;
          } catch {
            newName = (counter === 0 && destDirPath === (srcNode.path ? srcNode.path.substring(0, srcNode.path.lastIndexOf('/')) : ''))
              ? `${baseName}_copy${ext}`
              : (counter === 0 ? srcName : `${baseName}_copy${counter > 1 ? counter : ''}${ext}`);
            break;
          }
        }

        if (isDir && srcNode.handle) {
          const copyDirRecursive = async (sourceDirHandle: any, targetParentHandle: any, dirName: string) => {
            const newDir = await targetParentHandle.getDirectoryHandle(dirName, { create: true });
            for await (const [entryName, entryHandle] of sourceDirHandle.entries()) {
              if (entryHandle.kind === 'directory') {
                await copyDirRecursive(entryHandle, newDir, entryName);
              } else {
                const f = await entryHandle.getFile();
                const newF = await newDir.getFileHandle(entryName, { create: true });
                const w = await newF.createWritable();
                await w.write(f);
                await w.close();
              }
            }
          };
          await copyDirRecursive(srcNode.handle, effectiveDirHandle, isCut ? srcName : newName);
        } else {
          let content: any = null;
          if (srcNode.handle && typeof srcNode.handle.getFile === 'function') {
            content = await srcNode.handle.getFile();
          } else if ((srcNode as any).content) {
            content = (srcNode as any).content;
          }

          const targetFileName = isCut ? srcName : newName;
          const newFileHandle = await effectiveDirHandle.getFileHandle(targetFileName, { create: true });
          const writable = await newFileHandle.createWritable();
          if (content instanceof Blob || content instanceof File) {
            await writable.write(content);
          } else {
            await writable.write(content || '');
          }
          await writable.close();
        }

        let sourceParentHandle = clip.parentHandle;
        if (!sourceParentHandle && rootFolder?.handle) {
          let normSrc = (srcNode.path || '').replace(/\\/g, '/');
          const rootNorm = (rootFolder?.path || '').replace(/\\/g, '/');
          if (rootNorm && normSrc.startsWith(rootNorm + '/')) {
            normSrc = normSrc.slice(rootNorm.length + 1);
          } else if (rootNorm && normSrc === rootNorm) {
            normSrc = '';
          }
          if (rootFolder?.name && normSrc.startsWith(rootFolder.name + '/')) {
            normSrc = normSrc.slice(rootFolder.name.length + 1);
          }
          normSrc = normSrc.replace(/^\/+/, '');

          const parts = normSrc.split('/').filter(Boolean);
          if (parts.length <= 1) {
            sourceParentHandle = rootFolder.handle;
          } else {
            try {
              let curr = rootFolder.handle;
              for (let i = 0; i < parts.length - 1; i++) {
                curr = await curr.getDirectoryHandle(parts[i]);
              }
              sourceParentHandle = curr;
            } catch (pErr) {
              logWarn({
                file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
                func: 'handlePasteNode',
                doing: '브라우저 FSA 잘라내기 이동 중 원본 부모 폴더 핸들을 탐색하는 작업',
                target: normSrc,
                error: pErr,
              });
            }
          }
        }
        if (isCut && sourceParentHandle && typeof sourceParentHandle.removeEntry === 'function' && sourceParentHandle !== effectiveDirHandle) {
          try {
            await sourceParentHandle.removeEntry(srcNode.name, { recursive: isDir });
          } catch (delErr) {
            logWarn({
              file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
              func: 'handlePasteNode',
              doing: '브라우저 FSA 잘라내기 이동 후 원본 항목을 제거하는 작업',
              target: srcNode.name,
              error: delErr,
            });
          }
        }
        if (isCut) {
          const normSrc = (srcNode.path || srcNode.name).replace(/\\/g, '/');
          const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
          const newPath = destDirPath ? `${destDirPath}/${srcNode.name}` : srcNode.name;

          if (srcNode.kind === 'directory' && srcNode.path) {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              if (destDirPath && !paths.includes(destDirPath)) {
                paths.push(destDirPath);
              }
              paths = paths.map((p: string) => {
                const np = p.replace(/\\/g, '/');
                if (np === normSrc) return newPath;
                if (np.startsWith(normSrc + '/')) {
                  const sub = np.substring(normSrc.length);
                  return `${newPath}${sub}`;
                }
                return p;
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch {}
          }
          undoHistoryRef.current.push({
            type: 'move',
            srcPath: srcNode.path || srcNode.name,
            destPath: newPath,
            srcDirPath: srcDir,
            destDirPath: destDirPath,
            name: srcNode.name,
            kind: srcNode.kind || 'file',
            workspaceType: 'browser',
            sourceParentHandle: sourceParentHandle,
            destParentHandle: effectiveDirHandle,
            srcNode
          });
          setHasUndoableMove(true);
          setLastUndoType('move');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

          dispatchMovedEvent(srcNode.path || srcNode.name, destDirPath, newPath, srcNode.name);

          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: destDirPath }
        }));
        return;
      }

      if (srcNode.path) {
        if (isCut) {
          const newPath = vfsMoveItem(srcNode.path, destDirPath);

          if (srcNode.kind === 'directory') {
            try {
              const saved = localStorage.getItem('onrivi_expanded_paths');
              let paths: string[] = saved ? JSON.parse(saved) : [];
              if (destDirPath && !paths.includes(destDirPath)) {
                paths.push(destDirPath);
              }
              const normSrc = srcNode.path.replace(/\\/g, '/');
              paths = paths.map((p: string) => {
                const np = p.replace(/\\/g, '/');
                if (np === normSrc) return newPath;
                if (np.startsWith(normSrc + '/')) {
                  return `${newPath}${np.substring(normSrc.length)}`;
                }
                return p;
              });
              localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
            } catch {}
          }

          const normSrc = srcNode.path.replace(/\\/g, '/');
          const srcDir = normSrc.includes('/') ? normSrc.substring(0, normSrc.lastIndexOf('/')) : '';
          undoHistoryRef.current.push({
            type: 'move',
            srcPath: srcNode.path,
            destPath: newPath,
            srcDirPath: srcDir,
            destDirPath: destDirPath,
            name: srcNode.name,
            kind: srcNode.kind || 'file',
            workspaceType: 'vfs',
            srcNode
          });
          setHasUndoableMove(true);
          setLastUndoType('move');
          window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

          dispatchMovedEvent(srcNode.path, destDirPath, newPath, srcNode.name);

          setClipboardNode(null);
          if (typeof window !== 'undefined') {
            (window as any)._omdClipboardNode = null;
            window.dispatchEvent(new CustomEvent('file:clipboard-changed', { detail: null }));
          }
          showToast(`'${srcNode.name}'을(를) 이동했습니다.`, 'success');
        } else {
          vfsCopyItem(srcNode.path, destDirPath);
          showToast(`'${srcNode.name}'을(를) 붙여넣었습니다.`, 'success');
        }
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: destDirPath }
        }));
        return;
      }
    } catch (e: any) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
        func: 'handlePasteNode',
        doing: `클립보드의 파일/폴더를 대상 경로로 ${isCut ? '이동' : '붙여넣기'}하는 작업`,
        target: destDirPath || srcNode.name,
        error: e
      });
      showToast((isCut ? '이동' : '붙여넣기') + ' 실패: ' + (e.message || e), 'error');
    }
  }, [clipboardNode, rootFolder, workspaceType, showToast, refreshFileList, dispatchMovedEvent]);

  useEffect(() => {
    const onCopyEvent = (e: any) => handleCopyNode(e.detail?.node, e.detail?.parentHandle);
    const onCutEvent = (e: any) => handleCutNode(e.detail?.node, e.detail?.parentHandle);
    const onPasteEvent = (e: any) => handlePasteNode(e.detail?.targetDirNode, e.detail?.targetHandle);
    const onCancelCutEvent = () => handleCancelCut();
    const onUndoMoveEvent = () => handleUndoMove();

    const onPushUndoAction = (e: any) => {
      if (e.detail) {
        undoHistoryRef.current.push(e.detail);
        setHasUndoableMove(true);
        setLastUndoType(e.detail.type || 'delete');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', {
          detail: { count: undoHistoryRef.current.length, lastType: e.detail.type || 'delete' }
        }));
      }
    };

    window.addEventListener('file:copy-node', onCopyEvent);
    window.addEventListener('file:cut-node', onCutEvent);
    window.addEventListener('file:paste-node', onPasteEvent);
    window.addEventListener('file:cancel-cut', onCancelCutEvent);
    window.addEventListener('file:undo-move', onUndoMoveEvent);
    window.addEventListener('file:push-undo-action', onPushUndoAction);
    return () => {
      window.removeEventListener('file:copy-node', onCopyEvent);
      window.removeEventListener('file:cut-node', onCutEvent);
      window.removeEventListener('file:paste-node', onPasteEvent);
      window.removeEventListener('file:cancel-cut', onCancelCutEvent);
      window.removeEventListener('file:undo-move', onUndoMoveEvent);
      window.removeEventListener('file:push-undo-action', onPushUndoAction);
    };
  }, [handleCopyNode, handleCutNode, handlePasteNode, handleCancelCut, handleUndoMove]);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
      const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
        if (clip && clip.op === 'cut') {
          handleCancelCut();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        const target = e.target as HTMLElement;
        if (target) {
          const isFormElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          const isInsideMonaco = !!target.closest('.monaco-editor');
          if (isFormElement || isInsideMonaco) {
            return;
          }
        }
        const clip = typeof window !== 'undefined' ? (window as any)._omdClipboardNode : null;
        if (clip && clip.op === 'cut') {
          e.preventDefault();
          e.stopPropagation();
          handleCancelCut();
        } else if (undoHistoryRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleUndoMove();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [handleCancelCut, handleUndoMove]);

  const handleDragOverRoot = useCallback((e: React.DragEvent) => {
    if (isRestrictedUser || !Array.from(e.dataTransfer.types).includes('sourcepath')) {
      setIsDragOverRoot(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverRoot(true);
  }, [isRestrictedUser, setIsDragOverRoot]);

  const handleDragLeaveRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverRoot(false);
  }, [setIsDragOverRoot]);

  /**
   * ==== [handleDropRoot] ====
   * 🎯 역할 : 드래그 앤 드롭한 파일/폴더를 최상위 루트 폴더로 이동
   */
  const handleDropRoot = useCallback(async (e: React.DragEvent) => {
    setIsDragOverRoot(false);
    if (isRestrictedUser) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRoot(false);

    const draggedNode = typeof window !== 'undefined' ? (window as any)._draggedNode : null;
    const draggedNodeParent = typeof window !== 'undefined' ? (window as any)._draggedNodeParentHandle : null;
    const sourcePath = e.dataTransfer.getData('sourcePath') || e.dataTransfer.getData('sourcepath') || draggedNode?.path || '';
    const sourceName = e.dataTransfer.getData('sourceName') || e.dataTransfer.getData('sourcename') || draggedNode?.name || '';
    const sourceKind = e.dataTransfer.getData('sourceKind') || e.dataTransfer.getData('sourcekind') || draggedNode?.kind || 'file';
    const sourceParentPath = typeof window !== 'undefined' ? (window as any)._draggedNodeParentPath : null;

    const actualRootPath = (workspaceType === 'local' ? rootFolder?.name : rootFolder?.path) || '';

    const normSource = sourcePath.replace(/\\/g, '/').toLowerCase();
    const normRoot = actualRootPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    const normSourceParent = (sourceParentPath || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

    if (!sourcePath || normSource === normRoot) return;
    if (normSourceParent && normSourceParent === normRoot) {
      showToast('이미 최상위 루트 폴더에 위치해 있습니다.', 'info');
      return;
    }

    try {
      if (workspaceType === 'cloud' || rootFolder?.type === 'GDRIVE') {
        const token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        const rootDriveId = wsInfo?.workspaceFolderId;
        const srcDriveId = draggedNode?.driveFileId || draggedNode?.driveId || (draggedNode as any)?.id;

        if (!token) {
          showToast('구글 드라이브 토큰이 없습니다. 다시 연결해 주세요.', 'error');
          return;
        }
        if (!srcDriveId || !rootDriveId) {
          showToast('구글 드라이브 파일 또는 루트 폴더 ID를 찾을 수 없습니다.', 'error');
          return;
        }
        if (srcDriveId === rootDriveId) return;

        const srcParentDriveId = (draggedNode as any)?.parentDriveId || (draggedNode as any)?.parentId;
        await moveDriveItemWithUndo(token, srcDriveId, rootDriveId, srcParentDriveId, { name: sourceName, kind: sourceKind });
        showToast(`'${sourceName}' 루트로 이동 완료`, 'success');

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: rootDriveId }
        }));
        return;
      }

      if (workspaceType === 'local') {
        const rootPath = actualRootPath.replace(/[/\\]+$/, '');
        const sep = rootPath.includes('/') ? '/' : '\\';
        const newPath = rootPath ? `${rootPath}${sep}${sourceName}` : sourceName;
        const api = (window as any).electronAPI;
        let movedPath = newPath;
        if (api?.moveFile) {
          const res = await api.moveFile(sourcePath, newPath);
          if (res && res.error) throw new Error(res.error);
          if (res && res.newPath) movedPath = res.newPath;
        } else if (api?.renameFile) {
          await api.renameFile(sourcePath, newPath);
        } else {
          const res = await fetch(getApiUrl('/api/rename'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: sourcePath, newPath })
          });
          if (!res.ok) throw new Error('루트 이동 실패');
        }

        showToast(`'${sourceName}' 루트로 이동 완료`, 'success');
        dispatchMovedEvent(sourcePath, rootPath, movedPath, sourceName);

        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          if (saved && draggedNode?.kind === 'directory') {
            const normSrc = sourcePath.replace(/\\/g, '/').toLowerCase();
            let paths: string[] = JSON.parse(saved);
            paths = paths.map((p: string) => {
              const np = p.replace(/\\/g, '/').toLowerCase();
              if (np === normSrc) return movedPath;
              if (np.startsWith(normSrc + '/')) {
                const sub = p.substring(sourcePath.length);
                return `${movedPath}${sep === '\\' ? sub.replace(/\//g, '\\') : sub.replace(/\\/g, '/')}`;
              }
              return p;
            });
            localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
          }
        } catch {}

        undoHistoryRef.current.push({
          type: 'move',
          srcPath: sourcePath,
          destPath: movedPath,
          srcDirPath: sourceParentPath || '',
          destDirPath: rootPath,
          name: sourceName,
          kind: draggedNode?.kind || 'file',
          workspaceType: 'local',
          srcNode: draggedNode
        });
        setHasUndoableMove(true);
        setLastUndoType('move');
        window.dispatchEvent(new CustomEvent('file:move-history-changed', { detail: { count: undoHistoryRef.current.length, lastType: 'move' } }));

        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: rootPath }
        }));
        return;
      } else if (workspaceType === 'browser') {
        if (draggedNode && draggedNode.handle && rootFolder?.handle) {
          const targetDirHandle = rootFolder.handle as FileSystemDirectoryHandle;
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
          showToast(`'${draggedNode.name}' 루트로 이동 완료`, 'success');
          const newPath = rootFolder.path ? `${rootFolder.path}/${draggedNode.name}` : draggedNode.name;
          dispatchMovedEvent(sourcePath, rootFolder.path || '', newPath, draggedNode.name, finalNewHandle);
          await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        } else if (sourcePath) {
          const oldPath = sourcePath;
          const normalizedPath = oldPath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const filename = lastSlashIndex !== -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath;
          const newPath = rootFolder?.path ? `${rootFolder.path}/${filename}` : filename;

          vfsRename(oldPath, newPath);
          showToast(`'${filename}' 루트로 이동 완료`, 'success');
          dispatchMovedEvent(oldPath, rootFolder?.path || '', newPath, filename);
          await refreshFileList();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        }
      }
    } catch (e) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useExplorerUndoClipboard.ts',
        func: 'handleDropRoot',
        doing: '드래그 앤 드롭한 항목을 최상위 루트 폴더로 이동하는 작업',
        target: sourcePath || sourceName,
        error: e
      });
      showToast('이동 실패: ' + e, 'error');
    }
  }, [isRestrictedUser, workspaceType, rootFolder, showToast, refreshFileList, dispatchMovedEvent, setIsDragOverRoot]);

  return {
    clipboardNode,
    setClipboardNode,
    undoHistoryRef,
    hasUndoableMove,
    lastUndoType,
    isDragOverRoot,
    setIsDragOverRoot,
    handleCancelCut,
    dispatchMovedEvent,
    handleUndoMove,
    triggerUndo,
    handleCopyNode,
    handleCutNode,
    handlePasteNode,
    handleDragOverRoot,
    handleDragLeaveRoot,
    handleDropRoot,
  };
}
