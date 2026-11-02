// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-01 — [skills/onrivi-db-processing, skills/onrivi-error-handling 준수]
// 🚨 @PATCH : 2026-11-02 — 관리자 사용자·구독·기기 목록 조회를 PostgreSQL로 통일하고 기존 응답 형식을 유지한다.
// 🚨 @PATCH : 2026-11-02 — 실패 응답을 공통 오류 처리와 요청 ID에 연결한다.
//             1) Auth ban/unban 통신과 DB 세션 정리 및 감사로그(user_audit_logs) 적재의 트랜잭션 원자적 분리
//             2) withDbTransaction으로 suspend 시 활성 세션 비활성화 및 감사로그 원트랜잭션(All-or-Nothing) 보장
// 🚨 @PATCH : 2026-10-08 — 세션 해제(kill_session) UUID 정규표현식 5그룹(8-4-4-4-12) 누락 수정
// 🚨 @PATCH : 2026-09-28 — 사용자별 요금제 변경 화면에 현재 주기와 관리자 수동 무료/유료 구분을 제공
import { corsHeaders, jsonResponse, handleOptions, getSupabaseConfig, adminServerError } from './_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type') || 'general'; // 'general' or 'admin'
    const filterStatus = url.searchParams.get('status') || 'ALL';
    const filterPlan = url.searchParams.get('plan') || 'ALL';
    const requestedUserId = url.searchParams.get('userId');

    const { supabaseUrl, headers } = getSupabaseConfig(env);

    if (type === 'general') {
      const users = (await withDbTransaction(env, db => db.query(
        'SELECT * FROM public.users ORDER BY created_at DESC'
      ))).rows;
      
      const userIds = users.map(u => u.id);
      let subsMap = {};
      let subIdToUserIdMap = {};
      let subIds = [];
      
      if (userIds.length > 0) {
        const subs = (await withDbTransaction(env, db => db.query(
          'SELECT * FROM public.subscriptions WHERE user_id = ANY($1::uuid[]) AND plan_status = $2',
          [userIds, DB_CODES.PLAN_STATUS.ACTIVE]
        ))).rows;
        subs.forEach(s => {
          subsMap[s.user_id] = s;
          subIdToUserIdMap[s.id] = s.user_id;
          subIds.push(s.id);
        });
      }

      const codesData = (await withDbTransaction(env, db => db.query(
        'SELECT code_value, code_name FROM public.common_codes WHERE group_code = $1 AND is_use = true',
        [DB_CODES.CODE_GROUP.PLAN_NAME]
      ))).rows;
      const planCodeMap = {};
      codesData.forEach(c => { planCodeMap[c.code_value] = c.code_name; });

      const authUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers });
      const authMap = {};
      if (authUsersRes.ok) {
        const authUsers = await authUsersRes.json();
        authUsers.users?.forEach(au => {
          authMap[au.id] = au;
        });
      }

      let activationsMap = {};
      if (userIds.length > 0) {
        const actsList = [];
        
        const actsByUser = (await withDbTransaction(env, db => db.query(
          'SELECT id, created_by, subscription_id, device_name, activated_at, is_active FROM public.license_activations WHERE created_by = ANY($1::uuid[]) AND is_active = true',
          [userIds]
        ))).rows;
        actsList.push(...actsByUser);

        if (subIds.length > 0) {
          const actsBySub = (await withDbTransaction(env, db => db.query(
            'SELECT id, created_by, subscription_id, device_name, activated_at, is_active FROM public.license_activations WHERE subscription_id = ANY($1::uuid[]) AND is_active = true',
            [subIds]
          ))).rows;
          actsList.push(...actsBySub);
        }

        const seenActs = new Set();
        actsList.forEach(a => {
          if (seenActs.has(a.id)) return;
          seenActs.add(a.id);
          
          const userId = a.created_by || subIdToUserIdMap[a.subscription_id];
          if (userId) {
            if (!activationsMap[userId]) {
              activationsMap[userId] = [];
            }
            activationsMap[userId].push(a);
          }
        });
      }

      let formattedData = users.map(u => {
        const sub = subsMap[u.id];
        const authUser = authMap[u.id];
        const rawPlan = sub ? sub.plan_name : 'READER';
        const displayPlan = planCodeMap[rawPlan] || rawPlan;

        let currentStatus = 'ACTIVE';
        if (authUser?.banned_until) {
          currentStatus = 'SUSPENDED';
        } else if (u.is_deleted) {
          currentStatus = 'DELETED';
        } else if (sub && sub.plan_status) {
          currentStatus = sub.plan_status;
        }

        return {
          id: u.id,
          email: u.email,
          nick_name: u.nick_name || '-',
          plan: displayPlan,
          plan_code: rawPlan,
          billing_cycle: sub?.billing_cycle || 'NONE',
          admin_grant_type: String(sub?.payment_no || '').startsWith('ADMIN-FREE-') ? 'FREE' :
            String(sub?.payment_no || '').startsWith('ADMIN-PAID-') ? 'PAID' : null,
          status: currentStatus,
          date: u.created_at ? new Date(u.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '-',
          last_login: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-',
          start_date: sub?.current_period_start ? new Date(sub.current_period_start).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '-',
          end_date: sub?.current_period_end ? (new Date(sub.current_period_end).getUTCFullYear() === 9999 ? '무제한' : new Date(sub.current_period_end).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })) : '-',
          devices: activationsMap[u.id] || []
        };
      });

      if (requestedUserId) formattedData = formattedData.filter(u => u.id === requestedUserId);

      if (filterStatus !== 'ALL') {
        formattedData = formattedData.filter(u => u.status === filterStatus);
      }
      if (filterPlan !== 'ALL') {
        formattedData = formattedData.filter(u => {
          if (filterPlan === 'READER') return u.plan_code === 'READER';
          if (filterPlan === 'PRO') return u.plan_code !== 'READER';
          return u.plan_code === filterPlan;
        });
      }

      const total = formattedData.length;
      const paginatedData = formattedData.slice((page - 1) * limit, page * limit);

      return jsonResponse({ success: true, data: paginatedData, total, page, limit });
    } else {
      const admins = (await withDbTransaction(env, db => db.query(
        'SELECT * FROM public.admins ORDER BY created_at DESC'
      ))).rows;

      const authUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers });
      const authMap = {};
      if (authUsersRes.ok) {
        const authUsers = await authUsersRes.json();
        authUsers.users?.forEach(au => {
          authMap[au.id] = au;
        });
      }

      let formattedData = admins.map(a => {
        const authUser = authMap[a.user_id]; // 🚨 @PATCH 2026-08-07: a.id(admins PK) → a.user_id(auth FK) 수정
        return {
          id: a.id,
          email: a.email,
          nick_name: '-', 
          plan: a.role === 'SUPER_ADMIN' ? 'Super Admin' : (a.role || 'Support Admin'),
          status: a.is_active === false ? 'SUSPENDED' : 'ACTIVE',
          date: a.created_at ? new Date(a.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '-',
          last_login: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-',
          end_date: '-'
        };
      });

      if (filterStatus !== 'ALL') {
        formattedData = formattedData.filter(a => a.status === filterStatus);
      }

      const total = formattedData.length;
      const paginatedData = formattedData.slice((page - 1) * limit, page * limit);

      return jsonResponse({ success: true, data: paginatedData, total, page, limit });
    }
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/users.js', 'list_users');
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { action, userId, reason } = body;
    const adminId = request.headers.get('x-verified-admin-id');

    if (!userId || !action) {
      return jsonResponse({ success: false, error: 'Missing parameters' }, 400);
    }

    const { supabaseUrl, headers } = getSupabaseConfig(env);

    if (action === 'suspend') {
      const banRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ban_duration: '87600h' })
      });
      if (!banRes.ok) throw new Error('Failed to ban user in Auth: ' + await banRes.text());
      
      await withDbTransaction(env, async db => {
        // 활성 세션 비활성화 및 감사로그 원자적 적재
        await db.query(`
          UPDATE public.license_activations a
          SET is_active = false, deactivated_at = NOW(), updated_at = NOW(), updated_by = $1
          FROM public.subscriptions s
          WHERE a.subscription_id = s.id AND s.user_id = $2 AND a.is_active = true
        `, [adminId || null, userId]);

        await db.query(`
          INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
          VALUES ($1, $2, 'SUSPEND', $3)
        `, [userId, adminId || null, reason || null]);
      });
      
      return jsonResponse({ success: true, message: `User ${userId} suspended successfully.` });
    }

    if (action === 'kill_single_session') {
      const deviceId = body.deviceId;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuid.test(userId) || !uuid.test(deviceId || '')) return jsonResponse({ success: false, error: 'Invalid user or device ID' }, 400);
      const result = await withDbTransaction(env, async db => {
        const found = await db.query(`SELECT a.id FROM public.license_activations a JOIN public.subscriptions s ON s.id = a.subscription_id
          WHERE a.id = $1 AND s.user_id = $2 FOR UPDATE OF a`, [deviceId, userId]);
        if (!found.rows.length) return { found: false, changed: 0 };
        const changed = await db.query(`UPDATE public.license_activations SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = $1
          WHERE id = $2 AND is_active = true RETURNING id`, [adminId, deviceId]);
        if (changed.rows.length) await db.query(`INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
          VALUES ($1, $2, 'KILL_SESSION', $3)`, [userId, adminId, `device=${deviceId}; 사용자 상세에서 기기 해제`]);
        return { found: true, changed: changed.rows.length };
      });
      return result.found ? jsonResponse({ success: true, changed: result.changed }) : jsonResponse({ success: false, error: 'Device not found for user' }, 404);
    }

    if (action === 'kill_session') {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuid.test(userId)) return jsonResponse({ success: false, error: 'Invalid user ID' }, 400);
      const result = await withDbTransaction(env, async db => {
        const found = await db.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [userId]);
        if (!found.rows.length) return { found: false, changed: 0 };
        const changed = await db.query(`UPDATE public.license_activations a SET is_active = false, deactivated_at = now(), updated_at = now(), updated_by = $1
          FROM public.subscriptions s WHERE a.subscription_id = s.id AND s.user_id = $2 AND a.is_active = true RETURNING a.id`, [adminId, userId]);
        if (changed.rows.length) await db.query(`INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
          VALUES ($1, $2, 'KILL_SESSION', $3)`, [userId, adminId, `count=${changed.rows.length}; 사용자 상세에서 전체 기기 해제`]);
        return { found: true, changed: changed.rows.length };
      });
      return result.found ? jsonResponse({ success: true, changed: result.changed }) : jsonResponse({ success: false, error: 'User not found' }, 404);
    }

    if (action === 'unban') {
      const unbanRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ban_duration: 'none' })
      });
      if (!unbanRes.ok) throw new Error('Failed to unban user in Auth: ' + await unbanRes.text());

      await withDbTransaction(env, async db => {
        await db.query(`
          INSERT INTO public.user_audit_logs (target_user_id, admin_id, action_type, reason)
          VALUES ($1, $2, 'UNBAN', $3)
        `, [userId, adminId || null, null]);
      });
      return jsonResponse({ success: true, message: `User ${userId} unbanned successfully.` });
    }

    return jsonResponse({ success: false, error: 'Unknown action' }, 400);

  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/users.js', 'update_user');
  }
}
