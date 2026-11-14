`# 🎨 온리비 어서(Onrivi Author) 최신 서식 프로필(CSS Profile) 작성 및 생성 가이드 (v2026.11 · 15대 카테고리 전수 수록)

이 문서는 **온리비 어서(Onrivi Author)** 전용 서식 프로필(`.json`)의 공식 최신 스키마 명세서이자, 서식 편집기의 **15대 상세 카테고리(본문·여백, 제목, 표, 인용구, 코드블록, 인라인코드, 하이퍼링크, 각주, 목록·체크, 구분선, 이미지, 비디오, 지도, 수식, 고급 CSS)**와 **간편 스타일링(9대 문서 분위기 & 테마 컬러 · 5대 제목 장식 형식)**, 그리고 **폴더별 기본 서식 및 3단계 서식 우선순위 규칙**을 100% 수록한 **완전판 레퍼런스 가이드**입니다.

> 💡 **핵심 요약 및 서식 관리 센터 최신 기능 안내 (v2026.11)**
> 1. **공식 기본 서식 ('Onrivi 기본서식' = Google Developers DevSite 표준)**: 온리비 어서의 기본 서식(`system-1`)은 **Google Developer Documentation Style Guide(`developers.google.com/style/lists`)**의 DevSite 디자인 토큰(Roboto/Google Sans 16px 행간 1.5, `#202124` 다크차콜 본문, 40px 다단계 목록 `•➔○➔■`, `#F1F3F4` 헤더 미니멀 가로선 표, `#E8F0FE` Google Blue Note 콜아웃)을 표준으로 탑재하고 있습니다.
> 2. **3단계 서식 적용 우선순위 (`파일 지정 서식 ➔ 폴더 지정 서식 ➔ Onrivi 기본서식`)**:
>    - **1순위 (파일 지정 서식)**: 문서 Frontmatter(`css_profile`)에 서식이 지정되어 있거나 새 문서 생성/가져오기 시 파일 서식을 직접 선택한 경우 해당 서식을 최우선 적용합니다.
>    - **2순위 (폴더 지정 서식)**: 파일에 지정된 서식이 없을 때, 해당 파일이 속한 폴더(또는 상위 폴더)에 지정된 **폴더 기본 서식**(폴더 생성 시 지정 또는 탐색기 폴더 우클릭 `폴더 기본 서식 설정`)이 있으면 폴더 서식을 자동 적용합니다.
>    - **3순위 (Onrivi 기본서식)**: 다른 곳에서 가져온 파일에 적용된 서식이 없고 폴더에도 지정된 서식이 없는 경우(또는 `Onrivi 기본서식` 강제 선택 시), 이전 탭이나 폴더와 무관하게 항상 **`Onrivi 기본서식`(`system-1`)**이 적용됩니다.
> 3. **간편 스타일링 9대 문서 분위기 & 5대 장식 형식**: `[간편 스타일링]` 탭에서 **① `🌐 온리비 기본`**, **② `💼 코발트 신뢰`**, **③ `🏛️ 대한민국 관보 & 먹색`**, **④ `🔬 인텔리전스 틸`**, **⑤ `🔥 키네틱 오렌지`**, **⑥ `🌿 포레스트 에메랄드`**, **⑦ `🍷 로열 버건디 와인`**, **⑧ `✨ 크리에이티브 바이올렛`**, **⑨ `☕ 따뜻한 출판 에세이`** 9종 테마와 **5대 장식 형식 스위치(하단 밑줄형 / 좌측 색깔바형 / H2밑줄+H3바형 / 관보 이중선형 / 형광펜·미니멀형)**를 원클릭으로 조합할 수 있습니다.
> 4. **사이드바 `+ 추가` 4종 문서 타입 선택 생성 & 원클릭 액션**: 좌측 사이드바 상단 `+ 추가`에서 **`📄 일반문서` · `📱 SNS 카드뉴스` · `📖 그림책(전체표지)` · `📖 그림책(오른쪽표지)`**를 즉시 생성하고, 각 서식 항목에서 **`[서식 복제] · [파일 내보내기(.json)] · [JSON 복사] · [삭제]`** 및 상단 `전체 백업`을 실행할 수 있습니다.
> 5. **원클릭 가져오기 및 누락 속성 100% 자동 정규화 (`normalizeCssProfile`)**: 서식 파일(`.json`) 드래그 앤 드롭, 내 PC 파일 선택, 클립보드 JSON 붙여넣기를 모두 지원하며, AI가 생성한 JSON에 일부 속성이 생략되어도 **`Onrivi 기본서식`** 표준 규격으로 자동 보완합니다.

---

## 📌 1. 최신 서식 프로필(JSON) 전체 구조 명세 ('Onrivi 기본서식' 표준)

아래 JSON은 최신 버전의 모든 구조체(`pageStyle`, `rules`, `tableStructure`, `bulletStructure`, `mediaCaptionStructure`, `headingNumbering`, `hrStructure`, `checkboxStructure`, `customCss`)가 포함된 **`Onrivi 기본서식`** 완전체 표준 예시입니다.

