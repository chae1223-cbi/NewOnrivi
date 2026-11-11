/**
 * 프로그램명 : OnriviAuthor 
 * 파일명 : visualListCommands.ts
 * 🚨 @PATCH : **2026-11-11** — [문장간격(hard_break) 포함 단일 문단에서 커서 위치 라인만 개별 리스트 변환 지원]:
 *             1) 줄바꿈(hard_break)으로 연결된 문단에서 특정 라인에만 커서가 있거나 일부 라인만 선택된 경우, 전체 문단이 모두 리스트로 묶이지 않고 선택된 라인만 정확히 독립 리스트로 변환
 *             2) 비선택 라인은 이전/다음 문단으로 자동 분할 보존되어 '사과' 하나만 숫자리스트 적용 시 나머지('바나나', '애플')가 함께 리스트에 포함되는 결함 완벽 해결
 * 🚨 @PATCH : **2026-11-11** — [리스트 취소(clear) 시 각 항목을 문단간격이 아닌 문장간격(줄간격)으로 전환]:
 *             1) selectedList('clear')에서 각 리스트 항목을 개별 paragraph로 분할하던 동작을 단일 paragraph 내부의 hard_break(줄바꿈) 연결 구조로 개선
 *             2) 단축키/플로팅툴바/슬래시명령어로 숫자리스트/글머리기호 목록을 취소할 때 각 줄 사이에 과도한 문단 마진(문단간격)이 벌어지지 않고 줄간격(문장간격)으로 매끄럽게 연결되도록 보장
 * 🚨 @PATCH : **2026-11-10** — [중첩 리스트 내어쓰기(independentLiftListItem) 시 하위 리스트 indentPx 무효화 및 위계 보존]:
 *             1) independentLiftListItem에서 내어쓰기 분할 시 잔존/분리되는 서브 리스트(beforeBlocks, suffix)의 indentPx를 null로 초기화하여 중첩 리스트에 불필요한 HTML 주석이 생성되거나 위계가 왜곡되는 현상 원천 방어
 * 🚨 @PATCH : **2026-11-08** — [리스트 내부 Shift+Enter 시 리스트 탈출 및 새 문단(paragraph) 전환 커맨드(exitListToParagraph) 신설]:
 *             1) exitListToParagraph 신설: 리스트 항목(bullet_list / ordered_list / list_item) 내부에서 Shift + Enter 입력 시 리스트를 완전히 탈출하여 독립된 새로운 본문 문단(paragraph)을 생성하고 커서 이동
 *             2) 빈 리스트 항목에서는 exitEmptyListItem과 연계하여 불필요한 공백 항목 없이 즉시 문단 전환
 * 🚨 @PATCH : **2026-11-07** — [리스트 분할/해제 시 TextSelection inline content 예외 원천 방어]: TextSelection.create 대신 Selection.near를 적용하여 ordered_list/bullet_list 경계점 예외(TextSelection endpoint not pointing into a node with inline content) 완전 차단
 * 🚨 @PATCH : 2026-11-05 — [목록 선택·내어쓰기]: 앞 문단 끝 경계는 목록 전환에서 제외하고, 마지막 항목의 이어지는 문단은 Shift+Tab으로 해당 문단만 목록 밖으로 이동한다.
 * 🚨 @PATCH : **2026-10-31** — [목록 서식 동일 버튼 재클릭 시 취소(토글 해제) 지원]:
 *             1) selectedList에서 현재 선택된 목록이 이미 동일한 종류(bullet, ordered, check)일 경우 selectedList('clear')를 자동 격발하여 일반 문단으로 즉시 취소
 * 🚨 @PATCH : **2026-10-28** — [리스트 하단 들여쓰기(Tab) 문단에서 툴바 목록 전환 시 상위 리스트 하위 레벨 자동 편입]:
 *             1) 번호/글머리 기호 리스트 바로 아래에서 Tab으로 들여쓰기(indentPx > 0)된 문단을 툴바(글머리 기호 등)로 목록 전환 시, 들여쓰기가 초기화되지 않고 직전 리스트의 하위 레벨 목록으로 즉시 자동 중첩되도록 selectedList 개선
 * 🚨 @PATCH : **2026-10-25** — [목록 첫 항목 Tab 전체 들여쓰기 및 Shift+Tab 내어쓰기 구현]:
 *             1) indentWholeList 및 outdentWholeList 신설: 첫 번째 항목(itemIndex === 0)에서 Tab 입력 시 빈 상위 항목 생성 없이 목록 전체(bullet_list / ordered_list)를 오른쪽으로 28px 문단 들여쓰기
 *             2) independentIndentListItem 개선: 선행 결합 리스트가 없는 첫 항목에서 indentWholeList를 호출하여 목록 전체 이동
 *             3) independentLiftListItem 개선: 들여쓰기된 목록(indentPx > 0)에서 Shift+Tab 입력 시 목록 전체를 한 단계씩 왼쪽으로 안전하게 되돌림
 * 🚨 @PATCH : **2026-10-21** — [1레벨 리스트 항목 및 빈 줄 너머 이전 리스트로 Tab 들여쓰기 스마트 연동]:
 *             1) independentIndentListItem 개선: 1레벨 첫 번째 항목이거나 사이에 빈 줄이 있어 분리된 리스트더라도 Tab 입력 시 이전 리스트(안전 규정 등)의 하위 2레벨 항목으로 즉시 들여쓰기 수행
 * 🚨 @PATCH : **2026-10-21** — [리스트 사이 빈 줄 방향키 건너뛰기 방어 및 빈 항목 백스페이스 삭제/병합 일원화]:
 *             1) moveUpFromEmptyOrderedItem을 bullet_list까지 확장하여 불릿 빈 항목에서 백스페이스 시 리스트 분할/빈문단 없이 즉시 삭제 및 이전 항목 끝으로 복귀
 *             2) moveUpAcrossListBoundary / moveDownAcrossListBoundary를 신설하여 리스트와 빈 문단 사이를 방향키(↑/↓)로 이동 시 건너뛰지 않고 빈 줄에 정확히 안착
 *             3) deleteAtEndOfList를 신설하여 리스트 끝에서 Delete 시 바로 뒤 빈 문단을 깔끔하게 삭제하고 분리된 리스트를 하나로 자동 병합
 * 🚨 @PATCH : **2026-10-21** — [상위 리스트 들여쓰기 시 하위 레벨 항목 보존(상위 레벨 역주행 튀어나옴 방어)]:
 *             1) independentIndentListItem 및 indentItemIntoPreviousList 개선: 상위 항목 Tab 들여쓰기 시 하위 리스트가 상위 레벨(1레벨)로 역주행 튀어나오던 분리 결함을 제거하고, 하위 항목과의 부모-자식 위계 구조를 100% 온전히 유지하도록 정돈
 * 🚨 @PATCH : **2026-10-21** — [서로 다른 리스트(글머리↔숫자) 간 Tab 들여쓰기 지원 및 리스트 중간 엔터 분할 시 아래 리스트 들여쓰기 100% 보존]:
 *             1) exitEmptyListItem 전면 개선: 리스트 중간에서 볼트 삭제를 위해 엔터 입력 시 리스트를 상/하단으로 안전 분할하여 아래 리스트의 하위 들여쓰기/구조가 깨지는 현상 원천 해결
 *             2) independentIndentListItem 개선: 이전 리스트 항목이 서로 다른 타입(bullet_list ↔ ordered_list)이어도 이전 항목의 하위 리스트로 쏙 들어가는 교차 리스트 들여쓰기 완벽 지원
 * 🚨 @PATCH : **2026-10-21** — [빈 문단에서 Delete 시 아래 리스트 보존 및 원클릭 올림(deleteEmptyParagraphBeforeList) 구현]:
 *             1) 빈 문단에서 Delete 키 입력 시 아래 리스트가 일반 텍스트로 풀리는(unwrap) 버그를 원천 차단하고 빈 문단만 깔끔히 삭제하여 아래 리스트를 100% 서식 유지한 채 위로 즉시 끌어올림
 * 🚨 @PATCH : **2026-10-18** — [목록 번호 백스페이스 삭제 시 재진입/번호 재생성(핑퐁 토글) 결함 완전 해소]:
 *             1) 목록 항목에서 백스페이스로 번호를 지운 뒤 직후 백스페이스를 한 번 더 누를 때, generic joinBackward로 인해 다시 목록 항목으로 흡수되어 번호가 부활하던 결함 차단
 *             2) 목록 바로 아래 문단에서 백스페이스 시 이전 목록 끝에 빈 항목이 있으면 해당 빈 항목을 안전하게 삭제하고, 내용이 있으면 텍스트로 합쳐지도록 개선
 */
