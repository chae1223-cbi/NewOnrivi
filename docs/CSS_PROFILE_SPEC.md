# Onrivi 마크다운 맞춤 서식(CSS Profile) 작성 표준 명세서

이 문서는 Onrivi Markdown 에디터 및 미리보기 컴포넌트와 100% 호환되는 서식 설정 파일(JSON)을 설계하고 생성하기 위한 기술 표준 명세입니다.  
다른 생성형 AI(Gemini, ChatGPT, Claude 등)에 이 문서를 학습시키고 *"이 양식에 맞추어 JSON 파일을 생성해줘"*라고 요청하면 바로 연동하여 업로드해 쓸 수 있는 커스텀 서식을 획득할 수 있습니다.

---

## 1. 서식 JSON 구조 (Schema)

Onrivi 서식 프로필은 아래의 **5개** 루트 키를 가집니다.

| 키 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | × (내부 자동 생성) | 고유 식별자 (예: `"default"`, `"profile-1700000000000"`) |
| `name` | string | ○ | 서식 프로필의 표시 이름 |
| `pageStyle` | object | ○ | 전역 폰트 및 용지 규격 |
| `rules` | object | ○ | 마크다운 태그별 CSS 룰셋 |
| `hrStructure` | object | △ | 구분선(HR) 전용 위젯 설정 (생략 시 기본값 상속) |
| `checkboxStructure` | object | △ | 체크리스트 전용 위젯 설정 (생략 시 기본값 상속) |

### 1.1 JSON 스키마 예시 (전체 구조)

```json
{
  "name": "서식_이름_문자열",
  "pageStyle": {
    "fontFamily": "글꼴명_혹은_inherit",
    "fontSize": "기본_본문_크기_px단위",
    "lineHeight": "기본_줄간격_실수 문자열",
    "letterSpacing": "기본_자간_em단위",
    "backgroundColor": "페이지_배경색_hex",
    "marginTop": "용지_위여백_mm단위",
    "marginBottom": "용지_아래여백_mm단위",
    "marginLeft": "용지_왼쪽여백_mm단위",
    "marginRight": "용지_오른쪽여백_mm단위",
    "orientation": "portrait_또는_landscape",
    "headingSizeOffset": "제목단계별_감소폭_px단위",
    "tabSize": "탭_문자_렌더링_폭_정수"
  },
  "rules": {
    "h1": { "text-align": "left", "font-weight": "bold", "margin-top": "1.5rem", "margin-bottom": "1rem", "font-size": "28px" },
    "h2": {},
    "h3": {},
    "h4": {},
    "h5": {},
    "h6": {},
    "p": { "text-align": "left", "margin-bottom": "8px", "text-indent": "0px" },
    "strong": {},
    "em": {},
    "u": {},
    "del": {},
    "ul": { "padding-left": "18px" },
    "ol": { "padding-left": "18px" },
    "li": { "margin-bottom": "3px", "padding-inline-start": "6px" },
    "taskList": {},
    "hr": {},
    "table": { "width": "100%", "border-collapse": "collapse" },
    "th": {},
    "td": {},
    "blockquote": { "border-left-width": "4px", "border-left-style": "solid", "padding": "12px", "margin-top": "10px", "margin-bottom": "10px" },
    "codeBlock": { "background-color": "#1e293b", "color": "#e2e8f0" },
    "codeBlockTitle": {},
    "a": {},
    "img": { "width": "400px", "height": "300px", "margin-top": "16px", "margin-bottom": "16px", "display": "block", "margin-left": "auto", "margin-right": "auto" },
    "code": { "background-color": "#f1f5f9", "color": "#e11d48", "padding-top": "1px", "padding-bottom": "1px", "padding-left": "4px", "padding-right": "4px", "border-radius": "4px", "line-height": "1" },
    "video": { "width": "560px", "height": "315px", "margin-top": "16px", "margin-bottom": "16px", "display": "block", "margin-left": "auto", "margin-right": "auto" },
    "math": { "color": "#1e3a8a", "font-size": "16px", "margin-top": "16px", "margin-bottom": "16px", "text-align": "center" },
    "map": { "width": "600px", "height": "450px", "margin-top": "16px", "margin-bottom": "16px", "display": "block", "margin-left": "auto", "margin-right": "auto" },
    "footnote": { "color": "#4b5563", "font-size": "12px", "line-height": "1.4", "margin-top": "8px", "margin-bottom": "8px" }
  },
  "hrStructure": {
    "borderTopStyle": "solid",
    "borderTopWidth": "1px",
    "marginTopBottom": "32px",
    "lineWidth": "100%"
  },
  "checkboxStructure": {
    "boxSize": "16px",
    "checkedEffect": "line-through-and-dim",
    "textGap": "10px"
  }
}
```

