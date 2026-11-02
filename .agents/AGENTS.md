# 온리비 어서 개발 규칙 (Rules)

## 1. 코드 변경 시 소스 코드 주석 관리 규칙
- **소스 코드 주석 최신화 (단일 관리 원칙)**: 소스 코드를 수정할 때마다 [skills/onrivi-source-comments/SKILL.md](skills/onrivi-source-comments/SKILL.md)의 파일 유형별 표준 양식을 준수하며, 해당 소스 파일 최상단에 정의된 OMD 주석 가이드라인 블록(특히 `🚨 @PATCH` 항목)에 수정 날짜(YYYY-MM-DD)와 패치 내역을 한글로 명확히 기록해야 합니다.
- **OMD_QUICK_TABLE.md 기록 중단 (동기화 제외)**: 코드 변경 시 `OMD_QUICK_TABLE.md`에는 더 이상 기록이나 업데이트를 수행하지 않으며, 오직 수정 대상 소스 코드 파일의 최상단 주석 블록에만 패치 내역을 기록·유지합니다.

## 2. 데이터베이스 및 통신 코드값 표준화 규칙
- **대문자 통일 규칙**: 데이터베이스 테이블에 저장되거나 시스템 모듈 간 주고받는 모든 코드값(예: `FREE`, `ACTIVE`, `EXPIRED`, `Y`, `N` 등)은 반드시 **대문자**로 통일하여 지정해야 합니다. 소문자로 입력 및 쿼리 필터링 처리를 수행하지 않습니다.


## 3. UI 컴포넌트 아키텍처 분리 규칙 (역할 기반)
비대해진 대형 화면 컴포넌트를 신규 설계하거나 리팩토링할 때는 **역할(Role)**을 명확히 구분하여 다음과 같이 분리해야 합니다.
- **Container (컨트롤 타워)**: 화면을 직접 그리지 않고, 오직 상태(State), 비즈니스 로직, Context Provider 제공에만 집중합니다. (예: `MainEditorApp`)
- **Layout (구조 래퍼)**: 앱의 상하좌우 뼈대, 메뉴바, 사이드바 등 고정적인 껍데기 UI 골격을 배치합니다. (예: `EditorLayout`)
- **Core (핵심 도메인 뷰)**: 서비스 본질의 가치가 집중되는 핵심 렌더링 영역을 격리합니다. (예: `EditorCore`)
- **Manager (오버레이 통합 관리)**: 모달(Modal), 플러그인 등 독립적인 Z-Index와 생명주기를 가지는 플로팅 UI들을 중앙 집중식으로 묶어 관리합니다. (예: `ModalManager`)
- **렌더링 위임 원칙**: 컨테이너 컴포넌트에 복잡한 HTML/Tailwind 마크업을 하드코딩하지 말고, 분리된 뷰 컴포넌트에 Props나 Context로 위임하여 코드를 슬림하게 유지합니다.

## 4. 단위/UI 테스트 코드 격리 및 빌드/Git 완전 배제 규칙
- **프로덕션 디렉토리 오염 금지**: 프로덕션 소스 코드 디렉토리(`src/components`, `src/lib`, `src/hooks` 등) 및 `public` 내부에 테스트 파일(`*.test.*`, `*.spec.*`)이나 더미 파일을 임의로 생성하지 않습니다.
- **전용 격리 디렉토리 표준화 (`scratch/tests/`)**: 모든 단위/UI/Node 테스트 코드는 반드시 별도의 격리된 전용 디렉토리(`scratch/tests/`) 하위에서만 작성 및 관리해야 합니다.
- **Git 및 실행 파일 패키징 자동 배제**: `scratch/` 및 모든 테스트 파일은 `.gitignore`와 `package.json`의 `build.files`에 배제(`!`) 등록되어 있어, Git 커밋에 포함되지 않고 일렉트론 실행 파일(`.exe`) 및 번들(`app.asar`) 생성 시 100% 자동 제외됩니다.

