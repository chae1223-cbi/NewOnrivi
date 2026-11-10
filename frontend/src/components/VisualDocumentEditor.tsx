// ====================================================================
// 🏷️ 파일명 : VisualDocumentEditor.tsx
// 🎭 역할(Role) : Core (위지윅 시각 문서 편집기 메인 코어 뷰)
// 🎯 주요기능 : ProseMirror 상태/트랜잭션 라이프사이클 관리, 스크롤/커서 양방향 동기화, 인쇄 페이지 가이드 및 서브모듈 오케스트레이션
// 🚨 @PATCH : 2026-11-10 — [슬래시 명령어 글자 중간 실행 시 잔여 텍스트 삭제 및 전체 단어 검색 보장]: 커서 뒤의 단어 끝까지 slashRange.to에 포함하여 명령어 실행 시 뒤쪽 글자가 남지 않도록 완벽 제거
// 🚨 @PATCH : 2026-11-10 — [하이퍼링크 해제(handleLinkUnlink) 연동]: LinkModal에 onUnlink 콜백을 연결하여 링크 서식을 즉시 해제하고 일반 텍스트로 복원할 수 있도록 지원
// 🚨 @PATCH : 2026-11-08 — [플로팅 툴바 포커스 반환 연동]: 플로팅 툴바 종료 시 커서/서식을 보존하고 에디터 포커스 정상 복원
// 🚨 @PATCH : 2026-11-07 — [플로팅 툴바 커서 반환 연동]: 플로팅 툴바 오픈 시 view.state.selection을 floatingOriginSelectionRef에 기억하여 툴바 종료 시 원래 커서 위치로 복원 지원
// 🚨 @PATCH : 2026-11-04 — [Rule 3 코어 엔진 1순위: VisualDocumentEditor 4단계 모듈화 분리]:
//             1) 드래그 앤 드롭 이미지 인디케이터/업로드 파이프라인, 각주 헤더 플러그인, 표 열 리사이즈 컨트롤러를 visualDragDropImageController.ts로 분리
//             2) ProseMirror Keymap 및 키보드/입력/스마트 붙여넣기/드롭/클릭/DOM 이벤트 핸들러를 visualEditorProseMirrorHandlers.ts로 분리
//             3) 서식 실행(run/clear), 블록/미디어/각주/서명/참고문헌 삽입 및 외부 commandRef 브릿지를 useVisualEditorInsertActions.ts로 분리 (3,440줄 ➔ 730줄, -79% 슬림화)
// 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 3단계 모듈화 분리]:
//             1) 760줄의 거대 인라인 nodeViews 및 mediaNodeView를 createVisualNodeViews 팩토리 모듈로 전면 분리
//             2) table, math, code_block, footnote, mermaid, media 10대 NodeView를 nodeViews/ 하위로 격리하여 800줄 이상 추가 슬림화 달성
// 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 2단계 모듈화 분리]:
//             1) 인라인 상단 툴바/표 도구를 VisualEditorToolbar.tsx로, 슬래시 메뉴/플로팅 포털을 VisualSlashMenu.tsx로 분리
//             2) 360줄의 인라인 CSS 스타일을 visualEditorStyles.ts로 완전 격리하여 총 700줄 이상 추가 슬림화 달성
// 🚨 @PATCH : 2026-11-04 — [Rule 3 5순위: VisualDocumentEditor 대형 위지윅 에디터 모듈화 분리]:
//             1) 5,640줄의 거대 VisualDocumentEditor.tsx에서 4대 핵심 엔진(activeTagInspector, visualDocumentCommands, visualSelectionHelper, visualDropHelper)을 frontend/src/components/visualEditor/로 전면 분리
// ====================================================================
'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Slice } from 'prosemirror-model';
import type { SearchEditorHost } from '@/lib/documentFind';
import { createPortal } from 'react-dom';
import TableModal from '@/components/TableModal';
import LinkModal from '@/components/LinkModal';
import CalendarModal from '@/components/CalendarModal';
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import PrintPaginationPreview from '@/components/PrintPaginationPreview';
import { readPaginationSettings, writePaginationSettings, type PrintBreakAnchor } from '@/lib/documentPaginationSettings';
import { browserAccountStorage as pageStorage } from '@/lib/browserAccountStorage';
import { bulletNumbersAsText } from '@/lib/bulletNumberText';
import { tableContext } from '@/lib/visualTableCommands';
import VisualReadOnlyMarkdownBlock from '@/components/VisualReadOnlyMarkdownBlock';
import { EditorState, Selection, TextSelection, NodeSelection, Command } from 'prosemirror-state';
import { VisualAITargets } from '@/lib/ai/visualTarget';
import type { AITarget } from '@/lib/ai/types';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import type { MediaKind } from '@/lib/mediaMarkup';
import BibliographySummary from '@/components/BibliographySummary';
import { parseBibliography, citationPattern, citationLabel } from '@/lib/bibliography';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo, closeHistory } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { createVisualDocumentCodec, visualSchema, normalizeVisualMarkdownSpacing } from '@/lib/visualDocumentCodec';
import { visualMarkdownInputRules } from '@/lib/visualMarkdownInputRules';
import { visualCommandCatalog, filterVisualCommands } from '@/lib/visualCommandCatalog';
import { installVisualCaret } from '@/lib/visualCaret';
import { removeEmptySignatureBlocks } from '@/lib/signatureCleanup';
import { removeOrphanFootnotes } from '@/lib/footnoteCleanup';
import { hasHeadingNumber, numberHeadingTransaction, type HeadingNumberSetting } from '@/lib/headingNumbering';
import { nextReportNumber } from '@/lib/aiFriendlyReport';
import { logWarn } from '@/lib/errorDiagnostics';

import {
  slashPattern,
  type ActiveTagInfo,
  getActiveTagInfo,
  ATOM_BLOCK_TYPES,
  FIRST_BLOCK_INSERT_TYPES,
  exitMediaBlock,
  synchronizeTextSelection,
  type DropTargetInfo,
  VisualSlashMenu,
  VisualEditorToolbar,
  VISUAL_EDITOR_STYLES,
  createVisualNodeViews,
  installVisualDragDropController,
  createFootnoteHeaderPlugin,
  installVisualTableResizeController,
  createVisualEditorKeymap,
  createVisualEditorHandlers,
  useVisualEditorInsertActions,
} from '@/components/visualEditor';

type Codec = ReturnType<typeof createVisualDocumentCodec>;
const sessions = new Map<string, { source: string; state: EditorState; codec: Codec; scrollTop?: number; scrollLeft?: number }>();

