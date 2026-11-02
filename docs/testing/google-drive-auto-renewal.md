# Google Drive 서버 OAuth 및 자동 연장

## 설정

기존 변수 이름을 사용한다. 값은 소스나 로그에 기록하지 않는다.

| 변수 | 로컬 Next 개발 서버 | 운영 Cloudflare Pages |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | `frontend/.env.local` | Variables / Secrets |
| `GOOGLE_CLIENT_SECRET` | `frontend/.env.local`, 서버 전용 | Secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | `http://localhost:3100/api/gdrive/oauth/callback` | `https://onrivi.com/api/gdrive/oauth/callback` |

동일한 웹 OAuth 클라이언트의 승인된 리디렉션 URI에 두 주소를 등록한다.
Cloudflare는 기존 `R2_BUCKET` 바인딩을 사용한다. 새 DB 스키마는 필요하지 않다.

## 인증 및 보관

- `/api/gdrive/oauth/start`: 상태 쿠키와 PKCE를 만들고 Google 인증으로 이동.
- `/api/gdrive/oauth/callback`: 코드를 서버에서 교환하고 갱신 토큰을 AES-GCM으로 암호화해 보관.
- `/api/gdrive/oauth/refresh`: 저장된 갱신 토큰으로 새 접근 토큰을 발급.
- `/api/gdrive/oauth/status`: 웹 팝업의 opener가 브라우저 정책으로 끊긴 경우, 이번 인증의 nonce와 쿠키를 확인해 완료 여부 전달.
- `/api/gdrive/oauth/exchange`: 데스크톱의 60초 유효 티켓과 별도 검증값으로 연결 식별자 전달.
- `/api/gdrive/oauth/disconnect`: 해당 서버 세션 삭제.

운영 저장 경로는 R2의 `_drive-oauth/`이며, 로컬은 `frontend/.tmp/drive-oauth/`이다.
로컬 경로는 Next 서버를 frontend에서 실행한 경우 기준이다.
암호화 키는 서버의 `GOOGLE_CLIENT_SECRET`에서 용도를 구분해 파생한다.
클라이언트 시크릿을 교체하면 기존 연결은 다시 인증해야 한다.
서버 세션은 90일 후 만료되며 Google이 권한을 취소하면 그 전에 종료될 수 있다.

웹은 HttpOnly 쿠키로, 데스크톱은 Electron safeStorage로 암호화된 연결 식별자로 서버에 접근한다.
데스크톱 저장 파일은 사용자 데이터 폴더의 `gdrive-oauth-session.enc`이다.
갱신 토큰과 클라이언트 시크릿은 렌더러, 로컬 저장소, 콜백 URL에 전달하지 않는다.
데스크톱 루프백에는 단기 티켓과 상태값만 전달하고 PKCE 검증 후 교환한다.

## 적용 순서

1. 운영 서버 변수와 Google 리디렉션 URI를 확인한다.
2. 웹 프런트엔드 및 루트 `functions/`를 함께 배포한다.
3. 데스크톱 프런트엔드를 빌드하고 main/preload 및 `electron/gdriveOAuth.cjs`를 함께 반영한다.
4. 앱을 재시작하고 Google Drive 연결 버튼으로 한 번 다시 인증한다.
   기존 접근 토큰만으로는 갱신 토큰을 생성할 수 없다.

데스크톱 개발 실행은 `http://localhost:3100`, `electron:prod`와 패키지 앱은 `https://onrivi.com`을 사용한다.
이전 `/auth/google-drive-desktop` 페이지는 새 인증 흐름에서 사용하지 않는다.

## 자동 연장 정책

- 발급된 만료 시각의 3분 전부터 1초 전까지만 자동 갱신 시도.
- 화면이 보이고 최근 60초 내 실제 키 입력, 클릭, 휠, 입력, 터치가 있으면 사용 중으로 판단.
- 갱신 전에 변경된 문서를 저장하고 완료를 기다림. 실패하면 갱신을 보류하고 남은 시간 안에서 재시도.
- 비활성 상태에서도 만료 3분 전에 저장을 시도하며 먼저 로컬 초안을 보존.
- 저장 중 새로 입력한 내용이나 실패한 문서를 저장 완료로 표시하지 않음.
- 성공한 정기 저장/연장은 팝업을 띄우지 않으며 인증 만료 안내는 중복 억제.
- 네트워크 장애나 Google 권한 취소 시 클라우드 저장/연장을 보장할 수 없으며 로컬 초안을 유지.
- 만료 후에는 시간 창 밖에서 자동 재인증하지 않음. 연결 버튼으로 다시 인증.

## 검증

```text
node scripts/check-drive-server-oauth.cjs
node scripts/check-drive-desktop-oauth.cjs
node scripts/check-drive-active-renewal.cjs
node scripts/check-drive-auth-notices.cjs
node frontend/node_modules/typescript/bin/tsc --noEmit --project frontend/tsconfig.json
```

서버 및 Electron 검사는 Google API와 OS 저장소의 모의 구현을 사용한다.
실제 Google 계정의 동의 화면, 운영 R2 및 Electron OS 저장소 통합은 배포 후 별도 확인한다.
로컬 인증 시작 경로는 Google에 토큰을 요청하지 않고 302 응답의 목적지·콜백·offline·PKCE·쿠키를 확인할 수 있다.

수동 확인: 최초 재인증 → 문서 수정 → 만료 3분 전부터 계속 입력 → 저장 상태 확인 →
토큰 만료 시각 연장 확인 → 앱을 비활성으로 두고 다음 만료 때 연장하지 않는지 확인.
Google OAuth 앱이 외부 사용자용 Testing 상태이면 Drive 권한의 갱신 토큰은 일반적으로 7일 후 만료되므로 게시 상태도 확인한다.
