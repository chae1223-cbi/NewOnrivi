// ====================================================================
// 📊 [OMD-KUI-010] KUI010_KnowledgeDocDetail.tsx ➔ 지식 문서 상세 분석 뷰어
// 🎯 @KICK  : 지식 문서의 AI 요약, 핵심 요점, 헤딩별 청크 분할 구조, 태그 및 라인 점프
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 청크 아코디언, 에디터 라인 점프 연동
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [Rule 8 고대비 시인성] 문서 상세 헤더의 파일 경로를 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 강화하여 가독성 개선
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-010 지식 문서 상세 내역 뷰어 화면 신규 구현
// 🔗 @CALLS : app:open-file-at-line
// ====================================================================

import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, Sparkles, Tag, Layers, FileText, 
  ExternalLink, Search, Hash, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';
import type { KnowledgeDocumentDetail } from '@/types/knowledge';

interface KUI010KnowledgeDocDetailProps {
  detail: KnowledgeDocumentDetail;
  onBack: () => void;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI010_KnowledgeDocDetail: React.FC<KUI010KnowledgeDocDetailProps> = ({
  detail,
  onBack,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chunks' | 'tags'>('summary');
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenInEditor = (startLine: number = 1) => {
    window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
      detail: { filePath: detail.filePath, startLine }
    }));
    showToast?.(`'${detail.filePath}' 문서를 에디터 ${startLine}번 라인에서 열었습니다.`, 'info');
  };

  const handleCopySummary = () => {
    if (!detail.summary) return;
    navigator.clipboard.writeText(detail.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast?.('AI 요약이 복사되었습니다.', 'info');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* 상단 네비게이션 & 타이틀 */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate max-w-md">
                {detail.title || detail.filePath.split('/').pop()}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                READY
              </span>
              {detail.analyzerModel && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                  {detail.analyzerModel}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono font-bold mt-0.5">
              📁 {detail.filePath}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenInEditor(1)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          에디터에서 열기
        </button>
      </div>

      {/* 4대 메트릭 요약 바 */}
      <div className="grid grid-cols-4 gap-2.5 text-center">
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-medium block">생성 청크</span>
          <span className="text-sm font-extrabold text-[#1d4ed8]">{detail.chunksCount}개</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-medium block">추출 태그</span>
          <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">{detail.tags?.length || 0}개</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-medium block">연관 검색어</span>
          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{detail.searchTerms?.length || 0}개</span>
        </div>
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-medium block">문서 크기</span>
          <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
            {detail.fileSize ? `${Math.round(detail.fileSize / 1024 * 10) / 10} KB` : '일반'}
          </span>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('summary')}
          className={`py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'summary'
              ? 'border-[#1d4ed8] text-[#1d4ed8]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI 요약 & 핵심 요점</span>
        </button>
        <button
          onClick={() => setActiveTab('chunks')}
          className={`py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'chunks'
              ? 'border-[#1d4ed8] text-[#1d4ed8]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>분할 청크 구조 ({detail.chunksCount}개)</span>
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'tags'
              ? 'border-[#1d4ed8] text-[#1d4ed8]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>지식 태그 & 검색어 ({detail.tags?.length || 0})</span>
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-y-auto space-y-4 text-xs">
        {/* 1. 요약 & 키포인트 */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
                  <span className="text-[#1d4ed8]">💡</span> AI 핵심 요약
                </span>
                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '복사됨' : '요약 복사'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 text-zinc-800 dark:text-zinc-200 leading-relaxed text-xs">
                {detail.summary || '문서 요약 정보가 없습니다.'}
              </div>
            </div>

            <div>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#1d4ed8]" /> 추출된 핵심 요점 (Key Points)
              </span>
              {detail.keyPoints && detail.keyPoints.length > 0 ? (
                <div className="space-y-2">
                  {detail.keyPoints.map((point, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 italic p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl">
                  추출된 핵심 요점이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 2. 청크 목록 */}
        {activeTab === 'chunks' && (
          <div className="space-y-3">
            {detail.chunks.map((chunk, idx) => {
              const isExpanded = expandedChunkId === chunk.id;
              return (
                <div 
                  key={chunk.id || idx}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] overflow-hidden"
                >
                  <div 
                    onClick={() => setExpandedChunkId(isExpanded ? null : chunk.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                        {chunk.chunkIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate block">
                          {chunk.headingTitle || `청크 #${chunk.chunkIndex + 1}`}
                        </span>
                        {chunk.headingPath && (
                          <span className="text-[11px] text-zinc-400 truncate block font-mono">
                            {chunk.headingPath}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        L{chunk.startLine} ~ L{chunk.endLine}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInEditor(chunk.startLine);
                        }}
                        className="p-1 rounded text-[#1d4ed8] hover:bg-[#1d4ed8]/10 transition"
                        title="에디터 라인 이동"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
                      {chunk.chunkSummary && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300">
                          {chunk.chunkSummary}
                        </p>
                      )}
                      <div className="p-3 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-700 dark:text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {chunk.chunkText}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. 태그 및 검색어 */}
        {activeTab === 'tags' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-zinc-700 dark:text-zinc-300 mb-2">지식 추출 태그</h4>
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                  >
                    <Tag className="w-3 h-3 text-[#1d4ed8]" />
                    {t.name}
                    <span className="text-[10px] text-zinc-400 font-mono ml-0.5">({t.score})</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-zinc-700 dark:text-zinc-300 mb-2">확장 검색어</h4>
              <div className="flex flex-wrap gap-2">
                {(detail.searchTerms || []).map((term, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium"
                  >
                    <Search className="w-3 h-3" />
                    {term}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
