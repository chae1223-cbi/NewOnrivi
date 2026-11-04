// ====================================================================
// 📊 [OMD-IO-export-common-0001] frontend/src/lib/export/common.ts
// 🎯 @KICK  : 문서 내보내기 공통 DOM 조작, 스타일 인젝션, 이미지/폰트 인라인화 및 다운로드 헬퍼
// 🛡️ @GUARD : CORS 방어, 비식별화, IME 강제 플러시, 리스트 마커 및 표 서식 보존
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리 & 에러/주석 표준화]: exportHandlers.ts에서 공통 DOM 전처리 및 헬퍼 함수 분리 및 2단계 JSDoc·logWarn/logError 적용
// 🔗 @CALLS : materializeReportNumbers, materializeHeadingNumbers, embedExportFonts
// ====================================================================
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { cleanExportDocument, EXPORT_DOCUMENT_CSS, stripExportViewportRules, getExportDocumentRoot, prepareExportPreview, waitForExportResources, fetchExportImage, exportBlobToDataUrl, withExportTimeout } from '../exportPreparation';
import { materializeHeadingNumbers } from '../headingNumbering';
import { reportNumberingCss, materializeReportNumbers, CIRCLED_DECIMAL_LIST_STYLE, CIRCLED_NUMBERS, getBulletSymbolValue } from '../reportNumbering';
import { embedExportFonts } from '../exportFonts';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import { msg } from '@/lib/systemMessages';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { DEFAULT_PROFILE, normalizeCssProfile } from '@/constants/cssProfile';
import { DocumentPrintSettings, DEFAULT_PRINT_SETTINGS, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from '../documentPrintSettings';
import type { CssProfile } from '@/types/cssProfile';
import type { ExportOptions, SNSCardNewsOptions } from './types';

/**
 * ==== [injectPageBreakMarkers] ====
 * 🎯 역할 : 설정된 헤딩 레벨(exportPageBreakLevel)에 따라 DOM에 직접 page-break 마커를 삽입
 * 📥 파라미터 :
 *   - containerEl (HTMLElement) : 대상 컨테이너 DOM 요소
 *   - exportPageBreakLevel (string) : 페이지 분할 기준 헤딩 레벨 ('none' | 'h1' ~ 'h6')
 * 📤 반환값 : void
 * 💡 비고 : 상위 레벨 헤딩 다음에 오는 첫 하위 헤딩은 자르지 않고 묶는 Keep with Next 알고리즘 적용
 */
export function injectPageBreakMarkers(containerEl: HTMLElement, exportPageBreakLevel: string): void {
  if (!exportPageBreakLevel || exportPageBreakLevel === 'none') return;
  const levelNum = parseInt(exportPageBreakLevel.replace('h', ''));
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 6) return;

  // 컨테이너의 직계 자식 요소들 (또는 마크다운 루트의 직계 자식)
  const root = getExportDocumentRoot(containerEl);

  // .markdown-viewer-root 내부에 래퍼 div가 있을 수 있으므로 querySelectorAll로 모든 헤딩을 추출합니다.
    const children = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
  
    let lastSeenLevel = 0;
        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          const tagName = el.tagName.toLowerCase();
          const tagLevelMatch = tagName.match(/^h(\d)$/);
          if (!tagLevelMatch) continue;
          
          const tagLevel = parseInt(tagLevelMatch[1]);
          
          if (tagLevel <= levelNum) {
            // 사용자님의 "Keep with Next" 의도 (예: 2 다음에 오는 첫 3은 자르지 않고 묶음)
            // 정확히 구현된 오리지널 lastSeenLevel 알고리즘을 복원합니다.
            if (lastSeenLevel !== 0 && tagLevel <= lastSeenLevel) {
                const marker = document.createElement('div');
                marker.className = 'page-break';
                marker.style.setProperty('break-before', 'page', 'important');
                marker.style.setProperty('page-break-before', 'always', 'important');
                marker.style.setProperty('height', '0', 'important');
                marker.style.setProperty('margin', '0', 'important');
                marker.style.setProperty('padding', '0', 'important');
                marker.style.setProperty('border', 'none', 'important');
                el.parentNode?.insertBefore(marker, el);
            }
            lastSeenLevel = tagLevel;
          }
        }
    // 일반 콘텐츠(p, ul 등): bufferStartEl 상태 유지 (버퍼 계속 쌓임)
}

/**
 * ==== [flushIME] ====
 * 🎯 역할 : IME 조합 버퍼 강제 커밋 — export 직전 한글 미완성 입력이 누락된 채 캡처되는 현상 차단
 * 📥 파라미터 : 없음
 * 📤 반환값 : void
 * 💡 비고 : 임시 input 생성 후 focus/blur 처리로 브라우저 조합 버퍼를 즉시 확정
 */
export function flushIME(): void {
  const input = document.createElement('input');
  input.style.cssText = 'position:fixed;top:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  input.blur();
  document.body.removeChild(input);
}

/**
 * ==== [preserveRenderedTableStyles] ====
 * 🎯 역할 : PDF 및 EPUB 내보내기 시 원본 DOM(sourceEl)의 표(table) 계산 스타일(Computed Style)을 복제본(clone)에 1:1 주입
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 *   - sourceEl (HTMLElement) : 실제 화면에 렌더링된 원본 미리보기 DOM
 * 📤 반환값 : void
 */
export function preserveRenderedTableStyles(clone: HTMLElement, sourceEl: HTMLElement): void {
      const sourceTables = Array.from(sourceEl.querySelectorAll('table'));
      clone.querySelectorAll<HTMLElement>('table').forEach((table, index) => {
        const source = sourceTables[index];
        if (!source) return;
        const originals = [source, ...Array.from(source.querySelectorAll('thead,tbody,tfoot,tr,th,td,p'))];
        const copies = [table, ...Array.from(table.querySelectorAll<HTMLElement>('thead,tbody,tfoot,tr,th,td,p'))];
        originals.forEach((original, nodeIndex) => {
          const copy = copies[nodeIndex];
          if (!copy) return;
          const css = getComputedStyle(original);
          const properties = ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','vertical-align','color','background-color','white-space','word-break','overflow-wrap','border-collapse','border-spacing','table-layout'];
          for (const side of ['top','right','bottom','left']) {
            properties.push(`padding-${side}`,`margin-${side}`,`border-${side}-width`,`border-${side}-style`,`border-${side}-color`);
          }
          for (const property of properties) copy.style.setProperty(property, css.getPropertyValue(property), 'important');
        });
      });
}

/**
 * ==== [applyExportInlineStyles] ====
 * 🎯 역할 : 이미지/PDF/HTML 내보내기 시 인라인 코드 정렬, 표(table) 외곽·행·열 테두리, 코드블록 테마를 복제본 DOM에 인라인 주입
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 *   - activeProfile (CssProfile | undefined) : 활성 서식 프로필
 *   - sourceEl (HTMLElement | undefined) : 원본 미리보기 DOM (Computed Style 참조용)
 * 📤 반환값 : void
 */
