// ====================================================================
// 📊 [OMD-LIB-headingNumbering-0001] headingNumbering.ts ➔ 제목(H1~H6) 번호 형식 및 마크다운 원문 동기화
// 🚨 @PATCH : **2026-10-22** — [제목 태그(#) + 스페이스 자동 번호 삽입 — countHeadingsUpTo 헬퍼 신설]:
//             1) Monaco 에디터에서 '#' + 스페이스 입력 시 현재 커서 위치까지의 제목 누적 횟수를 계산하는
//                countHeadingsUpTo(lines, targetLineIndex, formats) 함수 추가
//             2) 코드블록(`) 내부 제목 행을 정확히 배제하여 오탐 방지
// 🚨 @PATCH : **2026-10-22** — [계층형 십진 번호(decimal-outline: 1. ➔ 1.1 ➔ 1.1.1) 신설]:
//             1) KS/ISO 기술표준용 decimal-outline 형식 추가 (상위 제목 번호를 이어 붙여 1.1, 1.1.1 생성)
//             2) 기존 라벨 인식 정규식에 1.1 / 1.1.1 형식을 추가하여 형식 변경 시 이중 번호가 생기지 않도록 보장
// ====================================================================
import type { CssProfile } from '@/types/cssProfile';
import { reportListMarker } from './reportNumbering';
import { defaultMarkdownParser } from 'prosemirror-markdown';

export const HEADING_NUMBER_FORMATS = ['none', 'roman', 'decimal', 'decimal-outline', 'hangul', 'decimal-paren', 'hangul-paren', 'custom'] as const;
export type HeadingNumberFormat = typeof HEADING_NUMBER_FORMATS[number];
export type HeadingNumberSetting = HeadingNumberFormat | { type: 'custom'; number: 'roman' | 'decimal' | 'hangul' | 'bullet'; prefix: string; suffix: string; bullet?: string };
export function headingSetting(value: unknown): HeadingNumberSetting {
  if (value === 'custom') return { type: 'custom', number: 'decimal', prefix: '', suffix: '.' };
  if (value && typeof value === 'object' && (value as any).type === 'custom') {
    const custom = value as any;
    const clean = (text: unknown) => typeof text === 'string' ? text.replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 40) : '';
    return { type: 'custom', number: ['roman', 'hangul', 'bullet'].includes(custom.number) ? custom.number : 'decimal', prefix: clean(custom.prefix), suffix: clean(custom.suffix), bullet: clean(custom.bullet) || '•' };
  }
  return headingFormat(value);
}
export const REPORT_HEADING_NUMBERING: HeadingNumberFormat[] = ['roman', 'decimal', 'hangul', 'decimal-paren', 'hangul-paren', 'none'];
export function headingFormat(value: unknown): HeadingNumberFormat {
  if (value && typeof value === 'object' && (value as any).type === 'custom') return 'custom';
  return HEADING_NUMBER_FORMATS.includes(value as HeadingNumberFormat) ? value as HeadingNumberFormat : 'none';
}
// Existing literal labels are preserved, never removed from the user's source.
export function hasHeadingNumber(text: string): boolean {
  return /^\s*(?:[Ⅰ-ⅫⅬⅭⅮⅯ]+[.\-]|[IVXLCDM]+\.|\d+(?:\.\d+)+\.?|\d+[.)]|[가-힣][.)]|제\s*\d+\s*[장절편]|\([가-힣\dⅠ-Ⅻ]+\))\s+/.test(text);
}
export function headingNodeText(node: any): string {
  return node?.value ?? node?.text ?? (node?.children || []).map(headingNodeText).join('');
}
/** decimal-outline: 연속된 상위 decimal-outline 제목 번호를 이어 붙인다 (1. / 1.1 / 1.1.1). */
export function outlineMarker(formats: unknown[], counts: number[], index: number): string {
  let start = index;
  while (start > 0 && headingFormat(formats[start - 1]) === 'decimal-outline') start--;
  const parts = counts.slice(start, index + 1).map(n => Math.max(1, n));
  return parts.length === 1 ? parts[0] + '.' : parts.join('.');
}
export function headingMarker(setting: HeadingNumberSetting, value: number): string {
  const normalized = headingSetting(setting);
  if (typeof normalized === 'object') return normalized.prefix + (normalized.number === 'bullet' ? normalized.bullet || '•' : reportListMarker({ roman: 1, decimal: 2, hangul: 3 }[normalized.number], value).slice(0, -1)) + normalized.suffix;
  const depth = { none: 0, roman: 1, decimal: 2, 'decimal-outline': 2, hangul: 3, 'decimal-paren': 4, 'hangul-paren': 5, custom: 2 }[normalized];
  return depth ? reportListMarker(depth, value) : '';
}

