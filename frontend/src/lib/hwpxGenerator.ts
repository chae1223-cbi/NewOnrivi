/** HWPX ZIP/XML export from the rendered preview. Text and tables remain editable. */
import JSZip from 'jszip';

import { BASE_HEADER_XML } from './hwpxHeaderTemplate';
import { ExtractedImage } from './exportMediaHelper';
import { buildHwpxHeader } from './hwpxStyles';

function escapeXml(text: string): string {
  return (text || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface HwpxOptions {
  title?: string;
  creator?: string;
  images?: ExtractedImage[];
  defaultFont?: string;

}

/**
 * 미리보기 DOM 요소를 한글 OWPML(.hwpx) 표준 규격 파일로 생성하여 Blob 반환
 */
export async function generateHwpx(containerEl: HTMLElement, options: HwpxOptions = {}): Promise<Blob> {
  const docTitle = options.title || '문서';
  const images = options.images || [];
  for (const image of Array.from(containerEl.querySelectorAll('img'))) {
    if (!image.closest('.no-export') && !image.closest('[data-export-img-id]')) throw new Error('문서의 이미지를 준비하지 못했습니다. 이미지 연결을 확인해 주세요.');
  }
  for (const image of images) {
    const bytes = new Uint8Array(image.buffer, 0, Math.min(8, image.buffer.byteLength));
    if (![137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)) throw new Error('한글 문서 이미지가 올바른 PNG 형식이 아닙니다.');
  }
  const zip = new JSZip();

  // 1. mimetype (OWPML 규격: 압축 없이 STORE 모드로 패키징)
  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });

  // 2. version.xml (한컴오피스가 가장 먼저 판독하는 핵심 버전 파일)
  zip.file(
    'version.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>'
  );

  // 3. settings.xml (커서 위치 및 환경 설정)
  zip.file(
    'settings.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="16"/></ha:HWPApplicationSetting>'
  );

  // 4. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/><ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/><ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/></ocf:rootfiles></ocf:container>'
  );

  // 5. META-INF/manifest.xml
  zip.file(
    'META-INF/manifest.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>'
  );

  // 6. META-INF/container.rdf
  zip.file(
    'META-INF/container.rdf',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>'
  );

  // 7. Contents/content.hpf (매니페스트에 이미지 리소스 등록)
  let manifestItems = `
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  `;

  images.forEach((img) => {
    manifestItems += `<opf:item id="BIN${img.id}" href="BinData/BIN${img.id}.png" media-type="image/png" isEmbeded="1"/>\n`;
    // 한컴오피스는 BinData 바이너리를 STORE(무압축)로 읽는 것을 가장 신뢰함
    zip.file(`BinData/BIN${img.id}.png`, img.buffer, { compression: 'STORE' });
  });

  zip.file(
    'Contents/content.hpf',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="2.0" unique-identifier="BookId"><opf:metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><opf:title>${escapeXml(docTitle)}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">Onrivi Author</opf:meta></opf:metadata><opf:manifest>${manifestItems}</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`
  );

  // Embedded binaries are registered in the package manifest, not refList.

  // 9. Rendered document content; source Markdown is never emitted as prose.
  const { sectionXml, plainText, maxListDepth } = buildSectionXml(containerEl, images);
  zip.file('Contents/header.xml', buildHwpxHeader(BASE_HEADER_XML, options.defaultFont, maxListDepth));
  zip.file('Contents/section0.xml', sectionXml);

  // 10. Preview/PrvText.txt (한컴 뷰어/검색용 텍스트 프리뷰)
  zip.file('Preview/PrvText.txt', plainText || `${docTitle}\n`);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/hwp+zip' });
}

/**
 * HTML DOM 구조를 순회하여 한글 OWPML 본문 section0.xml 및 평문 텍스트 생성
 */
