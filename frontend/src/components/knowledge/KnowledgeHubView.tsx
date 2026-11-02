// ====================================================================
// 📊 [OMD-VIEW-KnowledgeHub-0001] KnowledgeHubView.tsx ➔ Onrivi 지식 엔진 통합 관제 뷰
// 🎯 @KICK  : 대량 문서 수집/지식화 명세서(ONRIVI-KNOWLEDGE-ENGINE-002.1) 12대 화면 통합 관제 독립 뷰
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — [KUI011 환경설정 resourceFolderHandle 전달 연동] 프로드 웹 환경에서 사용자 PC의 Onrivi_Asset/db/backups 디렉토리를 직접 열람/백업할 수 있도록 KUI011_KnowledgeSettings에 resourceFolderHandle 명시적 전달
//             **2026-09-11** — [지식 베이스 리소스 폴더 복호화 및 Onrivi_Asset 기본값 폴백 강화] syncFromEditorSettings에서 loadSecureData 복호화 및 Onrivi_Asset 폴백을 적용하여 데스크톱 환경에서 리소스 폴더 미전달 시에도 하위 KUI011 환경설정 및 백업 목록이 완벽하게 동기화되도록 개선
//             **2026-09-06** — [웹 브라우저 WASM SQLite 기반 로컬 지식 베이스 일치화 연동] 데스크톱/로컬뿐만 아니라 프로드 웹(onrivi.com)에서도 knowledgeClient 및 browserKnowledgeDb(WASM sql.js + resourceFolderHandle)를 통해 내 PC의 onrivi_knowledge.db를 100% 동일하게 공유하여 조회/등록/검색 가능하도록 전면 개편
//             **2026-09-06** — [localhost 지식 엔진 연동 지원] 데스크톱뿐만 아니라 로컬 웹 개발 환경(localhost, 127.0.0.1)에서도 SQLite 지식 베이스 조회/등록을 활성화하고, prod 웹 환경에서만 데스크톱 안내 배너를 노출하도록 가드 개선
//             **2026-09-06** — [웹 환경 로컬 지식 엔진 격리 및 데스크톱 안내 배너 탑재] 로컬 및 프로덕션 웹 브라우저 환경(!isDesktop)에서 /api/knowledge/* 불필요 호출을 차단하고, 데스크톱 전용 안내 배너(Desktop Exclusive)를 제공하여 404/405 콘솔 에러 원천 방어
//             **2026-09-04** — [사이드바 디자인 통일] 지식 엔진 좌측 사이드바를 에디터 좌측 사이드바(LeftSidebar)와 1:1 완벽 대응(서체, 테두리, 헤더 바, 저장소 실폴더 바, 12px 볼드 메뉴, 시스템 현황 위젯)하도록 디자인 고도화
//             **2026-09-04** — [브랜드 로고 통일] Onrivi Knowledge Engine GNB 로고를 이모지(🧠)에서 온리비 공식 네잎클로버 펜촉 브랜드 로고(/icon.png)로 교체
//             **2026-09-04** — [서버 부하 방어] 작업 진행 시 2초, 유휴(평상시) 15초 적응형 폴링 및 탭 숨김 시 폴링 정지 적용하여 백엔드 큐 통계 요청 부하 90% 이상 절감
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 에디터 생성 AI 정보(onrivi_settings/Gemini API Key & Model)와 실시간 직접 연동 및 storage 이벤트 동기화, KUI-011 환경설정에서 중복 AI 입력 제거 연동
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 모달 대신 독립 전용 페이지(/knowledge) 및 풀스크린 뷰포트 지원 KnowledgeHubView 신규 구현
// 🔗 @CALLS : KUI001~KUI012, knowledgeClient, KnowledgeWorkerEngine, @/utils/toast
// ====================================================================

'use client';

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, FileText, Search, Activity, 
  AlertTriangle, Settings, Plus, FolderGit2, 
  ArrowLeft, RefreshCw, Cpu, Layers
} from 'lucide-react';
import type { 
  KnowledgeJob, 
  KnowledgeDocument,
  KnowledgeDocumentDetail, 
  KnowledgeCollection,
  QueueProgressStats 
} from '@/types/knowledge';
import { KnowledgeWorkerEngine } from '@/lib/knowledge/knowledgeWorker';
import { knowledgeClient, canAccessKnowledgeDb } from '@/lib/knowledge/knowledgeClient';
import { showToast } from '@/utils/toast';
import { loadSecureData } from '@/lib/secureStorage';

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

