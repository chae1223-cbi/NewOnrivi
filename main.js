// ====================================================================
// 📊 [OMD-MAIN-main-0001] main.js ➔ CSP_connect_src_fix
// 🎯 @KICK  : CSP connect-src 지침에 http: https: 추가하여 외부 이미지/폰트 fetch 차단 해결
// 🛡️ @GUARD : Monaco editor 등 기존 설정 유지
// 🚨 @PATCH : **2026-10-28** — [외부 AI(Google Gemini, Claude Desktop) MCP 원클릭 연동 및 ONRIVI_MCP_HOME 환경변수 기반 동적 경로 연동]:
//             1) mcp:check-targets 신설: Gemini(mcp_config.json) 및 Claude Desktop(claude_desktop_config.json)의 경로 존재 여부 및 onrivi-author 등록 상태 자동 검사
//             2) mcp:install-target 신설: 하드코딩된 절대경로 대신 ONRIVI_MCP_HOME 및 APPDATA 환경변수를 동적으로 참조하도록 등록하여 재설치/경로 변경 시에도 설정 깨짐 원천 방지
//             3) mcp:uninstall-target 신설: 원클릭으로 해당 AI 설정 파일에서 onrivi-author MCP 서버 등록을 깔끔하게 해제
//             4) syncMcpEnvironmentVariable: 앱 기동 및 MCP 연결 시 현재 설치된 플러그인 실물 경로를 Windows 사용자 환경변수(ONRIVI_MCP_HOME)에 자동 동기화
// 🚨 @PATCH : **2026-10-26** — [단축코드 정의서(shortcodes.json) 리소스 폴더 IPC 입출력 신설]: shortcodes:load 및 shortcodes:save IPC 핸들러를 추가하여 환경설정의 단축키 및 슬래시 명령어를 리소스 폴더(settings/shortcodes.json)에 영구 보존 지원
// 🚨 @PATCH : **2026-10-26** — [도움말 3중 미러 자동 동기화 및 읽기 시 frontend/public 최우선 탐색]:
//             1) file:readFromPath에서 과거 정적 빌드 산출물(frontend/out) 대신 개발자가 수정한 소스 디렉터리(frontend/public)를 1순위로 탐색하여 도움말 수정 시 과거 빌드 내용으로 초기화되는 결함 해결
//             2) file:save에서 도움말 문서(HELP-*.md, 00_시작하기.md) 저장 시 frontend/public/help, docs/help, frontend/out/help 3개 경로에 원자적 동시 기록하여 온리비어서에서 편집 후 재빌드 시 과거 파일로 덮어써져 초기화되는 현상 영구 박멸
// 🚨 @PATCH : **2026-10-24** — [클립보드 HTML 서식 및 텍스트 동시 복사(clipboard:writeHtml) IPC 탑재]:
//             1) clipboard.write({ html, text })를 연동하여 OS 시스템 클립보드에 인라인 CSS가 적용된 서식 HTML과 일반 텍스트를 원자적으로 동시 기록
// 🚨 @PATCH : **2026-10-21** — [AI API 키 리소스 폴더 암호화(AES-256) 전용 격리 및 다중 기기/드라이브 자동 구분 관리]:
//             1) 로컬 스토리지 API 키 보관을 배제하고 리소스 폴더({resourceFolder}/settings/ai_credentials.enc)를 단일 진실 공급원으로 통일
//             2) device:get-info IPC 신설로 물리 기기 UUID 및 호스트명(os.hostname()) 자동 감지
//             3) ai-credentials:load / ai-credentials:save IPC 신설로 리소스 폴더 암호화 자격증명 파일 입출력 완비
//             4) initializeDesktopResourceFolder에 settings 디렉토리 생성 포함
// 🚨 @PATCH : **2026-10-21** — [iframe 내 구글 내 지도(My Maps)/외부 미디어 CSP 차단 버그 해결]: onHeadersReceived에서 3rd-party 외부 iframe(google.com, youtube.com 등)에 앱 전용 CSP를 강제 주입하지 않도록 출처 필터링을 적용하고, gstatic.com 도메인을 CSP 화이트리스트에 추가하여 구글 내 지도 캔버스가 빈 화면(텍스트만 표시)으로 멈추는 결함 완벽 해결
// 🚨 @PATCH : **2026-10-19** — [Windows/macOS OS 네이티브 이모지 창(system:showEmojiPicker) Electron 내장 app.showEmojiPanel 직결]:
//             1) 외부 PowerShell 스크립트 실행으로 인한 포커스 상실 및 실행 지연을 전면 폐기하고, Electron 네이티브 app.showEmojiPanel()을 직결 호출하여 Windows 10/11 및 macOS에서 즉각 시스템 이모지 창 팝업 보장
//             2) mainWindow.focus()를 선행 호출하여 입력 커서 포커스를 유지하고 이모지 선택 시 즉각 본문에 입력되도록 연동
// 🚨 @PATCH : **2026-10-26** — [findLocalImageFile 활성 워크스페이스(currentActiveWorkspacePath) 이미지 탐색 연동]:
//             1) media://local/serve 및 이미지 읽기 시 리소스 폴더뿐만 아니라 현재 활성 워크스페이스(images/ 등) 경로도 함께 교차 탐색하여 문서 로컬 이미지 404 Not Found 결함 방어
// 🚨 @PATCH : **2026-10-18** — [이미지 저장(file:saveImage) 시 동일 파일명 덮어쓰기 방어 및 무결성 보존]:
//             1) file:saveImage에서 대상 경로에 동일 이름의 파일이 이미 존재할 경우 바이너리 바이트(Buffer.equals)를 대조
//             2) 파일 내용이 다르면 기존 파일을 절대 덮어쓰지 않고 고유 접미사(_1, _2...)를 부여하여 안전하게 보존하고 새 파일명 및 mediaPath 반환
//             3) 파일 내용이 동일하면 기존 파일을 무손실 재사용하여 중복 디스크 낭비 방지
// 🚨 @PATCH : **2026-10-16** — [전역 검색(file:searchInFolder & getAllMdFiles) 경로 해석·유니코드 NFC 정규화·심볼릭 링크 탐색 전면 보강]:
//             1) file:searchInFolder에서 전달된 folderPath가 상대 폴더명이거나 GoogleDrive 가상 경로 또는 미존재 경로일 때 currentActiveWorkspacePath 및 settings.json(localWorkspaceFolder)을 자동 해석하여 검색 누락(0건) 버그 해결
//             2) 한글 파일명 및 본문의 NFD/NFC 유니코드 정규화(.normalize('NFC'))를 적용하여 자소 분리된 한글 문서 및 검색어 매칭 100% 보장
//             3) getAllMdFiles에서 심볼릭 링크/정션 디렉토리(isSymbolicLink) 순환 방어 탐색 및 .bib 파일 검색 지원 추가
// 🚨 @PATCH : **2026-10-14** — [폴더 전역 검색(file:searchInFolder) 성능 최적화 및 의존성/빌드 폴더 무시·예외 격리]:
//             1) getAllMdFiles에서 node_modules, .git, .next, out, dist, build, scratch 등 대규모 폴더를 무시(IGNORED_SEARCH_DIRS)하고 withFileTypes 기반으로 안전하게 탐색하여 메인 프로세스 동기 블로킹 및 탐색 중단 버그 해결
//             2) file:searchInFolder 핸들러에서 파일별 읽기 예외를 격리하여 잠긴 파일이나 비정상 파일이 있어도 나머지 마크다운 파일 검색이 정상 완료되도록 무결성 보장
// 🚨 @PATCH : **2026-10-14** — [로컬 이미지 경로(/media/, media/, 파일명) 지능형 통합 해석(findLocalImageFile) 및 모달/프로토콜 미리보기 로드 정상화]:
//             1) findLocalImageFile 헬퍼를 신설하여 media, media-local 프로토콜 및 file:readImageAsBase64 핸들러에서 리소스 폴더(D:\Onrivi_Asset 등)의 media 하위 및 루트 경로를 자동 탐색하도록 개선
//             2) 파일 경로에 드라이브 문자가 누락된 경우(/media/image.png 등)에도 로컬 리소스 폴더의 실제 파일과 100% 정상 매칭되어 Base64 Data URL 및 프로토콜 서빙 지원
// 🚨 @PATCH : **2026-10-14** — [클립보드 네이티브 비트맵 이미지 복사(clipboard:writeImage) 신설 및 이미지 복사 기능 정상화]:
//             1) clipboard:writeImage IPC 핸들러를 신설하여 로컬 파일(절대/상대/media 폴더), Data URL, 웹 URL을 Electron nativeImage 비트맵으로 변환 후 OS 시스템 클립보드에 직접 기록
//             2) 텍스트 주소만 복사되어 다른 프로그램이나 에디터/모달에 붙여넣기가 불가능했던 문제를 원천 해결하고, 그림판/Word/카카오톡/에디터/ImageModal에 실제 이미지 바이너리가 100% 정상 붙여넣기되도록 구현
// 🚨 @PATCH : **2026-10-14** — [웹 이미지/미디어 드래그 앤 드롭 외부 브라우저(Chrome) 팝업 원천 차단 및 CORS 우회 다운로드(net:fetchImageBlob) 탑재]:
//             1) will-navigate 이벤트에서 웹 이미지 URL(gstatic.com, googleusercontent.com, /images?, 확장자 등) 내비게이션을 선제 차단하여 드래그 앤 드롭 시 시스템 기본 브라우저에 새 창/새 탭이 열리는 버그 원천 박멸
//             2) net:fetchImageBlob IPC 핸들러를 신설하여 구글 이미지 검색 등 외부 웹 이미지 바이너리를 CORS 제한 없이 안전하게 다운로드 후 로컬 media 폴더에 파일로 보존
// 🚨 @PATCH : **2026-10-14** — [데스크톱 구글 드라이브 인증(gdrive:request-auth) 중복 호출 방어 및 활성 프로미스 싱글톤 재사용]: 이미 인증 루프백 서버 및 브라우저 Handoff가 대기 중인 상태에서 추가 호출 유입 시, 기존 요청을 취소(Reject)하지 않고 진행 중인 Promise를 안전하게 재사용(Shared Singleton)하여 '새로운 인증 요청으로 인해 이전 요청이 취소되었습니다' 에러 및 중복 브라우저 팝업 완벽 박멸
// 🚨 @PATCH : **2026-10-10** — [file:readFromPath 도움말(/help/, HELP-*.md) 지능형 폴백 탐색 엔진 탑재]: 데스크톱 앱에서 워크스페이스 경로 결합(D:\...\help\HELP-01_...md) 또는 /help/ 경로로 유입 시 파일이 없을 때, frontend/public/help, frontend/out/help, docs/help를 자동 탐색하여 100% 정상 로드하고 '파일을 찾을 수 없습니다' 에러 완전 해결
// 🚨 @PATCH : **2026-10-04** — [로컬 파일 읽기(file:readFromPath) 상대경로/파일명 단독 유입 시 활성 워크스페이스 지능형 재귀 탐색]: 상대경로(예: '여기는 연습1.md') 전달 시 현재 활성 워크스페이스(currentActiveWorkspacePath) 직접 결합 및 하위 재귀 탐색(findFileRecursive)을 선행하여 파일을 100% 정상 로드하고 '파일을 찾을 수 없습니다' 크래시 완전 해결
// 🚨 @PATCH : **2026-10-04** — [데스크톱 Google OAuth 400 invalid_request 해결 & 시스템 브라우저 웹 Handoff 및 루프백 브리지 엔진 신설]: Google의 임베디드 웹뷰 및 비표준 redirect_uri 차단 정책을 준수하기 위해 gdrive:request-auth IPC 핸들러 및 임시 루프백 서버(http://127.0.0.1:port)를 가동하고, 시스템 기본 브라우저(https://onrivi.com/auth/google-drive-desktop)를 통해 GIS 인증 후 토큰을 데스크톱으로 즉각 수신하는 이중 브리지(루프백 fetch + onriviauthor:// 딥링크) 탑재
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브 GIS 연동을 위한 CSP 정책 확장]: cspDirectives 내 script-src, frame-src에 https://accounts.google.com 추가 및 connect-src에 https://accounts.google.com, https://www.googleapis.com 추가하여 구글 로그인 및 드라이브 API 통신 허용
// 🚨 @PATCH : **2026-10-02** — [클립보드 탐색기 파일 복사 및 스크린샷 3중 네이티브 추출 강화]: clipboard:readImage 핸들러에서 비트맵 외에 Windows FileNameW 버퍼 및 파일 경로 텍스트를 감지하여 탐색기 Ctrl+C 복사 이미지 파일의 바이너리를 Base64로 즉시 추출·전달하도록 개선
// 🚨 @PATCH : **2026-10-01** — [데스크톱 로컬 이미지 읽기 지능형 하위 media 폴백 탐색]: file:readImageAsBase64 핸들러에서 전달된 파일 경로가 존재하지 않는 경우, 리소스 폴더 하위 media 폴더 또는 상위 경로를 교차 탐색하여 사용자 마크다운 경로(단순 파일명 또는 서브폴더)의 이미지를 100% 정상 로드하도록 보강
// 🚨 @PATCH : **2026-09-27** — 사용자 서식 읽기·수정·가져오기·AI 생성 저장소를 profiles/userCssProfiles.json 하나로 통일. 개별 CSS 생성 및 다른 저장소 폴백 제거.
// 🚨 @PATCH : **2026-09-23** — [데스크톱 앱 최신 툴바 아이콘 및 에셋 서빙 보장] app:// 커스텀 프로토콜 핸들러에 frontend/out 부재 시 frontend/public 폴백 탐색 엔진을 탑재하여 데스크톱 앱에서 최신 툴바 아이콘(WechatLogo, Password, CubeFocus, NewspaperClipping 등) 100% 정상 노출 보장
// 🚨 @PATCH : **2026-09-18** — [폴더 삭제 되돌리기(Undo) IPC 지원 및 파일/폴더 조작 안정성 고도화]: 1) file:backupFolderForUndo 및 file:restoreFolderFromUndo 핸들러 신설하여 폴더 삭제 전 임시 디렉토리 백업 및 Ctrl+Z 복원 완벽 지원 2) file:rename, file:move, file:delete에서 Windows 파일 잠금 및 백신 프로세스 점유로 인한 EPERM/EBUSY 예외를 방어하기 위해 fs.rmSync에 maxRetries: 5, retryDelay: 100 옵션 탑재
// 🚨 @PATCH : **2026-09-17** — [이전 작업(식품위생법/인디공연) 하드코딩 폴백 및 프롬프트 예시 전면 제거, 문서 기반 동적 태그/요약 추출 엔진 탑재]: 1) 해시태그 부재 시 문서 제목, 볼드 메타데이터(**문서명**, **프로젝트명** 등), 헤딩으로부터 실질 도메인 키워드를 동적 추출하여 타 문서 태그 오염 100% 원천 방어 2) AI 프롬프트 예시를 도메인 중립 템플릿으로 치환하여 소형 모델(Gemma)의 프롬프트 예시 베끼기 방지 3) 기본 요약/단락 정규식에서 이전 작업 하드코딩 제거 4) validChunks ReferenceError 및 LLM JSON 5단계 초정밀 복원 엔진 연동
// 🚨 @PATCH : **2026-09-17** — [지식 문서 색인/상세조회 메타 청크 반환 0건 무결성 보장]: chunkMarkdownByHeadingsHelper 내부에서 isMetaOrAuxiliaryChunk 사전 필터링 적용, index 및 detail 반환 시 validChunks(7건)를 엄격히 매핑하여 UI 상에 서두/메타영역(#서식설정) 노출 원천 차단
// 🚨 @PATCH : **2026-09-16** — [의미 기반 RAG 표준 청킹(Semantic Chunking) DB 스키마·원자적 표·독립 청크 적재 지원]: 1) document_chunks 테이블에 chunk_type 컬럼 마이그레이션(ALTER TABLE) 및 index-document 적재 연동 2) 표(Table) 원자성 및 [문서명 > 섹션 > 소제목] 독립 문맥이 결합된 청크 텍스트 FTS 인덱싱 3) 검색(search) 시 chunk_type 반환 및 표/일정 질의 시 표 청크 우선순위 우대 가점화
// 🚨 @PATCH : **2026-09-16** — [지식 보관함 메타/서식/블로그 부가 섹션 100% 원천 제외(Filter-out) 및 순수 실질 본문 검색 보장]: 1) 사용자 요구 반영("메터는 지식자료에서 제외시켜줘"): YAML 프론트매터, #서식설정, css_profile, 메타정보, 제목 후보, SEO 키워드, 해시태그, 1:1 이미지 생성 프롬프트, 껍데기 헤딩 청크를 검색 결과 및 RAG 컨텍스트에서 100% 원천 배제 2) 조문/제안이유/요약/해설 등 오직 실질적인 사실 본문 청크만 검색·인용·각주화되도록 보장
// 🚨 @PATCH : **2026-09-16** — [데스크톱 Auto-RAG 한국어 자연어 검색·불용어 정제·FTS5 다중 티어(AND->OR->제목/태그) 및 알맹이 청크 가중치 전면 개편]: 1) 구어체 질문(알려줄래..., ~에 대해 등)에서 특수문자 구문오류(fts5 syntax error near '.') 및 불용어/조사/내용 접미사를 자동 정제하여 핵심 명사 키워드('공인중개사', '입법') 추출 2) FTS5 AND 검색 후 결과 부족 시 OR 검색 및 Title/Tag/Heading LIKE 다중 티어 검색으로 무결성 보장 3) 메타/해시태그 청크 감점 및 제안이유/요약/법안 실질 본문 가점 산출 4) chunkId, documentTitle, snippet, score 표준 필드 매핑으로 AIDraftModal 지식 주입 및 출처 각주 완벽 연동
// 🚨 @PATCH : **2026-09-16** — [핵심 요점(key_points) 제목 껍데기 탈피 및 소제목+본문 세부 내용 종합 추출 전면 개편]: 단순 소제목('우리가 얻는 실질적인 변화' 등) 복사를 원천 차단하고, 소제목과 그 아래 기술된 실제 하위 세부 항목(스탠딩 관람 및 춤 허용, 억울한 영업정지 해소, 골목 상권 활성화, 변종 클럽 단속 시행령 기준, 주택가 소음 대책, 시행 시기, 독자 찬반 질문)을 종합하여 알맹이가 담긴 서술형 핵심 요점과 정형 데이터를 적재하도록 AI 프롬프트 및 스마트 추출기 전면 고도화
// 🚨 @PATCH : **2026-09-16** — [윈도우 CRLF(\\r\\n) 정규식 매칭 및 스마트 본문 요약·Gemma 비정형 파싱 전면 개편]: 1) 윈도우 파일 줄바꿈(\\r)으로 인해 헤딩 정규식 매칭이 누락되어 전체가 1개 청크로 묶이던 버그를 /\\r?\\n/ 및 \\r 제거로 해결하여 대상 문서 13개 청크 정상 분할 2) AI 응답에서 JSON 구문 파싱 실패 시 SyntaxError 크래시를 방어하고 Gemma 등 비정형 모델 복원 탑재 3) AI 미제공/실패 시 단순 300자 자르기가 아닌 본문 3줄 요약, 핵심 소제목/찬반 질문, 해시태그, SEO 키워드를 스마트 추출하여 완벽한 정형 데이터 적재 보장
// 🚨 @PATCH : **2026-09-16** — [CSP connect-src chrome-extension: 허용]: connect-src에 chrome-extension: 허용을 추가하여 확장 프로그램 연결 차단 방지
// 🚨 @PATCH : **2026-09-16** — [CSP connect-src http: http://localhost:* 포트 3100 허용]: connect-src에 http: 및 localhost 포트 전 범위 허용 보강
// 🚨 @PATCH : **2026-10-18** — [app:// 프로토콜 정적 HTML 및 에셋 .next-desktop 폴백 연동으로 404 방어]:
//             1) app:// 프로토콜 핸들러에서 frontend/out에 파일(editor.html 등)이 부재할 때 frontend/.next-desktop 경로를 자동 교차 탐색하여 404 에러 원천 해결
// 🚨 @PATCH : **2026-10-18** — [desktopInlineImages 누락/예외 시 file:readFromPath 크래시 방어 및 안전 폴백 구현]:
//             1) desktopInlineImages 모듈이 패키징 누락되거나 require 실패 시에도 예외를 잡고 원본 텍스트(rawContent)를 정상 반환하도록 안전 try-catch 가드 추가
//             2) package.json의 electron-builder files 목록에 desktopInlineImages.js를 명시하여 app.asar 빌드 시 항상 온전히 패키징되도록 동기화
// 🚨 @PATCH : **2026-09-16** — [데스크톱 외부 링크 및 비디오 링크 시스템 기본 브라우저 오픈 보장]: setWindowOpenHandler 및 will-navigate에서 mailto/tel 및 외부 URL을 shell.openExternal로 안정적으로 위임하고 MarkdownViewer/VideoCard에서 IPC system:openExternal 직접 호출 연동
// 🚨 @PATCH : **2026-09-16** — [데스크톱 폴더 삭제 재귀/강제(rmSync) 개편 & ENOTEMPTY/EPERM 해결]: file:delete 핸들러에서 하위 파일/폴더가 존재해도 fs.rmSync({ recursive: true, force: true })로 안전하고 깨끗하게 재귀 삭제 지원하여 빈 폴더만 삭제되던 제약 및 ENOTEMPTY/EPERM 오류 완전 해결
// 🚨 @PATCH : **2026-09-16** — [시스템 탐색기/Finder 연동 & 잘라내기 이동 & 외부 파일 감시 디바운스 강화]: system:openPath, system:showItemInFolder, file:move IPC 핸들러 신규 추가, file:watchWorkspace에 300ms 디바운스 및 awaitWriteFinish 적용하여 외부 작업폴더 변경 실시간 감지 무결성 확보
// 🚨 @PATCH : **2026-09-13** — [데스크탑 Mermaid '새 창으로 확대' 팝업 차단 오류 해결]: setWindowOpenHandler가 window.open()을 deny하여 Mermaid 확대 창이 열리지 않던 문제를 mermaid:open-window IPC 핸들러(BrowserWindow 직접 생성 + data:text/html loadURL)로 완전 대체; preload.js에 openMermaidWindow API 추가, MarkdownViewer.tsx에서 isDesktop 분기 적용
// 🚨 @PATCH : **2026-09-13** — [IPC 파일 읽기/쓰기 절대경로 및 file:/// 프로토콜 정규화]: file:readFromPath 및 file:save에서 file:/// 접두사 제거 및 decodeURIComponent 디코딩, path.resolve 정규화를 지원하여 외부 절대경로 파일 I/O 100% 보장
// 🚨 @PATCH : **2026-09-12** — [모든 AI 질의 표준 재시도 적용]: 지식 베이스 AI 문서 분석 fetch 호출 시 1회 실패 후 3초 대기 -> 2회 시도 후 3초 대기 -> 3회 시도 후 최종 실패 처리 규칙 적용
// 🚨 @PATCH : **2026-09-11** — [CSP connect-src data: blob: 스키마 추가] 클립보드 스크린샷 캡처 이미지 데이터 처리 및 fetch 시 CSP 위반 에러 방어
//             **2026-09-11** — [SQLite getDesktopKnowledgeDb 파일 잠금 누수 및 WAL 전환 락 경합 원천 방어] getDesktopKnowledgeDb에서 이미 wal 저널 모드인 경우 PRAGMA journal_mode=WAL 재실행을 건너뛰어 배타적 락 충돌을 방지하고, 오픈/초기화 실패 시 db.close()를 반드시 수행하여 좀비 파일 락 누수를 완벽 차단; init 핸들러에서 초기화 전 자동 스냅샷 백업 및 최신 백업 목록 반환 연동
//             **2026-09-11** — [지식 베이스 복원 시 안전 스냅샷 WAL 체크포인트 및 캐시 해제 순서 정상화] restore 핸들러에서 스냅샷 생성 전 기존 활성 DB의 wal_checkpoint(TRUNCATE) 및 DB close를 선행하여 WAL 누락 및 파일 잠금(database is locked) 충돌 방어
//             **2026-09-06** — [document_chunks chunk_text 스키마 마이그레이션 및 delete/detail 경로 정규화] document_chunks 테이블에 chunk_text TEXT 컬럼 및 ALTER TABLE 자동 마이그레이션 추가, delete/detail API에서 슬래시/역슬래시 및 파일명 접미사 매칭 폴백을 추가하여 데스크톱 지식 문서 해제 및 상세 열람 정합성 보장
//             **2026-09-06** — [데스크톱 지식 베이스 SQLite 로컬 라우팅 탑재] 데스크톱 앱 내 /api/knowledge/* 요청이 외부 실서버(onrivi.com)로 프록시되어 405/404 발생 및 데이터가 누락되던 문제를 해결하기 위해, Electron 메인 프로세스에서 app:// 프로토콜 핸들러 내에 로컬 SQLite DB({resourceFolder}/db/onrivi_knowledge.db) 직접 라우팅 엔진(handleDesktopKnowledgeApi)을 구현하여 탐색기 📗 뱃지, 지식 허브 대시보드(KUI-001), 큐/컬렉션 통계 및 상세 조회가 100% 로컬 독립 동작하도록 개편 | **2026-09-05** — 데스크톱 앱 내비게이션/새창 분기 가드 보강: SaaS 웹 전용 경로(/login, /dashboard, /signup, /pricing 등) 진입 시 Electron 윈도우 내부 로드 차단 및 외부 기본 브라우저 강제 오픈 처리, app:// 커스텀 프로토콜 핸들러 내 /login 및 /dashboard 방어 라우트 추가로 404 에러 원천 차단 | **2026-08-26** — 소스맵(.js.map) 등 없는 정적 자산 파일 요청 시 ENOENT 콘솔 트레이스 에러 노이즈를 방지하기 위해, app 프로토콜 핸들러 내에 fs.existsSync 예외 가드 추가 및 404 리턴 처리 | **2026-06-28** — 데스크톱 앱 내에서 에디터 외 일반 웹 경로(대시보드, 랜딩 등) 클릭 시 기존 에디터 화면을 덮어쓰지 않고 기본 웹 브라우저 새창으로 띄워 안전하게 분리하도록 내비게이션 라우팅 제어 패치; 데스크톱 패키징/실행 시 실서버 대신 100% 로컬 독립 서빙을 실현하기 위해 `file://` 프로토콜 기반의 빌드 아웃풋 파일(`frontend/out/editor.html`)을 불러오도록 로드 방식을 변경하는 패치; Monaco Editor 로더 CDN CSP 차단 문제 해결; Next.js 정적 빌드 시 `public/` 폴더 내용이 `out/` 폴더로 자동 복사되는 구조를 반영하여 `file:readFromPath` 핸들러 탐색 경로에 `frontend/out`을 최우선으로 추가 — 이로써 설치판에서 도움말(`help/00_시작하기.md`) 파일을 정상적으로 읽어오지 못하던 버그 수정
//             **2026-06-19** — PNG 및 EPUB 내보내기 시 외부 이미지/웹폰트 fetch CSP 차단 버그를 해결하기 위해 connect-src에 http: https: 추가 허용; Node.js net 모듈과 Electron net 모듈 충돌로 인한 net.fetch TypeError 해결 | **2026-06-20** — 딥링크(onriviauthor://activate) 파라미터 파싱 로직 보완하여 licenseKey와 paymentNo를 함께 추출 및 license.json 저장
// 🔗 @CALLS : loadURL, onrivi.com
// ====================================================================
const { app, BrowserWindow, session, ipcMain, dialog, protocol, net, screen } = require('electron');
require('./electron/inlineAI.cjs').registerInlineAI({ipcMain,app,safeStorage:require('electron').safeStorage});
const path = require('path');
const chokidar = require('chokidar');

