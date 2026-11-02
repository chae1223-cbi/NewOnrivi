// @ts-nocheck
// ====================================================================
// 📊 [OMD-CORE-useMonacoSetup-0001] useMonacoSetup ➔ List Tab Behavior Patch
// 🚨 @PATCH : **2026-10-31** — [플로팅 서식 툴바 유지 보장 및 커서 이동 시 자동 닫힘 방어]:
//             1) onDidChangeCursorSelection에서 e.selection.isEmpty() 시 플로팅 툴바를 자동 닫던 로직을 제거하여 마우스 클릭 또는 엔터로 서식 적용 시에도 툴바가 유지되도록 개선
//             2) editor.onMouseDown(에디터 클릭) 및 ESC 단축키 입력 시에만 플로팅 툴바가 닫히도록 사용자 명세 완벽 준수
// 🚨 @PATCH : **2026-10-28** — [번호 리스트 자동 생성 행에서 하위 레벨 글머리 기호(-, *, +) 즉시 전환 지원]:
//             1) 번호 리스트 엔터 개행 시 자동 생성된 '3. ' 또는 Tab 들여쓰기된 '    1. ' 상태에서 '-', '*', '+' 입력 후 Space를 누르면 상위 번호 항목의 하위 레벨 글머리 기호 리스트('    - ')로 즉시 자동 치환
// 🚨 @PATCH : **2026-10-24** — [인용문(>) 탭(Tab) 들여쓰기 및 Shift+Tab 내어쓰기 완전 지원]:
//             1) 인용구(>) 줄에서 커서 위치(접두사/본문/줄 끝)와 무관하게 Tab 입력 시 항상 행 시작에 2칸 들여쓰기 공백을 삽입하여 목록 하위 인용구 및 중첩 인용문 구성 보장
//             2) 인용구(>) 줄에서 Shift+Tab 입력 시 앞쪽 들여쓰기 공백(최대 2칸) 또는 중첩 기호(>>)를 자연스럽게 소거하여 내어쓰기 지원
// 🚨 @PATCH : **2026-10-22** — [구분선(HR) 줄에서 Enter 시 새 문단 생성]:
//             1) 리스트 자동완성 Enter 액션에 구분선(---, ***, ___) 판별 가드를 리스트 판단보다 먼저 배치하여 구분선 줄에서 Enter 시 아래 빈 줄로 커서 이동(빈 줄 없으면 삽입)
// 🚨 @PATCH : **2026-10-22** — [제목 태그(#) + 스페이스 자동 번호 삽입]:
//             1) 에디터에서 '## ' 형태 입력 후 스페이스를 치면 활성 CSS 프로필의 headingNumbering 설정에 따라
//                제목 번호(예: 1., I., 가., 1.1)를 자동으로 삽입하는 custom-space-heading-number addAction 추가
//             2) countHeadingsUpTo로 현재 줄 이전까지 제목 누적 횟수를 계산하여 정확한 번호 산출
//             3) 자동완성/찾기 위젯/읽기전용/한글 IME 조합 중에는 일반 스페이스로 폴백하여 안전성 완벽 보장
// 🚨 @PATCH : **2026-10-20** — [모나코 에디터 커서 컬럼(Col) 동기화 누락 및 전역 이벤트(onrivi:cursor-position) 연동 보강]:
//             1) onDidChangeCursorPosition 및 onMouseDown에서 setCursorColumn(currentCol) 호출 누락을 복구하여 열 번호 실시간 추종 완결
//             2) 커서 이동 시 onrivi:cursor-position 이벤트를 디스패치하여 상태바와 즉각 무부하 실시간 동기화
// 🚨 @PATCH : **2026-10-19** — [Visual Editor 모델 동기화 역류(Echo) 방어 가드 탑재]:
//             1) __isSyncingVisualModel 플래그 활성화 시 model.onDidChangeContent에서 setContent/setTabs를 건너뛰어 역류 루프 완전 차단
// 🚨 @PATCH : **2026-10-17** — [코드블록 언어 미지정/한글·임의 언어명 입력 시 코드블록 이하 일반 텍스트 색상 오염(보라색 변색) 결함 해결]: handleMount에서 applySafeMarkdownMonarchTokenizer(monaco)를 최우선 적용하여 한글·유니코드·특수기호 언어명(예: ```아자아자) 및 무명 코드블록(```)의 여는/닫는 펜스를 정확히 매칭하고 코드블록 이하 본문으로 @codeblock 상태가 유출되는 현상 원천 차단
// 🚨 @PATCH : **2026-10-15** — [슬래시 자동완성(Suggest Widget) 서식 설명 열 왼쪽 정렬 스타일 동적 주입]: Monaco의 Suggest Widget 상세 열(.details-label / .right)이 우측 정렬되어 서식명 대괄호([)가 울퉁불퉁해지던 레이아웃을 flex-start 및 고정 열 너비(220px) 기반의 단정한 왼쪽 정렬로 보장하는 전용 스타일 시트 주입
// 🚨 @PATCH : **2026-10-14** — [마우스 단일 클릭 시 드래그 앵커 보정 간섭 차단]: onDidChangeCursorSelection에서 드래그 선택 영역이 존재할 때(!e.selection.isEmpty())에만 고속 드래그 앵커 보정이 동작하도록 가드를 보강하여 단일 클릭 시 커서 위치 왜곡 방지
// 🚨 @PATCH : **2026-10-13** — [나란히 보기 마크다운 영역 읽기 전용 잠금·라인번호 숨김 및 배경색 시각적 경계 분리]: 나란히 보기(previewMode === 'both')에서 마크다운 영역 직접 입력/붙여넣기/드롭/커서 노출을 차단하고, 라인번호(lineNumbers: 'off')를 숨기며, 모달·문서 편집기 위임 프로그래밍 방식 편집(executeEdits)만 안전하게 통과하도록 처리하고 슬레이트 배경색(#eef2f6) 적용
// 🚨 @PATCH : **2026-10-02** — [이미지 드래그 앤 드롭 실시간 위치 가이드라인 및 드롭 타겟 라인/커서 인디케이터 탑재]: 이미지 드래그 중 마우스 아래 삽입 위치(행 전체 하이라이트 및 실시간 커서 바/위치 뱃지)를 드롭 전에 즉시 시각적으로 확인 가능하도록 완벽 구현
// 🚨 @PATCH : **2026-10-02** — [붙여넣기 다중 리스너 단일 인스턴스 보장]: 동일 ClipboardEvent에 대해 handledPasteEvents WeakSet 가드를 추가하여 window/container/editorDom 다중 등록으로 인한 중복 실행 원천 차단
// 🚨 @PATCH : **2026-10-02** — [드래그 앤 드롭 이미지 설명(Alt) 널(빈값) 적용]: 에디터 드래그 드롭 이미지 삽입 시 ![](${url}) 빈 설명으로 통일
// 🚨 @PATCH : **2026-10-02** — [붙여넣기 리스너 4중 바인딩 및 textarea/전역 전파 보장]: container, editorDom, textarea(inputarea), window 4중 계층에 paste 리스너를 등록하고 depsRef 연동으로 포커스 위치 무관 클립보드 붙여넣기 100% 감지 보장
// 🚨 @PATCH : **2026-10-02** — [에디터 이미지 드래그 앤 드롭 및 웹/로컬 복사·붙여넣기 전면 강화]: dragover/dragenter 리스너 등록으로 마우스 커서 복사 모양 및 드롭존 즉각 활성화, 로컬 다중 이미지 일괄 드롭, 웹 이미지(URL/img 태그/Base64) 드래그 드롭 마크다운 자동 변환, 코발트 블루 점선 드롭 가이드 링 추가
// 🚨 @PATCH : **2026-10-02** — [소프트 줄바꿈(Word wrap) 경계면 방향키 2단계 연속 이동 보정]: 문장 끝(윗줄 끝 "단|")에서 오른쪽 키 입력 시 다음 줄 첫 글자 뒤("일|")로 점프하지 않고 아랫줄 시작("|일")에 멈춘 뒤 재입력 시 전진하도록 보정, 아랫줄 시작에서 왼쪽 키 입력 시 윗줄 끝으로 대칭 복귀 지원
// 🚨 @PATCH : **2026-10-02** — [고대비 에디터 커서 두께 4px 확대 및 시인성 최적화]: persistentCaret 너비(4px, 라운드 2px) 및 Monaco 옵션 cursorWidth(4px) 2배 두께 확대, 테마별 커서 고대비 색상(라이트: 코발트 블루 #1d4ed8 / 다크: 스카이블루 #38bdf8) 동기화로 커서 위치 한눈 식별 완벽 보장
// 🚨 @PATCH : **2026-09-30** — [[[ 위키링크 자동완성 마크다운 문서 전용 원복]: [[ 입력 시 폴더 노드를 배제하고 마크다운 문서(.md)만 추천하여 [문서명](<./경로.md>) 표준 마크다운 링크 자동 완성
// 🚨 @PATCH : **2026-09-26** — [에디터 수직 스크롤바 너비 슬림화(32px -> 16px)]: 과도하게 두꺼워진 모나코 에디터 verticalScrollbarSize를 기존 32px에서 절반인 16px로 축소하여 슬림하고 미려한 에디터 디자인 복원
// 🚨 @PATCH : **2026-09-25** — [에디터 Pretendard 폰트 전면 적용 및 줄바꿈 단어 잘림 방지 32px 안전 여백 확보]: 에디터 글꼴을 가독성·원문자 1위인 Pretendard Variable로 변경하고, verticalScrollbarSize를 32px로 확장하여 가변폭/볼드 환경에서도 줄 끝 단어가 스크롤바에 가려지거나 잘리지 않도록 안전 여백 완벽 보장
// 🚨 @PATCH : **2026-09-25** — [스크롤바 슬라이더 겹침 방지 verticalScrollbarSize 24px 확대]: 모나코 줄바꿈 contentWidth 계산 시 스크롤바 여백을 10px->24px로 확대하여 줄 끝 글자(r, ;, l, y)가 스크롤바에 닿거나 가려지는 현상 완전 해결
// 🚨 @PATCH : **2026-09-25** — [에디터 고정폭(D2Coding) 전면 복원 및 강조태그 긴문장 우측 글자 잘림·누락 완전 해결]: 에디터에 가변폭 세리프(Times New Roman) 적용 시 볼드(**) 토큰에서 글자 폭이 30% 급증하여 모나코 줄바꿈 계산을 초과해 우측 글자가 잘려 숨겨지던 결함을 에디터 fontFamily를 고정폭 D2Coding(D2CodingLigature, D2Coding, Consolas)으로 100% 복원하여 글자 폭 일치 및 무결점 줄바꿈 실현
// 🚨 @PATCH : **2026-09-25** — [영문 마크다운 태그 단어 쪼개짐 방지 및 우측 패딩 48px 확대]: 볼드(**) 태그 등 굵은 글꼴 적용 시 우측 스크롤바와 겹쳐 글씨가 잘리는 현상을 방지하기 위해 우측 패딩을 48px로 확대하고 영문 단어 단위 자연스러운 줄바꿈 보장
// 🚨 @PATCH : **2026-09-25** — [한글 폰트 원상 복원(D2Coding) 및 영문 세리프 유지, 기본 16px lineHeight(28) 최적화]: 한글을 원래의 D2Coding으로 100% 복원하고 영문은 Times New Roman/Georgia를 적용, 16px 기준 lineHeight 28로 쾌적한 줄간격 확보
// 🚨 @PATCH : **2026-09-25** — [에디터 및 서식 영문 세리프 폰트(Times New Roman/Georgia) 적용 및 영문 단어 쪼개짐 방지]: 에디터 폰트에 'Times New Roman', 'Georgia' 우선 탑재로 출판형 영문 세리프 구현 및 wordWrapBreakAfterCharacters에서 영문 알파벳/숫자 강제 분절을 제거하여 단어 단위의 자연스러운 줄바꿈 보장
// 🚨 @PATCH : **2026-09-25** — [에디터 글꼴 굵기 SemiBold(600) 연동]: deps.editorFontWeight 'semibold' 분기 추가(600)로 모나코 에디터 마운트 시 600 웨이트 반영
// 🚨 @PATCH : **2026-09-23** — [숫자 리스트 시작 번호 보존 및 연속 번호 자동 완성] autoRenumberList에서 숫자 리스트 블록의 첫 번째 시작 번호(예: 7. 등)를 initialCount로 보존하여, 엔터 입력 시 사용자가 의도한 시작 번호(7, 8, 9 -> 10)가 1, 2, 3으로 초기화되는 결함 원천 해결 및 <br> 경계 태그 탐색 가드 추가
// 🚨 @PATCH : **2026-09-23** — [리스트(숫자/글머리/체크박스) 빈 행·구분선 분리 및 번호 재시작] autoRenumberList에서 수평선(---) 리스트 오탐 방지, 빈 행(trim()==='')이나 구분선/헤딩 조우 시 즉시 블록 탐색 중단(break), 연속 번호 강제 병합 차단 및 새 블록 1번 시작 보장
// 🚨 @PATCH : **2026-09-23** — [에디터 글꼴 굵기(Font Weight) 연동] useMonacoSetup 마운트 시점에 deps.editorFontWeight(400/500/700) 옵션 반영
// 🚨 @PATCH : **2026-09-23** — [긴 영문 단어 줄바꿈 개선] editor.updateOptions에 wordWrapBreakAfterCharacters(영문/숫자/기호 확장) 및 wordWrapBreakBeforeCharacters 지정하여 긴 영문 문장도 한글처럼 줄 끝에서 글자 단위(break-all)로 자연스럽게 분절되도록 개선
// 🚨 @PATCH : **2026-09-23** — [긴 문구 줄바꿈 시 글자 잘림 및 중간 건너뛰기 버그 완전 해결] border-right: 120px CSS 강제 주입 제거 및 Monaco 공식 padding.right(32px) 적용으로 줄 끝 텍스트 누락 원천 방어
// 🚨 @PATCH : **2026-09-23** — [좌측 에디터 D2Coding 스타일 명세 반영] D2CodingLigature 폰트, 15px, lineHeight 1.75(26px), 리가처 활성화, 스카이블루(#38bdf8) 커서, 다크 테마(#0f172a/#e2e8f0), 마크다운 기호(#60a5fa) 등 통합 반영
// 🚨 @PATCH : **2026-09-23** — [플로팅 툴바 위치 계산 가드 개선] 툴바 너비 하드코딩(880px) 클램핑 제거하고 실제 커서 x좌표를 전달하여 MainEditorApp 뷰포트 클램퍼에서 화면 우측 잘림 방지 처리되도록 정규화
//             2026-09-11 - [코드블록 슬래시 커맨드/단축키 언어 자동 선택 연동] trigger-custom-action 비동기 타이밍 보정(10ms)으로 슬래시 커맨드(/code) 입력 후 코드블록 삽입 시 언어명(javascript) 자동 선택 정상 발화 보장
//             2026-09-11 - [찾기/바꾸기(Ctrl+F, Ctrl+H) 활성 시 ESC 클릭으로 위젯 닫기 및 포커스 복원] findInput/replaceInput 및 에디터 키바인딩에서 ESC 입력 시 찾기/바꾸기 위젯을 즉시 닫고 에디터로 포커스 복귀 연동
//             2026-09-11 - [찾기/바꾸기(Ctrl+F, Ctrl+H) 실행 시 즉시 위젯 입력창 포커스 및 엔터 다음 찾기 보장] custom-enter-list-auto precondition 격리 및 openAndFocusFindWidget 연동으로 검색어 입력 후 Enter 입력 시 즉시 '다음 찾기' 작동
//             2026-09-11 - [리스트(숫자/글머리/체크/인용) 본문 중간 Tab/Shift+Tab 커서 위치 분기 정밀 보정] 리스트 항목 본문 텍스트 중간에서 Tab 입력 시 해당 행 전체가 들여쓰기되던 버그를 해결하여, 커서가 리스트 마커 접두사(prefix) 구간 내에 있을 때만 행 전체 들여쓰기/내어쓰기가 동작하고 본문 텍스트 중간에서는 들여쓰기가 아닌 일반 탭 공백(tabSize 스페이스)이 커서 위치에 자연스럽게 삽입되도록 개편
//             2026-09-06 - [에디터-미리보기 하이라이트 동기화 완결] onMouseDown 시 클릭된 행 번호로 즉시 setActiveLine/setCursorLine을 동기화하고, onDidChangeCursorPosition에서 hasLineChanged 가드로 인해 RAF 이벤트 병합 시 activeLine 갱신이 누락되던 버그를 제거하여 마우스 클릭/방향키/타이핑 시 에디터와 미리보기 하이라이트 위치가 항상 100% 동일하게 일치하도록 보장
//             2026-09-05 - [커서 이동 시 Race Condition 완전 차단] cursorSyncLock(150ms) 도입: syncPreviewFromCursor 실행 직후 Monaco 자동 스크롤로 발화되는 onDidScrollChange → syncPreviewFromEditorScroll이 syncPreviewToTargetLine 결과를 덮어쓰던 Race Condition을 이벤트 핸들러 레벨에서 원천 봉쇄; onDidChangeCursorPosition에서 isNearEnd(마지막 줄 부근) 감지 시 항상 syncPreviewFromCursor 강제 실행
//             2026-09-05 - [마지막 행 및 긴 문단 가로 줄바꿈 타이핑 시 실시간 상향 추종] onDidChangeModelContent에서 타이머 캔슬링으로 인한 타이핑 중 스크롤 멈춤 결함을 단일 RAF 스케줄링 및 컬럼 파라미터 전달로 전면 개선; 동일 행 내 장문 문단 타이핑(hasWrappedRowChanged, 컬럼 이동) 시에도 syncPreviewFromCursor가 가로 줄바꿈을 감지하여 엔터 2회 없이 즉각 미리보기 하단이 밀려 올라가도록 완전 해결
//             2026-09-05 - [타이핑 시 미리보기 흔들림 및 덜컹거림 원천 차단] 타이핑 중 onDidScrollChange의 syncPreviewFromEditor 바닥 밀착 간섭을 완전 차단하여 syncPreviewToTargetLine과의 충돌 진동 제거; 동일 행 타이핑(e.reason 0/1) 시 커서 변경 이벤트의 불필요한 중복 동기화 차단; onDidChangeModelContent 타이머를 단일 RAF 및 100ms 디바운스로 통폐합하여 무진동 안정적 타이핑 보장
//             2026-09-05 - [마지막 줄 입력 및 최하단 스크롤 추종 강화] 타이핑 중(isTyping 락)이라도 에디터 스크롤이 최하단(바닥)에 도달했을 경우 syncPreviewFromEditor 바닥 밀착을 허용하여 에디터 자동 스크롤 시 미리보기가 멈추는 결함 방어
//             2026-09-05 - [표 내부 타이핑 싱크 및 커서 Safe Zone 추종 강화] 타이핑 중단 감지 타이머(300ms) 및 4단계 렌더링 추종 보강, 커서 이동 시 실시간 Safe Zone 추종 연동으로 표 하단 행 타이핑 시 미리보기 하단 가려짐 원천 방어
//             2026-09-05 - [타이핑 시 미리보기 하단 가려짐 방어] 한글 IME 조합 완료 및 React 마크다운 DOM 리플로우 완료 시점(160ms)에 맞춘 3단계 후속 위치 추종 타이머 보강
//             2026-09-04 - 에디터 마운트 시 폐기된 모나코 모델(Model is disposed!) 접근 방어 및 isDisposed() 검증 후 모델 안전 재생성 가드 적용
//             2026-09-03 - 마지막 행 또는 일반 문장에서 엔터 시 반응 지연(새 행 생성 늦음) 현상을 해결하기 위해 custom-enter-list-auto 일반 개행 분기에 editor.setPosition 즉시 이동을 부여하고, onKeyDown 엔터 시 불필요하게 파일 I/O 및 React 렌더링을 유발하던 동기 saveFile을 제거하여 0초 즉각 개행 보장
//             2026-09-03 - 타이핑 시 React 렌더링 지연(useDeferredValue)으로 인해 마지막 행 또는 문서 하단 입력 시 미리보기가 가려지던 결함을 해결하기 위해 onDidChangeModelContent에 70ms 후속 스크롤 추종 타이머 보강
//             2026-09-03 - [[ 자동완성 선택 시 일반 링크와 동일한 [개요명/문서명](<상대경로>) 표준 마크다운 상대경로로 자동 삽입되도록 개편
//             2026-09-03 - 슬래시(/) 명령어 추천 리스트 출력 중 ESC 키 입력 시 팝업 즉시 강제 종료(closeSuggestWidget) 및 onKeyUp 재오픈 방지(isSuggestSuppressed) 가드 적용
//             2026-09-02 - 에디터 왼쪽 줄번호/여백(Gutter) 영역에 차별화된 배경색(editorGutter.background) 및 선명한 줄번호 색상 적용
//             2026-09-02 - 표(Table) 현재 열(Column) 정렬 퀵 변환 엔진(setTableColumnAlign) 및 단축키(Alt+Shift+L/C/R) 연동
//             2026-09-02 - 한글 IME 슬래시 타이핑 시 onKeyUp 실시간 triggerSuggest 연동 및 sortText 최우선 1순위 자동 포커스 적용
//             2026-09-02 - 한글 슬래시 명령어(/한글명령어: /표, /제목, /인용구 등) 입력 시 해당 명령어로 자동 포커스 및 이동 지원
//             2026-09-02 - verticalScrollToElement 미정의 ReferenceError 결함을 표준 targetElement.scrollIntoView로 안전하게 교체
//             2026-09-02 - 탭 전환 직후 마우스 클릭(e.reason===3) 및 커서 이동 시 Safe Zone 위치 즉시 추종 보장
//             2026-09-02 - 에디터 마지막 행에서 입력 시 미리보기 즉시 바닥(최하단) 추종 동기화 반영 및 useDeferredValue 기반 무깜빡임 실시간 렌더링 연동
//             2026-09-02 - 방향키(↑, ↓) 위아래 줄 이동 시 미리보기 Safe Zone 추종 연동(isTyping 가드로 타이핑/백스페이스 중 스크롤 0% 고정 유지), 에디터 스크롤 1:1 완벽 밀착
//             2026-08-31 - 4대 요건(실시간 싱크 일치, 타이핑/엔터 안정성, 휠/방향키 1:1 연동, 대형 미디어 높이 보정) 전면 개편
// 🔗 @CALLS : model.getLineContent, editor.executeEdits, syncPreviewFromEditorScroll, syncPreviewToTargetLine
// ====================================================================
import { registerSignatureCleanup } from '@/lib/signatureCleanup';
import { useRef } from 'react';
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from '@/lib/syncEngine';
import { desktopClipboardImage } from '@/lib/desktopClipboard';
import { openAndFocusFindWidget } from '@/utils/findWidgetHelper';
import { applySafeMarkdownMonarchTokenizer } from '@/lib/editorThemes';
import {
  headingFormat,
  headingSetting,
  headingMarker,
  outlineMarker,
  hasHeadingNumber,
  countHeadingsUpTo,
} from '@/lib/headingNumbering';

