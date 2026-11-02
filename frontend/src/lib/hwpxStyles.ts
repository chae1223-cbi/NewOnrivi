const HH = 'http://www.hancom.co.kr/hwpml/2011/head';

/** Extend the bundled header without creating dangling character references. */
export function buildHwpxHeader(template: string, defaultFont?: string, maxListDepth = 0): string {
  const doc = new DOMParser().parseFromString(template, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('한글 문서 서식 정보를 읽지 못했습니다.');
  const chars = doc.getElementsByTagNameNS(HH, 'charProperties')[0];
  const base = chars.children[0];
  const font = defaultFont?.split(',')[0].trim().replace(/["']/g, '') || '함초롬돋움';
  for (const el of Array.from(doc.getElementsByTagNameNS(HH, 'font'))) el.setAttribute('face', font);
  const definitions: [number, number, string?][] = [[10,1100,'bold'],[11,1100,'italic'],[12,1000],[13,1100],[14,2200,'bold'],[15,1800,'bold'],[16,1500,'bold'],[17,1200,'bold']];
  for (const [id, size, emphasis] of definitions) {
    const existing = Array.from(chars.children).find(el=>el.getAttribute('id')===String(id));
    existing?.remove();
    const style = base.cloneNode(true) as Element;
    style.setAttribute('id', String(id));
    style.setAttribute('height', String(size));
    style.setAttribute('textColor', id >= 14 || id === 13 ? '#0055AA' : '#000000');
    for (const el of Array.from(style.getElementsByTagNameNS(HH,'fontRef'))) for (const attr of Array.from(el.attributes)) el.setAttribute(attr.name,'0');
    if (emphasis && !style.getElementsByTagNameNS(HH,emphasis).length) style.append(doc.createElementNS(HH,`hh:${emphasis}`));
    chars.append(style);
  }
  // Hancom resolves these reference lists by position as well as ID.
  // Keep IDs contiguous and store entries in ascending order.
  const maxCharId = Math.max(...Array.from(chars.children).map(el => Number(el.getAttribute('id'))));
  for (let id = 0; id <= maxCharId; id++) {
    if (Array.from(chars.children).some(el => el.getAttribute('id') === String(id))) continue;
    const filler = base.cloneNode(true) as Element;
    filler.setAttribute('id', String(id));
    chars.append(filler);
  }
  Array.from(chars.children).sort((a, b) => Number(a.getAttribute('id')) - Number(b.getAttribute('id'))).forEach(el => chars.append(el));
  chars.setAttribute('itemCnt',String(chars.children.length));
  const paras = doc.getElementsByTagNameNS(HH,'paraProperties')[0];
  const borders = doc.getElementsByTagNameNS(HH,'borderFills')[0];
  const separatorBorder = borders.children[0].cloneNode(true) as Element;
  const separatorId = Math.max(...Array.from(borders.children).map(el => Number(el.getAttribute('id')))) + 1;
  separatorBorder.setAttribute('id', String(separatorId));
  const bottom = separatorBorder.getElementsByTagNameNS(HH, 'bottomBorder')[0];
  bottom.setAttribute('type', 'SOLID');
  bottom.setAttribute('color', '#CBD5E1');
  borders.append(separatorBorder);
  const quoteBorder = borders.children[0].cloneNode(true) as Element;
  const quoteBorderId = separatorId + 1;
  quoteBorder.setAttribute('id', String(quoteBorderId));
  const leftBorder = quoteBorder.getElementsByTagNameNS(HH, 'leftBorder')[0];
  leftBorder.setAttribute('type', 'SOLID');
  leftBorder.setAttribute('width', '0.5 mm');
  leftBorder.setAttribute('color', '#1D4ED8');
  const coreNs = 'http://www.hancom.co.kr/hwpml/2011/core';
  const fill = doc.createElementNS(coreNs, 'hc:fillBrush');
  const brush = doc.createElementNS(coreNs, 'hc:winBrush');
  brush.setAttribute('faceColor', '#EFF6FF');
  brush.setAttribute('hatchColor', '#EFF6FF');
  brush.setAttribute('alpha', '0');
  fill.append(brush);
  quoteBorder.append(fill);
  borders.append(quoteBorder);
  borders.setAttribute('itemCnt', String(borders.children.length));
  const separator = paras.children[0].cloneNode(true) as Element;
  separator.setAttribute('id', '25');
  separator.getElementsByTagNameNS(HH, 'border')[0].setAttribute('borderFillIDRef', String(separatorId));
  for (const margin of Array.from(separator.getElementsByTagNameNS(HH, 'margin'))) {
    for (const child of Array.from(margin.children)) {
      if (child.localName === 'prev' || child.localName === 'next') child.setAttribute('value', '600');
    }
  }
  paras.append(separator);
  for (const [id,alignment,keepNext] of [[20,'LEFT',false],[21,'CENTER',false],[22,'LEFT',false],[23,'LEFT',true],[24,'LEFT',true]] as const) {
    const style = paras.children[0].cloneNode(true) as Element;
    style.setAttribute('id',String(id));
    if (id === 21) {
      for (const spacing of Array.from(style.getElementsByTagNameNS(HH, 'lineSpacing'))) spacing.setAttribute('value', '100');
      for (const margin of Array.from(style.getElementsByTagNameNS(HH, 'margin'))) {
        for (const child of Array.from(margin.children)) {
          if (child.localName === 'next') child.setAttribute('value', '300');
        }
      }
    }
    if (id === 20) {
      const border = style.getElementsByTagNameNS(HH, 'border')[0];
      border.setAttribute('borderFillIDRef', String(quoteBorderId));
      border.setAttribute('offsetLeft', '850');
      border.setAttribute('connect', '1');
      for (const margin of Array.from(style.getElementsByTagNameNS(HH, 'margin'))) {
        for (const child of Array.from(margin.children)) {
          if (child.localName === 'left') child.setAttribute('value', '1700');
          if (child.localName === 'right') child.setAttribute('value', '850');
          if (child.localName === 'intent') child.setAttribute('value', '0');
        }
      }
    }
    for (const align of Array.from(style.getElementsByTagNameNS(HH,'align'))) align.setAttribute('horizontal',alignment);
    for (const setting of Array.from(style.getElementsByTagNameNS(HH,'breakSetting'))) {
      setting.setAttribute('keepWithNext', keepNext ? '1' : '0');
      setting.setAttribute('keepLines','1');
    }
    paras.append(style);
  }
  const listBase = Array.from(paras.children).find(el => el.getAttribute('id') === '1') || paras.children[0];
  for (let depth = 1; depth <= maxListDepth; depth++) {
    const style = listBase.cloneNode(true) as Element;
    style.setAttribute('id', String(25 + depth));
    for (const margin of Array.from(style.getElementsByTagNameNS(HH, 'margin'))) {
      for (const child of Array.from(margin.children)) {
        if (child.localName === 'left') child.setAttribute('value', String((Number(child.getAttribute('value')) || 0) + depth * 1700));
      }
    }
    paras.append(style);
  }
  Array.from(paras.children).sort((a, b) => Number(a.getAttribute('id')) - Number(b.getAttribute('id'))).forEach(el => paras.append(el));
  paras.setAttribute('itemCnt',String(paras.children.length));
  return new XMLSerializer().serializeToString(doc);
}
