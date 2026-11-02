# 애플리케이션 코어 영역 세부 코드 인덱스 (INDEX_APP)

## 1. 앱 핵심 코드 인덱스 테이블 (클래스/메소드 상세)

| 인덱스 ID | 소속 파일 | 소속 클래스 / 컴포넌트 | 소속 함수 및 메소드 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ONR-APP-001]`** | [MainEditorApp.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MainEditorApp.tsx) | `MainEditorApp` 컴포넌트 | `switchTab` / `closeTab` / `createNewTab` | 전역 상태 라이프사이클 관리 및 Monaco 에디터 인스턴스 조율 메인 컨트롤러 | `[ONR-UI-001]`, `[ONR-IO-001]` |

---

## 2. 세부 분석 및 메소드 명세

### `[ONR-APP-001]` 메인 에디터 애플리케이션 프레임워크 컨트롤러
* **구조적 위치**:
  * 컴포넌트: `MainEditorApp`
  * 대상 메소드:
    * `switchTab = useCallback((tabId: string): void => { ... })`
    * `closeTab = useCallback((tabId: string, event?: React.MouseEvent): void => { ... })`
    * `createNewTab = useCallback((initialContent?: string, name?: string): void => { ... })`
* **호출 흐름**:
  ```
  [탭 닫기 클릭 시의 상태 전이]
       └─> MainEditorApp.tsx: closeTab(tabId) 호출
       └─> MainEditorApp.tsx: tabToClose.isModified 저장여부 검사
       └─> MainEditorApp.tsx: performClose() 내부 메소드 실행
       └─> MainEditorApp.tsx: tabToClose.model.dispose() 호출 (모나코 에디터 모델 소멸 처리)
       └─> MainEditorApp.tsx: setTabs(nextTabs) 상태 반영
       └─> MainEditorApp.tsx: 다른 활성 탭으로 switchTab(nextActiveTab.id) 포커스 이동
  ```
* **동작 상세**:
  프로젝트의 허브 역할을 하며, Monaco 에디터의 모델 생성 및 소멸(garbage collection), 브라우저 로컬 스토리지 데이터 자동 백업 타이머 작동 등 핵심 라이프사이클을 통제하는 중추 메소드군입니다.
