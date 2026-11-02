// ====================================================================
// 📊 [OMD-STYLE-reportNumbering-0001] reportNumbering.ts ➔ 리스트 번호 체계 및 불릿 서식 엔진
// 🎯 @KICK  : 한국형 보고서 번호 체계, 원문자(①, ②, ③) 목록 및 계층별(1~3단계) 글머리 불릿 동적 CSS & 내보내기 마커 생성
// 🛡️ @GUARD : Rule 1(단일 주석 관리), task-list-item 불릿 침범 방어, @counter-style 미지원 환경 폴백 보장
// 🚨 @PATCH : **2026-10-26** — [글머리 마커와 글자 사이 간격 초밀착 및 문자열 불릿 공백 제거]:
//             1) getBulletSymbolValue 내 문자열 불릿(대시, 하이픈, 다이아몬드 등)의 CSS 속성값에서 불필요한 후행 공백 제거하여 마커-본문 간격 과대 벌어짐 방지
//             2) 0px 설정 시 글머리 마커가 본문과 단정하게 초밀착 렌더링되도록 보정
// 🚨 @PATCH : **2026-10-26** — [원문자(①, ②, ③) 숫자리스트 및 글머리 불릿 레벨별(1~3단계) 서식 엔진 신설]:
//             1) CIRCLED_DECIMAL_LIST_STYLE('onrivi-circled-decimal') 및 50개 유니코드 원문자 매핑 @counter-style 추가
//             2) materializeReportNumbers에서 원문자 목록 감지 및 내보내기(PDF/DOCX/HWPX) 시 원문자 스팬 마커 주입
//             3) getBulletSymbolValue 및 listBulletCss 함수를 신설하여 1단계/2단계/3단계별 불릿(•, ○, ■, ◆, -, ▶ 등) 계층 스타일링 지원
// ====================================================================

import type { CssProfile } from '@/types/cssProfile';

export const REPORT_LIST_STYLE = 'onrivi-report';
export const CIRCLED_DECIMAL_LIST_STYLE = 'onrivi-circled-decimal';

export const CIRCLED_NUMBERS: string[] = [
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
  '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘', '㉙', '㉚',
  '㉛', '㉜', '㉝', '㉞', '㉟', '㊱', '㊲', '㊳', '㊴', '㊵',
  '㊶', '㊷', '㊸', '㊹', '㊺', '㊻', '㊼', '㊽', '㊾', '㊿',
];

const HANGUL = '가나다라마바사아자차카타파하';
const ROMAN: [number, string][] = [
  [1000, 'Ⅿ'], [900, 'ⅭⅯ'], [500, 'Ⅾ'], [400, 'ⅭⅮ'], [100, 'Ⅽ'],
  [90, 'ⅩⅭ'], [50, 'Ⅼ'], [40, 'ⅩⅬ'], [12, 'Ⅻ'], [11, 'Ⅺ'],
  [10, 'Ⅹ'], [9, 'Ⅸ'], [8, 'Ⅷ'], [7, 'Ⅶ'], [6, 'Ⅵ'],
  [5, 'Ⅴ'], [4, 'Ⅳ'], [3, 'Ⅲ'], [2, 'Ⅱ'], [1, 'Ⅰ'],
];

export function reportListMarker(depth: number, value: number): string {
  let number = Math.max(1, Math.floor(value) || 1), text = '';
  if (depth === 1 && number <= 3999) {
    for (const [amount, symbol] of ROMAN) {
      while (number >= amount) {
        text += symbol;
        number -= amount;
      }
    }
    return text + '.';
  }
  if (depth === 3 || depth === 5) {
    while (number > 0) {
      number--;
      text = HANGUL[number % 14] + text;
      number = Math.floor(number / 14);
    }
    return text + (depth === 5 ? ')' : '.');
  }
  return String(number) + (depth === 4 ? ')' : '.');
}

/** 불릿 기호 코드값에 따른 CSS 속성값과 순수 텍스트 반환 */
export function getBulletSymbolValue(type?: string, customChar?: string): { css: string; text: string } {
  if (!type || type === 'disc') return { css: 'disc', text: '• ' };
  if (type === 'circle') return { css: 'circle', text: '○ ' };
  if (type === 'square') return { css: 'square', text: '■ ' };
  if (type === 'none') return { css: 'none', text: '' };
  if (type === 'custom') {
    const char = (customChar && customChar.trim()) ? customChar.trim() : '•';
    return { css: `"${char}"`, text: `${char} ` };
  }
  const map: Record<string, { css: string; text: string }> = {
    'dash': { css: '"-"', text: '- ' },
    'hyphen': { css: '"–"', text: '– ' },
    'diamond': { css: '"◆"', text: '◆ ' },
    'white-diamond': { css: '"◇"', text: '◇ ' },
    'white-square': { css: '"▫"', text: '▫ ' },
    'arrow': { css: '"▶"', text: '▶ ' },
    'check': { css: '"✓"', text: '✓ ' },
    'star': { css: '"★"', text: '★ ' },
    'dot': { css: '"·"', text: '· ' },
  };
  return map[type] || { css: 'disc', text: '• ' };
}

