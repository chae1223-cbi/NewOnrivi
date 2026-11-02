// ====================================================================
// 📊 [OMD-KUI-Dashboard-0001] KUI001_KnowledgeDashboard.tsx ➔ KUI-001 Knowledge Dashboard
// 🎯 @KICK  : 지식 문서 총계, 청크 수, 분석 중/오류/Outdated 통계 카드 및 최근 등록/분석 내역과 퀵 액션 제공
// 🛡️ @GUARD : LINE Design System LDSG v5.0 (#1d4ed8), 실시간 메트릭 자동 갱신
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — [대시보드 최근 등록 문서 직관성 강화] 최근 등록 문서 노출 개수를 최대 10건으로 확대하고, 헤더에 (N건 / 전체 M건) 표기 및 [지식 보관함 전체보기 →] 바로가기 링크를 연동하여 대시보드 요약과 보관함 간 건수 혼선을 완벽 해소
//             **2026-09-04** — [Rule 8 고대비 시인성] 최근 등록 문서 파일 경로(doc.filePath) 및 텍스트를 흐릿한 text-zinc-400에서 고대비 볼드 text-zinc-700 dark:text-zinc-300 font-bold font-mono로 전면 보강하여 시인성 확보
//             **2026-09-04** — 최근 등록 지식문서 항목 아이콘을 남성 학사(📗)로 교체
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-001 Knowledge Dashboard 화면 신규 구현
// ====================================================================

import React from 'react';
import { 
  FileText, Layers, RefreshCw, AlertCircle, Clock, 
  FolderTree, Plus, Search, ExternalLink, Sparkles 
} from 'lucide-react';
import type { KnowledgeDocument } from '@/types/knowledge';

interface KUI001KnowledgeDashboardProps {
  documents: KnowledgeDocument[];
  totalChunks: number;
  activeJobsCount: number;
  errorCount: number;
  outdatedCount: number;
  collectionCount: number;
  onOpenWizard: () => void;
  onOpenSearch: () => void;
  onSelectDoc: (doc: KnowledgeDocument) => void;
  onNavigateToDocs?: () => void;
}

export const KUI001_KnowledgeDashboard: React.FC<KUI001KnowledgeDashboardProps> = ({
  documents,
  totalChunks,
  activeJobsCount,
  errorCount,
  outdatedCount,
  collectionCount,
  onOpenWizard,
  onOpenSearch,
  onSelectDoc,
  onNavigateToDocs,
}) => {
  // 최근 등록 문서는 최대 10건까지 넉넉하게 노출하여 대시보드와 보관함 간 직관성 보장
  const recentDocs = documents.slice(0, 10);

  return (
    <div className="space-y-6 text-xs">
      {/* 📊 1. 핵심 메트릭 지표 카드 (KUI-001 규격) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">지식 문서</span>
            <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
            {documents.length.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">등록 완료 문서</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">총 Chunk</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
            {totalChunks.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">분할 헤딩 청크</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">분석 중 (큐)</span>
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${activeJobsCount > 0 ? 'animate-spin' : ''}`} />
          </div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {activeJobsCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">대기 및 처리 중</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">오류 문서</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className={`text-xl font-extrabold mt-1 ${errorCount > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
            {errorCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">재시도 필요</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">Outdated</span>
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className={`text-xl font-extrabold mt-1 ${outdatedCount > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
            {outdatedCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">파일 내용 변경됨</span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-semibold text-[11px]">Collection</span>
            <FolderTree className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
            {collectionCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">분류 컬렉션 수</span>
        </div>
      </div>

      {/* 🚀 2. 주요 퀵 액션 배너 */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-linear-to-r from-emerald-500/10 via-[#1d4ed8]/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              ONRIVI 로컬 지식 엔진 (Local Knowledge Base)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1d4ed8] text-white">
              v002.1 Local
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-xs">
            중앙 서버의 개입 없이 사용자 PC 내 SQLite FTS5 및 외부 LLM 다이렉트 통신으로 안전하게 구동됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenWizard}
            className="px-4 py-2 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ 지식 문서 등록</span>
          </button>
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl transition flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-zinc-400" />
            <span>지식 검색 및 질문</span>
          </button>
        </div>
      </div>

      {/* 📋 3. 최근 등록 문서 목록 */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/40">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs">
              최근 등록 문서 ({recentDocs.length}건{documents.length > recentDocs.length ? ` / 전체 ${documents.length}건` : ''})
            </span>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              클릭 시 상세 분석 정보를 확인합니다
            </span>
          </div>
          {onNavigateToDocs && documents.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToDocs}
              className="text-[11px] font-bold text-[#1d4ed8] hover:text-[#05b34c] hover:underline flex items-center gap-1 transition cursor-pointer"
            >
              지식 보관함 전체보기 ({documents.length}건) →
            </button>
          )}
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {recentDocs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-medium">
              아직 등록된 지식 문서가 없습니다. [+ 지식 문서 등록] 버튼을 눌러보세요.
            </div>
          ) : (
            recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc)}
                className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="text-[#1d4ed8] text-base shrink-0">📗</span>
                  <div className="truncate">
                    <span className="font-extrabold text-zinc-950 dark:text-white block truncate text-xs sm:text-sm">
                      {doc.title}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 truncate block mt-0.5">
                      📁 {doc.filePath}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      doc.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : doc.status === 'ERROR'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}
                  >
                    ● {doc.status}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-bold text-[11px]">
                    ★ {doc.priority || 3}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
