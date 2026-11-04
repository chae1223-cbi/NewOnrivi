// ====================================================================
// 📊 [OMD-CORE-VisualEditor-DragDropResize] frontend/src/components/visualEditor/visualDragDropImageController.ts
// 🎯 @KICK  : 시각 에디터(VisualDocumentEditor) 이미지 드래그 앤 드롭 인디케이터, 드롭 이미지 업로드/삽입, 각주 헤더 데코레이션 플러그인 및 표 열 너비 드래그 리사이즈 컨트롤러
// 🛡️ @GUARD : Rule 3(역할 기반 분리) 및 비동기 드롭 도중 에디터 파괴/문서 변경 방어, 5대 정밀 진단 로깅(logError/logWarn) 준수
// 🚨 @PATCH : 2026-11-04 — [VisualDocumentEditor 코어 엔진 모듈화]: 드래그 앤 드롭 이미지 컨트롤러, 각주 헤더 플러그인, 표 열 리사이즈 컨트롤러 분리 및 5대 진단 로깅 적용
// 🔗 @CALLS : resolveDropTarget, parseDroppedDataToBlob, fetchExternalImageFile, resizeTableBoundary, equalColumnRatios, validColumnRatios
// ====================================================================

import type React from 'react';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { closeHistory } from 'prosemirror-history';
import { canSplit } from 'prosemirror-transform';
import { visualSchema } from '@/lib/visualDocumentCodec';
import { parseDroppedDataToBlob, fetchExternalImageFile } from '@/lib/resourceMedia';
import { equalColumnRatios, validColumnRatios, resizeTableBoundary } from '@/lib/tableColumnRatios';
import { resolveDropTarget, type DropTargetInfo } from './visualDropHelper';
import { logError, logWarn } from '@/lib/errorDiagnostics';

export interface VisualDragDropControllerParams {
  hostEl: HTMLDivElement;
  viewRef: React.MutableRefObject<EditorView | null>;
  imagesRef: React.MutableRefObject<{
    onImageFile?: (file: Blob) => Promise<string | null>;
    [key: string]: any;
  }>;
  lastDropTargetRef: React.MutableRefObject<DropTargetInfo | null>;
  lastDispatchedPosRef: React.MutableRefObject<number | null>;
  setNotice: (notice: string) => void;
  onToastRef: React.MutableRefObject<((message: string, type?: 'info' | 'success' | 'warning' | 'error') => void) | undefined>;
}

export interface VisualDragDropController {
  clearDropIndicator: () => void;
  updateDropIndicator: (currentView: EditorView, e: DragEvent) => void;
  executeDropImageInsertion: (currentView: EditorView, e: DragEvent) => Promise<boolean>;
  destroy: () => void;
}

/**
 * ========================================================================================
 * [함수명] installVisualDragDropController - 시각 에디터의 이미지 드래그 앤 드롭 가이드 UI 및 파일/웹 이미지 삽입 파이프라인을 설치합니다.
 *
 * @param {VisualDragDropControllerParams} params - 호스트 엘리먼트, 에디터 뷰 Ref, 이미지 업로더 Ref 및 알림 콜백
 * @returns {VisualDragDropController} 드롭 인디케이터 제어 및 정리(destroy) 인터페이스
 * @throws {Error} 드롭 이미지 파일 저장 또는 외부 URL 다운로드 실패 시 내부 포착 후 logError 기록
 *
 * @example
 * const dragDropCtrl = installVisualDragDropController({ hostEl, viewRef, imagesRef, ... });
 * ==========================================================================================
 */
