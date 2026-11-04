// 🚨 @PATCH : 2026-11-04 — [관리자 권한 해제 반영] 비활성 관리자 공통 코드 변경 차단
// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 공통코드 그룹 CRUD와 권한 조회를 PostgreSQL로 통일한다.
import { jsonResponse, handleOptions, adminServerError } from '../_shared.js';
import { withDbTransaction } from '../../_db.js';
import { DB_CODES } from '../../_db-codes.js';

export const onRequestOptions = handleOptions;

async function checkAdmin(env, adminId, requiredRole = DB_CODES.ADMIN_ROLE.SUPPORT) {
  if (!env || !adminId) return false;
  const rows = await withDbTransaction(env, db => db.query(
    'SELECT admin_role, is_active FROM public.admins WHERE user_id = $1 LIMIT 1', [adminId]
  ));
  const data = rows.rows[0];
  if (!data || !data.is_active) return false;
  if (requiredRole === DB_CODES.ADMIN_ROLE.SUPER && data.admin_role !== DB_CODES.ADMIN_ROLE.SUPER) return false;
  return true;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const url = new URL(request.url);
    const adminId = request.headers.get('x-verified-admin-id');

    if (!adminId) {
      return jsonResponse({ success: false, error: '관리자 ID(adminId)가 필요합니다.' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPPORT);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: '권한이 없습니다.' }, 403);
    }

    const result = await withDbTransaction(env, db => db.query(
      'SELECT * FROM public.common_code_groups ORDER BY sort_order ASC, group_code ASC'
    ));
    const groups = result.rows;

    return jsonResponse({ success: true, data: groups });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/groups.js', 'list_code_groups');
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const { group_code, group_name, description, sort_order, is_use } = body;
    const adminId = request.headers.get('x-verified-admin-id');

    if (!adminId || !group_code || !group_name) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    const uppercaseGroupCode = group_code.toUpperCase();
    const result = await withDbTransaction(env, async db => {
      const existing = await db.query('SELECT group_code FROM public.common_code_groups WHERE group_code = $1 LIMIT 1',
        [uppercaseGroupCode]);
      if (existing.rows.length) return { exists: true };
      await db.query(`INSERT INTO public.common_code_groups
        (group_code, group_name, description, sort_order, is_use, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [uppercaseGroupCode, group_name, description || '', sort_order || 0,
          is_use !== undefined ? is_use : true, adminId]);
      return { exists: false };
    });
    if (result.exists) {
      return jsonResponse({ success: false, error: '이미 존재하는 그룹 코드입니다.' }, 400);
    }

    return jsonResponse({ success: true, message: '그룹 코드가 생성되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/groups.js', 'create_code_group');
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const { group_code, group_name, description, sort_order, is_use } = body;
    const adminId = request.headers.get('x-verified-admin-id');

    if (!adminId || !group_code) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    const updateData = { updated_by: adminId, updated_at: new Date().toISOString() };
    if (group_name !== undefined) updateData.group_name = group_name;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_use !== undefined) updateData.is_use = is_use;

    const fields = ['group_name', 'description', 'sort_order', 'is_use', 'updated_by', 'updated_at']
      .filter(field => updateData[field] !== undefined);
    await withDbTransaction(env, db => db.query(
      `UPDATE public.common_code_groups SET ${fields.map((field, i) => `${field} = $${i + 1}`).join(', ')} WHERE group_code = $${fields.length + 1}`,
      [...fields.map(field => updateData[field]), group_code]
    ));

    return jsonResponse({ success: true, message: '그룹 코드가 수정되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/groups.js', 'update_code_group');
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    const url = new URL(request.url);
    const adminId = request.headers.get('x-verified-admin-id');
    const group_code = url.searchParams.get('group_code');

    if (!adminId || !group_code) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    await withDbTransaction(env, db => db.query('DELETE FROM public.common_code_groups WHERE group_code = $1', [group_code]));

    return jsonResponse({ success: true, message: '그룹 코드가 삭제되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/groups.js', 'delete_code_group');
  }
}