---

## 2. 세부 필드 규격 명세

### 2.1 pageStyle (전역 타이포그래피 및 용지 설정)

모든 속성은 유효한 CSS 값이어야 합니다. 빈 문자열(`""`)로 기입하면 해당 속성은 시스템 기본값을 상속받습니다.

| 필드 | 타입 | 기본값 | 설명 및 예시 |
|---|---|---|---|
| `fontFamily` | string | `"inherit"` | 대표 서체. `"Nanum Gothic"`, `"Nanum Gothic Coding, monospace"`, `"inherit"` |
| `fontSize` | string | `"15px"` | 기본 본문 크기. 권장 범위: `"12px"` ~ `"20px"` |
| `lineHeight` | string | `"1.7"` | 기본 줄 간격 비율. 권장 범위: `"1.4"` ~ `"2.0"` |
| `letterSpacing` | string | `"-0.02em"` | 기본 자간 조절. 예: `"-0.02em"`, `"0px"`, `"0.05em"` |
| `backgroundColor` | string | `"#ffffff"` | 페이지 배경색. 유효한 CSS 색상값(Hex, RGB, HSL 등). 예: `"#ffffff"`, `"#faf5eb"` |
| `marginTop` | string | `"20mm"` | A4 인쇄/PDF 위쪽 여백. **반드시 `mm` 단위** 사용 |
| `marginBottom` | string | `"20mm"` | A4 인쇄/PDF 아래쪽 여백. **반드시 `mm` 단위** 사용 |
| `marginLeft` | string | `"20mm"` | A4 인쇄/PDF 왼쪽 여백. **반드시 `mm` 단위** 사용 |
| `marginRight` | string | `"20mm"` | A4 인쇄/PDF 오른쪽 여백. **반드시 `mm` 단위** 사용 |
| `orientation` | string | `"portrait"` | 용지 방향. `"portrait"`(세로) 또는 `"landscape"`(가로) 중 하나여야 함 |
| `headingSizeOffset` | string | `"4"` | H1 크기 기준 H2~H6 단계별 감소폭(px). 단위 없는 숫자 문자열. 권장: `"2"` ~ `"6"` |
| `tabSize` | string | `"4"` | 탭(Tab) 문자 렌더링 폭. 공백 개수 단위. 권장: `"1"` ~ `"10"` |

#### pageStyle 예시 모음
```json
"pageStyle": {
  "fontFamily": "Noto Serif KR, serif",
  "fontSize": "14px",
  "lineHeight": "1.8",
  "letterSpacing": "0.01em",
  "backgroundColor": "#ffffff",
  "marginTop": "15mm",
  "marginBottom": "15mm",
  "marginLeft": "20mm",
  "marginRight": "20mm",
  "orientation": "portrait",
  "headingSizeOffset": "4",
  "tabSize": "4"
}
```

---

### 2.2 rules (마크다운 태그별 상세 CSS 룰셋)

마크다운 파서가 변환한 HTML 태그에 적용되는 개별 CSS 속성쌍을 정의하는 객체입니다.

#### 2.2.1 지원 태그 목록

