// ====================================================================
// 📊 [OMD-CORE-VisualEditor-ProseMirrorHandlers] frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts
// 🎯 @KICK  : 시각 에디터(VisualDocumentEditor)의 ProseMirror Keymap, 키보드/텍스트 입력, 스마트 붙여넣기(handlePaste), 드롭(handleDrop), 마우스 클릭/링크 이동(handleClick) 및 DOM 이벤트 핸들러 팩토리
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 클립보드 이미지/HTML 붙여넣기 정제, 5대 정밀 진단 로깅(logError/logWarn) 준수
// 🚨 @PATCH : 2026-11-05 — [목록 선택 후 클릭]: 선택된 목록을 일반 클릭하면 클릭 위치로 커서를 접고 선택을 해제한다.
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 코어 엔진 모듈화]: ProseMirror 이벤트/단축키/스마트 붙여넣기 핸들러 분리 및 5대 진단 로깅 적용
// 🔗 @CALLS : markdownPasteTransaction, markdownPasteInTableCellTransaction, htmlToImportMarkdown, importHtmlWithImages, sanitizePastedText
// ====================================================================

import type React from 'react';
import { NodeSelection, TextSelection, type Command, type Plugin } from 'prosemirror-state';
import type { EditorProps, EditorView } from 'prosemirror-view';
import { baseKeymap, chainCommands, exitCode, toggleMark } from 'prosemirror-commands';
import { splitListItem } from 'prosemirror-schema-list';
import { undo, redo, closeHistory } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { undoInputRule } from 'prosemirror-inputrules';
import { createVisualDocumentCodec, visualSchema } from '@/lib/visualDocumentCodec';
import { withIndependentQuotes, protectQuoteBoundary, liftQuoteAtStart } from '@/lib/visualQuoteCommands';
import {
  removeListMarkerAtStart,
  moveUpFromEmptyOrderedItem,
  exitEmptyListItem,
  joinOrderedListsAcrossEmptyParagraph,
  deleteNextListBoundary,
  deleteEmptyParagraphBeforeList,
  independentIndentListItem,
  independentLiftListItem,
  moveUpAcrossListBoundary,
  moveDownAcrossListBoundary,
  deleteAtEndOfList,
} from '@/lib/visualListCommands';
import {
  tableContext,
  tableAction,
  moveTableCell,
  tableEnter,
  clearMultiCellTableSelection,
  hasMultiCellTableSelection,
} from '@/lib/visualTableCommands';
import { desktopClipboardImage } from '@/lib/desktopClipboard';
import { markdownPasteInTableCellTransaction, markdownPasteTransaction } from '@/lib/visualMarkdownPaste';
import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import { sanitizePastedText } from '@/utils/pasteHandlers';
import { configuredHotkeyItem } from '@/lib/toolbarConfig';
import type { installVisualCaret } from '@/lib/visualCaret';
import { parseDroppedDataToBlob } from '@/lib/resourceMedia';
import { slashPattern } from './visualDocumentCommands';
import {
  backspaceInCodeBlock,
  deleteInCodeBlock,
  removeHeadingAtStart,
  headingEnter,
  calloutEnter,
  exitQuote,
  ATOM_BLOCK_TYPES,
  exitMediaBlock,
  placeCursorBeforeHorizontalRule,
  openParagraphAfterHorizontalRule,
  findClickedHorizontalRulePos,
  emptyParagraphAtClick,
  paragraphLineEndAtClick,
  indentBlockquote,
  outdentBlockquote,
  safeListIndent,
  indentDocument,
} from './visualDocumentCommands';
import {
  synchronizeTextSelection,
  extendSelectionVerticallyAcrossBlocks,
  handlePageMove,
} from './visualSelectionHelper';
import { resolveDocPath } from './visualDropHelper';
import { logError, logWarn } from '@/lib/errorDiagnostics';

type Codec = ReturnType<typeof createVisualDocumentCodec>;

export interface VisualEditorKeymapParams {
  clearCommand: Command;
  linkCommandRef: React.MutableRefObject<Command>;
  insertFootnoteRef: React.MutableRefObject<(removeSlash?: boolean) => void>;
  applySignatureRef: React.MutableRefObject<(removeSlash?: boolean) => boolean>;
}

/**
 * ========================================================================================
 * [함수명] createVisualEditorKeymap - 시각 에디터의 기본 단축키(Mod-z/b/i/u/e/k, Enter, Tab, Backspace, Delete 등) ProseMirror Keymap 플러그인을 생성합니다.
 *
 * @param {VisualEditorKeymapParams} params - 서식 초기화, 링크, 각주, 서명 커맨드 Ref 객체
 * @returns {Plugin} ProseMirror keymap 플러그인 인스턴스
 *
 * @example
 * const editorKeymap = createVisualEditorKeymap({ clearCommand, linkCommandRef, insertFootnoteRef, applySignatureRef });
 * ==========================================================================================
 */
