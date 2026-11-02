import { PAPER_SIZES } from '../constants/paperSizes';
import type { CssProfile, CssRuleSet } from '../types/cssProfile';

export const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export function cssPx(value?: string, base = 16): number {
  const number = parseFloat(value || '');
  if (!Number.isFinite(number)) return 0;
  if (value?.endsWith('mm')) return number * 96 / 25.4;
  if (value?.endsWith('cm')) return number * 96 / 2.54;
  if (value?.endsWith('pt')) return number * 96 / 72;
  if (value?.endsWith('rem')) return number * 16;
  if (value?.endsWith('em')) return number * base;
  return number;
}
export function wordColor(value?: string): string | undefined {
  if (!value || value === 'transparent') return undefined;
  if (/^#[\da-f]{6}$/i.test(value)) return value.slice(1).toUpperCase();
  if (/^#[\da-f]{3}$/i.test(value)) return value.slice(1).split('').map(char => char + char).join('').toUpperCase();
  const rgb = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return rgb.slice(1, 4).map(number => Math.min(255, +number).toString(16).padStart(2, '0')).join('').toUpperCase();
  return ({ black: '000000', white: 'FFFFFF', red: 'FF0000', blue: '0000FF' } as Record<string, string>)[value];
}
export function wordRunProperties(rule: CssRuleSet = {}, base = 16): string {
  const size = cssPx(rule['font-size'], base);
  const font = rule['font-family']?.split(',')[0].trim().replace(/["']/g, '');
  const color = wordColor(rule.color);
  const background = wordColor(rule['background-color']);
  return `${font ? `<w:rFonts w:ascii="${xmlEscape(font)}" w:hAnsi="${xmlEscape(font)}" w:eastAsia="${xmlEscape(font)}"/>` : ''}${size > 0 ? `<w:sz w:val="${Math.round(size * 1.5)}"/><w:szCs w:val="${Math.round(size * 1.5)}"/>` : ''}${color ? `<w:color w:val="${color}"/>` : ''}${background ? `<w:shd w:val="clear" w:fill="${background}"/>` : ''}${rule['font-weight'] ? `<w:b w:val="${rule['font-weight'] === 'bold' || parseInt(rule['font-weight']) >= 600 ? 1 : 0}"/>` : ''}${rule['font-style'] ? `<w:i w:val="${rule['font-style'] === 'italic' ? 1 : 0}"/>` : ''}`;
}
export function wordParagraphProperties(rule: CssRuleSet = {}, base = 16): string {
  const alignment = rule['text-align'];
  const line = rule['line-height'];
  const fontSize = cssPx(rule['font-size'], base) || base;
  // CSS 배율은 글자 크기가 기준이며 Word auto 배율은 글꼴의 줄 높이가 기준이다.
  // 실제 길이로 환산하고 최소 간격을 사용해 큰 인라인 글자의 잘림을 방지한다.
  const linePx = line ? (/^[\d.]+$/.test(line) ? +line * fontSize : line.endsWith('%') ? parseFloat(line) / 100 * fontSize : cssPx(line, fontSize)) : 0;
  const lineXml = linePx > 0 ? `w:line="${Math.round(linePx * 15)}" w:lineRule="atLeast"` : '';
  const spacing = rule['margin-top'] || rule['margin-bottom'] || line;
  return `${['left', 'right', 'center', 'justify'].includes(alignment) ? `<w:jc w:val="${alignment === 'justify' ? 'both' : alignment}"/>` : ''}${lineXml ? '<w:snapToGrid w:val="0"/>' : ''}${spacing ? `<w:spacing w:before="${Math.max(0, Math.round(cssPx(rule['margin-top'], base) * 15))}" w:after="${Math.max(0, Math.round(cssPx(rule['margin-bottom'], base) * 15))}" ${lineXml}/>` : ''}`;
}
export function wordSectionProperties(profile?: CssProfile): { xml: string; widthEmu: number; heightEmu: number } {
  const page = profile?.pageStyle;
  const paper = PAPER_SIZES[page?.paperSize?.toLowerCase() || 'a4'] || PAPER_SIZES.a4;
  const landscape = page?.orientation === 'landscape';
  const width = Math.round((landscape ? paper.height : paper.width) / 25.4 * 1440);
  const height = Math.round((landscape ? paper.width : paper.height) / 25.4 * 1440);
  const margin = (value?: string) => value === undefined ? 1440 : Math.max(0, Math.round(cssPx(value) * 15));
  const top = margin(page?.marginTop), bottom = margin(page?.marginBottom), left = margin(page?.marginLeft), right = margin(page?.marginRight);
  if (left + right >= width || top + bottom >= height) throw new Error('Word 용지보다 여백이 큽니다. 용지와 여백 설정을 확인해 주세요.');
  return { xml: `<w:pgSz w:w="${width}" w:h="${height}"${landscape ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="720" w:footer="720" w:gutter="0"/>`, widthEmu: (width - left - right) * 635, heightEmu: (height - top - bottom) * 635 };
}

// Leave space for headings and body text beside a figure on printed pages.
export const EXPORT_FIGURE_HEIGHT_RATIO = 0.45;

export const EXPORT_LEAD_FIGURE_HEIGHT_RATIO = 0.60;

/** A document's opening picture, before body paragraphs or tables, can use more space. */
export function markLeadExportFigure(root: HTMLElement): void {
  const image = root.querySelector('img');
  if (!image) return;
  const hasBodyBefore = Array.from(root.querySelectorAll('p, table, ul, ol, pre, blockquote')).some(block =>
    !block.contains(image) && !!(block.compareDocumentPosition(image) & 4));
  if (!hasBodyBefore) (image.closest('figure') || image).setAttribute('data-export-lead-figure', 'true');
}
