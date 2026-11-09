/**
 * ============================================================================
 * 🏷️ 파일명 : dynamicCssGenerator.ts
 * 🎯 주요기능 :
 *   - 활성 서식 프로필(CssProfile) 기반 동적 CSS(타이포그래피, 코드블록, 표, 체크박스, 구분선, 다크모드 재정의 등) 생성 엔진
 *   - @layer 캐스케이드 격리 및 그림책(Story Book) 프로필 연동
 * 🚨 @PATCH :
 *   - 2026-11-08 : 인용구(blockquote) 및 알림(alert) 내부 문단 간격(p + p: 0.85em) 및 빈 문단(p:empty) 높이 보장으로 Shift+Enter 문단 개행 가독성 정상화
 *   - 2026-11-04 : 주석 표준화(1·2단계) 적용
 *   - 2026-11-04 : MainEditorApp에서 1,234줄 인라인 CSS 생성기를 독립 라이브러리로 분리
 * ============================================================================
 */

import { CssProfile } from '@/types/cssProfile';
import { DEFAULT_PROFILE, resolveCssProfile } from '@/constants/cssProfile';
import { reportNumberingCss } from '@/lib/reportNumbering';
import { headingNumberingCss } from '@/lib/headingNumbering';
import { documentBookProfile } from '@/lib/picturebook';

/**
 * ============================================================================
 * [generateDynamicCss]
 * 활성 서식 프로필(CssProfile)과 보기 모드를 바탕으로 미리보기/문서보기용 동적 CSS 문자열을 생성합니다.
 *
 * @param {CssProfile[]} profiles - 전체 서식 프로필 목록
 * @param {string} activeProfileId - 현재 활성 서식 프로필 ID
 * @param {string} [previewMode] - 현재 미리보기 모드
 * @param {boolean} [isStyleModalOpen] - 서식 관리 모달 열림 여부
 * @returns {string} 생성된 동적 CSS 스타일시트 문자열
 * ============================================================================
 */
