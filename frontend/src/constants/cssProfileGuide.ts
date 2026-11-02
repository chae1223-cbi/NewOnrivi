/**
 * cssProfileGuide.ts
 * 온리비 어서(Onrivi Author) 최신 서식 프로필(CSS Profile) 명세서 및 AI 서식 생성 가이드 마크다운 정의
 * 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 용지 규격(sns_square, sns_portrait) 및 4종 서식 생성 워크플로우·프리셋 가이드 반영]:
 *             1) pageStyle.paperSize에 SNS 카드뉴스 1:1 정사각('sns_square') 및 4:5 세로형('sns_portrait') 명세 추가, AI 표준 프리셋에 '📱 SNS 카드뉴스 (인스타·링크드인)' 수록
 *             2) pageStyle.headingSizeOffset 미정의 시 최초 기본값 '3pt'(0pt~6pt 조절) 명세 및 JSON 스키마·마스터 프롬프트 동기화
 *             3) 제목(H1~H6) 앞 좌측 색깔바(border-left: 바 없음 'none' / 얇은 바 '3px solid' / 표준 바 '4px solid' / 굵은 바 '6px solid' + 색깔바 색상 선택 + padding-left '12px' 자동 연동) 상세 명세 추가
 *             4) 서식 관리 센터 최신 UI 워크플로우(사이드바 '+ 추가' 4종 문서 타입[일반문서/SNS 카드뉴스/그림책 전체표지/그림책 오른쪽표지] 선택 생성, 사이드바 '복제/내보내기/JSON 복사/삭제' 액션, 본문 2단 '이름·설명 카드 + 설명 상세 카드' 분리) 가이드 반영
 *             5) 15대 서식 카테고리 전수 명세(bulletStructure 13종, ol 특수 마커, 인라인 4종 세부 속성, 미디어 프리셋·정렬, 캡션 4종 오버라이드) 수록
 * 🚨 @PATCH : **2026-10-01** — [PDF/EPUB 내보내기 페이지 나누기 기준 기본값 'none' 명세 동기화]: 가이드 내 JSON 스펙의 exportPageBreakLevel을 'none'으로 변경
 * 🚨 @PATCH : **2026-09-26** — [표 모든 테두리(Grid) 세로선 및 프리셋 가이드·프롬프트 동기화]: th/td 레거시 border-left/right: none 소거, tableStructure(outerBorderWidth, rowBorderWidth, colBorderWidth) 격자/가로선/미니멀 프리셋 명세 및 AI 생성 프롬프트 정합화
 * 🚨 @PATCH : **2026-09-25** — [한컴 테크 블로그 프리미엄 서식 분석 및 가이드 명세 추가]
 * 🚨 @PATCH : **2026-09-25** — [문서 표준 용지 여백(상하 18mm, 좌우 12mm) 가이드 명세 일원화]
 * 🚨 @PATCH : **2026-09-25** — [체크박스 및 체크리스트 글자색 본문 기본색(#2f2f2f) 가이드 동기화]
 * 🚨 @PATCH : **2026-09-25** — [체크리스트 완료 항목 스타일 '효과없음(none)' 가이드/명세 기본값 통일]
 * 🚨 @PATCH : **2026-09-24** — [서식 설정 가이드 'Onrivi 기본서식' 100% 완전 동기화 및 누락 태그 상속 규칙 명시]
 */

export interface AiStylePresetItem {
  id: string;
  label: string;
  badge: string;
  summary: string;
  prompt: string;
}

/** 서식 관리 센터 AI 생성기 및 가이드 탭에서 공유하는 5대 최신 표준 서식 프리셋 */
export const AI_STANDARD_PRESETS: AiStylePresetItem[] = [
  {
    id: 'ks-tech-standard',
    label: '📐 KS 기술표준 명세서',
    badge: '십진분류 1.➔1.1 · 격자표',
    summary: '계층형 십진 제목 번호(1. ➔ 1.1 ➔ 1.1.1), 표 상단·그림 하단 캡션, 정밀 1px 격자 표 규격',
    prompt:
      'Pretendard 고딕체 15.5px, 화이트 배경(#FFFFFF), 줄간격 1.7, 표준 여백(상하 18mm/좌우 12mm), 제목 번호는 계층형 십진 분류(headingNumbering: H1~H4 모두 "decimal-outline" 1. ➔ 1.1 ➔ 1.1.1), 표는 1px 모든 테두리 격자형(outer 1px, row 1px, col 1px), 미디어 캡션은 표 상단(top)·그림 하단(bottom) 표준 형식으로 만들어줘.',
  },
  {
    id: 'corp-strategy-report',
    label: '🏢 대기업 전략기획서 (삼성/현대)',
    badge: '개조식 □➔○➔-➔ㆍ',
    summary: '핵심 요약 박스형 인용구, □ ➔ ○ ➔ - ➔ ㆍ 개조식 제목/불릿 기호, 15px 고밀도 레이아웃',
    prompt:
      'Pretendard 15px, 줄간격 1.65, 표준 여백(상하 18mm/좌우 12mm), 네이비 포인트(#1d4ed8), 제목 기호는 대기업 개조식(H1: □, H2: ○, H3: -, H4: ㆍ), 글머리 기호(bulletStructure)도 1단계 □, 2단계 ○, 3단계 - 적용, 표는 가로선 강조형(outer 1px, row 1px, col 0px), 인용구는 좌측 4px 코발트 바(#1d4ed8)와 연회색 배경(#f8fafc) 요약 박스로 설계해줘.',
  },
  {
    id: 'academic-kdi-report',
    label: '🎓 KDI 학술·정책 연구보고서',
    badge: '제1장➔제1절 · <표 1>',
    summary: '바탕/명조 서체, 장·절 제목 체계(제1장 ➔ 제1절 ➔ 1. ➔ 가.), 표 상단 <표 1> · 그림 하단 [그림 1]',
    prompt:
      'KoPubWorldBatang 또는 Noto Serif KR 명조체 16px, 줄간격 1.85, 표준 여백(상하 18mm/좌우 12mm), 제목 번호는 학술 장절 체계(H1: 제N장, H2: 제N절, H3: decimal 1., H4: hangul 가.), 논문형 표 테두리(outer 1.5px, row 1px, col 0px 세로선 없음), 캡션(mediaCaptionStructure)은 표 상단 angle(<표 1>) 및 그림/비디오/지도는 하단 bracket([그림 1])으로 만들어줘.',
  },
  {
    id: 'hancom-tech-blog',
    label: '🔥 모던 테크 블로그 (오렌지 포인트)',
    badge: 'H2 하단선 · H3 좌측바',
    summary: 'H2 오렌지 하단 언더라인, H3 오렌지 좌측 수직 바, 1.8배 본문 줄간격 및 8px 문장 간격',
    prompt:
      'Pretendard 16px, 본문 줄간격 1.8, 문단 하단 여백 20px, 문장 간격(sentence-gap) 8px, H2는 하단 오렌지 포인트선(2px solid #ff5a00), H3는 좌측 오렌지 수직 바(4px solid #ff5a00, padding-left 12px), 인용구는 좌측 4px 오렌지 바와 #f8fafc 배경, 표는 세로선 없는 가로선 강조형(outer 1px, row 1px, col 0px)으로 만들어줘.',
  },
  {
    id: 'editorial-essay-book',
    label: '📖 감성 출판 에세이 & 북디자인',
    badge: '미색 용지 · 양끝정렬',
    summary: '눈이 편안한 아이보리 미색 배경(#FAF6ED), 명조체 16.5px, 첫 줄 들여쓰기 및 감성 인용구',
    prompt:
      'Noto Serif KR 명조체 16.5px, 따뜻한 아이보리 미색 배경(#FAF6ED), 넓은 줄간격 1.85, 본문 양끝 정렬(justify), 표준 여백(상하 18mm/좌우 12mm), 미니멀 표 서식(outer 0px, row 1px, col 0px), 부드러운 박스형 인용구 스타일로 만들어줘.',
  },
  {
    id: 'sns-card-news-preset',
    label: '📱 SNS 카드뉴스 (인스타·링크드인)',
    badge: '1:1 정사각 · 형광펜 강조',
    summary: '인스타그램·쓰레드·링크드인 캐러셀용 1:1 정사각(sns_square), 굵은 타이포 및 형광펜 하이라이트',
    prompt:
      'paperSize는 "sns_square"(1:1 정사각 카드뉴스, 4:5 세로형은 "sns_portrait"), 여백은 상하좌우 14mm, Pretendard 고딕 18px, 줄간격 1.65, H1은 28px 굵은 타이틀과 하단 코발트 블루 포인트선(3px solid #1d4ed8), H2는 좌측 6px 코발트 색깔바(6px solid #1d4ed8, padding-left 12px), 굵게(strong)는 노란 형광펜 배경(#fef08a), 인용구는 둥근 요약 박스(#eff6ff 배경, 16px 곡률)로 만들어줘.',
  },
];

