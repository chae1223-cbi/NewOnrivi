# 구현계획서: 미리보기 리스트 탭 들여쓰기 및 번호 왜곡 수정

## 1. 근본 원인 발견

제아이 분석과 실제 코드 대조 결과, **두 가지 문제 모두 하나의 근본 원인에서 발생**:

### ① `\u00A0` (non-breaking space) 주입 — `editorUtils.ts:68`

```
1. 부모 항목
                             ← 빈 줄 (유지)
                             ← 빈 줄 (→ \u00A0로 변환)
  1. 자식 항목
```

빈 줄이 연속으로 2개 이상일 때 두 번째부터 `\u00A0`(U+00A0)로 치환된다.  
CommonMark에서 `\u00A0`는 **whitespace가 아니다** → 파서가 "텍스트 문단"으로 인식 → 리스트 문맥 강제 종료.

결과: 자식 항목이 부모의 하위 리스트가 아니라 **완전히 새로운 루트 리스트**로 해석되어 `1.`부터 재시작.

### ② HTML 리스트 태그 이스케이프 — `editorUtils.ts:76-79`

```typescript
const dangerousTags = ['ol', 'li', 'ul', ...];
```

전처리기가 `<ol>`, `<li>`, `<ul>` 등의 HTML 태그를 `&lt;ol&gt;`로 이스케이프한다.  
이는 raw HTML을 방어하기 위한 의도지만, react-markdown이 생성한 리스트 구조와는 무관하므로 **부작용은 없음** (react-markdown은 markdown AST → React 요소로 직접 변환, HTML 생성 안 함).

### ③ `ol`의 `start` 속성 미전달 — `MarkdownViewer.tsx:838`

앞서 수정 완료 (`start` 명시적으로 전달). 리스트 분할 자체는 CommonMark 룰을 따르므로, 분할이 정상적으로 일어날 때 번호가 올바르게 시작하도록 보장.

### ④ CSS 빈 줄 높이 — `globals.css`

앞서 수정 완료 (`.prose br`). `\u00A0` 주입이 제거되면 빈 줄은 remarkBreaks에 의해 `<br>`로 변환되고, CSS가 높이를 보장.

## 2. 제아이 분석 vs 실제 코드 대조

| 제아이 주장 | 실제 코드 | 판정 |
|-------------|-----------|------|
| `packages/shared-core/src/markdownParser.ts` 존재 | **없음** — 전처리는 `frontend/src/lib/editorUtils.ts` | 경로/파일명 오류 |
| `marked` 라이브러리 사용 | **react-markdown + remark** 사용 | 파서 오인 |
| `lastIndent` 추적 + `<div>` HTML 인젝션 필요 | 원인은 단순 `\u00A0` 변환 한 줄 | **과잉 진단** |
| "들여쓰기 깊이 상속" 전처리 커널 수술 | 전처리기가 연속 빈 줄에 `\u00A0` 주입 → 리스트 종료 | **과잉 처방** |

**결론:** 제아이가 제안한 복잡한 전처리기 커널 수술(들여쓰기 추적, HTML 주입, `marked` 교체)은 **불필요**. 진짜 원인은 `editorUtils.ts` 68행 `\u00A0` 주입 1줄.

## 3. 변경 대상

| # | 파일 | 행 | 변경 | 영향 |
|---|------|-----|------|------|
| ① | `editorUtils.ts` | 66-69 | `\u00A0` 주입 제거 (빈 줄을 그대로 유지) | 연속 빈 줄이 `\u00A0` 텍스트로 변하지 않고 진짜 빈 줄로 유지 → 리스트 문맥 보존 |
| ② | `MarkdownViewer.tsx` | 838 | `ol`에 `start` 명시 전달 | ✅ 이미 수정 완료 |
| ③ | `globals.css` | (after 206) | `br` 높이 + nested 리스트 패딩 | ✅ 이미 수정 완료 |

## 4. 상세 변경 명세

### 4.① `editorUtils.ts:66-69` — `\u00A0` 주입 제거

