/**
 * 🎨 Onrivi 마크다운 에디터 - 고성능 프론트엔드 마크다운 및 수식 전처리 공용 유틸리티
 */

/**
 * 🛡️ 해당 라인이 마크다운 리스트(순서 있는/없는 목록, 체크리스트 등)에 해당하는지 판별합니다.
 */
// ====================================================================
// 📊 [OMD-EDIT-editorUtils-0001] editorUtils.ts ➔ isAnyListLine
// 🎯 @KICK  : 라인이 마크다운 리스트(순서형/비순서형/체크리스트)인지 판별
// 🛡️ @GUARD : 빈 문자열, 정규식 매칭 (ordered/unordered/checkbox)
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function isAnyListLine(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  const isOrdered = /^(?:\d+[\.\)]|[①-⑩❶-❿\u2460-\u2469])\s/.test(trimmed);
  const isUnordered = /^(?:[-*+]\s|\[[ xX]?\]|[\u2756-\u2767]\s)/.test(trimmed);
  return isOrdered || isUnordered;
}

/**
 * 🛡️ 해당 라인이 마크다운 표(Table) 행(헤더, 구분선, 본문 행)에 해당하는지 판별합니다.
 * 선행/후행 파이프(|)가 생략된 GFM 표 문법도 포괄합니다.
 */
function isTableLine(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (trimmed.startsWith('|')) return true;
  // 파이프가 포함되어 있고 구분선(---|---)이거나 셀 분할 패턴인 경우
  if (trimmed.includes('|')) {
    // 구분선 패턴: :?---+:? \| :?---+:?
    if (/^:?-+:?\s*\|/.test(trimmed) || /\|\s*:?-+:?/.test(trimmed)) return true;
    // 일반 셀 분할 패턴 (2개 이상의 셀)
    return true;
  }
  return false;
}

/**
 * 마크다운 텍스트에서 YAML frontmatter(---로 둘러싸인 블록)를 제거합니다.
 */
// ====================================================================
// 📊 [OMD-EDIT-editorUtils-0002] editorUtils.ts ➔ stripFrontmatter
// 🎯 @KICK  : YAML frontmatter(--- 블록)를 마크다운 텍스트에서 제거
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function stripFrontmatter(markdown: string): string {
  // 닫는 구분선은 반드시 독립된 줄이어야 합니다. YAML 값 안의 `---`가
  // 문서 본문을 잘못 잘라 내거나, 파일 끝 Frontmatter의 줄 수가 틀어지는 것을 막습니다.
  return markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
}

/**
 * 📏 해당 라인의 들여쓰기 수준(Indent Level)을 스페이스 개수 기준으로 계산합니다.
 */
// ====================================================================
// 📊 [OMD-EDIT-editorUtils-0003] editorUtils.ts ➔ getIndentLevel
// 🎯 @KICK  : 라인의 들여쓰기 수준을 스페이스 개수 기준으로 계산 (탭=4)
// 🛡️ @GUARD : 빈 문자열, 탭 문자 4칸 변환
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
function getIndentLevel(line: string): number {
  if (!line) return 0;
  const match = line.match(/^([ \t]*)/);
  if (!match) return 0;
  const indentStr = match[1];
  let count = 0;
  for (let i = 0; i < indentStr.length; i++) {
    if (indentStr[i] === '\t') count += 4;
    else count += 1;
  }
  return count;
}

/**
 * 💡 [CommonMark 규격 기반 줄 단위 코드블록 영역 마스크 생성 함수]
 * 이중 코드블록(중첩 펜스: ```markdown 내부에 ```python ... ``` 등) 탐지 시
 * 최외곽 코드블록이 완전히 닫힐 때까지 전체 범위를 true로 정확히 마스킹합니다.
 */
