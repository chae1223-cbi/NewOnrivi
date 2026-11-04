// ====================================================================
// 🎯 [OMD-CORE-VisualSelectionHelper-0001] visualSelectionHelper.ts ➔ 시각 에디터 정밀 커서 및 선택 영역 조작 헬퍼
// 🎯 @KICK  : Shift+상하 방향키 문단 간 연속 다중 선택, PageUp/PageDown 페이지 단위 이동, 브라우저 DOM ↔ ProseMirror 선택 동기화 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 VisualDocumentEditor 대형 컴포넌트 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 5순위 모듈화 분리]: visualSelectionHelper 선택 헬퍼 독립 분리
// 🔗 @CALLS : prosemirror-state, prosemirror-view, ATOM_BLOCK_TYPES
// ====================================================================
// @ts-nocheck
import type { EditorView } from 'prosemirror-view';
import { TextSelection, NodeSelection, Selection } from 'prosemirror-state';
import type { ResolvedPos } from 'prosemirror-model';
import { ATOM_BLOCK_TYPES } from './visualDocumentCommands';

export function synchronizeTextSelection(view: EditorView) {
  if (view.composing || !(view.state.selection instanceof TextSelection) || !view.hasFocus()) return;
  const selection = document.getSelection();
  if (!selection?.anchorNode || !selection.focusNode || !view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return;
  if (selection.anchorNode.nodeType !== Node.TEXT_NODE || selection.focusNode.nodeType !== Node.TEXT_NODE) return;
  try {
    const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset), head = view.posAtDOM(selection.focusNode, selection.focusOffset);
    if (anchor !== view.state.selection.anchor || head !== view.state.selection.head) {
      const stored = view.state.storedMarks;
      let tr = view.state.tr.setSelection(TextSelection.between(view.state.doc.resolve(anchor), view.state.doc.resolve(head)));
      if (stored) tr = tr.setStoredMarks(stored);
      view.dispatch(tr);
    }
  } catch { /* A DOM selection may be removed during a document update. */ }
}

export function isHeadAtBlockBoundary(view: EditorView, $head: ResolvedPos, dir: 'up' | 'down'): boolean {
  if (!$head.parent.isTextblock) return true;
  if ($head.parent.content.size === 0) return true;

  if (dir === 'down' && $head.parentOffset === $head.parent.content.size) return true;
  if (dir === 'up' && $head.parentOffset === 0) return true;

  try {
    const headCoords = view.coordsAtPos($head.pos);
    const blockDepth = Math.max(1, $head.depth);
    const blockStart = $head.start(blockDepth);
    const blockEnd = $head.end(blockDepth);

    if (dir === 'down') {
      const endCoords = view.coordsAtPos(blockEnd);
      if (headCoords.bottom >= endCoords.top - 2) return true;
    } else {
      const startCoords = view.coordsAtPos(blockStart);
      if (headCoords.top <= startCoords.bottom + 2) return true;
    }
  } catch {}

  return false;
}

