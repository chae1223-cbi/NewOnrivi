// @ts-nocheck
import { FileNode } from '@/lib/indexedDbHelper';

// ====================================================================
// 📊 [OMD-EDIT-pasteHandlers-0003 ✅ FIXED] pasteHandlers ➔ sanitizePastedText
// 🎯 @KICK  : 붙여넣기 문자열을 마크다운에 적합하도록 정제한다
// 🛡️ @GUARD : 줄바꿈 통일, 유령 문자 제거, HTML 찌꺼기 제거, TSV 자동 변환
// 🚨 @PATCH : **2026-09-11** — 표 및 본문에서 <br> 빈행 <br> 구문(개행, 공백 빈행, 파이프 줄바꿈 등)을 단정한 <br><br>로 일괄 치환하여 표 파괴 방지 및 새 행 오병합 방어 패치 | 2026-08-26 - /cleandoc 구동 시 문서 내 마크다운 표(Table)의 기형적 하이픈 구분선 및 빈 셀 공백을 깨끗하게 정리해 주는 formatMarkdownTables 로직 추가 적용 | NBSP(\u00a0) → 일반 공백 치환 추가 (Mermaid 컴파일러 호환성) | 2026-06-18
// 🔗 @CALLS : formatMarkdownTables
// ====================================================================
/**
 * [ONR-15-001] sanitizePastedText 함수 (추출된 유틸리티)
 * @description 붙여넣기된 문자열에 대해 줄바꿈 통일, 특수문자 제거, 불필요한 HTML 태그 정리 등 마크다운에 적합한 데이터로 정제합니다.
 * @param text 원본 붙여넣기 텍스트
 * @param skipTsvConversion TSV 표 변환 로직을 우회할지 여부
 * @returns 위생 가공된 결과 텍스트
 */
export const sanitizePastedText = (text: string, skipTsvConversion = false) => {
  let sanitized = text;

  // 1. 운영체제 간 줄바꿈 차이 통합 (\r\n -> \n)
  sanitized = sanitized.replace(/\r\n/g, '\n');

  // 2. NBSP(줄바꿈 없는 공백) → 일반 공백으로 변환 (Mermaid 컴파일러 호환성)
  sanitized = sanitized.replace(/\u00a0/g, ' ');

  // 3. 눈에 보이지 않는 유령 문자(Zero-width space 등) 제거
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 4. 웹 복사 시 자주 딸려오는 지저분한 HTML 태그 찌꺼기 제거 (마크다운 포맷팅 방해 요소)
  sanitized = sanitized.replace(/<\/?(span|div|font|style|script|meta)[^>]*>/gi, '');

  // 5. 표 등에서 줄바꿈이 파괴되지 않도록 <br>과 섞인 실제 줄바꿈(\n)을 제거하고 <br>로 통일합니다.
  // 💡 [<br> 빈행 <br> 처리] 표 및 본문에서 <br> 태그 사이에 빈 줄(개행, 공백, 빈 파이프 행 등)이 끼어 표가 깨지는 현상을 방지하고 <br><br>로 일괄 통합
  const brBlankBrRegex = /<br\s*\/?>[\s\t]*(?:\|[\s\t]*)?[\r\n]+(?:[\s\t]*\|?[\s\t]*[\r\n]+)*[\s\t]*(?:\|[\s\t]*)?<br\s*\/?>/gi;
  while (brBlankBrRegex.test(sanitized)) {
    sanitized = sanitized.replace(brBlankBrRegex, '<br><br>');
    brBlankBrRegex.lastIndex = 0;
  }
  sanitized = sanitized.replace(/<br\s*\/?>\s*[\r\n]+\s*<br\s*\/?>/gi, '<br><br>');
  sanitized = sanitized.replace(/<br\s*\/?>[\s\t]*[\r\n]+(?!\s*(?:\||#|>|[-*+]\s|\d+\.\s|\n))/gi, '<br> ');
  sanitized = sanitized.replace(/[\r\n]+\s*<br\s*\/?>/gi, '<br>');

  // 불필요한 다중 줄바꿈 정리 (3개 이상의 줄바꿈을 2개로)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 6. 완성된 강조 구문의 닫힘 태그 뒤에 글자가 붙은 경우에만 띄웁니다.
  // 여는 ** 앞에 따옴표가 있어도 "**Then** 을 "** Then** 로 훼손하지 않습니다.
  sanitized = sanitized.replace(/(?<!\*)\*\*[^*\n]+\*\*(?=[^\s*])/g, '$& ')
    .replace(/(?<!_)__[^_\n]+__(?=[^\s_])/g, '$& ')
    .replace(/(?<!~)~~[^~\n]+~~(?=[^\s~])/g, '$& ');

  // Auto-convert TSV to Markdown Table
  if (!skipTsvConversion && sanitized.includes('\t') && sanitized.includes('\n') && !sanitized.includes('|')) {
    const lines = sanitized.split('\n');
    const isTable = lines.some(line => line.includes('\t'));

    if (isTable) {
      const mdLines = lines.map((line, index) => {
        if (!line.trim()) return line;
        const cells = line.split('\t').map(cell => cell.trim());
        const row = '| ' + cells.join(' | ') + ' |';

        if (index === 0) {
          const separator = '|' + cells.map(() => '---').join('|') + '|';
          return row + '\n' + separator;
        }
        return row;
      });
      sanitized = mdLines.join('\n');
    }
  }

  sanitized = formatMarkdownTables(sanitized);
  return sanitized;
};

// ====================================================================
// 📊 [OMD-EDIT-pasteHandlers-0002] pasteHandlers ➔ fixMarkdownTable
// 🎯 @KICK  : 여러 줄로 쪼개진 마크다운 표 셀을 한 행으로 병합하여 보정한다
// 🛡️ @GUARD : text에 '|'가 없으면 early return, 현재 행이 '|'로 끝날 때까지 병합
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-002] fixMarkdownTable 함수 (추출된 유틸리티)
 * @description 여러 줄로 쪼개진 마크다운 표 셀 데이터를 한 행으로 강제 병합하여 정합성 있는 마크다운 표 형태로 보정합니다.
 * @param text 보정 대상 마크다운 표 텍스트
 * @returns 정돈된 마크다운 표 텍스트
 */
export const fixMarkdownTable = (text: string) => {
  if (!text.includes('|')) return text;

  const lines = text.split('\n');
  const result: string[] = [];
  let currentRow = '';
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inTable && trimmed.startsWith('|')) {
      inTable = true;
    }

    if (inTable) {
      if (trimmed === '' && currentRow === '') {
        inTable = false;
        result.push(line);
        continue;
      }

      if (currentRow === '') {
        currentRow = line;
      } else {
        if (trimmed === '') {
          currentRow += ' ';
        } else {
          if (!currentRow.trim().endsWith(' ')) {
            currentRow += ' ';
          }
          currentRow += line;
        }
      }

      if (currentRow.trim().endsWith('|')) {
        result.push(currentRow);
        currentRow = '';
      }
    } else {
      result.push(line);
    }
  }

  if (currentRow !== '') {
    result.push(currentRow);
  }

  return result.join('\n');
};

