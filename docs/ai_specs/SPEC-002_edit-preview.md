---
메타영역
#서식설정
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 디자인 시스템"
---

네. 주신 내용은 단순한 “스크롤 동기화 기능”이라기보다 **에디터 ↔ 미리보기 간 줄 단위 동기화, 동적 Frontmatter 보정, 사용자 입력 유형별 스크롤 정책, 뷰포트 안정화**를 하나의 엔진으로 정의한 사양입니다.

아래처럼 실제 개발팀에서 바로 사용할 수 있는 **기능명세서 형태**로 정리하는 게 좋습니다. 특히 기존 문서의 구현 코드에 묶인 표현은 줄이고, **목적 → 동작 규칙 → 인터페이스 → 예외 → 테스트** 순서로 재구성했습니다.

# 기능명세서
## 동적 메타데이터 보정형 에디터 ↔ 미리보기 동기화 및 뷰포트 안정화 엔진

**문서 ID:** SPEC-SYNC-001  
**버전:** 2.0  
**기능 영역:** Markdown Editor / Preview Synchronization  
**적용 화면:** Split View (`previewMode === 'both'`)  
**상태:** 개발 구현 기준안

---

# 1. 기능 개요

## 1.1 목적

Markdown 편집기와 실시간 미리보기 영역을 동시에 표시하는 분할 뷰에서, 사용자의 편집 행위에 따라 미리보기 화면이 정확하고 안정적으로 대응하도록 한다.

본 기능은 다음 네 가지 문제를 해결하는 것을 목적으로 한다.

1. **동적 Frontmatter 보정**
   - 문서 상단의 `--- ... ---` 영역이 가변적인 줄 수를 가져도 본문과 미리보기의 줄 매핑이 정확하게 유지되어야 한다.

2. **타이핑 중 스크롤 흔들림 방지**
   - 일반적인 문자 입력 시 미리보기 스크롤을 강제로 이동하지 않는다.
   - 사용자가 작성하고 있는 화면 위치를 유지한다.

3. **커서 이동에 따른 실시간 미리보기 추종**
   - `↑`, `↓`, 클릭, Enter 등으로 커서의 행이 변경되면 해당 행에 대응하는 미리보기 위치를 추종한다.
   - 단, 대상 요소가 이미 안전한 가시 영역에 있으면 스크롤하지 않는다.

4. **최하단 및 연속 Enter 상황 안정화**
   - 문서 마지막 줄에서 입력하거나 Enter를 반복해도 미리보기가 위로 튀거나 빈 화면이 과도하게 노출되지 않아야 한다.
   - 실제로 필요한 최소 거리만 스크롤한다.

---

# 2. 적용 범위

## 2.1 적용 조건

본 기능은 다음 조건에서 활성화한다.

```text
previewMode === 'both'
```

즉, 에디터와 미리보기가 동시에 표시되는 Split View에서만 동작한다.

## 2.2 비적용 범위

다음 화면에서는 본 기능을 적용하지 않는다.

- Editor Only
- Preview Only
- 미리보기 컴포넌트가 존재하지 않는 상태
- Preview DOM에 `[data-line]` 앵커가 존재하지 않는 상태

---

# 3. 시스템 구성

## 3.1 구성 요소

| 구성 요소 | 예상 위치 | 주요 책임 |
|---|---|---|
| Sync Engine | `frontend/src/lib/syncEngine.ts` | Frontmatter 분석, 대상 라인 탐색, 뷰포트 계산, 스크롤 클램핑 |
| Editor Event Controller | `frontend/src/hooks/editor/useMonacoSetup.ts` 또는 `page.tsx` | Monaco Editor 이벤트 수신 및 이벤트별 동기화 정책 실행 |
| Markdown Viewer | `frontend/src/components/MarkdownViewer.tsx` | Markdown 렌더링 및 `[data-line]` 앵커 생성 |
| Global Style | `frontend/src/app/globals.css` | Preview 스크롤 및 브라우저 Scroll Anchoring 안정화 |

---

# 4. 핵심 동작 구조

```text
┌─────────────────────┐
│    사용자 조작       │
└─────────┬───────────┘
          │
          ├── 문자 입력
          │      ↓
          │  onDidChangeModelContent
          │      ↓
          │  setContent()
          │      ↓
          │  스크롤 동기화 실행 안 함
          │
          ├── 커서 이동
          │      ↓
          │  onDidChangeCursorPosition
          │      ↓
          │  줄 번호 변경 확인
          │      ↓
          │  syncPreviewInterpolated()
          │
          └── 에디터 스크롤
                 ↓
             onDidScrollChange
                 ↓
             최상단 가시 줄 확인
                 ↓
             syncPreviewInterpolated()
```

---

# 5. 기능 요구사항

## FR-001. Frontmatter 자동 감지

### 설명

문서의 첫 번째 줄이 `---`인 경우 Frontmatter 영역으로 판단한다.

이후 등장하는 최초의 `---` 줄을 Frontmatter 종료 지점으로 판단한다.

### 입력

```text
---
title: 테스트
description: 테스트 문서
author: admin
---
# 본문
```

### 출력

```typescript
{
  hasFrontmatter: true,
  startLine: 1,
  endLine: 5,
  lineCount: 5
}
```

### 처리 규칙

- 첫 줄이 `---`가 아니면 Frontmatter 없음
- 첫 줄 이후 `---`를 검색
- 최초로 발견되는 `---`를 종료 줄로 사용
- 종료 `---`가 발견되지 않은 경우 문서 끝까지를 Frontmatter 영역으로 간주
- Frontmatter 줄 수는 고정값을 사용하지 않는다.

### 중요 조건

Frontmatter가 다음과 같이 변경되어도 동일하게 동작해야 한다.

```text
---
title: A
---
```

또는

```text
---
title: A
description: B
author: C
category: D
date: 2026-08-31
tags:
  - A
  - B
---
```

---

# 6. FR-002. Frontmatter 영역 커서 처리

커서가 동적으로 계산된 Frontmatter 종료 줄 이하에 위치한 경우 Preview를 최상단으로 이동시킨다.

### 조건

```text
hasFrontmatter === true
AND
targetLine <= frontmatter.endLine
```

### 동작

```text
Preview.scrollTop = 0
```

### 목적

Frontmatter는 일반적인 Markdown 본문과 직접적인 시각적 대응 관계가 없으므로, 해당 영역을 편집하는 동안 Preview를 문서 최상단에 고정한다.

### 스크롤 방식

- 커서 이동 이벤트: `smooth`
- 에디터 스크롤 이벤트: `auto`

---

# 7. FR-003. Preview 라인 앵커 탐색

Markdown Preview는 각 렌더링 요소에 다음과 같은 정보를 제공해야 한다.

```html
[data-line="10"]
```

Sync Engine은 `targetLine`에 가장 가까운 이전 또는 동일한 줄의 앵커를 검색한다.

### 검색 규칙

```text
data-line <= targetLine
```

조건을 만족하는 앵커 중 가장 큰 line 번호를 선택한다.

예:

```text
Preview anchors:
1
5
8
15
20

targetLine = 12

→ data-line="8" 선택
```

### 예외

조건을 만족하는 앵커가 하나도 없으면 첫 번째 앵커를 사용한다.

---

# 8. FR-004. 가시 영역 안전선

Preview 컨테이너 전체를 무조건 커서 위치에 맞추지 않는다.

다음 안전 영역을 사용한다.

```text
상단 안전선: 40px
하단 안전선: 60px
```

개념적으로 다음 영역을 보호한다.

```text
┌────────────────────────────┐
│ 0px                        │
│ ───── 상단 안전선 40px ─── │
│                            │
│     안전한 가시 영역        │
│                            │
│ ─── 하단 안전선 60px ───── │
│                            │
└────────────────────────────┘
```

---

# 9. FR-005. 불필요한 스크롤 방지

대상 요소가 안전 영역 안에 존재하면 Preview를 이동시키지 않는다.

### 조건

```text
elementTop >= 40
AND
elementBottom <= containerHeight - 60
```

### 동작

```text
scrollTop 변경 없음
```

이 조건은 화면 떨림, 불필요한 위치 변경 및 사용자 시각적 피로를 방지하기 위한 핵심 정책이다.

---

# 10. FR-006. 하단 영역 이탈 처리

대상 요소의 하단이 하단 안전선을 벗어난 경우 필요한 만큼만 아래로 스크롤한다.

```text
delta = elementBottom - bottomThreshold
newScrollTop = currentScrollTop + delta
```

즉, 대상 요소 전체를 화면 최상단으로 이동시키는 것이 아니라 **안전선까지 이동하는 최소 거리**만큼 이동한다.

---

# 11. FR-007. 상단 영역 이탈 처리

대상 요소의 상단이 상단 안전선보다 위에 위치한 경우 필요한 만큼만 위로 스크롤한다.

```text
delta = topThreshold - elementTop
newScrollTop = currentScrollTop - delta
```

이 역시 최소 이동 원칙을 적용한다.

---

# 12. FR-008. 스크롤 범위 클램핑

계산된 `newScrollTop`은 Preview의 실제 스크롤 가능 범위를 벗어나면 안 된다.