/** 서식 편집기 15대 상세 카테고리 요약 사양 (모달 가이드 탭 및 문서 공용) */
export interface StyleCategorySpecItem {
  no: number;
  category: string;
  targetKeys: string;
  properties: string;
  presetsAndNotes: string;
}

export const STYLE_15_CATEGORY_SPECS: StyleCategorySpecItem[] = [
  {
    no: 1,
    category: '본문·여백 (용지 & 인라인 강조)',
    targetKeys: 'pageStyle, rules.p, strong, em, u, del',
    properties:
      'pageStyle(fontFamily, fontUrl, fontSize[pt/px], lineHeight, letterSpacing, backgroundColor, paperSize[a4/b5/letter/sns_square/sns_portrait], orientation[portrait/landscape], marginTop/Bottom[18mm], marginLeft/Right[12mm], headingSizeOffset[최초 기본값 "3pt"], tabSize, exportPageBreakLevel[none/h1/h2]) / p(margin-top, margin-bottom, line-height, color, text-align[left/center/right/justify], text-indent, letter-spacing, sentence-gap) / strong(font-weight, color, background-color) / em(font-style, color) / u(text-decoration, text-decoration-style[solid/dashed/dotted/wavy], text-decoration-color, text-underline-offset) / del(text-decoration, color, text-decoration-color, text-decoration-thickness, opacity)',
    presetsAndNotes:
      '용지 표준 여백은 상하 18mm·좌우 12mm 권장(SNS 카드뉴스는 sns_square[1:1] / sns_portrait[4:5], 여백 14mm 권장). headingSizeOffset 미정의 시 최초 기본값은 "3pt". strong에 background-color 지정 시 형광펜 하이라이트 효과 적용.',
  },
  {
    no: 2,
    category: '제목 (H1~H6 · 좌측 색깔바 & 자동 번호)',
    targetKeys: 'rules.h1~h6, pageStyle.headingSizeOffset, headingNumbering',
    properties:
      'h1~h6(font-size, font-weight, font-style, text-decoration, color, text-align[left/center/right], border-bottom[none/1px solid/3px double], border-left[바 없음 none / 얇은 바 3px solid / 표준 바 4px solid / 굵은 바 6px solid + 색상], padding-left, padding-bottom, margin-top, margin-bottom, line-height, letter-spacing) / headingSizeOffset("3pt" 기본, 0pt~6pt) / headingNumbering(길이 6 배열)',
    presetsAndNotes:
      '좌측 색깔바(border-left) 설정 시 padding-left: "12px" 자동 부여(해제 시 "0px"). headingSizeOffset 미정의 시 최초값 "3pt"로 H2~H6 자동 차감. headingNumbering: "none", "decimal", "decimal-outline", "roman", "hangul", "decimal-paren", "hangul-paren", custom 객체.',
  },
  {
    no: 3,
    category: '표 (테이블 & 셀 테두리 구조)',
    targetKeys: 'rules.table, th, td, tableStructure',
    properties:
      'table(width, border-collapse, border-style, border-width, border-color, margin-top, margin-bottom, font-size, border-radius, overflow) / th(background-color, padding, border-style/width/color, font-weight, text-align, color) / td(padding, border-style/width/color, text-align, color, background-color) / tableStructure(outerBorderWidth, rowBorderWidth, colBorderWidth)',
    presetsAndNotes:
      '3대 프리셋: ① 가로선 강조형(outer 1~2px, row 1px, col 0px) ② 모든 테두리 격자형(outer 1px, row 1px, col 1px) ③ 미니멀형(outer 0px, row 1px, col 0px). 주의: th/td에 border-left: none 금지.',
  },
  {
    no: 4,
    category: '인용구 (Blockquote & 콜아웃)',
    targetKeys: 'rules.blockquote',
    properties:
      'color, background-color, font-size, font-weight(normal/bold), font-style(normal/italic), padding, border-left, border, border-radius, box-shadow, margin-top, margin-bottom',
    presetsAndNotes:
      '3대 배타 형태: ① 왼쪽 띠형(border-left 지정, border 생략) ② 전체 박스형(border 지정, border-left: "none") ③ 그림자 박스형(border: "none", border-left: "none", box-shadow 지정).',
  },
  {
    no: 5,
    category: '코드블록 (CodeBlock & 타이틀바)',
    targetKeys: 'rules.codeBlock, rules.codeBlockTitle',
    properties:
      'codeBlock(background-color, color, font-size[inherit/13.5px], line-height[1.35], padding, border-radius, border) / codeBlockTitle(background-color, color, padding, border-radius, border)',
    presetsAndNotes:
      '3대 테마 프리셋: ① 라이트 기본 박스(#f7f7f8 / 타이틀 #ececec) ② Mac OS 테마(#282c34 / 타이틀 #21252b) ③ 다크 테마 고정(#0f172a / 타이틀 #1e293b).',
  },
  {
    no: 6,
    category: '인라인코드 (Inline Code)',
    targetKeys: 'rules.code',
    properties:
      'color, background-color, font-weight(normal/bold), border-radius(4px~8px), padding(2px 6px), padding-left, padding-right, border',
    presetsAndNotes:
      '문장 내 기술 용어·단축키 강조용 배지 스타일. 기본 배경 #f7f7f8, 테두리 1px solid #e5e5e5.',
  },
  {
    no: 7,
    category: '하이퍼링크 (Anchor Link)',
    targetKeys: 'rules.a',
    properties:
      'color(기본 #2563eb), text-decoration("underline" | "none"), font-weight("normal" | "bold")',
    presetsAndNotes:
      '본문 내 외부 URL 및 문서 내부 참조 링크의 색상·밑줄·굵기 제어.',
  },
  {
    no: 8,
    category: '각주 (Footnote)',
    targetKeys: 'rules.footnote',
    properties:
      'color(기본 #6b6b6b), font-weight("normal" | "bold"), font-size(9pt / 13px), line-height(1.5~1.6), margin-top(12px), margin-bottom(12px)',
    presetsAndNotes:
      '문서 하단 각주 영역의 타이포그래피 및 상하 간격 제어.',
  },
  {
    no: 9,
    category: '목록·체크 (UL/OL/LI & 3단계 불릿·체크박스)',
    targetKeys: 'rules.ul, ol, li, taskList, bulletStructure, checkboxStructure',
    properties:
      'ul/ol(padding-left[28px], list-style-type, color) / li(margin-bottom[5px], padding-inline-start[3px], line-height[1.7]) / bulletStructure(level1~3, custom1~3) / checkboxStructure & taskList(boxSize[16px], checkedEffect["none"|"line-through-and-dim"|"dim-only"], textGap[9px], color[#2f2f2f])',
    presetsAndNotes:
      'ol 전용 마커: "decimal"(1,2,3), "onrivi-circled-decimal"(①,②,③), "onrivi-report"(Ⅰ.→1.→가.→1)→가)), "decimal-leading-zero"(01,02), "lower-roman", "upper-roman", "none". bulletStructure 13종: disc, circle, square, white-square, diamond, white-diamond, dash, hyphen, arrow, check, star, dot, custom, none.',
  },
  {
    no: 10,
    category: '구분선 (Horizontal Rule)',
    targetKeys: 'rules.hr, hrStructure',
    properties:
      'hr(border-top-color, border-top-width, border-top-style, margin-top, margin-bottom, width) / hrStructure(borderTopStyle["solid"|"dotted"|"dashed"|"double"], borderTopWidth["1px"~"10px"], marginTopBottom["28px"], lineWidth["100%"|"75%"|"50%"|"30%"])',
    presetsAndNotes:
      '실선(solid), 점선(dotted), 파선(dashed), 이중선(double) 및 가로 폭 비율(100%/75%/50%/30%) 지원.',
  },
  {
    no: 11,
    category: '이미지 (Image & 액자 프리셋)',
    targetKeys: 'rules.img, mediaCaptionStructure',
    properties:
      'width(100%/75%/50%), border-radius, box-shadow, border, border-bottom-width, background-color, padding, margin-top, margin-bottom, margin-left, margin-right',
    presetsAndNotes:
      '3대 액자 프리셋: ① 기본형 ② 폴라로이드 액자(border: 10px solid white, border-bottom-width: 32px, box-shadow) ③ 둥근 썸네일(border-radius: 16px, box-shadow). 정렬: 중앙(margin-left/right: auto), 좌측(0px / auto), 우측(auto / 0px).',
  },
  {
    no: 12,
    category: '비디오 (Video 플레이어)',
    targetKeys: 'rules.video, mediaCaptionStructure',
    properties:
      'width(100%), height(315px), border-radius(8px), box-shadow, display("block"), margin-top, margin-bottom, margin-left, margin-right',
    presetsAndNotes:
      '유튜브/비디오 임베드 프레임 크기, 모서리 곡률, 그림자 및 좌·중·우 정렬 제어.',
  },
  {
    no: 13,
    category: '지도 (Map 임베드)',
    targetKeys: 'rules.map, mediaCaptionStructure',
    properties:
      'width(100%), height(400px), border-radius(8px), box-shadow, margin-top, margin-bottom, margin-left, margin-right',
    presetsAndNotes:
      '지도 임베드 컨테이너 크기, 곡률, 그림자 및 좌·중·우 정렬 제어.',
  },
  {
    no: 14,
    category: '수식 (KaTeX Math 블록)',
    targetKeys: 'rules.math',
    properties:
      'color(#2f2f2f), font-size(inherit 또는 16px), text-align("center" | "left" | "right"), margin-top(20px), margin-bottom(20px)',
    presetsAndNotes:
      '수식 블록의 글자색, 크기, 좌·중·우 정렬 및 상하 여백 제어.',
  },
  {
    no: 15,
    category: '고급 CSS & 캡션·그림책 확장 구조체',
    targetKeys: 'customCss, mediaCaptionStructure.kindOverrides, layout',
    properties:
      'customCss(자유 CSS 문자열) / mediaCaptionStructure(position["top"|"bottom"], format["standard"|"bracket"|"angle"|"plain"|"title-only"|"custom"], customTemplate, kindOverrides.{table,image,video,map}) / layout(type:"picturebook", cover:"full-image"|"image-right", imageRatio, imageFit, gap, pageNumbers)',
    presetsAndNotes:
      'kindOverrides로 표(table), 그림(image), 비디오(video), 지도(map) 4종의 캡션 위치·포맷을 각각 독립 제어 가능.',
  },
];

