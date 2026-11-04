// ====================================================================
// 📊 [OMD-IO-export-image-0001] frontend/src/lib/export/imageExporter.ts
// 🎯 @KICK  : PNG 긴 이미지 캡처(exportPNG) 및 SNS 카드뉴스 분할 출력(exportSNSCardNews)
// 🛡️ @GUARD : html-to-image 캡처 안정성, IME 커밋 강제, 인라인 코드 솟구침 방지, ZIP/낱장 일괄 저장
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리 & 에러/주석 표준화]: exportHandlers.ts에서 이미지/카드뉴스 내보내기 전용 모듈 분리 및 2단계 함수 JSDoc·logError 적용
// 🔗 @CALLS : html-to-image, jszip, clonePreview, fixListMarkers, saveToDownloads
// ====================================================================
import { startExportProgress } from '../exportProgress';
import { getExportDocumentRoot, prepareExportPreview, cleanExportDocument, waitForExportResources } from '../exportPreparation';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { logError } from '@/lib/errorDiagnostics';
import { msg } from '@/lib/systemMessages';
import { generateExportCss } from './cssGenerator';
import {
  flushIME,
  collectAllStyles,
  clonePreview,
  inlineLocalImages,
  injectExportStyles,
  fixListMarkers,
  applyExportInlineStyles,
  prepareDocumentFonts,
  saveToDownloads
} from './common';
import type { ExportOptions, SNSCardNewsOptions } from './types';

/**
 * ==== [exportPNG] ====
 * 🎯 역할 : 미리보기 DOM을 html-to-image로 긴 이미지(PNG) 캡처 및 저장
 * 📥 파라미터 :
 *   - options (ExportOptions) : 내보내기 공통 옵션 (previewEl, currentFileName, paperSize, activeProfile 등)
 * 📤 반환값 : Promise<void>
 * 💡 비고 : 로컬/확장 스타일시트 동기 추출(collectAllStyles) 및 IME 강제 플러시 포함
 */
