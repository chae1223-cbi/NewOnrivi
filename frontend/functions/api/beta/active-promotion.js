// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 현재 프로모션 조회를 PostgreSQL로 통일하고 실패를 공통 오류로 기록한다.
import { withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';
import { API_MESSAGES } from '../_messages.js';

export async function onRequestOptions() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Content-Type': 'application/json'
  };

  try {
    const result = await withDbTransaction(env, db => db.query(`
      SELECT code, title, description, end_date FROM public.promotions
      WHERE is_active = true AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
      ORDER BY created_at DESC LIMIT 1
    `));
    const promotion = result.rows[0] || null;
    return new Response(JSON.stringify({ promotion }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/beta/active-promotion.js', stage: 'active_promotion', message: API_MESSAGES.DATABASE_ERROR.message,
    });
  }
}
