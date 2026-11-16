// ====================================================================
// 📊 [OMD-LIB-logoLoader-0001] logoLoader.ts ➔ 전역 타자스핀로고(LogoLoader) 제어 래퍼
// 🎯 @KICK  : 비동기 작업(파일 열기/저장, 드라이브 동기화, 문서 내보내기 등) 진행 중 화면 중앙 로고 로딩 오버레이를 안전하게 제어
// 🛡️ @GUARD : SSR 환경 무해 방어 및 중첩 비동기 호출 시 참조 카운팅(activeCount)으로 조기 종료 방지
// 🚨 @PATCH : 2026-11-16 — [LogoLoader-Web 전역 공통 로딩 로더 연동 신설]
// 🔗 @CALLS : window.LogoLoader
// ====================================================================

declare global {
  interface Window {
    LogoLoader?: {
      init?: (options?: { logoSrc?: string; mode?: 'center-overlay' | 'cursor'; style?: string }) => void;
      start: (label?: string) => void;
      stop: () => void;
      wrap?: <T>(promise: Promise<T>, label?: string) => Promise<T>;
    };
  }
}

let activeLoaderCount = 0;

/**
 * ========================================================================================
 * [startLogoLoader] 전역 로고 로딩 오버레이를 시작합니다. (중첩 호출 시 참조 카운트 증가)
 *
 * @param {string} [label='잠시만 기다려 주세요...'] - 오버레이 하단에 표시할 안내 문구
 * @returns {void}
 * ==========================================================================================
 */
export function startLogoLoader(label = '잠시만 기다려 주세요...'): void {
  activeLoaderCount += 1;
  if (typeof window === 'undefined') return;
  try {
    window.LogoLoader?.start(label);
  } catch {
    // LogoLoader 스크립트 로드 전이라도 앱 흐름을 중단하지 않음
  }
}

/**
 * ========================================================================================
 * [stopLogoLoader] 전역 로고 로딩 오버레이를 종료합니다. (모든 중첩 작업 완료 시 숨김)
 *
 * @returns {void}
 * ==========================================================================================
 */
export function stopLogoLoader(): void {
  activeLoaderCount = Math.max(0, activeLoaderCount - 1);
  if (activeLoaderCount > 0 || typeof window === 'undefined') return;
  try {
    window.LogoLoader?.stop();
  } catch {
    // ignore
  }
}

/**
 * ========================================================================================
 * [wrapLogoLoader] 비동기 Promise의 실행 생명주기에 맞춰 로고 로딩 오버레이를 자동 시작·종료합니다.
 *
 * @template T
 * @param {Promise<T>} promise - 대기할 비동기 작업 Promise
 * @param {string} [label='잠시만 기다려 주세요...'] - 오버레이 하단에 표시할 안내 문구
 * @returns {Promise<T>} 원본 Promise 결과
 * ==========================================================================================
 */
export async function wrapLogoLoader<T>(promise: Promise<T>, label = '잠시만 기다려 주세요...'): Promise<T> {
  startLogoLoader(label);
  try {
    return await promise;
  } finally {
    stopLogoLoader();
  }
}
