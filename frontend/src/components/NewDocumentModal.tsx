// ====================================================================
// 📊 [OMD-MODAL-NewDocumentModal-0001] NewDocumentModal.tsx ➔ 새 문서 생성 모달
// 🎯 @KICK  : 상단 탭(+) 및 메뉴바(새 문서) 호출 시 원하는 폴더 위치와 파일명을 지정하여 새 마크다운 문서를 생성하는 전문 대화상자
// 🛡️ @GUARD : 특수문자 살균(Path Traversal 방지), 중복 파일명 사전 검증, 자동 포커스 및 ESC/Enter 키보드 바인딩
// 🚨 @PATCH : **2026-10-11** — [폴더 선택 및 파일명 지정 새 문서 생성 모달 신규 구축]:
//             1) 상단 탭(+) 및 메뉴바(새 문서 Ctrl+N) 클릭 시 폴더 선택(작업장 루트 및 모든 하위 폴더 트리)과 파일명 입력창 제공
//             2) .md 확장자 자동 보정, Modern Technical Editorial 코발트 테마 적용, 단축키(ESC/Enter) 및 유효성 검증 탑재
// 🔗 @CALLS : FileNode, Icon
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileNode } from '@/lib/indexedDbHelper';
import { Icon } from '@/components/icons/Icon';

interface FolderOption {
  id: string;
  name: string;
  depth: number;
  node: FileNode | null;
  pathDisplay: string;
}

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileList: FileNode[];
  rootFolder: any;
  workspaceType: string;
  onConfirm: (fileName: string, targetFolderNode: FileNode | null) => Promise<void>;
  isDarkMode?: boolean;
  initialName?: string;
  dialogTitle?: string;
  initialFolderNode?: FileNode | null;
  hideFolderSelection?: boolean;
  confirmLabel?: string;
}

