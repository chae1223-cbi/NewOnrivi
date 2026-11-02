// ====================================================================
// 📊 [OMD-KUI-012] KUI012_EvidenceViewer.tsx ➔ AI 답변 근거 뷰어 및 Stale Hash 감지
// 🎯 @KICK  : AI 답변의 인용 근거 청크 원문, 헤딩 경로, 라인 범위(L1~L50) 열람, 에디터 라인 점프 및 Stale Hash(색인 후 변경) 실시간 감지
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 원본 해시 비교 가드, 원터치 재색인 연동
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [Rule 8 고대비 시인성] 인용 근거 청크 파일 경로 및 라인 범위를 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 강화하여 가독성 개선
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-012 AI 답변 출처 근거 뷰어 및 Stale Hash 감지 화면 구현
// 🔗 @CALLS : app:open-file-at-line, /api/knowledge/queue
// ====================================================================

import React, { useState } from 'react';
import { 
  X, FileText, ExternalLink, AlertTriangle, CheckCircle2, 
  Hash, Tag, Layers, RotateCcw, Copy, Check
} from 'lucide-react';
import type { RetrievalCandidate } from '@/types/knowledge';

interface KUI012EvidenceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: RetrievalCandidate | null;
  resourceFolder?: string;
  isStale?: boolean;
  onReindexDoc?: (filePath: string) => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI012_EvidenceViewer: React.FC<KUI012EvidenceViewerProps> = ({
  isOpen,
  onClose,
  evidence,
  resourceFolder,
  isStale = false,
  onReindexDoc,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  if (!isOpen || !evidence) return null;

  const handleOpenInEditor = () => {
    window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
      detail: { filePath: evidence.filePath, startLine: evidence.startLine || 1 }
    }));
    showToast?.(`'${evidence.filePath}' 문서를 에디터 ${evidence.startLine || 1}번 라인에서 열었습니다.`, 'info');
    onClose();
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(evidence.snippet || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast?.('청크 본문이 클립보드에 복사되었습니다.', 'info');
  };

  const handleReindex = async () => {
    if (!onReindexDoc) return;
    setReindexing(true);
    try {
      await onReindexDoc(evidence.filePath);
      showToast?.('해당 문서의 재색인 작업이 대기열에 등록되었습니다.', 'success');
    } catch {
      showToast?.('재색인 등록 실패', 'error');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#1C1E22] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center font-bold text-lg shrink-0">
              📑
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                  AI 인용 근거 청크 (Evidence Viewer)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  점수: {evidence.score ? evidence.score.toFixed(2) : '1.00'}
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold truncate mt-0.5">
                {evidence.filePath} (L{evidence.startLine || 1} ~ L{evidence.endLine || 1})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 컨테이너 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stale Hash 감지 경고 배너 */}
          {isStale && (
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-extrabold text-amber-900 dark:text-amber-200">
                    문서 내용 변경 감지 (Stale Hash)
                  </h4>
                  <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                    색인된 이후 에디터에서 문서가 수정되었습니다. 현재 에디터의 라인 번호나 내용과 일부 차이가 있을 수 있습니다.
                  </p>
                </div>
              </div>
              {onReindexDoc && (
                <button
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3 h-3 ${reindexing ? 'animate-spin' : ''}`} />
                  재색인
                </button>
              )}
            </div>
          )}

          {/* 메타 정보 뱃지들 */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {evidence.headingPath && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                <Layers className="w-3.5 h-3.5 text-[#1d4ed8]" />
                {evidence.headingPath}
              </span>
            )}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              L{evidence.startLine || 1} - L{evidence.endLine || 1}
            </span>
          </div>

          {/* 청크 원문 코드 블록 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
              <span>청크 본문 (Snippet)</span>
              <button
                onClick={handleCopyContent}
                className="flex items-center gap-1 text-[11px] hover:text-zinc-800 dark:hover:text-zinc-200 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사됨' : '본문 복사'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {evidence.snippet || '(본문 내용이 없습니다)'}
            </div>
          </div>
        </div>

        {/* 하단 액션 툴바 */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
          >
            닫기
          </button>
          <button
            onClick={handleOpenInEditor}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            에디터에서 열기 ({evidence.startLine || 1}행)
          </button>
        </div>
      </div>
    </div>
  );
};
