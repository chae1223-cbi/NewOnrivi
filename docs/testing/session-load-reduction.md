# 세션 확인 요청 통합 및 부하 절감

## 변경

- 새 웹 클라이언트는 루트 `WebSessionRevocationGuard` 하나가 `/api/license/check-session`을 호출한다.
- 편집기는 결과 이벤트를 받아 상태를 갱신하며, 별도의 웹 하트비트를 만들지 않는다.
- 데스크톱은 같은 주기 조절기를 사용하되 자체 확인 요청을 수행한다.
- 기존 `/api/device/session-status`는 이전 클라이언트 호환을 위해 남기지만 새 클라이언트에서는 호출하지 않는다.
- 활성 화면 60초, 비활성 화면 90초를 기준으로 0~5초 분산 시간을 더한다.
- 화면 복귀·온라인 복구 시 확인하되 최근 10초 내 확인은 합치고 동시 요청은 하나만 허용한다.
- 통신 실패 시 간격을 늘린다. 최대 기본 간격은 240초이며 실패만으로 로그아웃하지 않는다.
- 신규 접속 시 기존 웹 세션을 정리하는 기준을 로컬·운영 모두 2분에서 5분으로 맞췄다.

## 서버

- 구독·세션 조회와 필요한 생존 시각 갱신을 한 SQL 문장으로 처리한다.
- 같은 행의 갱신은 55초 이상 지났을 때만 수행한다. 요금제 권한 회수는 즉시 반영한다.
- 하트비트는 DB에서 비활성화된 세션을 활성화하지 않는다.
- JWT가 있는 웹 요청은 검증된 사용자 소유권으로 조회한다. 이전 클라이언트와 데스크톱의 payment/device 조회는 기존 호환 경로를 유지한다.
- Supabase `getClaims()`로 서명을 검증한다. 비대칭 키는 SDK의 JWKS 캐시를 사용한다.
- 기존 HS256 토큰은 Supabase Auth에서 검증한다. 검증에 성공한 결과만 최대 60초 캐시하며 토큰 자체의 만료를 넘기지 않는다.
- 복호화만 한 JWT를 인증으로 사용하지 않는다. issuer, audience, role, 사용자 ID 및 만료도 확인한다.

## 상태 구분

| 결과 | 처리 |
| --- | --- |
| ACTIVE | 편집 권한 유지 |
| RESTRICTED | 다른 접속의 권한 인수 또는 제한 상태 유지, 자동 승격 금지 |
| PLAN_EXPIRED | 요금제 만료/편집 불가 상태, 동시 접속 초과와 구분 |
| TERMINATED | 삭제된 세션 처리 |
| idle_expired | 오래 활동하지 않았다는 정보. DB의 권한 회수 여부와 별도로 판정 |

오래 중단된 브라우저가 돌아왔을 때 행이 여전히 활성이라면 생존 시각을 갱신할 수 있다.
다른 접속이 그 사이 행을 비활성화하거나 삭제했다면 하트비트가 되살리지 않는다.

## 예상 요청량

기존 탭당 분당 15회(5초 확인 + 20초 확인)에서 새 활성 탭은 약 1회로 줄어든다.
이는 요청 횟수 기준 약 93% 감소이며 전체 서버 CPU·DB 부하 감소율을 측정한 값은 아니다.
세션 회수 반영은 보통 다음 확인 시점까지 약 60~95초 걸릴 수 있으며, 네트워크 장애 시 더 늦어질 수 있다.

## 검사

```text
node scripts/check-session-polling.cjs
node scripts/check-unified-session.cjs
node scripts/check-session-auth.cjs
node frontend/node_modules/typescript/bin/tsc --noEmit --project frontend/tsconfig.json
```

`check-session-auth.cjs`는 실제 ES256 서명과 공개키 검증을 사용하되 키 서버·구형 Auth 응답은 모의 구현이다.
`check-session-query-plan.cjs`는 로컬 `.env.local`의 DB 연결을 사용해 읽기 전용 트랜잭션 안에서 EXPLAIN만 실행한다.
EXPLAIN ANALYZE가 아니므로 heartbeat UPDATE를 실행하지 않고 스키마·타입·문법을 확인한다.

운영 반영 시 프런트엔드와 Functions를 함께 배포하고 기존 브라우저는 새로고침한다.
`frontend/functions/api/license/`와 루트 `functions/api/license/`를 같이 유지한다.
데스크톱에는 새 프런트엔드 번들을 반영해야 한다. DB 마이그레이션은 필요하지 않다.
실제 동시 접속 부하 및 장시간 백그라운드 복귀 검증은 운영에 준하는 환경에서 별도로 수행한다.
