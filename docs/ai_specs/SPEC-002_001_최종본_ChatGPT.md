---
메타영역
#서식설정
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 디자인 시스템"
---

네. 앞서 검토한 **기존 SPEC + 실제 구현에서 확인된 구조 + 변경/삭제/추가 사항**을 합쳐서, 개발자가 바로 작업 기준으로 사용할 수 있는 형태로 정리하면 아래가 최종본입니다.

# [기능명세서] 동적 메타데이터 보정형 에디터 ↔ 미리보기 동기화 및 뷰포트 안정화 엔진

**문서 ID:** `SPEC-SYNC-001`  
**Version:** `v3.0`  
**적용 대상:** Split View (`previewMode === 'both'`)  
**상태:** Implementation Specification

---

## 1. 개요

### 1.1 기능명

**동적 프론트매터 자동 감지 및 가시 뷰포트 유지형 에디터 ↔ 미리보기 동기화 엔진**

### 1.2 목적

Markdown 에디터와 Preview 간 줄 단위 동기화 과정에서 발생하는 다음 문제를 해결한다.

1. Frontmatter 줄 수 변경에 따른 줄 번호 오차
2. 타이핑 중 Preview가 위아래로 튀는 현상
3. 방향키 이동 시 Preview가 커서를 따라가지 못하는 문제
4. 동일 행에서 좌우 이동할 때 불필요한 Preview 스크롤
5. 대형 이미지/표/코드블록으로 인한 Preview 위치 왜곡
6. 마지막 줄 Enter 입력 시 Preview가 위로 솟구치는 현상
7. Editor Scroll과 Cursor Sync의 중복 호출
8. 여러 개의 timeout/scroll lock이 서로 충돌하는 문제
9. Preview 재렌더링 및 이미지 로딩에 따른 강제 스크롤
10. Preview 사용자의 직접 스크롤을 자동 동기화가 침범하는 문제

---

# 2. 핵심 설계 원칙

이번 v3.0에서 가장 중요한 원칙은 다음과 같다.

### 원칙 1. Preview 스크롤 계산은 단 하나의 엔진만 담당한다.

```text
syncEngine.ts
└── syncPreviewInterpolated()
```

다른 컴포넌트에서 직접:

```text
scrollTo()
scrollIntoView()
scrollTop = ...
verticalScrollToElement()
```

등으로 동기화해서는 안 된다.

---

### 원칙 2. 타이핑과 스크롤은 완전히 분리한다.

```text
onDidChangeModelContent
        ↓
setContent()
        ↓
끝
```

타이핑 이벤트에서는 Preview Scroll을 호출하지 않는다.

---

### 원칙 3. Preview는 "정확히 같은 Y좌표"가 아니라 "가시 영역 유지"를 목표로 한다.

기존의:

```text
Editor cursor Y
      ↓
Preview 동일 Y
```

방식을 사용하지 않는다.

대신:

```text
Target Anchor
      ↓
현재 Preview viewport 확인
      ↓
안전 영역 밖인가?
      ↓
밖에 있을 때만 필요한 만큼 이동
```

한다.

---

### 원칙 4. 사용자에게 이미 보이는 콘텐츠는 움직이지 않는다.

Target이 안전 영역 안에 있다면:

```typescript
return;
```

한다.

---

### 원칙 5. 시간 기반 보정은 최소화한다.

다음과 같은 누적 방식은 사용하지 않는다.

```text
50ms timeout
100ms timeout
200ms timeout
typing lock
scroll suppress
```

가능한 경우 이벤트 상태와 실제 DOM 상태를 기준으로 판단한다.

---

# 3. 시스템 아키텍처

```text
                         ┌──────────────────┐
                         │      Monaco      │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       Content Change       Cursor Position       Editor Scroll
              │                   │                   │
              ▼                   ▼                   ▼
         setContent()       line 변경 확인       visible line
              │                   │                   │
              │             필요할 때만 Sync       │
              │                   │                   │
              └───────────────────┴───────────────────┘
                                  │
                                  ▼
                        syncPreviewInterpolated()
                                  │
                                  ▼
                       parseDynamicFrontmatter()
                                  │
                                  ▼
                        data-line Anchor 검색
                                  │
                                  ▼
                         DOM 위치 계산
                                  │
                                  ▼
                         Safe Zone 판정
                          /              \
                       내부               외부
                        │                   │
                        ▼                   ▼
                      STOP             최소 delta
                                            │
                                            ▼
                                      Scroll Clamp
                                            │
                                            ▼
                                      scrollTo()
```