const fs = require('fs');
const nodeNet = require('net'); // 빈 포트를 찾기 위한 네이티브 모듈 추가

// 🌐 [ 프로토콜 Privilege 등록 - app.ready 이전에 호출되어야 함 ]
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, bypassCSP: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  { scheme: 'media-local', privileges: { standard: true, bypassCSP: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  // 앱 문서는 CSP가 실제로 적용되어야 하므로 bypassCSP를 사용하지 않습니다.
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);


// 앱 이름 및 Taskbar 그룹 아이디 설정 (우클릭 메뉴 및 알림 이름 변경)
app.name = "Onrivi Author";
if (process.platform === 'win32') {
  app.setAppUserModelId("com.onrivi.author");
}

// 백엔드 구동 플래그 설정
process.env.IS_ELECTRON = 'true';
if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

let mainWindow;
let activePort = 4000; // 기본 백엔드 포트
let filePathToOpen = null; // 윈도우 파일 연결(더블클릭)로 전달된 .md 경로 임시 저장

// 🔒 [ 중복 실행 방지 (Single Instance Lock) 설정 ]
const gotTheLock = app.requestSingleInstanceLock();

// 💡 onriviauthor:// 커스텀 프로토콜 등록 (윈도우 파일 연결 + URL 프로토콜)
if (process.platform === 'win32') {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('onriviauthor', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('onriviauthor');
  }
}

if (!gotTheLock) {
  // 이미 실행 중인 앱이 있으면 이 실행 프로세스를 즉각 폭파 종료
  app.quit();
} else {
  // 사용자가 이미 앱이 켜진 상태에서 또 exe를 더블 클릭하면 기존 창을 포커싱 + 파일 연결 경로 전달
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // 1. commandLine에서 .md 파일 경로 추출하여 프론트엔드로 전달
      const fileArg = commandLine.find(arg => {
        const lower = arg.toLowerCase();
        return lower.endsWith('.md') || lower.endsWith('.markdown');
      });
      if (fileArg && fs.existsSync(fileArg)) {
        mainWindow.webContents.send('open-external-md', fileArg);
        return;
      }
      // 2. onriviauthor:// 프로토콜 URL 처리
      const protocolArg = commandLine.find(arg =>
        arg.toLowerCase().startsWith('onriviauthor://')
      );
      if (protocolArg) {
        try {
          const url = new URL(protocolArg);
          if (url.host === 'activate') {
            const verifyKey = url.searchParams.get('key');
            const userId = url.searchParams.get('user');
            const licenseKey = url.searchParams.get('licenseKey');
            const paymentNo = url.searchParams.get('paymentNo');
            if (verifyKey) {
              const userDataPath = app.getPath('userData');
              const licenseJsonPath = path.join(userDataPath, 'license.json');
              let existingData = {};
              try {
                if (fs.existsSync(licenseJsonPath)) {
                  existingData = JSON.parse(fs.readFileSync(licenseJsonPath, 'utf-8'));
                }
              } catch {}
              
              const updatedData = {
                ...existingData,
                verifyKey,
                userId: userId || existingData.userId || '',
                licenseKey: licenseKey || existingData.licenseKey || '',
                paymentNo: paymentNo || existingData.paymentNo || ''
              };
              fs.writeFileSync(licenseJsonPath, JSON.stringify(updatedData, null, 2), 'utf-8');
              
              // 렌더러 프로세스에 이벤트 전송
              mainWindow.webContents.send('license-activated', updatedData);
            }
          } else if (url.host === 'gdrive-auth' || url.pathname.includes('gdrive-auth')) {
            const token = url.searchParams.get('token') || url.searchParams.get('access_token');
            const expiresIn = url.searchParams.get('expires_in') || '3600';
            if (token && typeof globalResolveGDriveAuth === 'function') {
              globalResolveGDriveAuth({ access_token: token, expires_in: expiresIn });
            }
          } else {
            const filePath = url.searchParams.get('path') || decodeURIComponent(url.pathname.replace(/^\//, ''));
            if (filePath && fs.existsSync(filePath)) {
              mainWindow.webContents.send('open-external-md', filePath);
            }
          }
        } catch {}
      }
    }
  });
}

// macOS: 파일을 앱 아이콘에 드래그&드롭하거나 더블클릭
app.on('open-file', (event, path) => {
  event.preventDefault();
  if (mainWindow && (path.toLowerCase().endsWith('.md') || path.toLowerCase().endsWith('.markdown'))) {
    mainWindow.webContents.send('open-external-md', path);
  }
});

// 포트 충돌을 막기 위한 동적 포트 탐색 헬퍼 (의존성 없음, 100% 안전)
function getFreePort(startPort = 4000) {
  return new Promise((resolve) => {
    const server = nodeNet.createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(getFreePort(startPort + 1));
    });
  });
}

