/**
 * 프로그램명 : OnriviAuthor
 * 파일명     : frontend/src/hooks/editor/useEditorDocumentSession.ts
 * 용도       : 에디터 탭 세션 복원, 자동 저장, 외부 파일 열기(OS 연동) 전담 훅
 * 작성일     : 2026-11-04
 * 
 * 🚨 @PATCH : **2026-11-04** — [MainEditorApp 모듈화] 세션 복원 및 외부 파일 오픈 파이프라인을 useEditorDocumentSession 훅으로 분리 위임
 *             1) restoreSessionTabs: 이전 세션 탭 목록 일괄 복원 및 Monaco 모델 바인딩 분리
 *             2) openExternalFile: OS 더블클릭/외부 파일 오픈 및 탭 자동 생성/포커스 분리
 *             3) electronAPI_listeners: Electron 메인 프로세스 IPC(더블클릭 파일 수신, 최초 세션 복구) 분리
 *             4) cross_platform_session_restore: 웹(웹드라이브 연결 시점 대기) 및 데스크톱 로컬 세션 복원 분리
 *             5) session_auto_save & beforeunload_safety_flush: 탭 세션 실시간 저장 및 브라우저 종료 직전 긴급 플러시 분리
 */

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

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0043] restoreSessionTabs
  // 🎯 @KICK  : 앱 재시작 시, 이전 세션의 파일 목록 전체를 일괄 로드하여 탭 리스트를 생성 및 바인딩.
  //             단일 일괄 트랜잭션 처리로 React 상태 갱신 배치 충돌 및 Monaco 모델 중복 방지.
  // 🛡️ @GUARD : 비인증 사용자 복원 제한, 디스크 삭제 파일 예외 가드.
  // ====================================================================
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
      if (savedTabs) {
        const restored = new Map<string, string>();
        for (const saved of savedTabs) {
          try {
            if (saved.driveFileId) {
              await handleFileClick({ name: saved.name, path: saved.path, kind: 'file', driveFileId: saved.driveFileId } as any);
            } else if (saved.path) {
              await handleFileOpenByPath(saved.path);
            } else if (saved.draft !== undefined) {
              createNewTab(saved.draft, saved.name, false);
            } else continue;

            await new Promise(resolve => setTimeout(resolve, 150));
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
            await new Promise(resolve => setTimeout(resolve, 0));
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
        if (handleFileOpenByPath) {
          await handleFileOpenByPath(filePath);
          await new Promise(resolve => setTimeout(resolve, 150));
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

  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0038] openExternalFile
  // 🎯 @KICK  : OS 수준 더블클릭 또는 명령줄에서 파일 열기, Monaco 모델로 탭 생성
  // 🛡️ @GUARD : 중복 탭 방지 및 기존 탭 발견 시 최신 컨텐츠 강제 플러시 갱신
  // ====================================================================
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
    const isElectron = !api;

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
