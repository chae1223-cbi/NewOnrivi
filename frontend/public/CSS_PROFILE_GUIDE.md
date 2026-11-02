# 🎨 온리비 어서(Onrivi Author) 최신 서식 프로필(CSS Profile) 작성 및 생성 가이드 (v2026.10 · 15대 카테고리 전수 수록)

이 문서는 **온리비 어서(Onrivi Author)** 전용 서식 프로필(`.json`)의 공식 최신 스키마 명세서이자, 서식 편집기의 **15대 상세 카테고리(본문·여백, 제목, 표, 인용구, 코드블록, 인라인코드, 하이퍼링크, 각주, 목록·체크, 구분선, 이미지, 비디오, 지도, 수식, 고급 CSS)** 모든 속성을 100% 수록한 **완전판 레퍼런스 가이드**입니다.

> 💡 **핵심 요약 및 서식 관리 센터 최신 기능 안내**
> 1. **사이드바 `+ 추가` 4종 문서 타입 선택 생성**: 좌측 사이드바 상단 `+ 추가` 버튼을 누르면 **① `📄 일반문서`**, **② `📱 SNS 카드뉴스`**, **③ `📖 그림책(전체표지)`**, **④ `📖 그림책(오른쪽표지)`** 중 원하는 문서 타입을 선택해 즉시 생성할 수 있습니다.
> 2. **사이드바 원클릭 액션 일원화**: 좌측 사이드바의 각 서식 항목에서 **`[서식 복제] · [파일 내보내기(.json)] · [JSON 복사] · [삭제]`**를 즉시 실행할 수 있으며, 상단 `전체 백업`으로 내 서식 전체를 한 번에 백업할 수 있습니다.
> 3. **본문 상단 2단 카드 구성**: 본문 상단 좌측 **`[이름 및 서식 설명 카드]`**에는 서식 이름과 일반문서/SNS 카드뉴스/그림책(스토리북) 구분이 포함된 설명이 표시되며, 우측 별도 **`[📋 설명 상세 카드]`**에는 **글꼴 · 크기/행간 · 여백 · 표 테두리 · 불릿 · 문서 타입(일반문서 / SNS 카드뉴스 / 그림책)** 6대 핵심 사양이 한눈에 표시됩니다.
> 4. **원클릭 가져오기 및 다중 백업 호환**: 서식 파일(`.json`) **드래그 앤 드롭**, **내 PC 파일 선택**, **클립보드 JSON 바로 불러오기**를 지원하며, 단일 서식(`{ ... }`)과 다중 백업 배열(`[ { ... }, ... ]`)을 모두 자동 인식합니다.
> 5. **누락 속성 100% 자동 정규화 (`normalizeCssProfile`)**: AI가 생성한 JSON에 일부 속성이 생략되어 있더라도 **'Onrivi 기본서식'** 표준 규격(예: `headingSizeOffset` 미정의 시 최초값 `"3pt"` 자동 부여 등)으로 완벽히 보완합니다.

---

## 📌 1. 최신 서식 프로필(JSON) 전체 구조 명세

아래 JSON은 최신 버전의 모든 구조체(`pageStyle`, `rules`, `tableStructure`, `bulletStructure`, `mediaCaptionStructure`, `headingNumbering`, `hrStructure`, `checkboxStructure`, `customCss`)가 포함된 완전체 표준 예시입니다.

```json
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
```

---

## 📌 2. 15대 서식 카테고리별 전체 속성 사전 (100% 전수 명세)

온리비 어서 서식 편집기(`CssStyleForm`)의 15개 상세 탭에 존재하는 **모든 설정 항목과 CSS 속성·구조체 매핑 사전**입니다.