| 태그 키 | 대상 요소 | UI 위젯 연동 여부 | 주요 권장 속성 |
|---|---|---|---|
| `h1` ~ `h6` | 제목 태그 | ○ (H1 전용: 하단 밑줄 위젯) | `text-align`, `font-weight`, `margin-top`, `margin-bottom`, `font-size`, `color` |
| `p` | 본문 문단 | ○ | `text-align`, `margin-bottom`, `text-indent`, `line-height`, `color` |
| `strong` | 굵게 | ○ (토글 위젯) | — |
| `em` | 기울임 | ○ (토글 위젯) | — |
| `u` | 밑줄 | ○ (토글 위젯) | — |
| `del` | 취소선 | △ (스타일 적용만 가능) | — |
| `ul` | 순서 없는 목록 | ○ (글머리 마커 선택 위젯) | `padding-left`, `list-style-type` |
| `ol` | 순서 있는 목록 | ○ (숫자 마커 선택 위젯) | `padding-left`, `list-style-type` |
| `li` | 목록 항목 | ○ | `margin-bottom`, `padding-inline-start` |
| `taskList` | 체크리스트 | — | 완료 시 취소선 스타일 등 |
| `hr` | 수평 구분선 | ○ (hrStructure 별도 위젯으로 제어) | `border-top` 관련 속성 |
| `table` | 표 | ○ (전체 너비, 테두리 스타일 위젯) | `width`, `border-collapse`, `border-style` |
| `th` | 표 헤더 셀 | — | `background-color`, `font-weight`, `text-align`, `padding` |
| `td` | 표 데이터 셀 | — | `padding`, `text-align`, `border-bottom` |
| `blockquote` | 인용 상자 | ○ (색상, 선굵기, 상하 여백 위젯) | `border-left-width`, `border-left-style`, `border-left-color`, `padding`, `margin-top`, `margin-bottom`, `background-color` |
| `codeBlock` | 코드 블록 (`<pre><code>`) | ○ | `background-color`, `color`, `padding`, `border-radius`, `font-size` |
| `codeBlockTitle` | 코드 블록 타이틀바 | ○ | `background-color`, `color`, `padding`, `font-size` |
| `a` | 하이퍼링크 | — | `color`, `text-decoration` |
| `img` | 이미지 | ○ (정렬 방식 선택 위젯) | `width`, `height`, `margin-top`, `margin-bottom`, `float`, `display`, `margin-left`, `margin-right` |
| `code` | 인라인 코드 | ○ | `background-color`, `color`, `border-radius` |
| `video` | 동영상 | ○ | `width`, `height`, `margin-top`, `margin-bottom` |
| `math` | KaTeX 수식 | ○ (색상, 크기, 정렬 위젯) | `color`, `font-size`, `margin-top`, `margin-bottom`, `text-align` |
| `map` | 지도 (`<iframe>`) | ○ | `width`, `height`, `margin-top`, `margin-bottom` |
| `footnote` | 각주 영역 | ○ | `color`, `font-size`, `line-height`, `margin-top`, `margin-bottom` |

#### 2.2.2 작성 규칙

1. **kebab-case 필수**: 모든 CSS 속성 키는 반드시 kebab-case를 사용해야 합니다.
   - ✅ 올바른 예: `"text-align"`, `"font-weight"`, `"margin-top"`, `"padding-inline-start"`, `"border-left-width"`
   - ❌ 잘못된 예: `"textAlign"`, `"fontWeight"`, `"marginTop"` (카멜케이스 → 미적용됨)

2. **빈 객체는 기본 테마 상속**: 빈 객체 `{}`로 기입하면 해당 태그는 Onrivi의 세련된 기본 디자인 테마를 그대로 따릅니다.

3. **색상 값**: 유효한 CSS 색상 포맷(Hex: `#1e40af`, HSL: `hsl(210, 100%, 50%)`, RGB: `rgb(30, 64, 175)`, named: `"navy"`)을 사용합니다. 다크모드 대응을 위해 배경색은 과도하게 어둡지 않은 소프트 톤을 권장합니다.

4. **인라인 코드(`code`) 줄간격 보호**: 인라인 코드에 `padding-top: 1px`, `padding-bottom: 1px`, `line-height: 1`을 적용하면 텍스트 줄바꿈 시 줄간격이 흔들리거나 벌어지는 현상을 방지할 수 있습니다. Onrivi 기본값에도 이 3개 속성이 포함되어 있습니다. (💡 주의: 인라인 코드의 `font-size` 속성은 시스템에서 강제로 통일하므로 적용되지 않습니다.)

5. **이미지 정렬 제어**: `img` 태그의 정렬 방식은 아래 4가지 값을 조합하여 구현합니다.
   - `"center"` (중앙): `"float": "none"`, `"display": "block"`, `"margin-left": "auto"`, `"margin-right": "auto"`
   - `"left"` (왼쪽 Float): `"float": "left"`, `"display": "inline"`, `"margin-left"`: (빈 값), `"margin-right"`: (빈 값)
   - `"right"` (오른쪽 Float): `"float": "right"`, `"display": "inline"`
   - `"none"` (정렬 없음): `"float": "none"`

6. **동영상/지도 중앙 정렬**: `video`, `map` 태그에 중앙 정렬을 적용하려면 아래 속성을 함께 지정하세요.
   ```json
   "display": "block", "margin-left": "auto", "margin-right": "auto"
   ```

