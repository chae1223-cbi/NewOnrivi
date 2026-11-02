# DB 처리 방식 표준화 대상 목록

작성: 2026-11-01. 기준: `skills/onrivi-db-processing/SKILL.md`, `skills/onrivi-error-handling/SKILL.md`, `skills/onrivi-common-codes/SKILL.md`.

## 목표와 범위

- 클라우드 업무 테이블 접근은 서버의 PostgreSQL SQL로 통일한다. 업무별 쓰기는 하나의 연결과 트랜잭션에서 처리한다.
- Supabase Auth API(로그인, 사용자 토큰 확인, MFA, Auth 사용자 삭제)는 업무 테이블 접근과 구분한다. 로컬 SQLite는 PostgreSQL로 이전하지 않지만 **공통 오류 처리 표준화 대상**에 포함한다. 브라우저 지식 DB는 현재 사용 여부를 확인한 뒤 적용 범위를 정한다.
- `functions/api`가 배포 API이고 `frontend/functions/api`에 미러가 있다. 같은 경로를 함께 수정한다. `frontend/src/app/api`의 Next 라우트는 별도 구현이므로 동일 기능의 계약을 비교한다.
- 기존 PostgreSQL 사용 경로도 최종 방식의 예시일 뿐, 오류 처리·읽기 전용 쿼리의 트랜잭션 범위·연결 설정은 검토한다.

## 1순위: 여러 쓰기가 연결되어 부분 성공 위험이 있는 경로 (DB 접근 방식 전환 완료, 운영 검증 필요)

| 작업 단위 | Cloudflare Functions | Next API / 관련 코드 | 상태 | 적용된 핵심 규칙 |
| --- | --- | --- | --- | --- |
| 구독 취소 | `functions/api/subscription/cancel.js` | `frontend/src/app/api/subscription/cancel/route.ts` | ✅ 완료 | `withBlogTransaction`/`sql.begin`, `FOR UPDATE` 행 잠금, 영향 행 수(`rowCount === 1`) 검증, `serverError` 연동 |
| 구독 만료 | `functions/api/subscription/expire.js` | `frontend/src/app/api/subscription/expire/route.ts` | ✅ 완료 | 만료 구독 잠금 → `EXPIRED` 갱신 → 활성 기기 일괄 비활성화 → 잔여 유료 구독 부재 시 `READER` 자동 발급 단일 원자적 트랜잭션 보장 |
| 구독 조회와 자동 상태 변경 | `functions/api/subscription/get.js` | `frontend/src/app/api/subscription/get/route.ts` | ✅ 완료 | 유저 단위 행 잠금(`FOR UPDATE`), 만료 처리 → 신규 무료체험(APPRENTICE) or 만료 후 READER 발급 및 기기 세션 정리 원트랜잭션화 |
| 데스크톱 라이선스 확인·기기 갱신 | `functions/api/license/verify-desktop.js` | `frontend/src/app/api/license/verify-desktop/route.ts` | ✅ 완료 | 다중 REST 경합 탈피, `subscriptions`/`license_activations` 동시성 잠금(`FOR UPDATE`), 1대 한도 레이스 컨디션 원천 차단, `forceTakeover` 원자적 처리 |
| 기기 등록 해제 | `functions/api/device/deactivate.js`, `functions/api/rpc/device/delete.js` | `frontend/src/app/api/device/deactivate/route.ts` | ✅ 완료 | 세션 소유권(`created_by` or 구독 소유자) 교차 잠금 검증, 영향 행 수 확인, 단일 트랜잭션 롤백 보장 |
| 관리자 사용자·기기 정리 | `functions/api/admin/users.js`, `functions/api/admin/_shared.js` | `frontend/src/app/api/admin/users/route.ts` | DB 전환 완료·외부 연동 보완 필요 | 목록 및 권한 조회를 포함한 업무 테이블 접근을 PostgreSQL로 전환. DB 세션 정리와 감사 로그는 한 트랜잭션. Auth ban/unban과 DB 커밋 사이의 부분 성공은 별도 보상 설계 필요 |
| 관리자 계정 관리 | `functions/api/admin/admins.js` | `frontend/src/app/api/admin/admins/route.ts` | DB 전환 완료·외부 연동 보완 필요 | 목록·권한 조회 및 변경을 PostgreSQL로 전환. DB 변경·감사 로그는 한 트랜잭션. Auth 사용자 생성/MFA 삭제는 DB 트랜잭션 밖이므로 부분 성공 처리 필요 |
| 문의 접수 | `functions/api/rpc/support/insert.js` | `frontend/src/app/api/rpc/support/insert/route.ts` | ✅ 완료 | REST/fallback 제거, PostgreSQL 단일 원자적 쿼리(`sql`/`withBlogTransaction`)로 `support_inquiries` 적재, 외부 Brevo 메일 발송 I/O 격리 |

