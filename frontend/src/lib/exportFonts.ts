import { getLocalFontSources, rememberLocalFontSources } from './localFontSources';

// Successful downloads are shared across exports; failures remain retryable.
const fontDataCache = new Map<string, string>();
const cssCache = new Map<string, string>();
const localDataCache = new WeakMap<object, string>();

/** Carry fonts used by the document into detached print windows and exported files. */
export async function embedExportFonts(root: HTMLElement, signal?: AbortSignal): Promise<string> {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) return '';
  const normalizeFamily = (name: string) => name.trim().replace(/["']/g, '').toLowerCase();
  const loadedFamilies = doc.fonts && typeof doc.fonts[Symbol.iterator] === 'function'
    ? new Set(Array.from(doc.fonts).filter(face => face.status === 'loaded').map(face => normalizeFamily(face.family))) : null;
  const contentElements = [root, ...Array.from(root.querySelectorAll('*'))].filter(el =>
    !el.closest('style, script, [data-editor-controls], .onrivi-page-guides, .onrivi-print-tools'));
  const families = new Set(contentElements.flatMap(el => {
    const names = view.getComputedStyle(el).fontFamily.split(',').map(normalizeFamily);
    return names.slice(0, 1);
  }));
  const usedWeights = new Map<string, Set<number>>();
  contentElements.forEach(el => {
    const css = view.getComputedStyle(el), family = normalizeFamily(css.fontFamily.split(',')[0]);
    const weights = usedWeights.get(family) || new Set<number>();
    weights.add(Number(css.fontWeight) || (css.fontWeight === 'bold' ? 700 : 400));
    usedWeights.set(family, weights);
  });
  const weightNumber = (value: string) => value === 'bold' ? 700 : Number(value) || 400;
  const usesWeight = (family: string, value: string) => {
    const range = value.trim().split(/\s+/).map(weightNumber);
    return Array.from(usedWeights.get(family) || [400]).some(weight => weight >= range[0] && weight <= (range[1] || range[0]));
  };
  // One variable font file may be declared once for each weight. Store its
  // bytes once and retain the full declared range instead of repeating base64.
  const faceGroups = new Map<string, { rule: string; min: number; max: number }>();
  const coveredWeights = new Map<string, Set<number>>();
  const visited = new Set<string>();
  const externalSheets = new Set<string>();
  const walker = doc.createTreeWalker(root, 4);
  const text: string[] = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement?.closest('style, script, [data-editor-controls]')) text.push(walker.currentNode.textContent || '');
  }
  const codepoints = Array.from(new Set(text.join(''))).map(char => char.codePointAt(0)!);
  const faces = new Map<string, string>();
  const embeddedFamilies = new Set<string>();
  const request = async (url: string) => {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  };
  const parse = async (css: string, base: string) => {
    for (const match of Array.from(css.matchAll(/@font-face\s*\{[^}]*\}/gi))) {
      signal?.throwIfAborted();
      const rule = match[0];
      const family = /font-family\s*:\s*([^;}]*)/i.exec(rule)?.[1].trim().replace(/["']/g, '').toLowerCase();
      if (!family || !families.has(family)) continue;
      const weight = /font-weight\s*:\s*([^;}]+)/i.exec(rule)?.[1].trim() || 'normal';
      if (!usesWeight(family, weight)) continue;
      const unicodeRange = /unicode-range\s*:\s*([^;}]+)/i.exec(rule)?.[1];
      const fontStyle = /font-style\s*:\s*([^;}]+)/i.exec(rule)?.[1].trim() || 'normal';
      const descriptor = `${family}|${fontStyle}|${unicodeRange || ''}`;
      const declared = weight.trim().split(/\s+/).map(weightNumber);
      const wanted = Array.from(usedWeights.get(family) || [400]).filter(value => value >= declared[0] && value <= (declared[1] || declared[0]));
      const covered = coveredWeights.get(descriptor) || new Set<number>();
      if (wanted.every(value => covered.has(value))) continue;
      if (unicodeRange && !codepoints.some(point => unicodeRange.split(',').some(range => {
        const value = range.trim().replace(/^U\+/i, '');
        const parts = value.includes('?') ? [value.replace(/\?/g, '0'), value.replace(/\?/g, 'F')] : value.split('-');
        const start = parseInt(parts[0], 16);
        const end = parseInt(parts[1] || parts[0], 16);
        return point >= start && point <= end;
      }))) continue;
      let embedded = rule;
      for (const resource of Array.from(rule.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))) {
        if (resource[1].startsWith('data:')) continue;
        const url = new URL(resource[1], base).href;
        let data = faces.get(url) || fontDataCache.get(url);
        if (!data) {
          try {
            const blob = await request(url);
            if (!blob.size || /text\/html|application\/json/i.test(blob.type)) throw new Error('Invalid font response');
            data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
            faces.set(url, data);
            if (fontDataCache.size >= 64) fontDataCache.delete(fontDataCache.keys().next().value!);
            fontDataCache.set(url, data);
          } catch {
            throw new Error(`내보내기 글꼴 (${family}) 파일을 가져오지 못했습니다. 인터넷 연결과 글꼴 배포 경로를 확인해 주세요.`);
          }
        }
        embedded = embedded.replace(resource[0], `url("${data}")`);
      }
      const key = embedded.replace(/font-weight\s*:[^;}]+;?/i, '');
      const range = weight.trim().split(/\s+/).map(weightNumber);
      const group = faceGroups.get(key);
      if (group) {
        output.delete(group.rule);
        group.min = Math.min(group.min, range[0]);group.max = Math.max(group.max, range[1] || range[0]);
        group.rule = embedded.replace(/font-weight\s*:[^;}]+/i, `font-weight:${group.min} ${group.max}`);
        output.add(group.rule);
      } else {
        faceGroups.set(key, {rule:embedded,min:range[0],max:range[1] || range[0]});output.add(embedded);
      }
      embeddedFamilies.add(family);
      wanted.forEach(value => covered.add(value));coveredWeights.set(descriptor, covered);
    }
    for (const match of Array.from(css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gi))) {
      externalSheets.add(new URL(match[1], base).href);
    }
  };
  const readUrl = async (url: string) => {
    if (visited.has(url)) return;
    visited.add(url);
    let css: string;
    try {
      css = cssCache.get(url) || await (await request(url)).text();
      if (cssCache.size >= 32) cssCache.delete(cssCache.keys().next().value!);
      cssCache.set(url, css);
    }
    catch { return; } // Cross-origin optional sheets may be blocked; local font failures above remain explicit.
    await parse(css, url);
  };
  const output = new Set<string>();
  for (const sheet of Array.from(doc.styleSheets)) {
    signal?.throwIfAborted();
    const base = sheet.href || doc.baseURI;
    let css: string;
    try { css = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); }
    catch { if (sheet.href) externalSheets.add(sheet.href); continue; }
    await parse(css, base);
  }
  for (let index = 0; index < externalSheets.size; index++) {
    const url = Array.from(externalSheets)[index];
    if (loadedFamilies && !Array.from(families).some(family => loadedFamilies.has(family) && !embeddedFamilies.has(family))) break;
    await readUrl(url);
  }
  // Reuse the user's already approved Local Font Access permission after reopening the app.
  if (!getLocalFontSources().length && 'queryLocalFonts' in view) {
    try {
      const permission = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
      if (permission.state === 'granted') rememberLocalFontSources(await (view as any).queryLocalFonts());
    } catch { /* Browsers without Local Font Access retain system-font rendering. */ }
  }
  for (const font of getLocalFontSources()) {
    signal?.throwIfAborted();
    const family = font.family.toLowerCase();
    if (!families.has(family) || embeddedFamilies.has(family)) continue;
    const style = `${font.style || ''} ${font.fullName || ''}`;
    const weight = /black|heavy/i.test(style) ? 900 : /extra.?bold/i.test(style) ? 800 : /semi.?bold|demi/i.test(style) ? 600 : /bold/i.test(style) ? 700 : /medium/i.test(style) ? 500 : /extra.?light/i.test(style) ? 200 : /light/i.test(style) ? 300 : /thin/i.test(style) ? 100 : 400;
    if (!usesWeight(family, String(weight))) continue;
    try {
      let data = localDataCache.get(font);
      if (!data) {
        const blob = await font.blob();
        if (!blob.size) throw new Error('Empty font');
        data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        localDataCache.set(font, data);
      }
      output.add(`@font-face { font-family:${JSON.stringify(font.family)}; src:url("${data}"); font-weight:${weight}; font-style:${/italic|oblique/i.test(style) ? 'italic' : 'normal'}; }`);
    } catch {
      throw new Error(`사용자 글꼴 (${font.family})을 내보내기에 포함하지 못했습니다. 글꼴 선택창에서 접근 권한을 확인해 주세요.`);
    }
  }
  return Array.from(output).join('\n');
}