```json
{
  "id": "profile-1790253429429",
  "name": "Onrivi 기본서식",
  "description": "온리비 어서(Onrivi Author)의 공식 기본 서식 테마입니다. Google Developer Documentation Style Guide(DevSite 표준) 기반의 깔끔한 타이포그래피(#202124), 40px 다단계 목록, 미니멀 가로선 표(#F1F3F4 헤더), Google Blue 콜아웃(#E8F0FE)을 제공합니다.",
  "pageStyle": {
    "fontFamily": "'Roboto', 'Google Sans', 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    "fontUrl": "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Roboto+Mono:wght@400;500&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap",
    "fontSize": "16px",
    "lineHeight": "1.5",
    "letterSpacing": "0em",
    "backgroundColor": "#FFFFFF",
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
      "font-size": "34px",
      "font-weight": "400",
      "color": "#202124",
      "padding-left": "0px",
      "padding-bottom": "0px",
      "margin-top": "40px",
      "margin-bottom": "20px",
      "border-bottom": "",
      "border-left": "none",
      "text-align": "left",
      "line-height": "1.18",
      "letter-spacing": "-0.01em"
    },
    "h2": {
      "font-size": "24px",
      "font-weight": "400",
      "color": "#202124",
      "padding-left": "0px",
      "border-bottom": "",
      "border-left": "none",
      "padding-bottom": "0px",
      "margin-top": "40px",
      "margin-bottom": "20px",
      "text-align": "left",
      "line-height": "1.33",
      "letter-spacing": "0em"
    },
    "h3": {
      "font-size": "20px",
      "font-weight": "400",
      "color": "#202124",
      "padding-left": "0px",
      "margin-top": "32px",
      "margin-bottom": "16px",
      "border-bottom": "",
      "border-left": "none",
      "text-align": "left",
      "line-height": "1.6"
    },
    "h4": {
      "font-size": "16px",
      "font-weight": "500",
      "color": "#202124",
      "margin-top": "24px",
      "margin-bottom": "12px",
      "border-bottom": "",
      "border-left": "none",
      "text-align": "left",
      "line-height": "1.5"
    },
    "h5": {
      "font-size": "15px",
      "font-weight": "500",
      "color": "#202124",
      "margin-top": "20px",
      "margin-bottom": "8px",
      "border-bottom": "",
      "border-left": "none",
      "text-align": "left",
      "line-height": "1.5"
    },
    "h6": {
      "font-size": "14px",
      "font-weight": "500",
      "color": "#5f6368",
      "margin-top": "16px",
      "margin-bottom": "8px",
      "border-bottom": "",
      "border-left": "none",
      "text-align": "left",
      "line-height": "1.5"
    },
    "p": {
      "margin-top": "0px",
      "margin-bottom": "16px",
      "line-height": "1.5",
      "color": "#202124",
      "text-align": "left",
      "text-indent": "0px",
      "letter-spacing": "0em",
      "sentence-gap": "4px"
    },
    "strong": { "font-weight": "700", "color": "#202124" },
    "em": { "font-style": "italic", "color": "#202124" },
    "u": {
      "text-decoration": "underline",
      "text-decoration-color": "#1a73e8",
      "text-decoration-style": "solid",
      "text-underline-offset": "3px"
    },
    "del": { "text-decoration": "line-through", "color": "#5f6368" },
    "ul": { "padding-left": "40px", "list-style-type": "disc", "color": "#202124" },
    "ol": { "padding-left": "40px", "list-style-type": "decimal", "color": "#202124" },
    "li": { "margin-bottom": "8px", "padding-inline-start": "4px", "line-height": "1.5", "color": "#202124" },
    "taskList": { "boxSize": "16px", "checkedEffect": "none", "textGap": "9px", "color": "#202124" },
    "hr": {
      "border-top-color": "#dadce0",
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
      "border-width": "0px",
      "border-color": "#dadce0",
      "margin-top": "16px",
      "margin-bottom": "16px",
      "font-size": "14px",
      "border-radius": "8px",
      "overflow": "hidden"
    },
    "th": {
      "background-color": "#f1f3f4",
      "padding": "12px 16px",
      "border-style": "solid",
      "border-width": "1px",
      "border-color": "#dadce0",
      "font-weight": "500",
      "font-size": "14px",
      "text-align": "left",
      "color": "#202124"
    },
    "td": {
      "background-color": "#ffffff",
      "padding": "12px 16px",
      "border-style": "solid",
      "border-width": "1px",
      "border-color": "#e8eaed",
      "font-size": "14px",
      "text-align": "left",
      "color": "#202124"
    },
    "blockquote": {
      "padding": "15px 24px",
      "color": "#202124",
      "background-color": "#e8f0fe",
      "border-radius": "4px",
      "margin-top": "16px",
      "margin-bottom": "16px",
      "font-weight": "normal",
      "border-left": "4px solid #1a73e8",
      "font-size": "16px"
    },
    "codeBlock": {
      "background-color": "#f1f3f4",
      "color": "#37474f",
      "padding": "16px 24px",
      "border-radius": "8px",
      "font-size": "14px",
      "line-height": "1.45",
      "border": "1px solid #dadce0"
    },
    "codeBlockTitle": {
      "background-color": "#e8eaed",
      "color": "#37474f",
      "padding": "8px 12px",
      "border-radius": "8px 8px 0 0",
      "border": "1px solid #dadce0"
    },
    "a": { "color": "#1a73e8", "text-decoration": "underline", "font-weight": "normal" },
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
      "background-color": "#f1f3f4",
      "color": "#37474f",
      "padding": "2px 4px",
      "border-radius": "4px",
      "font-weight": "normal",
      "border": "none"
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
      "color": "#202124",
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
      "color": "#5f6368",
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
    "color": "#202124"
  },
  "tableStructure": {
    "outerBorderWidth": "0px",
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
  "customCss": ".custom-preview-container h1, .custom-preview-container h2, .custom-preview-container h3 { font-family: 'Google Sans', 'Roboto', 'Noto Sans KR', sans-serif !important; }n.custom-preview-container code, .custom-preview-container pre { font-family: 'Roboto Mono', 'JetBrains Mono', monospace !important; }n.custom-preview-container ul ol, .custom-preview-container ol ol { list-style-type: lower-alpha !important; }"
}
```

---

