# 온리비 어서(Onrivi Author) OMD 호출구조 전수 카탈로그

| 주석 고유번호 | 소스 위치 / 소스명 | 대상 함수명 | 상호 호출 함수 목록 (Calls) | 핵심 비즈니스 기능 요약 |
|---|---|---|---|---|
| OMD-AUTH-0001 | lib/secureStorage.ts | saveSecureData | 없음 | AES-256 암호화하여 로컬 스토리지에 보안 데이터 저장 |
| OMD-AUTH-0002 | components/AboutModal.tsx | AboutModal | 없음 | 프로그램 정보, 정품 인증 상태, 저작권 정보를 표시하는 포털 기반 모달 창 |
| OMD-AUTH-0003 | components/LicenseModal.tsx | handleCopyText | clipboard.writeText, setMessage | 라이선스 키 텍스트를 클립보드에 복사하고 사용자 피드백 표시 |
| OMD-AUTH-0004 | lib/secureStorage.ts | loadSecureData | 없음 | 로컬 스토리지 AES-256 암호화 데이터 복호화 및 JSON 파싱 |
| OMD-AUTH-0005 | components/LicenseModal.tsx | handleManualActivate | supabase.from, onSuccessActivation, onClose | Supabase를 통해 라이선스 키+유저+verifyKey 일치 여부 검증 후 기기 등록 |
| OMD-AUTH-0006 | components/LicenseModal.tsx | handleOpenRegister | fetch, window.open, api.openExternal | 백엔드 API로 일회성 티켓을 발급하고 대시보드 결제 페이지로 이동 |
| OMD-AUTH-0007 | components/LicenseModal.tsx | LicenseModal | handleOpenRegister, handleManualActivate, handleCopyText | 라이선스 정품 인증 UI - 대시보드 연동 및 Supabase 수동 인증 제공 |
| OMD-AUTH-0008 | components/MainEditorApp.tsx | initDeviceId | api.getMachineId, chrome.storage.sync.get/set, crypto.randomUUID, localStorage.getItem/setItem, setDeviceId | electronAPI, chrome.storage 또는 localStorage 폴백에서 고유 장치 ID 초기화 |
| OMD-AUTH-0009 | components/MainEditorApp.tsx | loadAndVerifyLicense | api.loadLicenseFull, chrome.storage.local.get, supabase.from.license_activations.select, crypto.subtle.digest, saveSecureData, loadSecureData, setLicenseStatus, setLicenseKey | 저장소에서 라이선스 키 로드, Supabase DB로 검증, 로컬 평가 기간으로 폴백 |
| OMD-AUTH-0010 | components/MainEditorApp.tsx | handleSuccessActivation | setLicenseStatus, api.saveLicenseFull, chrome.storage.local.set, localStorage.setItem | 성공적인 결제/활성화 후 모든 저장소 계층에 확인된 라이선스 활성화 유지 |
| OMD-CORE-0001 | lib/helper.tsx | idb | 없음 | IndexedDB 기반 key-value 저장 헬퍼 (get/set) |
| OMD-CORE-0002 | components/MarkdownPageViewer.tsx | handlePageClick | onCheckboxToggle, scrollIntoView, onFileOpen, resolveRelativeImagePath, onPreviewClick | 복제된 DOM에서 체크박스 토글, 앵커 링크 이동, 일반 클릭 이벤트 위임 처리 |
| OMD-CORE-0003 | constants/welcomeContent.ts | saveWelcomeContent | WELCOME_STORAGE_KEY | 웰컴 페이지 내용을 localStorage에 저장한다 |
| OMD-CORE-0004 | components/MarkdownViewer.tsx | rehypeBrRaw | 없음 | raw HTML <br> 태그를 안전하게 br 엘리먼트로 교체하는 rehype 플러그인 |
| OMD-CORE-0005 | constants/messages.ts | SystemMessageKey | SYSTEM_MESSAGES | SYSTEM_MESSAGES 객체의 키를 유니온 타입으로 추출한다 |
| OMD-CORE-0006 | constants/cssProfileGuide.ts | CSS_PROFILE_GUIDE_MD | 없음 | CSS Profile 작성 표준 명세서 마크다운을 상수로 내보낸다 |
| OMD-CORE-0007 | components/ConfirmModal.tsx | ConfirmModal | 없음 | 확인/취소 선택과 위험 경고 아이콘을 표시하는 포털 기반 범용 컨펌 모달 |
| OMD-CORE-0008 | app/layout.tsx | RootLayout | ToastProvider | Next.js 루트 레이아웃 - 전역 HTML 구조, CSP, 폰트, Mermaid 설정 및 ToastProvider 래핑 |
| OMD-CORE-0009 | app/page.tsx | Page | MainEditorApp | Next.js 클라이언트 진입 페이지 - SSR 비활성화로 MainEditorApp 동적 로딩 |
| OMD-CORE-0010 | components/ColorText.tsx | ColorText | 없음 | 텍스트에서 16진수 색상 코드를 감지하여 컬러 박스와 함께 시각적으로 렌더링 |
| OMD-CORE-0011 | constants/cssProfile.ts | createEmptyProfile | 없음 | 새로운 빈 CssProfile 객체를 생성하여 반환한다 |
| OMD-CORE-0012 | components/FontSelectorModal.tsx | collectFonts | 없음 | queryLocalFonts API로 시스템 설치 폰트 수집, 실패 시 FALLBACK_FONTS 반환 |
| OMD-CORE-0013 | components/CssStyleForm.tsx | AccordionSection | 없음 | 접이식 아코디언 섹션 래퍼 컴포넌트 - 타이틀 클릭으로 열기/닫기 토글 |
| OMD-CORE-0014 | components/MapModal.tsx | handleInsert | onInsert, onClose | Google Maps iframe HTML 코드를 생성하여 onInsert로 전달 |
| OMD-CORE-0015 | constants/cssProfile.ts | DEFAULT_PROFILE | SYSTEM_PROFILES | 시스템 기본 프로필(system-gov)을 기본값으로 내보낸다 |
| OMD-CORE-0016 | components/MarkdownViewer.tsx | rehypeSourceLinesPlugin | 없음 | 마크다운 노드에 data-line 속성으로 원본 줄 번호를 매핑 |
| OMD-CORE-0017 | components/MapModal.tsx | googleEmbedUrl | 없음 | 좌표와 줌 레벨로 Google Maps iframe embed URL 생성 |
| OMD-CORE-0018 | components/MarkdownPageViewer.tsx | useLayoutEffect (DOM cloning) | cloneNode, appendChild | calculatePagination 결과를 실제 가상 용지 DOM에 복제 이식 |
| OMD-CORE-0019 | constants/messages.ts | SYSTEM_MESSAGES | SystemMessageKey | 모든 사용자 알림 메시지를 SSoT로 관리하는 객체를 정의한다 |
| OMD-CORE-0020 | lib/helper.tsx | scanDirectory | msg.error | File System Access API로 폴더를 재귀 스캔하여 .md/.markdown 파일 트리 구축 |
| OMD-CORE-0021 | constants/welcomeContent.ts | getWelcomeContent | DEFAULT_WELCOME_MD | localStorage에서 웰컴 페이지 내용을 읽어온다 |
| OMD-CORE-0022 | components/FontSelectorModal.tsx | FontSelectorModal | collectFonts | 시스템 폰트 목록을 검색/선택하는 모달 창 |
| OMD-CORE-0023 | app/layout.tsx | metadata | 없음 | Next.js Metadata 객체 - 페이지 제목, 설명, 아이콘 경로 설정 |
| OMD-CORE-0024 | components/CssStyleForm.tsx | SliderWidget | getNumValue | HTML5 range 슬라이더로 숫자 값 실시간 조정 위젯 |
| OMD-CORE-0025 | components/MapModal.tsx | cleanCoords | 없음 | 입력된 좌표 문자열에서 외곽 괄호/따옴표 제거 |
| OMD-CORE-0026 | components/MainEditorApp.tsx | resolveRelativeImagePath | None | 상대 마크다운 이미지 경로를 절대 경로로 변환, 백슬래시 및 ../.. 세그먼트 정규화 |
| OMD-CORE-0027 | hooks/usePageBreak.ts | usePageBreak | 없음 | A4 용지 기준 지능형 페이지 나누기 계산 및 초기화 로직 처리 |
| OMD-CORE-0028 | components/MarkdownPageViewer.tsx | calculatePagination | createTablePiece, createListPiece, setPages, setIsCalculated | 오프스크린 렌더링 높이를 측정하여 A4 용지 단위로 페이지 분할 |
| OMD-CORE-0029 | lib/helper.tsx | getFileIcon | 없음 | 파일/폴더 확장자에 따른 Lucide 아이콘 및 색상 반환 |
| OMD-CORE-0030 | components/CssStyleForm.tsx | ColorPickerWidget | 없음 | 브라우저 내장 컬러 피커와 텍스트 입력을 연동한 색상 선택 위젯 |
| OMD-CORE-0031 | constants/messages.ts | SystemMessage | ToastType | 시스템 메시지의 타입 구조를 정의한다 |
| OMD-CORE-0032 | constants/cssProfile.ts | SYSTEM_PROFILES | 없음 | 앱에 내장된 3개의 시스템 프로필 배열을 정의한다 |
| OMD-CORE-0033 | components/MarkdownViewer.tsx | cleanContent | 없음 | 마크다운 원문 전처리 - 위키링크 변환, 괄호 링크 이스케이프, 목록 번호 방어 |
| OMD-CORE-0034 | constants/welcomeContent.ts | WELCOME_STORAGE_KEY | saveWelcomeContent, getWelcomeContent | localStorage 저장 키 이름을 정의한다 |
| OMD-CORE-0035 | components/CssStyleForm.tsx | TagRuleEditor | onUpdateRule, onRemoveRule | 특정 HTML 태그의 CSS 룰셋을 키-값 쌍으로 편집하는 서브 에디터 |
| OMD-CORE-0036 | components/MapModal.tsx | handleSearch | fetch, setCoords, setPlaceName, showToast | Nominatim API로 주소를 검색하여 좌표와 장소명 획득 |
| OMD-CORE-0037 | components/MarkdownPageViewer.tsx | useEffect (ResizeObserver) | calculatePagination | 오프스크린 컨테이너 내부 요소 크기 변화를 감지하여 페이지 재분할 트리거 |
| OMD-CORE-0038 | components/MainEditorApp.tsx | getRelativePath | None | 위키 스타일 문서 링크를 위한 두 파일 간 상대 경로 계산 |
| OMD-CORE-0039 | constants/cssProfile.ts | EMPTY_RULES | createEmptyProfile | 모든 태그가 빈 객체인 CssRuleSet 템플릿을 제공한다 |
| OMD-CORE-0040 | components/MarkdownViewer.tsx | MarkdownViewer | CodeBlock, TableWrapper, MermaidBlock, rehypeSourceLinesPlugin, rehypeBrRaw, cleanContent | 마크다운 텍스트를 ReactMarkdown으로 렌더링 - 코드블록, 표, 머메이드, 이미지 경로 변환 등 고기능 뷰어 |
| OMD-CORE-0041 | constants/welcomeContent.ts | DEFAULT_WELCOME_MD | WELCOME_MD | 기본 웰컴 페이지 마크다운을 내보낸다 |
| OMD-CORE-0042 | constants/cssProfile.ts | isSystemProfileId | SYSTEM_PROFILE_IDS | 주어진 id가 시스템 프로필 ID인지 검사한다 |
| OMD-CORE-0043 | components/MapModal.tsx | useEffect (mounted) | setMounted | 클라이언트 마운트 완료 상태 설정으로 hydration mismatch 방지 |
| OMD-CORE-0044 | components/MarkdownViewer.tsx | MermaidBlock | loadMermaidScript, handleCopyImage, handleSaveImage, handleCopyCode | Mermaid 차트 텍스트를 SVG로 실시간 변환 렌더링 및 이미지 저장/복사 툴바 제공 |
| OMD-CORE-0045 | components/MarkdownPageViewer.tsx | useEffect (pagination) | calculatePagination, setIsCalculated | content/용지 설정 변경 시 200ms 디바운스 후 페이지 재분할 |
| OMD-CORE-0046 | constants/welcomeContent.ts | WELCOME_CONTENT | WELCOME_MD | 웰컴 페이지 마크다운을 외부에 내보낸다 |
| OMD-CORE-0047 | components/CssStyleForm.tsx | CssStyleForm | AccordionSection, SliderWidget, ColorPickerWidget, TagRuleEditor, FontSelectorModal | 좌측 서식 정의 에디터 폼 - CSS 프로필 전역 타이포그래피 및 태그별 룰셋 편집 |
| OMD-CORE-0048 | components/MainEditorApp.tsx | MainEditorApp | useToast, useEditorTabs, useFileExplorer, useEditorSettings, usePageBreak, useEditorHandlers, getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath, utilsEditorActions, utilsPasteHandlers, getSlashCommands, preprocessMarkdownForPreview, saveSecureData, loadSecureData, idb, getApiUrl | 컨트롤 타워: 모든 전역 상태, 레이아웃 조립, Monaco 에디터, 미리보기, 사이드바, 메뉴 조정 |
| OMD-CORE-0049 | constants/welcomeContent.ts | WELCOME_MD | WELCOME_CONTENT, DEFAULT_WELCOME_MD | 웰컴 페이지 마크다운을 원시 문자열 상수로 정의한다 |
| OMD-CORE-0050 | constants/cssProfile.ts | SYSTEM_PROFILE_IDS | isSystemProfileId | 시스템 프로필 식별자 목록을 정의한다 |
| OMD-CORE-0051 | components/MarkdownPageViewer.tsx | MarkdownPageViewer | calculatePagination, handlePageClick, MarkdownViewer, useLayoutEffect, useEffects | A4 용지 기반 페이지 분할 뷰어 - 오프스크린 측정 후 가상 페이지 렌더링 |
| OMD-CORE-0052 | components/MarkdownViewer.tsx | loadMermaidScript | mermaid.initialize | Mermaid CDN 스크립트를 동적으로 로드하고 초기화 (SSR 번들 충돌 방지) |
| OMD-CORE-0053 | components/MapModal.tsx | MapModal | handleSearch, handleInsert, setZoom, setMapAlign, showToast | Google Maps iframe 기반 지도 삽입 모달 - 주소 검색, 줌 제어, 크기/정렬 설정 |
| OMD-CORE-0054 | components/MarkdownViewer.tsx | TableWrapper | handleCopy, ClipboardItem, navigator.clipboard.write | 마크다운 표를 HTML + TSV 형식으로 클립보드에 복사하는 래퍼 컴포넌트 |
| OMD-CORE-0055 | components/MainEditorApp.tsx | loadUserProfiles | api.readProfiles, localStorage.getItem, JSON.parse, setProfiles | 마운트 시 플랫폼 저장소(electronAPI 또는 localStorage)에서 사용자 CSS 프로필 로드 |
| OMD-CORE-0056 | components/MarkdownViewer.tsx | CodeBlock | handleCopy, navigator.clipboard.writeText | 코드블록을 언어명 헤더 + 복사 버튼 + 모노스페이스 렌더링 |
| OMD-CORE-0057 | components/MarkdownViewer.tsx | remarkDisableIndentedCode | 없음 | 4칸 들여쓰기/탭의 코드블록 인식을 차단하는 remark 플러그인 |
| OMD-CORE-0058 | components/MainEditorApp.tsx | pageViewInit | localStorage.getItem | 마운트 시 localStorage에서 isPageViewEnabled 복원 |
| OMD-CORE-0059 | components/MainEditorApp.tsx | handleTogglePageView | localStorage.setItem | 페이지 보기 모드 토글 및 localStorage에 설정 유지 |
| OMD-CORE-0060 | components/MainEditorApp.tsx | tabSizeRef_sync | parseInt | 활성 CSS 프로필 tabSize 설정에서 tabSizeRef 업데이트 |
| OMD-CORE-0061 | components/MainEditorApp.tsx | handleCheckboxToggle | editor.getModel, editor.pushUndoStop, editor.executeEdits | 미리보기 체크박스 클릭을 에디터 모델 라인 콘텐츠에 동기화 |
| OMD-CORE-0062 | components/MainEditorApp.tsx | updateDecorations | decorationsCollectionRef.current.set | 마크다운 구문 강조(제목, 굵게, 기울임, 취소선)를 위한 인라인 Monaco 데코레이션 적용 |
| OMD-CORE-0063 | components/MainEditorApp.tsx | darkModeDOMClass | document.documentElement.classList.add/remove | Tailwind 다크 모드를 위해 documentElement에 'dark' 클래스 토글 |
| OMD-CORE-0064 | components/MainEditorApp.tsx | darkModePaletteSync | setThemePalette | 시각적 일관성 유지를 위해 다크 모드 전환 시 테마 팔레트 자동 전환 |
| OMD-CORE-0065 | components/MainEditorApp.tsx | profilesSave | api.saveProfiles, localStorage.setItem | 변경 시마다 사용자 CSS 프로필을 플랫폼 저장소에 유지 |
| OMD-CORE-0066 | components/MainEditorApp.tsx | activeProfileSave | localStorage.setItem | 활성 CSS 프로필 ID를 localStorage에 유지 |
| OMD-CORE-0067 | components/MainEditorApp.tsx | previewHighlightLine | element.classList.add/remove | 분할 모드에서 에디터의 activeLine과 일치하는 미리보기 줄 강조 |
| OMD-CORE-0068 | components/MainEditorApp.tsx | postContentScrollCorrection | requestAnimationFrame, editor.getPosition, editor.getTopForLineNumber, editor.getScrollTop | 콘텐츠 변경/파싱 후 에디터 커서 비율에 맞게 미리보기 스크롤 위치 동기화 |
| OMD-CORE-0069 | components/MainEditorApp.tsx | findLineNumberByHeading | utilsEditorActions.findLineNumberByHeading | 제목 줄 검색을 utilsEditorActions에 위임 |
| OMD-CORE-0070 | components/MainEditorApp.tsx | handlePreviewClick | scrollToLine, element.closest, classList.add/remove | 미리보기 클릭 시: 에디터를 일치하는 줄로 스크롤, 미리보기에서 줄 강조 |
| OMD-CORE-0071 | components/MainEditorApp.tsx | extractHeadings | None | 마크다운 텍스트를 파싱하여 제목 텍스트 줄(H1-H6) 추출 |
| OMD-CORE-0072 | components/MainEditorApp.tsx | processedContent_lineMap | preprocessMarkdownForPreview | 미리보기를 위해 마크다운 콘텐츠를 전처리하고 스크롤 동기화를 위한 라인 매핑 생성 |
| OMD-CORE-0073 | components/MainEditorApp.tsx | dynamicCssString | None | 활성 CSS 프로필에서 타이포그래피, 코드 블록, 표, 체크박스, 구분선, 다크모드 재정의를 포함한 동적 CSS 생성 |
| OMD-CORE-0074 | components/MainEditorApp.tsx | toc | None | 마크다운 제목에서 목차를 생성하고 코드 블록은 건너뜁니다 |
| OMD-EDIT-0001 | lib/editorUtils.ts | isAnyListLine | 없음 | 라인이 마크다운 리스트(순서형/비순서형/체크리스트)인지 판별 |
| OMD-EDIT-0002 | components/CopyButton.tsx | CopyButton | 없음 | 클립보드 복사 버튼 - 텍스트를 클립보드에 복사하고 2초간 체크 아이콘 표시 |
| OMD-EDIT-0003 | lib/monacoEnv.ts | configureMonacoEnvironment | 없음 | Monaco Editor 워커/로더 경로를 로컬(Electron/Web) 또는 Extension 환경에 맞게 구성 |
| OMD-EDIT-0004 | utils/editorActions.ts | wrapSelection | 없음 | 선택된 텍스트를 지정된 문자열로 감싸거나 토글 방식으로 제거한다 |
| OMD-EDIT-0005 | utils/pasteHandlers.ts | parseHtmlTableToMarkdown | 없음 | HTML <table> 구문을 표준 마크다운 표 형식으로 변환한다 |
| OMD-EDIT-0006 | lib/slashCommands.ts | getSlashCommands | 없음 | 기본 슬래시 명령어 배열을 Monaco CompletionItem 형식으로 변환 |
| OMD-EDIT-0007 | lib/toolbarConfig.ts | getDefaultHotkeys | 없음 | TOOLBAR_ITEMS에서 defaultHotkey 맵 생성 |
| OMD-EDIT-0008 | components/ImageModal.tsx | handleInsert | onInsert, onClose | 이미지 경로와 크기/정렬 파라미터를 조합해 마크다운 코드로 삽입 |
| OMD-EDIT-0009 | components/SettingsModal.tsx | ModeButton | 없음 | 화면 보기 모드(편집/분할/미리보기) 전환 버튼 렌더링 |
| OMD-EDIT-0010 | components/MenuBar.tsx | MenuDropdown | 없음 | 상단 메뉴 드롭다운 렌더링 - 서브메뉴 호버 열림 및 단축키 표시 |
| OMD-EDIT-0011 | components/TableModal.tsx | useEffect(mounted) | 없음 | 클라이언트 마운트 완료 시 mounted 상태 true 설정 (SSR 하이드레이션 보호) |
| OMD-EDIT-0012 | utils/toast.ts | showToast | ToastType | 화면 우측 상단에 프리미엄 토마토 테마 Toast 알림을 동적으로 생성하여 표시한다 |
| OMD-EDIT-0013 | components/TablePicker.tsx | handleSelect | onSelect, onClose | hovered 행/열을 1-indexed로 변환하여 onSelect 콜백 호출 후 드롭다운 닫기 |
| OMD-EDIT-0014 | components/UnifiedTabBar.tsx | UnifiedTabBar | onSwitchTab, onCloseTab, onCreateNewTab | 통합 탭바 컴포넌트 - 열린 문서 탭 목록 표시, 탭 전환/닫기/추가 기능 제공 |
| OMD-EDIT-0015 | components/YoutubeModal.tsx | handleInsert | showToast, onInsert, onClose | 생성된 유튜브 코드를 본문에 삽입하고 입력값 초기화 후 모달 닫기 |
| OMD-EDIT-0016 | components/ToastProvider.tsx | useToast | useContext | Toast 컨텍스트 커스텀 훅 - Provider 내부에서 showToast 함수 조회 |
| OMD-EDIT-0017 | components/Toolbar.tsx | CopyPreviewButton | onAction | 미리보기 복사 버튼 - 클릭 시 onAction 콜백 실행 |
| OMD-EDIT-0018 | components/StatusBar.tsx | getFullPath | 없음 | 전체 파일 경로를 workspaceType에 따라 조합하여 반환 |
| OMD-EDIT-0019 | components/TableModal.tsx | handleInsert | onInsert, onClose | 선택된 행/열로 마크다운 표 문자열 생성 후 onInsert 콜백 전달 및 모달 닫기 |
| OMD-EDIT-0020 | components/StatusBar.tsx | t | 없음 | 다국어 키-값 조회 함수 - localTranslations에서 key에 해당하는 번역 문자열 반환 |
| OMD-EDIT-0021 | components/ToastProvider.tsx | ToastProvider | showToast (from utils) | 전역 Toast 컨텍스트 Provider - 자식 컴포넌트에 showToast 유틸리티 제공 |
| OMD-EDIT-0022 | components/TablePicker.tsx | TablePicker | handleSelect | 표 크기 선택 드롭다운 컴포넌트 - 10x10 그리드 렌더링 및 사용자 인터랙션 처리 |
| OMD-EDIT-0023 | lib/toolbarConfig.ts | getDefaultCommands | 없음 | TOOLBAR_ITEMS에서 defaultCommand 맵 생성 |
| OMD-EDIT-0024 | lib/editorUtils.ts | stripFrontmatter | 없음 | YAML frontmatter(--- 블록)를 마크다운 텍스트에서 제거 |
| OMD-EDIT-0025 | components/MenuBar.tsx | useEffect (click outside) | setActiveMenu | 메뉴 외부 클릭 시 activeMenu를 닫는 클릭 감지 리스너 설치 |
| OMD-EDIT-0026 | components/SettingsModal.tsx | ThemeButton | 없음 | 설정 창의 토글 버튼(켜기/끄기) 렌더링 |
| OMD-EDIT-0027 | components/Toolbar.tsx | HeadingSpinButton | handleHeadingUp, handleHeadingDown, onHeadingSelect | 제목 레벨 조절 스핀 버튼 - ▲/▼ 버튼으로 headingLevel 조정 및 H 적용 |
| OMD-EDIT-0028 | components/YoutubeModal.tsx | generatedCode | 없음 | iframe 또는 썸네일 방식에 따른 최종 HTML/마크다운 코드 생성 |
| OMD-EDIT-0029 | utils/pasteHandlers.ts | fixMarkdownTable | 없음 | 여러 줄로 쪼개진 마크다운 표 셀을 한 행으로 병합하여 보정한다 |
| OMD-EDIT-0030 | utils/toast.ts | ToastType | showToast | Toast 알림의 유형을 정의하는 유니온 타입을 선언한다 |
| OMD-EDIT-0031 | utils/editorActions.ts | insertBlockTag | 없음 | 선택 영역 또는 커서 위치를 블록 태그로 감싼다 |
| OMD-EDIT-0032 | components/ImageModal.tsx | previewSrc | 없음 | cleanImagePath를 media:// 로컬 프록시 URL로 변환하여 미리보기 이미지 로드 보장 |
| OMD-EDIT-0033 | components/UnifiedTabBar.tsx | EditorTab | 없음 | 에디터 탭 인터페이스 - id, name, path, content, isModified 등 탭 상태 정의 |
| OMD-EDIT-0034 | components/MenuBar.tsx | handleThemeSelect | onThemeChange | 테마 선택 시 onThemeChange 콜백 호출 |
| OMD-EDIT-0035 | components/SettingsModal.tsx | handleSaveLicense | setLicenseKey, localStorage.setItem, chrome.storage.local.set, api.saveLicense | 라이선스 키를 localStorage, chrome.storage, electronAPI에 동시 저장 |
| OMD-EDIT-0036 | lib/editorUtils.ts | getIndentLevel | 없음 | 라인의 들여쓰기 수준을 스페이스 개수 기준으로 계산 (탭=4) |
| OMD-EDIT-0037 | components/YoutubeModal.tsx | embedUrl | 없음 | videoId로 YouTube iframe embed URL 생성 (관련 영상/로고 제거 옵션 포함) |
| OMD-EDIT-0038 | components/Toolbar.tsx | ToolbarButton | onAction | 툴바 개별 버튼 - bold/italic/underline/active 스타일링 및 마우스다운 이벤트 처리 |
| OMD-EDIT-0039 | components/TableModal.tsx | TableModal | handleInsert, createPortal | 표 삽입 모달 - 10x10 그리드 UI로 마우스 표 크기 선택 후 마크다운 코드 생성 |
| OMD-EDIT-0040 | components/ImageModal.tsx | cleanImagePath | 없음 | 입력된 이미지 경로에서 순수 URL 추출 (마크다운/HTML 태그 래핑 제거) |
| OMD-EDIT-0041 | components/StatusBar.tsx | StatusBar | getFullPath, t | 상태 표시줄 컴포넌트 - 글자 수, 단어 수, 저장 상태, 라인/컬럼 정보, 테마, 프리뷰 모드 표시 |
| OMD-EDIT-0042 | utils/pasteHandlers.ts | sanitizePastedText | 없음 | 붙여넣기 문자열을 마크다운에 적합하도록 정제한다 |
| OMD-EDIT-0043 | utils/editorActions.ts | findLineNumberByHeading | 없음 | 문서 내에서 특정 제목 텍스트가 위치한 라인 번호를 탐색한다 |
| OMD-EDIT-0044 | lib/toolbarConfig.ts | getSlashCommands | 없음 | TOOLBAR_ITEMS를 Monaco 슬래시 자동완성 항목으로 변환 (모달/액션/플레이스홀더 처리) |
| OMD-EDIT-0045 | utils/editorActions.ts | insertAtCursor | 없음 | 현재 커서 위치 또는 마지막 선택 영역에 텍스트를 주입한다 |
| OMD-EDIT-0046 | components/ImageModal.tsx | handlePasteEvent | api.saveImage, showToast, setImagePath | 클립보드 이미지를 로컬 assets 폴더에 저장하고 경로를 입력 필드에 설정 |
| OMD-EDIT-0047 | components/YoutubeModal.tsx | useEffect(shorts) | setWidth, setHeight | 유튜브 쇼츠 URL 감지 시 자동으로 플레이어 크기 315x560(세로 최적화) 설정 |
| OMD-EDIT-0048 | components/SettingsModal.tsx | handleThemeSelect | setIsDarkMode, onThemeChange, localStorage.setItem | 테마 선택 시 DOM 클래스/로컬스토리지/다크모드/onThemeChange를 일괄 적용 |
| OMD-EDIT-0049 | lib/editorUtils.ts | preprocessMarkdownForPreview | stripFrontmatter, isAnyListLine, getIndentLevel | 마크다운 전처리 파이프라인 — frontmatter 제거, 탭 보정, 한글 강조, HTML 이스케이프, 리스트 간격, 개행 버퍼 |
| OMD-EDIT-0050 | components/Toolbar.tsx | ToolbarGroup | 없음 | 툴바 그룹 컨테이너 - 자식 버튼들과 하단 라벨 표시 |
| OMD-EDIT-0051 | components/MenuBar.tsx | MenuBar | MenuDropdown, dispatch, setIsSidebarOpen, setIsToolbarOpen, setPreviewMode | 상단 메뉴바 렌더링 - 파일/편집/도구/도움말 드롭다운 메뉴 제공 |
| OMD-EDIT-0052 | components/YoutubeModal.tsx | videoId | 없음 | 유튜브 URL/iframe에서 비디오 ID 추출 (정규식 기반 파싱) |
| OMD-EDIT-0053 | components/SettingsModal.tsx | useEffect (mounted) | setMounted, setRestoreSession, localStorage.getItem | 마운트 시 마운트 상태 설정 및 세션 복원 설정 로드 |
| OMD-EDIT-0054 | hooks/useEditorSettings.ts | useEditorSettings | getDefaultHotkeys, getDefaultCommands, idb.get, api.loadSettings, api.saveSettings | 에디터 사용자 설정(테마, 단축키, 폰트크기 등)을 관리하고 영구 저장소에 동기화 |
| OMD-EDIT-0055 | utils/editorActions.ts | scrollToLine | 없음 | Monaco 에디터 내에서 특정 라인 번호로 스크롤하고 포커스를 이동시킨다 |
| OMD-EDIT-0056 | lib/editorUtils.ts | wrapMathWithBold | 없음 | KaTeX 수식에 \boldsymbol{...} 래핑하여 칠판 볼드체 렌더링 보장 |
| OMD-EDIT-0057 | components/ImageModal.tsx | useEffect (initialData mapping) | setImagePath, setImageAlt, setImageWidth, setImageHeight, setImageAlign | 모달 열림 시 initialData가 있으면 각 필드에 매핑, 없으면 초기화 |
| OMD-EDIT-0058 | components/Toolbar.tsx | handleHeadingDown | setHeadingLevel | 제목 레벨 감소 핸들러 - headingLevel 6 미만일 때 +1 |
| OMD-EDIT-0059 | components/FormulaModal.tsx | TabBtn | 없음 | 수식 에디터 좌측 패널의 탭 버튼 (템플릿/기호/최근) 컴포넌트 |
| OMD-EDIT-0060 | components/Toolbar.tsx | handleHeadingUp | setHeadingLevel | 제목 레벨 증가 핸들러 - headingLevel 1 초과일 때 -1 |
| OMD-EDIT-0061 | components/MainEditorApp.tsx | contentRef_sync | None | 클로저에서 사용하기 위해 contentRef.current를 content 상태와 동기화 |
| OMD-EDIT-0062 | components/SettingsModal.tsx | SettingsModal | handleThemeSelect, handleSaveLicense, ThemeButton, ModeButton | 환경 설정 모달 - 일반 설정, 정품 인증, 단축키/명령어 테이블, 테마 선택 제공 |
| OMD-EDIT-0063 | components/YoutubeModal.tsx | useEffect(mounted) | 없음 | 클라이언트 마운트 완료 시 mounted 상태 true 설정 (SSR 하이드레이션 보호) |
| OMD-EDIT-0064 | components/ImageModal.tsx | useEffect (mounted) | setMounted | 클라이언트 마운트 완료 상태 설정으로 포탈 렌더링 hydration mismatch 방지 |
| OMD-EDIT-0065 | components/FormulaModal.tsx | SymbolPreview | wrapMathWithBold, katex.render | LaTeX 기호 미리보기용 메모이즈드 컴포넌트 - RAF로 DOM 안전 렌더링 |
| OMD-EDIT-0066 | components/Toolbar.tsx | t | 없음 | 다국어 키-값 조회 함수 - localTranslations에서 key에 해당하는 번역 문자열 반환 |
| OMD-EDIT-0067 | components/ImageModal.tsx | ImageModal | handleInsert, handlePasteEvent, handleFileChange, cleanImagePath, previewSrc | 이미지 삽입 모달 - URL/파일/클립보드 이미지 경로 입력 및 크기/정렬 설정 |
| OMD-EDIT-0068 | components/YoutubeModal.tsx | YoutubeModal | videoId, embedUrl, generatedCode, handleInsert, showToast, createPortal | 유튜브 영상 삽입 모달 - URL 입력, ID 추출, iframe/썸네일 코드 생성, 미리보기 제공 |
| OMD-EDIT-0069 | components/MainEditorApp.tsx | previewModeRef_sync | None | previewModeRef.current를 previewMode 상태와 동기화 |
| OMD-EDIT-0070 | components/Toolbar.tsx | Toolbar | ToolbarGroup, ToolbarButton, HeadingSpinButton, CopyPreviewButton, useToast | 에디터 상단 툴바 컴포넌트 - 서식/제목/문단/삽입/고급/보기/설정 그룹 제공 |
| OMD-EDIT-0071 | components/MainEditorApp.tsx | helpContent_forces_preview | setPreviewModeRaw | 도움말 콘텐츠가 설정되면 미리보기 모드 강제, 에디터 마운트 비활성화 |
| OMD-EDIT-0072 | components/MainEditorApp.tsx | tabMetadata_sync | setTabs | 현재 파일 정보가 변경될 때 탭 메타데이터(fileName, path, node) 동기화 |
| OMD-EDIT-0073 | components/MainEditorApp.tsx | searchOpen_sidebar_behavior | setIsSidebarOpen, setSidebarTab | 글로벌 검색이 열릴 때 사이드바 열기 및 검색 탭으로 전환 |
| OMD-EDIT-0074 | hooks/useEditorHandlers.ts | useEditorHandlers | exportPDF, exportHTML, exportEPUB, exportPNG, vfsWriteFile, stripFrontmatter, sanitizePastedText | 에디터 주요 액션 핸들러(저장, 내보내기, 서식 삽입 등)를 통합 관리 |
| OMD-EDIT-0075 | components/MainEditorApp.tsx | currentFileNodeRef_sync | None | 핸들러에서 스테일 클로저 방지를 위해 currentFileNodeRef 동기화 |
| OMD-EDIT-0076 | components/MainEditorApp.tsx | currentFileNameRef_sync | None | 핸들러에서 스테일 클로저 방지를 위해 currentFileNameRef 동기화 |
| OMD-EDIT-0077 | components/MainEditorApp.tsx | workspaceTypeRef_sync | None | 핸들러에서 스테일 클로저 방지를 위해 workspaceTypeRef 동기화 |
| OMD-EDIT-0078 | components/MainEditorApp.tsx | rootFolderRef_sync | None | 핸들러에서 스테일 클로저 방지를 위해 rootFolderRef 동기화 |
| OMD-EDIT-0079 | components/MainEditorApp.tsx | setPreviewMode | editorRef.current.getValue, setContent, setPreviewModeRaw, setHelpContent, createNewTab, switchTab, clearTimeout | 에디터 콘텐츠 보존, css-style 웰컴 탭 자동 생성 및 도움말 콘텐츠 가드와 함께 미리보기 모드 전환 |
| OMD-EDIT-0080 | components/MainEditorApp.tsx | closeTab | setTabs, switchTab, createNewTab, setConfirmConfig, tab.model.dispose | 저장되지 않은 변경사항 확인, 모델 폐기 및 css-style 모드 자동 종료와 함께 탭 닫기 |
| OMD-EDIT-0081 | components/MainEditorApp.tsx | autoSaveRef_sync | None | 자동 저장 로직에서 스테일 클로저 방지를 위해 autoSaveRef를 autoSave 상태와 동기화 |
| OMD-EDIT-0082 | components/MainEditorApp.tsx | previewWheelSync | editor.setScrollTop | 분할 모드에서 미리보기 영역의 마우스 휠 이벤트를 에디터 스크롤로 전달 |
| OMD-EDIT-0083 | components/MainEditorApp.tsx | editorSettingsSync | monaco.editor.setTheme, editor.updateOptions, requestAnimationFrame | 설정 또는 에디터 마운트 변경 시 테마, 폰트 크기, 줄 바꿈 재적용 |
| OMD-EDIT-0084 | components/MainEditorApp.tsx | dynamicTitleBar | None | 창 탭 식별을 위해 현재 파일 이름으로 document.title 업데이트 |
| OMD-EDIT-0085 | components/MainEditorApp.tsx | handleMouseMove | setSidebarWidth, localStorage.setItem | 사이드바 크기 조정 드래그 mousemove 이벤트 처리 |
| OMD-EDIT-0086 | components/MainEditorApp.tsx | stopResizing | document.removeEventListener, document.body.style.cursor/userSelect | 사이드바 크기 조정 종료: 리스너 제거, 커서 및 user-select 복원 |
| OMD-EDIT-0087 | components/MainEditorApp.tsx | startResizing | document.addEventListener, document.body.style | 사이드바 크기 조정 시작: 리스너 추가, col-resize 커서 설정 |
| OMD-EDIT-0088 | components/MainEditorApp.tsx | insertAtCursor | utilsEditorActions.insertAtCursor | 커서 위치 텍스트 삽입을 utilsEditorActions에 위임 |
| OMD-EDIT-0089 | components/MainEditorApp.tsx | scrollToLine | utilsEditorActions.scrollToLine | 에디터 특정 줄로 스크롤을 utilsEditorActions에 위임 |
| OMD-EDIT-0090 | components/MainEditorApp.tsx | insertBlockTag | utilsEditorActions.insertBlockTag | 블록 태그 감싸기를 utilsEditorActions에 위임 |
| OMD-EDIT-0091 | components/MainEditorApp.tsx | wrapSelection | utilsEditorActions.wrapSelection | 선택 영역 감싸기/풀기를 utilsEditorActions에 위임 |
| OMD-EDIT-0092 | components/MainEditorApp.tsx | insertLink | editor.focus, editor.getSelection, editor.executeEdits, editor.setSelection | 커서에 마크다운 링크 삽입, URL 플레이스홀더 텍스트 자동 선택 |
| OMD-EDIT-0093 | components/MainEditorApp.tsx | insertTagLink | setShowTagLinkPicker | 제목 기반 내부 문서 앵커를 위한 태그 링크 선택기 열기 |
| OMD-EDIT-0094 | components/MainEditorApp.tsx | handleTagLinkSelect | editor.focus, editor.getSelection, editor.executeEdits | 제목 선택 후 커서에 [[#heading|text]] 태그 링크 삽입 |
| OMD-EDIT-0095 | components/MainEditorApp.tsx | handleDocLinkSelect | getRelativePath, editor.focus, editor.getSelection, editor.executeEdits | 커서에 [[relativePath#heading|text]] 문서 간 링크 삽입 |
| OMD-EDIT-0096 | components/MainEditorApp.tsx | parseHtmlTableToMarkdown | utilsPasteHandlers.parseHtmlTableToMarkdown | HTML 표를 마크다운으로 변환하는 작업을 paste handlers에 위임 |
| OMD-EDIT-0097 | components/MainEditorApp.tsx | sanitizePastedText | utilsPasteHandlers.sanitizePastedText | 붙여넣기 텍스트 정제를 paste handlers에 위임 |
| OMD-EDIT-0098 | components/MainEditorApp.tsx | fixMarkdownTable | utilsPasteHandlers.fixMarkdownTable | 마크다운 표 수정을 paste handlers에 위임 |
| OMD-EDIT-0099 | components/MainEditorApp.tsx | handleEditorPaste | fetch, FileReader, parseHtmlTableToMarkdown, sanitizePastedText, fixMarkdownTable, insertAtCursor, updateContent, showToast | 붙여넣기 이벤트 처리: 이미지 업로드, HTML 표 변환, 텍스트 정제 |
| OMD-EDIT-0100 | components/MainEditorApp.tsx | applyLinePrefix | editor.getSelection, editor.executeEdits, model.forceTokenization, editor.layout | 선택된 줄에 순서 목록/글머리 기호/인용구/체크리스트 접두사 적용 |
| OMD-EDIT-0101 | components/MainEditorApp.tsx | removePrefix | editor.getSelection, editor.executeEdits, model.forceTokenization, editor.layout | 선택 영역에서 마크다운 서식 태그 제거: 굵게, 기울임, 취소선, 코드, 링크, 제목, 목록 |
| OMD-EDIT-0102 | components/MainEditorApp.tsx | quickWrap | wrapSelection, applyLinePrefix, insertBlockTag, editor.focus | 선택 영역 또는 현재 줄을 제목/인용구/코드 서식으로 빠르게 감쌉니다 |
| OMD-EDIT-0103 | components/MainEditorApp.tsx | dispatchCommand | handlers.newFile/save/saveAs/exit/exportPDF/exportHTML/exportEPUB/exportPNG/openExport, handlers.zoomIn/zoomOut/undo/redo/find/replace/globalSearch/settings/about/help/license, handlers.toggleFloatingToolbar/cleanDoc/copyAll, handlers.bold/italic/inlineCode/underline/strikethrough/h1-h6/hr/orderedList/list/quote/check/removePrefix, handlers.link/taglink/doclink/image/video/now/map/table/quickTable/insertTableRow/deleteTableRow/code/chart/pageBreak/math, handlers.quickWrap, selectRootFolder, setPreviewMode, setIsToolbarOpen, setIsSidebarOpen, setThemePalette, setIsDarkMode | 에디터 포커스 가드와 함께 EditorCommandType을 핸들러 메서드로 라우팅하는 통합 명령 디스패처 |
| OMD-EDIT-0104 | components/MainEditorApp.tsx | mapIdToCommandType | None | 툴바 항목의 camelCase ID를 명시적 재정의 테이블로 EditorCommandType UPPER_SNAKE_CASE에 매핑 |
| OMD-EDIT-0105 | components/MainEditorApp.tsx | hotkeyRegistration | TOOLBAR_ITEMS.forEach, editor.addAction, monaco.editor.defineTheme, monaco.editor.setTheme, updateDecorations, handleEditorPaste | 모든 TOOLBAR_ITEMS에 대해 사용자 정의 단축키(Ctrl+S/Ctrl+Shift+S 포함)로 Monaco 에디터 액션 등록 |
| OMD-EDIT-0106 | components/MainEditorApp.tsx | globalKeydownHandler | dispatchCommand, mapIdToCommandType, setShowTagLinkPicker, setFloatingToolbar | 전역 키보드 단축키 처리기: S/O의 브라우저 기본 동작 차단, Escape로 플로팅 툴바/태그 선택기 처리, 사용자 정의 단축키 라우팅 |
| OMD-FILE-0001 | components/GlobalSearch.tsx | GlobalSearch | handleSelectFolder, scanDirectory | 워크스페이스/폴더/단일 문서 전체를 검색하고 결과를 클릭 시 파일로 이동 |
| OMD-FILE-0002 | components/MergeModal.tsx | handleMerge | showToast, fetch, refreshParent, onClose, openFile | 선택한 파일들을 병합하여 새 파일로 저장 (로컬/브라우저 모드 대응) |
| OMD-FILE-0003 | lib/vfsHelper.ts | getVfsFiles | saveVfsFiles, vfsWriteFile, msg.error | localStorage에서 가상 파일 목록 조회, 없으면 Welcome.md로 초기화 |
| OMD-FILE-0004 | components/FileTreeItem.tsx | FileTreeItem | FileTreeItem (재귀), PromptModal, getFileIcon | 좌측 파일 탐색기 트리의 단일 노드로, 폴더 열기/파일 열기/드래그 이동/CRUD 지원 |
| OMD-FILE-0005 | components/MainEditorApp.tsx | getMdFiles | None | FileNode 트리를 순회하여 모든 .md 파일을 재귀적으로 수집합니다 |
| OMD-FILE-0006 | components/LeftSidebar.tsx | onFileOpenAndJump | scrollToLine, openFile, findNodeRecursively, showToast | 전역 검색 결과 파일을 열고 지정 줄로 이동 |
| OMD-FILE-0007 | components/MergeModal.tsx | removeItem | showToast | 병합 목록에서 특정 파일을 제거 |
| OMD-FILE-0008 | lib/vfsHelper.ts | saveVfsFiles | 없음 | 가상 파일 목록을 localStorage에 JSON 직렬화하여 저장 |
| OMD-FILE-0009 | components/LeftSidebar.tsx | handleLazyLoad | fetch, getVfsFiles, listDirectory | FileSystem API 또는 로컬 API로 폴더 내 .md 파일 목록을 지연 로딩 |
| OMD-FILE-0010 | components/MainEditorApp.tsx | fetchAllMdFiles | getMdFiles, fetch, api.listDirectory | 멀티 플랫폼 비동기 파일 트리 스캔: 브라우저, 로컬/Electron 또는 클라우드 API |
| OMD-FILE-0011 | lib/vfsHelper.ts | vfsReadFile | 없음 | 가상 파일 텍스트 내용을 localStorage에서 조회 |
| OMD-FILE-0012 | components/MergeModal.tsx | moveDown | setNodes | 병합 목록에서 파일을 한 칸 아래로 이동 |
| OMD-FILE-0013 | components/LeftSidebar.tsx | useEffect (drives fetch) | fetchDrives | 탐색기 탭이 활성화되고 데스크톱 환경일 때 드라이브 목록 자동 조회 |
| OMD-FILE-0014 | components/MergeModal.tsx | moveUp | setNodes | 병합 목록에서 파일을 한 칸 위로 이동 |
| OMD-FILE-0015 | components/LeftSidebar.tsx | fetchDrives | api.getDrives, fetch, msg.warn | electronAPI 또는 REST API를 통해 시스템 드라이브 목록 조회 |
| OMD-FILE-0016 | hooks/useEditorTabs.ts | useEditorTabs | getWelcomeContent | Monaco 에디터의 가상 모델 다중 탭 관리 및 탭 전환/생성/컨텐츠 동기화 |
| OMD-FILE-0017 | lib/vfsHelper.ts | findNodeByPath | 없음 | 노드 배열에서 path로 노드 재귀 검색 |
| OMD-FILE-0018 | components/MergeModal.tsx | useEffect (isOpen) | setNodes, setTargetName | 모달이 열릴 때 선택된 노드 목록을 복사하고 기본 병합 파일명 제안 |
| OMD-FILE-0019 | components/LeftSidebar.tsx | useEffect (isDesktop) | setIsDesktop | 클라이언트 환경이 데스크톱(electron)인지 감지하여 isDesktop 상태 설정 |
| OMD-FILE-0020 | components/MergeModal.tsx | useEffect (mounted) | setMounted | 클라이언트 마운트 완료 상태 설정으로 포탈 렌더링 hydration 방지 |
| OMD-FILE-0021 | components/LeftSidebar.tsx | onPromptConfirm | refreshFileList, openFile, vfsCreateFile, vfsCreateFolder, fetch, api.createFile, api.createFolder | PromptModal 확인 시 파일/폴더 생성 (브라우저/로컬/LocalStorage VFS 대응) |
| OMD-FILE-0022 | lib/vfsHelper.ts | vfsCreateFile | getVfsFiles, saveVfsFiles, vfsWriteFile, findNodeByPath | 가상 파일 시스템에 새 .md 파일 생성 (확장자 자동 추가) |
| OMD-FILE-0023 | components/MergeModal.tsx | MergeModal | handleMerge, moveUp, moveDown, removeItem, showToast | 여러 파일을 선택 순서대로 병합하여 새 파일로 저장 (로컬/브라우저 모드 대응) |
| OMD-FILE-0024 | lib/vfsHelper.ts | vfsCreateFolder | getVfsFiles, saveVfsFiles, findNodeByPath | 가상 파일 시스템에 새 폴더 생성 |
| OMD-FILE-0025 | components/LeftSidebar.tsx | LeftSidebar | fetchDrives, handleLazyLoad, onPromptConfirm, onFileOpenAndJump, FileTreeItem, GlobalSearch, PromptModal | 좌측 사이드바 - 탐색기(파일트리), 개요(TOC), 검색 탭 제공 |
| OMD-FILE-0026 | lib/vfsHelper.ts | updateChildPaths | 없음 | 노드 및 하위 노드의 path를 old 접두사에서 new 접두사로 재귀 교체 |
| OMD-FILE-0027 | lib/vfsHelper.ts | vfsRename | getVfsFiles, vfsReadFile, vfsWriteFile, saveVfsFiles, updateChildPaths | 가상 파일/폴더 이름 변경 및 경로 수정 (하위 콘텐츠 키 마이그레이션) |
| OMD-FILE-0028 | lib/vfsHelper.ts | vfsDelete | getVfsFiles, saveVfsFiles | 가상 파일/폴더 삭제 (하위 콘텐츠 localStorage 정리 포함) |
| OMD-FILE-0029 | hooks/useFileExplorer.ts | useFileExplorer | scanDirectory, getVfsFiles, fetch, vfsReadFile, vfsWriteFile, stripFrontmatter, idb.get, api.saveFile, api.listDirectory, api.readFromPath | 워크스페이스 폴더 연결, 파일 트리 스캔, 파일 열기/저장 I/O 전담 |
| OMD-FILE-0030 | components/MainEditorApp.tsx | loadFilesForDocLinkPicker | fetchAllMdFiles, setAllMdFiles | 문서 링크 선택기 열릴 때 모든 .md 파일 로드, 닫힐 때 상태 정리 |
| OMD-FILE-0031 | components/MainEditorApp.tsx | toggleMergeNodeSelect | setSelectedMergeNodes | 병합 선택 목록에서 FileNode 추가/제거 토글 |
| OMD-FILE-0032 | components/MainEditorApp.tsx | handleOpenMergeModal | showToast, setIsMergeModalOpen | 2개 이상의 파일이 선택된 경우에만 병합 모달 열기 |
| OMD-FILE-0033 | components/MainEditorApp.tsx | openExternalFile | api.readFromPath, switchTab, monaco.editor.createModel, setTabs, setActiveTabId, setContent, setCurrentFileName, setCurrentFileNode, handleFileOpenByPath, showToast | OS 수준 더블클릭 또는 명령줄에서 파일 열기, Monaco 모델로 탭 생성 |
| OMD-FILE-0034 | components/MainEditorApp.tsx | welcomeContentLoad | getWelcomeContent, setTabs, setActiveTabId, setContent, setCurrentFileName | 첫 마운트 시 탭이 없고 보류 중인 외부 파일이 없으면 웰컴 콘텐츠 로드 |
| OMD-FILE-0035 | components/MainEditorApp.tsx | saveStatusSync | setSaveStatus, setTabs | 콘텐츠와 lastSavedContent를 비교하여 저장 상태 및 탭 isModified 플래그 업데이트 |
| OMD-FILE-0036 | components/MainEditorApp.tsx | autoSave | saveFile, setSaveStatus, setTimeout, clearTimeout | 콘텐츠 변경 및 autoSave 활성화 시 5초 디바운스 후 파일 자동 저장 |
| OMD-FILE-0037 | components/MainEditorApp.tsx | readFileText | node.handle.getFile, vfsReadFile, api.readFromPath, fetch | 브라우저 FileSystemHandle, 로컬 electronAPI, VFS 또는 클라우드 API에서 파일 내용 읽기 |
| OMD-FILE-0038 | components/MainEditorApp.tsx | handleDocFileClick | readFileText, extractHeadings, setDocHeadings, setIsHeadingLoading | 문서 링크 선택기를 위해 선택된 문서 파일에서 제목 로드 |
| OMD-IO-0001 | components/PromptModal.tsx | handleSubmit | onConfirm | 폼 제출 시 입력값을 onConfirm으로 전달 |
| OMD-IO-0002 | lib/exportHandlers.ts | flushIME | 없음 | IME 조합 버퍼 강제 커밋 — export 전 한글 미완성 입력 캡처 차단 |
| OMD-IO-0003 | lib/epubGenerator.ts | escapeXml | 없음 | XML/EPUB용 literal 문자열 XHTML 안전 이스케이프 |
| OMD-IO-0004 | lib/api.ts | getApiUrl | 없음 | 환경(Next.js dev/Electron/Extension)에 맞게 API URL 동적 계산 |
| OMD-IO-0005 | lib/msg.ts | format | 없음 | 로그 메시지를 [온리비 어서] 프리픽스 + 레벨 포맷 |
| OMD-IO-0006 | components/ExportModal.tsx | ExportModal | 없음 | PDF/HTML/EPUB/PNG 포맷 선택 및 내보내기 요청을 처리하는 모달 창 |
| OMD-IO-0007 | lib/epubGenerator.ts | getMimeType | 없음 | 파일 확장자 기반 MIME 타입 결정 |
| OMD-IO-0008 | lib/exportHandlers.ts | applyExportInlineStyles | 없음 | html2canvas 인라인코드 높이 오계산 버그 해결 — display/height/line-height 강제 지정 |
| OMD-IO-0009 | lib/msg.ts | msg | format | [온리비 어서] 프리픽스 기반 통합 로깅 객체 (info/success/warn/error) |
| OMD-IO-0010 | components/PromptModal.tsx | useEffect (focus) | setValue, inputRef.current.focus, inputRef.current.select | 모달이 열릴 때 입력창에 defaultValue 설정 후 자동 포커스 |
| OMD-IO-0011 | lib/epubGenerator.ts | sanitizeToXHTML | 없음 | HTML 콘텐츠를 EPUB XHTML 규격으로 변환 — UI 요소 제거, 링크 보정, 앵커 삽입, 속성 정리 |
| OMD-IO-0012 | lib/exportHandlers.ts | restoreMapsInClone | msg.error | data-map-original-src 속성 기반 지도 복원 (Yandex 정적맵 fallback + Google Maps 링크) |
| OMD-IO-0013 | components/PromptModal.tsx | useEffect (mounted) | setMounted | 클라이언트 마운트 완료 상태를 설정하여 hydration mismatch 방지 |
| OMD-IO-0014 | components/PromptModal.tsx | PromptModal | handleSubmit, handleKeyDown, onConfirm, onCancel | 사용자 입력을 받는 모달 다이얼로그 - 파일명/폴더명 입력 등 |
| OMD-IO-0015 | lib/exportHandlers.ts | convertYoutubeIframeToLink | 없음 | YouTube iframe 임베드를 썸네일 + 하이퍼링크 컨테이너로 변환 |
| OMD-IO-0016 | lib/epubGenerator.ts | generateEpub | sanitizeToXHTML, escapeXml, getMimeType | EPUB 규격 파일 어셈블링 — XHTML/OPF/NCX/TOC/CSS 생성, 이미지 임베딩, 페이지 분할 |
| OMD-IO-0017 | lib/exportHandlers.ts | clonePreview | restoreMapsInClone, convertYoutubeIframeToLink | 미리보기 DOM 복제 + 버튼 정리 + 지도 복원 + 유튜브 변환 |
| OMD-IO-0018 | lib/epubGenerator.ts | downloadBlob | 없음 | EPUB Blob을 브라우저 다운로드 다이얼로그로 내보내기 |
| OMD-IO-0019 | lib/exportHandlers.ts | fixListMarkers | 없음 | html2canvas ::before/counter() 미지원 문제 해결 — DOM에 숫자/불릿 마커 직접 주입 |
| OMD-IO-0020 | lib/exportHandlers.ts | inlineLocalImages | getApiUrl | 상대 경로 / media:// 이미지를 Base64 Data URI로 인라인 임베딩 |
| OMD-IO-0021 | lib/exportHandlers.ts | injectExportStyles | 없음 | export 전 clone DOM에 동적 CSS + 인쇄 스타일 + 페이지 구분선 숨김 주입 |
| OMD-IO-0022 | lib/exportHandlers.ts | saveToDownloads | getApiUrl | 백엔드 /api/save-export API를 통해 다운로드 폴더에 파일 저장 |
| OMD-IO-0023 | lib/exportHandlers.ts | exportPDF | flushIME, clonePreview, inlineLocalImages, injectExportStyles, fixListMarkers, applyExportInlineStyles, saveToDownloads | 미리보기 DOM을 jsPDF로 A4 PDF 내보내기 (html2canvas 캡처, 페이지 분할, 슬라이스) |
| OMD-IO-0024 | lib/exportHandlers.ts | exportHTML | clonePreview, inlineLocalImages, injectExportStyles, saveToDownloads | 미리보기 DOM을 독립 HTML 파일로 내보내기 (Tailwind CDN + computed font 포함) |
| OMD-IO-0025 | lib/exportHandlers.ts | exportEPUB | clonePreview, inlineLocalImages, injectExportStyles, generateEpub, downloadBlob, saveToDownloads | 미리보기 DOM을 EPUB으로 내보내기 (generateEpub 호출, 이미지 인라인) |
| OMD-IO-0026 | lib/exportHandlers.ts | exportPNG | flushIME, clonePreview, inlineLocalImages, injectExportStyles, fixListMarkers, applyExportInlineStyles, saveToDownloads | 미리보기 DOM을 html-to-image로 PNG 캡처 및 저장 (Electron/브라우저) |
| OMD-IO-0027 | components/MainEditorApp.tsx | electronAPI_listeners | api.onNewFileRequested, api.onSaveFileRequested, api.onSaveFileAsRequested, api.onReceiveFile, openExternalFile, handlers.newFile, handlers.save, handlers.saveAs | 파일 작업 및 외부 파일 열기를 위한 Electron 메인 프로세스 IPC 리스너 등록 |
| OMD-PAY-0001 | components/MainEditorApp.tsx | supabaseRealtime_license | supabase.channel, supabase.from.software_licenses.select, handleSuccessActivation, showToast | 실시간 활성화를 위해 license_activations의 Supabase postgres_changes 구독, 데스크톱 프로토콜 폴백 포함 |
