// ====================================================================
// 📊 [OMD-CONST-admin-0001] frontend/src/constants/admin.ts
// 🎯 @KICK  : 관리자 시스템 공통 상수 및 헬퍼 정의
// 🛡️ @GUARD : ROOT_ADMIN 환경변수 보호 및 대소문자 무관 안전 비교
// 🚨 @PATCH : 2026-11-02 — [보안 강화] 서버 환경에서 ROOT_ADMIN_EMAIL 미설정 시 즉시 에러 발생(Fail-Closed) 적용 (규칙 9 준수)
// 🚨 @PATCH : 2026-11-02 — [보안 리팩토링] 하드코딩된 이메일 제거 및 ROOT_ADMIN_EMAIL 환경변수 동적 참조 구조로 전환
// ====================================================================

/**
 * 환경변수(ROOT_ADMIN_EMAIL)에서 최상위 관리자 이메일을 안전하게 가져옵니다.
 * 서버 사이드 실행 시 누락된 경우 즉각 예외를 던져 보안 취약점을 방어합니다.
 */
export function getRootAdminEmail(): string {
  if (typeof process === 'undefined') return '';
  const email = process.env.ROOT_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ROOT_ADMIN_EMAIL || '';
  if (typeof window === 'undefined' && !email) {
    throw new Error('❌ ROOT_ADMIN_EMAIL 환경변수가 설정되어 있지 않습니다. 서버 환경설정을 확인해 주세요.');
  }
  return email;
}

/**
 * 하위 호환성을 위한 ROOT_ADMIN_EMAIL 상수
 */
export const ROOT_ADMIN_EMAIL = typeof process !== 'undefined' ? (process.env.ROOT_ADMIN_EMAIL || process.env.NEXT_PUBLIC_ROOT_ADMIN_EMAIL || '') : '';

/**
 * 주어진 이메일이 최상위 관리자(ROOT_ADMIN)인지 안전하게 대소문자 무관 비교
 */
export function isRootAdmin(email?: string | null): boolean {
  if (!email) return false;
  const rootEmail = getRootAdminEmail();
  if (!rootEmail) return false;
  return email.trim().toLowerCase() === rootEmail.trim().toLowerCase();
}