// 최초 실행 시 커맨드라인 인수에 .md 파일 또는 onriviauthor:// 프로토콜 URL이 있는지 검사
function checkFileArgument() {
  const fileArg = process.argv.find(arg => {
    const lower = arg.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.markdown');
  });
  if (fileArg && fs.existsSync(fileArg)) {
    filePathToOpen = fileArg;
    return;
  }
  const protocolArg = process.argv.find(arg =>
    arg.toLowerCase().startsWith('onriviauthor://')
  );
  if (protocolArg) {
    try {
      const url = new URL(protocolArg);
      if (url.host === 'activate') {
        const verifyKey = url.searchParams.get('key');
        const userId = url.searchParams.get('user');
        const licenseKey = url.searchParams.get('licenseKey');
        const paymentNo = url.searchParams.get('paymentNo');
        if (verifyKey) {
          const userDataPath = app.getPath('userData');
          const licenseJsonPath = path.join(userDataPath, 'license.json');
          let existingData = {};
          try {
            if (fs.existsSync(licenseJsonPath)) {
              existingData = JSON.parse(fs.readFileSync(licenseJsonPath, 'utf-8'));
            }
          } catch {}
          
          const updatedData = {
            ...existingData,
            verifyKey,
            userId: userId || existingData.userId || '',
            licenseKey: licenseKey || existingData.licenseKey || '',
            paymentNo: paymentNo || existingData.paymentNo || ''
          };
          fs.writeFileSync(licenseJsonPath, JSON.stringify(updatedData, null, 2), 'utf-8');
        }
      } else {
        filePathToOpen = url.searchParams.get('path') || decodeURIComponent(url.pathname.replace(/^\//, ''));
      }
    } catch {}
  }
}

function createWindow(port) {
  // 🧹 [ 일렉트론 Chromium 캐시 강제 소탕 (로컬 스토리지는 유지) ]
  try {
    session.defaultSession.clearCache().catch(() => {});
  } catch (e) {
    console.error("캐시 소탕 오류:", e.message);
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, screenWidth),
    height: Math.min(900, screenHeight),
    title: "온리비 어서",
    icon: path.join(__dirname, 'frontend/public/icon_onriveauther.png'),
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true,
         preload: path.join(__dirname, 'preload.js'),
         // renderer의 교차 출처 보호를 유지합니다. 로컬 미디어는 등록된 media
         // 프로토콜을 통해 제공하므로 webSecurity를 끌 필요가 없습니다.
         webSecurity: true,
         allowRunningInsecureContent: false,
       },
    // Windows 11 스타일의 깔끔한 프레임 디자인
    titleBarStyle: 'default',
    autoHideMenuBar: true, // 메뉴 바 자동 숨김으로 몰입도 극대화
  });

  // 🌐 [ 외부 링크 및 일반 웹 페이지 클릭 시 기본 웹 브라우저 새창으로 오픈하는 설정 ]
  // 1) target="_blank" 등으로 새 창을 띄우려는 시도를 가로채 시스템 브라우저/플레이어로 실행
  const isInternalUrl = (urlStr) => {
    try {
      const parsed = new URL(urlStr);
      const pathname = parsed.pathname.toLowerCase();
      // login, dashboard, signup, pricing, forgot-password 등 SaaS 웹 전용 경로는 일렉트론 내부 서빙 대상이 아님
      if (pathname.includes('/login') || pathname.includes('/dashboard') || pathname.includes('/signup') || pathname.includes('/pricing') || pathname.includes('/forgot-password') || pathname.includes('/reset-password')) {
        return false;
      }
      return urlStr.startsWith('file://') || 
             urlStr.startsWith('app://') || 
             pathname.includes('/editor') || 
             pathname.includes('/auth/callback');
    } catch {
      return false;
    }
  };

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { shell } = require('electron');

    if (url.startsWith('media://local/serve')) {
      const parsedUrl = new URL(url);
      const filePath = parsedUrl.searchParams.get('url');
      if (filePath) {
        shell.openPath(decodeURIComponent(filePath));
      }
      return { action: 'deny' };
    }

    const isInternal = isInternalUrl(url);
    if (!isInternal) {
      if (url.startsWith('app://')) {
        const parsed = new URL(url);
        shell.openExternal(`https://onrivi.com${parsed.pathname}${parsed.search}`);
      } else if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        shell.openExternal(url);
      }
    }
    return { action: 'deny' }; // 일렉트론 내부에서 새 창이 뜨는 것은 원천 차단
  });

  // 2) 내비게이션 인터셉터: 대시보드, 랜딩, 로그인 등 에디터 외 경로 클릭 시 외부 웹 브라우저 새창으로 강제 튕김 우회
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isInternal = isInternalUrl(url);

    if (isInternal) {
      return; // 내부 서빙 허용
    }
    
    // 에디터 화면 외(로그인, 대시보드, 랜딩, 요금제 등)의 웹 주소로의 창 이동은 가로채 시스템 기본 브라우저로 띄웁니다.
    event.preventDefault();

    // 🛡️ [이미지/미디어 드래그 앤 드롭 내비게이션 외부 브라우저 팝업 원천 차단]
    // 웹 브라우저나 구글 검색에서 이미지를 끌어다 놓을 때 브라우저 기본 동작으로 발생하는
    // 이미지 URL 이동을 가로채어 시스템 기본 브라우저(Chrome 등)에 엉뚱한 새 창이 뜨는 현상을 100% 차단합니다.
    if (
      /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico|mp4|webm)(\?.*)?$/i.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('/images?') ||
      url.includes('imgres?') ||
      url.startsWith('file:///')
    ) {
      console.warn('[main.js] Drag-drop navigation blocked from opening external browser window:', url);
      return;
    }

    const { shell } = require('electron');
    if (url.startsWith('app://')) {
      const parsed = new URL(url);
      shell.openExternal(`https://onrivi.com${parsed.pathname}${parsed.search}`);
    } else if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url);
    }
  });

  // 🛡️ [ Content-Security-Policy 설정 ]
  // Monaco Editor가 eval()과 blob: 워커를 사용하므로 필요한 권한만 허용
  const cspDirectives = [
    "default-src 'self' app:",
    // Monaco와 Mermaid는 로컬 정적 스크립트 태그로 로드합니다. wasm-unsafe-eval을
    // 허용하여 WebAssembly 모듈 인스턴스화가 CSP에 의해 차단되지 않도록 보호합니다.
    "script-src 'self' app: 'unsafe-inline' 'wasm-unsafe-eval' https://maps.gstatic.com https://maps.googleapis.com https://*.gstatic.com https://cdn.jsdelivr.net https://accounts.google.com",
    "worker-src 'self' app: blob:",
    "style-src 'self' app: 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' app: data: blob: http: https: file: media: https://*.googleusercontent.com https://*.gstatic.com",
    "font-src 'self' app: data: https://fonts.gstatic.com https://*.gstatic.com https://cdn.jsdelivr.net",
    "connect-src 'self' app: data: blob: ws: wss: https: http: chrome-extension: http://localhost:* http://127.0.0.1:* http://localhost:3100 http://localhost:3000 http://localhost:4000 http://localhost:5000 http://localhost:11434 http://127.0.0.1:3100 http://127.0.0.1:3000 http://127.0.0.1:4000 http://127.0.0.1:5000 media: media-local: https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://onrivi.com https://cdn.jsdelivr.net https://maps.googleapis.com https://accounts.google.com https://www.googleapis.com",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://maps.google.com https://www.google.com https://accounts.google.com",
    "media-src 'self' app: media: https:"
  ];
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // 🛡️ 외부 사이트(iframe 내 구글 지도, 유튜브 등)의 응답에는 앱 전용 CSP를 강제 주입하지 않고 자체 보안 정책을 보존합니다.
    const url = (details.url || '').toLowerCase();
    const isAppOrigin = url.startsWith('app://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('file://');
    if (!isAppOrigin || url.includes('google.com') || url.includes('youtube.com')) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives.join('; ')]
      }
    });
  });

  // 프로덕션 빌드(패키징 완료)이거나 NO_SERVER 환경변수가 활성화된 경우 로컬 빌드 정적 HTML 로드
  if (app.isPackaged || process.env.NO_SERVER === 'true') {
    // Next.js App Router 정적 빌드는 file:// 프로토콜에서 동적 chunk 로드에 404를 발생시키므로 app:// 커스텀 프로토콜을 사용합니다.
    mainWindow.loadURL('app://-/editor.html?env=desktop');
  } else {
    mainWindow.loadURL('http://localhost:3100/editor?env=desktop');
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// ====================================================================
// 🧠 [OMD-MAIN-knowledge-0001] 데스크톱 전용 지식 베이스 SQLite 엔진 및 로컬 API 핸들러
// 🎯 @KICK  : 데스크톱 환경에서 /api/knowledge/* 호출 시 외부 실서버 대신 로컬 리소스 폴더({resourceFolder}/db/onrivi_knowledge.db)를 직접 조회/갱신
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(코드값 대문자 통일), Rule 7(SQLite 트랜잭션 무결성), 동적 리소스 폴더(하드코딩 금지)
// 🚨 @PATCH : **2026-09-06** — [실제 리소스 폴더 드라이브 자동 순회 탐색] resolveSafeResourceFolder에서 'Onrivi_Asset' 또는 'C:\Onrivi_Asset' 유입 시 실제 D:\, C:\, E:\ 드라이브를 순회하여 onrivi_knowledge.db가 존재하는 실제 드라이브를 찾아 연결 — 데스크톱 탐색기 📗 지식문서 표시 정상화
//             **2026-09-06** — [AES 암호화 문자열 원천 방어] resolveSafeResourceFolder에서 로컬스토리지 AES 암호문(U2FsdGVkX1...)이 폴더명으로 유입 시 D:\U2FsdGVkX1... 등 엉뚱한 폴더와 가짜 DB 생성을 원천 방어하도록 Onrivi_Asset 표준 폴더로 강제 정규화
// ====================================================================

function resolveSafeResourceFolder(folder) {
  let clean = (folder && typeof folder === 'string' ? folder.trim() : '') || 'Onrivi_Asset';

  // 🛡️ [AES 암호화 문자열 원천 방어] 로컬스토리지 AES 암호문(U2FsdGVkX1...)이 유입된 경우 기본값 치환
  if (clean.startsWith('U2FsdGVkX1') || clean === '') {
    clean = 'Onrivi_Asset';
  }

  // 1) 이미 절대 경로인 경우: 실제 존재하는지 확인 후, 만약 없다면 다른 드라이브 확인
  if (path.isAbsolute(clean)) {
    if (fs.existsSync(clean)) return clean;
    const baseName = path.basename(clean);
    const candidateDrives = ['D:\\', 'C:\\', 'E:\\', 'F:\\'];
    for (const drive of candidateDrives) {
      const candidate = path.join(drive, baseName);
      if (fs.existsSync(path.join(candidate, 'db', 'onrivi_knowledge.db')) || fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return clean;
  }

  // 2) 상대 경로(예: 'Onrivi_Asset')인 경우: 실제 onrivi_knowledge.db 또는 폴더가 존재하는 드라이브 우선 탐색
  const candidateDrives = ['D:\\', 'C:\\', 'E:\\', 'F:\\'];
  for (const drive of candidateDrives) {
    const candidate = path.join(drive, clean);
    if (fs.existsSync(path.join(candidate, 'db', 'onrivi_knowledge.db')) || fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const cwd = process.cwd();
  const rootDrive = (cwd && path.parse(cwd).root) || 'C:\\';
  return path.join(rootDrive, clean);
}

// 🌐 [로컬 이미지 경로(/media/, media/, 파일명 등) 지능형 통합 탐색 헬퍼]
function findLocalImageFile(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  let cleanPath = rawPath.normalize('NFC').trim().replace(/^<|>$/g, '');
  const qIdx = cleanPath.indexOf('?');
  if (qIdx !== -1) cleanPath = cleanPath.substring(0, qIdx);
  const hIdx = cleanPath.indexOf('#');
  if (hIdx !== -1) cleanPath = cleanPath.substring(0, hIdx);
  try { cleanPath = decodeURIComponent(cleanPath); } catch {}

  if (process.platform === 'win32' && cleanPath.startsWith('/') && /^\/[A-Za-z]:/.test(cleanPath)) {
    cleanPath = cleanPath.slice(1);
  }
  let normalized = path.normalize(cleanPath);
  try {
    if (fs.existsSync(normalized) && !fs.statSync(normalized).isDirectory()) return normalized;
  } catch {}

  // 1) 상대경로 및 media 폴더 교차 탐색
  const dir = path.dirname(normalized);
  const base = path.basename(normalized);
  const inMedia = path.join(dir, 'media', base);
  try {
    if (fs.existsSync(inMedia) && !fs.statSync(inMedia).isDirectory()) return inMedia;
  } catch {}
  const outMedia = normalized.replace(/[/\\]media[/\\]/, path.sep);
  try {
    if (fs.existsSync(outMedia) && !fs.statSync(outMedia).isDirectory()) return outMedia;
  } catch {}

  // 2) 사용자 리소스 폴더(D:\Onrivi_Asset 등) 기준 탐색
  try {
    const safeRes = resolveSafeResourceFolder();
    if (safeRes && fs.existsSync(safeRes)) {
      const stripped = normalized.replace(/^[A-Za-z]:[\\/]/, '').replace(/^\.?[\/\\]+/, '');
      const candidates = [
        path.join(safeRes, stripped),
        path.join(safeRes, 'media', stripped),
        path.join(safeRes, 'media', base),
        path.join(safeRes, base),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) return cand;
      }
    }
  } catch {}

  // 3) 활성 워크스페이스(Workspace) 기준 탐색
  try {
    let settings = {};
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    const wsPath = currentActiveWorkspacePath || settings.workspacePath || settings.workspaceFolder || settings.localWorkspaceFolder || process.cwd();
    if (wsPath && fs.existsSync(wsPath)) {
      const stripped = normalized.replace(/^[A-Za-z]:[\\/]/, '').replace(/^\.?[/\\]+/, '');
      const safeRes = resolveSafeResourceFolder();
      const relFromRes = (safeRes && normalized.toLowerCase().startsWith(safeRes.toLowerCase()))
        ? path.relative(safeRes, normalized)
        : '';
      const wsCandidates = [
        relFromRes ? path.join(wsPath, relFromRes) : null,
        relFromRes ? path.join(wsPath, 'images', relFromRes) : null,
        path.join(wsPath, stripped),
        path.join(wsPath, 'images', stripped),
        path.join(wsPath, 'media', stripped),
        path.join(wsPath, base),
        path.join(wsPath, 'images', base),
        path.join(wsPath, 'media', base),
      ];
      for (const cand of wsCandidates) {
        if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) return cand;
      }
    }
  } catch {}

  // 4) frontend/out 및 frontend/public 정적 에셋 폴백
  try {
    const fallbackOut = path.join(__dirname, 'frontend/out', base);
    if (fs.existsSync(fallbackOut) && !fs.statSync(fallbackOut).isDirectory()) return fallbackOut;
    const fallbackPub = path.join(__dirname, 'frontend/public', base);
    if (fs.existsSync(fallbackPub) && !fs.statSync(fallbackPub).isDirectory()) return fallbackPub;
  } catch {}

  return null;
}

function getKnowledgeDbPath(resourceFolder) {
  const safe = resolveSafeResourceFolder(resourceFolder);
  if (!safe) return null;
  return path.join(safe, 'db', 'onrivi_knowledge.db');
}

function applyDesktopKnowledgeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#06C755',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      collection_id TEXT,
      file_path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      modified_at TEXT NOT NULL,
      summary TEXT,
      key_points TEXT,
      document_type TEXT DEFAULT 'other',
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK(status IN ('REGISTERED', 'INDEXING', 'READY', 'OUTDATED', 'DISABLED', 'ERROR')),
      error_message TEXT,
      analysis_version INTEGER NOT NULL DEFAULT 1,
      analyzer_model TEXT,
      analyzed_at TEXT,
      indexed_at TEXT,
      FOREIGN KEY(collection_id) REFERENCES knowledge_collections(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS document_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      source TEXT DEFAULT 'AI',
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tags_doc ON document_tags(document_id);
    CREATE INDEX IF NOT EXISTS idx_tags_name_score ON document_tags(tag_name, score DESC);
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      heading_title TEXT,
      heading_level INTEGER,
      heading_path TEXT,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      chunk_summary TEXT,
      keywords TEXT,
      chunk_text TEXT,
      chunk_type TEXT DEFAULT 'section',
      FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
      chunk_id UNINDEXED,
      document_id UNINDEXED,
      heading_title,
      keywords,
      chunk_text
    );
    CREATE TABLE IF NOT EXISTS knowledge_jobs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      title TEXT,
      job_type TEXT NOT NULL CHECK(job_type IN ('INDEX', 'REINDEX', 'DELETE')),
      target_hash TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
      current_step TEXT DEFAULT 'QUEUED',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      retry_after TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      error_log TEXT
    );
  `);

  try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;"); } catch {}
  try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_type TEXT DEFAULT 'section';"); } catch {}
  try { db.exec("UPDATE document_chunks SET chunk_text = (SELECT f.chunk_text FROM document_chunks_fts f WHERE f.chunk_id = document_chunks.id) WHERE chunk_text IS NULL OR chunk_text = '';"); } catch {}
}

const desktopDbCache = new Map();

function getDesktopKnowledgeDb(resourceFolder, autoCreate = false) {
  const dbPath = getKnowledgeDbPath(resourceFolder);
  if (!dbPath) return null;
  if (!autoCreate && !fs.existsSync(dbPath)) return null;

  if (desktopDbCache.has(dbPath)) {
    const cached = desktopDbCache.get(dbPath);
    try {
      cached.prepare('SELECT 1').get();
      return cached;
    } catch {
      try { cached.close(); } catch {}
      desktopDbCache.delete(dbPath);
    }
  }

  const dbDir = path.dirname(dbPath);
  if (autoCreate && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const { DatabaseSync } = require('node:sqlite');
  let db = null;
  try {
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout = 10000;');

    // 🚨 저널 모드 설정: 이미 wal이면 배타적 락을 요구하는 PRAGMA journal_mode = WAL; 재실행을 건너뜀 (잠금 충돌 원천 방어)
    try {
      const modeRow = db.prepare('PRAGMA journal_mode;').get();
      if (modeRow && modeRow.journal_mode !== 'wal') {
        db.exec('PRAGMA journal_mode = WAL;');
      }
    } catch (walErr) {
      console.warn('[getDesktopKnowledgeDb] journal_mode WAL skipped:', walErr?.message);
    }

    try { db.exec('PRAGMA synchronous = NORMAL;'); } catch {}
    try { db.exec('PRAGMA foreign_keys = ON;'); } catch {}

    applyDesktopKnowledgeSchema(db);
    desktopDbCache.set(dbPath, db);
    return db;
  } catch (err) {
    console.error('[getDesktopKnowledgeDb] Failed to open/init database:', err?.message);
    if (db) {
      try { db.close(); } catch {}
    }
    throw err;
  }
}

function decodeFileBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';
  let i = 0;
  let isUtf8 = true;
  while (i < buffer.length) {
    if (buffer[i] <= 0x7f) {
      i += 1;
      continue;
    }
    if (buffer[i] >= 0xc2 && buffer[i] <= 0xdf) {
      if (i + 1 < buffer.length && buffer[i + 1] >= 0x80 && buffer[i + 1] <= 0xbf) {
        i += 2;
        continue;
      }
    } else if (buffer[i] >= 0xe0 && buffer[i] <= 0xef) {
      if (
        i + 2 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf
      ) {
        i += 3;
        continue;
      }
    } else if (buffer[i] >= 0xf0 && buffer[i] <= 0xf4) {
      if (
        i + 3 < buffer.length &&
        buffer[i + 1] >= 0x80 &&
        buffer[i + 1] <= 0xbf &&
        buffer[i + 2] >= 0x80 &&
        buffer[i + 2] <= 0xbf &&
        buffer[i + 3] >= 0x80 &&
        buffer[i + 3] <= 0xbf
      ) {
        i += 4;
        continue;
      }
    }
    isUtf8 = false;
    break;
  }

  if (isUtf8) {
    return buffer.toString('utf8');
  }

  try {
    const decoder = new TextDecoder('euc-kr');
    return decoder.decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

const MAX_DESKTOP_SECTION_LINES = 150;

function chunkMarkdownByHeadingsHelper(docId, markdownText, documentTitle = '') {
  if (!markdownText || !markdownText.trim()) return [];
  const lines = markdownText.split(/\r?\n/);
  const totalLines = lines.length;
  const boundaries = [];
  const headingStack = [];

  const cleanDocTitle = (documentTitle || '').trim().replace(/\.md$/i, '');
  const isMetaOnly = markdownText.trimStart().startsWith('---');
  const initialTitle = cleanDocTitle 
    ? (isMetaOnly ? `[${cleanDocTitle}] 서두 및 메타정보` : `[${cleanDocTitle}] 서두 및 개요`)
    : (isMetaOnly ? '서두 및 메타정보' : '개요 (서론)');
  const initialPath = cleanDocTitle
    ? `${cleanDocTitle} > ${isMetaOnly ? '서두 및 메타정보' : '서두'}`
    : (isMetaOnly ? '서두 및 메타정보' : '개요');

  let currentSection = {
    headingTitle: initialTitle,
    headingLevel: 0,
    headingPath: initialPath,
    startLine: 1,
  };

  const headingRegex = /^(#{1,6})\s+(.+)$/;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].replace(/\r$/, '');
    const match = line.match(headingRegex);

    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      if (i > 0 && i >= currentSection.startLine) {
        boundaries.push({
          ...currentSection,
          endLine: i,
        });
      }

      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, title });

      const rawPath = headingStack.map(h => h.title).join(' > ');
      const headingPath = cleanDocTitle ? `${cleanDocTitle} > ${rawPath}` : rawPath;

      currentSection = {
        headingTitle: title,
        headingLevel: level,
        headingPath,
        startLine: i + 1,
      };
    }
  }

  boundaries.push({
    ...currentSection,
    endLine: totalLines,
  });

  const rawChunks = [];
  let chunkCounter = 0;

  for (const b of boundaries) {
    const sectionLines = lines.slice(b.startLine - 1, b.endLine);
    const text = sectionLines.join('\n').trim();

    if (!text) continue;
    if (isMetaOrAuxiliaryChunk(b.headingTitle, text, b.startLine, b.endLine)) {
      continue;
    }

    const lineCount = b.endLine - b.startLine + 1;

    if (lineCount <= MAX_DESKTOP_SECTION_LINES) {
      rawChunks.push({
        chunkIndex: chunkCounter++,
        headingTitle: b.headingTitle,
        headingLevel: b.headingLevel,
        headingPath: b.headingPath,
        startLine: b.startLine,
        endLine: b.endLine,
        chunkText: text,
      });
    } else {
      let subStartLine = b.startLine;
      let currentSubLines = [];

      for (let i = 0; i < sectionLines.length; i++) {
        const line = sectionLines[i];
        currentSubLines.push(line);

        if (line.trim() === '' && currentSubLines.length >= 40) {
          const subEndLine = b.startLine + i;
          const subText = currentSubLines.join('\n').trim();
          if (subText) {
            rawChunks.push({
              chunkIndex: chunkCounter++,
              headingTitle: `${b.headingTitle} (Part ${rawChunks.length + 1})`,
              headingLevel: b.headingLevel,
              headingPath: b.headingPath,
              startLine: subStartLine,
              endLine: subEndLine,
              chunkText: subText,
            });
          }
          currentSubLines = [];
          subStartLine = subEndLine + 1;
        }
      }

      if (currentSubLines.length > 0) {
        const subText = currentSubLines.join('\n').trim();
        if (subText) {
          rawChunks.push({
            chunkIndex: chunkCounter++,
            headingTitle: rawChunks.length > 0 ? `${b.headingTitle} (Part ${rawChunks.length + 1})` : b.headingTitle,
            headingLevel: b.headingLevel,
            headingPath: b.headingPath,
            startLine: subStartLine,
            endLine: b.endLine,
            chunkText: subText,
          });
        }
      }
    }
  }

  return rawChunks.map((chunk, idx) => {
    const cLines = chunk.chunkText.split('\n');
    const summary = cLines.slice(0, 3).join(' ').slice(0, 200).trim();
    const keywords = [chunk.headingTitle].filter(Boolean);

    return {
      id: `${docId}_chunk_${idx}`,
      documentId: docId,
      chunkIndex: idx,
      headingTitle: chunk.headingTitle,
      headingLevel: chunk.headingLevel,
      headingPath: chunk.headingPath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      chunkSummary: summary,
      keywords,
      chunkText: chunk.chunkText,
    };
  });
}

/**
 * 메타데이터, 서식 설정(Frontmatter), SEO 키워드, 해시태그, 이미지 프롬프트 등
 * 검색 지식 가치가 없는 부속 청크인지 여부를 판별합니다.
 */
function isMetaOrAuxiliaryChunk(heading, text, startLine, endLine) {
  const h = (heading || '').toLowerCase();
  const t = (text || '').trim();

  // 1. 프론트매터 및 CSS 서식설정
  if (t.startsWith('---') && (Number(startLine) <= 2 || t.includes('css_profile') || t.includes('#서식설정') || t.includes('서식설정') || t.includes('title:') || t.includes('layout:'))) {
    return true;
  }

  // 2. 메타/부속 헤딩 키워드
  const metaKeywords = [
    '메타정보', '메타영역', '서두 및 메타', '서식설정', '문서 서식',
    'seo 키워드', 'seo키워드', '해시태그', '제목 후보', '제목후보',
    '이미지 생성', '1:1 이미지', '이미지 프롬프트'
  ];
  if (metaKeywords.some(mk => h.includes(mk))) {
    return true;
  }

  // 3. 무의미한 빈 헤딩 또는 플레이스홀더
  if (/^[0-9.]*\s*본문$/.test(h) && t.length < 50) return true;
  if (/^법률\s*제\s*호$/.test(h) && t.length < 50) return true;

  // 4. 문서 최상단 단순 제목/구분선 헤더 (실질 본문 30자 미만)
  if (Number(startLine) <= 3 && Number(endLine) <= 6) {
    const stripped = t.replace(/^[#\s\-*_>]+/gm, '').trim();
    if (stripped.length < 30) return true;
  }

  return false;
}

/**
 * 텍스트 내부에서 문자열 리터럴과 이스케이프(\")를 고려하여
 * 균형 잡힌 최상위 중괄호 '{' ~ '}' 블록들을 모두 추출합니다.
 */
function extractBalancedJsonBlocks(text) {
  const blocks = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          blocks.push(text.substring(startIndex, i + 1));
          startIndex = -1;
        }
      }
    }
  }
  return blocks;
}

/**
 * LLM이 출력한 불완전하거나 비표준인 JSON 문자열을 표준 JSON 문법으로 보정합니다.
 */
function repairJsonString(raw) {
  let s = (raw || '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9-]*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
  }
  s = s.replace(/\r\n/g, '\n');
  s = s
    .replace(/:\s*string\b/gi, ': "string"')
    .replace(/:\s*number\b/gi, ': 80')
    .replace(/:\s*boolean\b/gi, ': true');
  s = s.replace(/,\s*([\]}])/g, '$1');
  if (!s.includes('"') && s.includes("'")) {
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  }
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // 문자열 리터럴 내부의 제어문자(개행, 탭) 및 미이스케이프 내부 큰따옴표 자동 수리
  let inString = false;
  let escape = false;
  let fixed = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      fixed += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      fixed += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        fixed += ch;
      } else {
        // 다음 비공백 문자 탐색으로 종결 따옴표 여부 확인
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        const nextChar = s[j];
        if (j >= s.length || nextChar === ',' || nextChar === ':' || nextChar === '}' || nextChar === ']') {
          inString = false;
          fixed += ch;
        } else {
          // 문자열 내부 미이스케이프 따옴표 이스케이프 처리
          fixed += '\\"';
        }
      }
      continue;
    }
    if (inString) {
      if (ch === '\n') {
        fixed += '\\n';
        continue;
      }
      if (ch === '\r') continue;
      if (ch === '\t') {
        fixed += '\\t';
        continue;
      }
    }
    fixed += ch;
  }

  return fixed;
}

/**
 * JSON 파싱이 전면 실패한 경우에도 AI 텍스트에서 summary, key_points, tags, search_terms를 정규식으로 안전하게 추출합니다.
 */
function extractLlmJsonFieldsFallback(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const result = {};

  // 1. summary 추출
  const summaryMatch = raw.match(/["']summary["']\s*:\s*"([^"]+)"/i) ||
                       raw.match(/["']summary["']\s*:\s*"([\s\S]*?)(?:"\s*,\s*"\w+"|\s*"\s*[\r\n])/i);
  if (summaryMatch && summaryMatch[1]) {
    result.summary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  }

  // 2. key_points 추출
  const kpBlockMatch = raw.match(/["']key_points["']\s*:\s*\[([\s\S]*?)\]/i);
  if (kpBlockMatch && kpBlockMatch[1]) {
    const lines = [...kpBlockMatch[1].matchAll(/"([^"\r\n]+)"/g)].map(m => m[1].replace(/\\"/g, '"').trim()).filter(Boolean);
    if (lines.length > 0) result.key_points = lines;
  }

  // 3. tags 추출
  const tagsBlockMatch = raw.match(/["']tags["']\s*:\s*\[([\s\S]*?)\]/i);
  if (tagsBlockMatch && tagsBlockMatch[1]) {
    const tagMatches = [...tagsBlockMatch[1].matchAll(/\{[^{}]*?["']name["']\s*:\s*["']([^"']+)["'][^{}]*?\}/gi)];
    if (tagMatches.length > 0) {
      result.tags = tagMatches.map(m => {
        const name = m[1].trim();
        const scoreMatch = m[0].match(/["']score["']\s*:\s*([0-9]+)/i);
        return { name, score: scoreMatch ? Number(scoreMatch[1]) : 85 };
      });
    }
  }

  // 4. search_terms 추출
  const stBlockMatch = raw.match(/["']search_terms["']\s*:\s*\[([\s\S]*?)\]/i);
  if (stBlockMatch && stBlockMatch[1]) {
    const terms = [...stBlockMatch[1].matchAll(/"([^"\r\n]+)"/g)].map(m => m[1].trim()).filter(Boolean);
    if (terms.length > 0) result.search_terms = terms;
  }

  if (result.summary || (result.key_points && result.key_points.length > 0)) {
    return result;
  }
  return null;
}

/**
 * LLM 응답 텍스트로부터 최선의 JSON 객체를 파싱 및 복원하여 반환합니다.
 */
function parseAndRepairLlmJson(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const trimmed = rawText.trim();
  try { return JSON.parse(trimmed); } catch (_) {}

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const inside = codeBlockMatch[1].trim();
    try { return JSON.parse(inside); } catch (_) {}
    try { return JSON.parse(repairJsonString(inside)); } catch (_) {}
  }

  const blocks = extractBalancedJsonBlocks(trimmed);
  if (blocks.length > 0) {
    if (blocks.length === 1) {
      try { return JSON.parse(blocks[0]); } catch (_) {}
      try { return JSON.parse(repairJsonString(blocks[0])); } catch (_) {}
    } else {
      const merged = {};
      let parseSuccessCount = 0;
      for (const block of blocks) {
        let blockParsed = null;
        try { blockParsed = JSON.parse(block); } catch (_) {
          try { blockParsed = JSON.parse(repairJsonString(block)); } catch (_) {}
        }
        if (blockParsed && typeof blockParsed === 'object' && !Array.isArray(blockParsed)) {
          Object.assign(merged, blockParsed);
          parseSuccessCount++;
        }
      }
      if (parseSuccessCount > 0) return merged;
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.substring(firstBrace, lastBrace + 1);
    try { return JSON.parse(repairJsonString(slice)); } catch (_) {}
  }

  // 5단계: 정규식 기반 주요 필드 복원 폴백
  return extractLlmJsonFieldsFallback(trimmed);
}

async function handleDesktopKnowledgeApi(request, pathname, url) {
  try {
    let body = {};
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const text = await request.text();
        if (text) body = JSON.parse(text);
      } catch (err) {
        console.warn('[DesktopKnowledgeApi] Body parse warning:', err.message);
      }
    }

    const subPath = pathname.replace(/^api\/knowledge\/?/, '').split('?')[0].replace(/\/$/, '');
    const resourceFolder = body.resourceFolder || url.searchParams.get('resourceFolder');

    // 1. 등록 지식 문서 목록 조회 (list)
    if (subPath === 'list') {
      if (!resourceFolder || !resourceFolder.trim()) {
        return Response.json(
          { ok: false, code: 'NO_RESOURCE_FOLDER', message: '공통 자원(리소스) 폴더가 설정되지 않았습니다.', documents: [] },
          { status: 400 }
        );
      }
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) {
        return Response.json({ ok: true, documents: [] });
      }

      const docs = db.prepare(`
        SELECT 
          d.id,
          d.file_path,
          d.title,
          d.file_hash,
          d.file_size,
          d.modified_at,
          d.summary,
          d.key_points,
          d.document_type,
          d.priority,
          d.status,
          d.error_message,
          d.analyzer_model,
          d.analyzed_at,
          d.indexed_at,
          (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) as chunk_count
        FROM knowledge_documents d
        ORDER BY d.indexed_at DESC
      `).all();

      const getTagsStmt = db.prepare('SELECT tag_name, score FROM document_tags WHERE document_id = ? ORDER BY score DESC');
      const documents = docs.map(doc => {
        let tags = [];
        try { tags = getTagsStmt.all(doc.id); } catch {}
        let keyPoints = [];
        if (typeof doc.key_points === 'string') {
          try { keyPoints = JSON.parse(doc.key_points); } catch {}
        } else if (Array.isArray(doc.key_points)) {
          keyPoints = doc.key_points;
        }
        return {
          ...doc,
          key_points: keyPoints,
          tags
        };
      });

      return Response.json({ ok: true, documents });
    }

    // 2. 큐 작업 현황 통계 (queue/stats)
    if (subPath === 'queue/stats') {
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) {
        return Response.json({
          ok: true,
          stats: {
            total: 0,
            completed: 0,
            running: 0,
            queued: 0,
            failed: 0,
            percent: 0,
            activeWorkers: 0,
            maxWorkers: 2,
            isPaused: false,
            rateLimitStatus: 'NORMAL'
          }
        });
      }

      let rows = [];
      try {
        rows = db.prepare(`
          SELECT status, COUNT(*) as count
          FROM knowledge_jobs
          GROUP BY status
        `).all();
      } catch (tableErr) {
        console.warn('[DesktopKnowledgeApi] knowledge_jobs table query failed, returning zero stats:', tableErr?.message);
        return Response.json({
          ok: true,
          stats: {
            total: 0,
            completed: 0,
            running: 0,
            queued: 0,
            failed: 0,
            percent: 0,
            activeWorkers: 0,
            maxWorkers: 2,
            isPaused: false,
            rateLimitStatus: 'NORMAL'
          }
        });
      }

      let total = 0, queued = 0, running = 0, success = 0, failed = 0;
      for (const r of rows) {
        const count = Number(r.count || 0);
        total += count;
        if (r.status === 'QUEUED') queued = count;
        else if (r.status === 'RUNNING') running = count;
        else if (r.status === 'SUCCESS') success = count;
        else if (r.status === 'FAILED') failed = count;
      }
      const percent = total > 0 ? Math.round((success / total) * 100) : 0;

      return Response.json({
        ok: true,
        stats: {
          total,
          completed: success,
          running,
          queued,
          failed,
          percent,
          activeWorkers: Math.min(running, 2),
          maxWorkers: 2,
          isPaused: false,
          rateLimitStatus: 'NORMAL'
        }
      });
    }

    // 3. 지식 컬렉션 CRUD (collection)
    if (subPath === 'collection') {
      if (request.method === 'GET') {
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (!db) return Response.json({ ok: true, collections: [] });

        const rows = db.prepare(`
          SELECT c.id, c.name, c.description, COALESCE(c.color, '#06C755') as color, c.created_at,
                 COUNT(d.id) as documentCount
          FROM knowledge_collections c
          LEFT JOIN knowledge_documents d ON d.collection_id = c.id
          GROUP BY c.id
          ORDER BY c.name ASC
        `).all();

        const collections = rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          color: r.color,
          createdAt: r.created_at,
          documentCount: Number(r.documentCount || 0)
        }));
        return Response.json({ ok: true, collections });
      }

      if (request.method === 'POST') {
        const { name, description, color } = body;
        if (!name || !name.trim()) {
          return Response.json({ ok: false, message: '컬렉션 이름이 필요합니다.' }, { status: 400 });
        }
        const db = getDesktopKnowledgeDb(resourceFolder, true);
        const id = body.id || `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const safeColor = color || '#06C755';
        db.prepare(`
          INSERT INTO knowledge_collections (id, name, description, color, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            description = excluded.description,
            color = excluded.color
        `).run(id, name.trim(), description?.trim() || null, safeColor, now);
        const saved = db.prepare('SELECT * FROM knowledge_collections WHERE name = ?').get(name.trim());
        return Response.json({
          ok: true,
          collection: {
            id: saved.id,
            name: saved.name,
            description: saved.description,
            color: saved.color,
            createdAt: saved.created_at
          }
        });
      }

      if (request.method === 'DELETE') {
        const colId = url.searchParams.get('id') || body.id;
        if (!colId) return Response.json({ ok: false, message: '컬렉션 ID가 필요합니다.' }, { status: 400 });
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (db) {
          db.exec('BEGIN TRANSACTION;');
          try {
            db.prepare('UPDATE knowledge_documents SET collection_id = NULL WHERE collection_id = ?').run(colId);
            db.prepare('DELETE FROM knowledge_collections WHERE id = ?').run(colId);
            db.exec('COMMIT;');
          } catch (e) {
            db.exec('ROLLBACK;');
            throw e;
          }
        }
        return Response.json({ ok: true });
      }
    }

    // 4. 지식 문서 상세 정보 (detail)
    if (subPath === 'detail') {
      const docId = url.searchParams.get('docId') || url.searchParams.get('documentId') || body.documentId || body.docId;
      const filePath = url.searchParams.get('filePath') || body.filePath;
      if (!docId && !filePath) {
        return Response.json({ ok: false, message: 'documentId 또는 filePath가 필요합니다.' }, { status: 400 });
      }
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: false, message: '문서를 찾을 수 없습니다.' }, { status: 404 });

      let doc = null;
      if (docId) {
        doc = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(docId);
      } else if (filePath) {
        doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ?').get(filePath);
        if (!doc) {
          const normSlash = filePath.replace(/\\/g, '/');
          const normBack = filePath.replace(/\//g, '\\');
          doc = db.prepare("SELECT * FROM knowledge_documents WHERE replace(file_path, '\\', '/') = ? OR replace(file_path, '/', '\\') = ?").get(normSlash, normBack);
        }
        if (!doc) {
          const fileName = filePath.split(/[/\\]/).pop() || '';
          if (fileName) {
            doc = db.prepare('SELECT * FROM knowledge_documents WHERE file_path = ? OR file_path LIKE ? OR file_path LIKE ? LIMIT 1').get(
              fileName,
              `%/${fileName}`,
              `%\\${fileName}`
            );
          }
        }
      }
      if (!doc) {
        return Response.json({ ok: false, message: '문서를 찾을 수 없습니다.' }, { status: 404 });
      }

      const tags = db.prepare('SELECT tag_name, score FROM document_tags WHERE document_id = ? ORDER BY score DESC').all(doc.id);
      const chunks = db.prepare(`
        SELECT c.id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
               c.start_line, c.end_line, c.chunk_summary, c.keywords,
               COALESCE(c.chunk_text, f.chunk_text, '') as chunk_text
        FROM document_chunks c
        LEFT JOIN document_chunks_fts f ON f.chunk_id = c.id
        WHERE c.document_id = ?
        ORDER BY c.chunk_index ASC
      `).all(doc.id);

      const validDbChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.heading_title, c.chunk_text, c.start_line, c.end_line));

      let keyPoints = [];
      try { keyPoints = typeof doc.key_points === 'string' ? JSON.parse(doc.key_points) : (doc.key_points || []); } catch {}

      const detail = {
        documentId: doc.id,
        filePath: doc.file_path,
        title: doc.title,
        fileSize: doc.file_size,
        modifiedAt: doc.modified_at,
        status: doc.status,
        summary: doc.summary || '',
        keyPoints,
        documentType: doc.document_type || 'other',
        tags: tags.map(t => ({ name: t.tag_name, score: t.score })),
        searchTerms: [],
        analyzerModel: doc.analyzer_model || 'gemini-3.8-flash',
        chunksCount: validDbChunks.length,
        chunks: validDbChunks.map(c => ({
          id: c.id,
          chunkIndex: c.chunk_index,
          headingTitle: c.heading_title || '',
          headingLevel: c.heading_level || 0,
          headingPath: c.heading_path || '',
          startLine: c.start_line,
          endLine: c.end_line,
          chunkSummary: c.chunk_summary || '',
          keywords: c.keywords ? (typeof c.keywords === 'string' ? c.keywords.split(',').map(s => s.trim()) : c.keywords) : [],
          chunkText: c.chunk_text || ''
        }))
      };

      return Response.json({ ok: true, detail });
    }

    // 5. 지식 문서 삭제 (delete)
    if (subPath === 'delete') {
      const { documentId, filePath, deleteAllErrors } = body;
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: true, success: true, deletedCount: 0 });

      if (deleteAllErrors) {
        const errorDocs = db.prepare("SELECT id FROM knowledge_documents WHERE status = 'ERROR'").all();
        if (errorDocs.length > 0) {
          db.exec('BEGIN TRANSACTION;');
          try {
            for (const row of errorDocs) {
              db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM knowledge_jobs WHERE document_id = ?').run(row.id);
              db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(row.id);
            }
            db.exec('COMMIT;');
          } catch (e) {
            db.exec('ROLLBACK;');
            throw e;
          }
        }
        return Response.json({ ok: true, success: true, deletedCount: errorDocs.length });
      }

      let targetId = documentId;
      if (!targetId && filePath) {
        let row = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ?').get(filePath);
        if (!row) {
          const normSlash = filePath.replace(/\\/g, '/');
          const normBack = filePath.replace(/\//g, '\\');
          row = db.prepare("SELECT id FROM knowledge_documents WHERE replace(file_path, '\\', '/') = ? OR replace(file_path, '/', '\\') = ?").get(normSlash, normBack);
        }
        if (!row) {
          const fileName = filePath.split(/[/\\]/).pop() || '';
          if (fileName) {
            row = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ? OR file_path LIKE ? OR file_path LIKE ? LIMIT 1').get(
              fileName,
              `%/${fileName}`,
              `%\\${fileName}`
            );
          }
        }
        if (row) targetId = row.id;
      }
      if (targetId) {
        db.exec('BEGIN TRANSACTION;');
        try {
          db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM knowledge_jobs WHERE document_id = ?').run(targetId);
          db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(targetId);
          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }
      }
      return Response.json({ ok: true, success: true });
    }

    // 6. 리소스 폴더 및 DB 초기화 (init)
    if (subPath === 'init') {
      const { forceReset, reason } = body;
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 설정되지 않았습니다.' }, { status: 400 });

      for (const dir of ['profiles', 'prompt', 'bible', 'media', 'db']) {
        const p = path.join(safeFolder, dir);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      }

      const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      // 초기화 전 자동 스냅샷 백업
      if (forceReset && fs.existsSync(dbPath)) {
        try {
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const snapName = `knowledge_backup_before_reset_${ts}.db`;
          
          let snapDocCount = 0;
          let snapDocTitles = [];
          if (desktopDbCache.has(dbPath)) {
            try {
              const curDb = desktopDbCache.get(dbPath);
              const cnt = curDb.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get();
              snapDocCount = cnt?.c || 0;
              snapDocTitles = curDb.prepare('SELECT title FROM knowledge_documents LIMIT 5').all().map(r => r.title);
              curDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
            } catch {}
          }
          fs.copyFileSync(dbPath, path.join(backupsDir, snapName));

          const manifestPath = path.join(backupsDir, 'backups_manifest.json');
          let manifest = {};
          try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
          manifest[snapName] = {
            reason: reason || '지식 DB 초기화 직전 자동 백업',
            docCount: snapDocCount,
            docTitles: snapDocTitles,
            createdAt: new Date().toISOString()
          };
          try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}
        } catch (snapErr) {
          console.warn('[handleDesktopKnowledgeApi] Reset snapshot failed:', snapErr);
        }
      }

      const db = getDesktopKnowledgeDb(resourceFolder, true);
      if (forceReset && db) {
        db.exec('BEGIN TRANSACTION;');
        try {
          db.prepare('DELETE FROM document_chunks_fts;').run();
          db.prepare('DELETE FROM document_tags;').run();
          db.prepare('DELETE FROM document_chunks;').run();
          db.prepare('DELETE FROM knowledge_documents;').run();
          db.prepare('DELETE FROM knowledge_jobs;').run();
          db.prepare('DELETE FROM knowledge_collections;').run();
          db.exec('COMMIT;');
          try { db.exec('VACUUM;'); } catch {}
        } catch (e) {
          db.exec('ROLLBACK;');
        }
      }

      // 최신 백업 목록 조회하여 반환
      let backups = [];
      try {
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '지식 데이터베이스 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {}

      return Response.json({ ok: true, message: '지식 데이터베이스가 성공적으로 초기화되었습니다.', path: safeFolder, backups });
    }

    // 7. 작업 큐 관리 (queue)
    if (subPath === 'queue') {
      if (request.method === 'GET') {
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        if (!db) return Response.json({ ok: true, jobs: [], total: 0 });

        let query = 'SELECT * FROM knowledge_jobs';
        const params = [];
        if (status && status !== 'ALL') {
          query += ' WHERE status = ?';
          params.push(status);
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const jobs = db.prepare(query).all(...params);
        return Response.json({ ok: true, jobs, total: jobs.length });
      }

      if (request.method === 'POST') {
        const { action } = body;
        const db = getDesktopKnowledgeDb(resourceFolder, true);

        if (action === 'ENQUEUE_BATCH') {
          const items = body.items || body.jobs || [];
          let enqueued = 0, suppressed = 0;
          for (const it of items) {
            const targetHash = it.targetHash || '';
            const existing = db.prepare(`
              SELECT id FROM knowledge_jobs
              WHERE file_path = ? AND target_hash = ? AND status IN ('QUEUED', 'RUNNING')
            `).get(it.filePath, targetHash);
            if (existing) {
              suppressed++;
              continue;
            }
            const docId = it.documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const now = new Date().toISOString();
            db.prepare(`
              INSERT INTO knowledge_jobs (id, document_id, file_path, title, job_type, target_hash, priority, status, current_step, retry_count, max_retries, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'QUEUED', 0, 3, ?)
            `).run(jobId, docId, it.filePath, it.title || null, it.jobType || 'INDEX', targetHash, it.priority || 3, now);
            enqueued++;
          }
          return Response.json({ ok: true, enqueued, enqueuedCount: enqueued, suppressed });
        }

        if (action === 'CANCEL') {
          db.prepare("UPDATE knowledge_jobs SET status = 'CANCELLED' WHERE id = ? AND status IN ('QUEUED', 'RUNNING')").run(body.jobId);
          return Response.json({ ok: true });
        }

        if (action === 'RETRY') {
          db.prepare("UPDATE knowledge_jobs SET status = 'QUEUED', retry_after = NULL, error_log = NULL WHERE status = 'FAILED'").run();
          return Response.json({ ok: true });
        }

        if (action === 'CLEAR_COMPLETED') {
          db.prepare("DELETE FROM knowledge_jobs WHERE status = 'SUCCESS'").run();
          return Response.json({ ok: true });
        }

        if (action === 'CLEAR_FAILED') {
          db.prepare("DELETE FROM knowledge_jobs WHERE status = 'FAILED'").run();
          return Response.json({ ok: true });
        }

        // 단일 작업 등록
        const { documentId, filePath, title, targetHash, priority, jobType } = body;
        if (!filePath) return Response.json({ ok: false, message: 'filePath가 필요합니다.' }, { status: 400 });
        const docId = documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO knowledge_jobs (id, document_id, file_path, title, job_type, target_hash, priority, status, current_step, retry_count, max_retries, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'QUEUED', 0, 3, ?)
        `).run(jobId, docId, filePath, title || null, jobType || 'INDEX', targetHash || '', priority || 3, now);
        const job = db.prepare('SELECT * FROM knowledge_jobs WHERE id = ?').get(jobId);
        return Response.json({ ok: true, job });
      }
    }

    // 8. 큐 다음 작업 선점 (queue/pop)
    if (subPath === 'queue/pop') {
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db) return Response.json({ ok: true, job: null });
      const nowIso = new Date().toISOString();
      const candidate = db.prepare(`
        SELECT * FROM knowledge_jobs
        WHERE status = 'QUEUED'
          AND (retry_after IS NULL OR retry_after <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(nowIso);
      if (!candidate) {
        return Response.json({ ok: true, job: null });
      }
      db.prepare("UPDATE knowledge_jobs SET status = 'RUNNING', started_at = ? WHERE id = ?").run(nowIso, candidate.id);
      const popped = db.prepare('SELECT * FROM knowledge_jobs WHERE id = ?').get(candidate.id);
      return Response.json({ ok: true, job: popped });
    }

    // 9. 큐 작업 파이프라인 단계 갱신 (queue/step)
    if (subPath === 'queue/step') {
      const { jobId, step, errorLog } = body;
      if (!jobId || !step) return Response.json({ ok: false, message: 'jobId와 step이 필요합니다.' }, { status: 400 });
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (db) {
        db.prepare("UPDATE knowledge_jobs SET current_step = ?, error_log = COALESCE(?, error_log) WHERE id = ?").run(step, errorLog || null, jobId);
      }
      return Response.json({ ok: true });
    }

    // 10. 큐 작업 완료/실패 처리 (queue/complete)
    if (subPath === 'queue/complete') {
      const { jobId, success, errorLog, backoffSeconds } = body;
      if (!jobId) return Response.json({ ok: false, message: 'jobId가 필요합니다.' }, { status: 400 });
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (db) {
        const nowIso = new Date().toISOString();
        if (success) {
          db.prepare("UPDATE knowledge_jobs SET status = 'SUCCESS', completed_at = ?, error_log = NULL WHERE id = ?").run(nowIso, jobId);
        } else {
          const job = db.prepare('SELECT retry_count, max_retries FROM knowledge_jobs WHERE id = ?').get(jobId);
          const retryCount = (job?.retry_count || 0) + 1;
          const maxRetries = job?.max_retries || 3;
          if (retryCount >= maxRetries) {
            db.prepare("UPDATE knowledge_jobs SET status = 'FAILED', retry_count = ?, completed_at = ?, error_log = ? WHERE id = ?").run(retryCount, nowIso, errorLog || null, jobId);
          } else {
            const delaySec = backoffSeconds || Math.pow(2, retryCount) * 2;
            const retryAfter = new Date(Date.now() + delaySec * 1000).toISOString();
            db.prepare("UPDATE knowledge_jobs SET status = 'QUEUED', retry_count = ?, retry_after = ?, error_log = ? WHERE id = ?").run(retryCount, retryAfter, errorLog || null, jobId);
          }
        }
      }
      return Response.json({ ok: true });
    }

    // 11. 마크다운 문서 색인 및 AI 분석 (index)
    if (subPath === 'index') {
      let { filePath, fileContent, title, geminiApiKey, aiModelName } = body;
      if (!fileContent && filePath && fs.existsSync(filePath)) {
        try { fileContent = decodeFileBuffer(fs.readFileSync(filePath)); } catch {}
      }
      if (!filePath || !fileContent) {
        return Response.json({ ok: false, message: 'filePath와 fileContent는 필수 항목입니다.' }, { status: 400 });
      }

      const db = getDesktopKnowledgeDb(resourceFolder, true);
      const crypto = require('crypto');
      const existingDoc = db.prepare('SELECT id FROM knowledge_documents WHERE file_path = ? OR file_path = ?').get(filePath, filePath.replace(/\\/g, '/'));
      const docId = existingDoc?.id || `doc_${crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 16)}`;
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      const fileSize = Buffer.byteLength(fileContent, 'utf-8');
      const docTitle = title || path.basename(filePath).replace(/\.md$/i, '') || '문서';
      const nowIso = new Date().toISOString();

      // 청킹 (고도화된 청커에 docTitle 전달)
      const chunks = chunkMarkdownByHeadingsHelper(docId, fileContent, docTitle);

      // AI 분석 실패 또는 키 미제공 시 본문 및 청크 기반의 의미 있는 정형 데이터 폴백 생성 (절대 "~마크다운 문서입니다", "#마크다운", "#지식문서" 금지)
      // 1) 문서 내 '3줄 요약', '요약', '개요' 섹션 본문 자동 탐지
      let docSummary = '';
      const summarySectionMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?(?:.*요약|.*개요)[\s\S]*?(?=(?:^###|\n---|$(?![\r\n])))/im);
      if (summarySectionMatch) {
        const summaryLines = summarySectionMatch[0]
          .split(/\r?\n/)
          .slice(1)
          .map(l => l.replace(/^>\s*/, '').replace(/^[0-9*.\-]+\s*/, '').replace(/\*\*/g, '').trim())
          .filter(l => l.length > 10);
        if (summaryLines.length > 0) {
          docSummary = summaryLines.slice(0, 3).join(' ');
        }
      }

      // 2) 요약 섹션이 없으면 본문 첫 실질 문단(30자 이상, 안내문구 제외) 추출
      if (!docSummary) {
        const mainSectionMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?본문[\s\S]*/i);
        const contentToSearch = mainSectionMatch ? mainSectionMatch[0] : fileContent;
        const paras = contentToSearch
          .replace(/^---[\s\S]*?---\s*/, '')
          .split(/\r?\n\r?\n/)
          .map(p => p.replace(/^[#*>\-!\[\]()]+\s*/gm, '').replace(/\*\*/g, '').trim())
          .filter(p => p.length > 30 && !p.startsWith('http') && !p.includes('온리비 어서'));
        if (paras.length > 0) {
          docSummary = paras[0].slice(0, 250);
        }
      }

      // 3) 태그 자동 추출:
      // (1) 문서 내 해시태그(#...) 또는 키워드 감지
      const extractedTags = [];
      const hashtagMatch = fileContent.match(/#[가-힣a-zA-Z0-9_]{2,}/g);
      if (hashtagMatch) {
        const unique = [...new Set(hashtagMatch.map(t => t.replace(/^#/, '')))]
          .filter(t => !['서식설정', '마크다운', '지식문서', '텍스트', '문서'].includes(t));
        unique.slice(0, 8).forEach((t, i) => {
          extractedTags.push({ name: t, score: Math.max(70, 95 - i * 3) });
        });
      }

      // (2) 해시태그가 없을 경우 문서 제목, 볼드 메타데이터, 헤딩에서 실질적인 도메인 키워드 자동 추출
      if (extractedTags.length === 0) {
        const cleanTitle = docTitle.replace(/^[A-Z0-9_\-\[\]]+/, '').replace(/[_\s\-\[\]()]+/g, ' ').trim();
        const titleWords = (cleanTitle || docTitle).split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2 && !['문서', '블로그', '정리'].includes(w));

        const metaWords = [];
        const metaMatches = [...fileContent.matchAll(/\*\*(?:문서명|프로젝트명|적용 대상|문서 유형|핵심 가치|주제)\*\*:\s*([^\n\r]+)/g)];
        for (const m of metaMatches) {
          const words = m[1].replace(/[_\s\-\[\]():/]+/g, ' ').split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2);
          metaWords.push(...words);
        }

        const headingWords = [];
        for (const c of chunks) {
          if (c.headingTitle && !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText)) {
            const hText = c.headingTitle.replace(/^[0-9.]+\s*/, '').replace(/[_\s\-\[\]():/]+/g, ' ').trim();
            if (hText && !/^(메타|서식|CSS|프로필)/i.test(hText)) {
              const words = hText.split(/\s+/).map(w => w.replace(/[,\.]/g, '').trim()).filter(w => w.length >= 2 && !['우리가', '얻는', '대한', '위한', '개요', '목적', '정리'].includes(w));
              headingWords.push(...words);
            }
          }
        }

        const stopWords = new Set(['PRD', 'CHA', '000', '001', 'Overview', 'Target', 'Personas', 'Architecture', 'v1', 'v2', 'v2.0', 'Approved', '문서']);
        const combined = [...new Set([...titleWords, ...metaWords, ...headingWords])].filter(w => w.length >= 2 && !stopWords.has(w));
        combined.slice(0, 8).forEach((w, i) => {
          extractedTags.push({ name: w, score: Math.max(70, 95 - i * 3) });
        });
      }

      if (extractedTags.length === 0) {
        extractedTags.push({ name: docTitle.replace(/^[0-9_]+/, '').slice(0, 15), score: 90 });
      }

      // 4) SEO 키워드 섹션 감지
      const seoMatch = fileContent.match(/###?\s*(?:[0-9.]*\s*)?SEO\s*키워드[\s\S]*?(?=(?:^###|\n---|$(?![\r\n])))/i);
      const searchTerms = [];
      if (seoMatch) {
        const rawTerms = seoMatch[0].split(/\r?\n/).slice(1).join(' ')
          .split(/[,，\s]+/)
          .map(t => t.trim())
          .filter(t => t.length >= 2 && !['SEO', '키워드'].includes(t));
        searchTerms.push(...[...new Set(rawTerms)].slice(0, 8));
      }

      // 5) 핵심 요점(key_points): 제목 껍데기만 읽지 않고, 제목과 그 안의 실제 하위 항목/근거/질문 본문을 종합하여 유효한 정보로 추출
      const keyPoints = [];
      chunks.forEach(c => {
        const title = (c.headingTitle || '').trim();
        if (
          !title ||
          /^(메타정보|서식설정|해시태그|SEO|바쁜|제목\s*후보|이미지|[0-9.]*\s*제목|[0-9.]*\s*SEO|[0-9.]*\s*해시태그|[0-9.]*\s*바쁜|[0-9.]*\s*이미지|[0-9.]*\s*1:1)/i.test(title) ||
          title.includes('서두 및 메타정보') ||
          /^[0-9.]*\s*본문$/i.test(title)
        ) {
          return;
        }

        const cleanTitle = title
          .replace(/^[0-9.]*\s*/, '')
          .replace(/^[📌💡\s]+/, '')
          .replace(/\s*\([^)]*(?:가지|개|추천)[^)]*\)/g, '')
          .trim();

        const chunkText = c.chunkText || '';
        const bodyLines = chunkText
          .split(/\r?\n/)
          .slice(1)
          .filter(l => !l.startsWith('>') && !l.startsWith('![') && !l.includes('온리비') && !l.includes('onrivi.com'));

        const cleanBody = bodyLines.join('\n');

        // 1) 본문 내 번호 매겨진 볼드체 항목 탐색 (예: **1. 동네 소규모...**)
        const boldMatches = [...cleanBody.matchAll(/\*\*(?:[0-9]+[.)]\s*)?([^*:\n]+)\*\*/g)];
        const items = boldMatches
          .map(m => m[1].trim())
          .filter(item => item.length >= 4 && !item.startsWith('이미지') && !item.startsWith('의안') && !item.startsWith('대표발의') && !item.startsWith('발의일자'));

        if (items.length >= 2) {
          const summaryItems = items.slice(0, 3).map(it => it.replace(/^[0-9]+[.)]\s*/, '')).join(' / ');
          keyPoints.push(`[${cleanTitle}] ${summaryItems}`);
          return;
        }

        // 2) 불릿 리스트 탐색
        const bulletMatches = [...cleanBody.matchAll(/^\s*[*+-]\s*(?:\*\*([^*]+)\*\*\s*[:：]?)?\s*([^\n\r]+)/gm)];
        if (bulletMatches.length > 0) {
          const bulletSummaries = bulletMatches
            .map(m => {
              const t = m[1] ? m[1].trim() : '';
              const d = m[2] ? m[2].trim().replace(/\*\*/g, '') : '';
              if (t && d && !d.startsWith(t)) {
                return `${t}: ${d.slice(0, 40)}`;
              }
              return t || d;
            })
            .filter(s => s.length > 3 && !s.includes('의안번호'));

          if (bulletSummaries.length > 0) {
            keyPoints.push(`[${cleanTitle}] ${bulletSummaries.slice(0, 2).join(' / ')}`);
            return;
          }
        }

        // 3) 질문이나 본문 실제 내용 문단 추출
        const paragraphs = cleanBody
          .split(/\r?\n\r?\n/)
          .map(p => p.replace(/^[#*>\-!\[\]()]+\s*/gm, '').replace(/\*\*/g, '').trim())
          .filter(p => p.length > 25 && !p.startsWith('http') && !p.startsWith('하단'));

        if (paragraphs.length > 0) {
          const focusPara = paragraphs.find(p => /개요|목적|배경|요건|정의|핵심|특징|기준|방침|기능|절차|규약|설계/i.test(p));
          const chosenPara = (focusPara || paragraphs[0]).replace(/\r?\n/g, ' ').slice(0, 110);
          keyPoints.push(`[${cleanTitle}] ${chosenPara}`);
        } else {
          keyPoints.push(cleanTitle);
        }
      });

      let analysis = {
        summary: docSummary || `${docTitle}: 본 문서의 핵심 주제, 요구사항 및 주요 도메인 지식 정보를 정리한 문서입니다.`,
        key_points: keyPoints.length > 0 ? keyPoints.slice(0, 6) : [docTitle],
        document_type: 'guide',
        tags: extractedTags,
        search_terms: searchTerms.length > 0 ? searchTerms : [docTitle, ...keyPoints.slice(0, 4)]
      };

      if (geminiApiKey && geminiApiKey.trim()) {
        try {
          const modelToUse = (aiModelName || 'gemini-3.8-flash').trim();
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiApiKey.trim()}`;
          const isGemma = modelToUse.toLowerCase().startsWith('gemma');

          const prompt = `You are a professional knowledge base (RAG) document analysis AI.
Analyze the given markdown document and respond with ONLY a single valid JSON object.
CRITICAL: Do NOT write any introduction, greetings, or markdown explanations. Start your response directly with { and end with }.

[ANALYSIS GUIDELINES]:
1. summary: Summarize the core topic, real-world domain, objectives, and key contents of THIS SPECIFIC document in 2~3 clear Korean sentences. DO NOT say "이 문서는 마크다운 문서입니다".
2. key_points: CRITICAL: NEVER just output superficial headings or table of contents titles. Instead, synthesize the heading AND the actual detailed sub-bullets, arguments, requirements, or facts underneath into informative, substantive sentences (3~6 points).
3. tags: Extract 5~10 specific domain tags strictly from THIS document (e.g. project names, domain terms, core features, technologies, entities) with scores 60~100. NEVER use generic tags like "#마크다운" or "#지식문서". NEVER output tags from other unrelated domains.
4. search_terms: Extract 5~10 search query terms that users would use to find THIS specific document.

[JSON OUTPUT FORMAT]:
{
  "summary": "해당 문서의 핵심 주제, 목적, 주요 내용을 포괄하는 명확한 요약문 (2~3문장)",
  "key_points": [
    "[분야 또는 섹션명 1] 세부 실질 내용 1",
    "[분야 또는 섹션명 2] 세부 실질 내용 2",
    "[분야 또는 섹션명 3] 세부 실질 내용 3"
  ],
  "document_type": "guide",
  "tags": [
    { "name": "문서_핵심_키워드1", "score": 95 },
    { "name": "문서_도메인_용어2", "score": 90 }
  ],
  "search_terms": ["문서 관련 검색어 1", "문서 관련 검색어 2"]
}

[MARKDOWN DOCUMENT]:
${fileContent.slice(0, 15000)}`;

          let attempts = 0;
          const maxAttempts = 3;
          while (attempts < maxAttempts) {
            try {
              attempts++;
              const requestBody = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: isGemma ? { temperature: 0.2 } : { responseMimeType: 'application/json', temperature: 0.2 }
              };

              const aiRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                const textOut = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textOut) {
                  const parsed = parseAndRepairLlmJson(textOut);

                  if (parsed && typeof parsed === 'object') {
                    if (parsed.summary && typeof parsed.summary === 'string' && !parsed.summary.includes('마크다운 문서입니다')) {
                      analysis.summary = parsed.summary;
                    }
                    if (Array.isArray(parsed.key_points) && parsed.key_points.length > 0) {
                      analysis.key_points = parsed.key_points;
                    }
                    if (parsed.document_type) {
                      analysis.document_type = parsed.document_type;
                    }
                    if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                      const filteredTags = parsed.tags.filter(t => {
                        const name = (typeof t === 'string' ? t : t?.name || '').replace(/^#/, '').trim();
                        return name && !['마크다운', '지식문서', '문서', '텍스트'].includes(name);
                      }).map(t => typeof t === 'string' ? { name: t.replace(/^#/, '').trim(), score: 85 } : { name: String(t.name).replace(/^#/, '').trim(), score: Number(t.score) || 80 });

                      if (filteredTags.length > 0) {
                        analysis.tags = filteredTags;
                      }
                    }
                    if (Array.isArray(parsed.search_terms) && parsed.search_terms.length > 0) {
                      analysis.search_terms = parsed.search_terms;
                    }
                    break;
                  } else {
                    console.warn(`[DesktopKnowledgeApi] AI 응답에서 JSON 파싱 실패 (시도 ${attempts}/${maxAttempts}). 스마트 본문 추출 폴백을 준비합니다.`);
                    if (attempts < maxAttempts) {
                      await new Promise(r => setTimeout(r, 1000));
                      continue;
                    }
                  }
                }
                break;
              } else if (attempts < maxAttempts) {
                console.warn(`[DesktopKnowledgeApi] AI 분석 ${attempts}회차 HTTP ${aiRes.status}. 3초 후 재시도합니다...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
            } catch (aiAttemptErr) {
              if (attempts < maxAttempts) {
                console.warn(`[DesktopKnowledgeApi] AI 분석 ${attempts}회차 통신오류. 3초 후 재시도합니다...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
              throw aiAttemptErr;
            }
          }
        } catch (aiErr) {
          console.warn('[DesktopKnowledgeApi] AI analysis fallback used:', aiErr.message);
        }
      }

      // 메타/보조 청크 제외한 실질 청크 필터링 (트랜잭션 및 반환 공통 스코프)
      const validChunks = (chunks || []).filter(c => !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText, c.startLine, c.endLine));

      // Rule 7 준수: 단일 트랜잭션으로 원자적 쓰기 (All-or-Nothing)
      db.exec('BEGIN TRANSACTION;');
      try {
        db.prepare('DELETE FROM document_chunks_fts WHERE document_id = ?').run(docId);
        db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(docId);
        db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(docId);

        db.prepare(`
          INSERT INTO knowledge_documents (
            id, file_path, title, file_hash, file_size, modified_at,
            summary, key_points, document_type, priority, status,
            analyzer_model, analyzed_at, indexed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?)
          ON CONFLICT(file_path) DO UPDATE SET
            title = excluded.title,
            file_hash = excluded.file_hash,
            file_size = excluded.file_size,
            modified_at = excluded.modified_at,
            summary = excluded.summary,
            key_points = excluded.key_points,
            document_type = excluded.document_type,
            priority = excluded.priority,
            status = 'READY',
            error_message = NULL,
            analyzer_model = excluded.analyzer_model,
            analyzed_at = excluded.analyzed_at,
            indexed_at = excluded.indexed_at
        `).run(
          docId, filePath, docTitle, fileHash, fileSize, nowIso,
          analysis.summary, JSON.stringify(analysis.key_points), analysis.document_type, 3,
          aiModelName || 'gemini-3.8-flash', nowIso, nowIso
        );

        const insertChunkStmt = db.prepare(`
          INSERT INTO document_chunks (
            id, document_id, chunk_index, heading_title, heading_level,
            heading_path, start_line, end_line, chunk_summary, keywords, chunk_text, chunk_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertFtsStmt = db.prepare(`
          INSERT INTO document_chunks_fts (
            chunk_id, document_id, heading_title, keywords, chunk_text
          ) VALUES (?, ?, ?, ?, ?)
        `);

        for (const c of validChunks) {
          const kwStr = Array.isArray(c.keywords) ? c.keywords.join(', ') : (c.keywords || '');
          insertChunkStmt.run(
            c.id, docId, c.chunkIndex, c.headingTitle || null, c.headingLevel || 0,
            c.headingPath || null, c.startLine, c.endLine, c.chunkSummary || null, kwStr,
            c.chunkText || '', c.chunkType || 'section'
          );
          insertFtsStmt.run(
            c.id, docId, c.headingTitle || '', kwStr, c.chunkText || ''
          );
        }

        if (Array.isArray(analysis.tags)) {
          const insertTagStmt = db.prepare(`
            INSERT INTO document_tags (document_id, tag_name, score, source)
            VALUES (?, ?, ?, 'AI')
          `);
          for (const t of analysis.tags) {
            if (t && t.name) {
              insertTagStmt.run(docId, String(t.name).trim(), Math.min(100, Math.max(0, Number(t.score || 80))));
            }
          }
        }

        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }

      const detail = {
        documentId: docId,
        filePath,
        title: docTitle,
        fileSize,
        modifiedAt: nowIso,
        status: 'READY',
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        documentType: analysis.document_type,
        tags: analysis.tags,
        searchTerms: analysis.search_terms,
        analyzerModel: aiModelName || 'gemini-3.8-flash',
        chunksCount: validChunks.length,
        chunks: validChunks
      };

      return Response.json({ ok: true, documentId: docId, chunksCount: validChunks.length, detail });
    }

    // 12. 하이브리드/FTS 검색 (search)
    if (subPath === 'search') {
      const { query, limit = 20 } = body;
      const db = getDesktopKnowledgeDb(resourceFolder, false);
      if (!db || !query || !query.trim()) return Response.json({ ok: true, candidates: [] });

      // 1. 한국어 자연어/구어체 프롬프트에서 핵심 검색 키워드 추출
      const stopwords = new Set([
        '최근', '요즘', '현재', '과거', '주요', '기존', '새로운', '신규',
        '관련', '관련된', '관련한', '관련하여', '관해서', '관하여', '관한', '관해',
        '대해', '대해서', '대하여', '대한',
        '알려줘', '알려줄래', '알려주세요', '알려', '알려주기',
        '설명해줘', '설명해', '설명해주세요', '설명',
        '요약해줘', '요약해', '요약해주세요', '요약',
        '정리해줘', '정리해', '정리해주세요', '정리',
        '찾아줘', '찾아줄래', '찾아주세요', '검색해줘', '검색',
        '말해줘', '말해줄래', '말해주세요', '이야기',
        '써줘', '써주세요', '써줄래', '작성해줘', '작성', '작성하기',
        '가르쳐줘', '가르쳐주세요', '보여줘', '보여주세요',
        '무엇', '어떤', '어떻게', '있는', '있는지', '있는가', '인가',
        '내용', '내용을', '내용은', '내용이', '내용과', '정보', '자료', '문서', '항목', '사항'
      ]);
      const josaRegex = /(은|는|이|가|을|를|의|에|에게|에서|로|으로|와|과|도|만|처럼|같이|부터|까지|하고|하여|해서|해줘|해줄래|해주세요|인|인스턴스|에는|에도|에게는|에게도|과도|와도)?$/;

      const cleanedQuery = query.replace(/[^\w\s가-힣]/g, ' ').trim();
      const rawTokens = cleanedQuery.split(/\s+/).filter(Boolean);
      const keywordsSet = new Set();

      for (const token of rawTokens) {
        const word = token.toLowerCase();
        let stripped = word.replace(josaRegex, '');
        if (stripped.length > 3 && stripped.endsWith('내용')) stripped = stripped.slice(0, -2);
        if (stripped.length > 3 && stripped.endsWith('관련')) stripped = stripped.slice(0, -2);

        if (stopwords.has(word) || stopwords.has(stripped)) continue;

        if (stripped.length >= 2) {
          keywordsSet.add(stripped);
        } else if (word.length >= 2 && !stopwords.has(word)) {
          keywordsSet.add(word);
        }
      }

      const keywords = Array.from(keywordsSet);
      if (keywords.length === 0 && cleanedQuery) {
        keywords.push(...cleanedQuery.split(/\s+/).filter(w => w.length >= 2));
      }

      if (keywords.length === 0) {
        return Response.json({ ok: true, candidates: [] });
      }

      const candidateMap = new Map();
      const addCandidate = (r, baseScore, matchType) => {
        if (isMetaOrAuxiliaryChunk(r.heading_title, r.chunk_text, r.start_line, r.end_line)) {
          return;
        }
        if (!candidateMap.has(r.chunk_id)) {
          candidateMap.set(r.chunk_id, { ...r, baseScore, matchType });
        }
      };

      // 2-1. FTS5 AND 검색 (모든 키워드 일치 청크 우선)
      if (keywords.length > 1) {
        const andGroup = keywords.map(k => `"${k}"*`).join(' AND ');
        try {
          const andRows = db.prepare(`
            SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                   c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                   COALESCE(c.chunk_type, 'section') as chunk_type,
                   d.title as doc_title, d.file_path, d.file_hash, d.priority,
                   bm25(document_chunks_fts) as rank
            FROM document_chunks_fts f
            JOIN document_chunks c ON c.id = f.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE document_chunks_fts MATCH ?
              AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
            ORDER BY rank ASC
            LIMIT ?
          `).all(andGroup, limit);

          for (const r of andRows) {
            addCandidate(r, 95, 'AND');
          }
        } catch (ftsErr) {
          console.warn('[DesktopKnowledgeApi] FTS AND search error:', ftsErr.message);
        }
      }

      // 2-2. FTS5 OR 검색 보강 (AND 결과가 부족한 경우)
      if (candidateMap.size < limit * 2) {
        const orGroup = keywords.map(k => `"${k}"*`).join(' OR ');
        try {
          const orRows = db.prepare(`
            SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                   c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                   COALESCE(c.chunk_type, 'section') as chunk_type,
                   d.title as doc_title, d.file_path, d.file_hash, d.priority,
                   bm25(document_chunks_fts) as rank
            FROM document_chunks_fts f
            JOIN document_chunks c ON c.id = f.chunk_id
            JOIN knowledge_documents d ON d.id = c.document_id
            WHERE document_chunks_fts MATCH ?
              AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
            ORDER BY rank ASC
            LIMIT ?
          `).all(orGroup, limit * 3);

          for (const r of orRows) {
            addCandidate(r, 85, 'OR');
          }
        } catch (ftsErr) {
          console.warn('[DesktopKnowledgeApi] FTS OR search error:', ftsErr.message);
        }
      }

      // 2-3. 문서 제목(Title), 태그(Tag), 헤딩(Heading) LIKE 검색 보강
      if (candidateMap.size < limit) {
        for (const kw of keywords) {
          if (candidateMap.size >= limit * 2) break;
          try {
            const likeRows = db.prepare(`
              SELECT c.id as chunk_id, c.document_id, c.chunk_index, c.heading_title, c.heading_level, c.heading_path,
                     c.start_line, c.end_line, c.chunk_summary, c.keywords, c.chunk_text,
                     COALESCE(c.chunk_type, 'section') as chunk_type,
                     d.title as doc_title, d.file_path, d.file_hash, d.priority,
                     999 as rank
              FROM document_chunks c
              JOIN knowledge_documents d ON d.id = c.document_id
              WHERE (d.title LIKE ? OR c.heading_title LIKE ? OR c.keywords LIKE ?)
                AND UPPER(d.status) IN ('READY', 'ACTIVE', 'INDEXED')
              ORDER BY c.chunk_index ASC
              LIMIT ?
            `).all(`%${kw}%`, `%${kw}%`, `%${kw}%`, limit);

            for (const r of likeRows) {
              addCandidate(r, 75, 'LIKE');
            }
          } catch {}
        }
      }

      // 3. 실질 본문 및 원자적 표 우대 가중치 계산
      const substantiveKeywords = ['제안이유', '주요내용', '요약', '실질적인 변화', '법률안', '개정안', '의안 정보', '시행 시기', '원스트라이크'];
      const tableQueryKeywords = ['표', '대비표', '일정', '번호', '비교', '현행', '개정안', '스펙', '정보'];
      const isTableQuery = tableQueryKeywords.some(tk => query.includes(tk));

      const ranked = Array.from(candidateMap.values()).map(c => {
        let score = c.baseScore;
        const heading = (c.heading_title || '').toLowerCase();

        if (substantiveKeywords.some(s => heading.includes(s))) {
          score += 10;
        }
        if (c.chunk_type === 'table') {
          score += isTableQuery ? 15 : 5;
        }
        const textLen = (c.chunk_text || '').length;
        if (textLen > 200) score += 5;

        const snippet = c.chunk_text || c.chunk_summary || '';
        const finalScore = Math.max(10, Math.min(100, score));

        return {
          id: c.chunk_id,
          chunkId: c.chunk_id,
          documentId: c.document_id,
          chunkIndex: c.chunk_index,
          headingTitle: c.heading_title,
          headingLevel: c.heading_level,
          headingPath: c.heading_path || c.heading_title,
          startLine: Number(c.start_line),
          endLine: Number(c.end_line),
          chunkSummary: c.chunk_summary,
          keywords: c.keywords,
          chunkText: c.chunk_text,
          chunkType: c.chunk_type || 'section',
          documentTitle: c.doc_title || c.heading_title,
          docTitle: c.doc_title || c.heading_title,
          filePath: c.file_path,
          fileHash: c.file_hash,
          priority: c.priority,
          snippet,
          matchSnippet: snippet.slice(0, 150),
          score: finalScore,
          finalScore,
          rank: c.rank
        };
      });

      ranked.sort((a, b) => b.score - a.score);
      const candidates = ranked.slice(0, limit);

      return Response.json({ ok: true, candidates, total: candidates.length });
    }

    // 13. 백업 및 복원 (backup, restore)
    if (subPath === 'backup') {
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 없습니다.' }, { status: 400 });
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      if (request.method === 'GET') {
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try {
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          }
        } catch {}

        const download = url.searchParams.get('download');
        const fileName = url.searchParams.get('fileName');

        if (download === 'current') {
          const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
          if (!fs.existsSync(dbPath)) return Response.json({ ok: false, message: 'DB 파일이 없습니다.' }, { status: 404 });
          const fileBuffer = fs.readFileSync(dbPath);
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          const dlName = `onrivi_knowledge_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.db`;
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${dlName}"`,
            }
          });
        }

        if (download === 'true' && fileName) {
          const cleanName = path.basename(fileName);
          const backupPath = path.join(backupsDir, cleanName);
          if (!fs.existsSync(backupPath)) return Response.json({ ok: false, message: '백업 파일을 찾을 수 없습니다.' }, { status: 404 });
          const fileBuffer = fs.readFileSync(backupPath);
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${cleanName}"`,
            }
          });
        }

        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        const backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '수동 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return Response.json({ ok: true, backups });
      }

      if (request.method === 'POST') {
        const { reason } = body;
        const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');
        if (!fs.existsSync(dbPath)) return Response.json({ ok: false, message: '백업할 DB 파일이 없습니다.' }, { status: 404 });

        // WAL 체크포인트 수행하여 최신 데이터가 .db 파일에 물리적으로 쓰여지도록 보장
        const db = getDesktopKnowledgeDb(resourceFolder, false);
        let docCount = 0;
        let docTitles = [];
        if (db) {
          try {
            db.exec('PRAGMA wal_checkpoint(PASSIVE);');
            const docs = db.prepare('SELECT title FROM knowledge_documents LIMIT 5').all();
            docCount = Number(db.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get()?.c || 0);
            docTitles = docs.map(d => d.title);
          } catch {}
        }

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const backupFileName = `knowledge_backup_${ts}.db`;
        const destPath = path.join(backupsDir, backupFileName);
        fs.copyFileSync(dbPath, destPath);

        const effectiveReason = reason && reason.trim() ? reason.trim() : (docCount > 0 ? `등록 문서 ${docCount}건 보존 백업` : '수동 백업');

        // backups_manifest.json 갱신
        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        let manifest = {};
        try {
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          }
        } catch {}
        manifest[backupFileName] = {
          reason: effectiveReason,
          docCount,
          docTitles,
          createdAt: now.toISOString()
        };
        try {
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch {}

        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        const backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '수동 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return Response.json({
          ok: true,
          backup: { fileName: backupFileName, path: destPath, reason: effectiveReason },
          backups,
          message: `지식 데이터베이스 백업(${backupFileName})이 성공적으로 생성되었습니다.`
        });
      }

      if (request.method === 'DELETE') {
        const fileName = url.searchParams.get('fileName') || body.fileName;
        if (!fileName) return Response.json({ ok: false, message: '파일명이 필요합니다.' }, { status: 400 });
        const cleanName = path.basename(fileName);
        const target = path.join(backupsDir, cleanName);
        if (fs.existsSync(target)) fs.unlinkSync(target);

        const manifestPath = path.join(backupsDir, 'backups_manifest.json');
        try {
          if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            if (manifest[cleanName]) {
              delete manifest[cleanName];
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            }
          }
        } catch {}

        return Response.json({ ok: true, message: '백업 파일이 삭제되었습니다.' });
      }
    }

    if (subPath === 'restore') {
      const { backupFileName, fileName, reason, uploadedFileBase64, uploadedFileName } = body;
      const safeFolder = resolveSafeResourceFolder(resourceFolder);
      if (!safeFolder) return Response.json({ ok: false, message: '리소스 폴더가 없습니다.' }, { status: 400 });
      const backupsDir = path.join(safeFolder, 'db', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      const dbPath = path.join(safeFolder, 'db', 'onrivi_knowledge.db');

      // 사전 안전 스냅샷 백업 (공통)
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const preRestoreName = `knowledge_backup_before_restore_${ts}.db`;
      const manifestPath = path.join(backupsDir, 'backups_manifest.json');
      let manifest = {};
      try { if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}

      if (fs.existsSync(dbPath)) {
        try {
          // DB 스냅샷 생성 전 문서 수 및 대표 제목 안전 조회
          let snapDocCount = 0;
          let snapDocTitles = [];
          if (desktopDbCache.has(dbPath)) {
            try {
              const curDb = desktopDbCache.get(dbPath);
              const cnt = curDb.prepare('SELECT COUNT(*) as c FROM knowledge_documents').get();
              snapDocCount = cnt?.c || 0;
              snapDocTitles = curDb.prepare('SELECT title FROM knowledge_documents LIMIT 5').all().map(r => r.title);
              curDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
              curDb.close();
            } catch {}
            desktopDbCache.delete(dbPath);
          }

          fs.copyFileSync(dbPath, path.join(backupsDir, preRestoreName));
          manifest[preRestoreName] = {
            reason: reason || '원복 직전 자동 스냅샷',
            docCount: snapDocCount,
            docTitles: snapDocTitles,
            createdAt: new Date().toISOString()
          };
        } catch (snapErr) {
          console.warn('[handleDesktopKnowledgeApi] Pre-restore snapshot failed:', snapErr);
        }
      }

      // DB 캐시 비우기 + 잔여 WAL/SHM 제거
      if (desktopDbCache.has(dbPath)) {
        try { desktopDbCache.get(dbPath).close(); } catch {}
        desktopDbCache.delete(dbPath);
      }
      try { fs.unlinkSync(`${dbPath}-wal`); } catch {}
      try { fs.unlinkSync(`${dbPath}-shm`); } catch {}

      // ── 분기 A: 외부 파일 base64 업로드 원복 ──
      if (uploadedFileBase64 && uploadedFileName) {
        try {
          const buf = Buffer.from(uploadedFileBase64, 'base64');
          fs.writeFileSync(dbPath, buf);
        } catch (err) {
          return Response.json({ ok: false, message: `업로드 파일 쓰기 실패: ${err.message}` }, { status: 500 });
        }
        try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}
        const restoredDb2 = getDesktopKnowledgeDb(resourceFolder, false);
        let documents2 = [];
        if (restoredDb2) {
          try { documents2 = restoredDb2.prepare('SELECT id, file_path, title FROM knowledge_documents').all(); } catch {}
        }
        let backups2 = [];
        try {
          const files2 = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
          backups2 = files2.map(f => {
            const stat = fs.statSync(path.join(backupsDir, f));
            const m = manifest[f] || {};
            return {
              fileName: f,
              filePath: path.join(backupsDir, f),
              size: stat.size,
              createdAt: m.createdAt || stat.birthtime.toISOString(),
              reason: m.reason || '지식 데이터베이스 백업',
              docCount: typeof m.docCount === 'number' ? m.docCount : 0,
              docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
            };
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {}

        return Response.json({
          ok: true,
          message: `업로드된 파일(${uploadedFileName})로 지식 데이터베이스가 성공적으로 원복되었습니다.`,
          documents: documents2,
          backups: backups2
        });
      }

      // ── 분기 B: 기존 백업 파일에서 원복 ──
      const targetFileName = backupFileName || fileName;
      if (!targetFileName) return Response.json({ ok: false, message: '필수 인자가 누락되었습니다.' }, { status: 400 });
      const srcBackup = path.join(backupsDir, targetFileName);
      if (!fs.existsSync(srcBackup)) return Response.json({ ok: false, message: '백업 파일을 찾을 수 없습니다.' }, { status: 404 });

      fs.copyFileSync(srcBackup, dbPath);
      try { fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8'); } catch {}

      // 복원 후 문서 목록 및 최신 백업 목록 조회
      const restoredDb = getDesktopKnowledgeDb(resourceFolder, false);
      let documents = [];
      if (restoredDb) {
        try { documents = restoredDb.prepare('SELECT id, file_path, title FROM knowledge_documents').all(); } catch {}
      }

      let backups = [];
      try {
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db') && !f.startsWith('.'));
        backups = files.map(f => {
          const stat = fs.statSync(path.join(backupsDir, f));
          const m = manifest[f] || {};
          return {
            fileName: f,
            filePath: path.join(backupsDir, f),
            size: stat.size,
            createdAt: m.createdAt || stat.birthtime.toISOString(),
            reason: m.reason || '지식 데이터베이스 백업',
            docCount: typeof m.docCount === 'number' ? m.docCount : 0,
            docTitles: Array.isArray(m.docTitles) ? m.docTitles : []
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {}

      return Response.json({ 
        ok: true, 
        message: `지식 데이터베이스가 성공적으로 원복되었습니다. (${targetFileName})`,
        documents,
        backups
      });
    }

    return Response.json({ ok: false, message: `지원되지 않는 로컬 지식 엔드포인트: ${subPath}` }, { status: 404 });
  } catch (err) {
    console.error('[DesktopKnowledgeApi Error]:', err);
    return Response.json({ ok: false, message: err?.message || '지식 API 처리 중 내부 오류 발생' }, { status: 500 });
  }
}

// 앱 구동 생명주기 시작
app.on('ready', async () => {
  // 🌐 [ Next.js App Router 정적 파일 서빙을 위한 app:// 프로토콜 핸들러 등록 ]
  protocol.handle('app', async (request) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || pathname === '') pathname = '/editor.html';
      else if (pathname === '/editor') pathname = '/editor.html';
      
      // 🚨 @PATCH : 데스크톱 앱 내에서 /login 또는 /dashboard 등 SaaS 웹 경로로 직접 접근 시 404 방지 및 외부 브라우저 오픈
      if (pathname === '/login' || pathname === 'login') {
        const { shell } = require('electron');
        shell.openExternal(`https://onrivi.com/login${url.search}`);
        return new Response('<script>location.href="app://-/editor.html?env=desktop";</script>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      if (pathname === '/dashboard' || pathname === 'dashboard') {
        const { shell } = require('electron');
        shell.openExternal(`https://onrivi.com/dashboard${url.search}`);
        return new Response('<script>location.href="app://-/editor.html?env=desktop";</script>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      
      pathname = pathname.replace(/^\//, '');  // path.join이 앞 경로를 먹는 버그 방지
      
      // 🧠 [데스크톱 지식 베이스 SQLite 로컬 라우팅]
      // /api/knowledge/* 요청은 외부 실서버로 프록시하지 않고 사용자 지정 로컬 리소스 폴더의 SQLite DB를 직접 쿼리하여 응답
      if (pathname.startsWith('api/knowledge/')) {
        return await handleDesktopKnowledgeApi(request, pathname, url);
      }

      // 데스크탑에서 프론트엔드가 실수로 /api/... 로컬 경로로 fetch 할 경우 실서버로 프록시
      if (pathname.startsWith('api/')) {
        const fetchUrl = `https://onrivi.com/${pathname}`;
        
        // 🚨 @PATCH: Host 헤더 등 클라우드플레어 라우팅을 방해하는 커스텀 프로토콜 헤더 제거
        const cleanHeaders = new Headers();
        for (const [key, value] of request.headers.entries()) {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'host' && lowerKey !== 'origin' && lowerKey !== 'referer') {
            cleanHeaders.set(key, value);
          }
        }
        
        const options = {
          method: request.method,
          headers: cleanHeaders
        };
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
          options.body = request.body;
          options.duplex = 'half';
        }
        return fetch(fetchUrl, options);
      }

      let targetPath = path.join(__dirname, 'frontend/out', pathname);
      
      // html 파일 확장자 보완 (Next.js 정적 빌드 대응)
      if (!path.extname(targetPath) && !fs.existsSync(targetPath)) {
         if (fs.existsSync(targetPath + '.html')) {
             targetPath += '.html';
         } else if (fs.existsSync(path.join(targetPath, 'index.html'))) {
             targetPath = path.join(targetPath, 'index.html');
         }
      }

      // 🛡️ [에셋 및 빌드 폴백] frontend/out에 파일이 없으면 .next-desktop, .next-web-build, frontend/public 순차 탐색하여 누락 방어
      if (!fs.existsSync(targetPath)) {
        const desktopCandidates = [
          path.join(__dirname, 'frontend/.next-desktop', pathname),
          path.join(__dirname, 'frontend/.next-web-build', pathname),
          path.join(__dirname, 'frontend/public', pathname)
        ];
        for (const candidate of desktopCandidates) {
          if (fs.existsSync(candidate)) {
            targetPath = candidate;
            break;
          } else if (fs.existsSync(candidate + '.html')) {
            targetPath = candidate + '.html';
            break;
          } else if (fs.existsSync(path.join(candidate, 'index.html'))) {
            targetPath = path.join(candidate, 'index.html');
            break;
          }
        }
      }

      const ext = path.extname(targetPath).toLowerCase();
      const mimeMap = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
      };
      if (!fs.existsSync(targetPath)) {
        return new Response('File not found', { status: 404 });
      }

      const contentType = mimeMap[ext] || 'application/octet-stream';
      const content = fs.readFileSync(targetPath);
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Length', String(Buffer.byteLength(content)));
      return new Response(content, { status: 200, headers });
    } catch (err) {
      console.error('app protocol serve error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // 🌐 [ 네이티브 미디어 스트리밍을 위한 media-local 프로토콜 핸들러 등록 ]
  // JS Stream을 거치지 않고 C++ 네이티브 레벨에서 파일 스트리밍과 Range Request를 완벽히 지원
  protocol.registerFileProtocol('media-local', (request, callback) => {
    try {
      const parsedUrl = new URL(request.url);
      
      // Chromium URL 파서가 커스텀 standard 프로토콜의 경로를 잘못 파싱하는 것을 방지하기 위해 ?url= 파라미터 우선 확인
      let filePath = parsedUrl.searchParams.get('url');
      if (!filePath) {
        // 하위 호환성 및 폴백
        filePath = decodeURIComponent(parsedUrl.pathname);
      }
      
      const found = findLocalImageFile(filePath);
      if (!found) {
        console.error('[media-local] File not found:', filePath);
        return callback({ error: -6 });
      }
      callback({ path: found });
    } catch (err) {
      console.error('[media-local] Error:', err);
      callback({ error: -2 });
    }
  });

  // 🌐 [ 로컬 이미지 및 미디어 서빙을 위한 media 프로토콜 핸들러 등록 ]
  protocol.handle('media', (request) => {
    try {
      const parsedUrl = new URL(request.url);
      const decodedPath = parsedUrl.searchParams.get('url');
      if (!decodedPath) {
        return new Response('URL parameter missing', { status: 400 });
      }
      
      // 🛡️ [웹 리소스 프록시 분기] 만약 http/https 외부 자원 주소인 경우, 오리진 CORS 제약 우회를 위해 메인 프로세스에서 fetch 대리 처리
      if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
        return net.fetch(decodedPath, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }).then(response => {
          const headers = new Headers(response.headers);
          headers.set('Access-Control-Allow-Origin', '*');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
        }).catch(err => {
          console.error('External media proxy error:', err);
          return new Response('External image load failed', { status: 502 });
        });
      }

      const found = findLocalImageFile(decodedPath);
      if (!found) {
        return new Response('File not found', { status: 404 });
      }
      let normalizedPath = found;
      
      const ext = path.extname(normalizedPath).toLowerCase();
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const stat = fs.statSync(normalizedPath);
      const fileSize = stat.size;
      const rangeHeader = request.headers.get('Range');
      const respHeaders = new Headers();
      respHeaders.set('Content-Type', contentType);
      respHeaders.set('Accept-Ranges', 'bytes');
      respHeaders.set('Access-Control-Allow-Origin', '*');

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          respHeaders.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          respHeaders.set('Content-Length', String(chunkSize));
          const stream = fs.createReadStream(normalizedPath, { start, end });
          return new Response(stream, { status: 206, headers: respHeaders });
        }
      }
      respHeaders.set('Content-Length', String(fileSize));
      return new Response(fs.createReadStream(normalizedPath), { status: 200, headers: respHeaders });
    } catch (err) {
      console.error('media protocol serve error:', err);
      return new Response('Error serving file', { status: 500 });
    }
  });

  // 윈도우 파일 연결 인수 검사
  checkFileArgument();

  // 백엔드 Express 서버 기동 생략 (순수 데스크톱 전환)
  createWindow(activePort);
});

app.on('window-all-closed', function () {
  // 모든 창이 닫히면 앱을 종료합니다 (백엔드 서버 포트도 함께 해제됨)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow(activePort);
  }
});

// 🔒 [ 순수 데스크톱 파일 제어 IPC 핸들러 등록 ]
let currentActiveWorkspacePath = null;

function findFileRecursive(dir, targetName, currentDepth = 0, maxDepth = 4) {
  if (currentDepth > maxDepth || !dir || !fs.existsSync(dir)) return null;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
        return path.join(dir, entry.name);
      }
      if (entry.isDirectory() && !['node_modules', '.git', '.next', '.vscode'].includes(entry.name)) {
        const found = findFileRecursive(path.join(dir, entry.name), targetName, currentDepth + 1, maxDepth);
        if (found) return found;
      }
    }
  } catch {}
  return null;
}

// 0. 초기 파일 연결 경로 조회 (renderer가 준비된 후 pull 방식으로 가져감)
ipcMain.handle('get-initial-file-path', () => {
  const path = filePathToOpen;
  filePathToOpen = null;
  return path;
});

// 0-1. 마지막 세션 데이터 저장 (오픈된 탭 파일 경로 목록 + 활성 탭 파일 경로)
ipcMain.handle('session:saveLastSession', (event, sessionData) => {
  try {
    const userDataPath = app.getPath('userData');
    const sessionPath = path.join(userDataPath, 'session.json');
    const data = {
      openFilePaths: sessionData?.openFilePaths || [],
      activeFilePath: sessionData?.activeFilePath || null,
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(sessionPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[session:saveLastSession] 오류:', e);
    return false;
  }
});

// 0-2. 마지막 세션 데이터 복원 (존재하는 파일들만 유효성 체크 후 반환)
ipcMain.handle('session:getLastSession', () => {
  try {
    const userDataPath = app.getPath('userData');
    const sessionPath = path.join(userDataPath, 'session.json');
    if (!fs.existsSync(sessionPath)) return null;
    const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    
    // 파일이 디스크에 실제 존재하고 있는 것만 필터링
    const validOpenPaths = (data?.openFilePaths || []).filter(filePath => 
      filePath && fs.existsSync(filePath)
    );
    const activePath = data?.activeFilePath;
    const validActivePath = (activePath && fs.existsSync(activePath)) ? activePath : null;

    return {
      openFilePaths: validOpenPaths,
      activeFilePath: validActivePath
    };
  } catch (e) {
    console.error('[session:getLastSession] 오류:', e);
    return null;
  }
});

// 2. 현재 파일 덮어쓰기 저장 핸들러
ipcMain.handle('file:save', async (event, filePath, content) => {
  try {
    let cleanPath = filePath.normalize('NFC');
    if (cleanPath.startsWith('file:///')) {
      cleanPath = decodeURIComponent(cleanPath.replace(/^file:\/\/\/?/, ''));
    }
    const normalized = cleanPath.replace(/\\/g, '/');
    if (/(?:^|\/)[^/]+\.asar(?:\/|$)/i.test(normalized)) throw new Error('앱에 포함된 문서는 덮어쓸 수 없습니다. 다른 이름으로 저장해 주세요.');
    if (path.isAbsolute(cleanPath) || /^[a-zA-Z]:\//.test(normalized) || cleanPath.startsWith('/')) {
      cleanPath = path.resolve(cleanPath);
    }
    fs.writeFileSync(cleanPath, content, 'utf-8');

    // 🛡️ [도움말 3중 미러 자동 동기화 - 재빌드 시 초기화 영구 방어]
    const isHelpDoc = /(?:^|\/)help\/[^/]+\.md$/i.test(normalized) || /^(?:HELP-[^/]+|00_시작하기)\.md$/i.test(path.basename(cleanPath));
    if (isHelpDoc) {
      const helpFileName = path.basename(cleanPath);
      const projectRoot = app.getAppPath();
      const mirrorPaths = [
        path.join(projectRoot, 'frontend/public/help', helpFileName),
        path.join(projectRoot, 'docs/help', helpFileName),
        path.join(projectRoot, 'frontend/out/help', helpFileName)
      ];
      for (const mPath of mirrorPaths) {
        try {
          const normMPath = path.resolve(mPath.normalize('NFC'));
          if (normMPath !== cleanPath) {
            const dir = path.dirname(normMPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(normMPath, content, 'utf-8');
          }
        } catch (mirrorErr) {
          console.warn('[file:save] 도움말 미러 동기화 경고:', mPath, mirrorErr.message);
        }
      }
    }

    return true;
  } catch (e) {
    console.error('로컬 파일 덮어쓰기 저장 실패:', e);
    throw e;
  }
});

// 3. 다른 이름으로 저장 핸들러 (워크스페이스 폴더 우선, suggestedName 및 커스텀 필터 지원)
ipcMain.handle('file:saveAs', async (event, content, suggestedName, defaultDir, filters) => {
  const defaultName = suggestedName || 'untitled.md';
  const cleanDefaultDir = defaultDir ? defaultDir.normalize('NFC') : undefined;
  const startDir = cleanDefaultDir && fs.existsSync(cleanDefaultDir) ? cleanDefaultDir : app.getPath('documents');
  const targetFilters = filters || [{ name: 'Markdown Files', extensions: ['md'] }];
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '다른 이름으로 저장',
    defaultPath: path.join(startDir, defaultName),
    filters: targetFilters
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = result.filePath.normalize('NFC');
  try {
    if (content.startsWith('data:') && content.includes(';base64,')) {
      const base64Data = content.split(';base64,')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return {
      name: path.basename(filePath),
      path: filePath
    };
  } catch (e) {
    console.error('로컬 다른 이름 저장 실패:', e);
    throw e;
  }
});

// 4.5 프론트엔드에서 저장 다이얼로그 호출
ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  if (!mainWindow) return { canceled: true };
  const settings = { ...options };
  if (settings.defaultPath && !path.isAbsolute(settings.defaultPath)) {
    settings.defaultPath = path.join(app.getPath('downloads'), path.basename(settings.defaultPath));
  }
  console.info('[Save dialog] requested');
  const result = await dialog.showSaveDialog(mainWindow, settings);
  return result;
});

ipcMain.handle('file:saveBinary', async (event, filePath, bytes) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !(bytes instanceof Uint8Array)) {
    throw new Error('파일 저장 경로나 데이터가 올바르지 않습니다.');
  }
  try {
    await fs.promises.writeFile(filePath, bytes);
  } catch (error) {
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      throw new Error(`파일을 저장할 수 없습니다. PDF 뷰어 등에서 '${path.basename(filePath)}' 파일을 닫은 후 다시 저장하거나 다른 파일 이름을 선택해 주세요. (${error.code})`);
    }
    throw error;
  }
  return { name: path.basename(filePath), path: filePath };
});

// 문서 전송은 원본·동명 파일을 덮어쓰지 않고 선택한 폴더 내부에 복사한다.
ipcMain.handle('file:readTransferFile', async (_event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('절대 파일 경로가 필요합니다.');
  return new Uint8Array(await fs.promises.readFile(filePath));
});
ipcMain.handle('file:writeTransferCopy', async (_event, folderPath, relativePath, bytes) => {
  if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath) || typeof relativePath !== 'string' || !(bytes instanceof Uint8Array)) throw new Error('전송 경로나 데이터가 올바르지 않습니다.');
  const root = path.resolve(folderPath);
  const destination = path.resolve(root, relativePath);
  const relative = path.relative(root, destination);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('선택한 폴더 밖으로 저장할 수 없습니다.');
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  const parsed = path.parse(destination);
  for (let index = 0; index < 10000; index++) {
    const candidate = index ? path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`) : destination;
    try {
      await fs.promises.writeFile(candidate, bytes, { flag: 'wx' });
      return { path: candidate, relativePath: path.relative(root, candidate).replace(/\\/g, '/'), reused: false };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await fs.promises.readFile(candidate);
      if (existing.equals(Buffer.from(bytes))) return { path: candidate, relativePath: path.relative(root, candidate).replace(/\\/g, '/'), reused: true };
    }
  }
  throw new Error('동일 이름 파일이 너무 많습니다.');
});

// 🛡️ [외부 웹 이미지 다운로드 브리지 (CORS 원천 우회)]
ipcMain.handle('net:fetchImageBlob', async (_event, imageUrl) => {
  if (typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl)) return null;
  try {
    const response = await net.fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType
    };
  } catch (err) {
    console.error('[net:fetchImageBlob failed]', err);
    return null;
  }
});

// 4. 프론트엔드에서 폴더 선택 다이얼로그 호출 시 OS 표준 창 띄우기
//    기본 경로는 사용자 Documents 폴더 혹은 전달받은 defaultPath
ipcMain.handle('dialog:selectMediaFile', async (_event, options = {}) => {
  const video = options.kind === 'video';
  const extensions = video ? ['mp4','webm','mov','ogg','m4v','avi','mkv'] : ['png','jpg','jpeg','gif','webp','svg','bmp','avif'];
  const start = typeof options.defaultPath === 'string' ? path.resolve(options.defaultPath.normalize('NFC')) : '';
  if (!start || !fs.existsSync(start) || !fs.statSync(start).isDirectory()) throw new Error('환경설정의 로컬 리소스 폴더를 확인해 주세요.');
  const result = await dialog.showOpenDialog(mainWindow,{title:video?'동영상 선택':'사진 선택',defaultPath:start,properties:['openFile'],filters:[{name:video?'동영상':'사진',extensions}]});
  if(result.canceled || !result.filePaths.length)return {canceled:true};
  const selected = result.filePaths[0];
  const extension = path.extname(selected).slice(1).toLowerCase();
  if(!extensions.includes(extension))throw new Error('지원하는 미디어 파일을 선택해 주세요.');
  if(video && (await fs.promises.stat(selected)).size > 100*1024*1024)throw new Error('동영상 크기는 100MB를 초과할 수 없습니다.');
  const types = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',ogg:'video/ogg',m4v:'video/mp4',avi:'video/x-msvideo',mkv:'video/x-matroska'};
  return {canceled:false,name:path.basename(selected),mimeType:types[extension],bytes:new Uint8Array(await fs.promises.readFile(selected))};
});

ipcMain.handle('dialog:chooseImportDocument', async (event, defaultPath) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return null;
  const start = typeof defaultPath === 'string' && path.isAbsolute(defaultPath) && fs.existsSync(defaultPath) && fs.statSync(defaultPath).isDirectory()
    ? defaultPath : app.getPath('documents');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '가져올 파일 선택', defaultPath: start, properties: ['openFile'],
    filters: [{ name: '지원 문서 (DOCX, HWP, PDF, EPUB, TXT, MD, HTML)', extensions: ['docx', 'hwp', 'pdf', 'epub', 'txt', 'md', 'markdown', 'html', 'htm'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const selectedPath = result.filePaths[0];
  return { path: selectedPath, name: path.basename(selectedPath) };
});

ipcMain.handle('dialog:selectFolder', async (event, defaultPath) => {
  if (!mainWindow) return { status: 'canceled' };
  
  // 💡 [요구사항 2] 전달받은 경로 문자열을 윈도우 파일 시스템 표준 경로구분자(path.sep)로 정밀 변환 및 NFC 노멀라이징 수행
  let cleanDefault = defaultPath ? defaultPath.normalize('NFC') : undefined;
  if (cleanDefault) {
    cleanDefault = path.resolve(cleanDefault.replace(/\//g, path.sep));
  }
  
  let startDir = cleanDefault && fs.existsSync(cleanDefault) && fs.statSync(cleanDefault).isDirectory()
    ? cleanDefault
    : app.getPath('documents');

  // Open inside the current workspace and accept directories only.
  const properties = ['openDirectory', 'createDirectory'];

  const result = await dialog.showOpenDialog(mainWindow, {
    title: defaultPath ? `워크스페이스 폴더 선택 - ${defaultPath}` : '워크스페이스 폴더 선택',
    defaultPath: startDir,
    properties: properties
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { status: 'canceled' };
  }
  const finalPath = result.filePaths[0];
  return { status: 'success', path: finalPath };
});

// 5. 절대 경로를 지정하여 직접 파일 내용 읽기
ipcMain.handle('file:readFromPath', async (event, filePath) => {
  const readStartedAt = Date.now();
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('유효하지 않은 파일 경로입니다.');
    }
    let cleanPath = filePath.normalize('NFC');
    if (cleanPath.startsWith('file:///')) {
      cleanPath = decodeURIComponent(cleanPath.slice(8));
    }
    
    // 윈도우 슬래시 스타일 포함하여 절대 경로 정밀 판별
    const normalizedPath = cleanPath.replace(/\\/g, '/');
    // Only explicit help URLs/names may resolve to bundled help. A missing
    // absolute workspace file must not silently open an installed namesake.
    const canUseBundledHelp = /^(?:\.?\/)?(?:docs\/)?help\/[^/]+\.md$/i.test(normalizedPath)
      || /^(?:HELP-[^/]+|00_시작하기)\.md$/i.test(normalizedPath);
    const isAbsolute = path.isAbsolute(cleanPath) || /^[a-zA-Z]:\//.test(normalizedPath) || cleanPath.startsWith('/');

    if (isAbsolute) {
      cleanPath = path.resolve(cleanPath);
    } else if (cleanPath.startsWith('docs/help/')) {
      const projectRoot = app.getAppPath();
      cleanPath = path.join(projectRoot, cleanPath).normalize('NFC');
    } else {
      // 🛡️ [상대경로/파일명 단독 유입 시 활성 워크스페이스 우선 탐색]:
      let foundPath = '';
      if (currentActiveWorkspacePath && fs.existsSync(currentActiveWorkspacePath)) {
        // 1) 워크스페이스 직접 조인
        const directCandidate = path.join(currentActiveWorkspacePath, cleanPath).normalize('NFC');
        if (fs.existsSync(directCandidate)) {
          foundPath = directCandidate;
        } else if (!/[\\/]/.test(cleanPath)) {
          // 2) 단일 파일명인 경우 워크스페이스 하위 재귀 탐색
          const targetBase = path.basename(cleanPath);
          const recursiveCandidate = findFileRecursive(currentActiveWorkspacePath, targetBase, 0, 5);
          if (recursiveCandidate) {
            foundPath = recursiveCandidate;
          }
        }
      }

      if (foundPath) {
        cleanPath = foundPath;
      } else if (canUseBundledHelp) {
        // 명시적인 도움말 요청만 앱 리소스에서 탐색
        const pathsToTry = [
          path.join(app.getAppPath(), 'frontend/public', filePath),
          path.join(app.getAppPath(), 'frontend/out', filePath),
          path.join(app.getAppPath(), filePath),
          path.join(process.resourcesPath, 'frontend/public', filePath),
          path.join(process.resourcesPath, 'frontend/out', filePath),
          path.join(process.resourcesPath, filePath)
        ];
        
        for (const p of pathsToTry) {
          const normalizedP = p.normalize('NFC');
          if (fs.existsSync(normalizedP)) {
            cleanPath = normalizedP;
            break;
          }
        }
      }
    }

    // 명시적인 도움말 요청만 설치 리소스로 연결합니다.
    // 없는 작업장 문서를 설치본의 동명 파일로 바꿔 열지 않습니다.
    if (!fs.existsSync(cleanPath) && canUseBundledHelp) {
      const targetFileName = path.basename(cleanPath);
      {
        const helpPathsToTry = [
          path.join(app.getAppPath(), 'frontend/public/help', targetFileName),
          path.join(app.getAppPath(), 'frontend/out/help', targetFileName),
          path.join(process.resourcesPath, 'frontend/public/help', targetFileName),
          path.join(process.resourcesPath, 'frontend/out/help', targetFileName),
          path.join(app.getAppPath(), 'docs/help', targetFileName)
        ];
        for (const hp of helpPathsToTry) {
          const normHp = hp.normalize('NFC');
          if (fs.existsSync(normHp)) {
            cleanPath = normHp;
            break;
          }
        }
      }
    }

    // 최종 검증
    if (!fs.existsSync(cleanPath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
    }
      
    const rawContent = await fs.promises.readFile(cleanPath, 'utf-8');
    let content = rawContent;
    try {
      content = require('./desktopInlineImages').externalizeInlineImages(rawContent, cleanPath);
    } catch (inlineErr) {
      // desktopInlineImages 모듈이 누락되었거나 처리 실패 시에도 파일 읽기는 원본 본문으로 무중단 반환
      content = rawContent;
    }
    const readMs = Date.now() - readStartedAt;
    if (readMs > 300) console.info('[STARTUP timing] document read ms=%d bytes=%d file=%s', readMs, Buffer.byteLength(rawContent, 'utf8'), path.basename(cleanPath));
    return {
      name: path.basename(cleanPath),
      path: cleanPath,
      content: content
    };
  } catch (e) {
    console.error('로컬 파일 절대경로 읽기 실패:', e.message || e);
    throw e;
  }
});

// 폴더 아래의 모든 .md / .markdown 파일을 재귀적으로 찾는 헬퍼 함수 (무시 폴더 필터 및 안정성 강화)
const IGNORED_SEARCH_DIRS = new Set([
  'node_modules', '.git', '.next', 'out', 'dist', 'build', '.wrangler',
  '_dev_api_backup', '.vscode', '.idea', 'scratch', '.next-web-build'
]);

function getAllMdFiles(dirPath, fileList = [], depth = 0, visitedDirs = new Set()) {
  if (depth > 12) return fileList; // 지나치게 깊은 재귀 탐색 방어
  try {
    if (!dirPath || typeof dirPath !== 'string' || !fs.existsSync(dirPath)) {
      return fileList;
    }
    let realDir = dirPath;
    try {
      realDir = fs.realpathSync(dirPath);
    } catch {}
    const normRealDir = realDir.toLowerCase();
    if (visitedDirs.has(normRealDir)) return fileList;
    visitedDirs.add(normRealDir);

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryName = entry.name;
      const fullEntryPath = path.join(dirPath, entryName);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stat = fs.statSync(fullEntryPath);
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          continue;
        }
      }
      if (isDir) {
        const lowerName = entryName.toLowerCase();
        if (lowerName.startsWith('.') || IGNORED_SEARCH_DIRS.has(lowerName)) {
          continue;
        }
        getAllMdFiles(fullEntryPath, fileList, depth + 1, visitedDirs);
      } else if (isFile) {
        const lowerName = entryName.toLowerCase();
        if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.bib')) {
          fileList.push(fullEntryPath);
        }
      }
    }
  } catch (e) {
    console.error('폴더 스캔 에러:', e?.message || e);
  }
  return fileList;
}

// 6. 드라이브 목록 조회 (Windows 탐색기)
ipcMain.handle('file:getDrives', async () => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('wmic logicaldisk get caption 2>nul').toString();
    return output.split('\n').slice(1).map(s => s.trim()).filter(s => s.length > 0);
  } catch (e) {
    const drives = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ':\\';
      try {
        if (fs.existsSync(letter)) drives.push(letter);
      } catch (ex) {}
    }
    return drives;
  }
});



// 워크스페이스 실시간 감지 (chokidar)
let workspaceWatcher = null;
let workspaceNotifyTimer = null;
ipcMain.handle('file:watchWorkspace', (event, workspacePath) => {
  try {
    if (workspaceWatcher) {
      workspaceWatcher.close();
      workspaceWatcher = null;
    }
    if (workspaceNotifyTimer) {
      clearTimeout(workspaceNotifyTimer);
      workspaceNotifyTimer = null;
    }
    if (!workspacePath) return { success: false, error: '경로 없음' };

    const cleanPath = path.resolve(workspacePath.replace(/^file:\/\/\/?/, '')).normalize('NFC');
    if (!fs.existsSync(cleanPath)) {
      return { success: false, error: '경로가 존재하지 않음: ' + cleanPath };
    }

    workspaceWatcher = chokidar.watch(cleanPath, {
      ignored: [/(^|[\/])\../, '**/node_modules/**', '**/.git/**', '**/.next/**', '**/.vscode/**'],
      persistent: true,
      ignoreInitial: true,
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 100
      }
    });

    const notify = () => {
      if (workspaceNotifyTimer) clearTimeout(workspaceNotifyTimer);
      workspaceNotifyTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('workspace-changed');
        }
      }, 300);
    };

    workspaceWatcher
      .on('add', notify)
      .on('unlink', notify)
      .on('addDir', notify)
      .on('unlinkDir', notify)
      .on('change', notify)
      .on('error', (error) => {
        // Cloud-backed drives can temporarily reject lstat while syncing.
        // Handle the asynchronous watcher error so Electron does not crash.
        console.warn('[Workspace watcher] 파일 변경 감지 오류:', error);
        notify();
      });

    return { success: true };
  } catch (e) {
    console.error('watchWorkspace 오류:', e);
    return { success: false, error: e.message };
  }
});

// 7. 디렉토리 파일 목록 조회 (Windows 탐색기)
ipcMain.handle('file:listDirectory', async (event, dirPath) => {
  try {
    const cleanPath = dirPath.normalize('NFC');
    if (!currentActiveWorkspacePath || !cleanPath.startsWith(currentActiveWorkspacePath)) {
      currentActiveWorkspacePath = cleanPath;
    }
    const entries = fs.readdirSync(cleanPath, { withFileTypes: true });
    const nodes = entries
      .filter(entry => {
        const ignoredDirs = ['node_modules', '.git', '.next', '.vscode', 'out', 'dist', 'build', '.next-web-build', '.wrangler', '_dev_api_backup', 'release', '.idea'];
        if (ignoredDirs.includes(entry.name.toLowerCase())) return false;
        if (entry.isDirectory() && entry.name.toLowerCase() === 'help' && (cleanPath.replace(/\\/g, '/').toLowerCase().endsWith('/docs') || cleanPath.replace(/\\/g, '/').toLowerCase().endsWith('docs'))) return false;
        if (entry.isFile()) {
          const nameLower = entry.name.toLowerCase();
          return nameLower.endsWith('.md') || nameLower.endsWith('.markdown') || nameLower.endsWith('.bib');
        }
        return true;
      })
      .map(entry => {
        const fullPath = path.join(cleanPath, entry.name);
        if (entry.isDirectory()) {
          return { name: entry.name, kind: 'directory', path: fullPath };
        } else {
          return { name: entry.name, kind: 'file', path: fullPath };
        }
      })
      .sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name, 'ko', { numeric: true });
        return a.kind === 'directory' ? -1 : 1;
      });
    return nodes;
    } catch (e) {
      if (['ENOENT', 'EPERM', 'EBUSY', 'EACCES'].includes(e.code) || !fs.existsSync(cleanPath)) {
        // 폴더가 삭제/이동된 직후이거나 가상/클라우드 드라이브(구글드라이브 등) 일시 잠금 시 빈 목록 반환하여 크래시 방지
        return [];
      }
      console.error(`[Electron] listDirectory 오류 - 경로: [${dirPath}]:`, e);
      throw e;
    }
});

// 9. 파일/폴더 이름 변경
ipcMain.handle('file:rename', async (event, oldPath, newPath) => {
  try {
    const cleanOld = oldPath.normalize('NFC');
    const cleanNew = newPath.normalize('NFC');
    if (!fs.existsSync(cleanOld)) {
      return { success: true, skipped: true };
    }
    const destDir = path.dirname(cleanNew);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    try {
      fs.renameSync(cleanOld, cleanNew);
    } catch (renameErr) {
      const stat = fs.statSync(cleanOld);
      if (stat.isDirectory()) {
        fs.cpSync(cleanOld, cleanNew, { recursive: true });
        fs.rmSync(cleanOld, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } else {
        fs.copyFileSync(cleanOld, cleanNew);
        fs.unlinkSync(cleanOld);
      }
    }
    return { success: true };
  } catch (e) {
    console.error('파일 이름 변경 실패:', e);
    throw e;
  }
});

// 9-1. 파일/폴더 복사 (Copy & Paste)
ipcMain.handle('file:copy', async (event, srcPath, destPath) => {
  try {
    const cleanSrc = srcPath.normalize('NFC');
    let cleanDest = destPath.normalize('NFC');

    if (!fs.existsSync(cleanSrc)) {
      throw new Error(`원본 파일 또는 폴더가 존재하지 않습니다: ${cleanSrc}`);
    }

    const srcStat = fs.statSync(cleanSrc);
    const isDir = srcStat.isDirectory();

    // 만약 대상 경로에 이미 파일이나 폴더가 존재하면 중복 방지 이름 생성
    if (fs.existsSync(cleanDest)) {
      const parsed = path.parse(cleanDest);
      const ext = isDir ? '' : parsed.ext;
      const base = isDir ? parsed.base : parsed.name;
      const dir = parsed.dir;

      let counter = 1;
      let candidate = path.join(dir, `${base}_copy${ext}`);
      while (fs.existsSync(candidate)) {
        counter++;
        candidate = path.join(dir, `${base}_copy${counter}${ext}`);
      }
      cleanDest = candidate;
    }

    // 대상 부모 디렉토리가 없으면 생성
    const destParent = path.dirname(cleanDest);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }

    if (isDir) {
      fs.cpSync(cleanSrc, cleanDest, { recursive: true });
    } else {
      fs.copyFileSync(cleanSrc, cleanDest);
    }

    return { success: true, newPath: cleanDest };
  } catch (e) {
    console.error('파일/폴더 복사 실패:', e);
    throw e;
  }
});

// 9-2. 파일/폴더 이동 (Cut & Paste / Move)
ipcMain.handle('file:move', async (event, srcPath, destPath, options) => {
  try {
    const cleanSrc = srcPath.normalize('NFC');
    let cleanDest = destPath.normalize('NFC');
    if (options?.failIfExists && fs.existsSync(cleanDest)) throw new Error('원래 위치에 같은 이름의 항목이 있습니다. 이름을 변경한 뒤 다시 되돌려 주세요.');

    if (!fs.existsSync(cleanSrc)) {
      throw new Error(`원본 파일 또는 폴더가 존재하지 않습니다: ${cleanSrc}`);
    }

    const srcStat = fs.statSync(cleanSrc);
    const isDir = srcStat.isDirectory();

    // 대상 부모 디렉토리가 없으면 생성
    const destParent = path.dirname(cleanDest);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }

    // 동일 경로인 경우 스킵
    if (path.resolve(cleanSrc) === path.resolve(cleanDest)) {
      return { success: true, newPath: cleanDest };
    }

    try {
      fs.renameSync(cleanSrc, cleanDest);
    } catch (renameErr) {
      // 드라이브 간 이동 또는 EXDEV 에러 시 fallback
      if (isDir) {
        fs.cpSync(cleanSrc, cleanDest, { recursive: true });
        fs.rmSync(cleanSrc, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } else {
        fs.copyFileSync(cleanSrc, cleanDest);
        fs.unlinkSync(cleanSrc);
      }
    }

    return { success: true, newPath: cleanDest };
  } catch (e) {
    console.error('파일/폴더 이동 실패:', e);
    throw e;
  }
});

// ====================================================================
// 📊 [OMD-MAIN-main-0003] main.js ➔ system:openPath & system:showItemInFolder
// 🎯 @KICK  : 지정 폴더/파일을 운영체제 기본 파일 탐색기(Windows Explorer / macOS Finder)로 열기
// 🛡️ @GUARD : 경로 유효성 검증, shell.openPath / shell.showItemInFolder 호출
// 🚨 @PATCH : 2026-09-16 — 루트 및 탐색기에서 시스템 파일 탐색기/Finder 열기 IPC 신규 추가
// 🔗 @CALLS : shell.openPath, shell.showItemInFolder
// ====================================================================
ipcMain.handle('system:openPath', async (event, targetPath) => {
  try {
    if (!targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
    const { shell } = require('electron');
    const cleanPath = targetPath.replace(/^file:\/\/\/?/, '').normalize('NFC');
    const fullPath = path.resolve(decodeURIComponent(cleanPath));
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: '경로가 존재하지 않습니다: ' + fullPath };
    }
    const err = await shell.openPath(fullPath);
    if (err) {
      return { success: false, error: err };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('system:showItemInFolder', async (event, targetPath) => {
  try {
    if (!targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
    const { shell } = require('electron');
    const cleanPath = targetPath.replace(/^file:\/\/\/?/, '').normalize('NFC');
    const fullPath = path.resolve(decodeURIComponent(cleanPath));
    shell.showItemInFolder(fullPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 10. 파일/폴더 삭제
ipcMain.handle('file:delete', async (event, targetPath) => {
  try {
    const cleanPath = targetPath.normalize('NFC');
    if (!fs.existsSync(cleanPath)) {
      return { success: true, alreadyDeleted: true };
    }
    const stat = fs.statSync(cleanPath);
    if (stat.isDirectory()) {
      fs.rmSync(cleanPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } else {
      fs.unlinkSync(cleanPath);
    }
    return { success: true };
  } catch (e) {
    console.error('파일/폴더 삭제 1차 실패, force 재시도:', e);
    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        return { success: true };
      }
    } catch (retryErr) {
      console.error('파일/폴더 삭제 2차 실패:', retryErr);
      throw retryErr;
    }
    return { success: true };
  }
});

// 10-1. 폴더 삭제 되돌리기(Undo) 지원을 위한 임시 백업
ipcMain.handle('file:backupFolderForUndo', async (event, folderPath) => {
  try {
    if (!folderPath) return { success: false, error: '경로가 비어있습니다.' };
    const cleanPath = folderPath.normalize('NFC');
    if (!fs.existsSync(cleanPath)) return { success: false, error: '경로가 존재하지 않습니다: ' + cleanPath };
    const stat = fs.statSync(cleanPath);
    if (!stat.isDirectory()) return { success: false, error: '디렉토리가 아닙니다.' };

    const backupBase = path.join(app.getPath('temp'), 'onrivi_undo_backups');
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tempDir = path.join(backupBase, backupId);
    fs.mkdirSync(tempDir, { recursive: true });

    const folderName = path.basename(cleanPath);
    const backupDest = path.join(tempDir, folderName);
    fs.cpSync(cleanPath, backupDest, { recursive: true });

    return { success: true, backupPath: backupDest };
  } catch (e) {
    console.error('폴더 삭제 백업 실패:', e);
    return { success: false, error: e.message };
  }
});

// 10-2. 폴더 삭제 되돌리기(Undo) 복원
ipcMain.handle('file:restoreFolderFromUndo', async (event, backupPath, targetPath) => {
  try {
    if (!backupPath || !targetPath) return { success: false, error: '경로가 유효하지 않습니다.' };
    const cleanBackup = backupPath.normalize('NFC');
    const cleanTarget = targetPath.normalize('NFC');
    if (!fs.existsSync(cleanBackup)) return { success: false, error: '백업 디렉토리가 존재하지 않습니다: ' + cleanBackup };
    if (fs.existsSync(cleanTarget)) return { success: false, error: '복원할 위치에 같은 이름의 항목이 이미 있습니다.' };

    const targetParent = path.dirname(cleanTarget);
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }

    fs.cpSync(cleanBackup, cleanTarget, { recursive: true });
    return { success: true };
  } catch (e) {
    console.error('폴더 삭제 복원 실패:', e);
    return { success: false, error: e.message };
  }
});

// 11. 새 파일 생성
ipcMain.handle('file:createFile', async (event, parentPath, name) => {
  try {
    const cleanParent = parentPath.normalize('NFC');
    const cleanName = name.normalize('NFC');
    const fullPath = path.join(cleanParent, cleanName);
    fs.writeFileSync(fullPath, '', { encoding: 'utf-8', flag: 'wx' });
    return { success: true, path: fullPath };
  } catch (e) {
    console.error('파일 생성 실패:', e);
    throw e;
  }
});

// 12. 새 폴더 생성
ipcMain.handle('file:createFolder', async (event, parentPath, name) => {
  try {
    const cleanParent = parentPath.normalize('NFC');
    const cleanName = name.normalize('NFC');
    const fullPath = path.join(cleanParent, cleanName);
    fs.mkdirSync(fullPath, { recursive: true });
    return { success: true, path: fullPath };
  } catch (e) {
    console.error('폴더 생성 실패:', e);
    throw e;
  }
});

// 13. 폴더 아래의 모든 마크다운 파일 내용 검색 (안전성·경로해석·유니코드 NFC 정규화 및 예외 격리 보강)
ipcMain.handle('file:searchInFolder', async (event, { folderPath, searchTerm, matchCase, useRegex }) => {
  try {
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      return [];
    }

    // 1) 검색 대상 폴더 경로 정규화 및 활성 작업장 경로 해석
    let resolvedFolder = typeof folderPath === 'string' ? folderPath.trim() : '';
    if (resolvedFolder.startsWith('file:///')) {
      try { resolvedFolder = decodeURIComponent(resolvedFolder.replace(/^file:\/\/\//, '')); } catch {}
    }

    const isValidDir = (p) => {
      if (!p || typeof p !== 'string' || p.startsWith('GoogleDrive') || p === '브라우저 저장소') return false;
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    };

    if (!isValidDir(resolvedFolder)) {
      let fallbackFolder = '';
      if (currentActiveWorkspacePath && isValidDir(currentActiveWorkspacePath)) {
        if (resolvedFolder && !resolvedFolder.startsWith('GoogleDrive')) {
          const candidate = path.join(currentActiveWorkspacePath, resolvedFolder);
          fallbackFolder = isValidDir(candidate) ? candidate : currentActiveWorkspacePath;
        } else {
          fallbackFolder = currentActiveWorkspacePath;
        }
      }
      if (!fallbackFolder) {
        try {
          const settingsPath = path.join(app.getPath('userData'), 'settings.json');
          if (fs.existsSync(settingsPath)) {
            const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            if (saved?.localWorkspaceFolder && isValidDir(saved.localWorkspaceFolder)) {
              fallbackFolder = saved.localWorkspaceFolder;
              currentActiveWorkspacePath = fallbackFolder;
            }
          }
        } catch {}
      }
      resolvedFolder = fallbackFolder;
    } else {
      currentActiveWorkspacePath = resolvedFolder;
    }

    if (!isValidDir(resolvedFolder)) {
      return [];
    }

    const mdFiles = getAllMdFiles(resolvedFolder);
    const results = [];

    const normalizedSearchTerm = searchTerm.normalize('NFC');
    let regex;
    const escaped = normalizedSearchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (useRegex) {
      try {
        regex = new RegExp(normalizedSearchTerm, matchCase ? 'g' : 'gi');
      } catch(e) {
        regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
      }
    } else {
      regex = new RegExp(escaped, matchCase ? 'g' : 'gi');
    }

    for (const filePath of mdFiles) {
      try {
        const fileName = path.basename(filePath).normalize('NFC');
        const fileNameWithoutExt = path.basename(filePath, path.extname(filePath)).normalize('NFC');
        let content = '';
        try {
          content = fs.readFileSync(filePath, 'utf-8').normalize('NFC');
        } catch {
          // 잠긴 파일, 바이너리 또는 권한 문제 시 개별 skip
          continue;
        }
        const lines = content.split(/\r?\n/);
        const snippets = [];
        const lineNumbers = [];
        let fileNameMatched = false;

        // 파일명 검사
        regex.lastIndex = 0;
        if (regex.test(fileName)) {
          fileNameMatched = true;
        } else {
          regex.lastIndex = 0;
          if (regex.test(fileNameWithoutExt)) {
            fileNameMatched = true;
          }
        }

        // 내용 검사
        lines.forEach((line, index) => {
          regex.lastIndex = 0;
          if (regex.test(line)) {
            snippets.push(`Line ${index + 1}: ${line.trim()}`);
            lineNumbers.push(index + 1);
          }
        });

        if (snippets.length > 0) {
          results.push({
            fileName,
            path: filePath,
            count: snippets.length,
            snippets,
            lineNumbers
          });
        } else if (fileNameMatched) {
          results.push({
            fileName,
            path: filePath,
            count: 0,
            snippets: [],
            lineNumbers: [],
            fileNameMatch: true
          });
        }
      } catch (fileErr) {
        // 개별 파일 처리 실패 시 전체 프로세스 중단 방지
        continue;
      }
    }
    return results;
  } catch (e) {
    console.error("폴더 전역 검색 에러:", e?.message || e);
    return [];
  }
});

// 14. OS 네이티브 폰트 공통 대화상자 호출 핸들러 (PowerShell 활용)
ipcMain.handle('dialog:openFontPicker', async () => {
  return new Promise((resolve) => {
    // 🔒 PowerShell을 사용하여 윈도우 순정 FontDialog 호출
    // Win32 API SetThreadPreferredUILanguages 및 SetThreadUILanguage를 결합하여
    // 영문 윈도우 OS나 시스템 로케일에 상관없이 대화상자 리소스를 '한국어'로 완전 강제 로드하도록 수술합니다.
    const command = `powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing'); [void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); Add-Type -MemberDefinition ('[DllImport(' + [char]34 + 'kernel32.dll' + [char]34 + ', CharSet=System.Runtime.InteropServices.CharSet.Unicode)] public static extern bool SetThreadPreferredUILanguages(uint dwFlags, string pwszLanguagesBuffer, ref uint pulNumLanguages);') -Name 'Mui' -Namespace 'Win32' -PassThru | Out-Null; $n = 0; [Win32.Mui]::SetThreadPreferredUILanguages(8, 'ko-KR' + [char]0, [ref]$n); [System.Threading.Thread]::CurrentThread.CurrentCulture = New-Object System.Globalization.CultureInfo('ko-KR'); [System.Threading.Thread]::CurrentThread.CurrentUICulture = New-Object System.Globalization.CultureInfo('ko-KR'); Add-Type -MemberDefinition ('[DllImport(' + [char]34 + 'kernel32.dll' + [char]34 + ')] public static extern ushort SetThreadUILanguage(ushort LangId);') -Name 'Kernel32' -Namespace 'Win32' -PassThru | Out-Null; [Win32.Kernel32]::SetThreadUILanguage(1042); $d = New-Object System.Windows.Forms.FontDialog; $d.Font = New-Object System.Drawing.Font('맑은 고딕', 10); $d.ShowColor = $false; if($d.ShowDialog() -eq 'OK') { Write-Output ($d.Font.Name + '|' + $d.Font.Size) } else { Write-Output 'cancel' }"`
    
    const { exec } = require('child_process');
    exec(command, (error, stdout) => {
      if (error || !stdout || stdout.trim() === 'cancel') {
        resolve(null);
        return;
      }
      const [family, size] = stdout.trim().split('|');
      resolve(JSON.stringify({ family, size: parseFloat(size) || 13 }));
    });
  });
});

