---
메타영역
#서식설정
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 디자인 시스템"
---

# [통합 디자인 시스템 및 아키텍처 명세서]
## Onrivi Author — 일원화된 사용자 경험(UX) 및 서식·동기화 규칙

**문서 ID:** `ONRIVI-DS-SYSTEM-002`  
**버전:** `v4.1`  
**상태:** Development Specification  
**적용 범위:** Landing Page, Application Shell, Editor, Sidebar, Toolbar, Modal/Dialog, Preview Container, Preview Content, CSS Profile, Editor ↔ Preview Synchronization

---

# 1. 문서 목적

본 문서는 **Onrivi Author** 서비스 전반의 UI/UX 일관성과 Markdown 콘텐츠의 독립적인 서식 적용, 그리고 Editor ↔ Preview 간 안정적인 위치 동기화를 위한 통합 설계 기준을 정의한다.

본 시스템은 크게 다음 세 가지 책임 영역으로 분리한다.

```text
┌─────────────────────────────────────────────────────────────┐
│                     ONRIVI AUTHOR                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ APPLICATION UI SCOPE                                  │  │
│  │                                                       │  │
│  │ Landing / Editor / Toolbar / Sidebar / Modal / etc.   │  │
│  │                                                       │  │
│  │        Apply: ONRIVI APPLICATION DESIGN SYSTEM        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ CONTENT DOCUMENT SCOPE                                │  │
│  │                                                       │  │
│  │ Markdown Preview Content                              │  │
│  │                                                       │  │
│  │        Apply: CSS PROFILE + USER CUSTOM CSS           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ SYNCHRONIZATION BEHAVIOR                              │  │
│  │                                                       │  │
│  │ Editor Line → data-line → DOM Geometry → Scroll      │  │
│  │                                                       │  │
│  │        Apply: SYNC ENGINE                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 핵심 설계 철학

> **Application Design System은 앱 UI를 책임지고, CSS Profile은 Preview 콘텐츠의 서식을 책임지며, Sync Engine은 콘텐츠의 스타일을 변경하지 않고 최종 DOM Geometry를 기반으로 위치만 동기화한다.**

---

# 2. 시스템 책임 영역

## 2.1 Application Design System

Onrivi Author 애플리케이션의 공통 UI/UX를 정의한다.

### 적용 대상

- Landing Page
- Application Shell
- Header
- MenuBar
- Toolbar
- Sidebar
- Editor Frame
- Settings
- Dialog
- Modal
- Button
- Input
- Select
- Tab
- Status Bar
- Preview Container
- 기타 Application UI

### 적용하지 않는 대상

Preview 내부의 Markdown Content.

즉 다음 요소의 콘텐츠 스타일은 Application Design System이 소유하지 않는다.

```text
h1
h2
h3
h4
h5
h6
p
ul
ol
table
img
blockquote
pre
code
a
hr
```

---

# 3. Content Document Scope

Preview 내부에서 렌더링되는 Markdown 문서를 별도의 스타일 영역으로 취급한다.

구조:

```html
<div class="onrivi-preview-container">
  <div class="onrivi-content-root">
    <!-- Markdown Content -->
  </div>
</div>
```

여기서:

```text
.onrivi-preview-container
```

은 Application UI 영역이다.

반면:

```text
.onrivi-content-root
```

는 Content Document 영역이다.

---

# 4. Content Style Authority

Preview 내부 Markdown 콘텐츠의 시각적 표현은 다음 체계가 결정한다.

```text
CSS Profile
     │
     ▼
Base Content Style
     │
     ▼
User Custom CSS
     │
     ▼
Final Preview Style
```

따라서 기본적으로:

> **CSS Profile → 기본 서식**

> **User Custom CSS → 사용자 재정의**

관계를 가진다.

사용자 Custom CSS가 존재할 경우 해당 CSS는 CSS Profile의 규칙을 재정의할 수 있다.

---

# 5. Application Design System과 Content CSS의 격리

## 5.1 기본 원칙

Application Design System은 Preview Content에 전파되어서는 안 된다.

예를 들어 다음과 같은 전역 스타일은 금지한다.

```css
h1 { ... }
h2 { ... }
p { ... }
table { ... }
img { ... }
```

대신 Content CSS는 Content Scope 내부에서 정의한다.

```css
.onrivi-content-root h1 {
  ...
}

.onrivi-content-root h2 {
  ...
}

