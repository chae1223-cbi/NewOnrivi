// ====================================================================
// 📊 [OMD-CODE-CONST-0002] frontend/src/constants/dbCodes.ts
// 🎯 @KICK  : Next.js 프론트엔드 및 서버 컴포넌트 전역 공통 코드/상수 정의
// 🛡️ @GUARD : DB 저장 및 통신 코드값 영문 대문자 통일(AGENTS.md 규칙 2), as const 리터럴 타입 추론 보장
// 🚨 @PATCH : 2026-11-02 — [공통코드 전면 확장] DB(common_codes)와 100% 일치하도록 전체 코드 그룹 및 상수 완전체 정의
// 🚨 @PATCH : 2026-11-02 — 기존 DB 코드값의 Next 서버 공통 상수를 정의한다.
// ====================================================================

/**
 * ========================================================================================
 * 📌 [상수그룹] DB_CODES
 * 프론트엔드/Next.js 환경에서 공유하는 PostgreSQL ENUM 및 공통 코드 매핑 상수
 * TypeScript의 'as const'를 통해 완전한 리터럴 타입 및 불변성을 제공합니다.
 * ========================================================================================
 */
export const DB_CODES = {
  /**
   * [그룹코드] CODE_GROUP - 시스템 공통 코드 마스터 그룹 식별자
   */
  CODE_GROUP: {
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
  },

  /**
   * [그룹코드] PLAN_NAME - 요금제 플랜 유형 코드
   */
  PLAN_NAME: {
    FREE: 'FREE',
    BASIC: 'BASIC',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
    READER: 'READER',
    APPRENTICE: 'APPRENTICE',
    REGULAR: 'REGULAR',
    ELITEPRO: 'ELITEPRO',
  },

  /**
   * [그룹코드] PLAN_STATUS - 구독 플랜 활성 상태 코드
   */
  PLAN_STATUS: {
    ACTIVE: 'ACTIVE',
    CANCELED: 'CANCELED',
    EXPIRED: 'EXPIRED',
  },

  /**
   * [그룹코드] BILLING_CYCLE - 요금제 결제 주기 코드
   */
  BILLING_CYCLE: {
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
  },

  /**
   * [그룹코드] SYS_TYPE - 시스템 플랫폼 및 실행 환경 타입
   */
  SYS_TYPE: {
    WEB: 'WEB',
    DESKTOP: 'DESKTOP',
    MIX_SYSTEM: 'MIX_SYSTEM',
  },

  /**
   * [그룹코드] ADMIN_ROLE - 관리자 권한 등급 코드
   */
  ADMIN_ROLE: {
    SUPER: 'SUPER',
    SUPPORT: 'SUPPORT',
  },

  /**
   * [그룹코드] INQUIRY_TYPE - 1:1 고객 문의 분류 유형
   */
  INQUIRY_TYPE: {
    GENERAL: 'GENERAL',
    BILLING: 'BILLING',
    TECH: 'TECH',
    SUGGESTION: 'SUGGESTION',
  },

  /**
   * [그룹코드] INQUIRY_STATUS - 1:1 고객 문의 처리 진행 상태
   */
  INQUIRY_STATUS: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
  },

  /**
   * [그룹코드] PAYMENT_STATUS - 결제 트랜잭션 처리 상태
   */
  PAYMENT_STATUS: {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    PENDING: 'PENDING',
    CANCELED: 'CANCELED',
  },

  /**
   * [그룹코드] AUTH_PROVIDER - 계정 인증 제공자 유형
   */
  AUTH_PROVIDER: {
    EMAIL: 'EMAIL',
    GOOGLE: 'GOOGLE',
  },

  /**
   * [그룹코드] BLOG_CATEGORY - 블로그 게시글 분류 카테고리
   */
  BLOG_CATEGORY: {
    ONRIVI_INTRO: 'ONRIVI_INTRO',
    ONRIVI_TECH: 'ONRIVI_TECH',
    USER_USE: 'USER_USE',
  },

  /**
   * [그룹코드] AUDIT_ACTION - 관리자 및 사용자 보안 감사 액션 코드
   */
  AUDIT_ACTION: {
    PLAN_CHANGE: 'PLAN_CHANGE',
    KILL_SESSION: 'KILL_SESSION',
    SUSPEND: 'SUSPEND',
    UNBAN: 'UNBAN',
    ADMIN_INVITE: 'ADMIN_INVITE',
    ADMIN_ROLE_CHANGE: 'ADMIN_ROLE_CHANGE',
    ADMIN_REVOKE: 'ADMIN_REVOKE',
    USER_WITHDRAW: 'USER_WITHDRAW',
    USER_DELETE: 'USER_DELETE',
  },
} as const;

export type DbCodes = typeof DB_CODES;
