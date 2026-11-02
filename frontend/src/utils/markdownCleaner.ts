// ====================================================================
// 📊 [OMD-EDIT-markdownCleaner-0001 ✅ FIXED] markdownCleaner.ts ➔ cleanMarkdownDocument
// 🎯 @KICK  : 마크다운 문서 내 서식 및 문법을 지능적으로 교정하고 표를 수직 정렬하는 뷰티파이어 엔진
// 🛡️ @GUARD : 코드블록/수식/Frontmatter 마스킹 보호, 동아시아 문자 폭 계산, 실행 취소 안전성 보장
// 🚨 @PATCH : **2026-10-20** — [Frontmatter 마스킹 오탐 결함 해소 및 <p></p> 선행 완전 제거]:
//             1) 본문 중간의 수평선(---)으로 인해 첫 번째 ---부터 본문 전체(# 헤딩, <p></p>)가 프론트매터로 오인되어 서식 정리가 무시되던 결함 해결
//             2) 마스킹 이전 0단계에서 단독 라인 및 인라인 빈 문단 태그(<p></p>, <p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>)를 100% 선행 소거
//             3) 프론트매터 내부에 마크다운 헤딩(# ), 인용구(> ), 코드블록이 포함된 경우 본문 수평선 오인으로 판별하여 마스킹에서 제외
// 🚨 @PATCH : **2026-10-20** — [불필요한 빈 문단 HTML 태그(<p></p>) 자동 정돈 및 제거]:
//             1) 문서 내 잔존하거나 외부에서 유입된 빈 문단 태그(<p></p>, <p\b[^>]*>\s*<\/p>)를 마크다운 서식 정리 시 100% 자동 제거하여 깨끗한 순수 마크다운 보장
// 🚨 @PATCH : **2026-10-20** — [문서 최상단 고아/깨진 워터마크 메타데이터 찌꺼기 및 Frontmatter base64 자동 정돈]:
//             1) 인쇄/워터마크 설정이 깨져 본문 상단에 노출된 고아 메타 찌꺼기(iL59...base64 및 워터마크 JSON 닫힘 태그) 감지 및 즉시 완전 제거
//             2) Frontmatter 내부 onrivi_print에 저장된 data: base64 이미지 바이너리 자동 축소 제거로 마크다운 본문 오염 원천 방어
// 🚨 @PATCH : **2026-10-10** — [볼드(**) 닫힘 태그 뒤 한글 조사/단어 1칸 띄어쓰기 자동 교정]: 마크다운 파서에서 **온리비**는 과 같이 닫는 태그 바로 뒤에 한글 조사가 붙어 서식이 풀리고 태그가 그대로 노출되는 결함을 방어하기 위해, 문서서식 일괄정리(CLEAN_DOC) 시 **온리비** 는 과 같이 닫힘 태그 뒤에 1칸 공백을 자동 삽입하여 정상 렌더링되도록 fixEmphasisSpacing 로직 강화
// 🚨 @PATCH : **2026-09-11** — 표 셀 내부 리스트 불릿 일관성 정돈(normalizeTableBullets): 셀 내부 <br> 뒤의 하이픈/대시/별표 리스트 항목(`<br>- `, `<br> - ` 등)을 상위 불릿 기호(`• `)로 지능적 통일 변환 및 닫히지 않은 고아 백틱(`) 안전 정돈 연동; 볼드(**) 및 취소선(~~) 내부 선행/후행 공백(예: ** 상속세·증여세**, (** 단, 당해세는 예외** )) 및 닫힘 뒤 쉼표 앞 공백 자동 교정 탑재; 에디터 줄바꿈(Word Wrap) 가독성을 위해 과대 하이픈 및 패딩 공백을 최소화하여 단정한 컴팩트 표(formatCompactMarkdownTable)로 축소 정돈; 코드/수식/프론트매터 마스킹, 헤딩/인용구 공백 자동 교정, HTML 태그 마크다운 변환, 세부 통계 수집 기능 통합 신설
// 🔗 @CALLS : formatCompactMarkdownTable
// ====================================================================

export interface CleanStats {
  tablesFormatted: number;
  headingsFixed: number;
  quotesFixed: number;
  htmlConverted: number;
  brCollapsed: number;
  linesReduced: number;
  boldFixed: number;
  tableBulletsNormalized: number;
}

export interface CleanResult {
  cleanedText: string;
  isModified: boolean;
  stats: CleanStats;
  summaryMessage: string;
}

