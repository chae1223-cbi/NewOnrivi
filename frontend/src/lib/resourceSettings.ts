import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
// ====================================================================
// 📊 [OMD-LIB-resourceSettings-0001] src/lib/resourceSettings.ts
// 🎯 @KICK  : 리소스 폴더 설정(로컬 vs 구글 드라이브) 완벽 격리 및 독립 저장/로드 관리
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 로컬/클라우드 설정 교차 오염 100% 방어
// 🚨 @PATCH : **2026-10-20** — [로컬 리소스 폴더 설정 복원 시 resourceFolder 키 폴백 추가]:
//             1) getResourceSettings에서 localPath 탐색 시 localStorage.getItem('resourceFolder')를 후보에 포함하여 데스크톱 Electron 리소스 폴더(D:\Onrivi_Asset 등) 연결 누락 결함 해결
// 🚨 @PATCH : **2026-10-07** — [내부 동기화 시 이벤트 무한 취소 루프 방어 silent 옵션 추가]:
//             1) saveResourceSettings에 options.silent 지원 추가하여 서식 조회/내부 동기화 시 불필요한 onrivi:resource_folder_changed 이벤트 발송 차단
//             2) 서식 로드 중 이벤트 발생으로 인한 React useEffect 취소(cancelled = true) 및 서식 유실 버그 원천 해결
// 🚨 @PATCH : **2026-10-07** — [환경설정 지정 리소스 폴더(참조파일 등) 명칭 및 하위 폴더 ID 무결성 보존]:
//             1) 참조파일을 임의로 참조폴더로 강제 개명하던 하드코딩 제거하고 사용자 환경설정 폴더명 100% 보존
//             2) saveResourceSettings 시 onrivi_gdrive_workspace_info 내부의 resourceFolderId 및 5대 하위 폴더 ID 실시간 양방향 동기화
// 🚨 @PATCH : **2026-10-07** — [로컬 및 구글 드라이브 리소스 설정/서식 완전 격리 및 교차 오염 원천 차단]:
//             1) saveResourceSettings 시 settings.kind('drive' vs 'local'/'browser')에 따라 대상 모드를 'cloud'와 'local'로 엄격 분리하여 로컬 모드에 드라이브 설정이 덮어써지는 버그 원천 차단
//             2) getResourceSettings 조회 시 local 모드에서 drive 설정이 반환되거나 cloud 모드에서 local 설정이 반환되는 교차 오염 철저 방어
//             3) 로컬 모드에서는 로컬 전용 서식(D:/Onrivi_Asset 등), 구글 드라이브 모드에서는 드라이브 전용 서식만 독립적으로 로드되도록 보장
// ====================================================================

// The selected resource destination is independent of the workspace destination.
export type ResourceSettings = { kind:'local'|'browser'|'drive'; path:string; folderId?:string; profilesFolderId?:string; promptFolderId?:string; bibleFolderId?:string; mediaFolderId?:string; dbFolderId?:string };
const KEY='onrivi_resource_settings';
const ACCOUNT_KEY='onrivi_drive_account_settings';
export function activateDriveAccount(email: string) {
  const account=email.trim().toLowerCase();
  if (!account) throw new Error('Google 계정 정보를 확인하지 못했습니다. 다시 연결해 주세요.');
  const all=JSON.parse(localStorage.getItem(KEY)||'{}');
  const accounts=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'{}');
  const workspace=JSON.parse(localStorage.getItem('onrivi_gdrive_workspace_info')||'null');
  const previous=localStorage.getItem('onrivi_active_drive_account') || workspace?.userEmail?.trim().toLowerCase();
  if (previous) accounts[previous]={resource:all.cloud||null,workspace};
  const restored=accounts[account];
  all.cloud=restored?.resource||null;
  localStorage.setItem(KEY,JSON.stringify(all));
  localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
  localStorage.setItem('onrivi_active_drive_account',account);
  if (restored?.workspace) localStorage.setItem('onrivi_gdrive_workspace_info',JSON.stringify(restored.workspace));
  else localStorage.removeItem('onrivi_gdrive_workspace_info');
  if (restored?.resource?.path) localStorage.setItem('onrivi_cloud_resource_folder_path',restored.resource.path);
  else localStorage.removeItem('onrivi_cloud_resource_folder_path');
  return { isFirstConnection: !restored?.workspace && !restored?.resource };
}
// Resource storage can differ from the document workspace (including localhost).
export function getResourceEnvironment(): 'cloud' | 'local' {
  if (typeof window === 'undefined') return 'local';
  const selected = localStorage.getItem('onrivi_active_resource_environment');
  if (selected === 'cloud' || selected === 'local') return selected;
  const workspace = localStorage.getItem('workspaceType');
  const lastWorkspace = localStorage.getItem('onrivi_last_workspace_mode');
  return workspace === 'cloud' || workspace === 'gdrive' || lastWorkspace === 'cloud' || lastWorkspace === 'gdrive' ? 'cloud' : 'local';
}
const mode=getResourceEnvironment;