export function installVisualDragDropController({
  hostEl,
  viewRef,
  imagesRef,
  lastDropTargetRef,
  lastDispatchedPosRef,
  setNotice,
  onToastRef,
}: VisualDragDropControllerParams): VisualDragDropController {
  // 1. 도톰하고 선명한 세로 막대 텍스트 커서 (3.5px 코발트 블루, 깜빡임 애니메이션 및 I-Beam 서리프)
  const dropCaretVertical = document.createElement('div');
  dropCaretVertical.className = 'visual-drag-drop-caret no-print';
  dropCaretVertical.setAttribute('aria-hidden', 'true');
  dropCaretVertical.style.cssText = [
    'position:fixed',
    'width:3.5px',
    'background:#1d4ed8',
    'box-shadow:0 0 12px rgba(29, 78, 216, 0.95), 0 0 3px #ffffff',
    'pointer-events:none',
    'z-index:99999',
    'display:none',
    'border-radius:2px',
    'transition:left 0.04s ease-out, top 0.04s ease-out, height 0.04s ease-out',
    'will-change:left,top,height',
  ].join(';');

  // 2. 커서 상단 안내 뱃지
  const dropCaretBadge = document.createElement('div');
  dropCaretBadge.className = 'visual-drag-drop-badge no-print';
  dropCaretBadge.style.cssText = [
    'position:absolute',
    'bottom:100%',
    'left:50%',
    'transform:translateX(-50%) translateY(-6px)',
    'background:#1d4ed8',
    'color:#ffffff',
    'font-size:11px',
    'font-weight:700',
    'font-family:Pretendard, -apple-system, sans-serif',
    'padding:2.5px 8px',
    'border-radius:6px',
    'box-shadow:0 3px 12px rgba(0, 0, 0, 0.35)',
    'pointer-events:none',
    'display:flex',
    'align-items:center',
    'gap:4px',
    'letter-spacing:-0.2px',
    'white-space:nowrap',
  ].join(';');
  dropCaretBadge.innerHTML = '<span>📍 여기에 이미지 삽입</span>';
  dropCaretVertical.appendChild(dropCaretBadge);

  // 3. 가로 블록 경계 가이드 라인 (연한 코발트 음영)
  const dropLineHorizontal = document.createElement('div');
  dropLineHorizontal.className = 'visual-drag-drop-line no-print';
  dropLineHorizontal.setAttribute('aria-hidden', 'true');
  dropLineHorizontal.style.cssText = [
    'position:fixed',
    'height:2px',
    'background:rgba(29, 78, 216, 0.55)',
    'box-shadow:0 0 8px rgba(29, 78, 216, 0.6)',
    'pointer-events:none',
    'z-index:99998',
    'display:none',
    'border-radius:1px',
    'transition:left 0.04s ease-out, top 0.04s ease-out, width 0.04s ease-out',
    'will-change:left,top,width',
  ].join(';');

  document.body.appendChild(dropCaretVertical);
  document.body.appendChild(dropLineHorizontal);

  let activeDropBlock: HTMLElement | null = null;
  const clearDropIndicator = () => {
    dropCaretVertical.style.display = 'none';
    dropLineHorizontal.style.display = 'none';
    lastDropTargetRef.current = null;
    lastDispatchedPosRef.current = null;
    if (activeDropBlock) {
      activeDropBlock.classList.remove('onrivi-drop-line-highlight');
      activeDropBlock = null;
    }
  };

  const updateDropIndicator = (currentView: EditorView, e: DragEvent) => {
    if (!hostEl || !currentView.dom) return;
    const target = resolveDropTarget(currentView, e.clientX, e.clientY);
    lastDropTargetRef.current = target;

    if (activeDropBlock !== target.blockEl) {
      if (activeDropBlock) activeDropBlock.classList.remove('onrivi-drop-line-highlight');
      if (target.blockEl) {
        target.blockEl.classList.add('onrivi-drop-line-highlight');
        activeDropBlock = target.blockEl;
      } else {
        activeDropBlock = null;
      }
    }

    const isDark = document.documentElement.classList.contains('dark') || hostEl.closest('.dark');
    dropCaretVertical.style.background = isDark ? '#38bdf8' : '#1d4ed8';
    dropCaretVertical.style.boxShadow = isDark
      ? '0 0 12px rgba(56, 189, 248, 0.95), 0 0 3px #ffffff'
      : '0 0 12px rgba(29, 78, 216, 0.95), 0 0 3px #ffffff';
    dropCaretBadge.style.background = isDark ? '#0284c7' : '#1d4ed8';
    dropLineHorizontal.style.background = isDark ? 'rgba(56, 189, 248, 0.55)' : 'rgba(29, 78, 216, 0.55)';

    const caretHeight = Math.max(22, Math.round(target.coords.bottom - target.coords.top));
    const caretTop = Math.round(target.coords.top);
    const caretLeft = Math.round(target.coords.left);

    if (caretTop < 45) {
      dropCaretBadge.style.bottom = 'auto';
      dropCaretBadge.style.top = '100%';
      dropCaretBadge.style.transform = 'translateX(-50%) translateY(6px)';
    } else {
      dropCaretBadge.style.bottom = '100%';
      dropCaretBadge.style.top = 'auto';
      dropCaretBadge.style.transform = 'translateX(-50%) translateY(-6px)';
    }

    dropCaretVertical.style.top = `${caretTop}px`;
    dropCaretVertical.style.left = `${caretLeft}px`;
    dropCaretVertical.style.height = `${caretHeight}px`;
    dropCaretVertical.style.display = 'block';

    if (target.blockEl) {
      const blockRect = target.blockEl.getBoundingClientRect();
      const lineY =
        target.insertMode === 'before'
          ? blockRect.top
          : target.insertMode === 'after'
            ? blockRect.bottom
            : target.coords.bottom;
      dropLineHorizontal.style.top = `${Math.round(lineY)}px`;
      dropLineHorizontal.style.left = `${Math.round(blockRect.left)}px`;
      dropLineHorizontal.style.width = `${Math.max(40, Math.round(blockRect.width))}px`;
      dropLineHorizontal.style.display = 'block';
    } else {
      dropLineHorizontal.style.display = 'none';
    }

    if (lastDispatchedPosRef.current !== target.pos) {
      lastDispatchedPosRef.current = target.pos;
      try {
        const $pos = currentView.state.doc.resolve(target.pos);
        currentView.dispatch(currentView.state.tr.setSelection(TextSelection.near($pos)));
      } catch (err) {
        logWarn({
          file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
          func: 'updateDropIndicator',
          doing: '드래그 오버 위치로 에디터 텍스트 커서(Selection) 실시간 동기화 중',
          target: `pos:${target.pos}`,
          error: err,
        });
      }
    }
  };

  const executeDropImageInsertion = async (currentView: EditorView, e: DragEvent): Promise<boolean> => {
    const dt = e.dataTransfer;
    if (!dt || !currentView.editable) {
      clearDropIndicator();
      return false;
    }

    const target = lastDropTargetRef.current || resolveDropTarget(currentView, e.clientX, e.clientY);
    clearDropIndicator();
    let expectedDoc = currentView.state.doc;
    let nextInsertion: number | null = null;
    const reportDropError = (error: unknown) => {
      const message =
        error instanceof Error ? error.message : '이미지를 저장하지 못했습니다. 리소스 폴더 연결을 확인해 주세요.';
      setNotice(message);
      onToastRef.current?.(message, 'error');
    };

    const insertMarkdownImageNode = (savedPath: string) => {
      const view = viewRef.current;
      if (!view || view !== currentView || view.isDestroyed || !view.editable || view.state.doc !== expectedDoc) {
        setNotice('문서나 삽입 위치가 변경되었습니다. 이미지를 다시 끌어 넣어 주세요.');
        return;
      }
      const formattedPath = savedPath.includes(' ') ? `<${savedPath}>` : savedPath;
      const markdown = `![](${formattedPath})\n\n`;
      const node = visualSchema.nodes.visual_image.create({ source: markdown });
      let tr = view.state.tr;

      const safePos = Math.max(0, Math.min(nextInsertion ?? target.pos, tr.doc.content.size));
      const $pos = tr.doc.resolve(safePos);

      if (nextInsertion !== null) {
        tr = tr.insert(safePos, node);
      } else if (
        target.insertMode === 'split' &&
        $pos.parent.isTextblock &&
        $pos.parentOffset > 0 &&
        $pos.parentOffset < $pos.parent.content.size &&
        canSplit(tr.doc, safePos)
      ) {
        tr = tr.split(safePos);
        tr = tr.insert(safePos + 1, node);
      } else {
        tr = tr.insert(safePos, node);
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
        nextInsertion = afterPos + 2;
      } else if (tr.doc.lastChild?.type === visualSchema.nodes.visual_image) {
        tr = tr.insert(tr.doc.content.size, visualSchema.nodes.paragraph.create());
      }
      view.dispatch(closeHistory(tr).scrollIntoView());
      expectedDoc = view.state.doc;
      view.focus();
    };

    const droppedFiles = Array.from(dt.files || []).filter(
      file => file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name)
    );
    if (!droppedFiles.length) {
      for (const item of Array.from(dt.items || [])) {
        const file = item.kind === 'file' ? item.getAsFile() : null;
        if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name))) {
          droppedFiles.push(file);
        }
      }
    }
    if (droppedFiles.length && imagesRef.current.onImageFile) {
      for (const file of droppedFiles) {
        if (viewRef.current !== currentView || currentView.isDestroyed) break;
        try {
          const path = await imagesRef.current.onImageFile(file);
          if (path) insertMarkdownImageNode(path);
          else setNotice('이미지를 저장하지 못했습니다. 리소스 폴더 연결을 확인해 주세요.');
        } catch (error) {
          logError({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '드롭된 이미지 파일 저장 및 마크다운 이미지 노드 삽입 중',
            target: file.name,
            error,
          });
          reportDropError(error);
        }
      }
      return true;
    }

    const parsed = parseDroppedDataToBlob(dt);
    if (parsed?.localPath && !(window as any).electronAPI?.readTransferFile) {
      reportDropError(
        new Error(
          '다른 프로그램이 이미지 파일 대신 PC 파일 주소만 전달했습니다. 웹에서는 해당 주소를 읽을 수 없습니다. 원본 이미지 파일을 탐색기에서 끌어 넣거나, 원본 프로그램의 이미지 복사 후 붙여넣기를 사용해 주세요.'
        )
      );
      return true;
    }
    if (parsed) {
      if (parsed.file && imagesRef.current.onImageFile) {
        try {
          const savedPath = await imagesRef.current.onImageFile(parsed.file);
          if (savedPath) {
            insertMarkdownImageNode(savedPath);
            return true;
          }
        } catch (err) {
          logError({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '파싱된 드롭 이미지 Blob 파일 저장 중',
            target: parsed.name || 'dropped_blob',
            error: err,
          });
        }
      } else if (parsed.webUrl) {
        let fetchedFile: File | null = null;
        try {
          fetchedFile = await fetchExternalImageFile(parsed.webUrl, parsed.name);
        } catch (err) {
          logWarn({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '드롭된 외부 웹 이미지 URL 다운로드 중',
            target: parsed.webUrl,
            error: err,
          });
        }

        if (fetchedFile && imagesRef.current.onImageFile) {
          try {
            const savedPath = await imagesRef.current.onImageFile(fetchedFile);
            if (savedPath) {
              insertMarkdownImageNode(savedPath);
              return true;
            }
          } catch (err) {
            logError({
              file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
              func: 'executeDropImageInsertion',
              doing: '다운로드된 외부 웹 이미지 파일 리소스 폴더 저장 중',
              target: parsed.webUrl,
              error: err,
            });
          }
        }

        if (parsed.webUrl.startsWith('blob:')) {
          reportDropError(new Error('브라우저의 임시 이미지를 읽지 못했습니다. 이미지 파일을 저장한 뒤 다시 끌어 넣어 주세요.'));
          return true;
        }
        insertMarkdownImageNode(parsed.webUrl);
        return true;
      }
    }

    const files = Array.from(dt.files || []).filter(
      file => file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(file.name)
    );
    if (files.length === 0 && dt.items) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f && (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|jfif|tiff?|ico)$/i.test(f.name))) {
            files.push(f);
          }
        }
      }
    }
    if (files.length > 0 && imagesRef.current.onImageFile) {
      for (const file of files) {
        try {
          const savedPath = await imagesRef.current.onImageFile(file);
          if (savedPath) {
            insertMarkdownImageNode(savedPath);
          }
        } catch (err) {
          logError({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '다중 드롭 이미지 파일 업로드 처리 중',
            target: file.name,
            error: err,
          });
        }
      }
      return true;
    }

    const plainText = dt.getData('text/plain') || '';
    const uriList = dt.getData('text/uri-list') || '';
    let fileCandidate =
      parsed?.localPath ||
      uriList
        .split(/[\r\n]+/)
        .map(s => s.trim())
        .find(s => s && /^(?:file:\/\/\/|[a-zA-Z]:[/\\])/i.test(s)) ||
      '';
    if (!fileCandidate && /^(?:file:\/\/\/|[a-zA-Z]:[/\\])/i.test(plainText.trim())) {
      fileCandidate = plainText.trim();
    }
    if (fileCandidate) {
      const api = (window as any).electronAPI;
      let cleanPath = fileCandidate.startsWith('file:///')
        ? decodeURIComponent(fileCandidate.replace(/^file:\/\/\//, ''))
        : fileCandidate;
      cleanPath = cleanPath.replace(/^\/([A-Za-z]:)/, '$1');
      if (api?.readTransferFile && imagesRef.current.onImageFile) {
        try {
          const bytes = await api.readTransferFile(cleanPath);
          const filename = cleanPath.split(/[\\/]/).pop() || `img_${Date.now()}.png`;
          const ext = filename.split('.').pop()?.toLowerCase() || 'png';
          const mime =
            ({
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              webp: 'image/webp',
              gif: 'image/gif',
              svg: 'image/svg+xml',
            } as Record<string, string>)[ext] || 'application/octet-stream';
          const file = new File([new Uint8Array(bytes)], filename, { type: mime });
          const savedPath = await imagesRef.current.onImageFile(file);
          if (savedPath) {
            insertMarkdownImageNode(savedPath);
            return true;
          }
        } catch (err) {
          logError({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '로컬 파일 경로 드래그 이미지 읽기 및 저장 중',
            target: '[로컬 이미지 파일]',
            error: err,
          });
          reportDropError(err);
        }
      }
      return true;
    }

    let webCandidate =
      uriList
        .split(/[\r\n]+/)
        .map(s => s.trim())
        .find(s => s && /^https?:\/\//i.test(s)) || '';
    if (!webCandidate && /^https?:\/\//i.test(plainText.trim())) {
      webCandidate = plainText.trim();
    }
    if (webCandidate) {
      let fetchedFile: File | null = null;
      try {
        fetchedFile = await fetchExternalImageFile(webCandidate);
      } catch (err) {
        logWarn({
          file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
          func: 'executeDropImageInsertion',
          doing: '외부 웹 이미지 URL 후보 다운로드 시도 중',
          target: webCandidate,
          error: err,
        });
      }

      if (fetchedFile && imagesRef.current.onImageFile) {
        try {
          const savedPath = await imagesRef.current.onImageFile(fetchedFile);
          if (savedPath) {
            insertMarkdownImageNode(savedPath);
            return true;
          }
        } catch (err) {
          logError({
            file: 'frontend/src/components/visualEditor/visualDragDropImageController.ts',
            func: 'executeDropImageInsertion',
            doing: '다운로드한 외부 웹 이미지 파일 리소스 폴더 저장 중',
            target: webCandidate,
            error: err,
          });
        }
      }

      if (!webCandidate.startsWith('data:image/')) {
        insertMarkdownImageNode(webCandidate);
        return true;
      }
    }

    return false;
  };

  const ownsImageDrop = (e: DragEvent) => {
    const element = e.target instanceof Element ? e.target : null;
    if (element?.closest('.book-page')) return false;
    const owner = element?.closest('.visual-document-editor');
    const section = hostEl.closest('.visual-document-editor');
    if (owner) return owner === section;
    const container = hostEl.closest('.custom-preview-container') || section || hostEl;
    if (container.querySelectorAll('.visual-document-editor').length > 1) return false;
    const rect = container.getBoundingClientRect();
    return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  };

  const handleWindowDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    const view = viewRef.current;
    if (!view || !view.editable) return;
    if (!ownsImageDrop(e)) {
      clearDropIndicator();
      return;
    }
    const types = e.dataTransfer?.types;
    if (
      !types ||
      !Array.from(types).some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')
    ) {
      return;
    }
    const container = hostEl.closest('.custom-preview-container') || hostEl;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        updateDropIndicator(view, e);
      } else {
        clearDropIndicator();
      }
    }
  };

  const handleWindowDragEnd = () => clearDropIndicator();
  const handleWindowDrop = (e: DragEvent) => {
    e.preventDefault();
    clearDropIndicator();
    const view = viewRef.current;
    if (!view || !view.editable) return;
    if (!ownsImageDrop(e)) return;
    if (!e.dataTransfer || !parseDroppedDataToBlob(e.dataTransfer)) return;
    const container = hostEl.closest('.custom-preview-container') || hostEl;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        e.stopPropagation();
        void executeDropImageInsertion(view, e);
      }
    }
  };

  const handleWindowDragLeave = (e: DragEvent) => {
    if (e.clientX <= 0 || e.clientY <= 0 || !e.relatedTarget) {
      clearDropIndicator();
    }
  };

  window.addEventListener('dragover', handleWindowDragOver, true);
  window.addEventListener('dragend', handleWindowDragEnd, true);
  window.addEventListener('drop', handleWindowDrop, true);
  window.addEventListener('dragleave', handleWindowDragLeave, true);
  window.addEventListener('mouseup', handleWindowDragEnd, true);
  hostEl.addEventListener('mouseleave', handleWindowDragEnd);

  return {
    clearDropIndicator,
    updateDropIndicator,
    executeDropImageInsertion,
    destroy: () => {
      clearDropIndicator();
      window.removeEventListener('dragover', handleWindowDragOver, true);
      window.removeEventListener('dragend', handleWindowDragEnd, true);
      window.removeEventListener('drop', handleWindowDrop, true);
      window.removeEventListener('dragleave', handleWindowDragLeave, true);
      window.removeEventListener('mouseup', handleWindowDragEnd, true);
      hostEl.removeEventListener('mouseleave', handleWindowDragEnd);
      if (dropCaretVertical.parentNode) {
        dropCaretVertical.parentNode.removeChild(dropCaretVertical);
      }
      if (dropLineHorizontal.parentNode) {
        dropLineHorizontal.parentNode.removeChild(dropLineHorizontal);
      }
    },
  };
}