export function useMonacoSetup(deps: any) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const handleMount = (editor: any, monaco: any) => {
    // 의존성 풀기 (MainEditorApp에서 넘겨받은 변수들을 지역 변수로 할당)
    const {
      editorRef, tabsRef, activeTabIdRef, contentRef, isComposingRef, previewDebounceRef,
      setContent, setTabs, activeTabId, setSaveStatus, currentFileNodeRef, lastSavedContentRef,
      saveFile, autoSaveRef, previewModeRef, previewRef, isScrollingRef, scrollTimeoutRef,
      isEditorReady, setIsEditorReady, themePalette, EDITOR_THEMES, updateDecorations,
      decorationsCollectionRef, isEditorHovered, prevCursorLineRef, frontmatterLinesRef,
      setActiveLine, setCursorLine, setCursorColumn, tabSizeRef, setFloatingToolbar, lastSelectionRef,
      completionProviderRef, getSlashCommands, customSlashCommandsRef,
      handleEditorPaste, handlePasteImageFile,
      wikilinkProviderRef, docLinkFilesRef, readFileTextRef, extractHeadings, getRelativePath,
      isEditorMountedRef, updateContent
    } = deps;

                  editorRef.current = editor;
                  registerSignatureCleanup(editor, monaco);
                  if (typeof window !== 'undefined') {
                    (window as any).monaco = monaco;
                  }
                  applySafeMarkdownMonarchTokenizer(monaco);

                  // 💡 [슬래시 자동완성 서식설명 열 왼쪽 정렬 동적 주입] Monaco Suggest Widget의 오른쪽 열이 왼쪽 정렬되도록 보장
                  if (typeof document !== 'undefined' && !document.getElementById('onrivi-monaco-suggest-styles')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'onrivi-monaco-suggest-styles';
                    styleEl.textContent = `
                      .suggest-widget,
                      .monaco-editor .suggest-widget {
                        min-width: 520px !important;
                        z-index: 9999 !important;
                        pointer-events: auto !important;
                      }
                      .suggest-widget *,
                      .monaco-editor .suggest-widget * {
                        pointer-events: auto !important;
                      }
                      .suggest-widget .monaco-list-row .contents .main,
                      .suggest-widget .monaco-list .monaco-list-row > .contents > .main,
                      .monaco-editor .suggest-widget .monaco-list-row .contents .main,
                      .monaco-editor .suggest-widget .monaco-list .monaco-list-row > .contents > .main {
                        display: flex !important;
                        justify-content: flex-start !important;
                        align-items: center !important;
                        gap: 0 !important;
                        width: 100% !important;
                      }
                      .suggest-widget .monaco-list-row .contents .main .left,
                      .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .left,
                      .monaco-editor .suggest-widget .monaco-list-row .contents .main .left,
                      .monaco-editor .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .left {
                        flex: 0 0 220px !important;
                        width: 220px !important;
                        min-width: 220px !important;
                        max-width: 220px !important;
                        display: flex !important;
                        align-items: center !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                      }
                      .suggest-widget .monaco-list-row .contents .main .right,
                      .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .right,
                      .monaco-editor .suggest-widget .monaco-list-row .contents .main .right,
                      .monaco-editor .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .right {
                        flex: 1 1 auto !important;
                        width: auto !important;
                        display: flex !important;
                        justify-content: flex-start !important;
                        align-items: center !important;
                        text-align: left !important;
                        margin-left: 14px !important;
                        max-width: none !important;
                        overflow: hidden !important;
                      }
                      .suggest-widget .monaco-list-row .contents .main .right .details-label,
                      .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .right > .details-label,
                      .monaco-editor .suggest-widget .monaco-list-row .contents .main .right .details-label,
                      .monaco-editor .suggest-widget .monaco-list .monaco-list-row > .contents > .main > .right > .details-label {
                        text-align: left !important;
                        margin-left: 0 !important;
                        width: 100% !important;
                        display: inline-block !important;
                        opacity: 0.7 !important;
                        white-space: nowrap !important;
                        text-overflow: ellipsis !important;
                      }
                      .suggest-widget .monaco-list-row .contents .main .right .details-label .monaco-tokenized-source,
                      .monaco-editor .suggest-widget .monaco-list-row .contents .main .right .details-label .monaco-tokenized-source {
                        text-align: left !important;
                        display: inline-block !important;
                      }
                    `;
                    document.head.appendChild(styleEl);
                  }

                  // 🔒 나란히 보기(previewMode === 'both')에서 마크다운 영역은 사용자 직접 편집이 금지(readOnly: true)되지만,
                  // 문서 직접 편집기(VisualDocumentEditor)나 모달(수식, 표, 유튜브, 지도, 이미지, AI 등)에서
                  // 호출하는 프로그래밍 방식의 editor.executeEdits / pushUndoStop은 정상 반영되도록 래핑합니다.
                  const rawExecuteEdits = editor.executeEdits.bind(editor);
                  const rawPushUndoStop = editor.pushUndoStop.bind(editor);
                  const rawUpdateOptions = editor.updateOptions.bind(editor);
                  const shouldKeepReadOnly = () =>
                    Boolean(depsRef.current?.isRestrictedUser) ||
                    (depsRef.current?.tabsRef?.current?.length ?? 0) === 0 ||
                    depsRef.current?.previewModeRef?.current === 'both';

                  editor.pushUndoStop = () => {
                    if (depsRef.current?.isRestrictedUser || (depsRef.current?.tabsRef?.current?.length ?? 0) === 0) {
                      return false;
                    }
                    const lockAfter = shouldKeepReadOnly();
                    if (lockAfter) rawUpdateOptions({ readOnly: false, domReadOnly: false });
                    try {
                      return rawPushUndoStop();
                    } finally {
                      if (lockAfter) rawUpdateOptions({ readOnly: true, domReadOnly: true });
                    }
                  };

                  editor.executeEdits = (source: any, edits: any, endCursorState?: any) => {
                    if (depsRef.current?.isRestrictedUser || (depsRef.current?.tabsRef?.current?.length ?? 0) === 0) {
                      return false;
                    }
                    const lockAfter = shouldKeepReadOnly();
                    if (lockAfter) rawUpdateOptions({ readOnly: false, domReadOnly: false });
                    try {
                      return rawExecuteEdits(source, edits, endCursorState);
                    } finally {
                      if (lockAfter) rawUpdateOptions({ readOnly: true, domReadOnly: true });
                    }
                  };

                  // Monaco의 기본 커서 DOM은 IME 조합·장식 재렌더링 과정에서 일시적으로
                  // 숨겨질 수 있습니다. 실제 Monaco 좌표를 따라가는 별도 표시기를 두어
                  // 사용자가 언제나 현재 입력 위치를 찾을 수 있게 합니다.
                  const editorDomNode = editor.getDomNode();
                  const persistentCaret = document.createElement('div');
                  persistentCaret.setAttribute('aria-hidden', 'true');
                  persistentCaret.style.cssText = [
                    'position:absolute',
                    'z-index:1000',
                    'width:5px',
                    'min-width:5px',
                    'background:#2563eb',
                    'pointer-events:none',
                    'display:none',
                    'border-radius:2px',
                    'box-shadow:0 0 3px rgba(37,99,235,.8)',
                    'will-change:transform,height'
                  ].join(';');
                  editorDomNode?.appendChild(persistentCaret);

                  const updatePersistentCaret = () => {
                    if (previewModeRef.current === 'both' || !editorDomNode?.isConnected || !editor.hasTextFocus?.()) {
                      persistentCaret.style.display = 'none';
                      return;
                    }
                    const position = editor.getPosition();
                    const visiblePosition = position && editor.getScrolledVisiblePosition(position);
                    if (!visiblePosition) {
                      persistentCaret.style.display = 'none';
                      return;
                    }
                    persistentCaret.style.display = 'block';
                    persistentCaret.style.height = `${Math.max(16, visiblePosition.height)}px`;
                    persistentCaret.style.transform = `translate(${Math.round(visiblePosition.left)}px, ${Math.round(visiblePosition.top)}px)`;
                  };

                  editor.onDidFocusEditorText(() => requestAnimationFrame(updatePersistentCaret));
                  editor.onDidBlurEditorText(() => { persistentCaret.style.display = 'none'; });
                  editor.onDidLayoutChange(() => requestAnimationFrame(updatePersistentCaret));

                  const updatedTabs = tabsRef.current.map((tab: any) => {
                    const isDisposed = tab.model && typeof tab.model.isDisposed === 'function' && tab.model.isDisposed();
                    if (!tab.model || isDisposed) {
                      const model = monaco.editor.createModel(tab.content, 'markdown');
                      model.onDidChangeContent((e) => {
                        if ((model as any).__isSyncingVisualModel) return;
                        if (e && e.changes && e.changes.some(c => c.text === '1. ' || c.text === '1.')) {
                          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 100);
                        }
                        const val = model.getValue();
                        setContent(val);
                        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, content: val, isModified: val !== t.content } : t));
                      });
                      return { ...tab, model };
                    }
                    return tab;
                  });
                  setTabs(updatedTabs);

                  const activeTab = updatedTabs.find(t => t.id === activeTabIdRef.current);
                  if (activeTab && activeTab.model && !(typeof activeTab.model.isDisposed === 'function' && activeTab.model.isDisposed())) {
                    try {
                      editor.setModel(activeTab.model);
                    } catch (err) {
                      console.warn('[useMonacoSetup] setModel failed, fallback to setValue:', err);
                      editor.setValue(contentRef.current);
                    }
                  } else {
                    editor.setValue(contentRef.current);
                  }

                  // 💡 [IME 조합 감지 락]
                  setTimeout(() => {
                    const textarea = editor.getDomNode()?.querySelector('textarea');
                    if (textarea) {
                      textarea.addEventListener('compositionstart', () => {
                        isComposingRef.current = true;
                      });
                      textarea.addEventListener('compositionend', () => {
                        isComposingRef.current = false;
                        // 조합이 종료된 뒤에만 장식 갱신을 수행합니다. 조합 중 DOM을
                        // 다시 그리거나 포커스를 강제하면 Windows 한글 IME의 커서가
                        // 사라지거나 조합 위치가 끊길 수 있습니다.
                        requestAnimationFrame(() => {
                          if (editorRef.current === editor) {
                            updateDecorations(editor);
                            setContent(editor.getValue());
                            // 조합 완료 뒤에는 Monaco 자체 커서 레이어가 다시 활성화됩니다.
                            // 이 시점에만 포커스를 복구해 커서가 사라진 상태로 남지 않게 합니다.
                            editor.focus();
                            updatePersistentCaret();
                          }
                        });
                      });
                    }
                  }, 100);

                  // 🔒 [Tab 키 공식 editor.onKeyDown 안전 가드]
                  editor.addCommand(monaco.KeyCode.Tab, () => {
                      {
                      try {
                        const contextKeyService = (editor as any)._contextKeyService;
                        const isSuggestVisible = contextKeyService?.getContextKeyValue('suggestWidgetVisible') === true;
                        const isSnippetMode = contextKeyService?.getContextKeyValue('inSnippetMode') === true;
                        if (isSuggestVisible) { editor.trigger('keyboard', 'acceptSelectedSuggestion', null); return; }
                          if (isSnippetMode) { editor.trigger('keyboard', 'jumpToNextSnippetPlaceholder', null); return; }
                      } catch (_) {}

                      const selection = editor.getSelection();
                      const model = editor.getModel();
                      if (!model || !selection) return;

                      // ① 마크다운 표 영역인지 검사 및 표 내비게이션 / 행 추가 처리
                      const position = editor.getPosition();
                      let isTable = false;
                      if (position) {
                        let lineContent = model.getLineContent(position.lineNumber);
                        if (isTableLine(lineContent) && !isTableDividerLine(lineContent)) {
                          isTable = true;
                          // 
                          // 
                          

                          // 사용자가 표를 작성 중인데 줄 끝에 | 를 안 닫고 Tab을 누른 경우 자동 보정
                          if (!lineContent.trimEnd().endsWith('|')) {
                            editor.pushUndoStop();
                            editor.executeEdits("appendPipe", [{
                              range: new monaco.Range(position.lineNumber, lineContent.length + 1, position.lineNumber, lineContent.length + 1),
                              text: " |",
                              forceMoveMarkers: true
                            }]);
                            editor.pushUndoStop();
                            lineContent = model.getLineContent(position.lineNumber);
                          }

                          const { ranges, pipeIndices } = getCellRanges(lineContent, position.lineNumber);
                          if (ranges.length > 0) {
                            let currentCellIdx = -1;
                            for (let i = 0; i < pipeIndices.length - 1; i++) {
                              const leftCol = pipeIndices[i] + 1;
                              const rightCol = pipeIndices[i + 1] + 2;
                              if (position.column >= leftCol && position.column <= rightCol) {
                                currentCellIdx = i;
                                break;
                              }
                            }

                            if (currentCellIdx !== -1) {
                              if (currentCellIdx < ranges.length - 1) {
                                // 다음 셀로 이동
                                const nextCell = ranges[currentCellIdx + 1];
                                editor.setSelection(new monaco.Selection(
                                  nextCell.lineNumber, nextCell.startColumn,
                                  nextCell.lineNumber, nextCell.endColumn
                                ));
                                return;
                              } else {
                                // 현재 행이 마지막 셀인 경우 -> 다음 행으로 이동 또는 신규 행 삽입
                                let targetLine = position.lineNumber + 1;
                                const lineCount = model.getLineCount();
                                if (targetLine <= lineCount) {
                                  let nextLineContent = model.getLineContent(targetLine);
                                  if (isTableLine(nextLineContent) && isTableDividerLine(nextLineContent)) {
                                    targetLine++;
                                    if (targetLine <= lineCount) {
                                      nextLineContent = model.getLineContent(targetLine);
                                    } else {
                                      nextLineContent = "";
                                    }
                                  }

                                  if (isTableLine(nextLineContent)) {
                                    const nextLineRanges = getCellRanges(nextLineContent, targetLine).ranges;
                                    if (nextLineRanges.length > 0) {
                                      const firstCell = nextLineRanges[0];
                                      editor.setSelection(new monaco.Selection(
                                        firstCell.lineNumber, firstCell.startColumn,
                                        firstCell.lineNumber, firstCell.endColumn
                                      ));

                                      return;
                                    }
                                  }
                                }

                                // 다음 행이 없거나 표 행이 아니라면 -> 신규 행 자동 추가
                                const cellCount = ranges.length;
                                const newRowText = "\n|" + "  |".repeat(cellCount);
                                const lastLineMaxCol = model.getLineMaxColumn(position.lineNumber);
                                editor.pushUndoStop();
                                editor.executeEdits("insertTableRow", [{
                                  range: new monaco.Range(position.lineNumber, lastLineMaxCol, position.lineNumber, lastLineMaxCol),
                                  text: newRowText,
                                  forceMoveMarkers: true
                                }]);
                                editor.pushUndoStop();

                                const newRowNumber = position.lineNumber + 1;
                                const newRowContent = model.getLineContent(newRowNumber);
                                const newRowRanges = getCellRanges(newRowContent, newRowNumber).ranges;
                                if (newRowRanges.length > 0) {
                                  const firstCell = newRowRanges[0];
                                  editor.setSelection(new monaco.Selection(
                                    firstCell.lineNumber, firstCell.startColumn,
                                    firstCell.lineNumber, firstCell.endColumn
                                  ));
                                }

                                // 💡 행 추가 후 스크롤 튀는 현상 방지 락 및 강제 동기화
                                isScrollingRef.current = 'editor';
                                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 300);
                                setTimeout(() => {
                                  if (previewRef.current) {
                                    const targetElement = previewRef.current.querySelector(`[data-line="${newRowNumber}"]`) as HTMLElement;
                                    if (targetElement) {
                                      targetElement.scrollIntoView({ block: 'center', behavior: 'auto' });
                                    }
                                  }
                                }, 80);
                                return;
                              }
                            }
                          }
                        }
                      }

                      // ② 기존 리스트 및 인용문 들여쓰기(Indent) 처리
                      const startLine = selection.startLineNumber;
                      const endLine = selection.endLineNumber;
                      const indentSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;

                      // 단일 행 커서(선택 영역 없음)인 경우, 커서가 리스트/인용구 접두사(prefix) 내에 위치하는지 검사
                      // - 커서가 접두사 구간(행 시작 ~ 마커 직후 공백) 내에 있을 때: 리스트 행 들여쓰기 수행
                      // - 커서가 항목 본문 텍스트 중간에 있을 때: 행 들여쓰기를 하지 않고 커서 위치에 탭 공백(tabSize 스페이스) 삽입
                      const isSingleCursor = startLine === endLine && selection.isEmpty();
                      let cursorInPrefix = !isSingleCursor; // 다중 행 선택인 경우 기본 들여쓰기 대상

                      let hasList = false;
                      for (let i = startLine; i <= endLine; i++) {
                        const lineContent = model.getLineContent(i);
                        if (/^[ \t]*([-*+]|\d+[\.\)]|>)/.test(lineContent)) {
                          hasList = true;
                          break;
                        }
                      }

                      if (isSingleCursor && hasList) {
                        const currentLineContent = model.getLineContent(startLine);
                        const isQuoteLine = /^[ \t\u200b\u00a0]*>+/.test(currentLineContent);
                        if (isQuoteLine) {
                          // 💬 인용구(>) 줄인 경우: 커서가 줄 내 어디에 위치하든(시작/본문/끝) 항상 줄 전체 들여쓰기 수행
                          cursorInPrefix = true;
                        } else {
                          // 체크리스트, 일반 불릿, 순서 리스트(1. 또는 1)) 접두사 패턴 매칭
                          const listPrefixMatch = currentLineContent.match(
                            /^([ \t\u200b\u00a0]*(?:[-*+][ \t]+\[[ xX]\]|[-*+]|\d+[\.\)])[ \t\u200b\u00a0]*)/
                          );
                          if (listPrefixMatch) {
                            const prefixLength = listPrefixMatch[1].length;
                            // 1-based column: 커서가 마커 접두사 구간 이하(또는 접두사 바로 뒤 첫 글자)에 있을 때만 들여쓰기
                            cursorInPrefix = selection.startColumn <= prefixLength + 1;
                          } else {
                            cursorInPrefix = false;
                          }
                        }
                      }

                      if (hasList && !isTable) {
                        if (isSingleCursor && !cursorInPrefix) {
                          // 리스트 항목 본문 텍스트 중간에 커서가 있을 때는 해당 행 전체를 들여쓰지 않고 현재 커서 위치에 탭 간격 공백만 삽입
                          editor.pushUndoStop();
                          editor.executeEdits("insertTabSpaces", [{
                            range: selection,
                            text: " ".repeat(indentSize),
                            forceMoveMarkers: true
                          }]);
                          editor.pushUndoStop();
                          return;
                        }

                        editor.pushUndoStop();
                        const edits: any[] = [];
                        const virtualLines = new Map<number, string>();
                        const getLine = (lineIdx: number) => virtualLines.has(lineIdx) ? virtualLines.get(lineIdx)! : model.getLineContent(lineIdx);

                        for (let i = startLine; i <= endLine; i++) {
                          const lineContent = model.getLineContent(i);
                          const match = lineContent.match(/^([ \t\u200b\u00a0]*)(\d+)\.([ \t\u200b\u00a0]+)(.*)/);
                          if (match) {
                            const oldIndent = match[1];
                            const numStr = match[2];
                            const dotSpace = match[3]; // 점 뒤의 공백 문자들 (스페이스 또는 탭, 특수 공백 포함)
                            const newIndent = oldIndent + " ".repeat(indentSize);
                            
                            let newNum = 1;
                            if (i > 1) {
                              const prevLine = getLine(i - 1);
                              const prevMatch = prevLine.match(/^([ \t\u200b\u00a0]*)(\d+)\.([ \t\u200b\u00a0]+)(.*)/);
                              if (prevMatch && prevMatch[1] === newIndent) {
                                newNum = parseInt(prevMatch[2], 10) + 1;
                              }
                            }
                            const prefixLength = oldIndent.length + numStr.length + 1 + dotSpace.length;
                            const newPrefix = newIndent + newNum + "." + dotSpace;
                            const newLineContent = newPrefix + match[4];
                            virtualLines.set(i, newLineContent);
                            
                            edits.push({
                              range: new monaco.Range(i, 1, i, prefixLength + 1),
                              text: newPrefix
                            });
                          } else if (/^[ \t\u200b\u00a0]*>+/.test(lineContent)) {
                            // 💬 인용구(>) 줄 들여쓰기: 목록 하위 인용문 표준인 2칸 공백을 행 시작에 삽입
                            const quoteIndentStep = 2;
                            const newLineContent = " ".repeat(quoteIndentStep) + lineContent;
                            virtualLines.set(i, newLineContent);
                            edits.push({
                              range: new monaco.Range(i, 1, i, 1),
                              text: " ".repeat(quoteIndentStep)
                            });
                          } else {
                            const newLineContent = " ".repeat(indentSize) + lineContent;
                            virtualLines.set(i, newLineContent);
                            edits.push({
                              range: new monaco.Range(i, 1, i, 1),
                              text: " ".repeat(indentSize)
                            });
                          }
                        }
                        editor.executeEdits("indentList", edits);
                        editor.pushUndoStop();
                        setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                      } else if (!isTable) {
                        const contextKeyService = (editor as any)._contextKeyService;
                        const isSuggestVisible = contextKeyService?.getContextKeyValue('suggestWidgetVisible') === true;
                        if (isSuggestVisible) {
                          editor.trigger('keyboard', 'acceptSelectedSuggestion', null);
                        } else {
                          editor.trigger("keyboard", "tab", null);
                        }
                      }
                    }
                  });

                  // ✨ 제목 자동 번호 삽입 — '#' + Space 입력 시 활성 서식 프로필에 따라 번호를 자동 삽입한다.
                  // 예) '## '에서 Space 입력 → '## 1.1 ' (decimal-outline 서식 적용 시)
                  editor.addAction({
                    id: 'custom-space-heading-number',
                    label: '제목 번호 자동삽입 (Space)',
                    keybindings: [monaco.KeyCode.Space],
                    // 자동완성 위젯·찾기 위젯·읽기전용 모드에서는 발동하지 않음
                    precondition: 'editorTextFocus && !suggestWidgetVisible && !findWidgetVisible && !editorReadonly',
                    run: () => {
                      // 한글 IME 조합 중에는 스페이스 폴백 처리
                      if (depsRef.current.isComposingRef?.current) {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      const position = editor.getPosition();
                      const model = editor.getModel();
                      if (!position || !model) {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      const lineContent = model.getLineContent(position.lineNumber);

                      // ✨ 번호 리스트 행('3. ' 또는 '    1. ')에서 불릿 기호('-', '*', '+') 입력 후 Space 시 하위 레벨 글머리 기호 리스트로 즉시 전환
                      if (position.column === lineContent.length + 1) {
                        const listToBulletMatch = lineContent.match(/^([ \t]*)(\d+)[\.\)][ \t]+([-*+])$/);
                        if (listToBulletMatch) {
                          const existingIndent = listToBulletMatch[1];
                          const numVal = parseInt(listToBulletMatch[2], 10);
                          const bulletChar = listToBulletMatch[3];
                          const stepSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;
                          let targetIndent = existingIndent;
                          if (!existingIndent) {
                            const prevLine = position.lineNumber > 1 ? model.getLineContent(position.lineNumber - 1) : '';
                            const prevListMatch = prevLine.match(/^([ \t]*)(?:\d+[\.\)]|[-*+])[ \t]+/);
                            if (prevListMatch || numVal > 1) {
                              targetIndent = (prevListMatch ? prevListMatch[1] : '') + ' '.repeat(stepSize);
                            }
                          }
                          const newPrefix = `${targetIndent}${bulletChar} `;
                          editor.pushUndoStop();
                          editor.executeEdits('ordered-to-nested-bullet', [{
                            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
                            text: newPrefix,
                            forceMoveMarkers: true,
                          }]);
                          editor.setPosition({
                            lineNumber: position.lineNumber,
                            column: newPrefix.length + 1,
                          });
                          editor.pushUndoStop();
                          return;
                        }
                      }

                      // '## ' 처럼 정확히 '#' 1~6개 + 스페이스 1개 형태이고
                      // 커서가 그 줄 끝(스페이스 바로 뒤)에 있을 때만 동작한다.
                      const headingMatch = lineContent.match(/^(#{1,6}) $/);
                      if (!headingMatch || position.column !== lineContent.length + 1) {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      const headingLevel = headingMatch[1].length;

                      // 활성 CSS 프로필의 headingNumbering 설정 가져오기
                      const profile = depsRef.current.resolveEffectiveDocumentProfile?.(
                        depsRef.current.contentRef?.current || ''
                      );
                      const headingFormats = profile?.headingNumbering || [];

                      // headingNumbering.ts 함수들을 직접 호출 (상단 import로 불러온 함수 사용)
                      const fmt = headingFormat(headingFormats[headingLevel - 1]);

                      // 해당 레벨의 서식이 'none'이거나 설정이 없으면 일반 스페이스로 폴백
                      if (!headingFormats.length || fmt === 'none') {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      // 현재 줄 이전까지 각 레벨의 누적 횟수 계산
                      const allLines = Array.from(
                        { length: model.getLineCount() },
                        (_, i) => model.getLineContent(i + 1)
                      );
                      // 현재 줄(targetLineIndex = position.lineNumber - 1, 0-based)은 포함하지 않음
                      const counts = countHeadingsUpTo(
                        allLines,
                        position.lineNumber - 1,
                        headingFormats
                      );
                      // 현재 줄을 누적에 추가하고 하위 레벨을 초기화
                      counts[headingLevel - 1]++;
                      counts.fill(0, headingLevel);

                      // 마커 문자열 생성
                      const setting = headingSetting(headingFormats[headingLevel - 1]);
                      const marker = fmt === 'decimal-outline'
                        ? outlineMarker(headingFormats, counts, headingLevel - 1)
                        : (headingMarker(setting, counts[headingLevel - 1]) || '');

                      if (!marker) {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      // 이미 번호가 있으면 스페이스만 삽입하고 종료 (이중 번호 방지)
                      const afterHashSpace = lineContent.slice(headingLevel + 1);
                      if (hasHeadingNumber(afterHashSpace)) {
                        editor.trigger('keyboard', 'type', { text: ' ' });
                        return;
                      }

                      // '## ' 뒤에 '마커 + 스페이스'를 삽입 (커서는 마커 뒤로 자동 이동)
                      const insertCol = headingLevel + 2; // '#'.repeat(level) + ' ' 다음 컬럼
                      editor.executeEdits('heading-auto-number', [{
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: insertCol,
                          endLineNumber: position.lineNumber,
                          endColumn: insertCol,
                        },
                        text: marker + ' ',
                      }]);
                      editor.setPosition({
                        lineNumber: position.lineNumber,
                        column: insertCol + marker.length + 1,
                      });
                    },
                  });

                  // 💡 [에디터 스크롤 및 D2Coding 타이포그래피 최적화]
                  editor.updateOptions({
                    scrollBeyondLastLine: false,   // 마지막 줄 도달 시 즉시 자동 스크롤
                    fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
                    fontLigatures: true,
                    fontWeight: deps.editorFontWeight === 'bold' ? '700' : deps.editorFontWeight === 'semibold' ? '600' : deps.editorFontWeight === 'medium' ? '500' : '400',
                    lineHeight: 28, // 16px 기준 1.75 비율
                    letterSpacing: 0,
                    cursorWidth: 5,
                    padding: { top: 28, bottom: 28 },
                    lineNumbers: 'off',
                    lineDecorationsWidth: 8,
                    lineNumbersMinChars: 0,
                    glyphMargin: false,
                    folding: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    wrappingStrategy: 'advanced',
                    wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
                    wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',

                    // 🔒 [하단 클릭 시 에디터 붕 뜸 및 상단 유실 방어 3대 마스터 가드]
                    cursorSurroundingLines: 0,
                    cursorSurroundingLinesStyle: 'all',
                    occurrencesHighlight: false,
                    selectionHighlight: false,
                    scrollbar: {
                      vertical: previewModeRef.current==='both'?'hidden':'visible',
                      horizontal: previewModeRef.current==='both'?'hidden':'auto',
                      handleMouseWheel:previewModeRef.current!=='both',
                      verticalScrollbarSize: 16, // 💡 기존 32px에서 절반인 16px로 축소하여 슬림하고 미려한 스크롤바 규격화
                      horizontalScrollbarSize: 10,
                      useShadows: false,
                      verticalHasArrows: false,
                      horizontalHasArrows: false
                    }
                  });

                  // 데스크톱의 로컬 글꼴이 처음 로드된 뒤 Monaco의 글자 폭을 다시 계산한다.
                  // 초기 대체 글꼴 기준으로 잡힌 줄바꿈·스크롤 길이가 웹과 달라지는 일을 막는다.
                  document.fonts.load("500 16px 'Pretendard Variable'").then(() => {
                    if (editorRef.current === editor) {
                      monaco.editor.remeasureFonts();
                      editor.layout();
                    }
                  }).catch(() => undefined);

                  // 💡 [테마 연동 가드] 비동기 세션 복원(restoreSettings)과 에디터 마운트 시차로 인한 테마 미적용 레이스 컨디션 방지
                  if (themePalette) {
                    monaco.editor.setTheme(themePalette);
                  }

                  // 💡 브라우저 맞춤법 검사(빨간 물결선)가 잘려 잔상/찌꺼기처럼 보이는 현상 차단
                  try {
                    const textarea = editor.getDomNode()?.querySelector('textarea');
                    if (textarea) textarea.setAttribute('spellcheck', 'false');
                  } catch (_) { }

                  // 💡 [추가 하드닝] 사이드바 신설/닫힘 시 에디터 굳음 방어: 50ms 후 강제 레이아웃 리프레시
                  setTimeout(() => { editor.layout(); }, 50);

                  // 🤝 [레이스 컨디션 진압 트리거] 
                  // 유저가 하단을 클릭하여 가상 스크롤 컨텍스트가 임의로 깨졌을 때를 대비해,
                  // 포커스 이벤트가 격발되는 순간 에디터의 레이아웃 좌표계를 강제로 제자리로 스냅(Snap) 백 시킵니다.
                  editor.onDidFocusEditorText(() => {
                    // 0.01초 만에 뒤틀린 레이아웃 좌표를 수평 정렬하여 상단 짤림을 영구 방어합니다.
                    editor.layout();
                  });

                  // 💡 [IME-blur] 포커스 아웃 시 즉시 React 상태와 에디터 최종 값 동기화 (이중 입력 방지 가드 탑재)
                  editor.onDidBlurEditorText(() => {
                    if (previewDebounceRef.current) {
                      clearTimeout(previewDebounceRef.current);
                      previewDebounceRef.current = null;
                    }
                    // 💡 [IME-blur 보완] 한글 입력 조합(Composition) 종료와 React 상태 갱신 타이밍 간의 레이스 컨디션을 방지하기 위해 
                    // 100ms 지연 후 에디터 최종 값을 React 상태에 동기화하여 마지막 글자 중복 입력을 원천 방어합니다.
                    setTimeout(() => {
                      if (editorRef.current) {
                        const latestVal = editorRef.current.getValue();
                        setContent(latestVal);
                      }
                    }, 100);
                  });

                  let isTypingScrollLock = false;
                  let typingLockTimeout: any = null;
                  // 💡 [Race Condition 차단] syncPreviewFromCursor 실행 후 짧은 시간 동안
                  // onDidScrollChange → syncPreviewFromEditorScroll이 덮어쓰는 것을 방지
                  let cursorSyncLock = false;
                  let cursorSyncLockTimeout: any = null;

                  // 💡 에디터 내용이 바뀔 때마다(타이핑 및 setValue 포함) 다음 렌더링 프레임에서 데코레이션 즉시 업데이트
                  // 모나코 에디터의 자체 뷰 렌더러가 화면을 새로 그린 직후에 데코레이션을 덮어씌워 파란색 뒤집힘 버그 방지

                  editor.onDidChangeModel(() => {
                    requestAnimationFrame(() => {
                      updateDecorations(editor);
                    });
                  });

                  // 💡 [SPEC-SYNC-001 v3.0] 에디터 ➔ 미리보기 단일 동기화 함수
                  let isTyping = false;
                  let typingTimeout: any = null;
                  let rafSyncId: number | null = null;
                  let rafCursorSyncId: number | null = null;
                  let prevCursorCol = 1;
                  let bookWheelUntil = 0;
                  const bookWheelDom = editor.getDomNode();
                  const handleBookWheel = () => {
                    if (!previewRef.current?.querySelector('.book-page[data-line]')) return;
                    bookWheelUntil = Date.now() + 500;
                    if (rafCursorSyncId) { cancelAnimationFrame(rafCursorSyncId); rafCursorSyncId = null; }
                    cursorSyncLock = false;
                  };
                  bookWheelDom?.addEventListener('wheel', handleBookWheel, { passive:true, capture:true });
                  editor.onDidDispose(() => bookWheelDom?.removeEventListener('wheel', handleBookWheel, true));

                  const syncPreviewFromEditor = () => {
                    if(previewRef.current?.querySelector('.visual-document-editor'))return;
                    if (previewModeRef.current !== 'both' || !previewRef.current) return;
                    if (isScrollingRef.current === 'preview') return;

                    const content = editor.getValue();
                    if (rafSyncId) cancelAnimationFrame(rafSyncId);
                    rafSyncId = requestAnimationFrame(() => {
                      rafSyncId = null;
                      syncPreviewFromEditorScroll(previewRef.current, editor, content);
                    });
                  };

                  let rafCursorStateId: number | null = null;

                  const syncPreviewFromCursor = (lineNumber: number, column?: number) => {
                    if(previewRef.current?.querySelector('.visual-document-editor'))return;
                    if (Date.now() < bookWheelUntil) return;
                    if (previewModeRef.current !== 'both' || !previewRef.current) return;
                    if (isScrollingRef.current === 'preview') return;

                    // 💡 [Race Condition 차단] 커서 동기화 직후 150ms 동안 syncPreviewFromEditorScroll 억제
                    // Monaco가 커서 이동 후 자동으로 에디터를 스크롤하면 onDidScrollChange가 발화되어
                    // syncPreviewFromEditorScroll이 syncPreviewToTargetLine 결과를 덮어쓰는 문제 완전 차단
                    cursorSyncLock = true;
                    if (cursorSyncLockTimeout) clearTimeout(cursorSyncLockTimeout);
                    cursorSyncLockTimeout = setTimeout(() => {
                      cursorSyncLock = false;
                    }, 150);

                    if (rafCursorSyncId) cancelAnimationFrame(rafCursorSyncId);
                    rafCursorSyncId = requestAnimationFrame(() => {
                      rafCursorSyncId = null;
                      if (previewRef.current) {
                        const content = editor.getValue();
                        syncPreviewToTargetLine(previewRef.current, lineNumber, content, { column });
                      }
                    });
                  };

                  let decorationsTimeout: any = null;
                  editor.onDidChangeModelContent(() => {
                    isTyping = true;
                    if (typingTimeout) clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                      isTyping = false;
                    }, 300);

                    // 미리보기 DOM 갱신 전의 스크롤 보정은 렌더 후 보정과 충돌한다.
                    // 입력에 따른 위치 조정은 MainEditorApp의 processedContent 레이아웃 효과가 전담한다.

                    // 💡 [타이핑 랙 제거] 키 입력마다 전체 문서를 정규식 스캔하던 무거운 구문 강조 데코레이션을 120ms 디바운스 처리
                    if (decorationsTimeout) clearTimeout(decorationsTimeout);
                    decorationsTimeout = setTimeout(() => {
                      requestAnimationFrame(() => {
                        const hadTextFocus = editor.hasTextFocus?.();
                        updateDecorations(editor);
                        if (hadTextFocus && !editor.hasTextFocus?.()) editor.focus();
                      });
                    }, 120);

                    requestAnimationFrame(updatePersistentCaret);
                  });

                  if (!(monaco.editor as any)._customActionCommandRegistered) {
                    (monaco.editor as any)._customActionCommandRegistered = true;
                    (monaco.editor as any).registerCommand('trigger-custom-action', (accessor: any, actionId: string) => {
                      setTimeout(() => {
                        if (typeof window !== 'undefined' && (window as any).dispatchEditorCommand) {
                          (window as any).dispatchEditorCommand(actionId);
                        }
                      }, 10);
                    });
                  }

                  // 💡 [슬래시 명령어 플레이스홀더 선택] 툴바/단축키와 동일하게 삽입 후 플레이스홀더를 자동 선택합니다.
                  //    arguments: [insertTextLength, placeholderOffset, placeholderLength]
                  //    Monaco completion command는 삽입 완료 후 실행되므로, 커서 위치에서 역산하여 선택 범위를 계산합니다.
                  if (!(monaco.editor as any)._slashPlaceholderCommandRegistered) {
                    (monaco.editor as any)._slashPlaceholderCommandRegistered = true;
                    (monaco.editor as any).registerCommand(
                      'select-slash-placeholder',
                      (accessor: any, insertTextLength: number, placeholderOffset: number, placeholderLength: number) => {
                        // 활성 에디터를 전역 참조에서 가져옴
                        const activeEditor = (monaco.editor as any).getEditors?.()[0];
                        if (!activeEditor) return;

                        const pos = activeEditor.getPosition();
                        if (!pos) return;

                        // 삽입된 텍스트는 단일 라인이므로: 삽입 후 커서 컬럼 = 삽입 시작 컬럼 + insertTextLength
                        // 플레이스홀더 시작 컬럼 = 삽입 시작 컬럼 + placeholderOffset
                        const insertStartCol = pos.column - insertTextLength;
                        const selStartCol = insertStartCol + placeholderOffset;
                        const selEndCol = selStartCol + placeholderLength;

                        if (selStartCol < 1) return;

                        setTimeout(() => {
                          activeEditor.setSelection(new (window as any).monaco.Selection(
                            pos.lineNumber,
                            selStartCol,
                            pos.lineNumber,
                            selEndCol
                          ));
                          activeEditor.focus();
                        }, 10);
                      }
                    );
                  }
                  // 대용량 문서 엔터 키 입력 시 자동 스크롤 패치 (CORE-01)


                  // 💡 [슬래시 명령어 제안 팝업 ESC 닫기 및 재발동 억제 관리]
                  let isSuggestSuppressed = false;

                  const closeSuggestWidget = () => {
                    isSuggestSuppressed = true;
                    try {
                      editor.trigger('keyboard', 'hideSuggestWidget', {});
                      const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
                      if (suggestCtrl && suggestCtrl.widget && suggestCtrl.widget.value) {
                        suggestCtrl.widget.value.hide();
                      }
                    } catch (_) {}
                  };

                  const handleEscape = () => {
                    // 1. 찾기/바꾸기 위젯이 열려 있으면 찾기 위젯 먼저 닫고 에디터 포커스
                    try {
                      const findCtrl = editor.getContribution('editor.contrib.findController') as any;
                      if (findCtrl?.getState?.()?.isRevealed) {
                        findCtrl.closeFindWidget();
                        editor.focus();
                        return;
                      }
                    } catch (_) {}

                    // 2. 슬래시 자동완성 팝업 닫기
                    closeSuggestWidget();

                    // 3. 플로팅 서식 툴바 닫기 (ESC 입력 시 툴바 닫기)
                    setFloatingToolbar(prev => prev.visible ? { ...prev, visible: false } : prev);
                  };

                  // ESC 키 입력 시 커맨드 등록
                  editor.addCommand(monaco.KeyCode.Escape, handleEscape);

                  editor.onKeyUp((e) => {
                    if (e.keyCode === monaco.KeyCode.Escape || e.browserEvent?.key === 'Escape') {
                      handleEscape();
                      return;
                    }

                    // 제안 팝업이 ESC로 닫힌 상태이면 추가 타이핑이나 조작 전까지 자동 재오픈 억제
                    if (isSuggestSuppressed) {
                      return;
                    }

                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (position && model) {
                      const lineContent = model.getLineContent(position.lineNumber);
                      const beforeCursor = lineContent.substring(0, position.column - 1);
                      if (/(^|\s)\/\S*$/.test(beforeCursor)) {
                        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                      }
                    }
                  });

                  // Shift + Enter 를 누르면 실제 엔터(\n) 대신 <br> 태그를 삽입 (표 내부 줄바꿈 용도)
                  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
                    const position = editor.getPosition();
                    if (!position) return;
                    editor.executeEdits("insertBr", [{
                      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                      text: "<br>",
                      forceMoveMarkers: true
                    }]);
                  });

                  // 🔮 Ctrl + K 전용 AI 글쓰기 어시스턴트 호출 단축키 표준 바인딩 (ReferenceError 및 getModifierState 에러 원천 차단)
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
                    if (typeof window !== 'undefined' && (window as any).dispatchEditorCommand) {
                      (window as any).dispatchEditorCommand('AI_MODAL');
                    }
                  });

                  // 🛡️ [한글 주석 탑재] 표(Table) 자동 정렬 및 너비 계산 헬퍼 함수 정의
                  const getVisualLength = (str: string): number => {
                    let len = 0;
                    for (let i = 0; i < str.length; i++) {
                      const code = str.charCodeAt(i);
                      if (code >= 0x2e80 || (code >= 0xac00 && code <= 0xd7a3)) {
                        len += 2;
                      } else {
                        len += 1;
                      }
                    }
                    return len;
                  };

                  const padVisual = (str: string, targetVisualLen: number): string => {
                    const currentLen = getVisualLength(str);
                    const needed = targetVisualLen - currentLen;
                    if (needed <= 0) return str;
                    return str + ' '.repeat(needed);
                  };

                  const formatTableBlock = (editorInstance: any, targetLineNumber: number) => {
                    const model = editorInstance.getModel();
                    if (!model) return;

                    const lineCount = model.getLineCount();
                    let startLine = targetLineNumber;
                    let endLine = targetLineNumber;

                    // 위쪽 표 영역 시작점 찾기
                    while (startLine > 1) {
                      const prevLineContent = model.getLineContent(startLine - 1);
                      if (isTableLine(prevLineContent)) {
                        startLine--;
                      } else {
                        break;
                      }
                    }

                    // 아래쪽 표 영역 끝점 찾기
                    while (endLine < lineCount) {
                      const nextLineContent = model.getLineContent(endLine + 1);
                      if (isTableLine(nextLineContent)) {
                        endLine++;
                      } else {
                        break;
                      }
                    }

                    const rows: { lineNumber: number; content: string; isDivider: boolean; cells: string[] }[] = [];
                    let maxCols = 0;

                    for (let i = startLine; i <= endLine; i++) {
                      const content = model.getLineContent(i);
                      const isDivider = isTableDividerLine(content);
                      const trimmed = content.trim();
                      const inner = trimmed.substring(1, trimmed.length - 1);

                      const cells: string[] = [];
                      let currentCell = "";
                      for (let j = 0; j < inner.length; j++) {
                        if (inner[j] === '|') {
                          if (j > 0 && inner[j - 1] === '\\') {
                            currentCell += '|';
                          } else {
                            cells.push(currentCell);
                            currentCell = "";
                          }
                        } else {
                          currentCell += inner[j];
                        }
                      }
                      cells.push(currentCell);

                      const trimmedCells = cells.map(c => c.trim());
                      maxCols = Math.max(maxCols, trimmedCells.length);

                      rows.push({
                        lineNumber: i,
                        content,
                        isDivider,
                        cells: trimmedCells
                      });
                    }

                    if (rows.length === 0 || maxCols === 0) return;

                    // 각 열별 비주얼 너비 최댓값 계산 (구분행은 배제)
                    const colWidths = Array(maxCols).fill(0);
                    for (const row of rows) {
                      if (row.isDivider) continue;
                      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
                        const cellText = row.cells[colIdx] || "";
                        const visualLen = getVisualLength(cellText);
                        colWidths[colIdx] = Math.max(colWidths[colIdx], visualLen);
                      }
                    }

                    // 최소 너비 3 보장
                    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
                      colWidths[colIdx] = Math.max(3, colWidths[colIdx]);
                    }

                    const edits: any[] = [];
                    for (const row of rows) {
                      let formattedLine = "|";
                      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
                        const cellText = row.cells[colIdx] || "";
                        const width = colWidths[colIdx];
                        if (row.isDivider) {
                          const text = cellText.trim();
                          const alignLeft = text.startsWith(':');
                          const alignRight = text.endsWith(':');
                          let dividerStr = "";
                          if (alignLeft && alignRight) {
                            dividerStr = ":" + "-".repeat(Math.max(1, width - 2)) + ":";
                          } else if (alignLeft) {
                            dividerStr = ":" + "-".repeat(Math.max(2, width - 1));
                          } else if (alignRight) {
                            dividerStr = "-".repeat(Math.max(2, width - 1)) + ":";
                          } else {
                            dividerStr = "-".repeat(Math.max(3, width));
                          }
                          formattedLine += ` ${dividerStr} |`;
                        } else {
                          const padded = padVisual(cellText, width);
                          formattedLine += ` ${padded} |`;
                        }
                      }
                      const originalLine = model.getLineContent(row.lineNumber);
                      const indentMatch = originalLine.match(/^([ \t]*)/);
                      const indent = indentMatch ? indentMatch[1] : '';
                      const finalLineText = indent + formattedLine;

                      if (finalLineText !== originalLine) {
                        edits.push({
                          range: new monaco.Range(row.lineNumber, 1, row.lineNumber, originalLine.length + 1),
                          text: finalLineText
                        });
                      }
                    }

                    if (edits.length > 0) {
                      editorInstance.pushUndoStop();
                      editorInstance.executeEdits("formatTable", edits);
                      editorInstance.pushUndoStop();
                    }
                  };

                  // 🛡️ [한글 주석 탑재] 표(Table) 여부 및 구분행 판별 헬퍼 함수 정의
                  const isTableLine = (text: string): boolean => {
                    const trimmed = text.trim();
                    if (!trimmed.startsWith('|')) return false;
                    const pipeCount = (trimmed.match(/\|/g) || []).length;
                    return pipeCount >= 2; // 줄 끝에 | 가 없어도 파이프가 2개 이상이면 표 행으로 간주
                  };

                  const isTableDividerLine = (text: string): boolean => {
                    const trimmed = text.trim();
                    if (!isTableLine(trimmed)) return false;
                    const inner = trimmed.substring(1, trimmed.length - 1);
                    const parts = inner.split('|');
                    return parts.every(part => /^[ \t]*:?-+:?[ \t]*$/.test(part));
                  };

                  const getCellRanges = (lineContent: string, lineNumber: number) => {
                    const ranges: { lineNumber: number; startColumn: number; endColumn: number; isEmpty: boolean }[] = [];
                    const pipeIndices: number[] = [];
                    for (let i = 0; i < lineContent.length; i++) {
                      if (lineContent[i] === '|') {
                        if (i > 0 && lineContent[i - 1] === '\\') continue;
                        pipeIndices.push(i);
                      }
                    }
                    if (pipeIndices.length < 2) return { ranges: [], pipeIndices: [] };
                    for (let i = 0; i < pipeIndices.length - 1; i++) {
                      const startIdx = pipeIndices[i] + 1;
                      const endIdx = pipeIndices[i + 1];
                      const rawText = lineContent.substring(startIdx, endIdx);
                      const hasLeftSpace = rawText.startsWith(' ');
                      const hasRightSpace = rawText.endsWith(' ');
                      const trimLeft = hasLeftSpace ? 1 : 0;
                      const trimRight = hasRightSpace ? 1 : 0;
                      const cellStartCol = startIdx + 1 + trimLeft;
                      const cellEndCol = endIdx + 1 - trimRight;
                      const coreText = rawText.substring(trimLeft, rawText.length - trimRight);
                      const isEmpty = coreText.trim().length === 0;

                      if (isEmpty) {
                        // 빈 셀: 파이프 사이 공백들의 정중앙 컬럼에 크기 0의 셀 범위를 생성 (타이핑 시 양옆 공백 1칸 보존)
                        const centerCol = startIdx + 1 + Math.max(1, Math.floor(rawText.length / 2));
                        ranges.push({
                          lineNumber,
                          startColumn: centerCol,
                          endColumn: centerCol,
                          isEmpty: true
                        });
                      } else {
                        ranges.push({
                          lineNumber,
                          startColumn: cellStartCol,
                          endColumn: cellEndCol,
                          isEmpty: false
                        });
                      }
                    }
                    return { ranges, pipeIndices };
                  };



                  // 🎯 표(Table) 현재 열(Column) 정렬 퀵 변경 함수
                  const setTableColumnAlign = (align: 'left' | 'center' | 'right') => {
                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (!position || !model) return;

                    const curLineNum = position.lineNumber;
                    const curLineContent = model.getLineContent(curLineNum);
                    if (!isTableLine(curLineContent)) return;

                    // 표의 시작 줄과 끝 줄 탐색
                    const lineCount = model.getLineCount();
                    let startLine = curLineNum;
                    while (startLine > 1 && isTableLine(model.getLineContent(startLine - 1))) {
                      startLine--;
                    }
                    let endLine = curLineNum;
                    while (endLine < lineCount && isTableLine(model.getLineContent(endLine + 1))) {
                      endLine++;
                    }

                    // 구분선 줄(divider line) 찾기
                    let dividerLineNum = -1;
                    for (let l = startLine; l <= endLine; l++) {
                      if (isTableDividerLine(model.getLineContent(l))) {
                        dividerLineNum = l;
                        break;
                      }
                    }
                    if (dividerLineNum === -1) return;

                    // 현재 커서가 몇 번째 열인지 계산 (0-indexed)
                    const { pipeIndices } = getCellRanges(curLineContent, curLineNum);
                    if (pipeIndices.length < 2) return;

                    let colIndex = 0;
                    for (let i = 0; i < pipeIndices.length - 1; i++) {
                      if (position.column >= pipeIndices[i] + 1 && position.column <= pipeIndices[i + 1] + 1) {
                        colIndex = i;
                        break;
                      }
                    }

                    // 구분선 줄 파싱 및 해당 열 정렬 수정
                    const dividerContent = model.getLineContent(dividerLineNum);
                    const rawPipes: number[] = [];
                    for (let i = 0; i < dividerContent.length; i++) {
                      if (dividerContent[i] === '|') {
                        if (i > 0 && dividerContent[i - 1] === '\\') continue;
                        rawPipes.push(i);
                      }
                    }
                    if (rawPipes.length < 2) return;

                    const parts: string[] = [];
                    for (let i = 0; i < rawPipes.length - 1; i++) {
                      parts.push(dividerContent.substring(rawPipes[i] + 1, rawPipes[i + 1]));
                    }

                    if (colIndex >= parts.length) return;

                    // 정렬 패턴 생성 (:---, :---:, ---:)
                    let newAlignStr = ' :--- ';
                    if (align === 'center') newAlignStr = ' :---: ';
                    else if (align === 'right') newAlignStr = ' ---: ';
                    else newAlignStr = ' :--- ';

                    parts[colIndex] = newAlignStr;
                    const newDividerLine = '|' + parts.join('|') + '|';

                    editor.pushUndoStop();
                    editor.executeEdits('setTableColumnAlign', [{
                      range: new monaco.Range(dividerLineNum, 1, dividerLineNum, dividerContent.length + 1),
                      text: newDividerLine,
                      forceMoveMarkers: true
                    }]);
                    editor.pushUndoStop();
                  };

                  (editor as any).setTableColumnAlign = setTableColumnAlign;
                  if (typeof window !== 'undefined') {
                    (window as any).setTableColumnAlign = setTableColumnAlign;
                  }

                  // 🎯 표 열(Column) 정렬 퀵 단축키 등록
                  // Alt + Shift + L: 현재 열 왼쪽 정렬
                  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
                    setTableColumnAlign('left');
                  });
                  // Alt + Shift + C: 현재 열 중앙 정렬
                  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyC, () => {
                    setTableColumnAlign('center');
                  });
                  // Alt + Shift + R: 현재 열 오른쪽 정렬
                  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
                    setTableColumnAlign('right');
                  });

                  // 🛡️ [한글 주석 탑재] Shift + Tab 키 입력 시 마크다운 표 역방향 셀 이동 및 목록 내어쓰기(Outdent) 통합 처리
                  // 현재 커서가 표 내부이면 이전 셀로 커서를 이동하고,
                  // 목록 계층에 있으면 맨 앞에 존재하는 2칸 공백 또는 1칸 탭 문자를 소거하여 아웃덴트 정렬합니다.
                  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Tab, () => {
                    const selection = editor.getSelection();
                    const model = editor.getModel();
                    if (!model || !selection) return;

                    // ① 마크다운 표 영역인지 검사 및 표 역방향 셀 이동 처리
                    const position = editor.getPosition();
                    if (position) {
                      const lineContent = model.getLineContent(position.lineNumber);
                      if (isTableLine(lineContent) && !isTableDividerLine(lineContent)) {
                        const { ranges, pipeIndices } = getCellRanges(lineContent, position.lineNumber);
                        if (ranges.length > 0) {
                          let currentCellIdx = -1;
                          for (let i = 0; i < pipeIndices.length - 1; i++) {
                            const leftCol = pipeIndices[i] + 1;
                            const rightCol = pipeIndices[i + 1] + 2;
                            if (position.column >= leftCol && position.column <= rightCol) {
                              currentCellIdx = i;
                              break;
                            }
                          }

                          if (currentCellIdx !== -1) {
                            if (currentCellIdx > 0) {
                              // 이전 셀로 이동
                              const prevCell = ranges[currentCellIdx - 1];
                              editor.setSelection(new monaco.Selection(
                                prevCell.lineNumber, prevCell.startColumn,
                                prevCell.lineNumber, prevCell.endColumn
                              ));
                              return;
                            } else {
                              // 첫 번째 셀에서 Shift+Tab -> 이전 행의 마지막 셀로 이동
                              let targetLine = position.lineNumber - 1;
                              if (targetLine >= 1) {
                                let prevLineContent = model.getLineContent(targetLine);
                                if (isTableLine(prevLineContent) && isTableDividerLine(prevLineContent)) {
                                  targetLine--;
                                  if (targetLine >= 1) {
                                    prevLineContent = model.getLineContent(targetLine);
                                  } else {
                                    prevLineContent = "";
                                  }
                                }

                                if (isTableLine(prevLineContent)) {
                                  const prevLineRanges = getCellRanges(prevLineContent, targetLine).ranges;
                                  if (prevLineRanges.length > 0) {
                                    const lastCell = prevLineRanges[prevLineRanges.length - 1];
                                    editor.setSelection(new monaco.Selection(
                                      lastCell.lineNumber, lastCell.startColumn,
                                      lastCell.lineNumber, lastCell.endColumn
                                    ));

                                    // 💡 이전 행으로 이동 시 스크롤 튀는 현상 방지 락 및 강제 동기화
                                    isScrollingRef.current = 'editor';
                                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                    scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 200);
                                    setTimeout(() => {
                                      if (previewRef.current) {
                                        const targetElement = previewRef.current.querySelector(`[data-line="${targetLine}"]`) as HTMLElement;
                                        if (targetElement) {
                                          targetElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                                        }
                                      }
                                    }, 50);
                                    return;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }

                    // ② 리스트 또는 일반 문장 Shift + Tab (내어쓰기/공백 소거) 처리
                    const isSingleCursor = selection.startLineNumber === selection.endLineNumber && selection.isEmpty();
                    if (isSingleCursor && position) {
                      const lineContent = model.getLineContent(position.lineNumber);
                      const isQuote = /^[ \t\u200b\u00a0]*>+/.test(lineContent);
                      if (isQuote) {
                        // 💬 인용구(>) 행인 경우: 앞쪽 들여쓰기 공백(최대 2칸)을 소거하여 내어쓰기
                        const spaceMatch = lineContent.match(/^([ \t\u200b\u00a0]+)(>+)/);
                        if (spaceMatch) {
                          const removeLen = Math.min(spaceMatch[1].length, 2);
                          editor.pushUndoStop();
                          editor.executeEdits("outdentQuote", [{
                            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, removeLen + 1),
                            text: "",
                            forceMoveMarkers: true
                          }]);
                          editor.pushUndoStop();
                          return;
                        }
                        // 앞쪽 공백이 없고 중첩 인용구(>>+)인 경우 > 하나를 소거
                        const nestedMatch = lineContent.match(/^([ \t\u200b\u00a0]*)(>{2,})/);
                        if (nestedMatch) {
                          const startCol = nestedMatch[1].length + 1;
                          editor.pushUndoStop();
                          editor.executeEdits("outdentQuote", [{
                            range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, startCol + 1),
                            text: "",
                            forceMoveMarkers: true
                          }]);
                          editor.pushUndoStop();
                          return;
                        }
                        return; // 이미 기본 1단계 인용구(> )이고 공백이 없으면 본문 임의 훼손 방지
                      }

                      const listMatch = lineContent.match(
                        /^([ \t\u200b\u00a0]*(?:[-*+][ \t]+\[[ xX]\]|[-*+]|\d+[\.\)])[ \t\u200b\u00a0]*)/
                      );
                      if (listMatch) {
                        const prefixLength = listMatch[1].length;
                        // 커서가 마커 접두사 이후(항목 본문 텍스트 내부)에 있는 경우
                        if (position.column > prefixLength + 1) {
                          // 커서 바로 앞의 공백(최대 indentSize 스페이스 또는 1개 탭)을 찾아 소거
                          const indentSize = (tabSizeRef && typeof tabSizeRef.current === 'number') ? tabSizeRef.current : 4;
                          const beforeCursorText = lineContent.substring(0, position.column - 1);
                          const spaceMatch = beforeCursorText.match(/(?:[ \u200b\u00a0]{1,4}|\t)$/);
                          if (spaceMatch && spaceMatch[0].length > 0) {
                            const deleteLen = Math.min(spaceMatch[0].length, indentSize);
                            const startCol = position.column - deleteLen;
                            editor.pushUndoStop();
                            editor.executeEdits("removeTabSpaces", [{
                              range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column),
                              text: "",
                              forceMoveMarkers: true
                            }]);
                            editor.pushUndoStop();
                          }
                          return;
                        }
                      }
                    }

                    // 커서가 행 시작/접두사 구간에 있거나 여러 행을 선택한 경우 기본 아웃덴트 기능 트리거
                    editor.trigger('keyboard', 'outdent', null);
                    setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                  }, "textInputFocus && !suggestWidgetVisible && !inSnippetMode");

                  // 🛡️ [한글 주석 탑재] 엔터 키 입력 시 자동완성 및 리스트 연속 번호 매기기 처리 (텍스트 보존 및 커서 추적 지원)
                  // 자동완성(Suggest Widget)이 열려 있으면 Enter → 자동완성 수락에 양보
                  // 그 외에는 리스트 상태에서 엔터를 치면 다음 줄에 불릿 기호를 자동 주입합니다.
                  
                    editor.addAction({
  id: 'autoRenumberList',
  label: 'Auto Renumber Lists',
  run: () => {
    const model = editor.getModel();
    if (!model) return;
    
    const selection = editor.getSelection();
    if (!selection) return;
    
    const position = selection.startLineNumber;
    let blockStart = position;
    let blockEnd = position;
    
    // 🛡️ [리스트 줄 판별 가드] 수평선(---, ***, ___) 오탐을 철저히 차단하고 실제 숫자/글머리/체크박스 목록만 판별
    const isDividerLine = (lineStr: string) => /^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(lineStr);
    const isBreakTagLine = (lineStr: string) => /^[ \t]*<br\s*\/?>[ \t]*$/i.test(lineStr);
    const isHeadingLine = (lineStr: string) => /^[ \t]*#{1,6}\s/.test(lineStr);
    const isQuoteLine = (lineStr: string) => /^[ \t]*>/.test(lineStr);
    const isCodeFenceLine = (lineStr: string) => /^[ \t]*(?:```|~~~)/.test(lineStr);
    const isNumberedLine = (lineStr: string) => /^[ \t]*\d+\.(?:\s+|$)/.test(lineStr);
    const isTaskLine = (lineStr: string) => /^[ \t]*[-*+]\s+\[[ xX]?\](?:\s+|$)/.test(lineStr);
    const isBulletLine = (lineStr: string) => !isDividerLine(lineStr) && !isTaskLine(lineStr) && /^[ \t]*[-*+](?:\s+|$)/.test(lineStr);
    const isListLine = (lineStr: string) => !isDividerLine(lineStr) && (isNumberedLine(lineStr) || isBulletLine(lineStr) || isTaskLine(lineStr));
    
    // 💡 [블록 경계 탐색] 빈 행이나 구분선, 헤딩, 인용문, 코드블록 조우 시 즉시 중단(break)하여 독립 블록 보장
    while (blockStart > 1) {
      const prevContent = model.getLineContent(blockStart - 1);
      if (prevContent.trim() === '' || isBreakTagLine(prevContent) || isDividerLine(prevContent) || isHeadingLine(prevContent) || isQuoteLine(prevContent) || isCodeFenceLine(prevContent)) {
        break;
      }
      if (isListLine(prevContent)) {
        blockStart--;
      } else {
        break;
      }
    }
    
    const lineCount = model.getLineCount();
    while (blockEnd < lineCount) {
      const nextContent = model.getLineContent(blockEnd + 1);
      if (nextContent.trim() === '' || isBreakTagLine(nextContent) || isDividerLine(nextContent) || isHeadingLine(nextContent) || isQuoteLine(nextContent) || isCodeFenceLine(nextContent)) {
        break;
      }
      if (isListLine(nextContent)) {
        blockEnd++;
      } else {
        break;
      }
    }
    
    const edits: any[] = [];
    const indentStack: { indent: string, count: number, type: 'number' | 'bullet' | 'task' }[] = [];
    
    for (let i = blockStart; i <= blockEnd; i++) {
      const lineContent = model.getLineContent(i);
      if (lineContent.trim() === '' || isBreakTagLine(lineContent) || isDividerLine(lineContent) || isHeadingLine(lineContent)) {
        indentStack.length = 0;
        continue;
      }

      const match = lineContent.match(/^([ \t]*)([-*+]|\d+\.)([ \t]+)(.*)/);
      if (!match) {
        indentStack.length = 0;
        continue;
      }
      
      const currentIndent = match[1];
      const marker = match[2];
      const rest = match[4];
      const isTask = /^\[[ xX]?\](?:\s+|$)/.test(rest);
      const isNumbered = /^\d+\.$/.test(marker);
      const itemType: 'number' | 'bullet' | 'task' = isTask ? 'task' : (isNumbered ? 'number' : 'bullet');
      
      let stackIndex = -1;
      for (let s = 0; s < indentStack.length; s++) {
        if (indentStack[s].indent === currentIndent) {
          stackIndex = s;
          break;
        }
      }
      
      if (stackIndex !== -1) {
        indentStack.splice(stackIndex + 1);
        if (indentStack[stackIndex].type !== itemType) {
          indentStack[stackIndex].type = itemType;
          indentStack[stackIndex].count = isNumbered ? (parseInt(marker, 10) || 1) : 1;
        }
      } else {
        while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent.length > currentIndent.length) {
          indentStack.pop();
        }
        if (indentStack.length === 0 || indentStack[indentStack.length - 1].indent !== currentIndent) {
          // 💡 [시작 번호 보존] 사용자가 블록 첫 행에 지정한 번호(예: 7. 순대)를 initialCount로 보존하여 강제 1번 리셋 방지
          const initialCount = isNumbered ? (parseInt(marker, 10) || 1) : 1;
          indentStack.push({ indent: currentIndent, count: initialCount, type: itemType });
        }
        stackIndex = indentStack.length - 1;
      }
      
      if (isNumbered) {
        const currentCount = indentStack[stackIndex].count;
        const newMarker = currentCount + ".";
        if (marker !== newMarker) {
          const oldPrefixLength = currentIndent.length + marker.length + match[3].length;
          const newPrefix = currentIndent + newMarker + match[3];
          edits.push({
            range: new (window as any).monaco.Range(i, 1, i, oldPrefixLength + 1),
            text: newPrefix
          });
        }
        indentStack[stackIndex].count++;
      } else {
        indentStack[stackIndex].count = 1;
      }
    }
    
    if (edits.length > 0) {
      editor.pushUndoStop();
      editor.executeEdits("autoRenumber", edits);
      editor.pushUndoStop();
    }
  }
});

                    editor.addAction({
                      id: 'custom-enter-list-auto',

                    label: '리스트 자동완성 (Enter)',
                    keybindings: [monaco.KeyCode.Enter],
                    // suggestWidgetVisible = true 이면 이 액션 발동 안됨 → Monaco 기본 Enter(자동완성 수락)에 양보
                    // findWidgetVisible = true 이면 찾기 위젯의 '다음 찾기(Find Next)'에 양보
                    precondition: 'editorTextFocus && !findWidgetVisible && !suggestWidgetVisible && !editorReadonly',
                    run: () => {
                      // ⓪ 만약 찾기/바꾸기 위젯이 표시 중이면 리스트 개행을 실행하지 않고 종료
                      try {
                        const findCtrl = editor.getContribution('editor.contrib.findController') as any;
                        if (findCtrl?.getState?.()?.isRevealed) {
                          return;
                        }
                      } catch (_) {}

                      // ① 자동완성 위젯이 열려 있으면 Enter = 자동완성 항목 수락
                      try {
                        const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
                        if (suggestCtrl?.widget?.value?.suggestWidgetVisible?.get?.()) {
                          editor.trigger('keyboard', 'acceptSelectedSuggestion', {});
                          return;
                        }
                      } catch (_) { /* 위젯 접근 실패 시 무시 */ }

                      const position = editor.getPosition();
                      if (!position) return;
                      const selection = editor.getSelection();
                      
                      // ⭐️ [신규 추가] 텍스트가 선택되어 있는 경우, 리스트 자동완성을 무시하고 선택 영역을 지운 후 개행문자(\n) 입력
                      if (selection && !selection.isEmpty()) {
                        editor.executeEdits("replaceSelectionWithNewline", [{
                          range: selection,
                          text: "\n",
                          forceMoveMarkers: true
                        }]);
                        return;
                      }
                      
                      const model = editor.getModel();
                      if (!model) return;

                      const lineNumber = position.lineNumber;
                      const lineContent = model.getLineContent(lineNumber);
                      // 커서를 기점으로 앞과 뒤의 텍스트 조각을 안전하게 분리
                      const beforeCursor = lineContent.substring(0, position.column - 1);
                      const afterCursor = lineContent.substring(position.column - 1);

                      // 목록 판단용 웅장한 정규식 엔진 모음
                      const taskRegex = /^([ \t]*)([-*+])[ \t]+\[([ xX])\](?:[ \t]+(.*)|)$/;
                      const orderRegex = /^([ \t]*)(\d+)\.(?:[ \t]+(.*)|)$/;
                      const listRegex = /^([ \t]*)([-*+])(?:[ \t]+(.*)|)$/;
                      const quoteRegex = /^([ \t]*)(>+)(?:[ \t]+(.*)|)$/;

                      let match: RegExpMatchArray | null = null;

                      // 0. 구분선 판단 가드 (예: ---) — 구분선 줄에서 Enter 시 다음 빈 줄로 커서 이동하여 새 문단 타이핑 지원
                      const isCurrentLineDivider = /^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(lineContent);
                      if (isCurrentLineDivider) {
                        const lineCount = model.getLineCount();
                        const nextLineNumber = lineNumber + 1;
                        if (nextLineNumber <= lineCount) {
                          const nextLineContent = model.getLineContent(nextLineNumber);
                          if (nextLineContent.trim() === '') {
                            // 다음 줄이 이미 빈 줄이면 그 줄로 커서 이동
                            editor.setPosition({ lineNumber: nextLineNumber, column: 1 });
                          } else {
                            // 다음 줄에 내용이 있으면 빈 줄 삽입 후 커서 이동
                            editor.executeEdits('insertNewlineAfterHR', [{
                              range: new monaco.Range(lineNumber, model.getLineMaxColumn(lineNumber), lineNumber, model.getLineMaxColumn(lineNumber)),
                              text: '\n',
                              forceMoveMarkers: true
                            }]);
                            editor.setPosition({ lineNumber: nextLineNumber, column: 1 });
                          }
                        } else {
                          // 구분선이 마지막 줄이면 새 줄 삽입 후 커서 이동
                          editor.executeEdits('insertNewlineAfterHR', [{
                            range: new monaco.Range(lineNumber, model.getLineMaxColumn(lineNumber), lineNumber, model.getLineMaxColumn(lineNumber)),
                            text: '\n',
                            forceMoveMarkers: true
                          }]);
                          editor.setPosition({ lineNumber: lineNumber + 1, column: 1 });
                        }
                        return;
                      }

                      // 1. 태스크 리스트 판단 가드 (예: - [ ] 작업)
                      if ((match = beforeCursor.match(taskRegex))) {
                        const indent = match[1];
                        const marker = match[2];
                        const checked = match[3];
                        const text = match[4] || '';

                        // 사용자가 아무것도 적지 않고 연속 엔터를 칠 경우 불릿 기호 말끔히 삭제 (리스트 탈출)
                        if (text.trim() === '' && afterCursor.trim() === '') {
                          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                            editor.executeEdits("removeBullet", [{
                            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
                            text: indent,
                            forceMoveMarkers: true
                          }]);
                        } else {
                          // 작성 내용이 있다면 다음 줄에 태스크 불릿(- [ ]) 자동 연속 생성 및 커서 정밀 이전
                          const insertText = `\n${indent}${marker} [ ] ${afterCursor}`;
                          editor.executeEdits("insertBullet", [{
                            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
                            text: insertText,
                            forceMoveMarkers: true
                          }]);
                          const nextLine = lineNumber + 1;
                          const nextColumn = indent.length + marker.length + 6 + 1;
                          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
                            setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                        }
                        return;
                      }

                      // 2. 숫자로 나열된 순번 리스트 판단 가드 (예: 1. 첫 번째 작업)
                      if ((match = beforeCursor.match(orderRegex))) {
                        const indent = match[1];
                        const numStr = match[2];
                        const text = match[3] || '';

                        // 연속 엔터 시 번호 기호 자동 철거
                        if (text.trim() === '' && afterCursor.trim() === '') {
                          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                            editor.executeEdits("removeBullet", [{
                            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
                            text: indent,
                            forceMoveMarkers: true
                          }]);
                        } else {
                          // 작성 내용 발견 시 다음 숫자를 계산(+1)하여 자동 연속 기입 수행
                          const nextNum = parseInt(numStr, 10) + 1;
                          const insertText = `\n${indent}${nextNum}. ${afterCursor}`;
                          editor.executeEdits("insertBullet", [{
                            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
                            text: insertText,
                            forceMoveMarkers: true
                          }]);
                          const nextLine = lineNumber + 1;
                          const nextColumn = indent.length + String(nextNum).length + 2 + 1;
                          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
                            setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                        }
                        return;
                      }

                      // 3. 일반 동그라미/대시 불릿 리스트 판단 가드 (예: - 내용)
                      if ((match = beforeCursor.match(listRegex))) {
                        const indent = match[1];
                        const marker = match[2];
                        const text = match[3] || '';

                        // 연속 엔터 시 리스트 불릿 소거
                        if (text.trim() === '' && afterCursor.trim() === '') {
                          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                            editor.executeEdits("removeBullet", [{
                            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
                            text: indent,
                            forceMoveMarkers: true
                          }]);
                        } else {
                          // 다음 줄 불릿 기호 자동 확장
                          const insertText = `\n${indent}${marker} ${afterCursor}`;
                          editor.executeEdits("insertBullet", [{
                            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
                            text: insertText,
                            forceMoveMarkers: true
                          }]);
                          const nextLine = lineNumber + 1;
                          const nextColumn = indent.length + marker.length + 1 + 1;
                          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
                            setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                        }
                        return;
                      }

                      // 4. 인용구 블록 판단 가드 (예: > 내용)
                      if ((match = beforeCursor.match(quoteRegex))) {
                        const indent = match[1];
                        const quote = match[2];
                        const text = match[3] || '';

                        // 연속 엔터 시 인용구 기호 소거
                        if (text.trim() === '' && afterCursor.trim() === '') {
                          setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                            editor.executeEdits("removeBullet", [{
                            range: new monaco.Range(lineNumber, 1, lineNumber, position.column + afterCursor.length),
                            text: indent,
                            forceMoveMarkers: true
                          }]);
                        } else {
                          // 다음 줄 > 기호 연속 생성
                          const insertText = `\n${indent}${quote} ${afterCursor}`;
                          editor.executeEdits("insertBullet", [{
                            range: new monaco.Range(lineNumber, position.column, lineNumber, lineContent.length + 1),
                            text: insertText,
                            forceMoveMarkers: true
                          }]);
                          const nextLine = lineNumber + 1;
                          const nextColumn = indent.length + quote.length + 1 + 1;
                          editor.setPosition({ lineNumber: nextLine, column: nextColumn });
                            setTimeout(() => editor.getAction('autoRenumberList')?.run(), 10);
                        }
                        return;
                      }

                      // 5. 일반 문장 개행 처리 (기본 들여쓰기 탭 깊이 자동 보존 개행 및 즉각적 커서 안착)
                      const indentMatch = beforeCursor.match(/^([ \t]*)/);
                      const indent = indentMatch ? indentMatch[1] : '';
                      editor.executeEdits("insertNewline", [{
                        range: new monaco.Range(lineNumber, position.column, lineNumber, position.column),
                        text: `\n${indent}`,
                        forceMoveMarkers: true
                      }]);
                      const nextLine = lineNumber + 1;
                      const nextColumn = indent.length + 1;
                      editor.setPosition({ lineNumber: nextLine, column: nextColumn });

                    }
                  });

                  // 🛡️ [한글 주석 탑재] Ctrl + Shift + = (즉, Ctrl+Shift++) 입력 시 표 행 삽입
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Equal, () => {
                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (!position || !model) return;
                    const lineContent = model.getLineContent(position.lineNumber);
                    if (isTableLine(lineContent)) {
                      const { ranges } = getCellRanges(lineContent, position.lineNumber);
                      const cellCount = ranges.length;
                      if (cellCount > 0) {
                        const newRowText = "|" + "  |".repeat(cellCount) + "\n";
                        editor.pushUndoStop();
                        editor.executeEdits("insertTableRowAbove", [{
                          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
                          text: newRowText,
                          forceMoveMarkers: false
                        }]);
                        editor.pushUndoStop();

                        // 삽입된 행의 첫 셀로 포커싱
                        const newRanges = getCellRanges(model.getLineContent(position.lineNumber), position.lineNumber).ranges;
                        if (newRanges.length > 0) {
                          editor.setSelection(new monaco.Selection(
                            position.lineNumber, newRanges[0].startColumn,
                            position.lineNumber, newRanges[0].endColumn
                          ));
                        }
                      }
                    }
                  });

                  // 🛡️ [한글 주석 탑재] Ctrl + Shift + - 입력 시 표 행 삭제 (구분행은 삭제 방지 가드 처리)
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Minus, () => {
                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (!position || !model) return;
                    const lineContent = model.getLineContent(position.lineNumber);
                    if (isTableLine(lineContent)) {
                      // 구분행(| --- | --- |)인 경우 표 붕괴를 막기 위해 삭제 완전 차단
                      if (isTableDividerLine(lineContent)) {
                        return;
                      }
                      editor.pushUndoStop();
                      const lineMaxCol = model.getLineMaxColumn(position.lineNumber);
                      let range: any;
                      if (position.lineNumber < model.getLineCount()) {
                        range = new monaco.Range(position.lineNumber, 1, position.lineNumber + 1, 1);
                      } else if (position.lineNumber > 1) {
                        const prevMaxCol = model.getLineMaxColumn(position.lineNumber - 1);
                        range = new monaco.Range(position.lineNumber - 1, prevMaxCol, position.lineNumber, lineMaxCol);
                      } else {
                        range = new monaco.Range(position.lineNumber, 1, position.lineNumber, lineMaxCol);
                      }
                      editor.executeEdits("deleteTableRow", [{
                        range,
                        text: ""
                      }]);
                      editor.pushUndoStop();
                    }
                  });

                  // Ctrl+Space: 슬래시 명령어 입력 중인 경우 제안 팝업 트리거, 그렇지 않으면 플로팅 툴바 토글
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
                    const position = editor.getPosition();
                    const model = editor.getModel();
                    if (position && model) {
                      const lineContent = model.getLineContent(position.lineNumber);
                      const beforeCursor = lineContent.substring(0, position.column - 1);
                      // 커서 바로 직전이 / 이거나, / 뒤에 공백 없이 영문/숫자가 연속되는 슬래시 입력 패턴인 경우
                      const slashMatch = beforeCursor.match(/\/([a-zA-Z0-9]*)$/);
                      if (slashMatch) {
                        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                        return;
                      }
                    }

                    setFloatingToolbar(prev => {
                      if (prev.visible) return { ...prev, visible: false };
                      let targetPosition = editor.getPosition();
                      const selection = editor.getSelection();
                      const activeSelection = (selection && !selection.isEmpty()) ? selection : lastSelectionRef.current;
                      if (activeSelection && !activeSelection.isEmpty()) {
                        targetPosition = activeSelection.getStartPosition();
                      }
                      if (!targetPosition) return prev;
                      const visiblePos = editor.getScrolledVisiblePosition(targetPosition);
                      if (!visiblePos) return prev;
                      const safeLeft = Math.max(10, visiblePos.left);
                      return { visible: true, top: Math.max(0, visiblePos.top - 10), left: safeLeft };
                    });
                  });

                  // 🔍 [찾기/바꾸기 즉시 포커스 및 엔터 탐색 가드]
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
                    openAndFocusFindWidget(editor, false);
                  });

                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
                    openAndFocusFindWidget(editor, previewModeRef.current !== 'both');
                  });

                  // 💡 [테마 적용 안전장치] 마운트 시점에 수동으로 모든 테마를 다시 정의하고 강제 적용
                  EDITOR_THEMES.forEach(t => {
                    const isDark = t.base === 'vs-dark';
                    monaco.editor.defineTheme(t.id, {
                      base: t.base,
                      inherit: true,
                      rules: [
                        ...(t.rules || []),
                        { token: 'punctuation', foreground: isDark ? 'e2e8f0' : '1e293b' },
                        { token: 'delimiter.markdown', foreground: '60a5fa', fontStyle: 'bold' },
                        { token: 'string.link.markdown', foreground: '94a3b8' },
                        { token: 'variable.md', foreground: 'f59e0b' }
                      ],
                      colors: {
                        ...t.colors,
                        'editor.background': isDark ? '#0b1120' : '#eef2f6',
                        'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
                        'editor.foreground': isDark ? '#e2e8f0' : '#1e293b',
                        'editorLineNumber.foreground': isDark ? '#475569' : '#64748b',
                        'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB',
                        'editorCursor.foreground': isDark ? '#38bdf8' : '#1d4ed8', // 🎯 고대비 커서 시인성 강화 (다크: 네온 스카이블루 #38bdf8 / 라이트: 코발트 블루 #1d4ed8)
                        'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
                        'editorIndentGuide.background': '#88888815',
                        'editorIndentGuide.activeBackground': '#88888830',
                      }
                    });
                  });
                  monaco.editor.setTheme(themePalette);

                  decorationsCollectionRef.current = editor.createDecorationsCollection();
                  updateDecorations(editor);
                  setIsEditorReady(true);
                  const container = editor.getContainerDomNode();
                  const editorDom = editor.getDomNode();
                  const handledPasteEvents = new WeakSet<ClipboardEvent>();
                  const onNativeImagePaste = (event: KeyboardEvent) => {
                    if (previewModeRef.current === 'both') return;
                    const file = desktopClipboardImage(event);
                    if (!file) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    void depsRef.current?.handlePasteImageFile?.(file);
                  };
                  editorDom?.addEventListener('keydown', onNativeImagePaste, true);
                  editor.onDidDispose(() => editorDom?.removeEventListener('keydown', onNativeImagePaste, true));
                  const onEditorPaste = (e: ClipboardEvent) => {
                    if (previewModeRef.current === 'both') return;
                    // 전역 capture 리스너에서도 본문 편집기 내부의 이벤트만 처리한다.
                    // 모달의 JSON·프롬프트 입력창은 브라우저의 기본 붙여넣기를 사용한다.
                    const target = e.target;
                    if (!(target instanceof Node) || !editorDom?.contains(target)) return;
                    if (handledPasteEvents.has(e)) return;
                    handledPasteEvents.add(e);
                    if (depsRef.current?.handleEditorPaste) {
                      depsRef.current.handleEditorPaste(e);
                    }
                  };
                  container?.addEventListener('paste', onEditorPaste, true);
                  editorDom?.addEventListener('paste', onEditorPaste, true);
                  const inputArea = editorDom?.querySelector('textarea');
                  inputArea?.addEventListener('paste', onEditorPaste, true);
                  window.addEventListener('paste', onEditorPaste, true);

                  // 💡 [이미지 바이너리 변환 헬퍼]
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

                  const isImageFile = (file: File): boolean => {
                    if (file.type && file.type.startsWith('image/')) return true;
                    const ext = file.name ? file.name.toLowerCase().split('.').pop() : '';
                    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff'].includes(ext || '');
                  };

                  // 💡 [이미지 및 텍스트 드래그 앤 드롭(Drag & Drop) 전용 핸들러]
                  const dropDecorations = editor.createDecorationsCollection();

                  // 💡 [드롭 위치 실시간 플로팅 인디케이터 커서 & 뱃지 생성]
                  const dropIndicatorCaret = document.createElement('div');
                  dropIndicatorCaret.className = 'onrivi-drop-indicator-caret';
                  dropIndicatorCaret.setAttribute('aria-hidden', 'true');
                  dropIndicatorCaret.style.cssText = [
                    'position:absolute',
                    'z-index:2000',
                    'width:5px',
                    'min-width:5px',
                    'background:#1d4ed8',
                    'pointer-events:none',
                    'display:none',
                    'border-radius:2px',
                    'box-shadow:0 0 10px rgba(29, 78, 216, 0.9), 0 0 2px rgba(255, 255, 255, 0.9)',
                    'will-change:transform,height',
                    'transition:transform 0.04s ease-out'
                  ].join(';');

                  const dropBadge = document.createElement('div');
                  dropBadge.className = 'onrivi-drop-indicator-badge';
                  dropBadge.style.cssText = [
                    'position:absolute',
                    'bottom:100%',
                    'left:50%',
                    'transform:translateX(-50%) translateY(-6px)',
                    'white-space:nowrap',
                    'background:#1d4ed8',
                    'color:#ffffff',
                    'font-size:11px',
                    'font-weight:700',
                    'font-family:Pretendard, -apple-system, sans-serif',
                    'padding:3px 8px',
                    'border-radius:6px',
                    'box-shadow:0 3px 10px rgba(0, 0, 0, 0.3)',
                    'pointer-events:none',
                    'display:flex',
                    'align-items:center',
                    'gap:4px',
                    'letter-spacing:-0.2px'
                  ].join(';');
                  dropBadge.innerHTML = '<span>⬇️ 이미지 삽입 위치</span>';
                  dropIndicatorCaret.appendChild(dropBadge);
                  editorDomNode?.appendChild(dropIndicatorCaret);

                  const clearDropIndicator = () => {
                    dropDecorations.clear();
                    dropIndicatorCaret.style.display = 'none';
                  };

                  let dragCounter = 0;
                  const handleDragOver = (e: DragEvent) => {
                    if (previewModeRef.current === 'both') return;
                    if (e.dataTransfer) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                    }

                    const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
                    const pos = target?.position;
                    if (pos) {
                      // 1. 에디터 커서 실시간 추종
                      editor.setPosition(pos);
                      if (lastSelectionRef) {
                        lastSelectionRef.current = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
                      }

                      // 2. 해당 행 전체 하이라이트 가이드 데코레이션
                      dropDecorations.set([
                        {
                          range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
                          options: {
                            isWholeLine: true,
                            className: 'onrivi-drop-line-highlight',
                          }
                        }
                      ]);

                      // 3. 플로팅 인디케이터 커서 바 및 뱃지 좌표 실시간 갱신
                      const visiblePosition = editor.getScrolledVisiblePosition(pos);
                      if (visiblePosition) {
                        const isDark = document.documentElement.classList.contains('dark') || editorDomNode?.classList.contains('vs-dark');
                        dropIndicatorCaret.style.background = isDark ? '#38bdf8' : '#1d4ed8';
                        dropIndicatorCaret.style.boxShadow = isDark ? '0 0 10px rgba(56, 189, 248, 0.9)' : '0 0 10px rgba(29, 78, 216, 0.9)';
                        dropBadge.style.background = isDark ? '#0284c7' : '#1d4ed8';

                        dropIndicatorCaret.style.display = 'block';
                        dropIndicatorCaret.style.height = `${Math.max(18, visiblePosition.height)}px`;
                        dropIndicatorCaret.style.transform = `translate(${Math.round(visiblePosition.left)}px, ${Math.round(visiblePosition.top)}px)`;
                        dropBadge.innerHTML = `<span>⬇️ 이미지 삽입 (${pos.lineNumber}행 ${pos.column}열)</span>`;
                      }
                    }
                  };

                  container.addEventListener('dragover', handleDragOver, true);
                  container.addEventListener('dragenter', (e: DragEvent) => {
                    if (previewModeRef.current === 'both') return;
                    handleDragOver(e);
                    dragCounter++;
                    if (e.dataTransfer?.types?.includes('Files')) {
                      container.style.outline = '2px dashed #1d4ed8';
                      container.style.outlineOffset = '-4px';
                    }
                  }, true);

                  container.addEventListener('dragleave', (e: DragEvent) => {
                    dragCounter--;
                    if (dragCounter <= 0) {
                      dragCounter = 0;
                      container.style.outline = '';
                      container.style.outlineOffset = '';
                      clearDropIndicator();
                    }
                  }, true);

                  window.addEventListener('dragend', clearDropIndicator, true);

                  container.addEventListener('drop', async (e: DragEvent) => {
                    dragCounter = 0;
                    container.style.outline = '';
                    container.style.outlineOffset = '';
                    clearDropIndicator();
                    if (previewModeRef.current === 'both') {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }

                    const target = editor.getTargetAtClientPoint(e.clientX, e.clientY);
                    const position = target?.position || editor.getPosition();
                    if (position) {
                      editor.setPosition(position);
                      if (lastSelectionRef) {
                        lastSelectionRef.current = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
                      }
                      editor.focus();
                    }

                    const files = e.dataTransfer?.files;
                    // ① 로컬 이미지 파일 드래그 앤 드롭 (단일 및 다중 파일 일괄 지원)
                    if (files && files.length > 0) {
                      const imageFiles = Array.from(files).filter(isImageFile);
                      if (imageFiles.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        for (const imgFile of imageFiles) {
                          if (handlePasteImageFile) {
                            await handlePasteImageFile(imgFile);
                          } else if (deps.handlePasteImageFile) {
                            await deps.handlePasteImageFile(imgFile);
                          }
                        }
                        return;
                      }
                    }

                    // ② 웹 브라우저/외부 페이지에서 이미지를 직접 끌어다 놓은 경우
                    const html = e.dataTransfer?.getData('text/html');
                    const uriList = e.dataTransfer?.getData('text/uri-list');
                    const text = e.dataTransfer?.getData('text') || e.dataTransfer?.getData('text/plain');

                    // HTML 내 <img src="..."> 추출
                    if (html) {
                      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                      if (imgMatch && imgMatch[1]) {
                        e.preventDefault();
                        e.stopPropagation();
                        const imgSrc = imgMatch[1];
                        if (imgSrc.startsWith('data:image/')) {
                          const blob = dataUrlToBlob(imgSrc);
                          if (handlePasteImageFile) {
                            await handlePasteImageFile(blob);
                          } else if (deps.handlePasteImageFile) {
                            await deps.handlePasteImageFile(blob);
                          }
                          return;
                        } else if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                          const mdImg = `![](${imgSrc})\n\n`;
                          if (position) {
                            editor.executeEdits('dragDropImage', [{
                              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                              text: mdImg,
                              forceMoveMarkers: true
                            }]);
                            editor.focus();
                            if (deps.updateContent) {
                              deps.updateContent(editor.getValue(), true);
                            }
                          }
                          return;
                        }
                      }
                    }

                    // 텍스트/URI-List가 이미지 URL인 경우
                    const potentialUrl = (uriList || text || '').trim();
                    if (potentialUrl && (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://'))) {
                      const isImgUrl = /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(potentialUrl);
                      if (isImgUrl) {
                        e.preventDefault();
                        e.stopPropagation();
                        const mdImg = `![](${potentialUrl})\n\n`;
                        if (position) {
                          editor.executeEdits('dragDropImage', [{
                            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                            text: mdImg,
                            forceMoveMarkers: true
                          }]);
                          editor.focus();
                          if (deps.updateContent) {
                            deps.updateContent(editor.getValue(), true);
                          }
                        }
                        return;
                      }
                    }

                    // ③ 일반 텍스트 드래그 앤 드롭 ($0 버그 방지)
                    if (text) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (position) {
                        editor.executeEdits('dragDropText', [{
                          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                          text: text,
                          forceMoveMarkers: true
                        }]);
                        editor.focus();
                        if (deps.updateContent) {
                          deps.updateContent(editor.getValue(), true);
                        }
                      }
                    }
                  }, true);

                  container.addEventListener('mouseenter', () => { isEditorHovered.current = true; });
                  container.addEventListener('mouseleave', () => { isEditorHovered.current = false; });

                  // 💡 [고속/역방향 드래그 가드] Monaco anchor 리셋 방어 — 마우스 다운 위치를 anchor로 고정
                  let editorMouseDown = false;
                  let editorMouseAnchor: { lineNumber: number; column: number } | null = null;

                  editor.onMouseDown((e: any) => {
                    editorMouseDown = true;
                    if (e.target?.position) {
                      const clickedLine = e.target.position.lineNumber;
                      editorMouseAnchor = {
                        lineNumber: clickedLine,
                        column: e.target.position.column
                      };
                      // 💡 [마우스 클릭 시 즉시 activeLine 동기화]
                      setActiveLine(clickedLine);
                      setCursorLine(clickedLine);
                      if (e.target.position.column) {
                        setCursorColumn(e.target.position.column);
                        window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line: clickedLine, column: e.target.position.column } }));
                      }
                    }
                  });

                  editor.onMouseUp(() => {
                    editorMouseDown = false;
                    editorMouseAnchor = null;
                  });

                  editor.onDidChangeModelContent((e) => {
                    if (e && e.changes && e.changes.some(c => c.text === '1. ' || c.text === '1.')) {
                      setTimeout(() => editor.getAction('autoRenumberList')?.run(), 150);
                    }
                  });

                  editor.onDidChangeCursorPosition((e) => {
                    if(previewModeRef.current==='both' && editor.hasTextFocus())window.dispatchEvent(new CustomEvent('onrivi:source-cursor',{detail:{offset:editor.getModel()?.getOffsetAt(e.position)}}));

                    const currentLine = e.position.lineNumber;
                    const currentCol = e.position.column;
                    const hasLineChanged = prevCursorLineRef.current !== currentLine;
                    const colDiff = Math.abs(currentCol - prevCursorCol);
                    const hasWrappedRowChanged = colDiff >= 20; // 긴 문단 내 가로 줄바꿈 컬럼 이동 감지
                    const lineCount = editor.getModel()?.getLineCount() ?? 0;
                    const isNearEnd = lineCount > 0 && currentLine >= lineCount - 1;
                    prevCursorLineRef.current = currentLine;
                    prevCursorCol = currentCol;

                    // 💡 [커서 활성 행 즉각 동기화] 마우스 클릭, 방향키, 타이핑 등 모든 커서 이동 시
                    // activeLine을 항상 최신 currentLine으로 즉각 반영 (React setState는 동일 값이면 리렌더링 생략하므로 무부하 안전)
                    if (rafCursorStateId) cancelAnimationFrame(rafCursorStateId);
                    rafCursorStateId = requestAnimationFrame(() => {
                      rafCursorStateId = null;
                      updatePersistentCaret();
                      setActiveLine(currentLine);
                      setCursorLine(currentLine);
                      setCursorColumn(currentCol);
                      window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line: currentLine, column: currentCol } }));
                    });

                    // 💡 [방향키(↑, ↓) / 마우스 클릭 / 커서 행 / 가로 줄바꿈 컬럼 / 마지막 줄 부근 감지 시 Safe Zone 추종]
                    if ((!isTyping || e.reason === 3) && (hasLineChanged || e.reason === 3 || hasWrappedRowChanged || isNearEnd)) {
                      syncPreviewFromCursor(currentLine, currentCol);
                    }

                    // [WBS CORE-03] 마우스 클릭 등으로 명시적인 커서 행 강제 이동 감지 시 자동완성 팝업 강제 파괴
                    if (e.reason === 3) {
                      try {
                        const suggestCtrl = editor.getContribution('editor.contrib.suggestController') as any;
                        if (suggestCtrl && suggestCtrl.widget && suggestCtrl.widget.value) {
                          suggestCtrl.widget.value.hide();
                        }
                      } catch (_) {
                        editor.trigger('keyboard', 'hideSuggestWidget', {});
                      }
                    }
                  });

                  editor.onDidScrollChange((e) => {
                    if (!e.scrollTopChanged) return;
                    updatePersistentCaret();
                    if (isScrollingRef.current === 'preview') return;
                    if (previewModeRef.current !== 'both' || !previewRef.current) return;
                    if (isTyping) {
                      // 💡 [흔들림 원천 차단] 타이핑 중에는 오직 syncPreviewToTargetLine만 Safe Zone 가시성을 전담 관리
                      // 에디터 자동 스크롤의 syncPreviewFromEditor 바닥 밀착과의 충돌 간섭을 차단하여 덜컹거림 방지
                      return;
                    }
                    if (cursorSyncLock) {
                      // 💡 [Race Condition 완전 차단] 커서 이동 후 150ms 내 Monaco 자동 스크롤 간섭 봉쇄
                      // syncPreviewFromCursor 결과가 syncPreviewFromEditorScroll에 의해 덮어쓰이는 현상 방지
                      return;
                    }

                    // 💡 [에디터 스크롤 이벤트 전담 1:1 실시간 미리보기 동기화]
                    syncPreviewFromEditor();
                  });

                  // 💡 [커서/타이핑/백스페이스 시 스크롤 간섭 0회 보장]
                  // 스크롤 동기화는 오직 사용자의 에디터 휠 및 스크롤바 조작(onDidScrollChange)에서만 구동됩니다.

                  // 💡 [소프트 줄바꿈(Word wrap) 경계면 방향키 2단계 연속 이동 보정]
                  // 문장 끝(윗줄 끝 "단|")에서 오른쪽 키 입력 시 다음 줄 첫 글자 뒤("일|")로 점프하지 않고
                  // 아랫줄 시작("|일")에 멈춘 뒤 재입력 시 전진하도록 보정, 아랫줄 시작에서 왼쪽 키 입력 시 윗줄 끝으로 대칭 복귀
                  const handleWordWrapArrowNavigation = (e: any): boolean => {
                    try {
                      const isRight = e.keyCode === monaco.KeyCode.RightArrow || e.browserEvent?.key === 'ArrowRight';
                      const isLeft = e.keyCode === monaco.KeyCode.LeftArrow || e.browserEvent?.key === 'ArrowLeft';
                      if (!isRight && !isLeft) return false;
                      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return false;

                      const selection = editor.getSelection();
                      if (selection && !selection.isEmpty()) return false;

                      const viewModel = (editor as any)._viewModel;
                      if (!viewModel || !viewModel.coordinatesConverter) return false;

                      const cursorStates = viewModel.getCursorStates?.();
                      if (!cursorStates || cursorStates.length !== 1) return false;

                      const currentCursor = cursorStates[0];
                      const curViewPos = currentCursor?.viewState?.position;
                      if (!curViewPos) return false;

                      const modelPos = editor.getPosition();
                      if (!modelPos) return false;

                      const converter = viewModel.coordinatesConverter;
                      const viewLeft = converter.convertModelPositionToViewPosition(modelPos, 0 /* Left */);
                      const viewRight = converter.convertModelPositionToViewPosition(modelPos, 1 /* Right */);
                      if (!viewLeft || !viewRight) return false;

                      // 두 뷰 위치의 라인이 다르면 소프트 줄바꿈(Word wrap) 경계점임
                      if (viewLeft.lineNumber !== viewRight.lineNumber) {
                        // ① 오른쪽 방향키: 윗줄 끝(viewLeft)에 있을 때 -> 아랫줄 시작(viewRight)으로 뷰 상태 전환
                        if (isRight && curViewPos.lineNumber === viewLeft.lineNumber && curViewPos.column >= viewLeft.column) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.browserEvent?.stopImmediatePropagation?.();

                          const newViewState = currentCursor.viewState.move(false, viewRight.lineNumber, viewRight.column, 0);
                          viewModel.setCursorStates('keyboard', 3 /* Explicit */, [{ modelState: null, viewState: newViewState }]);
                          viewModel.revealAllCursors('keyboard', true);
                          updatePersistentCaret();
                          return true;
                        }

                        // ② 왼쪽 방향키: 아랫줄 시작(viewRight)에 있을 때 -> 윗줄 끝(viewLeft)으로 뷰 상태 전환
                        if (isLeft && curViewPos.lineNumber === viewRight.lineNumber && curViewPos.column <= viewRight.column) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.browserEvent?.stopImmediatePropagation?.();

                          const newViewState = currentCursor.viewState.move(false, viewLeft.lineNumber, viewLeft.column, 0);
                          viewModel.setCursorStates('keyboard', 3 /* Explicit */, [{ modelState: null, viewState: newViewState }]);
                          viewModel.revealAllCursors('keyboard', true);
                          updatePersistentCaret();
                          return true;
                        }
                      }
                    } catch (err) {
                      console.warn('[useMonacoSetup] handleWordWrapArrowNavigation error:', err);
                    }
                    return false;
                  };

                  // 💡 [Enter 즉시 새 행 가시성 확보 및 자동 저장 트리거]
                  editor.onKeyDown((e) => {
                    if (handleWordWrapArrowNavigation(e)) {
                      return;
                    }

                    if (e.keyCode === monaco.KeyCode.Escape || e.browserEvent?.key === 'Escape') {
                      handleEscape();
                    } else if (
                      e.keyCode !== monaco.KeyCode.Shift && 
                      e.keyCode !== monaco.KeyCode.Ctrl && 
                      e.keyCode !== monaco.KeyCode.Alt
                    ) {
                      isSuggestSuppressed = false;
                    }

                    if (e.keyCode === monaco.KeyCode.Enter && !isComposingRef.current) {
                      setTimeout(() => {
                        const pos = editor.getPosition();
                        if (pos) {
                          editor.revealPositionInCenterIfOutsideViewport(pos);
                        }
                      }, 10);
                    }
                  });

                  editor.onMouseDown((e) => {
                    // 🔥 마우스 클릭 시 자동완성 팝업 즉시 닫기
                    // 다른 행 클릭 시 이전 입력 버퍼 잔재로 팝업이 엉뚱한 위치에 뜨는 현상 방지
                    editor.trigger('mouse', 'hideSuggestWidget', {});
                    // 🔥 에디터 마우스 클릭 시 플로팅 서식 툴바 닫기 (사용자 명세: ESC 또는 에디터 마우스 클릭 시에만 툴바 닫힘)
                    setFloatingToolbar(prev => prev.visible ? { ...prev, visible: false } : prev);
                  });
                  editor.onDidChangeCursorSelection((e) => {
                    // 실제 텍스트 선택 시에만 lastSelectionRef 갱신 (커서 이동으로 덮어써지는 버그 방지)
                    if (!e.selection.isEmpty()) {
                      lastSelectionRef.current = e.selection;
                    } else {
                      lastSelectionRef.current = null;
                    }
                    // 💡 [고속 드래그 anchor 리셋 보정] Monaco가 mousemove 이벤트 간격 중 anchor를 잃으면 선택이 리셋되는 현상 방어
                    if (editorMouseDown && editorMouseAnchor && e.source === 'mouse' && !e.selection.isEmpty()) {
                      const sel = e.selection;
                      const anchorMatchStart = sel.startLineNumber === editorMouseAnchor.lineNumber && sel.startColumn === editorMouseAnchor.column;
                      const anchorMatchEnd = sel.endLineNumber === editorMouseAnchor.lineNumber && sel.endColumn === editorMouseAnchor.column;
                      if (!anchorMatchStart && !anchorMatchEnd) {
                        const aL = editorMouseAnchor.lineNumber, aC = editorMouseAnchor.column;
                        const fL = sel.positionLineNumber, fC = sel.positionColumn;
                        const forward = aL < fL || (aL === fL && aC < fC);
                        editor.setSelection({
                          startLineNumber: forward ? aL : fL,
                          startColumn: forward ? aC : fC,
                          endLineNumber: forward ? fL : aL,
                          endColumn: forward ? fC : aC
                        });
                      }
                    }
                  });

                  if ((monaco.languages as any)._customSlashProvider) {
                      (monaco.languages as any)._customSlashProvider.dispose();
                    }
                    (monaco.languages as any)._customSlashProvider = monaco.languages.registerCompletionItemProvider('markdown', {
                    // 슬래시(/)와 일반 문자 모두에서 자동완성 트리거
                    triggerCharacters: ['/'],  // '/' 입력 시에만 슬래시 커맨드 팝업
                    provideCompletionItems: (model: any, position: any) => {
                      const textUntilPosition = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                      });

                      // 현재 줄에서 마지막 '/' 부터 커서까지를 슬래시 단어로 추출
                      // 예) 'hello /bold' → slashWord = '/bold'
                      const slashMatch = textUntilPosition.match(/(^|\s)(\/\S*)$/);
                      if (!slashMatch) {
                        return { suggestions: [] };
                      }

                      const slashWord = slashMatch[2]; // '/bold', '/', '/im' 등
                      // '/' 하나만 있거나, '/단어' 형태일 때만 제안
                      if (!slashWord.startsWith('/')) {
                        return { suggestions: [] };
                      }

                      // 슬래시 단어 시작 컬럼 (교체 범위 시작)
                      const startColumn = position.column - slashWord.length;

                      const suggestions = getSlashCommands(monaco, customSlashCommandsRef.current);

                      // 입력한 단어로 필터링 (/ 이후 글자 기준, 영문 및 한글 모두 지원)
                      const filterWord = slashWord.slice(1).toLowerCase().trim(); // 'bold', '표', '제목' 등

                      const filtered = filterWord.length === 0
                        ? suggestions  // '/' 만 입력 → 전체 표시
                        : suggestions.filter(s => {
                          const labelStr = typeof s.label === 'string' ? s.label : '';
                          const filterStr = typeof s.filterText === 'string' ? s.filterText : '';
                          const detailStr = typeof s.detail === 'string' ? s.detail : '';
                          return (
                            labelStr.toLowerCase().includes(filterWord) ||
                            filterStr.toLowerCase().includes(filterWord) ||
                            detailStr.toLowerCase().includes(filterWord)
                          );
                        });

                      return {
                        suggestions: filtered.map((s, idx) => {
                          const labelStr = typeof s.label === 'string' ? s.label : '';
                          const filterStr = typeof s.filterText === 'string' ? s.filterText : '';
                          const isDirectMatch = labelStr.toLowerCase().includes(filterWord) || filterStr.toLowerCase().includes('/' + filterWord);
                          return {
                            ...s,
                            sortText: isDirectMatch ? String(idx).padStart(4, '0') : 'z_' + String(idx).padStart(4, '0'),
                            // '/bold' 전체를 교체하여 '/bold' → '**텍스트**' 로 올바르게 변환
                            range: {
                              startLineNumber: position.lineNumber,
                              endLineNumber: position.lineNumber,
                              startColumn: startColumn,
                              endColumn: position.column
                            }
                          };
                        })
                      };
                    }
                  });

                  // [[ 위키 링크 자동완성 (파일 + 헤딩)
                  if ((monaco.languages as any)._customWikilinkProvider) {
                      (monaco.languages as any)._customWikilinkProvider.dispose();
                    }
                    (monaco.languages as any)._customWikilinkProvider = monaco.languages.registerCompletionItemProvider('markdown', {
                    triggerCharacters: ['[', '#'],
                    provideCompletionItems: async (model: any, position: any) => {
                      const textUntilPos = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: Math.max(1, position.column - 80),
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                      });
                      const bracketMatch = textUntilPos.match(/\[\[([^\]\n]*)$/);
                      if (!bracketMatch) return { suggestions: [] };
                      const inside = bracketMatch[1];
                      const hashIdx = inside.indexOf('#');
                      const files = docLinkFilesRef.current;
                      const curPath = currentFileNodeRef.current?.path || '';
                      if (hashIdx >= 0) {
                        const fileMatch = inside.substring(0, hashIdx);
                        const headingFilter = inside.substring(hashIdx + 1).toLowerCase();
                        let targetFile: FileNode | null = null;
                        for (const f of files) {
                          if (f.path?.toLowerCase().includes(fileMatch.toLowerCase()) || f.name?.toLowerCase().includes(fileMatch.toLowerCase())) {
                            targetFile = f; break;
                          }
                        }
                        if (!targetFile) return { suggestions: [] };
                        let headings: string[] = [];
                        try {
                          const text = await readFileTextRef.current(targetFile);
                          headings = extractHeadings(text);
                        } catch { return { suggestions: [] }; }
                        const filtered = headingFilter ? headings.filter(h => h.toLowerCase().includes(headingFilter)) : headings;
                        const relPath = getRelativePath(curPath, targetFile.path || '');
                        const matchLen = bracketMatch[0].length;
                        return {
                          suggestions: filtered.map(h => ({
                            label: h, kind: monaco.languages.CompletionItemKind.Reference,
                            insertText: `[${h}](<${relPath}#${h}>)`,
                            range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: position.column - matchLen, endColumn: position.column }
                          }))
                        };
                      }
                      const fileFilter = inside.toLowerCase();
                      const filteredFiles = files.filter(f => {
                        if (f.kind === 'directory') return false;
                        const name = f.name || ''; const path = f.path || '';
                        return !fileFilter || name.toLowerCase().includes(fileFilter) || path.toLowerCase().includes(fileFilter);
                      });
                      const matchLen = bracketMatch[0].length;
                      return {
                        suggestions: filteredFiles.map(f => {
                          const relPath = getRelativePath(curPath, f.path || '');
                          const cleanName = (f.name || f.path || '').replace(/\.(md|markdown)$/i, '');
                          return {
                            label: f.name || f.path || '',
                            kind: monaco.languages.CompletionItemKind.File,
                            insertText: `[${cleanName}](<${relPath}>)`,
                            range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: position.column - matchLen, endColumn: position.column }
                          };
                        })
                      };
                    }
                  });

                  // ⛔ [반반 스크롤 동기화 제거] — 타이핑 시 Monaco 자동 스크롤이 프리뷰를 흔들던 문제 수정
                  // 프리뷰 → 에디터 단방향 동기화만 유지 (프리뷰 onScroll)

                  editor.onDidDispose(() => {
                    if (editorRef.current === editor) {
                      editorRef.current = null;
                    }
                  });
  };

  return { handleMount };
}