import { Fragment, Node as DocumentNode } from 'prosemirror-model';
import { Command, Selection, TextSelection, Transaction, EditorState } from 'prosemirror-state';
import { closeHistory } from 'prosemirror-history';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { joinForward } from 'prosemirror-commands';
import { visualSchema } from './visualDocumentCodec';

const isList=(node:DocumentNode)=>['bullet_list','ordered_list'].includes(node.type.name);

/** 서로 다른 리스트 타입 간(bullet_list ↔ ordered_list) 들여쓰기 지원 헬퍼 */
function indentItemIntoPreviousList(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  _currentView: any,
  itemDepth: number,
  listDepth: number,
  prevList: DocumentNode,
  prevListPos?: number
): boolean {
  if (!dispatch) return true;
  const { $from } = state.selection;
  const currentList = $from.node(listDepth);
  const currentItem = $from.node(itemDepth);
  const selectedRange = $from.blockRange(state.selection.$to, node=>node===currentList);
  if (!state.selection.empty && !selectedRange) return false;
  const selectedItems: DocumentNode[] = [];
  const selectedCount = selectedRange ? selectedRange.endIndex - selectedRange.startIndex : 1;
  for (let index = 0; index < selectedCount; index++) selectedItems.push(currentList.child(index));
  const originalItemPos = $from.before(itemDepth);
  const listPos = $from.before(listDepth);
  const currentEnd = $from.after(listDepth);

  // prevList의 마지막 항목(lastChild) 가져오기
  const lastChild = prevList.lastChild;
  if (!lastChild) return true;

  // 🛡️ currentItem 전체(하위 리스트 포함)를 온전히 유지하여 하위 레벨이 상위로 튀어나오지 않도록 보존
  const lastChildChildren: DocumentNode[] = [];
  let existingSubListIndex = -1;
  for (let i = 0; i < lastChild.childCount; i++) {
    const c = lastChild.child(i);
    if (c.type === currentList.type) {
      existingSubListIndex = i;
    }
    lastChildChildren.push(c);
  }

  if (existingSubListIndex !== -1) {
    const oldSubList = lastChildChildren[existingSubListIndex];
    const newSubListChildren: DocumentNode[] = [];
    oldSubList.forEach(child => newSubListChildren.push(child));
    newSubListChildren.push(...selectedItems);
    const updatedSubList = oldSubList.type.create(oldSubList.attrs, Fragment.fromArray(newSubListChildren));
    lastChildChildren[existingSubListIndex] = updatedSubList;
  } else {
    const newSubList = currentList.type.create(currentList.attrs, Fragment.fromArray(selectedItems));
    lastChildChildren.push(newSubList);
  }

  const updatedLastItem = lastChild.type.create(lastChild.attrs, Fragment.fromArray(lastChildChildren));

  const updatedPrevChildren: DocumentNode[] = [];
  for (let i = 0; i < prevList.childCount - 1; i++) {
    updatedPrevChildren.push(prevList.child(i));
  }
  updatedPrevChildren.push(updatedLastItem);
  const updatedPrevList = prevList.type.create(prevList.attrs, Fragment.fromArray(updatedPrevChildren));

  // 현재 리스트에 남은 항목들
  const remainingInCurrent: DocumentNode[] = [];
  for (let i = selectedCount; i < currentList.childCount; i++) {
    remainingInCurrent.push(currentList.child(i));
  }

  const replacementNodes: DocumentNode[] = [updatedPrevList];
  if (remainingInCurrent.length > 0) {
    const updatedCurrentList = currentList.type.create({
      ...currentList.attrs,
      order: currentList.type.name === 'ordered_list' ? (currentList.attrs.order || 1) + selectedCount : undefined
    }, Fragment.fromArray(remainingInCurrent));
    replacementNodes.push(updatedCurrentList);
  }

  const actualPrevPos = prevListPos !== undefined ? prevListPos : listPos;
  const replaceFrom = actualPrevPos - prevList.nodeSize;
  const tr = state.tr.replaceWith(replaceFrom, currentEnd, replacementNodes);

  let targetPos = -1;
  tr.doc.nodesBetween(replaceFrom, replaceFrom + updatedPrevList.nodeSize, (node: DocumentNode, pos: number) => {
    if (node === currentItem) {
      targetPos = pos + 1;
      return false;
    }
  });

  if (targetPos !== -1) {
    tr.setSelection(TextSelection.create(tr.doc,targetPos-1+state.selection.anchor-originalItemPos,targetPos-1+state.selection.head-originalItemPos));
  }
  dispatch(closeHistory(tr).scrollIntoView());
  return true;
}


/** Remove the next item's boundary without letting a structural replacement
 * move the caret to an unrelated trailing paragraph. */
/** 빈 문단에서 Delete 시 아래 리스트가 일반 텍스트로 풀리는 현상을 방지하고,
 * 빈 문단만 삭제하며 아래 리스트의 서식을 온전히 유지한 채 위로 끌어올림 */
/** 상위 리스트 항목에서 Tab 입력 시 하위 리스트의 위계 구조를 그대로 보존하며
 * 이전 형제 항목 또는 교차 리스트로 안전하게 들여쓰기 수행 */
