---
name: onrivi-common-codes
description: OnriviAuthor의 상태 코드, 요금제, 권한, 에러 코드 등 시스템/비즈니스 코드값을 다룰 때 공통코드 참조 및 신규 코드 등록 승인 절차를 적용한다.
---

# OnriviAuthor 공통코드 및 상태값 관리

## 적용 범위

서버 API, 클라우드 DB 쿼리, 클라이언트 상태 처리, 에러 응답 등 애플리케이션 전반에서 사용되는 모든 업무 상태값(`PLAN_STATUS`), 요금제(`PLAN_NAME`), 결제 주기(`BILLING_CYCLE`), 기기/시스템 유형(`SYS_TYPE`), 관리자 권한(`ADMIN_ROLE`), 감사 액션(`AUDIT_ACTION`), 문의 분류(`INQUIRY_STATUS`, `INQUIRY_TYPE`), 시스템 공통 에러 코드(`ERROR_CODES`)에 적용한다.

## 핵심 원칙

### 1. 단일 소스 참조 원칙 (하드코딩 금지)
- 소스 코드 내에 임의의 문자열 리터럴(예: `'CANCELED'`, `'Desktop App'`, `'INVALID_PARAMS'`)을 직접 하드코딩하거나 분기문 조건에 인라인으로 박아넣는 것을 엄격히 금지한다.
- 데이터베이스 업무 코드는 DB의 `common_codes` 테이블 및 이를 투영한 공통 상수 정의 모듈을 반드시 단일 진입점으로 참조한다.
- 모든 코드값은 `.agents/AGENTS.md`의 **대문자 통일 규칙(RULE 2)**을 반드시 준수한다. (소문자 입력 및 조회 필터링 절대 금지)
- API 오류 응답 및 예외 처리 시에도 제각각의 문자열을 작성하지 않고, 표준 에러 코드 상수를 참조한다.

### 2. 신규 코드 임의 생성 원천 금지 (No Arbitrary Creation)
- 개발 중 새로운 상태값, 요금제, 기기 식별자, 역할, 에러 코드가 필요하다고 판단되더라도, 시스템이나 AI 어시스턴트가 **임의로 코드를 지어내어 소스 코드나 DB에 직접 등록하는 것을 원천 금지**한다.
- 기존 그룹코드에 유사하거나 대체 가능한 코드가 이미 존재하는지 반드시 먼저 전수 검색한다.

### 3. 개발자(사용자) 사전 확인 및 승인 절차 (Approval Workflow)
기존 공통코드로 수용할 수 없어 신규 코드를 추가해야 하는 상황이 발생하면, **반드시 작업을 일시 멈추고 개발자(사용자)에게 다음 서식으로 등록 승인을 요청**해야 한다:

1. **소속 그룹코드 (`group_code`)**: 기존 그룹 또는 신규 그룹명 (대문자)
2. **신규 코드값 (`code_value`)**: 대문자 식별자 (예: `DESKTOP`)
3. **코드 명칭 및 설명 (`code_name`, `description`)**: 사용자/관리자용 한국어 명칭 및 상세 용도
4. **추가 사유 및 영향 범위**: 해당 코드가 왜 필요한지, 어떤 파일과 테이블에 영향이 미치는지 명시

---

## 4. 공통코드 추가 시 대상 파일 즉각 동기화 절차 (3대 표준 상수 파일)

개발자(사용자)의 명시적 승인을 득한 후, 공통코드는 DB에만 머무르지 않고 시스템 전역에서 즉시 참조될 수 있도록 **반드시 아래 3대 표준 상수 파일에 원자적으로 동시 반영**해야 한다:

### 🎯 동기화 대상 3대 파일
1. **`functions/api/_db-codes.js`**: Cloudflare Pages Functions 프로덕션 런타임 상수
2. **`frontend/functions/api/_db-codes.js`**: Functions 로컬 미러 상수 (1번 파일과 100% 동일 유지, 라인 2 경로 주석만 미러 경로로 지정)
3. **`frontend/src/constants/dbCodes.ts`**: Next.js 프론트엔드 및 Node/TypeScript 런타임 상수 (`as const` 리터럴 타입 지원)

### 📝 반영 규칙 및 절차
1. **신규 그룹코드 발생 시**:
   - `DB_CODES.CODE_GROUP` 객체에 신규 그룹 식별자 키-값을 대문자로 추가한다.
   - 예: `CODE_GROUP: Object.freeze({ ..., NEW_GROUP: 'NEW_GROUP' })`
2. **신규 세부 코드값 반영**:
   - 소속 그룹 객체 하위에 신규 코드를 대문자로 추가하고 설명 JSDoc 주석을 기재한다.
   - JavaScript 파일(`_db-codes.js`): `Object.freeze({ ... })` 불변 객체 유지
   - TypeScript 파일(`dbCodes.ts`): `as const` 불변 선언 유지
3. **파일 최상단 `@PATCH` 이력 갱신**:
   - [skills/onrivi-source-comments/SKILL.md](../onrivi-source-comments/SKILL.md)에 따라 3개 파일 최상단 주석에 당일 날짜와 추가된 코드 내역을 기록한다.
   - 예: `// 🚨 @PATCH : YYYY-MM-DD — [공통코드 추가] <GROUP_NAME> 그룹에 <CODE_VALUE> 코드 반영`
4. **정합성 및 빌드 검증**:
   - 반영 후 즉시 다음 명령어들을 실행하여 정합성을 검증한다:
     ```bash
     node --check functions/api/_db-codes.js
     node --check frontend/functions/api/_db-codes.js
     npm --prefix frontend run typecheck
     npm --prefix frontend run lint
     ```

---

## 변경 시 확인 체크리스트

1. **공통코드 일치 여부**: 조회 및 갱신에 사용된 코드값이 DB `common_codes`의 대문자 규격과 일치하는가?
2. **하드코딩 잔존 여부**: 소스 코드(IF문, 쿼리 파라미터, 응답 JSON)에 문자열 리터럴이 남아있지 않고 공통 상수를 임포트하여 참조하고 있는가?
3. **신규 코드 승인 여부**: 새로 도입된 코드가 있을 경우, 개발자 사전 질문 및 승인 단계를 거쳤는가?
4. **3대 표준 상수 파일 동기화 여부**: `functions/api/_db-codes.js`, `frontend/functions/api/_db-codes.js`, `frontend/src/constants/dbCodes.ts` 세 파일에 모두 누락 없이 동일하게 반영되었는가?
5. **연계 스킬 검토**: DB 작업이 포함되면 `skills/onrivi-db-processing/SKILL.md`, 오류 코드를 다루면 `skills/onrivi-error-handling/SKILL.md`, 주석 관리는 `skills/onrivi-source-comments/SKILL.md`를 함께 준수한다.
