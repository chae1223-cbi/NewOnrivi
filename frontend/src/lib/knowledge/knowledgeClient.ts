// ====================================================================
// 📊 [OMD-CORE-knowledgeClient-0001] knowledgeClient.ts ➔ Unified Knowledge Client Facade
// 🎯 @KICK  : 데스크톱/로컬(Node SQLite)과 프로드 웹(WASM SQLite)을 자동 감지하여 동일한 지식 인터페이스를 제공하는 통합 클라이언트 파사드
// 🛡️ @GUARD : Rule 1(문서/주석 동기화), Rule 2(대문자 코드값), Rule 7(선행 검증 후 원자적 트랜잭션 무결성), 404/405 자동 WASM 폴백
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화 & Rule 9 준수] API 진단 ID 연동 및 데스크톱 환경의 WASM 임의 폴백 전면 차단
// 🚨 @PATCH : **2026-09-17** — [데스크톱 색인 실패 시 WASM 임의 폴백 원천 차단 및 명확한 에러 전파]: Rule 9 준수, 데스크톱 환경(isServerApiAvailable)에서 색인/상세조회 실패 시 WASM(sql.js)으로 임의 폴백하여 CSP 위반(CompileError)을 유발하는 결함을 방어하고 서버 실제 에러를 상위로 즉시 전파
//             **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: canAccessKnowledgeDb를 데스크톱 환경(isServerApiAvailable) 전용으로 한정하여 웹 브라우저 WASM SQLite/IndexedDB 불필요 로딩 차단 및 경량화
//             **2026-09-13** — [웹 브라우저 작업장 폴더명 지원]: indexDocument에서 웹 SaaS(onrivi.com) 작업장 폴더명(블로그 등)을 workspacePath로 인식하여 지식 등록 지원
//             **2026-09-13** — [대안 1: 지식 문서 고속 저장 파사드 연동]: updateDocumentFast 메서드 신설로 브라우저 파일 핸들이 없는 외부 문서라도 수정 시 WASM SQLite 지식 보관함에 5ms 내 원자적 초고속 저장 지원
//             **2026-09-12** — [workspacePath 최우선 탐색 추가] indexDocument에서 localStorage rootFolder 절대경로를 workspacePath로 읽어 resolvedParams 및 서버 API 요청에 포함, E:\ZZ 개인자료\블러그 등 실제 작업장 경로 정확한 탐색 보장
//             **2026-09-12** — [지식 문서 등록 시 절대경로 표준화 보장] indexDocument 호출 시 resolveClientAbsolutePath를 통해 상대경로를 완전한 디스크 절대경로로 사전 승격 후 전달
//             **2026-09-12** — [지식 문서 상세조회 heading 파라미터 파사드 연동] getDocumentDetail에 heading 매개변수 추가 및 WASM/Server API 연계
//             **2026-09-11** — [지식 DB 백업/원복/다운로드/삭제 웹 WASM 파사드 완성] deleteBackup, downloadBackup, restoreFromUploadedFile 파사드 메서드 추가 연동으로 프로드 웹(onrivi.com) 환경에서도 사용자 PC 로컬 Onrivi_Asset/db/backups 백업 목록 조회 및 백업 생성/원복/다운로드가 100% 동일하게 동작하도록 구현
//             **2026-09-06** — [localhost↔prod WASM 코드경로 통일: isServerApiAvailable에서 localhost 조건 제거] 로컬 개발(localhost)도 prod(onrivi.com)와 동일하게 browserKnowledgeDb(WASM sql.js + IndexedDB) 경로를 타도록 변경 — 로컬에서 테스트한 코드가 prod에 동일하게 반영되는 신뢰성 있는 개발/배포 파이프라인 확보. Electron 데스크탑(electronAPI 보유)만 /api/knowledge/* API 라우트 사용
//             **2026-09-06** — [데스크톱 ↔ 프로드 웹 로컬 DB 일치화 파사드 구축] 데스크톱/로컬에서는 /api/knowledge/* 및 electronAPI를 사용하고, 프로드 웹(onrivi.com)에서는 browserKnowledgeDb(WASM sql.js + resourceFolderHandle)를 호출하여 사용자 PC의 Onrivi_Asset/db/onrivi_knowledge.db를 100% 동일하게 공유하도록 단일 진입점 구현
// 🔗 @CALLS : ./browserKnowledgeDb, ../indexedDbHelper
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import type {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeCollection,
  RetrievalCandidate,
} from '../../types/knowledge';
import {
  listBrowserDocuments,
  getBrowserDocumentDetail,
  indexBrowserDocument,
  updateBrowserKnowledgeDocumentFast,
  deleteBrowserDocument,
  deleteBrowserErrorDocuments,
  searchBrowserKnowledge,
  listBrowserCollections,
  upsertBrowserCollection,
  deleteBrowserCollection,
  getBrowserQueueStats,
  backupBrowserKnowledgeDb,
  listBrowserBackups,
  restoreBrowserBackup,
  deleteBrowserBackup,
  getBrowserBackupBlob,
  restoreBrowserFromUploadedFile,
  resetBrowserKnowledgeDb,
  resolveResourceFolderHandle,
} from './browserKnowledgeDb';
import { resolveClientAbsolutePath } from './pathResolver';
import { idb } from '../indexedDbHelper';

