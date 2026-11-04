/**
 * ====================================================================
 * 🏷️ 파일명 : useDocumentImporter.ts
 * 🎯 주요기능 : 외부 문서(DOCX, HWP, PDF, EPUB, TXT, MD, HTML) 선택·마크다운 변환·이미지 리소스 추출 및 워크스페이스 저장 훅
 * 🚨 @PATCH : 2026-11-04 — [FileExplorerPanel 모듈화 분리 및 누락 임포트 복원, 1·2단계 주석·오류 진단(logError) 적용]
 *             1) FileExplorerPanel에서 로컬/웹드라이브 문서 가져오기(openImportPicker, handleImportFile) 파이프라인을 전용 훅으로 분리
 *             2) prepareGoogleDriveAuth, readDriveImportFile, uploadDriveImage 등 누락되었던 드라이브 헬퍼를 명시적으로 임포트하여 런타임 에러 차단
 *             3) onrivi-source-comments 및 onrivi-error-handling 스킬 규격 준수
 * ====================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { IMPORT_PICKER_OPTIONS, isSupportedImportFile } from '@/lib/importFormats';
import { importStartFolder } from '@/lib/importStartFolder';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { FileNode } from '@/lib/indexedDbHelper';
import { logError } from '@/lib/errorDiagnostics';
import {
  uploadDriveImage,
  getSavedDriveToken,
  hasValidDriveToken,
  getSavedWorkspaceInfo,
  prepareGoogleDriveAuth,
  readDriveImportFile,
} from '@/lib/gdrive/googleDriveClient';

export interface UseDocumentImporterParams {
  rootFolder: any;
  resourceFolderHandle: any;
  workspaceType: string;
  fileList: FileNode[];
  isRestrictedUser: boolean;
  openFile: (node: FileNode | null, parentHandle?: any) => void;
  refreshFileList: (silent?: boolean) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * ==== [useDocumentImporter] ====
 * 🎯 역할 : 외부 문서를 로컬/웹드라이브에서 선택하고 마크다운 및 미디어 리소스로 변환·저장하는 커스텀 훅
 * 📥 파라미터 : UseDocumentImporterParams
 * 📤 반환값 : 가져오기 상태(isImporting, pendingImportFile, showImportSource), refs 및 openImportPicker/handleImportFile 핸들러
 */
