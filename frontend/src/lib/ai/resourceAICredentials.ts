// ====================================================================
// 📊 [OMD-AI-resourceAICredentials-0001] src/lib/ai/resourceAICredentials.ts
// 🎯 @KICK  : 로컬 스토리지 보관을 전면 배제하고 리소스 폴더({resourceFolder}/settings/ai_credentials.enc) 전용 AES-256 암호화 및 다중 기기/드라이브 자동 격리 관리
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), 평문 유출 방지 및 기기/드라이브별 충돌 방어
// 🚨 @PATCH : **2026-10-21** — [Google Gemini/OpenAI/Claude API 키 엄격 검증 및 OAuth 클라이언트 ID 오유입 박멸]:
//             1) sanitizeProfileCredentials 도입: 모든 프로필의 Google 키에 유입된 OpenAI(sk-) 키는 OpenAI로 정상 이동, OAuth 클라이언트 ID(googleusercontent.com)는 완전 소거
//             2) getProviderResourceApiKey: 제공사별 접두어(Google: AIza, OpenAI: sk-, Claude: sk-ant-) 불일치 키는 유효하지 않은 키('')로 차단
// 🚨 @PATCH : **2026-10-21** — [API 키 접두어 기반 제공자 자동 라우팅 및 OpenAI/Claude 연결 영구 유지]:
//             1) sk- 시작 키가 Google에 오등록되어 있던 경우 OpenAI(또는 sk-ant-는 Claude)로 자동 감지·이동시켜 잘못된 제공자 매핑 완전 치유
//             2) readConnections에서 Google, OpenAI, Claude 3대 제공자 모두에게 기본 모델과 추천 모델 목록을 정상 제공하도록 보장
// 🚨 @PATCH : **2026-10-21** — [AI API 키 리소스 폴더 전용 암호화 보관 및 기기/웹드라이브 자동 구분 시스템 구축]:
//             1) 로컬 스토리지에 API 키를 남기지 않고 오직 리소스 폴더의 암호화 파일(ai_credentials.enc)만 단일 진실 공급원으로 사용
//             2) 데스크톱 PC(물리 기기 UUID/호스트명), 구글 드라이브(계정명), 웹 브라우저별로 프로필을 분리하여 다른 PC/드라이브 사용 시 키가 덮어써지지 않고 자동 구분 보장
//             3) 기존 로컬스토리지에 잔존하던 키는 1회 자동 이관(Migration) 후 로컬스토리지에서 즉각 완전 소거(purgeLocalStorageAICredentials)
// ====================================================================

import CryptoJS from 'crypto-js';
import type { AIProvider } from './types';
import { getResourceSettings } from '../resourceSettings';
import { idb } from '../indexedDbHelper';
import { loadSecureData } from '../secureStorage';

const SECRET_SALT = 'ONRIVI-AUTHOR-SECURE-KEY-SPEC-SALT';

export interface AIProviderCredential {
  apiKey: string;
  model?: string;
  models?: Array<{ id: string; name: string; family: string }>;
  updatedAt?: string;
}

export interface AICredentialProfile {
  type: 'desktop' | 'drive' | 'web';
  id: string; // e.g. "desktop:DESKTOP-12345" or "drive:user@gmail.com"
  label: string; // e.g. "내 PC (DESKTOP-12345)" or "구글 드라이브 (user@gmail.com)"
  hostName?: string;
  deviceId?: string;
  account?: string;
  apiKey: string; // Google Gemini API key (하위 호환)
  aiModelName: string;
  providers?: Partial<Record<AIProvider, AIProviderCredential>>;
  updatedAt: string;
}

export interface AICredentialsContainer {
  version: 1;
  lastActiveProfileId?: string;
  updatedAt?: string;
  profiles: Record<string, AICredentialProfile>;
}

// 런타임 메모리 활성 캐시 (로컬 스토리지 대신 세션 메모리에만 유지)
let credentialsLoadRevision = 0;
let activeMemoryCredentials: {
  apiKey: string;
  aiModelName: string;
  profileId: string;
  profileLabel: string;
  providers: Partial<Record<AIProvider, AIProviderCredential>>;
} = {
  apiKey: '',
  aiModelName: 'gemini-3.8-flash',
  profileId: '',
  profileLabel: '',
  providers: {},
};

