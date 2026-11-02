// ====================================================================
// 📊 [OMD-WIZARD-Step2-0001] Step2_ScanResult.tsx ➔ KUI-005 대량 문서 탐색 결과 확인
// 🎯 @KICK  : 로컬 파일 스캔 결과를 신규/변경/기존/미지원으로 나누어 통계 및 세부 파일 선택 제어 제공
// 🛡️ @GUARD : 대량 파일(10,000+)에서도 멈춤 없는 슬라이싱 뷰, 검색 필터, LDSG v5.0
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-005 대량 문서 탐색 결과 화면 신규 구현
// ====================================================================

import React, { useState, useMemo } from 'react';
import { 
  FileText, Search, CheckSquare, Square, Filter, 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert
} from 'lucide-react';
import type { ScanResultSummary, ScannedDocumentItem } from '../../../types/knowledge';

interface Step2ScanResultProps {
  scanSummary: ScanResultSummary;
  onToggleItem: (path: string) => void;
  onToggleCategory: (category: 'NEW' | 'CHANGED' | 'EXISTING', select: boolean) => void;
  onSelectAll: (select: boolean) => void;
}

export const Step2_ScanResult: React.FC<Step2ScanResultProps> = ({
  scanSummary,
  onToggleItem,
  onToggleCategory,
  onSelectAll,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'NEW' | 'CHANGED' | 'EXISTING'>('ALL');

  const selectedCount = useMemo(() => {
    return scanSummary.items.filter(i => i.selected).length;
  }, [scanSummary.items]);

  const filteredItems = useMemo(() => {
    return scanSummary.items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.path.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [scanSummary.items, search, categoryFilter]);

  return (
    <div className="space-y-4 py-2 text-xs">
      {/* 📊 상단 메트릭 요약 바 (KUI-005 규격) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div 
          onClick={() => setCategoryFilter('NEW')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            categoryFilter === 'NEW' 
              ? 'border-[#1d4ed8] bg-[#1d4ed8]/10' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-medium">신규 문서</span>
            <Sparkles className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {scanSummary.newCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#1d4ed8] font-semibold">신규 지식 등록 가능</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('CHANGED')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            categoryFilter === 'CHANGED' 
              ? 'border-amber-500 bg-amber-500/10' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-medium">변경된 문서</span>
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {scanSummary.changedCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-500 font-semibold">내용 수정 감지 (재색인)</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('EXISTING')}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            categoryFilter === 'EXISTING' 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-medium">기존 문서</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {scanSummary.existingCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">내용 동일 (재분석 불필요)</span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 opacity-70">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-medium">지원 안 함</span>
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-lg font-bold text-zinc-600 dark:text-zinc-400 mt-1">
            {scanSummary.unsupportedCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400">비마크다운 / 대용량 제외</span>
        </div>
      </div>

      {/* 🔍 검색 및 범주 빠른 일괄 체크 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={scanSummary.newCount > 0 && scanSummary.items.filter(i => i.category === 'NEW').every(i => i.selected)}
              onChange={(e) => onToggleCategory('NEW', e.target.checked)}
              className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <span>신규 문서</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-amber-600 dark:text-amber-400 ml-2">
            <input
              type="checkbox"
              checked={scanSummary.changedCount > 0 && scanSummary.items.filter(i => i.category === 'CHANGED').every(i => i.selected)}
              onChange={(e) => onToggleCategory('CHANGED', e.target.checked)}
              className="w-3.5 h-3.5 rounded-sm text-amber-500 focus:ring-amber-500"
            />
            <span>변경된 문서</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-500 dark:text-zinc-400 ml-2">
            <input
              type="checkbox"
              checked={scanSummary.existingCount > 0 && scanSummary.items.filter(i => i.category === 'EXISTING').every(i => i.selected)}
              onChange={(e) => onToggleCategory('EXISTING', e.target.checked)}
              className="w-3.5 h-3.5 rounded-sm text-blue-500 focus:ring-blue-500"
            />
            <span>기존 문서 재분석</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectAll(true)}
            className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium transition"
          >
            전체 선택
          </button>
          <button
            onClick={() => onSelectAll(false)}
            className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium transition"
          >
            전체 해제
          </button>
        </div>
      </div>

      {/* 📋 세부 파일 그리드 리스트 */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/30">
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="파일명 또는 경로 검색..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-[#1d4ed8]"
            />
          </div>
          <span className="text-[11px] text-zinc-500 font-semibold">
            선택: <b className="text-[#1d4ed8]">{selectedCount}</b> / {scanSummary.items.length}개
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              검색 조건에 일치하는 파일이 없습니다.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isUnsupported = item.category === 'UNSUPPORTED';

              return (
                <div
                  key={item.path}
                  onClick={() => !isUnsupported && onToggleItem(item.path)}
                  className={`flex items-center justify-between px-3.5 py-2 transition cursor-pointer select-none ${
                    isUnsupported 
                      ? 'opacity-40 cursor-not-allowed bg-zinc-50/20 dark:bg-zinc-900/10' 
                      : item.selected
                      ? 'bg-[#1d4ed8]/5 dark:bg-[#1d4ed8]/10 hover:bg-[#1d4ed8]/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate max-w-md">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      disabled={isUnsupported}
                      onChange={() => onToggleItem(item.path)}
                      className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
                    />
                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate block">
                      {item.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {Math.round((item.size / 1024) * 10) / 10} KB
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${
                        item.category === 'NEW'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : item.category === 'CHANGED'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                          : item.category === 'EXISTING'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {item.category === 'NEW' ? '신규' : item.category === 'CHANGED' ? '변경' : item.category === 'EXISTING' ? '기존' : '제외'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
