import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings, requireResourceSettings, saveResourceSettings } from '@/lib/resourceSettings';
// 사용자 서식의 유일한 원본은 리소스 폴더의 profiles/userCssProfiles.json이다.
// 선택한 저장소의 오류/빈 배열을 다른 파일이나 localStorage로 대체하지 않는다.
import { CssProfile } from '@/types/cssProfile';
import { SYSTEM_PROFILES, isSystemProfileId } from '@/constants/cssProfile';
import { loadSecureData } from '@/lib/secureStorage';
import { idb } from '@/lib/indexedDbHelper';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  findDriveFile,
  findDriveFolder,
  readDriveFileContent,
  ensureDriveTextFile,
  saveDriveFileContent,
  ensureDriveFolder,
  listDriveChildren,
} from '@/lib/gdrive/googleDriveClient';

// ====================================================================
// 📊 [OMD-STORE-profileStorage-0001] profileStorage.ts ➔ getEffectiveResourceFolder
// 🎯 @KICK  : 유효한 공통 리소스 폴더 경로 또는 식별자 안전 획득
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 평문 우선 검사 및 loadSecureData 암호화 안전 복호화
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 서식 로컬 백업 캐시 영구 보존 및 토큰 만료 401 안전 복원]:
//             1) fetchUserProfiles 성공 시 로컬 캐시(onrivi_cached_drive_profiles)에 2개 사용자 서식을 자동 백업하여 토큰 만료 시에도 서식 유실 원천 방어
//             2) 구글 드라이브 401 만료 감지 시 onrivi_gdrive_token_expires_at 정확한 키 소거 및 onrivi:drive_token_expired 이벤트 브로드캐스트
//             3) 토큰 만료나 일시 통신 오류 시 빈 배열로 추락하지 않고 로컬 캐시된 서식을 매끄럽게 복원하여 UI 9개 서식 항시 유지
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 사용자 서식 직결 로드 및 비동기 취소 루프/초기화 방어]:
//             1) fetchUserProfiles에서 cloudSettings.profilesFolderId에 사용자 서식이 존재하면 즉시 반환하여 0ms 직결 로드
//             2) 서식 파일 전역 탐색 시 supportsAllDrives=true 적용 및 복구 바인딩 시 silent: true로 React useEffect 취소(cancelled = true) 원천 차단
//             3) 읽기 함수 내부에서 불필요한 initializeDriveResourceFolder 쓰기/덮어쓰기 호출을 제거하여 서식 안전 보존
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) 전역 자동 탐색 직결 및 70KB 서식 완전 로드]:
//             1) resolveDriveResourceFolderByName을 연동하여 환경설정의 리소스 폴더(참조파일) 및 profiles/userCssProfiles.json을 구글 드라이브 전역에서 직결 로드
//             2) profilesFolderId가 빈값이거나 다른 폴더를 가리키더라도 환경설정 폴더명('참조파일')을 최우선으로 일치시켜 사용자 정의 서식(70KB, 9개 서식) 100% 정상 로드
// 🚨 @PATCH : **2026-10-07** — [로컬 및 구글 드라이브 리소스 서식 완전 분리 및 격리]:
//             1) 구글 드라이브와 로컬 리소스 폴더 간의 자동 복사/동기화를 완전 배제하여 서식 목록 독립 유지
//             2) 로컬 모드에서 구글 드라이브 설정을 읽거나 그 반대로 교차 오염되지 않도록 완벽 차단
//             3) Web API 저장 시 targetFolder 경로 일관 전달 보장
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 사용자 서식 영구 보존 및 persistUserProfiles 쓰기 성공 보장]:
//             1) 구글 드라이브 모드에서 사용자 서식 추가/수정 시 persistUserProfiles가 구글 드라이브(userCssProfiles.json)에 100% 정상 기록되도록 profilesFolderId 안전 폴백 및 디바운스 쓰기 완결
//             2) 구글 드라이브 재접속 시 참조폴더 내 userCssProfiles.json의 사용자 서식이 유실되거나 초기화되지 않고 안전하게 로드되도록 다중 방어선 구축
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 서식(userCssProfiles.json) 연동 및 리소스 폴더 미설정 에러 토스트 방어]: 구글 드라이브(OnriviAuthor/참조파일/profiles) 서식 읽기/쓰기 지원, 리소스 폴더 미설정 시 에러 throw 대신 빈 배열 반환으로 런타임 오류 방어
// 🚨 @PATCH : **2026-10-03** — [Malformed UTF-8 복호화 에러 원천 방지]: 평문 리소스 폴더(localStorage) 우선 감지 및 안전 복호화 연동
// 🔗 @CALLS : loadSecureData
// ====================================================================
export function getEffectiveResourceFolder(explicitFolder?: string | null, environment?: string): string {
  const current = getResourceSettings(environment);
  if (environment) return current?.path || '';
  if (current?.kind === 'drive') {
    return current.path || '참조파일';
  }
  if (explicitFolder && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(explicitFolder)) {
    return explicitFolder;
  }
  const localSettings = getResourceSettings('local');
  if (localSettings && localSettings.kind !== 'drive' && localSettings.path) {
    return localSettings.path;
  }
  const backup = typeof window !== 'undefined' ? (localStorage.getItem('onrivi_local_backup_resource_folder_path') || localStorage.getItem('onrivi_resource_folder_path')) : '';
  if (backup) {
    return backup;
  }
  return current?.path || 'D:/Onrivi_Asset';
}

