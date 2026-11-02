// ====================================================================
// 📊 [OMD-KUI-008] KUI008_JobDetail.tsx ➔ 단일 작업 상세 추적 및 6단계 파이프라인 시각화
// 🎯 @KICK  : 개별 지식화 작업의 6단계 파이프라인 추적, 429 지수 백오프 카운트다운, 에러 로그 열람 및 원터치 재시도
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 단계별 상태 뱃지, 실시간 카운트다운 타이머
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [Rule 8 고대비 시인성] 단일 작업 대상 파일 경로를 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 강화하여 가독성 개선
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-008 단일 작업 상세 및 백오프 시각화 화면 구현
// 🔗 @CALLS : /api/knowledge/queue
// ====================================================================

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, XCircle, RotateCcw, 
  Copy, Check, FileText, Activity, ShieldAlert, Cpu, Hash, Layers
} from 'lucide-react';
import type { KnowledgeJob, KnowledgeJobStep } from '@/types/knowledge';

interface KUI008JobDetailProps {
  job: KnowledgeJob;
  onBack: () => void;
  onRetry: (jobId: string) => Promise<void>;
  onCancel?: (jobId: string) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const PIPELINE_STEPS: { key: KnowledgeJobStep; title: string; desc: string; icon: string }[] = [
  { key: 'HASH', title: 'SHA-256 검사', desc: '중복 및 무결성 해시 생성', icon: '🔑' },
  { key: 'PARSE', title: '마크다운 파싱', desc: 'AST 헤딩 및 구조 분석', icon: '📝' },
  { key: 'CHUNK', title: 'AST 청크 분할', desc: '계층형 청크 슬라이싱', icon: '🧩' },
  { key: 'AI_ANALYSIS', title: 'LLM 정형 분석', desc: 'Gemini 요약·키포인트·태그 추출', icon: '🤖' },
  { key: 'VALIDATION', title: '형식 검증', desc: 'JSON 스키마 및 무결성 검증', icon: '🛡️' },
  { key: 'FTS_INDEX', title: 'FTS5 원자적 저장', desc: '전문 색인 & SQLite 트랜잭션', icon: '💾' },
];

export const KUI008_JobDetail: React.FC<KUI008JobDetailProps> = ({
  job,
  onBack,
  onRetry,
  onCancel,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [backoffCountdown, setBackoffCountdown] = useState<number>(() => {
    if (job.status === 'RETRY_WAIT' && job.errorLog?.includes('429')) {
      return Math.min(60, Math.pow(2, job.retryCount) * 2);
    }
    return 0;
  });

  // 429 카운트다운 타이머
  useEffect(() => {
    if (backoffCountdown <= 0) return;
    const timer = setInterval(() => {
      setBackoffCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [backoffCountdown]);

  const handleCopyError = () => {
    if (!job.errorLog) return;
    navigator.clipboard.writeText(job.errorLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast?.('에러 로그가 클립보드에 복사되었습니다.', 'info');
  };

  const handleManualRetry = async () => {
    setRetrying(true);
    try {
      await onRetry(job.id);
      showToast?.('작업 재시도가 접수되었습니다.', 'success');
    } catch {
      showToast?.('작업 재시도 실패', 'error');
    } finally {
      setRetrying(false);
    }
  };

  const currentStepIndex = PIPELINE_STEPS.findIndex(s => s.key === job.currentStep);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* 상단 네비게이션 & 타이틀 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Job #{job.id.slice(0, 8)}
              </span>
              <h2 className="text-lg font-extrabold text-zinc-950 dark:text-white truncate max-w-md">
                {job.filePath.split('/').pop()}
              </h2>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold mt-0.5">
              {job.filePath}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {(job.status === 'FAILED' || job.status === 'RETRY_WAIT') && (
            <button
              onClick={handleManualRetry}
              disabled={retrying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              즉시 재시도
            </button>
          )}
          {job.status === 'RUNNING' && onCancel && (
            <button
              onClick={() => onCancel(job.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              작업 취소
            </button>
          )}
        </div>
      </div>

      {/* 429 Rate Limit 지수 백오프 배너 */}
      {job.status === 'RETRY_WAIT' && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              API 요청 한도(HTTP 429 Rate Limit) 도달 - 지수 백오프 대기 중
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              LLM 제공자의 분당 할당량 초과 방지를 위해 재시도 간격을 점진적으로 늘리고 있습니다. 
              {backoffCountdown > 0 ? (
                <span className="font-extrabold ml-1 underline">
                  {backoffCountdown}초 후 자동으로 다음 재시도를 실행합니다.
                </span>
              ) : (
                <span className="font-bold ml-1">곧 재시도됩니다.</span>
              )}
            </p>
            {backoffCountdown > 0 && (
              <div className="w-full bg-amber-200 dark:bg-amber-900/50 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(0, 100 - (backoffCountdown / 30) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6단계 파이프라인 트래커 */}
      <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#1d4ed8]" />
            6단계 처리 파이프라인 (Execution Pipeline)
          </h3>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            현재 상태: {job.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = 
              job.status === 'SUCCESS' || 
              (currentStepIndex > idx && job.status !== 'FAILED');
            const isCurrent = job.currentStep === step.key && job.status === 'RUNNING';
            const isFailed = job.currentStep === step.key && job.status === 'FAILED';
            const isWaiting = !isCompleted && !isCurrent && !isFailed;

            return (
              <div
                key={step.key}
                className={`relative flex flex-col p-3 rounded-lg border transition ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : isCurrent
                    ? 'border-[#1d4ed8] dark:border-[#1d4ed8]/80 bg-[#1d4ed8]/10 shadow-xs animate-pulse'
                    : isFailed
                    ? 'border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base">{step.icon}</span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  {isCurrent && <Clock className="w-4 h-4 text-[#1d4ed8] animate-spin" />}
                  {isFailed && <XCircle className="w-4 h-4 text-red-500" />}
                  {isWaiting && <span className="text-[10px] font-bold text-zinc-400">대기</span>}
                </div>
                <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                  {idx + 1}. {step.title}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 작업 메타데이터 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400 block font-medium">컬렉션</span>
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {job.collectionName || '기본 보관함'}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400 block font-medium">우선순위 (Priority)</span>
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {job.priority === 1 ? '🔥 긴급 (P1)' : job.priority === 3 ? '✨ 일반 (P3)' : '낮음 (P5)'}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400 block font-medium">재시도 횟수</span>
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {job.retryCount}회 / 최대 5회
          </span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400 block font-medium">접수 시각</span>
          <span className="font-mono text-zinc-900 dark:text-zinc-100 mt-1 block">
            {new Date(job.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* 에러 로그 섹션 */}
      {job.errorLog && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              오류 상세 로그 (Error Diagnostics)
            </div>
            <button
              onClick={handleCopyError}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨' : '로그 복사'}
            </button>
          </div>
          <pre className="text-xs font-mono p-3 rounded-lg bg-white/80 dark:bg-black/50 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap max-h-48">
            {job.errorLog}
          </pre>
        </div>
      )}
    </div>
  );
};
