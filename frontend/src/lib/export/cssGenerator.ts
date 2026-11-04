// ====================================================================
// 📊 [OMD-IO-export-css-0001] frontend/src/lib/export/cssGenerator.ts
// 🎯 @KICK  : 서식 프로필(CssProfile) 기반 인쇄/내보내기 동적 CSS 생성기
// 🛡️ @GUARD : 라이트모드 기준 고정, @layer 우선순위 계층 적용, 표/코드/제목 조판 동기화
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리 & 주석 표준화]: exportHandlers.ts에서 서식 프로필 CSS 빌더 분리 및 2단계 JSDoc 적용
// 🔗 @CALLS : headingNumberingCss, reportNumberingCss, normalizeCssProfile
// ====================================================================
import { headingNumberingCss } from '../headingNumbering';
import { reportNumberingCss, CIRCLED_DECIMAL_LIST_STYLE, CIRCLED_NUMBERS, getBulletSymbolValue } from '../reportNumbering';
import { PRINT_TABLE_FLOW_CSS } from '../exportPagination';
import { DEFAULT_PROFILE, normalizeCssProfile } from '@/constants/cssProfile';
import type { CssProfile } from '@/types/cssProfile';

/**
 * ==== [generateExportCss] ====
 * 🎯 역할 : 전달된 서식 프로필(CssProfile)을 항상 라이트모드 기준의 내보내기/인쇄용 동적 CSS 문자열로 변환
 * 📥 파라미터 :
 *   - rawProfile (any) : 정규화 전/후 서식 프로필 객체
 * 📤 반환값 : string (생성된 CSS 문자열)
 * 💡 비고 : @layer onrivi-settings, onrivi-extra 계층 우선순위 및 제목·표·코드블록·수식 조판 규칙 포함
 */
