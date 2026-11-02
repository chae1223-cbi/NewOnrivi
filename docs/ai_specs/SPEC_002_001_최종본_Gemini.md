---
메타영역
#서식설정
css_profile: naver-blog-onrivi-tech-info
css_profile_name: "Onrivi Tech & Info 네이버 블로그 디자인 시스템"
* **문서 ID**: SPEC-SYNC-001
* **Version**: v3.0
* **적용 대상**: Split View (`previewMode === 'both'`)
* **상태**: Implementation Specification (최종 확정본)
---

## 1. 개요 (Overview)

### 1.1 기능명

동적 프론트매터 자동 감지 및 가시 뷰포트 유지형 에디터 ↔ 미리보기 동기화 엔진

### 1.2 목적

Markdown 에디터와 Preview 간 줄 단위 동기화 과정에서 발생하는 다음 결함을 완전히 해소하고 단일화된 스크롤 파이프라인을 구축한다.

* Frontmatter 줄 수 가변성에 따른 줄 번호 어긋남
* 타이핑 중 Preview가 위아래로 튀거나 덜컹거리는 현상
* 방향키 이동 시 Preview가 커서를 실시간 추종하지 못하는 문제
* 동일 행 좌우 이동 시 발생하는 불필요한 Preview 스크롤 연산
* 대형 이미지/표/코드블록/Mermaid 높이 차이로 인한 위치 왜곡
* 마지막 줄 Enter 입력 시 Preview가 위로 솟구쳐 흰 화면만 노출되는 현상
* Editor Scroll과 Cursor Sync의 상호 충돌 및 중복 호출
* 다중 timeout/scroll lock 변수 간의 상태 꼬임
* Preview 재렌더링 및 이미지 비동기 로딩에 따른 강제 점프 스크롤
* Preview 사용자의 수동 조작을 자동 동기화가 침범하는 현상

---

## 2. 핵심 설계 원칙 (Core Principles)

* **원칙 1. Preview 스크롤 계산은 단 하나의 엔진만 전담한다.**
* 모든 Preview 스크롤은 `syncEngine.ts`의 `syncPreviewInterpolated()` 단일 함수로만 실행한다.
* 개별 컴포넌트나 이벤트 핸들러에서 `scrollTo()`, `scrollIntoView()`, `scrollTop = ...`, `verticalScrollToElement()`를 직접 호출하는 것을 금지한다.


* **원칙 2. 타이핑과 스크롤은 완벽히 격리한다.**
* `onDidChangeModelContent` ➔ `setContent()` ➔ 종료.
* 텍스트 입력 중에는 어떠한 스크롤 함수도 호출하지 않으며, React가 제자리에서 텍스트만 렌더링하도록 둔다.


* **원칙 3. Preview는 "강제 Y좌표 일치"가 아니라 "가시 영역(Safe Zone) 유지"를 목표로 한다.**
* 에디터 커서 높이에 맞춘 강제 `topOffset` 보간을 전면 폐기한다.
* 타깃 요소가 안전 가시 영역(상단 40px, 하단 60px) 밖으로 벗어났을 때만 필요한 최소 오프셋(`delta`)만큼 이동한다.


* **원칙 4. 사용자에게 이미 보이고 있는 콘텐츠는 절대 움직이지 않는다.**
* 타깃 요소가 안전 영역 내에 머물고 있다면 스크롤 이동 없이 즉시 `return`한다.


* **원칙 5. 시간 기반 임시 락(Timeout Lock)을 전면 제거한다.**
* 50ms/100ms/200ms `setTimeout`, `isTypingScrollLock`, `suppressEditorScrollSyncUntil` 등의 누적 코드를 걷어내고 이벤트 소스 상태를 기준으로 통제한다.



---

## 3. 시스템 아키텍처 및 데이터 흐름 (Architecture)

```
                         ┌──────────────────┐
                         │   Monaco Editor  │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       Content Change       Cursor Position       Editor Scroll
 (onDidChangeModelContent)(onDidChangeCursorPosition)(onDidScrollChange)
              │                   │                   │
              ▼                   ▼                   ▼
         setContent()       Line 변경 검사       visible line
       (스크롤 차단 ❌)    (동일 행 좌우 스킵) (isWheelScrolling 가드)
              │                   │                   │
              └───────────────────┴───────────────────┘
                                  │
                                  ▼
                        syncPreviewInterpolated()
                                  │
                                  ▼
                       parseDynamicFrontmatter()
                       (상위 1,000자 경량 검사)
                                  │
                                  ▼
                        data-line Anchor 검색
                                  │
                                  ▼
                         Safe Zone 안전선 판정
                          /              \
                    [내부 머무름]     [외부 벗어남]
                        │                   │
                        ▼                   ▼
                      STOP              최소 delta
                                            │
                                            ▼
                                       Epsilon (>=2px)
                                            │
                                            ▼
                                       Scroll Clamp
                                            │
                                            ▼
                                    preview.scrollTo()

```