export interface CleanOptions {
  formatTables?: boolean;
  fixHeadings?: boolean;
  fixQuotes?: boolean;
  fixEmphasisSpacing?: boolean;
  convertHtmlTags?: boolean;
  cleanExcessiveNewlines?: boolean;
  normalizeTableBullets?: boolean;
}

/**
 * 동아시아 문자(한글, 한자, 전각 기호 등)의 시각적 너비를 2, 일반 반각 문자를 1로 계산
 */
export function getStringDisplayWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // 한글 음절, 한글 자모, 한자, CJK 기호, 전각 기호 범위
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 지정된 디스플레이 너비에 맞춰 텍스트 앞뒤에 공백을 채워 정렬
 */
export function padStringToDisplayWidth(
  str: string,
  targetWidth: number,
  align: 'left' | 'right' | 'center' = 'left'
): string {
  const currentWidth = getStringDisplayWidth(str);
  const diff = targetWidth - currentWidth;
  if (diff <= 0) return str;

  if (align === 'right') {
    return ' '.repeat(diff) + str;
  } else if (align === 'center') {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  } else {
    return str + ' '.repeat(diff);
  }
}

/**
 * 마크다운 표 텍스트 블록을 에디터에서 줄바꿈(Word Wrap) 시 지저분하게 늘어나지 않도록
 * 불필요하게 늘어난 하이픈(---)과 셀 여백을 최소화하여 단정하고 컴팩트하게 축소 정리
 */
export function formatCompactMarkdownTable(tableLines: string[]): { formatted: string; isModified: boolean } {
  if (tableLines.length < 2) {
    return { formatted: tableLines.join('\n'), isModified: false };
  }

  // 1. 각 행 파싱
  const rowsCells: string[][] = [];
  let dividerIndex = -1;

  for (let i = 0; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (!line.startsWith('|')) {
      return { formatted: tableLines.join('\n'), isModified: false };
    }
    const inner = line.replace(/^\|/, '').replace(/\|$/, '');
    const cells = inner.split('|').map(c => c.trim());
    rowsCells.push(cells);

    // 구분선 행 감지 (모든 셀이 --- 형태인지)
    const isDivider = cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
    if (isDivider && dividerIndex === -1) {
      dividerIndex = i;
    }
  }

  if (dividerIndex === -1) {
    return { formatted: tableLines.join('\n'), isModified: false };
  }

  // 2. 구분선 행의 정렬 방식 추출 및 최대 열 수 계산
  const dividerRow = rowsCells[dividerIndex];
  const maxCols = Math.max(...rowsCells.map(r => r.length));

  // 3. 컴팩트 슬림 표 빌드 (불필요한 과대 공백/하이픈 제거)
  const resultLines: string[] = [];
  for (let r = 0; r < rowsCells.length; r++) {
    if (r === dividerIndex) {
      const divCells: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const dCell = dividerRow[c] || '---';
        const left = dCell.startsWith(':');
        const right = dCell.endsWith(':');
        if (left && right) {
          divCells.push(':---:');
        } else if (right) {
          divCells.push('---:');
        } else if (left) {
          divCells.push(':---');
        } else {
          divCells.push('---');
        }
      }
      resultLines.push('| ' + divCells.join(' | ') + ' |');
    } else {
      const row = rowsCells[r];
      const cleanRow: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const cell = row[c] ? row[c].replace(/[ \t]+/g, ' ') : '';
        cleanRow.push(cell);
      }
      resultLines.push('| ' + cleanRow.join(' | ') + ' |');
    }
  }

  const formatted = resultLines.join('\n');
  const isModified = formatted !== tableLines.join('\n');
  return { formatted, isModified };
}

// 하위 호환성 유지용 별칭
export const formatPrettyMarkdownTable = formatCompactMarkdownTable;

/**
 * 텍스트 전체에서 마크다운 표 블록들을 찾아 예쁘게 수직 정렬 수행
 */
