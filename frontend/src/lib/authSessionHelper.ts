// ========================================================================================
// 🔐 [계정 격리 스토리지 어댑터 임포트]
// ----------------------------------------------------------------------------------------
// 브라우저 기본 localStorage/sessionStorage 대신, 앞서 구현한 "계정별 독립 스토리지"를 가져와
// 기존 코드들이 친숙하게 쓸 수 있도록 'localStorage'라는 별칭(alias)으로 매핑하여 사용합니다.
// ========================================================================================
import { 
  browserAccountStorage as localStorage, 
  browserAccountSessionStorage as sessionStorage 
} from '@/lib/browserAccountStorage';

/**
 * 날짜 문자열(YYYYMMDD 또는 ISO)을 ms 타임스탬프로 안전하게 파싱
 */
export const parseDateStringToMs = (str?: string): number => {
  if (!str) return 0;
  if (str === '99991231') return Number.MAX_SAFE_INTEGER;
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.substring(0, 4), 10);
    const m = parseInt(str.substring(4, 6), 10) - 1;
    const d = parseInt(str.substring(6, 8), 10);
    return new Date(y, m, d, 23, 59, 59, 999).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * ========================================================================================
 * 프로그램명 : OnriviAuthor
 * 모듈명     : authSessionHelper.ts
 * ----------------------------------------------------------------------------------------
 * 🎯 모듈 목적:
 *   로그아웃 및 세션 만료 시 로그인 토큰과 라이선스 정보만 선별하여 안전하게 삭제하고,
 *   사용자의 소중한 환경설정(Gemini API 키, 테마, 단축키 등)은 보존하는 세션 라이프사이클 관리 모듈
 * ----------------------------------------------------------------------------------------
 * 🚨 @PATCH : **2026-09-17** — [인증/세션 로그아웃 시 환경설정(Gemini API 키, 에디터 설정 등) 영구 보존]:
 *      과거의 무차별 일괄 삭제(k.startsWith('onrivi_'))로 인해 로그아웃할 때마다 사용자가 등록해 둔
 *      Gemini API 키(onrivi_gemini_api_key), 에디터 설정(onrivi_settings), 리소스 폴더 등이 날아가던
 *      치명적 결함을 해결. 오직 인증/라이선스 세션 키와 Supabase 토큰만 선별 삭제하고 설정은 영구 보존.
 * ========================================================================================
 */

/**
 * ========================================================================================
 * 🔒 AUTH_SESSION_KEYS (로그아웃 / 세션 만료 시 "삭제"해야 하는 키 목록)
 * ----------------------------------------------------------------------------------------
 * 다음 사용자나 다른 사람이 이 컴퓨터를 쓸 때 이전 로그인 정보가 남지 않도록 깨끗이 지웁니다.
 * ========================================================================================
 */
export const AUTH_SESSION_KEYS = [
  'onrivi_session_id',        // 현재 접속 중인 로그인 세션 고유 ID
  'onrivi_device_id',         // PC/기기 고유 식별자 (UUID)
  'onrivi_user_id',           // 로그인한 사용자 ID (Supabase UID)
  'onrivi_payment_no',        // 결제 번호 (구독 매핑용)
  'onrivi_license_key',       // 정식 라이선스 인증 키
  'onrivi_verify_key',        // 라이선스 변조 방지용 검증 키
  'onrivi_license_status',    // 라이선스 상태 캐시 (유효기간, 플랜 이름 등)
  'onrivi_tab_session_id',    // 브라우저 탭 단위 중복 접속 방어 세션 ID
  'onrivi_last_run_time',     // 세션 타임아웃 계산을 위한 마지막 실행 시각
  'onrivi_guest_mode',        // [체험하기] 손님 모드 활성화 플래그 ('Y' / 'N')
  'onrivi_guest_expired',     // 게스트 체험 시간 만료 낙인 플래그
  'onrivi_guest_start_time',  // 게스트 체험 카운트다운 시작 시각
  'onrivi_guest_try_count',   // 게스트 체험판 사용 횟수 카운터
  'onrivi_user_nickname',     // 사용자 표시용 닉네임
  'onrivi_nick_name',         // 프로필 닉네임 캐시
  'onrivi_signup_nick_name',  // 회원가입 진행 시 임시 저장된 닉네임
] as const;

