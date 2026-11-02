const fs = require('fs').promises;

/**
 * ICO 바이너리 파일 헤더를 파싱하여 내부에서 가장 높은 해상도(256x256)의 100% 투명 정품 PNG 블록을 추출합니다.
 * @param {string} icoPath 원본 ICO 파일 경로
 * @param {string} destPngPath 저장할 PNG 대상 파일 경로
 */
async function extractPngFromIco(icoPath, destPngPath) {
  const buf = await fs.readFile(icoPath);
  
  // ICO 헤더 검증
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  
  if (reserved !== 0 || type !== 1) {
    throw new Error("Invalid ICO format");
  }
  
  let bestEntry = null;
  let maxArea = 0;
  
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    let width = buf.readUInt8(offset);
    let height = buf.readUInt8(offset + 1);
    
    if (width === 0) width = 256;
    if (height === 0) height = 256;
    
    const bytesInRes = buf.readUInt32LE(offset + 8);
    const imageOffset = buf.readUInt32LE(offset + 12);
    
    const area = width * height;
    if (area > maxArea) {
      maxArea = area;
      bestEntry = { imageOffset, bytesInRes };
    }
  }
  
  if (!bestEntry) {
    throw new Error("No entries inside ICO");
  }
  
  // 가장 고해상도인 256x256 PNG 블록 추출
  const imgBuf = buf.subarray(bestEntry.imageOffset, bestEntry.imageOffset + bestEntry.bytesInRes);
  await fs.writeFile(destPngPath, imgBuf);
}

module.exports = {
  extractPngFromIco
};
