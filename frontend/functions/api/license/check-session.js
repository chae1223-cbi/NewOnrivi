// ====================================================================
// 📊 [OMD-AUTH-check-session-0002] frontend/functions/api/license/check-session.js
// 🎯 @KICK  : 데스크탑/웹 세션 유효성 검증
// 🛡️ @GUARD : 공통 모듈 _db.js의 withDbTransaction을 활용한 단일 연결 및 타임아웃 안전 보장
// 🚨 @PATCH : 2026-11-02 — [3순위 표준화] 독자적인 pg.Client 생성 제거 및 공통 모듈 withDbTransaction으로 일원화
// 🔗 @CALLS : frontend/functions/api/_db.js (withDbTransaction)
// ====================================================================
import { withDbTransaction } from '../_db.js';
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
      return new Response(JSON.stringify({ success: false, code: 'UNAUTHORIZED' }), { status: 401, headers });
    }

    const result = await withDbTransaction(env, async db => {
      return await checkSession(body, user, async (text, params) => {
        const queryRes = await db.query(text, params);
        return queryRes.rows;
      });
    });

    return new Response(JSON.stringify(result.data), { status: result.status, headers });
  } catch {
    return new Response(JSON.stringify({ success: false, code: 'SESSION_CHECK_FAILED' }), { status: 503, headers });
  }
}