```typescript
maxScrollTop =
  previewContainer.scrollHeight -
  previewContainer.clientHeight;
```

최종 값은 다음 범위로 제한한다.

```text
0 <= finalScroll <= maxScrollTop
```

### 목적

- 음수 scrollTop 방지
- 문서 끝을 초과하는 스크롤 방지
- 마지막 줄에서 화면이 튀는 현상 방지
- 빈 화면 노출 최소화

---

# 13. FR-009. 문자 입력 이벤트 정책

Monaco Editor의 `onDidChangeModelContent` 이벤트가 발생하면 콘텐츠 상태만 갱신한다.

```text
onDidChangeModelContent
        ↓
editor.getValue()
        ↓
setContent(value)
```

### 금지 사항

문자 입력 이벤트 내부에서 다음 함수를 호출해서는 안 된다.

```text
syncPreviewInterpolated()
scrollTo()
scrollIntoView()
```

### 목적

문자 하나를 입력할 때마다 Preview의 스크롤 위치가 재계산되면 사용자가 타이핑하는 동안 화면이 흔들릴 수 있기 때문이다.

---

# 14. FR-010. 커서 이동 이벤트 정책

`onDidChangeCursorPosition` 이벤트를 통해 커서 행을 감지한다.

### 처리 순서

```text
Cursor Position 변경
        ↓
현재 lineNumber 추출
        ↓
setCursorLine()
setCursorColumn()
        ↓
이전 lineNumber와 비교
        ↓
행이 변경된 경우만 Sync
```

### 동일 행 내 좌우 이동

다음 동작에서는 Preview를 동기화하지 않는다.

```text
←
→
Home
End
```

단, 실제 Monaco 이벤트에서 행 번호가 변경되지 않은 경우를 기준으로 판단한다.

### 다른 행으로 이동

다음과 같은 경우 Sync를 실행한다.

```text
↑
↓
Enter
PageUp
PageDown
마우스 클릭으로 다른 행 선택
```

단, 최종 판단 기준은 실제 `lineNumber` 변경 여부이다.

---

# 15. FR-011. 커서 이동 동기화 방식

커서 행이 변경되면 다음 방식으로 Preview를 동기화한다.

```typescript
syncPreviewInterpolated(
  previewRef.current,
  currentLine,
  editor.getValue(),
  {
    smooth: true
  }
);
```

### 목적

사용자가 방향키로 문서를 탐색할 때 Preview가 현재 편집 위치를 자연스럽게 따라오도록 한다.

---

# 16. FR-012. 에디터 스크롤 동기화

Monaco Editor의 `onDidScrollChange` 이벤트를 사용한다.

### 조건

```text
scrollTopChanged === true
```

인 경우에만 처리한다.

### 처리

현재 Editor의 가시 영역을 가져온다.

```text
editor.getVisibleRanges()
```

그중 첫 번째 Range의 시작 줄을 Preview 동기화 기준으로 사용한다.

```text
topVisibleLine =
visibleRanges[0].startLineNumber
```

### Preview 동기화

```typescript
syncPreviewInterpolated(
  previewRef.current,
  topVisibleLine,
  editor.getValue(),
  {
    smooth: false
  }
);
```

### 이유

사용자가 직접 스크롤하는 상황에서는 Preview가 즉시 따라와야 하므로 smooth scrolling을 사용하지 않는다.

---

# 17. 이벤트별 스크롤 정책

| 이벤트 | Preview Sync | Smooth | 기준 |
|---|---:|---:|---|
| 문자 입력 | ❌ | - | 스크롤 유지 |
| 같은 행 좌우 이동 | ❌ | - | 스크롤 유지 |
| 다른 행으로 커서 이동 | ✅ | `true` | 현재 Cursor Line |
| 마우스 클릭으로 행 변경 | ✅ | `true` | 현재 Cursor Line |
| Enter | ✅ | `true` | 변경된 Cursor Line |
| Editor Wheel Scroll | ✅ | `false` | 최상단 가시 Line |
| Frontmatter 내부 이동 | ✅ | 이벤트별 적용 | `scrollTop = 0` |

---

# 18. FR-013. Preview DOM Line Anchor 요구사항

Markdown Viewer는 Markdown AST/rehype 처리 과정에서 가능한 범위 내에서 각 블록 요소에 원본 Markdown 줄 번호를 주입해야 한다.

예:

```html
<h1 data-line="12">제목</h1>

<p data-line="14">
  본문 내용
</p>

<table data-line="18">
  ...
</table>
```

### 요구사항

- `[data-line]`은 Preview Sync Engine에서 검색 가능해야 한다.
- `data-line` 값은 원본 Markdown의 물리적 줄 번호를 의미한다.
- 렌더링 요소의 실제 높이는 고려하지 않고 DOM 위치를 기준으로 계산한다.

---

# 19. FR-014. 대형 콘텐츠 대응

다음과 같이 한 Markdown 줄이 매우 큰 화면 영역을 차지하는 경우에도 동작해야 한다.

- 대형 이미지
- 이미지 갤러리
- 긴 표
- 코드 블록
- 긴 인용문
- 복합 Markdown Block

Sync Engine은 고정 픽셀 기반의 단순한 줄 높이 계산을 사용하지 않는다.

대신 실제 DOM의 다음 값을 사용한다.

```text
getBoundingClientRect()
```

이를 통해 실제 렌더링 높이를 기준으로 가시 영역을 판단한다.

---

# 20. FR-015. Preview 하단 여백

Preview 컨테이너 하단에 최소 80px의 여유 공간을 확보한다.

```css
.custom-preview-container {
  padding-bottom: 80px !important;
}
```

### 목적

문서 마지막 줄 또는 마지막 블록을 화면 하단에서 충분히 확인할 수 있도록 한다.

특히 연속 Enter 입력 시 Preview가 화면 바닥에 밀착되어 빈 화면 또는 위치 튐 현상이 발생하는 것을 방지한다.

---

# 21. FR-016. Browser Scroll Anchoring 제어

Preview 컨테이너에는 브라우저의 Scroll Anchoring 정책을 적용한다.

```css
.custom-preview-container {
  overflow-anchor: auto !important;
}

.custom-preview-container * {
  overflow-anchor: none;
}
```

### 목적

Markdown 실시간 렌더링으로 DOM 높이가 변경될 때 브라우저가 임의로 스크롤 위치를 보정하여 발생시키는 위치 튐 현상을 최소화한다.

---

# 22. 핵심 API 명세

## 22.1 `parseDynamicFrontmatter`

### Signature

```typescript
function parseDynamicFrontmatter(
  content: string
): FrontmatterInfo
```

### 반환 타입

```typescript
interface FrontmatterInfo {
  hasFrontmatter: boolean;
  startLine: number;
  endLine: number;
  lineCount: number;
}
```

### 책임

문서의 Frontmatter 영역을 동적으로 계산한다.

---

## 22.2 `syncPreviewInterpolated`

### Signature

```typescript
function syncPreviewInterpolated(
  previewContainer: HTMLElement | null,
  targetLine: number,
  content?: string,
  options?: SyncOptions
): void
```

### 옵션

```typescript
interface SyncOptions {
  smooth?: boolean;
}
```

### 책임

1. Frontmatter 여부 확인
2. Frontmatter 내부 커서 처리
3. `[data-line]` 앵커 탐색
4. 대상 DOM의 실제 위치 계산
5. 안전 영역 이탈 여부 판단
6. 필요한 최소 scroll delta 계산
7. scrollTop 범위 클램핑
8. Preview 스크롤 적용

---

# 23. 전체 동기화 알고리즘

```text
syncPreviewInterpolated()
        │
        ├─ previewContainer 없음?
        │       └─ YES → 종료
        │
        ├─ Frontmatter 분석
        │
        ├─ Cursor가 Frontmatter 내부?
        │       └─ YES → scrollTop = 0 → 종료
        │
        ├─ [data-line] 요소 검색
        │       └─ 없음 → 종료
        │
        ├─ targetLine에 대응하는 anchor 검색
        │
        ├─ 대상 요소의 실제 viewport 위치 계산
        │
        ├─ 하단 안전선 초과?
        │       └─ YES → 아래 방향 최소 이동
        │
        ├─ 상단 안전선 초과?
        │       └─ YES → 위 방향 최소 이동
        │
        └─ 둘 다 아님
                └─ 스크롤 변경 없음
```

---

# 24. 예외 및 Guard 조건

| 상황 | 처리 |
|---|---|
| Preview container가 `null` | 즉시 종료 |
| 콘텐츠가 빈 문자열 | Frontmatter 없음으로 처리 |
| 첫 줄이 `---`가 아님 | Frontmatter 없음 |
| 종료 `---` 없음 | 문서 끝까지 Frontmatter로 처리 |
| `[data-line]` 없음 | Sync 종료 |
| targetLine보다 작은 anchor 없음 | 첫 번째 anchor 사용 |
| 계산된 scrollTop < 0 | 0으로 클램핑 |
| 계산된 scrollTop > maxScrollTop | maxScrollTop으로 클램핑 |
| clientHeight가 비정상적인 경우 | 스크롤 변경 최소화 |
| 대형 이미지/표 | 실제 DOM 위치 기준 계산 |
| 마지막 줄 연속 Enter | 최소 delta 이동 + maxScrollTop 제한 |

