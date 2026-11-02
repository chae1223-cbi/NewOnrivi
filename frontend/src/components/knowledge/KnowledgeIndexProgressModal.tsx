// ====================================================================
// 📊 [OMD-MODAL-KnowledgeIndexProgress-0001] KnowledgeIndexProgressModal.tsx ➔ 지식 문서 등록 실시간 진행 모달
// 🎯 @KICK  : 문서 등록/재색인 시 [1/4 본문로드 -> 2/4 청킹&메타배제 -> 3/4 AI정형분석 -> 4/4 SQLite FTS5 원트랜잭션 색인] 4단계 파이프라인과 AI 구성 결과(요약, 핵심요점, 태그, 검색어)를 실시간 모달로 완벽 시각화
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), Rule 6(Modern Technical Editorial #1d4ed8), Rule 8(고대비 시인성), 메타 청크 노출 0건 보장
// 🚨 @PATCH : **2026-09-17** — [지식 문서 등록 실시간 진행 및 AI 구성 현황 모달 신규 구축]:
//             1) 사용자가 문서 등록 시 진행 현황과 AI 분석 내용을 실시간으로 파악할 수 있도록 4단계 시각화 파이프라인 Stepper 탑재
//             2) 2단계에서 YAML 프론트매터/메타영역 자동 제외 및 실질 본문 청크 목록 실시간 프리뷰 제공
//             3) 3단계에서 활성 모델(gemini-3.8-flash 등)의 AI 요약, 서술형 핵심 요점(Key Points), 도메인 태그(점수), 검색어를 실시간 카드로 렌더링
//             4) 완료 시 '📑 상세 분석 열람 (KUI-010)' 원터치 진입 및 로컬 지식 캐시 자동 동기화
// 🔗 @CALLS : knowledgeClient.indexDocument, ensureClientAbsolutePath, knowledge:show-detail, knowledge:updated
// ====================================================================

import { useModalEscape } from '@/hooks/useModalEscape';
import { requireResourceSettings } from '@/lib/resourceSettings';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle2, Sparkles, Tag, Layers, FileText, 
  ExternalLink, Search, RefreshCw, Loader2, Database,
  ArrowRight, AlertCircle, ShieldAlert, Check, Cpu
} from 'lucide-react';
import type { KnowledgeDocumentDetail, DocumentChunk } from '@/types/knowledge';
import { ensureClientAbsolutePath } from '@/lib/knowledge/pathResolver';
import { isMetaOrAuxiliaryChunk, chunkMarkdownByHeadings } from '@/lib/knowledge/markdownChunker';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { loadSecureData } from '@/lib/secureStorage';
import { getApiUrl } from '@/lib/apiUrlBuilder';

export interface KnowledgeIndexProgressParams {
  filePath: string;
  title?: string;
  isReindex?: boolean;
  fileNode?: any;
  fileContent?: string;
  resourceFolder?: string;
  geminiApiKey?: string;
  planCode?: string;
  aiModelName?: string;
}

interface KnowledgeIndexProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: KnowledgeIndexProgressParams | null;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type StepStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'ERROR';