/** 외부 AI(ChatGPT, Claude, Gemini 등)에 복사해 바로 사용할 수 있는 최신 만능 마스터 프롬프트 */
export const AI_MASTER_PROMPT_TEMPLATE = `당신은 최고급 출판·문서 조판 전문 CSS 디자이너입니다. 아래 온리비 어서(Onrivi Author) 최신 서식 스키마(v2026.10, 15대 서식 카테고리 전수 반영)에 맞추어 완성도 높은 서식 프로필 JSON 1개를 생성해 주세요.

[내가 원하는 서식 컨셉]:
"여기에 원하는 분위기, 글꼴, 색상, 표 스타일, 제목 번호 체계를 적어주세요 (예: 깔끔한 공공기관 보고서 스타일, 네이비 포인트, 표는 가로선 강조형)"

[필수 준수 스키마 및 15대 카테고리 상세 규격]:
1. 최상위 JSON 키 구조:
   "id", "name", "description", "pageStyle", "rules", "hrStructure", "checkboxStructure", "tableStructure", "bulletStructure", "mediaCaptionStructure", "headingNumbering", "customCss" (그림책 요청 시 "layout" 추가)
2. 용지 및 기본 타이포그래피 (pageStyle):
   - paperSize: "a4" ("b5", "letter", SNS 카드뉴스는 1:1 정사각 "sns_square" 또는 4:5 세로형 "sns_portrait" 가능), orientation: "portrait" (가로형은 "landscape")
   - 표준 여백: 일반 문서는 marginTop: "18mm", marginBottom: "18mm", marginLeft: "12mm", marginRight: "12mm" (SNS 카드뉴스는 상하좌우 "14mm")
   - fontFamily: 본문 기본 글꼴 (선택사항으로 웹폰트 URL은 fontUrl에 지정)
   - fontSize: "15px"~"16.5px" (또는 "10pt"~"12pt"), lineHeight: "1.65"~"1.85", letterSpacing: "-0.01em"
   - headingSizeOffset: "3pt" (미정의 시 최초 기본값 "3pt", H1 기준 크기에서 H2~H6 단계별 차감 폭), tabSize: "2", exportPageBreakLevel: "none" (절대 인위적 분할 금지, 특별 요청 시에만 "h1"|"h2")
3. 본문 및 인라인 강조 4종 (rules.p, strong, em, u, del):
   - p: margin-top("0px"), margin-bottom("16px"), line-height("1.75"), color("#2f2f2f"), text-align("left"|"center"|"right"|"justify"), text-indent("0px"|"16px"), letter-spacing("-0.01em"), sentence-gap("4px"~"8px")
   - strong: font-weight("700"), color("#202123"), 필요 시 형광펜 효과는 background-color 지정
   - em: font-style("italic"), color("#2f2f2f")
   - u: text-decoration("underline"), text-decoration-style("solid"|"dashed"|"dotted"|"wavy"), text-decoration-color("#0d0d0d"), text-underline-offset("3px")
   - del: text-decoration("line-through"), color("#6b6b6b"), 필요 시 text-decoration-color, text-decoration-thickness("1px"), opacity("0.8")
4. 제목 H1~H6, 좌측 색깔바 및 자동 번호 체계 (rules.h1~h6, pageStyle.headingSizeOffset, headingNumbering):
   - h1~h6: font-size, font-weight, color, margin-top, margin-bottom, line-height, letter-spacing, text-align
   - 제목 장식: 하단 밑줄(border-bottom: "none" | "1px solid #색상" | "3px double #색상" + padding-bottom) 또는 제목 앞 좌측 색깔바(border-left: "none"[바 없음] | "3px solid #색상"[얇은 바] | "4px solid #색상"[표준 바] | "6px solid #색상"[굵은 바] + 색깔바 적용 시 padding-left: "12px", 미적용 시 "0px")
   - headingNumbering (길이 6 배열, H1~H6 순서):
     · 번호 없음: []
     · 십진 분류(1. ➔ 1.1): ["decimal-outline", "decimal-outline", "decimal-outline", "decimal-outline", "none", "none"]
     · 장절 체계(제1장 ➔ 제1절): [{ "type": "custom", "number": "decimal", "prefix": "제", "suffix": "장" }, { "type": "custom", "number": "decimal", "prefix": "제", "suffix": "절" }, "decimal", "hangul", "none", "none"]
     · 대기업 개조식(□ ➔ ○ ➔ - ➔ ㆍ): [{ "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "□" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "○" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "-" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "ㆍ" }, "none", "none"]
5. 목록·체크리스트 및 3단계 글머리 기호 (rules.ul, ol, li, taskList, bulletStructure, checkboxStructure):
   - ul/ol: padding-left("28px"), color("#2f2f2f")
   - ol['list-style-type'] 지원값: "decimal"(1,2,3), "onrivi-circled-decimal"(①,②,③ 원문자), "onrivi-report"(Ⅰ.→1.→가.→1)→가) 한국형 보고서 다단계), "decimal-leading-zero"(01,02), "lower-roman", "upper-roman", "none"
   - li: margin-bottom("5px"), padding-inline-start("3px"), line-height("1.7")
   - bulletStructure: { "level1": "disc", "level2": "circle", "level3": "square" }
     · 지원 기호 13종: "disc"(•), "circle"(○), "square"(■), "white-square"(▫), "diamond"(◆), "white-diamond"(◇), "dash"(-), "hyphen"(–), "arrow"(▶), "check"(✓), "star"(★), "dot"(·), "custom"(custom1~3에 직접 기호 입력), "none"
   - checkboxStructure & rules.taskList: { "boxSize": "16px", "checkedEffect": "none", "textGap": "9px", "color": "#2f2f2f" } (checkedEffect는 "none" | "line-through-and-dim" | "dim-only")
6. 표 및 테두리 구조체 (rules.table, th, td, tableStructure):
   - 절대 th/td에 border-left: none 같은 방향별 속성을 넣지 말고, 테두리 두께는 tableStructure로 제어하세요.
   - tableStructure: 가로선 강조형은 { "outerBorderWidth": "1px", "rowBorderWidth": "1px", "colBorderWidth": "0px" }, 모든 테두리 격자형은 { "outerBorderWidth": "1px", "rowBorderWidth": "1px", "colBorderWidth": "1px" }, 미니멀형은 { "outerBorderWidth": "0px", "rowBorderWidth": "1px", "colBorderWidth": "0px" }
7. 인용구, 코드블록, 인라인코드, 링크, 구분선, 각주:
   - blockquote: 왼쪽 띠형이면 border-left만 지정하고 border는 생략; 전체 박스형이면 border만 지정하고 border-left: "none"; 그림자형이면 border: "none", border-left: "none", box-shadow 지정
   - codeBlock & codeBlockTitle: 라이트(#f7f7f8/#ececec), Mac OS(#282c34/#21252b), 다크(#0f172a/#1e293b) 중 컨셉에 맞게 선택
   - code (인라인코드): background-color, color, padding("2px 6px"), border-radius("5px"), border
   - a (하이퍼링크): color, text-decoration("underline"|"none"), font-weight("bold"|"normal")
   - hr & hrStructure: { "borderTopStyle": "solid"|"dotted"|"dashed"|"double", "borderTopWidth": "1px", "marginTopBottom": "28px", "lineWidth": "100%"|"75%"|"50%"|"30%" }
   - footnote (각주): font-size("13px"), color("#6b6b6b"), line-height("1.5"), margin-top("12px"), margin-bottom("12px"), font-weight("normal")
8. 미디어 4종(img, video, map, math) 및 캡션 구조체(mediaCaptionStructure):
   - img, video, map 정렬: 중앙 정렬은 margin-left: "auto", margin-right: "auto" / 좌측 정렬은 margin-left: "0px", margin-right: "auto" / 우측 정렬은 margin-left: "auto", margin-right: "0px"
   - math: color, font-size("16px"), text-align("center"|"left"|"right"), margin-top("20px"), margin-bottom("20px")
   - mediaCaptionStructure: { "position": "top"|"bottom", "format": "standard"|"bracket"|"angle"|"plain"|"title-only"|"custom", "customTemplate": "**{kind} {n}. {title}**" }
     · 표는 상단, 그림/비디오/지도는 하단으로 분리할 때는 "kindOverrides": { "table": { "position": "top", "format": "angle" }, "image": { "position": "bottom", "format": "bracket" }, "video": { "position": "bottom", "format": "bracket" }, "map": { "position": "bottom", "format": "bracket" } } 사용
9. 마크다운 코드블록이나 부연 설명 없이 오직 순수 JSON 객체({ ... })만 출력하세요.`;

