// @ts-nocheck
import { useRef, useEffect, useCallback } from 'react';
import { EditorTab } from '@/components/UnifiedTabBar';
import { FileNode } from '@/lib/indexedDbHelper';
import { getWelcomeContent } from "@/constants/welcomeContent";
import { vfsReadFile } from '@/lib/virtualFileSystem';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { syncVisualSourceModel } from '@/lib/incrementalVisualModel';

/**
 * [OMD-HOOK-0003] useEditorTabs 커스텀 훅
 * @description Monaco Editor의 가상 모델 다중 탭 관리와 관련된 상태 및 로직을 통합 관리합니다.
 * @note tabs/setTabs/activeTabId/setActiveTabId는 외부(MainEditorApp)에서 주입받습니다.
 *       TDZ 방지를 위해 최상위 컴포넌트에서 상태를 선언하고 훅에 전달합니다.
 */
// ====================================================================
// 📊 [OMD-HOOK-0003] useEditorTabs.ts ➔ useEditorTabs
// 🎯 @KICK  : Monaco 에디터 가상 모델 다중 탭 관리 — 탭 전환·생성·콘텐츠 동기화
// 🛡️ @GUARD : tabs/setTabs/activeTabId/setActiveTabId 외부 주입으로 TDZ 원천 차단
// 🚨 @PATCH : **2026-10-19** — [Visual Editor 모델 동기화 역류(Echo) 방어 가드 탑재]:
//             1) syncVisualSourceModel 실행 중 __isSyncingVisualModel 플래그를 활성화하여 Monaco onDidChangeContent가 setContent 및 setTabs를 중복 발화하는 역류 루프 완전 차단
// 🚨 @PATCH : **2026-10-17** — [탭 전환 및 새 탭 생성 시 물리 파일 노드(FileNode) 바인딩 및 탭 ID 정합성 보장]:
//             1) switchTab 시 targetTab.node가 비어있더라도 targetTab.path가 존재하면 FileNode를 자동 복원 주입하여 currentFileNode가 null로 유실되어 자동 저장이 정지되는 결함 해결
//             2) createNewTab 시 path만 전달되더라도 effectiveNode를 자동 생성하고, 기존 탭 재사용 시 신규 tabId가 아닌 existing.id를 활성화하도록 수정하여 활성 탭 ID 미아 버그 및 파일 저장 공통 다이얼로그 팝업 결함 원천 해결
// 🚨 @PATCH : **2026-09-26** — [경로 기준 중복 탭 생성 방어 가드]: createNewTab 호출 시 전달된 path를 기준으로 prev 배열에 동일 파일 탭이 이미 존재하는 경우 새 탭을 추가하지 않고 기존 탭 모델/내용을 갱신하도록 보강
// 🚨 @PATCH : **2026-07-04** — 서식설정(isStyleTab) 탭 전환 시 에디터 뷰캐시(viewState) 저장/복원 로직 탑재 및 모델 바인딩 예외 처리 패치 | 2026-06-15 — 내부 useState 제거 → 외부 주입 방식으로 전환 | MainEditorApp L526 tabMetadata_sync가 useEditorTabs 선언 전에 setTabs/activeTabId 참조하여 rS TDZ 에러 발생
//              **2026-07-07** — [BUG#1] activeTabIdRef 초기값 null → activeTabId 수정 (useEffect 비동기 갱신 지연으로 early return 미작동 원인 제거)
//              **2026-07-07** — [BUG#2] 동일 탭 재클릭 시 완전 early return; 가상 탭(path=null+model=null) Monaco 작업 건너뜀
//              **2026-07-07** — [BUG#3] createNewTab onDidChangeContent에 preview 가드 추가 (preview 모드에서 setValue("")로 content 초기화 방지)
// 🔗 @CALLS : getWelcomeContent, monaco.editor.createModel
// ====================================================================
export const useEditorTabs = (
  editorRef: any,
  setContent: (val: string) => void,
  setCurrentFileName: (name: string) => void,
  setCurrentFileNode: (node: FileNode | null) => void,
  isEditorMountedRef: any,
  previewModeRef: any,
  previewDebounceRef: any,
  isComposingRef: any,
  workspaceType: string,
  showToast: (msg: string, type?: string) => void,
  getRelativePath: (from: string | null | undefined, to: string) => string,
  // 💡 [TDZ 방어] 외부에서 주입되는 탭 상태 - MainEditorApp에서 최상단 const로 선언됨
  tabs: any[],
  setTabs: (fn: any) => void,
  activeTabId: string | null,
  setActiveTabId: (id: string | null) => void,
  setPreviewModeRaw?: (mode: any) => void
) => {
  const tabsRef = useRef<EditorTab[]>([]);
  // 🛡️ [BUG FIX 2026-07-07] 기존 null 초기값은 첫 렌더 직후 탭 클릭 시 useEffect 갱신이
  // 아직 실행되지 않아 activeTabIdRef.current=null 상태에서 early return이 미작동했음.
  // activeTabId를 초기값으로 직접 설정하여 동기화 지연 버그를 완전 제거합니다.
  const activeTabIdRef = useRef<string | null>(activeTabId);

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  // ====================================================================
  // 📊 [OMD-FILE-USEEDITORTABS-0003] useEditorTabs.ts ➔ updateContent
  // 🎯 @KICK  : 에디터/외부에서 콘텐츠 변경 시 탭 상태와 Monaco 모델을 디바운스하여 동기화
  // 🛡️ @GUARD : isEditorMounted, previewMode, isComposing 상태에 따른 early return
  // 🚨 @PATCH : 2026-09-05 - [한글 IME 조합 중 preview DOM 정지 결함 해결] isComposingRef.current 가드 제거하여 한글 타이핑 중에도 100ms 디바운스 후 setContent 및 preview DOM 갱신이 즉시 실행되도록 수정; 이전에는 한글 조합 중 preview가 완전히 멈추던 결함 완전 해결
  // 🔗 @CALLS : setContent, setTabs
  // ====================================================================
  const updateContent = useCallback((newValue: string, fromEditor: boolean = false, incrementalVisual: boolean = false) => {
    if (fromEditor && !isEditorMountedRef.current) return;
    if (fromEditor && previewModeRef.current === 'preview') return;

    if (fromEditor) {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);

      previewDebounceRef.current = setTimeout(() => {
        if (!isEditorMountedRef.current) return;
        if (previewModeRef.current === 'preview') return;
        setContent(newValue);
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: newValue, isModified: true } : t));
      }, 100);
    } else {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      setContent(newValue);
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: newValue } : t));
      if (editorRef.current && editorRef.current.getValue() !== newValue) {
        const model = editorRef.current.getModel?.();
        if (incrementalVisual && model?.pushEditOperations && !model.isDisposed?.()) {
          (model as any).__isSyncingVisualModel = true;
          syncVisualSourceModel(model, newValue);
          requestAnimationFrame(() => {
            if (model && !model.isDisposed?.()) {
              (model as any).__isSyncingVisualModel = false;
            }
          });
          // This edit is already reflected in React and the active tab. Do not
          // repeat it through the source editor's preview debounce listener.
          if (previewDebounceRef.current) { clearTimeout(previewDebounceRef.current); previewDebounceRef.current = null; }
        } else editorRef.current.setValue(newValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setContent, isEditorMountedRef, previewModeRef, previewDebounceRef, isComposingRef, editorRef]);

  // ====================================================================
  // 📊 [OMD-FILE-USEEDITORTABS-0002 ✅ FIXED] useEditorTabs.ts ➔ switchTab
  // 🎯 @KICK  : 특정 탭으로 전환하며 스크롤 위치와 Monaco 모델을 복원. 탭 종류별 자동 모드 전환 (css-style↔both, help→preview)
  // 🛡️ @GUARD : 대상 탭 미존재 시 early return; 도움말 탭('도움말.md')은 preview 강제, css-style/도움말 탭 이탈 시 both 복원
  // 🚨 @PATCH : 도움말 탭 preview 모드 강제 + 모드 자동 전환 통합 (2026-06-17); isDisposed() 가드로 Model is disposed! 크래시 방지 (2026-06-18);
  //              **2026-07-07** — 동일 탭 재클릭 완전 early return; 가상 탭(path=null+model=null) Monaco 작업 전체 건너뜀
  //              (editor.setValue가 다른 탭 모델에 값을 쓰고 onDidChangeContent를 발화하여 content 초기화 유발하는 근본 원인 제거)
  // 🔗 @CALLS : setContent, setCurrentFileName, setCurrentFileNode, setPreviewModeRaw
  // ====================================================================
  const switchTab = useCallback((tabId: string) => {
    // 🛡️ [BUG FIX] 이미 활성화된 탭 재클릭 → 완전 무시
    if (activeTabIdRef.current === tabId) return;

    const targetTab = tabsRef.current.find(t => t.id === tabId);

    const monaco = (window as any).monaco;
    const editor = editorRef.current;

    // 💡 탭 전환 직전 현재 에디터 상태 및 스크롤 위치 완전 복원용 캐싱
    if (editor && activeTabIdRef.current) {
      const currentScrollTop = editor.getScrollTop();
      const currentViewState = editor.saveViewState();
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, scrollTop: currentScrollTop, viewState: currentViewState } : t));
    }

    // 현재 탭의 에디터 내용을 React 상태에 동기화 (모드 전환 시 데이터 유실 방지)
    // 🛡️ [BUG FIX 2026-07-07] 가상 탭(path=null, model=null)은 editor.getValue()가 빈 문자열을
    // 반환하므로 content를 덮어쓰지 않음 (탭 내용이 소멸하는 현상 방지)
    if (editor && (previewModeRef.current === 'css-style' || previewModeRef.current === 'preview')) {
      const prevTab = tabsRef.current.find(t => t.id === activeTabIdRef.current);
      const isPrevVirtual = prevTab && !prevTab.path && !prevTab.model;
      if (!isPrevVirtual) {
        const latestVal = editor.getValue();
        if (activeTabIdRef.current) {
          setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, content: latestVal } : t));
        }
      }
    }

    setActiveTabId(tabId);

    if (!targetTab) return;

    // 💡 서식설정 탭(isStyleTab)일 때는 에디터 상태 복원을 스킵합니다.
    if (targetTab.isStyleTab) {
      setContent('');
      setCurrentFileName(targetTab.name);
      setCurrentFileNode(null);
      return;
    }

    // 🛡️ [BUG FIX 2026-07-07] 가상 탭(path=null, model=null, no isStyleTab)의
    // content가 빈 문자열이면 getWelcomeContent()로 복원 (editor.getValue()가 빈 문자열을
    // 반환하여 tabs에 content=""가 저장된 후 switchTab이 이를 다시 setContent()하는 사이클 차단)
    let resolvedContent = targetTab.content;
    const isVirtualTabResolve = !targetTab.path && !targetTab.model;
    if (isVirtualTabResolve && !targetTab.isStyleTab && resolvedContent === undefined) {
      resolvedContent = getWelcomeContent();
    }
    setContent(resolvedContent);
    setCurrentFileName(targetTab.name);
    const resolvedNode: FileNode | null = targetTab.node || (targetTab.path ? { name: targetTab.name, path: targetTab.path, kind: 'file' } : null);
    if (!targetTab.node && resolvedNode) {
      targetTab.node = resolvedNode;
    }
    setCurrentFileNode(resolvedNode);

    // 💡 도움말 문서 탭으로 전환할 때는 예외적으로 무조건 미리보기(preview) 모드를 강제 지정합니다.
    if (targetTab.name === '도움말.md' && setPreviewModeRaw) {
      setPreviewModeRaw('preview');
      previewModeRef.current = 'preview';
    }

    // 🛡️ [BUG FIX 2026-07-07] 가상 탭(path=null, model=null): Monaco 작업 전체 건너뜀
    // editor.setValue()는 현재 연결된 다른 탭의 모델에 값을 덮어쓰고
    // 그 모델의 onDidChangeContent를 발화시켜 content가 꼬이는 원인이 됩니다.
    const isVirtualTab = !targetTab.path && !targetTab.model;
    if (isVirtualTab) return;

    if (editor && monaco && targetTab.model && !targetTab.model.isDisposed()) {
      editor.setModel(targetTab.model);
      if (targetTab.viewState) {
        requestAnimationFrame(() => {
          editor.restoreViewState(targetTab.viewState);
        });
      } else if (targetTab.scrollTop !== undefined) {
        requestAnimationFrame(() => {
          editor.setScrollTop(targetTab.scrollTop || 0);
        });
      }
    } else if (editor) {
      editor.setValue(targetTab.content);
    }

    // 탭에 모델이 없으면 생성
    if (monaco && targetTab && !targetTab.model) {
      const newModel = monaco.editor.createModel(targetTab.content, 'markdown');
      newModel.onDidChangeContent(() => {
        // 🛡️ [BUG FIX 2026-07-07] preview 모드 / 비마운트 시 content 업데이트 차단
        if (!isEditorMountedRef.current) return;
        if (previewModeRef.current === 'preview') return;
        const val = newModel.getValue();
        setContent(val);
        setTabs(prev => prev.map(t => t.id === targetTab.id ? { ...t, content: val, isModified: val !== t.content } : t));
      });
      (targetTab as any).model = newModel;
      tabsRef.current = tabsRef.current.map(t => t.id === targetTab.id ? { ...t, model: newModel } : t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef, setContent, setCurrentFileName, setCurrentFileNode, previewModeRef, setPreviewModeRaw, isEditorMountedRef]);

  // ====================================================================
  // 📊 [OMD-FILE-USEEDITORTABS-0001 ✅ FIXED] useEditorTabs.ts ➔ createNewTab
  // 🎯 @KICK  : 새 탭을 생성하고 Monaco 모델을 만들어 에디터에 연결. 탭 종류/출발 탭에 따라 모드 자동 전환
  // 🛡️ @GUARD : monaco 미존재 시 모델 없이 탭만 생성; 도움말 탭 생성 시 preview 강제, css-style 출발 시 both 복원
  // 🚨 @PATCH : 모드 자동 전환 로직 추가; prevTabId를 modeTransition 이전에 캡처하도록 순서 수정 (2026-06-17); onDidChangeContent 핸들러 isModified: true → val !== t.content 비교로 전환 (2026-06-18)
  //              **2026-07-07** — onDidChangeContent에 isEditorMountedRef/preview 가드 추가
  //              (preview 모드에서 model.getValue()가 부정확한 값을 반환하여 content 초기화 유발하는 버그 방지)
  // 🔗 @CALLS : getWelcomeContent, setContent, setTabs, setActiveTabId, setCurrentFileName, setCurrentFileNode, setPreviewModeRaw
  // ====================================================================
  const createNewTab = useCallback((initialContent?: string, name?: string, isStyleTab?: boolean, path?: string | null, node?: FileNode | null) => {
    const monaco = (window as any).monaco;
    const contentVal = initialContent !== undefined ? initialContent : getWelcomeContent();
    const tabName = name || '새 파일.md';
    const tabId = 'new-tab-' + Date.now();

    let model: any = null;
    if (monaco) {
      model = monaco.editor.createModel(contentVal, 'markdown');
      model.onDidChangeContent(() => {
        // 🛡️ [BUG FIX 2026-07-07] preview 모드 / 비마운트 시 content 업데이트 차단
        // preview 모드에서 model.getValue()가 ""를 반환하거나 부정확한 값을 반환하여
        // setContent("")가 호출되어 내용이 사라지는 버그 방지
        if (!isEditorMountedRef.current) return;
        if (previewModeRef.current === 'preview') return;
        if ((model as any).__isSyncingVisualModel) return;
        const val = model.getValue();
        setContent(val);
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, content: val, isModified: val !== t.content } : t));
      });
    }

    const effectiveNode: FileNode | null = node || (path ? { name: tabName, path: path, kind: 'file' } : null);

    const newTab: EditorTab = {
      id: tabId,
      name: tabName,
      path: path || null,
      node: effectiveNode,
      content: contentVal,
      isModified: false,
      model: model,
      previewMode: previewModeRef.current, // 💡 현재 하단 상태표시줄 등에 설정된 UI 모드를 새 탭에 기본 할당하여 유지
      isStyleTab: isStyleTab || false
    };

    if (setPreviewModeRaw) {
      // 💡 도움말 문서 등 특정 고유 탭은 강제로 미리보기('preview') 모드로 설정되게 처리
      if (tabName === '도움말.md') {
        newTab.previewMode = 'preview';
        setPreviewModeRaw('preview');
        previewModeRef.current = 'preview';
      }
    }

    if (path) {
      const normNew = path.replace(/\\/g, '/').toLowerCase().normalize('NFC');
      const existing = tabsRef.current?.find(t => (t.path || '').replace(/\\/g, '/').toLowerCase().normalize('NFC') === normNew);
      if (existing) {
        const mergedNode = effectiveNode || existing.node;
        setTabs(prev => prev.map(t => t.id === existing.id ? { ...t, content: contentVal, model: model || t.model, node: mergedNode, path: path } : t));
        setActiveTabId(existing.id);
        setContent(contentVal);
        setCurrentFileName(existing.name || tabName);
        setCurrentFileNode(mergedNode);
        if (editorRef.current && (model || existing.model)) {
          try {
            editorRef.current.setModel(model || existing.model);
          } catch {}
          requestAnimationFrame(() => {
            editorRef.current.setScrollTop(0);
          });
        }
        return;
      }
    }

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);

    setContent(contentVal);
    setCurrentFileName(tabName);
    setCurrentFileNode(effectiveNode);

    if (editorRef.current && model) {
      editorRef.current.setModel(model);
      requestAnimationFrame(() => {
        editorRef.current.setScrollTop(0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef, setContent, setCurrentFileName, setCurrentFileNode, previewModeRef, setPreviewModeRaw, isEditorMountedRef]);

  return {
    tabsRef,
    activeTabIdRef,
    updateContent,
    switchTab,
    createNewTab
  };
};
