// ====================================================================
// ⚙️ [OMD-CORE-VisualDocCommands-0001] visualDocumentCommands.ts ➔ 시각 에디터 전용 ProseMirror 커맨드 및 정규화 플러그인
// 🎯 @KICK  : 제목/코드블록/인용구/리스트/구분선/미디어 등 블록 조작 커맨드 및 리스트 정규화 트랜잭션 플러그인 제공
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 VisualDocumentEditor 대형 컴포넌트 모듈화 표준 준수
// 🚨 @PATCH : 2026-11-12 — [리스트 1번째 항목 전체 이동 방어 및 단일/선택 행 안전 들여쓰기 위임]: safeListIndent에서 첫 항목(itemIndexInList === 0) 시 전체 목록 이동(indentWholeList)을 원천 차단하고 independentIndentListItem으로 위임하여 선행 리스트 편입 또는 안전 정지 처리
// 🚨 @PATCH : 2026-11-11 — [인용문 탈출 시 말단 빈 행/빈 문단 자동 정제]: exitQuote 실행 시 인용문 끝에 남아있는 빈 문단 및 trailing hard_break를 완전 소탕하여 인용문 내부에 빈 행이 남지 않도록 개선
// 🚨 @PATCH : 2026-11-10 — [문단 끝 행 및 각 행 우측 빈 공간 클릭 시 마지막 문자 뒤 정확한 포커스 안착]: 라인별 바운딩 박스 그룹화 및 끝 행 우측 여백 클릭 감지 강화로 글자 외 빈 공간 클릭 시 해당 행의 마지막 문자 바로 다음 위치로 즉시 포커스 이동 보장
// 🚨 @PATCH : 2026-11-10 — [슬래시 명령어 괄호/구두점 뒤 인식 지원]: 괄호((, [, {) 및 따옴표(", ') 직후 슬래시 입력 시에도 슬래시 메뉴가 정상 팝업되도록 패턴 확장
// 🚨 @PATCH : 2026-11-08 — [빈 행(빈 문단) 클릭 시 다음 줄 도약(하이재킹) 방어 및 제자리 정확 안착]:
//             1) emptyParagraphAtClick에 1순위 Direct Target(p, br) 감지 및 descendants 기반 전체 빈 텍스트블록(textContent.trim() === '') DOM 히트테스트 3중 엔진 탑재
//             2) paragraphLineEndAtClick의 과도한 세로 패딩(0.3)을 0.15(최대 4px)로 축소하여 빈 행 클릭 시 아랫줄 문단(광복 80주년...) 시작으로 커서가 빨려 들어가던 결함 완벽 해결
// 🚨 @PATCH : 2026-11-08 — [표 내부 빈 셀 클릭 및 셀 간 커서 이동 격리]: paragraphLineEndAtClick 및 emptyParagraphAtClick에 targetCell(td, th) 격리 가드를 적용하여, 표 내부 빈 셀 클릭 시 동일 행의 이전 입력 셀 끝으로 커서가 강제 도약(하이재킹)되던 결함 원천 해결
// 🚨 @PATCH : 2026-11-07 — [행 끝 여백 클릭 시 정밀 커서 이동 강화]: paragraphLineEndAtClick 대상 노드를 모든 isTextblock(heading, blockquote 포함)으로 확장하고 클릭 줄 판정 패딩 확대
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 5순위 모듈화 분리]: visualDocumentCommands 커맨드군 독립 분리
// 🔗 @CALLS : prosemirror-state, prosemirror-commands, prosemirror-history, visualSchema
// ====================================================================
// @ts-nocheck
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection, NodeSelection, Selection, Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { Fragment, type Node as DocumentNode } from 'prosemirror-model';
import { setBlockType } from 'prosemirror-commands';
import { closeHistory } from 'prosemirror-history';
import { sinkListItem } from 'prosemirror-schema-list';
import { visualSchema } from '@/lib/visualDocumentCodec';
import { quoteIndent } from '@/lib/visualQuoteCommands';
import { selectedList, indentWholeList, independentIndentListItem } from '@/lib/visualListCommands';

export const slashPattern = new RegExp('(?:^|[\\s(\\[{\'"«“‘])([\\/／][\\p{L}\\p{N}_-]*)$', 'u');

