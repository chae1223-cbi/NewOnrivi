// @ts-nocheck
// ============================================================================
// 📂 파일명 : frontend/src/hooks/editor/monacoClipboardAndDrop.ts
// 📌 역할   : Monaco 에디터 클립보드 이미지/텍스트 붙여넣기 및 드래그 앤 드롭 인디케이터·파일 드롭 처리 모듈
// 🚨 @PATCH : 2026-11-04 — [useMonacoSetup.ts 모듈 분리 리팩토링 (1순위 아키텍처 경량화)]:
//             1) 클립보드 붙여넣기(onNativeImagePaste, onEditorPaste) 및 WeakSet 중복 방어 가드 추출
//             2) 드래그 앤 드롭 실시간 타겟 인디케이터(dropIndicatorCaret, dropBadge) 및 로컬/웹 이미지 드롭 처리 추출
// 🔗 @CALLS : desktopClipboardImage, handlePasteImageFile, handleEditorPaste
// ============================================================================

import { desktopClipboardImage } from '@/lib/desktopClipboard';

/**
 * ----------------------------------------------------------------------------
 * 📌 [함수 역할] : Monaco 에디터에 클립보드 붙여넣기 및 드래그 앤 드롭 이벤트 리스너 등록
 * ----------------------------------------------------------------------------
 * - 입력값(Params) : editor (Monaco Editor), monaco (Monaco API), depsRef (의존성 Ref)
 * ----------------------------------------------------------------------------
 */