// 15. Windows/macOS 네이티브 시스템 이모지 피커 호출 핸들러
ipcMain.handle('system:showEmojiPicker', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
    if (process.platform === 'win32') {
      return await require('./desktopEmojiPicker.cjs').showWindowsEmojiPicker();
    }
    if (typeof app.showEmojiPanel === 'function') {
      app.showEmojiPanel();
      return true;
    }
    return false;
  } catch (e) {
    console.error("네이티브 이모지 패널 호출 실패:", e);
    return false;
  }
});

// 15. 라이선스 키 로드 핸들러 (데스크탑 영구 저장 연동)
ipcMain.handle('license:load', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const licenseFilePath = path.join(userDataPath, '.license');
    if (fs.existsSync(licenseFilePath)) {
      return fs.readFileSync(licenseFilePath, 'utf-8').trim();
    }
    return null;
  } catch (e) {
    console.error('라이선스 키 로드 실패:', e);
    return null;
  }
});

// 16. 라이선스 키 저장 핸들러 (데스크탑 영구 저장 연동)
ipcMain.handle('license:save', async (event, licenseKey) => {
  try {
    const userDataPath = app.getPath('userData');
    const licenseFilePath = path.join(userDataPath, '.license');
    fs.writeFileSync(licenseFilePath, licenseKey, 'utf-8');
    return true;
  } catch (e) {
    console.error('라이선스 키 저장 실패:', e);
    return false;
  }
});

