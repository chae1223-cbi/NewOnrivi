// 🚨 @PATCH : 2026-11-04 — [관리자 권한 해제 즉시 반영] 모든 요청에서 is_active를 DB로 검증하고 30초 권한 캐시를 제거
// 🚨 @PATCH : **2026-11-04** — [관리자 인증 인메모리 30초 캐싱]: 반복 폴링 시 Supabase Auth/DB 부하 및 503 에러 원천 방어
// ====================================================================
// 📊 [OMD-ADMIN-shared-0002] functions/api/admin/_shared.js
// 🎯 @KICK  : 관리자 API 전역 CORS, 공통 응답, 인증/MFA 검증 및 ROOT_ADMIN 보안 헬퍼
// 🛡️ @GUARD : ROOT_ADMIN 환경변수 동적 보호, CORS 보안 헤더 표준화, MFA(aal2) 단계별 검증
// 🚨 @PATCH : 2026-11-02 — [보안 강화] ROOT_ADMIN_EMAIL 환경변수 미설정 시 즉시 에러 발생(Fail-Closed)으로 최상위 관리자 보호막 해제 방어 (규칙 9 준수)
// 🚨 @PATCH : 2026-11-02 — [구조 표준화] corsHeaders 상단 선언 이동, 불변성(Object.freeze) 적용 및 전 함수 표준 JSDoc 적용
// 🚨 @PATCH : 2026-11-02 — [보안 리팩토링] ROOT_ADMIN_EMAIL 하드코딩 제거 및 환경변수(ROOT_ADMIN_EMAIL) 동적 주입 구조로 전환
// 🚨 @PATCH : 2026-11-02 — 로그인 직후 MFA 이전 관리자 권한 사전 확인(allowPreMfa) 파라미터 지원
// 🚨 @PATCH : 2026-11-02 — MFA 이전에도 검증된 토큰의 사용자 ID 일치를 필수로 확인
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js 종속을 제거하고 공통 모듈 _db.js의 withDbTransaction으로 교체
// 🚨 @PATCH : 2026-11-02 — 관리자 권한 조회를 PostgreSQL로 전환하고 기존 error 응답 형식을 보존하는 공통 오류 어댑터를 추가한다.
// ====================================================================

import { withDbTransaction } from '../_db.js';
import { serverError } from '../_server-error.js';
import { API_MESSAGES } from '../_messages.js';
import { DB_CODES } from '../_db-codes.js';

/**
 * ========================================================================================
 * 📌 [상수] corsHeaders
 * 관리자 API 전역 CORS(Cross-Origin Resource Sharing) 허용 헤더 정의
 * 런타임 변조 방지를 위해 불변 객체(Object.freeze)로 관리됩니다.
 * ========================================================================================
 */
export const corsHeaders = Object.freeze({
  'Access-Control-Allow-Origin': '*',                                         // 허용 출처(Origin) : 모든 도메인(*)에서의 교차 출처 API 요청 허용
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',   // 허용 HTTP 메서드 : 리소스 조회(GET), 생성(POST), 수정(PUT/PATCH), 삭제(DELETE) 및 사전 요청(OPTIONS) 허용
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',      // 허용 요청 헤더 : 클라이언트가 전송할 수 있는 커스텀 헤더 (JSON 바디, Bearer 인증 토큰, Supabase 키)
  'Access-Control-Max-Age': '86400',                                          // 프리플라이트 캐시 유효 시간 : 브라우저가 사전 OPTIONS 검증 결과를 캐싱하는 최대 시간 (86400초 = 24시간 동안 재검증 생략)
});

/**
 * ========================================================================================
 * [함수명] handleOptions - CORS Preflight(사전 검증) OPTIONS 요청에 대한 200 OK 응답을 생성합니다.
 *
 * @param {Request} request - 인입된 Fetch API Request 객체
 * @returns {Response} CORS 허용 헤더가 포함된 빈 Body의 Response 객체
 * ==========================================================================================
 */
export async function handleOptions(request) {
  return new Response(null, { headers: corsHeaders });
}

/**
 * ========================================================================================
 * [함수명] jsonResponse - 관리자 API 표준 JSON Response 응답을 생성합니다.
 * CORS 헤더를 기본 탑재하며, 전달된 데이터와 HTTP 상태 코드를 기반으로 응답합니다.
 *
 * @param {any} data - JSON 직렬화 대상 데이터 객체
 * @param {number} [status=200] - HTTP 응답 상태 코드 (기본값: 200)
 * @returns {Response} Fetch API 표준 Response 객체
 * ==========================================================================================
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * ========================================================================================
 * [함수명] getRootAdminEmail - 환경변수에서 최상위 관리자 이메일을 추출하고 필수 설정을 검증합니다.
 * 미설정 시 조용히 넘어가지 않고 명확한 에러를 발생시켜 최고 관리자 보호 해제 사고를 원천 방어합니다 (규칙 9).
 *
 * @param {object} [env] - Cloudflare Worker Environment (ROOT_ADMIN_EMAIL 바인딩)
 * @returns {string} 최상위 관리자 이메일
 * @throws {Error} ROOT_ADMIN_EMAIL 환경변수가 누락되었거나 비어있는 경우
 * ==========================================================================================
 */
