// ====================================================================
// 📊 [OMD-IO-export-pdf-0001] frontend/src/lib/export/pdfExporter.ts
// 🎯 @KICK  : PagedJS 조판 및 브라우저/Electron 인쇄 기반 PDF 내보내기 엔진
// 🛡️ @GUARD : 페이지 나누기 마커 정규화, 워터마크 안전 폴백, 원격 폰트/이미지 장애 내결함성
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리]: exportHandlers.ts에서 PDF 내보내기 전용 모듈 분리
// 🔗 @CALLS : Paged.js, clonePreview, injectExportStyles, generateExportCss
// ====================================================================
import { startExportProgress } from '../exportProgress';
import { getExportDocumentRoot, prepareExportPreview, waitForExportResources, cleanExportDocument, withExportTimeout } from '../exportPreparation';
import { PRINT_TABLE_FLOW_CSS, unwrapPrintTables } from '../exportPagination';
import { cssPx, EXPORT_FIGURE_HEIGHT_RATIO, EXPORT_LEAD_FIGURE_HEIGHT_RATIO, markLeadExportFigure } from '../docxFormatting';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { DEFAULT_PROFILE } from '@/constants/cssProfile';
import { resolvePageGeometry } from '../pageGeometry';
import { DEFAULT_PRINT_SETTINGS, readEffectivePrintSettings, DocumentPrintSettings } from '../documentPrintSettings';
import { msg } from '@/lib/systemMessages';
import { generateExportCss } from './cssGenerator';
import {
  injectPageBreakMarkers,
  flushIME,
  preserveRenderedTableStyles,
  applyExportInlineStyles,
  clonePreview,
  fixListMarkers,
  inlineLocalImages,
  injectExportStyles,
  resolveExportWatermark,
  prepareDocumentFonts,
  collectAllStyles,
  saveToDownloads
} from './common';
import type { ExportOptions } from './types';

