// ====================================================================
// 📊 [OMD-UI-EditorLayout-0001] EditorLayout.tsx ➔ 에디터 레이아웃 뼈대 컴포넌트
// 🎯 @KICK  : 에디터 쉘(Shell), 메뉴바(MenuBar), 좌측 사이드바(LeftSidebar), 하단 상태바(StatusBar), 동시 접속 배너 및 지식 베이스 뷰의 상하좌우 골격 구조 배치
// 🛡️ @GUARD : Rule 3(역할 기반 분리)에 따라 고정적인 화면 껍데기 UI 레이아웃을 격리하고 중앙 코어 렌더링 영역을 children으로 위임 (Layout 영역)
// 🚨 @PATCH : 2026-11-04 — [MainEditorApp 모듈화 3단계]:
//             1) MainEditorApp에서 상하좌우 UI 골격(MenuBar, LeftSidebar, StatusBar, KnowledgeHubView, 동시 접속 배너)을 EditorLayout으로 분리 (Rule 3 준수)
// 🔗 @CALLS : MenuBar, LeftSidebar, StatusBar, KnowledgeHubView
// ====================================================================
// @ts-nocheck
"use client";

import React from 'react';
import MenuBar from '@/components/MenuBar';
import LeftSidebar from '@/components/LeftSidebar';
import StatusBar from '@/components/StatusBar';
import KnowledgeHubView from '@/components/knowledge/KnowledgeHubView';

export interface EditorLayoutProps {
  children: React.ReactNode;
  bottomBar?: React.ReactNode;
  mounted: boolean;
  isDarkMode: boolean;
  isDuplicateInstance: boolean;
  isEditorPlan: boolean;
  licenseStatus: any;
  isTakingOver: boolean;
  handleTakeover: () => void;
  activeMainView: string;
  setActiveMainView: (view: string) => void;
  resourceFolder: any;
  resourceFolderHandle: any;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  aiModelName: string;
  setAiModelName: (model: string) => void;
  fileList: any[];
}

export default function EditorLayout({
  children,
  bottomBar,
  mounted,
  isDarkMode,
  isDuplicateInstance,
  isEditorPlan,
  licenseStatus,
  isTakingOver,
  handleTakeover,
  activeMainView,
  setActiveMainView,
  resourceFolder,
  resourceFolderHandle,
  geminiApiKey,
  setGeminiApiKey,
  aiModelName,
  setAiModelName,
  fileList
}: EditorLayoutProps) {
  return (
    <div className={`onrivi-editor-shell flex h-screen overflow-hidden flex-col text-on-surface ${mounted && isDarkMode ? 'dark' : ''} bg-surface relative`}>
      {/* 🛡️ 동일 브라우저 다중 탭 또는 다른 브라우저/기기 동시 접속 시 - 비차단형 제한사용자 안내 배너 */}
      {((isDuplicateInstance && isEditorPlan) || (licenseStatus?.isConcurrentLimited && (licenseStatus?.hasEditorSubscription || isEditorPlan))) && activeMainView !== 'knowledge' && (
        <aside aria-label="동시 접속 제한 모드 안내" className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 z-50 shrink-0 select-none">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base leading-none">⚠️</span>
            <span>
              {isDuplicateInstance ? (
                <>다른 탭에서 Onrivi 에디터가 이미 실행 중이므로 현재 화면은 <strong>읽기 전용(제한사용자)</strong> 모드로 동작합니다.</>
              ) : (
                <>다른 브라우저나 기기에서 Onrivi 에디터가 이미 사용 중이어서 현재 화면은 <strong>읽기 전용(제한사용자)</strong> 모드로 열렸습니다.</>
              )}
            </span>
          </div>
          <button
            type="button"
            disabled={isTakingOver}
            onClick={handleTakeover}
            className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#05b34c] text-white font-extrabold rounded-lg shadow-xs transition-colors cursor-pointer border-none shrink-0 ml-4 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            {isTakingOver ? '편집 권한 전환 중...' : '이 화면에서 편집 시작하기'}
          </button>
        </aside>
      )}

      {/* 🧠 지식 베이스(KnowledgeHubView) 인라인 오버레이 (에디터 DOM 언마운트 없이 영구 보존, z-[150]으로 에디터 UI 완벽 격리) */}
      {activeMainView === 'knowledge' && (
        <div className="absolute inset-0 z-[150] flex flex-col bg-[#FAFBFC] dark:bg-[#121316]">
          <KnowledgeHubView 
            initialTab="dashboard"
            resourceFolder={resourceFolder}
            resourceFolderHandle={resourceFolderHandle}
            geminiApiKey={geminiApiKey}
            onSaveApiKey={setGeminiApiKey}
            planCode="ELITEPRO"
            aiModelName={aiModelName}
            onSaveModelName={setAiModelName}
            fileTreeNodes={fileList}
            isStandalonePage={false}
            onBackToEditor={() => setActiveMainView('editor')}
          />
        </div>
      )}

      {/* 상단 메뉴바 */}
      <div className={activeMainView === 'knowledge' ? 'hidden' : 'contents'}>
        <MenuBar />
      </div>

      {/* 에디터 메인 바디 (좌측 탐색기 + 중앙 편집 영역 + 우측 툴바) */}
      <div className="flex flex-1 overflow-hidden relative">
        <LeftSidebar />
        {children}
      </div>

      {/* 하단 보조 툴바 (InlineAIAssistant 등) */}
      {bottomBar}

      {/* 하단 상태바 */}
      <StatusBar />
    </div>
  );
}
