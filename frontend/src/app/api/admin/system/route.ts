/** 🚨 @PATCH : 2026-11-02 — 시스템 API 예외 원문 대신 기존 공통 안전 메시지를 반환 */
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';
import { SYSTEM_MESSAGES } from '@/constants/messages';

export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req, true);
    if (!auth.user) return NextResponse.json({ success: false, error: auth.error }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const serverSource = searchParams.get('source') === 'server';
    const filterLevel = searchParams.get('level') || 'ALL'; // ALL, INFO, WARN, ERROR
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. DB 헬스체크 및 메트릭 측정
    const dbStartTime = Date.now();
    let dbStatus = 'ONLINE';
    let dbVersion = 'PostgreSQL';
    let dbLatencyMs = 0;
    let counts: any = {};
    let rawAuditLogs: any[] = [];

    try {
      const pingRes = await sql`SELECT version() as ver, now() as db_time`;
      dbLatencyMs = Date.now() - dbStartTime;
      if (pingRes[0]) {
        dbVersion = pingRes[0].ver?.split(' on ')[0] || 'PostgreSQL';
      }

      const countsRes = await sql`
        SELECT
          (SELECT count(*)::int FROM public.users) as user_count,
          (SELECT count(*)::int FROM public.subscriptions WHERE plan_status = 'ACTIVE') as active_sub_count,
          (SELECT count(*)::int FROM public.user_audit_logs WHERE created_at >= date_trunc('day', now())) as today_audit_count
      `;
      counts = countsRes[0] || {};

      rawAuditLogs = await sql`
        SELECT 
          l.id,
          l.action_type,
          l.reason,
          l.created_at,
          l.admin_id,
          adm.email as admin_email,
          l.target_user_id,
          tgt.email as target_email
        FROM public.user_audit_logs l
        LEFT JOIN public.users adm ON adm.id = l.admin_id
        LEFT JOIN public.users tgt ON tgt.id = l.target_user_id
        ORDER BY l.created_at DESC
        LIMIT 60
      `;
    } catch (dbErr: any) {
      dbStatus = 'ERROR';
      dbLatencyMs = Date.now() - dbStartTime;
      console.error('[SystemRoute] DB Error:', dbErr);
    }

    // 2. 로그 가공
    const logs = rawAuditLogs.map(log => {
      let level = 'INFO';
      let moduleName = 'AUDIT';

      if (['KILL_SESSION', 'SUSPEND'].includes(log.action_type)) {
        level = 'WARN';
        moduleName = 'SECURITY';
      } else if (['UNBAN', 'ADMIN_INVITE', 'ADMIN_ROLE_CHANGE'].includes(log.action_type)) {
        level = 'INFO';
        moduleName = 'AUTH';
      } else if (log.action_type === 'PLAN_CHANGE') {
        level = 'INFO';
        moduleName = 'BILLING';
      } else if (log.action_type === 'CONTENT_DELETE') {
        level = 'WARN';
        moduleName = 'R2_STORAGE';
      }

      return {
        id: log.id,
        timestamp: log.created_at,
        level,
        module: moduleName,
        action: log.action_type,
        message: log.reason || `${log.action_type} 실행됨`,
        actor: log.admin_email || (log.admin_id ? `Admin(${log.admin_id.slice(0, 8)})` : 'SYSTEM'),
        target: log.target_email || (log.target_user_id ? `User(${log.target_user_id.slice(0, 8)})` : '-')
      };
    });

    let filteredLogs = serverSource ? [] : logs;
    filteredLogs = filteredLogs.filter(l => l.level === 'WARN' || l.level === 'ERROR');
    if (filterLevel !== 'ALL') {
      filteredLogs = filteredLogs.filter(l => l.level === filterLevel);
    }
    if (search) {
      filteredLogs = filteredLogs.filter(l =>
        l.message.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        l.module.toLowerCase().includes(search) ||
        l.actor.toLowerCase().includes(search) ||
        l.target.toLowerCase().includes(search)
      );
    }

    const health = {
      overall: dbStatus === 'ONLINE' ? 'HEALTHY' : 'DEGRADED',
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        version: dbVersion
      },
      storage: {
        status: 'UNKNOWN',
        bucket: 'onrivi-images',
        binding: 'R2_BUCKET'
      },
      hyperdrive: {
        status: 'UNKNOWN'
      },
      server: {
        runtime: 'Next.js App Server / Edge',
        region: 'Local / Edge',
        country: 'KR',
        server_time: new Date().toISOString()
      }
    };

    const stats = {
      total_events_today: counts.today_audit_count || 0,
      total_users: counts.user_count || 0,
      active_subscriptions: counts.active_sub_count || 0,
      db_latency_ms: dbLatencyMs,
      error_count_24h: null
    };

    return NextResponse.json({
      success: true,
      logError: serverSource ? '개발 서버의 API 로그 수집은 연결되지 않았습니다. 운영 Cloudflare 배포에서 제공됩니다.' : null,
      health,
      stats,
      logs: filteredLogs,
      total_logs: filteredLogs.length,
      asOf: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[/api/admin/system] Route error:', error);
    return NextResponse.json({ success: false, error: SYSTEM_MESSAGES.DATABASE_ERROR.text }, { status: 500 });
  }
}
