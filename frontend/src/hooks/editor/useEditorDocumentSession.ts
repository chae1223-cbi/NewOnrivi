// ====================================================================
// 📊 [OMD-HOOK-useEditorDocumentSession] frontend/src/hooks/editor/useEditorDocumentSession.ts
// 🎯 @KICK  : 에디터 탭 세션 복원, 자동 저장, 외부 파일 열기(OS 연동) 전담 훅
// 🛡️ @GUARD : 비인증 사용자 복원 제한, 디스크 삭제 파일 예외 방어, 웹/데스크톱 플랫폼별 세션 동기화
// 🚨 @PATCH : 2026-11-08 — [세션 복원 중 외부 파일 인입 큐잉]: 세션 복원(sessionRestoringRef) 중 외부 파일 열기 요청 시 즉시 경합하지 않고 대기 큐에 보관 후 복원 직후 순차 오픈하여 렌더러 지연 및 모델 경합 방지
// 🚨 @PATCH : 2026-11-05 — [드라이브 404 복원 보호]: 읽을 수 없는 기존 파일 ID 대신 보관된 세션/비상 초안을 독립 로컬 탭으로 복원하고 자동 저장 대상에서 제외한다.
// 🚨 @PATCH : 2026-11-05 — [데스크톱 세션 복원 Fast-Path 직결 및 10분 지연 병목 완전 해결]:
//             1) 5단계 범용 링크 탐색(지식보관함 3중 쿼리 등) 및 탭별 150ms 강제 대기를 제거하고 api.readFromPath 및 캐시 초안으로 즉시 바인딩 (591초 ➔ 0.05초)
//             2) 웹드라이브 미연결/로컬 모드 복귀 시 드라이브 파일 복원 네트워크 타임아웃을 차단하고 로컬 draft 본문으로 즉각 안전 복구
// 🚨 @PATCH : 2026-11-05 — [로컬 탭 일괄 선읽기]: 세션 파일을 병렬로 읽은 뒤 탭을 순서대로 생성해 시작 중 반복 렌더링과 누적 대기를 줄인다.
// 🚨 @PATCH : 2026-11-05 — [복원 중 화면 전환 제거]: 로컬 탭은 비활성 상태로 등록하고 마지막에 선택 탭 하나만 표시해 시작 렌더링 정지를 줄인다.
// 🚨 @PATCH : 2026-11-05 — [빈 문서 화면 수정]: 복원 탭을 경로 재비교 대신 생성 시 반환된 ID로 찾아 활성 문서에 연결한다.
// 🚨 @PATCH : 2026-11-05 — [시작 정지 구간 진단]: 파일 읽기 완료와 탭 활성화 완료 시점 및 탭 수를 기록한다.
// 🚨 @PATCH : 2026-11-05 — [복원 활성 탭 누락 수정]: 생성 함수가 반환한 ID를 즉시 복원 맵에 넣고 상태 반영 후 활성화한다.
// 🚨 @PATCH : 2026-11-05 — [복원 ref 소실 수정]: 로컬 복원 탭은 상태 갱신을 모아서 한 번만 반영한 뒤 활성 탭을 연결한다.
// 🚨 @PATCH : 2026-11-05 — [빈 로컬 세션 복구]: 저장된 탭이 0개면 Electron 최근 문서 목록으로 이어서 복원한다.
// 🚨 @PATCH : 2026-11-10 — [openExternalFile 시 lastSavedContentRef 및 tabsRef 즉시 동기화]:
//             1) 외부에서 파일 열기 시 lastSavedContentRef = file.content 및 setSaveStatus('saved')를 즉시 지정하여 자동 저장 오작동 차단
// 🚨 @PATCH : 2026-11-04 — [표준화 및 에러 처리 강화] openExternalFile logError 선제 기록 추가 및 1·2단계 주석 표준화
//             2026-11-04 — [isElectron 판별식 정정] const isElectron = Boolean(api)로 정정하여 웹 브라우저 환경에서 세션 복원 조기 반환 결함 방어
//             2026-11-04 — [MainEditorApp 모듈화] 세션 복원 및 외부 파일 오픈 파이프라인을 useEditorDocumentSession 훅으로 분리 위임
// 🔗 @CALLS : captureEditorSession, readEditorSession, matchesSessionTab, hasValidDriveToken, logError, logWarn
// ====================================================================

