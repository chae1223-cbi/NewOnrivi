// ====================================================================
// 📊 [OMD-IO-export-common-0001] frontend/src/lib/export/common.ts
// 🎯 @KICK  : 문서 내보내기 공통 DOM 조작, 스타일 인젝션, 이미지/폰트 인라인화 및 다운로드 헬퍼
// 🛡️ @GUARD : CORS 방어, 비식별화, IME 강제 플러시, 리스트 마커 및 표 서식 보존
// 🚨 @PATCH : **2026-11-04** — [모듈화 분리]: exportHandlers.ts에서 공통 DOM 전처리 및 헬퍼 함수 분리
// 🔗 @CALLS : materializeReportNumbers, materializeHeadingNumbers, embedExportFonts
// ====================================================================
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { cleanExportDocument, EXPORT_DOCUMENT_CSS, stripExportViewportRules, getExportDocumentRoot, prepareExportPreview, waitForExportResources, fetchExportImage, exportBlobToDataUrl, withExportTimeout } from '../exportPreparation';
import { materializeHeadingNumbers } from '../headingNumbering';
import { reportNumberingCss, materializeReportNumbers, CIRCLED_DECIMAL_LIST_STYLE, CIRCLED_NUMBERS, getBulletSymbolValue } from '../reportNumbering';
import { embedExportFonts } from '../exportFonts';
import { msg } from '@/lib/systemMessages';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { DEFAULT_PROFILE, normalizeCssProfile } from '@/constants/cssProfile';
import { DocumentPrintSettings, DEFAULT_PRINT_SETTINGS, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from '../documentPrintSettings';
import type { CssProfile } from '@/types/cssProfile';
import type { ExportOptions, SNSCardNewsOptions } from './types';

// ====================================================================
// 📊 [OMD-IO-exportHandlers-0000] exportHandlers.ts ➔ injectPageBreakMarkers
// 🎯 @KICK  : 설정된 헤딩 레벨(exportPageBreakLevel)에 따라 DOM에 직접 page-break 마커를 삽입
// 🛡️ @GUARD : CSS page-break 선택자 방식은 h3·h4 레벨에서 섹션 내부 이중 break가 발생하는 한계가 있어 DOM 직접 삽입 방식으로 대체
// 🚨 @PATCH : **2026-08-16** — 신규 구현
// 🔗 @CALLS : exportPDF
// ====================================================================
// 🔑 섹션 분할 정책 (EPUB과 동일한 버퍼 알고리즘):
//   h(level) 헤딩이 등장할 때마다 이전까지의 내용이 하나의 단위가 됩니다.
//   상위 레벨 헤딩(h1~h(level-1))은 버퍼에 쌓이다가, h(level)이 나올 때 함께 하나의 섹션을 구성합니다.
//   예) h3 기준: [h2+h2내용+h3#1+내용] / [h3#2+내용] / [h2(새)+h2내용+h3#3+내용] / [h3#4+내용]
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

// [ONR-EXP-001] 로컬 PDF / HTML 파일 출력 처리: 현재 문서 본문 DOM을 클론하여 지도/동영상 요소를 정적 변환하고 프린트 출력 스타일을 입혀 PDF/HTML 내보내기를 핸들링합니다.
/** IME 조합 버퍼 강제 커밋: export 직전 한글 입력이 완성되지 않은 상태로 캡처되는 현상 차단 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0001] exportHandlers.ts ➔ flushIME
// 🎯 @KICK  : IME 조합 버퍼 강제 커밋 — export 전 한글 미완성 입력 캡처 차단
// 🛡️ @GUARD : 임시 input 생성/포커스/blur/제거
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function flushIME(): void {
  const input = document.createElement('input');
  input.style.cssText = 'position:fixed;top:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  input.blur();
  document.body.removeChild(input);
}

/** html2canvas 한계 완벽 우회: 인라인코드 높이 고정 및 상하 패딩 소거형 정렬
 *  (html2canvas of inline-block 높이 오계산 및 글자 처짐 버그를 해결하는 가장 완벽하고 수학적인 해법) */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0002] exportHandlers.ts ➔ applyExportInlineStyles
