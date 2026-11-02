/** HWP 5 FileHeader: attributes at offset 36, bit 0 = raw DEFLATE. */
export function readHwpCompression(header: Uint8Array): boolean {
  if (header.length < 40) throw new Error('HWP FileHeader가 손상되었습니다.');
  const signature = String.fromCharCode(...Array.from(header.subarray(0,17)));
  if (signature !== 'HWP Document File') throw new Error('HWP 문서 인식 정보가 올바르지 않습니다.');
  const flags = new DataView(header.buffer,header.byteOffset,header.byteLength).getUint32(36,true);
  if (flags & 2) throw new Error('암호가 설정된 HWP 문서는 암호를 해제한 후 가져와 주세요.');
  if (flags & 4) throw new Error('배포용 HWP 문서는 일반 HWP로 저장한 후 가져와 주세요.');
  return !!(flags & 1);
}

export function decodeHwpBody(stream: Uint8Array, compressed: boolean, inflateRaw: (data: Uint8Array) => Uint8Array): Uint8Array {
  return compressed ? inflateRaw(stream) : stream;
}

/** HWP controls occupy either one WCHAR or eight WCHARs, including both ends. */
export function decodeHwpParagraph(data: Uint8Array): string {
  let text = '';
  for (let offset=0; offset+1<data.length;) {
    const code = data[offset] | (data[offset+1]<<8);
    if ((code>=1 && code<=9) || code===11 || code===12 || (code>=14 && code<=23)) {
      if (offset+16>data.length) throw new Error('HWP 문단 제어 정보가 손상되었습니다.');
      if (code===9) text+='\t';
      offset+=16;
      continue;
    }
    offset+=2;
    if (code===10 || code===13) text+='\n';
    else if (code===24) text+='-';
    else if (code===30 || code===31) text+=' ';
    else if (code>=32 && code!==0xfeff) text+=String.fromCharCode(code);
  }
  return text;
}

export function isRawHwpImage(bytes: Uint8Array): boolean {
  const signature=String.fromCharCode(...Array.from(bytes.subarray(0,4)));
  return signature.startsWith('BM') || signature==='II*\0' || signature==='MM\0*' || signature==='GIF8' ||
    (bytes[0]===137 && signature.slice(1)==='PNG') || (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) ||
    (signature==='RIFF' && String.fromCharCode(...Array.from(bytes.subarray(8,12)))==='WEBP');
}
