// 🚨 @PATCH : 2026-11-02 — 시스템 API 예외 원문 대신 공통 안전 오류와 요청 ID를 반환
// 🚨 @PATCH : 2026-10-08 — 시스템 현황 모니터링 및 실시간 서버/DB/R2 헬스체크 & 로그 조회 API 신규 구축
import { handleOptions, checkAdminAuth, adminServerError } from './_shared.js';
import { withDbTransaction, apiJson } from '../_db.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const authResult = await checkAdminAuth(request, env, ['SUPER']);
    if (authResult.error) {
      return apiJson({ success: false, error: authResult.error }, authResult.status || 403);
    }

    const url = new URL(request.url);
    const filterLevel = url.searchParams.get('level') || 'ALL'; // ALL, INFO, WARN, ERROR
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    // 1. 시스템 헬스체크 및 DB 메트릭 측정
    const dbStartTime = Date.now();
    let dbStatus = 'ONLINE';
    let dbVersion = 'PostgreSQL';
    let dbLatencyMs = 0;
    let dbStats = { total_users: 0, active_subscriptions: 0, total_events_today: 0 };
    let rawAuditLogs = [];

    try {
      const result = await withDbTransaction(env, async db => {
        const pingRes = await db.query(`SELECT version() as ver, now() as db_time`);
        dbLatencyMs = Date.now() - dbStartTime;
        if (pingRes.rows[0]) {
          dbVersion = pingRes.rows[0].ver?.split(' on ')[0] || 'PostgreSQL';
        }

        // 통계 쿼리
        const countsRes = await db.query(`
          SELECT
            (SELECT count(*)::int FROM public.users) as user_count,
            (SELECT count(*)::int FROM public.subscriptions WHERE plan_status = 'ACTIVE') as active_sub_count,
            (SELECT count(*)::int FROM public.user_audit_logs WHERE created_at >= date_trunc('day', now())) as today_audit_count
        `);
        const c = countsRes.rows[0] || {};
        dbStats = {
          total_users: c.user_count || 0,
          active_subscriptions: c.active_sub_count || 0,
          total_events_today: c.today_audit_count || 0
        };

        // 최근 시스템 로그/감사로그 상위 60건 조회
        const logsRes = await db.query(`
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
        `);
        rawAuditLogs = logsRes.rows || [];
      });
    } catch (dbErr) {
      dbStatus = 'ERROR';
      dbLatencyMs = Date.now() - dbStartTime;
      console.error('[SystemAPI] DB Healthcheck error:', dbErr);
    }

    // 2. Cloudflare R2 버킷 헬스체크
    let r2Status = 'OFFLINE';
    let r2Details = { binding: 'R2_BUCKET', bucket: 'onrivi-images' };
    if (env.R2_BUCKET) {
      try { await env.R2_BUCKET.list({ prefix: '_system-logs/', limit: 1 }); r2Status = 'ONLINE'; } catch { r2Status = 'OFFLINE'; }
    }

    // 3. Hyperdrive 연결 풀러 상태
    const hyperdriveStatus = env.HYPERDRIVE ? 'ACTIVE' : 'DIRECT_POOLER';

    // 4. 로그 가공 (감사 로그 및 시스템 레벨 분류)
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

    const source = url.searchParams.get('source') || 'server';
    let serverLogs = [];
    let logError = null;
    if (source === 'server' && env.R2_BUCKET) {
      try {
        const now = new Date();
        const koreaDate = new Date(now.getTime() + 9*3600000).toISOString().slice(0,10);
        const start = Date.parse(koreaDate + 'T00:00:00+09:00');
        const dates = [...new Set([new Date(start).toISOString().slice(0,10), new Date(start+86400000-1).toISOString().slice(0,10)])];
        const listings = await Promise.all(dates.map(date => env.R2_BUCKET.list({ prefix: `_system-logs/${date}/`, limit: 1000 })));
        const listing = { objects: listings.flatMap(l=>l.objects), truncated: listings.some(l=>l.truncated) };
        const newest = listing.objects.filter(object => { const stamp = Date.parse(object.key.split('/').pop().split('_')[0]); return stamp >= start && stamp < start+86400000; }).sort((a,b)=>b.key.localeCompare(a.key)).slice(0,1000);
        serverLogs = (await Promise.all(newest.map(async object => {
          const stored = await env.R2_BUCKET.get(object.key);
          return stored ? await stored.json() : null;
        }))).filter(entry => entry && Date.parse(entry.timestamp) >= start && Date.parse(entry.timestamp) < start+86400000);
        if (listing.truncated) logError = '오늘 기록 중 일부만 표시됩니다. 조회 한도를 초과했습니다. 이 화면의 검색 결과에는 누락이 있을 수 있습니다.';
      } catch { logError = '서버 로그 저장소를 조회하지 못했습니다.'; }
    } else if (source === 'server') logError = '서버 로그 저장소가 연결되지 않았습니다.';

    serverLogs = serverLogs.filter(entry => !(entry.status < 400 && ['/api/device/session-status','/api/license/check-session'].includes(entry.route)));
    // 필터링 적용
    let filteredLogs = source === 'server' ? serverLogs : logs;
    filteredLogs = filteredLogs.filter(l => l.level === 'WARN' || l.level === 'ERROR');
    if (filterLevel !== 'ALL') {
      filteredLogs = filteredLogs.filter(l => l.level === filterLevel);
    }
    if (search) {
      filteredLogs = filteredLogs.filter(l =>
        (l.route || '').toLowerCase().includes(search) ||
        (l.request_id || l.id || '').toLowerCase().includes(search) ||
        (l.operation || '').toLowerCase().includes(search) ||
        (l.event_code || '').toLowerCase().includes(search) ||
        (l.source_file || '').toLowerCase().includes(search) ||
        l.message.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        l.module.toLowerCase().includes(search) ||
        l.actor.toLowerCase().includes(search) ||
        l.target.toLowerCase().includes(search)
      );
    }

    const health = {
      overall: dbStatus === 'ONLINE' && r2Status === 'ONLINE' ? 'HEALTHY' : 'DEGRADED',
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
        version: dbVersion
      },
      storage: {
        status: r2Status,
        bucket: r2Details.bucket,
        binding: r2Details.binding
      },
      hyperdrive: {
        status: hyperdriveStatus
      },
      server: {
        runtime: 'Cloudflare Pages Functions (Edge)',
        region: request.cf?.colo || 'ICN (Seoul Edge)',
        country: request.cf?.country || 'KR',
        server_time: new Date().toISOString()
      }
    };

    const stats = {
      total_events_today: dbStats.total_events_today,
      total_users: dbStats.total_users,
      active_subscriptions: dbStats.active_subscriptions,
      db_latency_ms: dbLatencyMs,
      error_count_24h: null // HTTP log sample is not a complete 24-hour count
    };

    return apiJson({
      success: true,
      logError,
      logScope: 'API·브라우저 오류 기록 · 오늘(한국 시간) 조회 범위 내 조건별 최근 60건 · 콘솔/시작 로그 제외',
      health,
      stats,
      logs: filteredLogs.slice(0,60),
      total_logs: Math.min(filteredLogs.length, 60),
      asOf: new Date().toISOString()
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/system.js', 'system_status');
  }
}