## 5. 일회성 패치, 임시 스크립트 및 더미 에셋 격리 관리 규칙
- **루트 및 프로덕션 디렉토리 청결 유지**: 버그 수정, 텍스트 변환, DB 검증, 일회성 마이그레이션 등을 위해 작성되는 임시 스크립트(`fix_*.js`, `patch_*.py`, `check_*.js`, `*.txt` 덤프, 로그 등)나 테스트용 더미 에셋을 프로젝트 루트 디렉토리나 프로덕션 소스 폴더에 직접 생성하지 않습니다.
- **전용 격리 디렉토리 표준화 (`scratch/patches/`, `scratch/assets/`)**: 모든 일회성 패치 및 검증 스크립트는 `scratch/patches/`, 테스트용 임시 에셋은 `scratch/assets/` 하위에서만 작성 및 실행해야 합니다.
- **배포 및 빌드 영향도 제로**: `scratch/` 하위의 모든 임시 리소스는 `tsconfig.json` 컴파일 대상과 일렉트론 패키징 번들에서 영구적으로 차단되므로, 로컬에서 자유롭게 검증하되 배포 및 릴리즈 바이너리의 용량을 증가시키지 않습니다.

## 6. 통합 디자인 시스템 및 3대 책임 영역 격리 규칙 (Modern Technical Editorial / DESIGN.md)
본 프로젝트는 앱 UI, 마크다운 콘텐츠 서식, 위치 동기화 엔진 간의 책임 경계를 엄격히 격리하여 개발해야 합니다. 상세 명세는 루트의 `DESIGN.md`를 표준 기준으로 따릅니다.
- **Application UI Scope (앱 인터페이스)**: 랜딩 페이지, 에디터 프레임, 사이드바, 툴바, 모달, 버튼, 입력창 등 애플리케이션의 모든 UI는 **Modern Technical Editorial** 디자인 시스템(Primary: Cobalt Authority `#1d4ed8`, Secondary: Intelligence Teal `#0d9488`, Tertiary: Kinetic Coral `#f97316`, Typography: `Plus Jakarta Sans` / `Inter` / `JetBrains Mono` / `Pretendard`)과 4단계 Elevation 및 치수 기하학(4px, 8px, 12-16px, 9999px) 토큰을 적용합니다.
- **LNB 사이드바 바탕색 표준**: 모든 좌측 사이드바는 공통 서피스 베이스 그라데이션(`.bg-sidebar-luxury` — Light: `linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)`, Dark: `linear-gradient(180deg, #090D16 0%, #0F172A 50%, #1E293B 100%)`)과 헤어라인 보더(`border-[#e2e8f0]` / dark: `border-slate-800`)를 표준으로 고정 적용합니다.
- **Content Document Scope (미리보기 서식 격리 및 사용자정의 CSS)**: 미리보기 내부의 마크다운 콘텐츠(`h1~h6`, `p`, `ul`, `ol`, `table`, `img`, `blockquote`, `pre`, `code` 등)는 오직 CSS Profile 및 User Custom CSS(`.onrivi-content-root`, `.custom-preview-container` 하위)에 의해서만 결정됩니다. `globals.css` 등 전역 스타일에서 마크다운 태그를 직접 스타일링하여 콘텐츠를 오염시키는 행위를 절대 금지합니다.
- **Sync Engine의 Geometry 기반 독립성**: Sync Engine(`syncEngine.ts`)은 콘텐츠의 구체적인 CSS 스타일(font-size, margin 등)을 참조하거나 변경하지 않고, 최종 렌더링된 실제 DOM Geometry와 Safe Zone(상단 40px, 하단 140px: 커서 가림 방어 2~3줄 여유 확보), Minimal Delta, Scroll Clamp만을 기반으로 위치를 동기화합니다.
- **Sync 단일 진입점 원칙**: 에디터 ↔ 미리보기 간의 모든 위치 동기화 스크롤은 `syncPreviewInterpolated()` 단일 진입점을 통해서만 실행합니다.
- **LNB 사이드바 메뉴/아이템 하이라이트 표준**: 에디터 탐색기 및 어드민 메뉴 등 모든 좌측 사이드바의 선택/활성 상태 표시 시 좌측 세로선(인디케이터 바 / `border-l` / `span.absolute`)을 일체 사용하지 않고, 오직 고대비 텍스트(`text-blue-700 dark:text-blue-400 font-extrabold`) 및 코발트 라운드 배경 음영(`bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 shadow-xs rounded-lg`)만으로 심플하고 세련되게 하이라이트 통일합니다.

