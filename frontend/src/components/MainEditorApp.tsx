/**
 * 프로그램명 : OnriviAuthor 
// 🚨 @PATCH : **2026-11-04** — [Monaco 텍스트 삽입·서식 조작 모듈화]:
//             1) insertAtCursor(+커서 삽입 이벤트 리스너), scrollToLine, insertBlockTag, wrapSelection, insertLink, 표 변환/붙여넣기 정제 위임, replaceDocumentMedia/editDocumentMedia, applyLinePrefix/removePrefix, quickWrap, handleInsertFormattedDate, handleAIDraftApply를 useEditorFormatting 훅으로 분리 위임 (동작 변경 없음)
// 🚨 @PATCH : **2026-11-04** — [서식 프로필 및 프론트매터 동기화 모듈화]:
//             1) profiles, activeProfileId, isProfilesLoaded, profileStorageRevision 및 로드/저장/디바운스 로직을 useEditorProfiles 훅으로 분리 위임
//             2) resolveEffectiveDocumentProfile, handleProfileChange, 제목 넘버링(headingNumbering) 동기화를 useEditorProfiles 훅으로 분리 위임 (350줄 감축)
// 🚨 @PATCH : **2026-11-04** — [문서 링크 및 헤딩 연결 모듈화]:
//             1) 문서 연결(DocLinkPicker) 상태, 헤딩 파싱(extractHeadings), 파일 텍스트 읽기(readFileText), 팝업 좌표 계산(docLinkPickerStyle)을 useEditorDocLinks 훅으로 분리 위임 (460줄 감축)
// 🚨 @PATCH : **2026-11-04** — [에디터 파일 유틸리티 모듈화]:
//             1) getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath를 editorFileUtils로 분리 위임 (326줄 감축)
// 🚨 @PATCH : **2026-11-04** — [deleteResourceAICredentials 미임포트 런타임 오류 수정]:
//             1) clearResourceFolder에서 호출하는 deleteResourceAICredentials 임포트 누락 보완하여 ReferenceError 방어
// 🚨 @PATCH : **2026-11-04** — [formatTime 미정의 런타임 오류 수정]:
//             1) useEditorLicense로부터 formatTime(게스트 남은 시간 포맷터)을 구조분해 할당하여 EditorCore 전달 시 ReferenceError 브라우저 크래시 완전 해결
// 🚨 @PATCH : **2026-11-04** — [미정의 setIsAboutModalOpen 런타임 오류 수정]:
//             1) useEditorCommands 옵션 및 호출부에서 불필요하게 선언되어 있던 setIsAboutModalOpen 미정의 식별자를 제거하여 ReferenceError 브라우저 크래시 완전 해결
//             2) 컴포넌트 상단 미사용 AboutModal dead import 제거
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화 및 세션 관리 분리]:
//             1) dynamicCssGenerator, useEditorLicense, useEditorCommands, useEditorPaste, useEditorSaveActions 분리 위임 완료
//             2) restoreSessionTabs, openExternalFile, 세션 자동저장, 브라우저 종료 플러시, IPC 연동을 useEditorDocumentSession 훅으로 분리 (420줄 감축)
//             3) handleSaveToLocal, handleSaveToWebDrive, handleCreateNewDocument, transferProgress를 useEditorSaveActions 훅으로 분리 (237줄 감축)
//             4) useEditorLicense 호출부를 licenseKey/useEditorSettingsResult 선언부 뒤로 재배치하여 'Cannot access op before initialization' TDZ 런타임 오류 완전 해결
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 4단계 리팩토링 4단계: EditorCore 코어 뷰 분리 완료]:
//             1) MainEditorApp.tsx 내부의 1,779줄에 달하는 에디터/미리보기 스플릿 뷰, 브레드크럼, 탭바, 툴바 본체를 EditorCore.tsx 컴포넌트로 분리
//             2) Container(MainEditorApp)는 순수 상태 조율 및 Context Provider 제공에만 집중하고, Layout(EditorLayout)의 중앙 렌더링을 EditorCore에 위임하여 역할 기반 아키텍처(Container-Layout-Core-Manager) 100% 완성
//             3) MainEditorApp.tsx 약 1,700줄 추가 슬림화 달성 및 tsc --noEmit 무결점 통과
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 4단계 리팩토링 3단계: EditorLayout 레이아웃 분리]:
//             1) 에디터 쉘(Shell), 메뉴바(MenuBar), 좌측 사이드바(LeftSidebar), 상태바(StatusBar), 동시 접속 배너 및 지식 베이스 뷰를 EditorLayout으로 분리 (Rule 3 준수)
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 4단계 리팩토링 2단계: useEditorKeybindings 단축키 분리]:
//             1) Monaco 에디터 액션 등록 및 전역 keydown 이벤트 핸들러(handleGlobalKeyDown)를 useEditorKeybindings 독립 훅으로 분리 (Rule 3 준수)
// 🚨 @PATCH : **2026-11-04** — [MainEditorApp 4단계 리팩토링 1단계: EditorOverlayManager 모달 분리]:
//             1) 16개 이상의 모달(ModalManager) 및 AIDraftModal, NewDocumentModal, CalendarModal, DateTimePicker, QuoteDropdown, 로딩 오버레이 렌더링을 EditorOverlayManager로 통합 분리 (Rule 3 Manager 영역 준수)
// 🚨 @PATCH : **2026-11-04** — [오류 진단 로깅 2단계]: restoreSessionTabs 최외곽 logError 연동, Monaco 바인딩 메타데이터(탭수/유형/ID) 강화, 세션 파싱 doing 표준화
// 🚨 @PATCH : **2026-11-03** — [오류 진단 로깅 2단계]: cross_platform_session_restore, session_auto_save, restoreSessionTabs에 5대 메타데이터 기반 logError/logWarn 연동으로 세션 복원 및 자동저장 실패 정밀 추적
// 🚨 @PATCH : **2026-11-03** — [웹드라이브 비연결 시 세션 복원 대기 및 연결 시점 즉시 복원]:
//             웹 환경(!isElectron)에서 웹드라이브 미연결 상태일 때 이전 최종 문서를 노출하지 않고,
//             구글 웹드라이브가 정상 연결·인증되는 즉시 이전 최종 문서 및 탭 세션을 복원하도록 가드 분기 정밀화. 데스크톱(Electron) 로컬 파일 복원은 기존대로 즉시 유지.
// 🚨 @PATCH : 2026-11-03 — [표 열 드래그] 서식 CSS의 auto 레이아웃보다 직접 편집 표의 fixed 레이아웃을 우선 적용
// 🚨 @PATCH : 2026-11-02 — [표 열 너비 자동 조정] 미리보기 표의 균등 분할을 해제하고 내용 기반 너비 배분 적용
// 🚨 @PATCH : **2026-11-02** — [비로그인 무단 에디터 진입 원천 차단] 웹 환경에서 로그인 세션이나 '체험하기' 플래그가 없는 경우 자동 게스트 모드 전환을 중단하고 로그인 화면(/login)으로 즉시 리다이렉트
// 🚨 @PATCH : **2026-11-02** — [DB 접근 서버 API 일원화] 브라우저 직접 supabase.from(subscriptions, users)를 서버 API(/api/subscription/get, /api/user/check)로 전환하여 보안 강화 및 일관된 원트랜잭션 규칙 보장
// 🚨 @PATCH : **2026-11-01** — [표 셀 줄바꿈 파괴 및 가로 늘어짐·텍스트 잘림 결함 완전 해결]:
//             1) .custom-preview-container table 및 .onrivi-content-root table에 width: 100%, max-width: 100%, table-layout: fixed !important를 기본 부여하여 긴 파일 경로/영문 텍스트 포함 시 표가 찢어지거나 특정 열이 1글자 세로로 찌그러지는 현상 방지
//             2) th, td의 word-break: keep-all 단독 적용으로 인한 비CJK 텍스트 줄바꿈 차단을 해소하고 overflow-wrap: anywhere, word-break: break-word를 적용하여 컬럼 너비 내 안전한 텍스트 래핑 보장
//             3) 표 내부 인라인 코드(table :is(th, td) code)에 white-space: pre-wrap, overflow-wrap: anywhere, word-break: break-all을 동적 인젝션하여 긴 경로/함수명이 표를 밀어내지 않고 자연스럽게 줄바꿈되도록 개선
// 🚨 @PATCH : **2026-10-31** — [플로팅 툴바 onMouseDown/onClick 이중 실행 제거 및 단일 발화 보장]:
//             1) 플로팅 툴바 모든 버튼에서 onMouseDown의 중복 액션 호출을 제거하고 e.preventDefault()만 수행하도록 개선
//             2) 실제 액션은 onClick에서만 1회 단독 실행되도록 단일화하여 서식이 취소되었다가 즉시 재적용되는 핑퐁 버그 원천 해결
// 🚨 @PATCH : **2026-10-31** — [서식 버튼 동일 클릭 시 취소(토글 해제) 지원]:
//             1) 제목(H1~H6), 인용구(QUOTE/ALERT), 글머리 기호(LIST), 번호 목록(ORDERED_LIST), 체크리스트(CHECK) 등 동일 기능 버튼을 재클릭 시 이미 설정된 서식을 즉시 취소·해제하여 일반 문단으로 복귀
// 🚨 @PATCH : **2026-10-31** — [플로팅 서식 툴바 유지, ESC/에디터 클릭 시 닫힘 및 제목·인용문 화살표 클릭/엔터 즉시 반영]:
//             1) executeFloatingItem에서 서식 항목 적용 시 플로팅 툴바가 닫히지 않고 연속 서식 작업이 가능하도록 유지
//             2) ESC 키 입력 또는 마우스로 에디터/외부 클릭 시에만 플로팅 툴바 및 인용구 드롭다운이 닫히도록 전역 mousedown 캡처 리스너 연동
//             3) 제목 화살표(▲, ▼) 클릭 또는 엔터 시 레벨 변경과 동시에 에디터에 제목(H1~H6)이 즉각 반영되도록 개선
//             4) 인용문 화살표(▼) 클릭 또는 엔터 시 인용구(QUOTE) 즉시 반영 및 드롭다운 첫 번째 항목 자동 포커스 연동
// 🚨 @PATCH : **2026-10-27** — [문서보기 텍스트 선택 네이티브 ::selection 스타일, 빈 문단 서식 일원화 및 제목 감소폭/좌측 색깔바 동기화]:
//             1) dynamicCssString에 .visual-document-surface ::selection 코발트 블루(#2563eb / 다크 #3b82f6) 고대비 서식을 주입하여 DOM 변조 없이 매끄러운 다중 행/문단 선택 보장
//             2) dynamicCssString의 빈 문단(.visual-document-surface > p:empty 등) 스타일을 서식 프로필의 기본 문단 여백 및 행간과 일원화하여, 엔터 입력 후 텍스트 타이핑 시 문단 크기가 변하거나 위로 튀지 않고 캐럿 위치에서 1:1로 자연스럽게 작성되도록 연동
//             3) H2~H6 단계별 크기 감소폭(headingSizeOffset)의 pt/px 상호 단위 변환 정합화(초기 '0px' 시 3pt/4px, 사용자 '0pt' 시 0pt 반영) 및 제목 태그(h1~h6) border-left 미지정 시 'none' 명시 출력
// 🚨 @PATCH : **2026-10-26** — [확장 리스트(Loose List) 내부 p 및 .onrivi-line 인라인 일원화]:
//             1) .custom-preview-container li p 및 .onrivi-line에 display: inline !important 및 width: auto를 지정하여 Loose List(빈 줄 포함 목록)에서도 Tight List(쇼케이스)와 100% 동일하게 불릿/숫자 마커와 글자 간격이 밀착되도록 결함 해결
// 🚨 @PATCH : **2026-10-26** — [목록 기호 마커-텍스트 간격(padding-inline-start) 동적 CSS 주입 및 인용구 목록 패딩 정규화]:
//             1) dynamicCssString에 --li-marker-gap CSS 변수를 주입하고 .custom-preview-container li, .onrivi-content-root li에 padding-inline-start/padding-left: ${liMarkerGap} !important를 적용하여 간격 슬라이더(0px~32px) 조절이 1:1 실시간 반영되도록 개선
//             2) 인용구 내부 목록(blockquote ul/ol)의 padding-left를 var(--list-indent, 1.4em)으로 연동하여 비정상적으로 넓던 인용구 목록 간격 완전 정돈
// 🚨 @PATCH : **2026-10-26** — [동영상·지도 설명(캡션) 이미지 규격 동기화(중앙 정렬 및 0.88em 글자 크기)]:
//             1) .onrivi-video-figure figcaption 및 .onrivi-map-figure figcaption에 text-align: center, font-size: 0.88em, font-weight: 500 주입
//             2) 동영상/지도 래퍼 인접 캡션 문단에도 중앙 정렬 및 0.88em 글자 크기를 동기화하여 이미지 캡션과 100% 동일한 조판 완성
// 🚨 @PATCH : **2026-10-26** — [인용구 활자크기 및 인라인코드 여백 동적 CSS 구체성 강화 및 100% 실시간 연동]:
//             1) baseSizeSelectors.blockquote에 blockquote, blockquote p, blockquote span, blockquote li를 지정하고 baseSizeRoots를 .prose 및 다크모드까지 전면 확장하여 본문 p 태그의 !important 규칙을 제치고 인용구 활자 크기가 즉시 반영되도록 해결
//             2) 인라인 코드(code) 선택자를 :not(pre) > code뿐만 아니라 code:not(pre code):not(.codeblock-area code)로 다각화하고 padding, padding-left, padding-right를 !important로 동시 주입하여 좌우 여백 슬라이더 조절 즉각 동기화 보장
// 🚨 @PATCH : **2026-10-26** — [서식 글자 크기 pt 단위 표준화 및 H1~H6 감쇄 단위 동기화]:
//             1) H1 기준 활자 크기가 pt 단위일 때 H2~H6 자동 계산 크기도 pt 단위로 일치시켜 동적 CSS에 주입
//             2) .custom-preview-container 및 .onrivi-content-root 양측 모두에 H2~H6 font-size 동기화 보장
// 🚨 @PATCH : **2026-10-26** — [플로팅 서식 툴바 탭오더(Tab/Arrow) 키보드 탐색 및 Enter 적용 후 자동 닫힘(사라짐) 연동]:
//             1) 플로팅 툴바 활성화 시 에디터에서 Tab 입력 시 툴바 첫 번째 버튼으로 포커스 진입 지원 및 툴바 내부 Tab/Shift+Tab, Arrow 방향키 순환 탐색 연동
//             2) 모든 버튼에 tabIndex={0}, 고대비 포커스 링(focus:ring-2 focus:ring-blue-500) 및 onClick/Enter/Space 이벤트 연동
//             3) 서식 및 블록 태그 버튼 선택/클릭/Enter 적용 즉시 플로팅 툴바가 자동으로 닫히고 에디터 본문으로 커서 포커스 복귀
// 🚨 @PATCH : **2026-10-25** — [문서 연결(DocLinkPicker) scratch 임시 폴더 스캔 차단 및 도움말 중복 표시 제거]:
//             1) fetchAllMdFiles 및 DocLinkPicker 제외 목록에 scratch 폴더를 추가하여 임시·테스트 파일 유출을 방지
//             2) 일반 문서 작성 시 모든 도움말 경로(docs/help, public/help)를 완벽 차단하고, 도움말 문서 편집 시 정적 웹 미러(public/help)를 배제하여 단일 정식 문서(docs/help)만 표시되도록 정돈
// 🚨 @PATCH : **2026-10-25** — [서식·태그 지우기 단축키 Ctrl+\\ 전역 연동 및 한글 키보드(₩) 정규화]:
//             1) handleGlobalKeyDown에서 Backslash 및 한글 키보드 원화 기호(₩)를 '\\'로 정규화하여 Ctrl+\\ 입력 시 서식·태그 지우기(REMOVE_PREFIX)가 정상 격발되도록 보장
// 🚨 @PATCH : **2026-10-25** — [플로팅 서식 툴바 인라인 서식(B, I, U, S 등) 클릭 시 툴바 자동 닫힘 방지 및 멀티 서식 동시 적용 지원]:
//             1) 플로팅 툴바의 인라인 서식 버튼(BOLD, ITALIC, INLINE_CODE, UNDERLINE, STRIKETHROUGH) 클릭 시 setFloatingToolbar 닫힘 처리를 제거하여 여러 서식을 연속해서 활성화 가능하도록 개선
//             2) 굵게+밑줄 등 멀티 서식 선언 시 첫 번째 서식이 초기화되거나 툴바가 닫혀버리는 현상 해결
// 🚨 @PATCH : **2026-10-25** — [코드블록 생성 시 하단 빈 행(문단) 자동 보장 및 밖에서 곧바로 타이핑 지원]:
//             1) .visual-document-surface .visual-code-block에 margin-bottom: 20px !important를 부여하여 코드블록 바로 아래 빈 문단이 가려지지 않고 선명히 드러나도록 시인성 확보
//             2) 빈 문단(p:empty)에 cursor: text 및 min-height: 1.5em을 보장하여 코드블록 밖 마우스 클릭 및 즉각 타이핑 편의 극대화
// 🚨 @PATCH : **2026-10-25** — [이미지와 캡션 간격 초밀착(4px) 정돈 및 인접 마진 중복 상쇄]:
//             1) .onrivi-image-figure[data-caption-position="top"] 내 img 상단 마진을 0으로 강제 초기화하고 figcaption 하단 마진을 4px로 단정히 축소하여 이미지와 캡션이 시원하게 밀착되도록 개선
//             2) .onrivi-image-figure[data-caption-position="bottom"] 내 img 하단 마진 및 figcaption 상단 마진도 4px로 일체화
// 🚨 @PATCH : **2026-10-25** — [문서보기 빈 문단(p:empty) 상하 마진 강제 덮어쓰기 제거 및 서식 프로필 일원화]:
//             1) .visual-document-surface > p:empty 및 :has(> br:only-child)의 margin-top/bottom: 0.25em !important 강제 규칙을 제거하고 min-height: 1em으로 일원화
//             2) 빈 문단 상태와 글자 입력 상태의 상하 여백(margin-bottom) 및 행간(line-height)이 활성 서식 프로필과 100% 동일하게 유지되도록 보장하여 타이핑 시 수직 들뜸 방지
// 🚨 @PATCH : **2026-10-24** — [문서보기 서식 본문 클립보드 복사 엔진 전면 쇄신]:
//             1) .visual-document-surface(위지윅 문서보기) 및 .markdown-viewer-root(마크다운 뷰어) 우선 타겟 지정으로 툴바/버튼 오염 원천 차단
//             2) .onrivi-media-control, .visual-media-controls, button, no-print 등 복사 제외 요소 정밀 소거
//             3) blob/로컬 이미지를 인라인 base64 PNG로 치환하여 외부 앱(Word, 블로그 등) 붙여넣기 시 엑박 방지
//             4) 현대 웹 표준 ClipboardItem(text/html + text/plain 동시 기록)을 1순위 적용하여 외부 앱 서식 붙여넣기 완벽 보장
//             5) execCommand 및 Electron IPC/writeText를 2~3순위 Fallback으로 연동하고 성공/실패 토스트 분리
// 🚨 @PATCH : **2026-10-24** — [도움말 문서 링크(DocLinkPicker) ./상대경로 생성 및 fetchAllMdFiles 도움말 허용]:
//             1) fetchAllMdFiles에서 현재 문서가 도움말 문서(docs/help/ 또는 help/)일 때 docs/help 파일 제외를 해제하여 형제 문서 목록 온전히 수집
//             2) buildDocLinkTarget에서 현재 문서와 대상 문서가 모두 도움말인 경우 깔끔한 상대경로(./00_시작하기.md)를 생성하여 상위 이탈(../../) 결함 방어
// 🚨 @PATCH : **2026-10-24** — [이미지 수정 시 captionPos(top|bottom) URL 쿼리 연동 및 스타일 주입]:
//             1) editDocumentMedia 및 onImageDialog에서 이미지 URL 쿼리의 caption 파라미터를 읽어 editingImageInfo.captionPos에 바인딩
//             2) 동적 CSS 규칙에 [data-caption-position="top|bottom"]에 대한 order 및 margin 스타일을 추가하여 어떤 서식 프로필에서도 캡션 위치 100% 보장
// 🚨 @PATCH : **2026-10-24** — [문서보기(VisualDocumentEditor) renderImage에 activeProfile 주입]: 위지윅 문서보기 내 이미지도 서식 프로필의 캡션 위치(상단/하단)를 1:1로 정확히 동기화하도록 picturebookProfile={activeProfile} 연동
// 🚨 @PATCH : **2026-10-24** — [문서보기 이미지 캡션(fullMarkdown) 양방향 전달 연동]: visualImageInsertRef 및 replaceVisualImage에 fullMarkdown 파라미터를 연결하여 캡션 포함 이미지 정상 렌더링
// 🚨 @PATCH : **2026-10-23** — [문서 연결 표시명·목록·열기 보완]: 빈 링크명은 대상 파일명으로 표시하고 같은 이름의 다른 경로 문서를 모두 유지하며 문서보기 클릭도 작업장 경로 검증 후 연다
// 🚨 @PATCH : **2026-10-22** — [문서연결 [링크명](문서경로) 구조 정비]:
//             1) buildDocLinkTarget 신설로 상대경로(#헤딩) 계산을 단일화하고 목록·미리보기·삽입에서 공통 사용
//             2) 링크명 미입력 시 문서명 대신 최종 문서경로(상대경로#헤딩)를 링크명으로 사용, 파일 클릭 시 문서명 자동 채움 제거
//             3) 문서 목록 각 항목에 [링크명](<문서경로>) 결과 미리보기와 즉시 [연결] 버튼 제공, 헤딩 단계에도 결과 미리보기 표시
// 🚨 @PATCH : **2026-10-22** — [문서링크(DocLinkPicker) 앞 링크명 수정 지원 및 ESC 닫기 연동]:
//             1) useModalEscape 및 ESC 키 핸들러 연동으로 문서링크 픽커 창이 ESC 타이핑 시 즉각 닫히도록 개선
//             2) 문서링크 픽커 상단에 [링크명(앞의 표시할 텍스트)] 입력 필드를 추가하여 기본 문서명 대신 원하는 링크명을 직접 수정·지정할 수 있도록 지원
//             3) 선택된 텍스트 자동 반영 및 헤딩/문서 연결 시 사용자 수정 링크명 최우선 적용 
// 🚨 @PATCH : **2026-10-21** — [문서보기(VisualDocumentEditor) 서명/발신인(SIGNATURE) 네이티브 지원 및 차단 해제]:
//             1) dispatchCommand의 문서보기 미지원 차단 목록에서 'SIGNATURE' 제거
//             2) case 'SIGNATURE': 에서 VisualDocumentEditor 활성 시 visualCommandRef.current('SIGNATURE')를 우선 실행하여 위지윅 문서보기에서도 단축키(Ctrl+Alt+R) 및 플로팅 툴바 버튼으로 서명/발신인 서식이 즉시 적용되도록 연동
//             3) 플로팅 툴바 서명/발신인 툴팁을 '서명/발신인 (왼쪽 정렬) (Ctrl+Alt+R)'으로 동기화
// 🚨 @PATCH : **2026-10-21** — [문서 미열림 시 AI_DRAFT 명령 호출 차단 안내 토스트 탑재]:
//             1) case 'AI_DRAFT': 실행 시 !activeTabId 상태이면 '문서를 먼저 열어주세요.' 경고 토스트를 표시하고 판넬 오픈 방어
// 🚨 @PATCH : **2026-10-21** — [공통 리소스 폴더 변경/해제 시 해당 폴더의 AI 환경정보(키/모델) 실시간 즉각 연동]:
//             1) 리소스 폴더 변경 시 loadResourceAICredentials를 즉시 호출하여 새 폴더의 AI 인증정보를 읽고 setGeminiApiKey, setAiModelName 및 onrivi:ai-connections 이벤트 즉시 전파
//             2) 리소스 폴더 해제 시 AI 키 및 연결 상태를 깨끗하게 리셋하여 타 폴더와의 오염 원천 차단
// 🚨 @PATCH : **2026-10-21** — [setGeminiApiKey TDZ(ReferenceError) 초기화 순서 에러 완전 해소]:
//             loadResourceAICredentials useEffect를 useEditorSettingsResult 구조 분해 선언부 이후로 안전하게 재배치하여 런타임 크래시 박멸
// 🚨 @PATCH : **2026-10-21** — [AI API 키 리소스 폴더(settings/ai_credentials.enc) 암호화 로드 및 로컬스토리지 소거]:
//             1) resourceFolder/resourceFolderHandle 준비 완료 시 loadResourceAICredentials를 호출하여 기기/드라이브별 암호화 키를 메모리에 안전 복원
//             2) purgeLocalStorageAICredentials를 실행하여 로컬 스토리지에 잔존하는 API 키를 완전 소거
// 🚨 @PATCH : **2026-10-21** — [동일 타입 분리 리스트(ul+ul) 및 빈 문단 과도 여백 정상화]:
//             1) .visual-document-surface 내 동일 타입 리스트 연속 배치 시 1.5em 과도한 여백 대신 표준 리스트 여백(4px) 적용
//             2) 빈 문단(p:empty)의 상하 여백을 0.25em으로 최적화하여 방향키 및 시각적 유령 빈 줄 체감 왜곡 완전 해소
// 🚨 @PATCH : **2026-10-21** — [문서보기 커서 및 스크롤 마크다운(Monaco) 1:1 실시간 동기화 개선]:
//             1) onSourceScroll에서 뷰포트 내 침묵 리턴 가드를 해제하고 editor.setScrollTop을 통해 문서보기 스크롤 시 마크다운 에디터 스크롤이 부드럽고 즉각 추종하도록 개선
//             2) onSourceCursor에서 reveal: true 시 editor.revealPositionInCenter(position)를 호출하여 문서보기에서 클릭 또는 방향키 이동 시 마크다운 에디터의 해당 라인이 화면 중앙에 즉시 표시되도록 보장
// 🚨 @PATCH : **2026-10-20** — [AI 사이드바 판넬 에디터 오른쪽 툴바 안쪽 안착을 위한 isToolbarOpen 연동]:
//             1) InlineAIAssistant에 isToolbarOpen prop 전달하여 오른쪽 세로 툴바의 안쪽(좌측)에 AI 판넬이 배치되도록 연동
// 🚨 @PATCH : **2026-10-20** — [문서 서식 일괄 정리(CLEAN_DOC) 에디터/문서보기 포커스 기반 정밀 분기 및 양방향 동기화 강화]:
//             1) 나란히 보기(both) 및 편집 모드에서 Monaco 모델 직접 정리(handlers.cleanDoc)를 우선 지원하고 React 및 위지윅 화면까지 양방향 즉각 동기화
//             2) 문서보기(preview) 단독 모드 또는 위지윅 포커스 시 visualCommandRef.current('CLEAN_DOC')로 스마트 분기
// 🚨 @PATCH : **2026-10-20** — [미리보기 플로팅 컨트롤 툴바(PreviewToolbar) 마크다운 원본 복사(onCopyMarkdown) 연동]:
//             1) PreviewToolbar에 onCopyMarkdown={handlers.copyAll} 전달하여 마크다운(MD) 원본 텍스트 원클릭 클립보드 복사 지원
//             2) 서식(HTML) 복사와 마크다운 원본 복사를 분리하여 사용자가 원하는 포맷으로 즉시 클립보드 복사하도록 사용성 개선
// 🚨 @PATCH : **2026-10-20** — [문서 서식 일괄 정리(CLEAN_DOC) 기능 문서보기(VisualDocumentEditor) 양방향 연동]:
//             1) dispatchCommand의 문서보기 미지원 차단 목록에서 'CLEAN_DOC' 제거
//             2) case 'CLEAN_DOC': 에서 VisualDocumentEditor 활성 시 visualCommandRef.current('CLEAN_DOC')를 우선 실행하여 위지윅 문서보기에서도 단축키(Ctrl+Shift+L) 및 서식 툴바 마법봉 버튼으로 일괄 서식 정리가 즉시 수행되도록 연결
// 🚨 @PATCH : **2026-10-20** — [위지윅 문서보기(VisualDocumentEditor) 및 단일 미리보기 모드 커서 좌표(Ln/Col) 실시간 동기화 복원]:
//             1) onSourceCursor에서 previewMode === 'both' 조기 반환 가드를 해제하고 offset 기반 행/열 정밀 계산(content 및 Monaco 모델 연동)을 통해 setCursorLine, setCursorColumn 및 onrivi:cursor-position 이벤트 디스패치 보장
//             2) 문서보기 모드에서 클릭, 방향키 이동, 타이핑 시 하단 상태바의 Ln/Col이 동결되지 않고 실시간 즉각 갱신되도록 완벽 연동
//             3) InlineAIAssistant에 resourceFolder 전달하여 로컬 리소스 폴더의 프롬프트 템플릿(D:\Onrivi_Asset\prompt) 1:1 연동 보장
// 🚨 @PATCH : **2026-10-19** — [OS 네이티브 이모지 피커 연동 — 2026-10-22 자체 패널 폴백 제거]:
//             1) TOGGLE_EMOJI_PANEL 실행 시 VisualDocumentEditor(viewRef.focus) 및 Monaco 에디터 활성 포커스를 정확히 타겟팅하여 OS 이모지 피커가 커서 위치에 즉시 도킹되도록 보강
//             2) Electron 데스크톱에서는 app.showEmojiPanel()을 직결 호출하고, 웹 브라우저 및 미지원 환경에서는 OS 단축키를 안내하며 자체 패널은 열지 않음
// 🚨 @PATCH : **2026-10-19** — [onrivi:open-print 리스너 TDZ(ReferenceError) 결함 즉시 해결]:
//             dispatchCommand 선언부 이후로 onrivi:open-print useEffect의 배치 위치를 조정하여 런타임 초기화 순서 에러 완전 해소
// 상태바 인쇄/쪽 윤곽 모달 호출(onrivi:open-print) 연동
//             1) onrivi:open-print 이벤트 수신 시 dispatchCommand('OPEN_EXPORT')를 직결 실행하여 ExportModal 팝업
// 🚨 @PATCH : **2026-10-19** — [세션 복원 시 플레이스홀더 경고(작업장 외부 문서 안내) draft 주입 차단 및 orange dot(isModified) 버그 해결]: 시스템 안내문은 사용자 수정본(draft)으로 복원하지 않고 무시하여 정상 파일 바인딩을 보장
// 🚨 @PATCH : **2026-10-19** — [5초 자동저장 무한 루프 척결 및 나란히 보기(both) 마크다운 진동·흔들림 해결]:
//             1) autoSave 실행 중 불필요한 Frontmatter 강제 주입(updateCssProfileInFrontmatter) 및 setContent/model.pushEditOperations 전면 배제 (백그라운드 물리 디스크 저장 전담)
//             2) 저장 시작 직후 lastSavedContentRef 즉시 갱신 및 setTabs 불필요한 배열 재생성 가드로 무한 루프 및 텍스트 덮어쓰기 원천 차단
//             3) autoSave useEffect 내 setCurrentFileNode 직접 호출을 배제하여 React 렌더링 무한 루프 종식
//             4) VisualDocumentEditor onSourceScroll에서 Monaco 뷰포트 범위 내 라인은 강제 0점 스크롤(setScrollTop)하지 않고 뷰포트 이탈 시에만 revealLineInCenterIfOutsideViewport로 부드럽게 추종하여 나란히 모드 마크다운 진동·요동 완전 해소
// 🚨 @PATCH : **2026-10-18** — [인용구(blockquote) 보기 상자 내부 문단 여백 콤팩트 동기화]:
//             1) dynamicCssString 내 blockquote 하위 문단(p: 4px) 및 목록(ul/ol: 4px, li: 2px) 여백을 최적화하여 화면 미리보기와 PDF 사출물 간의 정합성 완성
// 🚨 @PATCH : **2026-10-18** — [이미지 드래그 앤 드롭/붙여넣기 시 기존 파일 덮어쓰기 결함 완전 해결 및 안전 안내 통일]:
//             1) 브라우저 기본 이미지명(images.jpg 등) 해시 치환 및 데스크톱 safe collision 방어와 연계하여 handlePasteImageFile의 덮어쓰기 안내를 안전 저장 토스트로 갱신
// 🚨 @PATCH : **2026-10-17** — [세션 복원 조건 완화 및 5초 자동저장(autoSave) FileNode 결함 완전 해결]:
//             1) 앱 구동 시 초기 웰컴 탭 등으로 인해 tabs.length > 0이더라도 물리 경로(path)가 있는 실제 탭이 없으면 이전 세션(getLastSession)을 100% 자동 복원하도록 조건 완화
//             2) autoSave에서 currentFileNode가 비어있더라도 activeTab에 유효한 path/node가 있으면 effectiveFileNode를 즉시 복구·동기화하여 자동저장 불발 결함 해결
// 🚨 @PATCH : **2026-10-17** — [문서보기(VisualDocumentEditor) 엔터 입력 시 빈 행 비정상 확장 및 타이핑 시 축소(레이아웃 시프트 & 커서 점프) 결함 완전 해결]:
//             1) dynamicCssString의 sentence-gap p br 규칙에 :not(.ProseMirror-trailingBreak) 예외 가드를 적용하여, ProseMirror의 빈 문단 전용 개행 요소(<br.ProseMirror-trailingBreak>)가 display: block 및 margin-top: 4px 강제 적용으로 왜곡되어 빈 행이 49px로 비대해지거나 타이핑 시 위로 15px 튀어 오르는 버그 원천 해결
// 🚨 @PATCH : **2026-10-17** — [새 문서 생성 시 보기모드 정합화 및 5초 자동저장 한글 조합 파괴·무한루프 방지]:
//             1) handleCreateNewDocument에서 setPreviewModeRaw('both') 대신 setPreviewMode(targetMode)를 호출하여 보기모드/에디터마운트 플래그/전역모드Ref를 1:1 일치시키고 키보드 입력 차단 방어
//             2) autoSave 시 기본 서식(system-1) 메타 주입 방어 및 nextVal 변경 시 React 상태(setContent)와 동기화하여 5초 주기 자동 저장 무한 루프 완벽 제거
//             3) visualSourceActionRef에서 previewMode !== 'both' 하드코딩 제약을 제거하여 문서보기(preview) 모드에서도 툴바/슬래시 서식 도구가 100% 정상 작동하도록 개선
// 🚨 @PATCH : **2026-10-17** — [문서보기(preview) 모드 참조문헌 관리(ADD_REFERENCE) 및 인용(CITE/CITATION) 실행 완벽 연동]:
//             1) dispatchCommand 최상단에서 ADD_REFERENCE를 즉시 처리(setIsReferenceModalOpen(true))하여 문서보기 상태에서 우측 툴바 참조문헌 버튼, 단축키(Ctrl+Shift+V), 슬래시 명령어(/vibe, /참조관리) 실행 시 참조 파일 관리 모달이 즉시 열리도록 개선
//             2) VisualDocumentEditor에 onReferenceSettings 콜백을 전달하고 EditorCommandType 및 전역 단축키 핸들러에 참조문헌/인용 실행 경로를 보강하여 문서보기에서도 참조문헌 관리와 인용 삽입이 100% 동작하도록 연동
// 🚨 @PATCH : **2026-10-17** — [인용문·코드블록·이미지·동영상·지도·표·수식 생성 시 하단 빈 행 자동 추가]:
//             1) applyLinePrefix에서 인용문(quote) 및 콜아웃(Alert) 생성 시 하단에 빈 줄(\n\n)을 함께 추가하여 마우스 클릭으로 다음 작업을 즉시 이어갈 수 있도록 개선 (커서는 인용문 내부 유지)
// 🚨 @PATCH : **2026-10-17** — [코드블록 언어 미지정/한글·임의 언어명 입력 시 코드블록 이하 일반 텍스트 색상 오염(보라색 변색) 결함 해결]:
//             1) beforeMount 및 editorSettingsSync에서 applySafeMarkdownMonarchTokenizer(monaco)를 연동하여 한글·유니코드·특수기호 언어명(예: ```아자아자) 및 무명 코드블록(```)의 여는/닫는 펜스를 완벽히 인식하고 코드블록 이하 본문으로 @codeblock 상태가 유출되는 현상 원천 차단
// 🚨 @PATCH : **2026-10-17** — [서식관리 목록 항목 간 줄 여백(margin-bottom) 및 기본 들여쓰기 너비(padding-left) 실시간 동기화 완벽 정상화]:
//             1) dynamicCssString 끝단에서 .custom-preview-container li에 하드코딩되어 있던 margin-bottom을 prof.rules.li['margin-bottom'] 값(liMarginBottom)으로 동적 대체하여 목록 및 태스크 체크박스 항목 간 줄 여백 슬라이더 조절이 1:1 실시간 반영되도록 개선
//             2) .custom-preview-container ul/ol에 padding-left: ${listIndent} !important 및 --list-indent/--li-margin-bottom 변수를 주입하고 중첩 태스크 리스트 들여쓰기를 완벽 연동
// 🚨 @PATCH : **2026-10-16** — [그림책 본문편집/편집완료 전환 및 내용 변경 시 스크롤 점프/화면 흔들림 방어]:
//             1) onPicturebookChange에서 updateContent(next, false, true)로 증분(incrementalVisual) 업데이트를 호출하여 Monaco 커서 리셋 및 setValue에 의한 화면 요동 차단
//             2) 그림책 모드(.picturebook-root) 활성 시 processedContent 변경에 의한 모나코 커서 라인으로의 미리보기 강제 스크롤 동기화 간섭을 배제하여 편집 완료 시 맨 위로 튀는 현상 원천 제거
// 🚨 @PATCH : **2026-10-16** — [그림책 열기 시 화면 흔들림 제거 및 전역 검색(GLOBAL_SEARCH / Ctrl+Shift+F) 포커스 연동 보강]:
//             1) 그림책 문서를 열 때 useEffect 비동기 지연으로 인해 1프레임 동안 일반 세로(Portrait) 문서로 렌더링된 후 가로(Landscape) 그림책으로 튀던 현상을 방지하기 위해 resolveEffectiveDocumentProfile 동기 해석 도입
//             2) 분할 모드(both) 미리보기 onScroll에서 마우스 호버 및 에디터 스크롤 락(isPreviewHovered / isScrollingRef) 가드 누락으로 인한 양방향 스크롤 핑퐁 진동 차단
//             3) Ctrl+Shift+F 전역 단축키 바인딩 및 GLOBAL_SEARCH 실행 시 Monaco 에디터 포커스 강제 탈취를 방지하고 사이드바 검색 탭 즉시 전환 및 입력창 자동 포커스 연동
// 🚨 @PATCH : **2026-10-15** — [그림책/동화책(Story Book) 2종 시스템 서식 자동 인식 연동 및 ID 갱신]: Frontmatter의 css_profile에 'Story Book-전체표지'(profile-1792073192013 및 profile-1792072443551) 및 'Story Book - 오른쪽 그림 표지'(오타 'Stroy Book' 포함)가 지정되었을 때 해당 신규 시스템 서식으로 즉시 매칭되도록 보강
// 🚨 @PATCH : **2026-10-15** — [화면 흔들림 완전 해결 및 나란히 보기(분할 모드) 내보내기 전면 활성화]:
//             1) 뷰포트 overflow: hidden 및 100% 규격 강제 보장으로 동적 이벤트 발생 시 17px 윈도우 스크롤바 생성/소멸에 의한 전체 화면 좌우 요동 원천 차단
//             2) 나란히 보기(both) 및 모든 뷰 모드에서 내보내기(PRINT, DOCX, HWPX, HTML, EPUB, PNG)를 즉시 실행할 수 있도록 가드 완화 (편집 모드일 때만 미리보기로 자동 전환 후 사출)
//             3) 분할 화면 모드에서 마크다운 영역과 미리보기 영역에 flexBasis 50%를 고정하여 가로 50/50 분할 지오메트리 절대 불변 확립
// 🚨 @PATCH : **2026-10-15** — [미리보기 전용 툴바에 '바꾸기(Replace)' 버튼 추가 및 모드 토글 연동]:
//             1) PreviewToolbar에 onToggleReplace 및 isReplaceOpen 바인딩, 바꾸기(Replace) 아이콘 버튼 신설
//             2) 찾기(Find) 및 바꾸기(Replace) 간 원클릭 전환, 단축키(Ctrl+H) 및 툴바 클릭 시 바꾸기 패널 즉시 오픈
// 🚨 @PATCH : **2026-10-15** — [편집 에디터 확대/축소 기능 제거 및 문서보기 전용 줌 체계 단일화]:
//             1) 에디터 포커스 시 글자 크기(setFontSize)를 변경하던 키보드 단축키(Ctrl+=, Ctrl+-, Ctrl+0) 및 Monaco mouseWheelZoom 제거
//             2) ZOOM_IN / ZOOM_OUT 커맨드 발화 시 편집기 글자 크기가 아닌 '문서보기'(previewZoomScale) 화면 배율을 조절하도록 역할 재정립
// 🚨 @PATCH : **2026-10-15** — [웹드라이브 작업 중 타 웹드라이브 계정으로의 자유 저장 및 작업장 영구 불변성 확립]:
//             1) 웹드라이브(계정 A)를 작업장으로 열어둔 상태에서도 '다른 이름으로 저장'을 통해 계정 B(또는 새 계정)로 작업장 세션 중단 없이 완전 독립 저장 지원
//             2) 저장 완료 알림 토스트에 저장 대상 구글 계정 이메일([userEmail])을 표기하여 시인성 보장
//             3) 작업장(rootFolder, workspaceType) 절대 불변 보장 및 현재 작업장 내부 폴더에 저장했을 때만 부분 파일 목록 갱신(refreshFileList)
// 🚨 @PATCH : **2026-10-15** — [다른 이름으로 저장 시 파일명 자유 변경 및 작업장 불변 저장 엔진 고도화]:
//             1) '내PC(로컬)로 저장': OS 표준 파일 저장 대화상자(saveFileAs/showSaveFilePicker) 및 웹 다운로드 시 파일명 지정(prompt) 지원
//             2) '개인웹드라이브 저장': Google Drive 폴더 탐색 모달 내 파일명 실시간 변경 입력창(showFileNameInput/initialFileName) 연동 및 기존 .md 파일 클릭 선택 지원
//             3) 중복 파일명 감지 시 덮어쓰기 확인(confirm) 창을 제공하여 의도치 않은 중복/유실 방어
//             4) ⚠️ 핵심: 저장 후 기존 작업장(rootFolder, workspaceType, localStorage)이 변경되던 결함을 완벽 제거하여 작업장과 무관하게 독립 저장 완결
// 🚨 @PATCH : **2026-10-14** — [구글 이미지 검색/외부 웹 이미지 드래그 앤 드롭 새 창 팝업 원천 차단 및 CORS 우회 다운로드 연동]:
//             1) window 및 document capture 단계에서 dragenter, dragover, drop을 가로채 e.preventDefault() 및 dropEffect='copy'를 강제 적용하여 브라우저/Electron의 파일 URL 새 창 내비게이션 완전 차단
//             2) parseDroppedDataToBlob 및 fetchExternalImageFile(Electron net.fetch 연동)을 통해 구글 이미지 검색(encrypted-tbn0.gstatic.com 등) 및 웹 이미지 드롭 시 바이너리를 media 폴더에 파일로 자동 다운로드 저장
//             3) 다운로드 실패 시에도 웹 이미지 URL을 마크다운으로 직접 안전 삽입하여 드롭 실패 및 새 창 팝업 원천 방어
// 🚨 @PATCH : **2026-10-14** — [웹 SVG/Data URL 드래그 앤 드롭 새창 팝업 원천 차단 및 Base64 배제·바이너리 리소스 저장 연동]:
//             1) window 및 document capture 단계에서 dragenter, dragover, drop을 가로채 e.preventDefault() 및 dropEffect='copy'를 강제 적용하여 브라우저/Electron의 파일 URL 새 창 내비게이션 완전 차단
//             2) parseDroppedDataToBlob 정규화 엔진을 연결하여 웹 SVG, Base64 Data URL, HTML <img>/<svg>/<a> 태그 드롭 시 Base64 마크다운 오염 없이 활성 리소스 폴더(media/)에 바이너리 파일로 안전 저장 후 상대 경로 삽입
//             3) .custom-preview-container onDrop 진입 즉시 e.preventDefault() 및 e.stopPropagation() 발화 및 visualCommandRef(INSERT_SAVED_IMAGE) 연결 보장
// 🚨 @PATCH : **2026-10-14** — [문서보기(VisualDocumentEditor) 서식관리(TOGGLE_CSS_STYLE) 활성화 및 연동]:
//             1) dispatchCommand에서 'TOGGLE_CSS_STYLE'을 visualCommandRef 가로채기 전에 최우선 처리하여 문서보기에서도 툴바/단축키/메뉴를 통해 서식관리(CssStyleModal)가 즉시 활성화되도록 개선
//             2) VisualDocumentEditor에 onStyleSettings={() => setIsStyleModalOpen(true)}를 연결하여 슬래시 명령어(/style, /서식) 및 서식 관리 모달 양방향 연동
// 🚨 @PATCH : **2026-10-14** — [각주 정리(ORGANIZE_FOOTNOTES) 문서보기 지원 및 도구 메뉴 연동]:
//             1) dispatchCommand에서 'ORGANIZE_FOOTNOTES'를 visual editor 차단 목록에서 해제하고 VisualDocumentEditor 및 Monaco 양방향 지원
//             2) VisualDocumentEditor에 onToast={showToast}를 연결하여 각주 정리 결과(성공/미변경/각주없음) 피드백 제공
// 🚨 @PATCH : **2026-10-14** — [서식관리(CSS Profile) 각주(Footnote) 폰트 크기/색상/줄간격 실시간 연동 및 문서보기 기본 12.5px 최적화]:
//             1) dynamicCssString의 footnote 태그 처리기에 .visual-footnote-def, .visual-footnote-text, .visual-footnote-badge 셀렉터를 추가 확장
//             2) 각주 폰트 크기 미지정 시 inherit(16~18px)으로 팽창하던 결함을 해소하고 12.5px 콤팩트 크기로 기본값 설정
//             3) 서식관리에서 각주 글자 크기, 글자 색상, 굵기, 줄간격, 상하 여백 조절 시 문서보기에 실시간 즉각 반영
// 🚨 @PATCH : **2026-10-14** — [문서보기에서 태그 및 명령어 입력 시 나란히 보기(both) 강제 전환 결함 완전 해소]:
//             1) onSourceAction에서 setPreviewMode('both') 강제 호출을 제거하여 태그/각주/명령어 실행 시 사용자가 작업 중인 현재 보기 모드(문서 직접 편집)를 100% 온전히 유지
// 🚨 @PATCH : **2026-10-14** — [수식(visual_math) 네이티브 렌더링 및 모달 양방향 편집 지원]:
//             1) VisualDocumentEditor의 onFormulaDialog에서 initialLatex를 수신하여 formulaModalInitialLatex 상태로 FormulaModal에 연동
//             2) 수식 더블클릭 시 기존 LaTeX를 FormulaModal에서 즉시 수정하여 본문에 실시간 반영
// 🚨 @PATCH : **2026-10-13** — [수식(MATH/LATEX) 문서보기 연동 및 본문 실시간 렌더링 지원]:
//             1) VisualDocumentEditor에 onFormulaDialog 연동하여 수식 삽입 시 마크다운 보기로 튕기지 않고 문서보기 커서 위치에 즉시 수식 코드블록 삽입 및 실시간 렌더링 반영
//             2) dispatchCommand에서 MATH/LATEX 실행 시 문서보기가 활성화되어 있으면 visualCommandRef.current?.('MATH')를 최우선 실행
//             3) FormulaModal에서 삽입 완료 시 visualFormulaInsertRef를 통해 문서보기 커서 위치로 라우팅
// 🚨 @PATCH : **2026-10-13** — [전용 인터랙티브 달력 모달(CalendarModal) 연동 및 에디터/문서보기 커서 위치 날짜 삽입 지원]:
//             1) 플로팅 서식 툴바 및 상단 서식 툴바의 달력(Calendar.png) 클릭 시 인터랙티브 달력 모달(CalendarModal) 오픈 연동
//             2) 월별 달력 날짜 선택, 6대 표준 서식, 시간(시:분:초) 포함 옵션을 지원하고 에디터(Monaco) 및 문서보기(VisualDocumentEditor) 커서 위치에 즉시 삽입
// 🚨 @PATCH : **2026-10-13** — [문서보기(VisualDocumentEditor) 문서링크(DocLinkPicker) 커서 위치 호출 및 클릭 이동 연동]:
//             1) visualDocLinkPositionRef 및 visualDocLinkInsertRef를 도입하여 문서보기 내 커서 좌표에 DocLinkPicker를 정확히 배치하고 문서 선택 시 위지윅 커서 위치에 [문서명](<상대경로>) 삽입 연동
//             2) VisualDocumentEditor에 currentFilePath, onFileOpen(handleFileOpenByPath), onDocLinkDialog를 전달하여 문서링크 클릭 시 해당 탭/문서로 즉시 전환 이동 완비
// 🚨 @PATCH : **2026-10-13** — [에디터 시작 시 좌측 탐색기 상시 펼침, 상단 보기 전환 버튼 제거 및 나란히 보기 마크다운 영역 읽기 전용·라인번호 숨김·배경 경계 분리]:
//             1) 에디터 시작 시 좌측 탐색기(isSidebarOpen: true, sidebarTab: 'explorer')가 항상 펼쳐진 상태로 시작하도록 고정
//             2) 문서 영역 상단의 '미리보기·나란히 보기' 버튼 바를 제거하고 하단 상태바의 보기 전환 버튼으로 일원화
//             3) 나란히 보기(previewMode === 'both')에서 우측 마크다운 영역(#onrivi-markdown-pane)을 읽기 전용(편집 불가)으로 잠그고, 라인번호(lineNumbers: 'off')를 숨기며, 문서 보기 영역(#ffffff)과 뚜렷하게 구분되는 슬레이트 배경색(#eef2f6) 및 2px 경계선·인셋 쉐도우 적용
// 🚨 @PATCH : **2026-10-11** — [새 문서 생성 대화상자(NewDocumentModal) 연동 및 폴더/파일명 지정]:
//             상단 탭(+) 및 메뉴바(새 문서 Ctrl+N) 호출 시 단순 고정 탭 대신 폴더 선택과 파일명을 지정할 수 있는 NewDocumentModal을 띄우고, 실제 작업장 폴더에 파일을 생성하여 새 탭으로 오픈
// 🚨 @PATCH : **2026-10-11** — [새 문서(Ctrl+N) 커맨드 핸들러 연동]:
//             dispatchCommand('NEW_FILE') 호출 시 빈 캔버스의 새 탭('새 문서.md')을 즉시 생성하여 복사한 글이나 AI 답변을 원클릭으로 붙여넣고 집필할 수 있도록 처리
// 🚨 @PATCH : **2026-10-11** — [구글 드라이브 토큰 만료 전 자동 저장 & 만료/해제 시 비상 로컬 백업 안전망 연동]:
//             1) onrivi:drive_token_about_to_expire 및 onrivi:drive_token_expired / onrivi:drive_auth_expired 이벤트 전사 수신 연계
//             2) 구글 드라이브 토큰 라이프사이클 및 만료 전 자동 사전 플러시, 비상 로컬 스냅샷을 useFileExplorer와 함께 유기적 동기화
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 토큰 만료(401) 감지 시 안내 토스트 연동 및 서식 필터 정규화]:
//             1) onrivi:drive_token_expired 리스너 탑재로 토큰 만료 시 재인증 안내 토스트 자동 발송
//             2) 서식 필터 시 사용자 서식 이름 보존 및 다이렉트 렌더링 보장
// 🚨 @PATCH : **2026-10-07** — [환경설정 지정 리소스 폴더(참조파일 등) 폴더 변경 및 이미지 붙여넣기 5대 서브폴더 직결]:
//             1) selectResourceFolder 시 initializeDriveResourceFolder를 정상 연동하여 5대 하위 폴더 ID를 일괄 갱신
//             2) 이미지 붙여넣기 시 cloudSettings.mediaFolderId 우선 연동으로 환경설정 리소스 폴더에 안전 저장
// 🚨 @PATCH : **2026-10-07** — [로컬 vs 구글 드라이브 리소스 서식 완벽 격리 & 모드 전환 실시간 리로드]:
//             1) workspaceType을 profile load effect 의존성에 등록하고 targetEnv('cloud' vs 'local')를 명시 주입하여 로컬/구글 드라이브 간 서식 교차 노출 결함 원천 해결
//             2) profilesSave 시에도 targetEnv에 맞춰 로컬은 로컬 리소스 폴더에, 구글 드라이브는 구글 드라이브에만 저장되도록 환경 격리 일원화
// 🚨 @PATCH : **2026-10-07** — [최초 구글 드라이브 접속 시 작업장 및 참조폴더(5대 하위폴더/기본파일) 자동 생성 & 환경설정 직결]:
//             1) 구글 드라이브 연결 시 팝업 선택창 없이 OnriviAuthor/작업장 및 OnriviAuthor/참조폴더를 100% 자동 생성/바인딩
//             2) 참조폴더 내 5대 필수 폴더(bible, db, media, profiles, prompt) 및 기본 설정 파일들을 무인 자동 구성
//             3) 환경설정 공통 리소스 폴더를 '참조폴더'로 자동 지정하여 SettingsModal에 선명하게 직결 반영
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 무중단 토큰 자동 갱신(Auto-Refresh) & 최종 작업장(GDRIVE) 재접속 100% 자동 복원]:
//             1) initDriveTokenAutoRefresh 연동으로 앱 구동 시 백그라운드 토큰 자동 갱신 타이머 가동하여 1시간 만료 끊김 원천 방어
//             2) workspaceType 초기 상태를 localStorage(workspaceType/onrivi_last_workspace_mode)와 동기화하여 구글 드라이브 작업장에서 종료 시 다음 재접속/새로고침 시 자동으로 구글 드라이브 작업장 상태로 복원
// 🚨 @PATCH : **2026-10-07** — [AI 응답 및 웹 문서 마크다운 붙여넣기 시 표 외 텍스트 누락 결함 완벽 해결]:
//             1) 클립보드 HTML에 table이 포함되어 있을 때 기존 parseHtmlTableToMarkdown이 첫 번째 표만 추출하고 모든 본문/제목/목록/코드를 소실시키던 치명적 결함 원천 해결
//             2) 단일 표(isStandaloneTable: 엑셀/스프레드시트)와 복합 문서(isRichDocumentWithTable: AI 답변, 웹 문서)를 DOM 기반으로 지능형 분기
//             3) AI 마크다운 복사본(hasMarkdownTableInText)은 원본 마크다운을 100% 보존하고, 웹 화면 드래그 복사는 htmlToImportMarkdown 연동으로 표와 본문 전체를 표준 마크다운으로 완벽 변환하여 삽입
// 🚨 @PATCH : **2026-10-04** — [다른 폴더의 동일 파일명 삭제 시 현재 열린 탭 오종료 결함 해결]: handleCloseTabByPath에서 단순 파일명 일치(targetFileName === tabName) 및 접두사 없는 단일 파일명의 endsWith 검사를 제거하고, 고유 driveId / 정확한 경로(tabPath === normTarget) / 폴더 하위(tabPath.startsWith) / 양방향 디렉터리 경로 포함 시에만 엄격하게 매칭하여 다른 폴더 동명 파일 탭이 오종료되는 현상을 완벽 박멸
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 문서 저장 시 브라우저 파일 다이얼로그 오작동 차단 & useEditorHandlers 직결 연동]: useEditorHandlers에 tabsRef와 saveFile을 주입하고, 클라우드 작업장 문서 저장 시 브라우저 저장 다이얼로그 오작동을 차단하여 구글 드라이브 다이렉트 무음 저장 및 새 문서 저장 프롬프트 정상화
// 🚨 @PATCH : **2026-10-03** — [파일 삭제 시 열린 탭 자동 닫기(handleCloseTabByPath) driveId/name/접두사 매칭 전면 강화]: 탐색기에서 파일/폴더 삭제 시 driveId 일치, 경로 접두사 무시 매칭(endsWith), 파일명 일치를 모두 수용하여 열려있던 탭을 100% 자동 종료하고 모델 메모리 정리
// 🚨 @PATCH : **2026-10-03** — [loadUserProfiles 리소스 폴더 미설정 시 불필요한 에러 토스트 차단]: 초기 진입 시 리소스 폴더 미지정 상태에 대한 정상 상태 수용 및 에러 토스트 오발송 방어
// 🚨 @PATCH : **2026-10-03** — [클라우드 작업장 브레드크럼 ReferenceError(cloudProvider) 결함 완벽 해결]: cloudProvider 미정의 변수 참조 제거 및 rootFolder?.displayName / 'Google Drive' 연동으로 상단 경로 브레드크럼 무결성 확보
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 미디어 저장/연동 전면 동기화]: resourceFolder 변경 시(구글 드라이브 OnriviAuthor/참조파일 및 로컬/웹) 최신 리소스 폴더 하위 media로 이미지 자동 저장, 상대경로(media/...) 표준화 연동
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 클라우드 작업장 지원 & 리소스 폴더 실시간 동기화]: connectGoogleDrive/disconnectGoogleDrive 주입, 이미지 붙여넣기 시 구글 드라이브 /참조파일/media 자동 업로드, onrivi:resource_folder_changed 리스너 연동
// 🚨 @PATCH : **2026-10-03** — [세션 제어권 인수 시 타 세션 제한사용자 유지 및 미리보기 모드 자동 활성화]: '이 화면에서 편집 시작하기' 클릭 시 다른 세션을 강제 로그아웃시키지 않고 제한사용자(읽기 전용) 모드로 안전하게 전환하며, 화면을 자동으로 미리보기(preview) 모드로 전환하여 문서를 끊김 없이 열람할 수 있도록 개선
// 🚨 @PATCH : **2026-10-02** — [동일 이미지 반복 붙여넣기/드래그 앤 드롭 결함 완전 해결 & Ctrl+V 이벤트 단일 진입점 일원화]: handlePasteImageFile 내 과도한 해시 기반 차단 및 타임스탬프 락을 완전 제거하여 동일 이미지 반복 삽입 100% 정상 작동 보장, handleGlobalKeyDown의 비동기 Ctrl+V 인터셉터를 제거하여 DOM paste 단일 진입점으로 통합함으로써 2중 중복 실행 원천 방어
// 🚨 @PATCH : **2026-10-02** — [붙여넣기 및 드래그앤드롭 이미지 설명(Alt) 널(빈값) 표준화]: 끌어당기거나 붙여넣기한 이미지 마크다운 생성 시 이미지 설명 텍스트를 제거하여 ![](${path}) 표준 형태로 삽입되도록 변경
// 🚨 @PATCH : **2026-10-02** — [이미지 붙여넣기 2중 중복 삽입 결함 완벽 해결]: keydown(Ctrl+V)과 paste 이벤트의 동시 발화로 이미지가 2번 연달아 붙여넣어지던 문제를 handlePasteImageFile 내 800ms 타임스탬프 락 및 동일 해시 1.5초 디바운스 이중 가드로 100% 원천 차단하여 단 1회만 정확히 삽입되도록 보장
// 🚨 @PATCH : **2026-10-02** — [Ctrl+V 키다운 전역 가드 및 4중 계층 이미지 붙여넣기 완벽 보장]: handleGlobalKeyDown 내 Ctrl+V 직접 가로채기(Electron readClipboardImage 및 브라우저 navigator.clipboard.read 즉시 추출), kind:file 전수 조사, resolveClipboardImage 다형성(Blob/File/DataURL) 수용으로 모든 환경에서 이미지 복사·붙여넣기 100% 작동 보장
// 🚨 @PATCH : **2026-10-02** — [클립보드 이미지 붙여넣기 전면 강화 및 웹 이미지 URL / 마크다운 자동 연동]: 외부 웹페이지 복사 이미지(<img src="http...">), 이미지 URL 직접 복사(Ctrl+V), Electron 네이티브 3중 클립보드 추출 및 insertMediaAtCursor 즉시 동기화 연동으로 다른 곳에서 복사한 이미지의 에디터 붙여넣기 실패 결함 완벽 해결
// 🚨 @PATCH : **2026-10-02** — [이미지 붙여넣기 및 업로드 시 currentFilePath ReferenceError 결함 완벽 해결]: handlePasteImageFile 및 webUploadImage에서 미정의 변수(currentFilePath) 참조로 인한 크래시를 currentFileNode?.path, currentFileNodeRef 및 활성 탭 path 기반 지능형 폴백으로 완전 수정
// 🚨 @PATCH : **2026-10-02** — [이미지 복사·붙여넣기(Ctrl+V) 및 탐색기/웹 다중 이미지 드래그앤드롭 전면 강화]: 탐색기/데스크톱 이미지 파일 단일/다중 드래그앤드롭 자동 저장 및 커서 위치 삽입, 웹 브라우저 이미지 드래그앤드롭 마크다운 변환, 캡처(Win+Shift+S)/탐색기 파일 복사/웹 이미지 붙여넣기(Ctrl+V) 시 5단계 완전 감지 및 Monaco 기본 텍스트 덮어쓰기 원천 차단
// 🚨 @PATCH : **2026-10-02** — [이모지 패널 오버레이 플로팅 및 에디터·미리보기 화면 불변 고정]: 이모지 패널을 absolute 우측 플로팅 오버레이(툴바 좌측 밀착)로 전환하여 패널 열림/닫힘 시 에디터와 미리보기 레이아웃 너비가 1px도 축소되거나 움직이지 않도록 완전 고정
// 🚨 @PATCH : **2026-10-02** — [고대비 커서 시인성 강화 에디터 커서 두께/명도 최적화]: cursorWidth를 2px에서 4px(2배 확대)로 대폭 강화, 라이트 모드(코발트 #1d4ed8) 및 다크 모드(스카이블루 #38bdf8) 커서 고대비 명도 최적화로 커서 위치 한눈 식별 보장
// 🚨 @PATCH : **2026-10-02** — [이모지 패널 활성화 시 에디터 커서 위치 영구 유지 및 연속 삽입 보정]: 패널 오픈 시 현재 커서 위치(emojiSavedPositionRef) 즉각 백업, 패널 렌더링 후 커서 복원/고정, 전용 insertEmojiAtCursor 연동으로 이모지 삽입 후 커서 자동 전진 및 연속 삽입 위치 유지 완벽 보장
// 🚨 @PATCH : **2026-10-02** — [우측 툴바 이모지 보관함 패널 연동]: EmojiPanel 컴포넌트 도킹 렌더링, isEmojiPanelOpen 상태 및 TOGGLE_EMOJI_PANEL 커맨드 처리, 단축키(Ctrl+Shift+E) 및 Escape 닫기 연동, 커서 위치 즉시 삽입 지원
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 충돌 해결 및 듀얼 바인딩]: 다른 이름으로 저장(Ctrl+Shift+S) 단축키 오지정 수정, 설정 복원 시 신규 단축키 누락 방어, Monaco 및 전역 이벤트에서 서명 단축키 Ctrl+Alt+R 및 Ctrl+Alt+S 동시 지원 및 윈도우 Alt 키 포커스 보정
// 🚨 @PATCH : **2026-10-01** — [서명/발신인 단축키 변경]: 다른 이름으로 저장(Ctrl+Shift+S)과의 충돌 방지를 위해 서명/발신인(우측 정렬) 단축키를 Ctrl+Alt+R로 변경
// 🚨 @PATCH : **2026-10-01** — [플로팅 툴바 서명/발신인 추가]: EditorCommandType 및 dispatchCommand에 SIGNATURE 액션 연동, 플로팅 툴바에 서명/발신인(우측 정렬) 버튼 탑재 및 단축키(Ctrl+Alt+R) 연결
// 🚨 @PATCH : **2026-10-01** — [서식 설정 내 [align="right"] 및 [style*="text-align: right"] 등 정렬 규칙 전역 보장]: dynamicCssString에 우측/중앙 정렬 셀렉터를 명시하여 p { text-align: left !important; }가 사용자 지정 우측 정렬을 덮어쓰지 않도록 완전 보장
// 🚨 @PATCH : **2026-10-01** — [표 미리보기 외곽 테두리 및 행/열 구분선 동적 인젝션 정합화]: dynamicCssString 내 tableStructure 인젝션 시 최외곽 4면 셀 테두리 및 colBorderWidth 0px 소거 처리를 내보내기 규격과 100% 동기화
// 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 명령 제거]: EditorCommandType 및 executeCommand에서 EXPORT_HWPX 액션 완전 삭제
// 🚨 @PATCH : **2026-09-30** — [Word(.docx) 및 한글(.hwpx) 내보내기 명령 연동]: EditorCommandType 및 executeCommand에 EXPORT_DOCX, EXPORT_HWPX 액션 등록 및 핸들러 연결
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 토큰 스토리지 키 오타 수정 및 토큰 갱신 이벤트 연동]:
//             1) targetEnv 판정 시 onrivi_gdrive_auth_token 오타를 onrivi_gdrive_access_token 및 getSavedDriveToken()으로 바로잡아 클라우드 서식 로드 정상화
//             2) onrivi:drive_token_updated 리스너를 탑재하여 구글 로그인 즉시 사용자 정의 서식 2종('연습테스트', '소형책 출판 전문 서식') 실시간 로드 트리거
// 🚨 @PATCH : **2026-09-30** — [단축키 리스너 useEffect 의존성 최적화]: handleGlobalKeyDown 내부에서 사용되는 setFontSize를 의존성 배열에 명시하여 ESLint missing dependency 경고 완전 소거
// 🚨 @PATCH : **2026-09-30** — [문서 연결(DocLinkPicker) 폴더 수집 원복 & 탐색기 폴더 연결 커서 위치 즉시 기입 연동]: 웹/데스크톱 공통으로 문서 연결(DocLinkPicker) 및 [[ 자동완성에서는 폴더 노드를 제외하여 순수 마크다운 문서 연결로 원복하고, 탐색기 폴더 우클릭 '폴더 연결' 클릭 시 app:insert-folder-link 이벤트를 수신하여 현재 열린 문서의 에디터 커서 위치에 [폴더명](<./상대경로/>)을 원자적으로 즉시 삽입
// 🚨 @PATCH : **2026-09-30** — [미리보기 모드 시 문서 병합(MERGE) 및 각주 정리(ORGANIZE_FOOTNOTES) 실행 차단 방어]: previewMode가 'preview'일 때 명령 실행을 차단하고 경고 토스트 안내
// 🚨 @PATCH : **2026-09-30** — [에디터 vs 미리보기 단축키 및 제어 충돌 완벽 격리·스마트 라우팅]:
//             1. 찾기(Find): 에디터 포커스 시 에디터 찾기(Ctrl+F) 및 바꾸기(Ctrl+H), 전체 검색(Ctrl+Shift+F) 100% 보존. 미리보기 전용 찾기는 Ctrl+Alt+F 및 비포커스 시 Ctrl+F로 완벽 격리.
//             2. 확대·축소(Zoom): 에디터 포커스 시 에디터 폰트 크기(12~32px, 16px 리셋), 비포커스 시 미리보기 배율(50%~200%, 100% 리셋). Ctrl+Alt+=/-/0으로 미리보기 직접 제어 지원.
//             3. 휠 줌(Wheel): 에디터 mouseWheelZoom 활성화, 미리보기 위에서는 previewZoomScale 연동으로 호버 영역 기반 직관적 줌 분기.
// 🚨 @PATCH : **2026-09-27** — 사용자 서식 읽기·수정·가져오기·AI 생성 저장소를 profiles/userCssProfiles.json 하나로 통일. 개별 CSS 생성 및 다른 저장소 폴백 제거.
// 🚨 @PATCH : **2026-09-26** — [에디터 이중 중첩 코드블록 배경 데코레이션 끊김 결함 완벽 해결]: updateDecorations의 단순 startsWith('```') 토글을 getCodeBlockLineMask 정밀 마스크로 전환하여 이중 코드블록 내부(```python, def, print 등) 전체 라인에 monaco-codeblock-line 데코레이션이 100% 매끄럽게 연결되도록 개선
// 🚨 @PATCH : **2026-09-26** — [표 모든 테두리(Grid) 세로선 렌더링 누락 및 스타일·색상 상속 결함 해결]: tableStructure.colBorderWidth/rowBorderWidth/outerBorderWidth가 0보다 클 때 th/td의 border-left/right/top/bottom에 width뿐 아니라 border-style 및 border-color를 !important로 명시 주입하여 세로선(열 구분선)이 화면에 100% 렌더링되도록 개선
// 🚨 @PATCH : **2026-09-26** — [코드블록 내부 행간 줄간격 콤팩트 규격화(1.35배) 및 서식 연동]: codeBlock line-height(기본 1.35배) 동적 인젝션으로 본문 1.8배 줄간격 오염 차단 및 빈 행 1칸 높이 정밀 유지
// 🚨 @PATCH : **2026-09-26** — [Alert 인용구 태그와 본문 간격 최소화 서식 동기화]: .onrivi-alert-title(하단 마진 축소 및 --onrivi-alert-gap 연동)과 .onrivi-alert-content(첫 문단 margin-top 0 강제) dynamicCssString 인젝션
// 🚨 @PATCH : **2026-09-27** — [서식 컨트롤 우선순위 고정]: 설정창 규칙과 추가 CSS를 계층으로 분리해 동일 속성 충돌 시 설정창의 !important 선언이 우선하도록 보장
// 🚨 @PATCH : **2026-09-28** — 에디터의 블로그 발행 모달 연결과 단축키 제거
// 🚨 @PATCH : **2026-09-25** — [시스템 제공 서식 개편 동기화]: 구버전 서식('GitHub 기술 블로그/명세서', '공공기관 보고서 양식')을 삭제하고, 신규 시스템 제공 서식 5종('Onrivi 기술 표준 서식', 'Onrivi 법률·계약서 A4 공식 문서', 'Onrivi 네이버 블로그 감성 서식', 'Onrivi 일반 기술서적 표준 서식', 'Onrivi 공식 행사 및 가정통신문 안내장 서식')을 시스템 서식으로 공식 인식 및 로드
// 🚨 @PATCH : **2026-09-25** — [체크박스 및 체크리스트 글자색 본문 글씨색(#2f2f2f) 일치화]: .task-list-item 및 checkboxStructure color를 본문(p) 글씨색(기본 #2f2f2f)으로 일치시켜 별도 색상 튐 현상 원천 배제
// 🚨 @PATCH : **2026-09-25** — [체크리스트 완료 항목 스타일 '효과없음(none)' 기본값 통일]: prof.checkboxStructure.checkedEffect 기본값을 무조건 'none'으로 처리하여 기본 체크박스 완료 시 취소선 및 반투명 효과를 원천 배제
// 🚨 @PATCH : **2026-09-24** — [누락 태그 'Onrivi 기본서식' 자동 상속 및 렌더링 동기화]: loadUserProfiles 및 dynamicCssString에서 normalizeCssProfile을 연동하여, 프로필에 누락된 태그(동영상, 지도, 체크박스, 각주 등)가 있을 때 무조건 Onrivi 기본서식(DEFAULT_PROFILE)의 태그 규칙을 기준으로 100% 자동 채워져 렌더링되도록 보장
// 🚨 @PATCH : **2026-09-24** — [동영상 및 지도 래퍼 폭 수축(300px) 버그 해결]: dynamicCssString 내 .onrivi-video-wrapper 및 .onrivi-map-wrapper에 고정되었던 width: fit-content를 ruleObj.width(기본 100%) 기반 동적 확장(display: flex, width: 100%)으로 전면 보정하여 300px 찌그러짐 현상 원천 차단
// 🚨 @PATCH : **2026-09-24** — [기본 서식 명칭 'Onrivi 기본서식' 표준화]: 문서 오픈 시 서식 부재 또는 미존재 시 'Onrivi 기본서식'(SYSTEM_PROFILES[0].id)을 강제 적용하고 구버전 서식명('ChatGPT 스타일 콘텐츠', '온리비어서 표준 서식') 매핑 보장
// 🚨 @PATCH : **2026-09-24** — [기본 서식 'ChatGPT 스타일 콘텐츠' 전환]: SYSTEM_PROFILES[0]을 ChatGPT 스타일 콘텐츠로 변경하여 새 문서 및 서식 부재 시 기본 적용
// 🚨 @PATCH : **2026-09-24** — [체크리스트(task-list-item) 중복 불릿 기호 제거 및 여백 정렬]: ul li::marker 간섭으로 체크박스 앞에 중복 렌더링되던 불릿(•) 기호를 list-style-type: none !important 및 ::marker content: none으로 완전 소거
// 🚨 @PATCH : **2026-09-24** — [문서 표준 용지 여백(상하 18mm, 좌우 12mm) 최적화]: activeProfile.pageStyle 기본 마진을 marginTop: 18mm, marginBottom: 18mm, marginLeft: 12mm, marginRight: 12mm로 일원화 (화면 가독성 및 A4 인쇄 균형 최적화)
// 🚨 @PATCH : **2026-09-24** — [표 외곽 테두리·행(가로선)·열(세로선) 두께 개별 동적 인젝션(tableStructure)]: dynamicCssString 내 prof.tableStructure를 기반으로 table(외곽 두께)과 th/td(행 border-top/bottom 및 열 border-left/right)의 두께를 각각 독립 제어 및 실시간 렌더링 반영
// 🚨 @PATCH : **2026-09-24** — [각주(Footnote) 상하 여백 및 선택자(.onrivi-content-root .footnotes) 실시간 동기화 보강]: margin-bottom 및 .onrivi-content-root 계열 선택자를 추가하여 에디터 미리보기 및 서식 관리 모달에서 각주 서식 100% 실시간 적용 보장
// 🚨 @PATCH : **2026-09-24** — [문서 오픈 시 서식 부재 또는 미존재 시 온리비어서 표준서식 무조건 강제 적용]: 문서의 Frontmatter에 css_profile이 없거나 해당 프로필이 존재하지 않을 때, 직전 탭 서식 잔재를 상속하지 않고 무조건 온리비어서 표준서식(SYSTEM_PROFILES[0].id)으로 일원화
// 🚨 @PATCH : **2026-09-24** — [본문 문단(P) 줄간격(line-height) 및 문장 사이 간격(sentence-gap) 실시간 동기화 완벽 보장]:
//             1) rules.p['line-height'] 차단 필터를 해제하고 effectiveLineHeight 기반 전역/개별 p 줄간격 100% 실시간 연동
//             2) sentence-gap에 p .onrivi-line + .onrivi-line 및 br 가상 블록 선택자를 동시 주입하여 문단 내 줄바꿈 문장 간격 1px 단위 즉각 반응 실현, 0px 설정 시 리셋
// 🚨 @PATCH : **2026-09-24** — [KaTeX 수식(MATH) 기본 글자 크기(inherit) 및 상하 여백 100% 실시간 렌더링 정상화]:
//             1) 수식 글자 크기 미지정('기본설정 유지') 시 font-size: inherit !important 주입으로 KaTeX 1.21em 자체 스타일 오버라이드 및 본문 기본 글자 크기 실시간 동기화 실현
//             2) 단축 margin 잔재를 소거하고 margin-top/margin-bottom에 !important 명시 주입으로 globals.css 오버라이드 승리 및 슬라이더 1px 단위 즉각 반응 보장
// 🚨 @PATCH : **2026-09-24** — [미디어(이미지·동영상·지도) 가로/세로 규격·상하여백·정렬(좌/중/우) 미리보기 완벽 반영]:
//             1) dynamicCssString 내 미디어 태그(img, video, map)의 width/height/max-width에 !important를 정상 부여하여 인라인/Tailwind 오버라이드 승리 보장
//             2) map 셀렉터에 iframe[src*="google.com/maps"], iframe[src*="maps.google.com"] 포괄 확장 및 iframe 래퍼(.onrivi-map-wrapper) 연동
//             3) 미디어 래퍼(.onrivi-image-wrapper, .onrivi-video-wrapper, .onrivi-map-wrapper)에 display:inline-flex, width:fit-content, max-width:100%, align-self: flex-start / center / flex-end 및 figcaption 정렬 자동 주입으로 flex 컨테이너 내부 100% 정렬 보장
//             4) ml/mr '0' 및 '0px' 동등 지원으로 정렬 오판정 원천 방어
// 🚨 @PATCH : **2026-09-26** — [에디터 수직 스크롤바 너비 슬림화(32px -> 16px)]: 과도하게 두꺼워진 모나코 에디터 verticalScrollbarSize를 기존 32px에서 절반인 16px로 축소하여 슬림하고 미려한 에디터 디자인 복원
// 🚨 @PATCH : **2026-09-25** — [에디터 Pretendard 폰트 전면 적용 및 줄바꿈 단어 잘림 방지 32px 안전 여백 확보]: 에디터 글꼴을 가독성·원문자 1위인 Pretendard Variable로 변경하고, verticalScrollbarSize를 32px로 확장하여 가변폭/볼드 환경에서도 줄 끝 단어가 스크롤바에 가려지거나 잘리지 않도록 안전 여백 완벽 보장
// 🚨 @PATCH : **2026-09-25** — [스크롤바 슬라이더 겹침 방지 verticalScrollbarSize 24px 확대]: 모나코 줄바꿈 contentWidth 계산 시 스크롤바 여백을 10px->24px로 확대하여 줄 끝 글자(r, ;, l, y)가 스크롤바에 닿거나 가려지는 현상 완전 해결
// 🚨 @PATCH : **2026-09-25** — [에디터 고정폭(D2Coding) 전면 복원 및 강조태그 긴문장 우측 글자 잘림·누락 완전 해결]: 에디터에 가변폭 세리프(Times New Roman) 적용 시 볼드(**) 토큰에서 글자 폭이 30% 급증하여 모나코 줄바꿈 계산을 초과해 우측 글자가 잘려 숨겨지던 결함을 에디터 fontFamily를 고정폭 D2Coding(D2CodingLigature, D2Coding, Consolas)으로 100% 복원하여 글자 폭 일치 및 무결점 줄바꿈 실현
// 🚨 @PATCH : **2026-09-25** — [영문 마크다운 태그 단어 쪼개짐 방지 및 에디터 우측 패딩 48px 확대]: 미리보기 dynamicCssString에 .custom-preview-container 하위 요소들의 word-break: normal !important 및 overflow-wrap: break-word !important를 명시하고, 모나코 에디터 우측 패딩을 48px로 확대하여 볼드 태그 등 굵은 글꼴에서 스크롤바 겹침 및 글자 잘림 완전 해결
// 🚨 @PATCH : **2026-09-25** — [한글 폰트 원상 복원(D2Coding) 및 영문 세리프 유지, 기본 폰트 크기 16px 상향]: 한글을 원래의 D2Coding으로 100% 복원하고 영문은 Times New Roman/Georgia를 적용, 기본 폰트 크기를 14px->16px(lineHeight 28)로 상향하여 가독성 대폭 강화
// 🚨 @PATCH : **2026-09-25** — [에디터 및 서식 영문 세리프 폰트(Times New Roman/Georgia) 적용 및 영문 단어 쪼개짐 방지]: 에디터 폰트에 'Times New Roman', 'Georgia' 우선 탑재로 출판형 영문 세리프 구현 및 wordWrapBreakAfterCharacters에서 영문 알파벳/숫자 강제 분절을 제거하여 단어 단위의 자연스러운 줄바꿈 보장
// 🚨 @PATCH : **2026-09-25** — [에디터 글꼴 굵기 SemiBold(600) 연동 및 D2Coding 중간 굵기 시각적 보정]: updateOptions 및 options에 600 웨이트 연동, 에디터 컨테이너에 editor-weight-${editorFontWeight} 클래스 부여하여 D2Coding의 400/500/600 시각적 굵기 차이 완벽 실현
// 🚨 @PATCH : **2026-09-24** — [표 테두리·모서리·세로선 및 모든 태그 서식 미리보기 완벽 동기화]:
//             1) dynamicCssString 내 방향별 CSS 속성(border-left/right/top/bottom 등)이 단축 속성(border-style/width)보다 후순위로 배치되도록 sortCssProps 정렬기 도입 (가로선 강조 시 세로선 잔재 버그 원천 해결)
//             2) .prose table의 강제 둥근 모서리(border-radius:8px), 그림자(box-shadow), 마지막 줄 하단선 소실, 지브라 배경색 오염을 완전 리셋
//             3) 미리보기 내부 모든 태그(p, h1~h6, blockquote, ul, ol, li, a, img, table 등)의 선택자 구체성을 .custom-preview-container .prose ${selector} 및 .dark 계열까지 전면 확장하여 전역/다크모드 CSS에 의한 서식 미반영 현상 완전 소멸
// 🚨 @PATCH : **2026-09-23** — [제목 태그(#) 및 헤딩 텍스트 고대비 선명화]: H1~H6 마크다운 접두사 태그(#)를 코발트 블루(#1d4ed8, 볼드)로 고대비 선명화, 제목 본문 흐릿한 연두색(#34d399)을 딥 틸/에메랄드(#0f766e, #047857)로 교체 및 에디터 컨테이너 editor-high-contrast 연동
// 🚨 @PATCH : **2026-09-23** — [에디터 글꼴 굵기(Font Weight) 및 고대비(High Contrast) 실시간 반영]: useEditorSettings에서 editorFontWeight, editorHighContrast 연동, Monaco editor updateOptions(fontWeight 400/500/700) 및 defineTheme 고대비(최대 명암비 순수 흑백) 동적 재적용
// 🚨 @PATCH : **2026-09-23** — [인용구 한글/영문 Alert 태그 동시 지원] applyLinePrefix 및 플로팅 서식 툴바 인용구 드롭다운에 한글/영문 Alert 태그([!참고] / [!NOTE], [!팁] / [!TIP] 등) 치환 및 듀얼 표기 연동
// 🚨 @PATCH : **2026-09-26** — [동일 파일 중복 탭(2개) 생성 버그 완전 박멸]: 1) restoreSessionTabs에서 openFilePaths 사전 중복 제거 및 activeFilePath에 대한 2중 파일 오픈 대신 switchTab 호출, 2) openExternalFile에서 경로 정규화(NFC/소문자/슬래시) 비교 및 setTabs 원자적 중복 검사 가드 도입으로 동일 파일이 상단 탭에 2개 중복 노출되던 결함 영구 차단
// 🚨 @PATCH : **2026-09-23** — [긴 영문 단어 줄바꿈 개선] Monaco 에디터 옵션에 wordWrapBreakAfterCharacters/wordWrapBreakBeforeCharacters 확장 및 break-all 연동으로 영문 단어가 통째로 다음 줄로 떨어지지 않고 한글처럼 줄 끝에서 글자 단위로 자연스럽게 줄바꿈되도록 개선
// 🚨 @PATCH : **2026-09-23** — [좌측 에디터 D2Coding 스타일 명세 반영] D2CodingLigature 폰트, 15px, lineHeight 1.75(26px), 리가처 활성화, 스카이블루(#38bdf8) 커서, 다크 테마(#0f172a/#e2e8f0), padding.right 32px 안전 여백 적용
// 🚨 @PATCH : **2026-09-30** — [문서 연결(DocLinkPicker) 내 폴더 링크 생성 및 📁 폴더 검색 지원]: fetchAllMdFiles에서 마크다운 파일뿐만 아니라 디렉토리 노드(📁)를 수집하여 DocLinkPicker 및 [[ 자동완성에 제공, 폴더 선택 시 헤딩 선택을 건너뛰고 [폴더명](<./경로/>) 표준 마크다운 링크 즉시 삽입, 고대비 경로 시인성 보장
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 화면/우측 툴바 잘림 방지 클램핑 개선] 에디터 분할 모드 시 툴바 너비(약 1200px)보다 좁은 에디터 폭으로 인해 우측 끝(수식 아이콘 등)이 화면/우측 툴바 밖으로 짤리던 결함 해결: 뷰포트 전체 우측 마진(winWidth - 68px) 기준 자동 클램핑 및 동적 너비 측정(floatingToolbarRef), max-w-[calc(100vw-80px)] 가로 스크롤 안전망 적용
// 🚨 @PATCH : **2026-09-23** — [참조 파일 관리 모달 미오픈 결함 해결] ModalManager modals props에 isReferenceModalOpen, setIsReferenceModalOpen 전달 누락을 복원하여 우측 툴바 참조 파일 관리(NewspaperClipping) 클릭 시 ReferenceManagerModal이 정상 오픈되도록 수정
// 🚨 @PATCH : **2026-09-23** — [인라인코드 및 인용(참조문헌) 아이콘 지정] 인라인 코드를 Password.png로, 인용(참조문헌)을 오른쪽 툴바 참조파일관리(NewspaperClipping) 아이콘으로 교체
// 🚨 @PATCH : **2026-09-23** — [인라인 인용(CITE) 아이콘 교체] 플로팅 서식 툴바의 인라인 인용(참조문헌) 아이콘을 frontend/public/icons/Password.png 이미지로 교체
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 인용구 아이콘 교체] 플로팅 툴바 인용구(QUOTE) 아이콘을 텍스트(❝)에서 frontend/public/icons/WechatLogo.png 이미지로 교체
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 아이콘 고대비 선명화] 플로팅 툴바 내부 모든 이미지 아이콘의 반투명(opacity-75) 제거 및 100% 완전 불투명·고대비 적용, 텍스트 및 참조문헌 아이콘 색상을 진하고 선명한 톤으로 개선
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 크기 및 아이콘 시인성 확대] 플로팅 툴바 버튼을 w-7→w-9, 아이콘 이미지를 w-4→w-5(20px), 텍스트/인용구/제목 컨트롤 크기를 확대하여 가독성 및 조작성 대폭 개선
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 커스텀 아이콘 PNG 연동] 플로팅 툴바 15개 서식 액션 아이콘을 frontend/public/icons PNG(ListNumbers, ListBullets, ListChecks, Eraser, MagicWand, Link, BookBookmark, Farm, FilmReel, Calendar, MapTrifold, Table, FileCode, PlusMinus) 및 오른쪽 툴바 참조문헌 아이콘(NewspaperClipping)으로 전면 교체
// 🚨 @PATCH : **2026-09-20** — [브레드크럼 아이콘 탐색기 통일] 파일경로 브레드크럼의 폴더/파일 아이콘을 탐색기와 동일한 text-current + strokeWidth 1.75 미니멀 라인 스타일로 통일 (주황색 fill 제거)
// 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(PanelLeft, FileText, Copy, Check, Folder, Plus, FolderPlus, Edit2, ChevronRight, ChevronDown, FileJson, FileCode, FileType, File, Trash2, Layers, X, Eraser, Sparkles, Loader2, Lock, HardDrive, Bot, Settings) 전체 제거, Icon 컴포넌트로 교체
// 🚨 @PATCH : **2026-09-18** — [열린 문서의 상위 폴더명 변경 시 탭 경로·브레드크럼·활성 노드 실시간 동기화]:
//             1) 탐색기에서 폴더 이름 변경 시 해당 폴더 하위에 열려 있는 모든 탭의 경로(t.path, t.node.path, t.id) 및 activeTabId, currentFileNode를 대소문자 무관 및 구분자 호환 방식으로 일괄 갱신
//             2) 상단 브레드크럼 경로 바에서 activeTab?.path를 즉각 반영하여 변경된 새 폴더명이 즉시 화면에 표기되도록 동기화
//             3) tabsRef 및 onrivi_tabs_order 동기화로 탭 전환 및 저장(Ctrl+S) 시 새 경로로 무결성 유지
// 🚨 @PATCH : **2026-09-18** — [열린 문서가 포함된 폴더 잘라내기/붙여넣기 및 되돌리기 시 탭 경로 정규화 일괄 갱신]: 폴더 이동 및 되돌리기 시 해당 폴더 하위에 열려 있는 모든 탭의 경로(t.path, t.id), activeTabId, currentFileNode를 OS 구분자(\\ vs /)에 맞추어 완벽하게 일괄 동기화
// 🚨 @PATCH : **2026-09-18** — [열린 파일 삭제 지원 및 탭 자동 닫기(file:close-tab-by-path) / 잘라내기 이동 및 되돌리기 시 탭 경로 동기화]: 파일/폴더 삭제 시 열려있던 탭을 강제 정리하고, 잘라내기 이동/되돌리기 시 탭 ID 및 활성 탭 식별자를 새 경로로 일치 동기화
// 🚨 @PATCH : **2026-09-17** — [다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 시인성 보장]: 코드블록 배경색(bgColor)의 명도를 판별하여 다크 계열일 경우 은은한 갈색 대신 고대비 코발트 블루(rgba(59,130,246,0.3)) 및 1px 인셋 아웃라인(rgba(96,165,250,0.65))을 동적 주입하여 어두운 배경에서도 활성 행이 즉각 식별되도록 개선
// 🚨 @PATCH : **2026-09-17** — [Gemini API 키 및 AI 모델명 암호문(AES) 자동 복호화 및 모델명 노출 차단]: 과거 암호화 저장된 API 키(U2FsdGVkX1...)의 Google API 400 Bad Request 에러 해결 및 하단 캡슐 버튼에 암호화된 모델명 대신 정식 모델명('Gemini 3.8 Flash')이 안전하게 렌더링되도록 자가 치유(Self-Healing) 및 복호화 파이프라인 연동
// 🚨 @PATCH : **2026-09-17** — [인증/세션 로그아웃 시 환경설정(Gemini API 키 등) 영구 보존]: 비인증 리다이렉트 및 동시접속 기기 해제 시 clearAuthSessionStorage 연동으로 API 키 및 사용자 설정 삭제 결함 해결
// 🚨 @PATCH : **2026-09-17** — [지식 베이스 상세 모달/출처 링크 '에디터에서 열기' 파일 로드 및 라인 점프 연동]: app:open-file-at-line 이벤트 리스너가 filePath를 무시하고 활성 문서 스크롤만 수행하던 결함을 해결하여, handleFileOpenByPath와 결합하여 비활성/미오픈 파일 로드, 탭 전환, Monaco 커서 포커스 및 라인 센터 스크롤, 프리뷰 data-line 동시 하이라이트 완벽 지원
// 🚨 @PATCH : **2026-09-16** — [라이선스 세션 등록 UUID 식별자 우선 전송 및 500 오류 방어]: loadAndVerifyLicense 및 handleCrossDeviceTakeover에서 p_user_id로 이메일 대신 subscription.user_id(UUID) 또는 auth session UUID를 우선 전송하여 Postgres 22P02 오류 원천 차단
// 🚨 @PATCH : **2026-09-16** — [삭제된 폴더 스캔 시 ENOENT/EPERM 콘솔 에러 가드]: fetchAllMdFiles 데스크톱 스캔 시 삭제/이동 직후의 ENOENT/EPERM 예외 콘솔 경고를 안전하게 억제하고 스킵 처리
// 🚨 @PATCH : **2026-09-28** — 세션 활성화 실패 또는 통신 오류 시 편집 권한을 열지 않고 읽기 전용으로 유지한다.
// 🚨 @PATCH : **2026-09-13** — [플로팅 서식 툴바 인용구 Alert 드롭다운 fixed 최상위 포털 전환]: Windows 작업표시줄 뒤로 드롭다운 항목이 숨는 문제 완전 해결 — absolute→fixed 포지셔닝 전환, getBoundingClientRect() 기반 실제 화면 좌표 측정, zIndex 2147483647(max) 적용, 하단 여유 부족 시 DropUp 자동 반전, floatingQuoteDropdown 상태(open/x/y/dropUp) 통합 관리, 바깥클릭/Escape 닫힘 안전 가드 유지
// 🚨 @PATCH : **2026-09-28** — 빈 문서 화면의 권한 오인 문구를 제거하고 권한 확인 중 제한 경고 토스트 억제
//             **2026-09-28** — 데스크톱 세션 확인에 웹 세션 ID가 아닌 등록 기기 ID를 사용하여 제한사용자 오판 방지
//             **2026-09-28** — 제한사용자 명령 허용 목록을 공통 디스패처에 적용하여 메뉴·툴바·단축키의 저장/편집/변환 우회 차단
//             **2026-09-13** — [데스크톱 라이선스 검증 이메일 식별자 보존 및 제한사용자 오강등 영구 차단]: loadAndVerifyLicense에서 session.user.id(UUID)로 이메일이 덮어써져 NOT_FOUND가 발생하던 결함을 session.user.email 및 desktop fullData.userId 우선 채택으로 해결하고, 서버 일시 오류 시 로컬 라이선스 파기 방지 및 오프라인 유예기간 보호 강화
// 🚨 @PATCH : **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: handleOpenKnowledge 및 Ctrl+Shift+K 단축키에 isDesktop 가드를 적용하여 웹 브라우저 환경에서 데스크톱 전용 안내 토스트 출력 및 불필요한 화면 전환 차단
// 🚨 @PATCH : **2026-09-17** — [fileList 상태 보존 및 웹 브라우저 환경 워크스페이스 타입 초기화 정상화]: fileList 선언 누락으로 인한 ReferenceError 차단 및 electronAPI가 없는 웹 브라우저 환경에서 workspaceType 초기 상태를 'browser'로 자동 지정하여 데스크톱 Electron 전용 코드 오작동 및 404 API 호출 원천 차단
// 🚨 @PATCH : **2026-09-13** — [작업장 외부 문서 온디맨드 권한 획득 및 스마트 캐싱 연동]: useFileExplorer에 setConfirmConfig 전달 및 OPEN_FILE/외부 문서 오픈 시 externalFileStore 연동으로 웹 SaaS 환경에서 작업장 외 문서라도 사용자 승인 후 즉시 열람/편집/디스크 저장 완벽 지원
// 🚨 @PATCH : **2026-10-01** — [공통 리소스 폴더 동기화 및 브라우저 Handle 자동 복원]: getEffectiveResourceFolder 기반 경로 초기화, 앱 마운트 시 IndexedDB resourceFolderHandle 복원, selectResourceFolder 시 로컬스토리지 다중 키(onrivi_resource_folder_path, onrivi_resource_folder, resourceFolder) 및 secureStorage 동시 동기화로 브라우저 새로고침/재방문 시 리소스 폴더 미지정 오류 원천 방어
// 🚨 @PATCH : **2026-09-13** — [WASM 지식 DB 청크 본문 추출 정상화]: readFileText에서 getDocumentDetail의 docObj(detail.chunks/chunkText) 연동으로 브라우저 핸들이 없는 지식 문서의 원본 본문 100% 정상 수급
// 🚨 @PATCH : **2026-09-13** — [ESLint 경고 제거 및 클라우드 빌드 안정화]: hotkeyRegistration useEffect 내 content 직접 참조를 contentRef.current로 전환하여 react-hooks/exhaustive-deps 경고 해소
// 🚨 @PATCH : **2026-09-13** — [작업장 외부 절대경로(file:///) 파일 readFileText 로컬 서버 API 폴백 연동]: 브라우저 핸들이 없는 작업장 외부 절대경로 파일에 대해 /api/file-content를 호출하여 로컬 디스크 원문을 100% 정상 수급하도록 보강
// 🚨 @PATCH : **2026-09-12** — [웹(Web) 환경 전용 문서 링크(DocLinkPicker) 검색 및 연결 완벽 지원]: 브라우저 FileSystemHandle 하위 미확장 폴더 scanDirectoryDeep 심층 재귀 스캔, Web WASM SQLite 지식 보관함(knowledgeClient.listDocuments) 실시간 문서 병합, 유니코드 NFC 및 제목(title) 3중 필터 매칭, 웹 readFileText 및 handleFileOpenByPath 지식 DB/상대경로 추적 지원으로 웹 환경 문서 연결 실패 결함 원천 해결
// 🚨 @PATCH : **2026-09-12** — [AI 모달 호출 시 현재 편집 문서(fullText/selectedText) 100% 인식 보장]: 메뉴바, 단축키, 플로팅 툴바 등 모든 진입점에서 현재 에디터 문서 내용을 aiEditorContext로 완벽 추출·주입하여 문서 전체 작업 시 기존 내용이 누락되는 결함 원천 해결
// 🚨 @PATCH : **2026-09-23** — [중첩 멀티리스트 미리보기 하이라이트 최심층 자식 요소 우선 매칭] previewHighlightLine에서 중첩 리스트(ol>li>ol>li) 구조 시 부모 승격을 차단하고 현재 커서가 위치한 최심층 자식(innermost leaf element)을 최우선 선택하여 멀티리스트 커서-미리보기 1:1 위치 동기화 완성
// 🚨 @PATCH : **2026-09-12** — [Google AI Studio 공식 모델 한정 및 Gemini 3.1 이하 전면 제거, 동적 모델 연동]: 하단 플로팅 AI 모델 팝오버를 getCachedAIModels()와 연동하고 구버전 Gemini(<= 3.1) 및 구형 Gemma 완전 배제, Google AI Studio 최신 모델(Gemini 3.8/3.7/3.6/3.5, Gemma 4 31B/26B) 동적 노출
//             **2026-09-12** — [AI 모델 단일 소스(SSOT) 표준화]: 하단 플로팅 AI 모델 팝오버 및 2행 상태 표시줄을 ONRIVI_AI_MODELS 중앙 정의와 100% 동기화
//             **2026-09-12** — AIDraftModal에 onModelChange prop 전달하여 모달 내부 모델 선택과 에디터 상태 실시간 양방향 동기화; 하단 플로팅 AI 모델 목록에 공인 안정 모델(Gemini 2.5 Flash, Gemini 2.0 Flash) 추가 연동
//             **2026-09-12** — [플로팅 툴바 이모지 서식 원복 유지] 사용자 피드백을 반영하여 플로팅 서식 툴바의 친숙한 컬러 이모지(🔢, ☰, ❝, ☑️, 🧹, 🔗, 🔖, 📝, 🖼️, 🎞️, 📅, 🌏, 📶, ⇤, ↔, ⇥, ⌨️, 🧮) 인터페이스를 원래대로 완벽 복원 및 유지
// 🚨 @PATCH : **2026-09-24** — [문서 서식 기본 글자 크기(inherit) 상속 체계 강화]: dynamicCssString 내 codeBlock, footnote에 font-size 미지정 시 inherit !important 주입 및 표(table/th/td) font-size 없을 시 inherit 셀렉터 범위 확장
//             **2026-09-24** — [표 하단 여백 반영 정상화 및 인접 블록 마진 간섭 해소]: .table-wrapper-area 및 blockquote에 display:inline-block width:100%를 적용하여 마진 상쇄(Margin Collapse)를 원천 차단하고, *:has(+ blockquote) margin-bottom:0 강제 규칙을 소거하여 표 하단 여백 및 인용구 상하 여백이 1px 단위로 100% 정직하게 상호 독립 동작하도록 해결
//             **2026-09-24** — [표 테두리 이중선(double) 고대비 렌더링 및 CSS 구체성 강화]: dynamicCssString 내 table/th/td 선택자 구체성을 .custom-preview-container .prose table, .dark 등으로 대폭 상향하여 globals.css 오버라이드 승리 보장, border-style:double 시 최소 3px 두께 자동 보장 및 th/td border-bottom-style 통일
//             **2026-09-24** — [인용구 상하 여백 0~15px 데드존 완전 소멸 및 선/후행 블록(표/코드블록) 마진 간섭 0 강제]: blockquote display:flow-root 적용 및 *:has(+ blockquote), blockquote + .not-prose .codeblock-area 마진 0 강제 처리로 슬라이더 0px 밀착 및 1px 단위 즉각 반응 실현
//             **2026-09-24** — [수평 구분선(HR) 서식 실시간 반영 및 CSS 무결성 보장]: dynamicCssString 내 tag === 'hr' 독립 처리 및 rules.hr 레거시 margin/border 오버라이드 원천 차단, hrStructure 기반 border-top/margin/width/color 완벽 동기화 및 .custom-preview-container hr, .onrivi-content-root hr 다중 선택자 지원
//             **2026-09-24** — [서식 기본 줄 간격(lineHeight) 실시간 반영 보장]: dynamicCssString 내 p, li, blockquote에 line-height: ${ps.lineHeight} 직접 주입 및 rules.p의 구버전 고정 line-height 오버라이드 차단
//             **2026-09-11** — [에디터 Pretendard 웹폰트 1순위 적용] 모나코 에디터 fontFamily를 Pretendard/Pretendard Variable 최우선으로 변경하여 원번호(①, ②, ③) 크기 불일치 해소 및 무설치 고품질 한글 렌더링 보장
//             **2026-09-11** — [코드블록 퀵래핑 언어 지원] quickWrap('code') 실행 시 insertBlockTag('```markdown', '```', '코드')로 연동하여 기본 언어를 markdown으로 지정하고 언어 자동 선택 보장
//             **2026-09-11** — [인용구 Alert 태그 선택 커맨드 및 핸들러 연동] applyLinePrefix에 alertType 지원 및 Alert 태그 치환 로직 추가, QUOTE_NOTE ~ QUOTE_CAUTION 5종 커맨드 디스패치 연동
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 전면 적용 및 dynamicCssString에 사용자 정의 CSS(prof.customCss) 실시간 주입 연동
//             **2026-09-11** — [Windows 스크린샷 캡처(Win+Shift+S) 차단 버그 원천 해결 및 클립보드 이미지 처리 안정화]
 *     1) handleGlobalKeyDown에서 non-Mac 환경(Windows/Linux) 시 e.metaKey(Win키)가 포함된 단축키(Win+Shift+S 캡처 도구, Win+V 등)를 조기 반환(if (!isMac && e.metaKey) return;)하여 OS 캡처 도구가 '다른 이름으로 저장' 등으로 가로채지던 결함 원천 해결
 *     2) isCtrl을 isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey로 플랫폼별 정확히 분리하여 윈도우 키와 Ctrl 키 간의 충돌 원천 방어
 *     3) resolveClipboardImage에 dataUrlToBlob 순수 바이너리 변환 헬퍼를 적용하여 CSP connect-src 에러 없이 Electron 네이티브 클립보드 스크린샷 이미지를 즉시 추출 및 삽입하도록 보강
//             **2026-09-06** — [ESLint react-hooks/exhaustive-deps 경고 해결] 웰컴 제어 useEffect 내 로그를 effectiveLicenseStatus 참조로 일원화하고, 단축키 액션 등록 useEffect 내 AI_MODAL 가드를 activeTabIdRef.current 및 previewModeRef.current 참조로 전환하여 불필요한 단축키 재등록 방어 및 빌드 경고 100% 해소
//             **2026-09-06** — [웹 브라우저 WASM SQLite 기반 지식 베이스 연동] KnowledgeHubView에 resourceFolderHandle을 전달하고 (window as any).__resourceFolderHandle 글로벌 캐시를 동기화하여 웹 프로드 환경에서도 내 PC의 Onrivi_Asset/db/onrivi_knowledge.db를 실시간 조회/등록/검색 가능하도록 연동
//             **2026-09-06** — [localhost 지식 엔진 초기화 지원] 데스크톱뿐만 아니라 로컬 웹 개발 환경(localhost, 127.0.0.1)에서도 리소스 폴더 지정 시 /api/knowledge/init 자동 초기화를 활성화하고, prod 웹 환경에서만 안전하게 스킵 처리
//             **2026-09-06** — [웹/데스크톱 로컬 지식 엔진 격리] 웹 브라우저 환경에서 리소스 폴더 지정 시 /api/knowledge/init 불필요 호출을 차단하고 데스크톱 환경에서만 실행하도록 가드 보강
//             **2026-09-06** — [문단 내 커서 위치 행 단독 하이라이트] previewHighlightLine에서 .onrivi-line 최우선 선택 가드를 적용하여 다중 행 문단에서 전체 p 태그가 덮어씌워지던 문제를 차단하고 커서가 놓인 해당 행만 정확하게 단독 하이라이트되도록 수정
//             **2026-09-06** — [에디터-미리보기 하이라이트 위치 불일치 완전 해결 및 미디어 삽입 커서 3단계 고정]
 *     1) previewHighlightLine에서 processedContent 의존성 추가 및 exact match(line === activeLine) 최우선 선택, 블록 컨테이너 승격으로 이미지/미디어 행에서 이전 문단으로 하이라이트가 밀리던 결함 완전 해결
 *     2) globals.css에 미디어(figure, img, video, iframe) 요소 전용 오렌지 아웃라인 링(.preview-highlight-line) 스타일 신설로 이미지 하이라이트 시인성 100% 확보
 *     3) insertMediaAtCursor에서 모달 언마운트 후 포커스 복원 시 이전 행으로 커서가 튀는 버그를 방어하기 위해 3단계(0ms, 50ms, 150ms) 커서·선택영역 강제 고정 및 updateContent 즉각 동기화 적용
 *     4) useLayoutEffect 120ms 후속 타이머 및 handlePreviewImageLoaded 연동으로 비동기 미디어 크기 결정 후 미리보기 스크롤 완벽 재조정
//             **2026-09-06** — [미디어 삽입 후 2행 자동 추가 및 커서 이동] insertImageMarkdown을 insertMediaAtCursor 유틸 기반으로 교체: 이미지·동영상·지도 삽입 후 빈 줄 2행 자동 추가 및 커서 마지막 빈 행 이동 구현
//             **2026-09-05** — [문서 하단/마지막 문단 타이핑 시 미리보기 즉시 상향 추종] processedContent 갱신 시 100ms 디바운스 타이머를 제거하고 useLayoutEffect로 전환하여 브라우저 페인트 직전 최신 DOM 높이(elementBottom)를 읽어와 Safe Zone(하단 140px)으로 0초 즉각 동기화하도록 전면 개선
//             **2026-09-05** — 미리보기 컨테이너 하단 패딩을 pb-28(112px)에서 pb-48(192px)로 확장하여 Safe Zone(하단 140px, 2~3줄 여유) 스크롤 시 마지막 줄("결국" 등)이 윈도우 하단에 가려지지 않고 충분한 스크롤 한계 여백을 갖도록 보장
//             **2026-09-05** — 표 상단 여백 및 제목 문구 간격 조정 지원: Tailwind prose의 과도한 표 상단 여백(2em)을 제거하고, 서식 설정(CSS 프로필)의 table.margin-top/margin-bottom을 .table-wrapper-area에 동적 주입하며, 표 직전 캡션 문구(p:has(+ .table-wrapper-area)) 하단 마진을 6px로 긴밀하게 압착 밀착 연동
//             **2026-09-05** — 제한사용자/읽기 전용 모드(isRestrictedUser) 시 편집보기 및 분할모드를 비활성화하고 미리보기 모드로 즉각 자동 전환하며, 제어권 획득(Takeover) 시 직전 뷰 모드로 안전하게 복원하도록 처리
//             **2026-09-05** — 동일 아이디 타 브라우저/기기 동시 접속 초과 시 상단에 친근한 안내 배너 및 '이 화면에서 편집 시작하기' 버튼을 노출하고, 클릭 시 forceTakeover API를 통해 세션 제어권을 안전하게 즉시 가져오도록 지원
//             **2026-09-05** — 문서 마지막 줄 입력 및 빈 줄 생성 시 processedContent 갱신 시점과 React 마크다운 DOM 렌더링 지연 간의 타이밍 간극을 완벽 흡수하기 위해 150ms 3차 스크롤 추종 안전 타이머 보강
//             **2026-09-05** — AI 연동 해제(!geminiApiKey) 시 에디터 하단 2줄 플로팅 AI 버튼을 흐릿하게 남기지 않고 전면 숨김 처리하여 본문 시인성 보장; 선택 텍스트 5대 AI 가공(다듬기/요약/확장/번역/마크다운변환) 레거시 제거 및 AI_MODAL을 AIDraftModal로 일원화
//             **2026-09-05** — AI 연동 해제(!geminiApiKey) 시 에디터 하단 2줄 플로팅 AI 버튼 비활성화(정적 그레이스케일, ping 비활성화, 클릭 차단 및 안내) 및 모델 선택 차단 적용
//             **2026-09-05** — 환경설정에서 공통 리소스 폴더 설정 해제 시 IndexedDB의 resourceFolderHandle이 삭제되지 않아 브라우저 새로고침(F5) 시 이전 폴더로 재연결되던 결함 해결 (idb.del/clear 구현 및 clearResourceFolder 시 IndexedDB/로컬스토리지 완전 소거)
//             **2026-09-05** — 데스크톱 앱 내비게이션 결함 방어: 기기 세션 해제(DELETE) 및 인증 만료 처리 시 Electron 데스크톱 환경에서는 /login 리다이렉트를 차단하고 에디터 내 만료 상태 유지하도록 가드 보강
//             **2026-09-04** — 에디터 영역 하단 2줄 AI 버튼의 2행 모델 선택 라벨을 축약형(3.5-flash)에서 정식 전체 모델명(Gemini 3.5 Flash 등)으로 온전하게 표시하고 truncate 제거 및 상하 패딩(py-1.5)을 균형 있게 보강하여 텍스트 및 라운드 모서리 잘림 결함 해결
//             **2026-09-04** — 에디터 영역 하단 우측 스크롤 좌측에 2줄 형태의 플로팅 AI 버튼({userNickname || '익명'} AI / 모델 선택 상향 팝오버)을 배치하고, 상태바 연동 보이기/숨기기(isAiButtonVisible) 지원 및 플로팅 툴바의 AI 단독 버튼을 제거하여 서식 전용으로 가볍게 최적화
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 새 탭 생성 방지 및 에디터 ↔ 지식문서 화면(KnowledgeHubView) 단일 탭 인라인 전환 지원, Monaco 에디터 언마운트 없이 z-[150] 풀스크린 오버레이 뷰로 전환하고 MenuBar 중복 노출을 차단하여 모델 폐기(Model is disposed!) 및 메뉴바 침범 결함 원천 해결, BroadcastChannel 기반 동일 브라우저 내 다중 에디터 중복 실행 방어 락(singleTabGuard) 구축
//             **2026-09-03** — 마지막 행 또는 문서 하단에서 타이핑할 때 미리보기가 입력 중인 행을 보여주지 않고 상단에 멈춰있던 결함을 해결하기 위해, processedContent 갱신 시 에디터 현재 커서 위치로 syncPreviewToTargetLine을 실시간 추종하는 useEffect 및 2단계 타이머 구축
//             **2026-09-03** — 모니터 해상도 및 화면 배율에 따라 분할 모드에서 미리보기 우측 화면 및 표가 잘리던 현상을 해결하기 위해 custom-preview-container에 px-2 sm:px-4 안전 여백을 부여하고 preview-page-sheet에 maxWidth: 100% 및 max-w-full 반응형 가드 적용
//             **2026-09-03** — 단축키/툴바/슬래시를 통한 서식 및 마크다운 태그 적용 시 직전 타이핑과의 실행취소(Undo) 단계를 명확히 분리하기 위해 pushUndoStop 격리 장벽을 구축하여, Ctrl+Z 실행취소 시 텍스트는 보존되고 최근 적용된 태그만 단독 취소되도록 전면 개선
//             **2026-09-03** — 문서링크 픽커(DocLinkPicker) 팝업창 너비를 280px에서 420px로 50% 대폭 확장하고, truncate를 제거하여 긴 파일명 및 헤딩 제목이 잘리지 않도록 개선
//             **2026-09-03** — 웹 브라우저 및 모든 플랫폼에서 문서 링크가 일반 링크처럼 [개요명/문서명](<./상대경로.md#헤딩>) 형식의 표준 마크다운 상대경로로 삽입되도록 handleDocLinkSelect 개편
//             **2026-09-03** — 에디터 및 미리보기 본문 텍스트 간섭을 0%로 완벽 격리하기 위해 본문 영역 플로팅 AI 버튼을 전면 제거하고 상단 메뉴바(MenuBar) 우측 고정 캡슐 아이템으로 이전 탑재
//             **2026-09-03** — 마지막 행 엔터 후 빈 행 바로 위에서 긴 텍스트 입력 시 Word Wrap(자동 줄바꿈) 발생할 때마다 미리보기 스크롤이 바닥으로 곤두박질치던 버그 해결(규칙 6을 위반하여 타이핑 시 강제 하단 스크롤을 유발하던 ResizeObserver 제거 및 syncEngine Safe Zone 정렬 일원화)
//             **2026-09-03** — 전체사용자 대상 공통 리소스 폴더 미지정 시 초기 진입 가이드 모달(ResourceFolderGuideModal) 자동 연동 및 SELECT_RESOURCE_FOLDER 퀵 커맨드 신설; 플로팅 AI 버튼 라벨을 사용자 별명 기반({별명} AI, 예: '탕수육 AI')으로 동적 변경 연동; 플로팅 챗봇에서 최종 선택한 모델의 onrivi_settings/localStorage 완벽 영구 동기화(재접속 시 최종 모델로 자동 시작); 에디터 초기 로드 시 미연결 챗봇 완전 숨김 가드 강화; 버튼 아이콘을 온리비 로고(/icon.png)로 변경하고 특별한 AI 오로라 바이올렛 그라데이션 컬러 적용; 웹 브레드크럼 실제 절대경로 상위 기준경로 설정 및 플로팅 AI 챗봇 분할 캡슐 버튼 구현
//             **2026-09-02** — 에디터 상단 경로 표시줄을 투박한 역슬래시 텍스트에서 폴더/파일 SVG 아이콘 및 치브론 구분자 기반 모던 브레드크럼(Breadcrumb) UI로 전면 리뉴얼
//             **2026-09-02** — 사이드바 및 분할 모드(Split View) 에디터-미리보기 사이 분할선을 border-slate-300 dark:border-zinc-700으로 선명하게 강화
//             **2026-09-02** — 플로팅 툴바에 표 현재 열 정렬(좌/중/우) 퀵 버튼 3종 추가 연동
//             **2026-09-02** — 서식 설정에 문단 내 문장 사이 간격(sentence-gap / 줄바꿈 간격, 기본값 0px) 슬라이더 컨트롤 추가 및 동적 CSS br 마진 주입 연동
//             **2026-09-02** — 서식 설정(CSS 프로필)의 P 태그 줄간격(line-height), 여백, 들여쓰기 변경이 실시간으로 반영되도록 line-height inherit 충돌을 해소하고 선택자에 onrivi-content-root 확장
//             **2026-09-02** — CSS 프로필(서식) 적용 시 p 태그 마진이 리스트 내부로 흘러들어가 행간이 벌어지던 현상을 막기 위해 generatePreviewCss에 li, li p 제로 마진 압착 규칙 주입
// 🚨 @PATCH : **2026-09-11** — Alert 인용구 5종(Note, Tip, Important, Warning, Caution) 접두사 삽입 및 태그 치환 엔진(applyLinePrefix alertType) 연동, QUOTE_* 커맨드 디스패치 등록
//             **2026-09-16** — [웹 브라우저 탭 격리 및 하트비트 세션 해제 캐치 보강]: 웹 SaaS 환경에서 동일 브라우저의 다중 탭/창 접속을 격리 식별하기 위해 sessionStorage(onrivi_tab_session_id)를 우선 채택하여 2번째 탭/창 접속 시 100% 동시 접속 초과(제한 모드)로 격리하고, 하트비트(/api/license/check-session)에서 타 기기 제어권 인수 또는 세션 해제(DELETE/비활성화)를 즉시 캐치하여 자동 세션 종료 및 제한 모드로 전환되도록 안전 가드 연동
//             **2026-09-02** — 에디터 마지막 행 아래의 과도한 스크롤 빈 공간을 없애기 위해 scrollBeyondLastLine: false 및 padding.bottom: 24로 최적화
//             **2026-09-02** — 에디터 Monaco 패딩(top: 16, bottom: 24, right: 16) 및 미리보기 페이지 시트 상하 여백(my-3~4, pb-12)을 슬림하게 축소 조정하여 쾌적한 작업 공간 확보
//             **2026-09-02** — 타이핑 시 180ms 지연 깜빡임을 완전히 제거하기 위해 React 18 useDeferredValue 기반 동시성 실시간 렌더링 적용 및 에디터 마지막 행 입력 시 미리보기가 가려지지 않고 실시간 바닥(최하단)을 즉시 추종하도록 동기화 개선
//             **2026-09-02** — [ONRIVI-DS-SYSTEM-002 v5.0] LINE Design System (LDSG) 전면 마이그레이션 (LINE Green #1d4ed8, LDSG Blue #4D73FF, LDSG Grayscale 및 LineSeed 폰트 토큰 적용)
//             **2026-09-02** — [ONRIVI-DS-SYSTEM-002 v4.1] Onrivi 통합 디자인 시스템 토큰 적용 및 미리보기 스크롤 컨테이너에 onrivi-preview-container 표준 클래스 적용
//             **2026-09-05** — 현재 플랜이 에디터 편집 지원 플랜(isEditorPlan)인 경우에만 다중 탭 중복 방어 락 및 '편집 제어권 가져오기'를 가동하고, 에디터 미지원 플랜(READER, 만료, 제한사용자 등)은 '제어권 가져오기' 없이 어디서나 제한사용자로 자연스럽게 무차단 열람 접근하도록 개선
//             **2026-09-05** — 동일 브라우저 다중 탭 실행 시 전면 차단 모달을 제거하고 비활성 탭을 '제한사용자(읽기 전용)' 모드로 자연스럽게 접근 허용하도록 개편, 상단 제어권 인수(Take Over) 배너 연동 및 실시간 권한(effectiveLicenseStatus/isRestrictedUser) 격리 보완
//             **2026-09-05** — Realtime DELETE 이벤트 시 타인의 기기 해제에 의한 전역 강제 로그아웃 방어(본인 activation_id 및 device_uuid 검증 가드) 적용 및 로컬 캐시 payment_no와 현재 로그인 유저 불일치 시 자동 캐시 파기 및 본인 구독 재조회 적용
//             **2026-09-02** — 에디터 스크롤 전담 1:1 동기화 및 바닥 밀착 개편: 미리보기 onWheel preventDefault 제거, scrollBeyondLastLine 활성화 및 하단 160px 패딩 적용으로 마지막 줄 엔터 시 시야 자동 확보, 타이핑/방향키/백스페이스 시 스크롤 간섭 0회 분리
//             **2026-08-27** — 비로그인 즉시 체험 모드(onrivi_guest_mode) 가동 시, 최초 라이선스/세션 검증(loadAndVerifyLicense)을 스킵하고 가상의 프리미엄 등급 라이선스 상태로 즉시 활성화 셋업하여 에디터 편집 잠금을 원천 패스하도록 가드 적용; 게스트 무단 점유/재접속 방지를 위해 10분 타이머(countdown) 및 로컬스토리지 만료 낙인(onrivi_guest_expired) 차단막 시스템을 구축하여 시간 만료 시 에디터 강제 읽기 전용 전환 및 닫기 없는 풀스크린 가입 권유 모달 팝업 바인딩
//             **2026-09-02** — 여러 탭 전환 시 에디터 스크롤/커서 위치를 기준으로 미리보기를 1:1 완벽 동기화하고 직전 커서 라인 캐시를 리셋하여 마우스 클릭 및 방향키 이동 시 해당 위치 즉시 추종 보장
//             **2026-09-02** — 커서가 에디터 우측 끝에 있을 때 플로팅 툴바가 화면 밖으로 짤려 버튼 선택이 불가능하던 현상을 해결하기 위해 에디터 컨테이너 및 윈도우 뷰포트 우측/상단 경계 이탈 방지 클램핑(Boundary Clamp) 적용
//             **2026-08-26** — 분할모드에서 마우스 휠 동작에 의해 우측 실시간 미리보기 스크롤이 단독으로 움직이는 것을 차단하고(onWheel preventDefault) 에디터 스크롤 동기화에 의해서만 구동되도록 제어 및 런타임 contentText ReferenceError 보정 수정
//             **2026-08-13** — 스크롤 요동 및 튕김 현상의 근본적 해결을 위해 MainEditorApp 내의 모든 이중/중복 스크롤 보정 훅(postContentScrollCorrection) 및 휠/터치 강제 차단 훅을 완전히 삭제하고, Monaco Setup의 단일 스크롤 리스너로 동기화 구조를 전량 이관 및 정밀 간소화함
//             **2026-08-12** — 에디터를 열거나 탭을 닫고 전환할 때 제한사용자(만료, 동시접속 제한, 미인증 등)의 권한 가드가 누락되어 편집 가능해지던 버그 해결을 위해 isRestrictedUser 검사 통합 적용 및 Monaco readOnly/domReadOnly 옵션 동기화 보완; 최초 검증 시 동시접속 실패 시 이중 검증 복구 우회로를 차단하고 isRestricted 필드를 로컬 보안 캐시와 setLicenseStatus에 밀봉 연동하여 캐시 뚫림 현상 원천 해결
//             **2026-08-12** — 에디터 마지막 2줄 이내에서 타이핑 시 미리보기 영역이 위로 튀어서 입력 내용이 가려지던 버그 해결을 위해 postContentScrollCorrection 훅에 setTimeout(50ms) 기반 지연 최하단 밀착 스크롤 보강 적용
//             **2026-07-22** — 클라이언트 직접 supabase.rpc() 호출 전량 서버단 API Route fetch()로 이전: insert_license_activation→/api/license/activate, check_license_session(×2)→/api/license/check-session, verify_desktop_license→/api/license/verify-desktop; Realtime 구독 테이블명 license_activations→license_activations 전환
//             **2026-07-22** — subscriptions 단일 통합 테이블 개편에 맞춰 software_licenses 및 users 레거시 쿼리 참조를 subscriptions 단일 쿼리로 일괄 마이그레이션 적용
//             **2026-07-20** — 플로팅 툴바의 단독 AI Sparkles(✨) 아이콘 클릭 시 기존의 미작동하던 인라인 미리보기(setAiPreviewState)를 제거하고, 정상적인 AI 에디토리얼 어시스턴트 모달(AiDraftModal)이 열리도록 OPEN_AI_WRITER 커맨드 디스패치로 수정. 또한 텍스트/마크다운 조작 그룹에 중복으로 존재하던 텍스트 이모지(✨) 버튼을 제거하여 툴바 장황성 개선 및 기능 단일화 패치 적용 | **2026-07-18** — 라이선스 만료 및 미승인 상태(isExpired)일 때 Monaco 에디터가 편집 불가(readOnly, domReadOnly) 상태로 전환되도록 강제화 보강, 웰컴페이지 유예 시간 빨간색 경고 메시지 배너 UI 제거
 * *2026-07-15** — ModalManager deps 객체에서 window.SYSTEM_PROFILES/DEFAULT_PROFILE/isSystemProfileId를 window 전역에서 읽던 잘못된 코드를 모듈 import 상수 직접 참조로 수정 (window에 주입되지 않아 항상 빈 배열/객체로 폴백 → 서식 삭제 시 SYSTEM_PROFILES[0] undefined TypeError 버그 수정) | AI 재생성 및 모달 닫기/취소 시 백그라운드 스트리밍을 무효화하는 generationIdRef 가드 추가(동일 모달 재진입 또는 재생성 시 이전 버퍼가 오버랩되는 현상 완벽 조치), 에디터 마지막 행 타이핑 시 화면이 위아래로 흔들리는(jitter) 현상 해결을 위해 scrollBeyondLastLine: false와 충돌하는 bottom 패딩을 0으로 조정, AI 결과 반영 시(본문 대체 삽입 및 하단 추가) 에디터 포커스를 획득하고 커서의 위치를 반영된 텍스트 블록의 처음 시작 지점으로 자동 스위칭(setPosition/revealPositionInCenter)하도록 개선, AI 에디토리얼 어시스턴트에 컨텍스트 없음(일반 질문) 선택 옵션(targetScope: none)을 기본값으로 추가 제공하여 불필요한 본문 참조 현상 해결 및 본문 삽입/추가 로직 커서 위치 연동 보강, AI 에디토리얼 어시스턴트 모달 오픈 시 명령 입력창(textarea)에 자동으로 포커스(autoFocus)가 가도록 기능 보완, 문서 연결(문서링크) 픽커 모달의 노출 위치를 기존 floatingToolbar 기준에서 현재 Monaco 에디터의 커서(Cursor) 좌표 위치로 실시간 계산하여 출력되도록 스페이스 보정 및 화면 이탈 방지 가드 추가 | **2026-07-14** — AI 글쓰기 어시스턴트 적용 범위(선택 영역 vs 전체 문서) 스위칭 토글 옵션 및 지능형 문맥 자동 결합 옵션 탑재, 툴바 장황성 극복을 위한 상단 및 플로팅 툴바 단독 AI Sparkles(✨) 아이콘 주입, 맞춤법/오탈자 등 일반 지시 사항에 반응하도록 action 하드코딩 교정 및 [출력결과] 개행 앵커 정규식 필터 보정 | **2026-07-04** — 서식설정(CSS 프로필) 진입 방식을 기존 가상 탭바 기반 통합 개편에서 **전체화면 모달 팝업 갤러리(CssStyleModal)** 방식으로 재차 전면 개편. 탭 충돌 버그 및 데스크탑 렌더링 에러를 원천 차단하고 직관적인 샘플 문서 기반 프리뷰 환경 제공 | **2026-07-04** — 탭을 모두 닫거나 파일 전환 시 제한(만료) 사용자는 항상 미리보기 전용('preview') 모드로 강제 고정하고, 전체(일반) 사용자는 하단 상태바 등에서 활성화된 직전의 에디터 뷰잉 모드를 그대로 상속 및 유지하여 탭과 유기적으로 동기화하는 UI 보정 패치
 * *2026-06-23** — 동시접속 제한 초과 여부를 실시간 총 세션 수로 판별하도록 `fiveMinAgo` 필터 제거 / 동시접속자 요금제 한도 초과 시 강제 로그아웃/로그인 튕김 대신 에디터가 편집 불가 및 미리보기 전용 모드로 제한되도록 개선 / isExpired 상태 변화 시 Monaco Editor의 readOnly/domReadOnly 옵션을 실시간 강제 동기화하도록 보완 / 탭 추가(+) 버튼 기능 제거치로 실시간 계산하여 출력되도록 스페이스 보정 및 화면 이탈 방지 가드 추가 | **2026-07-14** — AI 글쓰기 어시스턴트 적용 범위(선택 영역 vs 전체 문서) 스위칭 토글 옵션 및 지능형 문맥 자동 결합 옵션 탑재, 툴바 장황성 극복을 위한 상단 및 플로팅 툴바 단독 AI Sparkles(✨) 아이콘 주입, 맞춤법/오탈자 등 일반 지시 사항에 반응하도록 action 하드코딩 교정 및 [출력결과] 개행 앵커 정규식 필터 보정 | **2026-07-04** — 서식설정(CSS 프로필) 진입 방식을 기존 가상 탭바 기반 통합 개편에서 **전체화면 모달 팝업 갤러리(CssStyleModal)** 방식으로 재차 전면 개편. 탭 충돌 버그 및 데스크탑 렌더링 에러를 원천 차단하고 직관적인 샘플 문서 기반 프리뷰 환경 제공 | **2026-07-04** — 탭을 모두 닫거나 파일 전환 시 제한(만료) 사용자는 항상 미리보기 전용('preview') 모드로 강제 고정하고, 전체(일반) 사용자는 하단 상태바 등에서 활성화된 직전의 에디터 뷰잉 모드를 그대로 상속 및 유지하여 탭과 유기적으로 동기화하는 UI 보정 패치
 * *2026-06-23** — 동시접속 제한 초과 여부를 실시간 총 세션 수로 판별하도록 `fiveMinAgo` 필터 제거 / 동시접속자 요금제 한도 초과 시 강제 로그아웃/로그인 튕김 대신 에디터가 편집 불가 및 미리보기 전용 모드로 제한되도록 개선 / isExpired 상태 변화 시 Monaco Editor의 readOnly/domReadOnly 옵션을 실시간 강제 동기화하도록 보완 / 탭 추가(+) 버튼 기능 제거
 * *2026-06-22** — 에디터 진입/새로고침 시 license_activations 테이블에 등록된 기존 활성 세션(existingAct)이 유실되었더라도, 유효 요금제 기기 허용 한도(max_devices) 미만인 경우 자동으로 세션 등록(Auto register)을 보장하여 강제 로그아웃/로그인 튕김 현상을 근본적으로 차단하는 접속 세션 자동 복구 복원 가드 패치
 * *2026-06-19** — 에디터 미리보기(반반 모드/미리보기 전용)의 상하좌우 여백을 서식설정(CSS 프로필) 수치 그대로 동기화하도록 pageStyle 및 부모 컨테이너 패딩 레이아웃 개정 | **2026-06-20** — 데스크톱 라이선스 자동 DB 등록 및 로컬 발급 로직 전면 배제 (무조건 미인증 시 미리보기 전용 잠금), 로컬 시간 조작 방어 가드 구현, 만료일 자정 차단 백그라운드 스케줄러 및 10분 유예 카운트다운 타이머 연동, 만료 시 preview 모드 강제 제한 가드 적용
 * -----------------------------------------------------------------------
 */

