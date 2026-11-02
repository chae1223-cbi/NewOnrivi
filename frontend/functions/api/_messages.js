// ====================================================================
// 📊 [OMD-API-messages-0001] frontend/functions/api/_messages.js
// 🎯 @KICK  : 백엔드 API 공통 응답 메시지 및 표준 에러 코드 상수 (SSoT)
// 🛡️ @GUARD : 응답 코드 대문자 통일, 사용자 친화적 한국어 안내문, 내부 기술 스택 노출 차단
// 🚨 @PATCH : 2026-11-02 — [메시지 전면 확장] 관리자, 플랜, 고객지원, 계정, 공통코드 등 시스템 전역 표준 메시지 완전체 동기화
// 🚨 @PATCH : 2026-11-01 — 백엔드 전역 시스템 메시지 상수 모듈 신설
// ====================================================================

/**
 * ========================================================================================
 * 📌 [상수그룹] API_MESSAGES
 * 백엔드 Cloudflare Functions API 전역에서 사용하는 표준 상태 코드 및 응답 메시지 단일 소스 (SSoT)
 *
 * [주요 도메인 분류]:
 * 1. 전역 공통 (SUCCESS, INVALID_PARAMS, UNAUTHORIZED, FORBIDDEN, DATABASE_ERROR, NOT_FOUND)
 * 2. 구독 및 결제 (SUB_CANCEL_SUCCESS, SUB_NOT_FOUND, SUB_EXPIRED, TRIAL_ALREADY_USED, PAYMENT_FAILED)
 * 3. 기기 및 세션 라이선스 (MAX_DEVICES_EXCEEDED, DEVICE_DEACTIVATE_SUCCESS, DEVICE_NOT_FOUND, NO_DESKTOP_PLAN, NO_LICENSE_KEY)
 * 4. 관리자 및 보안 RBAC/MFA (ADMIN_INVITE_SUCCESS, ADMIN_ROLE_CHANGE_SUCCESS, ADMIN_REVOKE_SUCCESS, ADMIN_ALREADY_EXISTS, ADMIN_NOT_FOUND, ADMIN_INVALID_ROLE, ROOT_ADMIN_PROTECTED, SELF_REVOKE_PROHIBITED, MFA_RESET_SUCCESS)
 * 5. 요금제 플랜 관리 (PLAN_CREATE_SUCCESS, PLAN_UPDATE_SUCCESS, PLAN_DELETE_SUCCESS, PLAN_CODE_DUPLICATE, PLAN_NOT_FOUND)
 * 6. 고객 문의 지원 (INQUIRY_ANSWER_SUCCESS, INQUIRY_NOT_FOUND)
 * 7. 회원 계정 및 인증 (EMAIL_ALREADY_IN_USE, EMAIL_AVAILABLE, USER_DELETE_SUCCESS, PASSWORD_RESET_EMAIL_SENT, PASSWORD_CHANGE_SUCCESS)
 * 8. 공통 코드 마스터 (CODE_SAVE_SUCCESS, CODE_DUPLICATE)
 * 9. 프로모션 및 베타 (BETA_REGISTER_SUCCESS, BETA_ALREADY_REGISTERED, FILE_DELETE_SUCCESS)
 * ========================================================================================
 */
