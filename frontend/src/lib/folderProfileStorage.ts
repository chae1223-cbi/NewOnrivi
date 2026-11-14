// ====================================================================
// 📊 [OMD-STORE-folderProfileStorage-0001] frontend/src/lib/folderProfileStorage.ts
// 🎯 @KICK  : 폴더별 디폴트 서식 프로필(Default CSS Profile) 저장·조회·이름변경·삭제 및 계층적 상속 해석 모듈
// 🛡️ @GUARD : 계정별 격리 스토리지(browserAccountStorage) 사용, 경로 정규화(\ ➔ /, NFC, 대소문자 통일) 및 드라이브 ID 다중 키 매핑 보장
// 🚨 @PATCH : **2026-11-14** — [온리비_* 8종 시스템 서식 개편에 따른 레거시 서식 ID 하위 호환 매핑 보강]
// 🚨 @PATCH : **2026-11-14** — [폴더별 디폴트 서식 저장·관리 및 3단계 서식 우선순위(파일 지정 ➔ 폴더 지정 ➔ Onrivi 기본서식) 엔진 신설]:
//             1) 폴더 생성 및 폴더 컨텍스트 메뉴에서 지정한 폴더별 기본 서식(profileId)을 영속 저장·관리하는 스토리지 헬퍼 구현
//             2) 로컬 절대경로, 워크스페이스 상대경로, Google Drive 폴더 ID를 모두 매핑하여 환경(Local/Browser/Cloud)에 관계없이 일관된 폴더 서식 조회 지원
//             3) 파일 경로로부터 상위 폴더를 역추적하여 폴더에 지정된 기본 서식을 반환하고, 폴더 이름 변경/삭제 시 매핑 자동 동기화 지원
// 🔗 @CALLS : browserAccountStorage, SYSTEM_PROFILES, DEFAULT_PROFILE
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { CssProfile } from '@/types/cssProfile';
import { DEFAULT_PROFILE, SYSTEM_PROFILES } from '@/constants/cssProfile';

const FOLDER_PROFILES_STORAGE_KEY = 'onrivi_folder_default_profiles';

export interface FolderProfileEntry {
  profileId: string;
  profileName?: string;
  folderPath?: string;
  updatedAt: number;
}

export type FolderProfileMap = Record<string, FolderProfileEntry>;

/**
 * ========================================================================================
 * [normalizePathKey] 경로 문자열을 슬래시(/), 소문자, NFC 표준 형태로 정규화합니다.
 *
 * @param {string | null | undefined} rawPath - 원본 파일 또는 폴더 경로
 * @returns {string} 정규화된 경로 키 문자열
 *
 * @example
 * const key = normalizePathKey('D:\\Workspace\\Docs\\'); // 'd:/workspace/docs'
 * ==========================================================================================
 */
export function normalizePathKey(rawPath?: string | null): string {
  if (!rawPath || typeof rawPath !== 'string') return '';
  return rawPath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .trim()
    .normalize('NFC')
    .toLowerCase();
}

/**
 * ========================================================================================
 * [extractRelativeFolderKey] 루트 워크스페이스 경로 대비 상대 폴더 경로 키를 추출합니다.
 *
 * @param {string | null | undefined} folderPath - 대상 폴더 경로
 * @param {any} [rootFolder] - 현재 워크스페이스 루트 폴더 객체 또는 경로
 * @returns {string} 'rel:<상대경로>' 형태의 키 (추출 불가 시 빈 문자열)
 *
 * @example
 * const relKey = extractRelativeFolderKey('D:/Work/Report', { path: 'D:/Work' }); // 'rel:report'
 * ==========================================================================================
 */
export function extractRelativeFolderKey(folderPath?: string | null, rootFolder?: any): string {
  const normTarget = normalizePathKey(folderPath);
  if (!normTarget) return '';

  const rawRoot =
    typeof rootFolder === 'string'
      ? rootFolder
      : rootFolder?.path || rootFolder?.name || '';
  const normRoot = normalizePathKey(rawRoot);

  if (normRoot && normTarget.startsWith(normRoot + '/')) {
    const rel = normTarget.slice(normRoot.length + 1).replace(/^\/+/, '');
    return rel ? `rel:${rel}` : '';
  }

  // 이미 루트 접두사가 없는 상대 경로인 경우
  if (!/^[a-z]:\//i.test(normTarget) && !normTarget.startsWith('/')) {
    const cleanRel = normTarget.replace(/^googledrive\//i, '');
    return cleanRel ? `rel:${cleanRel}` : '';
  }

  return '';
}

/**
 * ========================================================================================
 * [readFolderProfileMap] 스토리지에서 폴더별 디폴트 서식 매핑 테이블을 읽어옵니다.
 *
 * @returns {FolderProfileMap} 폴더 키별 서식 설정 맵 객체
 *
 * @example
 * const map = readFolderProfileMap();
 * ==========================================================================================
 */
export function readFolderProfileMap(): FolderProfileMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FOLDER_PROFILES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as FolderProfileMap;
  } catch {
    return {};
  }
}

