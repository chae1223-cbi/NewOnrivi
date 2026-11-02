/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 프로그램 ID : oaar-footnote-organizer
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-14** — [마크다운 각주 정리(Footnote Organizer) 엔진 전면 고도화]:
 *             1) 본문 등장 순서(Reading Order) 기반 순차 재번호 부여(1, 2, 3...)
 *             2) 영문, 한글, 기호 등 임의 라벨([^참고], [^note])의 표준 숫자화 정규화
 *             3) 본문 곳곳에 흩어진 각주 정의 추출 및 문서 최하단 단일 블록 일괄 결속
 *             4) 다중 인용(동일 각주 다회 참조) 동일 번호 매핑 보존
 *             5) 코드 블록(```...```) 및 인라인 코드(`...`) 내부 구문 오탐지 방어
 *             6) 다중 행/들여쓰기 각주 내용 100% 무손실 보존
 */

export interface FootnoteOrganizeResult {
  text: string;
  count: number;
  changed: boolean;
}

/**
 * 마크다운 문서 내 각주 참조와 정의를 분석하여:
 * 1) 본문 등장 순서대로 1, 2, 3... 순차 번호를 재부여
 * 2) 본문에 흩어진 각주 정의를 수집하여 문서 최하단에 정렬 배치
 * 3) 다중 인용 및 비숫자 라벨([^참고]) 정규화
 */
