// ====================================================================
// 📊 [OMD-IO-docxGenerator-0001] docxGenerator.ts ➔ generateDocx
// 🎯 @KICK  : 미리보기 렌더링 DOM을 표준 Office Open XML(.docx) 파일로 조판 및 변환 사출
// 🛡️ @GUARD : JSZip 기반 100% 클라이언트/오프라인 구동, 미리보기 DOM 1:1 무결성, DrawingML 이미지/다이어그램 임베딩, 헤딩 코발트 바 & 라이트 음영 코드블록 완벽 조판
// 🚨 @PATCH : **2026-10-01** — [Word(.docx) 사출 시 우측 정렬(align="right" / text-align: right) 완벽 지원]: <p>, <div>, <span> 등 서명/날짜/발신인 우측 정렬 태그를 Word 정렬 XML(<w:jc w:val="right"/>)로 완벽 변환하여 전자책, 웹, Word 문서 간 시각적 일치 보장
// 🚨 @PATCH : **2026-10-01** — [Word(.docx) 사출 시 Heading keepNext 및 Caption 네이티브 스타일 매핑]: Heading1~Heading6에 keepNext를 선언하여 페이지 하단 단독 잔존(Orphan heading)을 원천 방지하고, figcaption을 Word 표준 Caption 스타일(<w:pStyle w:val="Caption"/>)로 지정 및 이미지-캡션 간 keepNext 연동을 통해 전문가급 Word 네이티브 조판 실현
// 🚨 @PATCH : **2026-10-01** — [미리보기 DOM 직접 파싱 기반 Word(.docx) 사출 엔진 전면 개편 및 마크다운 태그 누출 완전 해결]: marked AST 대신 이미 서식이 100% 렌더링된 미리보기 DOM을 직접 순회하여 유니코드 불릿(• ) 및 인라인 볼드/인라인 코드 태그(**, `) 누출을 원천 박멸하고, 코드블록 다크 배지([TEXT])를 단일 라이트 음영 카드로 일원화하며, 메타영역(Frontmatter) 제외 및 DrawingML 듀얼 클램프 이미지/Mermaid 완벽 임베딩 실현
// 🚨 @PATCH : **2026-10-01** — [DOCX 파일 오픈 오류 긴급 해결 및 MS Word 완벽 호환]: w:document 루트에 필수 DrawingML(wp, a, pic) 네임스페이스 선언 완비, docProps/core.xml·app.xml 패키징, Relationship Id 정규 순차 번호(rId2~) 매핑 및 wp:docPr/pic:cNvPr 고유 ID 분리로 Word 유효성 검사 에러 완전 차단
// 🚨 @PATCH : **2026-09-30** — MS Word (.docx) 내보내기 생성기 신규 구현 (구글 Docs 및 Word 완벽 호환)
// 🔗 @CALLS : JSZip, ExtractedImage (exportMediaHelper.ts)
// ====================================================================

import JSZip from 'jszip';
import { ExtractedImage } from './exportMediaHelper';
import type { CssProfile, CssRuleSet } from '../types/cssProfile';
import { cssPx, wordRunProperties, wordParagraphProperties, wordSectionProperties, wordColor, EXPORT_FIGURE_HEIGHT_RATIO, EXPORT_LEAD_FIGURE_HEIGHT_RATIO, markLeadExportFigure } from './docxFormatting';

function escapeXml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface DocxOptions {
  title?: string;
  creator?: string;
  defaultFont?: string;
  images?: ExtractedImage[];
  markdown?: string;
  profile?: CssProfile;
  computedRules?: Record<string, CssRuleSet>;
}

/**
 * 미리보기 DOM 요소를 Office Open XML(.docx) 규격 파일로 생성하여 Blob 반환
 */
export async function generateDocx(containerEl: HTMLElement, options: DocxOptions = {}): Promise<Blob> {
  const docTitle = options.title || 'document';
  const defaultFont = options.defaultFont || options.profile?.pageStyle.fontFamily?.split(',')[0].trim().replace(/["']/g, '') || '맑은 고딕';
  const images = options.images || [];
  markLeadExportFigure(containerEl);
  for (const image of images) {
    const signature = new Uint8Array(image.buffer, 0, Math.min(8, image.buffer.byteLength));
    if (![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte)) {
      throw new Error('Word 이미지가 올바른 PNG 형식이 아닙니다. 내보내기를 다시 시도해 주세요.');
    }
  }

  const zip = new JSZip();

  const links: string[] = [];
  const numbering: string[] = [];
  const styleRule = (tag: string): CssRuleSet => ({ ...(options.profile?.rules as any)?.[tag], ...options.computedRules?.[tag] });
  const pageRule: CssRuleSet = { 'font-family': defaultFont, 'font-size': options.profile?.pageStyle.fontSize || '14.6667px', 'line-height': options.profile?.pageStyle.lineHeight || '1.15', ...options.computedRules?.body };
  const baseSize = cssPx(pageRule['font-size']) || 16;
  const section = wordSectionProperties(options.profile);

  // 1. [Content_Types].xml (이미지 포맷 Default 및 docProps Override 선언 완비)
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
  );

  // 3. docProps/core.xml & docProps/app.xml (Word 신뢰성 보장)
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(docTitle)}</dc:title>
  <dc:creator>Onrivi Author</dc:creator>
  <cp:lastModifiedBy>Onrivi Author</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`
  );

  zip.file(
    'docProps/app.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Onrivi Author</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Onrivi</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`
  );

  // 4. word/_rels/document.xml.rels (스타일 및 이미지 Relationships 등록 - 정규 순차 rId 할당)
  let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
