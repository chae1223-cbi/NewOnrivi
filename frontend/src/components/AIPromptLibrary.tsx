/**
 * 프로그램명 : OnriviAuthor 
 * 파일명 : AIPromptLibrary.tsx
 * -----------------------------------------------------------------------
 * 변경내역
 * -----------------------------------------------------------------------
 * 작성자 : 채병익
 * 🚨 @PATCH : **2026-09-12** — ESLint react/no-unescaped-entities 따옴표 이스케이프 수정, '에디터로 이동'을 'AI프롬프트 이동'으로 변경, '내 프리셋' 등 명칭을 '내 라이브러리'로 통일, Modern Technical Editorial 디자인 시스템 적용
 * -----------------------------------------------------------------------
 */
import React, { useState, useMemo } from 'react';
import { X, Search, Folder, Star, Sparkles, Edit2, Trash2, BookOpen, PenTool } from 'lucide-react';
import { PromptTemplate } from '@/lib/promptTemplates';

export interface AIPreset {
  id: string;
  name: string;
  // Legacy fields for backwards compatibility during migration
  mode?: 'draft' | 'editorial';
  domainId?: string;
  docType?: string;
  systemPrompt?: string;
  userPrompt?: string;
  
  // Unified fields
  editorialCommand: string;
  targetScope?: 'selection' | 'document' | 'none';
  folder?: string;
}

interface AIPromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Record<string, Record<string, PromptTemplate>>;
  presets: AIPreset[];
  onSelectTemplate: (domain: string, docType: string, template: PromptTemplate) => void;
  onSelectPreset: (preset: AIPreset) => void;
  onDeletePreset: (id: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
}