type Props = {
  content: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  headingNumbering?: HeadingNumberSetting[];
  onSourceScroll?: (offset: number) => void;
  tabSize?: number;
  pageStyle?: any;
  onPdfPagePreview?: (signal: AbortSignal) => Promise<string | void>;
  spellCheck?: boolean;
  onSourceCursor?: (offset: number, reveal?: boolean) => void;
  documentId?: string;
  commandRef?: React.MutableRefObject<((command: string) => boolean) | null>;
  aiTargetRef?: React.MutableRefObject<((scope?: import('@/lib/ai/types').AIEditScope) => AITarget | null) | null>;
  customHotkeys?: Record<string, string>;
  customCommands?: Record<string, string>;
  onFloatingToolbar?: (visible: boolean, position: { top: number; left: number }) => void;
  floatingToolbarVisible?: boolean;
  renderImage?: (source: string) => React.ReactNode;
  onImageFile?: (file: Blob) => Promise<string | null>;
  onMediaDialog?: (kind: MediaKind, source: string | null, insert: (code: string) => boolean) => void;
  onImageDialog?: (source: string | null, insert: (path: string, alt: string, fullMarkdown?: string) => boolean) => void;
  onDocLinkDialog?: (
    position: { top: number; left: number },
    insert: (targetUrl: string, displayTitle: string) => boolean,
    initialSelectedText?: string
  ) => void;
  onFormulaDialog?: (apply: (formula: string) => boolean | void, initialLatex?: string) => void;
  currentFilePath?: string;
  onFileOpen?: (filePath: string, heading?: string) => void;
  onSourceAction?: (id: string, source: string, from: number, to: number) => void;
  onToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onStyleSettings?: () => void;
  onReferenceSettings?: () => void;
  onCitation?: () => void;
  bibContent?: string;
  showBibliography?: boolean;
};

/**
 * ========================================================================================
 * [컴포넌트명] VisualDocumentEditor - 위지윅(WYSIWYG) 문서 직접 편집기 메인 컴포넌트
 *
 * @param {Props} props - 문서 마크다운 소스, 변경/스크롤/커서 동기화 콜백 및 다이얼로그 핸들러
 * @returns {JSX.Element} 시각 문서 편집기 레이아웃
 * ==========================================================================================
 */
