// ====================================================================
// 📊 [OMD-IO-export-epub-0001] frontend/src/lib/export/epubExporter.ts
// 🎯 @KICK  : 미리보기 DOM 기반 표준 EPUB 전자책 패키징 및 내보내기
// 🛡️ @GUARD : 리더기 뷰포트 맞춤형 이미지/Mermaid 리사이징 및 코드블록 테마 보존
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리 & 에러/주석 표준화]: exportHandlers.ts에서 EPUB 내보내기 전용 모듈 분리 및 2단계 함수 JSDoc·logError 적용
// 🔗 @CALLS : generateEpub, clonePreview, inlineLocalImages, injectExportStyles
// ====================================================================
import { startExportProgress } from '../exportProgress';
import { getExportDocumentRoot, prepareExportPreview, cleanExportDocument } from '../exportPreparation';
import { readEffectivePrintSettings } from '../documentPrintSettings';
import { logError } from '@/lib/errorDiagnostics';
import { msg } from '@/lib/systemMessages';
import { generateExportCss } from './cssGenerator';
import {
  clonePreview,
  inlineLocalImages,
  injectExportStyles,
  preserveRenderedTableStyles,
  prepareDocumentFonts,
  resolveExportWatermark,
  saveToDownloads,
  applyExportInlineStyles
} from './common';
import type { ExportOptions } from './types';

/**
 * ==== [exportEPUB] ====
 * 🎯 역할 : 미리보기 DOM을 표준 EPUB 전자책으로 패키징 및 내보내기 (이미지/Mermaid 인라인 및 뷰포트 맞춤 스케일링)
 * 📥 파라미터 :
 *   - options (ExportOptions) : 내보내기 공통 옵션 (previewEl, currentFileName, activeProfile, printSettings 등)
 * 📤 반환값 : Promise<void>
 * 💡 비고 : 그림책(picturebook) 고정 레이아웃 및 일반 리플로우 레이아웃 분기 지원
 */
