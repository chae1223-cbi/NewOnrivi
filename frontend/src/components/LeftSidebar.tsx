/**
 * ====================================================================
 * 🏷️ 파일명 : LeftSidebar.tsx
 * 🎭 역할(Role) : Layout (구조 래퍼 — 좌측 사이드바 탭 전환 및 너비 조절 컨테이너)
 * 🎯 주요기능 : 사이드바 너비 리사이징, 탭(탐색기/개요/검색) 전환 제어 및 하위 패널(FileExplorerPanel, OutlinePanel, GlobalSearchPanel) 렌더링 위임
 * 🚨 @PATCH : 2026-11-04 — [LeftSidebar 3,809줄 모듈화 분리 & 주석 표준화]
 *             1) 3,809줄의 단일 거대 컴포넌트를 규칙 3에 맞춰 Layout/Container 컴포넌트로 슬림화 및 2단계 주석 적용
 *             2) 파일 탐색기(FileExplorerPanel), 개요 목차(OutlinePanel), 전역 검색(GlobalSearchPanel)을 독립 패널 컴포넌트로 분리
 *             3) 사이드바 너비 조절 리사이저 바(12px 스크롤바 방어) 및 탭 전환 상태는 LeftSidebar에서 중앙 제어
 * ====================================================================
 */
// @ts-nocheck
"use client";

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useEditorContext } from '@/context/EditorContext';
import { Icon } from '@/components/icons/Icon';
import FileExplorerPanel from '@/components/sidebar/FileExplorerPanel';
import OutlinePanel from '@/components/sidebar/OutlinePanel';
import GlobalSearchPanel from '@/components/sidebar/GlobalSearchPanel';

/**
 * ========================================================================================
 * [컴포넌트명] LeftSidebar - 에디터 좌측 사이드바 프레임 및 탭 스위처 컴포넌트
 *
 * @returns {JSX.Element | null} 좌측 사이드바 영역 또는 닫힌 상태일 때 null
 * ==========================================================================================
 */
export default function LeftSidebar() {
  const { isDarkMode, setIsSearchOpen } = useEditorContext();
  const { 
    isSidebarOpen, 
    sidebarWidth, 
    setSidebarWidth,
    sidebarTab,
    setSidebarTab 
  } = useUIStore();

  if (!isSidebarOpen) return null;

  return (
    <aside 
      style={{ 
        width: sidebarWidth,
        fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif",
      }} 
      className="flex flex-col shrink-0 min-w-[180px] max-w-[450px] border-r border-slate-300 dark:border-zinc-700 select-none relative z-10 bg-sidebar-luxury text-on-surface shadow-sm"
    >
      {/* 탭 헤더 (Modern Technical Editorial - Cobalt Authority & Hairline) */}
      <div className="h-10 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center px-2 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md justify-between">
        <div className="flex gap-1.5 w-full">
          <button
            onClick={() => {
              setSidebarTab('explorer');
              setIsSearchOpen?.(false);
            }}
            className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              sidebarTab === 'explorer' 
                ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icon name="Explorer" size={13} strokeWidth={2.2} />
            <span>탐색기</span>
          </button>
          <button
            onClick={() => {
              setSidebarTab('toc');
              setIsSearchOpen?.(false);
            }}
            className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              sidebarTab === 'toc' 
                ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icon name="Toc" size={13} strokeWidth={2.2} />
            <span>개요</span>
          </button>
          <button
            onClick={() => {
              setSidebarTab('search');
              setIsSearchOpen?.(true);
              // 검색어 입력창 자동 포커스 이벤트 발송
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('onrivi:focus-global-search'));
              }, 50);
            }}
            className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              sidebarTab === 'search' 
                ? 'bg-[#1d4ed8] text-white shadow-xs font-black' 
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icon name="Search" size={13} strokeWidth={2.2} />
            <span>검색</span>
          </button>
        </div>
      </div>

      {/* 탭 바디 — 독립 패널 위임 (Core 영역) */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <FileExplorerPanel isActive={sidebarTab === 'explorer'} isDarkMode={isDarkMode} />
        <OutlinePanel isActive={sidebarTab === 'toc'} />
        <GlobalSearchPanel isActive={sidebarTab === 'search'} isDarkMode={isDarkMode} />
      </div>

      {/* 크기 조절 드래그 바 (스크롤바 100% 최우선 보장: 사이드바 내부 12px 스크롤바 침범 방지 및 경계선 외곽 배치) */}
      <div 
        className="absolute top-0 left-[calc(100%-1px)] w-2.5 h-full cursor-col-resize z-20 group flex items-stretch justify-start"
        title="사이드바 너비 조절"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          const doDrag = (moveEvent: MouseEvent) => {
            setSidebarWidth(Math.max(180, Math.min(450, startWidth + (moveEvent.clientX - startX))));
          };
          const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
          };
          document.addEventListener('mousemove', doDrag);
          document.addEventListener('mouseup', stopDrag);
        }}
      >
        {/* 호버/드래그 시 경계선 위에만 단정하게 표시되는 2px 코발트 인디케이터 라인 */}
        <div className="w-[2px] h-full bg-transparent group-hover:bg-[#1d4ed8] group-active:bg-[#1d4ed8] transition-colors duration-150" />
      </div>
    </aside>
  );
}