export default function NewDocumentModal({
  isOpen,
  onClose,
  fileList,
  rootFolder,
  workspaceType,
  onConfirm,
  isDarkMode = false,
  initialName = '새 문서',
  dialogTitle,
  initialFolderNode,
  hideFolderSelection = false,
  confirmLabel
}: NewDocumentModalProps) {
  useModalEscape(isOpen, onClose);
  const [fileName, setFileName] = useState<string>('새 문서');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ROOT');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // 📂 작업장 내 모든 하위 폴더를 재귀적으로 탐색하여 옵션 목록 생성
  const folderOptions = useMemo<FolderOption[]>(() => {
    const list: FolderOption[] = [];

    // 1. 최상위 루트 폴더 옵션
    const rootDisplayName = rootFolder?.displayName || rootFolder?.name || (workspaceType === 'cloud' ? 'Google Drive 작업장' : '작업장 루트');
    list.push({
      id: 'ROOT',
      name: rootDisplayName,
      depth: 0,
      node: null,
      pathDisplay: `[루트] ${rootDisplayName}`
    });

    // 2. 하위 폴더 재귀 수집 함수
    const collectDirs = (nodes: FileNode[], depth: number, parentPathName: string) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (node.kind === 'directory') {
          const currentPathName = parentPathName ? `${parentPathName} / ${node.name}` : node.name;
          const nodeKey = node.path || node.id || node.driveId || `${parentPathName}_${node.name}`;
          list.push({
            id: nodeKey,
            name: node.name,
            depth,
            node,
            pathDisplay: currentPathName
          });
          if (node.children && node.children.length > 0) {
            collectDirs(node.children, depth + 1, currentPathName);
          }
        }
      }
    };

    collectDirs(fileList, 1, '');
    return list;
  }, [fileList, rootFolder, workspaceType]);

  // 모달이 열릴 때 기본값 리셋 및 인풋 포커스
  useEffect(() => {
    if (isOpen) {
      setFileName(initialName);
      setSelectedFolderId(initialFolderNode?.path || initialFolderNode?.id || initialFolderNode?.driveId || 'ROOT');
      setErrorMessage('');
      setIsSubmitting(false);

      // DOM 렌더링 완료 후 입력창 전체 선택 포커스
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialName, initialFolderNode]);

  if (!isOpen) return null;

  // 선택된 대상 폴더 노드 추출
  const selectedFolderOption = folderOptions.find(f => f.id === selectedFolderId);
  const targetFolderNode = selectedFolderOption ? selectedFolderOption.node : null;

  // 폼 제출 처리
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // 1. 파일명 살균 및 검증
    const trimmed = fileName.trim();
    if (!trimmed) {
      setErrorMessage('문서 이름을 입력해 주세요.');
      inputRef.current?.focus();
      return;
    }

    // 파일명에 허용되지 않는 특수문자 제거 (\ / : * ? " < > |)
    const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, '').trim();
    if (!sanitized) {
      setErrorMessage('올바른 파일 이름을 입력해 주세요. (특수문자 제외)');
      inputRef.current?.focus();
      return;
    }

    const finalName = sanitized.toLowerCase().endsWith('.md') ? sanitized : `${sanitized}.md`;

    // 2. 선택된 폴더 내 동일 파일명 중복 검사
    const targetChildren = targetFolderNode ? (targetFolderNode.children || []) : fileList;
    const isDuplicate = targetChildren.some(
      child => child.kind === 'file' && child.name.toLowerCase() === finalName.toLowerCase()
    );

    if (isDuplicate && !hideFolderSelection) {
      setErrorMessage(`선택한 폴더에 이미 '${finalName}' 파일이 존재합니다.`);
      inputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onConfirm(finalName, targetFolderNode);
      onClose();
    } catch (err: any) {
      console.error('[NewDocumentModal error]', err);
      setErrorMessage(err?.message || '새 문서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSubmitting) {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-md rounded-2xl shadow-2xl border transition-all overflow-hidden ${
          isDarkMode 
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-black/60' 
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-doc-title"
      >
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-6 py-4.5 border-b ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8]/10 text-[#1d4ed8] dark:bg-[#1d4ed8]/25 dark:text-blue-400 flex items-center justify-center">
              <Icon name="FileAdd" size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 id="new-doc-title" className="text-base font-bold tracking-tight">
                {dialogTitle || '새 문서 만들기'}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                원하는 저장 위치와 파일 이름을 지정하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            title="닫기 (ESC)"
          >
            <Icon name="Close" size={17} />
          </button>
        </div>

        {/* 본문 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* 1. 문서 이름 입력 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
              문서 이름 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="예: 01_시작하기"
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none font-medium transition-all ${
                  isDarkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/30'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 dark:text-zinc-500 pointer-events-none select-none">
                .md
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              확장자(.md)는 자동으로 붙습니다.
            </p>
          </div>

          {/* 2. 저장 위치(폴더) 선택 */}
          {hideFolderSelection ? <p className="text-sm text-slate-500">이름을 입력한 뒤 저장할 폴더를 선택합니다. 저장 완료 후 새 위치에서 계속 편집합니다.</p> : <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
              저장할 폴더 위치
            </label>
            <div className="relative">
              <select
                value={selectedFolderId}
                onChange={(e) => {
                  setSelectedFolderId(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none font-medium transition-all appearance-none pr-9 cursor-pointer ${
                  isDarkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/30'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20'
                }`}
              >
                {folderOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.depth === 0 ? `📁 ${opt.name}` : `${'　'.repeat(opt.depth)}└ 📁 ${opt.name}`}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500">
                <Icon name="ArrowDown" size={16} />
              </div>
            </div>
            {selectedFolderOption && (
              <p className="text-[11px] text-[#1d4ed8] dark:text-blue-400 font-medium truncate">
                선택 경로: {selectedFolderOption.pathDisplay}
              </p>
            )}
          </div>}

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Icon name="AlertError" size={15} className="shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold rounded-xl text-white bg-[#1d4ed8] hover:bg-[#1e40af] active:scale-95 shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Icon name="RotateCw" size={15} className="animate-spin" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Icon name="Plus" size={15} />
                  <span>{confirmLabel || (dialogTitle ? '가져오기' : '새 문서 만들기')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