export const independentIndentListItem: Command = (state, dispatch, currentView) => {
  const { $from } = state.selection;
  let itemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      itemDepth = d;
      break;
    }
  }
  if (itemDepth === -1) return false;

  const listDepth = itemDepth - 1;
  const itemIndexInList = $from.index(listDepth);

  if (!state.selection.empty && state.selection instanceof TextSelection) {
    const list = $from.node(listDepth);
    const listPos = $from.before(listDepth);
    const items: DocumentNode[] = [];
    let first = -1;
    let last = -1;
    list.forEach((item, offset) => {
      const start = listPos + 1 + offset;
      items.push(item);
      if (start < state.selection.to && start + item.nodeSize > state.selection.from) {
        if (first < 0) first = items.length - 1;
        last = items.length - 1;
      }
    });
    if (first >= 0) {
      if (dispatch) {
        const replacement: DocumentNode[] = [];
        const makeList = (part: DocumentNode[], startIndex: number, indentPx: number | null) =>
          list.type.create({
            ...list.attrs,
            indentPx,
            ...(list.type === visualSchema.nodes.ordered_list ? { order: (list.attrs.order || 1) + startIndex } : {}),
          }, Fragment.fromArray(part));
        if (first > 0) replacement.push(makeList(items.slice(0, first), 0, list.attrs.indentPx));
        replacement.push(makeList(items.slice(first, last + 1), first, bounded((list.attrs.indentPx || 0) + listStep(currentView))));
        if (last + 1 < items.length) replacement.push(makeList(items.slice(last + 1), last + 1, list.attrs.indentPx));
        const tr = state.tr.replaceWith(listPos, $from.after(listDepth), Fragment.fromArray(replacement));
        const relocate = ($position: typeof state.selection.$anchor) => {
          let found: number | undefined;
          tr.doc.descendants((node, pos) => {
            if (node === $position.parent && found === undefined) found = pos + 1 + $position.parentOffset;
          });
          return found;
        };
        const anchor = relocate(state.selection.$anchor);
        const head = relocate(state.selection.$head);
        if (anchor !== undefined && head !== undefined) tr.setSelection(TextSelection.create(tr.doc, anchor, head));
        dispatch(closeHistory(tr).scrollIntoView());
      }
      return true;
    }
  }

  // 1) 같은 리스트 내에서 이전 형제가 있는 경우 -> sinkListItem으로 이전 항목의 하위로 안전 들여쓰기
  // 🛡️ 하위 리스트(사전 동의 원칙 등)가 상위 레벨(1레벨)로 튀어나오지 않고 하위 위계를 100% 온전히 유지
  if (itemIndexInList > 0) {
    sinkListItem(visualSchema.nodes.list_item)(state, dispatch, currentView);
    return true;
  }

  // 2) 리스트의 첫 번째 항목(itemIndexInList === 0)인 경우:
  // 바로 앞 블록(또는 빈 줄 너머의 이전 블록)이 리스트인지 검사하여 이전 리스트의 하위로 안전 들여쓰기
  const listPos = $from.before(listDepth);
  if (listPos > 0) {
    let prevNode = state.doc.resolve(listPos).nodeBefore;
    let prevListPos = listPos;
    if (prevNode && prevNode.type === visualSchema.nodes.paragraph && prevNode.content.size === 0) {
      const emptyStart = listPos - prevNode.nodeSize;
      const nodeBeforeEmpty = state.doc.resolve(emptyStart).nodeBefore;
      if (nodeBeforeEmpty && isList(nodeBeforeEmpty)) {
        prevNode = nodeBeforeEmpty;
        prevListPos = emptyStart;
      }
    }
    if (prevNode && isList(prevNode)) {
      return indentItemIntoPreviousList(state, dispatch, currentView, itemDepth, listDepth, prevNode, prevListPos);
    }
  }

  // 3) 이전 리스트가 없는 첫 번째 항목인 경우 -> 빈 상위 항목 생성 없이 목록 전체를 오른쪽으로 문단 들여쓰기
  return indentWholeList(state, dispatch, currentView, listDepth);
};

function listStep(view?: any): number {
  if (!view) return 28;
  try {
    const css = getComputedStyle(view.dom);
    const value = css.getPropertyValue('--list-indent').trim();
    const font = Number.parseFloat(css.fontSize) || 16;
    return value.endsWith('px') ? Number.parseFloat(value) : value.endsWith('em') ? Number.parseFloat(value) * font : font * 2;
  } catch {
    return 28;
  }
}

const bounded = (value: number) => Math.max(0, Math.min(4096, Math.round(value * 100) / 100));

/** 리스트의 첫 항목에서 Tab 시 빈 상위 항목을 만들지 않고 목록 전체의 indentPx를 1단계 증가 */
export const indentWholeList = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: any, listDepthParam?: number): boolean => {
  const { $from } = state.selection;
  let listDepth = listDepthParam ?? -1;
  if (listDepth === -1) {
    for (let d = $from.depth; d > 0; d--) {
      if (isList($from.node(d))) {
        listDepth = d;
        break;
      }
    }
  }
  if (listDepth === -1) return false;

  const listNode = $from.node(listDepth);
  const listPos = $from.before(listDepth);
  const step = listStep(view);
  const current = listNode.attrs.indentPx ?? 0;
  const nextIndent = bounded(current + step);

  if (dispatch) {
    const tr = state.tr.setNodeMarkup(listPos, undefined, {
      ...listNode.attrs,
      indentPx: nextIndent,
    });
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

/** 들여쓰기된 목록에서 Shift+Tab 시 indentPx를 1단계 감소 (0 이하 시 null로 초기화) */
export const outdentWholeList = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: any, listDepthParam?: number): boolean => {
  const { $from } = state.selection;
  let listDepth = listDepthParam ?? -1;
  if (listDepth === -1) {
    for (let d = $from.depth; d > 0; d--) {
      if (isList($from.node(d))) {
        listDepth = d;
        break;
      }
    }
  }
  if (listDepth === -1) return false;

  const listNode = $from.node(listDepth);
  const listPos = $from.before(listDepth);
  const current = listNode.attrs.indentPx ?? 0;
  if (current <= 0) return false;

  const step = listStep(view);
  const nextIndent = current - step <= 0 ? null : bounded(current - step);

  if (dispatch) {
    const tr = state.tr.setNodeMarkup(listPos, undefined, {
      ...listNode.attrs,
      indentPx: nextIndent,
    });
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

/** 상위 리스트 항목에서 Shift+Tab 입력 시 하위 레벨 항목의 위계를 보존하며 안전하게 내어쓰기 수행 */
export const independentLiftListItem: Command = (state, dispatch, view) => {
  const { $from, $to } = state.selection;
  let itemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      itemDepth = d;
      break;
    }
  }
  if (itemDepth === -1) return false;

  // 마지막 목록 항목 안의 이어지는 문단은 상위 항목 전체가 아닌 현재 문단만 내어쓴다.
  const containingItem = $from.node(itemDepth);
  const paragraphIndex = $from.index(itemDepth);
  if (state.selection.empty && $from.parent.type === visualSchema.nodes.paragraph
    && paragraphIndex > 0 && paragraphIndex === containingItem.childCount - 1) {
    if (!dispatch) return true;
    const listDepth = itemDepth - 1;
    const listNode = $from.node(listDepth);
    const itemIndex = $from.index(listDepth);
    const beforeItems: DocumentNode[] = [];
    const afterItems: DocumentNode[] = [];
    listNode.forEach((item, _offset, index) => {
      if (index < itemIndex) beforeItems.push(item);
      else if (index > itemIndex) afterItems.push(item);
    });
    const retained = containingItem.copy(containingItem.content.cut(0, containingItem.content.size - $from.parent.nodeSize));
    beforeItems.push(retained);
    const beforeList = listNode.copy(Fragment.fromArray(beforeItems));
    const replacement: DocumentNode[] = [beforeList, $from.parent];
    if (afterItems.length) replacement.push(listNode.copy(Fragment.fromArray(afterItems)));
    const listPos = $from.before(listDepth);
    const tr = state.tr.replaceWith(listPos, $from.after(listDepth), replacement);
    const paragraphPos = listPos + beforeList.nodeSize;
    tr.setSelection(TextSelection.create(tr.doc, paragraphPos + 1 + $from.parentOffset));
    dispatch(closeHistory(tr).scrollIntoView());
    return true;
  }

  const range = $from.blockRange($to, node => isList(node) && node.firstChild?.type === visualSchema.nodes.list_item);
  if (range && range.depth >= 3 && $from.node(range.depth - 1).type === visualSchema.nodes.list_item && state.selection instanceof TextSelection) {
    if (!dispatch) return true;
    const list = range.parent, parent = $from.node(range.depth - 1), outer = $from.node(range.depth - 2);
    const parentIndex = $from.index(range.depth - 2), childIndex = $from.index(range.depth - 1);
    const beforeBlocks: DocumentNode[] = [];
    for (let index = 0; index < childIndex; index++) beforeBlocks.push(parent.child(index));
    if (range.startIndex) beforeBlocks.push(list.type.create({...list.attrs, indentPx: null}, Fragment.fromArray(Array.from({length:range.startIndex},(_,index)=>list.child(index)))));
    const lifted: DocumentNode[] = [];
    for (let index = range.startIndex; index < range.endIndex; index++) lifted.push(list.child(index));
    const suffix: DocumentNode[] = [];
    if (range.endIndex < list.childCount) {
      const remaining: DocumentNode[] = [];
      for (let index = range.endIndex; index < list.childCount; index++) remaining.push(list.child(index));
      suffix.push(list.type.create({...list.attrs, indentPx: null, ...(list.type.name==='ordered_list'?{order:(list.attrs.order||1)+range.endIndex}:{})},Fragment.fromArray(remaining)));
    }
    // Trailing quote/table/paragraph blocks belong after the moved content.
    // Standard liftListItem wraps these in a new marker-only list_item.
    for (let index = childIndex + 1; index < parent.childCount; index++) suffix.push(parent.child(index));
    const last = lifted[lifted.length - 1];
    lifted[lifted.length - 1] = last.copy(last.content.append(Fragment.fromArray(suffix)));
    const items: DocumentNode[] = [];
    for (let index = 0; index < parentIndex; index++) items.push(outer.child(index));
    if (beforeBlocks.length) items.push(parent.copy(Fragment.fromArray(beforeBlocks)));
    const outerPos = $from.before(range.depth - 2);
    const selectedStart = outerPos + 1 + items.reduce((size,node)=>size+node.nodeSize,0);
    items.push(...lifted);
    for (let index = parentIndex + 1; index < outer.childCount; index++) items.push(outer.child(index));
    const tr = state.tr.replaceWith(outerPos,$from.after(range.depth - 2),outer.copy(Fragment.fromArray(items)));
    tr.setSelection(TextSelection.create(tr.doc,selectedStart+state.selection.anchor-range.start,selectedStart+state.selection.head-range.start));
    dispatch(closeHistory(tr).scrollIntoView());
    return true;
  }

  // 2) 목록 전체가 들여쓰기(indentPx > 0)되어 있는 경우 -> 목록 전체를 왼쪽으로 한 단계 내어쓰기
  const listDepth = itemDepth - 1;
  const listNode = $from.node(listDepth);
  if (listNode && (listNode.attrs.indentPx ?? 0) > 0) {
    return outdentWholeList(state, dispatch, view, listDepth);
  }

  // A top-level item has no parent list level to move into. Consume Shift+Tab
  // without lifting it into a plain paragraph and losing its marker.
  if (listDepth <= 1 || $from.node(listDepth - 1).type !== visualSchema.nodes.list_item) {
    // The selected item is already at the left edge. Promote its direct child
    // lists instead, keeping the selected item's marker and each child's type.
    const listPos = $from.before(listDepth);
    const replacement: DocumentNode[] = [];
    let segment: DocumentNode[] = [];
    let changed = false;
    listNode.forEach((item, offset) => {
      const itemStart = listPos + 1 + offset;
      const selected = itemStart < state.selection.to && itemStart + item.nodeSize > state.selection.from;
      if (!selected) {
        segment.push(item);
        return;
      }
      const children: DocumentNode[] = [];
      const retained: DocumentNode[] = [];
      item.forEach((node, childOffset) => {
        const childStart = itemStart + 1 + childOffset;
        const childSelected = childStart < state.selection.to && childStart + node.nodeSize > state.selection.from;
        (isList(node) && (state.selection.empty || childSelected) ? children : retained).push(node);
      });
      if (!children.length) {
        segment.push(item);
        return;
      }
      changed = true;
      segment.push(item.copy(Fragment.fromArray(retained)));
      replacement.push(listNode.copy(Fragment.fromArray(segment)), ...children);
      segment = [];
    });
    if (!changed) return true;
    if (!dispatch) return true;
    if (segment.length) replacement.push(listNode.copy(Fragment.fromArray(segment)));
    const tr = state.tr.replaceWith(listPos, $from.after(listDepth), Fragment.fromArray(replacement));
    const relocate = ($position: typeof state.selection.$anchor) => {
      let found: number | undefined;
      tr.doc.descendants((node, pos) => {
        if (node === $position.parent && found === undefined) found = pos + 1 + $position.parentOffset;
      });
      return found;
    };
    const anchor = relocate(state.selection.$anchor);
    const head = relocate(state.selection.$head);
    if (anchor !== undefined && head !== undefined) {
      tr.setSelection(TextSelection.create(tr.doc, anchor, head));
    } else {
      tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(state.selection.anchor, tr.doc.content.size))));
    }
    dispatch(closeHistory(tr).scrollIntoView());
    return true;
  }
  return liftListItem(visualSchema.nodes.list_item)(state, dispatch, view);
};

