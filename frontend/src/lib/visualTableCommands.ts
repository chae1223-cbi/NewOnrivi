// ====================================================================
// 📊 [OMD-TABLE-CMDS-0001] frontend/src/lib/visualTableCommands.ts
// 🎯 @KICK  : 위지윅 에디터 표(Table) 셀 이동, 편집, 구조 변경 및 선택 영역 명령 처리
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 불규칙 행(Ragged Table) 및 범위 초과(RangeError) 완전 방어
// 🚨 @PATCH : **2026-10-26** — [표 셀 탭 이동 시 RangeError: Index out of range 결함 완전 해결]:
//             1) 직사각형 고정 열수(width) 계산 방식을 폐기하고 실제 존재하는 모든 셀 좌표(allCells) 순차 탐색 방식으로 전면 개편
//             2) 불규칙한 열(행마다 열 개수가 다른 마크다운 표) 및 마지막 셀에서 Tab 시 신규 행 추가 처리 시 인덱스 초과 예외 원천 차단
//             3) textPosition 및 tableAction(열/행 추가·삭제, 정렬) 전반에 대한 경계값 방어(clamping, optional chaining) 적용
// ====================================================================

import { Node as DocumentNode } from 'prosemirror-model';
import { Command, TextSelection } from 'prosemirror-state';
import { closeHistory } from 'prosemirror-history';
import { visualSchema } from './visualDocumentCodec';

export function tableContext(state: Parameters<Command>[0]) {
  const position = state.selection.$from;
  for (let depth = position.depth; depth > 0; depth--) {
    if (position.node(depth).type.name === 'table') {
      const table = position.node(depth);
      const pos = position.before(depth);
      let row = 0;
      let column = 0;
      if (depth < position.depth && position.node(depth + 1).type.name === 'table_row') {
        row = position.index(depth);
        if (depth + 1 < position.depth) {
          column = position.index(depth + 1);
        }
      }
      return { table, pos, row, column };
    }
  }
  return null;
}

function selectedTableCellSpan(state: Parameters<Command>[0]) {
  if (state.selection.empty) return null;
  const endpoint = (position: typeof state.selection.$from) => {
    let tablePos = -1, cellPos = -1;
    for (let depth = 1; depth <= position.depth; depth++) {
      const name = position.node(depth).type.name;
      if (name === 'table') tablePos = position.before(depth);
      if (name === 'table_cell' || name === 'table_header') cellPos = position.before(depth);
    }
    return { tablePos, cellPos };
  };
  const from = endpoint(state.selection.$from), to = endpoint(state.selection.$to);
  return from.tablePos >= 0 && from.tablePos === to.tablePos && from.cellPos >= 0 && to.cellPos >= 0 && from.cellPos !== to.cellPos
    ? { from: state.selection.from, to: state.selection.to } : null;
}

export function hasMultiCellTableSelection(state: Parameters<Command>[0]): boolean {
  return selectedTableCellSpan(state) !== null;
}

/** Clear selected text in each cell without deleting table rows or cell nodes. */
export const clearMultiCellTableSelection: Command = (state, dispatch) => {
  const span = selectedTableCellSpan(state);
  if (!span) return false;
  if (dispatch) {
    const ranges: { from: number; to: number }[] = [];
    state.doc.nodesBetween(span.from, span.to, (node, pos) => {
      if (node.type.name !== 'table_cell' && node.type.name !== 'table_header') return true;
      const start = pos + 2;
      const end = start + (node.firstChild?.content.size || 0);
      ranges.push({ from: Math.max(span.from, start), to: Math.min(span.to, end) });
      return false;
    });
    let tr = state.tr;
    for (let index = ranges.length - 1; index >= 0; index--) {
      const range = ranges[index];
      if (range.to > range.from) tr = tr.delete(range.from, range.to);
    }
    const anchor = ranges[0]?.from ?? span.from;
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(tr.mapping.map(anchor, -1))));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

function rowsOf(table: DocumentNode) {
  const rows: DocumentNode[][] = [];
  table.forEach(row => {
    const cells: DocumentNode[] = [];
    row.forEach(cell => cells.push(cell));
    rows.push(cells);
  });
  return rows;
}