`;

  // 이미지 ID -> 순차 rId 매핑
  const imageRelIdMap = new Map<number, string>();
  images.forEach((img, idx) => {
    const relId = `rId${idx + 2}`;
    imageRelIdMap.set(img.id, relId);
    relsXml += `  <Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${img.id}.png"/>\n`;
    // 바이너리 데이터 ZIP에 패키징
    zip.file(`word/media/image${img.id}.png`, img.buffer);
  });

  const documentXml = buildDocumentXml(containerEl, docTitle, defaultFont, images, imageRelIdMap,
    { options, links, numbering, section, baseSize, styleRule });
  relsXml += '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
  relsXml += links.join('') + '</Relationships>';
  zip.file('word/_rels/document.xml.rels', relsXml);
  zip.file('word/numbering.xml', `<?xml version="1.0" encoding="UTF-8"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${numbering.filter(value => value.startsWith('<w:abstractNum')).join('')}${numbering.filter(value => value.startsWith('<w:num ')).join('')}</w:numbering>`);
  const normal = { ...pageRule, ...styleRule('p') };
  const headingDefaults = [25.333, 20, 17.333, 16, 14.667, 13.333];
  const headingStyles = headingDefaults.map((size, index) => {
    const rule = { 'font-size': `${size}px`, 'font-weight': 'bold', 'margin-top': '16px', 'margin-bottom': '8px', ...styleRule(`h${index + 1}`) };
    return `<w:style w:type="paragraph" w:styleId="Heading${index + 1}"><w:name w:val="heading ${index + 1}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${index}"/>${wordParagraphProperties(rule, baseSize)}</w:pPr><w:rPr>${wordRunProperties(rule, baseSize)}</w:rPr></w:style>`;
  }).join('');
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults><w:rPrDefault><w:rPr>${wordRunProperties(normal, baseSize)}<w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/>${wordParagraphProperties(normal, baseSize)}</w:pPr></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
    ${headingStyles}<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style></w:styles>`);
  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/**
 * HTML DOM 구조를 순회하여 WordprocessingML 본문 문자열을 생성
 */
function buildDocumentXml(
  containerEl: HTMLElement,
  title: string,
  defaultFont: string,
  images: ExtractedImage[],
  imageRelIdMap: Map<number, string>,
  context: { options: DocxOptions; links: string[]; numbering: string[]; section: ReturnType<typeof wordSectionProperties>; baseSize: number; styleRule: (tag: string) => CssRuleSet }
): string {
  const bodyXmls: string[] = [];
  const imageMap = new Map<number, ExtractedImage>(images.map((img) => [img.id, img]));

  const bookmarks = new Map<string, { id: number; name: string }>();
  Array.from(containerEl.querySelectorAll('[id]')).forEach((element, index) => {
    const id = element.id;
    if (id && !bookmarks.has(id)) bookmarks.set(id, { id: index, name: `onrivi_${index}` });
  });
  let numberSequence = 0;
  const allocateNumbering = (ordered: boolean, level: number, start: number, format = 'decimal') => {
    const id = ++numberSequence;
    const levels = Array.from({ length: 9 }, (_, index) => `<w:lvl w:ilvl="${index}"><w:start w:val="1"/><w:numFmt w:val="${ordered ? format : 'bullet'}"/><w:lvlText w:val="${ordered ? `%${index + 1}.` : '•'}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="${(index + 1) * 360}"/></w:tabs><w:ind w:left="${(index + 1) * 360}" w:hanging="240"/></w:pPr></w:lvl>`).join('');
    context.numbering.push(`<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="multilevel"/>${levels}</w:abstractNum>`);
    context.numbering.push(`<w:num w:numId="${id}"><w:abstractNumId w:val="${id}"/><w:lvlOverride w:ilvl="${level}"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`);
    return id;
  };

  interface FormatState {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    underline?: boolean;
    code?: boolean;
    link?: boolean;
    rule?: CssRuleSet;
    whiteSpace?: string;
  }

  // 인라인 노드들을 <w:r> 런 조각들로 변환 (중첩 태그 및 서식 완벽 보존)
  function parseInlines(element: Node, format: FormatState = {}): string {
    const htmlElement = element as HTMLElement;
    const ownRule = htmlElement.tagName ? context.styleRule(htmlElement.tagName.toLowerCase()) : {};
    const inlineRule: CssRuleSet = {};
    if (htmlElement.style) for (const key of Array.from(htmlElement.style)) inlineRule[key] = htmlElement.style.getPropertyValue(key);
    format = { ...format, whiteSpace: htmlElement.getAttribute?.('data-docx-white-space') || htmlElement.style?.whiteSpace || format.whiteSpace || 'normal', rule: { ...format.rule, ...ownRule, ...inlineRule } };
    const elementId = htmlElement.getAttribute?.('id');
    const bookmark = elementId ? bookmarks.get(elementId) : undefined;
    let result = bookmark ? `<w:bookmarkStart w:id="${bookmark.id}" w:name="${bookmark.name}"/><w:bookmarkEnd w:id="${bookmark.id}"/>` : '';

    const isSourceLine = htmlElement.classList?.contains('onrivi-line') && htmlElement.closest('p') && !htmlElement.closest('pre, .codeblock-area');
    const previousLine = htmlElement.previousElementSibling?.classList.contains('onrivi-line');
    const lineBoundary = !!(isSourceLine && previousLine);
    if (lineBoundary) result += '<w:r><w:br/></w:r>';
    let afterLineBreak = lineBoundary;
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent || '';
        if (afterLineBreak) { text = text.replace(/^\r?\n/, ''); afterLineBreak = false; }
        if (!text) return;
        let rPr = '';
        if (Object.keys(format.rule || {}).length || format.bold || format.italic || format.strike || format.underline || format.code || format.link) {
          const rule = { ...format.rule };
          if (format.bold) delete rule['font-weight'];
          if (format.italic) delete rule['font-style'];
          if (format.code || format.link) delete rule.color;
          if (format.code) { delete rule['font-family']; delete rule['background-color']; }
          rPr = '<w:rPr>' + wordRunProperties(rule, context.baseSize);
          if (format.bold) rPr += '<w:b/>';
          if (format.italic) rPr += '<w:i/>';
          if (format.strike) rPr += '<w:strike/>';
          if (format.underline || format.link) rPr += '<w:u w:val="single"/>';
          if (format.link && !format.code) rPr += '<w:color w:val="1D4ED8"/>';
          if (format.code) {
            rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
            rPr += '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
            rPr += '<w:color w:val="BE185D"/>';
          }
          rPr += '</w:rPr>';
        }
        const preservesLines = /^(pre|pre-wrap|pre-line|break-spaces)$/.test(format.whiteSpace || '');
        text = text.replace(/\r\n?/g, '\n');
        if (!preservesLines) text = text.replace(/[\t\n\f ]+/g, ' ');
        const parts = preservesLines ? text.split(/([\n\t])/) : [text];
        const runs = parts.map(part => part === '\n' ? '<w:br/>' : part === '\t' ? '<w:tab/>' : `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`).join('');
        result += `<w:r>${rPr}${runs}</w:r>`;
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // 🌟 버튼 및 복사 위젯 등 내보내기 제외 요소 건너뛰기
        if (
          tag === 'button' ||
          tag === 'script' ||
          tag === 'style' ||
          el.classList.contains('no-export') ||
          el.classList.contains('copy-button-hook') ||
          el.classList.contains('copy-btn') ||
          el.classList.contains('preview-toolbar-root')
        ) {
          return;
        }

        if (tag === 'br' || el.classList.contains('onrivi-sentence-br')) {
          result += `<w:r><w:br/></w:r>`;
          afterLineBreak = true;
          return;
        }

        // 체크박스 input 태그 대응
        if (tag === 'input' && el.getAttribute('type') === 'checkbox') {
          const isChecked = el.hasAttribute('checked') || (el as HTMLInputElement).checked;
          result += `<w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic"/></w:rPr><w:t xml:space="preserve">${isChecked ? '☑ ' : '☐ '}</w:t></w:r>`;
          return;
        }

        if (tag === 'ul' || tag === 'ol') return; // Block lists are handled recursively, never flattened into a parent item.
        if (tag === 'a') {
          const href = el.getAttribute('href') || '';
          const runs = parseInlines(el, { ...format, link: true });
          if (href.startsWith('#')) {
            let destination = href.slice(1);
            try { destination = decodeURIComponent(destination); } catch {}
            const target = bookmarks.get(destination);
            result += target ? `<w:hyperlink w:anchor="${target.name}" w:history="1">${runs}</w:hyperlink>` : runs;
          } else if (/^(https?:|mailto:|tel:)/i.test(href)) {
            const id = `rIdLink${context.links.length + 1}`;
            context.links.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(href)}" TargetMode="External"/>`);
            result += `<w:hyperlink r:id="${id}" w:history="1">${runs}</w:hyperlink>`;
          } else result += runs;
          return;
        }

        // 인라인 스타일 및 태그 판별
        const isBold = format.bold || tag === 'strong' || tag === 'b' || el.style?.fontWeight === 'bold' || parseInt(el.style?.fontWeight || '0') >= 600;
        const isItalic = format.italic || tag === 'em' || tag === 'i' || el.style?.fontStyle === 'italic';
        const isStrike = format.strike || tag === 'del' || tag === 's' || tag === 'strike' || el.style?.textDecoration?.includes('line-through');
        const isUnderline = format.underline || tag === 'u' || el.style?.textDecoration?.includes('underline');
        const isCode = format.code || tag === 'code';
        const isLink = format.link || tag === 'a';

        result += parseInlines(el, {
          rule: format.rule,
          whiteSpace: format.whiteSpace,
          bold: isBold,
          italic: isItalic,
          strike: isStrike,
          underline: isUnderline,
          code: isCode,
          link: isLink,
        });
      }
    });

    return result;
  }

  // 이미지 및 다이어그램 개체 렌더링 (<w:drawing>)
  function renderDrawingML(imgData: ExtractedImage, caption: string = '', leadFigure = false): string {
    const maxW_emu = context.section.widthEmu; // ~150mm
    const maxH_emu = context.section.heightEmu * (leadFigure ? EXPORT_LEAD_FIGURE_HEIGHT_RATIO : EXPORT_FIGURE_HEIGHT_RATIO);
    const origW_emu = Math.max(1, imgData.width) * 9525;
    const origH_emu = Math.max(1, imgData.height) * 9525;
    const scale = Math.min(1, maxW_emu / origW_emu, maxH_emu / origH_emu);
    const cx = Math.round(origW_emu * scale);
    const cy = Math.round(origH_emu * scale);

    const relId = imageRelIdMap.get(imgData.id) || `rId2`;
    const imgSeq = (Array.from(imageRelIdMap.keys()).indexOf(imgData.id) >= 0 ? Array.from(imageRelIdMap.keys()).indexOf(imgData.id) : 0) + 1;

    let xml = `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/><w:keepLines/>
          ${caption ? '<w:keepNext/>' : ''}
          <w:spacing w:before="240" w:after="${caption ? 60 : 200}"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${cx}" cy="${cy}"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="${imgSeq}" name="Picture ${imgSeq}" descr="${escapeXml(imgData.alt || caption)}"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="0" name="Picture ${imgSeq}"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                      <a:stretch><a:fillRect/></a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${cx}" cy="${cy}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    if (caption) {
      xml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Caption"/>
            <w:jc w:val="center"/>
            <w:spacing w:before="60" w:after="240"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="${defaultFont}" w:eastAsia="${defaultFont}"/>
              <w:sz w:val="18"/>
              <w:szCs w:val="18"/>
              <w:color w:val="475569"/>
              <w:i/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(caption)}</w:t>
          </w:r>
        </w:p>
      `;
    }

    return xml;
  }

  // 블록 요소들을 순회하며 Word 단락 및 표 구성
  function processBlockNode(node: Node, listLevel = 0) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // 불필요한 위젯, 스크립트, 메타 블록, 병합된 캡션 p 태그 제외
    if (
      tag === 'script' ||
      tag === 'style' ||
      tag === 'button' ||
      el.classList.contains('no-export') ||
      el.classList.contains('preview-toolbar-root') ||
      el.classList.contains('frontmatter-block') ||
      el.classList.contains('metadata-block') ||
      el.classList.contains('codeblock-header') ||
      el.classList.contains('copy-button-hook') ||
      el.classList.contains('copy-btn') ||
      el.getAttribute('data-export-caption-merged') === 'true'
    ) {
      return;
    }

    // 🌟 [핵심] 이미지 또는 다이어그램 개체 렌더링 (<w:drawing>)
    const targetImgEl = el.hasAttribute('data-export-img-id') ? el : el.querySelector('[data-export-img-id]');
    if (targetImgEl && (
      el.hasAttribute('data-export-img-id') ||
      tag === 'figure' ||
      tag === 'img' ||
      tag === 'p' ||
      el.classList.contains('mermaid-svg-container') ||
      el.classList.contains('mermaid-block-container') ||
      el.classList.contains('onrivi-image-wrapper')
    )) {
      const imgIdStr = targetImgEl.getAttribute('data-export-img-id');
      const imgId = parseInt(imgIdStr || '0', 10);
      const imgData = imageMap.get(imgId);

      if (imgData) {
        const caption =
          targetImgEl.getAttribute('data-export-caption') ||
          el.querySelector('figcaption')?.textContent?.trim() ||
          imgData.caption ||
          '';
        bodyXmls.push(renderDrawingML(imgData, caption, !!targetImgEl.closest('[data-export-lead-figure]')));
        if (tag === 'p') {
          targetImgEl.remove();
          const remainingInlines = parseInlines(el);
          if (remainingInlines.trim()) {
            bodyXmls.push(`
              <w:p>
                <w:pPr>
                  <w:widowControl/>${wordParagraphProperties({ ...context.styleRule('p'), ...Object.fromEntries(Array.from(el.style).map(key => [key, el.style.getPropertyValue(key)])) }, context.baseSize)}
                </w:pPr>
                ${remainingInlines}
              </w:p>
            `);
          }
        }
        return;
      }
    }

    // 1. 헤딩 (H1 ~ H6)
    if (/^h[1-6]$/.test(tag)) {
      const level = tag.substring(1);
      const inlines = parseInlines(el);
      bodyXmls.push(`
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading${level}"/><w:keepLines/>
            <w:keepNext/>
          </w:pPr>
          ${inlines}
        </w:p>
      `);
      return;
    }

    // 1-1. 캡션 단독 노드 (FIGCAPTION)
    if (tag === 'figcaption') {
      const inlines = parseInlines(el);
      if (inlines.trim()) {
        bodyXmls.push(`
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Caption"/>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="240"/>
            </w:pPr>
            ${inlines}
          </w:p>
        `);
      }
      return;
    }

    // 2. 단락 (P)
    if (tag === 'p') {
      const inlines = parseInlines(el);
      if (inlines.trim()) {
        const rawAlign = (
          el.getAttribute('align') ||
          el.style?.textAlign ||
          el.closest('[align]')?.getAttribute('align') ||
          (el.closest('[style*="text-align"]') as HTMLElement)?.style?.textAlign ||
          ''
        ).toLowerCase();
        const jcXml = rawAlign === 'right' ? '<w:jc w:val="right"/>' : (rawAlign === 'center' ? '<w:jc w:val="center"/>' : '');
        bodyXmls.push(`
          <w:p>
            <w:pPr>
              <w:widowControl/>${wordParagraphProperties({ ...context.styleRule('p'), ...Object.fromEntries(Array.from(el.style).map(key => [key, el.style.getPropertyValue(key)])) }, context.baseSize)}
              ${jcXml}
            </w:pPr>
            ${inlines}
          </w:p>
        `);
      }
      return;
    }

    // 3. 인용구 (BLOCKQUOTE)
    if (tag === 'blockquote') {
      const startIndex = bodyXmls.length;
      const hasBlocks = Array.from(el.children).some(child => /^(p|div|ul|ol|table|figure|pre|blockquote|h[1-6])$/i.test(child.tagName));
      if (hasBlocks) {
        Array.from(el.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
            bodyXmls.push(`<w:p><w:pPr/>${parseInlines({ childNodes: [child] } as unknown as Node)}</w:p>`);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const element = child as HTMLElement;
            if (/^(p|div|ul|ol|table|figure|pre|blockquote|h[1-6])$/i.test(element.tagName)) processBlockNode(child, listLevel);
            else bodyXmls.push(`<w:p><w:pPr/>${parseInlines({ childNodes: [child] } as unknown as Node)}</w:p>`);
          }
        });
      } else bodyXmls.push(`<w:p><w:pPr/>${parseInlines(el)}</w:p>`);
      // 목록 번호 스타일의 hanging 들여쓰기가 인용문 테두리까지 이동하지 않게 한다.
      const quoteProps = '<w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="1D4ED8"/></w:pBdr><w:ind w:left="400" w:right="0" w:hanging="0"/>';
      for (let index = startIndex; index < bodyXmls.length; index++) {
        if (bodyXmls[index].trimStart().startsWith('<w:p>') && !bodyXmls[index].includes('<w:pBdr>')) {
          bodyXmls[index] = bodyXmls[index].replace(/<w:pPr\/>|<w:pPr>/, match => match === '<w:pPr/>' ? `<w:pPr>${quoteProps}</w:pPr>` : `<w:pPr>${quoteProps}`);
        }
      }
      return;
    }

    // Native Word numbering with independent list starts and preserved nested blocks.
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const level = Math.min(listLevel, 8);
      const items = Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'li');
      const start = el.hasAttribute('start') ? Number(el.getAttribute('start')) : 1;
      const type = el.getAttribute('type') || '';
      const format = ({ a: 'lowerLetter', A: 'upperLetter', i: 'lowerRoman', I: 'upperRoman' } as Record<string, string>)[type] || 'decimal';
      let numId = allocateNumbering(ordered, level, start, format);
      items.forEach(item => {
        if (ordered && item.hasAttribute('value')) numId = allocateNumbering(true, level, Number(item.getAttribute('value')) || 1, format);
        const own = item.cloneNode(true) as HTMLElement;
        own.querySelectorAll('ul, ol').forEach(nested => nested.remove());
        const hasCheckbox = own.querySelector('input[type="checkbox"]') !== null;
        const startIndex = bodyXmls.length;
        if (Array.from(own.children).some(child => /^(p|div|table|figure|pre|blockquote)$/i.test(child.tagName))) {
          Array.from(own.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) bodyXmls.push(`<w:p><w:pPr/>${parseInlines({ childNodes: [child] } as unknown as Node)}</w:p>`);
            else processBlockNode(child, listLevel);
          });
        } else bodyXmls.push(`<w:p><w:pPr/>${parseInlines(own)}</w:p>`);
        const listRule: CssRuleSet = { 'margin-top': '0px', 'margin-bottom': '2px', 'line-height': '1.6', ...context.styleRule('li'),
          ...Object.fromEntries(Array.from((item as HTMLElement).style).map(key => [key, (item as HTMLElement).style.getPropertyValue(key)])) };
        const paragraphIndexes = Array.from({length: bodyXmls.length - startIndex}, (_, offset) => startIndex + offset)
          .filter(index => bodyXmls[index].trimStart().startsWith('<w:p>'));
        paragraphIndexes.forEach((index, offset) => {
          const rule = { ...listRule, 'margin-top': offset === 0 ? listRule['margin-top'] : '0px',
            'margin-bottom': offset === paragraphIndexes.length - 1 ? listRule['margin-bottom'] : '0px' };
          bodyXmls[index] = bodyXmls[index].replace(/<w:pPr\/>|<w:pPr>[\s\S]*?<\/w:pPr>/, properties => {
            const inner = properties === '<w:pPr/>' ? '' : properties.slice(7, -8)
              .replace(/<w:spacing\b[^>]*\/>|<w:snapToGrid\b[^>]*\/>/g, '');
            return `<w:pPr>${inner}${wordParagraphProperties(rule, context.baseSize)}</w:pPr>`;
          });
        });
        if (item.hasAttribute('data-onrivi-report-marker')) {
          paragraphIndexes.forEach((index,offset)=>{
            const indent=`<w:ind w:left="${(level+1)*420}" w:hanging="${offset===0?300:0}"/>`;
            bodyXmls[index]=bodyXmls[index].replace(/<w:pPr\/>|<w:pPr>/,match=>match==='<w:pPr/>'?`<w:pPr>${indent}</w:pPr>`:`<w:pPr>${indent}`);
          });
        }
        if (!hasCheckbox && !item.hasAttribute('data-onrivi-report-marker')) {
          const props = `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`;
          if (bodyXmls[startIndex] && !bodyXmls[startIndex].trimStart().startsWith('<w:p>')) bodyXmls.splice(startIndex, 0, '<w:p><w:pPr/></w:p>');
          bodyXmls[startIndex] = bodyXmls[startIndex]?.replace(/<w:pPr\/>|<w:pPr>/, match => match === '<w:pPr/>' ? `<w:pPr>${props}</w:pPr>` : `<w:pPr>${props}`) || `<w:p><w:pPr>${props}</w:pPr></w:p>`;
        }
        Array.from(item.querySelectorAll('ul, ol')).filter(nested => nested.closest('li') === item).forEach(nested => processBlockNode(nested, listLevel + 1));
      });
      return;
    }

    // 5. 코드 블록 (PRE 또는 .codeblock-area) — 깔끔한 라이트 음영 및 코발트 액센트 단일 박스 조판
    if (tag === 'pre' || el.classList.contains('codeblock-area')) {
      const codeEl = el.querySelector('code') || el.querySelector('pre') || el;
      const text = (codeEl.textContent || '').replace(/\r\n/g, '\n');
      const lines = text.split('\n');
      while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      const runs = lines.map((l: string, i: number) => `<w:t xml:space="preserve">${escapeXml(l)}</w:t>${i < lines.length - 1 ? '<w:br/>' : ''}`).join('');
      bodyXmls.push(`
        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:left w:val="single" w:sz="24" w:space="10" w:color="1D4ED8"/>
              <w:top w:val="single" w:sz="6" w:space="6" w:color="E2E8F0"/>
              <w:right w:val="single" w:sz="6" w:space="6" w:color="E2E8F0"/>
              <w:bottom w:val="single" w:sz="6" w:space="6" w:color="E2E8F0"/>
            </w:pBdr>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:spacing w:before="160" w:after="160" w:line="240" w:lineRule="auto"/>
            <w:ind w:left="240" w:right="240"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
              <w:sz w:val="18"/>
              <w:szCs w:val="18"/>
              <w:color w:val="1E293B"/>
            </w:rPr>
            ${runs}
          </w:r>
        </w:p>
      `);
      return;
    }

    // 6. 구분선 (HR)
    if (tag === 'hr') {
      bodyXmls.push(`
        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:bottom w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/>
            </w:pBdr>
            <w:spacing w:before="240" w:after="240"/>
          </w:pPr>
        </w:p>
      `);
      return;
    }

    // 7. 표 (TABLE)
    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).filter(row => row.closest('table') === el);
      if (!rows.length) return;
      const occupied = new Map<number, { remaining: number; span: number }>();
      const rowXml: string[] = [];
      let columnCount = 0;
      const columnPixels: number[] = [];
      const contentWidth = context.section.widthEmu / 635;
      const tablePixels = Number(el.getAttribute('data-docx-width'));
      const cellProperties = (cell: HTMLElement) => {
        const rule = context.styleRule(cell.tagName.toLowerCase());
        const margins = ['top', 'right', 'bottom', 'left'].map(side => {
          const value = cell.getAttribute(`data-docx-padding-${side}`) || cell.style.getPropertyValue(`padding-${side}`) || rule[`padding-${side}`] || rule.padding || (side === 'top' || side === 'bottom' ? '6px' : '10px');
          return `<w:${side} w:w="${Math.max(0, Math.round(cssPx(value, context.baseSize) * 15))}" w:type="dxa"/>`;
        }).join('');
        return `<w:tcMar>${margins}</w:tcMar>`;
      };
      for (const row of rows) {
        let column = 0;
        let cellsXml = '';
        const continuation = () => {
          const merge = occupied.get(column);
          if (!merge) return false;
          cellsXml += `<w:tc><w:tcPr>${merge.span > 1 ? `<w:gridSpan w:val="${merge.span}"/>` : ''}<w:vMerge/></w:tcPr><w:p/></w:tc>`;
          const current = column;
          column += merge.span;
          if (--merge.remaining === 0) occupied.delete(current);
          return true;
        };
        for (const cell of Array.from(row.children).filter(cell => /^(td|th)$/i.test(cell.tagName))) {
          while (continuation()) {}
          const span = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
          const measured = Number(cell.getAttribute('data-docx-width')) || cssPx((cell as HTMLElement).style.width);
          if (measured > 0) for (let offset = 0; offset < span; offset++) {
            if (span === 1 || !columnPixels[column + offset]) columnPixels[column + offset] = measured / span;
          }
          const rowSpan = cell.getAttribute('rowspan') === '0' ? rows.length - rows.indexOf(row) : Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
          if (rowSpan > 1) occupied.set(column, { remaining: rowSpan - 1, span });
          const offset = bodyXmls.length;
          // Cell text must not inherit Normal's body paragraph spacing.
          const tableRule = { ...context.styleRule('table'), ...Object.fromEntries(Array.from(el.style).map(key => [key, el.style.getPropertyValue(key)])) };
          const cellElement = cell as HTMLElement;
          const cellRule: CssRuleSet = {
            'font-size': tableRule['font-size'] || `${context.baseSize}px`,
            'line-height': tableRule['line-height'] || '1.6',
            'margin-top': '0px', 'margin-bottom': '0px',
            ...context.styleRule(cell.tagName.toLowerCase()),
            ...Object.fromEntries(Array.from(cellElement.style).map(key => [key, cellElement.style.getPropertyValue(key)]))
          };
          for (const descendant of [cellElement, ...Array.from(cell.querySelectorAll('p, div, li, span')) as HTMLElement[]]) {
            if (descendant.closest('table') !== el) continue;
            for (const property of ['font-size', 'line-height', 'margin-top', 'margin-bottom']) {
              if (!descendant.style.getPropertyValue(property)) descendant.style.setProperty(property, cellRule[property]);
            }
          }
          if (Array.from(cell.children).some(child => /^(p|div|ul|ol|table|figure|pre|blockquote|h[1-6])$/i.test(child.tagName))) {
            cell.childNodes.forEach(child => processBlockNode(child));
          } else bodyXmls.push(`<w:p><w:pPr>${wordParagraphProperties(cellRule, context.baseSize)}</w:pPr>${parseInlines(cell)}</w:p>`);
          let content = bodyXmls.splice(offset).join('');
          if (!content.trimEnd().endsWith('</w:p>')) content += '<w:p/>';
          const fill = wordColor((cell as HTMLElement).style.backgroundColor || context.styleRule(cell.tagName.toLowerCase())['background-color']);
          cellsXml += `<w:tc><w:tcPr>${cellProperties(cell as HTMLElement)}${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${rowSpan > 1 ? '<w:vMerge w:val="restart"/>' : ''}${fill ? `<w:shd w:val="clear" w:fill="${fill}"/>` : ''}</w:tcPr>${content}</w:tc>`;
          column += span;
        }
        while (continuation()) {}
        columnCount = Math.max(columnCount, column);
        rowXml.push(`<w:tr><w:trPr><w:cantSplit/>${row.parentElement?.tagName.toLowerCase() === 'thead' ? '<w:tblHeader/>' : ''}</w:trPr>${cellsXml}</w:tr>`);
      }
      const fallback = tablePixels > 0 ? tablePixels / columnCount : 1;
      const weights = Array.from({ length: columnCount }, (_, index) => columnPixels[index] || fallback);
      const total = weights.reduce((sum, width) => sum + width, 0);
      const widths = weights.map(width => Math.max(1, Math.round(contentWidth * width / total)));
      widths[widths.length - 1] += Math.round(contentWidth) - widths.reduce((sum, width) => sum + width, 0);
      let widthRow = 0;
      for (const xml of rowXml) {
        let gridColumn = 0;
        rowXml[widthRow++] = xml.replace(/<w:tcPr>([\s\S]*?)<\/w:tcPr>/g, (_, properties: string) => {
          const span = Number(properties.match(/<w:gridSpan w:val="(\d+)"/)?.[1]) || 1;
          const width = widths.slice(gridColumn, gridColumn + span).reduce((sum, width) => sum + width, 0);
          gridColumn += span;
          return `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${properties}</w:tcPr>`;
        });
      }
      const structure = context.options.profile?.tableStructure;
      const tableRule = context.styleRule('table');
      const border = (side: string, width: string) => {
        const size = cssPx(width);
        const style = tableRule['border-style'] === 'double' ? 'double' : 'single';
        return `<w:${side} w:val="${size <= 0 || tableRule['border-style'] === 'none' ? 'nil' : style}" w:sz="${Math.min(96, Math.max(2, Math.round(size * 6)))}" w:color="${wordColor(tableRule['border-color']) || 'CBD5E1'}"/>`;
      };
      const borderXml = ['top', 'left', 'bottom', 'right'].map(side => border(side, structure?.outerBorderWidth ?? '1px')).join('') + border('insideH', structure?.rowBorderWidth ?? '1px') + border('insideV', structure?.colBorderWidth ?? '0px');
      bodyXmls.push(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${borderXml}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rowXml.join('')}</w:tbl>`);

      return;
    }

    // 8. 일반 래퍼 컨테이너 (DIV, SECTION, ARTICLE 등)
    if (tag === 'div' || tag === 'section' || tag === 'article') {
      const hasBlockChildren = el.querySelector('p, h1, h2, h3, h4, h5, h6, table, ul, ol, pre, blockquote, hr, figure, img, [data-export-img-id]') !== null;
      if (!hasBlockChildren) {
        const inlines = parseInlines(el);
        if (inlines.trim()) {
          const rawAlign = (
            el.getAttribute('align') ||
            el.style?.textAlign ||
            el.closest('[align]')?.getAttribute('align') ||
            (el.closest('[style*="text-align"]') as HTMLElement)?.style?.textAlign ||
            ''
          ).toLowerCase();
          const jcXml = rawAlign === 'right' ? '<w:jc w:val="right"/>' : (rawAlign === 'center' ? '<w:jc w:val="center"/>' : '');
          bodyXmls.push(`
            <w:p>
              <w:pPr>
                <w:widowControl/>${wordParagraphProperties({ ...context.styleRule('p'), ...Object.fromEntries(Array.from(el.style).map(key => [key, el.style.getPropertyValue(key)])) }, context.baseSize)}
                ${jcXml}
              </w:pPr>
              ${inlines}
            </w:p>
          `);
        }
        return;
      }
    }

    Array.from(el.childNodes).forEach(child => processBlockNode(child, listLevel));
  }

  // 본문 탐색 시작
  Array.from(containerEl.childNodes).forEach(child => processBlockNode(child));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXmls.join('\n')}
    <w:sectPr>
      ${context.section.xml}
    </w:sectPr>
  </w:body>
</w:document>`;
}

/**
 * 생성된 Blob을 브라우저에 다운로드하는 헬퍼
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
