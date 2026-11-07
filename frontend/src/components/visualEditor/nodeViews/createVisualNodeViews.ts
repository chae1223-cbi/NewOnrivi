// ====================================================================
// 🧩 [OMD-CORE-VisualNodeViews-0001] createVisualNodeViews.ts ➔ 시각 에디터 ProseMirror NodeViews 팩토리
// 🎯 @KICK  : table, visual_math, visual_inline_math, list_item, code_block, visual_footnote_ref, visual_footnote_def, visual_checkbox, source_block, mediaNodeView 10대 위지윅 NodeView 인스턴스화
// 🛡️ @GUARD : Rule 3(역할 기반 분리: Core View) 준수 - DOM 렌더링 및 인터랙션 격리
// 🚨 @PATCH : 2026-11-07 — [인라인 및 문단 내 마크다운 image 노드뷰 등록]: ProseMirror 표준 image 노드에 대한 NodeView(inlineImageNodeView)를 등록하여 React Portal(renderImage/AsyncImage)과 연동, 구글 드라이브(driveId) 및 로컬 미디어가 깨진 이미지 아이콘 대신 온전한 이미지로 렌더링되도록 구현
// 🚨 @PATCH : 2026-11-07 — [HTML 표(<table>...</table>) 시각 렌더링 및 실시간 원문 편집 드로어 연동]: source_block에서 HTML <table> 감지 시 visual-html-table-container 및 접이식 'HTML 표 원문 편집' 드로어와 상단 '✏️ HTML 편집' 빠른 버튼을 제공하여 시각적 표 렌더링과 실시간 원문 수정을 동시에 지원
// 🚨 @PATCH : 2026-11-07 — [코드블록 순수 문구 복사 및 마크다운 형태 복사 이원화]: '복사'(순수 텍스트)와 '형태 복사'(```lang\n...\n``` 마크다운 펜스 형태 포함) 버튼을 분리 제공
// 🚨 @PATCH : 2026-11-07 — [코드블록 마우스 드래그 전체선택 및 형태 유지 복사]: code_block의 복사 버튼 클릭 시 마크다운 코드블록(```lang\n...\n```) 형태로 클립보드에 기록하고, pre 여백 클릭 시 mousedown에서 드래그를 가로채지 않고 click 이벤트에서 드래그 판별 후 안전 전이하도록 개선
// 🚨 @PATCH : 2026-11-07 — [코드블록 마우스 드래그 및 여백 클릭 커서 안정화]: code_block의 pre 패딩 영역 클릭 시 내부 code 텍스트로 안전 전이
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 3단계 모듈화 분리]: 10대 핵심 위지윅 NodeView 팩토리 독립 분리
// 🔗 @CALLS : prosemirror-view, prosemirror-state, prosemirror-history, visualSchema, katex
// ====================================================================
// @ts-nocheck
import type { EditorProps, EditorView } from 'prosemirror-view';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { closeHistory } from 'prosemirror-history';
import { visualSchema } from '@/lib/visualDocumentCodec';
import { validColumnRatios, equalColumnRatios } from '@/lib/tableColumnRatios';
import { copyImageToClipboard, copyMediaSource } from '@/lib/mediaMarkup';
import katex from 'katex';

export interface CreateVisualNodeViewsOptions {
  viewRef: React.MutableRefObject<EditorView | null>;
  imagesRef: React.MutableRefObject<any>;
  beginImageRef: React.MutableRefObject<(source?: string, position?: number) => void>;
  beginMediaRef: React.MutableRefObject<(kind: any, source?: string, position?: number) => void>;
  imageSequence: React.MutableRefObject<number>;
  setImageMounts: React.Dispatch<React.SetStateAction<any[]>>;
  setNotice: (msg: string) => void;
}

