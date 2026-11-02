'use client';
/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-visual-readonly-block
 * 🚨 @PATCH : **2026-10-13** — [LaTeX/KaTeX 수식 렌더링 지원]:
 *             1) remarkMath 및 rehypeKatex 플러그인을 탑재하여 블록 수식($$), 인라인 수식($) 실시간 렌더링 지원
 *             2) 수식 코드블록(```math, ```latex)에 대한 KaTeX 실시간 수식 렌더링 뷰어 연결
 */

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import TableHeaderCell from '@/components/TableHeaderCell';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 인라인/블록 수식 코드블록 전용 렌더러
function ReadOnlyMathCode({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      containerRef.current.innerHTML = '';
      const cleanLatex = (code.trim() || '').replace(/\\\\/g, '\\');
      katex.render(cleanLatex, containerRef.current, {
        throwOnError: false,
        displayMode: true,
        output: 'html',
        strict: false
      });
    } catch {
      if (containerRef.current) {
        containerRef.current.textContent = code;
      }
    }
  }, [code]);

  return (
    <div className="my-3 py-1 flex justify-center overflow-x-auto select-all not-prose">
      <div ref={containerRef} className="py-1 text-zinc-900 dark:text-zinc-100" />
    </div>
  );
}

// Complex blocks retain their exact MD source but remain readable in the
// document. Nested fenced examples stay code; they are never reinterpreted.
export default function VisualReadOnlyMarkdownBlock({ source }: { source: string }) {
  return (
    <div className="visual-readonly-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }]]}
        components={{
          th: TableHeaderCell,
          code({ className, children, ...props }: any) {
            const match = /language-(\S+)/.exec(className || '');
            const lang = match ? match[1].toLowerCase() : '';
            if (lang === 'math' || lang === 'latex') {
              const codeStr = String(children || '').replace(/\n$/, '');
              return <ReadOnlyMathCode code={codeStr} />;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          pre({ children }) {
            return <div className="codeblock-area visual-code-block"><pre>{children}</pre></div>;
          },
          blockquote({ children }) {
            const blocks = React.Children.toArray(children);
            const first = blocks.findIndex(block => React.isValidElement(block));
            const paragraph = blocks[first];
            if (React.isValidElement<{ children: React.ReactNode }>(paragraph)) {
              const parts = React.Children.toArray(paragraph.props.children);
              const match = typeof parts[0] === 'string' ? parts[0].match(/^\[!([^\]]+)\]\s*/) : null;
              if (match) {
                parts[0] = (parts[0] as string).slice(match[0].length);
                blocks[first] = React.cloneElement(paragraph, {}, parts);
                return <aside className="visual-readonly-callout" data-alert-type={match[1]}><strong>{match[1]}</strong>{blocks}</aside>;
              }
            }
            return <blockquote>{children}</blockquote>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