export function applyExportInlineStyles(clone: HTMLElement, activeProfile?: CssProfile, sourceEl?: HTMLElement): void {
  // 🌟 querySelectorAll('code') + closest('pre') 조합으로 블록 코드블록을 제외한 모든 인라인 코드를 100% 포착
  clone.querySelectorAll('code').forEach((code) => {
    const el = code as HTMLElement;
    if (el.closest('pre')) return; // 블록 코드 블록은 건드리지 않고 스킵

    // 🌟 인라인코드 정렬 싱크 보정:
    //    1) globals.css와 동일하게 display: inline 및 vertical-align: baseline을 적용하여 상향 솟구침 원천 차단
    //    2) box-decoration-break: clone으로 줄바꿈 시에도 라운드 패딩이 예쁘게 감싸지도록 유지
    //    3) 짧은 인라인 코드 구문(설정명, 단축키, 파일경로 등)이 중간에 어색하게 쪼개지지 않도록 white-space: nowrap 보호
    el.style.setProperty('display', 'inline', 'important');
    el.style.setProperty('vertical-align', 'baseline', 'important');
    el.style.setProperty('padding-top', '1.5px', 'important');
    el.style.setProperty('padding-bottom', '1.5px', 'important');
    el.style.setProperty('padding-left', '5px', 'important');
    el.style.setProperty('padding-right', '5px', 'important');
    el.style.setProperty('line-height', 'inherit', 'important');
    el.style.setProperty('border-radius', '4px', 'important');
    el.style.setProperty('box-decoration-break', 'clone', 'important');
    el.style.setProperty('-webkit-box-decoration-break', 'clone', 'important');
    el.style.setProperty('margin-left', '2px', 'important');
    el.style.setProperty('margin-right', '2px', 'important');

    const text = (el.textContent || '').trim();
    if (text.length <= 40 && !text.includes('\n')) {
      el.style.setProperty('white-space', 'nowrap', 'important');
    } else {
      el.style.setProperty('word-break', 'break-word', 'important');
      el.style.setProperty('overflow-wrap', 'break-word', 'important');
    }
  });

  // 🌟 표(Table) 외곽 테두리 및 행/열 구분선 인라인 주입 (html-to-image/canvas 변환 시 테두리 누락 완전 방어)
  const destTables = Array.from(clone.querySelectorAll('table'));
  const srcTables = sourceEl ? Array.from(sourceEl.querySelectorAll('table')) : [];

  const tableStruct = activeProfile?.tableStructure || DEFAULT_PROFILE.tableStructure;
  const fallbackOuterWidth = tableStruct?.outerBorderWidth || '1px';
  const fallbackRowWidth = tableStruct?.rowBorderWidth || '1px';
  const fallbackColWidth = tableStruct?.colBorderWidth ?? '0px';

  destTables.forEach((destTable, tIdx) => {
    const tableEl = destTable as HTMLElement;
    const srcTable = srcTables[tIdx] as HTMLElement | undefined;
    const srcTableStyle = (srcTable && typeof window !== 'undefined') ? window.getComputedStyle(srcTable) : null;

    // 원본 테이블의 실제 렌더링된 외곽 테두리 스타일 추출
    const tableBorderStyle = srcTableStyle?.borderTopStyle || activeProfile?.rules?.table?.['border-style'] || 'solid';
    const outerWidth = (srcTableStyle && srcTableStyle.borderTopWidth !== '0px') ? srcTableStyle.borderTopWidth : fallbackOuterWidth;
    const outerBorderColor = (srcTableStyle && srcTableStyle.borderTopColor && srcTableStyle.borderTopColor !== 'rgba(0, 0, 0, 0)') 
      ? srcTableStyle.borderTopColor 
      : (activeProfile?.rules?.table?.['border-color'] || '#1f2328');

    const outerIsZero = outerWidth === '0px' || outerWidth === '0' || tableBorderStyle === 'none';

    tableEl.style.setProperty('border-collapse', 'collapse', 'important');
    tableEl.style.setProperty('border', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');

    const destRows = Array.from(tableEl.querySelectorAll('tr'));
    const srcRows = srcTable ? Array.from(srcTable.querySelectorAll('tr')) : [];
    const totalRows = destRows.length;

    destRows.forEach((destRow, rowIndex) => {
      const destCells = Array.from(destRow.querySelectorAll('th, td')) as HTMLElement[];
      const srcRow = srcRows[rowIndex] as HTMLElement | undefined;
      const srcCells = srcRow ? Array.from(srcRow.querySelectorAll('th, td')) : [];
      const totalCells = destCells.length;
      const isFirstRow = rowIndex === 0;
      const isLastRow = rowIndex === totalRows - 1;

      destCells.forEach((destCell, cellIndex) => {
        const srcCell = srcCells[cellIndex] as HTMLElement | undefined;
        const srcCellStyle = (srcCell && typeof window !== 'undefined') ? window.getComputedStyle(srcCell) : null;

        const isFirstCol = cellIndex === 0;
        const isLastCol = cellIndex === totalCells - 1;

        // 원본 셀의 텍스트 색상, 배경색, 정렬, 패딩 1:1 동기화
        if (srcCellStyle) {
          if (srcCellStyle.color) destCell.style.setProperty('color', srcCellStyle.color, 'important');
          if (srcCellStyle.backgroundColor && srcCellStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            destCell.style.setProperty('background-color', srcCellStyle.backgroundColor, 'important');
          } else {
            destCell.style.setProperty('background-color', 'transparent', 'important');
          }
          if (srcCellStyle.textAlign) destCell.style.setProperty('text-align', srcCellStyle.textAlign, 'important');
          if (srcCellStyle.fontWeight) destCell.style.setProperty('font-weight', srcCellStyle.fontWeight, 'important');
        }

        // 행 가로선 두께 및 색상 판별
        const rowWidth = srcCellStyle?.borderBottomWidth && srcCellStyle.borderBottomWidth !== '0px'
          ? srcCellStyle.borderBottomWidth 
          : fallbackRowWidth;
        const rowBorderColor = srcCellStyle?.borderBottomColor && srcCellStyle.borderBottomColor !== 'rgba(0, 0, 0, 0)'
          ? srcCellStyle.borderBottomColor
          : (activeProfile?.rules?.th?.['border-color'] || activeProfile?.rules?.td?.['border-color'] || outerBorderColor);
        const rowBorderStyle = srcCellStyle?.borderBottomStyle || tableBorderStyle;
        const rowIsZero = rowWidth === '0px' || rowWidth === '0' || rowBorderStyle === 'none';

        // 열 세로선 두께 판별 (원본에서 세로선이 0px이면 무조건 none)
        const srcColWidth = srcCellStyle?.borderRightWidth;
        const colWidth = (srcColWidth !== undefined) ? srcColWidth : fallbackColWidth;
        const colIsZero = colWidth === '0px' || colWidth === '0';

        // 1. 최외곽 상단 (1행 셀의 위쪽)
        if (isFirstRow) {
          destCell.style.setProperty('border-top', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-top', 'none', 'important');
        }

        // 2. 최외곽 하단 및 내부 행(가로선)
        if (isLastRow) {
          destCell.style.setProperty('border-bottom', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-bottom', rowIsZero ? 'none' : `${rowWidth} ${rowBorderStyle} ${rowBorderColor}`, 'important');
        }

        // 3. 최외곽 좌측 (1열 셀의 왼쪽)
        if (isFirstCol) {
          destCell.style.setProperty('border-left', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-left', 'none', 'important');
        }

        // 4. 최외곽 우측 및 내부 열(세로선)
        if (isLastCol) {
          destCell.style.setProperty('border-right', outerIsZero ? 'none' : `${outerWidth} ${tableBorderStyle} ${outerBorderColor}`, 'important');
        } else {
          destCell.style.setProperty('border-right', colIsZero ? 'none' : `${colWidth} ${tableBorderStyle} ${rowBorderColor}`, 'important');
        }
      });
    });
  });

  // 🌟 코드블록(CodeBlock) 테마·헤더(언어 라벨 및 복사 배지)·본문 스타일 인라인 1:1 동기화
  const destCodeBlocks = Array.from(clone.querySelectorAll('.codeblock-area'));
  const srcCodeBlocks = sourceEl ? Array.from(sourceEl.querySelectorAll('.codeblock-area')) : [];

  destCodeBlocks.forEach((destArea, cbIdx) => {
    const areaEl = destArea as HTMLElement;
    const srcArea = srcCodeBlocks[cbIdx] as HTMLElement | undefined;
    const srcAreaStyle = (srcArea && typeof window !== 'undefined') ? window.getComputedStyle(srcArea) : null;

    // 1. 코드블록 전체 외곽 컨테이너
    const areaBg = (srcAreaStyle && srcAreaStyle.backgroundColor && srcAreaStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
      ? srcAreaStyle.backgroundColor
      : (activeProfile?.rules?.codeBlock?.['background-color'] || '#0f172a');
    const areaRadius = srcAreaStyle?.borderRadius || activeProfile?.rules?.codeBlock?.['border-radius'] || '8px';
    const areaBorder = (srcAreaStyle && srcAreaStyle.borderWidth && srcAreaStyle.borderWidth !== '0px')
      ? `${srcAreaStyle.borderWidth} ${srcAreaStyle.borderStyle} ${srcAreaStyle.borderColor}`
      : (activeProfile?.rules?.codeBlock?.['border'] || '1px solid rgba(255, 255, 255, 0.1)');

    areaEl.style.setProperty('background-color', areaBg, 'important');
    areaEl.style.setProperty('border-radius', areaRadius, 'important');
    areaEl.style.setProperty('border', areaBorder, 'important');
    areaEl.style.setProperty('overflow', 'hidden', 'important');
    areaEl.style.setProperty('margin-top', '16px', 'important');
    areaEl.style.setProperty('margin-bottom', '16px', 'important');
    areaEl.style.setProperty('max-width', '100%', 'important');
    areaEl.style.setProperty('box-sizing', 'border-box', 'important');

    // 2. 코드블록 상단 헤더
    const destHeader = areaEl.querySelector('.codeblock-header') as HTMLElement | null;
    const srcHeader = srcArea ? srcArea.querySelector('.codeblock-header') as HTMLElement | null : null;
    const srcHeaderStyle = (srcHeader && typeof window !== 'undefined') ? window.getComputedStyle(srcHeader) : null;

    if (destHeader) {
      const headerBg = (srcHeaderStyle && srcHeaderStyle.backgroundColor && srcHeaderStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
        ? srcHeaderStyle.backgroundColor
        : (activeProfile?.rules?.codeBlockTitle?.['background-color'] || 'rgba(30, 41, 59, 0.95)');
      const headerBorderBottom = (srcHeaderStyle && srcHeaderStyle.borderBottomWidth && srcHeaderStyle.borderBottomWidth !== '0px')
        ? `${srcHeaderStyle.borderBottomWidth} ${srcHeaderStyle.borderBottomStyle} ${srcHeaderStyle.borderBottomColor}`
        : '1px solid rgba(255, 255, 255, 0.1)';

      destHeader.style.setProperty('display', 'flex', 'important');
      destHeader.style.setProperty('align-items', 'center', 'important');
      destHeader.style.setProperty('justify-content', 'space-between', 'important');
      destHeader.style.setProperty('background-color', headerBg, 'important');
      destHeader.style.setProperty('border-bottom', headerBorderBottom, 'important');
      destHeader.style.setProperty('padding', '6px 14px', 'important');
      destHeader.style.setProperty('min-height', '32px', 'important');
      destHeader.style.setProperty('box-sizing', 'border-box', 'important');

      // 3. 언어 라벨 (TEXT 등)
      const destHeaderText = destHeader.querySelector('.codeblock-header-text') as HTMLElement | null;
      const srcHeaderText = srcHeader ? srcHeader.querySelector('.codeblock-header-text') as HTMLElement | null : null;
      const srcHeaderTextStyle = (srcHeaderText && typeof window !== 'undefined') ? window.getComputedStyle(srcHeaderText) : null;

      if (destHeaderText) {
        const textColor = srcHeaderTextStyle?.color || activeProfile?.rules?.codeBlockTitle?.['color'] || '#94a3b8';
        const fontSize = srcHeaderTextStyle?.fontSize || '11px';
        const fontWeight = srcHeaderTextStyle?.fontWeight || '700';

        destHeaderText.style.setProperty('color', textColor, 'important');
        destHeaderText.style.setProperty('font-size', fontSize, 'important');
        destHeaderText.style.setProperty('font-weight', fontWeight, 'important');
        destHeaderText.style.setProperty('text-transform', 'uppercase', 'important');
        destHeaderText.style.setProperty('letter-spacing', '0.08em', 'important');
        destHeaderText.style.setProperty('display', 'inline-block', 'important');
      }

      // 4. 복사 버튼 -> 깔끔한 복사 배지 스타일 유지
      const destCopyBtn = destHeader.querySelector('button, .copy-button-hook, .copy-btn') as HTMLElement | null;
      if (destCopyBtn) {
        destCopyBtn.style.setProperty('display', 'inline-flex', 'important');
        destCopyBtn.style.setProperty('align-items', 'center', 'important');
        destCopyBtn.style.setProperty('gap', '4px', 'important');
        destCopyBtn.style.setProperty('padding', '2px 8px', 'important');
        destCopyBtn.style.setProperty('background-color', 'rgba(255, 255, 255, 0.1)', 'important');
        destCopyBtn.style.setProperty('color', '#cbd5e1', 'important');
        destCopyBtn.style.setProperty('border-radius', '4px', 'important');
        destCopyBtn.style.setProperty('font-size', '11px', 'important');
        destCopyBtn.style.setProperty('font-weight', '500', 'important');
        destCopyBtn.style.setProperty('border', 'none', 'important');
        destCopyBtn.style.setProperty('cursor', 'default', 'important');
      }
    }

    // 중간 스크롤바 래퍼 div 가로 스크롤 및 잘림 해제 (전체 내용 표시)
    areaEl.querySelectorAll('div').forEach(d => {
      const divEl = d as HTMLElement;
      divEl.classList.remove('w-max');
      divEl.classList.remove('overflow-x-auto');
      divEl.style.setProperty('width', '100%', 'important');
      divEl.style.setProperty('max-width', '100%', 'important');
      divEl.style.setProperty('box-sizing', 'border-box', 'important');
      divEl.style.setProperty('overflow-x', 'visible', 'important');
    });

    // 5. 코드 본문 (pre 및 code)
    const destPre = areaEl.querySelector('pre') as HTMLElement | null;
    const srcPre = srcArea ? srcArea.querySelector('pre') as HTMLElement | null : null;
    const srcPreStyle = (srcPre && typeof window !== 'undefined') ? window.getComputedStyle(srcPre) : null;

    if (destPre) {
      destPre.classList.remove('w-max');
      destPre.classList.remove('min-w-full');
      const preColor = srcPreStyle?.color || activeProfile?.rules?.codeBlock?.['color'] || '#f8fafc';
      const preFontFamily = srcPreStyle?.fontFamily || '"JetBrains Mono", Consolas, monospace';
      const preFontSize = srcPreStyle?.fontSize || activeProfile?.rules?.codeBlock?.['font-size'] || '13.5px';

      destPre.style.setProperty('background-color', 'transparent', 'important');
      destPre.style.setProperty('color', preColor, 'important');
      destPre.style.setProperty('font-family', preFontFamily, 'important');
      destPre.style.setProperty('font-size', preFontSize, 'important');
      destPre.style.setProperty('padding', '14px 16px', 'important');
      destPre.style.setProperty('margin', '0', 'important');
      destPre.style.setProperty('border', 'none', 'important');
      destPre.style.setProperty('width', '100%', 'important');
      destPre.style.setProperty('max-width', '100%', 'important');
      destPre.style.setProperty('box-sizing', 'border-box', 'important');
      destPre.style.setProperty('white-space', 'pre-wrap', 'important');
      destPre.style.setProperty('word-wrap', 'break-word', 'important');
      destPre.style.setProperty('word-break', 'break-all', 'important');
      destPre.style.setProperty('overflow-wrap', 'anywhere', 'important');
      destPre.style.setProperty('overflow-x', 'visible', 'important');
    }

    areaEl.querySelectorAll('code').forEach(code => {
      const codeEl = code as HTMLElement;
      codeEl.style.setProperty('background-color', 'transparent', 'important');
      codeEl.style.setProperty('color', 'inherit', 'important');
      codeEl.style.setProperty('white-space', 'pre-wrap', 'important');
      codeEl.style.setProperty('word-wrap', 'break-word', 'important');
      codeEl.style.setProperty('word-break', 'break-all', 'important');
      codeEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
      codeEl.style.setProperty('box-sizing', 'border-box', 'important');
      codeEl.style.setProperty('width', '100%', 'important');
      codeEl.style.setProperty('max-width', '100%', 'important');
      codeEl.style.setProperty('display', 'block', 'important');
    });

    areaEl.querySelectorAll('.onrivi-line').forEach(line => {
      const lineEl = line as HTMLElement;
      lineEl.style.setProperty('color', 'inherit', 'important');
      lineEl.style.setProperty('white-space', 'pre-wrap', 'important');
      lineEl.style.setProperty('word-wrap', 'break-word', 'important');
      lineEl.style.setProperty('word-break', 'break-all', 'important');
      lineEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
      lineEl.style.setProperty('box-sizing', 'border-box', 'important');
      lineEl.style.setProperty('width', '100%', 'important');
      lineEl.style.setProperty('max-width', '100%', 'important');
      lineEl.style.setProperty('display', 'block', 'important');
    });
  });

  // 단독 pre 블록(codeblock-area 외곽)도 가로 스크롤 없이 자동 줄바꿈 강제
  clone.querySelectorAll('pre').forEach(pre => {
    const preEl = pre as HTMLElement;
    if (preEl.closest('.codeblock-area')) return;
    preEl.classList.remove('w-max');
    preEl.classList.remove('min-w-full');
    preEl.style.setProperty('width', '100%', 'important');
    preEl.style.setProperty('max-width', '100%', 'important');
    preEl.style.setProperty('box-sizing', 'border-box', 'important');
    preEl.style.setProperty('white-space', 'pre-wrap', 'important');
    preEl.style.setProperty('word-wrap', 'break-word', 'important');
    preEl.style.setProperty('word-break', 'break-all', 'important');
    preEl.style.setProperty('overflow-wrap', 'anywhere', 'important');
    preEl.style.setProperty('overflow-x', 'visible', 'important');
  });

  // 🌟 [보기 상자 및 시험 문제 선택지] 인쇄/내보내기 조판 최적화
  // 1. 인용구(blockquote: <보 기>, [자료 설명] 등) 콤팩트 규격화 및 페이지 쪼개짐 방지
  clone.querySelectorAll('blockquote').forEach(destBq => {
    const bqEl = destBq as HTMLElement;
    bqEl.style.setProperty('page-break-inside', 'avoid', 'important');
    bqEl.style.setProperty('break-inside', 'avoid', 'important');
    bqEl.style.setProperty('margin-top', '8px', 'important');
    bqEl.style.setProperty('margin-bottom', '10px', 'important');
    bqEl.style.setProperty('padding', '8px 14px', 'important');

    // 마크다운 파싱 시 잔존할 수 있는 끝부분 빈 문단(<p></p> 또는 공백만 있는 p) 소거
    bqEl.querySelectorAll('p').forEach(p => {
      const pEl = p as HTMLElement;
      if (!pEl.textContent?.trim() && !pEl.querySelector('img, video, iframe, svg')) {
        pEl.remove();
        return;
      }
      pEl.style.setProperty('margin-top', '0px', 'important');
      pEl.style.setProperty('margin-bottom', '4px', 'important');
      pEl.style.setProperty('line-height', '1.55', 'important');
    });

    bqEl.querySelectorAll('ul, ol').forEach(list => {
      const listEl = list as HTMLElement;
      listEl.style.setProperty('margin-top', '4px', 'important');
      listEl.style.setProperty('margin-bottom', '4px', 'important');
      listEl.style.setProperty('padding-left', '1.4em', 'important');
    });

    bqEl.querySelectorAll('li').forEach(li => {
      const liEl = li as HTMLElement;
      liEl.style.setProperty('margin-bottom', '2px', 'important');
      liEl.style.setProperty('line-height', '1.5', 'important');
      liEl.querySelectorAll('p').forEach(lp => {
        (lp as HTMLElement).style.setProperty('margin-top', '0px', 'important');
        (lp as HTMLElement).style.setProperty('margin-bottom', '2px', 'important');
      });
    });

    const lastP = bqEl.querySelector('p:last-child') as HTMLElement | null;
    if (lastP) {
      lastP.style.setProperty('margin-bottom', '0px', 'important');
    }

    // 보기 상자 바로 뒤에 선택지 문단이 이어지는 경우, 보기 상자와 선택지가 분리되지 않도록 결속
    const nextEl = bqEl.nextElementSibling as HTMLElement | null;
    if (nextEl && (nextEl.classList.contains('exam-choice-paragraph') || /[①-⑮]/.test(nextEl.textContent || ''))) {
      bqEl.style.setProperty('page-break-after', 'avoid', 'important');
      bqEl.style.setProperty('break-after', 'avoid', 'important');
    }
  });

  // 2. 객관식 선택지 문단(①~⑮, ㄱ~ㄹ, [1-5]. 등) 페이지 나눔 방지 및 콤팩트 여백 보정
  clone.querySelectorAll('p, li').forEach(el => {
    const text = el.textContent || '';
    const hasCircledNum = /[①-⑮]/.test(text);
    const hasChoiceLetter = /(?:^|\n|\s)[ㄱ-ㅎ]\./.test(text);
    const hasNumberedChoices = /(?:^|\n|\s)[1-5]\.\s/.test(text) && text.includes('\n');
    if (hasCircledNum || hasChoiceLetter || hasNumberedChoices) {
      el.classList.add('exam-choice-paragraph');
      el.setAttribute('data-exam-choice', 'true');
      (el as HTMLElement).style.setProperty('page-break-inside', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('break-inside', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('line-height', '1.5', 'important');
      (el as HTMLElement).style.setProperty('margin-bottom', '12px', 'important');

      el.querySelectorAll('.onrivi-line').forEach(line => {
        (line as HTMLElement).style.setProperty('min-height', '1.35em', 'important');
        (line as HTMLElement).style.setProperty('line-height', '1.5', 'important');
      });
    }
  });

  // 3. 문제 발문('것은?', '?' 등)이 다음 보기 상자나 선택지로부터 고아로 떨어지지 않도록 결속
  clone.querySelectorAll('p, h3, h4, h5, h6').forEach(el => {
    const next = el.nextElementSibling as HTMLElement | null;
    if (!next) return;
    const text = el.textContent || '';
    const isPrompt = /[?？]$|것은\s*[?？]?$/.test(text.trim());
    const isNextChoiceOrBox = next.tagName === 'BLOCKQUOTE' || next.classList.contains('exam-choice-paragraph') || /[①-⑮]/.test(next.textContent || '');
    if (isPrompt && isNextChoiceOrBox) {
      (el as HTMLElement).style.setProperty('page-break-after', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('break-after', 'avoid', 'important');
      (el as HTMLElement).style.setProperty('margin-bottom', '8px', 'important');
    }
  });
}

/**
 * ==== [restoreMapsInClone] ====
 * 🎯 역할 : 구글 지도 iframe 및 data-map-original-src 속성을 Yandex 정적 지도 이미지와 Google Maps 링크로 복원 치환
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 * 📤 반환값 : void
 */
export function restoreMapsInClone(clone: HTMLElement) {
  const mapContainers = Array.from(clone.querySelectorAll('[data-map-original-src], iframe[src*="maps.google.com"]'));
  mapContainers.forEach((container) => {
    const originalSrc = container.getAttribute('data-map-original-src') || container.getAttribute('src');
    if (originalSrc) {
      let finalSrc = originalSrc;
      let googleMapsLink = 'https://maps.google.com';

      try {
        const urlObj = new URL(originalSrc.startsWith('http') ? originalSrc : `https:${originalSrc}`);
        const center = urlObj.searchParams.get('center') || urlObj.searchParams.get('ll');
        const q = urlObj.searchParams.get('q');
        const zoom = urlObj.searchParams.get('zoom') || urlObj.searchParams.get('z') || '15';

        let lat = '';
        let lng = '';

        if (center) {
          const parts = center.split(',');
          if (parts[0] && parts[1]) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          }
        } else if (q) {
          // 구글 지도의 q 파라미터는 보통 "lat,lng" 또는 "위치명" 형태임
          const parts = q.split(',');
          if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          }
        }

        if (lat && lng) {
          googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          finalSrc = `https://static-maps.yandex.ru/1.x/?ll=${lng},${lat}&z=${zoom}&size=600,360&l=map&lang=ko_KR`;
        }
      } catch (e) {
        logWarn({
          file: 'frontend/src/lib/export/common.ts',
          func: 'restoreMapsInClone',
          doing: '구글 지도 URL에서 위도/경도 좌표를 파싱하는 작업',
          target: originalSrc,
          error: e
        });
        msg.error("Map restoration URL parse error", e);
      }

      const img = document.createElement('img');
      img.setAttribute('src', finalSrc);
      img.setAttribute('class', 'rounded-2xl shadow-2xl my-8 border-4 border-white dark:border-gray-800 mx-auto block max-w-full hover:scale-[1.01] transition-transform duration-300');
      img.setAttribute('alt', 'Google Map');

      const link = document.createElement('a');
      link.setAttribute('href', googleMapsLink);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('title', '구글 지도보기');
      link.appendChild(img);

      const align = container.getAttribute('data-align') || container.getAttribute('data-map-align');
      if (align && (align === 'center' || align === 'right' || align === 'left')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full flex';
        if (align === 'center') wrapper.classList.add('justify-center');
        else if (align === 'right') wrapper.classList.add('justify-end');
        else wrapper.classList.add('justify-start');
        wrapper.appendChild(link);
        container.parentNode?.replaceChild(wrapper, container);
      } else {
        container.parentNode?.replaceChild(link, container);
      }
    }
  });
}

/**
 * ==== [convertYoutubeIframeToLink] ====
 * 🎯 역할 : 복제된 DOM 내부의 YouTube iframe 임베드 요소를 정적 썸네일 이미지와 하이퍼링크 카드로 변환
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 * 📤 반환값 : void
 */
export function convertYoutubeIframeToLink(clone: HTMLElement) {
  const iframes = clone.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src') || '';
    if (src.includes('youtube.com/embed/') || src.includes('youtube-nocookie.com/embed/')) {
      const match = src.match(/\/embed\/([^/?#]+)/);
      if (match && match[1]) {
        const videoId = match[1];
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;

        // 썸네일 및 텍스트 링크 구조 생성
        const container = document.createElement('div');
        container.setAttribute('class', 'my-6 flex flex-col items-center gap-2');

        const link = document.createElement('a');
        link.setAttribute('href', videoUrl);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('class', 'relative block w-full max-w-[480px] rounded-2xl overflow-hidden shadow-lg border border-black/5 hover:scale-[1.01] transition-transform duration-300 mx-auto');

        const img = document.createElement('img');
        img.setAttribute('src', thumbnailUrl);
        img.setAttribute('alt', 'YouTube Video Thumbnail');
        img.setAttribute('class', 'w-full h-auto object-cover aspect-video block');

        const overlay = document.createElement('div');
        overlay.setAttribute('class', 'absolute inset-0 bg-black/10 hover:bg-black/30 flex items-center justify-center transition-colors duration-300');

        const playBtn = document.createElement('div');
        playBtn.setAttribute('class', 'w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg text-lg font-bold');
        playBtn.innerHTML = '▶';

        overlay.appendChild(playBtn);
        link.appendChild(img);
        link.appendChild(overlay);

        const infoText = document.createElement('span');
        infoText.setAttribute('class', 'text-xs text-gray-500 font-semibold block text-center mt-1.5');
        infoText.innerHTML = '🎥 YouTube에서 동영상 보기 (클릭)';

        container.appendChild(link);
        container.appendChild(infoText);

        iframe.parentNode?.replaceChild(container, iframe);
      }
    }
  });
}

/**
 * ==== [clonePreview] ====
 * 🎯 역할 : 미리보기 DOM을 깊은 복제(cloneNode)하고 편집용 컨트롤 제거, 제목/보고서 번호 실체화, 지도·유튜브 정적 변환을 수행
 * 📥 파라미터 :
 *   - previewEl (HTMLElement) : 원본 미리보기 DOM
 *   - captureWordLayout (boolean) : Word/한글 문서 내보내기용 레이아웃 속성(폭/패딩/공백) 기록 여부
 * 📤 반환값 : HTMLElement (정리 완료된 복제 DOM)
 */
export function clonePreview(previewEl: HTMLElement, captureWordLayout = false): HTMLElement {
  const clone = previewEl.cloneNode(true) as HTMLElement;
  if (captureWordLayout) {
    const sources = [previewEl, ...Array.from(previewEl.querySelectorAll<HTMLElement>('*'))];
    const copies = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    sources.forEach((source, index) => {
      const copy = copies[index];
      const css = window.getComputedStyle(source);
      copy.setAttribute('data-docx-white-space', css.whiteSpace || 'normal');
      if (/^(TABLE|TD|TH|COL)$/.test(source.tagName)) {
        const width = source.getBoundingClientRect().width;
        if (width > 0) copy.setAttribute('data-docx-width', String(width));
        if (source.tagName === 'TD' || source.tagName === 'TH') {
          for (const side of ['top', 'right', 'bottom', 'left']) {
            copy.setAttribute(`data-docx-padding-${side}`, css.getPropertyValue(`padding-${side}`));
          }
        }
      }
    });
  }
  clone.querySelectorAll('[data-editor-controls], .onrivi-page-guides, .onrivi-print-tools').forEach(el => el.remove());
  // A top caption must be first in the exported DOM as well as visually above
  // the image; DOCX/HWPX readers do not implement CSS flex ordering.
  const sourceCaptions = Array.from(previewEl.querySelectorAll('figure > figcaption'));
  clone.querySelectorAll<HTMLElement>('figure > figcaption').forEach((caption,index)=>{
    const original=sourceCaptions[index];
    if(original && Number(getComputedStyle(original).order)<0)caption.parentElement?.prepend(caption);
  });
  materializeReportNumbers(previewEl, clone);
  materializeHeadingNumbers(previewEl, clone);
  clone.querySelectorAll('button, .copy-btn, [title*="복사"]').forEach(el => el.remove());
  restoreMapsInClone(clone);
  convertYoutubeIframeToLink(clone);
  cleanExportDocument(clone);
  return clone;
}

/**
 * ==== [fixListMarkers] ====
 * 🎯 역할 : html2canvas의 ::before/counter() 미지원 문제를 해결하기 위해 복제된 DOM의 리스트(ol/ul)에 직접 숫자/불릿 마커(span.export-list-marker)를 주입
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 *   - profile (CssProfile | undefined) : 활성 서식 프로필 (원문자/다단계 불릿 기호 참조용)
 * 📤 반환값 : void
 */
export function fixListMarkers(clone: HTMLElement, profile?: CssProfile): void {
  const style = document.createElement('style');
  style.className = 'export-style-element';
  style.textContent = `
.export-list-marker { display: inline !important; white-space: pre !important; }
.prose ol > li::before, .prose ul > li::before,
.custom-preview-container ol > li::before, .custom-preview-container ul > li::before {
  display: none !important; content: none !important; width: 0 !important; height: 0 !important;
}`;
  clone.appendChild(style);

  const isCircledOl = profile?.rules?.ol?.['list-style-type'] === CIRCLED_DECIMAL_LIST_STYLE;

  clone.querySelectorAll('ol').forEach((ol) => {
    const start = parseInt(ol.getAttribute('start') || '1', 10);
    let idx = 0;
    ol.querySelectorAll(':scope > li').forEach((li) => {
      const el = li as HTMLElement;
      if (el.classList.contains('onrivi-empty-list-row') || el.classList.contains('task-list-item')) return;
      const num = start + idx; idx++;
      el.style.listStyleType = 'none';
      if (el.querySelector('.export-list-marker')) return;
      const marker = document.createElement('span');
      marker.className = 'export-list-marker';
      marker.textContent = isCircledOl ? ((CIRCLED_NUMBERS[num - 1] || `${num}.`) + ' ') : (num + '. ');
      marker.style.cssText = 'display:inline;font-weight:400;margin-right:4px;user-select:none;-webkit-user-select:none;';
      const textBlock = el.querySelector(':scope > p, :scope > div > p') || el;
      textBlock.insertBefore(marker, textBlock.firstChild);
    });
  });

  const bs = profile?.bulletStructure;
  const l1Type = bs?.level1 || profile?.rules?.ul?.['list-style-type'] || 'disc';
  const l2Type = bs?.level2 || 'circle';
  const l3Type = bs?.level3 || 'square';
  const l1Text = getBulletSymbolValue(l1Type, bs?.custom1).text;
  const l2Text = getBulletSymbolValue(l2Type, bs?.custom2).text;
  const l3Text = getBulletSymbolValue(l3Type, bs?.custom3).text;

  clone.querySelectorAll('ul').forEach((ul) => {
    let depth = 1;
    let parent = ul.parentElement;
    while (parent && parent !== clone) {
      if (parent.tagName === 'UL') depth++;
      parent = parent.parentElement;
    }
    const bulletChar = depth === 1 ? l1Text : depth === 2 ? l2Text : l3Text;

    ul.querySelectorAll(':scope > li').forEach((li) => {
      const el = li as HTMLElement;
      if (el.classList.contains('onrivi-empty-list-row') || el.classList.contains('task-list-item')) return;
      el.style.listStyleType = 'none';
      if (el.querySelector('.export-list-marker')) return;
      if (!bulletChar) return;
      const marker = document.createElement('span');
      marker.className = 'export-list-marker';
      marker.textContent = bulletChar;
      marker.style.cssText = 'display:inline;font-weight:400;margin-right:4px;user-select:none;-webkit-user-select:none;';
      const textBlock = el.querySelector(':scope > p, :scope > div > p') || el;
      textBlock.insertBefore(marker, textBlock.firstChild);
    });
  });
}

/**
 * ==== [inlineLocalImages] ====
 * 🎯 역할 : 복제된 DOM 내의 상대 경로(/~), media:// 프로토콜 및 외부 이미지를 Base64 Data URI로 인라인 임베딩
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 * 📤 반환값 : Promise<void>
 * 💡 비고 : 개별 이미지 로드 실패 시 전체 내보내기가 중단되지 않도록 경고 기록 후 건너뜀
 */
export async function inlineLocalImages(clone: HTMLElement): Promise<void> {
  const images = Array.from(clone.querySelectorAll('img'));
  const api = (window as any).electronAPI;
  await Promise.all(images.map(async (image, index) => {
    const src = image.getAttribute('src') || '';
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    try {
      if (!src) throw new Error('이미지 경로가 없습니다.');
      if (src.startsWith('data:image/')) return;
      // The displayed image can already resolve browser handles or authenticated Drive media to a blob.
      const live = Array.from(document.querySelectorAll('img')).find(candidate =>
        candidate.getAttribute('src') === src || candidate.src === src);
      const resolved = live?.currentSrc || live?.src || src;
      if (resolved.startsWith('data:image/')) { image.src = resolved; return; }
      let dataUrl: string;
      if (api && !/^(https?:|blob:)/.test(resolved)) {
        let path = resolved;
        if (path.startsWith('media://')) path = new URL(path).searchParams.get('url') || path;
        dataUrl = await withExportTimeout(api.readImageAsBase64(path), '로컬 이미지') as string;
        if (!dataUrl?.startsWith('data:image/')) throw new Error('로컬 이미지 데이터를 읽지 못했습니다.');
      } else {
        let url = resolved;
        if (api && /^https?:/.test(url)) url = `media://?url=${encodeURIComponent(url)}`;
        else if (!/^(https?:|blob:|media:)/.test(url)) {
          url = getApiUrl(`/api/view?filePath=${encodeURIComponent(src.split('?')[0])}`);
        }
        try {
          dataUrl = await exportBlobToDataUrl(await fetchExportImage(url));
        } catch (error) {
          // A successfully loaded image may be readable through canvas even if fetch is unavailable.
          if (!live?.complete || !live.naturalWidth) throw error;
          const canvas = document.createElement('canvas');
          canvas.width = live.naturalWidth; canvas.height = live.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw error;
          ctx.drawImage(live, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        }
      }
      image.src = dataUrl;
    } catch (err) {
      logWarn({
        file: 'frontend/src/lib/export/common.ts',
        func: 'inlineLocalImages',
        doing: `${index + 1}번째 이미지를 Base64 Data URI로 인라인 변환하는 작업`,
        target: src || `img[${index}]`,
        error: err
      });
    }
  }));
  await waitForExportResources(clone);
}

/**
 * ==== [injectExportStyles] ====
 * 🎯 역할 : 모든 내보내기 포맷 공통 — 복제된 DOM에 동적 CSS, 인쇄 보정 스타일, 페이지 구분선 숨김 규칙을 주입
 * 📥 파라미터 :
 *   - clone (HTMLElement) : 내보내기용 복제 DOM
 *   - dynamicCssString (string | undefined) : 동적 서식 프로필 CSS 문자열
 *   - options ({ hideIndicators?: boolean } | undefined) : 페이지 구분선 숨김 옵션
 *   - pageBg (string | undefined) : 페이지 배경색
 * 📤 반환값 : void
 */
export function injectExportStyles(
  clone: HTMLElement,
  dynamicCssString?: string,
  options?: { hideIndicators?: boolean },
  pageBg?: string
): void {
  if (dynamicCssString && !clone.classList.contains('custom-preview-container')) {
    clone.classList.add('custom-preview-container');
  }

  const bg = pageBg || '#ffffff';
  const fragments: string[] = [];

  if (dynamicCssString) {
    fragments.push(dynamicCssString);
  }

  if (options?.hideIndicators) {
    fragments.push(`
      hr.page-break {
        display: none !important;
      }
    `);
  }

  fragments.push(`
/* 🌟 html2canvas 가상 iframe 내부의 html/body 족쇄 해제 (글로벌 overflow:hidden/height:100% 무력화) */
html, body {
  height: auto !important;
  min-height: 100% !important;
  overflow: visible !important;
  overflow-y: visible !important;
  overflow-x: visible !important;
}
.prose {
  background-color: ${bg} !important;
}
/* 🛡️ 인라인 코드 백틱(기호) 소거 패치 (Tailwind Typography 기본 백틱 강제 생성 규칙 무력화) */
.prose code::before,
.prose code::after,
.custom-preview-container code::before,
.custom-preview-container code::after {
  content: "" !important;
  display: none !important;
}
/* 🛡️ 인라인 코드 상향 솟구침 및 줄바꿈 왜곡 방지 */
.prose :not(pre) > code,
.custom-preview-container :not(pre) > code {
  display: inline !important;
  vertical-align: baseline !important;
  box-decoration-break: clone !important;
  -webkit-box-decoration-break: clone !important;
}
.export-list-marker {
  vertical-align: baseline !important;
}
/* 🛡️ 태스크 리스트 아이템 체크박스 정렬 보정 */
.custom-preview-container .task-list-item input[type="checkbox"] {
  vertical-align: text-bottom !important;
  margin-bottom: 2px !important;
}
/* 🛡️ KaTeX 수식 블록 겹침 방지 및 렌더링 최적화 */
.katex-display {
  display: block !important;
  margin: 1em 0 !important;
  padding: 0.2em 0 !important;
  height: auto !important;
  overflow: visible !important;
}
.katex {
  display: inline-block !important;
  text-indent: 0 !important;
}
.katex-mathml {
  display: none !important;
}
/* 🛡️ 각주 타이틀 및 영어 라벨 원천 차단 */
.footnotes {
  border-top: 1px solid #e5e7eb !important;
  margin-top: 30px !important;
  padding-top: 10px !important;
}
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
`);

  const styleEl = document.createElement('style');
  styleEl.className = 'export-style-element';
  styleEl.textContent = fragments.join('\n');
  clone.appendChild(styleEl);
}

/**
 * ==== [resolveExportWatermark] ====
 * 🎯 역할 : 내보내기용 워터마크 설정을 검증하고 이미지 워터마크를 Base64 Data URI로 인라인 변환
 * 📥 파라미터 :
 *   - settings (DocumentPrintSettings) : 원본 문서 인쇄/워터마크 설정
 * 📤 반환값 : Promise<DocumentPrintSettings> (검증 및 이미지 인라인화 완료된 설정)
 * 💡 비고 : 리소스 폴더 변경 또는 이미지 로드 실패 시 기본 엠블럼으로 안전 폴백
 */
export async function resolveExportWatermark(settings: DocumentPrintSettings): Promise<DocumentPrintSettings> {
      const resolved = { ...settings };
      if(resolved.enabled){
        if(resolved.opacity===0)throw new Error('워터마크 진하기가 0%입니다. 진하기를 높이거나 사용을 꺼 주세요.');
        if(resolved.kind==='text' && !resolved.text?.trim()){
          resolved.text = DEFAULT_WATERMARK_TEXT;
        }
        if(resolved.kind==='image'){
          if(resolved.imageResource){
            try {
              const {watermarkResourceIdentity}=await import('../watermarkResources');
              if(resolved.imageResource!==watermarkResourceIdentity()){
                console.warn('[Watermark] 리소스 폴더 변경 감지, 기본 엠블럼으로 대체');
                resolved.image = DEFAULT_WATERMARK_IMAGE;
              }
            } catch {
              resolved.image = DEFAULT_WATERMARK_IMAGE;
            }
          }
          if(!resolved.image) resolved.image = DEFAULT_WATERMARK_IMAGE;
          if(!resolved.image.startsWith('data:')){
            try {
              const { listWatermarkResources, watermarkReferenceKey } = await import('../watermarkResources');
              const resList = await listWatermarkResources().catch(() => []);
              const targetKey = watermarkReferenceKey(resolved.image);
              const matched = resList.find((item: any) => watermarkReferenceKey(item.reference) === targetKey);
              if (matched) {
                const blob = await matched.read();
                resolved.image = await exportBlobToDataUrl(blob);
              } else {
                const holder=document.createElement('div'),img=document.createElement('img');img.src=resolved.image;holder.append(img);
                await inlineLocalImages(holder);
                resolved.image=img.src;
              }
            } catch (err) {
              logWarn({
                file: 'frontend/src/lib/export/common.ts',
                func: 'resolveExportWatermark',
                doing: '워터마크 이미지를 로드하여 Data URI로 변환하는 작업',
                target: resolved.image || 'watermark-image',
                error: err
              });
              resolved.image = DEFAULT_WATERMARK_IMAGE;
            }
          }
        }
      }
  return resolved;
}

/**
 * ==== [prepareDocumentFonts] ====
 * 🎯 역할 : 내보내기 대상 문서에서 사용 중인 글꼴을 추출하여 임베딩용 @font-face CSS 문자열 생성
 * 📥 파라미터 :
 *   - root (HTMLElement) : 글꼴 사용 여부를 스캔할 루트 DOM 요소
 * 📤 반환값 : Promise<string> (@font-face CSS 문자열)
 * 💡 비고 : 5초 타임아웃 적용, 실패 시 내보내기를 중단하지 않고 빈 문자열 반환
 */
export async function prepareDocumentFonts(root: HTMLElement): Promise<string> {
  const controller = new AbortController();
  try {
    return await withExportTimeout(embedExportFonts(root, controller.signal), '내보내기 글꼴', 5000);
  } catch (error) {
    logWarn({
      file: 'frontend/src/lib/export/common.ts',
      func: 'prepareDocumentFonts',
      doing: '내보내기 문서의 사용 글꼴을 임베딩하는 작업',
      target: 'embedExportFonts',
      error
    });
    return '';
  } finally { controller.abort(); }
}

/**
 * ==== [collectAllStyles] ====
 * 🎯 역할 : 현재 문서의 모든 로컬/확장프로그램 CSS 규칙을 SecurityError 없이 동기 추출하고 외부 CDN 링크를 수집
 * 📥 파라미터 : 없음
 * 📤 반환값 : { inlineStyles: string; linkTags: string }
 */
export function collectAllStyles(): { inlineStyles: string; linkTags: string } {
  const inlineStyles: string[] = [];
  const linkTags: string[] = [];
  
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (rules) {
        const cssText = Array.from(rules).map(r => r.cssText).join('\n');
        inlineStyles.push(stripExportViewportRules(cssText));
      }
    } catch (err) {
      // CORS 제한이 걸린 외부 CDN 스타일시트는 link 태그 원본 그대로 살려둠
      if (sheet.ownerNode && sheet.ownerNode instanceof Element && sheet.ownerNode.tagName.toUpperCase() === 'LINK') {
        const linkEl = sheet.ownerNode as HTMLLinkElement;
        linkTags.push(linkEl.outerHTML);
      }
    }
  }
  
  // 외부 CDN 링크가 누락되지 않도록 명시적 크로스체크 추가
  const allLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of allLinks) {
    const href = link.getAttribute('href');
    if (href && href.startsWith('http') && !linkTags.includes(link.outerHTML)) {
      linkTags.push(link.outerHTML);
    }
  }
  
  return {
    inlineStyles: inlineStyles.join('\n'),
    linkTags: linkTags.join('\n')
  };
}

/**
 * ==== [saveToDownloads] ====
 * 🎯 역할 : 기존 호출자의 다운로드 저장 결과 분기 호환 헬퍼 (Electron 데스크톱 모드에서는 true 반환, 웹에서는 브라우저 다운로드 사용)
 * 📥 파라미터 :
 *   - filename (string) : 저장할 파일명
 *   - content (string) : 파일 내용
 *   - type ('base64' | 'text') : 인코딩 타입
 * 📤 반환값 : Promise<boolean>
 */
export async function saveToDownloads(filename: string, content: string, type: 'base64' | 'text') {
  // 💡 [일렉트론 환경 가드] 일렉트론 순수 데스크톱 모드에서는 Express 백엔드 포트 서빙이 실행되지 않으므로,
  // 불필요한 로컬 API fetch 시도를 즉시 스킵하여 콘솔의 ERR_CONNECTION_REFUSED 빨간색 에러 노출을 방지합니다.
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }

  return false;
}

