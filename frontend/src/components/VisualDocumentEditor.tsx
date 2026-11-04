/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 3단계 모듈화 분리]:
 *             1) 760줄의 거대 인라인 nodeViews 및 mediaNodeView를 createVisualNodeViews 팩토리 모듈로 전면 분리
 *             2) table, math, code_block, footnote, mermaid, media 10대 NodeView를 nodeViews/ 하위로 격리하여 800줄 이상 추가 슬림화 달성
 * 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 2단계 모듈화 분리]:
 *             1) 인라인 상단 툴바/표 도구를 VisualEditorToolbar.tsx로, 슬래시 메뉴/플로팅 포털을 VisualSlashMenu.tsx로 분리
 *             2) 360줄의 인라인 CSS 스타일을 visualEditorStyles.ts로 완전 격리하여 총 700줄 이상 추가 슬림화 달성
 * 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 대형 위지윅 에디터 모듈화 분리]:
 *             1) 5,640줄의 거대 VisualDocumentEditor.tsx에서 4대 핵심 엔진(activeTagInspector, visualDocumentCommands, visualSelectionHelper, visualDropHelper)을 frontend/src/components/visualEditor/로 전면 분리
 *             2) 태그 인스펙터 분석(120줄), 블록 조작/정규화 커맨드군(480줄), 선택/키보드 이동 헬퍼(270줄), 드롭/경로 변환(140줄) 등 총 1,000줄 이상을 독립 모듈화하여 소스 슬림화 달성
 * 🚨 @PATCH : 2026-11-03 — [각주 영역 단편화 방지 및 참고문헌 삭제 기능 연동]:
 *             1) 각주 정의(visual_footnote_def) 사이 및 하단에 엔터/타이핑으로 인한 빈 문단 삽입 원천 차단 및 단편화 자동 소거
 *             2) 참고문헌 카드별 개별 삭제 버튼(✕) 및 전체 삭제 버튼 연동으로 본문 인용 태그 실시간 일괄 정리
 * * 🚨 @PATCH : 2026-11-03 — [일반 도서용 참고문헌 목록 삽입 커맨드(/참고문헌) 신설] 복잡한 인용 태그 없이 문서 끝에 '## 참고문헌'과 글머리 기호 목록을 자동 생성하고 커서 이동
 * * 🚨 @PATCH : 2026-11-03 — [각주 참조/정의 동시 삭제 및 고아 노드 방지] 본문 내 각주 번호(visual_footnote_ref) 삭제 시 하단 각주 설명(visual_footnote_def)을 단일 트랜잭션에서 자동 삭제(Undo/Redo 지원)하고 역방향 삭제도 동기화
 * 🚨 @PATCH : 2026-11-03 — [각주 삽입 시 선택 문구 보존] 텍스트 선택 후 각주 적용 시 문구가 지워지지 않고 해당 문구 바로 뒤에 각주 번호가 첨부되도록 개선
 * 🚨 @PATCH : 2026-11-03 — [페이지 보기 표 조정] 출력 표 경계 누름 시 직접 편집으로 전환하고 숨겨진 표 도구는 감춤
 * 🚨 @PATCH : 2026-11-02 — [표 열 너비 자동 조정] 편집 표의 균등 분할을 해제하고 내용 길이에 따라 열 너비를 배분
 * 🚨 @PATCH : **2026-11-01** — [표 셀 줄바꿈 파괴 및 가로 늘어짐·텍스트 잘림 결함 완전 해결]:
 *             1) .visual-document-surface .visual-editable-table에 table-layout: fixed !important 및 max-width: 100%를 적용하여 긴 텍스트/코드 포함 시 표가 화면 밖으로 튀어나가거나 특정 열이 1글자 세로로 찌그러지는 현상 원천 차단
 *             2) th, td 셀에 overflow-wrap: anywhere !important 및 word-break: break-word !important를 부여하여 컬럼 비율 내에서 텍스트가 자연스럽게 줄바꿈되도록 개선
 *             3) 표 내부 인라인 코드(:is(th, td) code)에 white-space: pre-wrap, overflow-wrap: anywhere, word-break: break-all을 적용하여 긴 파일 경로/URL이 셀 안에서 안전하게 줄바꿈되도록 완벽 조판
 * 🚨 @PATCH : **2026-10-31** — [서식 버튼 동일 클릭 시 취소(토글 해제) 지원]:
 *             1) setHeadingBlock에서 동일 레벨 제목 재클릭 시 paragraph(일반 문단)로 전환하여 제목 서식 즉시 취소
 *             2) setQuote에서 동일 인용구(일반/Alert) 재클릭 시 lift 커맨드를 실행하여 인용구 서식 즉시 취소
 * 🚨 @PATCH : **2026-10-31** — [플로팅 서식 툴바 유지 보장 및 서식 적용 시 자동 닫힘 방어]:
 *             1) dispatchTransaction에서 transaction.docChanged 시 manualFloatingRef.current=false 및 setSelection(false)로 툴바를 강제 닫던 로직을 제거하여 서식 적용 후에도 플로팅 툴바가 유지되도록 개선
 *             2) replaceSource 및 itemButton 실행 시 플로팅 툴바 자동 닫힘을 제거하여 연속 서식 작업 지원
 *             3) 에디터 본문 마우스 클릭(mousedown) 및 ESC 키 입력 시에만 플로팅 서식 툴바가 닫히도록 사용자 명세 완벽 준수
 * 🚨 @PATCH : **2026-10-27** — [Shift+상하 방향키 및 PageUp/PageDown 문단 간 이동·선택 완전 지원 및 바운싱·멈춤 결함 해소]:
 *             1) Shift+ArrowUp/ArrowDown 입력 시 문단 경계(첫 줄/마지막 줄/빈 행)에서 브라우저 네이티브 Selection이 가로막혀 선택이 풀렸다 다시 잡히는 바운싱 루프를 원천 차단하고, isHeadAtBlockBoundary 및 extendSelectionVerticallyAcrossBlocks를 통해 수평 X좌표를 정밀 보존하며 다음/이전 문단(빈 행 포함)으로 매끄럽게 선택 영역을 확장·축소하도록 구현
 *             2) 문서 마지막 빈 행에서 위로 올라갈 때나 위에서 아래로 내려올 때 문단 마지막 행에서 멈추는 결함을 해소하여 전체 문서 단위의 연속 키보드 다중 선택 보장
 *             3) PageDown/PageUp 및 Shift+PageDown/Shift+PageUp 핸들러(handlePageMove)를 신설하여, 에디터 내부 스크롤 컨테이너(.custom-preview-container)의 뷰포트 높이(85%) 기반 페이지 단위 스크롤 점프 및 커서/선택 영역 이동 완전 지원
 * 🚨 @PATCH : **2026-10-27** — [Shift+방향키 다중 행/문단 텍스트 선택 경계 차단 및 깜빡임 결함 완전 해결]:
 *             1) TextSelection 변경 시마다 DOM을 분할·변조하던 visual-selected-text 인라인 데코레이션을 전면 제거하고 브라우저 네이티브 ::selection CSS 의사요소로 전환하여, DOM 변조로 인한 브라우저 Selection Range 리셋 및 문단 경계 진입 차단 현상 원천 해결
 *             2) handleKeyDown의 Shift+ArrowDown 가로채기(extendSelectionToListEnd)를 제거하여, Shift+상하 방향키로 위에서 아래로 또는 아래에서 위로 문단/빈 행 경계를 자유롭고 매끄럽게 넘나들며 다중 선택 가능하도록 보장
 * 🚨 @PATCH : **2026-10-27** — [마우스 클릭 시 커서 위치 즉각 이동 보장 및 엔터 빈 행 서식 일원화]:
 *             1) document 전역 selectstart/mousedown 가로채기(preventDefault)를 제거하고, handleClick에서 클릭 좌표(posAtCoords) 기반 TextSelection 즉각 갱신 및 visualCaret 연동으로 본문/여백 어디를 클릭해도 마우스 위치로 정확히 커서 이동 보장
 *             2) 빈 문단(p:empty)의 인위적 여백 왜곡을 걷어내고 서식 프로필의 기본 문단 서식과 일원화하여, 엔터 입력 후 글자 타이핑 시 문단 높이가 변하거나 위로 튀지 않고 정확한 캐럿 위치에서 1:1로 자연스럽게 작성되도록 연동
 * 🚨 @PATCH : **2026-10-26** — [ESLint React Hook exhaustive-deps 의존성 경고 해소]:
 *             1) PDF 미리보기 계산 useEffect에서 pageStyleRef를 활용하여 pageStyle 객체 참조 불일치 경고 해결
 * 🚨 @PATCH : **2026-10-26** — [표 편집 도구 플로팅 툴바 '닫기' 버튼 및 Esc 닫기 연동]:
 *             1) 표 편집 도구 툴바 우측에 '닫기' 버튼을 신설하여 작업 중 화면을 가리는 도구 모음을 언제든 닫을 수 있도록 지원
 *             2) Esc 키 입력 시에도 표 편집 도구가 부드럽게 닫히도록 연동
 *             3) 표 밖으로 커서가 나갔다 다시 진입하거나 다른 표로 이동 시 도구가 자동 복귀되며, 상단 태그 영역에 '표 도구 열기' 복귀 버튼 제공
 * 🚨 @PATCH : **2026-10-26** — [플로팅 서식 툴바 탭오더(Tab/Arrow) 키보드 탐색 및 Enter 적용 후 자동 닫힘(사라짐) 연동]:
 *             1) 플로팅 툴바 및 서식 버튼에 tabIndex={0}, focus:ring-2 focus:ring-blue-500 고대비 포커스 링 부여 및 Tab/Shift+Tab, Arrow 방향키 순환 탐색 연동
 *             2) Enter/Space 키로 태그 및 서식 컨트롤 즉각 적용 및 선택 완료 시 플로팅 툴바 자동 닫힘(setSelection(false)) 연동
 * 🚨 @PATCH : **2026-10-26** — [각주(Footnote) 생성 및 클릭 시 입력란 전체 포커스(Focus + Select All) 및 Enter 본문 복귀 연동]:
 *             1) insertFootnote 실행 시 생성된 각주 설명 입력란(.visual-footnote-text)으로 자동 스크롤 및 전체 포커스(텍스트 전체 선택: selectAll) 즉각 부여
 *             2) 초기 기본 안내문구('각주 내용을 입력하세요') 상태에서 클릭/포커스 시 텍스트 전체 선택을 유지하여 사용자가 타이핑 시 기존 문구 사이에 글자가 끼어드는 결함(입rlrlemf력) 원천 방지
 *             3) 각주 입력란에서 Enter 키 입력 시 본문 각주 번호([^N])로 즉시 스크롤 및 커서 포커스 자동 복귀 연동 (Shift+Enter는 줄바꿈 유지)
 *             4) 본문 각주 뱃지([^N]) 클릭 시에도 해당 각주 설명란으로 부드럽게 이동하여 전체 포커스 부여
 * 🚨 @PATCH : **2026-10-26** — [HWP/문서 가져오기 체크박스(<input type="checkbox">) 위지윅 nodeView 및 인터랙티브 토글 연동]:
 *             1) visual_checkbox nodeView 신설: 표 내부 및 본문 인라인 체크박스를 네이티브 체크박스 UI로 렌더링하고 stopEvent를 통해 캐럿 드래그 충돌 차단
 *             2) 체크박스 change 이벤트 시 ProseMirror setNodeMarkup 트랜잭션을 디스패치하여 체크 상태 실시간 동기화 및 마크다운 무손실 반영
 *             3) getActiveTagInfo에 visual_checkbox(innermostTag: 'input', innermostLabel: '체크박스') 매핑 추가
 * 🚨 @PATCH : **2026-10-25** — [서식·태그 지우기(clear) 단축키 Ctrl+\\ 연동 및 영문/한글(₩) 키보드 완전 지원]:
 *             1) keymap에 Mod-\\ (clear)를 등록하고 handleKeyDown 및 bridge(CLEAR/REMOVE_PREFIX)에 Ctrl+\\ / Ctrl+₩ / Backslash를 1:1 매핑
 *             2) 블록 또는 텍스트 서식(굵게, 밑줄, 인라인코드 등) 및 블록 태그(목록, 제목 등) 적용 상태에서 Ctrl+\\ 입력 시 일반 본문 문단(paragraph) 및 서식 없는 텍스트로 즉각 초기화
 * 🚨 @PATCH : **2026-10-25** — [인라인 서식 시작 왼쪽 방향키(←) 및 Home 키 서식 탈출(Step Out) 연동]:
 *             1) 서식 텍스트 시작 경계에서 왼쪽 방향키(←) 입력 시 서식 유지 상태를 부드럽게 벗어나(storedMarks = []) 단축키 없이 즉시 일반 본문 텍스트 타이핑 지원
 *             2) 이미 탈출한 상태에서 방향키(←) 재입력 시에는 기본 커서 이동이 정상 동작
 *             3) 서식 내부에서 Home 키 입력 시 행 시작으로 이동함과 동시에 서식을 자동 해제(storedMarks = [])하여 행 선두에서 곧바로 일반 텍스트 작성 지원
 * 🚨 @PATCH : **2026-10-25** — [문서보기(VisualDocumentEditor) 실시간 태그 표시기(Active Tag Inspector) 탑재]:
 *             1) getActiveTagInfo 엔진 신설: 커서 위치($from)의 블록 계층(h1~h6, table, tr, th, td, ul, ol, li, blockquote, pre, p, math 등) 및 인라인 서식(strong, em, u, s, code, a)을 AST 기반으로 실시간 탐색
 *             2) 최종안 태그(Innermost Tag) 식별 알고리즘 구현: 다중 중첩 서식(예: 표 셀 내부 밑줄 table > tr > td > u, 본문 굵은 글씨 p > strong 등)에서 사용자가 실제로 타이핑하고 있는 가장 안쪽 태그를 최우선 추출
 *             3) 에디터 상단 컨트롤 툴바에 고대비 태그 뱃지(<tag> (라벨)) 및 전체 태그 경로(breadcrumb) 실시간 UI 배치 (Rule 8 고대비 가이드 준수 및 기존 '현재 입력 서식' 테스트 100% 호환 보존)
 * 🚨 @PATCH : **2026-10-25** — [슬래시 커맨드(/table 등) Enter 키 입력 시 이벤트 전파 차단 및 비동기 실행 분리]:
 *             1) 슬래시 메뉴에서 Enter/Tab으로 명령 선택 시 event.preventDefault() 및 event.stopPropagation()을 호출하여 bubbling을 원천 차단
 *             2) executeItemRef.current 호출을 setTimeout(..., 0)으로 비동기 분리하여 모달(TableModal 등)이 동기적으로 열리며 동일한 Enter keydown에 의해 자동 제출·닫힘되는 현상 완전 해결
 * 🚨 @PATCH : **2026-10-25** — [멀티 서식(굵게+밑줄 등) 동시 적용 지원 및 synchronizeTextSelection storedMarks 유실 결함 완전 해결]:
 *             1) synchronizeTextSelection 및 run에서 selection 갱신 시 기존 view.state.storedMarks가 null로 날아가던 결함을 tr.setStoredMarks(stored)로 안전 보존
 *             2) 에디터 상단 컨트롤 툴바에 '밑줄(underline)' 버튼 신설 및 activeMarks/입력 서식 상태 표시 매핑에 underline 완전 등록
 *             3) 빈 커서 상태에서 굵게, 밑줄 등 복수 서식을 연속 클릭/단축키로 켰을 때 첫 번째 서식이 초기화되거나 풀리지 않고 완벽하게 누적 활성화되도록 개선
 * 🚨 @PATCH : **2026-10-25** — [인라인 서식 끝 오른쪽 방향키(→) 및 End 키 서식 탈출(Step Out) 연동]:
 *             1) 서식 텍스트 끝 경계에서 오른쪽 방향키(→) 1회 입력 시 서식 유지 상태를 부드럽게 벗어나(storedMarks = []) 단축키 없이 즉시 일반 본문 텍스트 타이핑 지원
 *             2) 이미 탈출한 상태에서 방향키(→) 재입력 시에는 기본 커서 이동이 정상 동작하며, 왼쪽 방향키(←) 입력 시 서식 모드로 부드럽게 재진입
 *             3) 서식 내부 또는 문장 끝에서 End 키 입력 시 행 끝으로 이동함과 동시에 서식을 자동 해제하여 연속 일반 텍스트 작성 지원 (Tab 키는 본래 들여쓰기 기능 100% 보존)
 * 🚨 @PATCH : **2026-10-25** — [인라인 서식 표준 위지윅(Option B) 전환 및 거추장스러운 문법 기호 전개 제거]:
 *             1) 인라인 서식(굵게, 기울임, 밑줄, 취소선, 인라인코드)을 화면에 가상 기호(**, <u> 등)를 억지로 전개/접기하지 않고 표준 위지윅 토글(toggleMark) 방식으로 완전 전환
 *             2) Ctrl+B/I/U/E/Shift+X 단축키 및 툴바 클릭 시 텍스트 선택 영역은 즉시 서식 적용/해제, 빈 커서에서는 서식 활성화 후 실시간 타이핑 지원
 *             3) 문법 기호 가상 위젯 데코레이션 및 경계 탈출 간섭 코드를 전면 소거하여 캐럿 갇힘, 한글 IME 조합 충돌, 커서 동기화 어긋남 결함 원천 해결
 *             4) 저장 및 내보내기 시에는 기존과 100% 동일하게 표준 마크다운 문법(**텍스트**, `코드` 등)으로 완벽 직렬화/역직렬화 유지
 * 🚨 @PATCH : **2026-10-25** — [코드 블록 생성 시 하단 빈 행(문단) 자동 보장 및 밖에서 곧바로 타이핑 지원]:
 *             1) setCodeBlock 실행 시 코드 블록 바로 아래에 빈 문단(paragraph)을 확실히 추가하여 코드 블록 밖에서 곧바로 타이핑 가능하도록 보장
 *             2) CODE 언어 입력란에서 Shift+Enter 입력 시 코드 블록 밖 하단 빈 행으로 즉각 커서 이동
 *             3) 코드 본문에서 빈 코드 블록 Enter, 코드 끝 ArrowDown, Shift+Enter / Ctrl+Enter 입력 시 코드 블록 밖 하단 빈 행으로 부드럽게 탈출 및 연속 타이핑 지원
 *             4) .visual-code-block에 margin-bottom: 20px를 적용하고 캔버스 클릭 시 코드 블록 하단 빈 행 자동 포커스 보장
 * 🚨 @PATCH : **2026-10-25** — [코드 블록 생성 시 CODE(언어) 입력란 자동 포커스 및 양방향 키보드 이동 연동]:
 *             1) setCodeBlock 및 InputRule(```) 생성 시 onrivi:focus-code-block 메타 전달을 통해 CODE 언어 입력란(input)으로 즉시 포커스 및 텍스트 선택(select)
 *             2) CODE 언어 입력란에서 Enter/Tab/ArrowDown 입력 시 언어 속성(params) 자동 커밋 및 코드 본문(code) 시작 위치로 포커스 자동 전환
 *             3) 코드 본문 첫 행 첫 열에서 ArrowUp 입력 시 상단 CODE 언어 입력란으로 부드럽게 포커스 복귀 연동
 * 🚨 @PATCH : **2026-10-25** — [외부 원고(웹/MS Word/Excel) HTML 스마트 붙여넣기 및 서식 정제 파이프라인 연동]:
 *             1) handlePaste 내 단순 기호(-, 1. 등) 기반 마크다운 오분기로 인한 HTML 서식 손실 버그 원천 해결
 *             2) 웹/워드/엑셀 등 서식 HTML 복사 시 htmlToImportMarkdown 및 importHtmlWithImages 연동으로 군더더기 스타일 제거 및 표준 마크다운(제목, 표, 목록, 굵게/기울임, 링크, 이미지 로컬화) 자동 정제 주입 완비
 * 🚨 @PATCH : **2026-10-25** — [이미지와 캡션 간격 초밀착(4px) 및 액션 버튼(복사/편집) 위치 최적화]:
 *             1) .visual-image-block 상단 캡션([data-caption-position="top"]) 보유 시 액션 컨트롤(.visual-media-controls)의 top을 34px로 재배치하여 캡션과 버튼의 충돌을 방지하고 이미지 우측 상단에 정갈히 안착
 *             2) .visual-document-surface 내 상단 캡션 이미지의 margin-top을 0으로 강제 초기화하여 설명과 이미지가 4px로 완벽 밀착되도록 개선
 * 🚨 @PATCH : **2026-10-25** — [이미지 삽입/수정 시 캡션 alt 이중 이스케이프 및 stray bracket 방어]:
 *             1) beginImageRef에서 alt 내 기존 이스케이프 역슬래시 정규화 및 stray bracket 단독 찌꺼기 필터링으로 깨진 기호("\\[") 주입 차단
 * 🚨 @PATCH : **2026-10-25** — [목록 첫 번째 항목 Tab/Shift+Tab 전체 문단 들여쓰기/내어쓰기 연동]:
 *             1) 첫 번째 항목(itemIndex === 0)에서 Tab 입력 시 빈 상위 항목 없이 목록 전체를 오른쪽으로 이동하고, Shift+Tab으로 되돌리는 전체 리스트 들여쓰기(indentWholeList/outdentWholeList) 연동
 * 🚨 @PATCH : **2026-10-24** — [복사/붙여넣기 시 텍스트 누락 및 단독 이미지 오분기 탈취 결함 완전 해소]:
 *             1) handlePaste에서 본문 텍스트(text/plain 또는 html 태그 제거 텍스트) 존재 시 단독 이미지 가로채기(beginImageRef)를 원천 차단하여 문서 전체가 누락 없이 완벽 붙여넣기되도록 개선
 *             2) 텍스트가 전혀 없는 순수 단독 이미지 붙여넣기인 경우에만 기존 단독 이미지 모달/삽입 처리기로 분기
 * 🚨 @PATCH : **2026-10-24** — [문서보기(위지윅) 인용문(blockquote) Tab 들여쓰기 및 Shift+Tab 내어쓰기 지원]:
 *             1) indentBlockquote 신설: 인용문 내에서 Tab 입력 시 앞선 리스트(글머리/번호) 항목 내부로 인용문 블록 자체를 종속·들여쓰기하고, 단독 인용문인 경우 중첩 인용구로 구조화
 *             2) outdentBlockquote 신설: 리스트 내부 인용문에서 Shift+Tab 입력 시 인용문 블록을 리스트 바깥(루트 레벨)으로 즉시 내어쓰기
 *             3) handleKeyDown에서 인용문(!inQuote) 내부일 때 텍스트 스페이스 삽입 가드를 건너뛰도록 분기 보정
 * 🚨 @PATCH : **2026-10-24** — [문서보기 동영상/지도 캡션 포함 미디어 원자적 위지윅 삽입 지원]:
 *             1) beginMediaRef에서 캡션이 포함된 동영상/지도 HTML 마크다운 삽입 시 createVisualDocumentCodec을 통해 캡션 문단과 미디어 노드를 분리하여 위지윅 문서에 완벽 렌더링
 * 🚨 @PATCH : **2026-10-24** — [문서보기(위지윅) 이미지 캡션(fullMarkdown) 렌더링 지원]:
 *             1) onImageDialog insert 함수에 fullMarkdown 선택 인자 지원
 *             2) 캡션이 포함된 fullMarkdown 주입 시 createVisualDocumentCodec을 통해 캡션 문단과 이미지 노드를 함께 위지윅 문서에 원자적으로 삽입
 * 🚨 @PATCH : **2026-10-24** — [문서보기 제목(H1~H6) 태그 고대비 선명화 및 인쇄 100% 완전 차단 (Plan 2 고도화)]:
 *             1) .visual-document-surface[contenteditable="true"] :is(h1,h2,h3,h4,h5,h6)::after 뱃지 기본 opacity를 0.92로 격상하고 1.5px 고대비 테두리 및 11px 볼드 글꼴을 적용하여 흐릿함 없이 또렷한 시인성 확보
 *             2) @media print 및 PDF 내보내기에서 display: none !important, content: none !important, visibility: hidden !important로 인쇄 시 완전 비표시 삼중 방어 보장
 *             3) 그림책 미리보기 및 읽기 전용 모드 자동 숨김 유지로 원고 본문 무결성 완벽 유지
 * 🚨 @PATCH : **2026-10-24** — [도움말 문서 링크(../../ 및 파일명) 위지윅 클릭 경로 자동 보정]:
 *             1) resolveDocPath에서 resolveWorkspaceHelpLink를 연동하여 위지윅 문서보기 내 도움말 형제 문서 클릭 시 정확한 경로로 즉시 전환
 * 🚨 @PATCH : **2026-10-22** — [구분선(HR) 선택 상태에서 Enter 시 구분선 아래 새 문단 생성]:
 *             1) openParagraphAfterHorizontalRule 신설: 구분선 NodeSelection에서 Enter 입력 시 구분선 앞이 아닌 바로 아래에 빈 문단을 생성(기존 빈 문단은 재사용)하고 커서를 이동하여 즉시 새 문단 타이핑 지원
 * 🚨 @PATCH : **2026-10-22** — [문서링크(DocLinkPicker) 선택 텍스트 연동 및 링크명 수정 지원]:
 *             1) onDocLinkDialog 호출 시 선택 텍스트(initialSelectedText)를 전달하여 문서링크 팝업에서 앞의 링크명을 즉시 수정/적용할 수 있도록 연동
 * 🚨 @PATCH : **2026-10-21** — [문서보기(VisualDocumentEditor) 서명/발신인(SIGNATURE) 네이티브 지원 및 양방향 연동]:
 *             1) 문서보기 위지윅 에디터에서 플로팅 툴바 '서명/발신인' 버튼(Signature 아이콘), 단축키(Ctrl+Alt+R), 슬래시 커맨드(/sign, /서명, /사인) 실행 시 마크다운 전환 없이 즉시 실행
 *             2) 선택 텍스트가 있을 시 줄바꿈(공백 2개) 보존 <div align="left">...</div> 감싸기 및 기존 서명 블록 토글 해제(Unwrap) 지원
 *             3) 미선택 시 오늘 날짜 기반 표준 공문서 발신인·서명 인감 템플릿 자동 삽입 및 replaceSource·callback을 통한 실시간 반영 및 토스트 알림 연동
 * 🚨 @PATCH : **2026-10-21** — [리스트-빈문단 간 방향키(↑/↓) 건너뛰기 방어 및 리스트 끝 Delete 시 빈문단 삭제·자동 병합 연동]:
 *             1) ArrowUp / ArrowDown 키맵에 moveUpAcrossListBoundary / moveDownAcrossListBoundary를 연동하여 리스트 사이의 빈 줄을 방향키가 건너뛰지 않고 정확히 안착하도록 보정
 *             2) Delete 키맵에 deleteAtEndOfList를 연동하여 리스트 마지막 항목 끝에서 Delete 입력 시 후행 빈 문단을 깔끔하게 삭제하고 분리된 리스트를 하나로 원상 복구
 * 🚨 @PATCH : **2026-10-21** — [서로 다른 리스트(글머리↔숫자) 간 Tab 들여쓰기 지원 및 리스트 중간 엔터 시 아래 리스트 들여쓰기 100% 보존]:
 *             1) exitEmptyListItem 안전 분할(safe split) 로직 연동: 리스트 중간에서 엔터로 볼트 삭제 시 리스트를 상/하단으로 안전 분할하여 아래 리스트의 하위 들여쓰기/구조가 깨지는 현상 원천 해결
 *             2) independentIndentListItem 교차 리스트 들여쓰기 연동: 같은 레벨에 글머리 리스트와 숫자 리스트가 서로 다르게 인접한 경우에도 이전 리스트의 하위 항목으로 자연스럽게 들여쓰기(Tab) 지원
 * 🚨 @PATCH : **2026-10-21** — [리스트 연속 들여쓰기 방어(safeListIndent) 및 빈 행 Delete 시 아래 리스트 서식 보존 끌어올림(deleteEmptyParagraphBeforeList)]:
 *             1) 빈 문단에서 Delete 키 입력 시 아래 리스트가 일반 텍스트로 풀리는(unwrap) 버그를 원천 차단하고 빈 문단만 깔끔히 삭제하여 아래 리스트를 100% 서식 유지한 채 위로 즉시 끌어올림
 *             2) safeListIndent를 신설하여 리스트 항목 내에서 Tab 입력 시 형제가 없거나 같은 레벨에서 무분별하게 들여쓰기/구조가 왜곡되는 현상을 완벽 방어
 *             3) visualMarkdownInputRules의 리스트 항목 내 하이픈 중복 발동을 차단하여 마크다운 소스의 - -  중복 및 불릿 2개(•   •) 노출 버그 원천 해결 및 자동 치유
 *             4) 마크다운 직렬화 시 불필요한 <p></p> 태그 생성을 전면 배제하고 순수 마크다운 개행으로 정규화
 * 🚨 @PATCH : **2026-10-21** — [문서보기 커서 및 스크롤 마크다운(Monaco) 1:1 실시간 동기화 개선]:
 *             1) 스크롤 리스너에서 포커스 차단 가드(viewRef.current?.hasFocus())를 해제하여 문서보기 스크롤 시 마크다운 에디터 스크롤이 즉각 추종하도록 수정
 *             2) posAtCoords 좌표를 컨테이너 가로 중앙(centerX) 및 상단(topY)으로 정밀 보정하고, 상단(offset 0) 및 하단(max offset) 클램프 처리
 *             3) mouseup 및 dispatchTransaction selectionSet 처리 시 cursorCallback.current(offset, true)를 전달하여 마우스 클릭 또는 방향키 이동 시 마크다운 에디터 커서 이동 및 뷰포트 노출(reveal) 완벽 일치
 *             4) onrivi:source-cursor 수신 시 caretRef.current?.schedule()을 호출하여 마크다운 커서 이동 시 문서보기 캐럿(Caret) 렌더링 즉시 동기화
  * 🚨 @PATCH : **2026-10-20** — [텍스트 선택(블록 지정) 상태에서 마우스 클릭 시 선택 해제 및 커서 즉시 이동]:
 *             1) mousedown 및 handleClick 핸들러에 선택 해제 파이프라인 신설: Ctrl+A 또는 드래그로 텍스트가 광범위하게 선택된 상태에서 본문/여백 클릭 시 Chromium 드래그 대기로 인한 선택 불풀림 버그를 원천 차단
 *             2) 마우스 클릭 좌표(posAtCoords)를 계산하여 TextSelection.near로 단일 커서(Caret)를 즉시 배치하고 깜빡임 캐럿 및 에디터 포커스를 100% 정상 활성화
 * 🚨 @PATCH : **2026-10-20** — [문서 서식 일괄 정리(CLEAN_DOC) 기능 문서보기(VisualDocumentEditor) 완벽 연동]:
 *             1) cleanMarkdownDocument 유틸리티를 연동하여 commands['CLEAN_DOC'] 핸들러 신설
 *             2) 위지윅 문서보기 모드에서도 마크다운 소스를 직렬화하여 빈 문단 HTML 태그(<p></p>) 완전 소거, 코드/수식/프론트매터 보존, 표 정렬, 불필요한 줄바꿈 정리, 헤딩/인용구 공백 교정 등을 일괄 수행한 뒤 replaceSource 및 callback(onChange)을 통해 실시간 화면 반영 및 자동 저장 연동
 * 🚨 @PATCH : **2026-10-19** — [페이지 분할 가이드 활성화 시 인쇄 용지 시트(Print Layout) 스타일 1:1 동기화]:
 *             1) pageGuides 활성화 시 resolvePageGeometry(pageStyle)를 연동하여 .visual-document-surface의 너비와 여백을 용지 규격(A4 210mm, 좌우 12mm, 상하 18mm)으로 정밀 일치
 *             2) 화면 너비에 따른 텍스트 줄바꿈 왜곡을 원천 방어하여 에디터의 페이지 분할 위치와 실제 인쇄/PDF 출력 위치를 1:1 완벽 동기화
 *             3) 용지 시트 음영(box-shadow), 라운드 및 배경색(#ffffff / dark:#18181b)을 주입하여 실제 책을 펼쳐놓고 집필하는 위지윅 사용자 경험 제공
 * 🚨 @PATCH : **2026-10-19** — [입력 중 외부 content 덮어쓰기 방어 및 스크롤 동기화 간섭 차단]:
 *             1) view.hasFocus() 활성 상태 시 content 변경에 의한 replaceSource 호출을 차단하여 띄어쓰기(스페이스) 및 엔터(개행) 입력 먹힘 현상 완전 해결
 *             2) viewRef.current?.hasFocus() 활성 상태 시 bulletNumbersAsText/normalizeVisualMarkdownSpacing의 실시간 자동 가공을 유예하여 입력 중 빈 줄 압축 및 서식 교란 방지
 *             3) .custom-preview-container 스크롤 리스너에서 viewRef.current?.hasFocus() 입력 상태 시 Monaco 스크롤 동기화 발화를 억제하여 나란히 모드 화면 흔들림 완전 차단
 * 🚨 @PATCH : **2026-10-17** — [빈 문단 엔터 입력 시 빈 행 확장 및 타이핑 시 축소·커서 점프 현상 원천 차단]:
 *             1) .visual-document-surface br.ProseMirror-trailingBreak 스타일을 display: inline !important, content: normal !important, margin: 0 !important, height: auto !important로 보호하여 ProseMirror 빈 행 캐럿의 인라인 서식 모델 보존
 *             2) .visual-document-surface p:empty 및 p:has(>br.ProseMirror-trailingBreak:only-child)의 margin: 0 0 0.25em !important 강제 덮어쓰기를 제거하고 min-height: 1em으로 정규화하여, 빈 문단과 텍스트 입력 문단의 상하 여백(margin-bottom) 및 행간(line-height)이 활성 서식 프로필과 100% 일치하도록 일원화
 * 🚨 @PATCH : **2026-10-17** — [문서보기(VisualDocumentEditor) 참조문헌 관리(ADD_REFERENCE) 및 인용(CITE/CITATION) 즉시 실행 연동]:
 *             1) Props에 onReferenceSettings 콜백을 추가하고 executeItem('add_reference' / 'vibe'), nativeCommands, commandRef 브리지('ADD_REFERENCE')에 연결하여 문서보기에서도 참조 파일 관리 모달(ReferenceManagerModal)이 즉시 실행되도록 개선
 *             2) commandRef 브리지에서 CITE/CITATION/ADD_REFERENCE/TOGGLE_CSS_STYLE 모달 호출 시 불필요한 view.focus() 호출로 모달 입력창 포커스가 탈취되지 않도록 처리하고, 인용 삽입 검증 시 view.state.doc.eq(pending.doc) 비교 및 단축키 preventDefault 적용으로 안정성 강화
 * 🚨 @PATCH : **2026-10-17** — [구분선(horizontal_rule / <hr>) 선택 시 구분선 앞 커서 자동 배치 및 즉시 타이핑 지원]:
 *             1) 구분선(<hr> 및 상하 여백 영역) 클릭·선택 시 placeCursorBeforeHorizontalRule을 호출하여 구분선 바로 앞(상단) 빈 문단으로 TextSelection 커서를 즉시 배치하고 포커스 및 깜빡임 캐럿 표시 보장
 *             2) 구분선 앞에 빈 문단이 없을 경우(문서 최상단, 텍스트 문단 직후, 기타 블록 직후 등) 구분선 바로 앞에 새 빈 문단(paragraph)을 자동 생성하고 커서를 진입시켜 즉시 타이핑 가능하도록 처리
 *             3) 구분선이 NodeSelection으로 선택된 상태에서 문자 타이핑(handleTextInput / compositionstart / Enter) 시 구분선이 덮어써져 삭제되지 않고 구분선 앞 문단에 안전하게 입력되도록 방어
 *             4) 구분선 블록 생성(툴바/슬래시 메뉴 '구분선') 시 하단 빈 문단(paragraph) 자동 보장
 * 🚨 @PATCH : **2026-10-17** — [이미지·미디어·수식 블록 선택 및 Ctrl+Enter 다음 행(본문) 이동 지원]:
 *             1) mediaNodeView 및 visual_math NodeView 클릭(mousedown/click) 시 NodeSelection 설정 및 에디터 포커스(view.focus) 유지 보장
 *             2) exitMediaBlock 커맨드를 구현하여 이미지·동영상·지도·수식 블록에서 Ctrl+Enter(Mod-Enter), Enter, ArrowDown 입력 시 블록 아래 다음 행(paragraph)으로 커서 즉시 이동(하단 행 미존재 시 자동 생성)
 *             3) 비편집(contenteditable="false") 미디어 요소 클릭 후 포커스가 분산된 상태에서도 Ctrl+Enter 입력 시 다음 행 이동이 100% 동작하도록 윈도우 키다운 보조 핸들러 연동
 * 🚨 @PATCH : **2026-10-17** — [7대 블록 요소(인용문·코드블록·이미지·동영상·지도·표·수식) 생성 시 하단 빈 행(paragraph) 자동 추가]:
 *             1) 인용문(setQuote/calloutEnter), 코드블록(setCodeBlock), 이미지(드롭·모달·붙여넣기), 동영상·지도(beginMediaRef), 표(TableModal onInsert), 수식(visual_math) 생성 시 블록 바로 아래에 빈 문단(paragraph)을 자동 추가하여 마우스 클릭으로 다음 작업을 즉시 이어갈 수 있도록 개선
 * 🚨 @PATCH : **2026-10-17** — [서식관리 목록 항목 줄 여백 및 들여쓰기 CSS 변수 연동]:
 *             1) .visual-document-surface li의 margin-bottom: 0 !important를 var(--li-margin-bottom, 6px)로 개선
 *             2) .visual-document-surface ul/ol의 padding-left: 2em !important를 var(--list-indent, 2em)으로 개선
 * 🚨 @PATCH : **2026-10-14** — [문서 보기(VisualDocumentEditor) 개요(TOC) 및 검색 점프·하이라이트 1:1 연동]:
 *             1) onrivi:source-cursor 이벤트에 detail.force, detail.term, detail.highlight 옵션을 추가하여 좌측 사이드바 개요/검색 클릭 시 포커스 상태와 무관하게 100% 점프 보장
 *             2) 검색어(term) 전달 시 ProseMirror 텍스트 선택 범위를 검색어 구간으로 정확히 지정하고 scrollIntoView 실행
 *             3) detail.highlight 활성화 시 domAtPos를 통해 해당 블록 엘리먼트(.preview-highlight-line) 펄스 하이라이트 부여
 * 🚨 @PATCH : **2026-10-14** — [useLayoutEffect DOM ref 클린업 안정화 (ESLint react-hooks 경고 해소)]:
 *             1) useLayoutEffect 진입 시점에 host.current를 로컬 변수 hostEl로 캡처하여 언마운트 및 클린업 시점의 ref 불일치 방지
 *             2) cleanup 함수에서 hostEl.removeEventListener('mouseleave')를 안전하게 호출하도록 수정하여 react-hooks/exhaustive-deps 빌드 경고 완전 해소
 * 🚨 @PATCH : **2026-10-14** — [시각 에디터 이미지 비트맵 클립보드 복사(copyImageToClipboard) 연동]: 이미지 컨트롤 '복사' 버튼 클릭 시 마크다운 텍스트 주소가 아닌 실제 이미지 바이너리/비트맵을 클립보드에 복사하여 붙여넣기 호환성 완벽 보장
 * 🚨 @PATCH : **2026-10-14** — [이미지 Alt 기본값 강제 폴백 제거]: 이미지 드롭 및 삽입 시 alt가 비어있을 때 'image'로 강제 대체하지 않고 빈 문자열("") 그대로 삽입되도록 개선
 * 🚨 @PATCH : **2026-10-14** — [구글 이미지 검색/외부 웹 이미지 드래그 앤 드롭 새 창 팝업 원천 차단 및 CORS 우회 다운로드·정밀 커서 삽입 완벽 구현]:
 *             1) 구글 이미지 검색(encrypted-tbn0.gstatic.com 등) 및 외부 웹 이미지 드롭 시 window.dragover/drop에서 e.preventDefault()를 100% 강제하여 브라우저의 파일 URL 새 창 이동 및 Chrome 팝업을 원천 차단
 *             2) fetchExternalImageFile(Electron net.fetch 기반 CORS 우회)을 연동하여 웹 이미지 바이너리를 로컬 media 폴더에 파일로 안전 보존 후 표준 상대경로로 삽입
 *             3) 다운로드 실패 시(오프라인, 엄격한 CORS 등)에도 webUrl 마크다운 직접 삽입으로 안전 폴백하여 에러나 새 창 팝업 없이 100% 즉시 렌더링 보장
 *             4) 마우스로 이미지 드래그 중 마우스를 놓기 전(dragover) 실시간으로 마우스 커서 위치를 추적하여 고시인성 세로 막대 깜빡임 커서(3.5px 코발트 블루 I-beam 서리프 및 '📍 여기에 이미지 삽입' 플로팅 뱃지)가 마우스를 따라 실시간 이동하도록 구현
 *             5) 드래그 호버 중 ProseMirror 내부 텍스트 선택 영역(TextSelection.near)을 실시간 동기화하여 에디터 본체 커서가 마우스 포인터와 1:1 일치하여 움직이도록 처리
 *             6) 텍스트 문단 중간에 커서가 위치한 상태에서 마우스를 놓을 경우(insertMode: 'split') canSplit을 통해 기존 문단을 커서 위치에서 둘로 깔끔히 나누고(tr.split) 그 사이에 이미지 블록을 즉시 삽입
 *             7) 문단 앞(insertMode: 'before') 또는 문단 뒤(insertMode: 'after') 드롭 시 해당 블록 앞/뒤에 정밀 배치하고, 컨테이너 패딩 영역 드롭(INSERT_SAVED_IMAGE:) 시에도 lastDropTargetRef를 참조하여 정확한 커서 위치 삽입 보장
 *             8) 드롭 완료, dragleave, dragend 시 커서 및 가이드 라인 DOM 요소를 즉시 숨기고 컴포넌트 unmount 시 메모리 누수 없이 완전 제거
 * 🚨 @PATCH : **2026-10-14** — [이미지 드래그 앤 드롭 네이티브 DOM 처리 및 ProseMirror posAtCoords 결함 완전 해결·새창/Base64 방어]:
 *             1) ProseMirror handleDrop이 블록 경계선/여백에서 posAtCoords null 반환 시 이벤트를 무시하여 이미지 삽입이 누락되고 드롭선이 멈추던 버그를 handleDOMEvents.drop 네이티브 핸들러로 완전 대체하여 100% 정상 삽입 보장
 *             2) 드롭 및 드래그 종료(dragend/dragleave/drop/mouseup/mouseleave) 시 clearDropIndicator()를 즉각 동기 호출하여 파란색 가이드 라인 및 삽입 위치 뱃지 잔상 완전 소거
 *             3) drop 이벤트에서 e.preventDefault() 및 e.stopPropagation()을 발화하여 브라우저/Electron의 파일 URL 새 창 이동 및 빈 이미지 창 팝업 원천 차단
 *             4) Base64 데이터 및 이미지 파일 드롭 시 마크다운에 Base64를 인라인 삽입하지 않고 활성 리소스 폴더(media/ 하위 또는 구글 드라이브 media)에 바이너리 파일로 안전 저장 후 표준 마크다운 상대 경로로 삽입
 *             5) resolveDropInsertPos에서 posAtCoords가 null인 경우에도 elementFromPoint 및 DOM childIndex 기하학을 추적하여 파란색 가이드 라인이 지목한 블록 앞/뒤(depth 0)에 1:1 일치하게 블록 노드 삽입
 *             6) 드롭 실패 시 불필요한 ImageModal 모달 창이 팝업되는 연결 오류를 차단
 * 🚨 @PATCH : **2026-10-14** — [각주 영역 헤더(Footnotes Header)와 각주 1번 노드 완전 분리 및 세로 여백 대폭 축소]:
 *             1) 각주 영역 구분 헤더('📌 각주 (Footnotes)')를 첫 번째 각주(visual_footnote_def)의 NodeView 내부에서 완전히 분리하여 ProseMirror 데코레이션 플러그인(createFootnoteHeaderPlugin)의 독립 위젯 데코레이션(Decoration.widget)으로 전환
 *             2) 각주 1번 선택 시 헤더까지 한 덩어리로 파랗게 묶여 선택되던 결함 및 각주 1번 삭제 시 각주 영역 전체가 함께 날아가던 치명적 결함 완전 해소 (1번 삭제 시 2번 상단으로 헤더 자동 유지 이동, 모든 각주 소멸 시에만 헤더 자동 제거)
 *             3) 각주 헤더 뱃지(.visual-footnote-area-badge)의 폰트/줄간격/패딩 인플레이션을 진화하고 헤더와 첫 각주 사이의 비정상적 80px+ 간격을 6~8px의 콤팩트하고 정갈한 여백으로 밀착 최적화
 *             4) .visual-document-surface의 white-space: pre-wrap 상속으로 인해 템플릿 리터럴 줄바꿈/들여쓰기 공백이 아이콘과 문자 사이에 66px 너비로 팽창하던 결함을 수정하여 템플릿 인라인 결합 및 gap: 3.5px, white-space: nowrap 적용으로 아이콘과 텍스트('각주 (Footnotes)')를 초밀착 정렬
 * 🚨 @PATCH : **2026-10-14** — [이미지 드래그 앤 드롭 실시간 타겟 행 하이라이트 & 드롭 인디케이터 및 문서보기 서식관리 연동]:
 *             1) 이미지 드래그오버(dragover) 시 마우스를 놓기 전까지 삽입 대상 행/블록을 .onrivi-drop-line-highlight로 실시간 표시하고 플로팅 드롭 가이드 라인(3px 코발트 라인 및 뱃지)을 동적 렌더링
 *             2) dragleave/drop/dragend 시 인디케이터 및 하이라이트를 즉각 말끔히 제거하여 잔상 방지
 *             3) onStyleSettings 콜백 연동 및 TOGGLE_CSS_STYLE/styleSettings 명령어 처리를 통해 문서보기 상태에서도 서식관리(CssStyleModal) 즉시 오픈 지원
 * 🚨 @PATCH : **2026-10-14** — [문서보기(VisualDocumentEditor) 각주 정리(ORGANIZE_FOOTNOTES) 커맨드 탑재 및 실시간 재정렬 연동]:
 *             1) visualCommandRef에 ORGANIZE_FOOTNOTES 핸들러를 등록하여 도구 메뉴에서 각주 정리 실행 시 문서보기 상태에서도 본문 순서 기반 1번부터 순차 재정렬 즉각 반영
 *             2) Props에 onToast 콜백을 연동하여 정리 결과(재정렬 완료/미변경/각주없음)를 토스트로 안내
 * 🚨 @PATCH : **2026-10-14** — [머메이드 편집기(textarea) 및 각주(footnote) 입력 시 커서(Caret) 고시인성 표시 지원]:
 *             1) .visual-document-surface의 caret-color: transparent로 인해 자식 입력 요소의 커서가 투명화되던 결함을 해결하기 위해 textarea, input, .visual-mermaid-code-input, .visual-footnote-text에 caret-color: #2563eb !important(다크모드 #60a5fa) 지정
 *             2) 각주 입력기(visual-footnote-text)에 cursor: text, data-placeholder 안내 문구 및 :empty::before 플레이스홀더를 장착하여 빈 각주에서도 커서 높이 및 타이핑 위치 100% 보장
 * 🚨 @PATCH : **2026-10-14** — [각주(Footnote) 영역 시각적 구분선/헤더 표시 및 서식관리 폰트 크기·스타일 실시간 연동]:
 *             1) 본문과 각주 영역을 명확히 구분할 수 있도록 첫 번째 각주 상단에 '📌 각주 (Footnotes)' 배지 및 구분선(visual-footnote-area-header) 자동 표시
 *             2) 각주 본문 텍스트 크기를 기존 16~18px 본문 크기 종속에서 벗어나 12.5px 콤팩트 규격으로 최적화하고 본문 되돌아가기(↩) 및 호버 삭제(×) 버튼 장착
 *             3) 서식관리(CssStyleModal)의 각주 글자 크기(font-size), 글자 색상(color), 굵기(font-weight), 줄간격(line-height) 변경 사항이 문서보기에 1:1 실시간 반영되도록 dynamicCssString 연동
 * 🚨 @PATCH : **2026-10-14** — [코드 블록(code_block) 및 다이어그램 블록 손쉬운 원클릭/키보드 삭제 지원]:
 *             1) 일반 코드 블록(visual-code-block) 헤더에 원클릭 '삭제' 버튼(deleteBtn) 추가하여 불필요한 코드 블록 즉각 제거 지원
 *             2) 빈 코드 블록에서 Backspace/Delete 입력 시 이전 블록으로 이동하며 자동 삭제 또는 일반 문단(paragraph)으로 즉시 변환
 *             3) Mod-Shift-k(Ctrl+Shift+K) 단축키를 통한 현재 코드 블록 즉각 삭제 커맨드 구현
 *             4) 머메이드(Mermaid) 다이어그램 카드 헤더 컨트롤 및 하단 서랍에 각각 '🗑️ 삭제', '다이어그램 삭제' 버튼을 탑재하여 다이어그램 원클릭 완전 삭제 지원
 * 🚨 @PATCH : **2026-10-14** — [머메이드(Mermaid) 다이어그램 카드 내부 통합 접기/펼치기 편집 서랍 구현]:
 *             1) 다이어그램 아래 분리된 독립 박스로 표시되던 편집기를 상위 다이어그램 카드 내부 하단 서랍(visual-mermaid-container)으로 완전 통합
 *             2) 다이어그램 카드 상단 헤더 '✏️ 코드 편집' 버튼 및 하단 '머메이드 코드 편집' 바 클릭 시 다이어그램 카드 안에서 매끄럽게 펼치기/접기 토글
 *             3) 텍스트에어리어 내 Tab 키 공백(2칸) 입력 지원 및 타이핑 시 실시간 렌더링 반영, '코드 접기'/'적용 완료' 제공
 * 🚨 @PATCH : **2026-10-14** — [머메이드(Mermaid) 다이어그램 전용 실시간 편집기(visual-mermaid-editor) 활성화]:
 *             1) 머메이드(```mermaid) 블록에 전용 다이어그램 코드 편집 드롭다운 및 고대비 모노 텍스트에어리어 연동
 *             2) 250ms 디바운스 실시간 프리뷰 렌더링 및 '적용 완료' 원클릭 히스토리 커밋 지원
 *             3) 일반 텍스트/HTML 블록에는 편집 UI가 노출되지 않고 오직 머메이드 블록에서만 정밀하게 편집 기능 활성화
 * 🚨 @PATCH : **2026-10-14** — [문서보기(VisualDocumentEditor) 내 각주(Footnote) 네이티브 삽입/인라인 편집 및 점선 박스/편집창 UI 완전 제거]:
 *             1) 각주 버튼(fn), 단축키(Ctrl+Alt+F), 슬래시(/footnote, /각주) 실행 시 나란히 보기 전환 없이 현재 문서보기에서 본문 참조[^N] 및 하단 정의[^N]: 를 즉각 생성 삽입
 *             2) visual_footnote_ref(클릭 시 하단 각주로 점프) 및 visual_footnote_def(본문으로 점프 및 각주 내용 직접 인라인 타이핑 편집) 전용 NodeView 장착
 *             3) source_block의 <details><summary>편집</summary> UI 및 점선 박스 테두리(border: 1px dashed)를 완전 제거하여 깔끔한 원문 렌더링 보장
 * 🚨 @PATCH : **2026-10-14** — [인용문 내 [!태그]([!Note], [!참고] 등) 타이핑 및 엔터 시 콜아웃 알림상자 자동 변환(calloutEnter) 연동]:
 *             1) 인용문(blockquote) 내에서 [!Note], [!참고] 등 입력 후 엔터 입력 시에도 즉각 해당 스타일의 콜아웃 박스로 자동 전환되도록 calloutEnter 커맨드 추가
 *             2) 태그 텍스트가 일반 본문으로 잔존하여 마크다운 소스에서 역슬래시 이스케이프(\[\!Note\])로 오분기되던 결함을 원천 방어하고 alertType 속성으로 정규화
 * 🚨 @PATCH : **2026-10-14** — [제목(Heading) 태그 내 엔터(Enter) 입력 시 다음 행(문단) 정상 이동 및 제목 행 동반 밀림 결함 완전 해결]:
 *             1) 제목(H1~H6) 끝에서 엔터(Enter) 입력 시 제목 행이 아래로 함께 밀리거나 다음 행으로 넘어가지 않던 현상을 해결하기 위해 전용 headingEnter 커맨드 구현
 *             2) 제목 끝(parentOffset === contentSize)에서 엔터 시 제목 아래에 신규 본문 문단(paragraph)을 깔끔하게 생성하고 커서를 다음 행으로 즉각 이동 보장
 *             3) 내용이 빈 제목(contentSize === 0)에서 엔터 입력 시 제목 태그를 일반 문단으로 즉시 변환하여 유령 헤딩 태그 및 불필요한 빈 행 누적 원천 차단
 *             4) 제목 앞머리(parentOffset === 0)에서 엔터 시 제목 위에 빈 문단을 생성하여 기존 제목 행 구조 보존
 * 🚨 @PATCH : **2026-10-14** — [엔터(Enter) 입력 시 문단 분할(splitBlock) 및 리스트 연속 생성(splitListItem) 복원, Shift+Enter 소프트 개행(<br>) 정규화, 빈 행 과도한 높이 축소(min-height: 1.25em, margin: 0 0 0.5em)]:
 *             1) 문서보기(VisualDocumentEditor)에서 엔터(Enter) 입력 시 단일 문단 내 강제 <br> 삽입으로 문단이 끊기지 않고 리스트 전환이 차단되던 결함을 전면 수정하여, 엔터 입력 시 정상 문단 분할(splitBlock) 및 리스트 연속 항목 생성 보장
 *             2) Shift+Enter 입력 시 문단 내 소프트 줄바꿈(<br> hard_break)이 작동하도록 단축키를 명확히 분리
 *             3) 빈 행(p:empty)의 과도한 44px+ 여백을 min-height: 1.25em 및 margin: 0 0 0.25em으로 최적화하여 깔끔한 행간 복원
 * 🚨 @PATCH : **2026-10-14** — [리스트(bullet/ordered/task) 마우스 클릭 위치 1:1 정밀 커서 배치 및 1열 쏠림 결함 해결]:
 *             1) synchronizeTextSelection에서 DOM 선택 노드가 텍스트 노드가 아닐 때(ELEMENT_NODE) 자식 인덱스(0) 매핑으로 인해 커서가 행 시작(column:1)으로 강제 리셋되던 결함 방어
 *             2) handleClick에 li 요소 클릭 감지 및 posAtCoords 기반 정밀 위치 추적을 탑재하여 글머리 기호/체크박스/본문 글자 클릭 시 해당 클릭 좌표로 즉각 TextSelection 배치
 *             3) list_item NodeView의 dom(li) 및 contentDOM(div)에 cursor: text 스타일을 부여하여 리스트 전 영역 텍스트 커서 시인성 일원화
 * 🚨 @PATCH : **2026-10-19** — [상단 인쇄 도구 UI 상태바 이전 및 onrivi:toggle-page-guides 이벤트 동기화 연동]:
 *             1) 에디터 본문 상단의 onrivi-print-tools 툴바를 제거하여 본문 집필 공간을 극대화하고 하단 상태바 액션 아이콘으로 통합
 *             2) onrivi:toggle-page-guides 전역 이벤트를 수신하여 상태바의 토글 조작과 DocumentPageGuides 렌더링을 실시간 동기화
 * 🚨 @PATCH : **2026-10-14** — [수식 옆 글쓰기(공백 보장) 및 블록 수식 다음 줄 즉각 집필 환경 지원]:
 *             1) visual_inline_math 삽입 시 후행 공백 텍스트 노드를 함께 생성하고 커서를 그 뒤로 이동시켜 인라인 수식 바로 옆에 끊김 없이 글쓰기 보장
 *             2) visual_math 블록 수식 삽입 시 바로 다음 줄에 신규 본문 문단(paragraph)을 자동 생성하고 커서를 배치하여 블록 수식 아래 즉각 집필 지원
 *             3) visual_math 및 visual_inline_math 전용 nodeView를 등록하여 수식을 코드블록/텍스트가 아닌 순수 KaTeX 렌더링으로 본문에 표시
 *             4) 블록 및 인라인 수식 더블클릭 시 수식 에디터 모달(FormulaModal)을 각각 블록/인라인 모드로 호출하여 LaTeX 즉시 수정 및 상호 전환 반영
 * 🚨 @PATCH : **2026-10-13** — [전용 인터랙티브 달력 모달(CalendarModal) 연동 및 위지윅 본문 날짜/시간 직접 삽입]:
 *             1) 슬래시 명령어(/now, /날짜, /달력) 및 툴바 날짜 커맨드 실행 시 전용 CalendarModal 대화상자 팝업 연동
 *             2) 달력에서 선택한 일자 및 서식을 현재 ProseMirror 위지윅 커서 위치에 즉시 텍스트 노드로 삽입
 * 🚨 @PATCH : **2026-10-13** — [문서링크(taglink) 커서 위치 문서선택창 호출 및 문서링크 클릭 시 해당 페이지 이동 구현]:
 *             1) onDocLinkDialog prop을 통해 문서보기 내 커서 위치(view.coordsAtPos)에 문서선택창(DocLinkPicker) 팝업 연동
 *             2) 문서 선택 시 커서 위치에 [문서명](<상대경로.md>) 네이티브 링크 마크 즉시 삽입 지원
 *             3) 본문 속 문서링크(.md, .markdown, knowledge:// 등) 클릭 시 onFileOpen(handleFileOpenByPath)을 호출하여 해당 문서/탭으로 즉각 전환 이동 완비
 * 🚨 @PATCH : **2026-10-13** — [문서보기 본문 하이퍼링크(<a>) 클릭 시 외부 브라우저 새 창 열기 연동]:
 *             1) EditorProps에 handleClick 핸들러를 장착하여 본문 내 링크 클릭 시 Electron(openExternal)/웹(window.open) 새 창으로 즉시 이동
 *             2) 내부 앵커(#제목) 링크 클릭 시 해당 섹션으로 부드러운 스크롤(scrollIntoView) 이동 지원
 *             3) .visual-document-surface a에 color(#1d4ed8), 밑줄 및 cursor:pointer 스타일을 부여하여 링크 식별성 및 호버 인터랙션 강화
 * 🚨 @PATCH : **2026-10-13** — [슬래시(/) 명령어 감지 및 실행 장애 완전 해소]:
 *             1) 줄바꿈(<br> hard_break) 바로 뒤에서 / 입력 시 textBetween의 leafText 누락으로 앞 글자와 결합되어 매칭이 실패하던 결함 완전 수정
 *             2) nativeCommands['h1'~'h6']에 setHeadingBlock을 연결하여 슬래시 메뉴에서 제목 명령 정상 전환 보장
 *             3) slashPattern에 전각 슬래시(／) 관용 지원 및 화면 하단 팝업 배치(spaceBelow) 클리핑 방어 완비
 * 🚨 @PATCH : **2026-10-13** — [하이퍼링크 전용 LinkModal 모달 폼 연동 및 텍스트·URL 2단 입력 지원]:
 *             1) window.prompt 대신 텍스트(예: 온리비)와 주소(URL)를 직관적으로 입력하는 LinkModal 모달 폼 전면 연동
 *             2) 선택 텍스트가 없는 상태에서도 모달에서 텍스트와 주소를 직접 지정하여 커서 위치에 즉시 하이퍼링크 생성 지원
 *             3) Ctrl+K 단축키, 플로팅 툴바(🔗), 상단 컨트롤(link)에서 LinkModal 즉시 호출 및 프로토콜 프리셋 지원
 * 🚨 @PATCH : **2026-10-13** — [고시인성 3px 도톰한 단일 커서 최적화 및 네이티브 커서 2중 중복 방어]:
 *             1) .visual-document-surface의 caret-color를 transparent로 지정하여 네이티브 1px 얇은 커서와의 2중 커서 중복을 완전 차단
 *             2) visualCaret 고도화와 연동하여 눈이 편안한 3px 코발트 블루 단일 커서 및 깜빡임 애니메이션 제공
 * 🚨 @PATCH : **2026-10-13** — [문서보기 링크 입력 지원 강화 및 Ctrl+K 단축키 연동]:
 *             1) keymap에 'Mod-k' 바인딩 추가하여 선택 텍스트에 즉각 하이퍼링크 주소 입력 팝업 연동
 *             2) visualMarkdownInputRules와 연동되어 본문에서 [텍스트](url) 타이핑 및 Ctrl+K 단축키로 직접 링크 작성 완비
 * 🚨 @PATCH : **2026-10-13** — [밑줄(<u>) 네이티브 인라인 마크(underline) 연동 및 위지윅 본문 직접 편집 지원]:
 *             1) visualSchema.marks.underline 등록에 맞춰 commands['UNDERLINE'], nativeCommands['underline'], keymap('Mod-u') 연동
 *             2) 밑줄 서식 적용 시 별도 source_block(원문 편집창)으로 빠지지 않고 에디터 표면에서 즉시 밑줄 렌더링 및 직접 타이핑/수정 가능
 * 🚨 @PATCH : **2026-10-13** — [제목 1~6 서식 명령 적용 시 앞머리 잔여 해시(#) 기호 자동 정돈 및 제목2 정상 전환 보장]:
 *             1) 툴바/슬래시 커맨드의 '제목 1~6'(H1~H6) 실행 시 텍스트 앞머리에 잘못 남아있던 마크다운 해시 접두사(^(?:#{1,6}\s*))를 자동 정리(setHeadingBlock)
 *             2) 사용자가 기존 문단에서 오타나 이전 변환으로 '# #2장'처럼 해시가 본문에 박힌 경우에도 제목 2 클릭 시 정상적인 H2 제목으로 변환 보장
 */
'use client';
import { quoteIndent, withIndependentQuotes, protectQuoteBoundary } from '@/lib/visualQuoteCommands';
import { resolveDocumentLink, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';
import { removeEmptySignatureBlocks } from '@/lib/signatureCleanup';
import { removeOrphanFootnotes } from '@/lib/footnoteCleanup';
import { clearMarkdownFormatting } from '@/lib/clearMarkdownFormatting';
import { hasHeadingNumber, numberHeadingTransaction, type HeadingNumberSetting } from '@/lib/headingNumbering';
import { nextReportNumber } from '@/lib/aiFriendlyReport';


import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Fragment, Slice, MarkType, ResolvedPos, type Node as DocumentNode } from 'prosemirror-model';
import type { SearchEditorHost } from '@/lib/documentFind';
import { createPortal } from 'react-dom';
import TableModal from '@/components/TableModal';
import LinkModal from '@/components/LinkModal';
import CalendarModal from '@/components/CalendarModal';
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import { selectedList, removeListMarkerAtStart, moveUpFromEmptyOrderedItem, exitEmptyListItem, joinOrderedListsAcrossEmptyParagraph, extendSelectionToListEnd, deleteNextListBoundary, deleteEmptyParagraphBeforeList, independentIndentListItem, independentLiftListItem, indentWholeList, outdentWholeList, moveUpAcrossListBoundary, moveDownAcrossListBoundary, deleteAtEndOfList } from '@/lib/visualListCommands';
import PrintPaginationPreview from '@/components/PrintPaginationPreview';
import { readPaginationSettings, writePaginationSettings, type PrintBreakAnchor } from '@/lib/documentPaginationSettings';
import { browserAccountStorage as pageStorage } from '@/lib/browserAccountStorage';
import { bulletNumbersAsText } from '@/lib/bulletNumberText';
import { tableContext, tableAction, moveTableCell, tableEnter, clearMultiCellTableSelection, hasMultiCellTableSelection } from '@/lib/visualTableCommands';
import VisualReadOnlyMarkdownBlock from '@/components/VisualReadOnlyMarkdownBlock';
import { EditorState, Selection, TextSelection, NodeSelection, Command, Plugin, PluginKey } from 'prosemirror-state';
import {VisualAITargets} from '@/lib/ai/visualTarget';
import type {AITarget} from '@/lib/ai/types';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { mediaDetails, copyMediaSource, copyImageToClipboard, type MediaKind } from '@/lib/mediaMarkup';
import BibliographySummary from '@/components/BibliographySummary';
import {parseBibliography,citationPattern,citationLabel} from '@/lib/bibliography';
import { desktopClipboardImage } from '@/lib/desktopClipboard';
import { markdownPasteInTableCellTransaction, markdownPasteTransaction } from '@/lib/visualMarkdownPaste';
import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import { sanitizePastedText } from '@/utils/pasteHandlers';
import { baseKeymap, chainCommands, exitCode, lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { splitListItem, sinkListItem, liftListItem } from 'prosemirror-schema-list';
import { history, undo, redo, closeHistory } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { equalColumnRatios, validColumnRatios, resizeTableBoundary } from '@/lib/tableColumnRatios';
import { createVisualDocumentCodec, visualSchema, visualImageDetails, normalizeVisualMarkdownSpacing } from '@/lib/visualDocumentCodec';
import { visualMarkdownInputRules } from '@/lib/visualMarkdownInputRules';
import { undoInputRule } from 'prosemirror-inputrules';
import { visualCommandCatalog, filterVisualCommands } from '@/lib/visualCommandCatalog';
import { TOOLBAR_ITEMS, configuredHotkeyItem } from '@/lib/toolbarConfig';
import { installVisualCaret } from '@/lib/visualCaret';
import { organizeMarkdownFootnotes } from '@/lib/footnoteOrganizer';
import { cleanMarkdownDocument } from '@/utils/markdownCleaner';
import { parseDroppedDataToBlob, fetchExternalImageFile } from '@/lib/resourceMedia';
import { canSplit } from 'prosemirror-transform';
import katex from 'katex';

import {
  slashPattern,
  type ActiveTagInfo,
  getActiveTagInfo,
  setHeadingBlock,
  setCodeBlock,
  backspaceInCodeBlock,
  deleteInCodeBlock,
  removeHeadingAtStart,
  headingEnter,
  calloutEnter,
  exitQuote,
  ATOM_BLOCK_TYPES,
  FIRST_BLOCK_INSERT_TYPES,
  exitMediaBlock,
  placeCursorBeforeHorizontalRule,
  openParagraphAfterHorizontalRule,
  findClickedHorizontalRulePos,
  emptyParagraphAtClick,
  paragraphLineEndAtClick,
  createListNormalizationPlugin,
  makeChecklist,
  indentBlockquote,
  outdentBlockquote,
  safeListIndent,
  indentDocument,
  synchronizeTextSelection,
  isHeadAtBlockBoundary,
  extendSelectionVerticallyAcrossBlocks,
  handlePageMove,
  type DropTargetInfo,
  resolveDropTarget,
  resolveDropInsertPos,
  resolveDocPath,
  VisualSlashMenu,
  VisualEditorToolbar,
  VISUAL_EDITOR_STYLES,
  createVisualNodeViews,
} from '@/components/visualEditor';

type Codec = ReturnType<typeof createVisualDocumentCodec>;
const sessions = new Map<string, { source: string; state: EditorState; codec: Codec; scrollTop?:number; scrollLeft?:number }>();
type Props = { content: string; onChange: (markdown: string) => void; readOnly?: boolean;
  headingNumbering?: HeadingNumberSetting[];
  onSourceScroll?: (offset:number)=>void;
  tabSize?:number;
  pageStyle?:any;
  onPdfPagePreview?: (signal: AbortSignal) => Promise<string | void>;
  spellCheck?:boolean;
  onSourceCursor?: (offset:number,reveal?:boolean)=>void;
  documentId?: string; commandRef?: React.MutableRefObject<((command: string) => boolean) | null>;
  aiTargetRef?: React.MutableRefObject<((scope?:import('@/lib/ai/types').AIEditScope)=>AITarget|null)|null>;
  customHotkeys?: Record<string, string>;
  customCommands?: Record<string, string>;
  onFloatingToolbar?: (visible: boolean, position: { top: number; left: number }) => void;
  floatingToolbarVisible?: boolean;
  renderImage?: (source: string) => React.ReactNode;
  onImageFile?: (file: Blob) => Promise<string | null>;
  onMediaDialog?: (kind: MediaKind, source: string | null, insert: (code: string) => boolean) => void;
  onImageDialog?: (source: string | null, insert: (path: string, alt: string, fullMarkdown?: string) => boolean) => void;
  onDocLinkDialog?: (position: { top: number; left: number }, insert: (targetUrl: string, displayTitle: string) => boolean, initialSelectedText?: string) => void;
  onFormulaDialog?: (apply: (formula: string) => boolean | void, initialLatex?: string) => void;
  currentFilePath?: string;
  onFileOpen?: (filePath: string, heading?: string) => void;
  onSourceAction?: (id: string, source: string, from: number, to: number) => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onStyleSettings?: () => void;
  onReferenceSettings?: () => void;
  onCitation?: () => void;
  bibContent?: string;
  showBibliography?: boolean;
};

export default function VisualDocumentEditor({ content, onChange, readOnly = false, headingNumbering = [], tabSize=4, spellCheck=false, pageStyle, onPdfPagePreview, onSourceScroll, onSourceCursor, documentId, commandRef, aiTargetRef, customCommands = {}, customHotkeys = {}, onSourceAction, onFloatingToolbar, floatingToolbarVisible, renderImage, onImageFile, onImageDialog, onMediaDialog, onDocLinkDialog, onFormulaDialog, currentFilePath, onFileOpen, onToast, onStyleSettings, onReferenceSettings, onCitation, bibContent='', showBibliography=true }: Props) {
  const citationEntries=React.useMemo(()=>{
    const parsed=parseBibliography(bibContent);
    return new Map(parsed.entries.filter(e=>!parsed.duplicates.some(k=>k.toLowerCase()===e.key.toLowerCase())).map(e=>[e.key.toLowerCase(),e]));
  },[bibContent]);
  const bibRef=useRef(citationEntries);bibRef.current=citationEntries;
  const citationCallback=useRef(onCitation);citationCallback.current=onCitation;
  const pendingCitation=useRef<{doc:import('prosemirror-model').Node; selection:Selection}|null>(null);
  const openCitation=(removeSlash=false)=>{
    const view=viewRef.current;if(!view || !view.editable)return;
    if(removeSlash && slashRange.current){const range=slashRange.current;view.dispatch(view.state.tr.delete(range.from,range.to));slashRange.current=null;setSlash(false);}
    pendingCitation.current={doc:view.state.doc,selection:view.state.selection};citationCallback.current?.();
  };
  const openCitationRef=useRef(openCitation);openCitationRef.current=openCitation;

  useEffect(()=>{
    const insert=(event:Event)=>{
      const pending=pendingCitation.current,view=viewRef.current;
      if(!pending || !view)return;
      event.preventDefault();pendingCitation.current=null;
      if(!view.state.doc.eq(pending.doc) || !view.editable){onToastRef.current?.('문서가 변경되었습니다. 인용을 다시 선택해 주세요.','warning');return;}
      const key=(event as CustomEvent).detail?.key;
      if(typeof key!=='string'||!key||/[\]\r\n]/.test(key))return;
      view.dispatch(closeHistory(view.state.tr.setSelection(pending.selection).insertText(`[@${key}]`)).scrollIntoView());view.focus();
    };
    window.addEventListener('onrivi:insert-citation',insert);
    const cancel=()=>{pendingCitation.current=null;};
    window.addEventListener('onrivi:cancel-citation',cancel);

    const addBibEntry = (event: Event) => {
      const view = viewRef.current;
      if (!view || !view.editable) return;
      event.preventDefault();
      const text = (event as CustomEvent).detail?.text;
      if (!text) return;

      let tr = view.state.tr;
      let existingPos = -1;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
          existingPos = pos;
          return false;
        }
      });

      const pNode = visualSchema.nodes.paragraph.create(null, visualSchema.text(text));
      const itemNode = visualSchema.nodes.list_item.create(null, pNode);

      if (existingPos >= 0) {
        let bulletListPos = -1;
        let bulletListNode: any = null;
        view.state.doc.descendants((node, pos) => {
          if (pos > existingPos && node.type.name === 'bullet_list' && bulletListPos === -1) {
            bulletListPos = pos;
            bulletListNode = node;
            return false;
          }
        });

        if (bulletListPos >= 0 && bulletListNode) {
          const insertPos = bulletListPos + bulletListNode.nodeSize - 1;
          tr = tr.insert(insertPos, itemNode);
        } else {
          const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);
          const node = view.state.doc.nodeAt(existingPos);
          const insertPos = existingPos + (node ? node.nodeSize : 0);
          tr = tr.insert(insertPos, listNode);
        }
      } else {
        const headingNode = visualSchema.nodes.heading.create({ level: 2 }, visualSchema.text('참고문헌'));
        const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);
        tr = tr.insert(tr.doc.content.size, [headingNode, listNode]);
      }

      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      if (onToastRef.current) onToastRef.current('참고문헌 목록에 추가되었습니다.', 'success');
    };
    window.addEventListener('onrivi:add-bibliography-entry', addBibEntry);

    return()=>{
      window.removeEventListener('onrivi:insert-citation',insert);
      window.removeEventListener('onrivi:cancel-citation',cancel);
      window.removeEventListener('onrivi:add-bibliography-entry', addBibEntry);
    };
  },[]);
  useEffect(()=>{const view=viewRef.current;if(view)view.dispatch(view.state.tr.setMeta('onrivi:bibliography',true));},[bibContent]);
  const cursorFrame=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(cursorFrame.current),[]);
  const cursorCallback=useRef(onSourceCursor);cursorCallback.current=onSourceCursor;
  useEffect(()=>{if(viewRef.current)viewRef.current.dom.dataset.editorTabSize=String(tabSize);},[tabSize]);
  useEffect(()=>{
    const view=viewRef.current;
    if(view)view.setProps({attributes:{...(view.props.attributes as Record<string,string>),spellcheck:String(spellCheck)}});
  },[spellCheck]);
  const host = useRef<HTMLDivElement>(null);
  const scrollCallback=useRef(onSourceScroll);scrollCallback.current=onSourceScroll;
  useEffect(()=>{
    let frame=0;
    const sync=(event:Event)=>{
      const container=host.current?.closest('.custom-preview-container');
      if(!container || event.target!==container || frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;const view=viewRef.current,codec=codecRef.current;if(!view || !codec || !scrollCallback.current)return;
        const totalLen = codec.serialize(view.state.doc).length;
        if (container.scrollTop <= 5) {
          scrollCallback.current(0);
          return;
        }
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0 && container.scrollTop >= maxScroll - 5) {
          scrollCallback.current(totalLen);
          return;
        }
        const rect=container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const topY = rect.top + 50;
        const point=view.posAtCoords({left: centerX, top: topY});
        if(point){
          const position=TextSelection.near(view.state.doc.resolve(point.pos)).head;
          const token='ONRIVISCROLLMAP';
          const offset=codec.serialize(view.state.tr.insertText(token,position).doc).indexOf(token);
          if(offset>=0){scrollCallback.current(offset);return;}
        }
        const ratio=container.scrollTop/Math.max(1,maxScroll);
        scrollCallback.current(Math.round(totalLen*Math.max(0,Math.min(1,ratio))));
      });
    };
    document.addEventListener('scroll',sync,true);
    return()=>{document.removeEventListener('scroll',sync,true);cancelAnimationFrame(frame);};
  },[]);

  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const onStyleSettingsRef = useRef(onStyleSettings);
  onStyleSettingsRef.current = onStyleSettings;
  const onReferenceSettingsRef = useRef(onReferenceSettings);
  onReferenceSettingsRef.current = onReferenceSettings;

  const imageSequence = useRef(0);
  const [imageMounts, setImageMounts] = useState<{ id: number; element: HTMLElement; source: string }[]>([]);
  const viewRef = useRef<EditorView | null>(null);
  const caretRef = useRef<ReturnType<typeof installVisualCaret> | null>(null);
  const onFileOpenRef = useRef(onFileOpen);
  onFileOpenRef.current = onFileOpen;
  const currentFilePathRef = useRef(currentFilePath);
  currentFilePathRef.current = currentFilePath;
  const images = useRef({ renderImage, onImageFile, onImageDialog, onMediaDialog, onDocLinkDialog, onFormulaDialog });
  images.current = { renderImage, onImageFile, onImageDialog, onMediaDialog, onDocLinkDialog, onFormulaDialog };
  const imageTargets = useRef(new Set<{ from: number; to: number; source?: string; valid: boolean }>());
  const beginMediaRef = useRef<(kind: MediaKind, source?: string, position?: number) => void>(() => {});
  const beginImageRef = useRef<(source?: string, position?: number, file?: Blob) => void>(() => {});
  const executeDropRef = useRef<(view: EditorView, e: DragEvent) => Promise<boolean>>(() => Promise.resolve(false));
  const updateDropRef = useRef<(view: EditorView, e: DragEvent) => void>(() => {});
  const lastDropTargetRef = useRef<DropTargetInfo | null>(null);
  const lastDispatchedPosRef = useRef<number | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const headingFormatsRef = useRef({ current: headingNumbering, previous: headingNumbering, readOnly });
  headingFormatsRef.current.current = headingNumbering;
  headingFormatsRef.current.readOnly = readOnly;
  const hotkeysRef = useRef(customHotkeys);
  hotkeysRef.current = customHotkeys;
  const emitted = useRef(content);
  const [inTable,setInTable] = useState(false);
  const [tableToolbarDismissed, setTableToolbarDismissed] = useState(false);
  const currentTablePosRef = useRef<number | null>(null);
  const [firstBlockNeedsParagraph,setFirstBlockNeedsParagraph] = useState(false);
  const [tableToolPosition,setTableToolPosition] = useState({top:8,left:8,width:700});
  useEffect(() => {
    if (!inTable || readOnly) return;
    const container=host.current?.closest('.custom-preview-container');
    const update=()=>{
      const rect=(container || host.current)?.getBoundingClientRect();
      if(rect)setTableToolPosition({top:container ? Math.max(8,rect.top+8) : Math.max(8,window.innerHeight-90),left:Math.max(8,rect.left+8),width:Math.max(240,Math.min(rect.width-16,window.innerWidth-24))});
    };
    update(); window.addEventListener('resize',update); window.addEventListener('scroll',update,true);
    return ()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  }, [inTable,readOnly]);

  const [tableDialog,setTableDialog] = useState(false);
  const tableTargetRef = useRef<{from:number;to:number;valid:boolean}|null>(null);
  const openTableRef = useRef<() => void>(()=>{});
  const [linkDialog, setLinkDialog] = useState(false);
  const [calendarDialog, setCalendarDialog] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const dateTargetRef = useRef<{ from: number; to: number; valid: boolean } | null>(null);
  const openDatePickerRef = useRef<(removeSlash?: boolean) => void>(() => {});
  const [linkDialogData, setLinkDialogData] = useState({ text: '', href: 'https://' });
  const linkTargetRef = useRef<{ from: number; to: number; valid: boolean } | null>(null);
  const linkCommandRef = useRef<Command>(() => false);
  const insertFootnoteRef = useRef<(removeSlash?: boolean) => void>(() => {});
  const applySignatureRef = useRef<(removeSlash?: boolean) => boolean>(() => false);
  const [selection, setSelection] = useState(false);
  const manualFloatingRef = useRef(false);
  const selectionVisibleRef = useRef(false);
  selectionVisibleRef.current = selection;
  const [slash, setSlash] = useState(false);
  const [popup, setPopup] = useState({ top: 0, left: 0 });
  const [notice, setNotice] = useState('');
  const slashRange = useRef<{ from: number; to: number } | null>(null);
  const codecRef = useRef<Codec | null>(null);
  const [query, setQuery] = useState('');
  const [activeMarks, setActiveMarks] = useState<string[]>([]);
  const [tagInfo, setTagInfo] = useState<ActiveTagInfo>({
    innermostTag: 'p',
    innermostLabel: '본문',
    path: [{ tag: 'p', label: '본문' }],
    pathString: 'p',
    labelPathString: '본문',
  });
  const [menuIndex, setMenuIndex] = useState(0);
  const menuIndexRef = useRef(0);
  const slashOpenRef = useRef(false);
  const menuItemsRef = useRef<{ id: string }[]>([]);
  const executeItemRef = useRef<(id: string, removeSlash?: boolean) => void>(() => {});
  slashOpenRef.current = slash;
  const floatingCallbackRef = useRef(onFloatingToolbar);
  floatingCallbackRef.current = onFloatingToolbar;
  const previousFloatingVisible = useRef(floatingToolbarVisible);
  useEffect(() => { floatingCallbackRef.current?.(selection && !readOnly, popup); }, [selection, readOnly, popup]);
  useEffect(() => () => floatingCallbackRef.current?.(false, { top: 0, left: 0 }), []);
  useEffect(() => {
    if (previousFloatingVisible.current && !floatingToolbarVisible && onFloatingToolbar) { manualFloatingRef.current = false; setSelection(false); }
    previousFloatingVisible.current = floatingToolbarVisible;
  }, [floatingToolbarVisible, onFloatingToolbar]);
  useEffect(() => {
    document.querySelector('#visual-slash-menu [data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [menuIndex]);

  useLayoutEffect(() => {
    if (!host.current) return;
    const hostEl = host.current;
    const pendingImages = imageTargets.current;
    const cached = documentId ? sessions.get(documentId) : undefined;
    let codec = cached?.source === content ? cached.codec : createVisualDocumentCodec(content);
    codecRef.current = codec;
    setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(codec.doc.firstChild?.type.name || ''));
    emitted.current = content;
    hostEl.style.position = 'relative';

    // 1. 도톰하고 선명한 세로 막대 텍스트 커서 (3.5px 코발트 블루, 깜빡임 애니메이션 및 I-Beam 서리프)
    const dropCaretVertical = document.createElement('div');
    dropCaretVertical.className = 'visual-drag-drop-caret no-print';
    dropCaretVertical.setAttribute('aria-hidden', 'true');
    dropCaretVertical.style.cssText = [
      'position:fixed',
      'width:3.5px',
      'background:#1d4ed8',
      'box-shadow:0 0 12px rgba(29, 78, 216, 0.95), 0 0 3px #ffffff',
      'pointer-events:none',
      'z-index:99999',
      'display:none',
      'border-radius:2px',
      'transition:left 0.04s ease-out, top 0.04s ease-out, height 0.04s ease-out',
      'will-change:left,top,height'
    ].join(';');

    // 2. 커서 상단 안내 뱃지
    const dropCaretBadge = document.createElement('div');
    dropCaretBadge.className = 'visual-drag-drop-badge no-print';
    dropCaretBadge.style.cssText = [
      'position:absolute',
      'bottom:100%',
      'left:50%',
      'transform:translateX(-50%) translateY(-6px)',
      'background:#1d4ed8',
      'color:#ffffff',
      'font-size:11px',
      'font-weight:700',
      'font-family:Pretendard, -apple-system, sans-serif',
      'padding:2.5px 8px',
      'border-radius:6px',
      'box-shadow:0 3px 12px rgba(0, 0, 0, 0.35)',
      'pointer-events:none',
      'display:flex',
      'align-items:center',
      'gap:4px',
      'letter-spacing:-0.2px',
      'white-space:nowrap'
    ].join(';');
    dropCaretBadge.innerHTML = '<span>📍 여기에 이미지 삽입</span>';
    dropCaretVertical.appendChild(dropCaretBadge);

    // 3. 가로 블록 경계 가이드 라인 (연한 코발트 음영)
    const dropLineHorizontal = document.createElement('div');
    dropLineHorizontal.className = 'visual-drag-drop-line no-print';
    dropLineHorizontal.setAttribute('aria-hidden', 'true');
    dropLineHorizontal.style.cssText = [
      'position:fixed',
      'height:2px',
      'background:rgba(29, 78, 216, 0.55)',
      'box-shadow:0 0 8px rgba(29, 78, 216, 0.6)',
      'pointer-events:none',
      'z-index:99998',
      'display:none',
      'border-radius:1px',
      'transition:left 0.04s ease-out, top 0.04s ease-out, width 0.04s ease-out',
      'will-change:left,top,width'
    ].join(';');

    document.body.appendChild(dropCaretVertical);
    document.body.appendChild(dropLineHorizontal);

    let activeDropBlock: HTMLElement | null = null;
    const clearDropIndicator = () => {
      dropCaretVertical.style.display = 'none';
      dropLineHorizontal.style.display = 'none';
      lastDropTargetRef.current = null;
      lastDispatchedPosRef.current = null;
      if (activeDropBlock) {
        activeDropBlock.classList.remove('onrivi-drop-line-highlight');
        activeDropBlock = null;
      }
    };

    const updateDropIndicator = (currentView: EditorView, e: DragEvent) => {
      if (!hostEl || !currentView.dom) return;
      const target = resolveDropTarget(currentView, e.clientX, e.clientY);
      lastDropTargetRef.current = target;

      if (activeDropBlock !== target.blockEl) {
        if (activeDropBlock) activeDropBlock.classList.remove('onrivi-drop-line-highlight');
        if (target.blockEl) {
          target.blockEl.classList.add('onrivi-drop-line-highlight');
          activeDropBlock = target.blockEl;
        } else {
          activeDropBlock = null;
        }
      }

      const isDark = document.documentElement.classList.contains('dark') || hostEl.closest('.dark');
      dropCaretVertical.style.background = isDark ? '#38bdf8' : '#1d4ed8';
      dropCaretVertical.style.boxShadow = isDark ? '0 0 12px rgba(56, 189, 248, 0.95), 0 0 3px #ffffff' : '0 0 12px rgba(29, 78, 216, 0.95), 0 0 3px #ffffff';
      dropCaretBadge.style.background = isDark ? '#0284c7' : '#1d4ed8';
      dropLineHorizontal.style.background = isDark ? 'rgba(56, 189, 248, 0.55)' : 'rgba(29, 78, 216, 0.55)';

      const caretHeight = Math.max(22, Math.round(target.coords.bottom - target.coords.top));
      const caretTop = Math.round(target.coords.top);
      const caretLeft = Math.round(target.coords.left);

      // 상단 여백이 좁을 때 뱃지 뒤집기 방어
      if (caretTop < 45) {
        dropCaretBadge.style.bottom = 'auto';
        dropCaretBadge.style.top = '100%';
        dropCaretBadge.style.transform = 'translateX(-50%) translateY(6px)';
      } else {
        dropCaretBadge.style.bottom = '100%';
        dropCaretBadge.style.top = 'auto';
        dropCaretBadge.style.transform = 'translateX(-50%) translateY(-6px)';
      }

      dropCaretVertical.style.top = `${caretTop}px`;
      dropCaretVertical.style.left = `${caretLeft}px`;
      dropCaretVertical.style.height = `${caretHeight}px`;
      dropCaretVertical.style.display = 'block';

      if (target.blockEl) {
        const blockRect = target.blockEl.getBoundingClientRect();
        const lineY = target.insertMode === 'before' ? blockRect.top : target.insertMode === 'after' ? blockRect.bottom : target.coords.bottom;
        dropLineHorizontal.style.top = `${Math.round(lineY)}px`;
        dropLineHorizontal.style.left = `${Math.round(blockRect.left)}px`;
        dropLineHorizontal.style.width = `${Math.max(40, Math.round(blockRect.width))}px`;
        dropLineHorizontal.style.display = 'block';
      } else {
        dropLineHorizontal.style.display = 'none';
      }

      // 실시간 에디터 텍스트 커서(Selection) 동기화
      if (lastDispatchedPosRef.current !== target.pos) {
        lastDispatchedPosRef.current = target.pos;
        try {
          const $pos = currentView.state.doc.resolve(target.pos);
          currentView.dispatch(currentView.state.tr.setSelection(TextSelection.near($pos)));
        } catch (_) {}
      }
    };
    updateDropRef.current = updateDropIndicator;

    const ownsImageDrop = (e: DragEvent) => {
      const element=e.target instanceof Element ? e.target : null;
      // Scene capture handlers own both its picture and text regions.
      if(element?.closest('.book-page'))return false;
      const owner=element?.closest('.visual-document-editor');
      const section=hostEl.closest('.visual-document-editor');
      if(owner)return owner===section;
      const container=hostEl.closest('.custom-preview-container') || section || hostEl;
      if(container.querySelectorAll('.visual-document-editor').length>1)return false;
      const rect=container.getBoundingClientRect();
      return e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom;
    };
    const handleWindowDragOver = (e: DragEvent) => {
      // 🛡️ [브라우저 파일 URL 새 창 이동 100% 원천 차단]
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      const view = viewRef.current;
      if (!view || !view.editable) return;
      if(!ownsImageDrop(e)){clearDropIndicator();return;}
      const types = e.dataTransfer?.types;
      if (!types || !Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
        return;
      }
      const container = hostEl.closest('.custom-preview-container') || hostEl;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          updateDropIndicator(view, e);
        } else {
          clearDropIndicator();
        }
      }
    };

    const handleWindowDragEnd = () => clearDropIndicator();
    const handleWindowDrop = (e: DragEvent) => {
      // 🛡️ [브라우저 파일 URL 새 창 내비게이션 100% 원천 차단]
      e.preventDefault();
      clearDropIndicator();
      const view = viewRef.current;
      if (!view || !view.editable) return;
      if(!ownsImageDrop(e))return;
      if(!e.dataTransfer || !parseDroppedDataToBlob(e.dataTransfer))return;
      const container = hostEl.closest('.custom-preview-container') || hostEl;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          e.stopPropagation();
          void executeDropRef.current(view, e);
        }
      }
    };
    const handleWindowDragLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || !e.relatedTarget) {
        clearDropIndicator();
      }
    };
    window.addEventListener('dragover', handleWindowDragOver, true);
    window.addEventListener('dragend', handleWindowDragEnd, true);
    window.addEventListener('drop', handleWindowDrop, true);
    window.addEventListener('dragleave', handleWindowDragLeave, true);
    window.addEventListener('mouseup', handleWindowDragEnd, true);
    hostEl.addEventListener('mouseleave', handleWindowDragEnd);

    const executeDropImageInsertion = async (currentView: EditorView, e: DragEvent): Promise<boolean> => {
      const dt = e.dataTransfer;
      if (!dt || !currentView.editable) {
        clearDropIndicator();
        return false;
      }

      const target = lastDropTargetRef.current || resolveDropTarget(currentView, e.clientX, e.clientY);
      clearDropIndicator();
      let expectedDoc=currentView.state.doc;
      let nextInsertion:number|null=null;
      const reportDropError=(error:unknown)=>{
        const message=error instanceof Error ? error.message : '이미지를 저장하지 못했습니다. 리소스 폴더 연결을 확인해 주세요.';
        setNotice(message);onToastRef.current?.(message,'error');
      };

      const insertMarkdownImageNode = (savedPath: string) => {
        const view = viewRef.current;
        if (!view || view!==currentView || view.isDestroyed || !view.editable || view.state.doc!==expectedDoc) {
          setNotice('문서나 삽입 위치가 변경되었습니다. 이미지를 다시 끌어 넣어 주세요.');
          return;
        }
        const formattedPath = savedPath.includes(' ') ? `<${savedPath}>` : savedPath;
        const markdown = `![](${formattedPath})\n\n`;
        const node = visualSchema.nodes.visual_image.create({ source: markdown });
        let tr = view.state.tr;

        const safePos = Math.max(0, Math.min(nextInsertion ?? target.pos, tr.doc.content.size));
        const $pos = tr.doc.resolve(safePos);

        if(nextInsertion!==null){tr=tr.insert(safePos,node);}
        else if (target.insertMode === 'split' && $pos.parent.isTextblock && $pos.parentOffset > 0 && $pos.parentOffset < $pos.parent.content.size && canSplit(tr.doc, safePos)) {
          // 문단 텍스트 중간에 커서가 위치한 경우: 현재 커서 위치에서 문단을 둘로 나누고 그 사이에 이미지 삽입!
          tr = tr.split(safePos);
          tr = tr.insert(safePos + 1, node);
        } else {
          // before/after targets are already document-level boundaries.
          tr = tr.insert(safePos, node);
        }

        let insertedPos = -1;
        tr.doc.descendants((n, pos) => {
          if (n === node) { insertedPos = pos; return false; }
          return true;
        });
        if (insertedPos >= 0) {
          const afterPos = insertedPos + node.nodeSize;
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          nextInsertion=afterPos+2;
        } else if (tr.doc.lastChild?.type === visualSchema.nodes.visual_image) {
          tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
        }
        view.dispatch(closeHistory(tr).scrollIntoView());
        expectedDoc=view.state.doc;
        view.focus();
      };

      // Snapshot all files before the first await: browsers release the drag
      // data store after dispatch, and the generic parser returns only file 1.
      const droppedFiles=Array.from(dt.files || []).filter(file=>file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name));
      if(!droppedFiles.length)for(const item of Array.from(dt.items || [])){
        const file=item.kind==='file'?item.getAsFile():null;
        if(file && (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name)))droppedFiles.push(file);
      }
      if(droppedFiles.length && images.current.onImageFile){
        for(const file of droppedFiles){
          if(viewRef.current!==currentView || currentView.isDestroyed)break;
          try{
            const path=await images.current.onImageFile(file);
            if(path)insertMarkdownImageNode(path);
            else setNotice('이미지를 저장하지 못했습니다. 리소스 폴더 연결을 확인해 주세요.');
          }catch(error){reportDropError(error);}
        }
        return true;
      }

      // 1) parseDroppedDataToBlob 정규화 파싱 (OS 파일, DataTransfer items, Base64 Data URL, Web SVG, 구글/웹 이미지 등)
      const parsed = parseDroppedDataToBlob(dt);
      if (parsed?.localPath && !(window as any).electronAPI?.readTransferFile) {
        reportDropError(new Error('다른 프로그램이 이미지 파일 대신 PC 파일 주소만 전달했습니다. 웹에서는 해당 주소를 읽을 수 없습니다. 원본 이미지 파일을 탐색기에서 끌어 넣거나, 원본 프로그램의 이미지 복사 후 붙여넣기를 사용해 주세요.'));
        return true;
      }
      if (parsed) {
        if (parsed.file && images.current.onImageFile) {
          try {
            const savedPath = await images.current.onImageFile(parsed.file);
            if (savedPath) {
              insertMarkdownImageNode(savedPath);
              return true;
            }
          } catch (err) {
            console.error('[VisualDocumentEditor] File drop save failed:', err);
          }
        } else if (parsed.webUrl) {
          let fetchedFile: File | null = null;
          try {
            fetchedFile = await fetchExternalImageFile(parsed.webUrl, parsed.name);
          } catch (_) {}

          if (fetchedFile && images.current.onImageFile) {
            try {
              const savedPath = await images.current.onImageFile(fetchedFile);
              if (savedPath) {
                insertMarkdownImageNode(savedPath);
                return true;
              }
            } catch (err) {
              console.error('[VisualDocumentEditor] External image save failed:', err);
            }
          }

          if(parsed.webUrl.startsWith('blob:')){
            reportDropError(new Error('브라우저의 임시 이미지를 읽지 못했습니다. 이미지 파일을 저장한 뒤 다시 끌어 넣어 주세요.'));
            return true;
          }
          // Remote links may be embedded, but an unreadable temporary blob URL
          // must never become a permanent document reference.
          insertMarkdownImageNode(parsed.webUrl);
          return true;
        }
      }

      // 2) OS 다중 파일 드롭 (여러 이미지 일괄 드롭 시)
      let files = Array.from(dt.files || []).filter(file =>
        file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name)
      );
      if (files.length === 0 && dt.items) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f && (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(f.name))) {
              files.push(f);
            }
          }
        }
      }
      if (files.length > 0 && images.current.onImageFile) {
        for (const file of files) {
          try {
            const savedPath = await images.current.onImageFile(file);
            if (savedPath) {
              insertMarkdownImageNode(savedPath);
            }
          } catch (err) {
            console.error('[VisualDocumentEditor] Image file drop upload failed:', err);
          }
        }
        return true;
      }

      // 3) 로컬 파일 절대 경로 드래그 (Electron 환경)
      const plainText = dt.getData('text/plain') || '';
      const uriList = dt.getData('text/uri-list') || '';
      let fileCandidate = parsed?.localPath || uriList.split(/[\r\n]+/).map(s => s.trim()).find(s => s && /^(?:file:\/\/\/|[a-zA-Z]:[/\\])/i.test(s)) || '';
      if (!fileCandidate && /^(?:file:\/\/\/|[a-zA-Z]:[/\\])/i.test(plainText.trim())) {
        fileCandidate = plainText.trim();
      }
      if (fileCandidate) {
        const api = (window as any).electronAPI;
        let cleanPath = fileCandidate.startsWith('file:///') ? decodeURIComponent(fileCandidate.replace(/^file:\/\/\//, '')) : fileCandidate;
        cleanPath = cleanPath.replace(/^\/([A-Za-z]:)/, '$1');
        if (api?.readTransferFile && images.current.onImageFile) {
          try {
            const bytes = await api.readTransferFile(cleanPath);
            const filename = cleanPath.split(/[\\/]/).pop() || `img_${Date.now()}.png`;
            const ext = filename.split('.').pop()?.toLowerCase() || 'png';
            const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' } as Record<string, string>)[ext] || 'application/octet-stream';
            const file = new File([new Uint8Array(bytes)], filename, { type: mime });
            const savedPath = await images.current.onImageFile(file);
            if (savedPath) {
              insertMarkdownImageNode(savedPath);
              return true;
            }
          } catch (err) {
            console.error('[VisualDocumentEditor] Local file drag read failed:', err);
            reportDropError(err);
          }
        }
        return true;
      }

      // 4) 외부 웹 HTTP/HTTPS 이미지 URL (다운로드 후 로컬/드라이브 media에 저장)
      let webCandidate = uriList.split(/[\r\n]+/).map(s => s.trim()).find(s => s && /^https?:\/\//i.test(s)) || '';
      if (!webCandidate && /^https?:\/\//i.test(plainText.trim())) {
        webCandidate = plainText.trim();
      }
      if (webCandidate) {
        let fetchedFile: File | null = null;
        try {
          fetchedFile = await fetchExternalImageFile(webCandidate);
        } catch (_) {}

        if (fetchedFile && images.current.onImageFile) {
          try {
            const savedPath = await images.current.onImageFile(fetchedFile);
            if (savedPath) {
              insertMarkdownImageNode(savedPath);
              return true;
            }
          } catch (err) {
            console.error('[VisualDocumentEditor] External image save failed:', err);
          }
        }

        // 다운로드 실패 시에도 웹 이미지 링크 직접 안전 삽입 (절대 실패하거나 새 창을 띄우지 않음!)
        if (!webCandidate.startsWith('data:image/')) {
          insertMarkdownImageNode(webCandidate);
          return true;
        }
      }

      return false;
    };
    executeDropRef.current = executeDropImageInsertion;

    const footnoteHeaderPluginKey = new PluginKey('visual_footnote_header');
    const createFootnoteHeaderPlugin = () => new Plugin({
      key: footnoteHeaderPluginKey,
      props: {
        decorations(state) {
          let firstFootnotePos: number | null = null;
          let offset = 0;
          for (let i = 0; i < state.doc.childCount; i++) {
            const child = state.doc.child(i);
            if (child.type.name === 'visual_footnote_def') {
              firstFootnotePos = offset;
              break;
            }
            offset += child.nodeSize;
          }

          if (firstFootnotePos === null) {
            return DecorationSet.empty;
          }

          const widget = Decoration.widget(
            firstFootnotePos,
            () => {
              const areaHeader = document.createElement('div');
              areaHeader.className = 'visual-footnote-area-header select-none';
              areaHeader.innerHTML =
                '<div class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">' +
                '<span class="visual-footnote-area-badge inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold whitespace-nowrap">' +
                '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>' +
                '<span class="visual-footnote-area-title">각주 (Footnotes)</span>' +
                '</span>' +
                '<div class="flex-1 border-t-2 border-slate-300/80 dark:border-slate-700/80"></div>' +
                '</div>';
              return areaHeader;
            },
            { side: -1, stopEvent: () => true, key: 'visual-footnote-area-header' }
          );

          return DecorationSet.create(state.doc, [widget]);
        }
      }
    });

    const aiTargets=new VisualAITargets();
    const view = new EditorView(hostEl, {
      decorations(state){
        const entries=bibRef.current;const decorations:Decoration[]=[...aiTargets.decorations()];
        state.doc.descendants((node,pos)=>{if(node.type.name==='heading' && hasHeadingNumber(node.textContent)) decorations.push(Decoration.node(pos,pos+node.nodeSize,{'data-onrivi-heading-numbered':'true'}));if(!node.isText || node.marks.some(m=>m.type.name==='code') || state.doc.resolve(pos).parent.type.name==='code_block')return;
          for(const match of Array.from((node.text||'').matchAll(citationPattern))){const key=match[1]||match[2],entry=entries.get(key.toLowerCase());decorations.push(Decoration.inline(pos+match.index!,pos+match.index!+match[0].length,{class:entry?'visual-citation':'visual-citation-missing',title:entry?citationLabel(entry)+': '+entry.title:'등록된 문헌 없음: '+key}));}
        });
        return DecorationSet.create(state.doc,decorations);
      },
      state: cached?.source === content ? cached.state : EditorState.create({ doc: codec.doc, plugins: [history(), visualMarkdownInputRules(), createFootnoteHeaderPlugin(), keymap({
        'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo,
        ArrowUp: chainCommands(moveUpAcrossListBoundary, moveUpFromEmptyOrderedItem),
        Backspace: chainCommands(clearMultiCellTableSelection, removeHeadingAtStart, backspaceInCodeBlock, undoInputRule, removeListMarkerAtStart, baseKeymap.Backspace),
        Delete: chainCommands(clearMultiCellTableSelection, protectQuoteBoundary,deleteEmptyParagraphBeforeList, deleteInCodeBlock, deleteAtEndOfList, deleteNextListBoundary, joinOrderedListsAcrossEmptyParagraph, baseKeymap.Delete),
        'Mod-Shift-k': (state, dispatch) => {
          const { $from } = state.selection;
          if ($from.parent.type === visualSchema.nodes.code_block) {
            if (dispatch) {
              const pos = $from.before();
              const after = $from.after();
              const tr = state.tr;
              if (state.doc.childCount === 1 && pos === 0) {
                dispatch(closeHistory(tr.replaceWith(pos, after, visualSchema.nodes.paragraph.create())).scrollIntoView());
              } else {
                dispatch(closeHistory(tr.delete(pos, after)).scrollIntoView());
              }
            }
            return true;
          }
          return false;
        },
        'Mod-u': toggleMark(visualSchema.marks.underline),
        'Mod-b': toggleMark(visualSchema.marks.strong),
        'Mod-B': toggleMark(visualSchema.marks.strong),
        'Mod-i': toggleMark(visualSchema.marks.em),
        'Mod-I': toggleMark(visualSchema.marks.em),
        'Mod-e': toggleMark(visualSchema.marks.code),
        'Mod-E': toggleMark(visualSchema.marks.code),
        'Mod-Shift-x': toggleMark(visualSchema.marks.strike),
        'Mod-Shift-X': toggleMark(visualSchema.marks.strike),
        'Mod-\\': clear,
        'Mod-k': (state, dispatch) => linkCommandRef.current(state, dispatch),
        'Mod-Alt-f': () => { insertFootnoteRef.current?.(); return true; },
        'Mod-Alt-F': () => { insertFootnoteRef.current?.(); return true; },
        'Mod-Alt-r': () => { applySignatureRef.current?.(); return true; },
        'Mod-Alt-R': () => { applySignatureRef.current?.(); return true; },
        'Mod-Alt-s': () => { applySignatureRef.current?.(); return true; },
        'Mod-Alt-S': () => { applySignatureRef.current?.(); return true; },
        ArrowDown: chainCommands(moveDownAcrossListBoundary, (state,dispatch,currentView)=>{
          if (state.selection instanceof NodeSelection && ATOM_BLOCK_TYPES.has(state.selection.node.type.name)) {
            return exitMediaBlock(true)(state, dispatch, currentView);
          }
          if(!state.selection.empty || !currentView?.endOfTextblock('down'))return false;
          const table=tableContext(state);
          if(table && table.row===table.table.childCount-1)return tableAction('afterTable')(state,dispatch,currentView);
          if(state.selection.$from.parent.type===visualSchema.nodes.code_block && state.selection.$from.parentOffset===state.selection.$from.parent.content.size)return exitCode(state,dispatch,currentView);
          return false;
        }),
        'Mod-Enter': chainCommands(tableAction('afterTable'),exitCode,exitQuote(),exitMediaBlock()),
        Enter: chainCommands(
          exitMediaBlock(true),
          tableEnter(),
          calloutEnter,
          exitEmptyListItem,
          (state, dispatch, currentView) => {
            const parent = state.selection.$from.depth > 0 ? state.selection.$from.node(state.selection.$from.depth - 1) : null;
            return splitListItem(visualSchema.nodes.list_item, parent?.type === visualSchema.nodes.list_item && parent.attrs.checked !== null ? { checked: false } : undefined)(state, dispatch, currentView);
          },
          headingEnter,
          baseKeymap.Enter
        ),
        'Shift-Enter': chainCommands(exitCode, (state, dispatch) => {
          if (dispatch) dispatch(state.tr.replaceSelectionWith(visualSchema.nodes.hard_break.create()).scrollIntoView());
          return true;
        }),
        Tab: chainCommands(moveTableCell(),indentBlockquote,withIndependentQuotes(independentIndentListItem),safeListIndent), 'Shift-Tab': chainCommands(moveTableCell(true),outdentBlockquote,withIndependentQuotes(independentLiftListItem),indentDocument(true)),
      }), keymap(baseKeymap)] }),
      editable: () => !readOnly,
      attributes: { spellcheck: String(spellCheck), class: 'visual-document-surface', 'aria-label': '문서 직접 편집', role: 'textbox', 'aria-multiline': 'true', 'data-editor-tab-size': String(tabSize) },
      nodeViews: createVisualNodeViews({
        viewRef,
        imagesRef: images,
        beginImageRef,
        beginMediaRef,
        imageSequence,
        setImageMounts,
        setNotice,
      }),
      handleScrollToSelection(currentView) {
        const viewport = hostEl.closest('.custom-preview-container') as HTMLElement | null;
        if (!viewport || !currentView.state.selection.empty) return false;
        try {
          const bounds = viewport.getBoundingClientRect();
          const caret = currentView.coordsAtPos(currentView.state.selection.head);
          // Do not move an already-visible caret into ProseMirror's scroll
          // margin on every keystroke. Offscreen selections retain its normal
          // scrolling, including keyboard navigation and newly wrapped lines.
          return caret.top >= Math.max(0, bounds.top) + 4
            && caret.bottom <= Math.min(window.innerHeight, bounds.bottom) - 4
            && caret.left >= bounds.left && caret.right <= bounds.right;
        } catch { return false; }
      },
      dispatchTransaction(transaction) {
        removeEmptySignatureBlocks(transaction);
        removeOrphanFootnotes(transaction);
        const formats = headingFormatsRef.current;
        if (!formats.readOnly && !view.composing && (transaction.docChanged || transaction.getMeta('onrivi:heading-numbering'))) {
          numberHeadingTransaction(transaction, formats.current, formats.previous);
          formats.previous = formats.current;
        }
        aiTargets.map(transaction);
        imageTargets.current.forEach(target => {
          const from = transaction.mapping.mapResult(target.from, 1);
          const to = transaction.mapping.mapResult(target.to, -1);
          if (target.source && (from.deleted || to.deleted)) target.valid = false;
          target.from = from.pos; target.to = Math.max(from.pos, to.pos);
        });
        const viewport=hostEl.closest('.custom-preview-container') as HTMLElement|null;
        const topBefore=viewport?.scrollTop;
        const leftBefore=viewport?.scrollLeft;
        const preserveViewport=transaction.getMeta('onrivi:preserve-viewport') === true;
        view.updateState(view.state.apply(transaction));
        if (transaction.docChanged) setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || ''));
        if(preserveViewport && viewport && topBefore!==undefined){
          viewport.scrollTop=topBefore; viewport.scrollLeft=leftBefore || 0;
        }
        if (transaction.getMeta('onrivi:focus-code-block')) {
          requestAnimationFrame(() => {
            try {
              const { $from } = view.state.selection;
              let targetPos = $from.pos;
              for (let d = $from.depth; d >= 0; d--) {
                if ($from.node(d).type === visualSchema.nodes.code_block) {
                  targetPos = $from.start(d);
                  break;
                }
              }
              const dom = view.domAtPos(targetPos);
              const codeBlockEl = dom.node instanceof Element ? dom.node.closest('.visual-code-block') : dom.node.parentElement?.closest('.visual-code-block');
              const input = codeBlockEl?.querySelector<HTMLInputElement>('.visual-code-language input');
              if (input) {
                input.focus();
                input.select();
              }
            } catch (err) {
              console.warn('[VisualDocumentEditor] focus code block input error:', err);
            }
          });
        }
        caretRef.current?.schedule();
        if(transaction.selectionSet && !transaction.docChanged && view.hasFocus() && !view.composing && cursorCallback.current){
          try {
            const token='ONRIVICURSORMAP';
            const marker=view.state.tr.insertText(token,view.state.selection.head);
            const offset=codecRef.current?.serialize(marker.doc).indexOf(token);
            if(offset!==undefined && offset>=0)cursorCallback.current(offset, true);
          } catch {}
        }
        const tblCtx = tableContext(view.state);
        const currentInTable = Boolean(tblCtx);
        const tablePos = tblCtx ? tblCtx.pos : null;
        if (tablePos !== currentTablePosRef.current) {
          currentTablePosRef.current = tablePos;
          setTableToolbarDismissed(false);
        }
        setInTable(currentInTable);
        const { from, to, $from, empty } = view.state.selection;
        // 🔥 서식 적용(docChanged) 시 플로팅 툴바가 닫히지 않고 유지되도록 보존 (ESC 또는 에디터 본문 클릭 시에만 닫힘)
        setSelection(manualFloatingRef.current);
        const markNames = ['strong', 'em', 'code', 'link', 'strike', 'underline'];
        const currentMarks = markNames.filter(name => empty
          ? (view.state.storedMarks ?? $from.marks()).some(mark => mark.type.name === name)
          : view.state.doc.rangeHasMark(from, to, visualSchema.marks[name]));
        setActiveMarks(previous => previous.join(',') === currentMarks.join(',') ? previous : currentMarks);
        const nextTagInfo = getActiveTagInfo(view.state);
        setTagInfo(previous => previous.pathString === nextTagInfo.pathString && previous.innermostTag === nextTagInfo.innermostTag && previous.innermostLabel === nextTagInfo.innermostLabel ? previous : nextTagInfo);
        try {
          window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: nextTagInfo }));
        } catch {}
        const before = $from.parent.isTextblock && $from.parent.type !== visualSchema.nodes.code_block
          ? $from.parent.textBetween(Math.max(0, $from.parentOffset - 100), $from.parentOffset, '\n', '\n') : '';
        const match = before.match(slashPattern);
        slashRange.current = empty && match ? { from: from - match[1].length, to } : null;
        setSlash(Boolean(slashRange.current));
        setQuery(match?.[1].slice(1).toLowerCase() || '');
        menuIndexRef.current = 0; setMenuIndex(0);
        if (!empty || slashRange.current) {
          const rect = view.coordsAtPos(from);
          const spaceBelow = window.innerHeight - rect.bottom;
          const top = empty
            ? (spaceBelow < 260 && rect.top > 260 ? Math.max(8, rect.top - 240) : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6)))
            : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
          setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
        }
        if (transaction.docChanged) {
          const next = codec.serialize(view.state.doc);
          emitted.current = next;
          callback.current(next);
          if(cursorCallback.current && !preserveViewport){
            cancelAnimationFrame(cursorFrame.current);
            cursorFrame.current=requestAnimationFrame(()=>{
              if(viewRef.current!==view || !view.hasFocus() || view.composing)return;
              try {
                const token='ONRIVICURSORMAP';
                const offset=codec.serialize(view.state.tr.insertText(token,view.state.selection.head).doc).indexOf(token);
                if(offset>=0)cursorCallback.current?.(offset,false);
              } catch {}
            });
          }
        }
      },
      handleKeyDown(currentView, event) {
        if (!currentView.editable || event.isComposing) return false;
        if (event.key === 'Enter') {
          const { $from } = currentView.state.selection;
          const isFootnoteDef = $from.parent.type === visualSchema.nodes.visual_footnote_def ||
            ($from.nodeAfter && $from.nodeAfter.type === visualSchema.nodes.visual_footnote_def) ||
            ($from.nodeBefore && $from.nodeBefore.type === visualSchema.nodes.visual_footnote_def);
          if (isFootnoteDef) {
            event.preventDefault();
            return true;
          }
        }
        if (currentView.state.selection instanceof NodeSelection && currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule) {
          if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            openParagraphAfterHorizontalRule(currentView, currentView.state.selection.from);
            caretRef.current?.schedule();
            return true;
          }
          if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
            placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
            caretRef.current?.schedule();
          }
        }
        if ((event.key === 'PageDown' || event.key === 'PageUp') && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          event.preventDefault();
          handlePageMove(currentView, event.key === 'PageDown' ? 'down' : 'up', event.shiftKey, () => caretRef.current?.schedule());
          return true;
        }
        if (event.key === 'ArrowDown' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          if (extendSelectionVerticallyAcrossBlocks(currentView, 'down', () => caretRef.current?.schedule())) {
            event.preventDefault();
            return true;
          }
        }
        if (event.key === 'ArrowUp' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          if (extendSelectionVerticallyAcrossBlocks(currentView, 'up', () => caretRef.current?.schedule())) {
            event.preventDefault();
            return true;
          }
        }
        if(['Tab','Backspace','Delete','End','Home','ArrowLeft','ArrowRight'].includes(event.key))synchronizeTextSelection(currentView);
        if (event.key === 'ArrowRight' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.isTextblock) {
            const currentStored = currentView.state.storedMarks;
            const activeMarks = currentStored ?? $from.marks();
            if (activeMarks && activeMarks.length > 0) {
              const nodeAfter = $from.nodeAfter;
              const isAtMarkEnd = !nodeAfter || !activeMarks.some(m => nodeAfter.marks.some(nm => nm.eq(m)));
              if (isAtMarkEnd && !(currentStored && currentStored.length === 0)) {
                event.preventDefault();
                currentView.dispatch(currentView.state.tr.setStoredMarks([]));
                caretRef.current?.schedule();
                return true;
              }
            }
          }
        }
        if (event.key === 'ArrowLeft' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.isTextblock) {
            const currentStored = currentView.state.storedMarks;
            const activeMarks = currentStored ?? $from.marks();
            if (activeMarks && activeMarks.length > 0) {
              const nodeBefore = $from.nodeBefore;
              const nodeAfter = $from.nodeAfter;
              const isAtMarkStart = (!nodeBefore || !activeMarks.some(m => nodeBefore.marks.some(nm => nm.eq(m)))) &&
                                    Boolean(nodeAfter && activeMarks.some(m => nodeAfter.marks.some(nm => nm.eq(m))));
              if (isAtMarkStart && !(currentStored && currentStored.length === 0)) {
                event.preventDefault();
                currentView.dispatch(currentView.state.tr.setStoredMarks([]));
                caretRef.current?.schedule();
                return true;
              }
            }
          }
        }
        if (event.key === 'End' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.isTextblock) {
            const currentStored = currentView.state.storedMarks;
            const activeMarks = currentStored ?? $from.marks();
            if (activeMarks && activeMarks.length > 0) {
              const endPos = $from.end();
              event.preventDefault();
              currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, endPos)).setStoredMarks([]));
              caretRef.current?.schedule();
              return true;
            }
          }
        }
        if (event.key === 'Home' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.isTextblock) {
            const startPos = $from.start();
            const startResolved = currentView.state.doc.resolve(startPos);
            const nodeAfter = startResolved.nodeAfter;
            if (nodeAfter && nodeAfter.marks && nodeAfter.marks.length > 0) {
              event.preventDefault();
              currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, startPos)).setStoredMarks([]));
              caretRef.current?.schedule();
              return true;
            }
          }
        }
        if(event.key==='Tab'){
          const position=currentView.state.selection.$from;
          let inList=false;
          let inQuote=false;
          for(let depth=position.depth;depth>0;depth--){
            if(position.node(depth).type===visualSchema.nodes.list_item) inList=true;
            if(position.node(depth).type===visualSchema.nodes.blockquote) inQuote=true;
          }
          if(!inList && !inQuote && currentView.state.selection.empty && !tableContext(currentView.state) && position.parent.isTextblock && position.parentOffset>0 && position.parentOffset<position.parent.content.size){
            event.preventDefault();return indentDocument(event.shiftKey)(currentView.state,currentView.dispatch,currentView);
          }
        }
        const clipboardFile = desktopClipboardImage(event);
        if (clipboardFile && images.current.onImageFile) {
          event.preventDefault(); beginImageRef.current(undefined, undefined, clipboardFile); return true;
        }
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key === '\\' || event.key === '₩' || event.code === 'Backslash')) {
          event.preventDefault();
          synchronizeTextSelection(currentView);
          run(clear);
          caretRef.current?.schedule();
          return true;
        }
        const configured = configuredHotkeyItem(event, hotkeysRef.current);
        if (configured) { event.preventDefault(); synchronizeTextSelection(currentView); executeItemRef.current(configured.id); return true; }
        if (event.key === 'ArrowUp' && !event.shiftKey && !event.ctrlKey && !event.altKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.type === visualSchema.nodes.code_block && $from.parentOffset === 0) {
            const dom = currentView.domAtPos($from.pos);
            const codeBlockEl = dom.node instanceof Element ? dom.node.closest('.visual-code-block') : dom.node.parentElement?.closest('.visual-code-block');
            const input = codeBlockEl?.querySelector<HTMLInputElement>('.visual-code-language input');
            if (input) {
              event.preventDefault();
              input.focus();
              input.select();
              return true;
            }
          }
        }
        if (event.key === 'ArrowDown' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.type === visualSchema.nodes.code_block && $from.parentOffset === $from.parent.content.size) {
            event.preventDefault();
            const afterPos = $from.after();
            let tr = currentView.state.tr;
            if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            }
            currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
            currentView.focus();
            caretRef.current?.schedule();
            return true;
          }
        }
        if (event.key === 'Enter' && !event.isComposing && !slashOpenRef.current) {
          const { $from, empty } = currentView.state.selection;
          if (empty && $from.parent.type === visualSchema.nodes.code_block) {
            const parent = $from.parent;
            const isCodeEmpty = parent.content.size === 0;
            const isAtEnd = $from.parentOffset === parent.content.size;
            if (isCodeEmpty || event.shiftKey || event.ctrlKey || event.metaKey || (isAtEnd && parent.textContent.endsWith('\n'))) {
              event.preventDefault();
              const afterPos = $from.after();
              let tr = currentView.state.tr;
              if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
                tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
              }
              currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
              currentView.focus();
              caretRef.current?.schedule();
              return true;
            }
          }
        }
        if (slashOpenRef.current && menuItemsRef.current.length && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const length = menuItemsRef.current.length;
            menuIndexRef.current = (menuIndexRef.current + (event.key === 'ArrowDown' ? 1 : -1) + length) % length;
            setMenuIndex(menuIndexRef.current);
          } else {
            const item = menuItemsRef.current[menuIndexRef.current] || menuItemsRef.current[0];
            setTimeout(() => {
              executeItemRef.current(item.id, true);
            }, 0);
          }
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && (event.code === 'Space' || event.key === ' ')) {
          const { from, to, $from, empty } = currentView.state.selection;
          const before = $from.parent.isTextblock ? $from.parent.textBetween(0, $from.parentOffset, '\n', '\n') : '';
          const match = before.match(slashPattern);
          const rect = currentView.coordsAtPos(from);
          const slashCommand = empty && Boolean(match);
          const spaceBelow = window.innerHeight - rect.bottom;
          const top = slashCommand
            ? (spaceBelow < 260 && rect.top > 260 ? Math.max(8, rect.top - 240) : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6)))
            : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
          setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
          if (slashCommand) {
            slashRange.current = { from: from - match![1].length, to };
            setSlash(true); setSelection(false);
            setQuery(match![1].slice(1).toLowerCase());
          } else {
            setSlash(false); slashRange.current = null;
            const visible = !selectionVisibleRef.current;
            manualFloatingRef.current = visible;
            setSelection(visible);
          }
          return true;
        }
        if (event.key === 'Escape') {
          manualFloatingRef.current = false; slashOpenRef.current = false; setSlash(false); setSelection(false); slashRange.current = null;
          setTableToolbarDismissed(true);
          return true;
        }
        return false;
      },
      handleTextInput(currentView, _from, _to, text) {
        if (!currentView.editable) return false;
        if (currentView.composing) return false;
        if (currentView.state.selection instanceof NodeSelection && currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule) {
          if (placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from)) {
            currentView.dispatch(currentView.state.tr.insertText(text));
            caretRef.current?.schedule();
            return true;
          }
        }
        return false;
      },
      handlePaste(currentView, event) {
        if (!currentView.editable) return false;
        const inCode = currentView.state.selection.$from.parent.type === visualSchema.nodes.code_block;
        if (inCode) return false;

        const text = event.clipboardData?.getData('text/plain') || '';
        const html = event.clipboardData?.getData('text/html') || '';
        const hasRichHtml = !!html && /<(?:table|tbody|tr|th|td|h[1-6]|ul|ol|li|b|strong|i|em|del|s|blockquote|pre|figure|figcaption|a\s+[^>]*href)\b/i.test(html);
        const isExplicitPureMarkdown = /^(?:\uFEFF)?---[^\S\r\n]*\r?\n/.test(text) || (!/<table\b/i.test(html) && /\|[\s\t]*:?---*:?[\s\t]*\|/.test(text));
        // A copied table cell can carry table HTML even when its text is only
        // one sentence. Parse that sentence as inline Markdown before the
        // generic single-line and rich-HTML paste paths.
        if (tableContext(currentView.state) && currentView.state.selection.$from.parent.isTextblock) {
          const cellSource = /<table\b/i.test(html) && text
            ? text
            : hasRichHtml && !isExplicitPureMarkdown
            ? sanitizePastedText(htmlToImportMarkdown(html))
            : text;
          if (cellSource) {
            event.preventDefault();
            event.stopPropagation();
            currentView.dispatch(markdownPasteInTableCellTransaction(currentView.state, cellSource));
            return true;
          }
        }
        if (text && !html && !/[\r\n\t]/.test(text)) {
          const marks = currentView.state.storedMarks ?? currentView.state.selection.$from.marks();
          if (marks?.length) {
            let tr = currentView.state.tr.replaceSelectionWith(currentView.state.schema.text(text, marks), false);
            currentView.dispatch(tr.setStoredMarks(marks).scrollIntoView());
            return true;
          }
        }

        // 1. 본문 텍스트가 실질적으로 존재하는지 검증 (단독 이미지 붙여넣기 오분기 차단)
        const textContentInHtml = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .trim();
        const hasSubstantialText = text.trim().length > 0 || textContentInHtml.length > 0;

        // 2. 본문 텍스트가 전혀 없는 순수 단독 이미지인 경우에만 단독 이미지 처리기로 위임
        if (!hasSubstantialText) {
          const image = Array.from(event.clipboardData?.files || []).find(file => file.type.startsWith('image/'))
            || Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith('image/'))?.getAsFile();
          if (image && images.current.onImageFile) {
            event.preventDefault(); event.stopPropagation();
            beginImageRef.current(undefined, undefined, image); return true;
          }
          if (/<img\b/i.test(html)) {
            const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
            const imgSrc = match?.[1] || '';
            if (imgSrc.startsWith('data:image/')) {
              try {
                event.preventDefault(); event.stopPropagation();
                const [header, b64] = imgSrc.split(',');
                const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
                const binaryStr = atob(b64);
                const len = binaryStr.length;
                const u8arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) u8arr[i] = binaryStr.charCodeAt(i);
                const ext = ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' } as Record<string, string>)[mime] || 'png';
                const file = new File([u8arr], `img_${Date.now()}.${ext}`, { type: mime });
                beginImageRef.current(undefined, undefined, file);
                return true;
              } catch (_) {}
            }
            if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
              event.preventDefault(); event.stopPropagation();
              void (async () => {
                try {
                  const resp = await fetch(imgSrc);
                  if (resp.ok) {
                    const blob = await resp.blob();
                    const ext = ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/png': 'png' } as Record<string, string>)[blob.type] || 'png';
                    const file = new File([blob], `img_${Date.now()}.${ext}`, { type: blob.type || 'image/png' });
                    beginImageRef.current(undefined, undefined, file);
                    return;
                  }
                } catch (_) {}
                if (images.current.onImageFile) {
                  beginImageRef.current(undefined, undefined);
                }
              })();
              return true;
            }
          }
        }

        // 3. 🎯 [외부 문서 스마트 붙여넣기 파이프라인]: 웹페이지/MS Word/Excel/Notion 등의 풍부한 HTML 서식 자동 정제
        if (hasRichHtml && !isExplicitPureMarkdown && codecRef.current) {
          event.preventDefault();
          event.stopPropagation();

          // 3-1. HTML 내부에 base64 이미지가 포함된 경우 (Word 등에서 이미지와 본문 동시 복사)
          if (/<img\b[^>]*src=["']data:image\//i.test(html) && images.current.onImageFile) {
            void (async () => {
              try {
                const markdown = await importHtmlWithImages(html, async (base64, mime) => {
                  const binaryStr = atob(base64);
                  const len = binaryStr.length;
                  const u8arr = new Uint8Array(len);
                  for (let i = 0; i < len; i++) u8arr[i] = binaryStr.charCodeAt(i);
                  const ext = ({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' } as Record<string, string>)[mime] || 'png';
                  const file = new File([u8arr], `paste_${Date.now()}.${ext}`, { type: mime });
                  if (images.current.onImageFile) {
                    const saved = await images.current.onImageFile(file);
                    if (saved) return saved;
                  }
                  return `data:${mime};base64,${base64}`;
                });
                const cleanMd = sanitizePastedText(markdown);
                currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current!, cleanMd));
              } catch (err) {
                console.error('[VisualDocumentEditor] HTML image import failed:', err);
                const fallbackMd = htmlToImportMarkdown(html);
                currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current!, fallbackMd));
              }
            })();
            return true;
          }

          // 3-2. 일반 웹페이지/워드/엑셀 서식 HTML 정제 (제목, 표, 목록, 굵게/기울임, 링크 등)
          const convertedMd = htmlToImportMarkdown(html);
          if (convertedMd.trim()) {
            const cleanMd = sanitizePastedText(convertedMd);
            currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current, cleanMd));
            return true;
          }
        }

        // 4. 순수 마크다운 또는 탭(TSV) 표 텍스트 복사 처리
        if (codecRef.current) {
          let processedText = text;
          if (text.includes('\t') && text.includes('\n') && !text.includes('|')) {
            processedText = sanitizePastedText(text);
          }
          if (/^(?:\uFEFF)?---[^\S\r\n]*\r?\n/.test(processedText) || /(^|\n)(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*>\s|```|\|)|\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\(|^\s*<(?:video|iframe)\b/.test(processedText)) {
            currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current, processedText));
            return true;
          }
        }

        return false;
      },
      handleDrop(currentView, event) {
        clearDropIndicator();
        if (!currentView.editable) return false;
        const e = event as DragEvent;
        const dt = e.dataTransfer;
        if (!dt) return false;
        const types = dt.types ? Array.from(dt.types) : [];
        const isPotential = types.includes('Files') || !!parseDroppedDataToBlob(dt)
          || /^(?:file:\/\/\/|[A-Za-z]:[\\/])/.test(dt.getData('text/plain') || dt.getData('text/uri-list') || '');
        if (isPotential) {
          e.preventDefault();
          e.stopPropagation();
          void executeDropImageInsertion(currentView, e);
          return true;
        }
        return false;
      },
      handleClickOn(currentView, _pos, node, nodePos, event) {
        if (node.type === visualSchema.nodes.horizontal_rule) {
          event.preventDefault();
          placeCursorBeforeHorizontalRule(currentView, nodePos);
          caretRef.current?.schedule();
          return true;
        }
        return false;
      },
      handleClick(currentView, pos, event) {
        // A completed drag must keep its range; click correction only applies to a caret.
        if (!currentView.state.selection.empty || document.getSelection()?.isCollapsed === false) return false;
        const clickedFootnoteDef = (event.target as HTMLElement | null)?.closest('.visual-footnote-def');
        const clickedFootnoteArea = (event.target as HTMLElement | null)?.closest('.visual-footnote-area-header, .visual-footnote-def-container');
        if (clickedFootnoteArea && !clickedFootnoteDef) {
          event.preventDefault();
          return true;
        }
        const clickedHrPos = findClickedHorizontalRulePos(currentView, event);
        if (clickedHrPos >= 0) {
          event.preventDefault();
          placeCursorBeforeHorizontalRule(currentView, clickedHrPos);
          caretRef.current?.schedule();
          return true;
        }
        if (currentView.state.selection instanceof NodeSelection && currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule) {
          event.preventDefault();
          placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
          caretRef.current?.schedule();
          return true;
        }
        const emptyParagraphPos = emptyParagraphAtClick(currentView, event);
        if (emptyParagraphPos !== null && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, emptyParagraphPos)));
          currentView.focus();
          caretRef.current?.schedule();
          return true;
        }
        const lineEndPos = paragraphLineEndAtClick(currentView, event);
        if (lineEndPos !== null && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, lineEndPos)));
          currentView.focus();
          caretRef.current?.schedule();
          return true;
        }
        const anchor = (event.target as HTMLElement | null)?.closest?.('a');
        let href = anchor?.getAttribute('href') || '';
        if (!href) {
          const mark = currentView.state.doc.resolve(pos).marks().find(m => m.type === visualSchema.marks.link);
          if (mark?.attrs?.href) href = mark.attrs.href;
        }
        href = href.trim();
        if (!href) {
          if (!event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
            const target = event.target as HTMLElement | null;
            if (!target?.closest('a, button, input, select, textarea, [contenteditable="false"]')) {
              const coords = { left: event.clientX, top: event.clientY };
              let posInfo = currentView.posAtCoords(coords);
              let targetPos = posInfo && typeof posInfo.pos === 'number' ? posInfo.pos : null;
              if (targetPos === null) {
                const bounds = currentView.dom.getBoundingClientRect();
                if (event.clientY > bounds.bottom - 40) {
                  targetPos = currentView.state.doc.content.size;
                } else {
                  const clampX = Math.max(bounds.left + 8, Math.min(event.clientX, bounds.right - 8));
                  const fallback = currentView.posAtCoords({ left: clampX, top: event.clientY });
                  if (fallback && typeof fallback.pos === 'number') targetPos = fallback.pos;
                }
              }
              if (targetPos !== null) {
                const clamped = Math.max(0, Math.min(targetPos, currentView.state.doc.content.size));
                const $targetPos = currentView.state.doc.resolve(clamped);
                currentView.dispatch(currentView.state.tr.setSelection(TextSelection.near($targetPos)));
                currentView.focus();
                caretRef.current?.schedule();
                return true;
              }
            }
          }
          return false;
        }

        if (href.startsWith('<') && href.endsWith('>')) {
          href = href.slice(1, -1).trim();
        }
        href = href.replace(/^[<"']|[>"']$/g, '').trim();

        if (href.startsWith('#') || href.startsWith('.#')) {
          const rawId = href.startsWith('.#') ? href.slice(2) : href.slice(1);
          const targetId = decodeURIComponent(rawId);
          const targetEl = document.getElementById(targetId) || Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(h => (h.textContent?.trim() || '').normalize('NFC') === targetId.normalize('NFC'));
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            event.preventDefault();
            return true;
          }
        }

        const isMdFile = href.endsWith('.md') || href.endsWith('.markdown') || href.includes('.md#') || href.includes('.markdown#');
        const isKnowledgeLink = href.startsWith('knowledge://');
        const isRelativeDoc = !/^(https?:|mailto:|tel:)/i.test(href) && (isMdFile || isKnowledgeLink || href.includes('.md'));

        if (isRelativeDoc && onFileOpenRef.current) {
          event.preventDefault();
          event.stopPropagation();
          const cleanHref = href.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();
          const hashPart = href.includes('#') ? href.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim() : undefined;

          let resolved = cleanHref;
          if (cleanHref.startsWith('file:///')) {
            resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
          } else if (currentFilePathRef.current) {
            resolved = resolveDocPath(cleanHref, currentFilePathRef.current);
          }
          onFileOpenRef.current(resolved, hashPart);
          return true;
        }

        let targetUrl = href;
        if (targetUrl.startsWith('www.')) targetUrl = `https://${targetUrl}`;
        const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        if (api?.openExternal && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:'))) {
          event.preventDefault();
          api.openExternal(targetUrl);
          return true;
        } else if (api?.openPath && (targetUrl.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(targetUrl))) {
          event.preventDefault();
          const cleanLocalPath = targetUrl.startsWith('file:///') ? decodeURIComponent(targetUrl.replace(/^file:\/\/\//, '')) : targetUrl;
          api.openPath(cleanLocalPath);
          return true;
        } else if (/^(https?:|mailto:|tel:)/i.test(targetUrl) || targetUrl.startsWith('www.')) {
          event.preventDefault();
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        copy(currentView, event) {
          if (!hasMultiCellTableSelection(currentView.state)) return false;
          event.preventDefault();
          onToastRef.current?.('여러 표 셀의 서식 복사는 지원하지 않습니다. 셀 안의 글을 각각 선택해 복사해 주세요.', 'info');
          return true;
        },
        cut(currentView, event) {
          if (!hasMultiCellTableSelection(currentView.state)) return false;
          event.preventDefault();
          onToastRef.current?.('여러 표 셀의 잘라내기는 표 구조를 보호하기 위해 사용할 수 없습니다.', 'info');
          return true;
        },
        mousedown(currentView, event) {
          if (!currentView.editable) return false;
          // 🔥 에디터 본문 마우스 클릭 시 플로팅 서식 툴바 닫기 (사용자 명세: ESC 또는 에디터 마우스 클릭 시에만 툴바 닫힘)
          if (manualFloatingRef.current || selectionVisibleRef.current) {
            manualFloatingRef.current = false;
            setSelection(false);
          }
          const e = event as MouseEvent;
          if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
          const hrPos = findClickedHorizontalRulePos(currentView, e);
          if (hrPos >= 0) {
            e.preventDefault();
            e.stopPropagation();
            placeCursorBeforeHorizontalRule(currentView, hrPos);
            caretRef.current?.schedule();
            return true;
          }
          // 🛡️ [선택 영역 내부 클릭 시 선택 해제 및 커서 즉시 이동]
          // Chromium contenteditable에서 선택된 텍스트 위를 클릭했을 때 브라우저가 드래그(DnD)를 대기하느라
          // 선택이 풀리지 않고 유지되는 고질적 결함을 원천 방어하여, 마우스 클릭 위치로 즉시 단일 커서(Caret) 배치
          const target = e.target as HTMLElement | null;
          // 🛡️ [코드 블록 하단 여백/캔버스 클릭 시 하단 빈 문단으로 즉시 포커스 이동 및 연속 타이핑 보장]
          if (!target?.closest('a, button, input, textarea, pre, code, [contenteditable="false"]')) {
            const surfaceEl = currentView.dom;
            const lastChild = currentView.state.doc.lastChild;
            if (lastChild && lastChild.type === visualSchema.nodes.code_block) {
              const rect = surfaceEl.getBoundingClientRect();
              if (e.target === surfaceEl || e.clientY > rect.bottom - 60) {
                e.preventDefault();
                const afterPos = currentView.state.doc.content.size;
                let tr = currentView.state.tr;
                tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
                currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
                currentView.focus();
                caretRef.current?.schedule();
                return true;
              }
            }
          }
          return false;
        },
        compositionend(currentView) {
          setTimeout(() => { if (viewRef.current === currentView && !headingFormatsRef.current.readOnly && !currentView.composing) currentView.dispatch(currentView.state.tr.setMeta('onrivi:heading-numbering', true)); }, 50);
          return false;
        },
        compositionstart(currentView) {
          if (currentView.state.selection instanceof NodeSelection && currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule) {
            placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
            caretRef.current?.schedule();
          }
          return false;
        },
        dragover(currentView, event) {
          if (!currentView.editable) return false;
          const e = event as DragEvent;
          const types = e.dataTransfer?.types;
          if (!types || !Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
            return false;
          }
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          updateDropIndicator(currentView, e);
          return true;
        },
        dragenter(currentView, event) {
          if (!currentView.editable) return false;
          const e = event as DragEvent;
          const types = e.dataTransfer?.types;
          if (!types || !Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
            return false;
          }
          e.preventDefault();
          e.stopPropagation();
          updateDropIndicator(currentView, e);
          return true;
        },
        dragleave(currentView, event) {
          const e = event as DragEvent;
          if (!currentView.dom.contains(e.relatedTarget as Node | null)) {
            clearDropIndicator();
          }
          return false;
        },
        drop(currentView, event) {
          clearDropIndicator();
          const e = event as DragEvent;
          const dt = e.dataTransfer;
          if (!dt || !currentView.editable) return false;
          const types = dt.types ? Array.from(dt.types) : [];
          const isPotential = types.some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain');
          if (isPotential) {
            e.preventDefault();
            e.stopPropagation();
            void executeDropImageInsertion(currentView, e);
            return true;
          }
          return false;
        },
        mouseup(currentView) {
          cancelAnimationFrame(cursorFrame.current);
          cursorFrame.current=requestAnimationFrame(()=>{
            if(viewRef.current!==currentView || currentView.composing || !currentView.hasFocus())return;
            synchronizeTextSelection(currentView);
            const codec=codecRef.current;if(!codec || !cursorCallback.current)return;
            try {
              const token='ONRIVICURSORMAP';
              const offset=codec.serialize(currentView.state.tr.insertText(token,currentView.state.selection.head).doc).indexOf(token);
              if(offset>=0)cursorCallback.current(offset, true);
            } catch {}
          });
          return false;
        }, blur(_currentView, event) {
          const next = (event as FocusEvent).relatedTarget;
          if (next instanceof Node && document.getElementById('floating-toolbar')?.contains(next)) return false;
          manualFloatingRef.current = false; setSelection(false); setSlash(false); return false;
        } },
    });
    viewRef.current = view;
    try {
      const initialTagInfo = getActiveTagInfo(view.state);
      setTagInfo(initialTagInfo);
      window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: initialTagInfo }));
    } catch {}
    if(aiTargetRef)aiTargetRef.current=(scope)=>{synchronizeTextSelection(view);return aiTargets.capture(view,documentId||'',scope);};
    (hostEl as SearchEditorHost).onriviSearchView = view;
    hostEl.setAttribute('data-onrivi-search-editor', '');
    caretRef.current = installVisualCaret(view);
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!view.editable || event.defaultPrevented || event.isComposing) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl === view.dom || view.dom.contains(activeEl) || activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) {
        return;
      }
      if (view.state.selection instanceof NodeSelection && ATOM_BLOCK_TYPES.has(view.state.selection.node.type.name)) {
        const isModEnter = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
        const isEnterOrDown = !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === 'ArrowDown');
        if (isModEnter || isEnterOrDown) {
          if (exitMediaBlock(true)(view.state, view.dispatch, view)) {
            event.preventDefault();
            event.stopPropagation();
            caretRef.current?.schedule();
          }
        }
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    // A boundary is shared by two columns; dragging it changes only those two widths.
    let activeResize: {
      pos: number; boundary: number; widths: number[]; latest: number[];
      startX: number; tableWidth: number; leftCol: HTMLTableColElement; rightCol: HTMLTableColElement;
    } | null = null;
    const resizeHit = (event: PointerEvent) => {
      // Collapsed table borders often target the table or row rather than a cell.
      const target = event.target instanceof Element ? event.target : null;
      const table = target?.closest<HTMLTableElement>('table.visual-editable-table')
        || Array.from(view.dom.querySelectorAll<HTMLTableElement>('table.visual-editable-table')).find(candidate => {
          const bounds = candidate.getBoundingClientRect();
          return event.clientX >= bounds.left - 2 && event.clientX <= bounds.right + 2
            && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        });
      if (!table || !view.dom.contains(table)) return null;
      const rect = table.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom) return null;
      const header = table.rows[0];
      if (!header || header.cells.length < 2) return null;
      let boundary = -1;
      let distance = 14;
      for (let index = 0; index < header.cells.length - 1; index++) {
        const edge = header.cells[index].getBoundingClientRect().right;
        const nextDistance = Math.abs(event.clientX - edge);
        if (nextDistance < distance) { boundary = index; distance = nextDistance; }
      }
      if (boundary < 0) return null;
      const row = Array.from(table.rows).find(candidate => {
        const bounds = candidate.getBoundingClientRect();
        return event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      });
      const cell = row?.cells[boundary] || header.cells[boundary];
      return { cell, table, boundary, edge: 'right' };
    };
    const handleTableResizeMove = (event: MouseEvent) => {
      if (!activeResize) return;
      const drag = activeResize;
      event.preventDefault();
      const next = resizeTableBoundary(drag.widths, drag.boundary, (event.clientX - drag.startX) * 100 / drag.tableWidth);
      if (next[drag.boundary] === drag.latest[drag.boundary]) return;
      drag.latest = next;
      // Preview only the two affected columns. Save the document once on mouseup.
      drag.leftCol.style.width = `${next[drag.boundary]}%`;
      drag.rightCol.style.width = `${next[drag.boundary + 1]}%`;
    };
    const stopTableResize = (event?: Event) => {
      const drag = activeResize;
      activeResize = null;
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', handleTableResizeMove);
      document.removeEventListener('mousemove', handleTableResizeMove);
      document.removeEventListener('pointerup', stopTableResize);
      document.removeEventListener('mouseup', stopTableResize);
      if (!drag) return;
      if ((event?.type === 'pointerup' || event?.type === 'mouseup') && drag.latest.some((width, index) => width !== drag.widths[index])) {
        const tableNode = view.state.doc.nodeAt(drag.pos);
        if (tableNode?.type.name === 'table') {
          view.dispatch(view.state.tr.setNodeMarkup(drag.pos, undefined, { ...tableNode.attrs, widths: drag.latest }));
          return;
        }
      }
      drag.leftCol.style.width = `${drag.widths[drag.boundary]}%`;
      drag.rightCol.style.width = `${drag.widths[drag.boundary + 1]}%`;
    };
    const startTableResize = (event: PointerEvent) => {
      if (readOnly || event.button !== 0) return;
      const hit = resizeHit(event);
      if (!hit) return;
      const cellPos = view.posAtDOM(hit.cell, 0);
      const resolved = view.state.doc.resolve(cellPos);
      let pos = -1;
      for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).type.name === 'table') { pos = resolved.before(depth); break; }
      }
      if (pos < 0) return;
      const tableNode = view.state.doc.nodeAt(pos);
      if (tableNode?.type.name !== 'table') return;
      const count = tableNode.firstChild?.childCount || 0;
      const widths = validColumnRatios(tableNode.attrs.widths, count) || equalColumnRatios(count);
      if (widths.length < 2) return;
      event.preventDefault();
      event.stopPropagation();
      const cols = hit.table.querySelectorAll<HTMLTableColElement>('colgroup > col');
      const leftCol = cols[hit.boundary], rightCol = cols[hit.boundary + 1];
      if (!leftCol || !rightCol) return;
      activeResize = { pos, boundary: hit.boundary, widths, latest: widths, startX: event.clientX,
        tableWidth: hit.table.getBoundingClientRect().width, leftCol, rightCol };
      document.body.style.cursor = 'col-resize';
      document.addEventListener('pointermove', handleTableResizeMove);
      document.addEventListener('mousemove', handleTableResizeMove);
      document.addEventListener('pointerup', stopTableResize);
      document.addEventListener('mouseup', stopTableResize);
    };
    hostEl.addEventListener('pointerdown', startTableResize, true);
    const scrollContainer=hostEl.closest('.custom-preview-container') as HTMLElement|null;
    // A scene editor mounts inside an already-scrolled picturebook. Resetting
    // the shared document viewport here jumps back to the scene list.
    if(scrollContainer && !hostEl.closest('[data-book-text]')){scrollContainer.scrollTop=cached?.source===content ? cached.scrollTop || 0 : 0;scrollContainer.scrollLeft=cached?.source===content ? cached.scrollLeft || 0 : 0;}
    // Codec belongs to this editor instance, keeping unchanged source node bytes.
    (view as EditorView & { replaceSource?: (source: string) => void }).replaceSource = source => {
      aiTargets.clear();
      imageTargets.current.forEach(target => { target.valid = false; });
      const top=scrollContainer?.scrollTop,left=scrollContainer?.scrollLeft;
      const nextCodec=createVisualDocumentCodec(source);
      const oldDoc=view.state.doc;
      if(oldDoc.content.eq(nextCodec.doc.content)){
        const mapped=new Map<import('prosemirror-model').Node,string>();
        oldDoc.forEach((node,_offset,index)=>{const raw=nextCodec.originalSource(nextCodec.doc.child(index));if(raw!==undefined)mapped.set(node,raw);});
        nextCodec.adopt({doc:oldDoc,originalSource:node=>mapped.get(node)});
        if(oldDoc.attrs.frontmatter!==nextCodec.doc.attrs.frontmatter)view.updateState(view.state.apply(view.state.tr.setDocAttribute('frontmatter',nextCodec.doc.attrs.frontmatter).setMeta('addToHistory',false)));
      } else {
        const from=oldDoc.content.findDiffStart(nextCodec.doc.content);
        const end=oldDoc.content.findDiffEnd(nextCodec.doc.content);
        let tr=view.state.tr;
        if(from!==null && end){const overlap=from-Math.min(end.a,end.b);const oldEnd=end.a+Math.max(0,overlap),newEnd=end.b+Math.max(0,overlap);tr=tr.replace(from,oldEnd,nextCodec.doc.slice(from,newEnd));}
        tr=tr.setDocAttribute('frontmatter',nextCodec.doc.attrs.frontmatter).setMeta('addToHistory',false);
        view.updateState(view.state.apply(tr));
        const preserved=new Map<import('prosemirror-model').Node,string>();
        view.state.doc.forEach((node,_offset,index)=>{const matching=nextCodec.doc.maybeChild(index);if(matching?.eq(node)){const raw=nextCodec.originalSource(matching);if(raw!==undefined)preserved.set(node,raw);}});
        nextCodec.adopt({doc:view.state.doc,originalSource:node=>preserved.get(node)});
      }
      codec=nextCodec;codecRef.current=codec;emitted.current=source;
      setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || ''));
      if(scrollContainer && top!==undefined){scrollContainer.scrollTop=top;scrollContainer.scrollLeft=left || 0;}
      const initTblCtx = tableContext(view.state);
      const currentInTable = Boolean(initTblCtx);
      currentTablePosRef.current = initTblCtx ? initTblCtx.pos : null;
      setTableToolbarDismissed(false);
      setInTable(currentInTable);
      setActiveMarks(view.state.selection.$from.marks().map(mark=>mark.type.name));
      const nextInitTagInfo = getActiveTagInfo(view.state);
      setTagInfo(nextInitTagInfo);
      try {
        window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: nextInitTagInfo }));
      } catch {}
      caretRef.current?.schedule();
      // 🔥 서식 적용 후 마크다운 소스 동기화 시 플로팅 서식 툴바 유지
      setSlash(false);
    };
    return () => {
      aiTargets.clear();if(aiTargetRef)aiTargetRef.current=null;
      clearDropIndicator();
      window.removeEventListener('keydown', handleWindowKeyDown);
      stopTableResize();
      hostEl.removeEventListener('pointerdown', startTableResize, true);
      window.removeEventListener('dragover', handleWindowDragOver, true);
      window.removeEventListener('dragend', handleWindowDragEnd, true);
      window.removeEventListener('drop', handleWindowDrop, true);
      window.removeEventListener('dragleave', handleWindowDragLeave, true);
      window.removeEventListener('mouseup', handleWindowDragEnd, true);
      hostEl.removeEventListener('mouseleave', handleWindowDragEnd);
      if (dropCaretVertical.parentNode) {
        dropCaretVertical.parentNode.removeChild(dropCaretVertical);
      }
      if (dropLineHorizontal.parentNode) {
        dropLineHorizontal.parentNode.removeChild(dropLineHorizontal);
      }
      if (documentId) {
        sessions.set(documentId, { source: emitted.current, state: view.state, codec,scrollTop:scrollContainer?.scrollTop,scrollLeft:scrollContainer?.scrollLeft });
        if (sessions.size > 20) sessions.delete(sessions.keys().next().value!);
      }
      pendingImages.forEach(target => { target.valid = false; }); pendingImages.clear();
      caretRef.current?.destroy(); caretRef.current = null;
      delete (hostEl as SearchEditorHost).onriviSearchView;
      hostEl.removeAttribute('data-onrivi-search-editor');
      view.destroy(); viewRef.current = null;
    };
    // Document identity is supplied as the parent key; local input never remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current as (EditorView & { replaceSource?: (source: string) => void }) | null;
    // 🛡️ [입력 방어] view.hasFocus() 활성 시 사용자가 직접 타이핑 중이므로 외부 content prop에 의한 replaceSource를 차단하여 스페이스 및 엔터 먹힘 방지
    if (view && content !== emitted.current && !view.hasFocus()) view.replaceSource?.(content);
  }, [content]);
  const headingNumberingKey = JSON.stringify(headingNumbering);
  useEffect(() => {
    const view = viewRef.current;
    if (view && !readOnly && !view.composing) view.dispatch(view.state.tr.setMeta('onrivi:heading-numbering', true).setMeta('addToHistory', false));
  }, [headingNumberingKey, content, readOnly]);


  useEffect(() => {
    if (readOnly || viewRef.current?.hasFocus()) return;
    const normalized = bulletNumbersAsText(normalizeVisualMarkdownSpacing(content));
    if (normalized !== content) {
      emitted.current = normalized;
      callback.current(normalized);
    }
  }, [content, readOnly]);
  useEffect(()=>{
    const sync=(event:Event)=>{
      const detail=(event as CustomEvent).detail;
      const offset=detail?.offset,view=viewRef.current,codec=codecRef.current;
      if(!view || !codec || typeof offset!=='number' || (!detail?.force && view.hasFocus()))return;
      const token='ONRIVICURSORMAP';let low=0,high=view.state.doc.content.size,best=1;
      while(low<=high){const mid=Math.floor((low+high)/2);const selection=TextSelection.near(view.state.doc.resolve(mid));const pos=selection.head;
        const marked=codec.serialize(view.state.tr.insertText(token,pos).doc);const index=marked.indexOf(token);
        if(index<0)break;best=pos;if(index===offset)break;if(index<offset)low=mid+1;else high=mid-1;
      }
      let targetSelection: Selection = TextSelection.near(view.state.doc.resolve(best));
      const term = detail?.term;
      if (term && typeof term === 'string' && term.trim()) {
        const docText = view.state.doc.textBetween(Math.max(0, best - 20), Math.min(view.state.doc.content.size, best + term.length + 50));
        const relIdx = docText.toLowerCase().indexOf(term.toLowerCase());
        if (relIdx !== -1) {
          const actualFrom = Math.max(0, best - 20) + relIdx;
          targetSelection = TextSelection.create(view.state.doc, actualFrom, actualFrom + term.length);
        }
      }
      view.dispatch(view.state.tr.setSelection(targetSelection).scrollIntoView());
      caretRef.current?.schedule();
      if (detail?.highlight) {
        try {
          const domPos = view.domAtPos(best);
          const node = domPos.node instanceof HTMLElement ? domPos.node : domPos.node.parentElement;
          const block = node?.closest('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure') as HTMLElement | null;
          if (block) {
            block.classList.remove('preview-highlight-line');
            void block.offsetWidth;
            block.classList.add('preview-highlight-line');
            setTimeout(() => block.classList.remove('preview-highlight-line'), 3000);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('onrivi:source-cursor',sync);return()=>window.removeEventListener('onrivi:source-cursor',sync);
  },[]);
  useEffect(() => { viewRef.current?.setProps({ editable: () => !readOnly }); caretRef.current?.schedule(); }, [readOnly]);

  const run = (command: Command, removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const stored = view.state.storedMarks;
    synchronizeTextSelection(view);
    if (removeSlash && slashRange.current) {
      const { from, to } = slashRange.current;
      let transaction = view.state.tr.delete(from, to);
      transaction = transaction.setSelection(TextSelection.create(transaction.doc, from));
      if (stored) transaction = transaction.setStoredMarks(stored);
      view.dispatch(transaction);
      slashRange.current = null; setSlash(false);
    }
    command(view.state, view.dispatch, view);
    view.focus();
  };
  const insertParagraphBeforeFirstBlock = () => {
    const view = viewRef.current;
    if (!view || !view.editable || !FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || '')) return;
    const tr = view.state.tr.insert(0, visualSchema.nodes.paragraph.create());
    view.dispatch(closeHistory(tr.setSelection(TextSelection.create(tr.doc, 1)).scrollIntoView()));
    view.focus();
    caretRef.current?.schedule();
  };
  const setQuote = (alertType:string|null):Command => (state,dispatch,view) => {
    const position=state.selection.$from;
    for(let depth=position.depth;depth>0;depth--) {
      if(position.node(depth).type===visualSchema.nodes.blockquote){
        const existingAlert = position.node(depth).attrs.alertType || null;
        // 🔥 동일 인용구(일반 또는 동일 Alert 태그) 재클릭 시 인용구 취소(lift)
        if (existingAlert === (alertType || null)) {
          return lift(state, dispatch, view);
        }
        if (dispatch) {
          let tr = state.tr.setNodeMarkup(position.before(depth),undefined,{alertType});
          const afterPos = position.after(depth);
          if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
            const savedFrom = tr.selection.from;
            const savedTo = tr.selection.to;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, savedFrom, savedTo));
          }
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
    }
    return wrapIn(visualSchema.nodes.blockquote,{alertType})(
      state,
      dispatch
        ? (tr) => {
            const $from = tr.selection.$from;
            for (let depth = $from.depth; depth > 0; depth--) {
              if ($from.node(depth).type === visualSchema.nodes.blockquote) {
                const afterPos = $from.after(depth);
                const savedFrom = tr.selection.from;
                const savedTo = tr.selection.to;
                tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
                tr = tr.setSelection(TextSelection.create(tr.doc, savedFrom, savedTo));
                break;
              }
            }
            dispatch(tr.scrollIntoView());
          }
        : undefined,
      view
    );
  };
  const blockCommands: [string, Command][] = [
    ['본문', setBlockType(visualSchema.nodes.paragraph)],
    ['제목 1', setHeadingBlock(1)],
    ['제목 2', setHeadingBlock(2)],
    ['제목 3', setHeadingBlock(3)],
    ['글머리 목록', selectedList('bullet')],
    ['번호 목록', selectedList('ordered')],
    ['인용문', setQuote(null)],
    ['코드 블록', setCodeBlock],
    ['구분선', (state, dispatch) => {
      if (dispatch) {
        const hrNode = visualSchema.nodes.horizontal_rule.create();
        let tr = state.tr.replaceSelectionWith(hrNode);
        let insertedPos = -1;
        tr.doc.descendants((n, pos) => {
          if (n === hrNode) { insertedPos = pos; return false; }
          return true;
        });
        if (insertedPos >= 0) {
          const afterPos = insertedPos + hrNode.nodeSize;
          if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          }
          tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
        }
        dispatch(closeHistory(tr).scrollIntoView());
      }
      return true;
    }],
  ];
  const link: Command = (state, dispatch) => {
    const view = viewRef.current;
    if (!view || !view.editable) return false;
    const { from, to, empty } = view.state.selection;
    let selectedText = '';
    let existingHref = 'https://';
    if (!empty) {
      selectedText = view.state.doc.textBetween(from, to, ' ');
      const mark = view.state.doc.nodeAt(from)?.marks.find(m => m.type.name === 'link');
      if (mark?.attrs?.href) existingHref = mark.attrs.href;
    }
    linkTargetRef.current = { from, to, valid: true };
    setLinkDialogData({ text: selectedText, href: existingHref });
    setLinkDialog(true);
    return true;
  };
  linkCommandRef.current = link;

  const handleLinkConfirm = ({ text, href }: { text: string; href: string }) => {
    const view = viewRef.current;
    const target = linkTargetRef.current;
    if (!view || !target?.valid || !view.editable) {
      setNotice('문서나 삽입 위치가 변경되었습니다.');
      return;
    }
    linkTargetRef.current = null;
    const mark = visualSchema.marks.link.create({ href });
    const textNode = view.state.schema.text(text, [mark]);
    const tr = view.state.tr.replaceWith(target.from, target.to, textNode);
    const nextPos = target.from + text.length;
    tr.setSelection(TextSelection.create(tr.doc, nextPos));
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
  };
  const openDatePicker = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const from = view.state.selection.from;
    const to = view.state.selection.to;
    const rect = view.coordsAtPos(from);
    const isSlash = removeSlash && slashRange.current;
    dateTargetRef.current = {
      from: isSlash ? slashRange.current!.from : from,
      to: isSlash ? slashRange.current!.to : to,
      valid: true,
    };
    if (isSlash) {
      slashRange.current = null;
      setSlash(false);
    }
    setDatePickerPos({
      top: rect.bottom + 6,
      left: Math.max(16, rect.left),
    });
    setDatePickerOpen(true);
  };
  openDatePickerRef.current = openDatePicker;

  const handleDateInsert = (formattedDate: string) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    const target = dateTargetRef.current;
    if (target && target.valid) {
      let tr = view.state.tr.replaceWith(target.from, target.to, view.state.schema.text(formattedDate));
      const nextPos = target.from + formattedDate.length;
      tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
      view.dispatch(closeHistory(tr).scrollIntoView());
    } else {
      view.dispatch(view.state.tr.insertText(formattedDate).scrollIntoView());
    }
    view.focus();
    setDatePickerOpen(false);
    dateTargetRef.current = null;
  };
  const clear: Command = (state, dispatch, view) => {
    // Raw HTML containers are retained as source blocks by the visual codec.
    // Unwrap them before clearing marks, so <div> does not survive in Markdown.
    const sourceBlocks: Array<{pos: number; size: number; source: string}> = [];
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (node.type === visualSchema.nodes.source_block) {
        sourceBlocks.push({pos, size: node.nodeSize, source: node.attrs.source || ''});
        return false;
      }
    });
    if (sourceBlocks.length) {
      const tr = state.tr;
      for (const block of sourceBlocks.reverse()) {
        tr.replaceWith(block.pos, block.pos + block.size, createVisualDocumentCodec(clearMarkdownFormatting(block.source)).doc.content);
      }
      const from = tr.mapping.map(state.selection.from);
      const to = tr.mapping.map(state.selection.to);
      tr.removeMark(from, to).setStoredMarks([]);
      tr.setBlockType(from, to, visualSchema.nodes.paragraph);
      dispatch?.(closeHistory(tr));
      return true;
    }
    if(selectedList('clear')(state,dispatch,view))return true;
    const { from, to, $from } = state.selection;
    const transaction = state.tr.removeMark(state.selection.empty ? $from.start() : from,
      state.selection.empty ? $from.end() : to).setStoredMarks([]);
    if ($from.parent.isTextblock) {
      transaction.setBlockType(from, to, visualSchema.nodes.paragraph);
    }
    dispatch?.(transaction);
    if (view && dispatch) {
      for (let depth = 0; depth < 10; depth++) {
        const current = view.state;
        const parentNames = Array.from({ length: current.selection.$from.depth }, (_, index) => current.selection.$from.node(index + 1).type.name);
        if (!parentNames.some(name => name === 'list_item' || name === 'blockquote')) break;
        if (!liftListItem(visualSchema.nodes.list_item)(current, dispatch, view) && !lift(current, dispatch, view)) break;
      }
    }
    return true;
  };
  openTableRef.current = () => {
    const view=viewRef.current;if(!view?.editable)return;
    if(tableContext(view.state)){setNotice('현재 표는 행·열 추가로 확장할 수 있습니다. 새 표는 표 아래 본문에서 넣어 주세요.');return;}
    if(tableTargetRef.current)imageTargets.current.delete(tableTargetRef.current);
    const target={from:view.state.selection.from,to:view.state.selection.to,valid:true};
    tableTargetRef.current=target;imageTargets.current.add(target);setTableDialog(true);
  };
  const nativeCommands: Record<string, Command> = {
    bold: toggleMark(visualSchema.marks.strong),
    italic: toggleMark(visualSchema.marks.em),
    underline: toggleMark(visualSchema.marks.underline),
    inlineCode: toggleMark(visualSchema.marks.code),
    strikethrough: toggleMark(visualSchema.marks.strike),
    link, clear,
    quoteNote:setQuote('NOTE'),quoteTip:setQuote('TIP'),quoteImportant:setQuote('IMPORTANT'),quoteWarning:setQuote('WARNING'),quoteCaution:setQuote('CAUTION'),
    table:()=>{openTableRef.current();return true;},
    list: selectedList('bullet'), orderedList: selectedList('ordered'),
    checklist:makeChecklist, quote: setQuote(null), codeblock: setCodeBlock,
    divider: blockCommands[blockCommands.length - 1][1], undo, redo,
    math: () => { executeItem('math'); return true; }, latex: () => { executeItem('math'); return true; },
    footnote: () => { insertFootnote(); return true; }, fn: () => { insertFootnote(); return true; },
    signature: () => { applySignature(); return true; }, sign: () => { applySignature(); return true; },
    bibliography: () => { insertBibliography(); return true; }, citation: () => { openCitation(); return true; }, cite: () => { openCitation(); return true; },
    add_reference: () => { onReferenceSettingsRef.current?.(); return true; }, vibe: () => { onReferenceSettingsRef.current?.(); return true; },
  };
  for (let level = 1; level <= 6; level++) nativeCommands[`h${level}`] = setHeadingBlock(level);
  const insertFootnote = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let maxNum = 0;
    view.state.doc.descendants(node => {
      if (node.type.name === 'visual_footnote_ref' || node.type.name === 'visual_footnote_def') {
        const n = parseInt(node.attrs.label, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const label = String(maxNum + 1);
    let tr = view.state.tr;
    if (removeSlash && slashRange.current) {
      tr = tr.delete(slashRange.current.from, slashRange.current.to);
      slashRange.current = null;
      setSlash(false);
    }
    const { from, to } = tr.selection;
    const refNode = visualSchema.nodes.visual_footnote_ref.create({ label });
    // 🛡️ 선택된 문구가 있을 경우 지우지 않고 문구 바로 뒤(to)에 각주 번호 노드를 삽입
    tr = tr.insert(to, refNode);
    const defNode = visualSchema.nodes.visual_footnote_def.create({
      label,
      content: '각주 내용을 입력하세요'
    });
    const insertPos = tr.doc.content.size;
    tr = tr.insert(insertPos, defNode);
    const nextPos = to + refNode.nodeSize;
    tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
    view.dispatch(closeHistory(tr).scrollIntoView());

    const focusFootnoteInput = () => {
      const defEl = view.dom.querySelector(`[data-footnote-def="${label}"]`);
      if (defEl) {
        defEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const inputEl = defEl.querySelector('.visual-footnote-text') as HTMLElement | null;
        if (inputEl) {
          inputEl.focus();
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(inputEl);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          return true;
        }
      }
      return false;
    };

    requestAnimationFrame(() => {
      if (!focusFootnoteInput()) {
        setTimeout(focusFootnoteInput, 50);
      }
    });
  };
  insertFootnoteRef.current = insertFootnote;

  const applySignature = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable || !codecRef.current) return false;

    if (removeSlash && slashRange.current) {
      const range = slashRange.current;
      view.dispatch(view.state.tr.delete(range.from, range.to));
      slashRange.current = null;
      setSlash(false);
    }

    const { from, to } = view.state.selection;
    const token = `ONRIVICURSOR${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const transaction = view.state.tr.insertText(`${token}END`, to).insertText(`${token}START`, from);
    const marked = codecRef.current.serialize(transaction.doc);
    const start = marked.indexOf(`${token}START`);
    const end = marked.indexOf(`${token}END`);
    const source = marked.replace(`${token}START`, '').replace(`${token}END`, '');
    const selectedLength = Math.max(0, end - start - `${token}START`.length);
    const rawSelectedText = selectedLength > 0 ? source.slice(start, start + selectedLength) : '';
    const trimmedText = rawSelectedText.trim();

    let newSource = '';
    const divRegex = /^<div\s+align=["'](right|left)["'][^>]*>([\s\S]*?)<\/div>$/i;
    const match = trimmedText.match(divRegex);

    if (match) {
      // 1. 이미 <div align="left|right"> 로 감싸진 경우 unwrap 토글
      const unwrapped = match[2].trim();
      newSource = source.slice(0, start) + unwrapped + source.slice(start + selectedLength);
    } else if (trimmedText) {
      // 2. 텍스트가 선택된 경우: 공문서 서식 줄바꿈(공백 2칸) 보존하며 <div align="left">로 감싸기
      const lines = trimmedText.split('\n');
      const processedLines = lines.map((line: string) => {
        const rTrimmed = line.trimEnd();
        if (rTrimmed.length > 0 && !rTrimmed.endsWith('  ') && !rTrimmed.endsWith('<br>') && !rTrimmed.endsWith('<br/>')) {
          return rTrimmed + '  ';
        }
        return line;
      });
      const contentText = processedLines.join('\n');
      const wrapped = `<div align="left">\n\n${contentText}\n\n</div>\n`;
      newSource = source.slice(0, start) + wrapped + source.slice(start + selectedLength);
    } else {
      // 3. 선택 영역이 없는 경우: 오늘 날짜 기반 기본 공문서 서명 템플릿 삽입
      const now = new Date();
      const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const template = `\n\n<div align="left">\n\n${dateStr}  \n**작성자: 홍길동** <span style="color:#dc2626; border:1.5px solid #dc2626; border-radius:50%; padding:0 3px; font-size:0.85em; font-weight:bold;">인</span>\n\n</div>\n\n`;
      newSource = source.slice(0, start) + template + source.slice(start);
    }

    (view as any).replaceSource?.(newSource);
    callback.current(newSource);
    if (onToastRef.current) {
      onToastRef.current('서명/발신인 서식이 적용되었습니다.', 'success');
    } else {
      setNotice('서명/발신인 서식이 적용되었습니다.');
    }
    view.focus();
    return true;
  };
  applySignatureRef.current = applySignature;
  beginImageRef.current = (source, position, file) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    if(tableContext(view.state)){setNotice('표 안 미디어 삽입은 현재 Markdown 보기를 사용해 주세요.');return;}
    const from = position ?? view.state.selection.from;
    const target = { from, to: source ? from + (view.state.doc.nodeAt(from)?.nodeSize || 0) : position ?? view.state.selection.to, source, valid: true };
    imageTargets.current.add(target);
    const insert = (path: string, alt = '', fullMarkdown?: string) => {
      imageTargets.current.delete(target);
      if (!target.valid || viewRef.current !== view || !view.editable) return false;
      if (source && view.state.doc.nodeAt(target.from)?.attrs.source !== source) return false;

      let tr = view.state.tr;

      if (fullMarkdown && fullMarkdown.trim()) {
        const parsed = createVisualDocumentCodec(fullMarkdown.trim());
        const nodesToInsert = parsed.doc.content;
        if (source) {
          tr = tr.replaceWith(target.from, target.to, nodesToInsert);
        } else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, nodesToInsert);
            } else {
              try {
                tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(nodesToInsert as any);
              } catch {
                tr = tr.insert(target.from, nodesToInsert);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, nodesToInsert);
          }
          const afterPos = Math.min(tr.doc.content.size, target.from + nodesToInsert.size);
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size, afterPos + 1)));
        }
      } else {
        const title = source ? visualImageDetails(source).title : '';
        const rawAlt = (alt ?? '').replace(/\\([\\\[\]])/g, '$1');
        const unescapedAlt = /^[\\\[\]\s]+$/.test(rawAlt) ? '' : rawAlt;
        const cleanAlt = unescapedAlt ? unescapedAlt.replace(/([\\\[\]])/g, '\\$1') : '';
        const markdown = `![${cleanAlt}](${path.includes(' ') ? '<' + path + '>' : path}${title ? ' \"' + title.replace(/([\\\"])/g, '\\$1') + '\"' : ''})\n\n`;
        const node = visualSchema.nodes.visual_image.create({ source: markdown });
        if (source) tr = tr.replaceWith(target.from, target.to, node);
        else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, node);
            } else {
              try {
                tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(node);
              } catch {
                tr = tr.insert(target.from, node);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, node);
          }
          let insertedPos = -1;
          tr.doc.descendants((n, pos) => {
            if (n === node) { insertedPos = pos; return false; }
            return true;
          });
          if (insertedPos >= 0) {
            const afterPos = insertedPos + node.nodeSize;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          } else if (tr.selection.$to.parent === tr.doc || tr.selection.to === tr.doc.content.size) {
            tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
          }
        }
      }
      view.dispatch(closeHistory(tr).scrollIntoView()); view.focus(); return true;
    };
        if (file && images.current.onImageFile) {
      void images.current.onImageFile(file).then(path => {
        if (path && !insert(path, '')) setNotice('문서나 삽입 위치가 변경되었습니다. 저장된 사진을 다시 선택해 주세요.');
        if (!path) imageTargets.current.delete(target);
      }).catch(() => { imageTargets.current.delete(target); setNotice('이미지 저장에 실패했습니다. 리소스 폴더 연결을 확인해 주세요.'); });
    } else if (images.current.onImageDialog) images.current.onImageDialog(source || null, insert);
    else { imageTargets.current.delete(target); setNotice('사진 넣기 기능을 연결할 수 없습니다.'); }
  };
  beginMediaRef.current = (kind, source, position) => {
    const view = viewRef.current;
    if (!view?.editable || !images.current.onMediaDialog) return;
    if(tableContext(view.state)){setNotice('표 안 미디어 삽입은 현재 Markdown 보기를 사용해 주세요.');return;}
    const from = position ?? view.state.selection.from;
    const target = {from,to:source ? from + (view.state.doc.nodeAt(from)?.nodeSize || 0) : view.state.selection.to,source,valid:true};
    imageTargets.current.add(target);
    images.current.onMediaDialog(kind, source || null, code => {
      imageTargets.current.delete(target);
      if (!target.valid || viewRef.current !== view || !view.editable) return false;
      if (source && view.state.doc.nodeAt(target.from)?.attrs.source !== source) return false;

      const trimmed = code.trim();
      const isPureMedia = !!mediaDetails(trimmed);
      let tr = view.state.tr;

      if (!isPureMedia) {
        // 캡션이 포함된 마크다운 코드가 주입된 경우 createVisualDocumentCodec을 통해 문단+미디어로 안전 파싱
        const parsed = createVisualDocumentCodec(trimmed);
        const nodesToInsert = parsed.doc.content;
        if (nodesToInsert.size === 0) return false;

        if (source) {
          tr = tr.replaceWith(target.from, target.to, nodesToInsert);
        } else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, nodesToInsert);
            } else {
              try {
                tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(nodesToInsert as any);
              } catch {
                tr = tr.insert(target.from, nodesToInsert);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, nodesToInsert);
          }
          const afterPos = Math.min(tr.doc.content.size, target.from + nodesToInsert.size);
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size, afterPos + 1)));
        }
      } else {
        const node = visualSchema.nodes.visual_media.create({kind, source: trimmed + '\n\n'});
        if (source) tr = tr.replaceWith(target.from, target.to, node);
        else {
          tr = tr.setSelection(TextSelection.between(tr.doc.resolve(target.from), tr.doc.resolve(target.to))).replaceSelectionWith(node);
          let insertedPos = -1;
          tr.doc.descendants((n, pos) => {
            if (n === node) { insertedPos = pos; return false; }
            return true;
          });
          if (insertedPos >= 0) {
            const afterPos = insertedPos + node.nodeSize;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          } else if (tr.selection.to === tr.doc.content.size || tr.selection.$to.parent === tr.doc) {
            tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
          }
        }
      }
      view.dispatch(closeHistory(tr).scrollIntoView()); view.focus(); return true;
    });
  };
  const deleteCitationFromDoc = (key: string) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    const lowerKey = key.toLowerCase();

    const rangesToDelete: Array<{ from: number; to: number }> = [];
    view.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const match of Array.from(node.text.matchAll(citationPattern))) {
        const matchKey = match[1] || match[2];
        if (matchKey && matchKey.toLowerCase() === lowerKey) {
          rangesToDelete.push({ from: pos + match.index!, to: pos + match.index! + match[0].length });
        }
      }
    });

    for (let i = rangesToDelete.length - 1; i >= 0; i--) {
      tr = tr.delete(rangesToDelete[i].from, rangesToDelete[i].to);
    }

    let bibHeadingPos = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
        bibHeadingPos = pos;
        return false;
      }
    });

    if (bibHeadingPos >= 0) {
      const itemsToDelete: Array<{ from: number; to: number }> = [];
      view.state.doc.descendants((node, pos) => {
        if (pos > bibHeadingPos && node.type.name === 'list_item') {
          if (node.textContent.toLowerCase().includes(lowerKey)) {
            itemsToDelete.push({ from: pos, to: pos + node.nodeSize });
          }
        }
      });
      for (let i = itemsToDelete.length - 1; i >= 0; i--) {
        const mappedFrom = tr.mapping.map(itemsToDelete[i].from);
        const mappedTo = tr.mapping.map(itemsToDelete[i].to);
        tr = tr.delete(mappedFrom, mappedTo);
      }
    }

    view.dispatch(closeHistory(tr));
    view.focus();
    if (onToastRef.current) onToastRef.current('참고문헌이 삭제되었습니다.', 'success');
  };

  const deleteAllCitationsFromDoc = () => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    const rangesToDelete: Array<{ from: number; to: number }> = [];
    view.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const match of Array.from(node.text.matchAll(citationPattern))) {
        rangesToDelete.push({ from: pos + match.index!, to: pos + match.index! + match[0].length });
      }
    });
    for (let i = rangesToDelete.length - 1; i >= 0; i--) {
      tr = tr.delete(rangesToDelete[i].from, rangesToDelete[i].to);
    }
    view.dispatch(closeHistory(tr));
    view.focus();
    if (onToastRef.current) onToastRef.current('모든 참고문헌이 삭제되었습니다.', 'success');
  };

  const insertBibliography = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    if (removeSlash && slashRange.current) {
      tr = tr.delete(slashRange.current.from, slashRange.current.to);
      slashRange.current = null;
      setSlash(false);
    }
    let existingPos = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
        existingPos = pos;
        return false;
      }
    });

    if (existingPos >= 0) {
      const node = view.state.doc.nodeAt(existingPos);
      const targetPos = Math.min(tr.doc.content.size, existingPos + (node ? node.nodeSize : 0));
      tr = tr.setSelection(TextSelection.create(tr.doc, targetPos));
      view.dispatch(tr.scrollIntoView());
      view.focus();
      if (onToastRef.current) onToastRef.current('이미 참고문헌 섹션이 존재하여 해당 위치로 이동했습니다.', 'info');
      return;
    }

    const headingNode = visualSchema.nodes.heading.create({ level: 2 }, visualSchema.text('참고문헌'));
    const pNode = visualSchema.nodes.paragraph.create(null, visualSchema.text(''));
    const itemNode = visualSchema.nodes.list_item.create(null, pNode);
    const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);

    const insertPos = tr.doc.content.size;
    tr = tr.insert(insertPos, [headingNode, listNode]);

    const cursorTarget = insertPos + headingNode.nodeSize + 2;
    tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size - 1, cursorTarget)));
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
    if (onToastRef.current) onToastRef.current('문서 끝에 참고문헌 목록이 추가되었습니다.', 'success');
  };

  const executeItem = (id: string, removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    if(id==='aiHelp'){
      if(removeSlash&&slashRange.current){view.dispatch(view.state.tr.delete(slashRange.current.from,slashRange.current.to));slashRange.current=null;setSlash(false);}
      window.dispatchEvent(new Event('onrivi:open-inline-ai'));return;
    }
    if (['bibliography', 'bib', '참고문헌'].includes(id)) {
      insertBibliography(removeSlash);
      return;
    }
    if (['citation','cite'].includes(id)){openCitation(removeSlash);return;}
    if (['footnote', 'fn'].includes(id)) {
      insertFootnote(removeSlash);
      return;
    }
    if (['signature', 'sign', '서명', '사인'].includes(id)) {
      applySignature(removeSlash);
      return;
    }
    if (['youtube','map'].includes(id) && images.current.onMediaDialog) {
      if (removeSlash && slashRange.current) {view.dispatch(view.state.tr.delete(slashRange.current.from,slashRange.current.to)); slashRange.current=null; setSlash(false);}
      beginMediaRef.current(id === 'map' ? 'map' : 'video'); return;
    }
    if (id === 'image' && images.current.onImageDialog) {
      if (removeSlash && slashRange.current) {
        view.dispatch(view.state.tr.delete(slashRange.current.from, slashRange.current.to));
        slashRange.current = null; setSlash(false);
      }
      beginImageRef.current(); return;
    }
    if (id === 'now' || id === 'calendar') {
      openDatePicker(removeSlash);
      return;
    }
    if (id === 'taglink' && images.current.onDocLinkDialog) {
      const from = view.state.selection.from;
      const to = view.state.selection.to;
      const rect = view.coordsAtPos(from);
      const isSlash = removeSlash && slashRange.current;
      const target = {
        from: isSlash ? slashRange.current!.from : from,
        to: isSlash ? slashRange.current!.to : to,
        valid: true,
      };
      if (isSlash) {
        slashRange.current = null;
        setSlash(false);
      }
      const initialSelectedText = from < to ? view.state.doc.textBetween(from, to, ' ').trim() : '';
      images.current.onDocLinkDialog(
        { top: Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6)), left: Math.max(8, Math.min(window.innerWidth - 440, rect.left)) },
        (targetUrl: string, displayTitle: string) => {
          if (!target.valid || viewRef.current !== view || !view.editable) return false;
          const mark = visualSchema.marks.link.create({ href: targetUrl });
          const textNode = view.state.schema.text(displayTitle, [mark]);
          let tr = view.state.tr.replaceWith(target.from, target.to, textNode);
          const nextPos = target.from + displayTitle.length;
          tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
          view.dispatch(closeHistory(tr).scrollIntoView());
          view.focus();
          return true;
        },
        initialSelectedText
      );
      return;
    }
    if (id === 'math' || id === 'latex') {
      const isSlash = removeSlash && slashRange.current;
      const from = isSlash ? slashRange.current!.from : view.state.selection.from;
      const to = isSlash ? slashRange.current!.to : view.state.selection.to;
      if (isSlash) {
        slashRange.current = null;
        setSlash(false);
      }
      if (images.current.onFormulaDialog) {
        const target = { from, to, valid: true };
        imageTargets.current.add(target);
        images.current.onFormulaDialog((formulaCode: string) => {
          imageTargets.current.delete(target);
          if (!target.valid || viewRef.current !== view || !view.editable) return false;
          const cleanCode = formulaCode.trim();
          const isInline = cleanCode.startsWith('$') && !cleanCode.startsWith('$$') && cleanCode.endsWith('$') && cleanCode.length >= 2;
          let tr = view.state.tr;
          if (isInline) {
            const rawLatex = cleanCode.slice(1, -1).trim();
            const inlineNode = visualSchema.nodes.visual_inline_math.create({ latex: rawLatex });
            const spaceNode = view.state.schema.text(' ');
            tr = tr.replaceWith(target.from, target.to, [inlineNode, spaceNode]);
            const nextPos = target.from + inlineNode.nodeSize + spaceNode.nodeSize;
            tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
          } else {
            const rawLatex = cleanCode.startsWith('$$')
              ? cleanCode.replace(/^\$\$|\$\$$/g, '').trim()
              : cleanCode.startsWith('```')
                ? cleanCode.replace(/^```[a-z]*\r?\n|```$/gi, '').trim()
                : cleanCode;
            const mathNode = visualSchema.nodes.visual_math.create({ latex: rawLatex });
            const $from = tr.doc.resolve(target.from);
            if (target.from === target.to && $from.depth > 0) {
              tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(mathNode);
            } else {
              tr = tr.replaceWith(target.from, target.to, mathNode);
            }
            let insertedPos = -1;
            tr.doc.descendants((n, pos) => {
              if (n === mathNode) { insertedPos = pos; return false; }
              return true;
            });
            if (insertedPos >= 0) {
              const afterPos = insertedPos + mathNode.nodeSize;
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
              tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
            }
          }
          view.dispatch(closeHistory(tr).scrollIntoView());
          view.focus();
          return true;
        });
        return;
      }
      const sampleText = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
      const sampleNode = visualSchema.nodes.visual_math.create({ latex: sampleText });
      let tr = view.state.tr;
      const $from = tr.doc.resolve(from);
      if (from === to && $from.depth > 0) {
        tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(to))).replaceSelectionWith(sampleNode);
      } else {
        tr = tr.replaceWith(from, to, sampleNode);
      }
      let insertedPos = -1;
      tr.doc.descendants((n, pos) => {
        if (n === sampleNode) { insertedPos = pos; return false; }
        return true;
      });
      if (insertedPos >= 0) {
        const afterPos = insertedPos + sampleNode.nodeSize;
        tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
      } else if (tr.selection.to === tr.doc.content.size || tr.selection.$to.parent === tr.doc) {
        tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
      }
      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      return;
    }
    if (id === 'styleSettings' || id === 'style') {
      if (removeSlash && slashRange.current) {
        const range = slashRange.current;
        view.dispatch(view.state.tr.delete(range.from, range.to));
        slashRange.current = null; setSlash(false);
      }
      onStyleSettingsRef.current?.();
      return;
    }
    if (id === 'add_reference' || id === 'vibe') {
      if (removeSlash && slashRange.current) {
        const range = slashRange.current;
        view.dispatch(view.state.tr.delete(range.from, range.to));
        slashRange.current = null; setSlash(false);
      }
      onReferenceSettingsRef.current?.();
      return;
    }


    if (nativeCommands[id]) { run(nativeCommands[id], removeSlash); return; }
    if (removeSlash && slashRange.current) {
      const range = slashRange.current;
      view.dispatch(view.state.tr.delete(range.from, range.to));
      slashRange.current = null; setSlash(false);
    }
    if (!onSourceAction || !codecRef.current) { setNotice('이 명령은 Markdown 보기에서 사용할 수 있습니다.'); return; }
    // Map the visual selection to source without modifying the editor. Two
    // temporary plain tokens preserve the selected text and its mark wrappers.
    const token = `ONRIVICURSOR${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const { from, to } = view.state.selection;
    const transaction = view.state.tr.insertText(`${token}END`, to).insertText(`${token}START`, from);
    const marked = codecRef.current.serialize(transaction.doc);
    const start = marked.indexOf(`${token}START`);
    const end = marked.indexOf(`${token}END`);
    const source = marked.replace(`${token}START`, '').replace(`${token}END`, '');
    onSourceAction(id, source, start, end - `${token}START`.length);
  };
  executeItemRef.current = executeItem;
  useEffect(() => {
    if (!commandRef) return;
    const commands: Record<string, Command> = {
      UNDO: undo, REDO: redo,
      BOLD: toggleMark(visualSchema.marks.strong),
      ITALIC: toggleMark(visualSchema.marks.em),
      UNDERLINE: toggleMark(visualSchema.marks.underline),
      INLINE_CODE: toggleMark(visualSchema.marks.code),
      LIST: selectedList('bullet'), ORDERED_LIST: selectedList('ordered'),
      CHECK:makeChecklist,CHECKLIST:makeChecklist, QUOTE: setQuote(null), CODE_BLOCK: setCodeBlock,
      LINK: link, REMOVE_PREFIX: clear, CLEAR: clear, clear: clear,
      STRIKETHROUGH: toggleMark(visualSchema.marks.strike),
      QUOTE_NOTE:setQuote('NOTE'),QUOTE_TIP:setQuote('TIP'),QUOTE_IMPORTANT:setQuote('IMPORTANT'),QUOTE_WARNING:setQuote('WARNING'),QUOTE_CAUTION:setQuote('CAUTION'),
      TABLE:()=>{openTableRef.current();return true;}, QUICK_TABLE:()=>{openTableRef.current();return true;}, INSERT_TABLE_ROW:tableAction('addRow'), DELETE_TABLE_ROW:tableAction('deleteRow'),
      NOW: () => { openDatePickerRef.current(); return true; }, CALENDAR: () => { openDatePickerRef.current(); return true; },
      MATH: () => { executeItemRef.current('math'); return true; }, LATEX: () => { executeItemRef.current('math'); return true; },
      FOOTNOTE: () => { insertFootnoteRef.current?.(); return true; }, FN: () => { insertFootnoteRef.current?.(); return true; },
      SIGNATURE: () => { applySignatureRef.current(); return true; },
      CITATION: () => { openCitation(); return true; }, CITE: () => { openCitation(); return true; },
      TOGGLE_CSS_STYLE: () => { onStyleSettingsRef.current?.(); return true; },
            CLEAN_DOC: () => {
        if (!viewRef.current || readOnly || !codecRef.current) return true;
        const view = viewRef.current;
        const currentSource = codecRef.current.serialize(view.state.doc);
        const result = cleanMarkdownDocument(currentSource);
        if (!result.isModified) {
          if (onToastRef.current) onToastRef.current('정리할 서식이 없습니다.', 'info');
          else setNotice('정리할 서식이 없습니다.');
          return true;
        }
        (view as any).replaceSource?.(result.cleanedText);
        callback.current(result.cleanedText);
        if (onToastRef.current) onToastRef.current(result.summaryMessage, 'success');
        else setNotice(result.summaryMessage);
        return true;
      },
      ORGANIZE_FOOTNOTES: () => {
        if (!viewRef.current || readOnly || !codecRef.current) return true;
        const view = viewRef.current;
        const currentSource = codecRef.current.serialize(view.state.doc);
        const result = organizeMarkdownFootnotes(currentSource);
        if (result.count === 0) {
          if (onToastRef.current) onToastRef.current('정리할 각주가 본문에 없습니다.', 'info');
          else setNotice('정리할 각주가 본문에 없습니다.');
          return true;
        }
        if (!result.changed) {
          if (onToastRef.current) onToastRef.current('모든 각주가 이미 본문 순서대로 완벽히 정렬되어 있습니다.', 'info');
          else setNotice('모든 각주가 이미 본문 순서대로 완벽히 정렬되어 있습니다.');
          return true;
        }
        (view as any).replaceSource?.(result.text);
        callback.current(result.text);
        if (onToastRef.current) onToastRef.current(`총 ${result.count}개의 각주를 본문 순서에 맞추어 1번부터 순차적으로 재정렬했습니다.`, 'success');
        else setNotice(`총 ${result.count}개의 각주를 본문 순서에 맞추어 1번부터 순차적으로 재정렬했습니다.`);
        return true;
      },
    };
    for (let level = 1; level <= 6; level++) commands[`H${level}`] = setHeadingBlock(level);
    const bridge = (command: string) => {
      if (command.startsWith('INSERT_TEXT:')) {
        const view=viewRef.current;
        if (!view || readOnly) return true;
        view.dispatch(view.state.tr.insertText(command.slice('INSERT_TEXT:'.length)).scrollIntoView());
        view.focus(); caretRef.current?.schedule();
        return true;
      }
      if (command.startsWith('INSERT_SAVED_IMAGE:')) {
        const savedPath = command.slice('INSERT_SAVED_IMAGE:'.length).trim();
        const view = viewRef.current;
        if (!view || readOnly) return true;
        if (savedPath.startsWith('data:image/')) {
          console.warn('[VisualDocumentEditor] Base64 image insertion blocked by policy');
          return true;
        }
        const markdown = `![](${savedPath.includes(' ') ? '<' + savedPath + '>' : savedPath})\n\n`;
        const node = visualSchema.nodes.visual_image.create({ source: markdown });
        const target = lastDropTargetRef.current;
        let tr = view.state.tr;
        const insertPos = target ? Math.max(0, Math.min(target.pos, tr.doc.content.size)) : view.state.selection.to;
        const $pos = tr.doc.resolve(insertPos);

        if (target && target.insertMode === 'split' && $pos.parent.isTextblock && $pos.parentOffset > 0 && $pos.parentOffset < $pos.parent.content.size && canSplit(tr.doc, insertPos)) {
          tr = tr.split(insertPos);
          tr = tr.insert(insertPos + 1, node);
        } else if (target && target.insertMode === 'before' && $pos.depth >= 1) {
          tr = tr.insert($pos.before(1), node);
        } else if (target && target.insertMode === 'after' && $pos.depth >= 1) {
          tr = tr.insert($pos.after(1), node);
        } else {
          tr = tr.insert(insertPos, node);
        }

        let insertedPos = -1;
        tr.doc.descendants((n, pos) => {
          if (n === node) { insertedPos = pos; return false; }
          return true;
        });
        if (insertedPos >= 0) {
          const afterPos = insertedPos + node.nodeSize;
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
        } else if (tr.doc.lastChild?.type === visualSchema.nodes.visual_image) {
          tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
        }
        view.dispatch(closeHistory(tr).scrollIntoView());
        view.focus();
        lastDropTargetRef.current = null;
        return true;
      }
      if (command === 'TOGGLE_FLOATING_TOOLBAR' || command === 'SLASH_COMMAND') {
        const view = viewRef.current;
        if (!view || readOnly) return true;
        view.focus();
        const {from,to,$from,empty} = view.state.selection;
        const rect = view.coordsAtPos(from);
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = command === 'SLASH_COMMAND'
          ? (spaceBelow < 260 && rect.top > 260 ? Math.max(8, rect.top - 240) : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6)))
          : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
        setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
        if (command === 'SLASH_COMMAND') {
          const before = $from.parent.isTextblock ? $from.parent.textBetween(0, $from.parentOffset, '\n', '\n') : '';
          const match = before.match(slashPattern);
          slashRange.current = {from:empty && match ? from-match[1].length : from,to};
          setQuery(empty && match ? match[1].slice(1).toLowerCase() : '');
          manualFloatingRef.current=false; setSelection(false); setSlash(true);
        } else {
          setSlash(false); slashRange.current=null;
          manualFloatingRef.current=!selectionVisibleRef.current;
          setSelection(manualFloatingRef.current);
        }
        return true;
      }
      if (command === 'FOCUS') { viewRef.current?.focus(); return true; }
      if (command === 'ADD_REFERENCE') { onReferenceSettingsRef.current?.(); return true; }
      if (command === 'TOGGLE_CSS_STYLE') { onStyleSettingsRef.current?.(); return true; }
      if (command === 'CITE' || command === 'CITATION') {
        if (viewRef.current) synchronizeTextSelection(viewRef.current);
        openCitationRef.current(false);
        return true;
      }
      if (commands[command]) { run(commands[command]); return true; }
      const aliases: Record<string, string> = { HR:'divider', CHECK:'checklist', CHECKLIST:'checklist', BIBLIOGRAPHY:'bibliography', BIB:'bibliography', CITE:'citation', CITATION:'citation', FOOTNOTE:'footnote', FN:'footnote', DOCLINK:'taglink',
        NOW:'now', CALENDAR:'now',
        VIDEO:'youtube', YOUTUBE:'youtube', ADD_REFERENCE:'add_reference', TOGGLE_CSS_STYLE:'styleSettings', AI_DRAFT:'aiHelp', CODE:'codeblock', LATEX:'math', MATH:'math',
        SIGNATURE:'signature', SIGN:'signature' };
      const item = TOOLBAR_ITEMS.find(tool => tool.id === aliases[command] || tool.id.replace(/([A-Z])/g, '_$1').toUpperCase() === command);
      if (!item) return false;
      executeItemRef.current(item.id);
      return true;
    };
    commandRef.current = bridge;
    // Picturebook scene textareas share this ref. Reclaim it when this editor
    // receives focus again, rather than sending toolbar actions to the old field.
    const element = host.current;
    const activate = () => { commandRef.current = bridge; };
    element?.addEventListener('focusin', activate);
    return () => {
      element?.removeEventListener('focusin', activate);
      if (commandRef.current === bridge) commandRef.current = null;
    };
    // Commands read the current view state; do not reinstall on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandRef, readOnly]);
  const [pageGuides,setPageGuides]=useState(false);
  const [pdfPageHtml,setPdfPageHtml]=useState('');
  const [pdfPageBusy,setPdfPageBusy]=useState(false);
  const [pdfPageError,setPdfPageError]=useState('');
  const previewRequest=useRef(onPdfPagePreview);
  previewRequest.current=onPdfPagePreview;
  const pageStyleKey=JSON.stringify(pageStyle);
  const pageStyleRef = useRef(pageStyle);
  pageStyleRef.current = pageStyle;
  const togglePdfBreak=(anchor:PrintBreakAnchor,existingId?:string)=>{
    if(readOnly)return;
    const current=readPaginationSettings(content);
    const breaks=existingId
      ? current.breaks.filter(item=>item.id!==existingId)
      : current.breaks.some(item=>item.id===anchor.id)?current.breaks:[...current.breaks,anchor];
    onChange(writePaginationSettings(content,{version:1,breaks}));
  };
  const closePdfPages=()=>{
    pageStorage.setItem('onrivi_tabs_page_guides','false');
    window.dispatchEvent(new CustomEvent('onrivi:toggle-page-guides',{detail:false}));
  };
  useEffect(()=>{
    if(!pageGuides || !pageStyleRef.current || !previewRequest.current)return;
    const controller=new AbortController();
    setPdfPageBusy(true);
    setPdfPageError('');
    const timer=setTimeout(()=>{
      void previewRequest.current?.(controller.signal).then(html=>{
        if(controller.signal.aborted)return;
        if(!html || !html.includes('data-onrivi-pages='))throw new Error('PDF 페이지를 계산하지 못했습니다.');
        setPdfPageHtml(html);
      }).catch(error=>{
        if(!controller.signal.aborted)setPdfPageError(error instanceof Error?error.message:String(error));
      }).finally(()=>{if(!controller.signal.aborted)setPdfPageBusy(false);});
    },600);
    return()=>{clearTimeout(timer);controller.abort();};
  },[pageGuides,pageStyleKey,content]);
  useEffect(()=>{
    setPageGuides(pageStorage.getItem('onrivi_tabs_page_guides')==='true');
    const handleToggle = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setPageGuides(e.detail);
      } else {
        setPageGuides(v => !v);
      }
    };
    window.addEventListener('onrivi:toggle-page-guides', handleToggle);
    return () => window.removeEventListener('onrivi:toggle-page-guides', handleToggle);
  },[]);
  const button = (label: string, command: Command, removeSlash = false) => <button key={label} type="button"
    disabled={readOnly} onMouseDown={event => event.preventDefault()} onClick={() => run(command, removeSlash)}
    className="rounded px-3 py-2 text-sm hover:bg-blue-50 disabled:opacity-40">{label}</button>;
  const catalog = visualCommandCatalog(customCommands);
  const filtered = filterVisualCommands(catalog, query);
  menuItemsRef.current = filtered;
  const itemButton = (id: string, label: string, removeSlash = false) => <button key={id} type="button"
    tabIndex={0}
    aria-label={id === 'inlineCode' ? 'inlinecode' : id}
    disabled={readOnly}
    onMouseDown={event => { event.preventDefault(); executeItem(id, removeSlash); }}
    onClick={() => { executeItem(id, removeSlash); }}
    className={`rounded px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none ${activeMarks.includes(({ bold: 'strong', italic: 'em', inlineCode: 'code', link: 'link', strikethrough:'strike', underline: 'underline' } as Record<string, string>)[id]) ? 'bg-blue-100 ring-1 ring-blue-400 font-bold text-blue-700' : ''}`}
    aria-pressed={['bold', 'italic', 'inlineCode', 'link', 'strikethrough', 'underline'].includes(id) ? activeMarks.includes(({ bold: 'strong', italic: 'em', inlineCode: 'code', link: 'link', strikethrough:'strike', underline: 'underline' } as Record<string, string>)[id]) : undefined}>{label}</button>;

  return <section style={{tabSize}} className="visual-document-editor relative" aria-label="기본 직접 편집기"
    onClick={event => event.stopPropagation()}
    onDragOver={event => {
      const types = event.dataTransfer?.types;
      if (types && Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        if (viewRef.current && viewRef.current.editable) {
          updateDropRef.current(viewRef.current, event.nativeEvent);
        }
      }
    }}
    onDragEnter={event => {
      const types = event.dataTransfer?.types;
      if (types && Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
        event.preventDefault();
        event.stopPropagation();
        if (viewRef.current && viewRef.current.editable) {
          updateDropRef.current(viewRef.current, event.nativeEvent);
        }
      }
    }}
    onDrop={event => {
      event.preventDefault();
      event.stopPropagation();
      if (viewRef.current && viewRef.current.editable) {
        void executeDropRef.current(viewRef.current, event.nativeEvent);
      }
    }}>
    <VisualEditorToolbar
      itemButton={itemButton}
      button={button}
      undo={undo}
      redo={redo}
      blockCommands={blockCommands}
      run={run}
      activeMarks={activeMarks}
      tagInfo={tagInfo}
      inTable={inTable}
      pageGuides={pageGuides}
      readOnly={readOnly}
      tableToolbarDismissed={tableToolbarDismissed}
      setTableToolbarDismissed={setTableToolbarDismissed}
      tableToolPosition={tableToolPosition}
      firstBlockNeedsParagraph={firstBlockNeedsParagraph}
      viewRef={viewRef}
      codecRef={codecRef}
      insertParagraphBeforeFirstBlock={insertParagraphBeforeFirstBlock}
      setNotice={setNotice}
    />
    <TableModal nextNumber={nextReportNumber(content, '표')} isOpen={tableDialog} isDarkMode={false} onClose={()=>{setTableDialog(false);if(tableTargetRef.current)imageTargets.current.delete(tableTargetRef.current);tableTargetRef.current=null;}} onInsert={source=>{
      const view=viewRef.current,target=tableTargetRef.current;
      if(!view || !target?.valid || !view.editable || !codecRef.current){setNotice('문서나 삽입 위치가 변경되었습니다.');return;}
      const parsed=createVisualDocumentCodec(source);
      const table = Array.from({length:parsed.doc.childCount},(_,index)=>parsed.doc.child(index)).find(node=>node.type===visualSchema.nodes.table);
      if(table?.type!==visualSchema.nodes.table)return;
      codecRef.current.adopt(parsed);imageTargets.current.delete(target);
      let tr=view.state.tr.setSelection(TextSelection.between(view.state.doc.resolve(target.from),view.state.doc.resolve(target.to))).replaceSelection(new Slice(parsed.doc.content,0,0));
      let first=0,tablePos=-1;tr.doc.descendants((node,pos)=>{if(node===table){tablePos=pos;first=pos+4;return false;}return true;});
      if(tablePos>=0)tr=tr.insert(tablePos+table.nodeSize,visualSchema.nodes.paragraph.create());
      const headerTextLength=table.firstChild!.firstChild!.firstChild!.content.size;
      tr=tr.setSelection(TextSelection.create(tr.doc,first,first+headerTextLength));view.dispatch(closeHistory(tr).scrollIntoView());view.focus();
    }} />
    <LinkModal
      isOpen={linkDialog}
      onClose={() => { setLinkDialog(false); linkTargetRef.current = null; }}
      onConfirm={handleLinkConfirm}
      initialText={linkDialogData.text}
      initialHref={linkDialogData.href}
      isDarkMode={false}
    />
    <CalendarModal
      isOpen={calendarDialog}
      onClose={() => setCalendarDialog(false)}
      onInsert={(formattedDate) => {
        const view = viewRef.current;
        if (!view || !view.editable) return;
        view.dispatch(view.state.tr.insertText(formattedDate).scrollIntoView());
        view.focus();
      }}
      isDarkMode={false}
    />
    <DateTimeInsertPicker
      isOpen={datePickerOpen}
      position={datePickerPos}
      onClose={() => { setDatePickerOpen(false); dateTargetRef.current = null; }}
      onInsert={handleDateInsert}
      isDarkMode={false}
    />
    {notice && <div role="status" className="flex justify-between bg-amber-50 px-4 py-2 text-sm text-amber-900" data-editor-controls>{notice}<button type="button" onClick={() => setNotice('')}>닫기</button></div>}
    <VisualSlashMenu
      slash={slash}
      readOnly={readOnly}
      popup={popup}
      filtered={filtered}
      menuIndex={menuIndex}
      executeItem={executeItem}
      selection={selection}
      onFloatingToolbar={onFloatingToolbar}
      itemButton={itemButton}
      setSelection={setSelection}
      manualFloatingRef={manualFloatingRef}
      viewRef={viewRef}
    />
    <div className="relative">
      {!pageGuides && !readOnly && firstBlockNeedsParagraph && !(inTable && viewRef.current?.state.doc.firstChild?.type === visualSchema.nodes.table) && <button type="button" data-editor-controls
        className="ml-7 mb-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-zinc-900 dark:text-blue-300"
        onMouseDown={event=>event.preventDefault()} onClick={insertParagraphBeforeFirstBlock}
        aria-label="첫 블록 앞에 문단 추가">+ 첫 블록 앞에 문단 추가</button>}
      <div ref={host} data-onrivi-editor-host style={pageGuides ? {position:'absolute',opacity:0,pointerEvents:'none',width:'100%'} : undefined} />
      {pageGuides && <div className="onrivi-pdf-page-preview flex flex-col gap-2" data-editor-controls>
        <p className="text-xs text-slate-600 dark:text-zinc-300">PDF 출력 기준 페이지입니다. +로 출력용 페이지 나누기를 지정하고, 본문 편집은 상태 표시줄의 페이지 보기 버튼을 다시 눌러 진행하세요.</p>
        {pdfPageBusy && <p role="status" className="text-xs text-blue-600">PDF 페이지 계산 중...</p>}
        {pdfPageError && <p role="alert" className="text-xs text-red-600">PDF 페이지를 표시하지 못했습니다: {pdfPageError}</p>}
        {pdfPageHtml && !pdfPageError && <div style={{height:'min(80vh, 900px)',display:'flex'}}>
          <PrintPaginationPreview html={pdfPageHtml} editing={!readOnly} busy={pdfPageBusy} onToggle={togglePdfBreak} onEscape={closePdfPages} onTableResizeStart={closePdfPages} />
        </div>}
      </div>}
    </div>
    {showBibliography && (
      <BibliographySummary
        source={content}
        content={bibContent}
        onDeleteCitation={deleteCitationFromDoc}
        onDeleteAll={deleteAllCitationsFromDoc}
      />
    )}
    {imageMounts.map(item => createPortal(renderImage?.(item.source) || <VisualReadOnlyMarkdownBlock source={item.source} />, item.element, String(item.id)))}
    <style>{VISUAL_EDITOR_STYLES}</style>
  </section>;
}