// @ts-nocheck

"use client";
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { clearMarkdownFormatting } from '@/lib/clearMarkdownFormatting';
import { reportNumberingCss } from '@/lib/reportNumbering';
import { flashPreviewHighlight } from '@/lib/previewHighlight';
import { headingNumberingCss, createHeadingNumberer, syncMarkdownHeadingNumbers } from '@/lib/headingNumbering';
// next.js의 규칙, 이 페이지는 client side에서 렌더링됨. 
//지시어 종류실행 및 렌더링 위치설명 및 아키텍처적 역할"use client";
//최종 유저의 웹 브라우저자바스크립트 Hooks(useState, useEffect)를 허용하고, 마우스 클릭·키보드 타이핑 등 실시간 UI 인터랙션을 처리할 때 선언합니다.
//"use server";백엔드 Node.js 서버프론트엔드(브라우저)에서 백엔드 서버의 함수를 마치 API 호출하듯이 다이렉트로 안전하게 원격 실행할 수 있게 만드는 서버 
//액션(Server Actions) 전용 지시어입니다. (보안 키 검증, DB 직접 CRUD 시 사용)

/** ======================================================================== 
 * 참고 
 *  src/lib/api.ts -> api 서버 경로
 * =========================================================================
*/

import {loadBibliographyFiles} from '@/lib/bibliographyStorage';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings, saveResourceSettings, requireResourceSettings, getResourceEnvironment, activateDriveAccount } from '@/lib/resourceSettings';
import { importedCheckboxEdit } from '@/lib/importCheckboxes';
import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback, useDeferredValue } from 'react';   // 리액트 훅 - 상태관리, 렌더링 제어 등
import Editor, { loader } from '@monaco-editor/react'; // 모나코 에디터 - 코드 편집기
import MarkdownViewer, { isPathInsideWorkspace } from '@/components/MarkdownViewer'; // 마크다운 뷰어 - 마크다운 뷰어
import { createPortal } from 'react-dom';
import VisualDocumentEditor from '@/components/VisualDocumentEditor';
import { mediaSourceRange } from '@/lib/mediaSourceRange';
import { saveResourceMedia, parseDroppedDataToBlob, fetchExternalImageFile } from '@/lib/resourceMedia';
import { imageResourceName, picturebookImageReference } from '@/lib/imageResourceName';
import { visualImageDetails } from '@/lib/visualDocumentCodec';
import InlineAIAssistant from '@/components/ai/InlineAIAssistant';
import {captureMonacoAITarget} from '@/lib/ai/monacoTarget';
import { syncPreviewInterpolated } from '@/lib/syncEngine'; // 구간 선형 보간 동기화 엔진
import Script from 'next/script'; // 넥스트 스크립트 - 
import 'katex/dist/katex.min.css'; // 카텍스 스타일 - 수학 공식 렌더링
// import 'highlight.js/styles/github.css'; // 코드 하이라이팅 스타일