export const setHeadingBlock = (level: number): Command => (state, dispatch, view) => {
  const { $from, $to } = state.selection;
  if (!$from.sameParent($to) || !$from.parent.isTextblock) {
    if ($from.parent.type === visualSchema.nodes.heading && $from.parent.attrs.level === level) {
      return setBlockType(visualSchema.nodes.paragraph)(state, dispatch, view);
    }
    return setBlockType(visualSchema.nodes.heading, { level })(state, dispatch, view);
  }
  if (!dispatch) return true;
  let tr = state.tr;
  const parent = $from.parent;

  // 🔥 동일 레벨의 제목이면 일반 문단(paragraph)으로 취소(토글 해제)
  if (parent.type === visualSchema.nodes.heading && parent.attrs.level === level) {
    const from = tr.mapping.map($from.pos);
    const to = tr.mapping.map($to.pos);
    tr = tr.setBlockType(from, to, visualSchema.nodes.paragraph);
    dispatch(tr.scrollIntoView());
    return true;
  }

  const blockStart = $from.start();
  const text = parent.textContent;
  const hashMatch = text.match(/^(#{1,6}\s*)/);
  if (hashMatch) {
    tr = tr.delete(blockStart, blockStart + hashMatch[1].length);
  }
  const from = tr.mapping.map($from.pos);
  const to = tr.mapping.map($to.pos);
  tr = tr.setBlockType(from, to, visualSchema.nodes.heading, { level });
  dispatch(tr.scrollIntoView());
  return true;
};

export const setCodeBlock: Command = (state, dispatch, view) => {
  return setBlockType(visualSchema.nodes.code_block)(
    state,
    dispatch
      ? (tr) => {
          const $from = tr.selection.$from;
          if ($from.parent.type === visualSchema.nodes.code_block) {
            const afterPos = $from.after();
            const savedFrom = tr.selection.from;
            const savedTo = tr.selection.to;
            if (afterPos >= tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            } else if (tr.doc.nodeAt(afterPos)?.content.size !== 0) {
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            }
            tr = tr.setSelection(TextSelection.create(tr.doc, savedFrom, savedTo));
          }
          tr = tr.setMeta('onrivi:focus-code-block', true);
          dispatch(tr.scrollIntoView());
        }
      : undefined,
    view
  );
};

// 빈 코드 블록에서 Backspace 입력 시 코드 블록을 삭제하거나 이전 블록 끝으로 이동 / 일반 문단 변환
export const backspaceInCodeBlock: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.code_block) return false;
  if ($from.parent.content.size === 0) {
    if (dispatch) {
      const pos = $from.before();
      const after = $from.after();
      const index = $from.index($from.depth - 1);
      if (index > 0) {
        let tr = state.tr.delete(pos, after);
        const prevEnd = tr.mapping.map(pos - 1);
        tr = tr.setSelection(TextSelection.create(tr.doc, prevEnd));
        dispatch(closeHistory(tr).scrollIntoView());
      } else {
        let tr = state.tr.setBlockType(pos, after, visualSchema.nodes.paragraph);
        dispatch(closeHistory(tr).scrollIntoView());
      }
    }
    return true;
  }
  return false;
};

export const deleteInCodeBlock: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.code_block) return false;
  if ($from.parent.content.size === 0) {
    if (dispatch) {
      const pos = $from.before();
      const after = $from.after();
      let tr = state.tr.delete(pos, after);
      if (tr.doc.content.size === 0) {
        tr = tr.insert(0, visualSchema.nodes.paragraph.create());
      }
      const safePos = Math.min(pos + 1, tr.doc.content.size);
      tr = tr.setSelection(TextSelection.create(tr.doc, safePos));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  }
  return false;
};

// Always consume Tab in the document so browser focus cannot jump to controls.
export const removeHeadingAtStart: Command = (state, dispatch) => {
  const position = state.selection.$from;
  if (!state.selection.empty || position.parent.type !== visualSchema.nodes.heading || position.parentOffset !== 0) return false;
  if (dispatch) dispatch(closeHistory(state.tr.setBlockType(position.before(), position.after(), visualSchema.nodes.paragraph).setStoredMarks([])));
  return true;
};

