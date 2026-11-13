// ====================================================================
// 🧰 [OMD-UI-VisualEditorToolbar-0001] VisualEditorToolbar.tsx ➔ 시각 에디터 상단 툴바 및 표 편집 도구
// 🎯 @KICK  : 상단 고정 서식 컨트롤(Bold/Italic/태그/실행취소/ActiveTagInfo 인스펙터) 및 표 선택 시 활성화되는 플로팅 표 도구 포털 렌더링
// 🛡️ @GUARD : Rule 3(역할 기반 분리: Layout/Manager) 준수 및 고대비 ActiveTag 뱃지 시인성 보장
// 🚨 @PATCH : 2026-11-14 — [표 편집 도구 플로팅 툴바 소형 아이콘화 및 풍선도움말(Tooltip) 라벨링 적용]:
//             1) 표 편집 도구 바의 모든 액션 버튼(표 복사, 표 위에 본문, 행 추가/삭제, 열 추가/삭제, 본문 왼쪽/중앙/오른쪽 정렬, 표 아래 본문, 표 삭제, 닫기, 표 도구 다시 열기)을 직관적인 SVG 아이콘 버튼으로 일원화
//             2) 각 아이콘 버튼에 마우스 호버/포커스 시 즉시 나타나는 말풍선 형태의 풍선도움말(Tooltip)과 title/aria-label을 함께 적용하여 툴바 크기를 대폭 축소하면서도 기능을 명확히 안내
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 2단계 모듈화 분리]: 상단 툴바 및 표 편집 도구 컴포넌트 독립 분리
// 🔗 @CALLS : createPortal, ActiveTagInfo, visualSchema
// ====================================================================
// @ts-nocheck
"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import type { Command } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { visualSchema } from '@/lib/visualDocumentCodec';
import { tableContext, tableAction } from '@/lib/visualTableCommands';
import type { ActiveTagInfo } from './activeTagInspector';

export interface VisualEditorToolbarProps {
  itemButton: (id: string, label: string, removeSlash?: boolean) => React.ReactNode;
  button: (label: string, command: Command, removeSlash?: boolean) => React.ReactNode;
  undo: Command;
  redo: Command;
  blockCommands: [string, Command][];
  run: (command: Command, removeSlash?: boolean) => void;
  activeMarks: string[];
  tagInfo: ActiveTagInfo;
  inTable: boolean;
  pageGuides: boolean;
  readOnly: boolean;
  tableToolbarDismissed: boolean;
  setTableToolbarDismissed: (val: boolean) => void;
  tableToolPosition: { top: number; left: number; width?: number };
  firstBlockNeedsParagraph: boolean;
  viewRef: React.MutableRefObject<EditorView | null>;
  codecRef: React.MutableRefObject<any>;
  insertParagraphBeforeFirstBlock: () => void;
  setNotice: (msg: string) => void;
}