/**
 * ==================================================================================
 * 아이콘 라이브러리 - lucide-react 
 * PanelLeft as SidebarIcon, FileText, Copy, Check, Folder, Plus, FolderPlus, Edit2,
  ChevronRight, ChevronDown, FileJson, FileCode, FileType, File, Trash2,
  Layers, X
 * ==================================================================================
 */


/**
 * ==================================================================================
 * 프로젝트 내부 모듈 @가 있는 내부 components 참조선언
 * ==================================================================================
 */
import { EditorProvider } from '@/context/EditorContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { useMonacoSetup } from '@/hooks/editor/useMonacoSetup';
import { useUIStore } from '@/store/useUIStore';
import { useToast } from '@/components/ToastProvider';  // 토스트 메시지
import { msg } from '@/lib/systemMessages'; // 메시지
import { browserSessionPolling } from '@/lib/sessionPolling';
import { getApiUrl } from '@/lib/apiUrlBuilder'; // api 서버 경로
import { exportPDF, exportHTML, exportEPUB, exportPNG } from '@/lib/exportHandlers'; // 파일 내보내기 핸들러
import { serializeDocumentForClipboard, copyFormattedDocumentToClipboard } from '@/lib/clipboardExport';
import { configureMonacoEnvironment } from '@/lib/monacoEnv'; // Monaco 환경 설정
import { idb, FileNode, scanDirectory, scanDirectoryDeep, getFileIcon } from '@/lib/indexedDbHelper'; // indexedDB 헬퍼
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient'; // 지식 베이스 클라이언트
import { preprocessMarkdownForPreview, stripFrontmatter, getCodeBlockLineMask } from "@/lib/editorUtils"; // 마크다운 프리뷰
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from "@/lib/syncEngine"; // 동기화 엔진
import { configuredHotkeyItem, getSlashCommands, getDefaultHotkeys, getDefaultCommands, TOOLBAR_ITEMS } from "@/lib/toolbarConfig"; // 툴바 설정
import { EDITOR_THEMES, THEME_MAP, applySafeMarkdownMonarchTokenizer } from "@/lib/editorThemes"; // 에디터 테마
import { CssProfile } from "@/types/cssProfile"; // css 프로필 타입
import { DEFAULT_PROFILE, SYSTEM_PROFILES, isSystemProfileId, normalizeCssProfile, resolveCssProfile } from "@/constants/cssProfile";
import { generateDynamicCss } from '@/lib/dynamicCssGenerator'; // 기본 프로필
import { WELCOME_CONTENT } from "@/constants/welcomeContent"; // 웰컴 컨텐츠
import { PAPER_SIZES } from "@/constants/paperSizes";
import { getWelcomeContent, saveWelcomeContent } from "@/constants/welcomeContent"; // 웰컴 컨텐츠
import { getVfsFiles, vfsReadFile, vfsWriteFile, vfsCreateFile, vfsCreateFolder } from '@/lib/virtualFileSystem'; // 가상 파일 시스템 헬퍼
import { clearAuthSessionStorage } from '@/lib/authSessionHelper';

