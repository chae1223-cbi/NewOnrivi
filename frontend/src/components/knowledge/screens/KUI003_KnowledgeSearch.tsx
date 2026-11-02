// ====================================================================
// 📊 [OMD-KUI-003] KUI003_KnowledgeSearch.tsx ➔ 하이브리드 검색 및 AI 지식 Q&A
// 🎯 @KICK  : FTS5 + 태그 하이브리드 청크 검색, Gemini 질의응답(RAG), 근거 뷰어 연동 및 원문 에디터 점프
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 검색 모드/AI 질의 모드 탭 분리, 로컬 우선 처리
// 🚨 @PATCH : **2026-09-12** — [청크 검색 결과 기반 AI 답변 및 출처 생성 퀵 액션 연동 및 파사드 동기화]
//             1) 하이브리드 청크 검색 결과 상단에 '검색된 청크 기반 AI 답변 & 출처 생성' 퀵 액션 배너 신설로 검색 즉시 Q&A 연계 지원
//             2) 청크 목록 카드마다 '출처: 문서명' 고대비 뱃지(Rule 8) 명시화로 원본 파일 출처 직관 식별 보장
//             3) isServerApiAvailable() 파사드 브랜칭 및 effectiveResourceFolder 다중 폴백 적용으로 웹 브라우저(WASM) 및 데스크톱 환경 일치화
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             **2026-09-06** — [웹 브라우저 WASM SQLite 기반 지식 검색 및 질의 연동] 데스크톱/로컬뿐만 아니라 웹 프로드(onrivi.com) 환경에서도 knowledgeClient를 통해 사용자 PC의 onrivi_knowledge.db에 직접 하이브리드 검색 및 AI 질의응답을 수행하도록 연동
//             **2026-09-04** — [Rule 8 고대비 시인성] 검색 결과 헤딩 경로 및 근거 텍스트를 고대비 볼드 text-zinc-700 dark:text-zinc-300으로 보강하여 가독성 강화
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-003 하이브리드 지식 검색 및 AI Q&A 통합 화면 신규 구현
// 🔗 @CALLS : knowledgeClient, /api/knowledge/search, /api/knowledge/query, KUI012_EvidenceViewer
// ====================================================================

import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { requireResourceSettings } from '@/lib/resourceSettings';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Sparkles, Database, FileText, Layers, ExternalLink, 
  Hash, Tag, Eye, ChevronRight, AlertCircle, RefreshCw, Send, BookOpen
} from 'lucide-react';
import type { RetrievalCandidate, KnowledgeCollection } from '@/types/knowledge';
import { knowledgeClient, isServerApiAvailable } from '@/lib/knowledge/knowledgeClient';
import { loadSecureData } from '@/lib/secureStorage';
import { KUI012_EvidenceViewer } from './KUI012_EvidenceViewer';

