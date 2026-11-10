// ====================================================================
// 📊 [OMD-CORE-VisualEditor-ProseMirrorHandlers] frontend/src/components/visualEditor/visualEditorProseMirrorHandlers.ts
// 🎯 @KICK  : 시각 에디터(VisualDocumentEditor)의 ProseMirror Keymap, 키보드/텍스트 입력, 스마트 붙여넣기(handlePaste), 드롭(handleDrop), 마우스 클릭/링크 이동(handleClick) 및 DOM 이벤트 핸들러 팩토리
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 클립보드 이미지/HTML 붙여넣기 정제, 5대 정밀 진단 로깅(logError/logWarn) 준수
// 🚨 @PATCH : 2026-11-10 — [코드블록 내부 handleKeyDown 우선 가로채기 적용으로 새 코드블록 생성 결함 원천 차단]:
//             1) handleKeyDown에서 code_block 내부 Shift+Enter를 직접 가로채어 문단(\\n\\n 또는 빈행 시 \\n) 삽입을 전담하고 tr.split($from.pos) 호출을 원천 차단하여 새 코드블록 생성 완벽 방어
//             2) handleKeyDown에서 code_block 내부 Enter는 단순 문장 줄바꿈(\\n 1개) 전담
// 🚨 @PATCH : 2026-11-10 — [코드블록 내부 Enter 문장·Shift+Enter 문단 처리 및 코드블록 탈출 방어]:
//             1) 코드블록 내부에서 Shift+Enter 입력 시 코드블록을 벗어나 새 코드블록이 생성되던 exitCode 기능 완전 제거
//             2) 코드블록 내부 Shift+Enter 시 paragraphInCodeBlock을 통해 문단(\\n\\n)으로 나누어 처리하고, 문장 빈행이 있을 때 Shift+Enter 입력 시 문단(\\n 추가)으로 변경
//             3) 코드블록 내부 Enter는 newlineInCode를 통해 단순 문장 줄바꿈(\\n) 유지
// 🚨 @PATCH : 2026-11-08 — [리스트 내부 Enter 다음 리스트 추가 & Shift+Enter 리스트 탈출 새 문단 전환 구현]:
//             1) 리스트 항목 내부에서 Enter 입력 시 splitListItem을 통해 다음 리스트 항목(list_item)을 즉시 추가 (빈 항목일 때는 exitEmptyListItem으로 리스트 탈출)
//             2) 리스트 항목 내부에서 Shift+Enter 입력 시 exitListToParagraph를 실행하여 리스트를 완전히 탈출하고 독립된 새로운 일반 문단(paragraph) 생성
//             3) 리스트 항목 내부에서는 문단 시작 Enter 무반응 방어가 간섭하지 않도록 !insideListItem 조건 격리
// 🚨 @PATCH : 2026-11-08 — [Enter 문단 시작 무반응 유지 & Shift+Enter 빈 행 문단 전환 전면 탑재]:
//             1) 문단 맨 시작($from.parentOffset === 0)에서 Enter 입력 시 문단이 밀리지 않고 반응 없이 커서를 제자리에 유지
//             2) Enter 입력 후 한 글자도 입력하지 않은 빈 행(hard_break)에서 Shift+Enter 입력 시 hard_break를 제거하고 독립된 새 문단(paragraph) 행으로 전환
//             3) 글이 있는 상태에서 Shift+Enter 입력 시 다음 줄에 새로운 문단(paragraph) 생성 분리
// 🚨 @PATCH : 2026-11-08 — [표 셀 Shift 연속 누적 선택 한 칸 멈춤 결함 완전 해결]:
//             1) Shift 선택 시 $from(시작 셀 고정) 대신 tableContextAt($head)를 통해 현재 이동 중인 활성 헤드 좌표를 실시간 추적하도록 전환
//             2) Shift+방향키 입력 시 불필요한 endOfTextblock(텍스트 블록 끝) 조건을 배제하고 엑셀처럼 2행, 3행 이상 무제한 연속 누적 선택이 매끄럽게 확장되도록 개선
// 🚨 @PATCH : 2026-11-08 — [표 셀 방향키 이동, Shift 누적 선택, End 모드 및 끝점 점프 전면 탑재]:
//             1) 표 내부에서 상/하/좌/우 방향키 입력 시 셀 경계 감지(endOfTextblock)를 통해 행·열 인접 셀로 자연스러운 커서 이동 지원
//             2) Shift + 방향키 조합 시 현재 anchor로부터 대상 셀까지 TextSelection 누적 범위 선택(엑셀식 다중 셀 선택) 완벽 지원
//             3) End 키 입력 후 우/아래 방향키 또는 Ctrl+방향키 입력 시 현재 행의 마지막 열 및 현재 열의 마지막 행으로 즉시 점프 이동 지원
// 🚨 @PATCH : 2026-11-08 — [표 일부분/단일 셀 선택 복사 시 순수 텍스트 추출 보장]: clipboardTextSerializer에서 동일 표 셀 내부 선택(isSingleCellSelection) 감지 시 표 껍데기(|---|)를 배제하고 해당 셀의 순수 문자/단어만 복사하여, 붙여넣기 시 표가 아닌 순수 글자만 깔끔하게 붙여넣어지도록 개선
// 🚨 @PATCH : 2026-11-08 — [외부 표 붙여넣기 및 표 복사·잘라내기(Copy/Cut) 전면 지원]: handlePaste에서 외부 엑셀/웹 표 붙여넣기 시 네이티브 위지윅 표로 즉시 변환 삽입하고, handleDOMEvents의 copy/cut에서 다중 셀 및 전체 표 선택 시 마크다운(|---|)과 HTML(<table>) 양방향 클립보드 서식 복사 및 안전한 잘라내기를 지원하도록 개선
// 🚨 @PATCH : 2026-11-08 — [표 내부 모든 셀(빈 셀 및 내용 셀) 클릭 시 제자리 정확 안착 및 편집 활성화 보장]: handleClick에서 표 셀(td, th) 클릭 감지 시, 좌표 기반 posAtCoords 검증과 posAtDOM(targetCell) 셀 범위 격리를 결합하여 클릭한 바로 그 셀의 문단 내부로 커서를 정밀 안착시키고 포커스를 활성화하여 즉시 타이핑 수정이 가능하도록 전면 개선
// 🚨 @PATCH : 2026-11-08 — [인용문 및 본문 Enter / Shift+Enter 동작 전환]: Enter 입력 시 인용문/본문 모두 문단 간격 없는 다음 문장(줄바꿈 hard_break, 빈 인용문/항목 exitQuote/exitEmptyListItem)으로 이동하고, Shift+Enter 입력 시 문단 간격 분리(신규 문단 paragraph 및 새 목록 항목 splitListItem)로 전환
// 🚨 @PATCH : 2026-11-07 — [문서 링크 클릭 시 단일 경로 위임]: cleanHref를 불필요하게 사전 resolveDocPath하지 않고 원본 상대 경로를 onFileOpenRef에 직접 위임하여, 상위 EditorCore 및 isPathInsideWorkspace 간의 이중 경로 결합(도움말/도움말/...)을 원천 차단
// 🚨 @PATCH : 2026-11-07 — [컨트롤 내부 문구/단어 복사 시 껍데기 박리 및 순수 서식 텍스트 보존 복사]: clipboardTextSerializer에서 리스트/인용구/표 내부 문구·단어 복사 시 innermostContent 언래핑을 통해 부모 컨트롤 마커(-, 1., > 등)를 벗겨내고 단어와 인라인 서식만 복사하며, 리스트 전체 및 다중 항목 복사 시에는 문단 복사와 동일하게 온전한 마크다운 구조를 직렬화하도록 개선
// 🚨 @PATCH : 2026-11-07 — [태그 보존 복사 및 마우스 드래그 선택 안정화]: clipboardTextSerializer를 구현하여 마크다운 태그(서식/코드블록/헤딩/인라인) 원본 보존 복사를 지원하고, handleClick에서 드래그 선택(isDrag) 시 선택 영역 붕괴를 원천 방어
// 🚨 @PATCH : 2026-11-05 — [목록 선택 후 클릭]: 선택된 목록을 일반 클릭하면 클릭 위치로 커서를 접고 선택을 해제한다.
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 코어 엔진 모듈화]: ProseMirror 이벤트/단축키/스마트 붙여넣기 핸들러 분리 및 5대 진단 로깅 적용
// 🔗 @CALLS : markdownPasteTransaction, markdownPasteInTableCellTransaction, htmlToImportMarkdown, importHtmlWithImages, sanitizePastedText
// ====================================================================

