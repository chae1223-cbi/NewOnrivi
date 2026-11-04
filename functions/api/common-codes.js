// ====================================================================
// 📊 [OMD-API-commonCodes-0001] functions/api/common-codes.js
// 🎯 @KICK  : 클라이언트(Contact, Dashboard 등) 공통코드 안전 조회 API
// 🛡️ @GUARD : is_use = true 활성 코드만 노출, SQL 파라미터 바인딩, 브라우저 직접 테이블 접근 배제
// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] serverError 연동
// 🚨 @PATCH : 2026-11-02 — 클라이언트 브라우저의 common_codes 직접 조회를 서버 API로 전환
// 🔗 @CALLS : PostgreSQL withDbTransaction, apiJson
// ====================================================================
import { withDbTransaction, apiJson } from './_db.js';
import { serverError } from './_server-error.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, max-age=300',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const groupCode = url.searchParams.get('group_code')?.trim() || null;

    const result = await withDbTransaction(env, async db => {
      if (groupCode) {
        return await db.query(
          `SELECT group_code, code_value, code_name, sort_order
           FROM public.common_codes
           WHERE is_use = true AND group_code = $1
           ORDER BY sort_order ASC, code_value ASC`,
          [groupCode]
        );
      }
      return await db.query(
        `SELECT group_code, code_value, code_name, sort_order
         FROM public.common_codes
         WHERE is_use = true
         ORDER BY group_code ASC, sort_order ASC, code_value ASC`
      );
    });

    return apiJson({ success: true, data: result.rows }, 200, corsHeaders);
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/common-codes.js',
      stage: 'query_common_codes',
      doing: '공통 코드 목록 조회 중',
      target: groupCode || 'ALL',
      message: '공통 코드를 조회할 수 없습니다.'
    });
  }
}