export function getActiveResourceApiKey(): string {
  return activeMemoryCredentials.apiKey;
}

export function getActiveResourceAIModel(): string {
  return activeMemoryCredentials.aiModelName || 'gemini-3.8-flash';
}

export function getActiveResourceProfile(): { profileId: string; profileLabel: string } {
  return {
    profileId: activeMemoryCredentials.profileId,
    profileLabel: activeMemoryCredentials.profileLabel,
  };
}

export function getProviderResourceApiKey(provider: AIProvider): string {
  const p = activeMemoryCredentials.providers?.[provider];
  if (p?.apiKey && p.apiKey.trim()) {
    const k = p.apiKey.trim();
    if (provider === 'google' && k.startsWith('AIza') && !k.includes('googleusercontent.com') && !k.startsWith('sk-')) return k;
    if (provider === 'openai' && k.startsWith('sk-') && !k.startsWith('sk-ant-')) return k;
    if (provider === 'anthropic' && k.startsWith('sk-ant-')) return k;
  }
  if (provider === 'google' && activeMemoryCredentials.apiKey) {
    const k = activeMemoryCredentials.apiKey.trim();
    if (k.startsWith('AIza') && !k.includes('googleusercontent.com') && !k.startsWith('sk-')) return k;
  }
  return '';
}

export function getProviderResourceModel(provider: AIProvider): string {
  const p = activeMemoryCredentials.providers?.[provider];
  if (p?.model) return p.model;
  if (provider === 'google') return activeMemoryCredentials.aiModelName || 'gemini-3.8-flash';
  return '';
}

export function getProviderResourceModels(provider: AIProvider): Array<{ id: string; name: string; family: string }> {
  const p = activeMemoryCredentials.providers?.[provider];
  if (p?.models && Array.isArray(p.models) && p.models.length > 0) return p.models;
  return [];
}


/**
 * 프로필에 잘못 등록된 API 키(예: OpenAI sk- 키가 Google에 등록되었거나 OAuth 클라이언트 ID가 유입된 경우)를 자동 치유 및 정돈합니다.
 */