export function generateDynamicCss(
  profiles: CssProfile[],
  activeProfileId: string,
  previewMode?: string,
  isStyleModalOpen?: boolean
): string {
    const rawProf = documentBookProfile('', profiles.find(p => p.id === activeProfileId) || DEFAULT_PROFILE, previewMode === 'css-style' || isStyleModalOpen);
    if (activeProfileId === 'default') {
      return (rawProf.customCss && rawProf.customCss.trim())
        ? `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-extra {\n${rawProf.customCss}\n}`
        : '';
    }
    const prof = resolveCssProfile(rawProf);
    const ps = prof.pageStyle;

    const profileBg = ps.backgroundColor || '#ffffff';
    const bg = profileBg;
    // Set a very dark gray/black color instead of 'inherit' for much better contrast on white backgrounds
    const fg = '#1a1a1a';

    let css = `
.custom-preview-container {
  background: ${bg} !important;
  color: ${fg} !important;
  font-family: ${ps.fontFamily} !important;
  font-size: ${ps.fontSize} !important;
  line-height: ${ps.lineHeight} !important;
  letter-spacing: ${ps.letterSpacing} !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
  -webkit-font-smoothing: subpixel-antialiased !important;
  -moz-osx-font-smoothing: auto !important;
  text-rendering: optimizeLegibility !important;
}
.custom-preview-container p,
.custom-preview-container strong,
.custom-preview-container b,
.custom-preview-container em,
.custom-preview-container span,
.custom-preview-container a,
.custom-preview-container .onrivi-content-root p,
.custom-preview-container li,
.custom-preview-container .onrivi-content-root li,
.custom-preview-container blockquote,
.custom-preview-container .onrivi-content-root blockquote {
  font-size: inherit !important;
  line-height: ${(prof.rules.p && prof.rules.p['line-height']) || ps.lineHeight || '1.8'} !important;
  overflow-wrap: break-word !important;
  word-break: normal !important;
}
/* 탭 간격 (Tab Size) — pre/code에서 탭 문자가 표시될 폭 */
.custom-preview-container pre,
.custom-preview-container code {
  tab-size: ${ps.tabSize || '2'} !important;
  -moz-tab-size: ${ps.tabSize || '2'} !important;
}
`;
    /* H2~H6 자동 크기 계산 (headingSizeOffset 기반, pt/px 단위 상호 변환 및 '0pt' 명시 지원) */
    const h1SizeVal = (prof.rules.h1 && prof.rules.h1['font-size']) || '21pt';
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
      css += `.custom-preview-container h${level}, .onrivi-content-root h${level} {\n  font-size: ${calcSize}${h1Unit} !important;\n}\n`;
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

    Object.entries(prof.rules).forEach(([tag, ruleObj]) => {
      /* hr(구분선)은 전용 인젝션 블록에서 완전하게 통합 제어하므로 건너뜀 */
      if (tag === 'hr') return;
      /* h2~h6의 font-size는 headingSizeOffset 자동 계산으로 대체 */
      const skipFontSize = ['h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
      // 빈 값도 '선 없음'으로 출력해야 다른 서식의 제목 장식선(하단 밑줄·좌측 색깔바)이 남지 않는다.
      const effectiveRules = /^h[1-6]$/.test(tag)
        ? {
            ...ruleObj,
            'border-bottom': ruleObj['border-bottom']?.trim() || 'none',
            'border-left': ruleObj['border-left']?.trim() || 'none',
          }
        : ruleObj;
      const entries = Object.entries(effectiveRules).map(([prop, v]) => {
        // 💡 [OMD-PATCH] 구버전 유저 프로필에 저장된 keep-all이 불러와지면서 거대 공백 버그를 유발하는 것을 막기 위해 강제 마이그레이션
        if (prop === 'word-break' && v === 'keep-all') return [prop, 'break-all'];
        return [prop, v];
      }).filter(([prop, v]) => {
        if (v === '') return false;
        if (skipFontSize && prop === 'font-size') return false;
        if (prop === 'sentence-gap') return false;
        return true;
      }).sort((a, b) => sortCssProps(a[0], b[0]));

      if (tag === 'p') {
        const sGap = ruleObj['sentence-gap'];
        const sGapNum = parseInt(sGap || '0', 10) || 0;
        if (sGapNum > 0) {
          css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak) {
  display: block !important;
  content: "" !important;
  margin-top: ${sGap} !important;
  height: 0 !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line {
  margin-top: ${sGap} !important;
}
`;
        } else {
          css += `
.custom-preview-container .onrivi-sentence-br,
.onrivi-content-root .onrivi-sentence-br,
.custom-preview-container p br:not(.ProseMirror-trailingBreak),
.onrivi-content-root p br:not(.ProseMirror-trailingBreak) {
  display: inline !important;
  margin: 0 !important;
  content: normal !important;
}
.custom-preview-container p .onrivi-line + .onrivi-line,
.onrivi-content-root p .onrivi-line + .onrivi-line {
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

          // 💡 코드블록 배경색 명도(Luminance) 판별: 다크모드 계열/어두운 배경일 경우 고대비 코발트 블루 및 1px 아웃라인 하이라이트 적용
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
        const cbLineHeight = ruleObj['line-height'] || '1.35';
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code, .custom-preview-container .codeblock-area .onrivi-line, .custom-preview-container .codeblock-area .onrivi-line * {\n  line-height: ${cbLineHeight} !important;\n  min-height: 0 !important;\n}\n`;

        // 💡 프리뷰 모드에서 중첩된 테두리와 배경색(박스 안의 박스 현상) 원천 차단
        css += `.custom-preview-container .codeblock-area pre, .custom-preview-container .codeblock-area pre code {\n  border: none !important;\n  background: transparent !important;\n}\n`;

        // 💡 코드블록 전용 명시적 가로 스크롤바 (테마의 글자 색상을 바탕으로 한층 더 밝고 두껍게)
        const trackColor = color ? `color-mix(in srgb, ${color} 15%, transparent)` : 'rgba(200, 200, 200, 0.1)';
        const thumbColor = color ? `color-mix(in srgb, ${color} 60%, transparent)` : 'rgba(200, 200, 200, 0.6)';
        const thumbHoverColor = color ? `color-mix(in srgb, ${color} 85%, transparent)` : 'rgba(200, 200, 200, 0.8)';

        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar {\n  height: 10px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-track {\n  background: ${trackColor} !important;\n  border-radius: 5px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-thumb {\n  background: ${thumbColor} !important;\n  border-radius: 5px !important;\n}\n`;
        css += `.custom-preview-container .codeblock-area .custom-scrollbar::-webkit-scrollbar-thumb:hover {\n  background: ${thumbHoverColor} !important;\n}\n`;
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
        tag === 'code' ? ':not(pre) > code, code:not(pre code):not(.codeblock-area code)' :
          tag === 'map' ? 'iframe[src*="map"], iframe[src*="google.com/maps"], iframe[src*="maps.google.com"]' :
            tag === 'video' ? 'video, iframe[src*="youtube"], iframe[src*="vimeo"], a[href*="youtube.com"] img, a[href*="youtu.be"] img' : tag;
            
      const isMediaTag = tag === 'img' || tag === 'video' || tag === 'map';
      const isTableTag = ['table', 'th', 'td'].includes(tag);

      // 📊 Tailwind Typography 및 다크모드(.dark .prose)를 완벽히 압도하도록 모든 태그의 선택자 구체성을 일원화
      const selectorStr = `
        .custom-preview-container ${selector},
        .onrivi-content-root ${selector},
        .custom-preview-container .prose ${selector},
        .dark .custom-preview-container .prose ${selector},
        .onrivi-content-root .prose ${selector},
        .dark .onrivi-content-root .prose ${selector}
      `.replace(/\s+/g, ' ').trim();
      css += `${selectorStr} {\n`;

      const bStyle = ruleObj['border-style'];
      const isDouble = bStyle === 'double';

      entries.forEach(([prop, val]) => {
        let finalVal = val;
        // 💡 이중선(double)인 경우 W3C 물리 렌더링 한계(최소 3px이어야 두 줄이 그려짐)를 보장하기 위해 3px 미만 시 3px로 보정
        if (isTableTag && isDouble && prop === 'border-width') {
          const wNum = parseInt(val as string, 10) || 1;
          if (wNum < 3) finalVal = '3px';
        }
        css += `  ${prop}: ${finalVal} !important;\n`;
        // 💡 인라인 코드 패딩 shorthand 시 padding-left/right를 함께 보장하여 globals.css 및 Tailwind px 클래스 오버라이드
        if (tag === 'code' && prop === 'padding' && val) {
          const parts = String(val).trim().split(/\s+/);
          const pxVal = parts.length >= 2 ? parts[1] : parts[0];
          css += `  padding-left: ${pxVal} !important;\n`;
          css += `  padding-right: ${pxVal} !important;\n`;
        }
      });

      // 💡 미디어 객체(이미지, 비디오, 지도)의 좌/중/우 정렬을 flex 래퍼 컨테이너 내부에서도 완벽 보장하기 위한 align-self 자동 주입
      if (isMediaTag) {
        const ml = ruleObj['margin-left'];
        const mr = ruleObj['margin-right'];
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

      // 💡 th/td의 경우 globals.css의 하드코딩된 border-bottom: 1px solid ... !important를 격파하기 위해 border-bottom-style 명시 주입
      if ((tag === 'th' || tag === 'td') && bStyle) {
        css += `  border-bottom-style: ${bStyle} !important;\n`;
        if (isDouble) {
          const curW = parseInt(ruleObj['border-width'] || '1', 10);
          css += `  border-bottom-width: ${curW < 3 ? '3px' : curW + 'px'} !important;\n`;
        }
      }
      css += `}\n`;

      if (tag === 'blockquote') {
        css += `
.custom-preview-container blockquote p,
.onrivi-content-root blockquote p,
blockquote p {
  line-height: 1.55 !important;
}
.custom-preview-container blockquote p:first-child,
.onrivi-content-root blockquote p:first-child,
blockquote p:first-child {
  margin-top: 0 !important;
}
.custom-preview-container blockquote p:last-child,
.onrivi-content-root blockquote p:last-child,
blockquote p:last-child {
  margin-bottom: 0 !important;
}
.custom-preview-container blockquote p + p,
.onrivi-content-root blockquote p + p,
blockquote p + p {
  margin-top: 0.85em !important;
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
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
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
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
        const targetWidth = ruleObj['width'] || '100%';
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
        const ml = ruleObj['margin-left'] || 'auto';
        const mr = ruleObj['margin-right'] || 'auto';
        const targetWidth = ruleObj['width'] || '100%';
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

    // 🧰 구조제어: 표 글자 크기 동적 상속 (설정하지 않은 경우 페이지 기본 크기를 따름)
  // Resolve base-size controls against the document, even inside fixed-size wrappers.
  const baseSizeSelectors = {
    blockquote: 'blockquote, blockquote p, blockquote span, blockquote li',
    codeBlock: '.codeblock-area pre, .codeblock-area pre code, .codeblock-area .onrivi-line, .codeblock-area .onrivi-line *',
    math: '.katex-display .katex, :not(.katex-display) > .katex',
  };
  const baseSizeRoots = [
    '.custom-preview-container',
    '.custom-preview-container .prose',
    '.dark .custom-preview-container .prose',
    '.onrivi-content-root',
    '.onrivi-content-root .prose',
    '.dark .onrivi-content-root .prose',
  ];
  Object.entries(baseSizeSelectors).forEach(([tag, selectors]) => {
    const configured = prof.rules[tag as keyof CssProfile['rules']]?.['font-size'];
    const size = !configured || ['inherit', '0', '0px'].includes(String(configured)) ? ps.fontSize : configured;
    const scoped = baseSizeRoots
      .flatMap(root => selectors.split(', ').map(selector => `${root} ${selector}`)).join(', ');
    css += `${scoped} { font-size: ${size} !important; }\n`;
  });

    const tableHasFontSize = prof.rules.table && prof.rules.table['font-size'];
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

    // 📊 표 정교화 보정: 세로 중앙 정렬 및 단어 단위 줄바꿈(keep-all), border-collapse 통합, 원치 않는 외곽 둥근 모서리/그림자/지브라 패턴 완전 소멸
    css += `
.custom-preview-container table,
.onrivi-content-root table,
.custom-preview-container .prose table,
.dark .custom-preview-container .prose table,
.onrivi-content-root .prose table,
.dark .onrivi-content-root .prose table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  border-radius: 0 !important;
  overflow: visible !important;
  box-shadow: none !important;
  width: 100% !important;
  max-width: 100% !important;
  table-layout: auto !important;
}
/* Directly editable tables use explicit colgroup widths during boundary dragging. */
.custom-preview-container .visual-document-surface table.visual-editable-table,
.onrivi-content-root .visual-document-surface table.visual-editable-table,
.dark .custom-preview-container .visual-document-surface table.visual-editable-table,
.dark .onrivi-content-root .visual-document-surface table.visual-editable-table {
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
.onrivi-content-root table :is(th, td) code,
.visual-document-surface table :is(th, td) code {
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
    const tableStruct = prof.tableStructure || DEFAULT_PROFILE.tableStructure;
    if (tableStruct) {
      const outerWidth = tableStruct.outerBorderWidth || '1px';
      const rowWidth = tableStruct.rowBorderWidth || '1px';
      const colWidth = tableStruct.colBorderWidth ?? '0px';
      const tableBorderStyle = prof.rules.table?.['border-style'] || 'solid';
      // 💡 외곽선 및 테두리 색상: profile 규칙 또는 선명한 차콜 다크(#374151) 고대비 보장
      const outerBorderColor = prof.rules.table?.['border-color'] || '#374151';
      const rowBorderColor = prof.rules.th?.['border-color'] || prof.rules.td?.['border-color'] || prof.rules.table?.['border-color'] || '#cbd5e1';
      const colBorderColor = rowBorderColor;

      // 1. 표 외곽 테두리 (table 및 최외곽 4면 셀 직접 주입)
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

/* 🛡️ 표 최외곽 4면 테두리 */
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

    // 📊 표 여백 및 래퍼 정교화: 표 자체는 0마진으로 밀착하고, 래퍼(.table-wrapper-area)에 상하 여백 적용 및 직전 캡션 문구(p) 밀착
    const tableMarginTop = prof.rules.table?.['margin-top'] || '4px';
    const tableMarginBottom = prof.rules.table?.['margin-bottom'] || '16px';
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
.onrivi-content-root table {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}
.custom-preview-container table th p,
.custom-preview-container table td p,
.onrivi-content-root table th p,
.onrivi-content-root table td p {
  margin: 0 !important;
  padding: 0 !important;
}
/* Editable tables have no wrapper; apply the selected profile spacing directly. */
.custom-preview-container .visual-document-surface table.visual-editable-table,
.onrivi-content-root .visual-document-surface table.visual-editable-table {
  margin-top: ${tableMarginTop} !important;
  margin-bottom: ${tableMarginBottom} !important;
}
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

/* 💬 코드블록 내부 줄간격(행간) 콤팩트 규격화 (본문 1.8배 오염 원천 방어) */
.custom-preview-container .codeblock-area pre,
.custom-preview-container .codeblock-area pre code,
.custom-preview-container .codeblock-area .onrivi-line,
.custom-preview-container .codeblock-area .onrivi-line *,
.onrivi-content-root .codeblock-area pre,
.onrivi-content-root .codeblock-area pre code,
.onrivi-content-root .codeblock-area .onrivi-line,
.onrivi-content-root .codeblock-area .onrivi-line * {
  line-height: ${(prof.rules.codeBlock && prof.rules.codeBlock['line-height']) || '1.35'} !important;
  min-height: 0 !important;
}
`;

    // 🧰 구조제어: 구분선 규칙 (HR) 동적 인젝션
    const hrStruct = prof.hrStructure || DEFAULT_PROFILE.hrStructure || {
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      marginTopBottom: '32px',
      lineWidth: '100%'
    };
    const hrRules = prof.rules.hr || {};
    const hrStyle = hrStruct.borderTopStyle || 'solid';
    const hrWidth = hrStruct.borderTopWidth || '1px';
    const hrMargin = hrStruct.marginTopBottom || '32px';
    const hrLen = hrStruct.lineWidth || '100%';
    const hrColor = hrRules['border-top-color'] || hrRules['border-color'] || hrRules['color'] || '#e5e7eb';
    css += `
.custom-preview-container hr,
.onrivi-content-root hr {
  border: none !important;
  height: 0 !important;
  background: transparent !important;
  border-top-width: ${hrWidth} !important;
  border-top-style: ${hrStyle} !important;
  border-top-color: ${hrColor} !important;
  margin-top: ${hrMargin} !important;
  margin-bottom: ${hrMargin} !important;
  width: ${hrLen} !important;
  ${hrLen !== '100%' ? 'margin-left: auto !important;\n  margin-right: auto !important;' : ''}
}
`;

    const bodyTextColor = (prof.rules.p && prof.rules.p['color']) || '#2f2f2f';

    // 🧰 구조제어: 체크박스 규칙 (Task List) 동적 인젝션
    if (prof.checkboxStructure) {
      const cbSize = prof.checkboxStructure.boxSize || '16px';
      const cbGap = prof.checkboxStructure.textGap || '9px';
      const cbEffect = prof.checkboxStructure.checkedEffect || 'none';
      const cbColor = prof.checkboxStructure.color || bodyTextColor;
      css += `
.custom-preview-container input[type="checkbox"] {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: ${cbSize} !important;
  height: ${cbSize} !important;
  margin-right: ${cbGap} !important;
  border: 1px solid ${cbColor} !important;
  border-radius: 3px !important;
  background-color: transparent !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  vertical-align: middle !important;
  flex-shrink: 0 !important;
}

.custom-preview-container input[type="checkbox"]:checked {
  background-color: ${cbColor} !important;
  border-color: ${cbColor} !important;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E") !important;
  background-size: 100% 100% !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
`;
      if (cbEffect === 'line-through-and-dim') {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  text-decoration: line-through !important;
  opacity: 0.5 !important;
}
`;
      } else if (cbEffect === 'dim-only') {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  opacity: 0.5 !important;
}
`;
      } else {
        css += `
.custom-preview-container .task-list-item:has(input:checked) {
  text-decoration: none !important;
  opacity: 1 !important;
}
`;
      }
    }



    const liMarginBottom = (prof.rules.li && prof.rules.li['margin-bottom']) || '6px';
    const paragraphMarginTop = prof.rules.p?.['margin-top'] ?? '0px';
    const listIndent = (prof.rules.ul && prof.rules.ul['padding-left']) || (prof.rules.ol && prof.rules.ol['padding-left']) || '28px';
    const liMarkerGap = (prof.rules.li && (prof.rules.li['padding-inline-start'] || prof.rules.li['padding-left'])) || '0px';

    // 💡 마커 색상: ul/ol 텍스트 색상을 상속받도록 강제 (Tailwind 기본색상 무시)
    // 💡 체크리스트(task-list-item): 중복 불릿(•) 기호 완전 소거 및 본문 텍스트 색상과 100% 일치
    css += `
:root {
  --list-indent: ${listIndent};
  --li-margin-bottom: ${liMarginBottom};
  --li-marker-gap: ${liMarkerGap};
}
.custom-preview-container,
.onrivi-content-root {
  --list-indent: ${listIndent};
  --li-margin-bottom: ${liMarginBottom};
  --li-marker-gap: ${liMarkerGap};
}
.custom-preview-container ul li::marker,
.custom-preview-container ol li::marker {
  color: inherit !important;
}
.custom-preview-container li.task-list-item,
.onrivi-content-root li.task-list-item {
  list-style: none !important;
  list-style-type: none !important;
  list-style-image: none !important;
  color: ${(prof.rules.taskList && prof.rules.taskList['color']) || bodyTextColor} !important;
  margin-top: 0 !important;
  margin-bottom: ${liMarginBottom} !important;
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
.custom-preview-container li ul.contains-task-list,
.onrivi-content-root li ul.contains-task-list,
.custom-preview-container li ol.contains-task-list,
.onrivi-content-root li ol.contains-task-list {
  padding-left: ${listIndent} !important;
}
.custom-preview-container li,
.onrivi-content-root li {
  margin-top: 0 !important;
  margin-bottom: ${liMarginBottom} !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-inline-start: ${liMarkerGap} !important;
  padding-left: ${liMarkerGap} !important;
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
.custom-preview-container ul,
.custom-preview-container ol,
.onrivi-content-root ul,
.onrivi-content-root ol {
  margin-top: 4px !important;
  margin-bottom: 4px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: ${listIndent} !important;
}
.custom-preview-container ul + p,
.custom-preview-container ol + p,
.onrivi-content-root ul + p,
.onrivi-content-root ol + p {
  margin-top: ${paragraphMarginTop} !important;
}
.custom-preview-container p + ul,
.custom-preview-container p + ol,
.onrivi-content-root p + ul,
.onrivi-content-root p + ol {
  margin-top: 4px !important;
}
/* NodeViews wrap list content in a div; nested lists must still stay tight. */
.custom-preview-container li ul,
.custom-preview-container li ol,
.onrivi-content-root li ul,
.onrivi-content-root li ol {
  margin-top: 0.25em !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  padding-left: ${listIndent} !important;
}
.custom-preview-container .visual-document-surface blockquote p:first-child,
.custom-preview-container .visual-document-surface .onrivi-alert-content p:first-child,
.onrivi-content-root .visual-document-surface blockquote p:first-child,
.onrivi-content-root .visual-document-surface .onrivi-alert-content p:first-child {
  margin-top: 0 !important;
}
.custom-preview-container .visual-document-surface blockquote p:last-child,
.custom-preview-container .visual-document-surface .onrivi-alert-content p:last-child,
.onrivi-content-root .visual-document-surface blockquote p:last-child,
.onrivi-content-root .visual-document-surface .onrivi-alert-content p:last-child {
  margin-bottom: 0 !important;
}
.custom-preview-container .visual-document-surface blockquote p + p,
.custom-preview-container .visual-document-surface .onrivi-alert-content p + p,
.onrivi-content-root .visual-document-surface blockquote p + p,
.onrivi-content-root .visual-document-surface .onrivi-alert-content p + p {
  margin-top: 0.85em !important;
}
/* Keep native code cards apart and scroll long lines inside each card. */
.custom-preview-container .visual-document-surface .visual-code-block {
  margin-top: 24px !important;
  margin-bottom: 20px !important;
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.custom-preview-container .visual-document-surface .visual-code-block pre {
  display: block !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow-x: auto !important;
  white-space: pre !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
.custom-preview-container .visual-document-surface .visual-code-block pre code {
  display: block !important;
  width: max-content !important;
  min-width: 100% !important;
  white-space: pre !important;
  overflow: visible !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}
/* Separate top-level lists retain the same gap as a following paragraph. */
.custom-preview-container .visual-document-surface > ul + ul,
.custom-preview-container .visual-document-surface > ol + ol {
  margin-top: 4px !important;
}
.custom-preview-container .visual-document-surface > :is(ul,ol) + :is(ul,ol) {
  margin-top: 4px !important;
}
.custom-preview-container .visual-document-surface p:empty,
.custom-preview-container .visual-document-surface p:has(> br:only-child),
.custom-preview-container .visual-document-surface p:has(> br.ProseMirror-trailingBreak:only-child),
.onrivi-content-root .visual-document-surface p:empty,
.onrivi-content-root .visual-document-surface p:has(> br:only-child),
.onrivi-content-root .visual-document-surface p:has(> br.ProseMirror-trailingBreak:only-child) {
  min-height: 1.25em;
  cursor: text;
}
.custom-preview-container .visual-document-surface ::selection,
.custom-preview-container .visual-document-surface *::selection,
.onrivi-content-root .visual-document-surface ::selection,
.onrivi-content-root .visual-document-surface *::selection {
  background: #2563eb !important;
  color: #ffffff !important;
}
.dark .custom-preview-container .visual-document-surface ::selection,
.dark .custom-preview-container .visual-document-surface *::selection,
.dark .onrivi-content-root .visual-document-surface ::selection,
.dark .onrivi-content-root .visual-document-surface *::selection {
  background: #3b82f6 !important;
  color: #ffffff !important;
}
`; 

    // 제목 컨트롤 값은 사용자 CSS의 h1 자동 중앙 배치보다 우선한다.
    for (let level = 1; level <= 6; level++) {
      const rule = prof.rules[`h${level}` as keyof typeof prof.rules];
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

    // Legacy CSS page-break logic removed in favor of injectPageBreakMarkers.

    // important 선언은 먼저 선언한 계층이 우선한다. 중복 style 태그와 추가 CSS의 높은 선택자 구체성에도 설정값을 유지한다.
    const extraCss = prof.customCss?.trim()
      ? `\n@layer onrivi-extra {\n${prof.customCss}\n}`
      : '';
    return `@layer onrivi-settings, onrivi-extra;\n@layer onrivi-settings {\n${css}\n${reportNumberingCss(prof)}\n${headingNumberingCss(prof)}\n}${extraCss}`;
}