// 🎯 @KICK  : 이미지/PDF 내보내기 시 인라인 코드 높이 오계산 및 상향 솟구침, 단어 쪼개짐 버그 해결
// 🚨 @PATCH : **2026-10-01** — [미리보기 실시간 계산 스타일(Computed Style) 1:1 복제 엔진 도입]: sourceEl(미리보기 실제 DOM)의 각 table, th, td에서 브라우저가 렌더링한 실제 테두리·색상·배경·정렬(Computed Style)을 1:1로 복사하여, 미리보기의 외곽 테두리 및 가로선/세로선 구조를 이미지/PDF 내보내기 시 100% 동일하게 재현
// 🚨 @PATCH : **2026-10-01** — [표 내보내기 시 외곽 테두리 및 행/열 테두리 인라인 주입]: html-to-image/canvas 캡처 시 외곽 테두리 소실을 막기 위해 table 및 셀의 최외곽 4면에 테두리를 직접 주입하고, colBorderWidth가 0px일 때 세로선을 완전 소거하여 미리보기와 100% 일치하도록 보장
// 🚨 @PATCH : **2026-10-01** — display:inline-block 및 vertical-align:0으로 인한 인라인 코드 두 줄 쪼개짐 및 상단 솟구침 버그를 display:inline, vertical-align:baseline, white-space:nowrap(단어보호), box-decoration-break:clone으로 전면 개편하여 완벽 해결
// 🚨 @PATCH : **2026-06-19** — PNG/HTML 내보내기 시 인라인 코드 스타일을 미리보기(globals.css)와 100% 동기화하기 위해 vertical-align:0, line-height:1.35, padding:1px 4.5px 규격으로 완전 치환
// 🔗 @CALLS : 없음
// ====================================================================
// Keep PDF and EPUB table styling in sync with the rendered document.
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

/** Yandex/Google 지도 복원 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0003] exportHandlers.ts ➔ restoreMapsInClone
// 🎯 @KICK  : 구글 지도 iframe 및 data-map-original-src 속성 기반 지도 복원 (Yandex 정적맵 fallback + Google Maps 링크)
// 🛡️ @GUARD : URL 파싱 오류, center/zoom/q 추출 방어
// 🚨 @PATCH : **2026-06-19** — iframe[src*="maps.google.com"] 요소를 추가로 감지하여 Yandex Static Maps 정적 이미지로 복원 치환함으로써 html2canvas의 CORS 제한으로 인한 지도 엑스박스(누락) 버그를 영구 해결
// 🔗 @CALLS : msg.error
// ====================================================================
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

/** 모든 유튜브 iframe(임베드) 요소를 썸네일 하이퍼링크로 자동 변환 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0004] exportHandlers.ts ➔ convertYoutubeIframeToLink
// 🎯 @KICK  : YouTube iframe 임베드를 썸네일 + 하이퍼링크 컨테이너로 변환
// 🛡️ @GUARD : youtube.com / youtube-nocookie.com embed 감지, videoId 추출
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
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

/** 미리보기 DOM 복제 + 버튼 요소 정리 + 지도 복원 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0005] exportHandlers.ts ➔ clonePreview
// 🎯 @KICK  : 미리보기 DOM 복제 + 버튼 정리 + 지도 복원 + 유튜브 변환
// 🛡️ @GUARD : cloneNode(true)로 전체 트리 복제
// 🚨 @PATCH : 없음
// 🔗 @CALLS : restoreMapsInClone, convertYoutubeIframeToLink
// ====================================================================
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

/** html2canvas가 ::before/::after/counter()를 지원하지 않아 목록 마커가 소실되는 문제 해결:
 *  export 전 clone DOM에 직접 숫자/불릿 마커를 주입 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0006] exportHandlers.ts ➔ fixListMarkers
// 🎯 @KICK  : html2canvas ::before/counter() 미지원 문제 해결 — DOM에 숫자/불릿 마커 직접 주입
// 🛡️ @GUARD : onrivi-empty-list-row / task-list-item 제외, start 속성 반영
// 🚨 @PATCH : export-style-element 클래스로 스타일 및 마커 일괄 관리
// 🔗 @CALLS : 없음
// ====================================================================
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

/** 상대 경로(/~) 및 media:// 프로토콜 이미지를 Base64 Data URI로 인라인 임베딩 (내보내기 시 이미지 깨짐 방지) */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0007] exportHandlers.ts ➔ inlineLocalImages
// 🎯 @KICK  : 상대 경로 / media:// 이미지를 Base64 Data URI로 인라인 임베딩
// 🛡️ @GUARD : Electron IPC, Data URI/http(s) 스킵, 백엔드 /api/view 2차 fallback
// 🚨 @PATCH : **2026-06-19** — PNG 및 EPUB 내보내기 시 외부 이미지 로딩 CSP/CORS 차단 해결을 위해 일렉트론 환경에서 외부 http/https URL을 media 프록시로 대리 fetch하여 base64 인라인 변환하도록 패치; Electron readImageAsBase64 IPC 우회, 백엔드 실패 시 프론트엔드 정적 서빙 재시도
// 🔗 @CALLS : getApiUrl
// ====================================================================
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
      console.warn(`[inlineLocalImages] ${index + 1}번째 이미지 인라인 변환 건너뜀:`, err);
    }
  }));
  await waitForExportResources(clone);
}

