import JSZip from 'jszip';
import { htmlToImportMarkdown } from './importHtmlMarkdown';

export async function importEpub(buffer: ArrayBuffer, saveImage?: (data: string, mime: string) => Promise<string>): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const parse = (text: string) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('EPUB의 XML 구조가 올바르지 않습니다.');
    return doc;
  };
  const elements = (doc: Document, name: string) => Array.from(doc.getElementsByTagNameNS('*', name));
  const resolve = (base: string, href: string) => decodeURIComponent(new URL(href, 'https://epub.invalid/' + base).pathname.slice(1));
  const container = zip.file('META-INF/container.xml');
  if (!container) throw new Error('EPUB의 컨테이너 정보를 찾지 못했습니다.');
  const packagePath = elements(parse(await container.async('string')), 'rootfile')[0]?.getAttribute('full-path');
  const packageFile = packagePath && zip.file(packagePath);
  if (!packageFile) throw new Error('EPUB의 본문 목록을 찾지 못했습니다.');
  const metadata = parse(await packageFile.async('string'));
  const manifest = elements(metadata, 'item');
  const refs = elements(metadata, 'itemref');
  if (!refs.length) throw new Error('EPUB에 읽을 본문 순서가 없습니다.');
  const chapters: string[] = [];
  const cache = new Map<string, string>();
  const save = async (key: string, data: () => Promise<string>, mime: string) => {
    if (cache.has(key)) return cache.get(key)!;
    if (!saveImage) throw new Error('EPUB 이미지를 저장할 공통 자원 폴더를 연결해 주세요.');
    const target = await saveImage(await data(), mime);
    if (!target || target.startsWith('data:')) throw new Error('EPUB 이미지를 파일로 저장하지 못했습니다.');
    cache.set(key, target);
    return target;
  };
  for (const ref of refs) {
    const item = manifest.find(el => el.getAttribute('id') === ref.getAttribute('idref'));
    if (!item) throw new Error('EPUB 본문 참조가 누락되었습니다.');
    if (item.getAttribute('properties')?.split(/\s+/).includes('nav')) continue;
    const chapterPath = resolve(packagePath as string, item.getAttribute('href') || '');
    const chapter = zip.file(chapterPath);
    if (!chapter) throw new Error(`EPUB 본문 파일이 누락되었습니다: ${chapterPath}`);
    const doc = new DOMParser().parseFromString(await chapter.async('string'), 'text/html');
    for (const img of Array.from(doc.images)) {
      const src = img.getAttribute('src') || '';
      if (!src) continue;
      if (/^https?:/i.test(src)) continue;
      const embedded = src.match(/^data:(image\/[^;,]+);base64,([\s\S]+)$/i);
      let target: string;
      if (embedded) target = await save(src, async () => embedded[2], embedded[1]);
      else {
        if (/^[a-z]+:/i.test(src)) throw new Error('지원하지 않는 EPUB 이미지 주소입니다.');
        const imagePath = resolve(chapterPath, src);
        const image = zip.file(imagePath);
        if (!image) throw new Error(`EPUB 이미지 파일이 누락되었습니다: ${imagePath}`);
        const mime = manifest.find(el => resolve(packagePath as string, el.getAttribute('href') || '') === imagePath)?.getAttribute('media-type') || (/\.jpe?g$/i.test(imagePath) ? 'image/jpeg' : /\.svg$/i.test(imagePath) ? 'image/svg+xml' : /\.webp$/i.test(imagePath) ? 'image/webp' : /\.gif$/i.test(imagePath) ? 'image/gif' : 'image/png');
        target = await save(imagePath, () => image.async('base64'), mime);
      }
      img.setAttribute('src', target);
    }
    chapters.push(htmlToImportMarkdown(doc.body.innerHTML));
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return chapters.join('\n\n').trim();
}