/**
 * ========================================================================================
 * [writeFolderProfileMap] 폴더별 디폴트 서식 매핑 테이블을 스토리지에 저장하고 변경 이벤트를 발행합니다.
 *
 * @param {FolderProfileMap} map - 저장할 폴더별 서식 매핑 객체
 * @returns {void}
 *
 * @example
 * writeFolderProfileMap(nextMap);
 * ==========================================================================================
 */
export function writeFolderProfileMap(map: FolderProfileMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLDER_PROFILES_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('onrivi:folder_profiles_updated', { detail: { map } }));
  } catch {}
}

/**
 * ========================================================================================
 * [getAvailableProfilesSnapshot] 현재 메모리에 로드된 전체 서식 프로필(시스템 + 사용자) 목록을 반환합니다.
 *
 * @param {CssProfile[]} [explicitProfiles] - 명시적으로 전달된 프로필 배열
 * @returns {CssProfile[]} 전체 서식 프로필 배열
 *
 * @example
 * const allProfiles = getAvailableProfilesSnapshot();
 * ==========================================================================================
 */
export function getAvailableProfilesSnapshot(explicitProfiles?: CssProfile[]): CssProfile[] {
  if (Array.isArray(explicitProfiles) && explicitProfiles.length > 0) {
    return explicitProfiles;
  }
  if (typeof window !== 'undefined' && Array.isArray((window as any).__onriviProfiles) && (window as any).__onriviProfiles.length > 0) {
    return (window as any).__onriviProfiles as CssProfile[];
  }
  return [...SYSTEM_PROFILES];
}

/**
 * ========================================================================================
 * [setFolderDefaultProfile] 특정 폴더에 디폴트 서식 프로필을 지정하거나 해제합니다.
 *
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string }} folderTarget - 폴더 경로 또는 폴더 노드
 * @param {string | null | undefined} profileId - 지정할 서식 프로필 ID (빈 문자열 또는 null이면 지정 해제)
 * @param {any} [rootFolder] - 루트 폴더 정보 (상대경로 키 동시 생성용)
 * @param {string} [profileName] - 서식 프로필 표시 이름
 * @returns {void}
 *
 * @example
 * setFolderDefaultProfile('D:/Workspace/Reports', 'corp-strategy-report', rootFolder, '대기업 전략기획서');
 * ==========================================================================================
 */
export function setFolderDefaultProfile(
  folderTarget: string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined,
  profileId: string | null | undefined,
  rootFolder?: any,
  profileName?: string
): void {
  if (!folderTarget) return;

  const rawPath = typeof folderTarget === 'string' ? folderTarget : (folderTarget.path || folderTarget.name || '');
  const driveId = typeof folderTarget === 'object' ? (folderTarget.driveId || folderTarget.id) : undefined;

  const normKey = normalizePathKey(rawPath);
  const relKey = extractRelativeFolderKey(rawPath, rootFolder);
  const driveKey = driveId ? `gdrive:${driveId}` : '';

  const keys = [normKey, relKey, driveKey].filter(Boolean);
  if (keys.length === 0) return;

  const map = readFolderProfileMap();
  const cleanProfileId = (profileId || '').trim();

  if (!cleanProfileId || cleanProfileId === 'NONE') {
    for (const k of keys) {
      delete map[k];
    }
    writeFolderProfileMap(map);
    return;
  }

  const allProfiles = getAvailableProfilesSnapshot();
  const matchedProfile = allProfiles.find(p => p.id === cleanProfileId);
  const resolvedName = profileName || matchedProfile?.name || cleanProfileId;

  const entry: FolderProfileEntry = {
    profileId: cleanProfileId,
    profileName: resolvedName,
    folderPath: rawPath,
    updatedAt: Date.now(),
  };

  for (const k of keys) {
    map[k] = entry;
  }
  writeFolderProfileMap(map);
}