### 1️⃣ 카테고리 1: 본문·여백 (`pageStyle`, `rules.p`, `strong`, `em`, `u`, `del`)
- **용지 및 전역 타이포그래피 (`pageStyle`)**:
  - `fontFamily`: 본문 기본 폰트 패밀리 문자열
  - `fontUrl`: (선택) 외부 웹 폰트 CSS URL
  - `fontSize`: 출판 포인트(`"10pt"`, `"10.5pt"`, `"11pt"`, `"12pt"`) 또는 픽셀(`"15px"`~`"16.5px"`)
  - `lineHeight`: 기본 줄간격 (`"1.65"`~`"1.85"`)
  - `letterSpacing`: 기본 자간 (`"-0.01em"`, `"0em"` 등)
  - `backgroundColor`: 용지 배경색 (기본 `"#ffffff"`, 미색 에세이 `"#FAF6ED"` 등)
  - `paperSize`: `"a4"` (기본) | `"b5"` | `"letter"` | `"sns_square"` (SNS 카드뉴스 1:1 정사각) | `"sns_portrait"` (SNS 카드뉴스 4:5 세로형)
  - `orientation`: `"portrait"` (세로형) | `"landscape"` (가로형)
  - `marginTop`, `marginBottom`: 상하 여백 (표준 `"18mm"`)
  - `marginLeft`, `marginRight`: 좌우 여백 (표준 `"12mm"`)
  - `headingSizeOffset`: H1→H6 단계별 활자 크기 자동 차감폭 (**미정의 시 최초 기본값 `"3pt"`**, 슬라이더로 `"0pt"`~`"6pt"` 0.5pt 단위 조절 가능)
  - `tabSize`: 탭 문자 너비 (기본 `"2"` 또는 `"4"`)
  - `exportPageBreakLevel`: PDF/EPUB 내보내기 시 페이지 나누기 기준 (`"none"` 기본 | `"h1"` | `"h2"`)
- **문단 스타일 (`rules.p`)**:
  - `margin-top` (`"0px"`), `margin-bottom` (`"16px"`~`"20px"`), `line-height` (`"1.75"`), `color` (`"#2f2f2f"`)
  - `text-align`: `"left"` (좌측 정렬) | `"center"` | `"right"` | `"justify"` (출판물 양끝 정렬)
  - `text-indent`: 문단 첫 줄 들여쓰기 (`"0px"`, `"16px"`, `"32px"`)
  - `letter-spacing`: 문단 자간 (`"-0.01em"`)
  - `sentence-gap`: 문단 내 줄바꿈(`Shift+Enter`) 문장 간 간격 (`"0px"`~`"32px"`, 기본 `"4px"`, 테크 블로그 `"8px"`)
- **인라인 강조 4종 세부 속성**:
  - **굵게 (`rules.strong`)**: `font-weight` (`"700"` | `"bold"` | `"900"`), `color` (`"#202123"`), `background-color` (형광펜 하이라이트 배경색, 선택사항)
  - **기울임 (`rules.em`)**: `font-style` (`"italic"` | `"normal"`), `color` (`"#2f2f2f"`)
  - **밑줄 (`rules.u`)**: `text-decoration` (`"underline"`), `text-decoration-style` (`"solid"` 실선 | `"dashed"` 파선 | `"dotted"` 점선 | `"wavy"` 물결선), `text-decoration-color` (`"#0d0d0d"`), `text-underline-offset` (`"3px"`, `0px`~`12px`)
  - **취소선 (`rules.del`)**: `text-decoration` (`"line-through"`), `color` (`"#6b6b6b"`), `text-decoration-color` (취소선 색상), `text-decoration-thickness` (`"1px"`~`"8px"`), `opacity` (`"0.1"`~`"1.0"`)

### 2️⃣ 카테고리 2: 제목 (`rules.h1`~`h6` · `pageStyle.headingSizeOffset` · `headingNumbering`)
- **H1 기준 크기 및 단계별 크기 감소폭 (`pageStyle.headingSizeOffset`)**:
  - `rules.h1['font-size']`를 기준 활자 크기(`12pt`~`36pt`)로 설정하며, `pageStyle.headingSizeOffset`에 따라 `H2`~`H6` 크기가 `H1 - (레벨 - 1) × 감소폭` 공식으로 자동 계산됩니다.
  - **최초 기본값**: `headingSizeOffset`이 정의되어 있지 않거나 빈 값일 때 **최초 기본값은 `"3pt"`**로 동작합니다. (감소 없이 동일 크기를 원할 경우 슬라이더를 `"0pt"`로 설정)
- **제목 태그 (`h1` ~ `h6`) 지원 속성 및 장식**:
  - 기본 속성: `font-size`, `font-weight`, `font-style`, `text-decoration`, `color`, `text-align` (`"left"` | `"center"` | `"right"`), `padding-left`, `padding-bottom`, `margin-top`, `margin-bottom`, `line-height`, `letter-spacing`
  - **하단 밑줄 (`border-bottom`)**: `"none"` (선 없음) | `"1px solid #색상"` (실선) | `"3px double #색상"` (관보선)
  - **제목 앞 좌측 색깔바 (`border-left` & 색상 설정)**:
    - **4종 프리셋**: `"none"` (바 없음) | `"3px solid #색상"` (얇은 바 3px) | `"4px solid #색상"` (표준 바 4px) | `"6px solid #색상"` (굵은 바 6px)
    - **색깔바 색상 선택**: `H1` 및 `H2`~`H6` 각각 독립된 컬러 피커로 좌측 색깔바 색상을 자유롭게 변경할 수 있습니다.
    - **여백 자동 연동**: 좌측 색깔바를 활성화할 때 `padding-left`가 `0px`이면 글자와 바가 붙지 않도록 `"12px"`가 자동 부여되며, `[바 없음]` 선택 시 `border-left: "none"` 및 `padding-left: "0px"`으로 즉시 원복됩니다.