## 📌 2. 15대 서식 카테고리별 전체 속성 사전 (100% 전수 명세)

온리비 어서 서식 편집기(`CssStyleForm`)의 15개 상세 탭에 존재하는 **모든 설정 항목과 CSS 속성·구조체 매핑 사전**입니다.

### 1️⃣ 카테고리 1: 본문·여백 (`pageStyle`, `rules.p`, `strong`, `em`, `u`, `del`)
- **용지 및 전역 타이포그래피 (`pageStyle`)**:
  - `fontFamily`: 본문 기본 폰트 패밀리 문자열 (Onrivi 기본서식: `'Roboto', 'Google Sans', 'Noto Sans KR', sans-serif`)
  - `fontUrl`: (선택) 외부 웹 폰트 CSS URL
  - `fontSize`: 출판 포인트(`"10pt"`, `"10.5pt"`, `"11pt"`, `"12pt"` — 0.5pt 정밀 눈금자 지원) 또는 픽셀(`"15px"`~`"16.5px"`, 기본 `"16px"`)
  - `lineHeight`: 기본 줄간격 (`"1.5"`~`"1.85"`, Onrivi 기본서식 `"1.5"`)
  - `letterSpacing`: 기본 자간 (`"0em"`, `"-0.01em"` 등)
  - `backgroundColor`: 용지 배경색 (기본 `"#FFFFFF"`, 미색 에세이 `"#FAF6ED"` 등)
  - `paperSize`: `"a4"` (기본) | `"b5"` | `"letter"` | `"sns_square"` (SNS 카드뉴스 1:1 정사각) | `"sns_portrait"` (SNS 카드뉴스 4:5 세로형)
  - `orientation`: `"portrait"` (세로형) | `"landscape"` (가로형)
  - `marginTop`, `marginBottom`: 상하 여백 (표준 `"18mm"`)
  - `marginLeft`, `marginRight`: 좌우 여백 (표준 `"12mm"`)
  - `headingSizeOffset`: H1→H6 단계별 활자 크기 자동 차감폭 (**미정의 시 최초 기본값 `"3pt"`**, 슬라이더로 `"0pt"`~`"6pt"` 0.5pt 단위 조절 가능)
  - `tabSize`: 탭 문자 너비 (기본 `"2"` 또는 `"4"`)
  - `exportPageBreakLevel`: PDF/EPUB 내보내기 시 페이지 나누기 기준 (`"none"` 기본 | `"h1"` | `"h2"`)
- **문단 스타일 (`rules.p`)**:
  - `margin-top` (`"0px"`), `margin-bottom` (`"16px"`~`"20px"`), `line-height` (`"1.5"`~`"1.8"`), `color` (`"#202124"`)
  - `text-align`: `"left"` (좌측 정렬) | `"center"` | `"right"` | `"justify"` (출판물 양끝 정렬)
  - `text-indent`: 문단 첫 줄 들여쓰기 (`"0px"`, `"16px"`, `"32px"`)
  - `letter-spacing`: 문단 자간 (`"0em"` | `"-0.01em"`)
  - `sentence-gap`: 문단 내 줄바꿈(`Shift+Enter`) 문장 간 간격 (`"0px"`~`"32px"`, 기본 `"4px"`, 테크 블로그 `"8px"`)
- **인라인 강조 4종 세부 속성**:
  - **굵게 (`rules.strong`)**: `font-weight` (`"700"` | `"bold"` | `"900"`), `color` (`"#202124"`), `background-color` (형광펜 하이라이트 배경색, 예: `"#EDE9FE"` 또는 `"#FEF08A"`)
  - **기울임 (`rules.em`)**: `font-style` (`"italic"` | `"normal"`), `color` (`"#202124"`)
  - **밑줄 (`rules.u`)**: `text-decoration` (`"underline"`), `text-decoration-style` (`"solid"` 실선 | `"dashed"` 파선 | `"dotted"` 점선 | `"wavy"` 물결선), `text-decoration-color` (`"#1a73e8"`), `text-underline-offset` (`"3px"`, `0px`~`12px`)
  - **취소선 (`rules.del`)**: `text-decoration` (`"line-through"`), `color` (`"#5f6368"`), `text-decoration-color` (취소선 색상), `text-decoration-thickness` (`"1px"`~`"8px"`), `opacity` (`"0.1"`~`"1.0"`)

### 2️⃣ 카테고리 2: 제목 (`rules.h1`~`h6` · `pageStyle.headingSizeOffset` · `headingNumbering`)
- **H1 기준 크기 및 단계별 크기 감소폭 (`pageStyle.headingSizeOffset`)**:
  - `rules.h1['font-size']`를 기준 활자 크기(`12pt`~`36pt`)로 설정하며, `pageStyle.headingSizeOffset`에 따라 `H2`~`H6` 크기가 `H1 - (레벨 - 1) × 감소폭` 공식으로 자동 계산됩니다.
  - **최초 기본값**: `headingSizeOffset`이 정의되어 있지 않거나 빈 값일 때 **최초 기본값은 `"3pt"`**로 동작합니다.
- **제목 태그 (`h1` ~ `h6`) 지원 속성 및 5대 장식 형식**:
  - 기본 속성: `font-size`, `font-weight`, `font-style`, `text-decoration`, `color`, `text-align` (`"left"` | `"center"` | `"right"`), `padding-left`, `padding-bottom`, `margin-top`, `margin-bottom`, `line-height`, `letter-spacing`
  - **하단 밑줄 (`border-bottom`)**: `""`/`"none"` (선 없음) | `"1px solid #색상"` (실선) | `"2px solid #색상"` (강조 실선) | `"3px double #색상"` (관보 이중선)
  - **제목 앞 좌측 색깔바 (`border-left` & 여백 자동 연동)**:
    - **4종 프리셋**: `"none"` (바 없음) | `"3px solid #색상"` (얇은 바 3px) | `"4px solid #색상"` (표준 바 4px) | `"6px solid #색상"` (굵은 바 6px)
    - **여백 자동 연동**: 좌측 색깔바를 활성화할 때 `padding-left: "12px"`가 자동 부여되며, `[바 없음]` 선택 시 `border-left: "none"` 및 `padding-left: "0px"`으로 즉시 원복됩니다.
