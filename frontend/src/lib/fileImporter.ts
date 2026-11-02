// ====================================================================
// 🚨 @PATCH : **2026-10-11** — [일반 텍스트(.txt) 파일 스마트 마크다운 변환 엔진(importPlainTextToMarkdown) 탑재]:
//             메모장 등에서 작성된 .txt 파일을 타문서 변환으로 가져올 때 대제목(제N장/PART/Chapter), 소제목([소제목]/■/★), 번호 목록, 글머리 기호(•/·/-) 및 문단 줄바꿈을 자동으로 분석하여 규격화된 마크다운(.md) 문서로 정돈 변환
// 🚨 @PATCH : **2026-08-20** (2차) HWP 이미지 추출 시 순차 치환으로 인해 이미지가 뒤섞이는 현상을 완벽 해결하기 위해, hwp.js의 Picture 객체의 binID를 추출하여 정확한 플레이스홀더를 삽입하고 OLE/DocInfo와 매핑. 또한 표(Table) 객체를 감지하여 뭉친 텍스트 대신 완전한 마크다운 표 구조를 생성하도록 extractText를 재귀적으로 리팩토링함.
// 🚀 [OMD-LIB-FileImporter-0001] fileImporter
// 📝 @KICK : 외부 파일(HWP, DOCX, PDF 등) 텍스트/이미지 추출 모듈
// 🚨 @PATCH : **2026-08-20** HWP 추출 시 표 데이터 뭉침 방지를 위해 hwp.js 배열 순회 시 탭(Tab) 공백 삽입. BMP/GIF 등 HWP 내장 이미지의 MIME 타입을 정확히 매핑하여 엑스박스 출력 해결. 이미지 위치 유지를 위해 hwp.js 파싱 중 그림 컨트롤 검출 시 ::HWP_IMAGE_PLACEHOLDER:: 꼬리표 삽입 로직 추가.
// ====================================================================
import { isSupportedImportFile } from './importFormats';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as hwpLib from 'hwp.js';
import { Buffer } from 'buffer';
import { htmlToImportMarkdown, importHtmlWithImages } from './importHtmlMarkdown';
import { importEpub } from './epubImporter';
import { extractPdfPageText } from './pdfImportText';
import { readDocxImageSizes } from './docxImageSizes';
import { pdfImageBoxes, serializePdfBlocks } from './pdfImportLayout';
import { pdfRuledTableBlocks } from './pdfImportTables';
import { readHwpCompression, decodeHwpBody, decodeHwpParagraph, isRawHwpImage } from './hwpStreams';
import { importHwpx } from './hwpxImporter';
import { importDoc } from './docImporter';
import { convertFormCheckboxes } from './importCheckboxes';
import { cleanHwpText } from './hwpTextCleanup';