export const headingEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.heading) return false;

  const heading = $from.parent;
  const parentOffset = $from.parentOffset;
  const contentSize = heading.content.size;

  if (dispatch) {
    let tr = state.tr;

    // 1. 내용이 빈 제목: 일반 빈 문단(paragraph)으로 즉시 변환하여 유령 헤딩 방어
    if (contentSize === 0) {
      tr = tr.setBlockType($from.before(), $from.after(), visualSchema.nodes.paragraph);
      dispatch(closeHistory(tr).scrollIntoView());
      return true;
    }

    // 2. 제목 끝에서 엔터: 제목 아래에 신규 본문 문단(paragraph) 생성 후 커서를 다음 행으로 이동
    if (parentOffset === contentSize) {
      const posAfter = $from.after();
      const p = visualSchema.nodes.paragraph.create();
      tr = tr.insert(posAfter, p);
      tr = tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
      dispatch(closeHistory(tr).scrollIntoView());
      return true;
    }

    // 3. 제목 맨 앞에서 엔터: 제목 위에 빈 문단 삽입하고 제목 행 위치는 유지
    if (parentOffset === 0) {
      const posBefore = $from.before();
      const p = visualSchema.nodes.paragraph.create();
      tr = tr.insert(posBefore, p);
      tr = tr.setSelection(TextSelection.create(tr.doc, posBefore + p.nodeSize + 1));
      dispatch(closeHistory(tr).scrollIntoView());
      return true;
    }

    // 4. 제목 중간에서 엔터: 앞부분은 제목으로 유지하고 뒷부분은 새 본문 문단으로 분할
    const posAfter = $from.after();
    const textBefore = heading.content.cut(0, parentOffset);
    const textAfter = heading.content.cut(parentOffset);
    const newHeading = heading.type.create(heading.attrs, textBefore);
    const newParagraph = visualSchema.nodes.paragraph.create(null, textAfter);
    tr = tr.replaceWith($from.before(), posAfter, [newHeading, newParagraph]);
    const targetPos = $from.before() + newHeading.nodeSize + 1;
    tr = tr.setSelection(TextSelection.create(tr.doc, targetPos));
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

export const calloutEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type === visualSchema.nodes.blockquote) {
      const parent = $from.parent;
      const text = parent.textContent;
      const match = text.match(/^\s*\[!([^\]]+)\]\s*(.*)$/);
      if (match) {
        if (dispatch) {
          const rawTag = match[1].trim();
          const upper = rawTag.toUpperCase();
          const alertType = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'].includes(upper) ? upper : rawTag;
          const remainingText = match[2] || '';
          const bqPos = $from.before(depth);
          let tr = state.tr;
          tr = tr.delete($from.start(), $from.end());
          if (remainingText) {
            tr = tr.insertText(remainingText, $from.start());
          }
          tr = tr.setNodeMarkup(bqPos, undefined, { alertType });
          const afterPos = tr.mapping.map($from.after(depth));
          if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
            const savedPos = tr.selection.from;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, savedPos));
          }
          dispatch(closeHistory(tr).scrollIntoView());
        }
        return true;
      }
    }
  }
  return false;
};

export const cleanQuoteTail = (tr: any, quoteStartPos: number) => {
  let quote = tr.doc.nodeAt(quoteStartPos);
  if (!quote || quote.type !== visualSchema.nodes.blockquote) return;

  // 1. 인용문 끝에서부터 내용 없는 빈 문단 연속 삭제
  while (quote.childCount > 1) {
    const lastChild = quote.lastChild;
    if (lastChild && lastChild.isTextblock && !lastChild.textContent.trim() && lastChild.content.size === 0) {
      const childStart = quoteStartPos + quote.nodeSize - 1 - lastChild.nodeSize;
      tr.delete(childStart, childStart + lastChild.nodeSize);
      quote = tr.doc.nodeAt(quoteStartPos);
      if (!quote || quote.type !== visualSchema.nodes.blockquote) return;
    } else {
      break;
    }
  }

  // 2. 인용문 내 마지막 텍스트블록 끝의 trailing hard_break 삭제
  if (quote && quote.childCount >= 1) {
    let lastChild = quote.lastChild;
    if (lastChild && lastChild.isTextblock && lastChild.content.size > 0) {
      const childStart = quoteStartPos + quote.nodeSize - 1 - lastChild.nodeSize;
      while (lastChild && lastChild.lastChild && lastChild.lastChild.type === visualSchema.nodes.hard_break) {
        const breakNode = lastChild.lastChild;
        const breakEnd = childStart + lastChild.nodeSize - 1;
        const breakStart = breakEnd - breakNode.nodeSize;
        tr.delete(breakStart, breakEnd);
        quote = tr.doc.nodeAt(quoteStartPos);
        if (!quote || quote.type !== visualSchema.nodes.blockquote) return;
        lastChild = quote.lastChild;
      }
    }
  }
};

