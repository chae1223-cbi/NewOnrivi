// ====================================================================
// 📊 [OMD-HOOK-useLocalVfs-0001] frontend/src/hooks/fileExplorer/useLocalVfs.ts
// 🎯 @KICK  : 로컬 폴더/브라우저 FSA/VFS/웹드라이브 파일 트리 스캔(refreshFileList), 워크스페이스 선택(selectRootFolder), 물리적 파일 저장(saveFile)
// 🛡️ @GUARD : 지식 보관함 자동 재색인(triggerKnowledgeAutoSyncOnSave), 디바운스 새로고침, Electron 네이티브 API 및 브라우저 FSA 3중 호환
// 🚨 @PATCH : 2026-11-04 — [오류 처리 및 주석 표준화]: onrivi-error-handling에 따라 logError/logWarn의 file 경로를 useLocalVfs.ts로 정합화하고 refreshFileList/selectRootFolder/restoreFolderPermission 예외 로깅 추가, onrivi-source-comments 2단계 JSDoc 표준화
// 🚨 @PATCH : 2026-11-04 — [에디터 실행 시 로컬/클라우드 탐색기 자동 리프레시 강화]: GDRIVE 폴더 ID(wsInfo.workspaceFolderId || rootFolder.driveFolderId) 다중 폴백, 브라우저 IndexedDB 핸들 즉시 복구 스캔, 데스크톱 경로(path || name) 우선 스캔 보강
// 🚨 @PATCH : 2026-11-04 — [런타임 ReferenceError 수정]: hasValidDriveToken, setIsDriveAuthExpired, setIsDriveConnected, setCurrentFileNode, findFileHandleInDirectoryDeep, logWarn, knowledgeClient 누락 식별자 및 바인딩 보완
// 🚨 @PATCH : 2026-11-04 — [런타임 버그 수정]: useEffect import 누락으로 인한 rootFolder ReferenceError 해소
// 🚨 @PATCH : 2026-11-04 — [useFileExplorer 모듈화 분리]:
//             1) useFileExplorer에서 파일 목록 스캔, 루트 폴더 선택/복원, 물리적 파일 저장 및 지식 베이스 동기화 로직을 useLocalVfs 독립 서브 훅으로 분리 (Rule 3 준수)
// 🔗 @CALLS : scanDirectory, getVfsFiles, vfsWriteFile, triggerKnowledgeAutoSyncOnSave, logError
// ====================================================================
// @ts-nocheck
import { useCallback, useRef, useEffect } from 'react';
import { FileNode, scanDirectory, idb } from '@/lib/indexedDbHelper';
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import { getResourceSettings, saveResourceSettings } from '@/lib/resourceSettings';
import { restoreLocalProfileFolder } from '@/lib/profileStorage';
import { getVfsFiles, vfsWriteFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { triggerKnowledgeAutoSyncOnSave } from '@/lib/knowledge/knowledgeAutoSync';
import { isAbsolutePath } from '@/lib/knowledge/pathResolver';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { findFileHandleInDirectoryDeep } from './useDocumentOpener';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  fetchDriveFileNodes,
  saveDriveFileContent,
  hasValidDriveToken
} from '@/lib/gdrive/googleDriveClient';
import {
  verifyHandlePermission,
  saveExternalFileHandle
} from '@/lib/storage/externalFileStore';

export interface UseLocalVfsProps {
  rootFolder: any;
  setRootFolder: any;
  rootFolderRef: any;
  fileList: any;
  setFileList: any;
  workspaceType: any;
  setWorkspaceType: any;
  tabsRef: any;
  setTabs: any;
  activeTabIdRef: any;
  contentRef: any;
  lastSavedContentRef: any;
  setSaveStatus: any;
  setIsSidebarOpen: any;
  showToast: any;
  connectGoogleDrive: any;
  setIsDriveAuthExpired?: (val: boolean) => void;
  setIsDriveConnected?: (val: boolean) => void;
  currentFileNode?: any;
  setCurrentFileNode?: any;
  currentFileName?: any;
  setCurrentFileName?: any;
  currentFileParentHandleRef?: any;
  setActiveTabId?: any;
  setContent?: any;
}


