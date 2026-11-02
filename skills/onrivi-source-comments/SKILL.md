---
name: onrivi-source-comments
description: OnriviAuthor 소스 코드 수정 시 파일 헤더 주석, @PATCH 이력 관리, 구분자(=) 및 함수명이 포함된 JSDoc/TSDoc 문서 주석을 파일 유형별 표준 양식에 맞추어 작성한다.
---

# OnriviAuthor 소스 코드 주석 표준화 지침

## 적용 범위

OnriviAuthor 프로젝트 내의 모든 서버 API 엔드포인트, 공통 라이브러리 및 DB 래퍼, 프론트엔드 UI 컴포넌트, 공통 코드/상수 정의 파일에 적용한다.

---

## 1. 핵심 원칙 (Core Rules)

### 1) 단일 관리 원칙 (Single Source of Truth)
- 소스 코드를 수정할 때마다, 해당 소스 파일 최상단 헤더 주석의 `🚨 @PATCH` 항목에 수정 날짜(`YYYY-MM-DD`)와 변경 내역을 명확한 한글로 기록해야 한다.
- `OMD_QUICK_TABLE.md` 등 외부 문서에는 더 이상 수정 내역을 동기화하거나 기록하지 않으며, 오직 수정 대상 소스 코드 최상단 주석 블록에만 패치 내역을 유지한다.

### 2) 2단계 표준화 구조
- **1단계 (파일 최상단 헤더)**: 파일 전체의 식별코드, 역할(`@KICK`), 보안/트랜잭션 가드(`@GUARD`), 최신 패치 이력(`@PATCH`), 외부 의존성(`@CALLS`) 기록.
- **2단계 (내부 함수/컴포넌트 문서 주석)**: 상하 구분선(`========================================================================================`)과 **[함수명]**을 반드시 포함하고, JSDoc/TSDoc 양식에 입각한 파라미터(`@param`), 반환값(`@returns`), 예외(`@throws`), 사용 예시(`@example`) 명시.

### 3) 직관적인 이모지 태그 활용
- `🎯 @KICK` : 기능, 목적, 핵심 비즈니스 역할
- `🛡️ @GUARD` : 보안, 권한, 원자성(All-or-Nothing), 멱등성 정책
- `🚨 @PATCH` : 날짜(`YYYY-MM-DD`) 및 수정 내역
- `🔗 @CALLS` : 외부 API, 주요 의존 함수 및 데이터베이스 테이블

---

## 2. 함수 및 메서드 문서 주석 표준 양식 (필수 구분선 및 함수명 포함)

모든 함수 정의부 상단에는 아래와 같이 **상/하단 구분선(`=`)**과 **함수명**을 명확히 명시해야 한다.

```javascript
/**
 * ========================================================================================
 * [함수명] 함수 역할 및 목적 요약 설명
 * (필요 시 동작 방식이나 비즈니스 예외 방어 사유를 상세 기술합니다.)
 *
 * @param {타입} 매개변수명 - 매개변수 설명
 * @param {타입} [선택매개변수=기본값] - 선택적 매개변수 설명
 * @returns {타입} 반환값 설명
 * @throws {에러타입} 비정상 상황 시 발생하는 예외 명시
 *
 * @example
 * // 실제 호출 예시 코드
 * const result = await functionName(param1, param2);
 * ==========================================================================================
 */
```

---

## 3. 파일 유형별 표준 주석 양식

### ① 서버 API 엔드포인트 파일
> 대상: `functions/api/**/*.js`, `frontend/src/app/api/**/route.ts`

```javascript
// ====================================================================
// 📊 [식별코드] 파일 상대 경로 (예: functions/api/subscription/cancel.js)
// 🎯 @KICK  : API 핵심 역할 및 비즈니스 목적 요약
// 🛡️ @GUARD : 권한 검증(SUPER/SUPPORT), FOR UPDATE 행 잠금, 단일 트랜잭션 롤백 보장
// 🚨 @PATCH : YYYY-MM-DD — [패치 주제] 변경 내역 상세 요약 (한글 명확 기록)
// 🔗 @CALLS : withDbTransaction, checkAdminAuth, Supabase Auth API
// ====================================================================

/**
 * ========================================================================================
 * [함수명] onRequestPost - 구독 취소 요청을 단일 트랜잭션으로 처리합니다.
 *
 * @param {object} context - Cloudflare context (또는 Next.js req: Request)
 * @param {Request} context.request - HTTP 요청 객체
 * @param {object} context.env - 환경 변수 및 바인딩 (HYPERDRIVE, DATABASE_URL 등)
 * @returns {Promise<Response>} JSON 응답 객체
 * @throws 400(파라미터 누락), 401(인증 실패), 403(권한 없음), 500(DB 트랜잭션 오류)
 *
 * @example
 * // POST /api/subscription/cancel
 * // Body: { subscription_id: 'sub-xxx' }
 * ==========================================================================================
 */
export async function onRequestPost(context) { ... }
```