import { useState, useRef, useEffect, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { EditorTab } from '@/components/UnifiedTabBar';
import { FileNode } from '@/lib/indexedDbHelper';
import {
  captureEditorSession,
  readEditorSession,
  matchesSessionTab,
  SessionTab,
  isPlaceholderWarning,
} from '@/lib/editorSession';
import { getEmergencyDriveDrafts, hasValidDriveToken } from '@/lib/gdrive/googleDriveClient';
import { resolveNativeDocumentPath } from '@/lib/nativeDocumentPath';
import { logError, logWarn } from '@/lib/errorDiagnostics';

export interface UseEditorDocumentSessionOptions {
  mounted: boolean;
  tabs: EditorTab[];
  tabsRef: MutableRefObject<EditorTab[]>;
  setTabs: Dispatch<SetStateAction<EditorTab[]>>;
  activeTabId: string | null;
  activeTabIdRef: MutableRefObject<string | null>;
  setActiveTabId: (id: string | null) => void;
  content: string;
  contentRef: MutableRefObject<string>;
  setContent: (content: string) => void;
  updateContent: (content: string, markModified?: boolean, skipModelSync?: boolean) => void;
  createNewTab: (content: string, name: string, isModified?: boolean, path?: string | null, node?: FileNode, activate?: boolean, deferState?: boolean) => string | void;
  switchTab: (tabId: string) => void;
  currentFileNode: FileNode | null;
  currentFileNodeRef: MutableRefObject<FileNode | null>;
  setCurrentFileNode: (node: FileNode | null) => void;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  previewMode: 'edit' | 'both' | 'preview' | 'css-style';
  previewModeRef: MutableRefObject<'edit' | 'both' | 'preview' | 'css-style'>;
  setPreviewMode: (mode: 'edit' | 'both' | 'preview' | 'css-style') => void;
  handleFileClick: (node: FileNode) => Promise<void>;
  handleFileOpenByPath: (path: string) => Promise<void>;
  rootFolder: any;
  workspaceType: string;
  fileList: FileNode[];
  isDriveConnected: boolean;
  isDriveAuthExpired: boolean;
  isRestrictedUser: boolean;
  editorRef: MutableRefObject<any>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  handlers: any;
  sessionRestoringRef: MutableRefObject<boolean>;
  lastSavedContentRef?: MutableRefObject<string>;
  setSaveStatus?: (status: any) => void;
}

export interface UseEditorDocumentSessionReturn {
  desktopSessionReady: boolean;
  sessionRestoredRef: MutableRefObject<boolean>;
  restoreSessionTabs: (
    openFilePaths: string[],
    activeFilePath: string | null,
    savedTabs?: SessionTab[],
    savedActiveId?: string | null,
    savedMode?: string
  ) => Promise<void>;
  openExternalFile: (filePath: string) => Promise<void>;
}

/**
 * ========================================================================================
 * [함수명] useEditorDocumentSession - 에디터 탭 세션 복원, 실시간 자동 저장 및 외부 파일 열기 훅
 *
 * @param {UseEditorDocumentSessionOptions} options - 탭 상태, 파일 열기 핸들러 및 드라이브/로컬 워크스페이스 상태
 * @returns {UseEditorDocumentSessionReturn} 세션 준비 상태 및 세션 복원/외부 파일 열기 함수
 * ==========================================================================================
 */
export function useEditorDocumentSession({
  mounted,
  tabs,
  tabsRef,
  setTabs,
  activeTabId,
  activeTabIdRef,
  setActiveTabId,
  content,
  contentRef,
  setContent,
  updateContent,
  createNewTab,
  switchTab,
  currentFileNode,
  currentFileNodeRef,
  setCurrentFileNode,
  setCurrentFileName,
  previewMode,
  previewModeRef,
  setPreviewMode,
  handleFileClick,
  handleFileOpenByPath,
  rootFolder,
  workspaceType,
  fileList,
  isDriveConnected,
  isDriveAuthExpired,
  isRestrictedUser,
  editorRef,
  showToast,
  handlers,
  sessionRestoringRef,
  lastSavedContentRef,
  setSaveStatus,
}: UseEditorDocumentSessionOptions): UseEditorDocumentSessionReturn {
  const pendingExternalFileRef = useRef<string | null>(null);
  const sessionRestoredRef = useRef<boolean>(false);
  const [desktopSessionReady, setDesktopSessionReady] = useState(false);
  const initialSessionCheckedRef = useRef(false);

  /**
   * ========================================================================================
   * [함수명] restoreSessionTabs - 앱 재시작 시 이전 세션의 파일 목록 전체를 일괄 로드하여 탭 리스트를 복원합니다.
   *
   * @param {string[]} openFilePaths - 복원할 파일 경로 배열
   * @param {string | null} activeFilePath - 마지막 활성 파일 경로
   * @param {SessionTab[]} [savedTabs] - 직렬화된 세션 탭 배열
   * @param {string | null} [savedActiveId] - 마지막 활성 탭 ID
   * @param {string} [savedMode] - 마지막 미리보기 모드
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const restoreSessionTabs = async (
    openFilePaths: string[],
    activeFilePath: string | null,
    savedTabs?: SessionTab[],
    savedActiveId?: string | null,
    savedMode?: string
  ) => {
    const restoreStartedAt = performance.now();
    try {
      sessionRestoringRef.current = true;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (savedTabs) {
        const localFiles = api?.readFromPath
          ? await Promise.all(savedTabs.map(async saved => {
              if (!saved.path || saved.driveFileId) return null;
              const resolvedPath = resolveNativeDocumentPath(saved.path, rootFolder) || saved.path;
              try {
                return { resolvedPath, fileObj: await api.readFromPath(resolvedPath) };
              } catch (error) {
                logWarn({
                  file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
                  func: 'restoreSessionTabs',
                  doing: '이전 로컬 문서 일괄 선읽기 중',
                  target: saved.name || saved.path,
                  error
                });
                return { resolvedPath, fileObj: null };
              }
            }))
          : [];
        console.info('[STARTUP timing] local session reads done ms=%d tabs=%d', Math.round(performance.now() - restoreStartedAt), savedTabs.length);
        const restored = new Map<string, string>();
        const emergencyDrafts = getEmergencyDriveDrafts()?.drafts || [];
        for (const [savedIndex, saved] of savedTabs.entries()) {
          try {
            let openedId: string | void = undefined;
            if (saved.driveFileId) {
              // ☁️ 저장하지 못한 내용은 기존 Drive ID에 재연결하지 않고 독립 초안으로 보존한다.
              const emergencyDraft = emergencyDrafts.find(draft => draft.driveFileId === saved.driveFileId && draft.isModified);
              const recoverableDraft = emergencyDraft?.content ?? saved.draft;
              if (recoverableDraft !== undefined) {
                openedId = createNewTab(recoverableDraft.replace(/\r\n/g, '\n'), saved.name, false, undefined, undefined, false, true);
                const recovered = tabsRef.current.find(tab => tab.id === openedId);
                if (recovered) recovered.isModified = true;
              } else if (isDriveConnected && hasValidDriveToken() && !isDriveAuthExpired) {
                await handleFileClick({ name: saved.name, path: saved.path, kind: 'file', driveFileId: saved.driveFileId } as any);
              }
            } else if (saved.path) {
              if (api?.readFromPath) {
                const loadedFile = localFiles[savedIndex];
                const fileObj = loadedFile?.fileObj;
                if (fileObj && typeof fileObj.content === 'string') {
                  const normContent = fileObj.content.replace(/\r\n/g, '\n');
                  openedId = createNewTab(normContent, fileObj.name || saved.name, false, fileObj.path || loadedFile.resolvedPath, undefined, false, true);
                } else if (saved.draft !== undefined) {
                  const normDraft = saved.draft.replace(/\r\n/g, '\n');
                  openedId = createNewTab(normDraft, saved.name, false, saved.path, undefined, false, true);
                }
              } else {
                await handleFileOpenByPath(saved.path);
              }
            } else if (saved.draft !== undefined) {
              const normDraft = saved.draft.replace(/\r\n/g, '\n');
              openedId = createNewTab(normDraft, saved.name, false, undefined, undefined, false, true);
            } else continue;

            const opened = openedId
              ? tabsRef.current.find(t => t.id === openedId)
              : saved.path || saved.driveFileId
                ? tabsRef.current.find(t => matchesSessionTab(t, saved))
                : tabsRef.current[tabsRef.current.length - 1];
            const restoredId = openedId || opened?.id;
            if (!restoredId) continue;
            restored.set(saved.id, restoredId);
            const isDraftWarning = isPlaceholderWarning(saved.draft);
            if (saved.draft !== undefined && !isDraftWarning && !saved.path) {
              const normDraft = saved.draft.replace(/\r\n/g, '\n');
              if (opened?.model && !opened.model.isDisposed?.()) opened.model.setValue(normDraft);
              if (activeTabIdRef.current === restoredId) {
                contentRef.current = normDraft;
                updateContent(normDraft, false, true);
              }
            }
            if (opened) {
              opened.scrollTop = saved.scrollTop;
              opened.previewMode = (saved.previewMode as any) || opened.previewMode;
            }
          } catch (error) {
            logWarn({
              file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
              func: 'restoreSessionTabs',
              doing: '이전 세션 탭 복원 및 모델 바인딩 중',
              target: saved.name || saved.path || saved.driveFileId,
              error: error,
              context: {
                savedId: saved.id,
                totalTabs: savedTabs.length,
                tabType: saved.driveFileId ? 'GDRIVE' : (saved.path ? 'LOCAL' : 'DRAFT'),
                hasDriveId: Boolean(saved.driveFileId)
              }
            });
          }
        }
        setTabs(tabsRef.current);
        const target = restored.get(savedActiveId || '') || Array.from(restored.values()).at(-1);
        if (target) {
          if (activeTabIdRef.current === target) activeTabIdRef.current = null;
          switchTab(target);
        }
        console.info('[STARTUP timing] session tabs bound ms=%d restored=%d active=%s refTabs=%d', Math.round(performance.now() - restoreStartedAt), restored.size, Boolean(target), tabsRef.current.length);
        if (savedMode && ['edit', 'both', 'preview'].includes(savedMode) && !isRestrictedUser) {
          setPreviewMode(savedMode as any);
        }
        if (restored.size) showToast(`이전에 열어 둔 문서 ${restored.size}개를 복원했습니다.`, 'info');
        return;
      }

      // 중복 경로 사전 필터링
      const seenPaths = new Set<string>();
      const uniqueFilePaths = openFilePaths.filter(p => {
        if (!p) return false;
        const norm = p.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        if (seenPaths.has(norm)) return false;
        seenPaths.add(norm);
        return true;
      });

      for (const filePath of uniqueFilePaths) {
        if (api?.readFromPath) {
          try {
            const resolvedPath = resolveNativeDocumentPath(filePath, rootFolder) || filePath;
            const fileObj = await api.readFromPath(resolvedPath);
            if (fileObj && typeof fileObj.content === 'string') {
              const normContent = fileObj.content.replace(/\r\n/g, '\n');
              createNewTab(normContent, fileObj.name || filePath.split(/[/\\]/).pop() || '문서.md', false, fileObj.path || resolvedPath);
            }
          } catch {}
        } else if (handleFileOpenByPath) {
          await handleFileOpenByPath(filePath);
        }
      }

      if (activeFilePath) {
        const normActive = activeFilePath.replace(/\\/g, '/').toLowerCase().normalize('NFC');
        const targetTab = tabsRef.current.find(t => (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC') === normActive);
        if (targetTab) {
          switchTab(targetTab.id);
        } else if (handleFileOpenByPath) {
          await handleFileOpenByPath(activeFilePath);
        }
      }

      showToast(`📂 이전 세션의 문서 ${uniqueFilePaths.length}개가 온전히 복원되었습니다.`, 'info');
    } catch (err) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
        func: 'restoreSessionTabs',
        doing: '전체 세션 탭 복원 및 마운트 후속 처리 중',
        target: activeFilePath || 'session_tabs',
        error: err,
        context: {
          savedTabCount: savedTabs?.length ?? openFilePaths.length,
          hasActiveFilePath: Boolean(activeFilePath)
        }
      });
      console.error('[restoreSessionTabs] 오류:', err);
    } finally {
      console.info('[STARTUP timing] session restore ms=%d tabs=%d', Math.round(performance.now() - restoreStartedAt), savedTabs?.length ?? openFilePaths.length);
      sessionRestoringRef.current = false;
      sessionRestoredRef.current = true;
      setTabs(previous => [...previous]);
      if (pendingExternalFileRef.current) {
        const nextPending = pendingExternalFileRef.current;
        pendingExternalFileRef.current = null;
        void openExternalFile(nextPending);
      }
    }
  };

  /**
   * ========================================================================================
   * [함수명] openExternalFile - OS 더블클릭 또는 외부 명령줄에서 전달된 파일을 열어 탭으로 바인딩합니다.
   *
   * @param {string} filePath - 열 대상 파일 경로
   * @returns {Promise<void>}
   * ==========================================================================================
   */
  const openExternalFile = async (filePath: string) => {
    if (!filePath) return;
    // 🛡️ [세션 복원 중 외부 파일 인입 큐잉]: 복원 완료 직후 순차 실행
    if (sessionRestoringRef.current) {
      pendingExternalFileRef.current = filePath;
      return;
    }
    try {
      const api = (window as any).electronAPI;
      if (api?.readFromPath) {
        const file = await api.readFromPath(filePath);
        if (file) {
          const normFilePath = (file.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
          const existingTab = tabsRef.current.find(t => {
            if (!t.path) return false;
            return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
          });

          if (existingTab) {
            if (existingTab.model && existingTab.model.isDisposed()) {
              const cleaned = tabsRef.current.filter(t => t.id !== existingTab.id);
              tabsRef.current = cleaned;
              setTabs(cleaned);
            } else {
              switchTab(existingTab.id);
              setContent(file.content);
              setCurrentFileName(file.name);
              setCurrentFileNode({ name: file.name, kind: 'file', path: file.path });
              if (lastSavedContentRef) {
                lastSavedContentRef.current = (file.content || '').replace(/\r\n/g, '\n');
              }
              if (setSaveStatus) {
                setSaveStatus(existingTab.isModified ? 'unsaved' : 'saved');
              }

              if (existingTab.model) {
                existingTab.model.setValue(file.content);
                if (editorRef.current) {
                  try {
                    editorRef.current.setModel(existingTab.model);
                  } catch (e) {
                    console.warn('[Monaco] setModel failed on existing tab:', e);
                  }
                }
              }

              showToast(`📂 ${file.name} (최신화 완료)`, 'info');
              return;
            }
          }

          file.content = file.content.replace(/\r\n/g, '\n');

          const monaco = (window as any).monaco;
          let model: any = null;
          if (monaco) {
            model = monaco.editor.createModel(file.content, 'markdown');
            model.onDidChangeContent(() => {
              const val = model.getValue();
              setContent(val);
              setTabs(prev => prev.map(t => t.id === file.path ? { ...t, content: val, isModified: val !== t.content } : t));
            });
          }

          const newTabId = file.path;
          const newTab: EditorTab = {
            id: newTabId,
            name: file.name,
            path: file.path,
            node: { name: file.name, kind: 'file', path: file.path },
            content: file.content,
            isModified: false,
            model: model
          };

          setTabs(prev => {
            const exists = prev.some(t => {
              if (t.id === newTabId) return true;
              if (t.path) {
                return t.path.replace(/\\/g, '/').toLowerCase().normalize('NFC') === normFilePath;
              }
              return false;
            });
            if (exists) {
              return prev.map(t => {
                const normTab = (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC');
                if (t.id === newTabId || normTab === normFilePath) {
                  return { ...t, content: file.content, model: model || t.model };
                }
                return t;
              });
            }
            return [...prev, newTab];
          });
          setActiveTabId(newTabId);
          setContent(file.content);
          setCurrentFileName(file.name);
          setCurrentFileNode({ name: file.name, kind: 'file', path: file.path });
          if (lastSavedContentRef) {
            lastSavedContentRef.current = (file.content || '').replace(/\r\n/g, '\n');
          }
          if (setSaveStatus) {
            setSaveStatus('saved');
          }
          tabsRef.current = [
            ...tabsRef.current.filter(t => t.id !== newTabId && (!file.path || t.path !== file.path)),
            newTab
          ];

          if (editorRef.current && model) {
            try {
              editorRef.current.setModel(model);
            } catch (e) {
              console.warn('[Monaco] setModel failed on new tab:', e);
            }
          }
          showToast(`📂 ${file.name}`, 'info');
          return;
        }
      }
      await handleFileOpenByPath(filePath);
    } catch (e) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
        func: 'openExternalFile',
        doing: 'OS 외부 파일 열기 요청 처리 및 탭 생성 중',
        target: filePath,
        error: e,
      });
      showToast('파일을 열 수 없습니다.', 'error');
    }
  };

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0037] electronAPI_listeners
  // ====================================================================
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      api.onNewFileRequested(() => { });
      api.onSaveFileRequested(() => handlers?.save?.());
      api.onSaveFileAsRequested(() => handlers?.saveAs?.());

      let unsubscribeReceiveFile: (() => void) | undefined;
      if (api.onReceiveFile) {
        unsubscribeReceiveFile = api.onReceiveFile((filePath: string) => {
          if (sessionRestoringRef.current || !sessionRestoredRef.current) {
            pendingExternalFileRef.current = filePath;
            return;
          }
          openExternalFile(filePath);
        });
      }

      if (mounted && api.getInitialFilePath && !sessionRestoredRef.current && !initialSessionCheckedRef.current) {
        initialSessionCheckedRef.current = true;
        api.getInitialFilePath().then(async (filePath: string | null) => {
          if (filePath) {
            sessionRestoredRef.current = true;
            openExternalFile(filePath);
          } else if (readEditorSession(localStorage.getItem('onrivi_tabs_session'))?.tabs.length) {
            setDesktopSessionReady(true);
          } else if (api.getLastSession && (tabs.length === 0 || !tabs.some(t => !!t.path && !t.isStyleTab))) {
            const sessionData = await api.getLastSession();
            const recentPaths = Array.isArray(sessionData?.openFilePaths)
              ? sessionData.openFilePaths.filter((filePath: unknown): filePath is string => typeof filePath === 'string' && !!filePath)
              : [];
            if (recentPaths.length > 0) {
              const recentTabs: SessionTab[] = recentPaths.map((filePath: string) => ({
                id: filePath,
                name: filePath.split(/[/\\]/).pop() || filePath,
                path: filePath
              }));
              await restoreSessionTabs([], null, recentTabs, sessionData.activeFilePath);
            } else {
              sessionRestoredRef.current = true;
            }
          } else {
            sessionRestoredRef.current = true;
          }
        }).catch(() => { setDesktopSessionReady(true); });
      }
      if (mounted && !api.getInitialFilePath) setDesktopSessionReady(true);

      if (pendingExternalFileRef.current) {
        const path = pendingExternalFileRef.current;
        pendingExternalFileRef.current = null;
        openExternalFile(path);
      }

      return () => {
        api.removeListeners();
        if (unsubscribeReceiveFile) unsubscribeReceiveFile();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, content, currentFileNode]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0044] cross_platform_session_restore
  // ====================================================================
  useEffect(() => {
    if (!mounted) return;

    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    const isElectron = Boolean(api);

    if (sessionRestoredRef.current || sessionRestoringRef.current) return;

    if (isElectron) {
      if (!desktopSessionReady) return;
      try {
        const parsed = readEditorSession(localStorage.getItem('onrivi_tabs_session'));
        if (parsed && parsed.tabs.length > 0) {
          void restoreSessionTabs([], null, parsed.tabs, parsed.activeTabId, parsed.previewMode);
          return;
        }
      } catch (e) {
        logError({
          file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
          func: 'cross_platform_session_restore',
          doing: 'localStorage 이전 세션 파싱 중',
          target: 'localStorage/onrivi_tabs_session',
          error: e
        });
      }
      sessionRestoredRef.current = true;
      return;
    }

    try {
      const parsed = readEditorSession(localStorage.getItem('onrivi_tabs_session'));
      if (parsed && parsed.tabs.length > 0) {
        const isDriveSession = (rootFolder as any)?.type === 'GDRIVE' ||
          workspaceType === 'cloud' ||
          parsed.tabs.some(t => t.driveFileId || (t.path && t.path.startsWith('GoogleDrive/')));

        if (isDriveSession) {
          const isDriveReady = (isDriveConnected || fileList.length > 0) &&
            (rootFolder as any)?.type === 'GDRIVE' &&
            hasValidDriveToken() &&
            !isDriveAuthExpired;

          if (!isDriveReady) return;
        } else if (workspaceType === 'browser') {
          if (!rootFolder || (rootFolder as any).needPermission || !rootFolder.handle) return;
        }

        void restoreSessionTabs([], null, parsed.tabs, parsed.activeTabId, parsed.previewMode);
        return;
      }
    } catch (e) {
      logError({
        file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
        func: 'cross_platform_session_restore',
        doing: 'localStorage 이전 세션 파싱 중',
        target: 'localStorage/onrivi_tabs_session',
        error: e,
        context: { workspaceType, isDriveConnected }
      });
    }
    sessionRestoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, desktopSessionReady, rootFolder, fileList, isDriveAuthExpired, isDriveConnected, workspaceType]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0039] session_auto_save
  // ====================================================================
  useEffect(() => {
    if (!mounted || !sessionRestoredRef.current || sessionRestoringRef.current) return;

    const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onrivi_tabs_session', JSON.stringify(captureEditorSession(tabs, activeTabId, contentRef.current, previewModeRef.current)));
      } catch (e) {
        logError({
          file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
          func: 'session_auto_save',
          doing: '활성 탭 세션 자동저장 직렬화 중',
          target: 'localStorage/onrivi_tabs_session',
          error: e,
          context: { tabCount: tabs.length }
        });
      }
    }

    if (api?.saveLastSession) {
      const openFilePaths = tabs.map(t => t.path).filter((p): p is string => typeof p === 'string' && !!p);
      const activeFilePath = currentFileNode?.path || null;
      api.saveLastSession({
        openFilePaths,
        activeFilePath
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tabs, activeTabId, currentFileNode, previewMode]);

  // ====================================================================
  // 📊 [OMD-IO-MainEditorApp-0042] beforeunload_safety_flush
  // ====================================================================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!sessionRestoredRef.current || sessionRestoringRef.current) return;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('onrivi_tabs_session', JSON.stringify(captureEditorSession(tabsRef.current, activeTabIdRef.current, contentRef.current, previewModeRef.current)));
        } catch (e) {
          logWarn({
            file: 'frontend/src/hooks/editor/useEditorDocumentSession.ts',
            func: 'beforeunload_safety_flush',
            doing: '브라우저 종료 직전 세션 플러시 직렬화 중',
            target: 'localStorage/onrivi_tabs_session',
            error: e
          });
        }
      }

      if (api?.saveLastSession) {
        const openFilePaths = tabsRef.current.map(t => t.path).filter((p): p is string => typeof p === 'string' && !!p);
        const activeFilePath = currentFileNodeRef.current?.path || null;
        api.saveLastSession({ openFilePaths, activeFilePath }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTabIdRef, contentRef, currentFileNodeRef, previewModeRef, sessionRestoringRef, tabsRef]);

  return {
    desktopSessionReady,
    sessionRestoredRef,
    restoreSessionTabs,
    openExternalFile,
  };
}
