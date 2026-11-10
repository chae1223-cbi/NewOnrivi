/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : findWidgetHelper.ts
 * -----------------------------------------------------------------------
 * 변경내역
 * -----------------------------------------------------------------------
 * <2026.09.11> 최초작성
 * 작성자 : 채병익
 * 🚨 @PATCH : **2026-11-10** — [Monaco 찾기/바꾸기 위젯 컨테이너 레벨 ESC 키 캡처 바인딩 보강]:
 *             1) findWidget 컨테이너 레벨에 캡처링 모드 ESC 키 리스너를 바인딩하여, 위젯 내 어떤 자식 요소나 입력 상태에서도 ESC 입력 시 즉시 위젯 닫기 및 에디터 포커스 복원 보장
 * 🚨 @PATCH : **2026-09-11** — Monaco 찾기/바꾸기 위젯 실행 시 DOM 강제 포커스, Enter 키 '다음 찾기(Find Next)' 및 ESC 키 '위젯 닫기 및 에디터 포커스 복원' 이벤트 100% 보장 유틸리티 신설
 * -----------------------------------------------------------------------
 */

export function openAndFocusFindWidget(editor: any, isReplace: boolean = false) {
  if (!editor) return;

  try {
    const controller = editor.getContribution('editor.contrib.findController') as any;
    if (controller) {
      controller.start({
        forceRevealReplace: isReplace,
        seedSearchStringFromSelection: 'single',
        shouldFocus: 1, // 1 = FindInput focus
        shouldAnimate: false, // 애니메이션 지연 없이 즉각 표시
        updateSearchScope: false
      });
    } else {
      editor.trigger('keyboard', isReplace ? 'editor.action.startFindReplaceAction' : 'actions.find', null);
    }
  } catch (_) {
    editor.trigger('keyboard', isReplace ? 'editor.action.startFindReplaceAction' : 'actions.find', null);
  }

  // DOM 포커스 및 Enter 키 이벤트 바인딩
  const tryFocusAndBind = () => {
    const domNode = editor.getDomNode?.() || (typeof document !== 'undefined' ? document.body : null);
    if (!domNode) return false;

    const findWidget = domNode.querySelector('.find-widget') || document.querySelector('.find-widget');
    if (!findWidget) return false;

    // 🛡️ [컨테이너 레벨 ESC 닫기 보장]: 위젯 내 어떤 자식 요소나 포커스 상태에서도 ESC 입력 시 즉시 닫힘
    if (!(findWidget as any).__onrivi_container_esc_bound) {
      (findWidget as any).__onrivi_container_esc_bound = true;
      findWidget.addEventListener(
        'keydown',
        (e: any) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            try {
              const controller = editor.getContribution('editor.contrib.findController') as any;
              if (controller) {
                controller.closeFindWidget();
              } else {
                editor.trigger('keyboard', 'closeFindWidget', null);
              }
            } catch (_) {
              editor.trigger('keyboard', 'closeFindWidget', null);
            }
            editor.focus();
          }
        },
        true
      );
    }

    const findInput = findWidget.querySelector('.find-part textarea, .find-part input') as HTMLTextAreaElement | HTMLInputElement | null;
    const replaceInput = findWidget.querySelector('.replace-part textarea, .replace-part input') as HTMLTextAreaElement | HTMLInputElement | null;

    const targetInput = isReplace && replaceInput ? replaceInput : (findInput || replaceInput);

    if (targetInput) {
      targetInput.focus();
      try {
        targetInput.select?.();
      } catch (_) {}
    }

    // findInput 엔터 및 ESC 키 바인딩
    if (findInput && !(findInput as any).__onrivi_find_bound) {
      (findInput as any).__onrivi_find_bound = true;
      findInput.addEventListener('keydown', (e: any) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            editor.trigger('findWidget', 'editor.action.previousMatchFindAction', null);
          } else {
            editor.trigger('findWidget', 'editor.action.nextMatchFindAction', null);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          try {
            const controller = editor.getContribution('editor.contrib.findController') as any;
            if (controller) {
              controller.closeFindWidget();
            } else {
              editor.trigger('keyboard', 'closeFindWidget', null);
            }
          } catch (_) {
            editor.trigger('keyboard', 'closeFindWidget', null);
          }
          editor.focus();
        }
      });
    }

    // replaceInput 엔터 및 ESC 키 바인딩
    if (replaceInput && !(replaceInput as any).__onrivi_replace_bound) {
      (replaceInput as any).__onrivi_replace_bound = true;
      replaceInput.addEventListener('keydown', (e: any) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          editor.trigger('findWidget', 'editor.action.replaceOne', null);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          try {
            const controller = editor.getContribution('editor.contrib.findController') as any;
            if (controller) {
              controller.closeFindWidget();
            } else {
              editor.trigger('keyboard', 'closeFindWidget', null);
            }
          } catch (_) {
            editor.trigger('keyboard', 'closeFindWidget', null);
          }
          editor.focus();
        }
      });
    }

    return Boolean(targetInput);
  };

  tryFocusAndBind();
  setTimeout(tryFocusAndBind, 15);
  setTimeout(tryFocusAndBind, 50);
  setTimeout(tryFocusAndBind, 120);
  setTimeout(tryFocusAndBind, 250);
}
