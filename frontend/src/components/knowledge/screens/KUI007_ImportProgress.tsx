// ====================================================================
// 📊 [OMD-KUI-007] KUI007_ImportProgress.tsx ➔ 실시간 수집 및 인덱싱 진행 현황 모니터
// 🎯 @KICK  : 대량 문서 수집 진행률(%), 5대 메트릭(Total/Done/Run/Wait/Fail), Worker별 가동 상태 및 일시정지/재개
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 자동 1.5초 폴링, 실시간 통계 안전 가드
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-05** — ESLint react-hooks/exhaustive-deps 경고 해결: fetchStats를 useCallback으로 메모이제이션하고 useEffect 의존성 배열에 등록
//             **2026-09-04** — [Rule 8 고대비 시인성] Worker 실행 현황 및 처리 중 파일 경로를 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 강화하여 시인성 확보
//             **2026-09-04** — [서버 부하 방어] 수집 진행 중 1.5초, 유휴(완료) 10초 적응형 폴링 및 탭 숨김 시 폴링 정지 적용하여 백엔드 큐 통계 요청 부하 대폭 절감
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-007 실시간 큐 진행 및 Worker 모니터 화면 신규 구현
// 🔗 @CALLS : /api/knowledge/queue/stats, /api/knowledge/queue, KnowledgeWorkerEngine
// ====================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, Clock, 
  Layers, Cpu, Activity, Eye, ChevronRight, RefreshCw, XCircle
} from 'lucide-react';
import type { QueueProgressStats, KnowledgeJob } from '@/types/knowledge';
import { KnowledgeWorkerEngine } from '@/lib/knowledge/knowledgeWorker';

