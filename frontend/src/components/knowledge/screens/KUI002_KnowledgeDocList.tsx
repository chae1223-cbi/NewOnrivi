// ====================================================================
// 📊 [OMD-KUI-DocList-0001] KUI002_KnowledgeDocList.tsx ➔ KUI-002 Knowledge Document List
// 🎯 @KICK  : 등록된 지식 문서 관리 테이블 (체크박스 일괄 작업: 재분석, 지식해제, 컬렉션변경, 우선순위변경, 삭제, 파일열기)
// 🛡️ @GUARD : LINE Design System LDSG v5.0 (#1d4ed8), 페이지네이션, 고성능 가상 필터링
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [Rule 8 고대비 시인성] 지식 문서 목록 파일 경로(doc.filePath)를 흐릿한 text-zinc-400에서 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 전면 보강하여 시인성 확보
//             **2026-09-04** — 지식문서 목록 항목 아이콘을 남성 학사(📗)로 교체
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-002 등록 지식 문서 일괄 작업 관리자 화면 신규 구현
// ====================================================================

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ArrowUpDown, Trash2, RefreshCw, 
  ExternalLink, Eye, Star, Folder, Tag, CheckSquare, Square,
  Layers, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import type { KnowledgeDocument, KnowledgeCollection } from '@/types/knowledge';

interface KUI002KnowledgeDocListProps {
  documents: KnowledgeDocument[];
  collections: KnowledgeCollection[];
  onSelectDocDetail: (doc: KnowledgeDocument) => void;
  onOpenFileInEditor: (filePath: string) => void;
  onDeleteDocs: (docIds: string[]) => Promise<void>;
  onReindexDocs: (docIds: string[]) => Promise<void>;
  onUnregisterDocs: (docIds: string[]) => Promise<void>;
  onChangePriority: (docIds: string[], priority: number) => Promise<void>;
  onChangeCollection: (docIds: string[], collectionId: string | null) => Promise<void>;
  onOpenWizard: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI002_KnowledgeDocList: React.FC<KUI002KnowledgeDocListProps> = ({
  documents,
  collections,
  onSelectDocDetail,
  onOpenFileInEditor,
  onDeleteDocs,
  onReindexDocs,
  onUnregisterDocs,
  onChangePriority,
  onChangeCollection,
  onOpenWizard,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'chunks' | 'priority'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 필터링 & 정렬
  const filteredDocs = useMemo(() => {
    let list = documents.filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                          doc.filePath.toLowerCase().includes(search.toLowerCase()) ||
                          (doc.summary && doc.summary.toLowerCase().includes(search.toLowerCase()));
      const matchCollection = collectionFilter === 'ALL' || doc.collectionId === collectionFilter;
      const matchStatus = statusFilter === 'ALL' || doc.status === statusFilter;
      return matchSearch && matchCollection && matchStatus;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') return (b.modifiedAt || '').localeCompare(a.modifiedAt || '');
      if (sortBy === 'oldest') return (a.modifiedAt || '').localeCompare(b.modifiedAt || '');
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'priority') return (b.priority || 3) - (a.priority || 3);
      return 0;
    });

    return list;
  }, [documents, search, collectionFilter, statusFilter, sortBy]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  // 선택 제어
  const isAllSelected = paginatedDocs.length > 0 && paginatedDocs.every(d => selectedIds.includes(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedDocs.some(d => d.id === id)));
    } else {
      const toAdd = paginatedDocs.map(d => d.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...toAdd]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* 🔍 검색 & 필터 바 (KUI-002 상단) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="지식 문서명, 경로, 내용 검색..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#1d4ed8]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="ALL">Collection (전체)</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="ALL">상태 (전체)</option>
            <option value="READY">● READY</option>
            <option value="INDEXING">◐ 분석중</option>
            <option value="OUTDATED">⚠ OUTDATED</option>
            <option value="ERROR">✖ ERROR</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
          >
            <option value="newest">최근 분석순</option>
            <option value="oldest">오래된순</option>
            <option value="title">제목순</option>
            <option value="priority">우선순위순</option>
          </select>

          <button
            onClick={onOpenWizard}
            className="px-3 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] rounded-lg shadow-xs transition"
          >
            + 지식 등록
          </button>
        </div>
      </div>

      {/* ⚡ 선택된 문서 대상 일괄 작업 툴바 */}
      {selectedIds.length > 0 && (
        <div className="p-2.5 rounded-xl border border-[#1d4ed8]/30 bg-[#1d4ed8]/10 flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <CheckSquare className="w-4 h-4 text-[#1d4ed8]" />
            <span>선택된 문서 {selectedIds.length}개</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onReindexDocs(selectedIds)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:text-[#1d4ed8] transition flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>재분석</span>
            </button>

            <button
              onClick={() => onUnregisterDocs(selectedIds)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:text-amber-500 transition flex items-center gap-1 font-semibold"
            >
              <span>지식 해제</span>
            </button>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  onChangePriority(selectedIds, Number(e.target.value));
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="py-1 px-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold"
            >
              <option value="" disabled>우선순위 변경...</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>

            <button
              onClick={() => onDeleteDocs(selectedIds)}
              className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 transition flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3 h-3" />
              <span>완전 삭제</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 📋 대량 문서 테이블 (KUI-002 규격) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 text-[11px] font-bold text-zinc-500 uppercase">
                <th className="py-2 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
                  />
                </th>
                <th className="py-2 px-4">문서 제목 / 경로</th>
                <th className="py-2 px-3">유형</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3">우선순위</th>
                <th className="py-2 px-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    등록된 지식 문서가 없거나 검색 조건과 일치하지 않습니다.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const isChecked = selectedIds.includes(doc.id);

                  return (
                    <tr 
                      key={doc.id}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition ${
                        isChecked ? 'bg-[#1d4ed8]/5 dark:bg-[#1d4ed8]/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(doc.id)}
                          className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
                        />
                      </td>

                      <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2 truncate max-w-sm">
                          <button
                            onClick={() => onSelectDocDetail(doc)}
                            className="text-left hover:text-[#1d4ed8] transition truncate flex items-center gap-1.5 cursor-pointer font-extrabold text-zinc-950 dark:text-white"
                          >
                            <span className="text-[#1d4ed8] shrink-0">📗</span>
                            <span className="truncate">{doc.title}</span>
                          </button>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate block max-w-sm mt-0.5">
                          📁 {doc.filePath}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold uppercase">
                          {doc.documentType || 'other'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                            doc.status === 'READY'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : doc.status === 'ERROR'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                              : doc.status === 'OUTDATED'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          }`}
                        >
                          ● {doc.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: doc.priority || 3 }).map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectDocDetail(doc)}
                            className="p-1 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            title="상세 정보 및 청크 내역 보기"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenFileInEditor(doc.filePath)}
                            className="p-1 text-zinc-400 hover:text-[#1d4ed8] transition"
                            title="에디터에서 열기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteDocs([doc.id])}
                            className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 페이지네이션 */}
        {filteredDocs.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-500">
            <span>총 {filteredDocs.length}개 문서 중 {Math.min((currentPage - 1) * pageSize + 1, filteredDocs.length)} - {Math.min(currentPage * pageSize, filteredDocs.length)}</span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