export function extendSelectionVerticallyAcrossBlocks(
  currentView: EditorView,
  dir: 'up' | 'down',
  onCaretSchedule?: () => void
): boolean {
  if (!currentView.editable) return false;
  const state = currentView.state;
  const selection = state.selection;

  let anchorPos = selection.anchor;
  let headPos = selection.head;
  let $head = selection.$head;

  if (selection instanceof NodeSelection) {
    anchorPos = dir === 'down' ? selection.from : selection.to;
    headPos = dir === 'down' ? selection.to : selection.from;
    $head = state.doc.resolve(headPos);
  } else if (!(selection instanceof TextSelection)) {
    return false;
  }

  const isAtBoundary = isHeadAtBlockBoundary(currentView, $head, dir);
  if (!isAtBoundary) {
    try {
      const line = currentView.coordsAtPos(headPos);
      const lineHeight = Math.max(14, line.bottom - line.top);
      const targetY = dir === 'down' ? line.bottom + lineHeight / 2 : line.top - lineHeight / 2;
      const point = currentView.posAtCoords({ left: line.left, top: targetY });
      if (point) {
        const target = Selection.near(state.doc.resolve(point.pos), dir === 'down' ? 1 : -1).head;
        if ((dir === 'down' && target > headPos) || (dir === 'up' && target < headPos)) {
          currentView.dispatch(state.tr.setSelection(TextSelection.between(
            state.doc.resolve(anchorPos), state.doc.resolve(target)
          )).scrollIntoView());
          onCaretSchedule?.();
          return true;
        }
      }
    } catch {}
    // If hit-testing stays on the same visual line, advance to the adjacent block.
  }

  const headCoords = currentView.coordsAtPos(headPos);
  const targetX = headCoords.left;
  const blockDepth = Math.max(1, $head.depth);

  if (dir === 'down') {
    const searchStart = $head.after(blockDepth);
    if (searchStart >= state.doc.content.size) {
      if (headPos < state.doc.content.size - 1) {
        const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(state.doc.content.size - 1));
        currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
        onCaretSchedule?.();
        return true;
      }
      return true;
    }

    let nextBlockInfo: { pos: number; node: import('prosemirror-model').Node } | null = null;
    state.doc.nodesBetween(searchStart, state.doc.content.size, (node, pos) => {
      if (nextBlockInfo) return false;
      if (pos >= searchStart && (node.isTextblock || ATOM_BLOCK_TYPES.has(node.type.name) || node.type.name === 'horizontal_rule')) {
        nextBlockInfo = { pos, node };
        return false;
      }
      return true;
    });

    if (!nextBlockInfo) {
      if (headPos < state.doc.content.size - 1) {
        const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(state.doc.content.size - 1));
        currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
        onCaretSchedule?.();
        return true;
      }
      return true;
    }

    const { pos: blockPos, node: blockNode } = nextBlockInfo as { pos: number; node: import('prosemirror-model').Node };
    let targetHeadPos: number;

    if (blockNode.isTextblock) {
      const blockStartPos = blockPos + 1;
      const blockContentSize = blockNode.content.size;
      if (blockContentSize === 0) {
        targetHeadPos = blockStartPos;
      } else {
        const startCoords = currentView.coordsAtPos(blockStartPos);
        const sampleY = startCoords.top + Math.max(5, (startCoords.bottom - startCoords.top) / 2);
        const posInfo = currentView.posAtCoords({ left: targetX, top: sampleY });
        if (posInfo && typeof posInfo.pos === 'number') {
          targetHeadPos = Math.max(blockStartPos, Math.min(posInfo.pos, blockStartPos + blockContentSize));
        } else {
          targetHeadPos = blockStartPos;
        }
      }
    } else {
      targetHeadPos = blockPos + blockNode.nodeSize;
    }

    const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(targetHeadPos));
    currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
    onCaretSchedule?.();
    return true;
  } else {
    // dir === 'up'
    const searchEnd = $head.before(blockDepth);
    if (searchEnd <= 0) {
      if (headPos > 1) {
        const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(1));
        currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
        onCaretSchedule?.();
        return true;
      }
      return true;
    }

    let prevBlockInfo: { pos: number; node: import('prosemirror-model').Node } | null = null;
    state.doc.nodesBetween(0, searchEnd, (node, pos) => {
      if (pos < searchEnd && (node.isTextblock || ATOM_BLOCK_TYPES.has(node.type.name) || node.type.name === 'horizontal_rule')) {
        prevBlockInfo = { pos, node };
      }
      return true;
    });

    if (!prevBlockInfo) {
      if (headPos > 1) {
        const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(1));
        currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
        onCaretSchedule?.();
        return true;
      }
      return true;
    }

    const { pos: blockPos, node: blockNode } = prevBlockInfo as { pos: number; node: import('prosemirror-model').Node };
    let targetHeadPos: number;

    if (blockNode.isTextblock) {
      const blockStartPos = blockPos + 1;
      const blockContentSize = blockNode.content.size;
      if (blockContentSize === 0) {
        targetHeadPos = blockStartPos;
      } else {
        const endPos = blockStartPos + blockContentSize;
        const endCoords = currentView.coordsAtPos(endPos);
        const sampleY = endCoords.top + Math.max(5, (endCoords.bottom - endCoords.top) / 2);
        const posInfo = currentView.posAtCoords({ left: targetX, top: sampleY });
        if (posInfo && typeof posInfo.pos === 'number') {
          targetHeadPos = Math.max(blockStartPos, Math.min(posInfo.pos, endPos));
        } else {
          targetHeadPos = endPos;
        }
      }
    } else {
      targetHeadPos = blockPos;
    }

    const newSelection = TextSelection.between(state.doc.resolve(anchorPos), state.doc.resolve(targetHeadPos));
    currentView.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
    onCaretSchedule?.();
    return true;
  }
}