## 7. SQLite 원트랜잭션(All-or-Nothing) 무결성 및 비정상 데이터 적재 방지 규칙
- **선행 검증 후 원자적 쓰기 (Pre-validation Before Write)**: AI 지식 베이스 색인 등 외부 I/O(LLM 정형 분석, 네트워크 통신) 및 전처리(AST 청킹, 해시 생성)가 수반되는 작업은 반드시 모든 선행 처리가 100% 정상 완료된 이후에만 데이터베이스 쓰기를 시작해야 합니다. 중간 과정 중에 임시 `INDEXING`이나 불완전한 상태로 DB에 레코드를 먼저 삽입하지 않습니다.
- **원트랜잭션 원칙 (Single Atomic Transaction)**: 문서 마스터(`knowledge_documents`), 청크(`document_chunks`), FTS5 전문 색인(`document_chunks_fts`), 태그(`document_tags`) 등 관련된 모든 테이블의 등록 및 갱신은 반드시 단 하나의 트랜잭션(`BEGIN TRANSACTION; ... COMMIT;`) 내부에서 원자적으로 수행되어야 합니다.
- **오류 시 완전 롤백 및 쓰레기 데이터 방어 (Clean Rollback)**: 외부 AI 분석이 실패하거나, JSON 파싱 에러 또는 SQL 제약조건 위반 등 어떤 단계에서라도 오류가 발생할 경우, 트랜잭션을 즉시 롤백(`ROLLBACK;`)하거나 쓰기를 원천 차단하여 DB 내부에 `ERROR` 상태나 고아 청크(Orphan Chunks) 등 비정상 데이터가 일체 잔존하지 않도록 무결성을 엄격히 보장해야 합니다.

## 8. 조회 결과 데이터 및 파일 경로 고대비(High-Contrast) 시인성 보장 규칙
- **조회 결과 데이터 선명도 보장**: 대시보드, 문서 목록, 검색 결과, 상세 뷰어 등 시스템에서 조회된 모든 결과 데이터(파일 경로, 파일명, 요약문, 태그, 메트릭 텍스트 등)는 사용자가 쉽게 식별할 수 있도록 흐릿한 저대비 색상(`text-zinc-400`, `opacity-50` 이하 등)을 절대 사용하지 않고, 고대비 및 가독성이 보장된 색상(Light: `text-zinc-700` 이상 / Dark: `text-zinc-300` 이상, 필요 시 `font-medium` 또는 `font-bold`)으로 진하고 선명하게 렌더링해야 합니다.
- **경로(Path) 정보 시인성 강화**: 파일 경로(`doc.filePath` 등)는 보조 텍스트라 할지라도 배경색과 묻히는 옅은 회색 처리를 금지하며, `text-zinc-700 dark:text-zinc-300 font-bold font-mono` 등 뚜렷한 명도 대비를 주어 가독성을 확보합니다.

## 9. 임의 폴백(Fallback) 원천 금지 및 사용자 사전 확인 규칙
- **임의 기본 경로 폴백 금지**: 로컬스토리지의 작업장 절대경로(`onrivi_workspace_path`) 등 핵심 설정/경로 값이 누락되었을 때, 시스템이 임의의 기본값(예: `D:/`, 프로젝트 루트, CWD 등)으로 자동 폴백하여 비정상 폴더를 생성하거나 엉뚱한 경로에 쓰기/읽기를 수행하는 행위를 원천 금지합니다.
- **엄격한 에러 즉시 발생**: 작업장 경로가 로컬스토리지에 존재하지 않거나 유효하지 않은 경우, 조용히 넘어가거나 임의 대체하지 말고 즉시 명확한 오류(예: `❌ 작업장 경로(onrivi_workspace_path)가 로컬스토리지에 설정되어 있지 않습니다. 작업장 폴더를 먼저 열어주세요.`)를 발생시켜 상위 UI 및 호출자에게 전달해야 합니다.
- **폴백 시 사용자 사전 확인 필수**: 불가피하게 기본값 대체나 폴백(Fallback) 처리가 필요한 상황이 발생할 경우, 시스템이 임의로 판단하여 적용하지 말고 반드시 사전에 사용자에게 폴백 적용 여부 및 대상 경로를 질문하고 승인을 받아야 합니다.
