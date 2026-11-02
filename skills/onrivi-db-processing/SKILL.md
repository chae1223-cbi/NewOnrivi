---
name: onrivi-db-processing
description: OnriviAuthor의 서버 DB 접근, SQL, 트랜잭션, 데이터 변경 API를 수정할 때 PostgreSQL 처리 방식과 원자성 규칙을 적용한다.
---

# OnriviAuthor DB 처리

## 적용 범위

클라우드 서비스의 업무 데이터 조회·변경에 적용한다. 로컬 전용 SQLite 처리는 기존 `.agents/AGENTS.md`의 SQLite 규칙을 따르되, 이 스킬의 PostgreSQL 연결 방식을 강제로 적용하지 않는다. Supabase Auth의 사용자 인증 요청은 업무 테이블 DB 접근과 구분한다.

## 목표 방식

- 서버가 `pg`로 PostgreSQL에 직접 접근한다. 동일 업무의 테이블 접근을 Supabase REST, RPC, `pg`에 분산하지 않는다. 기존 REST/RPC 코드를 변경할 때는 실제 호출자와 응답 계약을 확인한 후 PostgreSQL 방식으로 옮긴다.
- DB 연결 문자열은 서버 환경에서만 읽는다. 기준 구현은 공통 모듈 `functions/api/_db.js`의 `withDbTransaction`(하위 호환 `withBlogTransaction` 지원)이며, 클라우드 API는 루트 `functions/api`를 단일 원본으로 관리하며 로컬 Next API 중복 구현을 만들지 않는다. Hyperdrive는 연결 경로일 뿐, 업무별 DB 처리 방식 전환기가 아니다.
- 업무 단위의 관련 조회·쓰기·감사 기록은 같은 PostgreSQL 연결과 단일 트랜잭션으로 처리한다. 중간 오류 시 전체 롤백하고 연결을 종료한다. 외부 API 호출이나 장시간 작업은 가능한 한 트랜잭션 시작 전에 끝낸다.
- 동시 변경 가능성이 있으면 해당 사용자/대상 행 잠금, 제약조건, 영향 행 수 검증을 검토한다. 쓰기 결과를 확인하지 않은 채 성공 응답을 보내지 않는다.
- SQL은 매개변수 바인딩을 사용한다. 테이블·열 이름을 요청 값에서 직접 조립하지 않는다. 코드값은 `.agents/AGENTS.md`의 대문자 규칙을 따른다.
- DB 함수와 라우트의 책임을 나눈다. 라우트는 인증·입력 검증·응답을 담당하고, 트랜잭션 안의 DB 작업은 한 흐름으로 읽히게 둔다. DB 내부 로직을 외부에서 볼 수 없는 RPC로 옮기지 않는다.

## 변경 시 확인

1. 호출자, 기존 응답 형식, 관련 테이블과 제약조건, 부분 성공 가능성을 확인한다.
2. 성공·검증 실패·DB 예외에서 트랜잭션 경계와 롤백을 확인한다. 비즈니스 거절은 명시적 상태·코드로 반환하고, 예외는 공통 오류 처리로 전달한다.
3. `skills/onrivi-error-handling/SKILL.md`를 함께 적용한다. 실제 DB 연결이 없는 테스트에서는 연결·쿼리·롤백 흐름을 검증하고, 운영 DB 변경은 별도 승인 없이 실행하지 않는다.

참고 구현: `functions/api/_db.js`, `functions/api/subscription/create.js`, `functions/api/admin/users/plan.js`.
