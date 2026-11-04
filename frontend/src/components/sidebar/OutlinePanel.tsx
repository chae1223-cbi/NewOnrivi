/**
 * ====================================================================
 * 🏷️ 파일명 : OutlinePanel.tsx
 * 🎭 역할(Role) : Core (핵심 도메인 뷰 — 마크다운 문서 개요/목차 트리 패널)
 * 🎯 주요기능 : 마크다운 문서의 헤딩(H1~H6) 구조를 트리 목차로 시각화하고 미리보기 스크롤 추적 및 양방향 점프 제공
 * 🚨 @PATCH : 2026-11-04 — [LeftSidebar 모듈화 분리 & 주석 표준화] LeftSidebar에서 개요(TOC) 렌더링, 계층 접기/펼치기, 스크롤 추적, 헤딩 점프 로직을 독립 패널 컴포넌트로 분리 및 2단계 주석 적용 (규칙 3 Core 역할 준수)
 * ====================================================================
 */
// @ts-nocheck
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditorContext } from '@/context/EditorContext';

interface OutlinePanelProps {
  isActive: boolean;
}

/**
 * ========================================================================================
 * [컴포넌트명] OutlinePanel - 좌측 사이드바 마크다운 개요(TOC) 트리 패널
 *
 * @param {OutlinePanelProps} props - 탭 활성화 여부(isActive)
 * @returns {JSX.Element} 개요(TOC) 패널 뷰
 * ==========================================================================================
 */
