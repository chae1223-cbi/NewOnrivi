// ====================================================================
// 📊 [OMD-CORE-knowledgeAutoSync-0001] knowledgeAutoSync.ts ➔ Knowledge Auto-Sync on Save
// 🎯 @KICK  : 에디터 문서 저장(Ctrl+S/autoSave) 시 등록된 지식 문서의 변경을 감지하여 로컬 큐에 비동기 재색인(REINDEX, Priority 1) 자동 등록
// 🛡️ @GUARD : 비활성화 옵션 가드, 미등록 문서 O(1) 패스, 세션 해시 캐시 기반 중복 억제, 에디터 타이핑 논블로킹, 5초 토스트 디바운스
// 🚨 @PATCH : **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 보장] 상대경로/절대경로 양방향 접미사 매칭 지원 및 자동 재색인 큐 적재 시 ensureClientAbsolutePath로 절대경로 승격
//             **2026-09-06** — [AES 암호문 리소스 폴더 방어] localStorage.getItem 직접 참조 시 암호문(U2FsdGVkX1...)이 유입되어 잘못된 SQLite 경로를 타던 현상을 loadSecureData 및 Onrivi_Asset 정규화로 방어
//             **2026-09-04** — 자동 재색인 토스트 알림 아이콘을 남성 학사(📗)로 교체
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 에디터 실시간 저장 시 100% 로컬 비동기 자동 재색인 엔진 최초 구현
// 🔗 @CALLS : crypto-js, ./knowledgeWorker, @/utils/toast
// ====================================================================

import { getResourceSettings } from '@/lib/resourceSettings';
import CryptoJS from 'crypto-js';
import { KnowledgeWorkerEngine } from './knowledgeWorker';
import { showToast } from '@/utils/toast';
import { loadSecureData } from '../secureStorage';
import { ensureClientAbsolutePath } from './pathResolver';

export interface AutoSyncParams {
  filePath: string;
  fileContent: string;
  resourceFolder?: string | null;
  geminiApiKey?: string | null;
  aiModelName?: string | null;
  planCode?: string | null;
}

export interface AutoSyncResult {
  enqueued: boolean;
  reason?: string;
  jobId?: string;
  targetHash?: string;
}

// 중복 토스트 알림 방지를 위한 디바운스 타임스탬프 (5초)
let lastToastTimestamp = 0;

/**
 * 경로 정규화 (슬래시/역슬래시 통일, 소문자 변환, 트림)
 */
export function normalizeDocumentPath(p: string): string {
  return (p || '').replace(/\\/g, '/').toLowerCase().trim();
}

/**
 * 에디터 문서가 지식 보관함에 사전 등록된 문서인지 엄격하게 판별합니다.
 * (등록되지 않은 일반 마크다운 문서는 재색인 대상에서 100% 원천 배제)
 */
export function isKnowledgeDocumentRegistered(filePath: string, registeredList: string[]): boolean {
  if (!filePath || !Array.isArray(registeredList) || registeredList.length === 0) {
    return false;
  }
  const normalizedTarget = normalizeDocumentPath(filePath);

  return registeredList.some(p => {
    const np = normalizeDocumentPath(p);
    // 1. 파일 전체 경로가 정확히 일치하는 경우 (Windows 역슬래시 및 POSIX 슬래시 정규화)
    if (np === normalizedTarget) return true;

    // 2. 상대 경로 ↔ 절대 경로 간 접미사 일치 (예: 'd:/path/체험하기/doc.md' 와 '체험하기/doc.md')
    if (np.endsWith('/' + normalizedTarget) || normalizedTarget.endsWith('/' + np)) {
      return true;
    }

    // 3. 브라우저 VFS 가상 파일 시스템 등에서 단일 파일명으로만 관리되는 경우에 한하여 매칭
    if (!np.includes('/') && !normalizedTarget.includes('/') && np === normalizedTarget) {
      return true;
    }

    return false;
  });
}

/**
 * 에디터 저장 완료 시 호출되는 자동 동기화 단일 진입점
 */
