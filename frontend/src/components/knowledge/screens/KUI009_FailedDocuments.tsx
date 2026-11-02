// ====================================================================
// 📊 [OMD-KUI-009] KUI009_FailedDocuments.tsx ➔ 실패 문서 관리 및 원터치 선택 재시도
// 🎯 @KICK  : 수집/인덱싱 실패 문서 목록, 실패 원인 진단(429, 파싱, JSON, DB락), 선택적 일괄 재시도 및 취소
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 전체 선택/개별 선택 체크박스, 안전 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-05** — ESLint react-hooks/exhaustive-deps 경고 해결: fetchFailedJobs를 useCallback으로 메모이제이션하고 useEffect 의존성 배열에 등록
//             **2026-09-04** — [Rule 8 고대비 시인성] 실패 문서 목록 파일 경로를 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 강화하여 식별력 개선
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-009 실패 문서 관리 및 복구 전용 화면 신규 구현
// 🔗 @CALLS : /api/knowledge/queue
// ====================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AlertTriangle, RotateCcw, Trash2, Search, Filter, 
  ChevronRight, ChevronDown, CheckSquare, Square, Eye, ShieldAlert
} from 'lucide-react';
import type { KnowledgeJob } from '@/types/knowledge';

interface KUI009FailedDocumentsProps {
  resourceFolder: string;
  onViewJobDetail: (job: KnowledgeJob) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI009_FailedDocuments: React.FC<KUI009FailedDocumentsProps> = ({
  resourceFolder,
  onViewJobDetail,
  showToast,
}) => {
  const [failedJobs, setFailedJobs] = useState<KnowledgeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFailedJobs = useCallback(async () => {
    if (!resourceFolder) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/queue?resourceFolder=${encodeURIComponent(resourceFolder)}&status=FAILED`);
      const data = await res.json();
      if (data.ok) {
        setFailedJobs(data.jobs || []);
      }
    } catch {
      showToast('실패 문서 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [resourceFolder, showToast]);

  useEffect(() => {
    fetchFailedJobs();
  }, [fetchFailedJobs]);

  // 검색 필터링
  const filteredJobs = useMemo(() => {
    if (!search.trim()) return failedJobs;
    const q = search.toLowerCase();
    return failedJobs.filter(j => 
      j.filePath.toLowerCase().includes(q) || 
      (j.errorLog && j.errorLog.toLowerCase().includes(q))
    );
  }, [failedJobs, search]);

  const handleToggleSelect = (id: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const handleRetryJobs = async (jobIds?: string[]) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/knowledge/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RETRY_FAILED',
          resourceFolder,
          jobIds: jobIds && jobIds.length > 0 ? jobIds : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`${data.retriedCount || 0}건의 작업을 다시 대기열에 등록했습니다.`, 'success');
        setSelectedJobIds(new Set());
        fetchFailedJobs();
      } else {
        showToast(data.message || '재시도 실패', 'error');
      }
    } catch {
      showToast('재시도 요청 중 통신 오류가 발생했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJobs = async (jobIds: string[]) => {
    if (!confirm(`선택한 ${jobIds.length}건의 실패 작업을 취소/삭제하시겠습니까?`)) return;
    setActionLoading(true);
    try {
      for (const id of jobIds) {
        await fetch('/api/knowledge/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CANCEL',
            resourceFolder,
            jobId: id,
          }),
        });
      }
      showToast('선택한 작업이 정리되었습니다.', 'info');
      setSelectedJobIds(new Set());
      fetchFailedJobs();
    } catch {
      showToast('작업 취소 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* 상단 툴바 & 상태 요약 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              실패 문서 복구 센터 (KUI-009)
            </h2>
            <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/60">
              {failedJobs.length}건 실패
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            외부 API 제한(429), 네트워크 순단, 또는 형식 파싱 오류로 중단된 문서를 선택하여 즉시 복구할 수 있습니다.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRetryJobs(selectedJobIds.size > 0 ? Array.from(selectedJobIds) : undefined)}
            disabled={actionLoading || failedJobs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs disabled:opacity-40"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            {selectedJobIds.size > 0 ? `선택 항목 재시도 (${selectedJobIds.size})` : '실패 문서 전체 재시도'}
          </button>
          {selectedJobIds.size > 0 && (
            <button
              onClick={() => handleCancelJobs(Array.from(selectedJobIds))}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              선택 삭제 ({selectedJobIds.size})
            </button>
          )}
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="실패 파일 경로 또는 오류 내용 검색..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#1d4ed8]"
        />
      </div>

      {/* 실패 목록 테이블 */}
      <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#18191D]">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-xs text-zinc-500 gap-2">
            <RotateCcw className="w-4 h-4 animate-spin text-[#1d4ed8]" />
            실패 작업 목록 조회 중...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-500 space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#1d4ed8] flex items-center justify-center font-bold">
              ✓
            </div>
            <p className="text-xs font-medium">실패하거나 중단된 작업이 없습니다. 모든 문서가 정상 처리되었습니다!</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button onClick={handleToggleSelectAll}>
                    {selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#1d4ed8]" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </th>
                <th className="p-3">문서 경로</th>
                <th className="p-3 w-28">실패 단계</th>
                <th className="p-3 w-20 text-center">재시도</th>
                <th className="p-3 w-28 text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {filteredJobs.map((job) => {
                const isSelected = selectedJobIds.has(job.id);
                const isExpanded = expandedJobId === job.id;
                const isRateLimit = job.errorLog?.includes('429');

                return (
                  <React.Fragment key={job.id}>
                    <tr 
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition cursor-pointer ${
                        isSelected ? 'bg-[#1d4ed8]/5 dark:bg-[#1d4ed8]/10' : ''
                      }`}
                      onClick={() => handleToggleSelect(job.id)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleToggleSelect(job.id)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#1d4ed8]" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedJobId(isExpanded ? null : job.id);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <span>{job.filePath.split('/').pop()}</span>
                          {isRateLimit && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              429 Rate Limit
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono font-bold mt-0.5 pl-5 truncate max-w-md">
                          {job.filePath}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                          {job.currentStep || 'FAILED'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-500">
                        {job.retryCount} / 5
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleRetryJobs([job.id])}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            title="즉시 재시도"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewJobDetail(job)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="파이프라인 상세 보기"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 에러 로그 아코디언 */}
                    {isExpanded && (
                      <tr className="bg-red-50/20 dark:bg-red-950/10">
                        <td colSpan={5} className="p-4 pl-12">
                          <div className="p-3 rounded-lg bg-white dark:bg-black/40 border border-red-100 dark:border-red-900/30 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {job.errorLog || '상세 에러 로그가 기록되지 않았습니다.'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
