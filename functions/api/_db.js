// ====================================================================
// 📊 [OMD-DB-CORE-0001] functions/api/_db.js
// 🎯 @KICK  : Cloudflare Functions 전역 공통 PostgreSQL 원자적 트랜잭션 래퍼 및 유저 인증 헬퍼
// 🛡️ @GUARD : All-or-Nothing 무결성 보장 (단일 커넥션, BEGIN ~ COMMIT / ROLLBACK, 연결 자동 회수)
//             워커 프리징 방어 (statement_timeout 15초, 연결 수립 제한 10초)
//             연결 가속 및 보안 (Cloudflare HYPERDRIVE 1순위 -> DATABASE_URL 직접 연결)
// 🚨 @PATCH : 2026-11-02 — [주석 표준화] 구분선(=) 및 [함수명] 명시 표준 JSDoc 적용
// 🚨 @PATCH : 2026-11-02 — [레거시 제거] 구형 BLOG_DATABASE_URL 및 BLOG_DATABASE_CA_CERT를 완전히 제거하고 HYPERDRIVE 및 DATABASE_URL 단일 표준으로 통일
// 🚨 @PATCH : 2026-11-02 — [공통소스 표준화] blog/_db.js에 종속되어 있던 withBlogTransaction을 공통 모듈 withDbTransaction으로 승격 분리
// 🚨 @PATCH : 2026-11-02 — 연결 실패 시에도 클라이언트 종료를 보장하고 롤백은 시작된 트랜잭션에만 적용
// 🔗 @CALLS : Client.connect(), Client.query(), Client.end(), Supabase Auth API
// ====================================================================

// PostgreSQL 클라이언트 모듈 로드 (Cloudflare Functions / Node 호환 환경)
import { Client } from 'pg';

/**
 * ========================================================================================
 * [함수명] withDbTransaction - 단일 PostgreSQL 연결을 맺고 원자적 트랜잭션(All-or-Nothing)을 실행합니다.
 *
 * [주요 동작 원리]:
 * 1. Cloudflare Hyperdrive 바인딩을 1순위로 확인하여 엣지 글로벌 커넥션 풀링을 활용합니다.
 * 2. Hyperdrive가 없을 경우 환경변수 `DATABASE_URL`을 통해 직접 연결을 수립합니다.
 * 3. `BEGIN` ➔ `statement_timeout = '15s'` ➔ 비즈니스 쿼리(`work`) ➔ `COMMIT` 순서로 원자성을 보장합니다.
 * 4. 오류 발생 시 즉시 `ROLLBACK`을 시도하며, 성공/실패 여부와 무관하게 `finally`에서 커넥션을 100% 회수합니다.
 *
 * @param {object} env - Cloudflare Worker Environment (HYPERDRIVE 바인딩, DATABASE_URL 등)
 * @param {function(Client): Promise<any>} work - 트랜잭션 범위 내에서 실행할 비동기 쿼리 콜백 함수
 * @returns {Promise<any>} work 함수의 실행 결과값
 * @throws {Error} DB 연결 설정 누락, 타임아웃, 또는 트랜잭션 내부 실패 시 에러를 상위로 전파
 *
 * @example
 * const result = await withDbTransaction(env, async (db) => {
 *   const res = await db.query('SELECT id, email FROM public.users WHERE id = $1', [userId]);
 *   return res.rows[0];
 * });
 * ==========================================================================================
 */