**현재 코드:**
```typescript
if (trimmed === "") {
  insideParagraph = false;
  paragraphBaseIndent = "";
  
  const isPrevLineEmpty = index > 0 && expandedLines[index - 1].trim() === "";
  if (isPrevLineEmpty) {
    return "\u00A0";
  }
  return line;
}
```

**변경 코드:**
```typescript
if (trimmed === "") {
  insideParagraph = false;
  paragraphBaseIndent = "";
  
  return line;
}
```

**변경 이유:**
- 연속 빈 줄을 `\u00A0`로 변환하면 CommonMark 파서가 해당 줄을 **텍스트 문단**(whitespace가 아닌 문자)으로 인식
- 텍스트 문단이 리스트 중간에 삽입되면 리스트 문맥이 강제 종료됨
- 이후의 들여쓰기된 번호 항목이 하위 리스트가 아닌 **새로운 루트 리스트**가 되어 `1.`부터 재시작
- `\u00A0`를 제거하면 빈 줄은 빈 줄로 유지되고, `remarkBreaks`가 처리하거나 빈 `p`로 남아 CSS가 높이 보장

**부작용 분석:**
- `\u00A0`는 원래 "빈 줄이 2개 이상일 때 whitespace collapsing을 방어"하기 위해 도입됨
- 현재는 CSS `.prose br`과 `.prose p:empty::before`가 이 역할을 대체하므로 `\u00A0` 불필요
- `\u00A0` 제거 후 빈 줄은 `remarkBreaks`에 의해 `<br>` 또는 빈 `<p>`로 렌더링 → CSS가 높이 보장

### 4.② `MarkdownViewer.tsx:838` — `start` 전달

✅ 앞서 수정 완료. 추가 변경 불필요.

### 4.③ `globals.css` — CSS 규칙

✅ 앞서 수정 완료 (`.prose br`, `.prose ol ol`, `.prose p:empty::before`). 추가 변경 불필요.

## 5. 검증 시나리오

| # | 입력 | 예상 동작 |
|---|------|-----------|
| 1 | `1. A\n2. B\n\n\n1. C` | 연속 빈 줄 2개 → `1. A`, `2. B`가 첫 번째 리스트, `1. C`가 **새 리스트**로 분할 |
| 2 | `1. A\n\n   1. B` | 한 칸 띄고 들여쓰기 → `1. B`가 `1. A`의 **하위 리스트**로 중첩 |
| 3 | `1. A\n\n본문\n\n1. B` | 본문 단락으로 리스트 분할 → `1. B`가 새 리스트로 시작 |
| 4 | `- A\n  - B\n    - C` | 중첩 리스트가 2배 패딩 없이 1.5rem씩 단계적으로 표시 |

## 6. 데이터 흐름

```
[Monaco 에디터] "1. A\n\n\n   1. B"
        │
        ▼
[preprocessMarkdownForPreview]
  Step 2: "" (빈 줄) → "\u00A0"  ← 🚫 제거
          "   1. B" → "   1. B" (들여쓰기 보존)
        │
        ▼
[react-markdown + remark]
  Before fix: "\u00A0"가 텍스트 문단 → 리스트 종료 → "   1. B"가 루트 리스트
  After fix:  빈 줄 유지 → "1. A" 리스트 내에서 "   1. B"가 하위 리스트
        │
        ▼
[MarkdownViewer]
  <ol><li>A<ol start="1"><li>B</li></ol></li></ol>
        │
        ▼
[globals.css]
  .prose br: 1.2rem 높이
  .prose ol ol: 중첩 패딩 1.5rem 고정
```

## 7. 롤백

```bash
git checkout HEAD -- frontend/src/lib/editorUtils.ts
```

`MarkdownViewer.tsx`와 `globals.css` 변경은 별도 롤백 필요 시:
```bash
git checkout HEAD -- frontend/src/components/MarkdownViewer.tsx
git checkout HEAD -- frontend/src/app/globals.css
```
