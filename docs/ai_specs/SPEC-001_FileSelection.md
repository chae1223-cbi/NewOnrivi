# [SPEC-001] 파일 트리 선택 및 에디터 연동

## 1. 개요 (Overview)
- **ID:** SPEC-001
- **Status:** Active
- **Version:** 1.0
- **Description:** 사용자가 사이드바의 파일 트리에서 특정 파일을 클릭했을 때, 해당 파일의 내용을 에디터에 로드하고 활성화 상태를 업데이트한다.

## 2. 기술 컨텍스트 (Technical Context)
- **Frontend:** React, TypeScript, TailwindCSS
- **State Management:** Zustand (또는 Context API - 현재 프로젝트 기준)
- **Components:** `FileTreeItem.tsx`, `Editor.tsx`
- **Related Files:** `frontend/src/components/FileTreeItem.tsx`

## 3. 데이터 스키마 (Data Schema)

```typescript
interface FileNode {
  id: string;       // 파일 경로 또는 고유 ID
  name: string;     // 표시될 파일 이름
  type: 'file' | 'directory';
  path: string;     // 전체 시스템 경로
  content?: string; // 파일 내용 (Lazy Loading 권장)
}

interface AppState {
  activeFileId: string | null;
  openFiles: FileNode[];
  setActiveFile: (id: string) => void;
}
```

## 4. 기능 명세 (Behavioral Specification - BDD)

### Case 1: 파일 클릭 시 활성화
- **Given:** 파일 트리에 `note.md` 파일이 존재하고 에디터가 비어 있는 상태
- **When:** 사용자가 `note.md` 아이템을 클릭(Click)하면
- **Then:** 
    1. `activeFileId`가 `note.md`의 ID로 변경된다.
    2. UI 상에서 해당 아이템에 하이라이트 스타일(예: `bg-accent`, `text-white`)이 적용된다.
    3. 에디터 영역에 해당 파일의 내용이 렌더링된다.

### Case 2: 폴더 클릭 시 동작
- **Given:** 폴더 형태의 아이템이 닫혀 있는 상태
- **When:** 폴더를 클릭하면
- **Then:** 
    1. 폴더가 확장(Expand)되며 하위 리스트가 나타난다.
    2. 에디터에 로드된 현재 파일 내용은 유지된다.

## 5. 구현 가이드 (Implementation Notes)
- **Performance:** 파일 내용이 클 경우를 대비해 클릭 시점에 서버/로컬 스토리지에서 패치하는 `useQuery` 패턴 사용 권장.
- **Accessibility:** 클릭 시 `aria-selected` 속성을 true로 설정할 것.
- **State Sync:** `activeFileId`가 변경될 때마다 URL 쿼리 파라미터나 전역 상태가 즉시 동기화되어야 함.

## 6. 검증 기준 (Verification / Test)
- [ ] 파일 클릭 시 `setActiveFile` 함수가 정확한 ID와 함께 호출되는가?
- [ ] 선택된 파일의 스타일이 다른 아이템과 시각적으로 구분되는가?
- [ ] 폴더 클릭 시 에디터의 `activeFileId`가 변하지 않는가?
- [ ] 존재하지 않는 파일을 클릭했을 때 에러 핸들링이 되어 있는가?