export function organizeMarkdownFootnotes(markdown: string): FootnoteOrganizeResult {
  if (!markdown || typeof markdown !== 'string') {
    return { text: markdown || '', count: 0, changed: false };
  }

  // 1. YAML Frontmatter 분리 보존
  let frontmatter = '';
  let content = markdown;
  const fmMatch = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (fmMatch) {
    frontmatter = fmMatch[0];
    content = markdown.slice(frontmatter.length);
  }

  // 줄바꿈 정규화 (\r\n -> \n)
  const isCRLF = markdown.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');

  // 2. 각주 정의 수집 및 본문에서 분리
  const lines = normalizedContent.split('\n');
  const bodyLines: string[] = [];
  const definitionsMap = new Map<string, string[]>(); // label -> lines[]
  let currentDef: { label: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const defMatch = line.match(/^\[\^([^\]\r\n]+)\]:[ \t]*(.*)$/);

    if (defMatch) {
      if (currentDef) {
        definitionsMap.set(currentDef.label, currentDef.lines);
      }
      const label = defMatch[1].trim();
      currentDef = { label, lines: [defMatch[2]] };
    } else if (currentDef) {
      // 각주 정의 후속 라인: 들여쓰기된 행 또는 빈 행
      if (line.trim() === '' || /^[ \t]{2,}/.test(line) || /^\t/.test(line)) {
        currentDef.lines.push(line);
      } else {
        // 들여쓰기 없는 새 본문 라인 출현 시 정의 블록 종료
        definitionsMap.set(currentDef.label, currentDef.lines);
        currentDef = null;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  if (currentDef) {
    definitionsMap.set(currentDef.label, currentDef.lines);
    currentDef = null;
  }

  const bodyText = bodyLines.join('\n');

  // 3. 코드 블록 및 인라인 코드 마스킹 (오탐지 방지)
  const codeSnippets: string[] = [];
  const maskedBody = bodyText
    .replace(/(```|~~~)[a-zA-Z0-9_-]*\r?\n[\s\S]*?\r?\n\1/g, match => {
      codeSnippets.push(match);
      return `\u0000CODEBLOCK_${codeSnippets.length - 1}\u0000`;
    })
    .replace(/`[^`\r\n]+`/g, match => {
      codeSnippets.push(match);
      return `\u0000CODEBLOCK_${codeSnippets.length - 1}\u0000`;
    });

  // 4. 본문 내 각주 참조 스캔 (순서대로 라벨 수집 및 매핑)
  // [^label] 뒤에 콜론(:)이 오지 않는 참조만 수집
  const refRegex = /\[\^([^\]\r\n]+)\](?!\:)/g;
  const orderedLabels: string[] = [];
  const labelToNewIndex = new Map<string, number>();

  let refMatch: RegExpExecArray | null;
  while ((refMatch = refRegex.exec(maskedBody)) !== null) {
    const label = refMatch[1].trim();
    if (!labelToNewIndex.has(label)) {
      const newNum = orderedLabels.length + 1;
      labelToNewIndex.set(label, newNum);
      orderedLabels.push(label);
    }
  }

  // 5. 본문에는 없지만 정의만 남아있는 고아 각주(Orphan) 처리
  // 데이터 유실 방지를 위해 본문 뒤에 순차 번호로 안전하게 보존
  definitionsMap.forEach((_lines, oldLabel) => {
    if (!labelToNewIndex.has(oldLabel)) {
      const newNum = orderedLabels.length + 1;
      labelToNewIndex.set(oldLabel, newNum);
      orderedLabels.push(oldLabel);
    }
  });

  if (orderedLabels.length === 0 && definitionsMap.size === 0) {
    return { text: markdown, count: 0, changed: false };
  }

  // 6. 본문 내 각주 참조 치환 (충돌 방지를 위한 2단계 토큰 치환)
  // 1단계: [^oldLabel] -> \u0000FN_${newNum}\u0000
  let updatedBody = maskedBody.replace(/\[\^([^\]\r\n]+)\](?!\:)/g, (fullMatch, label) => {
    const trimmedLabel = label.trim();
    const newNum = labelToNewIndex.get(trimmedLabel);
    return newNum ? `\u0000FN_${newNum}\u0000` : fullMatch;
  });

  // 2단계: \u0000FN_${newNum}\u0000 -> [^${newNum}]
  updatedBody = updatedBody.replace(/\u0000FN_(\d+)\u0000/g, (_m, num) => `[^${num}]`);

  // 마스킹된 코드 복원
  for (let i = 0; i < codeSnippets.length; i++) {
    updatedBody = updatedBody.replace(`\u0000CODEBLOCK_${i}\u0000`, codeSnippets[i]);
  }

  // 7. 각주 정의 블록 재구성
  const orderedDefinitions: string[] = [];
  for (let i = 0; i < orderedLabels.length; i++) {
    const oldLabel = orderedLabels[i];
    const newNum = i + 1;
    const defLines = definitionsMap.get(oldLabel);

    if (defLines && defLines.length > 0) {
      // 후행 빈 줄 정리
      const cleanLines = [...defLines];
      while (cleanLines.length > 1 && cleanLines[cleanLines.length - 1].trim() === '') {
        cleanLines.pop();
      }
      const firstLine = cleanLines[0];
      const remainingLines = cleanLines.slice(1);
      
      let defText = `[^${newNum}]: ${firstLine}`;
      if (remainingLines.length > 0) {
        defText += '\n' + remainingLines.join('\n');
      }
      orderedDefinitions.push(defText);
    } else {
      orderedDefinitions.push(`[^${newNum}]: `);
    }
  }

  // 8. 본문과 각주 블록 병합
  const hadTrailingNewline = markdown.endsWith('\n');
  const cleanBodyText = updatedBody.trimEnd();
  let resultText = cleanBodyText;
  if (orderedDefinitions.length > 0) {
    resultText = cleanBodyText
      ? `${cleanBodyText}\n\n${orderedDefinitions.join('\n')}`
      : `${orderedDefinitions.join('\n')}`;
  }
  if (hadTrailingNewline) {
    resultText += '\n';
  }

  if (frontmatter) {
    resultText = frontmatter + (resultText.startsWith('\n') ? resultText.slice(1) : resultText);
  }

  const finalFormatted = isCRLF ? resultText.replace(/\n/g, '\r\n') : resultText;

  return {
    text: finalFormatted,
    count: orderedLabels.length,
    changed: finalFormatted !== markdown
  };
}
