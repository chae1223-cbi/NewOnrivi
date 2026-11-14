/**
 * ====================================================================
 * 🏷️ 파일명 : FileTreeContextMenu.tsx
 * 🎭 역할(Role) : Manager (오버레이 통합 관리 — 파일 트리 노드 우클릭 컨텍스트 메뉴 포털)
 * 🎯 주요기능 : 파일/폴더 우클릭 컨텍스트 메뉴 렌더링, 컨텍스트 단축키 연동, 데스크톱 지식 베이스 등록/재분석/해제 메뉴 제공
 * 🚨 @PATCH : 2026-11-14 — [폴더 우클릭 컨텍스트 메뉴에 '폴더 기본 서식 설정' 항목 추가]:
 *             1) 디렉터리 노드 우클릭 시 해당 폴더의 디폴트 서식 프로필을 조회·변경할 수 있는 '폴더 기본 서식 설정' 버튼 및 현재 서식 배지 표시
 * 🚨 @PATCH : 2026-11-04 — [FileTreeItem 모듈화 분리 및 1·2단계 표준 주석·오류 진단(logError) 적용]
 *             1) FileTreeItem에서 컨텍스트 메뉴 포털 및 지식문서 등록/재색인/해제 UI를 전용 컴포넌트로 분리
 *             2) onrivi-source-comments 및 onrivi-error-handling 스킬 규격 적용
 * ====================================================================
 */
"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { Icon } from '@/components/icons/Icon';
import { FileNode } from '@/lib/indexedDbHelper';
import { checkKnowledgeGuard } from '@/lib/knowledge/knowledgeGuard';
import { loadSecureData } from '@/lib/secureStorage';
import { knowledgeClient, canAccessKnowledgeDb } from '@/lib/knowledge/knowledgeClient';
import { buildDirectWorkspacePath, computeRelativeFolderPath } from '@/lib/knowledge/pathResolver';
import { logError } from '@/lib/errorDiagnostics';

export interface FileTreeContextMenuProps {
  contextMenu: { x: number; y: number };
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  node: FileNode;
  parentHandle: any;
  currentFilePath?: string;
  isRestrictedUser: boolean;
  isMac: boolean;
  isMarkdown: boolean;
  hasClipboardCut: boolean;
  hasUndoableMove: boolean;
  lastUndoType: 'move' | 'delete';
  isKnowledgeRegistered: boolean;
  setIsKnowledgeRegistered: React.Dispatch<React.SetStateAction<boolean>>;
  handleMenuMouseEnter: () => void;
  handleMenuMouseLeave: () => void;
  triggerCreateFile: (e?: any) => void;
  triggerCreateFolder: (e?: any) => void;
  triggerFolderStyle?: (e?: any) => void;
  folderProfileName?: string | null;
  triggerRename: (e?: any) => void;
  triggerCopy: (e?: any) => void;
  triggerCut: (e?: any) => void;
  triggerPaste: (e?: any) => void;
  triggerReveal: (e?: any) => void;
  triggerCancelCut: (e?: any) => void;
  triggerUndoMove: (e?: any) => void;
  triggerDelete: (e?: any) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/**
 * ========================================================================================
 * [컴포넌트명] FileTreeContextMenu - 파일 탐색기 트리 항목 우클릭 컨텍스트 메뉴 포털
 *
 * @param {FileTreeContextMenuProps} props - 메뉴 좌표, 대상 노드 및 액션 핸들러
 * @returns {React.ReactPortal | null} 포털 렌더링된 컨텍스트 메뉴
 * ==========================================================================================
 */
export default function FileTreeContextMenu({
  contextMenu,
  setContextMenu,
  node,
  parentHandle,
  currentFilePath,
  isRestrictedUser,
  isMac,
  isMarkdown,
  hasClipboardCut,
  hasUndoableMove,
  lastUndoType,
  isKnowledgeRegistered,
  setIsKnowledgeRegistered,
  handleMenuMouseEnter,
  handleMenuMouseLeave,
  triggerCreateFile,
  triggerCreateFolder,
  triggerFolderStyle,
  folderProfileName,
  triggerRename,
  triggerCopy,
  triggerCut,
  triggerPaste,
  triggerReveal,
  triggerCancelCut,
  triggerUndoMove,
  triggerDelete,
  showToast,
}: FileTreeContextMenuProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        e.preventDefault();
        setContextMenu(null);
        if (hasClipboardCut) {
          window.dispatchEvent(new CustomEvent('file:cancel-cut'));
        }
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        triggerRename(e);
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        triggerDelete(e);
        return;
      }

