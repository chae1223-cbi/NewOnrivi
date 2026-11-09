// ====================================================================
// 📊 [OMD-MAIN-main-0001] main.js ➔ CSP_connect_src_fix
// 🎯 @KICK  : CSP connect-src 지침에 http: https: 추가하여 외부 이미지/폰트 fetch 차단 해결
// 🛡️ @GUARD : Monaco editor 등 기존 설정 유지
// 🚨 @PATCH : 2026-11-08 — [electron shell 바인딩 보강]: main.js 상단 electron 구조분해 할당에 shell 누락으로 인한 registerFileIpcHandlers ReferenceError 즉각 해결
// 🚨 @PATCH : 2026-11-08 — [main.js 3단계 모듈 분리] 순수 데스크톱 파일 시스템 및 탐색기 제어 IPC 핸들러 1,000줄을 electron/fileIpcHandlers.cjs로 격리 모듈화 (main.js 2,977줄 -> 2,040줄 경량화)
// 🚨 @PATCH : 2026-11-08 — [main.js 2단계 모듈 분리] 외부 AI MCP 타겟 관리 및 컨텍스트 동기화 로직 230줄을 electron/mcpHandlers.cjs로 격리 모듈화
// 🚨 @PATCH : 2026-11-08 — [main.js 1단계 모듈 분리] 로컬 SQLite 지식베이스 엔진 및 API 라우팅 핸들러 2,120줄을 electron/desktopKnowledgeApi.cjs로 성공적 격리 분리 (main.js 5,353줄 -> 3,233줄 경량화)
// 🚨 @PATCH : 2026-11-07 — [app:// 프로토콜 로컬 미디어(/media/) 지능형 서빙 지원]: app:// 프로토콜 핸들러에서 out 정적 파일 부재 시 findLocalImageFile을 통해 로컬 워크스페이스 및 공통 자원 폴더의 /media/ 이미지 파일을 자동 탐색 서빙하여 404 차단
// 🚨 @PATCH : 2026-11-07 — [Windows 11 wmic ENOENT 박멸 및 드라이브 조회 fs 병렬화, 터미널 UTF-8 한글 깨짐 방지]:
//             1) Windows 11에서 제거된 deprecated wmic 호출을 걷어내고 Node.js 네이티브 fs.promises.access A~Z 병렬 검사로 전환하여 spawn ENOENT 에러 완전 박멸 및 드라이브 조회 속도 극대화
//             2) Windows 콘솔 출력 시 UTF-8(chcp 65001) 코드페이지를 설정하여 터미널 진단 로그 한글 깨짐 원천 방어
// 🚨 @PATCH : 2026-11-05 — [데스크톱 렌더러 정지 진단]: 창 응답 없음·복구·렌더러 종료 이벤트를 터미널에 구조화해 기록한다.
// 🚨 @PATCH : 2026-11-05 — [작업장 파일 탐색 응답성]: 파일명 검색을 비동기로 전환하고 빌드·임시 폴더를 제외하여 메인 프로세스 장시간 점유를 막는다.
// 🚨 @PATCH : 2026-11-05 — [시작 응답 없음 수정]: 기기 정보 조회의 동기 PowerShell 실행을 5초 제한 비동기 UUID 조회로 교체한다.
// 🚨 @PATCH : 2026-11-05 — [드라이브 조회 응답성]: 시작 시 WMIC 동기 호출을 제한 시간 있는 비동기 실행으로 바꾼다.
// 🚨 @PATCH : 2026-11-05 — [Windows 감시 핸들 폭증 수정]: 감시 제외 경로를 구분자 독립적으로 판별하고 이전 감시 종료를 기다린다.
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
const { app, BrowserWindow, session, ipcMain, dialog, protocol, net, screen, shell } = require('electron');
require('./electron/inlineAI.cjs').registerInlineAI({ipcMain,app,safeStorage:require('electron').safeStorage});
const path = require('path');
const chokidar = require('chokidar');

const fs = require('fs');
const nodeNet = require('net'); // 빈 포트를 찾기 위한 네이티브 모듈 추가

