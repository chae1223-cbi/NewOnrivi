---
name: onrivi-message-handling
description: OnriviAuthor의 성공, 안내, 경고, 오류 등 모든 사용자 메시지를 상수 파일로 단일 관리하고, 추가/변경 시 개발자 승인 절차를 적용한다.
---

# OnriviAuthor 시스템 메시지 및 알림 표준

## 적용 범위

프론트엔드 UI(토스트 알림 `showToast`, 모달 안내, 인라인 경고), 백엔드 API 응답(`serverError`, JSON 실패 메시지), 데스크톱 로컬 SQLite 지식 베이스 알림 등 **사용자에게 표출되는 모든 시스템 안내, 경고, 성공, 오류 메시지**에 적용한다.

## 핵심 원칙

### 1. 상수 파일 단일 관리 원칙 (하드코딩 원천 금지)
- 소스 코드(컴포넌트, API 라우트, 핸들러 등) 내부에 임의의 한국어/영어 알림 문구 문자열 리터럴을 인라인으로 직접 작성하는 것을 엄격히 금지한다.
- 모든 알림은 다음 단일 소스(SSoT) 상수 파일을 반드시 참조해야 한다:
  - 프론트엔드: `frontend/src/constants/messages.ts` (`SYSTEM_MESSAGES`)
  - 백엔드: `functions/api/_messages.js` (`API_MESSAGES`)
- 문자열을 직접 타이핑하지 않고 `SYSTEM_MESSAGES.SUB_CANCEL_SUCCESS` 또는 `API_MESSAGES.SUB_CANCEL_SUCCESS`와 같이 상수 키를 호출하여 타입 안정성과 일관성을 유지한다.

### 2. 3-Tier 메시지 조립 표준
모든 사용자 알림은 내부 기술 용어(SQLSTATE, Stack, 파일 경로)를 마스킹하고, 다음 3단계 구조로 조립한다:
1. **상황 요약 (`text` / `message`)**: 사용자가 한눈에 이해할 수 있는 명확한 결과 안내
2. **행동 가이드 (`actionGuide`)**: 오류/경고 발생 시 사용자가 즉시 취할 수 있는 구체적인 해결 행동 (프론트엔드)
3. **진단 ID / 표준 코드 (`code`, `requestId`)**: 기술 지원 및 관리자 추적을 위한 대문자 고유 식별자

### 3. DESIGN.md 4대 기능 색상 토큰 준수
임의의 색상(토마토색, 파스텔 주황 등) 사용을 금지하며, 루트 `DESIGN.md`의 Functional States 토큰을 고정 적용한다:
- **`SUCCESS`**: `#059669` (Emerald 600) — 작업 완료, 저장 성공
- **`INFO`**: `#1d4ed8` (Cobalt Authority) — 상태 변경, 백업 안내
- **`WARNING`**: `#d97706` (Amber 600) — 기기 한도(1대), 입력값 누락, 주의
- **`ERROR`**: `#dc2626` (Crimson Red) — 시스템 오류, DB 실패, 네트워크 단절

### 4. 신규 메시지 추가 및 문구 변경 승인 절차 (Developer Approval Workflow)
신규 기능 개발이나 요구사항 변경으로 인해 **새로운 알림이 필요하거나 기존 문구를 수정해야 하는 경우, 시스템이나 AI가 임의로 작성/변경하는 것을 원천 금지**한다. 반드시 작업을 멈추고 **개발자(사용자)에게 다음 양식으로 확인 및 승인을 요청**해야 한다:

1. **메시지 식별 키 (`MessageKey`)**: 대문자 스네이크 케이스 (예: `DEVICE_LIMIT_EXCEEDED`)
2. **알림 분류 (`ToastType`)**: `success` | `info` | `warning` | `error`
3. **상황 요약 문구 (`text` / `message`)**: 사용자용 표준 한국어 문구
4. **해결 행동 가이드 (`actionGuide`)**: 사용자가 취할 조치 (선택)
5. **표준 에러/상태 코드 (`code`)**: 예: `ERR_MAX_DEVICES_EXCEEDED`
6. **추가/변경 사유 및 영향 범위**: 해당 메시지가 필요한 이유 및 적용 대상 파일

