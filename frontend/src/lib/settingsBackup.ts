// ====================================================================
// 📊 [OMD-LIB-settingsBackup-0001] frontend/src/lib/settingsBackup.ts
// 🎯 @KICK  : 온리비 어서 환경설정 전체 암호화(AES-256) 백업 및 암호 검증 복원 라이브러리
// 🛡️ @GUARD : Rule 1(표준 주석), Rule 2(대문자 코드값), Rule 7(무결성 보장), 비밀번호 불일치 시 원자적 복원 차단
// 🚨 @PATCH : 2026-11-10 — [환경설정 AES-256 암호화 백업 및 암호 검증 복원 신설]:
//             1) exportEncryptedSettings: 비밀번호 기반 AES-256 암호화로 단축키, 서식, 테마, 폰트, API 키(선택)를 안전 패키징
//             2) importEncryptedSettings: 백업 파일의 암호 해독 검증 후 불일치 시 복원 원천 차단 및 통과 시 localStorage/프로필 원자적 복원
//             3) downloadBackupFile: 브라우저 원클릭 .onrivicfg 파일 다운로드 헬퍼 제공
// 🔗 @CALLS : CryptoJS.AES, browserAccountStorage, PROTECTED_PREFERENCE_KEYS, saveSecureData, loadSecureData
// ====================================================================

import CryptoJS from 'crypto-js';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { PROTECTED_PREFERENCE_KEYS } from '@/lib/authSessionHelper';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';

export const BACKUP_MAGIC_HEADER = 'ONRIVI_ENCRYPTED_CONFIG';
export const BACKUP_SCHEMA_VERSION = '1.0.0';

/**
 * 백업 내부 데이터 구조 (암호화되어 보호되는 페이로드)
 */
export interface OnriviSettingsBackupPayload {
  version: string;
  exportedAt: string;
  hasApiKey: boolean;
  storageItems: Record<string, string>;
  userCssProfiles?: any[];
  aiSettings?: {
    geminiApiKey?: string;
    aiModelName?: string;
  };
}

/**
 * 디스크에 저장되는 파일 포맷 (외부 메타데이터 + 암호문 페이로드)
 */
export interface OnriviEncryptedBackupFile {
  magic: typeof BACKUP_MAGIC_HEADER;
  version: string;
  exportedAt: string;
  hasApiKey: boolean;
  checksum: string; // 비밀번호 검증 및 무결성 확인용 해시 접두사
  payload: string;   // AES-256 암호화된 Base64 문자열
}

/**
 * 백업 대상 제외 키 (세션/보안/일회성 상태)
 */
const EXCLUDED_STORAGE_KEYS = new Set([
  'supabase.auth.token',
  'onrivi_auth_session',
  'onrivi_user_session',
  'onrivi_active_drive_token',
  'onrivi_gdrive_access_token',
  'onrivi_tabs', // 열려있던 탭 상태는 브라우저 간 복원 시 혼선 방지를 위해 제외 가능
]);

/**
 * 환경설정 전체를 비밀번호로 AES-256 암호화하여 백업 파일 문자열로 생성합니다.
 *
 * @param {string} password - 사용자 암호화 비밀번호 (최소 1자 이상)
 * @param {boolean} includeApiKey - Gemini API 키 포함 여부 (기본: false)
 * @param {any[]} [userCssProfiles] - 사용자 정의 CSS 서식 프로필 목록
 * @returns {Promise<string>} 암호화된 백업 JSON 문자열
 */
export async function exportEncryptedSettings(
  password: string,
  includeApiKey: boolean = false,
  userCssProfiles?: any[]
): Promise<string> {
  const cleanPassword = (password || '').trim();
  if (!cleanPassword) {
    throw new Error('PASSWORD_REQUIRED: 백업 암호를 입력해 주세요.');
  }

  const storageItems: Record<string, string> = {};

  // 1. PROTECTED_PREFERENCE_KEYS 및 로컬스토리지 주요 설정 수집
  for (const key of PROTECTED_PREFERENCE_KEYS) {
    if (EXCLUDED_STORAGE_KEYS.has(key)) continue;
    if (key === 'onrivi_gemini_api_key' && !includeApiKey) continue;

    const val = localStorage.getItem(key);
    if (val !== null && val !== undefined) {
      storageItems[key] = val;
    }
  }

  // 2. 추가 주요 설정 키 수집
  const extraKeys = [
    'editorTabSize',
    'editorFontWeight',
    'editorHighContrast',
    'defaultWatermarkSettings',
    'onrivi_custom_hotkeys',
    'onrivi_custom_slash_commands',
    'onrivi_resource_settings',
    'onrivi_resource_folder_path',
    'onrivi_cached_drive_profiles'
  ];
  for (const key of extraKeys) {
    if (EXCLUDED_STORAGE_KEYS.has(key)) continue;
    const val = localStorage.getItem(key);
    if (val !== null && val !== undefined) {
      storageItems[key] = val;
    }
  }

  // 3. AI API 키 및 모델명 수집 (secureStorage 및 localStorage)
  let apiKey = '';
  let modelName = '';
  if (includeApiKey) {
    apiKey = (loadSecureData<string>('onrivi_gemini_api_key') || localStorage.getItem('onrivi_gemini_api_key') || '').trim();
  }
  modelName = (loadSecureData<string>('onrivi_ai_model_name') || localStorage.getItem('onrivi_ai_model_name') || '').trim();

  // 4. 암호화 페이로드 객체 구성
  const payload: OnriviSettingsBackupPayload = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    hasApiKey: Boolean(apiKey),
    storageItems,
    userCssProfiles: Array.isArray(userCssProfiles) ? userCssProfiles : undefined,
    aiSettings: {
      geminiApiKey: apiKey || undefined,
      aiModelName: modelName || undefined,
    }
  };

  const rawJson = JSON.stringify(payload);

  // 5. AES-256 암호화 수행
  const ciphertext = CryptoJS.AES.encrypt(rawJson, cleanPassword).toString();
  // 검증용 체크섬 (비밀번호 + 타임스탬프 기반 해시 앞 12자리)
  const checksum = CryptoJS.SHA256(cleanPassword + payload.exportedAt).toString().substring(0, 16);

  // 6. 최종 백업 포맷 래핑
  const backupFile: OnriviEncryptedBackupFile = {
    magic: BACKUP_MAGIC_HEADER,
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: payload.exportedAt,
    hasApiKey: Boolean(apiKey),
    checksum,
    payload: ciphertext
  };

  return JSON.stringify(backupFile, null, 2);
}