export function getCodeBlockLineMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  const fenceRegex = /^([ \t]{0,3})(`{3,}|~{3,})(.*)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(fenceRegex);
    if (!match) {
      i++;
      continue;
    }

    const fenceChar = match[2][0];
    const fenceLen = match[2].length;
    const info = match[3].trim();

    if (fenceChar === '`' && info.includes('`')) {
      i++;
      continue;
    }

    let closingLineIdx = -1;

    for (let j = i + 1; j < lines.length; j++) {
      const curLine = lines[j];
      const curMatch = curLine.match(fenceRegex);
      if (!curMatch || curMatch[2][0] !== fenceChar) {
        continue;
      }

      const curFenceLen = curMatch[2].length;
      const curInfo = curMatch[3].trim();

      if (!curInfo && curFenceLen >= fenceLen) {
        closingLineIdx = j;
        break;
      }
    }

    if (closingLineIdx !== -1) {
      for (let k = i; k <= closingLineIdx; k++) {
        mask[k] = true;
      }
      i = closingLineIdx + 1;
    } else {
      for (let k = i; k < lines.length; k++) {
        mask[k] = true;
      }
      break;
    }
  }

  return mask;
}

export interface ProcessedMarkdown {
  text: string;
  lineMap: number[];
  /** YAML frontmatter 블록이 차지하는 에디터 라인 수 (없으면 0) */
  frontmatterLines: number;
}

/**
 * 마크다운 전처리 통합 파이프라인 함수
 * 1. 볼드 처리된 block math 수식 기호($$)의 개행 변환을 처리합니다.
 * 2. 탭 들여쓰기 보정 및 공백 정규화(correctMarkdownIndents)를 수행합니다.
 * 3. 마크다운의 문법적 구분을 위한 라인 브레이크 완충 개행(formatLineBreaksForPreview)을 주입합니다.
 * 이 모든 과정에서 결과물의 각 라인이 원본 에디터의 몇 번째 라인(1-based)에 해당하는지 매핑 정보(lineMap)를 함께 반환합니다.
 * @param content 원본 마크다운 텍스트
 * @returns 전처리된 텍스트 및 라인 매핑 배열
 */
// ====================================================================
// 📊 [OMD-EDIT-editorUtils-0004] editorUtils.ts ➔ preprocessMarkdownForPreview
// 🚨 @PATCH : **2026-10-01** — [사용자 HTML 컨테이너(div, align, table 등) 임의 이스케이프 제거]: dangerousTags 치환 로직을 제거하여 본문 내 <div align="right"> 등 정당한 HTML 태그가 &lt;div&gt; 문자열로 파괴되어 화면에 그대로 노출되던 결함을 원천 해결하고 rehypeRaw 표준 파이프라인으로 안전하게 렌더링되도록 복원
// 🚨 @PATCH : **2026-09-26** — [이중 중첩 코드블록 내부 &nbsp; 엔티티 오염 방어 및 코드블록 영역 마스크(getCodeBlockLineMask) 도입]: 단순 startsWith('```') 토글을 CommonMark 기반 코드블록 영역 정밀 마스크로 교체하여 이중 코드블록 내부의 들여쓰기 공백이 &nbsp;로 치환되는 버그 완벽 박멸
// 🚨 @PATCH : **2026-09-23** — [서브리스트 들여쓰기 보존 및 최상위 리스트 분리 정밀화] 빈 줄 직후 다음 줄의 들여쓰기(Indent > 0) 존재 시 리스트를 닫지 않고 해당 들여쓰기 깊이의 onrivi-empty-row를 주입하여 하위 계층 들여쓰기를 100% 보존하고, 들여쓰기 0칸인 최상위 리스트/문단 조우 시에만 onrivi-list-spacer로 독립 블록 분리하도록 정밀 개편
// 🚨 @PATCH : **2026-09-23** — [리스트 중간 빈 행/개행 시 독립 블록 분리 및 빈 행 렌더링] 리스트 항목 직후에 빈 행이나 <br> 태그가 나타났을 때 마크다운 파서의 단일 loose list 뭉침 현상을 방어하기 위해 onrivi-list-spacer 블록 및 완충 개행을 주입하여 에디터와 1:1로 동일한 빈 행 공간 렌더링 및 새 리스트 독립 분리 보장
// 🚨 @PATCH : **2026-09-23** — [리스트(숫자/글머리/체크박스) 빈 행 분리 및 중첩 들여쓰기 보존] 빈 줄 발생 시 앞뒤 리스트를 - onrivi-empty-row 로 인위 결합하던 로직을 제거하여 빈 행 뒤 새 리스트가 1번부터 독립 블록으로 시작되도록 보장, 상대 들여쓰기 2칸/4칸 모두 마크다운 중첩 서브리스트로 완벽 파싱되도록 개선
// 🚨 @PATCH : **2026-09-11** — 괄호 숫자 넘버링(1), 2) 등) 마크다운 강제 ordered list 변환 및 마침표(1., 2.) 변질 방지 (닫는 괄호 자동 이스케이프 보존)
//             **2026-09-06** — [표(Table) 파이프 생략 문법 지원 및 표 내부 빈 줄 주입 차단] isTableLine 헬퍼를 신설하여 선행/후행 파이프가 생략된 GFM 표 문법에서도 표 행 사이에 완충 개행이 주입되어 lineMap 및 뒤따르는 본문 줄 번호가 밀리는 현상을 원천 방지
//             **2026-09-05** — [미디어(이미지/동영상/지도)와 인접 문단 개행 분리] 이미지(![), 동영상/지도(iframe, video) 블록 직후 연속 텍스트가 올 때 하나의 문단으로 뭉쳐 줄 번호(data-line)가 실종되던 결함을 해결하기 위해 Step 3 완충 개행 분기 정규식에 미디어 패턴을 편입하여 독립 문단 및 고유 줄 번호 매핑 보장
//             **2026-09-03** — 일반 문단 행 시작의 탭/스페이스 들여쓰기를 &nbsp;로 변환하여 1:1 보존함으로써 마크다운 파서의 코드블록 오탐을 막고 에디터와 미리보기의 공백/탭 위치가 일치하도록 개선
//             **2026-08-14** — 빈 리스트 항목(글씨 입력 전 공백만 있는 상태)에서 trim()으로 인해 탭 간격 정규식이 깨져 리스트 인덴트 래핑 로직이 무시되던 현상을 해결하기 위해 trim()을 제거하여 첫 탭부터 즉각 미리보기에 반영되도록 수정 | **2026-08-13** — 첫 번째 리스트가 들여쓰기(탭)로 시작할 때 마크다운 파서가 코드 블록으로 오인해 리스트 구조가 파괴되던 현상을 방지하기 위해, 기저 들여쓰기(listBlockBaseIndent)에 맞춰 리스트 블록 전체를 padding-left div 돔으로 감싸고 리스트 시작 위치를 복원하는 지능형 인덴트 래퍼 이식 | **2026-08-12** — 리스트 최상단 들여쓰기를 기준선(listBlockBaseIndent)으로 삼아 하위 계층을 상대적 깊이(4칸 단위)로 보정해 렌더링하는 상대적 리스트 정규화 알고리즘 도입; YAML Frontmatter 제거 시 발생하는 라인 유실 오차를 계산하여 lineMap 에 오프셋(frontmatterOffset)을 주입 보정함으로써 미리보기 돔 ID 매칭 오류 및 스크롤 동기화 실패 버그 완벽 패치; 한글 붙여쓰기 강조 깨짐 방지(\u200B), html2canvas ::before/counter() 미지원 보정; page-break 기능 제거됨 (추후 재설계) | 2026-06-19
// 🔗 @CALLS : stripFrontmatter, isAnyListLine, getIndentLevel
// ====================================================================
export function preprocessMarkdownForPreview(content: string): ProcessedMarkdown {
  if (!content) return { text: "", lineMap: [], frontmatterLines: 0 };

  // Step 0: YAML frontmatter 줄 수(offset) 계산 및 제거
  let frontmatterOffset = 0;
  const frontmatterMatch = content.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  if (frontmatterMatch) {
    const fullMatch = frontmatterMatch[0];
    const newlines = fullMatch.match(/\n/g);
    // 닫는 `---` 뒤에 줄바꿈이 없으면, 마지막 Frontmatter 줄도 포함해야 합니다.
    const newlineCount = newlines ? newlines.length : 0;
    frontmatterOffset = fullMatch.endsWith('\n') ? newlineCount : newlineCount + 1;
  }

  content = stripFrontmatter(content);
  const originalLines = content.split("\n");
  const originalCodeMask = getCodeBlockLineMask(originalLines);
  let expandedLines: string[] = [];
  let expandedLineMap: number[] = []; // 각 확장 라인이 원본의 몇 번째 줄(1-based)인지 기록

  originalLines.forEach((line, index) => {
    const originalLineNumber = index + 1 + frontmatterOffset;
    if (originalCodeMask[index]) {
      expandedLines.push(line);
      expandedLineMap.push(originalLineNumber);
      return;
    }
    
    // 수식 기호 정규화 및 볼드 수식 분리
    let processedLine = line.replace(/\\/g, '\\');
    const replaced = processedLine.replace(/(\*\*|__)\$\$(.*?)\$\$(\*\*|__)/g, (match, p1, p2, p3) => {
      return `${p1}\n$$\n${p2}\n$$\n${p3}`;
    });
    
    const parts = replaced.split("\n");
    parts.forEach(part => {
      expandedLines.push(part);
      expandedLineMap.push(originalLineNumber);
    });
  });

  // Step 2: 탭 보정 및 들여쓰기 공백 정규화 (correctMarkdownIndents)
  const codeBlockMask = getCodeBlockLineMask(expandedLines);
  let insideParagraph = false;
  let paragraphBaseIndent = "";
  let listBlockBaseIndent = -1; // 💡 상대적 리스트 들여쓰기 기준선 트래킹용
  let listHasActiveDiv = false; // 💡 현재 div 태그가 열려 있는지 추적하는 플래그

  const correctedLines = expandedLines.map((line, index) => {
    // 🛡️ [코드블록 원본 무결성 보존] 이중/중첩 코드블록 내부를 포함하여 코드 영역은
    // 들여쓰기 공백이나 탭이 &nbsp;로 치환되지 않고 100% 원본 그대로 유지되도록 즉시 반환
    if (codeBlockMask[index]) {
      let suffix = "";
      if (listHasActiveDiv) {
        suffix = "\n\n</div>\n\n";
        listHasActiveDiv = false;
        listBlockBaseIndent = -1;
      }
      insideParagraph = false;
      return suffix + line;
    }

    const trimmed = line.trim();
    if (trimmed === "") {
      insideParagraph = false;
      paragraphBaseIndent = "";
      return line;
    }

    let processedLine = line.replace(/\t/g, "    ");

    // 💡 [괄호 숫자 넘버링(1), 2) 등) 마크다운 강제 ordered list 변환 방지]
    // CommonMark 표준으로 인해 행 시작 부분의 `1) `, `2) ` 등이 <ol> 리스트로 강제 파싱되어
    // 브라우저 미리보기에서 `1.`, `2.`(마침표)로 변질 및 강제 재번호가 매겨지는 현상을 방지하기 위해 닫는 괄호를 이스케이프(\)) 처리합니다.
    processedLine = processedLine.replace(/^(\s*\d+)\)(?=\s|$)/, (m, p1) => p1 + "\\)");

    // 💡 [한글 붙여쓰기 강조 보정] 마크다운 표준 스펙으로 인해 **단어**한글 또는 한글**단어** 형태로 붙여 쓸 때 
    // 강조가 깨지는 문제를 방지하기 위해 단어 경계 사이에 보이지 않는 제로 너비 공백(\u200B)을 동적 주입합니다.
    // 1) **단어**한글 -> **단어**\u200B한글
    processedLine = processedLine.replace(/(\*\*)([^\*]+?)(\*\*)([가-힣a-zA-Z0-9])/g, "$1$2$3\u200B$4");
    // 2) 한글**단어** -> 한글\u200B**단어**
    processedLine = processedLine.replace(/([가-힣a-zA-Z0-9])(\*\*)([^\*]+?)(\*\*)/g, "$1\u200B$2$3$4");

    // 3) __단어__한글 -> __단어__\u200B한글
    processedLine = processedLine.replace(/(__)([^_]+?)(__)([가-힣a-zA-Z0-9])/g, "$1$2$3\u200B$4");
    // 4) 한글__단어__ -> 한글\u200B__단어__
    processedLine = processedLine.replace(/([가-힣a-zA-Z0-9])(__)([^_]+?)(__)/g, "$1\u200B$2$3$4");

    // 5) *단어*한글 -> *단어*\u200B한글
    processedLine = processedLine.replace(/((?<!\*)\*)([^\*]+?)(\*)(?!\*)([가-힣a-zA-Z0-9])/g, "$1$2$3\u200B$4");
    // 6) 한글*단어* -> 한글\u200B*단어*
    processedLine = processedLine.replace(/([가-힣a-zA-Z0-9])((?<!\*)\*)([^\*]+?)(\*)(?!\*)/g, "$1\u200B$2$3$4");
    

    const isSpecial = /^(?:\s*#+\s|\s*[-*+]\s|\s*\d+\.\s|\s*>|\s*---|\s*\||\s*\$\$|\s*<[a-zA-Z]|\s*[①-⑩❶-❿\u2460-\u2469\u2756-\u2767])/.test(processedLine);
    
    if (isSpecial) {
      insideParagraph = false;
      paragraphBaseIndent = "";
      
      const indentMatch = processedLine.match(/^( +)/);
      if (indentMatch) {
        const indentSpaces = indentMatch[1];
        const remainingText = processedLine.substring(indentSpaces.length);
        
        const isListOrQuote = /^(?:[-*+]\s|(?:\d+)\.\s|>|\s*\[[ xX]?\])/.test(remainingText);
        const isHeading = /^(#{1,6})\s/.test(remainingText);
        const isDivider = /^---/.test(remainingText);

        if (isListOrQuote) {
          const indentLength = indentSpaces.length;
          
          let prefix = "";
          // 💡 [상대적 리스트 들여쓰기 보정 알고리즘]
          // 리스트 블록 최상단의 시작 공백 깊이를 base로 삼아, 하위 항목들을 상대적 탭 단계로 정규화합니다.
          if (listBlockBaseIndent === -1) {
            listBlockBaseIndent = indentLength;
            if (listBlockBaseIndent > 0 && !listHasActiveDiv) {
              // 💡 들여쓰기가 있는 첫 리스트 블록 진입 시 래핑 div 생성 (4칸당 20px)
              prefix = `<div style="padding-left: ${listBlockBaseIndent * 5}px;">\n\n`;
              listHasActiveDiv = true;
            }
          }
          
          const relativeIndent = Math.max(0, indentLength - listBlockBaseIndent);
          let normalizedIndent = "";
          if (relativeIndent >= 2) {
            // 💡 [지능형 다중 계층 들여쓰기 정규화] 2~4칸(1단계), 5~8칸(2단계), 9~12칸(3단계) 등
            // 2칸/3칸/4칸 단위 작성자 모두 에디터의 서브리스트 계층이 축소/왜곡 없이 1:1로 정확하게 유지되도록 정규화
            let steps = 1;
            if (relativeIndent <= 4) {
              steps = 1;
            } else if (relativeIndent <= 8) {
              steps = 2;
            } else if (relativeIndent <= 12) {
              steps = 3;
            } else {
              steps = Math.floor((relativeIndent + 1) / 4);
            }
            normalizedIndent = "    ".repeat(steps);
          }
          processedLine = prefix + normalizedIndent + remainingText.trim();
        } else {
          // 리스트가 아닌 경우 리스트 블록 종료
          let suffix = "";
          if (listHasActiveDiv) {
            suffix = "\n\n</div>\n\n";
            listHasActiveDiv = false;
          }
          listBlockBaseIndent = -1;
          if (isHeading || isDivider) {
            processedLine = suffix + remainingText.trim();
          } else {
            processedLine = suffix + processedLine;
          }
        }
      } else {
        // 공백이 없는 리스트 기호로 시작하는 경우에도 listBlockBaseIndent를 0으로 설정하여 블록 시작
        const isListOrQuote = /^(?:[-*+]\s|(?:\d+)\.\s|>|\s*\[[ xX]?\])/.test(processedLine);
        let suffix = "";
        if (listHasActiveDiv) {
          suffix = "\n\n</div>\n\n";
          listHasActiveDiv = false;
        }
        if (isListOrQuote) {
          listBlockBaseIndent = 0;
        } else {
          listBlockBaseIndent = -1;
        }
        processedLine = suffix + processedLine;
      }
      
      return processedLine;
    }
    
    // 일반 라인을 만나면 리스트 블록 종료
    let suffix = "";
    if (listHasActiveDiv) {
      suffix = "\n\n</div>\n\n";
      listHasActiveDiv = false;
    }
    listBlockBaseIndent = -1;

    const indentMatch = processedLine.match(/^( +)/);
    const lineIndent = indentMatch ? indentMatch[1] : "";
    const remainingText = processedLine.substring(lineIndent.length);
    
    // 💡 [행 시작 들여쓰기 공백/탭 1:1 보존]
    // 마크다운 파서가 4칸 이상의 들여쓰기를 코드 블록으로 오탐하는 것을 방지하면서,
    // 사용자가 입력한 탭(4칸 단위) 및 스페이스 공백을 에디터와 1:1로 정확하게 일치시켜 미리보기에 반영하기 위해 &nbsp;로 변환하여 보존합니다.
    const preservedIndent = lineIndent ? lineIndent.replace(/ /g, '&nbsp;') : "";
    return suffix + preservedIndent + remainingText;
  });

  // Step 2.5: 숫자 목록(Ordered List)의 촘촘한 리스트 간격 및 뭉침 현상 재현을 위해 순서 없는 목록 기호(- ) 강제 주입
  const deorderedLines = correctedLines.map((line, index) => {
    if (codeBlockMask[index]) {
      return line;
    }
    const trimmed = line.trim();

    // 🛡️ [리스트 간 빈 행 분리 및 서브리스트 들여쓰기 보존]:
    // 빈 줄이나 <br>이 나타났을 때:
    // 1) 다음 줄이 들여쓰기(Indent > 0)가 적용된 하위 서브리스트인 경우:
    //    리스트 블록을 닫지 않고 해당 들여쓰기 계층의 onrivi-empty-row 로 빈 행을 렌더링하여 들여쓰기 트리 구조를 100% 보존합니다.
    // 2) 다음 줄이 최상위(들여쓰기 0칸) 리스트이거나 일반 문단인 경우:
    //    앞선 리스트를 닫고 onrivi-list-spacer 로 분리하여 새 리스트가 독립 블록으로 시작되도록 보장합니다.
    const isBlank = trimmed === "" || trimmed === "\u00A0" || /^(?:<br\s*\/?>)$/i.test(trimmed);
    if (isBlank) {
      let prevNonEmpty = "";
      for (let p = index - 1; p >= 0; p--) {
        if (correctedLines[p].trim() !== "") {
          prevNonEmpty = correctedLines[p];
          break;
        }
      }

      let nextNonEmpty = "";
      for (let n = index + 1; n < correctedLines.length; n++) {
        if (correctedLines[n].trim() !== "") {
          nextNonEmpty = correctedLines[n];
          break;
        }
      }

      if (prevNonEmpty && isAnyListLine(prevNonEmpty)) {
        const nextIndent = nextNonEmpty ? getIndentLevel(nextNonEmpty) : 0;

        // 다음 줄이 들여쓰기가 있는 서브리스트인 경우 들여쓰기 계층 보존
        if (nextNonEmpty && isAnyListLine(nextNonEmpty) && nextIndent > 0) {
          const indentSpaces = " ".repeat(nextIndent);
          return `${indentSpaces}- <span aria-hidden="true" class="onrivi-empty-list-row"></span>`;
        }

        // 최상위 리스트 분리 및 독립 블록 보장
        return '<div class="onrivi-list-spacer">&nbsp;</div>';
      }
      return line;
    }

    return line;
  });

  // Step 3: 미리보기용 여유 개행 주입 (formatLineBreaksForPreview) 및 라인 매핑 갱신
  const finalLines: string[] = [];
  const finalLineMap: number[] = [];

  for (let i = 0; i < deorderedLines.length; i++) {
    const curr = deorderedLines[i];
    const origLineNum = expandedLineMap[i];

    // Indented list wrappers can contain several physical lines. Every one
    // needs an entry, otherwise all subsequent list items point to earlier rows.
    for (const physicalLine of curr.split('\n')) {
      finalLines.push(physicalLine);
      finalLineMap.push(origLineNum);
    }

    // Paragraph spacing must never add physical lines inside fenced code.
    if (codeBlockMask[i]) continue;

    if (i < deorderedLines.length - 1) {
      const next = deorderedLines[i + 1];
      
      const isCurrSpecial = /^(?:\s*[-*+]\s|\s*\d+\.\s|\s*#+\s|---|\s*\||\s*\$\$|\s*[①-⑩❶-❿\u2460-\u2469\u2756-\u2767]|!\[|<(?:iframe|video)|\[(?:iframe|video|map):)/.test(curr.trim());
      const isNextSpecial = /^(?:\s*[-*+]\s|\s*\d+\.\s|\s*#+\s|---|\s*\||\s*\$\$|\s*[①-⑩❶-❿\u2460-\u2469\u2756-\u2767]|!\[|<(?:iframe|video)|\[(?:iframe|video|map):)/.test(next.trim());
      
      const getLineIndent = (line: string): string => {
        const processed = line.replace(/\t/g, "  ");
        const match = processed.match(/^( +)/);
        return match ? match[1] : "";
      };
      
      const isListLine = (line: string): boolean => {
        const trimmed = line.trim();
        return isAnyListLine(trimmed);
      };
      
      const currIndent = getLineIndent(curr);
      const nextIndent = getLineIndent(next);
      
      const isCurrEmpty = curr === "" || curr === "\u00A0";
      const isNextEmpty = next === "" || next === "\u00A0";
      const isCurrSpacer = curr === "\u00A0" || curr.includes("onrivi-list-spacer");
      const isNextSpacer = next === "\u00A0" || next.includes("onrivi-list-spacer");
      
      const isNextNewIndent = nextIndent !== "" && currIndent !== nextIndent;
      const isTableToTable = isTableLine(curr) && isTableLine(next);
      const isQuoteToQuote = curr.trim().startsWith(">") && next.trim().startsWith(">");
      const isListToList = isListLine(curr) && isListLine(next);
      
      // onrivi-empty-list-row 태그나 빈 줄 사이, 리스트 아이템 사이에는 추가 빈 줄을 주입하지 않습니다.
      // (단, 문단 사이 공간을 보존하는 onrivi-list-spacer는 일반 문단 사이에 들어오므로 마크다운 파서가 이스케이프 등을 올바르게 인식하도록 뒤에 개행을 허용합니다.)
      const isCurrListRow = curr.includes('onrivi-empty-list-row');
      const isNextListRow = next.includes('onrivi-empty-list-row');

      // 💡 리스트와 spacer 사이, 또는 spacer와 리스트 사이는 마크다운 독립 블록 분리를 위해 빈 줄 주입
      const isListToSpacer = (isListLine(curr) && isNextSpacer) || (isCurrSpacer && isListLine(next)) || (isCurrSpacer && isNextSpacer);
      // A compact imported HTML table must terminate before subsequent Markdown.
      // This separator exists only in preview text; the saved source stays compact.
      const isHtmlTableBoundary = /<\/table>\s*$/i.test(curr) && !isNextEmpty;
      const isQuoteEnd = curr.trim().startsWith('>') && !next.trim().startsWith('>') && !isNextEmpty;

      if (isQuoteEnd || isHtmlTableBoundary || isListToSpacer || (!isTableToTable && !isQuoteToQuote && !isListToList && !isCurrEmpty && !isNextEmpty && !isCurrListRow && !isNextListRow && (isCurrSpecial || isNextSpecial || isNextNewIndent || isCurrSpacer || isNextSpacer))) {
        finalLines.push("");
        finalLineMap.push(origLineNum); // 추가된 빈 줄도 직전 원본 라인 번호에 매핑
      }
    }
  }

  if (listHasActiveDiv) {
    for (const line of ['', '</div>', '', '']) {
      finalLines.push(line);
      finalLineMap.push(expandedLineMap[expandedLineMap.length - 1] || 1);
    }
  }
  const finalText = finalLines.join("\n");

  return {
    text: finalText,
    lineMap: finalLineMap,
    frontmatterLines: frontmatterOffset
  };
}

/**
 * KaTeX 수학 수식에서 그리스 자모 단추와 수식 기호가 칠판 볼드체(Mathematical Bold)로 눈에 띄게 렌더링되도록
 * 실시간으로 LaTeX 수식을 \boldsymbol{...} 문법으로 래핑해 줍니다.
 * @param formula 원본 LaTeX 수식 문자열
 * @returns \boldsymbol{...}로 래핑되어 볼드 렌더링이 보장된 LaTeX 수식 문자열
 */
// ====================================================================
// 📊 [OMD-EDIT-editorUtils-0005] editorUtils.ts ➔ wrapMathWithBold
// 🎯 @KICK  : KaTeX 수식에 \boldsymbol{...} 래핑하여 칠판 볼드체 렌더링 보장
// 🛡️ @GUARD : 이미 \boldsymbol/\mathbf 포함 여부 체크, 빈 문자열 처리
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function wrapMathWithBold(formula: string): string {
  if (!formula) return "";
  
  if (formula.includes("\\boldsymbol") || formula.includes("\\mathbf")) {
    return formula;
  }
  
  return `\\boldsymbol{${formula}}`;
}
