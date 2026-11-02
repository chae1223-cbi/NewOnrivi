---
name: onrivi-error-handling
description: OnriviAuthor의 API 예외 처리, 오류 응답, 로그, 사용자 오류 알림을 수정할 때 공통 요청 ID와 안전한 진단 정보 규칙을 적용한다.
---

# OnriviAuthor 공통 오류 처리

## 서버 오류

- 예기치 않은 서버 오류는 `functions/api/_server-error.js`의 `serverError(request, error, { source, stage, message })`를 사용한다. 미러 `frontend/functions/api/_server-error.js`도 동기화한다.
- `source`는 실제 소스 파일 경로, `stage`는 실패한 처리 단계로 정적인 값을 지정한다. 오류 문자열이나 사용자 입력을 이 필드에 넣지 않는다.
- 클라이언트에는 안전한 한국어 메시지, 안정적인 오류 코드, 요청 ID만 반환한다. 예외 원문, SQL, 스택, 연결 문자열, 토큰, 개인정보를 응답에 포함하지 않는다.
- 인증·입력 오류와 예상 가능한 업무 거절은 적절한 HTTP 상태와 명시적 업무 코드로 처리한다. 예상 가능한 오류를 모두 500으로 바꾸지 않는다.
- 트랜잭션 내부의 DB 예외는 롤백 뒤 상위로 전파해 공통 처리한다. 예외를 삼키고 성공 응답을 보내지 않는다.

## 진단 정보와 사용자 알림

- `functions/api/_middleware.js`가 생성한 요청 ID를 응답 `X-Request-ID`와 R2 시스템 로그의 `request_id`로 연결한다. 공통 처리에서 기록한 `source_file`, `source_function`, PostgreSQL `db_code`는 관리자 로그에서 확인한다. 내부 진단 헤더는 클라이언트에 노출하지 않는다.
- 사용자에게 실패를 알리는 UI는 API의 안전한 메시지와 요청 ID를 표시한다. 운영자는 관리자 시스템 로그에서 해당 ID로 검색한다.
- 로그에는 원문 요청/응답 본문, SQL 매개변수, 인증 정보, 개인 식별 정보, DB 연결 문자열을 저장하지 않는다. PostgreSQL SQLSTATE와 고정된 처리 위치 등 진단에 필요한 최소 메타데이터만 기록한다.
- 현재 공통 처리 적용 사례는 `functions/api/subscription/create.js`와 `functions/api/admin/users/plan.js`다. 다른 라우트를 수정할 때 기존 응답 계약을 확인하고 같은 패턴으로 확장한다.

## 변경 시 확인

실패 응답의 요청 ID와 저장된 로그 ID가 일치하는지, 내부 헤더가 제거되는지, 사용자 알림에 요청 ID가 표시되는지 확인한다. DB 오류를 다루면 `skills/onrivi-db-processing/SKILL.md`도 적용한다.
