// ====================================================================
// 📊 [OMD-CORE-MermaidBlock-0001] MermaidBlock.tsx ➔ Mermaid 차트 SVG 다이어그램 렌더러
// 🎯 @KICK  : Mermaid 차트 원본 텍스트를 SVG 다이어그램 이미지로 실시간 변환 렌더링하고, 이미지 저장(PNG)/복사(클립보드) 및 새 창 확대 뷰어 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 MarkdownViewer 대형 소스 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-13 — [머메이드 다이어그램 헤더 액션 버튼 소형 아이콘화]: 코드 복사·새 창 확대·이미지 복사·저장 버튼을 13x13 SVG 아이콘 전용 버튼으로 일원화
// 🚨 @PATCH : 2026-11-04 — [MarkdownViewer 모듈화 분리]: MermaidBlock 컴포넌트 독립 분리
// 🔗 @CALLS : useToast, loadMermaidScript
// ====================================================================
// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';

let mermaidPromise: Promise<any> | null = null;
const mermaidSvgCache = new Map<string, string>();

const loadMermaidScript = (): Promise<any> => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if ((window as any).mermaid) {
    return Promise.resolve((window as any).mermaid);
  }
  if (mermaidPromise) {
    return mermaidPromise;
  }

  mermaidPromise = new Promise((resolve) => {
    const loaded = () => {
      const m = (window as any).mermaid;
      if (m) {
        m.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        resolve(m);
      } else {
        mermaidPromise = null;
        resolve(null);
      }
    };

    const script = document.createElement('script');
    script.src = './mermaid.min.js?v=amd-isolation-2';
    script.onload = loaded;
    script.onerror = () => {
      mermaidPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return mermaidPromise;
};

export interface MermaidBlockProps {
  code: string;
  dataLine?: number | string;
}

const MermaidBlock = React.memo(function MermaidBlock({ code, dataLine }: MermaidBlockProps) {
  const { showToast } = useToast();
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRetryRef = useRef(0);
  const mermaidRetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔍 다이어그램 새 창으로 확대 뷰잉 기능 구현 (데스크탑/웹 환경 분기 처리)
  const openInNewWindow = async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    let svgWidth = 800;
    let svgHeight = 600;
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[ ,]+/);
      if (parts.length === 4) {
        svgWidth = parseFloat(parts[2]);
        svgHeight = parseFloat(parts[3]);
      }
    } else {
      const attrWidth = svgElement.getAttribute('width');
      const attrHeight = svgElement.getAttribute('height');
      if (attrWidth && attrHeight) {
        svgWidth = parseFloat(attrWidth);
        svgHeight = parseFloat(attrHeight);
      }
    }

    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.removeAttribute('style');
    svgClone.style.maxWidth = 'none';
    svgClone.style.width = '100%';
    svgClone.style.height = 'auto';
    svgClone.style.display = 'block';

    const svgData = new XMLSerializer().serializeToString(svgClone);

    const winWidth = Math.min(svgWidth + 100, window.screen.availWidth * 0.85);
    const winHeight = Math.min(svgHeight + 150, window.screen.availHeight * 0.85);

    const isDesktop = typeof window !== 'undefined' && typeof (window as any).electronAPI?.openMermaidWindow === 'function';
    if (isDesktop) {
      const result = await (window as any).electronAPI.openMermaidWindow(svgData, {
        width: Math.round(winWidth),
        height: Math.round(winHeight),
      });
      if (result && !result.success) {
        showToast(`💡 다이어그램 창 열기 실패: ${result.error}`, 'warning');
      }
      return;
    }

    const newWindow = window.open(
      '',
      '_blank',
      `width=${winWidth},height=${winHeight},resizable=yes,scrollbars=yes`
    );

    if (!newWindow) {
      showToast("💡 브라우저의 팝업이 차단되었습니다. 주소창 우측에서 팝업을 허용해주세요!", 'warning');
      return;
    }

    newWindow.document.open();
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Onrivi 다이어그램 돋보기</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #ffffff;
            overflow: auto;
          }
          .svg-container {
            padding: 40px;
            box-sizing: border-box;
            width: 100%;
            max-width: 95%;
            height: auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="svg-container">
          ${svgData}
        </div>
      </body>
      </html>
    `);
    newWindow.document.close();
  };

  const getHighResCanvas = async (svgElement: SVGSVGElement): Promise<HTMLCanvasElement | null> => {
    let svgWidth = 800;
    let svgHeight = 600;
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[ ,]+/);
      if (parts.length === 4) {
        svgWidth = parseFloat(parts[2]);
        svgHeight = parseFloat(parts[3]);
      }
    } else {
      const attrWidth = svgElement.getAttribute('width');
      const attrHeight = svgElement.getAttribute('height');
      if (attrWidth && attrHeight) {
        svgWidth = parseFloat(attrWidth);
        svgHeight = parseFloat(attrHeight);
      } else {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svgWidth = rect.width;
          svgHeight = rect.height;
        }
      }
    }

    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.removeAttribute('style');
    svgClone.style.maxWidth = 'none';
    svgClone.style.width = `${svgWidth}px`;
    svgClone.style.height = `${svgHeight}px`;
    svgClone.setAttribute('width', svgWidth.toString());
    svgClone.setAttribute('height', svgHeight.toString());

    const scaleFactor = 3;
    const canvas = document.createElement('canvas');
    canvas.width = svgWidth * scaleFactor;
    canvas.height = svgHeight * scaleFactor;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleFactor, scaleFactor);

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    
    await new Promise((resolve) => img.onload = resolve);
    ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

    return canvas;
  };

  const handleCopyImage = async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const canvas = await getHighResCanvas(svgElement);
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('이미지 복사 실패:', err);
    }
  };

  const handleSaveImage = async () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const canvas = await getHighResCanvas(svgElement);
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const api = (window as any).electronAPI;
      if (api && api.saveFileAs) {
        await api.saveFileAs(dataUrl, 'diagram.png', '', [{ name: 'PNG Image', extensions: ['png'] }]);
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'diagram.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('이미지 저장 실패:', err);
    }
  };

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
      
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const cacheKey = `clean-v3|${code}|${isDark ? 'dark' : 'light'}`;
    const cachedSvg = mermaidSvgCache.get(cacheKey);
    if (cachedSvg) {
      setSvgHtml(cachedSvg);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    const debounceTimer = setTimeout(() => {
      const renderChart = async () => {
        const mermaidObj = await loadMermaidScript();
        if (!mermaidObj) {
          if (active && mermaidRetryRef.current < 3) {
            mermaidRetryRef.current++;
            mermaidRetryTimerRef.current = setTimeout(renderChart, 3000);
          } else if (active) {
            setError('Mermaid 라이브러리를 로드하지 못했습니다.');
            setLoading(false);
          }
          return;
        }
        mermaidRetryRef.current = 0;

        const renderId = `mermaid-temp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        let cleanCode = code;
        
        try {
          cleanCode = cleanCode
            .replace(/```mermaid\s*/gi, '')
            .replace(/```\s*$/gi, '')
            .replace(/```/g, '');
        } catch (_) {}

        try {
          cleanCode = cleanCode
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
        } catch (_) {}

        try {
          cleanCode = cleanCode
            .replace(/\u00a0/g, ' ')
            .replace(/\r/g, '')
            .replace(/^class\s+\S+\s+\S+;/gm, (m) => m.slice(0, -1))
            .replace(/--([^-<>]+)-->/g, '-- $1 -->')
            .replace(/==([^=<>]+)==>/g, '== $1 ==>')
            .replace(/subgraph\s+([^"\n\r]+)$/gm, (match, title) => {
              const trimmed = title.trim();
              if (trimmed.startsWith('"') || trimmed.startsWith('\'') || trimmed.match(/^(TB|TD|BT|RL|LR)$/i)) {
                return match;
              }
              return `subgraph "${trimmed}"`;
            });
        } catch (_) {}

        try {
          const lines = cleanCode.split('\n');
          const fixedLines = lines.map(line => {
            let l = line.trimRight();
            if (l.match(/(-->|==>|-\.-\>)\s*(\|[^|]*\|)?\s*\)$/)) {
              l = l.replace(/\s*\)$/, '');
            }
            if (l.endsWith('-->') || l.endsWith('==>') || l.endsWith('-.->')) {
              l = l + ' temp["..."]';
            }
            return line.endsWith('\n') ? l + '\n' : l;
          });
          cleanCode = fixedLines.join('\n');
        } catch (_) {}

        try {
          cleanCode = cleanCode.replace(/"([^"]*)"/g, (match, p1) => {
            const sanitized = p1
              .replace(/\[/g, '［')
              .replace(/\]/g, '］')
              .replace(/\(/g, '（')
              .replace(/\)/g, '）');
            return `"${sanitized}"`;
          });
        } catch (_) {}

        try {
          cleanCode = cleanCode.replace(/\[([^\]\n]*?)\(([^\]\n]*?)\)([^\]\n]*?)\]/g, (match, p1, p2, p3) => {
            return `[${p1}（${p2}）${p3}]`;
          });
        } catch (_) {}

        try {
          cleanCode = cleanCode.replace(/(\[|{|{|\(|=>)\s*([^\]\)\n\"\'`]*?)([\/\:\;\*\&]+)([^\]\)\n\"\'`]*?)\s*(\]|}|\)|=>)/g, (match, open, prefix, invalidChar, suffix, close) => {
            const safeMid = (prefix + invalidChar + suffix).replace(/[\/\:\;\*\&]/g, ' ');
            return `${open}${safeMid}${close}`;
          });
        } catch (_) {}

        try {
          cleanCode = cleanCode.replace(/<br\s*\/?>/gi, '\\n');
        } catch (_) {}

        try {
          let isValid = false;
          let parserErrorMsg = '';
          try {
            const parseResult = mermaidObj.parse(cleanCode);
            if (parseResult instanceof Promise) {
              await parseResult;
            }
            isValid = true;
          } catch (parseErr: any) {
            console.error('[Onrivi Author] Mermaid parse error:', parseErr);
            parserErrorMsg = parseErr?.message || String(parseErr);
            isValid = false;
          }

          if (!isValid) {
            if (active) {
              setError(`🎨 Onrivi Author: 다이어그램 문법을 입력하는 중이거나 문법이 불완전합니다. (${parserErrorMsg.substring(0, 150)})`);
              setLoading(false);
            }
            return;
          }

          mermaidObj.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'base',
            themeVariables: isDark ? undefined : { primaryColor: '#eaf2ff', primaryTextColor: '#3155a5', primaryBorderColor: '#d4dce8', lineColor: '#8b929b', secondaryColor: '#f3f6fc', tertiaryColor: '#ffffff', fontFamily: 'Pretendard, Noto Sans KR, Arial, sans-serif', fontSize: '16px' },
            flowchart: { defaultRenderer: 'elk', curve: 'basis', nodeSpacing: 48, rankSpacing: 72, padding: 20, htmlLabels: true },
            themeCSS: '.node rect { rx:16px; ry:16px; } .nodeLabel { font-weight:600; }',
            securityLevel: 'loose',
            suppressErrors: true,
          });

          const { svg } = await mermaidObj.render(renderId, cleanCode);
          if (active) {
            mermaidSvgCache.set(cacheKey, svg);
            setSvgHtml(svg);
            setLoading(false);
          }
        } catch (err: any) {
          console.warn('[Onrivi Author] Mermaid 렌더링 실패 가드 가동', err);
          if (active) {
            setError('🎨 Onrivi Author: 다이어그램을 렌더링하지 못했습니다. 코드와 렌더링 오류를 확인해 주세요.');
            setLoading(false);
          }
          const badEl = document.getElementById(renderId);
          if (badEl) badEl.remove();
        }
      };

      renderChart();
    }, 300);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
      if (mermaidRetryTimerRef.current) {
        clearTimeout(mermaidRetryTimerRef.current);
        mermaidRetryTimerRef.current = null;
      }
    };
  }, [code, isDark]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(`\`\`\`mermaid\n${code}\n\`\`\``);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <div ref={containerRef} data-line={dataLine} data-export-state={error ? "error" : loading ? "loading" : "ready"} className="relative group onrivi-media-actions-frame my-6 border border-zinc-200/60 rounded-lg overflow-hidden shadow-sm bg-white select-text">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-200/60">
        <span className="text-xs font-semibold text-zinc-500 break-words min-w-0 flex items-center gap-1.5">
          📊 다이어그램 (Mermaid)
        </span>
        <div className="no-print flex flex-wrap items-center gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-150" data-editor-controls>
          <button
            onClick={handleCopyCode}
            className="onrivi-media-control"
            title={copied ? '코드 복사됨' : '마크다운 소스 복사'}
            aria-label="코드 복사"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            )}
          </button>
          {!error && !loading && (
            <>
              <button
                onClick={openInNewWindow}
                className="onrivi-media-control"
                title="다이어그램을 새 웹브라우저 창으로 크게 보기"
                aria-label="새 창으로 확대"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </button>
              <button
                onClick={handleCopyImage}
                className="onrivi-media-control"
                title={imageCopied ? '이미지 복사됨' : '차트 이미지를 클립보드에 복사해 워드나 한글에 바로 붙여넣기'}
                aria-label="이미지 복사"
              >
                {imageCopied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
              </button>
              <button
                onClick={handleSaveImage}
                className="onrivi-media-control"
                title="차트를 PNG 파일로 저장"
                aria-label="저장"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </button>
            </>
          )}
        </div>
      </div>
      <div className="p-6 flex flex-col justify-center items-center overflow-x-auto min-h-[100px]">
        {loading && <div className="text-sm text-zinc-400 flex items-center gap-2">🔄 차트를 렌더링하는 중...</div>}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-4 w-full font-mono">
            <div className="flex items-center justify-between border-b border-red-200/55 pb-2 mb-2">
              <span className="font-semibold flex items-center gap-1">⚠️ 렌더링 에러</span>
              <button 
                onClick={() => setShowRaw(!showRaw)}
                className="text-[10px] px-2 py-0.5 rounded bg-white border border-red-300 text-red-700 hover:bg-red-100/50 cursor-pointer transition-all active:scale-95"
              >
                {showRaw ? '코드 접기' : '코드 원본 보기'}
              </button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{error}</div>
            
            {showRaw && (
              <div className="mt-3 p-3 bg-zinc-900 text-zinc-300 rounded border border-zinc-800 text-xs overflow-x-auto select-all max-h-[250px]">
                {code}
              </div>
            )}
          </div>
        )}
        {!loading && !error && (
          <div 
            onDoubleClick={openInNewWindow}
            title="더블클릭하면 새 웹브라우저 창으로 크게 확대해서 볼 수 있습니다."
            className="w-full flex justify-center mermaid-svg-container cursor-zoom-in"
            dangerouslySetInnerHTML={{ __html: svgHtml }} 
          />
        )}
      </div>
    </div>
  );
});

export default MermaidBlock;
