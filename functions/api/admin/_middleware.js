// 🚨 @PATCH : **2026-11-04** — [관리자 미들웨어 예외 로깅 강화]: catch 블록 에러 콘솔 출력 및 명확한 에러 메시지 반환
// 🚨 @PATCH : 2026-11-02 — 관리자 역할 조회 GET에 한해 MFA 이전 사전 검사를 미들웨어에서도 허용
import { checkAdminAuth, jsonResponse } from './_shared.js';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return context.next();
  try {
    const url = new URL(context.request.url);
    const preMfaRoleCheck = context.request.method === 'GET' &&
      url.pathname === '/api/admin/role' && url.searchParams.get('pre_mfa') === 'true';
    const auth = await checkAdminAuth(context.request, context.env, undefined, preMfaRoleCheck);
    if (auth.error) return jsonResponse({ error: auth.error }, auth.status);

    const path = url.pathname;
    const superOnlyWrite = context.request.method !== 'GET' && (
      path === '/api/admin/admins' || path.startsWith('/api/admin/common-codes') ||
      path === '/api/admin/plans' || path === '/api/admin/users/plan'
    );
    if (superOnlyWrite && auth.adminData.admin_role !== 'SUPER') {
      return jsonResponse({ error: 'SUPER role required' }, 403);
    }

    const headers = new Headers(context.request.headers);
    headers.set('x-verified-admin-id', auth.user.id);
    headers.set('x-verified-admin-role', auth.adminData.admin_role);
    return context.next(new Request(context.request, { headers }));
  } catch (err) {
    console.error('[AdminMiddleware] Authentication error:', err);
    return jsonResponse({ error: 'Admin authentication unavailable', message: err?.message || 'Auth failure' }, 503);
  }
}
