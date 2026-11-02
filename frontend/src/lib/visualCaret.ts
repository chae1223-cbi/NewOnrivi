/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 프로그램 ID : oaar-vm-caret
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-10-27** — [빈 문단 엔터 입력 시 정밀 라인박스 캐럿 정렬 및 타이핑 시 수직 점프 방지]:
 *             1) 빈 문단(<p><br class="ProseMirror-trailingBreak"></p>)에서 view.nodeDOM 기반 정확한 문단 요소를 획득하고, 폰트 크기 및 행간(lineHeight)에 기반하여 텍스트 시작 위치에 1:1 일치하도록 캐럿 좌표 산출
 *             2) 엔터 입력 직후 커서가 과도하게 내려앉거나 글자 타이핑 시 위로 튀는 현상 100% 해소
 * 🚨 @PATCH : **2026-10-17** — [이미지·미디어 블록(NodeSelection)에서 Ctrl+Enter로 다음 행 이동 시 커서 즉각 표시 보강]:
 *             1) NodeSelection에서 빈 문단(TextSelection)으로 전환 직후 브라우저 네이티브 Selection Range가 지연되더라도 view.coordsAtPos 폴백을 통해 3px 코발트 커서가 즉시 렌더링되도록 개선
 * 🚨 @PATCH : **2026-10-14** — [머메이드 편집기(textarea) 및 각주(footnote) 입력 시 커서 완전 표시 및 visualCaret 충돌 방어]:
 *             1) document.activeElement가 textarea, input 또는 자식 contenteditable(.visual-footnote-text 등)일 때 visualCaret을 즉각 숨김 처리하여 유령 커서 방지
 *             2) selection.anchorNode가 각주/머메이드/코드언어 입력기 내부에 위치할 때도 visualCaret 노출을 억제하고 요소 자체의 고선명 네이티브 커서로 1:1 전환
 * 🚨 @PATCH : **2026-10-13** — [고시인성 3px 도톰한 단일 커서 최적화 및 깜빡임 애니메이션 탑재]:
 *             1) 네이티브 1px 얇은 커서와의 중복 표시(2중 커서 버그) 방어 및 고시인성 3px 코발트 블루 단일 커서로 표준화
 *             2) 1.06s 주기 깜빡임(Blink) 애니메이션 및 타이핑/조작 시 즉각 반응(리셋) 처리
 *             3) 빈 줄(빈 문단) 및 서식 경계선에서 높이(최소 18px) 및 좌표 안정화
 */
import type { EditorView } from 'prosemirror-view';

