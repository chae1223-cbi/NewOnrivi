import { useModalEscape } from '@/hooks/useModalEscape';
import {parseBibliography} from '@/lib/bibliography';
import {loadBibliographyFiles} from '@/lib/bibliographyStorage';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, FileText } from 'lucide-react';

interface CitationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  bibContent?: string;
  onSelect: (citekey: string, mode?: 'cite' | 'bibliography', entry?: any) => void;
  resourceFolderHandle?: any;
  workspaceType?: string;
  rootFolder?: any;
  resourceFolder?: string | null;
}

interface BibEntry {
  key: string;
  type: string;
  title: string;
  author: string;
  year: string;
}

import { loadSecureData } from '@/lib/secureStorage';

export default function CitationSelectionModal({
  isOpen,
  onClose,
  isDarkMode,
  bibContent,
  onSelect,
  resourceFolderHandle,
  workspaceType,
  rootFolder,
  resourceFolder
}: CitationSelectionModalProps) {
  useModalEscape(isOpen, onClose);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localBibContent, setLocalBibContent] = useState('');
  const [loadError,setLoadError]=useState('');

  const loadBibFiles=useCallback(async()=>{
    setLoadError('');
    try{const files=await loadBibliographyFiles(resourceFolderHandle);setLocalBibContent(files.length?files.map(f=>f.content).join('\n'):bibContent||'');}
    catch(e:any){setLocalBibContent('');setLoadError(e.message);}
  },[resourceFolderHandle,bibContent]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadBibFiles();
    }
  }, [isOpen, loadBibFiles]);

  const parsed=useMemo(()=>parseBibliography(localBibContent),[localBibContent]);
  const entries=parsed.entries;

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const lower = searchTerm.toLowerCase();
    return entries.filter(e => 
      e.key.toLowerCase().includes(lower) || 
      e.title.toLowerCase().includes(lower) || 
      e.author.toLowerCase().includes(lower)
    );
  }, [entries, searchTerm]);

  // 키보드 네비게이션용
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${isDarkMode ? 'dark' : ''}`}>
      <div 
        className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#EFEFEF] dark:border-white/10 animate-in fade-in zoom-in duration-200"
        style={{ fontFamily: "Pretendard, sans-serif" }}
      >
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEFEF] dark:border-white/10 bg-[#F7F8F9] dark:bg-[#161616]">
          <div className="flex items-center gap-2 text-on-surface font-bold">
            <FileText size={18} className="text-[#1d4ed8]" />
            참조자 선택 (Citation)
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 flex flex-col min-h-0">
          {/* 검색 바 */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="참조문헌 검색 (키워드, 저자, 제목)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8F9] dark:bg-zinc-800/50 border border-[#EFEFEF] dark:border-zinc-700 rounded-xl text-sm text-[#1F1F1F] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/30 focus:border-[#1d4ed8] transition-all"
              autoFocus
            />
          </div>

          {/* 목록 */}
          {(loadError || parsed.error || parsed.duplicates.length>0) && <p role="alert" className="p-3 text-red-700">{loadError || parsed.error || '중복 인용키: '+parsed.duplicates.join(', ')}</p>}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
            {filteredEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-10">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="font-bold">{loadError || parsed.error || '표시할 참조문헌이 없습니다.'}</p>
                <p className="text-xs text-[#949494] mt-1">.bib 파일을 추가하거나 검색어를 변경해보세요.</p>
              </div>
            ) : (
              filteredEntries.map((entry, index) => (
                <div
                  key={entry.key + ':' + index}
                  className="group flex flex-col p-3.5 rounded-xl border border-[#EFEFEF] dark:border-zinc-800 hover:border-[#1d4ed8] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#1d4ed8] transition-colors">
                        {entry.title || '(제목 없음)'}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                        {entry.author || '저자 미상'} {entry.year ? `(${entry.year})` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (parsed.duplicates.some(k => k.toLowerCase() === entry.key.toLowerCase())) {
                            setLoadError('중복 인용키입니다. 참조문헌 관리에서 키를 변경해 주세요.');
                            return;
                          }
                          onSelect(entry.key, 'bibliography', entry);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                        title="본문 태그 없이 문서 맨 뒤 참고문헌 목록에 직접 추가"
                      >
                        참고문헌에 추가
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (parsed.duplicates.some(k => k.toLowerCase() === entry.key.toLowerCase())) {
                            setLoadError('중복 인용키입니다. 참조문헌 관리에서 키를 변경해 주세요.');
                            return;
                          }
                          onSelect(entry.key, 'cite', entry);
                          onClose();
                        }}
                        className="px-2 py-1 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                        title="본문 커서 위치에 [@키] 인용 태그 삽입"
                      >
                        본문 인용(@)
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
