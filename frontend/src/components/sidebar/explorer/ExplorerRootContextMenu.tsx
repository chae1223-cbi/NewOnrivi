/**
 * ====================================================================
 * 🏷️ 파일명 : ExplorerRootContextMenu.tsx
 * 🎭 역할(Role) : Manager (오버레이 통합 관리 — 탐색기 루트 우클릭 컨텍스트 메뉴 및 문서 가져오기 모달/진행률 포털)
 * 🎯 주요기능 : 루트 워크스페이스 컨텍스트 메뉴 포털·단축키 처리 및 문서 가져오기 위치 선택/이름 입력/진행률 오버레이 렌더링
 * 🚨 @PATCH : 2026-11-04 — [FileExplorerPanel 모듈화 분리 및 1·2단계 표준 주석 적용]
 *             1) FileExplorerPanel에서 루트 컨텍스트 메뉴 포털과 문서 가져오기 오버레이(ExplorerImportOverlays)를 전용 컴포넌트로 분리
 *             2) onrivi-source-comments 스킬 규격 준수
 * 🚨 @PATCH : 2026-11-11 — [파일 열기 형식 안내 보완]: DOC 및 HWPX 지원 형식을 가져오기 안내에 표시
 * 🚨 @PATCH : 2026-11-11 — [사이드바 대상 폴더 복원]: 원본 파일 경로 고정을 제거하고 선택한 탐색기 폴더를 저장 위치로 사용
 * ====================================================================
 */
"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';
import NewDocumentModal from '@/components/NewDocumentModal';
import { IMPORT_ACCEPT } from '@/lib/importFormats';
import { FileNode } from '@/lib/indexedDbHelper';

export interface ExplorerRootContextMenuProps {
  contextMenu: { x: number; y: number };
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  isRestrictedUser: boolean;
  clipboardNode: { node: FileNode; parentHandle?: any; op?: 'copy' | 'cut' } | null;
  hasUndoableMove: boolean;
  lastUndoType: 'move' | 'delete';
  handleMenuMouseEnter: () => void;
  handleMenuMouseLeave: () => void;
  handleCancelCut: () => void;
  triggerUndo: () => void;
  triggerCreateRootFile: () => void;
  triggerCreateRootFolder: () => void;
  triggerCopyRoot: () => void;
  triggerCutRoot: () => void;
  triggerPasteRoot: () => void;
  triggerCancelCutRoot: () => void;
  triggerUndoMoveRoot: () => void;
  triggerRefreshRoot: () => void;
  triggerImportRoot: () => void;
  triggerRevealRoot: () => void;
}

/**
 * ========================================================================================
 * [컴포넌트명] ExplorerRootContextMenu - 탐색기 루트 영역 우클릭 컨텍스트 메뉴 포털
 *
 * @param {ExplorerRootContextMenuProps} props - 루트 컨텍스트 메뉴 좌표 및 액션 트리거 핸들러
 * @returns {React.ReactPortal | null} 포털 렌더링된 루트 컨텍스트 메뉴
 * ==========================================================================================
 */
