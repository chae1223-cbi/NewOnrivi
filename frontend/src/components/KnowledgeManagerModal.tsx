// ====================================================================
// 📊 [OMD-MODAL-KnowledgeManager-0001] KnowledgeManagerModal.tsx ➔ 지식 보관함 관리자 모달
// 🎯 @KICK  : 대량 문서 스케일에 최적화된 리스트/카드 뷰 토글, 페이지네이션, 정렬/필터 및 일괄 가져오기 제공
// 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import 전체 제거, Icon 컴포넌트로 교체
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             **2026-09-05** — 외부 DB 원복(Restore) 및 완전 초기화 시 knowledge:updated-from-hub, knowledge:refresh 이벤트를 수신하여 보관함 문서 목록(docs)을 즉시 자동 재동기화하도록 개선
//             **2026-09-04** — 지식문서 항목 및 인스펙터 헤더 아이콘을 남성 학사(📗)로 전면 교체
//             **2026-09-04** — [오류 항목 원터치 일괄 삭제] errorCount 기반 '오류건 모두 삭제' 툴바 버튼 추가
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003.1] 대량 문서 지원용 컴팩트 테이블 뷰, 페이지네이션(10/20/50), 정렬/필터 고도화
// 🔗 @CALLS : /api/knowledge/list, /api/knowledge/delete, /api/knowledge/index, KnowledgeQueue
// ====================================================================

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@/components/icons/Icon';
import { KnowledgeQueue, QueueProgress } from '@/lib/knowledge/knowledgeQueue';

interface KnowledgeDocItem {
  id: string;
  file_path: string;
  title: string;
  file_size: number;
  modified_at: string;
  summary: string | null;
  status: string;
  chunk_count: number;
  tags: { tag_name: string; score: number }[];
}

interface KnowledgeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  resourceFolder?: string;
  geminiApiKey?: string;
  planCode?: string;
  aiModelName?: string;
  fileTreeNodes?: any[];
}

