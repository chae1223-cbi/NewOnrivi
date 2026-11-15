/**
 * ====================================================================
 * 📊 [OMD-LIB-PAGINATION-0001] frontend/src/lib/documentPaginationSettings.ts
 * 🎯 @KICK  : 문서별 수동 페이지 나누기(onrivi_pagination) 메타데이터 읽기/쓰기/제거 및 에디터 숨김 범위 계산
 * 🚨 @PATCH : 2026-11-15 — [메타정보 숨김 및 마크다운 복사 제외 유틸 추가]:
 *             stripPaginationSettings 및 getPaginationHiddenLineRange 추가
 * ====================================================================
 */
export type PrintBreakKind = 'row' | 'item' | 'code' | 'quote' | 'block';
export interface PrintBreakAnchor {
  id: string;
  kind: PrintBreakKind;
  text: string;
  context: string;
  previous: string;
  next: string;
}
export interface DocumentPaginationSettings { version: 1; breaks: PrintBreakAnchor[] }
export const emptyPagination = (): DocumentPaginationSettings => ({ version: 1, breaks: [] });
export function normalizePagination(value: unknown): DocumentPaginationSettings {
  const raw = value as DocumentPaginationSettings;
  const ids = new Set<string>();
  return { version: 1, breaks: raw?.version === 1 && Array.isArray(raw.breaks) ? raw.breaks.slice(0, 500).filter(a => {
    if (!a || !['row','item','code','quote','block'].includes(a.kind) ||
      !['id','text','context','previous','next'].every(key => typeof (a as any)[key] === 'string' && (a as any)[key].length <= 2000) || !/^[a-z0-9_-]{1,64}$/i.test(a.id) || ids.has(a.id)) return false;
    ids.add(a.id); return true;
  }).map(a => ({ id:a.id,kind:a.kind,text:a.text,context:a.context,previous:a.previous,next:a.next })) : [] };
}
const metadata = /^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/;
export function readPaginationSettings(source: string): DocumentPaginationSettings {
  const entry = source.match(metadata)?.[1].match(/^onrivi_pagination:\s*([^\r\n]*)/m)?.[1];
  try { return normalizePagination(JSON.parse(entry || '{}')); } catch { return emptyPagination(); }
}
/** Only this metadata line changes. Preserve the body and unrelated metadata byte for byte. */
export function writePaginationSettings(source: string, settings: DocumentPaginationSettings): string {
  const normalized = normalizePagination(settings), match = source.match(metadata);
  if (!match && !normalized.breaks.length) return source;
  const line = `onrivi_pagination: ${JSON.stringify(normalized)}`;
  if (!match) return `---\nonrivi_pagination: ${JSON.stringify(normalized)}\n---\n\n${source}`;
  const newline = match[0].includes('\r\n') ? '\r\n' : '\n';
  const content = match[1].split(/\r?\n/).filter(l => !/^onrivi_pagination\s*:/.test(l));
  if (normalized.breaks.length) content.push(line);
  const prefix = match[0].startsWith('\uFEFF') ? '\uFEFF' : '';
  return `${prefix}---${newline}${content.join(newline)}${newline}---` + (match[0].endsWith('\n') ? newline : '') + source.slice(match[0].length);
}

/**
 * ========================================================================================
 * [stripPaginationSettings] 마크다운 원문에서 페이지 나누기 메타정보(onrivi_pagination)를 제거합니다.
 * 단독 프론트매터인 경우 여닫는 구분선(---)과 구분용 빈 줄까지 함께 정리합니다.
 * ==========================================================================================
 */
export function stripPaginationSettings(source: string): string {
  if (!source) return source;
  const match = source.match(metadata);
  if (match) {
    const lines = match[1].split(/\r?\n/);
    if (!lines.some(l => /^onrivi_pagination\s*:/.test(l))) return source;
    const remaining = lines.filter(l => !/^onrivi_pagination\s*:/.test(l));
    const prefix = match[0].startsWith('\uFEFF') ? '\uFEFF' : '';
    const newline = match[0].includes('\r\n') ? '\r\n' : '\n';
    if (remaining.some(l => l.trim().length > 0)) {
      return `${prefix}---${newline}${remaining.join(newline)}${newline}---` + (match[0].endsWith('\n') ? newline : '') + source.slice(match[0].length);
    }
    const rest = source.slice(match[0].length).replace(/^(?:\r?\n)/, '');
    return `${prefix}${rest}`;
  }
  return source.replace(/^onrivi_pagination\s*:[^\r\n]*(?:\r?\n|$)/gm, '');
}

/**
 * ========================================================================================
 * [getPaginationHiddenLineRange] Monaco 에디터에서 숨길 페이지 나누기 메타정보의 1-based 줄 범위를 반환합니다.
 * ==========================================================================================
 */
export function getPaginationHiddenLineRange(source: string): { startLine: number; endLine: number } | null {
  if (!source) return null;
  const match = source.match(metadata);
  if (!match) return null;
  const metaLines = match[1].split(/\r?\n/);
  const paginationIdx = metaLines.findIndex(l => /^onrivi_pagination\s*:/.test(l));
  if (paginationIdx === -1) return null;
  const allLines = source.split(/\r?\n/);
  const hasOtherMeta = metaLines.some((l, idx) => idx !== paginationIdx && l.trim().length > 0);
  if (hasOtherMeta) {
    const targetLine = 2 + paginationIdx;
    return targetLine <= allLines.length ? { startLine: targetLine, endLine: targetLine } : null;
  }
  const closingLine = 2 + metaLines.length;
  let endLine = closingLine;
  if (allLines.length > closingLine + 1 && allLines[closingLine] === '') {
    endLine = closingLine + 1;
  }
  if (allLines.length <= endLine) {
    if (allLines.length <= 1) return null;
    endLine = allLines.length - 1;
  }
  return { startLine: 1, endLine };
}
