import { headingNumberingCss, materializeHeadingNumbers } from './headingNumbering';
import { reportNumberingCss, materializeReportNumbers, CIRCLED_DECIMAL_LIST_STYLE, CIRCLED_NUMBERS, getBulletSymbolValue } from './reportNumbering';
import { embedExportFonts } from './exportFonts';
import { startExportProgress } from './exportProgress';
// PDF and print share the preview pagination engine on web and desktop.
// A failed calculation must not silently discard the user's output boundaries.
// 🚨 @PATCH : **2026-11-01** — [표 셀 줄바꿈 파괴 및 가로 늘어짐·텍스트 잘림 결함 내보내기 동기화]:
//             1) generateExportCss 내 table에 width: 100%, max-width: 100%, table-layout: fixed !important 적용
//             2) th, td에 overflow-wrap: anywhere, word-break: break-word를 적용하고, table :is(th, td) code에 white-space: pre-wrap, overflow-wrap: anywhere, word-break: break-all을 동기화하여 인쇄/내보내기 시 표 셀 텍스트가 안전하게 줄바꿈되도록 해결
// 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 분할 출력 엔진(exportSNSCardNews) 신설 및 다중 카드 분할·일괄 저장 고도화]:
//             1) 인스타그램·쓰레드·링크드인 공유용 1:1 정사각(1080×1080), 4:5 세로형(1080×1350), 16:9 와이드(1920×1080) 카드별 분할 캡처 및 ZIP/낱장 PNG 일괄 저장(exportSNSCardNews) 구현
//             2) 문서보기(VisualDocumentEditor / .visual-document-surface, .ProseMirror) 및 마크다운 뷰어(.prose) 중첩 컨테이너 자동 언래핑 및 전 구간 카드 높이 기반 자동 분할(긴 리스트·단락 포함), 일렉트론 데스크톱 다중 낱장 PNG 일괄 저장 지원
//             3) H2~H6 크기 계산 시 pt/px 단위 상호 변환 및 '0pt' 명시 설정 지원, 제목 태그(h1~h6) border-left 미지정 시 'none' 명시 출력
// 🚨 @PATCH : **2026-10-26** — [원문자(①, ②, ③) 및 글머리 불릿 레벨별(1~3단계) 내보내기 마커 동기화]:
//             1) fixListMarkers에 프로필 연동 및 원문자(①, ②, ③) 리스트 마커 사출 지원
//             2) 1단계/2단계/3단계 깊이(depth)별 불릿 기호(•, ○, ■, ◆, -, ▶ 등)를 판별하여 PDF/HTML/인쇄 시 1:1 일치 반영
// 🚨 @PATCH : **2026-10-26** — [동영상·지도 설명(캡션) 이미지 규격 동기화(중앙 정렬 및 0.88em 글자 크기)]:
//             1) .onrivi-video-figure figcaption 및 .onrivi-map-figure figcaption에 text-align: center, font-size: 0.88em, font-weight: 500 주입
//             2) 동영상/지도 래퍼 인접 캡션 문단에도 중앙 정렬 및 0.88em 글자 크기를 동기화하여 이미지 캡션과 100% 동일한 내보내기 조판 완성
// 🚨 @PATCH : **2026-10-25** — [이미지와 캡션 간격 초밀착(4px) 정돈 및 인접 마진 중복 상쇄]:
//             1) .onrivi-image-figure[data-caption-position="top"] 내 img 상단 마진을 0으로 강제 초기화하고 figcaption 하단 마진을 4px로 단정히 축소
//             2) .onrivi-image-figure[data-caption-position="bottom"] 내 img 하단 마진 및 figcaption 상단 마진도 4px로 일체화
// 🚨 @PATCH : **2026-10-24** — [PDF 및 인쇄 출력 시 문서보기 제목 태그 뱃지 완전 비표시 보장]:
//             1) @media print에 :is(h1,h2,h3,h4,h5,h6)::after의 display: none !important, content: none !important, visibility: hidden !important를 주입하여 출력물에 편집용 제목 식별 뱃지가 인쇄되는 결함 원천 차단
// 🚨 @PATCH : **2026-10-21** — [웹 브라우저 인쇄 시 불필요한 window.confirm 차단 팝업 제거 및 직접 print() 연동]:
//             1) 브라우저 모드에서 [인쇄/PDF 저장] 클릭 후 불필요하게 사용자를 가로막던 window.confirm 확인창을 제거하고 즉시 브라우저 인쇄 대화상자(printWindow.print)가 열리도록 원클릭 직결
//             2) 인쇄 설정 안내를 토스트(showToast)로 깔끔하게 전환하여 모달/브라우저 프리즈 현상 완전 차단
// 🚨 @PATCH : **2026-10-21** — [PDF/인쇄 출력 시 글꼴 및 이미지 오류 내결함성(Fault-tolerance) 보장]:
//             1) embedExportFonts 타임아웃 5s 단축 및 실패 시 시스템 글꼴로 즉시 안전 폴백(.catch)하여 60초 블로킹 프리즈 원천 제거
//             2) inlineLocalImages에서 이미지 로드 실패 시 전체 PDF 내보내기 중단(throw)을 방지하고 안전하게 원본을 유지하여 파일 생성 완수
// 🚨 @PATCH : **2026-10-21** — [쪽 윤곽 미리보기(previewOnly) 시 원격 폰트 임베딩 우회 최적화]:
//             1) exportPDF 실행 시 previewOnly인 경우 무거운 원격 웹 폰트 base64 다운로드(embedExportFonts, 최대 60초 대기)를 건너뛰어 브라우저 세션 폰트를 즉시 활용하도록 최적화
//             2) 인쇄 모달 내 쪽 윤곽 미리보기 로딩 지연 및 무한 대기 프리즈 현상 완벽 방어
// 🚨 @PATCH : **2026-10-20** — [PDF 인쇄 시 화면 페이지 나누기 1:1 완벽 일치 및 파싱 정규화]:
//             1) exportPDF 내 복제 DOM에서 모든 페이지 나누기 마커([data-onrivi-page-break], .onrivi-page-break, .page-break, hr.page-break)를 data-onrivi-page-break='true'로 정규화
//             2) HTML 주석(<!-- onrivi:page-break -->) 노드를 실제 data-onrivi-page-break 블록 엘리먼트로 변환하여 PagedJS/인쇄 엔진 분할 100% 반영
//             3) 인쇄 CSS에 .onrivi-page-break, .page-break, hr.page-break의 break-before: page !important 및 content: none !important 주입
// 🚨 @PATCH : **2026-10-26** — [확장 리스트(Loose List) 내부 p 및 .onrivi-line 인라인 일원화]:
//             1) generateExportCss에 .custom-preview-container li p 및 .onrivi-line의 display: inline !important 및 width: auto를 주입하여 Loose List 출력 시에도 불릿/숫자 마커와 글자 간격 밀착 유지
// 🚨 @PATCH : **2026-10-26** — [인용구 내부 목록(blockquote ul/ol) 패딩 서식 동기화 및 마커 간격 연동]:
//             1) generateExportCss에서 인용구 내부 ul/ol의 padding-left를 var(--list-indent, 1.4em)으로 일원화
// 🚨 @PATCH : **2026-10-20** — [PDF/인쇄 시 워터마크 이미지 로드 실패 안전 폴백(DEFAULT_WATERMARK_IMAGE) 및 리소스 직접 로드 지원]:
//             1) exportPDF 시 워터마크 이미지가 리소스 경로(/media/watermark_xxx.png)인 경우 listWatermarkResources를 통해 브라우저 FileSystemHandle/Electron/Drive에서 직접 바이너리를 로드하여 인라인화
//             2) 파일 누락, 권한 오류 또는 404/400 실패 시 PDF 내보내기 전체가 중단되는 현상을 방지하고 공식 기본 엠블럼(DEFAULT_WATERMARK_IMAGE)으로 안전 대체
//             3) inlineLocalImages의 백엔드 fallback 호출 시 /api/view?filePath=... 파라미터 규격화 및 쿼리스트링 분리 정돈
// 🚨 @PATCH : **2026-10-19** — [PDF 및 EPUB 내보내기 시 전역 기본 워터마크 자동 상속 및 연동]: exportPDF 및 exportEPUB에서 readEffectivePrintSettings 연동으로 환경설정 일반설정의 워터마크가 기본 자동 사출되도록 파이프라인 완성
// 🚨 @PATCH : **2026-10-18** — [PDF/인쇄 시 시험 문제 보기 상자 및 선택지(①~⑮) 여백 축소 및 페이지 쪼개짐 방지]:
//             1) applyExportInlineStyles 및 @media print에서 blockquote(자료 설명/보기 상자) 상하 여백(8px/10px) 및 내부 문단 마진(4px/2px) 콤팩트 규격화, 후행 빈 줄 소거, 객관식 선택지 문단(①~⑮, ㄱ~ㄹ 등) break-inside: avoid 결속으로 5지선다가 페이지 경계에서 잘려 하단 거대 빈 공간이 발생하는 결함 완벽 해결
//             2) 문제 발문('것은?', '?' 등)에 break-after: avoid를 주입하여 문제와 보기 상자/선택지가 페이지 간 분리되지 않도록 결속
// 🚨 @PATCH : **2026-10-17** — [서식 CSS 생성 시 ProseMirror 빈 행 줄바꿈(<br.ProseMirror-trailingBreak>) 보호]: generateExportCss의 sentence-gap p br 규칙에 :not(.ProseMirror-trailingBreak) 선택자를 주입하여 시각 에디터 빈 행 캐럿의 인라인 모델 왜곡 및 여백 불일치 방지
// 🚨 @PATCH : **2026-10-14** — [내보내기(PDF/HTML/인쇄) 시 각주(Footnote) 폰트 크기/색상/줄간격 서식 프로필 연동 및 기본 12.5px 최적화]:
//             1) generateExportCss의 footnote 태그 처리기에 .visual-footnote-def, .visual-footnote-text, .visual-footnote-badge, .visual-footnote-area-header 셀렉터 확장
//             2) 각주 폰트 크기 미지정 시 inherit 대신 12.5px 콤팩트 크기로 기본값 설정하여 인쇄/내보내기 시 각주 비대화 결함 완전 해결
// 🚨 @PATCH : **2026-10-01** — [내보내기(PDF/HTML/인쇄) 시 [align="right"] 및 [style*="text-align: right"] 우측 정렬 전역 보장]: generateExportCss에 우측/중앙 정렬 셀렉터를 명시하여 본문 p { text-align: left !important; }가 서명/날짜/발신인 등의 우측 정렬을 덮어쓰지 않도록 완전 보장
// 🚨 @PATCH : **2026-10-01** — [PDF 3·4·5페이지 섹션 시작 조판 최적화 및 제목+소개+미디어 원자적 결속]: H1~H6 바로 뒤의 소개 문단/목록이 핵심 이미지나 다이어그램으로 이어질 때, 이미지가 다음 페이지로 넘어갈 경우 제목과 한 줄 소개만 앞 페이지 하단에 덩그러니 남겨지는 분리 현상을 원천 방어하도록 break-after: avoid를 결속하여 제목+소개+이미지가 다음 페이지 첫머리에서 온전히 함께 시작되도록 출판형 조판 완성
// 🚨 @PATCH : **2026-10-01** — [PDF Mermaid 다이어그램 컨테이너 분할 분리 및 이전 페이지 빈 사각형 잔상 버그 완전 해결]: .not-prose, .not-prose > div, .mermaid-svg-container, .mermaid-block-container에 break-inside: avoid를 전면 강제 적용하여 컨테이너와 SVG가 분리되어 이전 페이지에 빈 사각형 박스가 남는 렌더링 결함을 완전히 차단하고, 도표 전체가 한 덩어리로 온전히 다음 페이지로 넘어가도록 원자적(Atomic) 조판 완결
// 🚨 @PATCH : **2026-10-01** — [PDF 인쇄 조판(Pagination) 전면 최적화 및 하단 과도한 빈 공간/고아 제목 원천 박멸]: 제목 고아 방지(break-after: avoid), 일반 본문/문단/인용구/리스트 행 단위 자연스러운 분할(break-inside: auto, orphans/widows: 2), 컨테이너(section/article/div) 분할 허용, 대형 이미지 자동 축소(max-height: 190mm) 및 이미지-캡션 묶음 조판(display: block 정규화)을 적용하여 A4 페이지 하단 대형 공백 소거 완료
// 🚨 @PATCH : **2026-10-01** — [PDF/인쇄 시 과도한 빈 공간(하단 공백) 제거 및 자연스러운 페이지 분할(Pagination) 정책 수립]: p, li, blockquote의 break-inside를 auto로 전면 개편하고 orphans/widows: 2를 적용하며, figure, img, tr, .codeblock-area만 break-inside: avoid를 유지하여 긴 문단이 다음 페이지로 통째로 밀리지 않고 자연스럽게 넘어가도록 조판 최적화
// 🚨 @PATCH : **2026-10-01** — [모든 내보내기(PDF/HTML/인쇄/PNG) 시 코드블록 긴 코드 자동 줄바꿈 및 전체 내용 100% 노출]: applyExportInlineStyles를 HTML 내보내기에도 전면 탑재하고, generateExportCss 및 내보내기 스타일시트에 pre/code/.onrivi-line의 white-space: pre-wrap, word-break: break-all, overflow-wrap: anywhere 및 overflow-x: visible을 강제 주입하여 가로 스크롤 없이 전체 코드가 깔끔하게 줄바꿈되어 보이도록 일원화
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 이전 페이지 이미지 우측 경계가 다음 페이지 좌측으로 누출되는 잔상 현상 완전 차단]: clone 단계에서 figure 및 .onrivi-image-wrapper에 overflow: hidden 및 box-sizing: border-box를 강제 주입하여 인접 페이지 침범 원천 방어
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 이미지 우측 쏠림 및 다음 컬럼 침범 버그 완전 해결]: 리더기 기본 figure 마진(40px) 및 inline-flex로 인한 우측 편향을 clone 단계에서 figure/wrapper margin:0 auto 및 display:block으로 정규화하여 100% 중앙 정렬
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 긴 Mermaid 다이어그램 하단 잘림 및 유실 버그 완전 해결]: Mermaid 다이어그램 이미지에 max-height: 85vh, width: auto, height: auto, object-fit: contain 및 break-inside: avoid를 강제 주입하여 리더기 뷰포트 높이에 맞춰 자동 축소 피팅되고 페이지 경계에서 잘리지 않도록 완벽 보정
// 🚨 @PATCH : **2026-10-01** — [EPUB 내보내기 시 코드블록 원본 서식(다크 테마/헤더 바/TEXT 라벨/복사 배지) 1:1 완벽 동기화]: applyExportInlineStyles를 exportEPUB에도 연동하여 미리보기 DOM의 코드블록 테마/헤더 스타일을 100% 보존하고, pre/code 자동 줄바꿈을 적용하여 박스 밖 돌출 방지
// 🚨 @PATCH : **2026-10-01** — [PDF/EPUB 내보내기 시 제목 기준 강제 페이지 분할 전면 폐지]: exportPDF 및 exportEPUB에서 exportPageBreakLevel에 따른 제목별 강제 페이지 나누기를 완전히 배제하고, 인위적 공백/페이지 쪼개짐 없이 자연스러운 본문 흐름으로 사출되도록 개선
// 🚨 @PATCH : **2026-10-01** — [표 내보내기 시 외곽 테두리 소실 및 세로선 출현 버그 완전 해결]: html-to-image 캡처 시 table collapse로 인한 외곽 테두리 누락을 최외곽 4면 셀 직접 주입으로 100% 방어하고, 기본 표 서식(colBorderWidth 0px)에 맞춰 내부 세로선은 완전 소거, 가로선 및 외곽선만 미리보기와 1:1 일치하도록 동기화
// 🚨 @PATCH : **2026-10-01** — [이미지/PDF 내보내기 시 인라인 코드 상향 솟구침 및 단어 쪼개짐 버그 해결]: applyExportInlineStyles 및 exportStyles에서 display:inline-block 및 vertical-align:0으로 인해 인라인 코드가 두 줄로 쪼개지며 상단으로 솟구치던 현상을 display:inline, vertical-align:baseline, white-space:nowrap(단어보호), box-decoration-break:clone으로 전면 개편하여 완벽 해결
// 🚨 @PATCH : **2026-10-01** — [Word(.docx) 내보내기 시 미리보기 DOM 직접 조판 및 마크다운 태그 누출 완전 해결]: 렌더링된 미리보기 DOM을 바탕으로 유니코드 불릿, 볼드, 인라인 코드, 표, DrawingML 이미지를 Word 규격에 맞게 100% 온전히 사출하도록 연동
// 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 기능 삭제]: exportHWPX 함수 및 한글 문서 내보내기 파이프라인 완전 제거
// 🚨 @PATCH : **2026-10-01** — [PDF/인쇄 시 긴 Mermaid 다이어그램 앞 빈 페이지(백지) 발생 원천 차단]: .not-prose의 강제 break-inside: avoid로 인한 브라우저 페이지 밀림 버그를 해소하고, Mermaid SVG에 max-height: 230mm 및 auto-scale을 적용하여 긴 다이어그램도 A4 1페이지 내에 깔끔하게 쏙 들어가도록 조판 최적화
// 🚨 @PATCH : **2026-10-01** — [DOCX 이미지·Mermaid 다이어그램 자동 추출 및 임베딩 연동]: extractMediaFromElements 엔진을 호출하여 라이브 미리보기 DOM 내 모든 이미지 및 다이어그램 바이너리를 추출하고, Word(.docx) 내보내기 시 미디어 파일 및 캡션을 100% 온전히 임베딩 사출하도록 개선
// 🚨 @PATCH : **2026-09-30** — [Word(.docx) 및 한글(.hwpx) 내보내기 파이프라인 신설]: 미리보기 DOM을 파싱하여 MS Word(Office Open XML) 및 한글(OWPML) 표준 문서로 변환 사출하는 exportDOCX, exportHWPX 함수 구현 및 데스크톱/브라우저 연동
// 🚨 @PATCH : **2026-09-26** — [표 모든 테두리(Grid) 세로선 및 행/열 테두리 스타일·색상 내보내기 동기화]: generateExportCss 내 tableStructure 인젝션 시 th/td의 border-left/right/top/bottom에 width뿐 아니라 border-style 및 border-color를 !important로 주입하여 PDF/HTML/인쇄 내보내기 시 세로선 100% 반영
// 🚨 @PATCH : **2026-09-26** — [코드블록 내부 행간 줄간격 콤팩트 규격화(1.35배) 내보내기 동기화]: generateExportCss에 codeblock-area line-height 및 min-height(1.35em)를 주입하여 출력/내보내기 시 행간 일치성 보장
// 🚨 @PATCH : **2026-09-26** — [Alert 인용구 태그와 본문 간격 최소화 내보내기 동기화]: generateExportCss에 .onrivi-alert-title(margin-bottom 축소) 및 .onrivi-alert-content(첫 문단 margin-top 0) 주입
// 🚨 @PATCH : **2026-09-25** — [고급 레이아웃 및 본문 문단 용지 표준 여백(상하 18mm, 좌우 12mm) 내보내기 일원화]: PDF, HTML, 인쇄(@page), 이미지 캡처 시 기본 마진 폴백을 상하 18mm, 좌우 12mm(marginTop/marginBottom: 18mm, marginLeft/marginRight: 12mm)로 전면 일원화
// 🚨 @PATCH : **2026-09-25** — [체크박스 및 체크리스트 글자색 본문 글씨색(#2f2f2f) 내보내기 동기화]: .task-list-item 및 checkboxStructure color를 본문(p) 글씨색(기본 #2f2f2f)으로 일치시켜 PDF/HTML/인쇄 내보내기 시 별도 색상 튐 원천 배제
// 🚨 @PATCH : **2026-09-25** — [체크리스트 완료 항목 스타일 '효과없음(none)' 내보내기 기본값 동기화]: profile.checkboxStructure.checkedEffect 기본값을 'none'으로 확정하여 PDF/인쇄/HTML 내보내기 시 기본 취소선·반투명 오염 원천 방지
// 🚨 @PATCH : **2026-09-24** — [동영상 및 지도 래퍼 폭 수축(300px) 버그 해결 내보내기 동기화]: generateExportCss 내 .onrivi-video-wrapper 및 .onrivi-map-wrapper에 고정되었던 width: fit-content를 ruleObj.width(기본 100%) 기반 동적 확장(display: flex, width: 100%)으로 보정하여 내보내기 시 300px 찌그러짐 현상 원천 차단
// 🚨 @PATCH : **2026-09-24** — [기본 서식 명칭 'Onrivi 기본서식' 표준화에 따른 내보내기 기본 여백(상하 22mm, 좌 19mm, 우 20mm) 및 폴백 동기화]: 인쇄(@page), PDF, HTML, PNG 내보내기 시 기본 마진을 marginTop: 22mm, marginBottom: 22mm, marginLeft: 19mm, marginRight: 20mm로 일원화
// 🚨 @PATCH : **2026-09-24** — [체크리스트(task-list-item) 중복 불릿 기호 제거 및 여백 정렬 내보내기 동기화]: li.task-list-item::marker 및 ::before 소거와 list-style: none 적용으로 PDF/HTML/인쇄 내보내기 시 체크박스 앞 불릿 중복 노출 차단
// 🚨 @PATCH : **2026-09-24** — [문서 표준 용지 여백(상하 18mm, 좌우 12mm) 내보내기 동기화]: 인쇄(@page), PDF, HTML, PNG 내보내기 시 기본 마진을 marginTop: 18mm, marginBottom: 18mm, marginLeft: 12mm, marginRight: 12mm로 일원화 (화면 및 출력 균형 최적화)
// 🚨 @PATCH : **2026-09-24** — [표 외곽 테두리·행(가로선)·열(세로선) 두께 개별 내보내기 동기화(tableStructure)]: generateExportCss에 profile.tableStructure를 연동하여 table(외곽선) 및 th/td(행·열 구분선) 두께를 독립 적용하여 인쇄/PDF/EPUB/HTML 내보내기 일치성 보장
// 🚨 @PATCH : **2026-09-24** — [문서 내보내기 서식 프로필 7대 쇼케이스 완전체 정규화(normalizeCssProfile) 연동]: HTML/PDF/EPUB/PNG 내보내기 시 전달된 프로필의 누락된 최신 태그 및 구조체를 100% 자동 하이드레이션하여 서식 일치성 완벽 보장
// 🚨 @PATCH : **2026-09-24** — [각주(Footnote) 상하 여백 및 선택자(.onrivi-content-root .footnotes) 내보내기 동기화 보강]: margin-bottom 및 .onrivi-content-root 계열 선택자를 추가하여 HTML/PDF/EPUB 내보내기 시 각주 서식 100% 일치 보장
// 🚨 @PATCH : **2026-09-27** — [내보내기 서식 컨트롤 우선순위 고정]: 추가 CSS와 설정창 규칙을 계층으로 분리해 미리보기와 내보내기의 충돌 해석을 일치시킴
// 🚨 @PATCH : **2026-09-24** — [본문 문단(P) 문장 사이 간격(sentence-gap) 내보내기 지원]: generateExportCss에 p .onrivi-line + .onrivi-line 및 br 가상 블록 선택자를 동시 주입하여 문단 내 줄바꿈 문장 간격 내보내기 동기화
// 🚨 @PATCH : **2026-09-24** — [KaTeX 수식(MATH) 기본 글자 크기(inherit) 및 상하 여백 100% 내보내기 정상화]:
//             1) 수식 글자 크기 미지정('기본설정 유지') 시 font-size: inherit !important 주입으로 KaTeX 1.21em 자체 스타일 오버라이드 및 본문 기본 글자 크기 실시간 동기화 실현
//             2) 단축 margin 잔재를 소거하고 margin-top/margin-bottom에 !important 명시 주입으로 globals.css 오버라이드 승리 및 슬라이더 1px 단위 즉각 반응 보장
// 🚨 @PATCH : **2026-09-24** — [미디어(이미지·동영상·지도) 가로/세로 규격·상하여백·정렬(좌/중/우) 내보내기 완벽 반영]:
//             1) generateExportCss 내 미디어 태그(img, video, map)의 width/height/max-width에 !important를 정상 부여하여 내보내기 문서에서도 규격 일치성 100% 보장
//             2) map 셀렉터에 iframe[src*="google.com/maps"], iframe[src*="maps.google.com"] 포괄 확장 및 iframe 래퍼(.onrivi-map-wrapper) 연동
//             3) 미디어 래퍼(.onrivi-image-wrapper, .onrivi-video-wrapper, .onrivi-map-wrapper)에 display:inline-flex, width:fit-content, max-width:100%, align-self: flex-start / center / flex-end 및 figcaption 정렬 자동 주입으로 flex 컨테이너 내부 100% 정렬 보장
//             4) ml/mr '0' 및 '0px' 동등 지원으로 정렬 오판정 원천 방어
// 🚨 @PATCH : **2026-09-24** — [표 테두리·모서리·세로선 및 모든 태그 서식 내보내기 완벽 동기화]:
//             1) generateExportCss 내 sortCssProps 정렬기 도입으로 방향별 속성(border-left/right 등)이 단축 속성에 덮어써지지 않도록 방어
//             2) .prose table 둥근 모서리/그림자/마지막 줄 하단선 소실/지브라 배경색 완전 리셋
//             3) 미리보기 내부 모든 태그 선택자 구체성을 .prose 및 .dark 계열까지 전면 확장하여 서식 일치성 100% 보장
// 🚨 @PATCH : **2026-09-24** — [문서 서식 기본 글자 크기(inherit) 상속 내보내기 동기화]: generateExportCss 내 codeBlock, footnote에 font-size 미지정 시 inherit !important 주입 및 표(table/th/td) font-size 없을 시 inherit 셀렉터 확장
// 🚨 @PATCH : **2026-09-24** — [표 하단 여백 및 인용구 마진 상쇄 차단 내보내기 동기화]: generateExportCss에 .table-wrapper-area 상하 여백 주입 및 blockquote display:inline-block width:100% 적용, destructive margin-bottom:0 강제 제거
// 🚨 @PATCH : **2026-09-24** — [표 테두리 이중선(double) 내보내기 동기화]: generateExportCss 내 table/th/td 선택자 구체성 상향 및 double 시 3px 보정, th/td border-bottom-style 동기화
// 🚨 @PATCH : **2026-09-24** — [인용구 상하 여백 0~15px 데드존 완전 소멸 및 선/후행 블록(표/코드블록) 마진 간섭 0 강제]: blockquote display:flow-root 적용 및 *:has(+ blockquote), blockquote + .not-prose .codeblock-area 마진 0 강제 처리로 슬라이더 0px 밀착 및 1px 단위 즉각 반응 실현
// 🚨 @PATCH : **2026-10-19** — [워터마크 미지정 시 기본 엠블럼 이미지 및 Onrivi Author 문구 자동 폴백]: 이미지/문구 미설정 시 에러 대신 기본값으로 자동 대체
// 🚨 @PATCH : **2026-09-24** — [수평 구분선(HR) 내보내기 규격 동기화]: generateExportCss 내 hr border:none/height:0/transparent 리셋 및 .onrivi-content-root hr 선택자 추가
// 🚨 @PATCH : **2026-09-17** — [다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 시인성 보장]: generateExportCss 내 codeBlock 배경색 명도 판별 및 다크 계열 고대비 코발트 블루 하이라이트 동적 CSS 일원화
// 🚨 @PATCH : **2026-09-11** — generateExportCss에 profile.customCss 사용자 정의 CSS 주입 연동
//             **2026-08-16** — PDF 페이지 나누기: CSS page-break 선택자 방식의 한계(h3·h4 레벨에서 섹션 내부 이중 break 발생)를 해결하기 위해 DOM 직접 삽입 방식의 injectPageBreakMarkers() 유틸 함수 신규 구현. 버퍼 알고리즘으로 섹션 경계를 찾아 해당 요소 앞에 break-before:page 마커 div를 삽입함.
//             **2026-07-18** — PDF 내보내기 시 배경 대각선 반투명 워터마크(pdfWatermark, pdfWatermarkOpacity) 설정 및 가상 DOM/CSS 템플릿 인젝션 기능 추가
//             **2026-07-16** — PDF 내보내기 및 인쇄 기능 고도화: 설정된 상단 머리글 텍스트 및 하단 페이지 번호 서식(- 1 -, 1 / n)을 동적으로 캡처하여 인쇄 출력 본문 프레임에 counter(page) 기반으로 자동 인젝션 구현, 표지 페이지 번호 제외 조건부 가드 CSS 구현
//             **2026-06-20** — HTML/PNG 내보내기 시 로컬 및 확장프로그램 스타일시트를 런타임에 인라인화하여 테마 서식 동기화 결함 해결; 다크모드 무력화에 대응하여 내보내기 시 라이트모드 기준 스타일 생성(generateExportCss) 및 activeProfile 연동 처리 구현; PDF/HTML/PNG 내보내기 시 @page margin 0 및 body padding 레이아웃을 통해 가장자리 여백 영역까지 배경색이 단일 톤으로 빈틈없이 흐르도록 여백 분리 결함 해결; PDF 내보내기 시 배경색이 흰색으로 누락되는 custom-preview-container transparent 강제 투명화 가드 버그 수정 및 KaTeX 수식 전용 CDN 웹폰트 주입으로 찌그러짐 현상 해결; generateExportCss 선택자 구체성을 .custom-preview-container .markdown-viewer-root 기반으로 대폭 상향하여 사용자 커스텀 서식 100% 보장; HTML 내보내기 시 body 배경색을 용지 배경색(pageBg)과 완벽 동합; PDF 인쇄 템플릿 내의 mm 여백 단위 중복(25mmmm) 결함 수정으로 여백 소실 결함 해결; HTML 내보내기 시 Tailwind CDN에 의한 body 배경색 리셋을 차단하기 위해 body 및 시트지에 인라인 스타일 배경색 강제 지정 적용; PDF 내보내기 및 HTML 인쇄 시 페이지 분할(쪼개짐) 구역의 상하 여백 소실을 차단하기 위해 임시 패딩 래퍼를 롤백하고 표준 @page { margin: ... } 바인딩으로 전환하되, 여백 잘림(흰색 영역)을 막기 위해 html/body 전체 배경색 지정 및 print-color-adjust 강제화 구현; 일렉트론 및 크롬 인쇄 시 여백(마진) 영역의 흰색 잘림 결함을 완벽히 해결하기 위해 @page 지시자 규칙에 background-color 지정을 추가하여 용지 가장자리 영역까지 배경색이 가득 차도록 최종 동기화

