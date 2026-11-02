// ====================================================================
// 📊 [OMD-WIZARD-ImportWizard-0001] KnowledgeImportWizard.tsx ➔ KUI-004 ~ KUI-006 대량 지식 수집 위저드
// 🎯 @KICK  : 3단계(대상 선택 -> 로컬 파일 탐색 및 해시 분류 -> 컬렉션/우선순위 설정) 대량 문서 수집 마법사
// 🛡️ @GUARD : LINE Design System LDSG v5.0 (#1d4ed8), AI 비개입 로컬 선행 검증, 대량 큐 일괄 적재
// 🚨 @PATCH : **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 보장] 위저드 큐 일괄 적재(handleFinalSubmit) 시 ensureClientAbsolutePath를 적용하여 100% 완전한 절대경로(D:/...)로 큐 등록
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-05** — ESLint react-hooks/exhaustive-deps 경고 해결: fetchCollections를 useCallback으로 메모이제이션하고 useEffect 의존성 배열에 등록
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-004~KUI-006 대량 문서 수집 마법사 통합 모달 구현
// 🔗 @CALLS : ./Step1_TargetSelect, ./Step2_ScanResult, ./Step3_ImportConfig, /api/knowledge/queue, /api/knowledge/collection
// ====================================================================

import { requireResourceSettings } from '@/lib/resourceSettings';
import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Step1_TargetSelect, TargetSelectionMode } from './Step1_TargetSelect';
import { Step2_ScanResult } from './Step2_ScanResult';
import { Step3_ImportConfig } from './Step3_ImportConfig';
import { classifyScannedDocuments, flattenFileTreeNodes, RawScanTarget } from '@/lib/knowledge/documentScanner';
import { KnowledgeWorkerEngine } from '@/lib/knowledge/knowledgeWorker';
import { pickResourceTextFile } from '@/lib/gdrive/ResourceFilePicker';
import { ensureClientAbsolutePath } from '@/lib/knowledge/pathResolver';
import type { ScanResultSummary, ImportConfig, KnowledgeCollection } from '@/types/knowledge';

interface KnowledgeImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  resourceFolder: string;
  geminiApiKey: string;
  planCode?: string;
  aiModelName?: string;
  fileTreeNodes?: any[];
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onSuccess?: () => void;
}