// 하이브리드 라이선스 전체 정보 로드 핸들러
ipcMain.handle('license:load-full', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const licenseJsonPath = path.join(userDataPath, 'license.json');
    if (fs.existsSync(licenseJsonPath)) {
      const raw = fs.readFileSync(licenseJsonPath, 'utf-8');
      return JSON.parse(raw);
    }
    return null;
  } catch (e) {
    console.error('라이선스 전체 정보 로드 실패:', e);
    return null;
  }
});

// 하이브리드 라이선스 전체 정보 저장 핸들러
ipcMain.handle('license:save-full', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const licenseJsonPath = path.join(userDataPath, 'license.json');
    fs.writeFileSync(licenseJsonPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('라이선스 전체 정보 저장 실패:', e);
    return false;
  }
});

// 물리 기기 고유 ID 수집 핸들러
ipcMain.handle('license:get-device-id', async () => {
  if (process.platform === 'win32') {
    return (await getMcpDeviceId()) || 'fallback-machine-id-win32';
  }
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'darwin') {
      const output = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { encoding: 'utf-8' });
      return output.trim();
    } else {
      const output = fs.readFileSync('/var/lib/dbus/machine-id', 'utf-8');
      return output.trim();
    }
  } catch (err) {
    console.error('물리 기기 ID 획득 실패:', err);
  }
  return 'fallback-machine-id-' + process.platform;
});