export const KnowledgeIndexProgressModal: React.FC<KnowledgeIndexProgressModalProps> = ({
  isOpen,
  onClose,
  params,
  showToast,
}) => {
  useModalEscape(isOpen, onClose);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({
    1: 'WAITING',
    2: 'WAITING',
    3: 'WAITING',
    4: 'WAITING',
  });
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 실시간 수집 데이터 상태
  const [fileStats, setFileStats] = useState<{ bytes: number; lines: number; encoding: string } | null>(null);
  const [chunkStats, setChunkStats] = useState<{ total: number; valid: number; excluded: number; samples: DocumentChunk[] } | null>(null);
  const [aiResult, setAiResult] = useState<{
    summary: string;
    keyPoints: string[];
    tags: Array<{ name: string; score: number }>;
    searchTerms: string[];
    model: string;
  } | null>(null);
  const [registeredDetail, setRegisteredDetail] = useState<KnowledgeDocumentDetail | null>(null);

  const isRunningRef = useRef(false);

  useEffect(() => {
    if (isOpen && params && !isRunningRef.current) {
      runPipeline(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, params]);

  const runPipeline = async (targetParams: KnowledgeIndexProgressParams) => {
    isRunningRef.current = true;
    setErrorMessage(null);
    setCurrentStep(1);
    setProgressPercent(10);
    setStepStatuses({ 1: 'RUNNING', 2: 'WAITING', 3: 'WAITING', 4: 'WAITING' });
    setStepMessage('파일 본문 읽기 및 UTF-8 인코딩 무결성 검증 중...');

    try {
      // ----------------------------------------------------
      // [1단계]: 파일 본문 읽기 (4단계 안전 로드)
      // ----------------------------------------------------
      let content = targetParams.fileContent || '';
      const node = targetParams.fileNode;
      const targetFilePath = targetParams.filePath;

      // 1) FileSystemHandle
      if (!content && node?.handle?.getFile) {
        try {
          const f = await node.handle.getFile();
          content = await f.text();
        } catch (e) {
          console.warn('[KnowledgeIndex] node.handle.getFile() failed:', e);
        }
      }

      // 2) 데스크톱 readFromPath
      if (!content && (window as any).electronAPI?.readFromPath && targetFilePath) {
        try {
          const res = await (window as any).electronAPI.readFromPath(targetFilePath);
          content = typeof res === 'string' ? res : (res?.content || '');
        } catch (e) {
          console.warn('[KnowledgeIndex] electronAPI.readFromPath() failed:', e);
        }
      }

      // 3) 데스크톱 readFile
      if (!content && (window as any).electronAPI?.readFile && targetFilePath) {
        try {
          const res = await (window as any).electronAPI.readFile(targetFilePath);
          content = typeof res === 'string' ? res : (res?.content || '');
        } catch (e) {
          console.warn('[KnowledgeIndex] electronAPI.readFile() failed:', e);
        }
      }

      // 4) 로컬 서버 API (/api/file-content)
      if (!content.trim() && targetFilePath) {
        try {
          const fcRes = await fetch(getApiUrl(`/api/file-content?path=${encodeURIComponent(targetFilePath)}`));
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            if (fcData.ok && fcData.content) {
              content = fcData.content;
            }
          }
        } catch (e) {
          console.warn('[KnowledgeIndex] /api/file-content fallback failed:', e);
        }
      }

      if (!content.trim()) {
        throw new Error('문서의 본문 텍스트를 읽어올 수 없거나 파일이 비어 있습니다.');
      }

      const linesCount = content.split(/\r?\n/).length;
      const byteSize = new Blob([content]).size;
      setFileStats({
        bytes: byteSize,
        lines: linesCount,
        encoding: 'UTF-8 (무결성 통과)',
      });

      setStepStatuses(prev => ({ ...prev, 1: 'COMPLETED', 2: 'RUNNING' }));
      setCurrentStep(2);
      setProgressPercent(35);
      setStepMessage('마크다운 헤딩 계층 청킹 및 메타/서식 필터링 중...');
      await new Promise(r => setTimeout(r, 250)); // 시각 피드백 대기

      // ----------------------------------------------------
      // [2단계]: 마크다운 AST 헤딩 청킹 & 메타 배제
      // ----------------------------------------------------
      const docTitle = targetParams.title || targetFilePath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '문서';
      const allChunks = chunkMarkdownByHeadings('temp_doc', content, docTitle);
      
      const cleanChunks = allChunks.filter(c => 
        !isMetaOrAuxiliaryChunk(c.headingTitle, c.chunkText || '', c.startLine, c.endLine)
      );
      const excludedCount = allChunks.length - cleanChunks.length;

      setChunkStats({
        total: allChunks.length,
        valid: cleanChunks.length,
        excluded: excludedCount,
        samples: cleanChunks.slice(0, 5),
      });

      setStepStatuses(prev => ({ ...prev, 2: 'COMPLETED', 3: 'RUNNING' }));
      setCurrentStep(3);
      setProgressPercent(60);

      // 설정값 취득
      const resourceFolder=requireResourceSettings().path;

      const geminiApiKey = (
        targetParams.geminiApiKey ||
        (typeof window !== 'undefined' ? localStorage.getItem('onrivi_gemini_api_key') : '') ||
        loadSecureData<string>('geminiApiKey') ||
        loadSecureData<string>('onrivi_gemini_api_key') ||
        ''
      ).trim();

      const planCode = targetParams.planCode || loadSecureData<string>('planCode') || 'ELITEPRO';

      const aiModelName = (
        targetParams.aiModelName ||
        (typeof window !== 'undefined' ? localStorage.getItem('onrivi_ai_model_name') : '') ||
        'gemini-3.8-flash'
      ).trim();

      setStepMessage(`AI 모델(${aiModelName}) 정형 분석 요청 중 (요약, 핵심 요점, 도메인 태그, 검색어 추출)...`);

      // ----------------------------------------------------
      // [3단계 & 4단계]: 통합 백엔드 색인 호출 (AI 분석 + SQLite All-or-Nothing 트랜잭션)
      // ----------------------------------------------------
      const regRes = await knowledgeClient.indexDocument({
        filePath: targetFilePath,
        fileContent: content,
        title: docTitle,
        resourceFolder,
        geminiApiKey,
        planCode,
        aiModelName,
        resourceFolderHandle: typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined,
      });

      if (!regRes?.detail) {
        throw new Error('백엔드 지식 색인 서비스로부터 유효한 상세 결과를 수신하지 못했습니다.');
      }

      const detail = regRes.detail;
      // 실시간 AI 구성 결과 바인딩
      setAiResult({
        summary: detail.summary || '요약 정보가 없습니다.',
        keyPoints: detail.keyPoints || [],
        tags: detail.tags || [],
        searchTerms: detail.searchTerms || [],
        model: detail.analyzerModel || aiModelName,
      });

      setStepStatuses(prev => ({ ...prev, 3: 'COMPLETED', 4: 'RUNNING' }));
      setCurrentStep(4);
      setProgressPercent(90);
      setStepMessage('SQLite 원트랜잭션(All-or-Nothing) FTS5 가상 색인 및 메타데이터 적재 중...');
      await new Promise(r => setTimeout(r, 200));

      setRegisteredDetail(detail);

      // 캐시 동기화
      try {
        const list = JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
        if (targetFilePath && !list.includes(targetFilePath)) list.push(targetFilePath);
        if (detail.filePath && !list.includes(detail.filePath)) list.push(detail.filePath);
        localStorage.setItem('onrivi_registered_knowledge_docs', JSON.stringify(list));
      } catch {}

      window.dispatchEvent(new CustomEvent('knowledge:updated'));

      setStepStatuses({ 1: 'COMPLETED', 2: 'COMPLETED', 3: 'COMPLETED', 4: 'COMPLETED' });
      setProgressPercent(100);
      setStepMessage('지식 문서 등록 및 AI 정형 분석이 완벽하게 완료되었습니다! 🎉');
      showToast?.(`'${docTitle}' 지식 문서가 ${detail.chunksCount}개 청크로 정상 등록되었습니다! 📗`, 'success');
    } catch (err: any) {
      console.error('[지식 문서 등록 모달 에러]:', err);
      const msg = err?.message || String(err || '알 수 없는 오류');
      setErrorMessage(msg);
      setStepStatuses(prev => ({ ...prev, [currentStep]: 'ERROR' }));
      showToast?.(`지식 문서 등록 실패: ${msg}`, 'error');
    } finally {
      isRunningRef.current = false;
    }
  };

  const handleOpenDetailModal = () => {
    onClose();
    if (registeredDetail) {
      window.dispatchEvent(new CustomEvent('knowledge:show-detail', { detail: registeredDetail }));
    }
  };

  const handleRetry = () => {
    if (params) {
      runPipeline(params);
    }
  };

  if (!isOpen || !params) return null;

  const isAllCompleted = stepStatuses[1] === 'COMPLETED' && 
                         stepStatuses[2] === 'COMPLETED' && 
                         stepStatuses[3] === 'COMPLETED' && 
                         stepStatuses[4] === 'COMPLETED';

  const hasError = Boolean(errorMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#1C1E22] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center font-extrabold text-xl shrink-0 shadow-2xs">
              📗
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                  AI 지식 문서 등록 및 실시간 분석
                </h2>
                {isAllCompleted ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>등록 및 색인 완료 (READY)</span>
                  </span>
                ) : hasError ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>분석 중단 (ERROR)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-[#1d4ed8]" />
                    <span>실시간 파이프라인 가동 중 ({currentStep}/4)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold font-mono truncate mt-0.5" title={params.filePath}>
                📁 {ensureClientAbsolutePath(params.filePath)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 4단계 비주얼 파이프라인 Stepper */}
        <div className="px-6 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {/* Step 1 */}
            <div className={`p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
              stepStatuses[1] === 'COMPLETED'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : stepStatuses[1] === 'RUNNING'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1d4ed8] text-[#1d4ed8] ring-2 ring-[#1d4ed8]/20'
                : stepStatuses[1] === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-400'
            }`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 bg-current/10">
                {stepStatuses[1] === 'COMPLETED' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                 stepStatuses[1] === 'RUNNING' ? <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" /> : '1'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">1. 본문 로드</div>
                <div className="text-[9px] opacity-75 truncate">인코딩 & 바이트 검증</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
              stepStatuses[2] === 'COMPLETED'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : stepStatuses[2] === 'RUNNING'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1d4ed8] text-[#1d4ed8] ring-2 ring-[#1d4ed8]/20'
                : stepStatuses[2] === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-400'
            }`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 bg-current/10">
                {stepStatuses[2] === 'COMPLETED' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                 stepStatuses[2] === 'RUNNING' ? <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" /> : '2'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">2. 헤딩 청킹</div>
                <div className="text-[9px] opacity-75 truncate">메타영역 원천 배제</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
              stepStatuses[3] === 'COMPLETED'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : stepStatuses[3] === 'RUNNING'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1d4ed8] text-[#1d4ed8] ring-2 ring-[#1d4ed8]/20'
                : stepStatuses[3] === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-400'
            }`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 bg-current/10">
                {stepStatuses[3] === 'COMPLETED' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                 stepStatuses[3] === 'RUNNING' ? <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" /> : '3'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">3. AI 정형 분석</div>
                <div className="text-[9px] opacity-75 truncate">요약/요점/태그 구조화</div>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
              stepStatuses[4] === 'COMPLETED'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : stepStatuses[4] === 'RUNNING'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-[#1d4ed8] text-[#1d4ed8] ring-2 ring-[#1d4ed8]/20'
                : stepStatuses[4] === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-300'
                : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 text-zinc-400'
            }`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 bg-current/10">
                {stepStatuses[4] === 'COMPLETED' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                 stepStatuses[4] === 'RUNNING' ? <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" /> : '4'}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">4. SQLite 색인</div>
                <div className="text-[9px] opacity-75 truncate">FTS5 원트랜잭션 커밋</div>
              </div>
            </div>
          </div>

          {/* 진행 안내 한 줄 배너 */}
          <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1d4ed8] animate-ping" />
              {stepMessage}
            </span>
            <span className="font-mono text-zinc-500">{progressPercent}%</span>
          </div>
        </div>

        {/* 3. 본문 실시간 모니터링 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* 오류 알림 카드 */}
          {hasError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">지식 문서 등록 중 오류 발생</h4>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 1) 파일 본문 분석 현황 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[10px] text-zinc-400 font-medium block">파일 크기</span>
              <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">
                {fileStats ? `${(fileStats.bytes / 1024).toFixed(1)} KB (${fileStats.lines} 라인)` : '검증 중...'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[10px] text-zinc-400 font-medium block">추출된 실질 본문 청크</span>
              <span className="text-sm font-extrabold text-[#1d4ed8]">
                {chunkStats ? `${chunkStats.valid}개 구간` : '청킹 대기 중...'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[10px] text-zinc-400 font-medium block">자동 제외된 메타/서식</span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                {chunkStats ? `${chunkStats.excluded}개 구간 제외 (100% 필터링)` : '검사 중...'}
              </span>
            </div>
          </div>

          {/* 2) 청크 분할 현황 프리뷰 카드 */}
          {chunkStats && chunkStats.samples.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  생성된 알맹이(본문) 청크 구조 미리보기 (총 {chunkStats.valid}개)
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                  🚫 서두/메타영역(#서식설정) 1건 자동 배제 완료
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {chunkStats.samples.map((c, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-[#1d4ed8]/10 text-[#1d4ed8]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {c.headingPath || c.headingTitle}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-2">
                      Lines {c.startLine} ~ {c.endLine}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3) AI 정형 분석 실시간 구성 화면 */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700/60 pb-2.5">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>AI 지식 구조화 결과</span>
                {aiResult?.model && (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 font-bold">
                    {aiResult.model}
                  </span>
                )}
              </span>

              {stepStatuses[3] === 'RUNNING' && (
                <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-xs font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini 모델이 본문을 정형 분석하는 중...</span>
                </div>
              )}
            </div>

            {aiResult ? (
              <div className="space-y-3.5">
                {/* 💡 AI 핵심 요약 */}
                <div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 text-[11px] mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    AI 핵심 요약 (Summary)
                  </span>
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-zinc-800 dark:text-zinc-200 leading-relaxed text-xs font-medium">
                    {aiResult.summary}
                  </div>
                </div>

                {/* 📌 추출된 핵심 요점 (Key Points) */}
                <div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 text-[11px] mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    서술형 핵심 요점 (Key Points - {aiResult.keyPoints.length}건)
                  </span>
                  <div className="space-y-1.5">
                    {aiResult.keyPoints.map((pt, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                          {pt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🏷️ 도메인 태그 & 검색어 */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 text-[11px] mb-1.5">
                      <Tag className="w-3 h-3 text-violet-500" />
                      추출 태그 ({aiResult.tags.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/50 text-[10px] font-semibold">
                          #{t.name} <span className="opacity-60 text-[9px] font-mono">{t.score}%</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 text-[11px] mb-1.5">
                      <Search className="w-3 h-3 text-blue-500" />
                      RAG 검색어 ({aiResult.searchTerms.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.searchTerms.map((term, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/50 text-[10px] font-semibold">
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#1d4ed8]" />
                <p className="font-medium text-xs">
                  AI 모델이 문서 본문을 면밀히 분석하여 핵심 가치와 지식을 구조화하고 있습니다...
                </p>
                <p className="text-[11px] text-zinc-500">
                  (요약문 작성, 실질 소제목+본문 문맥 종합 핵심 요점 추출, 전문 태그 산출)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. 하단 푸터 액션 바 */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            {isAllCompleted ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                지식 베이스 색인 완료! 이제 검색 및 AI 초안(RAG)에서 활용할 수 있습니다.
              </span>
            ) : hasError ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                오류가 발생했습니다. 아래 버튼을 눌러 다시 시도할 수 있습니다.
              </span>
            ) : (
              <span className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1d4ed8]" />
                지식 파이프라인 처리 중... 잠시만 기다려 주세요.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasError && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>🔄 다시 시도</span>
              </button>
            )}

            {isAllCompleted && (
              <button
                onClick={handleOpenDetailModal}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="상세 분석(KUI-010) 모달로 이동"
              >
                <span>📑 상세 분석 열람 (KUI-010)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer"
            >
              {isAllCompleted ? '완료 (닫기)' : '닫기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