/** 고시인성 프리미엄 도톰한 커서 (3px), 네이티브 중복 방지 및 깜빡임 애니메이션 지원 */
export function installVisualCaret(view: EditorView) {
  // 깜빡임 CSS 키프레임 주입 (1회성 안전 주입)
  if (typeof document !== 'undefined' && !document.getElementById('omd-visual-caret-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'omd-visual-caret-style';
    styleEl.textContent = `
      @keyframes omd-visual-caret-blink {
        0%, 48% { opacity: 1; }
        50%, 98% { opacity: 0; }
        100% { opacity: 1; }
      }
      .visual-persistent-caret {
        animation: omd-visual-caret-blink 1.06s infinite step-end;
      }
    `;
    document.head.appendChild(styleEl);
  }

  const caret = document.createElement('div');
  caret.className = 'visual-persistent-caret no-print';
  caret.setAttribute('aria-hidden', 'true');
  caret.style.cssText = [
    'position:fixed',
    'display:none',
    'width:3px',
    'background:#2563eb',
    'box-shadow:0 0 0 1px rgba(255, 255, 255, 0.7)',
    'pointer-events:none',
    'z-index:40',
    'border-radius:1.5px',
    'will-change:left,top,height'
  ].join(';');
  document.body.appendChild(caret);

  let frame = 0;
  const update = () => {
    frame = 0;
    caret.style.display = 'none';

    // 머메이드 코드 편집기(textarea), 각주 입력기(contenteditable span), 코드 언어 입력기(input) 등
    // 노드뷰 내부의 별도 입력 요소에 포커스가 위치한 경우 visualCaret을 숨기고 요소 자체의 네이티브 커서가 온전히 노출되도록 위임
    const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl.isContentEditable && activeEl !== view.dom) ||
      activeEl.closest?.('.visual-footnote-text, .visual-footnote-def, .visual-mermaid-editor, .visual-code-language')
    )) {
      return;
    }

    const selection = document.getSelection();
    const hasEditorFocus = view.hasFocus() || Boolean(activeEl && (activeEl === view.dom || view.dom.contains(activeEl)));
    const hasDomSelection = Boolean(selection?.isCollapsed && selection.anchorNode && view.dom.contains(selection.anchorNode));
    if (!view.editable || !hasEditorFocus || !view.state.selection.empty || (selection && selection.rangeCount > 0 && !selection.isCollapsed)) return;

    if (selection?.anchorNode && (
      (selection.anchorNode as HTMLElement).closest?.('.visual-footnote-text, .visual-footnote-def, .visual-mermaid-editor, .visual-code-language, textarea, input') ||
      selection.anchorNode.parentElement?.closest('.visual-footnote-text, .visual-footnote-def, .visual-mermaid-editor, .visual-code-language, textarea, input')
    )) {
      return;
    }
    try {
      let domRect: DOMRect | undefined;
      if (hasDomSelection && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        domRect = range.getClientRects()[0];
      }
      let rect = domRect && domRect.height > 0 ? domRect : view.coordsAtPos(view.state.selection.head);
      const { $from } = view.state.selection;
      const isParagraphEmpty = $from.parent.type.name === 'paragraph' && !$from.parent.content.size;
      if (isParagraphEmpty) {
        // A lone ProseMirror-trailingBreak can report a range on the *next*
        // visual line. Typing removes that break and makes the overlay jump up.
        const targetNode = view.domAtPos($from.pos).node;
        const targetEl = targetNode instanceof Element ? targetNode : targetNode.parentElement;
        const paragraph = (view.nodeDOM($from.before()) as HTMLElement | null) || targetEl?.closest('p') || null;
        if (paragraph && view.dom.contains(paragraph)) {
          const box = paragraph.getBoundingClientRect();
          const style = getComputedStyle(paragraph);
          const fontSize = parseFloat(style.fontSize) || 16;
          const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
          const paddingTop = parseFloat(style.paddingTop) || 0;
          const paddingLeft = parseFloat(style.paddingLeft) || 0;
          const caretHeight = Math.max(18, Math.round(fontSize * 1.15));
          const top = box.top + paddingTop + Math.max(0, (lineHeight - caretHeight) / 2);
          const left = box.left + paddingLeft;
          rect = { left, right: left + 3, top, bottom: top + caretHeight };
        }
      }
      
      const caretHeight = Math.max(18, rect.bottom - rect.top);
      let top = rect.top;
      let bottom = top + caretHeight;
      let left = 0, right = window.innerWidth;

      for (let element: HTMLElement | null = view.dom; element; element = element.parentElement) {
        const bounds = element.getBoundingClientRect(), style = getComputedStyle(element);
        if (element === view.dom || /(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          if (bottom < bounds.top || top > bounds.bottom) return; // 뷰포트 밖
          top = Math.max(top, bounds.top);
          bottom = Math.min(bottom, bounds.bottom);
        }
        if (element === view.dom || /(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          left = Math.max(left, bounds.left);
          right = Math.min(right, bounds.right);
        }
      }

      if (bottom <= top || rect.left < left || rect.left >= right) return;

      // 조작 시 깜빡임 리셋: 커서가 항상 100% 켜진 상태로 반응
      caret.style.animation = 'none';
      void caret.offsetHeight; // reflow 강제
      caret.style.animation = 'omd-visual-caret-blink 1.06s infinite step-end';

      Object.assign(caret.style, {
        display: 'block',
        left: `${rect.left}px`,
        top: `${top}px`,
        height: `${bottom - top}px`
      });
    } catch { /* Selection can disappear during a document switch. */ }
  };

  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const events = ['selectionchange', 'scroll', 'focusin', 'focusout', 'input', 'keydown', 'compositionupdate', 'compositionend'];
  events.forEach(event => document.addEventListener(event, schedule, true));
  window.addEventListener('resize', schedule);
  schedule();

  return {
    schedule,
    destroy() {
      cancelAnimationFrame(frame);
      events.forEach(event => document.removeEventListener(event, schedule, true));
      window.removeEventListener('resize', schedule);
      caret.remove();
    }
  };
}
