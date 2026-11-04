/**
 * ====================================================================
 * 🏷️ 파일명 : GlobalSearchPanel.tsx
 * 🎭 역할(Role) : Core (핵심 도메인 뷰 — 좌측 사이드바 전역 검색 패널)
 * 🎯 주요기능 : 전체 워크스페이스 문서 내용 및 파일명 검색과 검색 결과 파일 자동 열기 및 지정 줄 점프/하이라이트
 * 🚨 @PATCH : 2026-11-04 — [LeftSidebar 모듈화 분리 & 주석/에러 표준화] LeftSidebar에서 GlobalSearch 래핑 및 점프/하이라이트 핸들러를 독립 패널 컴포넌트로 분리하고 2단계 주석 및 logError 적용 (규칙 3 Core 역할 준수)
 * ====================================================================
 */
// @ts-nocheck
"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import { useEditorContext } from '@/context/EditorContext';
import { FileNode } from '@/lib/indexedDbHelper';
import { logError } from '@/lib/errorDiagnostics';

const BROWSER_STORAGE_NAME = '브라우저 로컬 저장소';

interface GlobalSearchPanelProps {
  isActive: boolean;
  isDarkMode: boolean;
}

/**
 * ========================================================================================
 * [컴포넌트명] GlobalSearchPanel - 좌측 사이드바 워크스페이스 전역 검색 패널
 *
 * @param {GlobalSearchPanelProps} props - 탭 활성화 여부(isActive) 및 다크모드 상태(isDarkMode)
 * @returns {JSX.Element} 전역 검색 패널 뷰
 * ==========================================================================================
 */
