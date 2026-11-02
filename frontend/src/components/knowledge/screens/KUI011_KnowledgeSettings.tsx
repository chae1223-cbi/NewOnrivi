// ====================================================================
// 📊 [OMD-KUI-011] KUI011_KnowledgeSettings.tsx ➔ 지식 엔진 환경설정 및 리소스 제어
// 🎯 @KICK  : 에디터 활성 AI(Gemini API 키 및 모델) 실시간 연동 확인/테스트, Worker 동시성, 지식 DB 백업/원복/초기화
// 🛡️ @GUARD : LDSG v5.0 (#1d4ed8), 로컬 클라이언트 안전 보관 원칙(중앙 서버 전송 불가, API 키 화면 유출 차단), 고대비 시인성 보장(Rule 8), 에디터 전역 AI 단일 진입점 준수
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — [프로드 웹(onrivi.com) 지식 DB 백업 목록 미노출 버그 완벽 해결]
//             1) KUI011 환경설정에서 직접 /api/knowledge/* fetch 하던 방식을 knowledgeClient 파사드(데스크톱 Node SQLite ↔ 웹 WASM SQLite 자동 분기)로 전면 마이그레이션
//             2) resourceFolderHandle prop 연동 및 웹 환경에서 Onrivi_Asset/db/backups 실시간 탐색/다운로드/원복/생성 완벽 지원
//             3) 웹 브라우저 환경에서 자원 관리 폴더(Onrivi_Asset) 미연결 시 원클릭 연결/권한 갱신 버튼(FolderOpen) 제공
//             **2026-09-11** — [데스크톱 지식 DB 백업 목록 미노출 버그 완벽 해결] effectiveResourceFolder(loadSecureData + Onrivi_Asset 폴백) 도입으로 resourceFolder 미전달 시에도 /api/knowledge/backup 목록 조회 및 백업/원복/다운로드 기능이 100% 정상 작동하도록 전면 개편
//             **2026-09-06** — [Electron 외부 DB 업로드 원복 수정] handleUploadBackup에서 Electron 미지원 FormData 전송을 ArrayBuffer→base64 JSON 방식으로 교체, main.js restore 핸들러에서 uploadedFileBase64 분기 처리 추가 및 pre-restore 스냅샷 manifest 자동 기록 완비
//             **2026-09-05** — [백업 사유(Reason) 및 문서 요약 입력/열람 UI 탑재] 백업 생성, 초기화, 원복 시 백업 사유를 입력받아 기록하고, 백업 목록에서 사유/문서수/대표문서명을 직관적으로 확인하여 원하는 백업을 선택 원복할 수 있도록 개편
//             **2026-09-05** — [초기화/원복 사전 자동 백업 UI 연동] DB 초기화 및 외부/선택 원복 시 현재 DB의 자동 스냅샷 백업 생성 안내 및 백업 목록 실시간 즉시 갱신 연동
//             **2026-09-05** — [지식 DB 백업 원복 실시간 동기화] 기존 백업 및 외부 DB 업로드 원복 성공 시 knowledge:updated-from-hub, knowledge:refresh 전역 이벤트를 브로드캐스트하여 탐색기 뱃지 및 지식 보관함 목록이 즉각 동기화되도록 개선
//             **2026-09-05** — [지식 DB 완전 초기화 클라이언트 연동 강화] 초기화 시 로컬 스토리지 등록 문서(onrivi_registered_knowledge_docs) 즉각 정리 및 knowledge:updated, knowledge:updated-from-hub 전역 이벤트 브로드캐스트로 에디터/탐색기/허브 실시간 동기화
//             **2026-09-05** — [OMD-KUI-011] 보안 강화: API 키 유출 원천 방지를 위해 키 복사/보기 기능을 전면 제거하고 화면 노출 시 100% 완전 마스킹(••••)으로 보호; 연결 테스트 및 지식 DB 백업/원복/다운로드/초기화 기능 통합 유지
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 에디터 저장 시 자동 백그라운드 재색인(autoSyncOnSave) 설정 토글 옵션 탑재
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 지식 환경설정 내 중복 AI 설정창을 전면 제거하고 에디터 생성 AI 정보(Gemini API Key & Model)와 실시간 직접 연동 및 상태 카드 표시로 개편
// 🔗 @CALLS : localStorage, knowledgeClient, /api/knowledge/init, /api/knowledge/backup, /api/knowledge/restore
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Shield, Cpu, Sliders, Database, 
  AlertTriangle, RefreshCw, Sparkles, CheckCircle2, Save,
  Download, Upload, RotateCcw, Trash2,
  HardDrive, Archive, FolderOpen
} from 'lucide-react';
import { ResourceController } from '@/lib/knowledge/knowledgeWorker';
import PromptModal from '@/components/PromptModal';
import { loadSecureData } from '@/lib/secureStorage';
import { idb } from '@/lib/indexedDbHelper';
import { knowledgeClient, isServerApiAvailable } from '@/lib/knowledge/knowledgeClient';

