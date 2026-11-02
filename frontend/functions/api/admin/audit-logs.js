// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction/apiJson으로 교체
// 🚨 @PATCH : 2026-11-02 — DB 예외 원문 대신 공통 안전 오류와 요청 ID를 반환
import { handleOptions, checkAdminAuth, adminServerError } from './_shared.js';
import { withDbTransaction, apiJson } from '../_db.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, ['SUPER', 'SUPPORT']);
    if (authResult.error) {
      return apiJson({ success: false, error: authResult.error }, authResult.status || 403);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const search = (url.searchParams.get('search') || '').trim();
    const action = url.searchParams.get('action') || 'ALL';
    const range = url.searchParams.get('range') || 'ALL';

    const result = await withDbTransaction(env, async db => {
      // 1. Stats
      const statsRes = await db.query(`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE l.created_at >= date_trunc('day', now()))::int AS today,
          count(*) FILTER (WHERE l.action_type = 'PLAN_CHANGE')::int AS plan_changes,
          count(*) FILTER (WHERE l.action_type IN ('KILL_SESSION', 'SUSPEND', 'UNBAN', 'ADMIN_ROLE_CHANGE', 'ADMIN_REVOKE', 'ADMIN_INVITE', 'ROLE_CHANGE'))::int AS security_actions
        FROM public.user_audit_logs l
      `);

      // 2. Query logs
      const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      const queryParams = [
        userId || null,
        action,
        range,
        search,
        term,
        limit,
        (page - 1) * limit
      ];

      const rowsRes = await db.query(`
        SELECT 
          l.id,
          l.action_type as raw_action,
          CASE 
            WHEN l.action_type = 'PLAN_CHANGE' THEN '요금제 변경'
            WHEN l.action_type = 'KILL_SESSION' THEN '세션 강제 종료'
            WHEN l.action_type = 'SUSPEND' THEN '계정 정지'
            WHEN l.action_type = 'UNBAN' THEN '정지 해제'
            WHEN l.action_type = 'ADMIN_INVITE' THEN '관리자 초대'
            WHEN l.action_type = 'ADMIN_ROLE_CHANGE' THEN '관리자 권한 변경'
            WHEN l.action_type = 'ADMIN_REVOKE' THEN '관리자 권한 회수'
            WHEN l.action_type IN ('USER_WITHDRAW', 'USER_DELETE') THEN '회원 탈퇴'
            ELSE COALESCE(c.code_name, l.action_type)
          END as action_name,
          l.reason,
          l.created_at,
          l.admin_id,
          adm.email as admin_email,
          l.target_user_id,
          tgt.email as target_email,
          count(*) OVER()::int as total_count
        FROM public.user_audit_logs l
        LEFT JOIN public.common_codes c ON c.group_code = 'AUDIT_ACTION' AND c.code_value = l.action_type
        LEFT JOIN public.users adm ON adm.id = l.admin_id
        LEFT JOIN public.users tgt ON tgt.id = l.target_user_id
        WHERE ($1::uuid IS NULL OR l.target_user_id = $1::uuid)
          AND ($2 = 'ALL' OR l.action_type = $2)
          AND ($3 = 'ALL'
            OR ($3 = 'TODAY' AND l.created_at >= date_trunc('day', now()))
            OR ($3 = '7D' AND l.created_at >= now() - interval '7 days')
            OR ($3 = '30D' AND l.created_at >= now() - interval '30 days'))
          AND ($4 = ''
            OR adm.email ILIKE $5 ESCAPE '\\'
            OR tgt.email ILIKE $5 ESCAPE '\\'
            OR l.reason ILIKE $5 ESCAPE '\\')
        ORDER BY l.created_at DESC
        LIMIT $6 OFFSET $7
      `, queryParams);

      const rows = rowsRes.rows;
      const totalCount = rows.length > 0 ? rows[0].total_count : 0;
      return { stats: statsRes.rows[0], rows: rows.map(({ total_count, ...r }) => r), total: totalCount };
    });

    return apiJson({
      success: true,
      data: result.rows,
      total: result.total,
      stats: result.stats,
      page,
      limit,
      canManage: authResult.adminData?.admin_role === 'SUPER',
      asOf: new Date().toISOString()
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/audit-logs.js', 'list_audit_logs');
  }
}