interface KUI003KnowledgeSearchProps {
  resourceFolder: string;
  geminiApiKey: string;
  planCode?: string;
  aiModelName?: string;
  collections?: KnowledgeCollection[];
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const KUI003_KnowledgeSearch: React.FC<KUI003KnowledgeSearchProps> = ({
  resourceFolder,
  geminiApiKey,
  planCode = 'ELITEPRO',
  aiModelName = 'gemini-3.8-flash',
  collections = [],
  showToast,
}) => {
  const [searchMode, setSearchMode] = useState<'search' | 'qa'>('search');
  const [query, setQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // 검색 결과 상태
  const [candidates, setCandidates] = useState<RetrievalCandidate[]>([]);
  
  // AI Q&A 결과 상태
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [evidenceList, setEvidenceList] = useState<RetrievalCandidate[]>([]);

  // Evidence Viewer 상태
  const [selectedEvidence, setSelectedEvidence] = useState<RetrievalCandidate | null>(null);

  const effectiveResourceFolder = getEffectiveResourceFolder();

  const executeQASearch = async (targetQuery?: string) => {
    try {requireResourceSettings();}catch(error:any){showToast(error.message,'warning');return;}
    const q = (targetQuery !== undefined ? targetQuery : query).trim();
    if (!q) {
      showToast('검색할 키워드나 질문을 입력해 주세요.', 'warning');
      return;
    }

    setSearchMode('qa');
    setLoading(true);
    try {
      if (isServerApiAvailable()) {
        try {
          const res = await fetch('/api/knowledge/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: q,
              resourceFolder: effectiveResourceFolder,
              geminiApiKey,
              planCode,
              aiModelName,
              collectionId: selectedCollectionId === 'ALL' ? undefined : selectedCollectionId,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            setAiAnswer(data.answer);
            setEvidenceList(data.evidenceList || []);
            return;
          }
        } catch (serverErr) {
          console.warn('[KUI003] 서버 질의응답 실패, WASM 폴백 시도:', serverErr);
        }
      }

      // 웹 브라우저 WASM Q&A
      const wasmData = await knowledgeClient.searchKnowledge({
        query: q,
        resourceFolder: effectiveResourceFolder,
        geminiApiKey,
        planCode,
        aiModelName,
        collectionId: selectedCollectionId === 'ALL' ? undefined : selectedCollectionId,
        limit: 10,
      });
      if (wasmData.answer) {
        setAiAnswer(wasmData.answer);
        setEvidenceList(wasmData.candidates || []);
      } else {
        if (!geminiApiKey) {
          showToast('AI 답변 및 출처를 생성하려면 환경설정에서 Gemini API 키를 먼저 등록해 주세요.', 'warning');
        } else {
          showToast('AI 답변을 생성하지 못했습니다. 질문을 구체화하거나 다른 모델을 선택해 주세요.', 'warning');
        }
      }
    } catch (err: any) {
      console.error('[AI 응답 오류]', err);
      const errMsg = err?.message || String(err || '알 수 없는 오류');
      showToast(`❌ AI 응답 생성 실패: ${errMsg}`, 'error');
      if (typeof window !== 'undefined') {
        window.alert(`❌ AI 응답 생성 실패\n\n${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      showToast('검색할 키워드나 질문을 입력해 주세요.', 'warning');
      return;
    }

    if (searchMode === 'qa') {
      return executeQASearch();
    }

    setLoading(true);
    try {
      const data = await knowledgeClient.searchKnowledge({
        query: query.trim(),
        resourceFolder: effectiveResourceFolder,
        geminiApiKey,
        planCode,
        collectionId: selectedCollectionId === 'ALL' ? undefined : selectedCollectionId,
        limit: 30,
        aiModelName,
      });
      setCandidates(data.candidates || []);
      if ((data.candidates || []).length === 0) {
        showToast('일치하는 지식 청크가 없습니다.', 'info');
      }
    } catch {
      showToast('검색 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInEditor = (filePath: string, startLine: number = 1) => {
    window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
      detail: { filePath, startLine }
    }));
    showToast(`'${filePath}' 문서를 에디터 ${startLine}번 라인에서 열었습니다.`, 'info');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-4">
      {/* 상단 툴바 & 모드 토글 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#1d4ed8]" />
            지식 하이브리드 검색 & AI 질의 (KUI-003)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            FTS5 전문 검색과 AI 정형 태그를 결합하여 필요한 청크를 즉시 찾고 질문에 대한 답변을 생성합니다.
          </p>
        </div>

        {/* 모드 전환 탭 */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setSearchMode('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              searchMode === 'search'
                ? 'bg-white dark:bg-[#1C1E22] text-[#1d4ed8] shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            하이브리드 청크 검색
          </button>
          <button
            onClick={() => setSearchMode('qa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              searchMode === 'qa'
                ? 'bg-white dark:bg-[#1C1E22] text-[#1d4ed8] shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 지식 질의 (Q&A)
          </button>
        </div>
      </div>

      {/* 검색 입력 폼 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        {/* 컬렉션 필터 */}
        {collections.length > 0 && (
          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-[#1d4ed8]"
          >
            <option value="ALL">모든 컬렉션</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* 검색 인풋 */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === 'search'
                ? '검색할 키워드, 개념, 또는 파일 내용을 입력하세요...'
                : '지식 보관함을 기반으로 AI에게 질문할 내용을 입력하세요 (예: 온리비 라이선스 발급 절차는?)...'
            }
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#1d4ed8]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : searchMode === 'search' ? (
            <Search className="w-3.5 h-3.5" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {searchMode === 'search' ? '검색' : '질문하기'}
        </button>
      </form>

      {/* 결과 표시 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-52 text-xs text-zinc-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1d4ed8]" />
            <span>{searchMode === 'search' ? '지식 인덱스를 정밀 검색하고 있습니다...' : '관련 근거를 취합하여 AI 답변을 생성 중입니다...'}</span>
          </div>
        )}

        {/* 1. 청크 검색 결과 목록 */}
        {!loading && searchMode === 'search' && (
          <>
            {candidates.length > 0 && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-[#1d4ed8]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>검색된 {candidates.length}개 지식 청크 기반 AI 답변 & 출처 생성</span>
                      </div>
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        지식 보관함에서 발췌한 청크들을 근거(Evidence)로 질문에 대한 종합 답변과 인용 출처 목록을 생성합니다.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeQASearch()}
                    className="px-3.5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 답변 및 출처 생성
                  </button>
                </div>

                <div className="text-xs text-zinc-500 font-bold px-1 flex items-center justify-between">
                  <span>검색된 청크: <span className="text-[#1d4ed8] font-extrabold">{candidates.length}개</span></span>
                  <span className="text-[11px] text-zinc-400 font-normal">각 카드의 출처 문서와 상세 섹션을 확인하실 수 있습니다.</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {candidates.map((cand, idx) => (
                <div
                  key={`${cand.chunkId}-${idx}`}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] hover:border-[#1d4ed8]/50 transition space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-[#1d4ed8]/10 text-[#1d4ed8] border border-[#1d4ed8]/20 shrink-0 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        출처: {cand.filePath.split(/[/\\]/).pop()}
                      </span>
                      {cand.headingPath && (
                        <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
                          › {cand.headingPath}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        L{cand.startLine || 1}~L{cand.endLine || 1}
                      </span>
                      <button
                        onClick={() => setSelectedEvidence(cand)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="근거 상세 열람"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenInEditor(cand.filePath, cand.startLine || 1)}
                        className="p-1 rounded-lg text-[#1d4ed8] hover:bg-[#1d4ed8]/10 transition"
                        title="에디터에서 열기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 스니펫 */}
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono line-clamp-3 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
                    {cand.snippet}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 2. AI Q&A 답변 뷰 */}
        {!loading && searchMode === 'qa' && aiAnswer && (
          <div className="space-y-5">
            {/* AI 응답 카드 */}
            <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1d4ed8]" />
                <h3 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                  AI 지식 답변 ({aiModelName})
                </h3>
              </div>
              <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {aiAnswer}
              </div>
            </div>

            {/* 참조된 근거 청크 목록 */}
            {evidenceList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1d4ed8]" />
                  답변에 인용된 근거 및 출처 문서 ({evidenceList.length}개)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evidenceList.map((ev, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedEvidence(ev)}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] hover:border-[#1d4ed8] cursor-pointer transition space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs gap-1.5">
                        <span className="font-extrabold text-[#1d4ed8] truncate max-w-[200px] flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          출처: {ev.filePath.split(/[/\\]/).pop()}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                          L{ev.startLine}~L{ev.endLine}
                        </span>
                      </div>
                      {ev.headingPath && (
                        <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          섹션: {ev.headingPath}
                        </div>
                      )}
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {ev.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 근거 뷰어 모달 (KUI-012) */}
      <KUI012_EvidenceViewer
        isOpen={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidence(null)}
        evidence={selectedEvidence}
        resourceFolder={resourceFolder}
        showToast={showToast}
      />
    </div>
  );
};