// 23. 파일명 클립보드에 복사 API
ipcMain.handle('clipboard:copyText', (event, text) => {
  try {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 23.4. 클립보드 HTML 서식 및 텍스트 동시 복사 API (OS 시스템 클립보드에 CF_HTML 서식 직접 기록)
ipcMain.handle('clipboard:writeHtml', (event, { html, text }) => {
  try {
    const { clipboard } = require('electron');
    clipboard.write({
      html: html || '',
      text: text || ''
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 23.5. 네이티브 클립보드 이미지 쓰기 API (OS 시스템 클립보드에 비트맵 직접 복사)
ipcMain.handle('clipboard:writeImage', async (event, source) => {
  try {
    const { clipboard, nativeImage } = require('electron');
    if (!source || typeof source !== 'string') {
      return { success: false, error: '유효한 이미지 소스가 아닙니다.' };
    }

    let trimmed = source.trim();
    // 1) 마크다운 이미지 구문인 경우 안쪽 경로만 추출 (![alt](path))
    const mdMatch = trimmed.match(/^!\[.*?\]\((.*?)\)$/);
    if (mdMatch) {
      trimmed = mdMatch[1].trim();
    }
    // 쿼리 파라미터 분리 (예: ?align=center&width=600, ?v=12345)
    const cleanPathOrUrl = trimmed.split('?')[0].trim();

    let img = null;

    // 2) Data URL인 경우
    if (cleanPathOrUrl.startsWith('data:image/')) {
      img = nativeImage.createFromDataURL(trimmed);
    }
    // 3) HTTP / HTTPS 웹 이미지인 경우
    else if (/^https?:\/\//i.test(cleanPathOrUrl)) {
      try {
        const { net } = require('electron');
        const response = await net.fetch(trimmed);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          img = nativeImage.createFromBuffer(Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.warn('[clipboard:writeImage] 원격 이미지 다운로드 실패:', err);
      }
    }
    // 4) 로컬 파일 경로인 경우
    else {
      let candidate = cleanPathOrUrl.normalize('NFC');
      if (candidate.startsWith('file:///')) {
        candidate = decodeURIComponent(candidate.replace('file:///', ''));
        if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(candidate)) {
          candidate = candidate.slice(1);
        }
      }

      let resolvedPath = candidate;
      if (!fs.existsSync(resolvedPath)) {
        // 상대 경로 탐색: 설정 파일의 resourceFolder, workspacePath 등 확인
        let settings = {};
        try {
          const settingsPath = path.join(app.getPath('userData'), 'settings.json');
          if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          }
        } catch (_) {}

        const normalizedRelative = candidate.replace(/^[/\\]+/, '');
        const candidateBase = path.basename(candidate);

        const candidateBases = [
          settings.resourceFolder,
          settings.resourceFolder ? path.join(settings.resourceFolder, 'media') : null,
          settings.workspacePath,
          settings.workspacePath ? path.join(settings.workspacePath, 'media') : null,
          process.cwd(),
          path.join(__dirname, 'frontend/out'),
          path.join(__dirname, 'frontend/public')
        ].filter(Boolean);

        for (const base of candidateBases) {
          const p1 = path.resolve(base, normalizedRelative);
          const p2 = path.resolve(base, candidateBase);
          const p3 = path.resolve(base, 'media', candidateBase);
          if (fs.existsSync(p1)) { resolvedPath = p1; break; }
          if (fs.existsSync(p2)) { resolvedPath = p2; break; }
          if (fs.existsSync(p3)) { resolvedPath = p3; break; }
        }
      }

      if (fs.existsSync(resolvedPath)) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext === '.svg') {
          const svgContent = fs.readFileSync(resolvedPath);
          img = nativeImage.createFromBuffer(svgContent);
        } else {
          img = nativeImage.createFromPath(resolvedPath);
        }
      }
    }

    if (!img || img.isEmpty()) {
      return { success: false, error: '유효한 비트맵 이미지를 생성하지 못했습니다.' };
    }

    clipboard.writeImage(img);
    return { success: true };
  } catch (err) {
    console.error('clipboard:writeImage 오류:', err);
    return { success: false, error: err.message };
  }
});

// 24. 클립보드에서 네이티브 이미지 읽기 API (윈도우 캡쳐/탐색기 파일 복사/비트맵 직접 복원)
function readNativeClipboardImage(preferDocument = false) {
  try {
    const { clipboard } = require('electron');
    if (preferDocument) {
      const html = clipboard.readHTML() || '';
      const text = (clipboard.readText() || '').trim();
      const nativeFiles = clipboard.availableFormats().some(format => /^(FileNameW|CF_HDROP|HDROP|FileDrop)$/i.test(format));
      const imagePath = text && /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(text) && fs.existsSync(text);
      // Ctrl+V must let the DOM paste event handle a document, even when the
      // OS also publishes a bitmap representation of that same document.
      if (html.trim() || (text && !nativeFiles && !imagePath)) return null;
    }
    // 1. 네이티브 비트맵 이미지 확인 (윈도우 캡처, 그림판, 브라우저 이미지 복사 등)
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      return image.toDataURL();
    }
    // 2. 윈도우 탐색기 파일 복사(Ctrl+C) 확인 (FileNameW / CF_HDROP)
    if (process.platform === 'win32') {
      try {
        const rawBuf = clipboard.readBuffer('FileNameW');
        if (rawBuf && rawBuf.length > 0) {
          const filePath = rawBuf.toString('ucs2').replace(/\0.*$/, '').trim();
          if (filePath && fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase().replace('.', '');
            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
              const fileData = fs.readFileSync(filePath);
              const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
              return `data:${mime};base64,${fileData.toString('base64')}`;
            }
          }
        }
      } catch (_) {}
    }
    // Explorer can publish DROPFILES rather than FileNameW.
    if (process.platform === 'win32') {
      for (const format of ['CF_HDROP', 'HDROP', 'FileDrop']) {
        try {
          const buffer = clipboard.readBuffer(format);
          if (buffer.length < 20) continue;
          const offset = buffer.readUInt32LE(0);
          if (offset < 20 || offset >= buffer.length) continue;
          const encoding = buffer.readUInt32LE(16) ? 'utf16le' : 'latin1';
          for (const candidate of buffer.subarray(offset).toString(encoding).split('\0').filter(Boolean)) {
            const extension = path.extname(candidate).toLowerCase().slice(1);
            if (!['png','jpg','jpeg','gif','webp','svg','bmp','ico','avif'].includes(extension) || !fs.existsSync(candidate)) continue;
            const mime = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
            return `data:${mime};base64,${fs.readFileSync(candidate).toString('base64')}`;
          }
        } catch (_) {}
      }
    }
    // 3. 파일 경로 텍스트 확인 (파일 복사 경로 문자열 폴백)
    const text = (clipboard.readText() || '').trim();
    if (text && fs.existsSync(text)) {
      const ext = path.extname(text).toLowerCase().replace('.', '');
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext)) {
        const fileData = fs.readFileSync(text);
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        return `data:${mime};base64,${fileData.toString('base64')}`;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}
ipcMain.handle('clipboard:readImage', () => readNativeClipboardImage());
ipcMain.on('clipboard:readImageSync', event => { event.returnValue = readNativeClipboardImage(true); });

// 시스템 브라우저 외부 링크 실행 핸들러
ipcMain.handle('system:openExternal', async (event, url) => {
  try {
    const { shell } = require('electron');
    shell.openExternal(url);
    return true;
  } catch (e) {
    console.error('외부 링크 기동 실패:', e);
    return false;
  }
});

// 17. 환경설정 로드 핸들러 (데스크탑 영구 저장 연동)
ipcMain.handle('settings:load', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsFilePath = path.join(userDataPath, 'settings.json');
    if (fs.existsSync(settingsFilePath)) {
      return JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
    }
    return null;
  } catch (e) {
    console.error('환경설정 로드 실패:', e);
    return null;
  }
});

// MCP reads only this short-lived snapshot of the active desktop folders.
const mcpContextFile = () => path.join(app.getPath('userData'), 'mcp-context.json');
let mcpDeviceIdPromise;
const getMcpDeviceId = () => {
  if (mcpDeviceIdPromise) return mcpDeviceIdPromise;
  if (process.platform !== 'win32') return Promise.resolve(null);
  mcpDeviceIdPromise = new Promise(resolve => {
    const { execFile } = require('child_process');
    execFile('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID'],
      { encoding: 'utf8', timeout: 5000 }, (error, output) => {
        const id = !error ? output.trim() : '';
        if (!/^[a-f0-9-]{36}$/i.test(id)) mcpDeviceIdPromise = null;
        resolve(/^[a-f0-9-]{36}$/i.test(id) ? id : null);
      });
  });
  return mcpDeviceIdPromise;
};
ipcMain.handle('mcp-context:sync', async (event, context) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('INVALID_MCP_CONTEXT_SENDER');
  const deviceId = await getMcpDeviceId();
  const validPath = value => typeof value === 'string' && path.isAbsolute(value) && fs.existsSync(value) && fs.statSync(value).isDirectory();
  const snapshot = {
    version: 1,
    workspaceType: context?.workspaceType === 'cloud' ? 'cloud' : context?.workspaceType === 'browser' ? 'browser' : 'local',
    resourceKind: context?.resourceKind === 'drive' ? 'drive' : context?.resourceKind === 'browser' ? 'browser' : context?.resourceKind === 'local' ? 'local' : 'unset',
    workspacePath: context?.workspaceType === 'local' && validPath(context?.workspacePath) ? path.resolve(context.workspacePath) : null,
    resourcePath: context?.resourceKind === 'local' && validPath(context?.resourcePath) ? path.resolve(context.resourcePath) : null,
    deviceId,
    pid: process.pid,
    updatedAt: new Date().toISOString()
  };
  const target = mcpContextFile();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(snapshot), 'utf8');
  fs.renameSync(temporary, target);
  return { synced: true, localReady: !!(snapshot.workspacePath && snapshot.resourcePath) };
});
app.on('before-quit', () => { try { fs.unlinkSync(mcpContextFile()); } catch {} });