---

# 4. 모듈별 책임

| 모듈 | 위치 | 책임 |
|---|---|---|
| Sync Engine | `frontend/src/lib/syncEngine.ts` | Frontmatter 분석, Anchor 검색, Safe Zone 판정, 최소 이동량 계산 |
| Editor Event Controller | `frontend/src/hooks/editor/useMonacoSetup.ts` | Monaco 이벤트 분리 및 Sync 요청 |
| Editor/Preview Container | `MainEditorApp.tsx` | 상태/Ref/레이아웃 관리 |
| Preview Renderer | `frontend/src/components/MarkdownViewer.tsx` | Markdown 렌더링 및 `data-line` 매핑 |
| CSS Stability | `frontend/src/app/globals.css` | Preview overflow 및 하단 여백 안정화 |

---

# 5. Frontmatter 동적 감지

## 5.1 `parseDynamicFrontmatter()`

### 요구사항

문서 첫 줄이 정확히:

```text
---
```

인지 확인한다.

그 후 다음 `---`가 등장하는 줄을 검색한다.

예:

```markdown
---
title: test
author: foo
date: 2026-08-31
category: tech
---

# 본문
```

결과:

```typescript
{
  hasFrontmatter: true,
  startLine: 1,
  endLine: 6,
  lineCount: 6
}
```

---

## 5.2 Frontmatter 미완성 상태

다음처럼 닫는 `---`가 아직 입력되지 않은 경우:

```markdown
---
title: test
author: foo
```

Frontmatter는 존재하는 것으로 판단하되 닫는 영역은 현재 문서 끝까지로 처리한다.

---

## 5.3 Frontmatter 내부 Cursor

Cursor가:

```text
targetLine <= frontmatter.endLine
```

이면 Preview는 일반적인 본문 동기화를 수행하지 않는다.

Preview 위치:

```text
scrollTop = 0
```

을 유지한다.

단, 이미 `scrollTop === 0`이라면 다시 `scrollTo()`하지 않는다.

---

# 6. Preview Anchor 정책

## 6.1 `data-line`

Preview DOM에는 Editor 원본 줄 번호를 나타내는:

```html
data-line="123"
```

속성을 제공한다.

현재 구현된 `rehypeSourceLinesPlugin` 및 `lineMap` 구조는 유지한다.

---

## 6.2 `lineMap` 유지

다음은 삭제하지 않는다.

```text
processedContent
lineMap
rehypeSourceLinesPlugin
data-line
```

Preview Markdown이 전처리되면서 원본 Markdown line과 Preview line이 달라질 수 있기 때문이다.

---

## 6.3 `frontmatterLines` 별도 전달 제거

동기화 목적으로:

```text
frontmatterLinesRef
```

를 `useMonacoSetup → syncEngine`으로 전달하지 않는다.

Sync Engine이 현재 Editor content를 받아:

```text
parseDynamicFrontmatter(content)
```

로 직접 계산한다.

단, `frontmatterLines`가 다른 기능에서 필요하다면 해당 기능을 위해 기존 preprocess 결과를 유지하는 것은 허용한다.

---

# 7. Preview Anchor 탐색

Target line:

```text
targetLine = 152
```

일 때 정확히:

```html
[data-line="152"]
```

가 존재하면 해당 요소를 사용한다.

정확한 Anchor가 없는 경우:

```text
targetLine 이하에서 가장 가까운 Anchor
```

를 우선 검색한다.

예:

```text
149
150
153
157
```

Target:

```text
152
```

이면:

```text
150
```

을 선택한다.

앞쪽 Anchor가 전혀 없다면 첫 번째 유효 Anchor를 사용한다.

---

# 8. Viewport Safe Zone