export const CSS_PROFILE_GUIDE_MD = `# 🎨 온리비 어서(Onrivi Author) 최신 서식 프로필(CSS Profile) 작성 및 생성 가이드 (v2026.10 · 15대 카테고리 전수 수록)

이 문서는 **온리비 어서(Onrivi Author)** 전용 서식 프로필(\`.json\`)의 공식 최신 스키마 명세서이자, 서식 편집기의 **15대 상세 카테고리(본문·여백, 제목, 표, 인용구, 코드블록, 인라인코드, 하이퍼링크, 각주, 목록·체크, 구분선, 이미지, 비디오, 지도, 수식, 고급 CSS)** 모든 속성을 100% 수록한 **완전판 레퍼런스 가이드**입니다.

> 💡 **핵심 요약 및 서식 관리 센터 최신 기능 안내**
> 1. **사이드바 \`+ 추가\` 4종 문서 타입 선택 생성**: 좌측 사이드바 상단 \`+ 추가\` 버튼을 누르면 **① \`📄 일반문서\`**, **② \`📱 SNS 카드뉴스\`**, **③ \`📖 그림책(전체표지)\`**, **④ \`📖 그림책(오른쪽표지)\`** 중 원하는 문서 타입을 선택해 즉시 생성할 수 있습니다.
> 2. **사이드바 원클릭 액션 일원화**: 좌측 사이드바의 각 서식 항목에서 **\`[서식 복제] · [파일 내보내기(.json)] · [JSON 복사] · [삭제]\`**를 즉시 실행할 수 있으며, 상단 \`전체 백업\`으로 내 서식 전체를 한 번에 백업할 수 있습니다.
> 3. **본문 상단 2단 카드 구성**: 본문 상단 좌측 **\`[이름 및 서식 설명 카드]\`**에는 서식 이름과 일반문서/SNS 카드뉴스/그림책(스토리북) 구분이 포함된 설명이 표시되며, 우측 별도 **\`[📋 설명 상세 카드]\`**에는 **글꼴 · 크기/행간 · 여백 · 표 테두리 · 불릿 · 문서 타입(일반문서 / SNS 카드뉴스 / 그림책)** 6대 핵심 사양이 한눈에 표시됩니다.
> 4. **원클릭 가져오기 및 다중 백업 호환**: 서식 파일(\`.json\`) **드래그 앤 드롭**, **내 PC 파일 선택**, **클립보드 JSON 바로 불러오기**를 지원하며, 단일 서식(\`{ ... }\`)과 다중 백업 배열(\`[ { ... }, ... ]\`)을 모두 자동 인식합니다.
> 5. **누락 속성 100% 자동 정규화 (\`normalizeCssProfile\`)**: AI가 생성한 JSON에 일부 속성이 생략되어 있더라도 **'Onrivi 기본서식'** 표준 규격(예: \`headingSizeOffset\` 미정의 시 최초값 \`"3pt"\` 자동 부여 등)으로 완벽히 보완합니다.

---

## 📌 1. 최신 서식 프로필(JSON) 전체 구조 명세

아래 JSON은 최신 버전의 모든 구조체(\`pageStyle\`, \`rules\`, \`tableStructure\`, \`bulletStructure\`, \`mediaCaptionStructure\`, \`headingNumbering\`, \`hrStructure\`, \`checkboxStructure\`, \`customCss\`)가 포함된 완전체 표준 예시입니다.

\`\`\`json
{
  "id": "profile-1790253429429",
  "name": "Onrivi 기본서식",
  "description": "온리비 어서(Onrivi Author)의 공식 기본 서식 테마입니다. 정갈한 텍스트 배치와 최적화된 용지 규격을 제공합니다.",
  "pageStyle": {
    "fontFamily": "'Times New Roman', 'Georgia', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', Arial, sans-serif",
    "fontSize": "16px",
    "lineHeight": "1.75",
    "letterSpacing": "-0.01em",
    "backgroundColor": "#ffffff",
    "paperSize": "a4",
    "marginTop": "18mm",
    "marginBottom": "18mm",
    "marginLeft": "12mm",
    "marginRight": "12mm",
    "orientation": "portrait",
    "headingSizeOffset": "3pt",
    "tabSize": "2",
    "exportPageBreakLevel": "none"
  },
  "rules": {
    "h1": {
      "font-size": "32px",
      "font-weight": "700",
      "color": "#202123",
      "padding-left": "0px",
      "margin-top": "32px",
      "margin-bottom": "18px",
      "border-bottom": "",
      "text-align": "left",
      "line-height": "1.25",
      "letter-spacing": "-0.025em"
    },
    "h2": {
      "font-size": "24px",
      "font-weight": "700",
      "color": "#202123",
      "border-bottom": "",
      "padding-bottom": "8px",
      "margin-top": "28px",
      "margin-bottom": "14px",
      "text-align": "left",
      "line-height": "1.35",
      "letter-spacing": "-0.02em"
    },
    "h3": {
      "font-size": "20px",
      "font-weight": "650",
      "color": "#202123",
      "margin-top": "24px",
      "margin-bottom": "12px",
      "text-align": "left",
      "line-height": "1.4"
    },
    "h4": {
      "font-size": "18px",
      "font-weight": "650",
      "color": "#202123",
      "margin-top": "20px",
      "margin-bottom": "10px",
      "text-align": "left",
      "line-height": "1.5"
    },
    "h5": {
      "font-size": "16px",
      "font-weight": "650",
      "color": "#202123",
      "margin-top": "18px",
      "margin-bottom": "8px",
      "text-align": "left",
      "line-height": "1.55"
    },
    "h6": {
      "font-size": "15px",
      "font-weight": "650",
      "color": "#6b6b6b",
      "margin-top": "16px",
      "margin-bottom": "8px",
      "text-align": "left",
      "line-height": "1.55"
    },
    "p": {
      "margin-top": "0px",
      "margin-bottom": "16px",
      "line-height": "1.75",
      "color": "#2f2f2f",
      "text-align": "left",
      "text-indent": "0px",
      "letter-spacing": "-0.01em",
      "sentence-gap": "4px"
    },
    "strong": { "font-weight": "700", "color": "#202123" },
    "em": { "font-style": "italic", "color": "#2f2f2f" },
    "u": {
      "text-decoration": "underline",
      "text-decoration-color": "#0d0d0d",
      "text-decoration-style": "solid",
      "text-underline-offset": "3px"
    },
    "del": { "text-decoration": "line-through", "color": "#6b6b6b" },
    "ul": { "padding-left": "28px", "list-style-type": "disc", "color": "#2f2f2f" },
    "ol": { "padding-left": "28px", "list-style-type": "decimal", "color": "#2f2f2f" },
    "li": { "margin-bottom": "5px", "padding-inline-start": "3px", "line-height": "1.7" },
    "taskList": { "boxSize": "16px", "checkedEffect": "none", "textGap": "9px", "color": "#2f2f2f" },
    "hr": {
      "border-top-color": "#e5e5e5",
      "border-top-width": "1px",
      "border-top-style": "solid",
      "margin-top": "28px",
      "margin-bottom": "28px",
      "width": "100%"
    },
    "table": {
      "width": "100%",
      "border-collapse": "collapse",
      "border-style": "solid",
      "border-width": "1px",
      "border-color": "#9ca3af",
      "margin-top": "22px",
      "margin-bottom": "22px",
      "font-size": "15px",
      "border-radius": "8px",
      "overflow": "hidden"
    },
    "th": {
      "background-color": "#f7f7f8",
      "padding": "5px 8px",
      "border-style": "solid",
      "border-width": "1px",
      "border-color": "#cbd5e1",
      "font-weight": "650",
      "text-align": "left",
      "color": "#202123"
    },
    "td": {
      "padding": "5px 8px",
      "border-style": "solid",
      "border-width": "1px",
      "border-color": "#cbd5e1",
      "color": "#2f2f2f"
    },
    "blockquote": {
      "padding": "2px 0 2px 18px",
      "color": "#6b6b6b",
      "background-color": "transparent",
      "border-radius": "0",
      "margin-top": "20px",
      "margin-bottom": "20px",
      "font-weight": "normal",
      "border-left": "3px solid #d9d9d9",
      "font-size": "16px"
    },
    "codeBlock": {
      "background-color": "#f7f7f8",
      "color": "#242424",
      "padding": "16px",
      "border-radius": "8px",
      "font-size": "13.5px",
      "border": "1px solid #e5e5e5"
    },
    "codeBlockTitle": {
      "background-color": "#ececec",
      "color": "#5f5f5f",
      "padding": "8px 12px",
      "border-radius": "8px 8px 0 0",
      "border": "1px solid #e5e5e5"
    },
    "a": { "color": "#2563eb", "text-decoration": "underline", "font-weight": "bold" },
    "img": {
      "width": "100%",
      "border-radius": "8px",
      "margin-top": "20px",
      "margin-bottom": "20px",
      "margin-left": "auto",
      "margin-right": "auto",
      "background-color": "white",
      "padding": "0px",
      "box-shadow": "none"
    },
    "code": {
      "background-color": "#f7f7f8",
      "color": "#242424",
      "padding": "2px 6px",
      "border-radius": "5px",
      "font-weight": "normal",
      "border": "1px solid #e5e5e5"
    },
    "video": {
      "width": "100%",
      "height": "315px",
      "border-radius": "8px",
      "box-shadow": "none",
      "margin-top": "20px",
      "margin-bottom": "20px",
      "margin-left": "auto",
      "margin-right": "auto",
      "display": "block"
    },
    "math": {
      "color": "#2f2f2f",
      "font-size": "16px",
      "text-align": "center",
      "margin-top": "20px",
      "margin-bottom": "20px"
    },
    "map": {
      "width": "100%",
      "height": "400px",
      "border-radius": "8px",
      "box-shadow": "none",
      "margin-top": "20px",
      "margin-bottom": "20px",
      "margin-left": "auto",
      "margin-right": "auto"
    },
    "footnote": {
      "font-size": "13px",
      "color": "#6b6b6b",
      "line-height": "1.5",
      "margin-top": "12px",
      "margin-bottom": "12px",
      "font-weight": "normal"
    }
  },
  "hrStructure": {
    "borderTopStyle": "solid",
    "borderTopWidth": "1px",
    "marginTopBottom": "28px",
    "lineWidth": "100%"
  },
  "checkboxStructure": {
    "boxSize": "16px",
    "checkedEffect": "none",
    "textGap": "9px",
    "color": "#2f2f2f"
  },
  "tableStructure": {
    "outerBorderWidth": "1px",
    "rowBorderWidth": "1px",
    "colBorderWidth": "0px"
  },
  "bulletStructure": {
    "level1": "disc",
    "level2": "circle",
    "level3": "square"
  },
  "mediaCaptionStructure": {
    "position": "top",
    "format": "standard",
    "customTemplate": "**{kind} {n}. {title}**"
  },
  "headingNumbering": [],
  "customCss": ""
}
\`\`\`

---

## 📌 2. 15대 서식 카테고리별 전체 속성 사전 (100% 전수 명세)

온리비 어서 서식 편집기(\`CssStyleForm\`)의 15개 상세 탭에 존재하는 **모든 설정 항목과 CSS 속성·구조체 매핑 사전**입니다.

### 1️⃣ 카테고리 1: 본문·여백 (\`pageStyle\`, \`rules.p\`, \`strong\`, \`em\`, \`u\`, \`del\`)
- **용지 및 전역 타이포그래피 (\`pageStyle\`)**:
  - \`fontFamily\`: 본문 기본 폰트 패밀리 문자열
  - \`fontUrl\`: (선택) 외부 웹 폰트 CSS URL
  - \`fontSize\`: 출판 포인트(\`"10pt"\`, \`"10.5pt"\`, \`"11pt"\`, \`"12pt"\`) 또는 픽셀(\`"15px"\`~\`"16.5px"\`)
  - \`lineHeight\`: 기본 줄간격 (\`"1.65"\`~\`"1.85"\`)
  - \`letterSpacing\`: 기본 자간 (\`"-0.01em"\`, \`"0em"\` 등)
  - \`backgroundColor\`: 용지 배경색 (기본 \`"#ffffff"\`, 미색 에세이 \`"#FAF6ED"\` 등)
  - \`paperSize\`: \`"a4"\` (기본) | \`"b5"\` | \`"letter"\` | \`"sns_square"\` (SNS 카드뉴스 1:1 정사각) | \`"sns_portrait"\` (SNS 카드뉴스 4:5 세로형)
  - \`orientation\`: \`"portrait"\` (세로형) | \`"landscape"\` (가로형)
  - \`marginTop\`, \`marginBottom\`: 상하 여백 (표준 \`"18mm"\`)
  - \`marginLeft\`, \`marginRight\`: 좌우 여백 (표준 \`"12mm"\`)
  - \`headingSizeOffset\`: H1→H6 단계별 활자 크기 자동 차감폭 (**미정의 시 최초 기본값 \`"3pt"\`**, 슬라이더로 \`"0pt"\`~\`"6pt"\` 0.5pt 단위 조절 가능)
  - \`tabSize\`: 탭 문자 너비 (기본 \`"2"\` 또는 \`"4"\`)
  - \`exportPageBreakLevel\`: PDF/EPUB 내보내기 시 페이지 나누기 기준 (\`"none"\` 기본 | \`"h1"\` | \`"h2"\`)
- **문단 스타일 (\`rules.p\`)**:
  - \`margin-top\` (\`"0px"\`), \`margin-bottom\` (\`"16px"\`~\`"20px"\`), \`line-height\` (\`"1.75"\`), \`color\` (\`"#2f2f2f"\`)
  - \`text-align\`: \`"left"\` (좌측 정렬) | \`"center"\` | \`"right"\` | \`"justify"\` (출판물 양끝 정렬)
  - \`text-indent\`: 문단 첫 줄 들여쓰기 (\`"0px"\`, \`"16px"\`, \`"32px"\`)
  - \`letter-spacing\`: 문단 자간 (\`"-0.01em"\`)
  - \`sentence-gap\`: 문단 내 줄바꿈(\`Shift+Enter\`) 문장 간 간격 (\`"0px"\`~\`"32px"\`, 기본 \`"4px"\`, 테크 블로그 \`"8px"\`)
- **인라인 강조 4종 세부 속성**:
  - **굵게 (\`rules.strong\`)**: \`font-weight\` (\`"700"\` | \`"bold"\` | \`"900"\`), \`color\` (\`"#202123"\`), \`background-color\` (형광펜 하이라이트 배경색, 선택사항)
  - **기울임 (\`rules.em\`)**: \`font-style\` (\`"italic"\` | \`"normal"\`), \`color\` (\`"#2f2f2f"\`)
  - **밑줄 (\`rules.u\`)**: \`text-decoration\` (\`"underline"\`), \`text-decoration-style\` (\`"solid"\` 실선 | \`"dashed"\` 파선 | \`"dotted"\` 점선 | \`"wavy"\` 물결선), \`text-decoration-color\` (\`"#0d0d0d"\`), \`text-underline-offset\` (\`"3px"\`, \`0px\`~\`12px\`)
  - **취소선 (\`rules.del\`)**: \`text-decoration\` (\`"line-through"\`), \`color\` (\`"#6b6b6b"\`), \`text-decoration-color\` (취소선 색상), \`text-decoration-thickness\` (\`"1px"\`~\`"8px"\`), \`opacity\` (\`"0.1"\`~\`"1.0"\`)

### 2️⃣ 카테고리 2: 제목 (\`rules.h1\`~\`h6\` · \`pageStyle.headingSizeOffset\` · \`headingNumbering\`)
- **H1 기준 크기 및 단계별 크기 감소폭 (\`pageStyle.headingSizeOffset\`)**:
  - \`rules.h1['font-size']\`를 기준 활자 크기(\`12pt\`~\`36pt\`)로 설정하며, \`pageStyle.headingSizeOffset\`에 따라 \`H2\`~\`H6\` 크기가 \`H1 - (레벨 - 1) × 감소폭\` 공식으로 자동 계산됩니다.
  - **최초 기본값**: \`headingSizeOffset\`이 정의되어 있지 않거나 빈 값일 때 **최초 기본값은 \`"3pt"\`**로 동작합니다. (감소 없이 동일 크기를 원할 경우 슬라이더를 \`"0pt"\`로 설정)
- **제목 태그 (\`h1\` ~ \`h6\`) 지원 속성 및 장식**:
  - 기본 속성: \`font-size\`, \`font-weight\`, \`font-style\`, \`text-decoration\`, \`color\`, \`text-align\` (\`"left"\` | \`"center"\` | \`"right"\`), \`padding-left\`, \`padding-bottom\`, \`margin-top\`, \`margin-bottom\`, \`line-height\`, \`letter-spacing\`
  - **하단 밑줄 (\`border-bottom\`)**: \`"none"\` (선 없음) | \`"1px solid #색상"\` (실선) | \`"3px double #색상"\` (관보선)
  - **제목 앞 좌측 색깔바 (\`border-left\` & 색상 설정)**:
    - **4종 프리셋**: \`"none"\` (바 없음) | \`"3px solid #색상"\` (얇은 바 3px) | \`"4px solid #색상"\` (표준 바 4px) | \`"6px solid #색상"\` (굵은 바 6px)
    - **색깔바 색상 선택**: \`H1\` 및 \`H2\`~\`H6\` 각각 독립된 컬러 피커로 좌측 색깔바 색상을 자유롭게 변경할 수 있습니다.
    - **여백 자동 연동**: 좌측 색깔바를 활성화할 때 \`padding-left\`가 \`0px\`이면 글자와 바가 붙지 않도록 \`"12px"\`가 자동 부여되며, \`[바 없음]\` 선택 시 \`border-left: "none"\` 및 \`padding-left: "0px"\`으로 즉시 원복됩니다.
- **제목 자동 번호/기호 체계 (\`headingNumbering\` — 길이 6 배열, H1~H6 순서)**:
  - 기본 문자열 포맷:
    - \`"none"\`: 번호 없음
    - \`"decimal"\`: \`1.\`, \`2.\`, \`3.\`
    - \`"decimal-outline"\`: 계층형 십진 분류 (\`1.\` ➔ \`1.1\` ➔ \`1.1.1\` ➔ \`1.1.1.1\` — KS/ISO 기술표준)
    - \`"roman"\`: \`Ⅰ.\`, \`Ⅱ.\`, \`Ⅲ.\`
    - \`"hangul"\`: \`가.\`, \`나.\`, \`다.\`
    - \`"decimal-paren"\` / \`"hangul-paren"\`: \`1)\`, \`2)\` / \`가)\`, \`나)\`
  - 사용자 정의 객체 (\`custom\`):
    - **학술 장·절 체계**: \`{ "type": "custom", "number": "decimal", "prefix": "제", "suffix": "장" }\`
    - **대기업 개조식 기호**: \`{ "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "□" }\`

### 3️⃣ 카테고리 3: 표 (\`rules.table\`, \`th\`, \`td\` & \`tableStructure\`)
- **표 테두리 구조체 (\`tableStructure\`) 3대 프리셋**:
  1. **가로선 강조형 (기본/논문/보고서)**: \`outerBorderWidth: "1px"\` (또는 \`"2px"\`), \`rowBorderWidth: "1px"\`, \`colBorderWidth: "0px"\` (세로선 없음)
  2. **모든 테두리 격자형 (KS/엑셀)**: \`outerBorderWidth: "1px"\`, \`rowBorderWidth: "1px"\`, \`colBorderWidth: "1px"\`
  3. **미니멀형**: \`outerBorderWidth: "0px"\`, \`rowBorderWidth: "1px"\`, \`colBorderWidth: "0px"\`
- **표 세부 속성 (\`table\`, \`th\`, \`td\`)**:
  - \`table\`: \`width\` (\`"100%"\`), \`border-collapse\` (\`"collapse"\`), \`border-color\` (\`"#9ca3af"\`), \`font-size\` (\`"15px"\`), \`margin-top\`, \`margin-bottom\`, \`border-radius\` (\`"8px"\`), \`overflow\` (\`"hidden"\`)
  - \`th\`: \`background-color\` (\`"#f7f7f8"\`), \`color\` (\`"#202123"\`), \`font-weight\` (\`"650"\`), \`text-align\` (\`"left"\`|\`"center"\`|\`"right"\`), \`padding\` (\`"5px 8px"\`), \`border-color\` (\`"#cbd5e1"\`)
  - \`td\`: \`background-color\`, \`color\` (\`"#2f2f2f"\`), \`text-align\`, \`padding\` (\`"5px 8px"\`), \`border-color\` (\`"#cbd5e1"\`)
  - ⚠️ **주의**: \`th\`, \`td\` 내부에 \`border-left: none\` 같은 방향별 테두리 속성을 직접 넣지 마세요.

### 4️⃣ 카테고리 4: 인용구 (\`rules.blockquote\`)
- **지원 속성**: \`color\`, \`background-color\`, \`font-size\`, \`font-weight\` (\`"normal"\`|\`"bold"\`), \`font-style\` (\`"normal"\`|\`"italic"\`), \`padding\`, \`border-left\`, \`border\`, \`border-radius\`, \`box-shadow\`, \`margin-top\`, \`margin-bottom\`
- **3대 형태 배타 규칙**:
  1. **왼쪽 띠형 (Left Bar)**: \`"border-left": "4px solid #1d4ed8"\` 지정 (이때 \`border\` 전체 속성은 넣지 않음)
  2. **전체 박스형 (Full Box)**: \`"border": "1px solid #cbd5e1"\`, \`"border-left": "none"\`, \`"border-radius": "8px"\`
  3. **그림자 박스형 (Shadow Box)**: \`"border": "none"\`, \`"border-left": "none"\`, \`"box-shadow": "0 8px 24px rgba(0,0,0,0.08)"\`

### 5️⃣ 카테고리 5: 코드블록 (\`rules.codeBlock\` & \`rules.codeBlockTitle\`)
- **지원 속성**: \`background-color\`, \`color\`, \`font-size\` (\`"13.5px"\` 또는 \`"inherit"\`), \`line-height\` (\`"1.35"\`), \`padding\` (\`"16px"\`), \`border-radius\` (\`"8px"\`), \`border\` (\`"1px solid #e5e5e5"\`)
- **3대 테마 프리셋**:
  1. **라이트 기본 박스**: 본문 \`#f7f7f8\` (글자 \`#242424\`) / 타이틀바 \`#ececec\` (글자 \`#5f5f5f\`)
  2. **Mac OS 다크 테마**: 본문 \`#282c34\` (글자 \`#abb2bf\`) / 타이틀바 \`#21252b\` (글자 \`#9da5b4\`)
  3. **다크 네이비 고정**: 본문 \`#0f172a\` (글자 \`#f8fafc\`) / 타이틀바 \`#1e293b\` (글자 \`#94a3b8\`)

### 6️⃣ 카테고리 6: 인라인코드 (\`rules.code\`)
- **지원 속성**: \`background-color\` (\`"#f7f7f8"\`), \`color\` (\`"#242424"\`), \`font-weight\` (\`"normal"\`|\`"bold"\`), \`border-radius\` (\`"5px"\`), \`padding\` (\`"2px 6px"\`), \`padding-left\`, \`padding-right\`, \`border\` (\`"1px solid #e5e5e5"\`)

### 7️⃣ 카테고리 7: 하이퍼링크 (\`rules.a\`)
- **지원 속성**: \`color\` (\`"#2563eb"\`), \`text-decoration\` (\`"underline"\` | \`"none"\`), \`font-weight\` (\`"bold"\` | \`"normal"\`)

### 8️⃣ 카테고리 8: 각주 (\`rules.footnote\`)
- **지원 속성**: \`font-size\` (\`"13px"\` 또는 \`"9pt"\`), \`color\` (\`"#6b6b6b"\`), \`font-weight\` (\`"normal"\` | \`"bold"\`), \`line-height\` (\`"1.5"\`~\`"1.6"\`), \`margin-top\` (\`"12px"\`), \`margin-bottom\` (\`"12px"\`)

### 9️⃣ 카테고리 9: 목록·체크 (\`ul\`, \`ol\`, \`li\`, \`taskList\`, \`bulletStructure\`, \`checkboxStructure\`)
- **순서 있는 숫자 목록 (\`rules.ol['list-style-type']\`) 지원 전체 체계**:
  - \`"decimal"\`: 기본 아라비아 숫자 (\`1, 2, 3\`)
  - \`"onrivi-circled-decimal"\`: **원문자 숫자 목록 체계 (\`①, ②, ③\`)** — 온리비 전용 특수 마커
  - \`"onrivi-report"\`: **한국형 보고서 다단계 번호 체계 (\`Ⅰ. → 1. → 가. → 1) → 가)\`)** — 온리비 전용 공문서·보고서 마커
  - \`"decimal-leading-zero"\`: \`01, 02, 03\`
  - \`"lower-roman"\` (\`i, ii, iii\`), \`"upper-roman"\` (\`I, II, III\`), \`"none"\` (번호 숨김)
- **글머리 기호 1~3단계 계층 구조체 (\`bulletStructure\`) 지원 전체 기호 (13종)**:
  - \`level1\`, \`level2\`, \`level3\`에 지정 가능한 값:
    - \`"disc"\` (• 검은 원), \`"circle"\` (○ 빈 원), \`"square"\` (■ 검은 네모), \`"white-square"\` (▫ 빈 네모)
    - \`"diamond"\` (◆ 검은 마름모), \`"white-diamond"\` (◇ 빈 마름모), \`"dash"\` (- 대시), \`"hyphen"\` (– 하이픈)
    - \`"arrow"\` (▶ 화살표), \`"check"\` (✓ 체크), \`"star"\` (★ 별표), \`"dot"\` (· 가운뎃점)
    - \`"custom"\`: 사용자 직접 입력 기호 (\`custom1\`, \`custom2\`, \`custom3\`에 \`"□"\`, \`"○"\`, \`"ㆍ"\`, \`"※"\` 등 임의 기호 지정)
    - \`"none"\`: 기호 없음
- **목록 들여쓰기 및 항목 간격 (\`rules.ul\`, \`rules.ol\`, \`rules.li\`)**:
  - \`ul\`, \`ol\`: \`padding-left\` (들여쓰기 너비, 기본 \`"28px"\`), \`color\` (마커 및 본문 색상 \`"#2f2f2f"\`)
  - \`li\`: \`margin-bottom\` (항목 간 여백 \`"5px"\`), \`padding-inline-start\` (기호 마커와 텍스트 사이 간격 \`"3px"\`, \`0px\`~\`32px\`), \`line-height\` (\`"1.7"\`)
- **체크리스트 (\`checkboxStructure\` & \`rules.taskList\`)**:
  - \`boxSize\`: 체크박스 크기 (\`"16px"\`, \`8px\`~\`32px\`)
  - \`textGap\`: 체크박스와 텍스트 간격 (\`"9px"\`, \`0px\`~\`32px\`)
  - \`color\`: 체크박스 및 텍스트 색상 (본문 기본색 \`"#2f2f2f"\`)
  - \`checkedEffect\`: 완료 항목 스타일 (\`"none"\` 기본 효과없음 | \`"line-through-and-dim"\` 취소선+반투명 | \`"dim-only"\` 반투명만)

### 🔟 카테고리 10: 구분선 (\`rules.hr\` & \`hrStructure\`)
- **구분선 구조체 (\`hrStructure\`)**:
  - \`borderTopStyle\`: \`"solid"\` (실선) | \`"dotted"\` (점선) | \`"dashed"\` (파선) | \`"double"\` (이중선)
  - \`borderTopWidth\`: 선 두께 (\`"1px"\` ~ \`"10px"\`)
  - \`marginTopBottom\`: 상하 여백 (\`"28px"\`, \`0px\`~\`100px\`)
  - \`lineWidth\`: 가로 폭 비율 (\`"100%"\` 전체 | \`"75%"\` | \`"50%"\` 중앙 절반 | \`"30%"\` 소형 포인트선)
- **구분선 색상**: \`rules.hr['border-top-color']\` (기본 \`"#e5e5e5"\`)

### 1️⃣1️⃣ 카테고리 11: 이미지 (\`rules.img\`)
- **지원 속성**: \`width\` (\`"100%"\` | \`"75%"\` | \`"50%"\`), \`border-radius\` (\`"8px"\`), \`box-shadow\`, \`border\`, \`border-bottom-width\`, \`background-color\`, \`padding\`, \`margin-top\`, \`margin-bottom\`, \`margin-left\`, \`margin-right\`
- **3대 액자 프레임 프리셋**:
  1. **기본형 (Standard)**: \`border-radius: "8px"\`, \`padding: "0px"\`, \`box-shadow: "none"\`
  2. **폴라로이드형 (Polaroid)**: \`background-color: "white"\`, \`border: "10px solid white"\`, \`border-bottom-width: "32px"\`, \`border-radius: "4px"\`, \`box-shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"\`
  3. **둥근 썸네일형 (Rounded Thumbnail)**: \`border-radius: "16px"\`, \`box-shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"\`
- **좌·중·우 정렬 규칙 (\`img\`, \`video\`, \`map\` 공통)**:
  - **가운데 정렬 (기본)**: \`"margin-left": "auto"\`, \`"margin-right": "auto"\`
  - **왼쪽 정렬**: \`"margin-left": "0px"\`, \`"margin-right": "auto"\`
  - **오른쪽 정렬**: \`"margin-left": "auto"\`, \`"margin-right": "0px"\`

### 1️⃣2️⃣ 카테고리 12: 비디오 (\`rules.video\`)
- **지원 속성**: \`width\` (\`"100%"\`), \`height\` (\`"315px"\`~\`"450px"\`), \`border-radius\` (\`"8px"\`), \`box-shadow\`, \`display\` (\`"block"\`), \`margin-top\`, \`margin-bottom\`, \`margin-left\`, \`margin-right\`

### 1️⃣3️⃣ 카테고리 13: 지도 (\`rules.map\`)
- **지원 속성**: \`width\` (\`"100%"\`), \`height\` (\`"400px"\`), \`border-radius\` (\`"8px"\`), \`box-shadow\`, \`margin-top\`, \`margin-bottom\`, \`margin-left\`, \`margin-right\`

### 1️⃣4️⃣ 카테고리 14: 수식 (\`rules.math\`)
- **지원 속성**: \`color\` (\`"#2f2f2f"\`), \`font-size\` (\`"16px"\` 또는 \`"inherit"\`), \`text-align\` (\`"center"\` | \`"left"\` | \`"right"\`), \`margin-top\` (\`"20px"\`), \`margin-bottom\` (\`"20px"\`)

### 1️⃣5️⃣ 카테고리 15: 고급 CSS 및 미디어 캡션·그림책 확장 구조체 (\`customCss\`, \`mediaCaptionStructure\`, \`layout\`)
- **미디어·표 캡션 구조체 (\`mediaCaptionStructure\` & \`kindOverrides\`)**:
  - 공통 설정:
    - \`position\`: \`"top"\` (상단 배치) | \`"bottom"\` (하단 배치)
    - \`format\`:
      - \`"standard"\`: \`**그림 1. 제목**\` (\`**{kind} {n}. {title}**\`)
      - \`"bracket"\`: \`**[그림 1] 제목**\` (\`**[{kind} {n}] {title}**\`)
      - \`"angle"\`: \`**<표 1> 제목**\` (\`**<{kind} {n}> {title}**\`)
      - \`"plain"\`: \`그림 1. 제목\` (볼드 없음)
      - \`"title-only"\`: \`**제목**\` (번호 없이 제목만)
      - \`"custom"\`: \`customTemplate\` 문자열 직접 사용 (\`{kind}\`, \`{n}\`, \`{title}\` 치환자 지원)
  - **4대 대상(\`table\`, \`image\`, \`video\`, \`map\`) 개별 오버라이드 (\`kindOverrides\`)**:
    \`\`\`json
    "mediaCaptionStructure": {
      "position": "top",
      "format": "angle",
      "customTemplate": "**<{kind} {n}> {title}**",
      "kindOverrides": {
        "table": { "position": "top", "format": "angle" },
        "image": { "position": "bottom", "format": "bracket" },
        "video": { "position": "bottom", "format": "bracket" },
        "map": { "position": "bottom", "format": "bracket" }
      }
    }
    \`\`\`
- **그림책 / 스토리북 고정 레이아웃 (\`layout\`)**:
  \`\`\`json
  "layout": {
    "schemaVersion": 1,
    "type": "picturebook",
    "cover": "full-image",
    "imageRatio": 0.55,
    "imageFit": "cover",
    "gap": "24px",
    "pageNumbers": true
  }
  \`\`\`
  - \`cover\`: \`"full-image"\` (전체 그림 표지) | \`"image-right"\` (오른쪽 그림 표지)
- **고급 사용자 정의 CSS (\`customCss\`)**:
  - 프리뷰 루트(\`.custom-preview-container\`) 하위에 적용할 추가 CSS 규칙을 자유롭게 문자열로 작성할 수 있습니다.

---

## 📌 3. 외부 AI용 만능 서식 생성 프롬프트 템플릿

외부 AI(ChatGPT, Claude, Gemini 등)에 아래 프롬프트를 복사하여 붙여넣고 **[내가 원하는 서식 컨셉]** 한 줄만 수정하면 완벽한 최신 온리비 서식 JSON을 얻을 수 있습니다.

\`\`\`text
${AI_MASTER_PROMPT_TEMPLATE}
\`\`\`
`;