.onrivi-content-root p {
  ...
}
```

---

# 6. Global CSS 규칙

`globals.css` 등 Application 전역 스타일에서는 Markdown 의미 요소에 대한 전역 스타일링을 금지한다.

### 금지

```css
h1 {}
h2 {}
h3 {}
h4 {}
h5 {}
h6 {}
p {}
ul {}
ol {}
li {}
table {}
thead {}
tbody {}
tr {}
td {}
img {}
blockquote {}
pre {}
code {}
a {}
```

### 허용 범위

Application 전체 동작에 필요한:

```css
html {}
body {}
:root {}
```

등은 허용할 수 있다.

단, 이러한 규칙 역시 Preview Content의 CSS Profile을 의도하지 않게 덮어써서는 안 된다.

---

# 7. Application Design System 정의

## 7.1 Color Tokens

Material 3의 Tonal Color 개념을 참고하여 Onrivi 서비스에 맞게 정의한 색상 토큰을 사용한다.

| Token | Light | Dark | 사용처 |
|---|---|---|---|
| Surface | `#F8FAFD` | `#111318` | 앱 배경 |
| Surface Container | `#FFFFFF` | `#181C20` | 패널/사이드바 |
| Surface High | `#EDF2F9` | `#22262B` | 모달/드롭다운 |
| Primary | `#0058BC` | `#ADC6FF` | 주요 CTA/Focus |
| Primary Container | `#D8E2FF` | `#004493` | 선택/호버 |
| Text Primary | `#181C20` | `#E2E2E6` | UI 주요 텍스트 |
| Text Secondary | `#414755` | `#8C9199` | 보조 텍스트 |
| Outline | `rgba(0,0,0,.08)` | `rgba(255,255,255,.08)` | 경계선 |

> 본 팔레트는 **M3 기반의 Onrivi Design Token**이며 Material 3의 특정 공식 색상값 자체를 의미하지 않는다.

---

# 8. Typography

Application UI는 다음 Typography 체계를 사용한다.

### UI Font

```text
Inter
-apple-system
sans-serif
```

### Editor Font

```text
JetBrains Mono
monospace
```

### Scale

| Token | Size | Line Height | 용도 |
|---|---:|---:|---|
| Display | 36px | 44px | Landing Hero |
| Title Medium | 16px | 24px | Modal/Section |
| Body Medium | 13px | 18px | 메뉴/버튼 |
| Label Small | 11px | 16px | Tooltip/Badge |

**주의:** 이 Typography 규칙은 Application UI에만 적용한다.

Preview Markdown Content의 Typography는 CSS Profile이 결정한다.

---

# 9. 공통 UI 컴포넌트

## 9.1 Button

### Primary

- Filled
- `Primary`
- `On Primary`
- Radius: `8px`
- Hover: 미세한 밝기 변화
- Shadow: `shadow-sm`

### Secondary

- Outlined
- Transparent Background
- `Outline`
- Hover: `Primary Container` 계열

### Ghost

- Background 없음
- Border 없음
- Hover: `Surface High`

---

# 10. Modal / Dialog

Landing과 Application 내부의 Modal/Dialog는 동일한 Shell 구조를 공유한다.

### Backdrop

```text
bg-black/40
backdrop-blur-sm
```

### Container

```text
Surface High
Outline
shadow-xl
radius: 12px
```

### Header

- Title
- Close Button

### Footer

```text
[취소]      [확인/저장]
```

---

# 11. Content CSS Profile

CSS Profile은 특정 Markdown 문서의 콘텐츠 표현 방식을 정의한다.

예:

```yaml
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 서식"
```

CSS Profile은 다음 콘텐츠를 책임진다.

```text
Heading
Paragraph
List
Link
Image
Table
Blockquote
Code
Pre
HR
기타 Markdown Content
```

---

# 12. CSS Profile의 책임 범위

CSS Profile은 다음을 결정할 수 있다.

```text
font
font-size
font-weight
line-height
color
background
margin
padding
border
width
height
display
position
image sizing
table layout
heading spacing
paragraph spacing
```

단, Sync Engine은 이러한 값을 참조하지 않는다.

---

# 13. Sync Metadata 보호

Markdown Renderer가 생성하는:

```html
data-line="..."
```

속성은 Synchronization Metadata이다.

CSS Profile과 User Custom CSS는 해당 값을 변경하거나 제거해서는 안 된다.

### 계약

**CONTENT-CONTRACT-004**

