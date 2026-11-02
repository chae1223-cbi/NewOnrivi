# UI 영역 세부 코드 인덱스 (INDEX_UI)

## 1. UI 핵심 코드 인덱스 테이블 (클래스/메소드 상세)

| 인덱스 ID | 소속 파일 | 소속 클래스 / 컴포넌트 | 소속 함수 및 메소드 | 핵심 로직 및 기능 설명 | 연관 ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`[ONR-UI-001]`** | [Toolbar.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/Toolbar.tsx) | `Toolbar` | `ToolbarButton` (onAction) | 마크다운 전체 복사 버튼 클릭 이벤트 맵핑 | - |
| **`[ONR-UI-002]`** | [LeftSidebar.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/LeftSidebar.tsx) | `LeftSidebar` | `onFileOpenAndJump` (비동기 콜백) | 파일명 및 텍스트 기반 전체 검색 패널 연동 및 더블클릭 이동 로직 | `[ONR-APP-001]` |
| **`[ONR-UI-003]`** | [MenuBar.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/MenuBar.tsx) | `MenuBar` | `MenuDropdown` (onClick) | 다크 모드 토글 및 파일 내보내기 서브메뉴 트리거 연동 | - |
| **`[ONR-UI-004]`** | [UnifiedTabBar.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/UnifiedTabBar.tsx) | `UnifiedTabBar` | `onSwitchTab` / `onCloseTab` | 복수 문서 탭 간 전환 및 개별 탭 닫기 디스패치 연동 | `[ONR-APP-001]` |
| **`[ONR-UI-005]`** | [FileTreeItem.tsx](file:///d:/developer/OnriviMarkDown/frontend/src/components/FileTreeItem.tsx) | `FileTreeItem` | `handleClick` | 파일 탐색기 트리의 특정 노드 클릭 및 폴더 지연로딩 / 파일 로드 트리거 | `[ONR-APP-001]` |

---

## 2. 세부 분석 및 메소드 명세

### `[ONR-UI-001]` 툴바 마크다운 복사 연동
* **구조적 위치**: 
  * 컴포넌트: `Toolbar`
  * 대상 핸들러: `ToolbarButton` 내부의 `onMouseDown` -> `dispatch('COPY_ALL')`
* **호출 흐름**:
  ```
  [사용자 클릭: 복사 버튼] 
       └─> Toolbar.tsx: ToolbarButton -> onMouseDown(e)
       └─> Toolbar.tsx: e.preventDefault() (포커스 유지)
       └─> MainEditorApp.tsx: copyAll() 헬퍼 함수 실행 (클립보드 writeText)
  ```

### `[ONR-UI-002]` 왼쪽 사이드바 전체 검색 연동
* **구조적 위치**: 
  * 컴포넌트: `LeftSidebar`
  * 대상 메소드: `GlobalSearch` 내의 `onFileOpenAndJump` 비동기 훅 
* **호출 흐름**:
  ```
  [검색 결과 더블클릭] 
       └─> LeftSidebar.tsx: onFileOpenAndJump(filePath, lineNumber)
       └─> MainEditorApp.tsx: handleFileOpenByPath(filePath)
       └─> MainEditorApp.tsx: switchTab(tabId) 혹은 createNewTab()
       └─> MainEditorApp.tsx: scrollToLine(lineNumber) 호출
  ```

### `[ONR-UI-003]` 상단 메뉴바 제어
* **구조적 위치**: 
  * 컴포넌트: `MenuBar`
  * 대상 메소드: `MenuDropdown` 컴포넌트 바인딩 속성 `onClick`
* **호출 흐름**:
  ```
  [상단 메뉴 항목 선택]
       └─> MenuBar.tsx: MenuDropdown의 onClick 호출
       └─> MenuBar.tsx: dispatch('OPEN_EXPORT') 실행
       └─> MainEditorApp.tsx: setIsExportModalOpen(true) 상태 전이
  ```

### `[ONR-UI-004]` 통합 탭바 다중 문서 관리
* **구조적 위치**: 
  * 컴포넌트: `UnifiedTabBar`
  * 대상 메소드: `onSwitchTab(id)` 및 `onCloseTab(id, e)`
* **호출 흐름**:
  ```
  [탭 닫기 버튼 'x' 클릭]
       └─> UnifiedTabBar.tsx: onCloseTab(tab.id, e)
       └─> UnifiedTabBar.tsx: e.stopPropagation() (탭 선택 이벤트 전파 방지)
       └─> MainEditorApp.tsx: closeTab(tabId) -> performClose() 호출 및 탭 배열 필터링
  ```

### `[ONR-UI-005]` 파일 탐색기 노드 선택 제어
* **구조적 위치**:
  * 컴포넌트: `FileTreeItem`
  * 대상 메소드: `handleClick = (e: React.MouseEvent): void`
* **입력 데이터 (Input)**: `e: React.MouseEvent` (마우스 클릭 이벤트)
* **출력 데이터 (Output)**: 없음 (내부 상태 변경 및 외부 openFile 콜백 연동)
* **내부 예외처리 (Exception Handling)**:
  * 비동기 폴더 자식 리스크 로드(`onLazyLoad`) 실패 시 `.catch` 블록에서 `setIsLoading(false)` 복원 및 토스트에 실패 상태 노출.
* **의존성 영향 범위**:
  * `MainEditorApp` 컴포넌트의 `handleFileClick` 메소드 (파일 열기 실질 수행부)
