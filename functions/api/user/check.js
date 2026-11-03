// ====================================================================
// 📊 [OMD-API-userCheck-0001] functions/api/user/check.js ➔ onRequestPost
// 🎯 @KICK  : 이메일 또는 유저 UUID를 받아 users 테이블에서 회원 존재 여부 및 탈퇴 상태를 단일 쿼리로 사전 검증
// 🛡️ @GUARD : 이메일과 UUID 둘 다 누락 시 400 거절, SQL 매개변수 바인딩($1)으로 인젝션 차단, 단일 원트랜잭션(withDbTransaction) 적용
// 🚨 @PATCH : **2026-11-02** — [소스 주석 표준화] 표준 OMD 블록 주석 및 PostgreSQL 트랜잭션 쿼리 라인별 상세 해설 주석 추가
// 🚨 @PATCH : 2026-11-02 — [3순위 DB 처리 표준화] Supabase REST 종속을 제거하고 공통 _db.js의 withDbTransaction(PostgreSQL 직접 연결) 적용
// 🔗 @CALLS : withDbTransaction (PostgreSQL public.users)
// ====================================================================

import { withDbTransaction } from '../_db.js';

// ========================================================================================
// 🌐 CORS 및 보안 응답 헤더 설정
// ========================================================================================
const cors = {
  'Access-Control-Allow-Origin': '*',                              // 모든 오리진 허용 (브라우저 간 통신 지원)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',                 // 허용할 HTTP 메서드 (조회 POST, 사전 요청 OPTIONS)
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',   // 클라이언트가 보낼 수 있는 헤더 목록
  'Content-Type': 'application/json',                              // JSON 데이터 응답 명시
  'Cache-Control': 'no-store',                                     // 브라우저 및 프록시 캐시 방지 (항상 최신 DB 상태 조회)
};

/**
 * 표준 JSON HTTP Response 객체를 생성하는 헬퍼 함수
 * @param {object} body - 응답 본문 JSON 객체
 * @param {number} [status=200] - HTTP 상태 코드 (기본값: 200 OK)
 * @returns {Response}
 */
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

/**
 * ========================================================================================
 * onRequestOptions
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   브라우저의 CORS Preflight(사전 요청) OPTIONS 호출에 대해 200 빈 응답을 반환하여 본 요청을 허용합니다.
 * 📤 @returns {Response} 200 OK 빈 응답
 * ========================================================================================
 */
export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

/**
 * ========================================================================================
 * onRequestPost
 * ----------------------------------------------------------------------------------------
 * 🎯 목적:
 *   전달받은 이메일(p_email) 또는 유저 ID(p_id)를 기준으로 PostgreSQL public.users 테이블을 조회하여
 *   1) 해당 회원이 가입되어 있는지 (exists: true/false)
 *   2) 이미 탈퇴 처리된 계정인지 (is_deleted: true/false)
 *   3) 로그인 제공자(provider) 및 닉네임 정보를 안전하게 반환합니다.
 * 
 * 📥 매개변수:
 *   - @param {object} context
 *   - @param {Request} context.request - 클라이언트의 HTTP 요청 (body: { p_email, p_id })
 *   - @param {object} context.env - Cloudflare 환경변수 (DB 연결 정보 등)
 * 
 * 📤 반환값:
 *   - @returns {Promise<Response>} 
 *     - 회원 존재 시: { exists: true, id, email, nick_name, provider, is_deleted, ... }
 *     - 회원 미존재: { exists: false, is_deleted: false }
 *     - 필수값 누락: 400 Bad Request
 *     - DB 에러: 500 Internal Server Error ({ exists: false, code: 'DB_ERROR' })
 * 
 * ⚠️ 주의사항:
 *   - SQL 인젝션 방지를 위해 사용자 입력값을 SQL 문자열에 직접 넣지 않고 반드시 파라미터 바인딩($1)을 사용합니다.
 *   - 대소문자 구분을 없애기 위해 이메일은 trim() 및 lower()를 적용하여 비교합니다.
 * ========================================================================================
 */
export async function onRequestPost({ request, env }) {
  try {
   
    const { p_email, p_id } = await request.json();          // 1. [요청 본문 파싱] 클라이언트가 보낸 JSON에서 이메일과 유저 ID 추출
    const email = typeof p_email === 'string' ? p_email.trim().toLowerCase() : '';   // 2. [입력값 정규화] 이메일 공백 제거 및 소문자 정규화

    // 3. [UUID 형식 검증] p_id가 전달된 경우 표준 36자리 UUID 형식인지 정규표현식 검사
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const byId = uuid.test(p_id || '');

    // 4. [필수값 방어] 이메일도 없고 유효한 UUID도 없으면 400 Bad Request 반환
    if (!email && !byId) {
      return reply({ exists: false, is_deleted: false }, 400);
    }

    // 5. [PostgreSQL 직접 트랜잭션 쿼리]
    // 공통 모듈 _db.js의 withDbTransaction을 사용하여 PostgreSQL 풀에서 커넥션을 획득하고 단일 쿼리 실행
    const user = await withDbTransaction(env, async (db) => {
      // 💡 보안: WHERE 절의 값은 무조건 $1 파라미터 바인딩을 사용하여 SQL 인젝션을 원천 차단
      const result = await db.query(`
        SELECT id, email, nick_name, provider, created_at, updated_at, is_deleted
        FROM public.users
        WHERE ${byId ? 'id = $1' : 'lower(email) = $1'}
        LIMIT 1`, [byId ? p_id : email]);

      // 조회된 첫 번째 행 반환 (없으면 undefined)
      return result.rows[0];
    });

    // 6. [성공 응답 반환] 회원이 존재하면 상세 정보 병합 반환, 없으면 exists: false 반환
    return reply(user ? { exists: true, ...user } : { exists: false, is_deleted: false });

  } catch (error) {
    // 7. [예외 처리] DB 연결 오류 또는 서버 장애 시 에러 로그 기록 후 500 에러 반환
    console.error('[/api/user/check] failed', error);
    return reply({ exists: false, code: 'DB_ERROR', message: '회원 정보를 확인할 수 없습니다.' }, 500);
  }
}