/** Only replace the leading label, keeping the title's inline markup and spacing intact. */
export function headingLabelLength(text: string, setting?: unknown): number {
  const normalized = headingSetting(setting);
  if (typeof normalized === 'object') {
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const number = normalized.number === 'bullet' ? escape(normalized.bullet || '•') : normalized.number === 'decimal' ? '\\d+' : normalized.number === 'roman' ? '[Ⅰ-ⅫⅬⅭⅮⅯIVXLCDM]+' : '[가나다라마바사아자차카타파하]+';
    const match = text.match(new RegExp('^' + escape(normalized.prefix) + number + escape(normalized.suffix) + '[ \\t]+'));
    if (match) return match[0].length;
  }
  return text.match(/^(?:[Ⅰ-ⅫⅬⅭⅮⅯ]+[.\-]|[IVXLCDM]+\.|\d+(?:\.\d+)+\.?|\d+[.)]|[가-힣][.)]|제\s*\d+\s*[장절편]|\([가-힣\dⅠ-Ⅻ]+\)|[•○●□■◆◇▶▷※])\s+/)?.[0].length || 0;
}

export function createHeadingRewriter(formats: unknown[] = [], previous: unknown[] = []) {
  const counts = [0, 0, 0, 0, 0, 0];
  return (level: number, text: string) => {
    const index = level - 1;
    counts[index]++; counts.fill(0, index + 1);
    const setting = headingSetting(formats[index]);
    const enabled = headingFormat(setting) !== 'none';
    if (!enabled && headingFormat(previous[index]) === 'none') return { remove: 0, insert: '' };
    const remove = Math.max(headingLabelLength(text, previous[index]), headingLabelLength(text, setting));
    // An empty heading remains editable without inserting an orphan label.
    const marker = enabled && text.slice(remove).trim() ? (headingFormat(setting) === 'decimal-outline' ? outlineMarker(formats, counts, index) : headingMarker(setting, counts[index])) : '';
    return { remove, insert: marker ? marker + ' ' : '' };
  };
}

export function syncMarkdownHeadingNumbers(source: string, formats: unknown[] = [], previous: unknown[] = []): string {
  if (![...formats, ...previous].some(value => headingFormat(value) !== 'none')) return source;
  const frontmatter = source.match(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/)?.[0] || '';
  const body = source.slice(frontmatter.length);
  const lines = body.split('\n');
  const rewrite = createHeadingRewriter(formats, previous);
  const tokens = defaultMarkdownParser.tokenizer.parse(body, {});
  for (const token of tokens) {
    if (token.type !== 'heading_open' || !token.map) continue;
    const lineIndex = token.map[0];
    const line = lines[lineIndex];
    const atx = line.match(/^([ \t]{0,3}#{1,6}[ \t]+)(.*?)([ \t]+#+[ \t]*)?(\r?)$/);
    const setext = !atx && token.map[1] === lineIndex + 2 && /^[ \t]{0,3}(?:=+|-+)[ \t]*\r?$/.test(lines[lineIndex + 1] || '');
    if (!atx && !setext) continue;
    const text = atx ? atx[2] : line.replace(/\r$/, '');
    const edit = rewrite(Number(token.tag.slice(1)), text);
    lines[lineIndex] = (atx ? atx[1] : '') + edit.insert + text.slice(edit.remove) + (atx ? (atx[3] || '') + atx[4] : line.endsWith('\r') ? '\r' : '');
  }
  return frontmatter + lines.join('\n');
}

export function numberHeadingTransaction(transaction: import('prosemirror-state').Transaction, formats: unknown[] = [], previous: unknown[] = []) {
  if (![...formats, ...previous].some(value => headingFormat(value) !== 'none')) return transaction;
  const rewrite = createHeadingRewriter(formats, previous);
  const edits: { from: number; to: number; text: string }[] = [];
  transaction.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return;
    const edit = rewrite(node.attrs.level, node.textContent);
    if (node.textContent.slice(0, edit.remove) !== edit.insert) edits.push({ from: pos + 1, to: pos + 1 + edit.remove, text: edit.insert });
  });
  for (const edit of edits.reverse()) transaction.insertText(edit.text, edit.from, edit.to);
  return transaction;
}

