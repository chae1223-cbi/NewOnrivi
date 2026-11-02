import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, X, Layers, Trash2, ArrowUpDown } from 'lucide-react';
import { FileNode } from '@/lib/indexedDbHelper';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { useToast } from '@/components/ToastProvider';


interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNodes: FileNode[];
  workspaceType: string;
  rootFolder?: any;

  refreshParent: () => void;
  openFile: (node: FileNode | null) => void;
}

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0007] MergeModal ➔ MergeModal
// 🎯 @KICK  : 여러 파일을 선택 순서대로 병합하여 새 파일로 저장 (로컬/브라우저 모드 대응)
// 🛡️ @GUARD : isOpen/mounted false 시 null 반환; 최소 2개 파일 필요
// 🚨 @PATCH : **2026-09-17** — [문서 병합 후 2중 중복 새로고침 제거]: 병합 완료 시 불필요하게 300ms 후 재호출되던 setTimeout 지연 리프레시 5개소를 전면 제거하고 1회 즉시 갱신으로 일원화
// 🚨 @PATCH : **2026-07-06** — 타이틀 아이콘 깨짐 수정(? → Layers), 찾아보기 버튼 조건 electronAPI 유무로 변경, 브라우저 모드 저장 위치 지정(showSaveFilePicker / showDirectoryPicker) 추가
// 🔗 @CALLS : handleMerge, moveUp, moveDown, removeItem, showToast
// ====================================================================
const MergeModal: React.FC<MergeModalProps> = ({
  isOpen, onClose, selectedNodes, workspaceType, rootFolder, refreshParent, openFile
}) => {
  useModalEscape(isOpen, onClose);
  const { showToast } = useToast();
  

  const [nodes, setNodes] = useState<FileNode[]>([]);
  const prevSelectedRef = useRef<FileNode[]>([]);
  const [targetName, setTargetName] = useState('merged_doc');
  const [targetPathAbsolute, setTargetPathAbsolute] = useState('');
  // 브라우저 모드용 저장 대상 폴더 핸들 (선택 시 해당 폴더에 저장)
  const [targetFolderHandle, setTargetFolderHandle] = useState<any>(null);
  const [targetFolderName, setTargetFolderName] = useState('');
  const [deleteSources, setDeleteSources] = useState(false);
  const [separator, setSeparator] = useState<'none' | 'divider' | 'title'>('divider');
  const [generateToc, setGenerateToc] = useState(false);
  const [insertPageBreak, setInsertPageBreak] = useState(false);
  const [shiftHeadings, setShiftHeadings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasSaveFilePicker] = useState(
    typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function'
  );
  const [hasDirectoryPicker] = useState(
    typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function'
  );
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0006] MergeModal ➔ useEffect (mounted)
// 🎯 @KICK  : 클라이언트 마운트 완료 상태 설정으로 포탈 렌더링 hydration 방지
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setMounted
// ====================================================================
  useEffect(() => {
    setMounted(true);
  }, []);

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0005] MergeModal ➔ useEffect (isOpen)
// 🎯 @KICK  : 모달이 열릴 때 선택된 노드 목록을 복사하고 기본 병합 파일명 제안
// 🛡️ @GUARD : isOpen이 true일 때만 실행
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setNodes, setTargetName
// ====================================================================
  useEffect(() => {
    if (!isOpen) return;
    const prev = prevSelectedRef.current;
    const hasChanged = prev.length !== selectedNodes.length || selectedNodes.some((n, i) => n.path ? n.path !== (prev[i]?.path) : n.name !== (prev[i]?.name));
    if (!hasChanged) return;
    prevSelectedRef.current = [...selectedNodes];
    setNodes([...selectedNodes]);
    if (selectedNodes.length > 0 && nodes.length === 0) {
      const first = selectedNodes[0].name;
      const extIndex = first.lastIndexOf('.');
      const baseName = extIndex !== -1 ? first.substring(0, extIndex) : first;
      setTargetName(`${baseName}_merged.md`);
    }
  }, [isOpen, selectedNodes, nodes.length]);

  if (!isOpen) return null;
  if (!mounted) return null;

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0004] MergeModal ➔ moveUp
// 🎯 @KICK  : 병합 목록에서 파일을 한 칸 위로 이동
// 🛡️ @GUARD : 첫 번째 인덱스면 실행 차단
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setNodes
// ====================================================================
  const moveUp = (index: number) => {
    if (index === 0) return;
    const nextNodes = [...nodes];
    const temp = nextNodes[index - 1];
    nextNodes[index - 1] = nextNodes[index];
    nextNodes[index] = temp;
    setNodes(nextNodes);
  };

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0003] MergeModal ➔ moveDown
// 🎯 @KICK  : 병합 목록에서 파일을 한 칸 아래로 이동
// 🛡️ @GUARD : 마지막 인덱스면 실행 차단
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setNodes
// ====================================================================
  const moveDown = (index: number) => {
    if (index === nodes.length - 1) return;
    const nextNodes = [...nodes];
    const temp = nextNodes[index + 1];
    nextNodes[index + 1] = nextNodes[index];
    nextNodes[index] = temp;
    setNodes(nextNodes);
  };

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0002] MergeModal ➔ removeItem
// 🎯 @KICK  : 병합 목록에서 특정 파일을 제거
// 🛡️ @GUARD : 남은 파일이 2개 미만이면 경고 후 제거 차단
// 🚨 @PATCH : 없음
// 🔗 @CALLS : showToast
// ====================================================================
  const removeItem = (index: number) => {
    if (nodes.length <= 2) {
      showToast("병합하려면 최소 2개 이상의 파일을 선택해야 합니다.", 'warning');
      return;
    }
    const nextNodes = [...nodes];
    nextNodes.splice(index, 1);
    setNodes(nextNodes);
  };

