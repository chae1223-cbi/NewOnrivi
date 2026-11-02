// 🚨 @PATCH : 2026-11-02 — pre_mfa 쿼리 파라미터 지원으로 로그인 직후 관리자 사전 검증 지원
// 🚨 @PATCH : 2026-11-02 — 관리자 화면의 권한 표시를 서버 인증 결과로 제공한다.
import { checkAdminAuth, jsonResponse, handleOptions, adminServerError } from './_shared.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const preMfa = url.searchParams.get('pre_mfa') === 'true';
    const result = await checkAdminAuth(context.request, context.env, undefined, preMfa);
    if (result.error) return jsonResponse({ error: result.error }, result.status);
    return jsonResponse({ admin_role: result.adminData.admin_role });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/role.js', 'read_role');
  }
}
