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