- **제목 자동 번호/기호 체계 (`headingNumbering` — 길이 6 배열, H1~H6 순서)**:
  - 기본 문자열 포맷:
    - `"none"`: 번호 없음
    - `"decimal"`: `1.`, `2.`, `3.`
    - `"decimal-outline"`: 계층형 십진 분류 (`1.` ➔ `1.1` ➔ `1.1.1` ➔ `1.1.1.1` — KS/ISO 기술표준)
    - `"roman"`: `Ⅰ.`, `Ⅱ.`, `Ⅲ.`
    - `"hangul"`: `가.`, `나.`, `다.`
    - `"decimal-paren"` / `"hangul-paren"`: `1)`, `2)` / `가)`, `나)`
  - 사용자 정의 객체 (`custom`):
    - **학술 장·절 체계**: `{ "type": "custom", "number": "decimal", "prefix": "제", "suffix": "장" }`
    - **대기업 개조식 기호**: `{ "type": "custom", "number": "bullet", "prefix": "", "suffix": "", "bullet": "□" }`

### 3️⃣ 카테고리 3: 표 (`rules.table`, `th`, `td` & `tableStructure`)
- **표 테두리 구조체 (`tableStructure`) 3대 프리셋**:
  1. **가로선 강조형 (기본/논문/보고서)**: `outerBorderWidth: "1px"` (또는 `"2px"`), `rowBorderWidth: "1px"`, `colBorderWidth: "0px"` (세로선 없음)
  2. **모든 테두리 격자형 (KS/엑셀)**: `outerBorderWidth: "1px"`, `rowBorderWidth: "1px"`, `colBorderWidth: "1px"`
  3. **미니멀형**: `outerBorderWidth: "0px"`, `rowBorderWidth: "1px"`, `colBorderWidth: "0px"`
- **표 세부 속성 (`table`, `th`, `td`)**:
  - `table`: `width` (`"100%"`), `border-collapse` (`"collapse"`), `border-color` (`"#9ca3af"`), `font-size` (`"15px"`), `margin-top`, `margin-bottom`, `border-radius` (`"8px"`), `overflow` (`"hidden"`)
  - `th`: `background-color` (`"#f7f7f8"`), `color` (`"#202123"`), `font-weight` (`"650"`), `text-align` (`"left"`|`"center"`|`"right"`), `padding` (`"5px 8px"`), `border-color` (`"#cbd5e1"`)
  - `td`: `background-color`, `color` (`"#2f2f2f"`), `text-align`, `padding` (`"5px 8px"`), `border-color` (`"#cbd5e1"`)
  - ⚠️ **주의**: `th`, `td` 내부에 `border-left: none` 같은 방향별 테두리 속성을 직접 넣지 마세요.

### 4️⃣ 카테고리 4: 인용구 (`rules.blockquote`)
- **지원 속성**: `color`, `background-color`, `font-size`, `font-weight` (`"normal"`|`"bold"`), `font-style` (`"normal"`|`"italic"`), `padding`, `border-left`, `border`, `border-radius`, `box-shadow`, `margin-top`, `margin-bottom`
- **3대 형태 배타 규칙**:
  1. **왼쪽 띠형 (Left Bar)**: `"border-left": "4px solid #1d4ed8"` 지정 (이때 `border` 전체 속성은 넣지 않음)
  2. **전체 박스형 (Full Box)**: `"border": "1px solid #cbd5e1"`, `"border-left": "none"`, `"border-radius": "8px"`
  3. **그림자 박스형 (Shadow Box)**: `"border": "none"`, `"border-left": "none"`, `"box-shadow": "0 8px 24px rgba(0,0,0,0.08)"`