---

## 4. 모듈별 책임 정의 (Module Responsibilities)

| 모듈 | 파일 위치 | 역할 및 핵심 기능 |
| --- | --- | --- |
| **Sync Engine** | `frontend/src/lib/syncEngine.ts` | 상위 1,000자 메타데이터 분석, `data-line` 수색, Safe Zone 판정, Epsilon 필터링, 최소 이동량 계산 |
| **Editor Event Controller** | `frontend/src/hooks/editor/useMonacoSetup.ts` | Monaco 3대 이벤트 책임 분리, `isWheelScrolling` 가드, 과거 시간 기반 락 전면 제거 |
| **Editor/Preview Container** | `frontend/src/components/MainEditorApp.tsx` | 전역 상태, Ref, 레이아웃 관리 (중복 스크롤 훅 제거 상태 유지) |
| **Preview Renderer** | `frontend/src/components/MarkdownViewer.tsx` | Markdown 파싱, `rehypeSourceLinesPlugin`, `lineMap` 역매핑 체계 100% 유지 |
| **CSS Stability** | `frontend/src/app/globals.css` | `overflow-anchor: none`, `scroll-behavior: auto`, 하단 `80px` 슬림 여백 설정 |

---

## 5. Frontmatter 동적 감지 사양

* **경량 파싱 (`parseDynamicFrontmatter`)**:
* 거대 문서의 성능 저하를 방지하기 위해 전체 텍스트가 아닌 **상위 1,000자 슬라이스** 내에서 정규식(`^---\r?\n([\s\S]*?\r?\n)---(\r?\n|$)`)으로 닫는 `---` 줄 번호를 동적 산출한다.


* **미완성 상태 처리**:
* 닫는 `---`가 아직 작성되지 않은 경우, 현재 작성 중인 라인 전체를 메타 영역으로 간주한다.


* **메타 내부 커서 위치**:
* `targetLine <= frontmatter.endLine`일 경우 Preview 스크롤을 최상단(`scrollTop: 0`)으로 고정하며, 이미 0px이면 추가 `scrollTo()`를 실행하지 않는다.



---

## 6. Preview Anchor 및 뷰포트 안전영역 (Safe Zone)

* **Anchor 수색 원칙**:
* 정확한 `[data-line="N"]` 요소가 없으면, `targetLine` 이하에서 가장 가까운 이전 Block 레벨 앵커를 탐색한다.


* **Safe Zone 판정 기준**:
* 상단 안전선: `TOP_SAFE = 40px`
* 하단 안전선: `BOTTOM_SAFE = containerHeight - 60px`
* 타깃 요소가 `TOP_SAFE`와 `BOTTOM_SAFE` 사이에 머물면 스크롤을 0px 유지한다.


* **최소 델타 이동량 계산**:
* 하단 이탈 시: `delta = elementBottom - BOTTOM_SAFE`
* 상단 이탈 시: `delta = TOP_SAFE - elementTop`


* **미세 이동 필터링 (`SCROLL_EPSILON`)**:
* 계산된 `|delta| < 2px`인 경우 브라우저 서브픽셀 렌더링 요동 방지를 위해 스크롤을 스킵한다.


* **Scroll Clamp**:
* 최종 스크롤 좌표는 반드시 `0`과 `scrollHeight - clientHeight` 사이로 강제 클램핑한다.



---

## 7. 이벤트별 단일 처리 매트릭스 (Event Policy Matrix)