import type React from 'react';
import { NodeSelection, TextSelection, type Command, type Plugin } from 'prosemirror-state';
import type { EditorProps, EditorView } from 'prosemirror-view';
import type { Slice } from 'prosemirror-model';
import { baseKeymap, chainCommands, exitCode, newlineInCode, toggleMark } from 'prosemirror-commands';
import { splitListItem } from 'prosemirror-schema-list';
import { undo, redo, closeHistory } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { undoInputRule } from 'prosemirror-inputrules';
import { createVisualDocumentCodec, visualSchema, visualSerializer } from '@/lib/visualDocumentCodec';
import { withIndependentQuotes, protectQuoteBoundary, liftQuoteAtStart } from '@/lib/visualQuoteCommands';
import {
  removeListMarkerAtStart,
  moveUpFromEmptyOrderedItem,
  exitEmptyListItem,
  exitListToParagraph,
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
  tableContextAt,
  tableAction,
  moveTableCell,
  tableEnter,
  clearMultiCellTableSelection,
  hasMultiCellTableSelection,
  tableCellAt,
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
/**
 * 🌟 [코드블록 내부 Shift+Enter 전담 커맨드]
 * 1) 코드블록 내부에서 Shift+Enter 입력 시 탈출하지 않고 문단(\n\n)으로 나누어 처리
 * 2) 현재 줄이 문장 빈행(공백/빈 줄)이거나 이전 줄바꿈 상태에서 Shift+Enter를 치면 문단 간격(\n\n)으로 변경
 * 3) Shift+Enter로 코드블록을 벗어나서 새 코드블록이 생성되던 기존 exitCode 기능 완전 제거
 */
const paragraphInCodeBlock: Command = (state, dispatch) => {
  const { $from } = state.selection;
  if ($from.parent.type !== visualSchema.nodes.code_block) return false;
  if (dispatch) {
    const parent = $from.parent;
    const offset = $from.parentOffset;
    const textBefore = parent.textBetween(0, offset, '\n', '\n');
    const textAfter = parent.textBetween(offset, parent.content.size, '\n', '\n');

    // 현재 커서가 위치한 라인의 앞/뒤 텍스트
    const lastNewlineBefore = textBefore.lastIndexOf('\n');
    const currentLineBefore = lastNewlineBefore === -1 ? textBefore : textBefore.slice(lastNewlineBefore + 1);
    const nextNewlineAfter = textAfter.indexOf('\n');
    const currentLineAfter = nextNewlineAfter === -1 ? textAfter : textAfter.slice(0, nextNewlineAfter);
    const currentLine = currentLineBefore + currentLineAfter;

    // 만약 현재 줄이 이미 빈 행(문장 빈행)이거나 직전에 \n이 연속되어 있다면 \n 1개만 더 삽입하여 문단(\n\n)으로 완성
    let insertText = '\n\n';
    if (currentLine.trim() === '' || textBefore.endsWith('\n')) {
      insertText = '\n';
    }

    const tr = state.tr.replaceSelectionWith(state.schema.text(insertText)).scrollIntoView();
    dispatch(tr);
  }
  return true;
};

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
      exitQuote(true),
      headingEnter,
      newlineInCode,
      (state, dispatch) => {
        if (dispatch) dispatch(state.tr.replaceSelectionWith(visualSchema.nodes.hard_break.create()).scrollIntoView());
        return true;
      }
    ),
    'Shift-Enter': chainCommands(
      paragraphInCodeBlock,
      exitListToParagraph,
      headingEnter,
      baseKeymap.Enter
    ),
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
  | 'handleKeyDown'
  | 'handleTextInput'
  | 'handlePaste'
  | 'handleDrop'
  | 'handleClickOn'
  | 'handleClick'
  | 'handleDOMEvents'
  | 'clipboardTextSerializer'
