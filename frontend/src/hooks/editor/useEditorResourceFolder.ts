// ====================================================================
// 📊 [OMD-HOOK-useEditorResourceFolder] frontend/src/hooks/editor/useEditorResourceFolder.ts
// 🎯 @KICK  : 공통 리소스 폴더(Local/Browser/Google Drive) 선택·해제, IndexedDB 핸들 복원, MCP 컨텍스트 동기화, .bib 참고문헌 로드, AI 자격증명 실시간 리로드 및 자가 치유 전담 훅
// 🛡️ @GUARD : 리소스 폴더 해제 시 로컬/세션스토리지 및 IndexedDB 핸들 완전 소거, 비동기 요청 순서 역전 방어(revision 가드)
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화]: selectResourceFolder, clearResourceFolder, IndexedDB 핸들 복원, MCP 동기화, .bib 로드, AI 자격증명 자동 로드 및 자가 치유 이펙트를 MainEditorApp.tsx에서 분리 위임 (동작 변경 없음)
// 🔗 @CALLS : getResourceSettings, saveResourceSettings, getResourceEnvironment, getEffectiveResourceFolder, loadBibliographyFiles, loadResourceAICredentials, deleteResourceAICredentials, purgeLocalStorageAICredentials, ensureDecryptedApiKey, normalizeAIModelName, idb, saveSecureData
// ====================================================================

import { useEffect } from 'react';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings, saveResourceSettings, getResourceEnvironment } from '@/lib/resourceSettings';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { loadBibliographyFiles } from '@/lib/bibliographyStorage';
import { loadResourceAICredentials, deleteResourceAICredentials, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import { ensureDecryptedApiKey, normalizeAIModelName } from '@/lib/gemini';
import { idb } from '@/lib/indexedDbHelper';
import { saveSecureData } from '@/lib/secureStorage';
import { SYSTEM_PROFILES } from '@/constants/cssProfile';

export interface UseEditorResourceFolderProps {
  mounted: boolean;
  workspaceType: string;
  rootFolder: { name: string; handle?: any; path?: string } | null;
  resourceFolder: string | null;
  setResourceFolder: React.Dispatch<React.SetStateAction<string | null>>;
  resourceFolderHandle: any;
  setResourceFolderHandle: React.Dispatch<React.SetStateAction<any>>;
  setProfileStorageRevision: React.Dispatch<React.SetStateAction<number>>;
  setBibContent: React.Dispatch<React.SetStateAction<string>>;
  geminiApiKey: string;
  setGeminiApiKey: React.Dispatch<React.SetStateAction<string>>;
  aiModelName: string;
  setAiModelName: React.Dispatch<React.SetStateAction<string>>;
  licenseStatus: any;
  isDuplicateInstance: boolean;
  isRestrictedUser: boolean;
  isDismissedGuide: boolean;
  setIsDismissedGuide: React.Dispatch<React.SetStateAction<boolean>>;
  setIsResourceGuideModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsModalInitialTab: React.Dispatch<React.SetStateAction<any>>;
  setIsImageModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsYoutubeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStyleModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReferenceModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, type?: any, ...rest: any[]) => void;
}

/**
 * ========================================================================================
 * [함수명] useEditorResourceFolder - 공통 리소스 폴더 관리 및 연계 리소스(.bib, AI 자격증명, MCP) 동기화 훅
 *
 * @param {UseEditorResourceFolderProps} props - 리소스 폴더 상태 및 모달·AI 설정 제어 함수
 * @returns {{ selectResourceFolder: () => Promise<void>, clearResourceFolder: () => Promise<void> }}
 *
 * @example
 * const { selectResourceFolder, clearResourceFolder } = useEditorResourceFolder({ ... });
 * ==========================================================================================
 */