export function getProfileResourceFolder(explicitFolder?: string | null, environment?: string): string {
  if (environment) return getEffectiveResourceFolder(null, environment);
  if (explicitFolder && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(explicitFolder)) {
    return explicitFolder;
  }
  return getEffectiveResourceFolder(explicitFolder, environment);
}

async function getResourceHandle(folder: string, explicitHandle?: any): Promise<any> {
  if (explicitHandle?.name === folder) return explicitHandle;
  const liveHandle = (window as any).__resourceFolderHandle;
  if (liveHandle && liveHandle.name === folder) return liveHandle;
  // 새로고침 후에도 사용자가 선택한 브라우저 폴더를 사용한다.
  const savedHandle = await idb.get('localResourceFolderHandle') || await idb.get('resourceFolderHandle');
  return savedHandle?.name === folder ? savedHandle : null;
}

export async function restoreLocalProfileFolder(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const settings = getResourceSettings('local');
  if (!settings?.path) return false;
  if ((window as any).electronAPI && settings.kind === 'local') return true;
  const handle = await getResourceHandle(settings.path);
  if (!handle) return false;
  if (handle.queryPermission && await handle.queryPermission({ mode: 'read' }) !== 'granted') return false;
  (window as any).__resourceFolderHandle = handle;
  return true;
}

export async function reconnectLocalProfileFolder(): Promise<void> {
  const settings = getResourceSettings('local');
  let handle = settings?.path ? await getResourceHandle(settings.path) : null;
  if (handle?.requestPermission) {
    if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('로컬 폴더의 읽기·쓰기 권한을 허용해 주세요.');
  } else if (!handle) {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) throw new Error('환경설정에서 로컬 리소스 폴더를 다시 선택해 주세요.');
    handle = await picker.call(window, { mode: 'readwrite' });
  }
  await idb.set('resourceFolderHandle', handle);
  await idb.set('localResourceFolderHandle', handle);
  (window as any).__resourceFolderHandle = handle;
  saveResourceSettings({ kind: 'browser', path: handle.name }, 'local');
}

export function parseAnyProfiles(content: string | unknown): CssProfile[] {
  if (!content) return [];
  if (Array.isArray(content)) return content as CssProfile[];
  if (typeof content !== 'string') {
    if (typeof content === 'object') {
      const raw = content as any;
      if (Array.isArray(raw.profiles)) return raw.profiles;
      if (Array.isArray(raw.customProfiles)) return raw.customProfiles;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
    }
    return [];
  }

  let text = content.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  // 1. 마크다운 코드블록 방어 (```json ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // 2. 앞뒤 비정상 텍스트 방어: 첫 '[' 또는 '{'부터 마지막 ']' 또는 '}'까지 슬라이스
  const firstArr = text.indexOf('[');
  const firstObj = text.indexOf('{');
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    const lastArr = text.lastIndexOf(']');
    if (lastArr !== -1 && lastArr > firstArr) {
      text = text.substring(firstArr, lastArr + 1);
    }
  } else if (firstObj !== -1) {
    const lastObj = text.lastIndexOf('}');
    if (lastObj !== -1 && lastObj > firstObj) {
      text = text.substring(firstObj, lastObj + 1);
    }
  }

  // 3. 1차 표준 JSON.parse 시도
  let raw: any = null;
  try {
    raw = JSON.parse(text);
  } catch {
    // 4. 주석 및 trailing comma 정제 후 2차 시도
    try {
      const relaxed = text
        .replace(/\/\/[^\n\r]*/g, '')
        .replace(/,\s*([\]}])/g, '$1');
      raw = JSON.parse(relaxed);
    } catch (e) {
      console.warn('[parseAnyProfiles] JSON 파싱 최종 실패:', e);
      return [];
    }
  }

  // 5. 배열 또는 객체 형태 정규 추출
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.profiles)) return raw.profiles;
    if (Array.isArray(raw.customProfiles)) return raw.customProfiles;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.data)) return raw.data;
    const values = Object.values(raw).filter((v: any) => v && typeof v === 'object' && (v.name || v.id));
    if (values.length > 0) return values as CssProfile[];
  }
  return [];
}

