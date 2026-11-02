// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 프로모션과 신청자 조회·변경을 관리자 PostgreSQL API로 통일한다.
import { checkAdminAuth, jsonResponse, handleOptions, adminServerError } from './_shared.js';
import { withDbTransaction } from '../_db.js';
import { DB_CODES } from '../_db-codes.js';
export const onRequestOptions = handleOptions;
const auth = (context, edit = false) => checkAdminAuth(context.request, context.env,
  edit ? [DB_CODES.ADMIN_ROLE.SUPER] : [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
const denied = result => jsonResponse({ error: result.error }, result.status);
const fail = (context, error, stage) => adminServerError(context.request, error, 'functions/api/admin/promotions.js', stage);

export async function onRequestGet(context) {
  try {
    const result = await auth(context);
    if (result.error) return denied(result);
    const code = new URL(context.request.url).searchParams.get('code');
    if (code) {
      const rows = await withDbTransaction(context.env, db => db.query(
        'SELECT * FROM public.promotion_subscribers WHERE promotion_code = $1 ORDER BY created_at DESC', [code]));
      return jsonResponse(rows.rows);
    }
    const data = await withDbTransaction(context.env, async db => {
      const promotions = await db.query('SELECT * FROM public.promotions ORDER BY created_at DESC');
      const counts = await db.query(`SELECT count(*)::int AS total_count,
        count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today_count
        FROM public.promotion_subscribers`);
      return { promotions: promotions.rows, totalCount: counts.rows[0].total_count, todayCount: counts.rows[0].today_count };
    });
    return jsonResponse(data);
  } catch (error) { return fail(context, error, 'list_promotions'); }
}

export async function onRequestPost(context) {
  try {
    const result = await auth(context, true);
    if (result.error) return denied(result);
    const { code, title, description, start_date, end_date, is_active } = await context.request.json();
    if (!code || !title) return jsonResponse({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, 400);
    const rows = await withDbTransaction(context.env, db => db.query(
      `INSERT INTO public.promotions (code, title, description, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code, title, description, start_date, end_date, is_active]));
    return jsonResponse(rows.rows[0]);
  } catch (error) { return fail(context, error, 'create_promotion'); }
}

export async function onRequestPatch(context) {
  try {
    const result = await auth(context, true);
    if (result.error) return denied(result);
    const { original_code, code, title, description, start_date, end_date, is_active } = await context.request.json();
    if (!original_code) return jsonResponse({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, 400);
    const rows = await withDbTransaction(context.env, db => db.query(
      `UPDATE public.promotions SET code = COALESCE($1, code), title = COALESCE($2, title),
       description = COALESCE($3, description), start_date = $4, end_date = $5,
       is_active = COALESCE($6, is_active) WHERE code = $7 RETURNING *`,
      [code ?? null, title ?? null, description ?? null, start_date ?? null, end_date ?? null, is_active ?? null, original_code]));
    return jsonResponse(rows.rows[0] || null);
  } catch (error) { return fail(context, error, 'update_promotion'); }
}

export async function onRequestDelete(context) {
  try {
    const result = await auth(context, true);
    if (result.error) return denied(result);
    const code = new URL(context.request.url).searchParams.get('code');
    if (!code) return jsonResponse({ error: '프로모션 코드와 제목은 필수 항목입니다.' }, 400);
    await withDbTransaction(context.env, db => db.query('DELETE FROM public.promotions WHERE code = $1', [code]));
    return jsonResponse({ success: true });
  } catch (error) { return fail(context, error, 'delete_promotion'); }
}