export const deleteEmptyParagraphBeforeList: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.paragraph) return false;

  let isBlank = true;
  $from.parent.forEach(node => {
    if (node.type !== visualSchema.nodes.hard_break && (!node.isText || /[^\s\u200b\ufeff]/.test(node.text || ''))) {
      isBlank = false;
    }
  });
  if (!isBlank) return false;

  const depth = $from.depth;
  const container = $from.node(depth - 1);
  const index = $from.index(depth - 1);
  if (index + 1 >= container.childCount) return false;

  const nextNode = container.child(index + 1);
  if (!isList(nextNode)) return false;

  if (dispatch) {
    const fromPos = $from.before(depth);
    const toPos = $from.after(depth);
    const tr = state.tr.delete(fromPos, toPos);
    tr.setSelection(TextSelection.near(tr.doc.resolve(fromPos)));
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

export const deleteNextListBoundary: Command = (state,dispatch,view) => {
  const {$from,empty}=state.selection;
  if(!empty || !$from.parent.isTextblock || $from.parentOffset!==$from.parent.content.size)return false;
  const depth=$from.depth-1;
  if(depth<2 || $from.node(depth).type!==visualSchema.nodes.list_item || !isList($from.node(depth-1)))return false;
  if($from.index(depth)!==$from.node(depth).childCount-1 || $from.index(depth-1)+1 >= $from.node(depth-1).childCount)return false;
  const caret=$from.pos;
  return joinForward(state,dispatch?tr=>{
    tr.setSelection(TextSelection.near(tr.doc.resolve(tr.mapping.map(caret,-1)),-1));
    dispatch(closeHistory(tr).scrollIntoView());
  }:undefined,view);
};

/** Keep an extended selection inside its list when moving past its last visual line. */
export const extendSelectionToListEnd: Command = (state,dispatch,view) => {
  const selection=state.selection;
  if(!(selection instanceof TextSelection) || selection.empty || selection.anchor>=selection.head || !view)return false;
  const head=selection.$head;
  let depth=head.depth;
  while(depth>0 && !isList(head.node(depth)))depth--;
  if(!depth)return false;
  const start=head.start(depth),list=head.node(depth);
  if(selection.anchor<start)return false;
  let end:number|undefined;
  list.descendants((node,pos)=>{if(node.isTextblock)end=start+pos+1+node.content.size;});
  if(end===undefined)return false;
  // Earlier wrapped lines retain normal browser vertical selection behavior.
  const here=view.coordsAtPos(selection.head),last=view.coordsAtPos(end);
  if(Math.abs(here.top-last.top)>2)return false;
  if(dispatch && selection.head!==end)dispatch(state.tr.setSelection(TextSelection.create(state.doc,selection.anchor,end)));
  return true;
};

/** Delete at an empty paragraph between ordered lists joins their items,
 * without joining the text of adjacent items. */
export const joinOrderedListsAcrossEmptyParagraph: Command = (state,dispatch) => {
  const {$from,empty}=state.selection;
  if(!empty || $from.depth!==1 || $from.parent.type!==visualSchema.nodes.paragraph || $from.parent.content.size)return false;
  const doc=state.doc,isBlank=(node:DocumentNode)=>node.type===visualSchema.nodes.paragraph && node.content.size===0;
  let before=$from.index(0)-1,after=$from.index(0)+1;
  while(before>=0 && isBlank(doc.child(before)))before--;
  while(after<doc.childCount && isBlank(doc.child(after)))after++;
  if(before<0 || after>=doc.childCount)return false;
  const previous=doc.child(before),next=doc.child(after);
  if(previous.type!==visualSchema.nodes.ordered_list || next.type!==visualSchema.nodes.ordered_list)return false;
  let from=0;for(let index=0;index<before;index++)from+=doc.child(index).nodeSize;
  let to=from;for(let index=before;index<=after;index++)to+=doc.child(index).nodeSize;
  if(dispatch){
    const merged=previous.copy(previous.content.append(next.content));
    const tr=state.tr.replaceWith(from,to,merged);
    const startOfNext=from+1+previous.content.size+2;
    tr.setSelection(TextSelection.near(tr.doc.resolve(startOfNext)));
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

/** Enter exits an empty item at its own position; Backspace has a different
 * contract and may move to the preceding item. */
export const exitEmptyListItem: Command = (state, dispatch, view) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.paragraph) return false;
  let blank = true;
  $from.parent.forEach(node => {
    if (node.type !== visualSchema.nodes.hard_break && (!node.isText || /[^\s\u200b\ufeff]/.test(node.text || ''))) blank = false;
  });
  if (!blank) return false;
  const depth = $from.depth - 1;
  if (depth < 1 || $from.node(depth).type !== visualSchema.nodes.list_item) return false;

  const itemNode = $from.node(depth);
  // A blank continuation paragraph is not an empty list item. Never lift its
  // preceding title and nested lists together with the caret's paragraph.
  const paragraphIndex = $from.index(depth);
  if (paragraphIndex > 0) {
    if (paragraphIndex !== itemNode.childCount - 1) return false;
    if (dispatch) {
      const listDepth = depth - 1;
      const listNode = $from.node(listDepth);
      const itemIndex = $from.index(listDepth);
      const retainedItem = itemNode.copy(itemNode.content.cut(0, itemNode.content.size - $from.parent.nodeSize));
      const beforeItems: DocumentNode[] = [];
      const afterItems: DocumentNode[] = [];
      listNode.forEach((item, _offset, index) => {
        if (index < itemIndex) beforeItems.push(item);
        else if (index === itemIndex) beforeItems.push(retainedItem);
        else afterItems.push(item);
      });
      const firstList = listNode.copy(Fragment.fromArray(beforeItems));
      const blocks = [firstList, visualSchema.nodes.paragraph.create()];
      if (afterItems.length) blocks.push(listNode.type.create({
        ...listNode.attrs,
        ...(listNode.type.name === 'ordered_list' ? { order: (listNode.attrs.order || 1) + itemIndex + 1 } : {})
      }, Fragment.fromArray(afterItems)));
      const listPos = $from.before(listDepth);
      const tr = state.tr.replaceWith(listPos, $from.after(listDepth), blocks);
      tr.setSelection(Selection.near(tr.doc.resolve(listPos + firstList.nodeSize + 1)));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  }
  // 만약 itemNode가 paragraph 외에 하위 리스트를 가지고 있다면 unwrap/lift 처리
  if (itemNode.childCount > 1) {
    const tr = state.tr;
    if ($from.parent.content.size) tr.delete($from.start(), $from.end());
    const cleaned = tr.docChanged ? state.apply(tr) : state;
    return liftListItem(visualSchema.nodes.list_item)(cleaned, dispatch ? (lifted: Transaction) => {
      for (const step of lifted.steps) tr.step(step);
      tr.setSelection(Selection.near(tr.doc.resolve(lifted.selection.anchor)));
      dispatch(closeHistory(tr).scrollIntoView());
    } : undefined, view);
  }

  const listDepth = depth - 1;
  const listNode = $from.node(listDepth);
  const itemIndex = $from.index(listDepth);

  // 1) 리스트에 이 빈 항목 하나뿐인 경우 -> 리스트를 빈 문단으로 교체
  if (listNode.childCount === 1) {
    if (dispatch) {
      const listPos = $from.before(listDepth);
      const listEnd = $from.after(listDepth);
      const emptyP = visualSchema.nodes.paragraph.create();
      const tr = state.tr.replaceWith(listPos, listEnd, emptyP);
      tr.setSelection(TextSelection.near(tr.doc.resolve(listPos + 1)));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  }

  // 2) 리스트의 마지막 항목인 경우 -> 빈 항목 삭제 후 리스트 뒤에 빈 문단 배치
  if (itemIndex === listNode.childCount - 1) {
    if (dispatch) {
      const itemPos = $from.before(depth);
      const listEnd = $from.after(listDepth);
      const emptyP = visualSchema.nodes.paragraph.create();
      const tr = state.tr.delete(itemPos, listEnd);
      const insertPos = tr.mapping.map(listEnd);
      tr.insert(insertPos, emptyP);
      tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  }

  // 3) 리스트의 첫 번째 항목인 경우 -> 빈 항목 삭제 후 리스트 앞에 빈 문단 배치
  if (itemIndex === 0) {
    if (dispatch) {
      const listPos = $from.before(listDepth);
      const itemEnd = $from.after(depth);
      const emptyP = visualSchema.nodes.paragraph.create();
      const tr = state.tr.delete(listPos + 1, itemEnd);
      tr.insert(listPos, emptyP);
      tr.setSelection(TextSelection.near(tr.doc.resolve(listPos + 1)));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  }

  // 4) 리스트 중간 항목인 경우 (0 < itemIndex < listNode.childCount - 1)
  // 🛡️ 리스트를 둘로 안전 분할하여 아래 리스트의 들여쓰기/구조를 100% 온전히 보존!
  if (dispatch) {
    const listPos = $from.before(listDepth);
    const listEnd = $from.after(listDepth);

    const beforeItems: DocumentNode[] = [];
    for (let i = 0; i < itemIndex; i++) {
      beforeItems.push(listNode.child(i));
    }

    const afterItems: DocumentNode[] = [];
    for (let i = itemIndex + 1; i < listNode.childCount; i++) {
      afterItems.push(listNode.child(i));
    }

    const firstList = listNode.type.create(listNode.attrs, Fragment.fromArray(beforeItems));
    const emptyP = visualSchema.nodes.paragraph.create();
    const secondList = listNode.type.create({
      ...listNode.attrs,
      order: listNode.type.name === 'ordered_list' ? (listNode.attrs.order || 1) + beforeItems.length + 1 : undefined
    }, Fragment.fromArray(afterItems));

    const tr = state.tr.replaceWith(listPos, listEnd, [firstList, emptyP, secondList]);
    const emptyPPos = listPos + firstList.nodeSize;
    tr.setSelection(TextSelection.near(tr.doc.resolve(emptyPPos + 1)));
    dispatch(closeHistory(tr).scrollIntoView());
  }
  return true;
};

/** Native vertical movement preserves the empty item's horizontal column,
 * which can land halfway through a wrapped previous item. */
/** 빈 리스트 항목(순서형 및 불릿 공통)에서 위쪽 방향키 또는 백스페이스 시 이전 항목 끝으로 안전 이동 */
export const moveUpFromEmptyOrderedItem: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parent.content.size) return false;
  const itemDepth = $from.depth - 1;
  const listDepth = itemDepth - 1;
  if (listDepth < 0 || $from.node(itemDepth).type.name !== 'list_item'
    || !['ordered_list', 'bullet_list'].includes($from.node(listDepth).type.name)
    || $from.index(itemDepth) !== 0 || $from.index(listDepth) === 0) return false;
  const previous = $from.node(listDepth).child($from.index(listDepth) - 1);
  const previousStart = $from.before(itemDepth) - previous.nodeSize;
  let end: number | undefined;
  previous.descendants((node, pos) => {
    if (node.isTextblock) end = previousStart + 1 + pos + 1 + node.content.size;
  });
  if (end === undefined) return false;
  if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, end)).scrollIntoView());
  return true;
};

