/** 🚨 @PATCH : 2026-11-02 — DB 예외 원문 대신 기존 공통 안전 메시지를 반환 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { SYSTEM_MESSAGES } from '@/constants/messages';

export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const action = searchParams.get('action') || 'ALL';
    const range = searchParams.get('range') || 'ALL';

    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;

    // 1. Stats
    const statsRes = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE l.created_at >= date_trunc('day', now()))::int AS today,
        count(*) FILTER (WHERE l.action_type = 'PLAN_CHANGE')::int AS plan_changes,
        count(*) FILTER (WHERE l.action_type IN ('KILL_SESSION', 'SUSPEND', 'UNBAN', 'ADMIN_ROLE_CHANGE', 'ADMIN_REVOKE', 'ADMIN_INVITE', 'ROLE_CHANGE'))::int AS security_actions
      FROM public.user_audit_logs l
    `;

    // 2. Query logs
    const queryParams = [
      userId || null,
      action,
      range,
      search,
      term,
      limit,
      (page - 1) * limit
    ];

    const rows = await sql.unsafe(`
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

    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    const cleanRows = rows.map(({ total_count, ...r }: any) => r);

    return NextResponse.json({
      success: true,
      data: cleanRows,
      total: totalCount,
      stats: statsRes[0],
      page,
      limit,
      canManage: auth.adminRole === 'SUPER',
      asOf: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[/api/admin/audit-logs] Error fetching logs:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