| 이벤트 구분 | 트리거 소스 | 에디터 측 처리 | 미리보기 스크롤 허용 여부 | 상세 동작 |
| --- | --- | --- | --- | --- |
| **문자 입력 / 한글 IME** | `onDidChangeModelContent` | `setContent(val)` | **절대 금지 (❌)** | 텍스트만 제자리 렌더링하며 스크롤 연산 배제 |
| **동일 행 좌우 이동** | `onDidChangeCursorPosition` | 커서 상태만 갱신 | **절대 금지 (❌)** | 줄 번호 불변 시 스크롤 스킵 |
| **다른 행 이동 (`↑`, `↓`)** | `onDidChangeCursorPosition` | 줄 번호 변경 감지 | **조건부 허용 (✅)** | Safe Zone 밖으로 나갈 때만 최소 이동 (`smooth: true`) |
| **엔터(`Enter`) 줄바꿈** | `onDidChangeCursorPosition` | 새 줄 번호 감지 | **조건부 허용 (✅)** | 새 줄이 하단 안전선 아래로 벗어날 때만 1줄 폭 이동 |
| **에디터 휠 스크롤** | `onDidScrollChange` | 최상단 가시 줄 번호 추출 | **즉각 허용 (✅)** | `isWheelScrolling` 플래그 활성화 후 즉시 이동 (`smooth: false`) |
| **이미지 로딩 완료** | `img.onload` | 렌더링 완료 대기 | **절대 금지 (❌)** | 높이 변화로 인한 스크롤 점프 금지 |
| **표/문서 자동 포맷팅** | 액션 핸들러 | 텍스트 치환 | **절대 금지 (❌)** | `verticalScrollToElement` 등 별도 스크롤 호출 제거 |

---

## 8. 상세 소스코드 구현 명세

### 8.1 `frontend/src/lib/syncEngine.ts`

```typescript
// frontend/src/lib/syncEngine.ts

export interface SyncOptions {
  smooth?: boolean;
}

export interface FrontmatterInfo {
  hasFrontmatter: boolean;
  endLine: number;
}

const SCROLL_EPSILON = 2; // 2px 미만 미세 떨림 방어

/**
 * 상위 1,000자 이내에서 닫는 '---' 물리 줄 번호를 초고속 파싱
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
  if (!previewContainer || previewContainer.clientHeight === 0 || previewContainer.scrollHeight === 0) {
    return;
  }

  const { smooth = true } = options;
  const fmInfo = parseDynamicFrontmatter(content);

  // 1. 커서가 프론트매터 메타 영역 내부에 위치할 경우 최상단(0px) 고정
  if (fmInfo.hasFrontmatter && targetLine <= fmInfo.endLine) {
    if (previewContainer.scrollTop !== 0) {
      previewContainer.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }
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

  // 3. 뷰포트 상대 좌표 및 Safe Zone 판정
  const containerRect = previewContainer.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const elementTop = targetRect.top - containerRect.top;
  const elementBottom = targetRect.bottom - containerRect.top;
  const containerHeight = previewContainer.clientHeight;

  const TOP_SAFE = 40;
  const BOTTOM_SAFE = containerHeight - 60;

  let delta = 0;

  if (elementBottom > BOTTOM_SAFE) {
    delta = elementBottom - BOTTOM_SAFE;
  } else if (elementTop < TOP_SAFE) {
    delta = elementTop - TOP_SAFE;
  } else {
    return; // Safe Zone 내부에 이미 머물고 있으므로 스크롤 스킵
  }

  // 4. 미세 이동(2px 미만) 무시
  if (Math.abs(delta) < SCROLL_EPSILON) {
    return;
  }

  // 5. 스크롤 클램핑 및 적용
  const maxScrollTop = previewContainer.scrollHeight - previewContainer.clientHeight;
  const targetScrollTop = previewContainer.scrollTop + delta;
  const finalScroll = Math.min(Math.max(0, targetScrollTop), maxScrollTop);

  previewContainer.scrollTo({
    top: finalScroll,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

```

---

### 8.2 `frontend/src/hooks/editor/useMonacoSetup.ts`

```typescript
// frontend/src/hooks/editor/useMonacoSetup.ts
import { syncPreviewInterpolated } from '@/lib/syncEngine';

let prevCursorLine = -1;
let isWheelScrolling = false;
let wheelScrollTimeout: NodeJS.Timeout | null = null;
let rafSyncId: number | null = null;

// 1. 방향키 / 마우스 클릭 / 엔터 입력 리스너
editor.onDidChangeCursorPosition((e) => {
  const currentLine = e.position.lineNumber;
  setCursorLine(currentLine);
  setCursorColumn(e.position.column);

  // 휠 스크롤 중이 아니고, 줄 번호가 실제로 변경되었을 때만 동기화
  if (!isWheelScrolling && prevCursorLine !== currentLine) {
    prevCursorLine = currentLine;
    const content = editor.getValue();
    
    if (rafSyncId) cancelAnimationFrame(rafSyncId);
    rafSyncId = requestAnimationFrame(() => {
      syncPreviewInterpolated(previewRef.current, currentLine, content, { smooth: true });
    });
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

### 8.3 `frontend/src/app/globals.css`

```css
/* frontend/src/app/globals.css */
.custom-preview-container {
  overflow-anchor: none !important;
  scroll-behavior: auto !important;
  padding-bottom: 80px; /* 마지막 줄 작성 시 치솟음 및 흰 화면 방어 여백 */
}