const footnoteHeaderPluginKey = new PluginKey('visual_footnote_header');

/**
 * ========================================================================================
 * [함수명] createFootnoteHeaderPlugin - 문서 하단 첫 번째 각주 정의(`visual_footnote_def`) 앞에 '각주 (Footnotes)' 헤더 위젯 데코레이션을 렌더링합니다.
 *
 * @returns {Plugin} ProseMirror 각주 영역 헤더 데코레이션 플러그인
 *
 * @example
 * const plugin = createFootnoteHeaderPlugin();
 * ==========================================================================================
 */
export function createFootnoteHeaderPlugin(): Plugin {
  return new Plugin({
    key: footnoteHeaderPluginKey,
    props: {
      decorations(state) {
        let firstFootnotePos: number | null = null;
        let offset = 0;
        for (let i = 0; i < state.doc.childCount; i++) {
          const child = state.doc.child(i);
          if (child.type.name === 'visual_footnote_def') {
            firstFootnotePos = offset;
            break;
          }
          offset += child.nodeSize;
        }

        if (firstFootnotePos === null) {
          return DecorationSet.empty;
        }

        const widget = Decoration.widget(
          firstFootnotePos,
          () => {
            const areaHeader = document.createElement('div');
            areaHeader.className = 'visual-footnote-area-header select-none';
            areaHeader.innerHTML =
              '<div class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">' +
              '<span class="visual-footnote-area-badge inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold whitespace-nowrap">' +
              '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>' +
              '<span class="visual-footnote-area-title">각주 (Footnotes)</span>' +
              '</span>' +
              '<div class="flex-1 border-t-2 border-slate-300/80 dark:border-slate-700/80"></div>' +
              '</div>';
            return areaHeader;
          },
          { side: -1, stopEvent: () => true, key: 'visual-footnote-area-header' }
        );

        return DecorationSet.create(state.doc, [widget]);
      },
    },
  });
}