export default function AIPromptLibrary({
  isOpen,
  onClose,
  templates,
  presets,
  onSelectTemplate,
  onSelectPreset,
  onDeletePreset,
  onRenamePreset
}: AIPromptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('presets_all');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');

  // Extract all domains
  const domainFolders = useMemo(() => Object.keys(templates), [templates]);

  // Extract all preset folders
  const presetFolders = useMemo(() => {
    const folders = new Set<string>();
    presets.forEach(p => {
      if (p.folder) folders.add(p.folder);
    });
    return Array.from(folders).sort();
  }, [presets]);

  // Handle setting active tab if it gets lost
  if (!activeTab.startsWith('presets_') && !domainFolders.includes(activeTab) && domainFolders.length > 0) {
    setActiveTab(domainFolders[0]);
  }

  // Filtered items based on search query
  const filteredPresets = useMemo(() => {
    if (!activeTab.startsWith('presets_')) return [];
    return presets.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      if (activeTab === 'presets_all') return true;
      if (activeTab === 'presets_default') return !p.folder;
      if (activeTab.startsWith('presets_folder_')) {
        const targetFolder = activeTab.replace('presets_folder_', '');
        return p.folder === targetFolder;
      }
      return false;
    });
  }, [presets, searchQuery, activeTab]);

  const filteredTemplates = useMemo(() => {
    if (activeTab.startsWith('presets_')) return [];
    const domainTemplates = templates[activeTab] || {};
    return Object.entries(domainTemplates).filter(([docType, tpl]) => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return docType.toLowerCase().includes(lowerQuery) || tpl.systemPrompt.toLowerCase().includes(lowerQuery);
    });
  }, [activeTab, templates, searchQuery]);

  const handleStartRename = (e: React.MouseEvent, p: AIPreset) => {
    e.stopPropagation();
    setEditingPresetId(p.id);
    setEditingPresetName(p.name);
  };

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (editingPresetName.trim()) {
      onRenamePreset(id, editingPresetName.trim());
    }
    setEditingPresetId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.15)] select-none">
      {/* Header */}
      <div className="px-6 py-3.5 flex items-center justify-between border-b border-[#e2e8f0] dark:border-slate-800 shrink-0 bg-white dark:bg-zinc-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 flex items-center justify-center text-[#1d4ed8] dark:text-blue-400 border border-[#1d4ed8]/20 shadow-2xs">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">AI 프롬프트 라이브러리</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">템플릿과 내 라이브러리를 한 곳에서 찾아 에디터에 즉시 적용하세요.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 rounded-lg transition-colors text-[12px] font-bold shadow-2xs"
          title="라이브러리를 닫고 AI 프롬프트로 이동합니다"
        >
          <span>AI프롬프트 이동</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Folders) - Modern Technical Editorial .bg-sidebar-luxury & Round Highlight */}
        <div className="w-[270px] bg-sidebar-luxury border-r border-[#e2e8f0] dark:border-slate-800 p-3.5 flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
          
          {/* My Presets Section */}
          <div className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 mb-2 tracking-wider px-2 uppercase">
            내 라이브러리
          </div>
          <div className="flex flex-col gap-1 mb-6">
            <button
              onClick={() => { setActiveTab('presets_all'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
                activeTab === 'presets_all'
                  ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 font-semibold'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${activeTab === 'presets_all' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-500'}`} />
              <span>전체보기</span>
              <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-md ${
                activeTab === 'presets_all'
                  ? 'bg-[#1d4ed8]/15 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium'
              }`}>
                {presets.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('presets_default'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
                activeTab === 'presets_default'
                  ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 font-semibold'
              }`}
            >
              <Folder className={`w-3.5 h-3.5 ${activeTab === 'presets_default' ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>기본</span>
              <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-md ${
                activeTab === 'presets_default'
                  ? 'bg-[#1d4ed8]/15 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium'
              }`}>
                {presets.filter(p => !p.folder).length}
              </span>
            </button>
            {presetFolders.map(folder => {
              const count = presets.filter(p => p.folder === folder).length;
              const isActive = activeTab === `presets_folder_${folder}`;
              return (
                <button
                  key={`folder_${folder}`}
                  onClick={() => { setActiveTab(`presets_folder_${folder}`); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
                    isActive
                      ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 font-semibold'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate">{folder}</span>
                  <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#1d4ed8]/15 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 mb-2 tracking-wider px-2 uppercase">
            시스템 템플릿
          </div>
          <div className="flex flex-col gap-1">
            {domainFolders.map(domain => {
              const isActive = activeTab === domain;
              return (
                <button
                  key={domain}
                  onClick={() => { setActiveTab(domain); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all ${
                    isActive
                      ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-extrabold shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 font-semibold'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate">{domain}</span>
                  <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#1d4ed8]/15 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium'
                  }`}>
                    {Object.keys(templates[domain] || {}).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden relative">
          
          {/* Search Bar */}
          <div className="p-3.5 border-b border-[#e2e8f0] dark:border-slate-800 shrink-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder={activeTab.startsWith('presets_') ? "내 라이브러리 검색..." : `${activeTab} 템플릿 검색...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-[13px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all"
              />
            </div>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/60 dark:bg-zinc-950/40 custom-scrollbar">
            {activeTab.startsWith('presets_') ? (
              // Presets View
              filteredPresets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-16">
                  <Star className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">저장된 라이브러리가 없습니다.</p>
                  <p className="text-[12px] text-zinc-500 mt-1">{"자주 쓰는 설정을 '라이브러리 저장'으로 보관해두면 편리합니다."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 auto-rows-max">
                  {filteredPresets.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onSelectPreset(p)}
                      className="group bg-white dark:bg-zinc-900 border border-zinc-200/85 dark:border-zinc-800 rounded-xl p-4 shadow-2xs hover:shadow-md hover:border-[#1d4ed8]/50 dark:hover:border-blue-500/50 cursor-pointer transition-all flex flex-col relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-zinc-800/95 rounded-lg backdrop-blur-xs border border-zinc-200/70 dark:border-zinc-700 shadow-xs z-10">
                        <button onClick={(e) => handleStartRename(e, p)} className="p-1 text-zinc-500 hover:text-[#1d4ed8] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors" title="이름 바꾸기">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeletePreset(p.id); }} className="p-1 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="삭제">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2 pr-12">
                        <Star className="w-4 h-4 text-amber-500 shrink-0" />
                        {editingPresetId === p.id ? (
                          <div className="flex-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingPresetName}
                              onChange={e => setEditingPresetName(e.target.value)}
                              onKeyDown={e => { if(e.key==='Enter') handleSaveRename(e, p.id); if(e.key==='Escape') setEditingPresetId(null); }}
                              autoFocus
                              className="w-full bg-slate-50 dark:bg-zinc-950 border border-[#1d4ed8] rounded px-2 py-0.5 text-[13px] font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <h4 className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors">
                            {p.name}
                          </h4>
                        )}
                      </div>
                      
                      <p className="text-[12px] text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed mt-1 flex-1 whitespace-pre-wrap font-sans">
                        {p.editorialCommand || p.systemPrompt || "프롬프트 내용이 없습니다."}
                      </p>
                      
                      <div className="mt-3.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[11px] font-medium">
                        <span className="text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium text-[11px]">
                          <Folder className="w-3 h-3 text-[#1d4ed8] dark:text-blue-400 opacity-80" />
                          {p.folder || '기본'}
                        </span>
                        <span className="text-[#1d4ed8] dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          적용하기 →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Templates View
              filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-16">
                  <Search className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 auto-rows-max">
                  {filteredTemplates.map(([docType, template]) => (
                    <div
                      key={docType}
                      onClick={() => onSelectTemplate(activeTab, docType, template)}
                      className="group bg-white dark:bg-zinc-900 border border-zinc-200/85 dark:border-zinc-800 rounded-xl p-4 shadow-2xs hover:shadow-md hover:border-[#1d4ed8]/50 dark:hover:border-blue-500/50 cursor-pointer transition-all flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
                        </div>
                        <h4 className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors">
                          {docType}
                        </h4>
                      </div>
                      
                      <p className="text-[12px] text-zinc-600 dark:text-zinc-300 line-clamp-4 leading-relaxed mt-1 flex-1 font-sans">
                        {template.systemPrompt}
                      </p>
                      
                      <div className="mt-3.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[11px] font-medium">
                        <span className="text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {activeTab}
                        </span>
                        <span className="text-[#1d4ed8] dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          작성 시작 →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
