import JSZip from 'jszip';

/** Match embedded image data to Word drawing sizes, including repeated images. */
export async function readDocxImageSizes(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);
  const xml = zip.file('word/document.xml');
  const rels = zip.file('word/_rels/document.xml.rels');
  const sizes = new Map<string, number[]>();
  if (!xml || !rels) return sizes;
  const parse = (text: string) => new DOMParser().parseFromString(text, 'application/xml');
  const relationships = parse(await rels.async('string'));
  const targets = new Map(Array.from(relationships.getElementsByTagName('Relationship')).filter(el => el.getAttribute('TargetMode') !== 'External').map(el => [el.getAttribute('Id'), el.getAttribute('Target') || '']));
  const doc = parse(await xml.async('string'));
  const drawings = Array.from(doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'drawing'));
  for (const drawing of drawings) {
    const extent = drawing.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent')[0];
    const blip = drawing.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0];
    const id = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
    const target = id && targets.get(id);
    const width = Number(extent?.getAttribute('cx')) / 9525; // EMU to CSS px at 96 DPI
    if (!target || !Number.isFinite(width) || width <= 0) continue;
    const path = new URL(target, 'https://docx.invalid/word/document.xml').pathname.slice(1);
    const image = zip.file(path);
    if (!image) continue;
    const key = await image.async('base64');
    const values = sizes.get(key) || [];
    values.push(Math.round(width));
    sizes.set(key, values);
  }
  return sizes;
}