export default function VisualDocumentEditor({
  content,
  onChange,
  readOnly = false,
  headingNumbering = [],
  tabSize = 4,
  spellCheck = false,
  pageStyle,
  onPdfPagePreview,
  onSourceScroll,
  onSourceCursor,
  documentId,
  commandRef,
  aiTargetRef,
  customCommands = {},
  customHotkeys = {},
  onSourceAction,
  onFloatingToolbar,
  floatingToolbarVisible,
  renderImage,
  onImageFile,
  onImageDialog,
  onMediaDialog,
  onDocLinkDialog,
  onFormulaDialog,
  currentFilePath,
  onFileOpen,
  onToast,
  onStyleSettings,
  onReferenceSettings,
  onCitation,
  bibContent = '',
  showBibliography = true,
}: Props) {
  const citationEntries = React.useMemo(() => {
    const parsed = parseBibliography(bibContent);
    return new Map(
      parsed.entries
        .filter(e => !parsed.duplicates.some(k => k.toLowerCase() === e.key.toLowerCase()))
        .map(e => [e.key.toLowerCase(), e])
    );
  }, [bibContent]);
  const bibRef = useRef(citationEntries);
  bibRef.current = citationEntries;
  const citationCallback = useRef(onCitation);
  citationCallback.current = onCitation;
  const pendingCitation = useRef<{ doc: import('prosemirror-model').Node; selection: Selection } | null>(null);
  const openCitation = (removeSlash = false) => {
    const view = viewRef.current;
    if (!view || !view.editable) return;
    if (removeSlash && slashRange.current) {
      const range = slashRange.current;
      view.dispatch(view.state.tr.delete(range.from, range.to));
      slashRange.current = null;
      setSlash(false);
    }
    pendingCitation.current = { doc: view.state.doc, selection: view.state.selection };
    citationCallback.current?.();
  };
  const openCitationRef = useRef(openCitation);
  openCitationRef.current = openCitation;

  useEffect(() => {
    const insert = (event: Event) => {
      const pending = pendingCitation.current;
      const view = viewRef.current;
      if (!pending || !view) return;
      event.preventDefault();
      pendingCitation.current = null;
      if (!view.state.doc.eq(pending.doc) || !view.editable) {
        onToastRef.current?.('문서가 변경되었습니다. 인용을 다시 선택해 주세요.', 'warning');
        return;
      }
      const key = (event as CustomEvent).detail?.key;
      if (typeof key !== 'string' || !key || /[\]\r\n]/.test(key)) return;
      view.dispatch(closeHistory(view.state.tr.setSelection(pending.selection).insertText(`[@${key}]`)).scrollIntoView());
      view.focus();
    };
    window.addEventListener('onrivi:insert-citation', insert);
    const cancel = () => {
      pendingCitation.current = null;
    };
    window.addEventListener('onrivi:cancel-citation', cancel);

    const addBibEntry = (event: Event) => {
      const view = viewRef.current;
      if (!view || !view.editable) return;
      event.preventDefault();
      const text = (event as CustomEvent).detail?.text;
      if (!text) return;

      let tr = view.state.tr;
      let existingPos = -1;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.textContent.trim().includes('참고문헌')) {
          existingPos = pos;
          return false;
        }
      });

      const pNode = visualSchema.nodes.paragraph.create(null, visualSchema.text(text));
      const itemNode = visualSchema.nodes.list_item.create(null, pNode);

      if (existingPos >= 0) {
        let bulletListPos = -1;
        let bulletListNode: any = null;
        view.state.doc.descendants((node, pos) => {
          if (pos > existingPos && node.type.name === 'bullet_list' && bulletListPos === -1) {
            bulletListPos = pos;
            bulletListNode = node;
            return false;
          }
        });

        if (bulletListPos >= 0 && bulletListNode) {
          const insertPos = bulletListPos + bulletListNode.nodeSize - 1;
          tr = tr.insert(insertPos, itemNode);
        } else {
          const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);
          const node = view.state.doc.nodeAt(existingPos);
          const insertPos = existingPos + (node ? node.nodeSize : 0);
          tr = tr.insert(insertPos, listNode);
        }
      } else {
        const headingNode = visualSchema.nodes.heading.create({ level: 2 }, visualSchema.text('참고문헌'));
        const listNode = visualSchema.nodes.bullet_list.create(null, [itemNode]);
        tr = tr.insert(tr.doc.content.size, [headingNode, listNode]);
      }

      view.dispatch(closeHistory(tr).scrollIntoView());
      view.focus();
      if (onToastRef.current) onToastRef.current('참고문헌 목록에 추가되었습니다.', 'success');
    };
    window.addEventListener('onrivi:add-bibliography-entry', addBibEntry);

    return () => {
      window.removeEventListener('onrivi:insert-citation', insert);
      window.removeEventListener('onrivi:cancel-citation', cancel);
      window.removeEventListener('onrivi:add-bibliography-entry', addBibEntry);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view) view.dispatch(view.state.tr.setMeta('onrivi:bibliography', true));
  }, [bibContent]);

  const cursorFrame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(cursorFrame.current), []);
  const cursorCallback = useRef(onSourceCursor);
  cursorCallback.current = onSourceCursor;

  useEffect(() => {
    if (viewRef.current) viewRef.current.dom.dataset.editorTabSize = String(tabSize);
  }, [tabSize]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.setProps({
        attributes: { ...(view.props.attributes as Record<string, string>), spellcheck: String(spellCheck) },
      });
    }
  }, [spellCheck]);

  const host = useRef<HTMLDivElement>(null);
  const scrollCallback = useRef(onSourceScroll);
  scrollCallback.current = onSourceScroll;

  useEffect(() => {
    let frame = 0;
    const sync = (event: Event) => {
      const container = host.current?.closest('.custom-preview-container');
      if (!container || event.target !== container || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const view = viewRef.current;
        const codec = codecRef.current;
        if (!view || !codec || !scrollCallback.current) return;
        const totalLen = codec.serialize(view.state.doc).length;
        if (container.scrollTop <= 5) {
          scrollCallback.current(0);
          return;
        }
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0 && container.scrollTop >= maxScroll - 5) {
          scrollCallback.current(totalLen);
          return;
        }
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const topY = rect.top + 50;
        const point = view.posAtCoords({ left: centerX, top: topY });
        if (point) {
          const position = TextSelection.near(view.state.doc.resolve(point.pos)).head;
          const token = 'ONRIVISCROLLMAP';
          const offset = codec.serialize(view.state.tr.insertText(token, position).doc).indexOf(token);
          if (offset >= 0) {
            scrollCallback.current(offset);
            return;
          }
        }
        const ratio = container.scrollTop / Math.max(1, maxScroll);
        scrollCallback.current(Math.round(totalLen * Math.max(0, Math.min(1, ratio))));
      });
    };
    document.addEventListener('scroll', sync, true);
    return () => {
      document.removeEventListener('scroll', sync, true);
      cancelAnimationFrame(frame);
    };
  }, []);

  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const onStyleSettingsRef = useRef(onStyleSettings);
  onStyleSettingsRef.current = onStyleSettings;
  const onReferenceSettingsRef = useRef(onReferenceSettings);
  onReferenceSettingsRef.current = onReferenceSettings;

  const imageSequence = useRef(0);
  const [imageMounts, setImageMounts] = useState<{ id: number; element: HTMLElement; source: string }[]>([]);
  const viewRef = useRef<EditorView | null>(null);
  const caretRef = useRef<ReturnType<typeof installVisualCaret> | null>(null);
  const onFileOpenRef = useRef(onFileOpen);
  onFileOpenRef.current = onFileOpen;
  const currentFilePathRef = useRef(currentFilePath);
  currentFilePathRef.current = currentFilePath;
  const images = useRef({
    renderImage,
    onImageFile,
    onImageDialog,
    onMediaDialog,
    onDocLinkDialog,
    onFormulaDialog,
  });
  images.current = {
    renderImage,
    onImageFile,
    onImageDialog,
    onMediaDialog,
    onDocLinkDialog,
    onFormulaDialog,
  };
  const imageTargets = useRef(new Set<{ from: number; to: number; source?: string; valid: boolean }>());
  const beginMediaRef = useRef<(kind: MediaKind, source?: string, position?: number) => void>(() => {});
  const beginImageRef = useRef<(source?: string, position?: number, file?: Blob) => void>(() => {});
  const executeDropRef = useRef<(view: EditorView, e: DragEvent) => Promise<boolean>>(() => Promise.resolve(false));
  const updateDropRef = useRef<(view: EditorView, e: DragEvent) => void>(() => {});
  const lastDropTargetRef = useRef<DropTargetInfo | null>(null);
  const lastDispatchedPosRef = useRef<number | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const headingFormatsRef = useRef({ current: headingNumbering, previous: headingNumbering, readOnly });
  headingFormatsRef.current.current = headingNumbering;
  headingFormatsRef.current.readOnly = readOnly;
  const hotkeysRef = useRef(customHotkeys);
  hotkeysRef.current = customHotkeys;
  const emitted = useRef(content);
  const [inTable, setInTable] = useState(false);
  const [tableToolbarDismissed, setTableToolbarDismissed] = useState(false);
  const currentTablePosRef = useRef<number | null>(null);
  const [firstBlockNeedsParagraph, setFirstBlockNeedsParagraph] = useState(false);
  const [tableToolPosition, setTableToolPosition] = useState({ top: 8, left: 8, width: 700 });

  useEffect(() => {
    if (!inTable || readOnly) return;
    const container = host.current?.closest('.custom-preview-container');
    const update = () => {
      const rect = (container || host.current)?.getBoundingClientRect();
      if (rect) {
        setTableToolPosition({
          top: container ? Math.max(8, rect.top + 8) : Math.max(8, window.innerHeight - 90),
          left: Math.max(8, rect.left + 8),
          width: Math.max(240, Math.min(rect.width - 16, window.innerWidth - 24)),
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [inTable, readOnly]);

  const [tableDialog, setTableDialog] = useState(false);
  const tableTargetRef = useRef<{ from: number; to: number; valid: boolean } | null>(null);
  const openTableRef = useRef<() => void>(() => {});
  const [linkDialog, setLinkDialog] = useState(false);
  const [calendarDialog, setCalendarDialog] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });
  const dateTargetRef = useRef<{ from: number; to: number; valid: boolean } | null>(null);
  const openDatePickerRef = useRef<(removeSlash?: boolean) => void>(() => {});
  const [linkDialogData, setLinkDialogData] = useState({ text: '', href: 'https://' });
  const linkTargetRef = useRef<{ from: number; to: number; valid: boolean } | null>(null);
  const linkCommandRef = useRef<Command>(() => false);
  const insertFootnoteRef = useRef<(removeSlash?: boolean) => void>(() => {});
  const applySignatureRef = useRef<(removeSlash?: boolean) => boolean>(() => false);
  const [selection, setSelection] = useState(false);
  const manualFloatingRef = useRef(false);
  const selectionVisibleRef = useRef(false);
  selectionVisibleRef.current = selection;
  const [slash, setSlash] = useState(false);
  const [popup, setPopup] = useState({ top: 0, left: 0 });
  const [notice, setNotice] = useState('');
  const slashRange = useRef<{ from: number; to: number } | null>(null);
  const codecRef = useRef<Codec | null>(null);
  const [query, setQuery] = useState('');
  const [activeMarks, setActiveMarks] = useState<string[]>([]);
  const [tagInfo, setTagInfo] = useState<ActiveTagInfo>({
    innermostTag: 'p',
    innermostLabel: '본문',
    path: [{ tag: 'p', label: '본문' }],
    pathString: 'p',
    labelPathString: '본문',
  });
  const [menuIndex, setMenuIndex] = useState(0);
  const menuIndexRef = useRef(0);
  const slashOpenRef = useRef(false);
  const menuItemsRef = useRef<{ id: string }[]>([]);
  const executeItemRef = useRef<(id: string, removeSlash?: boolean) => void>(() => {});
  slashOpenRef.current = slash;
  const floatingCallbackRef = useRef(onFloatingToolbar);
  floatingCallbackRef.current = onFloatingToolbar;
  const previousFloatingVisible = useRef(floatingToolbarVisible);
  const floatingOriginSelectionRef = useRef<any>(null);

  useEffect(() => {
    if (selection && !readOnly && viewRef.current) {
      floatingOriginSelectionRef.current = viewRef.current.state.selection;
    }
    floatingCallbackRef.current?.(selection && !readOnly, popup);
  }, [selection, readOnly, popup]);
  useEffect(() => () => floatingCallbackRef.current?.(false, { top: 0, left: 0 }), []);
  useEffect(() => {
    if (previousFloatingVisible.current && !floatingToolbarVisible && onFloatingToolbar) {
      manualFloatingRef.current = false;
      setSelection(false);
    }
    previousFloatingVisible.current = floatingToolbarVisible;
  }, [floatingToolbarVisible, onFloatingToolbar]);
  useEffect(() => {
    document.querySelector('#visual-slash-menu [data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [menuIndex]);

  const {
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
  } = useVisualEditorInsertActions({
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
    floatingOriginSelectionRef,
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
    imagesRef: images,
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
  });

  useLayoutEffect(() => {
    if (!host.current) return;
    const hostEl = host.current;
    const pendingImages = imageTargets.current;
    const cached = documentId ? sessions.get(documentId) : undefined;
    let codec = cached?.source === content ? cached.codec : createVisualDocumentCodec(content);
    codecRef.current = codec;
    setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(codec.doc.firstChild?.type.name || ''));
    emitted.current = content;
    hostEl.style.position = 'relative';

    const dragDropController = installVisualDragDropController({
      hostEl,
      viewRef,
      imagesRef: images,
      lastDropTargetRef,
      lastDispatchedPosRef,
      setNotice,
      onToastRef,
    });
    updateDropRef.current = dragDropController.updateDropIndicator;
    executeDropRef.current = dragDropController.executeDropImageInsertion;

    const proseMirrorHandlers = createVisualEditorHandlers({
      viewRef,
      caretRef,
      codecRef,
      imagesRef: images,
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
      clearCommand: clear,
      runCommand: run,
      setMenuIndex,
      setPopup,
      setSlash,
      setSelection,
      setQuery,
      setTableToolbarDismissed,
      clearDropIndicator: dragDropController.clearDropIndicator,
      updateDropIndicator: dragDropController.updateDropIndicator,
      executeDropImageInsertion: dragDropController.executeDropImageInsertion,
    });

    const aiTargets = new VisualAITargets();
    const view = new EditorView(hostEl, {
      decorations(state) {
        const entries = bibRef.current;
        const decorations: Decoration[] = [...aiTargets.decorations()];
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && hasHeadingNumber(node.textContent)) {
            decorations.push(Decoration.node(pos, pos + node.nodeSize, { 'data-onrivi-heading-numbered': 'true' }));
          }
          if (
            !node.isText ||
            node.marks.some(m => m.type.name === 'code') ||
            state.doc.resolve(pos).parent.type.name === 'code_block'
          ) {
            return;
          }
          for (const match of Array.from((node.text || '').matchAll(citationPattern))) {
            const key = match[1] || match[2];
            const entry = entries.get(key.toLowerCase());
            decorations.push(
              Decoration.inline(pos + match.index!, pos + match.index! + match[0].length, {
                class: entry ? 'visual-citation' : 'visual-citation-missing',
                title: entry ? citationLabel(entry) + ': ' + entry.title : '등록된 문헌 없음: ' + key,
              })
            );
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
      state:
        cached?.source === content
          ? cached.state
          : EditorState.create({
              doc: codec.doc,
              plugins: [
                history(),
                visualMarkdownInputRules(),
                createFootnoteHeaderPlugin(),
                createVisualEditorKeymap({
                  clearCommand: clear,
                  linkCommandRef,
                  insertFootnoteRef,
                  applySignatureRef,
                }),
                keymap(baseKeymap),
              ],
            }),
      editable: () => !readOnly,
      attributes: {
        spellcheck: String(spellCheck),
        class: 'visual-document-surface',
        'aria-label': '문서 직접 편집',
        role: 'textbox',
        'aria-multiline': 'true',
        'data-editor-tab-size': String(tabSize),
      },
      nodeViews: createVisualNodeViews({
        viewRef,
        imagesRef: images,
        beginImageRef,
        beginMediaRef,
        imageSequence,
        setImageMounts,
        setNotice,
      }),
      handleScrollToSelection(currentView) {
        const viewport = hostEl.closest('.custom-preview-container') as HTMLElement | null;
        if (!viewport || !currentView.state.selection.empty) return false;
        try {
          const bounds = viewport.getBoundingClientRect();
          const caret = currentView.coordsAtPos(currentView.state.selection.head);
          return (
            caret.top >= Math.max(0, bounds.top) + 4 &&
            caret.bottom <= Math.min(window.innerHeight, bounds.bottom) - 4 &&
            caret.left >= bounds.left &&
            caret.right <= bounds.right
          );
        } catch {
          return false;
        }
      },
      dispatchTransaction(transaction) {
        removeEmptySignatureBlocks(transaction);
        removeOrphanFootnotes(transaction);
        const formats = headingFormatsRef.current;
        if (
          !formats.readOnly &&
          !view.composing &&
          (transaction.docChanged || transaction.getMeta('onrivi:heading-numbering'))
        ) {
          numberHeadingTransaction(transaction, formats.current, formats.previous);
          formats.previous = formats.current;
        }
        aiTargets.map(transaction);
        imageTargets.current.forEach(target => {
          const from = transaction.mapping.mapResult(target.from, 1);
          const to = transaction.mapping.mapResult(target.to, -1);
          if (target.source && (from.deleted || to.deleted)) target.valid = false;
          target.from = from.pos;
          target.to = Math.max(from.pos, to.pos);
        });
        const viewport = hostEl.closest('.custom-preview-container') as HTMLElement | null;
        const topBefore = viewport?.scrollTop;
        const leftBefore = viewport?.scrollLeft;
        const preserveViewport = transaction.getMeta('onrivi:preserve-viewport') === true;
        view.updateState(view.state.apply(transaction));
        if (transaction.docChanged) {
          setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || ''));
        }
        if (preserveViewport && viewport && topBefore !== undefined) {
          viewport.scrollTop = topBefore;
          viewport.scrollLeft = leftBefore || 0;
        }
        if (transaction.getMeta('onrivi:focus-code-block')) {
          requestAnimationFrame(() => {
            try {
              const { $from } = view.state.selection;
              let targetPos = $from.pos;
              for (let d = $from.depth; d >= 0; d--) {
                if ($from.node(d).type === visualSchema.nodes.code_block) {
                  targetPos = $from.start(d);
                  break;
                }
              }
              const dom = view.domAtPos(targetPos);
              const codeBlockEl =
                dom.node instanceof Element
                  ? dom.node.closest('.visual-code-block')
                  : dom.node.parentElement?.closest('.visual-code-block');
              const input = codeBlockEl?.querySelector<HTMLInputElement>('.visual-code-language input');
              if (input) {
                input.focus();
                input.select();
              }
            } catch (err) {
              logWarn({
                file: 'frontend/src/components/VisualDocumentEditor.tsx',
                func: 'dispatchTransaction',
                doing: '코드 블록 생성 직후 언어 입력창 자동 포커스 중',
                target: 'visual-code-language input',
                error: err,
              });
            }
          });
        }
        caretRef.current?.schedule();
        if (transaction.selectionSet && !transaction.docChanged && view.hasFocus() && !view.composing && cursorCallback.current) {
          try {
            const token = 'ONRIVICURSORMAP';
            const marker = view.state.tr.insertText(token, view.state.selection.head);
            const offset = codecRef.current?.serialize(marker.doc).indexOf(token);
            if (offset !== undefined && offset >= 0) cursorCallback.current(offset, true);
          } catch {}
        }
        const tblCtx = tableContext(view.state);
        const currentInTable = Boolean(tblCtx);
        const tablePos = tblCtx ? tblCtx.pos : null;
        if (tablePos !== currentTablePosRef.current) {
          currentTablePosRef.current = tablePos;
          setTableToolbarDismissed(false);
        }
        setInTable(currentInTable);
        const { from, to, $from, empty } = view.state.selection;
        setSelection(manualFloatingRef.current);
        const markNames = ['strong', 'em', 'code', 'link', 'strike', 'underline'];
        const currentMarks = markNames.filter(name =>
          empty
            ? (view.state.storedMarks ?? $from.marks()).some(mark => mark.type.name === name)
            : view.state.doc.rangeHasMark(from, to, visualSchema.marks[name])
        );
        setActiveMarks(previous => (previous.join(',') === currentMarks.join(',') ? previous : currentMarks));
        const nextTagInfo = getActiveTagInfo(view.state);
        setTagInfo(previous =>
          previous.pathString === nextTagInfo.pathString &&
          previous.innermostTag === nextTagInfo.innermostTag &&
          previous.innermostLabel === nextTagInfo.innermostLabel
            ? previous
            : nextTagInfo
        );
        try {
          window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: nextTagInfo }));
        } catch {}
        const isTextblock = $from.parent.isTextblock && $from.parent.type !== visualSchema.nodes.code_block;
        const before = isTextblock
          ? $from.parent.textBetween(Math.max(0, $from.parentOffset - 100), $from.parentOffset, '\n', '\n')
          : '';
        const match = before.match(slashPattern);
        if (empty && match) {
          const after = isTextblock
            ? $from.parent.textBetween($from.parentOffset, Math.min($from.parent.content.size, $from.parentOffset + 50), '\n', '\n')
            : '';
          const afterMatch = after.match(/^[\p{L}\p{N}_-]+/u);
          const trailingLen = afterMatch ? afterMatch[0].length : 0;
          slashRange.current = { from: from - match[1].length, to: to + trailingLen };
          setSlash(true);
          const leadingQuery = match[1].slice(1).toLowerCase();
          const trailingQuery = afterMatch ? afterMatch[0].toLowerCase() : '';
          const fullQuery = (leadingQuery + trailingQuery).trim();
          setQuery(fullQuery || leadingQuery);
        } else {
          slashRange.current = null;
          setSlash(false);
          setQuery('');
        }
        menuIndexRef.current = 0;
        setMenuIndex(0);
        if (!empty || slashRange.current) {
          const rect = view.coordsAtPos(from);
          const spaceBelow = window.innerHeight - rect.bottom;
          const top = empty
            ? spaceBelow < 260 && rect.top > 260
              ? Math.max(8, rect.top - 240)
              : Math.max(8, Math.min(window.innerHeight - 150, rect.bottom + 6))
            : Math.max(8, Math.min(window.innerHeight - 150, rect.top - 48));
          setPopup({ top, left: Math.max(8, Math.min(window.innerWidth - 360, rect.left)) });
        }
        if (transaction.docChanged) {
          const next = codec.serialize(view.state.doc);
          emitted.current = next;
          callback.current(next);
          if (cursorCallback.current && !preserveViewport) {
            cancelAnimationFrame(cursorFrame.current);
            cursorFrame.current = requestAnimationFrame(() => {
              if (viewRef.current !== view || !view.hasFocus() || view.composing) return;
              try {
                const token = 'ONRIVICURSORMAP';
                const offset = codec.serialize(view.state.tr.insertText(token, view.state.selection.head).doc).indexOf(token);
                if (offset >= 0) cursorCallback.current?.(offset, false);
              } catch {}
            });
          }
        }
      },
      ...proseMirrorHandlers,
    });

    viewRef.current = view;
    try {
      const initialTagInfo = getActiveTagInfo(view.state);
      setTagInfo(initialTagInfo);
      window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: initialTagInfo }));
    } catch {}
    if (aiTargetRef) {
      aiTargetRef.current = scope => {
        synchronizeTextSelection(view);
        return aiTargets.capture(view, documentId || '', scope);
      };
    }
    (hostEl as SearchEditorHost).onriviSearchView = view;
    hostEl.setAttribute('data-onrivi-search-editor', '');
    caretRef.current = installVisualCaret(view);

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!view.editable || event.defaultPrevented || event.isComposing) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl === view.dom ||
          view.dom.contains(activeEl) ||
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }
      if (view.state.selection instanceof NodeSelection && ATOM_BLOCK_TYPES.has(view.state.selection.node.type.name)) {
        const isModEnter = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
        const isEnterOrDown =
          !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === 'ArrowDown');
        if (isModEnter || isEnterOrDown) {
          if (exitMediaBlock(true)(view.state, view.dispatch, view)) {
            event.preventDefault();
            event.stopPropagation();
            caretRef.current?.schedule();
          }
        }
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);

    const cleanupTableResize = installVisualTableResizeController(hostEl, view, readOnly);
    const scrollContainer = hostEl.closest('.custom-preview-container') as HTMLElement | null;
    if (scrollContainer && !hostEl.closest('[data-book-text]')) {
      scrollContainer.scrollTop = cached?.source === content ? cached.scrollTop || 0 : 0;
      scrollContainer.scrollLeft = cached?.source === content ? cached.scrollLeft || 0 : 0;
    }

    (view as EditorView & { replaceSource?: (source: string) => void }).replaceSource = source => {
      aiTargets.clear();
      imageTargets.current.forEach(target => {
        target.valid = false;
      });
      const top = scrollContainer?.scrollTop;
      const left = scrollContainer?.scrollLeft;
      const nextCodec = createVisualDocumentCodec(source);
      const oldDoc = view.state.doc;
      if (oldDoc.content.eq(nextCodec.doc.content)) {
        const mapped = new Map<import('prosemirror-model').Node, string>();
        oldDoc.forEach((node, _offset, index) => {
          const raw = nextCodec.originalSource(nextCodec.doc.child(index));
          if (raw !== undefined) mapped.set(node, raw);
        });
        nextCodec.adopt({ doc: oldDoc, originalSource: node => mapped.get(node) });
        if (oldDoc.attrs.frontmatter !== nextCodec.doc.attrs.frontmatter) {
          view.updateState(
            view.state.apply(
              view.state.tr.setDocAttribute('frontmatter', nextCodec.doc.attrs.frontmatter).setMeta('addToHistory', false)
            )
          );
        }
      } else {
        const from = oldDoc.content.findDiffStart(nextCodec.doc.content);
        const end = oldDoc.content.findDiffEnd(nextCodec.doc.content);
        let tr = view.state.tr;
        if (from !== null && end) {
          const overlap = from - Math.min(end.a, end.b);
          const oldEnd = end.a + Math.max(0, overlap);
          const newEnd = end.b + Math.max(0, overlap);
          tr = tr.replace(from, oldEnd, nextCodec.doc.slice(from, newEnd));
        }
        tr = tr.setDocAttribute('frontmatter', nextCodec.doc.attrs.frontmatter).setMeta('addToHistory', false);
        view.updateState(view.state.apply(tr));
        const preserved = new Map<import('prosemirror-model').Node, string>();
        view.state.doc.forEach((node, _offset, index) => {
          const matching = nextCodec.doc.maybeChild(index);
          if (matching?.eq(node)) {
            const raw = nextCodec.originalSource(matching);
            if (raw !== undefined) preserved.set(node, raw);
          }
        });
        nextCodec.adopt({ doc: view.state.doc, originalSource: node => preserved.get(node) });
      }
      codec = nextCodec;
      codecRef.current = codec;
      emitted.current = source;
      setFirstBlockNeedsParagraph(FIRST_BLOCK_INSERT_TYPES.has(view.state.doc.firstChild?.type.name || ''));
      if (scrollContainer && top !== undefined) {
        scrollContainer.scrollTop = top;
        scrollContainer.scrollLeft = left || 0;
      }
      const initTblCtx = tableContext(view.state);
      const currentInTable = Boolean(initTblCtx);
      currentTablePosRef.current = initTblCtx ? initTblCtx.pos : null;
      setTableToolbarDismissed(false);
      setInTable(currentInTable);
      setActiveMarks(view.state.selection.$from.marks().map(mark => mark.type.name));
      const nextInitTagInfo = getActiveTagInfo(view.state);
      setTagInfo(nextInitTagInfo);
      try {
        window.dispatchEvent(new CustomEvent('onrivi:active-tag', { detail: nextInitTagInfo }));
      } catch {}
      caretRef.current?.schedule();
      setSlash(false);
    };

    return () => {
      aiTargets.clear();
      if (aiTargetRef) aiTargetRef.current = null;
      window.removeEventListener('keydown', handleWindowKeyDown);
      cleanupTableResize();
      dragDropController.destroy();
      if (documentId) {
        sessions.set(documentId, {
          source: emitted.current,
          state: view.state,
          codec,
          scrollTop: scrollContainer?.scrollTop,
          scrollLeft: scrollContainer?.scrollLeft,
        });
        if (sessions.size > 20) sessions.delete(sessions.keys().next().value!);
      }
      pendingImages.forEach(target => {
        target.valid = false;
      });
      pendingImages.clear();
      caretRef.current?.destroy();
      caretRef.current = null;
      delete (hostEl as SearchEditorHost).onriviSearchView;
      hostEl.removeAttribute('data-onrivi-search-editor');
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current as (EditorView & { replaceSource?: (source: string) => void }) | null;
    if (view && content !== emitted.current && !view.hasFocus()) view.replaceSource?.(content);
  }, [content]);

  const headingNumberingKey = JSON.stringify(headingNumbering);
  useEffect(() => {
    const view = viewRef.current;
    if (view && !readOnly && !view.composing) {
      view.dispatch(view.state.tr.setMeta('onrivi:heading-numbering', true).setMeta('addToHistory', false));
    }
  }, [headingNumberingKey, content, readOnly]);

  useEffect(() => {
    if (readOnly || viewRef.current?.hasFocus()) return;
    const normalized = bulletNumbersAsText(normalizeVisualMarkdownSpacing(content));
    if (normalized !== content) {
      emitted.current = normalized;
      callback.current(normalized);
    }
  }, [content, readOnly]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const offset = detail?.offset;
      const view = viewRef.current;
      const codec = codecRef.current;
      if (!view || !codec || typeof offset !== 'number' || (!detail?.force && view.hasFocus())) return;
      const token = 'ONRIVICURSORMAP';
      let low = 0;
      let high = view.state.doc.content.size;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const selection = TextSelection.near(view.state.doc.resolve(mid));
        const pos = selection.head;
        const marked = codec.serialize(view.state.tr.insertText(token, pos).doc);
        const index = marked.indexOf(token);
        if (index < 0) break;
        best = pos;
        if (index === offset) break;
        if (index < offset) low = mid + 1;
        else high = mid - 1;
      }
      let targetSelection: Selection = TextSelection.near(view.state.doc.resolve(best));
      const term = detail?.term;
      if (term && typeof term === 'string' && term.trim()) {
        const docText = view.state.doc.textBetween(
          Math.max(0, best - 20),
          Math.min(view.state.doc.content.size, best + term.length + 50)
        );
        const relIdx = docText.toLowerCase().indexOf(term.toLowerCase());
        if (relIdx !== -1) {
          const actualFrom = Math.max(0, best - 20) + relIdx;
          targetSelection = TextSelection.create(view.state.doc, actualFrom, actualFrom + term.length);
        }
      }
      view.dispatch(view.state.tr.setSelection(targetSelection).scrollIntoView());
      caretRef.current?.schedule();
      if (detail?.highlight) {
        try {
          const domPos = view.domAtPos(best);
          const node = domPos.node instanceof HTMLElement ? domPos.node : domPos.node.parentElement;
          const block = node?.closest('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure') as HTMLElement | null;
          if (block) {
            block.classList.remove('preview-highlight-line');
            void block.offsetWidth;
            block.classList.add('preview-highlight-line');
            setTimeout(() => block.classList.remove('preview-highlight-line'), 3000);
          }
        } catch (err) {
          logWarn({
            file: 'frontend/src/components/VisualDocumentEditor.tsx',
            func: 'onrivi:source-cursor',
            doing: '소스 커서 동기화 위치 하이라이트 클래스 부여 중',
            target: `pos:${best}`,
            error: err,
          });
        }
      }
    };
    window.addEventListener('onrivi:source-cursor', sync);
    return () => window.removeEventListener('onrivi:source-cursor', sync);
  }, []);

  useEffect(() => {
    viewRef.current?.setProps({ editable: () => !readOnly });
    caretRef.current?.schedule();
  }, [readOnly]);

  const [pageGuides, setPageGuides] = useState(false);
  const [pdfPageHtml, setPdfPageHtml] = useState('');
  const [pdfPageBusy, setPdfPageBusy] = useState(false);
  const [pdfPageError, setPdfPageError] = useState('');
  const previewRequest = useRef(onPdfPagePreview);
  previewRequest.current = onPdfPagePreview;
  const pageStyleKey = JSON.stringify(pageStyle);
  const pageStyleRef = useRef(pageStyle);
  pageStyleRef.current = pageStyle;

  const togglePdfBreak = (anchor: PrintBreakAnchor, existingId?: string) => {
    if (readOnly) return;
    const current = readPaginationSettings(content);
    const breaks = existingId
      ? current.breaks.filter(item => item.id !== existingId)
      : current.breaks.some(item => item.id === anchor.id)
        ? current.breaks
        : [...current.breaks, anchor];
    onChange(writePaginationSettings(content, { version: 1, breaks }));
  };

  const closePdfPages = () => {
    pageStorage.setItem('onrivi_tabs_page_guides', 'false');
    window.dispatchEvent(new CustomEvent('onrivi:toggle-page-guides', { detail: false }));
  };

  useEffect(() => {
    if (!pageGuides || !pageStyleRef.current || !previewRequest.current) return;
    const controller = new AbortController();
    setPdfPageBusy(true);
    setPdfPageError('');
    const timer = setTimeout(() => {
      void previewRequest
        .current?.(controller.signal)
        .then(html => {
          if (controller.signal.aborted) return;
          if (!html || !html.includes('data-onrivi-pages=')) throw new Error('PDF 페이지를 계산하지 못했습니다.');
          setPdfPageHtml(html);
        })
        .catch(error => {
          if (!controller.signal.aborted) {
            logWarn({
              file: 'frontend/src/components/VisualDocumentEditor.tsx',
              func: 'onPdfPagePreview',
              doing: 'PDF 페이지 분할 미리보기 HTML 계산 중',
              target: documentId || 'current_document',
              error,
            });
            setPdfPageError(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setPdfPageBusy(false);
        });
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pageGuides, pageStyleKey, content, documentId]);

  useEffect(() => {
    setPageGuides(pageStorage.getItem('onrivi_tabs_page_guides') === 'true');
    const handleToggle = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setPageGuides(e.detail);
      } else {
        setPageGuides(v => !v);
      }
    };
    window.addEventListener('onrivi:toggle-page-guides', handleToggle);
    return () => window.removeEventListener('onrivi:toggle-page-guides', handleToggle);
  }, []);

  const button = (label: string, command: Command, removeSlash = false) => (
    <button
      key={label}
      type="button"
      disabled={readOnly}
      onMouseDown={event => event.preventDefault()}
      onClick={() => run(command, removeSlash)}
      className="rounded px-3 py-2 text-sm hover:bg-blue-50 disabled:opacity-40"
    >
      {label}
    </button>
  );

  const catalog = visualCommandCatalog(customCommands);
  const filtered = filterVisualCommands(catalog, query);
  menuItemsRef.current = filtered;

  const itemButton = (id: string, label: string, removeSlash = false) => (
    <button
      key={id}
      type="button"
      tabIndex={0}
      aria-label={id === 'inlineCode' ? 'inlinecode' : id}
      disabled={readOnly}
      onMouseDown={event => {
        event.preventDefault();
        executeItem(id, removeSlash);
      }}
      onClick={() => {
        executeItem(id, removeSlash);
      }}
      className={`rounded px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
        activeMarks.includes(
          (
            {
              bold: 'strong',
              italic: 'em',
              inlineCode: 'code',
              link: 'link',
              strikethrough: 'strike',
              underline: 'underline',
            } as Record<string, string>
          )[id]
        )
          ? 'bg-blue-100 ring-1 ring-blue-400 font-bold text-blue-700'
          : ''
      }`}
      aria-pressed={
        ['bold', 'italic', 'inlineCode', 'link', 'strikethrough', 'underline'].includes(id)
          ? activeMarks.includes(
              (
                {
                  bold: 'strong',
                  italic: 'em',
                  inlineCode: 'code',
                  link: 'link',
                  strikethrough: 'strike',
                  underline: 'underline',
                } as Record<string, string>
              )[id]
            )
          : undefined
      }
    >
      {label}
    </button>
  );

  return (
    <section
      style={{ tabSize }}
      className="visual-document-editor relative"
      aria-label="기본 직접 편집기"
      onClick={event => event.stopPropagation()}
      onDragOver={event => {
        const types = event.dataTransfer?.types;
        if (types && Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
          event.preventDefault();
          event.stopPropagation();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
          if (viewRef.current && viewRef.current.editable) {
            updateDropRef.current(viewRef.current, event.nativeEvent);
          }
        }
      }}
      onDragEnter={event => {
        const types = event.dataTransfer?.types;
        if (types && Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
          event.preventDefault();
          event.stopPropagation();
          if (viewRef.current && viewRef.current.editable) {
            updateDropRef.current(viewRef.current, event.nativeEvent);
          }
        }
      }}
      onDrop={event => {
        event.preventDefault();
        event.stopPropagation();
        if (viewRef.current && viewRef.current.editable) {
          void executeDropRef.current(viewRef.current, event.nativeEvent);
        }
      }}
    >
      <VisualEditorToolbar
        itemButton={itemButton}
        button={button}
        undo={undo}
        redo={redo}
        blockCommands={blockCommands}
        run={run}
        activeMarks={activeMarks}
        tagInfo={tagInfo}
        inTable={inTable}
        pageGuides={pageGuides}
        readOnly={readOnly}
        tableToolbarDismissed={tableToolbarDismissed}
        setTableToolbarDismissed={setTableToolbarDismissed}
        tableToolPosition={tableToolPosition}
        firstBlockNeedsParagraph={firstBlockNeedsParagraph}
        viewRef={viewRef}
        codecRef={codecRef}
        insertParagraphBeforeFirstBlock={insertParagraphBeforeFirstBlock}
        setNotice={setNotice}
      />
      <TableModal
        nextNumber={nextReportNumber(content, '표')}
        isOpen={tableDialog}
        isDarkMode={false}
        onClose={() => {
          setTableDialog(false);
          if (tableTargetRef.current) imageTargets.current.delete(tableTargetRef.current);
          tableTargetRef.current = null;
        }}
        onInsert={source => {
          const view = viewRef.current;
          const target = tableTargetRef.current;
          if (!view || !target?.valid || !view.editable || !codecRef.current) {
            setNotice('문서나 삽입 위치가 변경되었습니다.');
            return;
          }
          const parsed = createVisualDocumentCodec(source);
          const table = Array.from({ length: parsed.doc.childCount }, (_, index) => parsed.doc.child(index)).find(
            node => node.type === visualSchema.nodes.table
          );
          if (table?.type !== visualSchema.nodes.table) return;
          codecRef.current.adopt(parsed);
          imageTargets.current.delete(target);
          let tr = view.state.tr
            .setSelection(TextSelection.between(view.state.doc.resolve(target.from), view.state.doc.resolve(target.to)))
            .replaceSelection(new Slice(parsed.doc.content, 0, 0));
          let first = 0;
          let tablePos = -1;
          tr.doc.descendants((node, pos) => {
            if (node === table) {
              tablePos = pos;
              first = pos + 4;
              return false;
            }
            return true;
          });
          if (tablePos >= 0) tr = tr.insert(tablePos + table.nodeSize, visualSchema.nodes.paragraph.create());
          const headerTextLength = table.firstChild!.firstChild!.firstChild!.content.size;
          tr = tr.setSelection(TextSelection.create(tr.doc, first, first + headerTextLength));
          view.dispatch(closeHistory(tr).scrollIntoView());
          view.focus();
        }}
      />
      <LinkModal
        isOpen={linkDialog}
        onClose={() => {
          setLinkDialog(false);
          linkTargetRef.current = null;
        }}
        onConfirm={handleLinkConfirm}
        onUnlink={handleLinkUnlink}
        initialText={linkDialogData.text}
        initialHref={linkDialogData.href}
        isDarkMode={false}
      />
      <CalendarModal
        isOpen={calendarDialog}
        onClose={() => setCalendarDialog(false)}
        onInsert={formattedDate => {
          const view = viewRef.current;
          if (!view || !view.editable) return;
          view.dispatch(view.state.tr.insertText(formattedDate).scrollIntoView());
          view.focus();
        }}
        isDarkMode={false}
      />
      <DateTimeInsertPicker
        isOpen={datePickerOpen}
        position={datePickerPos}
        onClose={() => {
          setDatePickerOpen(false);
          dateTargetRef.current = null;
        }}
        onInsert={handleDateInsert}
        isDarkMode={false}
      />
      {notice && (
        <div role="status" className="flex justify-between bg-amber-50 px-4 py-2 text-sm text-amber-900" data-editor-controls>
          {notice}
          <button type="button" onClick={() => setNotice('')}>
            닫기
          </button>
        </div>
      )}
      <VisualSlashMenu
        slash={slash}
        readOnly={readOnly}
        popup={popup}
        filtered={filtered}
        menuIndex={menuIndex}
        executeItem={executeItem}
        selection={selection}
        onFloatingToolbar={onFloatingToolbar}
        itemButton={itemButton}
        setSelection={setSelection}
        manualFloatingRef={manualFloatingRef}
        viewRef={viewRef}
      />
      <div className="relative">
        {!pageGuides &&
          !readOnly &&
          firstBlockNeedsParagraph &&
          !(inTable && viewRef.current?.state.doc.firstChild?.type === visualSchema.nodes.table) && (
            <button
              type="button"
              data-editor-controls
              className="ml-7 mb-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-zinc-900 dark:text-blue-300"
              onMouseDown={event => event.preventDefault()}
              onClick={insertParagraphBeforeFirstBlock}
              aria-label="첫 블록 앞에 문단 추가"
            >
              + 첫 블록 앞에 문단 추가
            </button>
          )}
        <div
          ref={host}
          data-onrivi-editor-host
          style={pageGuides ? { position: 'absolute', opacity: 0, pointerEvents: 'none', width: '100%' } : undefined}
        />
        {pageGuides && (
          <div className="onrivi-pdf-page-preview flex flex-col gap-2" data-editor-controls>
            <p className="text-xs text-slate-600 dark:text-zinc-300">
              PDF 출력 기준 페이지입니다. +로 출력용 페이지 나누기를 지정하고, 본문 편집은 상태 표시줄의 페이지 보기 버튼을 다시 눌러 진행하세요.
            </p>
            {pdfPageBusy && (
              <p role="status" className="text-xs text-blue-600">
                PDF 페이지 계산 중...
              </p>
            )}
            {pdfPageError && (
              <p role="alert" className="text-xs text-red-600">
                PDF 페이지를 표시하지 못했습니다: {pdfPageError}
              </p>
            )}
            {pdfPageHtml && !pdfPageError && (
              <div style={{ height: 'min(80vh, 900px)', display: 'flex' }}>
                <PrintPaginationPreview
                  html={pdfPageHtml}
                  editing={!readOnly}
                  busy={pdfPageBusy}
                  onToggle={togglePdfBreak}
                  onEscape={closePdfPages}
                  onTableResizeStart={closePdfPages}
                />
              </div>
            )}
          </div>
        )}
      </div>
      {showBibliography && (
        <BibliographySummary
          source={content}
          content={bibContent}
          onDeleteCitation={deleteCitationFromDoc}
          onDeleteAll={deleteAllCitationsFromDoc}
        />
      )}
      {imageMounts.map(item =>
        createPortal(renderImage?.(item.source) || <VisualReadOnlyMarkdownBlock source={item.source} />, item.element, String(item.id))
      )}
      <style>{VISUAL_EDITOR_STYLES}</style>
    </section>
  );
}
