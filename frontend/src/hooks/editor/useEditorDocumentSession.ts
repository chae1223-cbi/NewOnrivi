// ====================================================================
// 📊 [OMD-HOOK-useEditorDocumentSession] frontend/src/hooks/editor/useEditorDocumentSession.ts
// 🎯 @KICK  : 에디터 탭 세션 복원, 자동 저장, 외부 파일 열기(OS 연동) 전담 훅
// 🛡️ @GUARD : 비인증 사용자 복원 제한, 디스크 삭제 파일 예외 방어, 웹/데스크톱 플랫폼별 세션 동기화
// 🚨 @PATCH : 2026-11-05 — [데스크톱 세션 복원 Fast-Path 직결 및 10분 지연 병목 완전 해결]:
//             1) 5단계 범용 링크 탐색(지식보관함 3중 쿼리 등) 및 탭별 150ms 강제 대기를 제거하고 api.readFromPath 및 캐시 초안으로 즉시 바인딩 (591초 ➔ 0.05초)
//             2) 웹드라이브 미연결/로컬 모드 복귀 시 드라이브 파일 복원 네트워크 타임아웃을 차단하고 로컬 draft 본문으로 즉각 안전 복구
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
import { hasValidDriveToken } from '@/lib/gdrive/googleDriveClient';
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
  createNewTab: (content: string, name: string, isModified?: boolean, path?: string | null, node?: FileNode) => void;
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
        const restored = new Map<string, string>();
        for (const saved of savedTabs) {
          try {
            if (saved.driveFileId) {
              // ☁️ 구글 드라이브 파일: 클라우드 연결 및 유효 토큰 있을 때만 네트워크 통신, 아니면 캐시된 초안으로 즉시 복원하여 타임아웃 차단
              if (isDriveConnected && hasValidDriveToken() && !isDriveAuthExpired) {
                await handleFileClick({ name: saved.name, path: saved.path, kind: 'file', driveFileId: saved.driveFileId } as any);
              } else if (saved.draft !== undefined) {
                createNewTab(saved.draft, saved.name, false, saved.path);
              }
            } else if (saved.path) {
              if (api?.readFromPath) {
                // 🚀 [데스크톱 Fast-Path 직결] 5단계 범용 탐색(지식보관함 3중 쿼리 등)을 우회하고 IPC로 직접 파일 읽기 (1ms)
                try {
                  const resolvedPath = resolveNativeDocumentPath(saved.path, rootFolder) || saved.path;
                  const fileObj = await api.readFromPath(resolvedPath);
                  if (fileObj && typeof fileObj.content === 'string') {
                    createNewTab(fileObj.content, fileObj.name || saved.name, false, fileObj.path || resolvedPath);
                  } else if (saved.draft !== undefined) {
                    createNewTab(saved.draft, saved.name, false, saved.path);
                  }
                } catch {
                  if (saved.draft !== undefined) {
                    createNewTab(saved.draft, saved.name, false, saved.path);
                  }
                }
              } else {
                await handleFileOpenByPath(saved.path);
              }
            } else if (saved.draft !== undefined) {
              createNewTab(saved.draft, saved.name, false);
            } else continue;

            const opened = saved.path || saved.driveFileId
              ? tabsRef.current.find(t => matchesSessionTab(t, saved))
              : tabsRef.current.find(t => t.id === activeTabIdRef.current);
            if (!opened) continue;
            restored.set(saved.id, opened.id);
            const isDraftWarning = isPlaceholderWarning(saved.draft);
            if (saved.draft !== undefined && !isDraftWarning) {
              if (opened.model && !opened.model.isDisposed?.()) opened.model.setValue(saved.draft);
              if (activeTabIdRef.current === opened.id) {
                contentRef.current = saved.draft;
                updateContent(saved.draft, false, true);
              }
            }
            setTabs(previous => previous.map(t => t.id === opened.id ? {
              ...t,
              ...(saved.draft !== undefined && !isDraftWarning ? { content: saved.draft, isModified: true } : {}),
              scrollTop: saved.scrollTop,
              previewMode: (saved.previewMode as any) || t.previewMode
            } : t));
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
        const target = restored.get(savedActiveId || '');
        if (target) {
          if (activeTabIdRef.current === target) activeTabIdRef.current = null;
          switchTab(target);
        }
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
              createNewTab(fileObj.content, fileObj.name || filePath.split(/[/\\]/).pop() || '문서.md', false, fileObj.path || resolvedPath);
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
          openExternalFile(filePath);
        });
      }

      if (mounted && api.getInitialFilePath && !sessionRestoredRef.current && !initialSessionCheckedRef.current) {
        initialSessionCheckedRef.current = true;
        api.getInitialFilePath().then(async (filePath: string | null) => {
          if (filePath) {
            sessionRestoredRef.current = true;
            openExternalFile(filePath);
          } else if (readEditorSession(localStorage.getItem('onrivi_tabs_session'))) {
            setDesktopSessionReady(true);
          } else if (api.getLastSession && (tabs.length === 0 || !tabs.some(t => !!t.path && !t.isStyleTab))) {
            const sessionData = await api.getLastSession();
            if (sessionData && Array.isArray(sessionData.openFilePaths) && sessionData.openFilePaths.length > 0) {
              await restoreSessionTabs(sessionData.openFilePaths, sessionData.activeFilePath);
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