> `data-line`은 콘텐츠 스타일과 독립적인 Sync Metadata이며 Renderer가 생성하고 Sync Engine이 소비한다.

---

# 14. Preview Rendering Pipeline

전체 Preview 렌더링 과정은 다음과 같다.

```text
Markdown Source
      │
      ▼
Markdown Renderer
      │
      ├── HTML 생성
      │
      └── data-line 생성
      │
      ▼
.onrivi-content-root
      │
      ▼
CSS Profile
      │
      ▼
User Custom CSS
      │
      ▼
Final DOM
```

Sync Engine은 **Final DOM 이후의 실제 Geometry**를 읽는다.

---

# 15. Sync Engine Specification

**기능 ID:** `SPEC-SYNC-001`

**대상 파일:**

```text
frontend/src/lib/syncEngine.ts
```

핵심 함수:

```text
parseDynamicFrontmatter()
syncPreviewInterpolated()
```

---

# 16. Sync Engine의 기본 원칙

## 16.1 Geometry Only

Sync Engine은 CSS Profile의 구체적인 값을 알지 않는다.

다음 정보를 참조하지 않는다.

```text
font-size
line-height
margin
padding
color
font-family
image-size
table-size
```

대신:

```text
DOM Geometry
```

만 측정한다.

---

# 17. Dynamic Frontmatter

문서 첫 줄이:

```text
---
```

인 경우 Frontmatter가 존재하는 것으로 판단한다.

이후 줄을 순차적으로 검사하여 최초의 독립된:

```text
---
```

를 종료점으로 판단한다.

### 중요

Frontmatter 탐색에는 **고정된 1,000자 제한을 적용하지 않는다.**

Frontmatter 길이는 가변적이어야 한다.

---

# 18. Frontmatter Interface

```typescript
interface FrontmatterInfo {
  hasFrontmatter: boolean;
  startLine: number;
  endLine: number;
  lineCount: number;
}
```

---

# 19. Frontmatter Cursor 처리

커서가:

```text
targetLine <= frontmatter.endLine
```

인 경우 Preview는:

```text
scrollTop = 0
```

으로 처리한다.

목적:

- Metadata 편집 시 Preview 위치 혼란 방지
- 본문 Anchor 오탐 방지
- Preview 상단 상태 유지

---

# 20. Preview Anchor 탐색

Preview DOM에서:

```css
[data-line]
```

요소를 검색한다.

Target Line과 정확히 일치하는 요소가 없는 경우:

> `targetLine` 이하에서 가장 가까운 `data-line` 요소

를 선택한다.

예:

```text
Target: 105

10
20
50
80
100
120

→ 100 선택
```

---

# 21. Geometry 측정

선택된 Target Element와 Preview Container의 Geometry를 측정한다.

```typescript
const containerRect =
  previewContainer.getBoundingClientRect();

const targetRect =
  targetEl.getBoundingClientRect();
```

계산 대상:

```text
elementTop
elementBottom
containerHeight
scrollTop
scrollHeight
clientHeight
```

---

# 22. Safe Zone

Preview에 다음 안전 영역을 사용한다.

```text
Top: 40px
Bottom: 60px
```

구조:

```text
┌────────────────────────────┐
│        40px Safe Zone      │
├────────────────────────────┤
│                            │
│       Target Content       │
│                            │
├────────────────────────────┤
│        60px Safe Zone      │
└────────────────────────────┘
```

Target이 Safe Zone 내부에 존재하면 Preview Scroll을 변경하지 않는다.

---

# 23. Minimal Delta

Target이 하단 Safe Zone을 벗어나면:

```text
delta =
elementBottom - bottomThreshold
```

만큼 이동한다.

Target이 상단 Safe Zone을 벗어나면:

```text
delta =
topThreshold - elementTop
```

만큼 이동한다.

Target을 무조건 화면 중앙으로 이동시키는 방식은 사용하지 않는다.

---

# 24. Scroll Clamp

최종 Scroll 값은 반드시 다음 범위를 만족해야 한다.

```text
0 <= scrollTop <= maxScrollTop
```

여기서:

```text
maxScrollTop =
scrollHeight - clientHeight
```

이다.

최종적으로:

```typescript
const finalScroll =
  Math.min(
    Math.max(0, newScrollTop),
    maxScrollTop
  );
```

형태로 제한한다.

---

# 25. Typing Event

Monaco:

```text
onDidChangeModelContent
```

에서는 콘텐츠 상태만 갱신한다.