export const KnowledgeManagerModal: React.FC<KnowledgeManagerModalProps> = ({
  isOpen,
  onClose,
  showToast,
  resourceFolder = '',
  geminiApiKey = '',
  planCode = 'ELITEPRO',
  aiModelName = 'gemini-3.8-flash',
  fileTreeNodes = [],
}) => {
  useModalEscape(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<'docs' | 'import'>('docs');
  const [docs, setDocs] = useState<KnowledgeDocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // 대량 문서 관리 상태
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list'); // 기본: 대량 보기에 편한 컴팩트 리스트
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'ERROR' | 'INDEXING'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'chunks'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // 10, 20, 50

  // 개별 문서 상세 보기 상태
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<KnowledgeDocItem | null>(null);

  // 대량 등록 상태
  const [importFiles, setImportFiles] = useState<{ path: string; name: string; content?: string; selected: boolean }[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<QueueProgress | null>(null);

  // 오류 문서 개수 계산
  const errorCount = useMemo(() => docs.filter(d => d.status === 'ERROR').length, [docs]);

  const handleOpenInEditor = (filePath: string) => {
    window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
      detail: { filePath, startLine: 1 }
    }));
    showToast(`'${filePath}' 문서를 에디터에서 열었습니다.`, 'info');
    onClose();
  };

  // 개별 문서 상세 보기 (전체 청크/태그 상세 분석 모달 트리거)
  const handleShowDocDetail = async (d: KnowledgeDocItem) => {
    try {
      const res = await fetch(`/api/knowledge/detail?docId=${encodeURIComponent(d.id)}&resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok && data.detail) {
        window.dispatchEvent(new CustomEvent('knowledge:show-detail', { detail: data.detail }));
        return;
      }
    } catch (err) {
      console.error('지식 문서 상세 정보 로드 실패:', err);
    }
    // 폴백으로 기존 간이 인스펙터 표시
    setSelectedDocForDetail(d);
  };

  // 등록 문서 목록 새로고침
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder, geminiApiKey, planCode: 'ELITEPRO' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const fetchedDocs: KnowledgeDocItem[] = data.documents || [];
        setDocs(fetchedDocs);
        // 탐색기 우클릭 등록 뱃지와 실제 DB 동기화
        const pathList = fetchedDocs.map(d => d.file_path);
        localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(pathList));
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
      } else {
        showToast(data.message || '지식 목록을 불러오지 못했습니다.', 'warning');
      }
    } catch {
      showToast('지식 목록 조회 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [resourceFolder, geminiApiKey, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
    const handleRefresh = () => {
      if (isOpen) fetchDocs();
    };
    window.addEventListener('knowledge:updated-from-hub', handleRefresh);
    window.addEventListener('knowledge:refresh', handleRefresh);
    return () => {
      window.removeEventListener('knowledge:updated-from-hub', handleRefresh);
      window.removeEventListener('knowledge:refresh', handleRefresh);
    };
  }, [isOpen, fetchDocs]);

  // 문서 삭제
  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`'${title}' 문서를 지식 베이스에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/knowledge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id, resourceFolder, geminiApiKey, planCode: 'ELITEPRO' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`'${title}' 문서가 삭제되었습니다.`, 'success');
        fetchDocs();
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
      } else {
        showToast(data.message || '삭제에 실패했습니다.', 'error');
      }
    } catch {
      showToast('삭제 요청 중 오류가 발생했습니다.', 'error');
    }
  };

  // 오류 문서 일괄 삭제
  const handleDeleteAllErrors = async () => {
    if (errorCount === 0) return;
    if (!confirm(`오류(ERROR) 상태인 문서 ${errorCount}건을 모두 보관함에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/knowledge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAllErrors: true, resourceFolder, geminiApiKey, planCode: 'ELITEPRO' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`오류 상태 문서 ${data.deletedCount ?? errorCount}건이 모두 삭제되었습니다.`, 'success');
        fetchDocs();
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
      } else {
        showToast(data.message || '오류 문서 삭제에 실패했습니다.', 'error');
      }
    } catch {
      showToast('삭제 요청 중 오류가 발생했습니다.', 'error');
    }
  };

  // 필터링 & 정렬 연산
  const filteredAndSortedDocs = useMemo(() => {
    let result = docs.filter(d => {
      const matchesSearch = 
        d.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (d.summary && d.summary.toLowerCase().includes(searchFilter.toLowerCase())) ||
        d.tags.some(t => t.tag_name.toLowerCase().includes(searchFilter.toLowerCase())) ||
        d.file_path.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.modified_at || '').localeCompare(a.modified_at || '');
      if (sortBy === 'oldest') return (a.modified_at || '').localeCompare(b.modified_at || '');
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'chunks') return (b.chunk_count || 0) - (a.chunk_count || 0);
      return 0;
    });

    return result;
  }, [docs, searchFilter, statusFilter, sortBy]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredAndSortedDocs.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDocs.slice(start, start + pageSize);
  }, [filteredAndSortedDocs, currentPage, pageSize]);

  // 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, statusFilter, sortBy, pageSize]);

  // 대량 가져오기 트리 탐색
  useEffect(() => {
    if (activeTab === 'import' && fileTreeNodes.length > 0) {
      const mdFiles: { path: string; name: string; selected: boolean }[] = [];
      const traverse = (nodes: any[]) => {
        for (const n of nodes) {
          if (n.kind === 'file' && /\.md$/i.test(n.name)) {
            mdFiles.push({ path: n.path || n.name, name: n.name, selected: true });
          }
          if (n.children && n.children.length > 0) {
            traverse(n.children);
          }
        }
      };
      traverse(fileTreeNodes);
      setImportFiles(mdFiles);
    }
  }, [activeTab, fileTreeNodes]);

  // 대량 일괄 등록
  const handleStartBatchImport = async () => {
    const selected = importFiles.filter(f => f.selected);
    if (selected.length === 0) {
      showToast('선택된 마크다운 파일이 없습니다.', 'warning');
      return;
    }

    setIsImporting(true);
    setProgress({ total: selected.length, completed: 0, failed: 0, percent: 0 });

    const queue = new KnowledgeQueue({
      concurrency: 2,
      resourceFolder,
      geminiApiKey,
      planCode: 'ELITEPRO',
      aiModelName,
      onProgress: (p) => setProgress(p),
    });

    const items = selected.map(f => ({
      filePath: f.path,
      fileContent: f.content || `# ${f.name}\n\n내용 자동 동기화`,
      title: f.name.replace(/\.md$/i, ''),
      fileHash: `hash_${f.path}`,
    }));

    queue.enqueue(items);
    await queue.start();

    setIsImporting(false);
    showToast(`대량 등록이 완료되었습니다! (총 ${selected.length}건)`, 'success');
    fetchDocs();
    window.dispatchEvent(new CustomEvent('knowledge:updated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1A1C20] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 flex items-center justify-center text-[#1d4ed8]">
              <Icon name="KnowledgeHub" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                지식 베이스 보관함 관리자
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] font-semibold">
                  총 {docs.length}개 보관 중
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                수백~수천 개의 대량 문서도 컴팩트 리스트와 페이지네이션으로 빠르게 탐색하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <Icon name="Close" className="w-5 h-5" />
          </button>
        </div>

        {/* 📊 4대 지식 메트릭 요약 바 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[#1d4ed8] flex items-center justify-center font-bold">
              <Icon name="Document" className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 font-medium block">총 보관 문서</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{docs.length}개</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Icon name="KnowledgeHub" className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 font-medium block">총 색인 청크</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
                {docs.reduce((sum, d) => sum + (d.chunk_count || 0), 0)}개
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
              <Icon name="Tag" className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 font-medium block">추출된 지식 태그</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
                {new Set(docs.flatMap(d => d.tags.map(t => t.tag_name))).size}개
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Icon name="Refresh" className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-zinc-400 font-medium block">최근 동기화 상태</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100 truncate block">
                {docs.some(d => d.status === 'INDEXING') ? '색인 동기화 중...' : docs.length > 0 ? '최신 상태 (정상)' : '등록 대기'}
              </span>
            </div>
          </div>
        </div>

        {/* 탭 & 툴바 */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('docs')}
              className={`py-2 px-3.5 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                activeTab === 'docs'
                  ? 'bg-[#1d4ed8] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon name="Document" className="w-3.5 h-3.5" />
              보관된 문서 ({docs.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-2 px-3.5 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                activeTab === 'import'
                  ? 'bg-[#1d4ed8] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon name="UploadCloud" className="w-3.5 h-3.5" />
              대량 일괄 가져오기
            </button>

            {/* 🗑️ 오류 문서 원터치 일괄 삭제 버튼 */}
            {errorCount > 0 && (
              <button
                onClick={handleDeleteAllErrors}
                className="py-1.5 px-3 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 ml-1"
                title="오류(ERROR) 상태 문서 일괄 삭제"
              >
                <Icon name="Delete" className="w-3.5 h-3.5 text-rose-500" />
                <span>오류건 모두 삭제 ({errorCount})</span>
              </button>
            )}
          </div>

          {activeTab === 'docs' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* 보기 모드 전환 (리스트 vs 카드) */}
              <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs' : 'text-zinc-500'
                  }`}
                  title="컴팩트 테이블 보기 (대량 문서에 최적)"
                >
                  <Icon name="BulletList" className="w-3.5 h-3.5" />
                  <span>목록형</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    viewMode === 'card' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs' : 'text-zinc-500'
                  }`}
                  title="카드 그리드 보기"
                >
                  <Icon name="GridView" className="w-3.5 h-3.5" />
                  <span>카드형</span>
                </button>
              </div>

              {/* 검색창 */}
              <div className="relative">
                <Icon name="Search" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="제목, 요약, 태그, 경로 검색..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-[#1d4ed8] w-48"
                />
              </div>

              {/* 상태 필터 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium"
              >
                <option value="ALL">전체 상태</option>
                <option value="READY">정상 (READY)</option>
                <option value="INDEXING">색인 중</option>
                <option value="ERROR">
                  {errorCount > 0 ? `오류 (ERROR) - ${errorCount}건` : '오류 (ERROR)'}
                </option>
              </select>

              {/* 정렬 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="title">제목 가나다순</option>
                <option value="chunks">청크 많은 순</option>
              </select>

              {/* 새로고침 */}
              <button
                onClick={fetchDocs}
                disabled={loading}
                className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                title="새로고침"
              >
                <Icon name="Refresh" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'docs' && (
            <div>
              {loading ? (
                <div className="py-24 text-center text-zinc-400 text-sm flex flex-col items-center gap-3">
                  <Icon name="Refresh" className="w-6 h-6 animate-spin text-[#1d4ed8]" />
                  <span>지식 보관함 문서를 불러오는 중입니다...</span>
                </div>
              ) : filteredAndSortedDocs.length === 0 ? (
                <div className="py-24 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                  <Icon name="KnowledgeHub" className="w-12 h-12 stroke-1 text-zinc-300 dark:text-zinc-600 mb-1" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">조건에 일치하는 지식 문서가 없습니다.</span>
                  <span className="text-xs text-zinc-400">
                    탐색기에서 마크다운 파일 우클릭 ➔ &apos;⭐ 지식 베이스에 등록&apos; 또는 &apos;대량 일괄 가져오기&apos;를 이용하세요.
                  </span>
                </div>
              ) : viewMode === 'list' ? (
                /* 📋 대량 문서용 컴팩트 테이블 뷰 (가로 스크롤 및 최소 폭 보장) */
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full min-w-[840px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100/70 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                        <th className="py-2.5 px-4 w-20 text-center">상태</th>
                        <th className="py-2.5 px-4 w-48">문서 제목</th>
                        <th className="py-2.5 px-4 w-56">파일 경로</th>
                        <th className="py-2.5 px-4">AI 핵심 요약</th>
                        <th className="py-2.5 px-4 w-40">추출 태그</th>
                        <th className="py-2.5 px-3 w-16 text-center">청크 수</th>
                        <th className="py-2.5 px-3 w-14 text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/40">
                      {paginatedDocs.map((d) => (
                        <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${
                                d.status === 'READY'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                  : d.status === 'ERROR'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              }`}>
                                {d.status}
                              </span>
                              {d.status === 'ERROR' && (
                                <button
                                  onClick={() => handleDeleteDoc(d.id, d.title)}
                                  className="p-0.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-sm transition"
                                  title="오류 문서 삭제"
                                >
                                  <Icon name="Delete" className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                            <button
                              onClick={() => handleShowDocDetail(d)}
                              className="flex items-center gap-1.5 truncate text-left hover:text-[#1d4ed8] transition cursor-pointer"
                              title={d.file_path}
                            >
                              <span className="text-[#1d4ed8] shrink-0">📗</span>
                              <span className="truncate">{d.title}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className="truncate block max-w-56" title={d.file_path}>
                              📁 {d.file_path}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                            <p className="truncate max-w-md" title={d.summary || ''}>
                              {d.summary || <span className="text-zinc-400 italic">요약 생성 대기 중...</span>}
                            </p>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-40 overflow-hidden">
                              {d.tags && d.tags.length > 0 ? (
                                d.tags.slice(0, 3).map((t, idx) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-0.5 truncate">
                                    <Icon name="Tag" className="w-2 h-2" />
                                    {t.tag_name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-zinc-400 text-[11px]">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-zinc-500 font-mono font-semibold">
                            {d.chunk_count}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleShowDocDetail(d)}
                                className="p-1 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                                title="상세 정보 및 AI 분석 보기"
                              >
                                <Icon name="Preview" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(d.id, d.title)}
                                className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                title="삭제"
                              >
                                <Icon name="Delete" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* 🗂️ 카드형 그리드 뷰 */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedDocs.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-[#1d4ed8]/50 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <button
                            onClick={() => handleShowDocDetail(d)}
                            className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 hover:text-[#1d4ed8] transition text-left cursor-pointer"
                          >
                            <span className="text-[#1d4ed8]">📗</span>
                            {d.title}
                          </button>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold shrink-0 ${
                            d.status === 'READY'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : d.status === 'ERROR'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {d.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono truncate mb-2.5 flex items-center gap-1" title={d.file_path}>
                          <span>📁</span>
                          <span className="truncate">{d.file_path}</span>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3">
                          {d.summary || 'AI 요약 분석 대기 중...'}
                        </p>

                        {d.tags && d.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {d.tags.slice(0, 4).map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-0.5"
                              >
                                <Icon name="Tag" className="w-2.5 h-2.5" />
                                {t.tag_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-400">
                        <span>청크 {d.chunk_count}개</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleShowDocDetail(d)}
                            className="p-1 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            title="상세 보기"
                          >
                            <Icon name="Preview" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(d.id, d.title)}
                            className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="삭제"
                          >
                            <Icon name="Delete" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 대량 가져오기 탭 */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-[#1d4ed8]/10 border border-[#1d4ed8]/20 rounded-xl p-4 text-xs text-zinc-700 dark:text-zinc-300">
                <span className="font-bold text-[#1d4ed8] block mb-1">💡 대량 일괄 등록 안내</span>
                현재 작업 공간의 마크다운 파일들을 선택하여 한 번에 백그라운드 큐로 색인 등록합니다.
                Gemini 3.8 Flash가 각 문서의 요약과 태그, 헤딩 청크를 자동으로 추출하여 완벽한 개인 지식 보관소를 구축합니다.
              </div>

              {isImporting && progress && (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span>진행 중: {progress.currentFile || '준비 중...'}</span>
                    <span className="text-[#1d4ed8]">{progress.percent}% ({progress.completed}/{progress.total})</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1d4ed8] transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  발견된 마크다운 파일 ({importFiles.length}개)
                </span>
                <button
                  onClick={handleStartBatchImport}
                  disabled={isImporting || importFiles.filter(f => f.selected).length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] disabled:opacity-50 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Icon name="UploadCloud" className="w-4 h-4" />
                  {isImporting ? '일괄 등록 진행 중...' : `선택한 ${importFiles.filter(f => f.selected).length}개 파일 등록 시작`}
                </button>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {importFiles.map((file, idx) => (
                  <label
                    key={idx}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={file.selected}
                        onChange={(e) => {
                          const updated = [...importFiles];
                          updated[idx].selected = e.target.checked;
                          setImportFiles(updated);
                        }}
                        className="rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
                      />
                      <Icon name="Document" className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{file.name}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate max-w-xs">{file.path}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 푸터: 페이지네이션 바 */}
        {activeTab === 'docs' && filteredAndSortedDocs.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span>페이지당 표시:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="py-1 px-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
              <span>(총 {filteredAndSortedDocs.length}개 중 {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedDocs.length)} - {Math.min(currentPage * pageSize, filteredAndSortedDocs.length)})</span>
            </div>

            {/* 이전 / 페이지 / 다음 버튼 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                <Icon name="ArrowLeft" className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-bold text-zinc-800 dark:text-zinc-200">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition"
              >
                <Icon name="ArrowRight" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 🔍 개별 문서 상세 인스펙터 팝업 */}
        {selectedDocForDetail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-100">
            <div className="bg-white dark:bg-[#1E2024] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[#1d4ed8] text-lg">📗</span>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedDocForDetail.title}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-400 truncate block">
                      📁 {selectedDocForDetail.file_path}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDocForDetail(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <Icon name="Close" className="w-4 h-4" />
                </button>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* 메타 카드 */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">색인 상태</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDocForDetail.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">분할 청크 수</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedDocForDetail.chunk_count}개 청크</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">파일 크기</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{Math.round(selectedDocForDetail.file_size / 1024 * 10) / 10} KB</span>
                  </div>
                </div>

                {/* AI 요약 */}
                <div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-1.5 text-xs">
                    <span className="text-[#1d4ed8]">💡</span> AI 분석 핵심 요약
                  </span>
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedDocForDetail.summary || '요약 내용이 없습니다.'}
                  </div>
                </div>

                {/* 태그 목록 */}
                {selectedDocForDetail.tags && selectedDocForDetail.tags.length > 0 && (
                  <div>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-1.5 text-xs">
                      <Icon name="Tag" className="w-3.5 h-3.5 text-violet-500" /> 추출된 연관 태그 ({selectedDocForDetail.tags.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDocForDetail.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 flex items-center gap-1 font-semibold"
                        >
                          <span>#{t.tag_name}</span>
                          <span className="text-[10px] opacity-60">({Math.round(t.score * 100)}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 푸터 액션 버튼 */}
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                <button
                  onClick={() => {
                    handleDeleteDoc(selectedDocForDetail.id, selectedDocForDetail.title);
                    setSelectedDocForDetail(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition flex items-center gap-1"
                >
                  <Icon name="Delete" className="w-3.5 h-3.5" />
                  <span>지식에서 삭제</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDocForDetail(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      handleOpenInEditor(selectedDocForDetail.file_path);
                      setSelectedDocForDetail(null);
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] rounded-lg transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>에디터에서 열기</span>
                    <Icon name="External" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