export async function withDbTransaction(env, work) {
  // 1. Cloudflare Hyperdrive 연결 문자열 확인 (글로벌 커넥션 풀링 및 캐싱 지원용)
  const hyperdriveUrl = env.HYPERDRIVE?.connectionString;

  // 2. 연결 우선순위: Hyperdrive > 환경변수 DATABASE_URL
  const databaseUrl = hyperdriveUrl || env.DATABASE_URL;

  // 유효한 DB 연결 정보가 없으면 즉각 예외 발생
  if (!databaseUrl) {
    throw new Error('HYPERDRIVE or DATABASE_URL is not configured');
  }

  // 3. PostgreSQL 단일 클라이언트 인스턴스 초기화
  const client = new Client({
    connectionString: databaseUrl,
    // [Hyperdrive 바인딩 처리]
    // Hyperdrive 자체 프록시가 SSL 터널을 관리하므로 클라이언트 레벨 SSL 옵션을 제외합니다.
    // 직접 연결(Direct Connection / Supabase Pooler)일 때만 CA 인증서 옵션을 주입합니다.
    ...(hyperdriveUrl ? {} : {
      ssl: env.DATABASE_CA_CERT
        ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, '\n'), rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    }),
    connectionTimeoutMillis: 10000, // 연결 수립 제한 시간 10초
  });

  let transactionStarted = false;
  try {
    // 연결 단계 오류도 finally에서 정리한다.
    await client.connect();
    // 트랜잭션 시작 (원자성 보장 구간 진입)
    await client.query('BEGIN');
    transactionStarted = true;

    // 롱러닝 쿼리로 인한 워커 프리징 방지를 위해 로컬 세션 타임아웃 15초 설정
    await client.query("SET LOCAL statement_timeout = '15s'");

    // 실제 비즈니스 로직(DB 쿼리들) 수행
    const result = await work(client);

    // 모든 작업 성공 시 변경사항 영구 반영
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // 오류 발생 시 트랜잭션 롤백 시도 (All-or-Nothing 보장)
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // 소켓 끊김이나 세션 강제 종료 상태에서는 PostgreSQL 엔진이 자동으로 롤백하므로 무시
      }
    }
    // 상위 호출자에게 에러를 전파하여 적절한 HTTP 응답을 처리하게 함
    throw error;
  } finally {
    // 성공/실패 여부와 무관하게 반드시 DB 커넥션을 반환 및 해제하여 연결 누수 방지
    await client.end().catch(() => {});
  }
}

/**
 * 하위 호환성을 위한 블로그 트랜잭션 별칭 (withBlogTransaction -> withDbTransaction)
 * 기존 blog/* API 엔드포인트의 무중단 호환성을 위해 유지합니다.
 */
export const withBlogTransaction = withDbTransaction;

/**
 * ========================================================================================
 * [함수명] getAuthUser - HTTP 요청의 Authorization Bearer 토큰을 검증하여 Supabase Auth 유저 정보를 조회합니다.
 *
 * [주요 동작 원리]:
 * 1. Request Header에서 'Authorization: Bearer <token>' 토큰을 추출합니다.
 * 2. 토큰이 누락되었거나 환경변수가 미설정된 경우 즉시 null을 반환합니다.
 * 3. Supabase Auth REST 엔드포인트(/auth/v1/user)로 토큰의 유효성을 조회하여 유저 정보를 반환합니다.
 *
 * @param {Request} request - 인입된 Fetch API Request 객체
 * @param {object} env - Cloudflare Worker Environment 바인딩 객체 (NEXT_PUBLIC_SUPABASE_URL 등)
 * @returns {Promise<object|null>} 유효한 Supabase Auth 유저 객체 또는 인증 실패/토큰 누락 시 null
 *
 * @example
 * const user = await getAuthUser(request, env);
 * if (!user) {
 *   return apiJson({ success: false, error: 'Unauthorized' }, 401);
 * }
 * ==========================================================================================
 */
export async function getAuthUser(request, env) {
  // Authorization 헤더 추출 및 'Bearer ' 접두어 제거
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 토큰 또는 Supabase 필수 키가 누락된 경우 미인증 상태로 간주
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Supabase Auth REST 엔드포인트(/auth/v1/user)로 토큰 유효성 검증 요청
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    },
  });

  // HTTP 200 OK일 경우에만 파싱된 유저 JSON 데이터 반환, 실패(401 등) 시 null
  return response.ok ? response.json() : null;
}

/**
 * 하위 호환성을 위한 블로그 유저 별칭 (getBlogUser -> getAuthUser)
 */
export const getBlogUser = getAuthUser;

/**
 * ========================================================================================
 * [함수명] apiJson - 표준 JSON Response 생성 헬퍼
 * 기본 캐시 방지(Cache-Control: no-store) 및 UTF-8 인코딩이 적용된 일관된 응답 객체를 생성합니다.
 *
 * @param {any} data - 응답 바디로 직렬화할 데이터 (객체 또는 배열)
 * @param {number} [status=200] - HTTP 상태 코드 (기본값: 200)
 * @param {HeadersInit} [extraHeaders={}] - 추가할 커스텀 HTTP 헤더 (CORS 헤더 등)
 * @returns {Response} Fetch API 표준 Response 객체
 *
 * @example
 * return apiJson({ success: true, data: userList });
 * return apiJson({ success: false, error: '잘못된 요청입니다.' }, 400);
 * ==========================================================================================
 */
export function apiJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', // API 응답 캐싱 방지
      ...extraHeaders,
    },
  });
}

/**
 * 하위 호환성을 위한 블로그 JSON 별칭 (blogJson -> apiJson)
 */
export const blogJson = apiJson;
