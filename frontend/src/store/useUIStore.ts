// ====================================================================
// 📊 [OMD-STORE-USEUISTORE-0001] useUIStore.ts ➔ useUIStore
// 🎯 @KICK  : 에디터 전역 UI 레이아웃 상태(사이드바, 툴바, 테마 팔레트, 탭) 관리
// 🚨 @PATCH : **2026-10-13** — [에디터 시작 시 좌측 탐색기 상시 펼침 초기화]: 에디터 시작 시 로컬 스토리지의 이전 닫힘 여부와 무관하게 왼쪽 탐색기(isSidebarOpen: true, sidebarTab: 'explorer')가 항상 펼쳐진 상태로 시작하도록 수정
// ====================================================================
import { create } from 'zustand';

interface UIState {
  // 상태 변수
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  isToolbarOpen: boolean;
  themePalette: string;
  sidebarWidth: number;
  sidebarTab: 'explorer' | 'search' | 'toc';

  // Setter 함수
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsToolbarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setThemePalette: (val: string) => void;
  setSidebarWidth: (val: number | ((prev: number) => number)) => void;
  setSidebarTab: (val: 'explorer' | 'search' | 'toc') => void;
}

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태 - 에디터 시작 시 왼쪽 탐색기는 항상 펼침 유지
  isDarkMode: false,
  isSidebarOpen: true,
  isToolbarOpen: typeof window !== 'undefined' ? localStorage.getItem('onrivi_toolbar_open') === 'true' : false,
  themePalette: 'vs-dark',
  sidebarWidth: 300,
  sidebarTab: 'explorer',

  // 액션 - 설정 시 로컬 스토리지에 즉시 동기화
  setIsDarkMode: (val) => set((state) => ({ 
    isDarkMode: typeof val === 'function' ? val(state.isDarkMode) : val 
  })),
  setIsSidebarOpen: (val) => set((state) => {
    const nextVal = typeof val === 'function' ? val(state.isSidebarOpen) : val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('onrivi_sidebar_open', String(nextVal));
    }
    return { isSidebarOpen: nextVal };
  }),
  setIsToolbarOpen: (val) => set((state) => {
    const nextVal = typeof val === 'function' ? val(state.isToolbarOpen) : val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('onrivi_toolbar_open', String(nextVal));
    }
    return { isToolbarOpen: nextVal };
  }),
  setThemePalette: (val) => set({ themePalette: val }),
  setSidebarWidth: (val) => set((state) => ({ 
    sidebarWidth: typeof val === 'function' ? val(state.sidebarWidth) : val 
  })),
  setSidebarTab: (val) => set({ sidebarTab: val }),
}));
