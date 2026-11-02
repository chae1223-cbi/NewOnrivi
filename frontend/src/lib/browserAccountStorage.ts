// ========================================================================================
// 🔐 [계정별 브라우저 스토리지 격리 모듈]
// ----------------------------------------------------------------------------------------
// 1. 에디터 페이지가 떠 있는 동안 현재 인증된 사용자 식별자(account)는 고정됩니다.
// 2. 계정이 변경되면 에디터 전체를 새로고침(Reload)하여 저장소 충돌 및 데이터 오염을 방지합니다.
// ========================================================================================

/** 현재 에디터 세션에 활성화된 사용자 고유 식별자 (미로그인 시 'guest') */
let account: string | null = null;

/**
 * ========================================================================================
 * activateBrowserAccount
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   웹 브라우저 환경에서 현재 로그인한 사용자의 ID로 계정 저장소 범위를 활성화합니다.
 * 
 * 📥 매개변수:
 *   - @param {string | null} userId - 로그인한 사용자 식별자 (null일 경우 'guest'로 기본 할당)
 * 
 * ⚠️ 주의사항 / 예외:
 *   - 일렉트론 데스크톱 앱(electronAPI 존재) 환경에서는 로컬 PC 단독 사용이므로 격리 처리를 건너뜁니다.
 *   - 식별자에 특수문자가 포함되어 있거나 128자를 초과하면 예외(Error)를 발생시킵니다.
 *   - 한 세션 내에서 새로고침 없이 다른 계정으로의 무단 전환 시도는 차단됩니다.
 * ========================================================================================
 */
export function activateBrowserAccount(userId: string | null) {
  // 1. [데스크톱 환경 예외] 일렉트론 앱은 PC 파일 시스템을 직접 사용하므로 브라우저 격리 로직 패스
  if (typeof window !== 'undefined' && (window as any).electronAPI) return;

  // 2. [로그인/체험하기 검증] 유저 ID가 없으면 무조건 허용하지 않고, '체험하기'를 거친 경우에만 'guest' 부여
  const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('onrivi_guest_mode') === 'Y';
  const next = userId || (isGuestMode ? 'guest' : null);

  if (!next) {
    throw new Error('로그인이 필요합니다. 로그인 후 에디터에 접근해 주세요.');
  }

  // 3. [식별자 보안 검증] 영문 대소문자, 숫자, 밑줄(_), 하이픈(-) 조합 1~128자 허용
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(next)) {
    throw new Error('계정 저장소 식별자가 올바르지 않습니다.');
  }

  // 4. [데이터 오염 방지] 이미 A 계정으로 열려 있는 상태에서 새로고침 없이 B 계정으로 바뀌면 즉시 에러 발생
  if (account && account !== next) {
    throw new Error('계정 변경 후 편집기를 다시 열어 주세요.');
  }

  // 5. 활성 계정 확정
  account = next;
}

/**
 * ========================================================================================
 * getBrowserAccountScope
 * ----------------------------------------------------------------------------------------
 * 🎯 현재 활성화된 브라우저 계정 식별자 반환
 * 📤 @returns {string | null} 활성 계정 ID (예: 'user_123', 'guest', 또는 null)
 * ========================================================================================
 */
export const getBrowserAccountScope = () => account;    // account (현재 접속 userId)를 주소방식으로 간접으로 알림

/**
 * ========================================================================================
 * browserAccountDatabaseName
 * ----------------------------------------------------------------------------------------
 * 🎯 IndexedDB 로컬 데이터베이스 이름을 계정별로 분리하여 생성
 * 📤 @returns {string} 계정 전용 DB 이름 (예: 'onrivi-author-db:account:user_123')
 * ========================================================================================
 */
export const browserAccountDatabaseName = () => account ? `onrivi-author-db:account:${account}` : 'onrivi-author-db';

/**
 * ========================================================================================
 * 📋 [계정별 격리 대상 정확한 키(Key) 목록]
 * 다른 계정과 절대로 공유되어서는 안 되는 민감 설정 키 모음
 * ========================================================================================
 */
const exactKeys = new Set([
  'rootFolder',                         // 작업장 루트 폴더
  'workspaceType',                      // 작업장 모드 (local / gdrive)
  'resourceFolder',                     // 첨부 에셋 리소스 폴더
  'activeCssProfileId',                 // 선택된 출판 CSS 프로필 ID
  'onrivi_settings',                    // 사용자 에디터 환경설정
  'onrivi_last_local_root_folder',      // 마지막으로 열었던 로컬 폴더 경로
  'onrivi_default_watermark_settings',  // 워터마크 기본 설정
  'onrivi_ai_connections',              // 사용자 AI API 연결 키 정보
  'onrivi_ai_selected'                  // 선택된 AI 모델
]);