### 5️⃣ 카테고리 5: 코드블록 (`rules.codeBlock` & `rules.codeBlockTitle`)
- **지원 속성**: `background-color`, `color`, `font-size` (`"13.5px"` 또는 `"inherit"`), `line-height` (`"1.35"`), `padding` (`"16px"`), `border-radius` (`"8px"`), `border` (`"1px solid #e5e5e5"`)
- **3대 테마 프리셋**:
  1. **라이트 기본 박스**: 본문 `#f7f7f8` (글자 `#242424`) / 타이틀바 `#ececec` (글자 `#5f5f5f`)
  2. **Mac OS 다크 테마**: 본문 `#282c34` (글자 `#abb2bf`) / 타이틀바 `#21252b` (글자 `#9da5b4`)
  3. **다크 네이비 고정**: 본문 `#0f172a` (글자 `#f8fafc`) / 타이틀바 `#1e293b` (글자 `#94a3b8`)

### 6️⃣ 카테고리 6: 인라인코드 (`rules.code`)
- **지원 속성**: `background-color` (`"#f7f7f8"`), `color` (`"#242424"`), `font-weight` (`"normal"`|`"bold"`), `border-radius` (`"5px"`), `padding` (`"2px 6px"`), `padding-left`, `padding-right`, `border` (`"1px solid #e5e5e5"`)

### 7️⃣ 카테고리 7: 하이퍼링크 (`rules.a`)
- **지원 속성**: `color` (`"#2563eb"`), `text-decoration` (`"underline"` | `"none"`), `font-weight` (`"bold"` | `"normal"`)

### 8️⃣ 카테고리 8: 각주 (`rules.footnote`)
- **지원 속성**: `font-size` (`"13px"` 또는 `"9pt"`), `color` (`"#6b6b6b"`), `font-weight` (`"normal"` | `"bold"`), `line-height` (`"1.5"`~`"1.6"`), `margin-top` (`"12px"`), `margin-bottom` (`"12px"`)

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
  - `ul`, `ol`: `padding-left` (들여쓰기 너비, 기본 `"28px"`), `color` (마커 및 본문 색상 `"#2f2f2f"`)
  - `li`: `margin-bottom` (항목 간 여백 `"5px"`), `padding-inline-start` (기호 마커와 텍스트 사이 간격 `"3px"`, `0px`~`32px`), `line-height` (`"1.7"`)
- **체크리스트 (`checkboxStructure` & `rules.taskList`)**:
  - `boxSize`: 체크박스 크기 (`"16px"`, `8px`~`32px`)
  - `textGap`: 체크박스와 텍스트 간격 (`"9px"`, `0px`~`32px`)
  - `color`: 체크박스 및 텍스트 색상 (본문 기본색 `"#2f2f2f"`)
  - `checkedEffect`: 완료 항목 스타일 (`"none"` 기본 효과없음 | `"line-through-and-dim"` 취소선+반투명 | `"dim-only"` 반투명만)

### 🔟 카테고리 10: 구분선 (`rules.hr` & `hrStructure`)
- **구분선 구조체 (`hrStructure`)**:
  - `borderTopStyle`: `"solid"` (실선) | `"dotted"` (점선) | `"dashed"` (파선) | `"double"` (이중선)
  - `borderTopWidth`: 선 두께 (`"1px"` ~ `"10px"`)
  - `marginTopBottom`: 상하 여백 (`"28px"`, `0px`~`100px`)
  - `lineWidth`: 가로 폭 비율 (`"100%"` 전체 | `"75%"` | `"50%"` 중앙 절반 | `"30%"` 소형 포인트선)
- **구분선 색상**: `rules.hr['border-top-color']` (기본 `"#e5e5e5"`)

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
- **지원 속성**: `color` (`"#2f2f2f"`), `font-size` (`"16px"` 또는 `"inherit"`), `text-align` (`"center"` | `"left"` | `"right"`), `margin-top` (`"20px"`), `margin-bottom` (`"20px"`)

### 1️⃣5️⃣ 카테고리 15: 고급 CSS 및 미디어 캡션·그림책 확장 구조체 (`customCss`, `mediaCaptionStructure`, `layout`)
- **미디어·표 캡션 구조체 (`mediaCaptionStructure` & `kindOverrides`)**:
  - 공통 설정:
    - `position`: `"top"` (상단 배치) | `"bottom"` (하단 배치)
    - `format`:
      - `"standard"`: **`그림 1. 제목`** (`**{kind} {n}. {title}**`)
      - `"bracket"`: **`[그림 1] 제목`** (`**[{kind} {n}] {title}**`)
      - `"angle"`: **`<표 1> 제목`** (`**<{kind} {n}> {title}**`)
      - `"plain"`: `그림 1. 제목` (볼드 없음)
      - `"title-only"`: **`제목`** (번호 없이 제목만)
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