```text
editor.getValue()
      ↓
setContent()
```

다음 동작은 금지한다.

```text
syncPreviewInterpolated() ❌
scrollTo() ❌
scrollTop 직접 변경 ❌
```

목적:

> 고속 타이핑 중 Preview Jitter를 방지한다.

---

# 26. Cursor Event

Monaco:

```text
onDidChangeCursorPosition
```

에서 현재 줄 번호를 확인한다.

```text
currentLine
```

이전 줄 번호와 다를 경우에만 Sync를 실행한다.

```text
Previous Line != Current Line
            ↓
           Sync
```

같은 줄에서 Column만 변경되는:

```text
← →
```

동작에서는 Preview Scroll을 변경하지 않는다.

---

# 27. Cursor Sync Behavior

방향키:

```text
↑
↓
```

또는 마우스 클릭으로 줄이 변경되면:

```text
Cursor Position
      ↓
Line Number
      ↓
Frontmatter Check
      ↓
data-line Anchor
      ↓
DOM Geometry
      ↓
Safe Zone
      ↓
Minimal Delta
      ↓
Preview Scroll
```

일반 Cursor 이동에서는:

```text
smooth: true
```

를 사용한다.

---

# 28. Editor Scroll

Monaco:

```text
onDidScrollChange
```

에서:

```typescript
if (!e.scrollTopChanged) return;
```

을 적용한다.

현재 가시 영역의 첫 번째 줄:

```text
startLineNumber
```

을 가져와 Preview를 동기화한다.

Editor의 직접적인 Scroll 조작에 대한 대응이므로:

```text
smooth: false
```

를 사용한다.

---

# 29. Sync 단일 진입점

**Editor ↔ Preview 위치 동기화로 발생하는 Preview Scroll은 `syncPreviewInterpolated()`를 단일 진입점으로 사용한다.**

즉 다음 세 이벤트가 각각 별도의 Scroll 계산을 구현해서는 안 된다.

```text
onDidChangeCursorPosition
onDidScrollChange
기타 Sync Event
```

모두:

```text
syncPreviewInterpolated()
```

를 호출한다.

단, Preview 초기화나 사용자가 명시적으로 실행하는 "맨 위로 이동"과 같은 독립적인 UI 명령까지 반드시 이 함수로 제한한다는 의미는 아니다.

---

# 30. 마지막 줄 안정화

문서 최하단에서:

```text
Enter
Enter
Enter
...
```

를 반복해도 Preview가 갑자기 상단으로 치솟거나 과도한 빈 영역을 보여서는 안 된다.

이를 위해 다음 세 가지를 조합한다.

```text
Safe Zone
+
Minimal Delta
+
Scroll Clamp
```

---

# 31. Preview Container Layout 안정화

Preview Container에는 시스템 레벨의 안정화 규칙을 적용한다.

```css
.custom-preview-container {
  overflow-anchor: auto !important;
  scroll-behavior: auto !important;
  padding-bottom: 80px !important;
}

.custom-preview-container * {
  overflow-anchor: none;
}
```

`80px` 하단 여백은 **콘텐츠 서식이 아니라 Scroll 안정화를 위한 Container-level Safety Margin**이다.

CSS Profile의 콘텐츠 디자인을 대체하지 않는다.

---

# 32. 대형 콘텐츠 처리

다음 요소의 크기를 Sync Engine이 사전에 추정하지 않는다.

```text
Large Image
Large Table
Code Block
Long Paragraph
Nested List
Blockquote
기타 대형 콘텐츠
```

예:

```text
Markdown Line
     ↓
Large Image
     ↓
Actual DOM Geometry
     ↓
getBoundingClientRect()
     ↓
Safe Zone 판정
```

즉 콘텐츠 크기가 변경되어도 별도의 CSS Profile별 계산이 필요하지 않다.

---

# 33. 금지되는 위치 계산 방식

다음 방식은 사용하지 않는다.

### 고정 Line Height

```text
targetLine × 24px
```

### 고정 Element Height

```text
targetLine × estimatedHeight
```

### 고정 Preview Offset

```text
targetLine × 40px
```

### CSS Profile별 알고리즘

```text
if profile === A
if profile === B
if profile === C
```

Sync Engine은 Profile에 독립적이어야 한다.

---

# 34. 모듈별 책임 매트릭스