Preview Container의 높이를:

```typescript
containerHeight = previewContainer.clientHeight
```

로 계산한다.

기본 안전 영역:

```typescript
topThreshold = 40;
bottomThreshold = containerHeight - 60;
```

---

## 8.1 Target이 안전 영역 내부

조건:

```text
elementTop >= 40
AND
elementBottom <= containerHeight - 60
```

이면:

```text
스크롤하지 않는다.
```

이것이 가장 중요한 안정화 규칙이다.

---

## 8.2 Target이 하단을 벗어난 경우

```text
elementBottom > bottomThreshold
```

이면:

```typescript
delta = elementBottom - bottomThreshold
newScrollTop = currentScrollTop + delta
```

만큼 이동한다.

---

## 8.3 Target이 상단을 벗어난 경우

```text
elementTop < topThreshold
```

이면:

```typescript
delta = topThreshold - elementTop
newScrollTop = currentScrollTop - delta
```

만큼 이동한다.

---

# 9. 미세 이동 임계값

계산된 이동량이 너무 작은 경우 실제 `scrollTo()`를 실행하지 않는다.

기본값:

```typescript
SCROLL_EPSILON = 2;
```

예:

```text
delta = 0.7px
→ Skip

delta = 1.8px
→ Skip

delta = 4px
→ Scroll
```

목적:

- sub-pixel jitter 방지
- 브라우저 layout rounding으로 인한 떨림 방지
- 불필요한 `scrollTo()` 호출 감소

---

# 10. Scroll Clamp

계산된 최종 위치는 반드시:

```typescript
maxScrollTop =
  previewContainer.scrollHeight -
  previewContainer.clientHeight;
```

범위로 제한한다.

```typescript
finalScroll = Math.min(
  Math.max(0, newScrollTop),
  maxScrollTop
);
```

따라서:

```text
finalScroll < 0
→ 0

finalScroll > maxScrollTop
→ maxScrollTop
```

으로 보정한다.

---

# 11. `topOffset` 제거

기존:

```typescript
topOffset?: number
```

및:

```typescript
effectiveTopOffset
```

개념을 제거한다.

또한 Editor Cursor의:

```typescript
getScrolledVisiblePosition()
```

값을 Preview Scroll 위치 계산에 사용하지 않는다.

### 이유

Editor와 Preview는 렌더링 높이가 동일하지 않다.

특히:

- 이미지
- 표
- 코드블록
- Mermaid
- Blockquote
- 긴 문단

등이 존재하면 Editor의 한 줄과 Preview의 실제 픽셀 높이는 전혀 다르다.

---

# 12. Piecewise Linear Interpolation 제거

기존:

```text
prevAnchor
nextAnchor
      ↓
progress
      ↓
선형 보간
      ↓
targetScrollTop
```

방식을 제거한다.

### 금지

```typescript
const progress = ...
const interpolatedTop = ...
```

### 신규 기준

```text
Anchor 위치
+
Viewport Safe Zone
+
필요한 delta
```

만 사용한다.

---

# 13. Monaco Content Change

## 이벤트

```typescript
editor.onDidChangeModelContent()
```

### 허용

```typescript
setContent(editor.getValue());
```

### 금지

```text
syncPreview()
scrollTo()
scrollIntoView()
preview.scrollTop = ...
setTimeout(scroll...)
requestAnimationFrame(scroll...)
```

---

## 목표

고속 타이핑 시:

```text
키 입력
 ↓
Editor 변경
 ↓
React content 변경
 ↓
Preview 재렌더링
```

만 발생한다.

Preview의 현재 스크롤 위치를 타이핑 이벤트가 직접 변경하지 않는다.

---

# 14. Cursor Position Change

## 이벤트

```typescript
editor.onDidChangeCursorPosition()
```

Cursor line을 가져온다.

```typescript
currentLine = e.position.lineNumber
```

이전 line과 비교한다.

```text
이전 line === 현재 line
→ Preview Sync 금지

이전 line !== 현재 line
→ Preview Sync
```

---

## 14.1 동일 행 좌우 이동

예:

```text
←
→
Home
End
```