- **제목 자동 번호/기호 체계 (`headingNumbering` — 길이 6 배열, H1~H6 순서, 미설정 기본값 `[]`)**:
  - 기본 문자열 포맷:
    - `"none"`: 번호 없음 (디폴트)
    - `"decimal"`: `1.`, `2.`, `3.`
    - `"decimal-outline"`: 계층형 십진 분류 (`1.` ➔ `1.1` ➔ `1.1.1` ➔ `1.1.1.1` — KS/ISO 기술표준)
    - `"roman"`: `Ⅰ.`, `Ⅱ.`, `Ⅲ.` (보고서 표준 H1)
    - `"hangul"`: `가.`, `나.`, `다.`
    - `"decimal-paren"` / `"hangul-paren"`: `1)`, `2)` / `가)`, `나)`
  - 사용자 정의 객체 (`custom`):
    - **학술·법령 장·절·조 체계**: `{ "type": "custom", "number": "decimal", "prefix": "제", "suffix": "장 " }`
    - **대기업 개조식 기호**: `{ "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "□" }`

### 3️⃣ 카테고리 3: 표 (`rules.table`, `th`, `td` & `tableStructure`)
- **표 테두리 구조체 (`tableStructure`) 3대 프리셋**:
  1. **미니멀형 (Onrivi 기본서식 / Google Developers 표준)**: `outerBorderWidth: "0px"`, `rowBorderWidth: "1px"`, `colBorderWidth: "0px"`
  2. **가로선 강조형 (논문/보고서)**: `outerBorderWidth: "1px"` (또는 `"2px"`), `rowBorderWidth: "1px"`, `colBorderWidth: "0px"` (세로선 없음)
  3. **모든 테두리 격자형 (KS/엑셀)**: `outerBorderWidth: "1px"`, `rowBorderWidth: "1px"`, `colBorderWidth: "1px"`
- **표 세부 속성 (`table`, `th`, `td`)**:
  - `table`: `width` (`"100%"`), `border-collapse` (`"collapse"`), `border-color` (`"#dadce0"`), `font-size` (`"14px"`~`"15px"`), `margin-top`, `margin-bottom`, `border-radius` (`"8px"`), `overflow` (`"hidden"`)
  - `th`: `background-color` (`"#f1f3f4"`), `color` (`"#202124"`), `font-weight` (`"500"`~`"650"`), `text-align` (`"left"`|`"center"`|`"right"`), `padding` (`"12px 16px"` 또는 `"5px 8px"`), `border-color` (`"#dadce0"`)
  - `td`: `background-color` (`"#ffffff"`), `color` (`"#202124"`), `text-align`, `padding` (`"12px 16px"`), `border-color` (`"#e8eaed"`)
  - ⚠️ **주의**: `th`, `td` 내부에 `border-left: none` 같은 방향별 테두리 속성을 직접 넣지 마세요.

### 4️⃣ 카테고리 4: 인용구 (`rules.blockquote`)
- **지원 속성**: `color`, `background-color`, `font-size`, `font-weight` (`"normal"`|`"bold"`), `font-style` (`"normal"`|`"italic"`), `padding`, `border-left`, `border`, `border-radius`, `box-shadow`, `margin-top`, `margin-bottom`
- **3대 형태 배타 규칙**:
  1. **왼쪽 띠형 (Left Bar — Onrivi 기본서식 Note 콜아웃)**: `"border-left": "4px solid #1a73e8"`, `"background-color": "#e8f0fe"` 지정 (이때 `border` 전체 속성은 넣지 않음)
  2. **전체 박스형 (Full Box)**: `"border": "1px solid #059669"`, `"border-left": "none"`, `"border-radius": "8px"`
  3. **그림자 박스형 (Shadow Box)**: `"border": "none"`, `"border-left": "none"`, `"box-shadow": "0 8px 24px rgba(0,0,0,0.08)"`

### 5️⃣ 카테고리 5: 코드블록 (`rules.codeBlock` & `rules.codeBlockTitle`)
- **지원 속성**: `background-color`, `color`, `font-size` (`"14px"`, `"13.5px"`, `"inherit"`), `line-height` (`"1.45"`), `padding` (`"16px 24px"`), `border-radius` (`"8px"`), `border` (`"1px solid #dadce0"`)
- **3대 테마 프리셋**:
  1. **DevSite 라이트 박스 (Onrivi 기본서식)**: 본문 `#f1f3f4` (글자 `#37474f`) / 타이틀바 `#e8eaed` (글자 `#37474f`)
  2. **Mac OS 다크 테마**: 본문 `#282c34` (글자 `#abb2bf`) / 타이틀바 `#21252b` (글자 `#9da5b4`)
  3. **다크 네이비 고정**: 본문 `#0f172a` (글자 `#f8fafc`) / 타이틀바 `#1e293b` (글자 `#94a3b8`)

### 6️⃣ 카테고리 6: 인라인코드 (`rules.code`)
- **지원 속성**: `background-color` (`"#f1f3f4"`), `color` (`"#37474f"`), `font-weight` (`"normal"`|`"bold"`), `border-radius` (`"4px"`), `padding` (`"2px 4px"`), `padding-left`, `padding-right`, `border` (`"none"` 또는 `"1px solid #e5e5e5"`)