export function registerMonacoClipboardAndDrop(editor: any, monaco: any, depsRef: any) {
  const { previewModeRef } = depsRef.current;
  const container = editor.getContainerDomNode();
  const editorDom = editor.getDomNode();
  const handledPasteEvents = new WeakSet<ClipboardEvent>();

  const onNativeImagePaste = (event: KeyboardEvent) => {
    if (previewModeRef.current === 'both') return;
    const file = desktopClipboardImage(event);
    if (!file) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void depsRef.current?.handlePasteImageFile?.(file);
  };

  const onEditorPaste = (event: ClipboardEvent) => {
    if (previewModeRef.current === 'both') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (handledPasteEvents.has(event)) return;
    const pasteFn = depsRef.current?.handleEditorPaste;
    if (pasteFn && pasteFn(event, editor)) {
      handledPasteEvents.add(event);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (depsRef.current?.monacoPasteHandlerRef) {
    depsRef.current.monacoPasteHandlerRef.current = onNativeImagePaste;
  }
  if (depsRef.current?.monacoClipboardPasteRef) {
    depsRef.current.monacoClipboardPasteRef.current = onEditorPaste;
  }
  editorDom?.addEventListener('paste', onEditorPaste, true);

  // 실시간 드롭 타겟 위치 인디케이터
  let dropTargetDecoCollection: any = null;
  try {
    dropTargetDecoCollection = editor.createDecorationsCollection([]);
  } catch (_) {}

  let dropIndicatorCaret: HTMLDivElement | null = null;
  let dropBadge: HTMLDivElement | null = null;
  if (editorDom && typeof document !== 'undefined') {
    if (getComputedStyle(editorDom).position === 'static') {
      editorDom.style.position = 'relative';
    }
    dropIndicatorCaret = document.createElement('div');
    dropIndicatorCaret.style.cssText = [
      'position: absolute',
      'pointer-events: none',
      'z-index: 9999',
      'width: 3px',
      'background: #2563eb',
      'border-radius: 2px',
      'box-shadow: 0 0 8px rgba(37, 99, 235, 0.9)',
      'display: none',
      'transition: top 0.04s ease-out, left 0.04s ease-out'
    ].join(';');

    dropBadge = document.createElement('div');
    dropBadge.style.cssText = [
      'position: absolute',
      'bottom: 100%',
      'left: 0',
      'margin-bottom: 3px',
      'padding: 2px 7px',
      'background: #2563eb',
      'color: #ffffff',
      'font-size: 11px',
      'font-weight: 700',
      'font-family: Pretendard, sans-serif',
      'white-space: nowrap',
      'border-radius: 4px',
      'box-shadow: 0 2px 6px rgba(0,0,0,0.25)',
      'pointer-events: none'
    ].join(';');
    dropIndicatorCaret.appendChild(dropBadge);
    editorDom.appendChild(dropIndicatorCaret);
  }

  const hideDropIndicator = () => {
    container?.classList.remove('ring-2', 'ring-blue-500/60', 'ring-inset');
    if (dropIndicatorCaret) dropIndicatorCaret.style.display = 'none';
    if (dropTargetDecoCollection) {
      try { dropTargetDecoCollection.set([]); } catch (_) {}
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (previewModeRef.current === 'both') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    container?.classList.add('ring-2', 'ring-blue-500/60', 'ring-inset');

    try {
      const target = editor.getTargetAtClientPoint(event.clientX, event.clientY);
      const pos = target?.position;
      if (pos) {
        editor.setPosition(pos);
        if (dropTargetDecoCollection) {
          dropTargetDecoCollection.set([
            {
              range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
              options: {
                isWholeLine: true,
                className: 'bg-blue-500/15 border-y border-blue-500/50',
              }
            }
          ]);
        }
        if (dropIndicatorCaret && editorDom) {
          const visiblePos = editor.getScrolledVisiblePosition(pos);
          if (visiblePos) {
            dropIndicatorCaret.style.display = 'block';
            dropIndicatorCaret.style.left = `${visiblePos.left}px`;
            dropIndicatorCaret.style.top = `${visiblePos.top}px`;
            dropIndicatorCaret.style.height = `${visiblePos.height || 26}px`;
            if (dropBadge) {
              dropBadge.textContent = `📥 여기에 삽입 (${pos.lineNumber}행 ${pos.column}열)`;
            }
          }
        }
      }
    } catch (_) {}
  };

  const handleDragLeave = (event: DragEvent) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !container?.contains(related)) {
      hideDropIndicator();
    }
  };

  container?.addEventListener('dragenter', handleDragOver, true);
  container?.addEventListener('dragover', handleDragOver, true);
  container?.addEventListener('dragleave', handleDragLeave, true);
  editorDom?.addEventListener('dragenter', handleDragOver, true);
  editorDom?.addEventListener('dragover', handleDragOver, true);

  const isImageFile = (f: File) =>
    f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(f.name);

  const dataUrlToBlob = (dataUrl: string): { blob: Blob; ext: string } | null => {
    try {
      const [header, base64] = dataUrl.split(',');
      if (!header || !base64) return null;
      const mimeMatch = header.match(/data:(image\/([a-zA-Z0-9+.-]+));base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const rawExt = mimeMatch ? mimeMatch[2].replace('jpeg', 'jpg').replace('svg+xml', 'svg') : 'png';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { blob: new Blob([bytes], { type: mime }), ext: rawExt };
    } catch {
      return null;
    }
  };

  container?.addEventListener('drop', async (event: DragEvent) => {
    hideDropIndicator();
    if (previewModeRef.current === 'both') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const dt = event.dataTransfer;
    if (!dt) return;

    const moveCursorToDropPoint = () => {
      try {
        const target = editor.getTargetAtClientPoint(event.clientX, event.clientY);
        if (target?.position) {
          editor.setPosition(target.position);
          editor.focus();
        }
      } catch (_) {}
    };

    const insertTextAtCursor = (text: string, sourceName = 'drop-insert') => {
      const pos = editor.getPosition();
      if (!pos) return;
      editor.pushUndoStop();
      editor.executeEdits(sourceName, [
        {
          range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
          text,
          forceMoveMarkers: true,
        },
      ]);
      editor.pushUndoStop();
      editor.focus();
    };

    const files = Array.from(dt.files || []);
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      moveCursorToDropPoint();
      for (const imgFile of imageFiles) {
        if (depsRef.current?.handlePasteImageFile) {
          await depsRef.current.handlePasteImageFile(imgFile);
        }
      }
      return;
    }

    if (files.length === 0) {
      const htmlData = dt.getData('text/html');
      const uriData = dt.getData('text/uri-list');
      const plainData = dt.getData('text/plain');

      if (htmlData && /<img\b/i.test(htmlData)) {
        const srcMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          event.preventDefault();
          event.stopPropagation();
          moveCursorToDropPoint();
          const src = srcMatch[1];
          if (src.startsWith('data:image/')) {
            const converted = dataUrlToBlob(src);
            if (converted && depsRef.current?.handlePasteImageFile) {
              const fileObj = new File([converted.blob], `dropped_${Date.now()}.${converted.ext}`, { type: converted.blob.type });
              await depsRef.current.handlePasteImageFile(fileObj);
              return;
            }
          }
          insertTextAtCursor(`![](${src})\n`, 'drop-html-image');
          return;
        }
      }

      const candidateUrl = (uriData || plainData || '').trim().split(/\r?\n/)[0]?.trim();
      if (candidateUrl && /^(https?:\/\/|data:image\/)/i.test(candidateUrl)) {
        event.preventDefault();
        event.stopPropagation();
        moveCursorToDropPoint();

        if (candidateUrl.startsWith('data:image/')) {
          const converted = dataUrlToBlob(candidateUrl);
          if (converted && depsRef.current?.handlePasteImageFile) {
            const fileObj = new File([converted.blob], `dropped_${Date.now()}.${converted.ext}`, { type: converted.blob.type });
            await depsRef.current.handlePasteImageFile(fileObj);
            return;
          }
        }

        if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(candidateUrl)) {
          insertTextAtCursor(`![](${candidateUrl})\n`, 'drop-url-image');
        } else if (plainData && plainData !== candidateUrl) {
          insertTextAtCursor(plainData, 'drop-plain-text');
        } else {
          insertTextAtCursor(`[${candidateUrl}](${candidateUrl})`, 'drop-url-link');
        }
        return;
      }

      if (plainData) {
        event.preventDefault();
        event.stopPropagation();
        moveCursorToDropPoint();
        insertTextAtCursor(plainData, 'drop-plain-text');
        return;
      }
    }
  }, true);
}
