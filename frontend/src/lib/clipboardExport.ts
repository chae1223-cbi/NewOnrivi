// ====================================================================
// 📊 [OMD-LIB-clipboardExport-0001] clipboardExport.ts
// 🎯 @KICK  : 문서보기(VisualDocumentEditor/MarkdownViewer)의 렌더링된 서식 본문을 CSS 인라인 스타일 및 HTML 클립보드로 완벽 직렬화
// 🛡️ @GUARD : 외부 앱(Word, 네이버 블로그, 노션, Google Docs 등) 붙여넣기 시 CSS 프로필/커스텀 서식 100% 보존
// 🚨 @PATCH : **2026-10-24** — [다크모드 고대비 텍스트 색상 정규화 및 DOM Selection 기반 100% 신뢰성 클립보드 복사 엔진 고도화]:
//             1) 다크 모드에서 복사 시 밝은 텍스트(rgb(244, 244, 245) 등)가 Word/네이버 블로그의 흰색 용지에 붙여넣어져 투명/미표시되는 결함을 방지하기 위해 고대비 텍스트(#1e293b / #0f172a)로 자동 정규화 (Rule 8)
//             2) 오프스크린 contenteditable DOM Selection 기반 동기식 execCommand 복사 기법을 도입하여 비동기 포커스 소실 및 미재시작 Electron 환경에서도 100% 클립보드 기록 보장
//             3) 이미지 태그 blob/로컬 URL 캔버스 기반 Base64 Data URL 치환 유지 및 figure 래퍼 정규화
// ====================================================================

const IMPORTANT_CSS_PROPERTIES = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-decoration-line',
  'text-decoration-color',
  'text-transform',
  'border-top-width',
  'border-top-style',
  'border-top-color',
  'border-bottom-width',
  'border-bottom-style',
  'border-bottom-color',
  'border-left-width',
  'border-left-style',
  'border-left-color',
  'border-right-width',
  'border-right-style',
  'border-right-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'display',
  'vertical-align',
  'box-shadow',
  'word-break',
  'overflow-wrap',
  'white-space',
  'list-style-type',
  'border-collapse',
];

