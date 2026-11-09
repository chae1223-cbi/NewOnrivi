'use client';
/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-visual-readonly-block
 * 🚨 @PATCH : **2026-11-08** — [데스크톱 electronAPI 및 리소스 폴더 주입으로 시각 에디터 내부 이미지 404 차단]:
 *             1) components.img에서 AsyncImage로 electronAPI를 명시적으로 전달하여 데스크톱 환경에서 PDF/DOCX 가져오기 이미지(/media/...)가 즉시 로드되도록 보장
 * 🚨 @PATCH : **2026-11-07** — [AsyncImage 연동으로 읽기 전용 블록 이미지 렌더링 지원]:
 *             1) components.img에 AsyncImage를 연결하여 구글 드라이브(driveId) 및 로컬 미디어 이미지가 404 없이 정상 로드되도록 구현
 * 🚨 @PATCH : **2026-11-07** — [HTML 표(<table>...</table>) 시각 렌더링 및 TableWrapper 복사 지원]:
 *             1) rehypeRaw 플러그인을 탑재하여 읽기 전용 블록 내 HTML 표 태그가 문자열이 아닌 실제 인터랙티브 표로 시각 렌더링되도록 구현
 *             2) TableWrapper를 연동하여 표 호버 시 원본 HTML/TSV 복사 단추 제공
 * 🚨 @PATCH : **2026-10-13** — [LaTeX/KaTeX 수식 렌더링 지원]:
 *             1) remarkMath 및 rehypeKatex 플러그인을 탑재하여 블록 수식($$), 인라인 수식($) 실시간 렌더링 지원
 *             2) 수식 코드블록(```math, ```latex)에 대한 KaTeX 실시간 수식 렌더링 뷰어 연결
 */

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import TableHeaderCell from '@/components/TableHeaderCell';
import TableWrapper from '@/components/viewer/TableWrapper';
import { AsyncImage } from '@/components/viewer/AsyncMedia';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
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
        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
        components={{
          img({ src, alt, ...props }: any) {
            return (
              <AsyncImage
                src={src}
                alt={alt}
                api={typeof window !== 'undefined' ? (window as any).electronAPI : null}
                {...props}
              />
            );
          },
          th: TableHeaderCell,
          table({ node, children, className, ...props }: any) {
            return (
              <TableWrapper>
                <table className={`w-full table-auto min-w-full !m-0 !mt-0 !mb-0 ${className || ''}`} {...props}>
                  {children}
                </table>
              </TableWrapper>
            );
          },
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