/**
 * Monaco 에디터에서 '#' + Space 입력 시 사용.
 * lines[0..targetLineIndex-1] 까지 스캔하여 각 제목 레벨(H1~H6)의
 * 누적 카운트(counts[0..5])를 반환한다.
 * 코드블록(``` 펜스) 내부의 제목 행은 정확히 배제한다.
 */
export function countHeadingsUpTo(lines: string[], targetLineIndex: number, formats: unknown[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0];
  let inCodeBlock = false;
  for (let i = 0; i < targetLineIndex && i < lines.length; i++) {
    const line = lines[i];
    // 코드 펜스(```) 토글
    if (/^[ \t]{0,3}(`{3,}|~{3,})/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    // ATX 제목 감지
    const m = line.match(/^#{1,6}(?= |\t|$)/);
    if (!m) continue;
    const level = m[0].length;
    const index = level - 1;
    // 해당 레벨의 서식이 'none'이어도 카운트는 증가시켜야 상위/하위 계층 번호가 정확해짐
    counts[index]++;
    counts.fill(0, index + 1);
  }
  return counts;
}
export function createHeadingNumberer(formats: unknown[] = []) {
  const counts = [0, 0, 0, 0, 0, 0];
  return (level: number, text: string): string => {
    const index = level - 1;
    if (index < 0 || index > 5) return '';
    counts[index]++;
    counts.fill(0, index + 1);
    if (headingLabelLength(text, formats[index])) return '';
    return headingFormat(formats[index]) === 'decimal-outline' ? outlineMarker(formats, counts, index) : headingMarker(headingSetting(formats[index]), counts[index]);
  };
}

export function headingNumberingCss(profile: CssProfile): string {
  const formats = profile.headingNumbering || [];
  if (!formats.some(value => headingFormat(value) !== 'none')) return '';
  // Labels live in Markdown. Keep only export metadata; never add a second CSS label.
  const roots = ':is(.custom-preview-container,.onrivi-content-root,.markdown-viewer-root,.visual-document-surface)';
  const rules = Array.from({ length: 6 }, (_, i) => {
    const setting = headingSetting(formats[i]);
    const format = headingFormat(setting);
    const custom = typeof setting === 'object' ? setting : { number: 'decimal' as const, prefix: '', suffix: '.' };
    const suffix = format === 'custom' ? custom.suffix : format.endsWith('paren') ? ')' : '.';
    const prefix = format === 'custom' ? custom.prefix : '';
    return `${roots} h${i + 1}{--onrivi-heading-format:${format};--onrivi-heading-number:${custom.number};--onrivi-heading-bullet:${JSON.stringify('bullet' in custom ? custom.bullet || '•' : '•')};--onrivi-heading-prefix:${JSON.stringify(prefix)};--onrivi-heading-suffix:${JSON.stringify(suffix)};}
${roots} h${i + 1}::before{content:none!important;}`;
  });
  return `${rules.join('\n')}
${roots} [data-onrivi-heading-numbered]::before,${roots} [data-onrivi-heading-materialized]::before{content:none!important;}`;
}

export function materializeHeadingNumbers(source: HTMLElement, clone: HTMLElement): void {
  const originals = Array.from(source.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'));
  const counts = [0, 0, 0, 0, 0, 0];
  clone.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6').forEach((heading, index) => {
    const original = originals[index];
    if (!original) return;
    const level = Number(original.tagName.slice(1)) - 1;
    counts[level]++; counts.fill(0, level + 1);
    const computed = getComputedStyle(original);
    const format = headingFormat(computed.getPropertyValue('--onrivi-heading-format').trim());
    const readText = (name: string) => { try { return JSON.parse(computed.getPropertyValue(name).trim()); } catch { return ''; } };
    const setting = format === 'custom' ? headingSetting({ type: 'custom', number: computed.getPropertyValue('--onrivi-heading-number').trim(), prefix: readText('--onrivi-heading-prefix'), suffix: readText('--onrivi-heading-suffix'), bullet: readText('--onrivi-heading-bullet') }) : format;
    const marker = headingLabelLength(original.textContent || '', setting) ? '' : headingMarker(setting, counts[level]);
    heading.setAttribute('data-onrivi-heading-materialized', 'true');
    if (marker) heading.prepend(document.createTextNode(marker + ' '));
  });
}