/** 리스트와 빈 문단 사이를 위쪽 방향키(↑)로 이동 시 건너뛰지 않고 빈 문단에 정확히 멈추도록 보정 */
export const moveUpAcrossListBoundary: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;

  // 1) 현재 커서가 리스트 사이의 빈 문단에 있는 경우 -> 위쪽 리스트의 마지막 항목으로 이동
  if ($from.parent.type === visualSchema.nodes.paragraph && $from.parent.content.size === 0) {
    const depth = $from.depth;
    if (depth === 1) {
      const posBefore = $from.before(depth);
      if (posBefore > 0) {
        const prevBlock = state.doc.resolve(posBefore).nodeBefore;
        if (prevBlock && isList(prevBlock)) {
          let lastTextPos = -1;
          const listStart = posBefore - prevBlock.nodeSize;
          prevBlock.descendants((n, p) => {
            if (n.isTextblock) lastTextPos = listStart + 1 + p + n.content.size;
          });
          if (lastTextPos !== -1) {
            if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, lastTextPos)).scrollIntoView());
            return true;
          }
        }
      }
    }
  }

  // 2) 현재 커서가 리스트의 첫 번째 항목 맨 앞줄에 있는 경우 -> 바로 위의 빈 문단으로 이동
  let itemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      itemDepth = d;
      break;
    }
  }
  if (itemDepth === -1) return false;
  const listDepth = itemDepth - 1;
  if ($from.index(listDepth) === 0 && $from.index(itemDepth) === 0) {
    const listPos = $from.before(listDepth);
    if (listPos > 0) {
      const prevBlock = state.doc.resolve(listPos).nodeBefore;
      if (prevBlock && prevBlock.type === visualSchema.nodes.paragraph && prevBlock.content.size === 0) {
        const targetPos = listPos - 1;
        if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, targetPos)).scrollIntoView());
        return true;
      }
    }
  }

  return false;
};