> {
  let lastMouseDownCoords: { x: number; y: number } | null = null;
  let tableEndMode = false;
  let tableEndTimer: any = null;

  const resetTableEndMode = () => {
    tableEndMode = false;
    if (tableEndTimer) {
      clearTimeout(tableEndTimer);
      tableEndTimer = null;
    }
  };

  const activateTableEndMode = () => {
    tableEndMode = true;
    if (tableEndTimer) clearTimeout(tableEndTimer);
    tableEndTimer = setTimeout(() => {
      tableEndMode = false;
      tableEndTimer = null;
    }, 2500);
  };

  return {
    handleKeyDown(currentView, event) {
      if (!currentView.editable || event.isComposing) return false;
      if (event.key === 'Enter') {
        const { $from, empty } = currentView.state.selection;
        const isFootnoteDef =
          $from.parent.type === visualSchema.nodes.visual_footnote_def ||
          ($from.nodeAfter && $from.nodeAfter.type === visualSchema.nodes.visual_footnote_def) ||
          ($from.nodeBefore && $from.nodeBefore.type === visualSchema.nodes.visual_footnote_def);
        if (isFootnoteDef) {
          event.preventDefault();
          return true;
        }

        // 🌟 [코드블록 내부 전용: Enter는 문장 줄바꿈(\n), Shift+Enter는 문단(\n\n 또는 빈행 시 문단 완성) 처리]
        // 🛡️ 코드블록 내부에서 Shift+Enter 시 tr.split($from.pos)로 새 코드블록이 생성되던 결함 원천 차단
        if (
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          !slashOpenRef.current &&
          empty &&
          $from.parent.type === visualSchema.nodes.code_block
        ) {
          event.preventDefault();
          if (event.shiftKey) {
            // Shift + Enter: 문단으로 나누어 처리 (코드블록 탈출 절대 금지, 새 코드블록 분할 금지)
            const parent = $from.parent;
            const offset = $from.parentOffset;
            const textBefore = parent.textBetween(0, offset, '\n', '\n');
            const textAfter = parent.textBetween(offset, parent.content.size, '\n', '\n');

            const lastNewlineBefore = textBefore.lastIndexOf('\n');
            const currentLineBefore = lastNewlineBefore === -1 ? textBefore : textBefore.slice(lastNewlineBefore + 1);
            const nextNewlineAfter = textAfter.indexOf('\n');
            const currentLineAfter = nextNewlineAfter === -1 ? textAfter : textAfter.slice(0, nextNewlineAfter);
            const currentLine = currentLineBefore + currentLineAfter;

            // 현재 줄이 이미 빈 행(문장 빈행)이거나 직전에 \n이 있는 상태에서 Shift+Enter를 치면 문단(\n 1개 추가)으로 변경
            let insertText = '\n\n';
            if (currentLine.trim() === '' || textBefore.endsWith('\n')) {
              insertText = '\n';
            }
            const tr = currentView.state.tr.replaceSelectionWith(currentView.state.schema.text(insertText)).scrollIntoView();
            currentView.dispatch(tr);
            caretRef.current?.schedule();
            return true;
          } else {
            // Enter: 문장 줄바꿈 (\n 1개)
            const tr = currentView.state.tr.replaceSelectionWith(currentView.state.schema.text('\n')).scrollIntoView();
            currentView.dispatch(tr);
            caretRef.current?.schedule();
            return true;
          }
        }

        let insideListItem = false;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === visualSchema.nodes.list_item) {
            insideListItem = true;
            break;
          }
        }

        // 🌟 [요구사항 1: 문단 시작 Enter 무반응 방어]
        // 문단 맨 시작(parentOffset === 0)에서 Enter 입력 시 문단이 밀리지 않고 커서를 제자리에 유지
        // 단, 리스트 내부(!insideListItem)나 표(!tableContext), 코드블록은 제외
        if (
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          !slashOpenRef.current &&
          empty &&
          !insideListItem &&
          $from.parent.isTextblock &&
          $from.parent.type !== visualSchema.nodes.code_block &&
          $from.parentOffset === 0 &&
          $from.parent.content.size > 0 &&
          !tableContext(currentView.state)
        ) {
          event.preventDefault();
          return true;
        }

        // 🌟 [요구사항: 리스트 내부에서 Enter 입력 시 다음 리스트 항목 추가]
        if (
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          !slashOpenRef.current &&
          empty &&
          insideListItem
        ) {
          if (exitEmptyListItem(currentView.state, currentView.dispatch, currentView)) {
            event.preventDefault();
            caretRef.current?.schedule();
            return true;
          }
          const parent = $from.depth > 0 ? $from.node($from.depth - 1) : null;
          const didSplit = splitListItem(
            visualSchema.nodes.list_item,
            parent?.type === visualSchema.nodes.list_item && parent.attrs.checked !== null ? { checked: false } : undefined
          )(currentView.state, currentView.dispatch, currentView);
          if (didSplit) {
            event.preventDefault();
            caretRef.current?.schedule();
            return true;
          }
        }

        // 🌟 [요구사항 2: Shift + Enter 리스트 탈출 및 빈 행 문단 전환 및 글이 있을 때 새 문단 생성]
        if (
          event.shiftKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey &&
          !slashOpenRef.current &&
          empty &&
          $from.parent.isTextblock &&
          $from.parent.type !== visualSchema.nodes.code_block &&
          !tableContext(currentView.state)
        ) {
          // A) 리스트 내부인 경우: 리스트를 벗어나서 새로운 독립 문단(paragraph) 생성!
          if (insideListItem) {
            event.preventDefault();
            exitListToParagraph(currentView.state, currentView.dispatch, currentView);
            caretRef.current?.schedule();
            return true;
          }

          const nodeBefore = $from.nodeBefore;
          // B) Enter 입력 후 한 글자도 입력 안 한 빈 행(hard_break 뒤)인 경우:
          // 앞선 hard_break를 삭제하고 해당 위치에서 문단을 분리하여 독립된 새 문단(paragraph)으로 전환
          if (nodeBefore && nodeBefore.type === visualSchema.nodes.hard_break) {
            event.preventDefault();
            const breakPos = $from.pos - nodeBefore.nodeSize;
            let tr = currentView.state.tr.delete(breakPos, $from.pos);
            tr = tr.split(breakPos);
            currentView.dispatch(tr.scrollIntoView());
            caretRef.current?.schedule();
            return true;
          }

          // C) 글이 있는 상태(문장 중간 또는 끝): 다음 줄에 새로운 문단(paragraph) 생성
          event.preventDefault();
          let tr = currentView.state.tr.split($from.pos);
          currentView.dispatch(tr.scrollIntoView());
          caretRef.current?.schedule();
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
      // 📊 [표 셀 방향키 이동, Shift 누적 선택, End 모드 및 끝점 점프 처리]
      const tblCtx = tableContext(currentView.state);
      if (tblCtx && !slashOpenRef.current) {
        // 1) End 키 입력: 엑셀 스타일 End 모드 활성화 (2.5초 대기)
        if (event.key === 'End' && !event.altKey && !event.metaKey) {
          activateTableEndMode();
          if (!event.ctrlKey) {
            event.preventDefault();
            const from = currentView.state.selection.$from;
            const endPos = from.end();
            if (event.shiftKey) {
              const anchor = currentView.state.selection.anchor;
              currentView.dispatch(
                currentView.state.tr.setSelection(
                  TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(endPos))
                ).scrollIntoView()
              );
            } else {
              currentView.dispatch(
                currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, endPos)).scrollIntoView()
              );
            }
            caretRef.current?.schedule();
            return true;
          }
        }

        // 2) 방향키 처리 (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          const isEndJump = tableEndMode || event.ctrlKey || event.metaKey;
          const headCtx = tableContextAt(currentView.state.selection.$head) || tblCtx;
          const tableNode = headCtx.table;
          const tablePos = headCtx.pos;
          const headRow = headCtx.row;
          const headCol = headCtx.column;
          const rowCount = tableNode.childCount;
          const colCount = tableNode.child(headRow).childCount;

          if (isEndJump) {
            resetTableEndMode();
            let targetR = headRow;
            let targetC = headCol;

            if (event.key === 'ArrowRight') {
              targetC = colCount - 1;
            } else if (event.key === 'ArrowDown') {
              targetR = rowCount - 1;
            } else if (event.key === 'ArrowLeft') {
              targetC = 0;
            } else if (event.key === 'ArrowUp') {
              targetR = 0;
            }

            event.preventDefault();
            const targetInfo = tableCellAt(tableNode, tablePos, targetR, targetC);
            if (event.shiftKey) {
              const anchor = currentView.state.selection.anchor;
              const targetHead = (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                ? targetInfo.contentEnd
                : targetInfo.contentStart;
              currentView.dispatch(
                currentView.state.tr.setSelection(
                  TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(targetHead))
                ).scrollIntoView()
              );
            } else {
              currentView.dispatch(
                currentView.state.tr.setSelection(
                  TextSelection.create(currentView.state.doc, targetInfo.contentStart)
                ).scrollIntoView()
              );
            }
            caretRef.current?.schedule();
            return true;
          }

          resetTableEndMode();

          // 🌟 [A] Shift 키를 누른 상태: 셀 단위 무제한 연속 누적 선택 (엑셀식 동작)
          if (event.shiftKey) {
            const anchor = currentView.state.selection.anchor;
            if (event.key === 'ArrowDown') {
              if (headRow < rowCount - 1) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow + 1, headCol);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(targetInfo.contentEnd))
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            } else if (event.key === 'ArrowUp') {
              if (headRow > 0) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow - 1, headCol);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(targetInfo.contentStart))
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            } else if (event.key === 'ArrowRight') {
              if (headCol < colCount - 1) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow, headCol + 1);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(targetInfo.contentEnd))
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            } else if (event.key === 'ArrowLeft') {
              if (headCol > 0) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow, headCol - 1);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.between(currentView.state.doc.resolve(anchor), currentView.state.doc.resolve(targetInfo.contentStart))
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            }
          }

          // 🌟 [B] 일반 방향키: 셀 내부 경계 도달 시 인접 셀로 커서 이동
          if (!event.shiftKey) {
            if (event.key === 'ArrowDown') {
              const atEnd = currentView.endOfTextblock('down');
              if (atEnd && headRow < rowCount - 1) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow + 1, headCol);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.create(currentView.state.doc, targetInfo.contentStart)
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            } else if (event.key === 'ArrowUp') {
              const atStart = currentView.endOfTextblock('up');
              if (atStart && headRow > 0) {
                event.preventDefault();
                const targetInfo = tableCellAt(tableNode, tablePos, headRow - 1, headCol);
                currentView.dispatch(
                  currentView.state.tr.setSelection(
                    TextSelection.create(currentView.state.doc, targetInfo.contentStart)
                  ).scrollIntoView()
                );
                caretRef.current?.schedule();
                return true;
              }
            } else if (event.key === 'ArrowRight') {
              const atEnd = currentView.endOfTextblock('right');
              if (atEnd) {
                let targetR = headRow;
                let targetC = headCol + 1;
                if (targetC >= colCount && headRow < rowCount - 1) {
                  targetR = headRow + 1;
                  targetC = 0;
                }
                if (targetC < tableNode.child(targetR).childCount) {
                  event.preventDefault();
                  const targetInfo = tableCellAt(tableNode, tablePos, targetR, targetC);
                  currentView.dispatch(
                    currentView.state.tr.setSelection(
                      TextSelection.create(currentView.state.doc, targetInfo.contentStart)
                    ).scrollIntoView()
                  );
                  caretRef.current?.schedule();
                  return true;
                }
              }
            } else if (event.key === 'ArrowLeft') {
              const atStart = currentView.endOfTextblock('left');
              if (atStart) {
                let targetR = headRow;
                let targetC = headCol - 1;
                if (targetC < 0 && headRow > 0) {
                  targetR = headRow - 1;
                  targetC = tableNode.child(targetR).childCount - 1;
                }
                if (targetR >= 0 && targetC >= 0) {
                  event.preventDefault();
                  const targetInfo = tableCellAt(tableNode, tablePos, targetR, targetC);
                  currentView.dispatch(
                    currentView.state.tr.setSelection(
                      TextSelection.create(currentView.state.doc, targetInfo.contentEnd)
                    ).scrollIntoView()
                  );
                  caretRef.current?.schedule();
                  return true;
                }
              }
            }
          }
        } else if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Meta') {
          resetTableEndMode();
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
          const isPastedTable = /\|[\s\t]*:?---*:?[\s\t]*\|/.test(cellSource) || (cellSource.includes('\t') && cellSource.includes('\n'));
          if (isPastedTable && codecRef.current) {
            event.preventDefault();
            event.stopPropagation();
            const tblCtx = tableContext(currentView.state);
            if (tblCtx) {
              const isCurrentTableEmpty = !tblCtx.table.textContent.trim();
              if (isCurrentTableEmpty) {
                const tr = currentView.state.tr.replaceWith(tblCtx.pos, tblCtx.pos + tblCtx.table.nodeSize, visualSchema.nodes.paragraph.create());
                tr.setSelection(TextSelection.create(tr.doc, tblCtx.pos + 1));
                const newState = currentView.state.apply(tr);
                currentView.dispatch(markdownPasteTransaction(newState, codecRef.current, cellSource));
              } else {
                currentView.dispatch(markdownPasteTransaction(currentView.state, codecRef.current, cellSource));
              }
              return true;
            }
          }
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
      const isDrag = Boolean(
        lastMouseDownCoords &&
        Math.hypot(event.clientX - lastMouseDownCoords.x, event.clientY - lastMouseDownCoords.y) > 4
      );
      if (isDrag) {
        return false;
      }
      if (
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
      // 💡 표 셀 클릭 가드: 표 내부의 임의의 셀(빈 셀 또는 내용이 있는 셀) 클릭 시 해당 셀 내부로 정확히 커서 안착 및 편집 활성화
      const targetCell = (event.target as HTMLElement | null)?.closest('td, th') as HTMLElement | null;
      const isCellInteractive = Boolean((event.target as HTMLElement | null)?.closest('a, button, input, select, textarea'));
      if (targetCell && !isCellInteractive && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        try {
          const cellPos = currentView.posAtDOM(targetCell, 0);
          if (typeof cellPos === 'number' && cellPos >= 0) {
            const $resolved = currentView.state.doc.resolve(cellPos);
            const cellStart = $resolved.start();
            const cellEnd = $resolved.end();

            // 클릭한 좌표(clientX, clientY)의 위치 계산
            const coords = { left: event.clientX, top: event.clientY };
            const posInfo = currentView.posAtCoords(coords);
            let targetPos: number | null = null;

            if (posInfo && typeof posInfo.pos === 'number' && posInfo.pos >= cellStart && posInfo.pos <= cellEnd) {
              targetPos = posInfo.pos;
            } else {
              // 여백 클릭 또는 좌표가 셀 범위를 벗어난 경우 셀 내부 문단 끝 또는 시작으로 안전하게 안착
              const cellNode = currentView.state.doc.nodeAt(cellStart);
              if (cellNode && cellNode.isTextblock) {
                targetPos = cellStart + Math.max(0, cellNode.content.size);
              } else {
                targetPos = Math.min(cellStart + 1, cellEnd);
              }
            }

            const clamped = Math.max(0, Math.min(targetPos, currentView.state.doc.content.size));
            const sel = TextSelection.near(currentView.state.doc.resolve(clamped));
            currentView.dispatch(currentView.state.tr.setSelection(sel));
            currentView.focus();
            caretRef.current?.schedule();
            return true;
          }
        } catch {}
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

        let targetDoc = cleanHref;
        if (cleanHref.startsWith('file:///')) {
          targetDoc = decodeURIComponent(cleanHref.replace(/^file:\/\/\//, ''));
        }
        onFileOpenRef.current(targetDoc, hashPart);
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

    clipboardTextSerializer(slice: Slice, currentView: EditorView) {
      if (!slice || slice.content.size === 0) return '';
      const { $from, $to } = currentView.state.selection;

      // 0. 단일 표 셀 내부의 일부분(문자/단어) 선택 복사 판별:
      //    $from과 $to가 동일한 table_cell 또는 table_header 내부에 위치하는 경우,
      //    표 껍데기(|---|)를 절대 붙이지 않고 해당 셀의 순수 문자/단어(인라인 서식)만 반환
      const getTableCellPos = ($pos: typeof $from) => {
        for (let d = $pos.depth; d > 0; d--) {
          const name = $pos.node(d).type.name;
          if (name === 'table_cell' || name === 'table_header') return $pos.before(d);
        }
        return -1;
      };
      const fromCellPos = getTableCellPos($from);
      const toCellPos = getTableCellPos($to);
      const isSingleCellSelection = fromCellPos >= 0 && fromCellPos === toCellPos;

      if (isSingleCellSelection) {
        let inner = slice.content;
        let d = slice.openStart;
        while (d > 0 && inner.childCount === 1 && inner.firstChild && !inner.firstChild.isInline) {
          inner = inner.firstChild.content;
          d--;
        }
        try {
          const tempPara = visualSchema.nodes.paragraph.create(null, inner);
          const tempDoc = visualSchema.nodes.doc.create(null, [tempPara]);
          const md = visualSerializer.serialize(tempDoc);
          return md.replace(/^\r?\n+|\r?\n+$/g, '');
        } catch {
          return inner.textBetween(0, inner.size, '\n');
        }
      }

      // 0-1. 복수 셀 또는 표 전체 선택 복사 시에만 마크다운 표 원본 형태(|---|) 유지
      if (slice.content.childCount === 1 && slice.content.firstChild?.type === visualSchema.nodes.table) {
        try {
          const tempDoc = visualSchema.nodes.doc.create(null, [slice.content.firstChild]);
          const md = visualSerializer.serialize(tempDoc);
          return md.replace(/^\r?\n+|\r?\n+$/g, '');
        } catch {
          return slice.content.textBetween(0, slice.content.size, '\t', '\n');
        }
      }
      // 1. 단일 code_block 노드 선택 복사 시 마크다운 코드블록 원본 형태 유지
      if (slice.content.childCount === 1 && slice.content.firstChild?.type === visualSchema.nodes.code_block) {
        const node = slice.content.firstChild;
        const params = (node.attrs.params || '').trim();
        const codeText = node.textContent;
        return '```' + params + '\n' + codeText + (codeText.endsWith('\n') ? '' : '\n') + '```';
      }
      // 2. code_block 내부 텍스트 선택 복사 시 줄바꿈 코드 텍스트 유지
      if ($from.parent.type === visualSchema.nodes.code_block) {
        return slice.content.textBetween(0, slice.content.size, '\n');
      }

      // 3. 단일 문단(list_item 내부 문단, blockquote 내부 문단, table_cell, 일반 paragraph 등) 내 문구/단어 선택 판별
      //    $from.sameParent($to)이거나, 슬라이스를 안쪽으로 언래핑했을 때 인라인 노드들만 남는 경우:
      //    리스트 마커(-, 1.), 인용구(>), 표 등의 컨트롤 래퍼를 벗겨내고 순수 단어/문구와 인라인 서식만 복사
      let innermostContent = slice.content;
      let depth = slice.openStart;
      while (depth > 0 && innermostContent.childCount === 1 && innermostContent.firstChild && !innermostContent.firstChild.isInline) {
        innermostContent = innermostContent.firstChild.content;
        depth--;
      }

      let allInline = true;
      innermostContent.forEach(child => {
        if (!child.isInline) allInline = false;
      });

      const isSingleTextblockSelection = ($from.sameParent($to) && $from.parent.isTextblock) || allInline;

      try {
        if (isSingleTextblockSelection && allInline) {
          // 문단 내 문구/단어 복사: 리스트/인용구/표 껍데기 없이 단어/문구와 인라인 서식(볼드/링크/코드 등)만 직렬화
          const tempPara = visualSchema.nodes.paragraph.create(null, innermostContent);
          const tempDoc = visualSchema.nodes.doc.create(null, [tempPara]);
          const md = visualSerializer.serialize(tempDoc);
          return md.replace(/^\r?\n+|\r?\n+$/g, '');
        } else {
          // 리스트 전체, 여러 항목, 다중 문단 복사: 일반 문단 복사와 동일하게 구조 및 줄바꿈 보존 직렬화
          const tempDoc = visualSchema.nodes.doc.create(null, slice.content);
          const md = visualSerializer.serialize(tempDoc);
          return md.replace(/^\r?\n+|\r?\n+$/g, '');
        }
      } catch {
        return slice.content.textBetween(0, slice.content.size, '\n\n', '\n');
      }
    },

    handleDOMEvents: {
      copy(currentView, event) {
        if (hasMultiCellTableSelection(currentView.state)) {
          const slice = currentView.state.selection.content();
          const tableNode = slice.content.firstChild?.type === visualSchema.nodes.table ? slice.content.firstChild : null;
          let md = '';
          let html = '';
          if (tableNode) {
            try {
              const tempDoc = visualSchema.nodes.doc.create(null, [tableNode]);
              md = visualSerializer.serialize(tempDoc).replace(/^\r?\n+|\r?\n+$/g, '');
              html = '<table border="1">';
              tableNode.forEach((row, _, rIdx) => {
                html += '<tr>';
                row.forEach(cell => {
                  const tag = cell.type.name === 'table_header' || rIdx === 0 ? 'th' : 'td';
                  html += `<${tag}>${cell.textContent.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>`;
                });
                html += '</tr>';
              });
              html += '</table>';
            } catch {}
          }
          if (!md) {
            md = slice.content.textBetween(0, slice.content.size, '\t', '\n');
          }
          if (event.clipboardData && md) {
            event.preventDefault();
            event.clipboardData.setData('text/plain', md);
            if (html) event.clipboardData.setData('text/html', html);
            onToastRef.current?.('선택한 표가 클립보드에 복사되었습니다.', 'info');
            return true;
          }
        }
        return false;
      },
      cut(currentView, event) {
        if (hasMultiCellTableSelection(currentView.state)) {
          const slice = currentView.state.selection.content();
          const tableNode = slice.content.firstChild?.type === visualSchema.nodes.table ? slice.content.firstChild : null;
          let md = '';
          let html = '';
          if (tableNode) {
            try {
              const tempDoc = visualSchema.nodes.doc.create(null, [tableNode]);
              md = visualSerializer.serialize(tempDoc).replace(/^\r?\n+|\r?\n+$/g, '');
              html = '<table border="1">';
              tableNode.forEach((row, _, rIdx) => {
                html += '<tr>';
                row.forEach(cell => {
                  const tag = cell.type.name === 'table_header' || rIdx === 0 ? 'th' : 'td';
                  html += `<${tag}>${cell.textContent.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>`;
                });
                html += '</tr>';
              });
              html += '</table>';
            } catch {}
          }
          if (!md) {
            md = slice.content.textBetween(0, slice.content.size, '\t', '\n');
          }
          if (event.clipboardData && md) {
            event.preventDefault();
            event.clipboardData.setData('text/plain', md);
            if (html) event.clipboardData.setData('text/html', html);
            clearMultiCellTableSelection(currentView.state, currentView.dispatch);
            onToastRef.current?.('선택한 표 셀이 잘라내기되었습니다.', 'info');
            return true;
          }
        }
        return false;
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