export const exitQuote = (emptyOnly = false): Command => (state, dispatch) => {
  const position = state.selection.$from;
  if (!state.selection.empty) return false;
  let depth = 0;
  for (let i = 1; i < position.depth; i++) {
    if (position.node(i).type === visualSchema.nodes.blockquote) {
      depth = i;
      break;
    }
  }
  if (!depth) return false;
  const quote = position.node(depth), start = position.before(depth), end = start + quote.nodeSize;
  const trailingBreak = position.parentOffset === position.parent.content.size && position.parent.lastChild?.type === visualSchema.nodes.hard_break;
  const isCurrentBlockEmpty = !position.parent.content.size || (!position.parent.textContent.trim() && !position.parent.firstChild);
  const emptyLast = position.depth === depth + 1 && position.parent.type === visualSchema.nodes.paragraph && (isCurrentBlockEmpty || trailingBreak) && position.index(depth) === quote.childCount - 1;
  if (emptyOnly && !emptyLast) return false;
  if (dispatch) {
    let tr = state.tr;
    if (emptyOnly && quote.childCount === 1 && !quote.textContent.trim()) {
      tr = tr.replaceWith(start, end, visualSchema.nodes.paragraph.create());
      tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
    } else {
      if (emptyOnly) {
        if (trailingBreak) {
          tr = tr.delete(position.pos - 1, position.pos);
        } else if (isCurrentBlockEmpty) {
          tr = tr.delete(position.before(), position.after());
        }
      }
      const currentQuoteStart = tr.mapping.map(start, -1);
      cleanQuoteTail(tr, currentQuoteStart);
      const updatedQuote = tr.doc.nodeAt(currentQuoteStart);
      const after = updatedQuote ? currentQuoteStart + updatedQuote.nodeSize : tr.mapping.map(end, -1);
      const following = tr.doc.nodeAt(after);
      if (following?.type !== visualSchema.nodes.paragraph) {
        tr = tr.insert(after, visualSchema.nodes.paragraph.create());
      }
      tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
    }
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

export const ATOM_BLOCK_TYPES = new Set(['visual_image', 'visual_media', 'visual_math', 'source_block', 'page_break']);
export const FIRST_BLOCK_INSERT_TYPES = new Set(['table', 'code_block', 'visual_image', 'visual_media', 'visual_math', 'source_block', 'horizontal_rule', 'page_break']);

export const exitMediaBlock = (requireSelected = false): Command => (state, dispatch, currentView) => {
  let end = -1;
  if (state.selection instanceof NodeSelection && ATOM_BLOCK_TYPES.has(state.selection.node.type.name)) {
    end = state.selection.to;
  } else if (!requireSelected) {
    const { $from } = state.selection;
    if ($from.depth === 0) {
      if ($from.nodeAfter && ATOM_BLOCK_TYPES.has($from.nodeAfter.type.name)) {
        end = $from.pos + $from.nodeAfter.nodeSize;
      } else if ($from.nodeBefore && ATOM_BLOCK_TYPES.has($from.nodeBefore.type.name)) {
        end = $from.pos;
      }
    } else if ($from.depth === 1 && $from.parent.isTextblock) {
      const beforePos = $from.before(1);
      const afterPos = $from.after(1);
      const nodeAfter = state.doc.nodeAt(afterPos);
      const $before = state.doc.resolve(beforePos);
      const nodeBefore = $before.nodeBefore;
      if ($from.parent.content.size === 0 && nodeAfter && ATOM_BLOCK_TYPES.has(nodeAfter.type.name)) {
        end = afterPos + nodeAfter.nodeSize;
      } else if ($from.parentOffset === 0 && nodeBefore && ATOM_BLOCK_TYPES.has(nodeBefore.type.name)) {
        end = afterPos;
      }
    }
  }
  if (end < 0) return false;
  if (dispatch) {
    let tr = state.tr;
    const next = tr.doc.nodeAt(end);
    if (next?.type !== visualSchema.nodes.paragraph) {
      tr = tr.insert(end, visualSchema.nodes.paragraph.create());
    }
    tr = tr.setSelection(TextSelection.create(tr.doc, end + 1));
    dispatch(closeHistory(tr).scrollIntoView());
    currentView?.focus();
  }
  return true;
};

// Navigating to a rule must never insert paragraphs or create an undo entry.
export function placeCursorBeforeHorizontalRule(currentView: EditorView, hrPos: number): boolean {
  if (!currentView.editable) return false;
  const { state } = currentView;
  if (state.doc.nodeAt(hrPos)?.type !== visualSchema.nodes.horizontal_rule) return false;
  const selection = Selection.near(state.doc.resolve(hrPos), -1);
  currentView.dispatch(state.tr.setSelection(selection).scrollIntoView());
  currentView.focus();
  return true;
}

// Enter on a selected rule opens a new paragraph below it (reuses an existing empty one).
export function openParagraphAfterHorizontalRule(currentView: EditorView, hrPos: number): boolean {
  if (!currentView.editable) return false;
  const { state } = currentView;
  const hrNode = state.doc.nodeAt(hrPos);
  if (hrNode?.type !== visualSchema.nodes.horizontal_rule) return false;
  const end = hrPos + hrNode.nodeSize;
  let tr = state.tr;
  const next = tr.doc.nodeAt(end);
  if (!(next?.type === visualSchema.nodes.paragraph && next.content.size === 0)) {
    tr = tr.insert(end, visualSchema.nodes.paragraph.create());
  }
  tr = tr.setSelection(TextSelection.create(tr.doc, end + 1));
  currentView.dispatch(closeHistory(tr).scrollIntoView());
  currentView.focus();
  return true;
}

export function findClickedHorizontalRulePos(currentView: EditorView, event: MouseEvent): number {
  const target = event.target as HTMLElement | null;
  let hrEl = (target?.tagName === 'HR' ? target : target?.closest?.('hr')) as HTMLElement | null;
  if (!hrEl && target === currentView.dom) {
    const hrs = currentView.dom.querySelectorAll('hr');
    for (let i = 0; i < hrs.length; i++) {
      const el = hrs[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8 && event.clientY >= rect.top - 12 && event.clientY <= rect.bottom + 12) {
        hrEl = el;
        break;
      }
    }
  }
  if (!hrEl || !currentView.dom.contains(hrEl)) return -1;
  let hrPos = -1;
  currentView.state.doc.descendants((node, pos) => {
    if (node.type === visualSchema.nodes.horizontal_rule && currentView.nodeDOM(pos) === hrEl) {
      hrPos = pos;
      return false;
    }
    return true;
  });
  if (hrPos < 0) {
    try {
      const pos = currentView.posAtDOM(hrEl, 0);
      if (currentView.state.doc.nodeAt(pos)?.type === visualSchema.nodes.horizontal_rule) hrPos = pos;
      else if (pos > 0 && currentView.state.doc.nodeAt(pos - 1)?.type === visualSchema.nodes.horizontal_rule) hrPos = pos - 1;
    } catch {}
  }
  return hrPos;
}

export function emptyParagraphAtClick(currentView: EditorView, event: MouseEvent): number | null {
  const surface = currentView.dom.getBoundingClientRect();
  if (event.clientX < surface.left || event.clientX > surface.right) return null;
  // 표 내부 클릭 시 일반 본문 빈 문단 이동 로직 간섭 배제
  if ((event.target as HTMLElement | null)?.closest('td, th, table')) return null;

  // 🌟 [1순위: Direct Target 감지] 클릭한 대상 엘리먼트가 빈 문단 또는 빈 행인 경우
  const target = event.target as HTMLElement | null;
  const directBlock = target?.closest('p, h1, h2, h3, h4, h5, h6, li') as HTMLElement | null;
  if (directBlock && !directBlock.closest('td, th, table')) {
    const text = directBlock.textContent?.trim() || '';
    if (text === '') {
      try {
        const domPos = currentView.posAtDOM(directBlock, 0);
        if (typeof domPos === 'number' && domPos >= 0) {
          const $res = currentView.state.doc.resolve(domPos);
          if ($res.parent.isTextblock && $res.parent.textContent.trim() === '') {
            return $res.start();
          }
          const nodeAt = currentView.state.doc.nodeAt(domPos);
          if (nodeAt && nodeAt.isTextblock && nodeAt.textContent.trim() === '') {
            return domPos + 1;
          }
        }
      } catch {}
    }
  }

  // 🌟 [2순위: 빈 리스트 항목 문단 감지]
  let emptyListPos: number | null = null;
  currentView.state.doc.descendants((node, pos, parent) => {
    if (!node.isTextblock || node.textContent.trim() !== '' || parent?.type !== visualSchema.nodes.list_item) return;
    const $pos = currentView.state.doc.resolve(pos);
    const item = currentView.nodeDOM($pos.before($pos.depth));
    if (!(item instanceof HTMLElement)) return;
    const rect = item.getBoundingClientRect();
    if (event.clientY >= rect.top - 2 && event.clientY <= rect.bottom + 2) {
      emptyListPos = pos + 1;
    }
  });
  if (emptyListPos !== null) return emptyListPos;

  // 🌟 [3순위: Y좌표 히트테스트 기반 문서 내 모든 빈 문단/블록 정밀 탐색]
  let selectedPos: number | null = null;
  let minDistance = Infinity;

  currentView.state.doc.descendants((node, pos) => {
    if (!node.isTextblock || node.textContent.trim() !== '') return;
    const $pos = currentView.state.doc.resolve(pos);
    if ($pos.depth > 0 && $pos.node(1).type.name === 'table') return; // 표 내부 배제

    // DOM 요소 획득 (nodeDOM 시도 후 domAtPos로 안전 폴백)
    let element: HTMLElement | null = null;
    const nDom = currentView.nodeDOM(pos);
    if (nDom instanceof HTMLElement) {
      element = nDom;
    } else {
      try {
        const atPos = currentView.domAtPos(pos + 1);
        const el = atPos.node instanceof HTMLElement ? atPos.node : atPos.node?.parentElement;
        element = (el?.closest('p, h1, h2, h3, h4, h5, h6, li') as HTMLElement | null) || null;
      } catch {}
    }
    if (!element) return;

    const rect = element.getBoundingClientRect();
    // 빈 문단의 높이가 0에 가까운 경우 인접 여백을 포함하여 판정
    const visualTop = rect.top - 4;
    const visualBottom = Math.max(rect.bottom, rect.top + 18) + 4;

    if (event.clientY >= visualTop && event.clientY <= visualBottom) {
      const distance = Math.abs(event.clientY - (visualTop + visualBottom) / 2);
      if (distance < minDistance) {
        selectedPos = pos + 1;
        minDistance = distance;
      }
    }
  });

  return selectedPos;
}

export function paragraphLineEndAtClick(currentView: EditorView, event: MouseEvent): number | null {
  const surface = currentView.dom.getBoundingClientRect();
  if (event.clientX < surface.left || event.clientX > surface.right) return null;

  const targetCell = (event.target as HTMLElement | null)?.closest('td, th') as HTMLElement | null;
  // 표 내부 빈 셀 클릭 시 행 끝 이동 판정을 배제하여 빈 셀 제자리 안착 보장
  if (targetCell && !targetCell.textContent?.trim()) {
    return null;
  }

  let result: number | null = null;
  currentView.state.doc.descendants((node, pos) => {
    if (result !== null || !node.isTextblock || node.content.size === 0) return;
    const element = currentView.nodeDOM(pos);
    if (!(element instanceof HTMLElement)) return;

    // 💡 표 셀 격리 가드: 클릭 대상이 표 셀인 경우 동일 셀 내부의 텍스트블록만 허용하고,
    // 일반 본문 클릭인 경우 표 셀 내부의 텍스트블록이 행 끝 대상으로 오인식되지 않도록 방어
    if (targetCell) {
      if (!targetCell.contains(element)) return;
      const cellRect = targetCell.getBoundingClientRect();
      if (event.clientX > cellRect.right) return;
    } else {
      if (element.closest('td, th')) return;
    }

    const elemRect = element.getBoundingClientRect();
    // 마우스 Y가 해당 텍스트블록 요소의 상하 범위(상하 여유 4px) 안에 있는지 1차 확인
    if (event.clientY < elemRect.top - 4 || event.clientY > elemRect.bottom + 4) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    const textRects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0);
    if (!textRects.length) return;

    // 각 라인별 Rect 그룹화 (Y 좌표가 비슷한 조각들을 한 라인으로 병합)
    const lines: { top: number; bottom: number; right: number; left: number }[] = [];
    textRects.forEach(rect => {
      const existing = lines.find(line => Math.abs(line.top - rect.top) < 6 || (rect.top >= line.top - 4 && rect.bottom <= line.bottom + 4));
      if (existing) {
        existing.top = Math.min(existing.top, rect.top);
        existing.bottom = Math.max(existing.bottom, rect.bottom);
        existing.right = Math.max(existing.right, rect.right);
        existing.left = Math.min(existing.left, rect.left);
      } else {
        lines.push({ top: rect.top, bottom: rect.bottom, right: rect.right, left: rect.left });
      }
    });

    lines.sort((a, b) => a.top - b.top);
    if (!lines.length) return;

    // 클릭한 Y 좌표와 가장 일치하는 라인 특정
    let matchedLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 줄간격 및 패딩 여유 고려 (상하 여유 6px)
      if (event.clientY >= line.top - 4 && event.clientY <= line.bottom + 6) {
        matchedLineIndex = i;
        break;
      }
    }

    // 라인들 사이 여백이나 마지막 라인 아래쪽 문단 여백 클릭 판정
    if (matchedLineIndex === -1) {
      const lastLine = lines[lines.length - 1];
      if (event.clientY > lastLine.bottom) {
        matchedLineIndex = lines.length - 1; // 마지막 행으로 판정
      } else {
        let minDist = Infinity;
        lines.forEach((line, idx) => {
          const midY = (line.top + line.bottom) / 2;
          const dist = Math.abs(event.clientY - midY);
          if (dist < minDist) {
            minDist = dist;
            matchedLineIndex = idx;
          }
        });
      }
    }

    if (matchedLineIndex === -1) return;
    const targetLine = lines[matchedLineIndex];

    // 클릭 X가 해당 행의 글자 끝(right)보다 오른쪽 빈 공간일 때만 동작
    if (event.clientX <= targetLine.right + 2) return;

    // 🌟 [문단의 끝 행 빈 공간 클릭 시]: 문단의 마지막 문자 바로 다음 위치로 정확히 안착!
    if (matchedLineIndex === lines.length - 1) {
      result = pos + node.nodeSize - 1;
      return;
    }

    // 🌟 [문단 중간 행 우측 빈 공간 클릭 시]: 해당 행의 글자 끝 좌표로 이동
    const targetY = (targetLine.top + targetLine.bottom) / 2;
    const hit = currentView.posAtCoords({ left: targetLine.right - 2, top: targetY });
    if (hit) {
      const $hit = currentView.state.doc.resolve(hit.pos);
      if ($hit.parent === node) {
        result = hit.pos;
        return;
      }
    }
    result = pos + node.nodeSize - 1;
  });
  return result;
}

