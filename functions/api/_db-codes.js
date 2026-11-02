// ====================================================================
// 📊 [OMD-CODE-CONST-0001] functions/api/_db-codes.js
// 🎯 @KICK  : DB 스키마 컬럼 및 모듈 통신에 사용되는 전역 공통 코드/상수 정의
// 🛡️ @GUARD : DB 저장 및 통신 코드값 영문 대문자 통일(AGENTS.md 규칙 2), Object.freeze 불변성 보장
// 🚨 @PATCH : 2026-11-02 — [공통코드 전면 확장] DB(common_codes)와 100% 일치하도록 전체 코드 그룹 및 상수 완전체 정의
// 🚨 @PATCH : 2026-11-02 — [표준 주석화] 구분선(=) 및 상세 JSDoc 표준 적용
// 🔗 @TABLES: common_code_groups, common_codes, subscriptions, users, support_inquiries, payment_logs, user_audit_logs
// ====================================================================

/**
 * ========================================================================================
 * 📌 [상수그룹] DB_CODES
 * 시스템 전역에서 공유하는 PostgreSQL ENUM 및 공통 코드 매핑 상수
 * 런타임 변조 방지를 위해 깊은 불변 객체(Deep Frozen Object)로 관리됩니다.
 *
 * [주요 코드 그룹]:
 * - CODE_GROUP: DB 공통 코드 마스터 그룹 식별자
 * - PLAN_NAME: 요금제 플랜 유형 (FREE, BASIC, PRO, PREMIUM, READER, APPRENTICE, REGULAR, ELITEPRO)
 * - PLAN_STATUS: 회원 구독 상태 (ACTIVE, CANCELED, EXPIRED)
 * - BILLING_CYCLE: 결제 주기 (MONTHLY, YEARLY)
 * - SYS_TYPE: 플랫폼/시스템 환경 (WEB, DESKTOP, MIX_SYSTEM)
 * - ADMIN_ROLE: 관리자 권한 등급 (SUPER, SUPPORT)
 * - INQUIRY_TYPE: 고객 문의 분류 유형 (GENERAL, BILLING, TECH, SUGGESTION)
 * - INQUIRY_STATUS: 고객 문의 처리 진행 상태 (PENDING, IN_PROGRESS, RESOLVED)
 * - PAYMENT_STATUS: 결제 트랜잭션 상태 (SUCCESS, FAILED, PENDING, CANCELED)
 * - AUTH_PROVIDER: 계정 인증 제공자 (EMAIL, GOOGLE)
 * - BLOG_CATEGORY: 블로그 카테고리 (ONRIVI_INTRO, ONRIVI_TECH, USER_USE)
 * - AUDIT_ACTION: 보안 및 감사 액션 유형 (PLAN_CHANGE, KILL_SESSION, SUSPEND, UNBAN 등)
 * ==========================================================================================
 */
export const DB_CODES = Object.freeze({
  /**
   * [그룹코드] CODE_GROUP - 시스템 공통 코드 마스터 그룹 식별자
   */
  CODE_GROUP: Object.freeze({
    PLAN_NAME: 'PLAN_NAME',
    PLAN_STATUS: 'PLAN_STATUS',
    BILLING_CYCLE: 'BILLING_CYCLE',
    SYS_TYPE: 'SYS_TYPE',
    ADMIN_ROLE: 'ADMIN_ROLE',
    INQUIRY_TYPE: 'INQUIRY_TYPE',
    INQUIRY_STATUS: 'INQUIRY_STATUS',
    PAYMENT_STATUS: 'PAYMENT_STATUS',
    AUTH_PROVIDER: 'AUTH_PROVIDER',
    BLOG_CATEGORY: 'BLOG_CATEGORY',
    AUDIT_ACTION: 'AUDIT_ACTION',
  }),

  /**
   * [그룹코드] PLAN_NAME - 요금제 플랜 유형 코드
   */
  PLAN_NAME: Object.freeze({
    FREE: 'FREE',
    BASIC: 'BASIC',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
    READER: 'READER',
    APPRENTICE: 'APPRENTICE',
    REGULAR: 'REGULAR',
    ELITEPRO: 'ELITEPRO',
  }),

  /**
   * [그룹코드] PLAN_STATUS - 구독 플랜 활성 상태 코드
   */
  PLAN_STATUS: Object.freeze({
    ACTIVE: 'ACTIVE',
    CANCELED: 'CANCELED',
    EXPIRED: 'EXPIRED',
  }),

  /**
   * [그룹코드] BILLING_CYCLE - 요금제 결제 주기 코드
   */
  BILLING_CYCLE: Object.freeze({
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
  }),

  /**
   * [그룹코드] SYS_TYPE - 시스템 플랫폼 및 실행 환경 타입
   */
  SYS_TYPE: Object.freeze({
    WEB: 'WEB',
    DESKTOP: 'DESKTOP',
    MIX_SYSTEM: 'MIX_SYSTEM',
  }),

  /**
   * [그룹코드] ADMIN_ROLE - 관리자 권한 등급 코드
   */
  ADMIN_ROLE: Object.freeze({
    SUPER: 'SUPER',
    SUPPORT: 'SUPPORT',
  }),

  /**
   * [그룹코드] INQUIRY_TYPE - 1:1 고객 문의 분류 유형
   */
  INQUIRY_TYPE: Object.freeze({
    GENERAL: 'GENERAL',
    BILLING: 'BILLING',
    TECH: 'TECH',
    SUGGESTION: 'SUGGESTION',
  }),

  /**
   * [그룹코드] INQUIRY_STATUS - 1:1 고객 문의 처리 진행 상태
   */
  INQUIRY_STATUS: Object.freeze({
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
  }),

  /**
   * [그룹코드] PAYMENT_STATUS - 결제 트랜잭션 처리 상태
   */
  PAYMENT_STATUS: Object.freeze({
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    PENDING: 'PENDING',
    CANCELED: 'CANCELED',
  }),

  /**
   * [그룹코드] AUTH_PROVIDER - 계정 인증 제공자 유형
   */
  AUTH_PROVIDER: Object.freeze({
    EMAIL: 'EMAIL',
    GOOGLE: 'GOOGLE',
  }),

  /**
   * [그룹코드] BLOG_CATEGORY - 블로그 게시글 분류 카테고리
   */
  BLOG_CATEGORY: Object.freeze({
    ONRIVI_INTRO: 'ONRIVI_INTRO',
    ONRIVI_TECH: 'ONRIVI_TECH',
    USER_USE: 'USER_USE',
  }),

  /**
   * [그룹코드] AUDIT_ACTION - 관리자 및 사용자 보안 감사 액션 코드
   */
  AUDIT_ACTION: Object.freeze({
    PLAN_CHANGE: 'PLAN_CHANGE',
    KILL_SESSION: 'KILL_SESSION',
    SUSPEND: 'SUSPEND',
    UNBAN: 'UNBAN',
    ADMIN_INVITE: 'ADMIN_INVITE',
    ADMIN_ROLE_CHANGE: 'ADMIN_ROLE_CHANGE',
    ADMIN_REVOKE: 'ADMIN_REVOKE',
    USER_WITHDRAW: 'USER_WITHDRAW',
    USER_DELETE: 'USER_DELETE',
  }),
});