export function getRootAdminEmail(env) {
  const email = env?.ROOT_ADMIN_EMAIL || (typeof process !== 'undefined' ? process.env?.ROOT_ADMIN_EMAIL : '') || '';
  if (!email) {
    throw new Error('❌ ROOT_ADMIN_EMAIL 환경변수가 설정되어 있지 않습니다. 서버 환경설정을 확인해 주세요.');
  }
  return email;
}

/**
 * 하위 호환성을 위한 ROOT_ADMIN_EMAIL getter 상수
 */
export const ROOT_ADMIN_EMAIL = typeof process !== 'undefined' ? (process.env?.ROOT_ADMIN_EMAIL || '') : '';

/**
 * ========================================================================================
 * [함수명] isRootAdmin - 주어진 이메일이 환경변수에 설정된 최상위 관리자(ROOT_ADMIN)인지 대소문자 무관 비교합니다.
 * 환경변수 미설정 시 즉시 예외를 발생시켜 Fail-Safe하게 관리자 권한을 보호합니다.
 *
 * @param {string} email - 검증 대상 관리자 이메일 주소
 * @param {object} [env] - Cloudflare Worker Environment (ROOT_ADMIN_EMAIL 바인딩 전달용)
 * @returns {boolean} 최상위 관리자 일치 여부
 * @throws {Error} ROOT_ADMIN_EMAIL 환경변수 미설정 시
 * ==========================================================================================
 */
export function isRootAdmin(email, env) {
  if (!email) return false;
  const rootEmail = getRootAdminEmail(env);
  return String(email).trim().toLowerCase() === String(rootEmail).trim().toLowerCase();
}

/**
 * ========================================================================================
 * [함수명] adminServerError - 관리자 API 내부 오류(500) 표준 JSON Response 및 진단 로그를 생성합니다.
 *
 * @param {Request} request - 인입된 Fetch API Request 객체
 * @param {any} error - catch 블록에서 포착된 Error 객체
 * @param {string} source - 오류 발생 모듈/파일 경로
 * @param {string} stage - 오류 발생 세부 작업 단계
 * @returns {Promise<Response>} 표준 500 JSON Response 객체
 * ==========================================================================================
 */
export async function adminServerError(request, error, source, stage) {
  const response = serverError(request, error, {
    source,
    stage,
    message: API_MESSAGES.DATABASE_ERROR.message,
  });
  const body = await response.json();
  return new Response(JSON.stringify({ ...body, error: body.message, code: API_MESSAGES.DATABASE_ERROR.code }), {
    status: response.status,
    headers: response.headers,
  });
}

/**
 * ========================================================================================
 * [함수명] getSupabaseConfig - 환경변수에서 Supabase Auth(인증/계정 관리) REST 통신용 URL 및 Service Role Key 설정을 검증하고 추출합니다.
 *
 * @param {object} env - Cloudflare Worker Environment 바인딩 객체
 * @returns {{ supabaseUrl: string, supabaseServiceKey: string, headers: object }} Supabase 통신 설정 객체
 * @throws {Error} 필수 환경변수가 누락된 경우 예외 발생
 * ==========================================================================================
 */
export function getSupabaseConfig(env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';                  // 환경정보의 수파베이스 주소
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';          // 환경정보의 수파베이스 서비스 롤 비밀키

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('❌ Supabase 관리자 환경변수(NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY)가 설정되어 있지 않습니다.');
  }

  return {
    supabaseUrl,                                          // 수파베이스 주소
    supabaseServiceKey,                                   // 수파베이스 키
    headers: {
      'apikey': supabaseServiceKey,                       // 헤더 - 수파베이스 API 게이트웨이 인증키
      'Authorization': `Bearer ${supabaseServiceKey}`,    // 헤더 - 관리자 Service Role 소지자(Bearer) 인증 토큰
      'Content-Type': 'application/json',                 // 헤더 - 요청 본문 JSON 타입 지정
      'Accept': 'application/json',                       // 헤더 - 수신 응답 JSON 타입 지정
    },
  };
}

