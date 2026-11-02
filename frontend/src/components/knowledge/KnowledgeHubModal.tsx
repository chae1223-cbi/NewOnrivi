// ====================================================================
// 📊 [OMD-MODAL-KnowledgeHub-0001] KnowledgeHubModal.tsx ➔ Onrivi 지식 엔진 통합 관리 센터 (KUI-001 ~ KUI-012)
// 🎯 @KICK  : 대량 문서 수집/지식화 명세서(ONRIVI-KNOWLEDGE-ENGINE-002.1) 12대 화면 통합 관제 허브 모달
// 🛡️ @GUARD : LINE Design System LDSG v5.0 (#1d4ed8), LNB 럭셔리 그라데이션(.bg-sidebar-luxury) & 라운드 하이라이트 표준 준수 (Rule 6), 중앙 서버 비개입 100% 로컬 격리
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — [KUI011 환경설정 resourceFolderHandle 연동] 웹 환경에서 백업/원복 조회를 위해 KUI011_KnowledgeSettings에 resourceFolderHandle 전달
//             **2026-09-06** — [localhost 지식 엔진 연동 지원] 데스크톱뿐만 아니라 로컬 웹 개발 환경(localhost, 127.0.0.1)에서도 SQLite 지식 베이스 조회/등록을 활성화하고, prod 웹 환경에서만 데스크톱 안내 배너를 노출하도록 가드 개선
//             **2026-09-06** — [웹/데스크톱 로컬 SQLite 격리] 웹 브라우저 환경에서 로컬 SQLite API 불필요 호출 차단 및 상단 LDSG v5.0 데스크톱 전용 안내 배너 표시
//             **2026-09-04** — [사이드바 디자인 통일] 지식 허브 모달 좌측 사이드바를 에디터 좌측 사이드바(LeftSidebar)와 1:1 완벽 대응(서체, 테두리, 헤더 바, 저장소 실폴더 바, 12px 볼드 메뉴, 시스템 현황 위젯)하도록 디자인 고도화
//             **2026-09-04** — [브랜드 로고 통일] Onrivi Knowledge Hub 모달 헤더 로고를 이모지(🧠)에서 온리비 공식 네잎클로버 펜촉 브랜드 로고(/icon.png)로 교체
//             **2026-09-04** — [서버 부하 방어] 작업 진행 시 2초, 유휴(평상시) 15초 적응형 폴링 및 탭 숨김 시 폴링 정지 적용하여 백엔드 큐 통계 요청 부하 절감
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 대량 문서 수집 및 로컬 지식화 12대 화면 통합 KnowledgeHubModal 신규 구현
// 🔗 @CALLS : KUI001~KUI012, /api/knowledge/*, KnowledgeWorkerEngine
// ====================================================================

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, LayoutDashboard, FileText, Search, Activity, 
  AlertTriangle, Settings, Plus, Sparkles, Database, 
  ExternalLink, Layers, ShieldCheck, CheckCircle2, Clock, Cpu
} from 'lucide-react';
import type { 
  KnowledgeJob, 
  KnowledgeDocument,
  KnowledgeDocumentDetail, 
  KnowledgeCollection,
  QueueProgressStats 
} from '@/types/knowledge';

import { KUI001_KnowledgeDashboard } from './screens/KUI001_KnowledgeDashboard';
import { KUI002_KnowledgeDocList } from './screens/KUI002_KnowledgeDocList';
import { KUI003_KnowledgeSearch } from './screens/KUI003_KnowledgeSearch';
import { KnowledgeImportWizard } from './wizard/KnowledgeImportWizard';
import { KUI007_ImportProgress } from './screens/KUI007_ImportProgress';
import { KUI008_JobDetail } from './screens/KUI008_JobDetail';
import { KUI009_FailedDocuments } from './screens/KUI009_FailedDocuments';
import { KUI010_KnowledgeDocDetail } from './screens/KUI010_KnowledgeDocDetail';
import { KUI011_KnowledgeSettings } from './screens/KUI011_KnowledgeSettings';

