// ====================================================================
// 📊 [OMD-CORE-TableWrapper-0001] TableWrapper.tsx ➔ 마크다운 표 래퍼 컴포넌트
// 🎯 @KICK  : 마크다운 렌더링 내의 표(table) 태그를 수신하여 가로 스크롤 레이아웃으로 감싸고, 마우스 오버 시 스프레드시트 호환 규격(HTML + TSV) 복사 버튼 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 MarkdownViewer 대형 소스 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-10 — [표 복사 액션 버튼 호버 및 커서/포커스 진입 시 활성화 연동]: group-focus-within 및 focus 지원 추가
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 모듈화 분리]: TableWrapper 컴포넌트 독립 분리
// 🔗 @CALLS : ClipboardItem, navigator.clipboard.write
// ====================================================================
// @ts-nocheck
"use client";

import React, { useState, useLayoutEffect, useRef } from 'react';

export interface TableWrapperProps {
  children: React.ReactElement;
  widths?: number[] | null;
  [key: string]: any;
}

export default function TableWrapper({ children, widths, ...restProps }: TableWrapperProps) {
  const [copied, setCopied] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const table = tableRef.current?.querySelector('table');
    if (!table) return;
    table.querySelector('colgroup[data-onrivi-column-ratios]')?.remove();
    if (widths?.length) {
      const group = document.createElement('colgroup');
      group.setAttribute('data-onrivi-column-ratios', '');
      widths.forEach(width => {
        const col = document.createElement('col');
        col.style.width = `${width}%`;
        group.append(col);
      });
      table.prepend(group);
    }
  }, [children, widths]);

  const handleCopy = async () => {
    if (!tableRef.current) return;
    const tableEl = tableRef.current.querySelector('table');
    if (!tableEl) return;

    try {
      // 1. HTML 데이터 추출 (복제하여 복사 버튼 등 외부 UI 태그가 들어가는 것 차단)
      const clone = tableEl.cloneNode(true) as HTMLTableElement;
      clone.removeAttribute('class');
      const tableHtml = clone.outerHTML;

      // 2. Plain Text (탭 구분 텍스트) 추출 (엑셀 등에 깔끔하게 붙여넣을 수 있도록 TSV 구성)
      const rows = Array.from(tableEl.querySelectorAll('tr'));
      const textLines = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => cell.textContent?.trim() || '').join('\t');
      });
      const tableText = textLines.join('\n');

      // 3. 클립보드 다중 타입 데이터 적재
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([tableHtml], { type: 'text/html' });
        const plainBlob = new Blob([tableText], { type: 'text/plain' });
        
        const data = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': plainBlob
        });
        await navigator.clipboard.write([data]);
      } else {
        await navigator.clipboard.writeText(tableText);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Onrivi Author] 시트/표형식 복사 실패', err);
    }
  };

  return (
    <div ref={tableRef} className="table-wrapper-area relative group overflow-x-auto select-text w-full max-w-full" {...restProps}>
      {/* 마우스 호버 시 우측 상단에 노출되는 미려한 시트/표형식 복사 단추 */}
      <button
        onClick={handleCopy}
        className="onrivi-media-control copy-button-hook absolute top-1 right-1 px-2 py-1 bg-black/60 dark:bg-white/20 text-white rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity text-[11px] flex items-center gap-1 z-10 hover:bg-black/80 font-medium no-print cursor-pointer"
        title="복사"
        style={{ userSelect: 'none' }}
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style={{ color: '#4ade80' }}>복사 완료</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>복사</span>
          </>
        )}
      </button>
      {children}
    </div>
  );
}