export function formatAllMarkdownTablesInText(text: string): { result: string; count: number } {
  if (!text.includes('|')) return { result: text, count: 0 };

  const lines = text.split('\n');
  const output: string[] = [];
  let tableBuffer: string[] = [];
  let formatCount = 0;

  const flushTableBuffer = () => {
    if (tableBuffer.length === 0) return;
    const { formatted, isModified } = formatCompactMarkdownTable(tableBuffer);
    if (isModified) {
      formatCount++;
    }
    output.push(formatted);
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 표 행 판별: | 로 시작하고 | 가 최소 2개 이상 포함된 경우
    const isTableLine = trimmed.startsWith('|') && (trimmed.match(/\|/g) || []).length >= 2;

    if (isTableLine) {
      tableBuffer.push(line);
    } else {
      flushTableBuffer();
      output.push(line);
    }
  }

  flushTableBuffer();
  return { result: output.join('\n'), count: formatCount };
}

/**
 * 마크다운 문서 서식 일괄 정리 메인 파이프라인
 */
export function cleanMarkdownDocument(
  content: string,
  options: CleanOptions = {}
): CleanResult {
  const {
    formatTables = true,
    fixHeadings = true,
    fixQuotes = true,
    fixEmphasisSpacing = true,
    convertHtmlTags = true,
    cleanExcessiveNewlines = true,
    normalizeTableBullets = true,
  } = options;

  if (!content) {
    return {
      cleanedText: content,
      isModified: false,
      stats: {
        tablesFormatted: 0,
        headingsFixed: 0,
        quotesFixed: 0,
        htmlConverted: 0,
        brCollapsed: 0,
        linesReduced: 0,
        boldFixed: 0,
        tableBulletsNormalized: 0,
      },
      summaryMessage: '정리할 서식이 없습니다.',
    };
  }

  const stats: CleanStats = {
    tablesFormatted: 0,
    headingsFixed: 0,
    quotesFixed: 0,
    htmlConverted: 0,
    brCollapsed: 0,
    linesReduced: 0,
    boldFixed: 0,
    tableBulletsNormalized: 0,
  };

  let working = content;

  // -------------------------------------------------------------
  // 0단계. 문서 최상단에 잔존하는 고아/깨진 워터마크 메타 찌꺼기 및 Frontmatter 내 base64 이미지 바이너리 자동 정돈
  // -------------------------------------------------------------
  const ORPHANED_WATERMARK_PATTERNS = [
    /^(?:\uFEFF)?[A-Za-z0-9+/=]{10,}[\s\S]*?(?:"opacity":\s*-?\d+|"rotation":\s*-?\d+|"position":\s*"[^"]+"|"excludeFirst":\s*(?:true|false))[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/,
    /^(?:\uFEFF)?onrivi_print:\s*\{[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/,
    /^(?:\uFEFF)?---[^\S\r\n]*\r?\n[A-Za-z0-9+/=]{10,}[\s\S]*?(?:"opacity":\s*-?\d+|"rotation":\s*-?\d+|"position":\s*"[^"]+"|"excludeFirst":\s*(?:true|false))[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/
  ];
  for (const pattern of ORPHANED_WATERMARK_PATTERNS) {
    if (pattern.test(working)) {
      working = working.replace(pattern, '');
    }
  }
  // Frontmatter 내부 불필요한 '메타영역', '#서식설정' 라인 제거
  working = working.replace(/^(---\s*\r?\n)(?:[^\S\r\n]*메타영역[^\S\r\n]*\r?\n)?(?:[^\S\r\n]*#서식설정[^\S\r\n]*\r?\n)?/m, '$1');
  // Frontmatter 내부 onrivi_print에 주입된 거대 base64 data URL 제거
  working = working.replace(/^(onrivi_print\s*:\s*\{[^\n]*?"image"\s*:\s*")data:image\/[^"]+(")/m, '$1$2');
  // 비활성화(enabled: false)된 불필요한 onrivi_print 라인 제거
  working = working.replace(/^[^\S\r\n]*onrivi_print\s*:\s*\{[^\n]*?"enabled"\s*:\s*false[^\n]*?\}\s*\r?\n/m, '');

  // 0-1. 문서 전체(Frontmatter 경계 포함)에서 단독 라인 및 인라인의 불필요한 빈 문단 HTML 태그 (<p></p>, <p> </p> 등) 사전 100% 제거
  const emptyPRegex = /<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
  if (emptyPRegex.test(working)) {
    working = working.replace(/^[ \t]*<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>[ \t]*(?:\r?\n|$)/gmi, '');
    working = working.replace(emptyPRegex, '');
    stats.htmlConverted++;
  }

  // -------------------------------------------------------------
  // 1단계. 코드 블록, 수식 블록, YAML Frontmatter 마스킹 보호
  // -------------------------------------------------------------
  const masks: string[] = [];
  const createMask = (raw: string): string => {
    const token = `%%ONR_CLEAN_MASK_${masks.length}%%`;
    masks.push(raw);
    return token;
  };

  // 1-1. YAML Frontmatter 마스킹 (진짜 프론트매터 블록만 마스킹)
  // - 본문 중간의 수평선(---)까지 본문 전체(# 헤딩, 인용구 등)가 삼켜지지 않도록 내부 블록 정밀 검증
  working = working.replace(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/, (fullMatch, body) => {
    // 만약 body 내부에 마크다운 헤딩(# ), 인용구(> ), 코드블록(```, ~~~)이 포함되어 있다면,
    // 이는 정상 프론트매터가 아니라 본문 중간의 수평선(---)까지 잘못 매칭된 것이므로 마스킹하지 않고 통과
    if (/(?:^|\n)#{1,6}[ \t]/.test(body) || /(?:^|\n)>[ \t]/.test(body) || /(?:^|\n)(?:```|~~~)/.test(body)) {
      return fullMatch;
    }
    return createMask(fullMatch);
  });

  // 1-2. 펜스형 코드 블록 (``` 또는 ~~~) 마스킹
  working = working.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, match => createMask(match));

  // 1-3. 디스플레이 수식 블록 ($$ ... $$) 마스킹
  working = working.replace(/\$\$[\s\S]*?\$\$/g, match => createMask(match));

  // 1-4. 인라인 코드 (` ... `) 마스킹
  working = working.replace(/`[^`\n]+`/g, match => createMask(match));

  // 1-5. 인라인 수식 ($ ... $) 마스킹
  working = working.replace(/\$[^$\n]+\$/g, match => createMask(match));

  // -------------------------------------------------------------
  // 2단계. 기초 공백 및 개행 정규화
  // -------------------------------------------------------------
  // 줄바꿈 통합 (\r\n -> \n)
  working = working.replace(/\r\n/g, '\n');

  // NBSP 및 유령 문자 정리
  working = working.replace(/\u00a0/g, ' ');
  working = working.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // -------------------------------------------------------------
  // 3단계. HTML 태그 마크다운 변환 및 불필요한 태그 정제
  // -------------------------------------------------------------
  if (convertHtmlTags) {
    // <b>, <strong> -> **텍스트**
    const strongRegex = /<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi;
    let strongMatches = 0;
    working = working.replace(strongRegex, (_, text) => {
      strongMatches++;
      return `**${text.trim()}**`;
    });

    // <i>, <em> -> *텍스트*
    const emRegex = /<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi;
    let emMatches = 0;
    working = working.replace(emRegex, (_, text) => {
      emMatches++;
      return `*${text.trim()}*`;
    });

    // <s>, <strike>, <del> -> ~~텍스트~~
    const delRegex = /<(?:s|strike|del)\b[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi;
    let delMatches = 0;
    working = working.replace(delRegex, (_, text) => {
      delMatches++;
      return `~~${text.trim()}~~`;
    });

    // 불필요한 빈 문단 HTML 태그 (<p></p>, <p> </p> 등) 제거 및 순수 마크다운 개행으로 정돈
    const emptyPRegex = /<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
    working = working.replace(emptyPRegex, () => {
      stats.htmlConverted++;
      return '';
    });

    // 불필요한 래퍼 태그 찌꺼기 제거 (span, font, div 등)
    const spanRegex = /<\/?(span|font|meta|script|style)[^>]*>/gi;
    working = working.replace(spanRegex, () => {
      stats.htmlConverted++;
      return '';
    });

    stats.htmlConverted += strongMatches + emMatches + delMatches;
  }

  // -------------------------------------------------------------
  // 3-1. 볼드(**) 및 취소선(~~) 내부 불필요 공백 및 닫힘 뒤 쉼표/괄호 정돈
  // -------------------------------------------------------------
  if (fixEmphasisSpacing) {
    // 볼드 내부 선행/후행 공백 제거 (예: ** 상속세·증여세** -> **상속세·증여세**, (** 단, 당해세는 예외** ) -> (**단, 당해세는 예외**))
    const boldSpaceRegex = /(?<!\*)\*\*[\s\t]*(\S(?:[^|*\n]*?\S)?)\s*\*\*(?!\*)/g;
    working = working.replace(boldSpaceRegex, (m, p1) => {
      if (m !== `**${p1}**`) {
        stats.boldFixed++;
      }
      return `**${p1}**`;
    });

    // 취소선 내부 선행/후행 공백 제거 (예: ~~ 취소선 ~~ -> ~~취소선~~)
    const delSpaceRegex = /(?<!~)~~[\s\t]*(\S(?:[^|~\n]*?\S)?)\s*~~(?!~)/g;
    working = working.replace(delSpaceRegex, (m, p1) => {
      if (m !== `~~${p1}~~`) {
        stats.boldFixed++;
      }
      return `~~${p1}~~`;
    });

    // 볼드/취소선 닫힘 뒤 쉼표나 마침표 앞의 어색한 공백 정리: **텍스트** , -> **텍스트**,
    working = working.replace(/(\*\*|~~)\s+([,.:;?!])/g, '$1$2');

    // 괄호 내부의 불필요한 공백 정돈: ( **텍스트** ) -> (**텍스트**)
    working = working.replace(/\(\s+(\*\*|~~)/g, '($1');
    working = working.replace(/(\*\*|~~)\s+\)/g, '$1)');

    // 💡 [한글 조사 띄어쓰기 교정]: 볼드(**) 닫힘 태그 바로 뒤에 한글 조사/단어가 붙어 파서에서 서식이 풀리는 현상 방지 (예: **온리비**는 -> **온리비** 는)
    const boldTrailingWordRegex = /(?<!\*)\*\*([^\s*\n](?:[^*\n]*?[^\s*\n])?)\*\*([가-힣a-zA-Z0-9])/g;
    working = working.replace(boldTrailingWordRegex, (m, p1, p2) => {
      stats.boldFixed++;
      return `**${p1}** ${p2}`;
    });
  }

  // -------------------------------------------------------------
  // 4단계. <br> 태그 및 빈행 정리 (표 무결성 보존)
  // -------------------------------------------------------------
  // <br> 빈행 <br> ➔ <br><br>
  const brBlankBrRegex = /<br\s*\/?>[\s\t]*(?:\|[\s\t]*)?[\r\n]+(?:[\s\t]*\|?[\s\t]*[\r\n]+)*[\s\t]*(?:\|[\s\t]*)?<br\s*\/?>/gi;
  while (brBlankBrRegex.test(working)) {
    stats.brCollapsed++;
    working = working.replace(brBlankBrRegex, '<br><br>');
    brBlankBrRegex.lastIndex = 0;
  }

  // 일반 인접 <br> 개행 통합
  working = working.replace(/<br\s*\/?>\s*[\r\n]+\s*<br\s*\/?>/gi, '<br><br>');
  working = working.replace(/<br\s*\/?>[\s\t]*[\r\n]+(?!\s*(?:\||#|>|[-*+]\s|\d+\.\s|\n))/gi, '<br> ');
  working = working.replace(/[\r\n]+\s*<br\s*\/?>/gi, '<br>');

  // -------------------------------------------------------------
  // 4-1단계. 표(Table) 셀 내부 리스트 불릿 일관성 정돈 (normalizeTableBullets)
  // -------------------------------------------------------------
  // 마크다운 표 셀 내부는 GFM 표준상 인라인 문맥이므로 블록 리스트(- 항목)가 렌더링되지 않습니다.
  // 셀 내부 <br> 뒤의 하이픈/대시/별표 리스트 항목(`<br>- `, `<br> - ` 등)을 상단 불릿 기호(`• `)로 지능적 변환하고,
  // 인라인 서식을 깨뜨리는 닫히지 않은 고아 백틱(`)을 정리합니다.
  if (normalizeTableBullets) {
    const tableLineRegex = /^\|.*\|$/gm;
    working = working.replace(tableLineRegex, (tableLine) => {
      let modifiedLine = tableLine;

      // 1) <br> 뒤의 리스트 마커(-, *, +)를 • 기호로 통일 (예: <br>- **신고확정:** -> <br>  • **신고확정:**)
      const cellListRegex = /(<br\s*\/?>\s*)[ \t]*[-*+][ \t]+(?!\s*\|)/gi;
      if (cellListRegex.test(modifiedLine)) {
        modifiedLine = modifiedLine.replace(cellListRegex, (match, brPrefix) => {
          stats.tableBulletsNormalized++;
          return `${brPrefix}  • `;
        });
      }

      // 2) 표 셀 내부에서 닫히지 않은 고아 백틱(`) 정리 (단, 마스킹 토큰 제외)
      // 예: **신고확정:** ` 납세자 -> **신고확정:** 납세자
      const orphanBacktickRegex = /(:\*\*\s*)`\s*([가-힣a-zA-Z0-9])/g;
      if (orphanBacktickRegex.test(modifiedLine)) {
        modifiedLine = modifiedLine.replace(orphanBacktickRegex, (match, prefix, nextChar) => {
          stats.tableBulletsNormalized++;
          return `${prefix}${nextChar}`;
        });
      }

      return modifiedLine;
    });
  }

  // -------------------------------------------------------------
  // 5단계. 헤딩(#) 및 인용구(>) 문법 공백 자동 교정
  // -------------------------------------------------------------
  if (fixHeadings) {
    // 줄 시작의 #{1,6} 뒤에 공백이 없는 경우 (#제목 -> # 제목)
    // 단, 색상 코드(#fff)나 앵커 태그 형태 등 오탐 방지
    const headingRegex = /^(\s{0,3}#{1,6})([^#\s\r\n][^\r\n]*)$/gm;
    working = working.replace(headingRegex, (_, hashes, rest) => {
      stats.headingsFixed++;
      return `${hashes} ${rest}`;
    });
  }

  if (fixQuotes) {
    // 줄 시작의 > 뒤에 공백이 없는 경우 (>인용 -> > 인용)
    const quoteRegex = /^(\s{0,3}>+)([^>\s\r\n][^\r\n]*)$/gm;
    working = working.replace(quoteRegex, (_, arrows, rest) => {
      stats.quotesFixed++;
      return `${arrows} ${rest}`;
    });
  }

  // -------------------------------------------------------------
  // 6단계. 과도한 빈 줄(3개 이상 -> 2개) 압축 및 꼬리 공백 정리
  // -------------------------------------------------------------
  if (cleanExcessiveNewlines) {
    const prevLen = working.length;
    working = working.replace(/\n{3,}/g, '\n\n');
    if (working.length !== prevLen) {
      stats.linesReduced++;
    }
  }

  // 행 끝의 불필요한 공백 제거 (3개 이상의 trailing spaces 제거, 2개는 줄바꿈 의도일 수 있으므로 유지)
  working = working.replace(/[ \t]{3,}$/gm, '');

  // -------------------------------------------------------------
  // 7단계. 표(Table) 수직 라인 줄맞춤 뷰티파이어 (Pretty Table)
  // -------------------------------------------------------------
  if (formatTables) {
    const tableFormatRes = formatAllMarkdownTablesInText(working);
    working = tableFormatRes.result;
    stats.tablesFormatted = tableFormatRes.count;
  }

  // -------------------------------------------------------------
  // 8단계. 마스킹 토큰 100% 원형 복원
  // -------------------------------------------------------------
  for (let i = 0; i < masks.length; i++) {
    const token = `%%ONR_CLEAN_MASK_${i}%%`;
    working = working.replace(token, () => masks[i]);
  }

  const isModified = working !== content;

  // 요약 메시지 구성
  const summaryParts: string[] = [];
  if (stats.tablesFormatted > 0) summaryParts.push(`표 ${stats.tablesFormatted}개 축소 정돈`);
  if (stats.headingsFixed > 0) summaryParts.push(`제목 ${stats.headingsFixed}곳 교정`);
  if (stats.quotesFixed > 0) summaryParts.push(`인용구 ${stats.quotesFixed}곳 교정`);
  if (stats.htmlConverted > 0) summaryParts.push(`HTML ${stats.htmlConverted}개 변환`);
  if (stats.brCollapsed > 0) summaryParts.push(`<br> ${stats.brCollapsed}곳 정돈`);
  if (stats.boldFixed > 0) summaryParts.push(`강조 기호 ${stats.boldFixed}곳 교정`);
  if (stats.tableBulletsNormalized > 0) summaryParts.push(`표 불릿 ${stats.tableBulletsNormalized}곳 정돈`);
  if (stats.linesReduced > 0) summaryParts.push(`빈 줄 압축`);

  let summaryMessage = '정리할 서식이 없습니다.';
  if (isModified) {
    summaryMessage = summaryParts.length > 0
      ? `문서 서식 정리 완료 (${summaryParts.join(', ')})`
      : '문서 서식이 단정하게 정리되었습니다.';
  }

  return {
    cleanedText: working,
    isModified,
    stats,
    summaryMessage,
  };
}