function cell(header: boolean, align = 'left') {
  return (header ? visualSchema.nodes.table_header : visualSchema.nodes.table_cell).create(
    { align },
    visualSchema.nodes.paragraph.create()
  );
}

function textPosition(table: DocumentNode, pos: number, rowIndex: number, columnIndex: number): number {
  if (table.childCount === 0) return pos + 1;
  const safeRow = Math.max(0, Math.min(rowIndex, table.childCount - 1));
  let offset = pos + 1;
  for (let r = 0; r < safeRow; r++) {
    offset += table.child(r).nodeSize;
  }
  const rowNode = table.child(safeRow);
  offset++; // enter table_row
  if (rowNode.childCount === 0) return offset;
  const safeCol = Math.max(0, Math.min(columnIndex, rowNode.childCount - 1));
  for (let c = 0; c < safeCol; c++) {
    offset += rowNode.child(c).nodeSize;
  }
  const cellNode = rowNode.child(safeCol);
  const innerOffset = cellNode && cellNode.childCount > 0 ? 2 : 1;
  return offset + innerOffset;
}

type Action = 'addRow' | 'deleteRow' | 'addColumn' | 'deleteColumn' | 'deleteTable' | 'afterTable' | 'left' | 'center' | 'right';

export function tableAction(action: Action): Command {
  return (state, dispatch) => {
    const context = tableContext(state);
    if (!context) return false;
    const { table, pos, row, column } = context;
    const rows = rowsOf(table);
    if (rows.length === 0) return false;

    if (action === 'afterTable') {
      if (dispatch) {
        const end = pos + table.nodeSize;
        let tr = state.tr;
        const next = tr.doc.nodeAt(end);
        if (next?.type !== visualSchema.nodes.paragraph) {
          tr = tr.insert(end, visualSchema.nodes.paragraph.create());
        }
        dispatch(tr.setSelection(TextSelection.create(tr.doc, end + 1)).scrollIntoView());
      }
      return true;
    }
    if (action === 'deleteTable') {
      if (dispatch) {
        let tr = state.tr.replaceWith(pos, pos + table.nodeSize, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, pos + 1));
        dispatch(closeHistory(tr).scrollIntoView());
      }
      return true;
    }
    if (action === 'deleteRow' && (row === 0 || rows.length <= 1)) return false;
    if (action === 'deleteColumn' && (rows[0]?.length || 0) <= 1) return false;

    let selectedRow = row;
    let selectedColumn = column;

    if (action === 'addRow') {
      const templateRow = rows[0] || [];
      const newCells = templateRow.map(header => cell(false, header?.attrs?.align || 'left'));
      rows.splice(row + 1, 0, newCells.length > 0 ? newCells : [cell(false, 'left')]);
      selectedRow = row + 1;
      selectedColumn = 0;
    }
    if (action === 'deleteRow') {
      rows.splice(row, 1);
      selectedRow = Math.min(row, rows.length - 1);
      selectedColumn = Math.min(column, (rows[selectedRow]?.length || 1) - 1);
    }
    if (action === 'addColumn') {
      rows.forEach((cells, index) => {
        const fallbackAlign = cells[column]?.attrs?.align || cells[0]?.attrs?.align || 'left';
        const insertIdx = Math.min(column + 1, cells.length);
        cells.splice(insertIdx, 0, cell(index === 0, fallbackAlign));
      });
      selectedColumn = column + 1;
    }
    if (action === 'deleteColumn') {
      rows.forEach(cells => {
        if (column < cells.length) {
          cells.splice(column, 1);
        }
      });
      selectedColumn = Math.max(0, Math.min(column, (rows[0]?.length || 1) - 1));
    }
    if (['left', 'center', 'right'].includes(action)) {
      rows.forEach(cells => {
        const current = cells[column];
        if (current) {
          cells[column] = current.type.create({ ...current.attrs, align: action }, current.content);
        }
      });
    }

    const next = visualSchema.nodes.table.create(
      null,
      rows.map(cells => visualSchema.nodes.table_row.create(null, cells))
    );
    if (dispatch) {
      let tr = state.tr.replaceWith(pos, pos + table.nodeSize, next);
      const targetPos = textPosition(next, pos, selectedRow, selectedColumn);
      const clampedPos = Math.min(Math.max(1, targetPos), tr.doc.content.size - 1);
      tr = tr.setSelection(TextSelection.create(tr.doc, clampedPos));
      dispatch(closeHistory(tr).scrollIntoView());
    }
    return true;
  };
}