/** 글머리 기호 1~3단계 계층별 CSS 규칙 생성 */
export function listBulletCss(profile: CssProfile): string {
  const bs = profile.bulletStructure;
  const l1Type = bs?.level1 || profile.rules?.ul?.['list-style-type'] || 'disc';
  const l2Type = bs?.level2 || 'circle';
  const l3Type = bs?.level3 || 'square';

  const l1 = getBulletSymbolValue(l1Type, bs?.custom1);
  const l2 = getBulletSymbolValue(l2Type, bs?.custom2);
  const l3 = getBulletSymbolValue(l3Type, bs?.custom3);

  const roots = ':is(.custom-preview-container,.onrivi-content-root,.markdown-viewer-root,.visual-document-surface)';
  return `
${roots} ul > li:not(.task-list-item) { list-style-type: ${l1.css} !important; }
${roots} ul ul > li:not(.task-list-item) { list-style-type: ${l2.css} !important; }
${roots} ul ul ul > li:not(.task-list-item) { list-style-type: ${l3.css} !important; }
`;
}

export function reportNumberingCss(profile: CssProfile): string {
  const circledSymbols = CIRCLED_NUMBERS.map(x => `"${x}"`).join(' ');
  const circledCounterStyle = `@counter-style onrivi-circled-decimal {system:fixed;symbols:${circledSymbols};suffix:" ";fallback:decimal;}`;

  let circledRule = '';
  if (profile.rules.ol?.['list-style-type'] === CIRCLED_DECIMAL_LIST_STYLE) {
    circledRule = `\n:is(.custom-preview-container,.onrivi-content-root,.markdown-viewer-root,.visual-document-surface) ol {list-style-type:onrivi-circled-decimal!important;}`;
  }

  const bulletsCss = listBulletCss(profile);

  if (profile.rules.ol?.['list-style-type'] === REPORT_LIST_STYLE) {
    const symbols = Array.from(HANGUL).map(x => '"' + x + '"').join(' ');
    const types = ['onrivi-report', 'decimal', 'onrivi-report-hangul', 'onrivi-report-decimal-paren', 'onrivi-report-hangul-paren'];
    const rules = types.map((type, i) => `:is(.custom-preview-container,.onrivi-content-root,.markdown-viewer-root,.visual-document-surface) ${'ol '.repeat(i + 1).trim()}{list-style-type:${type}!important;}`);
    rules.push(':is(.custom-preview-container,.onrivi-content-root,.markdown-viewer-root,.visual-document-surface) ol ol ol ol ol ol{list-style-type:decimal!important;}');
    return `${circledCounterStyle}
@counter-style onrivi-report {system:additive;additive-symbols:1000 "Ⅿ",900 "ⅭⅯ",500 "Ⅾ",400 "ⅭⅮ",100 "Ⅽ",90 "ⅩⅭ",50 "Ⅼ",40 "ⅩⅬ",12 "Ⅻ",11 "Ⅺ",10 "Ⅹ",9 "Ⅸ",8 "Ⅷ",7 "Ⅶ",6 "Ⅵ",5 "Ⅴ",4 "Ⅳ",3 "Ⅲ",2 "Ⅱ",1 "Ⅰ";suffix:". ";fallback:upper-roman;}
@counter-style onrivi-report-hangul {system:alphabetic;symbols:${symbols};suffix:". ";}
@counter-style onrivi-report-hangul-paren {system:alphabetic;symbols:${symbols};suffix:") ";}
@counter-style onrivi-report-decimal-paren {system:extends decimal;suffix:") ";}
${rules.join('\n')}
${bulletsCss}`;
  }

  return `${circledCounterStyle}${circledRule}
${bulletsCss}`;
}

/** Materialize labels only on an export clone. The editor retains real ordered lists. */
export function materializeReportNumbers(source: HTMLElement, clone: HTMLElement): void {
  const originals = Array.from(source.querySelectorAll('ol'));
  clone.querySelectorAll<HTMLOListElement>('ol').forEach((list, index) => {
    const original = originals[index];
    if (!original) return;
    let parent: Element | null = original, depth = 0, report = false, circled = false;
    while (parent && parent !== source.parentElement) {
      if (parent.tagName === 'OL') {
        depth++;
        const styleType = getComputedStyle(parent).listStyleType;
        if (styleType === REPORT_LIST_STYLE) report = true;
        if (styleType === CIRCLED_DECIMAL_LIST_STYLE) circled = true;
      }
      parent = parent.parentElement;
    }
    if (!report && !circled) return;
    list.dataset.onriviReportNumbering = 'true';
    list.dataset.onriviReportDepth = String(depth);
    let value = list.start || 1;
    Array.from(list.children).filter(node => node.tagName === 'LI').forEach(node => {
      const item = node as HTMLLIElement;
      if (item.hasAttribute('value')) value = item.value;
      const label = circled
        ? ((CIRCLED_NUMBERS[value - 1] || String(value)) + ' ')
        : (reportListMarker(depth, value++) + ' ');
      if (circled) value++;
      item.dataset.onriviReportMarker = label;
      item.style.setProperty('list-style-type', 'none', 'important');
      const marker = document.createElement('span');
      marker.className = 'export-list-marker onrivi-report-marker';
      marker.textContent = label;
      marker.style.cssText = 'display:inline!important;white-space:pre!important';
      const paragraph = Array.from(item.children).find(child => child.tagName === 'P');
      (paragraph || item).prepend(marker);
    });
  });
}