/**
 * ========================================================================================
 * [getFolderDefaultProfileEntry] 특정 폴더(또는 그 상위 폴더)에 지정된 디폴트 서식 정보를 조회합니다.
 *
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined} folderTarget - 조회할 폴더 경로 또는 노드
 * @param {any} [rootFolder] - 루트 폴더 정보
 * @param {boolean} [includeAncestors=true] - 현재 폴더에 미지정 시 상위 부모 폴더의 서식을 상속 조회할지 여부
 * @returns {FolderProfileEntry | null} 매칭된 폴더 디폴트 서식 항목 또는 null
 *
 * @example
 * const entry = getFolderDefaultProfileEntry(node, rootFolder);
 * ==========================================================================================
 */
export function getFolderDefaultProfileEntry(
  folderTarget: string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined,
  rootFolder?: any,
  includeAncestors: boolean = true
): FolderProfileEntry | null {
  if (!folderTarget) return null;
  const map = readFolderProfileMap();
  if (!map || Object.keys(map).length === 0) return null;

  const driveId = typeof folderTarget === 'object' ? (folderTarget.driveId || folderTarget.id) : undefined;
  if (driveId && map[`gdrive:${driveId}`]?.profileId) {
    return map[`gdrive:${driveId}`];
  }

  const rawPath = typeof folderTarget === 'string' ? folderTarget : (folderTarget.path || folderTarget.name || '');
  const normPath = normalizePathKey(rawPath);
  if (!normPath) return null;

  const rawRoot =
    typeof rootFolder === 'string'
      ? rootFolder
      : rootFolder?.path || rootFolder?.name || '';
  const normRoot = normalizePathKey(rawRoot);

  // 현재 폴더부터 루트 폴더 직전까지 계층적으로 탐색
  let current = normPath;
  while (current) {
    if (map[current]?.profileId) {
      return map[current];
    }
    const relKey = extractRelativeFolderKey(current, rootFolder);
    if (relKey && map[relKey]?.profileId) {
      return map[relKey];
    }

    if (!includeAncestors) break;
    if (normRoot && current === normRoot) break;

    const lastSlash = current.lastIndexOf('/');
    if (lastSlash <= 0) break;
    const parent = current.substring(0, lastSlash);
    if (!parent || parent === current || /^[a-z]:$/i.test(parent)) break;
    if (normRoot && parent.length < normRoot.length) break;
    current = parent;
  }

  return null;
}

/**
 * ========================================================================================
 * [getFolderDefaultProfileId] 특정 폴더에 지정된 디폴트 서식 프로필 ID를 반환합니다.
 *
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined} folderTarget - 조회할 폴더 경로 또는 노드
 * @param {any} [rootFolder] - 루트 폴더 정보
 * @param {boolean} [includeAncestors=true] - 상위 폴더 상속 여부
 * @returns {string | null} 지정된 서식 프로필 ID 또는 null
 *
 * @example
 * const profileId = getFolderDefaultProfileId('D:/Work/Reports', rootFolder);
 * ==========================================================================================
 */
export function getFolderDefaultProfileId(
  folderTarget: string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined,
  rootFolder?: any,
  includeAncestors: boolean = true
): string | null {
  const entry = getFolderDefaultProfileEntry(folderTarget, rootFolder, includeAncestors);
  return entry?.profileId || null;
}

/**
 * ========================================================================================
 * [getFolderDefaultProfileIdForFile] 파일 경로(또는 파일 노드)가 속한 폴더의 디폴트 서식 프로필 ID를 반환합니다.
 *
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined} fileTarget - 파일 경로 또는 파일 노드
 * @param {any} [rootFolder] - 루트 폴더 정보
 * @returns {string | null} 파일이 속한 폴더에 지정된 디폴트 서식 프로필 ID (없으면 null)
 *
 * @example
 * const folderProfileId = getFolderDefaultProfileIdForFile('D:/Work/Reports/weekly.md', rootFolder);
 * ==========================================================================================
 */
