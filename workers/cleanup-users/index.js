// ====================================================================
// 📊 [OMD-CRON-CLEANUP-0001] workers/cleanup-users/index.js
// 🎯 @KICK  : 탈퇴 후 30일이 지난 회원을 Supabase Auth와 PostgreSQL에서 정리한다.
// 🛡️ @GUARD : 예약 이벤트로만 실행하며, 대상 행 잠금과 삭제 조건 재검증으로 재활성화 회원을 보호한다.
// 🚨 @PATCH : 2026-11-02 — Vercel 예약 작업을 Cloudflare 예약 Worker로 이전
// 🔗 @CALLS : withDbTransaction, Supabase Auth Admin API, public.users
// ====================================================================
import { withDbTransaction } from '../../functions/api/_db.js';

const BATCH_SIZE = 100;
const AUTH_TIMEOUT_MS = 10000;

/**
 * ========================================================================================
 * [cleanupUser] 회원 한 명의 삭제 자격을 잠금 후 재검증하고 Auth 및 DB를 정리한다.
 * @param {object} env - Cloudflare 바인딩 및 Supabase 설정
 * @param {string} userId - 정리 후보 회원 ID
 * @returns {Promise<boolean>} 실제로 정리한 경우 true
 * @throws {Error} Auth 또는 PostgreSQL 처리 실패
 * ========================================================================================
 */
async function cleanupUser(env, userId) {
  return withDbTransaction(env, async db => {
    const candidate = await db.query(`
      SELECT id FROM public.users
      WHERE id = $1 AND is_deleted = true
        AND deleted_at < now() - interval '30 days'
      FOR UPDATE
    `, [userId]);
    if (candidate.rowCount === 0) return false;

    const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    // Auth에서 이미 사라진 회원도 DB 정리를 재시도할 수 있어야 한다.
    if (!response.ok && response.status !== 404) {
      throw new Error(`Supabase Auth delete failed (${response.status})`);
    }

    const removed = await db.query(`
      DELETE FROM public.users
      WHERE id = $1 AND is_deleted = true
        AND deleted_at < now() - interval '30 days'
    `, [userId]);
    if (removed.rowCount !== 1) throw new Error('Eligible user delete count mismatch');
    return true;
  });
}

/**
 * ========================================================================================
 * [scheduled] 예약 이벤트마다 제한된 수의 탈퇴 회원을 정리한다.
 * @param {ScheduledController} controller - Cloudflare 예약 이벤트
 * @param {object} env - Cloudflare 바인딩 및 비밀값
 * @returns {Promise<void>} 완료 또는 실패
 * @throws {Error} 설정 누락 또는 회원 정리 실패
 * ========================================================================================
 */
async function scheduled(controller, env) {
  if (!env.HYPERDRIVE?.connectionString && !env.DATABASE_URL) {
    throw new Error('HYPERDRIVE or DATABASE_URL is required');
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Auth Admin configuration is required');
  }

  const candidates = await withDbTransaction(env, async db => {
    const result = await db.query(`
      SELECT id FROM public.users
      WHERE is_deleted = true AND deleted_at < now() - interval '30 days'
      ORDER BY deleted_at, id
      LIMIT $1
    `, [BATCH_SIZE]);
    return result.rows;
  });

  let removed = 0;
  let failed = 0;
  for (const user of candidates) {
    try {
      if (await cleanupUser(env, user.id)) removed++;
    } catch (error) {
      failed++;
      console.error(JSON.stringify({
        event: 'SERVER_ERROR',
        source: 'workers/cleanup-users/index.js',
        stage: 'CLEANUP_USER',
        errorName: error?.name || 'Error',
        dbCode: /^[0-9A-Z]{5}$/.test(error?.code || '') ? error.code : null,
      }));
    }
  }
  console.log(JSON.stringify({ source: 'workers/cleanup-users/index.js', selected: candidates.length, removed, failed }));
  if (failed > 0) throw new Error('Cleanup failed for one or more users');
}

export default { scheduled };