export function sanitizeProfileCredentials(profile: AICredentialProfile): boolean {
  if (!profile) return false;
  let changed = false;
  if (!profile.providers) profile.providers = {};
  const provs = profile.providers;

  // 1. profile.apiKey 레거시 필드 검증 및 라우팅
  if (profile.apiKey) {
    const raw = profile.apiKey.trim();
    if (raw.startsWith('sk-ant-')) {
      if (!provs.anthropic?.apiKey) {
        provs.anthropic = {
          apiKey: raw,
          model: provs.anthropic?.model || 'claude-haiku-5-5',
          models: provs.anthropic?.models || [],
          updatedAt: new Date().toISOString(),
        };
      }
      profile.apiKey = '';
      changed = true;
    } else if (raw.startsWith('sk-')) {
      if (!provs.openai?.apiKey) {
        provs.openai = {
          apiKey: raw,
          model: provs.openai?.model || 'gpt-6.1-sol',
          models: provs.openai?.models || [],
          updatedAt: new Date().toISOString(),
        };
      }
      profile.apiKey = '';
      changed = true;
    } else if (raw.includes('googleusercontent.com') || raw.startsWith('ya29.') || !raw.startsWith('AIza')) {
      // OAuth 클라이언트 ID, Access Token 또는 비정상 키 완전 삭제
      profile.apiKey = '';
      changed = true;
    } else {
      if (!provs.google?.apiKey) {
        provs.google = {
          apiKey: raw,
          model: profile.aiModelName || 'gemini-3.8-flash',
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      }
    }
  }

  // 2. provs.google 검증 및 치유
  if (provs.google?.apiKey) {
    const raw = provs.google.apiKey.trim();
    if (raw.startsWith('sk-ant-')) {
      if (!provs.anthropic?.apiKey) {
        provs.anthropic = {
          apiKey: raw,
          model: provs.anthropic?.model || 'claude-haiku-5-5',
          models: provs.anthropic?.models || [],
          updatedAt: new Date().toISOString(),
        };
      }
      delete provs.google;
      changed = true;
    } else if (raw.startsWith('sk-')) {
      if (!provs.openai?.apiKey) {
        provs.openai = {
          apiKey: raw,
          model: provs.openai?.model || 'gpt-6.1-sol',
          models: provs.openai?.models || [],
          updatedAt: new Date().toISOString(),
        };
      }
      delete provs.google;
      changed = true;
    } else if (raw.includes('googleusercontent.com') || raw.startsWith('ya29.') || !raw.startsWith('AIza')) {
      delete provs.google;
      changed = true;
    }
  }

  // 3. provs.openai 검증
  if (provs.openai?.apiKey) {
    const raw = provs.openai.apiKey.trim();
    if (!raw.startsWith('sk-') || raw.startsWith('sk-ant-')) {
      delete provs.openai;
      changed = true;
    }
  }

  // 4. provs.anthropic 검증
  if (provs.anthropic?.apiKey) {
    const raw = provs.anthropic.apiKey.trim();
    if (!raw.startsWith('sk-ant-')) {
      delete provs.anthropic;
      changed = true;
    }
  }

  return changed;
}

/**
 * 로컬스토리지 내에 남아있는 레거시 API 키를 완전히 삭제합니다. (로컬 스토리지 미보관 원칙)
 */
export function purgeLocalStorageAICredentials(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'onrivi_gemini_api_key',
      'geminiApiKey',
      'onrivi_ai_key_google',
      'onrivi_google_api_key',
      'onrivi_ai_key_openai',
      'onrivi_openai_api_key',
      'openai_api_key',
      'openaiApiKey',
      'onrivi_ai_key_anthropic',
      'onrivi_anthropic_api_key',
      'anthropic_api_key',
      'anthropicApiKey',
    ];
    for (const k of keysToRemove) {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    }

    // onrivi_settings 내의 geminiApiKey 필드도 빈 문자열로 초기화
    const raw = localStorage.getItem('onrivi_settings');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.geminiApiKey) {
          parsed.geminiApiKey = '';
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      } catch {}
    }
  } catch (e) {
    console.warn('[purgeLocalStorageAICredentials Error]:', e);
  }
}

/**
 * 현재 실행 환경(데스크톱 PC, 구글 드라이브, 웹 브라우저)을 판별하여 고유 프로필 식별자를 반환합니다.
 */
export async function resolveCurrentProfile(resourceFolder?: string): Promise<{
  profileId: string;
  profileLabel: string;
  type: 'desktop' | 'drive' | 'web';
  hostName?: string;
  deviceId?: string;
  account?: string;
}> {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1. 데스크톱(Electron) 환경: 물리 기기 UUID 및 호스트명 자동 식별
  if (api && typeof api.getDeviceInfo === 'function') {
    try {
      const info = await api.getDeviceInfo();
      const host = (info?.hostName || info?.deviceId || 'Desktop').trim();
      return {
        type: 'desktop',
        profileId: `desktop:${host}`,
        profileLabel: `내 PC (${host})`,
        hostName: host,
        deviceId: info?.deviceId,
      };
    } catch (e) {
      console.warn('[resolveCurrentProfile] getDeviceInfo failed, fallback to desktop:', e);
    }
  }

  // 2. 구글 드라이브(클라우드) 환경: 계정 이메일 기준 자동 식별
  const env = typeof window !== 'undefined' ? (localStorage.getItem('onrivi_active_resource_environment') || '') : '';
  const isDrive = getResourceSettings()?.kind === 'drive' || env === 'cloud' || (resourceFolder && resourceFolder.startsWith('drive:'));
  if (isDrive) {
    let account = '';
    try {
      account = localStorage.getItem('onrivi_active_drive_account') || '';
      if (!account) {
        const ws = JSON.parse(localStorage.getItem('onrivi_gdrive_workspace_info') || 'null');
        account = ws?.userEmail || '';
      }
    } catch {}
    const cleanAccount = account.trim().toLowerCase() || 'default';
    return {
      type: 'drive',
      profileId: `drive:${cleanAccount}`,
      profileLabel: `구글 드라이브 (${cleanAccount})`,
      account: cleanAccount,
    };
  }

  // 3. 일반 웹 브라우저 환경
  let browserId = '';
  try {
    browserId = localStorage.getItem('onrivi_device_client_id') || '';
    if (!browserId) {
      browserId = 'web-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('onrivi_device_client_id', browserId);
    }
  } catch {
    browserId = 'web-client';
  }
  return {
    type: 'web',
    profileId: `web:${browserId}`,
    profileLabel: `웹 브라우저 (${browserId})`,
    deviceId: browserId,
  };
}