```

---

## 9. 삭제 및 유지 대상 총괄

* **🔴 완전 삭제 (Removed)**:
* `Piecewise Linear Interpolation` ($Progress$) 연산 공식
* `topOffset` 및 `effectiveTopOffset`
* `totalEditorLines`
* `frontmatterLinesRef` 전달 배관 (엔진 내부 직접 산출로 단일화)
* `verticalScrollToElement()` 및 `snapPreviewToBottomFromEditor()`
* `isTypingScrollLock`, `typingLockTimeout`, `suppressEditorScrollSyncUntil`, `lastModelChangeTime`
* 타이핑 이벤트 내부의 모든 스크롤 함수 호출 및 개별 타이머(50ms/100ms)


* **🟢 100% 유지 (Preserved)**:
* `previewMode === 'both'` 조건 분기
* `MarkdownViewer.tsx`의 `rehypeSourceLinesPlugin`, `lineMap`, `data-line` 속성 체계
* `overflow-anchor: none` 및 `scroll-behavior: auto`
* `MainEditorApp.tsx`의 이미지 로드 시 자동 스크롤 차단 로직



---

## 10. 인수 테스트 기준 (Acceptance Criteria)

* [ ] **AC-1 (동적 Frontmatter 오프셋)**: Frontmatter가 4줄, 10줄, 30줄로 변경되어도 본문 첫 줄(`# 제목`)을 클릭했을 때 정확히 1:1로 매핑되는가?
* [ ] **AC-2 (Frontmatter 내부 커서)**: `---` 블록 내부에서 상하 이동 시 Preview가 본문으로 튀지 않고 최상단(0px)에 안정적으로 고정되는가?
* [ ] **AC-3 (타이핑 흔들림 0%)**: 문서 상단/중간/하단 어디서든 고속 타이핑 시 Preview가 위아래로 덜컹거리지 않고 제자리를 유지하는가?
* [ ] **AC-4 (동일 행 좌우 이동)**: 같은 행 안에서 `←`, `→`, `Home`, `End` 이동 시 Preview 스크롤이 발생하지 않는가?
* [ ] **AC-5 (방향키 추종)**: `↓` 또는 `↑` 방향키로 이동할 때 커서가 Safe Zone을 벗어나는 순간 Preview가 부드럽게 한 줄씩 자연스럽게 추종하는가?
* [ ] **AC-6 (Safe Zone 유지)**: 타깃 요소가 상단 40px ~ 하단 60px 안에 있을 때 Preview `scrollTop`이 변경되지 않는가?
* [ ] **AC-7 (최소 델타 이동)**: Safe Zone을 벗어났을 때 전체 화면을 재정렬하지 않고 벗어난 최소 델타만큼만 이동하는가?
* [ ] **AC-8 (대형 콘텐츠 안정성)**: 수백 픽셀 높이의 이미지, 긴 표, Mermaid, 코드블록을 통과할 때 Preview가 과도하게 점프하지 않는가?
* [ ] **AC-9 (마지막 줄 및 엔터)**: 문서 최하단에서 연속 `Enter` 입력 시 Preview가 위로 치솟아 흰 화면만 나오는 현상이 방어되고, 작성 중인 줄이 바닥에 안정적으로 유지되는가?
* [ ] **AC-10 (대형 콘텐츠 레이아웃 변화)**: 이미지 로딩 완료 자체만으로 Preview 스크롤이 자동으로 변경되지 않는가?
* [ ] **AC-11 (Scroll Clamp)**: 어떤 상황에서도 `scrollTop < 0` 또는 `scrollTop > maxScrollTop`이 발생하지 않는가?
* [ ] **AC-12 (Sync Coalescing)**: 커서 이동과 휠 스크롤이 동일 프레임에 발생해도 `requestAnimationFrame`을 통해 단 1회만 스크롤이 실행되는가?