// ====================================================================
// 📊 [OMD-LIB-logoLoader-0001] logoLoader.ts ➔ 전역 타자스핀로고(LogoLoader) 제어 래퍼
// 🎯 @KICK  : 비동기 작업 성격에 따라 화면 중앙 오버레이(center-overlay)와 마우스 추적(cursor-follow) 모드를 구분 제어
// 🛡️ @GUARD : SSR 환경 무해 방어 및 center-overlay 우선순위 기반 중첩 카운팅으로 조기 종료 방지
// 🚨 @PATCH : 2026-11-16 — [center-overlay / cursor-follow 이원화 모드 지원 및 우선순위 큐 적용]
// 🔗 @CALLS : window.LogoLoader
// ====================================================================

export type LogoLoaderMode = 'center-overlay' | 'cursor-follow';

export interface LogoLoaderStartOptions {
  mode?: LogoLoaderMode;
}

declare global {
  interface Window {
    LogoLoader?: {
      init?: (options?: { logoSrc?: string; mode?: LogoLoaderMode; style?: string }) => void;
      start: (label?: string, options?: LogoLoaderStartOptions) => void;
      stop: () => void;
      wrap?: <T>(promise: Promise<T>, label?: string, options?: LogoLoaderStartOptions) => Promise<T>;
    };
  }
}

let centerLoaderCount = 0;
let cursorLoaderCount = 0;
let lastCenterLabel = '잠시만 기다려 주세요...';

function syncLogoLoaderState(): void {
  if (typeof window === 'undefined') return;
  try {
    if (centerLoaderCount > 0) {
      window.LogoLoader?.start(lastCenterLabel, { mode: 'center-overlay' });
    } else if (cursorLoaderCount > 0) {
      window.LogoLoader?.start('', { mode: 'cursor-follow' });
    } else {
      window.LogoLoader?.stop();
    }
  } catch {
    // LogoLoader 스크립트 로드 전이라도 앱 흐름을 중단하지 않음
  }
}

/**
 * ========================================================================================
 * [startLogoLoader] 전역 로고 로딩 애니메이션을 시작합니다.
 * - center-overlay: 화면 중앙 카드 오버레이 (내보내기, 파일 열기/저장 등 대기성 작업)
 * - cursor-follow: 마우스 커서 추적 스피너 (전역 검색, AI 질의 등 비차단 작업)
 *
 * @param {string} [label='잠시만 기다려 주세요...'] - center-overlay 하단에 표시할 안내 문구
 * @param {LogoLoaderStartOptions} [options] - 로더 표시 모드 옵션
 * @returns {void}
 * ==========================================================================================
 */
export function startLogoLoader(label = '잠시만 기다려 주세요...', options?: LogoLoaderStartOptions): void {
  const mode: LogoLoaderMode = options?.mode || 'center-overlay';
  if (mode === 'cursor-follow') {
    cursorLoaderCount += 1;
  } else {
    centerLoaderCount += 1;
    if (label) lastCenterLabel = label;
  }
  syncLogoLoaderState();
}

/**
 * ========================================================================================
 * [stopLogoLoader] 지정된 모드의 로고 로딩 카운트를 감소시키고, 활성 작업이 없으면 숨깁니다.
 *
 * @param {LogoLoaderMode} [mode='center-overlay'] - 종료할 로더 모드
 * @returns {void}
 * ==========================================================================================
 */
export function stopLogoLoader(mode: LogoLoaderMode = 'center-overlay'): void {
  if (mode === 'cursor-follow') {
    cursorLoaderCount = Math.max(0, cursorLoaderCount - 1);
  } else {
    centerLoaderCount = Math.max(0, centerLoaderCount - 1);
  }
  syncLogoLoaderState();
}

/**
 * ========================================================================================
 * [wrapLogoLoader] 비동기 Promise의 실행 생명주기에 맞춰 지정된 모드의 로고 로더를 자동 시작·종료합니다.
 *
 * @template T
 * @param {Promise<T>} promise - 대기할 비동기 작업 Promise
 * @param {string} [label='잠시만 기다려 주세요...'] - center-overlay 하단에 표시할 안내 문구
 * @param {LogoLoaderStartOptions} [options] - 로더 표시 모드 옵션
 * @returns {Promise<T>} 원본 Promise 결과
 * ==========================================================================================
 */
export async function wrapLogoLoader<T>(
  promise: Promise<T>,
  label = '잠시만 기다려 주세요...',
  options?: LogoLoaderStartOptions
): Promise<T> {
  const mode: LogoLoaderMode = options?.mode || 'center-overlay';
  startLogoLoader(label, { mode });
  try {
    return await promise;
  } finally {
    stopLogoLoader(mode);
  }
}