export default function GlobalSearchPanel({ isActive, isDarkMode }: GlobalSearchPanelProps) {
  const {
    content,
    currentFileName,
    currentFileNode,
    tabs = [],
    fileList,
    rootFolder,
    workspaceType,
    onSelectRootFolder,
    previewMode,
    setPreviewMode,
    openFile,
    switchTab,
    showToast,
    editorRef,
    previewRef,
    isScrollingRef,
    scrollTimeoutRef
  } = useEditorContext();

  const searchHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 언마운트 시 CSS 하이라이트 및 타이머 정리
  useEffect(() => {
    return () => {
      if (searchHighlightTimeoutRef.current) clearTimeout(searchHighlightTimeoutRef.current);
      if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
        try {
          (CSS as any).highlights.delete('onrivi-search-text-highlight');
        } catch (e) {}
      }
    };
  }, []);

  // 📝 검색 결과 또는 목차 클릭 시 에디터와 미리보기 동시 스크롤 및 검색어 텍스트 하이라이트
  const executeJumpAndHighlight = useCallback((targetLine: number, term?: string) => {
    let attempt = 0;
    const maxAttempts = 10;

    const doJump = () => {
      let previewSuccess = false;
      let editorSuccess = false;

      // 스크롤 동기화 간섭 방지 락
      if (isScrollingRef && scrollTimeoutRef) {
        isScrollingRef.current = 'preview';
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          if (isScrollingRef) isScrollingRef.current = null;
        }, 800);
      }

      // 1. Monaco 에디터 줄 이동 및 단어 선택
      if (editorRef?.current) {
        const editor = editorRef.current;
        try {
          editor.revealLineInCenter(targetLine);
          editor.setPosition({ lineNumber: targetLine, column: 1 });
          if (term && term.trim()) {
            const model = editor.getModel?.();
            if (model && !model.isDisposed()) {
              const lineContent = model.getLineContent(targetLine) || '';
              const colIdx = lineContent.toLowerCase().indexOf(term.toLowerCase());
              if (colIdx !== -1) {
                const startCol = colIdx + 1;
                const endCol = startCol + term.length;
                editor.setSelection({
                  startLineNumber: targetLine,
                  startColumn: startCol,
                  endLineNumber: targetLine,
                  endColumn: endCol
                });
                editor.revealRangeInCenter({
                  startLineNumber: targetLine,
                  startColumn: startCol,
                  endLineNumber: targetLine,
                  endColumn: endCol
                });
              }
            }
          }
          editorSuccess = true;
        } catch (e) {
          // Monaco error ignore
        }
      }

      // 2. 미리보기(Preview) DOM 줄 이동 및 하이라이트 (Zero DOM Mutation)
      if (previewRef?.current) {
        const previewContainer = previewRef.current;
        const elements = Array.from(previewContainer.querySelectorAll('[data-line]')) as HTMLElement[];

        if (elements.length > 0) {
          let bestEl: HTMLElement | null = null;
          let bestDiff = Infinity;

          for (const el of elements) {
            const line = parseInt(el.getAttribute('data-line') || '1', 10);
            if (line === targetLine) {
              bestEl = el;
              break;
            }
            if (line <= targetLine) {
              const diff = targetLine - line;
              if (diff < bestDiff) {
                bestDiff = diff;
                bestEl = el;
              }
            }
          }

          if (!bestEl) {
            bestEl = elements[0];
          }

          if (bestEl) {
            const targetLineVal = bestEl.getAttribute('data-line');
            const matchingLineEls = elements.filter(el => el.getAttribute('data-line') === targetLineVal);

            // 이전 하이라이트 타이머 취소
            if (searchHighlightTimeoutRef.current) {
              clearTimeout(searchHighlightTimeoutRef.current);
              searchHighlightTimeoutRef.current = null;
            }

            // 기존 줄 하이라이트 클래스 해제
            elements.forEach(el => el.classList.remove('preview-highlight-line'));

            // 기존 CSS Custom Highlight 해제 (DOM을 건드리지 않음)
            if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
              try {
                (CSS as any).highlights.delete('onrivi-search-text-highlight');
              } catch (e) {}
            }

            // 해당 줄 하이라이트 클래스 부여
            matchingLineEls.forEach(el => el.classList.add('preview-highlight-line'));

            // 미리보기 컨테이너 중앙 스크롤
            const scrollTarget = matchingLineEls[0] || bestEl;
            const containerRect = previewContainer.getBoundingClientRect();
            const elRect = scrollTarget.getBoundingClientRect();
            const targetScrollTop = previewContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
            previewContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });

            // 🔍 CSS Custom Highlight API로 검색어 인라인 하이라이트 (DOM 노드를 전혀 생성/치환/삭제하지 않음)
            if (term && term.trim() !== '' && typeof CSS !== 'undefined' && (CSS as any).highlights && typeof (window as any).Highlight !== 'undefined') {
              const trimmedTerm = term.trim();
              const ranges: Range[] = [];

              for (const lineEl of (matchingLineEls.length > 0 ? matchingLineEls : [bestEl])) {
                const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
                let currNode: Node | null;
                while ((currNode = walker.nextNode())) {
                  const text = currNode.nodeValue || '';
                  const lowerText = text.toLowerCase();
                  const lowerTermVal = trimmedTerm.toLowerCase();
                  let startIdx = 0;
                  while ((startIdx = lowerText.indexOf(lowerTermVal, startIdx)) !== -1) {
                    try {
                      const range = new Range();
                      range.setStart(currNode, startIdx);
                      range.setEnd(currNode, startIdx + trimmedTerm.length);
                      ranges.push(range);
                    } catch (e) {
                      // ignore range errors
                    }
                    startIdx += lowerTermVal.length;
                  }
                }
              }

              if (ranges.length > 0) {
                try {
                  const highlight = new (window as any).Highlight(...ranges);
                  (CSS as any).highlights.set('onrivi-search-text-highlight', highlight);
                } catch (e) {}
              }
            }

            // 4초 후 하이라이트 자동 정리
            searchHighlightTimeoutRef.current = setTimeout(() => {
              matchingLineEls.forEach(el => el.classList.remove('preview-highlight-line'));
              if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
                try {
                  (CSS as any).highlights.delete('onrivi-search-text-highlight');
                } catch (e) {}
              }
            }, 4000);

            previewSuccess = true;
          }
        } else {
          // B. VisualDocumentEditor ("문서 보기" / ProseMirror 기반)
          const proseMirror = (previewContainer.querySelector('.ProseMirror') || previewContainer.querySelector('.visual-document-editor')) as HTMLElement | null;
          if (proseMirror) {
            const lines = (content || '').split(/\r?\n/);
            const lineIdx = Math.max(0, Math.min(lines.length - 1, targetLine - 1));
            const lineContent = lines[lineIdx] || '';
            let offset = 0;
            for (let l = 0; l < lineIdx; l++) {
              offset += lines[l].length + 1;
            }
            if (term && term.trim()) {
              const termIdx = lineContent.toLowerCase().indexOf(term.trim().toLowerCase());
              if (termIdx !== -1) {
                offset += termIdx;
              }
            }

            // ProseMirror 커서/선택영역 동기화
            window.dispatchEvent(new CustomEvent('onrivi:source-cursor', { 
              detail: { offset, term, force: true, highlight: true } 
            }));

            let targetBlock: HTMLElement | null = null;
            const trimmedTerm = term?.trim();

            // 1) 검색어 텍스트 노드가 포함된 블록 검색
            if (trimmedTerm) {
              const lowerTermVal = trimmedTerm.toLowerCase();
              const walker = document.createTreeWalker(proseMirror, NodeFilter.SHOW_TEXT);
              let currNode: Node | null;
              while ((currNode = walker.nextNode())) {
                if ((currNode.nodeValue || '').toLowerCase().includes(lowerTermVal)) {
                  targetBlock = (currNode.parentElement?.closest('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure') || currNode.parentElement) as HTMLElement;
                  break;
                }
              }
            }

            // 2) 줄 내용 기반 블록 검색
            if (!targetBlock && lineContent.trim()) {
              const cleanLineText = lineContent.replace(/^[#>*+\-\d.\s\[\]xX]+/, '').trim().toLowerCase();
              if (cleanLineText.length > 1) {
                const blocks = Array.from(proseMirror.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote, figure')) as HTMLElement[];
                targetBlock = blocks.find(b => (b.textContent || '').toLowerCase().includes(cleanLineText)) || null;
              }
            }

            if (searchHighlightTimeoutRef.current) {
              clearTimeout(searchHighlightTimeoutRef.current);
              searchHighlightTimeoutRef.current = null;
            }

            // 이전 하이라이트 제거
            previewContainer.querySelectorAll('.preview-highlight-line').forEach(el => el.classList.remove('preview-highlight-line'));
            if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
              try { (CSS as any).highlights.delete('onrivi-search-text-highlight'); } catch (e) {}
            }

            if (targetBlock) {
              targetBlock.classList.add('preview-highlight-line');

              const containerRect = previewContainer.getBoundingClientRect();
              const elRect = targetBlock.getBoundingClientRect();
              const targetScrollTop = previewContainer.scrollTop + (elRect.top - containerRect.top) - (containerRect.height / 2) + (elRect.height / 2);
              previewContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              });

              if (trimmedTerm && typeof CSS !== 'undefined' && (CSS as any).highlights && typeof (window as any).Highlight !== 'undefined') {
                const ranges: Range[] = [];
                const walker = document.createTreeWalker(targetBlock, NodeFilter.SHOW_TEXT);
                let currNode: Node | null;
                while ((currNode = walker.nextNode())) {
                  const text = currNode.nodeValue || '';
                  const lowerText = text.toLowerCase();
                  let startIdx = 0;
                  while ((startIdx = lowerText.indexOf(lowerTermVal, startIdx)) !== -1) {
                    try {
                      const range = new Range();
                      range.setStart(currNode, startIdx);
                      range.setEnd(currNode, startIdx + trimmedTerm.length);
                      ranges.push(range);
                    } catch (e) {}
                    startIdx += trimmedTerm.length;
                  }
                }
                if (ranges.length > 0) {
                  try {
                    const highlight = new (window as any).Highlight(...ranges);
                    (CSS as any).highlights.set('onrivi-search-text-highlight', highlight);
                  } catch (e) {}
                }
              }

              searchHighlightTimeoutRef.current = setTimeout(() => {
                targetBlock?.classList.remove('preview-highlight-line');
                if (typeof CSS !== 'undefined' && (CSS as any).highlights) {
                  try { (CSS as any).highlights.delete('onrivi-search-text-highlight'); } catch (e) {}
                }
              }, 4000);

              previewSuccess = true;
            }
          }
        }
      }

      // 두 영역 모두 아직 렌더링되지 않았을 경우 재시도
      const isPreviewVisible = previewMode === 'preview' || previewMode === 'both';
      const isSuccess = isPreviewVisible ? previewSuccess : editorSuccess;

      if (!isSuccess && attempt < maxAttempts) {
        attempt++;
        setTimeout(doJump, 100);
      }
    };

    setTimeout(doJump, 60);
  }, [previewMode, editorRef, previewRef, content, isScrollingRef, scrollTimeoutRef]);

  // 📝 전역 검색 결과 파일 열기 및 줄 이동 핸들러
  const handleFileOpenAndJump = async (
    filePath: string,
    lineNumber: number,
    term?: string,
    targetMeta?: { fileName?: string; handle?: any; driveFileId?: string }
  ) => {
    // 서식설정 또는 편집 전용 모드인 경우 문서 보기로 전환
    if (previewMode === 'css-style' || previewMode === 'edit') {
      setPreviewMode?.('preview');
    }

    const targetLine = typeof lineNumber === 'number' && lineNumber > 0 ? lineNumber : 1;
    const normFilePath = (filePath || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
    const fileNameOnly = (targetMeta?.fileName || filePath.split(/[\\/]/).pop() || filePath).normalize('NFC');

    // 1. 현재 열려 있는 활성 문서인지 확인
    const normCurrentPath = currentFileNode?.path ? currentFileNode.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') : '';
    const isAlreadyActive = (
      filePath === 'current' ||
      (normCurrentPath && normCurrentPath === normFilePath) ||
      (!normCurrentPath && currentFileName && (currentFileName.normalize('NFC') === fileNameOnly || currentFileName.normalize('NFC') === filePath.normalize('NFC')))
    );

    if (isAlreadyActive) {
      executeJumpAndHighlight(targetLine, term);
      return;
    }

    // 2. 이미 열려 있는 탭 목록에 있는지 확인 (전체 경로 일치 최우선)
    if (tabs && tabs.length > 0 && switchTab) {
      const exactPathTab = tabs.find(t => {
        if (!t || !t.path) return false;
        return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
      });
      const fallbackNameTab = !filePath.includes('/') && !filePath.includes('\\')
        ? tabs.find(t => t && t.name.toLowerCase().normalize('NFC') === fileNameOnly.toLowerCase())
        : null;
      const matched = exactPathTab || fallbackNameTab;

      if (matched) {
        switchTab(matched.id);
        setTimeout(() => {
          executeJumpAndHighlight(targetLine, term);
        }, 60);
        return;
      }
    }

    // 3. 검색 결과에 직접 포함된 핸들(브라우저 FSA) 또는 구글 드라이브 ID가 있는 경우 즉시 오픈
    if (targetMeta?.handle) {
      await Promise.resolve(openFile?.({
        name: fileNameOnly,
        kind: 'file' as const,
        path: filePath,
        handle: targetMeta.handle
      }, rootFolder?.handle));
      setTimeout(() => {
        executeJumpAndHighlight(targetLine, term);
      }, 100);
      return;
    }

    if (targetMeta?.driveFileId) {
      await Promise.resolve(openFile?.({
        name: fileNameOnly,
        kind: 'file' as const,
        path: filePath,
        driveFileId: targetMeta.driveFileId
      }));
      setTimeout(() => {
        executeJumpAndHighlight(targetLine, term);
      }, 100);
      return;
    }

    // 4. 탐색기 트리에서 해당 노드 재귀 탐색 (전체 경로 일치 최우선, 이후 파일명 폴백)
    const findNodeByPath = (nodes: FileNode[], targetP: string): FileNode | null => {
      const normT = targetP.replace(/\\/g, '/').toLowerCase().normalize('NFC');
      for (const n of nodes) {
        const normN = n.path ? n.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') : '';
        if (n.kind === 'file' && normN && normN === normT) {
          return n;
        }
        if (n.kind === 'directory' && n.children) {
          const found = findNodeByPath(n.children, targetP);
          if (found) return found;
        }
      }
      return null;
    };

    const findNodeByName = (nodes: FileNode[], targetName: string): FileNode | null => {
      const normName = targetName.toLowerCase().normalize('NFC');
      for (const n of nodes) {
        if (n.kind === 'file' && n.name.toLowerCase().normalize('NFC') === normName) {
          return n;
        }
        if (n.kind === 'directory' && n.children) {
          const found = findNodeByName(n.children, targetName);
          if (found) return found;
        }
      }
      return null;
    };

    const targetNode = findNodeByPath(fileList || [], filePath) || findNodeByName(fileList || [], fileNameOnly);

    if (targetNode) {
      await Promise.resolve(openFile?.(targetNode));
      setTimeout(() => {
        executeJumpAndHighlight(targetLine, term);
      }, 100);
    } else if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const dummyNode = { name: fileNameOnly, kind: 'file' as const, path: filePath };
      await Promise.resolve(openFile?.(dummyNode));
      setTimeout(() => {
        executeJumpAndHighlight(targetLine, term);
      }, 120);
    } else if (rootFolder?.handle) {
      try {
        // 하위 폴더 경로(예: "sub/doc.md")를 단계별로 추적하여 FileHandle 획득
        const parts = filePath.replace(/\\/g, '/').split('/').filter((p: string) => p && p !== '.');
        if (parts.length > 0 && (parts[0] === rootFolder.handle.name || parts[0] === rootFolder.name)) {
          parts.shift();
        }
        let currDir = rootFolder.handle;
        for (let i = 0; i < parts.length - 1; i++) {
          currDir = await currDir.getDirectoryHandle(parts[i], { create: false });
        }
        const targetFileName = parts.length > 0 ? parts[parts.length - 1] : filePath;
        const fileHandle = await currDir.getFileHandle(targetFileName, { create: false });
        if (fileHandle) {
          const tempNode = { name: fileNameOnly, kind: 'file' as const, path: filePath, handle: fileHandle };
          await Promise.resolve(openFile?.(tempNode, currDir));
          setTimeout(() => {
            executeJumpAndHighlight(targetLine, term);
          }, 100);
        }
      } catch (e) {
        logError({
          file: 'frontend/src/components/sidebar/GlobalSearchPanel.tsx',
          func: 'handleFileOpenAndJump',
          doing: '브라우저 FSA 디렉터리 핸들을 추적하여 검색 결과 파일을 여는 작업',
          target: filePath,
          error: e
        });
        showToast?.("파일을 찾지 못했습니다.", "error");
      }
    } else {
      // VFS 폴백
      try {
        const { vfsReadFile } = await import('@/lib/virtualFileSystem');
        const vfsText = vfsReadFile(filePath);
        if (vfsText !== null && vfsText !== undefined) {
          await Promise.resolve(openFile?.({ name: fileNameOnly, kind: 'file' as const, path: filePath }));
          setTimeout(() => {
            executeJumpAndHighlight(targetLine, term);
          }, 100);
          return;
        }
      } catch (vfsErr) {
        logError({
          file: 'frontend/src/components/sidebar/GlobalSearchPanel.tsx',
          func: 'handleFileOpenAndJump',
          doing: '가상 파일 시스템(VFS)에서 검색 결과 파일을 조회하는 작업',
          target: filePath,
          error: vfsErr
        });
      }
      logError({
        file: 'frontend/src/components/sidebar/GlobalSearchPanel.tsx',
        func: 'handleFileOpenAndJump',
        doing: '전역 검색 결과 문서를 탐색기/VFS에서 찾아 여는 작업',
        target: filePath,
        error: new Error('Target file not found in tree or VFS')
      });
      showToast?.("파일을 찾지 못했습니다.", "error");
    }
  };

  const workspacePath = rootFolder?.type === 'GDRIVE'
    ? (rootFolder.path || rootFolder.name)
    : (rootFolder?.path ||
       (rootFolder?.name && rootFolder.name !== BROWSER_STORAGE_NAME ? rootFolder.name : undefined) ||
       (typeof window !== 'undefined'
         ? localStorage.getItem('onrivi_last_local_workspace_path') || localStorage.getItem('onrivi_workspace_path') || undefined
         : undefined));

  return (
    <div className={`flex-1 min-h-0 ${!isActive ? 'hidden' : ''}`}>
      <GlobalSearch
        isDarkMode={isDarkMode}
        content={content}
        currentFileName={currentFileName}
        currentFilePath={currentFileNode?.path || null}
        tabs={tabs}
        fileList={fileList}
        rootFolder={rootFolder}
        workspacePath={workspacePath}
        rootFolderHandle={rootFolder?.handle}
        workspaceType={workspaceType}
        onSelectFolder={onSelectRootFolder}
        onFileOpenAndJump={handleFileOpenAndJump}
      />
    </div>
  );
}