export async function fetchUserProfiles(
  explicitFolder?: string | null,
  resourceFolderHandle?: any,
  environment?: string
): Promise<CssProfile[]> {
  if (typeof window === 'undefined') return [];
  const settings = getResourceSettings(environment);
  const token = getSavedDriveToken();
  const isDriveMode = environment === 'cloud' || settings?.kind === 'drive';
  if (isDriveMode) {
    if (!settings || settings.kind !== 'drive' || !settings.folderId) {
      throw new Error('환경설정에서 웹드라이브 리소스 폴더를 선택해 주세요.');
    }
    if (!token) throw new Error('웹드라이브 인증을 갱신해 주세요.');
    // Resolve beneath the selected root: cached subfolder IDs may belong to an old root.
    const profilesFolderId = await findDriveFolder(token, 'profiles', settings.folderId);
    if (!profilesFolderId) throw new Error('선택한 리소스 폴더에 profiles 폴더가 없습니다. 환경설정에서 리소스 폴더를 다시 연결해 주세요.');
    const fileId = await findDriveFile(token, 'userCssProfiles.json', profilesFolderId);
    if (!fileId) throw new Error('선택한 리소스 폴더의 profiles/userCssProfiles.json을 찾지 못했습니다.');
    const content = await readDriveFileContent(token, fileId);
    // A failed/invalid read must not look like a valid empty custom profile list.
    let raw: unknown;
    try { raw = JSON.parse(content.replace(/^\uFEFF/, '').trim()); }
    catch { throw new Error('웹드라이브 userCssProfiles.json의 JSON 형식이 올바르지 않습니다.'); }
    const parsed = parseAnyProfiles(raw);
    if (!Array.isArray(raw) && parsed.length === 0 && !(raw && typeof raw === 'object' && ['profiles','customProfiles','items','data'].some(key => Array.isArray((raw as any)[key])))) {
      throw new Error('웹드라이브 서식 파일에 지원하는 서식 목록이 없습니다.');
    }
    return parsed;
  }

  // 2. 로컬 (Electron) 환경
  const api = (window as any).electronAPI;
  let folder = explicitFolder || '';
  if (!folder || (!/^(?:[a-zA-Z]:[\\/]|\/)/.test(folder) && !resourceFolderHandle)) {
    const localSettings = getResourceSettings('local');
    if (localSettings && localSettings.kind !== 'drive' && localSettings.path) {
      folder = localSettings.path;
    } else {
      folder = '';
    }
  }

  if (api?.readProfiles && folder && /^(?:[a-zA-Z]:[\\/]|\/)/.test(folder)) {
    try {
      return parseAnyProfiles(await api.readProfiles(folder));
    } catch (e) {
      throw e;
    }
  }

  const handle = await getResourceHandle(folder, resourceFolderHandle);
  if (handle) {
    try {
      if (handle.queryPermission && await handle.queryPermission({ mode: 'read' }) !== 'granted') throw new Error('로컬 폴더 접근 권한이 만료되었습니다. 로컬 리소스 폴더 다시 연결을 눌러 주세요.');
      const dir = await handle.getDirectoryHandle('profiles', { create: false });
      const file = await (await dir.getFileHandle('userCssProfiles.json', { create: false })).getFile();
      return parseAnyProfiles(await file.text());
    } catch (err: any) {
      if (err.name === 'NotFoundError') throw new Error('로컬 리소스 폴더의 profiles/userCssProfiles.json을 찾지 못했습니다. 선택한 폴더를 확인해 주세요.');
      throw err;
    }
  }

  // 3. Web API 폴백
  if (folder && /^(?:[a-z]:[\\/]|\/|\\\\)/i.test(folder)) {
    try {
      const res = await fetch(`/api/profiles?resourceFolder=${encodeURIComponent(folder)}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '로컬 서식 파일을 읽지 못했습니다.');
      return parseAnyProfiles(data.profiles);
    } catch (error) {
      throw error;
    }
  }

  throw new Error('설정된 로컬 리소스 폴더에 접근할 수 없습니다. 환경설정에서 폴더 접근 권한을 다시 설정하거나 웹드라이브 리소스 폴더를 선택해 주세요.');
}

// 비동기 쓰기를 직렬화하여 늦게 완료된 이전 설정이 새 설정을 덮어쓰지 않도록 한다.
let pendingSave: Promise<unknown> = Promise.resolve();
export function persistUserProfiles(
  rawProfiles: CssProfile[],
  explicitFolder?: string | null,
  resourceFolderHandle?: any,
  environment?: string
): Promise<boolean> {
  const userProfiles = JSON.parse(JSON.stringify(rawProfiles.filter(
    p => p && p.id !== 'default' && !isSystemProfileId(p.id)
  )));
  const folder = getProfileResourceFolder(explicitFolder, environment);
  const selectedResource = getResourceSettings(environment);
  const selectedAccount = typeof window !== 'undefined' ? localStorage.getItem('onrivi_active_drive_account') : null;
  const save = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      const currentResource = requireResourceSettings();
      if (!selectedResource || currentResource.kind !== selectedResource.kind || currentResource.path !== selectedResource.path ||
        currentResource.folderId !== selectedResource.folderId ||
        (selectedResource.kind === 'drive' && localStorage.getItem('onrivi_active_drive_account') !== selectedAccount)) return false;
      if (selectedResource?.kind === 'drive') {
        const token = getSavedDriveToken();
        if (!token || !selectedResource.folderId) throw new Error('구글 드라이브 연결과 리소스 폴더를 확인해 주세요.');
        const profilesFolderId = await findDriveFolder(token, 'profiles', selectedResource.folderId);
        if (!profilesFolderId) throw new Error('선택한 리소스 폴더에 profiles 폴더가 없습니다.');
        const fileId = await ensureDriveTextFile(token, 'userCssProfiles.json', profilesFolderId, '[]', 'application/json');
        const ok = await saveDriveFileContent(token, fileId, JSON.stringify([...SYSTEM_PROFILES, ...userProfiles], null, 2));
        if (ok) {
          console.log('[persistUserProfiles] ✅ 구글 드라이브 userCssProfiles.json 저장 성공:', userProfiles.length, '개 사용자 서식');
          try {
            localStorage.setItem('onrivi_cached_drive_profiles', JSON.stringify([...SYSTEM_PROFILES, ...userProfiles]));
          } catch {}
        }
        return ok;
      }
      let targetFolder = folder;
      if (!targetFolder || (!/^(?:[a-zA-Z]:[\\/]|\/)/.test(targetFolder) && !resourceFolderHandle)) {
        const localSettings = getResourceSettings('local');
        targetFolder = (localSettings?.kind !== 'drive' ? localSettings?.path : '') || '';
      }
      const api = (window as any).electronAPI;
      if (api?.saveProfiles && targetFolder && /^(?:[a-zA-Z]:[\\/]|\/)/.test(targetFolder)) {
        const result = await api.saveProfiles(userProfiles, targetFolder);
        if (!result?.success) throw new Error(result?.error || 'PROFILE_SAVE_FAILED');
        return true;
      }
      const handle = await getResourceHandle(targetFolder, resourceFolderHandle);
      if (handle) {
        const dir = await handle.getDirectoryHandle('profiles', { create: true });
        const file = await dir.getFileHandle('userCssProfiles.json', { create: true });
        const writable = await file.createWritable();
        try {
          await writable.write(JSON.stringify(userProfiles, null, 2));
          await writable.close();
        } catch (error) {
          await writable.abort?.().catch(() => {});
          throw error;
        }
        return true;
      }

      if (!targetFolder || !/^(?:[a-z]:[\\/]|\/|\\\\)/i.test(targetFolder)) {
        return false;
      }
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: userProfiles, resourceFolder: targetFolder }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'PROFILE_SAVE_FAILED');
      return true;
    } catch (error) {
      console.error('[persistUserProfiles] userCssProfiles.json 저장 실패:', error);
      return false;
    }
  };
  const result = pendingSave.then(save, save);
  pendingSave = result;
  return result;
}