import FileTreeItem from '@/components/FileTreeItem'; // 파일 트리 아이템
import ExportModal from '@/components/ExportModal'; // 모달
import OAIcon from './icon_onriveauther.png'; // 아이콘 
import { ONRIVI_AI_MODELS, DEFAULT_AI_MODEL, getCachedAIModels, normalizeAIModelName, fetchGoogleAIStudioModels, ensureDecryptedApiKey } from '@/lib/gemini';

// 분리된 컴포넌트들 임포트
import MenuBar from '@/components/MenuBar'; // 메뉴바
import Toolbar from '@/components/Toolbar'; // 툴바
import { resolveNativeDocumentPath } from '@/lib/nativeDocumentPath';
import EmojiPanel from '@/components/EmojiPanel';
import { Icon } from '@/components/icons/Icon';

import StatusBar from '@/components/StatusBar'; // 상태바
import ImageModal from '@/components/ImageModal'; // 모달
import MapModal from '@/components/MapModal'; // 모달
import TableModal from '@/components/TableModal'; // 모달
import SettingsModal from '@/components/SettingsModal'; // 모달
import GlobalSearch from '@/components/GlobalSearch'; // 모달
import LeftSidebar from '@/components/LeftSidebar'; // 모달
import FormulaModal from '@/components/FormulaModal'; // 모달
import MergeModal from '@/components/MergeModal'; // 모달
import YoutubeModal from '@/components/YoutubeModal'; // 모달
import LicenseModal from '@/components/LicenseModal'; // 라이선스 모달
import AIDraftModal from '@/components/AIDraftModal'; // 초안 생성 모달
import CalendarModal from '@/components/CalendarModal'; // 달력 모달
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import { supabase } from '@/lib/supabaseClient';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { loadResourceAICredentials, deleteResourceAICredentials, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import UnifiedTabBar, { EditorTab } from '@/components/UnifiedTabBar';
import * as utilsPasteHandlers from '@/utils/pasteHandlers';
import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import * as utilsEditorActions from '@/utils/editorActions';
import { useEditorFormatting } from '@/hooks/editor/useEditorFormatting';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useEditorSettings } from '@/hooks/useEditorSettings';
import { useEditorHandlers } from '@/hooks/useEditorHandlers';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useEditorKeybindings } from '@/hooks/useEditorKeybindings';

// ====================================================================
// 🚀 [리팩토링 V2 이관 준비] 새로 생성된 모듈 Import
// 기존 하드코딩된 상태와 뷰를 이 파일들로 점진적으로 마이그레이션해야 합니다.
// ====================================================================
import { useEditorAuth } from '@/hooks/editor/useEditorAuth';
import { useEditorLicense } from '@/hooks/editor/useEditorLicense';
import { useEditorCommands } from '@/hooks/editor/useEditorCommands';
import { useEditorPaste } from '@/hooks/editor/useEditorPaste';
import { useEditorSaveActions } from '@/hooks/editor/useEditorSaveActions';
import { useEditorDocumentSession } from '@/hooks/editor/useEditorDocumentSession';
import { mapIdToCommandType as importedMapIdToCommandType } from '@/types/editorCommand';
import { useEditorModals } from '@/hooks/editor/useEditorModals';
import { useEditorDocLinks } from '@/hooks/editor/useEditorDocLinks';
import { useEditorProfiles } from '@/hooks/editor/useEditorProfiles';
// import EditorLayout from '@/components/editor/layout/EditorLayout';
// import EditorCore from '@/components/editor/core/EditorCore';
import EditorOverlayManager from '@/components/editor/EditorOverlayManager';
import EditorLayout from '@/components/editor/EditorLayout';
import EditorCore from '@/components/editor/EditorCore';
import NewDocumentModal from '@/components/NewDocumentModal';
import { extractFrontmatter, updateCssProfileInFrontmatter } from '@/lib/frontmatter';
import { documentBookProfile, writeBookProfileSnapshot, legacyBookProfile, parseBookScenes, replaceSceneImage } from '@/lib/picturebook';
import { KnowledgeHubView } from '@/components/knowledge/KnowledgeHubView';
import { useSingleTabGuard } from '@/lib/singleTabGuard';
import { saveExternalFileHandle } from '@/lib/storage/externalFileStore';
import { PreviewToolbar } from '@/components/preview/PreviewToolbar';
import { PreviewFindWidget } from '@/components/preview/PreviewFindWidget';
import { fetchUserProfiles, persistUserProfiles, getEffectiveResourceFolder, getProfileResourceFolder } from '@/lib/profileStorage';
import { setProfileReadStatus } from '@/lib/profileReadStatus';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  readDriveFileContent,
  uploadDriveImage,
  initDriveTokenAutoRefresh
} from '@/lib/gdrive/googleDriveClient';


/**
 * ==================================================================================
 * 타입 선언
 * ==================================================================================
 */

/**
 * @fileType 
 *  @File 
 *  @Description 
 *  @Link https://onrivi.com/documentation/workflow/workflow/20240320123456-editorcommandtypes
 *  @note @/app/page.tsx에서 명령어를 직접 사용하는 대신 @/lib/editorCommandType.ts에서 정의된 명령어 타입을 사용  
 *        모나코 에디터의 명령어를 @/lib/editorCommandType.ts에 정의된 명령어 타입으로 매핑하여 사용  
 *        @/lib/editorCommandType.ts는 @/app/page.tsx에서 사용되는 모나코 에디터의 명령어를 정의한 파일   
 */

export type { EditorCommandType } from '@/types/editorCommand';

// 모듈 레벨 Monaco 설정: 컴포넌트 렌더 전에 loader 경로 확정 (레이스 컨디션 방지)
if (typeof window !== 'undefined') { // @window : 브라우저에서만 사용되는 객체, @undefined : 브라우저가 아닌 환경(Node.js 등)에서 사용되는 값 
  const addonQuery = new URLSearchParams(window.location.search).get('env') === 'addon'; // @addonQuery : 환경 변수 
  const addonRuntime = !!((window as any).chrome?.runtime?.id); // @addonRuntime : 환경 변수 

  // 크롬 확장 프로그램 환경에서만 Monaco loader 경로를 설정 (레이스 컨디션 방지)
  if (addonQuery || addonRuntime) { // @addonQuery : 환경 변수, @addonRuntime : 환경 변수 
    const getExtensionUrl = (relativePath: string) => { // @getExtensionUrl : 환경 변수 
      if (typeof (window as any).chrome?.runtime?.getURL === 'function') { // @getExtensionUrl : 환경 변수 
        return (window as any).chrome.runtime.getURL(relativePath); // @getExtensionUrl : 환경 변수 
      }
      return relativePath; // @getExtensionUrl : 환경 변수 
    };
    (window as any).MonacoEnvironment = {
      getWorkerUrl: function (_moduleId: string, label: string) { // @getWorkerUrl : 환경 변수 
        // 🛡️ 크롬 확장 프로그램 MV3의 CSP(script-src 'self') 제약 하에서는
        // 동일 origin인 로컬 패키지 내의 vs/base/worker/workerMain.js 경로를 다이렉트로 반환하여
        // 동일 origin(chrome-extension://) 하에 워커 컨텍스트를 생성해야 내부 importScripts 로드가 차단되지 않습니다.
        return getExtensionUrl('/monaco-editor/min/vs/base/worker/workerMain.js');
      }
    };
    try {
      const vsPath = getExtensionUrl('/monaco-editor/min/vs');
      loader.config({ paths: { vs: vsPath } });
    } catch (err) {
      console.warn('[Monaco loader] 에디터 로드 실패:', err);
    }
  } else {
    // 🌐 Electron / Local Web: 로컬 또는 CDN Monaco 워커 설정
    configureMonacoEnvironment();
  }
}


/**
 * @file 
 * @description 초기 마크다운 텍스트 
 * @note @/app/page.tsx에서 사용되는 초기 마크다운 텍스트 정의  
 *       모나코 에디터의 초기 마크다운 텍스트로 사용됨
 */


// ====================================================================
// 📊 [OMD-FILE-MainEditorApp-0000] MainEditorApp.tsx ➔ parseDateStringToMs
// 🎯 @KICK  : 날짜 문자열(YYYYMMDD 또는 ISO)을 ms 타임스탬프로 안전하게 파싱
// ====================================================================
export const parseDateStringToMs = (str?: string): number => {
  if (!str) return 0;
  if (str === '99991231') return Number.MAX_SAFE_INTEGER;
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.substring(0, 4), 10);
    const m = parseInt(str.substring(4, 6), 10) - 1;
    const d = parseInt(str.substring(6, 8), 10);
    return new Date(y, m, d, 23, 59, 59, 999).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

// 📊 [OMD-FILE-editorFileUtils] 파일 트리 탐색 및 상대 경로 계산 유틸리티 분리 임포트
import { getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath } from '@/utils/editorFileUtils';