| 모듈 | 책임 | Out of Scope |
|---|---|---|
| Landing/App UI | Application Design System | Markdown 서식 |
| UI Components | Token/Component/UX | Content CSS |
| Content CSS Profile | Markdown 시각 표현 | App UI |
| User Custom CSS | Profile 재정의 | Sync 정책 |
| MarkdownViewer | Markdown Rendering, `data-line` 생성 | Scroll 정책 |
| Sync Engine | Frontmatter, Anchor, Geometry, Scroll | CSS 변경 |
| Editor Event Controller | Monaco 이벤트 분배 | 직접적인 위치 계산 |
| `globals.css` | Application/Container 레벨 안정화 | Content 전역 서식 |

---

# 35. 시스템 계약

## UI-CONTRACT-001 — Application UI Isolation

Application Design System은 Application UI에만 적용한다.

Preview Content에 전파되어서는 안 된다.

---

## CONTENT-CONTRACT-001 — Content Style Scope

Preview Content의 CSS는 `.onrivi-content-root` 또는 해당 CSS Profile이 정의한 Content Scope 내부에서만 동작해야 한다.

---

## CONTENT-CONTRACT-002 — CSS Profile Authority

Preview Content의 기본 시각적 표현은 CSS Profile이 결정한다.

---

## CONTENT-CONTRACT-003 — User CSS Override

User Custom CSS는 CSS Profile을 재정의할 수 있다.

```text
CSS Profile
     ↓
User Custom CSS
     ↓
Final Content Style
```

---

## CONTENT-CONTRACT-004 — Metadata Preservation

Content CSS는 `data-line`을 제거하거나 변경해서는 안 된다.

---

## SYNC-CONTRACT-001 — CSS Independence

Sync Engine은 CSS Profile의 구체적인 스타일 값을 참조하지 않는다.

---

## SYNC-CONTRACT-002 — Geometry Based Sync

Sync 위치 계산은 최종 렌더링된 DOM Geometry를 기준으로 한다.

---

## SYNC-CONTRACT-003 — Single Sync Entry

Editor ↔ Preview 위치 동기화 Scroll은 `syncPreviewInterpolated()`를 단일 진입점으로 사용한다.

---

## SYNC-CONTRACT-004 — Minimal Movement

Target이 Safe Zone 밖으로 벗어난 경우에만 필요한 최소 Delta만 이동한다.

---

## SYNC-CONTRACT-005 — Scroll Boundary

Preview Scroll은 항상 유효한 Scroll 범위 내에서 Clamp한다.

---

## SYNC-CONTRACT-006 — Typing Isolation

`onDidChangeModelContent`에서는 Preview Scroll을 변경하지 않는다.

---

# 36. 전체 데이터 흐름

```text
                    Markdown Source
                           │
                           ▼
                   Monaco Editor
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
        Content Change             Cursor / Scroll
             │                           │
             ▼                           ▼
        setContent()               Sync Engine
             │                           │
             ▼                           │
       Markdown Renderer                 │
             │                           │
       ┌─────┴─────┐                     │
       │           │                     │
       ▼           ▼                     │
     HTML      data-line                 │
       │           │                     │
       └─────┬─────┘                     │
             ▼                           │
      .onrivi-content-root               │
             │                           │
             ▼                           │
        CSS Profile                      │
             │                           │
             ▼                           │
       User Custom CSS                   │
             │                           │
             ▼                           │
         Final DOM                       │
             │                           │
             ▼                           │
       Actual Geometry ◄─────────────────┘
             │
             ▼
       Preview Scroll
```

---

# 37. 예외 및 Guardrail

| 상황 | 처리 |
|---|---|
| Frontmatter 줄 수 증가 | 종료 `---` 동적 탐색 |
| Frontmatter 줄 수 감소 | 동일 |
| Frontmatter 내부 Cursor | Preview Top 고정 |
| 동일 Line 좌우 이동 | Preview Scroll 생략 |
| 큰 이미지 | 실제 Geometry 사용 |
| 큰 Table | 실제 Geometry 사용 |
| 긴 Code Block | 실제 Geometry 사용 |
| 연속 Enter | Minimal Delta + Clamp |
| Scroll 초과 | Clamp |
| Target이 Safe Zone 내부 | Scroll 생략 |
| 사용자 CSS 변경 | Sync 알고리즘 변경 없음 |
| CSS Profile 변경 | Sync 알고리즘 변경 없음 |

---

# 38. Acceptance Criteria

### AC-1 — Unified UI/UX

