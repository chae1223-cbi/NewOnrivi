/**
 * styleShowcaseModules.ts
 * 서식 관리(CssStyleModal) 전용 15대 서식 모듈 뭉침 쇼케이스 정의
 *
 * 🚨 @PATCH : **2026-10-26** — [목록 쇼케이스 Card 9 불릿 마커 시인성 최적화]:
 *             1) 글머리 목록 최상위 항목 앞의 이모지를 정돈하여 1~3단계 불릿 기호 및 원문자(①, ②, ③) 마커 시각적 변화가 한눈에 보이도록 보정
 * 🚨 @PATCH : **2026-10-26** — [미디어 캡션 위치 및 6종 표현 구문 쇼케이스 동적 연동 규격화]:
 *             Card 11(이미지), Card 12(동영상), Card 13(지도)의 설명(캡션) 샘플을 서식 프로필의 mediaCaptionStructure(상단/하단 위치, 표준/대괄호/화살괄호 등 6종 구문)와 100% 실시간 연동
 * 🚨 @PATCH : **2026-10-26** — [동영상 쇼케이스 샘플 Onrivi 공식 영상으로 교체]:
 *             Card 12 동영상 쇼케이스 샘플을 onrivi/01_환경설정과 화면구성.mp4 비디오로 교체
 * 🚨 @PATCH : **2026-10-26** — [15대 서식 카테고리와 1:1 일치하는 쇼케이스 샘플 순서 및 구성 전면 동기화]:
 *             1) 좌측 서식 제어판의 15대 카테고리 순서(본문, 제목, 표, 인용구, 코드블록, 인라인코드, 링크, 각주, 목록, 구분선, 이미지, 동영상, 지도, 수식, 전체규칙)와 100% 동일하게 15개 독립 쇼케이스 카드로 재구성
 *             2) 서식 선택 시 해당 쇼케이스 카드로 1:1 정밀 자동 스크롤 및 펄스 하이라이트 동기화 완비
 * 🚨 @PATCH : **2026-09-24** — [각주(Footnotes) 전용 쇼케이스 Card 7 신설]: 본문 인라인 각주 링크 및 하단 주석 설명 구역(section.footnotes) 실시간 검증
 * 🚨 @PATCH : **2026-09-24** — [문장 사이 간격(sentence-gap) 실시간 동기화 지원]: 문단 내 줄바꿈 마크다운 샘플 탑재
 * 🚨 @PATCH : **2026-09-24** — [수식(MATH) remark-math 멀티라인 블록 구문 정규화]: $$ 앞뒤 개행 및 독립 블록 구문 적용
 */

export interface ShowcaseModule {
  id:
    | 'paragraph'
    | 'headings'
    | 'table'
    | 'quote'
    | 'codeblock'
    | 'inlinecode'
    | 'link'
    | 'footnote'
    | 'lists'
    | 'hr'
    | 'image'
    | 'video'
    | 'map'
    | 'math'
    | 'rules';
  title: string;
  badge: string;
  description: string;
  markdown: string;
  associatedTags: string[];
}