interface KUI007ImportProgressProps {
  resourceFolder: string;
  geminiApiKey: string;
  aiModelName?: string;
  onViewJobDetail: (job: KnowledgeJob) => void;
  onNavigateToFailed: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI007_ImportProgress: React.FC<KUI007ImportProgressProps> = ({
  resourceFolder,
  geminiApiKey,
  aiModelName = 'gemini-3.8-flash',
  onViewJobDetail,
  onNavigateToFailed,
  showToast,
}) => {
  const [stats, setStats] = useState<QueueProgressStats>({
    total: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    activeWorkers: 0,
    maxWorkers: 2,
    percent: 0,
    isPaused: false,
    rateLimitStatus: 'NORMAL',
    rateLimitCooldownSec: 0,
  });

  const [activeJobs, setActiveJobs] = useState<KnowledgeJob[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const workerEngineRef = useRef<KnowledgeWorkerEngine | null>(null);

  // 통계 및 큐 상태 폴링
  const fetchStats = useCallback(async () => {
    if (!resourceFolder) return;
    try {
      const res = await fetch(`/api/knowledge/queue/stats?resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok && data.stats) {
        setStats(data.stats);
      }

      // 실행 중 또는 대기 중인 작업 목록 가져오기
      const jobRes = await fetch(`/api/knowledge/queue?resourceFolder=${encodeURIComponent(resourceFolder)}&status=RUNNING`);
      const jobData = await jobRes.json();
      if (jobData.ok) {
        setActiveJobs(jobData.jobs || []);
      }
    } catch {
      // silent catch for polling
    }
  }, [resourceFolder]);

  useEffect(() => {
    fetchStats();

    // 🛡️ [서버 부하 방어] 작업 처리 중에는 1.5초, 유휴(완료) 상태에서는 10초 적응형 폴링 및 탭 숨김 시 정지
    let timerId: any = null;

    const runPoll = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        timerId = setTimeout(runPoll, 5000);
        return;
      }

      await fetchStats();

      const hasActiveWork = stats.queued > 0 || stats.running > 0;
      const nextDelay = hasActiveWork ? 1500 : 10000;
      timerId = setTimeout(runPoll, nextDelay);
    };

    timerId = setTimeout(runPoll, stats.queued > 0 || stats.running > 0 ? 1500 : 10000);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [fetchStats, stats.queued, stats.running]);

  // 워커 엔진 초기화 및 구동
  useEffect(() => {
    if (!resourceFolder || !geminiApiKey) return;

    if (!workerEngineRef.current) {
      workerEngineRef.current = KnowledgeWorkerEngine.getInstance({
        resourceFolder,
        geminiApiKey,
        aiModelName,
        maxWorkers: 2,
        onProgress: (newStats) => {
          setStats(newStats);
        },
      });
    }

    const engine = workerEngineRef.current;
    if (stats.queued > 0 || stats.running > 0) {
      engine.start();
      setIsProcessing(true);
    }

    return () => {
      // cleanup on unmount
    };
  }, [resourceFolder, geminiApiKey, aiModelName, stats.queued, stats.running]);

  const handleTogglePause = () => {
    if (!workerEngineRef.current) return;
    if (isProcessing) {
      workerEngineRef.current.pause();
      setIsProcessing(false);
      showToast('문서 수집 처리를 일시 정지했습니다.', 'info');
    } else {
      workerEngineRef.current.resume();
      setIsProcessing(true);
      showToast('문서 수집 처리를 재개했습니다.', 'success');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* 상단 타이틀 & 가동 상태 바 */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1d4ed8]" />
            수집 및 지식화 진행 센터 (KUI-007)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            로컬 Queue 엔진을 통해 문서를 단계별로 안전하게 파싱하고 AI 분석을 수행합니다.
          </p>
        </div>

        {/* 일시정지 / 재개 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition shadow-xs ${
              isProcessing
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-[#1d4ed8] text-white hover:bg-[#05b34c]'
            }`}
          >
            {isProcessing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isProcessing ? '일시 정지' : '작업 재개'}
          </button>
        </div>
      </div>

      {/* 대형 진행률 바 */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {stats.percent}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              ({stats.completed} / {stats.total} 완료)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {stats.running > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8]">
                <Clock className="w-3 h-3 animate-spin" />
                {stats.running}개 작업 처리 중
              </span>
            )}
            {stats.isPaused && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                일시 정지됨
              </span>
            )}
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-[#1d4ed8] h-3 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {/* 5대 메트릭 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D]">
          <span className="text-[11px] font-bold text-zinc-400 block uppercase">전체 대상</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {stats.total}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">완료 (DONE)</span>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block">
            {stats.completed}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block uppercase">진행 중 (RUN)</span>
          <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-1 block">
            {stats.running}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D]">
          <span className="text-[11px] font-bold text-zinc-400 block uppercase">대기 (QUEUED)</span>
          <span className="text-xl font-extrabold text-zinc-700 dark:text-zinc-300 mt-1 block">
            {stats.queued}
          </span>
        </div>
        <div 
          onClick={onNavigateToFailed}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            stats.failed > 0
              ? 'border-red-300 dark:border-red-800/80 bg-red-50/50 dark:bg-red-950/30 hover:shadow-xs'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D]'
          }`}
        >
          <span className={`text-[11px] font-bold block uppercase ${stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`}>
            실패 (FAIL) ➔
          </span>
          <span className={`text-xl font-extrabold mt-1 block ${stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {stats.failed}
          </span>
        </div>
      </div>

      {/* Worker 상태 그리드 (가상 동시성 풀) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-[#1d4ed8]" />
          백그라운드 Worker 상태 (Worker Pool: {stats.maxWorkers || 2}슬롯)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: stats.maxWorkers || 2 }).map((_, idx) => {
            const activeJob = activeJobs[idx];
            const isBusy = Boolean(activeJob);

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-center justify-between transition ${
                  isBusy
                    ? 'border-[#1d4ed8]/50 dark:border-[#1d4ed8]/40 bg-[#1d4ed8]/5 dark:bg-[#1d4ed8]/10 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isBusy ? 'bg-[#1d4ed8] text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}>
                    W{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                        {isBusy ? activeJob.filePath.split('/').pop() : '유휴 상태 (IDLE)'}
                      </span>
                      {isBusy && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {activeJob.currentStep}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono font-bold truncate mt-0.5">
                      {isBusy ? activeJob.filePath : '대기 중인 다음 작업을 수신 대기 중입니다.'}
                    </p>
                  </div>
                </div>

                {isBusy && (
                  <button
                    onClick={() => onViewJobDetail(activeJob)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition shrink-0 ml-2"
                    title="상세 보기"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 실시간 실행 중 작업 테이블 */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            현재 처리 중인 파일 목록
          </h3>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#18191D]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold">
                <tr>
                  <th className="p-3">문서명</th>
                  <th className="p-3 w-28">현재 단계</th>
                  <th className="p-3 w-20 text-center">우선순위</th>
                  <th className="p-3 w-24 text-center">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                    <td className="p-3">
                      <span className="font-extrabold text-zinc-950 dark:text-white block truncate max-w-sm">
                        {job.filePath.split('/').pop()}
                      </span>
                      <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono font-bold block truncate max-w-sm mt-0.5">
                        {job.filePath}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {job.currentStep || 'QUEUED'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-zinc-600 dark:text-zinc-400">
                      P{job.priority}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onViewJobDetail(job)}
                        className="px-2 py-1 text-[11px] font-bold rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition"
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
