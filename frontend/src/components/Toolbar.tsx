// ====================================================================
// 📊 [OMD-EDIT-Toolbar-0003] Toolbar.tsx ➔ Toolbar
// 🎯 @KICK  : 에디터 우측 사이드바 툴바 - 홈, 대시보드, 지식베이스, 서식, 참조, 환경설정 퀵 액션 제공
// 🛡️ @GUARD : 라이선스 및 뷰포트 상태에 따른 프로덕티비티 도구 조건부 노출
// 🚨 @PATCH : **2026-10-19** — [자체 이모지 모달 제거 및 OS 네이티브 이모지 입력기(Windows/Mac) 호출로 전환]:
//             자체 커스텀 EmojiPanel 모달을 폐지하고, 툴바 이모지 버튼 클릭 시 OS 네이티브 이모지 피커(electronAPI.showEmojiPicker)가 즉각 팝업되도록 개편
// 🚨 @PATCH : **2026-10-04** — [우측 툴바 지식 베이스 아이콘 커스텀 PNG 연동] 지식 베이스 버튼 아이콘을 Icon(HeadCircuit) 컴포넌트에서 frontend/public/icons/HeadCircuit.png 원본 이미지로 교체 (dark:invert 적용)
// 🚨 @PATCH : **2026-10-02** — [우측 툴바 이모지 보관함 퀵 버튼 추가] Toolbar 생산성 도구에 Smile 이모지 보관함 토글 버튼 연동 및 활성 상태 하이라이트 적용
// 🚨 @PATCH : **2026-09-28** — 제한사용자 툴바에서 서식관리·참조파일 조작을 비활성화하고 이동·설정·로그아웃 유지
//             **2026-09-23** — [툴바 CubeFocus 아이콘 고대비 선명화] 반투명(opacity-75) 제거하여 100% 완전 불투명하고 선명하게 표시
// 🚨 @PATCH : **2026-09-23** — [플로팅 서식 툴바 아이콘 커스텀 PNG 연동] CubeFocus 아이콘을 frontend/public/icons/CubeFocus.png 원본 이미지로 연동 (dark:invert 적용)
//             **2026-09-20** — [툴바 크기 확대 + CubeFocus 재교체] 전체 버튼 w-8→w-10, icon 16→20px 확대. CubeFocus를 BoxSelect(점선)에서 PackageSearch(큐브+돋보기)로 재교체
//             **2026-09-20** — [플로팅툴바 아이콘 교체] 플로팅 서식 툴바 켜기/끄기 버튼을 FloatingToolbar→CubeFocus(BoxSelect)로 교체
//             **2026-09-20** — [툴바 아이콘 색상 통일] 슬래시 빠른명령어(amber→zinc), 참조파일관리(amber→zinc) 색상을 나머지 툴바 아이콘과 동일하게 통일
//             **2026-09-20** — [툴바 아이콘 3종 교체] 슬래시 빠른명령어(SlashCommand→TerminalWindow), 참조파일관리(Book→NewspaperClipping), 지식베이스(Library→HeadCircuit)
//             **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(Settings) 제거 및 이모지 버튼(🎈⚡🔠🏛️🎨📚🚪)을 Icon 컴포넌트로 교체. 홈 이미지 버튼(./icon.png)은 메인페이지 이동 버튼이므로 변경 제외.
//             **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: 우측 툴바의 지식 베이스 전환 버튼(🏛️)을 isDesktop 전용으로 한정하여 웹 브라우저 UI 슬림화
//             **2026-09-05** — 제한모드(isRestrictedUser) 시 우측 툴바의 지식 베이스 전환 버튼(🏛️) 비활성화(disabled, opacity-30, grayscale, 안내 툴팁 및 토스트) 적용
//             **2026-09-05** — AI 미연결(!geminiApiKey) 시 우측 툴바의 지식 베이스 전환 버튼(🏛️) 비활성화(disabled, 흐린 흑백 스타일, 연동 안내 툴팁/토스트) 적용
//             **2026-09-04** — 우측 툴바의 지식 베이스 아이콘을 🏛️로 변경 연동 (클릭 시 app:open-knowledge-manager 이벤트 디스패치)
// 🔗 @CALLS : useEditorContext, useRouter
// ====================================================================
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEditorContext } from '@/context/EditorContext';
import { Icon } from '@/components/icons/Icon';

