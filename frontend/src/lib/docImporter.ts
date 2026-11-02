/** Text-only Word 97–2003 (.doc) reader based on the MS-DOC piece table. */
export async function importDoc(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (![0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => bytes[index] === byte)) {
    throw new Error('올바른 Word DOC 파일이 아닙니다. DOCX 파일이라면 확장자를 확인해 주세요.');
  }
  const cfb = await import('cfb');
  const container = cfb.read(bytes, { type: 'array' });
  const stream = (name: string): Uint8Array | undefined => {
    const entry = container.FileIndex.find(item => item.name === name);
    return entry?.content ? new Uint8Array(entry.content) : undefined;
  };
  const word = stream('WordDocument');
  if (!word || word.length < 0x1aa) throw new Error('Word DOC 본문을 찾을 수 없습니다.');
  const header = new DataView(word.buffer, word.byteOffset, word.byteLength);
  if (header.getUint16(0, true) !== 0xa5ec) throw new Error('지원하지 않는 Word DOC 형식입니다.');
  if (header.getUint16(2, true) < 0x00c1) throw new Error('Word 97 이전 DOC 형식은 지원하지 않습니다.');
  const flags = header.getUint16(0x0a, true);
  if (flags & 0x0100) throw new Error('암호화된 Word DOC 문서는 암호를 해제한 후 가져와 주세요.');
  const table = stream(flags & 0x0200 ? '1Table' : '0Table');
  if (!table) throw new Error('Word DOC 텍스트 목차를 찾을 수 없습니다.');
  const tableView = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const mainCharacters = header.getUint32(0x4c, true);
  const clxOffset = header.getUint32(0x1a2, true);
  const clxSize = header.getUint32(0x1a6, true);
  if (!clxSize || clxOffset + clxSize > table.length) throw new Error('Word DOC 텍스트 목차가 손상되었습니다.');

  let cursor = clxOffset;
  const end = clxOffset + clxSize;
  while (cursor < end && table[cursor] === 0x01) {
    if (cursor + 3 > end) throw new Error('Word DOC 텍스트 목차가 손상되었습니다.');
    const length = tableView.getUint16(cursor + 1, true);
    cursor += 3 + length;
  }
  if (cursor + 5 > end || table[cursor] !== 0x02) throw new Error('Word DOC 텍스트 조각을 찾을 수 없습니다.');
  const plcLength = tableView.getUint32(cursor + 1, true);
  const plcStart = cursor + 5;
  if (plcLength < 16 || (plcLength - 4) % 12 !== 0 || plcStart + plcLength > end) {
    throw new Error('Word DOC 텍스트 조각이 손상되었습니다.');
  }
  const count = (plcLength - 4) / 12;
  const pieces: string[] = [];
  for (let index = 0; index < count; index++) {
    const cpStart = tableView.getUint32(plcStart + index * 4, true);
    const cpEnd = tableView.getUint32(plcStart + (index + 1) * 4, true);
    if (cpStart >= mainCharacters) break;
    if (cpEnd < cpStart) throw new Error('Word DOC 텍스트 위치가 손상되었습니다.');
    const length = Math.min(cpEnd, mainCharacters) - cpStart;
    const pcd = plcStart + (count + 1) * 4 + index * 8;
    const fc = tableView.getUint32(pcd + 2, true);
    const compressed = Boolean(fc & 0x40000000);
    const offset = (fc & 0x3fffffff) / (compressed ? 2 : 1);
    const byteLength = length * (compressed ? 1 : 2);
    if (!Number.isInteger(offset) || offset + byteLength > word.length) {
      throw new Error('Word DOC 텍스트 데이터가 손상되었습니다.');
    }
    pieces.push(new TextDecoder(compressed ? 'windows-1252' : 'utf-16le').decode(word.subarray(offset, offset + byteLength)));
  }
  const text = pieces.join('')
    .replace(/\r/g, '\n')
    .replace(/\x0b/g, '\n')
    .replace(/\x07/g, '\t')
    .replace(/[\x00-\x06\x08\x0c\x0e-\x1f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) throw new Error('Word DOC 문서에서 텍스트를 찾지 못했습니다.');
  return text;
}