// ====================================================================
// 📊 [OMD-CORE-MainEditorApp-0005] MainEditorApp.tsx ➔ MainEditorApp
// 🎯 @KICK  : 컨트롤 타워: 모든 전역 상태, 레이아웃 조립, Monaco 에디터, 미리보기, 사이드바, 메뉴 조정
// 🛡️ @GUARD : TDZ 선언 순서 방어, IME 조합 잠금, 스테일 클로저 Ref 백업, 마운트 시 레이스 컨디션 가드
// 🚨 @PATCH : **2026-07-16** — 분할 화면 모드에서 CSS 테마 배경색이 반영되지 않고 흰색으로 롤백되던 결함 수정 (모든 미리보기 모드에 배경색이 적용되도록 CSS 오버라이드 가드 조치).
//             **2026-07-05** — MainEditorApp에 하드코딩된 UI 껍데기(MenuBar, LeftSidebar 등 6종) Props 의존성을 전면 제거하고 EditorContext로 마이그레이션하여 모듈화 아키텍처 개편; 아래 상세 하위 항목 참조
// 🔗 @CALLS : useToast, useEditorTabs, useFileExplorer, useEditorSettings, useEditorHandlers, getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath, utilsEditorActions, utilsPasteHandlers, getSlashCommands, preprocessMarkdownForPreview, saveSecureData, loadSecureData, idb, getApiUrl
// ====================================================================
export default function MainEditorApp() {                  // @MainEditorApp : MainEditorApp component
  const { showToast } = useToast();             // @showToast : Toast component  
  const {
    isSidebarOpen, setIsSidebarOpen,
    isToolbarOpen, setIsToolbarOpen,
    sidebarWidth, setSidebarWidth,
    sidebarTab, setSidebarTab
  } = useUIStore();
  useEffect(() => {
    setIsSidebarOpen(true);
    setSidebarTab('explorer');
  }, [setIsSidebarOpen, setSidebarTab]);

  // 🛡️ [전역 화면 흔들림 및 윈도우 스크롤바 생성 완전 방어]
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.documentElement.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.width = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.width = '';
    };
  }, []);
  const [mounted, setMounted] = useState(false);  // @mounted : mounted state 
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const emojiTargetRef = useRef<{ tabId: string | null; visual: boolean; selection: any } | null>(null);
  const [content, setContent] = useState('');   // @content : content state 
  // 💡 [React 18 동시성 렌더링] 180ms 지연 타이머 깜빡임을 제거하고 useDeferredValue로 부드러운 무깜빡임 실시간 렌더링
  const previewContent = useDeferredValue(content);

  const contentRef = useRef(content);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0006] MainEditorApp.tsx ➔ contentRef_sync
  // 🎯 @KICK  : 클로저에서 사용하기 위해 contentRef.current를 content 상태와 동기화
  // 🛡️ @GUARD : 스테일 클로저가 ref에서 이전 콘텐츠를 읽는 것을 방지
  // 🚨 @PATCH : 2026-09-27 — 코드블록 전체 행과 왼쪽 표시선에 같은 마스크를 적용해 원문 편집 영역에서도 범위를 구분한다.
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const [previewMode, setPreviewModeRaw] = useState<'edit' | 'both' | 'preview' | 'css-style'>('preview');
  const [directEditEnabled, setDirectEditEnabled] = useState(true);
  const visualFloatingOriginRef = useRef(false);
  const [mediaDialogSource,setMediaDialogSource] = useState<{kind:'video'|'map';source:string}|null>(null);
  const visualMediaInsertRef = useRef<{kind:string;documentId:string;insert:(code:string)=>boolean}|null>(null);
  const visualImageInsertRef = useRef<((path: string, alt: string, fullMarkdown?: string) => boolean) | null>(null);
  const visualCommandRef = useRef<((command: string) => boolean) | null>(null);
  const visualAITargetRef = useRef<any>(null);
  const visualSourceActionRef = useRef<{ id: string; source: string; from: number; to: number; tabId: string } | null>(null);
  const executingVisualSourceActionRef = useRef(false);
  const pendingVisualExportRef = useRef<EditorCommandType | null>(null);
  const [isA4GuardEnabled, setIsA4GuardEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isA4GuardEnabled') === 'true';
    }
    return false;
  });
  const [previewZoomScale, setPreviewZoomScale] = useState<number>(1);
  const [isPreviewFindOpen, setIsPreviewFindOpen] = useState<boolean>(false);
  const [previewFindReplaceMode, setPreviewFindReplaceMode] = useState(false);
  const isPreviewFindOpenRef = useRef(false);
  useEffect(() => { isPreviewFindOpenRef.current = isPreviewFindOpen; }, [isPreviewFindOpen]);
  const previewZoomScaleRef = useRef(1);
  useEffect(() => { previewZoomScaleRef.current = previewZoomScale; }, [previewZoomScale]);
  const previewModeRef = useRef(previewMode);
  // 💡 서식설정(css-style)이나 도움말 진입 전의 일반 마크다운 모드를 격리 보관하여 복원하는 Ref
  const lastGeneralPreviewModeRef = useRef<'edit' | 'both' | 'preview'>('preview');
  const isEditorMountedRef = useRef(false);

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-002.1] 에디터 ↔ 지식 허브 인라인 뷰 전환 상태
  const [activeMainView, setActiveMainView] = useState<'editor' | 'knowledge'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'knowledge') return 'knowledge';
    }
    return 'editor';
  });


  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && (
      !!(window as any).electronAPI ||
      navigator.userAgent.toLowerCase().includes('electron') ||
      new URLSearchParams(window.location.search).get('env') === 'desktop'
    );

    const handleOpenKnowledge = () => {
      if (!isDesktop) {
        showToast("🖥️ 지식 보관함은 데스크톱(Electron) 앱 전용 기능입니다. 데스크톱 앱을 이용해 주세요.", "info");
        return;
      }
      let key = '';
      try {
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) key = JSON.parse(raw).geminiApiKey || '';
      } catch {}
      if (!key) {
        showToast("지식 엔진을 사용하려면 환경설정에서 Gemini API Key를 먼저 등록해 주세요.", "warning");
        window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
        return;
      }
      setActiveMainView('knowledge');
    };
    const handleBackToEditor = () => {
      setActiveMainView('editor');
    };

    window.addEventListener('app:open-knowledge-manager', handleOpenKnowledge);
    window.addEventListener('app:back-to-editor', handleBackToEditor);

    const handleGlobalKnowledgeKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        if (!isDesktop) {
          showToast("🖥️ 지식 보관함은 데스크톱(Electron) 앱 전용 기능입니다. 데스크톱 앱을 이용해 주세요.", "info");
          return;
        }
        setActiveMainView(prev => {
          if (prev === 'knowledge') return 'editor';
          let key = '';
          try {
            const raw = localStorage.getItem('onrivi_settings');
            if (raw) key = JSON.parse(raw).geminiApiKey || '';
          } catch {}
          if (!key) {
            showToast("지식 엔진을 사용하려면 환경설정에서 Gemini API Key를 먼저 등록해 주세요.", "warning");
            window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
            return 'editor';
          }
          return 'knowledge';
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKnowledgeKeyDown, true);

    return () => {
      window.removeEventListener('app:open-knowledge-manager', handleOpenKnowledge);
      window.removeEventListener('app:back-to-editor', handleBackToEditor);
      window.removeEventListener('keydown', handleGlobalKnowledgeKeyDown, true);
    };
  }, [showToast]);

  // ====================================================================
  // 📊 [OMD-CORE-0003 TDZ-GUARD] MainEditorApp.tsx ➔ 훅 호출 전 선행 상태 선언 블록
  // 🎯 @KICK  : useEditorSettings/useEditorTabs 훅 호출 이전에 반환값을 참조하는
  //             하위 코드(useEffect 등)를 위해 모든 관련 상태를 const로 선행 선언
  // 🛡️ @GUARD : Webpack 번들러가 let 변수를 단일 글자(rS, r0 등)로 난독화 시 TDZ 에러 유발 → const로 즉시 초기화
  // 🚨 @PATCH : _init 더미 변수 패턴 도입 (useEditorSettings 분리 리팩토링) | 이전 버전
  //           | tabs/setTabs/activeTabId/setActiveTabId를 실제 이름으로 선행 선언, useEditorTabs 외부 주입 전환 | 2026-06-15 | rS TDZ 에러(tabMetadata_sync L526) 해결
  // 🔗 @CALLS : useState (React)
  // ====================================================================
  // 💡 [TDZ 방어] 모든 상태를 즉시 const로 선언하여 Webpack 번들러의 TDZ 최적화 오류 방지
  // 이후 useEditorSettings 훅 호출 시 해당 훅의 반환값으로 구조분해 재선언하지 않고,
  // 컴포넌트 내에서 useEditorSettingsResult.xxx 형태로 직접 접근합니다.
  const [_isDarkMode_init, _setIsDarkMode_init] = useState(false);
  const [_fontSize_init, _setFontSize_init] = useState<number>(14);
  const [_wordWrap_init, _setWordWrap_init] = useState<'on' | 'off'>('on');
  const [_autoSave_init, _setAutoSave_init] = useState(true);
  const [_quoteStyle_init, _setQuoteStyle_init] = useState<'modern' | 'clean' | 'none'>('modern');
  const [_themePalette_init, _setThemePalette_init] = useState<string>('onrivi-light');
  const [_licenseKey_init, _setLicenseKey_init] = useState<string>('');
  const [_customHotkeys_init, _setCustomHotkeys_init] = useState<Record<string, string>>({});
  const [_customSlashCommands_init, _setCustomSlashCommands_init] = useState<Record<string, string>>({});
  const _customSlashCommandsRef_init = useRef<Record<string, string>>({});
  const _handleThemeChange_init = () => { };

  // 💡 [Step 1 리팩토링 완료] 라이선스 및 권한 관리를 별도 Hook으로 완전히 분리!
  const {
    deviceId, setDeviceId,
    licenseStatus, setLicenseStatus,
    isLicenseChecking, setIsLicenseChecking
  } = useEditorAuth();

  // 💡 [에디터 지원 유효 요금제 판별] 에디터 편집 권한이 존재하는 정품/체험 요금제인지 판별 (만료, READER, 미인증, 제한사용자 제외)
  const isEditorPlan = useMemo(() => {
    if (isLicenseChecking) return false;
    if (licenseStatus.isExpired) return false;
    const plan = (licenseStatus.planName || '').toUpperCase();
    if (plan.includes('READER') || plan.includes('제한사용자') || plan.includes('미인증') || plan.includes('만료') || plan === 'READER') {
      return false;
    }
    return licenseStatus.isActivated;
  }, [isLicenseChecking, licenseStatus.isExpired, licenseStatus.planName, licenseStatus.isActivated]);

  // 🛡️ 동일 브라우저 내 에디터 다중 인스턴스/탭 중복 실행 감지 및 방어 락 (에디터 편집 지원 요금제일 때만 락 가동)
  const { isDuplicateInstance, takeOverControl } = useSingleTabGuard(isEditorPlan);

  // 🛡️ 동일 브라우저 다중 탭 실행 시 비활성 탭의 권한을 '제한사용자(읽기 전용)'로 안전하게 격리 투영
  const effectiveLicenseStatus = useMemo(() => {
    if (isDuplicateInstance && isEditorPlan) {
      return {
        ...licenseStatus,
        isRestricted: true,
        isActivated: false,
        planName: licenseStatus.planName ? `${licenseStatus.planName} (제한사용자)` : '제한사용자',
      };
    }
    return licenseStatus;
  }, [isDuplicateInstance, isEditorPlan, licenseStatus]);

  // 💡 [권한 기반 제한사용자 판별 플래그] 다중 탭 중복 실행, 기간 만료, 동시 접속 초과, 혹은 미인증/제한 플랜 사용 여부를 판별
  const isRestrictedUser = useMemo(() => {
    return isLicenseChecking || !effectiveLicenseStatus.isActivated ||
      (isDuplicateInstance && isEditorPlan) ||
      effectiveLicenseStatus.isConcurrentLimited ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자') ||
      effectiveLicenseStatus.planName?.includes('동시 접속 초과');
  }, [isLicenseChecking, isDuplicateInstance, isEditorPlan, effectiveLicenseStatus.isActivated, effectiveLicenseStatus.isConcurrentLimited, effectiveLicenseStatus.isExpired, effectiveLicenseStatus.isRestricted, effectiveLicenseStatus.planName]);

  // 💡 [사용자 별명(활동명) 상태] AI 버튼 표기용 ({별명} AI, 예: '탕수육 AI')
  const [userNickname, setUserNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('onrivi_user_nickname') ||
        localStorage.getItem('onrivi_nick_name') ||
        localStorage.getItem('onrivi_signup_nick_name') ||
        localStorage.getItem('onrivi_user_name') ||
        ''
      ).trim();
    }
    return '';
  });

  useEffect(() => {
    let isMounted = true;
    const fetchUserNickname = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // 1차: session user_metadata에서 별명/활동명 추출
          const metaNick = (
            session.user.user_metadata?.nick_name ||
            session.user.user_metadata?.nickname ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            ''
          ).trim();

          if (metaNick && isMounted) {
            setUserNickname(metaNick);
            localStorage.setItem('onrivi_user_nickname', metaNick);
          }

          // 2차: 서버 API(/api/user/check)를 통해 nick_name 조회
          if (session.user.id) {
            try {
              const checkRes = await fetch('/api/user/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_id: session.user.id, p_email: session.user.email })
              });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                const cleanNick = checkData?.user?.nick_name?.trim();
                if (cleanNick && isMounted) {
                  setUserNickname(cleanNick);
                  localStorage.setItem('onrivi_user_nickname', cleanNick);
                }
              }
            } catch (err) {
              console.warn('[nickname] user check failed:', err);
            }
          }
        }
      } catch (err) {
        console.warn('사용자 별명 조회 중 경미한 예외:', err);
      }
    };

    fetchUserNickname();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🌟 [별명 실시간 동기화 리스너] 환경설정 모달 등에서 별명이 변경되었을 때 즉시 에디터 리렌더링
  useEffect(() => {
    const handleNickChange = (e: any) => {
      if (typeof e.detail === 'string') {
        setUserNickname(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:nickname_changed', handleNickChange);
      return () => window.removeEventListener('onrivi:nickname_changed', handleNickChange);
    }
  }, []);

  // 💡 [에디터 하단 AI 버튼 가시성 상태] 상태바 및 로컬스토리지 연동
  const [isAiButtonVisible, setIsAiButtonVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onrivi_show_editor_ai_btn') !== 'false';
    }
    return true;
  });

  // 💡 [에디터 하단 AI 모델 드롭다운 상태 및 외부 클릭 감지]
  const [isBottomAiDropdownOpen, setIsBottomAiDropdownOpen] = useState<boolean>(false);
  const bottomAiDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBottomAiDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomAiDropdownRef.current && !bottomAiDropdownRef.current.contains(e.target as Node)) {
        setIsBottomAiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBottomAiDropdownOpen]);

  // 💡 [Step 2 리팩토링 완료] 수십 개에 달하던 모달/팝업 상태를 단 하나의 Hook으로 완전히 분리!
  const {
    isSettingsModalOpen, setIsSettingsModalOpen,
    settingsModalInitialTab, setSettingsModalInitialTab,
    isStyleModalOpen, setIsStyleModalOpen,
    isExportModalOpen, setIsExportModalOpen,
    isImageModalOpen, setIsImageModalOpen,
    editingImageInfo, setEditingImageInfo,
    isMapModalOpen, setIsMapModalOpen,
    isTableModalOpen, setIsTableModalOpen,
    isMergeModalOpen, setIsMergeModalOpen,
    isYoutubeModalOpen, setIsYoutubeModalOpen,
    youtubeInitialUrl, setYoutubeInitialUrl,
    isLicenseModalOpen, setIsLicenseModalOpen,
    isFormulaModalOpen, setIsFormulaModalOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    isReferenceModalOpen, setIsReferenceModalOpen,
    isCitationModalOpen, setIsCitationModalOpen,
    promptConfig, setPromptConfig,
    confirmConfig, setConfirmConfig
  } = useEditorModals();

  // 🌟 [전체사용자 공통 리소스 폴더 필수 안내 모달 상태]
  const [isResourceGuideModalOpen, setIsResourceGuideModalOpen] = useState(false);
  const [isNewDocumentModalOpen, setIsNewDocumentModalOpen] = useState(false);
  const [isDismissedGuide, setIsDismissedGuide] = useState(false);

  // ====================================================================
  // 📊 [OMD-EDIT-0004 TDZ-GUARD] MainEditorApp.tsx ➔ tabs/activeTabId 선행 선언
  // 🎯 @KICK  : tabMetadata_sync(L526)가 useEditorTabs 훅 호출(L935) 이전에 setTabs/activeTabId를
  //             참조하므로, Webpack TDZ 에러 방지를 위해 실제 이름으로 최상단 선행 선언
  // 🛡️ @GUARD : useEditorTabs 내부에서 useState를 갖지 않고 이 상태를 주입받아 사용
  // 🚨 @PATCH : _tabs_init/_activeTabId_init 더미 이름 → tabs/activeTabId 실제 이름으로 변경 | 2026-06-15 | rS TDZ(tabMetadata_sync) 해결
  // 🔗 @CALLS : useState (React)
  // ====================================================================
  // 💡 [초기화 순서 방어] useEditorTabs 반환 바인딩 전 하위 함수들이 참조하는 탭 관리 상태의 선행 선언
  const [tabs, setTabs] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<any[]>([]);
  const activeTabIdRef = useRef<string | null>(null);

  // ⏳ [게스트 즉시 체험판 시간 및 횟수 제한(Paywall) 상태]
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('onrivi_guest_mode') === 'Y';
  });
  const [guestRemainingSeconds, setGuestRemainingSeconds] = useState<number>(300); // 5분 (300초)
  const [isGuestExpired, setIsGuestExpired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const tryCount = parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10);
    return localStorage.getItem('onrivi_guest_expired') === 'Y' || tryCount > 5;
  });

  // ⏳ [게스트 즉시 체험판 인터랙티브 플로팅 가이드 상태]
  const [guideStep, setGuideStep] = useState<number>(1);
  const [isGuideMinimized, setIsGuideMinimized] = useState<boolean>(false);
  const guestCountedRef = useRef<boolean>(false);

  // ⏳ [게스트 타이머 구동 및 재접속 제한 이펙트]
  useEffect(() => {
    if (!isGuestMode) return;
    
    const tryCount = parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10);

    // 1. 이미 만료 낙인이 찍혔거나 재접속 횟수를 초과한 게스트인 경우
    if (isGuestExpired || tryCount > 5) {
      setIsGuestExpired(true);
      localStorage.setItem('onrivi_guest_expired', 'Y');
      setLicenseStatus({
        isActivated: false,
        isExpired: true,
        remainingDays: 0,
        userId: 'GUEST_USER',
        licenseKey: '',
        paymentNo: '',
        planName: '체험판 재접속 횟수 초과',
        nextPaymentDate: ''
      });
      return;
    }

    // 2. 신규 진입 세션에 대해 접속 횟수 카운터 증가 (Strict Mode 중복 연산 방지 가드)
    let newCount = tryCount;
    if (!guestCountedRef.current) {
      guestCountedRef.current = true;
      newCount = tryCount + 1;
      localStorage.setItem('onrivi_guest_try_count', newCount.toString());
    }

    // 3. 증가된 카운트가 제한(5회)을 초과한 경우
    if (newCount > 5) {
      setIsGuestExpired(true);
      localStorage.setItem('onrivi_guest_expired', 'Y');
      setLicenseStatus({
        isActivated: false,
        isExpired: true,
        remainingDays: 0,
        userId: 'GUEST_USER',
        licenseKey: '',
        paymentNo: '',
        planName: '체험판 재접속 횟수 초과',
        nextPaymentDate: ''
      });
      return;
    }

    // 4. 타이머를 5분(300초)으로 매 접속마다 독립적으로 새로 기동
    setGuestRemainingSeconds(300);
    const interval = setInterval(() => {
      setGuestRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGuestExpired(true);
          // 5분 만료 시점에 접속 카운트가 5회 이상이었다면 완전히 영구 낙인 찍기
          if (newCount >= 5) {
            localStorage.setItem('onrivi_guest_expired', 'Y');
          }
          setLicenseStatus({
            isActivated: false,
            isExpired: true,
            remainingDays: 0,
            userId: 'GUEST_USER',
            licenseKey: '',
            paymentNo: '',
            planName: '체험판 시간 만료',
            nextPaymentDate: ''
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGuestMode, isGuestExpired, setLicenseStatus]);

  // 💾 [탭 순서 영구 보존 이펙트] localStorage에 기록된 순서가 있다면 tabs 배열의 순서를 복원
  useEffect(() => {
    if (tabs.length === 0) return;
    try {
      const savedOrder = localStorage.getItem('onrivi_tabs_order');
      if (savedOrder) {
        const order: string[] = JSON.parse(savedOrder);
        // 저장된 순서 리스트대로 정렬하며, 순서 목록에 없는 탭은 원래 순서대로 뒤에 보존
        const sorted = [...tabs].sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });

        const isSame = tabs.length === sorted.length && tabs.every((t, i) => t.id === sorted[i].id);
        if (!isSame) {
          setTabs(sorted);
        }
      }
    } catch (e) {
      // Safe guard
    }
  }, [tabs]);

  // 💡 미리보기 업데이트 지연 디바운스 타이머 Ref (타이핑 시 번쩍거림/깜빡거림 방쇄)
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // 💡 [IME 락 가드] 한글 IME 조합 진행 여부를 저장하는 Ref
  const isComposingRef = useRef(false);



  // 💡 [SYNC-03 / 요구사항 3] 양방향 스크롤 관성 튕김 루프 원천 차단을 위해 호버 감지 Ref 도입
  const isEditorHovered = useRef(false);
  const isPreviewHovered = useRef(false);



  const [activeLine, setActiveLine] = useState<number | null>(null); // @activeLine : active line state 
  const lastSelectionRef = useRef<any>(null);    // @lastSelectionRef : last selection state 
  // 💡 [Step 2 리팩토링으로 서식 프로필(profiles, activeProfileId, isProfilesLoaded)은 useEditorProfiles로 이관됨]
  const [isAddonEnv, setIsAddonEnv] = useState(false);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [helpTitle, setHelpTitle] = useState('');
  const helpContentRef = useRef(helpContent);
  helpContentRef.current = helpContent;

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0008] MainEditorApp.tsx ➔ previewModeRef_sync
  // 🎯 @KICK  : previewModeRef.current를 previewMode 상태와 동기화
  // 🛡️ @GUARD : 이벤트 핸들러 및 비동기 콜백에서 스테일 ref 방지
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);



  const [rootFolder, setRootFolder] = useState<{ name: string, handle?: any } | null>(null);
  const [resourceFolder, setResourceFolder] = useState<string | null>(() => {
    const effective = getEffectiveResourceFolder();
    return (effective && typeof effective === 'string' && effective.trim() !== '') ? effective.trim() : null;
  });
  const [resourceFolderHandle, setResourceFolderHandle] = useState<any>(() => {
    if (typeof window !== 'undefined' && (window as any).__resourceFolderHandle) {
      return (window as any).__resourceFolderHandle;
    }
    return null;
  });

  // 🌟 [공통 리소스 폴더 Handle 및 경로 자동 복원 엔진]
  useEffect(() => {
    if (!mounted) return;
    const restoreRF = async () => {
      if (!getResourceSettings()) {setResourceFolder(null);return;}
      // 1. IndexedDB에서 웹 브라우저용 Handle 복원
      if (!resourceFolderHandle && getResourceSettings()?.kind === 'browser' && typeof window !== 'undefined') {
        try {
          const savedHandle = await idb.get('localResourceFolderHandle') || await idb.get('resourceFolderHandle');
          if (savedHandle && savedHandle.name === getResourceSettings()?.path) {
            setResourceFolderHandle(savedHandle);
            (window as any).__resourceFolderHandle = savedHandle;
            if (!resourceFolder) {
              setResourceFolder(savedHandle.name);
            }
          }
        } catch (e) {
          console.warn('[ResourceFolder] IndexedDB handle 복원 실패:', e);
        }
      }
      // 2. localStorage 및 secureStorage 기반 경로 복원 동기화
      const effective = getEffectiveResourceFolder();
      if (effective && (!resourceFolder || resourceFolder !== effective)) {
        setResourceFolder(effective);
      }
    };
    void restoreRF();
  }, [mounted, resourceFolderHandle, resourceFolder]);

  // 💡 [Step 2 리팩토링으로 구글 드라이브 토큰 갱신 시 서식 로드 실시간 연동은 useEditorProfiles로 이관됨]

  const [workspaceType, setWorkspaceType] = useState<'local' | 'cloud' | 'browser'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workspaceType') || localStorage.getItem('onrivi_last_workspace_mode');
      if (saved === 'cloud' || saved === 'gdrive') return 'cloud';
      if (!(window as any).electronAPI) {
        return 'browser';
      }
    }
    return 'local';
  });

  // Share only the active folder locations with the local MCP process.
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!mounted || !api?.syncMcpContext) return;
    const sync = () => {
      const settings = getResourceSettings(workspaceType === 'cloud' ? 'cloud' : 'local');
      void api.syncMcpContext({
        workspaceType,
        workspacePath: workspaceType === 'local' ? ((rootFolder as any)?.path || rootFolder?.name || null) : null,
        resourceKind: settings?.kind || 'unset',
        resourcePath: settings?.kind === 'local' ? settings.path : null,
      }).catch((error: unknown) => console.warn('[MCP context] sync failed', error));
    };
    sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('onrivi:resource_folder_changed', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('onrivi:resource_folder_changed', sync);
    };
  }, [mounted, workspaceType, rootFolder, resourceFolder]);

  // 💡 [Step 2 리팩토링으로 profileStorageRevision 및 서식 로드/리로드 이펙트는 useEditorProfiles로 이관됨]

  const [fileList, setFileList] = useState<FileNode[]>([]);
  useEffect(() => {
    const openResourceSettings = () => {setIsImageModalOpen(false);setIsYoutubeModalOpen(false);setIsStyleModalOpen(false);setIsReferenceModalOpen(false);setSettingsModalInitialTab('general');setIsSettingsModalOpen(true);};
    window.addEventListener('onrivi:resource-settings', openResourceSettings);
    return () => window.removeEventListener('onrivi:resource-settings', openResourceSettings);
  }, [setIsSettingsModalOpen,setIsImageModalOpen,setIsYoutubeModalOpen,setIsStyleModalOpen,setIsReferenceModalOpen,setSettingsModalInitialTab]);
  const [currentFileName, setCurrentFileName] = useState<string>('새 파일.md');
  const [currentFileNode, setCurrentFileNode] = useState<FileNode | null>(null);
  const [bibContent, setBibContent] = useState<string>('');

  // 💡 [Step 2 리팩토링으로 promptConfig 삭제됨 (useEditorModals로 이관)]


  const sessionRestoringRef = useRef<boolean>(false); // 세션 복원 진행 중 스킵 락
  const [driveLetter, setDriveLetter] = useState('D:');
  const [webBasePath, setWebBasePath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onrivi_web_base_path') || '';
    }
    return '';
  });


  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012] MainEditorApp.tsx ➔ tabMetadata_sync
  // 🎯 @KICK  : 현재 파일 정보가 변경될 때 탭 메타데이터(fileName, path, node) 동기화
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : 2026-08-05 — 앱 시작 시 리소스 폴더 미지정 안내 메시지 표시 로직 추가 (hasShownResourceWarningRef)
  // 🔗 @CALLS : setTabs
  // ====================================================================
  // 🌟 [전체사용자 공통 리소스 폴더 미설정 시 초기 안내 모달 트리거]
  useEffect(() => {
    if (!mounted) return;
    const isMissing = !getResourceSettings()?.path && !resourceFolder && !resourceFolderHandle;
    if (!isMissing) {
      setIsResourceGuideModalOpen(false);
      return;
    }
    const isFullUser = !isDuplicateInstance && !isRestrictedUser && licenseStatus.isActivated && !licenseStatus?.isExpired;

    if (isMissing && isFullUser && !isDismissedGuide) {
      const timer = setTimeout(() => {
        if (!getResourceSettings()?.path) setIsResourceGuideModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, resourceFolder, resourceFolderHandle, licenseStatus.isActivated, licenseStatus?.isExpired, isDuplicateInstance, isRestrictedUser, isDismissedGuide]);

  // ☁️ [구글 드라이브 무중단 토큰 자동 갱신 엔진 가동]
  useEffect(() => {
    if (!mounted) return;
    initDriveTokenAutoRefresh();
  }, [mounted]);

  // ====================================================================
  useEffect(() => {
    if (activeTabId) {
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? {
            ...t,
            name: t.path || t.model ? currentFileName : t.name,
            path: currentFileNode?.path || null,
            node: currentFileNode
          }
          : t
      ));
    }
  }, [currentFileName, currentFileNode, activeTabId]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012b] MainEditorApp.tsx ➔ file:tab-renamed listener
  // 🎯 @KICK  : 탐색기에서 파일/폴더 이름 변경 시 새 탭을 열지 않고 기존 탭 메타데이터만 갱신
  // 🛡️ @GUARD : oldPath가 현재 열린 탭과 일치하거나 하위 경로에 포함될 때만 동작
  // 🚨 @PATCH : **2026-09-18** — [폴더명 변경 시 열린 탭 경로·브레드크럼 동기화 및 탭 순서/활성 노드 일괄 갱신]
  // 🔗 @CALLS : setCurrentFileName, setCurrentFileNode, setTabs, setActiveTabId
  // ====================================================================
  useEffect(() => {
    const handler = (e: Event) => {
      const { oldPath, newPath, newName, newHandle } = (e as CustomEvent).detail;
      if (!oldPath || !newPath) return;

      const cleanOld = oldPath.replace(/[/\\]+$/, '');
      const cleanNew = newPath.replace(/[/\\]+$/, '');
      const normOld = cleanOld.replace(/\\/g, '/');
      const normNew = cleanNew.replace(/\\/g, '/');
      const normOldLower = normOld.toLowerCase();

      // 현재 열린 파일이 변경/이동된 파일이거나 변경된 폴더 하위에 있을 때
      setTabs(prev => {
        const updatedTabs = prev.map(t => {
          const rawPath = t.path || '';
          const cleanTabPath = rawPath.replace(/[/\\]+$/, '');
          const tabPath = cleanTabPath.replace(/\\/g, '/');
          const tabPathLower = tabPath.toLowerCase();

          if (tabPathLower === normOldLower) {
            // 정확히 이름 변경/이동된 파일
            const targetId = (t.id === t.path || t.id === oldPath || t.id.replace(/\\/g, '/').toLowerCase() === normOldLower) ? cleanNew : t.id;
            return {
              ...t,
              id: targetId,
              name: newName,
              path: cleanNew,
              node: { ...t.node, name: newName, path: cleanNew, ...(newHandle ? { handle: newHandle } : {}) }
            };
          } else if (tabPathLower.startsWith(normOldLower + '/')) {
            // 이름 변경/이동된 폴더의 하위 파일
            const subRel = tabPath.substring(normOld.length);
            const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && rawPath.includes('\\'));
            const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
            const updatedPath = `${cleanNew}${subRelFormatted}`;
            const targetId = (t.id === t.path || t.id.replace(/\\/g, '/').toLowerCase() === tabPathLower) ? updatedPath : t.id;
            return {
              ...t,
              id: targetId,
              path: updatedPath,
              node: { ...t.node, path: updatedPath }
            };
          }
          return t;
        });

        // 💡 tabsRef 및 로컬스토리지 onrivi_tabs_order 동기화
        tabsRef.current = updatedTabs;
        try {
          const tabOrders = updatedTabs.map(t => ({ id: t.id, name: t.name, path: t.path }));
          localStorage.setItem('onrivi_tabs_order', JSON.stringify(tabOrders));
        } catch (_) {}

        return updatedTabs;
      });

      // 활성 탭 식별자(activeTabId)도 함께 갱신
      const curActive = activeTabIdRef.current || '';
      if (curActive) {
        const cleanActive = curActive.replace(/[/\\]+$/, '');
        const normActive = cleanActive.replace(/\\/g, '/');
        const normActiveLower = normActive.toLowerCase();

        if (normActiveLower === normOldLower || cleanActive === cleanOld) {
          setActiveTabId(cleanNew);
          activeTabIdRef.current = cleanNew;
        } else if (normActiveLower.startsWith(normOldLower + '/')) {
          const subRel = normActive.substring(normOld.length);
          const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && curActive.includes('\\'));
          const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
          const updatedActive = `${cleanNew}${subRelFormatted}`;
          setActiveTabId(updatedActive);
          activeTabIdRef.current = updatedActive;
        }
      }

      // 현재 활성 파일(currentFileNode) 및 파일명 동시 갱신
      setCurrentFileNode(prev => {
        if (!prev) return prev;
        const curPath = (prev.path || '').replace(/[/\\]+$/, '');
        const normCur = curPath.replace(/\\/g, '/');
        const normCurLower = normCur.toLowerCase();

        if (normCurLower === normOldLower) {
          setCurrentFileName(newName);
          return { ...prev, name: newName, path: cleanNew, ...(newHandle ? { handle: newHandle } : {}) };
        } else if (normCurLower.startsWith(normOldLower + '/')) {
          const subRel = normCur.substring(normOld.length);
          const isBackslash = cleanNew.includes('\\') || (!cleanNew.includes('/') && curPath.includes('\\'));
          const subRelFormatted = isBackslash ? subRel.replace(/\//g, '\\') : subRel;
          const updatedPath = `${cleanNew}${subRelFormatted}`;
          return { ...prev, path: updatedPath };
        }
        return prev;
      });
    };
    window.addEventListener('file:tab-renamed', handler);
    return () => window.removeEventListener('file:tab-renamed', handler);
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIDraftModalOpen, setIsAIDraftModalOpen] = useState(false);
  const [aiDraftInitialMode, setAiDraftInitialMode] = useState<'draft' | 'editorial' | 'knowledge'>('draft');
  const [aiEditorContext, setAiEditorContext] = useState<{ selectedText: string; fullText: string }>({ selectedText: '', fullText: '' });

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0013] MainEditorApp.tsx ➔ searchOpen_sidebar_behavior
  // 🎯 @KICK  : 글로벌 검색이 열릴 때 사이드바 열기 및 검색 탭으로 전환
  // 🛡️ @GUARD : 검색이 닫힐 때 (여전히 검색 탭인 경우) 사이드바 탭을 TOC로 재설정
  // 🚨 @PATCH : None
  // 🔗 @CALLS : setIsSidebarOpen, setSidebarTab
  // ====================================================================
  useEffect(() => {
    if (isSearchOpen) {
      setIsSidebarOpen(true);
      setSidebarTab('search');
    } else if (sidebarTab === 'search') {
      setSidebarTab('toc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchOpen]);

  // 💡 [Step 2 리팩토링으로 각종 모달 상태들 삭제됨 (useEditorModals로 이관)]
  const youtubeEditRangeRef = useRef<any>(null);
  const visualFormulaInsertRef = useRef<((formula: string) => boolean | void) | null>(null);
  const [formulaModalInitialLatex, setFormulaModalInitialLatex] = useState<string>('');

  // 💡 [Step 2 리팩토링으로 문서 링크(DocLinkPicker) 상태 및 파일 로드 로직은 useEditorDocLinks로 이관됨]

  // 💡 [Step 2 리팩토링으로 세팅 및 스타일 모달 상태 삭제됨 (useEditorModals로 이관)]

  // ====================================================================
  // 📊 [OMD-AUTH-MainEditorApp-0015] MainEditorApp.tsx ➔ initDeviceId
  // 🎯 @KICK  : electronAPI, chrome.storage 또는 localStorage 폴백에서 고유 장치 ID 초기화
  // 🛡️ @GUARD : 순서가 다른 환경 처리; 존재하지 않으면 crypto-random UUID 생성
  // 🚨 @PATCH : 2026-06-28 — 크롬 스토리지 동기화 완전 제거 및 로컬스토리지 격리로 세션 기반 접속 관리 전환
  // 🔗 @CALLS : api.getMachineId, crypto.randomUUID, localStorage.getItem/setItem, setDeviceId
  // ====================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initDeviceId = async () => {
      const api = (window as any).electronAPI;
      if (api && typeof api.getMachineId === 'function') {
        // A. 데스크탑 Electron 실기기 ID 수집
        const realId = await api.getMachineId();
        setDeviceId(realId);
      } else {
        // B. 일반 웹 브라우저 (스토리지 동기화 완전 제거 및 로컬스토리지 격리)
        let localId = localStorage.getItem('onrivi_device_id');
        if (!localId) {
          localId = crypto.randomUUID();
          localStorage.setItem('onrivi_device_id', localId);
        }
        setDeviceId(localId);
      }
    };
    initDeviceId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====================================================================
  // 📊 [OMD-AUTH-MainEditorApp-0016] MainEditorApp.tsx ➔ loadAndVerifyLicense (payment_no)
  // 🎯 @KICK  : 저장소에서 라이선스 키 로드, Supabase DB로 검증; payment_no 없는 경우 user_id fallback
  // 🛡️ @GUARD : 암호화 캐시를 통한 오프라인 유예 기간(3일), 시간 조작 방어; 웹 SaaS는 count 조회만 (upsert/장비 체크 없음)
  // 🚨 @PATCH : 2026-06-28 — 확장프로그램(chrome.storage.local) 스토리지 읽기 로직 제거 (로컬스토리지 격리);
  //              2026-06-23 — payment_no 미존재 시의 subscriptions 폴백 쿼리에 다중구독 cardinality violation 방지용 활성 구독 필터(is_expired/plan_end_date/plan_status 등) 추가 개편;
  //              2026-06-22 — payment_no 미존재 시 supabase Auth 세션 → subscriptions → software_licenses fallback;
  //              웹 SaaS: count 조회만 수행, upsert/device UUID 완전 제거 (auth callback에서 insert 담당)
  // 🔗 @CALLS : api.loadLicenseFull, fetch(/api/license/activate, /api/license/check-session), crypto.subtle.digest, saveSecureData, loadSecureData, setLicenseStatus, setLicenseKey

  // 📊 [OMD-CITATION-MainEditorApp] .bib 워크스페이스 자동 로드
  // 🎯 @KICK  : 워크스페이스 전체를 재귀 탐색하여 .bib 파일을 모두 병합 로드
  // 🚨 @PATCH : **2026-07-07** — allMdFiles 의존성 완전 제거.
  //              Electron IPC(listDirectory) 직접 재귀 스캔 + fileList 트리 병렭 탐색.
  //              웹 환경: bib.handle → VFS → getApiUrl REST API 순서로 폴백 처리.
  // 🔗 @CALLS : electronAPI.listDirectory, electronAPI.readFromPath, vfsReadFile, getApiUrl
  useEffect(()=>{
    let disposed=false;
    const load=async()=>{try{const files=await loadBibliographyFiles(resourceFolderHandle);if(!disposed)setBibContent(files.map(f=>f.content).join('\n'));}
      catch(e){if(!disposed){setBibContent('');console.warn('[Bibliography]',e);}}};
    void load();window.addEventListener('onrivi:bibliography-updated',load);
    return()=>{disposed=true;window.removeEventListener('onrivi:bibliography-updated',load);};
  },[workspaceType,resourceFolder,resourceFolderHandle]);

  // 💡 [Step 2 리팩토링으로 내보내기, 어바웃, 컴펌 등 기타 모달 상태 싹 다 삭제됨 (useEditorModals로 이관)]

  const [isEditorReady, setIsEditorReady] = useState(false);

  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedMergeNodes, setSelectedMergeNodes] = useState<FileNode[]>([]);
  // 💡 [Step 2 리팩토링으로 isMergeModalOpen 삭제됨]
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | ''>('');
  const [floatingHeadingLevel, setFloatingHeadingLevel] = useState(3);
  const [floatingQuoteDropdown, setFloatingQuoteDropdown] = useState<{ open: boolean; x: number; y: number; dropUp: boolean }>({ open: false, x: 0, y: 0, dropUp: false });
  const [dateTimeFormatDropdown, setDateTimeFormatDropdown] = useState<{ open: boolean; x: number; y: number; dropUp: boolean }>({ open: false, x: 0, y: 0, dropUp: false });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isMonacoDatePickerOpen, setIsMonacoDatePickerOpen] = useState(false);
  const [monacoDatePickerPos, setMonacoDatePickerPos] = useState({ top: 0, left: 0 });
  const [customDateTimeFormat, setCustomDateTimeFormat] = useState('YYYY-MM-DD HH:mm:ss');

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0019] MainEditorApp.tsx ➔ toggleMergeNodeSelect
  // 🎯 @KICK  : 병합 선택 목록에서 FileNode 추가/제거 토글
  // 🛡️ @GUARD : 중복 추가 방지를 위해 경로 또는 이름으로 중복 제거
  // 🚨 @PATCH : None
  // 🔗 @CALLS : setSelectedMergeNodes
  // ====================================================================
  const toggleMergeNodeSelect = (node: FileNode) => {
    setSelectedMergeNodes(prev => {
      const exists = prev.some(n => n.path ? n.path === node.path : n.name === node.name);
      if (exists) {
        return prev.filter(n => n.path ? n.path !== node.path : n.name !== node.name);
      } else {
        return [...prev, node];
      }
    });
  };

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0020] MainEditorApp.tsx ➔ handleOpenMergeModal
  // 🎯 @KICK  : 2개 이상의 파일이 선택된 경우에만 병합 모달 열기
  // 🛡️ @GUARD : 모달 열기 전 최소 선택 개수(2) 검증
  // 🚨 @PATCH : None
  // 🔗 @CALLS : showToast, setIsMergeModalOpen
  // ====================================================================
  const handleOpenMergeModal = () => {
    if (selectedMergeNodes.length < 2) {
      showToast("병합하려면 최소 2개 이상의 파일을 선택해야 합니다.", 'warning');
      return;
    }
    setIsMergeModalOpen(true);
  };





  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  // 💡 다중 탭 관련 상태 선언 및 백업 레퍼런스
  const useEditorTabsResult = useEditorTabs(
    editorRef,
    setContent,
    setCurrentFileName,
    setCurrentFileNode,
    isEditorMountedRef,
    previewModeRef,
    previewDebounceRef,
    isComposingRef,
    workspaceType,
    showToast,
    getRelativePath,
    tabs,        // 💡 [TDZ 방어] 최상단에서 선언된 상태를 주입
    setTabs,
    activeTabId,
    setActiveTabId,
    setPreviewModeRaw
  );

  // 💡 [TDZ 방어] useEditorTabs 반환값 중 상단에서 선언되지 않은 것들만 추가 추출
  const updateContent = useEditorTabsResult.updateContent;
  const switchTab = useEditorTabsResult.switchTab;
  const createNewTab = useEditorTabsResult.createNewTab;

  // Ref를 공유 tabsRef/activeTabIdRef에 동기화 (React state 직접 사용 — useEffect로 업데이트된 useEditorTabs ref는 stale할 수 있음)
  // 🚨 @PATCH : useEditorTabsResult.ref → React state 직접 참조로 변경 (stale ref가 closeTab에서 삭제된 탭을 복원하는 버그 수정) | 2026-06-18
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  // 💡 [OMD-HOOK-useEditorProfiles] 서식 프로필 및 프론트매터 동기화 전담 훅
  const {
    profiles,
    setProfiles,
    activeProfileId,
    setActiveProfileId,
    isProfilesLoaded,
    setIsProfilesLoaded,
    profileStorageRevision,
    setProfileStorageRevision,
    resolveEffectiveDocumentProfile,
    handleProfileChange,
  } = useEditorProfiles({
    mounted,
    content,
    contentRef,
    editorRef,
    isEditorMountedRef,
    resourceFolder,
    setResourceFolder,
    resourceFolderHandle,
    workspaceType,
    setWorkspaceType,
    rootFolder,
    setRootFolder,
    previewMode,
    previewModeRef,
    isStyleModalOpen,
    activeTabId,
    activeTabIdRef,
    tabs,
    setTabs,
    updateContent,
    showToast,
    isRestrictedUser,
    currentFileName,
    directEditEnabled,
    isComposingRef,
  });

  // ====================================================================
  // 📊 [OMD-EDIT-0012 TDZ-GUARD] MainEditorApp.tsx ➔ autoSaveRef/lastSavedContentRef 선행 선언
  // 🎯 @KICK  : autoSaveRef는 L1117 useEffect에서 먼저 참조되고, lastSavedContentRef는
  //             useFileExplorer 인자로 먼저 참조되므로 훅 호출 이전에 선행 선언
  // 🛡️ @GUARD : 기존 L1289 위치에 있던 선언을 사용 지점 이전으로 이동하여 TDZ 제거
  // 🚨 @PATCH : autoSaveRef 선언 위치를 L1289→L1101로 이동 | 2026-06-15 | rS TDZ(autoSaveRef_sync useEffect) 해결
  // 🔗 @CALLS : useRef (React)
  // ====================================================================
  // 💡 [TDZ 방어] lastSavedContentRef는 useFileExplorer에서 먼저 참조되므로 상단에 선언
  const lastSavedContentRef = useRef<string>('');
  const prevActiveTabRef = useRef<string | null>(null);

  // 💡 [WBS CORE-02 / 요구사항 4] State Stale Closure 방지를 위한 Ref 백업 시스템 도입
  const currentFileNodeRef = useRef(currentFileNode);
  const currentFileParentHandleRef = useRef<any>(null);
  const currentFileNameRef = useRef(currentFileName);
  const workspaceTypeRef = useRef(workspaceType);
  const rootFolderRef = useRef(rootFolder);
  const licenseStatusRef = useRef(effectiveLicenseStatus);
  const tabSizeRef = useRef(4);
  // 🚨 @PATCH : A4 조판 가드 스케일링 로직

  useEffect(() => {
    if (!isA4GuardEnabled) {
      setPreviewZoomScale(1);
      return;
    }

    const container = previewRef.current;
    if (!container) return;

    // ResizeObserver를 통해 custom-preview-container 너비를 감지하여 A4(210mm) 비율에 맞게 zoom 계산
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // 브라우저 기본 96 DPI 기준: 210mm = 793.7px (대략 794px)
        const A4_PIXEL_WIDTH = 794;

        // 여백(Padding) 등을 고려하여 컨테이너 너비보다 A4가 크면 축소, 아니면 1 유지
        // 40px은 양옆 여유 여백(패딩 및 스크롤바)
        if (width < A4_PIXEL_WIDTH + 40) {
          const scale = Math.max(0.3, (width - 40) / A4_PIXEL_WIDTH);
          setPreviewZoomScale(scale);
        } else {
          setPreviewZoomScale(1);
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isA4GuardEnabled, previewRef]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012c] MainEditorApp.tsx ➔ file:close-tab-by-path listener
  // 🎯 @KICK  : 탐색기에서 파일/폴더 삭제 시 해당 열린 탭을 즉시 닫고 에디터 정리
  // 🛡️ @GUARD : 삭제된 경로와 일치하거나 하위 경로에 속한 모든 탭 정리, 활성 탭 전환 또는 빈 탭 처리
  // 🚨 @PATCH : **2026-10-03** — [파일 삭제 시 열린 탭 자동 닫기 전면 강화]: driveId 일치, path 끝부분(endsWith) 매칭 및 name 일치 다중 검증 탑재
  // 🔗 @CALLS : setTabs, switchTab, setContent, setCurrentFileName, setCurrentFileNode, setActiveTabId
  // ====================================================================
  useEffect(() => {
    const handleCloseTabByPath = (e: Event) => {
      const { path, name, driveId, isDir } = (e as CustomEvent).detail || {};
      if (!path && !name && !driveId) return;

      const normTarget = (path || '').replace(/\\/g, '/').toLowerCase();
      const targetFileName = (name || (normTarget ? normTarget.split('/').pop() : '') || '').toLowerCase();
      const hasTargetSlash = normTarget.includes('/');

      // 🛡️ [동일 파일명 오종료 방어]: 삭제된 파일 또는 삭제된 폴더 하위에 속한 탭들만 엄격하게 필터링
      const tabsToClose = tabsRef.current.filter(t => {
        // 1. Google Drive 고유 ID 일치 확인 (가장 확실한 식별자)
        const tabDriveId = (t as any).driveFileId || (t as any).driveId || (t as any).id;
        if (driveId && tabDriveId && String(driveId) === String(tabDriveId)) {
          return true;
        }

        const tabPath = (t.path || '').replace(/\\/g, '/').toLowerCase();
        const hasTabSlash = tabPath.includes('/');

        // 2. 정확한 경로 일치 (파일 또는 폴더 경로가 100% 동일)
        if (normTarget && tabPath && tabPath === normTarget) {
          return true;
        }

        // 3. 폴더 삭제 시: 해당 폴더 하위에 속한 탭들 닫기
        if (normTarget && tabPath && (isDir || normTarget.endsWith('/'))) {
          const folderPrefix = normTarget.endsWith('/') ? normTarget : normTarget + '/';
          if (tabPath.startsWith(folderPrefix)) {
            return true;
          }
        }

        // 4. 경로 끝부분 매칭: 단, 양쪽 모두 디렉토리 경로 구분자(/)를 포함하고 있을 때만!
        // (예: 절대경로 D:/project/folderA/test.md vs 상대경로 folderA/test.md)
        // 🚨 단일 파일명(test.md)만으로 endsWith 매칭을 수행하면 다른 폴더의 동명 파일이 닫히므로 차단
        if (hasTargetSlash && hasTabSlash) {
          if (tabPath.endsWith('/' + normTarget) || normTarget.endsWith('/' + tabPath)) {
            return true;
          }
        }

        // 5. 경로가 양쪽 모두 완전히 없는(미저장 가상 파일 등) 경우에만 한하여 파일명 단독 비교
        if (!normTarget && !tabPath && targetFileName) {
          const tabName = (t.name || '').toLowerCase();
          if (tabName === targetFileName) {
            return true;
          }
        }

        // 그 외: 다른 경로에 있는 동일 파일명의 파일은 절대 닫지 않음!
        return false;
      });

      if (tabsToClose.length === 0) return;

      tabsToClose.forEach(tab => {
        if (tab.model) {
          try { tab.model.dispose(); } catch {}
        }
      });

      const closeIds = new Set(tabsToClose.map(t => t.id));
      const nextTabs = tabsRef.current.filter(t => !closeIds.has(t.id));
      tabsRef.current = nextTabs;
      setTabs(nextTabs);

      if (activeTabIdRef.current && closeIds.has(activeTabIdRef.current)) {
        if (nextTabs.length > 0) {
          switchTab(nextTabs[0].id);
        } else {
          setContent('');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
          setActiveTabId(null);
          if (editorRef.current) {
            editorRef.current.setValue('');
          }
        }
      }
    };
    window.addEventListener('file:close-tab-by-path', handleCloseTabByPath);
    return () => window.removeEventListener('file:close-tab-by-path', handleCloseTabByPath);
  }, [setTabs, switchTab, setContent, setCurrentFileName, setCurrentFileNode, setActiveTabId]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0021] MainEditorApp.tsx ➔ currentFileNodeRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 currentFileNodeRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { currentFileNodeRef.current = currentFileNode; }, [currentFileNode]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0022] MainEditorApp.tsx ➔ currentFileNameRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 currentFileNameRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { currentFileNameRef.current = currentFileName; }, [currentFileName]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0023] MainEditorApp.tsx ➔ workspaceTypeRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 workspaceTypeRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { workspaceTypeRef.current = workspaceType; }, [workspaceType]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0024] MainEditorApp.tsx ➔ rootFolderRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 rootFolderRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { rootFolderRef.current = rootFolder; }, [rootFolder]);
  const resourceFolderRef = useRef(resourceFolder);
  useEffect(() => { resourceFolderRef.current = resourceFolder; }, [resourceFolder]);

  const resourceFolderHandleRef = useRef(resourceFolderHandle);
  useEffect(() => { resourceFolderHandleRef.current = resourceFolderHandle; }, [resourceFolderHandle]);
  // ====================================================================
  // 📊 [OMD-LICENSE-MainEditorApp-0075] MainEditorApp.tsx ➔ licenseStatusRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 licenseStatusRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : **2026-06-21** — 신규: 만료 시 Ctrl+S/내보내기 차단을 위한 ref 추가
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { licenseStatusRef.current = effectiveLicenseStatus; }, [effectiveLicenseStatus]);
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0025] MainEditorApp.tsx ➔ tabSizeRef_sync
  // 🎯 @KICK  : 활성 CSS 프로필 tabSize 설정에서 tabSizeRef 업데이트
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : parseInt
  // ====================================================================
  useEffect(() => {
    tabSizeRef.current = 4;
  }, []);

  const useFileExplorerResult = useFileExplorer({
    editorRef,
    contentRef,
    currentFileNode,
    currentFileName,
    lastSavedContentRef,
    currentFileParentHandleRef,
    tabsRef,
    isSearchOpen,
    activeTabIdRef,
    setContent,
    setCurrentFileName,
    setCurrentFileNode,
    setTabs,
    setActiveTabId,
    setSaveStatus,
    setIsSidebarOpen,
    setIsSearchOpen,
    setHelpContent,
    setHelpTitle,
    setPreviewModeRaw,
    previewModeRef,
    isEditorMountedRef,
    showToast,
    createNewTab,
    switchTab,
    rootFolder,
    setRootFolder,
    fileList,
    setFileList,
    workspaceType,
    setWorkspaceType,
    licenseStatus,
    sessionRestoringRef,
    setConfirmConfig
  });

  // 💡 [TDZ 방어] useFileExplorer 반환값에서 즉시 구조분해 할당하여 참조 에러 방지
  const {
    refreshFileList,
    saveFile,
    handleFileClick,
    selectRootFolder,
    restoreFolderPermission,
    handleFileOpenByPath,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveConnected,
    isDriveAuthExpired
  } = useFileExplorerResult;

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003] 지식 베이스 / 출처 링크 에디터 파일 열기 및 라인 점프 리스너
  useEffect(() => {
    const handleOpenFileAtLine = async (e: CustomEvent) => {
      const { filePath, startLine } = e.detail || {};
      if (!filePath && !startLine) return;

      if (previewModeRef.current === 'preview' && setPreviewModeRaw) {
        setPreviewModeRaw('both');
        previewModeRef.current = 'both';
        isEditorMountedRef.current = true;
        lastGeneralPreviewModeRef.current = 'both';
      }

      const normTarget = (filePath || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
      const targetBase = normTarget.split('/').pop() || '';
      const currentPath = (currentFileNode?.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
      const currentName = (currentFileName || '').toLowerCase().normalize('NFC');

      const isAlreadyActive = filePath && (
        currentPath === normTarget ||
        (currentPath && normTarget && currentPath.endsWith('/' + targetBase)) ||
        currentName === targetBase ||
        currentName === targetBase.replace(/\.md$/i, '')
      );

      if (isAlreadyActive && editorRef.current && startLine) {
        editorRef.current.revealPositionInCenter({ lineNumber: startLine, column: 1 }, 1);
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 });
        editorRef.current.focus();

        const lineEl = document.querySelector(`[data-line="${startLine}"]`) as HTMLElement;
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lineEl.classList.add('preview-highlight-line');
          setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
        }
        return;
      }

      if (filePath && handleFileOpenByPath) {
        const anchor = startLine ? `L${startLine}` : undefined;
        await handleFileOpenByPath(filePath, anchor);
      } else if (editorRef.current && startLine) {
        editorRef.current.revealPositionInCenter({ lineNumber: startLine, column: 1 }, 1);
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 });
        editorRef.current.focus();
      }
    };

    window.addEventListener('app:open-file-at-line', handleOpenFileAtLine as any);
    return () => window.removeEventListener('app:open-file-at-line', handleOpenFileAtLine as any);
  }, [handleFileOpenByPath, currentFileNode, currentFileName, setPreviewModeRaw]);

  const selectResourceFolder = async () => {
    if (workspaceType === 'cloud') {
      try {
        const {getSavedDriveToken,initializeDriveResourceFolder}=await import('@/lib/gdrive/googleDriveClient');
        const token=getSavedDriveToken();if(!token)throw new Error('구글 드라이브를 먼저 연결해 주세요.');
        const {pickDriveResourceFolder}=await import('@/lib/gdrive/ResourceFilePicker');
        const selected=await pickDriveResourceFolder(token);if(!selected)return;
        const folderName = selected.name;
        if (!folderName) throw new Error('선택한 폴더의 이름을 확인할 수 없습니다.');
        const folders = await initializeDriveResourceFolder(token, selected.id);
        saveResourceSettings({kind:'drive',path:folderName,folderId:selected.id,...folders}, 'cloud');
        setResourceFolder(folderName);
        setProfileStorageRevision(r => r + 1);
        setResourceFolderHandle(null);(window as any).__resourceFolderHandle=null;
        showToast(`드라이브 리소스 폴더가 '${folderName}'(으)로 변경되었습니다.`,'success');
      } catch(error:any) {showToast(error.message,'error');}
      return;
    }
    const api = (window as any).electronAPI;
    if (api && api.selectFolder) {
      const result = await api.selectFolder(resourceFolder || '');
      if (result && result.status !== 'canceled' && result.path) {
        if (api.initResourceFolder) { const initialized=await api.initResourceFolder(result.path, SYSTEM_PROFILES);if(initialized?.success===false) {showToast(initialized.error || '리소스 폴더 초기화 실패','error');return;} }
        saveResourceSettings({kind:'local',path:result.path});
        setResourceFolder(result.path);
        setProfileStorageRevision(value => value + 1);
        try { saveSecureData('resourceFolder', result.path); } catch { }
        try { localStorage.setItem('onrivi_resource_folder_path', result.path); } catch { }
        try { localStorage.setItem('onrivi_resource_folder', result.path); } catch { }
        try { localStorage.setItem('resourceFolder', result.path); } catch { }
        
        showToast('리소스 폴더가 설정되었습니다.', 'success');
      }
    } else if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        const defaults:Record<string,string>={'profiles/userCssProfiles.json':JSON.stringify(SYSTEM_PROFILES,null,2),'prompt/ai_prompts.json':'{}','prompt/ai_presets.json':'[]','prompt/promptTemplates.json':'[]','bible/references.bib':'','db/onrivi_knowledge.db':''};
        for (const name of ['profiles','prompt','bible','media','db']) await handle.getDirectoryHandle(name,{create:true});
        for (const [relative,content] of Object.entries(defaults)) {
          const [directory,name]=relative.split('/');const dir=await handle.getDirectoryHandle(directory);
          try {await dir.getFileHandle(name);}catch(error:any){if(error.name!=='NotFoundError')throw error;const file=await dir.getFileHandle(name,{create:true});const writable=await file.createWritable();await writable.write(content);await writable.close();}
        }
        await idb.set('resourceFolderHandle',handle);
        await idb.set('localResourceFolderHandle',handle);
        setResourceFolderHandle(handle);(window as any).__resourceFolderHandle=handle;
        saveResourceSettings({kind:'browser',path:handle.name});
        setResourceFolder(handle.name);
        await idb.set('resourceFolderHandle', handle);
        try { saveSecureData('resourceFolder', handle.name); } catch { }
        try { localStorage.setItem('onrivi_resource_folder_path', handle.name); } catch { }
        try { localStorage.setItem('onrivi_resource_folder', handle.name); } catch { }
        try { localStorage.setItem('resourceFolder', handle.name); } catch { }
        
        // 🚀 [사용자 지시 완벽 반영] 웹 브라우저 환경 5대 디렉토리 일괄 생성
        try {
          await handle.getDirectoryHandle('profiles', { create: true });
          await handle.getDirectoryHandle('prompt', { create: true });
          await handle.getDirectoryHandle('bible', { create: true });
          await handle.getDirectoryHandle('media', { create: true });
          await handle.getDirectoryHandle('db', { create: true });
        } catch (dirErr) {
          console.warn('[Browser ResourceFolder Dir Creation Error]:', dirErr);
        }

        // 서식 로드는 공통 effect에서 처리한다. 폴더명으로 서버 저장소를 추측하지 않는다.
        showToast('리소스 폴더가 설정되었습니다.', 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          showToast('폴더 선택 중 오류가 발생했습니다.', 'error');
        }
      }
    } else {
      showToast('이 브라우저에서는 폴더 선택 기능을 지원하지 않습니다.', 'warning');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0025b ✅ FIXED] MainEditorApp.tsx ➔ clearResourceFolder
  // 🎯 @KICK  : 공통 자원 관리 폴더 연결 해제 및 로컬/IndexedDB 영구 스토리지 데이터 완전 소거
  // 🛡️ @GUARD : idb.del 및 idb.set(null) 이중 방어, localStorage/sessionStorage 클린업
  // 🚨 @PATCH : **2026-09-05** — 공통 리소스 폴더 연결 해제 시 IndexedDB 및 로컬/세션스토리지 완전 소거, 모달 중첩 방어 및 안내 문구 순화('폴더 해제')
  // 🔗 @CALLS : saveSecureData, localStorage.removeItem, idb.del, idb.set, showToast
  // ====================================================================
  const clearResourceFolder = async () => {
    const clearingLocal = getResourceEnvironment() === 'local';
    saveResourceSettings(null);
    setResourceFolder(null);
    setResourceFolderHandle(null);
    (window as any).__resourceFolderHandle = null;
    setGeminiApiKey('');
    setAiModelName('gemini-3.8-flash');
    void deleteResourceAICredentials();
    purgeLocalStorageAICredentials();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('onrivi:ai-connections'));
    }
    setIsDismissedGuide(false);
    if (clearingLocal) {
    try { saveSecureData('resourceFolder', ''); } catch {}
    try { localStorage.removeItem('resourceFolder'); } catch {}
    try { localStorage.removeItem('onrivi_resource_folder'); } catch {}
    try { localStorage.removeItem('onrivi_resource_folder_path'); } catch {}
    try { sessionStorage.removeItem('resourceFolder'); } catch {}
    try {
      const rawSettings = localStorage.getItem('onrivi_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.resourceFolder) {
          delete parsed.resourceFolder;
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      }
    } catch {}
    try { await idb.del('resourceFolderHandle'); } catch {}
    try { await idb.set('resourceFolderHandle', null); } catch {}
    try { await idb.del('localResourceFolderHandle'); } catch {}
    }
    (window as any)._resourceFolderSynced = false;
    showToast('공통 리소스 폴더 연결이 해제되었습니다.', 'info');
    if (!isSettingsModalOpen) {
      setIsResourceGuideModalOpen(true);
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0026 ✅ FIXED] MainEditorApp.tsx ➔ setPreviewMode
  // 🎯 @KICK  : 에디터 콘텐츠 보존, css-style 웰컴 탭 자동 생성 및 도움말 콘텐츠 가드와 함께 미리보기 모드 전환
  // 🛡️ @GUARD : css-style 잠금 중 모드 변경 방지, 전환 전 에디터 콘텐츠 강제 동기화, helpContent 재정의 차단, 도움말 탭('도움말.md') 모드 변경 차단
  // 🚨 @PATCH : 도움말 탭 읽기 전용 잠금 가드 추가 (2026-06-17)
  // 🔗 @CALLS : editorRef.current.getValue, setContent, setPreviewModeRaw, setHelpContent, createNewTab, switchTab, clearTimeout
  // ====================================================================
  const setPreviewMode = useCallback((modeOrFn: 'edit' | 'both' | 'preview' | 'css-style' | ((prev: 'edit' | 'both' | 'preview' | 'css-style') => 'edit' | 'both' | 'preview' | 'css-style')) => {
    if (!pendingVisualExportRef.current) {
      setDirectEditEnabled(true);
    }
    // 모드 전환 전 에디터 내용을 즉시 React 상태에 반영 (100ms 디바운스 손실 방지)
    if (editorRef.current && previewModeRef.current !== 'preview' && !previewRef.current?.querySelector('.visual-document-editor')) {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }
      const latestVal = editorRef.current.getValue();
      if (latestVal !== contentRef.current) {
        setContent(latestVal);
      }
    }
    setPreviewModeRaw(prev => {
      const requested = typeof modeOrFn === 'function' ? modeOrFn(prev) : modeOrFn;
      const next = requested === 'edit' ? 'both' : requested;

      if (isRestrictedUser) {
        if (next !== 'preview' && !isLicenseChecking) {
          if (isDuplicateInstance) {
            showToast("다른 탭에서 이미 편집 중입니다. 상단 '이 화면에서 편집 시작하기'를 눌러 편집 제어권을 가져올 수 있습니다.", "warning");
          } else if (licenseStatus.isConcurrentLimited) {
            showToast("다른 기기 또는 브라우저에서 사용 중입니다. 상단 '이 화면에서 편집 시작하기'를 눌러 편집 제어권을 가져올 수 있습니다.", "warning");
          } else {
            showToast("🔒 읽기 전용(제한사용자) 모드에서는 미리보기 화면만 제공됩니다.", "warning");
          }
        }
        return 'preview';
      }
      const activeTab = tabsRef.current.find(t => t.id === activeTabIdRef.current);
      if (activeTab?.name === '도움말.md' && next !== 'preview' && next !== 'css-style') return prev;

      // 💡 일반 보기 모드(edit, both, preview)로 변경하는 경우, 이를 전역 상태용 Ref에 백업해둡니다.
      if (next === 'edit' || next === 'both' || next === 'preview') {
        lastGeneralPreviewModeRef.current = next;
      }

      // 💡 서식 정의(css-style) 모드로 스위칭될 때 -> 기존 탭 생성 로직을 폐기하고, 새 모달을 띄우도록 가로챕니다.
      if (next === 'css-style') {
        setTimeout(() => setIsStyleModalOpen(true), 0);
        return prev; // 에디터 뷰잉 모드는 이전 상태 그대로 유지
      }

      previewModeRef.current = next;
      if (typeof window !== 'undefined' && next !== 'css-style') {
        localStorage.setItem('previewMode', next);
      }
      if (next === 'preview') {
        isEditorMountedRef.current = false;
      } else {
        isEditorMountedRef.current = true;
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setContent, createNewTab, setTabs, licenseStatus, showToast, isRestrictedUser, isDuplicateInstance, isLicenseChecking]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0027 ✅ FIXED] MainEditorApp.tsx ➔ closeTab
  // 🎯 @KICK  : 저장되지 않은 변경사항 확인, 모델 폐기 및 css-style/도움말 모드 자동 종료와 함께 탭 닫기
  // 🛡️ @GUARD : 이벤트 stopPropagation, 수정된 탭 확인, Monaco 모델 폐기, 다음 탭으로 전환 또는 빈 탭 생성
  // 🚨 @PATCH : 도움말 탭 닫을 때 'both' 모드 복원 추가 (2026-06-17); tabsRef 즉시 동기화 + isDisposed() 가드로 Model is disposed! 크래시 방지 (2026-06-18); stale ref로 인한 삭제 탭 복원 버그 수정 (2026-06-18)
  // 🔗 @CALLS : setTabs, switchTab, createNewTab, setConfirmConfig, tab.model.dispose
  // ====================================================================
  const closeTab = useCallback((tabId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const tabToClose = tabsRef.current.find(t => t.id === tabId);
    if (!tabToClose) return;

    const performClose = () => {
      if (tabToClose.model) {
        tabToClose.model.dispose();
      }

      // 💡 웰컴페이지 전용 'Onrivi Author 시작하기.md' 탭을 닫거나 도움말을 닫을 때의 모드 조정
      if (tabToClose.name === 'Onrivi Author 시작하기.md' || tabToClose.name === '도움말.md') {
        const targetMode = isRestrictedUser ? 'preview' : (previewModeRef.current === 'css-style' ? 'both' : previewModeRef.current);
        setPreviewModeRaw(targetMode);
        previewModeRef.current = targetMode;
        isEditorMountedRef.current = targetMode !== 'preview';
      }

      const nextTabs = tabsRef.current.filter(t => t.id !== tabId);
      const closeIndex = tabsRef.current.findIndex(t => t.id === tabId);
      tabsRef.current = nextTabs;
      setTabs(nextTabs);

      if (activeTabIdRef.current === tabId) {
        if (nextTabs.length > 0) {
          const nextActiveIndex = Math.max(0, closeIndex - 1);
          const nextActiveTab = nextTabs[nextActiveIndex] || nextTabs[0];
          switchTab(nextActiveTab.id);
        } else {
          setContent('');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
          setActiveTabId(null);
          if (editorRef.current) {
            editorRef.current.setValue('');
          }
        }
      }
    };

    if (tabToClose.isModified) {
      setConfirmConfig({
        isOpen: true,
        title: "저장되지 않은 변경사항",
        message: `'${tabToClose.name}' 파일의 변경사항이 저장되지 않았습니다. 저장하지 않고 닫으시겠습니까?`,
        confirmText: "저장하지 않고 닫기",
        cancelText: "취소",
        isDanger: true,
        onConfirm: () => {
          performClose();
        }
      });
      return;
    }

    performClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewTab, switchTab, setTabs]);

  const useEditorSettingsResult = useEditorSettings(
    editorRef,
    mounted,
    setMounted,
    previewMode,
    setPreviewMode,
    setSidebarWidth,
    setActiveProfileId,
    setWorkspaceType,
    setRootFolder,
    setIsAddonEnv,
    showToast
  );

  // 💡 [TDZ 방어] useEditorSettings 반환값을 즉시 구조분해 할당하여 TDZ 에러 방지
  const {
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    wordWrap,
    setWordWrap,
    autoSave,
    setAutoSave,
    quoteStyle,
    setQuoteStyle,
    themePalette,
    setThemePalette,
    licenseKey,
    setLicenseKey,
    customHotkeys,
    setCustomHotkeys,
    customSlashCommands,
    setCustomSlashCommands,
    customSlashCommandsRef,
    handleThemeChange,
    autoClosingBrackets,
    setAutoClosingBrackets,
    editorFontWeight,
    setEditorFontWeight,
    editorHighContrast,
    setEditorHighContrast,
    geminiApiKey,
    setGeminiApiKey,
    aiModelName,
    setAiModelName
  } = useEditorSettingsResult;
  const {editorTabSize,setEditorTabSize,spellCheck,setSpellCheck}=useEditorSettingsResult;

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorLicense] 에디터 라이선스 및 세션 감시 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 라이선스 검증/하트비트/세션탈취/게스트타이머를 useEditorLicense로 1,044줄 분리 위임
  // ====================================================================
  const {
    isTakingOver,
    handleTakeover,
    handleSuccessActivation,
    loadAndVerifyLicense,
    formatTime,
  } = useEditorLicense({
    deviceId,
    licenseKey,
    setLicenseKey,
    licenseStatus,
    setLicenseStatus,
    isLicenseChecking,
    setIsLicenseChecking,
    showToast,
    previewModeRef,
    lastGeneralPreviewModeRef,
    isGuestMode,
    setIsGuestMode,
    isGuestExpired,
    setIsGuestExpired,
    guestRemainingSeconds,
    setGuestRemainingSeconds,
    setPreviewModeRaw,
    mounted,
    isDuplicateInstance,
    takeOverControl,
  });

  // 🌟 [공통 리소스 폴더 동적 변경 실시간 감지 리스너] (구글 드라이브 ↔ 로컬 전환 등)
  useEffect(() => {
    const handleResourceFolderChange = async (e: any) => {
      const newFolder = getResourceSettings()?.path || '';
      setResourceFolder(newFolder || null);
      setProfileStorageRevision(revision => revision + 1);
      let handle = null;
      if (getResourceSettings()?.kind === 'drive') {
        setResourceFolderHandle(null);
        (window as any).__resourceFolderHandle = null;
      } else {
        handle = (window as any).__resourceFolderHandle;
        setResourceFolderHandle(handle?.name === newFolder ? handle : null);
      }

      // 🚀 [리소스 폴더 변경 즉시 해당 폴더의 AI 환경정보 실시간 재로드]
      try {
        const creds = await loadResourceAICredentials(newFolder || undefined, handle);
        setGeminiApiKey(creds?.apiKey || '');
        setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('onrivi:ai-connections'));
        }
      } catch (err) {
        console.warn('[handleResourceFolderChange reload error]:', err);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:resource_folder_changed', handleResourceFolderChange);
      return () => window.removeEventListener('onrivi:resource_folder_changed', handleResourceFolderChange);
    }
  }, [setGeminiApiKey, setAiModelName, setProfileStorageRevision]);


  useEffect(()=>{
    const isInsideMarkdownPane=(target:EventTarget|null)=>target instanceof Element && Boolean(target.closest('#onrivi-markdown-pane'));
    const blockWheel=(event:WheelEvent)=>{
      if(previewModeRef.current==='both' && isInsideMarkdownPane(event.target)){event.preventDefault();event.stopImmediatePropagation();}
    };
    const blockMutationEvent=(event:Event)=>{
      if(previewModeRef.current==='both' && isInsideMarkdownPane(event.target)){event.preventDefault();event.stopImmediatePropagation();}
    };
    const blockKeyDown=(event:KeyboardEvent)=>{
      if(previewModeRef.current!=='both' || !isInsideMarkdownPane(event.target))return;
      const key=event.key;
      const lower=key.toLowerCase();
      const isAllowedShortcut=(event.ctrlKey || event.metaKey) && !event.altKey && (lower==='c' || lower==='a' || lower==='f' || lower==='s');
      const isAllowedNav=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Escape','Shift','Control','Alt','Meta'].includes(key);
      if(isAllowedShortcut || isAllowedNav)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener('wheel',blockWheel,{passive:false,capture:true});
    document.addEventListener('beforeinput',blockMutationEvent,true);
    document.addEventListener('paste',blockMutationEvent,true);
    document.addEventListener('cut',blockMutationEvent,true);
    document.addEventListener('drop',blockMutationEvent,true);
    document.addEventListener('keydown',blockKeyDown,true);
    const isPaneReadOnly = tabs.length === 0 || isRestrictedUser || previewMode === 'both';
    editorRef.current?.updateOptions({
      readOnly: isPaneReadOnly,
      domReadOnly: isPaneReadOnly,
      scrollbar:{vertical:previewMode==='both'?'hidden':'visible',horizontal:previewMode==='both'?'hidden':'auto',handleMouseWheel:previewMode!=='both'}
    });
    return()=>{
      document.removeEventListener('wheel',blockWheel,true);
      document.removeEventListener('beforeinput',blockMutationEvent,true);
      document.removeEventListener('paste',blockMutationEvent,true);
      document.removeEventListener('cut',blockMutationEvent,true);
      document.removeEventListener('drop',blockMutationEvent,true);
      document.removeEventListener('keydown',blockKeyDown,true);
    };
  },[previewMode,activeTabId,tabs.length,isRestrictedUser]);

  useEffect(()=>{tabSizeRef.current=editorTabSize;editorRef.current?.getModel()?.updateOptions({tabSize:editorTabSize,indentSize:editorTabSize,insertSpaces:true});},[editorTabSize]);

  // 🛡️ [AI 암호화 키 및 모델명 자가 치유(Self-Healing) 파이프라인]
  // 과거 로컬스토리지에 AES 암호문(U2FsdGVkX1...) 형태로 저장되었던 API 키 및 모델명을 즉시 자동 감지하여 복호화/정상화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (geminiApiKey && geminiApiKey.startsWith('U2FsdGVkX1')) {
      const decrypted = ensureDecryptedApiKey(geminiApiKey);
      if (decrypted && !decrypted.startsWith('U2FsdGVkX1')) {
        setGeminiApiKey?.(decrypted);
        try {
          purgeLocalStorageAICredentials();
        } catch {}
      }
    }

    if (aiModelName && (aiModelName.startsWith('U2FsdGVkX1') || aiModelName.length > 50)) {
      const fixedModel = normalizeAIModelName(aiModelName);
      setAiModelName?.(fixedModel);
      try {
        localStorage.setItem('onrivi_ai_model_name', fixedModel);
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.aiModelName = fixedModel;
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      } catch {}
    }
  }, [geminiApiKey, aiModelName, setGeminiApiKey, setAiModelName]);

  // 🔐 [AI API 키 리소스 폴더 암호화 자격증명 자동 로드 및 로컬스토리지 소거]
  useEffect(() => {
    if (!mounted) return;
    let disposed = false;
    let revision = 0;
    const loadCreds = async () => {
      const request = ++revision;
      try {
        const creds = await loadResourceAICredentials(resourceFolder || undefined, resourceFolderHandle);
        if (disposed || request !== revision) return;
        setGeminiApiKey(creds?.apiKey || '');
        setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('onrivi:ai-connections'));
        }
      } catch (err) {
        console.warn('[MainEditorApp loadResourceAICredentials Error]:', err);
      }
    };
    const reload = () => { void loadCreds(); };
    window.addEventListener('onrivi:drive_token_updated', reload);
    reload();
    return () => { disposed = true; window.removeEventListener('onrivi:drive_token_updated', reload); };
  }, [mounted, resourceFolder, resourceFolderHandle, setGeminiApiKey, setAiModelName]);


  const [isAiLoading, setIsAiLoading] = useState(false);



  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0028] MainEditorApp.tsx ➔ autoSaveRef_sync
  // 🎯 @KICK  : 자동 저장 로직에서 스테일 클로저 방지를 위해 autoSaveRef를 autoSave 상태와 동기화
  // 🛡️ @GUARD : 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const autoSaveRef = useRef(autoSave);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  const isActivated = !isDuplicateInstance && licenseStatus.isActivated;



  const decorationsCollectionRef = useRef<any>(null);
  const decorationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0029] MainEditorApp.tsx ➔ handleCheckboxToggle
  // 🎯 @KICK  : 미리보기 체크박스 클릭을 에디터 모델 라인 콘텐츠에 동기화
  // 🛡️ @GUARD : window.monaco 존재 확인, 라인 범위 검사, 정규식 검증으로 가드
  // 🚨 @PATCH : None
  // 🔗 @CALLS : editor.getModel, editor.pushUndoStop, editor.executeEdits
  // ====================================================================
  const handleCheckboxToggle = useCallback((lineNumber: number, checked: boolean, importedId?: string) => {
    if (!editorRef.current || typeof window === 'undefined' || !(window as any).monaco) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    if (importedId) {
      const edit = importedCheckboxEdit(model.getValue(), importedId, checked);
      if (!edit) return;
      const start=model.getPositionAt(edit.start), end=model.getPositionAt(edit.end);
      const Range=(window as any).monaco.Range;
      editor.pushUndoStop();
      editor.executeEdits('importedCheckboxToggle',[{range:new Range(start.lineNumber,start.column,end.lineNumber,end.column),text:edit.text,forceMoveMarkers:true}]);
      editor.pushUndoStop();
      return;
    }

    if (lineNumber < 1 || lineNumber > model.getLineCount()) return;

    const lineContent = model.getLineContent(lineNumber);
    const checkboxRegex = /^([ \t]*[-*+]\s+\[)([ xX])(\].*)$/;
    const match = lineContent.match(checkboxRegex);

    if (match) {
      const [_, prefix, currentStatus, suffix] = match;
      const newStatus = checked ? 'x' : ' ';
      const newLineContent = `${prefix}${newStatus}${suffix}`;

      const Range = (window as any).monaco.Range;
      editor.pushUndoStop();
      editor.executeEdits("checkboxToggle", [
        {
          range: new Range(lineNumber, 1, lineNumber, lineContent.length + 1),
          text: newLineContent,
          forceMoveMarkers: true,
        }
      ]);
      editor.pushUndoStop();
    }
  }, []);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0030] MainEditorApp.tsx ➔ updateDecorations
  // 🎯 @KICK  : 마크다운 구문 강조(제목, 굵게, 기울임, 취소선)를 위한 인라인 Monaco 데코레이션 적용
  // 🛡️ @GUARD : editor/window.monaco를 사용할 수 없으면 건너뜀
  // 🚨 @PATCH : None
  // 🔗 @CALLS : decorationsCollectionRef.current.set
  // ====================================================================
  const updateDecorations = useCallback((editor: any) => {
    if (!editor || typeof window === 'undefined' || !(window as any).monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const lines = model.getLinesContent();
    const newDecorations: any[] = [];
    const Range = (window as any).monaco.Range;

    // ✏️ [Code Block] CommonMark 기반 코드블록 영역 마스크 생성 (이중 코드블록 전체 범위 100% 매핑)
    const codeBlockMask = getCodeBlockLineMask(lines);

    lines.forEach((line: string, i: number) => {
      const lineNumber = i + 1;

      // ✏️ [Code Block] 라인 배경 데코레이션 주입 (이중 중첩 코드블록 내부 포함 전체 라인 연속 유지)
      if (codeBlockMask[i]) {
        newDecorations.push({
          range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
          options: {
            isWholeLine: true,
            className: 'monaco-codeblock-line',
            linesDecorationsClassName: 'monaco-codeblock-gutter'
          }
        });
        return;
      }

      // ✏️ [Quote] 인용문 라인 배경 및 테두리 데코레이션 주입
      if (line.trim().startsWith('>')) {
        newDecorations.push({
          range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
          options: {
            isWholeLine: true,
            className: 'monaco-quote-line'
          }
        });
      }

      // ✏️ [Table] 표 구문 라인 배경 및 테두리 데코레이션 주입
      if (line.trim().startsWith('|')) {
        newDecorations.push({
          range: new Range(lineNumber, 1, lineNumber, Math.max(2, line.length + 1)),
          options: {
            isWholeLine: true,
            className: 'monaco-table-line'
          }
        });
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const prefixLen = level + 1;
        newDecorations.push({
          range: new Range(lineNumber, 1, lineNumber, prefixLen + 1),
          options: { inlineClassName: `monaco-md-syntax monaco-heading-syntax monaco-h${level}-syntax` }
        });
        const cName = `monaco-h${level}-text`;
        newDecorations.push({
          range: new Range(lineNumber, prefixLen + 1, lineNumber, line.length + 1),
          options: { inlineClassName: cName }
        });
      }

      // Bold
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        const start = match.index + 1;
        const end = start + match[0].length;
        newDecorations.push({
          range: new Range(lineNumber, start, lineNumber, start + 2),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, end - 2, lineNumber, end),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, start + 2, lineNumber, end - 2),
          options: { inlineClassName: 'monaco-bold-text' }
        });
      }

      // Italic
      const italicRegex = /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g;
      while ((match = italicRegex.exec(line)) !== null) {
        const start = match.index + 1;
        const end = start + match[0].length;
        newDecorations.push({
          range: new Range(lineNumber, start, lineNumber, start + 1),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, end - 1, lineNumber, end),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, start + 1, lineNumber, end - 1),
          options: { inlineClassName: 'monaco-italic-text' }
        });
      }

      // Strikethrough
      const strikeRegex = /~~(.*?)~~/g;
      while ((match = strikeRegex.exec(line)) !== null) {
        const start = match.index + 1;
        const end = start + match[0].length;
        newDecorations.push({
          range: new Range(lineNumber, start, lineNumber, start + 2),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, end - 2, lineNumber, end),
          options: { inlineClassName: 'monaco-md-syntax' }
        });
        newDecorations.push({
          range: new Range(lineNumber, start + 2, lineNumber, end - 2),
          options: { inlineClassName: 'monaco-strikethrough-text' }
        });
      }
    });

      if (decorationsCollectionRef.current) {
        decorationsCollectionRef.current.set(newDecorations);
      }
    }, []);
    const isResizing = useRef(false);
  // autoSaveRef, lastSavedContentRef는 위(L1101)에서 이미 선언됨
  const isScrollingRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const prevCursorLineRef = useRef<number | null>(null);
  const frontmatterLinesRef = useRef<number>(0); // YAML frontmatter 라인 수 (syncPreviewInterpolated 전달용)
  const contentChangeTimeoutRef = useRef<any>(null);
  const completionProviderRef = useRef<any>(null);
  const wikilinkProviderRef = useRef<any>(null);
  const docLinkFilesRef = useRef<FileNode[]>([]);
  const [floatingToolbar, setFloatingToolbar] = useState<{ visible: boolean, top: number, left: number }>({ visible: false, top: 0, left: 0 });
  const floatingToolbarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!floatingToolbar.visible) return;
    floatingToolbarRef.current?.querySelector<HTMLButtonElement>('[data-floating-bold]')?.focus({ preventScroll: true });
  }, [floatingToolbar.visible]);
  const lastFloatingActionRef = useRef<number>(0);
  const executeFloatingItem = useCallback((action: () => void, closeToolbar: boolean = false) => {
    const now = Date.now();
    if (now - lastFloatingActionRef.current < 300) return;
    lastFloatingActionRef.current = now;
    action();
    if (closeToolbar) {
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      if (!visualFloatingOriginRef.current || !visualCommandRef.current?.('FOCUS')) {
        editorRef.current?.focus();
      }
    }
  }, []);

  // 🎯 [플로팅 툴바 외부 클릭 및 에디터 클릭 시 자동 닫기]
  useEffect(() => {
    if (!floatingToolbar.visible) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const targetEl = (e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement);
      if (
        targetEl?.closest('#floating-toolbar') ||
        targetEl?.closest('#floating-quote-dropdown-fixed') ||
        targetEl?.closest('#floating-quote-dropdown-container')
      ) {
        return;
      }
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    return () => window.removeEventListener('mousedown', handleOutsideClick, true);
  }, [floatingToolbar.visible]);

  // 🎯 [인용구 드롭다운 오픈 시 첫 번째 옵션 버튼에 자동 포커스]
  useEffect(() => {
    if (floatingQuoteDropdown.open) {
      const dropdown = document.getElementById('floating-quote-dropdown-fixed');
      const firstBtn = dropdown?.querySelector<HTMLButtonElement>('button');
      firstBtn?.focus({ preventScroll: true });
    }
  }, [floatingQuoteDropdown.open]);
  const aiDecorationsRef = useRef<string[]>([]);
  const generationIdRef = useRef<number>(0);
  const readFileTextRef = useRef<(node: FileNode) => Promise<string>>(null!);

  // 💡 [OMD-HOOK-useEditorDocLinks] 문서 연결(DocLinkPicker) 및 헤딩 파싱 전담 훅
  const {
    showDocLinkPicker,
    setShowDocLinkPicker,
    docLinkSearchText,
    setDocLinkSearchText,
    allMdFiles,
    setAllMdFiles,
    isDocLinkLoading,
    setIsDocLinkLoading,
    selectedDocNode,
    setSelectedDocNode,
    docHeadings,
    setDocHeadings,
    isHeadingLoading,
    setIsHeadingLoading,
    docHeadingSearchText,
    setDocHeadingSearchText,
    docLinkCustomTitle,
    setDocLinkCustomTitle,
    isDocLinkTitleManuallyEdited,
    setIsDocLinkTitleManuallyEdited,
    visualDocLinkInsertRef,
    visualDocLinkPositionRef,
    closeDocLinkPicker,
    readFileText,
    extractHeadings,
    handleDocFileClick,
    getDocLinkDefaultLabel,
    buildDocLinkTarget,
    handleDocLinkSelect,
    docLinkPickerStyle,
  } = useEditorDocLinks({
    workspaceType,
    fileList,
    rootFolder,
    rootFolderRef,
    resourceFolder,
    resourceFolderHandle,
    resourceFolderHandleRef,
    currentFileNode,
    tabsRef,
    editorRef,
    lastSelectionRef,
    docLinkFilesRef,
    readFileTextRef,
    floatingToolbar,
  });


  // 📱 모바일 상태 관리를 Rules of Hooks에 따라 최상위(Top-level)로 상향 조정
  const [isMobile, setIsMobile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // 마운트 시점 확인
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const cursorPositionRef = useRef<any>(null);
  const cursorSelectionRef = useRef<any>(null);
  const handlersRef = useRef<any>(null);
  const hotkeyDisposablesRef = useRef<any[]>([]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0031] MainEditorApp.tsx ➔ previewWheelSync
  // 🎯 @KICK  : 분할 모드의 미리보기 휠 입력을 에디터에 전달하고 에디터 스크롤만 동기화의 기준으로 사용
  // 🛡️ @GUARD : 문서를 연 뒤 미리보기 DOM이 생성되는 데스크톱에서도 리스너가 반드시 연결되도록 callback ref 사용
  // 🚨 @PATCH : 2026-09-28 — 미리보기 자체 스크롤 대신 에디터 스크롤로 휠 입력 전달
  // 🔗 @CALLS : WheelEvent.preventDefault, editor.setScrollTop
  // ====================================================================
  const handlePreviewWheel = useCallback((event: WheelEvent) => {
    // 💡 [Ctrl + Wheel]: 미리보기 화면 배율 확대/축소 (50% ~ 200%)
    if (event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY < 0) {
        setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
      } else if (event.deltaY > 0) {
        setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
      }
      return;
    }

    // Normal wheel scrolling belongs to the document container.
    // Its scroll event synchronizes the Markdown panel.
  }, []);

  const bindPreviewScrollContainer = useCallback((node: HTMLDivElement | null) => {
    previewRef.current?.removeEventListener('wheel', handlePreviewWheel, true);
    previewRef.current = node;
    node?.addEventListener('wheel', handlePreviewWheel, { passive: false, capture: true });
  }, [handlePreviewWheel]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0032] MainEditorApp.tsx ➔ darkModeDOMClass
  // 🎯 @KICK  : Tailwind 다크 모드를 위해 documentElement에 'dark' 클래스 토글
  // 🛡️ @GUARD : SSR 불일치 방지를 위해 마운트 후에만 실행
  // 🚨 @PATCH : None
  // 🔗 @CALLS : document.documentElement.classList.add/remove
  // ====================================================================

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('dark');
  }, [mounted]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0033] MainEditorApp.tsx ➔ editorSettingsSync
  // 🎯 @KICK  : 설정 또는 에디터 마운트 변경 시 테마, 폰트 크기, 줄 바꿈 재적용
  // 🛡️ @GUARD : 레이스 컨디션 방지를 위해 mounted && isEditorReady로 가드
  // 🚨 @PATCH : 2026-06-23 — 라이선스 만료/제한 여부(isExpired) 변경 시 readOnly/domReadOnly 동기화 연동 추가
  // 🔗 @CALLS : monaco.editor.setTheme, editor.updateOptions, requestAnimationFrame
  // ====================================================================
  useEffect(() => {
    if (mounted && isEditorReady && editorRef.current) {
      // 1. 테마 및 고대비(High Contrast) 모드 강제 적용
      if ((window as any).monaco) {
        const monaco = (window as any).monaco;
        applySafeMarkdownMonarchTokenizer(monaco);
        EDITOR_THEMES.forEach(t => {
          const isDark = t.base === 'vs-dark';
          const defaultFg = isDark ? '#e2e8f0' : '#1e293b';
          const defaultPunctuation = isDark ? 'e2e8f0' : '1e293b';
          const activeFg = editorHighContrast ? (isDark ? '#ffffff' : '#000000') : defaultFg;
          const activePunctuation = editorHighContrast ? (isDark ? 'ffffff' : '000000') : defaultPunctuation;

          monaco.editor.defineTheme(t.id, {
            base: t.base,
            inherit: true,
            rules: [
              ...(t.rules || []),
              { token: 'punctuation', foreground: activePunctuation },
              { token: 'delimiter.markdown', foreground: editorHighContrast ? (isDark ? '38bdf8' : '1d4ed8') : '60a5fa', fontStyle: 'bold' },
              { token: 'string.link.markdown', foreground: isDark ? '94a3b8' : '64748b' },
              { token: 'variable.md', foreground: 'f59e0b' }
            ],
            colors: {
              ...t.colors,
              'editor.background': isDark ? '#0b1120' : '#eef2f6',
              'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
              'editor.foreground': activeFg,
              'editorLineNumber.foreground': isDark ? '#475569' : '#64748b',
              'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB',
              'editorCursor.foreground': '#38bdf8',
              'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
              'editorIndentGuide.background': '#88888815',
              'editorIndentGuide.activeBackground': '#88888830',
            }
          });
        });
        monaco.editor.setTheme(themePalette);
      }
      // 2. 에디터 옵션(폰트 크기, 글꼴 굵기, 줄 바꿈, 읽기 전용 여부) 강제 동기화
      const isPaneReadOnly = tabs.length === 0 || isRestrictedUser || previewMode === 'both';
      editorRef.current.updateOptions({
        fontSize: fontSize || 16,
        mouseWheelZoom: false,
        lineHeight: Math.round((fontSize || 16) * 1.75), // 글자 크기에 비례하는 동일 행간
        fontWeight: editorFontWeight === 'bold' ? '700' : editorFontWeight === 'semibold' ? '600' : editorFontWeight === 'medium' ? '500' : '400',
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
        padding: { top: 28, bottom: 28 },
        wordWrap: wordWrap,
        wrappingStrategy: 'advanced',
        wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
        wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',
        readOnly: isPaneReadOnly,
        domReadOnly: isPaneReadOnly,
        lineNumbers: 'off',
        lineNumbersMinChars: 0,
        lineDecorationsWidth: 8,
        glyphMargin: false,
        folding: false,
        cursorSmoothCaretAnimation: 'off',
        scrollbar: { verticalScrollbarSize: 16 },
      });
      // 3. 레이아웃 리플로우 강제 트리거 및 비동기 웹폰트 로딩 후 글자 폭 재계산 (핵심 버그 수정)
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
      document.fonts.ready.then(() => {
        if ((window as any).monaco) {
          (window as any).monaco.editor.remeasureFonts();
        }
      });
    }
  }, [themePalette, fontSize, wordWrap, editorFontWeight, editorHighContrast, mounted, isEditorReady, isRestrictedUser, previewMode, tabs.length]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0034] MainEditorApp.tsx ➔ darkModePaletteSync
  // 🎯 @KICK  : 다크모드(isDarkMode)는 강제 비활성화되어 있으므로 자동 테마 전환을 수행하지 않음
  // 🛡️ @GUARD : 없음
  // 🚨 @PATCH : 2026-07-09 — 다크 테마가 isDarkMode=false여도 강제로 onrivi-light로 되돌려지던 버그 수정. effect를 무효화하여 사용자가 설정에서 선택한 테마를 유지하도록 변경.
  // 🔗 @CALLS : 없음
  // ====================================================================
  useEffect(() => {
    // isDarkMode는 항상 false로 고정되어 있으므로 아무 동작도 하지 않음
  }, []);

  // 💡 [Step 2 리팩토링으로 profilesSave, activeProfileSave, resolveEffectiveDocumentProfile, frontmatter 동기화는 useEditorProfiles로 이관됨]

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0041] MainEditorApp.tsx ➔ a4_guard_auto_save
  // 🎯 @KICK  : isA4GuardEnabled 가드 상태가 변경될 때마다 localStorage에 즉시 보존.
  // 🛡️ @GUARD : Electron 및 일반 브라우저 환경 지원
  // 🚨 @PATCH : **2026-08-12** — 초기 생성 (A4 가드 레이아웃 보존 기능)
  // 🔗 @CALLS : 없음
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isA4GuardEnabled', String(isA4GuardEnabled));
    }
  }, [isA4GuardEnabled]);



  // 💡 [Step 2 리팩토링으로 handleProfileChange, 제목 넘버링, 가로형 그림책 레거시 프로필 동기화는 useEditorProfiles로 이관됨]

  // 🟢 [권한 기반 초기 화면 제어: 웰컴 탭 영구 잠금 및 강제 노출 로직 2026-07-05]
  const prevRestrictedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted || isLicenseChecking) return;

    // 제한 사용자 조건: 사용 기간 만료 혹은 웹에서 동시 접속을 초과하여 인증을 상실한 경우, 또는 다중 탭 실행 시
    const isRestrictedUser = isDuplicateInstance ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자');

    if (prevRestrictedRef.current === isRestrictedUser) return;
    prevRestrictedRef.current = isRestrictedUser;

    if (isRestrictedUser) {
      if (previewModeRef.current !== 'preview') {
        lastGeneralPreviewModeRef.current = previewModeRef.current;
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    } else {
      const restored = lastGeneralPreviewModeRef.current || 'preview';
      if (previewModeRef.current !== restored) {
        setPreviewModeRaw(restored);
        previewModeRef.current = restored;
      }
    }

    setTabs(prev => {
      const hasWelcome = prev.some(t => t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab);
      if (!hasWelcome) return prev;
      const cleaned = prev.filter(t => !(t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab));
      if (cleaned.length === 0) {
        setActiveTabId(null);
        setContent(localStorage.getItem('onrivi_content') || '');
        setCurrentFileName('새 파일.md');
        setCurrentFileNode(null);
      }
      return cleaned;
    });
  }, [mounted, isLicenseChecking, isDuplicateInstance, effectiveLicenseStatus]);


  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0039] MainEditorApp.tsx ➔ welcomeContentLoad
  // 🎯 @KICK  : 첫 마운트 시 탭이 없고 보류 중인 외부 파일이 없으면 웰컴 콘텐츠 로드
  // 🛡️ @GUARD : pendingExternalFileRef가 설정되어 있으면 건너뜀 (파일 열기로 연기)
  // 🚨 @PATCH : None
  // 🔗 @CALLS : getWelcomeContent, setTabs, setActiveTabId, setContent, setCurrentFileName
  // ====================================================================
  // 💡 초기 빈 탭을 생성하지 않음 — 사용자는 탐색기에서만 파일을 열거나 생성할 수 있음

  // 💡 [조치 완료] 애드온 구동 시 사용자의 클립보드 내용을 동의 없이 강제 읽기 하여 첫 웰컴페이지를 무조건 덮어쓰던 로직을 제거(주석 처리)하여 웰컴 페이지 노출을 보장합니다.
  // useEffect(() => {
  //   if (mounted && isAddonEnv && typeof navigator !== 'undefined' && navigator.clipboard) {
  //     (async () => {
  //       try {
  //         const text = await navigator.clipboard.readText();
  //         if (text) {
  //           updateContent(text);
  //           lastSavedContentRef.current = text;
  //         }
  //       } catch (e) {
  //         // 클립보드 읽기 실패 (권한 없음 등) - 무시
  //       }
  //     })();
  //   }
  // }, [mounted]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0040] MainEditorApp.tsx ➔ dynamicTitleBar
  // 🎯 @KICK  : document.title을 'Onrivi Author'로 고정 (탭 UI가 파일명 표시하므로)
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : 2026-06-22 — 파일명 제거, 'Onrivi Author'만 표시 (탭으로 대체)
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Onrivi Author';
    }
  }, []);

  // 💡 [OMD-CORE-MainEditorApp-0041] previewHighlightLine 훅은 processedContent 선언 이후(Line 4870)로 이동되었습니다 (TDZ 방어).
  // 💡 [OMD-SYNC-DEPRECATED] 스크롤 동기화 및 휠 차단 로직은 Monaco Setup 내부 단일 리스너(onDidScrollChange)로 완전히 마이그레이션되어 이곳의 중복 훅은 삭제되었습니다.

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0043] MainEditorApp.tsx ➔ handleMouseMove
  // 🎯 @KICK  : 사이드바 크기 조정 드래그 mousemove 이벤트 처리
  // 🛡️ @GUARD : 너비를 150-600px 사이로 제한
  // 🚨 @PATCH : None
  // 🔗 @CALLS : setSidebarWidth, localStorage.setItem
  // ====================================================================

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 600) {
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fontSize 및 wordWrap 저장은 통합 환경설정 저장 가드에서 처리

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0044] MainEditorApp.tsx ➔ stopResizing
  // 🎯 @KICK  : 사이드바 크기 조정 종료: 리스너 제거, 커서 및 user-select 복원
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : document.removeEventListener, document.body.style.cursor/userSelect
  // ====================================================================
  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, [handleMouseMove]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0045] MainEditorApp.tsx ➔ startResizing
  // 🎯 @KICK  : 사이드바 크기 조정 시작: 리스너 추가, col-resize 커서 설정
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : document.addEventListener, document.body.style
  // ====================================================================
  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, stopResizing]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0046] MainEditorApp.tsx ➔ tabModeSync
  // 🎯 @KICK  : 탭 전환 시 도움말은 미리보기 전용으로 강제하고 일반 문서는 직전의 전역 에디터 모드로 복구 동기화
  // 🛡️ @GUARD : 라이선스 만료 시 preview 모드로 가드
  // 🚨 @PATCH : 2026-07-04 — 신규 추가
  // 🔗 @CALLS : setPreviewModeRaw
  // ====================================================================
  useEffect(() => {
    if (!mounted || !activeTabId) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    if (activeTab.name === '도움말.md') {
      // 💡 1. 도움말 탭은 예외없이 무조건 미리보기 전용('preview') 고정
      if (previewModeRef.current !== 'preview') {
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    } else if (activeTab.isStyleTab === true) {
      // 💡 2. 서식설정 전용 탭: 모드 전환 없이 현재 모드 유지 (CssStyleForm은 Ctrl+Shift+S로만 토글)
    } else {
      // 💡 3. 그 외 일반 마크다운 문서들은 전역으로 공유되는 마크다운 보기 모드를 그대로 상속 및 유지
      const target = isRestrictedUser ? 'preview' : lastGeneralPreviewModeRef.current;
      if (previewModeRef.current !== target) {
        setPreviewModeRaw(target);
        previewModeRef.current = target;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, mounted, isRestrictedUser, helpContent]);
  // 🟢 [권한 기반 초기 화면 제어: 웰컴 탭 차단 및 강제 노출 로직 2026-07-05]
  // 초기 로딩 후 제한 사용자인지 판단하여 웰컴 페이지를 남기거나, 일반 사용자면 지웁니다.
  const hasHandledWelcomeRef = useRef(false);

  useEffect(() => {
    if (!mounted || isLicenseChecking || hasHandledWelcomeRef.current || sessionRestoringRef.current) return;

    console.log('[WELCOME#2] FIRED! isExpired=%o planName=%o tabsRef=%o', effectiveLicenseStatus.isExpired, effectiveLicenseStatus.planName, tabsRef.current.map((t: any) => t.name));

    // 이펙트를 단 한 번만 실행하여 다른 컴포넌트나 훅이 웰컴탭을 덮어쓰거나 무한루프 도는 것을 원천 방지
    hasHandledWelcomeRef.current = true;

    // 제한 사용자 조건: 사용 기간 만료 혹은 웹에서 동시 접속을 초과하여 인증을 상실한 경우 (undefined 방어를 위해 Optional Chaining 추가), 또는 다중 탭 중복 실행 시
    const isRestrictedUser = isDuplicateInstance ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자');

    // tabs 상태값 대신 refs로 현재 상황을 안전하게 스냅샷
    const hasWelcome = tabsRef.current.some(t => t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab);

      // 1. [정상/전체 사용자]: 웰컴 페이지 강제 삭제 (빈 문서 시작)
      if (hasWelcome) {
        const cleaned = tabsRef.current.filter(t => !(t.name === 'Onrivi Author 시작하기.md' && !t.isStyleTab));
        setTabs(cleaned);
        if (cleaned.length === 0) {
          setActiveTabId(null);
          // 시작 페이지 없이(Empty) 시작하도록 요청됨 -> 로컬 스토리지에 남아있는 게 있다면 복원하거나 빈 문자열.
          const localDraft = localStorage.getItem('onrivi_content');
          setContent(localDraft || '');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
        }
    }
  }, [mounted, isLicenseChecking, isDuplicateInstance, effectiveLicenseStatus]);
  useEffect(() => {
    if (currentFileNode && activeTabId) {
      if (prevActiveTabRef.current !== activeTabId) {
        prevActiveTabRef.current = activeTabId;
          const activeTab = tabsRef.current.find(t => t.id === activeTabId);
          if (!activeTab?.isModified) lastSavedContentRef.current = content;
          setSaveStatus(activeTab?.isModified ? 'unsaved' : 'saved');
          return;
      }
      const isUnsaved = content !== lastSavedContentRef.current;
      setSaveStatus(isUnsaved ? 'unsaved' : 'saved');
      setTabs(prev => {
        const cur = prev.find(t => t.id === activeTabId);
        if (cur && cur.isModified === isUnsaved) return prev;
        return prev.map(t =>
          t.id === activeTabId
            ? { ...t, isModified: isUnsaved }
            : t
        );
      });
    }
  }, [content, currentFileNode, activeTabId]);

  // 💡 [탭 전환 시 에디터 기준 미리보기 1:1 완벽 동기화 보장]
  useEffect(() => {
    if (!activeTabId || previewMode !== 'both' || !previewRef.current || !editorRef.current) return;

    // 탭 전환 시 직전 커서 라인 캐시 리셋 (마우스/방향키 이동 즉시 반응 보장)
    prevCursorLineRef.current = null;

    const performSync = () => {
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview || preview.querySelector('.visual-document-editor')) return;

      const editorTop = editor.getScrollTop?.() ?? 0;
      const pos = editor.getPosition?.();
      if (editorTop <= 2 && (!pos || pos.lineNumber <= 1)) {
        if (preview.scrollTop !== 0) {
          preview.scrollTop = 0;
        }
        return;
      }

      const currentContent = editor.getValue?.() || content;
      if (pos && pos.lineNumber > 1) {
        syncPreviewToTargetLine(preview, pos.lineNumber, currentContent);
      } else {
        syncPreviewFromEditorScroll(preview, editor, currentContent);
      }
    };

    // DOM 렌더링 완료 타이밍에 맞춰 보장 실행
    requestAnimationFrame(performSync);
    const t1 = setTimeout(performSync, 80);

    return () => {
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, previewMode]);
  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0047] MainEditorApp.tsx ➔ autoSave
  // 🎯 @KICK  : 콘텐츠 변경 및 autoSave 활성화 시 5초 디바운스 후 파일 자동 저장
  // 🛡️ @GUARD : 콘텐츠가 비어있거나, 미리보기 모드가 변경 중이거나, 콘텐츠가 변경되지 않았으면 건너뜀; 5초 디바운스 정리
  // 🚨 @PATCH : **2026-10-19** — [5초 자동저장 무한 루프 척결 및 텍스트 덮어쓰기 방어]:
  //             1) 자동 저장 중 불필요한 Frontmatter 강제 주입(updateCssProfileInFrontmatter) 및 setContent/model.pushEditOperations 호출 전면 배제 (백그라운드 물리 디스크 저장 전담)
  //             2) 저장 시작 직후 lastSavedContentRef 즉시 갱신 및 setTabs 불필요한 배열 재생성 가드로 무한 루프 및 텍스트 덮어쓰기 원천 차단
  //             3) autoSave useEffect 내 setCurrentFileNode 직접 호출을 배제하여 React 렌더링 무한 루프 종식
  // 🔗 @CALLS : saveFile, setSaveStatus, setTimeout, clearTimeout
  // ====================================================================
  useEffect(() => {
    // 🌟 [세이프티 가드 1]: 원고 본문이 비어있거나 데이터가 초기화되기 전 상태라면 
    // 시스템 오염 저장을 원천 차단합니다.
    if (!content || content.trim() === "") {
      return;
    }

    const activeTab = tabsRef.current?.find(t => t.id === activeTabIdRef.current);
    const effectiveFileNode = activeTab ? (activeTab.node || (activeTab.path ? { name: activeTab.name, path: activeTab.path, kind: 'file' } : null)) : currentFileNode;

    // Bundled help has no writable target until the user saves a copy.
    if (activeTab?.isBundledHelp || isBundledDocumentPath(effectiveFileNode?.path)) return;

    // 🌟 [세이프티 가드 2]: 유저가 뷰 모드(분할/에디터/프리뷰)를 변환하는 찰나의 순간에는 
    // 컴포넌트 오염 타이밍이므로 자동 저장을 생략하고 무조건 대기시킵니다.
    if (typeof autoSave === 'number' && autoSave > 0 && effectiveFileNode && licenseStatus.isActivated) {
      if (content === lastSavedContentRef.current) return;

      setSaveStatus('saving');
      const savingTabId = activeTab?.id;
      const timer = setTimeout(async () => {
        if (savingTabId && activeTabIdRef.current !== savingTabId) return;
        const saveContent = content;
        const success = await saveFile(saveContent, effectiveFileNode);
        setSaveStatus(success ? 'saved' : 'unsaved');
        if (success) {
          lastSavedContentRef.current = saveContent;
          console.log(`✏️ [Onrivi Guard] 자동 저장 완료 (${autoSave}초)`);
          // 자동 저장 후 현재 탭의 isModified 상태를 false로 복구 (불필요한 re-render 방어)
          setTabs(prev => {
            const currentTab = prev.find(t => t.id === activeTabIdRef.current);
            if (!currentTab || (!currentTab.isModified && currentTab.content === saveContent)) return prev;
            return prev.map(t =>
              t.id === activeTabIdRef.current ? { ...t, isModified: false, content: saveContent } : t
            );
          });
        } else {
          lastSavedContentRef.current = '';
        }
      }, autoSave * 1000); // 🕒 설정된 초(seconds) 기반 디바운스
      return () => clearTimeout(timer);
    }
  }, [content, autoSave, currentFileNode, saveFile, licenseStatus.isActivated, currentFileName]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorFormatting] Monaco 텍스트 삽입 및 서식 조작 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] insertAtCursor/scrollToLine/wrapSelection/insertLink/표 변환/미디어 편집/접두사/quickWrap/날짜 삽입/AI 초안 적용을 useEditorFormatting으로 분리 위임
  // ====================================================================
  const {
    insertAtCursor,
    findLineNumberByHeading,
    scrollToLine,
    insertBlockTag,
    wrapSelection,
    insertLink,
    parseHtmlTableToMarkdown,
    sanitizePastedText,
    fixMarkdownTable,
    replaceDocumentMedia,
    editDocumentMedia,
    applyLinePrefix,
    removePrefix,
    quickWrap,
    handleInsertFormattedDate,
    handleAIDraftApply,
  } = useEditorFormatting({
    editorRef,
    previewRef,
    lastSelectionRef,
    contentRef,
    activeTabIdRef,
    previewModeRef,
    visualFormulaInsertRef,
    visualMediaInsertRef,
    visualCommandRef,
    isRestrictedUser,
    showToast,
    updateContent,
    setTabs,
    setEditingImageInfo,
    setIsImageModalOpen,
    setMediaDialogSource,
    setIsMapModalOpen,
    setYoutubeInitialUrl,
    setIsYoutubeModalOpen,
    setIsAIDraftModalOpen,
  });
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0051] MainEditorApp.tsx ➔ handlePreviewClick
  // 🎯 @KICK  : 미리보기 클릭 시: 에디터를 일치하는 줄로 스크롤, 미리보기에서 줄 강조
  // 🛡️ @GUARD : 중첩 요소 처리를 위해 DOM closest [data-line] 순회
  // 🚨 @PATCH : None
  // 🔗 @CALLS : scrollToLine, element.closest, classList.add/remove
  // ====================================================================
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const lineEl = target.closest('[data-line]');
    if (lineEl) {
      const lineStr = lineEl.getAttribute('data-line');
      if (lineStr) {
        const lineNumber = parseInt(lineStr, 10);
        scrollToLine(lineNumber);
        const bookColumn=Number((lineEl as HTMLElement).dataset.bookStartColumn || 1);
        if (bookColumn>1 && editorRef.current) {
          editorRef.current.setPosition({lineNumber,column:bookColumn});
          editorRef.current.revealPositionInCenter?.({lineNumber,column:bookColumn});
        }

        if (previewRef.current) {
          const elements = Array.from(previewRef.current.querySelectorAll('[data-line]'));
          elements.forEach(element => element.classList.remove('preview-highlight-line'));
          flashPreviewHighlight(lineEl as HTMLElement);
        }
      }
    }
  };

  // 💡 [Step 2 리팩토링으로 readFileText, extractHeadings, handleDocFileClick, getDocLinkDefaultLabel, buildDocLinkTarget, handleDocLinkSelect는 useEditorDocLinks로 이관됨]

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0063.1] MainEditorApp.tsx ➔ handleCopyPreviewContent
  // 🎯 @KICK  : 문서보기(VisualDocumentEditor/MarkdownViewer)의 렌더링된 서식 본문을 CSS 인라인 스타일과 함께 클립보드에 안전하게 복사
  // 🛡️ @GUARD : computedStyle 기반 CSS 인라인 주입, dynamicCss 포함, Word/블로그/노션 호환 HTML 조각 및 다중 Fallback 보장
  // 🚨 @PATCH : **2026-10-24** — [CSS 서식 1:1 보존 클립보드 직렬화 엔진(clipboardExport) 연동]:
  //             1) serializeDocumentForClipboard를 연동하여 각 요소의 실제 계산된 CSS(폰트, 크기, 색상, 테두리, 배경, 간격)를 인라인 주입
  //             2) copyFormattedDocumentToClipboard를 통해 Electron native CF_HTML, Web ClipboardItem, execCommand 3중 복사 완비
  // ====================================================================
  const handleCopyPreviewContent = useCallback(async () => {
    if (!previewRef.current) return;
    try {
      // 1) 실제 문서 본문이 렌더링된 타겟 요소 탐색 (.visual-document-surface 우선)
      const targetEl = (
        previewRef.current.querySelector('.visual-document-surface') ||
        previewRef.current.querySelector('.markdown-viewer-root') ||
        previewRef.current.querySelector('.picturebook-root') ||
        previewRef.current.querySelector('.visual-document-editor') ||
        previewRef.current.querySelector('.preview-page-sheet') ||
        previewRef.current
      ) as HTMLElement;

      if (!targetEl) {
        showToast('복사할 본문 요소를 찾을 수 없습니다.', 'warning');
        return;
      }

      // 2) 현재 렌더링된 동적 CSS 추출
      const dynamicCss = document.getElementById('onrivi-dynamic-css')?.textContent || '';

      // 3) 계산된 CSS 스타일을 인라인으로 1:1 주입하여 표준 HTML 조각 및 텍스트 직렬화
      const { fullHtml, cleanText } = serializeDocumentForClipboard(targetEl, dynamicCss);

      if (!cleanText.trim() && !fullHtml.trim()) {
        showToast('복사할 본문 내용이 없습니다.', 'info');
        return;
      }

      // 4) 시스템 클립보드에 다중 Fallback으로 안전하게 복사
      const copied = await copyFormattedDocumentToClipboard(fullHtml, cleanText);

      if (copied) {
        showToast('CSS 서식이 적용된 문서 내용이 클립보드에 복사되었습니다.', 'success');
      } else {
        throw new Error('클립보드 접근이 차단되었거나 복사 명령이 실패했습니다.');
      }
    } catch (err) {
      console.error('[handleCopyPreviewContent] Copy failed:', err);
      showToast('클립보드 복사에 실패했습니다.', 'error');
      throw err;
    }
  }, [showToast]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0064] MainEditorApp.tsx ➔ resolveClipboardImage
  // 🎯 @KICK  : 클립보드에서 이미지 Blob/File 추출 (items → files → native read → navigator.clipboard 순)
  // 🛡️ @GUARD : 모든 경로 실패 시 null 반환, 성공 시 Blob 반환; dataUrlToBlob 인라인 변환으로 CSP connect-src 차단 방어
  // 🚨 @PATCH : **2026-09-11** — dataUrlToBlob 순수 JS 바이너리 변환 헬퍼 적용 (CSP fetch 거부 방어 및 스크린샷 캡처 즉각 복원)
  // 🔗 @CALLS : 없음
  // ====================================================================
  // 📊 [OMD-HOOK-useEditorPaste] 클립보드 붙여넣기 및 이미지 저장 파이프라인 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 클립보드 이미지 파싱 및 저장을 useEditorPaste로 450줄 분리 위임
  // ====================================================================
  const {
    handlePasteImageFile,
    handleEditorPaste,
    insertImageMarkdown,
    handlePasteImageFileRef,
    isImageLikeFile,
  } = useEditorPaste({
    editorRef,
    lastSelectionRef,
    contentRef,
    rootFolderRef,
    activeTabIdRef,
    currentFileNodeRef,
    currentFileNode,
    tabsRef,
    resourceFolderHandle,
    showToast,
    updateContent,
    insertAtCursor,
    sanitizePastedText,
    parseHtmlTableToMarkdown,
    fixMarkdownTable,
  });

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0067] MainEditorApp.tsx ➔ processedContent_lineMap
  // 🎯 @KICK  : 미리보기를 위해 마크다운 콘텐츠를 전처리하고 스크롤 동기화를 위한 라인 매핑 생성
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : preprocessMarkdownForPreview
  // ====================================================================

  const { processedContent, lineMap, frontmatterLines } = useMemo(() => {
    const res = preprocessMarkdownForPreview(previewContent);
    return {
      processedContent: res.text,
      lineMap: res.lineMap,
      frontmatterLines: res.frontmatterLines
    };
  }, [previewContent]);

  // 💡 [frontmatter 라인 수 ref 동기화] useMemo 결과(frontmatterLines)를 ref에 반영하여
  // useMonacoSetup 클로저 내부에서 항상 최신 frontmatter 오프셋을 참조할 수 있도록 합니다.
  useEffect(() => {
    frontmatterLinesRef.current = frontmatterLines;
  }, [frontmatterLines]);

  // 💡 [실시간 타이핑 및 콘텐츠 갱신 시 미리보기 스크롤 즉시 추종 보장]
  // 사용자가 에디터 하단이나 마지막 행에서 타이핑할 때, 새 행/문단이 DOM에 렌더링된 직후
  // 현재 커서 위치의 문단 끝(elementBottom)이 미리보기 Safe Zone(BOTTOM_SAFE) 안에 안정적으로 보이도록 동기화합니다.
  useLayoutEffect(() => {
    if (previewMode !== 'both' || !previewRef.current || !editorRef.current) return;
    if (isScrollingRef.current === 'preview' || previewRef.current.querySelector('.visual-document-editor')) return;
    // 💡 [그림책 스크롤 튐 방어] 그림책 모드일 때는 사용자가 미리보기 영역에서 직접 보고 있거나 편집 모드를 토글할 때
    // 모나코 에디터의 이전 커서 라인(예: 1라인)으로 미리보기 스크롤이 강제 튕김 현상을 방지합니다.
    if (previewRef.current.querySelector('.picturebook-root')) return;

    const currentPos = editorRef.current.getPosition?.();
    if (currentPos && currentPos.lineNumber) {
      const currentContent = editorRef.current.getValue?.() || contentRef.current;
      syncPreviewToTargetLine(previewRef.current, currentPos.lineNumber, currentContent, { column: currentPos.column });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedContent, previewMode]);

  const handlePreviewImageLoaded = useCallback(() => {
    if(previewRef.current?.querySelector('.visual-document-editor'))return;
    // 💡 이미지 비동기 로딩 완료 시 최신 높이에 맞춰 위치 1회 미세 보정
    if (previewRef.current && editorRef.current && isScrollingRef.current !== 'preview') {
      if (previewRef.current.querySelector('.book-page[data-line]')) {
        const line = Number(previewRef.current.dataset.bookSyncLine);
        if (line > 0) syncPreviewToTargetLine(previewRef.current, line, contentRef.current);
        return;
      }
      const p = editorRef.current.getPosition?.();
      if (p && p.lineNumber) {
        const c = editorRef.current.getValue?.() || contentRef.current;
        syncPreviewToTargetLine(previewRef.current, p.lineNumber, c, { column: p.column });
      }
    }
  }, []);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0041] MainEditorApp.tsx ➔ previewHighlightLine
  // 🎯 @KICK  : 분할 모드에서 에디터의 activeLine과 일치하는 미리보기 줄 강조
  // 🛡️ @GUARD : 중복 방지를 위해 모든 강조 먼저 제거, .onrivi-line 최우선 매칭으로 문단 내 개별 행 단독 하이라이트
  // 🚨 @PATCH : 2026-09-06 - [문단 내 커서 위치 행 단독 하이라이트]
  //             1) .onrivi-line 클래스 요소를 최우선 타깃으로 선택하여 상위 p 태그 승격 차단
  //             2) exact match 및 closestCandidate에서 문단 내 특정 행 1:1 하이라이트 보장
  //             3) processedContent 의존성 추가로 새 이미지/미디어/문단 삽입 렌더링 즉시 하이라이트 재동기화
  // 🔗 @CALLS : element.classList.add/remove
  // ====================================================================
  useEffect(() => {
    if (!previewRef.current) return;

    const previewContainer = previewRef.current;
    const elements = Array.from(previewContainer.querySelectorAll('[data-line]')) as HTMLElement[];
    elements.forEach(element => element.classList.remove('preview-highlight-line'));

    if (previewMode !== 'both' || !activeLine) return;

    const blockSelectors = '.onrivi-line, figure, p, li, blockquote, tr, h1, h2, h3, h4, h5, h6, pre, iframe, video, .table-wrapper-area, .codeblock-area, .map-embed-wrapper';

    // 1. exact match (activeLine과 정확히 일치하는 요소) 최우선 탐색
    const exactMatches = elements.filter(el => {
      const l = parseInt(el.getAttribute('data-line') || '-1', 10);
      return l === activeLine;
    });

    let targetEl: HTMLElement | null = null;

    if (exactMatches.length > 0) {
      // 💡 .onrivi-line이 존재할 경우 문단 전체(p)로 승격하지 않고 커서가 위치한 개별 행을 최우선 타깃으로 선택
      const lineMatch = exactMatches.find(el => el.classList.contains('onrivi-line'));
      if (lineMatch) {
        targetEl = lineMatch;
      } else {
        // 💡 [중첩 리스트 최심층 자식 요소 우선 선택]
        // exactMatches 중에 부모 요소(ol, ul, 부모 li)와 자식 요소(자식 li)가 공존할 경우,
        // 다른 일치 요소를 자식으로 포함하지 않는 가장 깊은 자식 엘리먼트를 선택합니다.
        const leafMatches = exactMatches.filter(el => !exactMatches.some(other => other !== el && el.contains(other)));
        const candidate = leafMatches.find(el => el.matches(blockSelectors)) || leafMatches[0] || exactMatches[0];
        targetEl = candidate.matches(blockSelectors) ? candidate : ((candidate.closest(blockSelectors) as HTMLElement) || candidate);
      }
    } else {
      // 2. exact match가 없으면 activeLine 이하 중 가장 가까운(최대값) 요소를 탐색
      let maxLine = -1;
      let closestCandidates: HTMLElement[] = [];
      elements.forEach(element => {
        const lineStr = element.getAttribute('data-line');
        if (lineStr) {
          const line = parseInt(lineStr, 10);
          if (line <= activeLine) {
            if (line > maxLine) {
              maxLine = line;
              closestCandidates = [element];
            } else if (line === maxLine) {
              closestCandidates.push(element);
            }
          }
        }
      });
      if (closestCandidates.length > 0) {
        const lineMatch = closestCandidates.find(el => el.classList.contains('onrivi-line'));
        if (lineMatch) {
          targetEl = lineMatch;
        } else {
          const leafCandidates = closestCandidates.filter(el => !closestCandidates.some(other => other !== el && el.contains(other)));
          const candidate = leafCandidates.find(el => el.matches(blockSelectors)) || leafCandidates[0] || closestCandidates[0];
          targetEl = candidate.matches(blockSelectors) ? candidate : ((candidate.closest(blockSelectors) as HTMLElement) || candidate);
        }
      }
    }

    if (targetEl) {
      return flashPreviewHighlight(targetEl);
    }
  }, [activeLine, previewMode, processedContent]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0068] MainEditorApp.tsx ➔ dynamicCssString
  // 🎯 @KICK  : 활성 CSS 프로필에서 타이포그래피, 코드 블록, 표, 체크박스, 구분선, 다크모드 재정의를 포함한 동적 CSS 생성
  // 🛡️ @GUARD : 기본 프로필은 빈 문자열 반환; blockquote, hr, color에 대한 다크모드 재정의; h2-h6 font-size 건너뜀(자동 계산)
  // 🚨 @PATCH : **2026-09-17** — [다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 시인성 보장]: 코드블록 배경색(bgColor)의 명도를 판별하여 다크 계열일 경우 은은한 갈색 대신 고대비 코발트 블루(rgba(59,130,246,0.3)) 및 1px 인셋 아웃라인(rgba(96,165,250,0.65))을 동적 주입하여 어두운 배경에서도 활성 행이 즉각 식별되도록 개선; 박스 중첩 아티팩트 방지를 위한 codeBlock 중첩 border/background 투명 재정의
  // 🚨 @PATCH : 추가 CSS가 !important를 쓰거나 MarkdownViewer에서 재주입돼도 설정창의 선언이 이기도록 캐스케이드 계층을 분리한다.
  // 🔗 @CALLS : None
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0068] MainEditorApp.tsx ➔ dynamicCssString
  // 🎯 @KICK  : 활성 CSS 프로필에서 타이포그래피, 코드 블록, 표, 체크박스, 구분선, 다크모드 재정의를 포함한 동적 CSS 생성
  // 🛡️ @GUARD : 기본 프로필은 빈 문자열 반환; dynamicCssGenerator로 분리 위임
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] dynamicCssString 생성 로직을 dynamicCssGenerator.ts로 1,234줄 분리 위임
  // 🔗 @CALLS : generateDynamicCss
  // ====================================================================
  const dynamicCssString = useMemo(() => {
    return generateDynamicCss(profiles, activeProfileId, previewMode, isStyleModalOpen);
  }, [profiles, activeProfileId, previewMode, isStyleModalOpen]);

  const handlers = useEditorHandlers({
    editorRef,
    previewModeRef,
    contentRef,
    currentFileNameRef,
    currentFileNodeRef,
    workspaceTypeRef,
    rootFolderRef,
    lastSavedContentRef,
    currentFileParentHandleRef,
    profiles,
    activeProfileId,
    isDarkMode,
    dynamicCssString,
    preferLiveProfile: previewMode === 'css-style' || isStyleModalOpen,
    setSaveStatus,
    setCurrentFileName,
    setCurrentFileNode,
    setRootFolder,
    setWorkspaceType,
    setIsSidebarOpen,
    setIsExportModalOpen,
    setIsYoutubeModalOpen,
    setIsMapModalOpen,
    setIsTableModalOpen,
    setIsFormulaModalOpen,
    setIsSearchOpen,
    setIsLicenseModalOpen,
    setIsSettingsModalOpen,
    setIsImageModalOpen,
    setIsReferenceModalOpen,
    setEditingImageInfo,
    setSettingsModalInitialTab,
    setFontSize,
    setHelpTitle,
    setHelpContent,
    setIsHelpModalOpen,
    setFloatingToolbar,
    setPromptConfig,
    showToast,
    refreshFileList,
    updateContent,
    wrapSelection,
    insertAtCursor,
    applyLinePrefix,
    removePrefix,
    insertLink,
    quickWrap,
    insertBlockTag,
    setShowDocLinkPicker,
    sanitizePastedText,
    isComposingRef,
    previewRef,
    createNewTab,
    switchTab,
    setTabs,
    activeTabIdRef,
    licenseStatusRef,
    lastSelectionRef,
    tabsRef,
    saveFile
  });

  handlersRef.current = handlers;
  useEffect(() => {
    if (!pendingVisualExportRef.current || directEditEnabled || previewMode !== 'preview' || previewContent !== content) return;
    const frame = requestAnimationFrame(() => {
      if (!previewRef.current?.querySelector('.markdown-viewer-root')) return;
      const type = pendingVisualExportRef.current;
      pendingVisualExportRef.current = null;
      const actions = { PRINT: 'print', EXPORT_HTML: 'exportHTML', EXPORT_EPUB: 'exportEPUB', EXPORT_PNG: 'exportPNG', EXPORT_DOCX: 'exportDOCX', EXPORT_HWPX: 'exportHWPX', OPEN_EXPORT: 'openExport' };
      const action = actions[type!];
      if (action) {
        Promise.resolve(handlersRef.current[action]()).finally(() => {
          if (type !== 'OPEN_EXPORT') setDirectEditEnabled(true);
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [directEditEnabled, previewMode, content, previewContent]);
  useEffect(() => {
    if (!isExportModalOpen && !pendingVisualExportRef.current && !directEditEnabled) {
      setDirectEditEnabled(true);
    }
  }, [isExportModalOpen, directEditEnabled]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorDocumentSession] 에디터 세션 복원 및 외부 파일 열기 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 세션 복원/자동저장/IPC/openExternalFile을 useEditorDocumentSession으로 445줄 분리 위임
  // ====================================================================
  const {
    desktopSessionReady,
    sessionRestoredRef,
    restoreSessionTabs,
    openExternalFile,
  } = useEditorDocumentSession({
    mounted,
    tabs,
    tabsRef,
    setTabs,
    activeTabId,
    activeTabIdRef,
    setActiveTabId,
    content,
    contentRef,
    setContent,
    updateContent,
    createNewTab,
    switchTab,
    currentFileNode,
    currentFileNodeRef,
    setCurrentFileNode,
    currentFileName,
    setCurrentFileName,
    previewMode,
    previewModeRef,
    setPreviewMode,
    handleFileClick,
    handleFileOpenByPath,
    rootFolder,
    workspaceType,
    fileList,
    isDriveConnected,
    isDriveAuthExpired,
    isRestrictedUser,
    editorRef,
    showToast,
    handlers,
    sessionRestoringRef,
  });

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorSaveActions] 에디터 파일 저장 및 새 문서 생성 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 로컬/웹드라이브 저장 및 새 문서 생성을 useEditorSaveActions로 237줄 분리 위임
  // ====================================================================
  const {
    handleSaveToLocal,
    handleSaveToWebDrive,
    handleCreateNewDocument,
    transferProgress,
  } = useEditorSaveActions({
    isRestrictedUser,
    isDuplicateInstance,
    isLicenseChecking,
    editorRef,
    contentRef,
    currentFileName,
    setCurrentFileName,
    rootFolder,
    refreshFileList,
    showToast,
    createNewTab,
    setCurrentFileNode,
    lastSavedContentRef,
    setSaveStatus,
    lastGeneralPreviewModeRef,
    setPreviewMode,
    setIsNewDocumentModalOpen,
  });

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorCommands] 에디터 통합 명령 디스패처 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] dispatchCommand를 useEditorCommands로 435줄 분리 위임
  // ====================================================================
  const { dispatchCommand } = useEditorCommands({
    isRestrictedUser,
    handlers,
    previewModeRef,
    previewRef,
    visualCommandRef,
    editorRef,
    executingVisualSourceActionRef,
    currentFileNodeRef,
    pendingVisualExportRef,
    emojiTargetRef,
    activeTabIdRef,
    youtubeEditRangeRef,
    handleInsertFormattedDate,
    handleSaveToWebDrive,
    handleSaveToLocal,
    setPreviewMode,
    insertAtCursor,
    removePrefix,
    quickWrap,
    selectResourceFolder,
    selectRootFolder,
    showToast,
    setPreviewFindReplaceMode,
    setDirectEditEnabled,
    setIsPreviewFindOpen,
    setMonacoDatePickerPos,
    setIsMonacoDatePickerOpen,
    setIsStyleModalOpen,
    setIsCitationModalOpen,
    setIsReferenceModalOpen,
    setIsSettingsModalOpen,
    setSettingsModalInitialTab,
    setIsHelpModalOpen,
    setIsLicenseModalOpen,
    setFloatingToolbar,
    setIsEmojiPanelOpen,
    setAiEditorContext,
    setAiDraftInitialMode,
    setIsAIDraftModalOpen,
    setIsToolbarOpen,
    setIsSidebarOpen,
    setThemePalette,
    setIsDarkMode,
    setIsMergeMode,
    setIsNewDocumentModalOpen,
    rootFolder,
    directEditEnabled,
    previewMode,
    setPreviewZoomScale,
    setSidebarTab,
    setIsSearchOpen,
    activeTabId,
    geminiApiKey,
    setYoutubeInitialUrl,
    setIsCalendarModalOpen,
  });


  // 🖨️ [인쇄 / 쪽 윤곽 모달 직결 이벤트 수신]
  useEffect(() => {
    const handleOpenPrint = () => {
      dispatchCommand('OPEN_EXPORT');
    };
    window.addEventListener('onrivi:open-print', handleOpenPrint);
    return () => window.removeEventListener('onrivi:open-print', handleOpenPrint);
  }, [dispatchCommand]);

  // 💡 [OMD-EDIT-MainEditorApp-0071] mapIdToCommandType는 @/types/editorCommand로 분리 이관
  const mapIdToCommandType = useCallback((id: string): EditorCommandType => {
    return importedMapIdToCommandType(id);
  }, []);

  useEffect(() => {
    const pending = visualSourceActionRef.current;
    if (!pending || !isEditorReady || content !== pending.source) return;
    if (pending.tabId !== activeTabId || isRestrictedUser) { visualSourceActionRef.current = null; return; }
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!model) return;
    if (model.getValue() !== pending.source) {
      model.setValue(pending.source);
    }
    const frame = requestAnimationFrame(() => {
      if (activeTabIdRef.current !== pending.tabId) return;
      const from = model.getPositionAt(pending.from);
      const to = model.getPositionAt(pending.to);
      editor.setSelection({ startLineNumber: from.lineNumber, startColumn: from.column,
        endLineNumber: to.lineNumber, endColumn: to.column });
      lastSelectionRef.current = editor.getSelection();
      visualSourceActionRef.current = null;
      executingVisualSourceActionRef.current = true;
      try { dispatchCommand(mapIdToCommandType(pending.id)); }
      finally { executingVisualSourceActionRef.current = false; }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTabId, content, dispatchCommand, isEditorReady, isRestrictedUser, mapIdToCommandType, previewMode]);

  // 💡 [Rule 3 비즈니스 로직 훅] Monaco 및 전역 단축키 처리를 useEditorKeybindings로 위임
  useEditorKeybindings({
    editorRef,
    customHotkeys,
    isEditorReady,
    dispatchCommand,
    mapIdToCommandType,
    geminiApiKey,
    showToast,
    previewModeRef,
    activeTabIdRef,
    contentRef,
    setAiEditorContext,
    setAiDraftInitialMode,
    setIsAIDraftModalOpen,
    floatingToolbar,
    setFloatingToolbar,
    floatingQuoteDropdown,
    isRestrictedUser
  });

  // 🛡️ [데스크톱/브라우저 전역 파일 드롭 방어]
  // 에디터나 미리보기 컨테이너 외부(사이드바, 타이틀바 등)에 파일 드롭 시 Electron/브라우저가 파일 URL로 새창을 띄우거나 페이지 이동하는 것 100% 원천 차단
  useEffect(() => {
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    window.addEventListener('dragenter', preventDrag, true);
    window.addEventListener('dragover', preventDrag, true);
    window.addEventListener('drop', preventDrag, true);
    document.addEventListener('dragenter', preventDrag, true);
    document.addEventListener('dragover', preventDrag, true);
    document.addEventListener('drop', preventDrag, true);
    return () => {
      window.removeEventListener('dragenter', preventDrag, true);
      window.removeEventListener('dragover', preventDrag, true);
      window.removeEventListener('drop', preventDrag, true);
      document.removeEventListener('dragenter', preventDrag, true);
      document.removeEventListener('dragover', preventDrag, true);
      document.removeEventListener('drop', preventDrag, true);
    };
  }, []);

  // 💡 플로팅 툴바 인용구 Alert 드롭다운 외부 클릭 시 자동 닫힘 감지기
  useEffect(() => {
    if (!floatingQuoteDropdown.open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#floating-quote-dropdown-container') && !target.closest('#floating-quote-dropdown-fixed')) {
        setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
      }
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    return () => window.removeEventListener('mousedown', handleOutsideClick, true);
  }, [floatingQuoteDropdown.open]);

  // 날짜/시간 형식 팝업은 툴바 밖을 클릭하거나 Escape를 누르면 닫습니다.
  useEffect(() => {
    if (!dateTimeFormatDropdown.open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent) {
        const target = event.target as HTMLElement;
        if (target.closest('#datetime-format-trigger') || target.closest('#datetime-format-dropdown-fixed')) return;
      }
      setDateTimeFormatDropdown(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('mousedown', close, true);
    window.addEventListener('keydown', close, true);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('keydown', close, true);
    };
  }, [dateTimeFormatDropdown.open]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0074] MainEditorApp.tsx ➔ toc
  // 🎯 @KICK  : 마크다운 제목에서 목차를 생성하고 코드 블록은 건너뜁니다
  // 🛡️ @GUARD : BOM 문자를 제거하고 코드 블록 펜스를 감지하여 오탐을 방지합니다
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const toc = useMemo(() => {
    if (typeof content !== 'string') return [];
    // 윈도우 스타일의 개행(\r\n)과 일반 개행(\n) 모두를 안전하게 분리
    const lines = content.split(/\r?\n/);
    const items: { id: string, text: string, level: number, lineNumber: number }[] = [];
    const codeBlockMask = getCodeBlockLineMask(lines);
    const headingNumber = createHeadingNumberer(activeProfileId === 'default' ? [] : (profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE).headingNumbering);
    lines.forEach((line, index) => {
      if (codeBlockMask[index]) return;
      const trimmed = line.trim();

      // UTF-8 BOM(\ufeff)을 제거하고, 양쪽 공백이 정리된 깨끗한 텍스트로 헤더를 매칭
      const cleanLine = trimmed.replace(/^\ufeff/, '');
      const match = cleanLine.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
          let text = match[2].trim();
          
          // 💡 개요(TOC)에서 마크다운 태그가 그대로 노출되는 현상 방지
          text = text.replace(/\*\*(.*?)\*\*/g, '$1') // 굵게 **
                     .replace(/__(.*?)__/g, '$1') // 굵게 __
                     .replace(/\*(.*?)\*/g, '$1') // 기울임 *
                     .replace(/_(.*?)_/g, '$1') // 기울임 _
                     .replace(/~~(.*?)~~/g, '$1') // 취소선 ~~
                     .replace(/`(.*?)`/g, '$1') // 인라인 코드
                     .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 링크 [텍스트](URL) -> 텍스트
                     .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // 이미지 ![텍스트](URL) -> 텍스트
                     .replace(/<[^>]*>?/gm, ''); // HTML 태그 제거
                     
          const marker = headingNumber(level, text);
          if (marker) text = marker + ' ' + text;
          const lineNumber = index + 1;
        items.push({
          id: `toc-line-${lineNumber}`,
          text,
          level,
          lineNumber
        });
      }
    });
    return items;
  }, [content, profiles, activeProfileId]);

  const heightClass = 'h-[calc(100vh-128px)]';
  const activeTab = tabs.find(t => t.id === activeTabId);
  // 🛡️ [EMBEDDED WELCOME 2026-07-07] 제한사용자 — licenseStatus로 직접 판단.
  // 탭/콘텐츠/activeTabId 상태와 무관하게 강제로 embedded 환영 페이지를 렌더링합니다.
  const showEmbeddedWelcome = false;
  const openTabPaths = useMemo(() => tabs.map(t => t.path).filter(Boolean) as string[], [tabs]);

  const contextValue = {
    content, setContent,
    tabs, setTabs,
    activeTabId, setActiveTabId,
    previewMode, setPreviewMode,
    isA4GuardEnabled, setIsA4GuardEnabled,
    currentFileName, setCurrentFileName,
    currentFileNode, setCurrentFileNode,
    workspaceType, setWorkspaceType,
    rootFolder, setRootFolder,
    resourceFolder, resourceFolderHandle,
    fileList, setFileList,
    dispatchCommand,
    isDarkMode, setIsDarkMode,
    themePalette, handleThemeChange,
    licenseStatus: effectiveLicenseStatus, isExpired: effectiveLicenseStatus.isExpired,
    isAddonEnv, editorRef, previewRef, showToast, openTabPaths, refreshFileList,
    driveLetter, profiles, activeProfileId, onSelectProfile: handleProfileChange, onOpenStyleSettings: () => setIsStyleModalOpen(true), DEFAULT_PROFILE: (window as any).DEFAULT_PROFILE || {},
    saveStatus, isToolbarOpen, setIsToolbarOpen, isSidebarOpen, setIsSidebarOpen, isActivated: (!isDuplicateInstance && effectiveLicenseStatus.isActivated), THEME_MAP,
    isDuplicateInstance, takeOverControl, isEditorPlan,
    cursorLine,
    cursorColumn,
    switchTab, closeTab, createNewTab,
    isSearchOpen, setIsSearchOpen,
    sidebarWidth, setSidebarWidth, sidebarTab, setSidebarTab,
    setCurrentFileName, lastSavedContentRef, toc, scrollToLine, openFile: handleFileClick,
    askConfirm: (config: any) => setConfirmConfig({ isOpen: true, ...config }),
    isMergeMode, setIsMergeMode, selectedMergeNodes, setSelectedMergeNodes, toggleMergeNodeSelect,
    onOpenMergeModal: handleOpenMergeModal, onSelectRootFolder: () => selectRootFolder('current', null),
    onRestoreFolder: restoreFolderPermission,
    isHelpModalOpen, setIsHelpModalOpen, helpTitle, setHelpTitle, helpContent, setHelpContent,
    tabs,
    geminiApiKey,
    aiModelName,
    setAiModelName,
    setIsAIDraftModalOpen,
    isAiButtonVisible,
    setIsAiButtonVisible,
    isRestrictedUser,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveConnected,
    isDriveAuthExpired
  };

  const { handleMount } = useMonacoSetup({
    editorRef, tabsRef, activeTabIdRef, contentRef, isComposingRef, previewDebounceRef,
    setContent, setTabs, activeTabId, setSaveStatus, currentFileNodeRef, lastSavedContentRef,
    saveFile, autoSaveRef, previewModeRef, previewRef, isScrollingRef, scrollTimeoutRef,
    isEditorReady, setIsEditorReady, themePalette, EDITOR_THEMES, updateDecorations,
    decorationsCollectionRef, isEditorHovered, prevCursorLineRef, frontmatterLinesRef,
    setActiveLine, setCursorLine, setCursorColumn, tabSizeRef, setFloatingToolbar, lastSelectionRef,
    completionProviderRef, getSlashCommands, customSlashCommandsRef,
    handleEditorPaste, handlePasteImageFile,
    wikilinkProviderRef, docLinkFilesRef, readFileTextRef, extractHeadings, getRelativePath,
    isEditorMountedRef, updateContent, editorFontWeight, isRestrictedUser
  });

  // 💡 [Step 2 리팩토링으로 docLinkPickerStyle 계산 로직은 useEditorDocLinks 내부로 이관됨]



  return (
    <>
      <style>{`
        .ai-changed-highlight {
          background-color: rgba(168, 85, 247, 0.25) !important;
          animation: ai-flash-fade 1.5s ease-out forwards;
        }
        @keyframes ai-flash-fade {
          0% { background-color: rgba(168, 85, 247, 0.35); }
          100% { background-color: rgba(168, 85, 247, 0); }
        }
        .ai-stream-pulse {
          animation: ai-pulse-bg 2s infinite ease-in-out;
        }
        @keyframes ai-pulse-bg {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .mic-pulse {
          animation: mic-pulse-anim 1.5s infinite;
        }
        @keyframes mic-pulse-anim {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
        }
      `}</style>
      <EditorProvider value={contextValue}>
        {/* ⏳ [게스트 즉시 체험 만료 가입 유도 모달 차단막] */}
        {isGuestMode && isGuestExpired && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-6 select-none" translate="no">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl text-center transform scale-100 transition-all duration-300">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⏱️</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 flex items-center justify-between gap-2">
                <span>정식으로 회원가입 후 사용하세요</span>
                {typeof window !== 'undefined' && (
                  window.location.hostname.includes('localhost') || 
                  window.location.hostname.includes('127.0.0.1') || 
                  window.location.port === '3100' ||
                  process.env.NODE_ENV === 'development'
                ) && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('onrivi_guest_expired');
                      localStorage.removeItem('onrivi_guest_start_time');
                      localStorage.setItem('onrivi_guest_try_count', '0');
                      setIsGuestExpired(false);
                      setGuestRemainingSeconds(300);
                      window.location.reload();
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline bg-transparent border-none cursor-pointer font-normal flex-shrink-0"
                    title="개발자 전용 체험 횟수 초기화"
                  >
                    테스트용 리셋
                  </button>
                )}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">
                동일 브라우저당 허용되는 <strong>5회 체험 접속</strong>을 모두 사용하셨거나, <strong>5분 편집 제한 시간</strong>이 경과하였습니다. 작성하신 소중한 원고는 브라우저에 임시 안전 보관 중입니다. 계속해서 원고를 이어서 작성하고 무제한 클라우드 백업 및 AI 어시스턴트를 활용하시려면 지금 가입하세요!
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    localStorage.removeItem('onrivi_guest_mode');
                    localStorage.removeItem('onrivi_guest_start_time');
                    window.location.href = '/signup';
                  }}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition duration-150 shadow-md cursor-pointer border-none text-center"
                >
                  3초 만에 무료 회원가입
                </button>
                {/* 🌟 접속 횟수가 5회 미만일 때만 '체험판 계속하기' 단추 노출 (5회 완료 시 완전 차단) */}
                {(() => {
                  const currentTryCount = typeof window !== 'undefined' ? parseInt(localStorage.getItem('onrivi_guest_try_count') || '0', 10) : 0;
                  if (currentTryCount < 5) {
                    return (
                      <button
                        onClick={() => {
                          localStorage.removeItem('onrivi_guest_expired');
                          localStorage.removeItem('onrivi_guest_start_time');
                          
                          // 🌟 계속하기 클릭 역시 새로운 5분 세션을 시작하는 행위이므로 접속 카운트를 1회 추가 소진(증가)시킵니다!
                          const nextCount = currentTryCount + 1;
                          localStorage.setItem('onrivi_guest_try_count', nextCount.toString());

                          setIsGuestExpired(false);
                          setGuestRemainingSeconds(300);
                          setLicenseStatus({
                            isActivated: true,
                            isExpired: false,
                            remainingDays: 999,
                            userId: 'GUEST_USER',
                            licenseKey: 'GUEST_LICENSE_KEY',
                            paymentNo: 'GUEST_PAYMENT_NO',
                            planName: '체험판 게스트 요금제',
                            nextPaymentDate: '2999-12-31'
                          });
                        }}
                        className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold rounded-xl transition duration-150 cursor-pointer border-none text-center"
                      >
                        체험판 계속하기
                      </button>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={() => {
                    localStorage.removeItem('onrivi_guest_mode');
                    localStorage.removeItem('onrivi_guest_start_time');
                    window.location.href = '/';
                  }}
                  className="w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 font-semibold border border-zinc-200 dark:border-zinc-800 rounded-xl transition duration-150 cursor-pointer text-center"
                >
                  홈페이지 가기
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
                <a 
                  href="/" 
                  onClick={() => {
                    localStorage.removeItem('onrivi_guest_mode');
                    localStorage.removeItem('onrivi_guest_start_time');
                  }}
                  className="flex items-center gap-2 hover:opacity-85 transition-opacity"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#10B981" />
                  </svg>
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                    Onrivi Author
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}

        <EditorLayout
          mounted={mounted}
          isDarkMode={isDarkMode}
          isDuplicateInstance={isDuplicateInstance}
          isEditorPlan={isEditorPlan}
          licenseStatus={licenseStatus}
          isTakingOver={isTakingOver}
          handleTakeover={handleTakeover}
          activeMainView={activeMainView}
          setActiveMainView={setActiveMainView}
          resourceFolder={resourceFolder}
          resourceFolderHandle={resourceFolderHandle}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          aiModelName={aiModelName}
          setAiModelName={setAiModelName}
          fileList={fileList}
          bottomBar={isAiButtonVisible && (
            <InlineAIAssistant
              documentId={activeTabId}
              disabled={!activeTabId || isRestrictedUser || currentFileName === '도움말.md'}
              disabledReason={!activeTabId ? '문서를 먼저 열거나 새 문서를 만들어 주세요.' : isRestrictedUser ? '현재 문서 편집 권한이 제한되어 있습니다. 로그인·인증 및 동시 접속 상태를 확인해 주세요.' : currentFileName === '도움말.md' ? '도움말은 수정할 수 없습니다. 작성할 문서를 열어 주세요.' : undefined}
              legacyKey={ensureDecryptedApiKey(geminiApiKey)}
              legacyModel={aiModelName}
              nickname={userNickname}
              resourceFolder={resourceFolder}
              resourceHandle={resourceFolderHandle}
              readDocument={() => editorRef.current?.hasTextFocus() ? editorRef.current.getValue() : contentRef.current}
              capture={(scope) => {
                if (resolveEffectiveDocumentProfile(contentRef.current).layout) {
                  if (previewModeRef.current !== 'preview' && editorRef.current?.hasTextFocus()) return captureMonacoAITarget(editorRef.current, activeTabIdRef.current || '', () => activeTabIdRef.current, scope);
                  if (scope === 'reference') return null;
                  throw Error('그림책은 질문·문서 정리를 사용할 수 있습니다. 문구 수정은 마크다운 편집창에서 글을 선택한 뒤 실행해 주세요.');
                }
                if(scope==='auto'){if(visualAITargetRef.current&&previewRef.current?.querySelector('.visual-document-editor'))return visualAITargetRef.current(scope);if(editorRef.current?.hasTextFocus()&&!editorRef.current.getSelection()?.isEmpty())return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,'selection');throw Error('문서 전체 수정은 문서보기에서 편집을 켠 뒤 실행해 주세요.');}
                if(scope==='document'){if(visualAITargetRef.current&&previewRef.current?.querySelector('.visual-document-editor'))return visualAITargetRef.current(scope);throw Error('문서 전체 수정은 문서보기에서 편집을 켠 뒤 실행해 주세요.');}
                if (editorRef.current?.hasTextFocus()) return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,scope);
                if (previewRef.current?.querySelector('.visual-document-editor') && visualAITargetRef.current) return visualAITargetRef.current(scope);
                if (previewModeRef.current === 'preview') throw Error('문서 편집을 켠 뒤 글을 선택해 주세요.');
                return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,scope);
              }}
              onSettings={() => {setSettingsModalInitialTab('general');setIsSettingsModalOpen(true);}}
              isToolbarOpen={isToolbarOpen}
            />
          )}
        >
                    {/* 💡 [Rule 3 Core 영역] 에디터/미리보기 분할화면 본체를 EditorCore로 위임 */}
          <EditorCore
            isGuestMode={isGuestMode}
            isGuideMinimized={isGuideMinimized}
            setIsGuideMinimized={setIsGuideMinimized}
            guestRemainingSeconds={guestRemainingSeconds}
            guideStep={guideStep}
            setGuideStep={setGuideStep}
            formatTime={formatTime}
            webBasePath={webBasePath}
            setWebBasePath={setWebBasePath}
            showEmbeddedWelcome={showEmbeddedWelcome}
            handleFileOpenByPath={handleFileOpenByPath}
            handleDocFileClick={handleDocFileClick}
            handleMount={handleMount}
            fontSize={fontSize}
            editorFontWeight={editorFontWeight}
            editorHighContrast={editorHighContrast}
            wordWrap={wordWrap}
            spellCheck={spellCheck}
            editorTabSize={editorTabSize}
            contentRef={contentRef}
            activeTabIdRef={activeTabIdRef}
            previewModeRef={previewModeRef}
            isScrollingRef={isScrollingRef}
            scrollTimeoutRef={scrollTimeoutRef}
            handlersRef={handlersRef}
            handlers={handlers}
            updateContent={updateContent}
            insertAtCursor={insertAtCursor}
            insertImageMarkdown={insertImageMarkdown}
            handleCheckboxToggle={handleCheckboxToggle}
            handleCopyPreviewContent={handleCopyPreviewContent}
            handlePasteImageFile={handlePasteImageFile}
            handlePreviewImageLoaded={handlePreviewImageLoaded}
            editDocumentMedia={editDocumentMedia}
            isImageLikeFile={isImageLikeFile}
            dynamicCssString={dynamicCssString}
            lineMap={lineMap}
            processedContent={processedContent}
            previewContent={previewContent}
            previewZoomScale={previewZoomScale}
            setPreviewZoomScale={setPreviewZoomScale}
            isPreviewFindOpen={isPreviewFindOpen}
            setIsPreviewFindOpen={setIsPreviewFindOpen}
            previewFindReplaceMode={previewFindReplaceMode}
            setPreviewFindReplaceMode={setPreviewFindReplaceMode}
            bindPreviewScrollContainer={bindPreviewScrollContainer}
            isPreviewHovered={isPreviewHovered}
            bibContent={bibContent}
            customSlashCommands={customSlashCommands}
            customHotkeys={customHotkeys}
            directEditEnabled={directEditEnabled}
            setDirectEditEnabled={setDirectEditEnabled}
            visualAITargetRef={visualAITargetRef}
            visualCommandRef={visualCommandRef}
            visualDocLinkInsertRef={visualDocLinkInsertRef}
            visualDocLinkPositionRef={visualDocLinkPositionRef}
            visualFloatingOriginRef={visualFloatingOriginRef}
            visualFormulaInsertRef={visualFormulaInsertRef}
            visualImageInsertRef={visualImageInsertRef}
            visualMediaInsertRef={visualMediaInsertRef}
            visualSourceActionRef={visualSourceActionRef}
            floatingToolbar={floatingToolbar}
            setFloatingToolbar={setFloatingToolbar}
            floatingToolbarRef={floatingToolbarRef}
            floatingHeadingLevel={floatingHeadingLevel}
            setFloatingHeadingLevel={setFloatingHeadingLevel}
            setFloatingQuoteDropdown={setFloatingQuoteDropdown}
            executeFloatingItem={executeFloatingItem}
            showDocLinkPicker={showDocLinkPicker}
            setShowDocLinkPicker={setShowDocLinkPicker}
            docLinkPickerStyle={docLinkPickerStyle}
            docLinkSearchText={docLinkSearchText}
            setDocLinkSearchText={setDocLinkSearchText}
            allMdFiles={allMdFiles}
            isDocLinkLoading={isDocLinkLoading}
            selectedDocNode={selectedDocNode}
            setSelectedDocNode={setSelectedDocNode}
            docHeadings={docHeadings}
            setDocHeadings={setDocHeadings}
            isHeadingLoading={isHeadingLoading}
            docHeadingSearchText={docHeadingSearchText}
            setDocHeadingSearchText={setDocHeadingSearchText}
            docLinkCustomTitle={docLinkCustomTitle}
            setDocLinkCustomTitle={setDocLinkCustomTitle}
            setIsDocLinkTitleManuallyEdited={setIsDocLinkTitleManuallyEdited}
            closeDocLinkPicker={closeDocLinkPicker}
            handleDocLinkSelect={handleDocLinkSelect}
            getDocLinkDefaultLabel={getDocLinkDefaultLabel}
            buildDocLinkTarget={buildDocLinkTarget}
            setIsCitationModalOpen={setIsCitationModalOpen}
            setIsReferenceModalOpen={setIsReferenceModalOpen}
            setIsStyleModalOpen={setIsStyleModalOpen}
            setIsFormulaModalOpen={setIsFormulaModalOpen}
            setIsMapModalOpen={setIsMapModalOpen}
            setIsYoutubeModalOpen={setIsYoutubeModalOpen}
            setIsImageModalOpen={setIsImageModalOpen}
            setEditingImageInfo={setEditingImageInfo}
            setMediaDialogSource={setMediaDialogSource}
            setYoutubeInitialUrl={setYoutubeInitialUrl}
            setFormulaModalInitialLatex={setFormulaModalInitialLatex}
            setCursorLine={setCursorLine}
            setCursorColumn={setCursorColumn}
            resolveEffectiveDocumentProfile={resolveEffectiveDocumentProfile}
            autoClosingBrackets={autoClosingBrackets}
          />

            {isEmojiPanelOpen && (
              <EmojiPanel
                onClose={() => setIsEmojiPanelOpen(false)}
                isToolbarOpen={isToolbarOpen}
                onInsert={emoji => {
                  const target = emojiTargetRef.current;
                  if (!target || target.tabId !== activeTabIdRef.current) {
                    setIsEmojiPanelOpen(false);
                    return;
                  }
                  if (target.visual) {
                    visualCommandRef.current?.('INSERT_TEXT:' + emoji);
                  } else {
                    const editor = editorRef.current;
                    if (!editor) return;
                    if (target.selection) editor.setSelection(target.selection);
                    editor.focus();
                    editor.executeEdits('emoji-panel', [{ range: editor.getSelection(), text: emoji, forceMoveMarkers: true }]);
                    target.selection = editor.getSelection();
                  }
                }}
              />
            )}
            {isToolbarOpen && (
              <div className="no-print h-full w-12 flex flex-col justify-end bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700/60 pb-3">
                <Toolbar documentEditing={directEditEnabled && !!activeTabId && !isRestrictedUser && currentFileName !== '도움말.md'} />
              </div>
            )}
        </EditorLayout>

          {/* 💡 [Rule 3 Manager 영역] 모든 모달 및 플로팅 오버레이를 EditorOverlayManager로 통합 위임 */}
          <EditorOverlayManager
            modals={{
              isSettingsModalOpen, setIsSettingsModalOpen,
              settingsModalInitialTab, setSettingsModalInitialTab,
              isStyleModalOpen, setIsStyleModalOpen,
              isExportModalOpen, setIsExportModalOpen,
              isImageModalOpen, setIsImageModalOpen,
              editingImageInfo, setEditingImageInfo,
              isMergeModalOpen, setIsMergeModalOpen,
              isYoutubeModalOpen, setIsYoutubeModalOpen,
              youtubeInitialUrl, setYoutubeInitialUrl,
              isLicenseModalOpen, setIsLicenseModalOpen,
              isHelpModalOpen, setIsHelpModalOpen,
              isFormulaModalOpen, setIsFormulaModalOpen,
              isReferenceModalOpen, setIsReferenceModalOpen,
              promptConfig, setPromptConfig,
              confirmConfig, setConfirmConfig,
              isMapModalOpen, setIsMapModalOpen,
              isTableModalOpen, setIsTableModalOpen,
              isCitationModalOpen, setIsCitationModalOpen,
              isResourceGuideModalOpen,
              setIsResourceGuideModalOpen: (open: boolean) => {
                setIsResourceGuideModalOpen(open);
                if (!open) {
                  setIsDismissedGuide(true);
                }
              }
            }}
            deps={{
              isDarkMode, setIsDarkMode, fontSize, setFontSize, editorTabSize, setEditorTabSize, spellCheck, setSpellCheck, wordWrap, setWordWrap,
              autoSave, setAutoSave, rootFolder, selectRootFolder, driveLetter, setDriveLetter,
              workspaceType, setWorkspaceType, previewMode, setPreviewMode, customHotkeys, setCustomHotkeys,
              customSlashCommands, setCustomSlashCommands, licenseKey, setLicenseKey, themePalette, handleThemeChange,
              isActivated, autoClosingBrackets, setAutoClosingBrackets,
              editorFontWeight, setEditorFontWeight, editorHighContrast, setEditorHighContrast,
              geminiApiKey, setGeminiApiKey, aiModelName, setAiModelName,
              licenseStatus, deviceId, handleSuccessActivation, handlers, content, bibContent, activeTabId, currentFileNodeRef,
              setCurrentFileName, setCurrentFileNode, lastSavedContentRef, setSaveStatus, refreshFileList,
              showToast, editorRef, insertAtCursor, lastSelectionRef, setIsMergeMode, selectedMergeNodes, setSelectedMergeNodes,
              formulaModalInitialLatex,
              handleFileClick, profiles, activeProfileId, dynamicCssString, setActiveProfileId: handleProfileChange, setProfiles,
              isSystemProfileId,
              getApiUrl,
              DEFAULT_PROFILE,
              SYSTEM_PROFILES,
              vfsCreateFile,
              vfsWriteFile,
              vfsCreateFolder,
              helpTitle, helpContent, setHelpContent,
              resourceFolder, resourceFolderRef, resourceFolderHandle, selectResourceFolder, clearResourceFolder,
              userNickname, setUserNickname,
              updateContent,
              replaceDocumentMedia: (range,path,alt) => {
                const escaped = alt.replace(/([\[]])/g,'\$1');
                if (!replaceDocumentMedia(range,`![${escaped}](${path.includes(' ')?'<'+path+'>':path})`)) showToast('문서가 변경되었습니다. 다시 선택해 주세요.','warning');
              },
              mediaDialogSource,
              clearMediaDialog: () => {setMediaDialogSource(null);visualMediaInsertRef.current=null;},
              insertVisualMedia: (kind,code) => {
                const target = visualMediaInsertRef.current;
                if (!target || target.kind !== kind || target.documentId !== activeTabIdRef.current || !target.insert(code)) {
                  showToast('문서나 미디어 위치가 변경되었습니다. 다시 선택해 주세요.','warning');
                }
                setMediaDialogSource(null); visualMediaInsertRef.current=null;
              },
              replaceVisualImage: (range, path, alt, fullMarkdown) => {
                if (range.documentId !== activeTabIdRef.current || !visualImageInsertRef.current?.(path, alt, fullMarkdown)) {
                  showToast('문서나 이미지 위치가 변경되었습니다. 사진을 다시 선택해 주세요.', 'warning');
                }
                visualImageInsertRef.current = null;
              },
              replacePicturebookImage: (range, path, alt) => {
                if (range.documentId !== activeTabIdRef.current) { showToast('문서가 변경됐습니다. 그림을 다시 선택해 주세요.', 'warning'); return; }
                try {
                  const next = replaceSceneImage(contentRef.current,range.bookSceneIndex,path,alt,range.originalSceneRaw);
                  contentRef.current = next;
                  updateContent(next);
                  setTabs(previous => previous.map(tab => tab.id === activeTabIdRef.current ? {...tab,content:next,isModified:true} : tab));
                } catch(error) { showToast(error.message,'warning'); }
              }
            }}
            aiDraft={{
              isOpen: isAIDraftModalOpen,
              onClose: () => setIsAIDraftModalOpen(false),
              onApply: handleAIDraftApply,
              geminiApiKey: geminiApiKey || '',
              aiModelName: aiModelName || 'gemini-3.8-flash',
              onModelChange: (newModel) => setAiModelName?.(newModel),
              initialMode: aiDraftInitialMode,
              editorContext: {
                selectedText: aiEditorContext?.selectedText ?? (editorRef.current && !editorRef.current.getSelection()?.isEmpty() ? editorRef.current.getModel()?.getValueInRange(editorRef.current.getSelection()!) : '') ?? '',
                fullText: aiEditorContext?.fullText || editorRef.current?.getModel()?.getValue() || contentRef.current || content || '',
              },
              resourceFolder,
              resourceFolderHandle,
              rootFolder
            }}
            calendar={{
              isOpen: isCalendarModalOpen,
              onClose: () => setIsCalendarModalOpen(false),
              onInsert: handleInsertFormattedDate,
              isDarkMode
            }}
            newDocument={{
              isOpen: isNewDocumentModalOpen,
              onClose: () => setIsNewDocumentModalOpen(false),
              fileList,
              rootFolder,
              workspaceType,
              onConfirm: handleCreateNewDocument,
              isDarkMode
            }}
            dateTimePicker={{
              isOpen: isMonacoDatePickerOpen,
              position: monacoDatePickerPos,
              onClose: () => setIsMonacoDatePickerOpen(false),
              onInsert: handleInsertFormattedDate,
              isDarkMode
            }}
            floatingQuote={{
              dropdown: floatingQuoteDropdown,
              setDropdown: setFloatingQuoteDropdown,
              executeFloatingItem,
              dispatchCommand
            }}
            misc={{
              transferProgress,
              mounted,
              isMobile,
              isAiLoading,
              isRecording,
              setIsRecording,
              showToast,
              insertAtCursor
            }}
          />
      </EditorProvider>
    </>
  );
}
