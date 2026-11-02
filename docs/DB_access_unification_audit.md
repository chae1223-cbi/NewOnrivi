# DB 처리 통합 분석: 대시보드와 관리자

2026-09-28 기준 소스 분석. 이 문서는 설계 기준이며 아직 운영 DB나 API를 변경하지 않는다.

## 결론

업무 테이블(`users`, `subscriptions`, `license_activations`, `common_codes`, 관리자 및 블로그 테이블)의 읽기·쓰기는 **서버 API에서 `pg`로 PostgreSQL에 직접 연결**하는 방식으로 통일한다. Cloudflare Pages Functions는 `env.HYPERDRIVE.connectionString`을 사용하고, 로컬 개발에서는 서버 전용 `DATABASE_URL`을 사용한다. 요청마다 클라이언트를 만들고 반드시 닫는다. 여러 DB 변경이 하나의 업무 명령이면 같은 연결에서 `BEGIN`/`COMMIT`/`ROLLBACK`으로 원자적으로 처리한다. 트리거나 저장 프로시저를 새로 도입하지 않는다.

Supabase Auth는 로그인·토큰 검증·Auth 사용자 관리에만 사용한다. R2 이미지와 데스크톱 로컬 SQLite도 별도 저장소로 유지한다. PostgreSQL 트랜잭션은 Supabase Auth API 또는 R2 작업까지 원자적으로 묶을 수 없으므로, 이 작업은 순서·재시도·보상 규칙을 별도로 정의한다.

Cloudflare 공식 문서는 Hyperdrive와 Supabase 조합에서 `pg` 등 직접 DB 드라이버를 권장하며 요청별 `Client` 생성을 안내한다. 현재 프로젝트의 `pg` 8.22와 `nodejs_compat` 설정은 이 방향에 부합한다.