`subscription/cancel.js`를 샘플로 PostgreSQL 전환이 적용되었다. `subscription/get.js`는 조회 중 쓰기가 발생하므로 동시 요청과 응답 계약을 운영 환경에서 별도로 검증한다. 관리자 경로의 외부 Auth 작업은 PostgreSQL 트랜잭션과 원자적으로 묶을 수 없으며, 실패 시 보상 또는 재시도 정책이 남아 있다.

2026-11-02 점검: 1순위 Cloudflare·Next API와 관리자 인증 헬퍼에서 업무 테이블 REST/SDK 호출은 제거했다. `functions/api/admin/_shared.js`에 남아 있던 미사용 REST 삭제·감사 헬퍼도 제거했다. 기존 코드값은 서버의 `functions/api/_db-codes.js`와 Next의 `frontend/src/constants/dbCodes.ts`에서 참조한다. Cloudflare 관리자 API는 기존 `error` 응답 필드를 유지하면서 요청 ID 기반 공통 오류 처리에 연결했다. Next API의 예외 응답은 아직 Cloudflare의 요청 ID 로그 체계와 다르므로 오류 처리 표준화 단계에서 별도 적용한다. 운영 DB 연결과 실제 API 흐름 검증은 수행하지 않았다.

## 2순위: 관리자 및 콘텐츠 CRUD의 REST/SDK 제거

2026-11-02 적용: 아래 요금제·FAQ·공통 코드·문의 관리·베타/프로모션 API의 업무 테이블 접근을 서버 PostgreSQL로 전환했다. Cloudflare 배포 경로와 `frontend/functions/api` 미러를 함께 수정했고 Next API도 동일 기능으로 변경했다. 관리자 화면의 프로모션·신청자 직접 조회/변경 및 요금제·FAQ·코드·문의 탭의 직접 권한/코드 조회는 인증된 서버 API로 이동했다. 프로모션 관리 API와 관리자 권한 조회 API를 추가했다. 타입 검사와 JavaScript 구문 검사는 통과했으나 실제 운영 DB 연결 및 배포 경로의 통합 검증은 아직 수행하지 않았다. 문의 답변 메일 발송은 DB 트랜잭션 밖의 외부 작업이므로 메일 실패 시 보상/재시도 정책은 별도 검토가 필요하다.

| 영역 | Cloudflare Functions | 대응 Next API |
| --- | --- | --- |
| 요금제 | `functions/api/plans.js`, `functions/api/admin/plans.js` | `frontend/src/app/api/plans/route.ts`, `frontend/src/app/api/admin/plans/route.ts` |
| FAQ | `functions/api/faqs.js`, `functions/api/faqs/[id].js` | `frontend/src/app/api/faqs/route.ts`, `frontend/src/app/api/faqs/[id]/route.ts` |
| 공통 코드 | `functions/api/admin/common-codes/index.js`, `functions/api/admin/common-codes/groups.js` | `frontend/src/app/api/admin/common-codes/route.ts`, `frontend/src/app/api/admin/common-codes/groups/route.ts` |
| 문의 관리 | `functions/api/admin/inquiries.js` | `frontend/src/app/api/admin/inquiries/route.ts` |
| 베타/프로모션 | `functions/api/beta/register.js`, `functions/api/beta/active-promotion.js` | `frontend/src/app/api/beta/register/route.ts`, `frontend/src/app/api/beta/active-promotion/route.ts` |