등으로 같은 줄에서 Cursor column만 변경되는 경우 Preview를 움직이지 않는다.

---

## 14.2 다른 행 이동

예:

```text
↑
↓
PageUp
PageDown
Mouse Click
```

등으로 line이 변경되면:

```typescript
syncPreviewInterpolated(
  preview,
  currentLine,
  content,
  { smooth: true }
)
```

을 호출한다.

---

# 15. Editor Scroll Change

## 이벤트

```typescript
editor.onDidScrollChange()
```

다음 조건에서만 처리한다.

```typescript
if (!e.scrollTopChanged) return;
```

그 후:

```typescript
visibleRanges = editor.getVisibleRanges()
```

에서:

```typescript
topVisibleLine =
  visibleRanges[0].startLineNumber
```

을 얻는다.

그리고:

```typescript
syncPreviewInterpolated(
  preview,
  topVisibleLine,
  content,
  { smooth: false }
)
```

을 실행한다.

---

# 16. Sync 중복 호출 병합

Cursor 이벤트와 Editor Scroll 이벤트가 같은 시점에 발생할 수 있으므로 Sync 요청을 무조건 즉시 여러 번 실행하지 않는다.

예:

```text
Cursor Change
   ↓
Sync Request A

Editor Scroll
   ↓
Sync Request B
```

같은 frame에서 발생하면 마지막 요청을 기준으로 하나만 실행한다.

권장 구현:

```text
requestAnimationFrame
```

기반의 coalescing.

단, 이것은 **Preview Scroll 자체를 지연시키기 위한 timeout이 아니라 같은 frame의 중복 요청을 합치기 위한 용도**다.

---

# 17. 사용자 Preview Scroll 우선권

사용자가 Preview 영역을 직접 스크롤하는 동안 자동 동기화가 사용자의 조작을 방해하지 않도록 한다.

정책:

```text
Preview 직접 스크롤 시작
        ↓
사용자 스크롤 우선
        ↓
자동 Cursor Sync가 발생해도
불필요한 강제 이동 최소화
```

영구적인 Sync Disable은 하지 않는다.

사용자 조작이 종료되면 정상 Sync 정책으로 복귀한다.

---

# 18. Preview 렌더링 상태 Guard

다음 상황에서는 Sync를 실행하지 않는다.

```text
previewContainer === null

previewMode !== 'both'

previewContainer.clientHeight === 0

previewContainer.scrollHeight === 0

data-line anchor가 하나도 없음
```

특히 Preview가 아직 렌더링되지 않아 Anchor를 찾을 수 없는 경우에는 억지로 Scroll 위치를 계산하지 않는다.

---

# 19. 이미지 및 대형 콘텐츠 처리

이미지 로드:

```text
img.onload
```

자체로 Preview Sync를 호출하지 않는다.

이미지 크기가 변경되어 Preview layout이 변하더라도:

```text
Image Load
→ 강제 Scroll 금지
```

한다.

다음 사용자 동작:

```text
Cursor 이동
Editor Scroll
```

에서 현재 line 기준으로 다시 Safe Zone을 계산한다.

---

# 20. 마지막 줄 및 연속 Enter 처리

문서 마지막 줄에서:

```text
Enter
Enter
Enter
```

가 연속 입력되는 경우 Preview를 강제로 bottom으로 보내지 않는다.

Target이 Safe Zone을 벗어난 경우에만:

```text
필요한 delta만큼
```

이동한다.

---

## 금지

```typescript
preview.scrollTop = maxScrollTop;
```

또는:

```typescript
scrollToBottom();
```

을 일반적인 Cursor Sync 경로에서 실행하지 않는다.

---

# 21. `snapPreviewToBottomFromEditor()` 정책

기존의 무조건적인:

```text
snapPreviewToBottomFromEditor()
```

방식은 일반 Sync 경로에서 제거한다.

정말 필요한 경우에도:

```text
"문서 끝으로 이동"
```

같은 명시적 사용자 명령에서만 사용한다.

---

# 22. `verticalScrollToElement()` 정책

동기화 목적의 별도:

```text
verticalScrollToElement()
scrollIntoView()
```

