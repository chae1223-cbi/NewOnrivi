// ====================================================================
// 🎛️ [OMD-UI-VisualSlashMenu-0001] VisualSlashMenu.tsx ➔ 시각 에디터 슬래시 메뉴 및 플로팅 서식 포털
// 🎯 @KICK  : / 슬래시 입력 시 나타나는 명령어 선택 팝업 및 텍스트 블록 지정 시 활성화되는 플로팅 서식 툴바 포털 렌더링
// 🛡️ @GUARD : Rule 3(역할 기반 분리: Manager/Overlay) 준수 - document.body createPortal 격리 렌더링
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 2단계 모듈화 분리]: 슬래시 메뉴 및 플로팅 서식 포털 컴포넌트 독립 분리
// 🔗 @CALLS : createPortal
// ====================================================================
// @ts-nocheck
"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import type { EditorView } from 'prosemirror-view';

export interface VisualSlashMenuItem {
  id: string;
  command: string;
  name: string;
  icon: string;
  description: string;
}

export interface VisualSlashMenuProps {
  slash: boolean;
  readOnly: boolean;
  popup: { top: number; left: number };
  filtered: VisualSlashMenuItem[];
  menuIndex: number;
  executeItem: (id: string, removeSlash?: boolean) => void;
  selection: boolean;
  onFloatingToolbar?: ((visible: boolean, position: { top: number; left: number }) => void) | undefined;
  itemButton: (id: string, label: string, removeSlash?: boolean) => React.ReactNode;
  setSelection: (val: boolean) => void;
  manualFloatingRef: React.MutableRefObject<boolean>;
  viewRef: React.MutableRefObject<EditorView | null>;
}

export default function VisualSlashMenu({
  slash,
  readOnly,
  popup,
  filtered,
  menuIndex,
  executeItem,
  selection,
  onFloatingToolbar,
  itemButton,
  setSelection,
  manualFloatingRef,
  viewRef,
}: VisualSlashMenuProps) {
  if (typeof window === 'undefined') return null;

  return (
    <>
      {/* 1. 선택 텍스트 플로팅 서식 툴바 포털 */}
      {selection && !readOnly && !onFloatingToolbar && createPortal(
        <div
          role="toolbar"
          tabIndex={-1}
          aria-label="선택한 글 서식"
          onKeyDown={(e) => {
            e.stopPropagation();
            const buttons = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
            const activeEl = document.activeElement as HTMLButtonElement;
            const currentIndex = buttons.indexOf(activeEl);
            if (e.key === 'Tab') {
              e.preventDefault();
              const nextIndex = currentIndex === -1
                ? (e.shiftKey ? buttons.length - 1 : 0)
                : (e.shiftKey ? (currentIndex - 1 + buttons.length) % buttons.length : (currentIndex + 1) % buttons.length);
              buttons[nextIndex]?.focus();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
              buttons[nextIndex]?.focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
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
              setSelection(false);
              manualFloatingRef.current = false;
              viewRef.current?.focus();
            }
          }}
          style={{
            ...popup,
            left: Math.max(8, Math.min(popup.left, window.innerWidth - 916)),
            width: 'min(900px, calc(100vw - 16px))',
            maxHeight: Math.min(window.innerHeight * 0.4, window.innerHeight - popup.top - 8),
            overflow: 'auto',
          }}
          className="fixed z-[1000] flex flex-wrap rounded-xl border bg-white text-zinc-800 shadow-lg outline-none"
          data-editor-controls
        >
          {([
            ['bold', 'B'],
            ['italic', 'I'],
            ['inlineCode', '</>'],
            ['link', '🔗'],
            ['orderedList', '1.'],
            ['list', '•'],
            ['checklist', '☑'],
            ['clear', '⌫'],
          ] as [string, string][]).map(([id, label]) => itemButton(id, label))}
        </div>,
        document.body
      )}

      {/* 2. 슬래시(/) 명령어 메뉴 포털 */}
      {slash && !readOnly && createPortal(
        <div
          id="visual-slash-menu"
          role="menu"
          aria-label="슬래시 명령어"
          style={{
            ...popup,
            width: 'min(650px, calc(100vw - 16px))',
            left: Math.max(8, Math.min(popup.left, window.innerWidth - 666)),
            maxHeight: Math.min(window.innerHeight * 0.4, window.innerHeight - popup.top - 8),
            overflow: 'auto',
          }}
          className="fixed z-[1000] flex flex-wrap rounded-xl border bg-white p-2 text-zinc-800 shadow-lg"
          data-editor-controls
        >
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`/${item.command}`}
              data-selected={index === menuIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => executeItem(item.id, true)}
              className={`flex w-full items-center gap-2 px-2 py-1 text-left text-sm ${
                index === menuIndex ? 'bg-[#3d5db5] text-white' : 'hover:bg-blue-50'
              }`}
              title={item.description}
            >
              <span className="w-6 shrink-0 text-center">{item.icon}</span>
              <span className="w-28 shrink-0 font-semibold">/{item.command}</span>
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="hidden max-w-[45%] truncate text-xs opacity-65 sm:block">{item.description}</span>
            </button>
          ))}
          {!filtered.length && <span className="p-2 text-sm text-zinc-500">No commands</span>}
        </div>,
        document.body
      )}
    </>
  );
}