### 7️⃣ 카테고리 7: 하이퍼링크 (`rules.a`)
- **지원 속성**: `color` (`"#1a73e8"`), `text-decoration` (`"underline"` | `"none"`), `font-weight` (`"normal"` | `"bold"`)

### 8️⃣ 카테고리 8: 각주 (`rules.footnote`)
- **지원 속성**: `font-size` (`"13px"` 또는 `"9pt"`), `color` (`"#5f6368"`), `font-weight` (`"normal"` | `"bold"`), `line-height` (`"1.5"`~`"1.6"`), `margin-top` (`"12px"`), `margin-bottom` (`"12px"`)

### 9️⃣ 카테고리 9: 목록·체크 (`ul`, `ol`, `li`, `taskList`, `bulletStructure`, `checkboxStructure`)
- **순서 있는 숫자 목록 (`rules.ol['list-style-type']`) 지원 전체 체계**:
  - `"decimal"`: 기본 아라비아 숫자 (`1, 2, 3`)
  - `"onrivi-circled-decimal"`: **원문자 숫자 목록 체계 (`①, ②, ③`)** — 온리비 전용 특수 마커
  - `"onrivi-report"`: **한국형 보고서 다단계 번호 체계 (`Ⅰ. → 1. → 가. → 1) → 가)`)** — 온리비 전용 공문서·보고서 마커
  - `"decimal-leading-zero"`: `01, 02, 03`
  - `"lower-roman"` (`i, ii, iii`), `"upper-roman"` (`I, II, III`), `"none"` (번호 숨김)
- **글머리 기호 1~3단계 계층 구조체 (`bulletStructure`) 지원 전체 기호 (13종)**:
  - `level1`, `level2`, `level3`에 지정 가능한 값:
    - `"disc"` (• 검은 원), `"circle"` (○ 빈 원), `"square"` (■ 검은 네모), `"white-square"` (▫ 빈 네모)
    - `"diamond"` (◆ 검은 마름모), `"white-diamond"` (◇ 빈 마름모), `"dash"` (- 대시), `"hyphen"` (– 하이픈)
    - `"arrow"` (▶ 화살표), `"check"` (✓ 체크), `"star"` (★ 별표), `"dot"` (· 가운뎃점)
    - `"custom"`: 사용자 직접 입력 기호 (`custom1`, `custom2`, `custom3`에 `"□"`, `"○"`, `"ㆍ"`, `"※"` 등 임의 기호 지정)
    - `"none"`: 기호 없음
- **목록 들여쓰기 및 항목 간격 (`rules.ul`, `rules.ol`, `rules.li`)**:
  - `ul`, `ol`: `padding-left` (들여쓰기 너비, Onrivi 기본서식 `"40px"` / 일반 `"28px"`), `color` (`"#202124"`)
  - `li`: `margin-bottom` (항목 간 여백 `"8px"` 또는 `"5px"`), `padding-inline-start` (`"4px"`), `line-height` (`"1.5"`~`"1.7"`)
- **체크리스트 (`checkboxStructure` & `rules.taskList`)**:
  - `boxSize`: 체크박스 크기 (`"16px"`, `8px`~`32px`)
  - `textGap`: 체크박스와 텍스트 간격 (`"9px"`, `0px`~`32px`)
  - `color`: 체크박스 및 텍스트 색상 (본문 기본색 `"#202124"`)
  - `checkedEffect`: 완료 항목 스타일 (`"none"` 기본 효과없음 | `"line-through-and-dim"` 취소선+반투명 | `"dim-only"` 반투명만)

### 🔟 카테고리 10: 구분선 (`rules.hr` & `hrStructure`)
- **구분선 구조체 (`hrStructure`)**:
  - `borderTopStyle`: `"solid"` (실선) | `"dotted"` (점선) | `"dashed"` (파선) | `"double"` (이중선)
  - `borderTopWidth`: 선 두께 (`"1px"` ~ `"10px"`)
  - `marginTopBottom`: 상하 여백 (`"28px"`, `0px`~`100px`)
  - `lineWidth`: 가로 폭 비율 (`"100%"` 전체 | `"75%"` | `"50%"` 중앙 절반 | `"30%"` 소형 포인트선)
- **구분선 색상**: `rules.hr['border-top-color']` (기본 `"#dadce0"`)

### 1️⃣1️⃣ 카테고리 11: 이미지 (`rules.img`)
- **지원 속성**: `width` (`"100%"` | `"75%"` | `"50%"`), `border-radius` (`"8px"`), `box-shadow`, `border`, `border-bottom-width`, `background-color`, `padding`, `margin-top`, `margin-bottom`, `margin-left`, `margin-right`
- **3대 액자 프레임 프리셋**:
  1. **기본형 (Standard)**: `border-radius: "8px"`, `padding: "0px"`, `box-shadow: "none"`
  2. **폴라로이드형 (Polaroid)**: `background-color: "white"`, `border: "10px solid white"`, `border-bottom-width: "32px"`, `border-radius: "4px"`, `box-shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"`
  3. **둥근 썸네일형 (Rounded Thumbnail)**: `border-radius: "16px"`, `box-shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"`
- **좌·중·우 정렬 규칙 (`img`, `video`, `map` 공통)**:
  - **가운데 정렬 (기본)**: `"margin-left": "auto"`, `"margin-right": "auto"`
  - **왼쪽 정렬**: `"margin-left": "0px"`, `"margin-right": "auto"`
  - **오른쪽 정렬**: `"margin-left": "auto"`, `"margin-right": "0px"`