export async function exportEPUB({ previewEl, currentFileName, isDarkMode, showToast, dynamicCssString, backgroundColor, activeProfile, printSettings, markdownContent }: ExportOptions) {
  const effectiveWatermark = { ...(printSettings ?? (markdownContent ? readEffectivePrintSettings(markdownContent) : readEffectivePrintSettings(''))) };
  let progress: ReturnType<typeof startExportProgress> | undefined;
  try {
    Object.assign(effectiveWatermark, await resolveExportWatermark(effectiveWatermark));
    const desktopApi = (window as any).electronAPI;
    let exportDestination: string | undefined;
    if (desktopApi?.saveBinaryFile) {
      const selection = await desktopApi.showSaveDialog({
        title: 'EPUB 저장 위치 선택',
        defaultPath: currentFileName.replace(/\.[^/.]+$/, '') + '.epub',
        filters: [{ name: 'EPUB Documents', extensions: ['epub'] }]
      });
      if (selection.canceled || !selection.filePath) { showToast('내보내기가 취소되었습니다.', 'info'); return; }
      exportDestination = selection.filePath;
    }
    showToast('EPUB 내보내기 준비 중...', 'info');
    progress = startExportProgress('EPUB');
    progress.update('미리보기 확인 중');

    // ✅ PDF/HTML과 동일한 타겟팅
    await prepareExportPreview(previewEl);
    const targetEl = getExportDocumentRoot(previewEl);
    const clone = clonePreview(targetEl);
    progress.update('이미지 준비 중');
    await inlineLocalImages(clone); // 이미지 Base64 인라인 변환 추가

    const isPicturebook = targetEl.dataset.picturebook === 'true';
    if (isPicturebook && targetEl.dataset.bookInvalid === 'true') throw new Error('그림책의 이미지 로딩 또는 본문 넘침을 해결한 후 내보내 주세요.');
    const fixedLayout = isPicturebook ? (await import('@/lib/picturebookEpub')).preparePicturebookEpub(clone,targetEl) : undefined;
    // 🌟 EPUB 내보내기 가로폭 제약 초기화 패치: clone 객체의 인라인 가로폭 제약을 제거하여 리더기 뷰포트에 맞게 자연스러운 흐름을 보장하도록 보정
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';

    // 🌟 공유 스타일 주입 (인디케이터 숨김 + 동적 CSS 프로필)
    const pageBg = backgroundColor || (activeProfile && activeProfile.pageStyle ? activeProfile.pageStyle.backgroundColor : null) || '#ffffff';
    let activeCss = activeProfile ? generateExportCss(activeProfile) : (dynamicCssString || '');
    
    // 🌟 EPUB 전용 배경색 보존 패치: injectExportStyles 내부에서 생성하는 <style> 태그는 EPUB 내보내기 시 제거되므로,
    // activeCss 자체에 배경색을 명시적으로 주입하여 generateEpub() 내부의 style.css에 전달되도록 보장합니다.
    if (pageBg && pageBg !== 'transparent') {
      activeCss += `\n.custom-preview-container {\n  background-color: ${pageBg} !important;\n}\n.custom-preview-container .prose {\n  background-color: ${pageBg} !important;\n}\n`;
    }

    injectExportStyles(clone, activeCss, { hideIndicators: true }, pageBg);

    // 💡 미리보기에 실제 렌더링된 font-family를 EPUB style.css body에도 반영
    const computedFontFamily = window.getComputedStyle(targetEl).fontFamily;

    const epubTitle = currentFileName.replace(/\.[^/.]+$/, '') || 'document';
    const filename = `${epubTitle}.epub`;

    showToast('EPUB 파일 생성 중... (내용 분할 및 이미지 처리)', 'info');
    const { generateEpub, downloadBlob } = await import('@/lib/epubGenerator');

    // EPUB 본문에 html2canvas용 인라인 스타일이 포함되지 않도록 제거 (외부 style.css에서만 처리)
    clone.querySelector('style.export-style-element')?.remove();

    // 🌟 미리보기 실제 렌더링 스타일(테이블/코드블록 테마/인라인코드)을 clone에 1:1 인라인 주입
    if (!isPicturebook) {
    applyExportInlineStyles(clone, activeProfile, targetEl);
    preserveRenderedTableStyles(clone, targetEl);

    // 🛡️ Mermaid SVG → base64 data:image/svg+xml <img> 변환
    //     EPUB DOMParser가 SVG 네임스페이스를 손상시켜 도형이 사라지는 문제 우회
    //     세로로 긴 다이어그램도 전자책 리더기 화면(85vh) 내에 쏙 들어가도록 auto-scale 및 break-inside: avoid 보정
    clone.querySelectorAll('.not-prose > div').forEach(el => {
      const container = el as HTMLElement;
      const svgBox = container.querySelector('.mermaid-svg-container') as HTMLElement | null;
      if (!svgBox) return;
      // 헤더(타이틀바) 제거 — 버튼은 이미 제거됨
      const header = container.querySelector(':scope > div:first-child');
      if (header) header.remove();

      // 중간 컨테이너 div들 overflow: visible 보장
      container.querySelectorAll('div').forEach(d => {
        (d as HTMLElement).style.setProperty('overflow', 'visible', 'important');
      });

      // SVG를 base64 data URI로 변환
      const svgEl = svgBox.querySelector('svg');
      if (svgEl) {
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const img = document.createElement('img');
        img.src = `data:image/svg+xml;base64,${base64}`;
        img.alt = 'Mermaid diagram';
        img.style.cssText = 'max-width:100% !important;max-height:85vh !important;width:auto !important;height:auto !important;object-fit:contain !important;display:block !important;margin:0 auto !important;page-break-inside:avoid !important;break-inside:avoid !important;';
        svgBox.innerHTML = '';
        svgBox.appendChild(img);
      }
      container.style.setProperty('overflow', 'visible', 'important');
      container.style.setProperty('page-break-inside', 'avoid', 'important');
      container.style.setProperty('break-inside', 'avoid', 'important');
      container.style.setProperty('text-align', 'center', 'important');
      container.style.setProperty('margin', '1.5em auto', 'important');
    });

    // 추가 안전망: .not-prose > div 구조 밖의 .mermaid-svg-container도 빠짐없이 처리
    clone.querySelectorAll('.mermaid-svg-container').forEach(svgBoxEl => {
      const svgBox = svgBoxEl as HTMLElement;
      if (svgBox.querySelector('img[alt="Mermaid diagram"]')) return;
      const svgEl = svgBox.querySelector('svg');
      if (svgEl) {
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        const img = document.createElement('img');
        img.src = `data:image/svg+xml;base64,${base64}`;
        img.alt = 'Mermaid diagram';
        img.style.cssText = 'max-width:100% !important;max-height:85vh !important;width:auto !important;height:auto !important;object-fit:contain !important;display:block !important;margin:0 auto !important;page-break-inside:avoid !important;break-inside:avoid !important;';
        svgBox.innerHTML = '';
        svgBox.appendChild(img);
        svgBox.style.setProperty('page-break-inside', 'avoid', 'important');
        svgBox.style.setProperty('break-inside', 'avoid', 'important');
        svgBox.style.setProperty('overflow', 'visible', 'important');
      }
    });

    // 🖼️ 이미지 <figure> 및 래퍼 정규화 (EPUB 리더기의 기본 figure margin 40px 및 inline-flex로 인한 우측 쏠림/잔상 방지)
    clone.querySelectorAll('figure, .onrivi-image-figure').forEach(el => {
      const fig = el as HTMLElement;
      fig.style.setProperty('margin', '1.5em 0', 'important');
      fig.style.setProperty('padding', '0', 'important');
      fig.style.setProperty('text-align', 'center', 'important');
      fig.style.setProperty('width', '100%', 'important');
      fig.style.setProperty('max-width', '100%', 'important');
      fig.style.setProperty('box-sizing', 'border-box', 'important');
      fig.style.setProperty('display', 'block', 'important');
      fig.style.setProperty('overflow', 'hidden', 'important');
    });
    clone.querySelectorAll('.onrivi-image-wrapper').forEach(el => {
      const wrap = el as HTMLElement;
      wrap.style.setProperty('display', 'block', 'important');
      wrap.style.setProperty('margin', '0 auto', 'important');
      wrap.style.setProperty('max-width', '100%', 'important');
      wrap.style.setProperty('text-align', 'center', 'important');
      wrap.style.setProperty('box-sizing', 'border-box', 'important');
      wrap.style.setProperty('overflow', 'hidden', 'important');
    });
    clone.querySelectorAll('figure img, .onrivi-image-figure img, .onrivi-image-wrapper img').forEach(el => {
      const img = el as HTMLElement;
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('max-height', '85vh', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', '1.5em auto', 'important');
      img.style.setProperty('page-break-inside', 'avoid', 'important');
      img.style.setProperty('break-inside', 'avoid', 'important');
    });

    }
    progress.update('사용 중인 글꼴 준비 중');
    const fontCss = await prepareDocumentFonts(targetEl);
    progress.update('전자책 구성 중');
    const blob = await generateEpub({ 
      title: epubTitle, 
      contentHtml: clone.innerHTML, 
      dynamicCssString: activeCss + "\n" + fontCss,
      onProgress: percent => progress?.update(`전자책 압축 중 ${Math.floor(percent)}%`),
      fontFamily: computedFontFamily,
      exportPageBreakLevel: 'none',
      fixedLayout,
      watermark: effectiveWatermark
    });

    showToast('EPUB 저장 중...', 'info');
    progress.update('EPUB 파일 저장 중');
    if (exportDestination) {
      await desktopApi.saveBinaryFile(exportDestination, new Uint8Array(await blob.arrayBuffer()));
      showToast('EPUB 파일이 성공적으로 저장되었습니다.', 'success');
    } else if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const reader = new FileReader();
      const savePromise = new Promise<boolean>((resolve) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            const result = await (window as any).electronAPI.saveFileAs(
              base64Data, 
              filename, 
              '', 
              [{ name: 'EPUB Documents', extensions: ['epub'] }]
            );
            
            if (result) {
              showToast('EPUB 파일이 성공적으로 저장되었습니다.', 'success');
              resolve(true);
            } else {
              showToast('EPUB 내보내기가 취소되었습니다.', 'info');
              resolve(false);
            }
          } catch (err: any) {
            logError({
              file: 'frontend/src/lib/export/epubExporter.ts',
              func: 'exportEPUB.reader.onloadend',
              doing: 'Electron saveFileAs IPC를 통해 EPUB 파일을 디스크에 저장하는 작업',
              target: filename,
              error: err
            });
            showToast('EPUB 저장 실패: ' + err.message, 'error');
            resolve(false);
          }
        };
      });
      reader.readAsDataURL(blob);
      await savePromise;
    } else {
      downloadBlob(blob, filename);

      // 다운로드 폴더 저장
      const reader = new FileReader();
      reader.onloadend = async () => {
        const ok = await saveToDownloads(filename, reader.result as string, 'base64');
        showToast(ok ? '다운로드 폴더에 EPUB이 생성되었습니다.' : 'EPUB 내보내기가 완료되었습니다.', 'success');
      };
      reader.readAsDataURL(blob);
    }
  } catch (err: any) {
    logError({
      file: 'frontend/src/lib/export/epubExporter.ts',
      func: 'exportEPUB',
      doing: '미리보기 DOM 기반 EPUB 전자책을 생성 및 저장하는 작업',
      target: currentFileName,
      error: err
    });
    msg.error('EPUB export error', err);
    const errMsg = err?.message || err?.toString() || '알 수 없는 오류';
    showToast('EPUB 내보내기 실패: ' + errMsg, 'error');
  } finally {
    progress?.finish();
  }
}