export const SHOWCASE_MODULES: ShowcaseModule[] = [
  {
    id: 'paragraph',
    title: '본문 및 문단 여백 (Paragraph)',
    badge: 'Card 1',
    description: '기본 문단(p), 폰트 크기, 자간, 행간, 첫 줄 들여쓰기, 문장 사이 간격, 인라인 강조',
    associatedTags: ['p', 'strong', 'em', 'u', 'del', 'br'],
    markdown: `문서의 가독성은 **정갈한 본문 타이포그래피**에서 시작됩니다. 단락 간격과 줄간격(Line Height), 그리고 자간(Letter Spacing)이 최적화되어 장시간 독서 시에도 눈의 피로를 최소화합니다.<br class="onrivi-sentence-br" />문장과 문장 사이에 강제 줄바꿈(Shift+Enter 또는 br)이 삽입된 경우에도, '문장 사이 간격(sentence-gap)' 설정을 통해 단락의 리듬감을 잃지 않고 유려하게 이어지도록 미세 간격을 실시간으로 조율합니다.

인라인 강조 서식: **굵게(Bold)**, *기울임(Italic)*, <u>밑줄(Underline)</u>, ~~취소선(Strikethrough)~~ 서식을 본문 안에서 자유롭게 조합할 수 있습니다.`,
  },
  {
    id: 'headings',
    title: '제목 위계 스타일 (Headings H1 ~ H6)',
    badge: 'Card 2',
    description: '대분류부터 소분류까지 6단계 제목의 크기 배율, 상하 여백, 밑줄 장식, 개요 번호 체계',
    associatedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    markdown: `# 👑 H1 1단계 대제목 (Master Headline)
## 🎯 H2 2단계 중제목 (Section Header)
### ⚡ H3 3단계 소제목 (Sub Section)
#### 📌 H4 4단계 세부제목 (Item Heading)
##### 🔹 H5 5단계 소항목제목 (Minor Heading)
###### ▪️ H6 6단계 최소단위제목 (Micro Heading)`,
  },
  {
    id: 'table',
    title: '표 규격 및 스타일 (Table)',
    badge: 'Card 3',
    description: '수직 중앙 정렬 표, 외곽선, 가로선, 세로선 두께, 셀 패딩, 헤더/본문 배경색',
    associatedTags: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],
    markdown: `| 서식 항목 | 현재 규격 스펙 | 가독성 편익 지표 |
| :--- | :---: | :--- |
| **줄간격 (Line Height)** | \`1.75\` 배율 락인 | 행간이 답답하지 않고 시원하게 읽힘 |
| **대표 서체 (Font)** | 고급 \`KoPubBatang\` | 양장본 출판물을 읽는 듯한 아날로그 감성 |
| **여백 (Margin)** | 사방 \`18mm / 12mm\` 통제 | 기하학적 균형 배치로 시각적 안정감 제공 |`,
  },
  {
    id: 'quote',
    title: '인용구 스타일 (Blockquote)',
    badge: 'Card 4',
    description: '왼쪽 띠형, 전체 박스형, 부드러운 그림자 카드형 프리셋 및 상하/안쪽 여백',
    associatedTags: ['blockquote'],
    markdown: `> 💬 **감성 인용구 박스 (Blockquote)**
> "좋은 서식은 글의 가치를 배가시키며, 독자가 내용에 온전히 몰입할 수 있는 가장 우아한 통로를 열어줍니다."`,
  },
  {
    id: 'codeblock',
    title: '소스코드 블록 (Code Block)',
    badge: 'Card 5',
    description: '신택스 하이라이팅, 라이트/Mac/다크 테마 프리셋, 타이틀 바 색상, 행간, 모서리 둥글기',
    associatedTags: ['pre'],
    markdown: `\`\`\`typescript
// 고해상도 소스코드 블록 (CodeBlock with Syntax Highlighting)
function calculateEditorialLayout(pageWidth: number, baseFontSize: number): number {
  const goldenRatio = 1.618;
  return Math.round(pageWidth / (baseFontSize * goldenRatio));
}
\`\`\``,
  },
  {
    id: 'inlinecode',
    title: '인라인 코드 (Inline Code)',
    badge: 'Card 6',
    description: '본문 문장 속 백틱(`...`) 코드 글자색, 배경색, 굵기, 모서리 둥글기',
    associatedTags: ['code'],
    markdown: `본문 문맥 속에서 함수명이나 프로그래밍 변수를 표기할 때 \`const appVersion = "1.0.0";\` 처럼 백틱으로 감싸 인라인 코드를 적용합니다.
시스템 설치 명령어인 \`npm install @onrivi/markdown\` 및 주요 설정 파일 \`config.json\` 표시에 최적화되어 있습니다.`,
  },
  {
    id: 'link',
    title: '하이퍼링크 (Hyperlink)',
    badge: 'Card 7',
    description: '외부 웹사이트 및 내부 문서 링크([텍스트](URL)) 글자색, 밑줄 유무, 굵기',
    associatedTags: ['a'],
    markdown: `더 자세한 서식 사용 안내는 [온리비 공식 웹사이트 바로가기](https://onrivi.com) 또는 [깃허브 프로젝트 저장소](https://github.com)를 참조해 주세요. 본문의 가독성을 해치지 않는 품격 있는 하이퍼링크 스타일을 제공합니다.`,
  },
  {
    id: 'footnote',
    title: '각주 및 주석 (Footnotes)',
    badge: 'Card 8',
    description: '본문 내 각주 번호 링크, 하단 설명 영역의 글자 크기, 색상, 줄간격, 상하 여백',
    associatedTags: ['footnote', 'a', 'p', 'ol', 'li'],
    markdown: `온리비 어서는 정밀한 에디토리얼 조판을 위해 표준 마크다운 각주[^1] 문법을 완벽히 지원합니다. 번호 링크를 클릭하면 하단 설명 구역으로 즉각 이동하며, 역참조 링크[^2]로 본래 문맥 위치로 손쉽게 되돌아올 수 있습니다.

[^1]: **각주(Footnote)**: 본문 하단에 배치되어 전문 용어 해설, 추가 참고자료, 전거(典據) 및 인용 출처를 밝히는 조판 양식입니다.
[^2]: **상호 참조(Backreference)**: 각주 설명 끝의 리턴 화살표(↩)를 클릭하면 본문의 해당 각주 번호 앵커 위치로 부드럽게 복귀합니다.`,
  },
  {
    id: 'lists',
    title: '목록 및 태스크 체크박스 (Lists)',
    badge: 'Card 9',
    description: '순서 있는 숫자 목록, 글머리 불릿(다계층 들여쓰기), 완료/미완료 태스크 체크박스',
    associatedTags: ['ul', 'ol', 'li', 'input'],
    markdown: `1. 첫 번째 순차 실행 프로세스
2. 두 번째 데이터 검증 및 분석 단계
3. 세 번째 최종 리포트 및 자동 저장

- 온리비 어서 핵심 기능 목록
  - 로컬 우선(Local-First) 무결점 오프라인 보안
    - 0.1초 즉시 실행 및 초경량 아키텍처
    - 내 컴퓨터 로컬 폴더 직접 연동
  - 마이크로소프트 VS Code 기반 Monaco Editor 탑재
- 할 일 및 태스크 체크리스트
  - [x] 한글 입력 결함(Input Glitch) 제로 보장
  - [x] 수직 중앙 정렬 테이블 렌더러 탑재
  - [ ] 원클릭 맞춤형 PDF 및 전자책(EPUB) 출판`,
  },
  {
    id: 'hr',
    title: '수평 구분선 (Horizontal Rule)',
    badge: 'Card 10',
    description: '실선/점선/대시선/이중선, 선 두께, 상하 여백 너비, 가로 폭 비율',
    associatedTags: ['hr'],
    markdown: `단락과 단락 사이의 맥락을 시각적으로 명확하게 구분해 주는 수평선입니다.

---

선 스타일과 두께, 그리고 상하 여백을 조절하여 문서의 시각적 리듬을 정갈하게 완성합니다.`,
  },
  {
    id: 'image',
    title: '이미지 객체 및 캡션 (Image & Caption)',
    badge: 'Card 11',
    description: '기본형/폴라로이드/둥근 썸네일 프리셋, 모서리 둥글기, 그림자 강도, 정렬 및 캡션',
    associatedTags: ['img', 'figure'],
    markdown: `![그림 1. 온리비 에디토리얼 워크스페이스 레이아웃](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80)`,
  },
  {
    id: 'video',
    title: '동영상 객체 (Video)',
    badge: 'Card 12',
    description: '임베드된 동영상 플레이어의 가로/세로 규격, 상하 여백 및 좌/중/우 정렬',
    associatedTags: ['video'],
    markdown: `**영상 1. 동영상 미디어 객체 규격 (환경설정과 화면구성)**\n\n<video src="/onrivi/01_환경설정과 화면구성.mp4" controls></video>`,
  },
  {
    id: 'map',
    title: '인터랙티브 지도 객체 (Map)',
    badge: 'Card 13',
    description: '임베드된 인터랙티브 지도의 가로/세로 규격, 상하 여백 및 좌/중/우 정렬',
    associatedTags: ['map', 'iframe'],
    markdown: `**지도 1. 인터랙티브 지도(MAP) 객체 규격 (서울특별시청)**\n\n<iframe src="https://maps.google.com/maps?q=37.5665,126.9780&z=15&output=embed" allowfullscreen loading="lazy"></iframe>`,
  },
  {
    id: 'math',
    title: 'KaTeX 수식 블록 (Math)',
    badge: 'Card 14',
    description: '독립 수식($$ ... $$)의 글자 크기, 글자 색상, 상하 여백, 좌/중/우 정렬',
    associatedTags: ['math'],
    markdown: `$$
f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi
$$

*▲ 수식 1. KaTeX 수식(MATH) 객체 규격 (글자 크기, 글자 색상, 상하 여백, 좌/중/우 정렬)*`,
  },
  {
    id: 'rules',
    title: '전체 태그 규칙 & 추가 CSS (Effective Rules)',
    badge: 'Card 15',
    description: '현재 서식 프로필에 적용되는 전체 태그 규칙 및 추가 사용자 정의 CSS 종합 검증',
    associatedTags: ['p', 'rules'],
    markdown: `현재 문서 프로필에 정의된 모든 태그별 CSS 규칙과 추가 작성된 사용자 정의 커스텀 CSS가 적용된 최종 쇼케이스 종합 뷰입니다.
모든 15대 서식 요소가 충돌 없이 조화롭게 렌더링되는지 실시간으로 검증할 수 있습니다.`,
  },
];