### 1️⃣2️⃣ 카테고리 12: 비디오 (`rules.video`)
- **지원 속성**: `width` (`"100%"`), `height` (`"315px"`~`"450px"`), `border-radius` (`"8px"`), `box-shadow`, `display` (`"block"`), `margin-top`, `margin-bottom`, `margin-left`, `margin-right`

### 1️⃣3️⃣ 카테고리 13: 지도 (`rules.map`)
- **지원 속성**: `width` (`"100%"`), `height` (`"400px"`), `border-radius` (`"8px"`), `box-shadow`, `margin-top`, `margin-bottom`, `margin-left`, `margin-right`

### 1️⃣4️⃣ 카테고리 14: 수식 (`rules.math`)
- **지원 속성**: `color` (`"#202124"`), `font-size` (`"16px"` 또는 `"inherit"`), `text-align` (`"center"` | `"left"` | `"right"`), `margin-top` (`"20px"`), `margin-bottom` (`"20px"`)

### 1️⃣5️⃣ 카테고리 15: 고급 CSS 및 미디어 캡션·그림책 확장 구조체 (`customCss`, `mediaCaptionStructure`, `layout`)
- **미디어·표 캡션 구조체 (`mediaCaptionStructure` & `kindOverrides`)**:
  - 공통 설정:
    - `position`: `"top"` (상단 배치) | `"bottom"` (하단 배치)
    - `format`:
      - `"standard"`: `**그림 1. 제목**` (`**{kind} {n}. {title}**`)
      - `"bracket"`: `**[그림 1] 제목**` (`**[{kind} {n}] {title}**`)
      - `"angle"`: `**<표 1> 제목**` (`**<{kind} {n}> {title}**`)
      - `"plain"`: `그림 1. 제목` (볼드 없음)
      - `"title-only"`: `**제목**` (번호 없이 제목만)
      - `"custom"`: `customTemplate` 문자열 직접 사용 (`{kind}`, `{n}`, `{title}` 치환자 지원)
  - **4대 대상(`table`, `image`, `video`, `map`) 개별 오버라이드 (`kindOverrides`)**:
    ```json
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
    ```
- **그림책 / 스토리북 고정 레이아웃 (`layout`)**:
  ```json
  "layout": {
    "schemaVersion": 1,
    "type": "picturebook",
    "cover": "full-image",
    "imageRatio": 0.55,
    "imageFit": "cover",
    "gap": "24px",
    "pageNumbers": true
  }
  ```
  - `cover`: `"full-image"` (전체 그림 표지) | `"image-right"` (오른쪽 그림 표지)
- **고급 사용자 정의 CSS (`customCss`)**:
  - 프리뷰 루트(`.custom-preview-container`) 하위에 적용할 추가 CSS 규칙을 자유롭게 문자열로 작성할 수 있습니다.

---

## 📌 3. 간편 스타일링 9대 문서 분위기 & 테마 컬러 + 5대 장식 형식 레퍼런스

서식 관리 센터의 `[간편 스타일링]` 탭에 탑재된 **9대 문서 분위기 & 테마 컬러**(중복 색상을 완전히 통폐합한 고유 팔레트)와 **5대 제목·강조 장식 형식** 규격입니다.

| 구분 | 테마명 | 본문 / 배경색 | 대제목(H1) / 중제목(H2) | 인용구 / 표 헤더 | 기본 장식 형식 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 🌐 온리비 기본** | `온리비 기본` | `#202124` / `#FFFFFF` | `#202124` / `#202124` | `#E8F0FE`(`#1A73E8` 바) / `#F1F3F4` | 클린 헤딩 + Google Blue 콜아웃 |
| **2. 💼 비즈니스** | `코발트 신뢰` | `#0F172A` / `#FFFFFF` | `#1D4ED8` / `#1E40AF` | `#EFF6FF`(`#2563EB` 바) / `#EFF6FF` | H1 2px 실선 + H2 1px 실선 |
| **3. 🏛️ 공문서·흑백** | `대한민국 관보 & 먹색` | `#111827` / `#FFFFFF` | `#111827` / `#1F2937` | `#F9FAFB`(`#4B5563` 바) / `#F3F4F6` | H1 3px 관보 이중선 + H2 1px 실선 |
| **4. 🔬 연구·기술** | `인텔리전스 틸` | `#0F172A` / `#FFFFFF` | `#0F766E` / `#115E59` | `#F0FDFA`(`#0D9488` 바) / `#F0FDFA` | H1 2px 하단선 + H2 4px 좌측바 |
| **5. 🔥 블로그·트렌드** | `키네틱 오렌지` | `#18181B` / `#FFFFFF` | `#C2410C` / `#EA580C` | `#FFF7ED`(`#F97316` 바) / `#FFF7ED` | H1 클린 + H2 2px 하단선 + H3 4px 좌측바 |
| **6. 🌿 ESG·교육** | `포레스트 에메랄드` | `#022C22` / `#FBFDFB` | `#065F46` / `#047857` | `#ECFDF5`(전체 박스형) / `#ECFDF5` | H1 6px 좌측바 + 박스형 인용구 |
| **7. 🍷 법률·인문** | `로열 버건디 와인` | `#2A1015` / `#FFFDFC` | `#881337` / `#9F1239` | `#FFF1F2`(`#BE123C` 바) / `#FFF1F2` | H1 3px 버건디 이중선 + H2 1px 실선 |
| **8. ✨ 기획·SNS** | `크리에이티브 바이올렛` | `#1E1B4B` / `#FFFFFF` | `#5B21B6` / `#6D28D9` | `#F5F3FF`(`#7C3AED` 바) / `#F5F3FF` | H1 6px·H2 4px 좌측바 + 굵은글씨 형광펜(`#EDE9FE`) |
| **9. ☕ 문학·북디자인** | `따뜻한 출판 에세이` | `#292524` / `#FAF6ED` | `#78350F` / `#92400E` | `#FEF3C7`(`#D97706` 바) / `#F5F0E6` | 미색 용지 + H1 잔선 + 앰버 인용구 |