export async function exportPDF({ 
  previewEl, currentFileName, isDarkMode, showToast, orientation, paperSize, 
  dynamicCssString, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, 
  activeProfile, previewOnly=false, printSettings, signal, markdownContent, paginationSettings
}: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    const desktopApi = (window as any).electronAPI;
    let exportDestination: string | undefined;
    if (!previewOnly && desktopApi?.saveBinaryFile) {
      const selection = await desktopApi.showSaveDialog({
        title: 'PDF 저장 위치 선택',
        defaultPath: currentFileName.replace(/\.[^/.]+$/, '') + '.pdf',
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      });
      if (selection.canceled || !selection.filePath) { showToast('내보내기가 취소되었습니다.', 'info'); return; }
      exportDestination = selection.filePath;
    }
    signal?.throwIfAborted();
    if(!previewOnly)showToast('PDF 내보내기 준비 중...', 'info');
    progress = previewOnly?{update(){},finish(){}}:startExportProgress('PDF');
    progress.update('미리보기 확인 중');
    if(!previewOnly)flushIME();

    await prepareExportPreview(previewEl);
    // Select the outer document before any MarkdownViewer mounted inside an image node.
    const targetEl = getExportDocumentRoot(previewEl);
    const isPicturebook = targetEl.dataset.picturebook === 'true';
    if (isPicturebook) {
      if (targetEl.querySelector('.book-screen-only [role="status"]') || targetEl.dataset.bookInvalid === 'true') {
        throw new Error('그림책의 장면 구성·이미지·본문 넘침 안내를 확인하고 수정해 주세요.');
      }
      for (const text of Array.from(targetEl.querySelectorAll<HTMLElement>('[data-book-text]'))) {
        if (text.scrollHeight > text.clientHeight + 2 || text.scrollWidth > text.clientWidth + 2) {
          throw new Error('페이지 영역을 넘는 본문이 있습니다. 글을 줄이거나 장면을 나눠 주세요.');
        }
      }
    }
    const clone = clonePreview(targetEl);
    // PDF page mode keeps the editable surface visually hidden. Restore its
    // layout in the print clone before Paged.js measures and splits pages.
    clone.querySelectorAll<HTMLElement>('[data-onrivi-editor-host]').forEach(host => host.removeAttribute('style'));
    // Editor controls and guides are UI, not document content. Keep the live editor mounted.
    clone.querySelectorAll('[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools').forEach(el => el.remove());
    markLeadExportFigure(clone);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    // 🛡️ Mermaid SVG가 페이지를 넘을 때 헤더(타이틀바)가 분리되지 않고 컨테이너와 SVG가 한 덩어리로 유지되도록
    //     내보내기 시 MermaidBlock의 헤더 자체를 제거하고 wrapper 전체에 break-inside: avoid 주입 (이전 페이지 빈 박스 잔상 원천 차단)
    clone.querySelectorAll('.not-prose > div').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty('overflow', 'visible', 'important');
      if (htmlEl.querySelector('.mermaid-svg-container')) {
        const header = htmlEl.querySelector(':scope > div:first-child');
        if (header && header.tagName === 'DIV') header.remove();
        htmlEl.style.setProperty('page-break-inside', 'avoid', 'important');
        htmlEl.style.setProperty('break-inside', 'avoid', 'important');
        const parentNotProse = htmlEl.closest('.not-prose') as HTMLElement | null;
        if (parentNotProse) {
          parentNotProse.style.setProperty('page-break-inside', 'avoid', 'important');
          parentNotProse.style.setProperty('break-inside', 'avoid', 'important');
        }
      }
    });

    clone.querySelectorAll('.mermaid-svg-container, .mermaid-block-container').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty('page-break-inside', 'avoid', 'important');
      htmlEl.style.setProperty('break-inside', 'avoid', 'important');
    });

    // 🖼️ 이미지 <figure> 및 래퍼 정규화: Chromium flex 컨테이너 인쇄 버그 및 과도한 높이로 인한 빈 공간 방지
    const figurePaper = PAPER_SIZES[(paperSize || 'a4').toLowerCase()] || PAPER_SIZES.a4;
    const figurePageHeight = orientation === 'landscape' ? figurePaper.width : figurePaper.height;
    const marginMm = (value: string | undefined) => cssPx(value || '18mm') * 25.4 / 96;
    const pdfImageMaxHeight = Math.max(1, (figurePageHeight - marginMm(marginTop) - marginMm(marginBottom)) * EXPORT_FIGURE_HEIGHT_RATIO);
    if (!isPicturebook) {
    clone.querySelectorAll('figure, .onrivi-image-figure').forEach(el => {
      const fig = el as HTMLElement;
      fig.style.setProperty('display', 'block', 'important');
      fig.style.setProperty('height', 'auto', 'important');
      fig.style.setProperty('min-height', '0', 'important');
      fig.style.setProperty('aspect-ratio', 'auto', 'important');
      fig.style.setProperty('margin', '1.2em auto', 'important');
      fig.style.setProperty('text-align', 'center', 'important');
      fig.style.setProperty('page-break-inside', 'avoid', 'important');
      fig.style.setProperty('break-inside', 'avoid', 'important');
    });
    clone.querySelectorAll('.onrivi-image-wrapper').forEach(el => {
      const wrap = el as HTMLElement;
      wrap.style.setProperty('display', 'block', 'important');
      wrap.style.setProperty('height', 'auto', 'important');
      wrap.style.setProperty('min-height', '0', 'important');
      wrap.style.setProperty('aspect-ratio', 'auto', 'important');
      wrap.style.setProperty('margin', '0 auto', 'important');
      wrap.style.setProperty('text-align', 'center', 'important');
    });
    clone.querySelectorAll('figure img, .onrivi-image-figure img, .onrivi-image-wrapper img').forEach(el => {
      const img = el as HTMLElement;
      img.style.setProperty('max-width', '100%', 'important');
      const heightLimit = img.closest('[data-export-lead-figure]') ? pdfImageMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO : pdfImageMaxHeight;
      img.style.setProperty('max-height', `${heightLimit}mm`, 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', '0 auto', 'important');
      img.style.setProperty('page-break-inside', 'avoid', 'important');
      img.style.setProperty('break-inside', 'avoid', 'important');
    });
    clone.querySelectorAll('figcaption, .onrivi-image-figure figcaption').forEach(el => {
      const cap = el as HTMLElement;
      cap.style.setProperty('display', 'block', 'important');
      cap.style.setProperty('text-align', 'center', 'important');
      cap.style.setProperty('margin-top', '6px', 'important');
      cap.style.setProperty('page-break-inside', 'avoid', 'important');
      cap.style.setProperty('break-inside', 'avoid', 'important');
    });
    }

    // 🌟 가로폭 좁아짐 현상 해결: 미리보기 컴포넌트에 남겨질 수 있는 가로폭 제약(width, max-width)을 초기화하여
    //    Electron 및 브라우저 인쇄 영역에 맞게 자연스럽게 반응형 100% 본문 너비를 확보하게 처리합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.height = 'auto';

    // 🌟 html2canvas 한계 보완: 테이블/인라인코드 inline style 강제 적용
    if (!isPicturebook) {
      applyExportInlineStyles(clone, activeProfile, targetEl);
      preserveRenderedTableStyles(clone, targetEl);
      unwrapPrintTables(clone);
      // Restore explicit image sizes after profile/print normalization.
      clone.querySelectorAll<HTMLElement>('.onrivi-image-wrapper[data-image-width],.onrivi-image-wrapper[data-image-height]').forEach(wrap=>{
        const image=wrap.querySelector('img');if(!image)return;
        if(wrap.dataset.imageWidth){wrap.style.setProperty('width',wrap.dataset.imageWidth,'important');image.style.setProperty('width','100%','important');}
        wrap.style.setProperty('height','auto','important');
        image.style.setProperty('height',wrap.dataset.imageHeight||'auto','important');
      });
    }

    // 📄 페이지 나누기: 화면(문서보기/미리보기)의 페이지 나누기 마커 100% 반영
    // 1) 기존 DOM 엘리먼트(.page-break, .onrivi-page-break, hr.page-break 등) 정규화
    clone.querySelectorAll('.page-break, .onrivi-page-break, hr.page-break, [data-onrivi-page-break]').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.setAttribute('data-onrivi-page-break', 'true');
      htmlEl.style.setProperty('break-before', 'page', 'important');
      htmlEl.style.setProperty('page-break-before', 'always', 'important');
      htmlEl.style.setProperty('height', '0', 'important');
      htmlEl.style.setProperty('min-height', '0', 'important');
      htmlEl.style.setProperty('margin', '0', 'important');
      htmlEl.style.setProperty('padding', '0', 'important');
      htmlEl.style.setProperty('border', '0', 'important');
    });

    // 2) 혹시 주석(Comment) 노드 또는 텍스트 노드로 남아있는 페이지 나누기 마커 치환
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT);
    const pageBreakNodesToReplace: { node: Node; replacement: HTMLElement }[] = [];
    while (walker.nextNode()) {
      const curr = walker.currentNode;
      const text = curr.nodeValue || '';
      // Comment.nodeValue contains only the contents, without <!-- and -->.
      const isCommentBreak = curr.nodeType === Node.COMMENT_NODE && /^\s*(?:(?:onrivi:)?page-?break|\[page-?break\])\s*$/i.test(text);
      const isTextBreak = curr.nodeType === Node.TEXT_NODE && !curr.parentElement?.closest('pre, code, script, style') && /^(?:\s*<!--\s*(?:(?:onrivi:)?page-?break|\[page-?break\])\s*-->\s*|\s*\\(?:pagebreak|newpage)\s*)$/i.test(text);
      if (isCommentBreak || isTextBreak) {
        const div = document.createElement('div');
        div.setAttribute('data-onrivi-page-break', 'true');
        div.className = 'onrivi-page-break page-break';
        div.style.cssText = 'break-before:page!important;page-break-before:always!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;font-size:0!important;line-height:0!important;';
        pageBreakNodesToReplace.push({ node: curr, replacement: div });
      }
    }
    for (const { node, replacement } of pageBreakNodesToReplace) {
      node.parentNode?.replaceChild(replacement, node);
    }

    const filename = `${currentFileName.replace(/\.[^/.]+$/, '')}.pdf`;
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

    const collected = collectAllStyles();
    progress.update('사용 중인 글꼴 준비 중');
    const inlineStyles = collected.inlineStyles.replace(/@font-face\s*\{[^}]*\}/gi, '') + "\n" + (previewOnly ? '' : await prepareDocumentFonts(targetEl));
    const linkTags = collected.linkTags;

    const pageBg = backgroundColor || '#ffffff';
    // 💡 미리보기에 적용된 dynamicCssString이 있으면 그대로 우선 적용하여 100% 화면 일치 보장
    const activeCss = dynamicCssString ? dynamicCssString : (activeProfile ? generateExportCss(activeProfile) : '');

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const geometry=resolvePageGeometry(activeProfile?.pageStyle || {paperSize,orientation,marginTop,marginBottom,marginLeft,marginRight});
    const pageWidth = geometry.width;
    const pageHeight = geometry.height;
    const cssPageSize = `${pageWidth}mm ${pageHeight}mm`;

    let finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentFileName}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
  ${linkTags}
  <style>
    ${inlineStyles}
  </style>
  <style>
    ${activeCss}
  </style>
  <style>
    @page {
      size: ${cssPageSize};
      margin-top: ${isPicturebook ? '0' : marginTop || '18mm'} !important;
      margin-bottom: ${isPicturebook ? '0' : marginBottom || '18mm'} !important;
      margin-left: ${isPicturebook ? '0' : marginLeft || '12mm'} !important;
      margin-right: ${isPicturebook ? '0' : marginRight || '12mm'} !important;
      background-color: ${pageBg} !important;
    }
    
    /* ──────────────── 머리글 & 바닥글 CSS ──────────────── */
    @media print {
      .print-header-area {
        position: fixed;
        top: 0 !important;
        right: 0;
        left: 0;
        display: flex;
        justify-content: flex-end;
        font-size: 8.5pt;
        color: #64748b;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 4px;
        z-index: 9999;
        background-color: white !important;
      }
      .print-footer-area {
        position: fixed;
        bottom: 0 !important;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        font-size: 8.5pt;
        color: #64748b;
        border-top: 1px solid #f1f5f9;
        padding-top: 4px;
        z-index: 9999;
        background-color: white !important;
      }
      

    }
    
    /* 화면에서는 인쇄 보조 영역 보이지 않게 처리 */
    .print-header-area, .print-footer-area {
      display: none;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background-color: ${pageBg} !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
      color: #1e293b;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }
    /* 인쇄 환경을 위한 본문 정렬 */
    .markdown-viewer-root {
      width: 100% !important;
      max-width: none !important;
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: visible !important;
      height: auto !important;
    }
    .custom-preview-container {
      background-color: ${pageBg} !important;
    }
    /* 리스트 및 체크박스 정렬 보정 */
    .export-list-marker {
      vertical-align: baseline !important;
    }
    .task-list-item input[type="checkbox"] {
      position: relative !important;
      top: 2px !important;
      vertical-align: baseline !important;
      margin-right: 6px !important;
    }
    /* 📄 [P0 / P1 / P2 / P3] 자연스러운 PDF 페이지 분할(Pagination) 전면 오버라이드 (하단 거대 빈 공간 및 고아 제목 원천 방어) */
    @media print {
      /* [P1] 제목 고아 방지 (Orphan Heading 원천 차단): 제목이 페이지 하단에 홀로 남지 않도록 보장 */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      /* 편집용 제목 식별 뱃지 인쇄 완전 차단 */
      :is(h1, h2, h3, h4, h5, h6)::after {
        display: none !important;
        content: none !important;
        visibility: hidden !important;
      }

      /* [P0] 일반 본문/문단/리스트 자연스러운 행 단위 분할 허용 (하단 대형 빈 공간 소거) */
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

      /* [P0] 보기 상자(blockquote) 및 시험 문제 선택지 인쇄 보호 (페이지 중간 쪼개짐 및 거대 빈 여백 방지) */
      blockquote {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 8px !important;
        margin-bottom: 10px !important;
        padding: 8px 14px !important;
      }
      blockquote p {
        margin-top: 0 !important;
        margin-bottom: 4px !important;
        line-height: 1.55 !important;
      }
      blockquote p:last-child {
        margin-bottom: 0 !important;
      }
      blockquote ul, blockquote ol {
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 1.4em !important;
      }
      blockquote li {
        margin-bottom: 2px !important;
        line-height: 1.5 !important;
      }
      blockquote li p {
        margin-top: 0 !important;
        margin-bottom: 2px !important;
      }

      /* [P0] 시험 문제 선택지(①~⑮, ㄱ~ㄹ 등) 한 덩어리 보존 */
      .exam-choice-paragraph,
      [data-exam-choice="true"] {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        line-height: 1.5 !important;
        margin-bottom: 12px !important;
      }
      .exam-choice-paragraph .onrivi-line {
        min-height: 1.35em !important;
        line-height: 1.5 !important;
      }
      .exam-choice-paragraph .onrivi-line + .onrivi-line {
        margin-top: 3px !important;
      }

      /* [P0] 수동 페이지 나누기 강제 사출 및 화면 점선/가상요소 텍스트 잔상 제거 */
      [data-onrivi-page-break],
      .onrivi-page-break,
      .page-break,
      hr.page-break {
        page-break-before: always !important;
        break-before: page !important;
        height: 0 !important;
        min-height: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 0 !important;
        line-height: 0 !important;
        visibility: hidden !important;
      }
      [data-onrivi-page-break]::before,
      .onrivi-page-break::before,
      .page-break::before,
      hr.page-break::before {
        display: none !important;
        content: none !important;
      }

      /* [P0] 일반 섹션 및 래퍼 컨테이너는 페이지 분할 허용 (불필요한 통째 밀림 방지) */
      section,
      article,
      .page-break-container,
      .markdown-viewer-root,
      .custom-preview-container {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* [P1] 이미지 및 도표 보호 & 이미지 + 캡션 한 덩어리 결속 */
      figure,
      .onrivi-image-figure {
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
      /* [P1] 큰 이미지 자동 축소: 페이지 남은 높이에 맞게 유연하게 축소되어 불필요한 페이지 넘김 및 앞선 대형 빈 공간 원천 방어 */
      figure img,
      .onrivi-image-figure img,
      .onrivi-image-wrapper img {
        max-width: 100% !important;
        max-height: ${pdfImageMaxHeight}mm !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      [data-export-lead-figure] img, img[data-export-lead-figure] {
        max-height: ${pdfImageMaxHeight * EXPORT_LEAD_FIGURE_HEIGHT_RATIO / EXPORT_FIGURE_HEIGHT_RATIO}mm !important;
      }
      figcaption,
      .onrivi-image-figure figcaption {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: block !important;
        text-align: center !important;
        margin-top: 6px !important;
      }

      /* [P2] 표 Pagination: 표 전체 분할 허용, 행 분할 금지, thead 헤더 반복 */
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

      /* [P3] 코드블록: 박스 내 자동 줄바꿈 허용 */
      pre, code, .codeblock-area {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      /* [P4] 인용구 및 콜아웃(Alert): 박스 중간 쪼개짐 방어 (원자적 페이지 분할) */
      blockquote,
      [data-alert-type],
      .visual-readonly-callout,
      .callout-box,
      .custom-preview-container blockquote {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* [P0] Mermaid 다이어그램: 컨테이너와 SVG를 한 덩어리로 원자적(Atomic) 결속 (6페이지 빈 박스 잔상 원천 차단) */
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
    }

    /* 카텍스 수식 가드 */
    .katex-display {
      display: block !important;
      margin: 1em 0 !important;
      padding: 0.2em 0 !important;
      height: auto !important;
      overflow: visible !important;
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
    /* 🛡️ 각주 타이틀 및 영어 라벨 원천 차단 */
    .footnotes h2,
    .footnotes #footnote-label,
    .footnotes .sr-only {
      display: none !important;
    }
    /* 🛡️ 각주 리스트 정렬 보정: 번호와 내용이 한 줄에 조화롭게 나오도록 강제 */
    .footnotes ol {
      list-style-type: decimal !important;
      padding-left: 1.5em !important;
      margin: 0 !important;
    }
    .footnotes li {
      margin-bottom: 0.5em !important;
      list-style-position: outside !important;
      display: list-item !important;
    }
    .footnotes li p {
      display: inline !important;
      margin: 0 !important;
    }
    .footnotes li::before {
      display: none !important;
      content: none !important;
    }
    .footnote-backref {
      text-decoration: none !important;
      margin-left: 4px !important;
      font-family: sans-serif !important;
    }

    /* ──────────────── 페이지 번호 & 첫 페이지 숨김 CSS ──────────────── */
    @media print {
      body {
        counter-reset: page;
      }
      .page-break-container {
        /* 페이지 구분 시 카운터 증가 */
        counter-increment: page;
      }
      
      .print-header-area {
        position: fixed;
        top: 0 !important;
        right: 0;
        font-size: 8.5pt;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
        width: 100%;
        text-align: right;
        padding-bottom: 4px;
        z-index: 9999;
        display: block !important;
        background-color: white !important; /* 본문 겹침 방지 */
      }
      .print-footer-area {
        position: fixed;
        bottom: 0 !important;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 8.5pt;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
        z-index: 9999;
        display: block !important;
        background-color: white !important; /* 본문 겹침 방지 */
      }
      
      .print-footer-area .page-num::after {
        content: counter(page);
      }
    }
    ${PRINT_TABLE_FLOW_CSS}
  </style>
</head>
<body class="prose prose-base max-w-none custom-preview-container">

  <div class="page-break-container">
    ${clone.outerHTML}
  </div>


</body>
</html>
    `;

    if (isPicturebook) {
      clone.querySelectorAll('.book-screen-only').forEach(el => el.remove());
      const bookPrintCss = `<style>
        @page { size:${cssPageSize}; margin:0!important; }
        html,body,.page-break-container,.picturebook-root { width:auto!important; max-width:none!important; padding:0!important; margin:0!important; }
        .picturebook-root .book-page { width:${pageWidth}mm!important; height:${pageHeight}mm!important; zoom:1!important; margin:0!important; break-after:page!important; break-inside:avoid!important; }
        .picturebook-root .book-page:last-of-type { break-after:auto!important; }
        .picturebook-root .book-image { height:100%!important; }
        .picturebook-root .book-image .markdown-viewer-root,.picturebook-root .book-image .markdown-viewer-root > div,.picturebook-root .book-image .onrivi-image-figure,.picturebook-root .book-image figure,.picturebook-root .book-image p,.picturebook-root .onrivi-image-wrapper { height:100%!important; min-height:0!important; padding:0!important; margin:0!important; }
        .picturebook-root .book-page .book-image .markdown-viewer-root img { width:100%!important; height:100%!important; max-height:none!important; object-fit:${activeProfile?.layout?.imageFit || 'cover'}!important; }
        .picturebook-root .book-text .markdown-viewer-root { padding:0!important; }
        .book-screen-only,.picturebook-root figcaption { display:none!important; }
      </style>`;
      finalHtml = finalHtml.replace('</head>', bookPrintCss + '</head>');
    }

    if(!isPicturebook){
      const effectiveSettings = printSettings ?? (markdownContent ? readEffectivePrintSettings(markdownContent) : readEffectivePrintSettings(''));
      const resolved = await resolveExportWatermark(effectiveSettings);
      progress.update('용지에 맞춰 페이지 계산 중');
      try {
        const {paginatePrintHtml}=await import('../paginatedPrint');
        const {readPaginationSettings}=await import('../documentPaginationSettings');
        const paginatedResult = await withExportTimeout(
          paginatePrintHtml(finalHtml, activeProfile?.pageStyle || {paperSize,orientation,marginTop,marginBottom,marginLeft,marginRight}, resolved, signal,paginationSettings || readPaginationSettings(markdownContent || ''),stage=>progress?.update(stage)),
          '페이지 계산',
          30000
        );
        if (paginatedResult) {
          finalHtml = paginatedResult;
          if(!previewOnly && Number(finalHtml.match(/data-onrivi-unresolved-count="(\d+)"/)?.[1] || 0)>0)throw new Error('위치를 찾을 수 없는 출력 경계가 있습니다. 인쇄 미리보기에서 확인하거나 해제해 주세요.');
          if(!previewOnly && Number(finalHtml.match(/data-onrivi-oversized-count="(\d+)"/)?.[1] || 0)>0)throw new Error('용지 높이를 넘는 표 행·그림·수식이 있습니다. 인쇄 미리보기와 서식을 확인해 주세요.');
        }
      } catch (paginateErr) {
        console.warn('[exportPDF] 페이지 계산 또는 출력 경계 확인 실패:', paginateErr);
        throw paginateErr;
      }
    }
    if(previewOnly)return finalHtml;

    if (isElectron) {
      // ====================================================================
      // 🌟 [Electron 데스크톱 모드] Chromium 네이티브 PDF 인쇄 엔진 가동
      //    (html2canvas의 폰트 깨짐, 수식 왜곡, 픽셀 짤림 한계를 100% 원천 극복하는 궁극의 인쇄 솔루션)
      // ====================================================================
      const mmToInches = (mmStr?: string) => {
        const mm = parseFloat(mmStr || '10');
        return Math.max(mm, 0) / 25.4;
      };

      // Font files and application styles are already embedded. Do not make the
      // temporary desktop window wait for Google Fonts/CDN requests again.
      const desktopHtml = finalHtml
        .replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/gi, '')
        .replace(/@import\s+(?:url\([^;]+\)|["'][^"']+["'])[^;]*;/gi, '');
      progress.update('PDF 페이지 생성 중');
      const pdfBuffer: Uint8Array = await (window as any).electronAPI.printHTMLToPDF(desktopHtml, {
        landscape: isLandscape,
        margins: {
          marginType: 'none'
        },
        pageSize: ['A3', 'A4', 'A5', 'LEGAL', 'LETTER', 'TABLOID'].includes(paperKey.toUpperCase())
          ? paperKey.toUpperCase()
          : { width: pageWidth * 1000, height: pageHeight * 1000 },
        printBackground: true
      });

      if (!pdfBuffer) {
        throw new Error("PDF 버퍼 데이터를 수신하지 못했습니다.");
      }

      if (exportDestination) {
        progress.update('PDF 파일 저장 중');
        await desktopApi.saveBinaryFile(exportDestination, new Uint8Array(pdfBuffer));
        showToast('PDF 파일이 성공적으로 저장되었습니다.', 'success');
        return;
      }
      // 이전 preload 버전 호환 경로
      const base64Data = Buffer.from(pdfBuffer).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64Data}`;

      const result = await (window as any).electronAPI.saveFileAs(
        dataUrl, 
        filename, 
        '', 
        [{ name: 'PDF Documents', extensions: ['pdf'] }]
      );
      
      if (result) {
        showToast('PDF 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('PDF 내보내기가 취소되었습니다.', 'info');
      }
      return;
    }

    // ====================================================================
    // 💡 [Web 브라우저 / 확장프로그램 모드] iframe + 브라우저 네이티브 인쇄 엔진(window.print)
    //    (데스크탑 버전과 100% 동일한 Chromium PDF 인쇄 결과 보장)
    // ====================================================================
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const cleanup = () => iframe.remove();
    try {
      progress.update('인쇄 창 여는 중');
      const loaded = new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => resolve();
      });
      iframe.srcdoc = finalHtml;
      await withExportTimeout(loaded, '인쇄 문서', 2000).catch(() => {});
      const printDocument = iframe.contentDocument;
      const printWindow = iframe.contentWindow;
      if (!printDocument || !printWindow) throw new Error('인쇄 문서를 준비하지 못했습니다.');
      
      await Promise.race([
        Promise.all(Array.from(printDocument.images).map(img => img.decode().catch(() => {}))),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      showToast('브라우저 인쇄 창이 열립니다. 대상에서 프린터 또는 "PDF로 저장"을 선택해 주세요.', 'info');
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 300_000);
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      cleanup();
      throw error;
    }

    showToast('인쇄 대상에서 “PDF로 저장”을 선택해 저장해 주세요.', 'info');
  } catch (err: any) {
    if(signal?.aborted)throw err;
    msg.error('PDF export error', err);
    showToast('PDF 내보내기 실패: ' + err.message, 'error');
    if(previewOnly)throw err;
  } finally {
    progress?.finish();
  }
}