export function generateExportCss(rawProfile: any): string {
  if (!rawProfile || rawProfile.id === 'default') {
    return (rawProfile?.customCss && rawProfile.customCss.trim())
      ? `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-extra {\n${rawProfile.customCss}\n}`
      : '';
  }
  // 💡 [OMD-PATCH] 전달된 프로필을 Onrivi 최신 7대 쇼케이스 태그 및 구조체 기준으로 완벽 정규화(하이드레이션)
  const profile = normalizeCssProfile(rawProfile);
  const ps = profile.pageStyle;
  
  // 내보내기 결과물은 항상 라이트모드 기준 바탕색과 기본 텍스트 색상 적용
  const bg = ps.backgroundColor || '#ffffff';
  const fg = 'inherit';

  let css = `
.custom-preview-container {
  background: ${bg} !important;
  color: ${fg} !important;
  font-family: ${ps.fontFamily} !important;
  font-size: ${ps.fontSize} !important;
  line-height: ${ps.lineHeight} !important;
  letter-spacing: ${ps.letterSpacing} !important;
}
.custom-preview-container p,
.custom-preview-container li,
.custom-preview-container blockquote {
  font-size: inherit !important;
  line-height: inherit !important;
}
.custom-preview-container pre,
.custom-preview-container code {
  tab-size: ${ps.tabSize || '4'} !important;
  -moz-tab-size: ${ps.tabSize || '4'} !important;
}
`;

  /* H2~H6 자동 크기 계산 (headingSizeOffset 기반, pt/px 단위 상호 변환 및 '0pt' 명시 지원) */
  const h1SizeVal = (profile.rules.h1 && profile.rules.h1['font-size']) || '21pt';
  const isPt = h1SizeVal.endsWith('pt') || (!h1SizeVal.endsWith('px') && !h1SizeVal.endsWith('rem') && !h1SizeVal.endsWith('em'));
  const h1Unit = isPt ? 'pt' : (h1SizeVal.endsWith('px') ? 'px' : 'pt');
  const h1Size = parseFloat(h1SizeVal) || (isPt ? 21 : 28);
  const rawOffsetStr = (ps.headingSizeOffset || '').trim();
  const offset = (() => {
    if (!rawOffsetStr || rawOffsetStr === '0px') return isPt ? 3 : 4;
    if (rawOffsetStr === '0pt' || rawOffsetStr === '0') return 0;
    const num = parseFloat(rawOffsetStr);
    if (isNaN(num)) return isPt ? 3 : 4;
    if (rawOffsetStr.endsWith('pt') && !isPt) return Math.round((num / 0.75) * 10) / 10;
    if (rawOffsetStr.endsWith('px') && isPt) return Math.round((num * 0.75) * 10) / 10;
    return num;
  })();
  for (let level = 2; level <= 6; level++) {
    const calcSize = Math.max(isPt ? 8 : 10, Math.round((h1Size - (level - 1) * offset) * 10) / 10);
    css += `.custom-preview-container h${level} {\n  font-size: ${calcSize}${h1Unit} !important;\n}\n`;
  }

  // 💡 CSS 속성 우선순위 정렬기: 단축 속성(border-style/width 등)이 방향별 속성(border-left/right 등)보다 항상 먼저 선언되도록 보장
  const DIRECTIONAL_PROPS = new Set([
    'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
    'border-top-style', 'border-bottom-style', 'border-left-style', 'border-right-style',
    'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
    'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  ]);
  const sortCssProps = (a: string, b: string): number => {
    const isADir = DIRECTIONAL_PROPS.has(a);
    const isBDir = DIRECTIONAL_PROPS.has(b);
    if (isADir && !isBDir) return 1;
    if (!isADir && isBDir) return -1;
    return a.localeCompare(b);
  };

  Object.entries(profile.rules || {}).forEach(([tag, ruleObj]: [string, any]) => {
    const skipFontSize = ['h2','h3','h4','h5','h6'].includes(tag);
    // 미리보기와 동일하게 기존 빈 제목 밑줄/좌측 색깔바 설정도 명시적으로 제거한다.
    const effectiveRules = /^h[1-6]$/.test(tag)
      ? {
          ...ruleObj,
          'border-bottom': ruleObj['border-bottom']?.trim() || 'none',
          'border-left': ruleObj['border-left']?.trim() || 'none',
        }
      : ruleObj;
    const entries = Object.entries(effectiveRules).map(([prop, v]) => {
      if (prop === 'word-break' && v === 'keep-all') return [prop, 'break-all'];
      return [prop, v];
    }).filter(([prop, v]) => {
      if (v === '') return false;
      if (skipFontSize && prop === 'font-size') return false;
      if (prop === 'sentence-gap') return false;
      return true;
    }).sort((a, b) => sortCssProps(a[0] as string, b[0] as string));

    if (tag === 'p') {
      const sGap = ruleObj['sentence-gap'];
      const sGapNum = parseInt(sGap || '0', 10) || 0;
      if (sGapNum > 0) {
        css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak),
p br:not(.ProseMirror-trailingBreak) {
  display: block !important;
  content: "" !important;
  margin-top: ${sGap} !important;
  height: 0 !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line,
p .onrivi-line + .onrivi-line {
  margin-top: ${sGap} !important;
}
`;
      } else {
        css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak),
p br:not(.ProseMirror-trailingBreak) {
  display: inline !important;
  margin: 0 !important;
  content: normal !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line,
p .onrivi-line + .onrivi-line {
  margin-top: 0 !important;
}
`;
      }
    }

    if (entries.length === 0) return;
    
    if (tag === 'codeBlockTitle') {
      const bgColor = ruleObj['background-color'];
      const textColor = ruleObj['color'];
      if (bgColor) {
        css += `.custom-preview-container .codeblock-header {\n  background-color: ${bgColor} !important;\n}\n`;
      }
      if (textColor) {
        css += `.custom-preview-container .codeblock-header-text {\n  color: ${textColor} !important;\n}\n`;
      }
      return;
    }

    if (tag === 'codeBlock') {
      const bgColor = ruleObj['background-color'];
      const color = ruleObj['color'];
      const fontSize = ruleObj['font-size'];
      const padding = ruleObj['padding'];
      const borderRadius = ruleObj['border-radius'];

      if (bgColor) {
        css += `.custom-preview-container .codeblock-area {\n  background-color: ${bgColor} !important;\n}\n`;

        const isDarkBg = (() => {
          const c = (bgColor || '').trim().toLowerCase();
          if (c.startsWith('#')) {
            let hex = c.slice(1);
            if (hex.length === 3) hex = hex.split('').map((x: string) => x + x).join('');
            if (hex.length === 6) {
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
            }
          }
          const rgb = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgb) {
            const r = parseInt(rgb[1], 10);
            const g = parseInt(rgb[2], 10);
            const b = parseInt(rgb[3], 10);
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
          }
          return true;
        })();

        if (isDarkBg) {
          css += `.custom-preview-container .codeblock-area .onrivi-line.preview-highlight-line {\n  background-color: rgba(59, 130, 246, 0.3) !important;\n  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.65) !important;\n  border-radius: 4px;\n}\n`;
        } else {
          css += `.custom-preview-container .codeblock-area .onrivi-line.preview-highlight-line {\n  background-color: rgba(255, 152, 0, 0.16) !important;\n  border-radius: 4px;\n}\n`;
        }
      }
      if (borderRadius) {
        css += `.custom-preview-container .codeblock-area {\n  border-radius: ${borderRadius} !important;\n}\n`;
      }
      if (color) {
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  color: ${color} !important;\n}\n`;
      }
      if (fontSize) {
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  font-size: ${fontSize} !important;\n}\n`;
      } else {
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  font-size: inherit !important;\n}\n`;
      }
      if (padding) {
        css += `.custom-preview-container .codeblock-area pre {\n  padding: ${padding} !important;\n}\n`;
      }
      css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  border: none !important;\n  background: transparent !important;\n}\n`;
      return;
    }

    if (tag === 'math') {
      const marginTop = ruleObj['margin-top'] || '16px';
      const marginBottom = ruleObj['margin-bottom'] || '16px';
      const textAlign = ruleObj['text-align'] || 'center';
      const color = ruleObj['color'];
      const fontSize = ruleObj['font-size'];

      // 1. 디스플레이 수식 블록 컨테이너 (.katex-display)
      css += `
.custom-preview-container .katex-display,
.onrivi-content-root .katex-display {
  display: flex !important;
  ${textAlign === 'center' ? 'justify-content: center !important;' : textAlign === 'right' ? 'justify-content: flex-end !important;' : 'justify-content: flex-start !important;'}
  text-align: ${textAlign} !important;
  margin-top: ${marginTop} !important;
  margin-bottom: ${marginBottom} !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 0 !important;
}
.custom-preview-container p:has(> .katex-display),
.onrivi-content-root p:has(> .katex-display) {
  margin: 0 !important;
}
.custom-preview-container .katex-display > .katex,
.onrivi-content-root .katex-display > .katex {
  text-align: ${textAlign} !important;
}
`;

      // 2. 수식 글자 크기 및 색상 (.katex)
      // 💡 font-size 미지정('기본설정 유지') 시 inherit !important를 강제 주입하여 문서 기본 글자 크기 실시간 동기화
      css += `
.custom-preview-container .katex-display .katex,
.custom-preview-container :not(.katex-display) > .katex,
.onrivi-content-root .katex-display .katex,
.onrivi-content-root :not(.katex-display) > .katex {
  ${fontSize ? `font-size: ${fontSize} !important;` : `font-size: inherit !important;`}
  ${color ? `color: ${color} !important;` : ''}
}
`;
      return;
    }

    if (tag === 'footnote') {
      const color = ruleObj['color'];
      const fontSize = ruleObj['font-size'];
      const lineHeight = ruleObj['line-height'];
      const marginTop = ruleObj['margin-top'];
      const marginBottom = ruleObj['margin-bottom'];
      const fontWeight = ruleObj['font-weight'];

      const footnoteTextSelectors = [
        '.custom-preview-container .footnotes',
        '.custom-preview-container .footnotes p',
        '.custom-preview-container .footnotes li',
        '.custom-preview-container .footnotes a',
        '.onrivi-content-root .footnotes',
        '.onrivi-content-root .footnotes p',
        '.onrivi-content-root .footnotes li',
        '.onrivi-content-root .footnotes a',
        '.custom-preview-container .visual-footnote-def',
        '.custom-preview-container .visual-footnote-text',
        '.onrivi-content-root .visual-footnote-def',
        '.onrivi-content-root .visual-footnote-text'
      ].join(', ');

      const footnoteSizeSelectors = [
        '.custom-preview-container .footnotes',
        '.custom-preview-container .footnotes p',
        '.custom-preview-container .footnotes li',
        '.custom-preview-container .footnotes a',
        '.onrivi-content-root .footnotes',
        '.onrivi-content-root .footnotes p',
        '.onrivi-content-root .footnotes li',
        '.onrivi-content-root .footnotes a',
        '.custom-preview-container .visual-footnote-def',
        '.custom-preview-container .visual-footnote-text',
        '.custom-preview-container .visual-footnote-badge',
        '.onrivi-content-root .visual-footnote-def',
        '.onrivi-content-root .visual-footnote-text',
        '.onrivi-content-root .visual-footnote-badge'
      ].join(', ');

      if (marginTop) {
        css += `.custom-preview-container .footnotes, .onrivi-content-root .footnotes, .custom-preview-container .visual-footnote-area-header, .onrivi-content-root .visual-footnote-area-header {\n  margin-top: ${marginTop} !important;\n}\n`;
      }
      if (marginBottom) {
        css += `.custom-preview-container .footnotes, .onrivi-content-root .footnotes, .custom-preview-container .visual-footnote-def-container, .onrivi-content-root .visual-footnote-def-container {\n  margin-bottom: ${marginBottom} !important;\n}\n`;
      }
      if (color) {
        css += `${footnoteTextSelectors} {\n  color: ${color} !important;\n}\n`;
      }
      if (fontSize) {
        css += `${footnoteSizeSelectors} {\n  font-size: ${fontSize} !important;\n}\n`;
      } else {
        css += `${footnoteSizeSelectors} {\n  font-size: 12.5px !important;\n}\n`;
      }
      if (lineHeight) {
        css += `${footnoteSizeSelectors} {\n  line-height: ${lineHeight} !important;\n}\n`;
      }
      if (fontWeight) {
        css += `${footnoteSizeSelectors} {\n  font-weight: ${fontWeight} !important;\n}\n`;
      }
      return;
    }

    const selector = tag === 'taskList' ? '.task-list-item' :
      tag === 'code' ? ':not(pre) > code' :
      tag === 'map' ? 'iframe[src*="map"], iframe[src*="google.com/maps"], iframe[src*="maps.google.com"]' :
      tag === 'video' ? 'video, iframe[src*="youtube"], iframe[src*="vimeo"], a[href*="youtube.com"] img, a[href*="youtu.be"] img' : tag;
    const isMediaTag = tag === 'img' || tag === 'video' || tag === 'map';
    const isTableTag = ['table', 'th', 'td'].includes(tag);
    // 📊 Tailwind Typography 및 다크모드(.dark .prose)를 완벽히 압도하도록 모든 태그의 선택자 구체성을 일원화
    const selectorStr = `
      .custom-preview-container .markdown-viewer-root ${selector},
      .custom-preview-container ${selector},
      .onrivi-content-root ${selector},
      .custom-preview-container .prose ${selector},
      .dark .custom-preview-container .prose ${selector},
      .onrivi-content-root .prose ${selector},
      .dark .onrivi-content-root .prose ${selector}
    `.replace(/\s+/g, ' ').trim();
    css += `${selectorStr} {\n`;

    const bStyle = (ruleObj as any)['border-style'];
    const isDouble = bStyle === 'double';

    entries.forEach(([prop, val]) => {
      let finalVal = val;
      if (isTableTag && isDouble && prop === 'border-width') {
        const wNum = parseInt(val as string, 10) || 1;
        if (wNum < 3) finalVal = '3px';
      }
      css += `  ${prop}: ${finalVal} !important;\n`;
    });

    // 💡 미디어 객체(이미지, 비디오, 지도)의 좌/중/우 정렬을 flex 래퍼 컨테이너 내부에서도 완벽 보장하기 위한 align-self 자동 주입
    if (isMediaTag) {
      const ml = (ruleObj as any)['margin-left'];
      const mr = (ruleObj as any)['margin-right'];
      let alignSelf = 'center';
      if (ml === '0px' && mr === 'auto') {
        alignSelf = 'flex-start';
      } else if (ml === 'auto' && mr === '0px') {
        alignSelf = 'flex-end';
      } else if (ml === 'auto' && mr === 'auto') {
        alignSelf = 'center';
      }
      css += `  align-self: ${alignSelf} !important;\n`;
    }

    if ((tag === 'th' || tag === 'td') && bStyle) {
      css += `  border-bottom-style: ${bStyle} !important;\n`;
      if (isDouble) {
        const curW = parseInt((ruleObj as any)['border-width'] || '1', 10);
        css += `  border-bottom-width: ${curW < 3 ? '3px' : curW + 'px'} !important;\n`;
      }
    }
    css += `}\n`;

    if (tag === 'blockquote') {
      css += `
.custom-preview-container blockquote p,
.onrivi-content-root blockquote p,
blockquote p {
  margin-top: 0 !important;
  margin-bottom: 4px !important;
  line-height: 1.55 !important;
}
.custom-preview-container blockquote p:last-child,
.onrivi-content-root blockquote p:last-child,
blockquote p:last-child {
  margin-bottom: 0 !important;
}
.custom-preview-container blockquote ul,
.onrivi-content-root blockquote ul,
.custom-preview-container blockquote ol,
.onrivi-content-root blockquote ol,
blockquote ul,
blockquote ol {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
  padding-left: var(--list-indent, 1.4em) !important;
}
.custom-preview-container blockquote li,
.onrivi-content-root blockquote li,
blockquote li {
  margin-bottom: 2px !important;
  line-height: 1.5 !important;
}
.custom-preview-container blockquote li p,
.onrivi-content-root blockquote li p,
blockquote li p {
  margin-top: 0 !important;
  margin-bottom: 2px !important;
}
`;
    }

    if (tag === 'img') {
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
      let alignSelf = 'center';
      let textAlign = 'center';
      if ((ml === '0px' || ml === '0') && mr === 'auto') {
        alignSelf = 'flex-start';
        textAlign = 'left';
      } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
        alignSelf = 'flex-end';
        textAlign = 'right';
      }
      css += `
.custom-preview-container .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: inline-flex !important;
  flex-direction: column !important;
  width: fit-content !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(img),
.custom-preview-container .onrivi-image-figure,
.onrivi-content-root figure:has(img),
.onrivi-content-root .onrivi-image-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
}
.custom-preview-container .onrivi-image-figure figcaption,
.onrivi-content-root .onrivi-image-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 4px !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] img,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] img,
.custom-preview-container .onrivi-image-figure[data-caption-position="top"] .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-figure[data-caption-position="top"] .onrivi-image-wrapper {
  margin-top: 0 !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 4px !important;
  margin-bottom: 0 !important;
}
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] img,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] img,
.custom-preview-container .onrivi-image-figure[data-caption-position="bottom"] .onrivi-image-wrapper,
.onrivi-content-root .onrivi-image-figure[data-caption-position="bottom"] .onrivi-image-wrapper {
  margin-bottom: 0 !important;
}
`;
    } else if (tag === 'video') {
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
      const targetWidth = (ruleObj as any)['width'] || '100%';
      let alignSelf = 'center';
      let textAlign = 'center';
      if ((ml === '0px' || ml === '0') && mr === 'auto') {
        alignSelf = 'flex-start';
        textAlign = 'left';
      } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
        alignSelf = 'flex-end';
        textAlign = 'right';
      }
      css += `
.custom-preview-container .onrivi-video-wrapper,
.onrivi-content-root .onrivi-video-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: ${targetWidth === '100%' ? 'flex' : 'inline-flex'} !important;
  flex-direction: column !important;
  width: ${targetWidth} !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(video),
.custom-preview-container .onrivi-video-figure,
.onrivi-content-root figure:has(video),
.onrivi-content-root .onrivi-video-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
  width: 100% !important;
}
.custom-preview-container .onrivi-video-figure figcaption,
.onrivi-content-root .onrivi-video-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}
.custom-preview-container .onrivi-video-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-video-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 6px !important;
}
.custom-preview-container .onrivi-video-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-video-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 6px !important;
  margin-bottom: 0 !important;
}
`;
    } else if (tag === 'map') {
      const ml = (ruleObj as any)['margin-left'] || 'auto';
      const mr = (ruleObj as any)['margin-right'] || 'auto';
      const targetWidth = (ruleObj as any)['width'] || '100%';
      let alignSelf = 'center';
      let textAlign = 'center';
      if ((ml === '0px' || ml === '0') && mr === 'auto') {
        alignSelf = 'flex-start';
        textAlign = 'left';
      } else if (ml === 'auto' && (mr === '0px' || mr === '0')) {
        alignSelf = 'flex-end';
        textAlign = 'right';
      }
      css += `
.custom-preview-container .map-embed-wrapper,
.custom-preview-container .onrivi-map-wrapper,
.onrivi-content-root .map-embed-wrapper,
.onrivi-content-root .onrivi-map-wrapper {
  align-self: ${alignSelf} !important;
  margin-left: ${ml} !important;
  margin-right: ${mr} !important;
  display: ${targetWidth === '100%' ? 'flex' : 'inline-flex'} !important;
  flex-direction: column !important;
  width: ${targetWidth} !important;
  max-width: 100% !important;
}
.custom-preview-container figure:has(iframe),
.custom-preview-container .onrivi-map-figure,
.onrivi-content-root figure:has(iframe),
.onrivi-content-root .onrivi-map-figure {
  align-items: ${alignSelf} !important;
  text-align: ${textAlign} !important;
  width: 100% !important;
}
.custom-preview-container .onrivi-map-figure figcaption,
.onrivi-content-root .onrivi-map-figure figcaption {
  text-align: ${textAlign} !important;
  align-self: ${alignSelf} !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}
.custom-preview-container .onrivi-map-figure[data-caption-position="top"] figcaption,
.onrivi-content-root .onrivi-map-figure[data-caption-position="top"] figcaption {
  order: -1 !important;
  margin-top: 0 !important;
  margin-bottom: 6px !important;
}
.custom-preview-container .onrivi-map-figure[data-caption-position="bottom"] figcaption,
.onrivi-content-root .onrivi-map-figure[data-caption-position="bottom"] figcaption {
  order: 1 !important;
  margin-top: 6px !important;
  margin-bottom: 0 !important;
}
`;
    }
  });

  // 💡 동영상·지도 인접 단독 문단 캡션도 이미지 캡션과 동일하게 중앙 정렬 및 0.88em 폰트 크기 보장
  css += `
.custom-preview-container .onrivi-video-wrapper + p,
.custom-preview-container p:has(+ .onrivi-video-wrapper),
.custom-preview-container .onrivi-map-wrapper + p,
.custom-preview-container p:has(+ .onrivi-map-wrapper),
.onrivi-content-root .onrivi-video-wrapper + p,
.onrivi-content-root p:has(+ .onrivi-video-wrapper),
.onrivi-content-root .onrivi-map-wrapper + p,
.onrivi-content-root p:has(+ .onrivi-map-wrapper) {
  text-align: center !important;
  font-size: 0.88em !important;
  font-weight: 500 !important;
}
`;

  // Resolve base-size controls against the document, even inside fixed-size wrappers.
  const baseSizeSelectors = {
    blockquote: 'blockquote, blockquote > p',
    codeBlock: '.codeblock-area pre, .codeblock-area pre code',
    math: '.katex-display .katex, :not(.katex-display) > .katex',
  };
  Object.entries(baseSizeSelectors).forEach(([tag, selectors]) => {
    const configured = profile.rules[tag as keyof CssProfile['rules']]?.['font-size'];
    const size = !configured || ['inherit', '0', '0px'].includes(String(configured)) ? ps.fontSize : configured;
    const scoped = ['.custom-preview-container', '.onrivi-content-root']
      .flatMap(root => selectors.split(', ').map(selector => `${root} ${selector}`)).join(', ');
    css += `${scoped} { font-size: ${size} !important; }\n`;
  });

  const tableHasFontSize = profile.rules.table && profile.rules.table['font-size'];
  if (!tableHasFontSize || ['inherit', '0', '0px'].includes(String(tableHasFontSize))) {
    css += `
.custom-preview-container table,
.custom-preview-container th,
.custom-preview-container td,
.onrivi-content-root table,
.onrivi-content-root th,
.onrivi-content-root td {
  font-size: ${ps.fontSize} !important;
}
`;
  }

  const tableMarginTop = profile.rules.table?.['margin-top'] || '4px';
  const tableMarginBottom = profile.rules.table?.['margin-bottom'] || '16px';
  css += `
.custom-preview-container .table-wrapper-area,
.onrivi-content-root .table-wrapper-area {
  display: inline-block !important;
  width: 100% !important;
  vertical-align: top !important;
  margin-top: ${tableMarginTop} !important;
  margin-bottom: ${tableMarginBottom} !important;
}
.custom-preview-container table,
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  border-radius: 0 !important;
  overflow: visible !important;
  box-shadow: none !important;
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
}
.custom-preview-container th,
.custom-preview-container td,
.onrivi-content-root th,
.onrivi-content-root td,
.custom-preview-container .prose th,
.custom-preview-container .prose td,
.onrivi-content-root .prose th,
.onrivi-content-root .prose td {
  vertical-align: middle !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  box-sizing: border-box !important;
}
.custom-preview-container table :is(th, td) code,
.onrivi-content-root table :is(th, td) code {
  white-space: pre-wrap !important;
  overflow-wrap: anywhere !important;
  word-break: break-all !important;
  display: inline !important;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
.custom-preview-container .prose tr:last-child td,
.onrivi-content-root .prose tr:last-child td {
  border-bottom-style: inherit !important;
}
.custom-preview-container .prose tbody tr:nth-child(even),
.dark .custom-preview-container .prose tbody tr:nth-child(even),
.onrivi-content-root .prose tbody tr:nth-child(even),
.dark .onrivi-content-root .prose tbody tr:nth-child(even) {
  background-color: transparent !important;
}
`;

  // 🧰 구조제어: 표 외곽 테두리, 행(가로선), 열(세로선) 두께 개별 동적 인젝션
  const tableStruct = profile.tableStructure || DEFAULT_PROFILE.tableStructure;
  if (tableStruct) {
    const outerWidth = tableStruct.outerBorderWidth || '1px';
    const rowWidth = tableStruct.rowBorderWidth || '1px';
    const colWidth = tableStruct.colBorderWidth ?? '0px';
    const tableBorderStyle = profile.rules?.table?.['border-style'] || 'solid';
    // 💡 외곽선 및 테두리 색상: profile 규칙 또는 선명한 차콜 다크(#374151) 고대비 보장 (흐릿한 #cbd5e1 지양)
    const outerBorderColor = profile.rules?.table?.['border-color'] || '#374151';
    const rowBorderColor = profile.rules?.th?.['border-color'] || profile.rules?.td?.['border-color'] || profile.rules?.table?.['border-color'] || '#cbd5e1';
    const colBorderColor = rowBorderColor;

    // 1. 표 외곽 테두리 (table 및 최외곽 4면 셀 직접 주입 - html-to-image 테두리 누락 완전 방어)
    const outerIsZero = outerWidth === '0px' || outerWidth === '0';
    const rowIsZero = rowWidth === '0px' || rowWidth === '0';
    const colIsZero = colWidth === '0px' || colWidth === '0';

    css += `
.custom-preview-container table,
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  border-width: ${outerWidth} !important;
  border-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-color: ${outerBorderColor} !important;
  border-collapse: collapse !important;
}

/* 🛡️ 표 최외곽 4면 테두리: html-to-image 캔버스 캡처 시 table collapse 테두리 누락 버그 원천 차단 */
.custom-preview-container table tr:first-child th,
.custom-preview-container table tr:first-child td,
.onrivi-content-root table tr:first-child th,
.onrivi-content-root table tr:first-child td {
  border-top-width: ${outerWidth} !important;
  border-top-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-top-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr:last-child th,
.custom-preview-container table tr:last-child td,
.onrivi-content-root table tr:last-child th,
.onrivi-content-root table tr:last-child td {
  border-bottom-width: ${outerWidth} !important;
  border-bottom-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-bottom-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr th:first-child,
.custom-preview-container table tr td:first-child,
.onrivi-content-root table tr th:first-child,
.onrivi-content-root table tr td:first-child {
  border-left-width: ${outerWidth} !important;
  border-left-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-left-color: ${outerBorderColor} !important;
}
.custom-preview-container table tr th:last-child,
.custom-preview-container table tr td:last-child,
.onrivi-content-root table tr th:last-child,
.onrivi-content-root table tr td:last-child {
  border-right-width: ${outerWidth} !important;
  border-right-style: ${outerIsZero ? 'none' : tableBorderStyle} !important;
  border-right-color: ${outerBorderColor} !important;
}

/* 2. 표 내부 행(가로선) 구분선 (마지막 행 제외) */
.custom-preview-container table tr:not(:last-child) th,
.custom-preview-container table tr:not(:last-child) td,
.onrivi-content-root table tr:not(:last-child) th,
.onrivi-content-root table tr:not(:last-child) td {
  border-bottom-width: ${rowWidth} !important;
  border-bottom-style: ${rowIsZero ? 'none' : tableBorderStyle} !important;
  border-bottom-color: ${rowBorderColor} !important;
}

/* 3. 표 내부 열(세로선) 구분선 (마지막 열 제외, colWidth 0px이면 완전 소거) */
.custom-preview-container table tr th:not(:last-child),
.custom-preview-container table tr td:not(:last-child),
.onrivi-content-root table tr th:not(:last-child),
.onrivi-content-root table tr td:not(:last-child) {
  border-right-width: ${colWidth} !important;
  border-right-style: ${colIsZero ? 'none' : tableBorderStyle} !important;
  border-right-color: ${colBorderColor} !important;
}
`;
  }

  css += `
.custom-preview-container p:has(+ .table-wrapper-area),
.onrivi-content-root p:has(+ .table-wrapper-area) {
  margin-bottom: 6px !important;
}

/* 💬 인용구(blockquote) 여백 정밀 제어: BFC 및 인라인 블록 격리로 마진 상쇄 원천 차단 */
.custom-preview-container blockquote,
.onrivi-content-root blockquote {
  display: inline-block !important;
  width: 100% !important;
  vertical-align: top !important;
}

/* 💬 Alert 인용구(콜아웃) 태그와 본문 간격 최소화 및 커스텀 제어 */
.custom-preview-container .onrivi-alert-title,
.onrivi-content-root .onrivi-alert-title {
  margin-bottom: var(--onrivi-alert-gap, 6px) !important;
}
.custom-preview-container .onrivi-alert-content > p:first-child,
.onrivi-content-root .onrivi-alert-content > p:first-child {
  margin-top: 0 !important;
}
.custom-preview-container .onrivi-alert-content > p:last-child,
.onrivi-content-root .onrivi-alert-content > p:last-child {
  margin-bottom: 0 !important;
}

/* 💬 코드블록 내부 줄간격(행간) 콤팩트 규격화 및 자동 줄바꿈 강제 (내보내기 시 가로 스크롤 소거 및 전체 내용 표시) */
.custom-preview-container .codeblock-area,
.onrivi-content-root .codeblock-area,
.codeblock-area {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.custom-preview-container .codeblock-area div,
.onrivi-content-root .codeblock-area div,
.codeblock-area div {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: visible !important;
}
.custom-preview-container .codeblock-area pre,
.custom-preview-container .codeblock-area pre code,
.custom-preview-container .codeblock-area .onrivi-line,
.custom-preview-container .codeblock-area .onrivi-line *,
.onrivi-content-root .codeblock-area pre,
.onrivi-content-root .codeblock-area pre code,
.onrivi-content-root .codeblock-area .onrivi-line,
.onrivi-content-root .codeblock-area .onrivi-line *,
.codeblock-area pre,
.codeblock-area pre code,
.codeblock-area .onrivi-line,
.codeblock-area .onrivi-line *,
pre,
pre code {
  line-height: ${(profile.rules?.codeBlock && profile.rules.codeBlock['line-height']) || '1.35'} !important;
  min-height: 0 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
  box-sizing: border-box !important;
}
.custom-preview-container .codeblock-area pre,
.onrivi-content-root .codeblock-area pre,
.codeblock-area pre,
pre {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: visible !important;
}
`;

  if (profile.hrStructure) {
    const hrStyle = profile.hrStructure.borderTopStyle || 'solid';
    const hrWidth = profile.hrStructure.borderTopWidth || '1px';
    const hrMargin = profile.hrStructure.marginTopBottom || '28px';
    const hrLineWidth = profile.hrStructure.lineWidth || '100%';
    const hrColor = (profile.rules.hr && profile.rules.hr['border-top-color']) || '#d1d5db';

    css += `
.custom-preview-container hr,
.onrivi-content-root hr {
  border: none !important;
  height: 0 !important;
  background: transparent !important;
  border-top: ${hrWidth} ${hrStyle} ${hrColor} !important;
  margin-top: ${hrMargin} !important;
  margin-bottom: ${hrMargin} !important;
  width: ${hrLineWidth} !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
`;
  }

  /* 페이지 나눔 제어: 리스트가 통째로 다음 페이지로 밀리지 않고 자연스럽게 분할되도록 */
  css += `
@media print {
  p, li, .prose p {
    page-break-inside: auto !important;
    break-inside: auto !important;
    orphans: 2 !important;
    widows: 2 !important;
  }
  ul, ol {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  blockquote {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  section,
  article,
  .page-break-container,
  .markdown-viewer-root,
  .custom-preview-container {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  figcaption,
  .onrivi-image-figure figcaption {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: block !important;
    text-align: center !important;
    margin-top: 6px !important;
  }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  /* [P1: Section 시작 위치 최적화] Heading 직후 소개 문단이 이미지/도표로 이어질 때 한 덩어리로 결속 */
  h1 + p:has(+ figure),
  h2 + p:has(+ figure),
  h3 + p:has(+ figure),
  h4 + p:has(+ figure),
  h1 + p:has(+ .onrivi-image-figure),
  h2 + p:has(+ .onrivi-image-figure),
  h3 + p:has(+ .onrivi-image-figure),
  h4 + p:has(+ .onrivi-image-figure),
  h1 + p:has(+ .not-prose),
  h2 + p:has(+ .not-prose),
  h3 + p:has(+ .not-prose),
  h4 + p:has(+ .not-prose),
  h1 + ul:has(+ figure),
  h2 + ul:has(+ figure),
  h3 + ul:has(+ figure),
  h4 + ul:has(+ figure),
  h1 + ul:has(+ .onrivi-image-figure),
  h2 + ul:has(+ .onrivi-image-figure),
  h3 + ul:has(+ .onrivi-image-figure),
  h4 + ul:has(+ .onrivi-image-figure) {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
  table {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  tfoot {
    display: table-footer-group !important;
  }
  figure, .onrivi-image-figure {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: block !important;
    margin: 1.2em auto !important;
    text-align: center !important;
  }
  .onrivi-image-wrapper {
    display: block !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    text-align: center !important;
  }
  figure img,
  .onrivi-image-figure img,
  .onrivi-image-wrapper img {
    max-width: 100% !important;
    max-height: 190mm !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  img, video, iframe, .katex-display {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .not-prose,
  .not-prose > div,
  .mermaid-svg-container,
  .mermaid-block-container {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    overflow: visible !important;
  }
  .mermaid-svg-container svg,
  .mermaid-block-container svg,
  .not-prose svg {
    max-height: 200mm !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  pre, code, .codeblock-area {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }
  .injected-page-break-marker {
    break-before: page !important;
    page-break-before: always !important;
  }
  hr:not(.page-break) {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
`;

  const bodyTextColor = (profile.rules?.p && (profile.rules.p as any)['color']) || '#2f2f2f';
  const taskListColor = (profile.rules?.taskList && (profile.rules.taskList as any)['color']) || bodyTextColor;

  // 💡 체크리스트(task-list-item): 중복 불릿(•) 기호 완전 소거 및 본문 텍스트 색상과 100% 일치
  css += `
.custom-preview-container li.task-list-item,
.onrivi-content-root li.task-list-item {
  list-style: none !important;
  list-style-type: none !important;
  list-style-image: none !important;
  color: ${taskListColor} !important;
}
.custom-preview-container li.task-list-item::marker,
.onrivi-content-root li.task-list-item::marker,
.custom-preview-container li.task-list-item::before,
.onrivi-content-root li.task-list-item::before {
  content: "" !important;
  display: none !important;
}
.custom-preview-container ul.contains-task-list,
.onrivi-content-root ul.contains-task-list {
  list-style: none !important;
  list-style-type: none !important;
  padding-left: 0 !important;
}
.custom-preview-container li > p,
.custom-preview-container li p,
.onrivi-content-root li > p,
.onrivi-content-root li p {
  display: inline !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.custom-preview-container li p .onrivi-line,
.onrivi-content-root li p .onrivi-line {
  display: inline !important;
  width: auto !important;
  min-height: 0 !important;
}
.custom-preview-container li p + p,
.onrivi-content-root li p + p {
  display: block !important;
  margin-top: 0.45em !important;
}
`;

  if (profile.checkboxStructure) {
    const boxSize = profile.checkboxStructure.boxSize || '16px';
    const checkedEffect = profile.checkboxStructure.checkedEffect || 'none';
    const textGap = profile.checkboxStructure.textGap || '10px';
    const cbColor = profile.checkboxStructure.color || bodyTextColor;

    css += `
.custom-preview-container li.task-list-item {
  position: relative !important;
  padding-left: calc(${boxSize} + ${textGap}) !important;
  list-style: none !important;
  list-style-type: none !important;
}
.custom-preview-container li.task-list-item input[type="checkbox"] {
  position: absolute !important;
  left: 0 !important;
  top: 0.2em !important;
  width: ${boxSize} !important;
  height: ${boxSize} !important;
  margin: 0 !important;
  accent-color: ${cbColor} !important;
  border-color: ${cbColor} !important;
}
`;
    if (checkedEffect === 'line-through-and-dim') {
      css += `
.custom-preview-container .task-list-item-checked {
  text-decoration: line-through !important;
  opacity: 0.5 !important;
}
`;
    } else if (checkedEffect === 'dim-only') {
      css += `
.custom-preview-container .task-list-item-checked {
  opacity: 0.5 !important;
}
`;
    } else {
      css += `
.custom-preview-container .task-list-item-checked {
  text-decoration: none !important;
  opacity: 1 !important;
}
`;
    }
  }

  // 미리보기와 동일하게 제목 정렬·왼쪽 여백 컨트롤을 최종 적용한다.
  for (let level = 1; level <= 6; level++) {
    const rule = profile.rules[`h${level}` as keyof typeof profile.rules];
    if (!rule) continue;
    const alignment = rule['text-align'] || 'left';
    const leftMargin = alignment === 'left' ? '0' : 'auto';
    const rightMargin = alignment === 'right' ? '0' : 'auto';
    css += `.custom-preview-container h${level}, .onrivi-content-root h${level} {\n`;
    css += `  margin-left: ${leftMargin} !important;\n  margin-right: ${rightMargin} !important;\n`;
    css += `  padding-left: ${rule['padding-left'] || '0px'} !important;\n}\n`;
  }

  // 🌟 본문 내 사용자 우측/중앙 정렬(align, text-align, table 등) 100% 보장
  css += `
.custom-preview-container [align="right"],
.onrivi-content-root [align="right"],
.custom-preview-container [style*="text-align: right"],
.onrivi-content-root [style*="text-align: right"],
.custom-preview-container [style*="text-align:right"],
.onrivi-content-root [style*="text-align:right"],
.custom-preview-container .text-right,
.onrivi-content-root .text-right {
  text-align: right !important;
}
.custom-preview-container [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [align="right"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align: right"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align:right"] > :is(p, span, div, strong, em, b, i, td, th) {
  text-align: right !important;
}
.custom-preview-container [align="right"] ul,
.custom-preview-container [align="right"] ol,
.onrivi-content-root [align="right"] ul,
.onrivi-content-root [align="right"] ol,
.custom-preview-container [style*="text-align: right"] ul,
.custom-preview-container [style*="text-align: right"] ol,
.onrivi-content-root [style*="text-align: right"] ul,
.onrivi-content-root [style*="text-align: right"] ol {
  display: inline-block !important;
  text-align: left !important;
}
.custom-preview-container [align="center"],
.onrivi-content-root [align="center"],
.custom-preview-container [style*="text-align: center"],
.onrivi-content-root [style*="text-align: center"],
.custom-preview-container [style*="text-align:center"],
.onrivi-content-root [style*="text-align:center"],
.custom-preview-container .text-center,
.onrivi-content-root .text-center {
  text-align: center !important;
}
.custom-preview-container [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [align="center"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align: center"] > :is(p, span, div, strong, em, b, i, td, th),
.custom-preview-container [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th),
.onrivi-content-root [style*="text-align:center"] > :is(p, span, div, strong, em, b, i, td, th) {
  text-align: center !important;
}
.custom-preview-container [align="center"] ul,
.custom-preview-container [align="center"] ol,
.onrivi-content-root [align="center"] ul,
.onrivi-content-root [align="center"] ol,
.custom-preview-container [style*="text-align: center"] ul,
.custom-preview-container [style*="text-align: center"] ol,
.onrivi-content-root [style*="text-align: center"] ul,
.onrivi-content-root [style*="text-align: center"] ol {
  display: inline-block !important;
  text-align: left !important;
}
`;

  // 🚨 @PATCH : 내보내기에도 설정창 우선 계층을 적용해 미리보기와 같은 결과를 유지한다.
  const extraCss = profile.customCss?.trim()
    ? `\n@layer onrivi-extra {\n${profile.customCss}\n}`
    : '';
  return `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-settings {\n${css}\n${reportNumberingCss(profile)}\n${headingNumberingCss(profile)}\n}${extraCss}\n${PRINT_TABLE_FLOW_CSS}`;
}