/**
 * ========================================================================================
 * [함수명] useLocalVfs - 로컬 디스크(Electron), 브라우저 FSA, 가상 파일 시스템(VFS), 구글 드라이브의 파일 트리 스캔 및 저장을 담당합니다.
 *
 * @param {UseLocalVfsProps} props - 워크스페이스 상태, 탭 상태 및 드라이브/토스트 제어 함수
 * @returns {{ refreshFileList: (force?: boolean) => Promise<void>, selectRootFolder: (type?: 'local' | 'browser' | 'cloud' | 'current', initialPath?: string | null) => Promise<void>, restoreFolderPermission: () => Promise<void>, saveFile: (targetContent: string, targetFile: FileNode | null) => Promise<boolean> }}
 * ==========================================================================================
 */
export function useLocalVfs({
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
  setIsDriveAuthExpired = () => {},
  setIsDriveConnected = () => {},
  currentFileNode,
  setCurrentFileNode = () => {},
  currentFileName,
  setCurrentFileName = () => {},
  currentFileParentHandleRef,
  setActiveTabId = () => {},
  setContent = () => {},
}: UseLocalVfsProps) {
  const lastRefreshTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  /**
   * ========================================================================================
   * [함수명] refreshFileList - 현재 활성화된 작업장(구글 드라이브 / 브라우저 FSA / VFS / 데스크톱)의 파일 트리를 스캔하여 갱신합니다.
   *
   * @param {boolean} [force=false] - 디바운스(250ms) 및 진행 중 락을 우회하여 즉시 강제 스캔할지 여부
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const refreshFileList = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && (isRefreshingRef.current || now - lastRefreshTimeRef.current < 250)) {
      return;
    }
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
      // ☁️ [구글 드라이브 작업장 파일 트리 갱신]
      if (rootFolderRef.current?.type === 'GDRIVE') {
        let token = getSavedDriveToken();
        const wsInfo = getSavedWorkspaceInfo();
        if (!hasValidDriveToken()) {
          try {
            const { refreshDriveTokenSilently } = await import('@/lib/gdrive/googleDriveClient');
            token = await refreshDriveTokenSilently();
          } catch (_) {}
        }
        if (!token || !hasValidDriveToken()) {
          setIsDriveAuthExpired(true);
          setIsDriveConnected(false);
          return;
        }
        const targetFolderId = wsInfo?.workspaceFolderId || rootFolderRef.current?.driveFolderId;
        if (targetFolderId) {
          try {
            const driveNodes = await fetchDriveFileNodes(token, targetFolderId);
            setFileList(driveNodes);
            setIsDriveAuthExpired(false);
            setIsDriveConnected(true);
            window.dispatchEvent(new CustomEvent('onrivi:drive_connected', { detail: { nodes: driveNodes } }));
            console.log(`[refreshFileList] ✅ 구글 드라이브 파일 목록 갱신 완료 (${driveNodes.length}개 노드)`);
          } catch (err) {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'refreshFileList',
              doing: '구글 드라이브 작업장 파일 트리 목록 조회 중',
              target: targetFolderId,
              error: err
            });
            setIsDriveAuthExpired(true);
            setIsDriveConnected(false);
          }
        }
        return;
      }

      const api = (window as any).electronAPI;
      const isDesktopApp = typeof window !== 'undefined' && !!api;

      if (!isDesktopApp) {
        let handle = rootFolderRef.current?.handle;
        if (!handle && !rootFolderRef.current?.needPermission && rootFolderRef.current?.name && rootFolderRef.current?.name !== BROWSER_STORAGE_NAME) {
          try {
            const savedHandle = await idb.get('rootFolderHandle');
            if (savedHandle) {
              const perm = await savedHandle.queryPermission({ mode: 'read' });
              if (perm === 'granted') {
                handle = savedHandle;
                rootFolderRef.current = { ...rootFolderRef.current, handle: savedHandle };
              }
            }
          } catch (_) {}
        }
        if (handle) {
          try {
            const tree = await scanDirectory(handle);
            setFileList(tree);
          } catch (err) {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'refreshFileList',
              doing: '브라우저 FSA 디렉토리 핸들 파일 트리 스캔 중',
              target: rootFolderRef.current?.name || 'browser-handle',
              error: err
            });
          }
        } else {
          // 🛡️ [게스트 체험 모드 가이드] 첫 진입 시 가상 스페이스에 예쁜 체험용 웰컴 문서 탑재
          const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('onrivi_guest_mode') === 'Y';
          let vfsList = getVfsFiles();
          if (isGuestMode && vfsList.length === 0) {
            try {
              const { vfsCreateFile, vfsWriteFile } = require('@/lib/virtualFileSystem');
              vfsCreateFile('', '온리비_어서_체험판.md');
              fetch('/welcome.md')
                .then(res => {
                  if (!res.ok) throw new Error("welcome.md 로딩 실패");
                  return res.text();
                })
                .then(text => {
                  vfsWriteFile('온리비_어서_체험판.md', text);
                  setFileList(getVfsFiles());
                })
                .catch(err => {
                  console.error("체험판 웰컴 마크다운 파일 로드 오류:", err);
                  vfsWriteFile('온리비_어서_체험판.md', '# 🚀 온리비 어서 5분 마법의 글쓰기 챌린지!\n\n가이드를 참고하여 체험을 계속해 보셔요.');
                  setFileList(getVfsFiles());
                });
            } catch (e) {
              console.error("체험판 웰컴 문서 생성 오류:", e);
            }
          }
          setFileList(vfsList);
        }
        return;
      }

      const targetDirPath = rootFolderRef.current?.path || rootFolderRef.current?.name;
      if (api?.listDirectory && targetDirPath) {
        try {
          const list = await api.listDirectory(targetDirPath);
          setFileList(list);
        } catch (e) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
            func: 'refreshFileList',
            doing: '데스크톱 로컬 작업장 디렉토리 목록 조회 중',
            target: targetDirPath,
            error: e
          });
        }
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [setFileList, rootFolderRef, setIsDriveAuthExpired, setIsDriveConnected]);

  /**
   * ========================================================================================
   * [함수명] selectRootFolder - 로컬/브라우저/클라우드 워크스페이스 루트 폴더를 선택하고 연결합니다.
   *
   * @param {'local' | 'browser' | 'cloud' | 'current'} [type='current'] - 연결할 스토리지 유형
   * @param {string | null} [initialPath] - 데스크톱 폴더 선택기 시작 경로
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const selectRootFolder = async (type: 'local' | 'browser' | 'cloud' | 'current' = 'current', initialPath?: string | null) => {
    // A generic workspace action follows the active storage; explicit local actions stay local.
    if (type === 'cloud' || (type === 'current' && rootFolderRef.current?.type === 'GDRIVE')) {
      await connectGoogleDrive(true);
      return;
    }
    if (type === 'current') type = 'local';
    const api = (window as any).electronAPI;
    if (type === 'local') {
      if (api) {
        try {
          const current = rootFolderRef.current;
          let currentLocalPath = initialPath || (current?.type !== 'GDRIVE' ? current?.path || current?.name : '') || '';
          if (currentLocalPath && !isAbsolutePath(currentLocalPath.replace(/\\/g, '/'))) currentLocalPath = '';
          try {
            const savedRoot = localStorage.getItem('onrivi_last_local_root_folder');
            if (savedRoot) {
              const parsed = JSON.parse(savedRoot);
              const savedPath = parsed?.path || parsed?.name;
              if (!currentLocalPath && savedPath && isAbsolutePath(savedPath.replace(/\\/g, '/'))) {
                currentLocalPath = savedPath;
              }
            }
          } catch (_) {}

          const targetPath = currentLocalPath || undefined;
          const result = await (window as any).electronAPI.selectFolder(targetPath);
          if (result.status === 'success') {
            const finalRoot = result.path;
            const normFinalRoot = finalRoot.replace(/\\/g, '/');
            setRootFolder({ name: finalRoot, path: normFinalRoot });
            setWorkspaceType('local');
            localStorage.setItem('onrivi_workspace_path', normFinalRoot);
            localStorage.setItem('onrivi_last_local_workspace_path', normFinalRoot);
            localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify({ name: finalRoot, path: normFinalRoot }));
            localStorage.setItem('rootFolder', JSON.stringify({ name: finalRoot, path: normFinalRoot }));
            localStorage.setItem('workspaceType', 'local');

            // 📁 로컬 작업장 복귀 시 리소스 폴더가 구글 드라이브였으면 로컬 작업장 참조파일로 원상복구
            await restoreLocalProfileFolder();
            saveResourceSettings(getResourceSettings('local'), 'local');

            setTabs([]);
            setActiveTabId(null);
            setContent('');
            setCurrentFileNode(null);
            setCurrentFileName('');
            // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
            setIsSidebarOpen(true);
            showToast(`워크스페이스가 ${finalRoot}(으)로 변경되었습니다.`, 'success');
          } else if (result.status === 'canceled') {
            showToast("폴더 선택이 취소되었습니다.", "info");
          }
        } catch (err: any) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
            func: 'selectRootFolder',
            doing: '데스크톱 로컬 작업장 폴더 선택 및 초기화 중',
            target: initialPath || 'local-folder',
            error: err
          });
          showToast("폴더 선택 오류: " + err.message, "error");
        }
      } else if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const startIn = rootFolderRef.current?.type !== 'GDRIVE' ? rootFolderRef.current?.handle : undefined;
          const options = { id: 'onrivi-workspace', mode: 'readwrite', ...(startIn ? { startIn } : {}) };
          let handle;
          try {
            handle = await (window as any).showDirectoryPicker(options);
          } catch (error: any) {
            if (!startIn || !['NotFoundError', 'TypeError'].includes(error.name)) throw error;
            handle = await (window as any).showDirectoryPicker({ id: 'onrivi-workspace', mode: 'readwrite' });
          }
          
          // 🛡️ [작업장 폴더 선택 시 절대경로 즉시 로컬스토리지 저장]
          // 기존에 로컬스토리지에 저장되어 있던 절대경로(E:/ZZ 개인자료/블러그, /Users/mac/Documents 등)가 있다면 우선 보존
          let absolutePath = handle.name;
          try {
            const existingWs = typeof window !== 'undefined' ? localStorage.getItem('onrivi_workspace_path') : null;
            if (existingWs && isAbsolutePath(existingWs.replace(/\\/g, '/'))) {
              const normExist = existingWs.replace(/\\/g, '/');
              const existBase = normExist.split('/').pop() || '';
              const normTarget = (handle.name || '').replace(/블로그/g, '블러그');
              if (existBase.replace(/블로그/g, '블러그').toLowerCase() === normTarget.toLowerCase()) {
                absolutePath = normExist;
              }
            }
          } catch {}

          // 🛡️ [절대경로 100% 보장 - Cross-Platform]: onrivi_web_base_path와 결합하여 절대경로 보존 (규칙 9: 하드코딩 폴백 없음)
          if (!isAbsolutePath(absolutePath.replace(/\\/g, '/'))) {
            try {
              const webBase = typeof window !== 'undefined' ? localStorage.getItem('onrivi_web_base_path') : null;
              if (webBase && isAbsolutePath(webBase.replace(/\\/g, '/'))) {
                absolutePath = `${webBase.replace(/\\/g, '/').replace(/\/+$/, '')}/${handle.name}`;
              }
              // webBase 미설정 시: handle.name 그대로 사용 (규칙 9: 임의 폴백 금지)
            } catch {}
          }

          const folder = { name: absolutePath, path: absolutePath, handle, displayName: handle.name };
          await idb.set('rootFolderHandle', handle);
          
          setRootFolder(folder);
          setWorkspaceType('browser');
          localStorage.setItem('onrivi_workspace_path', absolutePath);
          localStorage.setItem('onrivi_last_local_workspace_path', absolutePath);
          localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify({ name: absolutePath, path: absolutePath, displayName: handle.name }));
          localStorage.setItem('rootFolder', JSON.stringify({ name: absolutePath, path: absolutePath, displayName: handle.name }));
          localStorage.setItem('workspaceType', 'browser');

          // 📁 로컬 작업장 복귀 시 리소스 폴더가 구글 드라이브였으면 로컬 작업장 참조파일로 원상복구
          await restoreLocalProfileFolder();
          saveResourceSettings(getResourceSettings('local'), 'local');
          setTabs([]);
          setActiveTabId(null);
          setContent('');
          setCurrentFileNode(null);
          setCurrentFileName('');
          // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
          setIsSidebarOpen(true);
          showToast(`워크스페이스 연결 완료 (${handle.name})`, "success");
        } catch (err) {
          if ((err as any)?.name !== 'AbortError' && (err as any)?.name !== 'SecurityError') {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'selectRootFolder',
              doing: '브라우저 디렉토리 피커(showDirectoryPicker) 작업장 선택 중',
              target: 'browser-workspace',
              error: err
            });
            showToast('워크스페이스 선택 중 오류가 발생했습니다.', 'error');
          }
          showToast("폴더 선택이 취소되었습니다.", "info");
        }
      } else {
        const folder = { name: BROWSER_STORAGE_NAME };
        await idb.set('rootFolderHandle', null);
        setRootFolder(folder);
        setWorkspaceType('browser');
        localStorage.setItem('rootFolder', JSON.stringify({ name: BROWSER_STORAGE_NAME }));
        localStorage.setItem('workspaceType', 'browser');
        setTabs([]);
        setActiveTabId(null);
        setContent('');
        setCurrentFileNode(null);
        setCurrentFileName('');
        // 🔑 워크스페이스 변경 시 사이드바가 숨겨져 있으면 자동 표시 (변경 내용 시각적 인식 보장)
        setIsSidebarOpen(true);
        showToast("로컬 스토리지 워크스페이스가 연결되었습니다.", "success");
      }
    }
  };

  // 3. 브라우저 저장소 초기화 및 권한 복구 핸들러
  useEffect(() => {
    let busy = false;
    const reset = async () => {
      if (busy || (window as any).electronAPI || rootFolderRef.current?.type === 'GDRIVE') return;
      busy = true;
      try {
        const { resetBrowserWorkspace } = await import('@/lib/browserDefaultStorage');
        const folder = await resetBrowserWorkspace();
        rootFolderRef.current = folder;
        setRootFolder(folder);
        setWorkspaceType('browser');
        setIsSidebarOpen(true);
        showToast('작업장 연결을 기본 브라우저 작업장으로 초기화했습니다. 기존 파일과 열린 문서는 유지됩니다.', 'success');
      } catch (error: any) {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
          func: 'resetBrowserWorkspace',
          doing: '브라우저 기본 작업장 초기화 중',
          target: BROWSER_STORAGE_NAME,
          error
        });
        showToast(error.message || '작업장 초기화에 실패했습니다.', 'error');
      }
      finally { busy = false; }
    };
    window.addEventListener('onrivi:reset-browser-workspace', reset);
    return () => window.removeEventListener('onrivi:reset-browser-workspace', reset);
  }, [setRootFolder, setWorkspaceType, setIsSidebarOpen, showToast, rootFolderRef]);

  /**
   * ========================================================================================
   * [함수명] restoreFolderPermission - 브라우저 File System Access API 폴더 읽기/쓰기 권한을 재요청하여 복구합니다.
   *
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const restoreFolderPermission = async () => {
    if (!rootFolder?.handle) return;
    try {
      const status = await rootFolder.handle.requestPermission({ mode: 'readwrite' });
      if (status === 'granted') {
        const restoredFolder = { name: rootFolder.handle.name, handle: rootFolder.handle };
        setRootFolder(restoredFolder);
        showToast("이전 워크스페이스 폴더가 정상 복구되었습니다.", "success");
      } else {
        showToast("폴더 읽기/쓰기 권한 승인이 거부되었습니다.", "warning");
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
          func: 'restoreFolderPermission',
          doing: '브라우저 작업장 폴더 읽기/쓰기 권한 복구 요청 중',
          target: rootFolder?.name || 'rootFolderHandle',
          error: err
        });
        showToast(`권한 복구 실패: ${err.message}`, "error");
      }
    }
  };

  /**
   * ========================================================================================
   * [함수명] saveFile - 대상 파일 노드(구글 드라이브 / 데스크톱 디스크 / 브라우저 FSA / 지식 DB / VFS)에 마크다운 본문을 물리 저장합니다.
   *
   * @param {string} targetContent - 저장할 마크다운 본문 텍스트
   * @param {FileNode | null} targetFile - 저장 대상 파일 노드
   * @returns {Promise<boolean>} 저장 성공 여부
   * ==========================================================================================
   */
  const saveFile = useCallback(async (targetContent: string, targetFile: FileNode | null) => {
    if (isBundledDocumentPath(targetFile?.path)) return false;
    if (!targetFile) return false;
    try {
      let success = false;
      const activeTabId = activeTabIdRef?.current;
      const activeTab = tabsRef.current?.find((t: any) => t.id === activeTabId);
      const driveFileId = targetFile.driveFileId || 
        (targetFile as any).driveId || 
        (activeTab as any)?.driveFileId || 
        (activeTab as any)?.driveId || 
        (currentFileNode as any)?.driveFileId || 
        (currentFileNode as any)?.driveId;

      if (driveFileId || (!targetFile.path && !targetFile.handle && (rootFolderRef.current?.type === 'GDRIVE' || workspaceType === 'cloud'))) {
        const token = getSavedDriveToken();
        if (token && driveFileId) {
          try {
            await saveDriveFileContent(token, driveFileId, targetContent);
            lastSavedContentRef.current = targetContent;
            success = true;
          } catch (driveErr) {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'saveFile',
              doing: '구글 드라이브 파일 저장(업로드) 중',
              target: targetFile.name ? `${targetFile.name} (ID: ${driveFileId})` : (targetFile.path || driveFileId),
              error: driveErr,
              context: { driveFileId }
            });
            showToast("구글 드라이브 저장 중 오류가 발생했습니다.", "error");
            return false;
          }
        } else {
          showToast(token ? '구글 드라이브 저장 대상 파일 ID를 찾을 수 없습니다.' : '구글 드라이브 연결이 만료되었습니다. 연결을 갱신한 뒤 다시 저장해 주세요.', 'error');
          return false;
        }
      } else {
        const api = typeof window !== 'undefined' && (window as any).electronAPI;
        const isWebOrAddon = !api;
        const effectiveWorkspaceType = isWebOrAddon ? 'browser' : workspaceType;

        if (api) {
          try {
            success = await api.saveFile(targetFile.path, targetContent);
            if (!success) {
              logError({
                file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
                func: 'saveFile',
                doing: '로컬 디스크 파일 저장(Electron API) 중',
                target: targetFile.path || targetFile.name,
                error: 'api.saveFile returned false'
              });
            }
          } catch (electronErr) {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'saveFile',
              doing: '로컬 디스크 파일 저장(Electron API) 중',
              target: targetFile.path || targetFile.name,
              error: electronErr
            });
          }
          if (success) {
            lastSavedContentRef.current = targetContent;
          }
        } else if (effectiveWorkspaceType === 'local') {
        try {
          const res = await fetch(getApiUrl('/api/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: targetFile.path, content: targetContent })
        });
        if (res.ok) {
          lastSavedContentRef.current = targetContent;
          success = true;
          } else {
            logError({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'saveFile',
              doing: '로컬 개발 서버 파일 저장(HTTP POST) 중',
              target: targetFile.path || targetFile.name,
              error: `HTTP ${res.status}`
            });
          }
        } catch (localHttpErr) {
          logError({
            file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
            func: 'saveFile',
            doing: '로컬 개발 서버 파일 저장(HTTP POST) 중',
            target: targetFile.path || targetFile.name,
            error: localHttpErr
          });
        }
      } else if (effectiveWorkspaceType === 'browser') {
        if (!targetFile.handle && rootFolderRef.current?.handle) {
          const targetBaseName = targetFile.name || targetFile.path?.replace(/\\/g, '/').split('/').pop() || '';
          if (targetBaseName && targetBaseName !== '새 파일.md') {
            try {
              const deepRes = await findFileHandleInDirectoryDeep(rootFolderRef.current.handle, targetBaseName);
              if (deepRes) {
                targetFile.handle = deepRes.fileHandle;
                currentFileParentHandleRef.current = deepRes.parentHandle;
                const activeTabId = activeTabIdRef?.current;
                if (activeTabId) {
                  setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, handle: deepRes.fileHandle, node: { ...t.node, handle: deepRes.fileHandle } } : t));
                }
              }
            } catch {}
          }
        }
        if (targetFile.handle) {
          const permissionMode = { mode: 'readwrite' as const };
          let isGranted = (await targetFile.handle.queryPermission(permissionMode)) === 'granted';
          if (!isGranted) {
            isGranted = (await targetFile.handle.requestPermission(permissionMode)) === 'granted';
          }
          if (isGranted) {
            try {
              const writable = await targetFile.handle.createWritable();
            await writable.write(targetContent);
            await writable.close();
            lastSavedContentRef.current = targetContent;
            success = true;
            } catch (writeErr) {
              logError({
                file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
                func: 'saveFile',
                doing: '브라우저 파일 시스템(Handle) 쓰기 중',
                target: targetFile.name || targetFile.path || 'unknown',
                error: writeErr
              });
              showToast("파일 쓰기 중 오류가 발생했습니다.", "error");
              return false;
            }
          } else {
            logWarn({
              file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
              func: 'saveFile',
              doing: '브라우저 파일 쓰기 권한 요청 중',
              target: targetFile.name || targetFile.path || 'unknown',
              error: '권한이 거부되었습니다.'
            });
            showToast("파일 쓰기 권한이 거부되었습니다.", "error");
            return false;
          }
        } else if (targetFile.path) {
          let savedViaApi = false;
          if (/^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(targetFile.path)) {
            const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;
            if (electronApi?.saveFile) {
              try {
                let nativePath = targetFile.path;
                if (nativePath.startsWith('file:///')) {
                  nativePath = decodeURIComponent(nativePath.replace(/^file:\/\/\/?/, ''));
                }
                const saveOk = await electronApi.saveFile(nativePath, targetContent);
                if (saveOk) {
                  savedViaApi = true;
                  lastSavedContentRef.current = targetContent;
                  success = true;
                }
              } catch (e) {
                console.warn('[saveFile] 데스크톱 saveFile 실패:', e);
              }
            } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
              try {
                const saveRes = await fetch(getApiUrl('/api/file-content'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ path: targetFile.path, content: targetContent })
                });
                if (saveRes.ok) {
                  savedViaApi = true;
                  lastSavedContentRef.current = targetContent;
                  success = true;
                }
              } catch {}
            }
          }
          if (!savedViaApi) {
            // 💡 [대안 1]: 지식 보관함 문서 저장 (브라우저 디스크 핸들이 없는 외부 문서 지원)
            let savedViaKnowledge = false;
            try {
              const rfHandle = (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
              const isKnowledgeDoc = targetFile.path && (
                targetFile.path.startsWith('knowledge://') ||
                tabsRef.current.some(t => (t.path === targetFile.path || t.name === targetFile.name) && t.isKnowledge)
              );
              if (isKnowledgeDoc || targetFile.path) {
                savedViaKnowledge = await knowledgeClient.updateDocumentFast({
                  filePathOrId: targetFile.path,
                  fileContent: targetContent,
                  resourceFolderHandle: rfHandle
                });
              }
            } catch (kSaveErr) {
              console.warn('[saveFile] 지식 보관함 고속 저장 예외:', kSaveErr);
            }

            if (savedViaKnowledge) {
              lastSavedContentRef.current = targetContent;
              success = true;
              showToast(`'${targetFile.name}' 문서가 지식 보관함에 안전하게 저장되었습니다.`, 'success');
            } else {
              try {
                vfsWriteFile(targetFile.path, targetContent);
                lastSavedContentRef.current = targetContent;
                success = true;
              } catch (vfsErr) {
                logError({
                  file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
                  func: 'saveFile',
                  doing: '브라우저 가상 파일 시스템(VFS) 쓰기 중',
                  target: targetFile.path || targetFile.name,
                  error: vfsErr
                });
              }
            }
          }
        }
      }
      }

      if (success) {
        setTabs(prev => prev.map(t => {
          let isMatch = false;
          if (targetFile.driveFileId && (t as any).driveFileId) {
            isMatch = (t as any).driveFileId === targetFile.driveFileId;
          } else if (targetFile.path && t.path) {
            isMatch = t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === targetFile.path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
          } else if (targetFile.handle && t.node?.handle) {
            isMatch = t.node.handle === targetFile.handle;
          }
          
          return isMatch ? { ...t, isModified: false, content: targetContent } : t;
        }));

        // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003] 등록된 지식 문서 저장 시 로컬 비동기 자동 재색인 트리거
        const effectivePath = targetFile.path || targetFile.name;
        if (effectivePath && targetContent) {
          triggerKnowledgeAutoSyncOnSave({
            filePath: effectivePath,
            fileContent: targetContent,
          }).catch(() => {});
        }
      }
      return success;
    } catch (e: any) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useLocalVfs.ts',
        func: 'saveFile',
        doing: '물리 파일 저장(디스크/VFS) 처리 중',
        target: targetFile?.path || targetFile?.name || 'unknown',
        error: e,
        context: { workspaceType }
      });
      showToast('파일 저장 중 오류가 발생했습니다. 권한을 확인해 주세요.', 'error');
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceType, setTabs, showToast]);

  return {
    refreshFileList,
    selectRootFolder,
    restoreFolderPermission,
    saveFile
  };
}
