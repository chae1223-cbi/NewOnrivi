// ====================================================================
// 📊 [OMD-HOOK-VisualEditorInsertActions] frontend/src/components/visualEditor/useVisualEditorInsertActions.ts
// 🎯 @KICK  : 시각 에디터(VisualDocumentEditor)의 서식/블록 명령, 이미지/미디어/각주/서명/참고문헌/수식/문서링크/날짜 삽입 액션 및 외부 commandRef 브릿지 훅
// 🚨 @PATCH : 2026-11-11 — [각주 삽입 후 커서 다음 칼럼 전진 및 본문 포커스 유지]: 각주 삽입 후 하단 각주 정의로 포커스/스크롤 이동을 제거하고 본문 각주 직후(다음 칼럼)로 커서 안착 및 visualCaret 본문 기준선 동기화
// 🚨 @PATCH : 2026-11-11 — [각주 브릿지 및 슬래시 명령 실행 포커스 안정화]: bridge에 FOOTNOTE/FN 명령 직접 분기 추가 및 nativeCommands.footnote/fn에 removeSlash=true 연동하여 단축키/슬래시/플로팅툴바 각주 생성 통일
// 🚨 @PATCH : 2026-11-10 — [슬래시 명령어 글자 중간 실행 시 잔여 텍스트 삭제 및 전체 단어 검색 보장]: 커서 뒤의 단어 끝까지 slashRange.to에 포함하여 명령어 실행 시 뒤쪽 글자가 남지 않도록 완벽 제거
// 🚨 @PATCH : 2026-11-10 — [링크 모달 완료 시 링크 뒤 자동 스페이스 삽입 및 커서 전진]:
//             1) handleLinkConfirm에서 링크 삽입 후 즉시 일반 공백(' ')을 자동 삽입(또는 기존 공백 통과)하고 커서를 공백 뒤로 안착시켜 다음 입력이 링크로 이어지지 않고 일반 텍스트로 자연스럽게 작성되도록 구현
// 🚨 @PATCH : 2026-11-10 — [하이퍼링크 해제(handleLinkUnlink) 기능 신설]:
//             1) LinkModal에서 링크 해제 시 target 범위의 link 마크를 완전 제거(removeMark)하고 일반 텍스트로 복원하는 handleLinkUnlink 콜백 추가
// 🚨 @PATCH : 2026-11-10 — [링크 삽입 완료 후 링크 마크 자동 탈출(removeStoredMark) 지원]:
//             1) handleLinkConfirm에서 링크 삽입 후 tr.removeStoredMark(visualSchema.marks.link) 및 setStoredMarks([])를 호출하여 다음 입력 텍스트가 링크로 계속 이어지지 않고 일반 텍스트로 전환되도록 보장
// 🚨 @PATCH : 2026-11-10 — [서명/발신인 source_block 네이티브 노드 삽입 및 범위 치환 브릿지 연동]:
//             1) bridge에 INSERT_SIGNATURE: 및 REPLACE_RANGE 핸들러를 신설하여 서명 데이터가 일반 텍스트 노드가 아닌 source_block 위지윅 노드로 원자적 삽입/교체되도록 구현
// 🚨 @PATCH : 2026-11-10 — [서명/발신인 실행 시 SignatureModal 대화상자 호출 연동]:
//             1) applySignature 실행 시 고정 텍스트 즉시 삽입 대신 onrivi:open-signature-modal 이벤트를 발생시켜 정렬(left/right), 날짜, 작성자, 도장 커스텀 대화상자를 호출하도록 개선
// 🚨 @PATCH : 2026-11-08 — [목록 항목 인용문 변환 시 글머리 기호 보존 및 번호 목록/상단 빈 볼트 오변환 원천 방어]:
//             1) setQuote 실행 시 선택 영역이 리스트(bullet_list / ordered_list) 내부에 있는 경우, ProseMirror findWrapping이 ordered_list로 오분기하고 상위에 빈 볼트(•)를 남기던 결함 완전 차단
//             2) 선택된 리스트 항목들을 기존 리스트 타입 그대로 보존하여 blockquote로 감싸도록 개선하고, 동일 Alert 해제 시 liftTarget 기반 온전한 복구 보장
// 🚨 @PATCH : 2026-11-08 — [플로팅 툴바 연속 서식 적용 시 포커스 보존]: 툴바 내 버튼 조작 시 뷰로 포커스를 강제 탈취하지 않아 툴바를 유지하고, ESC 종료 시에만 뷰 포커스를 복원하도록 보장
// 🚨 @PATCH : 2026-11-08 — [플로팅 툴바 즉시 포커스 복원 및 서식 안전 보존]: 서식 액션 실행 후 뷰 포커스를 항상 복원하여 중단 없는 타이핑을 보장하고, RESTORE_ORIGIN 시 문서 상태를 훼손하지 않고 뷰 포커스만 복원하도록 개선
// 🚨 @PATCH : 2026-11-07 — [플로팅 툴바 서식 적용 후 ESC 종료 시 태그 및 커서 온전 복원]: run 서식 실행 후 floatingOriginSelectionRef를 최신 상태로 갱신하고, RESTORE_ORIGIN 시 선택 영역 끝(to)으로 커서를 깔끔히 안착시켜 적용된 서식 태그 보존 및 타이핑 편의 보장
// 🚨 @PATCH : 2026-11-07 — [플로팅 툴바 커서 반환 및 선택 버튼 포커스 유지]: 플로팅 툴바 호출 당시의 Selection 기억 및 RESTORE_ORIGIN 브릿지 명령 지원
// 🚨 @PATCH : 2026-11-07 — [다중 인용(>>) 및 플로팅 툴바 포커스 유지]:
//             1) setQuote(null) 인용구 명령 실행 시 기존 인용문 안에서는 lift하지 않고 최대 6단계까지 중첩 다중 인용문으로 감싸도록 개선
//             2) run 실행 시 플로팅 툴바(#floating-toolbar)에 포커스가 머물러 있을 때는 에디터로 포커스를 강제 탈취하지 않고 툴바 포커스 유지
// 🚨 @PATCH : 2026-11-05 — [문서 링크 팝업]: 선택이 없을 때 커서 아래 단어를 링크명과 교체 대상 범위로 사용한다.
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 비동기 다이얼로그 콜백 시 문서/위치 유효성 검증, 5대 정밀 진단 로깅(logError/logWarn) 준수
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 코어 엔진 모듈화]: 서식 실행, 블록/미디어/각주/서명/인용문헌 삽입 및 commandRef 브릿지 훅 분리
// 🔗 @CALLS : createVisualDocumentCodec, visualSchema, cleanMarkdownDocument, organizeMarkdownFootnotes, clearMarkdownFormatting
// ====================================================================