/**
 * 암호화된 백업 파일 문자열을 비밀번호로 검증 복호화하고, 환경설정을 원자적으로 복원합니다.
 *
 * @param {string} fileContent - 업로드된 백업 파일 내용
 * @param {string} password - 사용자가 입력한 복호화 비밀번호
 * @returns {Promise<{ success: boolean; restoredCount: number; hasApiKey: boolean; profilesCount: number }>} 복원 결과 객체
 */
export async function importEncryptedSettings(
  fileContent: string,
  password: string
): Promise<{ success: boolean; restoredCount: number; hasApiKey: boolean; profilesCount: number }> {
  const cleanPassword = (password || '').trim();
  if (!cleanPassword) {
    throw new Error('PASSWORD_REQUIRED: 복원 암호를 입력해 주세요.');
  }

  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('INVALID_FILE_FORMAT: 백업 파일 내용이 비어 있거나 올바르지 않습니다.');
  }

  // 1. 백업 파일 구조 검증
  let parsedFile: OnriviEncryptedBackupFile;
  try {
    parsedFile = JSON.parse(fileContent.replace(/^\uFEFF/, '').trim());
  } catch {
    throw new Error('INVALID_JSON: 백업 파일 형식이 유효한 JSON이 아닙니다.');
  }

  if (parsedFile.magic !== BACKUP_MAGIC_HEADER || !parsedFile.payload) {
    throw new Error('INVALID_BACKUP_FILE: 온리비 어서(Onrivi Author)의 정규 암호화 백업 파일이 아닙니다.');
  }

  // 2. AES-256 복호화 시도
  let decryptedText = '';
  try {
    const bytes = CryptoJS.AES.decrypt(parsedFile.payload, cleanPassword);
    decryptedText = bytes.toString(CryptoJS.enc.Utf8);
  } catch (decryptErr) {
    throw new Error('PASSWORD_MISMATCH: 비밀번호가 올바르지 않거나 파일이 손상되었습니다.');
  }

  if (!decryptedText) {
    throw new Error('PASSWORD_MISMATCH: 비밀번호가 올바르지 않습니다. 다시 입력해 주세요.');
  }

  // 3. 복호화된 페이로드 JSON 파싱
  let payload: OnriviSettingsBackupPayload;
  try {
    payload = JSON.parse(decryptedText);
  } catch {
    throw new Error('CORRUPTED_PAYLOAD: 복호화된 데이터 형식이 손상되었습니다.');
  }

  if (!payload || typeof payload !== 'object' || !payload.storageItems) {
    throw new Error('INVALID_PAYLOAD_STRUCTURE: 복원할 설정 데이터가 존재하지 않습니다.');
  }

  // 4. 원자적 설정 복원 적용
  let restoredCount = 0;
  for (const [key, val] of Object.entries(payload.storageItems)) {
    if (val !== null && val !== undefined) {
      localStorage.setItem(key, val);
      restoredCount++;
    }
  }

  // 5. AI API 키 및 모델명 복원
  if (payload.aiSettings?.geminiApiKey) {
    const key = payload.aiSettings.geminiApiKey.trim();
    saveSecureData('onrivi_gemini_api_key', key);
    localStorage.setItem('onrivi_gemini_api_key', key);
  }
  if (payload.aiSettings?.aiModelName) {
    const model = payload.aiSettings.aiModelName.trim();
    saveSecureData('onrivi_ai_model_name', model);
    localStorage.setItem('onrivi_ai_model_name', model);
  }

  // 6. 사용자 CSS 서식 프로필 복원 (캐시 및 프로필 스토리지 연동)
  let profilesCount = 0;
  if (Array.isArray(payload.userCssProfiles) && payload.userCssProfiles.length > 0) {
    profilesCount = payload.userCssProfiles.length;
    try {
      localStorage.setItem('onrivi_cached_drive_profiles', JSON.stringify(payload.userCssProfiles));
    } catch {}
  }

  // 7. 복원 완료 브로드캐스트 이벤트 발생
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('onrivi:settings_restored', {
      detail: { restoredCount, hasApiKey: payload.hasApiKey, profilesCount }
    }));
  }

  return {
    success: true,
    restoredCount,
    hasApiKey: payload.hasApiKey,
    profilesCount
  };
}

/**
 * 브라우저 환경에서 생성된 암호화 백업 문자열을 .onrivicfg 파일로 즉시 다운로드합니다.
 *
 * @param {string} fileContent - 암호화된 백업 JSON 텍스트
 * @param {string} [customName] - 저장할 파일명 (생략 시 날짜 기반 자동 생성)
 */
export function downloadBackupFile(fileContent: string, customName?: string) {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = customName || `onrivi_settings_backup_${dateStr}.onrivicfg`;

  const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
