// ====================================================================
// 📊 [OMD-IO-export-html-0001] frontend/src/lib/export/htmlExporter.ts
// 🎯 @KICK  : 미리보기 DOM을 독립 단일 HTML 파일로 번들링하여 내보내기
// 🛡️ @GUARD : Tailwind CDN + computed font + 인라인 스타일시트 완전 임베딩
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리]: exportHandlers.ts에서 HTML 내보내기 전용 모듈 분리
// 🔗 @CALLS : clonePreview, inlineLocalImages, injectExportStyles, saveToDownloads
// ====================================================================
import { getExportDocumentRoot, prepareExportPreview } from '../exportPreparation';
import { cssPx, EXPORT_FIGURE_HEIGHT_RATIO, EXPORT_LEAD_FIGURE_HEIGHT_RATIO, markLeadExportFigure } from '../docxFormatting';
import { PRINT_TABLE_FLOW_CSS } from '../exportPagination';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { msg } from '@/lib/systemMessages';
import { generateExportCss } from './cssGenerator';
import {
  clonePreview,
  inlineLocalImages,
  injectExportStyles,
  prepareDocumentFonts,
  collectAllStyles,
  saveToDownloads,
  applyExportInlineStyles
} from './common';
import type { ExportOptions } from './types';

// ─────────────────────────────────────────────
// HTML 내보내기
// ─────────────────────────────────────────────
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0011] exportHandlers.ts ➔ exportHTML
// 🎯 @KICK  : 미리보기 DOM을 독립 HTML 파일로 내보내기 (Tailwind CDN + computed font 포함)
// 🛡️ @GUARD : Electron saveFileAs, computed fontFamily 반영
// 🚨 @PATCH : **2026-06-20** — HTML 내보내기 시 에디터 로컬 및 확장프로그램 스타일시트를 동기식 스타일 규칙 추출 전략(collectAllStyles)을 사용하여 헤더에 `<style>`로 인라인화(Embed)함으로써 오프라인 및 로컬 환경에서도 미리보기와 100% 동일한 테마 서식이 누락 없이 적용되도록 조치
// 🔗 @CALLS : clonePreview, inlineLocalImages, injectExportStyles, saveToDownloads, collectAllStyles
// ====================================================================
export async function exportHTML({ 
  previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, 
  orientation, paperSize, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile 
}: ExportOptions) {
  try {
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    markLeadExportFigure(clone);
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    // 🌟 가로폭 좁아짐 현상 해결: 미리보기와 동일하게 A4 용지 규격을 유지하기 위해 width 100%로 설정하고,
    //    실측 마진 및 용지 크기를 템플릿의 .preview-page-sheet 클래스에 반영합니다.
    // 🌟 이중 여백 방지: 가상 시트지 패딩과의 중첩을 피하기 위해 clone 자체의 여백(마진/패딩)을 초기화합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('padding', '0', 'important');
    clone.style.overflow = 'visible';
    clone.style.height = 'auto';

    // 🌟 공유 스타일을 clone에 직접 주입 (동적 CSS + 인디케이터 숨김)
    injectExportStyles(clone, dynamicCssString, { hideIndicators: true });

    // 🌟 미리보기 실제 렌더링 스타일(코드블록 자동줄바꿈/테이블/인라인코드)을 clone에 1:1 인라인 주입
    applyExportInlineStyles(clone, activeProfile, targetEl);

    const baseName = currentFileName.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}.html`;

    // 💡 런타임에 에디터에 선언된 로컬 및 확장프로그램 스타일시트 추출
    const collected = collectAllStyles();
    const inlineStyles = collected.inlineStyles.replace(/@font-face\s*\{[^}]*\}/gi, '') + "\n" + await prepareDocumentFonts(targetEl);
    const linkTags = collected.linkTags;

    // 💡 미리보기에 실제 렌더링된 font-family를 HTML 템플릿에도 반영 (동적 CSS 프로필 값 포함)
    const computedFontFamily = window.getComputedStyle(targetEl).fontFamily;

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const pageWidth = isLandscape ? paperSpec.height : paperSpec.width;
    const pageHeight = isLandscape ? paperSpec.width : paperSpec.height;
    
    const paperWidthStr = `${pageWidth}mm`;
    const minHeightStr = `${pageHeight}mm`;
    const cssPageSize = `${pageWidth}mm ${pageHeight}mm`;
    
    const printFigureMaxHeight = Math.max(1, (pageHeight - cssPx(marginTop || '18mm') * 25.4 / 96 - cssPx(marginBottom || '18mm') * 25.4 / 96) * EXPORT_FIGURE_HEIGHT_RATIO);
    const pTop = marginTop || '18mm';
    const pBottom = marginBottom || '18mm';
    const pLeft = marginLeft || '12mm';
    const pRight = marginRight || '12mm';
    
    const pageBg = backgroundColor || '#ffffff';
    // 💡 activeProfile이 있으면 무조건 라이트모드 기준 export용 CSS를 다시 생성하여 dynamicCssString을 대체
    const activeCss = activeProfile ? generateExportCss(activeProfile) : (dynamicCssString || '');

    const finalHtml = `<!DOCTYPE html>
<html lang="ko" data-onrivi-export>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  ${linkTags}
  <style>
    ${inlineStyles}
  </style>
  <style>
    ${activeCss}
  </style>
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: ${computedFontFamily};
      background-color: ${pageBg} !important;
      color: ${isDarkMode ? '#c9d1d9' : '#1f2328'};
      padding: 2rem;
      margin: 0;
      display: flex;
      justify-content: center;
    }
    .preview-page-sheet {
      width: ${paperWidthStr};
      min-height: ${minHeightStr};
      padding-top: ${pTop};
      padding-bottom: ${pBottom};
      padding-left: ${pLeft};
      padding-right: ${pRight};
      background-color: ${pageBg} !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'};
      box-sizing: border-box;
    }
    .markdown-viewer-root, .prose {
      background-color: transparent !important;
    }
    /* 💬 코드블록 내부 자동 줄바꿈 강제 (가로 스크롤 및 잘림 원천 방어) */
    .codeblock-area,
    .codeblock-area div {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow-x: visible !important;
    }
    .codeblock-area pre,
    .codeblock-area pre code,
    .codeblock-area .onrivi-line,
    .codeblock-area .onrivi-line *,
    pre, code, .onrivi-line {
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-all !important;
      overflow-wrap: anywhere !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: visible !important;
    }
    @page {
      size: ${cssPageSize};
      margin-top: ${marginTop || '18mm'} !important;
      margin-bottom: ${marginBottom || '18mm'} !important;
      margin-left: ${marginLeft || '12mm'} !important;
      margin-right: ${marginRight || '12mm'} !important;
      background-color: ${pageBg} !important;
    }
    @media print {
      .custom-preview-container figure img,
      .custom-preview-container .onrivi-image-figure img,
      .custom-preview-container .onrivi-image-wrapper img {
        max-height: ${printFigureMaxHeight}mm !important;
        width: auto !important;
        height: auto !important;
      }
      .custom-preview-container [data-export-lead-figure] img,
      .custom-preview-container img[data-export-lead-figure] {
        max-height: ${printFigureMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO}mm !important;
      }
      body {
        background-color: ${pageBg} !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .preview-page-sheet {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important; /* 인쇄 모드에서는 내부 패딩을 0으로 리셋하고 @page 마진에 위임 */
        background-color: ${pageBg} !important;
        box-sizing: border-box !important;
      }
    }
    ${PRINT_TABLE_FLOW_CSS}
  </style>
</head>
<body class="custom-preview-container" style="background-color: ${pageBg} !important; height:auto!important;max-height:none!important;overflow:visible!important;">
  <div class="preview-page-sheet prose prose-base max-w-none custom-preview-container" style="background-color: ${pageBg} !important;">
    ${clone.outerHTML}
  </div>
</body>
</html>`;

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const result = await (window as any).electronAPI.saveFileAs(
        finalHtml, 
        filename, 
        '', 
        [{ name: 'HTML Documents', extensions: ['html'] }]
      );
      if (result) {
        showToast('HTML 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('HTML 내보내기가 취소되었습니다.', 'info');
      }
    } else {
      // 브라우저 다운로드
      const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

      // 다운로드 폴더 저장
      const ok = await saveToDownloads(filename, finalHtml, 'text');
      showToast(ok ? '다운로드 폴더에 HTML이 생성되었습니다.' : 'HTML 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    msg.error('HTML export error', err);
    showToast('HTML 내보내기 실패: ' + err.message, 'error');
  }
}
