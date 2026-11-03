/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.1.0
 * 프로그램 ID : oaar-footnote-cleanup
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-11-03** — [각주 영역 단편화 방지 및 빈 행 자동 소거 엔진 구축]:
 *             1) 각주 정의(visual_footnote_def) 사이나 각주 하단에 엔터/타이핑으로 인해 잘못 끼어든 빈 문단(p:empty) 자동 소거
 *             2) 각주 사이에 텍스트가 입력된 경우 본문 영역으로 자동 구출/재배치하여 각주 블록 연속성 100% 보장
 * 🚨 @PATCH : **2026-11-03** — [각주 동기화 및 고아 노드 자동 정리 엔진 구축]:
 *             1) 본문 내 각주 참조(visual_footnote_ref) 삭제 시 하단 각주 정의(visual_footnote_def) 동시 삭제
 *             2) 하단 각주 정의(visual_footnote_def) 삭제 시 본문 내 잔존 각주 참조(visual_footnote_ref) 동시 삭제
 *             3) 단일 트랜잭션(Transaction) 내에서 동기화 처리하여 Undo(Ctrl+Z)/Redo(Ctrl+Y) 원자적 복구 보장
 */

import type { Transaction } from 'prosemirror-state';

/**
 * 📊 [OMD-LIB-FOOTNOTECLEANUP-0002] footnoteCleanup.ts ➔ cleanFootnoteFragmentation
 * 🎯 @KICK  : 각주 정의(visual_footnote_def) 사이나 각주 영역 하단에
 *             타이핑이나 엔터로 인해 잘못 생성된 빈 문단(paragraph) 또는 고아 블록을 감지하여
 *             단일 트랜잭션 내에서 즉각 소거하거나 본문 영역으로 재배치
 * 
 * @param transaction - ProseMirror 편집 트랜잭션
 */
export function cleanFootnoteFragmentation(transaction: Transaction): void {
  if (!transaction.docChanged) return;

  const doc = transaction.doc;
  let firstFnIndex = -1;
  let lastFnIndex = -1;
  let firstFnOffset = -1;

  let currOffset = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name === 'visual_footnote_def') {
      if (firstFnIndex === -1) {
        firstFnIndex = i;
        firstFnOffset = currOffset;
      }
      lastFnIndex = i;
    }
    currOffset += child.nodeSize;
  }

  if (firstFnIndex === -1) return;

  const rangesToDelete: Array<{ from: number; to: number }> = [];
  const blocksToRelocate: any[] = [];
  let offset = 0;

  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const from = offset;
    const to = offset + child.nodeSize;
    offset = to;

    // 각주와 각주 사이에 끼어든 비-각주 블록 처리
    if (i > firstFnIndex && i < lastFnIndex && child.type.name !== 'visual_footnote_def') {
      if (child.content.size === 0) {
        rangesToDelete.push({ from, to });
      } else {
        blocksToRelocate.push(child);
        rangesToDelete.push({ from, to });
      }
    }
    // 마지막 각주 뒤에 생긴 빈 문단 (엔터 등으로 인해 각주 영역 하단에 생긴 빈 줄)
    else if (i > lastFnIndex && child.type.name === 'paragraph' && child.content.size === 0) {
      rangesToDelete.push({ from, to });
    }
  }

  // 역순 삭제
  for (let i = rangesToDelete.length - 1; i >= 0; i--) {
    transaction.delete(rangesToDelete[i].from, rangesToDelete[i].to);
  }

  // 끼어들었던 본문 내용이 있는 경우 첫 번째 각주 바로 앞으로 안전하게 이동
  if (blocksToRelocate.length > 0 && firstFnOffset >= 0) {
    const safeInsertPos = Math.min(firstFnOffset, transaction.doc.content.size);
    transaction.insert(safeInsertPos, blocksToRelocate);
  }
}

/**
 * 📊 [OMD-LIB-FOOTNOTECLEANUP-0001] footnoteCleanup.ts ➔ removeOrphanFootnotes
 * 🎯 @KICK  : 본문 내 각주 참조(visual_footnote_ref) 또는 하단 정의(visual_footnote_def) 삭제 시
 *             연관된 반대편 노드를 단일 트랜잭션 내에서 즉각 동기화 삭제하여 고아(Orphan) 노드를 방지
 * 
 * @param transaction - ProseMirror 편집 트랜잭션
 */
export function removeOrphanFootnotes(transaction: Transaction): void {
  if (!transaction.docChanged) return;

  // 1. 각주 참조(ref) 삭제 감지 -> 매칭되는 각주 정의(def) 삭제
  const beforeRefs = new Set<string>();
  transaction.before.descendants(node => {
    if (node.type.name === 'visual_footnote_ref' && node.attrs.label) {
      beforeRefs.add(String(node.attrs.label));
    }
  });

  const deletedRefLabels = new Set<string>();
  if (beforeRefs.size > 0) {
    const afterRefs = new Set<string>();
    transaction.doc.descendants(node => {
      if (node.type.name === 'visual_footnote_ref' && node.attrs.label) {
        afterRefs.add(String(node.attrs.label));
      }
    });

    beforeRefs.forEach(label => {
      if (!afterRefs.has(label)) {
        deletedRefLabels.add(label);
      }
    });

    if (deletedRefLabels.size > 0) {
      const defRanges: Array<{ from: number; to: number }> = [];
      transaction.doc.descendants((node, pos) => {
        if (node.type.name === 'visual_footnote_def' && deletedRefLabels.has(String(node.attrs.label))) {
          defRanges.push({ from: pos, to: pos + node.nodeSize });
        }
      });

      for (let i = defRanges.length - 1; i >= 0; i--) {
        transaction.delete(defRanges[i].from, defRanges[i].to);
      }
    }
  }

  // 2. 하단 각주 정의(def) 삭제 감지 -> 본문 내 잔존 각주 참조(ref) 삭제
  const beforeDefs = new Set<string>();
  transaction.before.descendants(node => {
    if (node.type.name === 'visual_footnote_def' && node.attrs.label) {
      beforeDefs.add(String(node.attrs.label));
    }
  });

  if (beforeDefs.size > 0) {
    const afterDefs = new Set<string>();
    transaction.doc.descendants(node => {
      if (node.type.name === 'visual_footnote_def' && node.attrs.label) {
        afterDefs.add(String(node.attrs.label));
      }
    });

    const deletedDefLabels = new Set<string>();
    beforeDefs.forEach(label => {
      if (!afterDefs.has(label) && !deletedRefLabels.has(label)) {
        deletedDefLabels.add(label);
      }
    });

    if (deletedDefLabels.size > 0) {
      const refRanges: Array<{ from: number; to: number }> = [];
      transaction.doc.descendants((node, pos) => {
        if (node.type.name === 'visual_footnote_ref' && deletedDefLabels.has(String(node.attrs.label))) {
          refRanges.push({ from: pos, to: pos + node.nodeSize });
        }
      });

      for (let i = refRanges.length - 1; i >= 0; i--) {
        transaction.delete(refRanges[i].from, refRanges[i].to);
      }
    }
  }

  // 3. 각주 사이 빈 행 및 단편화 자동 소거
  cleanFootnoteFragmentation(transaction);
}
