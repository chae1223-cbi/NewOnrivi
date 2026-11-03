// ====================================================================
// 📊 [OMD-ERR-CORE-0001] functions/api/_error.js
// 🎯 @KICK  : 서버 런타임 및 PostgreSQL 예외에 대한 표준 500 에러 Response 및 진단 로그 생성
// 🛡️ @GUARD : 내부 DB 스택 노출 차단, 추적용 requestId 부여, 헤더 기반 디버깅 메타데이터 주입
// 🚨 @PATCH : 2026-11-03 — [정밀 진단 필드 강화] doing(실행 작업), target(대상), errorMessage/errorStack 추가
// 🚨 @PATCH : 2026-11-02 — [로그 고도화] 구조화 로그 내 functionName('serverError') 추가 및 진단 필드 주석 보강
// 🔗 @CALLS : crypto.randomUUID(), console.error()
// ====================================================================

/**
 * PostgreSQL 표준 5자리 에러 코드 정규식 (예: 23505 고유키 위반, 42P01 테이블 미존재)
 */
const PG_CODE = /^[0-9A-Z]{5}$/;

/**
 * ========================================================================================
 * 📌 [함수명] serverError
 * 서버 내부 에러(500) 표준 JSON Response 및 구조화된 진단 로그를 생성합니다.
 *
 * @param {Request} request - 인입된 Fetch API Request 객체 (x-onrivi-request-id 헤더 추출용)
 * @param {any} error - catch 블록에서 포착된 Error 객체 (PostgreSQL 에러 포함)
 * @param {object} context - 에러 컨텍스트 메타데이터 객체
 * @param {string} context.source - 에러가 발생한 컴포넌트/모듈명 (예: 'SUBSCRIPTION_API')
 * @param {string} context.stage - 에러 발생 세부 단계 (예: 'TRANSACTION_EXECUTE')
 * @param {string} [context.message='요청을 처리하지 못했습니다.'] - 클라이언트에 반환할 안전한 사용자 친화적 에러 메시지
 * @returns {Response} HTTP 500 JSON Response 객체 (추적용 메타 헤더 포함)
 *
 * @example
 * try {
 *   await work(client);
 * } catch (error) {
 *   return serverError(request, error, { source: 'USER_API', stage: 'FETCH_PROFILE' });
 * }
 * ========================================================================================
 */
export function serverError(request, error, { source, stage, doing, target, message = '요청을 처리하지 못했습니다.' }) {
  // 요청 추적 식별자 추출 또는 신규 UUID 생성
  const requestId = request.headers.get('x-onrivi-request-id') || crypto.randomUUID();

  // PostgreSQL 표준 5자리 에러 코드 검증 및 추출 (26000, 23505 등)
  const dbCode = typeof error?.code === 'string' && PG_CODE.test(error.code) ? error.code : null;

  // Cloudflare Logpush 및 운영 분석 엔진 연동을 위한 단일 구조화(JSON) 로그 출력
  console.error(JSON.stringify({
    event: 'SERVER_ERROR',        // 이벤트 유형 : 서버 처리 중 예외 발생
    functionName: 'serverError',  // 에러를 핸들링한 공통 함수명
    requestId,                    // 분산 추적용 고유 요청 ID (UUID)
    source,                       // 에러 발생 모듈/도메인
    stage,                        // 에러 발생 세부 실행 단계
    doing: doing || stage,        // 🎯 무엇을 하던 중이었는지 구체적 행위
    target: target || undefined,  // 작업 대상 식별자 (ID, 파일명 등)
    dbCode,                       // 검증된 PostgreSQL 오류 코드 (정상 코드 외 null)
    errorName: typeof error?.name === 'string' ? error.name : 'Error',
    errorMessage: typeof error?.message === 'string' ? error.message : String(error || ''),
    errorStack: typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 5).join('\n') : undefined,
    constraint: typeof error?.constraint === 'string' ? error.constraint : undefined, // DB 제약조건 위반명 (있을 경우만)
  }));

  // 클라이언트 반환용 표준 HTTP 500 JSON 응답 생성 (보안상 DB 스택 은닉)
  return new Response(JSON.stringify({
    success: false,
    code: 'SERVER_ERROR',
    message,
    requestId,
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', // 장애/에러 응답 캐싱 방지
      'X-Error-Source': source,
      'X-Error-Stage': stage,
      ...(dbCode ? { 'X-Error-Db-Code': dbCode } : {}),
    },
  });
}