참고: [Cloudflare의 Supabase 연결 가이드](https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/), [Supabase의 JWT 검증 가이드](https://supabase.com/docs/guides/auth/jwts)

## 현재 경로

| 영역 | 실제 운영 경로 | 현재 DB 접근 | 문제 |
| --- | --- | --- | --- |
| 대시보드 | `functions/api/subscription/*`, `functions/api/device/*`, `functions/api/rpc/user/*` | 서비스 키로 Supabase REST를 여러 번 호출 | 요청마다 여러 독립 트랜잭션. 읽기 API가 만료 상태 갱신·READER 생성까지 수행. 일부 경로가 본문 `user_id`만 신뢰한다. |
| 관리자 일반 | `functions/api/admin/*` | 서비스 키 REST, 일부 브라우저 직접 `supabase.from` | 라우트마다 인증 방식이 다르고 클라이언트가 보낸 `adminId`를 신뢰하는 곳이 있다. 조회·세션 변경·감사 기록이 분리된다. |
| 관리자 블로그 | `functions/api/admin/blog.js` → `functions/api/blog/_db.js` | 토큰 확인 후 `pg` 단일 연결·트랜잭션 | 재사용할 수 있는 가장 가까운 선행 사례. 인증과 DB 헬퍼를 일반화해야 한다. |
| 로컬 Next 개발 API | `frontend/src/app/api/*` | `supabaseAdmin`/Postgres.js 혼용 | 운영 Pages Function과 구현이 달라 로컬 성공이 운영 성공을 보장하지 않는다. |
| 데스크톱 로컬 문서/지식 | Electron/SQLite/파일 | 로컬 DB 및 파일 | 클라우드 업무 DB와 용도가 다르므로 통합 대상에서 제외한다. |

Pages Function이 두 위치(`functions/api`, `frontend/functions/api`)에 39개씩 복제돼 있고 현재 내용은 같다. 웹 빌드가 `frontend/functions`를 루트 `functions`로 복사한다. 소스의 단일 기준 위치를 정해 중복 수정을 없애야 한다.

## 우선 해결할 위험

1. `functions/api/subscription/get.js`는 본문의 `user_id`로 서비스 권한 조회를 하고 만료 상태 변경과 신규 READER 발급도 수행한다. 실패한 구독 조회를 빈 이력과 동일하게 취급하는 분기가 있다. 요청 사용자 검증, 읽기와 쓰기 분리, 동시 생성 방지가 필요하다.
2. `functions/api/subscription/create.js`는 구독 생성·기기 활성화·기존 구독 만료를 독립 REST 요청과 소프트 롤백으로 처리한다. 하나가 실패하면 중간 상태가 남을 수 있다. 단일 DB 트랜잭션으로 옮긴다.
3. `functions/api/subscription/cancel.js`, `functions/api/device/deactivate.js`, `functions/api/rpc/user/delete.js` 등은 본문에서 받은 사용자·구독·기기 ID를 서버에서 인증된 주체와 비교해야 한다. 서비스 권한 키는 서버에만 있어도 호출자 권한 검사가 빠지면 안전하지 않다.
4. `functions/api/admin/users.js`에는 `checkAdminAuth` 호출이 없고, `functions/api/admin/admins.js` 및 `functions/api/admin/common-codes/*`는 클라이언트 제공 `adminId`로 권한을 판별한다. 서버에서 검증한 토큰의 사용자 ID와 MFA 상태를 사용해야 한다. 관리자 화면의 레이아웃 가드는 API 보호를 대신할 수 없다.
5. 관리자 사용자 일괄 조회는 DB 전체 사용자·구독·활성화를 가져온 뒤 메모리에서 필터·페이지를 나눈다. 서버 측 필터·페이지와 필요한 컬럼만 선택하도록 바꾼다.
6. `frontend/src/lib/supabaseAdmin.ts`는 서비스 키가 없을 때 공개 anon 키로 대체한다. 필수 서버 설정이 빠졌을 때는 명시적으로 실패해야 한다. 일부 운영 Function에도 프로젝트 URL·공개 키 하드코딩 폴백이 있다.

## 공통 요청 처리 계약

1. 브라우저는 Supabase 로그인 토큰을 `Authorization: Bearer`로 API에 보낸다. 본문의 `user_id`·`adminId`는 권한의 근거로 사용하지 않는다.
2. 서버는 Supabase Auth로 토큰을 검증하고 사용자 ID를 얻는다. 관리자 API는 같은 사용자 ID로 DB에서 역할을 조회한다. MFA가 필요한 작업은 **검증된** 토큰의 인증 수준을 확인한다.
3. 검증된 ID로 파라미터를 검사하고 서버 측에서 소유권을 확인한다. DB 접근은 파라미터 바인딩 SQL만 사용한다.
4. 읽기는 공통 `withDb` 헬퍼, 복수 변경은 공통 `withTransaction` 헬퍼를 사용한다. DB 연결 오류나 필수 환경변수 누락은 실패로 응답하고 성공처럼 빈 배열을 반환하지 않는다.
5. API 응답은 `401` 인증 없음, `403` 권한 없음, `404` 소유한 대상 없음, `409` 상태 충돌, `500/503` 서버·DB 오류로 구분한다. 비밀키와 원시 DB 오류는 응답에 포함하지 않는다.
6. Auth Admin API와 DB가 함께 필요한 명령은 DB 작업과 외부 Auth 작업의 경계를 문서화한다. 불가능한 전역 원자성을 약속하지 않고 재시도 가능한 상태 전이를 설계한다.

## 적용 순서

### 1. 대시보드

- 공통 `pg` 연결/트랜잭션·토큰 검증 헬퍼를 만들고, 인증된 사용자만 자신의 대시보드 데이터를 읽도록 한다.
- `GET /api/dashboard/overview`는 읽기만 수행한다. 구독 만료 정리와 첫 READER 생성은 별도의 명시적 쓰기 명령으로 옮기고 한 DB 트랜잭션으로 처리한다. 동시 요청에서 READER 중복 생성을 막는 DB 제약 또는 트랜잭션 잠금도 확인한다.
- 기존 구독 생성·해지, 데스크톱 활성화, 기기 해제, 회원 탈퇴의 업무 테이블 변경을 차례로 한 트랜잭션으로 교체한다. 클라이언트가 넘긴 ID마다 소유권을 재검증한다.
- 웹/로컬 Next 개발 경로의 응답 계약을 동일하게 맞춘 후 UI에서 직접 `supabase.from('users'/'common_codes')` 조회를 제거한다.
- 익명·타 사용자 접근, 중복 클릭/동시 요청, 중간 쿼리 실패 후 롤백, 연결 종료, 빈 이력/DB 오류 구분을 검증한다.

### 2. 관리자

- 모든 `/api/admin/*` 라우트에 공통 인증·역할·MFA 가드를 적용한다. 우선 사용자 목록/상태 변경/관리자 계정/공통코드 경로를 잠근다.
- 화면의 직접 Supabase 테이블 호출을 관리자 API로 모으고 서버가 검사한 주체 ID를 감사 로그에 기록한다.
- DB 내 세션 변경+감사 로그, 코드 그룹+코드, 구독 상태 변경은 한 트랜잭션으로 처리한다. Auth 사용자 생성·정지 등 외부 작업은 별도 상태 전이·재시도 규칙을 둔다.
- 사용자 목록은 서버 측 필터·페이지 처리로 바꾼다. 관리자 블로그의 인증·트랜잭션 패턴도 공통 헬퍼로 옮긴다.

### 3. 나머지 기능

FAQ·문의·프로모션·비밀번호·라이선스·블로그 등 서버 업무 테이블 접근을 같은 계층으로 이전한다. Pages Function 소스는 한 위치만 유지하고 빌드 단계 복제를 제거한다. 완료 후 오래된 Supabase REST 데이터 접근과 중복 Next 구현을 정리한다.

## 검증 기준

- 인증 없는 요청과 다른 사용자의 ID를 넣은 요청은 DB를 읽거나 바꾸지 못한다.
- 한 업무 명령이 실패하면 그 명령의 DB 변경과 감사 로그가 모두 롤백된다.
- 대시보드 조회는 상태를 바꾸지 않으며, READER 생성은 동시 요청에도 1건만 남는다.
- 로컬·운영 API의 입력/응답 계약이 같고, 필수 DB 바인딩 누락 시 명확히 실패한다.
- 관리자 목록/작업은 역할·MFA 검증을 거치며 브라우저의 `adminId` 변경으로 권한을 얻을 수 없다.