      if (isCtrl && e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        if (node.kind === 'directory') {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
          window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } }));
        }
        return;
      }

      if (e.altKey && !isCtrl && (e.key === 'N' || e.key === 'n')) {
        if (node.kind === 'directory') {
          e.preventDefault();
          e.stopPropagation();
          triggerCreateFile(e);
        }
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCopy(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCut(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        triggerPaste(e);
        return;
      }

      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu(null);
        if (hasClipboardCut) {
          window.dispatchEvent(new CustomEvent('file:cancel-cut'));
        } else if (hasUndoableMove) {
          window.dispatchEvent(new CustomEvent('file:undo-move'));
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isMac, hasClipboardCut, hasUndoableMove, node, parentHandle, setContextMenu, triggerRename, triggerDelete, triggerCreateFile, triggerCopy, triggerCut, triggerPaste]);

  if (typeof document === 'undefined') return null;

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
        top: Math.max(10, Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 340 : contextMenu.y)),
        left: Math.max(10, Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : contextMenu.x)),
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={handleMenuMouseEnter}
      onMouseLeave={handleMenuMouseLeave}
    >
      <fieldset disabled={isRestrictedUser} className="flex flex-col text-[12px] text-gray-700 dark:text-gray-300 font-medium [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
        {node.kind === 'directory' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); triggerCreateFile(e); }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="FileAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">새 파일</span>
              </div>
              <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌥N' : 'Alt+N'}</kbd>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); triggerCreateFolder(e); }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="FolderAdd" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">새 폴더</span>
              </div>
            </button>
            {triggerFolderStyle && (
              <button
                onClick={(e) => { e.stopPropagation(); triggerFolderStyle(e); }}
                className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-[#1d4ed8] dark:text-blue-400 font-semibold"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="Palette" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-85" />
                  <span className="truncate">폴더 기본 서식 설정</span>
                </div>
                {folderProfileName && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 truncate max-w-[85px] shrink-0">
                    {folderProfileName}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(null);
                window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { node, parentHandle: node.handle || parentHandle } }));
              }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-blue-600 dark:text-blue-400 font-medium"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="Document" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">파일 열기</span>
              </div>
              <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌥⌘O' : 'Ctrl+Alt+O'}</kbd>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(null);
                const targetPath = node.path || node.name;
                const relPath = computeRelativeFolderPath(currentFilePath, targetPath);
                const folderLink = `[${node.name}](<${relPath}>)`;
                try {
                  navigator.clipboard.writeText(folderLink);
                } catch {}
                window.dispatchEvent(new CustomEvent('app:insert-folder-link', {
                  detail: { link: folderLink, folderName: node.name }
                }));
              }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors text-blue-600 dark:text-blue-400 font-medium cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="Link" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">폴더 연결</span>
              </div>
            </button>
          </>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); triggerRename(e); }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="Pencil" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">이름 변경</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">F2</kbd>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); triggerCopy(e); }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="Copy" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">복사하기</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘C' : 'Ctrl+C'}</kbd>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); triggerCut(e); }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="Cut" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">잘라내기</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘X' : 'Ctrl+X'}</kbd>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); triggerPaste(e); }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="ClipboardPaste" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">붙여넣기</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘V' : 'Ctrl+V'}</kbd>
        </button>
        {hasClipboardCut && (
          <button
            onClick={(e) => { e.stopPropagation(); triggerCancelCut(e); }}
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
            onClick={(e) => { e.stopPropagation(); triggerUndoMove(e); }}
            className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="Undo2" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
              <span className="truncate">{lastUndoType === 'delete' ? '삭제 되돌리기' : '이동 되돌리기'}</span>
            </div>
            <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">{isMac ? '⌘Z' : 'Ctrl+Z'}</kbd>
          </button>
        )}
        {(() => {
          const isElectronApp = typeof window !== 'undefined' && !!(window as any).electronAPI;
          if (!isElectronApp || !node.path) return null;
          const label = isMac ? 'Finder에서 보기' : '파일 탐색기에서 보기';
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerReveal(e);
              }}
              className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white w-full text-left transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon name="FolderOpen" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                <span className="truncate">{label}</span>
              </div>
            </button>
          );
        })()}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete(e);
          }}
          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 w-full text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="Delete" size={15} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
            <span className="truncate">삭제</span>
          </div>
          <kbd className="ml-auto pl-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium font-mono tracking-tight shrink-0">Del</kbd>
        </button>

        {/* 🧠 지식 베이스 등록 버튼 (마크다운 전용) */}
        {node.kind === 'file' && isMarkdown && (() => {
          let rawFolder = (
            loadSecureData<string>('resourceFolder') ||
            (typeof window !== 'undefined' ? localStorage.getItem('onrivi_resource_folder_path') : '') ||
            (typeof window !== 'undefined' ? localStorage.getItem('onrivi_resource_folder') : '') ||
            (() => {
              try {
                const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                return raw ? JSON.parse(raw).resourceFolder || '' : '';
              } catch { return ''; }
            })() ||
            'Onrivi_Asset'
          ).trim();

          if (rawFolder.startsWith('U2FsdGVkX1')) {
            const decrypted = loadSecureData<string>('resourceFolder');
            rawFolder = (decrypted && !decrypted.startsWith('U2FsdGVkX1')) ? decrypted : 'Onrivi_Asset';
          }
          const resourceFolder = rawFolder || 'Onrivi_Asset';

          const geminiApiKey = (
            (typeof window !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') ||
            loadSecureData<string>('geminiApiKey') ||
            loadSecureData<string>('onrivi_gemini_api_key') ||
            (() => {
              try {
                const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                return raw ? JSON.parse(raw).geminiApiKey || '' : '';
              } catch { return ''; }
            })() ||
            ''
          ).trim();

          const planCode = (() => {
            try {
              const status = loadSecureData<any>('onrivi_license_status');
              if (status?.planName) return String(status.planName);
            } catch {}
            return loadSecureData<string>('planCode') || 'ELITEPRO';
          })();

          const aiModelName = (
            (typeof window !== 'undefined' ? localStorage.getItem('onrivi_ai_model_name') : '') ||
            (() => {
              try {
                const raw = typeof window !== 'undefined' ? localStorage.getItem('onrivi_settings') : null;
                return raw ? JSON.parse(raw).aiModelName || '' : '';
              } catch { return ''; }
            })() ||
            'gemini-3.8-flash'
          ).trim();

          const isDesktopEnv = typeof window !== 'undefined' && (
            !!(window as any).electronAPI ||
            navigator.userAgent.toLowerCase().includes('electron') ||
            new URLSearchParams(window.location.search).get('env') === 'desktop'
          );

          if (!isDesktopEnv) {
            return null;
          }

          const guard = checkKnowledgeGuard({ resourceFolder, geminiApiKey, planCode });

          const performKnowledgeIndex = async (isReindex: boolean) => {
            setContextMenu(null);
            const canUseLocalDb = await canAccessKnowledgeDb();
            if (!canUseLocalDb) {
              showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
              return;
            }
            if (!guard.canUseKnowledge) {
              showToast(guard.blockMessage || '지식 엔진을 사용할 수 없습니다.', 'warning');
              window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
              return;
            }

            const directFilePath = buildDirectWorkspacePath(node.path || node.name);

            window.dispatchEvent(new CustomEvent('knowledge:open-index-progress', {
              detail: {
                filePath: directFilePath,
                title: node.name.replace(/\.md$/i, ''),
                isReindex,
                fileNode: node,
                resourceFolder,
                geminiApiKey,
                planCode,
                aiModelName,
              }
            }));
          };

          return (
            <>
              <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
              {isKnowledgeRegistered ? (
                <>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setContextMenu(null);
                      const canUseLocalDb = await canAccessKnowledgeDb();
                      if (!canUseLocalDb) {
                        showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
                        return;
                      }
                      const myPath = node.path || node.name;
                      try {
                        showToast(`[${node.name}] 지식 상세 분석을 불러오는 중...`, 'info');
                        const detail = await knowledgeClient.getDocumentDetail({
                          filePath: myPath,
                          resourceFolder,
                          geminiApiKey,
                          planCode,
                          resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
                        });
                        if (detail) {
                          window.dispatchEvent(new CustomEvent('knowledge:show-detail', { detail }));
                        } else {
                          showToast('지식 상세 정보를 찾을 수 없습니다.', 'warning');
                        }
                      } catch (err) {
                        logError({
                          file: 'frontend/src/components/sidebar/explorer/FileTreeContextMenu.tsx',
                          func: 'getDocumentDetail',
                          doing: '지식 베이스 등록 문서의 상세 분석 정보를 조회하는 작업',
                          target: myPath,
                          error: err,
                        });
                        showToast('지식 상세 정보 로드 실패', 'error');
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                    title="이 문서의 AI 요약, 핵심 요점, 청크 구조 및 태그를 상세 열람합니다"
                  >
                    <span className="text-[14px]">📑</span>
                    <span>지식 분석 상세 (KUI-010)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!guard.canUseKnowledge}
                    onClick={(e) => {
                      e.stopPropagation();
                      performKnowledgeIndex(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[#1d4ed8] dark:text-blue-400 font-bold cursor-pointer"
                    title="최신 청킹 규칙 및 AI 분석 모델로 이 문서를 다시 분석하여 갱신합니다"
                  >
                    <span className="text-[14px]">🔄</span>
                    <span>지식 재분석 (재색인)</span>
                  </button>

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setContextMenu(null);
                      const canUseLocalDb = await canAccessKnowledgeDb();
                      if (!canUseLocalDb) {
                        showToast('로컬 지식 베이스를 사용하려면 먼저 공통 리소스 폴더(Onrivi_Asset)를 지정해 주세요.', 'info');
                        return;
                      }
                      const myPath = node.path || node.name;
                      if (!confirm(`'${node.name}' 문서를 지식 베이스에서 해제하시겠습니까?`)) return;

                      try {
                        showToast(`[${node.name}] 지식 문서 해제를 진행합니다...`, 'info');
                        const ok = await knowledgeClient.deleteDocument({
                          filePath: myPath,
                          resourceFolder,
                          geminiApiKey,
                          planCode,
                          resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
                        });
                        if (!ok) {
                          throw new Error('지식 문서 해제에 실패했습니다.');
                        }

                        try {
                          const list = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
                          const norm = (s: string) => (s || '').replace(/\\/g, '/').toLowerCase().trim();
                          const targetP = norm(myPath);
                          const targetN = norm(node.name);

                          const updated = (Array.isArray(list) ? list : []).filter((rawP: string) => {
                            const p = norm(rawP);
                            const isTarget =
                              p === targetP ||
                              p === targetN ||
                              p.endsWith('/' + targetN) ||
                              targetP.endsWith('/' + p) ||
                              p.endsWith(targetP) ||
                              targetP.endsWith(p);
                            return !isTarget;
                          });
                          localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(updated));
                        } catch {}

                        showToast(`[${node.name}] 지식 문서 등록이 성공적으로 해제되었습니다.`, 'info');
                        setIsKnowledgeRegistered(false);
                        window.dispatchEvent(new CustomEvent('knowledge:updated'));
                        window.dispatchEvent(new CustomEvent('knowledge:refresh'));
                        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                      } catch (err: any) {
                        logError({
                          file: 'frontend/src/components/sidebar/explorer/FileTreeContextMenu.tsx',
                          func: 'deleteDocument',
                          doing: '지식 베이스에 등록된 문서를 해제하는 작업',
                          target: myPath,
                          error: err,
                        });
                        showToast(`지식 해제 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold cursor-pointer"
                    title="이 마크다운 문서를 지식 베이스에서 해제합니다"
                  >
                    <span className="text-[14px]">📗</span>
                    <span>지식문서 해제</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!guard.canUseKnowledge}
                  onClick={(e) => {
                    e.stopPropagation();
                    performKnowledgeIndex(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors font-bold ${
                    !guard.canUseKnowledge
                      ? 'opacity-40 cursor-not-allowed grayscale text-zinc-400 dark:text-zinc-500'
                      : 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer'
                  }`}
                  title={guard.canUseKnowledge ? '이 마크다운 문서를 개인 지식 베이스에 등록합니다' : (guard.blockMessage || '지식 베이스에 등록하려면 AI 연동 설정이 필요합니다')}
                >
                  <span className="text-[14px]">⭐</span>
                  <span>지식문서 등록{!guard.canUseKnowledge ? ' (연동 필요)' : ''}</span>
                </button>
              )}
            </>
          );
        })()}
      </fieldset>
    </div>,
    document.body
  );
}