/** 리스트와 빈 문단 사이를 아래쪽 방향키(↓)로 이동 시 건너뛰지 않고 빈 문단에 정확히 멈추도록 보정 */
export const moveDownAcrossListBoundary: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;

  // 1) 현재 커서가 리스트 사이의 빈 문단에 있는 경우 -> 아래쪽 리스트의 첫 번째 항목으로 이동
  if ($from.parent.type === visualSchema.nodes.paragraph && $from.parent.content.size === 0) {
    const depth = $from.depth;
    if (depth === 1) {
      const posAfter = $from.after(depth);
      if (posAfter < state.doc.content.size) {
        const nextBlock = state.doc.resolve(posAfter).nodeAfter;
        if (nextBlock && isList(nextBlock)) {
          let firstTextPos = -1;
          nextBlock.descendants((n, p) => {
            if (n.isTextblock && firstTextPos === -1) firstTextPos = posAfter + 1 + p + 1;
          });
          if (firstTextPos !== -1) {
            if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, firstTextPos)).scrollIntoView());
            return true;
          }
        }
      }
    }
  }

  // 2) 현재 커서가 리스트의 마지막 항목에 있는 경우 -> 바로 아래의 빈 문단으로 이동
  let itemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      itemDepth = d;
      break;
    }
  }
  if (itemDepth === -1) return false;
  const listDepth = itemDepth - 1;
  const listNode = $from.node(listDepth);
  if ($from.index(listDepth) === listNode.childCount - 1 && $from.index(itemDepth) === $from.node(itemDepth).childCount - 1) {
    const listEnd = $from.after(listDepth);
    if (listEnd < state.doc.content.size) {
      const nextBlock = state.doc.resolve(listEnd).nodeAfter;
      if (nextBlock && nextBlock.type === visualSchema.nodes.paragraph && nextBlock.content.size === 0) {
        const targetPos = listEnd + 1;
        if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, targetPos)).scrollIntoView());
        return true;
      }
    }
  }

  return false;
};

/** 리스트 마지막 항목 끝에서 Delete 시 바로 뒤의 빈 문단을 삭제하고 분리된 리스트를 원상 병합 */
export const deleteAtEndOfList: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parentOffset !== $from.parent.content.size) return false;
  let itemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      itemDepth = d;
      break;
    }
  }
  if (itemDepth === -1) return false;
  const listDepth = itemDepth - 1;
  const listNode = $from.node(listDepth);
  if ($from.index(listDepth) !== listNode.childCount - 1) return false;

  const listEnd = $from.after(listDepth);
  if (listEnd >= state.doc.content.size) return false;

  const nextNode = state.doc.resolve(listEnd).nodeAfter;
  if (!nextNode) return false;

  // 바로 다음이 빈 문단인 경우:
  if (nextNode.type === visualSchema.nodes.paragraph && nextNode.content.size === 0) {
    if (dispatch) {
      const emptyEnd = listEnd + nextNode.nodeSize;
      const followingNode = state.doc.resolve(emptyEnd).nodeAfter;
      if (followingNode && followingNode.type === listNode.type) {
        const mergedItems: DocumentNode[] = [];
        listNode.forEach(c => mergedItems.push(c));
        followingNode.forEach(c => mergedItems.push(c));
        const mergedList = listNode.type.create(listNode.attrs, Fragment.fromArray(mergedItems));
        const tr = state.tr.replaceWith($from.before(listDepth), emptyEnd + followingNode.nodeSize, mergedList);
        tr.setSelection(TextSelection.near(tr.doc.resolve($from.pos)));
        dispatch(closeHistory(tr).scrollIntoView());
      } else {
        const tr = state.tr.delete(listEnd, emptyEnd);
        dispatch(closeHistory(tr).scrollIntoView());
      }
    }
    return true;
  }
  return false;
};
function inlineLines(node:DocumentNode):Fragment[] {
  if(node.isTextblock){const lines:Fragment[]=[];let current:DocumentNode[]=[];
    node.forEach(child=>{if(child.type===visualSchema.nodes.hard_break){lines.push(Fragment.fromArray(current));current=[];}else current.push(child);});
    lines.push(Fragment.fromArray(current));return lines;
  }
  const result:Fragment[]=[];node.forEach((child,_offset,index)=>{
    // Markdown such as "- 1. text" may contain a structural empty paragraph
    // before its inner list. It must not become a new, empty numbered item.
    if(node.type.name==='list_item' && index===0 && !child.content.size && node.childCount>1 && isList(node.child(1)))return;
    result.push(...inlineLines(child));
  });return result;
}

function withoutTypedMarker(line: Fragment): Fragment {
  if(line.firstChild?.marks.some(mark=>mark.type.name==='code'))return line;
  const text=visualSchema.nodes.paragraph.create(null,line).textContent;
  // A pasted Korean ordinal often omits the space ("4.카타파"). Handle it
  // during an explicit list conversion without consuming decimals/versions.
  const prefix=text.match(/^[ \t]*(?:\d+[.)](?:[ \t]+|(?=[가-힣]))|[-+*][ \t]+)/);
  return prefix ? line.cut(prefix[0].length) : line;
}

/** At an item's first text position remove one list level, never join its text
 * into the preceding item as the generic Backspace command can do. */