// ====================================================================
// 📊 [OMD-FILE-MergeModal-0001] MergeModal ➔ handleMerge
// 🎯 @KICK  : 선택한 파일들을 병합하여 새 파일로 저장 (로컬/브라우저 모드 대응)
// 🛡️ @GUARD : targetName이 비어있으면 경고 후 early return
// 🚨 @PATCH : 없음
// 🔗 @CALLS : showToast, fetch, refreshParent, onClose, openFile
// ====================================================================
  const handleMerge = async () => {
    if (!targetName.trim()) {
      showToast('최종 파일명을 입력해주세요.', 'warning');
      return;
    }
    
    let finalName = targetName.toLowerCase().endsWith('.md') ? targetName : `${targetName}.md`;
    setLoading(true);

    try {
      const hasPaths = nodes.some(n => !!n.path);
      const hasHandles = nodes.some(n => !!n.handle);
      
      let activeMode = workspaceType;
      if (hasPaths && !hasHandles) {
        activeMode = 'local';
      } else if (hasHandles && !hasPaths) {
        activeMode = 'browser';
      }

      if (activeMode === 'local') {
        const sourcePaths = nodes.map(n => n.path);
        
        const firstPath = nodes[0].path || "";
        const lastSlash = firstPath.lastIndexOf('\\');
        const parentDir = lastSlash !== -1 ? firstPath.substring(0, lastSlash) : "";
        const targetPath = targetPathAbsolute || (parentDir ? `${parentDir}\\${finalName}` : finalName);
        if (targetPathAbsolute) {
          const absSlash = targetPathAbsolute.lastIndexOf('\\');
          finalName = absSlash !== -1 ? targetPathAbsolute.substring(absSlash + 1) : targetPathAbsolute;
        }

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          const result = await (window as any).electronAPI.mergeFiles({
            sourcePaths,
            targetPath,
            deleteSources,
            separator,
            generateToc,
            insertPageBreak,
            shiftHeadings
          });
          if (result.success) {
            showToast("문서 병합이 정상적으로 처리되었습니다.", 'success');
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            onClose();
          } else {
            showToast("글 병합 중 오류가 발생했습니다: " + result.error, 'error');
          }
        } else {
          const res = await fetch(getApiUrl('/api/merge-files'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourcePaths,
              targetPath,
              deleteSources,
              separator,
              generateToc,
              insertPageBreak,
              shiftHeadings
            })
          });

          if (res.ok) {
            const result = await res.json();
            showToast("문서 병합이 정상적으로 처리되었습니다.", 'success');
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            onClose();
          } else {
            const errData = await res.json();
            showToast("글 병합 중 오류가 발생했습니다: " + errData.error, 'error');
          }
        }
      } else if (activeMode === 'browser') {
        const contents = [];
        const tocLines = [];

        // 브라우저용 가상 경로 계산 헬퍼
        const resolveBrowserPath = (srcPath: string, linkPath: string) => {
          if (
            linkPath.startsWith('http://') || 
            linkPath.startsWith('https://') || 
            linkPath.startsWith('data:') || 
            linkPath.startsWith('/')
          ) {
            return linkPath;
          }
          
          const srcParts = srcPath.replace(/\\/g, '/').split('/').filter(Boolean);
          srcParts.pop();
          
          const linkParts = linkPath.replace(/\\/g, '/').split('/').filter(Boolean);
          const outParts = [...srcParts];
          for (const p of linkParts) {
            if (p === '.') continue;
            if (p === '..') {
              if (outParts.length > 0) outParts.pop();
            } else {
              outParts.push(p);
            }
          }
          return outParts.join('/');
        };

        for (const node of nodes) {
          if (!node.handle) throw new Error('File handle missing in browser mode');
          const file = await node.handle.getFile();
          let text = await file.text();
          
          // 1. 프론트매터 제거
          text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

          // 2. 상대 경로 보정
          const srcPath = node.path || node.name;
          text = text.replace(/(!?\[.*?\])\((.*?)\)/g, (match: string, prefix: string, linkPath: string) => {
            const newRelativePath = resolveBrowserPath(srcPath, linkPath);
            return `${prefix}(${newRelativePath})`;
          });

          const titleLabel = node.name.replace(/\.[^/.]+$/, "");
          
          if (generateToc) {
            const anchor = titleLabel.toLowerCase().replace(/\s+/g, '-');
            tocLines.push(`- [${titleLabel}](#${anchor})`);
          }

          let formattedContent = text;
          if (separator === 'title') {
            formattedContent = `## ${titleLabel}\n\n${text}`;
          }
          contents.push(formattedContent);
        }

        let joinSep = '\n\n';
        if (insertPageBreak) joinSep = '\n\n<hr class="page-break" />\n\n';
        else if (separator === 'divider') joinSep = '\n\n---\n\n';
        else if (separator === 'none') joinSep = '\n';
        else if (separator === 'title') joinSep = '\n\n';
        
        let mergedText = contents.join(joinSep);
        
        if (generateToc) {
          const tocSection = `# 목차\n\n${tocLines.join('\n')}\n\n${insertPageBreak ? '<hr class="page-break" />\n\n' : '---\n\n'}`;
          mergedText = tocSection + mergedText;
        }

        // ─── 저장 위치 결정 ─────────────────────────────────────────────────
        // [Case 1] 찾아보기에서 선택된 파일 핸들 또는 폴더 핸들이 있을 때
        if (targetFolderHandle) {
          // showSaveFilePicker로 선택한 경우: fileHandle로 직접 저장
          const isFileHandle = targetFolderHandle.kind === 'file';
          if (isFileHandle) {
            finalName = targetFolderHandle.name;
            const writable = await targetFolderHandle.createWritable();
            await writable.write(mergedText);
            await writable.close();
            if (deleteSources) {
              for (const node of nodes) {
                if (node.name !== finalName && node.handle && rootFolder?.handle) {
                  try { await rootFolder.handle.removeEntry(node.name); } catch(_) {}
                }
              }
            }
            showToast("문서 병합이 정상적으로 처리되었습니다.", 'success');
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            onClose();
          } else {
            // showDirectoryPicker로 선택한 폴더에 저장
            const newFileHandle = await targetFolderHandle.getFileHandle(finalName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(mergedText);
            await writable.close();
            if (deleteSources) {
              for (const node of nodes) {
                if (node.name !== finalName && node.handle && rootFolder?.handle) {
                  try { await rootFolder.handle.removeEntry(node.name); } catch(_) {}
                }
              }
            }
            showToast("문서 병합이 정상적으로 처리되었습니다.", 'success');
            refreshParent();
            window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
            onClose();
          }

        // [Case 2] 미지정 → rootFolder.handle 폴백
        } else {
          if (!rootFolder || !rootFolder.handle) {
            throw new Error('Root folder handle is not open. 저장 위치를 지정하거나 워크스페이스 폴더를 먼저 연결하세요.');
          }
          const newFileHandle = await rootFolder.handle.getFileHandle(finalName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(mergedText);
          await writable.close();
          if (deleteSources) {
            for (const node of nodes) {
              if (node.name !== finalName) {
                await rootFolder.handle.removeEntry(node.name);
              }
            }
          }
          showToast("문서 병합이 정상적으로 처리되었습니다.", 'success');
          refreshParent();
          window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
          onClose();
        }
      }
    } catch (e: any) {
      showToast("글 병합 중 오류가 발생했습니다: " + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300" style={{ overflowY: "auto" }}>
      <div className="w-full max-w-lg bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl shadow-2xl flex flex-col scale-[1.01] transition-transform duration-300" style={{ maxHeight: "90dvh" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#0d1117]/30 shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-blue-500 dark:text-blue-400" />
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{"글 통폐합 (병합)"}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5 custom-scrollbar">
          
          {/* Target File Name + 저장 위치 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
              {targetPathAbsolute ? "저장 경로" : "최종 병합 파일명"}
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={targetPathAbsolute || targetName}
                onChange={(e) => {
                  if (targetPathAbsolute) setTargetPathAbsolute(e.target.value);
                  else setTargetName(e.target.value);
                }}
                placeholder="merged.md"
                className="w-full px-4 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all font-medium"
              />
              {/* 환경 통합 찾아보기 버튼 */}
              {(isElectron || hasSaveFilePicker || hasDirectoryPicker) && (
                <button
                  onClick={async () => {
                    try {
                      if (isElectron) {
                        // Electron: OS 파일 저장 다이얼로그
                        const api = (window as any).electronAPI;
                        if (api?.showSaveDialog) {
                          const res = await api.showSaveDialog({
                            title: '병합 파일 저장',
                            defaultPath: targetPathAbsolute || targetName,
                            filters: [{ name: 'Markdown', extensions: ['md'] }]
                          });
                          if (!res.canceled && res.filePath) {
                            setTargetPathAbsolute(res.filePath);
                            setTargetFolderName('');
                          }
                        }
                      } else if (hasSaveFilePicker) {
                        // 웹 (Chrome/Edge): showSaveFilePicker
                        const fileHandle = await (window as any).showSaveFilePicker({
                          suggestedName: targetName,
                          excludeAcceptAllOption: true,
                          types: [{ description: 'Markdown Files', accept: { 'text/markdown': ['.md'] } }]
                        });
                        setTargetPathAbsolute(fileHandle.name);
                        setTargetFolderHandle(fileHandle);
                        setTargetFolderName(fileHandle.name);
                      } else if (hasDirectoryPicker) {
                        // 웹 (기타): showDirectoryPicker로 폴더 선택
                        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                        setTargetFolderHandle(dirHandle);
                        setTargetFolderName(dirHandle.name);
                        setTargetPathAbsolute('');
                      }
                    } catch (e: any) {
                      if (e.name !== 'AbortError') showToast('저장 위치 선택 실패', 'error');
                    }
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-gray-700 dark:text-gray-300 rounded-xl whitespace-nowrap transition-colors font-semibold"
                >
                  찾아보기...
                </button>
              )}
            </div>
            {/* 저장 위치 지정된 경우 표시 */}
            {(targetPathAbsolute || targetFolderName) && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400 px-1 flex items-center gap-1">
                <span>📁</span>
                <span className="truncate">{targetPathAbsolute || targetFolderName}</span>
                <button
                  onClick={() => { setTargetPathAbsolute(''); setTargetFolderHandle(null); setTargetFolderName(''); }}
                  className="ml-auto shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  title="저장 위치 초기화"
                >✕</button>
              </p>
            )}
          </div>

          {/* Separator Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">{"구분선 스타일"}</label>
            <select 
              value={separator}
              onChange={(e) => setSeparator(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 transition-all cursor-pointer font-medium"
            >
              <option value="none">{"구분선 없음"}</option>
              <option value="line">{"개행 (빈 줄 2개)"}</option>
              <option value="divider">{"수평선 (---)"}</option>
              <option value="title">{"H2 제목으로 파일명 삽입"}</option>
            </select>
          </div>

          {/* Source Files Reordering List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <ArrowUpDown size={12} />
                {"병합 순서"} ({nodes.length})
              </label>
            </div>
            
            <div className="border border-gray-100 dark:border-[#30363d] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#30363d] bg-gray-50/20 dark:bg-black/10">
              {nodes.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  사이드바에서 병합할 .md 파일을 선택하세요
                </div>
              ) : nodes.map((node, index) => (
                <div 
                  key={node.path || node.name} 
                  className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#161b22]/50 transition-colors"
                >
                  <span className="truncate font-medium flex-1 pr-4">{node.name}</span>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-md text-gray-500 hover:text-blue-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveDown(index)}
                      disabled={index === nodes.length - 1}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-md text-gray-500 hover:text-blue-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      onClick={() => removeItem(index)}
                      className="p-1 hover:bg-red-500/10 rounded-md text-gray-400 hover:text-red-500 transition-all ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

            {/* Delete Original */}
            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="deleteSources"
                checked={deleteSources}
                onChange={(e) => setDeleteSources(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="deleteSources" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                {"병합 완료 후 원본 파일 삭제"}
              </label>
            </div>

            {/* Generate TOC */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <input 
                type="checkbox" 
                id="generateToc"
                checked={generateToc}
                onChange={(e) => setGenerateToc(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="generateToc" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                {"자동 목차(TOC) 최상단에 생성"}
              </label>
            </div>

            {/* Shift Headings */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <input 
                type="checkbox" 
                id="shiftHeadings"
                checked={shiftHeadings}
                onChange={(e) => setShiftHeadings(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="shiftHeadings" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                {"병합되는 문서들의 헤딩 레벨 1단계 낮추기 (H1 → H2)"}
              </label>
            </div>

            {/* Insert Page Break */}
            <div className="flex items-center gap-2 px-1 mt-2">
              <input 
                type="checkbox" 
                id="insertPageBreak"
                checked={insertPageBreak}
                onChange={(e) => setInsertPageBreak(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="insertPageBreak" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                {"파일 단위로 페이지 나누기 적용 (출판용)"}
              </label>
            </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-[#30363d] bg-gray-50/50 dark:bg-[#0d1117]/30 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-xl transition-all active:scale-[0.98]"
          >
            {"취소"}
          </button>
          <button 
            onClick={handleMerge}
            disabled={loading || nodes.length < 2}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            {loading ? "로딩 중..." : "확인"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default MergeModal;