export function getResourceSettings(environment?:string):ResourceSettings|null {
  if(typeof window==='undefined') return null;
  try {
    const selectedMode=environment || mode();
    const all=JSON.parse(localStorage.getItem(KEY)||'{}');
    let entry: ResourceSettings | null = null;
    if(Object.prototype.hasOwnProperty.call(all,selectedMode)) {
      entry = all[selectedMode] || null;
      if (!entry) return null;
    }
    // 격리 검증: local 모드에서는 절대로 drive 설정을 반환하지 않음
    if (selectedMode === 'local' && entry?.kind === 'drive') {
      entry = null;
    }
    // 격리 검증: cloud 모드에서는 절대로 local/browser 설정을 반환하지 않음
    if (selectedMode === 'cloud' && entry && entry.kind !== 'drive') {
      entry = null;
    }
    if (entry) return entry;

    const cloudPath = localStorage.getItem('onrivi_cloud_resource_folder_path') || localStorage.getItem('resourceFolder') || '';
    const localPath = localStorage.getItem('onrivi_resource_folder_path') || localStorage.getItem('onrivi_local_backup_resource_folder_path') || localStorage.getItem('resourceFolder') || '';
    let migrated:ResourceSettings|null=null;
    if(selectedMode==='cloud') {
      const info=JSON.parse(localStorage.getItem('onrivi_gdrive_workspace_info')||'null');
      if(info?.resourceFolderId) {
        migrated={
          kind:'drive',
          path: cloudPath || '참조파일',
          folderId:info.resourceFolderId,
          profilesFolderId:info.profilesFolderId,
          promptFolderId:info.promptFolderId,
          bibleFolderId:info.bibleFolderId,
          mediaFolderId:info.mediaFolderId,
          dbFolderId:info.dbFolderId
        };
      }
    } else if(selectedMode==='local') {
      const localCandidate = localPath;
      if (localCandidate) {
        migrated = {
          kind: /^(?:[A-Za-z]:[\\/]|\\\\)/.test(localCandidate) ? 'local' : 'browser',
          path: localCandidate
        };
      }
    }
    if(migrated) {all[selectedMode]=migrated;localStorage.setItem(KEY,JSON.stringify(all));}
    return migrated;
  } catch { return null; }
}

export function saveResourceSettings(settings:ResourceSettings|null, environment?:string, options?: { silent?: boolean }) {
  const all=JSON.parse(localStorage.getItem(KEY)||'{}');
  const targetMode = environment || (settings?.kind === 'drive' ? 'cloud' : (settings ? 'local' : mode()));
  all[targetMode]=settings;
  localStorage.setItem(KEY,JSON.stringify(all));
  if (targetMode === 'cloud') {
    const account=localStorage.getItem('onrivi_active_drive_account');
    if (account) {
      const accounts=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'{}');
      accounts[account]={...accounts[account],resource:settings};
      localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
    }
  }
  if (!options?.silent) localStorage.setItem('onrivi_active_resource_environment', targetMode);
  if (targetMode === 'local') {
    if (settings) localStorage.setItem('onrivi_local_backup_resource_folder_path', settings.path);
    else localStorage.removeItem('onrivi_local_backup_resource_folder_path');
    const localKeys = ['onrivi_resource_folder_path','onrivi_resource_folder'];
    if (getResourceEnvironment() === 'local') localKeys.push('resourceFolder');
    for(const key of localKeys) { 
      if(settings) localStorage.setItem(key,settings.path);
      else localStorage.removeItem(key); 
    }
  } else {
    if (settings) {
      localStorage.setItem('onrivi_cloud_resource_folder_path', settings.path);
      if (getResourceEnvironment() === 'cloud') localStorage.setItem('resourceFolder', settings.path);
      try {
        const wsRaw = localStorage.getItem('onrivi_gdrive_workspace_info');
        if (wsRaw && settings.folderId) {
          const ws = JSON.parse(wsRaw);
          ws.resourceFolderId = settings.folderId;
          if (settings.profilesFolderId) ws.profilesFolderId = settings.profilesFolderId;
          if (settings.promptFolderId) ws.promptFolderId = settings.promptFolderId;
          if (settings.bibleFolderId) ws.bibleFolderId = settings.bibleFolderId;
          if (settings.mediaFolderId) ws.mediaFolderId = settings.mediaFolderId;
          if (settings.dbFolderId) ws.dbFolderId = settings.dbFolderId;
          localStorage.setItem('onrivi_gdrive_workspace_info', JSON.stringify(ws));
        }
      } catch {}
    } else {
      localStorage.removeItem('onrivi_cloud_resource_folder_path');
    }
  }
  if (!options?.silent) {
    window.dispatchEvent(new CustomEvent('onrivi:resource_folder_changed',{detail:settings?.path || ''}));
  }
}

export function requireResourceSettings():ResourceSettings {
  const settings=getResourceSettings();
  if(!settings?.path || (settings.kind==='drive' && (!settings.folderId || !settings.mediaFolderId || !settings.profilesFolderId || !settings.promptFolderId || !settings.bibleFolderId))) { window.dispatchEvent(new CustomEvent('onrivi:resource-settings'));throw new Error('환경설정에서 리소스 폴더를 먼저 선택해 주세요.'); }
  return settings;
}
