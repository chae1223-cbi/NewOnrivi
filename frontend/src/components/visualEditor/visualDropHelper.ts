// ====================================================================
// 📥 [OMD-CORE-VisualDropHelper-0001] visualDropHelper.ts ➔ 시각 에디터 드래그 앤 드롭 및 문서 경로 해결 헬퍼
// 🎯 @KICK  : 이미지/미디어 드롭 시 마우스 좌표를 블록 기하학 및 AST 위치로 정밀 변환하고, 내부 상대경로/도움말 문서 링크를 안전 해결
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 VisualDocumentEditor 대형 컴포넌트 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 5순위 모듈화 분리]: visualDropHelper 드롭/경로 헬퍼 독립 분리
// 🔗 @CALLS : prosemirror-view, resolveDocumentLink, resolveWorkspaceHelpLink
// ====================================================================
// @ts-nocheck
import type { EditorView } from 'prosemirror-view';
import { resolveDocumentLink, resolveWorkspaceHelpLink } from '@/lib/nativeDocumentPath';

export interface DropTargetInfo {
  pos: number;
  coords: { left: number; top: number; bottom: number };
  insertMode: 'before' | 'after' | 'split';
  blockEl: HTMLElement | null;
}

export function resolveDropTarget(currentView: EditorView, clientX: number, clientY: number): DropTargetInfo {
  const surfaceEl = currentView.dom;
  // posAtCoords may clamp whitespace between blocks into the next paragraph's
  // text. Resolve block gaps and atomic media geometrically before asking it.
  const blocks: { node: import('prosemirror-model').Node; pos: number; element: HTMLElement; rect: DOMRect }[] = [];
  currentView.state.doc.forEach((node, pos) => {
    const element = currentView.nodeDOM(pos);
    if (element instanceof HTMLElement) blocks.push({ node, pos, element, rect: element.getBoundingClientRect() });
  });
  const boundary = (block: typeof blocks[number], before: boolean): DropTargetInfo => {
    const y = before ? block.rect.top : block.rect.bottom;
    return {
      pos: block.pos + (before ? 0 : block.node.nodeSize),
      coords: { left: block.rect.left, top: y, bottom: y + 22 },
      insertMode: before ? 'before' : 'after',
      blockEl: block.element
    };
  };
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (clientY < block.rect.top) return boundary(block, true);
    if (block.node.isAtom && clientY <= block.rect.bottom) {
      return boundary(block, clientY < (block.rect.top + block.rect.bottom) / 2);
    }
    const next = blocks[index + 1];
    if (clientY >= block.rect.bottom && (!next || clientY <= next.rect.top)) return boundary(block, false);
  }
  const posInfo = currentView.posAtCoords({ left: clientX, top: clientY });
  const hitEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

  let blockEl: HTMLElement | null = null;
  if (hitEl && surfaceEl.contains(hitEl)) {
    blockEl = hitEl.closest<HTMLElement>('.visual-document-surface > *');
  }

  const rawPos = posInfo && typeof posInfo.pos === 'number' ? posInfo.pos : null;

  if (!blockEl && typeof rawPos === 'number') {
    const $pos = currentView.state.doc.resolve(rawPos);
    if ($pos.depth >= 1) {
      const nodeDom = currentView.nodeDOM($pos.before(1));
      if (nodeDom instanceof HTMLElement) blockEl = nodeDom;
    }
    if (!blockEl) {
      const idx = $pos.index(0);
      const child = surfaceEl.children[idx];
      if (child instanceof HTMLElement) blockEl = child;
    }
  }

  // 1) 텍스트/노드 내부 좌표가 정확히 검출된 경우
  if (typeof rawPos === 'number') {
    const $pos = currentView.state.doc.resolve(rawPos);
    let coords: { left: number; top: number; bottom: number };
    try {
      coords = currentView.coordsAtPos(rawPos);
    } catch {
      coords = { left: clientX, top: clientY - 12, bottom: clientY + 12 };
    }

    if ($pos.depth >= 1 && $pos.parent.isTextblock) {
      if ($pos.parentOffset === 0) {
        return { pos: $pos.before(1), coords, insertMode: 'before', blockEl };
      } else if ($pos.parentOffset === $pos.parent.content.size) {
        return { pos: $pos.after(1), coords, insertMode: 'after', blockEl };
      } else {
        return { pos: rawPos, coords, insertMode: 'split', blockEl };
      }
    }
    return { pos: rawPos, coords, insertMode: 'after', blockEl };
  }

  // 2) 여백이나 패딩 영역에 마우스가 위치한 경우 (블록 기하학 기반 추적)
  if (blockEl) {
    const blockRect = blockEl.getBoundingClientRect();
    const isUpper = clientY < (blockRect.top + blockRect.height / 2);
    try {
      const domPos = currentView.posAtDOM(blockEl, 0);
      const $pos = currentView.state.doc.resolve(domPos);
      if ($pos.depth >= 1) {
        const targetPos = isUpper ? $pos.before(1) : $pos.after(1);
        let coords: { left: number; top: number; bottom: number };
        try {
          coords = currentView.coordsAtPos(targetPos);
        } catch {
          coords = {
            left: blockRect.left,
            top: isUpper ? blockRect.top : blockRect.bottom - 24,
            bottom: isUpper ? blockRect.top + 24 : blockRect.bottom
          };
        }
        return { pos: targetPos, coords, insertMode: isUpper ? 'before' : 'after', blockEl };
      }
    } catch (_) {}

    const idx = Array.from(surfaceEl.children).indexOf(blockEl);
    if (idx >= 0) {
      let offset = 0;
      for (let i = 0; i < idx && i < currentView.state.doc.childCount; i++) {
        offset += currentView.state.doc.child(i).nodeSize;
      }
      const targetPos = isUpper ? offset : offset + (currentView.state.doc.child(idx)?.nodeSize || 0);
      const coords = {
        left: blockRect.left,
        top: isUpper ? blockRect.top : blockRect.bottom - 24,
        bottom: isUpper ? blockRect.top + 24 : blockRect.bottom
      };
      return { pos: targetPos, coords, insertMode: isUpper ? 'before' : 'after', blockEl };
    }
  }

  // 3) 문서 최하단 끝 여백
  const endPos = currentView.state.doc.content.size;
  let coords: { left: number; top: number; bottom: number };
  try {
    coords = currentView.coordsAtPos(endPos);
  } catch {
    coords = { left: clientX, top: clientY - 12, bottom: clientY + 12 };
  }
  return { pos: endPos, coords, insertMode: 'after', blockEl: null };
}

export function resolveDropInsertPos(currentView: EditorView, clientX: number, clientY: number): number {
  return resolveDropTarget(currentView, clientX, clientY).pos;
}

export function resolveDocPath(relPath: string, currentFile: string): string {
  if (typeof resolveWorkspaceHelpLink !== 'undefined') {
    const helpResolved = resolveWorkspaceHelpLink(relPath, currentFile);
    if (helpResolved !== relPath) return helpResolved;
  }
  return resolveDocumentLink(relPath, currentFile);
}