export const removeListMarkerAtStart: Command = (state, dispatch, view) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== visualSchema.nodes.paragraph || $from.parentOffset !== 0) return false;
  const itemDepth = $from.depth - 1;
  const inListItem = itemDepth >= 1 && $from.node(itemDepth).type === visualSchema.nodes.list_item && $from.index(itemDepth) === 0;

  if (inListItem) {
    // An entirely empty numbered item is removed, keeping the caret in the
    // preceding item instead of lifting it into a paragraph below the list.
    if (!$from.parent.content.size && $from.node(itemDepth).childCount === 1
      && moveUpFromEmptyOrderedItem(state, dispatch ? tr => {
        tr.delete($from.before(itemDepth), $from.after(itemDepth));
        dispatch(closeHistory(tr).scrollIntoView());
      } : undefined)) return true;
    return liftListItem(visualSchema.nodes.list_item)(state, dispatch ? tr => dispatch(closeHistory(tr)) : undefined, view);
  }

  // 목록 바로 아래 문단 맨 앞($from.parentOffset === 0)에서 백스페이스를 누를 때,
  // 상위 목록으로 강제 흡수(joinBackward)되어 번호가 다시 생기는 현상을 원천 방어
  const posBefore = $from.before();
  if (posBefore > 0) {
    const nodeBefore = state.doc.resolve(posBefore).nodeBefore;
    if (nodeBefore && isList(nodeBefore)) {
      const lastItem = nodeBefore.lastChild;
      const isLastItemEmpty = lastItem && (
        lastItem.content.size === 0 ||
        (lastItem.childCount === 1 && lastItem.firstChild && lastItem.firstChild.isTextblock && lastItem.firstChild.content.size === 0)
      );
      if (isLastItemEmpty) {
        if (dispatch) {
          const listStart = posBefore - nodeBefore.nodeSize;
          if (nodeBefore.childCount === 1) {
            dispatch(closeHistory(state.tr.delete(listStart, posBefore)).scrollIntoView());
          } else {
            const itemEnd = posBefore - 1;
            const itemStart = itemEnd - lastItem.nodeSize;
            dispatch(closeHistory(state.tr.delete(itemStart, itemEnd)).scrollIntoView());
          }
        }
        return true;
      }

      if (lastItem) {
        let lastTextblockOffset = -1;
        lastItem.descendants((n, p) => {
          if (n.isTextblock) lastTextblockOffset = p;
        });
        if (lastTextblockOffset !== -1) {
          const itemStart = posBefore - 1 - lastItem.nodeSize;
          const textblockStart = itemStart + 1 + lastTextblockOffset;
          const targetNode = state.doc.nodeAt(textblockStart);
          if (targetNode && targetNode.isTextblock) {
            const endOfLastText = textblockStart + 1 + targetNode.content.size;
            const startOfCurrentText = $from.pos;
            if (dispatch) {
              const tr = state.tr.delete(endOfLastText, startOfCurrentText);
              dispatch(closeHistory(tr).scrollIntoView());
            }
            return true;
          }
        }
      }
    }
  }

  return false;
};
export function selectedList(kind:'bullet'|'ordered'|'check'|'clear'):Command {
  return (state,dispatch,currentView)=>{
    let {$from,$to}=state.selection;
    if (!state.selection.empty && $from.parent.isTextblock && $from.parentOffset === $from.parent.content.size && $from.pos + 1 < $to.pos) {
      $from = state.doc.resolve($from.pos + 1);
    }
    if (!state.selection.empty && $to.parent.isTextblock && $to.parentOffset === 0 && $to.pos - 1 > $from.pos) {
      $to = state.doc.resolve($to.pos - 1);
    }
    const listRange=$from.blockRange($to,isList);
    const range=listRange || $from.blockRange($to);
    if(!range)return false;

    // 🔥 동일한 종류의 리스트가 이미 적용되어 있으면 리스트 취소(clear)
    if (kind !== 'clear' && listRange) {
      const parentList = listRange.parent;
      const isOrdered = parentList.type === visualSchema.nodes.ordered_list;
      const isBullet = parentList.type === visualSchema.nodes.bullet_list;
      let isCheck = false;
      for (let i = listRange.startIndex; i < listRange.endIndex; i++) {
        const item = parentList.child(i);
        if (item.attrs && item.attrs.checked !== null && item.attrs.checked !== undefined) {
          isCheck = true;
          break;
        }
      }

      const sameAsCurrent = (kind === 'ordered' && isOrdered) ||
                            (kind === 'bullet' && isBullet && !isCheck) ||
                            (kind === 'check' && isCheck);

      if (sameAsCurrent) {
        return selectedList('clear')(state, dispatch, currentView);
      }
    }
    const parent=range.parent,selected:DocumentNode[]=[];
    for(let i=range.startIndex;i<range.endIndex;i++)selected.push(parent.child(i));
    if(kind==='clear' && !listRange && !selected.some(isList))return false;
    let unsupported=false;selected.forEach(node=>{if(node.isLeaf && !node.isTextblock)unsupported=true;node.descendants(child=>{if(child.isBlock && child.isLeaf && !child.isTextblock)unsupported=true;});});
    if(unsupported)return false;
    const nodes = visualSchema.nodes;

    // 🌟 [문장간격(hard_break) 포함 단일 문단에서 특정 라인만 선택/커서 위치 시 해당 라인만 리스트로 변환]:
    if (kind !== 'clear' && !listRange && selected.length === 1 && selected[0].type === nodes.paragraph) {
      const singlePara = selected[0];
      let hasHardBreak = false;
      singlePara.forEach(child => {
        if (child.type === nodes.hard_break) hasHardBreak = true;
      });

      if (hasHardBreak) {
        interface ParaLine {
          start: number;
          end: number;
          nodes: DocumentNode[];
        }
        const paraLines: ParaLine[] = [];
        let currentNodes: DocumentNode[] = [];
        let currentStart = 0;
        let offset = 0;

        singlePara.forEach(child => {
          if (child.type === nodes.hard_break) {
            paraLines.push({ start: currentStart, end: offset, nodes: currentNodes });
            offset += child.nodeSize;
            currentStart = offset;
            currentNodes = [];
          } else {
            currentNodes.push(child);
            offset += child.nodeSize;
          }
        });
        paraLines.push({ start: currentStart, end: offset, nodes: currentNodes });

        const selFrom = Math.min($from.parentOffset, $to.parentOffset);
        const selTo = Math.max($from.parentOffset, $to.parentOffset);

        const getSelectedLineIndices = (): number[] => {
          if (selFrom === selTo) {
            for (let i = 0; i < paraLines.length; i++) {
              if (selFrom >= paraLines[i].start && selFrom <= paraLines[i].end) return [i];
              if (i < paraLines.length - 1 && selFrom > paraLines[i].end && selFrom < paraLines[i + 1].start) return [i];
            }
            return [paraLines.length - 1];
          }
          const result: number[] = [];
          paraLines.forEach((l, idx) => {
            if (l.start < selTo && (l.end > selFrom || (l.start === l.end && l.start >= selFrom && l.start <= selTo))) {
              result.push(idx);
            }
          });
          return result.length ? result : [0];
        };

        const selectedIndices = getSelectedLineIndices();
        const beforeLines = paraLines.slice(0, selectedIndices[0]);
        const targetLines = paraLines.slice(selectedIndices[0], selectedIndices[selectedIndices.length - 1] + 1);
        const afterLines = paraLines.slice(selectedIndices[selectedIndices.length - 1] + 1);

        const replacementBlocks: DocumentNode[] = [];

        // 앞선 비선택 라인들 -> 이전 문단으로 보존
        if (beforeLines.length > 0) {
          const content: DocumentNode[] = [];
          beforeLines.forEach((l, idx) => {
            if (idx > 0) content.push(nodes.hard_break.create());
            content.push(...l.nodes);
          });
          replacementBlocks.push(nodes.paragraph.create(singlePara.attrs, Fragment.fromArray(content)));
        }

        // 선택된 라인들 -> 리스트(ordered_list / bullet_list)로 변환
        const listLines = targetLines.map(l => Fragment.fromArray(l.nodes)).map(line => kind === 'ordered' ? withoutTypedMarker(line) : line);
        const listNode = (kind === 'ordered' ? nodes.ordered_list : nodes.bullet_list).create({
          tight: true,
          order: 1,
          bullet: '-',
          indentPx: null
        }, listLines.map(line => nodes.list_item.create({
          checked: kind === 'check' ? false : null
        }, nodes.paragraph.create(null, line))));
        replacementBlocks.push(listNode);

        // 뒤쪽 비선택 라인들 -> 다음 문단으로 보존
        if (afterLines.length > 0) {
          const content: DocumentNode[] = [];
          afterLines.forEach((l, idx) => {
            if (idx > 0) content.push(nodes.hard_break.create());
            content.push(...l.nodes);
          });
          replacementBlocks.push(nodes.paragraph.create(singlePara.attrs, Fragment.fromArray(content)));
        }

        if (dispatch) {
          let tr = state.tr.replaceWith(range.start, range.end, replacementBlocks);
          let listPos = range.start;
          for (const block of replacementBlocks) {
            if (block === listNode) break;
            listPos += block.nodeSize;
          }
          const fromPos = listPos + 3;
          const toPos = listPos + listNode.nodeSize - 3;
          if (selFrom === selTo) {
            tr = tr.setSelection(Selection.near(tr.doc.resolve(Math.min(fromPos, tr.doc.content.size))));
          } else {
            tr = tr.setSelection(TextSelection.between(tr.doc.resolve(fromPos), tr.doc.resolve(toPos)));
          }
          dispatch(closeHistory(tr));
        }
        return true;
      }
    }

    // Numbers can be intentional text in a bullet/checklist. Only interpret
    // them as redundant ordinals when explicitly choosing a numbered list.
    const lines=selected.flatMap(inlineLines).map(line=>kind==='ordered'?withoutTypedMarker(line):line);
    if(!lines.length)return false;
    const singleIndentedPara = !listRange && selected.length === 1 && selected[0].type === nodes.paragraph ? (selected[0].attrs.indentPx ?? 0) : 0;
    const prevNodeBeforeFrom = !listRange && range.start > 0 ? state.doc.resolve(range.start).nodeBefore : null;
    const shouldAutoNestAfterConvert = Boolean(kind !== 'clear' && singleIndentedPara > 0 && prevNodeBeforeFrom && isList(prevNodeBeforeFrom));
    // 🌟 [리스트 취소(clear) 시 각 항목을 문단간격(개별 p)이 아닌 문장간격(단일 p + hard_break)으로 결합]:
    const targets = kind === 'clear' ? (() => {
      const content: DocumentNode[] = [];
      lines.forEach((line, index) => {
        if (index > 0) {
          content.push(nodes.hard_break.create());
        }
        line.forEach(node => content.push(node.mark([])));
      });
      return [nodes.paragraph.create(null, Fragment.fromArray(content))];
    })() : [(kind === 'ordered' ? nodes.ordered_list : nodes.bullet_list).create({
      tight: true,
      order: 1,
      bullet: '-',
      indentPx: (!shouldAutoNestAfterConvert && singleIndentedPara > 0) ? singleIndentedPara : null
    }, lines.map(line => nodes.list_item.create({
      checked: kind === 'check' ? false : null
    }, nodes.paragraph.create(null, line))))];
    const target=targets[0];
    const replacement:DocumentNode[]=[];
    let from=range.start,to=range.end;
    if(listRange){
      from=$from.before(listRange.depth);to=from+parent.nodeSize;
      if(range.startIndex)replacement.push(parent.copy(Fragment.fromArray(Array.from({length:range.startIndex},(_,i)=>parent.child(i)))));
      replacement.push(...targets);
      if(range.endIndex<parent.childCount)replacement.push(parent.copy(Fragment.fromArray(Array.from({length:parent.childCount-range.endIndex},(_,i)=>parent.child(i+range.endIndex)))));
    } else replacement.push(...targets);
    if(dispatch){
      let tr=state.tr.replaceWith(from,to,replacement);let start=-1;
      tr.doc.descendants((node,pos)=>{if(node===target){start=pos;return false;}});
      if(start>=0){const first=start+(kind==='clear'?1:3),last=kind==='clear'?start+targets.reduce((size,node)=>size+node.nodeSize,0)-1:start+target.nodeSize-3;
        tr=tr.setSelection(TextSelection.between(tr.doc.resolve(first),tr.doc.resolve(last)));
      }
      if (shouldAutoNestAfterConvert) {
        const nextState = state.apply(tr);
        independentIndentListItem(nextState, indentTr => {
          indentTr.steps.forEach(step => tr.step(step));
          tr = tr.setSelection(TextSelection.near(tr.doc.resolve(indentTr.selection.from)));
        });
      }
      dispatch(closeHistory(tr));
    }
    return true;
  };
}