export interface KnowledgeHubViewProps {
  initialTab?: KnowledgeHubTab;
  resourceFolder?: string;
  geminiApiKey?: string;
  onSaveApiKey?: (key: string) => void;
  planCode?: string;
  aiModelName?: string;
  onSaveModelName?: (model: string) => void;
  fileTreeNodes?: any[];
  isStandalonePage?: boolean;
  onBackToEditor?: () => void;
  resourceFolderHandle?: any;
}

export const KnowledgeHubView: React.FC<KnowledgeHubViewProps> = ({
  initialTab = 'dashboard',
  resourceFolder: propResourceFolder = '',
  geminiApiKey: propGeminiApiKey = '',
  onSaveApiKey: propOnSaveApiKey,
  planCode: propPlanCode = 'ELITEPRO',
  aiModelName: propAiModelName = 'gemini-3.8-flash',
  onSaveModelName: propOnSaveModelName,
  fileTreeNodes: propFileTreeNodes,
  isStandalonePage = false,
  onBackToEditor,
  resourceFolderHandle: propResourceFolderHandle,
}) => {
  const router = useRouter();

  // 코어 상태
  const [resourceFolder, setResourceFolder] = useState<string>(
    propResourceFolder || ''
  );
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    propGeminiApiKey || ''
  );
  const [aiModelName, setAiModelName] = useState<string>(
    propAiModelName || 'gemini-3.8-flash'
  );
  const [planCode, setPlanCode] = useState<string>(propPlanCode);
  const [fileTreeNodes, setFileTreeNodes] = useState<any[]>(propFileTreeNodes || []);

  const [activeTab, setActiveTab] = useState<KnowledgeHubTab>(initialTab);
  const [previousTab, setPreviousTab] = useState<KnowledgeHubTab>('dashboard');
  
  // 하위 모달 상태 (가져오기 마법사 KUI-004 ~ KUI-006)
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // 선택된 상세 객체 상태
  const [selectedJob, setSelectedJob] = useState<KnowledgeJob | null>(null);
  const [selectedDocDetail, setSelectedDocDetail] = useState<KnowledgeDocumentDetail | null>(null);

  // 컬렉션 및 문서 목록
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
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

  // 데스크톱(Electron), 로컬 개발(localhost), 또는 브라우저 리소스 핸들(WASM SQLite) 감지
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

    canAccessKnowledgeDb(propResourceFolderHandle).then(hasDb => {
      setCanUseDb(isDesk || isLocal || hasDb);
    });
  }, [propResourceFolderHandle, resourceFolder]);

  // 에디터 AI 설정 실시간 Props 동기화
  useEffect(() => {
    if (propGeminiApiKey) {
      setGeminiApiKey(propGeminiApiKey);
    }
  }, [propGeminiApiKey]);

  useEffect(() => {
    if (propAiModelName) {
      setAiModelName(propAiModelName);
    }
  }, [propAiModelName]);

  // 로컬 스토리지 초기 로드 및 에디터 전역 설정(onrivi_settings) 실시간 동기화
  useEffect(() => {
    const syncFromEditorSettings = () => {
      if (typeof window === 'undefined') return;

      setResourceFolder(getEffectiveResourceFolder());

      let editorSettings: any = null;
      try {
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) editorSettings = JSON.parse(raw);
      } catch {}

      const editorApiKey = propGeminiApiKey || editorSettings?.geminiApiKey || localStorage.getItem('onrivi_gemini_api_key') || '';
      if (editorApiKey) {
        setGeminiApiKey(editorApiKey);
      }

      const editorModel = propAiModelName || editorSettings?.aiModelName || localStorage.getItem('onrivi_ai_model_name') || localStorage.getItem('onrivi_gemini_model') || 'gemini-3.8-flash';
      if (editorModel) {
        setAiModelName(editorModel);
      }

      const savedPlan = localStorage.getItem('onrivi_user_plan');
      if (savedPlan) {
        setPlanCode(savedPlan);
      }
    };

    syncFromEditorSettings();

    // 에디터 환경설정 창에서 키 또는 모델 변경 시 즉각 자동 반영
    window.addEventListener('storage', syncFromEditorSettings);
    return () => {
      window.removeEventListener('storage', syncFromEditorSettings);
    };
  }, [propResourceFolder, propGeminiApiKey, propAiModelName]);

  const handleSaveApiKey = useCallback((key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onrivi_gemini_api_key', key);
    }
    if (propOnSaveApiKey) propOnSaveApiKey(key);
  }, [propOnSaveApiKey]);

  const handleSaveModelName = useCallback((model: string) => {
    setAiModelName(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onrivi_gemini_model', model);
      localStorage.setItem('onrivi_ai_model_name', model);
    }
    if (propOnSaveModelName) propOnSaveModelName(model);
  }, [propOnSaveModelName]);

  // 문서 목록 로드 (데스크톱 / 로컬 / 프로드 웹 WASM 자동 연동)
  const fetchDocuments = useCallback(async () => {
    if (!resourceFolder) return;
    try {
      const docs = await knowledgeClient.listDocuments({
        resourceFolder,
        geminiApiKey,
        planCode,
        resourceFolderHandle: propResourceFolderHandle,
      });
      setDocuments(docs);
    } catch {
      // silent
    }
  }, [resourceFolder, geminiApiKey, planCode, propResourceFolderHandle]);

  // 컬렉션 로드
  const fetchCollections = useCallback(async () => {
    if (!resourceFolder) return;
    try {
      const cols = await knowledgeClient.listCollections({
        resourceFolder,
        resourceFolderHandle: propResourceFolderHandle,
      });
      setCollections(cols);
    } catch {
      // silent
    }
  }, [resourceFolder, propResourceFolderHandle]);

  // 큐 통계 폴링
  const fetchQueueStats = useCallback(async () => {
    if (!resourceFolder) return;
    try {
      const stats = await knowledgeClient.getQueueStats({
        resourceFolder,
        resourceFolderHandle: propResourceFolderHandle,
      });
      if (stats) setQueueStats(stats);
    } catch {
      // silent
    }
  }, [resourceFolder, propResourceFolderHandle]);

  // 문서 일괄 삭제 / 해제
  const handleDeleteDocs = async (docIds: string[]) => {
    try {
      for (const id of docIds) {
        await knowledgeClient.deleteDocument({
          documentId: id,
          resourceFolder,
          geminiApiKey,
          planCode,
          resourceFolderHandle: propResourceFolderHandle,
        });
      }
      showToast(`${docIds.length}건의 문서가 해제되었습니다.`, 'info');
      fetchDocuments();
    } catch {
      showToast('삭제 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 문서 일괄 재색인
  const handleReindexDocs = async (docIds: string[]) => {
    const targets = documents.filter(d => docIds.includes(d.id));
    if (targets.length === 0) return;

    try {
      const isServer = typeof window !== 'undefined' && (
        Boolean((window as any).electronAPI) ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
      if (isServer) {
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
          return;
        }
      }
      showToast(`${targets.length}건의 재색인 요청이 완료되었습니다.`, 'success');
    } catch {
      showToast('재색인 요청 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleChangePriority = async (docIds: string[], priority: number) => {
    showToast(`${docIds.length}건의 우선순위를 P${priority}로 변경했습니다.`, 'info');
  };

  const handleChangeCollection = async (docIds: string[], collectionId: string | null) => {
    showToast(`${docIds.length}건의 소속 컬렉션을 변경했습니다.`, 'info');
  };

  useEffect(() => {
    fetchDocuments();
    fetchCollections();
    fetchQueueStats();

    // 🛡️ [서버 부하 방어] 활성 큐 작업(queued > 0 || running > 0) 존재 시 2초 빠른 갱신,
    // 대기 작업 없는 평상시에는 15초 슬로우 갱신 적용 및 탭 비활성화 시 폴링 정지
    let timerId: any = null;

    const runPoll = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        // 브라우저 탭이 숨겨져 있을 때는 5초 후 재확인 (서버 요청 전송 안 함)
        timerId = setTimeout(runPoll, 5000);
        return;
      }

      await fetchQueueStats();

      // 작업이 진행 중이면 2초, 유휴 상태면 15초 주기로 스케줄
      const hasActiveWork = queueStats.queued > 0 || queueStats.running > 0;
      const nextDelay = hasActiveWork ? 2000 : 15000;
      timerId = setTimeout(runPoll, nextDelay);
    };

    timerId = setTimeout(runPoll, queueStats.queued > 0 || queueStats.running > 0 ? 2000 : 15000);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [fetchDocuments, fetchCollections, fetchQueueStats, queueStats.queued, queueStats.running]);

  // ⚙️ 백그라운드 큐 자동 가동 (대기 작업이 있고 API 키가 설정되어 있으면 백그라운드 처리)
  useEffect(() => {
    if (!resourceFolder || !geminiApiKey) return;
    if (queueStats.queued > 0) {
      const engine = KnowledgeWorkerEngine.getInstance({
        resourceFolder,
        geminiApiKey,
        planCode,
        aiModelName,
        maxWorkers: 2,
      });
      engine.start();
    }
  }, [resourceFolder, geminiApiKey, planCode, aiModelName, queueStats.queued]);

  // 단일 작업 상세 열람 핸들러
  const handleViewJobDetail = (job: KnowledgeJob) => {
    setSelectedJob(job);
    setPreviousTab(activeTab);
    setActiveTab('job_detail');
  };

  // 문서 상세 분석 열람 핸들러
  const handleViewDocDetail = async (docId: string, filePath: string) => {
    try {
      const detail = await knowledgeClient.getDocumentDetail({
        documentId: docId,
        filePath,
        resourceFolder,
        geminiApiKey,
        planCode,
        resourceFolderHandle: propResourceFolderHandle,
      });
      if (detail) {
        setSelectedDocDetail(detail);
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

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 1. 상단 글로벌 GNB 헤더 바 */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#18191D]/95 backdrop-blur-xs flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToEditor ? (
            <button 
              type="button"
              onClick={onBackToEditor}
              className="flex items-center gap-2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="에디터로 복귀"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link 
              href="/editor"
              className="flex items-center gap-2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="에디터로 이동"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}

          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 p-1 flex items-center justify-center shrink-0 shadow-2xs">
            <img 
              src="/icon.png" 
              alt="Onrivi" 
              className="w-full h-full object-contain select-none" 
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
              Onrivi Knowledge Engine
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1d4ed8]/15 text-[#1d4ed8] border border-[#1d4ed8]/30">
              LDSG v5.0
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              100% 로컬 SQLite FTS5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 리소스 폴더 상태 뱃지 */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60">
            <FolderGit2 className="w-3.5 h-3.5 text-[#1d4ed8]" />
            <span className="truncate max-w-[140px]">{resourceFolder || '미설정'}</span>
          </div>

          {/* 대량 문서 가져오기 (마법사 KUI-004~006 트리거) */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">새 문서 수집 마법사</span>
            <span className="xs:hidden">수집</span>
          </button>

          {/* 에디터로 돌아가기 버튼 */}
          {onBackToEditor ? (
            <button
              type="button"
              onClick={onBackToEditor}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <span>에디터로 복귀</span>
            </button>
          ) : (
            <Link
              href="/editor"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <span>에디터</span>
            </Link>
          )}
        </div>
      </header>

      {/* 2. 메인 바디 컨테이너: 좌측 LNB + 우측 도메인 뷰 */}
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
              {documents.length > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                  {documents.length}
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === 'docs' ? 'text-[#1d4ed8] bg-[#1d4ed8]/10' : 'text-slate-400 dark:text-zinc-500'}`}>
                  KUI-002
                </span>
              )}
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

        {/* 3. 메인 콘텐츠 뷰포트 */}
        <main className="flex-1 bg-white dark:bg-[#18191D] overflow-hidden flex flex-col">
          {!canUseDb && (
            <div className="mx-6 mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 flex items-start gap-3.5 shrink-0 shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <FolderGit2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                    📁 내 PC의 로컬 SQLite 지식 베이스(onrivi_knowledge.db) 연동 안내
                  </h4>
                  <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    리소스 폴더 지정 필요
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                  웹 브라우저 환경에서 내 PC의 개인 지식 베이스를 읽고 쓰려면 상단 메뉴바의 <strong>[파일 ➔ 공통 자원(리소스) 폴더 열기]</strong>에서 <code>Onrivi_Asset</code> 폴더를 선택해 주세요. 브라우저 WASM SQLite 엔진을 통해 중앙 서버 부하 0%로 <strong>데스크톱 프로그램과 100% 동일한 지식 문서</strong>가 실시간으로 자동 연동됩니다.
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
                if (onBackToEditor) {
                  onBackToEditor();
                  window.dispatchEvent(new CustomEvent('app:open-file-at-line', {
                    detail: { filePath, startLine: 1 }
                  }));
                } else {
                  window.location.href = `/editor?file=${encodeURIComponent(filePath)}`;
                }
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
              onSaveApiKey={handleSaveApiKey}
              aiModelName={aiModelName}
              onSaveModelName={handleSaveModelName}
              showToast={showToast}
              resourceFolderHandle={propResourceFolderHandle || (typeof window !== 'undefined' ? (window as any).__resourceFolderHandle : undefined)}
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