계열 로직은 제거한다.

모든 Editor → Preview 동기화는:

```text
syncPreviewInterpolated()
```

하나로 통합한다.

---

# 23. CSS 안정화

대상:

```text
frontend/src/app/globals.css
```

기본 정책:

```css
.custom-preview-container {
  overflow-anchor: none;
  scroll-behavior: auto;
  padding-bottom: 80px;
}
```

Preview 내부 요소에 대한 `overflow-anchor` 정책은 현재 레이아웃과 충돌하지 않는 범위에서 유지한다.

### 주의

`!important`는 필요한 경우에만 사용한다.

특히 기존 CSS Profile 시스템과 충돌하지 않도록 한다.

---

# 24. `overflow-anchor` 정책

v3.0에서는 기존의:

```css
overflow-anchor: none;
```

을 유지한다.

이유:

```text
React DOM 변경
+
Browser Scroll Anchoring
+
JS Scroll Sync
```

세 가지가 동시에 Scroll 위치를 변경하는 상황을 피하기 위함이다.

따라서 v2.0 명세에 있던 단순한:

```css
overflow-anchor: auto;
```

변경은 **적용하지 않는다.**

---

# 25. Debug Trace

개발 및 QA를 위해 선택적으로 Sync Trace를 지원한다.

예:

```text
SYNC
reason: cursor
targetLine: 152
anchorLine: 152
elementTop: 720
elementBottom: 760
action: scroll
delta: 240
```

또는:

```text
SYNC
reason: cursor
targetLine: 152
action: skip
reason: inside-safe-zone
```

Production 기본값:

```typescript
SYNC_DEBUG = false;
```

---

# 26. 삭제 대상 정리

이번 v3.0에서 동기화 목적으로 다음 로직은 제거한다.

### 🔴 삭제

```text
Piecewise Linear Interpolation
topOffset
effectiveTopOffset
totalEditorLines
frontmatterLinesRef → syncEngine 전달
verticalScrollToElement 기반 Sync
Enter 전용 강제 Scroll
Table 전용 강제 Scroll
이미지 Load 후 강제 Sync
무조건 Bottom Snap
```

### 🟡 제거 권장

```text
isTypingScrollLock
typingLockTimeout
suppressEditorScrollSyncUntil
lastModelChangeTime
다수의 scroll timeout
다수의 임의 delay
```

단, 실제 다른 기능에서 사용하는 것이 확인되는 경우에는 해당 기능과 분리하여 유지한다.

---

# 27. 유지해야 하는 기존 기능

다음 기능은 v3.0에서도 유지한다.

```text
previewMode === 'both'
lineMap
processedContent
rehypeSourceLinesPlugin
data-line
preview-highlight-line
Monaco visibleRanges
Cursor line tracking
Editor scroll tracking
Frontmatter detection
Scroll clamp
```

---

# 28. 최종 이벤트 정책

| 이벤트 | 상태 변경 | Preview Sync |
|---|---|---:|
| 문자 입력 | `setContent()` | ❌ |
| 한글 IME 입력 | Content 업데이트 | ❌ |
| 같은 행 좌우 이동 | Cursor state | ❌ |
| 다른 행 Cursor 이동 | Cursor state | ✅ Smooth |
| 다른 행 Mouse Click | Cursor state | ✅ Smooth |
| Enter | Cursor line 변경 | ✅ Smooth |
| Editor Wheel | Visible line | ✅ Instant |
| Preview 직접 Scroll | 사용자 조작 | 자동 Sync 최소화 |
| Image Load | Preview layout 변경 | ❌ |
| React Preview Render | DOM 변경 | ❌ |
| Table Render | DOM 변경 | ❌ |
| Mermaid Render | DOM 변경 | ❌ |

---

# 29. 예외 및 Guardrail