---

# 25. 비기능 요구사항

## NFR-001. 타이핑 성능

일반 문자 입력 과정에서 Preview 스크롤 연산을 실행하지 않아야 한다.

목표:

```text
Typing → Scroll Sync 호출 0회
```

## NFR-002. 시각적 안정성

대상 요소가 안전 영역에 있는 경우 scrollTop을 변경하지 않아야 한다.

```text
Visible + Safe Zone
→ scrollTop 변경 없음
```

## NFR-003. 최소 이동 원칙

스크롤이 필요한 경우에도 대상 요소를 화면의 특정 고정 위치로 강제 이동하지 않고 안전선까지의 최소 거리만 이동한다.

## NFR-004. 데이터 기반 동기화

Frontmatter의 고정 줄 수를 하드코딩해서는 안 된다.

잘못된 구현:

```typescript
const FRONTMATTER_LINES = 5;
```

허용되는 구현:

```typescript
const fmInfo = parseDynamicFrontmatter(content);
```

---

# 26. Acceptance Criteria

## AC-001. 동적 Frontmatter

### Given

Frontmatter가 4줄인 문서

### When

Frontmatter를 10줄로 변경한다.

### Then

본문 첫 줄의 Preview 매핑이 기존 고정 offset을 사용하지 않고 새 Frontmatter 종료 위치를 기준으로 정상 동작해야 한다.

---

## AC-002. Frontmatter 내부 이동

### Given

커서가 Frontmatter 내부에 있다.

### When

`↑`, `↓`, 클릭 등으로 Frontmatter 내부를 이동한다.

### Then

Preview는 최상단에 위치해야 한다.

```text
scrollTop === 0
```

---

## AC-003. 타이핑 안정성

### Given

문서 중간에 커서가 위치해 있다.

### When

빠르게 여러 문자를 입력한다.

### Then

Preview의 기존 scrollTop이 타이핑 자체 때문에 반복적으로 변경되어서는 안 된다.

---

## AC-004. 방향키 추종

### Given

Editor와 Preview가 서로 다른 위치를 표시하고 있다.

### When

사용자가 `↓` 키를 반복 입력한다.

### Then

현재 커서에 대응하는 Preview 요소가 안전 영역을 벗어나는 순간 Preview가 부드럽게 따라가야 한다.

---

## AC-005. 동일 행 좌우 이동

### Given

커서가 특정 행에 있다.

### When

`←`, `→`를 반복 입력한다.

### Then

Preview의 스크롤 위치는 변경되지 않아야 한다.

---

## AC-006. 마우스 클릭 이동

### Given

Preview가 현재 문서 위치를 표시하고 있다.

### When

Editor의 다른 행을 클릭한다.

### Then

커서 행이 변경된 경우 해당 행을 기준으로 Preview가 부드럽게 이동해야 한다.

---

## AC-007. Editor 스크롤

### Given

사용자가 Editor를 마우스 휠로 스크롤한다.

### When

가시 영역의 최상단 행이 변경된다.

### Then

Preview는 최상단 가시 행을 기준으로 즉시 동기화되어야 한다.

---

## AC-008. 마지막 줄

### Given

커서가 문서 마지막 줄에 있다.

### When

문자를 입력하거나 Enter를 여러 번 입력한다.

### Then

Preview가 위쪽으로 튀거나 과도한 빈 화면을 노출하지 않고 필요한 만큼만 아래로 이동해야 한다.

---

## AC-009. Scroll Boundary

### Given

Preview가 문서 최하단에 도달했다.

### When

추가적인 Sync 요청이 발생한다.

### Then

Preview의 scrollTop은 `maxScrollTop`을 초과하지 않아야 한다.

---

# 27. 테스트 시나리오

| ID | 테스트 | 기대 결과 |
|---|---|---|
| T-001 | Frontmatter 3줄 | 정상 매핑 |
| T-002 | Frontmatter 15줄 | 정상 매핑 |
| T-003 | Frontmatter 없음 | 일반 Markdown 동기화 |
| T-004 | Frontmatter 종료선 없음 | 문서 끝까지 FM 처리 |
| T-005 | FM 내부 ↑↓ | Preview 최상단 유지 |
| T-006 | 본문 고속 타이핑 | Preview 스크롤 변화 없음 |
| T-007 | 동일 행 ←→ | Preview 이동 없음 |
| T-008 | 다른 행 ↓ | Preview smooth 추종 |
| T-009 | 다른 행 ↑ | Preview smooth 추종 |
| T-010 | Editor Wheel | Preview 즉시 추종 |
| T-011 | 대형 이미지 | 화면 위치 안정 |
| T-012 | 긴 Table | 화면 위치 안정 |
| T-013 | 긴 Code Block | 화면 위치 안정 |
| T-014 | 마지막 줄 Enter | 최소 이동 |
| T-015 | 마지막 줄 연속 Enter | 과도한 점프 없음 |
| T-016 | 문서 최하단 | maxScrollTop 초과 없음 |
| T-017 | data-line 없음 | 오류 없이 종료 |
| T-018 | Preview DOM null | 오류 없이 종료 |

---

# 28. 구현 파일 기준

```text
frontend/
├─ src/
│  ├─ lib/
│  │  └─ syncEngine.ts
│  │
│  ├─ hooks/
│  │  └─ editor/
│  │     └─ useMonacoSetup.ts
│  │
│  ├─ components/
│  │  └─ MarkdownViewer.tsx
│  │
│  └─ app/
│     └─ globals.css
```

### `syncEngine.ts`

핵심 로직을 UI 컴포넌트에서 분리한다.

```text
Frontmatter 분석
+
Anchor 탐색
+
Viewport 계산
+
Scroll Clamp
```

### `useMonacoSetup.ts`

Monaco 이벤트와 Sync Engine을 연결한다.

```text
Editor Event
→ Sync Policy
→ syncEngine
```

### `MarkdownViewer.tsx`

Markdown Source Line 정보를 Preview DOM에 전달한다.

```text
Markdown AST
→ data-line
→ Preview DOM
```

### `globals.css`

브라우저 기본 Scroll Anchoring 및 하단 공간 정책을 관리한다.

---

# 29. 구현상 핵심 원칙

## 원칙 1. 입력과 이동을 분리한다.

```text
Content Change ≠ Scroll Sync
```

문자 입력은 콘텐츠 상태 변경의 책임만 가진다.

---

## 원칙 2. 줄 번호가 변경될 때만 Cursor Sync를 수행한다.

```text
same line → skip
different line → sync
```

---

## 원칙 3. 고정 Frontmatter offset을 사용하지 않는다.

```text
Dynamic Detection
```

을 원칙으로 한다.

---

## 원칙 4. Preview를 무조건 Cursor 위치로 이동하지 않는다.

```text
Safe Zone 내부
→ 유지

Safe Zone 외부
→ 최소 이동
```

---

## 원칙 5. 항상 Scroll Boundary를 검사한다.

```text
0 <= scrollTop <= maxScrollTop
```

---

## 원칙 6. 브라우저의 자동 Scroll Anchoring과 Sync Engine의 스크롤 정책이 서로 충돌하지 않도록 CSS와 JS의 책임을 분리한다.

---

# 30. 완료 정의 (Definition of Done)

다음 조건을 모두 만족하면 SPEC-SYNC-001 v2.0 구현 완료로 판단한다.

- [ ] Frontmatter 줄 수가 변경되어도 동기화가 정상 동작한다.
- [ ] Frontmatter 내부에서는 Preview가 최상단에 유지된다.
- [ ] 문자 입력만으로 Preview scrollTop이 변경되지 않는다.
- [ ] 동일 행의 좌우 커서 이동으로 Preview가 움직이지 않는다.
- [ ] 다른 행으로 이동하면 Preview가 필요한 경우에만 추종한다.
- [ ] Editor Wheel Scroll 시 Preview가 즉시 추종한다.
- [ ] 상단 40px / 하단 60px 안전선이 적용된다.
- [ ] 필요한 경우 최소 delta만큼만 스크롤한다.
- [ ] `maxScrollTop`을 초과하지 않는다.
- [ ] 마지막 줄 Enter에서 화면이 튀지 않는다.
- [ ] 대형 이미지/표/코드 블록에서도 위치가 안정적이다.
- [ ] `[data-line]`이 없는 경우 오류 없이 종료된다.
- [ ] Preview DOM이 없는 경우 오류 없이 종료된다.
- [ ] 고속 타이핑에서 체감 가능한 화면 덜컹거림이 발생하지 않는다.

---

네. **실제 저장소 코드까지 대조해서 보니**, 처음 작성한 SPEC 그대로 적용하면 안 됩니다.