/**
 * ========================================================================================
 * 🛡️ PROTECTED_PREFERENCE_KEYS (로그아웃해도 "절대 지우면 안 되는" 영구 보존 설정 목록)
 * ----------------------------------------------------------------------------------------
 * 사용자가 내 취향에 맞게 고생해서 맞춰둔 에디터 환경설정이므로 영구히 보존합니다.
 * ========================================================================================
 */
export const PROTECTED_PREFERENCE_KEYS = [
  'onrivi_gemini_api_key',     // 사용자가 직접 입력한 구글 Gemini AI API 개인 키
  'onrivi_ai_model_name',      // 선택된 AI 모델 (Gemini Pro, Flash 등)
  'onrivi_settings',           // 에디터 상세 환경설정 JSON
  'onrivi_resource_folder',    // 이미지/첨부파일이 저장되는 로컬 리소스 폴더 경로
  'onrivi_workspace_path',     // 작업장 로컬 디렉토리 경로
  'onrivi_custom_css',         // 사용자가 직접 작성한 나만의 출판 커스텀 CSS
  'onrivi_recent_docs',        // 최근에 열었던 문서 파일 목록
  'onrivi_expanded_paths',     // 좌측 탐색기에서 펼쳐두었던 폴더 트리 상태
  'onrivi_tabs',               // 상단에 열려 있던 에디터 탭 목록
  'rootFolder',                // 로컬 작업장 루트 폴더 핸들 식별자
  'workspaceType',             // 작업장 유형 ('local' 또는 'gdrive')
  'theme',                     // 에디터 테마 ('light' / 'dark' / 'luxury')
  'fontSize',                  // 본문 글자 크기 (pt/px)
  'wordWrap',                  // 줄바꿈 설정 ('on' / 'off')
  'quoteStyle',                // 인용구 디자인 스타일 (모던, 클래식, 컬러바 등)
  'themePalette',              // 강조 색상 팔레트
  'autoSave',                  // 자동 저장 주기 설정
  'previewMode',               // 미리보기 화면 분할 모드 (좌우 분할, 전체화면 등)
  'customHotkeys',             // 사용자 정의 단축키 매핑 정보
  'customSlashCommands',       // 사용자 슬래시(/) 명령어 목록
] as const;

/**
 * ========================================================================================
 * clearAuthSessionStorage
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   로그아웃 또는 세션 만료 시, 사용자 환경설정(Gemini API 키, 에디터 테마 등)은 안전하게 보호하고
 *   오직 인증 세션 정보와 Supabase 로그인 토큰만 선별하여 깨끗하게 삭제합니다.
 * 
 * 📥 매개변수:
 *   - 없음
 * 
 * 📤 반환값:
 *   - @returns {void} 반환값 없음
 * 
 * ⚠️ 주의사항:
 *   - 서버사이드 렌더링(SSR) 중에는 브라우저 스토리지가 없으므로 즉시 안전하게 종료합니다.
 *   - Supabase 로그인 토큰은 이름이 'sb-' 로 시작하므로 접두사 검사를 통해 확실히 파기합니다.
 * ----------------------------------------------------------------------------------------
 * 💡 사용 예시:
 *   // 로그아웃 버튼 클릭 시
 *   clearAuthSessionStorage();
 *   router.push('/login');
 * ========================================================================================
 */
export const clearAuthSessionStorage = (): void => {
  // 1. [환경 방어] 서버 컴퓨터(SSR) 환경에서는 브라우저 창(window)이 없으므로 중단
  if (typeof window === 'undefined') return;

  try {
    // 2. [인증 키 삭제] 사전에 정의된 인증/라이선스 세션 키 목록을 하나씩 돌면서 삭제
    AUTH_SESSION_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    // 3. [소셜/로그인 토큰 삭제] Supabase Auth가 발급한 인증 토큰(sb- 로 시작하는 키)만 쏙 골라서 삭제
    localStorage.keys().forEach((key) => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });

    // 4. [탭 세션 해제] 브라우저 세션 스토리지에 남아 있는 탭 세션 ID 파기 (중복 로그인 방어 해제)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('onrivi_tab_session_id');
    }
  } catch (err) {
    // 혹시 모를 브라우저 권한/스토리지 오류 시 앱이 죽지 않도록 방어하고 에러 기록
    console.error('[authSessionHelper] 세션 정리 중 오류:', err);
  }
};