/**
 * 리소스 폴더로부터 암호화된 파일 원문을 읽어옵니다.
 */
async function readRawCredentialsFromResource(resourceFolder?: string, resourceHandle?: any): Promise<string | null> {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  const settings = getResourceSettings();
  if (settings?.kind === 'drive') {
    const drive = await import('../gdrive/googleDriveClient');
    const token = drive.getSavedDriveToken();
    if (!token || !settings.folderId) throw new Error('AI 설정을 불러오려면 Google Drive를 다시 연결해 주세요.');
    return await drive.readDriveAICredentials(token, settings.folderId);
  }
  const effectiveLocalPath = resourceFolder || (settings?.kind === 'local' ? settings?.path : null) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('onrivi_resource_folder_path') || localStorage.getItem('resourceFolder')) : null);

  // 1. Electron 데스크톱 IPC
  if (api && typeof api.loadAICredentials === 'function' && effectiveLocalPath) {
    try {
      const raw = await api.loadAICredentials(effectiveLocalPath);
      if (raw) return String(raw);
    } catch (e) {
      console.warn('[readRawCredentialsFromResource Electron Error]:', e);
    }
  }

  // 2. 웹 환경 (/api/ai-credentials)
  if (!api && effectiveLocalPath && typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/ai-credentials?resourceFolder=${encodeURIComponent(effectiveLocalPath)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return String(json.data);
      }
    } catch (e) {
      console.warn('[readRawCredentialsFromResource Web API Error]:', e);
    }
  }

  // 4. FileSystemAccess API (Browser Handle)
  const handle = resourceHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null) || await idb.get('resourceFolderHandle');
  if (handle) {
    try {
      const settingsDir = await handle.getDirectoryHandle('settings');
      const fileHandle = await settingsDir.getFileHandle('ai_credentials.enc');
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e: any) {
      if (e.name !== 'NotFoundError') console.warn('[readRawCredentialsFromResource Handle Error]:', e);
    }
  }

  return null;
}

/**
 * 리소스 폴더에 암호화된 파일 원문을 기록합니다.
 */
async function writeRawCredentialsToResource(cipherText: string, resourceFolder?: string, resourceHandle?: any): Promise<boolean> {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  const settings = getResourceSettings();
  if (settings?.kind === 'drive') {
    const drive = await import('../gdrive/googleDriveClient');
    const token = drive.getSavedDriveToken();
    if (!token || !settings.folderId) throw new Error('AI 설정을 저장하려면 Google Drive를 다시 연결해 주세요.');
    if (!await drive.saveDriveAICredentials(token, settings.folderId, cipherText)) throw new Error('Drive에 AI 설정을 저장하지 못했습니다. 연결 및 쓰기 권한을 확인해 주세요.');
    return true;
  }
  const effectiveLocalPath = resourceFolder || (settings?.kind === 'local' ? settings?.path : null) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('onrivi_resource_folder_path') || localStorage.getItem('resourceFolder')) : null);

  // 1. Electron 데스크톱 IPC
  if (api && typeof api.saveAICredentials === 'function' && effectiveLocalPath) {
    try {
      const res = await api.saveAICredentials(cipherText, effectiveLocalPath);
      return Boolean(res?.success);
    } catch (e) {
      console.error('[writeRawCredentialsToResource Electron Error]:', e);
    }
  }

  // 2. 웹 환경 (/api/ai-credentials)
  if (!api && effectiveLocalPath && typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/ai-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder: effectiveLocalPath, data: cipherText }),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch (e) {
      console.error('[writeRawCredentialsToResource Web API Error]:', e);
    }
  }

  // 4. FileSystemAccess API (Browser Handle)
  const handle = resourceHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null) || await idb.get('resourceFolderHandle');
  if (handle) {
    try {
      const settingsDir = await handle.getDirectoryHandle('settings', { create: true });
      const fileHandle = await settingsDir.getFileHandle('ai_credentials.enc', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(cipherText);
      await writable.close();
      return true;
    } catch (e) {
      console.error('[writeRawCredentialsToResource Handle Error]:', e);
    }
  }

  return false;
}