7. **주의(Deprecated)**: `word-break: keep-all` 속성은 브라우저에 따라 심각한 거대 공백(White Space) 버그를 유발하므로 사용이 금지되어 있습니다. 만약 기입될 경우 시스템이 강제로 `break-all`로 변환합니다.

8. **테두리(Border) 속성 중복 선언 금지**: 표(`table`, `th`, `td`)나 인용구(`blockquote`) 등에서 `border` 단축 속성과 `border-width`, `border-color` 등 개별 속성을 혼용하여 선언하지 마십시오. 두 가지 중 하나의 방식만 사용해야 합니다. 특히 `blockquote`에 왼쪽 선형(띠형) 디자인을 적용할 때는 `border-left` 속성만 사용하고 다른 `border` 관련 속성은 배제하십시오.

---

### 2.3 hrStructure (구분선 전용 위젯 설정)

| 필드 | 타입 | 기본값 | 위젯 옵션 |
|---|---|---|---|
| `borderTopStyle` | string | `"solid"` | `"solid"`(실선), `"double"`(이중선), `"dotted"`(점선), `"dashed"`(대시선), `"none"`(없음) |
| `borderTopWidth` | string | `"1px"` | 1~5px (슬라이더) |
| `marginTopBottom` | string | `"32px"` | 0~80px (슬라이더) |
| `lineWidth` | string | `"100%"` | `"25%"`, `"50%"`, `"75%"`, `"100%"` (선택) |

---

### 2.4 checkboxStructure (체크리스트 전용 위젯 설정)

| 필드 | 타입 | 기본값 | 위젯 옵션 |
|---|---|---|---|
| `boxSize` | string | `"16px"` | 12~24px (슬라이더) |
| `checkedEffect` | string | `"line-through-and-dim"` | `"line-through-and-dim"`(취소선+반투명), `"dim-only"`(반투명만), `"none"`(효과 없음) |
| `textGap` | string | `"10px"` | 4~24px (슬라이더, 체크박스와 텍스트 사이 간격) |

---

## 3. 위젯별 세부 속성 매핑 표

아래 표는 CssStyleForm.tsx의 각 위젯이 실제 JSON의 어떤 필드를 제어하는지 명시합니다.

### 3.1 pageStyle 위젯 매핑

| UI 위젯 라벨 | pageStyle 필드 | 단위/포맷 |
|---|---|---|
| 글꼴 | `fontFamily` | 문자열 |
| 본문 크기 | `fontSize` | `px` |
| 줄 간격 | `lineHeight` | 실수 (단위 없음) |
| 자간 | `letterSpacing` | `em` |
| 페이지 배경색 | `backgroundColor` | Hex 색상값 |
| 용지 방향 | `orientation` | `portrait`/`landscape` |
| 제목 감소폭 | `headingSizeOffset` | 정수 (단위 없음) |
| 위/아래/왼/오 여백 | `marginTop/Bottom/Left/Right` | `mm` |

### 3.2 rules 위젯 매핑

