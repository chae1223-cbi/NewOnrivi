// ====================================================================
// 📊 [OMD-HOOK-useDriveSync-0001] frontend/src/hooks/fileExplorer/useDriveSync.ts
// 🎯 @KICK  : 구글 드라이브 OAuth 인증, 작업장/리소스 폴더 생성·선택, 파일 트리 로드, 토큰 만료 시 긴급 로컬 보존 및 자동 복구
// 🛡️ @GUARD : 토큰 만료 전/후 무손실 비상 초안 보존(EmergencyDriveSnapshot), 불량 토큰 즉시 소거, 로컬 작업장 100% 무손실 복구
// 🚨 @PATCH : 2026-11-04 — [웹드라이브 연결 해제 시 오경고 및 0개 탭 비상 백업 워닝 제거]:
//             1) handleAuthExpired에 storageSwitchRef.current 가드를 추가하여 연결 해제 도중 만료 경고가 뜨지 않도록 방어
//             2) disconnectGoogleDrive에서 열린 탭이 있을 때만 비상 스냅샷을 저장하고, 로컬 작업장 상태 전환 후 드라이브 토큰을 해제하도록 순서 최적화
// 🚨 @PATCH : 2026-11-04 — [웹드라이브 연결 해제 시 리소스 환경 로컬 복원 동기화]: disconnectGoogleDrive 시 onrivi_active_resource_environment 및 saveResourceSettings('local')를 함께 동기화하여 재실행 시 클라우드 리소스 잔존 호출 방지
// 🚨 @PATCH : 2026-11-04 — [오류 처리 및 주석 표준화]: onrivi-error-handling 5대 진단 필드 기반 logError 적용(handleAuthExpired, handleTokenUpdated, disconnectGoogleDrive) 및 onrivi-source-comments 2단계 JSDoc 표준화
// 🚨 @PATCH : 2026-11-04 — [토큰 갱신 시 탐색기 자동 리프레시 연동]: onrivi:drive_token_updated 수신 시 isDriveConnected 상태 복원 및 file:refresh-all-directories(force: true) 이벤트 디스패치로 클라우드 탐색기 즉시 갱신
// 🚨 @PATCH : 2026-11-04 — [useFileExplorer 모듈화 분리]:
//             1) useFileExplorer에서 구글 드라이브 OAuth 통신, 토큰 갱신 리스너, 연결/해제 및 비상 초안 동기화 로직을 useDriveSync 독립 서브 훅으로 분리 (Rule 3 준수)
// 🔗 @CALLS : googleDriveClient, logError, reportClientLog, saveResourceSettings
// ====================================================================
// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { reportClientLog } from '@/lib/clientLogs';
import { logError } from '@/lib/errorDiagnostics';
import { getResourceSettings, saveResourceSettings, activateDriveAccount } from '@/lib/resourceSettings';
import { restoreLocalProfileFolder } from '@/lib/profileStorage';
import { idb } from '@/lib/indexedDbHelper';
import {
  getSavedDriveToken,
  hasValidDriveToken,
  requestGoogleDriveAuth,
  setupOnriviDriveWorkspace,
  selectOnriviWorkspaceFolder,
  disconnectGoogleDrive as disconnectGDriveClient,
  fetchDriveFileNodes,
  saveDriveFileContent,
  saveEmergencyDriveDrafts,
  getEmergencyDriveDrafts,
  clearEmergencyDriveDrafts,
  type EmergencyDriveSnapshot
} from '@/lib/gdrive/googleDriveClient';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';

export interface UseDriveSyncProps {
  rootFolderRef: React.MutableRefObject<any>;
  setRootFolder: (folder: any) => void;
  workspaceType: string;
  setWorkspaceType: (type: any) => void;
  setFileList: (list: any) => void;
  setIsSidebarOpen: (open: boolean) => void;
  showToast: (msg: string, type?: string) => void;
  tabsRef: React.MutableRefObject<any[]>;
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  activeTabIdRef: React.MutableRefObject<string | null>;
  contentRef: React.MutableRefObject<string>;
  lastSavedContentRef: React.MutableRefObject<string>;
  setSaveStatus: (status: any) => void;
  captureEnvironment: () => any;
  restoreEnvironment: (env: any) => void;
  localEnvironmentRef: React.MutableRefObject<any>;
  driveEnvironmentRef: React.MutableRefObject<any>;
  storageSwitchRef: React.MutableRefObject<boolean>;
}