/**
 * 리소스 폴더로부터 암호화된 컨테이너를 로드하고, 현재 기기/드라이브에 맞는 활성 API 키를 복호화하여 반환합니다.
 */
export async function loadResourceAICredentials(resourceFolder?: string, resourceHandle?: any): Promise<{
  container: AICredentialsContainer;
  activeProfile: AICredentialProfile | null;
  profileId: string;
  profileLabel: string;
  apiKey: string;
  aiModelName: string;
}> {
  const loadRevision = ++credentialsLoadRevision;
  const profileInfo = await resolveCurrentProfile(resourceFolder);
  const rawCipher = await readRawCredentialsFromResource(resourceFolder, resourceHandle);

  let container: AICredentialsContainer = {
    version: 1,
    profiles: {},
  };

  if (rawCipher && rawCipher.trim()) {
    try {
      const bytes = CryptoJS.AES.decrypt(rawCipher.trim(), SECRET_SALT);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) throw new Error('암호화된 AI 설정을 읽을 수 없습니다.');
      if (decryptedText) {
        const parsed = JSON.parse(decryptedText);
        if (parsed && typeof parsed === 'object') {
          container = {
            version: 1,
            lastActiveProfileId: parsed.lastActiveProfileId,
            updatedAt: parsed.updatedAt,
            profiles: parsed.profiles || {},
          };
        }
      }
    } catch (err) {
      console.warn('[loadResourceAICredentials Decrypt Error]:', err);
      throw new Error('저장된 AI 설정을 읽지 못했습니다. 원본 파일을 확인해 주세요.');
    }
  }

  // 현재 기기/환경에 해당하는 프로필 조회
  let active = container.profiles[profileInfo.profileId] || null;
  if (!active) {
    // 🚀 [동일 리소스 폴더 내 프로필 안전 승계]: 다른 모드(웹/데스크톱)나 새 기기에서 열었을 때 기존 폴더의 AI 설정을 즉시 계승
    const lastId = container.lastActiveProfileId;
    if (lastId && container.profiles[lastId]) {
      active = {
        ...container.profiles[lastId],
        type: profileInfo.type,
        id: profileInfo.profileId,
        label: profileInfo.profileLabel,
        hostName: profileInfo.hostName,
        deviceId: profileInfo.deviceId,
        account: profileInfo.account,
        updatedAt: new Date().toISOString(),
      };
      container.profiles[profileInfo.profileId] = active;
      container.lastActiveProfileId = profileInfo.profileId;
    } else {
      const existingKeys = Object.keys(container.profiles || {});
      if (existingKeys.length > 0) {
        const first = container.profiles[existingKeys[0]];
        active = {
          ...first,
          type: profileInfo.type,
          id: profileInfo.profileId,
          label: profileInfo.profileLabel,
          hostName: profileInfo.hostName,
          deviceId: profileInfo.deviceId,
          account: profileInfo.account,
          updatedAt: new Date().toISOString(),
        };
        container.profiles[profileInfo.profileId] = active;
        container.lastActiveProfileId = profileInfo.profileId;
      }
    }
  }

  // 🚀 [레거시 로컬스토리지 1회 자동 이관(Migration) 가드]
  // 파일이 없거나 현재 기기 프로필이 없는데 기존 로컬스토리지에 저장된 키가 있는 경우
  if (!active?.apiKey) {
    const legacyKey = (loadSecureData<string>('onrivi_gemini_api_key') || loadSecureData<string>('geminiApiKey') || (typeof localStorage !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') || '').trim();
    if (legacyKey && !legacyKey.startsWith('U2FsdGVkX1')) {
      const legacyModel = (localStorage.getItem('onrivi_ai_model_name') || 'gemini-3.8-flash').trim();
      const newProfile: AICredentialProfile = {
        type: profileInfo.type,
        id: profileInfo.profileId,
        label: profileInfo.profileLabel,
        hostName: profileInfo.hostName,
        deviceId: profileInfo.deviceId,
        account: profileInfo.account,
        apiKey: legacyKey,
        aiModelName: legacyModel,
        updatedAt: new Date().toISOString(),
      };
      container.profiles[profileInfo.profileId] = newProfile;
      container.lastActiveProfileId = profileInfo.profileId;
      container.updatedAt = new Date().toISOString();
      active = newProfile;

      // 리소스 폴더에 암호화 저장 후 로컬스토리지 완전 소거
      const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
      if (!await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle)) throw new Error('기존 AI 키를 리소스 폴더에 옮기지 못했습니다.');
      purgeLocalStorageAICredentials();
    }
  }

  // 로컬 스토리지에 남아있는 키 즉시 청소
  purgeLocalStorageAICredentials();

  
  // 🛡️ [API 키 형식 엄격 검증 및 자동 치유]: 모든 프로필에 대해 잘못 매핑된 키 치유 및 OAuth 유입 키 소거
  let containerSanitized = false;
  for (const pid of Object.keys(container.profiles || {})) {
    const p = container.profiles[pid];
    if (p && sanitizeProfileCredentials(p)) {
      containerSanitized = true;
    }
  }
  if (active && sanitizeProfileCredentials(active)) {
    containerSanitized = true;
  }
  if (containerSanitized) {
    try {
      const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
      await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle);
    } catch (e) {
      console.warn('[sanitize container save error]:', e);
    }
  }


  // 런타임 메모리 캐시 동기화 (다중 제공사 providers 포함)
  const activeProviders: Partial<Record<AIProvider, AIProviderCredential>> = { ...(active?.providers || {}) };
  if (active?.apiKey && !activeProviders.google) {
    activeProviders.google = {
      apiKey: active.apiKey,
      model: active.aiModelName || 'gemini-3.8-flash',
    };
  }

  if (loadRevision === credentialsLoadRevision) activeMemoryCredentials = {
    apiKey: active?.apiKey || activeProviders.google?.apiKey || '',
    aiModelName: active?.aiModelName || activeProviders.google?.model || 'gemini-3.8-flash',
    profileId: profileInfo.profileId,
    profileLabel: profileInfo.profileLabel,
    providers: activeProviders,
  };

  return {
    container,
    activeProfile: active,
    profileId: profileInfo.profileId,
    profileLabel: profileInfo.profileLabel,
    apiKey: active?.apiKey || '',
    aiModelName: active?.aiModelName || 'gemini-3.8-flash',
  };
}

