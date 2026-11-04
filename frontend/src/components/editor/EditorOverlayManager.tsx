/**
 * ====================================================================
 * 🏷️ 파일명 : EditorOverlayManager.tsx
 * 🎭 역할(Role) : Manager (오버레이 통합 관리 — 16대 모달, 피커, 로딩 인디케이터, 모바일 음성 비서 관리)
 * 🎯 주요기능 : 에디터의 모든 플로팅 UI, 모달(ModalManager, AIDraftModal, NewDocumentModal, CalendarModal), 피커, 로딩 오버레이 중앙 집중식 관리
 * 🚨 @PATCH : 2026-11-04 — [MainEditorApp 모듈화 1단계 & 주석/에러 표준화] MainEditorApp에서 모든 모달·플로팅 오버레이를 분리하고 2단계 주석 및 logError 적용 (규칙 3 Manager 역할 준수)
 * ====================================================================
 */
// @ts-nocheck
"use client";

import React from 'react';
import ModalManager from '@/components/editor/modals/ModalManager';
import AIDraftModal from '@/components/AIDraftModal';
import NewDocumentModal from '@/components/NewDocumentModal';
import CalendarModal from '@/components/CalendarModal';
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import { Icon } from '@/components/icons/Icon';
import { logError } from '@/lib/errorDiagnostics';

export interface EditorOverlayManagerProps {
  modals: any;
  deps: any;
  aiDraft: {
    isOpen: boolean;
    onClose: () => void;
    onApply: (draftContent: string, action: 'insert' | 'replace' | 'append', scope?: 'selection' | 'document' | 'none') => void;
    geminiApiKey: string;
    aiModelName: string;
    onModelChange: (newModel: string) => void;
    initialMode: any;
    editorContext: any;
    resourceFolder: any;
    resourceFolderHandle: any;
    rootFolder: any;
  };
  calendar: {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (formatted: string) => void;
    isDarkMode: boolean;
  };
  newDocument: {
    isOpen: boolean;
    onClose: () => void;
    fileList: any[];
    rootFolder: any;
    workspaceType: string;
    onConfirm: (name: string, targetNode?: any) => Promise<void>;
    isDarkMode: boolean;
  };
  dateTimePicker: {
    isOpen: boolean;
    position: { top: number; left: number };
    onClose: () => void;
    onInsert: (formatted: string) => void;
    isDarkMode: boolean;
  };
  floatingQuote: {
    dropdown: { open: boolean; x: number; y: number; dropUp?: boolean };
    setDropdown: React.Dispatch<React.SetStateAction<any>>;
    executeFloatingItem: (fn: () => void) => void;
    dispatchCommand: (cmd: any) => void;
  };
  misc: {
    transferProgress?: string | null;
    mounted: boolean;
    isMobile: boolean;
    isAiLoading: boolean;
    isRecording: boolean;
    setIsRecording: (recording: boolean) => void;
    showToast: (msg: string, type?: string) => void;
    insertAtCursor: (text: string) => void;
  };
}

/**
 * ========================================================================================
 * [컴포넌트명] EditorOverlayManager - 에디터 모달 및 플로팅 오버레이 중앙 관리 매니저
 *
 * @param {EditorOverlayManagerProps} props - 16대 모달, AI 초안, 달력, 새 문서, 날짜 피커, 인용구 드롭다운 제어 Props
 * @returns {JSX.Element} 플로팅 오버레이 묶음
 * ==========================================================================================
 */