// 🌐 [ Windows 콘솔 UTF-8 한글 인코딩 보장 ]
if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('chcp 65001', { stdio: 'ignore' });
  } catch (_) {}
}

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

  let unresponsiveAt = 0;
  mainWindow.on('unresponsive', () => {
    unresponsiveAt = Date.now();
    console.error(JSON.stringify({
      file: 'main.js',
      func: 'createWindow',
      doing: '데스크톱 에디터 창 응답 상태 확인 중',
      target: 'editor-window',
      error: 'renderer unresponsive',
      at: new Date(unresponsiveAt).toISOString()
    }));
  });
  mainWindow.on('responsive', () => {
    if (!unresponsiveAt) return;
    console.info('[STARTUP timing] renderer recovered after ms=%d', Date.now() - unresponsiveAt);
    unresponsiveAt = 0;
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(JSON.stringify({
      file: 'main.js',
      func: 'createWindow',
      doing: '데스크톱 에디터 렌더러 종료 원인 확인 중',
      target: 'editor-window',
      error: details.reason,
      exitCode: details.exitCode
    }));
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
// 🧠 [OMD-MAIN-knowledge-0001] 데스크톱 전용 지식 베이스 엔진 모듈 연동
// 🎯 @KICK  : electron/desktopKnowledgeApi.cjs 모듈로부터 로컬 SQLite 핸들러 및 리소스 경로 해석기 임포트
// ====================================================================
const {
  handleDesktopKnowledgeApi,
  resolveSafeResourceFolder
} = require('./electron/desktopKnowledgeApi.cjs');

// ====================================================================
// 🔌 [OMD-MAIN-mcp-0001] 외부 AI MCP 타겟 연동 모듈 연동
// 🎯 @KICK  : electron/mcpHandlers.cjs 모듈로부터 MCP 타겟 관리 및 컨텍스트 동기화 핸들러 임포트
// ====================================================================
const {
  registerMcpHandlers,
  getMcpDeviceId,
  syncMcpEnvironmentVariable
} = require('./electron/mcpHandlers.cjs');

// ====================================================================
// 📁 [OMD-MAIN-fileIpc-0001] 데스크톱 파일 제어 및 작업장 탐색기 IPC 핸들러 모듈 연동
// 🎯 @KICK  : electron/fileIpcHandlers.cjs 모듈로부터 파일 읽기/쓰기/다이얼로그 핸들러 등록 함수 임포트
// ====================================================================
const { registerFileIpcHandlers } = require('./electron/fileIpcHandlers.cjs');

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

      // 🛡️ [로컬 미디어 파일 폴백] 정적 빌드 산출물에 없으나 로컬 워크스페이스 또는 리소스 폴더의 /media/ 파일인 경우 findLocalImageFile로 서빙
      if (!fs.existsSync(targetPath)) {
        const localCandidate = findLocalImageFile(pathname) || findLocalImageFile(url.pathname);
        if (localCandidate && fs.existsSync(localCandidate)) {
          targetPath = localCandidate;
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
        '.gif': 'image/gif',
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

// ====================================================================
// 🔒 [ 순수 데스크톱 파일 제어 및 작업장 탐색기 IPC 핸들러 모듈 등록 ]
// ====================================================================
let currentActiveWorkspacePath = null;

registerFileIpcHandlers({
  ipcMain,
  app,
  dialog,
  shell,
  getMainWindow: () => mainWindow,
  getFilePathToOpen: () => filePathToOpen,
  clearFilePathToOpen: () => { filePathToOpen = null; },
  getCurrentWorkspacePath: () => currentActiveWorkspacePath,
  setCurrentWorkspacePath: (val) => { currentActiveWorkspacePath = val; }
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

// ====================================================================
// 🔌 [MCP 타겟 및 컨텍스트 동기화 모듈 등록]
// ====================================================================
registerMcpHandlers({ ipcMain, app, getMainWindow: () => mainWindow, rootDir: __dirname });

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
  const startedAt = Date.now();
  const os = require('os');
  let deviceId = '';
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      deviceId = await getMcpDeviceId() || '';
    } else if (process.platform === 'darwin') {
      deviceId = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); print line[4] }'", { encoding: 'utf-8' }).trim();
    } else {
      deviceId = fs.readFileSync('/var/lib/dbus/machine-id', 'utf-8').trim();
    }
  } catch (err) {
    console.warn(JSON.stringify({ file: 'main.js', func: 'device:get-info', doing: '기기 정보 비동기 조회 중', target: 'local-device', error: err?.message || String(err) }));
    deviceId = os.hostname();
  }
  console.info('[STARTUP timing] device info ms=%d', Date.now() - startedAt);
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

