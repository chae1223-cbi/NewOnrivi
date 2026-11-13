// ====================================================================
// 📊 [OMD-CORE-CodeBlock-0001] CodeBlock.tsx ➔ 마크다운 코드블록 컴포넌트
// 🎯 @KICK  : 코드블록을 언어명 헤더 + 복사 버튼 + 개별 행(.onrivi-line) 1:1 라인 매핑 및 모노스페이스 렌더링
// 🛡️ @GUARD : navigator.clipboard.writeText API 존재 여부, 빈 행 \u200B 보존, AST/lineMap 기반 정밀 줄 번호 부여
// 🚨 @PATCH : 2026-11-13 — [코드블록 헤더 복사/형태 복사 액션 버튼 소형 아이콘화]: 버튼 내 텍스트 라벨을 제거하고 13x13 아이콘과 툴팁으로 소형화
// 🚨 @PATCH : 2026-11-12 — [코드블록 자동 줄바꿈(white-space: pre-wrap) 적용]: 미리보기 뷰어에서도 코드블록 내 긴 문장이 가로 스크롤 없이 자동 줄바꿈되도록 적용
// 🚨 @PATCH : 2026-11-07 — [코드블록 순수 문구 복사 및 형태 복사 이원화]: 미리보기 뷰어 헤더에 '복사'(순수 텍스트)와 '형태 복사'(마크다운 백틱 펜스 형태 포함) 버튼 분리 제공
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 모듈화 분리]: CodeBlock 및 코드블록 정규화 유틸 독립 분리
// 🔗 @CALLS : navigator.clipboard.writeText, splitChildrenIntoLines
// ====================================================================
// @ts-nocheck
"use client";

import React, { useState, useMemo } from 'react';