> **🚨 승인 후 처리 원칙**:
> 개발자의 명시적 승인을 득한 이후에만 `frontend/src/constants/messages.ts` 및 백엔드 `_messages.js`에 상수를 등록하고 소스 코드에 반영한다.

---

## 5. 백엔드 `API_MESSAGES` 9대 도메인 표준 및 단일 원본 관리

백엔드 메시지 상수는 루트 `functions/api/_messages.js` 한 파일에서 관리하며, 다음 9대 도메인으로 체계화하여 유지한다:

1. **전역 공통 (COMMON)**: `SUCCESS`, `INVALID_PARAMS`, `UNAUTHORIZED`, `FORBIDDEN`, `DATABASE_ERROR`, `NOT_FOUND`
2. **구독 및 결제 (SUBSCRIPTION)**: `SUB_CANCEL_SUCCESS`, `SUB_NOT_FOUND`, `SUB_EXPIRED`, `TRIAL_ALREADY_USED`, `PAYMENT_FAILED`
3. **기기 및 세션 라이선스 (DEVICE)**: `MAX_DEVICES_EXCEEDED`, `DEVICE_DEACTIVATE_SUCCESS`, `DEVICE_NOT_FOUND`, `NO_DESKTOP_PLAN`, `NO_LICENSE_KEY`
4. **관리자 및 보안 RBAC/MFA (ADMIN)**: `ADMIN_INVITE_SUCCESS`, `ADMIN_ROLE_CHANGE_SUCCESS`, `ADMIN_REVOKE_SUCCESS`, `ADMIN_ALREADY_EXISTS`, `ADMIN_NOT_FOUND`, `ADMIN_INVALID_ROLE`, `ROOT_ADMIN_PROTECTED`, `SELF_REVOKE_PROHIBITED`, `MFA_RESET_SUCCESS`
5. **요금제 플랜 관리 (PLANS)**: `PLAN_CREATE_SUCCESS`, `PLAN_UPDATE_SUCCESS`, `PLAN_DELETE_SUCCESS`, `PLAN_CODE_DUPLICATE`, `PLAN_NOT_FOUND`
6. **고객 문의 지원 (INQUIRIES)**: `INQUIRY_ANSWER_SUCCESS`, `INQUIRY_NOT_FOUND`
7. **회원 계정 및 인증 (USER)**: `EMAIL_ALREADY_IN_USE`, `EMAIL_AVAILABLE`, `USER_DELETE_SUCCESS`, `PASSWORD_RESET_EMAIL_SENT`, `PASSWORD_CHANGE_SUCCESS`
8. **공통 코드 마스터 (CODES)**: `CODE_SAVE_SUCCESS`, `CODE_DUPLICATE`
9. **프로모션 및 베타 (PROMOTION)**: `BETA_REGISTER_SUCCESS`, `BETA_ALREADY_REGISTERED`, `FILE_DELETE_SUCCESS`

---

## 변경 시 확인 체크리스트

1. **상수 참조 여부**: 소스 코드에 문자열 리터럴 알림이 남아있지 않고 `SYSTEM_MESSAGES` / `API_MESSAGES` 상수를 임포트하여 사용하는가?
2. **색상 및 템플릿 일치**: 4대 기능 색상 토큰 및 상황+가이드 구조를 준수하는가?
3. **기술 정보 노출 차단**: 클라이언트 사용자 화면에 SQL 문이나 스택 트레이스 등 내부 기술 정보가 노출되지 않는가?
4. **단일 원본 여부**: 백엔드 메시지를 루트 `functions/api/_messages.js`에서만 관리하는가?
5. **개발자 승인 이력**: 신규 추가/수정된 문구인 경우 개발자의 사전 승인을 거쳤는가?