관리자 프로모션 화면 `frontend/src/app/admin/components/PromotionsTab.tsx`는 브라우저에서 `promotions`, `promotion_subscribers`를 직접 조회·변경한다. 서버 API로 옮길 때 함께 변경한다. 관리자 화면의 `CodesTab.tsx`, `FaqsTab.tsx`, `InquiriesTab.tsx`, `PlansTab.tsx`에도 브라우저 직접 테이블 접근이 있으므로 해당 API를 바꿀 때 호출 경로를 확인한다.

## 3순위: 이미 PostgreSQL인 경로의 일관성 점검

2026-11-02 추가 검증: 공통 DB 헬퍼의 연결 실패 정리 누락을 수정했고, 관리자 MFA 이전 권한 조회가 Cloudflare 미들웨어에서 차단되던 문제를 경로 한정 예외로 바로잡았다. MFA 이전에도 토큰 사용자 ID 일치를 확인한다. 관리자 감사 로그·콘텐츠·시스템 및 블로그 초안/관리 API의 DB 예외 원문 응답을 안전한 오류로 변경했다. 콘텐츠 삭제의 DB 참조 변경과 감사 로그는 단일 트랜잭션으로 묶고 인증된 관리자 ID를 기록한다. TypeScript 타입 검사, 수정 JavaScript 구문 검사, 미러 비교 및 `git diff --check`는 통과했다. Vitest는 로컬 설치의 `vitest/dist/chunks/test.DNmyFkvJ.js` 누락으로 실행되지 않아 테스트 통과로 기록하지 않는다. 실제 PostgreSQL/R2/Auth 통합 호출은 아직 수행하지 않았다. 콘텐츠 삭제의 R2 작업은 DB와 원자적으로 묶을 수 없어 실패 보상 정책이 별도로 필요하다.

2026-11-02 적용 완료:
- 루트 공통 DB 모듈 `functions/api/_db.js` 및 `frontend/functions/api/_db.js` 구축 (`withDbTransaction`, `getAuthUser`, `apiJson`, 하위 호환 별칭 포함).
- 블로그 이외의 모든 서버 엔드포인트에서 `blog/_db.js` 의존성을 제거하고 `_db.js`의 `withDbTransaction`/`getAuthUser`/`apiJson`으로 전면 일원화.
  - 관리자 영역: `admin/{audit-logs, contents, plans, inquiries, promotions, system, users/plan}`, `admin/common-codes/**`, `admin/subscriptions/**`.
  - 기기/세션 영역: `device/{dashboard-sessions, logout-session, session-status}`.
  - 라이선스/비밀번호/사용자 영역: `license/{activate, check-session}` (독립 Client 생성 제거 및 `withDbTransaction` 통합), `password/{request, confirm}`, `subscription/create`, `user/{check, delete, upsert}`.
  - 공개 API 영역: `plans.js`, `faqs.js`, `faqs/[id].js`, `beta/{active-promotion, register}`.
- 오직 블로그 전용 라우트(`blog/*`, `admin/blog.js`)에서만 `blog/_db.js`를 사용하도록 경계를 명확히 분리.
- Cloudflare Pages Functions 및 `frontend/functions/api` 미러 동기화 완료, Next.js 타입 검사(`tsc --noEmit`) 0 오류 확인.

## 브라우저 직접 업무 테이블 접근 점검

