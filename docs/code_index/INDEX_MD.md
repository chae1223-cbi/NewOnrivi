# 마크다운 처리 및 스타일 영역 세부 코드 인덱스 (INDEX_MD)

## 1. 마크다운 핵심 코드 인덱스 테이블 (클래스/메소드 상세)

| 인덱스 ID | 소속 파일 | 소속 클래스 / 컴포넌트 | 소속 함수 및 메소드 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ONR-MD-001]`** | [MarkdownViewer.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MarkdownViewer.tsx) | `MarkdownViewer` 컴포넌트 모듈 | `remarkDisableIndentedCode` | 4칸 들여쓰기 시 코드 블록으로 잘못 렌더링되는 마크다운 스펙 규격을 차단하는 커스텀 플러그인 | - |
| **`[ONR-MD-002]`** ❌ DELETED | *MarkdownPageViewer.tsx* | — | — | (삭제됨 — 유저 수동 페이지 분할 .user-page-splitter로 전환) |
| **`[ONR-MD-003]`** | [CssStyleForm.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/CssStyleForm.tsx) | `CssStyleForm` | `triggerUpdate` / `onUpdateProfile` | 사용자가 실시간 편집하는 CSS 스타일시트 정보를 컴파일하여 미리보기에 적용하는 바인딩 | `[ONR-APP-001]` |
| **`[ONR-MD-004]`** | [MarkdownViewer.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MarkdownViewer.tsx) | `MarkdownViewer` | `TableWrapper` 컴포넌트 내부 | 표(table) 요소를 감싸고 스프레드시트 호환 규격(TSV)으로 클립보드 복사를 제공하는 고기능 래퍼 | - |

---

## 2. 세부 분석 및 메소드 명세

### `[ONR-MD-001]` 들여쓰기 코드 블록 인식 차단
* **구조적 위치**:
  * 모듈: `MarkdownViewer`
  * 대상 메소드: `remarkDisableIndentedCode(this: any): void`
* **매개변수 (Input)**: 마크다운 마이크로마크 프로세서 컨텍스트 (`this`)
* **반환값 (Output)**: 없음

### `[ONR-MD-002]` ❌ DELETED — 페이지 분할 뷰어

*삭제됨 — 유저 수동 페이지 분할(.user-page-splitter) 시스템으로 대체됨*

### `[ONR-MD-003]` 서식설정 CSS 실시간 컴파일 및 주입
* **구조적 위치**:
  * 컴포넌트: `CssStyleForm`
  * 대상 메소드: `triggerUpdate = (updated: CssProfile): void`
* **의존성 영향 범위**:
  * `MainEditorApp` 컴포넌트의 `onUpdateProfile` 및 미리보기 스타일 DOM 주입부.

### `[ONR-MD-004]` 표 데이터 래퍼 컴포넌트 및 클립보드 복사
* **구조적 위치**:
  * 모듈: `MarkdownViewer`
  * 대상 컴포넌트 및 메소드: `TableWrapper` 컴포넌트의 `handleCopy` 비동기 메소드
* **호출 흐름**:
  ```
  [표 위 복사 버튼 클릭]
       └─> MarkdownViewer.tsx: handleCopy() 호출
       └─> MarkdownViewer.tsx: tableRef DOM 요소 수집 및 텍스트 탭 분할 가공 (TSV 형식)
       └─> MarkdownViewer.tsx: navigator.clipboard.write(new ClipboardItem) 실행
       └─> MarkdownViewer.tsx: 복사 성공 시 2초간 텍스트 '복사 완료' 토글링
  ```
* **내부 예외처리**:
  * 브라우저에서 `ClipboardItem` API나 클립보드 쓰기 권한이 거부될 경우, 일반 텍스트 방식(`writeText`)으로 폴백(Fallback) 실행하여 저장 안전성을 극대화함.
