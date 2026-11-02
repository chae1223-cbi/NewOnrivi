// ====================================================================
// 📊 [OMD-DB-CONN-0001] frontend/src/lib/db.ts
// 🎯 @KICK  : 서버 사이드(Next.js Server Actions / API Routes) 전역 Postgres 연결 풀 인스턴스 초기화
// 🛡️ @GUARD : Supabase Transaction Pooler(PgBouncer:6543) 환경 26000 에러(prepared statement not exist) 방어 및 유휴 커넥션 자동 회수
// 🚨 @PATCH : 2026-11-02 — [표준 주석화] OnriviAuthor 공통 라이브러리 주석 표준화 지침 적용 및 커넥션 옵션 명세화
// 🔗 @CALLS : postgres (Postgres.js Client)
// ====================================================================

import postgres from 'postgres';

/**
 * 데이터베이스 연결 엔드포인트 URI
 * Supabase 대시보드에서 제공하는 Transaction Pooler URI(포트 6543)가 설정되어야 합니다.
 * 형식: postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:6543/postgres
 */
const connectionString = process.env.DATABASE_URL || '';

// 환경 변수 누락 시 서버 사이드 기동 및 트랜잭션 실패 사전 경고 로그 출력
if (!connectionString) {
  console.warn('⚠️ DATABASE_URL is not defined in environment variables. Database transactions will fail.');
}

/**
 * 전역 단일 PostgreSQL 클라이언트 인스턴스 (Postgres.js)
 *
 * @property {boolean} prepare - Supabase Transaction Pooler(PgBouncer) 환경에서는 세션 간 Prepared Statement가 공유되지 않으므로 26000 오류 방지를 위해 false 강제
 * @property {number} max - 서버리스/컨테이너 인스턴스당 허용할 최대 풀 커넥션 수 (10개)
 * @property {number} idle_timeout - 유휴 연결을 유지할 최대 시간(초 단위, 20초 후 자동 회수)
 * @property {number} connect_timeout - DB 서버 연결 핸드셰이크 제한 시간(초 단위, 10초 초과 시 에러 반환)
 */
export const sql = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