// Next.js 14 (Webpack 5) 환경에서 mammoth.js가 내부적으로 Buffer를 참조할 때 발생하는 오류 방지용 폴리필
if (typeof globalThis !== 'undefined' && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * 외부 파일을 마크다운 평문으로 변환합니다.
 */
/**
 * 📄 일반 텍스트(.txt) 파일을 구조화된 출판 마크다운 문서로 지능형 변환
 */
export function importPlainTextToMarkdown(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  const srcLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const convertedLines: string[] = [];

  for (let i = 0; i < srcLines.length; i++) {
    const line = srcLines[i];
    const trimmed = line.trim();

    // 빈 행 유지
    if (!trimmed) {
      convertedLines.push('');
      continue;
    }

    // 1. 대제목 감지: 제 N 장, 제 N 편, PART N, Chapter N 등
    if (/^(제\s*\d+\s*[장편부화]|chapter\s*\d+|part\s*\d+)/i.test(trimmed)) {
      convertedLines.push(`## ${trimmed}`);
      continue;
    }

    // 2. 소제목 감지: [소제목], <소제목>, 【소제목】, ■ 소제목, ◆ 소제목, ★ 소제목 등
    if (/^[■◆★▶▷●▼▲【\[<][^】\]>]+[】\]>]?$/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^[■◆★▶▷●▼▲【\[<]\s*/, '').replace(/[】\]>]\s*$/, '').trim();
      convertedLines.push(`### ${cleanTitle || trimmed}`);
      continue;
    }

    // 3. 번호 매기기 소제목: 1. 또는 1) 또는 (1) 뒤에 짧은 문장(40자 이하)이며 마침표로 끝나지 않는 행
    if (/^(\d+[\.\)]|\(\d+\))\s+[^\n]{1,40}$/.test(trimmed) && !trimmed.endsWith('.')) {
      convertedLines.push(`#### ${trimmed}`);
      continue;
    }

    // 4. 글머리 기호 목록 변환: •, ·, ㆍ, o 기호 뒤 공백
    if (/^[•·ㆍo]\s+/.test(trimmed)) {
      convertedLines.push(`- ${trimmed.replace(/^[•·ㆍo]\s+/, '')}`);
      continue;
    }

    // 5. 일반 본문 유지
    convertedLines.push(line);
  }

  // 연속 3개 이상의 빈 줄을 2개로 압축하여 정돈
  return convertedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function convertFileToMarkdown(
  file: File,
  imageSaveCallback?: (base64Data: string, contentType: string) => Promise<string>
): Promise<string> {
  if (!isSupportedImportFile(file.name)) throw new Error('지원하지 않는 문서 형식입니다.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'html' || extension === 'htm') return importHtmlWithImages(await file.text(), imageSaveCallback);
  if (extension === 'txt') return importPlainTextToMarkdown(await file.text());
  if (['md', 'markdown'].includes(extension || '')) return file.text();
  const arrayBuffer = await file.arrayBuffer();

  switch (extension) {
    case 'doc':
      return await importDoc(arrayBuffer);
    case 'docx':
      return await importDocx(arrayBuffer, imageSaveCallback);
    case 'pdf':
      return await importPdf(arrayBuffer, imageSaveCallback);
    case 'hwp':
      return await importHwp(arrayBuffer, imageSaveCallback);
    case 'hwpx':
      return await importHwpx(arrayBuffer, imageSaveCallback);
    case 'txt':
    case 'md':
    case 'markdown':
      return await file.text();
    case 'epub':
      return importEpub(arrayBuffer, imageSaveCallback);
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: ${extension}`);
  }
}

async function importDocx(
  arrayBuffer: ArrayBuffer,
  imageSaveCallback?: (base64Data: string, contentType: string) => Promise<string>
): Promise<string> {
  try {
    let result;
    if (imageSaveCallback) {
      const imageSizes = await readDocxImageSizes(arrayBuffer);
      const options = {
        styleMap: ["p[style-name='Caption'] => figcaption:fresh"],
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            const width = imageSizes.get(imageBuffer)?.shift();
            return imageSaveCallback(imageBuffer, image.contentType).then(function(src) {
              return { src: width ? `${src}${src.includes('?') ? '&' : '?'}width=${width}` : src };
            });
          });
        })
      };
      // 이미지 콜백이 있을 경우 HTML 변환 후 반환
      result = await mammoth.convertToHtml({ arrayBuffer }, options);
      return htmlToImportMarkdown(result.value);
    } else {
      // 텍스트 추출 방식 사용
      result = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: ["p[style-name='Caption'] => figcaption:fresh"],
        convertImage: mammoth.images.imgElement(async () => {
          throw new Error('DOCX 이미지를 저장할 공통 자원 폴더를 연결해 주세요.');
        })
      });
    }
    return htmlToImportMarkdown(result.value);
  } catch (error: any) {
    console.error('DOCX Import Error:', error);
    throw new Error(`워드 파일(DOCX)을 읽는 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
  }
}

async function importPdf(
  arrayBuffer: ArrayBuffer,
  imageSaveCallback?: (base64Data: string, contentType: string) => Promise<string>
): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const MAX_PAGES = 100;
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF 문서가 너무 큽니다. (현재 ${pdf.numPages}페이지 / 최대 허용 ${MAX_PAGES}페이지). 분할하여 가져와주세요.`);
    }

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = extractPdfPageText(content.items);
      if (!pageText.trim()) {
        throw new Error(`PDF ${i}페이지에 추출 가능한 텍스트가 없습니다. 이미지로 구성된 PDF는 OCR(문자 인식)이 필요합니다. 현재 가져오기는 OCR을 지원하지 않습니다. 텍스트가 포함된 PDF 또는 원본 DOCX/HTML/EPUB 파일을 가져와 주세요.`);
      }
      
      const operators = await page.getOperatorList();
      const allBoxes = pdfImageBoxes(operators.fnArray, operators.argsArray, pdfjsLib.OPS);
      const boxes = allBoxes.filter(box => {
        // Ignore raster backgrounds under selectable text (such as code panels).
        const overlapping = content.items.filter((item: any) => item.str?.trim() && item.transform &&
          item.transform[4]>=box.x && item.transform[4]<box.x+box.width &&
          item.transform[5]>=box.y && item.transform[5]<box.y+box.height);
        return overlapping.reduce((count, item: any) => count+item.str.length,0)<40;
      });
      const blocks = pdfRuledTableBlocks(content.items, operators.fnArray, operators.argsArray, pdfjsLib.OPS,
        allBoxes.filter(box=>!boxes.includes(box)));
      if (boxes.length && typeof document !== 'undefined') {
        // Render once, then crop individual embedded image regions. Never turn
        // the complete page or its editable text into a bitmap.
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error(`PDF ${i}페이지의 이미지를 추출하지 못했습니다.`);
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        for (const [index, box] of Array.from(boxes.entries())) {
          const [x1,y1] = viewport.convertToViewportPoint(box.x,box.y);
          const [x2,y2] = viewport.convertToViewportPoint(box.x+box.width,box.y+box.height);
          const left=Math.max(0,Math.min(x1,x2)), top=Math.max(0,Math.min(y1,y2));
          const width=Math.min(canvas.width-left,Math.abs(x2-x1)), height=Math.min(canvas.height-top,Math.abs(y2-y1));
          if (width<=0 || height<=0) continue;
          const crop=document.createElement('canvas'); crop.width=Math.ceil(width); crop.height=Math.ceil(height);
          const cropContext=crop.getContext('2d');
          if (!cropContext) throw new Error('PDF 이미지 저장을 준비하지 못했습니다.');
          cropContext.drawImage(canvas,left,top,width,height,0,0,width,height);
          const data=crop.toDataURL('image/png');
          const src=imageSaveCallback ? await imageSaveCallback(data.split(',')[1],'image/png') : data;
          blocks.push({y:box.y+box.height,markdown:`![PDF ${i}페이지 이미지 ${index+1}](<${src}>)`});
        }
        canvas.width=canvas.height=0;
      }
      text += serializePdfBlocks(blocks.sort((a,b)=>b.y-a.y), true) + '\n';


    }
    
    return text.trim();
  } catch (error: any) {
    console.error('PDF Import Error:', error);
    throw new Error(error.message || 'PDF 파일을 읽는 중 오류가 발생했습니다.');
  }
}

async function importHwp(
  arrayBuffer: ArrayBuffer,
  imageSaveCallback?: (base64Data: string, contentType: string) => Promise<string>
): Promise<string> {
  try {
    const view = new Uint8Array(arrayBuffer);
    
    // 💡 [OLE CF 시그니처 검증] HWP 5.0 포맷은 항상 OLE 복합 파일 구조를 띱니다. (시그니처: D0 CF 11 E0 A1 B1 1A E1)
    const isOle = view[0] === 0xD0 && view[1] === 0xCF && view[2] === 0x11 && view[3] === 0xE0 &&
                  view[4] === 0xA1 && view[5] === 0xB1 && view[6] === 0x1A && view[7] === 0xE1;
                  
    if (!isOle) {
      // 💡 [ZIP 포맷 체크] HWPX는 zip 압축 파일 구조입니다. (시그니처: 50 4B 03 04 -> PK..)
      const isZip = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
      if (isZip) {
        throw new Error(
          '가져오려는 파일이 XML 기반의 HWPX(한글 표준 문서) 포맷으로 판별되었습니다.\n\n' +
          '현재 한글 문서 가져오기는 일반 HWP(한글 2002~2018 호환) 포맷만 지원합니다. ' +
          '한컴오피스에서 파일 메뉴 -> "다른 이름으로 저장"을 선택하여 파일 형식을 [한글 문서(*.hwp)]로 변경한 후 다시 시도해 주세요.'
        );
      }
      
      throw new Error('올바른 한글 문서(HWP) 파일이 아닙니다. 파일 손상 여부 및 올바른 OLE 복합 문서 포맷인지 확인해 주세요.');
    }

    const cfbModule = await import('cfb');
    const hwpContainer = cfbModule.read(view, {type:'array'});
    const hwpHeader = hwpContainer.FileIndex.find(entry=>entry.name === 'FileHeader');
    if (!hwpHeader?.content) throw new Error('HWP FileHeader를 찾을 수 없습니다.');
    const inputCompressed = readHwpCompression(new Uint8Array(hwpHeader.content));
    const useRecovery = !inputCompressed;
    let text = '';

    try {
      if (useRecovery) throw new Error('Use mixed-compression HWP reader');
      // 1단계: 기본 hwp.js 파서 작동 시도
      const pako = (await import('pako')).default;
      const parserContainer = cfbModule.read(view, {type:'array'});
      for (const entry of parserContainer.FileIndex) {
        if (/^BIN[0-9a-f]+\./i.test(entry.name) && entry.content && isRawHwpImage(new Uint8Array(entry.content))) {
          entry.content = pako.deflateRaw(new Uint8Array(entry.content));
          entry.size = entry.content.length;
        }
      }
      const hwpDoc = hwpLib.parse(cfbModule.write(parserContainer, { type: 'array' }), { type: 'array' });
      const escapeHtmlText = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const isHwpTable = (value: any): boolean => !!value && (value.id === 1952607264 || value.id === 543974004) && Array.isArray(value.content);
      const containsNestedTable = (value: any): boolean => {
        if (!value || typeof value !== 'object') return false;
        if (isHwpTable(value)) return true;
        if (Array.isArray(value)) return value.some(containsNestedTable);
        return Object.values(value).some(containsNestedTable);
      };
      const extractTextNode = (obj: any, htmlContext = false): string => {
          let result = '';
          if (typeof obj === 'string') {
            const value = cleanHwpText(obj);
            return htmlContext ? escapeHtmlText(value) : value;
          } else if (Array.isArray(obj)) {
            return obj.map(item => extractTextNode(item, htmlContext)).join('');
          } else if (obj !== null && typeof obj === 'object') {
            // hwp.js stores individual WCHARs; spaces must come from the
            // original controls, never from joining the character array.
            if (obj.constructor?.name === 'HWPChar') {
              if (typeof obj.value === 'string') {
                const value = cleanHwpText(obj.value);
                return htmlContext ? escapeHtmlText(value) : value;
              }
              if (obj.value === 30 || obj.value === 31) return ' ';
              if (obj.value === 9) return '\t';
              if (obj.value === 10 || obj.value === 13) return '\n';
              return '';
            }
            // Table (id = 543974004)
            if (isHwpTable(obj)) {
              type HwpCell = { row: number; column: number; rowSpan: number; colSpan: number; value: any };
              const cells: HwpCell[] = [];
              obj.content.forEach((row: any, rowIndex: number) => {
                if (!Array.isArray(row)) return;
                row.forEach((cell: any, cellIndex: number) => {
                  const attr = cell.attribute || {};
                  const r = Number.isInteger(attr.row) ? attr.row : rowIndex;
                  const c = Number.isInteger(attr.column) ? attr.column : cellIndex;
                  if (r < 0 || c < 0) return;
                  cells.push({ row: r, column: c, rowSpan: Math.max(1, attr.rowSpan || 1), colSpan: Math.max(1, attr.colSpan || 1), value: cell });
                });
              });
              const rowCount = Math.max(obj.rowCount || 0, obj.content.length, ...cells.map(cell => cell.row + cell.rowSpan));
              const columnCount = Math.max(obj.columnCount || 0, ...cells.map(cell => cell.column + cell.colSpan));
              const hasNestedTable = cells.some(cell => containsNestedTable(cell.value.items));
              if (!htmlContext && rowCount === 1 && columnCount === 1 && !hasNestedTable) return extractTextNode(cells[0]?.value) + '\n\n';
              const needsHtml = htmlContext || hasNestedTable || cells.some(cell => cell.rowSpan > 1 || cell.colSpan > 1);
              if (needsHtml) {
                const at = new Map(cells.map(cell => [`${cell.row}:${cell.column}`, cell]));
                const covered = new Set<string>();
                const rows: string[] = [];
                for (let r = 0; r < rowCount; r++) {
                  const parts: string[] = [];
                  for (let c = 0; c < columnCount; c++) {
                    const key = `${r}:${c}`;
                    if (covered.has(key)) continue;
                    const cell = at.get(key);
                    if (!cell) { parts.push('<td></td>'); continue; }
                    for (let rr = r; rr < Math.min(rowCount, r + cell.rowSpan); rr++) {
                      for (let cc = c; cc < Math.min(columnCount, c + cell.colSpan); cc++) {
                        if (rr !== r || cc !== c) covered.add(`${rr}:${cc}`);
                      }
                    }
                    const span = `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''}${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''}`;
                    const value = extractTextNode(cell.value, true).trim().replace(/\r?\n+/g, '<br>');
                    parts.push(`<td${span}>${value}</td>`);
                  }
                  rows.push(`<tr>${parts.join('')}</tr>`);
                }
                // Nested tables must stay valid HTML; adding <br> around their
                // <tr> elements would make the cells render incorrectly.
                const table = htmlContext ? `<table>${rows.join('')}</table>` : `<table>\n${rows.join('\n')}\n</table>`;
                return htmlContext ? table : `\n\n${table}\n\n`;
              }
              const grid = Array.from({ length: rowCount }, () => Array(columnCount).fill(''));
              for (const cell of cells) {
                grid[cell.row][cell.column] = extractTextNode(cell.value).trim().replace(/\|/g, '\\|').replace(/\r?\n+/g, '<br>');
              }
              let mdTable = '\n\n';
              grid.forEach((row: any, rIdx: number) => {
                let rowText = '| ';
                if (Array.isArray(row)) {
                  row.forEach((cell: any) => {
                    const cellStr = cell;
                    rowText += cellStr + ' | ';
                  });
                }
                mdTable += rowText + '\n';
                if (rIdx === 0) {
                  let sep = '|';
                  if (Array.isArray(row)) {
                    row.forEach(() => { sep += '---|'; });
                  }
                  mdTable += sep + '\n';
                }
              });
              return mdTable + '\n\n';
            }
            
            // Picture (type = 1667854372 or GenShapeObject = 544174951)
            if (obj.type === 611346787 || obj.type === 1667854372 || obj.id === 544174951) {
              let placeholder = '::HWP_IMAGE_PLACEHOLDER::';
              if (obj.info && obj.info.binID !== undefined) {
                placeholder = '::HWP_IMAGE_PLACEHOLDER_' + obj.info.binID + '::';
              }
              return '\n\n' + placeholder + '\n\n';
            }

            if (obj.text) result += extractTextNode(obj.text, htmlContext);
            else if (obj.chars) result += extractTextNode(obj.chars, htmlContext);
            else {
              Object.values(obj).forEach(v => {
                if (typeof v === 'string' || typeof v === 'number' || (typeof v === 'object' && v !== null)) {
                   result += extractTextNode(v, htmlContext);
                }
              });
            }
            
            if ('controls' in obj || 'lines' in obj) {
              result += '\n\n';
            }
          }
          return result;
        };
        
        if (hwpDoc && hwpDoc.sections) {
          text = extractTextNode(hwpDoc.sections);
          // hwpDoc 객체를 외부에 노출하여 이미지 맵핑에 활용할 수 있도록 함
          (view as any)._parsedHwpDoc = hwpDoc;
        }
    } catch (parseError: any) {
      if (useRecovery) console.info('[HWP import] 비압축/혼합 이미지 문서: 내장 복구 파서 사용');
      else console.warn('[HWP import] 기본 파서 실패, 본문 복구 시도:', parseError);
      
      const cfb = await import('cfb');
      const pako = (await import('pako')).default;

      // 2단계: cfb 라이브러리로 수동 텍스트 레코드 복구 시도
      const cfbFile = hwpContainer;
      const fileHeader = cfbFile.FileIndex.find(entry=>entry.name === 'FileHeader');
      if (!fileHeader?.content) throw new Error('HWP FileHeader를 찾을 수 없습니다.');
      const compressed = readHwpCompression(new Uint8Array(fileHeader.content));
      
      // BodyText 내부의 Section 스트림 엔트리들 수집
      const sectionEntries = cfbFile.FileIndex.filter((entry,index) => 
        entry.type === 2 && // 2 = stream
        /(?:^|\/)BodyText\/Section\d+$/i.test(cfbFile.FullPaths[index].replace(/\\/g,'/')) &&
        entry.size > 0
      );
      
      if (sectionEntries.length === 0) {
        throw new Error('HWP 문서 내에서 본문 텍스트 스트림(Section)을 찾을 수 없습니다.');
      }
      
      // Section 엔트리 이름 정렬 (Section0, Section1 ... 순)
      sectionEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      
      let fallbackText = '';
      
      for (const entry of sectionEntries) {
        const streamData = new Uint8Array(entry.content);
        let decrypted: Uint8Array;
        
        try {
          decrypted = decodeHwpBody(streamData, compressed, data=>pako.inflateRaw(data));
        } catch (e) {
          throw new Error(`HWP 본문 ${entry.name}의 압축을 해제하지 못했습니다. 파일 손상 여부를 확인해 주세요.`);
        }
        
        // 문단 텍스트(HWPTAG_PARA_TEXT, TagId = 67) 레코드 바이트 스캔
        let offset = 0;
        while (offset < decrypted.length) {
          if (offset + 4 > decrypted.length) break;
          
          const header = decrypted[offset] | 
                         (decrypted[offset + 1] << 8) | 
                         (decrypted[offset + 2] << 16) | 
                         (decrypted[offset + 3] << 24);
          offset += 4;
          
          const tagId = header & 0x3ff;
          let recordSize = (header >> 20) & 0xfff;
          
          if (recordSize === 0xfff) {
            if (offset + 4 > decrypted.length) break;
            recordSize = decrypted[offset] | 
                         (decrypted[offset + 1] << 8) | 
                         (decrypted[offset + 2] << 16) | 
                         (decrypted[offset + 3] << 24);
            offset += 4;
          }
          
          if (offset + recordSize > decrypted.length) break;
          const recordData = decrypted.subarray(offset, offset + recordSize);
          offset += recordSize;
          
          if (tagId === 67) {
            const segment = decodeHwpParagraph(recordData).trimEnd();
            if (segment.trim()) fallbackText += segment + '\n\n';
          } else if (tagId === 85 && recordData.length >= 73) {
            // Picture record: BinData ID follows the 68-byte geometry and
            // three image-effect bytes. Use the actual ID, never file order.
            const binId = recordData[71] | (recordData[72] << 8);
            if (binId > 0) fallbackText += `\n\n::HWP_IMAGE_PLACEHOLDER_${binId-1}::\n\n`;
          }
        }
      }
      text = fallbackText;
      console.info('[HWP import] 본문 복구 완료', { inputCompressed: compressed, sections: sectionEntries.length, textChars: text.length });
    }

    // 💡 3단계: OLE BinData 내 첨부 이미지 디코딩 및 미디어 결합 파이프라인
    const imageTags: string[] = [];
    const imageMap: Record<number, string> = {};
    let parsedDoc = (view as any)._parsedHwpDoc;

    try {
      if (parsedDoc && parsedDoc.info && parsedDoc.info.binData && parsedDoc.info.binData.length > 0 && imageSaveCallback) {
        // hwp.js가 성공적으로 파싱한 경우, 해제된 이미지를 그대로 사용
        const binDataArray = parsedDoc.info.binData;
        for (let i = 0; i < binDataArray.length; i++) {
          const image = binDataArray[i];
          if (!image || !image.payload) continue;
          
          const ext = (image.extension || 'png').toLowerCase();
          let payload = new Uint8Array(image.payload);
          let convertedBmp = false;
          if (ext === 'tif' || ext === 'tiff') {
            const {hwpTiffToPng} = await import('./hwpImages');
            payload = hwpTiffToPng(payload);
          }
          if (ext === 'bmp') {
            const {hwpBmpToPng} = await import('./hwpImages');
            const png = hwpBmpToPng(payload);
            if (png) {payload=png;convertedBmp=true;}
          }
          const base64 = Buffer.from(payload).toString('base64');
          let mimeType = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'bmp' && !convertedBmp) mimeType = 'image/bmp';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'svg') mimeType = 'image/svg+xml';
          
          try {
            const src = await imageSaveCallback(base64, mimeType);
            const imgTag = `<img src="${src}" alt="image_${i}" style="max-width: 100%; height: auto;" />`;
            imageTags.push(imgTag);
            imageMap[i] = imgTag;
          } catch (e) {
            console.error('이미지 저장 콜백 실패 (hwp.js):', e);
          }
        }
      } else {
        // fallbackText 등을 탔거나 binData가 비어있는 경우 OLE CFB로 강제 추출
        const cfb = await import('cfb');
        const pako = (await import('pako')).default;
        const cfbFile = hwpContainer;
        const imageEntries = cfbFile.FileIndex.filter((entry: any) => 
          entry.type === 2 && 
          (
            entry.name.toLowerCase().includes('bindata') ||
            entry.name.toLowerCase().includes('bin00') ||
            /bin\d+/i.test(entry.name)
          ) && 
          entry.size > 0 &&
          !entry.name.toLowerCase().endsWith('.wmf')
        );
        
        imageEntries.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        
        if (imageEntries.length > 0 && imageSaveCallback) {
          for (const entry of imageEntries) {
            const streamData = new Uint8Array(entry.content);
            let decrypted: Uint8Array;
            try { decrypted = pako.inflate(streamData); }
            catch {
              try { decrypted = pako.inflateRaw(streamData); }
              catch {
                try { decrypted = pako.inflateRaw(streamData.subarray(2)); }
                catch (err) { decrypted = streamData; }
              }
            }
            
            const ext = entry.name.split('.').pop()?.toLowerCase() || 'png';
            if (ext === 'tif' || ext === 'tiff') {
              const {hwpTiffToPng} = await import('./hwpImages');
              decrypted = hwpTiffToPng(decrypted);
            }
            const base64 = Buffer.from(decrypted).toString('base64');
            let mimeType = 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'bmp') mimeType = 'image/bmp';
            else if (ext === 'gif') mimeType = 'image/gif';
            else if (ext === 'webp') mimeType = 'image/webp';
            else if (ext === 'svg') mimeType = 'image/svg+xml';
            
            try {
              const src = await imageSaveCallback(base64, mimeType);
              const imgTag = `<img src="${src}" alt="${entry.name.split('/').pop()}" style="max-width: 100%; height: auto;" />`;
              imageTags.push(imgTag);
              
              // HEX ID 추출 (예: BIN000A.bmp -> A -> 10)
              const binMatch = entry.name.match(/bin0*([0-9a-f]+)\./i);
              if (binMatch) {
                const binId = parseInt(binMatch[1], 16) - 1; // 1-based index in file -> 0-based binID
                imageMap[binId] = imgTag;
              }
            } catch (saveError) { throw saveError; }
          }
        }
      }
    } catch (cfbError) { throw cfbError; }
    
    // 💡 이미지 플레이스홀더 치환 (매핑된 binID 우선, 나머지는 순차)
    let replacedText = text;
    const usedImages = new Set<string>();
    
    // 1. binID 매핑된 플레이스홀더 치환
    for (const [binId, imgTag] of Object.entries(imageMap)) {
      const ph = `::HWP_IMAGE_PLACEHOLDER_${binId}::`;
      if (replacedText.includes(ph)) usedImages.add(imgTag);
      replacedText = replacedText.replaceAll(ph, imgTag);
    }
    
    // 2. 매핑되지 못한 남은 특정 ID 플레이스홀더 정리
    replacedText = replacedText.replace(/::HWP_IMAGE_PLACEHOLDER_\d+::/g, '');
    
    // 3. 범용 플레이스홀더 (fallbackText 등에서 삽입한 경우) 순차 치환
    let imageIdx = 0;
    while (replacedText.includes('::HWP_IMAGE_PLACEHOLDER::') && imageIdx < imageTags.length) {
      replacedText = replacedText.replace('::HWP_IMAGE_PLACEHOLDER::', imageTags[imageIdx]);
      usedImages.add(imageTags[imageIdx]);
      imageIdx++;
    }
    replacedText = replacedText.replaceAll('::HWP_IMAGE_PLACEHOLDER::', ''); 
    
    // 💡 남은 이미지는 하단 첨부 이미지 목록에 순차 나열
    // (이미 맵핑에 사용된 태그도 남을 수 있으나, 보통 fallback일때만 발생함)
    const remainingImages = imageTags.filter(tag=>!usedImages.has(tag));
    if (remainingImages.length && !parsedDoc) {
      replacedText += '\n\n---\n### 📎 첨부 이미지 목록\n\n';
      replacedText += remainingImages.join('\n\n');
    }
    replacedText = cleanHwpText(replacedText).replace(/\n{3,}/g, '\n\n');

    const lines = replacedText.split('\n');
    let isInTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!isInTable) {
          // 표의 시작 감지! 열(Column) 개수를 세어 구분선 구성
          const colCount = line.split('|').length - 2; // 양 끝 제외한 열 개수
          if (colCount > 0 && !/^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[i + 1] || '')) {
            const separator = '|' + Array(colCount).fill('---').join('|') + '|';
            lines.splice(i + 1, 0, separator);
            i++; // 삽입된 구분선 인덱스 패스
          }
          isInTable = true;
        }
      } else if (line === '') {
        // 빈 줄을 만나면 표 구역 종료
        isInTable = false;
      } else {
        isInTable = false;
      }
    }
    replacedText = lines.join('\n');
    // Compact the imported manuscript; only tables need separating blank rows.
    const compactLines: string[] = [];
    const isMarkdownTableRow = (line: string) => /^\s*\|/.test(line);
    let pendingBlank = false;
    for (const line of replacedText.split('\n')) {
      if (!line.trim()) { pendingBlank = true; continue; }
      const previous = compactLines[compactLines.length - 1];
      if (previous !== undefined) {
        const previousIsTable = isMarkdownTableRow(previous);
        const currentIsTable = isMarkdownTableRow(line);
        if (previousIsTable !== currentIsTable || (pendingBlank && previousIsTable && currentIsTable)) {
          compactLines.push('');
        }
      }
      compactLines.push(line);
      pendingBlank = false;
    }
    replacedText = compactLines.join('\n');
    
    text = convertFormCheckboxes(replacedText);
    return text.trim() || '[HWP 텍스트 추출에 실패했습니다 (지원하지 않는 포맷일 수 있습니다)]';
  } catch (error: any) {
    console.error('HWP Import Error:', error);
    
    const errorMsg = String(error?.message || error || '');
    
    // 이미 custom 에러를 던진 경우 그대로 전파 (중복 래핑 방지)
    if (errorMsg.includes('HWPX') || errorMsg.includes('복합 문서') || errorMsg.includes('올바른 한글 문서')) {
      throw error;
    }
    
    if (errorMsg.includes('invalid block type') || errorMsg.includes('incorrect header check') || errorMsg.includes('inflate') || errorMsg.includes('zlib')) {
      throw new Error(
        '한글 문서(HWP)의 내부 데이터 압축을 푸는 중 오류가 발생했습니다.\n\n' +
        '암호화되거나 배포용 문서로 잠금 설정된 파일일 수 있습니다. ' +
        '또는 HWPX 파일의 확장자만 수동으로 .hwp로 변경한 파일일 수 있으니 일반 HWP로 다른 이름으로 저장하여 업로드해 주세요.'
      );
    }
    
    throw new Error(error?.message || String(error) || '한글 파일(HWP)을 읽는 중 오류가 발생했습니다.');
  }
}