export function useDocumentImporter({
  rootFolder,
  resourceFolderHandle,
  workspaceType,
  fileList,
  isRestrictedUser,
  openFile,
  refreshFileList,
  showToast,
}: UseDocumentImporterParams) {
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showImportSource, setShowImportSource] = useState(false);
  const selectingImportRef = useRef(false);
  const importNameRef = useRef<string | null>(null);
  const targetImportNodeRef = useRef<FileNode | null>(null);
  const targetImportParentHandleRef = useRef<any>(null);

  /**
   * ==== [chooseImportDestination] ====
   * 🎯 역할 : 가져올 파일 확장자를 검증하고 저장 폴더/파일명 선택 모달 상태(pendingImportFile)를 활성화
   */
  const chooseImportDestination = useCallback((file: File) => {
    if (!isSupportedImportFile(file.name)) {
      showToast('지원하지 않는 파일 형식입니다.', 'warning');
      return;
    }
    setPendingImportFile(file);
  }, [showToast]);

  /**
   * ==== [openImportPicker] ====
   * 🎯 역할 : 로컬(Electron/FSA/input) 또는 웹드라이브(Google Drive)에서 가져올 문서 파일을 선택하는 피커 실행
   */
  const openImportPicker = useCallback(async (source?: 'local' | 'drive') => {
    if (isRestrictedUser || isImporting || selectingImportRef.current) return;
    if (!source) {
      setShowImportSource(true);
      return;
    }
    setShowImportSource(false);
    const start = importStartFolder(rootFolder, targetImportNodeRef.current, targetImportParentHandleRef.current, fileList, getSavedWorkspaceInfo()?.workspacePath);
    if (source === 'drive') {
      selectingImportRef.current = true;
      const prepared = !getSavedDriveToken() || !hasValidDriveToken() ? prepareGoogleDriveAuth({ isStandalone: true }) : null;
      try {
        const token = prepared ? await prepared.request() : getSavedDriveToken();
        if (!token) throw new Error('웹드라이브 인증이 필요합니다.');
        const { pickAccessibleDriveFolder } = await import('@/lib/gdrive/WorkspaceFolderPicker');
        const initialPath = !prepared ? start.drivePath : [{ id: 'root', name: '내 드라이브' }];
        const selected = await pickAccessibleDriveFolder(token, initialPath, {
          title: '웹드라이브에서 파일 가져오기',
          description: '계정·드라이브·폴더를 선택한 뒤 가져올 문서를 눌러 주세요. 원본 파일은 유지됩니다.',
          selectFile: true,
          acceptFile: item => isSupportedImportFile(item.name) && !item.mimeType.startsWith('application/vnd.google-apps.'),
        });
        if (selected) chooseImportDestination(await readDriveImportFile(selected.token || token, selected));
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useDocumentImporter.ts',
            func: 'openImportPicker',
            doing: '구글 드라이브에서 가져올 파일을 선택 및 로드하는 작업',
            target: 'GDRIVE_IMPORT',
            error
          });
          showToast(error?.message || '웹드라이브 파일을 가져오지 못했습니다.', 'error');
        }
      } finally {
        prepared?.close();
        selectingImportRef.current = false;
      }
      return;
    }

    const api = (window as any).electronAPI;
    if (api?.chooseImportDocument) {
      try {
        const selected = await api.chooseImportDocument(start.localPath);
        if (!selected) return;
        const bytes = await api.readTransferFile(selected.path);
        chooseImportDestination(new File([bytes], selected.name));
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useDocumentImporter.ts',
            func: 'openImportPicker',
            doing: '데스크톱 파일 선택 대화상자로 가져올 문서를 읽는 작업',
            target: start.localPath || 'LOCAL_IMPORT',
            error
          });
          showToast(error?.message || '파일 선택창을 열지 못했습니다.', 'error');
        }
      }
      return;
    }

    const picker = (window as any).showOpenFilePicker;
    if (typeof picker !== 'function') {
      importFileInputRef.current?.click();
      return;
    }
    try {
      const options = { ...IMPORT_PICKER_OPTIONS, id: 'onrivi-import-document', ...(start.localHandle ? { startIn: start.localHandle } : {}) };
      let handles;
      try {
        handles = await picker.call(window, options);
      } catch (error: any) {
        if (!start.localHandle || !['NotFoundError', 'TypeError'].includes(error.name)) throw error;
        handles = await picker.call(window, IMPORT_PICKER_OPTIONS);
      }
      const [handle] = handles;
      const file = await handle.getFile();
      chooseImportDestination(file);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useDocumentImporter.ts',
          func: 'openImportPicker',
          doing: '브라우저 showOpenFilePicker로 가져올 문서를 선택하는 작업',
          target: 'BROWSER_IMPORT',
          error
        });
        showToast(error?.message || '파일 선택창을 열지 못했습니다.', 'error');
      }
    }
  }, [isRestrictedUser, isImporting, chooseImportDestination, showToast, rootFolder, fileList]);

  useEffect(() => {
    const handleTriggerImport = (e?: any) => {
      if (isRestrictedUser) return;
      targetImportNodeRef.current = e?.detail?.node || null;
      targetImportParentHandleRef.current = e?.detail?.parentHandle || null;
      void openImportPicker(e?.detail?.source);
    };
    window.addEventListener('TRIGGER_IMPORT', handleTriggerImport);
    return () => window.removeEventListener('TRIGGER_IMPORT', handleTriggerImport);
  }, [isRestrictedUser, openImportPicker]);

  /**
   * ==== [handleImportFile] ====
   * 🎯 역할 : 선택된 외부 문서에서 텍스트·표·이미지를 추출하여 마크다운 파일로 변환 후 대상 폴더에 저장 및 열기
   */
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImporting) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedImportFile(file.name)) {
      e.target.value = '';
      showToast('지원하지 않는 형식입니다. DOCX, HWP, PDF, EPUB, TXT, MD, HTML 파일을 선택해 주세요.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      showToast('파일에서 텍스트를 추출 중입니다...', 'info');
      const imageSaveCallback = async (base64Data: string, contentType: string) => {
        requireResourceSettings();
        const ext = contentType.split('/')[1] || 'png';
        let imgName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        try {
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
          imgName = `img_${hashHex}.${ext}`;
        } catch {
          // 해시 생성 실패 시 기본 시간 기반 이름 사용
        }

        const isDriveEnv = getResourceSettings()?.kind === 'drive';
        if (isDriveEnv) {
          const token = getSavedDriveToken();
          const cloudSettings = getResourceSettings('cloud');
          const wsInfo = getSavedWorkspaceInfo();
          let mediaFolderId = cloudSettings?.mediaFolderId || wsInfo?.mediaFolderId;
          if (!mediaFolderId && token && (cloudSettings?.folderId || wsInfo?.resourceFolderId)) {
            try {
              const parentId = cloudSettings?.folderId || wsInfo?.resourceFolderId;
              const { listDriveChildren } = await import('@/lib/gdrive/googleDriveClient');
              const children = await listDriveChildren(token, parentId!);
              const m = children.find(c => c.isFolder && c.name === 'media');
              if (m) mediaFolderId = m.id;
            } catch {}
          }
          if (token && mediaFolderId) {
            try {
              const res = await fetch(`data:${contentType};base64,${base64Data}`);
              const blob = await res.blob();
              const uploaded = await uploadDriveImage(token, mediaFolderId, blob, imgName);
              if (uploaded?.id) {
                return `/media/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
              }
            } catch (gErr) {
              logError({
                file: 'frontend/src/hooks/fileExplorer/useDocumentImporter.ts',
                func: 'handleImportFile.imageSaveCallback',
                doing: '가져온 문서 내부 이미지를 구글 드라이브 미디어 폴더에 업로드하는 작업',
                target: imgName,
                error: gErr
              });
              throw new Error('가져온 이미지를 구글 드라이브에 저장하지 못했습니다. 연결 상태를 확인해 주세요.');
            }
          }
          throw new Error('이미지 저장을 위한 구글 드라이브 연결 또는 미디어 폴더를 찾지 못했습니다.');
        }

        if (workspaceType === 'browser') {
          if (resourceFolderHandle) {
            const mediaDir = await resourceFolderHandle.getDirectoryHandle('media', { create: true });
            const fileHandle = await mediaDir.getFileHandle(imgName, { create: true });
            const writable = await fileHandle.createWritable();
            const res = await fetch(`data:${contentType};base64,${base64Data}`);
            const blob = await res.blob();
            await writable.write(blob);
            await writable.close();
            return `/media/${imgName}`;
          } else {
            requireResourceSettings();
            throw new Error('리소스 폴더 접근 권한을 다시 설정해 주세요.');
          }
        } else {
          const api = (window as any).electronAPI;
          if (api && api.saveImage) {
            const folder = requireResourceSettings().path;
            const sep = folder.includes('\\') ? '\\' : '/';
            const targetFolder = folder + sep + 'media';
            const saveResult = await api.saveImage(targetFolder, base64Data, imgName);
            if (saveResult && saveResult.success) {
              if (saveResult.mediaPath) {
                return saveResult.mediaPath;
              } else if (saveResult.absolutePath) {
                return `media://local/serve?url=${encodeURIComponent(saveResult.absolutePath)}`;
              }
            }
          }
        }

        throw new Error('가져온 이미지 파일을 저장하지 못했습니다. 공통 자원 폴더를 확인해 주세요.');
      };

      const { convertFileToMarkdown } = await import('@/lib/fileImporter');
      const markdown = await convertFileToMarkdown(file, imageSaveCallback);

      if (!markdown.trim()) throw new Error('문서에서 변환할 내용을 추출할 수 없습니다.');
      const targetNode = targetImportNodeRef.current;
      const targetParentHandle = targetImportParentHandleRef.current;
      targetImportNodeRef.current = null;
      targetImportParentHandleRef.current = null;

      const requestedName = importNameRef.current;
      importNameRef.current = null;
      const originalName = requestedName ? requestedName.replace(/\.md$/i, '') : file.name.split('.').slice(0, -1).join('.') || file.name;
      let finalName = `${originalName}.md`;

      const targetPath = targetNode ? (targetNode.path || targetNode.name || '') : (rootFolder?.path || rootFolder?.name || '');

      let counter = 1;
      while (fileList.some((c: any) => c.name.toLowerCase() === finalName.toLowerCase())) {
        finalName = `${originalName}_${counter}.md`;
        counter++;
      }

      if (targetNode?.path) {
        try {
          const saved = localStorage.getItem('onrivi_expanded_paths');
          const paths: string[] = saved ? JSON.parse(saved) : [];
          const norm = targetNode.path.replace(/\\/g, '/');
          const parts = norm.split('/');
          let cur = '';
          for (const part of parts) {
            cur = cur ? `${cur}/${part}` : part;
            if (!paths.some(p => p.replace(/\\/g, '/') === cur)) {
              paths.push(cur);
            }
          }
          localStorage.setItem('onrivi_expanded_paths', JSON.stringify(paths));
        } catch {}
      }

      const triggerExplorerRefresh = async (createdFilePath?: string) => {
        const refreshDir = targetNode?.path || targetPath;
        await refreshFileList(true);
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
          detail: { force: true, targetDir: refreshDir }
        }));
        if (createdFilePath) {
          window.dispatchEvent(new CustomEvent('file:select-node', {
            detail: { path: createdFilePath }
          }));
        }
        setTimeout(async () => {
          await refreshFileList(true);
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories', {
            detail: { force: true, targetDir: refreshDir }
          }));
        }, 120);
      };

      if (rootFolder?.type === 'GDRIVE') {
        const { createDriveMarkdownFile, listDriveChildren } = await import('@/lib/gdrive/googleDriveClient');
        const token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        const targetFolderId = (targetNode as any)?.driveId || (targetNode as any)?.driveFileId || (targetNode as any)?.id || rootFolder?.driveFolderId || wsInfo?.workspaceFolderId;
        if (token && targetFolderId) {
          const existing = await listDriveChildren(token, targetFolderId);
          while (existing.some(item => item.name.toLowerCase() === finalName.toLowerCase())) finalName = `${originalName}_${counter++}.md`;
          const newDoc = await createDriveMarkdownFile(token, targetFolderId, finalName, markdown);
          const createdPath = `${targetNode?.path || rootFolder?.path || 'GoogleDrive'}/${finalName}`;
          await triggerExplorerRefresh(createdPath);
          openFile({
            name: finalName,
            kind: 'file',
            path: createdPath,
            driveId: newDoc.id,
            driveFileId: newDoc.id,
            id: newDoc.id
          } as any);
          showToast(`'${file.name}' 문서가 구글 드라이브에 성공적으로 변환 저장되었습니다.`, 'success');
          return;
        }
      }

      if (workspaceType === 'browser') {
        const destDirHandle = targetNode?.handle || (targetNode ? targetParentHandle : rootFolder?.handle);
        if (destDirHandle && typeof destDirHandle.getFileHandle === 'function') {
          const existingNames: string[] = [];
          for await (const [name] of destDirHandle.entries()) existingNames.push(name.toLowerCase());
          while (existingNames.includes(finalName.toLowerCase())) finalName = `${originalName}_${counter++}.md`;
          const handle = await destDirHandle.getFileHandle(finalName, { create: true });
          const writable = await handle.createWritable();
          await writable.write(markdown);
          await writable.close();
          const createdPath = targetNode?.path ? `${targetNode.path}/${finalName}` : finalName;
          await triggerExplorerRefresh(createdPath);
          openFile({ name: finalName, kind: 'file', handle, path: createdPath }, destDirHandle);
        } else {
          const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
          const vfsDir = targetNode ? (targetNode.path || targetNode.name || '') : '';
          vfsCreateFile(vfsDir, finalName);
          const createdPath = vfsDir ? `${vfsDir}/${finalName}` : finalName;
          vfsWriteFile(createdPath, markdown);
          await triggerExplorerRefresh(createdPath);
          openFile({ name: finalName, kind: 'file', path: createdPath });
        }
      } else {
        const api = (window as any).electronAPI;
        const parentDir = targetPath || rootFolder?.name || '';
        if (api?.createFile && api?.saveFile) {
          const result = await api.createFile(parentDir, finalName);
          if (result.success) {
            const saved = await api.saveFile(result.path, markdown);
            if (saved === false || saved?.success === false) throw new Error(saved?.error || '변환 문서를 저장하지 못했습니다. 작업장 경로와 쓰기 권한을 확인해 주세요.');
            await triggerExplorerRefresh(result.path);
            openFile({ name: finalName, kind: 'file', path: result.path });
          } else throw new Error(result.error || '변환 문서 파일을 만들지 못했습니다. 작업장 폴더를 확인해 주세요.');
        } else {
          const { vfsCreateFile, vfsWriteFile } = await import('@/lib/virtualFileSystem');
          vfsCreateFile('', finalName);
          vfsWriteFile(finalName, markdown);
          await triggerExplorerRefresh(finalName);
          openFile({ name: finalName, kind: 'file', path: finalName });
        }
      }
      showToast(`'${file.name}' 문서가 성공적으로 변환되었습니다.`, 'success');
    } catch (error: any) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useDocumentImporter.ts',
        func: 'handleImportFile',
        doing: '외부 문서(DOCX/HWP/PDF/EPUB 등)를 마크다운으로 변환하여 저장하는 작업',
        target: file.name,
        error
      });
      showToast(error.message || '파일을 변환하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsImporting(false);
    }

    e.target.value = '';
  }, [isImporting, workspaceType, resourceFolderHandle, rootFolder, fileList, refreshFileList, openFile, showToast]);

  return {
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
  };
}
