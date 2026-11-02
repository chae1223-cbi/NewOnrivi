import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
/**
 * 프로그램명 : OnriviAuthor
 * 모듈명 : authSessionHelper.ts
 * -----------------------------------------------------------------------
 * 변경내역
 * // 🚨 @PATCH : **2026-09-17** — [인증/세션 로그아웃 시 환경설정(Gemini API 키, 에디터 설정 등) 영구 보존]:
 *      기존의 일괄 접두사 삭제(k.startsWith('onrivi_'))로 인해 로그아웃 및 로그인 시마다 환경설정의
 *      Gemini API 키(onrivi_gemini_api_key), 에디터 설정(onrivi_settings), 리소스 폴더 등이 전량 삭제되던
 *      치명적 결함을 원천 차단. 오직 인증/라이선스 세션 키 및 Supabase 토큰만 선별 삭제하고 사용자 환경설정은 영구 보존.
 */

// 🔒 인증 및 디바이스 라이선스 세션 관련 키 목록 (로그아웃 / 세션 만료 시 삭제 대상)
export const AUTH_SESSION_KEYS = [
  'onrivi_session_id',
  'onrivi_device_id',
  'onrivi_user_id',
  'onrivi_payment_no',
  'onrivi_license_key',
  'onrivi_verify_key',
  'onrivi_license_status',
  'onrivi_tab_session_id',
  'onrivi_last_run_time',
  'onrivi_guest_mode',
  'onrivi_guest_expired',
  'onrivi_guest_start_time',
  'onrivi_guest_try_count',
  'onrivi_user_nickname',
  'onrivi_nick_name',
  'onrivi_signup_nick_name',
] as const;

// 🛡️ 절대 삭제되면 안 되는 사용자 환경설정 및 영구 데이터 키 목록 (보호 대상)
export const PROTECTED_PREFERENCE_KEYS = [
  'onrivi_gemini_api_key',
  'onrivi_ai_model_name',
  'onrivi_settings',
  'onrivi_resource_folder',
  'onrivi_workspace_path',
  'onrivi_custom_css',
  'onrivi_recent_docs',
  'onrivi_expanded_paths',
  'onrivi_tabs',
  'rootFolder',
  'workspaceType',
  'theme',
  'fontSize',
  'wordWrap',
  'quoteStyle',
  'themePalette',
  'autoSave',
  'previewMode',
  'customHotkeys',
  'customSlashCommands',
] as const;

/**
 * 💡 [한글 주석] 로그아웃 또는 세션 만료 시, 사용자 환경설정(Gemini API 키, 에디터 설정 등)을 
 * 안전하게 보존하면서 오직 인증 세션과 Supabase 토큰만 선별적으로 완전 삭제합니다.
 */
export const clearAuthSessionStorage = (): void => {
  if (typeof window === 'undefined') return;

  try {
    // 1. 명시적 인증/라이선스 세션 키 선별 삭제
    AUTH_SESSION_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    // 2. Supabase 관련 세션 토큰(sb-*)만 선별 삭제
    localStorage.keys().forEach((key) => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // 3. 브라우저 세션 스토리지의 탭 세션 ID 제거
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('onrivi_tab_session_id');
    }
  } catch (err) {
    console.error('[authSessionHelper] 세션 정리 중 오류:', err);
  }
};
