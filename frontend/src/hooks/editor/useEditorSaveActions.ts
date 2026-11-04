/**
 * 프로그램명 : OnriviAuthor
 * 파일명     : frontend/src/hooks/editor/useEditorSaveActions.ts
 * 용도       : 에디터 외부 저장(내 PC 로컬 저장, 개인 웹드라이브 저장, 문서 전송 복사, 새 문서 생성) 전담 훅
 * 작성일     : 2026-11-04
 * 
 * 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화] 파일 저장 및 새 문서 생성 로직을 useEditorSaveActions 훅으로 분리 위임
 *             1) handleSaveToLocal: Electron/File System Access API/브라우저 다운로드 3단계 로컬 저장 분리
 *             2) handleSaveToWebDrive: Google Drive 대상 폴더/파일명 선택 및 업로드/덮어쓰기 분리
 *             3) handleCreateNewDocument: 드라이브/로컬/VFS 환경별 새 문서 파일 노드 생성 및 탭 바인딩 분리
 *             4) onrivi:save-as-target, onrivi:transfer-document 이벤트 리스너 통합 관리
 */

import { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { FileNode } from '@/lib/indexedDbHelper';
import { prepareGoogleDriveAuth } from '@/lib/gdrive/googleDriveClient';
import { transferDocument } from '@/lib/documentTransfer';

export interface UseEditorSaveActionsOptions {
  isRestrictedUser: boolean;
  isDuplicateInstance: boolean;
  isLicenseChecking: boolean;
  editorRef: RefObject<any>;
  contentRef: RefObject<string>;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  rootFolder: any;
  refreshFileList: () => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  createNewTab: (content: string, name: string, isModified?: boolean, path?: string | null, node?: FileNode) => void;
  setCurrentFileNode: (node: FileNode) => void;
  lastSavedContentRef: RefObject<string>;
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
  lastGeneralPreviewModeRef: RefObject<'edit' | 'both' | 'preview'>;
  setPreviewMode: (mode: 'edit' | 'both' | 'preview' | 'css-style') => void;
  setIsNewDocumentModalOpen: (open: boolean) => void;
}

export interface UseEditorSaveActionsReturn {
  handleSaveToLocal: () => Promise<void>;
  handleSaveToWebDrive: () => Promise<void>;
  handleCreateNewDocument: (fileName: string, targetFolderNode: FileNode | null) => Promise<void>;
  transferProgress: string;
  transferBusyRef: RefObject<boolean>;
}

export function useEditorSaveActions({
  isRestrictedUser,
  isDuplicateInstance,
  isLicenseChecking,
  editorRef,
  contentRef,
  currentFileName,
  setCurrentFileName,
  rootFolder,
  refreshFileList,
  showToast,
  createNewTab,
  setCurrentFileNode,
  lastSavedContentRef,
  setSaveStatus,
  lastGeneralPreviewModeRef,
  setPreviewMode,
  setIsNewDocumentModalOpen,
}: UseEditorSaveActionsOptions): UseEditorSaveActionsReturn {
  const transferBusyRef = useRef(false);
  const [transferProgress, setTransferProgress] = useState('');

  // 💾 [내PC(로컬)로 저장] — 작업장 변경 없이 원하는 로컬 폴더에 파일 저장
  const handleSaveToLocal = useCallback(async () => {
    if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) {
      showToast('현재 문서를 저장할 수 없습니다.', 'warning');
      return;
    }
    const markdown = editorRef.current?.getValue() ?? contentRef.current;
    const suggestedName = currentFileName || '새 문서.md';
    const api = (window as any).electronAPI;

    // 1. 데스크톱(Electron) 환경: 표준 파일 저장 대화상자 직접 호출 (작업장 변경 없이 파일만 저장)
    if (api?.saveFileAs) {
      try {
        const defaultDir = rootFolder?.path && rootFolder?.type !== 'GDRIVE' ? rootFolder.path : undefined;
        const file = await api.saveFileAs(markdown, suggestedName, defaultDir, [
          { name: 'Markdown Files (*.md)', extensions: ['md'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]);
        if (!file || file.canceled) return;
        showToast(`내 PC에 저장되었습니다: ${file.name}`, 'success');
        // ⚠️ [사용자 규칙] 작업장(rootFolder, workspaceType)은 절대 변경하지 않는다!
        if (rootFolder?.path && rootFolder?.type !== 'GDRIVE' && file.path?.startsWith(rootFolder.path)) {
          await refreshFileList();
        }
      } catch (e: any) {
        showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
      }
      return;
    }

    // 2. 웹 브라우저 환경 (showSaveFilePicker 지원 시: Chrome, Edge 등)
    if (typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedName.endsWith('.md') ? suggestedName : `${suggestedName}.md`,
          types: [{
            description: 'Markdown Files (*.md)',
            accept: { 'text/markdown': ['.md', '.markdown'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        showToast(`내 PC에 저장되었습니다: ${handle.name}`, 'success');
        // ⚠️ [사용자 규칙] 작업장은 절대 변경하지 않는다!
      } catch (e: any) {
        if (e.name !== 'AbortError') showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
      }
      return;
    }

    // 3. 브라우저 직접 다운로드 폴백
    try {
      let targetName = window.prompt('저장할 파일 이름을 입력해 주세요:', suggestedName);
      if (targetName === null) return; // 사용자 취소
      targetName = targetName.trim() || suggestedName;
      if (!targetName.endsWith('.md')) targetName = `${targetName}.md`;

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`내 PC에 저장되었습니다: ${a.download}`, 'success');
    } catch (e: any) {
      showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
    }
  }, [contentRef, currentFileName, editorRef, isDuplicateInstance, isLicenseChecking, isRestrictedUser, refreshFileList, rootFolder, showToast]);

  // ☁️ [개인웹드라이브 저장] — 작업장 변경 없이 원하는 구글 드라이브 폴더 및 파일명으로 저장
  const handleSaveToWebDrive = useCallback(async () => {
    if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) {
      showToast('현재 문서를 저장할 수 없습니다.', 'warning');
      return;
    }
    const markdown = editorRef.current?.getValue() ?? contentRef.current;
    const defaultName = currentFileName || '새 문서.md';

    transferBusyRef.current = true;
    let preparedAuth: any = null;
    try {
      const { getSavedDriveToken, hasValidDriveToken, ensureDriveFolder, createDriveMarkdownFile, listDriveChildren, saveDriveFileContent } = await import('@/lib/gdrive/googleDriveClient');
      let token = getSavedDriveToken();
      if (!token || !hasValidDriveToken()) {
        preparedAuth = prepareGoogleDriveAuth({ isStandalone: true });
        token = await preparedAuth.request();
      }
      if (!token) {
        showToast('개인웹드라이브 인증이 필요합니다.', 'warning');
        return;
      }

      const { pickAccessibleDriveFolder } = await import('@/lib/gdrive/WorkspaceFolderPicker');
      let initialPath = [{ id: 'root', name: '내 드라이브' }];
      try {
        const rootId = await ensureDriveFolder(token, 'OnriviAuthor', 'root');
        initialPath = [{ id: 'root', name: '내 드라이브' }, { id: rootId, name: 'OnriviAuthor' }];
      } catch {
        // 폴더 권한에 따라 기본 루트로 진행
      }

      const driveDestination = await pickAccessibleDriveFolder(token, initialPath, {
        title: '개인웹드라이브 저장 (드라이브·폴더 및 파일명 지정)',
        description: '저장할 계정·드라이브·폴더와 파일명을 선택해 주세요. 저장 후에도 현재 작업장은 유지됩니다.',
        confirmText: '이 폴더에 저장',
        initialFileName: defaultName,
        showFileNameInput: true,
      });
      if (!driveDestination) return; // 사용자 취소

      const activeToken = driveDestination.token || token;
      const chosenName = (driveDestination.fileName || defaultName).trim();
      const finalName = /\.md$/i.test(chosenName) ? chosenName : `${chosenName}.md`;

      transferBusyRef.current = true;
      setTransferProgress('개인웹드라이브에 저장 중...');
      const siblings = await listDriveChildren(activeToken, driveDestination.id);
      const existingFile = siblings.find(item => !item.isFolder && item.name.toLowerCase() === finalName.toLowerCase());

      const emailLabel = driveDestination.userEmail ? ` [${driveDestination.userEmail}]` : '';

      if (existingFile) {
        const overwrite = window.confirm(`선택한 폴더에 '${finalName}' 파일이 이미 존재합니다.\n덮어쓰시겠습니까?`);
        if (!overwrite) {
          showToast('저장이 취소되었습니다.', 'info');
          return;
        }
        await saveDriveFileContent(activeToken, existingFile.id, markdown);
        showToast(`개인웹드라이브에 저장되었습니다 (덮어쓰기)${emailLabel}: ${driveDestination.name}/${finalName}`, 'success');
      } else {
        await createDriveMarkdownFile(activeToken, driveDestination.id, finalName, markdown);
        showToast(`개인웹드라이브에 저장되었습니다${emailLabel}: ${driveDestination.name}/${finalName}`, 'success');
      }

      // ⚠️ [사용자 규칙] 작업장(rootFolder, workspaceType)은 절대 변경하지 않는다!
      if (rootFolder?.type === 'GDRIVE' && (rootFolder?.id === driveDestination.id || rootFolder?.driveFolderId === driveDestination.id)) {
        await refreshFileList();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        showToast(e.message || '개인웹드라이브 저장에 실패했습니다.', 'error');
      }
    } finally {
      preparedAuth?.close();
      transferBusyRef.current = false;
      setTransferProgress('');
    }
  }, [contentRef, currentFileName, editorRef, isDuplicateInstance, isLicenseChecking, isRestrictedUser, refreshFileList, rootFolder, showToast]);

  // onrivi:save-as-target 리스너
  useEffect(() => {
    const handleSaveAsTarget = (event: Event) => {
      const target = (event as CustomEvent).detail;
      if (target === 'download') {
        handleSaveToLocal();
      } else if (target === 'upload') {
        handleSaveToWebDrive();
      }
    };
    window.addEventListener('onrivi:save-as-target', handleSaveAsTarget);
    return () => window.removeEventListener('onrivi:save-as-target', handleSaveAsTarget);
  }, [handleSaveToLocal, handleSaveToWebDrive]);

  // onrivi:transfer-document 리스너
  useEffect(() => {
    const transfer = async (event: Event) => {
      const direction = (event as CustomEvent).detail;
      if (direction !== 'download' && direction !== 'upload') return;
      if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) return;
      const name = currentFileName;
      const markdown = editorRef.current?.getValue() ?? contentRef.current;
      if (!name || !/\.md$/i.test(name)) { showToast('먼저 Markdown 문서를 열어 주세요.', 'warning'); return; }
      transferBusyRef.current = true;
      setTransferProgress('저장할 위치를 선택해 주세요.');
      try {
        const result = await transferDocument({ direction, name, markdown, onProgress: setTransferProgress });
        showToast(`복사 완료: ${result}`, 'success');
        await refreshFileList();
      } catch (error: any) {
        if (error.name !== 'AbortError') showToast(error.message || '문서 전송에 실패했습니다. 다시 실행해 주세요.', 'error');
      } finally {
        transferBusyRef.current = false;
        setTransferProgress('');
      }
    };
    window.addEventListener('onrivi:transfer-document', transfer);
    return () => window.removeEventListener('onrivi:transfer-document', transfer);
  }, [contentRef, currentFileName, editorRef, isDuplicateInstance, isLicenseChecking, isRestrictedUser, refreshFileList, showToast]);

  // 📝 [새 문서 생성 핸들러]
  const handleCreateNewDocument = useCallback(async (fileName: string, targetFolderNode: FileNode | null) => {
    if (isRestrictedUser || isDuplicateInstance || isLicenseChecking) {
      throw new Error('현재 문서를 생성할 수 없습니다. 로그인·사용 권한을 확인해 주세요.');
    }
    const name = fileName.trim();
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') {
      throw new Error('올바른 파일명을 입력해 주세요.');
    }
    const finalName = /\.md$/i.test(name) ? name : `${name}.md`;
    const folder = targetFolderNode || rootFolder;
    let node: FileNode;

    if (rootFolder?.type === 'GDRIVE' || rootFolder?.driveFolderId) {
      const { getSavedDriveToken, getSavedWorkspaceInfo, listDriveChildren, createDriveMarkdownFile } = await import('@/lib/gdrive/googleDriveClient');
      const token = getSavedDriveToken();
      const folderId = targetFolderNode?.driveId || targetFolderNode?.id || rootFolder?.driveFolderId || rootFolder?.id || getSavedWorkspaceInfo()?.workspaceFolderId;
      if (!token || !folderId) throw new Error('구글 드라이브 연결을 확인해 주세요.');
      const children = await listDriveChildren(token, folderId);
      if (children.some(child => child.name.toLowerCase() === finalName.toLowerCase())) throw new Error('같은 이름의 파일이 있습니다.');
      const created = await createDriveMarkdownFile(token, folderId, finalName, '');
      node = { name: finalName, kind: 'file', driveId: created.id, id: created.id, path: `${folder?.path || 'GoogleDrive'}/${finalName}` };
    } else if (folder?.handle) {
      for await (const [existing] of folder.handle.entries()) {
        if (existing.toLowerCase() === finalName.toLowerCase()) throw new Error('같은 이름의 파일이 있습니다.');
      }
      const handle = await folder.handle.getFileHandle(finalName, { create: true });
      node = { name: finalName, kind: 'file', handle, path: `${folder?.path || folder?.name || ''}/${finalName}` };
    } else if ((window as any).electronAPI?.createFile) {
      const parent = folder?.path || rootFolder?.path;
      if (!parent) throw new Error('먼저 작업장 폴더를 선택해 주세요.');
      const created = await (window as any).electronAPI.createFile(parent, finalName);
      if (!created?.success) throw new Error('파일을 생성하지 못했습니다.');
      node = { name: finalName, kind: 'file', path: created.path };
    } else {
      const { vfsCreateFile, getVfsFiles } = await import('@/lib/virtualFileSystem');
      const parent = targetFolderNode?.path || '';
      const allFiles = getVfsFiles();
      const findFolder = (nodes: FileNode[]): FileNode | undefined => {
        for (const item of nodes) {
          if (item.path === parent) return item;
          const found = item.children && findFolder(item.children);
          if (found) return found;
        }
      };
      const siblings = parent ? findFolder(allFiles)?.children || [] : allFiles;
      if (siblings.some((item: any) => item.name?.toLowerCase() === finalName.toLowerCase())) throw new Error('같은 이름의 파일이 있습니다.');
      vfsCreateFile(parent, finalName);
      node = { name: finalName, kind: 'file', path: parent ? `${parent}/${finalName}` : finalName };
    }

    createNewTab('', finalName, false, node.path || null, node);
    setCurrentFileNode(node);
    setCurrentFileName(finalName);
    if (lastSavedContentRef) (lastSavedContentRef as any).current = '';
    setSaveStatus('saved');
    const targetMode = isRestrictedUser ? 'preview' : (lastGeneralPreviewModeRef.current || 'preview');
    setPreviewMode(targetMode);
    setIsNewDocumentModalOpen(false);
    await refreshFileList();
    showToast('새 문서를 만들었습니다.', 'success');
  }, [
    createNewTab,
    isDuplicateInstance,
    isLicenseChecking,
    isRestrictedUser,
    lastGeneralPreviewModeRef,
    lastSavedContentRef,
    refreshFileList,
    rootFolder,
    setCurrentFileName,
    setCurrentFileNode,
    setIsNewDocumentModalOpen,
    setPreviewMode,
    setSaveStatus,
    showToast
  ]);

  return {
    handleSaveToLocal,
    handleSaveToWebDrive,
    handleCreateNewDocument,
    transferProgress,
    transferBusyRef,
  };
}