/**
 * 🌟 [리스트 탈출 커맨드]:
 * 리스트(bullet_list / ordered_list / list_item) 내부에서 Shift + Enter 입력 시,
 * 리스트를 완전히 벗어나 독립된 새로운 일반 문단(paragraph)을 생성하고 커서를 이동합니다.
 */
export const exitListToParagraph: Command = (state, dispatch, view) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;

  let listItemDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === visualSchema.nodes.list_item) {
      listItemDepth = d;
      break;
    }
  }
  if (listItemDepth === -1) return false;

  const itemNode = $from.node(listItemDepth);
  let isBlankItem = true;
  itemNode.forEach(child => {
    if (child.isText && /[^\s\u200b\ufeff]/.test(child.text || '')) isBlankItem = false;
    else if (child.isTextblock) {
      child.forEach(sub => {
        if (sub.isText && /[^\s\u200b\ufeff]/.test(sub.text || '')) isBlankItem = false;
      });
    }
  });

  // 이미 빈 리스트 항목인 경우 기존 exitEmptyListItem 실행하여 문단으로 탈출
  if (isBlankItem) {
    return exitEmptyListItem(state, dispatch, view);
  }

  if (!dispatch) return true;

  let currentTr = state.tr;
  let tempState = state;

  // 1) 내용이 있는 리스트 항목 커서 위치에서 분할 (새 항목 생성)
  const splitFn = splitListItem(
    visualSchema.nodes.list_item,
    itemNode.attrs.checked !== null ? { checked: false } : undefined
  );
  splitFn(tempState, tr => {
    for (const step of tr.steps) {
      currentTr.step(step);
    }
    tempState = tempState.apply(tr);
  }, view);

  // 2) 분할되어 생성된 항목을 리스트 밖으로 완전히 탈출할 때까지 lift 반복
  while (true) {
    let inList = false;
    for (let d = tempState.selection.$from.depth; d > 0; d--) {
      if (tempState.selection.$from.node(d).type === visualSchema.nodes.list_item) {
        inList = true;
        break;
      }
    }
    if (!inList) break;

    let lifted = false;
    liftListItem(visualSchema.nodes.list_item)(tempState, tr => {
      lifted = true;
      for (const step of tr.steps) {
        currentTr.step(step);
      }
      tempState = tempState.apply(tr);
    }, view);

    if (!lifted) break;
  }

  currentTr.setSelection(Selection.near(currentTr.doc.resolve(Math.min(currentTr.doc.content.size, tempState.selection.from))));
  dispatch(closeHistory(currentTr).scrollIntoView());
  return true;
};

