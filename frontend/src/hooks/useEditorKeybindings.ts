/**
 * ============================================================================
 * 🏷️ 파일명 : useEditorKeybindings.ts
 * 🎯 주요기능 :
 *   - Monaco 에디터 단축키 액션 등록(customHotkeys) 및 전역 키보드 이벤트(handleGlobalKeyDown) 분기 라우팅 제어 훅
 *   - Windows Meta(Win) 키 가드, Shift+방향키 선택 보호, 비주얼 에디터/그림책 단축키 연동
 * 🚨 @PATCH :
 *   - 2026-11-07 : [플로팅 툴바 커서 반환]: Escape 키 입력 시 closeFloatingToolbarAndRestoreCursor 호출 연동
 *   - 2026-11-04 : 주석 표준화(1·2단계) 적용
 *   - 2026-11-04 : MainEditorApp에서 Monaco 액션 바인딩 및 전역 keydown 리스너 로직을 독립 훅으로 분리
 * ============================================================================
 */
// @ts-nocheck
import { useEffect, useRef } from 'react';
import { TOOLBAR_ITEMS, configuredHotkeyItem } from '@/lib/toolbarConfig';

export interface UseEditorKeybindingsProps {
  editorRef: any;
  customHotkeys: Record<string, string>;
  isEditorReady: boolean;
  dispatchCommand: (cmd: any) => void;
  mapIdToCommandType: (id: string) => any;
  geminiApiKey?: string;
  showToast: (msg: string, type?: string) => void;
  previewModeRef: React.MutableRefObject<string>;
  activeTabIdRef: React.MutableRefObject<string | null>;
  contentRef: React.MutableRefObject<string>;
  setAiEditorContext: (ctx: any) => void;
  setAiDraftInitialMode: (mode: any) => void;
  setIsAIDraftModalOpen: (open: boolean) => void;
  floatingToolbar: { visible: boolean; [key: string]: any };
  setFloatingToolbar: React.Dispatch<React.SetStateAction<any>>;
  floatingQuoteDropdown: { open: boolean; [key: string]: any };
  isRestrictedUser?: boolean;
  closeFloatingToolbarAndRestoreCursor?: () => void;
}

/**
 * ============================================================================
 * [useEditorKeybindings]
 * Monaco 에디터 사용자 정의 단축키 바인딩 및 전역 키보드 단축키 캡처 리스너를 등록합니다.
 *
 * @param {UseEditorKeybindingsProps} props - 에디터 참조, 단축키 설정, 명령 디스패처 등
 * ============================================================================
 */
