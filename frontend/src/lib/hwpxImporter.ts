import JSZip from 'jszip';

type ImageSave = (base64Data: string, contentType: string) => Promise<string>;

const children = (node: Element, name: string): Element[] =>
  Array.from(node.children).filter(child => child.localName === name);

function escapeCell(text: string): string {
  return text.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function parseXml(source: string, path: string): Document {
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`HWPX XML을 읽지 못했습니다: ${path}`);
  return doc;
}

/** Read the document spine, preserving section order even when file names differ. */
function sectionPaths(manifest: Document): string[] {
  const items = new Map<string, string>();
  for (const item of Array.from(manifest.getElementsByTagName('*')).filter(el => el.localName === 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) items.set(id, href.replace(/^\/+/, ''));
  }
  return Array.from(manifest.getElementsByTagName('*'))
    .filter(el => el.localName === 'itemref')
    .map(el => items.get(el.getAttribute('idref') || '') || '')
    .filter(path => /(?:^|\/)section[^/]*\.xml$/i.test(path));
}

export async function importHwpx(
  buffer: ArrayBuffer,
  imageSaveCallback?: ImageSave
): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file('Contents/content.hpf');
  if (!manifestFile) throw new Error('HWPX 문서 목차를 찾을 수 없습니다.');
  const manifest = parseXml(await manifestFile.async('string'), 'Contents/content.hpf');
  const paths = sectionPaths(manifest);
  if (!paths.length) throw new Error('HWPX 본문을 찾을 수 없습니다.');

  const imagePaths = new Map<string, string>();
  for (const item of Array.from(manifest.getElementsByTagName('*')).filter(el => el.localName === 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href && (/^image\//i.test(item.getAttribute('media-type') || '') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(href))) {
      imagePaths.set(id, href.replace(/^\/+/, ''));
    }
  }
  const imageCache = new Map<string, Promise<string>>();
  const imageMarkdown = (id: string): Promise<string> => {
    if (!imageSaveCallback) return Promise.resolve('');
    const path = imagePaths.get(id) || `BinData/${id}.png`;
    const entry = zip.file(path);
    if (!entry) return Promise.resolve('');
    if (!imageCache.has(path)) imageCache.set(path, (async () => {
      const bytes = await entry.async('base64');
      const ext = path.split('.').pop()?.toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : 'image/png';
      return imageSaveCallback(bytes, mime);
    })());
    return imageCache.get(path)!.then(src => `![${id}](${src})`);
  };

  const render = async (node: Element): Promise<string> => {
    switch (node.localName) {
      case 't': return node.textContent || '';
      case 'lineBreak': return '\n';
      case 'tab': return '\t';
      case 'pic': {
        const image = Array.from(node.getElementsByTagName('*')).find(el => el.localName === 'img');
        return image ? imageMarkdown(image.getAttribute('binaryItemIDRef') || '') : '';
      }
      case 'tbl': {
        const rows = children(node, 'tr');
        const width = Math.max(Number(node.getAttribute('colCnt')) || 0, ...rows.map(row => children(row, 'tc').length));
        if (!width) return '';
        const grid: string[][] = Array.from({ length: rows.length }, () => Array(width).fill(''));
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const cells = children(rows[rowIndex], 'tc');
          for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
            const cell = cells[cellIndex];
            const address = children(cell, 'cellAddr')[0];
            const row = Number(address?.getAttribute('rowAddr') ?? rowIndex);
            const col = Number(address?.getAttribute('colAddr') ?? cellIndex);
            if (row >= 0 && row < grid.length && col >= 0 && col < width) grid[row][col] = escapeCell(await renderChildren(cell));
          }
        }
        const lines = grid.map(row => `| ${row.join(' | ')} |`);
        lines.splice(1, 0, `| ${Array(width).fill('---').join(' | ')} |`);
        return `\n\n${lines.join('\n')}\n\n`;
      }
      case 'p': return (await renderChildren(node)).trim() + '\n\n';
      default: return renderChildren(node);
    }
  };
  const renderChildren = async (node: Element): Promise<string> =>
    (await Promise.all(Array.from(node.children, render))).join('');

  const sections: string[] = [];
  for (const path of paths) {
    const entry = zip.file(path);
    if (!entry) throw new Error(`HWPX 본문 파일이 없습니다: ${path}`);
    sections.push(await render(parseXml(await entry.async('string'), path).documentElement));
  }
  const result = sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!result) throw new Error('HWPX 문서에서 텍스트를 찾지 못했습니다.');
  return result;
}