import { useEffect } from 'react';
import type React from 'react';
import { Selection, TextSelection, type Command } from 'prosemirror-state';
import { Fragment, type Node as DocumentNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import { lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { liftListItem } from 'prosemirror-schema-list';
import { undo, redo, closeHistory } from 'prosemirror-history';
import { canSplit, liftTarget } from 'prosemirror-transform';
import { createVisualDocumentCodec, visualSchema, visualImageDetails } from '@/lib/visualDocumentCodec';
import { selectedList } from '@/lib/visualListCommands';
import { tableContext, tableAction } from '@/lib/visualTableCommands';
import { mediaDetails, type MediaKind } from '@/lib/mediaMarkup';
import { citationPattern } from '@/lib/bibliography';
import { clearMarkdownFormatting } from '@/lib/clearMarkdownFormatting';
import { organizeMarkdownFootnotes } from '@/lib/footnoteOrganizer';
import { cleanMarkdownDocument } from '@/utils/markdownCleaner';
import { TOOLBAR_ITEMS } from '@/lib/toolbarConfig';
import type { installVisualCaret } from '@/lib/visualCaret';
import { slashPattern } from './visualDocumentCommands';
import {
  setHeadingBlock,
  setCodeBlock,
  FIRST_BLOCK_INSERT_TYPES,
  makeChecklist,
} from './visualDocumentCommands';
import { synchronizeTextSelection } from './visualSelectionHelper';
import type { DropTargetInfo } from './visualDropHelper';
import { logError, logWarn } from '@/lib/errorDiagnostics';

type Codec = ReturnType<typeof createVisualDocumentCodec>;

export interface UseVisualEditorInsertActionsParams {
  viewRef: React.MutableRefObject<EditorView | null>;
  codecRef: React.MutableRefObject<Codec | null>;
  caretRef: React.MutableRefObject<ReturnType<typeof installVisualCaret> | null>;
  host: React.RefObject<HTMLDivElement | null>;
  readOnly: boolean;
  commandRef?: React.MutableRefObject<((command: any) => boolean) | null>;
  slashRange: React.MutableRefObject<{ from: number; to: number } | null>;
  setSlash: React.Dispatch<React.SetStateAction<boolean>>;
  setNotice: React.Dispatch<React.SetStateAction<string>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setPopup: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>;
  setSelection: React.Dispatch<React.SetStateAction<boolean>>;
  manualFloatingRef: React.MutableRefObject<boolean>;
  selectionVisibleRef: React.MutableRefObject<boolean>;
  linkTargetRef: React.MutableRefObject<{ from: number; to: number; valid: boolean } | null>;
  setLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkDialogData: React.Dispatch<React.SetStateAction<{ text: string; href: string }>>;
  linkCommandRef: React.MutableRefObject<Command>;
  dateTargetRef: React.MutableRefObject<{ from: number; to: number; valid: boolean } | null>;
  setDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDatePickerPos: React.Dispatch<React.SetStateAction<{ top: number; left: number }>>;
  openDatePickerRef: React.MutableRefObject<(removeSlash?: boolean) => void>;
  tableTargetRef: React.MutableRefObject<{ from: number; to: number; valid: boolean } | null>;
  setTableDialog: React.Dispatch<React.SetStateAction<boolean>>;
  openTableRef: React.MutableRefObject<() => void>;
  imageTargets: React.MutableRefObject<Set<{ from: number; to: number; source?: string; valid: boolean }>>;
  imagesRef: React.MutableRefObject<{
    renderImage?: (source: string) => React.ReactNode;
    onImageFile?: (file: Blob) => Promise<string | null>;
    onImageDialog?: (source: string | null, insert: (path: string, alt: string, fullMarkdown?: string) => boolean) => void;
    onMediaDialog?: (kind: MediaKind, source: string | null, insert: (code: string) => boolean) => void;
    onDocLinkDialog?: (
      position: { top: number; left: number },
      insert: (targetUrl: string, displayTitle: string) => boolean,
      initialSelectedText?: string
    ) => void;
    onFormulaDialog?: (apply: (formula: string) => boolean | void, initialLatex?: string) => void;
  }>;
  beginImageRef: React.MutableRefObject<(source?: string, position?: number, file?: Blob) => void>;
  beginMediaRef: React.MutableRefObject<(kind: MediaKind, source?: string, position?: number) => void>;
  insertFootnoteRef: React.MutableRefObject<(removeSlash?: boolean) => void>;
  applySignatureRef: React.MutableRefObject<(removeSlash?: boolean) => boolean>;
  executeItemRef: React.MutableRefObject<(id: string, removeSlash?: boolean) => void>;
  openCitationRef: React.MutableRefObject<(removeSlash?: boolean) => void>;
  openCitation: (removeSlash?: boolean) => void;
  onReferenceSettingsRef: React.MutableRefObject<(() => void) | undefined>;
  onStyleSettingsRef: React.MutableRefObject<(() => void) | undefined>;
  onToastRef: React.MutableRefObject<((message: string, type?: 'info' | 'success' | 'warning' | 'error') => void) | undefined>;
  callback: React.MutableRefObject<(markdown: string) => void>;
  onSourceAction?: (id: string, source: string, from: number, to: number) => void;
  lastDropTargetRef: React.MutableRefObject<DropTargetInfo | null>;
  floatingOriginSelectionRef?: React.MutableRefObject<any>;
}

/**
 * ========================================================================================
 * [함수명] useVisualEditorInsertActions - 시각 에디터의 서식 실행, 블록/미디어/각주/서명/인용문헌 삽입 및 외부 commandRef 브릿지를 구성하는 커스텀 훅입니다.
 *
 * @param {UseVisualEditorInsertActionsParams} params - 에디터 뷰/코덱 Ref 및 모달 상태 제어 객체
 * @returns {object} 서식 실행 함수(run, clear, executeItem) 및 모달 확인 핸들러 묶음
 *
 * @example
 * const { run, clear, blockCommands, executeItem, ... } = useVisualEditorInsertActions({ ... });
 * ==========================================================================================
 */
export function useVisualEditorInsertActions({
  viewRef,
  codecRef,
  caretRef,
  host,
  readOnly,
  commandRef,
  slashRange,
  setSlash,
  setNotice,
  setQuery,
  setPopup,
  setSelection,
  manualFloatingRef,
  selectionVisibleRef,
  linkTargetRef,
  setLinkDialog,
  setLinkDialogData,
  linkCommandRef,
  dateTargetRef,
  setDatePickerOpen,
  setDatePickerPos,
  openDatePickerRef,
  tableTargetRef,
  setTableDialog,
  openTableRef,
  imageTargets,
  imagesRef,
  beginImageRef,
  beginMediaRef,
  insertFootnoteRef,
  applySignatureRef,
  executeItemRef,
  openCitationRef,
  openCitation,
  onReferenceSettingsRef,
  onStyleSettingsRef,
  onToastRef,
  callback,
  onSourceAction,
  lastDropTargetRef,
  floatingOriginSelectionRef,
}: UseVisualEditorInsertActionsParams) {
  const run = (command: Command, removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const stored = view.state.storedMarks;
    synchronizeTextSelection(view);
    if (removeSlash && slashRange.current) {
      const { from, to } = slashRange.current;
      let transaction = view.state.tr.delete(from, to);
      transaction = transaction.setSelection(TextSelection.create(transaction.doc, from));
      if (stored) transaction = transaction.setStoredMarks(stored);
      view.dispatch(transaction);
      slashRange.current = null;
      setSlash(false);
    }
    command(view.state, view.dispatch, view);
    if (floatingOriginSelectionRef) {
      floatingOriginSelectionRef.current = view.state.selection;
    }
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const isFloatingActive = Boolean(activeEl && document.getElementById('floating-toolbar')?.contains(activeEl));
    if (!isFloatingActive) {
      view.focus();
    }
    caretRef.current?.schedule();
  };

  const insertParagraphBeforeFirstBlock = () => {
    const view = viewRef.current;
    if (!view || !view.editable || !FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || '')) return;
    const tr = view.state.tr.insert(0, visualSchema.nodes.paragraph.create());
    view.dispatch(closeHistory(tr.setSelection(TextSelection.create(tr.doc, 1)).scrollIntoView()));
    view.focus();
    caretRef.current?.schedule();
  };

  const setQuote =
    (alertType: string | null): Command =>
    (state, dispatch, view) => {
      const position = state.selection.$from;
      const { $from, $to } = state.selection;

      // 1. 이미 인용문 내부에 위치한 경우
      for (let depth = position.depth; depth > 0; depth--) {
        if (position.node(depth).type === visualSchema.nodes.blockquote) {
          const existingAlert = position.node(depth).attrs.alertType || null;
          // 기본 인용문은 이미 인용문 안에서 다시 실행하면 해제하지 않고 한 단계 더 중첩한다(최대 6단계).
          // 해제는 인용문 첫 줄 맨 앞에서 Backspace(한 단계씩) 또는 태그 취소로 수행한다.
          if (!alertType && existingAlert === null) {
            let quoteDepth = 0;
            for (let d = position.depth; d > 0; d--) {
              if (position.node(d).type === visualSchema.nodes.blockquote) quoteDepth++;
            }
            if (quoteDepth >= 6) return false;
            // 중첩 인용문 계속 진행 (아래의 리스트 분기 또는 wrapIn으로 안전 진입)
            break;
          }
          if (existingAlert === (alertType || null)) {
            const quoteRange = $from.blockRange($to, node => node.type === visualSchema.nodes.blockquote);
            if (quoteRange) {
              const target = liftTarget(quoteRange);
              if (target !== null && dispatch) {
                dispatch(closeHistory(state.tr.lift(quoteRange, target)).scrollIntoView());
                return true;
              }
            }
            return lift(state, dispatch, view);
          }
          if (dispatch) {
            let tr = state.tr.setNodeMarkup(position.before(depth), undefined, { alertType });
            const afterPos = position.after(depth);
            if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
              const savedFrom = tr.selection.from;
              const savedTo = tr.selection.to;
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
              tr = tr.setSelection(TextSelection.create(tr.doc, savedFrom, savedTo));
            }
            dispatch(tr.scrollIntoView());
          }
          return true;
        }
      }

      // 2. 리스트(bullet_list / ordered_list) 내부 항목 인용문 감싸기
      let listDepth = 0;
      for (let d = $from.depth; d > 0; d--) {
        const name = $from.node(d).type.name;
        if (name === 'bullet_list' || name === 'ordered_list') {
          listDepth = d;
          break;
        }
      }

      if (listDepth > 0) {
        const listNode = $from.node(listDepth);
        const isOrdered = listNode.type === visualSchema.nodes.ordered_list;
        const listRange = $from.blockRange($to, node => node.type === visualSchema.nodes.bullet_list || node.type === visualSchema.nodes.ordered_list);
        const startIndex = listRange ? listRange.startIndex : 0;
        const endIndex = listRange ? listRange.endIndex : listNode.childCount;

        const beforeItems: DocumentNode[] = [];
        for (let i = 0; i < startIndex; i++) beforeItems.push(listNode.child(i));
        const selectedItems: DocumentNode[] = [];
        for (let i = startIndex; i < endIndex; i++) selectedItems.push(listNode.child(i));
        const afterItems: DocumentNode[] = [];
        for (let i = endIndex; i < listNode.childCount; i++) afterItems.push(listNode.child(i));

        const quotedList = listNode.type.create(
          {
            ...listNode.attrs,
            ...(isOrdered ? { order: (listNode.attrs.order || 1) + startIndex } : {})
          },
          Fragment.fromArray(selectedItems)
        );

        const blockquoteNode = visualSchema.nodes.blockquote.create(
          { alertType: alertType || null },
          quotedList
        );

        const replacements: DocumentNode[] = [];
        if (beforeItems.length > 0) {
          replacements.push(listNode.type.create(listNode.attrs, Fragment.fromArray(beforeItems)));
        }
        replacements.push(blockquoteNode);
        if (afterItems.length > 0) {
          replacements.push(listNode.type.create(
            {
              ...listNode.attrs,
              ...(isOrdered ? { order: (listNode.attrs.order || 1) + endIndex } : {})
            },
            Fragment.fromArray(afterItems)
          ));
        }

        if (dispatch) {
          const listStart = $from.before(listDepth);
          const listEnd = $from.after(listDepth);
          let tr = state.tr.replaceWith(listStart, listEnd, replacements);

          const afterQuotePos = listStart + (beforeItems.length > 0 ? replacements[0].nodeSize : 0) + blockquoteNode.nodeSize;
          if (afterItems.length === 0 && (afterQuotePos === tr.doc.content.size || tr.doc.nodeAt(afterQuotePos)?.type !== visualSchema.nodes.paragraph)) {
            tr = tr.insert(afterQuotePos, visualSchema.nodes.paragraph.create());
          }

          let quotePos = -1;
          tr.doc.descendants((node, pos) => {
            if (node === blockquoteNode) {
              quotePos = pos;
              return false;
            }
          });
          if (quotePos >= 0) {
            const selStart = Math.min(tr.doc.content.size - 1, quotePos + 3);
            const selEnd = Math.min(tr.doc.content.size - 1, quotePos + blockquoteNode.nodeSize - 3);
            try {
              tr = tr.setSelection(TextSelection.between(tr.doc.resolve(selStart), tr.doc.resolve(selEnd)));
            } catch (_) {
              tr = tr.setSelection(Selection.near(tr.doc.resolve(selStart)));
            }
          }
          dispatch(closeHistory(tr).scrollIntoView());
        }
        return true;
      }

      // 3. 일반 문단 / 블록 인용문 감싸기
      return wrapIn(visualSchema.nodes.blockquote, { alertType })(
        state,
        dispatch
          ? tr => {
              const $fromCur = tr.selection.$from;
              for (let depth = $fromCur.depth; depth > 0; depth--) {
                if ($fromCur.node(depth).type === visualSchema.nodes.blockquote) {
                  const afterPos = $fromCur.after(depth);
                  const savedFrom = tr.selection.from;
                  const savedTo = tr.selection.to;
                  tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
                  tr = tr.setSelection(TextSelection.create(tr.doc, savedFrom, savedTo));
                  break;
                }
              }
              dispatch(tr.scrollIntoView());
            }
          : undefined,
        view
      );
    };

  const blockCommands: [string, Command][] = [
    ['본문', setBlockType(visualSchema.nodes.paragraph)],
    ['제목 1', setHeadingBlock(1)],
    ['제목 2', setHeadingBlock(2)],
    ['제목 3', setHeadingBlock(3)],
    ['글머리 목록', selectedList('bullet')],
    ['번호 목록', selectedList('ordered')],
    ['인용문', setQuote(null)],
    ['코드 블록', setCodeBlock],
    [
      '구분선',
      (state, dispatch) => {
        if (dispatch) {
          const hrNode = visualSchema.nodes.horizontal_rule.create();
          let tr = state.tr.replaceSelectionWith(hrNode);
          let insertedPos = -1;
          tr.doc.descendants((n, pos) => {
            if (n === hrNode) {
              insertedPos = pos;
              return false;
            }
            return true;
          });
          if (insertedPos >= 0) {
            const afterPos = insertedPos + hrNode.nodeSize;
            if (afterPos === tr.doc.content.size || tr.doc.nodeAt(afterPos)?.type !== visualSchema.nodes.paragraph) {
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            }
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          }
          dispatch(closeHistory(tr).scrollIntoView());
        }
        return true;
      },
    ],
  ];

  const link: Command = () => {
    const view = viewRef.current;
    if (!view || !view.editable) return false;
    const { from, to, empty } = view.state.selection;
    let selectedText = '';
    let existingHref = 'https://';
    if (!empty) {
      selectedText = view.state.doc.textBetween(from, to, ' ');
      const mark = view.state.doc.nodeAt(from)?.marks.find(m => m.type.name === 'link');
      if (mark?.attrs?.href) existingHref = mark.attrs.href;
    }
    linkTargetRef.current = { from, to, valid: true };
    setLinkDialogData({ text: selectedText, href: existingHref });
    setLinkDialog(true);
    return true;
  };
  linkCommandRef.current = link;

  const handleLinkConfirm = ({ text, href }: { text: string; href: string }) => {
    const view = viewRef.current;
    const target = linkTargetRef.current;
    if (!view || !target?.valid || !view.editable) {
      setNotice('문서나 삽입 위치가 변경되었습니다.');
      return;
    }
    linkTargetRef.current = null;
    const mark = visualSchema.marks.link.create({ href });
    const textNode = view.state.schema.text(text, [mark]);

    // 🌟 [링크 삽입 후 자동 스페이스 한 칸 삽입]: 링크 바로 뒤에 일반 공백(' ')을 자동 삽입하여 다음 입력이 링크로 이어지지 않게 처리
    const nextChar = target.to < view.state.doc.content.size ? view.state.doc.textBetween(target.to, target.to + 1) : '';
    const hasSpaceAfter = nextChar === ' ';

    let tr = view.state.tr;
    if (hasSpaceAfter) {
      tr = tr.replaceWith(target.from, target.to, textNode);
    } else {
      const spaceNode = view.state.schema.text(' ');
      tr = tr.replaceWith(target.from, target.to, [textNode, spaceNode]);
    }
    const nextPos = target.from + text.length + 1;
    tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(nextPos, tr.doc.content.size)));
    tr = tr.removeStoredMark(visualSchema.marks.link);
    tr = tr.setStoredMarks([]);
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
  };

  const handleLinkUnlink = () => {
    const view = viewRef.current;
    const target = linkTargetRef.current;
    if (!view || !target?.valid || !view.editable) {
      setNotice('문서나 삽입 위치가 변경되었습니다.');
      return;
    }
    linkTargetRef.current = null;
    let tr = view.state.tr.removeMark(target.from, target.to, visualSchema.marks.link);
    tr = tr.removeStoredMark(visualSchema.marks.link);
    tr = tr.setStoredMarks([]);
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
  };

  const openDatePicker = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const from = view.state.selection.from;
    const to = view.state.selection.to;
    const rect = view.coordsAtPos(from);
    const isSlash = removeSlash && slashRange.current;
    dateTargetRef.current = {
      from: isSlash ? slashRange.current!.from : from,
      to: isSlash ? slashRange.current!.to : to,
      valid: true,
    };
    if (isSlash) {
      slashRange.current = null;
      setSlash(false);
    }
    setDatePickerPos({
      top: rect.bottom + 6,
      left: Math.max(16, rect.left),
    });
    setDatePickerOpen(true);
  };
  openDatePickerRef.current = openDatePicker;

  const handleDateInsert = (formattedDate: string) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    const target = dateTargetRef.current;
    if (target && target.valid) {
      let tr = view.state.tr.replaceWith(target.from, target.to, view.state.schema.text(formattedDate));
      const nextPos = target.from + formattedDate.length;
      tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
      view.dispatch(closeHistory(tr).scrollIntoView());
    } else {
      view.dispatch(view.state.tr.insertText(formattedDate).scrollIntoView());
    }
    view.focus();
    setDatePickerOpen(false);
    dateTargetRef.current = null;
  };

  const clear: Command = (state, dispatch, view) => {
    const sourceBlocks: Array<{ pos: number; size: number; source: string }> = [];
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
      if (node.type === visualSchema.nodes.source_block) {
        sourceBlocks.push({ pos, size: node.nodeSize, source: node.attrs.source || '' });
        return false;
      }
    });
    if (sourceBlocks.length) {
      const tr = state.tr;
      for (const block of sourceBlocks.reverse()) {
        tr.replaceWith(
          block.pos,
          block.pos + block.size,
          createVisualDocumentCodec(clearMarkdownFormatting(block.source)).doc.content
        );
      }
      const from = tr.mapping.map(state.selection.from);
      const to = tr.mapping.map(state.selection.to);
      tr.removeMark(from, to).setStoredMarks([]);
      tr.setBlockType(from, to, visualSchema.nodes.paragraph);
      dispatch?.(closeHistory(tr));
      return true;
    }
    if (selectedList('clear')(state, dispatch, view)) return true;
    const { from, to, $from } = state.selection;
    const transaction = state.tr
      .removeMark(state.selection.empty ? $from.start() : from, state.selection.empty ? $from.end() : to)
      .setStoredMarks([]);
    if ($from.parent.isTextblock) {
      transaction.setBlockType(from, to, visualSchema.nodes.paragraph);
    }
    dispatch?.(transaction);
    if (view && dispatch) {
      for (let depth = 0; depth < 10; depth++) {
        const current = view.state;
        const parentNames = Array.from(
          { length: current.selection.$from.depth },
          (_, index) => current.selection.$from.node(index + 1).type.name
        );
        if (!parentNames.some(name => name === 'list_item' || name === 'blockquote')) break;
        if (!liftListItem(visualSchema.nodes.list_item)(current, dispatch, view) && !lift(current, dispatch, view)) {
          break;
        }
      }
    }
    return true;
  };

  openTableRef.current = () => {
    const view = viewRef.current;
    if (!view?.editable) return;
    if (tableContext(view.state)) {
      setNotice('현재 표는 행·열 추가로 확장할 수 있습니다. 새 표는 표 아래 본문에서 넣어 주세요.');
      return;
    }
    if (tableTargetRef.current) imageTargets.current.delete(tableTargetRef.current);
    const target = { from: view.state.selection.from, to: view.state.selection.to, valid: true };
    tableTargetRef.current = target;
    imageTargets.current.add(target);
    setTableDialog(true);
  };

  const insertFootnote = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let maxNum = 0;
    view.state.doc.descendants(node => {
      if (node.type.name === 'visual_footnote_ref' || node.type.name === 'visual_footnote_def') {
        const n = parseInt(node.attrs.label, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const label = String(maxNum + 1);
    let tr = view.state.tr;
    if (removeSlash && slashRange.current) {
      tr = tr.delete(slashRange.current.from, slashRange.current.to);
      slashRange.current = null;
      setSlash(false);
    }
    const { to } = tr.selection;
    const refNode = visualSchema.nodes.visual_footnote_ref.create({ label });
    const defNode = visualSchema.nodes.visual_footnote_def.create({
      label,
      content: '각주 내용을 입력하세요',
    });
    const insertPos = tr.doc.content.size;
    tr = tr.insert(insertPos, defNode);

    // 🌟 [각주 삽입 후 커서 다음 칼럼(각주 바로 뒤 본문 기준선) 전진 및 본문 포커스 유지]:
    tr = tr.insert(to, refNode);
    const nextPos = to + refNode.nodeSize;
    tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(nextPos, tr.doc.content.size)));
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
    caretRef.current?.schedule();
  };
  insertFootnoteRef.current = insertFootnote;

  const applySignature = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable || !codecRef.current) return false;

    if (removeSlash && slashRange.current) {
      const range = slashRange.current;
      view.dispatch(view.state.tr.delete(range.from, range.to));
      slashRange.current = null;
      setSlash(false);
    }

    const { from, to } = view.state.selection;
    let selectedText = '';
    if (from !== to) {
      selectedText = view.state.doc.textBetween(from, to, '\n', '\n').trim();
    }

    // ✍️ 서명 모달 오픈 (선택 영역 텍스트가 있을 경우 전달)
    window.dispatchEvent(
      new CustomEvent('onrivi:open-signature-modal', {
        detail: selectedText ? { customBody: selectedText } : undefined,
      })
    );
    return true;
  };
  applySignatureRef.current = applySignature;

  beginImageRef.current = (source, position, file) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    if (tableContext(view.state)) {
      setNotice('표 안 미디어 삽입은 현재 Markdown 보기를 사용해 주세요.');
      return;
    }
    const from = position ?? view.state.selection.from;
    const target = {
      from,
      to: source ? from + (view.state.doc.nodeAt(from)?.nodeSize || 0) : position ?? view.state.selection.to,
      source,
      valid: true,
    };
    imageTargets.current.add(target);
    const insert = (path: string, alt = '', fullMarkdown?: string) => {
      imageTargets.current.delete(target);
      if (!target.valid || viewRef.current !== view || !view.editable) return false;
      if (source && view.state.doc.nodeAt(target.from)?.attrs.source !== source) return false;

      let tr = view.state.tr;

      if (fullMarkdown && fullMarkdown.trim()) {
        const parsed = createVisualDocumentCodec(fullMarkdown.trim());
        const nodesToInsert = parsed.doc.content;
        if (source) {
          tr = tr.replaceWith(target.from, target.to, nodesToInsert);
        } else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, nodesToInsert);
            } else {
              try {
                tr = tr
                  .setSelection(TextSelection.between($from, tr.doc.resolve(target.to)))
                  .replaceSelectionWith(nodesToInsert as any);
              } catch (err) {
                logWarn({
                  file: 'frontend/src/components/visualEditor/useVisualEditorInsertActions.ts',
                  func: 'beginImage.insert',
                  doing: '캡션 포함 마크다운 이미지 노드 선택 영역 교체 실패로 직접 삽입 폴백 중',
                  target: path,
                  error: err,
                });
                tr = tr.insert(target.from, nodesToInsert);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, nodesToInsert);
          }
          const afterPos = Math.min(tr.doc.content.size, target.from + nodesToInsert.size);
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size, afterPos + 1)));
        }
      } else {
        const title = source ? visualImageDetails(source).title : '';
        const rawAlt = (alt ?? '').replace(/\\([\\\[\]])/g, '$1');
        const unescapedAlt = /^[\\\[\]\s]+$/.test(rawAlt) ? '' : rawAlt;
        const cleanAlt = unescapedAlt ? unescapedAlt.replace(/([\\\[\]])/g, '\\$1') : '';
        const markdown = `![${cleanAlt}](${path.includes(' ') ? '<' + path + '>' : path}${title ? ' "' + title.replace(/([\\"])/g, '\\$1') + '"' : ''})\n\n`;
        const node = visualSchema.nodes.visual_image.create({ source: markdown });
        if (source) tr = tr.replaceWith(target.from, target.to, node);
        else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, node);
            } else {
              try {
                tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(node);
              } catch (err) {
                logWarn({
                  file: 'frontend/src/components/visualEditor/useVisualEditorInsertActions.ts',
                  func: 'beginImage.insert',
                  doing: '단일 이미지 노드 선택 영역 교체 실패로 직접 삽입 폴백 중',
                  target: path,
                  error: err,
                });
                tr = tr.insert(target.from, node);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, node);
          }
          let insertedPos = -1;
          tr.doc.descendants((n, pos) => {
            if (n === node) {
              insertedPos = pos;
              return false;
            }
            return true;
          });
          if (insertedPos >= 0) {
            const afterPos = insertedPos + node.nodeSize;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          } else if (tr.selection.$to.parent === tr.doc || tr.selection.to === tr.doc.content.size) {
            tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
          }
        }
      }
      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      return true;
    };
    if (file && imagesRef.current.onImageFile) {
      void imagesRef.current
        .onImageFile(file)
        .then(path => {
          if (path && !insert(path, '')) setNotice('문서나 삽입 위치가 변경되었습니다. 저장된 사진을 다시 선택해 주세요.');
          if (!path) imageTargets.current.delete(target);
        })
        .catch(err => {
          logError({
            file: 'frontend/src/components/visualEditor/useVisualEditorInsertActions.ts',
            func: 'beginImage',
            doing: '클립보드/대화상자 이미지 파일 리소스 폴더 업로드 저장 중',
            target: (file as File).name || 'image_blob',
            error: err,
          });
          imageTargets.current.delete(target);
          setNotice('이미지 저장에 실패했습니다. 리소스 폴더 연결을 확인해 주세요.');
        });
    } else if (imagesRef.current.onImageDialog) {
      imagesRef.current.onImageDialog(source || null, insert);
    } else {
      imageTargets.current.delete(target);
      setNotice('사진 넣기 기능을 연결할 수 없습니다.');
    }
  };

  beginMediaRef.current = (kind, source, position) => {
    const view = viewRef.current;
    if (!view?.editable || !imagesRef.current.onMediaDialog) return;
    if (tableContext(view.state)) {
      setNotice('표 안 미디어 삽입은 현재 Markdown 보기를 사용해 주세요.');
      return;
    }
    const from = position ?? view.state.selection.from;
    const target = {
      from,
      to: source ? from + (view.state.doc.nodeAt(from)?.nodeSize || 0) : view.state.selection.to,
      source,
      valid: true,
    };
    imageTargets.current.add(target);
    imagesRef.current.onMediaDialog(kind, source || null, code => {
      imageTargets.current.delete(target);
      if (!target.valid || viewRef.current !== view || !view.editable) return false;
      if (source && view.state.doc.nodeAt(target.from)?.attrs.source !== source) return false;

      const trimmed = code.trim();
      const isPureMedia = !!mediaDetails(trimmed);
      let tr = view.state.tr;

      if (!isPureMedia) {
        const parsed = createVisualDocumentCodec(trimmed);
        const nodesToInsert = parsed.doc.content;
        if (nodesToInsert.size === 0) return false;

        if (source) {
          tr = tr.replaceWith(target.from, target.to, nodesToInsert);
        } else {
          if (target.from === target.to) {
            const $from = tr.doc.resolve(target.from);
            if ($from.depth === 0) {
              tr = tr.insert(target.from, nodesToInsert);
            } else {
              try {
                tr = tr
                  .setSelection(TextSelection.between($from, tr.doc.resolve(target.to)))
                  .replaceSelectionWith(nodesToInsert as any);
              } catch (err) {
                logWarn({
                  file: 'frontend/src/components/visualEditor/useVisualEditorInsertActions.ts',
                  func: 'beginMedia',
                  doing: '캡션 포함 미디어 노드 선택 영역 교체 실패로 직접 삽입 폴백 중',
                  target: kind,
                  error: err,
                });
                tr = tr.insert(target.from, nodesToInsert);
              }
            }
          } else {
            tr = tr.replaceWith(target.from, target.to, nodesToInsert);
          }
          const afterPos = Math.min(tr.doc.content.size, target.from + nodesToInsert.size);
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size, afterPos + 1)));
        }
      } else {
        const node = visualSchema.nodes.visual_media.create({ kind, source: trimmed + '\n\n' });
        if (source) tr = tr.replaceWith(target.from, target.to, node);
        else {
          tr = tr.setSelection(TextSelection.between(tr.doc.resolve(target.from), tr.doc.resolve(target.to))).replaceSelectionWith(node);
          let insertedPos = -1;
          tr.doc.descendants((n, pos) => {
            if (n === node) {
              insertedPos = pos;
              return false;
            }
            return true;
          });
          if (insertedPos >= 0) {
            const afterPos = insertedPos + node.nodeSize;
            tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          } else if (tr.selection.to === tr.doc.content.size || tr.selection.$to.parent === tr.doc) {
            tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
          }
        }
      }
      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      return true;
    });
  };

  const deleteCitationFromDoc = (key: string) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    const lowerKey = key.toLowerCase();

    const rangesToDelete: Array<{ from: number; to: number }> = [];
    view.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const match of Array.from(node.text.matchAll(citationPattern))) {
        const matchKey = match[1] || match[2];
        if (matchKey && matchKey.toLowerCase() === lowerKey) {
          rangesToDelete.push({ from: pos + match.index!, to: pos + match.index! + match[0].length });
        }
      }
    });

    for (let i = rangesToDelete.length - 1; i >= 0; i--) {
      tr = tr.delete(rangesToDelete[i].from, rangesToDelete[i].to);
    }

    let bibHeadingPos = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
        bibHeadingPos = pos;
        return false;
      }
    });

    if (bibHeadingPos >= 0) {
      const itemsToDelete: Array<{ from: number; to: number }> = [];
      view.state.doc.descendants((node, pos) => {
        if (pos > bibHeadingPos && node.type.name === 'list_item') {
          if (node.textContent.toLowerCase().includes(lowerKey)) {
            itemsToDelete.push({ from: pos, to: pos + node.nodeSize });
          }
        }
      });
      for (let i = itemsToDelete.length - 1; i >= 0; i--) {
        const mappedFrom = tr.mapping.map(itemsToDelete[i].from);
        const mappedTo = tr.mapping.map(itemsToDelete[i].to);
        tr = tr.delete(mappedFrom, mappedTo);
      }
    }

    view.dispatch(closeHistory(tr));
    view.focus();
    if (onToastRef.current) onToastRef.current('참고문헌이 삭제되었습니다.', 'success');
  };

  const deleteAllCitationsFromDoc = () => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    const rangesToDelete: Array<{ from: number; to: number }> = [];
    view.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const match of Array.from(node.text.matchAll(citationPattern))) {
        rangesToDelete.push({ from: pos + match.index!, to: pos + match.index! + match[0].length });
      }
    });
    for (let i = rangesToDelete.length - 1; i >= 0; i--) {
      tr = tr.delete(rangesToDelete[i].from, rangesToDelete[i].to);
    }
    view.dispatch(closeHistory(tr));
    view.focus();
    if (onToastRef.current) onToastRef.current('모든 참고문헌이 삭제되었습니다.', 'success');
  };

  const insertBibliography = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    let tr = view.state.tr;
    if (removeSlash && slashRange.current) {
      tr = tr.delete(slashRange.current.from, slashRange.current.to);
      slashRange.current = null;
      setSlash(false);
    }
    let existingPos = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
        existingPos = pos;
        return false;
      }
    });

    if (existingPos >= 0) {
      const node = view.state.doc.nodeAt(existingPos);
      const targetPos = Math.min(tr.doc.content.size, existingPos + (node ? node.nodeSize : 0));
      tr = tr.setSelection(TextSelection.create(tr.doc, targetPos));
      view.dispatch(tr.scrollIntoView());
      view.focus();
      if (onToastRef.current) onToastRef.current('이미 참고문헌 섹션이 존재하여 해당 위치로 이동했습니다.', 'info');
      return;
    }

    const headingNode = visualSchema.nodes.heading.create({ level: 2 }, visualSchema.text('참고문헌'));
    const pNode = visualSchema.nodes.paragraph.create(null, visualSchema.text(''));
    const itemNode = visualSchema.nodes.list_item.create(null, pNode);
    const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);

    const insertPos = tr.doc.content.size;
    tr = tr.insert(insertPos, [headingNode, listNode]);

    const cursorTarget = insertPos + headingNode.nodeSize + 2;
    tr = tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size - 1, cursorTarget)));
    view.dispatch(closeHistory(tr).scrollIntoView());
    view.focus();
    if (onToastRef.current) onToastRef.current('문서 끝에 참고문헌 목록이 추가되었습니다.', 'success');
  };

  const nativeCommands: Record<string, Command> = {
    bold: toggleMark(visualSchema.marks.strong),
    italic: toggleMark(visualSchema.marks.em),
    underline: toggleMark(visualSchema.marks.underline),
    inlineCode: toggleMark(visualSchema.marks.code),
    strikethrough: toggleMark(visualSchema.marks.strike),
    link,
    clear,
    quoteNote: setQuote('NOTE'),
    quoteTip: setQuote('TIP'),
    quoteImportant: setQuote('IMPORTANT'),
    quoteWarning: setQuote('WARNING'),
    quoteCaution: setQuote('CAUTION'),
    table: () => {
      openTableRef.current();
      return true;
    },
    list: selectedList('bullet'),
    orderedList: selectedList('ordered'),
    checklist: makeChecklist,
    quote: setQuote(null),
    codeblock: setCodeBlock,
    divider: blockCommands[blockCommands.length - 1][1],
    undo,
    redo,
    math: () => {
      executeItem('math');
      return true;
    },
    latex: () => {
      executeItem('math');
      return true;
    },
    footnote: () => {
      insertFootnote(true);
      return true;
    },
    fn: () => {
      insertFootnote(true);
      return true;
    },
    signature: () => {
      applySignature();
      return true;
    },
    sign: () => {
      applySignature();
      return true;
    },
    bibliography: () => {
      insertBibliography();
      return true;
    },
    citation: () => {
      openCitation();
      return true;
    },
    cite: () => {
      openCitation();
      return true;
    },
    add_reference: () => {
      onReferenceSettingsRef.current?.();
      return true;
    },
    vibe: () => {
      onReferenceSettingsRef.current?.();
      return true;
    },
  };
  for (let level = 1; level <= 6; level++) nativeCommands[`h${level}`] = setHeadingBlock(level);

  const executeItem = (id: string, removeSlash = false) => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    if (id === 'aiHelp') {
      if (removeSlash && slashRange.current) {
        view.dispatch(view.state.tr.delete(slashRange.current.from, slashRange.current.to));
        slashRange.current = null;
        setSlash(false);
      }
      window.dispatchEvent(new Event('onrivi:open-inline-ai'));
      return;
    }
    if (['bibliography', 'bib', '참고문헌'].includes(id)) {
      insertBibliography(removeSlash);
      return;
    }
    if (['citation', 'cite'].includes(id)) {
      openCitation(removeSlash);
      return;
    }
    if (['footnote', 'fn'].includes(id)) {
      insertFootnote(removeSlash);
      return;
    }
    if (['signature', 'sign', '서명', '사인'].includes(id)) {
      applySignature(removeSlash);
      return;
    }
    if (['youtube', 'map'].includes(id) && imagesRef.current.onMediaDialog) {
      if (removeSlash && slashRange.current) {
        view.dispatch(view.state.tr.delete(slashRange.current.from, slashRange.current.to));
        slashRange.current = null;
        setSlash(false);
      }
      beginMediaRef.current(id === 'map' ? 'map' : 'video');
      return;
    }
    if (id === 'image' && imagesRef.current.onImageDialog) {
      if (removeSlash && slashRange.current) {
        view.dispatch(view.state.tr.delete(slashRange.current.from, slashRange.current.to));
        slashRange.current = null;
        setSlash(false);
      }
      beginImageRef.current();
      return;
    }
    if (id === 'now' || id === 'calendar') {
      openDatePicker(removeSlash);
      return;
    }
    if (id === 'taglink' && imagesRef.current.onDocLinkDialog) {
      const from = view.state.selection.from;
      const to = view.state.selection.to;
      const rect = view.coordsAtPos(from);
      const isSlash = removeSlash && slashRange.current;
      const target = {
        from: isSlash ? slashRange.current!.from : from,
        to: isSlash ? slashRange.current!.to : to,
        valid: true,
      };
      if (isSlash) {
        slashRange.current = null;
        setSlash(false);
      }
      let initialSelectedText = from < to ? view.state.doc.textBetween(from, to, ' ').trim() : '';
      if (!initialSelectedText && !isSlash && view.state.selection.$from.parent.isTextblock) {
        const $cursor = view.state.selection.$from;
        const line = $cursor.parent.textContent;
        const offset = $cursor.parentOffset;
        for (const match of line.matchAll(/[^\s()[\]{}.,!?;:"'<>]+/gu)) {
          const start = match.index;
          const end = start + match[0].length;
          if (start <= offset && offset <= end) {
            initialSelectedText = match[0];
            target.from = $cursor.start() + start;
            target.to = $cursor.start() + end;
            break;
          }
        }
      }
      imagesRef.current.onDocLinkDialog(
        {
          top: Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6)),
          left: Math.max(8, Math.min(window.innerWidth - 440, rect.left)),
        },
        (targetUrl: string, displayTitle: string) => {
          if (!target.valid || viewRef.current !== view || !view.editable) return false;
          const mark = visualSchema.marks.link.create({ href: targetUrl });
          const textNode = view.state.schema.text(displayTitle, [mark]);
          let tr = view.state.tr.replaceWith(target.from, target.to, textNode);
          const nextPos = target.from + displayTitle.length;
          tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
          view.dispatch(closeHistory(tr).scrollIntoView());
          view.focus();
          return true;
        },
        initialSelectedText
      );
      return;
    }
    if (id === 'math' || id === 'latex') {
      const isSlash = removeSlash && slashRange.current;
      const from = isSlash ? slashRange.current!.from : view.state.selection.from;
      const to = isSlash ? slashRange.current!.to : view.state.selection.to;
      if (isSlash) {
        slashRange.current = null;
        setSlash(false);
      }
      if (imagesRef.current.onFormulaDialog) {
        const target = { from, to, valid: true };
        imageTargets.current.add(target);
        imagesRef.current.onFormulaDialog((formulaCode: string) => {
          imageTargets.current.delete(target);
          if (!target.valid || viewRef.current !== view || !view.editable) return false;
          const cleanCode = formulaCode.trim();
          const isInline =
            cleanCode.startsWith('$') && !cleanCode.startsWith('$$') && cleanCode.endsWith('$') && cleanCode.length >= 2;
          let tr = view.state.tr;
          if (isInline) {
            const rawLatex = cleanCode.slice(1, -1).trim();
            const inlineNode = visualSchema.nodes.visual_inline_math.create({ latex: rawLatex });
            const spaceNode = view.state.schema.text(' ');
            tr = tr.replaceWith(target.from, target.to, [inlineNode, spaceNode]);
            const nextPos = target.from + inlineNode.nodeSize + spaceNode.nodeSize;
            tr = tr.setSelection(TextSelection.create(tr.doc, nextPos));
          } else {
            const rawLatex = cleanCode.startsWith('$$')
              ? cleanCode.replace(/^\$\$|\$\$$/g, '').trim()
              : cleanCode.startsWith('```')
                ? cleanCode.replace(/^```[a-z]*\r?\n|```$/gi, '').trim()
                : cleanCode;
            const mathNode = visualSchema.nodes.visual_math.create({ latex: rawLatex });
            const $from = tr.doc.resolve(target.from);
            if (target.from === target.to && $from.depth > 0) {
              tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(target.to))).replaceSelectionWith(mathNode);
            } else {
              tr = tr.replaceWith(target.from, target.to, mathNode);
            }
            let insertedPos = -1;
            tr.doc.descendants((n, pos) => {
              if (n === mathNode) {
                insertedPos = pos;
                return false;
              }
              return true;
            });
            if (insertedPos >= 0) {
              const afterPos = insertedPos + mathNode.nodeSize;
              tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
              tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
            }
          }
          view.dispatch(closeHistory(tr).scrollIntoView());
          view.focus();
          return true;
        });
        return;
      }
      const sampleText = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
      const sampleNode = visualSchema.nodes.visual_math.create({ latex: sampleText });
      let tr = view.state.tr;
      const $from = tr.doc.resolve(from);
      if (from === to && $from.depth > 0) {
        tr = tr.setSelection(TextSelection.between($from, tr.doc.resolve(to))).replaceSelectionWith(sampleNode);
      } else {
        tr = tr.replaceWith(from, to, sampleNode);
      }
      let insertedPos = -1;
      tr.doc.descendants((n, pos) => {
        if (n === sampleNode) {
          insertedPos = pos;
          return false;
        }
        return true;
      });
      if (insertedPos >= 0) {
        const afterPos = insertedPos + sampleNode.nodeSize;
        tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
      } else if (tr.selection.to === tr.doc.content.size || tr.selection.$to.parent === tr.doc) {
        tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
      }
      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      return;
    }
    if (id === 'styleSettings' || id === 'style') {
      if (removeSlash && slashRange.current) {
        const range = slashRange.current;
        view.dispatch(view.state.tr.delete(range.from, range.to));
        slashRange.current = null;
        setSlash(false);
      }
      onStyleSettingsRef.current?.();
      return;
    }
    if (id === 'add_reference' || id === 'vibe') {
      if (removeSlash && slashRange.current) {
        const range = slashRange.current;
        view.dispatch(view.state.tr.delete(range.from, range.to));
        slashRange.current = null;
        setSlash(false);
      }
      onReferenceSettingsRef.current?.();
      return;
    }

    if (nativeCommands[id]) {
      run(nativeCommands[id], removeSlash);
      return;
    }
    if (removeSlash && slashRange.current) {
      const range = slashRange.current;
      view.dispatch(view.state.tr.delete(range.from, range.to));
      slashRange.current = null;
      setSlash(false);
    }
    if (!onSourceAction || !codecRef.current) {
      setNotice('이 명령은 Markdown 보기에서 사용할 수 있습니다.');
      return;
    }
    const token = `ONRIVICURSOR${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const { from, to } = view.state.selection;
    const transaction = view.state.tr.insertText(`${token}END`, to).insertText(`${token}START`, from);
    const marked = codecRef.current.serialize(transaction.doc);
    const start = marked.indexOf(`${token}START`);
    const end = marked.indexOf(`${token}END`);
    const source = marked.replace(`${token}START`, '').replace(`${token}END`, '');
    onSourceAction(id, source, start, end - `${token}START`.length);
  };
  executeItemRef.current = executeItem;

  useEffect(() => {
    if (!commandRef) return;
    const commands: Record<string, Command> = {
      UNDO: undo,
      REDO: redo,
      BOLD: toggleMark(visualSchema.marks.strong),
      ITALIC: toggleMark(visualSchema.marks.em),
      UNDERLINE: toggleMark(visualSchema.marks.underline),
      INLINE_CODE: toggleMark(visualSchema.marks.code),
      LIST: selectedList('bullet'),
      ORDERED_LIST: selectedList('ordered'),
      CHECK: makeChecklist,
      CHECKLIST: makeChecklist,
      QUOTE: setQuote(null),
      CODE_BLOCK: setCodeBlock,
      LINK: link,
      REMOVE_PREFIX: clear,
      CLEAR: clear,
      clear: clear,
      STRIKETHROUGH: toggleMark(visualSchema.marks.strike),
      QUOTE_NOTE: setQuote('NOTE'),
      QUOTE_TIP: setQuote('TIP'),
      QUOTE_IMPORTANT: setQuote('IMPORTANT'),
      QUOTE_WARNING: setQuote('WARNING'),
      QUOTE_CAUTION: setQuote('CAUTION'),
      TABLE: () => {
        openTableRef.current();
        return true;
      },
      QUICK_TABLE: () => {
        openTableRef.current();
        return true;
      },
      INSERT_TABLE_ROW: tableAction('addRow'),
      DELETE_TABLE_ROW: tableAction('deleteRow'),
      NOW: () => {
        openDatePickerRef.current();
        return true;
      },
      CALENDAR: () => {
        openDatePickerRef.current();
        return true;
      },
      MATH: () => {
        executeItemRef.current('math');
        return true;
      },
      LATEX: () => {
        executeItemRef.current('math');
        return true;
      },
      SIGNATURE: () => {
        applySignatureRef.current();
        return true;
      },
      CITATION: () => {
        openCitation();
        return true;
      },
      CITE: () => {
        openCitation();
        return true;
      },
      TOGGLE_CSS_STYLE: () => {
        onStyleSettingsRef.current?.();
        return true;
      },
      CLEAN_DOC: () => {
        if (!viewRef.current || readOnly || !codecRef.current) return true;
        const view = viewRef.current;
        const currentSource = codecRef.current.serialize(view.state.doc);
        const result = cleanMarkdownDocument(currentSource);
        if (!result.isModified) {
          if (onToastRef.current) onToastRef.current('정리할 서식이 없습니다.', 'info');
          else setNotice('정리할 서식이 없습니다.');
          return true;
        }
        (view as any).replaceSource?.(result.cleanedText);
        callback.current(result.cleanedText);
        if (onToastRef.current) onToastRef.current(result.summaryMessage, 'success');
        else setNotice(result.summaryMessage);
        return true;
      },
      ORGANIZE_FOOTNOTES: () => {
        if (!viewRef.current || readOnly || !codecRef.current) return true;
        const view = viewRef.current;
        const currentSource = codecRef.current.serialize(view.state.doc);
        const result = organizeMarkdownFootnotes(currentSource);
        if (result.count === 0) {
          if (onToastRef.current) onToastRef.current('정리할 각주가 본문에 없습니다.', 'info');
          else setNotice('정리할 각주가 본문에 없습니다.');
          return true;
        }
        if (!result.changed) {
          if (onToastRef.current) onToastRef.current('모든 각주가 이미 본문 순서대로 완벽히 정렬되어 있습니다.', 'info');
          else setNotice('모든 각주가 이미 본문 순서대로 완벽히 정렬되어 있습니다.');
          return true;
        }
        (view as any).replaceSource?.(result.text);
        callback.current(result.text);
        if (onToastRef.current) {
          onToastRef.current(
            `총 ${result.count}개의 각주를 본문 순서에 맞추어 1번부터 순차적으로 재정렬했습니다.`,
            'success'
          );
        } else {
          setNotice(`총 ${result.count}개의 각주를 본문 순서에 맞추어 1번부터 순차적으로 재정렬했습니다.`);
        }
        return true;
      },
    };
    for (let level = 1; level <= 6; level++) commands[`H${level}`] = setHeadingBlock(level);

    const bridge = (command: any) => {
      // ✍️ 서명/블록 수정 범위 치환 커맨드
      if (typeof command === 'object' && command !== null && command.type === 'REPLACE_RANGE') {
        const view = viewRef.current;
        if (!view || readOnly) return true;
        const { from, to, text } = command as { from: number; to: number; text: string };
        const node = visualSchema.nodes.source_block.create({ source: text.trim() });
        let tr = view.state.tr.replaceWith(from, to, node);
        view.dispatch(closeHistory(tr).scrollIntoView());
        view.focus();
        caretRef.current?.schedule();
        return true;
      }
      // ✍️ 서명 source_block 위지윅 블록 즉시 삽입 커맨드
      if (typeof command === 'string' && command.startsWith('INSERT_SIGNATURE:')) {
        const view = viewRef.current;
        if (!view || readOnly) return true;
        const source = command.slice('INSERT_SIGNATURE:'.length).trim();
        const node = visualSchema.nodes.source_block.create({ source });
        let tr = view.state.tr;
        const { from, to } = view.state.selection;
        tr = tr.replaceWith(from, to, node);
        const afterPos = from + node.nodeSize;
        tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
        tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
        view.dispatch(closeHistory(tr).scrollIntoView());
        view.focus();
        caretRef.current?.schedule();
        return true;
      }
      if (typeof command === 'string' && command.startsWith('INSERT_TEXT:')) {
        const view = viewRef.current;
        if (!view || readOnly) return true;
        view.dispatch(view.state.tr.insertText(command.slice('INSERT_TEXT:'.length)).scrollIntoView());
        view.focus();
        caretRef.current?.schedule();
        return true;
      }
      if (typeof command === 'string' && command.startsWith('INSERT_SAVED_IMAGE:')) {
        const savedPath = command.slice('INSERT_SAVED_IMAGE:'.length).trim();
        const view = viewRef.current;
        if (!view || readOnly) return true;
        if (savedPath.startsWith('data:image/')) {
          logWarn({
            file: 'frontend/src/components/visualEditor/useVisualEditorInsertActions.ts',
            func: 'bridge',
            doing: 'INSERT_SAVED_IMAGE 커맨드로 Base64 이미지 직접 삽입 시도 차단 중',
            target: 'data:image/',
            error: 'Base64 image insertion blocked by policy',
          });
          return true;
        }
        const markdown = `![](${savedPath.includes(' ') ? '<' + savedPath + '>' : savedPath})\n\n`;
        const node = visualSchema.nodes.visual_image.create({ source: markdown });
        const target = lastDropTargetRef.current;
        let tr = view.state.tr;
        const insertPos = target ? Math.max(0, Math.min(target.pos, tr.doc.content.size)) : view.state.selection.to;
        const $pos = tr.doc.resolve(insertPos);

        if (
          target &&
          target.insertMode === 'split' &&
          $pos.parent.isTextblock &&
          $pos.parentOffset > 0 &&
          $pos.parentOffset < $pos.parent.content.size &&
          canSplit(tr.doc, insertPos)
        ) {
          tr = tr.split(insertPos);
          tr = tr.insert(insertPos + 1, node);
        } else if (target && target.insertMode === 'before' && $pos.depth >= 1) {
          tr = tr.insert($pos.before(1), node);
        } else if (target && target.insertMode === 'after' && $pos.depth >= 1) {
          tr = tr.insert($pos.after(1), node);
        } else {
          tr = tr.insert(insertPos, node);
        }

        let insertedPos = -1;
        tr.doc.descendants((n, pos) => {
          if (n === node) {
            insertedPos = pos;
            return false;
          }
          return true;
        });
        if (insertedPos >= 0) {
          const afterPos = insertedPos + node.nodeSize;
          tr = tr.insert(afterPos, visualSchema.nodes.paragraph.create());
          tr = tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
        } else if (tr.doc.lastChild?.type === visualSchema.nodes.visual_image) {
          tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
        }
        view.dispatch(closeHistory(tr).scrollIntoView());
        view.focus();
        lastDropTargetRef.current = null;
        return true;
      }
      if (command === 'TOGGLE_FLOATING_TOOLBAR' || command === 'SLASH_COMMAND') {
        const view = viewRef.current;
        if (!view || readOnly) return true;
        view.focus();
        const { from, to, $from, empty } = view.state.selection;
        if (command === 'TOGGLE_FLOATING_TOOLBAR' && floatingOriginSelectionRef) {
          floatingOriginSelectionRef.current = view.state.selection;
        }
        const rect = view.coordsAtPos(from);
        const spaceBelow = window.innerHeight - rect.bottom;
        const top =
          command === 'SLASH_COMMAND'
            ? spaceBelow < 260 && rect.top > 260
              ? Math.max(8, rect.top - 240)
              : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6))
            : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
        setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
        if (command === 'SLASH_COMMAND') {
          const isTextblock = $from.parent.isTextblock;
          const before = isTextblock ? $from.parent.textBetween(0, $from.parentOffset, '\n', '\n') : '';
          const match = before.match(slashPattern);
          if (empty && match) {
            const after = isTextblock
              ? $from.parent.textBetween($from.parentOffset, Math.min($from.parent.content.size, $from.parentOffset + 50), '\n', '\n')
              : '';
            const afterMatch = after.match(/^[\p{L}\p{N}_-]+/u);
            const trailingLen = afterMatch ? afterMatch[0].length : 0;
            slashRange.current = { from: from - match[1].length, to: to + trailingLen };
            const leadingQuery = match[1].slice(1).toLowerCase();
            const trailingQuery = afterMatch ? afterMatch[0].toLowerCase() : '';
            const fullQuery = (leadingQuery + trailingQuery).trim();
            setQuery(fullQuery || leadingQuery);
          } else {
            slashRange.current = { from, to };
            setQuery('');
          }
          manualFloatingRef.current = false;
          setSelection(false);
          setSlash(true);
        } else {
          setSlash(false);
          slashRange.current = null;
          manualFloatingRef.current = !selectionVisibleRef.current;
          setSelection(manualFloatingRef.current);
        }
        return true;
      }
      if (command === 'RESTORE_ORIGIN' || command === 'FOCUS_ORIGIN' || command === 'FOCUS') {
        const view = viewRef.current;
        if (view) {
          view.focus();
          caretRef.current?.schedule();
        }
        return true;
      }
      if (command === 'ADD_REFERENCE') {
        onReferenceSettingsRef.current?.();
        return true;
      }
      if (command === 'TOGGLE_CSS_STYLE') {
        onStyleSettingsRef.current?.();
        return true;
      }
      if (command === 'CITE' || command === 'CITATION') {
        if (viewRef.current) synchronizeTextSelection(viewRef.current);
        openCitationRef.current(false);
        return true;
      }
      if (command === 'FOOTNOTE' || command === 'FN') {
        insertFootnoteRef.current?.();
        return true;
      }
      if (commands[command]) {
        run(commands[command]);
        return true;
      }
      const aliases: Record<string, string> = {
        HR: 'divider',
        CHECK: 'checklist',
        CHECKLIST: 'checklist',
        BIBLIOGRAPHY: 'bibliography',
        BIB: 'bibliography',
        CITE: 'citation',
        CITATION: 'citation',
        FOOTNOTE: 'footnote',
        FN: 'footnote',
        DOCLINK: 'taglink',
        NOW: 'now',
        CALENDAR: 'now',
        VIDEO: 'youtube',
        YOUTUBE: 'youtube',
        ADD_REFERENCE: 'add_reference',
        TOGGLE_CSS_STYLE: 'styleSettings',
        AI_DRAFT: 'aiHelp',
        CODE: 'codeblock',
        LATEX: 'math',
        MATH: 'math',
        SIGNATURE: 'signature',
        SIGN: 'signature',
      };
      const item = TOOLBAR_ITEMS.find(
        tool => tool.id === aliases[command] || tool.id.replace(/([A-Z])/g, '_$1').toUpperCase() === command
      );
      if (!item) return false;
      executeItemRef.current(item.id);
      return true;
    };
    commandRef.current = bridge;
    const element = host.current;
    const activate = () => {
      commandRef.current = bridge;
    };
    element?.addEventListener('focusin', activate);
    return () => {
      element?.removeEventListener('focusin', activate);
      if (commandRef.current === bridge) commandRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandRef, readOnly]);

  return {
    run,
    clear,
    insertParagraphBeforeFirstBlock,
    blockCommands,
    handleLinkConfirm,
    handleLinkUnlink,
    handleDateInsert,
    deleteCitationFromDoc,
    deleteAllCitationsFromDoc,
    executeItem,
  };
}