export default function EditorOverlayManager({
  modals,
  deps,
  aiDraft,
  calendar,
  newDocument,
  dateTimePicker,
  floatingQuote,
  misc
}: EditorOverlayManagerProps) {
  const {
    transferProgress,
    mounted,
    isMobile,
    isAiLoading,
    isRecording,
    setIsRecording,
    showToast,
    insertAtCursor
  } = misc;

  return (
    <>
      {/* 1. AI 초안 생성 모달 */}
      {aiDraft.isOpen && (
        <AIDraftModal 
          onClose={aiDraft.onClose} 
          onApply={aiDraft.onApply} 
          geminiApiKey={aiDraft.geminiApiKey || ''}
          aiModelName={aiDraft.aiModelName || 'gemini-3.8-flash'}
          onModelChange={aiDraft.onModelChange}
          initialMode={aiDraft.initialMode}
          editorContext={aiDraft.editorContext}
          resourceFolder={aiDraft.resourceFolder}
          resourceFolderHandle={aiDraft.resourceFolderHandle}
          rootFolder={aiDraft.rootFolder}
        />
      )}

      {/* 2. 16대 모달 통합 매니저 (Settings, Export, Style, Image, Youtube, License 등) */}
      <ModalManager modals={modals} deps={deps} />

      {/* 3. 파일 전송/변환 프로그레스 알림 */}
      {transferProgress && (
        <div role="status" aria-live="polite" className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[999999] rounded-xl border bg-white dark:bg-zinc-900 px-5 py-3 shadow-xl text-sm">
          {transferProgress}
        </div>
      )}

      {/* 4. 새 문서 생성 대화상자 */}
      <NewDocumentModal
        isOpen={newDocument.isOpen}
        onClose={newDocument.onClose}
        fileList={newDocument.fileList}
        rootFolder={newDocument.rootFolder}
        workspaceType={newDocument.workspaceType}
        onConfirm={newDocument.onConfirm}
        isDarkMode={newDocument.isDarkMode}
      />

      {/* 5. 인터랙티브 달력 모달 */}
      <CalendarModal
        isOpen={calendar.isOpen}
        onClose={calendar.onClose}
        onInsert={calendar.onInsert}
        isDarkMode={calendar.isDarkMode}
      />

      {/* 6. 모바일 플로팅 음성 비서 (STT) 버튼 */}
      {mounted && isMobile && (() => {
        const handleSpeechToText = () => {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (!SpeechRecognition) {
            showToast("죄송합니다. 현재 브라우저는 음성 인식을 지원하지 않습니다.", 'error');
            return;
          }

          if (isRecording) {
            setIsRecording(false);
            return;
          }

          const recognition = new SpeechRecognition();
          recognition.lang = 'ko-KR';
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          recognition.onstart = () => {
            setIsRecording(true);
            showToast("🎙️ 마이크가 켜졌습니다. 말씀해 주세요...", 'info');
          };

          recognition.onerror = (e: any) => {
            logError({
              file: 'frontend/src/components/editor/EditorOverlayManager.tsx',
              func: 'handleSpeechToText',
              doing: '모바일 음성 인식(SpeechRecognition) 처리 작업',
              target: 'SpeechRecognition',
              error: e?.error || e
            });
            setIsRecording(false);
            showToast("음성 인식에 실패했습니다.", 'error');
          };

          recognition.onend = () => {
            setIsRecording(false);
          };

          recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (!transcript.trim()) return;

            showToast(`음성 감지: "${transcript}"`, 'success');
            insertAtCursor(transcript);
            showToast("음성 텍스트가 본문에 입력되었습니다.", 'info');
          };

          recognition.start();
        };

        return (
          <button
            onClick={handleSpeechToText}
            className={`fixed bottom-20 right-6 z-[99999] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
              isRecording ? 'bg-rose-500 mic-pulse' : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20'
            }`}
          >
            {isRecording ? (
              <span className="w-4 h-4 bg-white rounded-full animate-ping" />
            ) : (
              <span className="text-xl">🎙️</span>
            )}
          </button>
        );
      })()}

      {/* 7. AI 문장 처리 중 로딩 인디케이터 오버레이 */}
      {isAiLoading && (
        <div className="fixed inset-0 z-[99999] bg-black/25 dark:bg-black/55 flex items-center justify-center pointer-events-none select-none">
          <div className="bg-white dark:bg-zinc-800 shadow-2xl border border-purple-500/20 rounded-2xl px-6 py-4 flex items-center gap-3.5 animate-in fade-in zoom-in-95 duration-200">
            <Icon name="Loading" className="animate-spin text-purple-500" size={20} />
            <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
              AI가 문장을 다듬고 있습니다...
            </span>
          </div>
        </div>
      )}

      {/* 8. 인용구 Alert 드롭다운 팝업 (fixed 최상위 레이어) */}
      {floatingQuote.dropdown.open && (
        <div
          id="floating-quote-dropdown-fixed"
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            const buttons = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
            const activeEl = document.activeElement as HTMLButtonElement;
            const currentIndex = buttons.indexOf(activeEl);
            if (e.key === 'Tab' || e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
              buttons[nextIndex]?.focus();
            } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
              e.preventDefault();
              const prevIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length;
              buttons[prevIndex]?.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
              if (activeEl && buttons.includes(activeEl)) {
                e.preventDefault();
                activeEl.click();
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              floatingQuote.setDropdown(prev => ({ ...prev, open: false }));
              const trigger = document.getElementById('floating-quote-dropdown-container')?.querySelector('button');
              trigger?.focus();
            }
          }}
          style={{
            position: 'fixed',
            zIndex: 2147483647,
            left: floatingQuote.dropdown.x,
            ...(floatingQuote.dropdown.dropUp
              ? { bottom: window.innerHeight - floatingQuote.dropdown.y + 4 }
              : { top: floatingQuote.dropdown.y + 4 }),
            minWidth: '230px',
          }}
          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl py-1 flex flex-col overflow-y-auto outline-none"
        >
          {[
            { id: 'QUOTE', label: '일반 인용구', icon: '❝', tag: '> ' },
            { id: 'QUOTE_NOTE', label: '참고 (Note)', icon: 'ℹ️', tag: '[!참고] · [!NOTE]' },
            { id: 'QUOTE_TIP', label: '팁 (Tip)', icon: '💡', tag: '[!팁] · [!TIP]' },
            { id: 'QUOTE_IMPORTANT', label: '중요 (Important)', icon: '📢', tag: '[!중요] · [!IMPORTANT]' },
            { id: 'QUOTE_WARNING', label: '주의 (Warning)', icon: '⚠️', tag: '[!주의] · [!WARNING]' },
            { id: 'QUOTE_CAUTION', label: '경고 (Caution)', icon: '🚨', tag: '[!경고] · [!CAUTION]' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                floatingQuote.executeFloatingItem(() => {
                  floatingQuote.dispatchCommand(opt.id as any);
                  floatingQuote.setDropdown(prev => ({ ...prev, open: false }));
                });
              }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-100 dark:focus:bg-blue-900/50 focus:outline-none flex items-center justify-between gap-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{opt.icon}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{opt.label}</span>
              </div>
              {opt.tag && (
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-bold">
                  {opt.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 9. 날짜/시간 커서 위치 스마트 입력 팝업 */}
      <DateTimeInsertPicker
        isOpen={dateTimePicker.isOpen}
        position={dateTimePicker.position}
        onClose={dateTimePicker.onClose}
        onInsert={dateTimePicker.onInsert}
        isDarkMode={dateTimePicker.isDarkMode}
      />
    </>
  );
}