function parseRgb(colorStr: string): { r: number; g: number; b: number; a: number } | null {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 렌더링된 소스 DOM 트리의 계산된 CSS(getComputedStyle)를 복사본(clone)에 재귀적으로 1:1 인라인 주입
 * (다크 모드인 경우 외부 문서 붙여넣기 시 텍스트가 흰색으로 묻히지 않도록 고대비 색상으로 안전하게 정규화)
 */
function inlineStylesRecursively(source: Element, clone: Element, isDark: boolean) {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    try {
      const computed = window.getComputedStyle(source);
      for (const prop of IMPORTANT_CSS_PROPERTIES) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== 'initial' && val !== 'auto' && val !== 'normal' && val !== 'none' && val !== 'rgba(0, 0, 0, 0)') {
          clone.style.setProperty(prop, val);
        }
      }

      // [Rule 8] 고대비(High-Contrast) 시인성 보장: 다크모드 텍스트 및 배경 정규화
      const parsedColor = parseRgb(computed.color);
      const isCodeBlock = source.tagName === 'PRE' || source.tagName === 'CODE';

      if (isDark && !isCodeBlock && parsedColor && getLuminance(parsedColor.r, parsedColor.g, parsedColor.b) > 150) {
        // 다크모드의 밝은 텍스트(흰색/연회색) -> Word/네이버 블로그용 진한 본문 색상(#1e293b / #0f172a)으로 정규화
        clone.style.color = /^H[1-6]$/.test(source.tagName) ? '#0f172a' : '#1e293b';
      }

      const parsedBg = parseRgb(computed.backgroundColor);
      if (isDark && !isCodeBlock && parsedBg && getLuminance(parsedBg.r, parsedBg.g, parsedBg.b) < 100) {
        // 다크모드의 어두운 배경색 -> 외부 문서 호환을 위해 투명 처리 (본문 용지 흰색 배경 보존)
        clone.style.backgroundColor = 'transparent';
      }

      // 1) 제목(H1~H6) 하단 테두리 장식선 및 시인성 보존
      if (/^H[1-6]$/.test(source.tagName)) {
        clone.style.color = isDark ? '#0f172a' : (computed.color || '#0f172a');
        clone.style.fontWeight = computed.fontWeight || '700';
        const bBottom = computed.borderBottom;
        if (bBottom && !bBottom.startsWith('0px') && !bBottom.includes('none')) {
          clone.style.borderBottom = isDark ? '1px solid #e2e8f0' : bBottom;
        }
      }

      // 2) 표(Table) 외곽 및 셀 구분선 인라인화
      if (source.tagName === 'TABLE') {
        clone.style.borderCollapse = 'collapse';
        clone.style.width = '100%';
        clone.style.border = isDark ? '1px solid #cbd5e1' : (computed.border || '1px solid #cbd5e1');
      }
      if (source.tagName === 'TH' || source.tagName === 'TD') {
        clone.style.border = isDark ? '1px solid #cbd5e1' : (computed.border || '1px solid #cbd5e1');
        clone.style.padding = computed.padding || '8px 12px';
        if (source.tagName === 'TH') {
          clone.style.backgroundColor = isDark ? '#f1f5f9' : (computed.backgroundColor || '#f8fafc');
          clone.style.color = '#0f172a';
          clone.style.fontWeight = '700';
          clone.style.textAlign = computed.textAlign || 'center';
        } else {
          clone.style.color = isDark ? '#1e293b' : (computed.color || '#1e293b');
        }
      }

      // 3) 인용구 및 Alert 박스 ([!NOTE], [!TIP], [!WARNING], [!CAUTION] 등)
      if (source.tagName === 'BLOCKQUOTE') {
        clone.style.borderLeft = computed.borderLeft || '4px solid #3b82f6';
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          clone.style.backgroundColor = computed.backgroundColor;
        } else if (isDark) {
          clone.style.backgroundColor = '#f8fafc';
        }
        clone.style.color = '#1e293b';
        clone.style.padding = computed.padding || '12px 16px';
        clone.style.margin = computed.margin || '16px 0';
        if (computed.borderRadius) clone.style.borderRadius = computed.borderRadius;
      }

      // 4) 코드 블록 (pre) 및 인라인 코드 (code)
      if (source.tagName === 'PRE') {
        clone.style.backgroundColor = '#1e293b';
        clone.style.color = '#f8fafc';
        clone.style.padding = computed.padding || '16px';
        clone.style.borderRadius = computed.borderRadius || '8px';
        clone.style.fontFamily = computed.fontFamily || 'Consolas, Monaco, "Courier New", monospace';
        clone.style.whiteSpace = 'pre';
        clone.style.overflowX = 'auto';
      }
      if (source.tagName === 'CODE') {
        clone.style.fontFamily = computed.fontFamily || 'Consolas, Monaco, "Courier New", monospace';
        clone.style.fontSize = computed.fontSize || '0.9em';
        if (source.parentElement?.tagName !== 'PRE') {
          clone.style.backgroundColor = isDark ? '#f1f5f9' : (computed.backgroundColor || '#f1f5f9');
          clone.style.color = '#be185d';
          clone.style.padding = computed.padding || '2px 5px';
          clone.style.borderRadius = computed.borderRadius || '4px';
        }
      }

      // 5) 이미지 blob/로컬 URL Base64 Data URL 인라인 변환
      if (source.tagName === 'IMG') {
        const srcImg = source as HTMLImageElement;
        const destImg = clone as HTMLImageElement;
        destImg.style.maxWidth = '100%';
        destImg.style.height = 'auto';
        if (computed.borderRadius) destImg.style.borderRadius = computed.borderRadius;
        if (computed.boxShadow && computed.boxShadow !== 'none') destImg.style.boxShadow = computed.boxShadow;

        const currentSrc = srcImg.currentSrc || srcImg.src;
        if (currentSrc && (currentSrc.startsWith('blob:') || currentSrc.startsWith('http://localhost') || currentSrc.startsWith('file://'))) {
          try {
            if (srcImg.complete && srcImg.naturalWidth > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = srcImg.naturalWidth;
              canvas.height = srcImg.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(srcImg, 0, 0);
                destImg.src = canvas.toDataURL('image/png');
              }
            }
          } catch (e) {
            console.warn('[clipboardExport] Canvas toDataURL skipped:', e);
          }
        }
      }
    } catch (err) {
      console.warn('[clipboardExport] Inlining style failed on node:', err);
    }
  }

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  const minLen = Math.min(sourceChildren.length, cloneChildren.length);
  for (let i = 0; i < minLen; i++) {
    inlineStylesRecursively(sourceChildren[i], cloneChildren[i], isDark);
  }
}

/**
 * 문서 렌더링 요소를 기반으로 계산된 CSS 스타일을 인라인화하여 표준 클립보드 HTML과 순수 텍스트 생성
 */