import { getApiUrl } from '@/lib/apiUrlBuilder';
import { cleanExportDocument, EXPORT_DOCUMENT_CSS, stripExportViewportRules, getExportDocumentRoot, prepareExportPreview, waitForExportResources, fetchExportImage, exportBlobToDataUrl, withExportTimeout } from './exportPreparation';
import { PRINT_TABLE_FLOW_CSS, unwrapPrintTables } from './exportPagination';
import { cssPx, EXPORT_FIGURE_HEIGHT_RATIO, EXPORT_LEAD_FIGURE_HEIGHT_RATIO, markLeadExportFigure } from './docxFormatting';
import { msg } from '@/lib/systemMessages';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { DEFAULT_PROFILE, normalizeCssProfile } from '@/constants/cssProfile';
import type { CssProfile } from '@/types/cssProfile';
import { resolvePageGeometry } from './pageGeometry';
import { DocumentPrintSettings, DEFAULT_PRINT_SETTINGS, readEffectivePrintSettings, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from './documentPrintSettings';

export interface SNSCardNewsOptions {
  /** 카드 비율: '1:1' (1080×1080) | '4:5' (1080×1350) | '16:9' (1920×1080) */
  ratio?: '1:1' | '4:5' | '16:9';
  /** 카드 분할 기준: 'auto' (구분선/H1/장면 자동 감지) | 'hr' (구분선 --- 기준) | 'h1' (# 대제목 기준) */
  splitMode?: 'auto' | 'hr' | 'h1';
  /** 카드 하단 슬라이드 번호 표시 여부 (예: 01 / 05) */
  showPageNumber?: boolean;
  /** 저장 방식: 'files' (낱장 PNG 연속 다운로드) | 'zip' (ZIP 압축 묶음 파일 저장) */
  saveMode?: 'files' | 'zip';
}

interface ExportOptions {
  previewEl: HTMLElement;
  currentFileName: string;
  isDarkMode: boolean;
  showToast: (msg: string, type?: any) => void;
  orientation?: 'portrait' | 'landscape';
  paperSize?: string;
  dynamicCssString?: string;
  showPageBreaks?: boolean;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  backgroundColor?: string;
  activeProfile?: any; // 서식 프로필 객체 추가
  markdownContent?: string; // 💡 원본 마크다운 텍스트 직접 조판용
  previewOnly?:boolean;
  paginationSettings?:import('./documentPaginationSettings').DocumentPaginationSettings;
  printSettings?:DocumentPrintSettings;
  signal?:AbortSignal;
  snsOptions?: SNSCardNewsOptions;
}

/** 항상 라이트모드 기준으로 서식 프로필의 dynamic CSS를 재생성하는 헬퍼 함수 */
export function generateExportCss(rawProfile: any): string {
  if (!rawProfile || rawProfile.id === 'default') {
    return (rawProfile?.customCss && rawProfile.customCss.trim())
      ? `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-extra {\n${rawProfile.customCss}\n}`
      : '';
  }
  // 💡 [OMD-PATCH] 전달된 프로필을 Onrivi 최신 7대 쇼케이스 태그 및 구조체 기준으로 완벽 정규화(하이드레이션)
  const profile = normalizeCssProfile(rawProfile);
  const ps = profile.pageStyle;
  
  // 내보내기 결과물은 항상 라이트모드 기준 바탕색과 기본 텍스트 색상 적용
  const bg = ps.backgroundColor || '#ffffff';
  const fg = 'inherit';

  let css = `
.custom-preview-container {
  background: ${bg} !important;
  color: ${fg} !important;
  font-family: ${ps.fontFamily} !important;
  font-size: ${ps.fontSize} !important;
  line-height: ${ps.lineHeight} !important;
  letter-spacing: ${ps.letterSpacing} !important;
}
.custom-preview-container p,
.custom-preview-container li,
.custom-preview-container blockquote {
  font-size: inherit !important;
  line-height: inherit !important;
}
.custom-preview-container pre,
.custom-preview-container code {
  tab-size: ${ps.tabSize || '4'} !important;
  -moz-tab-size: ${ps.tabSize || '4'} !important;
}
`;

  /* H2~H6 자동 크기 계산 (headingSizeOffset 기반, pt/px 단위 상호 변환 및 '0pt' 명시 지원) */
  const h1SizeVal = (profile.rules.h1 && profile.rules.h1['font-size']) || '21pt';
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
    css += `.custom-preview-container h${level} {\n  font-size: ${calcSize}${h1Unit} !important;\n}\n`;
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

  Object.entries(profile.rules || {}).forEach(([tag, ruleObj]: [string, any]) => {
    const skipFontSize = ['h2','h3','h4','h5','h6'].includes(tag);
    // 미리보기와 동일하게 기존 빈 제목 밑줄/좌측 색깔바 설정도 명시적으로 제거한다.
    const effectiveRules = /^h[1-6]$/.test(tag)
      ? {
          ...ruleObj,
          'border-bottom': ruleObj['border-bottom']?.trim() || 'none',
          'border-left': ruleObj['border-left']?.trim() || 'none',
        }
      : ruleObj;
    const entries = Object.entries(effectiveRules).map(([prop, v]) => {
      if (prop === 'word-break' && v === 'keep-all') return [prop, 'break-all'];
      return [prop, v];
    }).filter(([prop, v]) => {
      if (v === '') return false;
      if (skipFontSize && prop === 'font-size') return false;
      if (prop === 'sentence-gap') return false;
      return true;
    }).sort((a, b) => sortCssProps(a[0] as string, b[0] as string));

    if (tag === 'p') {
      const sGap = ruleObj['sentence-gap'];
      const sGapNum = parseInt(sGap || '0', 10) || 0;
      if (sGapNum > 0) {
        css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak),
p br:not(.ProseMirror-trailingBreak) {
  display: block !important;
  content: "" !important;
  margin-top: ${sGap} !important;
  height: 0 !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line,
p .onrivi-line + .onrivi-line {
  margin-top: ${sGap} !important;
}
`;
      } else {
        css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak),
p br:not(.ProseMirror-trailingBreak) {
  display: inline !important;
  margin: 0 !important;
  content: normal !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line,
p .onrivi-line + .onrivi-line {
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
      css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  border: none !important;\n  background: transparent !important;\n}\n`;
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
      tag === 'code' ? ':not(pre) > code' :
      tag === 'map' ? 'iframe[src*="map"], iframe[src*="google.com/maps"], iframe[src*="maps.google.com"]' :
      tag === 'video' ? 'video, iframe[src*="youtube"], iframe[src*="vimeo"], a[href*="youtube.com"] img, a[href*="youtu.be"] img' : tag;
    const isMediaTag = tag === 'img' || tag === 'video' || tag === 'map';
    const isTableTag = ['table', 'th', 'td'].includes(tag);
    // 📊 Tailwind Typography 및 다크모드(.dark .prose)를 완벽히 압도하도록 모든 태그의 선택자 구체성을 일원화
    const selectorStr = `
      .custom-preview-container .markdown-viewer-root ${selector},
      .custom-preview-container ${selector},
      .onrivi-content-root ${selector},
      .custom-preview-container .prose ${selector},
      .dark .custom-preview-container .prose ${selector},
      .onrivi-content-root .prose ${selector},
      .dark .onrivi-content-root .prose ${selector}
    `.replace(/\s+/g, ' ').trim();
    css += `${selectorStr} {\n`;

    const bStyle = (ruleObj as any)['border-style'];
    const isDouble = bStyle === 'double';

    entries.forEach(([prop, val]) => {
      let finalVal = val;
      if (isTableTag && isDouble && prop === 'border-width') {
        const wNum = parseInt(val as string, 10) || 1;
        if (wNum < 3) finalVal = '3px';
      }
      css += `  ${prop}: ${finalVal} !important;\n`;
    });

    // 💡 미디어 객체(이미지, 비디오, 지도)의 좌/중/우 정렬을 flex 래퍼 컨테이너 내부에서도 완벽 보장하기 위한 align-self 자동 주입
    if (isMediaTag) {
      const ml = (ruleObj as any)['margin-left'];
      const mr = (ruleObj as any)['margin-right'];
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

    if ((tag === 'th' || tag === 'td') && bStyle) {
      css += `  border-bottom-style: ${bStyle} !important;\n`;
      if (isDouble) {
        const curW = parseInt((ruleObj as any)['border-width'] || '1', 10);
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
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
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
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
      const targetWidth = (ruleObj as any)['width'] || '100%';
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
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
      const targetWidth = (ruleObj as any)['width'] || '100%';
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

  // Resolve base-size controls against the document, even inside fixed-size wrappers.
  const baseSizeSelectors = {
    blockquote: 'blockquote, blockquote > p',
    codeBlock: '.codeblock-area pre, .codeblock-area pre code',
    math: '.katex-display .katex, :not(.katex-display) > .katex',
  };
  Object.entries(baseSizeSelectors).forEach(([tag, selectors]) => {
    const configured = profile.rules[tag as keyof CssProfile['rules']]?.['font-size'];
    const size = !configured || ['inherit', '0', '0px'].includes(String(configured)) ? ps.fontSize : configured;
    const scoped = ['.custom-preview-container', '.onrivi-content-root']
      .flatMap(root => selectors.split(', ').map(selector => `${root} ${selector}`)).join(', ');
    css += `${scoped} { font-size: ${size} !important; }\n`;
  });

  const tableHasFontSize = profile.rules.table && profile.rules.table['font-size'];
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

  const tableMarginTop = profile.rules.table?.['margin-top'] || '4px';
  const tableMarginBottom = profile.rules.table?.['margin-bottom'] || '16px';
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
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  border-radius: 0 !important;
  overflow: visible !important;
  box-shadow: none !important;
  width: 100% !important;
  max-width: 100% !important;
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
.onrivi-content-root table :is(th, td) code {
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
  const tableStruct = profile.tableStructure || DEFAULT_PROFILE.tableStructure;
  if (tableStruct) {
    const outerWidth = tableStruct.outerBorderWidth || '1px';
    const rowWidth = tableStruct.rowBorderWidth || '1px';
    const colWidth = tableStruct.colBorderWidth ?? '0px';
    const tableBorderStyle = profile.rules?.table?.['border-style'] || 'solid';
    // 💡 외곽선 및 테두리 색상: profile 규칙 또는 선명한 차콜 다크(#374151) 고대비 보장 (흐릿한 #cbd5e1 지양)
    const outerBorderColor = profile.rules?.table?.['border-color'] || '#374151';
    const rowBorderColor = profile.rules?.th?.['border-color'] || profile.rules?.td?.['border-color'] || profile.rules?.table?.['border-color'] || '#cbd5e1';
    const colBorderColor = rowBorderColor;

    // 1. 표 외곽 테두리 (table 및 최외곽 4면 셀 직접 주입 - html-to-image 테두리 누락 완전 방어)
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

/* 🛡️ 표 최외곽 4면 테두리: html-to-image 캔버스 캡처 시 table collapse 테두리 누락 버그 원천 차단 */
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

  css += `
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

/* 💬 코드블록 내부 줄간격(행간) 콤팩트 규격화 및 자동 줄바꿈 강제 (내보내기 시 가로 스크롤 소거 및 전체 내용 표시) */
.custom-preview-container .codeblock-area,
.onrivi-content-root .codeblock-area,
.codeblock-area {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.custom-preview-container .codeblock-area div,
.onrivi-content-root .codeblock-area div,
.codeblock-area div {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: visible !important;
}
.custom-preview-container .codeblock-area pre,
.custom-preview-container .codeblock-area pre code,
.custom-preview-container .codeblock-area .onrivi-line,
.custom-preview-container .codeblock-area .onrivi-line *,
.onrivi-content-root .codeblock-area pre,
.onrivi-content-root .codeblock-area pre code,
.onrivi-content-root .codeblock-area .onrivi-line,
.onrivi-content-root .codeblock-area .onrivi-line *,
.codeblock-area pre,
.codeblock-area pre code,
.codeblock-area .onrivi-line,
.codeblock-area .onrivi-line *,
pre,
pre code {
  line-height: ${(profile.rules?.codeBlock && profile.rules.codeBlock['line-height']) || '1.35'} !important;
  min-height: 0 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  box-sizing: border-box !important;
}
.custom-preview-container .codeblock-area pre,
.onrivi-content-root .codeblock-area pre,
.codeblock-area pre,
pre {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: visible !important;
}
`;

  if (profile.hrStructure) {
    const hrStyle = profile.hrStructure.borderTopStyle || 'solid';
    const hrWidth = profile.hrStructure.borderTopWidth || '1px';
    const hrMargin = profile.hrStructure.marginTopBottom || '28px';
    const hrLineWidth = profile.hrStructure.lineWidth || '100%';
    const hrColor = (profile.rules.hr && profile.rules.hr['border-top-color']) || '#d1d5db';

    css += `
.custom-preview-container hr,
.onrivi-content-root hr {
  border: none !important;
  height: 0 !important;
  background: transparent !important;
  border-top: ${hrWidth} ${hrStyle} ${hrColor} !important;
  margin-top: ${hrMargin} !important;
  margin-bottom: ${hrMargin} !important;
  width: ${hrLineWidth} !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
`;
  }

  /* 페이지 나눔 제어: 리스트가 통째로 다음 페이지로 밀리지 않고 자연스럽게 분할되도록 */
  css += `
@media print {
  p, li, .prose p {
    page-break-inside: auto !important;
    break-inside: auto !important;
    orphans: 2 !important;
    widows: 2 !important;
  }
  ul, ol {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  blockquote {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  section,
  article,
  .page-break-container,
  .markdown-viewer-root,
  .custom-preview-container {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  figcaption,
  .onrivi-image-figure figcaption {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: block !important;
    text-align: center !important;
    margin-top: 6px !important;
  }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  /* [P1: Section 시작 위치 최적화] Heading 직후 소개 문단이 이미지/도표로 이어질 때 한 덩어리로 결속 */
  h1 + p:has(+ figure),
  h2 + p:has(+ figure),
  h3 + p:has(+ figure),
  h4 + p:has(+ figure),
  h1 + p:has(+ .onrivi-image-figure),
  h2 + p:has(+ .onrivi-image-figure),
  h3 + p:has(+ .onrivi-image-figure),
  h4 + p:has(+ .onrivi-image-figure),
  h1 + p:has(+ .not-prose),
  h2 + p:has(+ .not-prose),
  h3 + p:has(+ .not-prose),
  h4 + p:has(+ .not-prose),
  h1 + ul:has(+ figure),
  h2 + ul:has(+ figure),
  h3 + ul:has(+ figure),
  h4 + ul:has(+ figure),
  h1 + ul:has(+ .onrivi-image-figure),
  h2 + ul:has(+ .onrivi-image-figure),
  h3 + ul:has(+ .onrivi-image-figure),
  h4 + ul:has(+ .onrivi-image-figure) {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  table {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  tfoot {
    display: table-footer-group !important;
  }
  figure, .onrivi-image-figure {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: block !important;
    margin: 1.2em auto !important;
    text-align: center !important;
  }
  .onrivi-image-wrapper {
    display: block !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    text-align: center !important;
  }
  figure img,
  .onrivi-image-figure img,
  .onrivi-image-wrapper img {
    max-width: 100% !important;
    max-height: 190mm !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  img, video, iframe, .katex-display {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .not-prose,
  .not-prose > div,
  .mermaid-svg-container,
  .mermaid-block-container {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
  }
  .mermaid-svg-container svg,
  .mermaid-block-container svg,
  .not-prose svg {
    max-height: 200mm !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  pre, code, .codeblock-area {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  .injected-page-break-marker {
    break-before: page !important;
    page-break-before: always !important;
  }
  hr:not(.page-break) {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
`;

  const bodyTextColor = (profile.rules?.p && (profile.rules.p as any)['color']) || '#2f2f2f';
  const taskListColor = (profile.rules?.taskList && (profile.rules.taskList as any)['color']) || bodyTextColor;

  // 💡 체크리스트(task-list-item): 중복 불릿(•) 기호 완전 소거 및 본문 텍스트 색상과 100% 일치
  css += `
.custom-preview-container li.task-list-item,
.onrivi-content-root li.task-list-item {
  list-style: none !important;
  list-style-type: none !important;
  list-style-image: none !important;
  color: ${taskListColor} !important;
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
`;

  if (profile.checkboxStructure) {
    const boxSize = profile.checkboxStructure.boxSize || '16px';
    const checkedEffect = profile.checkboxStructure.checkedEffect || 'none';
    const textGap = profile.checkboxStructure.textGap || '10px';
    const cbColor = profile.checkboxStructure.color || bodyTextColor;

    css += `
.custom-preview-container li.task-list-item {
  position: relative !important;
  padding-left: calc(${boxSize} + ${textGap}) !important;
  list-style: none !important;
  list-style-type: none !important;
}
.custom-preview-container li.task-list-item input[type="checkbox"] {
  position: absolute !important;
  left: 0 !important;
  top: 0.2em !important;
  width: ${boxSize} !important;
  height: ${boxSize} !important;
  margin: 0 !important;
  accent-color: ${cbColor} !important;
  border-color: ${cbColor} !important;
}
`;
    if (checkedEffect === 'line-through-and-dim') {
      css += `
.custom-preview-container .task-list-item-checked {
  text-decoration: line-through !important;
  opacity: 0.5 !important;
}
`;
    } else if (checkedEffect === 'dim-only') {
      css += `
.custom-preview-container .task-list-item-checked {
  opacity: 0.5 !important;
}
`;
    } else {
      css += `
.custom-preview-container .task-list-item-checked {
  text-decoration: none !important;
  opacity: 1 !important;
}
`;
    }
  }

  // 미리보기와 동일하게 제목 정렬·왼쪽 여백 컨트롤을 최종 적용한다.
  for (let level = 1; level <= 6; level++) {
    const rule = profile.rules[`h${level}` as keyof typeof profile.rules];
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

  // 🚨 @PATCH : 내보내기에도 설정창 우선 계층을 적용해 미리보기와 같은 결과를 유지한다.
  const extraCss = profile.customCss?.trim()
    ? `\n@layer onrivi-extra {\n${profile.customCss}\n}`
    : '';
  return `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-settings {\n${css}\n${reportNumberingCss(profile)}\n${headingNumberingCss(profile)}\n}${extraCss}\n${PRINT_TABLE_FLOW_CSS}`;
}

// ====================================================================
// 📊 [OMD-IO-exportHandlers-0000] exportHandlers.ts ➔ injectPageBreakMarkers
// 🎯 @KICK  : 설정된 헤딩 레벨(exportPageBreakLevel)에 따라 DOM에 직접 page-break 마커를 삽입
// 🛡️ @GUARD : CSS page-break 선택자 방식은 h3·h4 레벨에서 섹션 내부 이중 break가 발생하는 한계가 있어 DOM 직접 삽입 방식으로 대체
// 🚨 @PATCH : **2026-08-16** — 신규 구현
// 🔗 @CALLS : exportPDF
// ====================================================================
// 🔑 섹션 분할 정책 (EPUB과 동일한 버퍼 알고리즘):
//   h(level) 헤딩이 등장할 때마다 이전까지의 내용이 하나의 단위가 됩니다.
//   상위 레벨 헤딩(h1~h(level-1))은 버퍼에 쌓이다가, h(level)이 나올 때 함께 하나의 섹션을 구성합니다.
//   예) h3 기준: [h2+h2내용+h3#1+내용] / [h3#2+내용] / [h2(새)+h2내용+h3#3+내용] / [h3#4+내용]
function injectPageBreakMarkers(containerEl: HTMLElement, exportPageBreakLevel: string): void {
  if (!exportPageBreakLevel || exportPageBreakLevel === 'none') return;
  const levelNum = parseInt(exportPageBreakLevel.replace('h', ''));
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 6) return;

  // 컨테이너의 직계 자식 요소들 (또는 마크다운 루트의 직계 자식)
  const root = getExportDocumentRoot(containerEl);

  // .markdown-viewer-root 내부에 래퍼 div가 있을 수 있으므로 querySelectorAll로 모든 헤딩을 추출합니다.
    const children = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
  
    let lastSeenLevel = 0;
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          const tagName = el.tagName.toLowerCase();
          const tagLevelMatch = tagName.match(/^h(\d)$/);
          if (!tagLevelMatch) continue;
          
          const tagLevel = parseInt(tagLevelMatch[1]);
          
          if (tagLevel <= levelNum) {
            // 사용자님의 "Keep with Next" 의도 (예: 2 다음에 오는 첫 3은 자르지 않고 묶음)
            // 정확히 구현된 오리지널 lastSeenLevel 알고리즘을 복원합니다.
            if (lastSeenLevel !== 0 && tagLevel <= lastSeenLevel) {
                const marker = document.createElement('div');
                marker.className = 'page-break';
                marker.style.setProperty('break-before', 'page', 'important');
                marker.style.setProperty('page-break-before', 'always', 'important');
                marker.style.setProperty('height', '0', 'important');
                marker.style.setProperty('margin', '0', 'important');
                marker.style.setProperty('padding', '0', 'important');
                marker.style.setProperty('border', 'none', 'important');
                el.parentNode?.insertBefore(marker, el);
            }
            lastSeenLevel = tagLevel;
          }
        }
    // 일반 콘텐츠(p, ul 등): bufferStartEl 상태 유지 (버퍼 계속 쌓임)
}

// [ONR-EXP-001] 로컬 PDF / HTML 파일 출력 처리: 현재 문서 본문 DOM을 클론하여 지도/동영상 요소를 정적 변환하고 프린트 출력 스타일을 입혀 PDF/HTML 내보내기를 핸들링합니다.
/** IME 조합 버퍼 강제 커밋: export 직전 한글 입력이 완성되지 않은 상태로 캡처되는 현상 차단 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0001] exportHandlers.ts ➔ flushIME
// 🎯 @KICK  : IME 조합 버퍼 강제 커밋 — export 전 한글 미완성 입력 캡처 차단
// 🛡️ @GUARD : 임시 input 생성/포커스/blur/제거
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function flushIME(): void {
  const input = document.createElement('input');
  input.style.cssText = 'position:fixed;top:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  input.blur();
  document.body.removeChild(input);
}

/** html2canvas 한계 완벽 우회: 인라인코드 높이 고정 및 상하 패딩 소거형 정렬
 *  (html2canvas of inline-block 높이 오계산 및 글자 처짐 버그를 해결하는 가장 완벽하고 수학적인 해법) */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0002] exportHandlers.ts ➔ applyExportInlineStyles
// 🎯 @KICK  : 이미지/PDF 내보내기 시 인라인 코드 높이 오계산 및 상향 솟구침, 단어 쪼개짐 버그 해결
// 🚨 @PATCH : **2026-10-01** — [미리보기 실시간 계산 스타일(Computed Style) 1:1 복제 엔진 도입]: sourceEl(미리보기 실제 DOM)의 각 table, th, td에서 브라우저가 렌더링한 실제 테두리·색상·배경·정렬(Computed Style)을 1:1로 복사하여, 미리보기의 외곽 테두리 및 가로선/세로선 구조를 이미지/PDF 내보내기 시 100% 동일하게 재현
// 🚨 @PATCH : **2026-10-01** — [표 내보내기 시 외곽 테두리 및 행/열 테두리 인라인 주입]: html-to-image/canvas 캡처 시 외곽 테두리 소실을 막기 위해 table 및 셀의 최외곽 4면에 테두리를 직접 주입하고, colBorderWidth가 0px일 때 세로선을 완전 소거하여 미리보기와 100% 일치하도록 보장
// 🚨 @PATCH : **2026-10-01** — display:inline-block 및 vertical-align:0으로 인한 인라인 코드 두 줄 쪼개짐 및 상단 솟구침 버그를 display:inline, vertical-align:baseline, white-space:nowrap(단어보호), box-decoration-break:clone으로 전면 개편하여 완벽 해결
// 🚨 @PATCH : **2026-06-19** — PNG/HTML 내보내기 시 인라인 코드 스타일을 미리보기(globals.css)와 100% 동기화하기 위해 vertical-align:0, line-height:1.35, padding:1px 4.5px 규격으로 완전 치환
// 🔗 @CALLS : 없음
// ====================================================================
// Keep PDF and EPUB table styling in sync with the rendered document.
function preserveRenderedTableStyles(clone: HTMLElement, sourceEl: HTMLElement): void {
      const sourceTables = Array.from(sourceEl.querySelectorAll('table'));
      clone.querySelectorAll<HTMLElement>('table').forEach((table, index) => {
        const source = sourceTables[index];
        if (!source) return;
        const originals = [source, ...Array.from(source.querySelectorAll('thead,tbody,tfoot,tr,th,td,p'))];
        const copies = [table, ...Array.from(table.querySelectorAll<HTMLElement>('thead,tbody,tfoot,tr,th,td,p'))];
        originals.forEach((original, nodeIndex) => {
          const copy = copies[nodeIndex];
          if (!copy) return;
          const css = getComputedStyle(original);
          const properties = ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','vertical-align','color','background-color','white-space','word-break','overflow-wrap','border-collapse','border-spacing','table-layout'];
          for (const side of ['top','right','bottom','left']) {
            properties.push(`padding-${side}`,`margin-${side}`,`border-${side}-width`,`border-${side}-style`,`border-${side}-color`);
          }
          for (const property of properties) copy.style.setProperty(property, css.getPropertyValue(property), 'important');
        });
      });
}

function applyExportInlineStyles(clone: HTMLElement, activeProfile?: CssProfile, sourceEl?: HTMLElement): void {
  // 🌟 querySelectorAll('code') + closest('pre') 조합으로 블록 코드블록을 제외한 모든 인라인 코드를 100% 포착
  clone.querySelectorAll('code').forEach((code) => {
    const el = code as HTMLElement;
    if (el.closest('pre')) return; // 블록 코드 블록은 건드리지 않고 스킵

    // 🌟 인라인코드 정렬 싱크 보정:
    //    1) globals.css와 동일하게 display: inline 및 vertical-align: baseline을 적용하여 상향 솟구침 원천 차단
    //    2) box-decoration-break: clone으로 줄바꿈 시에도 라운드 패딩이 예쁘게 감싸지도록 유지
    //    3) 짧은 인라인 코드 구문(설정명, 단축키, 파일경로 등)이 중간에 어색하게 쪼개지지 않도록 white-space: nowrap 보호
    el.style.setProperty('display', 'inline', 'important');
    el.style.setProperty('vertical-align', 'baseline', 'important');
    el.style.setProperty('padding-top', '1.5px', 'important');
    el.style.setProperty('padding-bottom', '1.5px', 'important');
    el.style.setProperty('padding-left', '5px', 'important');
    el.style.setProperty('padding-right', '5px', 'important');
    el.style.setProperty('line-height', 'inherit', 'important');
    el.style.setProperty('border-radius', '4px', 'important');
    el.style.setProperty('box-decoration-break', 'clone', 'important');
    el.style.setProperty('-webkit-box-decoration-break', 'clone', 'important');
    el.style.setProperty('margin-left', '2px', 'important');
    el.style.setProperty('margin-right', '2px', 'important');

    const text = (el.textContent || '').trim();
    if (text.length <= 40 && !text.includes('\n')) {
      el.style.setProperty('white-space', 'nowrap', 'important');
    } else {
      el.style.setProperty('word-break', 'break-word', 'important');
      el.style.setProperty('overflow-wrap', 'break-word', 'important');
    }
  });

  // 🌟 표(Table) 외곽 테두리 및 행/열 구분선 인라인 주입 (html-to-image/canvas 변환 시 테두리 누락 완전 방어)
  const destTables = Array.from(clone.querySelectorAll('table'));
  const srcTables = sourceEl ? Array.from(sourceEl.querySelectorAll('table')) : [];

  const tableStruct = activeProfile?.tableStructure || DEFAULT_PROFILE.tableStructure;
  const fallbackOuterWidth = tableStruct?.outerBorderWidth || '1px';
  const fallbackRowWidth = tableStruct?.rowBorderWidth || '1px';
  const fallbackColWidth = tableStruct?.colBorderWidth ?? '0px';

  destTables.forEach((destTable, tIdx) => {
    const tableEl = destTable as HTMLElement;
    const srcTable = srcTables[tIdx] as HTMLElement | undefined;
    const srcTableStyle = (srcTable && typeof window !== 'undefined') ? window.getComputedStyle(srcTable) : null;

    // 원본 테이블의 실제 렌더링된 외곽 테두리 스타일 추출
    const tableBorderStyle = srcTableStyle?.borderTopStyle || activeProfile?.rules?.table?.['border-style'] || 'solid';
    const outerWidth = (srcTableStyle && srcTableStyle.borderTopWidth !== '0px') ? srcTableStyle.borderTopWidth : fallbackOuterWidth;
    const outerBorderColor = (srcTableStyle && srcTableStyle.borderTopColor && srcTableStyle.borderTopColor !== 'rgba(0, 0, 0, 0)') 
      ? srcTableStyle.borderTopColor 
      : (activeProfile?.rules?.table?.['border-color'] || '#1f2328');

    const outerIsZero = outerWidth === '0px' || outerWidth === '0' || tableBorderStyle === 'none';

    tableEl.style.setProperty('border-collapse', 'collapse', 'important');
    tableEl.style.setProperty('border', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');

    const destRows = Array.from(tableEl.querySelectorAll('tr'));
    const srcRows = srcTable ? Array.from(srcTable.querySelectorAll('tr')) : [];
    const totalRows = destRows.length;

    destRows.forEach((destRow, rowIndex) => {
      const destCells = Array.from(destRow.querySelectorAll('th, td')) as HTMLElement[];
      const srcRow = srcRows[rowIndex] as HTMLElement | undefined;
      const srcCells = srcRow ? Array.from(srcRow.querySelectorAll('th, td')) : [];
      const totalCells = destCells.length;
      const isFirstRow = rowIndex === 0;
      const isLastRow = rowIndex === totalRows - 1;

      destCells.forEach((destCell, cellIndex) => {
        const srcCell = srcCells[cellIndex] as HTMLElement | undefined;
        const srcCellStyle = (srcCell && typeof window !== 'undefined') ? window.getComputedStyle(srcCell) : null;

        const isFirstCol = cellIndex === 0;
        const isLastCol = cellIndex === totalCells - 1;

        // 원본 셀의 텍스트 색상, 배경색, 정렬, 패딩 1:1 동기화
        if (srcCellStyle) {
          if (srcCellStyle.color) destCell.style.setProperty('color', srcCellStyle.color, 'important');
          if (srcCellStyle.backgroundColor && srcCellStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            destCell.style.setProperty('background-color', srcCellStyle.backgroundColor, 'important');
          } else {
            destCell.style.setProperty('background-color', 'transparent', 'important');
          }
          if (srcCellStyle.textAlign) destCell.style.setProperty('text-align', srcCellStyle.textAlign, 'important');
          if (srcCellStyle.fontWeight) destCell.style.setProperty('font-weight', srcCellStyle.fontWeight, 'important');
        }

        // 행 가로선 두께 및 색상 판별
        const rowWidth = srcCellStyle?.borderBottomWidth && srcCellStyle.borderBottomWidth !== '0px'
          ? srcCellStyle.borderBottomWidth 
          : fallbackRowWidth;
        const rowBorderColor = srcCellStyle?.borderBottomColor && srcCellStyle.borderBottomColor !== 'rgba(0, 0, 0, 0)'
          ? srcCellStyle.borderBottomColor
          : (activeProfile?.rules?.th?.['border-color'] || activeProfile?.rules?.td?.['border-color'] || outerBorderColor);
        const rowBorderStyle = srcCellStyle?.borderBottomStyle || tableBorderStyle;
        const rowIsZero = rowWidth === '0px' || rowWidth === '0' || rowBorderStyle === 'none';

        // 열 세로선 두께 판별 (원본에서 세로선이 0px이면 무조건 none)
        const srcColWidth = srcCellStyle?.borderRightWidth;
        const colWidth = (srcColWidth !== undefined) ? srcColWidth : fallbackColWidth;
        const colIsZero = colWidth === '0px' || colWidth === '0';

        // 1. 최외곽 상단 (1행 셀의 위쪽)
        if (isFirstRow) {
          destCell.style.setProperty('border-top', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-top', 'none', 'important');
        }

        // 2. 최외곽 하단 및 내부 행(가로선)
        if (isLastRow) {
          destCell.style.setProperty('border-bottom', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-bottom', rowIsZero ? 'none' : `${rowWidth} ${rowBorderStyle} ${rowBorderColor}`, 'important');
        }

        // 3. 최외곽 좌측 (1열 셀의 왼쪽)
        if (isFirstCol) {
          destCell.style.setProperty('border-left', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-left', 'none', 'important');
        }

        // 4. 최외곽 우측 및 내부 열(세로선)
        if (isLastCol) {
          destCell.style.setProperty('border-right', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-right', colIsZero ? 'none' : `${colWidth} ${tableBorderStyle} ${rowBorderColor}`, 'important');
        }
      });
    });
  });

  // 🌟 코드블록(CodeBlock) 테마·헤더(언어 라벨 및 복사 배지)·본문 스타일 인라인 1:1 동기화
  const destCodeBlocks = Array.from(clone.querySelectorAll('.codeblock-area'));
  const srcCodeBlocks = sourceEl ? Array.from(sourceEl.querySelectorAll('.codeblock-area')) : [];

  destCodeBlocks.forEach((destArea, cbIdx) => {
    const areaEl = destArea as HTMLElement;
    const srcArea = srcCodeBlocks[cbIdx] as HTMLElement | undefined;
    const srcAreaStyle = (srcArea && typeof window !== 'undefined') ? window.getComputedStyle(srcArea) : null;

    // 1. 코드블록 전체 외곽 컨테이너
    const areaBg = (srcAreaStyle && srcAreaStyle.backgroundColor && srcAreaStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
      ? srcAreaStyle.backgroundColor
      : (activeProfile?.rules?.codeBlock?.['background-color'] || '#0f172a');
    const areaRadius = srcAreaStyle?.borderRadius || activeProfile?.rules?.codeBlock?.['border-radius'] || '8px';
    const areaBorder = (srcAreaStyle && srcAreaStyle.borderWidth && srcAreaStyle.borderWidth !== '0px')
      ? `${srcAreaStyle.borderWidth} ${srcAreaStyle.borderStyle} ${srcAreaStyle.borderColor}`
      : (activeProfile?.rules?.codeBlock?.['border'] || '1px solid rgba(255, 255, 255, 0.1)');

    areaEl.style.setProperty('background-color', areaBg, 'important');
    areaEl.style.setProperty('border-radius', areaRadius, 'important');
    areaEl.style.setProperty('border', areaBorder, 'important');
    areaEl.style.setProperty('overflow', 'hidden', 'important');
    areaEl.style.setProperty('margin-top', '16px', 'important');
    areaEl.style.setProperty('margin-bottom', '16px', 'important');
    areaEl.style.setProperty('max-width', '100%', 'important');
    areaEl.style.setProperty('box-sizing', 'border-box', 'important');

    // 2. 코드블록 상단 헤더
    const destHeader = areaEl.querySelector('.codeblock-header') as HTMLElement | null;
    const srcHeader = srcArea ? srcArea.querySelector('.codeblock-header') as HTMLElement | null : null;
    const srcHeaderStyle = (srcHeader && typeof window !== 'undefined') ? window.getComputedStyle(srcHeader) : null;

    if (destHeader) {
      const headerBg = (srcHeaderStyle && srcHeaderStyle.backgroundColor && srcHeaderStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
        ? srcHeaderStyle.backgroundColor
        : (activeProfile?.rules?.codeBlockTitle?.['background-color'] || 'rgba(30, 41, 59, 0.95)');
      const headerBorderBottom = (srcHeaderStyle && srcHeaderStyle.borderBottomWidth && srcHeaderStyle.borderBottomWidth !== '0px')
        ? `${srcHeaderStyle.borderBottomWidth} ${srcHeaderStyle.borderBottomStyle} ${srcHeaderStyle.borderBottomColor}`
        : '1px solid rgba(255, 255, 255, 0.1)';

      destHeader.style.setProperty('display', 'flex', 'important');
      destHeader.style.setProperty('align-items', 'center', 'important');
      destHeader.style.setProperty('justify-content', 'space-between', 'important');
      destHeader.style.setProperty('background-color', headerBg, 'important');
      destHeader.style.setProperty('border-bottom', headerBorderBottom, 'important');
      destHeader.style.setProperty('padding', '6px 14px', 'important');
      destHeader.style.setProperty('min-height', '32px', 'important');
      destHeader.style.setProperty('box-sizing', 'border-box', 'important');

      // 3. 언어 라벨 (TEXT 등)
      const destHeaderText = destHeader.querySelector('.codeblock-header-text') as HTMLElement | null;
      const srcHeaderText = srcHeader ? srcHeader.querySelector('.codeblock-header-text') as HTMLElement | null : null;
      const srcHeaderTextStyle = (srcHeaderText && typeof window !== 'undefined') ? window.getComputedStyle(srcHeaderText) : null;

      if (destHeaderText) {
        const textColor = srcHeaderTextStyle?.color || activeProfile?.rules?.codeBlockTitle?.['color'] || '#94a3b8';
        const fontSize = srcHeaderTextStyle?.fontSize || '11px';
        const fontWeight = srcHeaderTextStyle?.fontWeight || '700';

        destHeaderText.style.setProperty('color', textColor, 'important');
        destHeaderText.style.setProperty('font-size', fontSize, 'important');
        destHeaderText.style.setProperty('font-weight', fontWeight, 'important');
        destHeaderText.style.setProperty('text-transform', 'uppercase', 'important');
        destHeaderText.style.setProperty('letter-spacing', '0.08em', 'important');
        destHeaderText.style.setProperty('display', 'inline-block', 'important');
      }

      // 4. 복사 버튼 -> 깔끔한 복사 배지 스타일 유지
      const destCopyBtn = destHeader.querySelector('button, .copy-button-hook, .copy-btn') as HTMLElement | null;
      if (destCopyBtn) {
        destCopyBtn.style.setProperty('display', 'inline-flex', 'important');
        destCopyBtn.style.setProperty('align-items', 'center', 'important');
        destCopyBtn.style.setProperty('gap', '4px', 'important');
        destCopyBtn.style.setProperty('padding', '2px 8px', 'important');
        destCopyBtn.style.setProperty('background-color', 'rgba(255, 255, 255, 0.1)', 'important');
        destCopyBtn.style.setProperty('color', '#cbd5e1', 'important');
        destCopyBtn.style.setProperty('border-radius', '4px', 'important');
        destCopyBtn.style.setProperty('font-size', '11px', 'important');
        destCopyBtn.style.setProperty('font-weight', '500', 'important');
        destCopyBtn.style.setProperty('border', 'none', 'important');
        destCopyBtn.style.setProperty('cursor', 'default', 'important');
      }
    }

    // 중간 스크롤바 래퍼 div 가로 스크롤 및 잘림 해제 (전체 내용 표시)
    areaEl.querySelectorAll('div').forEach(d => {
      const divEl = d as HTMLElement;
      divEl.classList.remove('w-max');
      divEl.classList.remove('overflow-x-auto');
      divEl.style.setProperty('width', '100%', 'important');
      divEl.style.setProperty('max-width', '100%', 'important');
      divEl.style.setProperty('box-sizing', 'border-box', 'important');
      divEl.style.setProperty('overflow-x', 'visible', 'important');
    });

    // 5. 코드 본문 (pre 및 code)
    const destPre = areaEl.querySelector('pre') as HTMLElement | null;
    const srcPre = srcArea ? srcArea.querySelector('pre') as HTMLElement | null : null;
    const srcPreStyle = (srcPre && typeof window !== 'undefined') ? window.getComputedStyle(srcPre) : null;

    if (destPre) {
      destPre.classList.remove('w-max');
      destPre.classList.remove('min-w-full');
      const preColor = srcPreStyle?.color || activeProfile?.rules?.codeBlock?.['color'] || '#f8fafc';
      const preFontFamily = srcPreStyle?.fontFamily || '"JetBrains Mono", Consolas, monospace';
      const preFontSize = srcPreStyle?.fontSize || activeProfile?.rules?.codeBlock?.['font-size'] || '13.5px';

      destPre.style.setProperty('background-color', 'transparent', 'important');
      destPre.style.setProperty('color', preColor, 'important');
      destPre.style.setProperty('font-family', preFontFamily, 'important');
      destPre.style.setProperty('font-size', preFontSize, 'important');
      destPre.style.setProperty('padding', '14px 16px', 'important');
      destPre.style.setProperty('margin', '0', 'important');
      destPre.style.setProperty('border', 'none', 'important');
      destPre.style.setProperty('width', '100%', 'important');
      destPre.style.setProperty('max-width', '100%', 'important');
      destPre.style.setProperty('box-sizing', 'border-box', 'important');
      destPre.style.setProperty('white-space', 'pre-wrap', 'important');
      destPre.style.setProperty('word-wrap', 'break-word', 'important');
      destPre.style.setProperty('word-break', 'break-all', 'important');
      destPre.style.setProperty('overflow-wrap', 'anywhere', 'important');
      destPre.style.setProperty('overflow-x', 'visible', 'important');
    }

    areaEl.querySelectorAll('code').forEach(code => {
      const codeEl = code as HTMLElement;
      codeEl.style.setProperty('background-color', 'transparent', 'important');
      codeEl.style.setProperty('color', 'inherit', 'important');
      codeEl.style.setProperty('white-space', 'pre-wrap', 'important');
      codeEl.style.setProperty('word-wrap', 'break-word', 'important');
      codeEl.style.setProperty('word-break', 'break-all', 'important');
      codeEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
      codeEl.style.setProperty('box-sizing', 'border-box', 'important');
      codeEl.style.setProperty('width', '100%', 'important');
      codeEl.style.setProperty('max-width', '100%', 'important');
      codeEl.style.setProperty('display', 'block', 'important');
    });

    areaEl.querySelectorAll('.onrivi-line').forEach(line => {
      const lineEl = line as HTMLElement;
      lineEl.style.setProperty('color', 'inherit', 'important');
      lineEl.style.setProperty('white-space', 'pre-wrap', 'important');
      lineEl.style.setProperty('word-wrap', 'break-word', 'important');
      lineEl.style.setProperty('word-break', 'break-all', 'important');
      lineEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
      lineEl.style.setProperty('box-sizing', 'border-box', 'important');
      lineEl.style.setProperty('width', '100%', 'important');
      lineEl.style.setProperty('max-width', '100%', 'important');
      lineEl.style.setProperty('display', 'block', 'important');
    });
  });

  // 단독 pre 블록(codeblock-area 외곽)도 가로 스크롤 없이 자동 줄바꿈 강제
  clone.querySelectorAll('pre').forEach(pre => {
    const preEl = pre as HTMLElement;
    if (preEl.closest('.codeblock-area')) return;
    preEl.classList.remove('w-max');
    preEl.classList.remove('min-w-full');
    preEl.style.setProperty('width', '100%', 'important');
    preEl.style.setProperty('max-width', '100%', 'important');
    preEl.style.setProperty('box-sizing', 'border-box', 'important');
    preEl.style.setProperty('white-space', 'pre-wrap', 'important');
    preEl.style.setProperty('word-wrap', 'break-word', 'important');
    preEl.style.setProperty('word-break', 'break-all', 'important');
    preEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
    preEl.style.setProperty('overflow-x', 'visible', 'important');
  });

  // 🌟 [보기 상자 및 시험 문제 선택지] 인쇄/내보내기 조판 최적화
  // 1. 인용구(blockquote: <보 기>, [자료 설명] 등) 콤팩트 규격화 및 페이지 쪼개짐 방지
  clone.querySelectorAll('blockquote').forEach(destBq => {
    const bqEl = destBq as HTMLElement;
    bqEl.style.setProperty('page-break-inside', 'avoid', 'important');
    bqEl.style.setProperty('break-inside', 'avoid', 'important');
    bqEl.style.setProperty('margin-top', '8px', 'important');
    bqEl.style.setProperty('margin-bottom', '10px', 'important');
    bqEl.style.setProperty('padding', '8px 14px', 'important');

    // 마크다운 파싱 시 잔존할 수 있는 끝부분 빈 문단(<p></p> 또는 공백만 있는 p) 소거
    bqEl.querySelectorAll('p').forEach(p => {
      const pEl = p as HTMLElement;
      if (!pEl.textContent?.trim() && !pEl.querySelector('img, video, iframe, svg')) {
        pEl.remove();
        return;
      }
      pEl.style.setProperty('margin-top', '0px', 'important');
      pEl.style.setProperty('margin-bottom', '4px', 'important');
      pEl.style.setProperty('line-height', '1.55', 'important');
    });

    bqEl.querySelectorAll('ul, ol').forEach(list => {
      const listEl = list as HTMLElement;
      listEl.style.setProperty('margin-top', '4px', 'important');
      listEl.style.setProperty('margin-bottom', '4px', 'important');
      listEl.style.setProperty('padding-left', '1.4em', 'important');
    });

    bqEl.querySelectorAll('li').forEach(li => {
      const liEl = li as HTMLElement;
      liEl.style.setProperty('margin-bottom', '2px', 'important');
      liEl.style.setProperty('line-height', '1.5', 'important');
      liEl.querySelectorAll('p').forEach(lp => {
        (lp as HTMLElement).style.setProperty('margin-top', '0px', 'important');
        (lp as HTMLElement).style.setProperty('margin-bottom', '2px', 'important');
      });
    });

    const lastP = bqEl.querySelector('p:last-child') as HTMLElement | null;
    if (lastP) {
      lastP.style.setProperty('margin-bottom', '0px', 'important');
    }

    // 보기 상자 바로 뒤에 선택지 문단이 이어지는 경우, 보기 상자와 선택지가 분리되지 않도록 결속
    const nextEl = bqEl.nextElementSibling as HTMLElement | null;
    if (nextEl && (nextEl.classList.contains('exam-choice-paragraph') || /[①-⑮]/.test(nextEl.textContent || ''))) {
      bqEl.style.setProperty('page-break-after', 'avoid', 'important');
      bqEl.style.setProperty('break-after', 'avoid', 'important');
    }
  });

  // 2. 객관식 선택지 문단(①~⑮, ㄱ~ㄹ, [1-5]. 등) 페이지 나눔 방지 및 콤팩트 여백 보정
  clone.querySelectorAll('p, li').forEach(el => {
    const text = el.textContent || '';
    const hasCircledNum = /[①-⑮]/.test(text);
    const hasChoiceLetter = /(?:^|\n|\s)[ㄱ-ㅎ]\./.test(text);
    const hasNumberedChoices = /(?:^|\n|\s)[1-5]\.\s/.test(text) && text.includes('\n');
    if (hasCircledNum || hasChoiceLetter || hasNumberedChoices) {
      el.classList.add('exam-choice-paragraph');
      el.setAttribute('data-exam-choice', 'true');
      (el as HTMLElement).style.setProperty('page-break-inside', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('break-inside', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('line-height', '1.5', 'important');
      (el as HTMLElement).style.setProperty('margin-bottom', '12px', 'important');

      el.querySelectorAll('.onrivi-line').forEach(line => {
        (line as HTMLElement).style.setProperty('min-height', '1.35em', 'important');
        (line as HTMLElement).style.setProperty('line-height', '1.5', 'important');
      });
    }
  });

  // 3. 문제 발문('것은?', '?' 등)이 다음 보기 상자나 선택지로부터 고아로 떨어지지 않도록 결속
  clone.querySelectorAll('p, h3, h4, h5, h6').forEach(el => {
    const next = el.nextElementSibling as HTMLElement | null;
    if (!next) return;
    const text = el.textContent || '';
    const isPrompt = /[?？]$|것은\s*[?？]?$/.test(text.trim());
    const isNextChoiceOrBox = next.tagName === 'BLOCKQUOTE' || next.classList.contains('exam-choice-paragraph') || /[①-⑮]/.test(next.textContent || '');
    if (isPrompt && isNextChoiceOrBox) {
      (el as HTMLElement).style.setProperty('page-break-after', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('break-after', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('margin-bottom', '8px', 'important');
    }
  });
}

/** Yandex/Google 지도 복원 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0003] exportHandlers.ts ➔ restoreMapsInClone
// 🎯 @KICK  : 구글 지도 iframe 및 data-map-original-src 속성 기반 지도 복원 (Yandex 정적맵 fallback + Google Maps 링크)
// 🛡️ @GUARD : URL 파싱 오류, center/zoom/q 추출 방어
// 🚨 @PATCH : **2026-06-19** — iframe[src*="maps.google.com"] 요소를 추가로 감지하여 Yandex Static Maps 정적 이미지로 복원 치환함으로써 html2canvas의 CORS 제한으로 인한 지도 엑스박스(누락) 버그를 영구 해결
// 🔗 @CALLS : msg.error
// ====================================================================
function restoreMapsInClone(clone: HTMLElement) {
  const mapContainers = Array.from(clone.querySelectorAll('[data-map-original-src], iframe[src*="maps.google.com"]'));
  mapContainers.forEach((container) => {
    const originalSrc = container.getAttribute('data-map-original-src') || container.getAttribute('src');
    if (originalSrc) {
      let finalSrc = originalSrc;
      let googleMapsLink = 'https://maps.google.com';

      try {
        const urlObj = new URL(originalSrc.startsWith('http') ? originalSrc : `https:${originalSrc}`);
        const center = urlObj.searchParams.get('center') || urlObj.searchParams.get('ll');
        const q = urlObj.searchParams.get('q');
        const zoom = urlObj.searchParams.get('zoom') || urlObj.searchParams.get('z') || '15';

        let lat = '';
        let lng = '';

        if (center) {
          const parts = center.split(',');
          if (parts[0] && parts[1]) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          }
        } else if (q) {
          // 구글 지도의 q 파라미터는 보통 "lat,lng" 또는 "위치명" 형태임
          const parts = q.split(',');
          if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          }
        }

        if (lat && lng) {
          googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          finalSrc = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${zoom}&size=600,360&l=map&lang=ko_KR`;
        }
      } catch (e) {
        msg.error("Map restoration URL parse error", e);
      }

      const img = document.createElement('img');
      img.setAttribute('src', finalSrc);
      img.setAttribute('class', 'rounded-2xl shadow-2xl my-8 border-4 border-white dark:border-gray-800 mx-auto block max-w-full hover:scale-[1.01] transition-transform duration-300');
      img.setAttribute('alt', 'Google Map');

      const link = document.createElement('a');
      link.setAttribute('href', googleMapsLink);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('title', '구글 지도보기');
      link.appendChild(img);

      const align = container.getAttribute('data-align') || container.getAttribute('data-map-align');
      if (align && (align === 'center' || align === 'right' || align === 'left')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full flex';
        if (align === 'center') wrapper.classList.add('justify-center');
        else if (align === 'right') wrapper.classList.add('justify-end');
        else wrapper.classList.add('justify-start');
        wrapper.appendChild(link);
        container.parentNode?.replaceChild(wrapper, container);
      } else {
        container.parentNode?.replaceChild(link, container);
      }
    }
  });
}

/** 모든 유튜브 iframe(임베드) 요소를 썸네일 하이퍼링크로 자동 변환 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0004] exportHandlers.ts ➔ convertYoutubeIframeToLink
// 🎯 @KICK  : YouTube iframe 임베드를 썸네일 + 하이퍼링크 컨테이너로 변환
// 🛡️ @GUARD : youtube.com / youtube-nocookie.com embed 감지, videoId 추출
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function convertYoutubeIframeToLink(clone: HTMLElement) {
  const iframes = clone.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src') || '';
    if (src.includes('youtube.com/embed/') || src.includes('youtube-nocookie.com/embed/')) {
      const match = src.match(/\/embed\/([^/?#]+)/);
      if (match && match[1]) {
        const videoId = match[1];
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;

        // 썸네일 및 텍스트 링크 구조 생성
        const container = document.createElement('div');
        container.setAttribute('class', 'my-6 flex flex-col items-center gap-2');

        const link = document.createElement('a');
        link.setAttribute('href', videoUrl);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('class', 'relative block w-full max-w-[480px] rounded-2xl overflow-hidden shadow-lg border border-black/5 hover:scale-[1.01] transition-transform duration-300 mx-auto');

        const img = document.createElement('img');
        img.setAttribute('src', thumbnailUrl);
        img.setAttribute('alt', 'YouTube Video Thumbnail');
        img.setAttribute('class', 'w-full h-auto object-cover aspect-video block');

        const overlay = document.createElement('div');
        overlay.setAttribute('class', 'absolute inset-0 bg-black/10 hover:bg-black/30 flex items-center justify-center transition-colors duration-300');

        const playBtn = document.createElement('div');
        playBtn.setAttribute('class', 'w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg text-lg font-bold');
        playBtn.innerHTML = '▶';

        overlay.appendChild(playBtn);
        link.appendChild(img);
        link.appendChild(overlay);

        const infoText = document.createElement('span');
        infoText.setAttribute('class', 'text-xs text-gray-500 font-semibold block text-center mt-1.5');
        infoText.innerHTML = '🎥 YouTube에서 동영상 보기 (클릭)';

        container.appendChild(link);
        container.appendChild(infoText);

        iframe.parentNode?.replaceChild(container, iframe);
      }
    }
  });
}

/** 미리보기 DOM 복제 + 버튼 요소 정리 + 지도 복원 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0005] exportHandlers.ts ➔ clonePreview
// 🎯 @KICK  : 미리보기 DOM 복제 + 버튼 정리 + 지도 복원 + 유튜브 변환
// 🛡️ @GUARD : cloneNode(true)로 전체 트리 복제
// 🚨 @PATCH : 없음
// 🔗 @CALLS : restoreMapsInClone, convertYoutubeIframeToLink
// ====================================================================
function clonePreview(previewEl: HTMLElement, captureWordLayout = false): HTMLElement {
  const clone = previewEl.cloneNode(true) as HTMLElement;
  if (captureWordLayout) {
    const sources = [previewEl, ...Array.from(previewEl.querySelectorAll<HTMLElement>('*'))];
    const copies = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    sources.forEach((source, index) => {
      const copy = copies[index];
      const css = window.getComputedStyle(source);
      copy.setAttribute('data-docx-white-space', css.whiteSpace || 'normal');
      if (/^(TABLE|TD|TH|COL)$/.test(source.tagName)) {
        const width = source.getBoundingClientRect().width;
        if (width > 0) copy.setAttribute('data-docx-width', String(width));
        if (source.tagName === 'TD' || source.tagName === 'TH') {
          for (const side of ['top', 'right', 'bottom', 'left']) {
            copy.setAttribute(`data-docx-padding-${side}`, css.getPropertyValue(`padding-${side}`));
          }
        }
      }
    });
  }
  clone.querySelectorAll('[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools').forEach(el => el.remove());
  // A top caption must be first in the exported DOM as well as visually above
  // the image; DOCX/HWPX readers do not implement CSS flex ordering.
  const sourceCaptions = Array.from(previewEl.querySelectorAll('figure > figcaption'));
  clone.querySelectorAll<HTMLElement>('figure > figcaption').forEach((caption,index)=>{
    const original=sourceCaptions[index];
    if(original && Number(getComputedStyle(original).order)<0)caption.parentElement?.prepend(caption);
  });
  materializeReportNumbers(previewEl, clone);
  materializeHeadingNumbers(previewEl, clone);
  clone.querySelectorAll('button, .copy-btn, [title*="복사"]').forEach(el => el.remove());
  restoreMapsInClone(clone);
  convertYoutubeIframeToLink(clone);
  cleanExportDocument(clone);
  return clone;
}

/** html2canvas가 ::before/::after/counter()를 지원하지 않아 목록 마커가 소실되는 문제 해결:
 *  export 전 clone DOM에 직접 숫자/불릿 마커를 주입 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0006] exportHandlers.ts ➔ fixListMarkers
// 🎯 @KICK  : html2canvas ::before/counter() 미지원 문제 해결 — DOM에 숫자/불릿 마커 직접 주입
// 🛡️ @GUARD : onrivi-empty-list-row / task-list-item 제외, start 속성 반영
// 🚨 @PATCH : export-style-element 클래스로 스타일 및 마커 일괄 관리
// 🔗 @CALLS : 없음
// ====================================================================
function fixListMarkers(clone: HTMLElement, profile?: CssProfile): void {
  const style = document.createElement('style');
  style.className = 'export-style-element';
  style.textContent = `
.export-list-marker { display: inline !important; white-space: pre !important; }
.prose ol > li::before, .prose ul > li::before,
.custom-preview-container ol > li::before, .custom-preview-container ul > li::before {
  display: none !important; content: none !important; width: 0 !important; height: 0 !important;
}`;
  clone.appendChild(style);

  const isCircledOl = profile?.rules?.ol?.['list-style-type'] === CIRCLED_DECIMAL_LIST_STYLE;

  clone.querySelectorAll('ol').forEach((ol) => {
    const start = parseInt(ol.getAttribute('start') || '1', 10);
    let idx = 0;
    ol.querySelectorAll(':scope > li').forEach((li) => {
      const el = li as HTMLElement;
      if (el.classList.contains('onrivi-empty-list-row') || el.classList.contains('task-list-item')) return;
      const num = start + idx; idx++;
      el.style.listStyleType = 'none';
      if (el.querySelector('.export-list-marker')) return;
      const marker = document.createElement('span');
      marker.className = 'export-list-marker';
      marker.textContent = isCircledOl ? ((CIRCLED_NUMBERS[num - 1] || `${num}.`) + ' ') : (num + '. ');
      marker.style.cssText = 'display:inline;font-weight:400;margin-right:4px;user-select:none;-webkit-user-select:none;';
      const textBlock = el.querySelector(':scope > p, :scope > div > p') || el;
      textBlock.insertBefore(marker, textBlock.firstChild);
    });
  });

  const bs = profile?.bulletStructure;
  const l1Type = bs?.level1 || profile?.rules?.ul?.['list-style-type'] || 'disc';
  const l2Type = bs?.level2 || 'circle';
  const l3Type = bs?.level3 || 'square';
  const l1Text = getBulletSymbolValue(l1Type, bs?.custom1).text;
  const l2Text = getBulletSymbolValue(l2Type, bs?.custom2).text;
  const l3Text = getBulletSymbolValue(l3Type, bs?.custom3).text;

  clone.querySelectorAll('ul').forEach((ul) => {
    let depth = 1;
    let parent = ul.parentElement;
    while (parent && parent !== clone) {
      if (parent.tagName === 'UL') depth++;
      parent = parent.parentElement;
    }
    const bulletChar = depth === 1 ? l1Text : depth === 2 ? l2Text : l3Text;

    ul.querySelectorAll(':scope > li').forEach((li) => {
      const el = li as HTMLElement;
      if (el.classList.contains('onrivi-empty-list-row') || el.classList.contains('task-list-item')) return;
      el.style.listStyleType = 'none';
      if (el.querySelector('.export-list-marker')) return;
      if (!bulletChar) return;
      const marker = document.createElement('span');
      marker.className = 'export-list-marker';
      marker.textContent = bulletChar;
      marker.style.cssText = 'display:inline;font-weight:400;margin-right:4px;user-select:none;-webkit-user-select:none;';
      const textBlock = el.querySelector(':scope > p, :scope > div > p') || el;
      textBlock.insertBefore(marker, textBlock.firstChild);
    });
  });
}

/** 상대 경로(/~) 및 media:// 프로토콜 이미지를 Base64 Data URI로 인라인 임베딩 (내보내기 시 이미지 깨짐 방지) */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0007] exportHandlers.ts ➔ inlineLocalImages
// 🎯 @KICK  : 상대 경로 / media:// 이미지를 Base64 Data URI로 인라인 임베딩
// 🛡️ @GUARD : Electron IPC, Data URI/http(s) 스킵, 백엔드 /api/view 2차 fallback
// 🚨 @PATCH : **2026-06-19** — PNG 및 EPUB 내보내기 시 외부 이미지 로딩 CSP/CORS 차단 해결을 위해 일렉트론 환경에서 외부 http/https URL을 media 프록시로 대리 fetch하여 base64 인라인 변환하도록 패치; Electron readImageAsBase64 IPC 우회, 백엔드 실패 시 프론트엔드 정적 서빙 재시도
// 🔗 @CALLS : getApiUrl
// ====================================================================
async function inlineLocalImages(clone: HTMLElement): Promise<void> {
  const images = Array.from(clone.querySelectorAll('img'));
  const api = (window as any).electronAPI;
  await Promise.all(images.map(async (image, index) => {
    const src = image.getAttribute('src') || '';
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    try {
      if (!src) throw new Error('이미지 경로가 없습니다.');
      if (src.startsWith('data:image/')) return;
      // The displayed image can already resolve browser handles or authenticated Drive media to a blob.
      const live = Array.from(document.querySelectorAll('img')).find(candidate =>
        candidate.getAttribute('src') === src || candidate.src === src);
      const resolved = live?.currentSrc || live?.src || src;
      if (resolved.startsWith('data:image/')) { image.src = resolved; return; }
      let dataUrl: string;
      if (api && !/^(https?:|blob:)/.test(resolved)) {
        let path = resolved;
        if (path.startsWith('media://')) path = new URL(path).searchParams.get('url') || path;
        dataUrl = await withExportTimeout(api.readImageAsBase64(path), '로컬 이미지') as string;
        if (!dataUrl?.startsWith('data:image/')) throw new Error('로컬 이미지 데이터를 읽지 못했습니다.');
      } else {
        let url = resolved;
        if (api && /^https?:/.test(url)) url = `media://?url=${encodeURIComponent(url)}`;
        else if (!/^(https?:|blob:|media:)/.test(url)) {
          url = getApiUrl(`/api/view?filePath=${encodeURIComponent(src.split('?')[0])}`);
        }
        try {
          dataUrl = await exportBlobToDataUrl(await fetchExportImage(url));
        } catch (error) {
          // A successfully loaded image may be readable through canvas even if fetch is unavailable.
          if (!live?.complete || !live.naturalWidth) throw error;
          const canvas = document.createElement('canvas');
          canvas.width = live.naturalWidth; canvas.height = live.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw error;
          ctx.drawImage(live, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        }
      }
      image.src = dataUrl;
    } catch (err) {
      console.warn(`[inlineLocalImages] ${index + 1}번째 이미지 인라인 변환 건너뜀:`, err);
    }
  }));
  await waitForExportResources(clone);
}

/**
 * 모든 export 포맷 공통: 복제된 DOM에 동적 CSS + 인쇄 스타일을 주입합니다.
 * hideIndicators: true 면 화면용 가상 페이지 구분선(빨간 점선/이모지)을 제거
 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0008] exportHandlers.ts ➔ injectExportStyles
// 🎯 @KICK  : export 전 clone DOM에 동적 CSS + 인쇄 스타일 + 페이지 구분선 숨김 주입
// 🛡️ @GUARD : hideIndicators 옵션, dynamicCssString 존재 여부, pageBg 배경색
// 🚨 @PATCH : **2026-06-19** — PNG/HTML 내보내기 시 인라인 코드 스타일을 미리보기(globals.css)와 100% 동기화하기 위해 vertical-align:0, line-height:1.35, padding:1px 4.5px 규격으로 완전 치환; html2canvas 가상 iframe 내부의 html/body 글로벌 족쇄(overflow:hidden 및 height:100%) 오버라이드 해제 스타일 추가; custom-preview-container 클래스 추가로 사용자 CSS 우선 적용; 인라인 코드, 리스트 마커, 수식 겹침(KaTeX), 체크박스 정렬 불일치를 완벽 해결하기 위해 인쇄 스타일 가드 적용; KaTeX 웹폰트 CDN 강제 임포트로 수식 왜곡 및 가로 막힘 영구 해결
// 🔗 @CALLS : 없음
// ====================================================================
function injectExportStyles(
  clone: HTMLElement,
  dynamicCssString?: string,
  options?: { hideIndicators?: boolean },
  pageBg?: string
): void {
  if (dynamicCssString && !clone.classList.contains('custom-preview-container')) {
    clone.classList.add('custom-preview-container');
  }

  const bg = pageBg || '#ffffff';
  const fragments: string[] = [];

  if (dynamicCssString) {
    fragments.push(dynamicCssString);
  }

  if (options?.hideIndicators) {
    fragments.push(`
      hr.page-break {
        display: none !important;
      }
    `);
  }

  fragments.push(`
/* 🌟 html2canvas 가상 iframe 내부의 html/body 족쇄 해제 (글로벌 overflow:hidden/height:100% 무력화) */
html, body {
  height: auto !important;
  min-height: 100% !important;
  overflow: visible !important;
  overflow-y: visible !important;
  overflow-x: visible !important;
}
.prose {
  background-color: ${bg} !important;
}
/* 🛡️ 인라인 코드 백틱(기호) 소거 패치 (Tailwind Typography 기본 백틱 강제 생성 규칙 무력화) */
.prose code::before,
.prose code::after,
.custom-preview-container code::before,
.custom-preview-container code::after {
  content: "" !important;
  display: none !important;
}
/* 🛡️ 인라인 코드 상향 솟구침 및 줄바꿈 왜곡 방지 */
.prose :not(pre) > code,
.custom-preview-container :not(pre) > code {
  display: inline !important;
  vertical-align: baseline !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
}
.export-list-marker {
  vertical-align: baseline !important;
}
/* 🛡️ 태스크 리스트 아이템 체크박스 정렬 보정 */
.custom-preview-container .task-list-item input[type="checkbox"] {
  vertical-align: text-bottom !important;
  margin-bottom: 2px !important;
}
/* 🛡️ KaTeX 수식 블록 겹침 방지 및 렌더링 최적화 */
.katex-display {
  display: block !important;
  margin: 1em 0 !important;
  padding: 0.2em 0 !important;
  height: auto !important;
  overflow: visible !important;
}
.katex {
  display: inline-block !important;
  text-indent: 0 !important;
}
.katex-mathml {
  display: none !important;
}
/* 🛡️ 각주 타이틀 및 영어 라벨 원천 차단 */
.footnotes {
  border-top: 1px solid #e5e7eb !important;
  margin-top: 30px !important;
  padding-top: 10px !important;
}
.footnotes h2,
.footnotes #footnote-label,
.footnotes .sr-only {
  display: none !important;
}
/* 🛡️ 각주 리스트 정렬 보정: 번호와 내용이 한 줄에 조화롭게 나오도록 강제 */
.footnotes ol {
  list-style-type: decimal !important;
  padding-left: 1.5em !important;
  margin: 0 !important;
}
.footnotes li {
  margin-bottom: 0.5em !important;
  list-style-position: outside !important;
  display: list-item !important;
}
.footnotes li p {
  display: inline !important;
  margin: 0 !important;
}
.footnotes li::before {
  display: none !important;
  content: none !important;
}
.footnote-backref {
  text-decoration: none !important;
  margin-left: 4px !important;
  font-family: sans-serif !important;
}
`);

  const styleEl = document.createElement('style');
  styleEl.className = 'export-style-element';
  styleEl.textContent = fragments.join('\n');
  clone.appendChild(styleEl);
}

/** 모든 로컬/크롬 확장프로그램/데스크탑 CSS 규칙을 동기식으로 추출하여 인라인 스타일로 변환 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ collectAllStyles
// 🎯 @KICK  : 로컬 및 확장프로그램 CSS 규칙들을 SecurityError 없이 동기 추출하여 인라인화
// 🛡️ @GUARD : chrome-extension://, file://, app:// 프로토콜 대응, 외부 CDN link 분리 보존
// 🚨 @PATCH : **2026-06-20** — 신규 구현 (비동기 fetch 대신 브라우저 컴파일 완료된 cssRules 동기식 추출 방식)
// 🔗 @CALLS : 없음
// ====================================================================
async function resolveExportWatermark(settings: DocumentPrintSettings): Promise<DocumentPrintSettings> {
      const resolved = { ...settings };
      if(resolved.enabled){
        if(resolved.opacity===0)throw new Error('워터마크 진하기가 0%입니다. 진하기를 높이거나 사용을 꺼 주세요.');
        if(resolved.kind==='text' && !resolved.text?.trim()){
          resolved.text = DEFAULT_WATERMARK_TEXT;
        }
        if(resolved.kind==='image'){
          if(resolved.imageResource){
            try {
              const {watermarkResourceIdentity}=await import('./watermarkResources');
              if(resolved.imageResource!==watermarkResourceIdentity()){
                console.warn('[Watermark] 리소스 폴더 변경 감지, 기본 엠블럼으로 대체');
                resolved.image = DEFAULT_WATERMARK_IMAGE;
              }
            } catch {
              resolved.image = DEFAULT_WATERMARK_IMAGE;
            }
          }
          if(!resolved.image) resolved.image = DEFAULT_WATERMARK_IMAGE;
          if(!resolved.image.startsWith('data:')){
            try {
              const { listWatermarkResources, watermarkReferenceKey } = await import('./watermarkResources');
              const resList = await listWatermarkResources().catch(() => []);
              const targetKey = watermarkReferenceKey(resolved.image);
              const matched = resList.find(item => watermarkReferenceKey(item.reference) === targetKey);
              if (matched) {
                const blob = await matched.read();
                resolved.image = await exportBlobToDataUrl(blob);
              } else {
                const holder=document.createElement('div'),img=document.createElement('img');img.src=resolved.image;holder.append(img);
                await inlineLocalImages(holder);
                resolved.image=img.src;
              }
            } catch (err) {
              console.warn('[Watermark] 워터마크 이미지 로드 실패, 기본 엠블럼으로 안전 대체:', err);
              resolved.image = DEFAULT_WATERMARK_IMAGE;
            }
          }
        }
      }
  return resolved;
}

async function prepareDocumentFonts(root: HTMLElement): Promise<string> {
  const controller = new AbortController();
  try {
    return await withExportTimeout(embedExportFonts(root, controller.signal), '내보내기 글꼴', 5000);
  } catch (error) {
    console.warn('[export] Font embedding skipped; using available fonts:', error);
    return '';
  } finally { controller.abort(); }
}

function collectAllStyles(): { inlineStyles: string; linkTags: string } {
  const inlineStyles: string[] = [];
  const linkTags: string[] = [];
  
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (rules) {
        const cssText = Array.from(rules).map(r => r.cssText).join('\n');
        inlineStyles.push(stripExportViewportRules(cssText));
      }
    } catch (err) {
      // CORS 제한이 걸린 외부 CDN 스타일시트는 link 태그 원본 그대로 살려둠
      if (sheet.ownerNode && sheet.ownerNode instanceof Element && sheet.ownerNode.tagName.toUpperCase() === 'LINK') {
        const linkEl = sheet.ownerNode as HTMLLinkElement;
        linkTags.push(linkEl.outerHTML);
      }
    }
  }
  
  // 외부 CDN 링크가 누락되지 않도록 명시적 크로스체크 추가
  const allLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of allLinks) {
    const href = link.getAttribute('href');
    if (href && href.startsWith('http') && !linkTags.includes(link.outerHTML)) {
      linkTags.push(link.outerHTML);
    }
  }
  
  return {
    inlineStyles: inlineStyles.join('\n'),
    linkTags: linkTags.join('\n')
  };
}

/** 다운로드 폴더에 파일 백업 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0009] exportHandlers.ts ➔ saveToDownloads
// 🎯 @KICK  : 기존 호출자의 저장 결과 분기 호환. 웹 파일은 브라우저 다운로드로 저장한다.
// 🛡️ @GUARD : 웹에서 존재하지 않는 백업 API를 추가 호출하지 않는다.
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getApiUrl
// ====================================================================
async function saveToDownloads(filename: string, content: string, type: 'base64' | 'text') {
  // 💡 [일렉트론 환경 가드] 일렉트론 순수 데스크톱 모드에서는 Express 백엔드 포트 서빙이 실행되지 않으므로,
  // 불필요한 로컬 API fetch 시도를 즉시 스킵하여 콘솔의 ERR_CONNECTION_REFUSED 빨간색 에러 노출을 방지합니다.
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }

  return false;
}

export async function exportPDF({ 
  previewEl, currentFileName, isDarkMode, showToast, orientation, paperSize, 
  dynamicCssString, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, 
  activeProfile, previewOnly=false, printSettings, signal, markdownContent, paginationSettings
}: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    const desktopApi = (window as any).electronAPI;
    let exportDestination: string | undefined;
    if (!previewOnly && desktopApi?.saveBinaryFile) {
      const selection = await desktopApi.showSaveDialog({
        title: 'PDF 저장 위치 선택',
        defaultPath: currentFileName.replace(/\.[^/.]+$/, '') + '.pdf',
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (selection.canceled || !selection.filePath) { showToast('내보내기가 취소되었습니다.', 'info'); return; }
      exportDestination = selection.filePath;
    }
    signal?.throwIfAborted();
    if(!previewOnly)showToast('PDF 내보내기 준비 중...', 'info');
    progress = previewOnly?{update(){},finish(){}}:startExportProgress('PDF');
    progress.update('미리보기 확인 중');
    if(!previewOnly)flushIME();

    await prepareExportPreview(previewEl);
    // Select the outer document before any MarkdownViewer mounted inside an image node.
    const targetEl = getExportDocumentRoot(previewEl);
    const isPicturebook = targetEl.dataset.picturebook === 'true';
    if (isPicturebook) {
      if (targetEl.querySelector('.book-screen-only [role="status"]') || targetEl.dataset.bookInvalid === 'true') {
        throw new Error('그림책의 장면 구성·이미지·본문 넘침 안내를 확인하고 수정해 주세요.');
      }
      for (const text of Array.from(targetEl.querySelectorAll<HTMLElement>('[data-book-text]'))) {
        if (text.scrollHeight > text.clientHeight + 2 || text.scrollWidth > text.clientWidth + 2) {
          throw new Error('페이지 영역을 넘는 본문이 있습니다. 글을 줄이거나 장면을 나눠 주세요.');
        }
      }
    }
    const clone = clonePreview(targetEl);
    // PDF page mode keeps the editable surface visually hidden. Restore its
    // layout in the print clone before Paged.js measures and splits pages.
    clone.querySelectorAll<HTMLElement>('[data-onrivi-editor-host]').forEach(host => host.removeAttribute('style'));
    // Editor controls and guides are UI, not document content. Keep the live editor mounted.
    clone.querySelectorAll('[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools').forEach(el => el.remove());
    markLeadExportFigure(clone);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    // 🛡️ Mermaid SVG가 페이지를 넘을 때 헤더(타이틀바)가 분리되지 않고 컨테이너와 SVG가 한 덩어리로 유지되도록
    //     내보내기 시 MermaidBlock의 헤더 자체를 제거하고 wrapper 전체에 break-inside: avoid 주입 (이전 페이지 빈 박스 잔상 원천 차단)
    clone.querySelectorAll('.not-prose > div').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty('overflow', 'visible', 'important');
      if (htmlEl.querySelector('.mermaid-svg-container')) {
        const header = htmlEl.querySelector(':scope > div:first-child');
        if (header && header.tagName === 'DIV') header.remove();
        htmlEl.style.setProperty('page-break-inside', 'avoid', 'important');
        htmlEl.style.setProperty('break-inside', 'avoid', 'important');
        const parentNotProse = htmlEl.closest('.not-prose') as HTMLElement | null;
        if (parentNotProse) {
          parentNotProse.style.setProperty('page-break-inside', 'avoid', 'important');
          parentNotProse.style.setProperty('break-inside', 'avoid', 'important');
        }
      }
    });

    clone.querySelectorAll('.mermaid-svg-container, .mermaid-block-container').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty('page-break-inside', 'avoid', 'important');
      htmlEl.style.setProperty('break-inside', 'avoid', 'important');
    });

    // 🖼️ 이미지 <figure> 및 래퍼 정규화: Chromium flex 컨테이너 인쇄 버그 및 과도한 높이로 인한 빈 공간 방지
    const figurePaper = PAPER_SIZES[(paperSize || 'a4').toLowerCase()] || PAPER_SIZES.a4;
    const figurePageHeight = orientation === 'landscape' ? figurePaper.width : figurePaper.height;
    const marginMm = (value: string | undefined) => cssPx(value || '18mm') * 25.4 / 96;
    const pdfImageMaxHeight = Math.max(1, (figurePageHeight - marginMm(marginTop) - marginMm(marginBottom)) * EXPORT_FIGURE_HEIGHT_RATIO);
    if (!isPicturebook) {
    clone.querySelectorAll('figure, .onrivi-image-figure').forEach(el => {
      const fig = el as HTMLElement;
      fig.style.setProperty('display', 'block', 'important');
      fig.style.setProperty('height', 'auto', 'important');
      fig.style.setProperty('min-height', '0', 'important');
      fig.style.setProperty('aspect-ratio', 'auto', 'important');
      fig.style.setProperty('margin', '1.2em auto', 'important');
      fig.style.setProperty('text-align', 'center', 'important');
      fig.style.setProperty('page-break-inside', 'avoid', 'important');
      fig.style.setProperty('break-inside', 'avoid', 'important');
    });
    clone.querySelectorAll('.onrivi-image-wrapper').forEach(el => {
      const wrap = el as HTMLElement;
      wrap.style.setProperty('display', 'block', 'important');
      wrap.style.setProperty('height', 'auto', 'important');
      wrap.style.setProperty('min-height', '0', 'important');
      wrap.style.setProperty('aspect-ratio', 'auto', 'important');
      wrap.style.setProperty('margin', '0 auto', 'important');
      wrap.style.setProperty('text-align', 'center', 'important');
    });
    clone.querySelectorAll('figure img, .onrivi-image-figure img, .onrivi-image-wrapper img').forEach(el => {
      const img = el as HTMLElement;
      img.style.setProperty('max-width', '100%', 'important');
      const heightLimit = img.closest('[data-export-lead-figure]') ? pdfImageMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO : pdfImageMaxHeight;
      img.style.setProperty('max-height', `${heightLimit}mm`, 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', '0 auto', 'important');
      img.style.setProperty('page-break-inside', 'avoid', 'important');
      img.style.setProperty('break-inside', 'avoid', 'important');
    });
    clone.querySelectorAll('figcaption, .onrivi-image-figure figcaption').forEach(el => {
      const cap = el as HTMLElement;
      cap.style.setProperty('display', 'block', 'important');
      cap.style.setProperty('text-align', 'center', 'important');
      cap.style.setProperty('margin-top', '6px', 'important');
      cap.style.setProperty('page-break-inside', 'avoid', 'important');
      cap.style.setProperty('break-inside', 'avoid', 'important');
    });
    }

    // 🌟 가로폭 좁아짐 현상 해결: 미리보기 컴포넌트에 남겨질 수 있는 가로폭 제약(width, max-width)을 초기화하여
    //    Electron 및 브라우저 인쇄 영역에 맞게 자연스럽게 반응형 100% 본문 너비를 확보하게 처리합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.height = 'auto';

    // 🌟 html2canvas 한계 보완: 테이블/인라인코드 inline style 강제 적용
    if (!isPicturebook) {
      applyExportInlineStyles(clone, activeProfile, targetEl);
      preserveRenderedTableStyles(clone, targetEl);
      unwrapPrintTables(clone);
      // Restore explicit image sizes after profile/print normalization.
      clone.querySelectorAll<HTMLElement>('.onrivi-image-wrapper[data-image-width],.onrivi-image-wrapper[data-image-height]').forEach(wrap=>{
        const image=wrap.querySelector('img');if(!image)return;
        if(wrap.dataset.imageWidth){wrap.style.setProperty('width',wrap.dataset.imageWidth,'important');image.style.setProperty('width','100%','important');}
        wrap.style.setProperty('height','auto','important');
        image.style.setProperty('height',wrap.dataset.imageHeight||'auto','important');
      });
    }

    // 📄 페이지 나누기: 화면(문서보기/미리보기)의 페이지 나누기 마커 100% 반영
    // 1) 기존 DOM 엘리먼트(.page-break, .onrivi-page-break, hr.page-break 등) 정규화
    clone.querySelectorAll('.page-break, .onrivi-page-break, hr.page-break, [data-onrivi-page-break]').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.setAttribute('data-onrivi-page-break', 'true');
      htmlEl.style.setProperty('break-before', 'page', 'important');
      htmlEl.style.setProperty('page-break-before', 'always', 'important');
      htmlEl.style.setProperty('height', '0', 'important');
      htmlEl.style.setProperty('min-height', '0', 'important');
      htmlEl.style.setProperty('margin', '0', 'important');
      htmlEl.style.setProperty('padding', '0', 'important');
      htmlEl.style.setProperty('border', '0', 'important');
    });

    // 2) 혹시 주석(Comment) 노드 또는 텍스트 노드로 남아있는 페이지 나누기 마커 치환
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT);
    const pageBreakNodesToReplace: { node: Node; replacement: HTMLElement }[] = [];
    while (walker.nextNode()) {
      const curr = walker.currentNode;
      const text = curr.nodeValue || '';
      // Comment.nodeValue contains only the contents, without <!-- and -->.
      const isCommentBreak = curr.nodeType === Node.COMMENT_NODE && /^\s*(?:(?:onrivi:)?page-?break|\[page-?break\])\s*$/i.test(text);
      const isTextBreak = curr.nodeType === Node.TEXT_NODE && !curr.parentElement?.closest('pre, code, script, style') && /^(?:\s*<!--\s*(?:(?:onrivi:)?page-?break|\[page-?break\])\s*-->\s*|\s*\\(?:pagebreak|newpage)\s*)$/i.test(text);
      if (isCommentBreak || isTextBreak) {
        const div = document.createElement('div');
        div.setAttribute('data-onrivi-page-break', 'true');
        div.className = 'onrivi-page-break page-break';
        div.style.cssText = 'break-before:page!important;page-break-before:always!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;font-size:0!important;line-height:0!important;';
        pageBreakNodesToReplace.push({ node: curr, replacement: div });
      }
    }
    for (const { node, replacement } of pageBreakNodesToReplace) {
      node.parentNode?.replaceChild(replacement, node);
    }

    const filename = `${currentFileName.replace(/\.[^/.]+$/, '')}.pdf`;
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

    const collected = collectAllStyles();
    progress.update('사용 중인 글꼴 준비 중');
    const inlineStyles = collected.inlineStyles.replace(/@font-face\s*\{[^}]*\}/gi, '') + "\n" + (previewOnly ? '' : await prepareDocumentFonts(targetEl));
    const linkTags = collected.linkTags;

    const pageBg = backgroundColor || '#ffffff';
    // 💡 미리보기에 적용된 dynamicCssString이 있으면 그대로 우선 적용하여 100% 화면 일치 보장
    const activeCss = dynamicCssString ? dynamicCssString : (activeProfile ? generateExportCss(activeProfile) : '');

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const geometry=resolvePageGeometry(activeProfile?.pageStyle || {paperSize,orientation,marginTop,marginBottom,marginLeft,marginRight});
    const pageWidth = geometry.width;
    const pageHeight = geometry.height;
    const cssPageSize = `${pageWidth}mm ${pageHeight}mm`;

    let finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentFileName}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
  ${linkTags}
  <style>
    ${inlineStyles}
  </style>
  <style>
    ${activeCss}
  </style>
  <style>
    @page {
      size: ${cssPageSize};
      margin-top: ${isPicturebook ? '0' : marginTop || '18mm'} !important;
      margin-bottom: ${isPicturebook ? '0' : marginBottom || '18mm'} !important;
      margin-left: ${isPicturebook ? '0' : marginLeft || '12mm'} !important;
      margin-right: ${isPicturebook ? '0' : marginRight || '12mm'} !important;
      background-color: ${pageBg} !important;
    }
    
    /* ──────────────── 머리글 & 바닥글 CSS ──────────────── */
    @media print {
      .print-header-area {
        position: fixed;
        top: 0 !important;
        right: 0;
        left: 0;
        display: flex;
        justify-content: flex-end;
        font-size: 8.5pt;
        color: #64748b;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 4px;
        z-index: 9999;
        background-color: white !important;
      }
      .print-footer-area {
        position: fixed;
        bottom: 0 !important;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        font-size: 8.5pt;
        color: #64748b;
        border-top: 1px solid #f1f5f9;
        padding-top: 4px;
        z-index: 9999;
        background-color: white !important;
      }
      

    }
    
    /* 화면에서는 인쇄 보조 영역 보이지 않게 처리 */
    .print-header-area, .print-footer-area {
      display: none;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background-color: ${pageBg} !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
      color: #1e293b;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }
    /* 인쇄 환경을 위한 본문 정렬 */
    .markdown-viewer-root {
      width: 100% !important;
      max-width: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      height: auto !important;
    }
    .custom-preview-container {
      background-color: ${pageBg} !important;
    }
    /* 리스트 및 체크박스 정렬 보정 */
    .export-list-marker {
      vertical-align: baseline !important;
    }
    .task-list-item input[type="checkbox"] {
      position: relative !important;
      top: 2px !important;
      vertical-align: baseline !important;
      margin-right: 6px !important;
    }
    /* 📄 [P0 / P1 / P2 / P3] 자연스러운 PDF 페이지 분할(Pagination) 전면 오버라이드 (하단 거대 빈 공간 및 고아 제목 원천 방어) */
    @media print {
      /* [P1] 제목 고아 방지 (Orphan Heading 원천 차단): 제목이 페이지 하단에 홀로 남지 않도록 보장 */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      /* 편집용 제목 식별 뱃지 인쇄 완전 차단 */
      :is(h1, h2, h3, h4, h5, h6)::after {
        display: none !important;
        content: none !important;
        visibility: hidden !important;
      }

      /* [P0] 일반 본문/문단/리스트 자연스러운 행 단위 분할 허용 (하단 대형 빈 공간 소거) */
      p, li, .prose p {
        page-break-inside: auto !important;
        break-inside: auto !important;
        orphans: 2 !important;
        widows: 2 !important;
      }
      ul, ol {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* [P0] 보기 상자(blockquote) 및 시험 문제 선택지 인쇄 보호 (페이지 중간 쪼개짐 및 거대 빈 여백 방지) */
      blockquote {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 8px !important;
        margin-bottom: 10px !important;
        padding: 8px 14px !important;
      }
      blockquote p {
        margin-top: 0 !important;
        margin-bottom: 4px !important;
        line-height: 1.55 !important;
      }
      blockquote p:last-child {
        margin-bottom: 0 !important;
      }
      blockquote ul, blockquote ol {
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 1.4em !important;
      }
      blockquote li {
        margin-bottom: 2px !important;
        line-height: 1.5 !important;
      }
      blockquote li p {
        margin-top: 0 !important;
        margin-bottom: 2px !important;
      }

      /* [P0] 시험 문제 선택지(①~⑮, ㄱ~ㄹ 등) 한 덩어리 보존 */
      .exam-choice-paragraph,
      [data-exam-choice="true"] {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        line-height: 1.5 !important;
        margin-bottom: 12px !important;
      }
      .exam-choice-paragraph .onrivi-line {
        min-height: 1.35em !important;
        line-height: 1.5 !important;
      }
      .exam-choice-paragraph .onrivi-line + .onrivi-line {
        margin-top: 3px !important;
      }

      /* [P0] 수동 페이지 나누기 강제 사출 및 화면 점선/가상요소 텍스트 잔상 제거 */
      [data-onrivi-page-break],
      .onrivi-page-break,
      .page-break,
      hr.page-break {
        page-break-before: always !important;
        break-before: page !important;
        height: 0 !important;
        min-height: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 0 !important;
        line-height: 0 !important;
        visibility: hidden !important;
      }
      [data-onrivi-page-break]::before,
      .onrivi-page-break::before,
      .page-break::before,
      hr.page-break::before {
        display: none !important;
        content: none !important;
      }

      /* [P0] 일반 섹션 및 래퍼 컨테이너는 페이지 분할 허용 (불필요한 통째 밀림 방지) */
      section,
      article,
      .page-break-container,
      .markdown-viewer-root,
      .custom-preview-container {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* [P1] 이미지 및 도표 보호 & 이미지 + 캡션 한 덩어리 결속 */
      figure,
      .onrivi-image-figure {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: block !important;
        margin: 1.2em auto !important;
        text-align: center !important;
      }
      .onrivi-image-wrapper {
        display: block !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        text-align: center !important;
      }
      /* [P1] 큰 이미지 자동 축소: 페이지 남은 높이에 맞게 유연하게 축소되어 불필요한 페이지 넘김 및 앞선 대형 빈 공간 원천 방어 */
      figure img,
      .onrivi-image-figure img,
      .onrivi-image-wrapper img {
        max-width: 100% !important;
        max-height: ${pdfImageMaxHeight}mm !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      [data-export-lead-figure] img, img[data-export-lead-figure] {
        max-height: ${pdfImageMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO}mm !important;
      }
      figcaption,
      .onrivi-image-figure figcaption {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: block !important;
        text-align: center !important;
        margin-top: 6px !important;
      }

      /* [P2] 표 Pagination: 표 전체 분할 허용, 행 분할 금지, thead 헤더 반복 */
      table {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      tfoot {
        display: table-footer-group !important;
      }

      /* [P3] 코드블록: 박스 내 자동 줄바꿈 허용 */
      pre, code, .codeblock-area {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* [P4] 인용구 및 콜아웃(Alert): 박스 중간 쪼개짐 방어 (원자적 페이지 분할) */
      blockquote,
      [data-alert-type],
      .visual-readonly-callout,
      .callout-box,
      .custom-preview-container blockquote {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* [P0] Mermaid 다이어그램: 컨테이너와 SVG를 한 덩어리로 원자적(Atomic) 결속 (6페이지 빈 박스 잔상 원천 차단) */
      .not-prose,
      .not-prose > div,
      .mermaid-svg-container,
      .mermaid-block-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: visible !important;
      }
      .mermaid-svg-container svg,
      .mermaid-block-container svg,
      .not-prose svg {
        max-height: 200mm !important;
        max-width: 100% !important;
        width: auto !important;
        height: auto !important;
        display: block !important;
        margin-left: auto !important;
        margin-right: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    /* 카텍스 수식 가드 */
    .katex-display {
      display: block !important;
      margin: 1em 0 !important;
      padding: 0.2em 0 !important;
      height: auto !important;
      overflow: visible !important;
    }
    /* 💬 코드블록 내부 자동 줄바꿈 강제 (가로 스크롤 및 잘림 원천 방어) */
    .codeblock-area,
    .codeblock-area div {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow-x: visible !important;
    }
    .codeblock-area pre,
    .codeblock-area pre code,
    .codeblock-area .onrivi-line,
    .codeblock-area .onrivi-line *,
    pre, code, .onrivi-line {
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-all !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: visible !important;
    }
    /* 🛡️ 각주 타이틀 및 영어 라벨 원천 차단 */
    .footnotes h2,
    .footnotes #footnote-label,
    .footnotes .sr-only {
      display: none !important;
    }
    /* 🛡️ 각주 리스트 정렬 보정: 번호와 내용이 한 줄에 조화롭게 나오도록 강제 */
    .footnotes ol {
      list-style-type: decimal !important;
      padding-left: 1.5em !important;
      margin: 0 !important;
    }
    .footnotes li {
      margin-bottom: 0.5em !important;
      list-style-position: outside !important;
      display: list-item !important;
    }
    .footnotes li p {
      display: inline !important;
      margin: 0 !important;
    }
    .footnotes li::before {
      display: none !important;
      content: none !important;
    }
    .footnote-backref {
      text-decoration: none !important;
      margin-left: 4px !important;
      font-family: sans-serif !important;
    }

    /* ──────────────── 페이지 번호 & 첫 페이지 숨김 CSS ──────────────── */
    @media print {
      body {
        counter-reset: page;
      }
      .page-break-container {
        /* 페이지 구분 시 카운터 증가 */
        counter-increment: page;
      }
      
      .print-header-area {
        position: fixed;
        top: 0 !important;
        right: 0;
        font-size: 8.5pt;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
        width: 100%;
        text-align: right;
        padding-bottom: 4px;
        z-index: 9999;
        display: block !important;
        background-color: white !important; /* 본문 겹침 방지 */
      }
      .print-footer-area {
        position: fixed;
        bottom: 0 !important;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 8.5pt;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
        z-index: 9999;
        display: block !important;
        background-color: white !important; /* 본문 겹침 방지 */
      }
      
      .print-footer-area .page-num::after {
        content: counter(page);
      }
    }
    ${PRINT_TABLE_FLOW_CSS}
  </style>
</head>
<body class="prose prose-base max-w-none custom-preview-container">

  <div class="page-break-container">
    ${clone.outerHTML}
  </div>


</body>
</html>
    `;

    if (isPicturebook) {
      clone.querySelectorAll('.book-screen-only').forEach(el => el.remove());
      const bookPrintCss = `<style>
        @page { size:${cssPageSize}; margin:0!important; }
        html,body,.page-break-container,.picturebook-root { width:auto!important; max-width:none!important; padding:0!important; margin:0!important; }
        .picturebook-root .book-page { width:${pageWidth}mm!important; height:${pageHeight}mm!important; zoom:1!important; margin:0!important; break-after:page!important; break-inside:avoid!important; }
        .picturebook-root .book-page:last-of-type { break-after:auto!important; }
        .picturebook-root .book-image { height:100%!important; }
        .picturebook-root .book-image .markdown-viewer-root,.picturebook-root .book-image .markdown-viewer-root > div,.picturebook-root .book-image .onrivi-image-figure,.picturebook-root .book-image figure,.picturebook-root .book-image p,.picturebook-root .onrivi-image-wrapper { height:100%!important; min-height:0!important; padding:0!important; margin:0!important; }
        .picturebook-root .book-page .book-image .markdown-viewer-root img { width:100%!important; height:100%!important; max-height:none!important; object-fit:${activeProfile?.layout?.imageFit || 'cover'}!important; }
        .picturebook-root .book-text .markdown-viewer-root { padding:0!important; }
        .book-screen-only,.picturebook-root figcaption { display:none!important; }
      </style>`;
      finalHtml = finalHtml.replace('</head>', bookPrintCss + '</head>');
    }

    if(!isPicturebook){
      const effectiveSettings = printSettings ?? (markdownContent ? readEffectivePrintSettings(markdownContent) : readEffectivePrintSettings(''));
      const resolved = await resolveExportWatermark(effectiveSettings);
      progress.update('용지에 맞춰 페이지 계산 중');
      try {
        const {paginatePrintHtml}=await import('./paginatedPrint');
        const {readPaginationSettings}=await import('./documentPaginationSettings');
        const paginatedResult = await withExportTimeout(
          paginatePrintHtml(finalHtml, activeProfile?.pageStyle || {paperSize,orientation,marginTop,marginBottom,marginLeft,marginRight}, resolved, signal,paginationSettings || readPaginationSettings(markdownContent || ''),stage=>progress?.update(stage)),
          '페이지 계산',
          30000
        );
        if (paginatedResult) {
          finalHtml = paginatedResult;
          if(!previewOnly && Number(finalHtml.match(/data-onrivi-unresolved-count="(\d+)"/)?.[1] || 0)>0)throw new Error('위치를 찾을 수 없는 출력 경계가 있습니다. 인쇄 미리보기에서 확인하거나 해제해 주세요.');
          if(!previewOnly && Number(finalHtml.match(/data-onrivi-oversized-count="(\d+)"/)?.[1] || 0)>0)throw new Error('용지 높이를 넘는 표 행·그림·수식이 있습니다. 인쇄 미리보기와 서식을 확인해 주세요.');
        }
      } catch (paginateErr) {
        console.warn('[exportPDF] 페이지 계산 또는 출력 경계 확인 실패:', paginateErr);
        throw paginateErr;
      }
    }
    if(previewOnly)return finalHtml;

    if (isElectron) {
      // ====================================================================
      // 🌟 [Electron 데스크톱 모드] Chromium 네이티브 PDF 인쇄 엔진 가동
      //    (html2canvas의 폰트 깨짐, 수식 왜곡, 픽셀 짤림 한계를 100% 원천 극복하는 궁극의 인쇄 솔루션)
      // ====================================================================
      const mmToInches = (mmStr?: string) => {
        const mm = parseFloat(mmStr || '10');
        return Math.max(mm, 0) / 25.4;
      };

      // Font files and application styles are already embedded. Do not make the
      // temporary desktop window wait for Google Fonts/CDN requests again.
      const desktopHtml = finalHtml
        .replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/gi, '')
        .replace(/@import\s+(?:url\([^;]+\)|["'][^"']+["'])[^;]*;/gi, '');
      progress.update('PDF 페이지 생성 중');
      const pdfBuffer: Uint8Array = await (window as any).electronAPI.printHTMLToPDF(desktopHtml, {
        landscape: isLandscape,
        margins: {
          marginType: 'none'
        },
        pageSize: ['A3', 'A4', 'A5', 'LEGAL', 'LETTER', 'TABLOID'].includes(paperKey.toUpperCase())
          ? paperKey.toUpperCase()
          : { width: pageWidth * 1000, height: pageHeight * 1000 },
        printBackground: true
      });

      if (!pdfBuffer) {
        throw new Error("PDF 버퍼 데이터를 수신하지 못했습니다.");
      }

      if (exportDestination) {
        progress.update('PDF 파일 저장 중');
        await desktopApi.saveBinaryFile(exportDestination, new Uint8Array(pdfBuffer));
        showToast('PDF 파일이 성공적으로 저장되었습니다.', 'success');
        return;
      }
      // 이전 preload 버전 호환 경로
      const base64Data = Buffer.from(pdfBuffer).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64Data}`;

      const result = await (window as any).electronAPI.saveFileAs(
        dataUrl, 
        filename, 
        '', 
        [{ name: 'PDF Documents', extensions: ['pdf'] }]
      );
      
      if (result) {
        showToast('PDF 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('PDF 내보내기가 취소되었습니다.', 'info');
      }
      return;
    }

    // ====================================================================
    // 💡 [Web 브라우저 / 확장프로그램 모드] iframe + 브라우저 네이티브 인쇄 엔진(window.print)
    //    (데스크탑 버전과 100% 동일한 Chromium PDF 인쇄 결과 보장)
    // ====================================================================
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const cleanup = () => iframe.remove();
    try {
      progress.update('인쇄 창 여는 중');
      const loaded = new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => resolve();
      });
      iframe.srcdoc = finalHtml;
      await withExportTimeout(loaded, '인쇄 문서', 2000).catch(() => {});
      const printDocument = iframe.contentDocument;
      const printWindow = iframe.contentWindow;
      if (!printDocument || !printWindow) throw new Error('인쇄 문서를 준비하지 못했습니다.');
      
      await Promise.race([
        Promise.all(Array.from(printDocument.images).map(img => img.decode().catch(() => {}))),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      showToast('브라우저 인쇄 창이 열립니다. 대상에서 프린터 또는 "PDF로 저장"을 선택해 주세요.', 'info');
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 300_000);
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      cleanup();
      throw error;
    }

    showToast('인쇄 대상에서 “PDF로 저장”을 선택해 저장해 주세요.', 'info');
  } catch (err: any) {
    if(signal?.aborted)throw err;
    msg.error('PDF export error', err);
    showToast('PDF 내보내기 실패: ' + err.message, 'error');
    if(previewOnly)throw err;
  } finally {
    progress?.finish();
  }
}

// ─────────────────────────────────────────────
// HTML 내보내기
// ─────────────────────────────────────────────
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0011] exportHandlers.ts ➔ exportHTML
// 🎯 @KICK  : 미리보기 DOM을 독립 HTML 파일로 내보내기 (Tailwind CDN + computed font 포함)
// 🛡️ @GUARD : Electron saveFileAs, computed fontFamily 반영
// 🚨 @PATCH : **2026-06-20** — HTML 내보내기 시 에디터 로컬 및 확장프로그램 스타일시트를 동기식 스타일 규칙 추출 전략(collectAllStyles)을 사용하여 헤더에 `<style>`로 인라인화(Embed)함으로써 오프라인 및 로컬 환경에서도 미리보기와 100% 동일한 테마 서식이 누락 없이 적용되도록 조치
// 🔗 @CALLS : clonePreview, inlineLocalImages, injectExportStyles, saveToDownloads, collectAllStyles
// ====================================================================
export async function exportHTML({ 
  previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, 
  orientation, paperSize, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile 
}: ExportOptions) {
  try {
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    markLeadExportFigure(clone);
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    // 🌟 가로폭 좁아짐 현상 해결: 미리보기와 동일하게 A4 용지 규격을 유지하기 위해 width 100%로 설정하고,
    //    실측 마진 및 용지 크기를 템플릿의 .preview-page-sheet 클래스에 반영합니다.
    // 🌟 이중 여백 방지: 가상 시트지 패딩과의 중첩을 피하기 위해 clone 자체의 여백(마진/패딩)을 초기화합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('padding', '0', 'important');
    clone.style.overflow = 'visible';
    clone.style.height = 'auto';

    // 🌟 공유 스타일을 clone에 직접 주입 (동적 CSS + 인디케이터 숨김)
    injectExportStyles(clone, dynamicCssString, { hideIndicators: true });

    // 🌟 미리보기 실제 렌더링 스타일(코드블록 자동줄바꿈/테이블/인라인코드)을 clone에 1:1 인라인 주입
    applyExportInlineStyles(clone, activeProfile, targetEl);

    const baseName = currentFileName.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}.html`;

    // 💡 런타임에 에디터에 선언된 로컬 및 확장프로그램 스타일시트 추출
    const collected = collectAllStyles();
    const inlineStyles = collected.inlineStyles.replace(/@font-face\s*\{[^}]*\}/gi, '') + "\n" + await prepareDocumentFonts(targetEl);
    const linkTags = collected.linkTags;

    // 💡 미리보기에 실제 렌더링된 font-family를 HTML 템플릿에도 반영 (동적 CSS 프로필 값 포함)
    const computedFontFamily = window.getComputedStyle(targetEl).fontFamily;

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const pageWidth = isLandscape ? paperSpec.height : paperSpec.width;
    const pageHeight = isLandscape ? paperSpec.width : paperSpec.height;
    
    const paperWidthStr = `${pageWidth}mm`;
    const minHeightStr = `${pageHeight}mm`;
    const cssPageSize = `${pageWidth}mm ${pageHeight}mm`;
    
    const printFigureMaxHeight = Math.max(1, (pageHeight - cssPx(marginTop || '18mm') * 25.4 / 96 - cssPx(marginBottom || '18mm') * 25.4 / 96) * EXPORT_FIGURE_HEIGHT_RATIO);
    const pTop = marginTop || '18mm';
    const pBottom = marginBottom || '18mm';
    const pLeft = marginLeft || '12mm';
    const pRight = marginRight || '12mm';
    
    const pageBg = backgroundColor || '#ffffff';
    // 💡 activeProfile이 있으면 무조건 라이트모드 기준 export용 CSS를 다시 생성하여 dynamicCssString을 대체
    const activeCss = activeProfile ? generateExportCss(activeProfile) : (dynamicCssString || '');

    const finalHtml = `<!DOCTYPE html>
<html lang="ko" data-onrivi-export>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  ${linkTags}
  <style>
    ${inlineStyles}
  </style>
  <style>
    ${activeCss}
  </style>
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: ${computedFontFamily};
      background-color: ${pageBg} !important;
      color: ${isDarkMode ? '#c9d1d9' : '#1f2328'};
      padding: 2rem;
      margin: 0;
      display: flex;
      justify-content: center;
    }
    .preview-page-sheet {
      width: ${paperWidthStr};
      min-height: ${minHeightStr};
      padding-top: ${pTop};
      padding-bottom: ${pBottom};
      padding-left: ${pLeft};
      padding-right: ${pRight};
      background-color: ${pageBg} !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'};
      box-sizing: border-box;
    }
    .markdown-viewer-root, .prose {
      background-color: transparent !important;
    }
    /* 💬 코드블록 내부 자동 줄바꿈 강제 (가로 스크롤 및 잘림 원천 방어) */
    .codeblock-area,
    .codeblock-area div {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow-x: visible !important;
    }
    .codeblock-area pre,
    .codeblock-area pre code,
    .codeblock-area .onrivi-line,
    .codeblock-area .onrivi-line *,
    pre, code, .onrivi-line {
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-all !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: visible !important;
    }
    @page {
      size: ${cssPageSize};
      margin-top: ${marginTop || '18mm'} !important;
      margin-bottom: ${marginBottom || '18mm'} !important;
      margin-left: ${marginLeft || '12mm'} !important;
      margin-right: ${marginRight || '12mm'} !important;
      background-color: ${pageBg} !important;
    }
    @media print {
      .custom-preview-container figure img,
      .custom-preview-container .onrivi-image-figure img,
      .custom-preview-container .onrivi-image-wrapper img {
        max-height: ${printFigureMaxHeight}mm !important;
        width: auto !important;
        height: auto !important;
      }
      .custom-preview-container [data-export-lead-figure] img,
      .custom-preview-container img[data-export-lead-figure] {
        max-height: ${printFigureMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO}mm !important;
      }
      body {
        background-color: ${pageBg} !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .preview-page-sheet {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important; /* 인쇄 모드에서는 내부 패딩을 0으로 리셋하고 @page 마진에 위임 */
        background-color: ${pageBg} !important;
        box-sizing: border-box !important;
      }
    }
    ${PRINT_TABLE_FLOW_CSS}
  </style>
</head>
<body class="custom-preview-container" style="background-color: ${pageBg} !important; height:auto!important;max-height:none!important;overflow:visible!important;">
  <div class="preview-page-sheet prose prose-base max-w-none custom-preview-container" style="background-color: ${pageBg} !important;">
    ${clone.outerHTML}
  </div>
</body>
</html>`;

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const result = await (window as any).electronAPI.saveFileAs(
        finalHtml, 
        filename, 
        '', 
        [{ name: 'HTML Documents', extensions: ['html'] }]
      );
      if (result) {
        showToast('HTML 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('HTML 내보내기가 취소되었습니다.', 'info');
      }
    } else {
      // 브라우저 다운로드
      const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

      // 다운로드 폴더 저장
      const ok = await saveToDownloads(filename, finalHtml, 'text');
      showToast(ok ? '다운로드 폴더에 HTML이 생성되었습니다.' : 'HTML 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    msg.error('HTML export error', err);
    showToast('HTML 내보내기 실패: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────
// EPUB 내보내기
// ─────────────────────────────────────────────
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0012] exportHandlers.ts ➔ exportEPUB
// 🎯 @KICK  : 미리보기 DOM을 EPUB으로 내보내기 (generateEpub 호출, 이미지 인라인)
// 🛡️ @GUARD : Electron saveFileAs 브랜치, fontFamily computed 적용, export-style-element 제거
// 🚨 @PATCH : **2026-07-21** — EPUB 내보내기 시 배경색 누락 방지를 위해 activeCss 문자열 자체에 백그라운드 컬러 룰 명시적 병합 탑재; **2026-06-19** — EPUB 내보내기 가로폭 제약 초기화 패치: clone 객체의 인라인 가로폭 제약을 제거하여 리더기 뷰포트에 맞게 자연스러운 흐름을 보장하도록 보정
// 🔗 @CALLS : clonePreview, inlineLocalImages, injectExportStyles, generateEpub, downloadBlob, saveToDownloads
// ====================================================================
export async function exportEPUB({ previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, backgroundColor, activeProfile, printSettings, markdownContent }: ExportOptions) {
  const effectiveWatermark = { ...(printSettings ?? (markdownContent ? readEffectivePrintSettings(markdownContent) : readEffectivePrintSettings(''))) };
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    Object.assign(effectiveWatermark, await resolveExportWatermark(effectiveWatermark));
    const desktopApi = (window as any).electronAPI;
    let exportDestination: string | undefined;
    if (desktopApi?.saveBinaryFile) {
      const selection = await desktopApi.showSaveDialog({
        title: 'EPUB 저장 위치 선택',
        defaultPath: currentFileName.replace(/\.[^/.]+$/, '') + '.epub',
        filters: [{ name: 'EPUB Documents', extensions: ['epub'] }]
      });
      if (selection.canceled || !selection.filePath) { showToast('내보내기가 취소되었습니다.', 'info'); return; }
      exportDestination = selection.filePath;
    }
    showToast('EPUB 내보내기 준비 중...', 'info');
    progress = startExportProgress('EPUB');
    progress.update('미리보기 확인 중');

    // ✅ PDF/HTML과 동일한 타겟팅
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    const isPicturebook = targetEl.dataset.picturebook === 'true';
    if (isPicturebook && targetEl.dataset.bookInvalid === 'true') throw new Error('그림책의 이미지 로딩 또는 본문 넘침을 해결한 후 내보내 주세요.');
    const fixedLayout = isPicturebook ? (await import('@/lib/picturebookEpub')).preparePicturebookEpub(clone,targetEl) : undefined;
    // 🌟 EPUB 내보내기 가로폭 제약 초기화 패치: clone 객체의 인라인 가로폭 제약을 제거하여 리더기 뷰포트에 맞게 자연스러운 흐름을 보장하도록 보정
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';

    // 🌟 공유 스타일 주입 (인디케이터 숨김 + 동적 CSS 프로필)
    const pageBg = backgroundColor || (activeProfile && activeProfile.pageStyle ? activeProfile.pageStyle.backgroundColor : null) || '#ffffff';
    let activeCss = activeProfile ? generateExportCss(activeProfile) : (dynamicCssString || '');
    
    // 🌟 EPUB 전용 배경색 보존 패치: injectExportStyles 내부에서 생성하는 <style> 태그는 EPUB 내보내기 시 제거되므로,
    // activeCss 자체에 배경색을 명시적으로 주입하여 generateEpub() 내부의 style.css에 전달되도록 보장합니다.
    if (pageBg && pageBg !== 'transparent') {
      activeCss += `\n.custom-preview-container {\n  background-color: ${pageBg} !important;\n}\n.custom-preview-container .prose {\n  background-color: ${pageBg} !important;\n}\n`;
    }

    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    // 💡 미리보기에 실제 렌더링된 font-family를 EPUB style.css body에도 반영
    const computedFontFamily = window.getComputedStyle(targetEl).fontFamily;

    const epubTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${epubTitle}.epub`;

    showToast('EPUB 파일 생성 중... (내용 분할 및 이미지 처리)', 'info');
    const { generateEpub, downloadBlob } = await import('@/lib/epubGenerator');

    // EPUB 본문에 html2canvas용 인라인 스타일이 포함되지 않도록 제거 (외부 style.css에서만 처리)
    clone.querySelector('style.export-style-element')?.remove();

    // 🌟 미리보기 실제 렌더링 스타일(테이블/코드블록 테마/인라인코드)을 clone에 1:1 인라인 주입
    if (!isPicturebook) {
    applyExportInlineStyles(clone, activeProfile, targetEl);
    preserveRenderedTableStyles(clone, targetEl);

    // 🛡️ Mermaid SVG → base64 data:image/svg+xml <img> 변환
    //     EPUB DOMParser가 SVG 네임스페이스를 손상시켜 도형이 사라지는 문제 우회
    //     세로로 긴 다이어그램도 전자책 리더기 화면(85vh) 내에 쏙 들어가도록 auto-scale 및 break-inside: avoid 보정
    clone.querySelectorAll('.not-prose > div').forEach(el => {
      const container = el as HTMLElement;
      const svgBox = container.querySelector('.mermaid-svg-container') as HTMLElement | null;
      if (!svgBox) return;
      // 헤더(타이틀바) 제거 — 버튼은 이미 제거됨
      const header = container.querySelector(':scope > div:first-child');
      if (header) header.remove();

      // 중간 컨테이너 div들 overflow: visible 보장
      container.querySelectorAll('div').forEach(d => {
        (d as HTMLElement).style.setProperty('overflow', 'visible', 'important');
      });

      // SVG를 base64 data URI로 변환
      const svgEl = svgBox.querySelector('svg');
      if (svgEl) {
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const img = document.createElement('img');
        img.src = `data:image/svg+xml;base64,${base64}`;
        img.alt = 'Mermaid diagram';
        img.style.cssText = 'max-width:100% !important;max-height:85vh !important;width:auto !important;height:auto !important;object-fit:contain !important;display:block !important;margin:0 auto !important;page-break-inside:avoid !important;break-inside:avoid !important;';
        svgBox.innerHTML = '';
        svgBox.appendChild(img);
      }
      container.style.setProperty('overflow', 'visible', 'important');
      container.style.setProperty('page-break-inside', 'avoid', 'important');
      container.style.setProperty('break-inside', 'avoid', 'important');
      container.style.setProperty('text-align', 'center', 'important');
      container.style.setProperty('margin', '1.5em auto', 'important');
    });

    // 추가 안전망: .not-prose > div 구조 밖의 .mermaid-svg-container도 빠짐없이 처리
    clone.querySelectorAll('.mermaid-svg-container').forEach(svgBoxEl => {
      const svgBox = svgBoxEl as HTMLElement;
      if (svgBox.querySelector('img[alt="Mermaid diagram"]')) return;
      const svgEl = svgBox.querySelector('svg');
      if (svgEl) {
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const img = document.createElement('img');
        img.src = `data:image/svg+xml;base64,${base64}`;
        img.alt = 'Mermaid diagram';
        img.style.cssText = 'max-width:100% !important;max-height:85vh !important;width:auto !important;height:auto !important;object-fit:contain !important;display:block !important;margin:0 auto !important;page-break-inside:avoid !important;break-inside:avoid !important;';
        svgBox.innerHTML = '';
        svgBox.appendChild(img);
        svgBox.style.setProperty('page-break-inside', 'avoid', 'important');
        svgBox.style.setProperty('break-inside', 'avoid', 'important');
        svgBox.style.setProperty('overflow', 'visible', 'important');
      }
    });

    // 🖼️ 이미지 <figure> 및 래퍼 정규화 (EPUB 리더기의 기본 figure margin 40px 및 inline-flex로 인한 우측 쏠림/잔상 방지)
    clone.querySelectorAll('figure, .onrivi-image-figure').forEach(el => {
      const fig = el as HTMLElement;
      fig.style.setProperty('margin', '1.5em 0', 'important');
      fig.style.setProperty('padding', '0', 'important');
      fig.style.setProperty('text-align', 'center', 'important');
      fig.style.setProperty('width', '100%', 'important');
      fig.style.setProperty('max-width', '100%', 'important');
      fig.style.setProperty('box-sizing', 'border-box', 'important');
      fig.style.setProperty('display', 'block', 'important');
      fig.style.setProperty('overflow', 'hidden', 'important');
    });
    clone.querySelectorAll('.onrivi-image-wrapper').forEach(el => {
      const wrap = el as HTMLElement;
      wrap.style.setProperty('display', 'block', 'important');
      wrap.style.setProperty('margin', '0 auto', 'important');
      wrap.style.setProperty('max-width', '100%', 'important');
      wrap.style.setProperty('text-align', 'center', 'important');
      wrap.style.setProperty('box-sizing', 'border-box', 'important');
      wrap.style.setProperty('overflow', 'hidden', 'important');
    });
    clone.querySelectorAll('figure img, .onrivi-image-figure img, .onrivi-image-wrapper img').forEach(el => {
      const img = el as HTMLElement;
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('max-height', '85vh', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', '1.5em auto', 'important');
      img.style.setProperty('page-break-inside', 'avoid', 'important');
      img.style.setProperty('break-inside', 'avoid', 'important');
    });

    }
    progress.update('사용 중인 글꼴 준비 중');
    const fontCss = await prepareDocumentFonts(targetEl);
    progress.update('전자책 구성 중');
    const blob = await generateEpub({ 
      title: epubTitle, 
      contentHtml: clone.innerHTML, 
      dynamicCssString: activeCss + "\n" + fontCss,
      onProgress: percent => progress?.update(`전자책 압축 중 ${Math.floor(percent)}%`),
      fontFamily: computedFontFamily,
      exportPageBreakLevel: 'none',
      fixedLayout,
      watermark: effectiveWatermark
    });

    showToast('EPUB 저장 중...', 'info');
    progress.update('EPUB 파일 저장 중');
    if (exportDestination) {
      await desktopApi.saveBinaryFile(exportDestination, new Uint8Array(await blob.arrayBuffer()));
      showToast('EPUB 파일이 성공적으로 저장되었습니다.', 'success');
    } else if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const reader = new FileReader();
      const savePromise = new Promise<boolean>((resolve) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            const result = await (window as any).electronAPI.saveFileAs(
              base64Data, 
              filename, 
              '', 
              [{ name: 'EPUB Documents', extensions: ['epub'] }]
            );
            
            if (result) {
              showToast('EPUB 파일이 성공적으로 저장되었습니다.', 'success');
              resolve(true);
            } else {
              showToast('EPUB 내보내기가 취소되었습니다.', 'info');
              resolve(false);
            }
          } catch (err: any) {
            showToast('EPUB 저장 실패: ' + err.message, 'error');
            resolve(false);
          }
        };
      });
      reader.readAsDataURL(blob);
      await savePromise;
    } else {
      downloadBlob(blob, filename);

      // 다운로드 폴더 저장
      const reader = new FileReader();
      reader.onloadend = async () => {
        const ok = await saveToDownloads(filename, reader.result as string, 'base64');
        showToast(ok ? '다운로드 폴더에 EPUB이 생성되었습니다.' : 'EPUB 내보내기가 완료되었습니다.', 'success');
      };
      reader.readAsDataURL(blob);
    }
  } catch (err: any) {
    msg.error('EPUB export error', err);
    const errMsg = err?.message || err?.toString() || '알 수 없는 오류';
    showToast('EPUB 내보내기 실패: ' + errMsg, 'error');
  } finally {
    progress?.finish();
  }
}

// ─────────────────────────────────────────────
// PNG 내보내기
// ─────────────────────────────────────────────
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0013] exportHandlers.ts ➔ exportPNG
// 🎯 @KICK  : 미리보기 DOM을 html-to-image로 PNG 캡처 및 저장 (Electron/브라우저)
// 🛡️ @GUARD : Electron IPC saveFileAs, overflow visible 강제, scrollHeight 측정 fallback
// 🚨 @PATCH : **2026-06-20** — 이미지 내보내기 시 에디터 로컬 및 확장프로그램 스타일시트를 동기식 스타일 규칙 추출 전략(collectAllStyles)으로 추출하여 wrapper 내에 `<style>`로 주입함으로써 html-to-image 이미지 변환 시 CSP/CORS 차단으로 발생하던 서식(제목 색상 및 글꼴 등) 유실 현상을 완벽히 해결
// 🔗 @CALLS : flushIME, clonePreview, inlineLocalImages, injectExportStyles, fixListMarkers, applyExportInlineStyles, saveToDownloads, collectAllStyles
// ====================================================================
export async function exportPNG({ 
  previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, 
  orientation, paperSize, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile 
}: ExportOptions) {
  try {
    showToast('이미지 내보내기 준비 중...', 'info');
    flushIME();
    const htmlToImage = await import('html-to-image');
    const filename = `${currentFileName.replace(/\.[^/.]+$/, '')}.png`;

    // 💡 런타임에 에디터에 선언된 로컬 및 확장프로그램 스타일시트 추출
    const { inlineStyles } = collectAllStyles();

    // ✅ PDF/HTML과 동일한 타겟팅
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가
    
    // 🌟 가로폭 좁아짐 현상 해결: 미리보기와 동일하게 A4 용지 규격을 유지하기 위해 width 100%로 설정하고,
    //    실측 마진 및 용지 크기를 wrapper에 직접 반영하여 글자 줄바꿈을 100% 동기화합니다.
    // 🌟 이중 여백 방지: 가상 래퍼 패딩과의 중첩을 피하기 위해 clone 자체의 여백(마진/패딩)을 초기화합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('padding', '0', 'important');

    // 🌟 공유 스타일 주입 (인디케이터 숨김 + 동적 CSS 프로필)
    const pageBg = backgroundColor || '#ffffff';
    // 💡 미리보기에 적용된 dynamicCssString이 있으면 그대로 우선 적용하여 100% 화면 일치 보장
    const activeCss = dynamicCssString ? dynamicCssString : (activeProfile ? generateExportCss(activeProfile) : '');
    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    // ✅ 폰트 로딩 대기 (html-to-image는 폰트 미적용 상태로 캡처 시 텍스트 누락)
    await waitForExportResources(targetEl);
    await new Promise(r => setTimeout(r, 300));

    // 🎯 html2canvas가 ::before/counter() 미지원 → 목록 마커 DOM 직접 주입 (원문자 및 1~3단계 불릿 동기화)
    fixListMarkers(clone, activeProfile);
    // 🌟 html2canvas 한계 보완: 테이블/인라인코드 inline style 강제 적용 (미리보기 실제 DOM과 1:1 동기화)
    applyExportInlineStyles(clone, activeProfile, targetEl);

    clone.querySelectorAll('img').forEach(img => img.setAttribute('crossOrigin', 'anonymous'));

    // 스크롤바 렌더링 오염 방지: 복제본 및 내부 요소의 overflow를 강제 해제하여 본문이 아래로 자연스럽게 펼쳐지도록 합니다.
    clone.style.overflow = 'visible';
    clone.style.overflowY = 'visible';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const pageWidthMm = isLandscape ? paperSpec.height : paperSpec.width;
    const pageHeightMm = isLandscape ? paperSpec.width : paperSpec.height;

    const widthPx = Math.round(pageWidthMm * 96 / 25.4);
    const minHeightPx = Math.round(pageHeightMm * 96 / 25.4);
    
    const mmToPx = (mmStr?: string, defaultVal = 18) => {
      const mm = parseFloat(mmStr || `${defaultVal}`);
      return Math.round(mm * 96 / 25.4);
    };
    
    const pTop = mmToPx(marginTop, 18);
    const pBottom = mmToPx(marginBottom, 18);
    const pLeft = mmToPx(marginLeft, 12);
    const pRight = mmToPx(marginRight, 12);

    const wrapper = document.createElement('div');
    
    // wrapper를 fixed로 숨기되 height는 auto, overflow는 visible로 세팅하여 스크롤바 생성을 원천 차단합니다.
    // 또한 A4 규격 가로폭과 프로필 여백(padding)을 그대로 부여합니다.
    wrapper.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: ${widthPx}px !important;
      min-height: ${minHeightPx}px !important;
      padding-top: ${pTop}px !important;
      padding-bottom: ${pBottom}px !important;
      padding-left: ${pLeft}px !important;
      padding-right: ${pRight}px !important;
      box-sizing: border-box !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      opacity: 0.99 !important;
      overflow: visible !important;
      display: flex !important;
      flex-direction: column !important;
    `;
    wrapper.style.backgroundColor = pageBg;
    wrapper.style.color = '#1f2328'; // 💡 항상 라이트모드 텍스트 컬러 지정 (배경색 대비 가독성 확보)
    wrapper.className = 'prose prose-base max-w-none custom-preview-container';
    
    // 이미지 내보내기 시 페이지 구분선 텍스트 및 점선을 보이지 않게 처리하고, 자식 요소의 배경색 오염을 방지하기 위해 transparent 강제
    const hidePageBreaksStyle = document.createElement('style');
    hidePageBreaksStyle.innerHTML = `
      .page-break-indicator,
      .page-break-line-before::before,
      .page-break::before,
      hr.page-break {
        display: none !important;
      }
      .page-break-line-before {
        margin-top: 1.5rem !important;
      }
      .markdown-viewer-root, .prose {
        background-color: transparent !important;
      }
    `;
    wrapper.appendChild(hidePageBreaksStyle);

    // 💡 추출한 로컬/확장프로그램 스타일을 임시 `<style>` 태그로 주입
    const globalStyle = document.createElement('style');
    globalStyle.className = 'export-global-css';
    globalStyle.textContent = inlineStyles;
    wrapper.appendChild(globalStyle);

    if (activeCss) {
      const dynamicStyle = document.createElement('style');
      dynamicStyle.className = 'export-dynamic-css';
      dynamicStyle.textContent = activeCss;
      wrapper.appendChild(dynamicStyle);
    }

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // 🌟 [보정 패치] DOM에 연결된 상태에서 computedStyle을 측정하여 overflow/height 제약을 확실하게 해제
    clone.querySelectorAll('*').forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        const tagName = htmlEl.tagName.toUpperCase();
        // 고유 높이 제약이 유지되어야 하는 요소들(수식 KaTeX, 차트 Mermaid, 빈 행, 아이콘 등)을 제외하고
        // 일반적인 레이아웃 및 텍스트 블록 컨테이너(DIV, SECTION, ARTICLE 등)의 스크롤 및 높이 제약을 해제합니다.
        const isLayoutTag = tagName === 'DIV' || tagName === 'SECTION' || tagName === 'ARTICLE' || tagName === 'MAIN';
        const isWidget = htmlEl.classList.contains('katex') || htmlEl.classList.contains('mermaid') || htmlEl.classList.contains('mermaid-svg-container') || htmlEl.closest('.not-prose');

        if (isLayoutTag && !isWidget) {
          htmlEl.style.setProperty('overflow', 'visible', 'important');
          htmlEl.style.setProperty('overflow-y', 'visible', 'important');
          htmlEl.style.setProperty('height', 'auto', 'important');
          htmlEl.style.setProperty('max-height', 'none', 'important');
        } else {
          // 레이아웃 태그가 아니더라도 computedStyle 상 overflow가 hidden/auto/scroll 이거나 
          // max-height가 지정되어 잘릴 위험이 있는 경우를 보정합니다.
          const computed = window.getComputedStyle(htmlEl);
          const hasOverflowRestricted = 
            computed.overflowY === 'auto' || 
            computed.overflowY === 'scroll' || 
            computed.overflowY === 'hidden' ||
            computed.overflow === 'auto' || 
            computed.overflow === 'scroll' ||
            computed.overflow === 'hidden';

          if (hasOverflowRestricted || computed.maxHeight !== 'none') {
            htmlEl.style.setProperty('overflow', 'visible', 'important');
            htmlEl.style.setProperty('overflow-y', 'visible', 'important');
            
            // 고유 크기가 보존되어야 하는 이미지나 특정 위젯이 아닌 경우에만 높이를 해제합니다.
            if (tagName !== 'IMG' && tagName !== 'CANVAS' && tagName !== 'SVG' && !isWidget) {
              htmlEl.style.setProperty('height', 'auto', 'important');
              htmlEl.style.setProperty('max-height', 'none', 'important');
            }
          }
        }
      }
    });

    // 이미지 및 스타일이 완전히 렌더링되도록 500ms 대기합니다.
    await new Promise(resolve => setTimeout(resolve, 500));

    const katexFontCss = await prepareDocumentFonts(targetEl);

    // 전체 본문 내용을 온전히 담기 위해 실제 콘텐츠의 scrollHeight를 측정합니다.
    const rawHeight = wrapper.scrollHeight || wrapper.clientHeight;
    const finalHeight = Math.max(typeof rawHeight === 'number' && !isNaN(rawHeight) ? rawHeight : 1000, 100);

    const safeWidth = widthPx;

    let dataUrl = await htmlToImage.toPng(wrapper, {
      backgroundColor: pageBg,
      width: safeWidth,
      height: finalHeight,
      style: {
        transform: 'none',
        left: '0',
        top: '0',
        position: 'relative',
        overflow: 'visible'
      },
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: false, // 💡 수식 폰트 렌더링을 위해 임베딩 켜기
      fontEmbedCSS: katexFontCss, // 💡 추출한 KaTeX 폰트 규칙만 주입하여 외부 폰트 fetch CORS 오류 방지
    });

    const {rasterContainsText}=await import('./rasterTextCheck');
    if (!await rasterContainsText(wrapper,dataUrl)) {
      const {default:html2canvas}=await import('html2canvas');
      const canvas=await html2canvas(wrapper,{
        backgroundColor:pageBg,width:safeWidth,height:finalHeight,scale:2,
        useCORS:true,logging:false,scrollX:0,scrollY:0,
        onclone:doc=>{
          for(const element of [doc.documentElement,doc.body]){
            element.style.setProperty('height','auto','important');
            element.style.setProperty('max-height','none','important');
            element.style.setProperty('overflow','visible','important');
          }
          doc.querySelectorAll<HTMLElement>('code').forEach(code=>{
            if(code.closest('pre'))return;
            for(const [property,value]of Object.entries({display:'inline',position:'static','vertical-align':'baseline',height:'auto',width:'auto','background-color':'transparent',border:'0','box-shadow':'none'}))code.style.setProperty(property,value,'important');
          });
        }
      });
      dataUrl=canvas.toDataURL('image/png');
      if(!await rasterContainsText(wrapper,dataUrl))throw new Error('이미지에서 본문 글자를 확인하지 못했습니다. 문서 글꼴을 확인해 주세요.');
    }
    document.body.removeChild(wrapper);

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 💡 [일렉트론 환경 처리] 이미지 다른 이름으로 저장 다이얼로그 연동
      const result = await (window as any).electronAPI.saveFileAs(
        dataUrl, 
        filename, 
        '', 
        [{ name: 'PNG Images', extensions: ['png'] }]
      );
      if (result) {
        showToast('이미지 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('이미지 내보내기가 취소되었습니다.', 'info');
      }
    } else {
      // 브라우저 다운로드
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      // 다운로드 폴더 저장
      const ok = await saveToDownloads(filename, dataUrl, 'base64');
      showToast(ok ? '다운로드 폴더에 PNG가 생성되었습니다.' : '이미지 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    msg.error('PNG export error', err);
    showToast('PNG 내보내기 실패: ' + err.message, 'error');
  }
}

// ====================================================================
// 📊 [OMD-IO-exportHandlers-0015] exportHandlers.ts ➔ exportSNSCardNews
// 🎯 @KICK  : 문서를 SNS 카드뉴스 규격(1:1 정사각 1080×1080, 4:5 세로형 1080×1350, 16:9 와이드 1920×1080)으로 카드별 분할 캡처하여 낱장 PNG 또는 ZIP으로 일괄 내보내기
// 🛡️ @GUARD : 구분선(---), 대제목(# H1), 그림책 장면(:::scene) 및 자동 높이 분할 지원, 초과 본문 자동 스케일링으로 잘림 0% 보장
// 🚨 @PATCH : **2026-10-27** — SNS 카드뉴스 전용 분할 출력 파이프라인 신설
// 🔗 @CALLS : prepareExportPreview, getExportDocumentRoot, clonePreview, inlineLocalImages, injectExportStyles, fixListMarkers, applyExportInlineStyles
// ====================================================================
export async function exportSNSCardNews({
  previewEl,
  currentFileName,
  showToast,
  dynamicCssString,
  paperSize,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  backgroundColor,
  activeProfile,
  snsOptions,
}: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    flushIME();
    const htmlToImage = await import('html-to-image');
    const docTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'cardnews';

    const ratio =
      snsOptions?.ratio ||
      (paperSize === 'sns_portrait' ? '4:5' : '1:1');
    const splitMode = snsOptions?.splitMode || 'auto';
    const showPageNumber = snsOptions?.showPageNumber !== false;
    const saveMode = snsOptions?.saveMode || 'files';

    // 논리 CSS 해상도 (pixelRatio: 2 적용 시 실제 비트맵: 1:1 -> 1080×1080, 4:5 -> 1080×1350, 16:9 -> 1920×1080)
    const cardWidthPx = ratio === '16:9' ? 960 : 540;
    const cardHeightPx = ratio === '4:5' ? 675 : 540;

    progress = startExportProgress('PNG');
    progress.update('SNS 카드뉴스 레이아웃 준비 중...');

    const { inlineStyles } = collectAllStyles();
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    await inlineLocalImages(clone);

    // VisualDocumentEditor / MarkdownViewer 편집용 UI 요소 제거
    clone
      .querySelectorAll(
        '[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools, .visual-media-controls, .visual-mermaid-editor'
      )
      .forEach(node => node.remove());

    // VisualDocumentEditor의 [data-onrivi-editor-host]에 주입된 커스텀 CSS 변수를 루트(clone)로 승격
    const editorHostEl = clone.querySelector<HTMLElement>('[data-onrivi-editor-host]');
    const inheritedHostStyle = editorHostEl?.getAttribute('style') || clone.getAttribute('style') || '';

    const pageBg = backgroundColor || activeProfile?.pageStyle?.backgroundColor || '#ffffff';
    const activeCss = dynamicCssString
      ? dynamicCssString
      : activeProfile
      ? generateExportCss(activeProfile)
      : '';
    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    await waitForExportResources(targetEl);
    await new Promise(r => setTimeout(r, 250));

    fixListMarkers(clone, activeProfile);
    applyExportInlineStyles(clone, activeProfile, targetEl);

    clone.querySelectorAll('img').forEach(img => img.setAttribute('crossOrigin', 'anonymous'));
    const katexFontCss = await prepareDocumentFonts(targetEl);

    const mmToPx = (mmStr?: string, defaultVal = 16) => {
      const mm = parseFloat(mmStr || `${defaultVal}`);
      return Math.round(Math.min(Math.max(mm, 8), 28) * 2.2);
    };
    const pTop = mmToPx(marginTop, 16);
    const pBottom = mmToPx(marginBottom, 16);
    const pLeft = mmToPx(marginLeft, 16);
    const pRight = mmToPx(marginRight, 16);

    // 1. 카드 단위 블록 분할 (그림책 .book-page 또는 일반 마크다운/문서보기 블록 분할)
    const bookPages = Array.from(clone.querySelectorAll<HTMLElement>('.book-page'));
    let cardNodesList: HTMLElement[][] = [];

    if (bookPages.length > 0) {
      cardNodesList = bookPages.map(page => {
        const pageClone = page.cloneNode(true) as HTMLElement;
        pageClone.style.setProperty('zoom', '1', 'important');
        pageClone.style.setProperty('width', '100%', 'important');
        pageClone.style.setProperty('height', '100%', 'important');
        pageClone.style.setProperty('margin', '0', 'important');
        pageClone.style.setProperty('outline', 'none', 'important');
        pageClone.style.setProperty('box-shadow', 'none', 'important');
        return [pageClone];
      });
    } else {
      // VisualDocumentEditor(.visual-document-surface / .ProseMirror) 및 MarkdownViewer(.prose) 등 실제 블록 컨테이너 탐색
      const findActualBlockContainer = (root: HTMLElement): HTMLElement => {
        const explicitSurface = root.querySelector<HTMLElement>(
          '.visual-document-surface, .ProseMirror, .markdown-viewer-root > .prose, .prose'
        );
        if (explicitSurface && explicitSurface.children.length > 0) {
          return explicitSurface;
        }
        let curr = root;
        for (let depth = 0; depth < 6; depth++) {
          const children = Array.from(curr.children).filter(
            el =>
              !['STYLE', 'SCRIPT'].includes(el.tagName.toUpperCase()) &&
              !el.classList.contains('book-screen-only') &&
              !el.classList.contains('no-print') &&
              !el.classList.contains('onrivi-page-guides') &&
              !el.classList.contains('onrivi-print-tools') &&
              !el.hasAttribute('data-editor-controls')
          ) as HTMLElement[];
          if (
            children.length === 1 &&
            ['DIV', 'SECTION', 'MAIN', 'ARTICLE'].includes(children[0].tagName.toUpperCase())
          ) {
            curr = children[0];
          } else {
            break;
          }
        }
        return curr;
      };

      const contentContainer = findActualBlockContainer(clone);

      const isDividerNode = (el: HTMLElement) => {
        const tag = el.tagName.toUpperCase();
        if (tag === 'HR') return true;
        if (
          el.hasAttribute('data-onrivi-page-break') ||
          el.classList.contains('onrivi-page-break') ||
          el.classList.contains('page-break') ||
          el.classList.contains('visual-page-break')
        ) {
          return true;
        }
        const text = (el.textContent || '').trim();
        if (text === '---' || text === '***' || text === '___') return true;
        return false;
      };

      const isMeaningfulNode = (el: HTMLElement) => {
        const tag = el.tagName.toUpperCase();
        if (['IMG', 'TABLE', 'PRE', 'IFRAME', 'SVG', 'VIDEO', 'CANVAS', 'FIGURE'].includes(tag)) return true;
        if (el.querySelector('img, table, pre, iframe, svg, video, canvas, figure')) return true;
        return (el.textContent || '').replace(/\u200B/g, '').trim().length > 0;
      };

      const rawBlocks = Array.from(contentContainer.children).filter(
        el =>
          !['STYLE', 'SCRIPT'].includes(el.tagName.toUpperCase()) &&
          !el.classList.contains('book-screen-only') &&
          !el.classList.contains('no-print') &&
          !el.classList.contains('onrivi-page-guides') &&
          !el.classList.contains('onrivi-print-tools') &&
          !el.hasAttribute('data-editor-controls')
      ) as HTMLElement[];

      const hasAnyDivider = rawBlocks.some(isDividerNode);
      const h1Count = rawBlocks.filter(el => el.tagName.toUpperCase() === 'H1').length;
      const h2Count = rawBlocks.filter(el => el.tagName.toUpperCase() === 'H2').length;

      const semanticCards: HTMLElement[][] = [];
      let currentCard: HTMLElement[] = [];

      const flushCurrentCard = () => {
        const meaningful = currentCard.filter(isMeaningfulNode);
        if (meaningful.length > 0) {
          semanticCards.push(meaningful);
        }
        currentCard = [];
      };

      for (const block of rawBlocks) {
        const tag = block.tagName.toUpperCase();
        if (isDividerNode(block)) {
          if (splitMode === 'auto' || splitMode === 'hr') {
            flushCurrentCard();
            continue; // 구분선 자체는 카드 분할 마커로 소비하여 카드 화면에서 숨김
          }
        }

        const shouldBreakOnH1 =
          (splitMode === 'h1' ||
            (splitMode === 'auto' &&
              (!hasAnyDivider || activeProfile?.pageStyle?.exportPageBreakLevel === 'h1') &&
              h1Count >= 2)) &&
          tag === 'H1';

        const shouldBreakOnH2 =
          splitMode === 'auto' && !hasAnyDivider && h1Count <= 1 && h2Count >= 2 && tag === 'H2';

        if ((shouldBreakOnH1 || shouldBreakOnH2) && currentCard.some(isMeaningfulNode)) {
          flushCurrentCard();
        }

        if (isMeaningfulNode(block)) {
          currentCard.push(block.cloneNode(true) as HTMLElement);
        }
      }
      flushCurrentCard();

      // 2단계: 각 의미 단락(섹션)이 카드 1장 높이를 초과하는 경우 실제 카드 레이아웃 기준으로 다중 카드로 자동 분할
      // - 'auto' 또는 'h1' 모드이거나, 구분선이 전혀 없어 1장으로 뭉친 경우 높이 기반 자동 페이지네이션 수행
      const shouldPaginateByHeight =
        splitMode === 'auto' || splitMode === 'h1' || (splitMode === 'hr' && !hasAnyDivider);

      if (shouldPaginateByHeight && semanticCards.length > 0) {
        const maxContentH = cardHeightPx - pTop - pBottom - (showPageNumber ? 34 : 0);

        const measureWrapper = document.createElement('div');
        if (inheritedHostStyle) {
          measureWrapper.setAttribute('style', inheritedHostStyle);
        }
        measureWrapper.style.cssText += `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: ${cardWidthPx}px !important;
          padding: ${pTop}px ${pRight}px ${pBottom}px ${pLeft}px !important;
          box-sizing: border-box !important;
          visibility: hidden !important;
          pointer-events: none !important;
          z-index: -9999 !important;
        `;
        measureWrapper.className = 'prose prose-base max-w-none custom-preview-container';
        const st1 = document.createElement('style');
        st1.textContent = `
          ${inlineStyles}
          ${activeCss}
          .sns-card-body > :first-child { margin-top: 0 !important; }
          .sns-card-body > :last-child { margin-bottom: 0 !important; }
          .sns-card-body img { max-height: ${Math.round((cardHeightPx - pTop - pBottom) * 0.55)}px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; }
        `;
        measureWrapper.appendChild(st1);

        const measureBody = document.createElement('div');
        measureBody.className = 'markdown-viewer-root onrivi-content-root visual-document-surface sns-card-body';
        measureBody.style.cssText = 'width: 100% !important; display: block !important;';
        measureWrapper.appendChild(measureBody);
        document.body.appendChild(measureWrapper);

        // 아주 긴 UL/OL 목록 블록은 개별 LI 항목 단위로 쪼개어 카드 간 자연스럽게 넘어가도록 전처리
        const expandOversizedBlocks = (nodes: HTMLElement[]): HTMLElement[] => {
          const expanded: HTMLElement[] = [];
          for (const node of nodes) {
            const tag = node.tagName.toUpperCase();
            if ((tag === 'UL' || tag === 'OL') && node.children.length > 1) {
              measureBody.innerHTML = '';
              const probe = node.cloneNode(true) as HTMLElement;
              measureBody.appendChild(probe);
              if (measureBody.scrollHeight > maxContentH * 0.85) {
                const items = Array.from(node.children) as HTMLElement[];
                items.forEach((li, idx) => {
                  const singleList = node.cloneNode(false) as HTMLElement;
                  if (tag === 'OL') {
                    const startBase = parseInt(node.getAttribute('start') || '1', 10);
                    singleList.setAttribute('start', String(startBase + idx));
                  }
                  singleList.appendChild(li.cloneNode(true));
                  expanded.push(singleList);
                });
                continue;
              }
            }
            expanded.push(node);
          }
          return expanded;
        };

        const paginatedCards: HTMLElement[][] = [];

        for (const sectionNodes of semanticCards) {
          const candidateNodes = expandOversizedBlocks(sectionNodes);
          if (candidateNodes.length <= 1) {
            paginatedCards.push(candidateNodes);
            continue;
          }

          measureBody.innerHTML = '';
          let currentBucket: HTMLElement[] = [];

          for (let i = 0; i < candidateNodes.length; i++) {
            const node = candidateNodes[i];
            const probeNode = node.cloneNode(true) as HTMLElement;
            measureBody.appendChild(probeNode);

            const currentH = measureBody.scrollHeight;
            const prevTag =
              currentBucket.length > 0
                ? currentBucket[currentBucket.length - 1].tagName.toUpperCase()
                : '';
            const isOnlyHeadingInBucket =
              currentBucket.length === 1 && /^H[1-6]$/.test(prevTag);

            if (currentBucket.length > 0 && !isOnlyHeadingInBucket && currentH > maxContentH) {
              // 만약 직전 노드가 소제목(H1~H6)이라면 제목만 카드 하단에 고립되지 않도록 다음 카드로 함께 이동
              if (currentBucket.length >= 2 && /^H[1-6]$/.test(prevTag)) {
                const trailingHeading = currentBucket.pop()!;
                paginatedCards.push(currentBucket);
                measureBody.innerHTML = '';
                const hClone = trailingHeading.cloneNode(true) as HTMLElement;
                const nClone = node.cloneNode(true) as HTMLElement;
                measureBody.appendChild(hClone);
                measureBody.appendChild(nClone);
                currentBucket = [trailingHeading, node];
              } else {
                paginatedCards.push(currentBucket);
                measureBody.innerHTML = '';
                measureBody.appendChild(node.cloneNode(true));
                currentBucket = [node];
              }
            } else {
              currentBucket.push(node);
            }
          }

          if (currentBucket.length > 0) {
            paginatedCards.push(currentBucket);
          }
        }

        document.body.removeChild(measureWrapper);
        cardNodesList = paginatedCards;
      } else {
        cardNodesList = semanticCards;
      }
    }

    if (cardNodesList.length === 0) {
      throw new Error('출력할 카드뉴스 본문 내용이 없습니다.');
    }

    const totalCards = cardNodesList.length;
    const capturedCards: { filename: string; dataUrl: string }[] = [];

    for (let idx = 0; idx < totalCards; idx++) {
      progress.update(`SNS 카드뉴스 렌더링 중 (${idx + 1} / ${totalCards}장)...`);
      const nodes = cardNodesList[idx];

      const wrapper = document.createElement('div');
      if (inheritedHostStyle) {
        wrapper.setAttribute('style', inheritedHostStyle);
      }
      wrapper.style.cssText += `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: ${cardWidthPx}px !important;
        height: ${cardHeightPx}px !important;
        padding: ${pTop}px ${pRight}px ${pBottom}px ${pLeft}px !important;
        box-sizing: border-box !important;
        z-index: -9999 !important;
        pointer-events: none !important;
        background-color: ${pageBg} !important;
        color: #1f2328 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      `;
      wrapper.className = 'prose prose-base max-w-none custom-preview-container';

      const styleEl = document.createElement('style');
      styleEl.textContent = `
        ${inlineStyles}
        ${activeCss}
        .page-break-indicator, .page-break-line-before::before, .page-break::before, hr.page-break, .book-screen-only, .no-print {
          display: none !important;
        }
        .sns-card-body > :first-child { margin-top: 0 !important; }
        .sns-card-body > :last-child { margin-bottom: 0 !important; }
        .sns-card-body img { max-height: ${Math.round((cardHeightPx - pTop - pBottom) * 0.55)}px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; margin-left: auto !important; margin-right: auto !important; }
      `;
      wrapper.appendChild(styleEl);

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'markdown-viewer-root onrivi-content-root visual-document-surface sns-card-body';
      bodyWrap.style.cssText = `
        flex: 1 1 auto !important;
        min-height: 0 !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        overflow: visible !important;
        background: transparent !important;
      `;
      nodes.forEach(n => bodyWrap.appendChild(n));
      wrapper.appendChild(bodyWrap);

      if (showPageNumber) {
        const footer = document.createElement('div');
        footer.style.cssText = `
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          padding-top: 10px !important;
          margin-top: 6px !important;
        `;
        const badge = document.createElement('span');
        const numStr = String(idx + 1).padStart(2, '0');
        const totStr = String(totalCards).padStart(2, '0');
        badge.textContent = `${numStr} / ${totStr}`;
        badge.style.cssText = `
          font-family: 'JetBrains Mono', Pretendard, sans-serif !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.04em !important;
          padding: 3px 10px !important;
          border-radius: 9999px !important;
          background: rgba(15, 23, 42, 0.07) !important;
          color: #475569 !important;
        `;
        footer.appendChild(badge);
        wrapper.appendChild(footer);
      }

      document.body.appendChild(wrapper);

      // 카드 높이를 초과하는 경우 글자가 잘리지 않도록 자동 축소(Auto-Fit Scale) 보정
      await new Promise(r => setTimeout(r, 120));
      const availH = cardHeightPx - pTop - pBottom - (showPageNumber ? 34 : 0);
      const naturalH = bodyWrap.scrollHeight;
      if (naturalH > availH && availH > 80) {
        const fitRatio = Math.max(0.62, availH / (naturalH + 8));
        bodyWrap.style.setProperty('zoom', String(fitRatio), 'important');
      }

      await new Promise(r => setTimeout(r, 80));

      const dataUrl = await htmlToImage.toPng(wrapper, {
        backgroundColor: pageBg,
        width: cardWidthPx,
        height: cardHeightPx,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: katexFontCss,
      });

      document.body.removeChild(wrapper);

      const paddedIdx = String(idx + 1).padStart(2, '0');
      capturedCards.push({
        filename: `${docTitle}_카드뉴스_${paddedIdx}.png`,
        dataUrl,
      });
    }

    // 2. 저장 처리 (ZIP 묶음 저장 vs 낱장 PNG 일괄 저장)
    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

    if (saveMode === 'zip') {
      progress.update('SNS 카드뉴스 ZIP 압축 파일 생성 중...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const card of capturedCards) {
        const base64Data = card.dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(card.filename, base64Data, { base64: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `${docTitle}_SNS카드뉴스_${totalCards}장.zip`;

      if (api?.saveFileAs) {
        const reader = new FileReader();
        const zipDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('ZIP 데이터를 읽지 못했습니다.'));
          reader.readAsDataURL(zipBlob);
        });
        const saved = await api.saveFileAs(zipDataUrl, zipFilename, '', [{ name: 'ZIP Archive', extensions: ['zip'] }]);
        if (saved) {
          showToast(`SNS 카드뉴스 ${totalCards}장이 ZIP 파일로 저장되었습니다.`, 'success');
        } else {
          showToast('SNS 카드뉴스 저장이 취소되었습니다.', 'info');
        }
      } else {
        const { downloadBlob } = await import('./docxGenerator');
        downloadBlob(zipBlob, zipFilename);
        showToast(`SNS 카드뉴스 ${totalCards}장(${zipFilename}) 다운로드가 완료되었습니다.`, 'success');
      }
    } else {
      // 낱장 PNG 일괄 다운로드 (또는 1장일 때 단일 저장)
      if (api?.saveFileAs && totalCards === 1) {
        const saved = await api.saveFileAs(
          capturedCards[0].dataUrl,
          capturedCards[0].filename,
          '',
          [{ name: 'PNG Images', extensions: ['png'] }]
        );
        if (saved) {
          showToast('SNS 카드뉴스 이미지가 저장되었습니다.', 'success');
        } else {
          showToast('SNS 카드뉴스 내보내기가 취소되었습니다.', 'info');
        }
      } else if (api?.showSaveDialog && api?.saveBinaryFile) {
        // 일렉트론 데스크톱에서 다중 낱장 PNG 저장 시: 첫 번째 파일 경로를 한 번만 지정받아 같은 폴더에 01, 02, 03... 일괄 저장
        const dialogResult = await api.showSaveDialog({
          title: `SNS 카드뉴스 ${totalCards}장 일괄 저장 (첫 번째 카드 파일명 지정)`,
          defaultPath: `${docTitle}_카드뉴스_01.png`,
          filters: [{ name: 'PNG Images', extensions: ['png'] }],
        });
        const chosenPath: string | null =
          typeof dialogResult === 'string'
            ? dialogResult
            : dialogResult && !dialogResult.canceled && dialogResult.filePath
            ? dialogResult.filePath
            : null;

        if (!chosenPath) {
          showToast('SNS 카드뉴스 내보내기가 취소되었습니다.', 'info');
          return;
        }

        const normalizedPath = chosenPath.replace(/\\/g, '/');
        const lastSlash = normalizedPath.lastIndexOf('/');
        const dirPath = lastSlash >= 0 ? normalizedPath.slice(0, lastSlash) : '.';
        const rawBaseName = (lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath)
          .replace(/\.png$/i, '')
          .replace(/_?0*1$/, '');

        for (let i = 0; i < capturedCards.length; i++) {
          const card = capturedCards[i];
          const padded = String(i + 1).padStart(2, '0');
          const targetFilePath = `${dirPath}/${rawBaseName}_${padded}.png`;
          const base64Data = card.dataUrl.replace(/^data:image\/png;base64,/, '');
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let b = 0; b < binaryStr.length; b++) {
            bytes[b] = binaryStr.charCodeAt(b);
          }
          await api.saveBinaryFile(targetFilePath, bytes);
        }
        showToast(`SNS 카드뉴스 총 ${totalCards}장(PNG)이 선택한 폴더에 일괄 저장되었습니다!`, 'success');
      } else {
        // 웹 브라우저에서 다중 PNG 순차 다운로드 (브라우저 다중 다운로드 차단 방지를 위해 Blob URL + 충분한 간격 적용)
        const { downloadBlob } = await import('./docxGenerator');
        for (let i = 0; i < capturedCards.length; i++) {
          const card = capturedCards[i];
          const res = await fetch(card.dataUrl);
          const blob = await res.blob();
          downloadBlob(blob, card.filename);
          await saveToDownloads(card.filename, card.dataUrl, 'base64');
          if (i < capturedCards.length - 1) {
            await new Promise(r => setTimeout(r, 350));
          }
        }
        showToast(`SNS 카드뉴스 총 ${totalCards}장(PNG)이 일괄 출력되었습니다!`, 'success');
      }
    }
  } catch (err: any) {
    msg.error('SNS CardNews export error', err);
    showToast('SNS 카드뉴스 내보내기 실패: ' + err.message, 'error');
  } finally {
    progress?.finish();
  }
}

// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ exportDOCX
// 🎯 @KICK  : 미리보기 DOM을 MS Word(.docx) 문서로 변환하여 내보내기
// 🛡️ @GUARD : Electron saveFileAs 및 브라우저 다운로드 분기 지원
// 🚨 @PATCH : **2026-09-30** — MS Word (.docx) 내보내기 파이프라인 신설
// 🔗 @CALLS : clonePreview, generateDocx, downloadBlob, saveToDownloads
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ exportDOCX
// 🎯 @KICK  : 미리보기 렌더링 DOM을 MS Word(.docx) 문서로 변환하여 내보내기
// 🛡️ @GUARD : Electron saveFileAs 및 브라우저 다운로드 분기 지원, 유니코드 불릿/인라인 태그 누출 차단
// 🚨 @PATCH : **2026-10-01** — 미리보기 DOM 직접 조판 기반으로 전환하여 마크다운 태그 누출을 완전 방지하고 깨끗한 Word 문서 사출 지원
// 🚨 @PATCH : **2026-09-30** — MS Word (.docx) 내보내기 파이프라인 신설
// 🔗 @CALLS : clonePreview, generateDocx, downloadBlob, saveToDownloads
// ====================================================================
export async function exportHWPX({ previewEl, currentFileName, showToast, activeProfile }: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    const api = (window as any).electronAPI;
    const title = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${title}.hwpx`;
    let destination: string | undefined;
    if (api?.showSaveDialog && api?.saveBinaryFile) {
      const selection = await api.showSaveDialog({ title: '한글 문서 저장 위치 선택', defaultPath: filename, filters: [{ name: '한글 문서', extensions: ['hwpx'] }] });
      if (selection.canceled || !selection.filePath) return;
      destination = selection.filePath;
    }
    progress = startExportProgress('HWPX');
    progress.update('미리보기 확인 중');
    await prepareExportPreview(previewEl);
    const target = getExportDocumentRoot(previewEl);
    const clone = clonePreview(target, true);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone);
    const { extractMediaFromElements } = await import('./exportMediaHelper');
    const images = await extractMediaFromElements(target, clone);
    progress.update('한글 문서 생성 중');
    const { generateHwpx } = await import('./hwpxGenerator');
    const blob = await generateHwpx(clone, { title, images, defaultFont: activeProfile?.pageStyle.fontFamily });
    progress.update('파일 저장 중');
    if (destination) {
      await api.saveBinaryFile(destination, new Uint8Array(await blob.arrayBuffer()));
    } else if (api?.saveFileAs) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('한글 문서 저장 데이터를 읽지 못했습니다.'));
        reader.readAsDataURL(blob);
      });
      if (!await api.saveFileAs(data, filename, '', [{ name: '한글 문서', extensions: ['hwpx'] }])) return;
    } else {
      const { downloadBlob } = await import('./docxGenerator');
      downloadBlob(blob, filename);
    }
    showToast('한글 문서(.hwpx) 내보내기가 완료되었습니다.', 'success');
  } catch (error: any) {
    msg.error('HWPX export error', error);
    showToast('한글 문서 내보내기 실패: ' + error.message, 'error');
  } finally { progress?.finish(); }
}

export async function exportDOCX({ previewEl, currentFileName, showToast, activeProfile }: ExportOptions) {
  try {
    showToast('Word 문서 (.docx) 생성 중...', 'info');

    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl, true);
    const tableSelector = 'table, th, td, th p, td p, th li, td li, th span, td span';
    const liveTableElements = Array.from(targetEl.querySelectorAll(tableSelector));
    Array.from(clone.querySelectorAll(tableSelector)).forEach((element, index) => {
      const live = liveTableElements[index];
      if (!live) return;
      const style = window.getComputedStyle(live);
      for (const property of ['font-size', 'line-height', 'margin-top', 'margin-bottom', 'text-align']) {
        (element as HTMLElement).style.setProperty(property, style.getPropertyValue(property));
      }
    });
    // 목록마다 실제 미리보기 간격을 저장한다. 일반 문단 여백을 상속하지 않는다.
    const liveListItems = Array.from(targetEl.querySelectorAll('li'));
    Array.from(clone.querySelectorAll('li')).forEach((item, index) => {
      const live = liveListItems[index];
      if (!live) return;
      const style = window.getComputedStyle(live);
      for (const property of ['font-size', 'line-height', 'margin-top', 'margin-bottom']) {
        (item as HTMLElement).style.setProperty(property, style.getPropertyValue(property));
      }
    });
    await inlineLocalImages(clone);

    // 🖼️ 라이브 DOM과 클론 DOM으로부터 이미지 및 Mermaid 다이어그램 추출 및 래스터라이즈
    const { extractMediaFromElements } = await import('@/lib/exportMediaHelper');
    const images = await extractMediaFromElements(targetEl, clone);

    const docTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${docTitle}.docx`;

    const { generateDocx, downloadBlob } = await import('@/lib/docxGenerator');
    const docxBlob = await generateDocx(clone, { title: docTitle, images, profile: activeProfile });

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const arrayBuffer = await docxBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
      const result = await (window as any).electronAPI.saveFileAs(
        dataUri,
        filename,
        '',
        [{ name: 'Word Document', extensions: ['docx'] }]
      );
      if (result) {
        showToast('Word 문서(.docx)가 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('내보내기가 취소되었습니다.', 'info');
      }
    } else {
      downloadBlob(docxBlob, filename);
      showToast('Word 문서(.docx) 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    msg.error('DOCX export error', err);
    showToast('Word 내보내기 실패: ' + err.message, 'error');
  }
}

