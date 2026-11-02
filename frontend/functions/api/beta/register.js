// 🚨 @PATCH : 2026-11-02 — 3순위 DB 처리 표준화: 공통 _db.js(withDbTransaction) 적용
// 🚨 @PATCH : 2026-11-02 — 베타 등록을 PostgreSQL 트랜잭션으로 전환하고 중복 등록·서버 오류를 구분한다.
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

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Content-Type': 'application/json'
  };

  try {
    const { email, promotion_code } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ success: false, message: '유효한 이메일 주소를 입력해주세요.' }), { status: 400, headers: corsHeaders });
    }
    if (!promotion_code) {
      return new Response(JSON.stringify({ success: false, message: '유효하지 않은 프로모션입니다.' }), { status: 400, headers: corsHeaders });
    }

    await withDbTransaction(env, db => db.query(
      'INSERT INTO public.promotion_subscribers (email, promotion_code) VALUES ($1, $2)',
      [email, promotion_code]
    ));

    return new Response(JSON.stringify({ success: true, message: '사전 등록이 완료되었습니다.' }), { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error?.code === '23505') {
      return new Response(JSON.stringify({ success: false, message: '이미 사전 등록된 이메일입니다!' }), { status: 409, headers: corsHeaders });
    }
    return serverError(request, error, {
      source: 'functions/api/beta/register.js', stage: 'register_beta', message: API_MESSAGES.DATABASE_ERROR.message,
    });
  }
}