export function moveTableCell(backward = false): Command {
  return (state, dispatch, view) => {
    const context = tableContext(state);
    if (!context) return false;
    const { table, pos, row, column } = context;
    if (table.childCount === 0) return false;

    // 테이블 내 실제 존재하는 모든 셀 좌표 목록 수집
    const allCells: { row: number; column: number }[] = [];
    for (let r = 0; r < table.childCount; r++) {
      const rowNode = table.child(r);
      for (let c = 0; c < rowNode.childCount; c++) {
        allCells.push({ row: r, column: c });
      }
    }
    if (allCells.length === 0) return false;

    // 현재 셀 위치 탐색 (불규칙 행 고려한 안전 폴백)
    let currentIndex = allCells.findIndex(loc => loc.row === row && loc.column === column);
    if (currentIndex === -1) {
      const matchingRow = allCells.filter(loc => loc.row === row);
      if (matchingRow.length > 0) {
        currentIndex = allCells.indexOf(matchingRow[Math.min(column, matchingRow.length - 1)]);
      } else {
        currentIndex = 0;
      }
    }

    if (backward) {
      const targetIndex = currentIndex - 1;
      if (targetIndex < 0) return true; // 표 시작 지점에서는 안전하게 유지
      const { row: targetRow, column: targetColumn } = allCells[targetIndex];
      if (dispatch) {
        const from = textPosition(table, pos, targetRow, targetColumn);
        const cellNode = table.child(targetRow).child(targetColumn);
        const paragraph = cellNode.firstChild;
        const pSize = paragraph?.content?.size ?? 0;
        const clampedFrom = Math.min(Math.max(1, from), state.doc.content.size - 1);
        const clampedTo = Math.min(Math.max(clampedFrom, from + pSize), state.doc.content.size);
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, clampedFrom, clampedTo)).scrollIntoView());
      }
      return true;
    } else {
      const targetIndex = currentIndex + 1;
      if (targetIndex >= allCells.length) {
        // 표의 마지막 셀에서 Tab 입력 시 자동으로 새 행 추가 후 첫 번째 셀로 이동
        return tableAction('addRow')(state, dispatch ? tr => {
          const nextTable = tr.doc.nodeAt(pos);
          if (nextTable && nextTable.childCount > 0) {
            const newRowIndex = nextTable.childCount - 1;
            const from = textPosition(nextTable, pos, newRowIndex, 0);
            const rowNode = nextTable.child(newRowIndex);
            const cellNode = rowNode.childCount > 0 ? rowNode.child(0) : null;
            const pSize = cellNode?.firstChild?.content?.size ?? 0;
            const clampedFrom = Math.min(Math.max(1, from), tr.doc.content.size - 1);
            const clampedTo = Math.min(Math.max(clampedFrom, from + pSize), tr.doc.content.size);
            dispatch(tr.setSelection(TextSelection.create(tr.doc, clampedFrom, clampedTo)).scrollIntoView());
          }
        } : undefined, view);
      }
      const { row: targetRow, column: targetColumn } = allCells[targetIndex];
      if (dispatch) {
        const from = textPosition(table, pos, targetRow, targetColumn);
        const cellNode = table.child(targetRow).child(targetColumn);
        const paragraph = cellNode.firstChild;
        const pSize = paragraph?.content?.size ?? 0;
        const clampedFrom = Math.min(Math.max(1, from), state.doc.content.size - 1);
        const clampedTo = Math.min(Math.max(clampedFrom, from + pSize), state.doc.content.size);
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, clampedFrom, clampedTo)).scrollIntoView());
      }
      return true;
    }
  };
}

export function tableEnter(): Command {
  return (state, dispatch, view) =>
    tableContext(state)
      ? (dispatch?.(state.tr.replaceSelectionWith(visualSchema.nodes.hard_break.create()).scrollIntoView()), true)
      : false;
}
