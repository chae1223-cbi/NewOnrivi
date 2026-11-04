// ====================================================================
// 📊 [OMD-AUTH-check-session-0002] functions/api/license/check-session.js
// 🎯 @KICK  : 데스크탑/웹 세션 유효성 검증
// 🛡️ @GUARD : 공통 모듈 _db.js의 withDbTransaction을 활용한 단일 연결 및 타임아웃 안전 보장
// 🚨 @PATCH : 2026-11-04 — [공통 진단 로깅 연계] serverError 및 4xx [ClientWarn] 사전 로깅 연동
// 🚨 @PATCH : 2026-11-02 — [3순위 표준화] 독자적인 pg.Client 생성 제거 및 공통 모듈 withDbTransaction으로 일원화
// 🔗 @CALLS : functions/api/_db.js (withDbTransaction)
// ====================================================================
import { withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';
import { sessionUser } from './_sessionAuth.js';
import { checkSession } from './_session.js';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const onRequestOptions = () => new Response(null, { headers });

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await sessionUser(request, env);
    if (request.headers.has('Authorization') && !user) {
      console.warn('[ClientWarn] HTTP 401 · UNAUTHORIZED · 세션 인증 실패 [경로: /api/license/check-session]');
      return new Response(JSON.stringify({ success: false, code: 'UNAUTHORIZED' }), { status: 401, headers });
    }

    const result = await withDbTransaction(env, async db => {
      return await checkSession(body, user, async (text, params) => {
        const queryRes = await db.query(text, params);
        return queryRes.rows;
      });
    });

    return new Response(JSON.stringify(result.data), { status: result.status, headers });
  } catch (error) {
    return serverError(request, error, {
      source: 'functions/api/license/check-session.js',
      stage: 'check_device_session',
      doing: '기기 접속 세션 유효성 검증 중',
      target: user?.id || 'SESSION',
      message: '세션 검증 중 문제가 발생했습니다.'
    });
  }
}