export function getFolderDefaultProfileIdForFile(
  fileTarget: string | { path?: string; name?: string; driveId?: string; id?: string } | null | undefined,
  rootFolder?: any
): string | null {
  if (!fileTarget) return null;
  const rawFilePath = typeof fileTarget === 'string' ? fileTarget : (fileTarget.path || '');
  const normFile = normalizePathKey(rawFilePath);
  if (!normFile) return null;

  const lastSlash = normFile.lastIndexOf('/');
  if (lastSlash === -1) {
    // 루트에 위치한 파일인 경우
    return null;
  }

  const parentFolderPath = normFile.substring(0, lastSlash);
  if (!parentFolderPath) return null;

  const rawRoot =
    typeof rootFolder === 'string'
      ? rootFolder
      : rootFolder?.path || rootFolder?.name || '';
  const normRoot = normalizePathKey(rawRoot);

  // 부모 폴더가 워크스페이스 루트 자체인 경우 루트에 별도 지정이 없으면 null
  if (normRoot && parentFolderPath === normRoot) {
    return getFolderDefaultProfileId(parentFolderPath, rootFolder, false);
  }

  return getFolderDefaultProfileId(parentFolderPath, rootFolder, true);
}

/**
 * ========================================================================================
 * [resolveProfileByPriority] 3단계 우선순위(파일 지정 서식 ➔ 폴더 지정 서식 ➔ Onrivi 기본서식)로 서식 프로필을 결정합니다.
 *
 * @param {object} params - 서식 결정 파라미터
 * @param {string | null} [params.fileProfileIdOrName] - 1순위: 파일 자체에 지정된 서식 ID 또는 이름
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string } | null} [params.folderTarget] - 2순위 조회용: 대상 폴더 경로 또는 노드
 * @param {string | { path?: string; name?: string; driveId?: string; id?: string } | null} [params.fileTarget] - 2순위 조회용: 대상 파일 경로 또는 노드
 * @param {any} [params.rootFolder] - 루트 폴더 정보
 * @param {CssProfile[]} [params.profiles] - 전체 서식 프로필 목록
 * @returns {CssProfile} 최종 결정된 유효 서식 프로필 객체 (최종 폴백: DEFAULT_PROFILE = Onrivi 기본서식)
 *
 * @example
 * const profile = resolveProfileByPriority({ fileProfileIdOrName: data.css_profile, fileTarget: currentPath, rootFolder, profiles });
 * ==========================================================================================
 */