현재 코드는 이미 여러 차례 동기화 로직을 패치한 상태이고, 특히 `syncEngine.ts`는 **구간 선형 보간 방식**, `useMonacoSetup.ts`는 **커서 이동 + Editor scroll 이중 경로**, `MainEditorApp.tsx`는 **Frontmatter lineMap을 별도로 계산**, `MarkdownViewer.tsx`는 이미 **`data-line`을 상당히 촘촘하게 주입**하는 구조입니다. 실제 코드에서도 과거의 중복 스크롤 로직을 제거한 흔적이 확인됩니다.  

따라서 제가 권하는 것은 **"syncEngine을 새로 만드는 것"이 아니라, 현재 구현을 기준으로 잘못된 로직을 제거하고 동기화 책임을 하나로 재정리하는 것**입니다.

## 결론부터 말하면

현재 구조에서 가장 크게 바꿔야 할 부분은 5개입니다.

| 구분 | 현재 | 변경 |
|---|---|---|
| `syncEngine.ts` | 구간 선형 보간 | **가시 뷰포트 기반 최소 이동 방식으로 변경** |
| `useMonacoSetup.ts` | Cursor Sync + Scroll Sync + 각종 별도 보정 | **이벤트별 단일 정책으로 통합** |
| `frontmatterLines` | 별도 `preprocess` 결과를 Ref로 전달 | **Sync Engine이 실제 content에서 직접 판단** |
| `MarkdownViewer.tsx` | 이미 `data-line` 상당히 잘 구현됨 | **기본 유지 + 매핑 정확성만 보강** |
| `globals.css` | `overflow-anchor:none` | **현재 요구사항과 충돌하므로 재검토/수정** |

그리고 **가장 중요한 삭제 대상은 `topOffset`을 이용한 "에디터 커서 높이 → Preview 동일 Y좌표" 강제 보간입니다.**

현재 코드가 이 방식 때문에 오히려 마지막 줄/대형 콘텐츠에서 튀는 구조가 되어 있습니다.

---

# 1. `syncEngine.ts` — 가장 큰 변경 대상

현재 `syncEngine.ts`는 다음 구조입니다.

```text
targetLine
 ↓
prev data-line
next data-line
 ↓
두 anchor 사이 선형 보간
 ↓
targetScrollTop 계산
 ↓
topOffset 적용
 ↓
lastElement 하단 제한
 ↓
scrollTop 이동
```

실제 코드도 `prevEl / nextEl`을 찾고 두 요소 사이를 선형 보간하고 있습니다. 

이 방식은 **이론상 1:1 정렬에는 좋아 보이지만**, 현재 요구사항에는 맞지 않습니다.

### 왜 문제가 되느냐

예를 들어:

```text
Editor

100
101  ← cursor
102
103
```

Preview가

```text
[data-line=100]
높이 30px

[data-line=101]
이미지 800px

[data-line=102]
```

이라면,

`101 → 102` 사이의 픽셀 거리가 800px입니다.

그런데 현재 방식은:

```text
targetLine
→ anchor 간 progress 계산
→ 800px 영역 안에서 비율 보간
```

을 합니다.

즉 **Markdown 한 줄 = Preview의 한 줄**이라는 가정이 사실상 들어갑니다.

그런데 실제 Preview는 이미지, 표, Mermaid, 코드블록 등 때문에 한 Markdown line이 수백~수천 px를 차지할 수 있습니다.

따라서 현재 요구사항의 핵심인

> "이미 보이는 경우 움직이지 않고, 화면 밖으로 나갔을 때 필요한 만큼만 움직인다."

와 충돌합니다.

---

# 2. `syncPreviewInterpolated()`에서 삭제해야 할 로직

### ❌ 삭제 권장 ① `topOffset`

현재:

```typescript
topOffset?: number;
```

그리고:

```typescript
const effectiveTopOffset =
  topOffset !== undefined
    ? topOffset
    : Math.floor(previewContainer.clientHeight * 0.45);
```

이 로직은 제거하는 것을 권장합니다.

현재 `useMonacoSetup.ts`에서도 실제 커서의 Preview 위치를 계산해서:

```typescript
const visiblePos = editor.getScrolledVisiblePosition(e.position);
const cursorTopOffset = visiblePos ? visiblePos.top : undefined;

syncPreviewFromEditor(currentLine, {
  topOffset: cursorTopOffset
});
```

형태로 전달하고 있습니다. 

이것이 **"커서가 에디터에서 120px에 있으니 Preview target도 120px에 놓자"**는 정책입니다.

하지만 이것은 Preview와 Editor의 렌더링 높이가 서로 다르기 때문에 안정성을 보장하지 못합니다.

### ✅ 변경

`topOffset` 개념 자체를 제거합니다.

Preview는:

```text
target element가 안전 영역을 벗어났는가?
```

만 판단합니다.

---

# 3. `syncEngine.ts`의 핵심 알고리즘을 변경

현재:

```text
targetLine
→ prev/next anchor
→ interpolation
→ absolute scroll
```

을

```text
targetLine
→ 가장 가까운 data-line
→ 현재 viewport 위치 확인
→ 안전 영역 밖인가?
→ 필요한 delta만 계산
→ scroll
```

로 바꾸는 것이 좋습니다.

즉 제가 앞서 작성한 SPEC의 이 부분은 **그대로 채택해도 됩니다.**

### 새로운 기준

```text
TOP_SAFE = 40px
BOTTOM_SAFE = 60px
```

대상 요소가:

```text
40px <= elementTop
AND
elementBottom <= containerHeight - 60px
```

이면:

```text
return;
```

합니다.

이게 핵심입니다.

---

# 4. `frontmatterLines`는 Sync Engine에서 제거하는 게 좋음

현재 구조:

```typescript
const {
  processedContent,
  lineMap,
  frontmatterLines
} = useMemo(...)
```

그리고:

```typescript
frontmatterLinesRef.current = frontmatterLines;
```

로 넘기고 있습니다. 

또 `syncPreviewFromEditor()`에서:

```typescript
frontmatterLines:
  frontmatterLinesRef?.current || 0
```

을 전달합니다.

이것은 **동일한 정보를 두 군데에서 관리하는 구조**입니다.

현재 프로젝트에는 이미 `preprocessMarkdownForPreview()`가 있고, 실제로 `processedContent`, `lineMap`, `frontmatterLines`를 함께 생성하고 있습니다. 

### 따라서 선택지는 두 가지인데

제가 추천하는 것은:

### `frontmatterLinesRef` 제거

Sync Engine에서:

```typescript
parseDynamicFrontmatter(content)
```

으로 직접 판단합니다.

그러면:

```text
MainEditorApp
      ↓
frontmatterLinesRef
      ↓
useMonacoSetup
      ↓
syncEngine
```

이라는 불필요한 데이터 전달이 사라집니다.

대신:

```text
Editor content
      ↓
syncEngine
      ↓
parseDynamicFrontmatter()
```

로 단순화됩니다.

---

# 5. 단, `lineMap`은 삭제하면 안 됨

여기서 중요한 구분이 있습니다.

### `frontmatterLines`

→ Sync Engine에서 직접 계산 가능

### `lineMap`

→ **현재 구조에서 유지 필요**

왜냐하면 현재 Preview는 단순히 원본 Markdown을 바로 렌더링하는 것이 아니라 `preprocessMarkdownForPreview()`를 거치고 있습니다.

그리고 `MarkdownViewer`의 `rehypeSourceLinesPlugin`도:

```typescript
const currentLineMap =
  dynamicPropsRef.current.lineMap || [];

const originalLine =
  currentLineMap[line - 1] || line;

node.properties['data-line'] = originalLine;
```

방식으로 **processed line → original editor line**을 역매핑하고 있습니다. 

이건 아주 중요한 구조이므로 건드리면 안 됩니다.

---

# 6. `MarkdownViewer.tsx` — 대부분 유지

여기는 생각보다 잘 되어 있습니다.

현재 `rehypeSourceLinesPlugin`이 존재하고, 실제 DOM에 `data-line`을 넣고 있습니다. 

특히 코드가:

```typescript
if (line) {
  const currentLineMap =
    dynamicPropsRef.current.lineMap || [];

  const originalLine =
    currentLineMap[line - 1] || line;

  node.properties['data-line'] = originalLine;
}
```

이므로 **기존 SPEC에서 요구한 `[data-line]` 시스템이 이미 구현되어 있습니다.**

따라서:

### ❌ 하지 말 것

`rehypeSourceLinesPlugin`을 새로 만들지 마세요.

### ❌ 하지 말 것

`data-line` 시스템을 다른 방식으로 갈아엎지 마세요.

### ✅ 해야 할 것

현재 플러그인이 실제로 모든 필요한 Block에 적절한 `data-line`을 제공하는지 테스트만 강화합니다.

---

# 7. `data-line`을 "모든 DOM"에 넣으려는 것도 조심

현재 주석상으로는:

> 블록 요소뿐 아니라 p 내부의 줄바꿈, 인라인 강조 등 모든 가시 요소에 촘촘하게 부여

하려는 구조입니다. 

그런데 이 부분은 오히려 지나치게 공격적으로 갈 필요가 없습니다.

예:

```html
<p data-line="20">
  <strong data-line="20">
    <span data-line="20">
      text
    </span>
  </strong>
</p>
```

이렇게 anchor가 지나치게 많아지면 target 검색 대상이 불필요하게 커집니다.