| 상황 | 처리 |
|---|---|
| Frontmatter 없음 | 일반 동기화 |
| Frontmatter 가변 길이 | 실시간 재탐색 |
| Frontmatter 내부 Cursor | Preview 상단 유지 |
| 정확한 `data-line` 없음 | 가장 가까운 이전 Anchor |
| Anchor 없음 | Sync Skip |
| Preview 높이 0 | Sync Skip |
| Preview가 이미 Safe Zone | Sync Skip |
| delta < 2px | Sync Skip |
| 계산값 < 0 | 0으로 Clamp |
| 계산값 > maxScrollTop | maxScrollTop으로 Clamp |
| 대형 이미지 | 실제 DOM 위치 기준 |
| 대형 표 | 실제 DOM 위치 기준 |
| 긴 코드블록 | 실제 DOM 위치 기준 |
| 마지막 줄 Enter | 필요한 만큼만 이동 |
| 이미지 Load | 강제 이동하지 않음 |
| Preview 직접 스크롤 | 사용자 조작 우선 |

---

# 30. Acceptance Criteria

### AC-1 — 동적 Frontmatter

Frontmatter가:

```text
4줄
10줄
15줄
30줄
```

등으로 변경되어도 본문 첫 줄의 Editor line과 Preview `data-line`이 정확하게 대응해야 한다.

---

### AC-2 — Frontmatter 내부 Cursor

`---` 영역 내부에서 ↑/↓ 이동 시 Preview가 본문 위치로 튀지 않고 최상단 상태를 유지해야 한다.

---

### AC-3 — 타이핑 안정성

문서 어느 위치에서든 빠르게 타이핑할 때 Preview가 자동으로 위/아래로 덜컹거리지 않아야 한다.

---

### AC-4 — 동일 행 좌우 이동

같은 줄에서 Cursor를:

```text
← → Home End
```

으로 이동해도 Preview Scroll이 발생하지 않아야 한다.

---

### AC-5 — 방향키 추종

Cursor가 다른 줄로 이동하여 현재 Preview Safe Zone을 벗어날 경우 Preview가 해당 방향으로 자연스럽게 이동해야 한다.

---

### AC-6 — Safe Zone 유지

Target이 다음 영역 안에 있을 때:

```text
40px <= targetTop
targetBottom <= containerHeight - 60px
```

Preview `scrollTop`이 변경되지 않아야 한다.

---

### AC-7 — 최소 이동

Target이 Safe Zone을 벗어났을 때 전체 위치를 재계산하여 크게 이동하지 않고, Safe Zone에 들어오기 위해 필요한 최소 delta만큼 이동해야 한다.

---

### AC-8 — 대형 콘텐츠

이미지/표/코드블록/Mermaid 등 한 Markdown line이 큰 픽셀 높이를 차지하더라도 Preview가 과도하게 점프하지 않아야 한다.

---

### AC-9 — 마지막 줄

문서 마지막 줄에서 연속 Enter 입력 시 Preview가 갑자기 상단으로 솟구치거나 흰 화면을 노출하지 않아야 한다.

---

### AC-10 — Bottom Clamp

어떤 상황에서도:

```text
scrollTop < 0
```

또는:

```text
scrollTop > maxScrollTop
```

이 발생하지 않아야 한다.

---

### AC-11 — 이미지 Load

이미지 로딩 완료 자체만으로 Preview Scroll이 변경되지 않아야 한다.

---

### AC-12 — Sync 중복

Cursor Change와 Editor Scroll이 같은 frame에 연속 발생하더라도 불필요하게 여러 번 `scrollTo()`가 실행되지 않아야 한다.

---

### AC-13 — Preview 사용자 조작

사용자가 Preview를 직접 스크롤하는 동안 자동 Sync가 사용자의 스크롤 위치를 무조건 덮어쓰지 않아야 한다.

---

### AC-14 — Preview 미준비 상태

Preview DOM 또는 `data-line` Anchor가 아직 생성되지 않은 경우 예외가 발생하지 않고 Sync를 안전하게 Skip해야 한다.

---

### AC-15 — Debug Trace

Debug 모드 활성화 시 Sync 원인, target line, anchor line, delta, skip 이유를 확인할 수 있어야 한다.

Production에서는 Debug 로그가 기본적으로 출력되지 않아야 한다.

---

# 31. 구현 우선순위

### Phase 1 — 핵심 구조 변경