export function handlePageMove(
  currentView: EditorView,
  dir: 'up' | 'down',
  extendSelection: boolean,
  onCaretSchedule?: () => void
): boolean {
  if (!currentView.editable) return false;
  const state = currentView.state;
  const selection = state.selection;
  const scrollContainer = (currentView.dom.closest('.custom-preview-container') as HTMLElement | null) || currentView.dom.parentElement;

  const headPos = selection.head;
  const headCoords = currentView.coordsAtPos(headPos);
  const targetX = headCoords.left;

  if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
    const viewportHeight = scrollContainer.clientHeight;
    const pageDelta = Math.max(120, Math.round(viewportHeight * 0.85));
    const prevScrollTop = scrollContainer.scrollTop;

    if (dir === 'down') {
      scrollContainer.scrollTop += pageDelta;
    } else {
      scrollContainer.scrollTop -= pageDelta;
    }

    const actualScrollDelta = Math.abs(scrollContainer.scrollTop - prevScrollTop);
    const containerRect = scrollContainer.getBoundingClientRect();

    let targetPos: number;
    if (dir === 'down' && scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10) {
      targetPos = Math.max(1, state.doc.content.size - 1);
    } else if (dir === 'up' && scrollContainer.scrollTop <= 5) {
      targetPos = 1;
    } else {
      const targetY = Math.max(containerRect.top + 20, Math.min(containerRect.bottom - 20, headCoords.top + (dir === 'down' ? (pageDelta - actualScrollDelta) : -(pageDelta - actualScrollDelta))));
      const posInfo = currentView.posAtCoords({ left: targetX, top: targetY });
      if (posInfo && typeof posInfo.pos === 'number') {
        targetPos = posInfo.pos;
      } else {
        targetPos = dir === 'down' ? Math.max(1, state.doc.content.size - 1) : 1;
      }
    }

    const direction = dir === 'down' ? 1 : -1;
    if ((direction === 1 && targetPos <= headPos) || (direction === -1 && targetPos >= headPos)) {
      targetPos = Math.max(1, Math.min(state.doc.content.size - 1, headPos + direction));
    }
    const $target = state.doc.resolve(Math.max(0, Math.min(targetPos, state.doc.content.size)));
    const targetSel = Selection.near($target, direction);
    const newSel = extendSelection
      ? TextSelection.between(selection.$anchor, targetSel.$head)
      : targetSel;

    currentView.dispatch(state.tr.setSelection(newSel).scrollIntoView());
    onCaretSchedule?.();
    return true;
  } else {
    const targetPos = dir === 'down' ? Math.max(1, state.doc.content.size - 1) : 1;
    const $target = state.doc.resolve(targetPos);
    const targetSel = Selection.near($target, dir === 'down' ? 1 : -1);
    const newSel = extendSelection
      ? TextSelection.between(selection.$anchor, targetSel.$head)
      : targetSel;
    currentView.dispatch(state.tr.setSelection(newSel).scrollIntoView());
    onCaretSchedule?.();
    return true;
  }
}