### 권장

**Block-level anchor 중심**으로 가져가세요.

```text
h1
h2
h3
p
ul
ol
blockquote
pre
table
img
figure
hr
```

등.

단, 한 `p` 안에서 `remarkBreaks` 때문에 여러 줄이 실제로 렌더링되는 경우에는 해당 줄을 정확하게 추적해야 하므로 예외적으로 세밀한 anchor가 필요할 수 있습니다.

즉:

> "모든 DOM에 data-line"

보다는

> **"스크롤 추적에 필요한 렌더링 단위에 data-line"**

이 더 좋은 설계입니다.

---

# 8. `useMonacoSetup.ts` — 현재 가장 많이 정리해야 하는 부분

여기가 현재 코드에서 가장 복잡합니다.

현재 이미:

```text
onDidChangeModelContent
onDidChangeCursorPosition
onDidScrollChange
onMouseDown
```

등 여러 이벤트가 존재합니다.

특히 과거 패치의 흔적으로:

```typescript
let isTypingScrollLock = false;
let typingLockTimeout = null;
```

그리고:

```typescript
let suppressEditorScrollSyncUntil = 0;
let lastModelChangeTime = 0;
```

같은 락/시간 기반 방어가 남아 있습니다.

실제 코드에서도 `isTypingScrollLock`, `suppressEditorScrollSyncUntil`, `lastModelChangeTime` 같은 여러 방어책이 공존하고 있습니다. 

### 이 구조의 문제

이런 구조는 처음에는 버그를 잡는 데 효과적이지만 시간이 지나면:

```text
이벤트 A
 → lock
 → timeout
 → 이벤트 B
 → suppress
 → RAF
 → 또 lock
```

형태가 되어 **동작 원인을 추적하기 어려워집니다.**

---

# 9. `onDidChangeModelContent`는 정말 "Content Only"로 변경

현재 문서 요구사항대로라면:

```typescript
editor.onDidChangeModelContent(() => {
  setContent(editor.getValue());
});
```

가 핵심입니다.

현재 이벤트 안에는 별도의 decoration 업데이트, caret 업데이트 등 다른 작업도 섞여 있습니다. 예를 들어 현재 코드에 별도의 `onDidChangeModelContent`가 여러 번 존재합니다. 

### 여기서 중요한 것

`onDidChangeModelContent` 안에서:

```text
syncPreview
scrollTo
scrollIntoView
preview.scrollTop
```

은 절대 실행하지 않도록 합니다.

Decoration 등 **스크롤과 무관한 기능은 남겨도 되지만**, 가능하면 별도 listener로 분리하는 게 좋습니다.

---

# 10. `onDidChangeCursorPosition`은 유지

이건 유지하는 것이 맞습니다.

현재도:

```typescript
const currentLine = e.position.lineNumber;
const prevLine = prevCursorLineRef.current;

const hasLineChanged =
  prevLine !== currentLine;
```

형태로 되어 있습니다. 

이 구조는 좋습니다.

다만:

```typescript
e.reason === 3
```

때문에 같은 행 클릭에서도 Sync가 실행되는 정책은 다시 검토해야 합니다.

현재:

```typescript
if (
  hasLineChanged ||
  e.reason === 3
)
```

입니다. 

### 권장 변경

일반적인 Preview scroll 동기화는:

```typescript
hasLineChanged
```

만 기준으로 합니다.

즉:

```text
같은 행 클릭
→ Preview scroll 하지 않음

다른 행 클릭
→ Preview sync
```

이 더 안정적입니다.

단, **Preview 클릭 → Editor 이동**은 별도의 명시적인 사용자 액션이므로 이 규칙과 분리해야 합니다.

---

# 11. `onDidScrollChange`는 유지하되 역할을 축소

현재는:

```typescript
if (Date.now() - lastModelChangeTime < 200) return;
if (Date.now() < suppressEditorScrollSyncUntil) return;
```

등 시간 기반 Guard가 들어갑니다. 

이걸 계속 늘리면 결국:

```text
왜 스크롤이 안 됐는가?
```

를 추적하기 어려워집니다.

### 권장

`onDidScrollChange`는 단순하게:

```text
scrollTopChanged?
 ↓
현재 최상단 visible line
 ↓
syncPreview(... smooth:false)
```

만 담당하게 합니다.

다만 **Editor가 프로그램적으로 커서 이동을 발생시키면서 내부 스크롤 이벤트를 발생시키는 경우**에는 중복 sync를 막는 최소한의 source lock 하나 정도는 유지할 수 있습니다.

---

# 12. `suppressEditorScrollSyncUntil`은 삭제 후보

현재:

```typescript
let suppressEditorScrollSyncUntil = 0;
```

그리고:

```typescript
suppressEditorScrollSyncUntil = Date.now() + 100;
```

형태입니다.

이건 사실상:

> "앞으로 100ms 동안 Editor Scroll 이벤트를 믿지 마."

라는 시간 기반 임시 방어입니다.

### 권장

삭제하고 대신:

```typescript
isScrollingRef.current = 'editor'
```

와 **실제 이벤트 source 기준 Guard**로 통일합니다.

시간을 이용한:

```text
100ms
200ms
50ms
```

식의 방어를 최소화해야 합니다.

---

# 13. `syncPreviewFromEditor()`는 유지하되 단순화

현재:

```typescript
const syncPreviewFromEditor = (
  lineNumber,
  customOptions = {}
)
```

인데 내부에서:

```typescript
isScrollingRef
scrollTimeoutRef
frontmatterLines
totalEditorLines
```

등 너무 많은 것을 다룹니다. 

### 변경 권장

```typescript
const syncPreviewFromEditor = (
  lineNumber: number,
  smooth = false
) => {
  if (
    previewModeRef.current !== 'both' ||
    !previewRef.current
  ) {
    return;
  }

  syncPreviewInterpolated(
    previewRef.current,
    lineNumber,
    editor.getValue(),
    { smooth }
  );
};
```

정도로 단순화합니다.

---

# 14. `totalEditorLines`는 삭제

현재 `syncEngine`에:

```typescript
totalEditorLines?: number;
```

이 있지만 실제 핵심 알고리즘에서는 사실상 필요성이 없습니다.

Preview의 실제:

```text
scrollHeight
clientHeight
DOM rect
```

가 중요하지 Editor 전체 line count는 뷰포트 이동 계산에 직접 필요하지 않습니다.

### 따라서

```typescript
totalEditorLines
```

삭제 권장.

---

# 15. `snapPreviewToBottomFromEditor()`는 매우 주의

현재:

```typescript
previewEl.scrollTo({
  top: maxContentScroll,
  behavior: 'auto',
});
```

형태로 **무조건 최하단으로 보내는 함수**가 있습니다. 

이것은 이번 SPEC과 철학적으로 충돌합니다.

이번 요구사항은:

> 필요한 만큼만 움직인다.

이지,

> 마지막 줄이면 무조건 bottom으로 간다.

가 아닙니다.

### 따라서

일반 동기화 경로에서는 제거해야 합니다.

정말 필요한 특수 UX가 있다면:

```text
"명시적으로 문서 끝으로 이동"
```

같은 별도 명령에서만 사용해야 합니다.

---

# 16. Enter 관련 별도 Preview Scroll 보정도 삭제

현재 코드에는 Table 이동 같은 특정 상황에서:

```typescript
setTimeout(() => {
  const targetElement =
    previewRef.current.querySelector(
      `[data-line="${targetLine}"]`
    );

  verticalScrollToElement(...)
}, 50);
```

형태의 별도 Preview 이동이 있습니다. 

이것은 매우 중요합니다.

### ❌ 삭제 권장

```text
verticalScrollToElement()
```

를 동기화 목적으로 호출하는 모든 경로.

왜냐하면 이제 Preview 이동은 **오직 `syncPreviewInterpolated()` 하나만** 담당해야 하기 때문입니다.

이렇게 해야:

```text
Table
Enter
List
Mouse
Arrow
Scroll
```

각각 다른 스크롤 알고리즘이 존재하는 문제를 없앨 수 있습니다.

---

# 17. `verticalScrollToElement()` 자체는 삭제 후보

현재 함수는:

```typescript
verticalScrollToElement(parent, child, block, behavior)
```

형태로 별도의 scroll 계산을 합니다.

이 함수가 다른 독립적인 UI 기능에서 사용되지 않는다면:

### ❌ 삭제

하는 것을 권장합니다.

동기화 관련 스크롤 함수는:

```text
syncPreviewInterpolated()
```

하나만 남기는 것이 좋습니다.

---

# 18. `globals.css`는 반드시 수정

여기가 상당히 중요합니다.

현재 실제 CSS는:

```css
.custom-preview-container {
  overflow-anchor: none;
  scroll-behavior: auto;
}
```

입니다. 

그런데 처음 SPEC에서는:

```css
overflow-anchor: auto;
```

를 제안했습니다.

### 그런데 저는 여기서 단순히 `auto`로 바꾸는 것도 권하지 않습니다.

왜냐하면 JS가 직접 scroll 위치를 관리하는 엔진에서는 브라우저 Scroll Anchoring이 다시 개입하면:

