// ====================================================================
// 🧰 [OMD-UI-VisualEditorToolbar-0001] VisualEditorToolbar.tsx ➔ 시각 에디터 상단 툴바 및 표 편집 도구
// 🎯 @KICK  : 상단 고정 서식 컨트롤(Bold/Italic/태그/실행취소/ActiveTagInfo 인스펙터) 및 표 선택 시 활성화되는 플로팅 표 도구 포털 렌더링
// 🛡️ @GUARD : Rule 3(역할 기반 분리: Layout/Manager) 준수 및 고대비 ActiveTag 뱃지 시인성 보장
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
          className="no-print rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 shadow-lg hover:bg-blue-100 cursor-pointer"
          data-editor-controls
          aria-label="표 편집 도구 다시 열기"
          title="표 편집 도구 다시 열기"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setTableToolbarDismissed(false)}
        >
          표 도구 열기
        </button>,
        document.body
      )}

      {/* 3. 표 편집 도구 플로팅 툴바 포털 */}
      {inTable && !pageGuides && !readOnly && !tableToolbarDismissed && typeof window !== 'undefined' && createPortal(
        <div
          style={tableToolPosition}
          className="no-print fixed z-[150] flex flex-wrap gap-1 rounded-lg border border-blue-200 bg-blue-50 p-2 text-zinc-800 shadow-lg items-center"
          data-editor-controls
          aria-label="표 편집 도구"
        >
          <strong className="self-center px-2 text-sm font-bold text-zinc-900">표 편집 도구</strong>
          {firstBlockNeedsParagraph && viewRef.current?.state.doc.firstChild?.type === visualSchema.nodes.table && (
            <button
              type="button"
              className="rounded border border-blue-300 bg-white px-2 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertParagraphBeforeFirstBlock}
            >
              표 위에 본문
            </button>
          )}
          <button
            type="button"
            className="onrivi-media-control cursor-pointer"
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
            복사
          </button>
          {(['addRow', 'deleteRow', 'addColumn', 'deleteColumn', 'left', 'center', 'right', 'afterTable', 'deleteTable'] as const).map(
            (action) => (
              <button
                key={action}
                type="button"
                className="rounded border bg-white px-2 py-1 text-sm hover:bg-zinc-50 cursor-pointer"
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
                {
                  {
                    addRow: '행 추가',
                    deleteRow: '행 삭제',
                    addColumn: '열 추가',
                    deleteColumn: '열 삭제',
                    left: '본문 왼쪽',
                    center: '본문 중앙',
                    right: '본문 오른쪽',
                    afterTable: '표 아래 본문',
                    deleteTable: '표 삭제',
                  }[action]
                }
              </button>
            )
          )}
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer transition-colors ml-auto"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTableToolbarDismissed(true)}
            aria-label="표 편집 도구 닫기"
            title="표 편집 도구 닫기 (Esc 또는 표 밖으로 나가면 닫힙니다)"
          >
            닫기
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