Landing Page부터 Editor, Sidebar, Toolbar, Modal까지 Application UI가 동일한 Onrivi Design Token과 Component 규칙을 사용해야 한다.

### AC-2 — Content Style Isolation

Application UI의 스타일 변경이 Preview Markdown Content의 CSS Profile을 훼손해서는 안 된다.

### AC-3 — CSS Profile Authority

Preview 내부 Markdown 콘텐츠는 지정된 CSS Profile을 기준으로 렌더링되어야 한다.

### AC-4 — User Custom CSS

사용자 Custom CSS가 CSS Profile의 콘텐츠 스타일을 재정의할 수 있어야 한다.

### AC-5 — Dynamic Frontmatter

Frontmatter의 줄 수가 변경되어도 본문 위치 매핑이 정확해야 한다.

### AC-6 — Frontmatter Cursor

Frontmatter 내부 Cursor 이동 시 Preview는 최상단 상태를 유지해야 한다.

### AC-7 — Typing Stability

고속 타이핑 중 Preview가 불필요하게 흔들리지 않아야 한다.

### AC-8 — Cursor Sync

줄 변경 시 Preview가 Target 위치를 추종해야 한다.

### AC-9 — Horizontal Movement

동일한 줄의 좌우 Column 이동에서는 Preview Scroll이 발생하지 않아야 한다.

### AC-10 — Safe Zone

Target이 Safe Zone 내부에 있을 때 Preview Scroll이 발생하지 않아야 한다.

### AC-11 — Minimal Delta

Target이 Safe Zone을 벗어난 경우 필요한 최소 거리만 이동해야 한다.

### AC-12 — Large Content

대형 이미지/표/코드 블록에서도 위치 계산이 실제 DOM Geometry와 일치해야 한다.

### AC-13 — Bottom Stability

마지막 줄에서 연속 Enter를 입력해도 Preview가 위로 치솟거나 과도한 흰 화면을 표시해서는 안 된다.

### AC-14 — Scroll Boundary

Preview Scroll이 `0 ~ maxScrollTop` 범위를 벗어나서는 안 된다.

### AC-15 — Metadata Preservation

사용자 CSS 적용 이후에도 `data-line` Metadata가 유지되어야 한다.

---

# 39. 최종 아키텍처

최종적으로 Onrivi Author는 다음 세 계층을 명확하게 분리한다.

```text
┌────────────────────────────────────────────────────┐
│             ① APPLICATION DESIGN SYSTEM            │
│                                                    │
│ Landing / Toolbar / Sidebar / Editor / Modal      │
│                                                    │
│ → Onrivi UI Tokens & Components                   │
└────────────────────────┬───────────────────────────┘
                         │
                         │ UI Shell
                         ▼
┌────────────────────────────────────────────────────┐
│                  ② PREVIEW                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           .onrivi-content-root              │  │
│  │                                              │  │
│  │ Markdown HTML + data-line                    │  │
│  │                 │                            │  │
│  │          CSS Profile                         │  │
│  │                 │                            │  │
│  │          User Custom CSS                     │  │
│  │                 │                            │  │
│  │          Final Content DOM                   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────┬───────────────────────────┘
                         │
                    DOM Geometry
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                 ③ SYNC ENGINE                      │
│                                                    │
│ Frontmatter → data-line → Geometry → Safe Zone   │
│                         → Minimal Delta            │
│                         → Scroll Clamp             │
│                                                    │
│          CSS Style 변경 절대 금지                  │
└────────────────────────────────────────────────────┘
```

## 최종 불변 원칙

> **Onrivi Design System은 앱을 디자인한다.**
> **CSS Profile은 콘텐츠를 디자인한다.**
> **User Custom CSS는 콘텐츠 스타일을 자유롭게 확장·재정의한다.**
> **Renderer는 `data-line`을 제공한다.**
> **Sync Engine은 스타일을 건드리지 않는다.**
> **Sync Engine은 최종 DOM Geometry만 측정한다.**
> **Editor ↔ Preview 동기화는 필요한 순간에만 최소한으로 Preview를 이동한다.**

이렇게 `v4.1`을 기준으로 잡으면 **디자인 시스템, 사용자 서식, Markdown 렌더링, 동기화 엔진 사이의 책임 경계가 상당히 명확해집니다.** 특히 향후 사용자가 새로운 CSS Profile을 추가하거나 기존 Profile을 완전히 다른 디자인으로 바꿔도 Sync Engine을 수정할 필요가 없는 구조가 됩니다.