/**
 * 프로그램명 : OnriviAuthor 
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
import { captureEditorSession, readEditorSession, matchesSessionTab, SessionTab, isPlaceholderWarning } from '@/lib/editorSession';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient'; // 지식 베이스 클라이언트
import { preprocessMarkdownForPreview, stripFrontmatter, getCodeBlockLineMask } from "@/lib/editorUtils"; // 마크다운 프리뷰
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from "@/lib/syncEngine"; // 동기화 엔진
import { configuredHotkeyItem, getSlashCommands, getDefaultHotkeys, getDefaultCommands, TOOLBAR_ITEMS } from "@/lib/toolbarConfig"; // 툴바 설정
import { EDITOR_THEMES, THEME_MAP, applySafeMarkdownMonarchTokenizer } from "@/lib/editorThemes"; // 에디터 테마
import { CssProfile } from "@/types/cssProfile"; // css 프로필 타입
import { DEFAULT_PROFILE, SYSTEM_PROFILES, isSystemProfileId, normalizeCssProfile, resolveCssProfile } from "@/constants/cssProfile"; // 기본 프로필
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
import AboutModal from '@/components/AboutModal'; // 모달
import LicenseModal from '@/components/LicenseModal'; // 라이선스 모달
import AIDraftModal from '@/components/AIDraftModal'; // 초안 생성 모달
import CalendarModal from '@/components/CalendarModal'; // 달력 모달
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import { supabase } from '@/lib/supabaseClient';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { loadResourceAICredentials, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import UnifiedTabBar, { EditorTab } from '@/components/UnifiedTabBar';
import * as utilsPasteHandlers from '@/utils/pasteHandlers';
import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import * as utilsEditorActions from '@/utils/editorActions';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useEditorSettings } from '@/hooks/useEditorSettings';
import { useEditorHandlers } from '@/hooks/useEditorHandlers';
import { useFileExplorer } from '@/hooks/useFileExplorer';

// ====================================================================
// 🚀 [리팩토링 V2 이관 준비] 새로 생성된 모듈 Import
// 기존 하드코딩된 상태와 뷰를 이 파일들로 점진적으로 마이그레이션해야 합니다.
// ====================================================================
import { useEditorAuth } from '@/hooks/editor/useEditorAuth';
import { useEditorModals } from '@/hooks/editor/useEditorModals';
// import EditorLayout from '@/components/editor/layout/EditorLayout';
// import EditorCore from '@/components/editor/core/EditorCore';
import ModalManager from '@/components/editor/modals/ModalManager';
import NewDocumentModal from '@/components/NewDocumentModal';
import { transferDocument } from '@/lib/documentTransfer';
import { extractFrontmatter, updateCssProfileInFrontmatter } from '@/lib/frontmatter';
import { documentBookProfile, writeBookProfileSnapshot, legacyBookProfile, parseBookScenes, replaceSceneImage } from '@/lib/picturebook';
import { KnowledgeHubView } from '@/components/knowledge/KnowledgeHubView';
import { useSingleTabGuard } from '@/lib/singleTabGuard';
import { saveExternalFileHandle } from '@/lib/storage/externalFileStore';
import { PreviewToolbar } from '@/components/preview/PreviewToolbar';
import { PreviewFindWidget } from '@/components/preview/PreviewFindWidget';
import { fetchUserProfiles, persistUserProfiles, getEffectiveResourceFolder, getProfileResourceFolder } from '@/lib/profileStorage';
import { setProfileReadStatus } from '@/lib/profileReadStatus';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  readDriveFileContent,
  uploadDriveImage,
  initDriveTokenAutoRefresh,
  hasValidDriveToken,
  prepareGoogleDriveAuth
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

export type EditorCommandType =
  | 'NEW_FILE' | 'OPEN_FILE' | 'SAVE' | 'SAVE_AS' | 'OPEN_WORKSPACE'                   //① 파일 시스템 및 입출력 제어 (OS I/O Message)
  | 'PRINT' | 'EXPORT_HTML' | 'EXPORT_EPUB' | 'EXPORT_PNG' | 'EXPORT_DOCX' | 'EXPORT_HWPX' | 'EXIT'                    //② 출력(Export) 및 종료  
  | 'UNDO' | 'REDO' | 'FIND' | 'REPLACE' | 'ZOOM_IN' | 'ZOOM_OUT'                      //③ 편집 및 보기 제어
  | 'GLOBAL_SEARCH' | 'TOGGLE_HELP' | 'ERASER' | 'BOLD' | 'ITALIC'                       //④ 스타일 적용
  | 'STRIKETHROUGH' | 'INLINE_CODE' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6'                 //⑤ 스타일 적용
  | 'HR' | 'ORDERED_LIST' | 'UNORDERED_LIST' | 'QUOTE' | 'QUOTE_NOTE' | 'QUOTE_TIP' | 'QUOTE_IMPORTANT' | 'QUOTE_WARNING' | 'QUOTE_CAUTION' | 'CHECKLIST'                   //⑥ 스타일 적용
  | 'LINK' | 'IMAGE' | 'VIDEO' | 'MAP' | 'TABLE' | 'CODE' | 'LATEX' | 'CLEAN_DOC'       //⑦ 스타일 적용
  | 'YOUTUBE' | 'NOW' | 'CODE_BLOCK' | 'CHART' | 'MATH' | 'SETTINGS'                  //⑧ 스타일 적용
  | 'ABOUT' | 'LICENSE' | 'TOGGLE_FLOATING_TOOLBAR' | 'OPEN_EXPORT' | 'REMOVE_PREFIX' | 'LIST' | 'CHECK' | 'COPY_ALL'  //⑨ 스타일 적용
  | 'TOGGLE_TOOLBAR' | 'TOGGLE_SIDEBAR' | 'TOGGLE_MODE' | 'TOGGLE_THEME'                  //⑩ 스타일 적용 
  | 'WRAP_H1' | 'WRAP_H2' | 'WRAP_H3' | 'WRAP_QUOTE' | 'WRAP_CODE'                       // ⑪ 스타일 적용 
  | 'TOGGLE_CSS_STYLE' | 'SETTINGS_SHORTCUTS' | 'SETTINGS_ACCOUNT' | 'SELECT_RESOURCE_FOLDER'                                                                // ⑫ 스타일 적용 
  | 'FOOTNOTE' | 'ORGANIZE_FOOTNOTES'                                                                         // ⑬ 각주 삽입 
  | 'INSERT_TABLE_ROW' | 'DELETE_TABLE_ROW'                                               // ⑭ 표 행 편집 명령
  | 'DOCLINK'                                                                          // ⑮ 문서링크
  | 'MERGE'                                                                             // ⑯ 파일 병합
  | 'AI_HELP'                                                                           // ⑰ AI 글쓰기 도우미
  | 'ADD_REFERENCE' | 'CITE' | 'CITATION'                                               // ⑱ 참조 파일 추가 및 인용문헌
  | 'AI_DRAFT' | 'OPEN_AI_WRITER' | 'SLASH_COMMAND' | 'AUTO_RENUMBER' | 'SIGNATURE';

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
      showToast('에디터 로드 실패. 오프라인 모드로 안전 복구합니다.', 'warning');
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

// ====================================================================
// 📊 [OMD-FILE-MainEditorApp-0001] MainEditorApp.tsx ➔ getMdFiles
// 🎯 @KICK  : FileNode 트리를 순회하여 모든 .md 파일을 재귀적으로 수집합니다
// 🛡️ @GUARD : None
// 🚨 @PATCH : **2026-08-20** 하단 툴바에 가려지지 않도록 preview-page-sheet 및 custom-preview-container 하단 여백(padding-bottom) 대폭 확대.
// 🚨 @PATCH : None
// 🔗 @CALLS : None
// ====================================================================
const getMdFiles = (nodes: FileNode[]): FileNode[] => {
  const result: FileNode[] = [];
  const traverse = (list: FileNode[]) => {
    for (const node of list) {
      if (node.kind === 'file') {
        const ext = node.name.split('.').pop()?.toLowerCase();
        if (ext === 'md' && node.path) {
          result.push(node);
        }
      } else if (node.kind === 'directory' && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
};

// ====================================================================
// 📊 [OMD-FILE-MainEditorApp-0002] MainEditorApp.tsx ➔ fetchAllMdFiles
// 🎯 @KICK  : 멀티 플랫폼 비동기 파일 트리 스캔: 브라우저(scanDirectoryDeep & WASM 지식 DB), 로컬/Electron 및 열린 탭 전 환경 마크다운 통합 수집
// 🛡️ @GUARD : visited Set 무한 디렉토리 루프 방지, NFC 정규화 및 슬래시 표준화 기반 중복 제거, 📗 지식 문서 뱃지 태깅
// 🚨 @PATCH : **2026-09-12** — [웹 환경 문서 연결 검색 완벽 지원] 브라우저 FileSystemDirectoryHandle 하위 미확장 폴더 scanDirectoryDeep 심층 재귀 스캔, Web WASM SQLite 지식 보관함 문서(knowledgeClient.listDocuments) 실시간 병합, 열린 탭 및 VFS 통합
// 🔗 @CALLS : scanDirectoryDeep, knowledgeClient.listDocuments, getMdFiles, getVfsFiles, api.listDirectory
// ====================================================================
const fetchAllMdFiles = async (
  workspaceType: string,
  fileList: FileNode[],
  rootFolder: { name: string; handle?: any } | null,
  resourceFolder?: string | null,
  resourceFolderHandle?: any,
  currentFileNode?: FileNode | null,
  tabs?: any[]
): Promise<FileNode[]> => {
  const api = (window as any).electronAPI;
  const fileMap = new Map<string, FileNode>();

  const addToFileMap = (node: FileNode, extra?: Partial<FileNode & { title?: string; isKnowledge?: boolean }>) => {
    if (!node || !node.name) return;
    if (node.kind === 'file') {
      const ext = node.name.split('.').pop()?.toLowerCase();
      if (ext !== 'md' && ext !== 'markdown') return;
    } else {
      return;
    }
    const normPath = (node.path || '').replace(/\\/g, '/').toLowerCase();
    const pathSegments = normPath.split('/');
    const excludedDirs = ['out', '.next', '.next-web-build', 'dist', 'build', 'release', 'node_modules', '_dev_api_backup', '.vscode', '.idea', 'scratch'];
    if (pathSegments.some(seg => excludedDirs.includes(seg))) return;
    const currentNorm = (currentFileNode?.path || '').replace(/\\/g, '/').toLowerCase();
    const isCurrentInHelp = currentNorm.includes('docs/help/') || currentNorm.includes('/help/') || currentNorm.startsWith('help/');
    const isHelpFile = normPath.startsWith('docs/help/') || normPath.includes('/docs/help/') ||
                       normPath.startsWith('frontend/public/help/') || normPath.includes('/frontend/public/help/') ||
                       normPath.startsWith('public/help/') || normPath.includes('/public/help/') ||
                       /^(?:00_시작하기|help-\d+)/i.test(node.name || '');
    if (!isCurrentInHelp && isHelpFile) return;
    if (isCurrentInHelp && (normPath.includes('/public/help/') || normPath.startsWith('public/help/'))) {
      // 로컬/데스크톱 작업장에서 docs/help와 public/help 복제본 동시 노출 방어
      return;
    }
    const rawKey = (node.path || node.name).replace(/\\/g, '/').toLowerCase().normalize('NFC');
    if (!fileMap.has(rawKey)) {
      fileMap.set(rawKey, { ...node, ...extra });
    } else if (extra) {
      const existing = fileMap.get(rawKey)!;
      fileMap.set(rawKey, { ...existing, ...extra });
    }
  };

  const addTreeNodes = (nodes: FileNode[]) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.kind === 'file') {
        addToFileMap(node);
      } else if (node.kind === 'directory' && Array.isArray(node.children)) {
        addTreeNodes(node.children);
      }
    }
  };

  // 1. 브라우저(Web) 환경 수집: FileSystemDirectoryHandle 심층 재귀 스캔
  if (workspaceType === 'browser') {
    if (rootFolder?.handle) {
      try {
        const deepFiles = await scanDirectoryDeep(rootFolder.handle, "", new Set(), false);
        deepFiles.forEach(f => addToFileMap(f));
      } catch (e) {
        console.warn('[fetchAllMdFiles] scanDirectoryDeep failed:', e);
      }
    }

    // 메모리 트리 및 가상 파일 시스템(VFS) 병합
    addTreeNodes(fileList);

    try {
      const vfsFiles = getVfsFiles();
      if (Array.isArray(vfsFiles)) {
        vfsFiles.forEach((f: any) => {
          addToFileMap({ name: f.name, path: f.path || f.name, kind: 'file' });
        });
      }
    } catch {}
  } else if (workspaceType === 'local') {
    // 2. 데스크톱(Electron) 로컬 워크스페이스 수집
    if (api?.listDirectory && rootFolder?.name) {
      const visited = new Set<string>();
      const scan = async (dirPath: string) => {
        if (visited.has(dirPath)) return;
        visited.add(dirPath);
        try {
          const list: FileNode[] = await api.listDirectory(dirPath);
          for (const item of list) {
            if (item.kind === 'file') {
              const nameLower = item.name.toLowerCase();
              if (nameLower.endsWith('.md') || nameLower.endsWith('.markdown')) {
                addToFileMap(item);
              }
            } else if (item.kind === 'directory' && item.path) {
              const dirName = (item.name || '').toLowerCase();
              const isIgnored = dirName.startsWith('.') || 
                ['node_modules', 'out', 'dist', 'build', 'release', '_dev_api_backup', '.wrangler', '.next-web-build', '.next', '.vscode', '.idea', 'scratch'].includes(dirName);
              if (!isIgnored) {
                await scan(item.path);
              }
            }
          }
        } catch (e: any) {
          if (!e?.message?.includes('ENOENT') && !e?.message?.includes('EPERM')) {
            console.warn('[fetchAllMdFiles] scan error for path:', dirPath, e);
          }
        }
      };

      await scan(rootFolder.name);
    } else {
      try {
        const res = await fetch(getApiUrl(`/api/files?t=${Date.now()}`));
        if (res.ok) {
          const list = await res.json();
          addTreeNodes(list);
        }
      } catch (err) {
        console.error('[fetchAllMdFiles] fetch full files error:', err);
      }
    }
    addTreeNodes(fileList);
  } else {
    addTreeNodes(fileList);
  }

  // 3. 현재 열려 있는 탭(tabs) 병합 (현재 작업 중인 파일 및 미저장 탭 포함)
  if (tabs && Array.isArray(tabs)) {
    tabs.forEach(t => {
      if (t && t.name && (t.name.endsWith('.md') || t.name.endsWith('.markdown')) && (t.path || !Array.from(fileMap.values()).some(f => f.name.toLowerCase().normalize('NFC') === t.name.toLowerCase().normalize('NFC')))) {
        addToFileMap({
          name: t.name,
          path: t.path || t.name,
          kind: 'file',
          handle: t.node?.handle
        });
      }
    });
  }

  // 4. 지식 보관함(Knowledge Base) 문서 웹 WASM & 로컬 전면 통합
  try {
    const rfHandle = resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
    const knowDocs = await knowledgeClient.listDocuments({
      resourceFolder,
      resourceFolderHandle: rfHandle
    });
    if (Array.isArray(knowDocs)) {
      for (const doc of knowDocs) {
        if (!doc.filePath && !doc.title) continue;
        const filePath = doc.filePath || `${doc.title}.md`;
        const fileName = filePath.split(/[/\\]/).pop() || `${doc.title}.md`;
        addToFileMap({
          name: fileName,
          path: filePath,
          kind: 'file',
        }, {
          title: doc.title,
          isKnowledge: true
        });
      }
    }
  } catch (err) {
    console.warn('[fetchAllMdFiles] knowledgeClient.listDocuments failed:', err);
  }

  // 5. 로컬스토리지 등록 지식 문서 플래그 동기화
  try {
    const registered = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
    if (Array.isArray(registered)) {
      for (const reg of registered) {
        const normReg = reg.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        for (const [key, node] of fileMap.entries()) {
          if (key.includes(normReg) || normReg.includes(key) || (node.name && node.name.toLowerCase().normalize('NFC') === normReg)) {
            (node as any).isKnowledge = true;
          }
        }
      }
    }
  } catch {}

  return Array.from(fileMap.values());
};

// ====================================================================
// 📊 [OMD-CORE-MainEditorApp-0003] MainEditorApp.tsx ➔ resolveRelativeImagePath
// 🎯 @KICK  : 상대 마크다운 이미지 경로를 절대 경로로 변환, 백슬래시 및 ../.. 세그먼트 정규화
// 🛡️ @GUARD : http/https/data/blob URI, Windows 드라이브 문자, 빈 src 처리
// 🚨 @PATCH : None
// 🔗 @CALLS : None
// ====================================================================
const resolveRelativeImagePath = (srcPath: string, currentFileNodePath: string | undefined): string => {
  if (!srcPath) return "";   // @srcPath : 이미지 경로 

  if (srcPath.startsWith('http://') || srcPath.startsWith('https://') || srcPath.startsWith('data:') || srcPath.startsWith('blob:')) {
    return srcPath;   // @srcPath : 절대 경로 (외부 링크, data URI, blob URI 등) 
  }

  // 💡 [윈도우 절대 경로 및 file:/// URI 방어]
  let normalizedSrc = srcPath.replace(/\\/g, '/');
  if (normalizedSrc.startsWith('file:///')) {
    normalizedSrc = normalizedSrc.replace(/^file:\/\/\//, '');
  }
  const isAbsolute = /^[a-zA-Z]:\//.test(normalizedSrc) || normalizedSrc.startsWith('/');
  if (isAbsolute) {
    return normalizedSrc;
  }

  // @currentFileNodePath : 현재 파일의 노드 경로 
  let baseFolder = "";
  if (currentFileNodePath) {
    const normalizedFile = currentFileNodePath.replace(/\\/g, '/'); // @normalizedFile : 현재 파일의 노드 경로 (정규화)
    const lastSlash = normalizedFile.lastIndexOf('/'); // @lastSlash : 현재 파일의 노드 경로에서 마지막 슬래시의 위치 
    if (lastSlash !== -1) {
      baseFolder = normalizedFile.substring(0, lastSlash); // @baseFolder : 현재 파일의 노드 경로에서 마지막 슬래시 이전의 경로 
    }
  }

  // @cleanSrc : 이미지 경로 (정규화) 
  let cleanSrc = srcPath.replace(/\\/g, '/'); // @cleanSrc : 이미지 경로 (정규화) 
  if (cleanSrc.startsWith('/')) {
    cleanSrc = cleanSrc.substring(1); // @cleanSrc : 이미지 경로 (정규화) 
  }

  if (cleanSrc.startsWith('./')) {
    cleanSrc = cleanSrc.substring(2); // @cleanSrc : 이미지 경로 (정규화) 
  }

  // @finalPath : 이미지 경로 (절대 경로) 
  let finalPath = "";
  if (baseFolder) {
    finalPath = baseFolder + '/' + cleanSrc; // @finalPath : 이미지 경로 (절대 경로) 
  } else {
    finalPath = cleanSrc; // @finalPath : 이미지 경로 (절대 경로) 
  }

  // @segments : 이미지 경로 (분석된 경로) 
  const segments = finalPath.split('/');
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '') continue; // @seg : 이미지 경로 (분석된 경로) 
    if (seg === '..') {
      stack.pop(); // @stack : 이미지 경로 (분석된 경로) 
    } else {
      stack.push(seg); // @stack : 이미지 경로 (분석된 경로) 
    }
  }

  return stack.join('/'); // @stack : 이미지 경로 (분석된 경로) 
};

// ====================================================================
// 📊 [OMD-CORE-MainEditorApp-0004] MainEditorApp.tsx ➔ getRelativePath
// 🎯 @KICK  : 위키 스타일 문서 링크를 위한 두 파일 간 상대 경로 계산
// 🛡️ @GUARD : null fromPath 처리, 절대 경로가 아니면 ./로 시작하도록 보장
// 🚨 @PATCH : None
// 🔗 @CALLS : None
// ====================================================================
const getRelativePath = (fromPath: string | null | undefined, toPath: string): string => {
  if (!fromPath) {
    return toPath.startsWith('/') || toPath.startsWith('.') ? toPath : `./${toPath}`;
  }
  const normFrom = fromPath.replace(/\\/g, '/');
  const normTo = toPath.replace(/\\/g, '/');

  // 💡 [서로 다른 윈도우 드라이브 가드] D: 와 C: 간에는 물리적 상대 경로가 성립하지 않으므로 절대 경로 그대로 반환
  const fromDrive = normFrom.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  const toDrive = normTo.match(/^[a-zA-Z]:/)?.[0]?.toUpperCase();
  if (fromDrive && toDrive && fromDrive !== toDrive) {
    return normTo;
  }

  const fromParts = normFrom.split('/').filter(Boolean);
  const toParts = normTo.split('/').filter(Boolean);

  // 파일명을 제외한 폴더 경로만 추출
  fromParts.pop();

  let commonIndex = 0;
  while (commonIndex < fromParts.length && commonIndex < toParts.length && fromParts[commonIndex] === toParts[commonIndex]) {
    commonIndex++;
  }

  const upCount = fromParts.length - commonIndex;
  const upParts = Array(upCount).fill('..');
  const downParts = toParts.slice(commonIndex);

  const relParts = [...upParts, ...downParts];
  let relPath = relParts.join('/');
  if (!relPath.startsWith('.') && !relPath.startsWith('/')) {
    relPath = './' + relPath;
  }
  return relPath;
};

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
  /*
   * profiles state — CssProfile 배열
   * - 시스템 프로필(SYSTEM_PROFILES)은 항상 앞에 고정
   * - 사용자 프로필: Addon → localStorage, Desktop → electronAPI(userData)
   */
  const [profiles, setProfiles] = useState<CssProfile[]>(() => {
    if (typeof window === 'undefined') return [...SYSTEM_PROFILES];
    // SSR 이후: 시스템 프로필만 우선 세팅, 사용자 프로필은 useEffect에서 비동기 로드
    return [...SYSTEM_PROFILES];
  });
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0007] MainEditorApp.tsx ➔ loadUserProfiles
  // 🎯 @KICK  : 연결된 리소스 폴더의 profiles/userCssProfiles.json에서 사용자 서식 로드
  // 🛡️ @GUARD : 사용자 저장 데이터에서 시스템 프로필 필터링, 레거시 형식 마이그레이션 병합
  // 🚨 @PATCH : **2026-09-26** — [사용자 서식 리소스 폴더 저장 및 데스크탑/웹 일원화]: fetchUserProfiles(profileStorage 파사드) 연동으로 데스크탑·웹 모두 리소스 폴더(profiles/userCssProfiles.json) 단일 진입점으로 100% 통합
  //             2026-08-05 — 웹과 데스크탑 환경 모두 무조건 `profiles/userCssProfiles.json` 경로를 통합하여 서식 로드/저장하도록 표준화.
  // 🔗 @CALLS : fetchUserProfiles, normalizeCssProfile, setProfiles
  // ====================================================================
  const [activeProfileId, setActiveProfileId] = useState<string>(
    () => SYSTEM_PROFILES[0].id
  );
  const [isProfilesLoaded, setIsProfilesLoaded] = useState(false);
  const [isAddonEnv, setIsAddonEnv] = useState(false);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [helpTitle, setHelpTitle] = useState('');
  const helpContentRef = useRef(helpContent);
  helpContentRef.current = helpContent;

  // 🌟 존재하지 않는 삭제된 테마(프로필) ID가 localStorage에 남아있을 경우 
  // 시스템 기본 프로필로 자동 복구하여 테마 찌꺼기를 안전하게 소거합니다.
  useEffect(() => {
    if (isProfilesLoaded && activeProfileId) {
      const exists = profiles.some(p => p.id === activeProfileId);
      if (!exists) {
        setActiveProfileId(SYSTEM_PROFILES[0].id);
      }
    }
  }, [isProfilesLoaded, profiles, activeProfileId]);

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

  // ☁️ [구글 로그인/토큰 갱신 즉시 서식 로드 실시간 연동]
  useEffect(() => {
    const handleDriveTokenUpdate = () => {
      setProfileStorageRevision(revision => revision + 1);
    };
    const handleDriveTokenExpired = () => {
      showToast('☁️ 개인 웹드라이브 인증이 만료되었습니다. 파일 메뉴에서 [개인 웹드라이브 연결]을 눌러 재인증해 주세요.', 'warning');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:drive_token_updated', handleDriveTokenUpdate);
      window.addEventListener('onrivi:drive_token_expired', handleDriveTokenExpired);
      window.addEventListener('onrivi:drive_auth_expired', handleDriveTokenExpired);
      return () => {
        window.removeEventListener('onrivi:drive_token_updated', handleDriveTokenUpdate);
        window.removeEventListener('onrivi:drive_token_expired', handleDriveTokenExpired);
        window.removeEventListener('onrivi:drive_auth_expired', handleDriveTokenExpired);
      };
    }
  }, [showToast]);

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

  const [profileStorageRevision, setProfileStorageRevision] = useState(0);
  const profileStorageRef = useRef<{ folder: string; handle: any; hash: string } | null>(null);
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    profileStorageRef.current = null;
    setIsProfilesLoaded(false);
    let loadRevision = 0;
    const load = async () => {
      const profilesStartedAt = performance.now();
      const requestRevision = ++loadRevision;
      const targetEnv = getResourceEnvironment();
      let folder = getProfileResourceFolder(null, targetEnv);
      setIsProfilesLoaded(false);
      const destination = { environment: targetEnv, folder, folderId: getResourceSettings(targetEnv)?.folderId };
      setProfileReadStatus({ ...destination, state: 'loading' });
      try {
        const api = (window as any).electronAPI;
        if (targetEnv === 'cloud') {
          const token = getSavedDriveToken();
          if (!token) throw new Error('웹드라이브 인증을 갱신해 주세요.');
          const drive = await import('@/lib/gdrive/googleDriveClient');
          // 계정 선택과 폴더 구성은 연결 단계에서 완료한다. 조회 중 재활성화하면
          // 전환 직후 확정된 설정을 이전 요청이 다시 덮어쓸 수 있다.
          const saved = getResourceSettings('cloud');
          const resolved = saved?.folderId
            ? { name: saved.path, folderId: saved.folderId }
            : await drive.resolveDriveResourceFolderByName(token);
          if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
          folder = resolved.name;
          destination.folder = folder;
          destination.folderId = resolved.folderId;
        }
        if (targetEnv === 'local' && api?.ensureLocalEnvironment) {
          const settings = getResourceSettings('local');
          const initialized = await api.ensureLocalEnvironment({
            resourceFolder: settings?.kind === 'local' ? settings.path : undefined,
            workspaceFolder: localStorage.getItem('onrivi_last_local_workspace_path') || (workspaceType === 'local' ? localStorage.getItem('onrivi_workspace_path') : undefined),
            profiles: SYSTEM_PROFILES,
          });
          if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
          if (!initialized?.success) throw new Error(initialized?.error || '로컬 작업 환경 초기화 실패');
          folder = initialized.resourcePath;
          destination.folder = folder;
          saveResourceSettings({ kind: 'local', path: folder }, 'local', { silent: true });
          localStorage.setItem('onrivi_last_local_workspace_path', initialized.workspacePath);
          if (workspaceType !== 'cloud' && !rootFolder?.name) {
            setRootFolder({ name: initialized.workspacePath });
            setWorkspaceType('local');
            localStorage.setItem('onrivi_workspace_path', initialized.workspacePath);
            localStorage.setItem('rootFolder', JSON.stringify({ name: initialized.workspacePath, path: initialized.workspacePath }));
            localStorage.setItem('workspaceType', 'local');
          }
        }
        const readSettings = getResourceSettings(targetEnv);
        const readAccount = localStorage.getItem('onrivi_active_drive_account');
        const users = await fetchUserProfiles(folder, resourceFolderHandle, targetEnv);
        if (cancelled || requestRevision !== loadRevision || getResourceEnvironment() !== targetEnv) return false;
        const currentSettings = getResourceSettings(targetEnv);
        if (currentSettings?.path !== readSettings?.path || currentSettings?.folderId !== readSettings?.folderId ||
            (targetEnv === 'cloud' && localStorage.getItem('onrivi_active_drive_account') !== readAccount)) return false;
        const normalized = users.filter(p => p && p.id !== 'default' && !isSystemProfileId(p.id))
          .map(p => normalizeCssProfile(p, SYSTEM_PROFILES));
        // 로드 자체는 저장하지 않는다. 빈 배열도 이 파일의 유효한 원본 상태이다.
        profileStorageRef.current = { folder, handle: resourceFolderHandle, hash: JSON.stringify(normalized) };
        setProfiles([...SYSTEM_PROFILES, ...normalized]);
        if (resourceFolder !== folder) setResourceFolder(folder);
        setIsProfilesLoaded(true);
        setProfileReadStatus({ ...destination, state: 'success', userCount: normalized.length });
        console.info('[STARTUP timing] profile load ms=%d environment=%s', Math.round(performance.now() - profilesStartedAt), targetEnv);
        return true;
      } catch (error) {
        if (cancelled || requestRevision !== loadRevision) return false;
        console.info('[STARTUP timing] profile load failed after ms=%d', Math.round(performance.now() - profilesStartedAt));
        console.error('[loadUserProfiles] userCssProfiles.json 읽기 실패:', error);
        setProfileReadStatus({ ...destination, state: 'error', error: error instanceof Error ? error.message : '서식 파일을 읽지 못했습니다.' });
        if (folder) {
          showToast(error instanceof Error ? error.message : 'userCssProfiles.json을 읽지 못했습니다. 리소스 폴더 연결과 파일을 확인해 주세요.', 'error');
        }
        return false;
      }
    };
    const reload = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      void load().then(success => detail?.resolve?.(success));
    };
    window.addEventListener('onrivi:reload_profiles', reload);
    void load();
    return () => { cancelled = true; window.removeEventListener('onrivi:reload_profiles', reload); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, resourceFolder, resourceFolderHandle, profileStorageRevision, workspaceType]);

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

  const pendingExternalFileRef = useRef<string | null>(null); // 윈도우 파일 연결 경로 (마운트 전 확보용)
  const sessionRestoredRef = useRef<boolean>(false); // 세션 복원 최초 1회 실행 가드
  const [desktopSessionReady,setDesktopSessionReady]=useState(false);
  const initialSessionCheckedRef=useRef(false);
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

  const [showDocLinkPicker, setShowDocLinkPicker] = useState(false);
  const [docLinkSearchText, setDocLinkSearchText] = useState('');
  const [allMdFiles, setAllMdFiles] = useState<FileNode[]>([]);
  const [isDocLinkLoading, setIsDocLinkLoading] = useState(false);

  // 💡 [다른 문서 헤딩 연결] 헤딩 파싱 및 UI 조작을 위한 상태값
  const [selectedDocNode, setSelectedDocNode] = useState<FileNode | null>(null);
  const [docHeadings, setDocHeadings] = useState<string[]>([]);
  const [isHeadingLoading, setIsHeadingLoading] = useState(false);
  const [docHeadingSearchText, setDocHeadingSearchText] = useState('');
  const [docLinkCustomTitle, setDocLinkCustomTitle] = useState('');
  const [isDocLinkTitleManuallyEdited, setIsDocLinkTitleManuallyEdited] = useState(false);
  const visualDocLinkInsertRef = useRef<((targetUrl: string, displayTitle: string) => boolean) | null>(null);
  const visualDocLinkPositionRef = useRef<{ top: number; left: number } | null>(null);

  const closeDocLinkPicker = useCallback(() => {
    setShowDocLinkPicker(false);
    setDocLinkSearchText('');
    setSelectedDocNode(null);
    setDocHeadings([]);
    setIsHeadingLoading(false);
    setDocHeadingSearchText('');
    setDocLinkCustomTitle('');
    setIsDocLinkTitleManuallyEdited(false);
    visualDocLinkInsertRef.current = null;
    visualDocLinkPositionRef.current = null;
  }, []);

  useModalEscape(showDocLinkPicker, closeDocLinkPicker);
  const visualFormulaInsertRef = useRef<((formula: string) => boolean | void) | null>(null);
  const [formulaModalInitialLatex, setFormulaModalInitialLatex] = useState<string>('');

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0014] MainEditorApp.tsx ➔ loadFilesForDocLinkPicker
  // 🎯 @KICK  : 문서 링크 선택기 열릴 때 모든 .md 파일 로드, 닫힐 때 상태 정리
  // 🛡️ @GUARD : 선택기 닫힐 때 모든 제목/파일 선택 상태 초기화
  // 🚨 @PATCH : None
  // 🔗 @CALLS : fetchAllMdFiles, setAllMdFiles
  // ====================================================================
  useEffect(() => {
    if (showDocLinkPicker) {
      if (!isDocLinkTitleManuallyEdited) {
        let selText = '';
        if (editorRef.current) {
          const editor = editorRef.current;
          let selection = editor.getSelection();
          if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
            selection = lastSelectionRef.current;
          }
          if (selection) {
            selText = editor.getModel()?.getValueInRange(selection)?.trim() || '';
          }
        }
        if (selText) {
          setDocLinkCustomTitle(selText);
          setIsDocLinkTitleManuallyEdited(true);
        }
      }
      const loadFiles = async () => {
        setIsDocLinkLoading(true);
        try {
          const files = await fetchAllMdFiles(
            workspaceType,
            fileList,
            rootFolder,
            resourceFolder,
            resourceFolderHandle,
            currentFileNode,
            tabsRef.current
          );
          setAllMdFiles(files);
          docLinkFilesRef.current = files;
        } catch (e) {
          console.error(e);
        } finally {
          setIsDocLinkLoading(false);
        }
      };
      loadFiles();
    } else {
      setAllMdFiles([]);
      setDocLinkSearchText('');
      setSelectedDocNode(null);
      setDocHeadings([]);
      setIsHeadingLoading(false);
      setDocHeadingSearchText('');
      visualDocLinkInsertRef.current = null;
      visualDocLinkPositionRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDocLinkPicker, workspaceType, fileList, rootFolder, resourceFolder, resourceFolderHandle, currentFileNode]);

  // 📊 [[ 자동완성용 파일 목록 로드
  useEffect(() => {
    if (workspaceType && (fileList.length > 0 || rootFolder?.handle) && !showDocLinkPicker) {
      fetchAllMdFiles(
        workspaceType,
        fileList,
        rootFolder,
        resourceFolder,
        resourceFolderHandle,
        currentFileNode,
        tabsRef.current
      ).then(files => {
        docLinkFilesRef.current = files;
      }).catch(() => { });
    }
  }, [workspaceType, fileList, rootFolder, showDocLinkPicker, resourceFolder, resourceFolderHandle, currentFileNode]);

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
  // ====================================================================
  const loadAndVerifyLicense = useCallback(async () => {
    if (typeof window === 'undefined' || !deviceId) return;
    
    // 🛡️ [무인증 진입 시 자동 게스트 모드 전환 가드]
    // 로그인 세션이 없고 등록된 라이선스 결제 정보도 없는 비인증 사용자가 /editor로 접근한 경우,
    // 로그인 화면으로 튕구는 대신 즉석에서 편리하게 체험할 수 있도록 즉시 게스트 모드로 자동 부팅시켜 줍니다.
    const initialGuestCheck = localStorage.getItem('onrivi_guest_mode') === 'Y';
    const hasPayment = !!localStorage.getItem('onrivi_payment_no');
    const hasLicense = !!localStorage.getItem('onrivi_license_key');
    let hasSession = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) hasSession = true;
    } catch (_) {}

    // 🌟 [정식 회원 로그인 가드] 회원 로그인 세션이 정상적으로 확인되는 경우,
    // 혹시라도 남아 있을 수 있는 게스트 체험판 플래그를 즉시 소멸하여 체험판 작동을 완전히 중단시킵니다!
    if (hasSession) {
      localStorage.removeItem('onrivi_guest_mode');
      localStorage.removeItem('onrivi_guest_expired');
      localStorage.removeItem('onrivi_guest_start_time');
      setIsGuestMode(false);
      setIsGuestExpired(false);
    }

    if (!hasSession && !hasPayment && !hasLicense && !initialGuestCheck) {
      // 🛡️ [비로그인 무단 접근 차단]
      // 데스크톱 앱(Electron)이 아닌 웹 브라우저 환경에서 로그인 아이디도 없고 체험하기 플래그도 없으면 진입 차단!
      if (!(window as any).electronAPI) {
        console.warn('[ONRIVI GUARD] 로그인 세션 또는 라이선스가 없습니다. 에디터 진입을 차단하고 로그인 화면으로 이동합니다.');
        window.location.replace('/login?redirect=/editor');
        return;
      }
    }

    // 🛡️ [게스트 즉시 체험 모드 가드] 게스트 모드로 동작 시 라이선스 검증 스킵하고 활성화 처리
    const isGuestMode = localStorage.getItem('onrivi_guest_mode') === 'Y';
    if (isGuestMode) {
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
      return;
    }

    console.log('[LICENSE] loadAndVerifyLicense START deviceId=%o', deviceId);
    const api = (window as any).electronAPI;
    const isDesktop = !!api;
    let savedKey = '';
    let savedPaymentNo = '';
    let savedUserId = '';
    let savedLastRunTime = 0;

    let savedNextPaymentDate = '';
    let savedLicenseKey = '';
    let savedPlanName = '';

    // A. 스토리지 로드 (로컬스토리지를 최우선 단일 진실 공급원(SSOT)으로 사용)
    savedKey = localStorage.getItem('onrivi_license_key') || '';
    savedUserId = localStorage.getItem('onrivi_user_id') || '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // 🚨 [결함 교정] UUID(session.user.id)로 이메일을 덮어쓰면 서버 verify-desktop에서 NOT_FOUND 발생!
      // 따라서 session.user.email을 최우선으로 취득하고, 없을 때만 fallback
      if (session?.user?.email) {
        savedUserId = session.user.email;
      } else if (!savedUserId && session?.user?.id) {
        savedUserId = session.user.id;
      }
    } catch (e) {}
    savedPaymentNo = localStorage.getItem('onrivi_payment_no') || '';
    savedLastRunTime = parseInt(localStorage.getItem('onrivi_last_run_time') || '0', 10);

    const cachedStatus = loadSecureData<any>('onrivi_license_status');
    if (cachedStatus && cachedStatus.userId === savedUserId) {
      savedNextPaymentDate = cachedStatus.nextPaymentDate || '';
      savedPlanName = cachedStatus.planName || '';
      // 캐시된 라이선스 키가 있으면 병합
      if (!savedKey && cachedStatus.licenseKey) savedKey = cachedStatus.licenseKey;
    }

    if (isDesktop) {
      if (typeof api.loadLicenseFull === 'function') {
        const fullData = await api.loadLicenseFull();
        if (fullData) {
          // 데스크톱 license.json에 유효한 이메일 계정이 있으면 최우선 채택
          if (fullData.userId && fullData.userId.includes('@')) {
            savedUserId = fullData.userId;
          } else if (fullData.userId && !savedUserId) {
            savedUserId = fullData.userId;
          }
          savedLastRunTime = fullData.lastRunTime || savedLastRunTime;
          savedNextPaymentDate = fullData.nextPaymentDate || savedNextPaymentDate;
          savedLicenseKey = fullData.licenseKey || savedKey;
          savedPlanName = fullData.planName || savedPlanName;
        }
      }
    } else {
      savedLicenseKey = savedKey;
    }

    const nowTime = Date.now();

    // B. 시간 조작 가드
    if (savedLastRunTime > 0 && nowTime < savedLastRunTime) {
      showToast("⚠️ 로컬 시스템 시간 조작이 감지되었습니다. 에디터 편집 기능이 제한됩니다.", "error");
      setLicenseStatus(prev => ({
        ...prev, isActivated: false, isExpired: true, planName: '시간 역전 제한 모드'
      }));
      return;
    }

    // ============================================
    // 🚨 데스크탑 전용 로직: 무조건 DB 조회 (USERID + DeviceID)
    // ============================================
    if (isDesktop) {
      // 시스템 실행 시간 갱신 및 기존 라이선스 오프라인 토큰 유지
      if (typeof api.saveLicenseFull === 'function') {
        await api.saveLicenseFull({
          userId: savedUserId,
          lastRunTime: nowTime,
          nextPaymentDate: savedNextPaymentDate,
          licenseKey: savedLicenseKey,
          planName: savedPlanName
        });
      }

      if (!savedUserId) {
        setLicenseStatus({
          isActivated: false, isExpired: true, remainingDays: 0,
          userId: '', licenseKey: '', paymentNo: '',
          planName: '제한사용자', nextPaymentDate: ''
        });
        return;
      }

      try {
        const verifyStartedAt = performance.now();
        const verifyRes = await fetch(getApiUrl('/api/license/verify-desktop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_email: savedUserId, p_device_uuid: deviceId }),
          signal: AbortSignal.timeout(10000)
        });
        console.info('[STARTUP timing] desktop license verification ms=%d', Math.round(performance.now() - verifyStartedAt));
        const data = verifyRes.ok ? await verifyRes.json() : null;
        const error = !verifyRes.ok ? new Error('서버 오류') : null;

        if (error || !data) {
          console.warn('[loadAndVerifyLicense] Desktop verification network error:', error);
          // 오프라인 유예기간(Grace Period) 검증 (네트워크 오류 시에만 작동)
          if (savedNextPaymentDate) {
            const expiryMs = parseDateStringToMs(savedNextPaymentDate);
            const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
            if (remainingDays > 0) {
              console.log('[loadAndVerifyLicense] Offline grace period active. Days remaining:', remainingDays);
              showToast(`네트워크 오프라인 모드로 실행 중입니다. (구독 만료까지 D-${remainingDays})`, "warning");
              setLicenseStatus({
                isActivated: true, isExpired: false, remainingDays,
                userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
                planName: savedPlanName || '오프라인 프리미엄 요금제',
                nextPaymentDate: savedNextPaymentDate
              });
              setIsLicenseChecking(false);
              return;
            }
          }
          setLicenseStatus({
            isActivated: false, isExpired: true, remainingDays: 0,
            userId: savedUserId, licenseKey: '', paymentNo: '',
            planName: '제한사용자', nextPaymentDate: ''
          });
        } else if (!data.success) {
          console.warn('[loadAndVerifyLicense] Desktop verification explicitly rejected:', data.message);
          if (data.code === 'ERR_MAX_DEVICES_EXCEEDED') {
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: data.payment_no || '',
              isRestricted: true,
              isConcurrentLimited: true,
              hasEditorSubscription: true,
              planName: data.message, nextPaymentDate: data.next_payment_date || ''
            });
          } else {
            // 🚨 만약 로컬에 아직 유효기간이 남아있는 라이선스가 있다면, 일시적 식별자 불일치나 네트워크/서버 일시 오류로 즉시 로컬 라이선스를 영구 파기하지 않고 오프라인 유예기간으로 안전하게 보호
            if (savedNextPaymentDate) {
              const expiryMs = parseDateStringToMs(savedNextPaymentDate);
              const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
              if (remainingDays > 0) {
                console.warn('[loadAndVerifyLicense] Desktop verification rejected (' + data.code + '), but local license is valid until ' + savedNextPaymentDate + '. Fallback to offline grace mode.');
                showToast(`서버 라이선스 확인 중 일시적 오류가 발생하여 오프라인 모드로 안전 전환되었습니다. (만료 D-${remainingDays})`, "warning");
                setLicenseStatus({
                  isActivated: true, isExpired: false, remainingDays,
                  userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
                  planName: savedPlanName || '오프라인 프리미엄 요금제',
                  nextPaymentDate: savedNextPaymentDate
                });
                setIsLicenseChecking(false);
                return;
              }
            }

            // 만료일도 지났거나 라이선스가 전혀 없는 경우에만 완전 초기화
            if (typeof api !== 'undefined' && api.saveLicenseFull) {
              await api.saveLicenseFull({});
            }
            localStorage.removeItem('onrivi_license_key');
            localStorage.removeItem('onrivi_payment_no');
            localStorage.removeItem('onrivi_verify_key');
            localStorage.removeItem('onrivi_user_id');
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: '', licenseKey: '', paymentNo: '',
              planName: '제한사용자', nextPaymentDate: ''
            });
          }
        } else {
          const expiryMs = data.next_payment_date ? parseDateStringToMs(data.next_payment_date) : 0;
          const isExpired = expiryMs === 0 ? true : (Date.now() > expiryMs);
          const remainingDays = expiryMs === 0 ? 0 : Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));

          if (isExpired) {
            setLicenseStatus({
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: '',
              planName: '기간 만료 (제한 사용자)', nextPaymentDate: ''
            });

            if (typeof api.saveLicenseFull === 'function') {
              await api.saveLicenseFull({
                userId: savedUserId,
                lastRunTime: Date.now(),
                nextPaymentDate: data.next_payment_date || '',
                licenseKey: '',
                planName: '기간 만료 (제한 사용자)'
              });
            }
            
            localStorage.setItem('onrivi_license_key', '');
            localStorage.setItem('onrivi_last_run_time', Date.now().toString());
            saveSecureData('onrivi_license_status', {
              isActivated: false, isExpired: true, remainingDays: 0,
              userId: savedUserId, licenseKey: '', paymentNo: '',
              planName: '기간 만료 (제한 사용자)', nextPaymentDate: data.next_payment_date || '',
              lastVerifiedAt: Date.now()
            });
          } else {
            const newStatus = {
              isActivated: true, isExpired: false, remainingDays,
              userId: savedUserId, licenseKey: data.license_key || '', paymentNo: data.payment_no || '',
              planName: data.plan_name || '프리미엄 요금제',
              nextPaymentDate: data.next_payment_date || data.trial_end_at || ''
            };

            setLicenseStatus(newStatus);

            // 인증 성공 시 최신 라이선스 정보로 로컬 오프라인 토큰 갱신
            if (typeof api.saveLicenseFull === 'function') {
              await api.saveLicenseFull({
                userId: savedUserId,
                lastRunTime: Date.now(),
                nextPaymentDate: newStatus.nextPaymentDate,
                licenseKey: newStatus.licenseKey,
                paymentNo: newStatus.paymentNo,
                planName: newStatus.planName
              });
            }
            
            // 데스크탑 환경에서도 로컬스토리지를 최신 DB 정보로 완벽하게 동기화 (오프라인 폴백 용도)
            localStorage.setItem('onrivi_license_key', newStatus.licenseKey);
            localStorage.setItem('onrivi_payment_no', newStatus.paymentNo);
            localStorage.setItem('onrivi_user_id', newStatus.userId);
            localStorage.setItem('onrivi_last_run_time', Date.now().toString());
            
            saveSecureData('onrivi_license_status', {
              ...newStatus,
              lastVerifiedAt: Date.now()
            });
          }
        }
      } catch (err) {
        console.warn('[loadAndVerifyLicense] Desktop DB error (Network offline):', err);

        // 🚨 오프라인 유예기간(Grace Period) 검증 🚨
        if (savedNextPaymentDate) {
          const expiryMs = parseDateStringToMs(savedNextPaymentDate);
          const remainingDays = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));

          if (remainingDays > 0) {
            console.log('[loadAndVerifyLicense] Offline grace period active. Days remaining:', remainingDays);
            showToast(`네트워크 오프라인 모드로 실행 중입니다. (구독 만료까지 D-${remainingDays})`, "warning");
            setLicenseStatus({
              isActivated: true, isExpired: false, remainingDays,
              userId: savedUserId, licenseKey: savedLicenseKey, paymentNo: '',
              planName: savedPlanName || '오프라인 프리미엄 요금제',
              nextPaymentDate: savedNextPaymentDate
            });
            return;
          }
        }

        setLicenseStatus({
          isActivated: false, isExpired: true, remainingDays: 0,
          userId: savedUserId, licenseKey: '', paymentNo: '',
          planName: '제한사용자', nextPaymentDate: ''
        });
      }
      return; // 데스크탑은 여기서 검증 완전 종료!
    }

    // ============================================
    // ── 웹 SaaS 전용 기존 로직 ──
    // ============================================
    if (!savedPaymentNo) {
      savedKey = '';
      savedUserId = '';
      savedPaymentNo = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const res = await fetch(getApiUrl('/api/subscription/get'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: session.user.id })
          });
          if (res.ok) {
            const data = await res.json();
            const userSub = data?.subscription;
            if (userSub?.payment_no) {
              savedPaymentNo = userSub.payment_no;
              savedKey = userSub.license_key || '';
              savedUserId = session.user.id;
            }
          }
        }
      } catch (e) {
        console.warn('[loadAndVerifyLicense] user_id fallback failed:', e);
      }
    }

    // chromeStorage.set 로직 완전 제거 (순수 localStorage만 유지)
    localStorage.setItem('onrivi_license_key', savedKey);
    localStorage.setItem('onrivi_user_id', savedUserId);
    localStorage.setItem('onrivi_payment_no', savedPaymentNo);
    localStorage.setItem('onrivi_last_run_time', nowTime.toString());

    if (!savedKey) savedKey = '';
    setLicenseKey(savedKey);

    if (savedPaymentNo) {
      // 🛡️ 웹 전용: savedPaymentNo가 localStorage에 남아있어도 Supabase 세션이 유효한지 다시 확인 (데스크탑은 라이선스 기반, Supabase 불필요)
      const isDesktop = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
      let currentAuthUser: any = null;
      if (!isDesktop) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            clearAuthSessionStorage();
            window.location.href = '/login';
            return;
          }
          currentAuthUser = session.user;
        } catch (_) {
          clearAuthSessionStorage();
          window.location.href = '/login';
          return;
        }
      }
      try {
        // 🚨 @PATCH : 2026-09-16 웹 환경에서는 동일 브라우저의 다중 탭/창을 독립 격리하기 위해 sessionStorage를 우선 사용
        let sessionId = !isDesktop ? (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) : null;
        if (!sessionId) {
          sessionId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
          if (!isDesktop && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('onrivi_tab_session_id', sessionId);
          }
        }
        localStorage.setItem('onrivi_session_id', sessionId);

        let license: any = null;
        if (currentAuthUser?.id) {
          try {
            const subRes = await fetch(getApiUrl('/api/subscription/get'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: currentAuthUser.id })
            });
            if (subRes.ok) {
              const subData = await subRes.json();
              license = subData?.subscription || null;
              if (license?.payment_no) {
                savedPaymentNo = license.payment_no;
                localStorage.setItem('onrivi_payment_no', savedPaymentNo);
                if (license.license_key) {
                  savedKey = license.license_key;
                  localStorage.setItem('onrivi_license_key', savedKey);
                }
              }
            }
          } catch (e) {
            console.warn('[loadAndVerifyLicense] subscription fetch failed:', e);
          }
        }

          if (!license) {
            console.warn('[loadAndVerifyLicense] web: license not found for payment_no. Auto-clearing cache...');
            localStorage.removeItem('onrivi_payment_no');
            localStorage.removeItem('onrivi_license_key');
            localStorage.removeItem('onrivi_session_id');
            return;
          } else {
            let sub = license;
            let currentLicenseId = sub.id;
            let currentPaymentNo = savedPaymentNo;

            let expiryMs = 0;
            if (sub) {
              if (sub.plan_name && (sub.plan_name.toUpperCase() === 'DESKTOP_ONLY' || sub.plan_name.toUpperCase().includes('DESKTOP'))) {
                console.warn('[loadAndVerifyLicense] Desktop plan cannot be used in Web SaaS.');
                setLicenseStatus({
                  isActivated: false, isExpired: true, remainingDays: 0, userId: savedUserId,
                  licenseKey: '', paymentNo: savedPaymentNo || license?.payment_no || '',
                  planName: '데스크탑 전용 플랜 (웹 사용 불가)', nextPaymentDate: ''
                });
                return;
              }
              const targetDate = sub.current_period_end;
              if (targetDate) expiryMs = parseDateStringToMs(targetDate);
              else expiryMs = Number.MAX_SAFE_INTEGER;
              
              if (sub.plan_status === 'FREE' && sub.created_at) {
                if (expiryMs === 0 || expiryMs === Number.MAX_SAFE_INTEGER) {
                  expiryMs = new Date(sub.created_at).getTime() + 14 * 24 * 60 * 60 * 1000;
                }
              }
            }

            let isExpired = expiryMs === 0 ? true : (Date.now() > expiryMs);

            // 🚨 @PATCH : 만료된 경우 API를 호출하여 상태를 EXPIRED로 변경하고 새로운 READER 발급
            if (isExpired && sub.plan_status !== 'EXPIRED') {
              try {
                const expireRes = await fetch(getApiUrl('/api/subscription/expire'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ p_subscription_id: sub.id, p_user_id: savedUserId })
                });
                const expireData = await expireRes.json();
                if (expireData.success && expireData.new_subscription_id) {
                  currentLicenseId = expireData.new_subscription_id;
                  if (expireData.new_payment_no) {
                    currentPaymentNo = expireData.new_payment_no;
                    localStorage.setItem('onrivi_payment_no', currentPaymentNo);
                    savedPaymentNo = currentPaymentNo;
                  }
                  sub.plan_name = 'READER';
                  sub.plan_status = 'ACTIVE';
                  isExpired = false; // 새로운 READER 구독이 활성화되었으므로 만료 아님 (하지만 READER 플랜이므로 insert시 제한됨)
                }
              } catch (err) {
                console.error('[LICENSE] Failed to execute expire API:', err);
              }
            }

            const remainingDays = expiryMs === 0 ? 0 : Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
            const isFreeTrial = sub?.plan_name === 'FREE' || sub?.plan_name === 'APPRENTICE' || currentPaymentNo.startsWith('FREE_TRIAL_') || currentPaymentNo.startsWith('TRIAL-');
            let planName = isFreeTrial ? '무료 체험판 플랜 (Apprentice)' : (sub?.plan_name === 'READER' ? '기간 만료 (제한 사용자)' : `${sub?.plan_name || 'PRO'} 프리미엄 플랜`);

            let activationFailed = false;
            let activationError = '';
            let isDeviceLimitHit = false; // 기기 초과 여부 (try 블록 바깥에서도 참조)

            const currentDeviceName = isDesktop ? 'Desktop App' : 'Web SaaS';
            const isValidUUID = (id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const reqUserId = (sub?.user_id && isValidUUID(sub.user_id))
              ? sub.user_id
              : (currentAuthUser?.id && isValidUUID(currentAuthUser.id) ? currentAuthUser.id : savedUserId);

            console.log('[loadAndVerifyLicense] insert: user=', reqUserId, 'session=', sessionId, 'device=', currentDeviceName, 'licenseId=', currentLicenseId, 'isREADER=', sub?.plan_name === 'READER');
            try {
              const activationToken = !isDesktop ? (await supabase.auth.getSession()).data.session?.access_token : null;
              const actRes = await fetch(getApiUrl('/api/license/activate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(activationToken ? { Authorization: `Bearer ${activationToken}` } : {}) },
                body: JSON.stringify({ p_license_id: currentLicenseId, p_device_uuid: sessionId, p_device_name: currentDeviceName, p_user_id: reqUserId, p_is_expired: sub?.plan_name === 'READER' })
              });

              if (!actRes.ok) {
                activationFailed = true;
                activationError = '세션 확인 오류 - 읽기 전용';
                console.warn('[loadAndVerifyLicense] activation API error status=%o', actRes.status);
                showToast('편집 권한을 확인할 수 없어 읽기 전용으로 열었습니다.', 'warning');
              } else {
                const actResult = await actRes.json();
                if (actResult?.activation_id) {
                  localStorage.setItem('onrivi_activation_id', actResult.activation_id);
                }

                const isDeviceLimitHitLocal = actResult?.code === 'ERR_MAX_DEVICES_EXCEEDED' || actResult?.code === 'EXCEED_MAX_DEVICES';
                isDeviceLimitHit = isDeviceLimitHitLocal;
                if (!actResult?.success) {
                  activationFailed = true;
                  activationError = isDeviceLimitHit
                    ? `동시 접속 초과 (${actResult?.max_devices || '?'}대) - 제한 사용자`
                    : `라이선스 오류: ${actResult?.message || '알 수 없는 오류'}`;
                }
                console.log('[loadAndVerifyLicense] insert result: success=%o code=%o', actResult?.success, actResult?.code);
              }
            } catch (insertFetchErr) {
              activationFailed = true;
              activationError = '세션 확인 오류 - 읽기 전용';
              console.warn('[loadAndVerifyLicense] insert API fetch failed (network?):', insertFetchErr);
              showToast('편집 권한을 확인할 수 없어 읽기 전용으로 열었습니다.', 'warning');
            }

            const isRestricted = activationFailed || sub?.plan_name === 'READER';

            if (activationFailed) {
              isExpired = true;
              planName = activationError;
            }

            const isActivated = !isExpired && !isRestricted;

            if (currentLicenseId) {
              localStorage.setItem('onrivi_license_id', currentLicenseId);
            }

            const hasEditorSub = sub?.plan_name !== 'READER' && sub?.plan_name !== 'FREE_TRIAL_EXPIRED';

            console.log('[LICENSE] VERIFIED setLicenseStatus isActivated=%o isExpired=%o isRestricted=%o isConcurrentLimited=%o planName=%o', isActivated, isExpired, isRestricted, isDeviceLimitHit, planName);
            setLicenseStatus({
              isActivated, isExpired, remainingDays, userId: savedUserId,
              isRestricted, // 💡 제한 상태 명시적 반영
              isConcurrentLimited: isDeviceLimitHit,
              hasEditorSubscription: hasEditorSub,
              licenseKey: isActivated ? savedKey : '', paymentNo: currentPaymentNo || '',
              planName, nextPaymentDate: sub?.current_period_end || sub?.trial_end_at || (expiryMs > 0 ? new Date(expiryMs).toISOString() : '')
            });

            saveSecureData('onrivi_license_status', {
              isActivated, isExpired, remainingDays, userId: savedUserId,
              isRestricted, // 💡 로컬 보안 캐시에도 제한 상태 밀봉
              licenseKey: isActivated ? savedKey : '', paymentNo: currentPaymentNo || '',
              planName, nextPaymentDate: sub?.current_period_end || sub?.trial_end_at || (expiryMs > 0 ? new Date(expiryMs).toISOString() : ''),
              lastVerifiedAt: Date.now()
            });
            return;
        }
      } catch (err) {
        console.warn('[loadAndVerifyLicense] web unexpected error:', err);
      }
    }

    // 웹 버전에서도 3일 캐시를 사용하지 않고 매번 DB/서버를 통해 인증을 진행하도록 수정 (요청 사항 반영)
    const cached = loadSecureData<any>('onrivi_license_status');

    const finalPlanName = cached?.planName || (savedPaymentNo ? '프리미엄 요금제' : '미인증 라이선스');
    console.log('[LICENSE] FINAL setLicenseStatus isExpired=true planName=%o', finalPlanName);
    setLicenseStatus({
      isActivated: false, isExpired: true, remainingDays: 0, userId: savedUserId,
      licenseKey: savedKey || cached?.licenseKey || '', paymentNo: savedPaymentNo,
      planName: finalPlanName,
      nextPaymentDate: cached?.nextPaymentDate || (savedPaymentNo ? '-' : undefined)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // ⚡ 다른 브라우저/기기 동시 접속 초과 시 현재 화면으로 편집 권한 인수 처리
  const [isTakingOver, setIsTakingOver] = useState(false);

  const handleCrossDeviceTakeover = useCallback(async () => {
    if (isTakingOver) return;
    setIsTakingOver(true);
    try {
      const isDesktopEnv = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
      const savedUserId = localStorage.getItem('onrivi_user_id') || localStorage.getItem('onrivi_auth_user_id') || licenseStatus.userId || '';
      const sessionId = (!isDesktopEnv && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || localStorage.getItem('onrivi_device_id') || deviceId;

      if (isDesktopEnv) {
        // 데스크탑 환경 제어권 인수
        const res = await fetch(getApiUrl('/api/license/verify-desktop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p_email: savedUserId,
            p_device_uuid: deviceId,
            p_force_takeover: true
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast("🎉 현재 화면으로 편집 권한을 성공적으로 가져왔습니다!", "success");
          await loadAndVerifyLicense();
        } else {
          showToast(`편집 권한 가져오기 실패: ${data.message || '알 수 없는 오류'}`, "error");
        }
      } else {
        // 웹 SaaS 환경 제어권 인수
        let licenseId = localStorage.getItem('onrivi_license_id') || '';
        const { data: authSessionData } = await supabase.auth.getSession();
        const authUserId = authSessionData?.session?.user?.id;
        const isValidUUID = (id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const effectiveAuthUserId = (authUserId && isValidUUID(authUserId)) ? authUserId : (isValidUUID(savedUserId) ? savedUserId : null);

        if (!licenseId) {
          if (effectiveAuthUserId) {
            try {
              const subRes = await fetch(getApiUrl('/api/subscription/get'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: effectiveAuthUserId })
              });
              if (subRes.ok) {
                const subData = await subRes.json();
                if (subData?.subscription?.id) {
                  licenseId = subData.subscription.id;
                  localStorage.setItem('onrivi_license_id', licenseId);
                }
              }
            } catch (e) {
              console.warn('[handleTakeoverControl] user subscription lookup failed:', e);
            }
          }
        }

        if (!licenseId) {
          showToast("라이선스 정보를 찾을 수 없어 편집 권한을 전환할 수 없습니다.", "error");
          setIsTakingOver(false);
          return;
        }

        const res = await fetch(getApiUrl('/api/license/activate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSessionData?.session?.access_token || ''}` },
          body: JSON.stringify({
            p_license_id: licenseId,
            p_device_uuid: sessionId,
            p_device_name: 'Web SaaS',
            p_user_id: effectiveAuthUserId || savedUserId,
            p_is_expired: false,
            p_force_takeover: true
          })
        });
        const data = await res.json();
        if (data && data.success) {
          showToast("🎉 현재 화면으로 편집 권한을 성공적으로 가져왔습니다!", "success");
          await loadAndVerifyLicense();
        } else {
          showToast(`편집 권한 가져오기 실패: ${data?.message || '알 수 없는 오류'}`, "error");
        }
      }
    } catch (err: any) {
      console.error('[handleCrossDeviceTakeover] Error:', err);
      showToast("편집 권한 전환 중 오류가 발생했습니다.", "error");
    } finally {
      setIsTakingOver(false);
    }
  }, [deviceId, isTakingOver, licenseStatus.userId, loadAndVerifyLicense, showToast]);

  const handleTakeover = useCallback(async () => {
    if (isDuplicateInstance) {
      takeOverControl();
    } else if (licenseStatus.isConcurrentLimited) {
      await handleCrossDeviceTakeover();
    }
    // 💡 제어권 획득 시 직전 뷰 모드(기본 'both')로 화면 즉시 복원
    const restoredMode = lastGeneralPreviewModeRef.current || 'preview';
    setPreviewModeRaw(restoredMode);
    previewModeRef.current = restoredMode;
  }, [isDuplicateInstance, licenseStatus.isConcurrentLimited, takeOverControl, handleCrossDeviceTakeover]);

  const formatTime = (seconds: number) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    if (!deviceId) {
      console.log('[WELCOME-TRIGGER] skipped: deviceId empty');
      return;
    }
    const licenseStartedAt = performance.now();
    console.log('[WELCOME-TRIGGER] calling loadAndVerifyLicense deviceId=%o', deviceId);
    loadAndVerifyLicense().finally(() => {
      console.log('[WELCOME-TRIGGER] loadAndVerifyLicense done in %d ms, setting isLicenseChecking=false', Math.round(performance.now() - licenseStartedAt));
      setIsLicenseChecking(false);
    });
  }, [loadAndVerifyLicense, deviceId, setIsLicenseChecking]);

  // One adaptive monitor: web uses the root guard; desktop owns its monitor here.
  useEffect(() => {
    if (typeof window === 'undefined' || !deviceId || isLicenseChecking || isGuestMode) return;
    let disposed = false, ending = false;
    const isDesktopEnv = !!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop';
    const handleResult = (chk: any) => {
      if (disposed) return;
        if (chk) {
          if (chk.success && (chk.is_terminated || (chk.has_session === false && chk.is_restricted === false))) {
            // 세션 자체가 DB에서 완전히 삭제(DELETE)된 경우 (대시보드 기기 해제, 타 기기/관리자 세션 종료 등) -> 무조건 강제 로그아웃
            if (ending) return;
            ending = true;
            setLicenseStatus(prev => {
              showToast("🛑 다른 화면 또는 대시보드에서 세션이 해제되었습니다. 자동으로 로그아웃됩니다.", "error");
              setTimeout(async () => {
                const pNo = localStorage.getItem('onrivi_payment_no');
                const sId = isDesktopEnv ? deviceId :
                  (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || deviceId;
                if (pNo && sId) {
                  await fetch(getApiUrl('/api/device/deactivate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_payment_no: pNo, p_device_uuid: sId }) });
                }
                try {
                  await supabase.auth.signOut({ scope: 'local' });
                } finally {
                  clearAuthSessionStorage();
                }
                if (!isDesktopEnv) {
                  window.location.href = '/login';
                }
              }, 2500);
              return { ...prev, isActivated: false, isExpired: true, planName: '세션 해제 (로그아웃 중...)' };
            });
          } else if (chk.reason === 'PLAN_EXPIRED') {
            setLicenseStatus(prev => ({ ...prev, isActivated: false, isExpired: true, isRestricted: true, isConcurrentLimited: false }));
            if (previewModeRef.current !== 'preview') {
              lastGeneralPreviewModeRef.current = previewModeRef.current;
              setPreviewModeRaw('preview'); previewModeRef.current = 'preview';
            }
          } else if (chk.success && chk.has_session === false && chk.is_restricted !== false) {
            // 세션은 존재하지만 활성화되지 않은 제한 사용자 상태인 경우 (타 화면에서 제어권 인수했거나 동시접속 초과)
            setLicenseStatus(prev => {
              if (prev.isActivated) {
                showToast("⚠️ 다른 화면에서 편집 권한을 가져갔거나 동시접속 초과로 현재 화면은 제한 모드(읽기 전용)로 전환되었습니다.", "warning");
              }
              return {
                ...prev,
                isActivated: false,
                isExpired: true,
                isRestricted: true,
                isConcurrentLimited: true,
                hasEditorSubscription: prev.hasEditorSubscription ?? true,
                planName: prev.planName?.includes('동시 접속 초과') ? prev.planName : `동시 접속 초과 (${chk.max_devices || 1}대) - 제한 사용자`
              };
            });
            // 💡 [사용자 요청] 다른 세션에서 제어권을 가져갔을 때 현재 화면을 즉시 미리보기 모드로 자동 전환
            if (previewModeRef.current !== 'preview') {
              lastGeneralPreviewModeRef.current = previewModeRef.current;
              setPreviewModeRaw('preview');
              previewModeRef.current = 'preview';
            }
          } else {
            // 정상 복구/유지인 경우 상태 동기화
            setLicenseStatus(prev => {
              if (prev.isExpired) {
                // 🚨 @PATCH : 이미 날짜 만료로 판단되어 EXPIRED 처리된 경우 강제로 복구시키지 않도록 방어 로직 추가
                let isActuallyExpired = false;
                if (prev.nextPaymentDate) {
                  const expMs = parseDateStringToMs(prev.nextPaymentDate);
                  if (expMs > 0 && Date.now() > expMs) isActuallyExpired = true;
                } else if (prev.remainingDays === 0 && !prev.planName.includes('캐시')) {
                  isActuallyExpired = true;
                }

                if (isActuallyExpired) {
                  return prev; // 날짜 만료로 판명되었으면 해제 불가
                }

                return {
                  ...prev,
                  isActivated: true,
                  isExpired: false,
                  isRestricted: false,
                  isConcurrentLimited: false,
                  planName: chk.plan_name || prev.planName || '프리미엄 요금제'
                };
              }
              return prev;
            });
          }
        }
    };
    if (!isDesktopEnv) {
      const receive = (event: Event) => {
        const message = event as CustomEvent;
        if (message.detail?.device_uuid !== sessionStorage.getItem('onrivi_tab_session_id')) return;
        event.preventDefault(); handleResult(message.detail);
      };
      window.addEventListener('onrivi:license-session', receive);
      window.dispatchEvent(new Event('onrivi:session-check-request'));
      return () => { disposed = true; window.removeEventListener('onrivi:license-session', receive); };
    }
    const polling = browserSessionPolling(async () => {
      if (ending || disposed) return 'skip';
      if (!navigator.onLine) return false;
      const paymentNo = localStorage.getItem('onrivi_payment_no');
      if (!paymentNo) return 'skip';
      const response = await fetch(getApiUrl('/api/license/check-session'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_payment_no: paymentNo, p_device_uuid: deviceId }), signal: AbortSignal.timeout(10000)
      });
      if (!response.ok || disposed) return false;
      const result = await response.json();
      if (!result.success) return false;
      handleResult(result); return true;
    });
    return () => { disposed = true; polling.stop(); };
  }, [deviceId, isLicenseChecking, setLicenseStatus, showToast, isGuestMode]);

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

  // 📊 [OMD-LICENSE-MainEditorApp-POLLING]
  // 🚨 @PATCH: 2026-07-05 - 사용자 지시에 따라 무거운 백그라운드 실시간 감시(Polling) 및 강제 로그아웃 차단 로직 전면 제거.
  // 오직 초기 진입 시(loadAndVerifyLicense)에만 권한을 1회 판별하여 웰컴 페이지 제어로 대체합니다.

  // G. 만료일 자정(24:00) 차단 백그라운드 타이머 (유예 없이 즉시 차단)
  useEffect(() => {
    if (!licenseStatus.nextPaymentDate || licenseStatus.isActivated) return;

    const expiryDate = new Date(licenseStatus.nextPaymentDate);
    expiryDate.setHours(24, 0, 0, 0); // 만료일 자정
    const expiryTime = expiryDate.getTime();

    const checkExpiry = () => {
      const now = Date.now();
      if (now >= expiryTime && !licenseStatus.isExpired) {
        showToast("🔒 라이선스가 만료되었습니다. 에디터가 미리보기 전용 모드로 잠깁니다.", "error");
        setPreviewModeRaw('preview');
        setLicenseStatus(prev => ({ ...prev, isExpired: true }));
      }
    };

    const intervalId = setInterval(checkExpiry, 60 * 60 * 1000); // 1시간 주기 검사
    checkExpiry();

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseStatus.nextPaymentDate, licenseStatus.isActivated, licenseStatus.isExpired, showToast]);

  // ====================================================================
  // 📊 [OMD-LICENSE-MainEditorApp-0090] MainEditorApp.tsx ➔ license_force_preview
  // 🎯 @KICK  : 미인증 또는 계약만료 시 에디터 모드를 무조건 미리보기 전용으로 강제
  // 🛡️ @GUARD : mounted 이후에만 실행; 불필요한 재설정 방지를 위해 현재 모드와 목표 모드 비교;
  //             css-style 모드는 허용 (서식 설정 중에는 강제 전환하지 않음) → 미인증 시 preview만 허용
  //             유효 라이선스 시에는 모드 자유롭게 전환 가능 (preview 고정 해제)
  // 🚨 @PATCH : 2026-06-21 — 신규: 미인증/계약만료 시 preview 강제; previewMode deps 추가
  //             2026-06-22 — `else if` (유효 시 both 복원) 제거 → 유효 라이선스도 미리보기 전환 가능
  // 🔗 @CALLS : setPreviewModeRaw
  // ====================================================================
  useEffect(() => {
    if (!mounted || isLicenseChecking) return;

    if (licenseStatus.isExpired) {
      // 🔒 제한 사용자 (만료/미인증): 에디터 모드를 미리보기 전용으로 강제
      // (초기 웰컴 페이지 노출은 하단의 통합 라우팅 가드에서 담당합니다)
      if (previewModeRef.current !== 'preview') {
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    }
  }, [licenseStatus.isExpired, mounted, isLicenseChecking]);

  // ====================================================================
  // 📊 [OMD-PAY-MainEditorApp-0017] MainEditorApp.tsx ➔ supabaseRealtime_license
  // 🎯 @KICK  : 실시간 활성화를 위해 license_activations의 Supabase postgres_changes 구독, 데스크톱 프로토콜 폴백 포함
  // 🛡️ @GUARD : 언마운트 시 채널 및 리스너 정리; device_uuid 필터로 중복 제거
  // 🚨 @PATCH : **2026-07-22** — Realtime 구독 테이블명 license_activations→license_activations 전환; Electron 환경을 위한 데스크톱 onLicenseActivated 백업 및 결제번호(paymentNo) 전달 보완
  // 🔗 @CALLS : supabase.channel, supabase.from.license_activations.select, handleSuccessActivation, showToast
  // ====================================================================
  useEffect(() => {
    if (!deviceId) return;

    const api = (window as any).electronAPI;
    const isDesktop = !!api;

    // 데스크탑: Electron IPC 리스너만 사용 (Supabase WebSocket 불필요)
    let removeListener: any = null;
    if (isDesktop) {
      if (typeof api.onLicenseActivated === 'function') {
        removeListener = api.onLicenseActivated(async (updatedData: any) => {
          await handleSuccessActivation(updatedData.verifyKey, updatedData.userId, updatedData.paymentNo || '', updatedData.licenseKey || '');
          showToast("🎉 정품 라이선스 연동 성공! 깨끗한 환경을 위해 에디터를 다시 시작합니다...", "success");
          setTimeout(() => { window.location.reload(); }, 2000);
        });
      }
      return () => {
        if (typeof removeListener === 'function') removeListener();
      };
    }

    // 웹 전용: Supabase Realtime 구독
    const channel = supabase
      .channel(`device-activation-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'license_activations',
          filter: `device_uuid=eq.${deviceId}`
        },
        async (payload: any) => {
          // 🚨 @PATCH : 2026-09-05 대시보드(기기 관리)에서 세션을 강제 해제(DELETE)할 경우,
          // 오직 현재 브라우저의 세션(activation_id 또는 sessionId/deviceId)이 삭제되었을 때만 강제 로그아웃
          if (payload.eventType === 'DELETE') {
            const currentActId = localStorage.getItem('onrivi_activation_id');
            const currentSessionId = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onrivi_tab_session_id') : null) || localStorage.getItem('onrivi_session_id') || deviceId;
            const deletedId = payload.old?.id;
            const deletedUuid = payload.old?.device_uuid;

            // 만약 삭제된 레코드가 현재 내 세션의 것이 아니라면 무시!
            const isMySessionDeleted = (currentActId && deletedId && currentActId === deletedId) ||
                                       (deletedUuid && (deletedUuid === currentSessionId || deletedUuid === deviceId));

            if (!isMySessionDeleted) {
              console.log('[Realtime] Ignored DELETE event for another device/user session:', payload.old);
              return;
            }

            showToast("🛑 동시접속 관리에 의해 현재 기기의 세션이 강제 해제되었습니다. 보호를 위해 로그아웃됩니다.", "error");
            setTimeout(async () => {
              // 🚨 @PATCH : 2026-09-17 환경설정(Gemini API 키 등)을 안전하게 보존하고 인증 세션만 선별 삭제
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } finally {
                clearAuthSessionStorage();
              }
              const isDesktop = typeof window !== 'undefined' && (!!(window as any).electronAPI || new URLSearchParams(window.location.search).get('env') === 'desktop');
              if (!isDesktop) {
                window.location.href = '/login';
              }
            }, 3000);
            return;
          }

          const newRecord = payload.new;
          if (newRecord) {
            if (newRecord.is_active === false) {
              // 💡 다른 브라우저나 기기에서 편집 제어권을 가져간 경우
              showToast("다른 브라우저나 기기에서 편집을 시작하여 현재 화면은 읽기 전용(제한사용자) 모드로 전환되었습니다.", "info");
              setLicenseStatus(prev => ({
                ...prev,
                isActivated: false,
                isExpired: true,
                isRestricted: true,
                isConcurrentLimited: true,
                hasEditorSubscription: true,
                planName: '동시 접속 초과 - 제한 사용자'
              }));
              // 💡 [사용자 요청] 다른 세션에서 제어권을 가져갔을 때 현재 화면을 즉시 미리보기 모드로 자동 전환
              if (previewModeRef.current !== 'preview') {
                lastGeneralPreviewModeRef.current = previewModeRef.current;
                setPreviewModeRaw('preview');
                previewModeRef.current = 'preview';
              }
              return;
            }

            if (newRecord.subscription_id && newRecord.is_active === true) {
              try {
                const authUser = (await supabase.auth.getSession()).data.session?.user;
                const reqUserId = authUser?.id || savedUserId;
                if (reqUserId) {
                  const subRes = await fetch(getApiUrl('/api/subscription/get'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: reqUserId })
                  });
                  if (subRes.ok) {
                    const subData = await subRes.json();
                    const matched = subData?.subscription?.id === newRecord.subscription_id
                      ? subData.subscription
                      : subData?.historyList?.find((s: any) => s.id === newRecord.subscription_id);
                    if (matched && matched.verify_key) {
                      const userEmail = licenseStatus.userId || 'user@onrivi.com';
                      handleSuccessActivation(matched.verify_key, userEmail, matched.id || newRecord.subscription_id, matched.license_key || '');
                      setLicenseStatus(prev => ({
                        ...prev,
                        isConcurrentLimited: false,
                      }));
                      showToast("🎉 정품 라이선스가 결제 즉시 안전하게 승인되었습니다!", "success");
                    }
                  }
                }
              } catch (e) {
                console.warn('[Realtime license_activations] subscription lookup failed:', e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, _licenseKey_init, licenseStatus.userId]);

  // ====================================================================
  // 📊 [OMD-AUTH-MainEditorApp-0018] MainEditorApp.tsx ➔ handleSuccessActivation
  // 🎯 @KICK  : 성공적인 결제/활성화 후 모든 저장소 계층에 확인된 라이선스 활성화 유지
  // 🛡️ @GUARD : 원자적 setLicenseStatus + 플랫폼 저장소 저장 (electronAPI, chrome.storage, localStorage) 및 실시간 동기화
  // 🚨 @PATCH : 2026-06-28 — chrome.storage.local.set 제거 (로컬스토리지 격리)
  //              결제번호(paymentNo) 인자 수용 및 loadAndVerifyLicense() 호출을 통한 상태 실시간 동기화
  // 🔗 @CALLS : setLicenseStatus, api.saveLicenseFull, localStorage.setItem, loadAndVerifyLicense
  // ====================================================================
  const handleSuccessActivation = async (verifyKey: string, userId: string, paymentNo: string, explicitLicenseKey?: string) => {
    const api = (window as any).electronAPI;
    const finalLicenseKey = explicitLicenseKey || licenseKey;

    if (api && typeof api.saveLicenseFull === 'function') {
      await api.saveLicenseFull({
        licenseKey: finalLicenseKey,
        verifyKey: verifyKey,
        userId: userId,
        paymentNo: paymentNo
      });
    } 
    
    // 데스크탑(Electron) 환경이라 하더라도 웹뷰 내부의 범용적인 활용 및 폴백을 위해 항상 로컬스토리지에 저장합니다.
    localStorage.setItem('onrivi_license_key', finalLicenseKey);
    localStorage.setItem('onrivi_verify_key', verifyKey);
    localStorage.setItem('onrivi_user_id', userId);
    localStorage.setItem('onrivi_payment_no', paymentNo);

    await loadAndVerifyLicense();
  };

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
  }, [setGeminiApiKey, setAiModelName]);


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

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0035] MainEditorApp.tsx ➔ profilesSave
  // 🎯 @KICK  : 변경 시마다 사용자 CSS 프로필을 플랫폼 저장소에 유지
  // 🛡️ @GUARD : 중복 방지를 위해 저장 전 시스템 프로필 필터링
  // 🚨 @PATCH : **2026-09-27** — [서식 설정 컨트롤 변경 시 1.5초 디바운스 저장]: 슬라이더·컨트롤 조작 시 RAF마다 과도한 파일 I/O 방지를 위해 debounce 타이머(1500ms) 적용. cleanup 시 타이머 취소로 메모리 누수 방지
  //             2026-09-26 — [사용자 서식 리소스 폴더 저장 및 데스크탑/웹 일원화]: persistUserProfiles(profileStorage 파사드) 연동
  //             2026-08-05 — 웹 브라우저 로컬 권한 파일시스템(handle) 사용 시에도 `profiles/userCssProfiles.json` 로 통일 저장
  //             2026-07-30 — resourceFolderHandle이 변경될 때 이전 빈 프로필 상태로 덮어쓰는 버그 방지
  // 🔗 @CALLS : persistUserProfiles
  // ====================================================================
  useEffect(() => {
    if (!mounted || !isProfilesLoaded) return;
    const targetEnv = getResourceEnvironment();
    const folder = getProfileResourceFolder(resourceFolder, targetEnv);
    const source = profileStorageRef.current;
    if (!source || source.folder !== folder || source.handle !== resourceFolderHandle) return;
    const userProfiles = profiles.filter(p => p.id !== 'default' && !isSystemProfileId(p.id));
    const hash = JSON.stringify(userProfiles);
    if (source.hash === hash) return;
    const timerId = setTimeout(() => {
      if (profileStorageRef.current !== source || getResourceEnvironment() !== targetEnv || getProfileResourceFolder(null, targetEnv) !== folder) return;
      // 저장 중 이전 값으로 되돌리는 편집도 누락되지 않도록 캐시를 무효화한다.
      source.hash = '';
      void persistUserProfiles(userProfiles, folder, resourceFolderHandle, targetEnv).then(ok => {
        if (profileStorageRef.current !== source) return;
        if (ok) {
          source.hash = hash;
        } else {
          showToast('userCssProfiles.json 저장에 실패했습니다. 리소스 폴더 연결과 쓰기 권한을 확인해 주세요.', 'error');
        }
      });
    }, 500);
    return () => clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isProfilesLoaded, profiles, resourceFolder, resourceFolderHandle, workspaceType]);



  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0036] MainEditorApp.tsx ➔ activeProfileSave
  // 🎯 @KICK  : 활성 CSS 프로필 ID를 localStorage에 유지
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : localStorage.setItem
  // ====================================================================
  useEffect(() => {
    if (mounted && activeProfileId) {
      localStorage.setItem('activeCssProfileId', activeProfileId);
    }
  }, [activeProfileId, mounted]);


  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0000] MainEditorApp.tsx ➔ Sync Frontmatter Profile
  // 🎯 @KICK  : 에디터 본문(content) 또는 탭 전환 시 Frontmatter에서 css_profile을 추출하여 현재 서식(activeProfileId)을 동기화
  // 🛡️ @GUARD : 서식 모달 오픈 중에는 사용자 서식 탐색을 방해하지 않으며, 서식이 없거나 지정된 서식 파일이 없으면 무조건 공식 기본 서식(Onrivi 기본서식: SYSTEM_PROFILES[0].id)으로 일원화
  // 🚨 @PATCH : **2026-09-24** — [문서 오픈 시 서식 부재 또는 미존재 시 공식 기본 서식(Onrivi 기본서식) 강제 적용]:
  //             1) Frontmatter에 css_profile이 지정되어 있으나 해당 프로필이 존재하지 않을 때 공식 기본 서식(system-1)으로 자동 전환
  //             2) 문서에 css_profile 지정 자체가 없을 때 직전 탭 서식을 상속하지 않고 무조건 공식 기본 서식(system-1)으로 일원화
  // 🔗 @CALLS : extractFrontmatter, setActiveProfileId
  // ====================================================================
  // 💡 문서 열기/탭 전환 시 useEffect 실행 전 첫 렌더링 프레임에서도 Frontmatter 서식(특히 가로형 그림책)을 즉시 동기 판별하여 세로->가로 점프 흔들림 원천 차단
  const resolveEffectiveDocumentProfile = useCallback((docText: string) => {
    const preferLive = previewMode === 'css-style' || isStyleModalOpen;
    const stateProfile = profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE;
    if (preferLive) {
      return documentBookProfile(docText, stateProfile, true);
    }
    const { data } = extractFrontmatter(docText || '');
    if (data.css_profile) {
      const profileId = data.css_profile.trim().replace(/^["']|["']$/g, '');
      const matched = profiles.find(p =>
        p.id === profileId ||
        p.name === profileId ||
        ((data.css_profile === 'ChatGPT 스타일 콘텐츠' || data.css_profile === '온리비어서 표준 서식' || data.css_profile === 'Onrivi 기본서식') && p.id === SYSTEM_PROFILES[0].id) ||
        ((data.css_profile === 'GitHub 기술 블로그/명세서' || data.css_profile === 'system-2') && p.id === 'github-readme-style') ||
        ((data.css_profile === 'Stroy Book - 오른쪽 그림 표지' || data.css_profile === 'Story Book - 오른쪽 그림 표지') && p.id === 'profile-1792072480655') ||
        ((data.css_profile === 'Story Book-전체표지' || data.css_profile === 'Story Book - 전체표지' || data.css_profile === 'profile-1792072443551' || data.css_profile === 'profile-1792073192013') && (p.id === 'profile-1792073192013' || p.id === 'profile-1792072443551'))
      );
      if (matched) {
        return documentBookProfile(docText, matched, false);
      }
      const snapshot = legacyBookProfile(docText);
      if (snapshot?.layout) {
        return snapshot;
      }
    }
    return documentBookProfile(docText, stateProfile, false);
  }, [profiles, activeProfileId, previewMode, isStyleModalOpen]);

  useEffect(() => {
    if (isStyleModalOpen) return;
    const { data } = extractFrontmatter(content);
    if (data.css_profile) {
      const profileId = data.css_profile.trim().replace(/^["']|["']$/g, '');
      const targetProfile = profiles.find(p => 
        p.id === profileId || 
        p.name === profileId ||
        ((data.css_profile === 'ChatGPT 스타일 콘텐츠' || data.css_profile === '온리비어서 표준 서식' || data.css_profile === 'Onrivi 기본서식') && p.id === SYSTEM_PROFILES[0].id) ||
        ((data.css_profile === 'GitHub 기술 블로그/명세서' || data.css_profile === 'system-2') && p.id === 'github-readme-style') ||
        ((data.css_profile === 'Stroy Book - 오른쪽 그림 표지' || data.css_profile === 'Story Book - 오른쪽 그림 표지') && p.id === 'profile-1792072480655') ||
        ((data.css_profile === 'Story Book-전체표지' || data.css_profile === 'Story Book - 전체표지' || data.css_profile === 'profile-1792072443551' || data.css_profile === 'profile-1792073192013') && (p.id === 'profile-1792073192013' || p.id === 'profile-1792072443551'))
      );
      if (targetProfile) {
        if (targetProfile.id !== activeProfileId) {
          setActiveProfileId(targetProfile.id);
        }
      } else {
        // 🚨 지정된 서식 프로필이 존재하지 않는 경우 (해당 서식 파일 부재): 무조건 공식 기본 서식으로 적용
        const snapshot = legacyBookProfile(content);
        if (snapshot?.layout) {
          setProfiles(previous => previous.some(profile => profile.id === snapshot.id) ? previous : [...previous, snapshot]);
          setActiveProfileId(snapshot.id);
          return;
        }
        if (activeProfileId !== SYSTEM_PROFILES[0].id) {
          setActiveProfileId(SYSTEM_PROFILES[0].id);
        }
      }
    } else {
      // 🚨 해당 파일에 서식 지정이 없는 경우: 무조건 공식 기본 서식(SYSTEM_PROFILES[0].id)으로 강제 적용
      if (activeProfileId !== SYSTEM_PROFILES[0].id) {
        setActiveProfileId(SYSTEM_PROFILES[0].id);
      }
    }
  }, [content, activeProfileId, profiles, isStyleModalOpen]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0037] MainEditorApp.tsx ➔ electronAPI_listeners
  // 🎯 @KICK  : 파일 작업 및 외부 파일 열기를 위한 Electron 메인 프로세스 IPC 리스너 등록
  // 🛡️ @GUARD : 정리 시 리스너 제거, 보류 중인 외부 파일 참조 처리
  // 🚨 @PATCH : **2026-06-28** — 최초 실행 시 api.getInitialFilePath() 호출을 추가하여 윈도우 탐색기/바탕화면에서
  //             .md 파일 더블클릭 시 앱 기동 후 해당 파일이 자동으로 열리도록 IPC 연결 패치
  // 🔗 @CALLS : api.onNewFileRequested, api.onSaveFileRequested, api.onSaveFileAsRequested, api.onReceiveFile, api.getInitialFilePath, openExternalFile, handlers.newFile, handlers.save, handlers.saveAs
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      api.onNewFileRequested(() => { });
      api.onSaveFileRequested(() => handlers.save());
      api.onSaveFileAsRequested(() => handlers.saveAs());

      // 윈도우 파일 연결(더블클릭)로 외부 .md 파일 열기 요청 수신 (두 번째 실행부터)
      let unsubscribeReceiveFile: (() => void) | undefined;
      if (api.onReceiveFile) {
        unsubscribeReceiveFile = api.onReceiveFile((filePath: string) => {
          openExternalFile(filePath);
        });
      }

      // 🆕 최초 실행 시: .md 더블클릭 파일 우선, 없으면 마지막 세션 파일 복원
      // sessionRestoredRef로 effect 재실행 시 중복 호출 방지
      if (mounted && api.getInitialFilePath && !sessionRestoredRef.current && !initialSessionCheckedRef.current) {
        initialSessionCheckedRef.current=true;
        api.getInitialFilePath().then(async (filePath: string | null) => {
          if (filePath) {
            sessionRestoredRef.current = true;
            openExternalFile(filePath);
          } else if (readEditorSession(localStorage.getItem('onrivi_tabs_session'))) {
            setDesktopSessionReady(true);
          } else if (api.getLastSession && (tabs.length === 0 || !tabs.some(t => !!t.path && !t.isStyleTab))) {
            const sessionData = await api.getLastSession();
            if (sessionData && Array.isArray(sessionData.openFilePaths) && sessionData.openFilePaths.length > 0) {
              await restoreSessionTabs(sessionData.openFilePaths, sessionData.activeFilePath);
            } else {
              sessionRestoredRef.current = true; // 복원할 세션 없음
            }
          } else {
            sessionRestoredRef.current = true; // 복원할 더블클릭 경로 없음
          }
        }).catch(() => { setDesktopSessionReady(true); });
      }
      if(mounted && !api.getInitialFilePath)setDesktopSessionReady(true);

      // restoreSettings에서 확보해 둔 pending 파일 경로 처리 (폴백)
      if (pendingExternalFileRef.current) {
        const path = pendingExternalFileRef.current;
        pendingExternalFileRef.current = null;
        openExternalFile(path);
      }

      return () => {
        api.removeListeners();
        if (unsubscribeReceiveFile) unsubscribeReceiveFile();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, content, currentFileNode]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0044] MainEditorApp.tsx ➔ cross_platform_session_restore
  // 🎯 @KICK  : 일반 웹 브라우저 및 데스크탑 공용으로 최초 기동 시 localStorage의 세션 정보를 읽어 탭 복원을 개시.
  // 🛡️ @GUARD : 이미 데스크탑 복원 가드가 돌았거나 탭이 복원된 상태라면 중복 로드 차단.
  // 🚨 @PATCH : **2026-08-12** — 초기 생성 (웹/데스크탑 공용 탭 세션 복원 복구)
  // 🔗 @CALLS : restoreSessionTabs
  // ====================================================================
  useEffect(() => {
    if (!mounted) return;

    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    const isElectron = !!api;

    // 일렉트론이 아닌 일반 웹 환경이고 아직 복원이 되지 않았다면 복구 프로세스 가동
    if ((!isElectron || desktopSessionReady) && !sessionRestoredRef.current && !sessionRestoringRef.current) {
      try {
        const parsed = readEditorSession(localStorage.getItem('onrivi_tabs_session'));
        if (parsed) {
          if (parsed.tabs.length > 0) {
            // Folder handles and Drive credentials must be ready before opening files.
            if(parsed.tabs.some(t=>t.path || t.driveFileId) && (!rootFolder || (rootFolder as any).needPermission || (workspaceType === 'browser' && !rootFolder.handle)))return;
            if((rootFolder as any)?.type==='GDRIVE' && (!hasValidDriveToken() ||
              (parsed.tabs.some(t=>t.path&&!t.driveFileId) && fileList.length===0)))return;
            void restoreSessionTabs([], null, parsed.tabs, parsed.activeTabId, parsed.previewMode);
            return;
          }
        }
      } catch (e) {
        console.error('[web session restore] 실패:', e);
      }
      sessionRestoredRef.current = true; // 복원할 정보 없으면 플래그 해제
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, desktopSessionReady, rootFolder, fileList, isDriveAuthExpired]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0039] MainEditorApp.tsx ➔ session_auto_save
  // 🎯 @KICK  : 현재 열려있는 탭 목록 또는 활성 탭이 변경될 때마다 electronAPI.saveLastSession()을
  //             호출하여 모든 열린 파일 경로와 활성 파일 경로를 session.json에 자동 저장.
  //             앱 재시작 시 session:getLastSession IPC로 그대로 복원됨.
  // 🛡️ @GUARD : Electron 환경에서만 동작. 저장할 파일 목록이 없으면 빈 세션 저장.
  // 🚨 @PATCH : **2026-08-12** — 멀티 탭 전체 복원 동기화 기능으로 고도화 개편
  // 🔗 @CALLS : api.saveLastSession
  // ====================================================================
  useEffect(() => {
    // 💡 [치명적 버그 방어] 앱 마운트 초기 단계(세션 복원이 채 완료되지 않은 시점)에
    // 초기 빈 탭 상태([])가 session.json이나 localStorage를 덮어씌워 날려버리는 결함을 차단합니다.
    if (!mounted || !sessionRestoredRef.current || sessionRestoringRef.current) return;

    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

    // 1. 브라우저 로컬 스토리지 보존 (웹 & 데스크탑 공용)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onrivi_tabs_session', JSON.stringify(captureEditorSession(tabs,activeTabId,contentRef.current,previewModeRef.current)));
      } catch (e) {
        console.error('[session_auto_save] localStorage 쓰기 실패:', e);
      }
    }

    // 2. 일렉트론 세션 보존 (데스크탑 전용 파일 백업)
    if (api?.saveLastSession) {
      const openFilePaths = tabs.map(t => t.path).filter((p): p is string => typeof p === 'string' && !!p);
      const activeFilePath = currentFileNode?.path || null;
      api.saveLastSession({
        openFilePaths,
        activeFilePath
      }).catch(() => {});
    }
  }, [mounted, tabs, activeTabId, currentFileNode, previewMode]);

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

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0042] MainEditorApp.tsx ➔ beforeunload_safety_flush
  // 🎯 @KICK  : 브라우저가 예기치 않게 닫히거나 강제 종료될 때, React 갱신 지연 상태를 무시하고
  //             Ref(tabsRef, currentFileNodeRef)를 직접 읽어 localStorage 및 session.json에 즉각 플러시 저장.
  // 🛡️ @GUARD : React 최신 Ref 참조로 동기화 누락 방지.
  // 🚨 @PATCH : **2026-08-12** — 초기 생성 (강제 종료 유실 방지 가드)
  // 🔗 @CALLS : api.saveLastSession
  // ====================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if(!sessionRestoredRef.current || sessionRestoringRef.current)return;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      
      // 1. 브라우저 로컬 스토리지에 마지막 작성중인 문서 메타데이터 밀봉 플러시
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('onrivi_tabs_session', JSON.stringify(captureEditorSession(tabsRef.current,activeTabIdRef.current,contentRef.current,previewModeRef.current)));
        } catch (e) {}
      }

      // 2. 데스크탑 파일 백업 플러시
      if (api?.saveLastSession) {
        const openFilePaths = tabsRef.current.map(t => t.path).filter((p): p is string => typeof p === 'string' && !!p);
        const activeFilePath = currentFileNodeRef.current?.path || null;
        api.saveLastSession({ openFilePaths, activeFilePath }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);


  // 🎯 @KICK  : 사이드바 UI에서 서식을 변경했을 때, 에디터 본문에 Frontmatter를 주입/갱신하고 상태를 업데이트한다.
  // 🛡️ @GUARD : Monaco 모델 값이 변경될 때 자동으로 onDidChangeContent가 트리거되므로 setContent는 별도 호출하지 않음.
  // 🚨 @PATCH : 2026-07-30 (Frontmatter 서식 개별 지정 지원)
  // 🔗 @CALLS : updateCssProfileInFrontmatter, setActiveProfileId
  // ====================================================================
  const handleProfileChange = useCallback((newProfileId: string, appliedProfile?: CssProfile) => {
    setActiveProfileId(newProfileId);
    
    // 서식 이름 찾기
    const selectedProfile = appliedProfile ?? profiles.find(p => p.id === newProfileId);
    const profileName = selectedProfile ? selectedProfile.name : undefined;
    
    const currentModel = isEditorMountedRef.current ? editorRef.current?.getModel() : null;
    const currentContent = currentModel?.getValue() ?? contentRef.current;
    const newContent = syncMarkdownHeadingNumbers(writeBookProfileSnapshot(updateCssProfileInFrontmatter(currentContent, newProfileId, profileName), selectedProfile), selectedProfile?.headingNumbering, resolveEffectiveDocumentProfile(currentContent).headingNumbering);
    if (currentContent !== newContent) {
      // 서식 화면/미리보기에서는 Monaco 이벤트가 차단되므로 문서 상태도 직접 갱신한다.
      contentRef.current = newContent;
      updateContent(newContent, false, true);
      setTabs(previous => previous.map(tab => tab.id === activeTabIdRef.current ? { ...tab, content: newContent, isModified: true } : tab));
    }
  }, [setActiveProfileId, editorRef, profiles, updateContent, resolveEffectiveDocumentProfile]);

  const headingSourceFormatsRef = useRef(new Map<string, unknown[]>());
  const isHeadingStyleTab = Boolean(tabs.find(tab => tab.id === activeTabId)?.isStyleTab);
  useEffect(() => {
    if (!isProfilesLoaded || !activeTabId || isRestrictedUser || currentFileName === '도움말.md' || isHeadingStyleTab) return;
    const profile = resolveEffectiveDocumentProfile(content);
    if (profile.layout) return;
    // The visual editor updates prefixes in its own transaction, preserving caret and undo.
    if (directEditEnabled && document.querySelector('.visual-document-surface[contenteditable="true"]')?.contains(document.activeElement)) return;
    const formats = profile.headingNumbering || [];
    const previous = headingSourceFormatsRef.current.get(activeTabId) || formats;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      if (cancelled || activeTabIdRef.current !== activeTabId) return;
      if (isComposingRef.current) { timer = setTimeout(sync, 100); return; }
      const model = isEditorMountedRef.current ? editorRef.current?.getModel() : null;
      const original = model && previewModeRef.current !== 'preview' ? model.getValue() : contentRef.current;
      const next = syncMarkdownHeadingNumbers(original, formats, previous);
      headingSourceFormatsRef.current.set(activeTabId, formats);
      if (next === original) return;
      contentRef.current = next;
      updateContent(next, false, true);
      setTabs(items => items.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
    };
    timer = setTimeout(sync, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content, profiles, activeProfileId, activeTabId, isProfilesLoaded, isRestrictedUser, currentFileName, isHeadingStyleTab, directEditEnabled, updateContent, resolveEffectiveDocumentProfile]);

  useEffect(() => {
    if (!isProfilesLoaded) return;
    const original = content;
    const { data } = extractFrontmatter(original);
    if (!data.onrivi_picturebook_profile) return;
    const legacy = legacyBookProfile(original);
    const profile = profiles.find(item => item.id === legacy?.id);
    if (legacy && !profile) {
      // 기존 문서만 갖고 있는 사용자 서식은 라이브러리로 옮긴 뒤 메타를 정리한다.
      setProfiles(previous => previous.some(item => item.id === legacy.id) ? previous : [...previous, legacy]);
      return;
    }
    if (!profile) return;
    let cancelled = false;
    const environment = getResourceEnvironment();
    const folder = getProfileResourceFolder(resourceFolder, environment);
    void persistUserProfiles(profiles.filter(item => item.id !== 'default' && !isSystemProfileId(item.id)), folder, resourceFolderHandle, environment).then(ok => {
      if (!ok || cancelled || contentRef.current !== original) return;
      const next = writeBookProfileSnapshot(original);
      contentRef.current = next;
      updateContent(next);
      setTabs(previous => previous.map(tab => tab.id === activeTabId ? { ...tab, content:next, isModified:true } : tab));
    });
    return () => { cancelled = true; };
  }, [content, profiles, isProfilesLoaded, activeTabId, updateContent, resourceFolder, resourceFolderHandle]);

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
  // 📊 [OMD-FILE-MainEditorApp-0043] MainEditorApp.tsx ➔ restoreSessionTabs
  // 🎯 @KICK  : 앱 재시작 시, 이전 세션의 파일 목록 전체를 일괄 로드하여 탭 리스트를 생성 및 바인딩.
  //             단일 일괄 트랜잭션 처리로 React 상태 갱신 배치 충돌 및 Monaco 모델 중복 방지.
  // 🛡️ @GUARD : 비인증 사용자 복원 제한, 디스크 삭제 파일 예외 가드.
  // 🚨 @PATCH : **2026-08-12** — 초기 생성 (멀티 탭 복원 충돌 버그 해결)
  // 🔗 @CALLS : api.readFromPath, setTabs, setActiveTabId, setContent, showToast
  // ====================================================================
  const restoreSessionTabs = async (openFilePaths: string[], activeFilePath: string | null, savedTabs?:SessionTab[], savedActiveId?:string|null, savedMode?:string) => {
    const restoreStartedAt = performance.now();
    try {
      sessionRestoringRef.current = true;
      // 💡 [정식 문서 열기 적용] 단순히 탭만 임의로 배열에 쑤셔넣지 않고, 
      // 기존 파일 탐색기의 실제 파일 오픈 파이프라인(handleFileOpenByPath)을 순차 구동시킵니다.
      // 이렇게 해야 실제 로컬 파일 시스템 핸들 및 VFS 상태가 정상 바인딩되어 물리적 저장이 작동합니다.
      // React 상태 배치 갱신 지연으로 인한 탭 유실을 방지하기 위해 탭당 150ms의 마이크로 대기 시간을 부여합니다.
      
      if(savedTabs){
        const restored=new Map<string,string>();
        for(const saved of savedTabs){
          try{
            if(saved.driveFileId){
              await handleFileClick({name:saved.name,path:saved.path,kind:'file',driveFileId:saved.driveFileId} as any);
            }else if(saved.path){
              await handleFileOpenByPath(saved.path);
            }else if(saved.draft!==undefined){
              createNewTab(saved.draft,saved.name,false);
            }else continue;
            // Let the normal file-open pipeline bind its real file node/handle.
            await new Promise(resolve=>setTimeout(resolve,150));
            const opened=saved.path || saved.driveFileId
              ? tabsRef.current.find(t=>matchesSessionTab(t,saved))
              : tabsRef.current.find(t=>t.id===activeTabIdRef.current);
            if(!opened)continue;
            restored.set(saved.id,opened.id);
            const isDraftWarning = isPlaceholderWarning(saved.draft);
            if(saved.draft!==undefined && !isDraftWarning){
              if(opened.model && !opened.model.isDisposed?.())opened.model.setValue(saved.draft);
              if(activeTabIdRef.current===opened.id){contentRef.current=saved.draft;updateContent(saved.draft,false,true);}
            }
            setTabs(previous=>previous.map(t=>t.id===opened.id?{...t,
              ...(saved.draft!==undefined && !isDraftWarning?{content:saved.draft,isModified:true}:{}),
              scrollTop:saved.scrollTop,previewMode:saved.previewMode || t.previewMode
            }:t));
            await new Promise(resolve=>setTimeout(resolve,0));
          }catch(error){console.warn('[session restore] 문서 복원 실패:',saved.name,error);}
        }
        const target=restored.get(savedActiveId || '');
        if(target){
          // Force normal switchTab to apply the restored scroll position/mode.
          if(activeTabIdRef.current===target)activeTabIdRef.current=null;
          switchTab(target);
        }
        if(savedMode && ['edit','both','preview'].includes(savedMode) && !isRestrictedUser)setPreviewMode(savedMode as any);
        if(restored.size)showToast(`이전에 열어 둔 문서 ${restored.size}개를 복원했습니다.`,'info');
        return;
      }

      // 💡 [중복 경로 사전 필터링] 정규화 기준 중복 파일 배제
      const seenPaths = new Set<string>();
      const uniqueFilePaths = openFilePaths.filter(p => {
        if (!p) return false;
        const norm = p.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        if (seenPaths.has(norm)) return false;
        seenPaths.add(norm);
        return true;
      });

      for (const filePath of uniqueFilePaths) {
        if (handleFileOpenByPath) {
          await handleFileOpenByPath(filePath);
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      // 마지막에 원래 활성화 상태였던 탭으로 이동 (이미 열린 탭이면 switchTab만 호출하여 2중 열림 원천 차단)
      if (activeFilePath) {
        const normActive = activeFilePath.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        const targetTab = tabsRef.current.find(t => (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC') === normActive);
        if (targetTab) {
          switchTab(targetTab.id);
        } else if (handleFileOpenByPath) {
          await handleFileOpenByPath(activeFilePath);
        }
      }
      
      showToast(`📂 이전 세션의 문서 ${uniqueFilePaths.length}개가 온전히 복원되었습니다.`, "info");
    } catch (err) {
      console.error("[restoreSessionTabs] 오류:", err);
    } finally {
      console.info('[STARTUP timing] session restore ms=%d tabs=%d', Math.round(performance.now() - restoreStartedAt), savedTabs?.length ?? openFilePaths.length);
      sessionRestoringRef.current = false;
      sessionRestoredRef.current = true;
      // Persist only after the entire restoration has completed.
      setTabs(previous=>[...previous]);
    }
  };


  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0038] MainEditorApp.tsx ➔ openExternalFile
  // 🎯 @KICK  : OS 수준 더블클릭 또는 명령줄에서 파일 열기, Monaco 모델로 탭 생성
  // 🛡️ @GUARD : 중복 탭 방지 및 기존 탭 발견 시 최신 컨텐츠 강제 플러시 갱신
  // 🚨 @PATCH : 동일 파일명/경로 재호출 시 무반응 버그 수정: setModel 및 content 강제 동기화 (2026-07-17)
  // 🔗 @CALLS : api.readFromPath, switchTab, setContent, showToast
  // ====================================================================
  const openExternalFile = async (filePath: string) => {
    try {
      const api = (window as any).electronAPI;
      if (api?.readFromPath) {
        const file = await api.readFromPath(filePath);
        if (file) {
          const normFilePath = (file.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
          const existingTab = tabsRef.current.find(t => {
            if (!t.path) return false;
            return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
          });

          if (existingTab) {
            if (existingTab.model && existingTab.model.isDisposed()) {
              const cleaned = tabsRef.current.filter(t => t.id !== existingTab.id);
              tabsRef.current = cleaned;
              setTabs(cleaned);
            } else {
              // 🎯 [현행화 패치] 기존 탭이 존재하면 포커스를 이동하고 최신 원문 데이터를 강제 주입
              switchTab(existingTab.id);
              setContent(file.content);
              setCurrentFileName(file.name);
              setCurrentFileNode({ name: file.name, kind: 'file', path: file.path });

              if (existingTab.model) {
                // 기존 모델에 외부에서 바뀐 최신 텍스트를 강제로 덮어씌움
                existingTab.model.setValue(file.content);
                if (editorRef.current) {
                  try {
                    editorRef.current.setModel(existingTab.model);
                  } catch (e) {
                    console.warn("[Monaco] setModel failed on existing tab:", e);
                  }
                }
              }

              showToast(`📂 ${file.name} (최신화 완료)`, "info");
              return;
            }
          }

          // --- 이하 신규 탭 생성 로직은 기존과 동일 ---
          // [Bug Fix] CRLF를 LF로 정규화하여 Monaco getValue()와의 비교 시 isModified가 오작동하는 문제 해결
          file.content = file.content.replace(/\r\n/g, '\n');

          const monaco = (window as any).monaco;
          let model: any = null;
          if (monaco) {
            model = monaco.editor.createModel(file.content, 'markdown');
            model.onDidChangeContent(() => {
              const val = model.getValue();
              setContent(val);
              setTabs(prev => prev.map(t => t.id === file.path ? { ...t, content: val, isModified: val !== t.content } : t));
            });
          }

          const newTabId = file.path;
          const newTab: EditorTab = {
            id: newTabId,
            name: file.name,
            path: file.path,
            node: { name: file.name, kind: 'file', path: file.path },
            content: file.content,
            isModified: false,
            model: model
          };

          setTabs(prev => {
            const exists = prev.some(t => {
              if (t.id === newTabId) return true;
              if (t.path) {
                return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
              }
              return false;
            });
            if (exists) {
              return prev.map(t => {
                const normTab = (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
                if (t.id === newTabId || normTab === normFilePath) {
                  return { ...t, content: file.content, model: model || t.model };
                }
                return t;
              });
            }
            return [...prev, newTab];
          });
          setActiveTabId(newTabId);
          setContent(file.content);
          setCurrentFileName(file.name);
          setCurrentFileNode({ name: file.name, kind: 'file', path: file.path });

          if (editorRef.current && model) {
            try {
              editorRef.current.setModel(model);
            } catch (e) {
              console.warn("[Monaco] setModel failed on new tab:", e);
            }
          }
          showToast(`📂 ${file.name}`, "info");
          return;
        }
      }
      await handleFileOpenByPath(filePath);
    } catch (e) {
      showToast('파일을 열 수 없습니다.', 'error');
    }
  };

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
  // 📊 [OMD-EDIT-MainEditorApp-0048] MainEditorApp.tsx ➔ insertAtCursor
  // 🎯 @KICK  : 커서 위치 텍스트 삽입을 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.insertAtCursor
  // ====================================================================
  const insertAtCursor = useCallback((text: string) => {
    if (visualFormulaInsertRef.current) {
      visualFormulaInsertRef.current(text);
      visualFormulaInsertRef.current = null;
      return true;
    }
    return utilsEditorActions.insertAtCursor(editorRef, lastSelectionRef, text);
  }, []);

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-003.2] 지식 베이스 질의응답 답변 에디터 커서 삽입 리스너
  useEffect(() => {
    const handleInsert = (e: CustomEvent) => {
      const text = e.detail;
      if (text && typeof text === 'string') {
        insertAtCursor(text);
      }
    };

    // 📁 [탐색기 폴더 연결 커서 위치 삽입 리스너]
    const handleInsertFolderLink = (e: CustomEvent) => {
      const { link, folderName } = e.detail || {};
      if (!link) return;
      const editor = editorRef.current;
      if (editor && activeTabIdRef.current && previewModeRef.current !== 'preview') {
        insertAtCursor(link);
        showToast(`'${folderName || '폴더'}' 폴더 연결이 커서 위치에 삽입되었습니다.`, 'success');
      } else {
        showToast(`'${folderName || '폴더'}' 폴더 연결 링크가 클립보드에 복사되었습니다.`, 'info');
      }
    };

    window.addEventListener('app:insert-at-cursor', handleInsert as any);
    window.addEventListener('app:insert-folder-link', handleInsertFolderLink as any);
    return () => {
      window.removeEventListener('app:insert-at-cursor', handleInsert as any);
      window.removeEventListener('app:insert-folder-link', handleInsertFolderLink as any);
    };
  }, [showToast, insertAtCursor]);

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0049] MainEditorApp.tsx ➔ findLineNumberByHeading
  // 🎯 @KICK  : 제목 줄 검색을 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.findLineNumberByHeading
  // ====================================================================
  const findLineNumberByHeading = (content: string, heading: string): number => {
    return utilsEditorActions.findLineNumberByHeading(content, heading);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0050] MainEditorApp.tsx ➔ scrollToLine
  // 🎯 @KICK  : 에디터 특정 줄로 스크롤을 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.scrollToLine
  // ====================================================================
  const scrollToLine = (lineNumber: number) => {
    utilsEditorActions.scrollToLine(editorRef, lineNumber);
  };

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

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0052] MainEditorApp.tsx ➔ insertBlockTag
  // 🎯 @KICK  : 블록 태그 감싸기를 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.insertBlockTag
  // ====================================================================
  const insertBlockTag = (startTag: string, endTag: string, defaultText: string = "") => {
    utilsEditorActions.insertBlockTag(editorRef, startTag, endTag, defaultText);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0053] MainEditorApp.tsx ➔ wrapSelection
  // 🎯 @KICK  : 선택 영역 감싸기/풀기를 utilsEditorActions에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsEditorActions.wrapSelection
  // ====================================================================
  const wrapSelection = (before: string, after: string = before, defaultText: string = "") => {
    utilsEditorActions.wrapSelection(editorRef, lastSelectionRef, before, after, defaultText);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0054] MainEditorApp.tsx ➔ insertLink
  // 🎯 @KICK  : 커서에 마크다운 링크 삽입, URL 플레이스홀더 텍스트 자동 선택
  // 🛡️ @GUARD : 현재 선택이 비어있으면 lastSelectionRef 사용; 선택 텍스트와 빈 경우 모두 처리
  // 🚨 @PATCH : None
  // 🔗 @CALLS : editor.focus, editor.getSelection, editor.executeEdits, editor.setSelection
  // ====================================================================
  const insertLink = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.focus();

    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();
    const selectedText = model.getValueInRange(selection);

    if (selectedText) {
      const textToInsert = `[${selectedText}](https://)`;
      const range = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      };
      editor.pushUndoStop();
      editor.executeEdits("insertLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      const cursorColumn = selection.startColumn + 1 + selectedText.length + 2 + 8;

      editor.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: cursorColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: cursorColumn
      });
    } else {
      const textToInsert = `[홈페이지명](https://)`;
      const range = {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      };
      editor.pushUndoStop();
      editor.executeEdits("insertLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
      editor.pushUndoStop();

      const startColumn = selection.startColumn + 1;
      const endColumn = startColumn + 5;

      editor.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: startColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: endColumn
      });
    }
  };

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0057] MainEditorApp.tsx ➔ readFileText
  // 🎯 @KICK  : 브라우저 FileSystemHandle, rootFolder 심층 추적, 지식 베이스(knowledgeClient), 로컬 electronAPI, VFS에서 파일 내용 읽기
  // 🛡️ @GUARD : 경로/핸들/지식문서 여부에 따라 활성 모드 결정; 브라우저 미확장 핸들 추적 및 오류 시 안전한 빈 문자열
  // 🚨 @PATCH : **2026-09-12** — [웹 환경 readFileText 보강] 브라우저 환경에서 node.handle 부재 시 rootFolder.handle 경로 추적 자동 해결 및 지식 보관함(knowledgeClient.getDocumentDetail) 폴백 연동
  // 🔗 @CALLS : node.handle.getFile, rootFolder.handle, knowledgeClient.getDocumentDetail, vfsReadFile, api.readFromPath, fetch
  // ====================================================================
  const readFileText = async (node: FileNode): Promise<string> => {
    let fileContent = '';
    const currentRoot = rootFolderRef.current;
    const driveId = (node as any).driveFileId || (node as any).driveId ||
      (currentRoot?.type === 'GDRIVE' ? (node as any).id : undefined);
    if (driveId || currentRoot?.type === 'GDRIVE' || workspaceType === 'cloud') {
      const token = getSavedDriveToken();
      if (!token || !driveId) {
        throw new Error('구글 드라이브 문서의 연결 정보가 없습니다. 파일 목록에서 다시 열어 주세요.');
      }
      return readDriveFileContent(token, driveId);
    }
    let activeMode = workspaceType;
    if (workspaceType === 'browser') {
      activeMode = 'browser';
    } else if (node.path && !node.handle && /^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(node.path)) {
      activeMode = 'local';
    } else if (node.handle && !node.path) {
      activeMode = 'browser';
    }

    if (activeMode === 'browser') {
      if (node.handle) {
        try {
          const file = await node.handle.getFile();
          fileContent = await file.text();
        } catch (e) {
          console.warn('[readFileText] node.handle.getFile failed:', e);
        }
      }

      // 💡 [브라우저 rootFolder.handle 직접 추적 가드]
      if (!fileContent && rootFolder?.handle && node.path) {
        try {
          const parts = node.path.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
          if (parts.length > 0 && (parts[0] === rootFolder.handle.name || parts[0] === rootFolder.name)) {
            parts.shift();
          }
          let currentDir = rootFolder.handle;
          for (let i = 0; i < parts.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(parts[i], { create: false });
          }
          if (parts.length > 0) {
            const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: false });
            const file = await fileHandle.getFile();
            fileContent = await file.text();
            node.handle = fileHandle;
          }
        } catch (e) {
          // 탐색 실패 시 다음 폴백으로 이동
        }
      }

      // VFS 가상 파일 시스템 폴백
      if (!fileContent && node.path) {
        fileContent = vfsReadFile(node.path);
        if (!fileContent && /^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(node.path)) {
          try {
            const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(node.path)}`));
            if (res.ok) {
              const data = await res.json();
              if (data.ok && typeof data.content === 'string') {
                fileContent = data.content;
              }
            }
          } catch (e) {}
        }
      }
    } else if (activeMode === 'local' && node.path) {
      let targetPath = node.path;
      if (!/^(?:file:\/\/\/|[a-zA-Z]:[/\\]|\/)/i.test(targetPath)) {
        const rootPath = currentRoot?.name || '';
        if (!/^(?:[a-zA-Z]:[/\\]|\/)/.test(rootPath)) {
          const virtualContent = vfsReadFile(targetPath);
          if (virtualContent) return virtualContent;
          throw new Error('로컬 작업장 경로가 없습니다. 작업장을 연결한 뒤 문서를 다시 열어 주세요.');
        }
        targetPath = `${rootPath.replace(/[/\\]+$/, '')}/${targetPath.replace(/^[/\\]+/, '')}`;
      }
      const api = (window as any).electronAPI;
      if (api?.readFromPath) {
        try {
          const file = await api.readFromPath(targetPath);
          if (file) {
            fileContent = file.content;
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        try {
          const res = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(targetPath)}`));
          if (res.ok) {
            const data = await res.json();
            fileContent = data.content;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 💡 [지식 보관함 WASM & 로컬 폴백]
    if (!fileContent && ((node as any).isKnowledge || node.path)) {
      try {
        const rfHandle = resourceFolderHandleRef.current || resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : null);
        const detail = await knowledgeClient.getDocumentDetail({
          filePath: node.path,
          resourceFolder,
          resourceFolderHandle: rfHandle
        });
        const docObj = detail ? (detail.title ? detail : (detail as any).document) : null;
        if (docObj) {
          const chunks = docObj.chunks || [];
          const chunksText = chunks
            .map((c: any) => c.chunkText || c.chunk_text || c.content || '')
            .filter(Boolean)
            .join('\n\n');
          fileContent = chunksText.trim() || (docObj.summary ? `# ${docObj.title}\n\n${docObj.summary}\n\n` : `# ${docObj.title}\n\n`);
        }
      } catch (err) {
        console.warn('[readFileText] knowledgeClient.getDocumentDetail fallback failed:', err);
      }
    }

    return fileContent;
  };
  readFileTextRef.current = readFileText;

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0058] MainEditorApp.tsx ➔ extractHeadings
  // 🎯 @KICK  : 마크다운 텍스트를 파싱하여 제목 텍스트 줄(H1-H6) 추출
  // 🛡️ @GUARD : 제목 텍스트에서 후행 # 문자 제거
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const extractHeadings = (text: string): string[] => {
    if (!text) return [];
    const headingLines = text.split('\n');
    const headings: string[] = [];
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    headingLines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(headingRegex);
      if (match) {
        const hText = match[2].replace(/#+\s*$/, '').trim(); // 뒤에 붙는 불필요한 샵 제거
        if (hText) {
          headings.push(hText);
        }
      }
    });
    return headings;
  };

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0059] MainEditorApp.tsx ➔ handleDocFileClick
  // 🎯 @KICK  : 문서 링크 선택기를 위해 선택된 문서 파일에서 제목 로드
  // 🛡️ @GUARD : 로딩 상태 설정, 오류 시 제목 초기화
  // 🚨 @PATCH : None
  // 🔗 @CALLS : readFileText, extractHeadings, setDocHeadings, setIsHeadingLoading
  // ====================================================================
  const handleDocFileClick = async (targetNode: FileNode) => {
    setSelectedDocNode(targetNode);
    setIsHeadingLoading(true);
    try {
      const text = await readFileText(targetNode);
      const headings = extractHeadings(text);
      setDocHeadings(headings);
    } catch (e) {
      console.error(e);
      setDocHeadings([]);
    } finally {
      setIsHeadingLoading(false);
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0060] MainEditorApp.tsx ➔ handleDocLinkSelect
  // 🎯 @KICK  : 커서에 [[relativePath#heading|text]] 마크다운 문서 간 링크 삽입
  // 🛡️ @GUARD : 완료 시 모든 선택기 상태 초기화; lastSelectionRef로 폴백
  // 🚨 @PATCH : **2026-09-30** — 문서 연결(DocLinkPicker)은 순수 마크다운 문서만 연결하도록 원복
  // 🔗 @CALLS : getRelativePath, editor.focus, editor.getSelection, editor.executeEdits
  // ====================================================================
  // 💡 [문서연결 대상 경로 단일 계산] 현재 문서 기준 상대경로(+#헤딩)를 반환 — 목록 미리보기와 삽입에서 공통 사용
  const getDocLinkDefaultLabel = (targetNode: FileNode): string => {
    let filename = (targetNode.path || targetNode.name).split(/[?#]/)[0].replace(/\\/g, '/').split('/').pop() || targetNode.name;
    try { filename = decodeURIComponent(filename); } catch {}
    return filename.replace(/\.(md|markdown)$/i, '');
  };

  const buildDocLinkTarget = (targetNode: FileNode, heading?: string): string => {
    const targetPath = targetNode.path;
    const headingSuffix = heading && heading.trim() ? `#${heading.trim()}` : '';


    // 💡 [도움말 및 형제 문서 상대경로 보장] 현재 문서와 대상 문서가 모두 도움말(00_시작하기, HELP-*)인 경우 깔끔한 상대경로(./파일명.md) 보장
    if (typeof currentFileNode !== 'undefined' && currentFileNode?.path) {
      const currentPath = (currentFileNode.path || '').replace(/\\/g, '/');
      const isCurrentHelp = /(?:^|\/)(?:docs\/|frontend\/public\/)?help\/[^/]+\.md$/i.test(currentPath) || /^(?:00_시작하기|HELP-\d+)/i.test(currentFileNode.name || '');
      const isTargetHelp = /(?:^|\/)(?:docs\/|frontend\/public\/)?help\/[^/]+\.md$/i.test(targetPath) || /^(?:00_시작하기|HELP-\d+)/i.test(targetNode.name || '');

      if (isCurrentHelp && isTargetHelp) {
        const targetFileName = targetNode.name || targetPath.split('/').pop() || targetPath;
        return `./${targetFileName}${headingSuffix}`;
      }
    }
    const nativeApi = (window as any).electronAPI;
    if (nativeApi?.readFromPath && workspaceType !== 'cloud' && !targetPath.startsWith('knowledge://')) {
      const absolutePath = resolveNativeDocumentPath(targetPath, rootFolder);
      if (absolutePath) return absolutePath.replace(/\\/g, '/') + (heading?.trim() ? `#${heading.trim()}` : '');
    }
    let baseFromPath = currentFileNode?.path;
    if (!baseFromPath) {
      if (workspaceType === 'local' && rootFolder?.name) {
        baseFromPath = rootFolder.name.replace(/\\/g, '/') + '/_workspace_root_.md';
      } else {
        baseFromPath = '_workspace_root_.md';
      }
    }
    let relativePath = getRelativePath(baseFromPath, targetPath);

    // 💡 [에디터 문서 연결 작업장 내 무조건 상대경로 보장]
    if (rootFolder?.name && workspaceType === 'local') {
      const normRoot = rootFolder.name.replace(/\\/g, '/').toLowerCase();
      const normTarget = targetPath.replace(/\\/g, '/').toLowerCase();
      if (normTarget.startsWith(normRoot)) {
        const fromRef = baseFromPath || (rootFolder.name.replace(/\\/g, '/') + '/_workspace_root_.md');
        relativePath = getRelativePath(fromRef, targetPath);
      }
    }

    if (!relativePath.startsWith('.') && !relativePath.startsWith('/') && !relativePath.includes(':')) {
      relativePath = './' + relativePath;
    }

    return `${relativePath}${headingSuffix}`;
  };

  const handleDocLinkSelect = (targetNode: FileNode, heading?: string, customTitle?: string) => {
    const titleToUse = customTitle !== undefined ? customTitle : docLinkCustomTitle;
    // Closing the picker clears its refs. Capture the visual insertion callback first.
    const insertVisualLink = visualDocLinkInsertRef.current;
    closeDocLinkPicker();

    if (!targetNode || !targetNode.path) return;

    // 💡 [웹/데스크톱 공통 표준 상대경로 링크 생성] [링크명](<문서경로>)
    // 표시 이름: 사용자 입력 링크명 > (미입력 시) 최종 문서경로
    const targetUrl = buildDocLinkTarget(targetNode, heading);
    const displayTitle = (titleToUse || '').trim() || getDocLinkDefaultLabel(targetNode);
    // 일반 링크 [네이버](url) 처럼 [문서명](<./상대경로.md#헤딩>) 형식으로 안전하게 삽입
    const textToInsert = `[${displayTitle}](<${targetUrl}>)`;

    // 💡 [VisualDocumentEditor 위지윅 모드 문서 링크 삽입 지원]
    if (insertVisualLink) {
      insertVisualLink(targetUrl, displayTitle);
      return;
    }

    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.focus();

    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;

    const range = {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };
    editor.pushUndoStop();
    editor.executeEdits("insertDocLink", [{ range, text: textToInsert, forceMoveMarkers: true }]);
    editor.pushUndoStop();
    editor.focus();
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0061] MainEditorApp.tsx ➔ parseHtmlTableToMarkdown
  // 🎯 @KICK  : HTML 표를 마크다운으로 변환하는 작업을 paste handlers에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsPasteHandlers.parseHtmlTableToMarkdown
  // ====================================================================
  const parseHtmlTableToMarkdown = (html: string) => {
    return utilsPasteHandlers.parseHtmlTableToMarkdown(html, showToast);
  };

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
  // 📊 [OMD-EDIT-MainEditorApp-0062] MainEditorApp.tsx ➔ sanitizePastedText
  // 🎯 @KICK  : 붙여넣기 텍스트 정제를 paste handlers에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsPasteHandlers.sanitizePastedText
  // ====================================================================
  const sanitizePastedText = (text: string, skipTsvConversion = false) => {
    return utilsPasteHandlers.sanitizePastedText(text, skipTsvConversion);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0063] MainEditorApp.tsx ➔ fixMarkdownTable
  // 🎯 @KICK  : 마크다운 표 수정을 paste handlers에 위임
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : utilsPasteHandlers.fixMarkdownTable
  // ====================================================================
  const fixMarkdownTable = (text: string) => {
    return utilsPasteHandlers.fixMarkdownTable(text);
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0064] MainEditorApp.tsx ➔ resolveClipboardImage
  // 🎯 @KICK  : 클립보드에서 이미지 Blob/File 추출 (items → files → native read → navigator.clipboard 순)
  // 🛡️ @GUARD : 모든 경로 실패 시 null 반환, 성공 시 Blob 반환; dataUrlToBlob 인라인 변환으로 CSP connect-src 차단 방어
  // 🚨 @PATCH : **2026-09-11** — dataUrlToBlob 순수 JS 바이너리 변환 헬퍼 적용 (CSP fetch 거부 방어 및 스크린샷 캡처 즉각 복원)
  // 🔗 @CALLS : 없음
  // ====================================================================
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const isImageLikeFile = (file: File): boolean => {
    if (file.type && file.type.startsWith('image/')) return true;
    const ext = file.name ? file.name.toLowerCase().split('.').pop() : '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff'].includes(ext || '');
  };

  const resolveClipboardImage = async (e: any, imageItemOrFile: any): Promise<Blob | null> => {
      // 0) 이미 File/Blob 객체인 경우
      if (imageItemOrFile instanceof Blob || (typeof File !== 'undefined' && imageItemOrFile instanceof File)) {
        if (imageItemOrFile.size > 0) return imageItemOrFile;
      }

      // 1) 비동기 호출 이전에 동기적으로 브라우저 DataTransferItem 객체에서 File을 즉시 추출
      let syncFile = null;
      if (imageItemOrFile && typeof imageItemOrFile.getAsFile === 'function') {
        try {
          syncFile = imageItemOrFile.getAsFile();
        } catch (_) {}
      }
      if (syncFile && syncFile.size > 0) return syncFile;

      // 2) clipboardData.files 검사 (탐색기 파일 복사 및 드롭 시 MIME 누락 파일명 확장자 지원)
      if (e.clipboardData?.files?.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const f = e.clipboardData.files[i];
          if (isImageLikeFile(f) && f.size > 0) {
            return f;
          }
        }
      }

      // 3) [Electron] 네이티브 클립보드 이미지 읽기 우선 시도 (윈도우 캡처/PrtScn 스크린샷 직접 복원)
      try {
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        if (api && api.readClipboardImage) {
          const dataUrl = await api.readClipboardImage();
          if (dataUrl) {
            return dataUrlToBlob(dataUrl);
          }
        }
      } catch (err) {
        console.warn('[Clipboard] Native read fallback', err);
      }
  
      // 4) navigator.clipboard.read() (Async Clipboard API, 권한 필요)
      try {
        if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
          const clipboardItems = await navigator.clipboard.read();
          for (const ci of clipboardItems) {
            for (const type of ci.types) {
              if (type.startsWith('image/')) {
                return await ci.getType(type);
              }
            }
          }
        }
      } catch { }

      // 5) HTML 데이터 내 <img src="..."> 추출 폴백
      try {
        const html = e.clipboardData?.getData('text/html');
        if (html) {
          const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            const src = imgMatch[1];
            if (src.startsWith('data:image/')) {
              return dataUrlToBlob(src);
            } else if (src.startsWith('http://') || src.startsWith('https://')) {
              try {
                const res = await fetch(src);
                if (res.ok) {
                  return await res.blob();
                }
              } catch (_) {}
            }
          }
        }
      } catch { }

      return null;
    };

    // ====================================================================
    // 💡 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx 의 handleEditorPaste
    // 📝 @KICK  : 붙여넣기 이벤트 처리: 이미지 업로드, HTML 표/복합 AI 문서 변환, 텍스트 정제
    // 🛡️ @GUARD : AI 마크다운 복사 및 웹 문서(표+본문) 붙여넣기 시 표 외 텍스트 유실 원천 방어, 단일 표(엑셀) vs 복합 문서 분기
    // 🚨 @PATCH : **2026-10-07** — AI 응답 및 웹 문서 마크다운 붙여넣기 시 표 외 텍스트 누락 결함 해결 (htmlToImportMarkdown 연동 및 단일 표/복합 문서 지능형 분기)
    // 🔄 @CALLS : fetch, FileReader, htmlToImportMarkdown, parseHtmlTableToMarkdown, sanitizePastedText, fixMarkdownTable, insertAtCursor, updateContent, showToast
    // ====================================================================
    const handleEditorPaste = async (e: any) => {
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;
    let hasText = false;
    let hasHtml = false;
    let imageItem = null;
    let imageFile: File | null = null;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type && it.type.startsWith('image/')) {
          imageItem = it;
        } else if (it.kind === 'file') {
          try {
            const f = it.getAsFile();
            if (f && isImageLikeFile(f)) {
              imageFile = f;
            }
          } catch (_) {}
        }
        if (it.type === 'text/plain') hasText = true;
        if (it.type === 'text/html') hasHtml = true;
      }
    }

    if (files && files.length > 0 && !imageFile) {
      for (let i = 0; i < files.length; i++) {
        if (isImageLikeFile(files[i])) {
          imageFile = files[i];
          break;
        }
      }
    }

    // 💡 [긴급 수정] async 함수 특성상 await를 만나면 이벤트 루프가 양보되어 브라우저/모나코의 
    // 기본 붙여넣기 동작이 실행되어 버립니다. 따라서 await 이전에 동기적으로 데이터를 검사하고 
    // 우리가 처리할 대상이면 e.preventDefault()를 즉시 호출해야 합니다.

    const htmlData = hasHtml ? e.clipboardData.getData('text/html') : '';
    if (htmlData && /<img\b[^>]*src=["']data:image\//i.test(htmlData) && (e.clipboardData.getData('text/plain') || '').trim()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        showToast('붙여넣은 문서의 이미지를 리소스 폴더에 저장하는 중입니다.', 'info');
        const markdown = await importHtmlWithImages(htmlData, async (base64, mime) => {
          const settings = requireResourceSettings();
          const extension = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
          const fileName = `paste_${crypto.randomUUID()}.${extension}`;
          const blob = dataUrlToBlob(`data:${mime};base64,${base64}`);
          if (getResourceSettings()?.kind === 'drive') {
            const token = getSavedDriveToken();
            const mediaFolderId = getResourceSettings('cloud')?.mediaFolderId || getSavedWorkspaceInfo()?.mediaFolderId;
            if (!token || !mediaFolderId) throw new Error('드라이브 리소스 폴더 연결을 확인해 주세요.');
            const uploaded = await uploadDriveImage(token, mediaFolderId, blob, fileName);
            if (!uploaded?.id) throw new Error('이미지 저장에 실패했습니다.');
            return `media/${encodeURIComponent(uploaded.name)}?driveId=${encodeURIComponent(uploaded.id)}`;
          }
          const api = (window as any).electronAPI;
          if (api) {
            const result = await api.saveImage(`${settings.path}${settings.path.includes('\\') ? '\\' : '/'}media`, base64, fileName);
            if (!result?.success) throw new Error('이미지 저장에 실패했습니다.');
            return result.mediaPath || `media://local/serve?url=${encodeURIComponent(result.absolutePath)}`;
          }
          if (!resourceFolderHandle) throw new Error('리소스 폴더 접근 권한을 확인해 주세요.');
          const media = await resourceFolderHandle.getDirectoryHandle('media', { create: true });
          const file = await media.getFileHandle(fileName, { create: true });
          const writable = await file.createWritable();
          await writable.write(blob);
          await writable.close();
          return `/media/${fileName}`;
        });
        if (!insertAtCursor(markdown)) throw new Error('편집영역에 내용을 삽입하지 못했습니다.');
        if (editorRef.current) updateContent(editorRef.current.getValue(), true);
        showToast('문서와 이미지를 붙여넣었습니다.', 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : '문서 붙여넣기에 실패했습니다.', 'error');
      }
      return;
    }
    const hasTable = !!htmlData && htmlData.includes('<table');
    const textData = hasText ? e.clipboardData.getData('text/plain') : '';
    const htmlImgMatch = htmlData ? htmlData.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
    const isDirectImgUrl = /^(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg|bmp))(\?[^\s]*)?$/i.test(textData ? textData.trim() : '');

    let processedText = textData;
    let textChanged = false;
    if (textData) {
      processedText = sanitizePastedText(textData);
      if (processedText.includes('|')) {
        processedText = fixMarkdownTable(processedText);
      }
      if (processedText !== textData) {
        textChanged = true;
      }
    }

    // 💡 [HTML Table 및 AI 마크다운 복사 분석]
    // AI(ChatGPT, Claude, Gemini 등)나 웹페이지에서 표가 포함된 마크다운/본문을 복사한 경우:
    // 1) 순수 단일 표(엑셀/스프레드시트 셀 복사 또는 표 하나만 복사)인지
    // 2) 표 외에 제목, 본문, 목록, 코드 등이 포함된 복합 문서/AI 응답인지 구분
    let isStandaloneTable = false;
    let isRichDocumentWithTable = false;
    let convertedRichMarkdown = '';

    if (hasTable && htmlData) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        const tables = doc.querySelectorAll('table');

        let tableTextLen = 0;
        tables.forEach(t => { tableTextLen += (t.textContent || '').trim().length; });
        const totalTextLen = (doc.body.textContent || '').trim().length;
        const nonTableTextLen = Math.max(0, totalTextLen - tableTextLen);
        const nonTableBlocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, article, section');

        if (tables.length === 1 && nonTableBlocks.length === 0 && nonTableTextLen < 20) {
          isStandaloneTable = true;
        } else {
          isRichDocumentWithTable = true;
          convertedRichMarkdown = htmlToImportMarkdown(htmlData);
        }
      } catch (err) {
        console.warn('HTML table parsing check failed:', err);
      }
    }

    // textData가 이미 마크다운 표(|---|) 및 구조를 지닌 마크다운 원문인지 검사 (AI 복사 버튼 등)
    const hasMarkdownTableInText = !!textData && textData.includes('|') && /\|[\s\t]*:?---*:?[\s\t]*\|/.test(textData);

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    const isImagePasting = !!imageItem || !!imageFile || !!htmlImgMatch || isDirectImgUrl || (isElectron && !hasTable && !textData);

    const shouldHandleCustomPaste = isImagePasting || isStandaloneTable || isRichDocumentWithTable || textChanged;

    // 대상이 하나라도 있으면 즉시 기본 동작 차단
    if (shouldHandleCustomPaste) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation?.();
      (e as any).stopImmediatePropagation?.();
    }

    // 1. 다중 이미지 파일 붙여넣기 일괄 처리
    if (files && files.length > 1) {
      const allImageFiles = Array.from(files).filter(isImageLikeFile);
      if (allImageFiles.length > 1) {
        for (const f of allImageFiles) {
          await handlePasteImageFile(f);
        }
        return;
      }
    }

    // 2. 단일 이미지 처리 (스크린샷, 탐색기 파일 복사, Electron 네이티브 등)
    const resolvedBlob = await resolveClipboardImage(e, imageItem || imageFile);
    if (resolvedBlob) {
      if (e.cancelable && !e.defaultPrevented) e.preventDefault();
      await handlePasteImageFile(resolvedBlob);
      return;
    }

    // 2-1. 웹 이미지 URL (<img src="http...">) 직접 삽입 폴백
    if (htmlImgMatch && htmlImgMatch[1]) {
      const imgSrc = htmlImgMatch[1];
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        if (e.cancelable && !e.defaultPrevented) e.preventDefault();
        insertImageMarkdown(imgSrc);
        showToast('웹 이미지가 마크다운 링크로 삽입되었습니다.', 'success');
        return;
      }
    }

    // 2-2. 순수 이미지 URL 텍스트 붙여넣기 시 마크다운 이미지 삽입
    if (isDirectImgUrl) {
      if (e.cancelable && !e.defaultPrevented) e.preventDefault();
      insertImageMarkdown(textData.trim());
      showToast('이미지 링크가 마크다운으로 삽입되었습니다.', 'success');
      return;
    }

    // 3. 복합 문서(AI 응답, 본문 + 표 포함) 처리: 표뿐만 아니라 본문 전체를 마크다운으로 완벽 보존
    if (isRichDocumentWithTable) {
      // 3-1. textData가 이미 마크다운 표(|---|) 및 구조를 가진 순수 마크다운인 경우 (AI 복사 버튼 클릭 시)
      if (hasMarkdownTableInText && processedText) {
        insertAtCursor(processedText);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("마크다운 문서(본문 및 표 전체)가 완벽하게 삽입되었습니다.", "success");
        return;
      }

      // 3-2. 웹 화면 드래그 복사 등: HTML 전체를 마크다운(표+제목+본문+코드+리스트)으로 변환한 결과물 삽입
      if (convertedRichMarkdown && convertedRichMarkdown.trim()) {
        const cleanedMd = sanitizePastedText(convertedRichMarkdown);
        insertAtCursor(cleanedMd);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("AI 응답 문서(본문 및 표 전체)가 마크다운으로 완벽하게 변환되었습니다.", "success");
        return;
      }

      // 3-3. 폴백: 정제된 텍스트
      if (processedText) {
        insertAtCursor(processedText);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("텍스트 데이터가 삽입되었습니다.", "success");
        return;
      }
    }

    // 4. 순수 단일 HTML Table 처리 (엑셀, 스프레드시트 셀 복사 또는 표 단독 복사)
    if (isStandaloneTable) {
      const mdTable = parseHtmlTableToMarkdown(htmlData);
      if (mdTable) {
        insertAtCursor(mdTable);
        if (editorRef.current) {
          updateContent(editorRef.current.getValue(), true);
        }
        showToast("웹 표 데이터가 마크다운으로 완벽하게 변환되었습니다.", "success");
        return;
      }
    }

    // 5. 일반 텍스트 처리 (정제가 필요한 경우에만)
    if (textChanged) {
      const safeText=processedText.trim() ? processedText : textData;
      if (!insertAtCursor(safeText)) {
        showToast("텍스트를 삽입하지 못했습니다. 편집영역을 클릭한 뒤 다시 붙여넣어 주세요.", "error");
        return;
      }
      if (editorRef.current) {
        updateContent(editorRef.current.getValue(), true);
      }
      showToast("붙여넣은 텍스트가 자동으로 정제(교정)되었습니다.", "success");
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx ➔ handlePasteImageFile
  // 🎯 @KICK  : 이미지 Blob/File을 받아 로컬(데스크탑) 또는 R2(웹)에 저장 후 에디터 커서 위치에 삽입
  // 🛡️ @GUARD : FileReader onload/onerror 처리, 데스크탑/웹 분기, 동일 이미지 반복 삽입 100% 보장
  // 🚨 @PATCH : **2026-10-02** 동일 이미지 반복 붙여넣기/드래그 차단 결함 완전 해결(해시 검사 및 타임스탬프 락 완전 소거)
  // 🔗 @CALLS : fetch, FileReader, showToast
  // ====================================================================
  const handlePasteImageFile = async (fileOrBlob: Blob, onSaved: (path: string) => void = insertImageMarkdown): Promise<void> => {
    try {
      const name = await imageResourceName(fileOrBlob);
      const path = await saveResourceMedia(fileOrBlob,name,resourceFolderHandle);
      onSaved(path);
      showToast('현재 리소스 폴더에 안전하게 저장했습니다.','success');
    } catch(error) { showToast(error instanceof Error ? error.message : '이미지 저장 실패','error'); }
  };
  const handlePasteImageFileRef = useRef(handlePasteImageFile);
  handlePasteImageFileRef.current = handlePasteImageFile;

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0066] MainEditorApp.tsx ➔ insertWithR2Fallback
  // 🎯 @KICK  : 데스크탑: 우선 R2 클라우드 업로드 시도, 실패 시 로컬 파일 시스템(assets/)에 fallback 저장
  // 🛡️ @GUARD : R2 실패 시 api.saveImage 호출
  // 🚨 @PATCH : 2026-07-06 우선 R2 클라우드 업로드 시도 후 실패 시 api.saveImage로 로컬 assets에 저장하도록 재설계
  // 🔗 @CALLS : fetch, api.saveImage, showToast
  // ====================================================================
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0031] MainEditorApp ➔ insertWithLocalSave
  // 🎯 @KICK  : 데스크탑 이미지 붙여넣기 시 무조건 로컬(resourceFolder) 저장
  // 🛡️ @GUARD : api.saveImage 실패 시 toast 안내
  // 🚨 @PATCH : 2026-07-30 — R2 업로드 제거, 무조건 로컬 저장으로 단순화
  // 🔗 @CALLS : api.saveImage, showToast
  // ====================================================================
  const insertWithR2Fallback = async (base64DataClean: string, targetFolder: string, fileName: string, onSaved: (path: string) => void = insertImageMarkdown) => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const saveResult = await api.saveImage(targetFolder, base64DataClean, fileName);
    if (saveResult && saveResult.success) {
      const finalPath = saveResult.mediaPath
        ? saveResult.mediaPath
        : `media://local/serve?url=${encodeURIComponent(saveResult.absolutePath)}`;
      onSaved(finalPath);
      showToast('이미지가 로컬 폴더에 저장되었습니다.', 'success');
    } else {
      showToast('이미지 로컬 저장에 실패했습니다.', 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0067] MainEditorApp.tsx ➔ webUploadImage
  // 🎯 @KICK  : 웹 브라우저: API를 통해 R2(또는 dev 로컬)에 이미지 업로드 후 에디터 삽입
  // 🛡️ @GUARD : dev/production 엔드포인트 분기, JWT 인증
  // 🔗 @CALLS : fetch, showToast
  // ====================================================================
  const webUploadImage = async (base64Data: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const isDev = process.env.NODE_ENV === 'development';
      const uploadEndpoint = isDev ? getApiUrl('/api/upload-pasted-image') : '/api/upload-image';
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const activeFilePath = currentFileNode?.path || currentFileNodeRef.current?.path || tabsRef.current?.find(t => t.id === activeTabIdRef.current)?.path || '';
      const response = await fetch(uploadEndpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ base64Data, targetFolder: activeFilePath || rootFolderRef.current?.name || '' }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.relativePath) {
          insertImageMarkdown(data.relativePath);
          showToast(isDev ? '개발 환경: 로컬 assets 폴더에 저장되었습니다.' : '웹 환경: 클라우드 서버(R2)에 성공적으로 업로드되었습니다.', 'success');
        } else {
          showToast('이미지 업로드 실패: ' + (data.error || '알 수 없는 오류'), 'error');
        }
      } else {
        showToast(`서버 오류 발생 (${response.status})`, 'error');
      }
    } catch (err) {
      console.error('[Web Upload Error]', err);
      showToast('이미지 업로드 전송 중 네트워크 오류가 발생했습니다.', 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0068] MainEditorApp.tsx ➔ insertImageMarkdown
  // 🎯 @KICK  : 에디터 커서 위치에 마크다운 이미지 문법 삽입 후 빈 줄 2행 추가 및 커서 이동
  // 🛡️ @GUARD : editorRef.current null 체크, readOnly 우회
  // 🚨 @PATCH : **2026-10-02** - insertMediaAtCursor에 updateContent 전달 및 insertAtCursor 안전 폴백 추가
  // 🔗 @CALLS : insertMediaAtCursor(editorActions), updateContent
  // ====================================================================
  const replaceDocumentMedia = (range, code: string) => {
    if (range.documentId !== activeTabIdRef.current || contentRef.current.slice(range.from,range.to) !== range.source) return false;
    const next = contentRef.current.slice(0,range.from) + code.trim() + contentRef.current.slice(range.to);
    contentRef.current = next; updateContent(next);
    setTabs(previous=>previous.map(tab=>tab.id===range.documentId?{...tab,content:next,isModified:true}:tab));
    return true;
  };
  const editDocumentMedia = (kind:'image'|'video'|'map',path:string,line:number) => {
    if (isRestrictedUser) return;
    const found = mediaSourceRange(contentRef.current,kind,path,line);
    if (!found) {showToast('원본 미디어 위치를 찾지 못했습니다.','warning');return;}
    const range = {...found,documentId:activeTabIdRef.current,documentMedia:true};
    if (kind==='image') {
      const details = visualImageDetails(found.source);
      const params = new URLSearchParams(details.path.split('?')[1] || '');
      const captionPos = params.get('caption');
      setEditingImageInfo({
        path: details.path,
        alt: details.alt,
        width: params.get('width') || '',
        height: params.get('height') || '',
        align: params.get('align') || 'center',
        captionPos: (captionPos === 'top' || captionPos === 'bottom') ? captionPos : undefined,
        range
      });
      setIsImageModalOpen(true);
    } else {
      visualMediaInsertRef.current = {kind,documentId:range.documentId,insert:code=>replaceDocumentMedia(range,code)};
      setMediaDialogSource({kind,source:found.source});
      if(kind==='map')setIsMapModalOpen(true);else{setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
    }
  };
  const insertImageMarkdown = (path: string) => {
    if (!editorRef.current) {
      showToast('에디터를 찾을 수 없어 이미지를 삽입할 수 없습니다.', 'error');
      return;
    }
    const textToInsert = `![](${path})`;
    try {
      utilsEditorActions.insertMediaAtCursor(editorRef, lastSelectionRef, textToInsert, updateContent);
    } catch (err) {
      console.warn('[insertImageMarkdown] insertMediaAtCursor fallback to insertAtCursor:', err);
      insertAtCursor(`\n${textToInsert}\n\n`);
      if (editorRef.current) {
        updateContent(editorRef.current.getValue(), true);
      }
    }
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0065] MainEditorApp.tsx ➔ applyLinePrefix
  // 🎯 @KICK  : 선택된 줄에 순서 목록/글머리 기호/인용구/체크리스트 접두사 적용
  // 🛡️ @GUARD : 이전 비어있지 않은 줄(최대 10줄)에서 연속 순서 번호 계산; 중첩 인용구 처리
  // 🚨 @PATCH : 구문 강조 새로고침을 위해 편집 후 forceTokenization
  // 🔗 @CALLS : editor.getSelection, editor.executeEdits, model.forceTokenization, editor.layout
  // ====================================================================
  const applyLinePrefix = (prefixType: 'orderedList' | 'list' | 'quote' | 'check' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', alertType?: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;

    // ─────────────────────────────────────────────────────────────
    // 1. 제목 (H1 ~ H6) 토글/취소 처리
    // ─────────────────────────────────────────────────────────────
    if (prefixType.startsWith('h') && prefixType.length === 2 && !isNaN(Number(prefixType[1]))) {
      const targetLevel = Number(prefixType[1]);
      const targetPrefix = '#'.repeat(targetLevel) + ' ';

      // 선택된 모든 줄이 이미 해당 레벨의 제목인지 확인
      let allAlreadyTarget = true;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const headingMatch = lineContent.match(/^(\s*)(#{1,6})\s+(.*)/);
        if (!headingMatch || headingMatch[2].length !== targetLevel) {
          allAlreadyTarget = false;
          break;
        }
      }

      const edits = [];
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const match = lineContent.match(/^(\s*)(#{1,6})\s*(.*)/);
        if (allAlreadyTarget) {
          // 🔥 취소: 이미 해당 제목이 설정되어 있으므로 # 기호를 제거하여 일반 문단으로 복귀
          if (match) {
            const indent = match[1] || '';
            const rest = match[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${rest}`,
              forceMoveMarkers: true
            });
          }
        } else {
          // 적용/변경: 기존 제목 기호가 있으면 해당 레벨로 치환, 없으면 접두사 추가
          if (match) {
            const indent = match[1] || '';
            const rest = match[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${targetPrefix}${rest}`,
              forceMoveMarkers: true
            });
          } else {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const rest = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}${targetPrefix}${rest}`,
              forceMoveMarkers: true
            });
          }
        }
      }

      editor.pushUndoStop();
      editor.executeEdits("toggleHeading", edits);
      editor.pushUndoStop();

      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= endLine; i++) {
            model.forceTokenization(i);
          }
        }
        editor.layout();
      } catch (_) { }

      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Alert 인용구 토글/취소 처리
    // ─────────────────────────────────────────────────────────────
    if (prefixType === 'quote' && alertType) {
      // 선택된 줄 중 이미 동일한 Alert 태그를 가지고 있는지 확인
      let allAlreadyThisAlert = true;
      let alertCount = 0;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const existingAlertMatch = lineContent.match(/^(\s*>+\s*)\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\](.*)/i);
        if (existingAlertMatch) {
          alertCount++;
        } else if (lineContent.trim()) {
          allAlreadyThisAlert = false;
        }
      }

      if (alertCount > 0 && allAlreadyThisAlert) {
        // 🔥 취소: 이미 동일한 Alert 인용구이므로 Alert 태그 및 인용구 제거하여 일반 문단으로 복귀
        const edits = [];
        for (let i = startLine; i <= endLine; i++) {
          const lineContent = model.getLineContent(i);
          const clean = lineContent.replace(/^(\s*)>+\s*(\[!.*?\])?\s*/i, '$1');
          edits.push({
            range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
            text: clean,
            forceMoveMarkers: true
          });
        }
        editor.pushUndoStop();
        editor.executeEdits("cancelAlertQuote", edits);
        editor.pushUndoStop();
        try {
          if (model && typeof model.forceTokenization === 'function') {
            for (let i = startLine; i <= endLine; i++) model.forceTokenization(i);
          }
          editor.layout();
        } catch (_) { }
        editor.focus();
        return;
      }

      // 💡 [Alert 인용구 빈 줄 단독 커서 삽입]
      if (selection.isEmpty()) {
        const lineContent = model.getLineContent(startLine);
        if (lineContent.trim() === '') {
          const insertText = `> [!${alertType}]\n> \n\n`;
          editor.pushUndoStop();
          editor.executeEdits("insertAlertQuote", [{
            range: new (window as any).monaco.Range(startLine, 1, startLine, lineContent.length + 1),
            text: insertText,
            forceMoveMarkers: true
          }]);
          editor.setPosition({ lineNumber: startLine + 1, column: 3 });
          editor.pushUndoStop();
          editor.focus();
          return;
        }
      }

      const edits = [];
      let addedAlertHeaderLine = false;
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const existingAlertMatch = lineContent.match(/^(\s*>+\s*)\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\](.*)/i);
        if (existingAlertMatch) {
          const prefix = existingAlertMatch[1];
          const rest = existingAlertMatch[2];
          edits.push({
            range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
            text: `${prefix}[!규칙${alertType}]${rest}`.replace('!규칙', '!'),
            forceMoveMarkers: true
          });
        } else if (i === startLine) {
          addedAlertHeaderLine = true;
          const quoteMatch = lineContent.match(/^(\s*)(>+\s*)(.*)/);
          if (quoteMatch) {
            const indent = quoteMatch[1] || '';
            const quotes = quoteMatch[2] || '> ';
            const text = quoteMatch[3] || '';
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> [!${alertType}]\n${indent}${quotes}${text}`,
              forceMoveMarkers: true
            });
          } else {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const text = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> [!${alertType}]\n${indent}> ${text}`,
              forceMoveMarkers: true
            });
          }
        } else {
          const quoteMatch = lineContent.match(/^(\s*)(>+\s*)(.*)/);
          if (!quoteMatch) {
            const indentMatch = lineContent.match(/^(\s*)(.*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            const text = indentMatch ? indentMatch[2] : lineContent;
            edits.push({
              range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
              text: `${indent}> ${text}`,
              forceMoveMarkers: true
            });
          }
        }
      }

      editor.pushUndoStop();
      editor.executeEdits("applyAlertQuote", edits);
      const quoteEndLine = endLine + (addedAlertHeaderLine ? 1 : 0);
      const quoteEndCol = model.getLineContent(quoteEndLine).length + 1;
      editor.executeEdits("appendQuoteEmptyLine", [{
        range: new (window as any).monaco.Range(quoteEndLine, quoteEndCol, quoteEndLine, quoteEndCol),
        text: '\n\n',
        forceMoveMarkers: false
      }]);
      editor.setPosition({ lineNumber: quoteEndLine, column: quoteEndCol });
      editor.pushUndoStop();
      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= Math.min(model.getLineCount(), endLine + 3); i++) model.forceTokenization(i);
        }
        editor.layout();
      } catch (_) { }
      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. 일반 서식 (quote, list, orderedList, check) 토글/취소 판단
    // ─────────────────────────────────────────────────────────────
    let allAlreadyHavePrefix = true;
    let nonEmptyCount = 0;
    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      if (!lineContent.trim()) continue;
      nonEmptyCount++;

      if (prefixType === 'quote') {
        if (!lineContent.match(/^\s*>+\s*/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'list') {
        if (!lineContent.match(/^\s*[-*+]\s+/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'orderedList') {
        if (!lineContent.match(/^\s*\d+\.\s+/)) { allAlreadyHavePrefix = false; break; }
      } else if (prefixType === 'check') {
        if (!lineContent.match(/^\s*- \[[ xX]\]\s+/)) { allAlreadyHavePrefix = false; break; }
      }
    }

    if (nonEmptyCount > 0 && allAlreadyHavePrefix) {
      // 🔥 취소: 이미 동일한 기능이 설정되어 있으므로 접두사 제거 (취소 토글)
      const edits = [];
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        if (!lineContent.trim()) continue;

        let cleanLine = lineContent;
        if (prefixType === 'quote') {
          cleanLine = lineContent.replace(/^(\s*)>+\s*/, '$1');
        } else if (prefixType === 'list') {
          cleanLine = lineContent.replace(/^(\s*)[-*+]\s+/, '$1');
        } else if (prefixType === 'orderedList') {
          cleanLine = lineContent.replace(/^(\s*)\d+\.\s+/, '$1');
        } else if (prefixType === 'check') {
          cleanLine = lineContent.replace(/^(\s*)- \[[ xX]\]\s+/, '$1');
        }

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, lineContent.length + 1),
          text: cleanLine,
          forceMoveMarkers: true
        });
      }

      editor.pushUndoStop();
      editor.executeEdits("cancelPrefix", edits);
      editor.pushUndoStop();
      setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
      try {
        if (model && typeof model.forceTokenization === 'function') {
          for (let i = startLine; i <= endLine; i++) model.forceTokenization(i);
        }
        editor.layout();
      } catch (_) { }
      editor.focus();
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 일반 서식 신규 적용
    // ─────────────────────────────────────────────────────────────
    const edits = [];
    let counter = 1;
    const selectedIndents = Array.from({length:endLine-startLine+1},(_,index)=>model.getLineContent(startLine+index))
      .filter(line=>line.trim()).map(line=>line.match(/^[ \t]*/)?.[0] || '');
    const orderedIndent = selectedIndents.reduce((shortest,indent)=>indent.length<shortest.length?indent:shortest,selectedIndents[0] || '');
    if (prefixType === 'orderedList') {
      for (let j = startLine - 1; j > 0; j--) {
        const prevLine = model.getLineContent(j);
        if (prevLine.trim() === '') break;
        const match = prevLine.match(/^(\s*)(\d+)\.\s/);
        if (match) {
          counter = parseInt(match[2], 10) + 1;
          break;
        }
        if (startLine - j > 10) break;
      }
    }

    for (let i = startLine; i <= endLine; i++) {
      const lineContent = model.getLineContent(i);
      const match = lineContent.match(/^(\s*)(>+\s*)?((?:- \[[ xX]\]|[-*+]|\d+\.)\s+)?(.*)/);
      if (prefixType === 'orderedList' && !lineContent.trim()) continue;

      if (match) {
        const indent = prefixType === 'orderedList' && endLine > startLine ? orderedIndent : match[1] || '';
        const quotes = match[2] || '';
        const listSymbol = match[3] || '';
        let text = match[4] || '';
        if (prefixType === 'orderedList') text = text.replace(/^(?:[ \t]*\d+\\?[.)](?:[ \t]+|(?=[가-힣])))+/, '');

        let newQuotes = quotes;
        let newListSymbol = listSymbol;

        if (prefixType === 'quote') {
          newQuotes = quotes ? '>' + quotes : '> ';
        } else {
          let targetListSymbol = '';
          if (prefixType === 'orderedList') {
            targetListSymbol = `${counter}. `;
            counter++;
          } else if (prefixType === 'list') {
            targetListSymbol = '- ';
          } else if (prefixType === 'check') {
            targetListSymbol = '- [ ] ';
          }
          newListSymbol = targetListSymbol;
        }

        const textStartIndex = lineContent.length - text.length;
        const newPrefix = `${indent}${newQuotes}${newListSymbol}`;

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, textStartIndex + 1),
          text: newPrefix,
          forceMoveMarkers: true
        });
      } else {
        let fallbackPrefix = '';
        if (prefixType === 'orderedList') {
          fallbackPrefix = `${counter}. `;
          counter++;
        } else if (prefixType === 'list') {
          fallbackPrefix = '- ';
        } else if (prefixType === 'quote') {
          fallbackPrefix = '> ';
        } else if (prefixType === 'check') {
          fallbackPrefix = '- [ ] ';
        }

        edits.push({
          range: new (window as any).monaco.Range(i, 1, i, 1),
          text: fallbackPrefix,
          forceMoveMarkers: true
        });
      }
    }

    editor.pushUndoStop();
    editor.executeEdits("applyPrefix", edits);
    if (prefixType === 'quote') {
      const quoteEndLine = endLine;
      const quoteEndCol = model.getLineContent(quoteEndLine).length + 1;
      editor.executeEdits("appendQuoteEmptyLine", [{
        range: new (window as any).monaco.Range(quoteEndLine, quoteEndCol, quoteEndLine, quoteEndCol),
        text: '\n\n',
        forceMoveMarkers: false
      }]);
      editor.setPosition({ lineNumber: quoteEndLine, column: quoteEndCol });
    }
    editor.pushUndoStop();
    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);

    try {
      const model = editor.getModel();
      if (model && typeof model.forceTokenization === 'function') {
        const maxTokenLine = Math.min(model.getLineCount(), endLine + (prefixType === 'quote' ? 3 : 0));
        for (let i = startLine; i <= maxTokenLine; i++) {
          model.forceTokenization(i);
        }
      }
      editor.layout();
    } catch (_) { }

    editor.focus();
  };

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0066] MainEditorApp.tsx ➔ removePrefix
  // 🎯 @KICK  : 선택 영역에서 마크다운 서식 태그 제거: 굵게, 기울임, 취소선, 코드, 링크, 제목, 목록
  // 🛡️ @GUARD : 빈 선택 영역을 전체 줄로 확장 처리; 정규식 기반 정리로 선행 공백 보존
  // 🚨 @PATCH : 구문 강조 새로고침을 위해 편집 후 forceTokenization
  // 🔗 @CALLS : editor.getSelection, editor.executeEdits, model.forceTokenization, editor.layout
  // ====================================================================
  const removePrefix = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if ((!selection || selection.isEmpty()) && lastSelectionRef.current && !lastSelectionRef.current.isEmpty()) {
      selection = lastSelectionRef.current;
    }
    if (!selection) return;
    const model = editor.getModel();

    let rangeToProcess = selection;
    if (selection.isEmpty()) {
      const cursorLine = selection.positionLineNumber;
      const lineLen = model.getLineLength(cursorLine);
      rangeToProcess = new (window as any).monaco.Range(cursorLine, 1, cursorLine, lineLen + 1);
    }

    const selectedText = model.getValueInRange(rangeToProcess);
    const cleanedText = clearMarkdownFormatting(selectedText);

    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
    editor.pushUndoStop();
    editor.executeEdits("removeMarkdownTags", [
      {
        range: rangeToProcess,
        text: cleanedText,
        forceMoveMarkers: true
      }
    ]);
    editor.pushUndoStop();

    // [WBS SYNC-02] 주입 직후 구문 강조와 배경 스타일이 즉시 화면에 렌더링되도록 Monaco 모델의 강제 토큰화 수동 격발
    try {
      const model = editor.getModel();
      if (model && typeof model.forceTokenization === 'function') {
        const startLine = rangeToProcess.startLineNumber;
        const endLine = rangeToProcess.endLineNumber;
        for (let i = startLine; i <= endLine; i++) {
          model.forceTokenization(i);
        }
      }
      editor.layout();
    } catch (_) { }

    editor.focus();
  };

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
  const dynamicCssString = useMemo(() => {
    const rawProf = documentBookProfile('', profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE, previewMode === 'css-style' || isStyleModalOpen);
    if (activeProfileId === 'default') {
      return (rawProf.customCss && rawProf.customCss.trim())
        ? `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-extra {\n${rawProf.customCss}\n}`
        : '';
    }
    const prof = resolveCssProfile(rawProf);
    const ps = prof.pageStyle;

    const profileBg = ps.backgroundColor || '#ffffff';
    const bg = profileBg;
    // Set a very dark gray/black color instead of 'inherit' for much better contrast on white backgrounds
    const fg = '#1a1a1a';

    let css = `
.custom-preview-container {
  background: ${bg} !important;
  color: ${fg} !important;
  font-family: ${ps.fontFamily} !important;
  font-size: ${ps.fontSize} !important;
  line-height: ${ps.lineHeight} !important;
  letter-spacing: ${ps.letterSpacing} !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
  -webkit-font-smoothing: subpixel-antialiased !important;
  -moz-osx-font-smoothing: auto !important;
  text-rendering: optimizeLegibility !important;
}
.custom-preview-container p,
.custom-preview-container strong,
.custom-preview-container b,
.custom-preview-container em,
.custom-preview-container span,
.custom-preview-container a,
.custom-preview-container .onrivi-content-root p,
.custom-preview-container li,
.custom-preview-container .onrivi-content-root li,
.custom-preview-container blockquote,
.custom-preview-container .onrivi-content-root blockquote {
  font-size: inherit !important;
  line-height: ${(prof.rules.p && prof.rules.p['line-height']) || ps.lineHeight || '1.8'} !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
}
/* 탭 간격 (Tab Size) — pre/code에서 탭 문자가 표시될 폭 */
.custom-preview-container pre,
.custom-preview-container code {
  tab-size: ${ps.tabSize || '2'} !important;
  -moz-tab-size: ${ps.tabSize || '2'} !important;
}
`;
    /* H2~H6 자동 크기 계산 (headingSizeOffset 기반, pt/px 단위 상호 변환 및 '0pt' 명시 지원) */
    const h1SizeVal = (prof.rules.h1 && prof.rules.h1['font-size']) || '21pt';
    const isPt = h1SizeVal.endsWith('pt') || (!h1SizeVal.endsWith('px') && !h1SizeVal.endsWith('rem') && !h1SizeVal.endsWith('em'));
    const h1Unit = isPt ? 'pt' : (h1SizeVal.endsWith('px') ? 'px' : 'pt');
    const h1Size = parseFloat(h1SizeVal) || (isPt ? 21 : 28);
    const rawOffsetStr = (ps.headingSizeOffset || '').trim();
    const offset = (() => {
      if (!rawOffsetStr || rawOffsetStr === '0px') return isPt ? 3 : 4;
      if (rawOffsetStr === '0pt' || rawOffsetStr === '0') return 0;
      const num = parseFloat(rawOffsetStr);
      if (isNaN(num)) return isPt ? 3 : 4;
      if (rawOffsetStr.endsWith('pt') && !isPt) return Math.round((num / 0.75) * 10) / 10;
      if (rawOffsetStr.endsWith('px') && isPt) return Math.round((num * 0.75) * 10) / 10;
      return num;
    })();
    for (let level = 2; level <= 6; level++) {
      const calcSize = Math.max(isPt ? 8 : 10, Math.round((h1Size - (level - 1) * offset) * 10) / 10);
      css += `.custom-preview-container h${level}, .onrivi-content-root h${level} {\n  font-size: ${calcSize}${h1Unit} !important;\n}\n`;
    }

    // 💡 CSS 속성 우선순위 정렬기: 단축 속성(border-style/width 등)이 방향별 속성(border-left/right 등)보다 항상 먼저 선언되도록 보장
    const DIRECTIONAL_PROPS = new Set([
      'border-top', 'border-bottom', 'border-left', 'border-right',
      'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
      'border-top-style', 'border-bottom-style', 'border-left-style', 'border-right-style',
      'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
      'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
      'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    ]);
    const sortCssProps = (a: string, b: string): number => {
      const isADir = DIRECTIONAL_PROPS.has(a);
      const isBDir = DIRECTIONAL_PROPS.has(b);
      if (isADir && !isBDir) return 1;
      if (!isADir && isBDir) return -1;
      return a.localeCompare(b);
    };

    Object.entries(prof.rules).forEach(([tag, ruleObj]) => {
      /* hr(구분선)은 전용 인젝션 블록에서 완전하게 통합 제어하므로 건너뜀 */
      if (tag === 'hr') return;
      /* h2~h6의 font-size는 headingSizeOffset 자동 계산으로 대체 */
      const skipFontSize = ['h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
      // 빈 값도 '선 없음'으로 출력해야 다른 서식의 제목 장식선(하단 밑줄·좌측 색깔바)이 남지 않는다.
      const effectiveRules = /^h[1-6]$/.test(tag)
        ? {
            ...ruleObj,
            'border-bottom': ruleObj['border-bottom']?.trim() || 'none',
            'border-left': ruleObj['border-left']?.trim() || 'none',
          }
        : ruleObj;
      const entries = Object.entries(effectiveRules).map(([prop, v]) => {
        // 💡 [OMD-PATCH] 구버전 유저 프로필에 저장된 keep-all이 불러와지면서 거대 공백 버그를 유발하는 것을 막기 위해 강제 마이그레이션
        if (prop === 'word-break' && v === 'keep-all') return [prop, 'break-all'];
        return [prop, v];
      }).filter(([prop, v]) => {
        if (v === '') return false;
        if (skipFontSize && prop === 'font-size') return false;
        if (prop === 'sentence-gap') return false;
        return true;
      }).sort((a, b) => sortCssProps(a[0], b[0]));

      if (tag === 'p') {
        const sGap = ruleObj['sentence-gap'];
        const sGapNum = parseInt(sGap || '0', 10) || 0;
        if (sGapNum > 0) {
          css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak) {
  display: block !important;
  content: "" !important;
  margin-top: ${sGap} !important;
  height: 0 !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line {
  margin-top: ${sGap} !important;
}
`;
        } else {
          css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak) {
  display: inline !important;
  margin: 0 !important;
  content: normal !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line {
  margin-top: 0 !important;
}
`;
        }
      }

      if (entries.length === 0) return;

      if (tag === 'codeBlockTitle') {
        const bgColor = ruleObj['background-color'];
        const textColor = ruleObj['color'];
        if (bgColor) {
          css += `.custom-preview-container .codeblock-header {\n  background-color: ${bgColor} !important;\n}\n`;
        }
        if (textColor) {
          css += `.custom-preview-container .codeblock-header-text {\n  color: ${textColor} !important;\n}\n`;
        }
        return;
      }

      if (tag === 'codeBlock') {
        const bgColor = ruleObj['background-color'];
        const color = ruleObj['color'];
        const fontSize = ruleObj['font-size'];
        const padding = ruleObj['padding'];
        const borderRadius = ruleObj['border-radius'];

        if (bgColor) {
          css += `.custom-preview-container .codeblock-area {\n  background-color: ${bgColor} !important;\n}\n`;

          // 💡 코드블록 배경색 명도(Luminance) 판별: 다크모드 계열/어두운 배경일 경우 고대비 코발트 블루 및 1px 아웃라인 하이라이트 적용
          const isDarkBg = (() => {
            const c = (bgColor || '').trim().toLowerCase();
            if (c.startsWith('#')) {
              let hex = c.slice(1);
              if (hex.length === 3) hex = hex.split('').map((x: string) => x + x).join('');
              if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
              }
            }
            const rgb = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgb) {
              const r = parseInt(rgb[1], 10);
              const g = parseInt(rgb[2], 10);
              const b = parseInt(rgb[3], 10);
              return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
            }
            return true;
          })();

          if (isDarkBg) {
            css += `.custom-preview-container .codeblock-area .onrivi-line.preview-highlight-line {\n  background-color: rgba(59, 130, 246, 0.3) !important;\n  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.65) !important;\n  border-radius: 4px;\n}\n`;
          } else {
            css += `.custom-preview-container .codeblock-area .onrivi-line.preview-highlight-line {\n  background-color: rgba(255, 152, 0, 0.16) !important;\n  border-radius: 4px;\n}\n`;
          }
        }
        if (borderRadius) {
          css += `.custom-preview-container .codeblock-area {\n  border-radius: ${borderRadius} !important;\n}\n`;
        }
        if (color) {
          css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  color: ${color} !important;\n}\n`;
        }
        if (fontSize) {
          css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  font-size: ${fontSize} !important;\n}\n`;
        } else {
          css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  font-size: inherit !important;\n}\n`;
        }
        if (padding) {
          css += `.custom-preview-container .codeblock-area pre {\n  padding: ${padding} !important;\n}\n`;
        }
        const cbLineHeight = ruleObj['line-height'] || '1.35';
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code, .custom-preview-container .codeblock-area .onrivi-line, .custom-preview-container .codeblock-area .onrivi-line * {\n  line-height: ${cbLineHeight} !important;\n  min-height: 0 !important;\n}\n`;

        // 💡 프리뷰 모드에서 중첩된 테두리와 배경색(박스 안의 박스 현상) 원천 차단
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  border: none !important;\n  background: transparent !important;\n}\n`;

        // 💡 코드블록 전용 명시적 가로 스크롤바 (테마의 글자 색상을 바탕으로 한층 더 밝고 두껍게)
        const trackColor = color ? `color-mix(in srgb, ${color} 15%, transparent)` : 'rgba(200, 200, 200, 0.1)';
        const thumbColor = color ? `color-mix(in srgb, ${color} 60%, transparent)` : 'rgba(200, 200, 200, 0.6)';
        const thumbHoverColor = color ? `color-mix(in srgb, ${color} 85%, transparent)` : 'rgba(200, 200, 200, 0.8)';

        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar {\n  height: 10px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-track {\n  background: ${trackColor} !important;\n  border-radius: 5px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-thumb {\n  background: ${thumbColor} !important;\n  border-radius: 5px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-thumb:hover {\n  background: ${thumbHoverColor} !important;\n}\n`;
        return;
      }

      if (tag === 'math') {
        const marginTop = ruleObj['margin-top'] || '16px';
        const marginBottom = ruleObj['margin-bottom'] || '16px';
        const textAlign = ruleObj['text-align'] || 'center';
        const color = ruleObj['color'];
        const fontSize = ruleObj['font-size'];

        // 1. 디스플레이 수식 블록 컨테이너 (.katex-display)
        css += `
  .custom-preview-container .katex-display,
  .onrivi-content-root .katex-display {
    display: flex !important;
    ${textAlign === 'center' ? 'justify-content: center !important;' : textAlign === 'right' ? 'justify-content: flex-end !important;' : 'justify-content: flex-start !important;'}
    text-align: ${textAlign} !important;
    margin-top: ${marginTop} !important;
    margin-bottom: ${marginBottom} !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding: 0 !important;
  }
  .custom-preview-container p:has(> .katex-display),
  .onrivi-content-root p:has(> .katex-display) {
    margin: 0 !important;
  }
  .custom-preview-container .katex-display > .katex,
  .onrivi-content-root .katex-display > .katex {
    text-align: ${textAlign} !important;
  }
  `;

        // 2. 수식 글자 크기 및 색상 (.katex)
        // 💡 font-size 미지정('기본설정 유지') 시 inherit !important를 강제 주입하여 문서 기본 글자 크기 실시간 동기화
        css += `
  .custom-preview-container .katex-display .katex,
  .custom-preview-container :not(.katex-display) > .katex,
  .onrivi-content-root .katex-display .katex,
  .onrivi-content-root :not(.katex-display) > .katex {
    ${fontSize ? `font-size: ${fontSize} !important;` : `font-size: inherit !important;`}
    ${color ? `color: ${color} !important;` : ''}
  }
  `;
        return;
      }

      if (tag === 'footnote') {
        const color = ruleObj['color'];
        const fontSize = ruleObj['font-size'];
        const lineHeight = ruleObj['line-height'];
        const marginTop = ruleObj['margin-top'];
        const marginBottom = ruleObj['margin-bottom'];
        const fontWeight = ruleObj['font-weight'];

        const footnoteTextSelectors = [
          '.custom-preview-container .footnotes',
          '.custom-preview-container .footnotes p',
          '.custom-preview-container .footnotes li',
          '.custom-preview-container .footnotes a',
          '.onrivi-content-root .footnotes',
          '.onrivi-content-root .footnotes p',
          '.onrivi-content-root .footnotes li',
          '.onrivi-content-root .footnotes a',
          '.custom-preview-container .visual-footnote-def',
          '.custom-preview-container .visual-footnote-text',
          '.onrivi-content-root .visual-footnote-def',
          '.onrivi-content-root .visual-footnote-text'
        ].join(', ');

        const footnoteSizeSelectors = [
          '.custom-preview-container .footnotes',
          '.custom-preview-container .footnotes p',
          '.custom-preview-container .footnotes li',
          '.custom-preview-container .footnotes a',
          '.onrivi-content-root .footnotes',
          '.onrivi-content-root .footnotes p',
          '.onrivi-content-root .footnotes li',
          '.onrivi-content-root .footnotes a',
          '.custom-preview-container .visual-footnote-def',
          '.custom-preview-container .visual-footnote-text',
          '.custom-preview-container .visual-footnote-badge',
          '.onrivi-content-root .visual-footnote-def',
          '.onrivi-content-root .visual-footnote-text',
          '.onrivi-content-root .visual-footnote-badge'
        ].join(', ');

        if (marginTop) {
          css += `.custom-preview-container .footnotes, .onrivi-content-root .footnotes, .custom-preview-container .visual-footnote-area-header, .onrivi-content-root .visual-footnote-area-header {\n  margin-top: ${marginTop} !important;\n}\n`;
        }
        if (marginBottom) {
          css += `.custom-preview-container .footnotes, .onrivi-content-root .footnotes, .custom-preview-container .visual-footnote-def-container, .onrivi-content-root .visual-footnote-def-container {\n  margin-bottom: ${marginBottom} !important;\n}\n`;
        }
        if (color) {
          css += `${footnoteTextSelectors} {\n  color: ${color} !important;\n}\n`;
        }
        if (fontSize) {
          css += `${footnoteSizeSelectors} {\n  font-size: ${fontSize} !important;\n}\n`;
        } else {
          css += `${footnoteSizeSelectors} {\n  font-size: 12.5px !important;\n}\n`;
        }
        if (lineHeight) {
          css += `${footnoteSizeSelectors} {\n  line-height: ${lineHeight} !important;\n}\n`;
        }
        if (fontWeight) {
          css += `${footnoteSizeSelectors} {\n  font-weight: ${fontWeight} !important;\n}\n`;
        }
        return;
      }

      const selector = tag === 'taskList' ? '.task-list-item' :
        tag === 'code' ? ':not(pre) > code, code:not(pre code):not(.codeblock-area code)' :
          tag === 'map' ? 'iframe[src*="map"], iframe[src*="google.com/maps"], iframe[src*="maps.google.com"]' :
            tag === 'video' ? 'video, iframe[src*="youtube"], iframe[src*="vimeo"], a[href*="youtube.com"] img, a[href*="youtu.be"] img' : tag;
            
      const isMediaTag = tag === 'img' || tag === 'video' || tag === 'map';
      const isTableTag = ['table', 'th', 'td'].includes(tag);

      // 📊 Tailwind Typography 및 다크모드(.dark .prose)를 완벽히 압도하도록 모든 태그의 선택자 구체성을 일원화
      const selectorStr = `
        .custom-preview-container ${selector},
        .onrivi-content-root ${selector},
        .custom-preview-container .prose ${selector},
        .dark .custom-preview-container .prose ${selector},
        .onrivi-content-root .prose ${selector},
        .dark .onrivi-content-root .prose ${selector}
      `.replace(/\s+/g, ' ').trim();
      css += `${selectorStr} {\n`;

      const bStyle = ruleObj['border-style'];
      const isDouble = bStyle === 'double';

      entries.forEach(([prop, val]) => {
        let finalVal = val;
        // 💡 이중선(double)인 경우 W3C 물리 렌더링 한계(최소 3px이어야 두 줄이 그려짐)를 보장하기 위해 3px 미만 시 3px로 보정
        if (isTableTag && isDouble && prop === 'border-width') {
          const wNum = parseInt(val as string, 10) || 1;
          if (wNum < 3) finalVal = '3px';
        }
        css += `  ${prop}: ${finalVal} !important;\n`;
        // 💡 인라인 코드 패딩 shorthand 시 padding-left/right를 함께 보장하여 globals.css 및 Tailwind px 클래스 오버라이드
        if (tag === 'code' && prop === 'padding' && val) {
          const parts = String(val).trim().split(/\s+/);
          const pxVal = parts.length >= 2 ? parts[1] : parts[0];
          css += `  padding-left: ${pxVal} !important;\n`;
          css += `  padding-right: ${pxVal} !important;\n`;
        }
      });

      // 💡 미디어 객체(이미지, 비디오, 지도)의 좌/중/우 정렬을 flex 래퍼 컨테이너 내부에서도 완벽 보장하기 위한 align-self 자동 주입
      if (isMediaTag) {
        const ml = ruleObj['margin-left'];
        const mr = ruleObj['margin-right'];
        let alignSelf = 'center';
        if (ml === '0px' && mr === 'auto') {
          alignSelf = 'flex-start';
        } else if (ml === 'auto' && mr === '0px') {
          alignSelf = 'flex-end';
        } else if (ml === 'auto' && mr === 'auto') {
          alignSelf = 'center';
        }
        css += `  align-self: ${alignSelf} !important;\n`;
      }

      // 💡 th/td의 경우 globals.css의 하드코딩된 border-bottom: 1px solid ... !important를 격파하기 위해 border-bottom-style 명시 주입
      if ((tag === 'th' || tag === 'td') && bStyle) {
        css += `  border-bottom-style: ${bStyle} !important;\n`;
        if (isDouble) {
          const curW = parseInt(ruleObj['border-width'] || '1', 10);
          css += `  border-bottom-width: ${curW < 3 ? '3px' : curW + 'px'} !important;\n`;
        }
      }
      css += `}\n`;

      if (tag === 'blockquote') {
        css += `
.custom-preview-container blockquote p,
.onrivi-content-root blockquote p,
blockquote p {
  margin-top: 0 !important;
  margin-bottom: 4px !important;
  line-height: 1.55 !important;
}
.custom-preview-container blockquote p:last-child,
.onrivi-content-root blockquote p:last-child,
blockquote p:last-child {
  margin-bottom: 0 !important;
}
.custom-preview-container blockquote ul,
.onrivi-content-root blockquote ul,
.custom-preview-container blockquote ol,
.onrivi-content-root blockquote ol,
blockquote ul,
blockquote ol {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
  padding-left: var(--list-indent, 1.4em) !important;
}
.custom-preview-container blockquote li,
.onrivi-content-root blockquote li,
blockquote li {
  margin-bottom: 2px !important;
  line-height: 1.5 !important;
}
.custom-preview-container blockquote li p,
.onrivi-content-root blockquote li p,
blockquote li p {
  margin-top: 0 !important;
  margin-bottom: 2px !important;
}
`;
      }

      if (tag === 'img') {
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
        let alignSelf = 'center';
        let textAlign = 'center';
        if ((ml === '0px' || ml === '0') && mr === 'auto') {
          alignSelf = 'flex-start';
          textAlign = 'left';
        } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
          alignSelf = 'flex-end';
          textAlign = 'right';
        }
        css += `
.custom-preview-container .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: inline-flex !important;
  flex-direction: column !important;
  width: fit-content !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(img),
.custom-preview-container .onrivi-image-figure,
.onrivi-content-root figure:has(img),
.onrivi-content-root .onrivi-image-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
}
.custom-preview-container .onrivi-image-figure figcaption,
.onrivi-content-root .onrivi-image-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 4px !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] img,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] img,
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] .onrivi-image-wrapper {
  margin-top: 0 !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 4px !important;
  margin-bottom: 0 !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] img,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] img,
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] .onrivi-image-wrapper {
  margin-bottom: 0 !important;
}
`;
      } else if (tag === 'video') {
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
        const targetWidth = ruleObj['width'] || '100%';
        let alignSelf = 'center';
        let textAlign = 'center';
        if ((ml === '0px' || ml === '0') && mr === 'auto') {
          alignSelf = 'flex-start';
          textAlign = 'left';
        } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
          alignSelf = 'flex-end';
          textAlign = 'right';
        }
        css += `
.custom-preview-container .onrivi-video-wrapper,
.onrivi-content-root .onrivi-video-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: ${targetWidth === '100%' ? 'flex' : 'inline-flex'} !important;
  flex-direction: column !important;
  width: ${targetWidth} !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(video),
.custom-preview-container .onrivi-video-figure,
.onrivi-content-root figure:has(video),
.onrivi-content-root .onrivi-video-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
  width: 100% !important;
}
.custom-preview-container .onrivi-video-figure figcaption,
.onrivi-content-root .onrivi-video-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}
.custom-preview-container .onrivi-video-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-video-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 6px !important;
}
.custom-preview-container .onrivi-video-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-video-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 6px !important;
  margin-bottom: 0 !important;
}
`;
      } else if (tag === 'map') {
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
        const targetWidth = ruleObj['width'] || '100%';
        let alignSelf = 'center';
        let textAlign = 'center';
        if ((ml === '0px' || ml === '0') && mr === 'auto') {
          alignSelf = 'flex-start';
          textAlign = 'left';
        } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
          alignSelf = 'flex-end';
          textAlign = 'right';
        }
        css += `
.custom-preview-container .map-embed-wrapper,
.custom-preview-container .onrivi-map-wrapper,
.onrivi-content-root .map-embed-wrapper,
.onrivi-content-root .onrivi-map-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: ${targetWidth === '100%' ? 'flex' : 'inline-flex'} !important;
  flex-direction: column !important;
  width: ${targetWidth} !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(iframe),
.custom-preview-container .onrivi-map-figure,
.onrivi-content-root figure:has(iframe),
.onrivi-content-root .onrivi-map-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
  width: 100% !important;
}
.custom-preview-container .onrivi-map-figure figcaption,
.onrivi-content-root .onrivi-map-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}
.custom-preview-container .onrivi-map-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-map-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 6px !important;
}
.custom-preview-container .onrivi-map-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-map-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 6px !important;
  margin-bottom: 0 !important;
}
`;
      }
    });

    // 💡 동영상·지도 인접 단독 문단 캡션도 이미지 캡션과 동일하게 중앙 정렬 및 0.88em 폰트 크기 보장
    css += `
.custom-preview-container .onrivi-video-wrapper + p,
.custom-preview-container p:has(+ .onrivi-video-wrapper),
.custom-preview-container .onrivi-map-wrapper + p,
.custom-preview-container p:has(+ .onrivi-map-wrapper),
.onrivi-content-root .onrivi-video-wrapper + p,
.onrivi-content-root p:has(+ .onrivi-video-wrapper),
.onrivi-content-root .onrivi-map-wrapper + p,
.onrivi-content-root p:has(+ .onrivi-map-wrapper) {
  text-align: center !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
}
`;

    // 🧰 구조제어: 표 글자 크기 동적 상속 (설정하지 않은 경우 페이지 기본 크기를 따름)
  // Resolve base-size controls against the document, even inside fixed-size wrappers.
  const baseSizeSelectors = {
    blockquote: 'blockquote, blockquote p, blockquote span, blockquote li',
    codeBlock: '.codeblock-area pre, .codeblock-area pre code, .codeblock-area .onrivi-line, .codeblock-area .onrivi-line *',
    math: '.katex-display .katex, :not(.katex-display) > .katex',
  };
  const baseSizeRoots = [
    '.custom-preview-container',
    '.custom-preview-container .prose',
    '.dark .custom-preview-container .prose',
    '.onrivi-content-root',
    '.onrivi-content-root .prose',
    '.dark .onrivi-content-root .prose',
  ];
  Object.entries(baseSizeSelectors).forEach(([tag, selectors]) => {
    const configured = prof.rules[tag as keyof CssProfile['rules']]?.['font-size'];
    const size = !configured || ['inherit', '0', '0px'].includes(String(configured)) ? ps.fontSize : configured;
    const scoped = baseSizeRoots
      .flatMap(root => selectors.split(', ').map(selector => `${root} ${selector}`)).join(', ');
    css += `${scoped} { font-size: ${size} !important; }\n`;
  });

    const tableHasFontSize = prof.rules.table && prof.rules.table['font-size'];
    if (!tableHasFontSize || ['inherit', '0', '0px'].includes(String(tableHasFontSize))) {
      css += `
.custom-preview-container table,
.custom-preview-container th,
.custom-preview-container td,
.onrivi-content-root table,
.onrivi-content-root th,
.onrivi-content-root td {
  font-size: ${ps.fontSize} !important;
}
`;
    }

    // 📊 표 정교화 보정: 세로 중앙 정렬 및 단어 단위 줄바꿈(keep-all), border-collapse 통합, 원치 않는 외곽 둥근 모서리/그림자/지브라 패턴 완전 소멸
    css += `
.custom-preview-container table,
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  border-radius: 0 !important;
  overflow: visible !important;
  box-shadow: none !important;
  width: 100% !important;
  max-width: 100% !important;
  table-layout: auto !important;
}
/* Directly editable tables use explicit colgroup widths during boundary dragging. */
.custom-preview-container .visual-document-surface table.visual-editable-table,
.onrivi-content-root .visual-document-surface table.visual-editable-table,
.dark .custom-preview-container .visual-document-surface table.visual-editable-table,
.dark .onrivi-content-root .visual-document-surface table.visual-editable-table {
  table-layout: fixed !important;
}
.custom-preview-container th,
.custom-preview-container td,
.onrivi-content-root th,
.onrivi-content-root td,
.custom-preview-container .prose th,
.custom-preview-container .prose td,
.onrivi-content-root .prose th,
.onrivi-content-root .prose td {
  vertical-align: middle !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  box-sizing: border-box !important;
}
.custom-preview-container table :is(th, td) code,
.onrivi-content-root table :is(th, td) code,
.visual-document-surface table :is(th, td) code {
  white-space: pre-wrap !important;
  overflow-wrap: anywhere !important;
  word-break: break-all !important;
  display: inline !important;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
.custom-preview-container .prose tr:last-child td,
.onrivi-content-root .prose tr:last-child td {
  border-bottom-style: inherit !important;
}
.custom-preview-container .prose tbody tr:nth-child(even),
.dark .custom-preview-container .prose tbody tr:nth-child(even),
.onrivi-content-root .prose tbody tr:nth-child(even),
.dark .onrivi-content-root .prose tbody tr:nth-child(even) {
  background-color: transparent !important;
}
`;

    // 🧰 구조제어: 표 외곽 테두리, 행(가로선), 열(세로선) 두께 개별 동적 인젝션
    const tableStruct = prof.tableStructure || DEFAULT_PROFILE.tableStructure;
    if (tableStruct) {
      const outerWidth = tableStruct.outerBorderWidth || '1px';
      const rowWidth = tableStruct.rowBorderWidth || '1px';
      const colWidth = tableStruct.colBorderWidth ?? '0px';
      const tableBorderStyle = prof.rules.table?.['border-style'] || 'solid';
      // 💡 외곽선 및 테두리 색상: profile 규칙 또는 선명한 차콜 다크(#374151) 고대비 보장
      const outerBorderColor = prof.rules.table?.['border-color'] || '#374151';
      const rowBorderColor = prof.rules.th?.['border-color'] || prof.rules.td?.['border-color'] || prof.rules.table?.['border-color'] || '#cbd5e1';
      const colBorderColor = rowBorderColor;

      // 1. 표 외곽 테두리 (table 및 최외곽 4면 셀 직접 주입)
      const outerIsZero = outerWidth === '0px' || outerWidth === '0';
      const rowIsZero = rowWidth === '0px' || rowWidth === '0';
      const colIsZero = colWidth === '0px' || colWidth === '0';

      css += `
.custom-preview-container table,
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  border-width: ${outerWidth} !important;
  border-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-color: ${outerBorderColor} !important;
  border-collapse: collapse !important;
}

/* 🛡️ 표 최외곽 4면 테두리 */
.custom-preview-container table tr:first-child th,
.custom-preview-container table tr:first-child td,
.onrivi-content-root table tr:first-child th,
.onrivi-content-root table tr:first-child td {
  border-top-width: ${outerWidth} !important;
  border-top-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-top-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr:last-child th,
.custom-preview-container table tr:last-child td,
.onrivi-content-root table tr:last-child th,
.onrivi-content-root table tr:last-child td {
  border-bottom-width: ${outerWidth} !important;
  border-bottom-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-bottom-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr th:first-child,
.custom-preview-container table tr td:first-child,
.onrivi-content-root table tr th:first-child,
.onrivi-content-root table tr td:first-child {
  border-left-width: ${outerWidth} !important;
  border-left-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-left-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr th:last-child,
.custom-preview-container table tr td:last-child,
.onrivi-content-root table tr th:last-child,
.onrivi-content-root table tr td:last-child {
  border-right-width: ${outerWidth} !important;
  border-right-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-right-color: ${outerBorderColor} !important;
}

/* 2. 표 내부 행(가로선) 구분선 (마지막 행 제외) */
.custom-preview-container table tr:not(:last-child) th,
.custom-preview-container table tr:not(:last-child) td,
.onrivi-content-root table tr:not(:last-child) th,
.onrivi-content-root table tr:not(:last-child) td {
  border-bottom-width: ${rowWidth} !important;
  border-bottom-style: ${rowIsZero ? 'none' : tableBorderStyle} !important;
  border-bottom-color: ${rowBorderColor} !important;
}

/* 3. 표 내부 열(세로선) 구분선 (마지막 열 제외, colWidth 0px이면 완전 소거) */
.custom-preview-container table tr th:not(:last-child),
.custom-preview-container table tr td:not(:last-child),
.onrivi-content-root table tr th:not(:last-child),
.onrivi-content-root table tr td:not(:last-child) {
  border-right-width: ${colWidth} !important;
  border-right-style: ${colIsZero ? 'none' : tableBorderStyle} !important;
  border-right-color: ${colBorderColor} !important;
}
`;
    }

    // 📊 표 여백 및 래퍼 정교화: 표 자체는 0마진으로 밀착하고, 래퍼(.table-wrapper-area)에 상하 여백 적용 및 직전 캡션 문구(p) 밀착
    const tableMarginTop = prof.rules.table?.['margin-top'] || '4px';
    const tableMarginBottom = prof.rules.table?.['margin-bottom'] || '16px';
    css += `
.custom-preview-container .table-wrapper-area,
.onrivi-content-root .table-wrapper-area {
  display: inline-block !important;
  width: 100% !important;
  vertical-align: top !important;
  margin-top: ${tableMarginTop} !important;
  margin-bottom: ${tableMarginBottom} !important;
}
.custom-preview-container table,
.onrivi-content-root table {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
.custom-preview-container table th p,
.custom-preview-container table td p,
.onrivi-content-root table th p,
.onrivi-content-root table td p {
  margin: 0 !important;
  padding: 0 !important;
}
/* Editable tables have no wrapper; apply the selected profile spacing directly. */
.custom-preview-container .visual-document-surface table.visual-editable-table,
.onrivi-content-root .visual-document-surface table.visual-editable-table {
  margin-top: ${tableMarginTop} !important;
  margin-bottom: ${tableMarginBottom} !important;
}
.custom-preview-container p:has(+ .table-wrapper-area),
.onrivi-content-root p:has(+ .table-wrapper-area) {
  margin-bottom: 6px !important;
}

/* 💬 인용구(blockquote) 여백 정밀 제어: BFC 및 인라인 블록 격리로 마진 상쇄 원천 차단 */
.custom-preview-container blockquote,
.onrivi-content-root blockquote {
  display: inline-block !important;
  width: 100% !important;
  vertical-align: top !important;
}

/* 💬 Alert 인용구(콜아웃) 태그와 본문 간격 최소화 및 커스텀 제어 */
.custom-preview-container .onrivi-alert-title,
.onrivi-content-root .onrivi-alert-title {
  margin-bottom: var(--onrivi-alert-gap, 6px) !important;
}
.custom-preview-container .onrivi-alert-content > p:first-child,
.onrivi-content-root .onrivi-alert-content > p:first-child {
  margin-top: 0 !important;
}
.custom-preview-container .onrivi-alert-content > p:last-child,
.onrivi-content-root .onrivi-alert-content > p:last-child {
  margin-bottom: 0 !important;
}

/* 💬 코드블록 내부 줄간격(행간) 콤팩트 규격화 (본문 1.8배 오염 원천 방어) */
.custom-preview-container .codeblock-area pre,
.custom-preview-container .codeblock-area pre code,
.custom-preview-container .codeblock-area .onrivi-line,
.custom-preview-container .codeblock-area .onrivi-line *,
.onrivi-content-root .codeblock-area pre,
.onrivi-content-root .codeblock-area pre code,
.onrivi-content-root .codeblock-area .onrivi-line,
.onrivi-content-root .codeblock-area .onrivi-line * {
  line-height: ${(prof.rules.codeBlock && prof.rules.codeBlock['line-height']) || '1.35'} !important;
  min-height: 0 !important;
}
`;

    // 🧰 구조제어: 구분선 규칙 (HR) 동적 인젝션
    const hrStruct = prof.hrStructure || DEFAULT_PROFILE.hrStructure || {
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      marginTopBottom: '32px',
      lineWidth: '100%'
    };
    const hrRules = prof.rules.hr || {};
    const hrStyle = hrStruct.borderTopStyle || 'solid';
    const hrWidth = hrStruct.borderTopWidth || '1px';
    const hrMargin = hrStruct.marginTopBottom || '32px';
    const hrLen = hrStruct.lineWidth || '100%';
    const hrColor = hrRules['border-top-color'] || hrRules['border-color'] || hrRules['color'] || '#e5e7eb';
    css += `
.custom-preview-container hr,
.onrivi-content-root hr {
  border: none !important;
  height: 0 !important;
  background: transparent !important;
  border-top-width: ${hrWidth} !important;
  border-top-style: ${hrStyle} !important;
  border-top-color: ${hrColor} !important;
  margin-top: ${hrMargin} !important;
  margin-bottom: ${hrMargin} !important;
  width: ${hrLen} !important;
  ${hrLen !== '100%' ? 'margin-left: auto !important;\n  margin-right: auto !important;' : ''}
}
`;

    const bodyTextColor = (prof.rules.p && prof.rules.p['color']) || '#2f2f2f';

    // 🧰 구조제어: 체크박스 규칙 (Task List) 동적 인젝션
    if (prof.checkboxStructure) {
      const cbSize = prof.checkboxStructure.boxSize || '16px';
      const cbGap = prof.checkboxStructure.textGap || '9px';
      const cbEffect = prof.checkboxStructure.checkedEffect || 'none';
      const cbColor = prof.checkboxStructure.color || bodyTextColor;
      css += `
.custom-preview-container input[type="checkbox"] {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: ${cbSize} !important;
  height: ${cbSize} !important;
  margin-right: ${cbGap} !important;
  border: 1px solid ${cbColor} !important;
  border-radius: 3px !important;
  background-color: transparent !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  vertical-align: middle !important;
  flex-shrink: 0 !important;
}

.custom-preview-container input[type="checkbox"]:checked {
  background-color: ${cbColor} !important;
  border-color: ${cbColor} !important;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E") !important;
  background-size: 100% 100% !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
`;
      if (cbEffect === 'line-through-and-dim') {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  text-decoration: line-through !important;
  opacity: 0.5 !important;
}
`;
      } else if (cbEffect === 'dim-only') {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  opacity: 0.5 !important;
}
`;
      } else {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  text-decoration: none !important;
  opacity: 1 !important;
}
`;
      }
    }



    const liMarginBottom = (prof.rules.li && prof.rules.li['margin-bottom']) || '6px';
    const paragraphMarginTop = prof.rules.p?.['margin-top'] ?? '0px';
    const listIndent = (prof.rules.ul && prof.rules.ul['padding-left']) || (prof.rules.ol && prof.rules.ol['padding-left']) || '28px';
    const liMarkerGap = (prof.rules.li && (prof.rules.li['padding-inline-start'] || prof.rules.li['padding-left'])) || '0px';

    // 💡 마커 색상: ul/ol 텍스트 색상을 상속받도록 강제 (Tailwind 기본색상 무시)
    // 💡 체크리스트(task-list-item): 중복 불릿(•) 기호 완전 소거 및 본문 텍스트 색상과 100% 일치
    css += `
:root {
  --list-indent: ${listIndent};
  --li-margin-bottom: ${liMarginBottom};
  --li-marker-gap: ${liMarkerGap};
}
.custom-preview-container,
.onrivi-content-root {
  --list-indent: ${listIndent};
  --li-margin-bottom: ${liMarginBottom};
  --li-marker-gap: ${liMarkerGap};
}
.custom-preview-container ul li::marker,
.custom-preview-container ol li::marker {
  color: inherit !important;
}
.custom-preview-container li.task-list-item,
.onrivi-content-root li.task-list-item {
  list-style: none !important;
  list-style-type: none !important;
  list-style-image: none !important;
  color: ${(prof.rules.taskList && prof.rules.taskList['color']) || bodyTextColor} !important;
  margin-top: 0 !important;
  margin-bottom: ${liMarginBottom} !important;
}
.custom-preview-container li.task-list-item::marker,
.onrivi-content-root li.task-list-item::marker,
.custom-preview-container li.task-list-item::before,
.onrivi-content-root li.task-list-item::before {
  content: "" !important;
  display: none !important;
}
.custom-preview-container ul.contains-task-list,
.onrivi-content-root ul.contains-task-list {
  list-style: none !important;
  list-style-type: none !important;
  padding-left: 0 !important;
}
.custom-preview-container li ul.contains-task-list,
.onrivi-content-root li ul.contains-task-list,
.custom-preview-container li ol.contains-task-list,
.onrivi-content-root li ol.contains-task-list {
  padding-left: ${listIndent} !important;
}
.custom-preview-container li,
.onrivi-content-root li {
  margin-top: 0 !important;
  margin-bottom: ${liMarginBottom} !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-inline-start: ${liMarkerGap} !important;
  padding-left: ${liMarkerGap} !important;
}
.custom-preview-container li > p,
.custom-preview-container li p,
.onrivi-content-root li > p,
.onrivi-content-root li p {
  display: inline !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.custom-preview-container li p .onrivi-line,
.onrivi-content-root li p .onrivi-line {
  display: inline !important;
  width: auto !important;
  min-height: 0 !important;
}
.custom-preview-container li p + p,
.onrivi-content-root li p + p {
  display: block !important;
  margin-top: 0.45em !important;
}
.custom-preview-container ul,
.custom-preview-container ol,
.onrivi-content-root ul,
.onrivi-content-root ol {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: ${listIndent} !important;
}
.custom-preview-container ul + p,
.custom-preview-container ol + p,
.onrivi-content-root ul + p,
.onrivi-content-root ol + p {
  margin-top: ${paragraphMarginTop} !important;
}
.custom-preview-container p + ul,
.custom-preview-container p + ol,
.onrivi-content-root p + ul,
.onrivi-content-root p + ol {
  margin-top: 4px !important;
}
/* NodeViews wrap list content in a div; nested lists must still stay tight. */
.custom-preview-container li ul,
.custom-preview-container li ol,
.onrivi-content-root li ul,
.onrivi-content-root li ol {
  margin-top: 0.25em !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: ${listIndent} !important;
}
.custom-preview-container .visual-document-surface blockquote p,
.custom-preview-container .onrivi-alert-content p {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
/* Keep native code cards apart and scroll long lines inside each card. */
.custom-preview-container .visual-document-surface .visual-code-block {
  margin-top: 24px !important;
  margin-bottom: 20px !important;
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.custom-preview-container .visual-document-surface .visual-code-block pre {
  display: block !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  white-space: pre !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
.custom-preview-container .visual-document-surface .visual-code-block pre code {
  display: block !important;
  width: max-content !important;
  min-width: 100% !important;
  white-space: pre !important;
  overflow: visible !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
/* Separate top-level lists retain the same gap as a following paragraph. */
.custom-preview-container .visual-document-surface > ul + ul,
.custom-preview-container .visual-document-surface > ol + ol {
  margin-top: 4px !important;
}
.custom-preview-container .visual-document-surface > :is(ul,ol) + :is(ul,ol) {
  margin-top: 4px !important;
}
.custom-preview-container .visual-document-surface > p:empty,
.custom-preview-container .visual-document-surface > p:has(> br:only-child),
.custom-preview-container .visual-document-surface > p:has(> br.ProseMirror-trailingBreak:only-child),
.onrivi-content-root .visual-document-surface > p:empty,
.onrivi-content-root .visual-document-surface > p:has(> br:only-child),
.onrivi-content-root .visual-document-surface > p:has(> br.ProseMirror-trailingBreak:only-child) {
  min-height: 1em;
  cursor: text;
}
.custom-preview-container .visual-document-surface ::selection,
.custom-preview-container .visual-document-surface *::selection,
.onrivi-content-root .visual-document-surface ::selection,
.onrivi-content-root .visual-document-surface *::selection {
  background: #2563eb !important;
  color: #ffffff !important;
}
.dark .custom-preview-container .visual-document-surface ::selection,
.dark .custom-preview-container .visual-document-surface *::selection,
.dark .onrivi-content-root .visual-document-surface ::selection,
.dark .onrivi-content-root .visual-document-surface *::selection {
  background: #3b82f6 !important;
  color: #ffffff !important;
}
`; 

    // 제목 컨트롤 값은 사용자 CSS의 h1 자동 중앙 배치보다 우선한다.
    for (let level = 1; level <= 6; level++) {
      const rule = prof.rules[`h${level}` as keyof typeof prof.rules];
      if (!rule) continue;
      const alignment = rule['text-align'] || 'left';
      const leftMargin = alignment === 'left' ? '0' : 'auto';
      const rightMargin = alignment === 'right' ? '0' : 'auto';
      css += `.custom-preview-container h${level}, .onrivi-content-root h${level} {\n`;
      css += `  margin-left: ${leftMargin} !important;\n  margin-right: ${rightMargin} !important;\n`;
      css += `  padding-left: ${rule['padding-left'] || '0px'} !important;\n}\n`;
    }

    // 🌟 본문 내 사용자 우측/중앙 정렬(align, text-align, table 등) 100% 보장
    css += `
.custom-preview-container [align="right"],
.onrivi-content-root [align="right"],
.custom-preview-container [style*="text-align: right"],
.onrivi-content-root [style*="text-align: right"],
.custom-preview-container [style*="text-align:right"],
.onrivi-content-root [style*="text-align:right"],
.custom-preview-container .text-right,
.onrivi-content-root .text-right {
  text-align: right !important;
}
.custom-preview-container [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th) {
  text-align: right !important;
}
.custom-preview-container [align="right"] ul,
.custom-preview-container [align="right"] ol,
.onrivi-content-root [align="right"] ul,
.onrivi-content-root [align="right"] ol,
.custom-preview-container [style*="text-align: right"] ul,
.custom-preview-container [style*="text-align: right"] ol,
.onrivi-content-root [style*="text-align: right"] ul,
.onrivi-content-root [style*="text-align: right"] ol {
  display: inline-block !important;
  text-align: left !important;
}
.custom-preview-container [align="center"],
.onrivi-content-root [align="center"],
.custom-preview-container [style*="text-align: center"],
.onrivi-content-root [style*="text-align: center"],
.custom-preview-container [style*="text-align:center"],
.onrivi-content-root [style*="text-align:center"],
.custom-preview-container .text-center,
.onrivi-content-root .text-center {
  text-align: center !important;
}
.custom-preview-container [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th) {
  text-align: center !important;
}
.custom-preview-container [align="center"] ul,
.custom-preview-container [align="center"] ol,
.onrivi-content-root [align="center"] ul,
.onrivi-content-root [align="center"] ol,
.custom-preview-container [style*="text-align: center"] ul,
.custom-preview-container [style*="text-align: center"] ol,
.onrivi-content-root [style*="text-align: center"] ul,
.onrivi-content-root [style*="text-align: center"] ol {
  display: inline-block !important;
  text-align: left !important;
}
`;

    // Legacy CSS page-break logic removed in favor of injectPageBreakMarkers.

    // important 선언은 먼저 선언한 계층이 우선한다. 중복 style 태그와 추가 CSS의 높은 선택자 구체성에도 설정값을 유지한다.
    const extraCss = prof.customCss?.trim()
      ? `\n@layer onrivi-extra {\n${prof.customCss}\n}`
      : '';
    return `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-settings {\n${css}\n${reportNumberingCss(prof)}\n${headingNumberingCss(prof)}\n}${extraCss}`;
  }, [profiles, activeProfileId, previewMode, isStyleModalOpen]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0069] MainEditorApp.tsx ➔ quickWrap
  // 🎯 @KICK  : 선택 영역 또는 현재 줄을 제목/인용구/코드 서식으로 빠르게 감쌉니다
  // 🛡️ @GUARD : 선택 영역이 없으면 전체 줄 자동 선택; Monaco 가드 확인
  // 🚨 @PATCH : None
  // 🔗 @CALLS : wrapSelection, applyLinePrefix, insertBlockTag, editor.focus
  // ====================================================================
  const quickWrap = (format: 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let selection = editor.getSelection();
    if (!selection) return;
    const model = editor.getModel();
    if (!model) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;

    // No selection → auto-select entire current line
    if (selection.isEmpty()) {
      const pos = editor.getPosition();
      if (!pos) return;
      const lineNum = pos.lineNumber;
      const lineContent = model.getLineContent(lineNum);
      editor.setSelection(new monaco.Selection(
        lineNum, 1,
        lineNum, lineContent.length + 1
      ));
      selection = editor.getSelection();
      if (!selection || selection.isEmpty()) return;
    }

    switch (format) {
      case 'h1': wrapSelection('# ', '', ''); break;
      case 'h2': wrapSelection('## ', '', ''); break;
      case 'h3': wrapSelection('### ', '', ''); break;
      case 'quote': applyLinePrefix('quote'); break;
      case 'code': insertBlockTag('```markdown', '```', '코드'); break;
    }
    editor.focus();
  };

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
  // 📊 [OMD-EDIT-MainEditorApp-0070] MainEditorApp.tsx ➔ dispatchCommand
  // 🎯 @KICK  : 에디터 포커스 가드와 함께 EditorCommandType을 핸들러 메서드로 라우팅하는 통합 명령 디스패처
  // 🛡️ @GUARD : 브라우저 포커스 손실 방지를 위한 entry에서 editor.focus(); 모달 명령 후 50ms 비동기 forceTokenization; previewMode !== 'preview' 가드를 이용한 내보내기 제한
  // 🚨 @PATCH : **2026-06-19** — 내보내기 모드 가드 패치: previewMode가 'preview'(미리보기 전용) 모드가 아닐 때 내보내기 명령(PRINT, EXPORT_*)이 트리거되는 경우 경고 토스트를 띄우고 명령 실행을 차단하도록 보정; 문자 겹침 수정을 위한 50ms setTimeout 토큰화 + 레이아웃 (WBS SYNC-02)
  // 🔗 @CALLS : handlers.newFile/save/saveAs/exit/print/exportHTML/exportEPUB/exportPNG/openExport, handlers.zoomIn/zoomOut/undo/redo/find/replace/globalSearch/settings/about/help/license, handlers.toggleFloatingToolbar/cleanDoc/copyAll, handlers.bold/italic/inlineCode/underline/strikethrough/h1-h6/hr/orderedList/list/quote/check/removePrefix, handlers.link/doclink/image/video/now/map/table/quickTable/insertTableRow/deleteTableRow/code/chart/math, handlers.quickWrap, selectRootFolder, setPreviewMode, setIsToolbarOpen, setIsSidebarOpen, setThemePalette, setIsDarkMode
  // ====================================================================
  const transferBusyRef = useRef(false);
  const [transferProgress, setTransferProgress] = useState('');

  // 💾 [내PC(로컬)로 저장] — 작업장 변경 없이 원하는 로컬 폴더에 파일 저장
  const handleSaveToLocal = useCallback(async () => {
    if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) {
      showToast('현재 문서를 저장할 수 없습니다.', 'warning');
      return;
    }
    const markdown = editorRef.current?.getValue() ?? contentRef.current;
    const suggestedName = currentFileName || '새 문서.md';
    const api = (window as any).electronAPI;

    // 1. 데스크톱(Electron) 환경: 표준 파일 저장 대화상자 직접 호출 (작업장 변경 없이 파일만 저장)
    if (api?.saveFileAs) {
      try {
        const defaultDir = rootFolder?.path && rootFolder?.type !== 'GDRIVE' ? rootFolder.path : undefined;
        const file = await api.saveFileAs(markdown, suggestedName, defaultDir, [
          { name: 'Markdown Files (*.md)', extensions: ['md'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]);
        if (!file || file.canceled) return;
        showToast(`내 PC에 저장되었습니다: ${file.name}`, 'success');
        // ⚠️ [사용자 규칙] 작업장(rootFolder, workspaceType)은 절대 변경하지 않는다!
        if (rootFolder?.path && rootFolder?.type !== 'GDRIVE' && file.path?.startsWith(rootFolder.path)) {
          await refreshFileList();
        }
      } catch (e: any) {
        showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
      }
      return;
    }

    // 2. 웹 브라우저 환경 (showSaveFilePicker 지원 시: Chrome, Edge 등)
    if (typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedName.endsWith('.md') ? suggestedName : `${suggestedName}.md`,
          types: [{
            description: 'Markdown Files (*.md)',
            accept: { 'text/markdown': ['.md', '.markdown'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        showToast(`내 PC에 저장되었습니다: ${handle.name}`, 'success');
        // ⚠️ [사용자 규칙] 작업장은 절대 변경하지 않는다!
      } catch (e: any) {
        if (e.name !== 'AbortError') showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
      }
      return;
    }

    // 3. 브라우저 직접 다운로드 폴백
    try {
      let targetName = window.prompt('저장할 파일 이름을 입력해 주세요:', suggestedName);
      if (targetName === null) return; // 사용자 취소
      targetName = targetName.trim() || suggestedName;
      if (!targetName.endsWith('.md')) targetName = `${targetName}.md`;

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`내 PC에 저장되었습니다: ${a.download}`, 'success');
    } catch (e: any) {
      showToast(e.message || '내 PC 저장에 실패했습니다.', 'error');
    }
  }, [currentFileName, isDuplicateInstance, isLicenseChecking, isRestrictedUser, refreshFileList, rootFolder, showToast]);

  // ☁️ [개인웹드라이브 저장] — 작업장 변경 없이 원하는 구글 드라이브 폴더 및 파일명으로 저장
  const handleSaveToWebDrive = useCallback(async () => {
    if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) {
      showToast('현재 문서를 저장할 수 없습니다.', 'warning');
      return;
    }
    const markdown = editorRef.current?.getValue() ?? contentRef.current;
    const defaultName = currentFileName || '새 문서.md';

    transferBusyRef.current = true;
    const preparedAuth = !getSavedDriveToken() || !hasValidDriveToken()
      ? prepareGoogleDriveAuth({ isStandalone: true }) : null;
    try {
      const { getSavedDriveToken, hasValidDriveToken, requestGoogleDriveAuth, ensureDriveFolder, createDriveMarkdownFile, listDriveChildren, saveDriveFileContent } = await import('@/lib/gdrive/googleDriveClient');
      let token = getSavedDriveToken();
      if (!token || !hasValidDriveToken()) {
        token = await preparedAuth!.request();
      }
      if (!token) {
        showToast('개인웹드라이브 인증이 필요합니다.', 'warning');
        return;
      }

      const { pickAccessibleDriveFolder } = await import('@/lib/gdrive/WorkspaceFolderPicker');
      let initialPath = [{ id: 'root', name: '내 드라이브' }];
      try {
        const rootId = await ensureDriveFolder(token, 'OnriviAuthor', 'root');
        initialPath = [{ id: 'root', name: '내 드라이브' }, { id: rootId, name: 'OnriviAuthor' }];
      } catch {
        // 폴더 권한에 따라 기본 루트로 진행
      }

      const driveDestination = await pickAccessibleDriveFolder(token, initialPath, {
        title: '개인웹드라이브 저장 (드라이브·폴더 및 파일명 지정)',
        description: '저장할 계정·드라이브·폴더와 파일명을 선택해 주세요. 저장 후에도 현재 작업장은 유지됩니다.',
        confirmText: '이 폴더에 저장',
        initialFileName: defaultName,
        showFileNameInput: true,
      });
      if (!driveDestination) return; // 사용자 취소

      const activeToken = driveDestination.token || token;
      const chosenName = (driveDestination.fileName || defaultName).trim();
      const finalName = /\.md$/i.test(chosenName) ? chosenName : `${chosenName}.md`;

      transferBusyRef.current = true;
      setTransferProgress('개인웹드라이브에 저장 중...');
      const siblings = await listDriveChildren(activeToken, driveDestination.id);
      const existingFile = siblings.find(item => !item.isFolder && item.name.toLowerCase() === finalName.toLowerCase());

      const emailLabel = driveDestination.userEmail ? ` [${driveDestination.userEmail}]` : '';

      if (existingFile) {
        const overwrite = window.confirm(`선택한 폴더에 '${finalName}' 파일이 이미 존재합니다.\n덮어쓰시겠습니까?`);
        if (!overwrite) {
          showToast('저장이 취소되었습니다.', 'info');
          return;
        }
        await saveDriveFileContent(activeToken, existingFile.id, markdown);
        showToast(`개인웹드라이브에 저장되었습니다 (덮어쓰기)${emailLabel}: ${driveDestination.name}/${finalName}`, 'success');
      } else {
        await createDriveMarkdownFile(activeToken, driveDestination.id, finalName, markdown);
        showToast(`개인웹드라이브에 저장되었습니다${emailLabel}: ${driveDestination.name}/${finalName}`, 'success');
      }

      // ⚠️ [사용자 규칙] 작업장(rootFolder, workspaceType)은 절대 변경하지 않는다!
      if (rootFolder?.type === 'GDRIVE' && (rootFolder?.id === driveDestination.id || rootFolder?.driveFolderId === driveDestination.id)) {
        await refreshFileList();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        showToast(e.message || '개인웹드라이브 저장에 실패했습니다.', 'error');
      }
    } finally {
      preparedAuth?.close();
      transferBusyRef.current = false;
      setTransferProgress('');
    }
  }, [currentFileName, isDuplicateInstance, isLicenseChecking, isRestrictedUser, refreshFileList, rootFolder, showToast]);

  useEffect(() => {
    const handleSaveAsTarget = (event: Event) => {
      const target = (event as CustomEvent).detail;
      if (target === 'download') {
        handleSaveToLocal();
      } else if (target === 'upload') {
        handleSaveToWebDrive();
      }
    };
    window.addEventListener('onrivi:save-as-target', handleSaveAsTarget);
    return () => window.removeEventListener('onrivi:save-as-target', handleSaveAsTarget);
  }, [handleSaveToLocal, handleSaveToWebDrive]);
  useEffect(() => {
    const transfer = async (event: Event) => {
      const direction = (event as CustomEvent).detail;
      if (direction !== 'download' && direction !== 'upload') return;
      if (transferBusyRef.current || isRestrictedUser || isDuplicateInstance || isLicenseChecking) return;
      const name = currentFileName;
      const markdown = editorRef.current?.getValue() ?? contentRef.current;
      if (!name || !/\.md$/i.test(name)) { showToast('먼저 Markdown 문서를 열어 주세요.', 'warning'); return; }
      transferBusyRef.current = true;
      setTransferProgress('저장할 위치를 선택해 주세요.');
      try {
        const result = await transferDocument({direction, name, markdown, onProgress:setTransferProgress});
        showToast(`복사 완료: ${result}`, 'success');
        await refreshFileList();
      } catch (error: any) {
        if (error.name !== 'AbortError') showToast(error.message || '문서 전송에 실패했습니다. 다시 실행해 주세요.', 'error');
      } finally { transferBusyRef.current = false; setTransferProgress(''); }
    };
    window.addEventListener('onrivi:transfer-document',transfer);
    return () => window.removeEventListener('onrivi:transfer-document',transfer);
  }, [currentFileName, isRestrictedUser, isDuplicateInstance, isLicenseChecking, refreshFileList, showToast]);

  const handleCreateNewDocument = async (fileName: string, targetFolderNode: FileNode | null) => {
    if (isRestrictedUser || isDuplicateInstance || isLicenseChecking) throw new Error('현재 문서를 생성할 수 없습니다. 로그인·사용 권한을 확인해 주세요.');
    const name = fileName.trim();
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') throw new Error('올바른 파일명을 입력해 주세요.');
    const finalName = /\.md$/i.test(name) ? name : `${name}.md`;
    const folder = targetFolderNode || rootFolder;
    let node: FileNode;
    if (rootFolder?.type === 'GDRIVE' || rootFolder?.driveFolderId) {
      const {getSavedDriveToken,getSavedWorkspaceInfo,listDriveChildren,createDriveMarkdownFile} = await import('@/lib/gdrive/googleDriveClient');
      const token = getSavedDriveToken();
      const folderId = targetFolderNode?.driveId || targetFolderNode?.id || rootFolder?.driveFolderId || rootFolder?.id || getSavedWorkspaceInfo()?.workspaceFolderId;
      if (!token || !folderId) throw new Error('구글 드라이브 연결을 확인해 주세요.');
      const children = await listDriveChildren(token, folderId);
      if (children.some(child => child.name.toLowerCase() === finalName.toLowerCase())) throw new Error('같은 이름의 파일이 있습니다.');
      const created = await createDriveMarkdownFile(token, folderId, finalName, '');
      node = {name:finalName,kind:'file',driveId:created.id,id:created.id,path:`${folder?.path || 'GoogleDrive'}/${finalName}`};
    } else if (folder?.handle) {
      for await (const [existing] of folder.handle.entries()) if (existing.toLowerCase() === finalName.toLowerCase()) throw new Error('같은 이름의 파일이 있습니다.');
      const handle = await folder.handle.getFileHandle(finalName, {create:true});
      node = {name:finalName,kind:'file',handle,path:`${folder?.path || folder?.name || ''}/${finalName}`};
    } else if ((window as any).electronAPI?.createFile) {
      const parent = folder?.path || rootFolder?.path;
      if (!parent) throw new Error('먼저 작업장 폴더를 선택해 주세요.');
      const created = await (window as any).electronAPI.createFile(parent,finalName);
      if (!created?.success) throw new Error('파일을 생성하지 못했습니다.');
      node = {name:finalName,kind:'file',path:created.path};
    } else {
      const {vfsCreateFile,getVfsFiles} = await import('@/lib/virtualFileSystem');
      const parent = targetFolderNode?.path || '';
      const allFiles = getVfsFiles();
      const findFolder = (nodes: FileNode[]): FileNode | undefined => { for (const item of nodes) { if (item.path === parent) return item; const found = item.children && findFolder(item.children); if (found) return found; } };
      const siblings = parent ? findFolder(allFiles)?.children || [] : allFiles;
      if (siblings.some(item => item.name.toLowerCase() === finalName.toLowerCase())) throw new Error('같은 이름의 파일이 있습니다.');
      vfsCreateFile(parent,finalName);
      node = {name:finalName,kind:'file',path:parent ? `${parent}/${finalName}` : finalName};
    }
    createNewTab('',finalName,false,node.path || null,node);
    setCurrentFileNode(node);
    setCurrentFileName(finalName);
    lastSavedContentRef.current = '';
    setSaveStatus('saved');
    const targetMode = isRestrictedUser ? 'preview' : (lastGeneralPreviewModeRef.current || 'preview');
    setPreviewMode(targetMode);
    setIsNewDocumentModalOpen(false);
    await refreshFileList();
    showToast('새 문서를 만들었습니다.', 'success');
  };

  const handleInsertFormattedDate = useCallback((formattedDate: string) => {
    if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current) {
      visualCommandRef.current('INSERT_TEXT:' + formattedDate);
    } else {
      insertAtCursor(formattedDate);
    }
  }, [insertAtCursor]);

  const dispatchCommand = useCallback((type: EditorCommandType, payload?: any) => {
    const restrictedCommands = [
      'OPEN_FILE', 'OPEN_WORKSPACE', 'EXIT', 'GLOBAL_SEARCH', 'COPY_ALL',
      'TOGGLE_SIDEBAR', 'TOGGLE_TOOLBAR', 'TOGGLE_MODE',
      'SETTINGS', 'SETTINGS_SHORTCUTS', 'SETTINGS_ACCOUNT', 'HELP', 'LICENSE'
    ];
    if (isRestrictedUser && !restrictedCommands.includes(type)) return;
    if (type === 'UNDO' || type === 'REDO') {
      if (previewModeRef.current === 'edit') {
        if (type === 'UNDO') handlers.undo(); else handlers.redo();
      } else if (!previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input') || !visualCommandRef.current?.(type)) {
        showToast('문서의 본문 편집에서 실행취소·다시실행을 사용할 수 있습니다.', 'info');
      }
      return;
    }
    if ((type === 'FIND' || type === 'REPLACE') && previewModeRef.current !== 'edit') {
      setPreviewFindReplaceMode(type === 'REPLACE');
      if (type === 'REPLACE') setDirectEditEnabled(true);
      setIsPreviewFindOpen(true);
      return;
    }
    if (type === 'NOW' || type === 'CALENDAR') {
      if (typeof payload === 'string' && payload) {
        handleInsertFormattedDate(payload);
        return;
      }
      // 1) 문서보기(Visual Document Editor) 모드인 경우, 문서보기 커서 위치에 바로 팝업 오픈!
      if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.(type)) {
        return;
      }
      // 2) Monaco 에디터 모드인 경우, Monaco 커서 위치에 팝업 오픈!
      const editor = editorRef.current;
      const position = editor?.getPosition();
      const visiblePosition = position && editor?.getScrolledVisiblePosition(position);
      const editorRect = editor?.getDomNode()?.getBoundingClientRect();
      const left = editorRect && visiblePosition
        ? Math.min(editorRect.left + visiblePosition.left, Math.max(16, window.innerWidth - 380))
        : Math.max(16, (window.innerWidth - 350) / 2);
      const top = editorRect && visiblePosition
        ? editorRect.top + visiblePosition.top + visiblePosition.height
        : Math.max(16, window.innerHeight / 2 - 200);
      setMonacoDatePickerPos({ top, left });
      setIsMonacoDatePickerOpen(true);
      return;
    }
    if (type === 'TOGGLE_CSS_STYLE') {
      setIsStyleModalOpen(true);
      return;
    }
    if (type === 'ADD_REFERENCE') {
      setIsReferenceModalOpen(true);
      return;
    }
    if (!executingVisualSourceActionRef.current && previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input') && visualCommandRef.current?.(type)) return;
    if (!executingVisualSourceActionRef.current && previewRef.current?.querySelector('.visual-document-editor') && [
      'UNDERLINE', 'STRIKETHROUGH', 'IMAGE', 'VIDEO', 'MAP', 'TABLE', 'QUICK_TABLE',
      'INSERT_TABLE_ROW', 'DELETE_TABLE_ROW', 'CHART', 'CODE', 'CHECK',
      'REMOVE_PREFIX', 'DOC_LINK', 'MERGE',
    ].includes(type)) {
      showToast('이 기능은 현재 마크다운 보기에서 사용할 수 있습니다.', 'info');
      return;
    }

    // [WBS SYNC-01] 명령어 실행 초입 단계에 반드시 editor.focus()를 강제 격발하여 브라우저 포커스 뺏김 방지 및 포지션 최우선 확보 (단, 전역 검색은 검색 입력창 포커스를 위해 제외)
    let editorPosition = null;
    if (editorRef.current && type !== 'GLOBAL_SEARCH') {
      const editor = editorRef.current;
      editor.focus();
      editorPosition = editor.getPosition();
    }

    // 1. 에디터 텍스트 비조작 명령어 (상태 제어 및 파일 입출력 위임)
    switch (type) {
      // 파일 관련
      case 'NEW_FILE': {
        setIsNewDocumentModalOpen(true);
        return;
      }
      case 'OPEN_FILE':
        window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT'));
        return;
      case 'OPEN_WORKSPACE': selectRootFolder('current', null); return;
      case 'SAVE': handlers.save(); return;
      case 'SAVE_AS':
        if (rootFolder?.type === 'GDRIVE' || currentFileNodeRef.current?.driveId || currentFileNodeRef.current?.driveFileId) {
          handleSaveToWebDrive();
        } else {
          handleSaveToLocal();
        }
        return;
      case 'EXIT': handlers.exit(); return;

      // 내보내기 관련
      case 'PRINT':
      case 'EXPORT_HTML':
      case 'EXPORT_EPUB':
      case 'EXPORT_PNG':
      case 'EXPORT_DOCX':
      case 'EXPORT_HWPX':
      case 'OPEN_EXPORT': {
        // Export uses the existing read-only renderer, never editor controls or
        // immutable source placeholders. Wait for that renderer to mount.
        // PDF previews and print clone the mounted editor. Switching renderers here
        // discards editor-only layout (including blank paragraphs) before the modal opens.
        if (type !== 'PRINT' && type !== 'OPEN_EXPORT' && directEditEnabled && previewRef.current?.querySelector('.visual-document-editor')) {
          pendingVisualExportRef.current = type;
          setDirectEditEnabled(false);
          setPreviewMode('preview');
          return;
        }
        // 🔒 [내보내기 방어 가드]: 나란히 보기(both) 및 미리보기(preview) 모두 즉시 사출 지원, 편집 모드일 때만 자동 전환
        if (previewMode !== 'preview' && previewMode !== 'both') {
          pendingVisualExportRef.current = type;
          setPreviewMode('preview');
          return;
        }
        if (type === 'PRINT') handlers.print();
        else if (type === 'EXPORT_HTML') handlers.exportHTML();
        else if (type === 'EXPORT_EPUB') handlers.exportEPUB();
        else if (type === 'EXPORT_PNG') handlers.exportPNG();
        else if (type === 'EXPORT_DOCX') handlers.exportDOCX();
        else if (type === 'EXPORT_HWPX') handlers.exportHWPX();
        else if (type === 'OPEN_EXPORT') handlers.openExport();
        return;
      }
      // 보기/제어 관련 (문서보기 확대/축소로 일원화)
      case 'ZOOM_IN':
        setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
        return;
      case 'ZOOM_OUT':
        setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
        return;
      case 'ZOOM_RESET':
        setPreviewZoomScale(1.0);
        return;
      case 'UNDO': handlers.undo(); return;
      case 'REDO': handlers.redo(); return;
      case 'FIND': handlers.find(); return;
      case 'REPLACE': handlers.replace(); return;
      case 'PAGEBREAK': {
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('PAGEBREAK')) {
          return;
        }
        insertAtCursor('\n\n<!-- onrivi:page-break -->\n\n');
        return;
      }
      case 'GLOBAL_SEARCH':
        setIsSidebarOpen(true);
        setSidebarTab('search');
        setIsSearchOpen(true);
        handlers.globalSearch();
        return;
      case 'SETTINGS':
        setIsSettingsModalOpen(true);
        return;
      case 'SETTINGS_SHORTCUTS':
        setSettingsModalInitialTab('shortcuts');
        setIsSettingsModalOpen(true);
        return;
      case 'SETTINGS_ACCOUNT':
        setSettingsModalInitialTab('account');
        setIsSettingsModalOpen(true);
        return;
      case 'SELECT_RESOURCE_FOLDER':
        selectResourceFolder();
        return;
      case 'TOGGLE_CSS_STYLE':
        setIsStyleModalOpen(true);
        return;
      case 'ADD_REFERENCE':
        setIsReferenceModalOpen(true);
        return;
      case 'ABOUT': handlers.about(); return;
      case 'HELP': handlers.help(); return;
      case 'LICENSE': handlers.license(); return;
      case 'TOGGLE_FLOATING_TOOLBAR': {
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        handlers.toggleFloatingToolbar(); 
        return;
      }
      case 'TOGGLE_EMOJI_PANEL': {
        const visual = previewRef.current?.querySelector('.visual-document-editor, .picturebook-scene-input');
        emojiTargetRef.current = {
          tabId: activeTabIdRef.current,
          visual: !!visual && !editorRef.current?.hasTextFocus(),
          selection: editorRef.current?.getSelection(),
        };
        setIsEmojiPanelOpen(open => !open);
        return;
      }
      case 'AI_DRAFT': {
        window.dispatchEvent(new Event('onrivi:open-inline-ai'));
        return;
      }
      case 'OPEN_AI_WRITER': {
        if (!geminiApiKey) {
          showToast('설정에서 Gemini API 키를 먼저 등록해주세요.', 'warning');
          setIsSettingsModalOpen(true);
          return;
        }
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        const editor = editorRef.current;
        const selection = editor ? editor.getSelection() : null;
        const model = editor ? editor.getModel() : null;
        let selectedText = '';
        let fullText = '';
        if (editor && model) {
          fullText = model.getValue();
          if (selection && !selection.isEmpty()) {
            selectedText = model.getValueInRange(selection);
          }
        }
        setAiEditorContext({ selectedText, fullText });
        setAiDraftInitialMode('editorial');
        setIsAIDraftModalOpen(true);
        return;
      }
      case 'AUTO_RENUMBER':
        console.log('[DEBUG] AUTO_RENUMBER dispatched! Triggering autoRenumberList...');
        setTimeout(() => editorRef.current?.getAction('autoRenumberList')?.run(), 100);
        break;
      case 'SLASH_COMMAND': {
        if (!activeTabId || previewMode === 'preview') {
          showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
          return;
        }
        const editor = editorRef.current;
        if (editor) {
          editor.focus();
          const position = editor.getPosition();
          if (position) {
            editor.executeEdits('slash-trigger', [
              {
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: '/',
                forceMoveMarkers: true
              }
            ]);
            setTimeout(() => {
              editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            }, 50);
          }
        }
        return;
      }
      case 'CLEAN_DOC': {
        const visualEditorEl = previewRef.current?.querySelector('.visual-document-editor');
        const visualHasFocus = Boolean(visualEditorEl?.contains(document.activeElement));
        if (visualEditorEl && (previewModeRef.current === 'preview' || visualHasFocus) && visualCommandRef.current?.('CLEAN_DOC')) {
          return;
        }
        handlers.cleanDoc();
        return;
      }
      case 'COPY_ALL': handlers.copyAll(); return;
      // 🎯 TOOLBAR_ITEMS '푸터' 그룹 토글 명령어 (handlers에 없으므로 직접 상태 변환)
      case 'TOGGLE_TOOLBAR': setIsToolbarOpen(prev => !prev); return;
      case 'TOGGLE_SIDEBAR': setIsSidebarOpen(prev => !prev); return;
      case 'TOGGLE_MODE':
        if (isRestrictedUser) {
          setPreviewMode('preview');
          return;
        }
        setPreviewMode(prev => {
          if (prev === 'css-style') return prev;
          if (prev === 'edit') return 'both';
          if (prev === 'both') return 'preview';
          return 'edit';
        });
        return;
      case 'TOGGLE_THEME':
        // 사용자 요청으로 테마 변경 기능 비활성화
        return;
      /*
       * TOGGLE_CSS_STYLE — CssStyleForm 패널 토글 (Ctrl+Shift+S)
 * - css-style 모드: 좌측 50%가 CssStyleForm(서식 정의), 우측 50%가 미리보기
       * - 다시 누르면 'both'(편집+미리보기 분할)로 복귀
       */
      // TOGGLE_CSS_STYLE is merged above with SETTINGS
      case 'MERGE':
        if (previewModeRef.current === 'preview') {
          showToast("미리보기 모드에서는 문서 병합을 사용할 수 없습니다.", 'warning');
          return;
        }
        setIsMergeMode(true);
        return;
    }

    // 2. 에디터 본문 서식 조작 명령어 (포커스 가드 강제 추적)
    if (!editorRef.current) return;
    const editor = editorRef.current;

    // [WBS SYNC-01] 이미 초입부에서 editor.focus() 및 getPosition()을 최우선 확보하였으므로 중복 호출 제거
    const MODAL_COMMANDS: EditorCommandType[] = ['IMAGE', 'VIDEO', 'YOUTUBE', 'MAP', 'TABLE', 'LATEX', 'MATH', 'LINK'];

    const selection = editor.getSelection();

    const model = editor.getModel();
    if (!model || !selection) return;

    // 💡 [실행취소 단위 격리] 서식 적용 전 직전 타이핑과의 실행취소(Undo) 단계를 명확히 분리하여,
    //    Ctrl+Z 시 타이핑했던 글자까지 지워지지 않고 서식 태그만 깔끔하게 취소되도록 경계 설정
    editor.pushUndoStop();

    switch (type) {
      // 서식 관련
      case 'BOLD': handlers.bold(); break;
      case 'FOOTNOTE': handlers.footnote(); break;
      case 'ORGANIZE_FOOTNOTES':
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('ORGANIZE_FOOTNOTES')) {
          break;
        }
        handlers.organizeFootnotes();
        break;
      case 'ITALIC': handlers.italic(); break;
      case 'INLINE_CODE': handlers.inlineCode(); break;
      case 'UNDERLINE': handlers.underline(); break;
      case 'STRIKETHROUGH': handlers.strikethrough(); break;
      case 'H1': handlers.h1(); break;
      case 'H2': handlers.h2(); break;
      case 'H3': handlers.h3(); break;
      case 'H4': handlers.h4(); break;
      case 'H5': handlers.h5(); break;
      case 'H6': handlers.h6(); break;
      case 'HR': handlers.hr(); break;
      case 'ORDERED_LIST': handlers.orderedList(); break;
      case 'LIST': handlers.list(); break;
      case 'QUOTE': handlers.quote(payload); break;
      case 'QUOTE_NOTE': handlers.quote('NOTE'); break;
      case 'QUOTE_TIP': handlers.quote('TIP'); break;
      case 'QUOTE_IMPORTANT': handlers.quote('IMPORTANT'); break;
      case 'QUOTE_WARNING': handlers.quote('WARNING'); break;
      case 'QUOTE_CAUTION': handlers.quote('CAUTION'); break;
      case 'CHECK':
      case 'CHECKLIST': handlers.check(); break;
      case 'ERASER':
      case 'REMOVE_PREFIX': handlers.removePrefix(); break;

      // 삽입 관련
      case 'LINK': handlers.link(); break;
      case 'DOCLINK': handlers.doclink(); break;
      case 'IMAGE': handlers.image(); break;
      case 'CITE': setIsCitationModalOpen(true); break;
      case 'YOUTUBE':
      case 'VIDEO': {
        const selText = model.getValueInRange(selection);
        const mdLink = selText.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
        if (mdLink) {
          setYoutubeInitialUrl(mdLink[2]);
          youtubeEditRangeRef.current = new (window as any).monaco.Range(
            selection.startLineNumber, selection.startColumn,
            selection.endLineNumber, selection.endColumn
          );
        } else {
          setYoutubeInitialUrl(null);
          youtubeEditRangeRef.current = null;
        }
        handlers.video();
        break;
      }
      case 'NOW':
      case 'CALENDAR': {
        if (typeof payload === 'string' && payload) {
          handleInsertFormattedDate(payload);
        } else {
          setIsCalendarModalOpen(true);
        }
        break;
      }
      case 'MAP': handlers.map(); break;
      case 'TABLE': handlers.table(); break;
      case 'QUICK_TABLE': handlers.quickTable(); break;
      case 'INSERT_TABLE_ROW': handlers.insertTableRow(); break;
      case 'DELETE_TABLE_ROW': handlers.deleteTableRow(); break;
      case 'CODE':
      case 'CODE_BLOCK': handlers.code(); break;
      case 'CHART': handlers.chart(); break;
      case 'LATEX':
      case 'MATH': {
        if (previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('MATH')) {
          return;
        }
        handlers.math();
        break;
      }
      case 'SIGNATURE': {
        if (!executingVisualSourceActionRef.current && previewRef.current?.querySelector('.visual-document-editor') && visualCommandRef.current?.('SIGNATURE')) {
          return;
        }
        handlers.signature();
        break;
      }

      // ★ 퀵 래핑 (Quick Transform)
      case 'WRAP_H1': handlers.quickWrap('h1'); break;
      case 'WRAP_H2': handlers.quickWrap('h2'); break;
      case 'WRAP_H3': handlers.quickWrap('h3'); break;
      case 'WRAP_QUOTE': handlers.quickWrap('quote'); break;
      case 'WRAP_CODE': handlers.quickWrap('code'); break;

      default:
        showToast(`알 수 없는 명령어: ${type}`, 'warning');
        break;
    }

    // 🛡️ 모달이 팝업되는 명령어는 에디터로 포커스를 뺏기지 않도록 예외 처리
    // (IMAGE, VIDEO, MAP, TABLE, LATEX, MATH, LINK 계열은 모달 입력 필드가 포커스를 가져야 함)
    // [WBS SYNC-02] 50ms 비동기 지연을 두어 에디터 버퍼의 완전 기록 후 토큰 리프레시 및 레이아웃 재적용으로 글자 겹침 완벽 해결
    setTimeout(() => {
      try {
        if (editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          const selection = editor.getSelection();
          if (model && selection) {
            const startLine = selection.startLineNumber;
            const endLine = selection.endLineNumber;
            for (let i = startLine; i <= endLine; i++) {
              if (model && typeof model.forceTokenization === 'function') {
                model.forceTokenization(i);
              }
            }
            editor.layout();
          }
        }
      } catch (_) { }
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers, isRestrictedUser]);

  // 🖨️ [인쇄 / 쪽 윤곽 모달 직결 이벤트 수신]
  useEffect(() => {
    const handleOpenPrint = () => {
      dispatchCommand('OPEN_EXPORT');
    };
    window.addEventListener('onrivi:open-print', handleOpenPrint);
    return () => window.removeEventListener('onrivi:open-print', handleOpenPrint);
  }, [dispatchCommand]);

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0071] MainEditorApp.tsx ➔ mapIdToCommandType
  // 🎯 @KICK  : 툴바 항목의 camelCase ID를 명시적 재정의 테이블로 EditorCommandType UPPER_SNAKE_CASE에 매핑
  // 🛡️ @GUARD : 불일치 ID에 대한 명시적 매핑(divider→HR, clear→REMOVE_PREFIX, calendar→NOW); 자동 UPPER_SNAKE 폴백
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const mapIdToCommandType = useCallback((id: string): EditorCommandType => {
    // 🔑 명시적 매핑 테이블: TOOLBAR_ITEMS id → EditorCommandType
    // (id ≠ commandType 인 항목들을 수동으로 정의하여 싱크 보장)
    const EXPLICIT_MAP: Record<string, EditorCommandType> = {
      bold: 'BOLD',
      italic: 'ITALIC',
      inlineCode: 'INLINE_CODE',
      underline: 'UNDERLINE',
      strikethrough: 'STRIKETHROUGH',
      h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
      divider: 'HR',        // id는 divider이지만 커맨드는 HR
      orderedList: 'ORDERED_LIST',
      list: 'LIST',
      quote: 'QUOTE',
      quoteNote: 'QUOTE_NOTE',
      quoteTip: 'QUOTE_TIP',
      quoteImportant: 'QUOTE_IMPORTANT',
      quoteWarning: 'QUOTE_WARNING',
      quoteCaution: 'QUOTE_CAUTION',
      checklist: 'CHECKLIST',
      clear: 'REMOVE_PREFIX',  // id는 clear이지만 커맨드는 REMOVE_PREFIX
      cleanDoc: 'CLEAN_DOC',
      link: 'LINK',
      taglink: 'DOCLINK',
      image: 'IMAGE',
      video: 'VIDEO',
      vidio: 'VIDEO',
      youtube: 'YOUTUBE',
      calendar: 'NOW',
      now: 'NOW',
      map: 'MAP',
      chart: 'CHART',
      codeblock: 'CODE_BLOCK',
      math: 'MATH',
      styleSettings: 'TOGGLE_CSS_STYLE',
      table: 'TABLE',
      footnote: 'FOOTNOTE',
      citation: 'CITE',
      signature: 'SIGNATURE',
      quickTable: 'QUICK_TABLE',
      insertTableRow: 'INSERT_TABLE_ROW',
      deleteTableRow: 'DELETE_TABLE_ROW',
      toggleFloatingToolbar: 'TOGGLE_FLOATING_TOOLBAR',
      toggleToolbar: 'TOGGLE_TOOLBAR',
      toggleSidebar: 'TOGGLE_SIDEBAR',
      toggleMode: 'TOGGLE_MODE',
      toggleTheme: 'TOGGLE_THEME',
      'wrap-h1': 'WRAP_H1',
      aiHelp: 'AI_DRAFT',
      'wrap-h2': 'WRAP_H2',
      'wrap-h3': 'WRAP_H3',
      'wrap-quote': 'WRAP_QUOTE',
      'wrap-code': 'WRAP_CODE',
    };
    if (EXPLICIT_MAP[id]) return EXPLICIT_MAP[id];
    // 명시적 매핑이 없으면 camelCase → UPPER_SNAKE_CASE 자동 변환으로 폴백
    const snake = id.replace(/([A-Z])/g, '_$1').toUpperCase();
    return snake as EditorCommandType;
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

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0072] MainEditorApp.tsx ➔ hotkeyRegistration
  // 🎯 @KICK  : 모든 TOOLBAR_ITEMS에 대해 사용자 정의 단축키(Ctrl+S/Ctrl+Shift+S 포함)로 Monaco 에디터 액션 등록
  // 🛡️ @GUARD : 재실행 시 이전 disposables 해제; 키바인딩 문자열을 Monaco KeyMod/KeyCode로 파싱
  // 🚨 @PATCH : **2026-09-13** — [ESLint 경고 제거] useEffect 내 content 직접 참조 대신 contentRef.current 사용으로 react-hooks/exhaustive-deps 경고 해소
  // 🔗 @CALLS : TOOLBAR_ITEMS.forEach, editor.addAction, monaco.editor.defineTheme, monaco.editor.setTheme, updateDecorations, handleEditorPaste
  // ====================================================================
  useEffect(() => {
    if (!editorRef.current || !(window as any).monaco) return;
    const editor = editorRef.current;
    const monaco = (window as any).monaco;

    hotkeyDisposablesRef.current.forEach(d => d.dispose());
    hotkeyDisposablesRef.current = [];

    // 글로벌 trigger-custom-action 명령어를 위한 최신 디스패처 갱신
    if (typeof window !== 'undefined') {
      (window as any).dispatchEditorCommand = (id: string) => {
        if (id === 'custom-action-knowledge-manager' || id === 'knowledge') {
          window.dispatchEvent(new CustomEvent('app:open-knowledge-manager'));
          return;
        }

        if (id === 'AI_MODAL') {
          // 💡 [AI API 가드] API Key가 설정되어 있지 않으면 작동하지 않고 경고 후 설정창을 켭니다.
          if (!geminiApiKey) {
            showToast("AI 기능을 사용하려면 설정(톱니바퀴)에서 Gemini API Key를 등록해 주세요.", "warning");
            dispatchCommand('SETTINGS');
            return;
          }
          if (!activeTabIdRef.current || previewModeRef.current === 'preview') {
            showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
            return;
          }
          const editor = editorRef.current;
          const selection = editor ? editor.getSelection() : null;
          const model = editor ? editor.getModel() : null;
          let selectedText = '';
          let fullText = contentRef.current || '';
          if (editor && model) {
            fullText = model.getValue();
            if (selection && !selection.isEmpty()) {
              selectedText = model.getValueInRange(selection);
            }
          }
          setAiEditorContext({ selectedText, fullText });
          setAiDraftInitialMode(selectedText ? 'editorial' : 'draft');
          setIsAIDraftModalOpen(true);
          return;
        }
        const cmdType = mapIdToCommandType(id);
        dispatchCommand(cmdType);
      };
    }

    const parseKeybinding = (keyStr: string) => {
      if (!keyStr) return 0;
      let binding = 0;
      const parts = keyStr.split('+').map(p => p.trim().toUpperCase());
      if (parts.includes('CTRL') || parts.includes('CTRLCMD')) binding |= monaco.KeyMod.CtrlCmd;
      if (parts.includes('SHIFT')) binding |= monaco.KeyMod.Shift;
      if (parts.includes('ALT')) binding |= monaco.KeyMod.Alt;
      if (parts.includes('WIN') || parts.includes('META')) binding |= monaco.KeyMod.WinCtrl;

      const keyPart = parts[parts.length - 1];
      if (keyPart.length === 1 && keyPart >= 'A' && keyPart <= 'Z') {
        binding |= monaco.KeyCode[`Key${keyPart}`];
      } else if (keyPart >= '0' && keyPart <= '9') {
        binding |= monaco.KeyCode[`Digit${keyPart}`];
      } else if (keyPart === '-') {
        binding |= monaco.KeyCode.Minus;
      } else if (keyPart === '=') {
        binding |= monaco.KeyCode.Equal;
      } else if (keyPart === '\\') {
        binding |= monaco.KeyCode.Backslash;
      } else if (keyPart === '[') {
        binding |= monaco.KeyCode.BracketLeft;
      } else if (keyPart === ']') {
        binding |= monaco.KeyCode.BracketRight;
      } else if (keyPart === ';') {
        binding |= monaco.KeyCode.Semicolon;
      } else if (keyPart === "'") {
        binding |= monaco.KeyCode.Quote;
      } else if (keyPart === ',') {
        binding |= monaco.KeyCode.Comma;
      } else if (keyPart === '.') {
        binding |= monaco.KeyCode.Period;
      } else if (keyPart === '/') {
        binding |= monaco.KeyCode.Slash;
      } else if (keyPart === 'SPACE') {
        binding |= monaco.KeyCode.Space;
      } else if (keyPart === 'ENTER') {
        binding |= monaco.KeyCode.Enter;
      } else if (keyPart === 'DELETE') {
        binding |= monaco.KeyCode.Delete;
      } else if (keyPart === 'BACKSPACE') {
        binding |= monaco.KeyCode.Backspace;
      } else if (keyPart === 'TAB') {
        binding |= monaco.KeyCode.Tab;
      } else if (keyPart === 'ESCAPE' || keyPart === 'ESC') {
        binding |= monaco.KeyCode.Escape;
      } else if (keyPart.length >= 2 && keyPart.startsWith('F')) {
        const fNum = parseInt(keyPart.substring(1));
        if (fNum >= 1 && fNum <= 12) {
          binding |= monaco.KeyCode[`F${fNum}`];
        }
      }
      return binding;
    };

    // 🚀 기존 Object.entries(handlers) 방식 → TOOLBAR_ITEMS 기준 순회로 전환
    // 이유: handlers 메소드명과 TOOLBAR_ITEMS의 id가 불일치하면(예: checklist vs check, divider vs hr)
    //       일부 단축키가 등록되지 않아 툴바·슬래시·단축키 3자 사이의 갯수·기능 싱크가 깨짐
    TOOLBAR_ITEMS.forEach(item => {
      const kbStr = (customHotkeys && customHotkeys[item.id]) ? customHotkeys[item.id] : item.defaultHotkey;
      const kb = kbStr ? parseKeybinding(kbStr) : 0;
      const keybindings = kb !== 0 ? [kb] : [];

      // 💡 [서명 단축키 듀얼 바인딩] Ctrl+Alt+R 및 Ctrl+Alt+S 모두 지원하여 사용자 편의 극대화
      if (item.id === 'signature') {
        const altKb = parseKeybinding('Ctrl+Alt+S');
        if (altKb && !keybindings.includes(altKb)) {
          keybindings.push(altKb);
        }
      }

      const disposable = editor.addAction({
        id: `custom-action-${item.id}`,
        label: `${item.name} (${item.group})`,
        keybindings,
        run: () => {
          // 🚀 handlers 직접 호출 대신 dispatchCommand 단방향 파이프라인으로 일원화
          const cmdType = mapIdToCommandType(item.id);
          dispatchCommand(cmdType);
        }
      });
      hotkeyDisposablesRef.current.push(disposable);
    });

    // 💡 Monaco Editor 인스턴스에 Ctrl+S 및 Ctrl+Shift+S 저장 액션 바인딩
    const saveAction = editor.addAction({
      id: 'custom-action-save',
      label: '저장 (Save)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        dispatchCommand('SAVE');
      }
    });
    hotkeyDisposablesRef.current.push(saveAction);

    const saveAsAction = editor.addAction({
      id: 'custom-action-save-as',
      label: '다른 이름으로 저장 (Save As)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS],
      run: () => {
        dispatchCommand('SAVE_AS');
      }
    });
    hotkeyDisposablesRef.current.push(saveAsAction);
  }, [customHotkeys, isEditorReady, dispatchCommand, mapIdToCommandType, geminiApiKey, showToast]);

  // ====================================================================
  // 📊 [OMD-EDIT-0037] MainEditorApp.tsx ➔ globalKeydownHandler
  // 🎯 @KICK  : 전역 키보드 단축키 처리기: S/O의 브라우저 기본 동작 차단, Escape로 플로팅 툴바/태그 선택기 처리, 사용자 정의 단축키 라우팅
  // 🛡️ @GUARD : capture 단계 리스너; Monaco 외부 폼 요소 이벤트 무시; IME 229 keyCode 복구; 에디터 포커스 체크 전 글로벌 전용 단축키 감지; Shift+방향키 조기 반환(Monaco 선택 보호); Windows Meta(Win) 키 가드 (Win+Shift+S 스크린샷 캡처 보호)
  // 🚨 @PATCH : **2026-09-11** — Windows/Linux 환경에서 Meta(Win) 키 단축키(Win+Shift+S 등) 조기 반환 가드 추가 및 isCtrl 플랫폼 분리 (윈도우 스크린샷 캡처 차단 결함 해결)
  //           | Ctrl+S/O 브라우저 기본 저장/열기 다이얼로그 preventDefault 처리; 한글 입력을 위한 keyCode 229 IME 조합 복구
  //           | Shift+방향키를 capture 단계에서 가로채지 않도록 early return 추가 | 2026-06-15 | IME+방향키 충돌로 Monaco 텍스트 선택 버그 해결
  // 🔗 @CALLS : dispatchCommand, mapIdToCommandType, setFloatingToolbar
  // ====================================================================
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const findModifier = e.ctrlKey || (e.metaKey && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent));
      if (!e.isComposing && findModifier && !e.altKey && !e.shiftKey && previewModeRef.current !== 'edit' && ['f', 'h'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation();
        dispatchCommand(e.key.toLowerCase() === 'h' ? 'REPLACE' : 'FIND');
        return;
      }
      // The visual editor owns selection, IME and editing shortcuts. Saving
      // still uses the common file handler and its immediately updated source.
      if ((e.target as HTMLElement)?.closest?.('.picturebook-scene-input')) {
        const item=configuredHotkeyItem(e,customHotkeys);
        if(item && ['save','saveAs'].includes(item.id)){
          e.preventDefault();e.stopPropagation();dispatchCommand(mapIdToCommandType(item.id));
        }
        return;
      }
      if ((e.target as HTMLElement)?.closest?.('.visual-document-editor')) {
        const item = configuredHotkeyItem(e, customHotkeys);
        if (item) {
          e.preventDefault(); e.stopPropagation();
          dispatchCommand(mapIdToCommandType(item.id));
        }
        return;
      }
      // 💡 [비표준 이벤트 가드] getModifierState 메서드가 없는 가상/비표준 이벤트 유입 차단
      if (typeof e.getModifierState !== 'function') {
        return;
      }

      // 💡 [Shift+방향키 가드] capture:true 단계에서 Shift+방향키를 절대 가로채지 않음
      // Monaco 에디터의 cursorLeftSelect/cursorRightSelect 등 기본 텍스트 선택 동작 보호
      // 특히 IME(한글) 상태에서 keyCode 229 복구 로직과 충돌하여 선택이 끊기는 버그 방지
      if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        return;
      }

      // 💡 [Windows OS 전용 단축키 가드] Windows/Linux 환경에서 Meta(Win) 키가 포함된 조합은 절대 가로채지 않음
      // Win+Shift+S (윈도우 캡처 도구/스크린샷), Win+V (클립보드 히스토리), Win+. (이모지), Win+PrtScn 등
      // Windows 키 조합이 Ctrl+S(저장) 또는 다른 커맨드로 오인되어 OS 스크린샷 캡처가 차단되는 결함 원천 방어
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform);
      if (!isMac && e.metaKey) {
        return;
      }

      // 💡 포커스가 모나코 에디터 외부의 일반 HTML 입력 요소(input, select, textarea)인 경우
      // 글로벌 단축키 가로채기 동작을 차단하고 브라우저 기본 입력을 전적으로 허용합니다.
      const target = e.target as HTMLElement;
      if (target) {
        const isFormElement = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
        const isInsideMonaco = target.closest('.monaco-editor') !== null;
        if (isFormElement && !isInsideMonaco) {
          return;
        }
      }

      // Tab: 플로팅 툴바가 활성화된 상태에서 Tab 입력 시 플로팅 툴바 내부 버튼으로 포커스 진입
      if (e.key === 'Tab' && floatingToolbar.visible && !isCtrl && !isAlt && !e.metaKey) {
        const toolbarEl = floatingToolbarRef.current || document.getElementById('floating-toolbar');
        if (toolbarEl && !toolbarEl.contains(document.activeElement)) {
          const buttons = Array.from(toolbarEl.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
          if (buttons.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            const targetBtn = isShift ? buttons[buttons.length - 1] : buttons[0];
            targetBtn?.focus();
            return;
          }
        }
      }

      // Escape: 인용구 드롭다운, 이모지 패널 또는 플로팅 툴바 숨김 (에디터 포커스 무관)
      if (e.key === 'Escape') {
        if (floatingQuoteDropdown.open) {
          e.preventDefault();
          e.stopPropagation();
          setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
          return;
        }
        if (floatingToolbar.visible) {
          // Let the focused visual editor handle the same Escape to exit its
          // inline marks. Closing the toolbar must not swallow that key first.
          if (!(e.target instanceof Element && e.target.closest('.visual-document-surface'))) {
            e.preventDefault();
            e.stopPropagation();
          }
          setFloatingToolbar(prev => ({ ...prev, visible: false }));
          return;
        }
      }

      const isCtrl = isMac ? (e.metaKey || e.ctrlKey) : e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;


      // 제한사용자에서는 Monaco/브라우저 기본 단축키로 편집 메뉴 제한을 우회하지 못하게 한다.
      if (isRestrictedUser && isCtrl) {
        const key = e.key.toUpperCase();
        if ((key === 'F' && !isShift) || ['H', 'Z', 'Y', '+', '=', '-'].includes(key) || (isAlt && key === 'O')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // 💡 [IME-02] 브라우저 환경에서 Ctrl+S 저장 시 웹페이지 저장(HTML) 다이얼로그가 강제 노출되는 이벤트를 차단하고 
      // 우리 에디터 고유의 저장 커맨드를 실행하도록 원천 차단합니다. (에디터 포커스 여부와 관계없이 전역 방어)
      if (isCtrl && !isAlt) {
        const keyUpper = e.key.toUpperCase();
        if (keyUpper === 'S' && isShift) {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('SAVE_AS');
          return;
        }
        if (keyUpper === 'S' && !isShift) {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('SAVE');
          return;
        }
        if (keyUpper === 'N' && !isShift) {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('NEW_FILE');
          return;
        }
      }

      // 파일 열기, 작업장 폴더 열기, 전역 검색(Ctrl+Shift+F)은 포커스 위치와 관계없이 전역에서 동작한다.
      if (isCtrl && !isAlt) {
        const keyUpper = e.key.toUpperCase();
        if (isShift && (keyUpper === 'F' || e.code === 'KeyF')) {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('GLOBAL_SEARCH');
          return;
        }
        if (keyUpper === 'O') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand(isShift ? 'OPEN_WORKSPACE' : 'OPEN_FILE');
          return;
        }
        if (!isShift && e.key === ',') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('SETTINGS');
          return;
        }
      }

      // 💡 [글로벌 푸터 제어 단축키 예외 가드]
      // 플로팅 툴바, 툴바, 사이드바, 모드, 테마 전환 단축키(Ctrl+Shift+F1 ~ F5)는
      // 에디터 포커스 유무와 관계없이 브라우저 기본 동작(예: F5 새로고침, F3 검색 등)과 충돌하여 오작동하는 것을 원천 차단하기 위해
      // 포커스 체크 전에 전역적으로 이벤트를 가로채서 수동 격발시킵니다.
      const combinationPartsForGlobal: string[] = [];
      if (isCtrl) combinationPartsForGlobal.push('CTRL');
      if (isShift) combinationPartsForGlobal.push('SHIFT');
      if (isAlt) combinationPartsForGlobal.push('ALT');
      const globalPhysicalKey = (isCtrl || isAlt) && e.code?.startsWith('Key')
        ? e.code.substring(3).toUpperCase()
        : (isCtrl || isAlt) && e.code?.startsWith('Digit')
          ? e.code.substring(5)
          : e.key.toUpperCase();
      combinationPartsForGlobal.push(globalPhysicalKey);
      const combinationStrForGlobal = combinationPartsForGlobal.join('+');

      const globalOnlyKeys = ['toggleFloatingToolbar', 'toggleToolbar', 'toggleSidebar', 'toggleMode', 'toggleTheme', 'add_reference', 'styleSettings'];
      let handledGlobal = false;
      for (const keyId of globalOnlyKeys) {
        const configuredHotkey = customHotkeys[keyId] || (TOOLBAR_ITEMS.find(item => item.id === keyId)?.defaultHotkey);
        if (!configuredHotkey) continue;
        const normalizedConfig = configuredHotkey
          .replace(/\s+/g, '')
          .toUpperCase()
          .replace('CTRLCMD', 'CTRL');

        if (combinationStrForGlobal === normalizedConfig) {
          e.preventDefault();
          e.stopPropagation();
          const cmdType = mapIdToCommandType(keyId);
          dispatchCommand(cmdType);
          handledGlobal = true;
          break;
        }
      }
      if (handledGlobal) return;

      // 💡 에디터 텍스트 포커스 여부 판별 (Windows Alt 키 입력 시 일시적 포커스 이탈 방어)
      const editorHasFocus = Boolean(
        editorRef.current && (
          editorRef.current.hasTextFocus() ||
          editorRef.current.getDomNode()?.contains(document.activeElement)
        )
      );

      // 🔍 [미리보기 vs 에디터 단축키 격리 라우터]
      // 1. 미리보기 텍스트 찾기 전용 직접 단축키 (Ctrl + Alt + F)
      //    - 에디터 포커스 여부와 무관하게 100% 미리보기 찾기 위젯 토글 (GlobalSearch Ctrl+Shift+F 및 에디터 Ctrl+F와 완전 분리)
      if (previewModeRef.current !== 'edit') {
        if (isCtrl && isAlt && !isShift && (e.key === 'F' || e.key === 'f' || e.code === 'KeyF')) {
          e.preventDefault();
          e.stopPropagation();
          setIsPreviewFindOpen(prev => !prev);
          return;
        }

        // 2. 미리보기 직접 확대/축소/100% 리셋 (Ctrl + Alt + = / - / 0)
        //    - 에디터를 편집 중인 상태에서도 키보드로 미리보기를 직접 줌 조절 가능
        if (isCtrl && isAlt && !isShift) {
          if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
            e.preventDefault();
            e.stopPropagation();
            setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
            return;
          }
          if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            e.stopPropagation();
            setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
            return;
          }
          if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
            e.preventDefault();
            e.stopPropagation();
            setPreviewZoomScale(1.0);
            return;
          }
        }

        // 3. 문서보기(미리보기) 화면 배율 확대/축소/100% 리셋 및 찾기
        // (1) Ctrl + F: 미리보기 포커스 또는 전용 모드 시 찾기 위젯 오픈
        if ((!editorHasFocus || previewModeRef.current === 'preview' || isPreviewFindOpenRef.current) && isCtrl && !isShift && !isAlt && (e.key === 'F' || e.key === 'f' || e.code === 'KeyF')) {
          e.preventDefault();
          e.stopPropagation();
          setIsPreviewFindOpen(true);
          return;
        }

        // (2) Ctrl + = 또는 Ctrl + +: 문서보기 확대 (+10%)
        if (isCtrl && !isShift && !isAlt && (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
          e.preventDefault();
          e.stopPropagation();
          setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
          return;
        }

        // (3) Ctrl + -: 문서보기 축소 (-10%)
        if (isCtrl && !isShift && !isAlt && (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
          e.preventDefault();
          e.stopPropagation();
          setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
          return;
        }

        // (4) Ctrl + 0: 문서보기 배율 100% 리셋
        if (isCtrl && !isShift && !isAlt && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
          e.preventDefault();
          e.stopPropagation();
          setPreviewZoomScale(1.0);
          return;
        }
      }

      const visualEditorEl = previewRef.current?.querySelector('.visual-document-editor');
      const visualEditorHasFocus = Boolean(visualEditorEl?.contains(document.activeElement));
      if (!editorHasFocus && !(previewModeRef.current === 'preview' && visualEditorEl && !visualEditorHasFocus)) return;

      let key = e.key.toUpperCase();

      // 1. Shift 눌림에 의한 숫자 키의 기호 변조 보정 (& -> 7, * -> 8)
      if (e.code.startsWith('Digit')) {
        key = e.code.substring(5); // 'Digit7' -> '7'
      }

      // 2. 한글 입력기(IME) 상태이거나 한/영 전환 상태에서 영문자가 아닌 키 입력 물리 복원
      if (isCtrl || isAlt) {
        if (e.code && e.code.startsWith('Key')) {
          key = e.code.substring(3).toUpperCase(); // 'KeyX' -> 'X'
        } else if (e.code && e.code.startsWith('Digit')) {
          key = e.code.substring(5); // 'Digit7' -> '7'
        } else if (e.code === 'Backslash' || e.key === '\\' || e.key === '₩') {
          key = '\\';
        }
      }

      // 조합 스캔 키 문자열 생성 (예: CTRL+SHIFT+X)
      const combinationParts: string[] = [];
      if (isCtrl) combinationParts.push('CTRL');
      if (isShift) combinationParts.push('SHIFT');
      if (isAlt) combinationParts.push('ALT');
      combinationParts.push(key);

      const combinationStr = combinationParts.join('+');

      // 등록된 단축키 목록에서 일치하는 기능 스캔
      for (const item of TOOLBAR_ITEMS) {
        const configuredHotkey = (customHotkeys[item.id] !== undefined ? customHotkeys[item.id] : item.defaultHotkey);
        if (!configuredHotkey) continue;

        // 단축키 비교 포맷 표준 정규화 (예: 'Ctrl + Shift + X' -> 'CTRL+SHIFT+X')
        const normalizedConfig = configuredHotkey
          .replace(/\s+/g, '')
          .toUpperCase()
          .replace('CTRLCMD', 'CTRL');

        if (
          combinationStr === normalizedConfig ||
          (item.id === 'signature' && (combinationStr === 'CTRL+ALT+R' || combinationStr === 'CTRL+ALT+S'))
        ) {
          // 단축키 매치 성공: 브라우저 기본 및 이벤트 전파 강제 억제
          e.preventDefault();
          e.stopPropagation();

          const cmdType = mapIdToCommandType(item.id);
          dispatchCommand(cmdType);
          break;
        }
      }
    };

    // 캡처(true) 모드로 등록하여 최우선순위로 가로챕니다.
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [customHotkeys, dispatchCommand, mapIdToCommandType, floatingToolbar.visible, setFloatingToolbar, floatingQuoteDropdown.open, isRestrictedUser]);

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

  // Get docLinkPicker absolute screen coordinates based on cursor position
  let docLinkPickerStyle: React.CSSProperties = { top: 0, left: 0 };
  if (showDocLinkPicker && visualDocLinkPositionRef.current) {
    let { top, left } = visualDocLinkPositionRef.current;
    const pickerWidth = 420;
    const pickerHeight = 420;
    if (typeof window !== 'undefined') {
      if (left + pickerWidth > window.innerWidth) {
        left = Math.max(16, window.innerWidth - pickerWidth - 16);
      }
      if (left < 16) left = 16;
      if (top + pickerHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - pickerHeight - 16);
      }
    }
    docLinkPickerStyle = { top, left };
  } else if (showDocLinkPicker && editorRef.current) {
    const editor = editorRef.current;
    const position = editor.getPosition();
    if (position) {
      const visiblePos = editor.getScrolledVisiblePosition(position);
      if (visiblePos) {
        const editorDom = editor.getContainerDomNode();
        if (editorDom) {
          const rect = editorDom.getBoundingClientRect();
          let top = visiblePos.top + rect.top + 22;
          let left = visiblePos.left + rect.left;
          const pickerWidth = 420;
          const pickerHeight = 420;
          if (typeof window !== 'undefined') {
            if (left + pickerWidth > window.innerWidth) {
              left = Math.max(16, window.innerWidth - pickerWidth - 16);
            }
            if (left < 16) {
              left = 16;
            }
            if (top + pickerHeight > window.innerHeight) {
              top = Math.max(16, visiblePos.top + rect.top - pickerHeight - 6);
            }
          }
          docLinkPickerStyle = { top, left };
        }
      }
    }
  }
  if (docLinkPickerStyle.top === 0 && docLinkPickerStyle.left === 0) {
    let fixedTop = floatingToolbar.top;
    let fixedLeft = floatingToolbar.left;
    if (editorRef.current) {
      const editorDom = editorRef.current.getContainerDomNode();
      if (editorDom) {
        const rect = editorDom.getBoundingClientRect();
        fixedTop += rect.top;
        fixedLeft += rect.left;
      }
    }
    docLinkPickerStyle = { top: fixedTop + 44, left: fixedLeft };
  }
  const handleAIDraftApply = (draftContent: string, action: 'insert' | 'replace' | 'append', scope: 'selection' | 'document' | 'none' = 'none') => {
    setIsAIDraftModalOpen(false); // Close modal
    
    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition() || { lineNumber: 1, column: 1 };
      const selection = editor.getSelection();
      const model = editor.getModel();
      const monacoObj = typeof window !== 'undefined' && (window as any).monaco ? (window as any).monaco : null;
      
      if (model && monacoObj) {
        if (action === 'insert') {
          const insertText = `\n\n${draftContent}\n\n`;
          editor.executeEdits("AI_DRAFT_INSERT", [{
            range: new monacoObj.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: insertText,
            forceMoveMarkers: true
          }]);
          editor.setPosition({ lineNumber: position.lineNumber + 2, column: 1 });
          editor.revealPositionInCenter({ lineNumber: position.lineNumber + 2, column: 1 }, 1);
          showToast("작성된 초안이 본문에 삽입되었습니다. (Ctrl+Z 실행취소 가능)", "success");
        } else if (action === 'replace') {
          if (scope === 'document') {
            const fullRange = model.getFullModelRange();
            editor.executeEdits("AI_MODAL_REPLACE_DOC", [{
              range: fullRange,
              text: draftContent,
              forceMoveMarkers: true
            }]);
            showToast("문서 전체가 새로 작성된 내용으로 덮어씌워졌습니다.", "success");
          } else if (selection && !selection.isEmpty()) {
            editor.executeEdits("AI_MODAL_REPLACE", [{
              range: selection,
              text: draftContent,
              forceMoveMarkers: true
            }]);
            showToast("기존 텍스트가 덮어씌워졌습니다. (Ctrl+Z 실행취소 가능)", "success");
          }
        } else if (action === 'append') {
          let endLine = model.getLineCount();
          if (selection && !selection.isEmpty() && scope !== 'document') {
            endLine = selection.endLineNumber;
          }
          const endCol = model.getLineMaxColumn(endLine);
          const insertRange = new monacoObj.Range(endLine, endCol, endLine, endCol);
          
          const formattedText = `\n\n---\n#### [AI 교정문]\n${draftContent}\n---\n`;
          editor.executeEdits("AI_MODAL_APPEND", [{
            range: insertRange,
            text: formattedText,
            forceMoveMarkers: true
          }]);
          showToast("선택된 내용 아래에 덧붙여졌습니다.", "success");
        }
      }
      editor.focus();
      updateContent(editor.getValue());
    }
  };



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

        <div className={`onrivi-editor-shell flex h-screen overflow-hidden flex-col text-on-surface ${mounted && isDarkMode ? 'dark' : ''} bg-surface relative`}>

          {/* 🛡️ 동일 브라우저 다중 탭 또는 다른 브라우저/기기 동시 접속 시 - 비차단형 제한사용자 안내 배너 */}
          {((isDuplicateInstance && isEditorPlan) || (licenseStatus.isConcurrentLimited && (licenseStatus.hasEditorSubscription || isEditorPlan))) && activeMainView !== 'knowledge' && (
            <aside aria-label="동시 접속 제한 모드 안내" className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 z-50 shrink-0 select-none">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-base leading-none">⚠️</span>
                <span>
                  {isDuplicateInstance ? (
                    <>다른 탭에서 Onrivi 에디터가 이미 실행 중이므로 현재 화면은 <strong>읽기 전용(제한사용자)</strong> 모드로 동작합니다.</>
                  ) : (
                    <>다른 브라우저나 기기에서 Onrivi 에디터가 이미 사용 중이어서 현재 화면은 <strong>읽기 전용(제한사용자)</strong> 모드로 열렸습니다.</>
                  )}
                </span>
              </div>
              <button
                type="button"
                disabled={isTakingOver}
                onClick={handleTakeover}
                className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#05b34c] text-white font-extrabold rounded-lg shadow-xs transition-colors cursor-pointer border-none shrink-0 ml-4 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
              >
                {isTakingOver ? '편집 권한 전환 중...' : '이 화면에서 편집 시작하기'}
              </button>
            </aside>
          )}

          {/* 🧠 지식 베이스(KnowledgeHubView) 인라인 오버레이 (에디터 DOM 언마운트 없이 영구 보존, z-[150]으로 에디터 UI 완벽 격리) */}
          {activeMainView === 'knowledge' && (
            <div className="absolute inset-0 z-[150] flex flex-col bg-[#FAFBFC] dark:bg-[#121316]">
              <KnowledgeHubView 
                initialTab="dashboard"
                resourceFolder={resourceFolder}
                resourceFolderHandle={resourceFolderHandle}
                geminiApiKey={geminiApiKey}
                onSaveApiKey={setGeminiApiKey}
                planCode="ELITEPRO"
                aiModelName={aiModelName}
                onSaveModelName={setAiModelName}
                fileTreeNodes={fileList}
                isStandalonePage={false}
                onBackToEditor={() => setActiveMainView('editor')}
              />
            </div>
          )}

          <div className={activeMainView === 'knowledge' ? 'hidden' : 'contents'}>
            <MenuBar />

          </div>



          <div className="flex flex-1 overflow-hidden relative">
            <LeftSidebar />

            <main className="flex flex-1 flex-col overflow-hidden bg-transparent relative">
              
              {/* ⏳ [게스트 즉시 체험판 인터랙티브 플로팅 가이드 위젯] */}
              {isGuestMode && (
                <div className="absolute top-16 right-6 z-[99] no-print" translate="no">
                  {isGuideMinimized ? (
                    <button 
                      onClick={() => setIsGuideMinimized(false)}
                      className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition duration-150 cursor-pointer border-none text-base font-bold"
                      title={`체험판 가이드 열기 (남은 시간: ${formatTime(guestRemainingSeconds)})`}
                    >
                      🌟
                    </button>
                  ) : (
                    <div className="w-[320px] bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl text-left select-none text-zinc-800 dark:text-zinc-200">
                      <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          🌟 5분 체험 가이드 ({guideStep}단계 / 5단계)
                        </span>
                        <button 
                          onClick={() => setIsGuideMinimized(true)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs bg-none border-none cursor-pointer"
                        >
                          접기
                        </button>
                      </div>

                      {/* ⏱️ 체험 남은 시간 및 접속 횟수 상시 노출 영역 */}
                      <div className="mb-3.5 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/40 rounded-xl flex justify-between items-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                        <div className="flex items-center gap-1.5 animate-pulse">
                          <span>⏱️ 남은 시간:</span>
                          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{formatTime(guestRemainingSeconds)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-2.5">
                          <span>🔄 접속:</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{typeof window !== 'undefined' ? localStorage.getItem('onrivi_guest_try_count') || '1' : '1'} / 5회</span>
                        </div>
                      </div>

                      {/* 단계별 내용 */}
                      {guideStep === 1 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">1단계: 작업장 폴더 설정 📂</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            윈도우 탐색기에서 <strong>my_writing</strong> 폴더를 만든 후, 온리비 메뉴바의 <strong>파일(F) &gt; 작업장 폴더 열기</strong>를 눌러 해당 폴더를 연동해 주세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 2 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">2단계: 공통 자원폴더 지정 ⚙️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            모든 서식과 미디어가 저장될 공통 자원 폴더를 PC에 만들고, 온리비 메뉴바의 <strong>도구(T) &gt; 환경설정 &gt; 일반설정 &gt; 자원관리</strong>에서 폴더를 지정해 주세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 3 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">3단계: 간단한 문서 만들기 ✍️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2.5">
                            아래 첨부파일을 다운받아 메모장으로 열고, 전체 내용을 복사해서 새 파일(Onrivi_Author)에 붙여넣어 주세요. (에디터 하단 <strong>분할모드</strong> 활성화 권장)
                          </p>
                          <a 
                            href="/onrivi_author.md" 
                            download 
                            className="inline-block py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 font-bold text-[10px] rounded-lg transition duration-150 cursor-pointer border-none text-center no-underline"
                          >
                            📥 실습용 onrivi_author.md 다운로드
                          </a>
                        </div>
                      )}
                      {guideStep === 4 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">4단계: 내보내기 및 인쇄 (출력) 🖨️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            오른쪽 <strong>서식설정(프로필)</strong>을 열어 원하는 서식을 선택한 후, 상단 메뉴바의 <strong>파일(F) &gt; 내보내기 &gt; 인쇄/PDF</strong>를 클릭하여 문서를 PDF나 프린터로 고품질 출력하세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 5 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">5단계: 자유로운 글쓰기 시작 🍀</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2.5">
                            기본 1~4단계를 무사히 마치셨습니다! 이제 체험 챌린지 가이드를 닫고, 온리비 어서(Onrivi Author) 공간에서 자유롭고 멋지게 나만의 원고를 창작해 보셔요!
                          </p>
                          <button 
                            onClick={() => {
                              localStorage.removeItem('onrivi_guest_mode');
                              localStorage.removeItem('onrivi_guest_expired');
                              localStorage.removeItem('onrivi_guest_start_time');
                              localStorage.removeItem('onrivi_guest_try_count');
                              window.location.href = '/signup';
                            }}
                            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition duration-150 cursor-pointer border-none text-center"
                          >
                            무료 회원가입하고 계속 사용하기
                          </button>
                        </div>
                      )}

                      {/* 이전/다음 버튼 */}
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                        <button 
                          disabled={guideStep === 1}
                          onClick={() => setGuideStep(p => p - 1)}
                          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                        >
                          이전
                        </button>
                        <button 
                          disabled={guideStep === 5}
                          onClick={() => setGuideStep(p => p + 1)}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/70 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              

              {/* 탭 바를 오른쪽 에디터/미리보기 영역에만 위치하도록 main 상단에 배치 */}
              {!showEmbeddedWelcome && (
                <div className="no-print flex flex-col w-full">
                  <UnifiedTabBar />
                  {activeTab && (() => {
                    let rootDrive = '';
                    let baseFolders: string[] = [];
                    let rootName = '';
                    let folders: string[] = [];
                    let fileName = currentFileName || '';

                    const targetPath = currentFileNode?.path || activeTab?.path || '';

                    // 1. 데스크톱 / 로컬 파일 시스템 (targetPath에 OS 실제 절대경로가 있는 경우)
                    if (targetPath && (targetPath.includes(':') || targetPath.startsWith('/'))) {
                      const cleanPath = targetPath.replace(/\\/g, '/');
                      const parts = cleanPath.split('/').filter(Boolean);
                      if (cleanPath.includes(':')) {
                        rootDrive = parts[0]; // 예: "E:"
                        folders = parts.slice(1, parts.length - 1); // ["ZZ 개인자료", "블로그", "사업구상", "홈페이지 외주제작"]
                        fileName = parts[parts.length - 1] || currentFileName;
                      } else {
                        rootDrive = '/';
                        folders = parts.slice(0, parts.length - 1);
                        fileName = parts[parts.length - 1] || currentFileName;
                      }
                    } else if (workspaceType === 'browser') {
                      // 2. 웹 브라우저 환경 (W3C File System Access API: 보안상 상위 디렉터리 은닉)
                      // 사용자가 설정한 실제 상위 경로(예: "E:\ZZ 개인자료")가 있다면 프리픽스로 연결
                      if (webBasePath) {
                        const cleanBase = webBasePath.replace(/\\/g, '/');
                        const baseParts = cleanBase.split('/').filter(Boolean);
                        if (cleanBase.includes(':')) {
                          rootDrive = baseParts[0];
                          baseFolders = baseParts.slice(1);
                        } else {
                          baseFolders = baseParts;
                        }
                      }

                      rootName = rootFolder?.name || '블로그';
                      const subPath = targetPath;
                      const subSegments = subPath.replace(/\\/g, '/').split('/').filter(Boolean);
                      if (subSegments.length > 0) {
                        fileName = subSegments[subSegments.length - 1];
                        folders = subSegments.slice(0, subSegments.length - 1);
                      }
                    } else if (workspaceType === 'cloud') {
                      rootDrive = 'Cloud:';
                      const cloudName = rootFolder?.type === 'GDRIVE' ? 'Google Drive' : 'Cloud';
                      rootName = rootFolder?.displayName || rootFolder?.name || `[${cloudName}]`;
                      const subPath = targetPath;
                      const subSegments = subPath.replace(/\\/g, '/').split('/').filter(Boolean);
                      if (subSegments.length > 0) {
                        fileName = subSegments[subSegments.length - 1];
                        folders = subSegments.slice(0, subSegments.length - 1);
                      }
                    } else {
                      rootDrive = driveLetter || 'C:';
                      rootName = rootFolder?.name || 'Workspace';
                      fileName = currentFileName || '새 문서.md';
                    }

                    // 전체 절대경로 문자열 생성
                    const allParts = [rootDrive, ...baseFolders, rootName, ...folders, fileName].filter(Boolean);
                    const fullAbsolutePath = allParts.join('\\').replace(/\\\\+/g, '\\');

                    return (
                      <div
                        className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/90 dark:bg-zinc-900 text-[11px] font-bold text-slate-900 dark:text-zinc-100 overflow-x-auto no-scrollbar gap-2 select-none shadow-2xs z-10"
                        title={`절대경로: ${fullAbsolutePath}`}
                      >
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {/* 드라이브 루트 (존재할 경우) */}
                          {rootDrive && (
                            <>
                              <span className="flex items-center gap-1 shrink-0 text-slate-800 dark:text-zinc-300 font-bold bg-slate-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-300/60 dark:border-zinc-700">
                                <Icon name="HardDrive" size={12} className="text-slate-600 dark:text-zinc-400 shrink-0" />
                                <span>{rootDrive}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </>
                          )}

                          {/* 상위 기본 폴더들 (웹 베이스 경로 등) */}
                          {baseFolders.map((bFolder, idx) => (
                            <React.Fragment key={`base-${idx}`}>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-800 dark:text-zinc-200 font-bold">
                                <Icon name="FolderOpen" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{bFolder}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </React.Fragment>
                          ))}

                          {/* 워크스페이스 루트 폴더 */}
                          {rootName && (
                            <>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-900 dark:text-white font-bold">
                                <Icon name="FolderOpen" size={14} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{rootName}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </>
                          )}

                          {/* 하위 폴더들 */}
                          {folders.map((folder, idx) => (
                            <React.Fragment key={`folder-${idx}`}>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-900 dark:text-white font-bold">
                                <Icon name="FolderOpen" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{folder}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </React.Fragment>
                          ))}

                          {/* 현재 활성 파일명 */}
                          <span className="flex items-center gap-1.5 shrink-0 font-bold text-slate-950 dark:text-white bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-xs">
                            <Icon name="Document" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                            <span className="truncate max-w-[350px]">{fileName}</span>
                          </span>
                        </div>

                        {/* 우측 퀵 액션 버튼들 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 웹 브라우저 전용: 실제 상위 절대경로 설정 버튼 */}
                          {workspaceType === 'browser' && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = localStorage.getItem('onrivi_web_base_path') || '';
                                const input = window.prompt(
                                  "웹 브라우저는 보안상 상위 폴더 경로(드라이브 명 등)를 노출하지 않습니다.\n실제 로컬 컴퓨터 상위 절대경로를 입력하시면 정확히 일치되어 표시됩니다:\n(예: E:\\ZZ 개인자료)",
                                  current || (rootDrive && baseFolders.length ? `${rootDrive}\\${baseFolders.join('\\')}` : "E:\\ZZ 개인자료")
                                );
                                if (input !== null) {
                                  const trimmed = input.trim();
                                  localStorage.setItem('onrivi_web_base_path', trimmed);
                                  setWebBasePath(trimmed);
                                  showToast(trimmed ? `기준 절대경로가 설정되었습니다:\n${trimmed}` : "기준 절대경로가 초기화되었습니다.", "success");
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-normal border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                              title="웹 환경 상위 절대경로(드라이브/폴더) 설정"
                            >
                              <Icon name="Settings" size={11} />
                              <span className="hidden md:inline">상위경로 설정</span>
                            </button>
                          )}

                          {/* 절대경로 클립보드 복사 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(fullAbsolutePath);
                                showToast(`절대경로가 복사되었습니다:\n${fullAbsolutePath}`, 'success');
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-normal border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                            title="절대경로 복사"
                          >
                            <Icon name="Copy" size={11} />
                            <span className="hidden sm:inline">경로 복사</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {showEmbeddedWelcome ? (
                <div className="flex-1 overflow-y-auto bg-zinc-100">
                  <div className="max-w-4xl mx-auto py-8 px-4">
                    <MarkdownViewer
                      content={getWelcomeContent()}
                      originalContent={getWelcomeContent()}
                      lineMap={[]}
                      onFileOpen={handleFileOpenByPath}
                      rootFolderPath={rootFolder?.name}
                      rootFolder={rootFolder}
                      resourceFolderHandle={resourceFolderHandle}
                      resourceFolder={resourceFolder}

                      workspaceType={workspaceType}
                    />
                  </div>
                </div>
              ) : (
                // 💡 [지능형 빈 페이지 가드] 열려있는 탭이 아예 없을 때 에디터 및 미리보기를 회색 차단 영역으로 렌더링
                tabs.length === 0 || !activeTab ? (
                  <div className="flex-grow flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-900 text-center gap-4 transition-all duration-300 p-8 select-none">
                    <div className="p-4 bg-zinc-300/60 dark:bg-zinc-800/85 rounded-full text-zinc-500 dark:text-zinc-400 shadow-sm">
                      <Icon name="Lock" size={32} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                        열린 문서가 없습니다
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold max-w-sm leading-relaxed">
                        현재 열린 마크다운 문서가 없습니다.
                        <br />
                        좌측 파일 탐색기에서 마크다운(.md) 파일을 선택하여 문서를 열어주세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 overflow-hidden relative">



                    <div
                      id="onrivi-markdown-pane"
                      className={`flex-1 min-w-0 relative no-print bg-[#eef2f6] dark:bg-[#0b1120] pl-7 pr-4 sm:pl-9 sm:pr-6 ${
                        previewMode === 'both' ? 'border-l-2 border-slate-300 dark:border-slate-700 shadow-[inset_4px_0_12px_rgba(15,23,42,0.06)]' : ''
                      } ${editorHighContrast ? 'editor-high-contrast' : ''} editor-weight-${editorFontWeight}`}
                      style={{
                        order: 1,
                        width: previewMode === 'both' ? '50%' : '100%',
                        flexBasis: previewMode === 'both' ? '50%' : '100%',
                        display: (previewMode === 'preview' || activeTab?.isStyleTab === true) ? 'none' : 'block'
                      }}
                    >
                      <Editor
                        height="100%"
                        loading={
                          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                            <p>편집기를 불러오는 중입니다.</p>
                            <p className="text-sm text-slate-500">오래 걸리면 미리보기로 전환해 문서를 확인할 수 있습니다.</p>
                            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setPreviewMode('preview')}>
                              미리보기로 전환
                            </button>
                          </div>
                        }
                        language="markdown"
                        theme={themePalette}
                        // 💡 value={content} 속성을 배제하고 defaultValue를 적용하여
                        // React 상태 갱신 시 모나코 내부의 불필요한 setValue 호출로 인한 한글 composition 깨짐 및 중복 입력을 원천 방어합니다.
                        defaultValue={content}
                        // 콘텐츠 상태 갱신은 각 Monaco 모델의 onDidChangeContent 리스너가
                        // 단일하게 담당합니다. 여기서도 updateContent를 호출하면 입력 한 번에
                        // 즉시 갱신과 100ms 지연 갱신이 모두 발생해 미리보기가 두 번 리렌더링됩니다.
                        beforeMount={(monaco) => {
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
                                'editor.background': isDark ? '#0b1120' : '#eef2f6', // 🎯 문서 보기(#ffffff)와 경계가 구분되는 슬레이트 배경색
                                'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
                                'editor.foreground': activeFg, // 🎯 사용자 명세: 다크 #e2e8f0 (고대비 모드 시 순수 흑백)
                                'editorLineNumber.foreground': isDark ? '#475569' : '#64748b', // 선명한 줄번호
                                'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB', // 활성 행 줄번호 강조
                                'editorCursor.foreground': isDark ? '#38bdf8' : '#1d4ed8', // 🎯 고대비 커서 시인성 강화 (다크: 네온 스카이블루 #38bdf8 / 라이트: 코발트 블루 #1d4ed8)
                                'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
                                'editorIndentGuide.background': '#88888815',
                                'editorIndentGuide.activeBackground': '#88888830',
                              }
                            });
                          });
                        }}
                        onMount={handleMount}
                        options={{
                          readOnly: tabs.length === 0 || isRestrictedUser || previewMode === 'both',
                          domReadOnly: tabs.length === 0 || isRestrictedUser || previewMode === 'both',
                          padding: { top: 28, bottom: 28 },
                          scrollBeyondLastLine: false, // 마지막 줄 아래 과도한 여백 제거
                          glyphMargin: false, // 글리프 좌측 여백 제거
                          folding: false,
                          lineNumbersMinChars: 0,
                          lineDecorationsWidth: 8,
                          automaticLayout: true,
                          fontSize: fontSize || 16,
                          fontWeight: editorFontWeight === 'bold' ? '700' : editorFontWeight === 'semibold' ? '600' : editorFontWeight === 'medium' ? '500' : '400',
                          lineHeight: Math.round((fontSize || 16) * 1.75), // 글자 크기에 비례하는 동일 행간
                          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
                          fontLigatures: true, // 기호 연산자 리가처(->, != 등) 활성화
                          letterSpacing: 0,
                          // 🎯 커서 항상 가시성 보장 (단독/분할 모드 공통)
                          cursorBlinking: 'solid',
                          cursorSmoothCaretAnimation: 'off',
                          cursorStyle: 'line',
                          cursorWidth: 5,
                          'semanticHighlighting.enabled': true,
                          wordWrap: wordWrap || 'on',
                          wrappingStrategy: 'advanced',
                          wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
                          wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',
                          lineNumbers: 'off',
                          minimap: { enabled: false },
                          autoClosingBrackets: autoClosingBrackets ? 'languageDefined' : 'never',
                          scrollbar: { vertical: previewMode==='both'?'hidden':'visible', horizontal: previewMode==='both'?'hidden':'visible', handleMouseWheel:previewMode!=='both', verticalScrollbarSize: 16, horizontalScrollbarSize: 10 },
                          // 슬래시(/) 입력 시에만 자동완성 트리거 (일반 타이핑 시 팝업 방지)
                          quickSuggestions: false,
                          suggestOnTriggerCharacters: true,
                          // Enter/Tab 수락은 커스텀 핸들러에서 처리 (리스트 자동완성과 충돌 방지)
                          acceptSuggestionOnEnter: 'on',
                          tabCompletion: 'on',
                          fixedOverflowWidgets: true,
                          renderValidationDecorations: 'on',
                          matchBrackets: 'always',
                          wordBasedSuggestions: "off",
                          renderLineHighlight: 'all',
                          // 💡 마크다운 들여쓰기 규격 준수를 위해 4칸 강제 고정
                          tabSize: editorTabSize,
                          detectIndentation: false,
                          insertSpaces: true,
                          autoIndent: 'none',
                          links: false
                        }}
                      />

                      {floatingToolbar.visible && (() => {
                        const editorDom = editorRef.current?.getContainerDomNode();
                        let fixedTop = floatingToolbar.top;
                        let fixedLeft = floatingToolbar.left;
                        if (editorDom && !visualFloatingOriginRef.current) {
                          const rect = editorDom.getBoundingClientRect();
                          fixedTop += rect.top;
                          fixedLeft += rect.left;

                          // 💡 [플로팅 툴바 우측/상단 화면 이탈 방지 클램핑]
                          const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
                          const maxRight = winWidth - 68; // 우측 고정 사이드바 툴바(약 56px) 및 여백 고려
                          const toolbarWidth = floatingToolbarRef.current?.offsetWidth || 1200;
                          if (fixedLeft + toolbarWidth > maxRight) {
                            fixedLeft = maxRight - toolbarWidth;
                          }
                          fixedLeft = Math.max(16, fixedLeft);
                          fixedTop = Math.max(65, fixedTop);
                        }
                        if (visualFloatingOriginRef.current) {
                          const width = Math.min(floatingToolbarRef.current?.offsetWidth || 1200, window.innerWidth - 80);
                          fixedLeft = Math.max(16, Math.min(fixedLeft, window.innerWidth - 68 - width));
                          fixedTop = Math.max(65, fixedTop);
                        }

                        // 💡 플로팅 툴바가 화면 하단(상태바 부근)에 있을 때 드롭다운 상향(DropUp) 자동 반전 계산 (드롭다운 높이 ~240px)
                        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
                        const isDropUp = (winHeight - Math.max(fixedTop, 60)) < 260;

                        const handleDragStart = (dragEvent: React.MouseEvent) => {
                          const target = dragEvent.target as HTMLElement;
                          if (target.closest('button') || target.closest('input')) {
                            return;
                          }
                          dragEvent.preventDefault();
                          const startX = dragEvent.clientX;
                          const startY = dragEvent.clientY;
                          const startLeft = floatingToolbar.left;
                          const startTop = floatingToolbar.top;

                          const handleDragMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaY = moveEvent.clientY - startY;
                            setFloatingToolbar(prev => ({
                              ...prev,
                              left: startLeft + deltaX,
                              top: startTop + deltaY
                            }));
                          };

                          const handleDragEnd = () => {
                            document.removeEventListener('mousemove', handleDragMove);
                            document.removeEventListener('mouseup', handleDragEnd);
                          };

                          document.addEventListener('mousemove', handleDragMove);
                          document.addEventListener('mouseup', handleDragEnd);
                        };

                        return createPortal(
                          <div
                            ref={floatingToolbarRef}
                            id="floating-toolbar"
                            tabIndex={-1}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              const buttons = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
                              const activeEl = document.activeElement as HTMLButtonElement;
                              const currentIndex = buttons.indexOf(activeEl);
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                const nextIndex = currentIndex === -1
                                  ? (e.shiftKey ? buttons.length - 1 : 0)
                                  : (e.shiftKey ? (currentIndex - 1 + buttons.length) % buttons.length : (currentIndex + 1) % buttons.length);
                                buttons[nextIndex]?.focus();
                              } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
                                buttons[nextIndex]?.focus();
                              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                e.preventDefault();
                                const prevIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length;
                                buttons[prevIndex]?.focus();
                              } else if (e.key === 'Enter' || e.key === ' ') {
                                if (activeEl && buttons.includes(activeEl)) {
                                  e.preventDefault();
                                  activeEl.click();
                                }
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setFloatingToolbar(prev => ({ ...prev, visible: false }));
                                if (!visualFloatingOriginRef.current || !visualCommandRef.current?.('FOCUS')) editorRef.current?.focus();
                              }
                            }}
                            className="no-print fixed z-[99999] flex items-center bg-white dark:bg-zinc-800 shadow-2xl shadow-black/20 rounded-2xl border border-black/10 dark:border-white/10 px-3.5 py-1.5 gap-1.5 animate-in fade-in zoom-in-95 duration-100 focus:outline-none cursor-move select-none max-w-[calc(100vw-80px)] overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
                            style={{ top: Math.max(fixedTop, 60), left: fixedLeft, transform: 'translateY(-100%)' }}
                            onMouseDown={handleDragStart}
                          >
                            {(() => {
                              const model = editorRef.current?.getModel();
                              const pos = editorRef.current?.getPosition();
                              const curLine = (model && pos) ? model.getLineContent(pos.lineNumber) : '';
                              const isInTable = !visualFloatingOriginRef.current && curLine.trim().startsWith('|') && (curLine.match(/\|/g) || []).length >= 2;

                              return (
                                <div className="flex flex-row items-center gap-3.5 min-w-max">
                                  {/* 서식 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" data-floating-bold tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('BOLD'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-black cursor-pointer" title="굵게 (Enter)">B</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('ITALIC'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] italic font-serif cursor-pointer" title="기울임 (Enter)">I</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('INLINE_CODE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="인라인 코드 (Enter)">
                                      <img src="/icons/Password.png" alt="인라인 코드" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('UNDERLINE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] underline font-bold cursor-pointer" title="밑줄 (Enter)">U</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('STRIKETHROUGH'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold cursor-pointer" title="취소선 (Enter)"><span className="line-through">S</span></button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 제목 */}
                                  <div className="flex flex-row items-center gap-1">
                                    <div className="flex items-center border border-emerald-600/30 dark:border-emerald-500/40 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 py-0.5 px-1.5 gap-1.5 text-emerald-800 dark:text-emerald-300">
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const next = Math.max(1, floatingHeadingLevel - 1);
                                          setFloatingHeadingLevel(next);
                                          executeFloatingItem(() => dispatchCommand(`H${next}`));
                                        }}
                                        disabled={floatingHeadingLevel === 1}
                                        className="w-6 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                        title="제목 크기 키우기 및 즉시 적용 (Enter)"
                                      >▲</button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => executeFloatingItem(() => dispatchCommand(`H${floatingHeadingLevel}`))}
                                        className="w-8 h-7 flex items-center justify-center font-extrabold text-[13px] hover:bg-black/10 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded shrink-0 cursor-pointer"
                                        title={`제목 ${floatingHeadingLevel} 적용 (Enter)`}
                                      >H{floatingHeadingLevel}</button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const next = Math.min(6, floatingHeadingLevel + 1);
                                          setFloatingHeadingLevel(next);
                                          executeFloatingItem(() => dispatchCommand(`H${next}`));
                                        }}
                                        disabled={floatingHeadingLevel === 6}
                                        className="w-6 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                        title="제목 크기 줄이기 및 즉시 적용 (Enter)"
                                      >▼</button>
                                    </div>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 문단 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('HR'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold cursor-pointer" title="구분선 (Enter)">—</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('ORDERED_LIST'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="숫자 목록 (Enter)">
                                      <img src="/icons/ListNumbers.png" alt="숫자 목록" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LIST'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="글머리 기호 (Enter)">
                                      <img src="/icons/ListBullets.png" alt="글머리 기호" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <div id="floating-quote-dropdown-container" className="relative inline-flex items-center rounded-lg border border-zinc-400 dark:border-zinc-600 bg-white/70 dark:bg-zinc-800/70">
                                      <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => { dispatchCommand('QUOTE'); setFloatingQuoteDropdown(prev => ({ ...prev, open: false })); })} className="w-8 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-l-lg transition-all flex items-center justify-center cursor-pointer" title="인용구 (기본) (Enter)">
                                        <img src="/icons/WechatLogo.png" alt="인용구" className="w-5 h-5 object-contain dark:invert" />
                                      </button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          executeFloatingItem(() => dispatchCommand('QUOTE'));
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const winH = window.innerHeight;
                                          const spaceBelow = winH - rect.bottom;
                                          const dropUp = spaceBelow < 210;
                                          setFloatingQuoteDropdown(prev => ({
                                            open: !prev.open,
                                            x: rect.left,
                                            y: dropUp ? rect.top : rect.bottom,
                                            dropUp,
                                          }));
                                        }}
                                        className="w-4 h-9 hover:bg-black/10 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-r-lg transition-all flex items-center justify-center text-[8px] text-zinc-700 dark:text-zinc-200 font-bold cursor-pointer"
                                        title="인용구 적용 및 Alert 태그 선택 (Enter)"
                                      >▼</button>
                                    </div>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CHECK'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="체크리스트 (Enter)">
                                      <img src="/icons/ListChecks.png" alt="체크리스트" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('REMOVE_PREFIX'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="태그 취소 (Enter)">
                                      <img src="/icons/Eraser.png" alt="태그 취소" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CLEAN_DOC'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="문서 서식 일괄 정리 (Enter)">
                                      <img src="/icons/MagicWand.png" alt="문서 서식 일괄 정리" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 삽입 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LINK'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="링크 (Enter)">
                                      <img src="/icons/Link.png" alt="링크" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('DOCLINK'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="문서 연결 (Enter)">
                                      <img src="/icons/BookBookmark.png" alt="문서 연결" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CITE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="인용(참조문헌) (Enter)">
                                      <Icon name="NewspaperClipping" size={20} className="text-zinc-800 dark:text-zinc-100" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('FOOTNOTE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[14px] font-black font-serif cursor-pointer" title="각주 (Enter)">fn</button>
                                    <div className="w-px h-5 mx-0.5 bg-black/15 dark:bg-white/15 shrink-0" />
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('IMAGE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="이미지 (Enter)">
                                      <img src="/icons/Farm.png" alt="이미지" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('YOUTUBE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="동영상삽입 (Enter)">
                                      <img src="/icons/FilmReel.png" alt="동영상삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={0}
                                      id="datetime-format-trigger"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        executeFloatingItem(() => dispatchCommand('NOW'));
                                      }}
                                      onClick={() => executeFloatingItem(() => dispatchCommand('NOW'))}
                                      className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                      title="달력 및 날짜/시간 삽입 (Enter)"
                                    >
                                      <img src="/icons/Calendar.png" alt="달력 및 날짜/시간 삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={0}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        executeFloatingItem(() => dispatchCommand('SIGNATURE'));
                                      }}
                                      onClick={() => executeFloatingItem(() => dispatchCommand('SIGNATURE'))}
                                      className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-zinc-800 dark:text-zinc-100 cursor-pointer"
                                      title="서명/발신인 (왼쪽 정렬) (Ctrl+Alt+R) (Enter)"
                                    >
                                      <Icon name="Signature" size={19} className="text-zinc-800 dark:text-zinc-100" />
                                    </button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 고급 및 표 열 정렬 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('MAP'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="지도 삽입 (Enter)">
                                      <img src="/icons/MapTrifold.png" alt="지도 삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('TABLE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="표 생성 (Enter)">
                                      <img src="/icons/Table.png" alt="표 생성" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    {isInTable && (
                                      <>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('left');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('left');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 왼쪽 정렬 (Alt+Shift+L) (Enter)"
                                        >
                                          ⇤
                                        </button>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('center');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('center');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 가운데 정렬 (Alt+Shift+C) (Enter)"
                                        >
                                          ↔
                                        </button>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('right');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('right');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 오른쪽 정렬 (Alt+Shift+R) (Enter)"
                                        >
                                          ⇥
                                        </button>
                                      </>
                                    )}
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CODE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center" title="코드 블록 (Enter)">
                                      <img src="/icons/FileCode.png" alt="코드 블록" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LATEX'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center" title="수식(LaTeX) (Enter)">
                                      <img src="/icons/PlusMinus.png" alt="수식(LaTeX)" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        , document.body)
                      })()}
                    </div>

                    {showDocLinkPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onMouseDown={closeDocLinkPicker}
                        />
                        <div
                          className="fixed z-[9999] bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-xl shadow-2xl p-2.5 w-[420px] max-w-[95vw] max-h-[440px] flex flex-col"
                          style={docLinkPickerStyle}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              closeDocLinkPicker();
                            }
                          }}
                        >
                          {!selectedDocNode ? (
                            <>
                              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700 mb-2 flex items-center justify-between">
                                <span className="font-bold">다른 문서 연결 (Doc Link)</span>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    closeDocLinkPicker();
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold px-1 rounded cursor-pointer"
                                  title="닫기 (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="px-2 mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                                    링크명 (앞의 표시할 텍스트)
                                  </label>
                                  {docLinkCustomTitle && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[200px]">
                                      [{docLinkCustomTitle}]
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder="비워두면 확장자를 뺀 문서명이 표시됩니다"
                                  value={docLinkCustomTitle}
                                  onChange={(e) => {
                                    setDocLinkCustomTitle(e.target.value);
                                    setIsDocLinkTitleManuallyEdited(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-slate-300 dark:border-zinc-600 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="px-2 mb-2">
                                <input
                                  type="text"
                                  placeholder="파일 검색..."
                                  value={docLinkSearchText}
                                  onChange={(e) => setDocLinkSearchText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12.5px] border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                {isDocLinkLoading ? (
                                  <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                    문서 목록 로딩 중...
                                  </div>
                                ) : (() => {
                                  const registeredDocs = (() => {
                                    try {
                                      return JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
                                    } catch { return []; }
                                  })();

                                  const query = (docLinkSearchText || '').normalize('NFC').trim().toLowerCase();

                                  const filtered = allMdFiles.filter(f => {
                                    if (!query) return true;
                                    const nameNorm = (f.name || '').normalize('NFC').toLowerCase();
                                    const pathNorm = (f.path || '').normalize('NFC').toLowerCase();
                                    const titleNorm = ((f as any).title || '').normalize('NFC').toLowerCase();
                                    return nameNorm.includes(query) || pathNorm.includes(query) || titleNorm.includes(query);
                                  }).sort((a, b) => {
                                    const aKnow = (a as any).isKnowledge || registeredDocs.includes(a.path) || registeredDocs.includes(a.name);
                                    const bKnow = (b as any).isKnowledge || registeredDocs.includes(b.path) || registeredDocs.includes(b.name);
                                    if (aKnow && !bKnow) return -1;
                                    if (!aKnow && bKnow) return 1;
                                    return (a.name || '').localeCompare(b.name || '');
                                  });

                                  const deduplicated = (() => {
                                    const map = new Map<string, FileNode>();
                                    const currentNorm = (currentFileNode?.path || '').replace(/\\/g, '/').toLowerCase();
                                    const isCurrentInHelp = currentNorm.includes('docs/help/') || currentNorm.includes('/help/') || currentNorm.startsWith('help/');
                                    const excludedDirs = ['out', '.next', '.next-web-build', 'dist', 'build', 'release', 'node_modules', '_dev_api_backup', '.vscode', '.idea', 'scratch'];

                                    for (const f of filtered) {
                                      const currPath = (f.path || '').replace(/\\/g, '/').toLowerCase();
                                      const segments = currPath.split('/');
                                      if (segments.some(seg => excludedDirs.includes(seg))) {
                                        continue;
                                      }

                                      const isHelpFile = currPath.startsWith('docs/help/') || currPath.includes('/docs/help/') ||
                                                         currPath.startsWith('frontend/public/help/') || currPath.includes('/frontend/public/help/') ||
                                                         currPath.startsWith('public/help/') || currPath.includes('/public/help/') ||
                                                         /^(?:00_시작하기|help-\d+)/i.test(f.name || '');

                                      // 1) 일반 문서 작성 시 내부 도움말 파일 일체 노출 차단
                                      if (!isCurrentInHelp && isHelpFile) {
                                        continue;
                                      }

                                      // 2) 도움말 작성/연결 시 정적 웹 미러(public/help) 제외하고 정식 docs/help만 1개 유지
                                      if (isCurrentInHelp && (currPath.includes('/public/help/') || currPath.startsWith('public/help/'))) {
                                        continue;
                                      }

                                      const key = currPath.normalize('NFC');
                                      if (!map.has(key)) {
                                        map.set(key, f);
                                      } else {
                                        const prev = map.get(key)!;
                                        const prevPath = (prev.path || '').replace(/\\/g, '/').toLowerCase();
                                        const prevHasFullPath = prevPath.includes('/') && prevPath !== key;
                                        const currHasFullPath = currPath.includes('/') && currPath !== key;
                                        if (!prevHasFullPath && currHasFullPath) {
                                          map.set(key, f);
                                        }
                                      }
                                    }
                                    return Array.from(map.values());
                                  })();

                                  if (deduplicated.length === 0) {
                                    return (
                                      <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                        검색 결과가 없습니다.
                                      </div>
                                    );
                                  }
                                  return deduplicated.map((node) => {
                                    const isKnowledge = (node as any).isKnowledge || registeredDocs.includes(node.path) || registeredDocs.includes(node.name);
                                    const displayTitle = (node as any).title && (node as any).title !== node.name
                                      ? `${(node as any).title} (${node.name})`
                                      : node.name;
                                    const rowTarget = buildDocLinkTarget(node);
                                    const rowLabel = docLinkCustomTitle.trim() || getDocLinkDefaultLabel(node);
                                    return (
                                      <div
                                        key={node.path || node.name}
                                        role="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleDocFileClick(node);
                                        }}
                                        title={`${node.path || node.name}\n클릭: 헤딩 선택 · [연결]: 문서로 바로 연결`}
                                        className={`w-full text-left px-2.5 py-2 text-[12.5px] rounded-lg flex flex-col transition-colors mb-1 cursor-pointer ${
                                          isKnowledge
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30'
                                            : 'hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="font-semibold text-slate-800 dark:text-zinc-100 break-all whitespace-normal leading-snug">
                                            {displayTitle}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {isKnowledge && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1d4ed8] text-white font-bold">
                                                📗 지식 문서
                                              </span>
                                            )}
                                            <button
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDocLinkSelect(node, undefined, docLinkCustomTitle);
                                              }}
                                              className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                                              title={`[${rowLabel}](<${rowTarget}>) 삽입`}
                                            >
                                              연결
                                            </button>
                                          </div>
                                        </div>
                                        <span className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold font-mono break-all whitespace-normal leading-tight mt-0.5">{node.path}</span>
                                        <span className="text-[10.5px] text-blue-700 dark:text-blue-300 font-mono break-all whitespace-normal leading-tight mt-0.5">
                                          [{rowLabel}](&lt;{rowTarget}&gt;)
                                        </span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedDocNode(null);
                                      setDocHeadings([]);
                                      setDocHeadingSearchText('');
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold cursor-pointer"
                                  >
                                    ← 이전으로
                                  </button>
                                  <span className="font-bold">헤딩(제목) 연결 선택</span>
                                </div>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    closeDocLinkPicker();
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold px-1 rounded cursor-pointer"
                                  title="닫기 (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="px-2 mb-2 bg-blue-50/50 dark:bg-zinc-900/60 p-2 rounded-lg border border-blue-200/60 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                                    링크명 (앞의 표시할 텍스트 수정)
                                  </label>
                                  {docLinkCustomTitle && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[180px]">
                                      [{docLinkCustomTitle}]
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="비워두면 확장자를 뺀 문서명이 표시됩니다"
                                    value={docLinkCustomTitle}
                                    onChange={(e) => {
                                      setDocLinkCustomTitle(e.target.value);
                                      setIsDocLinkTitleManuallyEdited(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        closeDocLinkPicker();
                                      } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                      }
                                    }}
                                    className="flex-1 px-2.5 py-1 text-[12px] border border-slate-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                                  />
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                    }}
                                    className="px-2.5 py-1 text-[11.5px] font-bold bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-md shrink-0 cursor-pointer shadow-xs"
                                    title="문서 자체를 현재 링크명으로 바로 삽입"
                                  >
                                    문서 연결
                                  </button>
                                </div>
                                <div className="mt-1.5 text-[10.5px] font-mono text-blue-700 dark:text-blue-300 break-all leading-tight">
                                  {(() => {
                                    const t = buildDocLinkTarget(selectedDocNode);
                                    return `[${docLinkCustomTitle.trim() || getDocLinkDefaultLabel(selectedDocNode)}](<${t}>)`;
                                  })()}
                                </div>
                              </div>
                              <div className="px-2 mb-2">
                                <input
                                  type="text"
                                  placeholder="헤딩 검색..."
                                  value={docHeadingSearchText}
                                  onChange={(e) => setDocHeadingSearchText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12.5px] border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                {isHeadingLoading ? (
                                  <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                    헤딩 분석 중...
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                      }}
                                      className="w-full text-left px-2.5 py-2 text-[12.5px] text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors mb-1 font-semibold cursor-pointer"
                                    >
                                      📂 [문서 자체를 바로 연결]
                                    </button>
                                    {(() => {
                                      const hQuery = (docHeadingSearchText || '').normalize('NFC').trim().toLowerCase();
                                      const filteredHeadings = docHeadings.filter(h =>
                                        !hQuery || h.normalize('NFC').toLowerCase().includes(hQuery)
                                      );
                                      if (filteredHeadings.length === 0) {
                                        return (
                                          <div className="px-2 py-2 text-[11px] text-slate-400 dark:text-zinc-500 text-center">
                                            문서 내에 감지된 헤딩이 없거나 검색 결과가 없습니다.
                                          </div>
                                        );
                                      }
                                      return filteredHeadings.map((h, i) => (
                                        <button
                                          key={i}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleDocLinkSelect(selectedDocNode, h, docLinkCustomTitle);
                                          }}
                                          title={h}
                                          className="w-full text-left px-2.5 py-2 text-[12.5px] hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-slate-700 dark:text-zinc-200 flex items-start gap-1.5 cursor-pointer"
                                        >
                                          <span className="text-blue-500 font-bold shrink-0">#</span>
                                          <span className="break-all whitespace-normal leading-snug">{h}</span>
                                        </button>
                                      ));
                                    })()}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div
                      className="flex-1 flex flex-col bg-surface-container-low text-on-surface overflow-hidden print:overflow-visible relative"
                      style={{
                        order: 0,
                        width: previewMode === 'preview' ? '100%' : '50%',
                        flexBasis: previewMode === 'preview' ? '100%' : '50%',
                        display: (previewMode === 'edit' || activeTab?.isStyleTab === true) ? 'none' : 'flex'
                      }}
                    >


                      {/* 🛠️ 미리보기 전용 컨트롤 툴바 (찾기, 바꾸기, 축소, 100% 리셋, 확대, 클립보드 복사) */}
                      <PreviewToolbar
                        zoomScale={previewZoomScale}
                        onZoomIn={() => setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10))}
                        onZoomOut={() => setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        onZoomReset={() => setPreviewZoomScale(1.0)}
                        onToggleFind={() => {
                          if (isPreviewFindOpen && !previewFindReplaceMode) {
                            setIsPreviewFindOpen(false);
                          } else {
                            setPreviewFindReplaceMode(false);
                            setIsPreviewFindOpen(true);
                          }
                        }}
                        isFindOpen={isPreviewFindOpen && !previewFindReplaceMode}
                        onToggleReplace={() => {
                          if (isPreviewFindOpen && previewFindReplaceMode) {
                            setIsPreviewFindOpen(false);
                          } else {
                            setPreviewFindReplaceMode(true);
                            setDirectEditEnabled(true);
                            setIsPreviewFindOpen(true);
                          }
                        }}
                        isReplaceOpen={isPreviewFindOpen && previewFindReplaceMode}
                        onCopyPreview={handleCopyPreviewContent}
                        onCopyMarkdown={handlers.copyAll}
                      />

                      {/* 🔍 미리보기 텍스트 검색 및 탐색 위젯 */}
                      <PreviewFindWidget
                        previewContainerRef={previewRef}
                        isOpen={isPreviewFindOpen}
                        replaceMode={previewFindReplaceMode}
                        replaceEnabled={!isRestrictedUser && !!activeTabId && currentFileName !== '도움말.md'}
                        documentKey={activeTabId}
                        onClose={() => setIsPreviewFindOpen(false)}
                      />

                      {/* 🔍 스크롤 가능한 실제 본문 컨테이너 */}
                      <div
                        ref={bindPreviewScrollContainer}
                        className={`flex-1 print:h-auto print:overflow-visible prose prose-sm md:prose-base max-w-none break-words custom-preview-container onrivi-preview-container text-on-surface ${
                          previewMode === 'preview'
                            ? 'bg-surface-container-high p-4 pb-48 overflow-y-auto'
                            : 'bg-surface-container-low px-2 sm:px-4 pt-1 pb-48 overflow-y-auto overflow-x-hidden'
                        }`}
                        style={{scrollbarWidth:'auto',scrollbarGutter:'stable',overflowY:'scroll'}}
                        onMouseEnter={() => { isPreviewHovered.current = true; }}
                        onMouseLeave={() => { isPreviewHovered.current = false; }}
                        onDragOver={(e) => {
                          if (e.dataTransfer?.types?.some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const dt = e.dataTransfer;
                          if (!dt) return;

                          // 1) parseDroppedDataToBlob 정규화 엔진 우선 실행 (OS 파일, DataTransfer items, Base64 Data URL, Web SVG, 구글/웹 이미지 등)
                          const parsed = parseDroppedDataToBlob(dt);
                          if (parsed) {
                            if (parsed.file) {
                              await handlePasteImageFile(parsed.file, (savedPath) => {
                                if (visualCommandRef.current) {
                                  visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                } else {
                                  insertImageMarkdown(savedPath);
                                }
                              });
                              return;
                            } else if (parsed.webUrl) {
                              let fetchedFile: File | null = null;
                              try {
                                fetchedFile = await fetchExternalImageFile(parsed.webUrl, parsed.name);
                              } catch (_) {}

                              if (fetchedFile) {
                                await handlePasteImageFile(fetchedFile, (savedPath) => {
                                  if (visualCommandRef.current) {
                                    visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                  } else {
                                    insertImageMarkdown(savedPath);
                                  }
                                });
                                return;
                              }

                              // 다운로드 실패 시(CORS 제약 등)에도 웹 이미지 링크 직접 안전 삽입
                              if (visualCommandRef.current) {
                                visualCommandRef.current(`INSERT_SAVED_IMAGE:${parsed.webUrl}`);
                              } else {
                                insertAtCursor(`\n![](${parsed.webUrl})\n`);
                                if (editorRef.current) {
                                  updateContent(editorRef.current.getValue(), true);
                                  editorRef.current.focus();
                                }
                              }
                              return;
                            }
                          }

                          // 2) OS 다중 파일 드롭 처리
                          const files = dt.files ? Array.from(dt.files) : [];
                          const imageFiles = files.filter(isImageLikeFile);
                          if (imageFiles.length > 0) {
                            for (const imgFile of imageFiles) {
                              await handlePasteImageFile(imgFile, (savedPath) => {
                                if (visualCommandRef.current) {
                                  visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                } else {
                                  insertImageMarkdown(savedPath);
                                }
                              });
                            }
                            return;
                          }

                          // 3) 외부 웹 이미지 URL (다운로드 및 리소스 폴더 저장)
                          const html = dt.getData('text/html');
                          const uriList = dt.getData('text/uri-list');
                          const plainText = dt.getData('text/plain');
                          let imgSrc = '';
                          if (html) {
                            const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                            if (match && match[1]) imgSrc = match[1];
                          }
                          if (!imgSrc && uriList) {
                            const firstUri = uriList.split(/[\r\n]+/).map(s => s.trim()).find(s => s && !s.startsWith('#'));
                            if (firstUri) imgSrc = firstUri;
                          }
                          if (!imgSrc && plainText) {
                            const trimmed = plainText.trim();
                            if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed)) {
                              imgSrc = trimmed;
                            }
                          }
                          if (imgSrc && !imgSrc.startsWith('data:image/')) {
                            if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                              try {
                                const resp = await fetch(imgSrc);
                                if (resp.ok) {
                                  const blob = await resp.blob();
                                  await handlePasteImageFile(blob, (savedPath) => {
                                    if (visualCommandRef.current) {
                                      visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                    } else {
                                      insertImageMarkdown(savedPath);
                                    }
                                  });
                                  return;
                                }
                              } catch (_) {}
                            }
                            if (visualCommandRef.current) {
                              visualCommandRef.current(`INSERT_SAVED_IMAGE:${imgSrc}`);
                            } else {
                              const markdownImg = `\n![](${imgSrc})\n`;
                              insertAtCursor(markdownImg);
                              if (editorRef.current) {
                                updateContent(editorRef.current.getValue(), true);
                                editorRef.current.focus();
                              }
                            }
                          }
                        }}
                        onScroll={(e) => {
                          if (previewModeRef.current === 'both' && e.currentTarget.querySelector('.book-page[data-line]')) {
                            if (!isPreviewHovered.current || isScrollingRef.current === 'editor') return;
                            const target=e.currentTarget,editor=editorRef.current;
                            if(!editor)return;
                            isScrollingRef.current='preview';
                            if(scrollTimeoutRef.current)clearTimeout(scrollTimeoutRef.current);
                            scrollTimeoutRef.current=setTimeout(()=>{isScrollingRef.current=null;},100);
                            const ratio=target.scrollTop/Math.max(1,target.scrollHeight-target.clientHeight);
                            editor.setScrollTop(ratio*Math.max(0,editor.getScrollHeight()-editor.getLayoutInfo().height));
                            return;
                          }
                          const target = e.target as HTMLElement;

                          // 💡 [요구사항 3 / SYNC-03] 미리보기 최상단(0점) 복귀 시 스크롤 락에 관계없이 에디터를 자석처럼 최상단 영점으로 복구
                          // 🛡️ [버그 예방 가드] 오직 사용자가 직접 미리보기를 마우스 호버하여 스크롤 중이거나, 에디터에 의한 연동 스크롤이 아닐 때만 동작
                          if (target.scrollTop === 0 && editorRef.current && isPreviewHovered.current && isScrollingRef.current !== 'editor') {
                            editorRef.current.setScrollTop(0);
                          }

                          // 💡 [요구사항 3 / SYNC-03] 미리보기 마우스 오버 상태일 때만 에디터로 스크롤 송신 허용 (관성 튕김 루프 원천 방쇄)
                          if (!isPreviewHovered.current || previewModeRef.current !== 'both' || !editorRef.current) return;
                            if (isScrollingRef.current === 'editor') return;

                          isScrollingRef.current = 'preview';
                          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                          scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 50);

                          const previewScrollTop = target.scrollTop;
                            const previewScrollHeight = target.scrollHeight;
                            const previewViewportHeight = target.clientHeight;
                            const previewMaxScroll = previewScrollHeight - previewViewportHeight;
                            
                            if (previewMaxScroll <= 0) return;
                            
                            const isAtBottom = previewScrollTop >= previewMaxScroll - 2;
                            const scrollRatio = isAtBottom ? 1 : Math.max(0, Math.min(1, previewScrollTop / previewMaxScroll));
                            const targetPreviewY = previewScrollTop + previewViewportHeight * scrollRatio;
                            
                            const elements = Array.from(target.querySelectorAll('[data-line]')) as HTMLElement[];
                            if (elements.length === 0) return;
                            
                            let elA: HTMLElement | null = null;
                            let elB: HTMLElement | null = null;
                            const containerRect = target.getBoundingClientRect();
                            
                            for (let i = 0; i < elements.length; i++) {
                              const rect = elements[i].getBoundingClientRect();
                              const elementTop = rect.top - containerRect.top + previewScrollTop;
                              if (elementTop > targetPreviewY) {
                                break;
                              }
                              elA = elements[i];
                            }
                            
                            if (elA && editorRef.current) {
                              const editor = editorRef.current;
                              const lineAStr = elA.getAttribute('data-line');
                              
                              if (lineAStr && typeof editor.getTopForLineNumber === 'function' && typeof editor.setScrollPosition === 'function') {
                                const lineA = parseInt(lineAStr, 10);
                                const indexA = elements.indexOf(elA);
                                for (let j = indexA + 1; j < elements.length; j++) {
                                  const nextEl = elements[j];
                                  const lineBStr = nextEl.getAttribute('data-line');
                                  if (lineBStr && parseInt(lineBStr, 10) > lineA) {
                                    elB = nextEl;
                                    break;
                                  }
                                }
                                
                                const viewportHeight = editor.getLayoutInfo().height || 800;
                                const scrollHeight = editor.getScrollHeight();
                                const editorMaxScroll = scrollHeight - viewportHeight;
                                
                                const topA = lineA === 1 ? 0 : editor.getTopForLineNumber(lineA);
                                const topB = elB ? editor.getTopForLineNumber(parseInt(elB.getAttribute('data-line')!, 10)) : scrollHeight;
                                
                                const previewTopA = elA.getBoundingClientRect().top - containerRect.top + previewScrollTop;
                                const previewTopB = elB ? (elB.getBoundingClientRect().top - containerRect.top + previewScrollTop) : previewScrollHeight;
                                
                                const previewRange = previewTopB - previewTopA;
                                const editorRange = topB - topA;
                                
                                let interpolatedEditorTop = topA;
                                if (previewRange > 0) {
                                  const progress = Math.max(0, Math.min(1, (targetPreviewY - previewTopA) / previewRange));
                                  interpolatedEditorTop = topA + progress * editorRange;
                                }
                                
                                let targetEditorScroll = interpolatedEditorTop - viewportHeight * scrollRatio;
                                targetEditorScroll = Math.max(0, Math.min(editorMaxScroll, targetEditorScroll));
                                
                                if (isAtBottom) {
                                  targetEditorScroll = editorMaxScroll;
                                }
                                
                                editor.setScrollPosition({ scrollTop: targetEditorScroll });
                                }
                              }
                        }}
                      >
                        {(() => {
                          const activeProfile = resolveEffectiveDocumentProfile(previewContent);
                          const isLandscape = activeProfile.pageStyle.orientation === 'landscape';
                          // A4 조판 가드가 켜져 있으면 편집+미리보기 모드라도 렌더링 규격은 미리보기 모드와 동일하게 취급
                          const isPreviewOnly = previewMode === 'preview' || isA4GuardEnabled;

                          const paperSizeKey = activeProfile.pageStyle.paperSize?.toLowerCase() || 'a4';
                          const ps = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.a4;
                          const paperWidth = isLandscape ? `${ps.height}mm` : `${ps.width}mm`;
                          const minHeight = isLandscape ? `${ps.width}mm` : `${ps.height}mm`;

                          const pTop = activeProfile.pageStyle.marginTop || '18mm';
                          const pBottom = activeProfile.pageStyle.marginBottom || '18mm';
                          const pLeft = activeProfile.pageStyle.marginLeft || '12mm';
                          const pRight = activeProfile.pageStyle.marginRight || '12mm';

                          const pageStyle: React.CSSProperties = {
                            boxSizing: 'border-box' as const,
                            maxWidth: '100%',
                            zoom: previewZoomScale,
                            ...(isPreviewOnly ? {
                              width: paperWidth,
                              minHeight: minHeight,
                              // zoom: previewZoomScale
                            } : {})
                          };

                          return (
                            <div
                              className={isPreviewOnly
                                ? "preview-page-sheet group relative mx-auto my-4 border border-purple-500/5 shadow-[0_16px_48px_rgba(15,0,109,0.04)] bg-white dark:bg-zinc-900 rounded-2xl origin-top overflow-hidden pb-12 max-w-full"
                                : `preview-page-sheet group relative mx-auto my-3 ${isLandscape ? 'max-w-6xl' : 'max-w-3xl'} w-full max-w-full bg-white dark:bg-zinc-900 border border-purple-500/5 shadow-[0_12px_42px_rgba(15,0,109,0.03)] rounded-2xl origin-top overflow-hidden pb-12`
                              }
                              style={pageStyle}
                            >
                              {/* 미리보기 복사 버튼 */}
                                <div className="hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!previewRef.current) return;
                                      
                                      const btn = e.currentTarget;
                                      const originalText = btn.innerHTML;
                                      
                                      try {
                                        const selection = window.getSelection();
                                        const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                                        
                                        const range = document.createRange();
                                        const targetEl = previewRef.current.querySelector('.markdown-viewer-root') || previewRef.current;
                                        
                                        // 이미지 blob URL을 base64로 임시 변환 (Electron fetch 차단 대비 캔버스 사용)
                                        const imgs = Array.from(targetEl.querySelectorAll('img'));
                                        const restoredImgs = [];
                                        for (const img of imgs) {
                                          const src = img.src;
                                          if (src && src.startsWith('blob:')) {
                                            try {
                                              if (img.complete && img.naturalWidth > 0) {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = img.naturalWidth;
                                                canvas.height = img.naturalHeight;
                                                const ctx = canvas.getContext('2d');
                                                if (ctx) {
                                                  ctx.drawImage(img, 0, 0);
                                                  img.dataset.originalSrc = src;
                                                  img.src = canvas.toDataURL('image/png');
                                                  restoredImgs.push(img);
                                                }
                                              }
                                            } catch (e) { console.error(e); }
                                          }
                                        }

                                        // 복사 버튼 훅 숨기기
                                          const hooks = Array.from(targetEl.querySelectorAll('.copy-button-hook'));
                                          const hookDisplays = hooks.map(h => h.style.display);
                                          hooks.forEach(h => h.style.display = 'none');
                                          
                                          range.selectNodeContents(targetEl);
                                          selection.removeAllRanges();
                                          selection.addRange(range);
                                          
                                          document.execCommand('copy');
                                          
                                          selection.removeAllRanges();
                                          if (originalRange) selection.addRange(originalRange);
                                          
                                          // 복사 버튼 훅 원상 복구
                                          hooks.forEach((h, i) => h.style.display = hookDisplays[i]);
                                        
                                        // 이미지 URL 원상 복구
                                        for (const img of restoredImgs) {
                                          if (img.dataset.originalSrc) {
                                            img.src = img.dataset.originalSrc;
                                            delete img.dataset.originalSrc;
                                          }
                                        }
                                        
                                        btn.innerHTML = '서식 복사 완료!';
                                        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                                      } catch (err) {
                                        console.error("서식 복사 실패:", err);
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 backdrop-blur-sm active:scale-95 transition-all"
                                    title="미리보기 결과 복사 (서식 포함)"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    복사
                                  </button>
                                </div>
                                {directEditEnabled && !isRestrictedUser && activeTabId && currentFileName !== '도움말.md' && !activeProfile.layout ? (
                                   <VisualDocumentEditor key={activeTabId} documentId={activeTabId} headingNumbering={activeProfile.headingNumbering} bibContent={bibContent} onCitation={()=>setIsCitationModalOpen(true)} onReferenceSettings={() => setIsReferenceModalOpen(true)} pageStyle={resolveEffectiveDocumentProfile(content).pageStyle} onPdfPagePreview={signal=>handlersRef.current.print(true,undefined,signal)} spellCheck={spellCheck} tabSize={editorTabSize} onToast={showToast} onStyleSettings={() => setIsStyleModalOpen(true)}
                                     onSourceScroll={offset => {
                                       const editor = editorRef.current;
                                       if (previewModeRef.current !== 'both' || !editor?.getModel() || isScrollingRef.current === 'editor') return;
                                       isScrollingRef.current = 'preview';
                                       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                       scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 150);
                                       const position = editor.getModel().getPositionAt(offset);
                                       const targetTop = Math.max(0, editor.getTopForLineNumber(position.lineNumber) - 30);
                                       editor.setScrollTop(targetTop);
                                     }}
                                     onSourceCursor={(offset, reveal = false) => {
                                       const editor = editorRef.current;
                                       if (typeof offset !== 'number' || offset < 0) return;
                                       const model = editor?.getModel();
                                       let line = 1;
                                       let column = 1;
                                       let pos: { lineNumber: number; column: number } | null = null;
                                       if (model && !model.isDisposed()) {
                                         pos = model.getPositionAt(offset);
                                         line = pos.lineNumber;
                                         column = pos.column;
                                       } else {
                                         const currentText = contentRef.current || content || '';
                                         const textBefore = currentText.slice(0, Math.min(offset, currentText.length));
                                         const lines = textBefore.split('\n');
                                         line = lines.length;
                                         column = lines[lines.length - 1].length + 1;
                                         pos = { lineNumber: line, column };
                                       }
                                       setCursorLine(line);
                                       setCursorColumn(column);
                                       window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line, column } }));

                                       if (previewModeRef.current !== 'both' || !editor || !model || model.isDisposed()) return;
                                       const position = editor.getModel().getPositionAt(offset);
                                       isScrollingRef.current = 'preview';
                                       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                       scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 150);
                                       editor.setPosition(position);
                                       if (reveal) {
                                         editor.revealPositionInCenter(position);
                                       }
                                     }}
                                     commandRef={visualCommandRef} aiTargetRef={visualAITargetRef} customCommands={customSlashCommands} customHotkeys={customHotkeys}
                                    onDocLinkDialog={(pos, insert, initialSelectedText) => {
                                      visualDocLinkPositionRef.current = pos;
                                      visualDocLinkInsertRef.current = insert;
                                      if (initialSelectedText) {
                                        setDocLinkCustomTitle(initialSelectedText);
                                        setIsDocLinkTitleManuallyEdited(true);
                                      }
                                      setShowDocLinkPicker(true);
                                    }}
                                    onFormulaDialog={(apply, initialLatex) => {
                                      visualFormulaInsertRef.current = apply;
                                      setFormulaModalInitialLatex(initialLatex || '');
                                      setIsFormulaModalOpen(true);
                                    }}
                                    currentFilePath={currentFileNode?.path}
                                    onFileOpen={(path, hash) => {
                                      if (path.startsWith('knowledge://')) {
                                        void handleFileOpenByPath(path, hash);
                                        return;
                                      }
                                      const guard = isPathInsideWorkspace(path, currentFileNode?.path, rootFolder?.path || rootFolder?.name, rootFolder?.name);
                                      if (!guard.isInside) {
                                        showToast(`⚠️ ${guard.reason || '작업장 외부 문서는 연결할 수 없습니다.'}`, 'warning');
                                        return;
                                      }
                                      void handleFileOpenByPath(guard.resolvedPath || path, hash, true);
                                    }}
                                    onImageFile={async file => {
                                      let savedPath: string | null = null;
                                      await handlePasteImageFile(file, path => { savedPath = path; });
                                      return savedPath;
                                    }}
                                    onMediaDialog={(kind,source,insert) => {
                                      visualMediaInsertRef.current = {kind,documentId:activeTabIdRef.current,insert};
                                      setMediaDialogSource({kind,source:source || ''});
                                      if (kind === 'map') setIsMapModalOpen(true); else {setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
                                    }}
                                    onImageDialog={(source, insert) => {
                                      const details = source ? visualImageDetails(source) : {path:'',alt:''};
                                      const path = details.path;
                                      const params = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '');
                                      const captionPos = params.get('caption');
                                      visualImageInsertRef.current = insert;
                                      setEditingImageInfo({
                                        path,
                                        alt: details.alt,
                                        width: params.get('width') || '',
                                        height: params.get('height') || '',
                                        align: params.get('align') || 'center',
                                        captionPos: (captionPos === 'top' || captionPos === 'bottom') ? captionPos : undefined,
                                        range: { visualImage: true, documentId: activeTabIdRef.current }
                                      });
                                      setIsImageModalOpen(true);
                                    }}
                                    renderImage={source => <MarkdownViewer mediaControlsManaged picturebookProfile={activeProfile} content={source} currentFilePath={currentFileNode?.path} rootFolderPath={rootFolder?.name}
                                      rootFolder={rootFolder} resourceFolderHandle={resourceFolderHandle} resourceFolder={resourceFolder} workspaceType={workspaceType} />}
                                    floatingToolbarVisible={floatingToolbar.visible}
                                    onFloatingToolbar={(visible, position) => {
                                      visualFloatingOriginRef.current = visible;
                                      const top = position.top + 48;
                                      setFloatingToolbar(prev => prev.visible === visible && (!visible || (prev.top === top && prev.left === position.left))
                                        ? prev : { visible, top, left: position.left });
                                    }}
                                    onSourceAction={(id, source, from, to) => {
                                      if (!activeTabId || isRestrictedUser) return;
                                      const changed = source !== contentRef.current;
                                      visualSourceActionRef.current = { id, source, from, to, tabId: activeTabId };
                                      contentRef.current = source;
                                      updateContent(source);
                                      if (changed) setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: source, isModified: true } : tab));
                                    }} content={content} onChange={next => {
                                    contentRef.current = next;
                                    updateContent(next, false, true);
                                    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
                                  }} />
                                ) : <MarkdownViewer
                                content={processedContent}
                                onMediaEdit={isRestrictedUser ? undefined : editDocumentMedia}
                                picturebookProfile={activeProfile}
                                picturebookEditorOptions={{documentId:activeTabId,tabSize:editorTabSize,spellCheck,customCommands:customSlashCommands,customHotkeys,commandRef:visualCommandRef,
                                  bibContent,onCitation:()=>setIsCitationModalOpen(true),
                                  onAction:command=>dispatchCommand(command),
                                  floatingToolbarVisible:floatingToolbar.visible,
                                  onFloatingToolbar:(visible,position)=>{
                                    visualFloatingOriginRef.current=visible;
                                    setFloatingToolbar(prev=>({...prev,visible,top:position.top+48,left:position.left}));
                                  },
                                  onImageFile:async file=>{let savedPath:string|null=null;await handlePasteImageFile(file,path=>{savedPath=path;});return savedPath;},
                                  onMediaDialog:(kind,insert)=>{
                                    visualMediaInsertRef.current={kind,documentId:activeTabIdRef.current,insert};
                                    setMediaDialogSource({kind,source:''});
                                    if(kind==='map')setIsMapModalOpen(true);else {setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
                                  },
                                  onFormulaDialog:insert=>{
                                    visualFormulaInsertRef.current=insert;
                                    setFormulaModalInitialLatex('');setIsFormulaModalOpen(true);
                                  },
                                  onImageDialog:(insert,source)=>{
                                    const details=source?visualImageDetails(source):{path:'',alt:''};
                                    const params=new URLSearchParams(details.path.includes('?')?details.path.slice(details.path.indexOf('?')+1):'');
                                    visualImageInsertRef.current=(path,alt)=>insert(picturebookImageReference(path,alt));
                                    setEditingImageInfo({path:details.path,alt:details.alt,width:params.get('width')||'',height:params.get('height')||'',align:params.get('align')||'center',range:{visualImage:true,documentId:activeTabIdRef.current}});
                                    setIsImageModalOpen(true);
                                  }
                                }}
                                onPicturebookImageEdit={index => {
                                  const original = contentRef.current;
                                  const scene = parseBookScenes(extractFrontmatter(original).content).scenes[index];
                                  if (!scene) return;
                                  const image = visualImageDetails(scene.image);
                                  setEditingImageInfo({path:image.path || '',alt:image.alt || '',width:'',height:'',align:'center',range:{bookSceneIndex:index, documentId:activeTabIdRef.current, originalSceneRaw:scene.raw}});
                                  setIsImageModalOpen(true);
                                }}
                                onPicturebookChange={!isRestrictedUser && directEditEnabled && currentFileName !== '도움말.md' ? (next) => {
                                  contentRef.current=next;
                                  updateContent(next, false, true);
                                  setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
                                } : undefined}
                                originalContent={previewContent}
                                lineMap={lineMap}
                                onCheckboxToggle={handleCheckboxToggle}
                                currentFilePath={currentFileNode?.path}
                                rootFolderPath={rootFolder?.name}
                                onFileOpen={handleFileOpenByPath}
                                listIndent={activeProfile.rules.ul?.['padding-left'] || activeProfile.rules.ol?.['padding-left']}
                                marginTop={pTop}
                                marginBottom={pBottom}
                                marginLeft={pLeft}
                                marginRight={pRight}
                                bibContent={bibContent}
                                rootFolder={rootFolder}
                                resourceFolderHandle={resourceFolderHandle}
                                resourceFolder={resourceFolder}

                                workspaceType={workspaceType}
                                onImageLoaded={handlePreviewImageLoaded}
                                customCss={dynamicCssString}
                              />}
                            </div>
                          );
                        })()}
                        {/*
                   * 동적 CSS 스타일 인젝션:
                   * custom-preview-container 내부의 태그들에 CssRuleSet을 적용합니다.
                   * activeProfileId === 'default'면 dynamicCssString이 빈 문자열이므로
                   * 이 <style> 태그는 자동으로 생략됩니다.
                   * 모든 값에 !important가 붙어 prose 클래스 스타일을 오버라이드합니다.
                   */}
                        {dynamicCssString && (
                          <style id="onrivi-dynamic-css" key="onrivi-dynamic-css" dangerouslySetInnerHTML={{ __html: dynamicCssString }} />
                        )}
                        {/* 미리보기 전용 모드이거나 A4 조판 가드가 켜져 있을 때 스킨의 배경색과 외부 감싸기용 회색 배경 분리 지정 */}
                        {(() => {
                          const activeProfile = resolveEffectiveDocumentProfile(previewContent);
                          const paperBg = activeProfile.pageStyle.backgroundColor || '#ffffff';
                          return (
                            <style id="onrivi-preview-page-css" key="onrivi-preview-page-css" dangerouslySetInnerHTML={{
                              __html: `
                        ${(previewMode === 'preview' || isA4GuardEnabled) ? `
                        .custom-preview-container {
                          background: ${isDarkMode ? '#13121a' : '#faf9f5'} !important;
                        }
                        ` : ''}
                        .preview-page-sheet {
                          background: ${paperBg} !important;
                          border-color: ${isDarkMode ? '#36343e' : '#e4e1ed'} !important;
                          box-shadow: none !important;
                        }
                      `}} />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )
              )}

            </main>

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
          </div>

          {isAiButtonVisible && <InlineAIAssistant documentId={activeTabId} disabled={!activeTabId || isRestrictedUser || currentFileName === '도움말.md'}
            disabledReason={!activeTabId ? '문서를 먼저 열거나 새 문서를 만들어 주세요.' : isRestrictedUser ? '현재 문서 편집 권한이 제한되어 있습니다. 로그인·인증 및 동시 접속 상태를 확인해 주세요.' : currentFileName === '도움말.md' ? '도움말은 수정할 수 없습니다. 작성할 문서를 열어 주세요.' : undefined}
            legacyKey={ensureDecryptedApiKey(geminiApiKey)} legacyModel={aiModelName} nickname={userNickname} resourceFolder={resourceFolder} resourceHandle={resourceFolderHandle}
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
            isToolbarOpen={isToolbarOpen} />}
          <StatusBar />

          {isAIDraftModalOpen && (
            <AIDraftModal 
              onClose={() => setIsAIDraftModalOpen(false)} 
              onApply={handleAIDraftApply} 
              geminiApiKey={geminiApiKey || ''}
              aiModelName={aiModelName || 'gemini-3.8-flash'}
              onModelChange={(newModel) => setAiModelName?.(newModel)}
              initialMode={aiDraftInitialMode}
              editorContext={{
                selectedText: aiEditorContext?.selectedText ?? (editorRef.current && !editorRef.current.getSelection()?.isEmpty() ? editorRef.current.getModel()?.getValueInRange(editorRef.current.getSelection()!) : '') ?? '',
                fullText: aiEditorContext?.fullText || editorRef.current?.getModel()?.getValue() || contentRef.current || content || '',
              }}
              resourceFolder={resourceFolder}
              resourceFolderHandle={resourceFolderHandle}
              rootFolder={rootFolder}
            />
          )}

          {/* 💡 [Step 4 리팩토링 완료] 모든 모달 껍데기들을 ModalManager로 완벽하게 이관 완료! */}
          <ModalManager
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
                const escaped = alt.replace(/([\\\[\]])/g,'\\$1');
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
          />

          {transferProgress && <div role="status" aria-live="polite" className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[999999] rounded-xl border bg-white dark:bg-zinc-900 px-5 py-3 shadow-xl text-sm">{transferProgress}</div>}
          {/* 📄 [새 문서 생성 대화상자] 폴더 선택 및 파일명 지정 모달 */}
          <NewDocumentModal
            isOpen={isNewDocumentModalOpen}
            onClose={() => setIsNewDocumentModalOpen(false)}
            fileList={fileList}
            rootFolder={rootFolder}
            workspaceType={workspaceType}
            onConfirm={handleCreateNewDocument}
            isDarkMode={isDarkMode}
          />

          {/* 📅 [달력 모달] 인터랙티브 월별 달력 및 다양한 날짜/시간 포맷 삽입 */}
          <CalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            onInsert={handleInsertFormattedDate}
            isDarkMode={isDarkMode}
          />

          {/* 🎙️ 모바일 플로팅 음성 비서 (STT) */}
          {mounted && isMobile && (() => {
            const handleSpeechToText = () => {
              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
              if (!SpeechRecognition) {
                showToast("죄송합니다. 현재 브라우저는 음성 인식을 지원하지 않습니다.", 'error');
                return;
              }

              if (isRecording) {
                // 녹음 중지
                setIsRecording(false);
                return;
              }

              const recognition = new SpeechRecognition();
              recognition.lang = 'ko-KR';
              recognition.interimResults = false;
              recognition.maxAlternatives = 1;

              recognition.onstart = () => {
                setIsRecording(true);
                showToast("🎙️ 마이크가 켜졌습니다. 말씀해 주세요...", 'info');
              };

              recognition.onerror = (e: any) => {
                console.error('Speech recognition error:', e);
                setIsRecording(false);
                showToast("음성 인식에 실패했습니다.", 'error');
              };

              recognition.onend = () => {
                setIsRecording(false);
              };

              recognition.onresult = async (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (!transcript.trim()) return;

                showToast(`음성 감지: "${transcript}"`, 'success');

                // 음성 인식 텍스트를 에디터 커서 위치에 바로 삽입
                insertAtCursor(transcript);
                showToast("음성 텍스트가 본문에 입력되었습니다.", 'info');
              };

              recognition.start();
            };

            return (
              <button
                onClick={handleSpeechToText}
                className={`fixed bottom-20 right-6 z-[99999] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer ${isRecording ? 'bg-rose-500 mic-pulse' : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'}`}
              >
                {isRecording ? (
                  <span className="w-4 h-4 bg-white rounded-full animate-ping" />
                ) : (
                  <span className="text-xl">🎙️</span>
                )}
              </button>
            );
          })()}

          {isAiLoading && (
            <div className="fixed inset-0 z-[99999] bg-black/25 dark:bg-black/55 flex items-center justify-center pointer-events-none select-none">
              <div className="bg-white dark:bg-zinc-800 shadow-2xl border border-purple-500/20 rounded-2xl px-6 py-4 flex items-center gap-3.5 animate-in fade-in zoom-in-95 duration-200">
                <Icon name="Loading" className="animate-spin text-purple-500" size={20} />
                <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
                  AI가 문장을 다듬고 있습니다...
                </span>
              </div>
            </div>
          )}
          {/* ── 인용구 Alert 드롭다운 팝업 (fixed 최상위 레이어 — Windows 작업표시줄 위로 노출) ── */}
          {floatingQuoteDropdown.open && (
            <div
              id="floating-quote-dropdown-fixed"
              tabIndex={-1}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                const buttons = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
                const activeEl = document.activeElement as HTMLButtonElement;
                const currentIndex = buttons.indexOf(activeEl);
                if (e.key === 'Tab' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
                  buttons[nextIndex]?.focus();
                } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                  e.preventDefault();
                  const prevIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length;
                  buttons[prevIndex]?.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  if (activeEl && buttons.includes(activeEl)) {
                    e.preventDefault();
                    activeEl.click();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
                  const trigger = document.getElementById('floating-quote-dropdown-container')?.querySelector('button');
                  trigger?.focus();
                }
              }}
              style={{
                position: 'fixed',
                zIndex: 2147483647,
                left: floatingQuoteDropdown.x,
                ...(floatingQuoteDropdown.dropUp
                  ? { bottom: window.innerHeight - floatingQuoteDropdown.y + 4 }
                  : { top: floatingQuoteDropdown.y + 4 }),
                minWidth: '230px',
              }}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl py-1 flex flex-col overflow-y-auto outline-none"
            >
              {[
                { id: 'QUOTE', label: '일반 인용구', icon: '❝', tag: '> ' },
                { id: 'QUOTE_NOTE', label: '참고 (Note)', icon: 'ℹ️', tag: '[!참고] · [!NOTE]' },
                { id: 'QUOTE_TIP', label: '팁 (Tip)', icon: '💡', tag: '[!팁] · [!TIP]' },
                { id: 'QUOTE_IMPORTANT', label: '중요 (Important)', icon: '📢', tag: '[!중요] · [!IMPORTANT]' },
                { id: 'QUOTE_WARNING', label: '주의 (Warning)', icon: '⚠️', tag: '[!주의] · [!WARNING]' },
                { id: 'QUOTE_CAUTION', label: '경고 (Caution)', icon: '🚨', tag: '[!경고] · [!CAUTION]' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    executeFloatingItem(() => {
                      dispatchCommand(opt.id as any);
                      setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
                    });
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-900/50 focus:outline-none flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{opt.icon}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{opt.label}</span>
                  </div>
                  {opt.tag && (
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-bold">
                      {opt.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {/* ── 날짜/시간 커서 위치 스마트 입력 팝업 ── */}
          <DateTimeInsertPicker
            isOpen={isMonacoDatePickerOpen}
            position={monacoDatePickerPos}
            onClose={() => setIsMonacoDatePickerOpen(false)}
            onInsert={handleInsertFormattedDate}
            isDarkMode={isDarkMode}
          />
        </div>
      </EditorProvider>
    </>
  );
}