export function createListNormalizationPlugin() {
  return new Plugin({
    key: new PluginKey('onrivi:list-normalization'),
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some(tr => tr.docChanged)) return null;

      const fixes: { pos: number; nodeSize: number; items: DocumentNode[] }[] = [];

      newState.doc.descendants((node, pos) => {
        if (node.type === visualSchema.nodes.list_item) {
          const firstChild = node.firstChild;
          if (firstChild && (firstChild.type === visualSchema.nodes.bullet_list || firstChild.type === visualSchema.nodes.ordered_list)) {
            // 문단(paragraph) 없이 곧바로 하위 리스트가 들어있는 고아 빈 list_item 발견!
            const items: DocumentNode[] = [];
            firstChild.forEach(child => items.push(child));
            fixes.push({ pos, nodeSize: node.nodeSize, items });
            return false;
          }
        }
      });

      if (fixes.length === 0) return null;

      const tr = newState.tr;
      for (let i = fixes.length - 1; i >= 0; i--) {
        const { pos, nodeSize, items } = fixes[i];
        tr.replaceWith(pos, pos + nodeSize, items);
      }

      return tr;
    }
  });
}

export const makeChecklist = selectedList('check');

/** 💬 인용문(blockquote) Tab 들여쓰기: 앞선 리스트 항목 내부로 종속시키거나 중첩 인용문으로 들여쓰기 */
export const indentBlockquote = quoteIndent();
export const outdentBlockquote = quoteIndent(true);

