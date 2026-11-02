// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 상세 공통코드 CRUD와 권한 조회를 PostgreSQL로 통일한다.
import { jsonResponse, handleOptions, adminServerError } from '../_shared.js';
import { withDbTransaction } from '../../_db.js';
import { DB_CODES } from '../../_db-codes.js';

export const onRequestOptions = handleOptions;

async function checkAdmin(env, adminId, requiredRole = DB_CODES.ADMIN_ROLE.SUPPORT) {
  if (!env || !adminId) return false;
  const rows = await withDbTransaction(env, db => db.query(
    'SELECT admin_role FROM public.admins WHERE user_id = $1 LIMIT 1', [adminId]
  ));
  const data = rows.rows[0];
  if (!data) return false;
  if (requiredRole === DB_CODES.ADMIN_ROLE.SUPER && data.admin_role !== DB_CODES.ADMIN_ROLE.SUPER) return false;
  return true;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    const url = new URL(request.url);
    const adminId = request.headers.get('x-verified-admin-id');
    const group_code = url.searchParams.get('group_code');

    if (!adminId) {
      return jsonResponse({ success: false, error: '관리자 ID(adminId)가 필요합니다.' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPPORT);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: '권한이 없습니다.' }, 403);
    }

    const result = await withDbTransaction(env, db => db.query(
      group_code
        ? 'SELECT * FROM public.common_codes WHERE group_code = $1 ORDER BY sort_order ASC, code_value ASC'
        : 'SELECT * FROM public.common_codes ORDER BY sort_order ASC, code_value ASC',
      group_code ? [group_code] : []
    ));
    const codes = result.rows;

    return jsonResponse({ success: true, data: codes });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/index.js', 'list_codes');
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const { group_code, code_value, code_name, description, sort_order, is_use } = body;
    const adminId = request.headers.get('x-verified-admin-id');

    if (!adminId || !group_code || !code_value || !code_name) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    const uppercaseCodeValue = code_value.toUpperCase().replace(/\s+/g, '');
    const result = await withDbTransaction(env, async db => {
      const existing = await db.query('SELECT id FROM public.common_codes WHERE group_code = $1 AND code_value = $2 LIMIT 1',
        [group_code, uppercaseCodeValue]);
      if (existing.rows.length) return { exists: true };
      await db.query(`INSERT INTO public.common_codes
        (group_code, code_value, code_name, description, sort_order, is_use, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [group_code, uppercaseCodeValue, code_name, description || '', sort_order || 0,
          is_use !== undefined ? is_use : true, adminId]);
      return { exists: false };
    });
    if (result.exists) {
      return jsonResponse({ success: false, error: '해당 그룹에 이미 존재하는 코드 값입니다.' }, 400);
    }

    return jsonResponse({ success: true, message: '상세 코드가 생성되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/index.js', 'create_code');
  }
}

export async function onRequestPatch(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const { id, code_name, description, sort_order, is_use } = body;
    const adminId = request.headers.get('x-verified-admin-id');

    if (!adminId || !id) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    const updateData = { updated_by: adminId, updated_at: new Date().toISOString() };
    if (code_name !== undefined) updateData.code_name = code_name;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_use !== undefined) updateData.is_use = is_use;

    const fields = ['code_name', 'description', 'sort_order', 'is_use', 'updated_by', 'updated_at']
      .filter(field => updateData[field] !== undefined);
    await withDbTransaction(env, db => db.query(
      `UPDATE public.common_codes SET ${fields.map((field, i) => `${field} = $${i + 1}`).join(', ')} WHERE id = $${fields.length + 1}`,
      [...fields.map(field => updateData[field]), id]
    ));

    return jsonResponse({ success: true, message: '상세 코드가 수정되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/index.js', 'update_code');
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env } = context;

    const url = new URL(request.url);
    const adminId = request.headers.get('x-verified-admin-id');
    const id = url.searchParams.get('id');

    if (!adminId || !id) {
      return jsonResponse({ success: false, error: '필수 파라미터 누락' }, 400);
    }

    const hasAccess = await checkAdmin(env, adminId, DB_CODES.ADMIN_ROLE.SUPER);
    if (!hasAccess) {
      return jsonResponse({ success: false, error: 'SUPER 권한이 필요합니다.' }, 403);
    }

    await withDbTransaction(env, db => db.query('DELETE FROM public.common_codes WHERE id = $1', [id]));

    return jsonResponse({ success: true, message: '상세 코드가 삭제되었습니다.' });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/admin/common-codes/index.js', 'delete_code');
  }
}
