# OnriviAuthor 작업 지침

기존 프로젝트 규칙은 [.agents/AGENTS.md](.agents/AGENTS.md)를 따른다.

## 필수 스킬 참조

- 소스 코드를 생성·편집하거나 패치 이력 및 함수 주석을 작성하기 전에 [skills/onrivi-source-comments/SKILL.md](skills/onrivi-source-comments/SKILL.md)를 읽고 적용한다.
- DB 접근, SQL, 트랜잭션, DB 관련 API 또는 데이터 변경 로직을 편집하기 전에 [skills/onrivi-db-processing/SKILL.md](skills/onrivi-db-processing/SKILL.md)를 읽고 적용한다.
- 서버 또는 클라이언트의 오류 응답, 예외 처리, 오류 로그, 사용자 오류 알림을 편집하기 전에 [skills/onrivi-error-handling/SKILL.md](skills/onrivi-error-handling/SKILL.md)를 읽고 적용한다.
- 상태 코드, 요금제, 권한, 에러 코드 등 시스템/비즈니스 코드값이나 식별자를 참조·추가하기 전에 [skills/onrivi-common-codes/SKILL.md](skills/onrivi-common-codes/SKILL.md)를 읽고 적용한다. 신규 코드가 필요한 경우 임의 추가하지 않고 개발자 확인·승인을 거친다.
- 사용자 알림, 성공/경고/오류 메시지, 토스트 문구를 표시하거나 수정하기 전에 [skills/onrivi-message-handling/SKILL.md](skills/onrivi-message-handling/SKILL.md)를 읽고 적용한다. 신규 메시지 추가 및 문구 변경 시 개발자 확인·승인을 거친다.
- 주석 작성, DB 처리, 오류 처리, 공통코드, 메시지 처리는 상호 연관되므로 관련 작업 시 **필수 스킬들을 함께** 읽고 적용한다.
- 스킬의 적용 범위는 해당 작업에 한정한다. 기존 API 계약이나 인증 동작을 임의로 바꾸지 않는다.