| UI 패널                          | 태그 키      | 위젯이 제어하는 CSS 속성                                                                                       |
| -------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| **H1 하단 밑줄**                 | `h1`         | `"border-bottom"` (값: `""`/`"1px solid"`/`"3px double"`)                                                      |
| **P 정렬 방식**                  | `p`          | `"text-align"` (`left`/`center`/`right`/`justify`)                                                             |
| **P 들여쓰기**                   | `p`          | `"text-indent"` (px)                                                                                           |
| **UL 글머리 마커**               | `ul`         | `"list-style-type"` (`disc`/`circle`/`square`/`none`)                                                          |
| **OL 숫자 마커**                 | `ol`         | `"list-style-type"` (`decimal`/`decimal-leading-zero`/`upper-alpha`/`lower-alpha`/`upper-roman`/`lower-roman`) |
| **목록 들여쓰기**                | `ul`, `ol`   | `"padding-left"` (px)                                                                                          |
| **LI 항목 간격**                 | `li`         | `"margin-bottom"` (px)                                                                                         |
| **blockquote 좌측 선 색상**      | `blockquote` | `"border-left-color"`                                                                                          |
| **blockquote 좌측 선 굵기**      | `blockquote` | `"border-left-width"` (px)                                                                                     |
| **blockquote 상하 여백**         | `blockquote` | `"margin-top"`, `"margin-bottom"` (px)                                                                         |
| **blockquote 안쪽 여백**         | `blockquote` | `"padding"` (px)                                                                                               |
| **table 전체 너비**              | `table`      | `"width"` (`100%`/`auto`/`50%`)                                                                                |
| **table 테두리 모양**            | `table`      | `"border-style"` (`solid`/`double`/`dotted`/`dashed`/`none`)                                                   |
| **img 정렬 방식**                | `img`        | `"float"`, `"display"`, `"margin-left"`, `"margin-right"` (4개 동시 제어)                                      |
| **img 가로/세로/여백**           | `img`        | `"width"`, `"height"`, `"margin-top"`, `"margin-bottom"` (px)                                                  |
| **code 배경/글자색**             | `code`       | `"background-color"`, `"color"`                                                                                |
| **code 둥근정도**                | `code`       | `"border-radius"` (px)                                                                                         |
| **codeBlock 배경/글자색**        | `codeBlock`  | `"background-color"`, `"color"`                                                                                |
| **codeBlock 글자/패딩/둥근정도** | `codeBlock`  | `"font-size"` (px), `"padding"` (px), `"border-radius"` (px)                                                   |
| **video 가로/세로/여백**         | `video`      | `"width"`, `"height"`, `"margin-top"`, `"margin-bottom"` (px)                                                  |
| **math 글자색/크기**             | `math`       | `"color"`, `"font-size"` (px)                                                                                  |
| **math 상하 여백/정렬**          | `math`       | `"margin-top"`, `"margin-bottom"` (px), `"text-align"` (`left`/`center`/`right`)                               |
| **map 가로/세로/여백**           | `map`        | `"width"`, `"height"`, `"margin-top"`, `"margin-bottom"` (px)                                                  |
| **footnote 텍스트/여백**         | `footnote`   | `"font-size"`, `"line-height"`, `"color"`, `"font-weight"`, `"margin-top"` (하단 각주 영역 스타일링)           |
| **footnote 줄간격/여백**         | `footnote`   | `"line-height"`, `"margin-top"`, `"margin-bottom"` (px)                                                        |

---

## 4. 다른 AI에게 서식 생성을 요청하는 추천 프롬프트

Onrivi 전용 CSS 프로필 JSON을 생성하기 위해 다른 AI(Gemini, ChatGPT, Claude 등)에 요청할 때 아래 프롬프트 템플릿을 그대로 사용하십시오.

> 💡 **참고 자료를 활용하면 더 정확한 서식 생성이 가능합니다.**  
> AI 중 일부는 **문서 이미지(스크린샷, PDF 캡처)나 웹페이지 URL을 참고**하여 비슷한 스타일의 서식을 제안할 수 있습니다.  
> 예: "이 논문 이미지와 비슷한 스타일로 만들어줘" 또는 "이 블로그 URL의 서체와 레이아웃을 분석해서 JSON을 생성해줘"  
> 지원 여부는 사용하는 AI 모델의 기능에 따라 다르니, 이미지 첨부나 URL 참조 기능이 있는 모델을 우선 사용하세요.

---

**[역할 정의]**

너는 마크다운(Markdown) 문서 편집기인 **Onrivi Author** 전용 테마를 디자인하는 전문 웹 퍼블리셔이자 UI 디자이너다.  
내가 정의한 아래의 **Onrivi 서식 프로필 표준 명세**를 정독하고, 이에 완벽히 부합하는 유효한 JSON 데이터만을 출력해라.

---

**[Onrivi 서식 프로필 표준 명세]**

Onrivi 서식 프로필은 5개의 루트 키(`name`, `pageStyle`, `rules`, `hrStructure`, `checkboxStructure`)로 구성된다.

### pageStyle — 전역 타이포그래피 및 용지 설정

```json
"pageStyle": {
  "fontFamily": "글꼴명_또는_inherit",
  "fontSize": "본문_크기_px",
  "lineHeight": "줄간격_실수",
  "letterSpacing": "자간_em",
  "backgroundColor": "페이지_배경색_hex",
  "marginTop": "위여백_mm",
  "marginBottom": "아래여백_mm",
  "marginLeft": "왼여백_mm",
  "marginRight": "오른여백_mm",
  "orientation": "portrait_또는_landscape",
  "headingSizeOffset": "제목_감소폭_단위없는_숫자"
}
```

### rules — 태그별 CSS 룰셋 (25개 키)

모든 CSS 속성 키는 **kebab-case**만 허용된다. 빈 객체 `{}`는 기본 테마를 사용한다는 의미다.