export default function OutlinePanel({ isActive }: OutlinePanelProps) {
  const {
    content,
    editorRef,
    previewRef,
    toc = [],
    scrollToLine,
    isScrollingRef,
    scrollTimeoutRef,
    previewMode,
    setPreviewMode
  } = useEditorContext();

  const [collapsedH1s, setCollapsedH1s] = useState<Record<string, boolean>>({});
  const [activeTocId, setActiveTocId] = useState<string>('');
  const tocContainerRef = useRef<HTMLDivElement>(null);

  // 📝 미리보기(Preview) 스크롤 시 현재 뷰포트에 보이는 헤딩을 감지하여 활성 목차(TOC) 자동 동기화
  useEffect(() => {
    const previewContainer = previewRef?.current;
    if (!previewContainer || !toc || toc.length === 0) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerTop = previewContainer.getBoundingClientRect().top;
        let foundId = '';

        // 아래에서 위로 검색하여 현재 뷰포트 상단 영역에 가장 가까운 헤딩 탐색
        for (let i = toc.length - 1; i >= 0; i--) {
          const item = toc[i];
          let el = document.getElementById(item.id);
          if (!el && previewContainer) {
            const headings = Array.from(previewContainer.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
            const cleanTarget = (item.text || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
            el = headings.find(h => {
              const tagLevel = parseInt(h.tagName.replace(/^H/i, ''), 10);
              const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
              return (tagLevel === item.level || !item.level) && (hText === cleanTarget || (cleanTarget.length > 2 && hText.includes(cleanTarget)));
            }) || null;
            if (!el) {
              el = headings.find(h => {
                const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                return hText === cleanTarget || (cleanTarget.length > 2 && (hText.includes(cleanTarget) || cleanTarget.includes(hText)));
              }) || null;
            }
            if (!el && typeof i === 'number' && headings[i]) {
              el = headings[i];
            }
          }
          if (el) {
            const rect = el.getBoundingClientRect();
            // 약간의 오프셋(예: 150px)을 주어 제목이 상단에 닿기 직전에 하이라이트되도록 함
            if (rect.top - containerTop <= 150) {
              foundId = toc[i].id;
              break;
            }
          }
        }
        
        // 스크롤이 맨 위에 있어서 어떤 헤딩도 조건을 만족하지 않으면 첫 번째 헤딩 활성화
        if (!foundId && toc.length > 0) {
          foundId = toc[0].id;
        }

        if (foundId && foundId !== activeTocId) {
          setActiveTocId(foundId);

          // 활성화된 헤딩의 부모들을 모두 펼침 (Auto-expand)
          const activeIndex = toc.findIndex((t: any) => t.id === foundId);
          if (activeIndex >= 0) {
            const activeLevel = toc[activeIndex].level;
            let parentH1Id = '';
            let parentH2Id = '';
            let parentH3Id = '';
            for (let i = activeIndex - 1; i >= 0; i--) {
              const item = toc[i];
              if (item.level === 1 && !parentH1Id) parentH1Id = item.id;
              if (item.level === 2 && !parentH2Id && !parentH1Id) parentH2Id = item.id;
              if (item.level === 3 && !parentH3Id && !parentH2Id && !parentH1Id) parentH3Id = item.id;
              if (parentH1Id && parentH2Id && parentH3Id) break;
            }

            setCollapsedH1s(prev => {
              const next = { ...prev };
              let changed = false;

              if (parentH1Id && next[parentH1Id] === true) {
                next[parentH1Id] = false;
                changed = true;
              }
              if (parentH2Id && next[parentH2Id] !== false) {
                next[parentH2Id] = false;
                changed = true;
              }
              if (parentH3Id && next[parentH3Id] !== false) {
                next[parentH3Id] = false;
                changed = true;
              }

              if (activeLevel === 1 && next[foundId] === true) {
                next[foundId] = false;
                changed = true;
              } else if (activeLevel >= 2 && activeLevel <= 3 && next[foundId] !== false) {
                next[foundId] = false;
                changed = true;
              }

              return changed ? next : prev;
            });
          }
        }
      });
    };

    previewContainer.addEventListener('scroll', handleScroll, { passive: true });
    // 초기 렌더링 시 스크롤 위치 계산
    handleScroll();

    return () => {
      previewContainer.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [toc, previewRef, activeTocId]);

  // 📝 활성화된 개요(TOC) 항목이 화면 밖으로 벗어날 경우 개요 탭 목록 컨테이너 자동 스크롤 동기화
  useEffect(() => {
    if (!activeTocId || !isActive || !tocContainerRef.current) return;

    const activeItem = tocContainerRef.current.querySelector(`#toc-item-${activeTocId}`);
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest' // 💡 화면에 이미 보이면 대기, 화면 밖 이탈 시에만 부드럽게 복구
      });
    }
  }, [activeTocId, isActive]);

  return (
    <div 
      ref={tocContainerRef}
      className={`flex-1 overflow-y-auto [scrollbar-gutter:stable] explorer-scrollbar p-2 ${!isActive ? 'hidden' : ''}`}
    >
      <div className="space-y-0 text-[12px] font-bold">
        {!toc || toc.length === 0 ? (
          <div className="text-zinc-400 dark:text-zinc-500 text-center py-5">목차가 없습니다.</div>
        ) : (() => {
          let currentH1Id = '';
          let currentH2Id = '';
          let currentH3Id = '';
          const processedToc = toc.map((item: any) => {
            if (item.level === 1) {
              currentH1Id = item.id;
              currentH2Id = '';
              currentH3Id = '';
              return { ...item, parentH1Id: '', parentH2Id: '', parentH3Id: '' };
            } else if (item.level === 2) {
              currentH2Id = item.id;
              currentH3Id = '';
              return { ...item, parentH1Id: currentH1Id, parentH2Id: '', parentH3Id: '' };
            } else if (item.level === 3) {
              currentH3Id = item.id;
              return { ...item, parentH1Id: currentH1Id, parentH2Id: currentH2Id, parentH3Id: '' };
            } else {
              return { ...item, parentH1Id: currentH1Id, parentH2Id: currentH2Id, parentH3Id: currentH3Id };
            }
          });

          return processedToc.map((item: any, i: number) => {
            let isCollapsed = false;

            if (item.level === 2) {
              if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                isCollapsed = true;
              }
            } else if (item.level === 3) {
              if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                isCollapsed = true;
              } else if (item.parentH2Id && collapsedH1s[item.parentH2Id] === true) {
                isCollapsed = true;
              }
            } else if (item.level >= 4) {
              if (item.parentH1Id && collapsedH1s[item.parentH1Id] === true) {
                isCollapsed = true;
              } else if (item.parentH2Id && collapsedH1s[item.parentH2Id] === true) {
                isCollapsed = true;
              } else if (item.parentH3Id && collapsedH1s[item.parentH3Id] === true) {
                isCollapsed = true;
              }
            }

            if (isCollapsed) return null;

            const hasH1Children = item.level === 1 && processedToc.some((child: any) => child.level >= 2 && child.parentH1Id === item.id);
            const hasH2Children = item.level === 2 && processedToc.some((child: any) => child.level >= 3 && child.parentH2Id === item.id);
            const hasH3Children = item.level === 3 && processedToc.some((child: any) => child.level >= 4 && child.parentH3Id === item.id);

            return (
              <div 
                key={i} 
                id={`toc-item-${item.id}`} // 💡 자동 스크롤 동기화 추적용 ID
                style={{ paddingLeft: `${(item.level - 1) * 8}px` }}
                className={`cursor-pointer py-0.5 px-1.5 rounded-md transition-all truncate flex items-center gap-1 ${
                  activeTocId === item.id 
                    ? 'bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold shadow-sm border border-blue-200 dark:border-blue-800/50' 
                    : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800/50 hover:text-blue-600 dark:hover:text-blue-400 text-zinc-600 dark:text-zinc-300 border border-transparent'
                }`}
                onClick={() => {
                  if (previewMode === 'css-style' || previewMode === 'edit') {
                    setPreviewMode?.('preview');
                  }

                  // 1. 대상 헤딩 DOM 요소 탐색 (MarkdownViewer id 또는 VisualDocumentEditor h1~h6 매핑)
                  let el: HTMLElement | null = document.getElementById(item.id);
                  if (!el && previewRef?.current) {
                    const container = previewRef.current;
                    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
                    const cleanTarget = (item.text || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                    el = headings.find(h => {
                      const tagLevel = parseInt(h.tagName.replace(/^H/i, ''), 10);
                      const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                      return (tagLevel === item.level || !item.level) && (hText === cleanTarget || (cleanTarget.length > 2 && hText.includes(cleanTarget)));
                    }) || null;
                    if (!el) {
                      el = headings.find(h => {
                        const hText = (h.textContent || '').replace(/\s+/g, '').toLowerCase().normalize('NFC');
                        return hText === cleanTarget || (cleanTarget.length > 2 && (hText.includes(cleanTarget) || cleanTarget.includes(hText)));
                      }) || null;
                    }
                    if (!el && typeof i === 'number' && headings[i]) {
                      el = headings[i];
                    }
                  }

                  // 2. 미리보기 / 문서 보기 스크롤 이동 및 펄스 하이라이트
                  if (el && previewRef?.current) {
                    const container = previewRef.current;
                    const containerRect = container.getBoundingClientRect();
                    const elRect = el.getBoundingClientRect();
                    const relativeTop = elRect.top - containerRect.top + container.scrollTop;

                    container.scrollTo({
                      top: Math.max(0, relativeTop - 30),
                      behavior: 'smooth'
                    });

                    container.querySelectorAll('.preview-highlight-line').forEach(e => e.classList.remove('preview-highlight-line'));
                    el.classList.remove('preview-highlight-line');
                    void el.offsetWidth;
                    el.classList.add('preview-highlight-line');
                    setTimeout(() => {
                      el?.classList.remove('preview-highlight-line');
                    }, 3000);
                  }

                  // 3. 문서 보기(VisualDocumentEditor) ProseMirror 커서 동기화
                  if (content && typeof item.lineNumber === 'number' && item.lineNumber > 0) {
                    const lines = content.split(/\r?\n/);
                    let offset = 0;
                    for (let l = 0; l < item.lineNumber - 1 && l < lines.length; l++) {
                      offset += lines[l].length + 1;
                    }
                    window.dispatchEvent(new CustomEvent('onrivi:source-cursor', { 
                      detail: { offset, headingText: item.text, force: true, highlight: true } 
                    }));
                  }

                  // 4. Monaco 에디터 줄 이동 (나란히 보기 동기화)
                  scrollToLine?.(item.lineNumber);
                  setActiveTocId(item.id);

                  if (isScrollingRef && scrollTimeoutRef) {
                    isScrollingRef.current = 'preview';
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => {
                      if (isScrollingRef) isScrollingRef.current = null;
                    }, 500);
                  }
                }}
              >
                {item.level === 1 ? (
                  hasH1Children ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                      }}
                      className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[7px]"
                      title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                    >
                      {collapsedH1s[item.id] === true ? '▶' : '▼'}
                    </button>
                  ) : (
                    <div className="w-3.5 h-3.5 mr-1 shrink-0" />
                  )
                ) : item.level === 2 ? (
                  hasH2Children ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                      }}
                      className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[10px]"
                      title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                    >
                      {collapsedH1s[item.id] === true ? '▶' : '▼'}
                    </button>
                  ) : (
                    <div className="w-5 h-5 mr-1 shrink-0" />
                  )
                ) : item.level === 3 ? (
                  hasH3Children ? (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setCollapsedH1s(prev => ({ ...prev, [item.id]: !prev[item.id] })); 
                      }}
                      className="mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 text-[10px]"
                      title={collapsedH1s[item.id] === true ? "펼치기" : "접기"}
                    >
                      {collapsedH1s[item.id] === true ? '▶' : '▼'}
                    </button>
                  ) : (
                    <div className="w-5 h-5 mr-1 shrink-0" />
                  )
                ) : (
                  <div className="w-5 h-5 mr-1 shrink-0" />
                )}
                <span className="truncate flex-1 font-bold">
                  {item.text}
                </span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