/**
 * 현재 기기/드라이브의 API 키와 모델을 리소스 폴더의 암호화 파일에 저장합니다.
 */
export async function saveResourceAICredentials(
  credentials: { apiKey: string; aiModelName?: string },
  resourceFolder?: string,
  resourceHandle?: any
): Promise<{ success: boolean; container: AICredentialsContainer; profileLabel: string }> {
  const profileInfo = await resolveCurrentProfile(resourceFolder);
  const cleanKey = (credentials.apiKey || '').trim();
  const cleanModel = (credentials.aiModelName || 'gemini-3.8-flash').trim();

  // 기존 컨테이너 로드
  const loaded = await loadResourceAICredentials(resourceFolder, resourceHandle);
  const container = loaded.container;

  const existingProfile = container.profiles[profileInfo.profileId] || {};
  const updatedProviders = {
    ...(existingProfile.providers || {}),
    google: {
      apiKey: cleanKey,
      model: cleanModel,
      models: existingProfile.providers?.google?.models || [],
      updatedAt: new Date().toISOString(),
    },
  };

  const updatedProfile: AICredentialProfile = {
    type: profileInfo.type,
    id: profileInfo.profileId,
    label: profileInfo.profileLabel,
    hostName: profileInfo.hostName,
    deviceId: profileInfo.deviceId,
    account: profileInfo.account,
    apiKey: cleanKey,
    aiModelName: cleanModel,
    providers: updatedProviders,
    updatedAt: new Date().toISOString(),
  };

  container.profiles[profileInfo.profileId] = updatedProfile;
  container.lastActiveProfileId = profileInfo.profileId;
  container.updatedAt = new Date().toISOString();

  const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
  const ok = await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle);
  if (!ok) throw new Error('AI 설정을 리소스 폴더에 저장하지 못했습니다. 연결 및 쓰기 권한을 확인해 주세요.');

  // 메모리 캐시 갱신
  activeMemoryCredentials = {
    apiKey: cleanKey,
    aiModelName: cleanModel,
    profileId: profileInfo.profileId,
    profileLabel: profileInfo.profileLabel,
    providers: updatedProviders,
  };

  // 로컬 스토리지 완전 소거 (로컬 스토리지 미보관 원칙)
  purgeLocalStorageAICredentials();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('onrivi:resource_ai_credentials_changed', {
        detail: {
          apiKey: cleanKey,
          aiModelName: cleanModel,
          profileId: profileInfo.profileId,
          profileLabel: profileInfo.profileLabel,
        },
      })
    );
  }

  return { success: ok, container, profileLabel: profileInfo.profileLabel };
}

