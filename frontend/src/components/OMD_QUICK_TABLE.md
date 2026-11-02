# OMD 함수 카탈로그 퀵 테이블

> **Onrivi Author v1.0.1** — 호출구조 결합형 전수 함수 주석 가이드라인  
> 생성일: 2026-06-15 | 최종 갱신: 2026-07-03 | 총 함수: 70개 (MainEditorApp.tsx 기준)  
> **BUG 마크**: Shift+LeftArrow 관련 의심 함수 강조

---

## Shift+LeftArrow 선택 버그 분석

**현상**: 커서가 멈추다 갑자기 앞으로 이동하면서 선택됨

**원인**: `globalKeydownHandler` (L3319) — `capture:true` 모드로 Monaco 에디터보다 먼저 키 이벤트 수신

**즉시 수정 코드** — `handleGlobalKeyDown` 함수 최상단에 추가:
```typescript
// Shift+방향키는 capture 단계에서 절대 가로채지 않음 (Monaco cursorLeftSelect 보호)
if (e.shiftKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
```

---

## 함수 카탈로그 인덱스 (55개)

| 주석 고유번호 | 소스 위치 | 대상 함수명 | 상호 호출 함수 목록 | 핵심 기능 요약 |
|---|---|---|---|---|
| OMD-FILE-0001 | MEA.tsx:180 | getMdFiles | - | FileNode 트리에서 .md 파일 전체 재귀 수집 |
| OMD-FILE-0002 | MEA.tsx:198 | fetchAllMdFiles | getMdFiles, fetch, api.listDirectory | 멀티플랫폼 비동기 파일 트리 스캔 |
| OMD-CORE-0001 | MEA.tsx:252 | resolveRelativeImagePath | - | 마크다운 상대 이미지 경로 절대 경로 변환 |
| OMD-CORE-0002 | MEA.tsx:309 | getRelativePath | - | 두 파일 간 상대 경로 계산(위키 링크) |
| OMD-CORE-0003 | MEA.tsx:338 | MainEditorApp (컴포넌트) | useToast, useEditorTabs, useFileExplorer, useEditorSettings, usePageBreak | 컨트롤 타워: 전체 상태·레이아웃·Monaco 통합 |
| OMD-EDIT-0001 | MEA.tsx:344 | contentRef_sync | - | contentRef.current를 content 상태와 동기화 |
| OMD-CORE-0004 | MEA.tsx:417 | loadUserProfiles | api.readProfiles, localStorage.getItem, setProfiles | 플랫폼 저장소에서 CSS 프로파일 로드 |
| OMD-EDIT-MainEditorApp-0001 ✅ FIXED | MEA.tsx:28 | MainEditorApp | useToast, useEditorTabs, useFileExplorer, useEditorSettings, useEditorHandlers, getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath, utilsEditorActions, utilsPasteHandlers, getSlashCommands, preprocessMarkdownForPreview, saveSecureData, loadSecureData, idb, getApiUrl | 에디터/UI 전역 상태 관리 및 레이아웃 조립 *(수정: 2026-06-20 — 데스크톱 라이선스 체크 배제, 2026-06-23 — 탭 추가(+) 기능 제거, 2026-07-04 — 서식설정 탭 모드를 대형 팝업 모달 방식으로 전면 개편)* |
| OMD-EDIT-0002 | MEA.tsx:461 | previewModeRef_sync | - | previewModeRef 상태 동기화 |
| OMD-EDIT-0003 | MEA.tsx:466 | helpContent_forces_preview | setPreviewModeRaw | 헬프 콘텐츠 설정 시 미리보기 모드 강제 전환 |
| OMD-CORE-0005 | MEA.tsx:491 | pageViewInit | localStorage.getItem | 페이지뷰 모드 localStorage 복원 |
| OMD-CORE-0006 | MEA.tsx:501 | handleTogglePageView | localStorage.setItem | 페이지뷰 on/off 토글 및 저장 |
| OMD-EDIT-0004 ✅ FIXED | MEA.tsx:513 | tabMetadata_sync | setTabs, activeTabId (최상단 선행 선언 상태 참조) | 탭 메타데이터(파일명·노드·경로) 동기화 *(수정: 2026-06-15 — tabs/activeTabId 최상단 선행 선언으로 TDZ 해결)* |
| OMD-EDIT-0005 | MEA.tsx:531 | searchOpen_sidebar_behavior | setIsSidebarOpen, setSidebarTab | 검색창 열릴 때 사이드바 검색 탭 활성화 |
| OMD-FILE-0003 | MEA.tsx:564 | loadFilesForDocLinkPicker | fetchAllMdFiles, setAllMdFiles | doc link picker 열릴 때 전체 .md 목록 로드 |
| OMD-AUTH-0001 | MEA.tsx:591 | initDeviceId | api.getMachineId, chrome.storage, crypto.randomUUID | 장치 고유 ID 초기화 |
| OMD-AUTH-0002 | MEA.tsx:629 | loadAndVerifyLicense | api.loadLicenseFull, supabase, saveSecureData, setLicenseStatus | 라이선스 로드 및 Supabase DB 검증 |
| OMD-PAY-0001 | MEA.tsx:784 | supabaseRealtime_license | supabase.channel, handleSuccessActivation, showToast | Supabase 실시간 라이선스 활성화 구독 |
| OMD-AUTH-0003 | MEA.tsx:840 | handleSuccessActivation | setLicenseStatus, api.saveLicenseFull, chrome.storage | 결제 성공 후 라이선스 전체 저장 |
| OMD-FILE-0004 | MEA.tsx:895 | toggleMergeNodeSelect | setSelectedMergeNodes | 병합 선택 목록에 FileNode 추가/제거 |
| OMD-FILE-0005 | MEA.tsx:906 | handleOpenMergeModal | showToast, setIsMergeModalOpen | 병합 모달 열기(2개 이상 선택 필요) |
| OMD-EDIT-0006 | MEA.tsx:961 | currentFileNodeRef_sync | - | currentFileNodeRef stale closure 방지 동기화 |
| OMD-EDIT-0007 | MEA.tsx:962 | currentFileNameRef_sync | - | currentFileNameRef 동기화 |
| OMD-EDIT-0008 | MEA.tsx:963 | workspaceTypeRef_sync | - | workspaceTypeRef 동기화 |
| OMD-EDIT-0009 | MEA.tsx:964 | rootFolderRef_sync | - | rootFolderRef 동기화 |
| OMD-CORE-0007 | MEA.tsx:965 | tabSizeRef_sync | parseInt | 활성 CSS 프로파일에서 tabSize 갱신 |
| OMD-EDIT-0010 | MEA.tsx:1015 | setPreviewMode | setPreviewModeRaw, createNewTab, switchTab, clearTimeout | 미리보기 모드 전환 (콘텐츠 보존·헬프 가드) |
| OMD-EDIT-0011 ✅ FIXED | MEA.tsx:1057 | closeTab | setTabs, switchTab, createNewTab, setConfirmConfig | 탭 닫기 (미저장 경고·모델 해제·모드 자동 복귀) *(수정: 2026-06-18 — tabsRef 즉시 동기화 + isDisposed() 가드 + stale ref로 삭제 탭 복원 버그 수정)* |
| OMD-EDIT-0012 ✅ FIXED | MEA.tsx:1101 | autoSaveRef/lastSavedContentRef 선행 선언 | useRef (React) | autoSaveRef·lastSavedContentRef 선행 선언 (기존 L1289→L1101 이동) *(수정: 2026-06-15 — autoSaveRef useEffect 참조 이전 선언 이동으로 rS TDZ 해결)* |
| OMD-CORE-0008 | MEA.tsx:1168 | handleCheckboxToggle | editor.getModel, editor.executeEdits | 미리보기 체크박스 클릭→에디터 라인 동기화 |
| OMD-CORE-0009 | MEA.tsx:1198 | updateDecorations | decorationsCollectionRef.current.set | Monaco 마크다운 문법 강조 데코레이션 업데이트 |
| OMD-EDIT-0013 | MEA.tsx:1305 | previewWheelSync | editor.setScrollTop | 미리보기 마우스휠을 에디터 스크롤에 전달 |
| OMD-CORE-0010 | MEA.tsx:1330 | darkModeDOMClass | document.documentElement.classList | documentElement dark 클래스 토글 |
| OMD-EDIT-0014 | MEA.tsx:1340 | editorSettingsSync | monaco.editor.setTheme, editor.updateOptions | 테마·폰트·줄바꿈 설정 에디터 재적용 |
| OMD-CORE-0011 | MEA.tsx:1360 | darkModePaletteSync | setThemePalette | 다크모드 토글 시 팔레트 자동 전환 |
| OMD-CORE-0012 | MEA.tsx:1375 | profilesSave | api.saveProfiles, localStorage.setItem | CSS 프로파일 변경 시 플랫폼 저장 |
| OMD-CORE-0013 | MEA.tsx:1388 | activeProfileSave | localStorage.setItem | 활성 CSS 프로파일 ID localStorage 저장 |
| OMD-IO-0001 | MEA.tsx:1396 | electronAPI_listeners | api.onNewFileRequested, api.onReceiveFile, openExternalFile | Electron IPC 리스너 등록 (파일 작업) |
| OMD-FILE-0006 ✅ FIXED | MEA.tsx:1426 | openExternalFile | api.readFromPath, switchTab, monaco.editor.createModel, setTabs | OS 더블클릭/CLI 파일 열기, Monaco 모델 생성 *(수정: 2026-06-18 — disposed model 가드: 기존 탭 model.isDisposed() 시 스테일 탭 정리)* |
| OMD-FILE-0007 | MEA.tsx:1481 | welcomeContentLoad | getWelcomeContent, setTabs, setActiveTabId | 최초 마운트 시 환영 콘텐츠 로드 |
| OMD-EDIT-0015 | MEA.tsx:1524 | dynamicTitleBar | - | 현재 파일명으로 document.title 갱신 |
| OMD-CORE-0014 | MEA.tsx:1534 | previewHighlightLine | element.classList | 에디터 커서 라인 미리보기 강조 |
| OMD-CORE-0015 | MEA.tsx:1566 | postContentScrollCorrection | requestAnimationFrame, editor.getTopForLineNumber | 콘텐츠 변경 후 미리보기 스크롤 위치 보정 |
| OMD-EDIT-0016 | MEA.tsx:1612 | handleMouseMove | setSidebarWidth, localStorage.setItem | 사이드바 리사이즈 드래그 처리 |
| OMD-EDIT-0017 | MEA.tsx:1623 | stopResizing | document.removeEventListener | 사이드바 리사이즈 종료 |
| OMD-EDIT-0018 | MEA.tsx:1631 | startResizing | document.addEventListener | 사이드바 리사이즈 시작 |
| OMD-FILE-0008 ✅ FIXED | MEA.tsx:1645 | saveStatusSync | setSaveStatus, setTabs | 콘텐츠 vs lastSaved 비교로 저장 상태·탭 수정 여부 갱신 *(수정: 2026-06-18 — onDidChangeContent 핸들러 val !== t.content 비교로 전환 시 false isModified 방지)* |
| OMD-FILE-0009 | MEA.tsx:1657 | autoSave | saveFile, setSaveStatus, setTimeout, clearTimeout | 5초 디바운스 자동 저장 |
| OMD-EDIT-0047 ✅ FIXED | MainEditorApp.tsx | autoSave | 콘텐츠 변경 및 5초 디바운스 자동 저장 | 🚨 @PATCH: 2026-08-05 (자동 저장 시 isModified 초기화 복구 로직 추가) |
| OMD-EDIT-0048 | MainEditorApp.tsx | insertAtCursor | 커서 위치 텍스트 삽입 (위임) | - |
| OMD-CORE-0016 | MEA.tsx:1699 | findLineNumberByHeading | utilsEditorActions.findLineNumberByHeading | 제목으로 라인 번호 탐색 |
| OMD-EDIT-0020 | MEA.tsx:1708 | scrollToLine | utilsEditorActions.scrollToLine | 에디터 특정 라인으로 스크롤 |
| OMD-CORE-0017 | MEA.tsx:1717 | handlePreviewClick | scrollToLine, classList | 미리보기 클릭 시 에디터 해당 라인으로 스크롤 |
| OMD-EDIT-0021 | MEA.tsx:1744 | insertBlockTag | utilsEditorActions.insertBlockTag | 블록 태그 감싸기 |
| OMD-EDIT-0022 | MEA.tsx:1755 | wrapSelection | utilsEditorActions.wrapSelection | 선택 영역 서식 감싸기/해제 |
| OMD-EDIT-0023 | MEA.tsx:1759 | insertLink | editor.executeEdits, editor.setSelection | 마크다운 링크 삽입 및 URL 플레이스홀더 선택 |
| OMD-EDIT-0024 | MEA.tsx:1812 | insertTagLink | setShowTagLinkPicker | 태그 링크 피커 열기 |
| OMD-EDIT-0025 | MEA.tsx:1816 | handleTagLinkSelect | editor.executeEdits | 헤딩 선택 후 태그 링크 삽입 |
| OMD-FILE-0010 | MEA.tsx:1853 | readFileText | node.handle.getFile, vfsReadFile, api.readFromPath | 파일 콘텐츠 읽기 (브라우저/Electron/VFS/API) |
| OMD-CORE-0018 | MEA.tsx:1897 | extractHeadings | - | 마크다운 텍스트에서 H1~H6 제목 추출 |
| OMD-FILE-0011 | MEA.tsx:1915 | handleDocFileClick | readFileText, extractHeadings, setDocHeadings | doc link picker에서 파일 선택 시 제목 목록 로드 |
| OMD-EDIT-0026 | MEA.tsx:1930 | handleDocLinkSelect | getRelativePath, editor.executeEdits | 크로스 문서 링크([[path#heading]]) 삽입 |
| OMD-EDIT-0027 | MEA.tsx:1972 | parseHtmlTableToMarkdown | utilsPasteHandlers.parseHtmlTableToMarkdown | HTML 표를 마크다운 표로 변환 |
| OMD-EDIT-0028 ✅ FIXED | MEA.tsx:1983 | sanitizePastedText | utilsPasteHandlers.sanitizePastedText | 붙여넣기 텍스트 정제 *(수정: 2026-06-18 — NBSP→공백 치환 추가)* |
| OMD-EDIT-0029 | MEA.tsx:1993 | fixMarkdownTable | utilsPasteHandlers.fixMarkdownTable | 마크다운 표 정렬 수정 |
| OMD-EDIT-0030 | MEA.tsx:1997 | handleEditorPaste | FileReader, parseHtmlTableToMarkdown, sanitizePastedText, insertAtCursor, updateContent, showToast | 붙여넣기 처리: 이미지 업로드·HTML표 변환·텍스트 정제 |
| OMD-EDIT-0031 | MEA.tsx:2101 | applyLinePrefix | editor.getSelection, editor.executeEdits, model.forceTokenization | 선택 라인에 순서/불릿/인용/체크리스트 prefix 적용 |
| OMD-EDIT-0032 | MEA.tsx:2213 | removePrefix | editor.getSelection, editor.executeEdits | 선택 영역의 마크다운 서식 제거 |
| OMD-CORE-0019 | MEA.tsx:2281 | processedContent_lineMap | preprocessMarkdownForPreview | 미리보기 전처리 및 라인 매핑 생성(스크롤 동기화용) |
| OMD-CORE-0020 | MEA.tsx:2301 | dynamicCssString | - | 활성 CSS 프로파일로 동적 CSS 문자열 생성 |
| OMD-EDIT-0033 | MEA.tsx:2491 | quickWrap | wrapSelection, applyLinePrefix, insertBlockTag | 빠른 서식 감싸기(heading/quote/code) |
| OMD-EDIT-MainEditorApp-0070 | MainEditorApp.tsx:3426 | dispatchCommand | 2026-07-06 | 🚨 @PATCH : 제한 사용자 단축키 및 쓰기 방어 가드 제거 (전체 사용자 무료화) | ✅ FIXED | 명령 유형→핸들러 메서드 라우팅 |
| OMD-EDIT-0035 | MEA.tsx:2740 | mapIdToCommandType | - | 툴바 ID→EditorCommandType 변환 |
| OMD-EDIT-0036 | MEA.tsx:2791 | hotkeyRegistration | TOOLBAR_ITEMS.forEach, editor.addAction, parseKeybinding | Monaco 커스텀 단축키 액션 등록 |
| OMD-EDIT-0037 ✅ FIXED | MEA.tsx:3319 | globalKeydownHandler | dispatchCommand, mapIdToCommandType, setShowTagLinkPicker, setFloatingToolbar | capture:true 전역 키 핸들러 *(수정: 2026-06-15 — Shift+방향키 early return 추가로 Monaco 선택 버그 해결)* | |
| OMD-CORE-0021 | MEA.tsx:3472 | toc | - | 마크다운 제목 파싱→TOC 목차 생성 |
| OMD-FILE-0012 ✅ FIXED | MEA.tsx:2027 | welcomeContentLoad 제거 | - | 초기 "새 파일.md" 빈 탭 자동 생성 제거 — 전체 사용자는 아무 탭 없이 시작, 탐색기에서만 파일 생성 |
| OMD-FILE-0013 ✅ FIXED | MEA.tsx:1536 | closeTab | switchTab, setContent | 마지막 탭 닫을 때 createNewTab("") 대신 에디터 초기화만 하고 탭 없이 유지 |
| OMD-EDIT-0038 ✅ FIXED | apiUrlBuilder.ts:16 | getApiUrl | - | Electron `app:` 프로토콜 감지 추가 → API 호출이 `http://localhost:4000`으로 라우팅되도록 수정 |
| OMD-EDIT-0039 ✅ FIXED | MEA.tsx:3446 | TOGGLE_CSS_STYLE | setPreviewMode | css-style 진입/탈출 토글 가능하도록 수정 (prev === 'css-style' ? 'both' : 'css-style') |
| OMD-EDIT-0040 ✅ FIXED | MEA.tsx:1479 | setPreviewMode guard 제거 | - | `if (prev === 'css-style' && next !== 'css-style') return prev;` 가드 제거 → CssStyleForm 닫기/토글로 정상 탈출 가능 |
| OMD-EDIT-0041 ✅ FIXED | useEditorTabs.ts:85 | switchTab | setTabs, editor.getValue | css-style/preview 모드 탈출 시 에디터 내용을 tabs 배열에 동기화 (데이터 유실 방지) |
| OMD-EDIT-0042 ✅ FIXED | useFileExplorer.ts:344 | handleFileClick | setTabs, editor.getValue | css-style 모드 탈출 시 에디터 내용 tabs 배열에 동기화 |
| OMD-EDIT-0043 ✅ FIXED | MEA.tsx:3145 | dynamicCssString | - | img/video/map 태그의 width/height/max-width/max-height에 `!important` 제거 → inline style 우선 적용 |
| OMD-EDIT-0044 ✅ FIXED | exportHandlers.ts:110 | generateExportCss | - | img/video/map 태그의 width/height에 `!important` 제거 (내보내기 CSS 동기화) |
| OMD-CORE-0022 | MEA.tsx:1846/4077 | readOnly | licenseStatus, tabs.length | 탭이 없을 때 에디터 자동 readOnly (tabs.length === 0) |
| OMD-CORE-0023 ✅ FIXED | MapModal.tsx:118 | mapCode | - | 지도 iframe width/height HTML 속성 → inline style로 변경 (CSS 우선순위 확보) |
| OMD-FILE-0014 | LeftSidebar.tsx:449 | MergeMode 취소 버튼 | onCancelMerge | 병합 모드 시 탐색기 상단에 "병합 모드 (N개) ✕" 취소 바 추가 |
| OMD-FILE-0015 ✅ FIXED | FileTreeItem.tsx:331 | handleRename | showToast, openTabPaths | 열린 탭 파일/폴더 이름변경 차단 (openTabPaths 검사 추가) |
| OMD-AUTH-0004 ✅ FIXED | MEA.tsx:1129 | license_force_preview | setTabs, setPreviewModeRaw | 제한사용자(미리보기 전용) → css-style 모드 + 서식 정의 미리보기 탭 자동 생성 |
| OMD-HOOK-0001 | useEditorSettings.ts:12 | useEditorSettings | getDefaultHotkeys, THEME_MAP, idb, getApiUrl | 테마·단축키·폰트·자동저장 설정 관리 |
| OMD-HOOK-0002 | useEditorSettings.ts:41 | handleThemeChange | setThemePalette, setIsDarkMode | 테마 전환 |
| OMD-HOOK-0003 ✅ FIXED | useEditorTabs.ts:13 | useEditorTabs | tabs, setTabs, activeTabId, setActiveTabId (외부 주입), getWelcomeContent, monaco.editor.createModel | 다중 탭 관리 *(수정: 2026-06-15 — 내부 useState 제거→외부 주입 전환으로 rS TDZ 에러 해결; 2026-06-18 — onDidChangeContent isModified: true → val !== t.content 비교)* |
| OMD-HOOK-0004 | useEditorTabs.ts:35 | updateContent | setContent, setTabs | 콘텐츠 변경 탭 동기화(100ms 디바운스) |
| OMD-HOOK-0005 ✅ FIXED | useEditorTabs.ts:59 | switchTab | editor.setModel, setActiveTabId | 탭 전환·스크롤 저장·모델 교체 *(수정: 2026-06-17 — css-style↔일반 탭 전환 시 모드 자동 전환, 도움말 탭 preview 모드 강제; 2026-06-18 — isDisposed() 가드로 Model is disposed! 크래시 방지 + stale ref 복원 버그 수정)* |
| OMD-HOOK-0006 ✅ FIXED | useEditorTabs.ts:89 | createNewTab | monaco.editor.createModel, setTabs | 새 탭 생성 및 Monaco 모델 초기화 *(수정: 2026-06-18 — onDidChangeContent isModified: true → val !== t.content 비교)* |
| OMD-HOOK-0006 ✅ FIXED | useFileExplorer.ts | handleFileOpenByPath | 경로 문자열 기반 파일 탐색 및 탭 오픈 | 🚨 @PATCH: 2026-09-13 (작업장 외부 문서 온디맨드 권한 획득 및 IndexedDB 스마트 캐싱: ConfirmModal/showOpenFilePicker 사용자 제스처 호출, 본문 로드·탭 수화·Monaco 갱신·tab.node.handle 부여로 편집/디스크 저장 지원, externalFileStore 1초 즉시 오픈); 2026-09-13 (작업장 외부 미연결 문서 오픈 시 안내 Alert 및 가이드 토스트 연동); 2026-09-13 (모나코 에디터 라인 범위 클램프 가드 및 프로드 웹 404 방어, startLine/endLine lineCount 클램핑, localhost/Electron 가드); 2026-09-13 (작업장 불일치 지식 DB 청크 본문 완전 복원 및 빈 탭 자동 수화 강화); 2026-09-13 (작업장 불일치 외부 절대경로 문서 오픈 및 로컬 디스크 원문 로드: /api/file-content 호출 및 기존 빈 탭 수화 로직, L시작-L끝 라인 범위 점프); 2026-09-13 (출처 링크 점프 고도화 및 에디터-미리보기 동시 스크롤·하이라이트); 2026-09-12 (웹 브라우저 출처 링크 파일 열기 및 헤딩 점프 결함 완벽 해결) |
| OMD-CORE-externalFileStore-0001 ✅ FIXED | externalFileStore.ts | saveExternalFileHandle, getExternalFileHandle, verifyHandlePermission, pickExternalFile | 작업장 외부 문서의 FileSystemFileHandle IndexedDB 캐싱 및 온디맨드 권한 복원/선택 | 🚨 @PATCH: 2026-09-13 (작업장 외부 문서 온디맨드 권한 획득 및 IndexedDB 스마트 캐싱 유틸리티 신설) |
| OMD-MODAL-0002 ✅ FIXED | AIDraftModal.tsx | handleGenerate, handleApply | AI 초안 생성 및 본문 적용 | 🚨 @PATCH: 2026-09-13 (출처 링크 일원화 및 본문 인라인 링크 결합: 하단 출처 목록 [출처 N: 문서명](<file:///...#L시작-L끝>) 단일 링크화 및 본문 인라인 [출처 N: ...] 태그 자동 링크 결합); 2026-09-12 (본문 인라인 출처 번호 매칭 [출처 N: 문서명], 하단 출처 목록 1:1 번호화 및 절대경로 <file:///> 꺾쇠 포맷 적용) |
| OMD-HOOK-0007 | useFileExplorer.ts | restoreFolderPermission | 브라우저 파일 시스템 권한 복구 유틸리티 | - |
| OMD-HOOK-0008 ✅ FIXED | useFileExplorer.ts | saveFile | 파일 저장 로직 및 탭 상태(isModified) 동기화 | 🚨 @PATCH: 2026-08-05 (저장 후 t.content 갱신을 통해 영구적인 isModified 꼬임 버그 해결) |
| OMD-EDIT-0050 ✅ FIXED | useEditorHandlers.ts | save, saveAs | api.saveFile, api.saveFileAs, updateCssProfileInFrontmatter | 에디터 내용을 파일로 저장 및 새 이름으로 저장 *(수정: 2026-08-05 — 저장 시점 css_profile 강제 주입 로직 추가 및 isModified 레이스 컨디션 버그 픽스)* |
| OMD-HOOK-0009 | usePageBreak.ts | usePageBreak | handleResetPageBreaks, executeAutoPageBreak | 자동 페이지 나누기 |
| OMD-EDIT-0065 ✅ FIXED | MEA.tsx:2861 | handlePasteImageFile | insertWithR2Fallback, webUploadImage | 클립보드 이미지 처리 (데스크탑 R2 선 시도) 🚨 2026-07-30 — R2 제거, 무조건 로컬(resourceFolder) 저장으로 단순화 |
| OMD-EDIT-0066 ✅ FIXED | MEA.tsx:2900 | insertWithR2Fallback | api.saveImage | 🚨 2026-07-30 — R2 업로드 로직 제거, api.saveImage → mediaPath 우선 사용, 로컬 저장 전용으로 리팩토링 |
| OMD-EDIT-0067 ✅ FIXED | VideoCard.tsx:29 | useEffect | - | 로컬 환경(데스크탑/dev) 동영상 썸네일 생략 및 텍스트 설명 표시 |
| OMD-EDIT-0068 ✅ FIXED | VideoCard.tsx:49 | useEffect | - | 동영상 썸네일 추출 시 검은 화면 방지를 위해 1초 시점으로 이동(seeking) 후 추출 |
| OMD-EDIT-0069 ✅ FIXED | MarkdownViewer.tsx:1400 | p, code, a | - | 🚨 @PATCH: 2026-09-17 (다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 코발트 블루 및 1px 인셋 아웃라인 연동; 코드블록 내부 에디터-미리보기 커서 위치 불일치 및 솟구침 결함 완벽 해결: CodeBlock 내부 splitChildrenIntoLines 분할 및 개별 행 <span class="onrivi-line" data-line="..."> 1:1 부여, 에디터 커서 이동 시 코드블록 내부 활성 줄 단독 하이라이트 및 Safe Zone 정밀 추종 연동); 2026-09-13 (출처 링크 클릭 시 동일/타겟 문서 판별 고도화 및 미리보기·에디터 동시 스크롤·하이라이트 연동: isSameFile 3중 경로 비교, scrollIntoView 및 preview-highlight-line 부여, onFileOpen 동시 호출); 2026-09-12 (인라인 코드 code에 걸려 있던 white-space: pre !important 해제 및 pre-wrap, break-word, overflow-wrap anywhere 적용으로 페이지 가로 넘침 및 텍스트 잘림 현상 완벽 해결); 중첩된 이미지에서 p 태그 Hydration 에러 방지를 위해 mdast가 아닌 hast 속성(tagName === 'img')을 기준으로 재귀적 노드 검사하도록 수정 |
| OMD-EDIT-0070 ✅ FIXED | VideoCard.tsx:35 | useEffect | - | "데스크탑은 원래대로": 데스크탑 썸네일 추출 유지. "로컬에서는 파일명": 로컬 웹서버(localhost)에서만 추출 건너뛰어 CORS 에러 방지 |
| OMD-EDIT-0071 ✅ FIXED | ReferenceManagerModal.tsx | handleSave | vfsWriteFile, api.saveFile | 외부 참조 파일(.bib, .json 등)을 리소스 폴더에 생성 및 저장하는 별도의 도구 모달 추가 *(수정: 2026-08-05 — 좌측 목록 조회, 수정, 삭제를 포함한 2-Pane CRUD 관리자 형태로 완전 개편)* |
| OMD-EDIT-0038 | ImageModal.tsx | handleInsert | 모달 완료 시 본문에 이미지 경로 삽입 | - |
| OMD-EDIT-0039 ✅ FIXED | ImageModal.tsx | previewSrc_fix | 이미지 모달 미리보기 소스 경로 처리 버그 수정 | 🚨 @PATCH: 2026-08-05 (local 모드에서도 API view를 통한 Fallback SVG 표시 지원) |
| OMD-EDIT-0040 | ImageModal.tsx | FileDrop | 이미지 드래그 앤 드롭 및 붙여넣기 이벤트 지원 | - |
| OMD-CORE-CSS-0001 ✅ FIXED | CssStyleModal.tsx | CssStyleModal | StyleManagerModal | **2026-08-15** — 모달 창 풀스크린 전환 / StyleManagerModal 신규 연동 / 헤더 [서식 관리] + [에디터로 이동] 버튼 대체 |
| OMD-CORE-CSS-0002 ✅ FIXED | CssStyleForm.tsx | CssStyleForm | onOpenStyleManager | **2026-08-15** — 상단 헤더 간소화: 7개 이모지 버튼 제거 → [테마 드롭다운] + [⚙ 서식 관리] 버튼 2개로 정리 / onOpenStyleManager prop 추가 |
| OMD-CORE-CSS-0003 ✅ FIXED | StyleManagerModal.tsx | StyleManagerModal (NEW) | CssProfile, isSystemProfileId, ConfirmModal, GoogleGenerativeAI | **2026-08-15** — 신규 풀스크린 서식 관리 전용 모달. 좌측 서식 목록 / 우측 이름변경·가져오기·내보내기·AI생성·삭제 기능 통합 |