/**
 * ========================================================================================
 * [함수명] useDriveSync - 구글 드라이브 OAuth 연결·해제·비상 초안 백업 및 자동 복구 동기화 훅
 *
 * @param {UseDriveSyncProps} props - 워크스페이스 상태, 탭 참조, 환경 캡처/복원 함수 및 토스트 콜백
 * @returns {object} isDriveAuthExpired, isDriveConnected, connectGoogleDrive, disconnectGoogleDrive 및 상태 제어 함수
 *
 * @example
 * const { isDriveConnected, connectGoogleDrive, disconnectGoogleDrive } = useDriveSync({ ... });
 * ==========================================================================================
 */
export function useDriveSync({
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
}: UseDriveSyncProps) {
  const [isDriveAuthExpired, setIsDriveAuthExpired] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!getSavedDriveToken() && hasValidDriveToken();
  });

  // 📝 구글 드라이브 토큰 만료 사전 감지 및 긴급 로컬 임시보관 이벤트 리스너
  useEffect(() => {
    let pendingExpirySave: Promise<void> | null = null;
    const preserveAndSave = async () => {
      const activeId = activeTabIdRef?.current;
      const currentVal = contentRef.current;
      const snapshot: EmergencyDriveSnapshot = {
        timestamp: Date.now(),
        activeTabId: activeId,
        drafts: tabsRef.current.map(t => ({
          tabId: t.id,
          driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
          name: t.name,
          path: t.path,
          content: t.id === activeId ? currentVal : t.content,
          isModified: t.isModified || (t.id === activeId && currentVal !== lastSavedContentRef.current),
          savedAt: new Date().toISOString()
        }))
      };
      const token = getSavedDriveToken();
      let failed = false;
      const saved = new Map<string, string>();
      for (const draft of snapshot.drafts) {
        if (!draft.isModified || !draft.driveFileId || !token || typeof draft.content !== 'string') continue;
        try {
          await saveDriveFileContent(token, draft.driveFileId, draft.content);
          saved.set(draft.tabId, draft.content);
          draft.isModified = false;
        } catch (error) {
          failed = true;
          console.warn('[GDrive] 만료 전 저장 실패, 로컬 초안 유지', error);
        }
      }
      saveEmergencyDriveDrafts(snapshot);
      if (activeId && saved.has(activeId) && contentRef.current === saved.get(activeId)) {
        lastSavedContentRef.current = currentVal;
        setSaveStatus('saved');
      }
      setTabs(prev => prev.map(t => saved.has(t.id) &&
        (t.id === activeTabIdRef?.current ? contentRef.current : t.content) === saved.get(t.id)
          ? { ...t, isModified: false } : t));
      if (failed) throw new Error('일부 문서를 저장하지 못했습니다. 로컬 초안을 보존했습니다.');
    };
    const handleTokenAboutToExpire = (e: any) => {
      if (!pendingExpirySave) pendingExpirySave = preserveAndSave().finally(() => { pendingExpirySave = null; });
      void pendingExpirySave.then(() => e?.detail?.complete?.(), error => {
        e?.detail?.complete?.(error);
      });
    };

    // 토큰 만료 또는 401 오류 발생 시: 현재 작업 중이던 모든 탭과 에디터 버퍼를 로컬에 긴급 백업
    let expiryHandled = false;
    const handleAuthExpired = () => {
      if (storageSwitchRef.current || rootFolderRef.current?.type !== 'GDRIVE' || expiryHandled) return;
      expiryHandled = true;
      setIsDriveAuthExpired(true);
      setIsDriveConnected(false);
      try {
        const activeId = activeTabIdRef?.current;
        const currentVal = contentRef.current;
        const snapshot: EmergencyDriveSnapshot = {
          timestamp: Date.now(),
          activeTabId: activeId,
          drafts: tabsRef.current.map(t => ({
            tabId: t.id,
            driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
            name: t.name,
            path: t.path,
            content: t.id === activeId ? currentVal : t.content,
            isModified: t.isModified || (t.id === activeId && currentVal !== lastSavedContentRef.current),
            savedAt: new Date().toISOString()
          }))
        };
        if (snapshot.drafts.length > 0 || !getEmergencyDriveDrafts()?.drafts?.length) {
          saveEmergencyDriveDrafts(snapshot);
        }
        console.warn(`[useDriveSync] 🛡️ 구글 드라이브 인증 만료: ${snapshot.drafts.length}개 탭 비상 로컬 보존 완료`);
        showToast('☁️ 구글 드라이브 인증이 만료되었지만 작성 중인 내용은 안전하게 로컬에 보존되었습니다. 재인증 시 클라우드로 자동 동기화됩니다.', 'warning');
      } catch (e) {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useDriveSync.ts',
          func: 'handleAuthExpired',
          doing: '구글 드라이브 인증 만료 시 비상 로컬 초안 스냅샷 백업 중',
          target: 'EmergencyDriveSnapshot',
          error: e
        });
      }
    };

    // 토큰 갱신 또는 재연결 시: 보존된 비상 초안이 있으면 클라우드로 자동 복구 동기화 및 탐색기 즉시 리프레시
    const handleTokenUpdated = async () => {
      expiryHandled = false;
      setIsDriveAuthExpired(false);
      setIsDriveConnected(true);
      if (rootFolderRef.current?.type === 'GDRIVE') {
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories', { detail: { force: true } }));
      }
      try {
        const emergencySnapshot = getEmergencyDriveDrafts();
        const token = getSavedDriveToken();
        if (emergencySnapshot && token && emergencySnapshot.drafts?.length > 0) {
          const synced = new Map<string, string>();
          for (const draft of emergencySnapshot.drafts) {
            if (draft.isModified && draft.driveFileId && typeof draft.content === 'string') {
              try {
                await saveDriveFileContent(token, draft.driveFileId, draft.content);
                synced.set(draft.tabId, draft.content);
                draft.isModified = false;
              } catch (error) {
                console.warn('[GDrive] 초안 재저장 실패, 로컬 보존', error);
              }
            }
          }
          if (synced.size > 0) {
            if (emergencySnapshot.drafts.some(draft => draft.isModified)) saveEmergencyDriveDrafts(emergencySnapshot);
            else clearEmergencyDriveDrafts();
            setTabs(prev => prev.map(tab => synced.has(tab.id) &&
              (tab.id === activeTabIdRef?.current ? contentRef.current : tab.content) === synced.get(tab.id)
                ? { ...tab, isModified: false } : tab));
            const activeId = activeTabIdRef?.current;
            if (activeId && synced.has(activeId) && contentRef.current === synced.get(activeId)) {
              lastSavedContentRef.current = contentRef.current;
              setSaveStatus('saved');
            }
          }
        }
      } catch (syncErr) {
        logError({
          file: 'frontend/src/hooks/fileExplorer/useDriveSync.ts',
          func: 'handleTokenUpdated',
          doing: '구글 드라이브 토큰 갱신 후 비상 초안 클라우드 복구 동기화 중',
          target: 'EmergencyDriveSnapshot',
          error: syncErr
        });
      }
    };

    window.addEventListener('onrivi:drive_token_about_to_expire', handleTokenAboutToExpire);
    window.addEventListener('onrivi:drive_auth_expired', handleAuthExpired);
    window.addEventListener('onrivi:drive_token_expired', handleAuthExpired);
    window.addEventListener('onrivi:drive_token_updated', handleTokenUpdated);
    return () => {
      window.removeEventListener('onrivi:drive_token_about_to_expire', handleTokenAboutToExpire);
      window.removeEventListener('onrivi:drive_auth_expired', handleAuthExpired);
      window.removeEventListener('onrivi:drive_token_expired', handleAuthExpired);
      window.removeEventListener('onrivi:drive_token_updated', handleTokenUpdated);
    };
  }, [setTabs, setSaveStatus, showToast, activeTabIdRef, contentRef, lastSavedContentRef, tabsRef, rootFolderRef]);

  /**
   * ========================================================================================
   * [함수명] connectGoogleDrive - 구글 드라이브 OAuth 인증 및 작업장·참조폴더 연동, 파일 트리를 로드합니다.
   *
   * @param {boolean} [chooseFolder=false] - 작업장 폴더 선택 대화상자 강제 표시 여부
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const connectGoogleDrive = useCallback(async (chooseFolder = false) => {
    if (storageSwitchRef.current) return;
    storageSwitchRef.current = true;
    let stage = '토큰 유효성 검증';
    try {
      const isLocal = rootFolderRef.current?.type !== 'GDRIVE';
      const localResourceBeforeConnect = getResourceSettings('local');
      if (chooseFolder && !isLocal && (tabsRef.current.some(t => t.isModified) ||
          (activeTabIdRef?.current && contentRef.current !== lastSavedContentRef.current))) {
        showToast('작업장을 변경하기 전에 작성 중인 글을 저장해 주세요.', 'warning');
        return;
      }
      let token = getSavedDriveToken();
      if (token && hasValidDriveToken()) {
        const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000)
        });
        if (!testRes.ok) {
          const refreshed = getSavedDriveToken();
          if (refreshed && refreshed !== token) token = refreshed;
          else {
            localStorage.removeItem('onrivi_gdrive_access_token');
            localStorage.removeItem('onrivi_gdrive_token_expires_at');
            sessionStorage.removeItem('onrivi_gdrive_access_token');
            token = null;
          }
        }
      } else token = null;

      if (!token) {
        stage = 'Google 인증 요청';
        token = await requestGoogleDriveAuth();
      }
      if (!token) {
        throw new Error("구글 인증 토큰 획득에 실패했습니다. 다시 시도해주세요.");
      }

      stage = '계정 정보 확인';
      const { fetchGoogleUserInfo } = await import('@/lib/gdrive/googleDriveClient');
      const account = await fetchGoogleUserInfo(token);
      const { isFirstConnection } = activateDriveAccount(account.email);

      const { resolveDriveResourceFolderByName, createDefaultDriveFolders } = await import('@/lib/gdrive/googleDriveClient');
      stage = '작업장 폴더 검색';
      const resource = await resolveDriveResourceFolderByName(token);
      const selectedResource = { id: resource.folderId, name: resource.name };
      const initial = isFirstConnection ? await createDefaultDriveFolders(token, resource.name) : null;
      stage = '작업장 폴더 검색';
      const selectedFolder = initial?.workspace || await selectOnriviWorkspaceFolder(token, !chooseFolder);
      if (!selectedFolder) return;
      const wsInfo = await setupOnriviDriveWorkspace(token, selectedFolder, selectedResource);
      stage = '파일 트리 로드';
      const driveNodes = await fetchDriveFileNodes(token, selectedFolder.id);

      // Back up only when leaving local storage
      if (isLocal) {
        localEnvironmentRef.current = captureEnvironment();
        const localRoot = rootFolderRef.current;
        localStorage.setItem('onrivi_last_local_has_directory_handle', localRoot?.handle ? 'true' : 'false');
        if (localRoot) {
          const { handle, ...metadata } = localRoot;
          localStorage.setItem('onrivi_last_local_root_folder', JSON.stringify(metadata));
          if (handle) await idb.set('rootFolderHandle', handle);
        } else localStorage.removeItem('onrivi_last_local_root_folder');
        localStorage.setItem('onrivi_last_local_workspace_type', workspaceType || 'browser');
        for (const [source, target] of [
          ['onrivi_workspace_path', 'onrivi_last_local_workspace_path'],
        ]) {
          const value = localStorage.getItem(source);
          if (value !== null) localStorage.setItem(target, value);
          else localStorage.removeItem(target);
        }
        if (localResourceBeforeConnect) {
          saveResourceSettings(localResourceBeforeConnect, 'local', { silent: true });
        }
      }

      // 2. 구글 드라이브 작업장 상태 즉시 갱신
      const gdriveFolder = {
        name: selectedFolder.name,
        path: `GoogleDrive/${selectedFolder.name}`,
        displayName: `☁️ ${selectedFolder.name.split('/').pop()}`,
        type: 'GDRIVE',
        driveFolderId: wsInfo.workspaceFolderId
      };
      rootFolderRef.current = gdriveFolder;
      setRootFolder(gdriveFolder);
      setWorkspaceType('cloud');
      localStorage.setItem('rootFolder', JSON.stringify(gdriveFolder));
      localStorage.setItem('workspaceType', 'cloud');
      localStorage.setItem('onrivi_workspace_path', gdriveFolder.path);
      localStorage.setItem('onrivi_last_workspace_mode', 'cloud');

      // 3. 환경설정 공통 리소스 폴더를 구글 드라이브 리소스 폴더로 자동 동기화
      const resourceDisplayName = selectedResource.name;
      saveResourceSettings({
        kind: 'drive',
        path: resourceDisplayName,
        folderId: wsInfo.resourceFolderId,
        profilesFolderId: wsInfo.profilesFolderId,
        promptFolderId: wsInfo.promptFolderId,
        bibleFolderId: wsInfo.bibleFolderId,
        mediaFolderId: wsInfo.mediaFolderId,
        dbFolderId: wsInfo.dbFolderId
      }, 'cloud');
      localStorage.setItem('onrivi_cloud_resource_folder_path', resourceDisplayName);

      // 4. 탐색기 목록 0초 즉각 렌더링
      setFileList(driveNodes);
      setIsDriveAuthExpired(false);

      // 5. 사이드바 열기 및 토스트
      setIsSidebarOpen(true);
      reportClientLog('구글 드라이브 연결 완료', 'INFO', 'DRIVE_CONNECT');
      showToast(`구글 드라이브에 연결되었습니다. (${wsInfo.userEmail || '연결 완료'})`, "success");
      setIsDriveConnected(true);
      window.dispatchEvent(new CustomEvent('onrivi:drive_connected', { detail: { nodes: driveNodes } }));
      console.log(`[connectGoogleDrive] ✅ 구글 드라이브 연결 완료! (${wsInfo.userEmail || '연결됨'}), 파일 수: ${driveNodes.length}`);

      if (isLocal) {
        const previous = driveEnvironmentRef.current;
        restoreEnvironment(previous?.root?.driveFolderId === wsInfo.workspaceFolderId ? previous : null);
      }
      window.dispatchEvent(new CustomEvent('onrivi:reload_profiles'));
    } catch (err: any) {
      localStorage.removeItem('onrivi_gdrive_access_token');
      localStorage.removeItem('onrivi_gdrive_token_expires_at');
      sessionStorage.removeItem('onrivi_gdrive_access_token');
      setIsDriveConnected(false);
      logError({
        file: 'frontend/src/hooks/fileExplorer/useDriveSync.ts',
        func: 'connectGoogleDrive',
        doing: ({
          '토큰 유효성 검증': '구글 드라이브 토큰 유효성 검증 중',
          'Google 인증 요청': '구글 드라이브 사용자 인증 요청 중',
          '계정 정보 확인': '구글 드라이브 계정 정보 확인 중',
          '작업장 폴더 검색': '구글 드라이브 작업장 폴더 검색 중',
          '파일 트리 로드': '구글 드라이브 파일 트리 로드 중',
        } as Record<string, string>)[stage] || `구글 드라이브 [${stage}] 단계 처리 중`,
        target: 'GoogleDrive',
        error: err,
        context: { stage }
      });
      showToast(`구글 드라이브 ${stage} 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`, "error");
    } finally {
      storageSwitchRef.current = false;
    }
  }, [setRootFolder, setWorkspaceType, setFileList, setIsSidebarOpen, showToast, workspaceType, activeTabIdRef, captureEnvironment, contentRef, lastSavedContentRef, restoreEnvironment, tabsRef, rootFolderRef, localEnvironmentRef, driveEnvironmentRef, storageSwitchRef]);

  /**
   * ========================================================================================
   * [함수명] disconnectGoogleDrive - 구글 드라이브 연결을 해제하고 이전 로컬 작업장 환경을 복구합니다.
   *
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const disconnectGoogleDrive = useCallback(async () => {
    if (storageSwitchRef.current || rootFolderRef.current?.type !== 'GDRIVE') return;
    storageSwitchRef.current = true;
    try {
      const activeId = activeTabIdRef?.current;
      const snapshot: EmergencyDriveSnapshot = {
        timestamp: Date.now(),
        activeTabId: activeId,
        drafts: tabsRef.current.map(t => ({
          tabId: t.id,
          driveFileId: (t as any).driveFileId || (t as any).driveId || (t.node as any)?.driveFileId || (t.node as any)?.driveId,
          name: t.name,
          path: t.path,
          content: t.id === activeId ? contentRef.current : t.content,
          isModified: t.isModified || (t.id === activeId && contentRef.current !== lastSavedContentRef.current),
          savedAt: new Date().toISOString()
        }))
      };
      if (snapshot.drafts.length > 0) {
        saveEmergencyDriveDrafts(snapshot);
      }
      const hasUnsaved = tabsRef.current.some(t => t.isModified) ||
        (activeId && contentRef.current !== lastSavedContentRef.current);
      if (hasUnsaved) {
        showToast('저장하지 않은 글이 있습니다. 저장하거나 파일로 내려받은 뒤 연결을 해제해 주세요.', 'warning');
        return;
      }
      
      const backupRootValue = localStorage.getItem('onrivi_last_local_root_folder');
      let restoredRoot = localEnvironmentRef.current?.root || (backupRootValue ? JSON.parse(backupRootValue) : null);
      if (restoredRoot?.type === 'GDRIVE') restoredRoot = null;

      const api = (window as any).electronAPI;
      if (!restoredRoot) {
        const lastWsPath = localStorage.getItem('onrivi_last_local_workspace_path') || localStorage.getItem('onrivi_workspace_path');
        if (api && lastWsPath && lastWsPath !== BROWSER_STORAGE_NAME && !lastWsPath.startsWith('GoogleDrive/')) {
          restoredRoot = { name: lastWsPath.split(/[\\/]/).pop() || lastWsPath, path: lastWsPath, type: 'desktop' };
        } else if (!api) {
          restoredRoot = { name: BROWSER_STORAGE_NAME, path: BROWSER_STORAGE_NAME, type: 'browser' };
        }
      }

      driveEnvironmentRef.current = captureEnvironment();
      const currentResourceSettings = getResourceSettings('cloud');
      if (currentResourceSettings) {
        saveResourceSettings(currentResourceSettings, 'cloud', { silent: true });
      }

      if (restoredRoot) {
        if (!restoredRoot.handle && restoredRoot.name !== BROWSER_STORAGE_NAME && !api) {
          const storedHandle = await idb.get('rootFolderHandle');
          if (storedHandle) restoredRoot.handle = storedHandle;
        }
        rootFolderRef.current = restoredRoot;
        const restoredType = localStorage.getItem('onrivi_last_local_workspace_type') || (restoredRoot.type === 'desktop' ? 'local' : 'browser');
        localStorage.setItem('rootFolder', JSON.stringify(restoredRoot.handle ? { ...restoredRoot, handle: undefined } : restoredRoot));
        localStorage.setItem('workspaceType', restoredType);
        if (restoredRoot.path) localStorage.setItem('onrivi_workspace_path', restoredRoot.path);
        localStorage.setItem('onrivi_last_workspace_mode', restoredType);
        localStorage.setItem('onrivi_active_resource_environment', 'local');
        setRootFolder(restoredRoot);
        setWorkspaceType(restoredType);
      }

      await disconnectGDriveClient();
      setIsDriveConnected(false);
      setIsDriveAuthExpired(false);

      if (restoredRoot) {
        await restoreLocalProfileFolder();
        saveResourceSettings(getResourceSettings('local'), 'local');
      }

      restoreEnvironment(localEnvironmentRef.current);
      localEnvironmentRef.current = null;
      showToast('구글 드라이브 연결이 해제되고 로컬 작업장으로 복귀했습니다.', 'info');
      reportClientLog('구글 드라이브 연결 해제', 'INFO', 'DRIVE_DISCONNECT');
      window.dispatchEvent(new CustomEvent('onrivi:reload_profiles'));
    } catch (err: any) {
      logError({
        file: 'frontend/src/hooks/fileExplorer/useDriveSync.ts',
        func: 'disconnectGoogleDrive',
        doing: '구글 드라이브 연결 해제 및 로컬 작업장 환경 복구 중',
        target: rootFolderRef.current?.name || 'GoogleDrive',
        error: err
      });
      showToast(`연결 해제 실패: ${err.message || '다시 시도해 주세요.'}`, 'error');
    } finally {
      storageSwitchRef.current = false;
    }
  }, [setRootFolder, setWorkspaceType, showToast, activeTabIdRef, captureEnvironment, contentRef, lastSavedContentRef, restoreEnvironment, tabsRef, rootFolderRef, localEnvironmentRef, driveEnvironmentRef, storageSwitchRef]);

  return {
    isDriveAuthExpired,
    setIsDriveAuthExpired,
    isDriveConnected,
    setIsDriveConnected,
    connectGoogleDrive,
    disconnectGoogleDrive
  };
}