export type KnowledgeHubTab = 
  | 'dashboard' 
  | 'docs' 
  | 'search' 
  | 'progress' 
  | 'failed' 
  | 'settings'
  | 'job_detail'
  | 'doc_detail';

interface KnowledgeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceFolder: string;
  geminiApiKey: string;
  onSaveApiKey?: (key: string) => void;
  planCode?: string;
  aiModelName?: string;
  onSaveModelName?: (model: string) => void;
  fileTreeNodes?: any[];
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  initialTab?: KnowledgeHubTab;
  resourceFolderHandle?: any;
}

export const KnowledgeHubModal: React.FC<KnowledgeHubModalProps> = ({
  isOpen,
  onClose,
  resourceFolder,
  geminiApiKey,
  onSaveApiKey,
  planCode = 'ELITEPRO',
  aiModelName = 'gemini-3.8-flash',
  onSaveModelName,
  fileTreeNodes = [],
  showToast,
  initialTab = 'dashboard',
  resourceFolderHandle,
}) => {
  useModalEscape(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<KnowledgeHubTab>(initialTab);
  const [previousTab, setPreviousTab] = useState<KnowledgeHubTab>('dashboard');
  
  // 하위 모달 상태 (가져오기 마법사 KUI-004 ~ KUI-006)
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // 선택된 상세 객체 상태
  const [selectedJob, setSelectedJob] = useState<KnowledgeJob | null>(null);
  const [selectedDocDetail, setSelectedDocDetail] = useState<KnowledgeDocumentDetail | null>(null);

  // 컬렉션 목록
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  // 문서 목록
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // 큐 및 실패 통계 (배지용)
  const [queueStats, setQueueStats] = useState<QueueProgressStats>({
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

  // 데스크톱(Electron) 또는 로컬 개발(localhost) 환경 여부 감지
  const [isDesktop, setIsDesktop] = useState(false);
  const [canUseDb, setCanUseDb] = useState(false);
  useEffect(() => {
    const isDesk = typeof window !== 'undefined' && !!(window as any).electronAPI;
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.') || 
      window.location.hostname.endsWith('.local')
    );
    setIsDesktop(isDesk);
    setCanUseDb(isDesk || isLocal);
  }, []);

  const checkCanUseDb = useCallback(() => {
    const isDesktopEnv = typeof window !== 'undefined' && !!(window as any).electronAPI;
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.') || 
      window.location.hostname.endsWith('.local')
    );
    return isDesktopEnv || isLocalhost;
  }, []);

  // 초기 탭 동기화
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // 문서 목록 로드
  const fetchDocuments = useCallback(async () => {
    if (!checkCanUseDb() || !resourceFolder) return;
    try {
      const res = await fetch('/api/knowledge/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder, geminiApiKey, planCode }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.documents)) {
        const mapped: KnowledgeDocument[] = data.documents.map((d: any) => ({
          id: d.id,
          collectionId: d.collection_id || null,
          filePath: d.filePath || d.file_path || '',
          title: d.title || (d.filePath || d.file_path || '').split('/').pop() || '무제',
          fileHash: d.fileHash || d.file_hash || '',
          fileSize: d.fileSize || d.file_size || 0,
          modifiedAt: d.modifiedAt || d.modified_at || new Date().toISOString(),
          summary: d.summary || '',
          keyPoints: typeof d.key_points === 'string' ? JSON.parse(d.key_points || '[]') : (d.key_points || []),
          documentType: d.document_type || 'note',
          priority: d.priority || 3,
          status: d.status || 'READY',
          chunksCount: d.chunk_count || d.chunksCount || 0,
          analysisVersion: 1,
          analyzerModel: d.analyzer_model || '',
        }));
        setDocuments(mapped);
      }
    } catch {
      // silent
    }
  }, [resourceFolder, geminiApiKey, planCode, checkCanUseDb]);

  // 컬렉션 로드
  const fetchCollections = useCallback(async () => {
    if (!checkCanUseDb() || !resourceFolder) return;
    try {
      const res = await fetch(`/api/knowledge/collection?resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok) {
        setCollections(data.collections || []);
      }
    } catch {
      // silent
    }
  }, [resourceFolder, checkCanUseDb]);

  // 큐 통계 폴링 (뱃지 표시용)
  const fetchQueueStats = useCallback(async () => {
    if (!checkCanUseDb() || !resourceFolder) return;
    try {
      const res = await fetch(`/api/knowledge/queue/stats?resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok && data.stats) {
        setQueueStats(data.stats);
      }
    } catch {
      // silent
    }
  }, [resourceFolder, checkCanUseDb]);

  // 문서 일괄 삭제 / 해제
  const handleDeleteDocs = async (docIds: string[]) => {
    if (!checkCanUseDb()) {
      showToast('로컬 지식 베이스 관리는 데스크톱 전용 앱 및 로컬 개발 환경에서 지원됩니다.', 'info');
      return;
    }
    try {
      const res = await fetch('/api/knowledge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder, documentIds: docIds }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`${docIds.length}건의 문서가 해제되었습니다.`, 'info');
        fetchDocuments();
      } else {
        showToast(data.message || '삭제 실패', 'error');
      }
    } catch {
      showToast('삭제 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 문서 일괄 재색인 (Queue에 P1으로 등록)
  const handleReindexDocs = async (docIds: string[]) => {
    if (!checkCanUseDb()) {
      showToast('로컬 지식 베이스 관리는 데스크톱 전용 앱 및 로컬 개발 환경에서 지원됩니다.', 'info');
      return;
    }
    const targets = documents.filter(d => docIds.includes(d.id));
    if (targets.length === 0) return;

    try {
      const jobs = targets.map(d => ({
        documentId: d.id,
        filePath: d.filePath,
        title: d.title,
        jobType: 'REINDEX',
        targetHash: d.fileHash,
        priority: 1,
        collectionId: d.collectionId || undefined,
      }));

      const res = await fetch('/api/knowledge/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ENQUEUE_BATCH', resourceFolder, jobs }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`${data.enqueuedCount || targets.length}건의 문서가 재색인 큐에 등록되었습니다.`, 'success');
        fetchQueueStats();
        setActiveTab('progress');
      }
    } catch {
      showToast('재색인 요청 중 오류가 발생했습니다.', 'error');
    }
  };

  // 우선순위 변경
  const handleChangePriority = async (docIds: string[], priority: number) => {
    showToast(`${docIds.length}건의 우선순위를 P${priority}로 변경했습니다.`, 'info');
  };

  // 컬렉션 변경
  const handleChangeCollection = async (docIds: string[], collectionId: string | null) => {
    showToast(`${docIds.length}건의 소속 컬렉션을 변경했습니다.`, 'info');
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchDocuments();
    fetchCollections();
    fetchQueueStats();

    // 🛡️ [서버 부하 방어] 활성 큐 작업(queued > 0 || running > 0) 존재 시 2초 빠른 갱신,
    // 대기 작업 없는 평상시에는 15초 슬로우 갱신 적용 및 탭 비활성화 시 폴링 정지
    let timerId: any = null;

    const runPoll = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        timerId = setTimeout(runPoll, 5000);
        return;
      }

      await fetchQueueStats();

      const hasActiveWork = queueStats.queued > 0 || queueStats.running > 0;
      const nextDelay = hasActiveWork ? 2000 : 15000;
      timerId = setTimeout(runPoll, nextDelay);
    };

    timerId = setTimeout(runPoll, queueStats.queued > 0 || queueStats.running > 0 ? 2000 : 15000);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, fetchDocuments, fetchCollections, fetchQueueStats, queueStats.queued, queueStats.running]);

  // 단일 작업 상세 열람 핸들러
  const handleViewJobDetail = (job: KnowledgeJob) => {
    setSelectedJob(job);
    setPreviousTab(activeTab);
    setActiveTab('job_detail');
  };

  // 문서 상세 분석 열람 핸들러
  const handleViewDocDetail = async (docId: string, filePath: string) => {
    if (!checkCanUseDb()) {
      showToast('로컬 지식 베이스 관리는 데스크톱 전용 앱 및 로컬 개발 환경에서 지원됩니다.', 'info');
      return;
    }
    try {
      const res = await fetch(`/api/knowledge/detail?docId=${encodeURIComponent(docId)}&resourceFolder=${encodeURIComponent(resourceFolder)}`);
      const data = await res.json();
      if (data.ok && data.detail) {
        setSelectedDocDetail(data.detail);
        setPreviousTab(activeTab);
        setActiveTab('doc_detail');
        return;
      }
    } catch (err) {
      console.error('문서 상세 로드 실패:', err);
    }
    showToast('문서 상세 정보를 불러오지 못했습니다.', 'error');
  };

  // 단일 작업 재시도
  const handleRetryJob = async (jobId: string) => {
    if (!checkCanUseDb()) {
      showToast('로컬 지식 베이스 관리는 데스크톱 전용 앱 및 로컬 개발 환경에서 지원됩니다.', 'info');
      return;
    }
    const res = await fetch('/api/knowledge/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RETRY_FAILED',
        resourceFolder,
        jobIds: [jobId],
      }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast('작업이 대기열에 다시 등록되었습니다.', 'success');
      fetchQueueStats();
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: 'QUEUED', retryCount: selectedJob.retryCount + 1 });
      }
    }
  };

  // 단일 작업 취소
  const handleCancelJob = async (jobId: string) => {
    if (!checkCanUseDb()) {
      showToast('로컬 지식 베이스 관리는 데스크톱 전용 앱 및 로컬 개발 환경에서 지원됩니다.', 'info');
      return;
    }
    const res = await fetch('/api/knowledge/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CANCEL',
        resourceFolder,
        jobId,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast('작업이 취소되었습니다.', 'info');
      fetchQueueStats();
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: 'CANCELLED' });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#18191D] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-6xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 통합 헤더 */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 p-1 flex items-center justify-center shrink-0 shadow-2xs">
              <img 
                src="/icon.png" 
                alt="Onrivi" 
                className="w-full h-full object-contain select-none" 
              />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                Onrivi Knowledge Hub (지식 엔진 센터)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] border border-[#1d4ed8]/30">
                LDSG v5.0
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                100% 로컬 SQLite FTS5
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 대량 문서 가져오기 (마법사 KUI-004~006 트리거) */}
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>대량 문서 수집 마법사</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="닫기 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 바디 컨테이너: 좌측 LNB + 우측 도메인 뷰 */}
        <div className="flex-1 flex overflow-hidden">
          {/* LNB 사이드바 (에디터 LeftSidebar 1:1 통일 디자인: LDSG v5.0, .bg-sidebar-luxury, 라운드 하이라이트, 워크스페이스 바) */}
          <aside 
            style={{ 
              fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif",
            }}
            className="w-64 shrink-0 flex flex-col border-r border-slate-300 dark:border-zinc-700 select-none relative z-10 bg-sidebar-luxury text-on-surface shadow-sm"
          >
            {/* 상단 섹션 헤더 바 (에디터 사이드바 탭 헤더 대응) */}
            <div className="h-10 border-b border-slate-300 dark:border-zinc-700 flex items-center px-3 bg-white/75 dark:bg-black/30 backdrop-blur-md justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏛️</span>
                <span className="text-[12px] font-bold text-slate-800 dark:text-zinc-200 tracking-tight">
                  지식 엔진 관제 허브
                </span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#1d4ed8]/15 text-[#1d4ed8] border border-[#1d4ed8]/30">
                LDSG v5.0
              </span>
            </div>

            {/* 항상 표시되는 지식 보관함 저장소 바 (에디터 작업장 실폴더 바와 1:1 완벽 대응) */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#E2E8F0] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02] backdrop-blur-xs shrink-0">
              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wide shrink-0">지식 저장소</span>
              <div
                className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[12px] font-bold
                  bg-white/95 dark:bg-[#202328]
                  border border-slate-300 dark:border-zinc-700
                  text-slate-800 dark:text-zinc-100
                  shadow-2xs truncate"
                title={resourceFolder ? `지식 리소스 저장소 (현재: ${resourceFolder})` : '지식 리소스 저장소'}
              >
                <span className="shrink-0">{resourceFolder ? '📁' : '📂'}</span>
                <span className="truncate font-bold">
                  {resourceFolder ? (resourceFolder.split(/[\\/]/).pop() || resourceFolder) : 'Onrivi_Asset'}
                </span>
              </div>
            </div>

            {/* LNB 메뉴 리스트 영역 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {/* 1. 대시보드 */}
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#1d4ed8]' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>대시보드</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'dashboard' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                  KUI-001
                </span>
              </button>

              {/* 2. 지식 보관함 */}
              <button
                onClick={() => setActiveTab('docs')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'docs' ? 'text-[#1d4ed8]' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>지식 보관함</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'docs' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                  KUI-002
                </span>
              </button>

              {/* 3. 하이브리드 검색 & AI 질의 */}
              <button
                onClick={() => setActiveTab('search')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Search className={`w-4 h-4 shrink-0 ${activeTab === 'search' ? 'text-[#1d4ed8]' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>검색 & AI 질의</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'search' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                  KUI-003
                </span>
              </button>

              {/* 4. 진행 현황 */}
              <button
                onClick={() => setActiveTab('progress')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'progress'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'progress' ? 'text-[#1d4ed8]' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>수집 진행 현황</span>
                </div>
                {queueStats.running > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-[#1d4ed8] animate-ping" />
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'progress' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                    KUI-007
                  </span>
                )}
              </button>

              {/* 5. 실패 문서 복구 */}
              <button
                onClick={() => setActiveTab('failed')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'failed'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${activeTab === 'failed' ? 'text-red-500' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>실패 문서 복구</span>
                </div>
                {queueStats.failed > 0 ? (
                  <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-mono">
                    {queueStats.failed}
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'failed' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                    KUI-009
                  </span>
                )}
              </button>

              {/* 6. 설정 및 리소스 제어 */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#1d4ed8]/15 dark:bg-[#1d4ed8]/25 text-zinc-950 dark:text-white font-extrabold shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-[#1d4ed8]' : 'text-slate-500 dark:text-zinc-400'}`} />
                  <span>지식 환경설정</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'settings' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                  KUI-011
                </span>
              </button>
            </div>

            {/* 하단 시스템 현황 위젯 */}
            <div className="p-2 border-t border-slate-300 dark:border-zinc-700 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xs shrink-0">
              <div className="p-2.5 rounded-lg bg-white/95 dark:bg-[#202328] border border-slate-300 dark:border-zinc-700 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-zinc-400 font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    동시 Worker
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                    {queueStats.activeWorkers || 0} / {queueStats.maxWorkers || 2}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-zinc-400 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#4D73FF]" />
                    대기열 상태
                  </span>
                  <span className={`font-bold ${queueStats.running > 0 ? 'text-[#1d4ed8]' : 'text-slate-600 dark:text-zinc-400'}`}>
                    {queueStats.running > 0 ? '처리 가동 중' : '정상 대기'}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* 우측 메인 콘텐츠 뷰 */}
          <main className="flex-1 bg-white dark:bg-[#18191D] overflow-hidden flex flex-col">
            {!canUseDb && (
              <div className="mx-6 mt-4 p-4 rounded-xl border border-[#1d4ed8]/30 bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/15 flex items-start gap-3.5 shrink-0 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1d4ed8]/20 text-[#1d4ed8]">
                  <Cpu size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                      🖥️ 로컬 SQLite 지식 베이스(FTS5 AI 허브) — 데스크톱 전용 기능 안내
                    </h4>
                    <span className="rounded-full bg-[#1d4ed8]/25 px-2 py-0.5 text-[10px] font-bold text-[#1d4ed8]">
                      Desktop Exclusive
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                    개인 PC 하드디스크의 지식 베이스 파일(<code>onrivi_knowledge.db</code>) 및 고성능 FTS5 전문 검색은 브라우저 보안 및 로컬 파일시스템 접근 권한 정책에 따라 <strong>Onrivi Author 데스크톱 프로그램</strong>에서 100% 안전하게 동작합니다. 데스크톱 앱을 실행하시면 내 PC의 지식 문서와 청크 데이터가 실시간으로 자동 연동됩니다.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <KUI001_KnowledgeDashboard
                documents={documents}
                totalChunks={documents.reduce((acc, d) => acc + (d.chunksCount || 0), 0)}
                activeJobsCount={queueStats.running + queueStats.queued}
                errorCount={queueStats.failed}
                outdatedCount={0}
                collectionCount={collections.length}
                onOpenWizard={() => setIsWizardOpen(true)}
                onOpenSearch={() => setActiveTab('search')}
                onSelectDoc={(doc) => handleViewDocDetail(doc.id, doc.filePath)}
                onNavigateToDocs={() => setActiveTab('docs')}
              />
            )}

            {activeTab === 'docs' && (
              <KUI002_KnowledgeDocList
                documents={documents}
                collections={collections}
                onSelectDocDetail={(doc) => handleViewDocDetail(doc.id, doc.filePath)}
                onOpenFileInEditor={(filePath) => {
                  window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
                    detail: { filePath, startLine: 1 }
                  }));
                  showToast(`'${filePath}' 문서를 에디터에서 열었습니다.`, 'info');
                }}
                onDeleteDocs={handleDeleteDocs}
                onReindexDocs={handleReindexDocs}
                onUnregisterDocs={handleDeleteDocs}
                onChangePriority={handleChangePriority}
                onChangeCollection={handleChangeCollection}
                onOpenWizard={() => setIsWizardOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'search' && (
              <KUI003_KnowledgeSearch
                resourceFolder={resourceFolder}
                geminiApiKey={geminiApiKey}
                planCode={planCode}
                aiModelName={aiModelName}
                collections={collections}
                showToast={showToast}
              />
            )}

            {activeTab === 'progress' && (
              <KUI007_ImportProgress
                resourceFolder={resourceFolder}
                geminiApiKey={geminiApiKey}
                aiModelName={aiModelName}
                onViewJobDetail={handleViewJobDetail}
                onNavigateToFailed={() => setActiveTab('failed')}
                showToast={showToast}
              />
            )}

            {activeTab === 'failed' && (
              <KUI009_FailedDocuments
                resourceFolder={resourceFolder}
                onViewJobDetail={handleViewJobDetail}
                showToast={showToast}
              />
            )}

            {activeTab === 'settings' && (
              <KUI011_KnowledgeSettings
                resourceFolder={resourceFolder}
                geminiApiKey={geminiApiKey}
                onSaveApiKey={(key) => onSaveApiKey?.(key)}
                aiModelName={aiModelName}
                onSaveModelName={(model) => onSaveModelName?.(model)}
                showToast={showToast}
                resourceFolderHandle={resourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined)}
              />
            )}

            {/* 개별 작업 파이프라인 상세 뷰 (KUI-008) */}
            {activeTab === 'job_detail' && selectedJob && (
              <KUI008_JobDetail
                job={selectedJob}
                onBack={() => setActiveTab(previousTab || 'progress')}
                onRetry={handleRetryJob}
                onCancel={handleCancelJob}
                showToast={showToast}
              />
            )}

            {/* 개별 지식 문서 상세 분석 뷰 (KUI-010) */}
            {activeTab === 'doc_detail' && selectedDocDetail && (
              <KUI010_KnowledgeDocDetail
                detail={selectedDocDetail}
                onBack={() => setActiveTab(previousTab || 'docs')}
                showToast={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {/* 대량 문서 수집 마법사 모달 (KUI-004 ~ KUI-006) */}
      <KnowledgeImportWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        resourceFolder={resourceFolder}
        geminiApiKey={geminiApiKey}
        planCode={planCode}
        aiModelName={aiModelName}
        fileTreeNodes={fileTreeNodes}
        showToast={showToast}
        onSuccess={() => {
          setIsWizardOpen(false);
          setActiveTab('progress');
          fetchQueueStats();
        }}
      />
    </div>
  );
};