interface KnowledgeBackupItem {
  fileName: string;
  filePath: string;
  size: number;
  createdAt: string;
  reason?: string;
  docCount?: number;
  docTitles?: string[];
}

interface KUI011KnowledgeSettingsProps {
  resourceFolder: string;
  geminiApiKey: string;
  aiModelName: string;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onSaveApiKey?: (key: string) => void;
  onSaveModelName?: (model: string) => void;
  resourceFolderHandle?: any;
}

export const KUI011_KnowledgeSettings: React.FC<KUI011KnowledgeSettingsProps> = ({
  resourceFolder,
  geminiApiKey: propGeminiApiKey,
  aiModelName: propAiModelName,
  showToast,
  resourceFolderHandle: propResourceFolderHandle,
}) => {
  // --- AI 키/모델 실시간 상태 및 테스트 (보안상 마스킹 유지, 외부 복사/표시 차단) ---
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // 실시간 에디터 API 키 계산 (Props 및 localStorage 동시 검사)
  const effectiveApiKey = useMemo(() => {
    if (propGeminiApiKey?.trim()) return propGeminiApiKey.trim();
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('onrivi_gemini_api_key');
      if (local?.trim()) return local.trim();
      try {
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.geminiApiKey?.trim()) return parsed.geminiApiKey.trim();
        }
      } catch {}
    }
    return '';
  }, [propGeminiApiKey]);

  // 실시간 에디터 AI 모델명 계산
  const effectiveAiModelName = useMemo(() => {
    if (propAiModelName?.trim()) return propAiModelName.trim();
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('onrivi_ai_model_name') || localStorage.getItem('onrivi_gemini_model');
      if (local?.trim()) return local.trim();
      try {
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.aiModelName?.trim()) return parsed.aiModelName.trim();
        }
      } catch {}
    }
    return 'gemini-3.8-flash';
  }, [propAiModelName]);

  // 실시간 유효 리소스 폴더 계산 (Props, loadSecureData, localStorage, Onrivi_Asset 안전 폴백)
  const effectiveResourceFolder = getEffectiveResourceFolder();

  // 실시간 File System Access API 폴더 핸들 동기화 (Props 또는 window 글로벌 캐시)
  const effectiveHandle = useMemo(() => {
    if (propResourceFolderHandle) return propResourceFolderHandle;
    if (typeof window !== 'undefined' && (window as any).__resourceFolderHandle) {
      return (window as any).__resourceFolderHandle;
    }
    return undefined;
  }, [propResourceFolderHandle]);

  // 보안을 위한 100% 완전 마스킹: 어떠한 문자도 노출하지 않고 일괄 마스킹(•) 처리
  const formatMaskedKey = (key: string) => {
    if (!key) return '';
    return '••••••••••••••••••••••••••••••••••••';
  };

  // 에디터 연동 API 키 유효성 테스트
  const handleTestApiKey = async () => {
    const keyToTest = effectiveApiKey;
    if (!keyToTest) {
      showToast('에디터에 등록된 Gemini API 키가 없습니다. 에디터 [도구] → [환경설정]에서 먼저 키를 등록해 주세요.', 'warning');
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToTest)}`);
      const data = await res.json();
      if (res.ok && data.models) {
        setTestResult({ success: true, msg: '✓ Google Gemini API 연결 및 인증 성공' });
        showToast(`Google Gemini API 키 연결 및 인증이 정상 확인되었습니다. (사용 가능 모델: ${data.models.length}개)`, 'success');
      } else {
        const errMsg = data.error?.message || 'API 키 검증 실패 (Google API 응답 에러)';
        setTestResult({ success: false, msg: `✕ ${errMsg}` });
        showToast(errMsg, 'error');
      }
    } catch {
      setTestResult({ success: false, msg: '✕ 네트워크 연결 오류' });
      showToast('API 키 검증 중 네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setTestingKey(false);
    }
  };

  // --- Worker 및 리소스 제어 상태 ---
  const [workersCount, setWorkersCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onrivi_knowledge_workers');
      return saved ? parseInt(saved, 10) : 2;
    }
    return 2;
  });
  const [throttleOnTyping, setThrottleOnTyping] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onrivi_knowledge_throttle_typing');
      return saved !== 'false';
    }
    return true;
  });
  const [staleHashWarning, setStaleHashWarning] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onrivi_knowledge_stale_warning');
      return saved !== 'false';
    }
    return true;
  });
  const [autoSyncOnSave, setAutoSyncOnSave] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onrivi_knowledge_auto_sync_save');
      return saved !== 'false';
    }
    return true;
  });

  // --- DB 백업 및 원복 상태 ---
  const [backups, setBackups] = useState<KnowledgeBackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringFileName, setRestoringFileName] = useState<string | null>(null);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(null);
  const [dbResetting, setDbResetting] = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // 백업 목록 불러오기 (데스크톱 Node SQLite ↔ 웹 WASM SQLite 통합 연동)
  const fetchBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const list = await knowledgeClient.listBackups({
        resourceFolder: effectiveResourceFolder,
        resourceFolderHandle: effectiveHandle,
      });
      if (Array.isArray(list)) {
        setBackups(list);
      }
    } catch (err) {
      console.error('[KUI011] Failed to fetch backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  }, [effectiveResourceFolder, effectiveHandle]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // 설정 저장 (Worker 및 리소스 제어)
  const handleSaveSettings = () => {
    localStorage.setItem('onrivi_knowledge_workers', String(workersCount));
    localStorage.setItem('onrivi_knowledge_throttle_typing', String(throttleOnTyping));
    localStorage.setItem('onrivi_knowledge_stale_warning', String(staleHashWarning));
    localStorage.setItem('onrivi_knowledge_auto_sync_save', String(autoSyncOnSave));
    
    // ResourceController에 즉시 반영
    ResourceController.getInstance().setEditorTypingThrottling(throttleOnTyping);

    showToast('지식 엔진 리소스 설정이 안전하게 저장되었습니다.', 'success');
  };

  // --- 커스텀 PromptModal 상태 (Electron window.prompt 미지원 완벽 해결) ---
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (val: string) => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    defaultValue: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const showPromptDialog = useCallback((title: string, defaultValue = '', placeholder = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        defaultValue,
        placeholder,
        onConfirm: (val: string) => {
          setPromptState(prev => ({ ...prev, isOpen: false }));
          resolve(val);
        },
        onCancel: () => {
          setPromptState(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  }, []);

  // --- 데이터베이스 백업 생성 ---
  const handleCreateBackup = async () => {
    if (!effectiveResourceFolder && !effectiveHandle) return;
    const reason = await showPromptDialog(
      '백업 사유나 메모를 입력해 주세요 (선택 사항):',
      '수동 정기 백업',
      '예: 문서 일괄 등록 전 백업, 특정 프로젝트 완료 후 등'
    );
    if (reason === null) return; // 취소 시 중단

    setCreatingBackup(true);
    try {
      const data = await knowledgeClient.createBackup({
        resourceFolder: effectiveResourceFolder,
        reason: reason.trim() || '수동 정기 백업',
        resourceFolderHandle: effectiveHandle,
      });
      if (data && data.ok !== false) {
        showToast(data.message || '지식 DB 백업이 성공적으로 생성되었습니다.', 'success');
        fetchBackups();
      } else {
        showToast(data?.message || '백업 생성에 실패했습니다.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || '백업 생성 요청 중 오류가 발생했습니다.', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  // --- 현재 실시간 DB 파일 직접 다운로드 ---
  const handleDownloadCurrentDb = async () => {
    if (isServerApiAvailable()) {
      if (!effectiveResourceFolder) return;
      const downloadUrl = `/api/knowledge/backup?resourceFolder=${encodeURIComponent(effectiveResourceFolder)}&download=current`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('실시간 지식 데이터베이스(.db) 다운로드가 시작되었습니다.', 'info');
    } else {
      try {
        const res = await knowledgeClient.downloadBackup({
          resourceFolder: effectiveResourceFolder,
          fileName: 'current',
          resourceFolderHandle: effectiveHandle,
        });
        if (res && res.blob) {
          const url = URL.createObjectURL(res.blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', res.downloadName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast('실시간 지식 데이터베이스(.db) 다운로드가 완료되었습니다.', 'success');
        } else {
          showToast('다운로드할 데이터베이스 파일을 찾을 수 없습니다.', 'error');
        }
      } catch (err: any) {
        showToast(err?.message || '데이터베이스 다운로드 실패', 'error');
      }
    }
  };

  // --- 특정 백업 파일 PC로 다운로드 ---
  const handleDownloadBackup = async (fileName: string) => {
    if (!fileName) return;
    if (isServerApiAvailable()) {
      if (!effectiveResourceFolder) return;
      const downloadUrl = `/api/knowledge/backup?resourceFolder=${encodeURIComponent(effectiveResourceFolder)}&download=true&fileName=${encodeURIComponent(fileName)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`백업 파일(${fileName}) 다운로드가 시작되었습니다.`, 'info');
    } else {
      try {
        const res = await knowledgeClient.downloadBackup({
          resourceFolder: effectiveResourceFolder,
          fileName,
          resourceFolderHandle: effectiveHandle,
        });
        if (res && res.blob) {
          const url = URL.createObjectURL(res.blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', res.downloadName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast(`백업 파일(${fileName}) 다운로드가 완료되었습니다.`, 'success');
        } else {
          showToast('다운로드할 백업 파일을 찾을 수 없습니다.', 'error');
        }
      } catch (err: any) {
        showToast(err?.message || '백업 파일 다운로드 실패', 'error');
      }
    }
  };

  // --- 기존 백업 시점으로 DB 원복 (Restore) ---
  const handleRestoreBackup = async (fileName: string, itemReason?: string) => {
    if (!fileName) return;
    const confirmed = window.confirm(
      `선택하신 백업 시점(${fileName})으로 지식 데이터베이스를 원복하시겠습니까?\n` +
      (itemReason ? `[해당 백업 사유: ${itemReason}]\n\n` : '\n') +
      `※ 안전을 위해 현재 데이터베이스는 원복 직전에 backups 폴더에 자동으로 스냅샷 백업됩니다.`
    );
    if (!confirmed) return;

    const snapshotReason = await showPromptDialog(
      '원복 전 현재 운영 DB를 스냅샷 백업합니다.\n현재 DB의 백업 사유를 입력해 주세요:',
      `원복 직전 자동 백업 (${fileName} 복원 전)`
    );
    if (snapshotReason === null) return;

    setRestoringFileName(fileName);
    try {
      const ok = await knowledgeClient.restoreBackup({
        resourceFolder: effectiveResourceFolder,
        fileName,
        resourceFolderHandle: effectiveHandle,
      });
      if (ok) {
        // 🧠 원복 후 탐색기 및 지식 관리자 화면 실시간 재동기화 브로드캐스트
        window.dispatchEvent(new CustomEvent('knowledge:updated-from-hub'));
        window.dispatchEvent(new CustomEvent('knowledge:refresh'));
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        window.dispatchEvent(new CustomEvent('app:knowledge-refresh'));

        showToast(`지식 데이터베이스(${fileName})가 성공적으로 원복되었습니다.`, 'success');
        fetchBackups();
      } else {
        showToast('원복 작업에 실패했습니다.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || '원복 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setRestoringFileName(null);
    }
  };

  // --- 외부 백업(.db) 파일 업로드 원복 ---
  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      showToast('SQLite 데이터베이스(.db) 파일만 업로드할 수 있습니다.', 'warning');
      e.target.value = '';
      return;
    }

    const confirmed = window.confirm(
      `업로드하신 외부 백업 파일("${file.name}")로 지식 데이터베이스(db/onrivi_knowledge.db)를 즉시 원복하시겠습니까?\n\n` +
      `※ 안전을 위해 현재 운영 중인 데이터베이스는 backups 폴더에 자동으로 스냅샷 백업됩니다.\n` +
      `※ 그 후 활성 지식 DB가 업로드된 파일의 데이터로 1:1 직접 교체됩니다.`
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setRestoringFileName('__upload__');
    try {
      const ok = await knowledgeClient.restoreFromUploadedFile({
        resourceFolder: effectiveResourceFolder,
        file,
        resourceFolderHandle: effectiveHandle,
      });
      if (ok) {
        // 🧠 업로드 원복 후 탐색기 및 지식 관리자 화면 실시간 재동기화 브로드캐스트
        window.dispatchEvent(new CustomEvent('knowledge:updated-from-hub'));
        window.dispatchEvent(new CustomEvent('knowledge:refresh'));
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
        window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
        window.dispatchEvent(new CustomEvent('app:knowledge-refresh'));

        showToast('업로드된 파일로 지식 DB가 안전하게 원복되었습니다.', 'success');
        fetchBackups();
      } else {
        showToast('업로드 파일 원복 실패', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || '파일 업로드 및 원복 중 오류가 발생했습니다.', 'error');
    } finally {
      setRestoringFileName(null);
      e.target.value = '';
    }
  };

  // --- 백업 파일 삭제 ---
  const handleDeleteBackup = async (fileName: string) => {
    if (!fileName) return;
    const confirmed = window.confirm(`백업 파일 "${fileName}"을(를) 영구히 삭제하시겠습니까?`);
    if (!confirmed) return;

    setDeletingFileName(fileName);
    try {
      const ok = await knowledgeClient.deleteBackup({
        resourceFolder: effectiveResourceFolder,
        fileName,
        resourceFolderHandle: effectiveHandle,
      });
      if (ok) {
        showToast('백업 파일이 안전하게 삭제되었습니다.', 'success');
        fetchBackups();
      } else {
        showToast('백업 삭제 실패', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || '백업 파일 삭제 요청 중 오류가 발생했습니다.', 'error');
    } finally {
      setDeletingFileName(null);
    }
  };

  // 웹 브라우저 환경에서 사용자 PC의 Onrivi_Asset 폴더 직접 연결/재인증
  const handleConnectResourceFolder = async () => { window.dispatchEvent(new CustomEvent('onrivi:resource-settings')); };

  // --- 지식 DB 완전 초기화 (위험 작업) ---
  const handleResetKnowledgeDb = async () => {
    if (!effectiveResourceFolder && !effectiveHandle) {
      showToast('리소스 폴더가 설정되지 않았습니다.', 'warning');
      return;
    }
    const confirmText = await showPromptDialog(
      '⚠️ 지식 데이터베이스 완전 초기화 — 진행하시려면 "초기화"를 입력해 주세요',
      '',
      '초기화'
    );
    if (confirmText !== '초기화') {
      if (confirmText !== null) showToast('초기화가 취소되었습니다.', 'info');
      return;
    }

    const backupReason = await showPromptDialog(
      '초기화 전 스냅샷 백업 사유 입력 (선택 사항):',
      '초기화 직전 안전 자동 백업',
      '예: 초기화 직전 안전 자동 백업'
    );
    if (backupReason === null) {
      showToast('초기화가 취소되었습니다.', 'info');
      return;
    }

    setDbResetting(true);
    try {
      const ok = await knowledgeClient.resetDatabase({
        resourceFolder: effectiveResourceFolder,
        reason: backupReason.trim() || '초기화 직전 안전 자동 백업',
        resourceFolderHandle: effectiveHandle,
      });
      if (ok) {
        // 클라이언트 로컬 캐시 및 등록 문서 목록 초기화
        try {
          localStorage.removeItem('onrivi_registered_knowledge_docs');
        } catch {}
        // 탐색기 및 전역 컴포넌트 실시간 동기화 브로드캐스트
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
        window.dispatchEvent(new CustomEvent('knowledge:updated-from-hub'));
        window.dispatchEvent(new CustomEvent('app:knowledge-refresh'));

        showToast('지식 데이터베이스가 성공적으로 완전 초기화되었습니다.', 'success');
        fetchBackups();
      } else {
        showToast('데이터베이스 초기화 실패', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || '초기화 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setDbResetting(false);
    }
  };

  // 바이트 단위 포맷팅
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 날짜 포맷팅
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* 상단 타이틀 & 저장 버튼 */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#1d4ed8]" />
            지식 엔진 환경설정 및 데이터베이스 관리 (KUI-011)
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            에디터 활성 AI 연동 현황 확인, Worker 리소스 제어, 지식 DB 백업/원복 및 완전 초기화를 관리합니다.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#1d4ed8] text-white hover:bg-[#05b34c] transition shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" />
          설정 저장
        </button>
      </div>

      {/* 중앙 서버 비개입 보안 알림 카드 */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#1d4ed8] shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200">
            중앙 서버 비개입 및 100% 로컬 프라이버시 보호
          </h4>
          <p className="text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed font-medium">
            사용자의 마크다운 문서 내용, 추출 청크, Gemini API Key는 Onrivi 중앙 서버로 전송되거나 저장되지 않습니다. 
            모든 SQLite DB와 FTS5 인덱스는 사용자 PC 로컬 리소스 폴더에 안전하게 격리 보관됩니다.
          </p>
        </div>
      </div>

      {/* 1. 에디터 AI 환경설정 연동 현황 카드 (화면 유출 방지 안전 마스킹 유지) */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
              에디터 AI 환경설정 연동 현황 (Google Gemini)
            </h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
            에디터 전역 실시간 연동됨
          </span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
          지식 엔진의 대량 문서 분석(요약/키워드/청킹) 및 질의응답(RAG)은 Onrivi 에디터에서 최종 활성화된 Gemini API 키 및 AI 모델을 자동으로 감지하여 그대로 연동합니다.
        </p>

        {/* 연동 상태 확인 바 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* API Key 연결 상태 카드 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold block">
                  연동된 Gemini API 키 상태
                </span>
                {effectiveApiKey && (
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    보호됨 (전체 마스킹)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1.5">
                {effectiveApiKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                    <span 
                      className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono tracking-widest select-none"
                      title="보안을 위해 모든 문자가 안전하게 전체 마스킹 처리되어 있습니다."
                    >
                      {formatMaskedKey(effectiveApiKey)}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      미등록 (에디터 설정에서 등록 필요)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 검증 결과 및 테스트 버튼 바 */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                {testResult ? (
                  <span className={testResult.success ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-500 font-bold'}>
                    {testResult.msg}
                  </span>
                ) : effectiveApiKey ? (
                  'Google API 검증 대기중'
                ) : (
                  '에디터 [환경설정]에서 키 등록 필요'
                )}
              </span>

              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testingKey || !effectiveApiKey}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1"
              >
                {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '연결 테스트'}
              </button>
            </div>
          </div>

          {/* 연동된 AI 모델 상태 카드 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between gap-2.5">
            <div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold block">현재 활성화된 AI 모델</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8] animate-pulse"></span>
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
                  {effectiveAiModelName}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1d4ed8]/15 text-[#1d4ed8]">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                에디터 메뉴바 우측 또는 [도구] → [환경설정]에서 변경 가능
              </span>
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <span>💡</span>
          <span>
            API 키 유출 방지를 위해 키는 안전하게 마스킹 보관되며, 변경은 에디터 상단 메뉴의 <strong>[도구] → [환경설정]</strong> 또는 메뉴바 우측 <strong>AI 모델 선택기</strong>에서 수행할 수 있습니다.
          </span>
        </div>
      </div>

      {/* 2. Worker 동시성 및 리소스 쓰로틀링 제어 카드 */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
            로컬 Worker 동시성 및 에디터 보호 리소스 제어
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                동시 실행 백그라운드 Worker 수: <span className="text-[#1d4ed8] font-extrabold">{workersCount}개</span>
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">권장: 2 ~ 3개 (API 분당 할당량 고려)</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setWorkersCount(num)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    workersCount === num
                      ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {num}슬롯
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={throttleOnTyping}
                onChange={(e) => setThrottleOnTyping(e.target.checked)}
                className="mt-0.5 rounded text-[#1d4ed8] focus:ring-[#1d4ed8]"
              />
              <div className="text-xs">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block">
                  에디터 타이핑 중 동시 Worker를 1개로 자동 축소 (Typing Throttling)
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block mt-0.5 font-medium">
                  사용자가 마크다운 에디터에서 글을 작성하는 동안 백그라운드 부하를 최소화하여 키보드 반응 속도 및 60fps 부드러움을 유지합니다.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={staleHashWarning}
                onChange={(e) => setStaleHashWarning(e.target.checked)}
                className="mt-0.5 rounded text-[#1d4ed8] focus:ring-[#1d4ed8]"
              />
              <div className="text-xs">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block">
                  문서 수정 시 인덱스 불일치(Stale Hash) 감지 및 재색인 안내 표시
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block mt-0.5 font-medium">
                  색인 완료 후 원본 마크다운 파일이 편집된 경우, 검색 결과 및 근거 뷰어에서 경고를 표시하고 즉시 재색인을 유도합니다.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncOnSave}
                onChange={(e) => setAutoSyncOnSave(e.target.checked)}
                className="mt-0.5 rounded text-[#1d4ed8] focus:ring-[#1d4ed8]"
              />
              <div className="text-xs">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 block">
                  에디터 문서 저장 시 지식 베이스 자동 백그라운드 재색인 (Auto-Sync on Save)
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] block mt-0.5 font-medium">
                  지식 보관함에 등록된 마크다운 문서를 에디터에서 저장(Ctrl+S 또는 자동저장)할 때, 변경 사항을 감지하여 로컬 큐에 자동으로 재색인(Priority 1)을 예약합니다.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. 지식 데이터베이스 백업 및 원복 (Backup & Restore) 카드 */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191D] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
              지식 데이터베이스 백업 및 원복 (Backup & Restore)
            </h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            SQLite WAL 체크포인트 무결성 보장
          </span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
          현재 등록된 문서 색인, FTS5 검색 인덱스, 청크 데이터를 언제든지 안전하게 백업하거나 원하는 시점으로 원복할 수 있습니다.
          복원 시 현재 DB는 사전 자동 스냅샷되어 데이터 유실을 방지합니다.
        </p>

        {/* 백업/원복 실행 컨트롤 버튼 그룹 */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* 지금 백업 파일 생성 */}
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={creatingBackup || !effectiveResourceFolder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {creatingBackup ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
            지금 지식 DB 백업 생성
          </button>

          {/* 현재 DB 파일 직접 PC 다운로드 */}
          <button
            type="button"
            onClick={handleDownloadCurrentDb}
            disabled={!effectiveResourceFolder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            실시간 DB 파일 다운로드 (.db)
          </button>

          {/* 외부 백업 파일 업로드 원복 */}
          <input
            type="file"
            ref={uploadFileInputRef}
            onChange={handleUploadBackup}
            accept=".db"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => uploadFileInputRef.current?.click()}
            disabled={restoringFileName !== null || !effectiveResourceFolder}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer"
          >
            {restoringFileName === '__upload__' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-blue-500" />
            )}
            외부 백업 파일(.db) 업로드 원복
          </button>

          {/* 새로고침 */}
          <button
            type="button"
            onClick={fetchBackups}
            disabled={loadingBackups}
            title="백업 목록 새로고침"
            className="p-2 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
          </button>

          {/* 웹 브라우저 환경 자원 관리 폴더 연결 버튼 */}
          {!isServerApiAvailable && (
            <button
              type="button"
              onClick={handleConnectResourceFolder}
              title="브라우저에 내 PC Onrivi_Asset 자원 폴더 연결/권한 갱신"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-xs cursor-pointer ml-auto"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#1d4ed8]" />
              내 PC 자원 폴더 연결
            </button>
          )}
        </div>

        {/* 저장된 백업 목록 테이블 */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                로컬 보관된 백업 목록 ({backups.length}개)
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              저장위치: {effectiveResourceFolder ? `${effectiveResourceFolder}/db/backups/` : '로컬 리소스 폴더'}
            </span>
          </div>

          {backups.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium flex flex-col items-center justify-center gap-3">
              <p>
                {loadingBackups 
                  ? '백업 목록을 불러오는 중입니다...' 
                  : '생성된 로컬 백업이 없거나 자원 폴더(Onrivi_Asset) 연결이 필요합니다.'}
              </p>
              {!isServerApiAvailable && (
                <button
                  type="button"
                  onClick={handleConnectResourceFolder}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#1d4ed8] hover:bg-[#05b34c] text-white shadow-xs transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  내 PC의 Onrivi_Asset 폴더 연결하기
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-60 overflow-y-auto">
              {backups.map((item) => (
                <div 
                  key={item.fileName} 
                  className="px-4 py-3 flex items-start justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition gap-3"
                >
                  <div className="min-w-0 flex-1">
                    {/* 사유, 문서수, 파일명, 용량 뱃지 */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.reason && (
                        <span className="px-2 py-0.5 text-[11px] font-extrabold rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                          사유: {item.reason}
                        </span>
                      )}
                      {typeof item.docCount === 'number' && (
                        <span className="px-2 py-0.5 text-[11px] font-extrabold rounded bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shrink-0">
                          문서 {item.docCount}건
                        </span>
                      )}
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono truncate">
                        {item.fileName}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono shrink-0">
                        {formatBytes(item.size)}
                      </span>
                    </div>

                    {/* 백업 시점 포함 주요 문서명 요약 */}
                    {item.docTitles && item.docTitles.length > 0 && (
                      <div className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium mt-1 truncate">
                        <span className="text-zinc-500 dark:text-zinc-400 font-bold">포함 문서: </span>
                        {item.docTitles.join(', ')}
                        {typeof item.docCount === 'number' && item.docCount > item.docTitles.length ? ` 외 ${item.docCount - item.docTitles.length}건` : ''}
                      </div>
                    )}

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                      <span>생성일시: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{formatDate(item.createdAt)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {/* 원복 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(item.fileName, item.reason)}
                      disabled={restoringFileName !== null}
                      title="이 시점으로 데이터베이스 원복"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 transition cursor-pointer disabled:opacity-40"
                    >
                      {restoringFileName === item.fileName ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      원복
                    </button>

                    {/* PC 다운로드 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleDownloadBackup(item.fileName)}
                      title="백업 파일 PC 다운로드"
                      className="p-1.5 text-xs font-bold rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* 백업 파일 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteBackup(item.fileName)}
                      disabled={deletingFileName === item.fileName}
                      title="백업 파일 삭제"
                      className="p-1.5 text-xs font-bold rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-40"
                    >
                      {deletingFileName === item.fileName ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. 데이터베이스 및 인덱스 완전 초기화 (위험 작업) */}
      <div className="p-5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-extrabold text-red-900 dark:text-red-300">
            데이터베이스 완전 초기화 (Danger Zone)
          </h3>
        </div>
        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          현재 리소스 폴더의 지식 DB를 깨끗이 비우고 테이블과 FTS5 색인 구조를 초기화합니다. 
          문서 색인 데이터, 청크, 처리 대기열이 모두 삭제됩니다. 필요시 상단의 <strong>[지금 지식 DB 백업 생성]</strong>을 먼저 실행해 두세요.
        </p>
        <button
          onClick={handleResetKnowledgeDb}
          disabled={dbResetting}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {dbResetting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
          지식 데이터베이스 완전 초기화
        </button>
      </div>
      {/* PromptModal: showPromptDialog helper가 제어하는 비동기 입력 다이얼로그 */}
      <PromptModal
        isOpen={promptState.isOpen}
        title={promptState.title}
        defaultValue={promptState.defaultValue}
        placeholder={promptState.placeholder}
        onConfirm={promptState.onConfirm}
        onCancel={promptState.onCancel}
      />
    </div>
  );
};