| 태그 | 용도 | 주요 CSS 속성 예시 |
|---|---|---|
| `h1` ~ `h6` | 제목 | `text-align`, `font-weight`, `margin-top`, `margin-bottom`, `font-size`, `color` |
| `p` | 본문 | `text-align`, `margin-bottom`, `text-indent`, `line-height`, `color` |
| `strong` / `em` / `u` / `del` | 인라인 서식 | - |
| `ul` | 순서 없는 목록 | `padding-left`, `list-style-type` |
| `ol` | 순서 있는 목록 | `padding-left`, `list-style-type` |
| `li` | 목록 항목 | `margin-bottom`, `padding-inline-start` |
| `taskList` | 체크리스트 | 완료 시 취소선 스타일 등 |
| `hr` | 구분선 | (hrStructure 위젯으로 대부분 제어) |
| `table` / `th` / `td` | 표 | `width`, `border-collapse`, `border-style` |
| `blockquote` | 인용 상자 | `border-left-width`, `border-left-style`, `padding`, `margin`, `background-color` |
| `codeBlock` | 코드 블록 | `background-color`, `color`, `padding`, `border-radius`, `font-size` |
| `a` | 링크 | `color`, `text-decoration` |
| `img` | 이미지 | `width`, `height`, `margin`, `float`, `display` (정렬: center/left/right/none) |
| `code` | 인라인 코드 | `background-color`, `color`, `border-radius`, **`padding-top/bottom: 1px`, `line-height: 1`** |
| `video` | 동영상 | `width`, `height`, `margin` |
| `math` | KaTeX 수식 | `color`, `font-size`, `margin`, `text-align` |
| `map` | 지도 | `width`, `height`, `margin` |
| `footnote` | 각주 | `color`, `font-size`, `font-weight`, `line-height`, `margin-top` |

### hrStructure — 구분선 위젯 설정

```json
"hrStructure": {
  "borderTopStyle": "solid_또는_double_dotted_dashed_none",
  "borderTopWidth": "1px_~_5px",
  "marginTopBottom": "상하_여백_px",
  "lineWidth": "25%_또는_50%_75%_100%"
}
```

### checkboxStructure — 체크리스트 위젯 설정

```json
"checkboxStructure": {
  "boxSize": "12px_~_24px",
  "checkedEffect": "line-through-and-dim_또는_dim-only_none",
  "textGap": "4px_~_24px"
}
```

---

**[디자인 요구사항 — 참고 자료를 활용하려면]**

아래 항목을 채워서 AI에게 전달하세요. **이미지 첨부나 URL 참조가 가능한 AI 모델**을 사용 중이라면, 문서 스크린샷이나 참고 웹페이지 주소를 함께 보내면 더 정확한 결과를 얻을 수 있습니다.

- **참고 이미지 / 웹페이지 URL** (선택): (예: 대상 문서의 스크린샷을 첨부하거나 "https://example.com/sample-document" 형식의 주소)
- **테마 컨셉**: (예: *학술 논문 스타일 / 현대적 테크 블로그 / 정부 보고서 / 소설 원고 / 전자책 포매팅 등*)
- **글꼴 및 여백**: (예: *명조 계열 서체, 본문 14px, 용지 여백 15mm, 줄간격 1.8, 배경색 #faf5eb*)
- **강조할 포인트**: (예: *인용구는 파란색 계열, 제목은 굵고 여백 넉넉하게, 목록 간격 촘촘하게, 코드 블록 배경은 어두운 톤*)

---

**[출력 규칙]**

1. JSON 루트 키는 반드시 `name`, `pageStyle`, `rules`, `hrStructure`, `checkboxStructure`만을 가져야 한다.
2. 모든 CSS 키는 **kebab-case**를 사용할 것 (예: `"margin-bottom"`, `"font-size"`, `"padding-inline-start"`).
3. **JSON 이외의 설명, 서문, 마크다운 서식은 일절 출력하지 말 것.** 오직 순수한 JSON 코드블록 하나만 출력한다.
4. 위 명세에 명시되지 않은 임의의 CSS 속성을 rules 내에 추가하지 말 것.
5. `img`의 정렬은 `float` + `display` + `margin-left/right` 4개 속성을 함께 지정하거나, 정렬 없음(`"float": "none"`)만 기입한다.

---

**[요청]**

위 스펙을 준수하여, 아래 디자인 조건에 맞는 완전한 Onrivi CSS 프로필 JSON을 생성해줘.

(여기에 원하는 디자인 조건 + 참고 이미지/URL을 자유롭게 기입)