/**
 * 현재 기기/드라이브의 API 키 연결을 해제(삭제)합니다.
 */
export async function deleteResourceAICredentials(
  resourceFolder?: string,
  resourceHandle?: any
): Promise<{ success: boolean; profileLabel: string }> {
  const profileInfo = await resolveCurrentProfile(resourceFolder);
  const loaded = await loadResourceAICredentials(resourceFolder, resourceHandle);
  const container = loaded.container;

  delete container.profiles[profileInfo.profileId];
  container.updatedAt = new Date().toISOString();

  const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
  const ok = await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle);
  if (!ok) throw new Error('AI 설정을 리소스 폴더에 저장하지 못했습니다. 연결 및 쓰기 권한을 확인해 주세요.');

  activeMemoryCredentials = {
    apiKey: '',
    aiModelName: 'gemini-3.8-flash',
    profileId: profileInfo.profileId,
    profileLabel: profileInfo.profileLabel,
    providers: {},
  };

  purgeLocalStorageAICredentials();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('onrivi:resource_ai_credentials_changed', {
        detail: {
          apiKey: '',
          aiModelName: 'gemini-3.8-flash',
          profileId: profileInfo.profileId,
          profileLabel: profileInfo.profileLabel,
        },
      })
    );
  }

  return { success: ok, profileLabel: profileInfo.profileLabel };
}


/**
 * 리소스 폴더의 특정 AI 제공사(Google, OpenAI, Claude) 인증정보를 저장합니다.
 */