// MCP 타겟(Google Gemini, Claude Desktop) 자동 감지 및 설정 관리
const copyDirectoryRecursiveSync = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursiveSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const resolveMcpPluginRoot = () => {
  const userPluginDir = path.join(app.getPath('userData'), 'plugins', 'onrivi-author');

  // 1순위: 데스크톱 설치 경로의 extraResources (예: C:/Program Files/Onrivi Author/resources/plugins/onrivi-author)
  if (process.resourcesPath) {
    const extraResPath = path.join(process.resourcesPath, 'plugins', 'onrivi-author');
    if (fs.existsSync(path.join(extraResPath, 'server', 'index.mjs'))) {
      try { copyDirectoryRecursiveSync(extraResPath, userPluginDir); } catch (_) {}
      return extraResPath.replace(/\\/g, '/');
    }
    // 2순위: 데스크톱 설치 경로의 asarUnpack (예: C:/Program Files/Onrivi Author/resources/app.asar.unpacked/plugins/onrivi-author)
    const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'plugins', 'onrivi-author');
    if (fs.existsSync(path.join(unpackedPath, 'server', 'index.mjs'))) {
      try { copyDirectoryRecursiveSync(unpackedPath, userPluginDir); } catch (_) {}
      return unpackedPath.replace(/\\/g, '/');
    }
  }

  // 3순위: 패키징된 앱에서 userData(AppData/Roaming/Onrivi Author/plugins/onrivi-author)로 추출 및 동기화
  const bundledPath = path.join(__dirname, 'plugins', 'onrivi-author');
  try {
    if (fs.existsSync(path.join(bundledPath, 'server', 'index.mjs'))) {
      copyDirectoryRecursiveSync(bundledPath, userPluginDir);
    }
  } catch (_) {}
  if (app.isPackaged || __dirname.toLowerCase().includes('.asar')) {
    if (fs.existsSync(path.join(userPluginDir, 'server', 'index.mjs'))) {
      return userPluginDir.replace(/\\/g, '/');
    }
  }

  // 4순위: 로컬 개발 환경 (언패키징 상태)
  return bundledPath.replace(/\\/g, '/');
};