export function createVisualEditorKeymap({
  clearCommand,
  linkCommandRef,
  insertFootnoteRef,
  applySignatureRef,
}: VisualEditorKeymapParams): Plugin {
  return keymap({
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,
    ArrowUp: chainCommands(moveUpAcrossListBoundary, moveUpFromEmptyOrderedItem),
    Backspace: chainCommands(
      clearMultiCellTableSelection,
      liftQuoteAtStart,
      removeHeadingAtStart,
      backspaceInCodeBlock,
      undoInputRule,
      removeListMarkerAtStart,
      baseKeymap.Backspace
    ),
    Delete: chainCommands(
      clearMultiCellTableSelection,
      protectQuoteBoundary,
      deleteEmptyParagraphBeforeList,
      deleteInCodeBlock,
      deleteAtEndOfList,
      deleteNextListBoundary,
      joinOrderedListsAcrossEmptyParagraph,
      baseKeymap.Delete
    ),
    'Mod-Shift-k': (state, dispatch) => {
      const { $from } = state.selection;
      if ($from.parent.type === visualSchema.nodes.code_block) {
        if (dispatch) {
          const pos = $from.before();
          const after = $from.after();
          const tr = state.tr;
          if (state.doc.childCount === 1 && pos === 0) {
            dispatch(closeHistory(tr.replaceWith(pos, after, visualSchema.nodes.paragraph.create())).scrollIntoView());
          } else {
            dispatch(closeHistory(tr.delete(pos, after)).scrollIntoView());
          }
        }
        return true;
      }
      return false;
    },
    'Mod-u': toggleMark(visualSchema.marks.underline),
    'Mod-b': toggleMark(visualSchema.marks.strong),
    'Mod-B': toggleMark(visualSchema.marks.strong),
    'Mod-i': toggleMark(visualSchema.marks.em),
    'Mod-I': toggleMark(visualSchema.marks.em),
    'Mod-e': toggleMark(visualSchema.marks.code),
    'Mod-E': toggleMark(visualSchema.marks.code),
    'Mod-Shift-x': toggleMark(visualSchema.marks.strike),
    'Mod-Shift-X': toggleMark(visualSchema.marks.strike),
    'Mod-\\': clearCommand,
    'Mod-k': (state, dispatch) => linkCommandRef.current(state, dispatch),
    'Mod-Alt-f': () => {
      insertFootnoteRef.current?.();
      return true;
    },
    'Mod-Alt-F': () => {
      insertFootnoteRef.current?.();
      return true;
    },
    'Mod-Alt-r': () => {
      applySignatureRef.current?.();
      return true;
    },
    'Mod-Alt-R': () => {
      applySignatureRef.current?.();
      return true;
    },
    'Mod-Alt-s': () => {
      applySignatureRef.current?.();
      return true;
    },
    'Mod-Alt-S': () => {
      applySignatureRef.current?.();
      return true;
    },
    ArrowDown: chainCommands(moveDownAcrossListBoundary, (state, dispatch, currentView) => {
      if (state.selection instanceof NodeSelection && ATOM_BLOCK_TYPES.has(state.selection.node.type.name)) {
        return exitMediaBlock(true)(state, dispatch, currentView);
      }
      if (!state.selection.empty || !currentView?.endOfTextblock('down')) return false;
      const table = tableContext(state);
      if (table && table.row === table.table.childCount - 1) return tableAction('afterTable')(state, dispatch, currentView);
      if (
        state.selection.$from.parent.type === visualSchema.nodes.code_block &&
        state.selection.$from.parentOffset === state.selection.$from.parent.content.size
      ) {
        return exitCode(state, dispatch, currentView);
      }
      return false;
    }),
    'Mod-Enter': chainCommands(tableAction('afterTable'), exitCode, exitQuote(), exitMediaBlock()),
    Enter: chainCommands(
      exitMediaBlock(true),
      tableEnter(),
      calloutEnter,
      exitEmptyListItem,
      (state, dispatch, currentView) => {
        const parent = state.selection.$from.depth > 0 ? state.selection.$from.node(state.selection.$from.depth - 1) : null;
        return splitListItem(
          visualSchema.nodes.list_item,
          parent?.type === visualSchema.nodes.list_item && parent.attrs.checked !== null ? { checked: false } : undefined
        )(state, dispatch, currentView);
      },
      headingEnter,
      baseKeymap.Enter
    ),
    'Shift-Enter': chainCommands(exitCode, (state, dispatch) => {
      if (dispatch) dispatch(state.tr.replaceSelectionWith(visualSchema.nodes.hard_break.create()).scrollIntoView());
      return true;
    }),
    Tab: chainCommands(
      moveTableCell(),
      indentBlockquote,
      withIndependentQuotes(independentIndentListItem),
      safeListIndent
    ),
    'Shift-Tab': chainCommands(
      moveTableCell(true),
      outdentBlockquote,
      withIndependentQuotes(independentLiftListItem),
      indentDocument(true)
    ),
  });
}