export function resolveProfileByPriority({
  fileProfileIdOrName,
  folderTarget,
  fileTarget,
  rootFolder,
  profiles,
}: {
  fileProfileIdOrName?: string | null;
  folderTarget?: string | { path?: string; name?: string; driveId?: string; id?: string } | null;
  fileTarget?: string | { path?: string; name?: string; driveId?: string; id?: string } | null;
  rootFolder?: any;
  profiles?: CssProfile[];
}): CssProfile {
  const allProfiles = getAvailableProfilesSnapshot(profiles);
  const onriviDefault = allProfiles.find(p => p.id === SYSTEM_PROFILES[0].id) || DEFAULT_PROFILE;

  const findMatchingProfile = (idOrName?: string | null): CssProfile | undefined => {
    if (!idOrName) return undefined;
    const cleaned = idOrName.trim().replace(/^["']|["']$/g, '');
    if (!cleaned) return undefined;
    return allProfiles.find(
      p =>
        p.id === cleaned ||
        p.name === cleaned ||
        ((cleaned === 'ChatGPT 스타일 콘텐츠' || cleaned === '온리비어서 표준 서식' || cleaned === 'Onrivi 기본서식' || cleaned === 'google-dev-docs' || cleaned === 'Google Developers 기술 문서 (DevSite 표준)' || cleaned === 'github-readme-style' || cleaned === 'GitHub 기술 블로그/명세서' || cleaned === 'system-2') &&
          p.id === SYSTEM_PROFILES[0].id) ||
        ((cleaned === 'legal-contract-a4' || cleaned === 'Onrivi 법률·계약서 A4 공식 문서') && p.id === 'onrivi-legal-contract') ||
        ((cleaned === 'ai-friendly-report' || cleaned === 'ks-tech-standard' || cleaned === 'corp-strategy-report' || cleaned === 'academic-kdi-report' || cleaned === 'global-tech-6pager') &&
          p.id === 'onrivi-report') ||
        ((cleaned === 'profile-1791514218283' || cleaned === '편안한 전자책 서식' || cleaned === 'profile-tech-book-2026') &&
          p.id === 'onrivi-prose-book') ||
        ((cleaned === 'profile-official-notice-letter') && p.id === 'onrivi-application-doc')
    );
  };

  // 1순위: 해당 파일에 적용할 서식이 지정되어 있으면 지정된 서식으로 반영
  if (fileProfileIdOrName) {
    const matchedFileProfile = findMatchingProfile(fileProfileIdOrName);
    if (matchedFileProfile) {
      return matchedFileProfile;
    }
  }

  // 2순위: 파일에 지정된 서식이 없으면 폴더에 지정된 디폴트 서식으로 반영
  const folderProfileId =
    (folderTarget ? getFolderDefaultProfileId(folderTarget, rootFolder, true) : null) ||
    (fileTarget ? getFolderDefaultProfileIdForFile(fileTarget, rootFolder) : null);

  if (folderProfileId) {
    const matchedFolderProfile = findMatchingProfile(folderProfileId);
    if (matchedFolderProfile) {
      return matchedFolderProfile;
    }
  }

  // 3순위: 파일 및 폴더에 적용된 서식이 없으면 디폴트로 폴더와 상관없이 Onrivi 기본서식 반영
  return onriviDefault;
}

/**
 * ========================================================================================
 * [renameFolderDefaultProfile] 폴더 이름 변경 시 해당 폴더 및 하위 폴더의 디폴트 서식 매핑 키를 이전합니다.
 *
 * @param {string} oldFolderPath - 변경 전 폴더 경로
 * @param {string} newFolderPath - 변경 후 폴더 경로
 * @param {any} [rootFolder] - 루트 폴더 정보
 * @returns {void}
 *
 * @example
 * renameFolderDefaultProfile('D:/Work/OldName', 'D:/Work/NewName', rootFolder);
 * ==========================================================================================
 */
export function renameFolderDefaultProfile(oldFolderPath: string, newFolderPath: string, rootFolder?: any): void {
  const normOld = normalizePathKey(oldFolderPath);
  const normNew = normalizePathKey(newFolderPath);
  if (!normOld || !normNew || normOld === normNew) return;

  const relOld = extractRelativeFolderKey(oldFolderPath, rootFolder);
  const relNew = extractRelativeFolderKey(newFolderPath, rootFolder);

  const map = readFolderProfileMap();
  let changed = false;
  const nextMap: FolderProfileMap = { ...map };

  for (const [key, entry] of Object.entries(map)) {
    if (key === normOld) {
      delete nextMap[key];
      nextMap[normNew] = { ...entry, folderPath: newFolderPath, updatedAt: Date.now() };
      changed = true;
    } else if (key.startsWith(normOld + '/')) {
      const suffix = key.slice(normOld.length);
      delete nextMap[key];
      nextMap[normNew + suffix] = { ...entry, updatedAt: Date.now() };
      changed = true;
    } else if (relOld && relNew && key === relOld) {
      delete nextMap[key];
      nextMap[relNew] = { ...entry, folderPath: newFolderPath, updatedAt: Date.now() };
      changed = true;
    } else if (relOld && relNew && key.startsWith(relOld + '/')) {
      const suffix = key.slice(relOld.length);
      delete nextMap[key];
      nextMap[relNew + suffix] = { ...entry, updatedAt: Date.now() };
      changed = true;
    }
  }

  if (changed) {
    writeFolderProfileMap(nextMap);
  }
}

/**
 * ========================================================================================
 * [removeFolderDefaultProfile] 폴더 삭제 시 해당 폴더 및 하위 폴더의 디폴트 서식 매핑을 정리합니다.
 *
 * @param {string} folderPath - 삭제된 폴더 경로
 * @param {any} [rootFolder] - 루트 폴더 정보
 * @param {string} [driveId] - Google Drive 폴더 ID (있는 경우)
 * @returns {void}
 *
 * @example
 * removeFolderDefaultProfile('D:/Work/DeletedFolder', rootFolder);
 * ==========================================================================================
 */
export function removeFolderDefaultProfile(folderPath: string, rootFolder?: any, driveId?: string): void {
  const normTarget = normalizePathKey(folderPath);
  const relTarget = extractRelativeFolderKey(folderPath, rootFolder);
  const driveKey = driveId ? `gdrive:${driveId}` : '';

  const map = readFolderProfileMap();
  let changed = false;
  const nextMap: FolderProfileMap = { ...map };

  for (const key of Object.keys(map)) {
    if (
      (normTarget && (key === normTarget || key.startsWith(normTarget + '/'))) ||
      (relTarget && (key === relTarget || key.startsWith(relTarget + '/'))) ||
      (driveKey && key === driveKey)
    ) {
      delete nextMap[key];
      changed = true;
    }
  }

  if (changed) {
    writeFolderProfileMap(nextMap);
  }
}