function buildSectionXml(containerEl: HTMLElement, images: ExtractedImage[]): { sectionXml: string; plainText: string; maxListDepth: number } {
  const pListXml: string[] = [];
  const textLines: string[] = [];
  let pCounter = 0;
  let tblCounter = 100000;
  let picCounter = 200000;
  let maxListDepth = 0;

  const imageMap = new Map<number, ExtractedImage>(images.map((img) => [img.id, img]));

  // 🌟 [핵심 안정성 가드] 첫 번째 문단에 반드시 필요한 A4 용지설정(secPr) 및 colPr, linesegarray 주입
  // A4 크기: 59528 x 84186 (1/7200 inch 단위 = 210mm x 297mm)
  // 좌우여백 8504 (30mm), 상하여백 5668/4252 (20mm/15mm)
  pListXml.push(`
  <hp:p id="${pCounter++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
        <hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>
        <hp:pagePr landscape="WIDELY" width="59528" height="84186" gutterType="LEFT_ONLY">
          <hp:margin header="4252" footer="4252" gutter="0" left="8504" right="8504" top="5668" bottom="4252"/>
        </hp:pagePr>
        <hp:footNotePr>
          <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>
          <hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/>
          <hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/>
          <hp:numbering type="CONTINUOUS" newNum="1"/>
          <hp:placement place="EACH_COLUMN" beneathText="0"/>
        </hp:footNotePr>
        <hp:endNotePr>
          <hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>
          <hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/>
          <hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/>
          <hp:numbering type="CONTINUOUS" newNum="1"/>
          <hp:placement place="END_OF_DOCUMENT" beneathText="0"/>
        </hp:endNotePr>
        <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER">
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
        <hp:pageBorderFill type="EVEN" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER">
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
        <hp:pageBorderFill type="ODD" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER">
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="0"><hp:t/></hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/>
    </hp:linesegarray>
  </hp:p>`);

  // 인라인 노드들을 <hp:run> 조각들로 분할 변환
  function parseInlines(element: Node, baseCharPrId: number = 0): string {
    let result = '';

    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text) {
          result += `<hp:run charPrIDRef="${baseCharPrId}"><hp:t>${escapeXml(text)}</hp:t></hp:run>`;
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        let charPrId = baseCharPrId;
        const isBold = tag === 'strong' || tag === 'b' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight) >= 600;
        const isItalic = tag === 'em' || tag === 'i' || el.style.fontStyle === 'italic';
        const isCode = tag === 'code';
        const isLink = tag === 'a';

        if (isLink) charPrId = 13; // 파란색 밑줄
        else if (isCode) charPrId = 12; // 인라인 코드
        else if (isBold) charPrId = 10; // 볼드체
        else if (isItalic) charPrId = 11; // 이탤릭체

        if (tag === 'br') {
          result += `<hp:run charPrIDRef="${charPrId}"><hp:t><hp:lineBreak/></hp:t></hp:run>`;
          return;
        }

        result += parseInlines(el, charPrId);
      }
    });

    return result;
  }

  // 블록 요소를 순회하며 OWPML 단락, 표, 이미지 배치
  function processBlockNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) {
        const p = containerEl.ownerDocument.createElement('p');
        p.textContent = node.textContent;
        processBlockNode(p);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // 불필요한 위젯, 스크립트, 병합된 캡션 p 태그 제외
    if (
      tag === 'script' ||
      tag === 'style' ||
      el.classList.contains('no-export') ||
      el.classList.contains('preview-toolbar-root') ||
      el.classList.contains('codeblock-header') ||
      el.getAttribute('data-export-caption-merged') === 'true'
    ) {
      return;
    }

    // 🌟 [핵심] 이미지 또는 Mermaid 다이어그램 개체 렌더링 (<hp:pic>)
    const targetImgEl = el.hasAttribute('data-export-img-id') ? el : el.querySelector('[data-export-img-id]');
    if (targetImgEl && (el.hasAttribute('data-export-img-id') || tag === 'figure' || tag === 'img' || el.classList.contains('mermaid-svg-container') || el.classList.contains('mermaid-block-container') || el.classList.contains('onrivi-image-wrapper'))) {
      const imgIdStr = targetImgEl.getAttribute('data-export-img-id');
      const imgId = parseInt(imgIdStr || '0', 10);
      const imgData = imageMap.get(imgId);
      if (!imgData) throw new Error('한글 문서 이미지 참조가 올바르지 않습니다.');

      if (imgData) {
        const caption = targetImgEl.getAttribute('data-export-caption') || imgData.caption || '';
        // A4 본문 기본 너비: 42520 HWP단위 (150mm), 기본 높이: 56690 HWP단위 (200mm), 1px = 75 HWP단위
        const maxW_hwp = 42520;
        const maxH_hwp = 56690;
        const origW_hwp = Math.max(1, imgData.width) * 75;
        const origH_hwp = Math.max(1, imgData.height) * 75;
        const scale = Math.min(1, maxW_hwp / origW_hwp, maxH_hwp / origH_hwp);
        const w_hwp = Math.round(origW_hwp * scale);
        const h_hwp = Math.round(origH_hwp * scale);
        

        const currentPicId = picCounter++;

        pListXml.push(`
          <hp:p id="${pCounter++}" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
            <hp:run charPrIDRef="0">
              <hp:pic id="${currentPicId}" instid="${currentPicId}" href="" groupLevel="0" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" reverse="0">
                <hp:offset x="0" y="0"/>
                <hp:orgSz width="${w_hwp}" height="${h_hwp}"/>
                <hp:curSz width="${w_hwp}" height="${h_hwp}"/>
                <hp:flip horizontal="0" vertical="0"/>
                <hp:rotationInfo rotateimage="1" angle="0" centerX="${Math.round(w_hwp / 2)}" centerY="${Math.round(h_hwp / 2)}"/>
                <hp:renderingInfo>
                  <hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>
                  <hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>
                  <hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>
                </hp:renderingInfo>
                <hc:img binaryItemIDRef="BIN${imgId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/>
                <hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${w_hwp}" y="0"/><hc:pt2 x="${w_hwp}" y="${h_hwp}"/><hc:pt3 x="0" y="${h_hwp}"/></hp:imgRect>
                <hp:imgClip left="0" right="${w_hwp}" top="0" bottom="${h_hwp}"/>
                <hp:inMargin left="0" right="0" top="0" bottom="0"/>
                <hp:imgDim dimwidth="${w_hwp}" dimheight="${h_hwp}"/>
                <hp:effects/>
                <hp:sz width="${w_hwp}" widthRelTo="ABSOLUTE" height="${h_hwp}" heightRelTo="ABSOLUTE" protect="0"/>
                <hp:pos treatAsChar="1" affectLSpacing="1" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/>
                <hp:outMargin left="0" right="0" top="0" bottom="0"/>
              </hp:pic>
              <hp:t/>
            </hp:run>
          </hp:p>
        `);

        if (caption) {
          textLines.push(caption);
          pListXml.push(`
            <hp:p id="${pCounter++}" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
              <hp:run charPrIDRef="11"><hp:t>${escapeXml(caption)}</hp:t></hp:run>
            </hp:p>
          `);
        }
        return;
      }
    }

    // 1. 헤딩 (H1 ~ H6) — 원본 스타일을 반영한 코발트 블루 및 바(|) 조판
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag.substring(1), 10);
      let charPrId = 14; // H1
      if (level === 2) charPrId = 15;
      else if (level === 3) charPrId = 16;
      else if (level >= 4) charPrId = 17;

      const inlines = parseInlines(el, charPrId);
      textLines.push(el.textContent || '');

      // 원본의 좌측 코발트 세로바(|) 느낌을 HWPX에도 적용
      const accentPrefix = '';

      pListXml.push(`
        <hp:p id="${pCounter++}" paraPrIDRef="23" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
          ${accentPrefix}
          ${inlines}
        </hp:p>
      `);
      return;
    }

    // 2. 단락 (P)
    if (tag === 'p') {
      if (el.querySelector('img,[data-export-img-id]')) {
        let text = containerEl.ownerDocument.createElement('p');
        const flush = () => { if (text.textContent?.trim()) processBlockNode(text); text = containerEl.ownerDocument.createElement('p'); };
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.ELEMENT_NODE && ((child as Element).matches('img,[data-export-img-id]') || (child as Element).querySelector('img,[data-export-img-id]'))) {
            flush(); processBlockNode(child);
          } else text.append(child.cloneNode(true));
        }
        flush();
        return;
      }
      const inlines = parseInlines(el, 0);
      const text = el.textContent || '';
      if (text.trim()) {
        textLines.push(text);
        pListXml.push(`
          <hp:p id="${pCounter++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
            ${inlines}
          </hp:p>
        `);
      }
      return;
    }

    // 3. 인용구 (BLOCKQUOTE)
    if (tag === 'blockquote') {
      const start = pListXml.length;
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) processBlockNode(child);
        else if (child.textContent?.trim()) {
          const paragraph = containerEl.ownerDocument.createElement('p');
          paragraph.textContent = child.textContent;
          processBlockNode(paragraph);
        }
      }
      for (let index = start; index < pListXml.length; index++) {
        // Apply quote layout only to outer paragraphs; embedded tables retain their styles.
        pListXml[index] = pListXml[index].replace(/^(\s*<hp:p\b[^>]*paraPrIDRef=")[^"]*/, '$120');
      }
      return;
    }

    // 4. 리스트 (UL / OL)
    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      let listDepth = 0;
      for (let parent = el.parentElement; parent && containerEl.contains(parent); parent = parent.parentElement) {
        if (parent.matches('ul,ol')) listDepth++;
      }
      maxListDepth = Math.max(maxListDepth, listDepth);
      const paraPrId = listDepth ? 25 + listDepth : 1;
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
      items.forEach((item, idx) => {
        const prefix = item.hasAttribute('data-onrivi-report-marker') ? '　'.repeat(Math.max(0,Number(el.getAttribute('data-onrivi-report-depth'))-1)) : isOrdered ? `${(Number(el.getAttribute('start')) || 1) + idx}. ` : `• `;
        let first = true;
        let pending = containerEl.ownerDocument.createElement('p');
        const flush = () => {
          if (!pending.textContent?.trim()) { pending = containerEl.ownerDocument.createElement('p');return; }
          const marker = first ? prefix : '';
          textLines.push(`${marker}${pending.textContent || ''}`);
          pListXml.push(`<hp:p id="${pCounter++}" paraPrIDRef="${paraPrId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="10"><hp:t>${escapeXml(marker)}</hp:t></hp:run>${parseInlines(pending,0)}</hp:p>`);
          first = false;pending = containerEl.ownerDocument.createElement('p');
        };
        // Node views wrap paragraphs and child lists in divs. Walk those wrappers
        // in document order; never flatten child lists into the parent's text.
        const visit = (child: Node) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const element = child as HTMLElement;
            if (element.matches('script,style,.no-export,[data-editor-controls]')) return;
            if (element.matches('ul,ol,table,figure,pre,blockquote,img,[data-export-img-id],.mermaid-svg-container,.onrivi-image-wrapper')) {
              flush();processBlockNode(child);return;
            }
            if (element.matches('div,section,article,p')) {
              if (element.tagName === 'P') flush();
              Array.from(element.childNodes).forEach(visit);
              if (element.tagName === 'P') flush();
              return;
            }
          }
          pending.append(child.cloneNode(true));
        };
        Array.from(item.childNodes).forEach(visit);flush();
      });
      return;
    }

    // 5. 코드 블록 (PRE) — 상단 배지 라인 및 다크 모노스페이스 단락 조판
    if (tag === 'pre') {
      const codeEl = el.querySelector('code') || el;
      const renderedLines = Array.from(codeEl.children);
      const text = codeEl.getAttribute('data-code-text') ?? (renderedLines.length && renderedLines.every(line=>line.classList.contains('onrivi-line'))
        ? renderedLines.map(line=>(line.textContent || '').replace(/^\u200b$/,'')).join('\n')
        : codeEl.textContent || '');
      const lines = text.split('\n');

      let langBadge = 'TEXT';
      const classAttr = (codeEl.className || el.className || '');
      const langMatch = classAttr.match(/language-([a-zA-Z0-9_-]+)/);
      if (langMatch && langMatch[1]) {
        langBadge = langMatch[1].toUpperCase();
      }

      langBadge = el.closest('.codeblock-area')?.getAttribute('data-code-title') || codeEl.getAttribute('data-code-title') || langBadge;

      // 배지 헤더 줄
      pListXml.push(`
        <hp:p id="${pCounter++}" paraPrIDRef="24" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
          <hp:run charPrIDRef="10"><hp:t>[${escapeXml(langBadge)}]</hp:t></hp:run>
        </hp:p>
      `);

      lines.forEach((line) => {
        textLines.push(line);
        pListXml.push(`
          <hp:p id="${pCounter++}" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
            <hp:run charPrIDRef="12"><hp:t>${escapeXml(line)}</hp:t></hp:run>
          </hp:p>
        `);
      });
      return;
    }

    // 6. 구분선 (HR)
    if (tag === 'hr') {
      pListXml.push(`
        <hp:p id="${pCounter++}" paraPrIDRef="25" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
          <hp:run charPrIDRef="0"><hp:t/></hp:run>
        </hp:p>
      `);
      return;
    }

    // 7. 표 (TABLE) — 🌟 [OWPML KS X 6101 정규 표준 표 구조]
    if (tag === 'table') {
      const trs = Array.from(el.querySelectorAll('tr')).filter(tr=>tr.closest('table') === el);
      if (trs.length === 0) return;

      const rowCnt = trs.length;
      let colCnt = 1;
      trs.forEach((tr) => {
        const cnt = Array.from(tr.children).reduce((sum,cell)=>sum+((cell as HTMLTableCellElement).colSpan || 1),0);
        if (cnt > colCnt) colCnt = cnt;
      });

      // A4 본문 기본 너비: 42520 HWP단위 (150mm)
      const totalWidth = 42520;
      const colWidth = Math.floor(totalWidth / colCnt);
      const rowHeight = 1800;
      const occupied = new Set<string>();

      let tblRowsXml = '';

      trs.forEach((tr, rIdx) => {
        tblRowsXml += `<hp:tr>`;
        const cells = Array.from(tr.children).filter((c) => {
          const t = c.tagName.toLowerCase();
          return t === 'th' || t === 'td';
        });

        let cIdx = 0;
        cells.forEach((cell) => {
          while (occupied.has(`${rIdx}:${cIdx}`)) cIdx++;
          const colspan = Math.max(1, (cell as HTMLTableCellElement).colSpan || 1);
          const rowspan = Math.min(rowCnt-rIdx, Math.max(1,(cell as HTMLTableCellElement).rowSpan || 1));
          for (let row=rIdx;row<rIdx+rowspan;row++) for(let col=cIdx;col<cIdx+colspan;col++) occupied.add(`${row}:${col}`);
          colCnt = Math.max(colCnt,cIdx+colspan);
          const isTh = cell.tagName.toLowerCase() === 'th';
          const inlines = parseInlines(cell, isTh ? 17 : 0);
          textLines.push(cell.textContent || '');

          tblRowsXml += `
            <hp:tc name="" header="${isTh ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="2">
              <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">
                <hp:p paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="${pCounter++}">
                  ${inlines}
                </hp:p>
              </hp:subList>
              <hp:cellAddr colAddr="${cIdx}" rowAddr="${rIdx}"/>
              <hp:cellSpan colSpan="${colspan}" rowSpan="${rowspan}"/>
              <hp:cellSz width="${colWidth*colspan}" height="${rowHeight*rowspan}"/>
              <hp:cellMargin left="510" right="510" top="141" bottom="141"/>
            </hp:tc>
          `;
          cIdx += colspan;
        });
        tblRowsXml += `</hp:tr>`;
      });

      const currentTblId = tblCounter++;
      const tblContainerXml = `
        <hp:p id="${pCounter++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
          <hp:run charPrIDRef="0">
            <hp:tbl id="${currentTblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="${rowCnt}" colCnt="${colCnt}" cellSpacing="0" borderFillIDRef="2" noAdjust="0">
              <hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${rowHeight * rowCnt}" heightRelTo="ABSOLUTE" protect="0"/>
              <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
              <hp:outMargin left="0" right="0" top="0" bottom="0"/>
              <hp:inMargin left="510" right="510" top="141" bottom="141"/>
              ${tblRowsXml}
            </hp:tbl>
          </hp:run>
        </hp:p>
      `;

      pListXml.push(tblContainerXml);
      return;
    }

    // 8. 일반 래퍼 컨테이너: 재귀 처리
    Array.from(el.childNodes).forEach(processBlockNode);
  }

  Array.from(containerEl.childNodes).forEach(processBlockNode);

  const sectionXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"
        xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"
        xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"
        xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"
        xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history"
        xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page"
        xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:opf="http://www.idpf.org/2007/opf/"
        xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart"
        xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar"
        xmlns:epub="http://www.idpf.org/2007/ops"
        xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
  ${pListXml.join('\n')}
</hs:sec>`;

  return { sectionXml, plainText: textLines.join('\n'), maxListDepth };
}



