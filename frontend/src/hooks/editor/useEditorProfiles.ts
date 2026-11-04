// ====================================================================
// 📊 [OMD-HOOK-useEditorProfiles] frontend/src/hooks/editor/useEditorProfiles.ts
// 🎯 @KICK  : 서식 프로필(userCssProfiles.json) 로드/저장/디바운스, Frontmatter 동기화, 제목 번호 넘버링 및 가로형 그림책 프로필 관리 훅
// 🛡️ @GUARD : 시스템 프로필 보호, 리소스 폴더/웹드라이브 분기 처리, 저장 실패 시 캐시 무효화 및 롤백, IME 조합 중 넘버링 지연 방어
// 🚨 @PATCH : 2026-11-04 — [웹드라이브 해제/로컬 전환 시 만료 경고 토스트 오발송 차단]: handleDriveTokenExpired에 getResourceEnvironment() === 'cloud' 가드를 추가하여 로컬 모드 전환 시 불필요한 경고 알림 방지
//             2026-11-04 — [표준화 및 에러 처리 강화] logError 5대 진단 필드 선제 기록 적용 및 내부 함수 JSDoc/식별 배너 표준화
//             2026-11-04 — [MainEditorApp 모듈화]: 서식 프로필 관리(profiles, activeProfileId, load, save, resolveEffectiveDocumentProfile, handleProfileChange, headingNumbering)를 useEditorProfiles로 분리 위임 (350줄 감축)
// 🔗 @CALLS : fetchUserProfiles, persistUserProfiles, normalizeCssProfile, extractFrontmatter, updateCssProfileInFrontmatter, syncMarkdownHeadingNumbers, logError
// ====================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { CssProfile } from '@/types/cssProfile';
import { DEFAULT_PROFILE, SYSTEM_PROFILES, isSystemProfileId, normalizeCssProfile } from '@/constants/cssProfile';
import { extractFrontmatter, updateCssProfileInFrontmatter } from '@/lib/frontmatter';
import { documentBookProfile, writeBookProfileSnapshot, legacyBookProfile } from '@/lib/picturebook';
import { fetchUserProfiles, persistUserProfiles, getProfileResourceFolder } from '@/lib/profileStorage';
import { setProfileReadStatus } from '@/lib/profileReadStatus';
import { getResourceSettings, saveResourceSettings, getResourceEnvironment } from '@/lib/resourceSettings';
import { getSavedDriveToken } from '@/lib/gdrive/googleDriveClient';
import { syncMarkdownHeadingNumbers } from '@/lib/headingNumbering';
import { logError } from '@/lib/errorDiagnostics';

export interface UseEditorProfilesProps {
  mounted: boolean;
  content: string;
  contentRef: React.MutableRefObject<string>;
  editorRef: React.MutableRefObject<any>;
  isEditorMountedRef: React.MutableRefObject<boolean>;
  resourceFolder: string | null;
  setResourceFolder: (folder: string | null) => void;
  resourceFolderHandle: any;
  workspaceType: string;
  setWorkspaceType: (type: string) => void;
  rootFolder: { name: string; handle?: any } | null;
  setRootFolder: (folder: { name: string; handle?: any } | null) => void;
  previewMode: string;
  previewModeRef: React.MutableRefObject<string>;
  isStyleModalOpen: boolean;
  activeTabId: string;
  activeTabIdRef: React.MutableRefObject<string>;
  tabs: any[];
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  updateContent: (newContent: string, isFromMonaco?: boolean, skipSave?: boolean) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  isRestrictedUser?: boolean;
  currentFileName?: string;
  directEditEnabled?: boolean;
  isComposingRef?: React.MutableRefObject<boolean>;
}

