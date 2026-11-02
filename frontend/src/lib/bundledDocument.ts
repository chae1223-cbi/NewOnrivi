/** Application archive paths and web help URLs are readable, never writable files. */
export function isBundledDocumentPath(value?: string | null): boolean {
  let path = value || '';
  try { path = decodeURIComponent(path); } catch {}
  path = path.replace(/\\/g, '/');
  return /(?:^|\/)[^/]+\.asar(?:\/|$)/i.test(path) || /^(?:\.?\/)?help\//i.test(path);
}
