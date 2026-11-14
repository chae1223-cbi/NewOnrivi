/**
 * 프로그램명 : OnriviAuthor 
 * 버전 정보 : 1.0.1
 * 프로그램 ID : oaar-vm-caret
 * -----------------------------------------------------------------------
 * 🚨 @PATCH : **2026-11-14** — [인라인 마크다운 태그 적용 문장 Enter 줄바꿈 시 캐럿이 윗줄에 머무는 결함 해결]:
 *             1) 커서 직전 노드가 hard_break(<br>)일 때(isAfterHardBreak) trailingBreak 방어 로직이 이전 줄의 coordsBefore로 캐럿 좌표를 덮어쓰던 결함 차단
 *             2) hard_break 직후 새 줄에 텍스트가 있으면 다음 노드 시작 좌표(coordsAtPos(pos, 1))로, 빈 줄이면 trailingBreak 또는 이전 줄 + lineHeight 및 블록 좌측 시작점(box.left + paddingLeft)으로 캐럿을 즉시 하강 배치
 * 🚨 @PATCH : **2026-11-11** — [각주(visual_footnote_ref) 위첨자 캐럿 수직 상승 방어 및 본문 베이스라인 완전 동기화]:
 *             1) 각주 참조 뱃지 직후 또는 각주 뒤 공백에서 위첨자(<sup>)의 작은 높이(12px) 및 상단 Y좌표로 인해 커서가 각주 뱃지 상단에 매달려 위로 떠 있는 결함 원천 해결
 *             2) 각주 직전 본문 단어(textCoords)의 실제 렌더링 line-box 기하학을 획득하여 커서 높이(22~24px)와 Y좌표를 본문 기준선으로 100% 완전 동기화
 *             3) 각주 뒤 스페이스(공백) 입력 시 collapsed trailing space 결함을 방어하여 우측으로 spaceWidth만큼 정상 전진하도록 보장
 * 🚨 @PATCH : **2026-11-10** — [숫자/체크/일반 리스트 빈 항목 커서 아래 처짐 및 글자 타이핑 시 수직 점프 결함 완벽 해결]:
 *             1) 숫자 리스트(1.), 체크 리스트(checkbox), 일반 글머리 기호(•)의 빈 항목(첫 문자 위치)에서 커서가 아래로 쳐져 있다가 글자를 입력하면 위로 튀어 올라오는 현상 원천 해결
 *             2) isOnlyWhitespace에서 trailingBreak(<br>) 요소의 네이티브 ClientRect 기하학(top/height)을 직접 측정하여, 글자 입력 시(rectText)와 1:1 완벽 일치하도록 높이(24px)와 Y좌표(+2px)를 완전 동기화 (움직임 0px 보장)
 * 🚨 @PATCH : **2026-11-10** — [리스트/체크리스트/숫자리스트 및 빈 문단 공백 입력 시 커서 수직 추락(Line 2) 및 공백 전진 불가 결함 완벽 해결]:
 *             1) 번호 리스트(1.), 글머리 기호(-), 체크리스트(- [ ]) 및 빈 문단에서 스페이스(Space) 입력 시 브라우저 range.getClientRects()가 trailingBreak(<br>)를 감지하여 커서가 다음 행으로 추락하던 결함 원천 해결
 *             2) trailingBreak 결함 방어 시 coordsBefore.right 좌표계를 채택하여 공백 타이핑 후 커서가 문자 우측으로 자연스럽게 전진하도록 보장 (기존 coordsBefore.left로 인해 스페이스를 쳐도 제자리에 멈춰있던 결함 해결)
 *             3) isOnlyWhitespace 계산 시 list_item 노드뷰(li 내부 p) 기하학을 정밀 추적하고 coordsBefore.right 전진 오프셋을 결합하여 공백 전진 및 1행 고정 좌표계 완벽 적용
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
      const { $from } = view.state.selection;
      let domRect: DOMRect | undefined;
      if (hasDomSelection && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        domRect = range.getClientRects()[0];
      }

      // 🛡️ 커서 직전 문자 기반 정밀 좌표 산출 (trailingBreak 및 공백 줄바꿈 오차 방어)
      let coordsBefore: { left: number; right: number; top: number; bottom: number } | null = null;
      try {
        if ($from.parentOffset > 0) {
          coordsBefore = view.coordsAtPos($from.pos, -1);
        }
      } catch { /* ignore */ }

      let rect = domRect && domRect.height > 0 ? domRect : (coordsBefore || view.coordsAtPos(view.state.selection.head));

      // 🛡️ [각주(visual_footnote_ref) 위첨자 캐럿 수직 상승 방어 및 본문 베이스라인 완전 동기화]:
      // 각주 참조 뱃지 직후(또는 각주 뒤 공백)에 커서가 위치할 때, 위첨자(<sup>)의 작은 높이(12px) 및 상단 솟구침 Y좌표로 인해
      // 캐럿이 각주에 매달려 위로 떠 있는 현상을 원천 방어하고, 본문 텍스트 기준선(baseline) 높이와 Y좌표로 완전 동기화
      let footnoteRefPos = -1;
      let spaceCountAfterRef = 0;
      if ($from.nodeBefore?.type.name === 'visual_footnote_ref') {
        footnoteRefPos = $from.pos - $from.nodeBefore.nodeSize;
      } else if ($from.nodeBefore?.isText && $from.nodeBefore.text && /^\s+$/.test($from.nodeBefore.text)) {
        const spaceLen = $from.nodeBefore.text.length;
        const posBeforeSpace = $from.pos - $from.nodeBefore.nodeSize;
        const resolvedBeforeSpace = view.state.doc.resolve(posBeforeSpace);
        if (resolvedBeforeSpace.nodeBefore?.type.name === 'visual_footnote_ref') {
          footnoteRefPos = posBeforeSpace - resolvedBeforeSpace.nodeBefore.nodeSize;
          spaceCountAfterRef = spaceLen;
        }
      }

      if (footnoteRefPos >= 0) {
        let baselineTop: number | null = null;
        let baselineHeight: number | null = null;
        let refRight: number | null = null;

        try {
          const supCoords = view.coordsAtPos(footnoteRefPos + 1, -1);
          if (supCoords) refRight = supCoords.right;
        } catch { /* ignore */ }

        // 1) 각주 직전의 본문 단어(텍스트) 기하학 획득
        if (footnoteRefPos > $from.start()) {
          try {
            const textCoords = view.coordsAtPos(footnoteRefPos, -1);
            if (textCoords && textCoords.bottom > textCoords.top) {
              baselineTop = textCoords.top;
              baselineHeight = textCoords.bottom - textCoords.top;
            }
          } catch { /* ignore */ }
        }

        // 2) 각주 뒤에 본문 텍스트가 있는 경우
        if (!baselineTop && $from.pos < $from.end()) {
          try {
            const nextTextCoords = view.coordsAtPos($from.pos, 1);
            if (nextTextCoords && nextTextCoords.bottom > nextTextCoords.top) {
              baselineTop = nextTextCoords.top;
              baselineHeight = nextTextCoords.bottom - nextTextCoords.top;
            }
          } catch { /* ignore */ }
        }

        // 3) 폴백: 상위 블록(p, li, h1~h6) 계산 기하학
        const targetNode = view.domAtPos($from.pos).node;
        const targetEl = targetNode instanceof Element ? targetNode : targetNode.parentElement;
        const blockEl = targetEl?.closest('p, h1, h2, h3, h4, h5, h6, li') || (view.nodeDOM($from.before()) as HTMLElement | null) || null;
        let fontSize = 16;
        if (blockEl && view.dom.contains(blockEl)) {
          const effectiveEl = (blockEl.tagName === 'LI' ? (blockEl.querySelector('p') || blockEl) : blockEl) as HTMLElement;
          const style = getComputedStyle(effectiveEl);
          fontSize = parseFloat(style.fontSize) || 16;
          if (!baselineTop) {
            const box = effectiveEl.getBoundingClientRect();
            const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
            const paddingTop = parseFloat(style.paddingTop) || 0;
            baselineHeight = Math.max(22, Math.round(fontSize * 1.45));
            baselineTop = box.top + paddingTop + Math.round((lineHeight - baselineHeight) / 2);
          }
        }

        if (baselineTop !== null && baselineHeight !== null) {
          const baseLeft = refRight ?? (coordsBefore ? coordsBefore.right : rect.left);
          const approxSpaceWidth = fontSize * 0.35;
          const leftOffset = spaceCountAfterRef > 0 ? (spaceCountAfterRef * approxSpaceWidth) : 1;
          const finalLeft = baseLeft + leftOffset;
          rect = {
            left: finalLeft,
            right: finalLeft + 3,
            top: baselineTop,
            bottom: baselineTop + baselineHeight,
          };
        }
      }

      // 🛡️ [trailingBreak 결함 방어 1]: 텍스트 끝 공백 입력 시 domRect가 다음 행(trailingBreak)으로 떨어지는 현상 교정
      // 이때 문자 우측(coordsBefore.right)에 캐럿을 위치시켜 공백 입력 시 커서가 우측으로 자연스럽게 전진하도록 보장
      // 단, Enter(hard_break) 직후에는 커서가 실제로 다음 행으로 내려가야 하므로 방어 대상에서 제외
      const isAfterHardBreak = Boolean(
        $from.nodeBefore && ($from.nodeBefore.type.name === 'hard_break' || $from.nodeBefore.type.name === 'visual_hard_break')
      );
      if (!isAfterHardBreak && coordsBefore && domRect && domRect.top > coordsBefore.top + 10) {
        rect = {
          left: coordsBefore.right,
          right: coordsBefore.right + 3,
          top: coordsBefore.top,
          bottom: coordsBefore.bottom,
        };
      }

      // 🌟 [Enter(hard_break) 직후 다음 행 캐럿 즉시 하강 보장]:
      // 인라인 마크다운 태그(굵게, 기울임, 밑줄, 취소선, 인라인코드 등)가 적용된 문구/문장에서 Enter 입력 시
      // coordsBefore가 이전 줄의 <br>을 가리켜 커서가 윗줄 끝에 머무는 현상을 방지하고 다음 줄 시작 위치로 즉시 이동
      if (isAfterHardBreak) {
        const hasNextInlineContent = Boolean(
          $from.nodeAfter && $from.nodeAfter.type.name !== 'hard_break' && $from.nodeAfter.type.name !== 'visual_hard_break'
        );
        if (hasNextInlineContent) {
          try {
            const coordsAfter = view.coordsAtPos($from.pos, 1);
            if (coordsAfter && coordsAfter.bottom > coordsAfter.top) {
              if (!domRect || domRect.height === 0 || (coordsBefore && domRect.top <= coordsBefore.top + 4)) {
                rect = {
                  left: coordsAfter.left,
                  right: coordsAfter.left + 3,
                  top: coordsAfter.top,
                  bottom: coordsAfter.bottom,
                };
              }
            }
          } catch { /* ignore */ }
        } else {
          const targetNode = view.domAtPos($from.pos).node;
          const targetEl = targetNode instanceof Element ? targetNode : targetNode.parentElement;
          const blockEl = targetEl?.closest('p, h1, h2, h3, h4, h5, h6, li, td, th') || (view.nodeDOM($from.before()) as HTMLElement | null) || null;
          if (blockEl && view.dom.contains(blockEl)) {
            const effectiveEl = (blockEl.tagName === 'LI' ? (blockEl.querySelector('p') || blockEl) : blockEl) as HTMLElement;
            const box = effectiveEl.getBoundingClientRect();
            const style = getComputedStyle(effectiveEl);
            const fontSize = parseFloat(style.fontSize) || 16;
            const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
            const paddingTop = parseFloat(style.paddingTop) || 0;
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            const left = box.left + paddingLeft;

            let caretHeight = Math.max(22, Math.round(fontSize * 1.45));
            let top = box.top + paddingTop + Math.round((lineHeight - caretHeight) / 2);
            let resolvedNewLine = false;

            if ($from.pos === $from.end()) {
              const trailingBr = effectiveEl.querySelector('br.ProseMirror-trailingBreak');
              if (trailingBr) {
                try {
                  const brRange = document.createRange();
                  brRange.selectNode(trailingBr);
                  const brRect = brRange.getClientRects()[0];
                  if (brRect && brRect.height > 0 && (!coordsBefore || brRect.top > coordsBefore.top + 4)) {
                    top = brRect.top;
                    caretHeight = brRect.height;
                    resolvedNewLine = true;
                  }
                } catch { /* ignore */ }
              }
            }

            if (!resolvedNewLine && domRect && domRect.height > 0 && (!coordsBefore || domRect.top > coordsBefore.top + 4)) {
              top = domRect.top;
              caretHeight = domRect.height;
              resolvedNewLine = true;
            }

            if (!resolvedNewLine) {
              try {
                const coordsAfter = view.coordsAtPos($from.pos, 1);
                if (coordsAfter && coordsAfter.bottom > coordsAfter.top && (!coordsBefore || coordsAfter.top > coordsBefore.top + 4)) {
                  top = coordsAfter.top;
                  caretHeight = coordsAfter.bottom - coordsAfter.top;
                  resolvedNewLine = true;
                }
              } catch { /* ignore */ }
            }

            if (!resolvedNewLine) {
              let prevLineTop = coordsBefore ? coordsBefore.top : null;
              const breakPos = $from.pos - ($from.nodeBefore?.nodeSize || 1);
              if (breakPos > $from.start()) {
                try {
                  const textBeforeBreak = view.coordsAtPos(breakPos, -1);
                  if (textBeforeBreak && textBeforeBreak.bottom > textBeforeBreak.top) {
                    prevLineTop = textBeforeBreak.top;
                    caretHeight = textBeforeBreak.bottom - textBeforeBreak.top;
                  }
                } catch { /* ignore */ }
              }
              if (prevLineTop !== null) {
                top = prevLineTop + lineHeight;
              }
            }

            rect = { left, right: left + 3, top, bottom: top + caretHeight };
          }
        }
      }

      // 🛡️ [trailingBreak 결함 방어 2]: 빈 문단 또는 공백만 있는 문단/리스트에서 커서가 다음 행(Line 2)으로 추락하는 현상 100% 차단
      const isTextblock = $from.parent.isTextblock;
      const hasHardBreak = Boolean(
        ($from.nodeBefore && ($from.nodeBefore.type.name === 'hard_break' || $from.nodeBefore.type.name === 'visual_hard_break')) ||
        ($from.nodeAfter && ($from.nodeAfter.type.name === 'hard_break' || $from.nodeAfter.type.name === 'visual_hard_break'))
      );
      const isOnlyWhitespace = isTextblock && !$from.parent.textContent.trim() && !hasHardBreak;
      if (isOnlyWhitespace) {
        const targetNode = view.domAtPos($from.pos).node;
        const targetEl = targetNode instanceof Element ? targetNode : targetNode.parentElement;
        const blockEl = targetEl?.closest('p, h1, h2, h3, h4, h5, h6, li') || (view.nodeDOM($from.before()) as HTMLElement | null) || null;
        if (blockEl && view.dom.contains(blockEl)) {
          // li 노드뷰 내부인 경우 실제 텍스트가 렌더링되는 p 요소를 기준으로 기하학 산출
          const effectiveEl = (blockEl.tagName === 'LI' ? (blockEl.querySelector('p') || blockEl) : blockEl) as HTMLElement;
          const box = effectiveEl.getBoundingClientRect();
          const style = getComputedStyle(effectiveEl);
          const fontSize = parseFloat(style.fontSize) || 16;
          const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
          const paddingTop = parseFloat(style.paddingTop) || 0;
          const paddingLeft = parseFloat(style.paddingLeft) || 0;
          
          // 🛡️ 기본 계산: 텍스트 실제 렌더링 높이(fontSize * 1.45)에 맞추어 텍스트 입력 시와 동일한 라인박스 높이 산출
          let caretHeight = Math.max(22, Math.round(fontSize * 1.45));
          let top = box.top + paddingTop + Math.round((lineHeight - caretHeight) / 2);

          // 🌟 [TrailingBreak 정밀 측정]: 빈 문단/리스트 내 br.ProseMirror-trailingBreak 요소를 직접 측정하여 글자 입력 시(rectText)와 1:1 완벽 일치 보장 (아래 처짐 및 타이핑 시 수직 점프 0px 방어)
          const brEl = effectiveEl.querySelector('br.ProseMirror-trailingBreak') || effectiveEl.querySelector('br');
          if (brEl) {
            try {
              const brRange = document.createRange();
              brRange.selectNode(brEl);
              const brRect = brRange.getClientRects()[0];
              if (brRect && brRect.height > 0) {
                top = brRect.top;
                caretHeight = brRect.height;
              }
            } catch { /* ignore fallback to computed */ }
          }

          let left = box.left + paddingLeft;
          if ($from.parentOffset > 0) {
            if (coordsBefore && coordsBefore.right >= left) {
              left = coordsBefore.right;
            } else {
              const approxSpaceWidth = fontSize * 0.35;
              left = left + ($from.parentOffset * approxSpaceWidth);
            }
          }
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