/**
 * ========================================================================================
 * [함수명] installVisualTableResizeController - 시각 에디터 내 표(`table.visual-editable-table`) 열 경계선 마우스 드래그 너비 조절 컨트롤러를 설치합니다.
 *
 * @param {HTMLDivElement} hostEl - 에디터 호스트 DOM 엘리먼트
 * @param {EditorView} view - ProseMirror EditorView 인스턴스
 * @param {boolean} readOnly - 읽기 전용 여부
 * @returns {() => void} 이벤트 리스너 및 진행 중인 드래그 상태를 해제하는 클린업 함수
 *
 * @example
 * const cleanupTableResize = installVisualTableResizeController(hostEl, view, readOnly);
 * ==========================================================================================
 */
export function installVisualTableResizeController(
  hostEl: HTMLDivElement,
  view: EditorView,
  readOnly: boolean
): () => void {
  let activeResize: {
    pos: number;
    boundary: number;
    widths: number[];
    latest: number[];
    startX: number;
    tableWidth: number;
    leftCol: HTMLTableColElement;
    rightCol: HTMLTableColElement;
  } | null = null;

  const resizeHit = (event: PointerEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const table =
      target?.closest<HTMLTableElement>('table.visual-editable-table') ||
      Array.from(view.dom.querySelectorAll<HTMLTableElement>('table.visual-editable-table')).find(candidate => {
        const bounds = candidate.getBoundingClientRect();
        return (
          event.clientX >= bounds.left - 2 &&
          event.clientX <= bounds.right + 2 &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        );
      });
    if (!table || !view.dom.contains(table)) return null;
    const rect = table.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return null;
    const header = table.rows[0];
    if (!header || header.cells.length < 2) return null;
    let boundary = -1;
    let distance = 14;
    for (let index = 0; index < header.cells.length - 1; index++) {
      const edge = header.cells[index].getBoundingClientRect().right;
      const nextDistance = Math.abs(event.clientX - edge);
      if (nextDistance < distance) {
        boundary = index;
        distance = nextDistance;
      }
    }
    if (boundary < 0) return null;
    const row = Array.from(table.rows).find(candidate => {
      const bounds = candidate.getBoundingClientRect();
      return event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    });
    const cell = row?.cells[boundary] || header.cells[boundary];
    return { cell, table, boundary, edge: 'right' };
  };

  const handleTableResizeMove = (event: MouseEvent) => {
    if (!activeResize) return;
    const drag = activeResize;
    event.preventDefault();
    const next = resizeTableBoundary(drag.widths, drag.boundary, ((event.clientX - drag.startX) * 100) / drag.tableWidth);
    if (next[drag.boundary] === drag.latest[drag.boundary]) return;
    drag.latest = next;
    drag.leftCol.style.width = `${next[drag.boundary]}%`;
    drag.rightCol.style.width = `${next[drag.boundary + 1]}%`;
  };

  const stopTableResize = (event?: Event) => {
    const drag = activeResize;
    activeResize = null;
    document.body.style.cursor = '';
    document.removeEventListener('pointermove', handleTableResizeMove);
    document.removeEventListener('mousemove', handleTableResizeMove);
    document.removeEventListener('pointerup', stopTableResize);
    document.removeEventListener('mouseup', stopTableResize);
    if (!drag) return;
    if (
      (event?.type === 'pointerup' || event?.type === 'mouseup') &&
      drag.latest.some((width, index) => width !== drag.widths[index])
    ) {
      const tableNode = view.state.doc.nodeAt(drag.pos);
      if (tableNode?.type.name === 'table') {
        view.dispatch(view.state.tr.setNodeMarkup(drag.pos, undefined, { ...tableNode.attrs, widths: drag.latest }));
        return;
      }
    }
    drag.leftCol.style.width = `${drag.widths[drag.boundary]}%`;
    drag.rightCol.style.width = `${drag.widths[drag.boundary + 1]}%`;
  };

  const startTableResize = (event: PointerEvent) => {
    if (readOnly || event.button !== 0) return;
    const hit = resizeHit(event);
    if (!hit) return;
    const cellPos = view.posAtDOM(hit.cell, 0);
    const resolved = view.state.doc.resolve(cellPos);
    let pos = -1;
    for (let depth = resolved.depth; depth > 0; depth--) {
      if (resolved.node(depth).type.name === 'table') {
        pos = resolved.before(depth);
        break;
      }
    }
    if (pos < 0) return;
    const tableNode = view.state.doc.nodeAt(pos);
    if (tableNode?.type.name !== 'table') return;
    const count = tableNode.firstChild?.childCount || 0;
    const widths = validColumnRatios(tableNode.attrs.widths, count) || equalColumnRatios(count);
    if (widths.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    const cols = hit.table.querySelectorAll<HTMLTableColElement>('colgroup > col');
    const leftCol = cols[hit.boundary];
    const rightCol = cols[hit.boundary + 1];
    if (!leftCol || !rightCol) return;
    activeResize = {
      pos,
      boundary: hit.boundary,
      widths,
      latest: widths,
      startX: event.clientX,
      tableWidth: hit.table.getBoundingClientRect().width,
      leftCol,
      rightCol,
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('pointermove', handleTableResizeMove);
    document.addEventListener('mousemove', handleTableResizeMove);
    document.addEventListener('pointerup', stopTableResize);
    document.addEventListener('mouseup', stopTableResize);
  };

  hostEl.addEventListener('pointerdown', startTableResize, true);
  return () => {
    stopTableResize();
    hostEl.removeEventListener('pointerdown', startTableResize, true);
  };
}