export default function VisualEditorToolbar({
  itemButton,
  button,
  undo,
  redo,
  blockCommands,
  run,
  activeMarks,
  tagInfo,
  inTable,
  pageGuides,
  readOnly,
  tableToolbarDismissed,
  setTableToolbarDismissed,
  tableToolPosition,
  firstBlockNeedsParagraph,
  viewRef,
  codecRef,
  insertParagraphBeforeFirstBlock,
  setNotice,
}: VisualEditorToolbarProps) {
  return (
    <>
      {/* 1. 상단 고정 에디터 컨트롤 툴바 */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b bg-white p-2 text-zinc-800" data-editor-controls>
        {itemButton('bold', 'bold')}
        {itemButton('italic', 'italic')}
        {itemButton('underline', '밑줄')}
        {itemButton('strikethrough', '취소선')}
        {itemButton('inlineCode', 'inlinecode')}
        {itemButton('link', 'link')}
        {itemButton('clear', 'clear')}
        {itemButton('image', '사진 넣기')}
        {itemButton('table', '표 넣기')}
        {button('실행 취소', undo)}
        {button('다시 실행', redo)}

        <select
          aria-label="문단 서식"
          defaultValue=""
          onChange={(event) => {
            const item = blockCommands.find(([label]) => label === event.target.value);
            if (item) run(item[1]);
            event.target.value = '';
          }}
          className="rounded border p-2 text-sm"
        >
          <option value="">문단 서식</option>
          {blockCommands.map(([label]) => (
            <option key={label}>{label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-zinc-500">
          / 입력: 블록 추가 · Ctrl+Space: 툴바 · Ctrl+Enter: 표·코드·인용문·이미지 아래 본문 · Tab: 목록 들여쓰기
        </span>

        <span aria-label="현재 입력 서식" className="text-xs text-blue-700">
          {activeMarks.length
            ? activeMarks.map((name) => ({ strong: 'bold', em: 'italic', code: 'inlinecode', link: 'link', strike: 'strike', underline: 'underline' }[name] || name)).join(' + ')
            : 'plain'}
        </span>

        {/* 🏷️ 실시간 활성 태그 인스펙터 뱃지 */}
        <div
          className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-700 pl-2 select-none"
          data-testid="active-tag-indicator"
          aria-label="현재 입력 태그"
          title={`전체 태그 경로: ${tagInfo.labelPathString} (${tagInfo.pathString})`}
        >
          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">현재 태그:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 ring-1 ring-blue-400 dark:ring-blue-600 shadow-xs">
            <span>&lt;{tagInfo.innermostTag}&gt;</span>
            <span className="font-sans font-semibold text-[11px] text-blue-700 dark:text-blue-300">({tagInfo.innermostLabel})</span>
          </span>
          {tagInfo.path.length > 1 && (
            <span
              className="hidden sm:inline-flex items-center text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[260px]"
              title={`전체 태그 경로: ${tagInfo.labelPathString}`}
            >
              <span className="text-zinc-400 mx-1 font-normal">·</span>
              {tagInfo.pathString}
            </span>
          )}
        </div>
      </div>

      {/* 2. 표 편집 도구 다시 열기 플로팅 버튼 */}
      {inTable && !pageGuides && !readOnly && tableToolbarDismissed && typeof window !== 'undefined' && createPortal(
        <button
          type="button"
          style={{ position: 'fixed', top: tableToolPosition.top, left: tableToolPosition.left, zIndex: 150 }}
          className="group/tbtn no-print relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/95 dark:bg-slate-800/95 text-blue-700 dark:text-blue-300 shadow-md hover:bg-blue-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
          data-editor-controls
          aria-label="표 편집 도구 다시 열기"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setTableToolbarDismissed(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full mt-1.5 left-0 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 group-hover/tbtn:opacity-100 group-hover/tbtn:scale-100 group-focus-visible/tbtn:opacity-100 transition-all duration-150 shadow-md z-[160]"
          >
            표 편집 도구 열기
            <span className="absolute -top-1 left-3 border-4 border-transparent border-b-slate-900 dark:border-b-slate-800" />
          </span>
        </button>,
        document.body
      )}

      {/* 3. 표 편집 도구 플로팅 툴바 포털 */}
      {inTable && !pageGuides && !readOnly && !tableToolbarDismissed && typeof window !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', top: tableToolPosition.top, left: tableToolPosition.left, maxWidth: tableToolPosition.width, zIndex: 150 }}
          className="no-print fixed z-[150] inline-flex flex-wrap items-center gap-1 rounded-xl border border-blue-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2 py-1 text-zinc-800 dark:text-zinc-100 shadow-lg"
          data-editor-controls
          aria-label="표 편집 도구"
        >
          {/* 표 도구 아이콘 배지 */}
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 select-none"
            title="표 편집 도구"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
            </svg>
          </span>

          <span className="h-4 w-px bg-zinc-200 dark:bg-slate-700 mx-0.5" />

          {firstBlockNeedsParagraph && viewRef.current?.state.doc.firstChild?.type === visualSchema.nodes.table && (
            <button
              type="button"
              className="group/tbtn relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer transition-colors"
              aria-label="표 위에 본문"
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertParagraphBeforeFirstBlock}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14 4 9l5-5" />
                <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 group-hover/tbtn:opacity-100 group-hover/tbtn:scale-100 group-focus-visible/tbtn:opacity-100 transition-all duration-150 shadow-md z-[160]"
              >
                표 위에 본문 줄 추가
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900 dark:border-b-slate-800" />
              </span>
            </button>
          )}

          {/* 표 복사 */}
          <button
            type="button"
            className="group/tbtn relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-slate-700 bg-transparent hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-700 dark:text-zinc-200 cursor-pointer transition-colors"
            aria-label="표 복사"
            onMouseDown={(e) => e.preventDefault()}
            onClick={async () => {
              const view = viewRef.current;
              const codec = codecRef.current;
              const context = view && tableContext(view.state);
              if (!context || !codec) return;
              const text = codec.serialize(visualSchema.nodes.doc.create(null, context.table));
              try {
                const api = (window as any).electronAPI;
                if (api?.copyTextToClipboard) await api.copyTextToClipboard(text);
                else await navigator.clipboard.writeText(text);
                setNotice('표를 마크다운 형식으로 복사했습니다.');
              } catch {
                setNotice('표 복사에 실패했습니다.');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 group-hover/tbtn:opacity-100 group-hover/tbtn:scale-100 group-focus-visible/tbtn:opacity-100 transition-all duration-150 shadow-md z-[160]"
            >
              표 복사
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900 dark:border-b-slate-800" />
            </span>
          </button>

          <span className="h-4 w-px bg-zinc-200 dark:bg-slate-700 mx-0.5" />

          {([
            {
              action: 'addRow',
              label: '행 추가 (아래)',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="10" x="3" y="3" rx="1.5" />
                  <path d="M12 16v5" />
                  <path d="M9.5 18.5h5" />
                </svg>
              ),
            },
            {
              action: 'deleteRow',
              label: '행 삭제',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="10" x="3" y="3" rx="1.5" />
                  <path d="M9.5 18.5h5" />
                </svg>
              ),
            },
            {
              action: 'addColumn',
              label: '열 추가 (오른쪽)',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="10" height="18" x="3" y="3" rx="1.5" />
                  <path d="M18.5 9.5v5" />
                  <path d="M16 12h5" />
                </svg>
              ),
            },
            {
              action: 'deleteColumn',
              label: '열 삭제',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="10" height="18" x="3" y="3" rx="1.5" />
                  <path d="M16 12h5" />
                </svg>
              ),
            },
            {
              action: 'left',
              label: '본문 왼쪽 정렬',
              dividerBefore: true,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
              ),
            },
            {
              action: 'center',
              label: '본문 중앙 정렬',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="10" x2="6" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="18" y1="18" x2="6" y2="18" />
                </svg>
              ),
            },
            {
              action: 'right',
              label: '본문 오른쪽 정렬',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="10" x2="7" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="21" y1="18" x2="7" y2="18" />
                </svg>
              ),
            },
            {
              action: 'afterTable',
              label: '표 아래 본문 줄 이동 (Ctrl+Enter)',
              dividerBefore: true,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 10 4 15 9 20" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
              ),
            },
            {
              action: 'deleteTable',
              label: '표 전체 삭제',
              danger: true,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              ),
            },
          ] as const).map(({ action, label, icon, dividerBefore, danger }) => (
            <React.Fragment key={action}>
              {dividerBefore && <span className="h-4 w-px bg-zinc-200 dark:bg-slate-700 mx-0.5" />}
              <button
                type="button"
                className={`group/tbtn relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors cursor-pointer ${
                  danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-800/60'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:border-zinc-200 dark:hover:border-slate-700'
                }`}
                aria-label={label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const view = viewRef.current;
                  const command = tableAction(action);
                  if (view && !command(view.state)) {
                    setNotice('헤더 행과 마지막 열은 삭제할 수 없습니다. 표 전체를 지우려면 표 삭제를 사용해 주세요.');
                  } else {
                    run(command);
                  }
                }}
              >
                {icon}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 group-hover/tbtn:opacity-100 group-hover/tbtn:scale-100 group-focus-visible/tbtn:opacity-100 transition-all duration-150 shadow-md z-[160]"
                >
                  {label}
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900 dark:border-b-slate-800" />
                </span>
              </button>
            </React.Fragment>
          ))}

          <span className="h-4 w-px bg-zinc-200 dark:bg-slate-700 mx-0.5" />

          {/* 닫기 */}
          <button
            type="button"
            className="group/tbtn relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableToolbarDismissed(true)}
            aria-label="표 편집 도구 닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full mt-1.5 right-0 whitespace-nowrap rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white opacity-0 scale-95 group-hover/tbtn:opacity-100 group-hover/tbtn:scale-100 group-focus-visible/tbtn:opacity-100 transition-all duration-150 shadow-md z-[160]"
            >
              도구바 닫기 (Esc)
              <span className="absolute -top-1 right-2.5 border-4 border-transparent border-b-slate-900 dark:border-b-slate-800" />
            </span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