function openExternal(url: string) {
  if ((window as any).electronAPI?.openExternal) {
    (window as any).electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

export default function Toolbar({ documentEditing = false }: { documentEditing?: boolean }) {
  const { dispatchCommand: dispatch, previewMode, isExpired, activeTabId, geminiApiKey, showToast, isRestrictedUser } = useEditorContext();
  const router = useRouter();
  const showProductivity = (previewMode !== 'preview' || documentEditing) && !isExpired && !isRestrictedUser && activeTabId;

  return (
    <div className="flex flex-col items-center gap-2 pb-1 mt-auto">
      
      {/* 생산성 단축 도구 (미리보기 모드/라이선스 만료 시 숨김/문서 열려있을때만) */}
      {showProductivity && (
        <>
          <button
            onMouseDown={(e) => { e.preventDefault(); dispatch('TOGGLE_EMOJI_PANEL'); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 transition-all"
            title="이모지"
            aria-label="이모지 패널 열기"
          >
            <Icon name="Smile" size={20} className="text-zinc-500 dark:text-zinc-400" />
          </button>



          <button
            onMouseDown={(e) => { e.preventDefault(); dispatch('TOGGLE_FLOATING_TOOLBAR'); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            title="플로팅 서식 툴바 켜기/끄기"
          >
            <img 
              src="./icons/CubeFocus.png" 
              alt="플로팅 서식 툴바" 
              className="w-5 h-5 object-contain dark:invert" 
            />
          </button>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); dispatch('SLASH_COMMAND'); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            title="슬래시(/) 빠른 명령어 호출"
          >
            <Icon name="TerminalWindow" size={20} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </>
      )}

      {/* 🏠 홈 버튼 — 메인페이지 이동 (이미지 버튼 변경 제외) */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          const isDesktop = typeof window !== "undefined" && (
            !!(window as any).electronAPI || 
            navigator.userAgent.toLowerCase().includes('electron') ||
            new URLSearchParams(window.location.search).get('env') === 'desktop'
          );
          if (isDesktop) {
            openExternal('https://onrivi.com/');
          } else {
            router.push('/');
          }
        }}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        title="Onrivi Author 홈으로"
      >
        <img src="./icon.png" alt="Onrivi" className="w-5 h-5 object-contain" />
      </button>

      <button 
        onMouseDown={(e) => {
          e.preventDefault();
          const isDesktop = typeof window !== "undefined" && (
            !!(window as any).electronAPI || 
            navigator.userAgent.toLowerCase().includes('electron') ||
            new URLSearchParams(window.location.search).get('env') === 'desktop'
          );
          if (isDesktop) {
            openExternal('https://onrivi.com/dashboard');
          } else {
            router.push('/dashboard');
          }
        }}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        title="대시보드 이동"
      >
        <Icon name="Dashboard" size={20} className="text-zinc-500 dark:text-zinc-400" />
      </button>

      {/* 지식 베이스 화면 전환 (데스크톱 전용 기능) */}
      {(() => {
        const isDesktop = typeof window !== "undefined" && (
          !!(window as any).electronAPI || 
          navigator.userAgent.toLowerCase().includes('electron') ||
          new URLSearchParams(window.location.search).get('env') === 'desktop'
        );
        if (!isDesktop) return null;

        const isKnowledgeDisabled = Boolean(isRestrictedUser || !geminiApiKey);
        const disabledReasonTitle = isRestrictedUser
          ? "🔒 읽기 전용(제한사용자) 모드에서는 지식 베이스 화면으로 이동할 수 없습니다."
          : (!geminiApiKey ? "지식 베이스 화면 전환 (AI 연동 필요)" : "지식 베이스 화면으로 전환 (Ctrl+Shift+K)");

        return (
          <button
            disabled={isKnowledgeDisabled}
            onMouseDown={(e) => {
              e.preventDefault();
              if (isRestrictedUser) {
                showToast?.("🔒 읽기 전용(제한사용자) 모드에서는 지식 베이스 화면으로 이동할 수 없습니다. 상단 '이 화면에서 편집 시작하기'를 눌러주세요.", "warning");
                return;
              }
              if (!geminiApiKey) {
                showToast?.('지식 엔진을 사용하려면 환경설정에서 Gemini API Key를 먼저 등록해 주세요.', 'warning');
                return;
              }
              window.dispatchEvent(new CustomEvent('app:open-knowledge-manager'));
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              isKnowledgeDisabled
                ? 'opacity-30 cursor-not-allowed grayscale text-zinc-400 dark:text-zinc-600'
                : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
            }`}
            title={disabledReasonTitle}
          >
            <img
              src="./icons/HeadCircuit.png"
              alt="지식 베이스"
              className="w-5 h-5 object-contain dark:invert"
            />
          </button>
        );
      })()}

      <button
        disabled={isRestrictedUser}
        onMouseDown={(e) => { e.preventDefault(); dispatch('TOGGLE_CSS_STYLE'); }}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isRestrictedUser ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title={isRestrictedUser ? '제한사용자는 서식관리를 사용할 수 없습니다.' : '서식관리'}
      >
        <Icon name="Palette" size={20} className="text-zinc-500 dark:text-zinc-400" />
      </button>

      <button
        disabled={isRestrictedUser}
        onMouseDown={(e) => { e.preventDefault(); dispatch('ADD_REFERENCE'); }}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isRestrictedUser ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        title={isRestrictedUser ? '제한사용자는 참조 파일을 변경할 수 없습니다.' : '참조 파일 관리'}
      >
        <Icon name="NewspaperClipping" size={20} className="text-zinc-500 dark:text-zinc-400" />
      </button>

      <button 
        onMouseDown={(e) => { e.preventDefault(); dispatch('SETTINGS'); }}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        title="환경 설정"
      >
        <Icon name="Settings" size={20} className="text-zinc-500 dark:text-zinc-400" />
      </button>

      <div className="w-5 h-px bg-zinc-300 dark:bg-zinc-600/60 my-1" />

      {!((window as any).electronAPI) && (
        <button 
          onMouseDown={(e) => { e.preventDefault(); dispatch('EXIT'); }}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
          title="로그아웃"
        >
          <Icon name="LogOut" size={20} className="text-zinc-500 dark:text-zinc-400" />
        </button>
      )}
    </div>
  );
}