---

### ② 공통 라이브러리 및 DB/서비스 모듈
> 대상: `functions/api/_db.js`, `functions/api/_server-error.js`, `frontend/src/lib/**/*.ts`

```javascript
// ====================================================================
// 📊 [식별코드] 파일 상대 경로 (예: functions/api/_server-error.js)
// 🎯 @KICK  : 공통 모듈 역할 요약
// 🛡️ @GUARD : 무결성 및 보안 정책 요약
// 🚨 @PATCH : YYYY-MM-DD — [패치 주제] 변경 내역
// ====================================================================

/**
 * ========================================================================================
 * [함수명] serverError - 서버 내부 에러(500) 표준 JSON Response 및 구조화된 진단 로그를 생성합니다.
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
 * ==========================================================================================
 */
export function serverError(request, error, { source, stage, message = '요청을 처리하지 못했습니다.' }) { ... }
```

---

### ③ 프론트엔드 UI 컴포넌트
> 대상: `frontend/src/components/**/*.tsx`, `frontend/src/app/**/page.tsx`  
> *(AGENTS.md 규칙 3: 역할 기반 컴포넌트 분리 명시)*

```typescript
/**
 * ====================================================================
 * 🏷️ 파일명 : AdminsTab.tsx
 * 🎭 역할(Role) : Core (또는 Container / Layout / Manager 중 선택 명시)
 * 🎯 주요기능 : 관리자 계정 목록 조회, 신규 초대, 권한 변경 및 회수
 * 🚨 @PATCH : YYYY-MM-DD — [패치 주제] UI/UX 개선 및 API 연동 변경 내역
 * ====================================================================
 */

/**
 * ========================================================================================
 * [컴포넌트명] AdminsTab - 관리자 계정 목록 및 권한 설정 테이블 UI
 *
 * @param {Props} props - 컴포넌트 프로퍼티
 * @returns {JSX.Element} 관리자 관리 화면 레이아웃
 * ==========================================================================================
 */
export default function AdminsTab({ ... }: Props) {
  // ...
}
```

---

### ④ 공통 코드 및 상수/타입 정의 파일
> 대상: `frontend/src/constants/**/*.ts`, `functions/api/_db-codes.js`  
> *(AGENTS.md 규칙 2: DB/통신 코드값 대문자 통일 준수)*

```typescript
/**
 * ====================================================================
 * 📊 공통 코드 및 시스템 상수 정의
 * 🛡️ @GUARD : DB 저장 및 모듈 간 통신 코드값은 반드시 영문 대문자 통일 (규칙 2 준수)
 * 🚨 @PATCH : YYYY-MM-DD — [코드 추가/변경] 변경된 코드 그룹 및 항목 요약
 * ====================================================================
 */

/**
 * ========================================================================================
 * [상수그룹] PLAN_STATUS - 구독 플랜 상태 코드
 * ==========================================================================================
 */
export const PLAN_STATUS = {
  /** 정상 활성 상태 */
  ACTIVE: 'ACTIVE',
  /** 만료 상태 */
  EXPIRED: 'EXPIRED',
} as const;
```

---

## 4. 로그 포맷팅 표준 (함수명 및 구분자 포함)

시스템 오류나 디버그 로그를 출력할 때도 구조화된 형태와 함께 함수명/단계명을 명시한다:

```javascript
console.error(JSON.stringify({
  event: 'SERVER_ERROR',
  functionName: 'serverError',
  requestId,
  source,
  stage,
  dbCode,
  errorName: typeof error?.name === 'string' ? error.name : 'Error',
  message: error?.message,
}));
```