export interface VisualEditorHandlersParams {
  viewRef: React.MutableRefObject<EditorView | null>;
  caretRef: React.MutableRefObject<ReturnType<typeof installVisualCaret> | null>;
  codecRef: React.MutableRefObject<Codec | null>;
  imagesRef: React.MutableRefObject<{
    onImageFile?: (file: Blob) => Promise<string | null>;
    [key: string]: any;
  }>;
  beginImageRef: React.MutableRefObject<(source?: string, position?: number, file?: Blob) => void>;
  hotkeysRef: React.MutableRefObject<Record<string, string>>;
  executeItemRef: React.MutableRefObject<(id: string, removeSlash?: boolean) => void>;
  slashOpenRef: React.MutableRefObject<boolean>;
  menuItemsRef: React.MutableRefObject<{ id: string }[]>;
  menuIndexRef: React.MutableRefObject<number>;
  slashRange: React.MutableRefObject<{ from: number; to: number } | null>;
  manualFloatingRef: React.MutableRefObject<boolean>;
  selectionVisibleRef: React.MutableRefObject<boolean>;
  headingFormatsRef: React.MutableRefObject<{ current: any; previous: any; readOnly: boolean }>;
  cursorFrame: React.MutableRefObject<number>;
  cursorCallback: React.MutableRefObject<((offset: number, reveal?: boolean) => void) | undefined>;
  onFileOpenRef: React.MutableRefObject<((filePath: string, heading?: string) => void) | undefined>;
  currentFilePathRef: React.MutableRefObject<string | undefined>;
  onToastRef: React.MutableRefObject<((message: string, type?: 'info' | 'success' | 'warning' | 'error') => void) | undefined>;
  clearCommand: Command;
  runCommand: (command: Command, removeSlash?: boolean) => void;
  setMenuIndex: React.Dispatch<React.SetStateAction<number>>;
  setPopup: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>;
  setSlash: React.Dispatch<React.SetStateAction<boolean>>;
  setSelection: React.Dispatch<React.SetStateAction<boolean>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setTableToolbarDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  clearDropIndicator: () => void;
  updateDropIndicator: (currentView: EditorView, e: DragEvent) => void;
  executeDropImageInsertion: (currentView: EditorView, e: DragEvent) => Promise<boolean>;
}

/**
 * ========================================================================================
 * [함수명] createVisualEditorHandlers - ProseMirror EditorView의 키보드, 텍스트 입력, 붙여넣기, 드롭, 클릭 및 DOM 이벤트 핸들러 묶음을 생성합니다.
 *
 * @param {VisualEditorHandlersParams} params - 에디터 상태/뷰 Ref 및 액션 콜백 객체
 * @returns {Pick<EditorProps, 'handleKeyDown' | 'handleTextInput' | 'handlePaste' | 'handleDrop' | 'handleClickOn' | 'handleClick' | 'handleDOMEvents'>} ProseMirror 이벤트 핸들러 객체
 *
 * @example
 * const handlers = createVisualEditorHandlers({ viewRef, caretRef, codecRef, ... });
 * ==========================================================================================
 */
export function createVisualEditorHandlers({
  viewRef,
  caretRef,
  codecRef,
  imagesRef,
  beginImageRef,
  hotkeysRef,
  executeItemRef,
  slashOpenRef,
  menuItemsRef,
  menuIndexRef,
  slashRange,
  manualFloatingRef,
  selectionVisibleRef,
  headingFormatsRef,
  cursorFrame,
  cursorCallback,
  onFileOpenRef,
  currentFilePathRef,
  onToastRef,
  clearCommand,
  runCommand,
  setMenuIndex,
  setPopup,
  setSlash,
  setSelection,
  setQuery,
  setTableToolbarDismissed,
  clearDropIndicator,
  updateDropIndicator,
  executeDropImageInsertion,
}: VisualEditorHandlersParams): Pick<
  EditorProps,
  'handleKeyDown' | 'handleTextInput' | 'handlePaste' | 'handleDrop' | 'handleClickOn' | 'handleClick' | 'handleDOMEvents'
