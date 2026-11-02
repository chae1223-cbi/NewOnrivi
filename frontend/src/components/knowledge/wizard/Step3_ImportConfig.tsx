// ====================================================================
// 📊 [OMD-WIZARD-Step3-0001] Step3_ImportConfig.tsx ➔ KUI-006 지식 등록 옵션 설정
// 🎯 @KICK  : 지식 문서 등록 마법사 3단계로 컬렉션 지정, 기본 우선순위(★1~5), AI 정형 분석 옵션 및 큐 실행 시점 제어
// 🛡️ @GUARD : LDSG v5.0, 빈 컬렉션 안전 가드, 우선순위 1~5 제한
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-006 등록 옵션 설정 화면 신규 구현
// ====================================================================

import React, { useState } from 'react';
import { FolderPlus, Star, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import type { ImportConfig, KnowledgeCollection } from '../../../types/knowledge';

interface Step3ImportConfigProps {
  config: ImportConfig;
  onChangeConfig: (newConfig: ImportConfig) => void;
  collections: KnowledgeCollection[];
  onCreateCollection?: (name: string) => Promise<void>;
  selectedFileCount: number;
}

export const Step3_ImportConfig: React.FC<Step3ImportConfigProps> = ({
  config,
  onChangeConfig,
  collections,
  onCreateCollection,
  selectedFileCount,
}) => {
  const [newColName, setNewColName] = useState('');
  const [isCreatingCol, setIsCreatingCol] = useState(false);

  const handleCreateCollection = async () => {
    if (!newColName.trim() || !onCreateCollection) return;
    await onCreateCollection(newColName.trim());
    setNewColName('');
    setIsCreatingCol(false);
  };

  return (
    <div className="space-y-4 py-2 text-xs">
      {/* 📁 1. 컬렉션(Collection) 선택 */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2">
        <label className="block font-bold text-zinc-800 dark:text-zinc-200">
          Collection (지식 분류)
        </label>
        <p className="text-zinc-500 text-[11px]">
          선택한 문서들을 특정 프로젝트나 도메인 컬렉션으로 묶어 필터링 및 관리할 수 있습니다.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <select
            value={config.collectionId || ''}
            onChange={(e) => onChangeConfig({ ...config, collectionId: e.target.value || undefined })}
            className="flex-1 py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-hidden focus:border-[#1d4ed8]"
          >
            <option value="">(컬렉션 미지정 - 기본 보관함)</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.documentCount || 0}건)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsCreatingCol(!isCreatingCol)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold transition shrink-0"
          >
            + 새 컬렉션
          </button>
        </div>

        {isCreatingCol && (
          <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-150">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="새 컬렉션 이름 입력..."
              className="flex-1 py-1 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
            />
            <button
              type="button"
              onClick={handleCreateCollection}
              className="px-3 py-1 bg-[#1d4ed8] text-white font-bold rounded-md text-xs hover:bg-[#05a847] transition"
            >
              생성
            </button>
          </div>
        )}
      </div>

      {/* ⭐ 2. 기본 우선순위 (Priority: 1~5) */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2">
        <label className="block font-bold text-zinc-800 dark:text-zinc-200">
          기본 우선순위 (검색 랭킹 가중치)
        </label>
        <p className="text-zinc-500 text-[11px]">
          우선순위가 높은 문서는 하이브리드 RAG 검색 시 가중치가 부여되어 답변 생성 시 우선 참조됩니다.
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChangeConfig({ ...config, defaultPriority: star })}
              className="p-1 text-zinc-300 hover:text-amber-400 transition cursor-pointer"
            >
              <Star
                className={`w-5 h-5 ${
                  star <= config.defaultPriority
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-zinc-300 dark:text-zinc-700'
                }`}
              />
            </button>
          ))}
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 ml-2">
            {config.defaultPriority}단계 {config.defaultPriority === 5 ? '(최고)' : config.defaultPriority === 1 ? '(최저)' : '(보통)'}
          </span>
        </div>
      </div>

      {/* 🧠 3. AI 분석 옵션 */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2.5">
        <label className="block font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#1d4ed8]" />
          <span>AI 정형 분석 세부 옵션</span>
        </label>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.options.summary}
              onChange={(e) => onChangeConfig({
                ...config,
                options: { ...config.options, summary: e.target.checked }
              })}
              className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">문서 요약 (Summary)</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.options.keyPoints}
              onChange={(e) => onChangeConfig({
                ...config,
                options: { ...config.options, keyPoints: e.target.checked }
              })}
              className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">핵심 내용 (Key Points)</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.options.searchTerms}
              onChange={(e) => onChangeConfig({
                ...config,
                options: { ...config.options, searchTerms: e.target.checked }
              })}
              className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">검색 키워드 생성</span>
          </label>

          <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={config.options.documentType}
              onChange={(e) => onChangeConfig({
                ...config,
                options: { ...config.options, documentType: e.target.checked }
              })}
              className="w-3.5 h-3.5 rounded-sm text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">문서 유형 분류</span>
          </label>
        </div>
      </div>

      {/* ⏱️ 4. 분석 작업 실행 시점 */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2">
        <label className="block font-bold text-zinc-800 dark:text-zinc-200">
          분석 작업 실행 시점
        </label>
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="startTiming"
              checked={config.startImmediately}
              onChange={() => onChangeConfig({ ...config, startImmediately: true })}
              className="w-4 h-4 text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <div>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">지금 바로 백그라운드 분석 시작 (권장)</span>
              <p className="text-[11px] text-zinc-500">등록 완료 즉시 로컬 큐에 담아 순차적으로 AI 분석을 진행합니다.</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="startTiming"
              checked={!config.startImmediately}
              onChange={() => onChangeConfig({ ...config, startImmediately: false })}
              className="w-4 h-4 text-[#1d4ed8] focus:ring-[#1d4ed8]"
            />
            <div>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">대기열에만 등록하고 나중에 시작</span>
              <p className="text-[11px] text-zinc-500">큐에 적재해두고 필요할 때 관리자 화면에서 일괄 실행합니다.</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
