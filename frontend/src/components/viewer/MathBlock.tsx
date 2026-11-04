// ====================================================================
// 📊 [OMD-CORE-MathBlock-0001] MathBlock.tsx ➔ LaTeX/KaTeX 수식 코드블록 렌더러
// 🎯 @KICK  : LaTeX/KaTeX 수식 코드블록(```math, ```latex)을 코드블록 UI 없이 순수 수식으로 중앙 정렬 실시간 렌더링
// 🛡️ @GUARD : katex.render throwOnError: false 안전 파싱
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 모듈화 분리]: MathBlock 컴포넌트 독립 분리
// 🔗 @CALLS : katex.render
// ====================================================================
// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';

export interface MathBlockProps {
  code: string;
  dataLine?: number | string;
}

const MathBlock = React.memo(function MathBlock({ code, dataLine }: MathBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      containerRef.current.innerHTML = '';
      const cleanLatex = (code.trim() || '').replace(/\\\\/g, '\\');
      if (!cleanLatex) {
        setError(null);
        return;
      }
      katex.render(cleanLatex, containerRef.current, {
        throwOnError: false,
        displayMode: true,
        output: 'html',
        strict: false
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || '수식 렌더링 오류');
    }
  }, [code]);

  if (error) {
    return (
      <div data-line={dataLine} className="my-2 py-1 text-center text-xs text-rose-500 font-mono not-prose">
        ⚠️ 수식 오류: {error}
      </div>
    );
  }

  return (
    <div
      data-line={dataLine}
      className="my-3 py-1 flex justify-center items-center overflow-x-auto text-zinc-900 dark:text-zinc-100 select-all not-prose"
    >
      <div ref={containerRef} className="w-full flex justify-center py-1" />
    </div>
  );
});

export default MathBlock;