// ====================================================================
// 📊 [OMD-EDIT-pasteHandlers-0001] pasteHandlers ➔ parseHtmlTableToMarkdown
// 🎯 @KICK  : HTML <table> 구문을 표준 마크다운 표 형식으로 변환한다
// 🛡️ @GUARD : DOMParser로 파싱 실패 시 null 반환, table 요소 미존재 시 null 반환
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * [ONR-15-003] parseHtmlTableToMarkdown 함수 (추출된 유틸리티)
 * @description 웹에서 복사해 붙여넣어진 HTML 형식의 <table> 구문을 표준 마크다운 표 형식으로 변환합니다.
 * @param html 붙여넣기 시도된 원본 HTML 문자열
 * @param showToast 토스트 메시지 함수
 * @returns 마크다운 표 문자열 또는 변환 실패 시 null
 */
export const parseHtmlTableToMarkdown = (html: string, showToast?: (msg: string, type: string) => void) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    let mdTable = '';
    const rows = table.querySelectorAll('tr');
    let isFirstRow = true;

    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      if (cells.length === 0) return;

      const cellTexts = Array.from(cells).map(cell => {
        let inner = cell.innerHTML;
        inner = inner.replace(/<br\s*\/?>/gi, ' <br> ');
        inner = inner.replace(/<\/(p|div)>/gi, ' <br> ');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = inner;
        let text = tempDiv.textContent || tempDiv.innerText || '';

        text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        text = text.replace(/(<br>\s*)+/g, '<br>');
        if (text.startsWith('<br>')) text = text.substring(4).trim();
        if (text.endsWith('<br>')) text = text.substring(0, text.length - 4).trim();

        return text;
      });

      mdTable += '| ' + cellTexts.join(' | ') + ' |\n';

      if (isFirstRow) {
        mdTable += '|' + cellTexts.map(() => '---').join('|') + '|\n';
        isFirstRow = false;
      }
    });
    return mdTable.trim() + '\n';
  } catch (err) {
    if (showToast) {
      showToast('HTML 표 파싱 중 오류가 발생했습니다.', 'error');
    }
    return null;
  }
};