export default function ExplorerRootContextMenu({
  contextMenu,
  setContextMenu,
  isRestrictedUser,
  clipboardNode,
  hasUndoableMove,
  lastUndoType,
  handleMenuMouseEnter,
  handleMenuMouseLeave,
  handleCancelCut,
  triggerUndo,
  triggerCreateRootFile,
  triggerCreateRootFolder,
  triggerCopyRoot,
  triggerCutRoot,
  triggerPasteRoot,
  triggerCancelCutRoot,
  triggerUndoMoveRoot,
  triggerRefreshRoot,
  triggerImportRoot,
  triggerRevealRoot,
}: ExplorerRootContextMenuProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
      const isCtrl = isMacPlatform ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        setContextMenu(null);
        if (clipboardNode?.op === 'cut') {
          handleCancelCut();
        }
        return;
      }

      if (isCtrl && e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        triggerRefreshRoot();
        return;
      }

      if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerImportRoot();
        }
        return;
      }

      if (e.altKey && !isCtrl && !e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCreateRootFile();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCopyRoot();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerCutRoot();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        if (!isRestrictedUser) {
          e.preventDefault();
          e.stopPropagation();
          triggerPasteRoot();
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        triggerUndo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isRestrictedUser, clipboardNode, setContextMenu, handleCancelCut, triggerUndo, triggerRefreshRoot, triggerImportRoot, triggerCreateRootFile, triggerCopyRoot, triggerCutRoot, triggerPasteRoot]);

  if (typeof document === 'undefined') return null;

  const isMacPlatform = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

  return createPortal(
    <div
      ref={(el) => {
        if (el && typeof window !== 'undefined') {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > window.innerHeight - 10) {
            const newTop = Math.max(10, window.innerHeight - rect.height - 12);
            el.style.top = `${newTop}px`;
          }
          if (rect.right > window.innerWidth - 10) {
            const newLeft = Math.max(10, window.innerWidth - rect.width - 12);
            el.style.left = `${newLeft}px`;
          }
        }
      }}
      className="fixed z-[100000] py-1 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-black/10 dark:border-white/10 min-w-[210px] max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: Math.max(10, Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 250 : contextMenu.y)),
        left: Math.max(10, Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : contextMenu.x)),
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
    >
      <div className="flex flex-col text-[12px] text-gray-700 dark:text-gray-300 font-medium py-0.5">
        <fieldset disabled={isRestrictedUser} className="flex flex-col [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerCreateRootFile();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="FileAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">새 파일</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌥N' : 'Alt+N'}</kbd>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerCreateRootFolder();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="FolderAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">새 폴더</span>
            </div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerCopyRoot();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="Copy" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">복사하기</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘C' : 'Ctrl+C'}</kbd>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerCutRoot();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="Cut" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">잘라내기</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘X' : 'Ctrl+X'}</kbd>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerPasteRoot();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="ClipboardPaste" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">붙여넣기</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘V' : 'Ctrl+V'}</kbd>
          </button>
          {clipboardNode?.op === 'cut' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerCancelCutRoot();
              }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-amber-600 dark:text-amber-400 font-medium"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">잘라내기 취소</span>
              </div>
              <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">Esc</kbd>
            </button>
          )}
          {hasUndoableMove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerUndoMoveRoot();
              }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">{lastUndoType === 'delete' ? '삭제 되돌리기' : '이동 되돌리기'}</span>
              </div>
              <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘Z' : 'Ctrl+Z'}</kbd>
            </button>
          )}
        </fieldset>
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerRefreshRoot();
          }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="RotateCw" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">새로고침</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌘F5' : 'Ctrl+F5'}</kbd>
        </button>
        <fieldset disabled={isRestrictedUser} className="flex flex-col [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerImportRoot();
            }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="FolderInput" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">파일 열기</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMacPlatform ? '⌥⌘O' : 'Ctrl+Alt+O'}</kbd>
          </button>
          {(() => {
            const isDesktopApp = typeof window !== 'undefined' && !!(window as any).electronAPI;
            if (!isDesktopApp) return null;
            const explorerLabel = isMacPlatform ? 'Finder에서 보기' : '파일 탐색기에서 보기';
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerRevealRoot();
                }}
                className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
                title={explorerLabel}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="FolderOpen" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                  <span className="truncate">{explorerLabel}</span>
                </div>
              </button>
            );
          })()}
        </fieldset>
      </div>
    </div>,
    document.body
  );
}

export interface ExplorerImportOverlaysProps {
  showImportSource: boolean;
  setShowImportSource: React.Dispatch<React.SetStateAction<boolean>>;
  openImportPicker: (source?: 'local' | 'drive') => Promise<void>;
  importFileInputRef: React.RefObject<HTMLInputElement>;
  chooseImportDestination: (file: File) => void;
  pendingImportFile: File | null;
  setPendingImportFile: React.Dispatch<React.SetStateAction<File | null>>;
  fileList: FileNode[];
  rootFolder: any;
  workspaceType: string;
  targetImportNodeRef: React.MutableRefObject<FileNode | null>;
  targetImportParentHandleRef: React.MutableRefObject<any>;
  importNameRef: React.MutableRefObject<string | null>;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isImporting: boolean;
}