> {
  let lastMouseDownCoords: { x: number; y: number } | null = null;

  return {
    handleKeyDown(currentView, event) {
      if (!currentView.editable || event.isComposing) return false;
      if (event.key === 'Enter') {
        const { $from } = currentView.state.selection;
        const isFootnoteDef =
          $from.parent.type === visualSchema.nodes.visual_footnote_def ||
          ($from.nodeAfter && $from.nodeAfter.type === visualSchema.nodes.visual_footnote_def) ||
          ($from.nodeBefore && $from.nodeBefore.type === visualSchema.nodes.visual_footnote_def);
        if (isFootnoteDef) {
          event.preventDefault();
          return true;
        }
      }
      if (
        currentView.state.selection instanceof NodeSelection &&
        currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule
      ) {
        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          openParagraphAfterHorizontalRule(currentView, currentView.state.selection.from);
          caretRef.current?.schedule();
          return true;
        }
        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
          placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
          caretRef.current?.schedule();
        }
      }
      if (
        (event.key === 'PageDown' || event.key === 'PageUp') &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        event.preventDefault();
        handlePageMove(currentView, event.key === 'PageDown' ? 'down' : 'up', event.shiftKey, () =>
          caretRef.current?.schedule()
        );
        return true;
      }
      if (
        event.key === 'ArrowDown' &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        if (extendSelectionVerticallyAcrossBlocks(currentView, 'down', () => caretRef.current?.schedule())) {
          event.preventDefault();
          return true;
        }
      }
      if (
        event.key === 'ArrowUp' &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        if (extendSelectionVerticallyAcrossBlocks(currentView, 'up', () => caretRef.current?.schedule())) {
          event.preventDefault();
          return true;
        }
      }
      if (['Tab', 'Backspace', 'Delete', 'End', 'Home', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        synchronizeTextSelection(currentView);
      }
      if (
        event.key === 'ArrowRight' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.isTextblock) {
          const currentStored = currentView.state.storedMarks;
          const activeMarks = currentStored ?? $from.marks();
          if (activeMarks && activeMarks.length > 0) {
            const nodeAfter = $from.nodeAfter;
            const isAtMarkEnd = !nodeAfter || !activeMarks.some(m => nodeAfter.marks.some(nm => nm.eq(m)));
            if (isAtMarkEnd && !(currentStored && currentStored.length === 0)) {
              event.preventDefault();
              currentView.dispatch(currentView.state.tr.setStoredMarks([]));
              caretRef.current?.schedule();
              return true;
            }
          }
        }
      }
      if (
        event.key === 'ArrowLeft' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.isTextblock) {
          const currentStored = currentView.state.storedMarks;
          const activeMarks = currentStored ?? $from.marks();
          if (activeMarks && activeMarks.length > 0) {
            const nodeBefore = $from.nodeBefore;
            const nodeAfter = $from.nodeAfter;
            const isAtMarkStart =
              (!nodeBefore || !activeMarks.some(m => nodeBefore.marks.some(nm => nm.eq(m)))) &&
              Boolean(nodeAfter && activeMarks.some(m => nodeAfter.marks.some(nm => nm.eq(m))));
            if (isAtMarkStart && !(currentStored && currentStored.length === 0)) {
              event.preventDefault();
              currentView.dispatch(currentView.state.tr.setStoredMarks([]));
              caretRef.current?.schedule();
              return true;
            }
          }
        }
      }
      if (
        event.key === 'End' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.isTextblock) {
          const currentStored = currentView.state.storedMarks;
          const activeMarks = currentStored ?? $from.marks();
          if (activeMarks && activeMarks.length > 0) {
            const endPos = $from.end();
            event.preventDefault();
            currentView.dispatch(
              currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, endPos)).setStoredMarks([])
            );
            caretRef.current?.schedule();
            return true;
          }
        }
      }
      if (
        event.key === 'Home' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !slashOpenRef.current
      ) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.isTextblock) {
          const startPos = $from.start();
          const startResolved = currentView.state.doc.resolve(startPos);
          const nodeAfter = startResolved.nodeAfter;
          if (nodeAfter && nodeAfter.marks && nodeAfter.marks.length > 0) {
            event.preventDefault();
            currentView.dispatch(
              currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, startPos)).setStoredMarks([])
            );
            caretRef.current?.schedule();
            return true;
          }
        }
      }
      if (event.key === 'Tab') {
        const position = currentView.state.selection.$from;
        let inList = false;
        let inQuote = false;
        for (let depth = position.depth; depth > 0; depth--) {
          if (position.node(depth).type === visualSchema.nodes.list_item) inList = true;
          if (position.node(depth).type === visualSchema.nodes.blockquote) inQuote = true;
        }
        if (
          !inList &&
          !inQuote &&
          currentView.state.selection.empty &&
          !tableContext(currentView.state) &&
          position.parent.isTextblock &&
          position.parentOffset > 0 &&
          position.parentOffset < position.parent.content.size
        ) {
          event.preventDefault();
          return indentDocument(event.shiftKey)(currentView.state, currentView.dispatch, currentView);
        }
      }
      const clipboardFile = desktopClipboardImage(event);
      if (clipboardFile && imagesRef.current.onImageFile) {
        event.preventDefault();
        beginImageRef.current(undefined, undefined, clipboardFile);
        return true;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        (event.key === '\\' || event.key === '₩' || event.code === 'Backslash')
      ) {
        event.preventDefault();
        synchronizeTextSelection(currentView);
        runCommand(clearCommand);
        caretRef.current?.schedule();
        return true;
      }
      const configured = configuredHotkeyItem(event, hotkeysRef.current);
      if (configured) {
        event.preventDefault();
        synchronizeTextSelection(currentView);
        executeItemRef.current(configured.id);
        return true;
      }
      if (event.key === 'ArrowUp' && !event.shiftKey && !event.ctrlKey && !event.altKey && !slashOpenRef.current) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.type === visualSchema.nodes.code_block && $from.parentOffset === 0) {
          const dom = currentView.domAtPos($from.pos);
          const codeBlockEl =
            dom.node instanceof Element
              ? dom.node.closest('.visual-code-block')
              : dom.node.parentElement?.closest('.visual-code-block');
          const input = codeBlockEl?.querySelector<HTMLInputElement>('.visual-code-language input');
          if (input) {
            event.preventDefault();
            input.focus();
            input.select();
            return true;
          }
        }
      }
      if (
        event.key === 'ArrowDown' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !slashOpenRef.current
      ) {
        const { $from, empty } = currentView.state.selection;
        if (
          empty &&
          $from.parent.type === visualSchema.nodes.code_block &&
          $from.parentOffset === $from.parent.content.size
        ) {
          event.preventDefault();
          const afterPos = $from.after();
          let tr = currentView.state.tr;
          if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          }
          currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
          currentView.focus();
          caretRef.current?.schedule();
          return true;
        }
      }
      if (event.key === 'Enter' && !event.isComposing && !slashOpenRef.current) {
        const { $from, empty } = currentView.state.selection;
        if (empty && $from.parent.type === visualSchema.nodes.code_block) {
          const parent = $from.parent;
          const isCodeEmpty = parent.content.size === 0;
          const isAtEnd = $from.parentOffset === parent.content.size;
          if (
            isCodeEmpty ||
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey ||
            (isAtEnd && parent.textContent.endsWith('\n'))
          ) {
            event.preventDefault();
            const afterPos = $from.after();
            let tr = currentView.state.tr;
            if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            }
            currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
            currentView.focus();
            caretRef.current?.schedule();
            return true;
          }
        }
      }
      if (
        slashOpenRef.current &&
        menuItemsRef.current.length &&
        ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', ' ', 'Spacebar'].includes(event.key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const length = menuItemsRef.current.length;
          menuIndexRef.current = (menuIndexRef.current + (event.key === 'ArrowDown' ? 1 : -1) + length) % length;
          setMenuIndex(menuIndexRef.current);
        } else {
          const item = menuItemsRef.current[menuIndexRef.current] || menuItemsRef.current[0];
          setTimeout(() => {
            executeItemRef.current(item.id, true);
          }, 0);
        }
        return true;
      }
      if ((event.ctrlKey || event.metaKey) && (event.code === 'Space' || event.key === ' ')) {
        const { from, to, $from, empty } = currentView.state.selection;
        const before = $from.parent.isTextblock ? $from.parent.textBetween(0, $from.parentOffset, '\n', '\n') : '';
        const match = before.match(slashPattern);
        const rect = currentView.coordsAtPos(from);
        const slashCommand = empty && Boolean(match);
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = slashCommand
          ? spaceBelow < 260 && rect.top > 260
            ? Math.max(8, rect.top - 240)
            : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6))
          : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
        setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
        if (slashCommand) {
          slashRange.current = { from: from - match![1].length, to };
          setSlash(true);
          setSelection(false);
          setQuery(match![1].slice(1).toLowerCase());
        } else {
          setSlash(false);
          slashRange.current = null;
          const visible = !selectionVisibleRef.current;
          manualFloatingRef.current = visible;
          setSelection(visible);
        }
        return true;
      }
      if (event.key === 'Escape') {
        manualFloatingRef.current = false;
        slashOpenRef.current = false;
        setSlash(false);
        setSelection(false);
        slashRange.current = null;
        setTableToolbarDismissed(true);
        return true;
      }
      return false;
    },

    handleTextInput(currentView, _from, _to, text) {
      if (!currentView.editable) return false;
      if (currentView.composing) return false;
      if (
        currentView.state.selection instanceof NodeSelection &&
        currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule
      ) {
        if (placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from)) {
          currentView.dispatch(currentView.state.tr.insertText(text));
          caretRef.current?.schedule();
          return true;
        }
      }
      return false;
    },

    handlePaste(currentView, event) {
      if (!currentView.editable) return false;
      const inCode = currentView.state.selection.$from.parent.type === visualSchema.nodes.code_block;
      if (inCode) return false;

      const text = event.clipboardData?.getData('text/plain') || '';
      const html = event.clipboardData?.getData('text/html') || '';
      const hasRichHtml =
        !!html &&
        /<(?:table|tbody|tr|th|td|h[1-6]|ul|ol|li|b|strong|i|em|del|s|blockquote|pre|figure|figcaption|a\s+[^>]*href)\b/i.test(
          html
        );
      const isExplicitPureMarkdown =
        /^(?:\uFEFF)?---[^\S\r\n]*\r?\n/.test(text) ||
        (!/<table\b/i.test(html) && /\|[\s\t]*:?---*:?[\s\t]*\|/.test(text));
      if (tableContext(currentView.state) && currentView.state.selection.$from.parent.isTextblock) {
        const cellSource =
          /<table\b/i.test(html) && text
            ? text
            : hasRichHtml && !isExplicitPureMarkdown
              ? sanitizePastedText(htmlToImportMarkdown(html))
              : text;
        if (cellSource) {
          event.preventDefault();
          event.stopPropagation();
          currentView.dispatch(markdownPasteInTableCellTransaction(currentView.state, cellSource));
          return true;
        }
      }
      if (text && !html && !/[\r\n\t]/.test(text)) {
        const marks = currentView.state.storedMarks ?? currentView.state.selection.$from.marks();
        if (marks?.length) {
          const tr = currentView.state.tr.replaceSelectionWith(currentView.state.schema.text(text, marks), false);
          currentView.dispatch(tr.setStoredMarks(marks).scrollIntoView());
          return true;
        }
      }

      const textContentInHtml = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();
      const hasSubstantialText = text.trim().length > 0 || textContentInHtml.length > 0;

      if (!hasSubstantialText) {
        const image =
          Array.from(event.clipboardData?.files || []).find(file => file.type.startsWith('image/')) ||
          Array.from(event.clipboardData?.items || [])
            .find(item => item.type.startsWith('image/'))
            ?.getAsFile();
        if (image && imagesRef.current.onImageFile) {
          event.preventDefault();
          event.stopPropagation();
          beginImageRef.current(undefined, undefined, image);
          return true;
        }
        if (/<img\b/i.test(html)) {
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          const imgSrc = match?.[1] || '';
          if (imgSrc.startsWith('data:image/')) {
            try {
              event.preventDefault();
              event.stopPropagation();
              const [header, b64] = imgSrc.split(',');
              const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
              const binaryStr = atob(b64);
              const len = binaryStr.length;
              const u8arr = new Uint8Array(len);
              for (let i = 0; i < len; i++) u8arr[i] = binaryStr.charCodeAt(i);
              const ext =
                ({
                  'image/jpeg': 'jpg',
                  'image/webp': 'webp',
                  'image/gif': 'gif',
                  'image/svg+xml': 'svg',
                } as Record<string, string>)[mime] || 'png';
              const file = new File([u8arr], `img_${Date.now()}.${ext}`, { type: mime });
              beginImageRef.current(undefined, undefined, file);
              return true;
            } catch (err) {
              logWarn({
                file: 'frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts',
                func: 'handlePaste',
                doing: '클립보드 Base64 단독 이미지 디코딩 및 파일 변환 중',
                target: 'clipboard_data_image',
                error: err,
              });
            }
          }
          if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            event.preventDefault();
            event.stopPropagation();
            void (async () => {
              try {
                const resp = await fetch(imgSrc);
                if (resp.ok) {
                  const blob = await resp.blob();
                  const ext =
                    ({
                      'image/jpeg': 'jpg',
                      'image/webp': 'webp',
                      'image/gif': 'gif',
                      'image/svg+xml': 'svg',
                      'image/png': 'png',
                    } as Record<string, string>)[blob.type] || 'png';
                  const file = new File([blob], `img_${Date.now()}.${ext}`, { type: blob.type || 'image/png' });
                  beginImageRef.current(undefined, undefined, file);
                  return;
                }
              } catch (err) {
                logWarn({
                  file: 'frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts',
                  func: 'handlePaste',
                  doing: '클립보드 외부 웹 이미지 URL 다운로드 중',
                  target: imgSrc,
                  error: err,
                });
              }
              if (imagesRef.current.onImageFile) {
                beginImageRef.current(undefined, undefined);
              }
            })();
            return true;
          }
        }
      }

      if (hasRichHtml && !isExplicitPureMarkdown && codecRef.current) {
        event.preventDefault();
        event.stopPropagation();

        if (/<img\b[^>]*src=["']data:image\//i.test(html) && imagesRef.current.onImageFile) {
          void (async () => {
            try {
              const markdown = await importHtmlWithImages(html, async (base64, mime) => {
                const binaryStr = atob(base64);
                const len = binaryStr.length;
                const u8arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) u8arr[i] = binaryStr.charCodeAt(i);
                const ext =
                  ({
                    'image/jpeg': 'jpg',
                    'image/webp': 'webp',
                    'image/gif': 'gif',
                    'image/svg+xml': 'svg',
                  } as Record<string, string>)[mime] || 'png';
                const file = new File([u8arr], `paste_${Date.now()}.${ext}`, { type: mime });
                if (imagesRef.current.onImageFile) {
                  const saved = await imagesRef.current.onImageFile(file);
                  if (saved) return saved;
                }
                return `data:${mime};base64,${base64}`;
              });
              const cleanMd = sanitizePastedText(markdown);
              currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current!, cleanMd));
            } catch (err) {
              logError({
                file: 'frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts',
                func: 'handlePaste',
                doing: '외부 문서 HTML 및 인라인 Base64 이미지 스마트 붙여넣기 변환 중',
                target: 'clipboard_html_with_images',
                error: err,
              });
              const fallbackMd = htmlToImportMarkdown(html);
              currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current!, fallbackMd));
            }
          })();
          return true;
        }

        const convertedMd = htmlToImportMarkdown(html);
        if (convertedMd.trim()) {
          const cleanMd = sanitizePastedText(convertedMd);
          currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current, cleanMd));
          return true;
        }
      }

      if (codecRef.current) {
        let processedText = text;
        if (text.includes('\t') && text.includes('\n') && !text.includes('|')) {
          processedText = sanitizePastedText(text);
        }
        if (
          /^(?:\uFEFF)?---[^\S\r\n]*\r?\n/.test(processedText) ||
          /(^|\n)(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*>\s|```|\|)|\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\(|^\s*<(?:video|iframe)\b/.test(
            processedText
          )
        ) {
          currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current, processedText));
          return true;
        }
      }

      return false;
    },

    handleDrop(currentView, event) {
      clearDropIndicator();
      if (!currentView.editable) return false;
      const e = event as DragEvent;
      const dt = e.dataTransfer;
      if (!dt) return false;
      const types = dt.types ? Array.from(dt.types) : [];
      const isPotential =
        types.includes('Files') ||
        !!parseDroppedDataToBlob(dt) ||
        /^(?:file:\/\/\/|[A-Za-z]:[\\/])/.test(dt.getData('text/plain') || dt.getData('text/uri-list') || '');
      if (isPotential) {
        e.preventDefault();
        e.stopPropagation();
        void executeDropImageInsertion(currentView, e);
        return true;
      }
      return false;
    },

    handleClickOn(currentView, _pos, node, nodePos, event) {
      if (node.type === visualSchema.nodes.horizontal_rule) {
        event.preventDefault();
        placeCursorBeforeHorizontalRule(currentView, nodePos);
        caretRef.current?.schedule();
        return true;
      }
      return false;
    },

    handleClick(currentView, pos, event) {
      const isDrag =
        lastMouseDownCoords &&
        Math.hypot(event.clientX - lastMouseDownCoords.x, event.clientY - lastMouseDownCoords.y) > 4;
      if (
        !isDrag &&
        (!currentView.state.selection.empty || document.getSelection()?.isCollapsed === false) &&
        !event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const clicked = currentView.posAtCoords({ left: event.clientX, top: event.clientY });
        const caret = clicked?.pos ?? pos;
        currentView.dispatch(currentView.state.tr.setSelection(TextSelection.near(currentView.state.doc.resolve(caret))));
        currentView.focus();
        setSelection(false);
        return true;
      }
      const clickedFootnoteDef = (event.target as HTMLElement | null)?.closest('.visual-footnote-def');
      const clickedFootnoteArea = (event.target as HTMLElement | null)?.closest(
        '.visual-footnote-area-header, .visual-footnote-def-container'
      );
      if (clickedFootnoteArea && !clickedFootnoteDef) {
        event.preventDefault();
        return true;
      }
      const clickedHrPos = findClickedHorizontalRulePos(currentView, event);
      if (clickedHrPos >= 0) {
        event.preventDefault();
        placeCursorBeforeHorizontalRule(currentView, clickedHrPos);
        caretRef.current?.schedule();
        return true;
      }
      if (
        currentView.state.selection instanceof NodeSelection &&
        currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule
      ) {
        event.preventDefault();
        placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
        caretRef.current?.schedule();
        return true;
      }
      const emptyParagraphPos = emptyParagraphAtClick(currentView, event);
      if (emptyParagraphPos !== null && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        currentView.dispatch(
          currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, emptyParagraphPos))
        );
        currentView.focus();
        caretRef.current?.schedule();
        return true;
      }
      const lineEndPos = paragraphLineEndAtClick(currentView, event);
      if (lineEndPos !== null && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        currentView.dispatch(
          currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, lineEndPos))
        );
        currentView.focus();
        caretRef.current?.schedule();
        return true;
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      let href = anchor?.getAttribute('href') || '';
      if (!href) {
        const mark = currentView.state.doc
          .resolve(pos)
          .marks()
          .find(m => m.type === visualSchema.marks.link);
        if (mark?.attrs?.href) href = mark.attrs.href;
      }
      href = href.trim();
      if (!href) {
        if (!event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
          const target = event.target as HTMLElement | null;
          if (!target?.closest('a, button, input, select, textarea, [contenteditable="false"]')) {
            const coords = { left: event.clientX, top: event.clientY };
            const posInfo = currentView.posAtCoords(coords);
            let targetPos = posInfo && typeof posInfo.pos === 'number' ? posInfo.pos : null;
            if (targetPos === null) {
              const bounds = currentView.dom.getBoundingClientRect();
              if (event.clientY > bounds.bottom - 40) {
                targetPos = currentView.state.doc.content.size;
              } else {
                const clampX = Math.max(bounds.left + 8, Math.min(event.clientX, bounds.right - 8));
                const fallback = currentView.posAtCoords({ left: clampX, top: event.clientY });
                if (fallback && typeof fallback.pos === 'number') targetPos = fallback.pos;
              }
            }
            if (targetPos !== null) {
              const clamped = Math.max(0, Math.min(targetPos, currentView.state.doc.content.size));
              const $targetPos = currentView.state.doc.resolve(clamped);
              currentView.dispatch(currentView.state.tr.setSelection(TextSelection.near($targetPos)));
              currentView.focus();
              caretRef.current?.schedule();
              return true;
            }
          }
        }
        return false;
      }

      if (href.startsWith('<') && href.endsWith('>')) {
        href = href.slice(1, -1).trim();
      }
      href = href.replace(/^[<"']|[>"']$/g, '').trim();

      if (href.startsWith('#') || href.startsWith('.#')) {
        const rawId = href.startsWith('.#') ? href.slice(2) : href.slice(1);
        const targetId = decodeURIComponent(rawId);
        const targetEl =
          document.getElementById(targetId) ||
          Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(
            h => (h.textContent?.trim() || '').normalize('NFC') === targetId.normalize('NFC')
          );
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          event.preventDefault();
          return true;
        }
      }

      const isMdFile =
        href.endsWith('.md') || href.endsWith('.markdown') || href.includes('.md#') || href.includes('.markdown#');
      const isKnowledgeLink = href.startsWith('knowledge://');
      const isRelativeDoc =
        !/^(https?:|mailto:|tel:)/i.test(href) && (isMdFile || isKnowledgeLink || href.includes('.md'));

      if (isRelativeDoc && onFileOpenRef.current) {
        event.preventDefault();
        event.stopPropagation();
        const cleanHref = href.split('#')[0].replace(/^[<"']|[>"']$/g, '').trim();
        const hashPart = href.includes('#') ? href.split('#')[1].replace(/^[<"']|[>"']$/g, '').trim() : undefined;

        let resolved = cleanHref;
        if (cleanHref.startsWith('file:///')) {
          resolved = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
        } else if (currentFilePathRef.current) {
          resolved = resolveDocPath(cleanHref, currentFilePathRef.current);
        }
        onFileOpenRef.current(resolved, hashPart);
        return true;
      }

      let targetUrl = href;
      if (targetUrl.startsWith('www.')) targetUrl = `https://${targetUrl}`;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (
        api?.openExternal &&
        (targetUrl.startsWith('http://') ||
          targetUrl.startsWith('https://') ||
          targetUrl.startsWith('mailto:') ||
          targetUrl.startsWith('tel:'))
      ) {
        event.preventDefault();
        api.openExternal(targetUrl);
        return true;
      } else if (api?.openPath && (targetUrl.startsWith('file:///') || /^[a-zA-Z]:[/\\]/.test(targetUrl))) {
        event.preventDefault();
        const cleanLocalPath = targetUrl.startsWith('file:///')
          ? decodeURIComponent(targetUrl.replace(/^file:\/\/\//, ''))
          : targetUrl;
        api.openPath(cleanLocalPath);
        return true;
      } else if (/^(https?:|mailto:|tel:)/i.test(targetUrl) || targetUrl.startsWith('www.')) {
        event.preventDefault();
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      return false;
    },

    handleDOMEvents: {
      copy(currentView, event) {
        if (!hasMultiCellTableSelection(currentView.state)) return false;
        event.preventDefault();
        onToastRef.current?.(
          '여러 표 셀의 서식 복사는 지원하지 않습니다. 셀 안의 글을 각각 선택해 복사해 주세요.',
          'info'
        );
        return true;
      },
      cut(currentView, event) {
        if (!hasMultiCellTableSelection(currentView.state)) return false;
        event.preventDefault();
        onToastRef.current?.('여러 표 셀의 잘라내기는 표 구조를 보호하기 위해 사용할 수 없습니다.', 'info');
        return true;
      },
      mousedown(currentView, event) {
        if (!currentView.editable) return false;
        const e = event as MouseEvent;
        lastMouseDownCoords = { x: e.clientX, y: e.clientY };
        if (manualFloatingRef.current || selectionVisibleRef.current) {
          manualFloatingRef.current = false;
          setSelection(false);
        }
        if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
        const hrPos = findClickedHorizontalRulePos(currentView, e);
        if (hrPos >= 0) {
          e.preventDefault();
          e.stopPropagation();
          placeCursorBeforeHorizontalRule(currentView, hrPos);
          caretRef.current?.schedule();
          return true;
        }
        const target = e.target as HTMLElement | null;
        if (!target?.closest('a, button, input, textarea, pre, code, [contenteditable="false"]')) {
          const surfaceEl = currentView.dom;
          const lastChild = currentView.state.doc.lastChild;
          if (lastChild && lastChild.type === visualSchema.nodes.code_block) {
            const rect = surfaceEl.getBoundingClientRect();
            if (e.target === surfaceEl || e.clientY > rect.bottom - 60) {
              e.preventDefault();
              const afterPos = currentView.state.doc.content.size;
              let tr = currentView.state.tr;
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
              currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, afterPos + 1)).scrollIntoView());
              currentView.focus();
              caretRef.current?.schedule();
              return true;
            }
          }
        }
        return false;
      },
      compositionend(currentView) {
        setTimeout(() => {
          if (viewRef.current === currentView && !headingFormatsRef.current.readOnly && !currentView.composing) {
            currentView.dispatch(currentView.state.tr.setMeta('onrivi:heading-numbering', true));
          }
        }, 50);
        return false;
      },
      compositionstart(currentView) {
        if (
          currentView.state.selection instanceof NodeSelection &&
          currentView.state.selection.node.type === visualSchema.nodes.horizontal_rule
        ) {
          placeCursorBeforeHorizontalRule(currentView, currentView.state.selection.from);
          caretRef.current?.schedule();
        }
        return false;
      },
      dragover(currentView, event) {
        if (!currentView.editable) return false;
        const e = event as DragEvent;
        const types = e.dataTransfer?.types;
        if (
          !types ||
          !Array.from(types).some(
            t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain'
          )
        ) {
          return false;
        }
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        updateDropIndicator(currentView, e);
        return true;
      },
      dragenter(currentView, event) {
        if (!currentView.editable) return false;
        const e = event as DragEvent;
        const types = e.dataTransfer?.types;
        if (
          !types ||
          !Array.from(types).some(
            t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain'
          )
        ) {
          return false;
        }
        e.preventDefault();
        e.stopPropagation();
        updateDropIndicator(currentView, e);
        return true;
      },
      dragleave(currentView, event) {
        const e = event as DragEvent;
        if (!currentView.dom.contains(e.relatedTarget as Node | null)) {
          clearDropIndicator();
        }
        return false;
      },
      drop(currentView, event) {
        clearDropIndicator();
        const e = event as DragEvent;
        const dt = e.dataTransfer;
        if (!dt || !currentView.editable) return false;
        const types = dt.types ? Array.from(dt.types) : [];
        const isPotential = types.some(
          t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain'
        );
        if (isPotential) {
          e.preventDefault();
          e.stopPropagation();
          void executeDropImageInsertion(currentView, e);
          return true;
        }
        return false;
      },
      mouseup(currentView) {
        cancelAnimationFrame(cursorFrame.current);
        cursorFrame.current = requestAnimationFrame(() => {
          if (viewRef.current !== currentView || currentView.composing || !currentView.hasFocus()) return;
          synchronizeTextSelection(currentView);
          const codec = codecRef.current;
          if (!codec || !cursorCallback.current) return;
          try {
            const token = 'ONRIVICURSORMAP';
            const offset = codec
              .serialize(currentView.state.tr.insertText(token, currentView.state.selection.head).doc)
              .indexOf(token);
            if (offset >= 0) cursorCallback.current(offset, true);
          } catch (err) {
            logWarn({
              file: 'frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts',
              func: 'mouseup',
              doing: '마우스 업 시 마크다운 소스 커서 오프셋 역산 동기화 중',
              target: 'ONRIVICURSORMAP',
              error: err,
            });
          }
        });
        return false;
      },
      blur(_currentView, event) {
        const next = (event as FocusEvent).relatedTarget;
        if (next instanceof Node && document.getElementById('floating-toolbar')?.contains(next)) return false;
        manualFloatingRef.current = false;
        setSelection(false);
        setSlash(false);
        return false;
      },
    },
  };
}
