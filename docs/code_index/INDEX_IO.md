# 입출력 및 연동 영역 세부 코드 인덱스 (INDEX_IO)

## 1. 입출력 핵심 코드 인덱스 테이블 (클래스/메소드 상세)

| 인덱스 ID | 소속 파일 | 소속 클래스 / 모듈 | 소속 함수 및 메소드 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ONR-IO-001]`** | [MainEditorApp.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MainEditorApp.tsx) | `MainEditorApp` 컴포넌트 | `handleFileOpenByPath` | 애드온/웹 환경에서 트리 샌드박스를 우회하여 빌트인 docs/ 정적 리소스를 fetch하고 새 탭으로 여는 폴백 로직 | `[ONR-BLD-001]` |
| **`[ONR-IO-002]`** | [vfsHelper.ts](file:///d:/developer/OnriviMarkDown/frontend/src/lib/vfsHelper.ts) | VFS 입출력 모듈 | `vfsReadFile` / `vfsWriteFile` | 브라우저/확장프로그램 샌드박스 환경에서 사용되는 파일 내용 임시 가상 VFS 처리 | - |
| **`[ONR-IO-003]`** | [secureStorage.ts](file:///d:/developer/OnriviMarkDown/frontend/src/lib/secureStorage.ts) | 보안 스토리지 모듈 | `saveSecureData` / `loadSecureData` | 중요 사용자 로컬 스토리지 데이터 및 설정 값을 Base64 난독화 기법으로 임시 저장하고 읽어들이는 유틸리티 | - |
| **`[ONR-IO-004]`** | [api.ts](file:///d:/developer/OnriviMarkDown/frontend/src/lib/api.ts) | API 주소 빌더 모듈 | `getApiUrl` | 포트 충돌 방지용 브라우저 프로토콜 및 개발/운영 세션 도메인 판별 핸들러 | - |
| **`[ONR-IO-005]`** | [MainEditorApp.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MainEditorApp.tsx) | `MainEditorApp` 컴포넌트 | `saveFile` (비동기 메소드) | 워크스페이스 성격에 매칭하여 로컬/원격/VFS 스토리지에 파일 저장 프로세스 진행 | `[ONR-IO-002]` |

---

## 2. 세부 분석 및 메소드 명세

### `[ONR-IO-001]` 브라우저/애드온 환경 docs 파일 fetch 폴백
* **구조적 위치**:
  * 컴포넌트: `MainEditorApp`
  * 대상 메소드: `handleFileOpenByPath = async (resolvedPath: string): Promise<void>`
* **매개변수 (Input)**: `resolvedPath: string` (탐색기에서 분석된 상대/절대 파일 주소)
* **반환값 (Output)**: `Promise<void>`
* **내부 예외처리**:
  * fetch 실패(네트워크 단절 등) 시 catch 블록에서 에러 메시지를 수집하고 무음 처리.

### `[ONR-IO-002]` 가상 VFS (Virtual File System) 입출력
* **구조적 위치**:
  * 모듈: `vfsHelper`
  * 대상 메소드: `vfsReadFile(path: string): string` / `vfsWriteFile(path: string, content: string): void`
* **매개변수 (Input)**: `path: string`, `content: string`
* **반환값 (Output)**: 파일 내용 문자열 (읽기) / 없음 (쓰기)
* **내부 예외처리**: SSR 등 빌드 단계의 window 객체 부재 시 자동 스킵 방어구 탑재.

### `[ONR-IO-003]` 안전 난독화 저장소 연동
* **구조적 위치**:
  * 모듈: `secureStorage`
  * 대상 메소드: `saveSecureData(key: string, value: any): void` / `loadSecureData(key: string)`
* **매개변수 (Input)**: `key: string`, `value: any`
* **반환값 (Output)**: 복호화된 JSON 객체 타입 `T` 또는 `null`
* **내부 예외처리**: 암호화 블록 복호화 시 솔트 불일치나 문자열 변조 시 파싱 예외를 캐치하여 안전하게 `null` 리턴.

### `[ONR-IO-004]` 백엔드 API 기본 URL 계산 헬퍼
* **구조적 위치**:
  * 모듈: `api`
  * 대상 메소드: `getApiUrl(path: string): string`
* **매개변수 (Input)**: `path: string` (API 엔드포인트 세부 경로)
* **반환값 (Output)**: `string` (완성된 서버 도메인 포함 절대 주소)

### `[ONR-IO-005]` 파일 저장 메소드
* **구조적 위치**:
  * 컴포넌트: `MainEditorApp`
  * 대상 메소드: `saveFile = useCallback(async (targetContent: string, targetFile: FileNode | null): Promise<boolean>`
* **매개변수 (Input)**: `targetContent: string`, `targetFile: FileNode | null`
* **반환값 (Output)**: `Promise<boolean>` (저장 성공 여부)
* **내부 예외처리**:
  * 크롬 확장프로그램 파일 핸들 권한 만료 또는 쓰기 거부 시 토스트 알림으로 경고 표출 후 `false` 리턴.
* **의존성 영향 범위**:
  * `vfsHelper.ts` (브라우저 모드 저장 시 VFS 가상 디렉토리 파일 업데이트)
  * `UnifiedTabBar` (저장 성공 시 해당 탭의 `isModified: false` 수정 상태 리셋)