export async function exportPNG({ 
  previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, 
  orientation, paperSize, marginTop, marginBottom, marginLeft, marginRight, backgroundColor, activeProfile 
}: ExportOptions) {
  try {
    showToast('이미지 내보내기 준비 중...', 'info');
    flushIME();
    const htmlToImage = await import('html-to-image');
    const filename = `${currentFileName.replace(/\.[^/.]+$/, '')}.png`;

    // 💡 런타임에 에디터에 선언된 로컬 및 확장프로그램 스타일시트 추출
    const { inlineStyles } = collectAllStyles();

    // ✅ PDF/HTML과 동일한 타겟팅
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가
    
    // 🌟 가로폭 좁아짐 현상 해결: 미리보기와 동일하게 A4 용지 규격을 유지하기 위해 width 100%로 설정하고,
    //    실측 마진 및 용지 크기를 wrapper에 직접 반영하여 글자 줄바꿈을 100% 동기화합니다.
    // 🌟 이중 여백 방지: 가상 래퍼 패딩과의 중첩을 피하기 위해 clone 자체의 여백(마진/패딩)을 초기화합니다.
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('padding', '0', 'important');

    // 🌟 공유 스타일 주입 (인디케이터 숨김 + 동적 CSS 프로필)
    const pageBg = backgroundColor || '#ffffff';
    // 💡 미리보기에 적용된 dynamicCssString이 있으면 그대로 우선 적용하여 100% 화면 일치 보장
    const activeCss = dynamicCssString ? dynamicCssString : (activeProfile ? generateExportCss(activeProfile) : '');
    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    // ✅ 폰트 로딩 대기 (html-to-image는 폰트 미적용 상태로 캡처 시 텍스트 누락)
    await waitForExportResources(targetEl);
    await new Promise(r => setTimeout(r, 300));

    // 🎯 html2canvas가 ::before/counter() 미지원 → 목록 마커 DOM 직접 주입 (원문자 및 1~3단계 불릿 동기화)
    fixListMarkers(clone, activeProfile);
    // 🌟 html2canvas 한계 보완: 테이블/인라인코드 inline style 강제 적용 (미리보기 실제 DOM과 1:1 동기화)
    applyExportInlineStyles(clone, activeProfile, targetEl);

    clone.querySelectorAll('img').forEach(img => img.setAttribute('crossOrigin', 'anonymous'));

    // 스크롤바 렌더링 오염 방지: 복제본 및 내부 요소의 overflow를 강제 해제하여 본문이 아래로 자연스럽게 펼쳐지도록 합니다.
    clone.style.overflow = 'visible';
    clone.style.overflowY = 'visible';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';

    const paperKey = (paperSize || 'a4').toLowerCase();
    const paperSpec = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
    const isLandscape = orientation === 'landscape';
    const pageWidthMm = isLandscape ? paperSpec.height : paperSpec.width;
    const pageHeightMm = isLandscape ? paperSpec.width : paperSpec.height;

    const widthPx = Math.round(pageWidthMm * 96 / 25.4);
    const minHeightPx = Math.round(pageHeightMm * 96 / 25.4);
    
    const mmToPx = (mmStr?: string, defaultVal = 18) => {
      const mm = parseFloat(mmStr || `${defaultVal}`);
      return Math.round(mm * 96 / 25.4);
    };
    
    const pTop = mmToPx(marginTop, 18);
    const pBottom = mmToPx(marginBottom, 18);
    const pLeft = mmToPx(marginLeft, 12);
    const pRight = mmToPx(marginRight, 12);

    const wrapper = document.createElement('div');
    
    // wrapper를 fixed로 숨기되 height는 auto, overflow는 visible로 세팅하여 스크롤바 생성을 원천 차단합니다.
    // 또한 A4 규격 가로폭과 프로필 여백(padding)을 그대로 부여합니다.
    wrapper.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: ${widthPx}px !important;
      min-height: ${minHeightPx}px !important;
      padding-top: ${pTop}px !important;
      padding-bottom: ${pBottom}px !important;
      padding-left: ${pLeft}px !important;
      padding-right: ${pRight}px !important;
      box-sizing: border-box !important;
      z-index: -9999 !important;
      pointer-events: none !important;
      opacity: 0.99 !important;
      overflow: visible !important;
      display: flex !important;
      flex-direction: column !important;
    `;
    wrapper.style.backgroundColor = pageBg;
    wrapper.style.color = '#1f2328'; // 💡 항상 라이트모드 텍스트 컬러 지정 (배경색 대비 가독성 확보)
    wrapper.className = 'prose prose-base max-w-none custom-preview-container';
    
    // 이미지 내보내기 시 페이지 구분선 텍스트 및 점선을 보이지 않게 처리하고, 자식 요소의 배경색 오염을 방지하기 위해 transparent 강제
    const hidePageBreaksStyle = document.createElement('style');
    hidePageBreaksStyle.innerHTML = `
      .page-break-indicator,
      .page-break-line-before::before,
      .page-break::before,
      hr.page-break {
        display: none !important;
      }
      .page-break-line-before {
        margin-top: 1.5rem !important;
      }
      .markdown-viewer-root, .prose {
        background-color: transparent !important;
      }
    `;
    wrapper.appendChild(hidePageBreaksStyle);

    // 💡 추출한 로컬/확장프로그램 스타일을 임시 `<style>` 태그로 주입
    const globalStyle = document.createElement('style');
    globalStyle.className = 'export-global-css';
    globalStyle.textContent = inlineStyles;
    wrapper.appendChild(globalStyle);

    if (activeCss) {
      const dynamicStyle = document.createElement('style');
      dynamicStyle.className = 'export-dynamic-css';
      dynamicStyle.textContent = activeCss;
      wrapper.appendChild(dynamicStyle);
    }

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // 🌟 [보정 패치] DOM에 연결된 상태에서 computedStyle을 측정하여 overflow/height 제약을 확실하게 해제
    clone.querySelectorAll('*').forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        const tagName = htmlEl.tagName.toUpperCase();
        // 고유 높이 제약이 유지되어야 하는 요소들(수식 KaTeX, 차트 Mermaid, 빈 행, 아이콘 등)을 제외하고
        // 일반적인 레이아웃 및 텍스트 블록 컨테이너(DIV, SECTION, ARTICLE 등)의 스크롤 및 높이 제약을 해제합니다.
        const isLayoutTag = tagName === 'DIV' || tagName === 'SECTION' || tagName === 'ARTICLE' || tagName === 'MAIN';
        const isWidget = htmlEl.classList.contains('katex') || htmlEl.classList.contains('mermaid') || htmlEl.classList.contains('mermaid-svg-container') || htmlEl.closest('.not-prose');

        if (isLayoutTag && !isWidget) {
          htmlEl.style.setProperty('overflow', 'visible', 'important');
          htmlEl.style.setProperty('overflow-y', 'visible', 'important');
          htmlEl.style.setProperty('height', 'auto', 'important');
          htmlEl.style.setProperty('max-height', 'none', 'important');
        } else {
          // 레이아웃 태그가 아니더라도 computedStyle 상 overflow가 hidden/auto/scroll 이거나 
          // max-height가 지정되어 잘릴 위험이 있는 경우를 보정합니다.
          const computed = window.getComputedStyle(htmlEl);
          const hasOverflowRestricted = 
            computed.overflowY === 'auto' || 
            computed.overflowY === 'scroll' || 
            computed.overflowY === 'hidden' ||
            computed.overflow === 'auto' || 
            computed.overflow === 'scroll' ||
            computed.overflow === 'hidden';

          if (hasOverflowRestricted || computed.maxHeight !== 'none') {
            htmlEl.style.setProperty('overflow', 'visible', 'important');
            htmlEl.style.setProperty('overflow-y', 'visible', 'important');
            
            // 고유 크기가 보존되어야 하는 이미지나 특정 위젯이 아닌 경우에만 높이를 해제합니다.
            if (tagName !== 'IMG' && tagName !== 'CANVAS' && tagName !== 'SVG' && !isWidget) {
              htmlEl.style.setProperty('height', 'auto', 'important');
              htmlEl.style.setProperty('max-height', 'none', 'important');
            }
          }
        }
      }
    });

    // 이미지 및 스타일이 완전히 렌더링되도록 500ms 대기합니다.
    await new Promise(resolve => setTimeout(resolve, 500));

    const katexFontCss = await prepareDocumentFonts(targetEl);

    // 전체 본문 내용을 온전히 담기 위해 실제 콘텐츠의 scrollHeight를 측정합니다.
    const rawHeight = wrapper.scrollHeight || wrapper.clientHeight;
    const finalHeight = Math.max(typeof rawHeight === 'number' && !isNaN(rawHeight) ? rawHeight : 1000, 100);

    const safeWidth = widthPx;

    let dataUrl = await htmlToImage.toPng(wrapper, {
      backgroundColor: pageBg,
      width: safeWidth,
      height: finalHeight,
      style: {
        transform: 'none',
        left: '0',
        top: '0',
        position: 'relative',
        overflow: 'visible'
      },
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: false, // 💡 수식 폰트 렌더링을 위해 임베딩 켜기
      fontEmbedCSS: katexFontCss, // 💡 추출한 KaTeX 폰트 규칙만 주입하여 외부 폰트 fetch CORS 오류 방지
    });

    const {rasterContainsText}=await import('../rasterTextCheck');
    if (!await rasterContainsText(wrapper,dataUrl)) {
      const {default:html2canvas}=await import('html2canvas');
      const canvas=await html2canvas(wrapper,{
        backgroundColor:pageBg,width:safeWidth,height:finalHeight,scale:2,
        useCORS:true,logging:false,scrollX:0,scrollY:0,
        onclone:doc=>{
          for(const element of [doc.documentElement,doc.body]){
            element.style.setProperty('height','auto','important');
            element.style.setProperty('max-height','none','important');
            element.style.setProperty('overflow','visible','important');
          }
          doc.querySelectorAll<HTMLElement>('code').forEach(code=>{
            if(code.closest('pre'))return;
            for(const [property,value]of Object.entries({display:'inline',position:'static','vertical-align':'baseline',height:'auto',width:'auto','background-color':'transparent',border:'0','box-shadow':'none'}))code.style.setProperty(property,value,'important');
          });
        }
      });
      dataUrl=canvas.toDataURL('image/png');
      if(!await rasterContainsText(wrapper,dataUrl))throw new Error('이미지에서 본문 글자를 확인하지 못했습니다. 문서 글꼴을 확인해 주세요.');
    }
    document.body.removeChild(wrapper);

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 💡 [일렉트론 환경 처리] 이미지 다른 이름으로 저장 다이얼로그 연동
      const result = await (window as any).electronAPI.saveFileAs(
        dataUrl, 
        filename, 
        '', 
        [{ name: 'PNG Images', extensions: ['png'] }]
      );
      if (result) {
        showToast('이미지 파일이 성공적으로 저장되었습니다.', 'success');
      } else {
        showToast('이미지 내보내기가 취소되었습니다.', 'info');
      }
    } else {
      // 브라우저 다운로드
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      // 다운로드 폴더 저장
      const ok = await saveToDownloads(filename, dataUrl, 'base64');
      showToast(ok ? '다운로드 폴더에 PNG가 생성되었습니다.' : '이미지 내보내기가 완료되었습니다.', 'success');
    }
  } catch (err: any) {
    logError({
      file: 'frontend/src/lib/export/imageExporter.ts',
      func: 'exportPNG',
      doing: '미리보기 DOM을 PNG 이미지로 캡처 및 저장하는 작업',
      target: currentFileName,
      error: err
    });
    msg.error('PNG export error', err);
    showToast('PNG 내보내기 실패: ' + err.message, 'error');
  }
}

/**
 * ==== [exportSNSCardNews] ====
 * 🎯 역할 : 문서를 SNS 카드뉴스 규격(1:1 정사각, 4:5 세로형, 16:9 와이드)으로 카드별 분할 캡처하여 낱장 PNG 또는 ZIP으로 일괄 내보내기
 * 📥 파라미터 :
 *   - options (ExportOptions) : 내보내기 옵션 및 snsOptions(ratio, splitMode, showPageNumber, saveMode)
 * 📤 반환값 : Promise<void>
 * 💡 비고 : 구분선(---), 대제목(# H1), 그림책 장면(:::scene) 및 자동 높이 분할 지원, 초과 본문 자동 스케일링 적용
 */
export async function exportSNSCardNews({
  previewEl,
  currentFileName,
  showToast,
  dynamicCssString,
  paperSize,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  backgroundColor,
  activeProfile,
  snsOptions,
}: ExportOptions) {
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    flushIME();
    const htmlToImage = await import('html-to-image');
    const docTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'cardnews';

    const ratio =
      snsOptions?.ratio ||
      (paperSize === 'sns_portrait' ? '4:5' : '1:1');
    const splitMode = snsOptions?.splitMode || 'auto';
    const showPageNumber = snsOptions?.showPageNumber !== false;
    const saveMode = snsOptions?.saveMode || 'files';

    // 논리 CSS 해상도 (pixelRatio: 2 적용 시 실제 비트맵: 1:1 -> 1080×1080, 4:5 -> 1080×1350, 16:9 -> 1920×1080)
    const cardWidthPx = ratio === '16:9' ? 960 : 540;
    const cardHeightPx = ratio === '4:5' ? 675 : 540;

    progress = startExportProgress('PNG');
    progress.update('SNS 카드뉴스 레이아웃 준비 중...');

    const { inlineStyles } = collectAllStyles();
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    await inlineLocalImages(clone);

    // VisualDocumentEditor / MarkdownViewer 편집용 UI 요소 제거
    clone
      .querySelectorAll(
        '[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools, .visual-media-controls, .visual-mermaid-editor'
      )
      .forEach(node => node.remove());

    // VisualDocumentEditor의 [data-onrivi-editor-host]에 주입된 커스텀 CSS 변수를 루트(clone)로 승격
    const editorHostEl = clone.querySelector<HTMLElement>('[data-onrivi-editor-host]');
    const inheritedHostStyle = editorHostEl?.getAttribute('style') || clone.getAttribute('style') || '';

    const pageBg = backgroundColor || activeProfile?.pageStyle?.backgroundColor || '#ffffff';
    const activeCss = dynamicCssString
      ? dynamicCssString
      : activeProfile
      ? generateExportCss(activeProfile)
      : '';
    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    await waitForExportResources(targetEl);
    await new Promise(r => setTimeout(r, 250));

    fixListMarkers(clone, activeProfile);
    applyExportInlineStyles(clone, activeProfile, targetEl);

    clone.querySelectorAll('img').forEach(img => img.setAttribute('crossOrigin', 'anonymous'));
    const katexFontCss = await prepareDocumentFonts(targetEl);

    const mmToPx = (mmStr?: string, defaultVal = 16) => {
      const mm = parseFloat(mmStr || `${defaultVal}`);
      return Math.round(Math.min(Math.max(mm, 8), 28) * 2.2);
    };
    const pTop = mmToPx(marginTop, 16);
    const pBottom = mmToPx(marginBottom, 16);
    const pLeft = mmToPx(marginLeft, 16);
    const pRight = mmToPx(marginRight, 16);

    // 1. 카드 단위 블록 분할 (그림책 .book-page 또는 일반 마크다운/문서보기 블록 분할)
    const bookPages = Array.from(clone.querySelectorAll<HTMLElement>('.book-page'));
    let cardNodesList: HTMLElement[][] = [];

    if (bookPages.length > 0) {
      cardNodesList = bookPages.map(page => {
        const pageClone = page.cloneNode(true) as HTMLElement;
        pageClone.style.setProperty('zoom', '1', 'important');
        pageClone.style.setProperty('width', '100%', 'important');
        pageClone.style.setProperty('height', '100%', 'important');
        pageClone.style.setProperty('margin', '0', 'important');
        pageClone.style.setProperty('outline', 'none', 'important');
        pageClone.style.setProperty('box-shadow', 'none', 'important');
        return [pageClone];
      });
    } else {
      // VisualDocumentEditor(.visual-document-surface / .ProseMirror) 및 MarkdownViewer(.prose) 등 실제 블록 컨테이너 탐색
      const findActualBlockContainer = (root: HTMLElement): HTMLElement => {
        const explicitSurface = root.querySelector<HTMLElement>(
          '.visual-document-surface, .ProseMirror, .markdown-viewer-root > .prose, .prose'
        );
        if (explicitSurface && explicitSurface.children.length > 0) {
          return explicitSurface;
        }
        let curr = root;
        for (let depth = 0; depth < 6; depth++) {
          const children = Array.from(curr.children).filter(
            el =>
              !['STYLE', 'SCRIPT'].includes(el.tagName.toUpperCase()) &&
              !el.classList.contains('book-screen-only') &&
              !el.classList.contains('no-print') &&
              !el.classList.contains('onrivi-page-guides') &&
              !el.classList.contains('onrivi-print-tools') &&
              !el.hasAttribute('data-editor-controls')
          ) as HTMLElement[];
          if (
            children.length === 1 &&
            ['DIV', 'SECTION', 'MAIN', 'ARTICLE'].includes(children[0].tagName.toUpperCase())
          ) {
            curr = children[0];
          } else {
            break;
          }
        }
        return curr;
      };

      const contentContainer = findActualBlockContainer(clone);

      const isDividerNode = (el: HTMLElement) => {
        const tag = el.tagName.toUpperCase();
        if (tag === 'HR') return true;
        if (
          el.hasAttribute('data-onrivi-page-break') ||
          el.classList.contains('onrivi-page-break') ||
          el.classList.contains('page-break') ||
          el.classList.contains('visual-page-break')
        ) {
          return true;
        }
        const text = (el.textContent || '').trim();
        if (text === '---' || text === '***' || text === '___') return true;
        return false;
      };

      const isMeaningfulNode = (el: HTMLElement) => {
        const tag = el.tagName.toUpperCase();
        if (['IMG', 'TABLE', 'PRE', 'IFRAME', 'SVG', 'VIDEO', 'CANVAS', 'FIGURE'].includes(tag)) return true;
        if (el.querySelector('img, table, pre, iframe, svg, video, canvas, figure')) return true;
        return (el.textContent || '').replace(/\u200B/g, '').trim().length > 0;
      };

      const rawBlocks = Array.from(contentContainer.children).filter(
        el =>
          !['STYLE', 'SCRIPT'].includes(el.tagName.toUpperCase()) &&
          !el.classList.contains('book-screen-only') &&
          !el.classList.contains('no-print') &&
          !el.classList.contains('onrivi-page-guides') &&
          !el.classList.contains('onrivi-print-tools') &&
          !el.hasAttribute('data-editor-controls')
      ) as HTMLElement[];

      const hasAnyDivider = rawBlocks.some(isDividerNode);
      const h1Count = rawBlocks.filter(el => el.tagName.toUpperCase() === 'H1').length;
      const h2Count = rawBlocks.filter(el => el.tagName.toUpperCase() === 'H2').length;

      const semanticCards: HTMLElement[][] = [];
      let currentCard: HTMLElement[] = [];

      const flushCurrentCard = () => {
        const meaningful = currentCard.filter(isMeaningfulNode);
        if (meaningful.length > 0) {
          semanticCards.push(meaningful);
        }
        currentCard = [];
      };

      for (const block of rawBlocks) {
        const tag = block.tagName.toUpperCase();
        if (isDividerNode(block)) {
          if (splitMode === 'auto' || splitMode === 'hr') {
            flushCurrentCard();
            continue; // 구분선 자체는 카드 분할 마커로 소비하여 카드 화면에서 숨김
          }
        }

        const shouldBreakOnH1 =
          (splitMode === 'h1' ||
            (splitMode === 'auto' &&
              (!hasAnyDivider || activeProfile?.pageStyle?.exportPageBreakLevel === 'h1') &&
              h1Count >= 2)) &&
          tag === 'H1';

        const shouldBreakOnH2 =
          splitMode === 'auto' && !hasAnyDivider && h1Count <= 1 && h2Count >= 2 && tag === 'H2';

        if ((shouldBreakOnH1 || shouldBreakOnH2) && currentCard.some(isMeaningfulNode)) {
          flushCurrentCard();
        }

        if (isMeaningfulNode(block)) {
          currentCard.push(block.cloneNode(true) as HTMLElement);
        }
      }
      flushCurrentCard();

      // 2단계: 각 의미 단락(섹션)이 카드 1장 높이를 초과하는 경우 실제 카드 레이아웃 기준으로 다중 카드로 자동 분할
      // - 'auto' 또는 'h1' 모드이거나, 구분선이 전혀 없어 1장으로 뭉친 경우 높이 기반 자동 페이지네이션 수행
      const shouldPaginateByHeight =
        splitMode === 'auto' || splitMode === 'h1' || (splitMode === 'hr' && !hasAnyDivider);

      if (shouldPaginateByHeight && semanticCards.length > 0) {
        const maxContentH = cardHeightPx - pTop - pBottom - (showPageNumber ? 34 : 0);

        const measureWrapper = document.createElement('div');
        if (inheritedHostStyle) {
          measureWrapper.setAttribute('style', inheritedHostStyle);
        }
        measureWrapper.style.cssText += `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: ${cardWidthPx}px !important;
          padding: ${pTop}px ${pRight}px ${pBottom}px ${pLeft}px !important;
          box-sizing: border-box !important;
          visibility: hidden !important;
          pointer-events: none !important;
          z-index: -9999 !important;
        `;
        measureWrapper.className = 'prose prose-base max-w-none custom-preview-container';
        const st1 = document.createElement('style');
        st1.textContent = `
          ${inlineStyles}
          ${activeCss}
          .sns-card-body > :first-child { margin-top: 0 !important; }
          .sns-card-body > :last-child { margin-bottom: 0 !important; }
          .sns-card-body img { max-height: ${Math.round((cardHeightPx - pTop - pBottom) * 0.55)}px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; }
        `;
        measureWrapper.appendChild(st1);

        const measureBody = document.createElement('div');
        measureBody.className = 'markdown-viewer-root onrivi-content-root visual-document-surface sns-card-body';
        measureBody.style.cssText = 'width: 100% !important; display: block !important;';
        measureWrapper.appendChild(measureBody);
        document.body.appendChild(measureWrapper);

        // 아주 긴 UL/OL 목록 블록은 개별 LI 항목 단위로 쪼개어 카드 간 자연스럽게 넘어가도록 전처리
        const expandOversizedBlocks = (nodes: HTMLElement[]): HTMLElement[] => {
          const expanded: HTMLElement[] = [];
          for (const node of nodes) {
            const tag = node.tagName.toUpperCase();
            if ((tag === 'UL' || tag === 'OL') && node.children.length > 1) {
              measureBody.innerHTML = '';
              const probe = node.cloneNode(true) as HTMLElement;
              measureBody.appendChild(probe);
              if (measureBody.scrollHeight > maxContentH * 0.85) {
                const items = Array.from(node.children) as HTMLElement[];
                items.forEach((li, idx) => {
                  const singleList = node.cloneNode(false) as HTMLElement;
                  if (tag === 'OL') {
                    const startBase = parseInt(node.getAttribute('start') || '1', 10);
                    singleList.setAttribute('start', String(startBase + idx));
                  }
                  singleList.appendChild(li.cloneNode(true));
                  expanded.push(singleList);
                });
                continue;
              }
            }
            expanded.push(node);
          }
          return expanded;
        };

        const paginatedCards: HTMLElement[][] = [];

        for (const sectionNodes of semanticCards) {
          const candidateNodes = expandOversizedBlocks(sectionNodes);
          if (candidateNodes.length <= 1) {
            paginatedCards.push(candidateNodes);
            continue;
          }

          measureBody.innerHTML = '';
          let currentBucket: HTMLElement[] = [];

          for (let i = 0; i < candidateNodes.length; i++) {
            const node = candidateNodes[i];
            const probeNode = node.cloneNode(true) as HTMLElement;
            measureBody.appendChild(probeNode);

            const currentH = measureBody.scrollHeight;
            const prevTag =
              currentBucket.length > 0
                ? currentBucket[currentBucket.length - 1].tagName.toUpperCase()
                : '';
            const isOnlyHeadingInBucket =
              currentBucket.length === 1 && /^H[1-6]$/.test(prevTag);

            if (currentBucket.length > 0 && !isOnlyHeadingInBucket && currentH > maxContentH) {
              // 만약 직전 노드가 소제목(H1~H6)이라면 제목만 카드 하단에 고립되지 않도록 다음 카드로 함께 이동
              if (currentBucket.length >= 2 && /^H[1-6]$/.test(prevTag)) {
                const trailingHeading = currentBucket.pop()!;
                paginatedCards.push(currentBucket);
                measureBody.innerHTML = '';
                const hClone = trailingHeading.cloneNode(true) as HTMLElement;
                const nClone = node.cloneNode(true) as HTMLElement;
                measureBody.appendChild(hClone);
                measureBody.appendChild(nClone);
                currentBucket = [trailingHeading, node];
              } else {
                paginatedCards.push(currentBucket);
                measureBody.innerHTML = '';
                measureBody.appendChild(node.cloneNode(true));
                currentBucket = [node];
              }
            } else {
              currentBucket.push(node);
            }
          }

          if (currentBucket.length > 0) {
            paginatedCards.push(currentBucket);
          }
        }

        document.body.removeChild(measureWrapper);
        cardNodesList = paginatedCards;
      } else {
        cardNodesList = semanticCards;
      }
    }

    if (cardNodesList.length === 0) {
      throw new Error('출력할 카드뉴스 본문 내용이 없습니다.');
    }

    const totalCards = cardNodesList.length;
    const capturedCards: { filename: string; dataUrl: string }[] = [];

    for (let idx = 0; idx < totalCards; idx++) {
      progress.update(`SNS 카드뉴스 렌더링 중 (${idx + 1} / ${totalCards}장)...`);
      const nodes = cardNodesList[idx];

      const wrapper = document.createElement('div');
      if (inheritedHostStyle) {
        wrapper.setAttribute('style', inheritedHostStyle);
      }
      wrapper.style.cssText += `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: ${cardWidthPx}px !important;
        height: ${cardHeightPx}px !important;
        padding: ${pTop}px ${pRight}px ${pBottom}px ${pLeft}px !important;
        box-sizing: border-box !important;
        z-index: -9999 !important;
        pointer-events: none !important;
        background-color: ${pageBg} !important;
        color: #1f2328 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
      `;
      wrapper.className = 'prose prose-base max-w-none custom-preview-container';

      const styleEl = document.createElement('style');
      styleEl.textContent = `
        ${inlineStyles}
        ${activeCss}
        .page-break-indicator, .page-break-line-before::before, .page-break::before, hr.page-break, .book-screen-only, .no-print {
          display: none !important;
        }
        .sns-card-body > :first-child { margin-top: 0 !important; }
        .sns-card-body > :last-child { margin-bottom: 0 !important; }
        .sns-card-body img { max-height: ${Math.round((cardHeightPx - pTop - pBottom) * 0.55)}px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; margin-left: auto !important; margin-right: auto !important; }
      `;
      wrapper.appendChild(styleEl);

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'markdown-viewer-root onrivi-content-root visual-document-surface sns-card-body';
      bodyWrap.style.cssText = `
        flex: 1 1 auto !important;
        min-height: 0 !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        overflow: visible !important;
        background: transparent !important;
      `;
      nodes.forEach(n => bodyWrap.appendChild(n));
      wrapper.appendChild(bodyWrap);

      if (showPageNumber) {
        const footer = document.createElement('div');
        footer.style.cssText = `
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          padding-top: 10px !important;
          margin-top: 6px !important;
        `;
        const badge = document.createElement('span');
        const numStr = String(idx + 1).padStart(2, '0');
        const totStr = String(totalCards).padStart(2, '0');
        badge.textContent = `${numStr} / ${totStr}`;
        badge.style.cssText = `
          font-family: 'JetBrains Mono', Pretendard, sans-serif !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.04em !important;
          padding: 3px 10px !important;
          border-radius: 9999px !important;
          background: rgba(15, 23, 42, 0.07) !important;
          color: #475569 !important;
        `;
        footer.appendChild(badge);
        wrapper.appendChild(footer);
      }

      document.body.appendChild(wrapper);

      // 카드 높이를 초과하는 경우 글자가 잘리지 않도록 자동 축소(Auto-Fit Scale) 보정
      await new Promise(r => setTimeout(r, 120));
      const availH = cardHeightPx - pTop - pBottom - (showPageNumber ? 34 : 0);
      const naturalH = bodyWrap.scrollHeight;
      if (naturalH > availH && availH > 80) {
        const fitRatio = Math.max(0.62, availH / (naturalH + 8));
        bodyWrap.style.setProperty('zoom', String(fitRatio), 'important');
      }

      await new Promise(r => setTimeout(r, 80));

      const dataUrl = await htmlToImage.toPng(wrapper, {
        backgroundColor: pageBg,
        width: cardWidthPx,
        height: cardHeightPx,
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
        fontEmbedCSS: katexFontCss,
      });

      document.body.removeChild(wrapper);

      const paddedIdx = String(idx + 1).padStart(2, '0');
      capturedCards.push({
        filename: `${docTitle}_카드뉴스_${paddedIdx}.png`,
        dataUrl,
      });
    }

    // 2. 저장 처리 (ZIP 묶음 저장 vs 낱장 PNG 일괄 저장)
    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

    if (saveMode === 'zip') {
      progress.update('SNS 카드뉴스 ZIP 압축 파일 생성 중...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const card of capturedCards) {
        const base64Data = card.dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(card.filename, base64Data, { base64: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `${docTitle}_SNS카드뉴스_${totalCards}장.zip`;

      if (api?.saveFileAs) {
        const reader = new FileReader();
        const zipDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('ZIP 데이터를 읽지 못했습니다.'));
          reader.readAsDataURL(zipBlob);
        });
        const saved = await api.saveFileAs(zipDataUrl, zipFilename, '', [{ name: 'ZIP Archive', extensions: ['zip'] }]);
        if (saved) {
          showToast(`SNS 카드뉴스 ${totalCards}장이 ZIP 파일로 저장되었습니다.`, 'success');
        } else {
          showToast('SNS 카드뉴스 저장이 취소되었습니다.', 'info');
        }
      } else {
        const { downloadBlob } = await import('../docxGenerator');
        downloadBlob(zipBlob, zipFilename);
        showToast(`SNS 카드뉴스 ${totalCards}장(${zipFilename}) 다운로드가 완료되었습니다.`, 'success');
      }
    } else {
      // 낱장 PNG 일괄 다운로드 (또는 1장일 때 단일 저장)
      if (api?.saveFileAs && totalCards === 1) {
        const saved = await api.saveFileAs(
          capturedCards[0].dataUrl,
          capturedCards[0].filename,
          '',
          [{ name: 'PNG Images', extensions: ['png'] }]
        );
        if (saved) {
          showToast('SNS 카드뉴스 이미지가 저장되었습니다.', 'success');
        } else {
          showToast('SNS 카드뉴스 내보내기가 취소되었습니다.', 'info');
        }
      } else if (api?.showSaveDialog && api?.saveBinaryFile) {
        // 일렉트론 데스크톱에서 다중 낱장 PNG 저장 시: 첫 번째 파일 경로를 한 번만 지정받아 같은 폴더에 01, 02, 03... 일괄 저장
        const dialogResult = await api.showSaveDialog({
          title: `SNS 카드뉴스 ${totalCards}장 일괄 저장 (첫 번째 카드 파일명 지정)`,
          defaultPath: `${docTitle}_카드뉴스_01.png`,
          filters: [{ name: 'PNG Images', extensions: ['png'] }],
        });
        const chosenPath: string | null =
          typeof dialogResult === 'string'
            ? dialogResult
            : dialogResult && !dialogResult.canceled && dialogResult.filePath
            ? dialogResult.filePath
            : null;

        if (!chosenPath) {
          showToast('SNS 카드뉴스 내보내기가 취소되었습니다.', 'info');
          return;
        }

        const normalizedPath = chosenPath.replace(/\\/g, '/');
        const lastSlash = normalizedPath.lastIndexOf('/');
        const dirPath = lastSlash >= 0 ? normalizedPath.slice(0, lastSlash) : '.';
        const rawBaseName = (lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath)
          .replace(/\.png$/i, '')
          .replace(/_?0*1$/, '');

        for (let i = 0; i < capturedCards.length; i++) {
          const card = capturedCards[i];
          const padded = String(i + 1).padStart(2, '0');
          const targetFilePath = `${dirPath}/${rawBaseName}_${padded}.png`;
          const base64Data = card.dataUrl.replace(/^data:image\/png;base64,/, '');
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let b = 0; b < binaryStr.length; b++) {
            bytes[b] = binaryStr.charCodeAt(b);
          }
          await api.saveBinaryFile(targetFilePath, bytes);
        }
        showToast(`SNS 카드뉴스 총 ${totalCards}장(PNG)이 선택한 폴더에 일괄 저장되었습니다!`, 'success');
      } else {
        // 웹 브라우저에서 다중 PNG 순차 다운로드 (브라우저 다중 다운로드 차단 방지를 위해 Blob URL + 충분한 간격 적용)
        const { downloadBlob } = await import('../docxGenerator');
        for (let i = 0; i < capturedCards.length; i++) {
          const card = capturedCards[i];
          const res = await fetch(card.dataUrl);
          const blob = await res.blob();
          downloadBlob(blob, card.filename);
          await saveToDownloads(card.filename, card.dataUrl, 'base64');
          if (i < capturedCards.length - 1) {
            await new Promise(r => setTimeout(r, 350));
          }
        }
        showToast(`SNS 카드뉴스 총 ${totalCards}장(PNG)이 일괄 출력되었습니다!`, 'success');
      }
    }
  } catch (err: any) {
    logError({
      file: 'frontend/src/lib/export/imageExporter.ts',
      func: 'exportSNSCardNews',
      doing: 'SNS 카드뉴스 분할 캡처 및 이미지/ZIP 일괄 저장 작업',
      target: currentFileName,
      error: err
    });
    msg.error('SNS CardNews export error', err);
    showToast('SNS 카드뉴스 내보내기 실패: ' + err.message, 'error');
  } finally {
    progress?.finish();
  }
}
