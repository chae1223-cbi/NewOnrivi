// 🚨 @PATCH : **2026-11-04** — [Rule 3 5순위: MarkdownViewer 대형 뷰어 모듈화 분리]:
//             1) 4,032줄의 거대 MarkdownViewer.tsx에서 5대 핵심 렌더링 서브 컴포넌트(TableWrapper, MathBlock, MermaidBlock, CodeBlock, AsyncMedia)를 frontend/src/components/viewer/로 전면 분리
//             2) Mermaid SVG 변환/캐싱(570줄), 비동기 미디어 로더(490줄), 코드블록 AST 라인분할(270줄), 표 복사 래퍼(90줄), KaTeX 수식 블록(50줄) 분리로 소스 1,400줄 이상 슬림화 달성
//             3) Next.js 정적 빌드 및 tsc --noEmit 무결점 통과
import {
  TableWrapper,
  MathBlock,
  MermaidBlock,
  CodeBlock,
  splitChildrenIntoLines,
  partitionAndNormalizeCodeBlocks,
  extractDataLine,
  AsyncImage,
  AsyncVideo,
  useResourceMediaRevision,
  resolveFileHandleInDirectory,
} from '@/components/viewer';
// 🚨 @PATCH : 2026-11-03 — [ESLint 경고 해소] components useMemo 의존성 배열에 processedContent 누락 의존성 추가
// 🚨 @PATCH : 2026-11-03 — [표 열 비율 수동 지정] 기본 균등 분할과 문서 저장 비율을 미리보기에 적용
// 🚨 @PATCH : 2026-11-02 — [표 열 너비 자동 조정] 마크다운 표를 내용 기반 너비로 배분
// 🚨 @PATCH : **2026-11-01** — [표 셀 줄바꿈 파괴 및 긴 코드 경로로 인한 가로 늘어짐 방지]:
//             1) .table-wrapper-area :is(th, td)에 overflow-wrap: anywhere 및 word-break: break-word, box-sizing: border-box 적용
//             2) :is(th, td) code에 white-space: pre-wrap, overflow-wrap: anywhere, word-break: break-all을 적용하여 긴 파일 경로가 표를 찢지 않고 셀 안에서 안전하게 줄바꿈되도록 조판 완성
import { resolveDocumentLink, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';
import { hasHeadingNumber, headingNodeText } from '@/lib/headingNumbering';
import { rehypeBibliography } from '@/lib/bibliography';
import BibliographySummary from '@/components/BibliographySummary';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { remarkCodeBlockMetadata } from '../lib/codeBlockMetadata';
import { remarkKoreanStrong } from '@/lib/remarkKoreanStrong';
import { remarkQuoteIndent } from '@/lib/remarkQuoteIndent';
import { remarkPageBreak } from '@/lib/remarkPageBreak';
import { bulletNumbersAsText } from '@/lib/bulletNumberText';
import PicturebookPreview from './PicturebookPreview';
import { getResourceSettings, requireResourceSettings } from '@/lib/resourceSettings';
import { exportContentFingerprint } from '@/lib/exportPreparation';
import katex from 'katex';
// 🚨 @PATCH : **2026-10-26** — [ESLint React Hook exhaustive-deps 의존성 경고 해소]:
//             1) useMemo 의존성 배열에서 부모 객체(mediaCaptionStructure)와 중복되는 하위 속성(position, kindOverrides.image.position) 의존성 정리
// 🚨 @PATCH : **2026-10-26** — [확장 리스트(Loose List) 내부 .onrivi-line 인라인 일원화]:
//             1) .onrivi-content-root li p .onrivi-line에 display: inline !important 및 width: auto를 지정하여 Loose List(빈 줄 포함 목록)에서도 Tight List(쇼케이스)와 100% 동일하게 불릿/숫자 마커와 글자 간격이 밀착되도록 결함 해결
// 🚨 @PATCH : **2026-10-26** — [목록 마커-글자 간격(--li-marker-gap) 연동 및 li 패딩 인라인 시작점 분리]:
//             1) .onrivi-content-root li의 hardcoded padding: 1px 0 !important를 상하 1px, 좌측/시작점 var(--li-marker-gap, 0px) !important로 분리하여 마커-글자 간격 슬라이더 조절 즉각 반영
//             2) 루트 스타일 객체에 --li-marker-gap 및 --li-margin-bottom CSS 변수를 연동 주입
// 🚨 @PATCH : **2026-10-26** — [동영상·지도 캡션 이미지 규격 일원화(중앙 정렬 및 0.88em 글자 크기)]:
//             1) 비디오 링크 렌더러의 figcaption 글자 크기를 0.88em 및 text-center로 일치화하여 이미지 figcaption과 100% 동일한 조판 규격 완성
// 🚨 @PATCH : **2026-10-26** — [미디어 설명(캡션) 위치 및 포맷 구조체 전체 반응성 연동]:
//             1) ReactMarkdown components의 useMemo 의존성 배열에 picturebookProfile?.mediaCaptionStructure를 연결하여 캡션 위치(상단/하단) 및 포맷 변경 시 실시간 재렌더링 보장
// 🚨 @PATCH : **2026-10-26** — [onrivi/ 경로 비디오 웹 서빙 정규화]:
//             video 태그 src가 onrivi/로 시작할 때 /onrivi/로 자동 보정하여 정적 퍼블릭 서빙 보장
// 🚨 @PATCH : **2026-10-25** — [미리보기 목록 전체 들여쓰기(data-onrivi-list-indent) 서식 연동]:
//             1) ul 및 ol 컴포넌트에 data-onrivi-list-indent 값을 파싱하여 marginLeft 인라인 서식으로 1:1 바인딩
// 🚨 @PATCH : **2026-10-24** — [도움말 문서 링크(../../ 및 파일명) 작업장 내부 경로 안전 해석 연동]:
//             1) isPathInsideWorkspace에서 resolveWorkspaceHelpLink를 적용하여 도움말 간 상대경로(../../00_시작하기.md 등)를 현재 도움말 디렉토리 내부 경로로 정확히 보정하여 연결 보장
// 🚨 @PATCH : **2026-10-23** — [빈 문서 링크 표시 및 경로 검증]: [] 문서 링크에 확장자 없는 파일명을 표시하고 정규화된 작업장 경계로 경로 순회를 차단
// 🚨 @PATCH : **2026-10-20** — [PDF 인쇄 시 화면 페이지 나누기 1:1 완벽 일치 및 파싱 정밀화]:
//             1) cleanContent에서 마크다운 주석(<!-- onrivi:page-break -->) 및 LaTeX(\\pagebreak)를 data-onrivi-page-break 블록으로 선행 표준화
//             2) rehypeBrRaw에서 페이지 나누기 노드 생성 시 data-onrivi-page-break='true' 속성을 온전히 보존하여 PagedJS/인쇄 엔진 수집 100% 보장
// 🚨 @PATCH : **2026-10-17** — [목록 항목 간 줄 여백(margin-bottom) 및 들여쓰기 너비(var(--list-indent)) 서식 프로필 1:1 반영]:
//             1) .onrivi-content-root ul/ol의 hardcoded padding-left: 1.5em !important를 var(--list-indent, 1.5em)으로 변경하여 서식 프로필의 들여쓰기 설정이 즉각 적용되도록 개선
//             2) .onrivi-content-root li의 hardcoded margin: 0 !important를 해제하고 margin-bottom: var(--li-margin-bottom, 6px) 및 dynamicCssString 연동을 허용하여 목록 및 체크박스 줄 여백이 정상 작동하도록 조치
// 🚨 @PATCH : **2026-10-26** — [문서 하위 폴더 이미지(images/... 등) 상대경로 정상 해석 및 리소스 폴더 오탐 404 방어]:
//             1) isLocalMedia 판별 시 서브디렉토리가 포함된 경로(images/... 등)는 리소스 폴더(media/)로 강제 납치하지 않고 현재 문서(currentFilePath) 기준 상대경로로 정밀 풀이되도록 보정
//             2) 문서 로컬 이미지들이 D:\Onrivi_Asset\images\... 로 오탐되어 404 Not Found가 발생하던 결함 완벽 해결
// 🚨 @PATCH : **2026-10-25** — [이미지와 캡션 간격 초밀착(4px) 정돈]:
//             1) 상단 캡션(mb-1, 4px) 및 하단 캡션(mt-1, 4px) 여백을 축소하여 이미지와 설명 텍스트가 시원하고 정갈하게 밀착되도록 개선
// 🚨 @PATCH : **2026-10-25** — [이미지 상단 stray bracket/backslash("\[") 유령 캡션 노출 방어 및 캡션 서식 자연화]:
//             1) alt가 괄호/역슬래시 단독 찌꺼기(/^[\\\[\]\s]+$/)인 경우 figcaption 렌더링을 차단하여 빈 캡션 이미지 상단에 유령 기호("\\[")가 노출되는 결함 원천 해결
//             2) 실제 캡션 텍스트 내의 불필요한 이스케이프 역슬래시(\[, \])를 자연스러운 괄호 문자([, ])로 표시되도록 자동 정제
// 🚨 @PATCH : **2026-10-24** — [이미지 URL 쿼리(caption=top|bottom) 기반 캡션 위치 개별 지정 및 CSS 강제 순서 보정]:
//             1) 이미지 src 쿼리스트링에서 caption=top|bottom을 파싱하여 개별 이미지 단위로 상단/하단 캡션 배치 지원
//             2) 서식 프로필의 order: -1!important / order: 1!important 강제 순서를 [data-caption-position="top|bottom"] 고특이도 선택자로 제어하여 하단 선택 시 문서보기에 100% 하단 렌더링 보장
// 🚨 @PATCH : **2026-10-24** — [이미지 설명(alt/figcaption) 상단/하단 서식 반영 및 상단 배치 지원]:
//             1) 서식 프로필의 mediaCaptionStructure.position 설정에 따라 figcaption을 이미지 상단(기본/AI 표준) 또는 하단으로 배치
//             2) 별도 중복 구문 문단 없이 이미지의 alt 설명을 그대로 이미지 상단에 깔끔하고 선명한 설명(캡션)으로 렌더링
// 🚨 @PATCH : **2026-10-24** — [이미지 및 캡션 분리 여백 최적화]:
//             1) figureStyle에 상하 마진(marginTop: 0.75rem, marginBottom: 1.25rem)을 기본 부여하여 이미지와 하단 본문 문단이 뭉치지 않고 시원하게 분리되도록 조판 개선
//             2) figcaption 상단 여백을 mt-2.5로 정돈하여 이미지와 캡션 사이의 답답한 밀착 현상 완전 해소
// 🚨 @PATCH : **2026-10-16** — [그림책 및 문서 열기 시 이미지 스켈레톤(h-32 animate-pulse) 1프레임 깜빡임 제거]: AsyncImage 초기 렌더링 시 동기적으로 결정 가능한 이미지 경로(데스크톱 media://local/serve, 웹/정적 URL, data:, blob:)를 useState 초기값에서 즉시 산출하여 불필요한 스켈레톤 교체 및 레이아웃 흔들림 원천 차단
// 🚨 @PATCH : **2026-10-14** — [미리보기 이미지 클립보드 실제 비트맵 복사(copyImageToClipboard) 연동]: 이미지 호버 액션 '복사' 및 AsyncImage 복사 버튼 클릭 시 마크다운 텍스트 주소가 아닌 실제 이미지 비트맵을 OS 클립보드에 기록하여 다른 앱 및 ImageModal/에디터 붙여넣기 완벽 지원
// 🚨 @PATCH : **2026-10-14** — [이미지 캡션 [그림 N] 자동 접두사 제거]: 마크다운 이미지 렌더링 시 figcaption::before의 [그림 1] 카운터 자동 표기를 제거하여 사용자가 입력한 순수 캡션만 노출되도록 개선
// 🚨 @PATCH : **2026-10-14** — [도움말 에셋(/help/assets/) 정적 자산 로드 및 로컬 미디어 오탐 방어]: 마크다운 내 /help/assets/, ./assets/, assets/ 하위 도움말 이미지 참조 시 사용자 작업장 리소스 폴더(media/)로 오탐되어 '리소스 폴더 미지정' 경고가 발생하던 결함을 방어하고, 웹 및 Electron 데스크톱 앱(app://) 정적 로더로 100% 직결하여 실시간 정상 렌더링되도록 개선
// 🚨 @PATCH : **2026-10-13** — [수식(math/latex) 코드블록 KaTeX 실시간 렌더링 지원]: ```math 및 ```latex 코드블록을 일반 텍스트 박스가 아닌 아름다운 KaTeX 수식으로 중앙 정렬 실시간 렌더링하도록 MathBlock 컴포넌트 탑재 및 원문 보기/복사 제어 연동
// 🚨 @PATCH : **2026-10-13** — [Mermaid 다이어그램 상단 제어 버튼 마우스 호버 시 활성화]: 다이어그램(Mermaid) 블록의 상단 액션 버튼들(코드 복사, 새 창으로 확대, 이미지 복사, 저장)이 평소에는 숨겨져 있다가 마우스가 다이어그램 영역에 위치하거나 포커스될 때만 활성화되도록 변경
// 🚨 @PATCH : **2026-10-10** — [한글 CJK 볼드(**) 닫힘 태그 바로 뒤 조사 렌더링 방어]: CommonMark 파서가 **온리비**는 과 같이 닫는 태그 바로 뒤에 한글 조사가 붙었을 때 강조를 풀지 못하고 리터럴 문자로 깨져 노출되는 결함을 방어하기 위해 cleanContent 전처리 단계에서 닫힘 태그 뒤 공백 자동 보정 연동
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더(참조파일 등) 미디어 렌더링 폴더 ID 직결]: AsyncImage 및 AsyncVideo 렌더링 시 getResourceSettings('cloud')?.mediaFolderId를 최우선으로 사용하여 구글 드라이브 리소스 폴더 미디어 100% 정상 표시
// 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 전역 미디어 실시간 연동 강화]: 구글 드라이브(OnriviAuthor/참조파일/media) 및 로컬/웹 리소스 폴더 변경 시 AsyncImage 실시간 감지 및 캐싱 Blob URL 렌더링 지원
// 🚨 @PATCH : **2026-10-01** — [본문 우측/중앙 정렬(align, text-align, table 등) 100% 실시간 렌더링 지원]: [align="right"], [style*="text-align: right"], [align="center"] 등의 CSS 규칙을 탑재하고 div/p 컴포넌트의 align 속성을 inline style로 정밀 바인딩하며, th text-align center 강제를 해제하여 사용자 정렬 완벽 보장
// 🚨 @PATCH : **2026-10-01** — [공통 리소스 폴더 하위 폴더 이미지 경로 인식 및 브라우저 세션 복원 결함 해결]: 1) getEffectiveResourceFolder 연동으로 localStorage의 리소스 폴더 설정(onrivi_resource_folder_path 등)을 100% 반영하여 '리소스 폴더 미지정' 오탐 방지 2) 사용자 마크다운 내부 이미지 경로(subfolder/img.png 등)에 media/ 강제 주입을 배제하고 지정된 해당 서브폴더 경로를 그대로 유지 탐색하도록 경로 정규화 개선 3) 브라우저 모드에서 resolveFileHandleInDirectory 신설로 서브디렉터리 파일 핸들 재귀 탐색 및 IndexedDB 저장소 핸들 동기 복원 지원
// 🚨 @PATCH : **2026-09-30** — [작업장 실폴더 외부 링크 연결 차단 가드 및 경고 안내]: 마크다운 미리보기 내 폴더 링크(handleFolderClick) 및 문서/파일 링크(handleClick) 클릭 시 대상 경로가 작업장 실폴더(Workspace Root) 외부인지 판별하는 isPathInsideWorkspace 안전 가드를 신설하여 상위 이탈(../../)이나 다른 드라이브/폴더 절대경로 링크의 연결을 원천 차단하고 '⚠️ 작업장 실폴더 외부에 있는 경로는 연결할 수 없습니다. 작업장 내부의 폴더 및 문서만 연결 가능합니다.' 경고 토스트를 띄우도록 보강
// 🚨 @PATCH : **2026-09-30** — [미리보기 폴더 링크 온리비 표준 UX 구현]: <a> 태그 렌더러에서 상대/절대 폴더 링크(./folder/, /folder 등) 클릭 시 기본 동작으로 좌측 탐색기(LeftSidebar) 자동 펼침·스크롤·코발트 블루 펄스 하이라이트를 발송하고, 데스크톱 Ctrl+클릭 시 시스템 탐색기(openPath) 창을 병행 지원하며 📁 인라인 아이콘 뱃지 및 가이드 툴팁 탑재
// 🚨 @PATCH : **2026-09-26** — [Alert 인용구 박스 상하 여백 대칭 적용(my-4)]: onrivi-alert-box에 my-4(상하 16px)를 추가하여 [예시] 단락 위·아래 여백과 callout 박스 아래 여백이 동일하게 맞춰져 일체감 있게 렌더링되도록 수정
// 🚨 @PATCH : **2026-09-26** — [인용문(blockquote) 내부 리스트(글머리/숫자/체크박스) 들여쓰기 및 선행 공백 인용구 정규화 완전 해결]: 에디터에서 인용구 줄에 탭을 눌러 줄 시작에 공백이 붙은 경우("    > - 홍시") > 마커를 선두로 재배치하여 CommonMark가 하위 중첩 리스트로 100% 인식하도록 cleanContent 정규화 엔진을 신설하고, getIndentStyle에서 > 전/후 공백(outerIndent + innerIndent)을 모두 합산 추출하며, rehypeSourceLinesPlugin에서 listDepth를 추적하여 평탄화된 항목에는 물리 마진을, 중첩 항목(depth>=2)에는 CSS 패딩(1.5em)과 원형 불릿(circle)을 계층별로 완벽 적용
// 🚨 @PATCH : **2026-09-26** — [중첩 이중 코드블록(Nested Codeblock) 파싱 및 문장 내 백틱 분할 결함 완전 해결]: cleanContent의 단순 정규식(split /(```[\s\S]*?```)/g)을 CommonMark 규격 기반 줄 단위 코드블록 분할 및 중첩 감지 엔진(partitionAndNormalizeCodeBlocks)으로 전면 교체하여, 문장 중간의 백틱 3개((```))로 인한 코드블록 오탐과 조기 분할을 원천 차단하고 내부 중첩 코드블록(```python 등) 보유 시 외부 코드블록을 4개 백틱(````)으로 자동 승격 정규화하여 뒷부분 본문(수평선, 표 등)이 거대 코드블록으로 삼켜지던 파싱 붕괴 버그 완벽 박멸
// 🚨 @PATCH : **2026-09-26** — [코드블록 내부 행간 줄간격 콤팩트 규격화(1.35배) 및 빈 행 간격 최적화]: CodeBlock pre 및 .onrivi-line의 과도한 line-height/min-height(1.5em)를 1.35배로 콤팩트 단일화하여 빈 행과 텍스트 행간이 불필요하게 붕 뜨는 결함 해결
// 🚨 @PATCH : **2026-09-26** — [Alert 인용구 태그 직후 강제 빈 줄 완전 소거 및 간격 최소화]: [!Tip], [!Note] 등 태그 문구 소거 후 잔존하던 빈 행(.onrivi-line min-height:1.5em) 및 빈 문단을 pruneLeadingEmptyNodes로 완전 정제하여 태그 직후 강제 개행 현상 박멸, 배지와 본문 사이 하단 마진 축소(mb-1.5) 및 첫 단락 margin-top 0 강제 적용
// 🚨 @PATCH : **2026-09-24** — [동영상 및 지도 래퍼 폭 수축(300px) 버그 해결]: .onrivi-video-wrapper 및 .onrivi-map-wrapper 인라인 스타일의 width: fit-content를 width: 100%로 보정하여 HTML5 replaced element 기본 300px 축소 현상을 방지하고 서식 너비를 온전히 전개
// 🚨 @PATCH : **2026-09-24** — [미디어(이미지·비디오·지도) 렌더러 정렬 아키텍처 완성]: iframe 커스텀 렌더러 신설(.onrivi-map-wrapper), AsyncVideo 래퍼(.onrivi-video-wrapper) 탑재, figure img의 margin:0 !important 강제 초기화 제거, AsyncImage 하드코딩 width:100% 해제(maxWidth:100%/height:auto), 래퍼의 fit-content/align-self 인라인 연동 및 캡션 동기화로 서식 프로필 및 쿼리스트링 정렬 100% 실시간 반영 보장
// 🚨 @PATCH : **2026-09-24** — [미디어(이미지/비디오/지도) 서식 스타일 100% 실시간 연동 및 flex 정렬 최적화]: imgStyle 하드코딩 maxWidth(600px) 및 figure 인라인 마진/중앙정렬 강제를 해제하고, AsyncImage 래퍼(.onrivi-image-wrapper) 및 video/iframe 정렬을 CSS 프로필 align-self/align-items와 1:1 완전 동기화
// 🚨 @PATCH : **2026-09-24** — [표 둥근 모서리·그림자·지브라 오염 완전 소멸 및 기본 표 리셋]: MarkdownViewer 내장 스타일에 table border-spacing:0, border-radius:0, box-shadow:none 및 overflow:visible을 명시하여 전역 CSS 간섭 방어
// 🚨 @PATCH : **2026-09-24** — [표 하단 여백 및 인용구 마진 상쇄 차단]: .table-wrapper-area 및 blockquote에 display:inline-block width:100%를 적용하여 마진 상쇄 원천 차단 및 *:has(+ blockquote) margin-bottom:0 강제 소거
// 🚨 @PATCH : **2026-09-24** — [표 테두리 이중선(double) 렌더링 지원]: MarkdownViewer 인라인 스타일에 th/td border-bottom-style inherit 및 border-collapse: collapse 보강
// 🚨 @PATCH : **2026-09-24** — [인용구 상하 여백 0~15px 데드존 완전 소멸 및 선/후행 블록(표/코드블록) 마진 간섭 0 강제]: blockquote/Alert my-4 기본 마진 클래스 제거, *:has(+ blockquote) 및 blockquote + .not-prose .codeblock-area 마진 0 강제 처리로 슬라이더 0px 밀착 및 1px 단위 즉각 반응 실현
// 🚨 @PATCH : **2026-09-23** — [리스트 빈 행 판별 가드 고도화 및 부모 블록 실종 방어] li 컴포넌트에서 isEmptyRow 검사 시 하위 서브리스트(ul/ol) 보유 여부를 엄격히 확인하여, 서브리스트 내부에 빈 행이 있을 때 부모 li(떡볶이, 고추장 등)가 빈 행으로 오탐되어 통째로 증발하던 결함 완벽 해결
// 🚨 @PATCH : **2026-09-23** — [숫자 리스트 에디터 원본 번호 1:1 일치 렌더링] 에디터에 사용자가 직접 기입한 번호(예: 1., 2., 3. 또는 2., 3., 4. 등)를 원본 라인에서 추출하여 li 태그의 value 속성에 바인딩함으로써, 브라우저의 임의 자동 계산 카운터 대신 에디터에 적힌 번호 그대로 1:1 일치하게 미리보기에 렌더링되도록 개선
// 🚨 @PATCH : **2026-09-23** — [리스트(숫자/글머리/체크박스) data-line 명시적 바인딩 및 커서 위치 동기화] li, ol, ul 컴포넌트에 data-line 속성을 명시적으로 바인딩하여 중첩 멀티리스트에서도 에디터 커서와 1:1로 정확하게 일치하도록 보장
// 🚨 @PATCH : **2026-09-23** — [한글 Alert 인용구 태그 지원] blockquote 렌더러에 한글 Alert 태그([!참고], [!팁], [!중요], [!주의], [!경고] 등) 파싱 엔진을 탑재하여 영문([!NOTE])과 한글 태그 모두 동일한 Alert 스타일로 완벽 렌더링되도록 구현
// 🚨 @PATCH : **2026-09-17** — [다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 시인성 보장]: 어두운 배경의 코드블록 내부 활성 줄 하이라이트 시 코발트 블루 및 1px 인셋 아웃라인 스타일 연동으로 시인성 극대화
// 🚨 @PATCH : **2026-09-17** — [코드블록 내부 에디터-미리보기 커서 위치 불일치 및 솟구침 결함 완벽 해결]: 코드블록 내부를 splitChildrenIntoLines로 분할하여 각 행마다 <span class="onrivi-line" data-line="...">를 1:1로 부여, 에디터 커서 이동 시 코드블록 내부 활성 줄 단독 하이라이트 및 Safe Zone 정밀 추종 연동
// 🚨 @PATCH : **2026-09-16** — [데스크톱 미리보기 외부 링크 클릭 시 기본 웹브라우저 오픈 연동]: <a> 태그 렌더러에 handleExternalLinkClick 탑재하여 데스크톱(Electron) 환경에서 외부 웹 링크(http/https/mailto/tel) 및 www 링크 클릭 시 electronAPI.openExternal을 통해 시스템 기본 웹브라우저 새 창이 즉시 실행되도록 개선, 로컬 파일(file:///) 링크 openPath 연동
// 🚨 @PATCH : **2026-09-13** — [데스크탑 Mermaid '새 창으로 확대' 팝업 차단 오류 해결]: Electron setWindowOpenHandler의 deny로 window.open()이 차단되던 문제를, openInNewWindow()에서 isDesktop(electronAPI.openMermaidWindow 존재 여부) 분기를 추가하여 데스크탑 환경에서는 IPC mermaid:open-window 경유 BrowserWindow 직접 생성, 웹 환경에서는 기존 window.open() 방식을 유지하도록 분기 처리
// 🚨 @PATCH : **2026-09-13** — [출처 링크 클릭 시 동일/타겟 문서 판별 고도화 및 미리보기·에디터 동시 스크롤·하이라이트 연동]: 상대/절대경로 및 파일명 베이스네임 매칭으로 동일 문서 오판을 해결하고, 링크 클릭 시 미리보기 부드러운 스크롤 및 하이라이트 효과와 에디터 라인 범위 선택·중앙 정렬을 동시에 트리거
//             **2026-09-12** — [미리보기 문서 링크 꺾쇠(<...>) 및 앵커(#) 분리 정제 고도화]: 꺾쇠 괄호(<...>)로 감싸진 상대/절대경로 및 한글 헤딩(#) 링크에서 해시 분리 전 꺾쇠를 사전 제거하고 URI 디코딩을 선행 적용하여 탭 오픈 및 스크롤 점프 완벽 보장
//             **2026-09-12** — [인라인 코드(code) 페이지 가로 넘침 방지 및 줄바꿈(word-break) 완벽 보장]: .onrivi-content-root code에 걸려 있던 white-space: pre !important를 코드블록(pre code) 한정으로 축소하고, 인라인 코드에 white-space: pre-wrap, word-break: break-word, overflow-wrap: anywhere를 적용하여 긴 텍스트/섹션 경로가 페이지 밖으로 잘리는 결함 완벽 해결
//             **2026-09-12** — [절대경로(file:///) 링크 내부 탭 오픈 및 라인 앵커(#L..) 점프 연동]: 마크다운 미리보기에서 file:/// 절대경로 링크 클릭 시 외부 브라우저 호출을 방어하고 에디터 내부 handleFileOpenByPath로 연결, 동일/타겟 문서 라인 앵커(#L시작-L끝) 점프 및 스크롤 지원
//             **2026-09-11** — [인용문 Alert 태그 및 색상 유실 버그 완벽 수정] rehypeSourceLinesPlugin의 span.onrivi-line 래핑 환경에서도 첫 번째 텍스트 노드를 재귀적으로 추적(findFirstText/removeTag)하여 [!NOTE/TIP/IMPORTANT/WARNING/CAUTION] 태그와 고유 색상 및 아이콘이 풀리지 않도록 조치, cleanContent의 인용구(&nbsp;) 간섭 차단 및 다크모드 컬러 보정
//             **2026-09-11** — 단일 물결표(~, 기간·인사말 등) 취소선 오인식 방지: remark-gfm singleTilde: false 옵션 적용 (표준 2개 물결표 ~~취소선~~만 허용)
//             **2026-09-11** — 미리보기 영역 사용자 정의 CSS 전면 지원: customCss prop, 마크다운 Frontmatter custom_css/css 추출 주입, 마크다운 본문 내 인라인 <style> 태그 실시간 렌더링 지원
//             **2026-09-06** — [문단 내 커서 위치 행 단독 하이라이트 및 .onrivi-line 정밀 분할] rehypeSourceLinesPlugin에서 문단(p) 내부를 줄바꿈(br) 단위로 <span class="onrivi-line" data-line="...">로 분할 래핑하여 여러 줄로 구성된 문단에서도 커서가 위치한 특정 행 하나만 정확하게 독립 하이라이트되도록 전면 개선
//             **2026-09-06** — [에디터-미리보기 하이라이트 일원화 및 잔상/중복 테두리 제거] 인라인 activeLine dashed 아웃라인 스타일 태그를 제거하고 단일 preview-highlight-line 클래스로 통일하여 표(tr) 및 일반 요소 하이라이트 시인성 일원화
//             **2026-09-05** — [표 전체 래퍼 중복 앵커 제거 및 행(tr) 단위 초정밀 싱크 보장] TableWrapper에서 테이블 전체를 묶는 중복 data-line 속성을 제거하여 자식 tr 개별 행들이 독립적인 40px 단위 앵커로 정확히 인식되도록 개선; iframe 지도 래퍼(map-embed-wrapper) 단일 앵커 일원화
//             **2026-09-05** — [문단 내 연속 줄바꿈(br) 줄 번호 추적 및 표 직전 제목 일체화] rehypeSourceLinesPlugin에서 p 태그 자식 br 마다 물리 줄 번호를 1:1로 증분 부여하여 연속된 인라인 텍스트 행 타이핑 시에도 앵커가 정확히 잡히도록 개선, 표 직전 헤딩(:is(p,h1~h6,strong):has(+ .table-wrapper-area)) 하단 마진 6px 통일 및 dynamicPropsRef 동기 주입으로 실시간 lineMap 반영 보장
//             **2026-09-05** — [미디어(이미지/동영상/지도/머메이드) 1:1 싱크 및 여백 완벽 최적화] 지도(iframe) 전용 반응형 렌더러 신설, 이미지(alt 누락 포함)/동영상카드(VideoCard, SocialVideoCard, AsyncVideo)/머메이드(MermaidBlock) 전체에 data-line 속성 1:1 완벽 바인딩, 문단 내 미디어 블록 래퍼 규격화 및 이중 마진(40px->12px) 정돈
//             **2026-09-05** — [표 내부 타이핑 싱크 결함 해결] 모든 표 행(tr)에 원본 줄 번호(data-line)를 1:1로 부여하는 전용 tr 컴포넌트 렌더러를 탑재하고 rehypeSourceLinesPlugin에서 tr 자식(td/th)의 줄 번호 상속을 보장하여 표 내부 어느 행에서 타이핑하더라도 정확한 DOM 앵커 추종 및 Safe Zone 노출 보장
//             **2026-09-05** — [표 상단 여백 및 직전 제목 문구 밀착 최적화] Tailwind prose table 기본 마진(!m-0 !mt-0)을 원천 소거하고 TableWrapper를 .table-wrapper-area 표준 규격화하여, 표 바로 위 문구(p:has(+ .table-wrapper-area))와의 하단 여백을 6px로 슬림하게 밀착시켜 제목-표 간의 시각적 일체감 완성
//             **2026-09-03** — 표와 상단 문구 간의 과도한 여백 및 시각적 단절감을 해결하기 위해 TableWrapper의 외곽 테두리 카드 박스를 전면 제거하고 상단 여백을 mt-[2.5px]로 정밀 축소 정돈
//             **2026-09-03** — 모니터 해상도 및 분할 모드에서 우측 화면 및 표가 잘리던 결함을 해결하기 위해 최상위 루트 컨테이너에 boxSizing: border-box 및 maxWidth: 100%를 명속 부여하고 TableWrapper/table에 w-full max-w-full 가로 스크롤 가드 적용
//             **2026-09-03** — 문단 및 리스트 내부의 탭(\t) 및 스페이스 공백이 축약되거나 무시되지 않고 4칸 단위(&nbsp;)로 1:1 시각적 보존되도록 cleanContent 강화
//             **2026-09-03** — 문서링크(위키링크) 변환 시 전체 파일 경로가 노출되던 결함을 해결하여 일반 링크처럼 헤딩(#) 제목 또는 순수 문서명(확장자 제거) 및 별칭(|)만 링크 텍스트로 깔끔하게 노출되도록 개선
//             **2026-09-03** — 리소스 폴더 미지정 상태에서 rootFolderPath 및 currentFilePath로 임의 폴백되어 이미지가 렌더링되던 취약점 원천 제거; 리소스 폴더 미지정 시 이미지 로드를 차단하고 경고 플레이스홀더를 렌더링하도록 표준화
//             **2026-09-02** — 본문 바로 아랫줄에 - 단독 입력 시 Setext H2 헤딩으로 오인되어 윗줄이 제목으로 변하던 마크다운 파서 결함을 방지하기 위해 Setext 오작동 방어 필터 적용
//             **2026-09-02** — br display none을 제거하여 이미지 아래 및 일반 문단의 줄바꿈을 정상화하고, 행 시작 들여쓰기 및 연속 스페이스를 1:1 보존하도록 cleanContent 전처리 고도화
//             **2026-09-02** — cleanContent에서 2칸 이상의 인라인 연속 스페이스를 1:1 보존 처리하고, 리스트 종료 후 빈 행 문단 분리를 위해 ul+p, ol+p에 1.5em 마진 적용
//             **2026-09-02** — 리스트(ul/ol) 및 리스트 아이템(li, li > p)에 white-space: normal 및 margin: 0을 명시하여 리스트 항목 끝 \n에 의한 빈 줄 생성 현상 완벽 해결
//             **2026-09-02** — 리스트(ul/ol), 번호목록, 체크박스 내부에 p 태그가 생성될 때 발생하는 Loose List 행간 벌어짐(빈 행 현상)을 해결하기 위해 li > p 마진 제거 및 display: inline 적용
//             **2026-09-02** — break-spaces 환경에서 br 태그와의 이중 줄바꿈 충돌(들여쓰기 시 빈 행 추가 현상)을 해결하기 위해 .onrivi-content-root br { display: none !important; } 적용 및 p 렌더러 정밀화
//             **2026-09-02** — 에디터 연속 스페이스/탭(Tab) 및 행 시작 들여쓰기 공백이 미리보기에 1:1로 정확하게 유지되도록 white-space: break-spaces, tab-size: 4 연동 적용
//             **2026-09-02** — [ONRIVI-DS-SYSTEM-002 v4.1] Content Document Scope 격리를 위해 최상위 루트에 .onrivi-content-root 표준 클래스 적용 및 서식 스코프 완전 격리
//             **2026-08-31** — 미리보기가 위로 과도하게 치솟아 하얀 빈 화면이 노출되던 결함 해결을 위해 50vh 하단 스페이서 제거; 스크롤 싱크 엔진과 1:1 보간 일원화.
//             **2026-08-30** — onImageLoaded prop을 AsyncImage에 전달할 때 ...props 스프레드로 DOM img에 흘러들어가 발생하던 Unknown event handler 경고 수정(명시적 destructure로 분리); 대형 이미지 비동기 로딩 완료 시 DOM 높이 변화로 인한 스크롤 싱크 오차를 보정하기 위해 onImageLoaded 콜백 prop 추가 및 AsyncImage 내부 handleImgLoad에서 해당 콜백 호출 연결 | **2026-08-28** — 이미지, 표, 코드블록 등의 가변 거대 요소가 포함되었을 때 비선형 리플로우로 인해 선형 스크롤 비율 보간이 어긋나서 싱크가 망가지던 현상을 해결하기 위해, React 컴포넌트 Props 카멜 케이스 변환 및 Properties 손실을 막아주는 extractDataLine 통합 스캐너를 이식하여 래퍼 돔의 data-line 상속 안전성을 확보함 | **2026-08-26** — 코드 블록 헤더 복사 버튼의 글자색이 어두운 배경 위에서 묻히던 시각성 결함을 해결하기 위해 항상 선명한 텍스트 컬러(text-slate-100) 및 불투명도 보정을 적용하고 언어명 텍스트 레이블을 볼드체(font-bold)로 강화 | **2026-08-20** 다크모드에서 자바스크립트 등 언어 코드블록의 글자색이 어두워 보이지 않는 현상을 해결하기 위해 최상위 style 태그를 주입하여 텍스트 및 자식 요소 색상을 흰색으로 강제 고정.
// 🚨 @PATCH : **2026-07-16** — 코드블록 및 인라인 코드의 하드코딩된 파란색 톤 배경 및 글자색을 제거하여, 사용자 CSS 프로필 서식 설정이 가로막힘 없이 실시간으로 올바르게 오버라이딩되도록 버그 수정.
//             **2026-07-15** — MermaidBlock 내 alert() 호출을 useToast showToast('warning')로 교체 (브라우저 팝업 차단 알림을 공통 토스트 UI로 통일)
//             **2026-07-07** — rehype-citation 플러그인 추가 (참고문헌/BibTeX 인용 파이프라인); bibContent prop으로 BibTeX 데이터를 주입받아 [@citekey] 문법을 인용/참고문헌 목록으로 자동 변환
//             **2026-07-04** — Mermaid 다이어그램 렌더링 문법 에러 복구 강화(유입된 중첩 백틱 펜스 태그 ```mermaid 및 깨진 기호/괄호 라인 자동 정제, 화살표 레이블 간격 자동 보정) 및 에러 발생 시 마크다운 코드 원본을 복사하고 대조해볼 수 있는 '코드 원본 보기' 디버깅 UI 추가 패치
//             **2026-06-20** — Mermaid 다이어그램 이미지 저장(handleSaveImage) 기능이 Electron 데스크톱 앱 내에서 동작하지 않던 API 명칭 불일치 버그(saveAs -> saveFileAs)를 해결하고, 웹 브라우저 환경에서 동작할 수 있도록 a 링크 다운로드 폴백을 추가; 다이어그램 저장, 이미지 복사 시 다이어그램 크기가 극도로 작게 나오는 찌그러짐 결함을 3배 스케일링 기법으로 최종 영구 해결; 딤드 오버레이 방식의 복잡한 확대 모달을 전면 걷어내고, 독립 새 브라우저 창(Pop-up Window)으로 다이어그램을 선명하게 확대 및 다중 작업할 수 있도록 openInNewWindow 기능으로 리팩토링 및 🔍 새 창으로 확대 버튼 제공

