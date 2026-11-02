// ====================================================================
// 📊 [OMD-AUTH-MID-0001] functions/api/admin/_middleware.js
// 🎯 @KICK  : 관리자 API 라우트 전역 인증/인가 검증, SUPER 권한 통제 및 하위 핸들러 신원 헤더 주입
// 🛡️ @GUARD : CORS 프리플라이트 통과, MFA 검증(사전 검사 분기 허용), SUPER 쓰기 제한, 인증 장애 시 503 방어
// 🚨 @PATCH : 2026-11-02 — [관리자 인증 개선] 관리자 역할 조회 GET에 한해 MFA 이전 사전 검사를 미들웨어에서도 허용
// 🔗 @CALLS : checkAdminAuth, jsonResponse, context.next()
// ====================================================================

import { checkAdminAuth, jsonResponse } from './_shared.js';

/**
 * ========================================================================================
 * 📌 [함수명] onRequest
 * Cloudflare Functions 관리자 전역 미들웨어: 요청 검증, 인가 처리 및 보안 헤더 전파
 *
 * @param {object} context - Cloudflare Functions 실행 컨텍스트
 * @param {Request} context.request - 인입된 HTTP 요청 객체
 * @param {object} context.env - 환경 변수 및 바인딩 객체
 * @param {function(Request): Promise<Response>} context.next - 다음 미들웨어 또는 라우트 핸들러 호출 함수
 * @returns {Promise<Response>} 검증 실패 시 오류 JSON 응답, 성공 시 다음 체인 실행 결과
 * @throws 401(인증 실패), 403(SUPER 권한 부족), 503(인증 서비스 장애)
 * ========================================================================================
 */
export async function onRequest(context) {
  // CORS 프리플라이트(OPTIONS) 요청은 별도 인증 없이 통과
  if (context.request.method === 'OPTIONS') return context.next();

  try {
    const url = new URL(context.request.url);

    // MFA 완료 전 관리자 역할 사전 확인용 엔드포인트 예외 분기 플래그
    const preMfaRoleCheck = context.request.method === 'GET' &&
      url.pathname === '/api/admin/role' && url.searchParams.get('pre_mfa') === 'true';   // 다중인증 방식

    // 관리자 세션 토큰 및 DB 권한 상태 검증
    const auth = await checkAdminAuth(context.request, context.env, undefined, preMfaRoleCheck);
    
    if (auth.error) return jsonResponse({ error: auth.error }, auth.status);      // 인증시 오류발생 처리

    const path = url.pathname; 

    // SUPER 관리자 전용 변경(CUD) 대상 엔드포인트 판별
    const superOnlyWrite = context.request.method !== 'GET' && (
      path === '/api/admin/admins' || path.startsWith('/api/admin/common-codes') ||
      path === '/api/admin/plans' || path === '/api/admin/users/plan'
    );

    // 최고 관리자(SUPER) 권한 검증 가드
    if (superOnlyWrite && auth.adminData.admin_role !== 'SUPER') {
      return jsonResponse({ error: 'SUPER role required' }, 403);
    }

    // 하위 API 핸들러에서 검증된 관리자 정보를 즉시 사용할 수 있도록 요청 헤더에 주입
    const headers = new Headers(context.request.headers);
    headers.set('x-verified-admin-id', auth.user.id);
    headers.set('x-verified-admin-role', auth.adminData.admin_role);

    return context.next(new Request(context.request, { headers }));
  } catch {
    // DB 연결 단절 등 예외 상황 시 인증 불가(503) 반환
    return jsonResponse({ error: 'Admin authentication unavailable' }, 503);
  }
}