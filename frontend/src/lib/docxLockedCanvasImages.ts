// ====================================================================
// 📊 [OMD-LIB-DOCX-LOCKED-CANVAS-0001] frontend/src/lib/docxLockedCanvasImages.ts
// 🎯 @KICK  : Mammoth가 건너뛰는 Word lockedCanvas 그림을 문서 순서대로 추출
// 🛡️ @GUARD : 원본 DOCX는 변경하지 않고 메모리 내 복사본만 변환
// 🚨 @PATCH : 2026-11-11 — lockedCanvas 내부 이미지 참조를 임시 표식으로 치환하여 가져오기 위치 보존
// ====================================================================
import JSZip from 'jszip';

interface LockedCanvasImage {
  marker: string;
  base64: string;
  contentType: string;
}

/**
 * ========================================================================================
 * [prepareDocxLockedCanvasImages] 지원되지 않는 lockedCanvas 이미지에 본문 표식을 넣습니다.
 * @param buffer 원본 DOCX 바이트
 * @returns Mammoth용 복사본과 이미지 데이터
 * @throws 손상된 ZIP 또는 XML을 읽지 못한 경우
 * ========================================================================================
 */
export async function prepareDocxLockedCanvasImages(buffer: ArrayBuffer): Promise<{
  arrayBuffer: ArrayBuffer;
  images: LockedCanvasImage[];
}> {
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file('word/document.xml');
  const relationshipsFile = zip.file('word/_rels/document.xml.rels');
  if (!documentFile || !relationshipsFile) return { arrayBuffer: buffer, images: [] };

  const parser = new DOMParser();
  const relationships = parser.parseFromString(await relationshipsFile.async('string'), 'application/xml');
  const targets = new Map<string, string>();
  for (const relationship of Array.from(relationships.getElementsByTagName('Relationship'))) {
    if (relationship.getAttribute('TargetMode') === 'External') continue;
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (id && target) targets.set(id, target);
  }

  let xml = await documentFile.async('string');
  const images: LockedCanvasImage[] = [];
  const drawingPattern = /<w:drawing\b[\s\S]*?<\/w:drawing>/g;
  const drawingMatches = Array.from(xml.matchAll(drawingPattern));
  for (const drawing of drawingMatches) {
    if (!drawing[0].includes('lockedCanvas')) continue;
    const ids = Array.from(drawing[0].matchAll(/<a:blip\b[^>]*\br:embed="([^"]+)"/g), match => match[1]);
    let markers = '';
    for (const id of ids) {
      const target = targets.get(id);
      if (!target) continue;
      const path = new URL(target, 'https://docx.invalid/word/document.xml').pathname.slice(1);
      const file = zip.file(path);
      if (!file) continue;
      const extension = path.split('.').pop()?.toLowerCase();
      const contentType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg'
        : extension === 'png' ? 'image/png'
        : extension === 'gif' ? 'image/gif' : null;
      if (!contentType) continue;
      const marker = `ONRIVIDOCXLOCKEDIMAGE${images.length}END`;
      images.push({ marker, base64: await file.async('base64'), contentType });
      markers += `<w:t>${marker}</w:t>`;
    }
    if (markers) xml = xml.replace(drawing[0], drawing[0] + markers);
  }
  if (!images.length) return { arrayBuffer: buffer, images };
  zip.file('word/document.xml', xml);
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return { arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, images };
}