---

## 📌 4. 외부 AI용 만능 서식 생성 프롬프트 템플릿 (v2026.11)

외부 AI(ChatGPT, Claude, Gemini 등)에 아래 프롬프트를 복사하여 붙여넣고 **[내가 원하는 서식 컨셉]** 한 줄만 수정하면 완벽한 최신 온리비 서식 JSON을 얻을 수 있습니다.

```text
`당신은 최고급 출판·웹 기술문서 조판 전문 CSS 디자이너입니다. 아래 온리비 어서(Onrivi Author) 최신 서식 스키마(v2026.11, 15대 서식 카테고리 + 9대 문서 분위기 테마 + 5대 제목 장식 형식 전수 반영)에 맞추어 완성도 높은 서식 프로필 JSON 1개를 생성해 주세요.

[내가 원하는 서식 컨셉]:
"여기에 원하는 분위기, 글꼴, 색상, 표 스타일, 제목 번호 체계를 적어주세요 (예: 코발트 신뢰 비즈니스 보고서 스타일, 보고서 표준 번호 Ⅰ.➔1.➔가., 표는 가로선 강조형)"

[필수 준수 스키마 및 15대 카테고리 상세 규격]:
1. 최상위 JSON 키 구조:
   "id", "name", "description", "pageStyle", "rules", "hrStructure", "checkboxStructure", "tableStructure", "bulletStructure", "mediaCaptionStructure", "headingNumbering", "customCss" (그림책 요청 시 "layout" 추가)
2. 용지 및 기본 타이포그래피 (pageStyle):
   - paperSize: "a4" ("b5", "letter", SNS 카드뉴스는 1:1 정사각 "sns_square" 또는 4:5 세로형 "sns_portrait" 가능), orientation: "portrait" (가로형은 "landscape")
   - 표준 여백: 일반 문서는 marginTop: "18mm", marginBottom: "18mm", marginLeft: "12mm", marginRight: "12mm" (SNS 카드뉴스는 상하좌우 "14mm")
   - fontFamily: 본문 기본 글꼴 (Onrivi 기본서식 표준은 "'Roboto', 'Google Sans', 'Noto Sans KR', sans-serif", 한국어 보고서는 "'Pretendard', 'Noto Sans KR', sans-serif", 학술/출판은 "'Noto Serif KR', 'KoPub Batang', serif")
   - fontSize: "15px"~"16.5px" (또는 "10pt"~"12pt", Onrivi 기본은 "16px"), lineHeight: "1.5"~"1.85" (기술문서 "1.5", 보고서 "1.7", 에세이 "1.85"), letterSpacing: "0em" 또는 "-0.01em"
   - headingSizeOffset: "3pt" (미정의 시 최초 기본값 "3pt", H1 기준 크기에서 H2~H6 단계별 차감 폭), tabSize: "2", exportPageBreakLevel: "none" (절대 인위적 분할 금지, 특별 요청 시에만 "h1"|"h2")
3. 9대 문서 분위기 테마 팔레트 참조 (요청 컨셉에 맞춰 선택·응용):
   - ① 온리비 기본(Google Developers DevSite 표준): 본문 #202124, 배경 #FFFFFF, 클린 헤딩(#202124), 인용구 좌측바 #1A73E8 + 배경 #E8F0FE, 표 헤더 #F1F3F4(테두리 #DADCE0/#E8EAED), 코드 #F1F3F4/#37474F
   - ② 코발트 신뢰(비즈니스 표준): 본문 #0F172A, H1 #1D4ED8(하단 2px solid #1D4ED8), H2 #1E40AF(하단 1px solid #BFDBFE), 인용구/표 헤더 #EFF6FF(포인트 #2563EB)
   - ③ 대한민국 관보 & 먹색(공문서·흑백): 본문 #111827, H1 3px double #111827 관보 이중선, H2 1px solid #9CA3AF, 인용구 #F9FAFB, 표 헤더 #F3F4F6
   - ④ 인텔리전스 틸(연구·기술): 본문 #0F172A, H1 #0F766E(하단 2px solid #0D9488), H2 #115E59(좌측바 4px solid #0D9488, padding-left 12px), 인용구/표 헤더 #F0FDFA
   - ⑤ 키네틱 오렌지(테크 블로그): 본문 #18181B, H1 #C2410C(클린), H2 #EA580C(하단 2px solid #F97316), H3 #9A3412(좌측바 4px solid #F97316, padding-left 12px), 인용구/표 헤더 #FFF7ED
   - ⑥ 포레스트 에메랄드(ESG·교육): 본문 #022C22, 배경 #FBFDFB, H1 #065F46(좌측바 6px solid #059669, padding-left 12px), 전체 박스형 인용구(#ECFDF5, border 1px solid #059669)
   - ⑦ 로열 버건디 와인(법률·인문): 본문 #2A1015, 배경 #FFFDFC, H1 #881337(하단 3px double #9F1239), H2 #9F1239(하단 1px solid #FECDD3), 인용구/표 헤더 #FFF1F2
   - ⑧ 크리에이티브 바이올렛(기획·SNS): 본문 #1E1B4B, H1 #5B21B6(좌측바 6px solid #7C3AED), H2 #6D28D9(좌측바 4px solid #8B5CF6), 굵게(strong) 형광펜 배경 #EDE9FE(글자 #4C1D95)
   - ⑨ 따뜻한 출판 에세이(문학·북디자인): 본문 #292524, 미색 배경 #FAF6ED, H1 #78350F(하단 1px solid #D6D3D1), 인용구 #FEF3C7(좌측바 #D97706), 표 헤더 #F5F0E6