/**
 * ========================================================================================
 * [컴포넌트명] ExplorerImportOverlays - 문서 가져오기 소스 선택 모달, 폴더/파일명 모달 및 변환 진행률 포털
 *
 * @param {ExplorerImportOverlaysProps} props - 가져오기 상태 및 핸들러
 * @returns {JSX.Element} 문서 가져오기 관련 모달 및 포털 묶음
 * ==========================================================================================
 */
export function ExplorerImportOverlays({
  showImportSource,
  setShowImportSource,
  openImportPicker,
  importFileInputRef,
  chooseImportDestination,
  pendingImportFile,
  setPendingImportFile,
  fileList,
  rootFolder,
  workspaceType,
  targetImportNodeRef,
  targetImportParentHandleRef,
  importNameRef,
  handleImportFile,
  isImporting,
}: ExplorerImportOverlaysProps) {
  return (
    <>
      {showImportSource && (
        <div
          className="fixed inset-0 z-[1000000] bg-black/60 flex items-center justify-center p-4"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setShowImportSource(false);
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-label="파일 가져올 위치 선택" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">파일 열기 · 가져오기</h2>
            <p className="text-sm">가져올 파일의 위치를 선택해 주세요. 파일은 Markdown(.md)으로 변환한 뒤 선택한 작업장 폴더에 저장합니다.</p>
            <button type="button" autoFocus className="block w-full border rounded-lg p-3 text-left" onClick={() => void openImportPicker('local')}>📁 내 PC(로컬)에서 가져오기</button>
            <button type="button" className="block w-full border rounded-lg p-3 text-left" onClick={() => void openImportPicker('drive')}>☁️ 웹드라이브에서 가져오기</button>
            <p className="text-xs">DOC · DOCX · HWP · HWPX · PDF · EPUB · TXT · MD · HTML</p>
            <div className="text-right">
              <button type="button" className="border rounded px-4 py-2" onClick={() => setShowImportSource(false)}>취소</button>
            </div>
          </section>
        </div>
      )}
      <input
        type="file"
        ref={importFileInputRef}
        style={{ display: 'none' }}
        accept={IMPORT_ACCEPT}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) chooseImportDestination(file);
        }}
      />
      <NewDocumentModal
        isOpen={!!pendingImportFile}
        onClose={() => setPendingImportFile(null)}
        fileList={fileList}
        rootFolder={rootFolder}
        workspaceType={workspaceType}
        initialName={pendingImportFile?.name.replace(/\.[^.]+$/, '') || '문서'}
        dialogTitle="파일 가져올 폴더와 이름"
        initialFolderNode={targetImportNodeRef.current}
        onConfirm={async (name, node) => {
          if (!pendingImportFile) return;
          const file = pendingImportFile;
          targetImportNodeRef.current = node;
          targetImportParentHandleRef.current = node?.handle || rootFolder?.handle || null;
          importNameRef.current = name;
          await handleImportFile({ target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>);
          setPendingImportFile(null);
        }}
      />
      {isImporting && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-16 right-6 z-[9999999] pointer-events-none">
          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-sm border border-slate-700/50 text-center animate-in fade-in zoom-in duration-200" role="status" aria-live="polite">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <img src="./icon.png" alt="Onrivi" className="w-10 h-10 object-contain animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">문서 구조화 및 분석 중...</h3>
            <p className="text-sm text-slate-300 opacity-90 leading-relaxed">
              문서의 텍스트·표·이미지를 추출하여<br />편집할 수 있는 마크다운으로 변환하고 있습니다.
            </p>
            <p className="text-xs text-blue-400 mt-4 font-medium animate-pulse">
              AI 없이 변환합니다. 문서 크기에 따라 시간이 걸릴 수 있습니다.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