export const extractDataLine = (props: any, node?: any): number | undefined => {
  if (!props && !node) return undefined;
  const val = props?.['data-line'] || props?.dataLine || props?.['dataLine'] || node?.properties?.['data-line'] || node?.properties?.dataLine;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export function splitChildrenIntoLines(children: React.ReactNode): React.ReactNode[][] {
  const lines: React.ReactNode[][] = [[]];

  const pushItem = (item: React.ReactNode) => {
    lines[lines.length - 1].push(item);
  };

  const pushNewLine = () => {
    lines.push([]);
  };

  const split = (value: React.ReactNode): React.ReactNode[][] => {
    if (typeof value === 'string') {
      const parts = value.split('\n');
      parts.forEach((part, idx) => {
        if (idx > 0) pushNewLine();
        if (part) pushItem(part);
      });
      return lines;
    }

    if (React.isValidElement(value)) {
      const elementChildren = (value.props as any)?.children;
      if (elementChildren) {
        if (typeof elementChildren === 'string') {
          const parts = elementChildren.split('\n');
          parts.forEach((part, idx) => {
            if (idx > 0) pushNewLine();
            if (part) {
              pushItem(React.cloneElement(value, { key: `${lines.length}-${lines[lines.length - 1].length}` }, part));
            }
          });
          return lines;
        }
      }
      pushItem(value);
      return lines;
    }

    if (Array.isArray(value)) {
      value.forEach(v => split(v));
      return lines;
    }

    if (value !== null && value !== undefined) {
      pushItem(value);
    }
    return lines;
  };

  split(children);
  return lines;
}

export interface CodeSegment {
  isCode: boolean;
  text: string;
}

export function partitionAndNormalizeCodeBlocks(markdown: string): CodeSegment[] {
  const lines = markdown.split('\n');
  const fenceRegex = /^([ \t]{0,3})(`{3,}|~{3,})(.*)$/;
  const modifiedLines = [...lines];

  let i = 0;
  while (i < modifiedLines.length) {
    const line = modifiedLines[i];
    const match = line.match(fenceRegex);
    if (!match) {
      i++;
      continue;
    }

    const indent = match[1];
    const fenceChar = match[2][0];
    const fenceLen = match[2].length;
    const info = match[3].trim();

    // 백틱 펜스의 경우 info 문자열 내부에 백틱이 포함되면 유효하지 않음(CommonMark 규격)
    if (fenceChar === '`' && info.includes('`')) {
      i++;
      continue;
    }

    let depth = 1;
    let closingLineIdx = -1;
    let maxInnerLen = 0;
    let hasInnerFences = false;

    for (let j = i + 1; j < modifiedLines.length; j++) {
      const curLine = modifiedLines[j];
      const curMatch = curLine.match(fenceRegex);
      if (!curMatch || curMatch[2][0] !== fenceChar) {
        continue;
      }

      const curFenceLen = curMatch[2].length;
      const curInfo = curMatch[3].trim();

      // 💡 [CommonMark 표준 보호] 외부 펜스가 4개 이상(예: ````)이고 내부 펜스가 그보다 짧으면(예: ```)
      // 내부 펜스는 info 유무와 관계없이 이미 완전한 텍스트 내용이므로 depth를 건드리지 않음
      if (fenceLen >= 4 && curFenceLen < fenceLen) {
        continue;
      }

      // 언어 태그(info)가 있는 경우(예: ```python) 명백한 내부 코드블록의 시작
      if (curInfo.length > 0) {
        depth++;
        hasInnerFences = true;
        if (curFenceLen > maxInnerLen) maxInnerLen = curFenceLen;
        continue;
      }

      // info가 없는 펜스: inner block이 열려 있는 상태라면 inner block을 닫음
      if (depth > 1) {
        depth--;
        if (curFenceLen > maxInnerLen) maxInnerLen = curFenceLen;
        continue;
      }

      // depth === 1인 상태에서 만난 닫는 펜스
      if (curFenceLen >= fenceLen || hasInnerFences) {
        closingLineIdx = j;
        break;
      }
    }

    if (closingLineIdx !== -1) {
      // 내부 중첩 코드블록이 존재하고 외부 펜스 길이가 내부 펜스 이하인 경우
      // 외부 펜스를 4개 백틱(또는 maxInnerLen + 1)으로 승격하여 CommonMark 중첩 펜스 완성
      if (hasInnerFences && fenceLen <= maxInnerLen) {
        const newFenceLen = Math.max(fenceLen, maxInnerLen + 1, 4);
        const newOpenFence = indent + fenceChar.repeat(newFenceLen) + (match[3] || '');
        const closeMatch = modifiedLines[closingLineIdx].match(fenceRegex);
        const closeIndent = closeMatch ? closeMatch[1] : '';
        const newCloseFence = closeIndent + fenceChar.repeat(newFenceLen);

        modifiedLines[i] = newOpenFence;
        modifiedLines[closingLineIdx] = newCloseFence;
      }
      i = closingLineIdx + 1;
    } else {
      i++;
    }
  }

  const segments: CodeSegment[] = [];
  let currentSegment: string[] = [];
  let inCode = false;
  let activeFenceChar = '';
  let activeFenceLen = 0;

  for (let idx = 0; idx < modifiedLines.length; idx++) {
    const line = modifiedLines[idx];
    const match = line.match(fenceRegex);

    if (!inCode) {
      if (match && !(match[2][0] === '`' && match[3].includes('`'))) {
        if (currentSegment.length > 0) {
          segments.push({ isCode: false, text: currentSegment.join('\n') });
          currentSegment = [];
        }
        inCode = true;
        activeFenceChar = match[2][0];
        activeFenceLen = match[2].length;
        currentSegment.push(line);
      } else {
        currentSegment.push(line);
      }
    } else {
      currentSegment.push(line);
      if (match && match[2][0] === activeFenceChar && match[2].length >= activeFenceLen && match[3].trim() === '') {
        segments.push({ isCode: true, text: currentSegment.join('\n') });
        currentSegment = [];
        inCode = false;
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ isCode: inCode, text: currentSegment.join('\n') });
  }

  return segments;
}

export interface CodeBlockProps {
  lang: string;
  title?: string;
  rawInfo?: string;
  code: string;
  className?: string;
  node?: any;
  lineMap?: number[];
  children?: React.ReactNode;
  [key: string]: any;
}