import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import TableHeaderCell from '@/components/TableHeaderCell';
import { ratiosBeforeTable } from '@/lib/tableColumnRatios';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import remarkExtendedTable, { extendedTableHandlers } from 'remark-extended-table';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'dompurify';
import rehypeSanitize from 'rehype-sanitize';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import VideoCard from '@/components/VideoCard';
import SocialVideoCard from '@/components/SocialVideoCard';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { rehypePreserveFootnotes } from '@/lib/rehypePreserveFootnotes';
import { copyMediaSource, copyImageToClipboard } from '@/lib/mediaMarkup';
import { mediaSourceRange } from '@/lib/mediaSourceRange';
import { useToast } from '@/components/ToastProvider';
import { extractFrontmatter } from '@/lib/frontmatter';
import { loadSecureData } from '@/lib/secureStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { idb } from '@/lib/indexedDbHelper';
import { getSavedDriveToken, getSavedWorkspaceInfo, getDriveMediaImageBlobUrl } from '@/lib/gdrive/googleDriveClient';

/**
 * FileSystemDirectoryHandle 내부에서 슬래시(/, \)가 포함된 상대 경로를 재귀적으로 추적하여 FileHandle을 반환합니다.
 */
const getTextFromChildren = (children: React.ReactNode): string => {
  if (children === null || children === undefined) return '';
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join('');
  }
  if (React.isValidElement(children)) {
    return getTextFromChildren(children.props.children);
  }
  return '';
};