/**
 * ========================================================================================
 * isAccountStorageKey
 * ----------------------------------------------------------------------------------------
 * 🎯 특정 스토리지 키가 계정별 격리 대상인지 여부를 판별
 * 📥 @param {string} key - 검사할 스토리지 키 이름
 * 📤 @returns {boolean} 계정 전용으로 분리 저장해야 하면 true, 공통 설정이면 false
 * ========================================================================================
 */
export function isAccountStorageKey(key: string) {
  return (
    key.startsWith('vfs:') || // 가상 파일 시스템(VFS) 내부 파일 데이터
    exactKeys.has(key) ||     // 위에서 정의한 정확한 키 목록에 포함되는 경우
    // 계정별 작업장, 리소스, 구글드라이브 토큰, 초안, 백업, 탭 목록 관련 정규표현식 매칭
    /^onrivi_(?:.*workspace|.*resource|gdrive_|active_drive_account|drive_account_settings|saved_drive_accounts|emergency_gdrive_drafts|cached_drive_profiles|tabs_|content$|vfs_|.*draft|.*backup|recent_|web_base_path)/.test(key)
  );
}

/**
 * ========================================================================================
 * keyFor (내부 헬퍼)
 * ----------------------------------------------------------------------------------------
 * 🎯 원본 키에 계정 접두사('onrivi:account:{account}:')를 붙여 실제 저장소 키로 변환
 * 💡 예: 'activeCssProfileId' ➜ 'onrivi:account:user_01:activeCssProfileId'
 * ========================================================================================
 */
function keyFor(key: string) {
  return account && isAccountStorageKey(key) ? `onrivi:account:${account}:${key}` : key;
}

/**
 * ========================================================================================
 * browserAccountStorage
 * ----------------------------------------------------------------------------------------
 * 🎯 브라우저 표준 localStorage를 가로채지 않고, 계정 격리 기능을 입힌 명시적 스토리지 어댑터
 * ========================================================================================
 */
export const browserAccountStorage = {
  /** 현재 계정에 속한 스토리지 키 목록만 필터링하여 반환 (계정 접두사는 제거하고 순수 키 이름으로 반환) */
  keys: () => {
    if (typeof window === 'undefined') return []; // 서버 환경 방어
    const keys = Object.keys(globalThis.localStorage);
    if (!account) return keys;

    const prefix = `onrivi:account:${account}:`;
    return keys.flatMap(key => 
      key.startsWith(prefix) 
        ? [key.slice(prefix.length)] // 내 계정 접두사가 붙어있으면 접두사를 떼어낸 원본 키 반환
        : !key.startsWith('onrivi:account:') && !isAccountStorageKey(key) 
          ? [key]                    // 다른 계정 것이 아니고 공통 키인 경우 그대로 반환
          : []                       // 다른 계정의 데이터는 숨김 처리
    );
  },

  /** 계정 격리된 키를 찾아 값 조회 */
  getItem: (key: string) => 
    typeof window === 'undefined' ? null : globalThis.localStorage.getItem(keyFor(key)),

  /** 계정 접두사를 자동으로 붙여 안전하게 값 저장 */
  setItem: (key: string, value: string) => { 
    if (typeof window !== 'undefined') globalThis.localStorage.setItem(keyFor(key), value); 
  },

  /** 계정 격리된 특정 키 데이터 삭제 */
  removeItem: (key: string) => { 
    if (typeof window !== 'undefined') globalThis.localStorage.removeItem(keyFor(key)); 
  },
};

/**
 * ========================================================================================
 * browserAccountSessionStorage
 * ----------------------------------------------------------------------------------------
 * 🎯 브라우저 탭 세션 단위 저장소(sessionStorage)에 계정 격리를 적용한 어댑터
 * ========================================================================================
 */
export const browserAccountSessionStorage = {
  /** 세션 스토리지에서 계정 격리된 값 조회 */
  getItem: (key: string) => 
    typeof window === 'undefined' ? null : globalThis.sessionStorage.getItem(keyFor(key)),

  /** 세션 스토리지에 계정 접두사를 붙여 저장 */
  setItem: (key: string, value: string) => { 
    if (typeof window !== 'undefined') globalThis.sessionStorage.setItem(keyFor(key), value); 
  },

  /** 세션 스토리지 데이터 삭제 */
  removeItem: (key: string) => { 
    if (typeof window !== 'undefined') globalThis.sessionStorage.removeItem(keyFor(key)); 
  },
};