export const KnowledgeImportWizard: React.FC<KnowledgeImportWizardProps> = ({
  isOpen,
  onClose,
  resourceFolder,
  geminiApiKey,
  planCode = 'ELITEPRO',
  aiModelName = 'gemini-3.8-flash',
  fileTreeNodes = [],
  showToast,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetMode, setTargetMode] = useState<TargetSelectionMode>('WORKSPACE');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 스캔 결과 상태
  const [scanSummary, setScanSummary] = useState<ScanResultSummary>({
    totalScanned: 0,
    newCount: 0,
    changedCount: 0,
    existingCount: 0,
    unsupportedCount: 0,
    items: []
  });

  // 컬렉션 목록
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);

  // 3단계 설정 상태
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    collectionId: undefined,
    defaultPriority: 3,
    options: {
      summary: true,
      keyPoints: true,
      searchTerms: true,
      documentType: true,
    },
    startImmediately: true,
  });

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge/collection?resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok && data.collections) {
        setCollections(data.collections);
      }
    } catch {}
  }, [resourceFolder]);

  // 초기화 및 컬렉션 로드
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      fetchCollections();
    }
  }, [isOpen, fetchCollections]);

  const handleCreateCollection = async (name: string) => {
    try {
      const res = await fetch('/api/knowledge/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, resourceFolder })
      });
      const data = await res.json();
      if (data.ok && data.collection) {
        setCollections(prev => [...prev, data.collection]);
        setImportConfig(prev => ({ ...prev, collectionId: data.collection.id }));
        showToast(`'${name}' 컬렉션이 생성되었습니다.`, 'success');
      }
    } catch {
      showToast('컬렉션 생성에 실패했습니다.', 'error');
    }
  };

  // 1단계 -> 2단계 이동 시 로컬 스캔 수행
  const handleProceedToStep2 = async () => {
    setIsScanning(true);
    try {
      requireResourceSettings();
      let rawTargets: RawScanTarget[] = [];

      if (targetMode === 'WORKSPACE') {
        rawTargets = flattenFileTreeNodes(fileTreeNodes);
      } else if (targetMode === 'FILES') {
        const api=(window as any).electronAPI;
        if (!api?.saveFile || !api?.createFolder) throw new Error('지식 자료 등록은 데스크탑에서 사용할 수 있습니다.');
        if (!/^(?:[A-Za-z]:[\\/]|\\\\)/.test(resourceFolder)) throw new Error('지식 DB용 로컬 리소스 폴더를 먼저 지정해 주세요. 드라이브 자료는 이 폴더에 보관한 뒤 등록됩니다.');
        const file=await pickResourceTextFile('.md,.markdown');
        if (!file) return;
        await api.createFolder(resourceFolder,'knowledge-import');
        const safeName=file.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');
        const path=resourceFolder.replace(/[\\/]$/,'')+'\\knowledge-import\\'+(file.id ? file.id+'_' : Date.now()+'_')+safeName;
        const result=await api.saveFile(path,file.content);
        if (!result || result.success===false) throw new Error('지식 자료 파일을 로컬에 보관하지 못했습니다.');
        rawTargets=[{name:safeName,path,content:file.content,size:new Blob([file.content]).size}];
      } else if (targetMode === 'FOLDER') {
        // 데스크탑 또는 브라우저 파일 피커 지원
        if ((window as any).electronAPI?.selectFolder && targetMode === 'FOLDER') {
          const folderRes = await (window as any).electronAPI.selectFolder();
          if (!folderRes || !folderRes.files) {
            setIsScanning(false);
            return;
          }
          rawTargets = folderRes.files;
        } else {
          // 폴백: 현재 탐색기 전체 노드 활용
          rawTargets = flattenFileTreeNodes(fileTreeNodes);
        }
      }

      // 기존 등록 문서 목록 조회 (대조용)
      const listRes = await fetch('/api/knowledge/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder })
      });
      const listData = await listRes.json();
      const existingDocs = listData.ok ? (listData.documents || []) : [];

      // 순수 로컬 고속 분류
      const summary = classifyScannedDocuments(rawTargets, existingDocs);
      setScanSummary(summary);
      setStep(2);
    } catch (err: any) {
      showToast(`파일 탐색 중 오류 발생: ${err?.message || '알 수 없음'}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // 항목 선택 토글
  const handleToggleItem = (path: string) => {
    setScanSummary(prev => ({
      ...prev,
      items: prev.items.map(i => i.path === path ? { ...i, selected: !i.selected } : i)
    }));
  };

  // 범주별 일괄 토글
  const handleToggleCategory = (category: 'NEW' | 'CHANGED' | 'EXISTING', select: boolean) => {
    setScanSummary(prev => ({
      ...prev,
      items: prev.items.map(i => i.category === category ? { ...i, selected: select } : i)
    }));
  };

  // 전체 선택/해제
  const handleSelectAll = (select: boolean) => {
    setScanSummary(prev => ({
      ...prev,
      items: prev.items.map(i => i.category !== 'UNSUPPORTED' ? { ...i, selected: select } : i)
    }));
  };

  // 3단계 완료: SQLite 큐에 일괄 적재 및 워커 트리거
  const handleFinalSubmit = async () => {
    const selectedFiles = scanSummary.items.filter(i => i.selected && i.category !== 'UNSUPPORTED');
    if (selectedFiles.length === 0) {
      showToast('등록할 파일이 선택되지 않았습니다.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      requireResourceSettings();
      const itemsToEnqueue = selectedFiles.map(f => ({
        documentId: f.existingDocId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filePath: ensureClientAbsolutePath(f.path, resourceFolder),
        title: f.name.replace(/\.md$/i, ''),
        targetHash: f.hash,
        priority: importConfig.defaultPriority,
        jobType: f.category === 'CHANGED' ? 'REINDEX' : 'INDEX'
      }));

      // 큐에 일괄 등록 (Duplicate Job Suppression 자동 작동)
      const res = await fetch('/api/knowledge/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ENQUEUE_BATCH',
          items: itemsToEnqueue,
          resourceFolder
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || '큐 등록에 실패했습니다.');
      }

      showToast(
        `총 ${data.enqueued || selectedFiles.length}개 문서가 지식 큐에 등록되었습니다! ${data.suppressed ? `(중복 ${data.suppressed}건 제외)` : ''}`,
        'success'
      );

      // 워커 엔진 즉시 가동 (설정된 경우)
      if (importConfig.startImmediately) {
        const engine = KnowledgeWorkerEngine.getInstance({
          resourceFolder,
          geminiApiKey,
          planCode,
          aiModelName
        });
        engine.start();
      }

      window.dispatchEvent(new CustomEvent('knowledge:updated'));
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(`등록 실패: ${err?.message || '알 수 없는 오류'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = scanSummary.items.filter(i => i.selected && i.category !== 'UNSUPPORTED').length;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1E2024] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="text-[#1d4ed8] text-lg">📚</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  지식 문서 대량 등록 마법사
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8]">
                  Step {step} / 3
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {step === 1 && 'KUI-004: 지식으로 수집할 대상 선택'}
                {step === 2 && 'KUI-005: 로컬 탐색 결과 및 분류 확인'}
                {step === 3 && 'KUI-006: 컬렉션, 우선순위 및 AI 분석 옵션 설정'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 단계별 뷰 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <Step1_TargetSelect
              selectionMode={targetMode}
              onSelectMode={setTargetMode}
              totalWorkspaceFiles={fileTreeNodes.length}
            />
          )}

          {step === 2 && (
            <Step2_ScanResult
              scanSummary={scanSummary}
              onToggleItem={handleToggleItem}
              onToggleCategory={handleToggleCategory}
              onSelectAll={handleSelectAll}
            />
          )}

          {step === 3 && (
            <Step3_ImportConfig
              config={importConfig}
              onChangeConfig={setImportConfig}
              collections={collections}
              onCreateCollection={handleCreateCollection}
              selectedFileCount={selectedCount}
            />
          )}
        </div>

        {/* 푸터 네비게이션 버튼 바 */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={isScanning || isSubmitting}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
            >
              취소
            </button>

            {step === 1 && (
              <button
                onClick={handleProceedToStep2}
                disabled={isScanning}
                className="px-5 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] disabled:opacity-50 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>로컬 탐색 중...</span>
                  </>
                ) : (
                  <>
                    <span>탐색 시작</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={selectedCount === 0}
                className="px-5 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] disabled:opacity-50 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <span>설정으로 이동 ({selectedCount}개 선택)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting || selectedCount === 0}
                className="px-5 py-1.5 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#05a847] disabled:opacity-50 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>큐 적재 중...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>등록 완료 ({selectedCount}개 파일)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