```text
React 렌더링
→ DOM 높이 변경
→ Browser Anchor 보정
→ JS Sync
```

가 서로 경쟁할 수 있기 때문입니다.

### 따라서

현재 요구사항의 핵심이:

> 입력 중 Preview 위치를 JS가 건드리지 않는다.

라면 오히려:

```css
.custom-preview-container {
  overflow-anchor: none;
  scroll-behavior: auto;
}
```

는 **유지 가능**합니다.

즉, 제가 앞서 작성한 SPEC에서 `overflow-anchor:auto`라고 했던 부분은 **실제 코드와 대조한 결과 수정하는 것을 권장합니다.**

---

# 19. 대신 반드시 추가해야 하는 CSS

현재 CSS에서 제가 확인한 범위에는 `padding-bottom: 80px`이 해당 동기화 규칙으로 들어가 있지 않습니다.

따라서:

```css
.custom-preview-container {
  padding-bottom: 80px;
}
```

을 추가하는 것이 좋습니다.

단, 기존 CSS Profile의 padding과 충돌하지 않도록 **무조건 `!important`를 사용하지 않는 것**을 먼저 권장합니다.

현재 프로젝트는 사용자 CSS 프로필이 `.custom-preview-container` 아래에 동적으로 적용되는 구조이므로, `!important`를 남발하면 사용자 서식 시스템과 충돌할 가능성이 있습니다. 실제 프로젝트 문서에서도 CSS `!important` 과다 사용에 따른 프로필 충돌 위험을 이미 지적하고 있습니다. 

---

# 20. 하단 80px은 특히 중요한 이유

현재 가장 큰 문제 중 하나가:

```text
마지막 줄
 ↓
Enter
 ↓
Editor 높이 증가
 ↓
Preview DOM 높이 변화
 ↓
스크롤 계산
 ↓
scrollTop 재계산
 ↓
화면 치솟음
```

입니다.

80px 정도의 bottom breathing room을 확보하면 마지막 콘텐츠가:

```text
┌─────────────────────┐
│                     │
│       마지막 줄      │
│                     │
│                     │
│       80px 여백      │
└─────────────────────┘
```

상태가 되므로 마지막 줄을 억지로 화면 꼭대기로 올릴 필요가 없습니다.

---

# 21. `MainEditorApp.tsx`에서 삭제할 것

현재 MainEditorApp에는 이미:

> 스크롤 동기화 및 휠 차단 로직은 Monaco Setup 내부 단일 리스너로 완전히 마이그레이션되어 이곳의 중복 훅은 삭제되었습니다.

라고 명시되어 있습니다. 

이 부분은 **좋은 상태입니다.**

### 따라서 추가적인 Preview Scroll useEffect를 MainEditorApp에 다시 만들면 안 됩니다.

MainEditorApp은:

```text
content
lineMap
preview
layout
```

관리만 하고,

실제 Preview Scroll 계산은:

```text
useMonacoSetup
      ↓
syncEngine
```

으로 보내야 합니다.

---

# 22. MainEditorApp의 Frontmatter 처리만 역할 변경

현재:

```typescript
const {
  processedContent,
  lineMap,
  frontmatterLines
} = useMemo(...)
```

인데,

다음처럼 바꾸는 것을 권장합니다.

```text
processedContent
lineMap
```

은 유지.

```text
frontmatterLines
frontmatterLinesRef
```

는 동기화 목적으로는 제거.

즉:

```text
preprocessMarkdownForPreview
 ├─ processedContent
 ├─ lineMap
 └─ frontmatterLines
```

중에서 `frontmatterLines`가 다른 기능에서도 필요하지 않다면 제거합니다.

다른 기능에서 필요하다면 `preprocess` 결과 자체는 유지하되 **Sync Engine에는 전달하지 않는 것**이 좋습니다.

---

# 23. 현재 코드에서 특히 삭제해야 할 "과거 패치 잔재"

제가 실제 코드를 대조하면서 가장 신경 쓰이는 부분입니다.

현재 `useMonacoSetup.ts` 상단 주석에 이미 여러 세대의 동기화 전략이 기록되어 있습니다.

```text
2026-08-13
→ scroll event 단일화

2026-08-14
→ isTypingScrollLock

2026-08-28
→ absolute anchor

2026-08-30
→ piecewise interpolation

2026-08-31
→ 현재 패치
```

즉 지금 파일은 **여러 세대의 해결책이 누적된 상태**입니다.

그래서 이번 변경에서 가장 중요한 작업은 새 Guard를 하나 더 추가하는 게 아니라:

> **과거의 Guard를 걷어내고 단일 알고리즘으로 통합하는 것**

입니다.

---

# 24. 최종적으로 남겨야 하는 구조

제가 권하는 최종 구조는 아주 단순합니다.

```text
                    Monaco
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Content Change   Cursor Change   Editor Scroll
        │              │              │
        │              │              │
     setContent    line 변경 확인    topVisibleLine
        │              │              │
        │          필요할 때만 Sync    │
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
              syncPreview(...)
                       │
                       ▼
             parseDynamicFrontmatter
                       │
                       ▼
                find data-line
                       │
                       ▼
               getBoundingRect
                       │
                       ▼
                Safe Zone 판단
                  /          \
                내부          외부
                 │              │
                 ▼              ▼
               STOP         최소 delta
                                │
                                ▼
                         Scroll Clamp
                                │
                                ▼
                         preview.scrollTo
```

---

# 25. 이벤트별 최종 정책

이 부분은 개발자에게 그대로 전달해도 됩니다.

| 이벤트 | 처리 | Preview Scroll |
|---|---|---|
| 문자 입력 | `setContent()` | **금지** |
| 한글 IME 입력 | 기존 IME 처리 | **금지** |
| 같은 행 좌우 이동 | cursor state만 갱신 | **금지** |
| 다른 행 이동 | Cursor line 기준 Sync | **허용** |
| 다른 행 클릭 | Cursor line 기준 Sync | **허용** |
| Enter | 변경된 Cursor line 기준 Sync | **허용** |
| Editor Wheel | 첫 visible line 기준 Sync | **허용** |
| Preview Click | Editor 이동 별도 처리 | Sync Engine과 분리 |
| 이미지 Load | 강제 scroll 금지 | **금지** |
| React Preview 재렌더 | 자체적으로 scroll 금지 | **금지** |
| Table 자동정렬 | Sync와 분리 | 강제 scroll 금지 |

---

# 26. 특히 "이미지 Load 시 Sync"는 하지 말 것

현재 `MainEditorApp.tsx`의:

```typescript
const handlePreviewImageLoaded = useCallback(() => {
  // 타이핑 시 미리보기 치솟음 방지를 위해 이미지 로드 시 자동 스크롤 동기화를 차단
}, []);
```

는 오히려 좋은 방향입니다. 

이걸 다시:

```text
image.onload
→ syncPreview()
```

로 바꾸면 안 됩니다.

이미지가 로드되면 Preview DOM 높이가 변합니다.

그때 자동 Sync를 걸면:

```text
DOM height 변화
→ scroll
→ 이미지 layout 변화
→ 또 scroll
```

이런 연쇄 현상이 발생할 수 있습니다.

---

# 27. Acceptance Test도 하나 추가해야 함

기존 AC 외에 이것을 추가하는 것을 강력히 권장합니다.

### AC-10 — 대형 콘텐츠 레이아웃 변화

```text
Given
현재 커서가 이미지 위/아래에 있음

When
이미지의 실제 높이가 변경됨

Then
Preview는 이미지 높이 변화 자체만으로
자동으로 다른 위치로 점프하지 않는다.

And

다음 사용자 커서 이동/Editor Scroll 이벤트가 발생했을 때
현재 targetLine을 기준으로 다시 안전 영역을 계산한다.
```

이 테스트가 있어야 이번 구조가 진짜 안정화됩니다.

---

# 28. 제가 최종적으로 권하는 변경 목록

### 🔴 반드시 변경

1. `syncEngine.ts`의 **Piecewise Linear Interpolation 제거**
2. `topOffset` 제거
3. `totalEditorLines` 제거
4. Preview **Safe Zone 기반 최소 delta 이동**으로 변경
5. `frontmatterLines`를 Sync Engine에 전달하는 구조 제거
6. `onDidChangeModelContent`에서 Preview Scroll 완전 차단
7. Cursor Sync는 **실제 line 변경 중심**으로 통일
8. Editor Scroll은 **visible line 기준**으로 통일
9. `verticalScrollToElement()` 기반 동기화 제거
10. 무조건 `scrollTop = maxScroll`하는 일반 동기화 경로 제거

### 🟡 정리 권장

11. `suppressEditorScrollSyncUntil` 제거
12. `lastModelChangeTime` 제거
13. `isTypingScrollLock` 제거
14. 중복 `onDidChangeModelContent` listener 정리
15. 동기화 관련 timeout 최소화
16. 동기화 관련 `setTimeout(50/100/200ms)` 제거 또는 최소화

### 🟢 유지