export async function triggerKnowledgeAutoSyncOnSave(params: AutoSyncParams): Promise<AutoSyncResult> {
  if (typeof window === 'undefined') {
    return { enqueued: false, reason: 'SSR_ENVIRONMENT' };
  }

  const { filePath, fileContent } = params;
  if (!filePath || typeof fileContent !== 'string') {
    return { enqueued: false, reason: 'INVALID_INPUT' };
  }

  // 1. 자동 동기화 사용자 설정 확인 (기본값: true)
  const isEnabled = localStorage.getItem('onrivi_knowledge_auto_sync_save') !== 'false';
  if (!isEnabled) {
    return { enqueued: false, reason: 'AUTO_SYNC_DISABLED' };
  }

  // 2. 지식 보관함 등록 문서 목록 조회
  const registeredDocsRaw = localStorage.getItem('onrivi_registered_knowledge_docs');
  if (!registeredDocsRaw) {
    return { enqueued: false, reason: 'NO_REGISTERED_DOCS' };
  }

  let registeredList: string[] = [];
  try {
    registeredList = JSON.parse(registeredDocsRaw);
    if (!Array.isArray(registeredList) || registeredList.length === 0) {
      return { enqueued: false, reason: 'NO_REGISTERED_DOCS' };
    }
  } catch {
    return { enqueued: false, reason: 'REGISTERED_DOCS_PARSE_ERROR' };
  }

  if (!isKnowledgeDocumentRegistered(filePath, registeredList)) {
    return { enqueued: false, reason: 'NOT_A_KNOWLEDGE_DOC' };
  }

  // 3. 파일 내용 SHA-256 해시 계산
  const targetHash = CryptoJS.SHA256(fileContent).toString(CryptoJS.enc.Hex);

  // 4. 클라이언트 세션 캐시 확인 (내용 불변 시 로컬에서 0ms 즉시 무시)
  const normalizedTarget = normalizeDocumentPath(filePath);
  const lastSyncHashKey = `onrivi_knowledge_last_sync_${normalizedTarget}`;
  const lastSyncHash = sessionStorage.getItem(lastSyncHashKey);
  if (lastSyncHash === targetHash) {
    return { enqueued: false, reason: 'CONTENT_UNMODIFIED', targetHash };
  }

  // 5. 환경설정 값 로드
  const resource=getResourceSettings();
  if(!resource || resource.kind==='drive')return {enqueued:false,reason:'RESOURCE_FOLDER_NOT_SET',targetHash};
  const resourceFolder=resource.path;
  const geminiApiKey = params.geminiApiKey || localStorage.getItem('onrivi_gemini_api_key') || '';
  const aiModelName = params.aiModelName || localStorage.getItem('onrivi_ai_model_name') || 'gemini-3.8-flash';
  const planCode = params.planCode || 'ELITEPRO';

  const docTitle = filePath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '문서';

  try {
    // 6. 로컬 SQLite 큐에 REINDEX 작업 등록 (Priority 1: 에디터 저장 실시간 최우선 처리)
    const effectivePath = ensureClientAbsolutePath(filePath, resourceFolder);
    const res = await fetch('/api/knowledge/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ENQUEUE_BATCH',
        resourceFolder,
        items: [
          {
            filePath: effectivePath,
            title: docTitle,
            targetHash,
            priority: 1,
            jobType: 'REINDEX',
          }
        ]
      })
    });

    const data = await res.json();

    if (data.ok && data.enqueued > 0) {
      // 새로운 해시 세션 캐시에 보관
      sessionStorage.setItem(lastSyncHashKey, targetHash);

      // 7. 로컬 클라이언트 WorkerEngine 자동 기동 (API 키가 등록되어 있는 경우)
      if (geminiApiKey) {
        const engine = KnowledgeWorkerEngine.getInstance({
          resourceFolder,
          geminiApiKey,
          planCode,
          aiModelName,
          concurrency: 2,
        });
        engine.start();
      }

      // 8. 전역 이벤트 브로드캐스트
      window.dispatchEvent(new CustomEvent('app:knowledge-auto-synced', {
        detail: { filePath, targetHash, jobType: 'REINDEX' }
      }));

      // 9. 5초 디바운스 토스트 알림 (에디터 타이핑 방해 금지)
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const now = Date.now();
        if (now - lastToastTimestamp > 5000) {
          lastToastTimestamp = now;
          try {
            showToast(`📗 [지식 베이스] "${docTitle}" 변경 사항이 백그라운드 재색인 큐에 등록되었습니다.`, 'info');
          } catch {}
        }
      }

      return { enqueued: true, targetHash };
    } else {
      // 로컬 SQLite 레벨에서 중복 억제(Duplicate Suppression) 되었거나 이미 대기 중인 경우
      return { enqueued: false, reason: 'SUPPRESSED_OR_DUPLICATE', targetHash };
    }
  } catch (err: any) {
    console.error('[triggerKnowledgeAutoSyncOnSave Error]', err);
    return { enqueued: false, reason: err?.message || 'LOCAL_QUEUE_ERROR' };
  }
}