/**
 * [ONR-MD-005] MarkdownViewerProps 인터페이스
 * @description 마크다운 렌더러 뷰어 컴포넌트에 주입되는 마크다운 원문(content), 체크박스 토글 핸들러 규격 명세입니다.
 */
interface MarkdownViewerProps {
  picturebookProfile?: import('@/types/cssProfile').CssProfile;
  mediaControlsManaged?: boolean;
  onMediaEdit?: (kind:'image'|'video'|'map', path:string, line:number) => void;
  onPicturebookChange?: (markdown: string) => void;
  onPicturebookImageEdit?: (index:number) => void;
  picturebookEditorOptions?: import('./PicturebookSceneInput').PicturebookEditorOptions;
  content: string;
  originalContent?: string;
  lineMap?: number[];
  onCheckboxToggle?: (lineNumber: number, checked: boolean, importedId?: string) => void;
  currentFilePath?: string;
  rootFolderPath?: string;
  onFileOpen?: (resolvedPath: string, hashPart?: string, strictLinkedDocument?: boolean) => void;
  listIndent?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  bibContent?: string;
  suppressBibliography?: boolean;
  rootFolder?: any;
  resourceFolderHandle?: any;
  resourceFolder?: string;
  workspaceType?: string;
  /** 💡 대형 이미지 비동기 로딩 완료 시 호출되는 콜백 — 스크롤 싱크 재정렬 트리거용 */
  onImageLoaded?: () => void;
  /** 💡 현재 에디터에서 포커스/커서가 위치한 활성 라인 번호 (미리보기 인디케이터용) */
  activeLine?: number;
  /** 💡 사용자 정의 CSS 스타일 문자열 (미리보기 서식 격리 주입) */
  customCss?: string;
}

const resolveRelativeImagePath = (srcPath: string, currentFileNodePath: string | undefined): string => {
  if (!srcPath) return "";

  // 앞뒤 꺾쇠 괄호 <> 제거 (경로 내 공백 처리를 위해 감싸진 경우 방어)
  let cleanSrcPath = srcPath.trim();
  if (cleanSrcPath.startsWith('<') && cleanSrcPath.endsWith('>')) {
    cleanSrcPath = cleanSrcPath.slice(1, -1);
  }

  if (cleanSrcPath.startsWith('http://') || cleanSrcPath.startsWith('https://') || cleanSrcPath.startsWith('data:') || cleanSrcPath.startsWith('blob:')) {
    return cleanSrcPath;
  }

  // URL 디코딩: 마크다운 파서가 한글/특수문자를 퍼센트 인코딩한 경우 파일시스템 경로로 복원
  let decoded = cleanSrcPath;
  try {
    decoded = decodeURIComponent(cleanSrcPath);
  } catch {
    decoded = cleanSrcPath;
  }

  // 윈도우 절대경로 (예: D:/, C:\ 등) 판별 시 그대로 반환
  const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(decoded.replace(/\\/g, '/'));
  if (isAbsoluteWin) {
    return decoded.replace(/\\/g, '/');
  }

  let baseFolder = "";
  if (currentFileNodePath) {
    const normalizedFile = currentFileNodePath.replace(/\\/g, '/');
    const lastSlash = normalizedFile.lastIndexOf('/');
    if (lastSlash !== -1) {
      baseFolder = normalizedFile.substring(0, lastSlash);
    }
  }

  let cleanSrc = decoded.replace(/\\/g, '/');
  let isRootRelative = false;
  if (cleanSrc.startsWith('/')) {
    isRootRelative = true;
    cleanSrc = cleanSrc.substring(1);
  }

  if (cleanSrc.startsWith('./')) {
    cleanSrc = cleanSrc.substring(2);
  }

  let finalPath = "";
  if (isRootRelative) {
    finalPath = cleanSrc;
  } else if (baseFolder) {
    finalPath = baseFolder + '/' + cleanSrc;
  } else {
    finalPath = cleanSrc;
  }

  const segments = finalPath.split('/');
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      stack.pop();
    } else {
      stack.push(seg);
    }
  }

  return stack.join('/');
};

// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0008-GUARD] isPathInsideWorkspace
// 🎯 @KICK  : 마크다운 링크(폴더/문서) 클릭 시 대상 경로가 작업장 실폴더 내부인지 엄격히 검증
// 🛡️ @GUARD : 작업장 상위 이탈(../../) 및 작업장 외부 절대경로(다른 드라이브/폴더) 원천 차단
// 🚨 @PATCH : **2026-09-30** — 작업장 실폴더 외부 이탈 링크 연결 차단 및 경고 토스트 가드 신설
// 🔗 @CALLS : handleFolderClick, handleClick
// ====================================================================
export interface WorkspaceGuardResult {
  isInside: boolean;
  reason?: string;
  resolvedPath?: string;
}

export function isPathInsideWorkspace(
  targetHref: string,
  currentFilePath?: string,
  rootFolderPath?: string,
  rootFolderName?: string
): WorkspaceGuardResult {
  if (!targetHref) {
    return { isInside: false, reason: '경로가 비어 있습니다.' };
  }

  // 1) 프로토콜 및 특수 기호, 따옴표, 꺾쇠 정제
  let clean = targetHref.trim();
  if (clean.startsWith('<') && clean.endsWith('>')) {
    clean = clean.slice(1, -1).trim();
  }
  clean = clean.replace(/^[<"']|[>"']$/g, '').trim();
  for (let i = 0; i < 8; i++) {
    try {
      const decoded = decodeURIComponent(clean);
      if (decoded === clean) break;
      clean = decoded;
    } catch { break; }
  }
  if (/%[0-9a-f]{2}/i.test(clean)) {
    return { isInside: false, reason: '경로 인코딩을 확인할 수 없습니다.' };
  }

  // 앵커(#) 분리 (앵커만 있는 경우는 현재 문서 내부이므로 항상 허용)
  clean = clean.split('#')[0].trim();
  if (typeof resolveWorkspaceHelpLink !== 'undefined') {
    const helpResolved = resolveWorkspaceHelpLink(clean, currentFilePath);
    if (helpResolved !== clean) {
      clean = helpResolved;
    }
  }
  if (!clean) {
    return { isInside: true };
  }

  // file:/// 접두어 제거
  if (clean.startsWith('file:///')) {
    clean = clean.replace(/^file:\/\/\//, '');
  }

  const isWindowsAbsolute = /^[a-zA-Z]:[/\\]/.test(clean);
  const isPosixAbsolute = clean.startsWith('/') && !clean.startsWith('//');
  // Desktop document links may intentionally point outside the current workspace.
  // Electron reads the explicitly selected absolute file, never a same-name fallback.
  const nativeApi = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  if (nativeApi?.readFromPath && (isWindowsAbsolute || isPosixAbsolute || clean.startsWith('\\\\')) && /\.(md|markdown)$/i.test(clean)) {
    return { isInside: true, resolvedPath: clean.replace(/\\/g, '/') };
  }

  // 작업장 루트 경로 추출
  let wsRoot = (rootFolderPath || '').trim();
  if (wsRoot === 'BROWSER_STORAGE' || wsRoot === 'BROWSER_STORAGE_NAME') {
    wsRoot = '';
  }
  // localStorage 폴백 확인 (데스크톱 환경)
  if (!wsRoot && typeof window !== 'undefined') {
    try {
      const lsWs = localStorage.getItem('onrivi_workspace_path');
      if (lsWs && lsWs !== 'BROWSER_STORAGE') {
        wsRoot = lsWs;
      }
    } catch {}
  }

  const normalizeSegments = (value: string) => {
    const normalized = value.replace(/\\/g, '/');
    const drive = normalized.match(/^[a-zA-Z]:/);
    const absolute = Boolean(drive) || normalized.startsWith('/');
    const stack: string[] = [];
    for (const part of normalized.replace(/^[a-zA-Z]:/, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!stack.length) return null;
        stack.pop();
      } else stack.push(part);
    }
    return `${drive ? drive[0] : absolute ? '/' : ''}${drive ? '/' : ''}${stack.join('/')}`;
  };
  const normTarget = isWindowsAbsolute || isPosixAbsolute ? normalizeSegments(clean) : clean.replace(/\\/g, '/');
  if (normTarget === null) return { isInside: false, reason: '작업장 실폴더 외부에 있는 경로는 연결할 수 없습니다.' };
  const normWsRoot = wsRoot ? normalizeSegments(wsRoot)?.replace(/\/+$/, '') || '' : '';
  const normCurrentFile = (currentFilePath || '').replace(/\\/g, '/');

  const outsideReason = '작업장 실폴더 외부에 있는 경로는 연결할 수 없습니다. 작업장 내부의 폴더 및 문서만 연결 가능합니다.';

  // 🛑 Case A: 윈도우 드라이브 절대경로 (예: D:/..., C:\...)
  if (isWindowsAbsolute) {
    if (!normWsRoot) {
      return { isInside: false, reason: outsideReason };
    }

    const lowerTarget = normTarget.toLowerCase();
    const lowerRoot = normWsRoot.toLowerCase();

    const isMatch = lowerTarget === lowerRoot || lowerTarget.startsWith(lowerRoot + '/');
    if (!isMatch) {
      return { isInside: false, reason: outsideReason };
    }

    return { isInside: true, resolvedPath: normTarget };
  }

  // 🛑 Case B: POSIX 루트 절대경로 (예: /folder/sub)
  if (isPosixAbsolute) {
    const parts = normTarget.split('/').filter(Boolean);
    let depth = 0;
    for (const p of parts) {
      if (p === '..') {
        depth--;
        if (depth < 0) {
          return { isInside: false, reason: outsideReason };
        }
      } else if (p !== '.') {
        depth++;
      }
    }
    return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
  }

  // 🛑 Case C: 상대경로 (./, ../, folder/ 등)
  // 1) 데스크톱에서 currentFilePath와 normWsRoot가 모두 존재하는 경우: 물리적 완전 해석(resolve) 후 검증
  if (normWsRoot && normCurrentFile && (normCurrentFile.toLowerCase() === normWsRoot.toLowerCase() || normCurrentFile.toLowerCase().startsWith(normWsRoot.toLowerCase() + '/'))) {
    const combined = resolveDocumentLink(normTarget, currentFilePath);

    const segments = combined.split('/');
    const stack: string[] = [];
    for (const seg of segments) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') {
        stack.pop();
      } else {
        stack.push(seg);
      }
    }
    const resolved = stack.join('/');
    const lowerResolved = resolved.toLowerCase();
    const lowerRoot = normWsRoot.toLowerCase();

    if (lowerResolved !== lowerRoot && !lowerResolved.startsWith(lowerRoot + '/')) {
      return { isInside: false, reason: outsideReason };
    }
    return { isInside: true, resolvedPath: resolved };
  }

  // 2) 웹 브라우저 환경 또는 currentFilePath가 상대 경로인 경우: 디렉토리 깊이(depth) 계산
  if (normCurrentFile) {
    let cleanCurrent = normCurrentFile;
    if (rootFolderName && cleanCurrent.startsWith(rootFolderName + '/')) {
      cleanCurrent = cleanCurrent.substring(rootFolderName.length + 1);
    }

    const currentParts = cleanCurrent.split('/').filter(Boolean);
    currentParts.pop(); // 파일명 제외
    let targetDepth = currentParts.length;

    const targetParts = normTarget.split('/').filter(Boolean);
    for (const p of targetParts) {
      if (p === '..') {
        targetDepth--;
        if (targetDepth < 0) {
          return { isInside: false, reason: outsideReason };
        }
      } else if (p !== '.') {
        targetDepth++;
      }
    }
    return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
  }

  // currentFilePath 정보가 없는 상태에서 ..로 시작하는 상대경로인 경우
  if (normTarget.startsWith('..')) {
    return { isInside: false, reason: outsideReason };
  }

  return { isInside: true, resolvedPath: resolveDocumentLink(normTarget, currentFilePath) };
}

// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0009] MarkdownViewer ➔ remarkDisableIndentedCode
// 🎯 @KICK  : 4칸 들여쓰기/탭의 코드블록 인식을 차단하는 remark 플러그인
// 🛡️ @GUARD : micromarkExtensions에 codeIndented 비활성화 등록
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
// [ONR-MD-001] 들여쓰기 코드 블록 인식 차단: 4칸 들여쓰기/탭 입력 시 코드블록으로 인식되는 기본 마크다운 규격을 차단하는 커스텀 remark 플러그인입니다.
// 🛡️ 들여쓰기 4칸/탭 입력 시 코드블록으로 인식되는 것을 완전히 차단하는 플러그인
function remarkEmptyDocumentLinkLabels() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'link' && (!node.children || node.children.length === 0)) {
        let target = String(node.url || '').split(/[?#]/)[0];
        try { target = decodeURIComponent(target); } catch {}
        const filename = target.replace(/\\/g, '/').split('/').pop() || '';
        if (/\.(md|markdown)$/i.test(filename)) {
          node.children = [{ type: 'text', value: filename.replace(/\.(md|markdown)$/i, '') }];
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}

function remarkDisableIndentedCode(this: any) {
  const data = this.data();
  if (!data.micromarkExtensions) {
    data.micromarkExtensions = [];
  }
  data.micromarkExtensions.push({
    disable: { null: ['codeIndented'] }
  });
}

// 💡 [코드블록 내부 React 자식 노드 줄바꿈(\n) 단위 정밀 분할 헬퍼]
// highlight.js로 파싱된 React 노드 트리(span, text)를 줄 단위(array of lines)로 안전하게 분할 보존
// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0004] MarkdownViewer ➔ MarkdownViewer
// 🎯 @KICK  : 마크다운 텍스트를 ReactMarkdown으로 렌더링 - 코드블록, 표, 머메이드, 이미지 경로 변환 등 고기능 뷰어
// 🛡️ @GUARD : 이미지 경로는 media:// 프록시로 변환; HTML 이스케이프/위키링크 전처리
// 🚨 @PATCH : 쿼리 스트링 분리 가드, 웰컴 페이지 예외 가드, 단위 자동 보완 가드
// 🔗 @CALLS : CodeBlock, TableWrapper, MermaidBlock, rehypeSourceLinesPlugin, rehypeBrRaw, cleanContent
// ====================================================================
function MarkdownViewer({
  content, originalContent, lineMap, onCheckboxToggle, currentFilePath, rootFolderPath,
  onFileOpen, listIndent, marginTop, marginBottom, marginLeft, marginRight, bibContent, rootFolder, resourceFolderHandle, resourceFolder, workspaceType,
  onImageLoaded, activeLine, customCss, picturebookProfile, onPicturebookChange, onMediaEdit, mediaControlsManaged, suppressBibliography
}: MarkdownViewerProps) {

  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const originalContentRef = useRef(originalContent);
  const dynamicPropsRef = useRef({ lineMap, onCheckboxToggle, currentFilePath, rootFolderPath, onFileOpen, rootFolder, resourceFolderHandle, resourceFolder, workspaceType, showToast, onMediaEdit, mediaControlsManaged });
  dynamicPropsRef.current = { lineMap, onCheckboxToggle, currentFilePath, rootFolderPath, onFileOpen, rootFolder, resourceFolderHandle, resourceFolder, workspaceType, showToast, onMediaEdit, mediaControlsManaged };

  const attachMediaActions = useCallback((kind:'image'|'video'|'map', path:string, node:any, child:React.ReactNode) => {
    if (!dynamicPropsRef.current.onMediaEdit) return child;
    const line = dynamicPropsRef.current.lineMap?.[node?.position?.start?.line || 0] || node?.position?.start?.line || 1;
    return <div className="relative group onrivi-media-actions-frame" style={{maxWidth:'100%'}}>
      {child}
      <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 no-print" data-editor-controls contentEditable={false}>
        <button type="button" className="onrivi-media-control" onMouseDown={e=>e.preventDefault()} onClick={e=>{e.stopPropagation();dynamicPropsRef.current.onMediaEdit?.(kind,path,line);}}>편집</button>
        <button type="button" className="onrivi-media-control" title={kind === 'image' ? '이미지 복사' : '미디어 참조 복사'} onMouseDown={e=>e.preventDefault()} onClick={e=>{
          e.stopPropagation(); const match = mediaSourceRange(originalContentRef.current || contentRef.current,kind,path,line);
          if (kind === 'image') {
            const target = path || match?.source || '';
            if (!target) { showToast('복사할 이미지 정보를 찾지 못했습니다.', 'warning'); return; }
            void copyImageToClipboard(target).then((ok)=>{
              if (ok) showToast('이미지를 클립보드에 복사했습니다.', 'success');
              else showToast('이미지 복사에 실패했습니다.', 'error');
            }).catch(()=>showToast('클립보드 복사 실패', 'error'));
          } else {
            if (!match) {showToast('원본 미디어 위치를 찾지 못했습니다.','warning');return;}
            void copyMediaSource(match.source).then(()=>showToast('미디어 참조를 복사했습니다.','success')).catch(()=>showToast('클립보드 복사 실패','error'));
          }
        }}>복사</button>
      </div>
    </div>;
  },[showToast]);

  const frontmatterCustomCss = useMemo(() => {
    if (!content) return '';
    try {
      const { data } = extractFrontmatter(content);
      return data.custom_css || data.customCss || data.css || '';
    } catch {
      return '';
    }
  }, [content]);

  useEffect(() => {
    contentRef.current = content;
    originalContentRef.current = originalContent;
  }, [content, originalContent]);

// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0003] MarkdownViewer ➔ cleanContent
// 🎯 @KICK  : 마크다운 원문 전처리 - 위키링크 변환, 괄호 링크 이스케이프, 목록 번호 방어
// 🛡️ @GUARD : 숫자+괄호 패턴을 백슬래시 이스케이프로 목록 변환 방지
// 🚨 @PATCH : 소괄호 포함 URL 파싱 깨짐 방지를 위해 <> 래핑 필터 적용
// 🔗 @CALLS : 없음
// ====================================================================
  // 🛡️ [마크다운 원본 우회] 마크다운 본문의 HTML 이스케이프 깨짐 방지를 위해 원본 내용을 직접 컴포넌트에 공급합니다.
  // 💡 [한글 주석] 마크다운 링크 주소 내부에 소괄호()가 포함되어 파싱이 깨지는 현상 방지 필터 (부등호 <> 래핑 처리)
  const cleanContent = useMemo(() => {
    if (!content) return "";
    
    // 🛡️ [Frontmatter 메타데이터 숨김] 뷰어에 메타데이터(예: css_profile)가 노출되지 않도록 전처리
    const { content: strippedContent } = extractFrontmatter(content);
    let processed = strippedContent;

    // 📄 [페이지 나누기 표준화]
    // 1) 마크다운 주석형: <!-- onrivi:page-break -->, <!-- [page-break] -->, <!-- pagebreak -->
    // 2) LaTeX 명령어형: \pagebreak, \newpage
    // 3) HTML 인라인/태그형: <div class="page-break">, <hr class="page-break">
    // 위의 모든 페이지 나누기 마커를 파서와 PagedJS 인쇄 엔진이 100% 인식하는 data-onrivi-page-break 블록 요소로 정규화
    processed = processed.replace(
      /(^[ \t]*)(?:<!--\s*(?:onrivi:)?page-?break\s*-->|<!--\s*\[page-?break\]\s*-->|\\pagebreak\b|\\newpage\b|<(?:div|hr)[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>[\s\S]*?(?:<\/(?:div|hr)>)?)(?=[ \t]*$)/gim,
      '\n\n<div data-onrivi-page-break="true" class="onrivi-page-break page-break" aria-label="수동 페이지 나누기">수동 페이지 나누기</div>\n\n'
    );
    
    // 🛡️ [목록 번호 변환 방어]
    // 1) 웹 모드 처럼 숫자에 괄호 닫기 패턴(예: 1) )을 라인 시작 지점에 작성했을 때,
    // 마크다운 파서가 이를 ordered list <ol> 목록으로 오해하여 1. 등으로 변환 렌더링하는 것을 방지하기 위해 괄호 앞에 백슬래시 이스케이프(\))를 자동 적용합니다.
    // 🛡️ [Setext 헤딩 오작동 방어]
    // 본문 문장 바로 아랫줄에 - 기호만 단독으로 입력했을 때(리스트 작성 타이핑 중),
    // 마크다운 파서가 윗줄 문장을 H2 Setext 제목으로 오인하여 볼드로 바꾸는 현상을 방지하기 위해 이스케이프(\-) 처리
    processed = processed.replace(/(^[ \t]*)-([ \t]*)$/gm, '$1\\-$2');
    processed = processed.replace(/(^[ \t]*)=+([ \t]*)$/gm, '$1\\=$2');

    // 💡 [옵시디언 위키링크 변환 필터 개선]
    // 1) 헤딩 링크: [[../path.md#1. 제목]] -> [1. 제목](<../path.md#1. 제목>)
    // 2) 별칭 링크: [[../path.md#1. 제목|요약]] -> [요약](<../path.md#1. 제목>)
    // 3) 문서 링크: [[../path.md]] -> [path](<../path.md>) (확장자 .md 및 상대경로 제거)
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    processed = processed.replace(wikiLinkRegex, (match, linkTarget, customText) => {
      const trimmedTarget = linkTarget.trim();
      let text = '';
      if (customText && customText.trim()) {
        text = customText.trim();
      } else {
        const hashIdx = trimmedTarget.indexOf('#');
        if (hashIdx !== -1) {
          // # 뒤의 헤딩 제목만 깔끔하게 링크명으로 표시
          const headingPart = trimmedTarget.slice(hashIdx + 1).trim();
          text = headingPart || trimmedTarget;
        } else {
          // 파일명에서 디렉토리 경로 및 .md/.markdown 확장자를 제거하여 깔끔한 문서명으로 표시
          const rawFileName = trimmedTarget.split(/[/\\]/).pop() || trimmedTarget;
          text = rawFileName.replace(/\.(md|markdown)$/i, '');
        }
      }
      return `[${text}](<${trimmedTarget}>)`;
    });

    const mdLinkRegex = /\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)/g;
    processed = processed.replace(mdLinkRegex, (match, text, url) => {
      if (url.startsWith('<') && url.endsWith('>')) {
        return match;
      }
      return `[${text}](<${url}>)`;
    });

    // 💡 [코드블록과 본문 격리 및 중첩 이중 코드블록 정규화]
    // CommonMark 규격에 맞추어 코드블록 내부(원본 100% 보존)와 본문(2칸 이상 공백/탭 1:1 보존)을 엄격히 분리
    const segments = partitionAndNormalizeCodeBlocks(processed);
    processed = segments.map((seg) => {
      if (seg.isCode) {
        return seg.text; // 코드블록 내부는 원본 및 서식 100% 보존 (중첩 백틱 승격 완료)
      }

      let proseText = seg.text;

      // 💡 [한글 CJK 볼드 닫힘 렌더링 방어]
      // CommonMark 파서가 **온리비**는 처럼 닫는 태그 바로 뒤에 한글 조사가 붙었을 때 강조를 풀지 못하고 리터럴 문자로 노출하는 버그를 원천 해결
      proseText = proseText.replace(/(?<!\*)\*\*([^\s*\n](?:[^*\n]*?[^\s*\n])?)\*\*([가-힣a-zA-Z0-9])/g, '**$1** $2');
      // Markdown blank lines separate blocks. Do not turn structural blank
      // lines around list wrappers into visible paragraphs with their own margins.
      // Leaving them intact also preserves the source-line mapping.

      return proseText.split('\n').map(line => {
        const isListItem = /^[ \t]*([*+-]|\d+\.)\s+/.test(line);
        if (isListItem) {
          // 리스트 항목: 마크다운 리스트 인덴트 문법 보존 + 내용 내 2칸 이상 공백 보존
          const listMatch = line.match(/^([ \t]*[*+-]|[ \t]*\d+\.)\s+(.*)$/);
          if (listMatch) {
            const prefix = listMatch[1];
            let body = listMatch[2];
            body = body.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
            return `${prefix} ${body}`;
          }
          return line;
        }
        // 💡 [선행 공백 인용구 정규화] 사용자가 에디터에서 인용구 라인을 들여쓰기하려고 줄 맨 앞에 탭이나 공백을 친 경우 (예: "    > - 홍시")
        // 인용구 마커(>)를 맨 앞으로 이동시키고 공백을 > 뒤로 배치하여 CommonMark가 하위 중첩 리스트로 파싱할 수 있도록 정규화
        const leadingSpaceQuoteMatch = line.match(/^([ \t]+)((?:>+[ \t]?)+)(.*)$/);
        if (leadingSpaceQuoteMatch) {
          const spaces = leadingSpaceQuoteMatch[1];
          const quotes = leadingSpaceQuoteMatch[2].trim();
          const rest = leadingSpaceQuoteMatch[3];
          line = `${quotes} ${spaces}${rest}`;
        }

        // 인용구: 마크다운 인용구 문법(> 기호 및 Alert 태그) 보존 + 본문 내 2칸 이상 공백 보존
        const isQuote = /^[ \t]*>/.test(line);
        if (isQuote) {
          const quoteMatch = line.match(/^([ \t]*>+[ \t]?)(.*)$/);
          if (quoteMatch) {
            const prefix = quoteMatch[1];
            let body = quoteMatch[2];
            const alertTagMatch = body.match(/^(\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)\])(.*)$/i);
            if (alertTagMatch) {
              const tag = alertTagMatch[1];
              let tagBody = alertTagMatch[2];
              tagBody = tagBody.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
              return `${prefix}${tag}${tagBody}`;
            }
            // 💡 [인용구 내부 리스트 보존] 인용구 내부 리스트의 선행 공백과 불릿/숫자는 마크다운 규격대로 보존하고 내용물 공백만 치환
            const innerListMatch = body.match(/^([ \t]*[*+-]|[ \t]*\d+\.)\s+(.*)$/);
            if (innerListMatch) {
              const listPrefix = innerListMatch[1];
              let listBody = innerListMatch[2];
              listBody = listBody.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
              return `${prefix}${listPrefix} ${listBody}`;
            }
            body = body.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
            return `${prefix}${body}`;
          }
          return line;
        }
        // 일반 문장: 행 시작 공백/탭 및 문장 내 2칸 이상 공백 모두 1:1 보존
        const leadMatch = line.match(/^([ \t]*)(.*)$/);
        if (!leadMatch) return line;
        let lead = leadMatch[1];
        let rest = leadMatch[2];
        lead = lead.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;');
        rest = rest.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
        return lead + rest;
      }).join('\n');
    }).join('\n');

    return processed;
  }, [content]);

  // 🛡️ [들여쓰기 및 인덴트 가드] 에디터 원본 텍스트의 해당 줄에 있는 탭과 공백을 계산하여 스타일(marginLeft)을 리턴하는 헬퍼 함수
  const getIndentStyle = useCallback((node: any) => {
    const line = node?.position?.start?.line;
    const currentLineMap = dynamicPropsRef.current.lineMap || [];
    const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
    if (!origLine) return {};

    const targetContent = originalContentRef.current || contentRef.current;
    if (!targetContent || typeof targetContent !== 'string') return {};
    const lines = targetContent.split('\n');
    const lineText = lines[origLine - 1] || '';

    // 💡 [인용구 투과 들여쓰기 공백 종합 추출]
    // 1) ">   - 바나나" 처럼 > 뒤에 들여쓰기가 있는 경우 (innerIndent)
    // 2) "    > - 홍시" 처럼 > 앞에 들여쓰기가 있는 경우 (outerIndent)
    // 둘을 모두 합산하여 사용자가 에디터에 부여한 총 물리 들여쓰기를 정확히 복원
    let indentStr = '';
    const quoteLineMatch = lineText.match(/^([ \t]*)(?:>+[ \t]?)+(.*)$/);
    if (quoteLineMatch) {
      const outerIndent = quoteLineMatch[1] || '';
      const innerContent = quoteLineMatch[2] || '';
      const innerIndentMatch = innerContent.match(/^([ \t]*)/);
      const innerIndent = innerIndentMatch ? innerIndentMatch[1] : '';
      indentStr = outerIndent + innerIndent;
    } else {
      const indentMatch = lineText.match(/^([ \t]*)/);
      indentStr = indentMatch ? indentMatch[1] : '';
    }

    // 💡 [목록 들여쓰기 동적 연동]
    // listIndent prop이 전달되면 (예: '16px'), 그 값을 파싱하여 탭/공백당 들여쓰기 px 단위를 조정합니다.
    // 기본값은 16px (탭 1개당 16px, 공백 1개당 4px) 입니다.
    let baseIndentPx = 16;
    if (listIndent) {
      const parsed = parseInt(listIndent, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        baseIndentPx = parsed;
      }
    }

    let marginLeft = 0;
    for (const char of indentStr) {
      if (char === '\t') {
        marginLeft += baseIndentPx; // 탭 1개당 baseIndentPx 여백 (예: 16px)
      } else if (char === ' ') {
        marginLeft += (baseIndentPx / 4);  // 공백 1개당 baseIndentPx / 4 여백 (예: 4px)
      }
    }

    if (marginLeft > 0) {
      return { marginLeft: `${marginLeft}px` };
    }
    return {};
  }, [listIndent]);

// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0002] MarkdownViewer ➔ rehypeSourceLinesPlugin
// 🎯 @KICK  : 마크다운 노드에 data-line 속성으로 원본 줄 번호를 매핑
// 🛡️ @GUARD : lineMap을 통해 processedLine을 originalLine으로 역매핑
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
  // 🛡️ [마크다운 물리 줄번호 매핑 플러그인 — 문단 내 개별 행(.onrivi-line) 1:1 초정밀 분할 매핑]
  // 블록 요소뿐만 아니라 문단(p) 내부의 각 텍스트 행을 줄바꿈(br) 단위로 <span class="onrivi-line" data-line="...">로
  // 정밀 분할 래핑하여, 에디터 커서가 위치한 특정 행(줄) 하나만 정확하게 독립 하이라이트되도록 보장합니다.
  const rehypeSourceLinesPlugin = useMemo(() => {
    return () => (tree: any) => {
      const currentLineMap = dynamicPropsRef.current.lineMap || [];
      const mapLine = (l?: number): number | undefined => {
        if (!l) return undefined;
        return currentLineMap[l - 1] || l;
      };

      const isMediaParagraph = (node: any) => {
        if (!node.children || node.children.length === 0) return false;
        const nonWs = node.children.filter((c: any) => !(c.type === 'text' && c.value.trim() === ''));
        if (nonWs.length === 1) {
          const onlyChild = nonWs[0];
          if (onlyChild.type === 'element' && ['img', 'video', 'iframe', 'source'].includes(onlyChild.tagName)) {
            return true;
          }
        }
        return false;
      };

      const visit = (node: any, parentLine?: number, listDepth: number = 0) => {
        let currentListDepth = listDepth;
        if (node.type === 'element') {
          if (!node.properties) node.properties = {};

          if (node.tagName === 'ul' || node.tagName === 'ol') {
            currentListDepth = listDepth + 1;
          }
          if (node.tagName === 'li') {
            node.properties['data-list-depth'] = listDepth;
          }

          if (node.tagName === 'p') {
            if (isMediaParagraph(node)) {
              let line = node.position?.start?.line || parentLine;
              if (line) {
                node.properties['data-line'] = mapLine(line);
              }
              if (node.children) {
                node.children.forEach((child: any) => visit(child, line, currentListDepth));
              }
              return;
            }

            const newChildren: any[] = [];
            let currentLineChildren: any[] = [];
            let pLine = node.position?.start?.line || parentLine || 1;

            const pushLine = (lineNum: number) => {
              if (currentLineChildren.length === 0) {
                currentLineChildren.push({ type: 'text', value: '\u200B' });
              }
              newChildren.push({
                type: 'element',
                tagName: 'span',
                properties: {
                  className: ['onrivi-line'],
                  'data-line': mapLine(lineNum)
                },
                children: currentLineChildren
              });
              currentLineChildren = [];
            };

            for (const child of node.children) {
              if (child.type === 'element' && child.tagName === 'br') {
                pushLine(pLine);
                pLine++;
              } else if (child.type === 'text' && child.value === '\n') {
                // br 직후의 개행 텍스트 무시
              } else {
                if (child.type === 'element') {
                  if (child.position?.start?.line) {
                    pLine = child.position.start.line;
                  }
                  visit(child, pLine, currentListDepth);
                }
                currentLineChildren.push(child);
              }
            }
            pushLine(pLine);
            node.children = newChildren;
            delete node.properties['data-line'];
            return;
          }

          let line = node.position?.start?.line || parentLine;
          if (line) {
            const mapped = mapLine(line);
            node.properties['data-line'] = mapped;

            // 💡 [에디터-미리보기 숫자 리스트 번호 1:1 일치 연동]
            // 마크다운 파서가 <ol> 내부 번호를 자동 계산하여 에디터 번호와 불일치하는 현상을 방지하기 위해,
            // 에디터 원본 텍스트의 해당 줄 번호('1.', '2.' 등)를 직접 추출하여 li value 속성으로 주입합니다.
            if (node.tagName === 'li' && mapped) {
              const rawContent = originalContentRef.current || contentRef.current || '';
              if (rawContent) {
                const lines = rawContent.split(/\r?\n/);
                const lineText = lines[mapped - 1] || '';
                const match = lineText.match(/^(?:[ \t]*>+[ \t]?)*[ \t]*(\d+)\.(?:\s+|$)/);
                if (match) {
                  node.properties.value = parseInt(match[1], 10);
                }
              }
            }
          }
        }

        if (node.children) {
          node.children.forEach((child: any) =>
            visit(child, node.type === 'element' && node.tagName === 'tr' ? node.position?.start?.line : undefined, currentListDepth)
          );
        }
      };

      visit(tree);
    };
  }, []);

// ====================================================================
// 📊 [OMD-CORE-MarkdownViewer-0001] MarkdownViewer ➔ rehypeBrRaw
// 🎯 @KICK  : raw HTML <br> 태그를 안전하게 br 엘리먼트로 교체하는 rehype 플러그인
// 🛡️ @GUARD : raw 노드를 분할하여 br 태그만 엘리먼트로, 나머지는 보존
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
  // 🛡️ [강제 수동 개행 플러그인] <br> 태그가 날것의 HTML로 들어올 때, Next.js의 rehypeRaw 삼킴 우려 없이 안전하게 br 엘리먼트로 교체합니다.
  const rehypeBrRaw = useMemo(() => {
    return () => (tree: any) => {
      const walk = (node: any) => {
        if (node.children) {
          const newChildren: any[] = [];
          for (const child of node.children) {
            // 💡 [OMD-HOTFIX] 기존 병합 파일에서 <div style="page-break-before: always"></div> 문자열이 
            // 텍스트나 인라인 코드로 파싱되어 화면에 노출되는 현상 방어 및 출판용 페이지 나누기로 강제 변환
            const isPageBreakString = (val: string) => {
              if (typeof val !== 'string') return false;
              return (
                /<!--\s*(?:onrivi:)?page-?break\s*-->/i.test(val) ||
                /<!--\s*\[page-?break\]\s*-->/i.test(val) ||
                /\\pagebreak\b/i.test(val) ||
                /\\newpage\b/i.test(val) ||
                val.includes('page-break-before: always') ||
                val.includes('break-before: page') ||
                val.includes('class="page-break"') ||
                val.includes('class="onrivi-page-break"') ||
                val.includes('data-onrivi-page-break')
              );
            };

            const makePageBreakElement = () => ({
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['onrivi-page-break', 'page-break'],
                'data-onrivi-page-break': 'true',
                'aria-label': '수동 페이지 나누기'
              },
              children: [{ type: 'text', value: '수동 페이지 나누기' }]
            });

            if (child.type === 'comment' && isPageBreakString(child.value)) {
              newChildren.push(makePageBreakElement());
            } else if (child.type === 'raw' && /<br\s*\/?>/i.test(child.value)) {
              const parts = child.value.split(/(<br\s*\/?>)/gi);
              for (const part of parts) {
                if (/^<br\s*\/?>$/i.test(part)) {
                  newChildren.push({ type: 'element', tagName: 'br', properties: {}, children: [] });
                } else if (part) {
                  newChildren.push({ type: 'raw', value: part });
                }
              }
            } else if (child.type === 'raw' && isPageBreakString(child.value)) {
              // raw HTML 텍스트로 인식되었을 때 교체
              newChildren.push(makePageBreakElement());
            } else if (child.type === 'element' && child.tagName === 'code' && child.children?.length === 1 && child.children[0].type === 'text' && isPageBreakString(child.children[0].value)) {
              // inlineCode 안의 텍스트로 인식되었을 때 (파서 오작동 방어)
              newChildren.push(makePageBreakElement());
            } else if (child.type === 'text' && isPageBreakString(child.value)) {
              // 일반 텍스트 노드로 인식되었을 때
              const parts = child.value.split(/(<!--\s*(?:onrivi:)?page-?break\s*-->|<!--\s*\[page-?break\]\s*-->|\\pagebreak\b|\\newpage\b|<div[^>]*page-break[^>]*><\/div>|<hr[^>]*page-break[^>]*\/>)/i);
              for (const part of parts) {
                if (isPageBreakString(part)) {
                  newChildren.push(makePageBreakElement());
                } else if (part) {
                  newChildren.push({ type: 'text', value: part });
                }
              }
            } else {
              if (child.type === 'element' && (child.properties?.className?.includes?.('page-break') || child.properties?.className?.includes?.('onrivi-page-break') || child.properties?.['data-onrivi-page-break'])) {
                if (!child.properties) child.properties = {};
                child.properties['data-onrivi-page-break'] = 'true';
                const curClasses = Array.isArray(child.properties.className) ? child.properties.className : (typeof child.properties.className === 'string' ? child.properties.className.split(/\s+/) : []);
                child.properties.className = Array.from(new Set([...curClasses, 'onrivi-page-break', 'page-break']));
              }
              newChildren.push(child);
              if (child.children) walk(child);
            }
          }
          node.children = newChildren;
        }
      };
      walk(tree);
    };
  }, []);

  const processedContent = useMemo(() => bulletNumbersAsText(cleanContent), [cleanContent]);

  return (
    <div
      ref={containerRef}
      className="markdown-viewer-root onrivi-content-root bg-transparent mx-auto relative"
      data-export-content={exportContentFingerprint(originalContent ?? content)}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        minHeight: '100%',
        boxShadow: 'none',
        borderRadius: '0px',
        paddingTop: marginTop || '0',
        paddingBottom: marginBottom || '0',
        paddingLeft: marginLeft || '0',
        paddingRight: marginRight || '0',
        ['--list-indent' as any]: listIndent || '28px',
        ['--li-marker-gap' as any]: (picturebookProfile?.rules?.li?.['padding-inline-start'] || picturebookProfile?.rules?.li?.['padding-left'] || '0px'),
        ['--li-margin-bottom' as any]: (picturebookProfile?.rules?.li?.['margin-bottom'] || '6px'),
      }}
    >
      <style>{`
        .markdown-viewer-root,
        .onrivi-content-root {
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .onrivi-content-root p,
        .onrivi-content-root blockquote,
        .onrivi-content-root h1,
        .onrivi-content-root h2,
        .onrivi-content-root h3,
        .onrivi-content-root h4,
        .onrivi-content-root h5,
        .onrivi-content-root h6 {
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
        }
        .onrivi-content-root .onrivi-sentence-br {
          display: block !important;
          height: 0px !important;
        }
        .onrivi-content-root ul,
        .onrivi-content-root ol {
          white-space: normal !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root ul ul {
          list-style-type: circle !important;
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root ul ul ul {
          list-style-type: square !important;
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root ol ol {
          list-style-type: lower-alpha !important;
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root ol ol ol {
          list-style-type: lower-roman !important;
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root blockquote ul ul,
        .onrivi-content-root blockquote ol ol,
        .onrivi-content-root blockquote ul ol,
        .onrivi-content-root blockquote ol ul {
          padding-left: var(--list-indent, 1.5em);
        }
        .onrivi-content-root ul + p,
        .onrivi-content-root ol + p {
          margin-top: 1.5em !important;
        }
        .onrivi-content-root p + ul,
        .onrivi-content-root p + ol {
          margin-top: 1.2em !important;
        }
        .onrivi-content-root li {
          white-space: normal !important;
          margin-top: 0 !important;
          margin-left: 0;
          margin-right: 0;
          margin-bottom: var(--li-margin-bottom, 6px);
          padding-top: 1px !important;
          padding-bottom: 1px !important;
          padding-inline-start: var(--li-marker-gap, 0px) !important;
          padding-left: var(--li-marker-gap, 0px) !important;
          line-height: 1.6 !important;
        }
        .onrivi-content-root li > p,
        .onrivi-content-root li > div,
        .onrivi-content-root li p {
          margin: 0 !important;
          padding: 0 !important;
          display: inline !important;
          white-space: normal !important;
        }
        .onrivi-content-root li p .onrivi-line {
          display: inline !important;
          width: auto !important;
          min-height: 0 !important;
        }
        .onrivi-content-root li p + p {
          display: block !important;
          margin-top: 0.45em !important;
        }
        .onrivi-content-root pre,
        .onrivi-content-root pre code {
          white-space: pre !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
        }
        .onrivi-content-root code:not(pre code),
        .onrivi-content-root p code,
        .onrivi-content-root li code {
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        .markdown-viewer-root figure {
            margin: 0 !important;
          }
          .markdown-viewer-root figure figcaption {
            margin-top: 0.5rem !important;
            margin-bottom: 0 !important;
          }
        .markdown-viewer-root th:not([style*="text-align"]) {
          text-align: center !important;
        }
        /* 🌟 [우측 정렬 / 중앙 정렬 100% 보장] */
        .markdown-viewer-root [align="right"],
        .onrivi-content-root [align="right"],
        .markdown-viewer-root [style*="text-align: right"],
        .onrivi-content-root [style*="text-align: right"],
        .markdown-viewer-root [style*="text-align:right"],
        .onrivi-content-root [style*="text-align:right"],
        .markdown-viewer-root .text-right,
        .onrivi-content-root .text-right {
          text-align: right !important;
        }
        .markdown-viewer-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
        .markdown-viewer-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
        .markdown-viewer-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th) {
          text-align: right !important;
        }
        .markdown-viewer-root [align="right"] ul,
        .markdown-viewer-root [align="right"] ol,
        .onrivi-content-root [align="right"] ul,
        .onrivi-content-root [align="right"] ol,
        .markdown-viewer-root [style*="text-align: right"] ul,
        .markdown-viewer-root [style*="text-align: right"] ol,
        .onrivi-content-root [style*="text-align: right"] ul,
        .onrivi-content-root [style*="text-align: right"] ol {
          display: inline-block !important;
          text-align: left !important;
        }
        .markdown-viewer-root [align="center"],
        .onrivi-content-root [align="center"],
        .markdown-viewer-root [style*="text-align: center"],
        .onrivi-content-root [style*="text-align: center"],
        .markdown-viewer-root [style*="text-align:center"],
        .onrivi-content-root [style*="text-align:center"],
        .markdown-viewer-root .text-center,
        .onrivi-content-root .text-center {
          text-align: center !important;
        }
        .markdown-viewer-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
        .markdown-viewer-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
        .markdown-viewer-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th),
        .onrivi-content-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th) {
          text-align: center !important;
        }
        .markdown-viewer-root [align="center"] ul,
        .markdown-viewer-root [align="center"] ol,
        .onrivi-content-root [align="center"] ul,
        .onrivi-content-root [align="center"] ol,
        .markdown-viewer-root [style*="text-align: center"] ul,
        .markdown-viewer-root [style*="text-align: center"] ol,
        .onrivi-content-root [style*="text-align: center"] ul,
        .onrivi-content-root [style*="text-align: center"] ol {
          display: inline-block !important;
          text-align: left !important;
        }
        .markdown-viewer-root .table-wrapper-area,
        .onrivi-content-root .table-wrapper-area {
          display: inline-block !important;
          width: 100% !important;
          vertical-align: top !important;
          margin-top: 4px !important;
          margin-bottom: 16px !important;
        }
        .markdown-viewer-root table,
        .onrivi-content-root table {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          border-radius: 0 !important;
          overflow: visible !important;
          box-shadow: none !important;
        }
        .markdown-viewer-root .table-wrapper-area table,
        .onrivi-content-root .table-wrapper-area table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        .markdown-viewer-root .table-wrapper-area :is(th, td),
        .onrivi-content-root .table-wrapper-area :is(th, td) {
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          box-sizing: border-box !important;
        }
        .markdown-viewer-root .table-wrapper-area :is(th, td) code,
        .onrivi-content-root .table-wrapper-area :is(th, td) code {
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
          word-break: break-all !important;
          display: inline !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        .markdown-viewer-root th,
        .onrivi-content-root th,
        .markdown-viewer-root td,
        .onrivi-content-root td {
          border-top-style: inherit !important;
          border-bottom-style: inherit !important;
          border-left-style: inherit !important;
          border-right-style: inherit !important;
        }
        .markdown-viewer-root :is(p, h1, h2, h3, h4, h5, h6, strong):has(+ .table-wrapper-area),
        .onrivi-content-root :is(p, h1, h2, h3, h4, h5, h6, strong):has(+ .table-wrapper-area) {
          margin-bottom: 6px !important;
        }
        /* 💬 인용구(blockquote) 여백 정밀 제어: BFC 및 인라인 블록 격리로 마진 상쇄 원천 차단 */
        .markdown-viewer-root blockquote,
        .onrivi-content-root blockquote {
          display: inline-block !important;
          width: 100% !important;
          vertical-align: top !important;
        }
      `}</style>
      {(customCss || frontmatterCustomCss) && (
        <style dangerouslySetInnerHTML={{ __html: `
          ${customCss ? `/* === [User Custom CSS - Prop] === */\n${customCss}\n` : ''}
          ${frontmatterCustomCss ? `/* === [Frontmatter Custom CSS] === */\n${frontmatterCustomCss}\n` : ''}
        ` }} />
      )}
      <div className="print:!block">
        <ReactMarkdown
          urlTransform={(uri) => {
            // 🛡️ [보안 필터 강화] XSS 공격 방어 (javascript: 차단, blob: 등 허용)
            const cleanUri = DOMPurify.sanitize(uri);
            if (cleanUri.trim().toLowerCase().startsWith('javascript:')) return '';
            return cleanUri;
          }}
          remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkExtendedTable, remarkBreaks, remarkMath, remarkDisableIndentedCode, remarkCodeBlockMetadata, remarkKoreanStrong,remarkPageBreak,remarkQuoteIndent, remarkEmptyDocumentLinkLabels]}
          rehypePlugins={[
            [rehypeKatex, { strict: false }],
            rehypeBrRaw,
            rehypeRaw,
            rehypeHighlight,
            rehypeSourceLinesPlugin,
            rehypePreserveFootnotes,
            [rehypeBibliography, {content:bibContent || '',suppressList:suppressBibliography}],
          ]}
          remarkRehypeOptions={{ handlers: extendedTableHandlers }}
          components={useMemo(() => ({
            source: ({ node, src, ...props }: any) => {
              if (!src) return <source {...props} />;
              
              let actualSrc = src;
              try { if (actualSrc) actualSrc = decodeURI(actualSrc); } catch(e){}
              
              let absolutePath = actualSrc;
              const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

              if (actualSrc && (actualSrc.startsWith('/media/') || actualSrc.startsWith('./media/') || actualSrc.startsWith('media/'))) {
                const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
                if (freshRF) {
                  const sep = freshRF.includes('\\') ? '\\' : '/';
                  const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
                  const strippedSrc = actualSrc.startsWith('./') ? actualSrc.substring(1) : (actualSrc.startsWith('/') ? actualSrc : '/' + actualSrc);
                  const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
                  absolutePath = cleanRoot + normalizedSrc;
                } else {
                  absolutePath = '';
                }
              }
              
              let finalSrc = actualSrc;
              if (api) {
                const isHttp = actualSrc.startsWith('http://') || actualSrc.startsWith('https://');
                if (isHttp) {
                  finalSrc = `media://?url=${encodeURIComponent(actualSrc)}`;
                } else if (absolutePath && absolutePath !== actualSrc) {
                  finalSrc = `media-local://serve?url=${encodeURIComponent(absolutePath)}`;
                } else {
                  finalSrc = absolutePath;
                }
              }

              return <source src={finalSrc} {...props} />;
            },
            video: ({ node, src, children, ...props }: any) => {
              let actualSrc = src;
              if (!actualSrc && children) {
                // Try to find source child
                React.Children.forEach(children, (child: any) => {
                  if (child && child.type === 'source' && child.props && child.props.src) {
                    actualSrc = child.props.src;
                  }
                });
              }

              if (!actualSrc) return <video {...props}>{children}</video>;
              try { if (actualSrc) actualSrc = decodeURI(actualSrc); } catch(e){}
              if (actualSrc && actualSrc.startsWith('onrivi/')) {
                actualSrc = '/' + actualSrc;
              }
              
              let videoSrc = actualSrc;
              let absolutePath = actualSrc;
              const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

              if (actualSrc && (actualSrc.startsWith('/media/') || actualSrc.startsWith('./media/') || actualSrc.startsWith('media/'))) {
                const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
                if (freshRF) {
                  const sep = freshRF.includes('\\') ? '\\' : '/';
                  const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
                  const strippedSrc = actualSrc.startsWith('./') ? actualSrc.substring(1) : (actualSrc.startsWith('/') ? actualSrc : '/' + actualSrc);
                  const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
                  absolutePath = cleanRoot + normalizedSrc;
                } else {
                  absolutePath = '';
                }
              }
              
              let finalSrc = api ? absolutePath : actualSrc;
              
              // 외부 비디오 URL도 media:// 프록시 우회 적용
              const isHttp = actualSrc.startsWith('http://') || actualSrc.startsWith('https://');
              if (isHttp && api) {
                finalSrc = `media://?url=${encodeURIComponent(actualSrc)}`;
              }

              const videoAlign = props['data-align'] || node?.properties?.dataAlign || 'center';
              const alignItems = videoAlign === 'left' ? 'flex-start' : videoAlign === 'right' ? 'flex-end' : 'center';
              return attachMediaActions('video', src || actualSrc, node, (
                <figure data-line={extractDataLine(props, node)} className="onrivi-video-figure" style={{ display: 'flex', flexDirection: 'column', alignItems, width: '100%', clear: 'both' }}>
                  <div className="relative flex flex-col onrivi-video-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems, width: '100%', maxWidth: '100%' }}>
                    <AsyncVideo
                      src={finalSrc}
                      absolutePath={absolutePath}
                      rootFolder={dynamicPropsRef.current.rootFolder}
                      resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
                      workspaceType={dynamicPropsRef.current.workspaceType}
                      api={api}
                      {...props}
                    />
                  </div>
                </figure>
              ));
            },
            img: ({ node, src, alt, style, ...props }: any) => {
              if (!src) return <img alt={alt} {...props} />;
              
              // 💡 [쿼리 스트링 분리 가드]
              // 이미지 URL 내에 ?width=300&height=200 등의 쿼리 파라미터가 덧붙여 있는 경우,
              // 로컬 파일 경로 해석 시 이 쿼리가 포함되면 404 에러가 나므로 분리 처리합니다.
              let pureSrc = src;
              let queryString = '';
              const qIndex = src.indexOf('?');
              if (qIndex !== -1) {
                pureSrc = src.substring(0, qIndex);
                queryString = src.substring(qIndex);
              }
              try { if (pureSrc) pureSrc = decodeURI(pureSrc); } catch(e){}

              let finalSrc = pureSrc;
              let absolutePath = pureSrc;
              const isHttp = pureSrc.startsWith('http://') || pureSrc.startsWith('https://');
              const isBlobOrData = pureSrc.startsWith('data:') || pureSrc.startsWith('blob:');
              const isExternal = isHttp || isBlobOrData;
              const isR2ApiPath = pureSrc.startsWith('/api/image/');

              // 🛡️ media://local/serve → Electron 전용, 웹에선 filePath 추출
              const isMediaServe = pureSrc === 'media://local/serve';
              let mediaFilePath = '';
              if (isMediaServe && queryString) {
                const urlMatch = queryString.match(/[?&]url=([^&]+)/);
                if (urlMatch) mediaFilePath = decodeURIComponent(urlMatch[1]);
              }

              if (isR2ApiPath) {
                const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
                if (api || process.env.NODE_ENV === 'development') {
                  finalSrc = `https://onrivi.com${pureSrc}`;
                } else {
                  finalSrc = pureSrc;
                }
                if (queryString) {
                  finalSrc += finalSrc.includes('?') ? '&' + queryString.substring(1) : queryString;
                }
              } else if (isMediaServe && mediaFilePath) {
                // media://local/serve → 웹에선 /api/view?filePath=... 로 변환
                const api = (window as any).electronAPI;
                if (api) {
                  finalSrc = `media://local/serve?url=${encodeURIComponent(mediaFilePath)}`;
                } else if (process.env.NODE_ENV === 'development') {
                  finalSrc = `/api/view?filePath=${encodeURIComponent(mediaFilePath)}`;
                } else {
                  finalSrc = mediaFilePath;
                }
                if (queryString && !finalSrc.includes('?')) {
                  // 쿼리스트링에 url=... 외 다른 파라미터가 있을 경우 처리
                  const otherParams = queryString.replace(/[?&]url=[^&]*/, '');
                  if (otherParams) finalSrc += otherParams;
                }
              } else if (!isExternal && typeof window !== 'undefined') {
                const api = (window as any).electronAPI;
                const isDriveWorkspace = getResourceSettings()?.kind === 'drive';
                const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(pureSrc);
                // 💡 [마크다운 루트 상대경로 지원]
                // 마크다운 문법에서 /assets/img.png 처럼 최상단 슬래시(/)로 시작하는 경로는 
                // 워크스페이스의 루트 폴더를 기준으로 하는 상대 경로(Root-Relative)로 해석해야 합니다.
                const isRootRelative = pureSrc.startsWith('/');

                const isWelcomePage = dynamicPropsRef.current.currentFilePath && (
                  dynamicPropsRef.current.currentFilePath.endsWith('Welcome.md') || 
                  dynamicPropsRef.current.currentFilePath.endsWith('Welcome.markdown') || 
                  dynamicPropsRef.current.currentFilePath === 'Welcome.md'
                );

                // hero.png만 웰컴 에셋으로 취급하거나, 순수하게 Welcome.md가 렌더링 중일 때만
                const isWelcomeAsset = (pureSrc === './hero.png' || pureSrc === 'hero.png') && isWelcomePage;

                const isHelpAsset = pureSrc.startsWith('/help/assets/') || 
                                    pureSrc.startsWith('help/assets/') || 
                                    pureSrc.startsWith('./assets/') || 
                                    pureSrc.startsWith('assets/') ||
                                    pureSrc.includes('help/assets/');

                const isMediaPrefix = pureSrc.startsWith('/media/') || pureSrc.startsWith('media/') || pureSrc.startsWith('./media/') || pureSrc.includes('/media/') || pureSrc.includes('\\media\\');
                const hasSubdir = pureSrc.includes('/') || pureSrc.includes('\\');

                const isLocalMedia = !isExternal && !isWelcomeAsset && !isHelpAsset && (
                  isMediaPrefix || 
                  (!hasSubdir && (
                    pureSrc.endsWith('.png') || 
                    pureSrc.endsWith('.jpg') || 
                    pureSrc.endsWith('.jpeg') || 
                    pureSrc.endsWith('.gif') || 
                    pureSrc.endsWith('.webp') ||
                    pureSrc.endsWith('.svg')
                  ))
                );

                if (isHelpAsset) {
                  const fileName = pureSrc.split('/').pop()?.split('?')[0] || '';
                  finalSrc = `/help/assets/${fileName}`;
                  absolutePath = `/help/assets/${fileName}`;
                  if (queryString) {
                    finalSrc += queryString;
                  }
                } else if (isDriveWorkspace) {
                  // Cloud paths stay relative until AsyncImage resolves them through Drive.
                  absolutePath = pureSrc;
                } else if (isLocalMedia && (api || (dynamicPropsRef.current.rootFolderPath && dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME))) {
                  // 💡 [핵심] 리소스 폴더에서만 절대 경로 조합 (rootFolderPath 임의 폴백 원천 차단)
                  const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
                  const hasRFHandle = !!dynamicPropsRef.current.resourceFolderHandle || (typeof window !== 'undefined' && !!(window as any).__resourceFolderHandle);

                  // 🚨 [필수 규격] 리소스 폴더가 지정되지 않은 경우: 다른 폴더로 폴백하지 않고 미지정 경고 플레이스홀더를 렌더링
                  if (!freshRF && !hasRFHandle && !dynamicPropsRef.current.rootFolder?.handle) {
                    return (
                      <span className="inline-flex items-center gap-2 px-3.5 py-2 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-xs select-none">
                        <span className="text-sm">⚠️</span>
                        <span>[리소스 폴더 미지정] 환경설정에서 공통 자원 폴더를 지정해야 이미지가 표시됩니다.</span>
                      </span>
                    );
                  }

                  if (freshRF && freshRF !== BROWSER_STORAGE_NAME) {
                    const sep = freshRF.includes('\\') ? '\\' : '/';
                    const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
                    
                    let cleanSrc = pureSrc;
                    if (cleanSrc.startsWith('./')) cleanSrc = cleanSrc.substring(2);
                    if (cleanSrc.startsWith('/')) cleanSrc = cleanSrc.substring(1);
                    
                    // 서브폴더가 없는 단순 파일명이고 media 접두사가 없는 경우에만 media 하위로 기본 매칭
                    const hasSubdir = cleanSrc.includes('/') || cleanSrc.includes('\\');
                    let normalizedRelative = cleanSrc;
                    if (!hasSubdir && !cleanSrc.startsWith('media/') && !cleanSrc.startsWith('media\\')) {
                      normalizedRelative = 'media' + sep + cleanSrc;
                    }
                    
                    const normalizedSrc = sep === '\\' ? normalizedRelative.replace(/\//g, '\\') : normalizedRelative.replace(/\\/g, '/');
                    absolutePath = cleanRoot + sep + normalizedSrc;
                  }
                } else if (isRootRelative && dynamicPropsRef.current.rootFolderPath && dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME && !isWelcomeAsset) {
                  // 워크스페이스 루트 상대 경로 처리 (예: /assets/img.png -> 워크스페이스경로/assets/img.png)
                  const sep = dynamicPropsRef.current.rootFolderPath.includes('\\') ? '\\' : '/';
                  const cleanRoot = dynamicPropsRef.current.rootFolderPath.endsWith(sep) ? dynamicPropsRef.current.rootFolderPath.slice(0, -1) : dynamicPropsRef.current.rootFolderPath;
                  const normalizedSrc = sep === '\\' ? pureSrc.replace(/\//g, '\\') : pureSrc;
                  absolutePath = cleanRoot + normalizedSrc;
                } else if (isRootRelative && (!dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolderPath === BROWSER_STORAGE_NAME) && dynamicPropsRef.current.currentFilePath && !isWelcomeAsset) {
                  // 폴더 연동 없이 단일 파일만 연 상태에서 /assets/ 등 루트 상대 경로가 사용된 경우, 현재 파일 기준으로 풀이
                  const srcWithoutSlash = pureSrc.startsWith('/') ? pureSrc.substring(1) : pureSrc;
                  absolutePath = resolveRelativeImagePath(srcWithoutSlash, dynamicPropsRef.current.currentFilePath);
                } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.currentFilePath && !isWelcomeAsset) {
                  absolutePath = resolveRelativeImagePath(pureSrc, dynamicPropsRef.current.currentFilePath);
                } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.rootFolderPath && dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME && !isWelcomeAsset) {
                  const sep = dynamicPropsRef.current.rootFolderPath.includes('/') ? '/' : '\\';
                  const folder = dynamicPropsRef.current.rootFolderPath.endsWith(sep) ? dynamicPropsRef.current.rootFolderPath : dynamicPropsRef.current.rootFolderPath + sep;
                  absolutePath = folder + pureSrc;
                } else if (isWelcomeAsset) {
                  absolutePath = pureSrc.startsWith('./') ? pureSrc.slice(2) : pureSrc.startsWith('/') ? pureSrc.slice(1) : pureSrc;
                }
                
                if (api) {
                  // Desktop API calls handle the absolutePath directly, so we just use it.
                  finalSrc = absolutePath;
                } else {
                  // 웹 환경에서는 브라우저 로컬(상대/절대) 경로를 가장 먼저 시도합니다.
                  finalSrc = pureSrc;
                }
                
                if (queryString) {
                  // 💡 온리비 고유의 크기/정렬 파라미터들 (width, height, align, w, h, a)을 제거하여 외부 CDN 서버 오작동 방지
                  const cleanQuery = queryString
                    .replace(/([?&])(?:width|w)=[^&]*/gi, '')
                    .replace(/([?&])(?:height|h)=[^&]*/gi, '')
                    .replace(/([?&])(?:align|a)=[^&]*/gi, '')
                    .replace(/&&+/g, '&')
                    .replace(/\?&/, '?')
                    .replace(/[?&]$/, '');

                  if (cleanQuery && cleanQuery !== '?') {
                    if (finalSrc.includes('?')) {
                      finalSrc += '&' + cleanQuery.substring(1);
                    } else {
                      finalSrc += cleanQuery.startsWith('?') ? cleanQuery : '?' + cleanQuery;
                    }
                  }
                }
              }

              // 🛡️ [GitHub CORS 방어 가드]
              // github.com의 blob 웹페이지 주소는 CORS 차단이 걸리므로 raw.githubusercontent.com 원본 데이터 주소로 자동 교정합니다.
              if (finalSrc.startsWith('https://github.com/') && finalSrc.includes('/blob/')) {
                finalSrc = finalSrc
                  .replace('https://github.com/', 'https://raw.githubusercontent.com/')
                  .replace('/blob/', '/');
              }

              // 🛡️ [로컬 public 경로 보정 가드]
              // 마크다운에 frontend/public/ 또는 public/ 형태로 경로가 삽입된 경우 웹서버 루트(/) 주소로 자동 치환하여 VFS 오류를 방지합니다.
              if (finalSrc.startsWith('frontend/public/')) {
                finalSrc = finalSrc.replace('frontend/public/', '/');
              } else if (finalSrc.startsWith('public/')) {
                finalSrc = finalSrc.replace('public/', '/');
              }

              // 💡 [외부 HTTP 이미지 프록시 라우팅]
              // 데스크탑 환경에서 외부 이미지가 403 Forbidden 등으로 로드 실패하는 것을 방지하기 위해 
              // 메인 프로세스의 media:// 프록시로 넘깁니다.
              if (isHttp && typeof window !== 'undefined') {
                const api = (window as any).electronAPI;
                if (api) {
                  finalSrc = `media://?url=${encodeURIComponent(finalSrc)}`;
                }
              }

              let width: string | undefined;
              let height: string | undefined;
              let align: string | undefined;
              let urlCaptionPos: 'top' | 'bottom' | undefined;
              try {
                const wMatch = src.match(/[?&](?:width|w)=([^&#]+)/);
                const hMatch = src.match(/[?&](?:height|h)=([^&#]+)/);
                const aMatch = src.match(/[?&](?:align|a)=([^&#]+)/);
                const cMatch = src.match(/[?&](?:caption|captionPos|captionPosition)=([^&#]+)/);
                if (wMatch) width = decodeURIComponent(wMatch[1]);
                if (hMatch) height = decodeURIComponent(hMatch[1]);
                if (aMatch) align = decodeURIComponent(aMatch[1]);
                if (cMatch) {
                  const cVal = decodeURIComponent(cMatch[1]).toLowerCase();
                  if (cVal === 'top' || cVal === 'bottom') urlCaptionPos = cVal;
                }
              } catch (e) {}

              // 💡 [단위 자동 보완 가드]
              if (width && /^\d+$/.test(width)) width = `${width}px`;
              if (height && /^\d+$/.test(height)) height = `${height}px`;

              const imgStyle: React.CSSProperties = {
                ...style, maxWidth: '100%',
              };
              if (width) imgStyle.width = width;
              if (height) imgStyle.height = height;
              
              let figureStyle: React.CSSProperties = {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                clear: 'both',
                marginTop: '0.75rem',
                marginBottom: '1.25rem',
              };

              let forceAlignClass = '';
              if (align === 'left') {
                figureStyle.alignItems = 'flex-start';
                figureStyle.textAlign = 'left';
                imgStyle.alignSelf = 'flex-start';
                imgStyle.marginLeft = '0px';
                imgStyle.marginRight = 'auto';
                forceAlignClass = 'force-align-left';
              } else if (align === 'right') {
                figureStyle.alignItems = 'flex-end';
                figureStyle.textAlign = 'right';
                imgStyle.alignSelf = 'flex-end';
                imgStyle.marginLeft = 'auto';
                imgStyle.marginRight = '0px';
                forceAlignClass = 'force-align-right';
              } else if (align === 'center') {
                figureStyle.alignItems = 'center';
                figureStyle.textAlign = 'center';
                imgStyle.alignSelf = 'center';
                imgStyle.marginLeft = 'auto';
                imgStyle.marginRight = 'auto';
                forceAlignClass = 'force-align-center';
              }
              
              const imgElement = attachMediaActions('image',src,node, (
                <AsyncImage
                  showCopyControl={!dynamicPropsRef.current.onMediaEdit && !dynamicPropsRef.current.mediaControlsManaged}
                  src={finalSrc} 
                  alt={alt} 
                  absolutePath={absolutePath} 
                  rootFolder={dynamicPropsRef.current.rootFolder} 
                  resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
                  resourceFolder={dynamicPropsRef.current.resourceFolder}
                  workspaceType={dynamicPropsRef.current.workspaceType} 
                  api={typeof window !== 'undefined' ? (window as any).electronAPI : null} 
                  queryString={queryString} 
                  style={imgStyle} 
                  className={`rounded-lg shadow-sm border border-zinc-200/30 ${forceAlignClass}`} 
                  onImageLoaded={onImageLoaded}
                  {...props} 
                />
              ));
              
              const line = extractDataLine(props, node);
              const profileCaptionPos = picturebookProfile?.mediaCaptionStructure?.kindOverrides?.image?.position
                || picturebookProfile?.mediaCaptionStructure?.position
                || 'top';
              const captionPos = urlCaptionPos || profileCaptionPos;
              const hasValidCaption = Boolean(alt && alt.trim() !== '' && !/^[\\\[\]\s]+$/.test(alt));
              if (hasValidCaption) {
                const displayCaption = (alt || '').replace(/\\([\\\[\]])/g, '$1');
                return (
                  <figure data-line={line} data-caption-position={captionPos} className={`onrivi-image-figure caption-${captionPos}`} style={figureStyle}>
                    {captionPos === 'top' && (
                      <figcaption data-position="top" className="text-[0.88em] tracking-tight text-zinc-600 dark:text-zinc-300 mb-1 mt-0 font-medium" style={{ order: -1, ...(align ? { textAlign: align as any, alignSelf: figureStyle.alignItems } : {}) }}>
                        {displayCaption}
                      </figcaption>
                    )}
                    {imgElement}
                    {captionPos === 'bottom' && (
                      <figcaption data-position="bottom" className="text-[0.88em] tracking-tight text-zinc-500 dark:text-zinc-400 mt-1 mb-0 font-medium" style={{ order: 1, ...(align ? { textAlign: align as any, alignSelf: figureStyle.alignItems } : {}) }}>
                        {displayCaption}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              return (
                <div data-line={line} className="onrivi-image-figure" style={figureStyle}>
                  {imgElement}
                </div>
              );
            },
            a: ({ node, href, children, ...props }: any) => {
              const isWebLink = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('www.'));
              const isAnchor = href && (href.startsWith('#') || href.startsWith('.#'));
              
              if (isAnchor) {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  const targetId = decodeURIComponent(href.startsWith('.#') ? href.slice(2) : href.slice(1));
                  
                  let targetEl = document.getElementById(targetId);
                  
                  if (!targetEl && targetId.includes('fnref-')) {
                    const fnId = targetId.replace('fnref-', 'fn-');
                    targetEl = document.querySelector(`a[href="#${fnId}"]`) || document.getElementById(fnId.replace('user-content-', ''));
                  }

                  if (!targetEl) {
                    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    const cleanTarget = targetId.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                    for (const h of Array.from(headings)) {
                      const headingText = h.textContent?.trim() || '';
                      const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                      if (cleanHeading === cleanTarget || h.id === targetId || (cleanTarget.length > 2 && cleanHeading.includes(cleanTarget))) {
                        targetEl = h as HTMLElement;
                        break;
                      }
                    }
                  }

                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                };
                return <a href={href} onClick={handleClick} {...props}>{children}</a>;
              }

              let rawHref = (href || '').trim();
              if (rawHref.startsWith('<') && rawHref.endsWith('>')) {
                rawHref = rawHref.slice(1, -1).trim();
              }
              rawHref = rawHref.replace(/^[<"']|[>"']$/g, '').trim();
              try { rawHref = decodeURIComponent(rawHref); } catch {}

              const isKnowledgeLink = rawHref && rawHref.startsWith('knowledge://');
              const isFileLink = rawHref && (rawHref.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(rawHref));
              const isMdFile = rawHref && /\.(md|markdown)(?:[?#]|$)/i.test(rawHref);
              const isFolderLink = rawHref && !isWebLink && !isKnowledgeLink && !isMdFile && (
                rawHref.startsWith('./') || rawHref.startsWith('../') || rawHref.startsWith('/') || rawHref.endsWith('/') || !rawHref.split(/[#?]/)[0].split(/[/\\]/).pop()?.includes('.')
              );

              if (rawHref && !isWebLink && isFolderLink) {
                const cleanHref = rawHref.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();

                let resolved = cleanHref;
                if (cleanHref.startsWith('file:///')) {
                  resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
                } else {
                  resolved = resolveDocumentLink(cleanHref, dynamicPropsRef.current.currentFilePath);
                }

                const folderName = cleanHref.replace(/\/+$/, '').split(/[/\\]/).filter(Boolean).pop() || '폴더';
                const electronApi = typeof window !== 'undefined' ? ((window as any).electronAPI || (window as any).api) : null;

                const handleFolderClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // 🛡️ [작업장 실폴더 외부 이탈 차단 가드]
                  const guard = isPathInsideWorkspace(
                    cleanHref,
                    dynamicPropsRef.current.currentFilePath,
                    dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolder?.path,
                    dynamicPropsRef.current.rootFolder?.name
                  );
                  if (!guard.isInside) {
                    dynamicPropsRef.current.showToast?.(
                      `⚠️ ${guard.reason || '작업장 실폴더 외부에 있는 폴더는 연결할 수 없습니다.'}`,
                      'warning'
                    );
                    return;
                  }
                  resolved = guard.resolvedPath || resolved;

                  const isCmdOrCtrl = e.ctrlKey || e.metaKey;

                  // 🌟 데스크톱 환경에서 Ctrl+클릭 시: OS 시스템 탐색기(Windows 폴더 창) 열기
                  if (isCmdOrCtrl && electronApi?.openPath) {
                    try {
                      electronApi.openPath(resolved);
                      dynamicPropsRef.current.showToast?.(`'📁 ${folderName}' 시스템 폴더 창을 열었습니다.`, 'info');
                      return;
                    } catch {}
                  }

                  // 🌟 기본 클릭 (웹 & 데스크톱 모두 온리비 표준 권장 방식):
                  // 앱 내부 좌측 탐색기(LeftSidebar)에서 해당 폴더를 자동으로 펼치고 부드럽게 스크롤 & 코발트 펄스 하이라이트
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app:focus-tree-folder', {
                      detail: { folderPath: resolved, folderName }
                    }));
                  }
                };

                const folderTitle = electronApi?.openPath
                  ? `📁 탐색기에서 '${folderName}' 열기 (Ctrl+클릭 시 시스템 폴더 열기)`
                  : `📁 탐색기에서 '${folderName}' 열기`;

                return (
                  <a 
                    href={href} 
                    onClick={handleFolderClick} 
                    title={folderTitle}
                    className="onrivi-folder-link inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    {...props}
                  >
                    <span className="opacity-75 text-[0.9em] select-none">📁</span>
                    {children}
                  </a>
                );
              }

              if (href && !isWebLink && (isMdFile || isKnowledgeLink || isFileLink)) {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (dynamicPropsRef.current.onFileOpen) {
                    // 1) 꺾쇠 <...>, 따옴표 제거 및 URI 디코딩 선행 정제
                    let unbracketed = (href || '').trim();
                    if (unbracketed.startsWith('<') && unbracketed.endsWith('>')) {
                      unbracketed = unbracketed.slice(1, -1).trim();
                    }
                    unbracketed = unbracketed.replace(/^[<"']|[>"']$/g, '').trim();
                    try { unbracketed = decodeURIComponent(unbracketed); } catch {}

                    if (isKnowledgeLink) {
                      const hashPart = unbracketed.includes('#') ? unbracketed.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim() : undefined;
                      dynamicPropsRef.current.onFileOpen(unbracketed, hashPart || undefined);
                      return;
                    }

                    const cleanHref = unbracketed.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();
                    const hashPart = unbracketed.includes('#') ? unbracketed.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim() : undefined;

                    // 🛡️ [작업장 실폴더 외부 이탈 차단 가드]
                    const guard = isPathInsideWorkspace(
                      cleanHref,
                      dynamicPropsRef.current.currentFilePath,
                      dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolder?.path,
                      dynamicPropsRef.current.rootFolder?.name
                    );
                    if (!guard.isInside) {
                      dynamicPropsRef.current.showToast?.(
                        `⚠️ ${guard.reason || '작업장 실폴더 외부에 있는 문서는 연결할 수 없습니다.'}`,
                        'warning'
                      );
                      return;
                    }

                    // 검증된 경로를 우선 사용해 중복 URL 디코딩으로 경로가 달라지지 않게 한다.
                    let resolved = guard.resolvedPath || cleanHref;
                    if (cleanHref.startsWith('file:///')) {
                      if (!guard.resolvedPath) resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
                    } else if (!guard.resolvedPath) {
                      resolved = resolveDocumentLink(cleanHref, dynamicPropsRef.current.currentFilePath);
                    }
                    
                    const normalizePath = (p: string | undefined) => (p || '').replace(/\\/g, '/').toLowerCase().normalize('NFC').trim();
                    const normResolved = normalizePath(resolved);
                    const normCurrent = normalizePath(dynamicPropsRef.current.currentFilePath);
                    const isSameFile = Boolean(
                      normCurrent && (
                        normResolved === normCurrent ||
                        normResolved.endsWith('/' + normCurrent) ||
                        normCurrent.endsWith('/' + normResolved)
                      )
                    );

                    if (isSameFile) {
                      // 💡 [동일 파일 가드] 같은 파일인 경우 파일을 다시 로드하지 않고 헤딩 또는 라인 위치로 즉시 스크롤 이동합니다.
                      if (hashPart) {
                        // 1) #L15-L40 또는 #L15 라인 앵커 점프 지원
                        const lineMatch = hashPart.match(/^L?(\d+)/i);
                        if (lineMatch) {
                          const lineNum = parseInt(lineMatch[1], 10);
                          const lineEl = document.querySelector(`[data-line="${lineNum}"]`) as HTMLElement;
                          if (lineEl) {
                            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            lineEl.classList.add('preview-highlight-line');
                            setTimeout(() => lineEl.classList.remove('preview-highlight-line'), 2500);
                          }
                        } else {
                          // 2) 헤딩 ID 또는 텍스트 점프
                          const targetId = decodeURIComponent(hashPart);
                          let targetEl = document.getElementById(targetId);
                          if (!targetEl) {
                            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            const cleanTarget = targetId.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                            for (const h of Array.from(headings)) {
                              const headingText = h.textContent?.trim() || '';
                              const cleanHeading = headingText.toLowerCase().replace(/\s+/g, '').normalize('NFC');
                              if (cleanHeading === cleanTarget || h.id === targetId || (cleanTarget.length > 2 && cleanHeading.includes(cleanTarget))) {
                                targetEl = h as HTMLElement;
                                break;
                              }
                            }
                          }
                          if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetEl.classList.add('preview-highlight-line');
                            setTimeout(() => targetEl.classList.remove('preview-highlight-line'), 2500);
                          }
                        }
                      }
                      // 에디터도 함께 해당 라인/영역으로 동시 이동
                      dynamicPropsRef.current.onFileOpen(resolved, hashPart || undefined, true);
                    } else {
                      // 다른 파일인 경우 파일을 열고 라인/헤딩 해시를 함께 전달하여 탭 전환 후 스크롤
                      dynamicPropsRef.current.onFileOpen(resolved, hashPart || undefined, true);
                    }
                  }
                };
                return <a href={href} onClick={handleClick} {...props}>{children}</a>;
              }

              const apiHref = href && href.startsWith('/api/image/')
                ? `https://onrivi.com${href}`
                : href && (href.startsWith('/api/') || href.match(/^https?:\/\/localhost:/))
                  ? getApiUrl(href.replace(/^https?:\/\/localhost:\d+/, ''))
                  : href;

              const displayName = getTextFromChildren(children);

              const videoDataLine = extractDataLine(props, node);
              const youtubeMatch = href && href.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
              if (youtubeMatch && youtubeMatch[2] && youtubeMatch[2].length === 11) {
                return (
                  <VideoCard
                    src={`https://img.youtube.com/vi/${youtubeMatch[2]}/maxresdefault.jpg`}
                    href={`https://www.youtube.com/watch?v=${youtubeMatch[2]}`}
                    displayName={displayName || 'YouTube 동영상'}
                    isYoutube
                    youtubeId={youtubeMatch[2]}
                    dataLine={videoDataLine}
                    data-line={videoDataLine}
                  />
                );
              }

              const isSocialVideo = href && !youtubeMatch && /(tiktok\.com|instagram\.com\/(p|reel|tv)\/|vimeo\.com|twitch\.tv|dailymotion\.com)/i.test(href);
              if (isSocialVideo) {
                return <SocialVideoCard url={href} displayName={displayName || '동영상'} dataLine={videoDataLine} data-line={videoDataLine} />;
              }

              const isVideo = apiHref && /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/i.test(apiHref);
              if (isVideo) {
                // 쿼리 스트링 분리
                let rawApiHref = apiHref;
                try { if (rawApiHref) rawApiHref = decodeURI(rawApiHref); } catch(e){}
                let pureSrc = rawApiHref;
                let queryString = '';
                const qIndex = apiHref.indexOf('?');
                if (qIndex !== -1) {
                  pureSrc = apiHref.substring(0, qIndex);
                  queryString = apiHref.substring(qIndex);
                }

                let absolutePath = pureSrc;
                const isAbsoluteWin = /^[a-zA-Z]:[\\/]/.test(pureSrc);
                const isRootRelative = pureSrc.startsWith('/');
                const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

                // [media 처리 논리] (AsyncImage와 동일)
                const isMediaServe = pureSrc === 'media://local/serve';
                let mediaFilePath = '';
                if (isMediaServe && queryString) {
                  const urlMatch = queryString.match(/[?&]url=([^&]+)/);
                  if (urlMatch) mediaFilePath = decodeURIComponent(urlMatch[1]);
                }

                if (isMediaServe && mediaFilePath) {
                  absolutePath = mediaFilePath;
                  pureSrc = `media://local/serve?url=${encodeURIComponent(mediaFilePath)}`;
                } else if ((pureSrc.startsWith('/media/') || pureSrc.startsWith('./media/') || pureSrc.startsWith('media/')) && api) {
                  const freshRF = getEffectiveResourceFolder(dynamicPropsRef.current.resourceFolder);
                  if (freshRF) {
                    const sep = freshRF.includes('\\') ? '\\' : '/';
                    const cleanRoot = freshRF.endsWith(sep) ? freshRF.slice(0, -1) : freshRF;
                    const strippedSrc = pureSrc.startsWith('./') ? pureSrc.substring(1) : (pureSrc.startsWith('/') ? pureSrc : '/' + pureSrc);
                    const normalizedSrc = sep === '\\' ? strippedSrc.replace(/\//g, '\\') : strippedSrc;
                    absolutePath = cleanRoot + normalizedSrc;
                  } else {
                    absolutePath = '';
                  }
                } else if (isRootRelative && dynamicPropsRef.current.rootFolderPath && dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME) {
                  const sep = dynamicPropsRef.current.rootFolderPath.includes('\\') ? '\\' : '/';
                  const cleanRoot = dynamicPropsRef.current.rootFolderPath.endsWith(sep) ? dynamicPropsRef.current.rootFolderPath.slice(0, -1) : dynamicPropsRef.current.rootFolderPath;
                  const normalizedSrc = sep === '\\' ? pureSrc.replace(/\//g, '\\') : pureSrc;
                  absolutePath = cleanRoot + normalizedSrc;
                } else if (isRootRelative && (!dynamicPropsRef.current.rootFolderPath || dynamicPropsRef.current.rootFolderPath === BROWSER_STORAGE_NAME) && dynamicPropsRef.current.currentFilePath) {
                  const srcWithoutSlash = pureSrc.startsWith('/') ? pureSrc.substring(1) : pureSrc;
                  absolutePath = resolveRelativeImagePath(srcWithoutSlash, dynamicPropsRef.current.currentFilePath);
                } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.currentFilePath) {
                  absolutePath = resolveRelativeImagePath(pureSrc, dynamicPropsRef.current.currentFilePath);
                } else if (!isAbsoluteWin && !isRootRelative && dynamicPropsRef.current.rootFolderPath && dynamicPropsRef.current.rootFolderPath !== BROWSER_STORAGE_NAME) {
                  const sep = dynamicPropsRef.current.rootFolderPath.includes('/') ? '/' : '\\';
                  const folder = dynamicPropsRef.current.rootFolderPath.endsWith(sep) ? dynamicPropsRef.current.rootFolderPath : dynamicPropsRef.current.rootFolderPath + sep;
                  absolutePath = folder + pureSrc;
                }

                let finalSrc = api ? absolutePath : pureSrc;
                if (pureSrc.startsWith('/api/image/')) {
                  if (api || process.env.NODE_ENV === 'development') {
                    finalSrc = `https://onrivi.com${pureSrc}`;
                  } else {
                    finalSrc = pureSrc;
                  }
                  if (queryString) {
                    finalSrc += finalSrc.includes('?') ? '&' + queryString.substring(1) : queryString;
                  }
                }

                let finalDisplayName = displayName || apiHref.split('/').pop()?.split('?')[0] || '동영상';
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-zA-Z0-9]+)?$/i;
                if (uuidRegex.test(finalDisplayName)) {
                  finalDisplayName = '로컬 첨부 동영상';
                }

                return (
                  <figure data-line={videoDataLine} className="onrivi-video-figure" style={{ display: 'flex', flexDirection: 'column', width: '100%', clear: 'both' }}>
                    <AsyncVideo
                      src={finalSrc}
                      absolutePath={absolutePath}
                      rootFolder={dynamicPropsRef.current.rootFolder}
                      resourceFolderHandle={dynamicPropsRef.current.resourceFolderHandle}
                      workspaceType={dynamicPropsRef.current.workspaceType}
                      api={api}
                      queryString={queryString}
                    />
                    <figcaption className="text-[0.88em] text-zinc-500 mt-1 font-medium text-center" style={{ textAlign: 'center', alignSelf: 'center' }}>
                      {finalDisplayName}
                    </figcaption>
                  </figure>
                );
              }
              const handleExternalLinkClick = (e: React.MouseEvent) => {
                let targetUrl = apiHref || href || '';
                if (targetUrl.startsWith('www.')) {
                  targetUrl = `https://${targetUrl}`;
                }
                const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
                if (api?.openExternal && targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:'))) {
                  e.preventDefault();
                  e.stopPropagation();
                  api.openExternal(targetUrl);
                } else if (api?.openPath && targetUrl && (targetUrl.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(targetUrl))) {
                  e.preventDefault();
                  e.stopPropagation();
                  const cleanLocalPath = targetUrl.startsWith('file:///') ? decodeURIComponent(targetUrl.replace(/^file:\/\/\//, '')) : targetUrl;
                  api.openPath(cleanLocalPath);
                }
              };

              return (
                <a
                  href={apiHref?.startsWith('www.') ? `https://${apiHref}` : apiHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleExternalLinkClick}
                  {...props}
                >
                  {children}
                </a>
              );
            },
            th: TableHeaderCell,
            table: ({ node, children, className, ...props }: any) => {
               return (
                 <TableWrapper widths={ratiosBeforeTable(processedContent, node?.position?.start?.offset, node?.children?.[0]?.children?.[0]?.children?.length || node?.children?.[0]?.children?.length || 0)}>
                   <table className={`w-full table-fixed !m-0 !mt-0 !mb-0 ${className || ''}`} {...props}>
                     {children}
                   </table>
                 </TableWrapper>
               );
             },
            tr: ({ node, children, className, ...props }: any) => {
              const line = extractDataLine(props, node);
              return (
                <tr data-line={line} className={className} {...props}>
                  {children}
                </tr>
              );
            },
            div: ({ node, className, children, align, style, ...props }: any) => {
              const alignVal = align || (node?.properties && node.properties.align);
              const alignStyle = alignVal ? { textAlign: alignVal as any } : undefined;
              return <div className={className} align={alignVal} style={{ ...alignStyle, ...style }} {...props}>{children}</div>;
            },
            style: ({ node, children, ...props }: any) => {
              const cssText = getTextFromChildren(children);
              return <style dangerouslySetInnerHTML={{ __html: cssText }} {...props} />;
            },
            br: ({ node, ...props }: any) => <span className="onrivi-sentence-br" {...props} />,
            pre: ({ node, children, ...props }: any) => <div className="not-prose">{children}</div>,
            code: ({ node, inline, className, children, ...props }: any) => {
              const match = /language-(\S+)/.exec(className || '');
              const lang = match ? match[1] : '';
              const properties = node?.properties || {};
              const isBlock = properties['data-code-block'] === 'true' || properties.dataCodeBlock === 'true';
              const rawInfo = String(properties['data-code-info'] ?? properties.dataCodeInfo ?? lang);
              const title = String(properties['data-code-title'] ?? properties.dataCodeTitle ?? rawInfo);
              const codeContent = String(properties['data-code-text'] ?? properties.dataCodeText ?? getTextFromChildren(children).replace(/\n$/, ''));
              const isInline = !isBlock && (inline || (!match && !codeContent.includes('\n')));
              if (isInline) {
                return <code className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[0.9em] bg-zinc-200/80 dark:bg-zinc-700/90 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]" {...props}>{children}</code>;
              }
              if (lang === 'mermaid') {
                return <MermaidBlock code={codeContent} dataLine={extractDataLine(props, node)} />;
              }
              if (lang === 'math' || lang === 'latex') {
                return <MathBlock code={codeContent} dataLine={extractDataLine(props, node)} />;
              }
              return <CodeBlock lang={lang} title={title} rawInfo={rawInfo} code={codeContent} className={className} node={node} lineMap={dynamicPropsRef.current.lineMap} {...props}>{children}</CodeBlock>;
            },
            h1: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h1 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h1>;
            },
            h2: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h2 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h2>;
            },
            h3: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h3 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h3>;
            },
            h4: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h4 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h4>;
            },
            h5: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h5 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h5>;
            },
            h6: ({ node, children, style, ...props }) => {
              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              return <h6 data-onrivi-heading-numbered={hasHeadingNumber(headingNodeText(node)) ? "true" : undefined} id={origLine ? `toc-line-${origLine}` : undefined} style={{ ...style, ...getIndentStyle(node) }} {...props}>{children}</h6>;
            },
            iframe: ({ node, style, className, ...props }: any) => {
              const line = extractDataLine(props, node);
              const align = props['data-align'] || (node?.properties && (node.properties['data-align'] || node.properties['dataAlign']));
              let alignStyle: React.CSSProperties = {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                clear: 'both',
                marginTop: '0.75rem',
                marginBottom: '1.25rem',
              };
              if (align === 'left') {
                alignStyle.alignItems = 'flex-start';
              } else if (align === 'right') {
                alignStyle.alignItems = 'flex-end';
              } else if (align === 'center') {
                alignStyle.alignItems = 'center';
              }
              const src = props.src || (node?.properties && node.properties.src) || '';
              const isMap = typeof src === 'string' && (src.includes('map') || src.includes('google.com/maps'));
              const wrapperClass = isMap ? 'onrivi-map-wrapper map-embed-wrapper' : 'onrivi-iframe-wrapper';
              const figureClass = isMap ? 'onrivi-map-figure' : 'onrivi-iframe-figure';

              return attachMediaActions(isMap ? 'map' : 'video',src,node, (
                <figure data-line={line} style={alignStyle} className={figureClass}>
                  <div className={`relative flex flex-col ${wrapperClass}`} style={{ display: 'flex', flexDirection: 'column', alignItems: alignStyle.alignItems, width: '100%', maxWidth: '100%' }}>
                    <iframe
                      {...props}
                      className={`rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 max-w-full ${className || ''}`}
                      style={{ ...style, maxWidth: '100%' }}
                      loading="lazy"
                    />
                  </div>
                </figure>
              ));
            },
            input: ({ node, ...props }: any) => {
              const importedId = props['data-import-checkbox'];
              if (!importedId) return <input {...props} />;
              return <input {...props} disabled={false} checked={!!props.checked}
                onChange={e => dynamicPropsRef.current.onCheckboxToggle?.(0, e.target.checked, importedId)}
                style={{ ...props.style, cursor: 'pointer', verticalAlign: 'middle', marginRight: '0.25em' }} />;
            },
            p: ({ node, children, style, align, ...props }: any) => {
              if (!children) return <p />;
              const alignVal = align || (node?.properties && node.properties.align);
              const alignStyle = alignVal ? { textAlign: alignVal as any } : undefined;
              const combinedStyle = alignStyle ? { ...alignStyle, ...style } : style;
              // react-markdown은 마크다운 문단의 자식으로 img/video/iframe/미디어 링크가 오면 p 태그로 감쌉니다.
              // 블록 미디어 요소가 p 태그 내부에 중첩되어 생기는 규격 위반 및 DOM 분리를 방지합니다.
              const hasBlockMedia = (function check(n: any): boolean {
                if (!n) return false;
                if (n.tagName === 'img' || n.tagName === 'video' || n.tagName === 'iframe') return true;
                if (n.tagName === 'a') {
                  const href = n.properties?.href;
                  if (typeof href === 'string' && (
                    href.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/) ||
                    /(tiktok\.com|instagram\.com\/(p|reel|tv)\/|vimeo\.com|twitch\.tv|dailymotion\.com)/i.test(href) ||
                    /\.(mp4|webm|ogg|mov|avi|mkv)(\?|#|$)/i.test(href)
                  )) {
                    return true;
                  }
                }
                if (!n.children) return false;
                return n.children.some(check);
              })(node);
              
              if (hasBlockMedia) {
                return <div style={combinedStyle} align={alignVal} {...props} className="my-2">{children}</div>;
              }
              return <p style={combinedStyle} align={alignVal} {...props}>{children}</p>;
            },
            ul: ({ node, children, style, ...props }: any) => {
              const line = extractDataLine(props, node);
              const storedIndent = (props as any)['data-onrivi-list-indent'];
              const listIndentStyle = storedIndent === undefined ? {} : { marginLeft: Math.max(0, Math.min(4096, Number(storedIndent) || 0)) };
              return <ul data-line={line} style={{ ...style, ...listIndentStyle }} {...props}>{children}</ul>;
            },
            ol: ({ node, children, style, start, ...props }: any) => {
              const line = extractDataLine(props, node);
              const storedIndent = (props as any)['data-onrivi-list-indent'];
              const listIndentStyle = storedIndent === undefined ? {} : { marginLeft: Math.max(0, Math.min(4096, Number(storedIndent) || 0)) };
              return <ol start={start} data-line={line} style={{ ...style, ...listIndentStyle }} {...props}>{children}</ol>;
            },
            li: ({ node, children, style, ...props }: any) => {
              const textContent = getTextFromChildren(children).trim();
              const hasChildList = node.children && node.children.some((c: any) => c.type === 'element' && (c.tagName === 'ul' || c.tagName === 'ol'));
              const isEmptyRow = !hasChildList && textContent.replace(/\s+/g, '') === "onrivi-empty-row";

              if (isEmptyRow) {
                const liStyle = {
                  ...style,
                  listStyleType: 'none',
                  listStyle: 'none',
                  height: '12px',
                  maxHeight: '12px',
                  lineHeight: '12px',
                  overflow: 'hidden',
                  background: 'transparent',
                  margin: '0',
                  padding: '0',
                  pointerEvents: 'none'
                } as React.CSSProperties;

                return <li style={liStyle} className="onrivi-empty-list-row" {...props} />;
              }

              const line = (node as any).position?.start?.line;
              const currentLineMap = dynamicPropsRef.current.lineMap || [];
              const origLine = line ? (currentLineMap[line - 1] || line) : undefined;
              const dataLineVal = extractDataLine(props, node) || origLine;

              // 💡 [에디터-미리보기 숫자 리스트 번호 1:1 일치 연동]
              // props.value 또는 node.properties.value, 또는 원본 라인에서 직접 추출하여 에디터 번호 그대로 li에 바인딩
              let explicitValue = props.value ?? (node?.properties?.value ? Number(node.properties.value) : undefined);
              if (explicitValue === undefined && dataLineVal) {
                const targetContent = originalContentRef.current || contentRef.current;
                if (targetContent && typeof targetContent === 'string') {
                  const lines = targetContent.split(/\r?\n/);
                  const lineText = lines[dataLineVal - 1] || '';
                  const match = lineText.match(/^(?:[ \t]*>+[ \t]?)*[ \t]*(\d+)\.(?:\s+|$)/);
                  if (match) {
                    explicitValue = parseInt(match[1], 10);
                  }
                }
              }

              const modifiedChildren = React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === 'input' && (child.props as any).type === 'checkbox') {
                  return React.cloneElement(child as React.ReactElement<any>, {
                    disabled: false,
                    className: "w-4 h-4 rounded border-emerald-500/20 text-emerald-600 focus:ring-emerald-500 cursor-pointer mr-2 align-middle",
                    onChange: (e: any) => {
                      if (dataLineVal && dynamicPropsRef.current.onCheckboxToggle) {
                        dynamicPropsRef.current.onCheckboxToggle(dataLineVal, e.target.checked);
                      }
                    }
                  });
                }
                return child;
              });

              const { value: _discardedValue, ...restProps } = props;
              const listDepth = Number(node?.properties?.['data-list-depth'] || (props as any)['data-list-depth'] || 1);
              // 💡 만약 이미 2단계 이상 중첩된 리스트(listDepth >= 2)라면 브라우저/CSS(ul ul padding-left: 1.5em)가 이미 온전히 들여쓰기를 전개했으므로 중복 여백 방지
              const indentStyle = listDepth >= 2 ? {} : getIndentStyle(node);
              return <li data-line={dataLineVal} value={explicitValue} style={{ ...style, ...indentStyle }} className={props.className} {...restProps}>{modifiedChildren}</li>;
            },
            blockquote: ({ node, children, style, ...props }) => {
              const storedIndent=(props as any)['data-onrivi-quote-indent'];
              const quoteIndentStyle=storedIndent===undefined?{}:{marginLeft:Math.max(0,Math.min(4096,Number(storedIndent)||0))};
              // GitHub style Alerts 파싱: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION] + 한글 지원 ([!참고], [!팁], [!중요], [!주의], [!경고] 등)
              let alertType: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION' | null = null;
              let rawTagString = '';
              let processedChildren = children;

              const KOREAN_ALERT_MAP: Record<string, 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'> = {
                'NOTE': 'NOTE', '참고': 'NOTE', '참조': 'NOTE', '메모': 'NOTE', '알림': 'NOTE',
                'TIP': 'TIP', '팁': 'TIP', '도움말': 'TIP',
                'IMPORTANT': 'IMPORTANT', '중요': 'IMPORTANT', '필독': 'IMPORTANT',
                'WARNING': 'WARNING', '주의': 'WARNING',
                'CAUTION': 'CAUTION', '경고': 'CAUTION', '위험': 'CAUTION',
              };

              const ALERT_TAG_PATTERN = '(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|참고|참조|메모|알림|팁|도움말|중요|필독|주의|경고|위험)';
              const alertRegex = new RegExp(`^\\[!(${ALERT_TAG_PATTERN})\\]`, 'i');
              const removeRegex = new RegExp(`\\[!(${ALERT_TAG_PATTERN})\\]`, 'i');

              // 💡 [Alert 인용구 재귀 텍스트 탐색 및 태그 분리 엔진]
              // children이 배열이든, React 엘리먼트이든, rehypeSourceLinesPlugin의 <span className="onrivi-line">이든
              // 깊이와 구조에 무관하게 트리의 가장 첫 번째 의미 있는 텍스트 노드를 찾아 Alert 태그([!NOTE], [!참고] 등)를 정확히 판별합니다.
              const findFirstText = (n: any): string | null => {
                if (!n) return null;
                if (typeof n === 'string') {
                  const cleaned = n.replace(/^[\s\u00a0\u200b]+|^(?:&nbsp;)+/g, '').trim();
                  return cleaned.length > 0 ? cleaned : null;
                }
                if (Array.isArray(n)) {
                  for (const c of n) {
                    const t = findFirstText(c);
                    if (t) return t;
                  }
                  return null;
                }
                if (React.isValidElement(n)) {
                  return findFirstText((n.props as any)?.children);
                }
                return null;
              };

              const firstText = findFirstText(children);
              if (firstText) {
                const match = firstText.match(alertRegex);
                if (match) {
                  rawTagString = match[1];
                  const upperKey = rawTagString.toUpperCase();
                  alertType = KOREAN_ALERT_MAP[upperKey] || KOREAN_ALERT_MAP[rawTagString] || null;

                  // 매칭된 [!TYPE] 태그를 첫 번째 텍스트 노드에서 안전하게 소거
                  let tagRemoved = false;
                  const removeTag = (n: any): any => {
                    if (tagRemoved || !n) return n;
                    if (typeof n === 'string') {
                      const tagMatch = n.match(removeRegex);
                      if (tagMatch) {
                        tagRemoved = true;
                        const idx = n.indexOf(tagMatch[0]);
                        const before = n.substring(0, idx);
                        const after = n.substring(idx + tagMatch[0].length).replace(/^[\s\u00a0\u200b]+|^(?:&nbsp;)+/g, '').trimStart();
                        return (before.trim() ? before : '') + after;
                      }
                      return n;
                    }
                    if (Array.isArray(n)) {
                      return n.map(c => removeTag(c));
                    }
                    if (React.isValidElement(n)) {
                      const ch: any = (n.props as any)?.children;
                      if (ch === undefined || ch === null) return n;
                      const newChild = removeTag(ch);
                      return React.cloneElement(n, {}, ...(Array.isArray(newChild) ? newChild : [newChild]));
                    }
                    return n;
                  };

                  // 💡 [Alert 인용구 태그 직후 강제 빈 줄 및 빈 노드 완전 소거]
                  // 태그([!Tip] 등)가 소거된 후 잔존하는 빈 줄(.onrivi-line)이나 빈 문단(<p></p>), 또는 선행 <br>을 완전히 제거하여
                  // 태그 타이틀 바로 아래에 본문 텍스트가 강제 개행 없이 밀착되도록 정제합니다.
                  const isNodeEmpty = (n: any): boolean => {
                    if (n === null || n === undefined || n === false) return true;
                    if (typeof n === 'string') {
                      const cleaned = n.replace(/[\s\u00a0\u200b]+/g, '').replace(/^(?:&nbsp;)+/g, '');
                      return cleaned.length === 0;
                    }
                    if (Array.isArray(n)) {
                      return n.length === 0 || n.every(isNodeEmpty);
                    }
                    if (React.isValidElement(n)) {
                      if (n.type === 'br' || (n.props as any)?.tagName === 'br') return true;
                      return isNodeEmpty((n.props as any)?.children);
                    }
                    return false;
                  };

                  const pruneLeadingEmptyNodes = (n: any): any => {
                    if (!n) return n;
                    if (Array.isArray(n)) {
                      let firstNonEmpty = -1;
                      for (let i = 0; i < n.length; i++) {
                        if (!isNodeEmpty(n[i])) {
                          firstNonEmpty = i;
                          break;
                        }
                      }
                      if (firstNonEmpty === -1) return [];
                      const prunedFirst = pruneLeadingEmptyNodes(n[firstNonEmpty]);
                      const rest = n.slice(firstNonEmpty + 1);
                      return [prunedFirst, ...rest];
                    }
                    if (React.isValidElement(n)) {
                      const ch: any = (n.props as any)?.children;
                      if (ch === undefined || ch === null) return n;
                      const pruned = pruneLeadingEmptyNodes(ch);
                      return React.cloneElement(n, {}, ...(Array.isArray(pruned) ? pruned : [pruned]));
                    }
                    return n;
                  };

                  const rawCleaned = removeTag(children);
                  processedChildren = pruneLeadingEmptyNodes(rawCleaned);
                }
              }

              if (alertType) {
                const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawTagString);
                const titleMap: Record<'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION', string> = {
                  NOTE: isKorean ? rawTagString : 'Note',
                  TIP: isKorean ? rawTagString : 'Tip',
                  IMPORTANT: isKorean ? rawTagString : 'Important',
                  WARNING: isKorean ? rawTagString : 'Warning',
                  CAUTION: isKorean ? rawTagString : 'Caution',
                };
                const alertStyles = {
                  NOTE: { border: 'border-blue-500 dark:border-blue-400', bg: 'bg-blue-50/90 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', icon: 'ℹ️', title: titleMap.NOTE },
                  TIP: { border: 'border-emerald-500 dark:border-emerald-400', bg: 'bg-emerald-50/90 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', icon: '💡', title: titleMap.TIP },
                  IMPORTANT: { border: 'border-purple-500 dark:border-purple-400', bg: 'bg-purple-50/90 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', icon: '📢', title: titleMap.IMPORTANT },
                  WARNING: { border: 'border-amber-500 dark:border-amber-400', bg: 'bg-amber-50/90 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', icon: '⚠️', title: titleMap.WARNING },
                  CAUTION: { border: 'border-rose-500 dark:border-rose-400', bg: 'bg-rose-50/90 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', icon: '🛑', title: titleMap.CAUTION },
                }[alertType];

                return (
                  <div 
                    style={{ ...style, ...getIndentStyle(node), ...quoteIndentStyle }}
                    ref={(element) => {
                      if (!element) return;
                      if(storedIndent!==undefined)element.style.setProperty('margin-left',quoteIndentStyle.marginLeft+'px','important');
                      const backgrounds = {NOTE:'#eff6ff',TIP:'#ecfdf5',IMPORTANT:'#faf5ff',WARNING:'#fffbeb',CAUTION:'#fff1f2'};
                      element.style.setProperty('background-color', backgrounds[alertType], 'important');
                    }}
                    className={`onrivi-alert-box my-4 border-l-4 rounded-r-lg ${alertStyles.border} ${alertStyles.bg} p-4 shadow-xs`} 
                    {...(props as any)}
                  >
                    <div className={`onrivi-alert-title flex items-center gap-2 font-bold mb-1.5 text-sm tracking-wide uppercase text-inherit`}>
                      <span className="text-base">{alertStyles.icon}</span>
                      <span>{alertStyles.title}</span>
                    </div>
                    <div className="onrivi-alert-content text-zinc-800 dark:text-zinc-100 font-medium text-[0.95em] leading-relaxed [&>p:first-child]:!mt-0 [&>p:last-child]:!mb-0">
                      {processedChildren}
                    </div>
                  </div>
                );
              }

              return (
                <blockquote
                  ref={element=>{if(element && storedIndent!==undefined)element.style.setProperty('margin-left',quoteIndentStyle.marginLeft+'px','important');}}
                  style={{ ...style, ...getIndentStyle(node), ...quoteIndentStyle }}
                  className="p-4 rounded-r-lg border-l-4 border-zinc-500 dark:border-zinc-600 bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 font-normal not-italic"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            }
          }), [processedContent, getIndentStyle, onImageLoaded, attachMediaActions, picturebookProfile?.mediaCaptionStructure])}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// 에디터 커서 열·상태바처럼 미리보기와 무관한 상위 상태가 바뀌어도
// Markdown AST와 DOM을 다시 만들지 않도록 보호합니다.
function LayoutAwareViewer(props: MarkdownViewerProps) {
  const original = props.originalContent ?? props.content;
  const {data,content:body} = extractFrontmatter(original);
  const requestedId = data.css_profile?.replace(/^["']|["']$/g,'');
  if (requestedId?.startsWith('profile-book-') && requestedId !== props.picturebookProfile?.id) {
    return <div className="p-6 text-sm text-slate-500" role="status">그림책 서식을 불러오는 중입니다. 계속 표시되면 리소스 폴더의 서식 연결을 확인해 주세요.</div>;
  }
  if (props.picturebookProfile?.layout?.type !== 'picturebook') return <MarkdownViewer {...props} />;
  return <><PicturebookPreview content={body.replace(/\r\n/g, '\n')} profile={props.picturebookProfile}
    onImageEdit={props.onPicturebookImageEdit}
    editorOptions={props.onPicturebookChange ? props.picturebookEditorOptions : undefined}
    sourceLineOffset={(original.slice(0, original.length-body.length).match(/\n/g) || []).length}
    onChange={props.onPicturebookChange ? next => props.onPicturebookChange!(original.slice(0, original.length-body.length) + next) : undefined}
    fingerprint={exportContentFingerprint(original)}
    renderMarkdown={part => <MarkdownViewer {...props} content={part} originalContent={undefined}
      lineMap={undefined}
      picturebookProfile={undefined} onPicturebookChange={undefined} onCheckboxToggle={undefined} suppressBibliography />} />
    <BibliographySummary source={original} content={props.bibContent||''}/></>;
}

export default React.memo(LayoutAwareViewer);