export const API_MESSAGES = Object.freeze({
  // ─── 1. 전역 공통 ──────────────────────────────────────────
  SUCCESS: Object.freeze({ code: 'SUCCESS', message: '요청이 성공적으로 처리되었습니다.' }),
  INVALID_PARAMS: Object.freeze({ code: 'ERR_INVALID_PARAMS', message: '필수 파라미터가 누락되었거나 유효하지 않습니다.' }),
  UNAUTHORIZED: Object.freeze({ code: 'ERR_UNAUTHORIZED', message: '인증이 필요하거나 세션이 만료되었습니다.' }),
  FORBIDDEN: Object.freeze({ code: 'ERR_FORBIDDEN', message: '해당 작업을 수행할 권한이 없습니다.' }),
  DATABASE_ERROR: Object.freeze({ code: 'ERR_DATABASE', message: '일시적인 시스템 오류로 요청을 처리하지 못했습니다.' }),
  NOT_FOUND: Object.freeze({ code: 'ERR_NOT_FOUND', message: '요청하신 대상을 찾을 수 없습니다.' }),

  // ─── 2. 구독 및 결제 ────────────────────────────────────────
  SUB_CANCEL_SUCCESS: Object.freeze({ code: 'SUB_CANCEL_OK', message: '구독이 정상적으로 해지되었습니다.' }),
  SUB_NOT_FOUND: Object.freeze({ code: 'ERR_SUB_NOT_FOUND', message: '해지할 수 있는 활성 구독을 찾을 수 없습니다.' }),
  SUB_EXPIRED: Object.freeze({ code: 'SUB_EXPIRED_NOTICE', message: '구독 만료 처리 및 Reader 요금제 자동 전환이 완료되었습니다.' }),
  TRIAL_ALREADY_USED: Object.freeze({ code: 'ERR_TRIAL_ALREADY_USED', message: '무료 체험은 계정당 1회만 신청 가능합니다.' }),
  PAYMENT_FAILED: Object.freeze({ code: 'ERR_PAYMENT_FAILED', message: '결제 승인 처리 중 오류가 발생했습니다.' }),

  // ─── 3. 기기 및 세션 라이선스 ──────────────────────────────
  MAX_DEVICES_EXCEEDED: Object.freeze({ code: 'ERR_MAX_DEVICES_EXCEEDED', message: '동시 접속 허용 대수(1대)를 초과했습니다. 기존 기기를 해제해 주세요.' }),
  DEVICE_DEACTIVATE_SUCCESS: Object.freeze({ code: 'DEVICE_DEACTIVATE_OK', message: '기기가 성공적으로 해제되었습니다.' }),
  DEVICE_NOT_FOUND: Object.freeze({ code: 'ERR_DEVICE_NOT_FOUND', message: '해당 기기 접속 정보를 찾을 수 없습니다.' }),
  NO_DESKTOP_PLAN: Object.freeze({ code: 'ERR_NO_DESKTOP_PLAN', message: '데스크톱을 지원하는 요금제 구독이 없습니다.' }),
  NO_LICENSE_KEY: Object.freeze({ code: 'ERR_NO_LICENSE', message: '라이선스 키가 발급되지 않았습니다.' }),

  // ─── 4. 관리자 및 보안 (RBAC & MFA) ─────────────────────────
  ADMIN_INVITE_SUCCESS: Object.freeze({ code: 'ADMIN_INVITE_OK', message: '관리자가 성공적으로 등록되었습니다.' }),
  ADMIN_ROLE_CHANGE_SUCCESS: Object.freeze({ code: 'ADMIN_ROLE_CHANGE_OK', message: '관리자 권한이 성공적으로 변경되었습니다.' }),
  ADMIN_REVOKE_SUCCESS: Object.freeze({ code: 'ADMIN_REVOKE_OK', message: '관리자 권한 및 MFA가 성공적으로 회수되었습니다.' }),
  ADMIN_ALREADY_EXISTS: Object.freeze({ code: 'ERR_ADMIN_EXISTS', message: '이미 등록된 관리자입니다.' }),
  ADMIN_NOT_FOUND: Object.freeze({ code: 'ERR_ADMIN_NOT_FOUND', message: '해당 관리자를 찾을 수 없습니다.' }),
  ADMIN_INVALID_ROLE: Object.freeze({ code: 'ERR_ADMIN_INVALID_ROLE', message: '유효하지 않은 관리자 권한입니다.' }),
  ROOT_ADMIN_PROTECTED: Object.freeze({ code: 'ERR_ROOT_ADMIN_PROTECTED', message: '최상위 관리자의 권한은 변경하거나 회수할 수 없습니다.' }),
  SELF_REVOKE_PROHIBITED: Object.freeze({ code: 'ERR_SELF_REVOKE_PROHIBITED', message: '본인 계정의 관리자 권한은 스스로 회수할 수 없습니다.' }),
  MFA_RESET_SUCCESS: Object.freeze({ code: 'MFA_RESET_OK', message: 'MFA 인증 수단이 성공적으로 초기화되었습니다.' }),

  // ─── 5. 요금제 플랜 관리 ───────────────────────────────────
  PLAN_CREATE_SUCCESS: Object.freeze({ code: 'PLAN_CREATE_OK', message: '새로운 요금제가 성공적으로 생성되었습니다.' }),
  PLAN_UPDATE_SUCCESS: Object.freeze({ code: 'PLAN_UPDATE_OK', message: '요금제 정보가 성공적으로 수정되었습니다.' }),
  PLAN_DELETE_SUCCESS: Object.freeze({ code: 'PLAN_DELETE_OK', message: '요금제가 성공적으로 삭제되었습니다.' }),
  PLAN_CODE_DUPLICATE: Object.freeze({ code: 'ERR_PLAN_CODE_DUPLICATE', message: '이미 존재하는 요금제 코드입니다.' }),
  PLAN_NOT_FOUND: Object.freeze({ code: 'ERR_PLAN_NOT_FOUND', message: '해당 요금제를 찾을 수 없습니다.' }),

  // ─── 6. 고객 문의 지원 ─────────────────────────────────────
  INQUIRY_ANSWER_SUCCESS: Object.freeze({ code: 'INQUIRY_ANSWER_OK', message: '고객 문의 답변이 성공적으로 등록되었습니다.' }),
  INQUIRY_NOT_FOUND: Object.freeze({ code: 'ERR_INQUIRY_NOT_FOUND', message: '해당 문의 내역을 찾을 수 없습니다.' }),

  // ─── 7. 회원 계정 및 비밀번호 ──────────────────────────────
  USER_NOT_FOUND: Object.freeze({ code: 'ERR_USER_NOT_FOUND', message: '가입되지 않은 회원입니다. 먼저 온리비에 회원가입을 진행해 주세요.' }),
  EMAIL_ALREADY_IN_USE: Object.freeze({ code: 'ERR_EMAIL_IN_USE', message: '이미 사용 중인 이메일 주소입니다.' }),
  EMAIL_AVAILABLE: Object.freeze({ code: 'EMAIL_AVAILABLE_OK', message: '사용 가능한 이메일 주소입니다.' }),
  USER_DELETE_SUCCESS: Object.freeze({ code: 'USER_DELETE_OK', message: '회원 탈퇴 처리가 안전하게 완료되었습니다.' }),
  PASSWORD_RESET_EMAIL_SENT: Object.freeze({ code: 'PASSWORD_RESET_EMAIL_OK', message: '비밀번호 재설정 이메일이 발송되었습니다.' }),
  PASSWORD_CHANGE_SUCCESS: Object.freeze({ code: 'PASSWORD_CHANGE_OK', message: '비밀번호가 성공적으로 변경되었습니다.' }),

  // ─── 8. 공통 코드 마스터 ───────────────────────────────────
  CODE_SAVE_SUCCESS: Object.freeze({ code: 'CODE_SAVE_OK', message: '공통코드가 성공적으로 저장되었습니다.' }),
  CODE_DUPLICATE: Object.freeze({ code: 'ERR_CODE_DUPLICATE', message: '해당 그룹에 이미 존재하는 코드값입니다.' }),

  // ─── 9. 프로모션 및 베타 ───────────────────────────────────
  BETA_REGISTER_SUCCESS: Object.freeze({ code: 'BETA_REGISTER_OK', message: '베타 테스터 신청이 완료되었습니다.' }),
  BETA_ALREADY_REGISTERED: Object.freeze({ code: 'ERR_BETA_REGISTERED', message: '이미 베타 테스터로 신청하셨습니다.' }),
  FILE_DELETE_SUCCESS: Object.freeze({ code: 'FILE_DELETE_OK', message: '파일이 성공적으로 삭제되었습니다.' }),
});