/**
 * [ONR-15-004] formatMarkdownTables 함수 (추출된 유틸리티)
 * @description 문서 내 마크다운 표 영역을 스캔하여, 기형적으로 길게 늘어진 하이픈(---) 구분선을 단정히 축소하고 각 셀의 무의미한 여백을 일률 정리합니다.
 * @param text 마크다운 텍스트
 * @returns 일괄 정돈된 마크다운 텍스트
 */
export const formatMarkdownTables = (text: string): string => {
  if (!text.includes('|')) return text;

  const lines = text.split('\n');
  const cleanLines: string[] = [];

  // 1단계. 표 내부의 기형적인 공백 줄 및 단순 파이프 단독 찌꺼기 줄(|) 필터링 전처리
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isGarbagePipe = trimmed === '|' || trimmed === '| ' || /^\|\s*$/.test(trimmed);

    if (isGarbagePipe) {
      let hasPrevTable = false;
      for (let j = cleanLines.length - 1; j >= 0; j--) {
        const pTrimmed = cleanLines[j].trim();
        if (pTrimmed === '') continue;
        if (pTrimmed.startsWith('|') && pTrimmed.includes('|', 1)) {
          hasPrevTable = true;
        }
        break;
      }

      let hasNextTable = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nTrimmed = lines[j].trim();
        if (nTrimmed === '') continue;
        if (nTrimmed.startsWith('|') && nTrimmed.includes('|', 1)) {
          hasNextTable = true;
        }
        break;
      }

      if (hasPrevTable && hasNextTable) {
        continue; // 표 중간의 찌꺼기 라인은 필터링(건너뜀)
      }
    }

    if (trimmed === '') {
      let hasPrevTable = false;
      for (let j = cleanLines.length - 1; j >= 0; j--) {
        const pTrimmed = cleanLines[j].trim();
        if (pTrimmed === '') continue;
        if (pTrimmed.startsWith('|') && pTrimmed.includes('|', 1)) {
          hasPrevTable = true;
        }
        break;
      }

      let hasNextTable = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nTrimmed = lines[j].trim();
        if (nTrimmed === '') continue;
        if (nTrimmed.startsWith('|') && nTrimmed.includes('|', 1)) {
          hasNextTable = true;
        }
        break;
      }

      if (hasPrevTable && hasNextTable) {
        continue; // 표 중간의 빈 줄도 필터링하여 붙여줌
      }
    }

    cleanLines.push(line);
  }

  // 2단계. 정제된 라인들을 기반으로 표 리빌딩 및 정렬 수행
  const result: string[] = [];
  let currentTable: string[][] = [];

  const flushTable = () => {
    if (currentTable.length === 0) return;

    const formattedRows: string[] = [];

    currentTable.forEach((rowCells) => {
      const isDivider = rowCells.every(cell => {
        const trimmed = cell.trim();
        if (trimmed === '') return true;
        return /^[:\-\s]+$/.test(trimmed) && trimmed.includes('-');
      });

      if (isDivider) {
        const newCells = rowCells.map(cell => {
          const trimmed = cell.trim();
          if (trimmed === '') return '';
          const alignLeft = trimmed.startsWith(':');
          const alignRight = trimmed.endsWith(':');
          if (alignLeft && alignRight) return ' :---: ';
          if (alignLeft) return ' :--- ';
          if (alignRight) return ' ---: ';
          return ' --- ';
        });
        formattedRows.push('|' + newCells.join('|') + '|');
      } else {
        const newCells = rowCells.map(cell => {
          const trimmed = cell.trim();
          return trimmed ? ` ${trimmed} ` : ' ';
        });
        formattedRows.push('|' + newCells.join('|') + '|');
      }
    });

    result.push(...formattedRows);
    currentTable = [];
  };

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    const trimmed = line.trim();

    let isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;

    if (!isTableLine && currentTable.length > 0 && trimmed.startsWith('|')) {
      const pipeCount = (trimmed.match(/\|/g) || []).length;
      if (pipeCount >= 2) {
        isTableLine = true;
      }
    }

    if (isTableLine) {
      let cleanLine = trimmed;
      if (!cleanLine.endsWith('|')) {
        cleanLine = cleanLine + ' |';
      }
      const parts = cleanLine.split('|');
      const cells = parts.slice(1, parts.length - 1);
      currentTable.push(cells);
    } else {
      flushTable();
      result.push(line);
    }
  }

  flushTable();
  return result.join('\n');
};