17. `rehypeSourceLinesPlugin`
18. `data-line`
19. `lineMap`
20. `preview-highlight-line`
21. `previewMode === 'both'` Guard
22. `scrollTop` 0~max 범위 Clamp
23. `overflow-anchor: none`
24. `scroll-behavior: auto`

### ➕ 추가

25. `.custom-preview-container` 하단 80px 여백
26. Sync Engine unit test
27. Frontmatter 가변 길이 테스트
28. 대형 이미지/표/코드블록 테스트
29. 마지막 줄 Enter 연속 입력 테스트
30. 고속 타이핑 테스트
31. 동일 행 좌우 이동 테스트
32. Editor Wheel / Cursor 이동 상호 충돌 테스트

---

## 그리고 아주 중요한 최종 판단

현재 코드에는 이미 **좋은 방향으로 만들어진 부분이 상당히 많습니다.**

예를 들어 실제 저장소에서도 원래 있던 MainEditorApp의 별도 스크롤 훅은 이미 제거되고 Monaco Setup의 단일 리스너로 이동된 상태이고, `MarkdownViewer`에는 `data-line` 매핑 체계도 이미 구축되어 있습니다.  

그래서 **새로운 동기화 시스템을 덧붙이는 방식으로 작업하면 안 됩니다.**

이번 작업의 정확한 방향은:

> **현재 `syncEngine + useMonacoSetup`에 누적된 여러 세대의 동기화/보정 로직을 정리하고, `Content / Cursor / EditorScroll` 세 이벤트의 책임을 분리한 뒤, Preview 스크롤 계산을 `syncEngine` 하나로 단일화하는 것**

입니다.

특히 **`Piecewise Linear Interpolation + topOffset`을 버리는 것**이 이번 수정의 핵심입니다.

이렇게 해야 `대형 이미지`, `긴 표`, `Mermaid`, `코드블록`, `마지막 줄 Enter`, `고속 타이핑`이 서로 다른 예외 패치로 싸우는 구조에서 벗어나 **하나의 Safe Viewport 정책으로 처리**할 수 있습니다.



# 31. 최종 기능 정의

**SPEC-SYNC-001은 "에디터의 모든 변화에 Preview를 강제로 따라가게 하는 기능"이 아니다.**

본 기능의 핵심 정책은 다음과 같다.

```text
                 ┌─ 문자 입력 ─────────→ 위치 유지
                 │
사용자 이벤트 ───┼─ 같은 행 이동 ──────→ 위치 유지
                 │
                 ├─ 다른 행 이동 ──────→ 필요할 때만 추종
                 │
                 └─ Editor Scroll ─────→ 즉시 추종

                       ↓

              [Safe Viewport 판단]

                ┌───────────────┐
                │ 이미 보이는가? │
                └───────┬───────┘
                    YES │ NO
                        │
               스크롤 유지 │ 최소 이동
                        │
                        ↓
                 [Scroll Clamp]
                        │
                        ↓
                안전한 Preview 상태
```

따라서 본 엔진의 핵심 품질 기준은 **정확한 동기화 자체뿐 아니라 "불필요한 동기화를 하지 않는 것"**이다.

이 버전은 특히 **개발자에게 구현을 넘길 수 있는 수준**으로 정리한 명세입니다. 원본보다 중요한 점은 `타이핑 / 커서 이동 / 에디터 스크롤`을 서로 다른 정책으로 명확히 분리했다는 것입니다.

제아이 :

---

## 메타영역
#서식설정
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 디자인 시스템"

# [기능구현서] 에디터 ↔ 미리보기 단일 뷰포트 안전영역(Safe Zone) 동기화 및 렌더링 안정화 엔진 구축 (SPEC-SYNC-001 v4.0)

## 1. 개요 (Overview)

* **문서 ID**: SPEC-SYNC-001 (v4.0)
* **기능명**: 에디터-미리보기 단일 뷰포트 안전영역(Safe Zone) 기반 최소 델타 동기화 및 렌더링 안정화
* **적용 대상**: 분할 뷰 모드 (`previewMode === 'both'`)
* **핵심 구현 원칙**:
1. **구간 선형 보간(Piecewise Linear Interpolation) 및 `topOffset` 전면 폐기**: 에디터 커서 높이에 맞춘 강제 Y좌표 일치 보간을 제거하고, 대상 요소가 안전 영역(Safe Zone) 밖으로 벗어날 때만 최소 델타(`delta`)만큼 이동시킵니다.
2. **과거 다중 락/타이머 잔재 완전 소탕**: `suppressEditorScrollSyncUntil`, `lastModelChangeTime`, `isTypingScrollLock`, `snapPreviewToBottomFromEditor`, `verticalScrollToElement` 등 누적된 임시 시간 기반 락을 전면 제거하고 단일 정책으로 통합합니다.
3. **타이핑 덜컹거림 0%**: 글자 입력(`onDidChangeModelContent`) 시점에는 스크롤 함수 호출을 일절 차단하여 React 렌더러가 텍스트만 제자리에서 갱신하도록 통제합니다.
4. **상위 1,000자 경량 프론트매터 동적 감지**: 메타데이터(`---` ... `---`) 줄 수가 가변적이더라도 상위 슬라이스 정규식으로 고속 판별하며, 메타 내부에서는 미리보기를 최상단(0px)에 고정합니다.
5. **가시 영역 뷰포트 유지**: 상단 40px, 하단 60px 안전선을 적용하여, 마지막 줄 입력 시 화면이 위로 치솟아 흰 화면이 노출되는 현상을 원천 방지합니다.



---

## 2. 시스템 아키텍처 및 데이터 흐름도

```
                    Monaco Editor
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  [문자/IME 타이핑]    [커서/방향키 이동]   [에디터 휠 스크롤]
(onDidChangeModelContent) (onDidChangeCursorPosition) (onDidScrollChange)
        │                 │                 │
        ▼                 ▼                 ▼
   setContent()     Line 변경 검사     topVisibleLine
  (스크롤 차단 ❌)  (동일 행 좌우 스킵) (isWheelScrolling 가드)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
            syncPreviewInterpolated() (단일 진입점)
                          │
                          ▼
             parseDynamicFrontmatter (상위 1,000자 검사)
                          │
                          ▼
               findClosestDataLine ([data-line] 수색)
                          │
                          ▼
                  getBoundingClientRect
                          │
                          ▼
                Safe Zone 안전선 판정
                   /             \
             [내부 머무름]     [외부 벗어남]
                  │               │
                  ▼               ▼
                STOP          최소 Delta 계산
                                  │
                                  ▼
                            Scroll Clamping
                                  │
                                  ▼
                           preview.scrollTo

```

---

## 3. 이벤트별 단일 처리 매트릭스 (Event Policy Matrix)

| 이벤트 구분 | 트리거 조건 | 에디터 측 처리 | 미리보기 스크롤 허용 여부 | 상세 동작 |
| --- | --- | --- | --- | --- |
| **문자 타이핑 / 한글 IME** | `onDidChangeModelContent` | `setContent(val)` | **절대 금지 (❌)** | 텍스트만 렌더링하며 스크롤 연산 배제 |
| **동일 행 좌우 이동** | `onDidChangeCursorPosition` | 커서 위치 상태만 갱신 | **절대 금지 (❌)** | 줄 번호 불변 시 스크롤 스킵 |
| **다른 행 이동 (`↑`, `↓`)** | `onDidChangeCursorPosition` | 줄 번호 변경 감지 | **조건부 허용 (✅)** | Safe Zone 밖으로 나갈 때만 최소 이동 (`smooth: true`) |
| **엔터(`Enter`) 줄바꿈** | `onDidChangeCursorPosition` | 새 줄 번호 감지 | **조건부 허용 (✅)** | 새 줄이 하단 안전선 아래로 벗어날 때만 1줄 폭 이동 |
| **에디터 마우스 휠 스크롤** | `onDidScrollChange` | 최상단 가시 줄 번호 추출 | **즉각 허용 (✅)** | `isWheelScrolling` 락 활성화 후 즉시 이동 (`smooth: false`) |
| **미리보기 이미지 비동기 로딩** | `img.onload` | 로딩 완료 대기 | **절대 금지 (❌)** | 높이 변화로 인한 스크롤 점프 금지 |
| **표(Table) 서식 자동 정렬** | 서식 포맷팅 핸들러 | 에디터 텍스트 치환 | **절대 금지 (❌)** | `verticalScrollToElement` 등 중복 호출 제거 |

---

## 4. 파일별 세부 구현 명세

### 4.① `frontend/src/lib/syncEngine.ts` (전면 재작성)

* **제거 대상**:
* `totalEditorLines`, `topOffset`, 구간 선형 보간($Progress$) 공식 전면 삭제.
* `frontmatterLines` 파라미터 전달 구조 삭제 (엔진 내부 직접 판별).


* **핵심 로직**:
* 상위 1,000자 기반 `parseDynamicFrontmatter` 구현.
* 상단 40px(`TOP_SAFE`), 하단 컨테이너 높이 - 60px(`BOTTOM_SAFE`) Safe Zone 판정.