/**
 * ========================================================================================
 * [함수명] checkAdminAuth - 관리자 토큰의 서명, 만료, MFA 단계 및 PostgreSQL 관리자 권한(Role)을 종합 검증합니다.
 *
 * [3단계 검증 프로세스]:
 * 1. [1차 토큰 검증] Supabase Auth REST(/auth/v1/user)로 로그인 토큰 위조/만료 여부 및 유저 식별
 * 2. [2차 인증 검증] JWT 페이로드 디코딩으로 Google OTP 등 2차 인증 완료(aal2) 여부 검사
 * 3. [관리자 권한 검증] PostgreSQL admins 테이블의 활성 상태와 허용된 권한 등급(SUPER, SUPPORT) 확인
 *
 * @param {Request} request - 인입된 Fetch API Request 객체
 * @param {object} env - Cloudflare Worker Environment 바인딩 객체
 * @param {string[]} [requiredRoles=[DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT]] - 엔드포인트 접근에 허용된 관리자 역할 목록
 * @param {boolean} [allowPreMfa=false] - 로그인 직후 OTP 설정 전 단계에서의 임시 허용 여부
 * @returns {Promise<{ user?: object, adminData?: object, error?: string, status?: number }>} 검증 성공 시 유저 및 관리자 데이터 반환, 실패 시 error/status 반환
 * ==========================================================================================
 */

export async function checkAdminAuth(
  request,
  env,
  requiredRoles = [DB_CODES.ADMIN_ROLE.SUPER, DB_CODES.ADMIN_ROLE.SUPPORT],
  allowPreMfa = false
) {
  // 1. 요청 헤더에서 Authorization 추출
  const authHeader = request.headers.get('Authorization');                         // 클라이언트 HTTP Authorization 헤더 읽기
  if (!authHeader) return { error: API_MESSAGES.UNAUTHORIZED.code, status: 401 };  // 헤더 누락 시 401 미인증 오류 반환

  // 2. 'Bearer <token>' 정규식 파싱으로 순수 JWT 토큰만 추출
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];                         // Bearer 접두어 제거 및 순수 JWT 문자열 추출
  if (!token) return { error: API_MESSAGES.UNAUTHORIZED.code, status: 401 };       // 토큰 포맷이 비정상이면 401 오류 반환


  const { supabaseUrl, headers: serviceHeaders } = getSupabaseConfig(env);         // Supabase API 통신용 URL 및 Service Role 키 조회

  // 3. [1단계] Supabase Auth 서버에 토큰 유효성 검증 및 유저 프로필 조회
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',                                                                 // 사용자 정보 조회 GET 요청
    headers: {
      'apikey': serviceHeaders.apikey,                                             // Supabase 게이트웨이 프로젝트 식별 키
      'Authorization': `Bearer ${token}`,                                          // 검증 대상 관리자의 로그인 JWT 액세스 토큰
    },
  });

  if (!userResp.ok) {                                                              // 토큰 만료 또는 서명 위조 시 401 미인증 처리
    return { error: API_MESSAGES.UNAUTHORIZED.code, status: 401 };
  }
  
  const user = await userResp.json();                                              // 인증 서버가 공인한 유저 정보 추출
  
  // 4. [2단계] JWT 페이로드 디코딩 및 MFA 2차 인증(aal2) 달성 여부 검증
  let payload;
  try {
    payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); // Base64URL 디코딩
  } catch {
    return { error: API_MESSAGES.UNAUTHORIZED.code, status: 401 };                 // JWT 본문 파싱 실패 시 401 반환
  }

  // 토큰 소유자 불일치 방어 및 MFA(Authenticator Assurance Level 2) 완료 여부 검증
  if (payload.sub !== user.id || (!allowPreMfa && payload.aal !== 'aal2')) {
    return { error: 'MFA authentication required', status: 403 };                  // 2차 OTP 인증 미완료 시 403 차단
  }

  // 5. [3단계] PostgreSQL 데이터베이스 admins 테이블에서 실제 관리자 권한(Role) 확인
  const adminRows = (await withDbTransaction(env, db => db.query(
    'SELECT admin_role, is_active FROM public.admins WHERE user_id = $1 LIMIT 1', [user.id]
  ))).rows;
  const adminData = adminRows && adminRows.length > 0 ? adminRows[0] : null;

  // 관리자 명단에 없거나 허용된 Role(SUPER/SUPPORT)이 아니면 인가 거부
  if (!adminData || !adminData.is_active || !requiredRoles.includes(adminData.admin_role)) {
    return { error: API_MESSAGES.FORBIDDEN.code, status: 403 };                    // 권한 등급 미달 시 403 차단
  }

  // 모든 3단계 검증 통과 시 유저 및 관리자 메타데이터 반환
  return { user, adminData };
}
