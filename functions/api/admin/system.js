// 🚨 @PATCH : **2026-11-03** — [최신 100건 실시간 로그 & 프로드/미리보기 선택 & 과거 로그 다운로드 API]:
//             1) 실시간 로그 최대 표시 건수를 60건 -> 최종 100건(최신순 정렬)으로 확장
//             2) env(all/prod/preview) 선택 필터 완벽 지원
//             3) action=download 엔드포인트 지원으로 특정 날짜의 로그를 JSON 파일로 브라우저 원클릭 다운로드
//             4) 최근 로그가 존재하는 과거 날짜 목록(availableDates) 자동 추출 반환
// 🚨 @PATCH : **2026-11-03** — [프로덕션/미리보기 로그 분리 및 동일 30일 삭제 지원]: onRequestDelete에서 정규식 날짜 추출로 prod/preview 분리 경로 모두에 30일 수명주기 동일 적용
// 🚨 @PATCH : **2026-11-03** — [오래된 시스템 로그 30일 자동/수동 정리 API 구축]: onRequestDelete 추가로 30일 경과된 _system-logs R2 로그 일괄 정리
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
    const action = url.searchParams.get('action'); // 'download' 지원
    const envFilter = url.searchParams.get('env') || 'all'; // all, prod, preview
    const filterLevel = url.searchParams.get('level') || 'ALL'; // ALL, INFO, WARN, ERROR
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));

    // ── [과거 로그 파일 다운로드 (action=download)] ─────────────────────────────
    if (action === 'download' && env.R2_BUCKET) {
      const targetDate = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      const downloadPrefixes = envFilter === 'prod'
        ? [`_system-logs/prod/${targetDate}/`]
        : envFilter === 'preview'
        ? [`_system-logs/preview/${targetDate}/`]
        : [`_system-logs/prod/${targetDate}/`, `_system-logs/preview/${targetDate}/`, `_system-logs/${targetDate}/`];

      const listings = await Promise.all(downloadPrefixes.map(prefix => env.R2_BUCKET.list({ prefix, limit: 1000 })));
      const objects = listings.flatMap(l => l.objects);
      const logItems = (await Promise.all(objects.map(async obj => {
        const stored = await env.R2_BUCKET.get(obj.key);
        return stored ? await stored.json() : null;
      }))).filter(Boolean);

      logItems.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

      const filename = `onrivi-logs-${envFilter}-${targetDate}.json`;
      return new Response(JSON.stringify(logItems, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        }
      });
    }

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
        const envFilter = url.searchParams.get('env') || 'all'; // all, prod, preview
        const prefixes = envFilter === 'prod'
          ? dates.map(d => `_system-logs/prod/${d}/`)
          : envFilter === 'preview'
          ? dates.map(d => `_system-logs/preview/${d}/`)
          : [...dates.map(d => `_system-logs/prod/${d}/`), ...dates.map(d => `_system-logs/preview/${d}/`), ...dates.map(d => `_system-logs/${d}/`)];
        const listings = await Promise.all(prefixes.map(prefix => env.R2_BUCKET.list({ prefix, limit: 1000 })));
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
      logScope: `실시간 시스템 로그 (최종 ${limit}건) · 환경: ${envFilter.toUpperCase()}`,
      health,
      stats,
      availableDates,
      env: envFilter,
      logs: filteredLogs.slice(0, limit),
      total_logs: filteredLogs.length,
      asOf: new Date().toISOString()
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/system.js', 'system_status');
  }
}

/**
 * ========================================================================================
 * [함수명] onRequestDelete - 30일(또는 지정 일수)이 경과한 오래된 R2 시스템 로그를 일괄 정리합니다.
 *
 * @param {object} context - Cloudflare Pages context
 * @returns {Promise<Response>} 정리 결과 JSON Response
 * ========================================================================================
 */
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const authResult = await checkAdminAuth(request, env, ['SUPER']);
    if (authResult.error) {
      return apiJson({ success: false, error: authResult.error }, authResult.status || 403);
    }

    if (!env.R2_BUCKET) {
      return apiJson({ success: false, message: 'R2 버킷이 설정되지 않았습니다.' }, 503);
    }

    const url = new URL(request.url);
    const days = Math.max(1, parseInt(url.searchParams.get('days') || '30', 10));
    const cutoffTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
    const cutoffDateStr = new Date(cutoffTimestamp).toISOString().slice(0, 10);

    let deletedCount = 0;
    let cursor = undefined;

    do {
      const listing = await env.R2_BUCKET.list({
        prefix: '_system-logs/',
        cursor,
        limit: 500,
      });

      const keysToDelete = [];
      for (const obj of listing.objects) {
        // _system-logs/{prod|preview}/YYYY-MM-DD/ 및 _system-logs/YYYY-MM-DD/ 형식 모두 지원
        const dateMatch = obj.key.match(/(\d{4}-\d{2}-\d{2})/);
        const logDate = dateMatch ? dateMatch[1] : null;
        if (logDate && logDate < cutoffDateStr) {
          keysToDelete.push(obj.key);
        }
      }

      if (keysToDelete.length > 0) {
        await Promise.all(keysToDelete.map(key => env.R2_BUCKET.delete(key)));
        deletedCount += keysToDelete.length;
      }

      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);

    return apiJson({
      success: true,
      message: `${days}일 이전 로그 정리 완료 (${deletedCount}건 삭제됨)`,
      deletedCount,
      cutoffDate: cutoffDateStr
    });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/system.js', 'cleanup_logs');
  }
}