const syncMcpEnvironmentVariable = () => {
  const pluginRoot = resolveMcpPluginRoot();
  process.env.ONRIVI_MCP_HOME = pluginRoot;
  if (process.platform === 'win32') {
    const { execFile } = require('child_process');
    execFile('reg', ['add', 'HKCU\\Environment', '/v', 'ONRIVI_MCP_HOME', '/t', 'REG_EXPAND_SZ', '/d', pluginRoot.replace(/\//g, '\\'), '/f'], () => {});
  }
  return pluginRoot;
};

app.whenReady().then(() => {
  try { syncMcpEnvironmentVariable(); } catch (_) {}
});

const getMcpDynamicBootstrapArg = () =>
  "import('file:///' + (process.env.ONRIVI_MCP_HOME || (process.env.APPDATA + '/Onrivi Author/plugins/onrivi-author')).replace(/\\\\/g, '/') + '/server/index.mjs')";

const getMcpTargetConfigs = () => {
  const os = require('os');
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  return {
    gemini: {
      name: 'Google Gemini / Antigravity',
      path: path.join(home, '.gemini', 'config', 'mcp_config.json'),
      dir: path.join(home, '.gemini', 'config')
    },
    claude: {
      name: 'Claude Desktop',
      path: process.platform === 'win32'
        ? path.join(appData, 'Claude', 'claude_desktop_config.json')
        : path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      dir: process.platform === 'win32'
        ? path.join(appData, 'Claude')
        : path.join(home, 'Library', 'Application Support', 'Claude')
    }
  };
};

const getChatGptMarketplace = () => {
  const dir = path.join(require('os').homedir(), '.agents', 'plugins');
  return { dir, file: path.join(dir, 'marketplace.json'), pluginDir: path.join(dir, 'onrivi-author') };
};

const readChatGptMarketplace = (file) => {
  if (!fs.existsSync(file)) return { name: 'onrivi-local', interface: { displayName: 'Onrivi Local' }, plugins: [] };
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (!data || !Array.isArray(data.plugins)) throw new Error('ChatGPT 개인 플러그인 목록 형식을 확인해 주세요.');
  return data;
};

ipcMain.handle('mcp:check-targets', async () => {
  const targets = getMcpTargetConfigs();
  const result = {};
  for (const [key, target] of Object.entries(targets)) {
    let installed = false;
    let available = fs.existsSync(target.dir);
    if (fs.existsSync(target.path)) {
      try {
        const content = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
        installed = Boolean(content?.mcpServers?.['onrivi-author']);
      } catch (_) {}
    }
    result[key] = { name: target.name, available, installed, path: target.path.replace(/\\/g, '/') };
  }
  const chatgpt = getChatGptMarketplace();
  let registered = false;
  try {
    const marketplace = readChatGptMarketplace(chatgpt.file);
    registered = marketplace.plugins.some(item => item?.name === 'onrivi-author' && item?.source?.path === './onrivi-author')
      && fs.existsSync(path.join(chatgpt.pluginDir, 'server', 'index.mjs'));
  } catch (_) {}
  result.chatgpt = { name: 'ChatGPT Desktop', available: true, installed: registered, path: chatgpt.file.replace(/\\/g, '/') };
  return result;
});

ipcMain.handle('mcp:install-target', async (event, key) => {
  if (key === 'chatgpt') {
    const target = getChatGptMarketplace();
    const marketplace = readChatGptMarketplace(target.file);
    const source = resolveMcpPluginRoot();
    if (!fs.existsSync(path.join(source, 'server', 'index.mjs'))) throw new Error('온리비 어서 MCP 플러그인 파일을 찾지 못했습니다.');
    fs.mkdirSync(target.dir, { recursive: true });
    copyDirectoryRecursiveSync(source, target.pluginDir);
    marketplace.plugins = marketplace.plugins.filter(item => item?.name !== 'onrivi-author');
    marketplace.plugins.push({
      name: 'onrivi-author',
      source: { source: 'local', path: './onrivi-author' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity'
    });
    fs.writeFileSync(target.file, JSON.stringify(marketplace, null, 2), 'utf8');
    return { success: true, path: target.file.replace(/\\/g, '/'), requiresInstall: true };
  }
  syncMcpEnvironmentVariable();
  const targets = getMcpTargetConfigs();
  const target = targets[key];
  if (!target) throw new Error('지원하지 않는 타겟입니다: ' + key);
  if (!fs.existsSync(target.dir)) {
    fs.mkdirSync(target.dir, { recursive: true });
  }
  let config = {};
  if (fs.existsSync(target.path)) {
    try {
      config = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
    } catch (_) {
      config = {};
    }
  }
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }
  config.mcpServers['onrivi-author'] = {
    command: 'node',
    args: ['-e', getMcpDynamicBootstrapArg()]
  };
  fs.writeFileSync(target.path, JSON.stringify(config, null, 2), 'utf8');
  return { success: true, path: target.path.replace(/\\/g, '/') };
});

ipcMain.handle('mcp:uninstall-target', async (event, key) => {
  if (key === 'chatgpt') {
    const target = getChatGptMarketplace();
    if (!fs.existsSync(target.file)) return { success: true };
    const marketplace = readChatGptMarketplace(target.file);
    marketplace.plugins = marketplace.plugins.filter(item => item?.name !== 'onrivi-author');
    fs.writeFileSync(target.file, JSON.stringify(marketplace, null, 2), 'utf8');
    return { success: true };
  }
  const targets = getMcpTargetConfigs();
  const target = targets[key];
  if (!target || !fs.existsSync(target.path)) return { success: true };
  try {
    const config = JSON.parse(fs.readFileSync(target.path, 'utf8') || '{}');
    if (config.mcpServers && config.mcpServers['onrivi-author']) {
      delete config.mcpServers['onrivi-author'];
      fs.writeFileSync(target.path, JSON.stringify(config, null, 2), 'utf8');
    }
  } catch (_) {}
  return { success: true };
});

// 18. 환경설정 저장 핸들러 (데스크탑 영구 저장 연동)
ipcMain.handle('settings:save', async (event, settings) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsFilePath = path.join(userDataPath, 'settings.json');
    const previous = fs.existsSync(settingsFilePath) ? JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8').replace(/^\uFEFF/, '')) : {};
    fs.writeFileSync(settingsFilePath, JSON.stringify({ ...settings, localResourceFolder: previous.localResourceFolder, localWorkspaceFolder: previous.localWorkspaceFolder }, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('환경설정 저장 실패:', e);
    return false;
  }
});

// 19. 이미지 파일 저장 핸들러 (붙여넣기 대응)
ipcMain.handle('file:saveImage', async (event, targetFolder, base64Data, fileName) => {
  try {
    let rawFolder = targetFolder ? targetFolder.normalize('NFC') : '';
    let isRelative = false;
    
    // targetFolder가 .md 파일 경로인 경우 부모 디렉토리 사용
    if (rawFolder && (rawFolder.endsWith('.md') || rawFolder.endsWith('.markdown'))) {
      rawFolder = path.dirname(rawFolder);
    }
    
    // Explicit media destinations must be created, never redirected to temporary assets.
    if (rawFolder && path.basename(rawFolder).toLowerCase() === 'media') {
      if (!path.isAbsolute(rawFolder)) throw new Error('리소스 media 폴더는 절대경로여야 합니다.');
      const resourceRoot = await fs.promises.stat(path.dirname(rawFolder));
      if (!resourceRoot.isDirectory()) throw new Error('리소스 폴더가 유효하지 않습니다.');
      await fs.promises.mkdir(rawFolder, { recursive: true });
    }
    if (rawFolder && fs.existsSync(rawFolder)) {
      // 대상 워크스페이스/파일 디렉토리 하위에 'assets' 폴더를 생성 및 타겟팅
      const folderName = path.basename(rawFolder).toLowerCase();
      if (folderName !== 'assets' && folderName !== 'media') {
        rawFolder = path.join(rawFolder, 'assets');
      }
      if (!fs.existsSync(rawFolder)) {
        fs.mkdirSync(rawFolder, { recursive: true });
      }
      isRelative = true;
    } else {
      throw new Error('리소스 폴더를 찾을 수 없습니다. 환경설정에서 리소스 폴더를 지정해 주세요.');
    }

    if (typeof fileName !== 'string' || path.basename(fileName) !== fileName || /[\\/]/.test(fileName)) throw new Error('미디어 파일 이름이 올바르지 않습니다.');
    let finalFileName = fileName.normalize('NFC');
    let absolutePath = path.join(rawFolder, finalFileName);
    const buffer = Buffer.from(base64Data, 'base64');

    if (fs.existsSync(absolutePath)) {
      try {
        const existingBuffer = await fs.promises.readFile(absolutePath);
        if (!existingBuffer.equals(buffer)) {
          // 동일한 파일명이 이미 존재하지만 내용(바이트)이 다른 경우: 기존 파일을 절대 덮어쓰지 않고 고유 번호(_1, _2...) 부여
          const ext = path.extname(finalFileName);
          const baseName = path.basename(finalFileName, ext);
          let counter = 1;
          let candidateName = `${baseName}_${counter}${ext}`;
          let candidatePath = path.join(rawFolder, candidateName);

          while (fs.existsSync(candidatePath)) {
            const candBuffer = await fs.promises.readFile(candidatePath);
            if (candBuffer.equals(buffer)) {
              // 이미 동일한 내용으로 저장된 고유 번호 파일이 있으면 해당 파일 재사용
              finalFileName = candidateName;
              absolutePath = candidatePath;
              break;
            }
            counter++;
            candidateName = `${baseName}_${counter}${ext}`;
            candidatePath = path.join(rawFolder, candidateName);
          }

          if (!fs.existsSync(candidatePath)) {
            finalFileName = candidateName;
            absolutePath = candidatePath;
            await fs.promises.writeFile(absolutePath, buffer);
          }
        }
        // 내용이 동일한 경우 기존 파일(absolutePath)을 그대로 안전하게 재사용
      } catch (readErr) {
        // 기존 파일 읽기 오류 발생 시 충돌을 피해 타임스탬프 고유명으로 안전 저장
        const ext = path.extname(finalFileName);
        const baseName = path.basename(finalFileName, ext);
        finalFileName = `${baseName}_${Date.now()}${ext}`;
        absolutePath = path.join(rawFolder, finalFileName);
        await fs.promises.writeFile(absolutePath, buffer);
      }
    } else {
      await fs.promises.writeFile(absolutePath, buffer);
    }

    const finalFolderName = path.basename(rawFolder);

    return {
      success: true,
      fileName: finalFileName,
      absolutePath: absolutePath,
      isRelative: isRelative,
      mediaPath: isRelative ? `/${finalFolderName}/${finalFileName}?v=${Date.now()}` : null
    };
  } catch (e) {
    console.error('이미지 저장 실패 (Electron):', e);
    return { success: false, error: e.message };
  }
});

// 20. 다중 파일 병합 (IPC — 백엔드 서버 불필요)
ipcMain.handle('file:mergeFiles', async (event, { sourcePaths, targetPath, deleteSources, separator, generateToc, insertPageBreak, shiftHeadings }) => {
  try {
    if (!sourcePaths || !Array.isArray(sourcePaths) || sourcePaths.length < 2) {
      return { success: false, error: 'At least two source files are required for merging.' };
    }
    if (!targetPath) {
      return { success: false, error: 'Target path is required.' };
    }

    const contents = [];
    const tocLines = [];
    
    // 타겟 폴더 절대 경로
    const targetDir = path.dirname(targetPath);

    for (const src of sourcePaths) {
      let fileContent = fs.readFileSync(src, 'utf-8');
      
      // 1. 프론트매터(YAML) 제거 로직
      fileContent = fileContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

      // 1.5. 헤딩 강등 (Heading Shift)
      if (shiftHeadings) {
        fileContent = fileContent.replace(/^(#{1,5})(\s)/gm, '$1#$2');
      }

      // 2. 상대 경로 보정 로직 (이미지 및 링크)
      // 정규식: ![alt](path) 또는 [text](path)
      fileContent = fileContent.replace(/(!?\[.*?\])\((.*?)\)/g, (match, prefix, linkPath) => {
        // 이미 절대 경로이거나 외부 URL, data URI인 경우 건너뜀
        if (
          linkPath.startsWith('http://') || 
          linkPath.startsWith('https://') || 
          linkPath.startsWith('data:') || 
          linkPath.startsWith('/')
        ) {
          return match;
        }

        // src 파일이 위치한 폴더를 기준으로 링크의 절대 경로를 계산
        const srcDir = path.dirname(src);
        const absoluteLinkPath = path.resolve(srcDir, linkPath);

        // 타겟 폴더를 기준으로 새로운 상대 경로 계산
        let newRelativePath = path.relative(targetDir, absoluteLinkPath);

        // Windows 경로 구분자(\)를 웹 호환 슬래시(/)로 변환
        newRelativePath = newRelativePath.replace(/\\/g, '/');

        return `${prefix}(${newRelativePath})`;
      });

      const fileName = path.basename(src);
      const titleLabel = fileName.replace(/\.[^/.]+$/, "");

      if (generateToc) {
        const anchor = titleLabel.toLowerCase().replace(/\s+/g, '-');
        tocLines.push(`- [${titleLabel}](#${anchor})`);
      }

      let formattedContent = fileContent;
      if (separator === 'title') {
        formattedContent = `## ${titleLabel}\n\n${fileContent}`;
      }
      contents.push(formattedContent);
    }

    let joinSeparator = '\n\n';
    if (insertPageBreak) joinSeparator = '\n\n<hr class="page-break" />\n\n';
    else if (separator === 'divider') joinSeparator = '\n\n---\n\n';
    else if (separator === 'none') joinSeparator = '\n';
    else if (separator === 'title') joinSeparator = '\n\n';

    let mergedContent = contents.join(joinSeparator);

    if (generateToc) {
      const tocSection = `# 목차\n\n${tocLines.join('\n')}\n\n${insertPageBreak ? '<hr class="page-break" />\n\n' : '---\n\n'}`;
      mergedContent = tocSection + mergedContent;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetPath, mergedContent, 'utf-8');

    if (deleteSources) {
      for (const src of sourcePaths) {
        if (src !== targetPath) {
          fs.rmSync(src, { recursive: true, force: true });
        }
      }
    }

    return { success: true, path: targetPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 21. PDF 인쇄 (webContents.printToPDF API 연동)
ipcMain.handle('pdf:printToPDF', async (event, options) => {
  if (!mainWindow) throw new Error("메인 윈도우 인스턴스가 존재하지 않습니다.");
  try {
    const pdfBuffer = await mainWindow.webContents.printToPDF(options);
    return pdfBuffer;
  } catch (e) {
    console.error('Electron printToPDF 에러:', e);
    throw e;
  }
});

// 21-2. HTML 기반 PDF 인쇄 (임시 오프스크린 창 빌드 및 네이티브 printToPDF 구동)
ipcMain.handle('pdf:printHTMLToPDF', async (event, html, options) => {
  const printStartedAt = Date.now();
  let printWindow = null;
  let tempFilePath = null;
  try {
    // 1. 화면에 표시하지 않는 오프스크린 BrowserWindow 생성
    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      }
    });

    // 2. 대용량 HTML 처리를 위해 임시 파일 생성 및 로드
    tempFilePath = path.join(app.getPath('temp'), `onrivi_author_print_${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, html, 'utf8');
    
    await printWindow.loadFile(tempFilePath);
    console.info('[PDF desktop] HTML load ms:', Date.now() - printStartedAt);

    // Wait for the actual print document, including image decoding and web fonts.
    await printWindow.webContents.executeJavaScript(`(async () => {
      let timer;
      try {
        await Promise.race([
          (async () => {
            if (document.fonts) await document.fonts.ready.catch(() => {});
            const failedFonts = Array.from(document.fonts || []).filter(face => face.status === 'error');
            if (failedFonts.length) {
              console.warn('[PDF desktop] 일부 폰트 로드 실패, 시스템 기본 글꼴로 대체:', failedFonts.map(f => f.family));
            }
            await Promise.all(Array.from(document.images).map(async (image, index) => {
              image.loading = 'eager';
              try {
                await image.decode().catch(() => {});
              } catch (err) {
                console.warn('[PDF desktop] 이미지 디코드 건너뜀:', index);
              }
            }));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          })(),
          new Promise((resolve) => { timer = setTimeout(resolve, 5000); })
        ]);
      } finally { clearTimeout(timer); }
    })()`);
    console.info('[PDF desktop] resources ready ms:', Date.now() - printStartedAt);

    // 4. Chromium 네이티브 A4 인쇄 규격으로 PDF 파일 구워내기
    const pdfOptions = {
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      pageSize: 'A4',
      printBackground: true,
      ...options,
      // PDF export always generates a file directly, independent of the OS
      // default printer and any third-party PDF printer drivers.
      generateTaggedPDF: true
    };
    
    const pdfBuffer = await printWindow.webContents.printToPDF(pdfOptions);
    console.info('[PDF desktop] completed ms:', Date.now() - printStartedAt);
    return pdfBuffer;
  } catch (e) {
    console.error('Electron printHTMLToPDF 에러:', e);
    throw e;
  } finally {
    if (printWindow) {
      printWindow.close();
    }
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("임시 인쇄 파일 삭제 오류:", err);
      }
    }
  }
});

// 22. 로컬 이미지를 Base64 Data URI로 직접 읽기 (CORS 및 fetch 우회용)
ipcMain.handle('file:readImageAsBase64', async (event, filePath) => {
  try {
    const found = findLocalImageFile(filePath);
    if (!found) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const buffer = await fs.promises.readFile(found);
    const ext = path.extname(found).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      '.avif': 'image/avif'
    };
    const contentType = mimeTypes[ext] || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error('file:readImageAsBase64 에러:', e);
    throw e;
  }
});

// ──────────────────────────────────────────────
// 사용자 서식 프로필 저장소 (Desktop 환경)
// ──────────────────────────────────────────────
// 사용자 지정 리소스 폴더만 허용한다. 다른 드라이브나 userData로 우회하지 않는다.
function resolveUserProfilesPath(resourceFolder) {
  const folder = typeof resourceFolder === 'string' ? resourceFolder.trim() : '';
  if (!folder || !path.isAbsolute(folder) || !fs.statSync(folder).isDirectory()) {
    throw new Error('RESOURCE_FOLDER_NOT_SET: 리소스 폴더를 다시 연결해 주세요.');
  }
  return path.join(folder, 'profiles', 'userCssProfiles.json');
}

ipcMain.handle('file:readProfiles', async (event, resourceFolder) => {
  const profilePath = resolveUserProfilesPath(resourceFolder);
  if (!fs.existsSync(profilePath)) throw new Error(`서식 파일을 찾을 수 없습니다: ${profilePath}`);
  const profiles = JSON.parse(fs.readFileSync(profilePath, 'utf-8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(profiles)) throw new Error('INVALID_PROFILES_ARRAY');
  console.info('[Desktop profiles]', JSON.stringify({ file: profilePath, count: profiles.length }));
  return profiles;
});

ipcMain.handle('file:saveProfiles', async (event, profiles, resourceFolder) => {
  try {
    if (!Array.isArray(profiles)) throw new Error('INVALID_PROFILES_ARRAY');
    const dataPath = resolveUserProfilesPath(resourceFolder);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(profiles, null, 2), 'utf-8');
    return { success: true, savedPath: dataPath };
  } catch (error) {
    console.error('Failed to save profiles:', error);
    return { success: false, error: error.message };
  }
});

// ──────────────────────────────────────────────
// 리소스 폴더 5대 디렉토리 및 onrivi_knowledge.db 일괄 생성 핸들러
// ──────────────────────────────────────────────
async function initializeDesktopResourceFolder(resourceFolder, initialProfiles = []) {
  try {
    if (!resourceFolder || !fs.existsSync(resourceFolder)) {
      return { success: false, error: 'FOLDER_NOT_FOUND' };
    }

    // 1. 5대 하위 디렉토리 생성
    const subDirs = ['profiles', 'prompt', 'bible', 'media', 'db', 'settings'];
    for (const dir of subDirs) {
      const dirPath = path.join(resourceFolder, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // 2. 기본 파일 생성 (기존 파일 보존)
    const profilesFile = path.join(resourceFolder, 'profiles', 'userCssProfiles.json');
    if (!fs.existsSync(profilesFile)) {
      fs.writeFileSync(profilesFile, JSON.stringify(initialProfiles, null, 2), 'utf-8');
    }

    const promptDir = path.join(resourceFolder, 'prompt');
    const aiPromptsFile = path.join(promptDir, 'ai_prompts.json');
    if (!fs.existsSync(aiPromptsFile)) {
      fs.writeFileSync(aiPromptsFile, '{}', 'utf-8');
    }
    const aiPresetsFile = path.join(promptDir, 'ai_presets.json');
    if (!fs.existsSync(aiPresetsFile)) {
      fs.writeFileSync(aiPresetsFile, '[]', 'utf-8');
    }
    const templatesFile = path.join(promptDir, 'promptTemplates.json');
    if (!fs.existsSync(templatesFile)) {
      fs.writeFileSync(templatesFile, '[]', 'utf-8');
    }

    const shortcodesFile = path.join(resourceFolder, 'settings', 'shortcodes.json');
    if (!fs.existsSync(shortcodesFile)) {
      fs.writeFileSync(shortcodesFile, JSON.stringify({
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        hotkeys: {},
        slashCommands: {}
      }, null, 2), 'utf-8');
    }

    const bibFile = path.join(resourceFolder, 'bible', 'references.bib');
    if (!fs.existsSync(bibFile)) {
      fs.writeFileSync(bibFile, '', 'utf-8');
    }

    // 3. db/onrivi_knowledge.db 생성 (★ 이미 존재하면 일체 손대지 않고 기존 데이터 100% 보존!)
    const dbPath = path.join(resourceFolder, 'db', 'onrivi_knowledge.db');
    if (!fs.existsSync(dbPath)) {
      try {
        let sqlite = null;
        try {
          const proc = globalThis.process;
          if (proc && typeof proc.getBuiltinModule === 'function') {
            sqlite = proc.getBuiltinModule('node:sqlite');
          }
        } catch (e) {}

        if (sqlite && sqlite.DatabaseSync) {
          const db = new sqlite.DatabaseSync(dbPath);
          db.exec('PRAGMA journal_mode = WAL;');
          db.exec('PRAGMA foreign_keys = ON;');
          db.exec(`
            CREATE TABLE IF NOT EXISTS knowledge_collections (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              color TEXT DEFAULT '#06C755',
              icon TEXT DEFAULT 'folder',
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS knowledge_documents (
              id TEXT PRIMARY KEY,
              collection_id TEXT,
              file_path TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              file_hash TEXT NOT NULL,
              file_size INTEGER NOT NULL DEFAULT 0,
              modified_at TEXT NOT NULL,
              summary TEXT,
              key_points TEXT,
              document_type TEXT DEFAULT 'other',
              priority INTEGER DEFAULT 3,
              status TEXT NOT NULL DEFAULT 'READY',
              error_message TEXT,
              analysis_version INTEGER DEFAULT 1,
              analyzer_model TEXT,
              analyzed_at TEXT,
              indexed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
              FOREIGN KEY (collection_id) REFERENCES knowledge_collections(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS document_chunks (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              heading_title TEXT NOT NULL,
              heading_path TEXT NOT NULL,
              heading_level INTEGER NOT NULL,
              chunk_index INTEGER NOT NULL,
              content TEXT NOT NULL,
              token_count INTEGER NOT NULL DEFAULT 0,
              char_count INTEGER NOT NULL DEFAULT 0,
              start_line INTEGER NOT NULL DEFAULT 1,
              end_line INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
              FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
              chunk_id UNINDEXED,
              document_id UNINDEXED,
              heading_path,
              content,
              tokenize = 'unicode61'
            );

            CREATE TABLE IF NOT EXISTS document_tags (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              tag_name TEXT NOT NULL,
              score REAL DEFAULT 1.0,
              source TEXT DEFAULT 'auto',
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
              FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS knowledge_jobs (
              id TEXT PRIMARY KEY,
              job_type TEXT NOT NULL,
              file_path TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'PENDING',
              error_message TEXT,
              retry_count INTEGER DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
              finished_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_docs_hash ON knowledge_documents(file_hash);
            CREATE INDEX IF NOT EXISTS idx_docs_status ON knowledge_documents(status);
            CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
            CREATE INDEX IF NOT EXISTS idx_tags_doc_id ON document_tags(document_id);
            CREATE INDEX IF NOT EXISTS idx_tags_name ON document_tags(tag_name);
          `);
          try { db.exec("ALTER TABLE document_chunks ADD COLUMN chunk_text TEXT;"); } catch {}
          db.close();
        } else {
          fs.writeFileSync(dbPath, '', 'utf-8');
        }
      } catch (dbErr) {
        console.error('[resourceFolder:initStructure DB Init Error]:', dbErr);
      }
    }

    return { success: true, path: resourceFolder };
  } catch (err) {
    console.error('[resourceFolder:initStructure Error]:', err);
    return { success: false, error: err.message };
  }
}
ipcMain.handle('resourceFolder:initStructure', (event, folder, profiles) => initializeDesktopResourceFolder(folder, profiles));
ipcMain.handle('desktop:ensureLocalEnvironment', async (event, settings = {}) => {
  try {
    const base = path.join(app.getPath('documents'), 'OnriviAuthor');
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    const saved = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf-8').replace(/^\uFEFF/, '')) : {};
    const savedResource = saved.localResourceFolder || saved.resourceFolder;
    const resolveFolder = (configured, fallback) => {
      if (configured && !path.isAbsolute(configured)) throw new Error('환경설정에 로컬 폴더의 전체 경로를 지정해 주세요.');
      const folder = configured || path.join(base, fallback);
      fs.mkdirSync(folder, { recursive: true });
      return folder;
    };
    const resourcePath = resolveFolder(settings.resourceFolder || (typeof savedResource === 'string' && path.isAbsolute(savedResource) ? savedResource : undefined), '참조파일');
    const workspacePath = resolveFolder(settings.workspaceFolder || saved.localWorkspaceFolder, '작업장');
    const result = await initializeDesktopResourceFolder(resourcePath, Array.isArray(settings.profiles) ? settings.profiles : []);
    if (!result.success) return result;
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(settingsFile, JSON.stringify({ ...saved, localResourceFolder: resourcePath, localWorkspaceFolder: workspacePath }, null, 2), 'utf-8');
    console.info('[Desktop resource]', JSON.stringify({ resourcePath, workspacePath }));
    return { success: true, resourcePath, workspacePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 26. 로컬 보안 데이터 암복호화 (OS Keyring 연동)
ipcMain.handle('security:encrypt', async (event, plainText) => {
  const { safeStorage } = require('electron');
  if (safeStorage.isEncryptionAvailable() && plainText) {
    try {
      const buffer = safeStorage.encryptString(plainText);
      return buffer.toString('hex');
    } catch (e) {
      console.error('Encryption failed:', e);
    }
  }
  return plainText; // Fallback
});

ipcMain.handle('security:decrypt', async (event, cipherTextHex) => {
  const { safeStorage } = require('electron');
  if (safeStorage.isEncryptionAvailable() && cipherTextHex) {
    try {
      // Check if it's actually hex encoded
      const buffer = Buffer.from(cipherTextHex, 'hex');
      // A simple heuristic: if the length of the string is odd or not hex, it might be fallback plain text.
      // But Buffer.from handles it. safeStorage.decryptString will throw if invalid.
      return safeStorage.decryptString(buffer);
    } catch (e) {
      // If decryption fails, it might be unencrypted plain text from a previous version or fallback.
      return cipherTextHex;
    }
  }
  return cipherTextHex;
});


// --- AI Prompts and Presets IPC Handlers ---
ipcMain.handle('prompts:load', async (event, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return null;
    }
    const promptsFilePath = path.join(resourceFolder, 'prompt', 'ai_prompts.json');
    if (fs.existsSync(promptsFilePath)) {
      return JSON.parse(fs.readFileSync(promptsFilePath, 'utf-8'));
    }
    return null;
  } catch (e) {
    console.error('AI 프롬프트 로드 실패:', e);
    return null;
  }
});

ipcMain.handle('prompts:save', async (event, prompts, resourceFolder) => {
  fs.appendFileSync('d:/Developer/OnriviMarkDown/OnriviMarkDown/debug.log', `[prompts:save] resourceFolder: <${resourceFolder}>, type: ${typeof resourceFolder}, exists: ${fs.existsSync(resourceFolder)}\n`);
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return { success: false, error: 'NO_RESOURCE_FOLDER', receivedPath: resourceFolder };
    }
    const promptDir = path.join(resourceFolder, 'prompt');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    const promptsFilePath = path.join(promptDir, 'ai_prompts.json');
    fs.writeFileSync(promptsFilePath, JSON.stringify(prompts, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    console.error('AI 프롬프트 저장 실패:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('presets:load', async (event, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      throw new Error('리소스 폴더에 접근할 수 없습니다.');
    }
    const presetsFilePath = path.join(resourceFolder, 'prompt', 'ai_presets.json');
    if (fs.existsSync(presetsFilePath)) {
      return JSON.parse(fs.readFileSync(presetsFilePath, 'utf-8'));
    }
    return [];
  } catch (e) {
    throw new Error('프롬프트 라이브러리를 읽지 못했습니다. 원본 파일을 확인해 주세요.');
  }
});

ipcMain.handle('presets:save', async (event, presets, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return { success: false, error: 'NO_RESOURCE_FOLDER', receivedPath: resourceFolder };
    }
    const promptDir = path.join(resourceFolder, 'prompt');
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    const presetsFilePath = path.join(promptDir, 'ai_presets.json');
    if(fs.existsSync(presetsFilePath)){
      JSON.parse(fs.readFileSync(presetsFilePath,'utf-8'));
      fs.copyFileSync(presetsFilePath,path.join(promptDir,'ai_presets.backup.json'));
    }
    const temporary=presetsFilePath+'.tmp';
    fs.writeFileSync(temporary, JSON.stringify(presets, null, 2), 'utf-8');
    fs.renameSync(temporary,presetsFilePath);
    return { success: true };
  } catch (e) {
    console.error('AI 프리셋 저장 실패:', e);
    return { success: false, error: e.message };
  }
});


// --- AI Credentials Encrypted Storage in Resource Folder ---
ipcMain.handle('device:get-info', async () => {
  const os = require('os');
  let deviceId = '';
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      deviceId = execSync('powershell -Command "Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID"', { encoding: 'utf-8' }).trim();
    } else if (process.platform === 'darwin') {
      deviceId = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { encoding: 'utf-8' }).trim();
    } else {
      deviceId = fs.readFileSync('/var/lib/dbus/machine-id', 'utf-8').trim();
    }
  } catch (err) {
    deviceId = os.hostname();
  }
  return {
    deviceId: deviceId || os.hostname(),
    hostName: os.hostname(),
    platform: process.platform,
  };
});

ipcMain.handle('ai-credentials:load', async (event, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return null;
    }
    const credPath = path.join(resourceFolder, 'settings', 'ai_credentials.enc');
    if (fs.existsSync(credPath)) {
      return fs.readFileSync(credPath, 'utf-8');
    }
    return null;
  } catch (e) {
    console.error('AI 인증정보 로드 실패:', e);
    return null;
  }
});

ipcMain.handle('ai-credentials:save', async (event, cipherText, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return { success: false, error: 'NO_RESOURCE_FOLDER', receivedPath: resourceFolder };
    }
    const settingsDir = path.join(resourceFolder, 'settings');
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    const credPath = path.join(settingsDir, 'ai_credentials.enc');
    fs.writeFileSync(credPath, cipherText || '', 'utf-8');
    return { success: true };
  } catch (e) {
    console.error('AI 인증정보 저장 실패:', e);
    return { success: false, error: e.message };
  }
});

// --- Shortcodes & Hotkeys IPC Handlers ---
ipcMain.handle('shortcodes:load', async (event, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return null;
    }
    const shortcodesPath = path.join(resourceFolder, 'settings', 'shortcodes.json');
    if (fs.existsSync(shortcodesPath)) {
      return JSON.parse(fs.readFileSync(shortcodesPath, 'utf-8'));
    }
    return null;
  } catch (e) {
    console.error('단축코드 정의서 로드 실패:', e);
    return null;
  }
});

ipcMain.handle('shortcodes:save', async (event, data, resourceFolder) => {
  try {
    if (!resourceFolder || resourceFolder.trim() === '' || !fs.existsSync(resourceFolder)) {
      return { success: false, error: 'NO_RESOURCE_FOLDER', receivedPath: resourceFolder };
    }
    const settingsDir = path.join(resourceFolder, 'settings');
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    const shortcodesPath = path.join(settingsDir, 'shortcodes.json');
    fs.writeFileSync(shortcodesPath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    console.error('단축코드 정의서 저장 실패:', e);
    return { success: false, error: e.message };
  }
});

// ====================================================================
// 📊 [OMD-MAIN-main-0002] main.js ➔ mermaid:open-window
// 🎯 @KICK  : 미리보기 Mermaid 다이어그램을 새 Electron BrowserWindow에서 확대 뷰잉
// 🛡️ @GUARD : setWindowOpenHandler가 window.open()을 원천 차단하므로 IPC 경유 방식 사용
// 🚨 @PATCH : **2026-09-13** — [데스크탑 Mermaid '새 창으로 확대' 팝업 차단 오류 해결]: window.open()이 deny되던 문제를 IPC 경유 BrowserWindow 직접 생성 방식으로 완전 대체
// 🔗 @CALLS : BrowserWindow, loadURL (data:text/html), screen.getPrimaryDisplay
// ====================================================================
ipcMain.handle('mermaid:open-window', async (event, svgHtml, options = {}) => {
  try {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    const winWidth = Math.round(Math.min(options.width || 900, screenW * 0.88));
    const winHeight = Math.round(Math.min(options.height || 700, screenH * 0.88));

    const mermaidWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      title: 'Onrivi — 다이어그램 확대 뷰어',
      resizable: true,
      center: true,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // 이 창은 읽기 전용 SVG 표시만 하므로 preload 불필요
      },
    });

    // SVG를 감싸는 HTML을 data: URL로 직접 로드
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Onrivi 다이어그램 돋보기</title>
  <style>
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background-color: #ffffff;
      overflow: auto;
    }
    .svg-container {
      padding: 40px; box-sizing: border-box;
      width: 100%; max-width: 95%; height: auto;
      display: flex; align-items: center; justify-content: center;
    }
    svg { width: 100% !important; height: auto !important; max-width: 100% !important; display: block; }
  </style>
</head>
<body>
  <div class="svg-container">${svgHtml}</div>
</body>
</html>`;

    await mermaidWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    mermaidWin.show();
    return { success: true };
  } catch (e) {
    console.error('[mermaid:open-window] 오류:', e);
    return { success: false, error: e.message };
  }
});

// ====================================================================
// 📊 [OMD-MAIN-main-0004] main.js ➔ gdrive:request-auth
// 🎯 @KICK  : 데스크톱 구글 드라이브 인증 루프백 서버 가동 및 외부 브라우저 Handoff 연동
// 🛡️ @GUARD : 타임아웃(120초), 단일 1회 응답 후 서버 즉시 close, CORS 허용
// 🚨 @PATCH : **2026-10-14** — [데스크톱 구글 드라이브 인증(gdrive:request-auth) 중복 호출 방어 및 활성 프로미스 싱글톤 재사용] 이미 인증 루프백 서버 및 브라우저 Handoff가 대기 중인 상태에서 추가 호출 유입 시 기존 요청을 취소하지 않고 현재 진행 중인 Promise를 재사용하여 오류 차단
// 🚨 @PATCH : **2026-10-04** — 데스크톱 Google OAuth 400 invalid_request 해결을 위한 시스템 브라우저 웹 Handoff 및 루프백 브리지 엔진 신설
// 🔗 @CALLS : http.createServer, shell.openExternal, getFreePort
// ====================================================================
require('./electron/gdriveOAuth.cjs').registerDriveOAuth({
  ipcMain, app, shell: require('electron').shell,
  safeStorage: require('electron').safeStorage,
  getWindow: () => mainWindow
});