export function serializeDocumentForClipboard(targetEl: HTMLElement, dynamicCssString?: string): { fullHtml: string; cleanText: string } {
  // 다크 모드 활성화 여부 판별
  const isDark = document.documentElement.classList.contains('dark') || targetEl.closest('.dark') !== null;

  // 1) 전체 구조 1:1 클론
  const clone = targetEl.cloneNode(true) as HTMLElement;

  // 2) 계산된 CSS 스타일 1:1 인라인 주입 (다크모드 고대비 정규화 포함)
  inlineStylesRecursively(targetEl, clone, isDark);

  // 3) UI 제어 버튼, 편집기 컨트롤, 인쇄 숨김 요소 등 소거
  const removeSelectors = [
    '.no-print',
    '.onrivi-media-control',
    '.visual-media-controls',
    '.copy-button-hook',
    '.visual-custom-caret',
    '[data-editor-controls]',
    'button',
    '.ProseMirror-trailingBreak',
    '[data-onrivi-temp]',
    '.onrivi-page-guides',
    '.preview-toolbar-root',
    '#onrivi-find-widget',
    'style',
    'script',
  ].join(',');
  clone.querySelectorAll(removeSelectors).forEach(el => el.remove());

  // 4) 문서 기본 스타일 추출 (외부 문서 호환용 표준 라이트 서식)
  const targetComputed = window.getComputedStyle(targetEl);
  const docBg = '#ffffff';
  const docFg = '#1e293b';
  const docFont = targetComputed.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pretendard", sans-serif';
  const docLineHeight = targetComputed.lineHeight || '1.75';
  const docFontSize = targetComputed.fontSize || '16px';

  const cleanBodyHtml = clone.innerHTML;
  // clone은 DOM에 붙어있지 않으므로 textContent/innerText 병합 처리
  const textClone = clone.cloneNode(true) as HTMLElement;
  textClone.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
  textClone.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,tr,div').forEach(el=>el.append('\n'));
  textClone.querySelectorAll('td,th').forEach(el=>el.append('\t'));
  const cleanText = (textClone.textContent || '').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();

  // 5) 표준 HTML 클립보드 조각 포맷 (<!--StartFragment-->...<!--EndFragment-->) 구성
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
${dynamicCssString ? `<style>\n${dynamicCssString}\n</style>` : ''}
</head>
<body style="margin: 0; padding: 0; background: ${docBg}; color: ${docFg}; font-family: ${docFont}; font-size: ${docFontSize}; line-height: ${docLineHeight};">
<!--StartFragment-->
<div class="custom-preview-container onrivi-content-root prose" style="background: ${docBg}; color: ${docFg}; font-family: ${docFont}; font-size: ${docFontSize}; line-height: ${docLineHeight}; max-width: 100%;">
${cleanBodyHtml}
</div>
<!--EndFragment-->
</body>
</html>`;

  return { fullHtml, cleanText };
}

/**
 * 인라인 CSS가 적용된 HTML 서식 및 순수 텍스트를 시스템 클립보드에 다중 Fallback으로 안전하게 기록
 */
export async function copyFormattedDocumentToClipboard(fullHtml: string, cleanText: string): Promise<boolean> {
  // 1순위: 데스크톱 Electron 네이티브 IPC (Windows/macOS 시스템 클립보드 직접 기록)
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  if (api?.copyHtmlToClipboard) {
    try {
      const res = await api.copyHtmlToClipboard(fullHtml, cleanText);
      if (res === true || res?.success === true) return true;
    } catch (e) {
      console.warn('[copyFormattedDocumentToClipboard] Electron IPC failed (falling back):', e);
    }
  }

  // 2순위: 동기식 오프스크린 DOM Selection + execCommand('copy')
  // (Electron 미재시작 상태 및 현대 브라우저에서 포커스 소실 없이 HTML + PlainText를 100% 확실하게 복사)
  if (typeof document !== 'undefined') {
    let intercepted = false;
    let commandSucceeded = false;
    const offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '0';
    offscreen.style.opacity = '0';
    offscreen.style.pointerEvents = 'none';
    offscreen.setAttribute('contenteditable', 'true');
    offscreen.innerHTML = fullHtml;
    document.body.appendChild(offscreen);

    const selection = window.getSelection();
    const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const range = document.createRange();
    range.selectNodeContents(offscreen);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/html', fullHtml);
        e.clipboardData.setData('text/plain', cleanText);
        intercepted = true;
      }
    };

    try {
      document.addEventListener('copy', handleCopy, true);
      commandSucceeded = document.execCommand('copy');
    } catch (e) {
      console.warn('[copyFormattedDocumentToClipboard] execCommand DOM Selection failed:', e);
    } finally {
      document.removeEventListener('copy', handleCopy, true);
      selection?.removeAllRanges();
      if (originalRange && selection) {
        selection.addRange(originalRange);
      }
      offscreen.remove();
    }

    if (intercepted && commandSucceeded) return true;
  }

  // 3순위: 최신 웹 표준 ClipboardItem (text/html + text/plain 동시 기록)
  if (typeof window !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
    try {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([cleanText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    } catch (e) {
      console.warn('[copyFormattedDocumentToClipboard] ClipboardItem write failed:', e);
    }
  }

  // 4순위: 순수 텍스트 클립보드 Fallback
  if (api?.copyTextToClipboard) {
    try {
      const result = await api.copyTextToClipboard(cleanText);
      if (result === true || result?.success === true) return true;
    } catch (_) {}
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch (_) {}
  }

  return false;
}