export function useEditorKeybindings({
  editorRef,
  customHotkeys,
  isEditorReady,
  dispatchCommand,
  mapIdToCommandType,
  geminiApiKey,
  showToast,
  previewModeRef,
  activeTabIdRef,
  contentRef,
  setAiEditorContext,
  setAiDraftInitialMode,
  setIsAIDraftModalOpen,
  floatingToolbar,
  setFloatingToolbar,
  floatingQuoteDropdown,
  isRestrictedUser,
  closeFloatingToolbarAndRestoreCursor
}: UseEditorKeybindingsProps) {
  const hotkeyDisposablesRef = useRef<any[]>([]);

  // 1. Monaco Editor 인스턴스에 사용자 정의 단축키 및 저장 액션 바인딩
  useEffect(() => {
    if (!editorRef.current || !(window as any).monaco) return;
    const editor = editorRef.current;
    const monaco = (window as any).monaco;

    hotkeyDisposablesRef.current.forEach(d => d.dispose());
    hotkeyDisposablesRef.current = [];

    // 글로벌 trigger-custom-action 명령어를 위한 최신 디스패처 갱신
    if (typeof window !== 'undefined') {
      (window as any).dispatchEditorCommand = (id: string) => {
        if (id === 'custom-action-knowledge-manager' || id === 'knowledge') {
          window.dispatchEvent(new CustomEvent('app:open-knowledge-manager'));
          return;
        }

        if (id === 'AI_MODAL') {
          if (!geminiApiKey) {
            showToast("AI 기능을 사용하려면 설정(톱니바퀴)에서 Gemini API Key를 등록해 주세요.", "warning");
            dispatchCommand('SETTINGS');
            return;
          }
          if (!activeTabIdRef.current || previewModeRef.current === 'preview') {
            showToast('편집 모드에서 문서가 열려있을 때만 사용 가능합니다.', 'warning');
            return;
          }
          const currentEditor = editorRef.current;
          const selection = currentEditor ? currentEditor.getSelection() : null;
          const model = currentEditor ? currentEditor.getModel() : null;
          let selectedText = '';
          let fullText = contentRef.current || '';
          if (currentEditor && model) {
            fullText = model.getValue();
            if (selection && !selection.isEmpty()) {
              selectedText = model.getValueInRange(selection);
            }
          }
          setAiEditorContext({ selectedText, fullText });
          setAiDraftInitialMode(selectedText ? 'editorial' : 'draft');
          setIsAIDraftModalOpen(true);
          return;
        }
        const cmdType = mapIdToCommandType(id);
        dispatchCommand(cmdType);
      };
    }

    const parseKeybinding = (keyStr: string) => {
      if (!keyStr) return 0;
      let binding = 0;
      const parts = keyStr.split('+').map(p => p.trim().toUpperCase());
      if (parts.includes('CTRL') || parts.includes('CTRLCMD')) binding |= monaco.KeyMod.CtrlCmd;
      if (parts.includes('SHIFT')) binding |= monaco.KeyMod.Shift;
      if (parts.includes('ALT')) binding |= monaco.KeyMod.Alt;
      if (parts.includes('WIN') || parts.includes('META')) binding |= monaco.KeyMod.WinCtrl;

      const keyPart = parts[parts.length - 1];
      if (keyPart.length === 1 && keyPart >= 'A' && keyPart <= 'Z') {
        binding |= monaco.KeyCode[`Key${keyPart}`];
      } else if (keyPart >= '0' && keyPart <= '9') {
        binding |= monaco.KeyCode[`Digit${keyPart}`];
      } else if (keyPart === '-') {
        binding |= monaco.KeyCode.Minus;
      } else if (keyPart === '=') {
        binding |= monaco.KeyCode.Equal;
      } else if (keyPart === '\\') {
        binding |= monaco.KeyCode.Backslash;
      } else if (keyPart === '[') {
        binding |= monaco.KeyCode.BracketLeft;
      } else if (keyPart === ']') {
        binding |= monaco.KeyCode.BracketRight;
      } else if (keyPart === ';') {
        binding |= monaco.KeyCode.Semicolon;
      } else if (keyPart === "'") {
        binding |= monaco.KeyCode.Quote;
      } else if (keyPart === ',') {
        binding |= monaco.KeyCode.Comma;
      } else if (keyPart === '.') {
        binding |= monaco.KeyCode.Period;
      } else if (keyPart === '/') {
        binding |= monaco.KeyCode.Slash;
      } else if (keyPart === 'SPACE') {
        binding |= monaco.KeyCode.Space;
      } else if (keyPart === 'ENTER') {
        binding |= monaco.KeyCode.Enter;
      } else if (keyPart === 'DELETE') {
        binding |= monaco.KeyCode.Delete;
      } else if (keyPart === 'BACKSPACE') {
        binding |= monaco.KeyCode.Backspace;
      } else if (keyPart === 'TAB') {
        binding |= monaco.KeyCode.Tab;
      } else if (keyPart === 'ESCAPE' || keyPart === 'ESC') {
        binding |= monaco.KeyCode.Escape;
      } else if (keyPart.length >= 2 && keyPart.startsWith('F')) {
        const fNum = parseInt(keyPart.substring(1));
        if (fNum >= 1 && fNum <= 12) {
          binding |= monaco.KeyCode[`F${fNum}`];
        }
      }
      return binding;
    };

    TOOLBAR_ITEMS.forEach(item => {
      const kbStr = (customHotkeys && customHotkeys[item.id]) ? customHotkeys[item.id] : item.defaultHotkey;
      const kb = kbStr ? parseKeybinding(kbStr) : 0;
      const keybindings = kb !== 0 ? [kb] : [];

      if (item.id === 'signature') {
        const altKb = parseKeybinding('Ctrl+Alt+S');
        if (altKb && !keybindings.includes(altKb)) {
          keybindings.push(altKb);
        }
      }

      const disposable = editor.addAction({
        id: `custom-action-${item.id}`,
        label: `${item.name} (${item.group})`,
        keybindings,
        run: () => {
          const cmdType = mapIdToCommandType(item.id);
          dispatchCommand(cmdType);
        }
      });
      hotkeyDisposablesRef.current.push(disposable);
    });

    const saveAction = editor.addAction({
      id: 'custom-action-save',
      label: '저장 (Save)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        dispatchCommand('SAVE');
      }
    });
    hotkeyDisposablesRef.current.push(saveAction);

    const saveAsAction = editor.addAction({
      id: 'custom-action-save-as',
      label: '다른 이름으로 저장 (Save As)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS],
      run: () => {
        dispatchCommand('SAVE_AS');
      }
    });
    hotkeyDisposablesRef.current.push(saveAsAction);
  }, [customHotkeys, isEditorReady, dispatchCommand, mapIdToCommandType, geminiApiKey, showToast, activeTabIdRef, contentRef, editorRef, previewModeRef, setAiDraftInitialMode, setAiEditorContext, setIsAIDraftModalOpen]);

  // 2. 전역 키보드 이벤트 리스너 (capture 단계)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const findModifier = e.ctrlKey || (e.metaKey && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent));
      if (!e.isComposing && findModifier && !e.altKey && !e.shiftKey && previewModeRef.current !== 'edit' && ['f', 'h'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation();
        dispatchCommand(e.key.toLowerCase() === 'h' ? 'REPLACE' : 'FIND');
        return;
      }

      if ((e.target as HTMLElement)?.closest?.('.picturebook-scene-input')) {
        const item = configuredHotkeyItem(e, customHotkeys);
        if (item && ['save', 'saveAs'].includes(item.id)) {
          e.preventDefault(); e.stopPropagation(); dispatchCommand(mapIdToCommandType(item.id));
        }
        return;
      }
      if ((e.target as HTMLElement)?.closest?.('.visual-document-editor')) {
        const item = configuredHotkeyItem(e, customHotkeys);
        if (item) {
          e.preventDefault(); e.stopPropagation();
          dispatchCommand(mapIdToCommandType(item.id));
        }
        return;
      }

      if (typeof e.getModifierState !== 'function') {
        return;
      }

      // Shift+방향키 가드: Monaco 텍스트 선택 동작 보호
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key.startsWith('Arrow') || e.code.startsWith('Arrow'))) {
        return;
      }

      // Windows/Linux 환경에서 Meta(Win) 키 단축키 조기 반환 가드
      const isMac = /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent);
      if (!isMac && (e.metaKey || e.getModifierState('Meta') || e.key === 'Meta')) {
        return;
      }

      const isInsideMonaco = (e.target as HTMLElement)?.closest('.monaco-editor');

      // Escape 키 처리
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (floatingQuoteDropdown?.open) {
          return;
        }
        if (floatingToolbar?.visible) {
          e.preventDefault();
          e.stopPropagation();
          if (closeFloatingToolbarAndRestoreCursor) {
            closeFloatingToolbarAndRestoreCursor();
          } else {
            setFloatingToolbar(prev => ({ ...prev, visible: false }));
            if (editorRef.current) {
              editorRef.current.focus();
            }
          }
          return;
        }
      }

      const isCtrl = isMac ? e.metaKey : e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      if (!isInsideMonaco) {
        if (isCtrl && !isAlt && e.key.toLowerCase() === 's') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand(isShift ? 'SAVE_AS' : 'SAVE');
          return;
        }
        if (isCtrl && !isAlt && !isShift && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('OPEN');
          return;
        }
        if (isCtrl && !isAlt && !isShift && e.key.toLowerCase() === 'p') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('PRINT');
          return;
        }
        if (isCtrl && !isAlt && !isShift && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('FIND');
          return;
        }
        if (isCtrl && !isAlt && !isShift && e.key.toLowerCase() === 'h') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('REPLACE');
          return;
        }
        if (isCtrl && isShift && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          e.stopPropagation();
          dispatchCommand('SEARCH_ALL');
          return;
        }
      }

      let key = e.key.toUpperCase();

      if (e.code.startsWith('Digit')) {
        key = e.code.substring(5);
      }

      if (isCtrl || isAlt) {
        if (e.code && e.code.startsWith('Key')) {
          key = e.code.substring(3).toUpperCase();
        } else if (e.code && e.code.startsWith('Digit')) {
          key = e.code.substring(5);
        } else if (e.code === 'Backslash' || e.key === '\\' || e.key === '₩') {
          key = '\\';
        }
      }

      const combinationParts: string[] = [];
      if (isCtrl) combinationParts.push('CTRL');
      if (isShift) combinationParts.push('SHIFT');
      if (isAlt) combinationParts.push('ALT');
      combinationParts.push(key);

      const combinationStr = combinationParts.join('+');

      for (const item of TOOLBAR_ITEMS) {
        const configuredHotkey = (customHotkeys[item.id] !== undefined ? customHotkeys[item.id] : item.defaultHotkey);
        if (!configuredHotkey) continue;

        const normalizedConfig = configuredHotkey
          .replace(/\s+/g, '')
          .toUpperCase()
          .replace('CTRLCMD', 'CTRL');

        if (
          combinationStr === normalizedConfig ||
          (item.id === 'signature' && (combinationStr === 'CTRL+ALT+R' || combinationStr === 'CTRL+ALT+S'))
        ) {
          e.preventDefault();
          e.stopPropagation();

          const cmdType = mapIdToCommandType(item.id);
          dispatchCommand(cmdType);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [customHotkeys, dispatchCommand, mapIdToCommandType, floatingToolbar?.visible, setFloatingToolbar, floatingQuoteDropdown?.open, isRestrictedUser, editorRef, previewModeRef, closeFloatingToolbarAndRestoreCursor]);
}