4. 본문 및 인라인 강조 4종 (rules.p, strong, em, u, del):
   - p: margin-top("0px"), margin-bottom("16px"), line-height("1.5"~"1.8"), color("#202124"), text-align("left"|"center"|"right"|"justify"), text-indent("0px"|"16px"), letter-spacing("0em"|"-0.01em"), sentence-gap("4px"~"8px")
   - strong: font-weight("700"), color("#202124"), 형광펜 강조 요청 시 background-color("#EDE9FE" 또는 "#FEF08A") 지정
   - em: font-style("italic"), color("#202124")
   - u: text-decoration("underline"), text-decoration-style("solid"|"dashed"|"dotted"|"wavy"), text-decoration-color("#1a73e8"), text-underline-offset("3px")
   - del: text-decoration("line-through"), color("#5f6368"), 필요 시 text-decoration-color, text-decoration-thickness("1px"), opacity("0.8")
5. 제목 H1~H6, 5대 장식 형식 및 자동 번호 체계 (rules.h1~h6, pageStyle.headingSizeOffset, headingNumbering):
   - h1~h6: font-size, font-weight, color, margin-top, margin-bottom, line-height, letter-spacing, text-align
   - 5대 제목 장식 형식:
     · 클린 헤딩형: border-bottom: "", border-left: "none", padding-left: "0px"
     · 하단 밑줄형: H1 border-bottom: "2px solid #색상"(padding-bottom "8px"), H2 border-bottom: "1px solid #색상"(padding-bottom "6px")
     · 좌측 색깔바형: border-left: "3px solid #색상"[얇은 바] | "4px solid #색상"[표준 바] | "6px solid #색상"[굵은 바] + 반드시 padding-left: "12px" 지정 (바 없을 때는 padding-left: "0px")
     · 하이브리드형(H2밑줄+H3바): H1 클린, H2 border-bottom: "2px solid #색상", H3 border-left: "4px solid #색상" + padding-left: "12px"
     · 관보 이중선형: H1 border-bottom: "3px double #색상"(padding-bottom "8px"), H2 border-bottom: "1px solid #색상"
   - headingNumbering (길이 6 배열, H1~H6 순서, 미지정 시 기본값은 번호 없음 []):
     · 번호 없음(기본): []
     · 십진 기술표준(1. ➔ 1.1): ["decimal-outline", "decimal-outline", "decimal-outline", "decimal-outline", "none", "none"]
     · 보고서 표준(Ⅰ. ➔ 1. ➔ 가.): ["roman", "decimal", "hangul", "decimal-paren", "hangul-paren", "none"]
     · 공문서 한글(1. ➔ 가. ➔ 1)): ["decimal", "hangul", "decimal-paren", "hangul-paren", "none", "none"]
     · 장절 체계(제1장 ➔ 제1절): [{ "type": "custom", "number": "decimal", "prefix": "제", "suffix": "장 " }, { "type": "custom", "number": "decimal", "prefix": "제", "suffix": "절 " }, "decimal", "hangul", "none", "none"]
     · 대기업 개조식(□ ➔ ○ ➔ - ➔ ㆍ): [{ "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "□" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "○" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "-" }, { "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "ㆍ" }, "none", "none"]
6. 목록·체크리스트 및 3단계 글머리 기호 (rules.ul, ol, li, taskList, bulletStructure, checkboxStructure):
   - ul/ol: padding-left("40px" 또는 "28px"), color("#202124")
   - ol['list-style-type'] 지원값: "decimal"(1,2,3), "onrivi-circled-decimal"(①,②,③ 원문자), "onrivi-report"(Ⅰ.→1.→가.→1)→가) 한국형 보고서 다단계), "decimal-leading-zero"(01,02), "lower-roman", "upper-roman", "none"
   - li: margin-bottom("8px" 또는 "5px"), padding-inline-start("4px"), line-height("1.5"~"1.7")
   - bulletStructure: { "level1": "disc", "level2": "circle", "level3": "square" }
     · 지원 기호 13종: "disc"(•), "circle"(○), "square"(■), "white-square"(▫), "diamond"(◆), "white-diamond"(◇), "dash"(-), "hyphen"(–), "arrow"(▶), "check"(✓), "star"(★), "dot"(·), "custom"(custom1~3에 직접 기호 입력), "none"
   - checkboxStructure & rules.taskList: { "boxSize": "16px", "checkedEffect": "none", "textGap": "9px", "color": "#202124" } (checkedEffect는 "none" | "line-through-and-dim" | "dim-only")
7. 표 및 테두리 구조체 (rules.table, th, td, tableStructure):
   - 절대 th/td에 border-left: none 같은 방향별 속성을 넣지 말고, 테두리 두께는 tableStructure로 제어하세요.
   - tableStructure: 미니멀 가로선형(Onrivi 기본)은 { "outerBorderWidth": "0px", "rowBorderWidth": "1px", "colBorderWidth": "0px" }, 가로선 강조형은 { "outerBorderWidth": "1px", "rowBorderWidth": "1px", "colBorderWidth": "0px" }, 모든 테두리 격자형은 { "outerBorderWidth": "1px", "rowBorderWidth": "1px", "colBorderWidth": "1px" }
8. 인용구, 코드블록, 인라인코드, 링크, 구분선, 각주:
   - blockquote: 왼쪽 띠형이면 border-left만 지정하고 border는 생략(예: Google Blue 콜아웃은 background-color "#e8f0fe", border-left "4px solid #1a73e8")
```
`