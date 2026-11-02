// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — FAQ 수정·삭제를 PostgreSQL로 통일하고 공통 오류 추적을 적용한다.
import { jsonResponse, handleOptions, checkAdminAuth, adminServerError } from '../admin/_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestPut(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    if (!id) return jsonResponse({ error: 'FAQ ID is required' }, 400);

    const body = await request.json();
    
    const { question, answer, is_active, sort_order } = body;
    
    const payload = {};
    if (question !== undefined) payload.question = question;
    if (answer !== undefined) payload.answer = answer;
    if (is_active !== undefined) payload.is_active = is_active;
    if (sort_order !== undefined) payload.sort_order = sort_order;
    
    if (Object.keys(payload).length > 0) {
      const fields = Object.keys(payload);
      const assignments = fields.map((key, index) => `${key} = $${index + 1}`);
      const result = await withDbTransaction(env, db => db.query(
        `UPDATE public.faqs SET ${assignments.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`,
        [...fields.map(key => payload[key]), id]
      ));
      return jsonResponse(result.rows[0] || null);
    }
    
    return jsonResponse({ error: 'No fields to update' }, 400);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/faqs/[id].js', 'update_faq');
  }
}

export async function onRequestDelete(context) {
  try {
    const { request, env, params } = context;
    const { id } = params;

    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    if (!id) return jsonResponse({ error: 'FAQ ID is required' }, 400);

    await withDbTransaction(env, db => db.query('DELETE FROM public.faqs WHERE id = $1', [id]));
    
    return jsonResponse({ success: true });
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/faqs/[id].js', 'delete_faq');
  }
}