export function createVisualNodeViews(options: CreateVisualNodeViewsOptions): NonNullable<EditorProps['nodeViews']> {
  const {
    viewRef,
    imagesRef,
    beginImageRef,
    beginMediaRef,
    imageSequence,
    setImageMounts,
    setNotice,
  } = options;

  // 🖼️ 이미지 및 비디오/지도 미디어 노드뷰
  const mediaNodeView: NonNullable<EditorProps['nodeViews']>[string] = (node, _view, getPos) => {
    const dom = document.createElement('figure');
    dom.contentEditable = 'false';
    dom.className = 'visual-image-block visual-media-block';
    const picture = document.createElement('div'), button = document.createElement('button');
    button.type = 'button';
    button.textContent = '편집';
    button.className = 'visual-image-edit onrivi-media-control';
    button.setAttribute('aria-label', (node.type.name === 'visual_image' ? '이미지' : node.attrs.kind === 'map' ? '지도' : '동영상') + ' 편집');
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const position = getPos();
      const currentView = viewRef.current;
      if (currentView?.editable && typeof position === 'number') {
        if (node.type.name === 'visual_image') beginImageRef.current(node.attrs.source, position);
        else beginMediaRef.current(node.attrs.kind, node.attrs.source, position);
      }
    });
    const isImage = node.type.name === 'visual_image';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '복사';
    copy.className = 'visual-media-copy onrivi-media-control';
    copy.setAttribute('aria-label', isImage ? '이미지 복사' : '미디어 참조 복사');
    copy.title = isImage ? '이미지 복사' : '다른 문서에 붙여넣을 수 있는 미디어 참조 복사';
    copy.addEventListener('mousedown', event => event.preventDefault());
    copy.addEventListener('click', event => {
      event.stopPropagation();
      if (isImage) {
        void copyImageToClipboard(node.attrs.source)
          .then((ok) => setNotice(ok ? '이미지를 클립보드에 복사했습니다.' : '이미지 복사에 실패했습니다.'))
          .catch(() => setNotice('클립보드 복사에 실패했습니다.'));
      } else {
        void copyMediaSource(node.attrs.source)
          .then(() => setNotice('미디어 참조를 복사했습니다.'))
          .catch(() => setNotice('클립보드 복사에 실패했습니다.'));
      }
    });
    const id = ++imageSequence.current;
    const render = () => setImageMounts(previous => [...previous.filter(item => item.id !== id), { id, element: picture, source: node.attrs.source }]);
    const controls = document.createElement('div');
    controls.className = 'visual-media-controls no-print';
    controls.append(copy, button);
    const selectMediaNode = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, .onrivi-media-control, input, select, textarea, a')) return;
      const position = getPos();
      const currentView = viewRef.current;
      if (currentView?.editable && typeof position === 'number') {
        const currentNode = currentView.state.doc.nodeAt(position);
        if (currentNode && NodeSelection.isSelectable(currentNode)) {
          currentView.dispatch(currentView.state.tr.setSelection(NodeSelection.create(currentView.state.doc, position)));
          currentView.focus();
          requestAnimationFrame(() => {
            if (viewRef.current === currentView && currentView.editable) currentView.focus();
          });
        }
      }
    };
    dom.addEventListener('mousedown', selectMediaNode);
    dom.addEventListener('click', selectMediaNode);
    render();
    dom.append(picture, controls);
    return {
      dom,
      selectNode() { dom.classList.add('ProseMirror-selectednode'); },
      deselectNode() { dom.classList.remove('ProseMirror-selectednode'); },
      ignoreMutation: () => true,
      stopEvent: event => button.contains(event.target as Node) || copy.contains(event.target as Node),
      update(next) {
        if (next.type !== node.type) return false;
        if (next.attrs.source !== node.attrs.source) { node = next; render(); } else node = next;
        return true;
      },
      destroy() {
        queueMicrotask(() => {
          if (viewRef.current) setImageMounts(previous => previous.filter(item => item.id !== id));
        });
      },
    };
  };

  return {
    table(node) {
      const dom = document.createElement('table');
      dom.className = 'visual-editable-table';
      dom.style.setProperty('table-layout', 'fixed', 'important');
      const columns = document.createElement('colgroup');
      const body = document.createElement('tbody');
      dom.append(columns, body);
      const renderWidths = (tableNode: typeof node) => {
        const count = tableNode.firstChild?.childCount || 0;
        const widths = validColumnRatios(tableNode.attrs.widths, count) || equalColumnRatios(count);
        columns.replaceChildren(...widths.map(width => {
          const col = document.createElement('col');
          col.style.width = `${width}%`;
          return col;
        }));
      };
      renderWidths(node);
      return {
        dom,
        contentDOM: body,
        update(next) {
          if (next.type !== node.type) return false;
          node = next;
          renderWidths(node);
          return true;
        },
        ignoreMutation(mutation) {
          return mutation.type !== 'selection' && (mutation.target === columns || columns.contains(mutation.target));
        }
      };
    },
    visual_image: mediaNodeView,
    visual_media: mediaNodeView,
    image(node, _view, getPos) {
      const span = document.createElement('span');
      span.className = 'visual-inline-image-wrapper inline-block my-1 align-middle';
      span.contentEditable = 'false';
      const id = ++imageSequence.current;
      const getSource = (targetNode: typeof node) => {
        let rawSrc = targetNode.attrs.src || '';
        rawSrc = rawSrc.replace(/^[<"']|[>"']$/g, '').trim();
        const rawAlt = targetNode.attrs.alt || '';
        const rawTitle = targetNode.attrs.title ? ` "${targetNode.attrs.title}"` : '';
        return `![${rawAlt}](${rawSrc}${rawTitle})`;
      };
      const render = () => {
        const source = getSource(node);
        setImageMounts(previous => [
          ...previous.filter(item => item.id !== id),
          { id, element: span, source }
        ]);
      };
      const selectImageNode = (event: MouseEvent) => {
        const position = getPos();
        const curView = viewRef.current;
        if (curView?.editable && typeof position === 'number') {
          const currentNode = curView.state.doc.nodeAt(position);
          if (currentNode && NodeSelection.isSelectable(currentNode)) {
            curView.dispatch(curView.state.tr.setSelection(NodeSelection.create(curView.state.doc, position)));
            curView.focus();
          }
        }
      };
      span.addEventListener('mousedown', selectImageNode);
      span.addEventListener('click', selectImageNode);
      render();
      return {
        dom: span,
        selectNode() { span.classList.add('ProseMirror-selectednode'); },
        deselectNode() { span.classList.remove('ProseMirror-selectednode'); },
        ignoreMutation: () => true,
        update(next) {
          if (next.type !== node.type) return false;
          if (next.attrs.src !== node.attrs.src || next.attrs.alt !== node.attrs.alt || next.attrs.title !== node.attrs.title) {
            node = next;
            render();
          } else {
            node = next;
          }
          return true;
        },
        destroy() {
          queueMicrotask(() => {
            if (viewRef.current) setImageMounts(previous => previous.filter(item => item.id !== id));
          });
        }
      };
    },
    visual_math(node, currentView, getPos) {
      const dom = document.createElement('div');
      dom.className = 'visual-math-node my-4 py-3 px-4 text-center cursor-pointer select-none rounded-lg hover:ring-2 hover:ring-blue-500/40 transition-all';
      dom.contentEditable = 'false';
      dom.setAttribute('data-latex', node.attrs.latex || '');
      dom.setAttribute('title', '더블클릭하여 수식 에디터 열기');

      const render = () => {
        const cleanLatex = (node.attrs.latex || '').trim();
        try {
          dom.innerHTML = '';
          if (katex) {
            katex.render(cleanLatex || 'f(x) = x^2', dom, {
              throwOnError: false,
              displayMode: true,
              strict: false
            });
          } else {
            dom.textContent = cleanLatex || '수식';
          }
        } catch {
          dom.textContent = cleanLatex;
        }
      };

      render();

      dom.addEventListener('mousedown', () => {
        const pos = getPos();
        if (typeof pos === 'number' && currentView.editable) {
          const currentNode = currentView.state.doc.nodeAt(pos);
          if (currentNode && NodeSelection.isSelectable(currentNode)) {
            currentView.dispatch(currentView.state.tr.setSelection(NodeSelection.create(currentView.state.doc, pos)));
            currentView.focus();
            requestAnimationFrame(() => {
              if (viewRef.current === currentView && currentView.editable) currentView.focus();
            });
          }
        }
      });

      dom.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = getPos();
        if (typeof pos !== 'number' || !currentView.editable) return;
        if (imagesRef.current.onFormulaDialog) {
          imagesRef.current.onFormulaDialog((formulaCode: string) => {
            const cleanCode = formulaCode.trim();
            const isInline = cleanCode.startsWith('$') && !cleanCode.startsWith('$$');
            const rawLatex = cleanCode.startsWith('$$')
              ? cleanCode.replace(/^\$\$|\$\$$/g, '').trim()
              : cleanCode.startsWith('$')
                ? cleanCode.replace(/^\$|\$$/g, '').trim()
                : cleanCode.startsWith('```')
                  ? cleanCode.replace(/^```[a-z]*\r?\n|```$/gi, '').trim()
                  : cleanCode;
            if (isInline) {
              currentView.dispatch(currentView.state.tr.replaceWith(pos, pos + 1, visualSchema.nodes.visual_inline_math.create({ latex: rawLatex })));
            } else {
              currentView.dispatch(currentView.state.tr.setNodeMarkup(pos, undefined, { latex: rawLatex }));
            }
            return true;
          }, `\n$$\n${node.attrs.latex}\n$$\n`);
        }
      });

      return {
        dom,
        selectNode() { dom.classList.add('ring-2', 'ring-blue-500'); },
        deselectNode() { dom.classList.remove('ring-2', 'ring-blue-500'); },
        ignoreMutation: () => true,
        stopEvent: () => false,
        update(next) {
          if (next.type !== node.type) return false;
          if (next.attrs.latex !== node.attrs.latex) {
            node = next;
            render();
          } else {
            node = next;
          }
          return true;
        }
      };
    },
    visual_inline_math(node, currentView, getPos) {
      const dom = document.createElement('span');
      dom.className = 'visual-inline-math-node inline-flex items-center px-1 py-0.5 mx-0.5 align-baseline cursor-pointer select-none rounded hover:ring-2 hover:ring-blue-400/40 transition-all text-zinc-900 dark:text-zinc-100';
      dom.contentEditable = 'false';
      dom.setAttribute('data-latex', node.attrs.latex || '');
      dom.setAttribute('title', '더블클릭하여 인라인 수식 편집');

      const render = () => {
        const cleanLatex = (node.attrs.latex || '').trim();
        try {
          dom.innerHTML = '';
          if (katex) {
            katex.render(cleanLatex || 'x', dom, {
              throwOnError: false,
              displayMode: false,
              strict: false
            });
          } else {
            dom.textContent = `$${cleanLatex}$`;
          }
        } catch {
          dom.textContent = `$${cleanLatex}$`;
        }
      };

      render();

      dom.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = getPos();
        if (typeof pos !== 'number' || !currentView.editable) return;
        if (imagesRef.current.onFormulaDialog) {
          imagesRef.current.onFormulaDialog((formulaCode: string) => {
            const cleanCode = formulaCode.trim();
            const isInline = cleanCode.startsWith('$') && !cleanCode.startsWith('$$');
            const rawLatex = cleanCode.startsWith('$$')
              ? cleanCode.replace(/^\$\$|\$\$$/g, '').trim()
              : cleanCode.startsWith('$')
                ? cleanCode.replace(/^\$|\$$/g, '').trim()
                : cleanCode.startsWith('```')
                  ? cleanCode.replace(/^```[a-z]*\r?\n|```$/gi, '').trim()
                  : cleanCode;
            if (isInline) {
              currentView.dispatch(currentView.state.tr.setNodeMarkup(pos, undefined, { latex: rawLatex }));
            } else {
              currentView.dispatch(currentView.state.tr.replaceWith(pos, pos + 1, visualSchema.nodes.visual_math.create({ latex: rawLatex })));
            }
            return true;
          }, `$${node.attrs.latex}$`);
        }
      });

      return {
        dom,
        selectNode() { dom.classList.add('ring-2', 'ring-blue-500'); },
        deselectNode() { dom.classList.remove('ring-2', 'ring-blue-500'); },
        ignoreMutation: () => true,
        stopEvent: () => false,
        update(next) {
          if (next.type !== node.type) return false;
          if (next.attrs.latex !== node.attrs.latex) {
            node = next;
            render();
          } else {
            node = next;
          }
          return true;
        }
      };
    },
    list_item(node, currentView, getPos) {
      const dom = document.createElement('li'), content = document.createElement('div'), checkbox = document.createElement('input');
      dom.style.cursor = 'text';
      content.style.cursor = 'text';
      checkbox.type = 'checkbox';
      checkbox.contentEditable = 'false';
      checkbox.setAttribute('aria-label', '할 일 완료');
      checkbox.style.cssText = 'float:left;margin:6px 8px 0 -24px;width:16px;height:16px';
      const update = () => {
        const task = node.attrs.checked !== null;
        dom.classList.toggle('task-list-item', task);
        if (task && checkbox.parentNode !== dom) dom.insertBefore(checkbox, content);
        if (!task && checkbox.parentNode === dom) checkbox.remove();
        checkbox.checked = Boolean(node.attrs.checked);
        checkbox.disabled = !currentView.editable;
        dom.style.listStyle = task ? 'none' : '';
      };
      checkbox.addEventListener('mousedown', event => event.preventDefault());
      checkbox.addEventListener('change', () => {
        const pos = getPos();
        if (typeof pos === 'number' && currentView.editable) {
          currentView.dispatch(currentView.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: checkbox.checked }));
        }
      });
      dom.append(content);
      update();
      return {
        dom,
        contentDOM: content,
        stopEvent: event => event.target === checkbox,
        ignoreMutation: mutation => mutation.type !== 'selection' && !content.contains(mutation.target) && mutation.target !== content,
        update(next) {
          if (next.type !== node.type) return false;
          node = next;
          update();
          return true;
        }
      };
    },
    code_block(node, currentView, getPos) {
      const dom = document.createElement('div');
      dom.className = 'codeblock-area visual-code-block';
      dom.spellcheck = false;
      const header = document.createElement('div');
      header.contentEditable = 'false';
      header.className = 'visual-code-language no-print';
      header.textContent = 'CODE ';
      const input = document.createElement('input');
      input.setAttribute('aria-label', '코드 블록 언어');
      input.placeholder = 'text, javascript, python, mermaid';
      input.value = node.attrs.params || '';
      input.disabled = !currentView.editable;
      const commitParams = () => {
        const pos = getPos();
        if (typeof pos !== 'number' || !currentView.editable) return;
        const newParams = input.value.replace(/[\r\n]/g, '').trim();
        if (newParams !== (node.attrs.params || '')) {
          currentView.dispatch(closeHistory(currentView.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, params: newParams })));
        }
      };
      input.addEventListener('change', commitParams);
      input.addEventListener('blur', commitParams);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          commitParams();
          const pos = getPos();
          if (typeof pos === 'number' && currentView.editable) {
            currentView.focus();
            if (event.shiftKey && (event.key === 'Enter' || event.key === 'Tab')) {
              const nodeSize = node.nodeSize;
              const outsidePos = Math.min(pos + nodeSize, currentView.state.doc.content.size);
              let tr = currentView.state.tr;
              if (outsidePos >= tr.doc.content.size || tr.doc.resolve(outsidePos).parent.type !== visualSchema.nodes.paragraph) {
                tr = tr.insert(outsidePos, visualSchema.nodes.paragraph.create());
              }
              currentView.dispatch(tr.setSelection(TextSelection.create(tr.doc, outsidePos + 1)).scrollIntoView());
            } else {
              const targetPos = Math.min(pos + 1, currentView.state.doc.content.size);
              currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, targetPos)).scrollIntoView());
            }
          }
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          currentView.focus();
        }
      });
      header.append(input);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = '복사';
      copy.setAttribute('aria-label', '코드 순수 문구 복사');
      copy.title = '코드 순수 문구만 복사';
      copy.className = 'onrivi-media-control no-print';
      copy.contentEditable = 'false';
      let copyTimer: ReturnType<typeof setTimeout> | undefined;
      copy.addEventListener('mousedown', event => event.preventDefault());
      copy.addEventListener('click', async () => {
        clearTimeout(copyTimer);
        try {
          const codeContent = node.textContent;
          const api = (window as any).electronAPI;
          if (api?.copyTextToClipboard) await api.copyTextToClipboard(codeContent);
          else await navigator.clipboard.writeText(codeContent);
          copy.textContent = '복사됨';
        } catch {
          copy.textContent = '복사 실패';
        }
        if (dom.isConnected) copyTimer = setTimeout(() => { copy.textContent = '복사'; }, 1800);
      });
      header.append(copy);

      const copyFenced = document.createElement('button');
      copyFenced.type = 'button';
      copyFenced.textContent = '형태 복사';
      copyFenced.setAttribute('aria-label', '마크다운 코드블록 형태 복사');
      copyFenced.title = '코드블록 마크다운 형태(```) 포함 복사';
      copyFenced.className = 'onrivi-media-control no-print';
      copyFenced.contentEditable = 'false';
      let copyFencedTimer: ReturnType<typeof setTimeout> | undefined;
      copyFenced.addEventListener('mousedown', event => event.preventDefault());
      copyFenced.addEventListener('click', async () => {
        clearTimeout(copyFencedTimer);
        try {
          const params = (node.attrs.params || '').trim();
          const codeContent = node.textContent;
          const markdownFenced = '```' + params + '\n' + codeContent + (codeContent.endsWith('\n') ? '' : '\n') + '```';
          const api = (window as any).electronAPI;
          if (api?.copyTextToClipboard) await api.copyTextToClipboard(markdownFenced);
          else await navigator.clipboard.writeText(markdownFenced);
          copyFenced.textContent = '복사됨';
        } catch {
          copyFenced.textContent = '복사 실패';
        }
        if (dom.isConnected) copyFencedTimer = setTimeout(() => { copyFenced.textContent = '형태 복사'; }, 1800);
      });
      header.append(copyFenced);
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = '삭제';
      deleteBtn.setAttribute('aria-label', '코드 블록 삭제');
      deleteBtn.title = '코드 블록 삭제 (Backspace)';
      deleteBtn.className = 'onrivi-media-control no-print text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-medium transition-colors cursor-pointer';
      deleteBtn.contentEditable = 'false';
      deleteBtn.addEventListener('mousedown', event => event.preventDefault());
      deleteBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos !== 'number' || !currentView.editable) return;
        const tr = currentView.state.tr;
        const nodeSize = node.nodeSize;
        if (currentView.state.doc.childCount === 1 && pos === 0) {
          currentView.dispatch(closeHistory(tr.replaceWith(pos, pos + nodeSize, visualSchema.nodes.paragraph.create())));
        } else {
          currentView.dispatch(closeHistory(tr.delete(pos, pos + nodeSize)));
        }
        currentView.focus();
      });
      header.append(deleteBtn);
      const pre = document.createElement('pre'), code = document.createElement('code');
      pre.className = 'custom-scrollbar';
      pre.spellcheck = false;
      code.spellcheck = false;
      let preMouseDownCoords: { x: number; y: number } | null = null;
      pre.addEventListener('mousedown', (event) => {
        if (event.target === pre && currentView.editable) {
          preMouseDownCoords = { x: event.clientX, y: event.clientY };
        }
      });
      pre.addEventListener('click', (event) => {
        if (event.target === pre && currentView.editable) {
          if (preMouseDownCoords) {
            const dist = Math.hypot(event.clientX - preMouseDownCoords.x, event.clientY - preMouseDownCoords.y);
            if (dist > 4) return;
          }
          const pos = getPos();
          if (typeof pos === 'number') {
            const clickY = event.clientY;
            const codeRect = code.getBoundingClientRect();
            // 코드 텍스트보다 아래를 클릭했으면 코드 끝으로, 위를 클릭했으면 코드 시작으로 이동
            const targetPos = clickY >= codeRect.bottom ? pos + node.nodeSize - 1 : pos + 1;
            currentView.dispatch(currentView.state.tr.setSelection(TextSelection.create(currentView.state.doc, targetPos)));
            currentView.focus();
          }
        }
      });
      const panel = document.createElement('details');
      panel.className = 'visual-code-editor-panel';
      const initialLang = String(node.attrs.params || '').split(/\s/)[0].toLowerCase();
      const isInitialMermaid = initialLang === 'mermaid';
      panel.open = !isInitialMermaid || !node.textContent;
      const summary = document.createElement('summary');
      summary.contentEditable = 'false';
      summary.textContent = '코드 편집';
      summary.className = 'onrivi-media-control no-print text-[11px] opacity-70 hover:opacity-100';
      const done = document.createElement('button');
      done.type = 'button';
      done.textContent = '편집 완료';
      done.className = 'onrivi-media-control no-print text-[11px]';
      done.contentEditable = 'false';
      done.addEventListener('mousedown', event => event.preventDefault());
      done.addEventListener('click', () => { panel.open = false; });
      header.append(done);
      panel.append(summary, header, pre);
      const preview = document.createElement('div');
      preview.contentEditable = 'false';
      preview.className = 'visual-mermaid-preview';
      const id = ++imageSequence.current;
      let renderedSource: string | null = null;
      let renderTimer: ReturnType<typeof setTimeout> | undefined;
      let previousSpecial = isInitialMermaid;
      const render = () => {
        const lang = String(node.attrs.params || '').split(/\s/)[0].toLowerCase();
        const mermaid = lang === 'mermaid';
        preview.hidden = !mermaid;
        summary.hidden = !mermaid;
        done.hidden = !mermaid;
        if (!mermaid) panel.open = true;
        else if (!previousSpecial && node.textContent) panel.open = false;
        previousSpecial = mermaid;
        const source = mermaid ? '```mermaid\n' + node.textContent + '\n```' : null;
        if (source === renderedSource) return;
        renderedSource = source;
        clearTimeout(renderTimer);
        if (source && node.textContent.trim()) {
          renderTimer = setTimeout(() => setImageMounts(previous => [...previous.filter(item => item.id !== id), { id, element: preview, source }]), 180);
        } else {
          setImageMounts(previous => previous.filter(item => item.id !== id));
        }
      };
      pre.appendChild(code);
      dom.append(panel, preview);
      render();
      return {
        dom,
        contentDOM: code,
        stopEvent: event => header.contains(event.target as Node) || event.target === summary,
        ignoreMutation: mutation => mutation.type !== 'selection' && !code.contains(mutation.target) && mutation.target !== code,
        update(next) {
          if (next.type !== node.type) return false;
          node = next;
          if (document.activeElement !== input) input.value = node.attrs.params || '';
          render();
          return true;
        },
        destroy() {
          clearTimeout(renderTimer);
          clearTimeout(copyTimer);
          queueMicrotask(() => {
            if (viewRef.current) setImageMounts(previous => previous.filter(item => item.id !== id));
          });
        }
      };
    },
    visual_footnote_ref(node, currentView) {
      const dom = document.createElement('sup');
      dom.className = 'visual-footnote-ref inline-block text-xs font-bold text-blue-700 dark:text-blue-400 px-1 select-all cursor-pointer hover:underline';
      dom.textContent = `[${node.attrs.label}]`;
      dom.setAttribute('data-footnote-ref', node.attrs.label);
      dom.title = `각주 [^${node.attrs.label}] 바로가기`;
      dom.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetDef = currentView.dom.querySelector(`[data-footnote-def="${node.attrs.label}"]`);
        if (targetDef) {
          targetDef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetDef.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => targetDef.classList.remove('ring-2', 'ring-blue-500'), 1500);
          const inputEl = targetDef.querySelector('.visual-footnote-text') as HTMLElement | null;
          if (inputEl && currentView.editable) {
            inputEl.focus();
            const isDefault = inputEl.textContent?.trim() === '각주 내용을 입력하세요' || inputEl.textContent?.trim() === '각주 설명을 입력하세요';
            if (isDefault) {
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(inputEl);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        }
      });
      return {
        dom,
        stopEvent: () => false,
        update: next => next.type === node.type
      };
    },
    visual_footnote_def(node, currentView, getPos) {
      const dom = document.createElement('div');
      dom.className = 'visual-footnote-def visual-footnote-def-container group flex items-start gap-2.5 px-3 py-1.5 my-1 rounded-md bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-blue-400/60 dark:hover:border-blue-600/60 transition-all';
      dom.setAttribute('data-footnote-def', node.attrs.label);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'visual-footnote-badge font-bold text-blue-700 dark:text-blue-400 select-none whitespace-nowrap pt-0.5 cursor-pointer hover:underline shrink-0';
      labelSpan.textContent = `[^${node.attrs.label}]:`;
      labelSpan.title = `각주 [^${node.attrs.label}] 본문 위치로`;
      labelSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetRef = currentView.dom.querySelector(`[data-footnote-ref="${node.attrs.label}"]`);
        if (targetRef) {
          targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRef.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => targetRef.classList.remove('ring-2', 'ring-blue-500'), 1500);
        }
      });

      const input = document.createElement('span');
      input.className = 'visual-footnote-text flex-1 outline-none min-h-[1.4em] focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500/40 rounded px-1.5 py-0.5 leading-relaxed cursor-text';
      input.contentEditable = currentView.editable ? 'true' : 'false';
      input.textContent = node.attrs.content || '';
      input.setAttribute('data-placeholder', '각주 설명을 입력하세요...');

      const isDefaultText = () => {
        const txt = (input.textContent || '').trim();
        return txt === '각주 내용을 입력하세요' || txt === '각주 설명을 입력하세요';
      };

      const selectAllText = () => {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(input);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      };

      input.addEventListener('focus', () => {
        if (isDefaultText()) {
          setTimeout(selectAllText, 10);
        }
      });

      input.addEventListener('mouseup', (e) => {
        if (isDefaultText()) {
          e.preventDefault();
          selectAllText();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          const targetRef = currentView.dom.querySelector(`[data-footnote-ref="${node.attrs.label}"]`);
          if (targetRef) {
            targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetRef.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => targetRef.classList.remove('ring-2', 'ring-blue-500'), 1500);
          }
          currentView.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          currentView.focus();
        }
      });

      dom.addEventListener('click', (e) => {
        if (e.target === dom) {
          input.focus();
          if (isDefaultText()) {
            setTimeout(selectAllText, 10);
          }
        }
      });

      input.addEventListener('input', () => {
        const pos = getPos();
        if (typeof pos !== 'number' || !currentView.editable) return;
        const text = input.textContent || '';
        if (text !== node.attrs.content) {
          currentView.dispatch(currentView.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, content: text }));
        }
      });

      const jumpBtn = document.createElement('button');
      jumpBtn.type = 'button';
      jumpBtn.className = 'visual-footnote-jump-btn select-none text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded cursor-pointer transition-colors shrink-0 pt-0.5';
      jumpBtn.title = `본문 각주 [^${node.attrs.label}] 위치로 돌아가기 (↩)`;
      jumpBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetRef = currentView.dom.querySelector(`[data-footnote-ref="${node.attrs.label}"]`);
        if (targetRef) {
          targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRef.classList.add('ring-2', 'ring-blue-500');
          setTimeout(() => targetRef.classList.remove('ring-2', 'ring-blue-500'), 1500);
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'visual-footnote-delete-btn select-none text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100';
      deleteBtn.title = '각주 삭제';
      deleteBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pos = getPos();
        if (typeof pos === 'number' && currentView.editable) {
          currentView.dispatch(closeHistory(currentView.state.tr.delete(pos, pos + node.nodeSize)));
          currentView.focus();
        }
      });

      dom.append(labelSpan, input, jumpBtn, deleteBtn);

      return {
        dom,
        stopEvent: event => input.contains(event.target as Node) || jumpBtn.contains(event.target as Node) || deleteBtn.contains(event.target as Node),
        ignoreMutation: mutation => mutation.target === input || input.contains(mutation.target),
        update(next) {
          if (next.type !== node.type) return false;
          node = next;
          dom.setAttribute('data-footnote-def', node.attrs.label);
          labelSpan.textContent = `[^${node.attrs.label}]:`;
          labelSpan.title = `각주 [^${node.attrs.label}] 본문 위치로`;
          jumpBtn.title = `본문 각주 [^${node.attrs.label}] 위치로 돌아가기 (↩)`;
          if (document.activeElement !== input && input.textContent !== node.attrs.content) {
            input.textContent = node.attrs.content;
          }
          return true;
        }
      };
    },
    visual_checkbox(node, currentView, getPos) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'onrivi-inline-checkbox align-middle cursor-pointer';
      checkbox.style.cssText = 'vertical-align: middle; margin: 0 4px 0 0; cursor: pointer; width: 14px; height: 14px;';
      checkbox.contentEditable = 'false';
      if (node.attrs.id) checkbox.setAttribute('data-import-checkbox', node.attrs.id);
      if (node.attrs.label) checkbox.setAttribute('aria-label', node.attrs.label);
      checkbox.checked = Boolean(node.attrs.checked);
      checkbox.disabled = !currentView.editable;

      checkbox.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      checkbox.addEventListener('change', (e) => {
        const pos = getPos();
        if (typeof pos === 'number' && currentView.editable) {
          const target = e.target as HTMLInputElement;
          currentView.dispatch(
            currentView.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              checked: target.checked
            })
          );
        }
      });

      return {
        dom: checkbox,
        stopEvent: (event) => event.target === checkbox,
        ignoreMutation: () => true,
        update(next) {
          if (next.type !== node.type) return false;
          node = next;
          checkbox.checked = Boolean(node.attrs.checked);
          checkbox.disabled = !currentView.editable;
          if (node.attrs.id) checkbox.setAttribute('data-import-checkbox', node.attrs.id);
          if (node.attrs.label) checkbox.setAttribute('aria-label', node.attrs.label);
          return true;
        }
      };
    },
    source_block(node, currentView, getPos) {
      const isMermaid = /^\s*```\s*mermaid(?:\s|$)/i.test(node.attrs.source);
      const isTable = /^\s*(?:<!--[\s\S]*?-->\s*)*<table\b[\s\S]*<\/table>\s*$/i.test(node.attrs.source.trim());
      const dom = document.createElement('div');
      dom.contentEditable = 'false';
      dom.className = isMermaid ? 'visual-source-block visual-mermaid-container' : isTable ? 'visual-source-block visual-html-table-container' : 'visual-source-block';
      const picture = document.createElement('div');
      const id = ++imageSequence.current;
      dom.append(picture);

      let details: HTMLDetailsElement | null = null;
      let input: HTMLTextAreaElement | null = null;
      let sourceTimer: ReturnType<typeof setTimeout> | undefined;
      let observer: MutationObserver | null = null;

      if (isMermaid || isTable) {
        details = document.createElement('details');
        details.className = isTable ? 'visual-html-table-editor no-print text-xs' : 'visual-mermaid-editor no-print text-xs';

        const summary = document.createElement('summary');
        summary.className = 'cursor-pointer select-none font-medium text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-between px-4 py-2.5 bg-zinc-50/90 dark:bg-slate-800/70 hover:bg-zinc-100/90 dark:hover:bg-slate-800 transition-colors';
        summary.innerHTML = isTable
          ? '<span class="flex items-center gap-1.5 font-semibold"><svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>HTML 표 원문 편집</span><span class="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400"><span>클릭하여 코드 펼치기 / 접기</span><svg class="w-3.5 h-3.5 transition-transform duration-200 mermaid-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>'
          : '<span class="flex items-center gap-1.5 font-semibold"><svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>머메이드(Mermaid) 코드 편집</span><span class="flex items-center gap-1 text-[11px] font-normal text-slate-500 dark:text-slate-400"><span>클릭하여 코드 펼치기 / 접기</span><svg class="w-3.5 h-3.5 transition-transform duration-200 mermaid-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>';

        const body = document.createElement('div');
        body.className = 'p-3 bg-zinc-50/40 dark:bg-slate-900/40 border-t border-zinc-200/50 dark:border-slate-800/60 flex flex-col gap-2.5';

        input = document.createElement('textarea');
        input.setAttribute('aria-label', isTable ? 'HTML 표 블록 원문' : '머메이드 블록 원문');
        input.value = node.attrs.source;
        input.rows = 8;
        input.className = 'w-full font-mono text-xs p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 custom-scrollbar resize-y leading-relaxed';
        input.spellcheck = false;
        input.disabled = !currentView.editable;

        // Tab 키 입력 시 2칸 들여쓰기 공백 지원
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = input!.selectionStart;
            const end = input!.selectionEnd;
            input!.value = input!.value.substring(0, start) + '  ' + input!.value.substring(end);
            input!.selectionStart = input!.selectionEnd = start + 2;
            input!.dispatchEvent(new Event('input'));
          }
        });

        input.addEventListener('input', () => {
          clearTimeout(sourceTimer);
          sourceTimer = setTimeout(() => {
            const pos = getPos();
            if (typeof pos !== 'number' || !currentView.editable || !dom.isConnected) return;
            if (currentView.state.doc.nodeAt(pos)?.type !== node.type) return;
            if (input && input.value !== node.attrs.source) {
              currentView.dispatch(currentView.state.tr.setNodeMarkup(pos, undefined, { source: input.value }));
            }
          }, 250);
        });

        const actionRow = document.createElement('div');
        actionRow.className = 'flex items-center justify-between pt-0.5 gap-2';

        const deleteDrawerBtn = document.createElement('button');
        deleteDrawerBtn.type = 'button';
        deleteDrawerBtn.textContent = isTable ? '표 삭제' : '다이어그램 삭제';
        deleteDrawerBtn.setAttribute('aria-label', isTable ? '표 삭제' : '다이어그램 삭제');
        deleteDrawerBtn.className = 'px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer shrink-0';
        deleteDrawerBtn.addEventListener('click', () => {
          const pos = getPos();
          if (typeof pos !== 'number' || !currentView.editable) return;
          const tr = currentView.state.tr;
          const nodeSize = node.nodeSize;
          if (currentView.state.doc.childCount === 1 && pos === 0) {
            currentView.dispatch(closeHistory(tr.replaceWith(pos, pos + nodeSize, visualSchema.nodes.paragraph.create())));
          } else {
            currentView.dispatch(closeHistory(tr.delete(pos, pos + nodeSize)));
          }
          currentView.focus();
        });

        const helper = document.createElement('span');
        helper.className = 'text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0 truncate';
        helper.innerHTML = `<svg class="w-3 h-3 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span class="truncate">${isTable ? 'HTML 수정 시 표가 실시간 반영됩니다.' : '타이핑 시 다이어그램이 실시간 반영됩니다.'}</span>`;

        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex items-center gap-1.5 shrink-0';

        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.textContent = '코드 접기';
        collapseBtn.className = 'px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer';
        collapseBtn.addEventListener('click', () => {
          if (details) details.open = false;
        });

        const apply = document.createElement('button');
        apply.type = 'button';
        apply.textContent = '적용 완료';
        apply.className = 'px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-xs font-medium shadow-xs transition-colors cursor-pointer';
        apply.disabled = !currentView.editable;

        apply.addEventListener('click', () => {
          const pos = getPos();
          if (typeof pos === 'number' && currentView.editable && input) {
            currentView.dispatch(closeHistory(currentView.state.tr.setNodeMarkup(pos, undefined, { source: input.value })));
            if (details) details.open = false;
          }
        });

        btnGroup.append(collapseBtn, apply);
        actionRow.append(deleteDrawerBtn, helper, btnGroup);
        body.append(input, actionRow);
        details.append(summary, body);
        dom.append(details);

        // 상단 헤더 컨트롤 영역에 '✏️ 코드/HTML 편집' 및 '🗑️ 삭제' 토글 버튼 자동 연결
        const syncHeaderButton = () => {
          if (isMermaid) {
            const controls = picture.querySelector('[data-editor-controls]');
            if (controls && !controls.querySelector('.mermaid-header-edit-btn')) {
              const editBtn = document.createElement('button');
              editBtn.type = 'button';
              editBtn.className = 'onrivi-media-control mermaid-header-edit-btn text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-950/50';
              editBtn.title = '다이어그램 코드 편집기 펼치기 / 접기';
              editBtn.textContent = '✏️ 코드 편집';
              editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (details) {
                  details.open = !details.open;
                  if (details.open && input) {
                    setTimeout(() => input?.focus(), 60);
                  }
                }
              });
              controls.prepend(editBtn);
            }

            if (controls && !controls.querySelector('.mermaid-header-delete-btn')) {
              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.className = 'onrivi-media-control mermaid-header-delete-btn text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium cursor-pointer';
              deleteBtn.title = '다이어그램 블록 삭제';
              deleteBtn.textContent = '🗑️ 삭제';
              deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = getPos();
                if (typeof pos !== 'number' || !currentView.editable) return;
                const tr = currentView.state.tr;
                const nodeSize = node.nodeSize;
                if (currentView.state.doc.childCount === 1 && pos === 0) {
                  currentView.dispatch(closeHistory(tr.replaceWith(pos, pos + nodeSize, visualSchema.nodes.paragraph.create())));
                } else {
                  currentView.dispatch(closeHistory(tr.delete(pos, pos + nodeSize)));
                }
                currentView.focus();
              });
              controls.append(deleteBtn);
            }
          } else if (isTable) {
            const wrapper = picture.querySelector('.table-wrapper-area');
            if (wrapper && !wrapper.querySelector('.table-header-edit-btn')) {
              const editBtn = document.createElement('button');
              editBtn.type = 'button';
              editBtn.className = 'onrivi-media-control table-header-edit-btn absolute top-1 right-16 px-2 py-1 bg-black/60 dark:bg-white/20 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-[11px] flex items-center gap-1 z-10 hover:bg-black/80 font-medium no-print cursor-pointer';
              editBtn.title = 'HTML 표 코드 편집기 펼치기 / 접기';
              editBtn.textContent = '✏️ HTML 편집';
              editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (details) {
                  details.open = !details.open;
                  if (details.open && input) {
                    setTimeout(() => input?.focus(), 60);
                  }
                }
              });
              wrapper.prepend(editBtn);
            }
          }
        };

        observer = new MutationObserver(() => syncHeaderButton());
        observer.observe(picture, { childList: true, subtree: true });
        setTimeout(syncHeaderButton, 60);
      } else {
        const controls = document.createElement('div');
        controls.className = 'visual-media-controls no-print';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'onrivi-media-control text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium cursor-pointer';
        deleteBtn.textContent = '삭제';
        deleteBtn.title = '블록 삭제';
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const pos = getPos();
          if (typeof pos === 'number' && currentView.editable) {
            const tr = currentView.state.tr;
            if (currentView.state.doc.childCount === 1 && pos === 0) {
              currentView.dispatch(closeHistory(tr.replaceWith(pos, pos + node.nodeSize, visualSchema.nodes.paragraph.create())));
            } else {
              currentView.dispatch(closeHistory(tr.delete(pos, pos + node.nodeSize)));
            }
            currentView.focus();
          }
        });
        controls.append(deleteBtn);
        dom.append(controls);
      }

      const render = () => setImageMounts(previous => [...previous.filter(item => item.id !== id), { id, element: picture, source: node.attrs.source }]);
      render();

      return {
        dom,
        ignoreMutation: () => true,
        stopEvent: event => {
          const target = event.target as Node;
          if (details && details.contains(target)) return true;
          if ((target as HTMLElement)?.closest?.('[data-editor-controls], .onrivi-media-control')) return true;
          return false;
        },
        update(next) {
          if (next.type !== node.type) return false;
          if (next.attrs.source !== node.attrs.source) {
            node = next;
            if (input && (document.activeElement !== input || input.value !== node.attrs.source)) {
              input.value = node.attrs.source;
            }
            render();
          }
          return true;
        },
        destroy() {
          clearTimeout(sourceTimer);
          observer?.disconnect();
          queueMicrotask(() => {
            if (viewRef.current) setImageMounts(previous => previous.filter(item => item.id !== id));
          });
        }
      };
    },
  };
}