2026-11-02 적용 완료:
- **공통코드 클라이언트 API 신설**: `functions/api/common-codes.js`, `frontend/functions/api/common-codes.js`, Next.js `frontend/src/app/api/common-codes/route.ts` 구축.
- **관리자 권한 조회 일원화**: `admin/layout.tsx`, `admin/page.tsx`에서 브라우저 직접 `supabase.from('admins')`를 서버 인증 기반 `/api/admin/role` 호출로 전환.
- **문의 페이지 공통코드 조회 전환**: `contact/page.tsx`에서 `supabase.from('common_codes')`를 `/api/common-codes?group_code=INQUIRY_TYPE`으로 전환.
- **대시보드 메타데이터 및 공통코드 전환**: `dashboard/page.tsx`에서 `supabase.from('users')`를 `/api/user/check` 결과로 직결하고, `supabase.from('common_codes')`를 `/api/common-codes`로 전환.
- **블로그 카테고리 로컬 라우트 전환**: `frontend/src/app/api/blog/categories/route.ts`에서 REST SDK `supabaseAdmin.from`을 제거하고 PostgreSQL `sql` 태그 조인 쿼리로 통일.
- **로그인/콜백 임의 폴백 제거 (규칙 9 준수)**: `login/page.tsx` 및 `auth/callback/page.tsx`의 `supabase.from('subscriptions')` 폴백을 제거하고 `/api/subscription/get` 단일 원천으로 일원화.
- **관리자 로그인 Pre-MFA 사전 검증 전환**: `frontend/src/app/admin/login/page.tsx`에서 2단계 인증 전 관리자 확인을 위해 사용하던 `supabase.from('admins')`를 `/api/admin/role?pre_mfa=true` 서버 API로 전환 완료.
- **메인 에디터(`MainEditorApp.tsx`) 직접 DB 접근 100% 제거**:
  - 사용자 닉네임 조회: `supabase.from('users')` → `/api/user/check` 전환.
  - 웹 SaaS 라이선스 및 구독 검증: `supabase.from('subscriptions')` 다중 쿼리 → `/api/subscription/get` 단일 원천 전환 (서버 원트랜잭션 자동 만료 및 READER 발급 연계).
  - 동시 접속 제어권 인수(`handleTakeoverControl`): 구독 ID 조회를 `/api/subscription/get`으로 전환.
  - Realtime 활성화 이벤트 처리: 라이선스 키/검증 키 직접 조회를 `/api/subscription/get`으로 안전하게 격리.
- **프론트엔드 전역 Zero Direct DB Table Query 달성**: `frontend/src/` 전체 코드 정적 스캔 결과, 브라우저 직접 테이블 쿼리(`supabase.from(...)`)가 0건으로 완전히 제거되었으며 모든 업무 데이터는 인증된 서버 API를 통해서만 안전하게 처리됨.

## 로컬 SQLite 공통 오류 처리 대상

2026-11-02 적용 완료:
- **공통 SQLite 오류 표준 모듈 신설 (`frontend/src/lib/knowledge/knowledgeError.ts`)**:
  - 표준 에러 코드 체계 확립: `SQLITE_NOT_AVAILABLE`, `DATABASE_LOCKED`, `DATABASE_CORRUPT`, `INVALID_BACKUP_FILE`, `RESOURCE_FOLDER_NOT_SET`, `RESOURCE_FOLDER_NOT_FOUND`, `TRANSACTION_FAILED`, `INDEXING_FAILED`, `DOCUMENT_NOT_FOUND`, `INVALID_PARAMS`, `UNKNOWN_ERROR`.
  - 안전한 사용자 안내 메시지 매핑 (내부 파일 절대경로, SQL 구문, 스택트레이스 원천 차단).
  - 고유 진단 ID(`diagnosticId`, 헤더 `X-Diagnostic-ID`) 생성 및 에러별 정적 메타데이터(코드, 작업단계, 진단ID) 기반 안전 로깅 확립.
- **지식 베이스 전체 16개 API 라우트 공통 에러 응답(`knowledgeErrorResponse`) 적용 완료**:
  - 변경 작업: `init`, `index`, `delete`, `collection`, `queue`, `queue/pop`, `queue/step`, `queue/complete`.
  - 조회/검색 작업: `list`, `detail`, `search`, `query`, `queue/stats`, `resolve-path`.
  - 백업/원복 작업: `backup`, `restore` (원문 노출 방어 및 잠금/손상/유효성 오류 표준화).
- **클라이언트 에러 및 진단 ID 연동 (`knowledgeClient.ts`)**:
  - API 실패 시 진단 ID를 포함한 메시지 포맷팅(`message (진단 ID: xxx)`) 지원.
  - 데스크톱 환경(Electron)에서 API 실패 시 WASM/브라우저 DB로 임의 폴백하던 로직을 전면 차단하고 상위로 명확히 에러 전파 (AGENTS.md 규칙 9 준수).

