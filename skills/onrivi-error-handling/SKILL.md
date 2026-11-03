---
name: onrivi-error-handling
description: OnriviAuthor의 API 예외 처리, 클라이언트 오류 진단, 소스 위치 추적, 시스템 로그 30일 보관 및 사용자 오류 알림 표준을 적용한다.
---

# OnriviAuthor 오류 처리 및 정밀 진단 로깅 표준

## 1. 핵심 원칙: 로그 선제 기록 원칙 (Log-First Principle)

- 모든 오류 처리(`catch` 블록, 유효성 검증 실패, HTTP 실패 응답)에서 **사용자 알림(토스트, 모달)을 띄우거나 응답(Response)을 반환하기 전에, 반드시 콘솔과 시스템 로그에 오류 상세 정보를 먼저 기록**해야 한다.
- 오류를 조용히 삼키거나(`catch {}`), 로그 없이 단순 토스트만 호출하는 행위를 원천 금지한다.

---

## 2. 5대 정밀 진단 메타데이터 규격 (정확한 소스 위치 및 작업 행위 명시)

오류 발생 사실만으로는 원인 파악이 어려우므로, 모든 오류 기록 시 아래 **5대 필수 진단 필드**를 반드시 포함한다:

| 필드 | 설명 | 작성 기준 |
| :--- | :--- | :--- |
| **`file`** | 오류가 발생한 소스 파일 상대 경로 | 예: `frontend/src/hooks/useFileExplorer.ts` |
| **`func`** | 오류가 포착된 함수 또는 컴포넌트명 | 예: `connectGoogleDrive` |
| **`doing`** | 🎯 **정확히 "무엇을 하던 중이었는지" 구체적 행위** | 예: `구글 드라이브 OAuth 토큰 검증 및 사용자 계정 정보 조회 중` |
| **`target`** | 작업 대상 데이터 식별자 | 예: `파일명('문서.md')`, `폴더ID('1xAbC...')`, `회원ID` |
| **`error`** | 포착된 원본 Error 객체 또는 상세 원인 | `err.message`, `err.stack`, HTTP 상태 코드 |

---

## 3. 프론트엔드 오류 처리 표준 (`errorDiagnostics.ts`)

- 프론트엔드의 모든 예외 처리는 `frontend/src/lib/errorDiagnostics.ts`의 `logError` 또는 `logWarn`을 호출하여 콘솔 및 R2 시스템 로그에 선제 기록한다.

```typescript
import { logError } from '@/lib/errorDiagnostics';

try {
  // 비즈니스 로직 실행
} catch (err) {
  // 1. [로그 선제 기록] 소스 위치 및 정확한 작업 맥락 기록
  logError({
    file: 'useFileExplorer.ts',
    func: 'connectGoogleDrive',
    doing: '구글 드라이브 토큰 유효성 검증 및 계정 정보 확인 중',
    error: err,
    target: selectedFolder?.name,
    context: { workspaceType }
  });

  // 2. [사용자 안전 알림] 이후 사용자용 친절한 토스트 안내
  showToast('구글 드라이브 연결에 실패했습니다. 다시 시도해 주세요.', 'error');
}
```

- `showToast(msg, 'error')` 및 `showToast(msg, 'warning')` 내부에서도 화면 표출 직전에 상위 호출 소스 파일과 작업 행위를 콘솔에 자동 기록한다.

---

## 4. 백엔드 서버 오류 처리 (`_server-error.js`)

- 예기치 않은 서버 오류는 `functions/api/_server-error.js`의 `serverError(request, error, { source, stage, doing, target, message })`를 사용한다.
- `doing` 필드에 "회원 결제 정보 검증 중", "구독 만료일 연장 DB 트랜잭션 중" 등 비즈니스 행위를 명시한다.
- 클라이언트에는 안전한 한국어 메시지, 안정적인 오류 코드(`SERVER_ERROR`), 요청 ID(`requestId`)만 반환하며, 내부 DB 스택이나 원문 SQL은 클라이언트에 노출하지 않는다.
- 비즈니스 유효성 검증 실패(400, 401, 403, 404) 응답을 반환할 때도, 반환 직전 `console.warn`으로 `requestId`, 라우트명, 실패 사유를 콘솔에 선제 기록한다.