```text
1. syncEngine interpolation 제거
2. topOffset 제거
3. Safe Zone + delta 방식 구현
4. Frontmatter 직접 parsing
5. scroll clamp
```

### Phase 2 — 이벤트 정리

```text
6. Content Change → Content Only
7. Cursor Change → line 변경만 Sync
8. Editor Scroll → visible line Sync
9. 중복 listener 제거
10. 기존 timeout/lock 정리
```

### Phase 3 — Preview 정리

```text
11. verticalScrollToElement 제거
12. Enter/Table 특수 Scroll 제거
13. Image Load Sync 제거
14. Bottom Snap 제거
```

### Phase 4 — 안정화

```text
15. Sync coalescing
16. epsilon 2px
17. Preview state Guard
18. 사용자 Preview Scroll 우선권
19. Debug Trace
20. CSS bottom padding 80px
```

---

# 32. 최종 목표 아키텍처

최종적으로 Preview Scroll을 발생시킬 수 있는 경로는 사실상 다음 하나로 제한한다.

```text
┌───────────────────────────────────────────┐
│             Monaco Event Layer            │
│                                           │
│ Content Change ────────────────► no scroll │
│                                           │
│ Cursor Change ────────┐                   │
│                       │                   │
│ Editor Scroll ────────┤                   │
│                       ▼                   │
│                Sync Request               │
└───────────────────────┬───────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │     syncEngine      │
              │                     │
              │ Frontmatter        │
              │ Anchor Search       │
              │ Safe Zone           │
              │ Delta Calculation   │
              │ Epsilon             │
              │ Clamp               │
              └──────────┬──────────┘
                         │
                         ▼
                 preview.scrollTo()
```

**즉, v3.0의 핵심은 기능을 더 많이 추가하는 것이 아니라 `스크롤을 발생시키는 경로를 하나로 만드는 것`입니다.**

---

## 33. v2.0 → v3.0 핵심 변경 요약

| 항목 | v2.0 | v3.0 |
|---|---|---|
| Frontmatter | 동적 탐색 | 동적 탐색 유지 |
| Preview Anchor | `data-line` | `data-line` 유지 |
| 위치 계산 | 선형 보간 | **Safe Zone + Delta** |
| `topOffset` | 사용 | **삭제** |
| `totalEditorLines` | 사용 | **삭제** |
| 타이핑 Sync | 차단 | **완전 차단** |
| Cursor Sync | 줄 변경 | **줄 변경만** |
| 동일 행 이동 | 일부 예외 | **완전 Skip** |
| Editor Scroll | Sync | **visible line Sync** |
| Bottom Snap | 존재 가능 | **일반 Sync에서 삭제** |
| Table 특수 Sync | 존재 | **삭제** |
| Enter 특수 Sync | 존재 | **일반 Sync로 통합** |
| Image Load Sync | 방어 | **강제 Sync 금지** |
| Timeout Lock | 다수 | **최소화** |
| Scroll 중복 | 여러 경로 | **단일 엔진** |
| 미세 이동 | 없음 | **2px epsilon** |
| Sync Coalescing | 없음 | **추가** |
| Preview 사용자 우선권 | 없음 | **추가** |
| Debug Trace | 없음 | **추가** |
| `overflow-anchor` | none | **none 유지** |
| Bottom Padding | 부족/기존 설정 의존 | **80px 권장** |

---

### 최종 개발 지침

**이번 v3.0 작업에서는 새로운 스크롤 보정 로직을 계속 덧붙이지 않는다.**

반드시 다음 순서로 작업한다.

> **① 기존 중복/보정 로직 제거 → ② Sync Engine 단일화 → ③ Safe Zone 기반 최소 이동 구현 → ④ Monaco 이벤트 책임 분리 → ⑤ Preview Anchor/lineMap 유지 → ⑥ 마지막으로 Edge Case를 테스트한다.**

이 순서를 지키는 것이 중요합니다. 현재 구현은 이미 여러 차례의 스크롤 패치가 누적되어 있기 때문에, **기존 코드 위에 또 다른 Guard를 추가하는 방식으로 작업하면 v3.0의 목적과 반대로 복잡도만 증가합니다.**