| 우선순위 | 대상 | 확인할 오류 경로 |
| --- | --- | --- |
| 높음 | `frontend/src/lib/knowledge/knowledgeDb.ts` | `node:sqlite` 초기화·연결, 잠금/손상, 트랜잭션 롤백, 백업·복원 실패. 파일 경로나 SQLite 원문을 사용자 메시지에 포함하지 않기 |
| 높음 | `frontend/src/lib/knowledge/knowledgeService.ts`, `frontend/src/lib/knowledge/knowledgeWorker.ts`, `frontend/src/lib/knowledge/knowledgeQueue.ts` | 색인 선행 처리 실패와 DB 쓰기 실패 구분, 작업 ID와 진단 ID 연결, 실패를 성공이나 빈 결과로 바꾸지 않기 |
| 높음 | `frontend/src/app/api/knowledge/{init,index,delete,collection,queue,queue/pop,queue/step,queue/complete}/route.ts` | 변경 작업의 4xx/5xx 응답 형식, 오류 코드·진단 ID·작업 단계, 원트랜잭션 실패 전파 |
| 중간 | `frontend/src/app/api/knowledge/{list,detail,search,query,queue/stats,resolve-path}/route.ts` | 조회 실패를 빈 목록·빈 통계로 숨기는 경로와 사용자에게 반환되는 원문 점검 |
| 중간 | `frontend/src/app/api/knowledge/{backup,restore}/route.ts` | 잠금·손상·유효하지 않은 백업 파일을 구분하고 복원 실패 시 경로/예외 원문 노출 방지 |
| 중간 | `frontend/src/lib/knowledge/knowledgeClient.ts`와 지식 화면 호출부 | API 오류의 진단 ID를 사용자 알림에 표시하고, Electron/브라우저 경로의 오류 계약 일치 확인 |
| 사용 여부 확인 | `frontend/src/lib/knowledge/browserKnowledgeDb.ts` | 브라우저 SQLite 경로가 실제 지원되는지 확인한 뒤 동일 오류 규칙 적용. 데스크톱 실패 시 임의 브라우저 DB 폴백 금지 |

SQLite 오류의 대표 코드 후보는 `SQLITE_NOT_AVAILABLE`, `DATABASE_LOCKED`, `DATABASE_CORRUPT`, `INVALID_BACKUP_FILE`, `RESOURCE_FOLDER_NOT_SET`이다. 실제 코드와 기존 사용자 안내 문구를 확인해 확정한다. 진단 로그에는 코드·작업 단계·진단 ID만 기본 기록하고 문서 내용, 전체 파일 경로, AI 입력, SQL문은 기록하지 않는다. 잠금/손상 자동 복구는 데이터 손실 위험이 있으므로 기존 동작을 검토하고 오류 처리 통일만을 이유로 확대하지 않는다.

## 작업 순서와 완료 조건

1. 샘플 구독 취소의 호출자·응답·DB 제약조건을 확인한다.
2. 관련 쓰기를 한 트랜잭션으로 옮기고 행 수/동시성/권한을 검증한다. 오류는 `serverError`와 요청 ID로 기록한다.
3. Cloudflare Functions와 미러를 동기화하고, 동일 기능의 Next API가 있다면 업무 규칙과 응답을 맞춘다.
4. 샘플 검증 후 1순위 → 2순위 → 3순위로 진행한다. DB 연결 실패·중간 쿼리 실패·업무 거절에서 부분 쓰기와 잘못된 성공 응답이 없는지 확인한다.
5. 변경 경로에 Supabase 업무 테이블 REST/SDK와 성공을 가장한 fallback이 남지 않았는지 확인한다. Auth·SQLite·Realtime의 처리 범위를 명시적으로 구분한다.
6. PostgreSQL 경로와 별도로 SQLite 지식 DB의 오류 변환 함수·API 응답·사용자 알림을 위 목록 순서로 통일한다. 로컬 DB 파일을 사용하는 실패 검증은 복사본에서 수행한다.

이 문서는 정적 코드 검색으로 만든 작업 목록이다. 각 항목을 편집할 때 실제 호출 여부, 스키마, 운영 환경, API 계약을 다시 확인한다.