export interface UseEditorProfilesReturn {
  profiles: CssProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<CssProfile[]>>;
  activeProfileId: string;
  setActiveProfileId: React.Dispatch<React.SetStateAction<string>>;
  isProfilesLoaded: boolean;
  setIsProfilesLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  profileStorageRevision: number;
  setProfileStorageRevision: React.Dispatch<React.SetStateAction<number>>;
  resolveEffectiveDocumentProfile: (docText: string) => any;
  handleProfileChange: (newProfileId: string, appliedProfile?: CssProfile) => void;
}

/**
 * ========================================================================================
 * [함수명] useEditorProfiles - 에디터 서식 프로필(userCssProfiles.json) 로드/저장 및 Frontmatter 동기화 전담 훅
 *
 * @param {UseEditorProfilesProps} props - 리소스 폴더, 워크스페이스 환경, 탭 및 에디터 상태
 * @returns {UseEditorProfilesReturn} 서식 프로필 목록, 활성 프로필 ID 및 변경/해석 핸들러
 * ==========================================================================================
 */
export function useEditorProfiles({
  mounted,
  content,
  contentRef,
  editorRef,
  isEditorMountedRef,
  resourceFolder,
  setResourceFolder,
  resourceFolderHandle,
  workspaceType,
  setWorkspaceType,
  rootFolder,
  setRootFolder,
  previewMode,
  previewModeRef,
  isStyleModalOpen,
  activeTabId,
  activeTabIdRef,
  tabs,
  setTabs,
  updateContent,
  showToast,
  isRestrictedUser = false,
  currentFileName = '',
  directEditEnabled = true,
  isComposingRef,
}: UseEditorProfilesProps): UseEditorProfilesReturn {
  const [profiles, setProfiles] = useState<CssProfile[]>(() => {
    if (typeof window === 'undefined') return [...SYSTEM_PROFILES];
    return [...SYSTEM_PROFILES];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(
    () => SYSTEM_PROFILES[0].id
  );
  const [isProfilesLoaded, setIsProfilesLoaded] = useState(false);
  const [profileStorageRevision, setProfileStorageRevision] = useState(0);
  const profileStorageRef = useRef<{ folder: string; handle: any; hash: string } | null>(null);

  // 🌟 존재하지 않는 삭제된 테마(프로필) ID가 localStorage에 남아있을 경우 시스템 기본 프로필로 자동 복구
  useEffect(() => {
    if (isProfilesLoaded && activeProfileId) {
      const exists = profiles.some(p => p.id === activeProfileId);
      if (!exists) {
        setActiveProfileId(SYSTEM_PROFILES[0].id);
      }
    }
  }, [isProfilesLoaded, profiles, activeProfileId]);

  // ☁️ [구글 로그인/토큰 갱신 즉시 서식 로드 실시간 연동]
  useEffect(() => {
    const handleDriveTokenUpdate = () => {
      setProfileStorageRevision(revision => revision + 1);
    };
    const handleDriveTokenExpired = () => {
      if (getResourceEnvironment() !== 'cloud') return;
      showToast('☁️ 개인 웹드라이브 인증이 만료되었습니다. 파일 메뉴에서 [개인 웹드라이브 연결]을 눌러 재인증해 주세요.', 'warning');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:drive_token_updated', handleDriveTokenUpdate);
      window.addEventListener('onrivi:drive_token_expired', handleDriveTokenExpired);
      window.addEventListener('onrivi:drive_auth_expired', handleDriveTokenExpired);
      return () => {
        window.removeEventListener('onrivi:drive_token_updated', handleDriveTokenUpdate);
        window.removeEventListener('onrivi:drive_token_expired', handleDriveTokenExpired);
        window.removeEventListener('onrivi:drive_auth_expired', handleDriveTokenExpired);
      };
    }
  }, [showToast]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorProfiles-loadUserProfiles] loadUserProfiles
  // ====================================================================
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    profileStorageRef.current = null;
    setIsProfilesLoaded(false);
    let loadRevision = 0;
    const load = async () => {
      const profilesStartedAt = performance.now();
      const requestRevision = ++loadRevision;
      const targetEnv = getResourceEnvironment();
      let folder = getProfileResourceFolder(null, targetEnv);
      setIsProfilesLoaded(false);
      const destination = { environment: targetEnv, folder, folderId: getResourceSettings(targetEnv)?.folderId };
      setProfileReadStatus({ ...destination, state: 'loading' });
      try {
        const api = (window as any).electronAPI;
        if (targetEnv === 'cloud') {
          const token = getSavedDriveToken();
          if (!token) throw new Error('웹드라이브 인증을 갱신해 주세요.');
          const drive = await import('@/lib/gdrive/googleDriveClient');
          const saved = getResourceSettings('cloud');
          const resolved = saved?.folderId
            ? { name: saved.path, folderId: saved.folderId }
            : await drive.resolveDriveResourceFolderByName(token);
          if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
          folder = resolved.name;
          destination.folder = folder;
          destination.folderId = resolved.folderId;
        }
        if (targetEnv === 'local' && api?.ensureLocalEnvironment) {
          const settings = getResourceSettings('local');
          const initialized = await api.ensureLocalEnvironment({
            resourceFolder: settings?.kind === 'local' ? settings.path : undefined,
            workspaceFolder: localStorage.getItem('onrivi_last_local_workspace_path') || (workspaceType === 'local' ? localStorage.getItem('onrivi_workspace_path') : undefined),
            profiles: SYSTEM_PROFILES,
          });
          if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
          if (!initialized?.success) throw new Error(initialized?.error || '로컬 작업 환경 초기화 실패');
          folder = initialized.resourcePath;
          destination.folder = folder;
          saveResourceSettings({ kind: 'local', path: folder }, 'local', { silent: true });
          localStorage.setItem('onrivi_last_local_workspace_path', initialized.workspacePath);
          if (workspaceType !== 'cloud' && !rootFolder?.name) {
            setRootFolder({ name: initialized.workspacePath });
            setWorkspaceType('local');
            localStorage.setItem('onrivi_workspace_path', initialized.workspacePath);
            localStorage.setItem('rootFolder', JSON.stringify({ name: initialized.workspacePath, path: initialized.workspacePath }));
            localStorage.setItem('workspaceType', 'local');
          }
        }
        const readSettings = getResourceSettings(targetEnv);
        const readAccount = localStorage.getItem('onrivi_active_drive_account');
        const users = await fetchUserProfiles(folder, resourceFolderHandle, targetEnv);
        if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
        const currentSettings = getResourceSettings(targetEnv);
        if (currentSettings?.path !== readSettings?.path || currentSettings?.folderId !== readSettings?.folderId ||
            (targetEnv === 'cloud' && localStorage.getItem('onrivi_active_drive_account') !== readAccount)) return false;
        const normalized = users.filter(p => p && p.id !== 'default' && !isSystemProfileId(p.id))
          .map(p => normalizeCssProfile(p, SYSTEM_PROFILES));
        profileStorageRef.current = { folder, handle: resourceFolderHandle, hash: JSON.stringify(normalized) };
        setProfiles([...SYSTEM_PROFILES, ...normalized]);
        if (resourceFolder !== folder) setResourceFolder(folder);
        setIsProfilesLoaded(true);
        setProfileReadStatus({ ...destination, state: 'success', userCount: normalized.length });
        console.info('[STARTUP timing] profile load ms=%d environment=%s', Math.round(performance.now() - profilesStartedAt), targetEnv);
        return true;
      } catch (error) {
        if (cancelled || requestRevision !== loadRevision) return false;
        console.info('[STARTUP timing] profile load failed after ms=%d', Math.round(performance.now() - profilesStartedAt));
        logError({
          file: 'frontend/src/hooks/editor/useEditorProfiles.ts',
          func: 'loadUserProfiles',
          doing: `리소스 폴더(${targetEnv})에서 userCssProfiles.json 서식 프로필 파일 읽기 중`,
          target: folder || targetEnv,
          error,
        });
        setProfileReadStatus({ ...destination, state: 'error', error: error instanceof Error ? error.message : '서식 파일을 읽지 못했습니다.' });
        if (folder) {
          showToast(error instanceof Error ? error.message : 'userCssProfiles.json을 읽지 못했습니다. 리소스 폴더 연결과 파일을 확인해 주세요.', 'error');
        }
        return false;
      }
    };
    const reload = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      void load().then(success => detail?.resolve?.(success));
    };
    window.addEventListener('onrivi:reload_profiles', reload);
    void load();
    return () => { cancelled = true; window.removeEventListener('onrivi:reload_profiles', reload); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, resourceFolder, resourceFolderHandle, profileStorageRevision, workspaceType]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorProfiles-profilesSave] profilesSave
  // ====================================================================
  useEffect(() => {
    if (!mounted || !isProfilesLoaded) return;
    const targetEnv = getResourceEnvironment();
    const folder = getProfileResourceFolder(resourceFolder, targetEnv);
    const source = profileStorageRef.current;
    if (!source || source.folder !== folder || source.handle !== resourceFolderHandle) return;
    const userProfiles = profiles.filter(p => p.id !== 'default' && !isSystemProfileId(p.id));
    const hash = JSON.stringify(userProfiles);
    if (source.hash === hash) return;
    const timerId = setTimeout(() => {
      if (profileStorageRef.current !== source || getResourceEnvironment() !== targetEnv || getProfileResourceFolder(null, targetEnv) !== folder) return;
      source.hash = '';
      void persistUserProfiles(userProfiles, folder, resourceFolderHandle, targetEnv).then(ok => {
        if (profileStorageRef.current !== source) return;
        if (ok) {
          source.hash = hash;
        } else {
          logError({
            file: 'frontend/src/hooks/editor/useEditorProfiles.ts',
            func: 'profilesSave',
            doing: `리소스 폴더(${targetEnv})에 userCssProfiles.json 서식 프로필 저장 중`,
            target: folder || targetEnv,
            error: new Error('persistUserProfiles returned false'),
          });
          showToast('userCssProfiles.json 저장에 실패했습니다. 리소스 폴더 연결과 쓰기 권한을 확인해 주세요.', 'error');
        }
      });
    }, 500);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isProfilesLoaded, profiles, resourceFolder, resourceFolderHandle, workspaceType]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorProfiles-activeProfileSave] activeProfileSave
  // ====================================================================
  useEffect(() => {
    if (mounted && activeProfileId) {
      localStorage.setItem('activeCssProfileId', activeProfileId);
    }
  }, [activeProfileId, mounted]);

  /**
   * ========================================================================================
   * [함수명] resolveEffectiveDocumentProfile - 문서 Frontmatter 및 현재 편집 모드를 기반으로 유효 서식 프로필을 결정합니다.
   *
   * @param {string} docText - 마크다운 문서 본문 텍스트
   * @returns {CssProfile} 문서에 최종 적용될 CSS 서식 프로필 객체
   * ==========================================================================================
   */
  const resolveEffectiveDocumentProfile = useCallback((docText: string) => {
    const preferLive = previewMode === 'css-style' || isStyleModalOpen;
    const stateProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
    if (preferLive) {
      return documentBookProfile(docText, stateProfile, true);
    }
    const { data } = extractFrontmatter(docText || '');
    if (data.css_profile) {
      const profileId = data.css_profile.trim().replace(/^["']|["']$/g, '');
      const matched = profiles.find(p =>
        p.id === profileId ||
        p.name === profileId ||
        ((data.css_profile === 'ChatGPT 스타일 콘텐츠' || data.css_profile === '온리비어서 표준 서식' || data.css_profile === 'Onrivi 기본서식') && p.id === SYSTEM_PROFILES[0].id) ||
        ((data.css_profile === 'GitHub 기술 블로그/명세서' || data.css_profile === 'system-2') && p.id === 'github-readme-style') ||
        ((data.css_profile === 'Stroy Book - 오른쪽 그림 표지' || data.css_profile === 'Story Book - 오른쪽 그림 표지') && p.id === 'profile-1792072480655') ||
        ((data.css_profile === 'Story Book-전체표지' || data.css_profile === 'Story Book - 전체표지' || data.css_profile === 'profile-1792072443551' || data.css_profile === 'profile-1792073192013') && (p.id === 'profile-1792073192013' || p.id === 'profile-1792072443551'))
      );
      if (matched) {
        return documentBookProfile(docText, matched, false);
      }
      const snapshot = legacyBookProfile(docText);
      if (snapshot?.layout) {
        return snapshot;
      }
    }
    return documentBookProfile(docText, stateProfile, false);
  }, [profiles, activeProfileId, previewMode, isStyleModalOpen]);

  // Frontmatter css_profile 동기화
  useEffect(() => {
    if (isStyleModalOpen) return;
    const { data } = extractFrontmatter(content);
    if (data.css_profile) {
      const profileId = data.css_profile.trim().replace(/^["']|["']$/g, '');
      const targetProfile = profiles.find(p => 
        p.id === profileId || 
        p.name === profileId ||
        ((data.css_profile === 'ChatGPT 스타일 콘텐츠' || data.css_profile === '온리비어서 표준 서식' || data.css_profile === 'Onrivi 기본서식') && p.id === SYSTEM_PROFILES[0].id) ||
        ((data.css_profile === 'GitHub 기술 블로그/명세서' || data.css_profile === 'system-2') && p.id === 'github-readme-style') ||
        ((data.css_profile === 'Stroy Book - 오른쪽 그림 표지' || data.css_profile === 'Story Book - 오른쪽 그림 표지') && p.id === 'profile-1792072480655') ||
        ((data.css_profile === 'Story Book-전체표지' || data.css_profile === 'Story Book - 전체표지' || data.css_profile === 'profile-1792072443551' || data.css_profile === 'profile-1792073192013') && (p.id === 'profile-1792073192013' || p.id === 'profile-1792072443551'))
      );
      if (targetProfile) {
        if (targetProfile.id !== activeProfileId) {
          setActiveProfileId(targetProfile.id);
        }
      } else {
        const snapshot = legacyBookProfile(content);
        if (snapshot?.layout) {
          setProfiles(previous => previous.some(profile => profile.id === snapshot.id) ? previous : [...previous, snapshot]);
          setActiveProfileId(snapshot.id);
          return;
        }
        if (activeProfileId !== SYSTEM_PROFILES[0].id) {
          setActiveProfileId(SYSTEM_PROFILES[0].id);
        }
      }
    } else {
      if (activeProfileId !== SYSTEM_PROFILES[0].id) {
        setActiveProfileId(SYSTEM_PROFILES[0].id);
      }
    }
  }, [content, activeProfileId, profiles, isStyleModalOpen]);

  /**
   * ========================================================================================
   * [함수명] handleProfileChange - 사이드바 또는 서식 모달에서 문서 서식 프로필을 변경하고 Frontmatter 및 제목 번호를 동기화합니다.
   *
   * @param {string} newProfileId - 적용할 서식 프로필 ID
   * @param {CssProfile} [appliedProfile] - 직접 전달된 서식 프로필 객체 (선택)
   * @returns {void}
   * ==========================================================================================
   */
  const handleProfileChange = useCallback((newProfileId: string, appliedProfile?: CssProfile) => {
    setActiveProfileId(newProfileId);
    const selectedProfile = appliedProfile ?? profiles.find(p => p.id === newProfileId);
    const profileName = selectedProfile ? selectedProfile.name : undefined;
    const currentModel = isEditorMountedRef.current ? editorRef.current?.getModel() : null;
    const currentContent = currentModel?.getValue() ?? contentRef.current;
    const newContent = syncMarkdownHeadingNumbers(
      writeBookProfileSnapshot(updateCssProfileInFrontmatter(currentContent, newProfileId, profileName), selectedProfile),
      selectedProfile?.headingNumbering,
      resolveEffectiveDocumentProfile(currentContent).headingNumbering
    );
    if (currentContent !== newContent) {
      contentRef.current = newContent;
      updateContent(newContent, false, true);
      setTabs(previous => previous.map(tab => tab.id === activeTabIdRef.current ? { ...tab, content: newContent, isModified: true } : tab));
    }
  }, [setActiveProfileId, editorRef, profiles, updateContent, resolveEffectiveDocumentProfile, contentRef, isEditorMountedRef, activeTabIdRef, setTabs]);

  // 제목 번호 자동 넘버링 동기화
  const headingSourceFormatsRef = useRef(new Map<string, unknown[]>());
  const isHeadingStyleTab = Boolean(tabs.find(tab => tab.id === activeTabId)?.isStyleTab);
  useEffect(() => {
    if (!isProfilesLoaded || !activeTabId || isRestrictedUser || currentFileName === '도움말.md' || isHeadingStyleTab) return;
    const profile = resolveEffectiveDocumentProfile(content);
    if (profile.layout) return;
    if (directEditEnabled && document.querySelector('.visual-document-surface[contenteditable="true"]')?.contains(document.activeElement)) return;
    const formats = profile.headingNumbering || [];
    const previous = headingSourceFormatsRef.current.get(activeTabId) || formats;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      if (cancelled || activeTabIdRef.current !== activeTabId) return;
      if (isComposingRef?.current) { timer = setTimeout(sync, 100); return; }
      const model = isEditorMountedRef.current ? editorRef.current?.getModel() : null;
      const original = model && previewModeRef.current !== 'preview' ? model.getValue() : contentRef.current;
      const next = syncMarkdownHeadingNumbers(original, formats, previous);
      headingSourceFormatsRef.current.set(activeTabId, formats);
      if (next === original) return;
      contentRef.current = next;
      updateContent(next, false, true);
      setTabs(items => items.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
    };
    timer = setTimeout(sync, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content, profiles, activeProfileId, activeTabId, isProfilesLoaded, isRestrictedUser, currentFileName, isHeadingStyleTab, directEditEnabled, updateContent, resolveEffectiveDocumentProfile, activeTabIdRef, contentRef, editorRef, isComposingRef, isEditorMountedRef, previewModeRef, setTabs]);

  // 가로형 그림책 레거시 프로필 저장/동기화
  useEffect(() => {
    if (!isProfilesLoaded) return;
    const original = content;
    const { data } = extractFrontmatter(original);
    if (!data.onrivi_picturebook_profile) return;
    const legacy = legacyBookProfile(original);
    const profile = profiles.find(item => item.id === legacy?.id);
    if (legacy && !profile) {
      setProfiles(previous => previous.some(item => item.id === legacy.id) ? previous : [...previous, legacy]);
      return;
    }
    if (!profile) return;
    let cancelled = false;
    const environment = getResourceEnvironment();
    const folder = getProfileResourceFolder(resourceFolder, environment);
    void persistUserProfiles(profiles.filter(item => item.id !== 'default' && !isSystemProfileId(item.id)), folder, resourceFolderHandle, environment).then(ok => {
      if (!ok || cancelled || contentRef.current !== original) return;
      const next = writeBookProfileSnapshot(original);
      contentRef.current = next;
      updateContent(next);
      setTabs(previous => previous.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
    });
    return () => { cancelled = true; };
  }, [content, profiles, isProfilesLoaded, activeTabId, updateContent, resourceFolder, resourceFolderHandle, contentRef, setTabs]);

  return {
    profiles,
    setProfiles,
    activeProfileId,
    setActiveProfileId,
    isProfilesLoaded,
    setIsProfilesLoaded,
    profileStorageRevision,
    setProfileStorageRevision,
    resolveEffectiveDocumentProfile,
    handleProfileChange,
  };
}