export function useEditorResourceFolder(props: UseEditorResourceFolderProps) {
  const {
    mounted,
    workspaceType,
    rootFolder,
    resourceFolder,
    setResourceFolder,
    resourceFolderHandle,
    setResourceFolderHandle,
    setProfileStorageRevision,
    setBibContent,
    geminiApiKey,
    setGeminiApiKey,
    aiModelName,
    setAiModelName,
    licenseStatus,
    isDuplicateInstance,
    isRestrictedUser,
    isDismissedGuide,
    setIsDismissedGuide,
    setIsResourceGuideModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    setSettingsModalInitialTab,
    setIsImageModalOpen,
    setIsYoutubeModalOpen,
    setIsStyleModalOpen,
    setIsReferenceModalOpen,
    showToast,
  } = props;

  // 🌟 [공통 리소스 폴더 Handle 및 경로 자동 복원 엔진]
  useEffect(() => {
    if (!mounted) return;
    const restoreRF = async () => {
      if (!getResourceSettings()) {setResourceFolder(null);return;}
      // 1. IndexedDB에서 웹 브라우저용 Handle 복원
      if (!resourceFolderHandle && getResourceSettings()?.kind === 'browser' && typeof window !== 'undefined') {
        try {
          const savedHandle = await idb.get('localResourceFolderHandle') || await idb.get('resourceFolderHandle');
          if (savedHandle && savedHandle.name === getResourceSettings()?.path) {
            setResourceFolderHandle(savedHandle);
            (window as any).__resourceFolderHandle = savedHandle;
            if (!resourceFolder) {
              setResourceFolder(savedHandle.name);
            }
          }
        } catch (e) {
          console.warn('[ResourceFolder] IndexedDB handle 복원 실패:', e);
        }
      }
      // 2. localStorage 및 secureStorage 기반 경로 복원 동기화
      const effective = getEffectiveResourceFolder();
      if (effective && (!resourceFolder || resourceFolder !== effective)) {
        setResourceFolder(effective);
      }
    };
    void restoreRF();
  }, [mounted, resourceFolderHandle, resourceFolder]);

  // Share only the active folder locations with the local MCP process.
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!mounted || !api?.syncMcpContext) return;
    const sync = () => {
      const settings = getResourceSettings(workspaceType === 'cloud' ? 'cloud' : 'local');
      void api.syncMcpContext({
        workspaceType,
        workspacePath: workspaceType === 'local' ? ((rootFolder as any)?.path || rootFolder?.name || null) : null,
        resourceKind: settings?.kind || 'unset',
        resourcePath: settings?.kind === 'local' ? settings.path : null,
      }).catch((error: unknown) => console.warn('[MCP context] sync failed', error));
    };
    sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('onrivi:resource_folder_changed', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('onrivi:resource_folder_changed', sync);
    };
  }, [mounted, workspaceType, rootFolder, resourceFolder]);

  useEffect(() => {
    const openResourceSettings = () => {setIsImageModalOpen(false);setIsYoutubeModalOpen(false);setIsStyleModalOpen(false);setIsReferenceModalOpen(false);setSettingsModalInitialTab('general');setIsSettingsModalOpen(true);};
    window.addEventListener('onrivi:resource-settings', openResourceSettings);
    return () => window.removeEventListener('onrivi:resource-settings', openResourceSettings);
  }, [setIsSettingsModalOpen,setIsImageModalOpen,setIsYoutubeModalOpen,setIsStyleModalOpen,setIsReferenceModalOpen,setSettingsModalInitialTab]);

  // 🌟 [전체사용자 공통 리소스 폴더 미설정 시 초기 안내 모달 트리거]
  useEffect(() => {
    if (!mounted) return;
    const isMissing = !getResourceSettings()?.path && !resourceFolder && !resourceFolderHandle;
    if (!isMissing) {
      setIsResourceGuideModalOpen(false);
      return;
    }
    const isFullUser = !isDuplicateInstance && !isRestrictedUser && licenseStatus.isActivated && !licenseStatus?.isExpired;

    if (isMissing && isFullUser && !isDismissedGuide) {
      const timer = setTimeout(() => {
        if (!getResourceSettings()?.path) setIsResourceGuideModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, resourceFolder, resourceFolderHandle, licenseStatus.isActivated, licenseStatus?.isExpired, isDuplicateInstance, isRestrictedUser, isDismissedGuide]);

  // 📊 [OMD-CITATION-MainEditorApp] .bib 워크스페이스 자동 로드
  // 🎯 @KICK  : 워크스페이스 전체를 재귀 탐색하여 .bib 파일을 모두 병합 로드
  // 🚨 @PATCH : **2026-07-07** — allMdFiles 의존성 완전 제거.
  //              Electron IPC(listDirectory) 직접 재귀 스캔 + fileList 트리 병렭 탐색.
  //              웹 환경: bib.handle → VFS → getApiUrl REST API 순서로 폴백 처리.
  // 🔗 @CALLS : electronAPI.listDirectory, electronAPI.readFromPath, vfsReadFile, getApiUrl
  useEffect(()=>{
    let disposed=false;
    const load=async()=>{try{const files=await loadBibliographyFiles(resourceFolderHandle);if(!disposed)setBibContent(files.map(f=>f.content).join('\n'));}
      catch(e){if(!disposed){setBibContent('');console.warn('[Bibliography]',e);}}};
    void load();window.addEventListener('onrivi:bibliography-updated',load);
    return()=>{disposed=true;window.removeEventListener('onrivi:bibliography-updated',load);};
  },[workspaceType,resourceFolder,resourceFolderHandle]);

  const selectResourceFolder = async () => {
    if (workspaceType === 'cloud') {
      try {
        const {getSavedDriveToken,initializeDriveResourceFolder}=await import('@/lib/gdrive/googleDriveClient');
        const token=getSavedDriveToken();if(!token)throw new Error('구글 드라이브를 먼저 연결해 주세요.');
        const {pickDriveResourceFolder}=await import('@/lib/gdrive/ResourceFilePicker');
        const selected=await pickDriveResourceFolder(token);if(!selected)return;
        const folderName = selected.name;
        if (!folderName) throw new Error('선택한 폴더의 이름을 확인할 수 없습니다.');
        const folders = await initializeDriveResourceFolder(token, selected.id);
        saveResourceSettings({kind:'drive',path:folderName,folderId:selected.id,...folders}, 'cloud');
        setResourceFolder(folderName);
        setProfileStorageRevision(r => r + 1);
        setResourceFolderHandle(null);(window as any).__resourceFolderHandle=null;
        showToast(`드라이브 리소스 폴더가 '${folderName}'(으)로 변경되었습니다.`,'success');
      } catch(error:any) {showToast(error.message,'error');}
      return;
    }
    const api = (window as any).electronAPI;
    if (api && api.selectFolder) {
      const result = await api.selectFolder(resourceFolder || '');
      if (result && result.status !== 'canceled' && result.path) {
        if (api.initResourceFolder) { const initialized=await api.initResourceFolder(result.path, SYSTEM_PROFILES);if(initialized?.success===false) {showToast(initialized.error || '리소스 폴더 초기화 실패','error');return;} }
        saveResourceSettings({kind:'local',path:result.path});
        setResourceFolder(result.path);
        setProfileStorageRevision(value => value + 1);
        try { saveSecureData('resourceFolder', result.path); } catch { }
        try { localStorage.setItem('onrivi_resource_folder_path', result.path); } catch { }
        try { localStorage.setItem('onrivi_resource_folder', result.path); } catch { }
        try { localStorage.setItem('resourceFolder', result.path); } catch { }
        
        showToast('리소스 폴더가 설정되었습니다.', 'success');
      }
    } else if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        const defaults:Record<string,string>={'profiles/userCssProfiles.json':JSON.stringify(SYSTEM_PROFILES,null,2),'prompt/ai_prompts.json':'{}','prompt/ai_presets.json':'[]','prompt/promptTemplates.json':'[]','bible/references.bib':'','db/onrivi_knowledge.db':''};
        for (const name of ['profiles','prompt','bible','media','db']) await handle.getDirectoryHandle(name,{create:true});
        for (const [relative,content] of Object.entries(defaults)) {
          const [directory,name]=relative.split('/');const dir=await handle.getDirectoryHandle(directory);
          try {await dir.getFileHandle(name);}catch(error:any){if(error.name!=='NotFoundError')throw error;const file=await dir.getFileHandle(name,{create:true});const writable=await file.createWritable();await writable.write(content);await writable.close();}
        }
        await idb.set('resourceFolderHandle',handle);
        await idb.set('localResourceFolderHandle',handle);
        setResourceFolderHandle(handle);(window as any).__resourceFolderHandle=handle;
        saveResourceSettings({kind:'browser',path:handle.name});
        setResourceFolder(handle.name);
        await idb.set('resourceFolderHandle', handle);
        try { saveSecureData('resourceFolder', handle.name); } catch { }
        try { localStorage.setItem('onrivi_resource_folder_path', handle.name); } catch { }
        try { localStorage.setItem('onrivi_resource_folder', handle.name); } catch { }
        try { localStorage.setItem('resourceFolder', handle.name); } catch { }
        
        // 🚀 [사용자 지시 완벽 반영] 웹 브라우저 환경 5대 디렉토리 일괄 생성
        try {
          await handle.getDirectoryHandle('profiles', { create: true });
          await handle.getDirectoryHandle('prompt', { create: true });
          await handle.getDirectoryHandle('bible', { create: true });
          await handle.getDirectoryHandle('media', { create: true });
          await handle.getDirectoryHandle('db', { create: true });
        } catch (dirErr) {
          console.warn('[Browser ResourceFolder Dir Creation Error]:', dirErr);
        }

        // 서식 로드는 공통 effect에서 처리한다. 폴더명으로 서버 저장소를 추측하지 않는다.
        showToast('리소스 폴더가 설정되었습니다.', 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          showToast('폴더 선택 중 오류가 발생했습니다.', 'error');
        }
      }
    } else {
      showToast('이 브라우저에서는 폴더 선택 기능을 지원하지 않습니다.', 'warning');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0025b ✅ FIXED] MainEditorApp.tsx ➔ clearResourceFolder
  // 🎯 @KICK  : 공통 자원 관리 폴더 연결 해제 및 로컬/IndexedDB 영구 스토리지 데이터 완전 소거
  // 🛡️ @GUARD : idb.del 및 idb.set(null) 이중 방어, localStorage/sessionStorage 클린업
  // 🚨 @PATCH : **2026-09-05** — 공통 리소스 폴더 연결 해제 시 IndexedDB 및 로컬/세션스토리지 완전 소거, 모달 중첩 방어 및 안내 문구 순화('폴더 해제')
  // 🔗 @CALLS : saveSecureData, localStorage.removeItem, idb.del, idb.set, showToast
  // ====================================================================
  const clearResourceFolder = async () => {
    const clearingLocal = getResourceEnvironment() === 'local';
    saveResourceSettings(null);
    setResourceFolder(null);
    setResourceFolderHandle(null);
    (window as any).__resourceFolderHandle = null;
    setGeminiApiKey('');
    setAiModelName('gemini-3.8-flash');
    void deleteResourceAICredentials();
    purgeLocalStorageAICredentials();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('onrivi:ai-connections'));
    }
    setIsDismissedGuide(false);
    if (clearingLocal) {
    try { saveSecureData('resourceFolder', ''); } catch {}
    try { localStorage.removeItem('resourceFolder'); } catch {}
    try { localStorage.removeItem('onrivi_resource_folder'); } catch {}
    try { localStorage.removeItem('onrivi_resource_folder_path'); } catch {}
    try { sessionStorage.removeItem('resourceFolder'); } catch {}
    try {
      const rawSettings = localStorage.getItem('onrivi_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.resourceFolder) {
          delete parsed.resourceFolder;
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      }
    } catch {}
    try { await idb.del('resourceFolderHandle'); } catch {}
    try { await idb.set('resourceFolderHandle', null); } catch {}
    try { await idb.del('localResourceFolderHandle'); } catch {}
    }
    (window as any)._resourceFolderSynced = false;
    showToast('공통 리소스 폴더 연결이 해제되었습니다.', 'info');
    if (!isSettingsModalOpen) {
      setIsResourceGuideModalOpen(true);
    }
  };

  // 🌟 [공통 리소스 폴더 동적 변경 실시간 감지 리스너] (구글 드라이브 ↔ 로컬 전환 등)
  useEffect(() => {
    const handleResourceFolderChange = async (e: any) => {
      const newFolder = getResourceSettings()?.path || '';
      setResourceFolder(newFolder || null);
      setProfileStorageRevision(revision => revision + 1);
      let handle = null;
      if (getResourceSettings()?.kind === 'drive') {
        setResourceFolderHandle(null);
        (window as any).__resourceFolderHandle = null;
      } else {
        handle = (window as any).__resourceFolderHandle;
        setResourceFolderHandle(handle?.name === newFolder ? handle : null);
      }

      // 🚀 [리소스 폴더 변경 즉시 해당 폴더의 AI 환경정보 실시간 재로드]
      try {
        const creds = await loadResourceAICredentials(newFolder || undefined, handle);
        setGeminiApiKey(creds?.apiKey || '');
        setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('onrivi:ai-connections'));
        }
      } catch (err) {
        console.warn('[handleResourceFolderChange reload error]:', err);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:resource_folder_changed', handleResourceFolderChange);
      return () => window.removeEventListener('onrivi:resource_folder_changed', handleResourceFolderChange);
    }
  }, [setGeminiApiKey, setAiModelName, setProfileStorageRevision]);

  // 🛡️ [AI 암호화 키 및 모델명 자가 치유(Self-Healing) 파이프라인]
  // 과거 로컬스토리지에 AES 암호문(U2FsdGVkX1...) 형태로 저장되었던 API 키 및 모델명을 즉시 자동 감지하여 복호화/정상화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (geminiApiKey && geminiApiKey.startsWith('U2FsdGVkX1')) {
      const decrypted = ensureDecryptedApiKey(geminiApiKey);
      if (decrypted && !decrypted.startsWith('U2FsdGVkX1')) {
        setGeminiApiKey?.(decrypted);
        try {
          purgeLocalStorageAICredentials();
        } catch {}
      }
    }

    if (aiModelName && (aiModelName.startsWith('U2FsdGVkX1') || aiModelName.length > 50)) {
      const fixedModel = normalizeAIModelName(aiModelName);
      setAiModelName?.(fixedModel);
      try {
        localStorage.setItem('onrivi_ai_model_name', fixedModel);
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.aiModelName = fixedModel;
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      } catch {}
    }
  }, [geminiApiKey, aiModelName, setGeminiApiKey, setAiModelName]);

  // 🔐 [AI API 키 리소스 폴더 암호화 자격증명 자동 로드 및 로컬스토리지 소거]
  useEffect(() => {
    if (!mounted) return;
    let disposed = false;
    let revision = 0;
    const loadCreds = async () => {
      const request = ++revision;
      try {
        const creds = await loadResourceAICredentials(resourceFolder || undefined, resourceFolderHandle);
        if (disposed || request !== revision) return;
        setGeminiApiKey(creds?.apiKey || '');
        setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('onrivi:ai-connections'));
        }
      } catch (err) {
        console.warn('[MainEditorApp loadResourceAICredentials Error]:', err);
      }
    };
    const reload = () => { void loadCreds(); };
    window.addEventListener('onrivi:drive_token_updated', reload);
    reload();
    return () => { disposed = true; window.removeEventListener('onrivi:drive_token_updated', reload); };
  }, [mounted, resourceFolder, resourceFolderHandle, setGeminiApiKey, setAiModelName]);

  return {
    selectResourceFolder,
    clearResourceFolder,
  };
}