```typescript
// frontend/src/lib/syncEngine.ts

export interface SyncOptions {
  smooth?: boolean;
}

export interface FrontmatterInfo {
  hasFrontmatter: boolean;
  endLine: number;
}

/**
 * 상위 1,000자 이내에서 닫는 '---' 물리 줄 번호를 고속 판별
 */
export function parseDynamicFrontmatter(content: string): FrontmatterInfo {
  if (!content || !content.startsWith('---')) {
    return { hasFrontmatter: false, endLine: 0 };
  }

  const headSnippet = content.slice(0, 1000);
  const match = headSnippet.match(/^---\r?\n([\s\S]*?\r?\n)---(\r?\n|$)/);

  if (match) {
    const matchedBlock = match[0];
    const lines = matchedBlock.split('\n');
    const endLine = lines[lines.length - 1].trim() === '' ? lines.length - 1 : lines.length;
    return { hasFrontmatter: true, endLine };
  }

  return { hasFrontmatter: true, endLine: 1 };
}

/**
 * Safe Zone 기반 최소 델타 미리보기 동기화 엔진
 */
export function syncPreviewInterpolated(
  previewContainer: HTMLElement | null,
  targetLine: number,
  content: string = '',
  options: SyncOptions = {}
): void {
  if (!previewContainer) return;

  const { smooth = true } = options;
  const fmInfo = parseDynamicFrontmatter(content);

  // 1. 커서가 프론트매터 메타 영역 내부에 위치할 경우 최상단(0px) 고정
  if (fmInfo.hasFrontmatter && targetLine <= fmInfo.endLine) {
    previewContainer.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
    return;
  }

  const elements = Array.from(previewContainer.querySelectorAll('[data-line]')) as HTMLElement[];
  if (elements.length === 0) return;

  // 2. 현재 타깃 라인 이하 중 가장 가까운 [data-line] 앵커 수색
  let targetEl: HTMLElement | null = null;
  for (let i = elements.length - 1; i >= 0; i--) {
    const line = parseInt(elements[i].getAttribute('data-line') || '1', 10);
    if (line <= targetLine) {
      targetEl = elements[i];
      break;
    }
  }

  if (!targetEl) targetEl = elements[0];

  // 3. 뷰포트 Safe Zone 판정
  const containerRect = previewContainer.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const elementTop = targetRect.top - containerRect.top;
  const elementBottom = targetRect.bottom - containerRect.top;
  const containerHeight = previewContainer.clientHeight;

  const TOP_SAFE = 40; // 상단 안전 여백
  const BOTTOM_SAFE = containerHeight - 60; // 하단 안전 여백

  let newScrollTop = previewContainer.scrollTop;

  // 하단 안전선 아래로 벗어날 때만 최소 이동
  if (elementBottom > BOTTOM_SAFE) {
    newScrollTop += (elementBottom - BOTTOM_SAFE);
  }
  // 상단 안전선 위로 벗어날 때만 최소 이동
  else if (elementTop < TOP_SAFE) {
    newScrollTop -= (TOP_SAFE - elementTop);
  }
  // Safe Zone 내부에 이미 머물고 있다면 스크롤 스킵
  else {
    return;
  }

  // 4. 스크롤 클램핑 및 반영
  const maxScrollTop = previewContainer.scrollHeight - previewContainer.clientHeight;
  const finalScroll = Math.min(Math.max(0, newScrollTop), maxScrollTop);

  previewContainer.scrollTo({
    top: finalScroll,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

```

---

### 4.② `frontend/src/hooks/editor/useMonacoSetup.ts` (이벤트 단일화 및 정리)

* **제거 대상**:
* `isTypingScrollLock`, `typingLockTimeout`, `suppressEditorScrollSyncUntil`, `lastModelChangeTime` 등 과거 임시 락 변수 전면 삭제.
* 중복 선언된 `onDidChangeModelContent` 리스너 및 `snapPreviewToBottomFromEditor`, `verticalScrollToElement` 호출 제거.


* **단일화 로직**:

```typescript
// frontend/src/hooks/editor/useMonacoSetup.ts
import { syncPreviewInterpolated } from '@/lib/syncEngine';

let prevCursorLine = -1;
let isWheelScrolling = false;
let wheelScrollTimeout: NodeJS.Timeout | null = null;

// 1. 방향키 / 마우스 클릭 / 엔터 입력 리스너
editor.onDidChangeCursorPosition((e) => {
  const currentLine = e.position.lineNumber;
  setCursorLine(currentLine);
  setCursorColumn(e.position.column);

  // 휠 스크롤 중이 아니고 줄 번호가 실제로 변경되었을 때만 동기화 호출
  if (!isWheelScrolling && prevCursorLine !== currentLine) {
    prevCursorLine = currentLine;
    const content = editor.getValue();
    syncPreviewInterpolated(previewRef.current, currentLine, content, { smooth: true });
  }
});

// 2. 글자 타이핑 리스너: 스크롤 개입 ❌ (오직 텍스트 상태만 갱신)
editor.onDidChangeModelContent(() => {
  const value = editor.getValue();
  setContent(value);
});

// 3. 에디터 휠 스크롤 리스너
editor.onDidScrollChange((e) => {
  if (!e.scrollTopChanged) return;

  isWheelScrolling = true;
  if (wheelScrollTimeout) clearTimeout(wheelScrollTimeout);
  wheelScrollTimeout = setTimeout(() => {
    isWheelScrolling = false;
  }, 150);

  const visibleRanges = editor.getVisibleRanges();
  if (visibleRanges.length > 0) {
    const topVisibleLine = visibleRanges[0].startLineNumber;
    const content = editor.getValue();
    syncPreviewInterpolated(previewRef.current, topVisibleLine, content, { smooth: false });
  }
});

```

---

### 4.③ `frontend/src/app/globals.css` (스타일 안정화)

* **설정 내용**: 브라우저 스크롤 앵커링 경쟁 방어 및 하단 80px 슬림 여백 설정.

```css
/* frontend/src/app/globals.css */
.custom-preview-container {
  overflow-anchor: none !important;
  scroll-behavior: auto !important;
  padding-bottom: 80px; /* 마지막 줄 타이핑 시 치솟음 및 흰 화면 방어용 여백 */
}

```

---

## 5. 변경 대상 및 삭제/유지 파일 요약

| 구분 | 파일 경로 | 주요 작업 내용 |
| --- | --- | --- |
| **🔴 전면 변경** | `frontend/src/lib/syncEngine.ts` | 보간 공식 및 `topOffset` 삭제 ➔ Safe Zone 최소 델타 이동 알고리즘 적용 |
| **🔴 전면 정리** | `frontend/src/hooks/editor/useMonacoSetup.ts` | 누적된 시간 기반 락(`suppress...`, `isTyping...`) 삭제 ➔ 3대 이벤트 단일 책임 바인딩 |
| **🟢 100% 유지** | `frontend/src/components/MarkdownViewer.tsx` | `rehypeSourceLinesPlugin` 및 `lineMap` 역매핑 체계 유지 (재작성 금지) |
| **🟢 정리 유지** | `frontend/src/components/MainEditorApp.tsx` | `handlePreviewImageLoaded` 내 자동 스크롤 차단 상태 유지, 불필요한 별도 스크롤 훅 추가 금지 |
| **➕ 스타일 보강** | `frontend/src/app/globals.css` | `.custom-preview-container { padding-bottom: 80px; overflow-anchor: none; }` 적용 |

---

## 6. 인수 테스트 기준 (Acceptance Criteria)

* [ ] **AC-1 (동적 메타데이터 매핑)**: 상단 프론트매터가 3줄이든 20줄이든 본문 첫 줄(`# 제목`)을 클릭했을 때 정확히 본문 첫 번째 블록으로 1:1 매핑되는가?
* [ ] **AC-2 (메타데이터 내부 포커스)**: `---` 메타 영역 안에서 커서를 이동할 때 미리보기 화면이 흔들리지 않고 최상단(0px)에 안정적으로 머무는가?
* [ ] **AC-3 (타이핑 흔들림 0%)**: 문서 상단/중간/하단 어디서든 빠른 속도로 타자를 쳐도 미리보기가 위아래로 튀거나 깜빡이지 않고 제자리에 고정되는가?
* [ ] **AC-4 (방향키 실시간 추종)**: `↓` 또는 `↑` 방향키를 꾹 누르고 문서를 이동할 때 커서가 Safe Zone을 벗어나는 순간 미리보기가 부드럽게 한 줄씩 자연스럽게 추종하는가?
* [ ] **AC-5 (동일 행 좌우 이동)**: 같은 행 안에서 `←`, `→` 방향키를 누를 때 불필요한 스크롤 트리거가 발생하지 않는가?
* [ ] **AC-6 (마지막 줄 치솟음/흰 화면 방어)**: 문서 최하단에서 텍스트를 작성하거나 `Enter`를 칠 때 미리보기가 화면 위로 치솟아 흰 빈 화면이 나오지 않고, 작성 중인 줄이 화면 하단에 안정적으로 유지되는가?
* [ ] **AC-7 (대형 콘텐츠 레이아웃 변화)**: 수백 픽셀 높이의 이미지, 긴 표, Mermaid 다이어그램이 뒤늦게 렌더링되더라도 미리보기 화면이 제멋대로 점프하지 않는가?