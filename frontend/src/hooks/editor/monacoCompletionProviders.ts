// @ts-nocheck
// ============================================================================
// 📂 파일명 : frontend/src/hooks/editor/monacoCompletionProviders.ts
// 📌 역할   : Monaco 에디터 슬래시(/) 커맨드 및 [[ 위키링크 자동완성 프로바이더·전역 커맨드·Suggest 위젯 스타일 주입 모듈
// 🚨 @PATCH : 2026-11-04 — [useMonacoSetup.ts 모듈 분리 리팩토링 (1순위 아키텍처 경량화)]:
//             1) Suggest Widget 왼쪽 정렬 CSS 주입 함수(injectMonacoSuggestStyles) 추출
//             2) 전역 슬래시 액션(trigger-custom-action, select-slash-placeholder) 및 자동완성 프로바이더(_customSlashProvider, _customWikilinkProvider) 추출
// 🔗 @CALLS : getSlashCommands, extractHeadings, getRelativePath
// ============================================================================

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : Monaco Suggest Widget의 서식 설명 열 왼쪽 정렬 전용 스타일시트 동적 주입
 * ----------------------------------------------------------------------------
 */
export function injectMonacoSuggestStyles() {
  if (typeof document !== 'undefined' && !document.getElementById('onrivi-monaco-suggest-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'onrivi-monaco-suggest-styles';
    styleEl.textContent = `
      .suggest-widget,
      .monaco-editor .suggest-widget {
        min-width: 440px !important;
        width: 440px !important;
      }
      .suggest-widget .monaco-list .monaco-list-row .contents,
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: 100% !important;
      }
      .suggest-widget .monaco-list .monaco-list-row .contents > .main,
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents > .main {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        width: 100% !important;
        gap: 0px !important;
      }
      .suggest-widget .monaco-list .monaco-list-row .contents > .main > .left,
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents > .main > .left {
        flex: 0 0 215px !important;
        width: 215px !important;
        min-width: 215px !important;
        max-width: 215px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .suggest-widget .monaco-list .monaco-list-row .contents > .main > .right,
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents > .main > .right {
        flex: 1 1 auto !important;
        display: flex !important;
        justify-content: flex-start !important;
        align-items: center !important;
        text-align: left !important;
        margin-left: 0 !important;
        padding-left: 4px !important;
        max-width: none !important;
      }
      .suggest-widget .monaco-list .monaco-list-row .contents > .main > .right > .details-label,
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents > .main > .right > .details-label {
        text-align: left !important;
        width: 100% !important;
        margin-left: 0 !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : Monaco 에디터에 슬래시(/) 커맨드 및 [[ 위키링크 자동완성 프로바이더와 전역 액션 커맨드 등록
 * ----------------------------------------------------------------------------
 * - 입력값(Params) : editor (Monaco Editor), monaco (Monaco API), depsRef (의존성 Ref)
 * ----------------------------------------------------------------------------
 */
export function registerMonacoCompletionProviders(editor: any, monaco: any, depsRef: any) {
  const {
    getSlashCommands,
    customSlashCommandsRef,
    docLinkFilesRef,
    currentFileNodeRef,
    readFileTextRef,
    extractHeadings,
    getRelativePath,
  } = depsRef.current;

  // 전역 1회 커맨드 등록 (슬래시 커맨드 선택 후 모달 오픈 또는 플레이스홀더 블록 지정)
  if (!(monaco.editor as any)._customTriggerActionRegistered) {
    (monaco.editor as any)._customTriggerActionRegistered = true;
    monaco.editor.registerCommand('trigger-custom-action', (_accessor: any, actionType: string) => {
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).dispatchEditorCommand) {
          (window as any).dispatchEditorCommand(actionType);
        }
      }, 10);
    });
    monaco.editor.registerCommand('select-slash-placeholder', (_accessor: any, placeholderText: string) => {
      setTimeout(() => {
        const activeEditor = depsRef.current?.editorRef?.current;
        if (!activeEditor) return;
        const pos = activeEditor.getPosition();
        const model = activeEditor.getModel();
        if (!pos || !model) return;
        const lineContent = model.getLineContent(pos.lineNumber);
        const searchEnd = pos.column - 1;
        const beforeCursor = lineContent.substring(0, searchEnd);
        const idx = beforeCursor.lastIndexOf(placeholderText);
        if (idx !== -1) {
          const startCol = idx + 1;
          const endCol = startCol + placeholderText.length;
          activeEditor.setSelection(new monaco.Selection(pos.lineNumber, startCol, pos.lineNumber, endCol));
        }
      }, 20);
    });
  }

  // 1. 슬래시(/) 커맨드 자동완성 프로바이더
  if ((monaco.languages as any)._customSlashProvider) {
    (monaco.languages as any)._customSlashProvider.dispose();
  }
  (monaco.languages as any)._customSlashProvider = monaco.languages.registerCompletionItemProvider('markdown', {
    triggerCharacters: ['/'],
    provideCompletionItems: (model: any, position: any) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const slashMatch = textUntilPosition.match(/(^|\s)(\/\S*)$/);
      if (!slashMatch) {
        return { suggestions: [] };
      }

      const slashWord = slashMatch[2];
      if (!slashWord.startsWith('/')) {
        return { suggestions: [] };
      }

      const startColumn = position.column - slashWord.length;
      const suggestions = getSlashCommands(monaco, customSlashCommandsRef.current);
      const filterWord = slashWord.slice(1).toLowerCase().trim();

      const filtered = filterWord.length === 0
        ? suggestions
        : suggestions.filter((s: any) => {
            const labelStr = typeof s.label === 'string' ? s.label : '';
            const filterStr = typeof s.filterText === 'string' ? s.filterText : '';
            const detailStr = typeof s.detail === 'string' ? s.detail : '';
            return (
              labelStr.toLowerCase().includes(filterWord) ||
              filterStr.toLowerCase().includes(filterWord) ||
              detailStr.toLowerCase().includes(filterWord)
            );
          });

      return {
        suggestions: filtered.map((s: any, idx: number) => {
          const labelStr = typeof s.label === 'string' ? s.label : '';
          const filterStr = typeof s.filterText === 'string' ? s.filterText : '';
          const isDirectMatch = labelStr.toLowerCase().includes(filterWord) || filterStr.toLowerCase().includes('/' + filterWord);
          return {
            ...s,
            sortText: isDirectMatch ? String(idx).padStart(4, '0') : 'z_' + String(idx).padStart(4, '0'),
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: startColumn,
              endColumn: position.column
            }
          };
        })
      };
    }
  });

  // 2. [[ 위키 링크 자동완성 (파일 + 헤딩) 프로바이더
  if ((monaco.languages as any)._customWikilinkProvider) {
    (monaco.languages as any)._customWikilinkProvider.dispose();
  }
  (monaco.languages as any)._customWikilinkProvider = monaco.languages.registerCompletionItemProvider('markdown', {
    triggerCharacters: ['[', '#'],
    provideCompletionItems: async (model: any, position: any) => {
      const textUntilPos = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: Math.max(1, position.column - 80),
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      const bracketMatch = textUntilPos.match(/\[\[([^\]\n]*)$/);
      if (!bracketMatch) return { suggestions: [] };
      const inside = bracketMatch[1];
      const hashIdx = inside.indexOf('#');
      const files = docLinkFilesRef.current;
      const curPath = currentFileNodeRef.current?.path || '';
      if (hashIdx >= 0) {
        const fileMatch = inside.substring(0, hashIdx);
        const headingFilter = inside.substring(hashIdx + 1).toLowerCase();
        let targetFile: any = null;
        for (const f of files) {
          if (f.path?.toLowerCase().includes(fileMatch.toLowerCase()) || f.name?.toLowerCase().includes(fileMatch.toLowerCase())) {
            targetFile = f;
            break;
          }
        }
        if (!targetFile) return { suggestions: [] };
        let headings: string[] = [];
        try {
          const text = await readFileTextRef.current(targetFile);
          headings = extractHeadings(text);
        } catch {
          return { suggestions: [] };
        }
        const filtered = headingFilter ? headings.filter(h => h.toLowerCase().includes(headingFilter)) : headings;
        const relPath = getRelativePath(curPath, targetFile.path || '');
        const matchLen = bracketMatch[0].length;
        return {
          suggestions: filtered.map(h => ({
            label: h,
            kind: monaco.languages.CompletionItemKind.Reference,
            insertText: `[${h}](<${relPath}#${h}>)`,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - matchLen,
              endColumn: position.column
            }
          }))
        };
      }
      const fileFilter = inside.toLowerCase();
      const filteredFiles = files.filter((f: any) => {
        if (f.kind === 'directory') return false;
        const name = f.name || '';
        const path = f.path || '';
        return !fileFilter || name.toLowerCase().includes(fileFilter) || path.toLowerCase().includes(fileFilter);
      });
      const matchLen = bracketMatch[0].length;
      return {
        suggestions: filteredFiles.map((f: any) => {
          const relPath = getRelativePath(curPath, f.path || '');
          const cleanName = (f.name || f.path || '').replace(/\.(md|markdown)$/i, '');
          return {
            label: f.name || f.path || '',
            kind: monaco.languages.CompletionItemKind.File,
            insertText: `[${cleanName}](<${relPath}>)`,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - matchLen,
              endColumn: position.column
            }
          };
        })
      };
    }
  });
}