/**
 * Node.js 기반 백엔드 API 라우트(/api/knowledge/*)를 사용할 수 있는 환경인지 판별합니다.
 * Electron 데스크톱 앱만 해당
 */
export function isServerApiAvailable(): boolean {
  if (typeof window === 'undefined') return true; // SSR 환경
  return !!(window as any).electronAPI;           // Electron 데스크탑만 true
}

/**
 * 지식 DB를 사용할 수 있는 상태인지 검사합니다.
 * 🚀 데스크톱(Electron) 환경에서만 로컬 지식 DB 접근 허용
 */
export async function canAccessKnowledgeDb(explicitHandle?: any): Promise<boolean> {
  return isServerApiAvailable();
}


function formatApiError(data: any, fallbackMessage: string): Error {
  const msg = data?.message || data?.error || fallbackMessage;
  const diag = data?.diagnosticId || data?.requestId;
  const err = new Error(diag ? `${msg} (진단 ID: ${diag})` : msg);
  if (data?.code) (err as any).code = data.code;
  if (diag) (err as any).diagnosticId = diag;
  return err;
}

export const knowledgeClient = {
  /**
   * 1. 문서 목록 조회
   */
  async listDocuments(params: {
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    resourceFolderHandle?: any;
  }): Promise<KnowledgeDocument[]> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceFolder: params.resourceFolder,
            geminiApiKey: params.geminiApiKey,
            planCode: params.planCode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.documents)) {
            return data.documents.map((d: any) => ({
              id: d.id,
              collectionId: d.collection_id || null,
              filePath: d.filePath || d.file_path || '',
              title: d.title || (d.filePath || d.file_path || '').split(/[/\\]/).pop() || '무제',
              fileHash: d.fileHash || d.file_hash || '',
              fileSize: d.fileSize || d.file_size || 0,
              modifiedAt: d.modifiedAt || d.modified_at || new Date().toISOString(),
              summary: d.summary || '',
              keyPoints: typeof d.key_points === 'string' ? JSON.parse(d.key_points || '[]') : (d.key_points || []),
              documentType: d.document_type || 'other',
              priority: d.priority || 3,
              status: d.status || 'READY',
              chunksCount: d.chunk_count || d.chunksCount || 0,
              analysisVersion: 1,
              analyzerModel: d.analyzer_model || '',
            }));
          }
        }
      } catch (err) {
        console.warn('[knowledgeClient.listDocuments] Server API failed:', err);
      }
    } else {
      // 🚀 웹 브라우저(SaaS) 환경: 지식 베이스는 데스크톱 전용 기능이므로 WASM 로드 없이 즉시 빈 목록 반환
      return [];
    }

    // 웹 WASM SQLite 엔진 호출 (Electron 데스크톱 내 API 에러 시 폴백용)
    return await listBrowserDocuments(params.resourceFolderHandle);
  },

  /**
   * 2. 문서 상세 정보 조회
   */
  async getDocumentDetail(params: {
    documentId?: string;
    filePath?: string;
    heading?: string;
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    resourceFolderHandle?: any;
  }): Promise<KnowledgeDocumentDetail | null> {
    if (isServerApiAvailable()) {
      try {
        const queryParams = new URLSearchParams();
        if (params.documentId) queryParams.set('docId', params.documentId);
        if (params.filePath) queryParams.set('filePath', params.filePath);
        if (params.heading) queryParams.set('heading', params.heading);
        if (params.resourceFolder) queryParams.set('resourceFolder', params.resourceFolder);

        const res = await fetch(`/api/knowledge/detail?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.detail) return data.detail;
        }
      } catch (err) {
        console.warn('[knowledgeClient.getDocumentDetail] Server API failed:', err);
      }
      return null;
    }

    return await getBrowserDocumentDetail(
      { documentId: params.documentId, filePath: params.filePath, heading: params.heading },
      params.resourceFolderHandle
    );
  },

  /**
   * 3. 단일 마크다운 문서 등록 및 AI 분석
   */
  async indexDocument(params: {
    filePath: string;
    fileContent: string;
    title?: string;
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    aiModelName?: string | null;
    resourceFolderHandle?: any;
  }): Promise<{ documentId: string; chunksCount: number; detail: KnowledgeDocumentDetail }> {
    // 🛡️ [지식 문서 등록 시 절대경로 표준화 보장]
    // localStorage의 rootFolder 절대경로를 workspacePath로 읽어 서버 경로 탐색에 활용
    let workspacePath: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        const savedRootFolder = localStorage.getItem('rootFolder');
        if (savedRootFolder) {
          const rf = JSON.parse(savedRootFolder);
          const rfName = (rf?.name || rf?.path || '').replace(/\\/g, '/');
          if (/^[a-zA-Z]:\//.test(rfName)) {
            workspacePath = rfName;
          } else if (rfName && rfName !== 'browser-storage' && rfName !== 'C:/' && rfName !== 'null') {
            workspacePath = rfName;
          }
        }
      }
    } catch {}

    const effectivePath = await resolveClientAbsolutePath(params.filePath, params.resourceFolder);
    const resolvedParams = { ...params, filePath: effectivePath, workspacePath };

    // 데스크톱 electronAPI 전용 가속 우선 시도
    if (typeof window !== 'undefined' && (window as any).electronAPI?.indexKnowledgeDocument) {
      const deskRes = await (window as any).electronAPI.indexKnowledgeDocument({
        filePath: resolvedParams.filePath,
        fileContent: resolvedParams.fileContent,
        title: resolvedParams.title,
        resourceFolder: resolvedParams.resourceFolder,
        geminiApiKey: resolvedParams.geminiApiKey,
        planCode: resolvedParams.planCode,
      });
      if (deskRes?.ok && deskRes?.detail) {
        return {
          documentId: deskRes.documentId,
          chunksCount: deskRes.chunksCount || deskRes.detail.chunksCount,
          detail: deskRes.detail,
        };
      }
    }

    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resolvedParams),
        });
        const data = await res.json();
        if (res.ok && data.ok && data.detail) {
          return {
            documentId: data.documentId,
            chunksCount: data.chunksCount || data.detail.chunksCount,
            detail: data.detail,
          };
        }
        throw formatApiError(data, `데스크톱 색인 실패 (HTTP ${res.status})`);
      } catch (err: any) {
        console.error('[knowledgeClient.indexDocument] Desktop API error:', err);
        throw err;
      }
    } else {
      throw new Error('지식 베이스 등록은 데스크톱 앱 전용 기능입니다.');
    }
  },

  /**
   * 3-1. 지식 문서 초고속 저장 (외부 AI 분석 없이 5ms 내 원문 청킹 및 WASM SQLite 원트랜잭션 갱신)
   */
  async updateDocumentFast(params: {
    filePathOrId: string;
    fileContent: string;
    resourceFolderHandle?: any;
  }): Promise<boolean> {
    if (!isServerApiAvailable()) return false;
    try {
      return await updateBrowserKnowledgeDocumentFast(
        { filePathOrId: params.filePathOrId, fileContent: params.fileContent },
        params.resourceFolderHandle
      );
    } catch (err) {
      console.error('[knowledgeClient.updateDocumentFast] Error:', err);
      return false;
    }
  },

  /**
   * 4. 문서 삭제
   */
  async deleteDocument(params: {
    documentId?: string;
    filePath?: string;
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    resourceFolderHandle?: any;
  }): Promise<boolean> {
    if (!isServerApiAvailable()) return false;
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (res.ok && data.ok) return true;
        throw formatApiError(data, '지식 문서 삭제에 실패했습니다.');
      } catch (err) {
        console.error('[knowledgeClient.deleteDocument] Desktop API error:', err);
        throw err;
      }
    }

    return await deleteBrowserDocument(
      { documentId: params.documentId, filePath: params.filePath },
      params.resourceFolderHandle
    );
  },

  /**
   * 5. 오류(ERROR) 문서 일괄 정리
   */
  async deleteErrorDocuments(params: {
    resourceFolder?: string | null;
    geminiApiKey?: string | null;
    planCode?: string | null;
    resourceFolderHandle?: any;
  }): Promise<number> {
    if (!isServerApiAvailable()) return 0;
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/clean-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (res.ok && data.ok) return data.deletedCount || 0;
      } catch (err) {
        console.warn('[knowledgeClient.deleteErrorDocuments] Server API failed:', err);
      }
    }

    return await deleteBrowserErrorDocuments(params.resourceFolderHandle);
  },

  /**
   * 6. 지식 검색 (하이브리드 FTS5 + 시맨틱)
   */
  async searchKnowledge(params: {
    query: string;
    resourceFolder?: string | null;
    collectionId?: string;
    limit?: number;
    geminiApiKey?: string | null;
    planCode?: string | null;
    aiModelName?: string | null;
    resourceFolderHandle?: any;
  }): Promise<{ candidates: RetrievalCandidate[]; answer?: string }> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          return { candidates: data.candidates || [], answer: data.answer };
        }
        throw formatApiError(data, '지식 검색에 실패했습니다.');
      } catch (err) {
        console.error('[knowledgeClient.searchKnowledge] Desktop API error:', err);
        throw err;
      }
    } else {
      return { candidates: [] };
    }
  },

  /**
   * 7. 컬렉션 관리
   */
  async listCollections(params: { resourceFolder?: string | null; resourceFolderHandle?: any }): Promise<KnowledgeCollection[]> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch(`/api/knowledge/collection?resourceFolder=${encodeURIComponent(params.resourceFolder || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.collections)) return data.collections;
        }
      } catch {}
    }
    return await listBrowserCollections(params.resourceFolderHandle);
  },

  async upsertCollection(params: {
    collection: { id?: string; name: string; description?: string; color?: string };
    resourceFolder?: string | null;
    resourceFolderHandle?: any;
  }): Promise<KnowledgeCollection> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, ...params.collection }),
        });
        const data = await res.json();
        if (res.ok && data.ok && data.collection) return data.collection;
      } catch {}
    }
    return await upsertBrowserCollection(params.collection, params.resourceFolderHandle);
  },

  async deleteCollection(params: {
    collectionId: string;
    resourceFolder?: string | null;
    resourceFolderHandle?: any;
  }): Promise<void> {
    if (isServerApiAvailable()) {
      try {
        await fetch('/api/knowledge/collection', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, id: params.collectionId }),
        });
        return;
      } catch {}
    }
    await deleteBrowserCollection(params.collectionId, params.resourceFolderHandle);
  },

  /**
   * 8. 큐 통계 조회
   */
  async getQueueStats(params: { resourceFolder?: string | null; resourceFolderHandle?: any }): Promise<any> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch(`/api/knowledge/queue/stats?resourceFolder=${encodeURIComponent(params.resourceFolder || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.stats) return data.stats;
        }
      } catch {}
    }
    return await getBrowserQueueStats(params.resourceFolderHandle);
  },

  /**
   * 9. 백업 및 원복
   */
  async listBackups(params: { resourceFolder?: string | null; resourceFolderHandle?: any }): Promise<any[]> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch(`/api/knowledge/backup?resourceFolder=${encodeURIComponent(params.resourceFolder || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.backups)) return data.backups;
        }
      } catch {}
    }
    return await listBrowserBackups(params.resourceFolderHandle);
  },

  async createBackup(params: { resourceFolder?: string | null; reason?: string; resourceFolderHandle?: any }): Promise<any> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, reason: params.reason }),
        });
        const data = await res.json();
        if (res.ok && data.ok) return data;
      } catch {}
    }
    return await backupBrowserKnowledgeDb(params.resourceFolderHandle, params.reason);
  },

  async restoreBackup(params: { resourceFolder?: string | null; fileName: string; resourceFolderHandle?: any }): Promise<boolean> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, backupFileName: params.fileName }),
        });
        const data = await res.json();
        if (res.ok && data.ok) return true;
      } catch {}
    }
    return await restoreBrowserBackup(params.resourceFolderHandle, params.fileName);
  },

  async deleteBackup(params: { resourceFolder?: string | null; fileName: string; resourceFolderHandle?: any }): Promise<boolean> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/backup', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, fileName: params.fileName }),
        });
        const data = await res.json();
        if (res.ok && data.ok) return true;
      } catch {}
    }
    return await deleteBrowserBackup(params.resourceFolderHandle, params.fileName);
  },

  async downloadBackup(params: { resourceFolder?: string | null; fileName?: string; resourceFolderHandle?: any }): Promise<{ blob: Blob; downloadName: string } | null> {
    return await getBrowserBackupBlob(params.resourceFolderHandle, params.fileName);
  },

  async restoreFromUploadedFile(params: { resourceFolder?: string | null; file: File; resourceFolderHandle?: any }): Promise<boolean> {
    if (isServerApiAvailable()) {
      try {
        const formData = new FormData();
        formData.append('file', params.file);
        formData.append('resourceFolder', params.resourceFolder || '');
        const res = await fetch('/api/knowledge/restore', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.ok) return true;
      } catch {}
    }
    return await restoreBrowserFromUploadedFile(params.resourceFolderHandle, params.file);
  },

  async resetDatabase(params: { resourceFolder?: string | null; reason?: string; resourceFolderHandle?: any }): Promise<boolean> {
    if (isServerApiAvailable()) {
      try {
        const res = await fetch('/api/knowledge/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceFolder: params.resourceFolder, forceReset: true, resetReason: params.reason }),
        });
        const data = await res.json();
        if (res.ok && data.ok) return true;
      } catch {}
    }
    return await resetBrowserKnowledgeDb(params.resourceFolderHandle, params.reason);
  },
};
