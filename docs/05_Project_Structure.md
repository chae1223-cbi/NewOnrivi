# [Structure] Onrivi Author: 프로젝트 구조 및 프로그램 목록 (v1.0)

## 1. 프로젝트 전체 디렉토리 구조
```text
OnriviMarkDown/
├── backend/                # Node.js Express 백엔드 서버
├── frontend/               # Next.js 프론트엔드 애플리케이션
├── scripts/                # 문서 동기화 등 자동화 스크립트
│   └── sync_docs.js        # 디렉토리 구조 자동 갱신 도구
└── docs/                   # 프로젝트 문서화 자료
```

## 2. 세부 프로그램 및 컴포넌트 목록

### 2.1 Backend (Server-side)
*   **`index.js`**: 서버 엔트리 포인트. 파일 시스템(CRUD), 전역 검색 API 로직 포함.
*   **`package.json`**: 백엔드 의존성(express, cors, dotenv 등) 관리.

### 2.2 Frontend: App Layer (`src/app/`)
*   **`layout.tsx`**: 애플리케이션 전역 레이아웃 및 폰트 설정.
*   **`page.tsx`**: **메인 애플리케이션 페이지**. 모든 상태 관리, 이벤트 핸들러, 레이아웃 조립이 일어나는 핵심 파일.
*   **`globals.css`**: Tailwind CSS 베이스 및 전역 스타일 커스텀.

### 2.3 Frontend: UI Components (`src/components/`)
에디터의 각 기능을 담당하는 독립적인 컴포넌트들입니다.

| 컴포넌트명 | 역할 설명 |
| :--- | :--- |
| **`MenuBar.tsx`** | 최상단 메뉴 (파일, 편집, 보기, 도구 등) 및 모드 전환 |
| **`Toolbar.tsx`** | 텍스트 서식, 이미지/표 삽입 등 빠른 실행 도구 모음 |
| **`FileTreeItem.tsx`** | 사이드바의 트리형 파일/폴더 리스트 및 CRUD 액션 |
| **`GlobalSearch.tsx`** | 전체 워크스페이스 대상 실시간 본문 검색 모달 |
| **`StatusBar.tsx`** | 하단 상태 표시줄 (글자 수, 폰트 조절, 저장 상태) |
| **`SettingsModal.tsx`** | 에디터 환경 설정 (폰트, 테마, 드라이브 설정 등) |
| **`ExportModal.tsx`** | PDF, HTML, PNG 내보내기 옵션 제공 |
| **`ImageModal.tsx`** | 외부 URL 또는 로컬 이미지 삽입 관리 |
| **`TableModal.tsx`** | 마크다운 표 생성기 (행/열 지정) |
| **`FormulaModal.tsx`** | LaTeX 수식 에디터 (실시간 미리보기 및 템플릿) |
| **`MapModal.tsx`** | Google/Kakao Map iframe 삽입 도구 |
| **`MarkdownHelper.tsx`** | 마크다운 문법 퀵 레퍼런스 가이드 |
| **`PromptModal.tsx`** | 파일명 입력 등 사용자 입력을 위한 공용 팝업 |
| **`ToastProvider.tsx`** | 알림 메시지(Toast) 시스템 관리 |
| **`ColorText.tsx`** | 텍스트 하이라이트 및 색상 처리 유틸리티 |
| **`CopyButton.tsx`** | 코드 블록 등 내용 복사 전용 버튼 |
| **`ConfirmModal.tsx`** | 공통 확인/취소 질문 팝업 모달 |
| **`EmojiPicker.tsx`** | 텍스트 입력을 위한 이모지 선택창 |
| **`MergeModal.tsx`** | 다중 마크다운 파일 병합(통폐합) 설정 모달 |
| **`YoutubeModal.tsx`** | 유튜브 동영상 임베드 iframe 삽입 모달 |

### 2.4 Frontend: Library & Utils (`src/lib/`)
*   **`helper.tsx`**: IndexedDB 연동, 파일 시스템 스캔, 확장자별 아이콘 로직 등 핵심 비즈니스 로직 집합.
*   **`utils.ts / utils.tsx`**: (하위 호환 및 리팩토링용 더미 파일)

### 2.5 Documentation (`docs/`)
*   **`01_PRD.md`**: 제품 요구사항 정의서.
*   **`02_Architecture.md`**: 시스템 아키텍처 및 데이터 흐름.
*   **`03_API_Spec.md`**: 백엔드 REST API 명세.
*   **`04_Design_System.md`**: UI/UX 디자인 가이드.
*   **`05_Project_Structure.md`**: 본 문서 (구조 및 목록).