/**
 * 모든 export 포맷 공통: 복제된 DOM에 동적 CSS + 인쇄 스타일을 주입합니다.
 * hideIndicators: true 면 화면용 가상 페이지 구분선(빨간 점선/이모지)을 제거
 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0008] exportHandlers.ts ➔ injectExportStyles
// 🎯 @KICK  : export 전 clone DOM에 동적 CSS + 인쇄 스타일 + 페이지 구분선 숨김 주입
// 🛡️ @GUARD : hideIndicators 옵션, dynamicCssString 존재 여부, pageBg 배경색
// 🚨 @PATCH : **2026-06-19** — PNG/HTML 내보내기 시 인라인 코드 스타일을 미리보기(globals.css)와 100% 동기화하기 위해 vertical-align:0, line-height:1.35, padding:1px 4.5px 규격으로 완전 치환; html2canvas 가상 iframe 내부의 html/body 글로벌 족쇄(overflow:hidden 및 height:100%) 오버라이드 해제 스타일 추가; custom-preview-container 클래스 추가로 사용자 CSS 우선 적용; 인라인 코드, 리스트 마커, 수식 겹침(KaTeX), 체크박스 정렬 불일치를 완벽 해결하기 위해 인쇄 스타일 가드 적용; KaTeX 웹폰트 CDN 강제 임포트로 수식 왜곡 및 가로 막힘 영구 해결
// 🔗 @CALLS : 없음
// ====================================================================
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

/** 모든 로컬/크롬 확장프로그램/데스크탑 CSS 규칙을 동기식으로 추출하여 인라인 스타일로 변환 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0014] exportHandlers.ts ➔ collectAllStyles
// 🎯 @KICK  : 로컬 및 확장프로그램 CSS 규칙들을 SecurityError 없이 동기 추출하여 인라인화
// 🛡️ @GUARD : chrome-extension://, file://, app:// 프로토콜 대응, 외부 CDN link 분리 보존
// 🚨 @PATCH : **2026-06-20** — 신규 구현 (비동기 fetch 대신 브라우저 컴파일 완료된 cssRules 동기식 추출 방식)
// 🔗 @CALLS : 없음
// ====================================================================
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
              console.warn('[Watermark] 워터마크 이미지 로드 실패, 기본 엠블럼으로 안전 대체:', err);
              resolved.image = DEFAULT_WATERMARK_IMAGE;
            }
          }
        }
      }
  return resolved;
}

export async function prepareDocumentFonts(root: HTMLElement): Promise<string> {
  const controller = new AbortController();
  try {
    return await withExportTimeout(embedExportFonts(root, controller.signal), '내보내기 글꼴', 5000);
  } catch (error) {
    console.warn('[export] Font embedding skipped; using available fonts:', error);
    return '';
  } finally { controller.abort(); }
}

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

/** 다운로드 폴더에 파일 백업 */
// ====================================================================
// 📊 [OMD-IO-exportHandlers-0009] exportHandlers.ts ➔ saveToDownloads
// 🎯 @KICK  : 기존 호출자의 저장 결과 분기 호환. 웹 파일은 브라우저 다운로드로 저장한다.
// 🛡️ @GUARD : 웹에서 존재하지 않는 백업 API를 추가 호출하지 않는다.
// 🚨 @PATCH : 없음
// 🔗 @CALLS : getApiUrl
// ====================================================================
export async function saveToDownloads(filename: string, content: string, type: 'base64' | 'text') {
  // 💡 [일렉트론 환경 가드] 일렉트론 순수 데스크톱 모드에서는 Express 백엔드 포트 서빙이 실행되지 않으므로,
  // 불필요한 로컬 API fetch 시도를 즉시 스킵하여 콘솔의 ERR_CONNECTION_REFUSED 빨간색 에러 노출을 방지합니다.
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true;
  }

  return false;
}

