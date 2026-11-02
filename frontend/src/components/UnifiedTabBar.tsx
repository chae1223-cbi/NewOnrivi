import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Copy, ArrowRightToLine, ArrowLeftRight, XSquare, Pencil } from 'lucide-react';
import PromptModal from '@/components/PromptModal';
import { FileNode } from '@/lib/indexedDbHelper';
import { useEditorContext } from '@/context/EditorContext';

// ====================================================================
// 📊 [OMD-EDIT-UnifiedTabBar-0002] UnifiedTabBar ➔ EditorTab
// 🎯 @KICK  : 에디터 탭 인터페이스 - id, name, path, content, isModified 등 탭 상태 정의
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : **2026-10-15** — [화면 흔들림 방어]: 탭 항목 및 (+) 버튼의 transition-all, scale-[0.98], active:scale-95를 transition-colors 및 고정 스케일로 전환하여 클릭/전환 시 탭 바 및 화면 미세 떨림 완전 해소
// 🚨 @PATCH : **2026-10-11** — [열린 탭 우클릭 이름 바꾸기 및 더블클릭 이름 변경 지원]:
//             탭 우클릭 컨텍스트 메뉴(Pencil) 및 더블클릭을 통해 열려 있는 문서의 이름을 즉각 변경하고, 파일 시스템 및 탭 메타데이터(file:tab-renamed) 실시간 동기화
// 🚨 @PATCH : **2026-10-11** — [상단 탭 바 브라우저 표준 새 문서(+) 버튼 신설]:
//             탭 목록 바로 우측에 원클릭 새 문서(+) 추가 버튼을 배치하여 누구나 직관적으로 새 원고 탭을 생성하고 작업할 수 있도록 개선
// 🚨 @PATCH : **2026-09-26** — [상단 탭 바 중복 탭 렌더링 원천 차단 가드]: visibleTabs에서 seenTabIds 필터링을 도입하여 동일한 탭 ID/경로가 2개 이상 렌더링되어 파란색 활성 탭이 중복 노출되던 결함 완전 방어
// 🚨 @PATCH : **2026-09-11** — 에디터 문서 탭바 폰트를 Pretendard 최우선으로 일원화 적용
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-02** — [ONRIVI-DS-SYSTEM-002 v5.0] 좌측 사이드바 탭과 100% 동일한 폰트(LineSeed/D2Coding/Pretendard 12px bold), 캡슐형 형태(rounded-md), LDSG 그린 그라데이션(bg-gradient-to-r from-[#1d4ed8] to-[#1e40af])으로 상단 탭 스타일 통일
//             **2026-08-27** — 에디터 개별 문서 탭을 마우스 드래그 앤 드롭(HTML5 Drag & Drop)으로 원하는 순서대로 자유롭게 이동시킬 수 있도록 UI 지원하고, 변경된 탭 순서를 localStorage(onrivi_tabs_order)에 저장 및 다음 접속/새로고침 시 해당 순서로 자동 복원 및 정렬 동기화 구현; **2026-07-04** — 저장이 필요한 경우에만 탭명 옆에 황금색 도트(#FFD700)를 노출하고, 닫기 버튼은 저장 여부와 상관없이 항시 우측에 배치하여 언제든지 탭을 닫을 수 있도록 UI 편의성 보정 패치
// 🔗 @CALLS : 없음
// ====================================================================
export interface EditorTab {
  id: string;
  name: string;
  path: string | null;
  node: FileNode | null;
  content: string;
  isModified: boolean;
  scrollTop?: number;
  model?: any;
  previewMode?: 'edit' | 'both' | 'preview' | 'css-style';
  isStyleTab?: boolean;
}

export default function UnifiedTabBar() {
  const { tabs, activeTabId, switchTab: onSwitchTab, closeTab: onCloseTab, isDarkMode, setTabs, dispatchCommand, workspaceType, rootFolder, showToast, refreshFileList } = useEditorContext();
  
  // 📌 드래그 앤 드롭 탭 순서 제어 상태
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  // 🏷️ 탭 이름 바꾸기 프롬프트 상태
  const [renamePrompt, setRenamePrompt] = useState<{ isOpen: boolean; tabId: string; currentName: string; error?: string }>({ isOpen: false, tabId: '', currentName: '' });

  const handleRenameConfirm = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setRenamePrompt(prev => ({ ...prev, error: '파일 이름을 입력해 주세요.' }));
      return;
    }
    const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, '').trim();
    if (!sanitized) {
      setRenamePrompt(prev => ({ ...prev, error: '올바른 파일 이름을 입력해 주세요.' }));
      return;
    }
    const finalName = sanitized.toLowerCase().endsWith('.md') ? sanitized : `${sanitized}.md`;
    const targetTab = tabs.find((t: EditorTab) => t.id === renamePrompt.tabId);
    if (!targetTab) return;

    if (targetTab.name === finalName) {
      setRenamePrompt({ isOpen: false, tabId: '', currentName: '' });
      return;
    }

    try {
      const oldPath = targetTab.path || '';
      const oldName = targetTab.name;

      // 1. 구글 드라이브 파일 이름 변경
      if (workspaceType === 'cloud' || rootFolder?.type === 'GDRIVE') {
        const driveFileId = targetTab.node?.driveId || targetTab.node?.driveFileId || (targetTab as any).driveId;
        if (driveFileId) {
          const { getSavedDriveToken, renameDriveItem } = await import('@/lib/gdrive/googleDriveClient');
          const token = getSavedDriveToken();
          if (token) {
            await renameDriveItem(token, driveFileId, finalName);
          }
        }
      }

      // 2. 데스크톱 파일 이름 변경
      const api = (window as any).electronAPI;
      if (api?.renameFile && oldPath) {
        const normalizedOld = oldPath.replace(/\\/g, '/');
        const lastSlash = normalizedOld.lastIndexOf('/');
        const parentDir = lastSlash !== -1 ? normalizedOld.substring(0, lastSlash) : '';
        const newPath = parentDir ? `${parentDir}/${finalName}` : finalName;
        await api.renameFile(oldPath, newPath.replace(/\//g, '\\'));
      }

      // 3. 브라우저 FSA 파일 이름 변경
      if (workspaceType === 'browser' && targetTab.node?.handle) {
        const parentHandle = rootFolder?.handle;
        if (parentHandle) {
          const file = await targetTab.node.handle.getFile();
          const text = await file.text();
          const newHandle = await parentHandle.getFileHandle(finalName, { create: true });
          const writable = await newHandle.createWritable();
          await writable.write(text);
          await writable.close();
          await parentHandle.removeEntry(oldName);
        }
      }

      // 4. 전역 탭 동기화 이벤트 발송 및 탭 업데이트
      const normalizedOld = oldPath.replace(/\\/g, '/');
      const lastSlash = normalizedOld.lastIndexOf('/');
      const parentDir = lastSlash !== -1 ? normalizedOld.substring(0, lastSlash) : '';
      const newPath = parentDir ? `${parentDir}/${finalName}` : finalName;

      setTabs((prev: EditorTab[]) => prev.map(t => {
        if (t.id === targetTab.id) {
          return { ...t, name: finalName, path: newPath };
        }
        return t;
      }));

      window.dispatchEvent(new CustomEvent('file:tab-renamed', {
        detail: { oldPath, newPath, newName: finalName }
      }));
      window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
      if (refreshFileList) await refreshFileList();

      setRenamePrompt({ isOpen: false, tabId: '', currentName: '' });
      showToast?.(`'${finalName}'(으)로 이름이 변경되었습니다.`, 'success');
    } catch (err: any) {
      console.error('[handleRenameConfirm error]', err);
      setRenamePrompt(prev => ({ ...prev, error: err?.message || '이름 변경에 실패했습니다.' }));
    }
  };


  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetId) return;

    const sourceIndex = tabs.findIndex((t: EditorTab) => t.id === draggedTabId);
    const targetIndex = tabs.findIndex((t: EditorTab) => t.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const updatedTabs = [...tabs];
      const [draggedTab] = updatedTabs.splice(sourceIndex, 1);
      updatedTabs.splice(targetIndex, 0, draggedTab);
      
      if (setTabs) {
        setTabs(updatedTabs);
        // 💾 [탭 순서 영구 보존] localStorage 에 저장
        const tabOrder = updatedTabs.map(t => t.id);
        localStorage.setItem('onrivi_tabs_order', JSON.stringify(tabOrder));
      }
    }
    setDraggedTabId(null);
  };

  // 💡 Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, tabId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu?.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  };

  const handleCloseOtherTabs = () => {
    if (!contextMenu) return;
    tabs.forEach((tab: EditorTab) => {
      if (tab.id !== contextMenu.tabId) onCloseTab(tab.id);
    });
    setContextMenu(null);
  };

  const handleCloseTabsToRight = () => {
    if (!contextMenu) return;
    const index = tabs.findIndex((t: EditorTab) => t.id === contextMenu.tabId);
    if (index !== -1) {
      for (let i = index + 1; i < tabs.length; i++) {
        onCloseTab(tabs[i].id);
      }
    }
    setContextMenu(null);
  };

  const handleCloseAllTabs = () => {
    tabs.forEach((tab: EditorTab) => onCloseTab(tab.id));
    setContextMenu(null);
  };

  /* [ONR-UI-004] 통합 탭바 제어 연동: 왼쪽 사이드바 탭과 동일한 폰트, 형태, LDSG 그린 그라데이션 적용 */
  return (
    <>
      <div 
        style={{
          fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif",
        }}
        className="flex items-center w-full border-b border-[#E2E8F0] dark:border-white/[0.08] px-2 gap-1.5 overflow-x-auto select-none no-scrollbar h-10 bg-white/75 dark:bg-black/30 backdrop-blur-md text-on-surface"
      >
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar relative">
          {(() => {
            const seenTabIds = new Set<string>();
            const visibleTabs = tabs.filter((tab: EditorTab) => {
              if (seenTabIds.has(tab.id)) return false;
              seenTabIds.add(tab.id);
              return true;
            });
            return visibleTabs.map((tab: EditorTab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onClick={() => { if (!isActive) onSwitchTab(tab.id); }}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                onDoubleClick={(e) => { e.stopPropagation(); setRenamePrompt({ isOpen: true, tabId: tab.id, currentName: tab.name.replace(/\.md$/i, '') }); }}
                className={`group relative flex items-center gap-2 px-3 py-1 rounded-md text-[12px] font-bold cursor-pointer transition-colors outline-none focus:outline-none select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#1d4ed8] to-[#1e40af] text-white shadow-sm shadow-[#1d4ed8]/30'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                } ${draggedTabId === tab.id ? 'opacity-40 border-dashed border-[#1d4ed8]' : ''}`}
                style={{
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <span className="truncate max-w-[160px]">{tab.name}</span>
                
                {/* 💡 1. 저장 필요 상태(isModified)인 경우 황금색 도트 표시 */}
                {tab.isModified && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_4px_#FFD700] flex-shrink-0 animate-pulse" 
                    title="저장 필요" 
                  />
                )}
                
                {/* 💡 2. 닫기 단추: 저장 여부와 관계없이 항상 언제나 노출 */}
                <button
                  type="button"
                  onClick={(e) => onCloseTab(tab.id, e)}
                  className={`w-4 h-4 flex items-center justify-center rounded-full transition-colors p-0.5 outline-none focus:outline-none ${
                    isActive
                      ? 'hover:bg-black/20 text-white/90 hover:text-white'
                      : 'opacity-65 group-hover:opacity-100 hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
                  }`}
                  title="탭 닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          });
        })()}
          {/* ➕ 새 문서 추가 버튼 (브라우저 탭 표준) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (dispatchCommand) {
                dispatchCommand('NEW_FILE');
              }
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 ml-0.5 outline-none focus:outline-none"
            title="새 문서 열기 (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu?.visible && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className={`fixed z-50 w-48 rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200' 
              : 'bg-white border-zinc-200 text-zinc-800'
          }`}
        >
          <div className="py-1 flex flex-col">
            <button
              onClick={() => {
                const targetTab = tabs.find((t: EditorTab) => t.id === contextMenu.tabId);
                setContextMenu(null);
                if (targetTab) {
                  setRenamePrompt({
                    isOpen: true,
                    tabId: targetTab.id,
                    currentName: targetTab.name.replace(/\.md$/i, '')
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-left w-full hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors font-medium border-b border-black/5 dark:border-white/5"
            >
              <Pencil className="w-4 h-4 text-zinc-400" />
              이름 바꾸기
            </button>
            <button
              onClick={handleCloseOtherTabs}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-left w-full hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors`}
            >
              <ArrowLeftRight className="w-4 h-4 text-zinc-400" />
              다른 탭 닫기
            </button>
            <button
              onClick={handleCloseTabsToRight}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-left w-full hover:bg-[#1d4ed8]/10 hover:text-[#1d4ed8] transition-colors`}
            >
              <ArrowRightToLine className="w-4 h-4 text-zinc-400" />
              오른쪽 탭 닫기
            </button>
            <button
              onClick={handleCloseAllTabs}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-left w-full hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors`}
            >
              <XSquare className="w-4 h-4 text-red-500/70" />
              모두 닫기
            </button>
          </div>
        </div>
      )}

      {/* 🏷️ 탭 문서 이름 바꾸기 프롬프트 */}
      <PromptModal
        isOpen={renamePrompt.isOpen}
        title="문서 이름 변경"
        defaultValue={renamePrompt.currentName}
        error={renamePrompt.error}
        onConfirm={handleRenameConfirm}
        onCancel={() => setRenamePrompt({ isOpen: false, tabId: '', currentName: '' })}
      />
    </>
  );
}