export const safeListIndent: Command = (state, dispatch, currentView) => {
  const { $from } = state.selection;
  let inListItem = false;
  let listDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      inListItem = true;
      listDepth = d - 1;
      break;
    }
  }
  if (inListItem) {
    const itemIndexInList = $from.index(listDepth);
    if (itemIndexInList > 0) {
      sinkListItem(visualSchema.nodes.list_item)(state, dispatch, currentView);
    } else {
      // 🛡️ 첫 번째 항목에서는 전체 목록 이동(indentWholeList)을 수행하지 않고, 선행 리스트 편입 여부만 안전 처리
      independentIndentListItem(state, dispatch, currentView);
    }
    return true; // 리스트 내부에서는 추가적인 indentDocument로 구조가 깨지지 않도록 방어
  }
  return indentDocument()(state, dispatch, currentView);
};

export const indentDocument = (backward = false): Command => (state, dispatch, currentView) => {
  const { $from, from, to } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) if ($from.node(depth).type === visualSchema.nodes.list_item) {
    if (backward) return true;
    const listDepth = depth - 1, list = $from.node(listDepth), container = $from.node(listDepth - 1), index = $from.index(listDepth - 1);
    if ($from.index(listDepth) !== 0 || index === 0) return true;
    const previous = container.child(index - 1);
    if (!['bullet_list', 'ordered_list'].includes(previous.type.name)) return true;
    // A separate list can follow another list (for example after changing
    // marker types). Move the entire selected range, not only its first item.
    const listPos = $from.before(listDepth);
    let count = 0, movedSize = 0;
    list.forEach((item, offset) => {
      if (listPos + 1 + offset < to) { count++; movedSize += item.nodeSize; }
    });
    if (!count) { count = 1; movedSize = list.firstChild!.nodeSize; }
    const items = list.content.cut(0, movedSize), last = previous.lastChild!;
    const nested = list.type.create({ ...list.attrs, tight: true }, items);
    const changedLast = last.copy(last.content.append(Fragment.from(nested)));
    const changedPrevious = previous.copy(previous.content.replaceChild(previous.childCount - 1, changedLast));
    const nodes = [changedPrevious];
    if (list.childCount > count) nodes.push(list.copy(list.content.cut(movedSize)));
    const previousPos = listPos - previous.nodeSize;
    if (dispatch) {
      let tr = state.tr.replaceWith(previousPos, listPos + list.nodeSize, nodes);
      let target: number | undefined;
      tr.doc.descendants((node, pos) => { if (node === items.firstChild && target === undefined) { target = pos; return false; } });
      if (target !== undefined) {
        const delta = target - (listPos + 1), { anchor, head } = state.selection;
        const limit = listPos + 1 + movedSize - 1;
        tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(anchor, limit) + delta, Math.min(head, limit) + delta));
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  if (!$from.parent.isTextblock) return true;
  const configured = currentView ? Number.parseInt(currentView.dom.dataset.editorTabSize || getComputedStyle(currentView.dom).tabSize, 10) : 2;
  const size = Number.isFinite(configured) ? Math.max(1, Math.min(16, configured)) : 2;
  if (!state.selection.empty) {
    const edits: { pos: number; remove: number }[] = [];
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock) return;
      if (node.type !== visualSchema.nodes.paragraph || pos + 1 >= to) return false;
      const leading = node.textContent.match(new RegExp('^[ \\t\\u00a0]{1,' + size + '}'))?.[0];
      edits.push({ pos: pos + 1, remove: backward ? (leading?.length || 0) : 0 });
      return false;
    });
    if (dispatch && edits.length) {
      const tr = state.tr;
      for (const edit of edits.reverse()) {
        if (backward) { if (edit.remove) tr.delete(edit.pos, edit.pos + edit.remove); }
        else tr.insertText(' '.repeat(size), edit.pos);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n');
  if (!backward) {
    const gap = size;
    const spaces = ' '.repeat(gap);
    if (dispatch) dispatch(state.tr.insertText(spaces, from, to).scrollIntoView());
    return true;
  }
  const preceding = before.match(new RegExp('[ \t\u00a0]{1,' + size + '}$'))?.[0];
  if (preceding && dispatch) dispatch(state.tr.delete(from - preceding.length, from).scrollIntoView());
  else if ($from.parentOffset === 0) {
    const leading = $from.parent.textContent.match(new RegExp('^[ \t\u00a0]{1,' + size + '}'))?.[0];
    if (leading && dispatch) dispatch(state.tr.delete(from, from + leading.length).scrollIntoView());
  }
  return true;
};