export async function saveProviderResourceCredentials(
  provider: AIProvider,
  data: { apiKey?: string; model?: string; models?: Array<{ id: string; name: string; family: string }> },
  resourceFolder?: string,
  resourceHandle?: any
): Promise<{ success: boolean; profileLabel: string }> {
  const profileInfo = await resolveCurrentProfile(resourceFolder);
  const loaded = await loadResourceAICredentials(resourceFolder, resourceHandle);
  const container = loaded.container;

  let profile = container.profiles[profileInfo.profileId];
  if (!profile) {
    profile = {
      type: profileInfo.type,
      id: profileInfo.profileId,
      label: profileInfo.profileLabel,
      hostName: profileInfo.hostName,
      deviceId: profileInfo.deviceId,
      account: profileInfo.account,
      apiKey: '',
      aiModelName: 'gemini-3.8-flash',
      providers: {},
      updatedAt: new Date().toISOString(),
    };
    container.profiles[profileInfo.profileId] = profile;
  }

  if (!profile.providers) profile.providers = {};
  const currentP = profile.providers[provider] || { apiKey: '', model: '' };

  const updatedP: AIProviderCredential = {
    apiKey: data.apiKey !== undefined ? data.apiKey.trim() : currentP.apiKey,
    model: data.model !== undefined ? data.model : currentP.model,
    models: data.models !== undefined ? data.models : currentP.models,
    updatedAt: new Date().toISOString(),
  };
  profile.providers[provider] = updatedP;

  if (provider === 'google') {
    if (data.apiKey !== undefined) profile.apiKey = data.apiKey.trim();
    if (data.model !== undefined) profile.aiModelName = data.model;
  }

  profile.updatedAt = new Date().toISOString();
  container.lastActiveProfileId = profileInfo.profileId;
  container.updatedAt = new Date().toISOString();

  const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
  const ok = await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle);
  if (!ok) throw new Error('AI 설정을 리소스 폴더에 저장하지 못했습니다. 연결 및 쓰기 권한을 확인해 주세요.');

  activeMemoryCredentials = {
    apiKey: profile.apiKey || profile.providers.google?.apiKey || '',
    aiModelName: profile.aiModelName || profile.providers.google?.model || 'gemini-3.8-flash',
    profileId: profileInfo.profileId,
    profileLabel: profileInfo.profileLabel,
    providers: profile.providers,
  };

  purgeLocalStorageAICredentials();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('onrivi:resource_ai_credentials_changed', {
        detail: {
          provider,
          apiKey: updatedP.apiKey,
          aiModelName: updatedP.model,
          profileId: profileInfo.profileId,
          profileLabel: profileInfo.profileLabel,
        },
      })
    );
    window.dispatchEvent(new Event('onrivi:ai-connections'));
  }

  return { success: ok, profileLabel: profileInfo.profileLabel };
}

/**
 * 리소스 폴더의 특정 AI 제공사(Google, OpenAI, Claude) 인증정보를 삭제(연결 해제)합니다.
 */
export async function deleteProviderResourceCredentials(
  provider: AIProvider,
  resourceFolder?: string,
  resourceHandle?: any
): Promise<{ success: boolean; profileLabel: string }> {
  const profileInfo = await resolveCurrentProfile(resourceFolder);
  const loaded = await loadResourceAICredentials(resourceFolder, resourceHandle);
  const container = loaded.container;

  const profile = container.profiles[profileInfo.profileId];
  if (profile && profile.providers) {
    delete profile.providers[provider];
    if (provider === 'google') {
      profile.apiKey = '';
    }
    profile.updatedAt = new Date().toISOString();
    container.updatedAt = new Date().toISOString();

    const cipher = CryptoJS.AES.encrypt(JSON.stringify(container), SECRET_SALT).toString();
    const ok = await writeRawCredentialsToResource(cipher, resourceFolder, resourceHandle);
  if (!ok) throw new Error('AI 설정을 리소스 폴더에 저장하지 못했습니다. 연결 및 쓰기 권한을 확인해 주세요.');

    activeMemoryCredentials = {
      apiKey: profile.apiKey || profile.providers.google?.apiKey || '',
      aiModelName: profile.aiModelName || profile.providers.google?.model || 'gemini-3.8-flash',
      profileId: profileInfo.profileId,
      profileLabel: profileInfo.profileLabel,
      providers: profile.providers,
    };

    purgeLocalStorageAICredentials();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('onrivi:resource_ai_credentials_changed', {
          detail: {
            provider,
            apiKey: '',
            aiModelName: '',
            profileId: profileInfo.profileId,
            profileLabel: profileInfo.profileLabel,
          },
        })
      );
      window.dispatchEvent(new Event('onrivi:ai-connections'));
    }

    return { success: ok, profileLabel: profileInfo.profileLabel };
  }

  return { success: true, profileLabel: profileInfo.profileLabel };
}