---

## 5. 프로덕션/미리보기 환경 분리 및 30일 보관 정책 (Retention Policy)

- **환경별 저장 경로 분리**:
  - **프로덕션(운영)**: `_system-logs/prod/YYYY-MM-DD/` (도메인: `onrivi.com`, `www.onrivi.com`)
  - **미리보기/개발(Preview)**: `_system-logs/preview/YYYY-MM-DD/` (도메인: `*.pages.dev`, `localhost` 등)
  - 요청 호스트명에 따라 자동 분기되어 실운영 모니터링 통계와 테스트 로그가 섞이지 않는다.
- **30일 동일 보관 주기**:
  - 프로덕션과 미리보기 모두 `_system-logs/` 하위에 위치하므로, Cloudflare R2 버킷 30일 수명 주기(Lifecycle Rule)에 의해 **두 환경 모두 30일 경과 시 100% 동일하게 자동 영구 삭제**된다.
  - 관리자 대시보드 API(`DELETE /api/admin/system?days=30`) 역시 두 환경의 오래된 로그를 일괄 정리한다.

---

## 6. 보안 및 민감정보 보호 원칙

- 콘솔 및 원격 R2 로그에는 **비밀번호, 구글 OAuth 토큰(Bearer/Access/Refresh), API 키, 개인 이메일 주소, 로컬 PC 절대 경로, DB 연결 문자열**을 일체 평문으로 저장하지 않으며, 자동으로 `[가림]` 마스킹 처리한다.
- PostgreSQL SQLSTATE와 고정된 위치 정보 등 진단에 필요한 최소 메타데이터만 기록한다.

---

## 7. 코드 변경 시 확인 체크리스트

1. **로그 선제 기록**: 오류 발생 시 알림/응답 전에 `logError` 또는 `console.error`가 먼저 호출되는가?
2. **구체적 행위 명시**: `doing` 필드에 단순 '에러 발생'이 아닌 '무엇을 하던 중이었는지' 명확히 기술되었는가?
3. **소스 위치 식별성**: 파일명(`file`)과 함수명(`func`)이 누락 없이 기록되는가?
4. **민감정보 마스킹**: 토큰, 비밀번호, 이메일, PC 경로가 콘솔/로그에 노출되지 않는가?
5. **환경 분리 및 30일 보관 준수**: 프로덕션(`prod`)과 미리보기(`preview`)가 올바른 접두사로 분기되며 30일 후 자동 삭제 규칙을 따르는가?

---

## 8. R2 로그 적재 토글 스위치 (ENABLE_R2_LOGS)

- Cloudflare Pages의 실시간 로그(Workers & Pages Logs) 및 콘솔 출력을 기본으로 활용하며, R2 버킷 파일 적재는 환경변수 ENABLE_R2_LOGS === 'true'일 때만 활성화된다.
- **기본 상태 (ENABLE_R2_LOGS 미설정 또는 alse)**:
  - _middleware.js 및 client-log.js에서 R2 쓰기(R2_BUCKET.put())를 일체 수행하지 않아 스토리지 용량 및 쓰기 연산(Class A Operations)을 완전히 차단한다.
  - 모든 오류 및 경고는 표준 console.error / console.warn을 통해 Cloudflare 실시간 로그 모니터에 정상 전송된다.
- **활성화 상태 (ENABLE_R2_LOGS === 'true')**:
  - 파일 다운로드 및 R2 영구 저장이 필요할 때만 Cloudflare Pages 환경변수에 ENABLE_R2_LOGS=true를 설정하여 30일 보관 로그 파티셔닝을 재개한다.