export default function CodeBlock({ lang, title, rawInfo, code, className, node, lineMap, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copiedFenced, setCopiedFenced] = useState(false);

  const handleCopyText = async () => {
    try {
      const api = (window as any).electronAPI;
      if (api?.copyTextToClipboard) await api.copyTextToClipboard(code);
      else await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Onrivi Author] 코드 복사 실패', err);
    }
  };

  const handleCopyFenced = async () => {
    try {
      const info = (rawInfo || title || lang || '').trim();
      const markdownFenced = '```' + info + '\n' + code + (code.endsWith('\n') ? '' : '\n') + '```';
      const api = (window as any).electronAPI;
      if (api?.copyTextToClipboard) await api.copyTextToClipboard(markdownFenced);
      else await navigator.clipboard.writeText(markdownFenced);
      setCopiedFenced(true);
      setTimeout(() => setCopiedFenced(false), 2000);
    } catch (err) {
      console.error('[Onrivi Author] 형태 복사 실패', err);
    }
  };

  const startLine = extractDataLine(props, node);
  const currentLineMap = lineMap || [];

  const splitLines = useMemo(() => {
    if (children) return splitChildrenIntoLines(children);
    if (code) return splitChildrenIntoLines([code]);
    return [[]];
  }, [children, code]);

  return (
    <div data-code-info={rawInfo} data-code-title={title} data-line={startLine} className="codeblock-area group my-4 rounded-lg bg-zinc-100/90 dark:bg-zinc-900/95 overflow-hidden shadow-sm select-text max-w-full border border-zinc-200/70 dark:border-zinc-800/90">
      {/* 코드블록 상단 헤더 (언어명 및 복사/형태 복사 버튼) */}
      <div data-line={startLine} className="codeblock-header flex items-center justify-between px-4 py-1.5 bg-zinc-200/80 dark:bg-zinc-800/95 min-h-9 gap-3 border-b border-zinc-200/70 dark:border-zinc-800/90">
        <span className="codeblock-header-text text-xs font-bold text-zinc-700 dark:text-zinc-300 break-words min-w-0">
          {title || lang || '코드'}
        </span>
        <div className="flex items-center gap-1 shrink-0 z-10 no-print">
          <button
            onClick={handleCopyText}
            className="onrivi-media-control copy-button-hook shrink-0 bg-black/20 dark:bg-white/10 hover:bg-black/40 dark:hover:bg-white/20 text-slate-100 rounded opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
            title={copied ? '복사 완료' : '코드 순수 문구만 복사'}
            aria-label="코드 순수 문구 복사"
            style={{ userSelect: 'none' }}
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </button>
          <button
            onClick={handleCopyFenced}
            className="onrivi-media-control copy-fenced-button-hook shrink-0 bg-black/20 dark:bg-white/10 hover:bg-black/40 dark:hover:bg-white/20 text-slate-100 rounded opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
            title={copiedFenced ? '형태 복사됨' : '코드블록 마크다운 형태(```) 포함 복사'}
            aria-label="마크다운 코드블록 형태 복사"
            style={{ userSelect: 'none' }}
          >
            {copiedFenced ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="w-full custom-scrollbar">
        <pre className="m-0 p-4 font-mono text-sm leading-[1.35] bg-transparent w-full max-w-full text-zinc-800 dark:text-white whitespace-pre-wrap break-all">
          <code className={`hljs ${className || ''}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }} {...props}>
            {splitLines.length > 0 ? (
              splitLines.map((lineItems, idx) => {
                const astStartLine = node?.position?.start?.line;
                let lineNum: number | undefined = undefined;
                if (astStartLine) {
                  const targetAstLine = astStartLine + 1 + idx;
                  lineNum = currentLineMap.length > 0
                    ? (currentLineMap[targetAstLine - 1] || targetAstLine)
                    : (startLine ? startLine + 1 + idx : targetAstLine);
                } else if (startLine) {
                  lineNum = startLine + 1 + idx;
                }
                return (
                  <span
                    key={idx}
                    data-line={lineNum}
                    className="onrivi-line block w-full min-h-[1.35em] leading-[1.35]"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {lineItems.length > 0 ? lineItems : '\u200B'}
                  </span>
                );
              })
            ) : (
              children || code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
