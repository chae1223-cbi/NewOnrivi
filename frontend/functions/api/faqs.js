// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — FAQ 조회·등록을 PostgreSQL로 통일하고 공통 오류 추적을 적용한다.
import { jsonResponse, handleOptions, checkAdminAuth, adminServerError } from './admin/_shared.js';
import { withDbTransaction } from './_db.js';
import { DB_CODES } from './_db-codes.js';

export const onRequestOptions = handleOptions;

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const isAdmin = url.searchParams.get('admin') === 'true';
    if (isAdmin) {
      const auth = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
      if (auth.error) return jsonResponse({ error: auth.error }, auth.status);
    }

    const result = await withDbTransaction(env, db => db.query(
      isAdmin
        ? 'SELECT * FROM public.faqs ORDER BY sort_order ASC'
        : 'SELECT * FROM public.faqs WHERE is_active = true ORDER BY sort_order ASC'
    ));
    return jsonResponse(result.rows);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/faqs.js', 'list_faqs');
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // admin/_shared.js의 checkAdminAuth를 통해 토큰 확인
    const authResult = await checkAdminAuth(request, env, [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]);
    if (authResult.error) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    const body = await request.json();
    
    const { question, answer, is_active, sort_order } = body;
    if (!question || !answer) {
      return jsonResponse({ error: 'Question and answer are required' }, 400);
    }

    const result = await withDbTransaction(env, db => db.query(`
      INSERT INTO public.faqs (question, answer, is_active, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [question, answer, is_active ?? true, sort_order ?? 999, authResult.user.id]));
    return jsonResponse(result.rows[0] || null);
  } catch (error) {
    return adminServerError(context.request, error, 'functions/api/faqs.js', 'create_faq');
  }
}
