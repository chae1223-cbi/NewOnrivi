/**
 * ============================================================================
 * 🏷️ 파일명 : MainEditorApp.tsx
 * 🎭 역할(Role) : Container (컨트롤 타워)
 * 🎯 주요기능 :
 *   - 온리비 어서(Onrivi Author) 메인 에디터 전역 상태 조율 및 도메인 훅(15종) 오케스트레이션
 *   - EditorProvider 컨텍스트 공급 및 하위 역할 컴포넌트(EditorLayout, EditorCore, EditorOverlayManager, GuestPaywallOverlay) 렌더링 위임
 *   - 보기 모드(edit / both / preview / css-style) 전환 가드, 탭 닫기, 다중 파일 병합 선택, 플로팅 툴바 실행 제어
 * 🚨 @PATCH :
 *   - 2026-11-07 : [플로팅 툴바 실행 후 포커스 유지]: executeFloatingItem에서 서식 적용 후에도 플로팅 툴바 버튼에 포커스를 유지하고, ESC로 닫을 때만 에디터 호출 위치로 포커스 복원
 *   - 2026-11-05 : useEditorTabs에 컨테이너의 탭·활성 탭 참조를 전달하여 세션 복원 시 동일한 탭을 조회하도록 수정
 *   - 2026-11-04 : 로컬 작업장 사용 시 미접속 웹드라이브 토큰 갱신(initDriveTokenAutoRefresh) 및 클라우드 모드 오인식 방어 가드 추가
 *   - 2026-11-04 : 주석 표준화(1·2단계) 및 Log-First(logError/logWarn) 에러 진단 로깅 일괄 반영, 분리 이관된 레거시 패치 주석 정리
 *   - 2026-11-04 : 역할 기반 아키텍처(Container-Layout-Core-Manager) 및 12개 도메인 훅(useEditor*) 모듈화 분리 위임 완료
 * ============================================================================
 */

// @ts-nocheck

"use client";
import { isBundledDocumentPath } from '@/lib/bundledDocument';
import { clearMarkdownFormatting } from '@/lib/clearMarkdownFormatting';
import { reportNumberingCss } from '@/lib/reportNumbering';
import { flashPreviewHighlight } from '@/lib/previewHighlight';
import { headingNumberingCss, createHeadingNumberer, syncMarkdownHeadingNumbers } from '@/lib/headingNumbering';
// next.js의 규칙, 이 페이지는 client side에서 렌더링됨. 
//지시어 종류실행 및 렌더링 위치설명 및 아키텍처적 역할"use client";
//최종 유저의 웹 브라우저자바스크립트 Hooks(useState, useEffect)를 허용하고, 마우스 클릭·키보드 타이핑 등 실시간 UI 인터랙션을 처리할 때 선언합니다.
//"use server";백엔드 Node.js 서버프론트엔드(브라우저)에서 백엔드 서버의 함수를 마치 API 호출하듯이 다이렉트로 안전하게 원격 실행할 수 있게 만드는 서버 
//액션(Server Actions) 전용 지시어입니다. (보안 키 검증, DB 직접 CRUD 시 사용)

/** ======================================================================== 
 * 참고 
 *  src/lib/api.ts -> api 서버 경로
 * =========================================================================
*/

import {loadBibliographyFiles} from '@/lib/bibliographyStorage';
import { browserAccountStorage as localStorage, browserAccountSessionStorage as sessionStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings, saveResourceSettings, requireResourceSettings, getResourceEnvironment, activateDriveAccount } from '@/lib/resourceSettings';
import { importedCheckboxEdit } from '@/lib/importCheckboxes';
import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback, useDeferredValue } from 'react';   // 리액트 훅 - 상태관리, 렌더링 제어 등
import Editor, { loader } from '@monaco-editor/react'; // 모나코 에디터 - 코드 편집기
import MarkdownViewer, { isPathInsideWorkspace } from '@/components/MarkdownViewer'; // 마크다운 뷰어 - 마크다운 뷰어
import { createPortal } from 'react-dom';
import VisualDocumentEditor from '@/components/VisualDocumentEditor';
import { mediaSourceRange } from '@/lib/mediaSourceRange';
import { saveResourceMedia, parseDroppedDataToBlob, fetchExternalImageFile } from '@/lib/resourceMedia';
import { imageResourceName, picturebookImageReference } from '@/lib/imageResourceName';
import { visualImageDetails } from '@/lib/visualDocumentCodec';
import InlineAIAssistant from '@/components/ai/InlineAIAssistant';
import {captureMonacoAITarget} from '@/lib/ai/monacoTarget';
import { syncPreviewInterpolated } from '@/lib/syncEngine'; // 구간 선형 보간 동기화 엔진
import Script from 'next/script'; // 넥스트 스크립트 - 
import 'katex/dist/katex.min.css'; // 카텍스 스타일 - 수학 공식 렌더링
// import 'highlight.js/styles/github.css'; // 코드 하이라이팅 스타일

/**
 * ==================================================================================
 * 아이콘 라이브러리 - lucide-react 
 * PanelLeft as SidebarIcon, FileText, Copy, Check, Folder, Plus, FolderPlus, Edit2,
  ChevronRight, ChevronDown, FileJson, FileCode, FileType, File, Trash2,
  Layers, X
 * ==================================================================================
 */


/**
 * ==================================================================================
 * 프로젝트 내부 모듈 @가 있는 내부 components 참조선언
 * ==================================================================================
 */
import { EditorProvider } from '@/context/EditorContext';
import { useModalEscape } from '@/hooks/useModalEscape';
import { useMonacoSetup } from '@/hooks/editor/useMonacoSetup';
import { useUIStore } from '@/store/useUIStore';
import { useToast } from '@/components/ToastProvider';  // 토스트 메시지
import { msg } from '@/lib/systemMessages'; // 메시지
import { browserSessionPolling } from '@/lib/sessionPolling';
import { getApiUrl } from '@/lib/apiUrlBuilder'; // api 서버 경로
import { exportPDF, exportHTML, exportEPUB, exportPNG } from '@/lib/exportHandlers'; // 파일 내보내기 핸들러
import { serializeDocumentForClipboard, copyFormattedDocumentToClipboard } from '@/lib/clipboardExport';
import { configureMonacoEnvironment } from '@/lib/monacoEnv'; // Monaco 환경 설정
import { idb, FileNode, scanDirectory, scanDirectoryDeep, getFileIcon } from '@/lib/indexedDbHelper'; // indexedDB 헬퍼
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient'; // 지식 베이스 클라이언트
import { preprocessMarkdownForPreview, stripFrontmatter, getCodeBlockLineMask } from "@/lib/editorUtils"; // 마크다운 프리뷰
import { syncPreviewFromEditorScroll, syncPreviewToTargetLine } from "@/lib/syncEngine"; // 동기화 엔진
import { configuredHotkeyItem, getSlashCommands, getDefaultHotkeys, getDefaultCommands, TOOLBAR_ITEMS } from "@/lib/toolbarConfig"; // 툴바 설정
import { EDITOR_THEMES, THEME_MAP, applySafeMarkdownMonarchTokenizer } from "@/lib/editorThemes"; // 에디터 테마
import { CssProfile } from "@/types/cssProfile"; // css 프로필 타입
import { DEFAULT_PROFILE, SYSTEM_PROFILES, isSystemProfileId, normalizeCssProfile, resolveCssProfile } from "@/constants/cssProfile";
import { generateDynamicCss } from '@/lib/dynamicCssGenerator'; // 기본 프로필
import { WELCOME_CONTENT } from "@/constants/welcomeContent"; // 웰컴 컨텐츠
import { PAPER_SIZES } from "@/constants/paperSizes";
import { getWelcomeContent, saveWelcomeContent } from "@/constants/welcomeContent"; // 웰컴 컨텐츠
import { getVfsFiles, vfsReadFile, vfsWriteFile, vfsCreateFile, vfsCreateFolder } from '@/lib/virtualFileSystem'; // 가상 파일 시스템 헬퍼
import { clearAuthSessionStorage } from '@/lib/authSessionHelper';

import FileTreeItem from '@/components/FileTreeItem'; // 파일 트리 아이템
import ExportModal from '@/components/ExportModal'; // 모달
import OAIcon from './icon_onriveauther.png'; // 아이콘 
import { ONRIVI_AI_MODELS, DEFAULT_AI_MODEL, getCachedAIModels, normalizeAIModelName, fetchGoogleAIStudioModels, ensureDecryptedApiKey } from '@/lib/gemini';

// 분리된 컴포넌트들 임포트
import MenuBar from '@/components/MenuBar'; // 메뉴바
import Toolbar from '@/components/Toolbar'; // 툴바
import { resolveNativeDocumentPath } from '@/lib/nativeDocumentPath';
import EmojiPanel from '@/components/EmojiPanel';
import { Icon } from '@/components/icons/Icon';

import StatusBar from '@/components/StatusBar'; // 상태바
import ImageModal from '@/components/ImageModal'; // 모달
import MapModal from '@/components/MapModal'; // 모달
import TableModal from '@/components/TableModal'; // 모달
import SettingsModal from '@/components/SettingsModal'; // 모달
import GlobalSearch from '@/components/GlobalSearch'; // 모달
import LeftSidebar from '@/components/LeftSidebar'; // 모달
import FormulaModal from '@/components/FormulaModal'; // 모달
import MergeModal from '@/components/MergeModal'; // 모달
import YoutubeModal from '@/components/YoutubeModal'; // 모달
import LicenseModal from '@/components/LicenseModal'; // 라이선스 모달
import AIDraftModal from '@/components/AIDraftModal'; // 초안 생성 모달
import CalendarModal from '@/components/CalendarModal'; // 달력 모달
import DateTimeInsertPicker from '@/components/DateTimeInsertPicker';
import { supabase } from '@/lib/supabaseClient';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { loadResourceAICredentials, deleteResourceAICredentials, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import UnifiedTabBar, { EditorTab } from '@/components/UnifiedTabBar';
import * as utilsPasteHandlers from '@/utils/pasteHandlers';
import { htmlToImportMarkdown, importHtmlWithImages } from '@/lib/importHtmlMarkdown';
import * as utilsEditorActions from '@/utils/editorActions';
import { useEditorFormatting } from '@/hooks/editor/useEditorFormatting';
import { useEditorPreviewSync } from '@/hooks/editor/useEditorPreviewSync';
import { applyMarkdownDecorations } from '@/utils/monacoDecorations';
import { useEditorGuestMode } from '@/hooks/editor/useEditorGuestMode';
import GuestPaywallOverlay from '@/components/editor/GuestPaywallOverlay';
import { useEditorResourceFolder } from '@/hooks/editor/useEditorResourceFolder';
import { useEditorLifecycleEffects } from '@/hooks/editor/useEditorLifecycleEffects';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useEditorSettings } from '@/hooks/useEditorSettings';
import { useEditorHandlers } from '@/hooks/useEditorHandlers';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { useEditorKeybindings } from '@/hooks/useEditorKeybindings';

// ====================================================================
// 🚀 [리팩토링 V2 이관 준비] 새로 생성된 모듈 Import
// 기존 하드코딩된 상태와 뷰를 이 파일들로 점진적으로 마이그레이션해야 합니다.
// ====================================================================
import { useEditorAuth } from '@/hooks/editor/useEditorAuth';
import { useEditorLicense } from '@/hooks/editor/useEditorLicense';
import { useEditorCommands } from '@/hooks/editor/useEditorCommands';
import { useEditorPaste } from '@/hooks/editor/useEditorPaste';
import { useEditorSaveActions } from '@/hooks/editor/useEditorSaveActions';
import { useEditorDocumentSession } from '@/hooks/editor/useEditorDocumentSession';
import { mapIdToCommandType as importedMapIdToCommandType } from '@/types/editorCommand';
import { useEditorModals } from '@/hooks/editor/useEditorModals';
import { useEditorDocLinks } from '@/hooks/editor/useEditorDocLinks';
import { useEditorProfiles } from '@/hooks/editor/useEditorProfiles';
// import EditorLayout from '@/components/editor/layout/EditorLayout';
// import EditorCore from '@/components/editor/core/EditorCore';
import EditorOverlayManager from '@/components/editor/EditorOverlayManager';
import EditorLayout from '@/components/editor/EditorLayout';
import EditorCore from '@/components/editor/EditorCore';
import NewDocumentModal from '@/components/NewDocumentModal';
import { extractFrontmatter, updateCssProfileInFrontmatter } from '@/lib/frontmatter';
import { documentBookProfile, writeBookProfileSnapshot, legacyBookProfile, parseBookScenes, replaceSceneImage } from '@/lib/picturebook';
import { KnowledgeHubView } from '@/components/knowledge/KnowledgeHubView';
import { useSingleTabGuard } from '@/lib/singleTabGuard';
import { saveExternalFileHandle } from '@/lib/storage/externalFileStore';
import { PreviewToolbar } from '@/components/preview/PreviewToolbar';
import { PreviewFindWidget } from '@/components/preview/PreviewFindWidget';
import { fetchUserProfiles, persistUserProfiles, getEffectiveResourceFolder, getProfileResourceFolder } from '@/lib/profileStorage';
import { setProfileReadStatus } from '@/lib/profileReadStatus';
import { logError, logWarn } from '@/lib/errorDiagnostics';
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  readDriveFileContent,
  uploadDriveImage,
  initDriveTokenAutoRefresh
} from '@/lib/gdrive/googleDriveClient';


/**
 * ==================================================================================
 * 타입 선언
 * ==================================================================================
 */

/**
 * @fileType 
 *  @File 
 *  @Description 
 *  @Link https://onrivi.com/documentation/workflow/workflow/20240320123456-editorcommandtypes
 *  @note @/app/page.tsx에서 명령어를 직접 사용하는 대신 @/lib/editorCommandType.ts에서 정의된 명령어 타입을 사용  
 *        모나코 에디터의 명령어를 @/lib/editorCommandType.ts에 정의된 명령어 타입으로 매핑하여 사용  
 *        @/lib/editorCommandType.ts는 @/app/page.tsx에서 사용되는 모나코 에디터의 명령어를 정의한 파일   
 */

export type { EditorCommandType } from '@/types/editorCommand';

// 모듈 레벨 Monaco 설정: 컴포넌트 렌더 전에 loader 경로 확정 (레이스 컨디션 방지)
if (typeof window !== 'undefined') { // @window : 브라우저에서만 사용되는 객체, @undefined : 브라우저가 아닌 환경(Node.js 등)에서 사용되는 값 
  const addonQuery = new URLSearchParams(window.location.search).get('env') === 'addon'; // @addonQuery : 환경 변수 
  const addonRuntime = !!((window as any).chrome?.runtime?.id); // @addonRuntime : 환경 변수 

  // 크롬 확장 프로그램 환경에서만 Monaco loader 경로를 설정 (레이스 컨디션 방지)
  if (addonQuery || addonRuntime) { // @addonQuery : 환경 변수, @addonRuntime : 환경 변수 
    const getExtensionUrl = (relativePath: string) => { // @getExtensionUrl : 환경 변수 
      if (typeof (window as any).chrome?.runtime?.getURL === 'function') { // @getExtensionUrl : 환경 변수 
        return (window as any).chrome.runtime.getURL(relativePath); // @getExtensionUrl : 환경 변수 
      }
      return relativePath; // @getExtensionUrl : 환경 변수 
    };
    (window as any).MonacoEnvironment = {
      getWorkerUrl: function (_moduleId: string, label: string) { // @getWorkerUrl : 환경 변수 
        // 🛡️ 크롬 확장 프로그램 MV3의 CSP(script-src 'self') 제약 하에서는
        // 동일 origin인 로컬 패키지 내의 vs/base/worker/workerMain.js 경로를 다이렉트로 반환하여
        // 동일 origin(chrome-extension://) 하에 워커 컨텍스트를 생성해야 내부 importScripts 로드가 차단되지 않습니다.
        return getExtensionUrl('/monaco-editor/min/vs/base/worker/workerMain.js');
      }
    };
    try {
      const vsPath = getExtensionUrl('/monaco-editor/min/vs');
      loader.config({ paths: { vs: vsPath } });
    } catch (err) {
      logWarn({
        file: 'src/components/MainEditorApp.tsx',
        func: 'MonacoLoaderConfig',
        doing: '크롬 확장프로그램 환경 Monaco loader 경로 설정',
        target: '/monaco-editor/min/vs',
        error: err,
      });
    }
  } else {
    // 🌐 Electron / Local Web: 로컬 또는 CDN Monaco 워커 설정
    configureMonacoEnvironment();
  }
}

/**
 * ============================================================================
 * [parseDateStringToMs]
 * 날짜 문자열(YYYYMMDD 또는 ISO 형식)을 밀리초(ms) 타임스탬프로 안전하게 변환합니다.
 *
 * @param {string} [str] - 변환할 날짜 문자열
 * @returns {number} 밀리초 타임스탬프 (유효하지 않으면 0)
 * ============================================================================
 */
export const parseDateStringToMs = (str?: string): number => {
  if (!str) return 0;
  if (str === '99991231') return Number.MAX_SAFE_INTEGER;
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.substring(0, 4), 10);
    const m = parseInt(str.substring(4, 6), 10) - 1;
    const d = parseInt(str.substring(6, 8), 10);
    return new Date(y, m, d, 23, 59, 59, 999).getTime();
  }
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

// 📊 [OMD-FILE-editorFileUtils] 파일 트리 탐색 및 상대 경로 계산 유틸리티 분리 임포트
import { getMdFiles, fetchAllMdFiles, resolveRelativeImagePath, getRelativePath } from '@/utils/editorFileUtils';

/**
 * ============================================================================
 * [MainEditorApp]
 * 온리비 어서 메인 에디터의 전역 상태·도메인 훅 조율 및 레이아웃/코어/모달 위임을 담당하는 Container 컴포넌트입니다.
 *
 * @returns {JSX.Element} 메인 에디터 애플리케이션 엘리먼트
 * ============================================================================
 */
export default function MainEditorApp() {                  // @MainEditorApp : MainEditorApp component
  const { showToast } = useToast();             // @showToast : Toast component  
  const {
    isSidebarOpen, setIsSidebarOpen,
    isToolbarOpen, setIsToolbarOpen,
    sidebarWidth, setSidebarWidth,
    sidebarTab, setSidebarTab
  } = useUIStore();
  useEffect(() => {
    setIsSidebarOpen(true);
    setSidebarTab('explorer');
  }, [setIsSidebarOpen, setSidebarTab]);

  // 🛡️ [전역 화면 흔들림 및 윈도우 스크롤바 생성 완전 방어]
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.documentElement.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.width = '100%';
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.width = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.width = '';
    };
  }, []);
  const [mounted, setMounted] = useState(false);  // @mounted : mounted state 
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const emojiTargetRef = useRef<{ tabId: string | null; visual: boolean; selection: any } | null>(null);
  const [content, setContent] = useState('');   // @content : content state 
  // 💡 [React 18 동시성 렌더링] 180ms 지연 타이머 깜빡임을 제거하고 useDeferredValue로 부드러운 무깜빡임 실시간 렌더링
  const previewContent = useDeferredValue(content);

  const contentRef = useRef(content);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0006] MainEditorApp.tsx ➔ contentRef_sync
  // 🎯 @KICK  : 클로저에서 사용하기 위해 contentRef.current를 content 상태와 동기화
  // 🛡️ @GUARD : 스테일 클로저가 ref에서 이전 콘텐츠를 읽는 것을 방지
  // 🚨 @PATCH : 2026-09-27 — 코드블록 전체 행과 왼쪽 표시선에 같은 마스크를 적용해 원문 편집 영역에서도 범위를 구분한다.
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const [previewMode, setPreviewModeRaw] = useState<'edit' | 'both' | 'preview' | 'css-style'>('preview');
  const [directEditEnabled, setDirectEditEnabled] = useState(true);
  const visualFloatingOriginRef = useRef(false);
  const [mediaDialogSource,setMediaDialogSource] = useState<{kind:'video'|'map';source:string}|null>(null);
  const visualMediaInsertRef = useRef<{kind:string;documentId:string;insert:(code:string)=>boolean}|null>(null);
  const visualImageInsertRef = useRef<((path: string, alt: string, fullMarkdown?: string) => boolean) | null>(null);
  const visualCommandRef = useRef<((command: string) => boolean) | null>(null);
  const visualAITargetRef = useRef<any>(null);
  const visualSourceActionRef = useRef<{ id: string; source: string; from: number; to: number; tabId: string } | null>(null);
  const executingVisualSourceActionRef = useRef(false);
  const pendingVisualExportRef = useRef<EditorCommandType | null>(null);
  const [isA4GuardEnabled, setIsA4GuardEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isA4GuardEnabled') === 'true';
    }
    return false;
  });
  const [previewZoomScale, setPreviewZoomScale] = useState<number>(1);
  const [isPreviewFindOpen, setIsPreviewFindOpen] = useState<boolean>(false);
  const [previewFindReplaceMode, setPreviewFindReplaceMode] = useState(false);
  const isPreviewFindOpenRef = useRef(false);
  useEffect(() => { isPreviewFindOpenRef.current = isPreviewFindOpen; }, [isPreviewFindOpen]);
  const previewZoomScaleRef = useRef(1);
  useEffect(() => { previewZoomScaleRef.current = previewZoomScale; }, [previewZoomScale]);
  const previewModeRef = useRef(previewMode);
  // 💡 서식설정(css-style)이나 도움말 진입 전의 일반 마크다운 모드를 격리 보관하여 복원하는 Ref
  const lastGeneralPreviewModeRef = useRef<'edit' | 'both' | 'preview'>('preview');
  const isEditorMountedRef = useRef(false);

  // 🧠 [ONRIVI-KNOWLEDGE-ENGINE-002.1] 에디터 ↔ 지식 허브 인라인 뷰 전환 상태
  const [activeMainView, setActiveMainView] = useState<'editor' | 'knowledge'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'knowledge') return 'knowledge';
    }
    return 'editor';
  });


  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && (
      !!(window as any).electronAPI ||
      navigator.userAgent.toLowerCase().includes('electron') ||
      new URLSearchParams(window.location.search).get('env') === 'desktop'
    );

    const handleOpenKnowledge = () => {
      if (!isDesktop) {
        showToast("🖥️ 지식 보관함은 데스크톱(Electron) 앱 전용 기능입니다. 데스크톱 앱을 이용해 주세요.", "info");
        return;
      }
      let key = '';
      try {
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) key = JSON.parse(raw).geminiApiKey || '';
      } catch (err) {
        logWarn({
          file: 'src/components/MainEditorApp.tsx',
          func: 'handleOpenKnowledge',
          doing: '지식 보관함 진입 전 Gemini API Key 설정 파싱',
          target: 'onrivi_settings',
          error: err,
        });
      }
      if (!key) {
        showToast("지식 엔진을 사용하려면 환경설정에서 Gemini API Key를 먼저 등록해 주세요.", "warning");
        window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
        return;
      }
      setActiveMainView('knowledge');
    };
    const handleBackToEditor = () => {
      setActiveMainView('editor');
    };

    window.addEventListener('app:open-knowledge-manager', handleOpenKnowledge);
    window.addEventListener('app:back-to-editor', handleBackToEditor);

    const handleGlobalKnowledgeKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        e.stopPropagation();
        if (!isDesktop) {
          showToast("🖥️ 지식 보관함은 데스크톱(Electron) 앱 전용 기능입니다. 데스크톱 앱을 이용해 주세요.", "info");
          return;
        }
        setActiveMainView(prev => {
          if (prev === 'knowledge') return 'editor';
          let key = '';
          try {
            const raw = localStorage.getItem('onrivi_settings');
            if (raw) key = JSON.parse(raw).geminiApiKey || '';
          } catch (err) {
            logWarn({
              file: 'src/components/MainEditorApp.tsx',
              func: 'handleGlobalKnowledgeKeyDown',
              doing: '단축키(Ctrl+Shift+K) 지식 보관함 전환 시 Gemini API Key 설정 파싱',
              target: 'onrivi_settings',
              error: err,
            });
          }
          if (!key) {
            showToast("지식 엔진을 사용하려면 환경설정에서 Gemini API Key를 먼저 등록해 주세요.", "warning");
            window.dispatchEvent(new CustomEvent('app:dispatch-command', { detail: 'SETTINGS' }));
            return 'editor';
          }
          return 'knowledge';
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKnowledgeKeyDown, true);

    return () => {
      window.removeEventListener('app:open-knowledge-manager', handleOpenKnowledge);
      window.removeEventListener('app:back-to-editor', handleBackToEditor);
      window.removeEventListener('keydown', handleGlobalKnowledgeKeyDown, true);
    };
  }, [showToast]);

  // ====================================================================
  // 📊 [OMD-CORE-0003 TDZ-GUARD] MainEditorApp.tsx ➔ 훅 호출 전 선행 상태 선언 블록
  // 🎯 @KICK  : useEditorSettings/useEditorTabs 훅 호출 이전에 반환값을 참조하는
  //             하위 코드(useEffect 등)를 위해 모든 관련 상태를 const로 선행 선언
  // 🛡️ @GUARD : Webpack 번들러가 let 변수를 단일 글자(rS, r0 등)로 난독화 시 TDZ 에러 유발 → const로 즉시 초기화
  // 🚨 @PATCH : _init 더미 변수 패턴 도입 (useEditorSettings 분리 리팩토링) | 이전 버전
  //           | tabs/setTabs/activeTabId/setActiveTabId를 실제 이름으로 선행 선언, useEditorTabs 외부 주입 전환 | 2026-06-15 | rS TDZ 에러(tabMetadata_sync L526) 해결
  // 🔗 @CALLS : useState (React)
  // ====================================================================
  // 💡 [TDZ 방어] 모든 상태를 즉시 const로 선언하여 Webpack 번들러의 TDZ 최적화 오류 방지
  // 이후 useEditorSettings 훅 호출 시 해당 훅의 반환값으로 구조분해 재선언하지 않고,
  // 컴포넌트 내에서 useEditorSettingsResult.xxx 형태로 직접 접근합니다.
  const [_isDarkMode_init, _setIsDarkMode_init] = useState(false);
  const [_fontSize_init, _setFontSize_init] = useState<number>(14);
  const [_wordWrap_init, _setWordWrap_init] = useState<'on' | 'off'>('on');
  const [_autoSave_init, _setAutoSave_init] = useState(true);
  const [_quoteStyle_init, _setQuoteStyle_init] = useState<'modern' | 'clean' | 'none'>('modern');
  const [_themePalette_init, _setThemePalette_init] = useState<string>('onrivi-light');
  const [_licenseKey_init, _setLicenseKey_init] = useState<string>('');
  const [_customHotkeys_init, _setCustomHotkeys_init] = useState<Record<string, string>>({});
  const [_customSlashCommands_init, _setCustomSlashCommands_init] = useState<Record<string, string>>({});
  const _customSlashCommandsRef_init = useRef<Record<string, string>>({});
  const _handleThemeChange_init = () => { };

  // 💡 [Step 1 리팩토링 완료] 라이선스 및 권한 관리를 별도 Hook으로 완전히 분리!
  const {
    deviceId, setDeviceId,
    licenseStatus, setLicenseStatus,
    isLicenseChecking, setIsLicenseChecking
  } = useEditorAuth();

  // 💡 [에디터 지원 유효 요금제 판별] 에디터 편집 권한이 존재하는 정품/체험 요금제인지 판별 (만료, READER, 미인증, 제한사용자 제외)
  const isEditorPlan = useMemo(() => {
    if (isLicenseChecking) return false;
    if (licenseStatus.isExpired) return false;
    const plan = (licenseStatus.planName || '').toUpperCase();
    if (plan.includes('READER') || plan.includes('제한사용자') || plan.includes('미인증') || plan.includes('만료') || plan === 'READER') {
      return false;
    }
    return licenseStatus.isActivated;
  }, [isLicenseChecking, licenseStatus.isExpired, licenseStatus.planName, licenseStatus.isActivated]);

  // 🛡️ 동일 브라우저 내 에디터 다중 인스턴스/탭 중복 실행 감지 및 방어 락 (에디터 편집 지원 요금제일 때만 락 가동)
  const { isDuplicateInstance, takeOverControl } = useSingleTabGuard(isEditorPlan);

  // 🛡️ 동일 브라우저 다중 탭 실행 시 비활성 탭의 권한을 '제한사용자(읽기 전용)'로 안전하게 격리 투영
  const effectiveLicenseStatus = useMemo(() => {
    if (isDuplicateInstance && isEditorPlan) {
      return {
        ...licenseStatus,
        isRestricted: true,
        isActivated: false,
        planName: licenseStatus.planName ? `${licenseStatus.planName} (제한사용자)` : '제한사용자',
      };
    }
    return licenseStatus;
  }, [isDuplicateInstance, isEditorPlan, licenseStatus]);

  // 💡 [권한 기반 제한사용자 판별 플래그] 다중 탭 중복 실행, 기간 만료, 동시 접속 초과, 혹은 미인증/제한 플랜 사용 여부를 판별
  const isRestrictedUser = useMemo(() => {
    return isLicenseChecking || !effectiveLicenseStatus.isActivated ||
      (isDuplicateInstance && isEditorPlan) ||
      effectiveLicenseStatus.isConcurrentLimited ||
      effectiveLicenseStatus.isExpired ||
      effectiveLicenseStatus.isRestricted ||
      effectiveLicenseStatus.planName?.includes('미인증') ||
      effectiveLicenseStatus.planName?.includes('제한사용자') ||
      effectiveLicenseStatus.planName?.includes('동시 접속 초과');
  }, [isLicenseChecking, isDuplicateInstance, isEditorPlan, effectiveLicenseStatus.isActivated, effectiveLicenseStatus.isConcurrentLimited, effectiveLicenseStatus.isExpired, effectiveLicenseStatus.isRestricted, effectiveLicenseStatus.planName]);

  // 💡 [사용자 별명(활동명) 상태] AI 버튼 표기용 ({별명} AI, 예: '탕수육 AI')
  const [userNickname, setUserNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('onrivi_user_nickname') ||
        localStorage.getItem('onrivi_nick_name') ||
        localStorage.getItem('onrivi_signup_nick_name') ||
        localStorage.getItem('onrivi_user_name') ||
        ''
      ).trim();
    }
    return '';
  });

  useEffect(() => {
    let isMounted = true;
    const fetchUserNickname = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // 1차: session user_metadata에서 별명/활동명 추출
          const metaNick = (
            session.user.user_metadata?.nick_name ||
            session.user.user_metadata?.nickname ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            ''
          ).trim();

          if (metaNick && isMounted) {
            setUserNickname(metaNick);
            localStorage.setItem('onrivi_user_nickname', metaNick);
          }

          // 2차: 서버 API(/api/user/check)를 통해 nick_name 조회
          if (session.user.id) {
            try {
              const checkRes = await fetch('/api/user/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_id: session.user.id, p_email: session.user.email })
              });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                const cleanNick = checkData?.user?.nick_name?.trim();
                if (cleanNick && isMounted) {
                  setUserNickname(cleanNick);
                  localStorage.setItem('onrivi_user_nickname', cleanNick);
                }
              }
            } catch (err) {
              logWarn({
                file: 'src/components/MainEditorApp.tsx',
                func: 'fetchUserNickname',
                doing: '서버 API(/api/user/check)를 통한 사용자 별명 조회',
                target: session.user.email || session.user.id,
                error: err,
              });
            }
          }
        }
      } catch (err) {
        logWarn({
          file: 'src/components/MainEditorApp.tsx',
          func: 'fetchUserNickname',
          doing: 'Supabase 인증 세션 기반 사용자 별명 조회',
          target: 'supabase.auth.getSession',
          error: err,
        });
      }
    };

    fetchUserNickname();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🌟 [별명 실시간 동기화 리스너] 환경설정 모달 등에서 별명이 변경되었을 때 즉시 에디터 리렌더링
  useEffect(() => {
    const handleNickChange = (e: any) => {
      if (typeof e.detail === 'string') {
        setUserNickname(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:nickname_changed', handleNickChange);
      return () => window.removeEventListener('onrivi:nickname_changed', handleNickChange);
    }
  }, []);

  // 💡 [에디터 하단 AI 버튼 가시성 상태] 상태바 및 로컬스토리지 연동
  const [isAiButtonVisible, setIsAiButtonVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onrivi_show_editor_ai_btn') !== 'false';
    }
    return true;
  });

  // 💡 [에디터 하단 AI 모델 드롭다운 상태 및 외부 클릭 감지]
  const [isBottomAiDropdownOpen, setIsBottomAiDropdownOpen] = useState<boolean>(false);
  const bottomAiDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBottomAiDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomAiDropdownRef.current && !bottomAiDropdownRef.current.contains(e.target as Node)) {
        setIsBottomAiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBottomAiDropdownOpen]);

  // 💡 [Step 2 리팩토링 완료] 수십 개에 달하던 모달/팝업 상태를 단 하나의 Hook으로 완전히 분리!
  const {
    isSettingsModalOpen, setIsSettingsModalOpen,
    settingsModalInitialTab, setSettingsModalInitialTab,
    isStyleModalOpen, setIsStyleModalOpen,
    isExportModalOpen, setIsExportModalOpen,
    isImageModalOpen, setIsImageModalOpen,
    editingImageInfo, setEditingImageInfo,
    isMapModalOpen, setIsMapModalOpen,
    isTableModalOpen, setIsTableModalOpen,
    isMergeModalOpen, setIsMergeModalOpen,
    isYoutubeModalOpen, setIsYoutubeModalOpen,
    youtubeInitialUrl, setYoutubeInitialUrl,
    isLicenseModalOpen, setIsLicenseModalOpen,
    isFormulaModalOpen, setIsFormulaModalOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    isReferenceModalOpen, setIsReferenceModalOpen,
    isCitationModalOpen, setIsCitationModalOpen,
    promptConfig, setPromptConfig,
    confirmConfig, setConfirmConfig
  } = useEditorModals();

  // 🌟 [전체사용자 공통 리소스 폴더 필수 안내 모달 상태]
  const [isResourceGuideModalOpen, setIsResourceGuideModalOpen] = useState(false);
  const [isNewDocumentModalOpen, setIsNewDocumentModalOpen] = useState(false);
  const [isDismissedGuide, setIsDismissedGuide] = useState(false);

  // ====================================================================
  // 📊 [OMD-EDIT-0004 TDZ-GUARD] MainEditorApp.tsx ➔ tabs/activeTabId 선행 선언
  // 🎯 @KICK  : tabMetadata_sync(L526)가 useEditorTabs 훅 호출(L935) 이전에 setTabs/activeTabId를
  //             참조하므로, Webpack TDZ 에러 방지를 위해 실제 이름으로 최상단 선행 선언
  // 🛡️ @GUARD : useEditorTabs 내부에서 useState를 갖지 않고 이 상태를 주입받아 사용
  // 🚨 @PATCH : _tabs_init/_activeTabId_init 더미 이름 → tabs/activeTabId 실제 이름으로 변경 | 2026-06-15 | rS TDZ(tabMetadata_sync) 해결
  // 🔗 @CALLS : useState (React)
  // ====================================================================
  // 💡 [초기화 순서 방어] useEditorTabs 반환 바인딩 전 하위 함수들이 참조하는 탭 관리 상태의 선행 선언
  const [tabs, setTabs] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<any[]>([]);
  const activeTabIdRef = useRef<string | null>(null);

  // ⏳ [OMD-HOOK-useEditorGuestMode] 게스트 즉시 체험판 타이머 및 Paywall 상태 분리 훅
  const {
    isGuestMode,
    setIsGuestMode,
    guestRemainingSeconds,
    setGuestRemainingSeconds,
    isGuestExpired,
    setIsGuestExpired,
    guideStep,
    setGuideStep,
    isGuideMinimized,
    setIsGuideMinimized,
  } = useEditorGuestMode({ setLicenseStatus });

  // 💾 [탭 순서 영구 보존 이펙트] localStorage에 기록된 순서가 있다면 tabs 배열의 순서를 복원
  useEffect(() => {
    if (tabs.length === 0) return;
    try {
      const savedOrder = localStorage.getItem('onrivi_tabs_order');
      if (savedOrder) {
        const order: string[] = JSON.parse(savedOrder);
        // 저장된 순서 리스트대로 정렬하며, 순서 목록에 없는 탭은 원래 순서대로 뒤에 보존
        const sorted = [...tabs].sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });

        const isSame = tabs.length === sorted.length && tabs.every((t, i) => t.id === sorted[i].id);
        if (!isSame) {
          setTabs(sorted);
        }
      }
    } catch (e) {
      logWarn({
        file: 'src/components/MainEditorApp.tsx',
        func: 'tabsOrderRestoreEffect',
        doing: '로컬스토리지에 저장된 탭 순서(onrivi_tabs_order) 복원 정렬',
        target: 'onrivi_tabs_order',
        error: e,
      });
    }
  }, [tabs]);

  // 💡 미리보기 업데이트 지연 디바운스 타이머 Ref (타이핑 시 번쩍거림/깜빡거림 방쇄)
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // 💡 [IME 락 가드] 한글 IME 조합 진행 여부를 저장하는 Ref
  const isComposingRef = useRef(false);



  // 💡 [SYNC-03 / 요구사항 3] 양방향 스크롤 관성 튕김 루프 원천 차단을 위해 호버 감지 Ref 도입
  const isEditorHovered = useRef(false);
  const isPreviewHovered = useRef(false);



  const [activeLine, setActiveLine] = useState<number | null>(null); // @activeLine : active line state 
  const lastSelectionRef = useRef<any>(null);    // @lastSelectionRef : last selection state 
  // 💡 [Step 2 리팩토링으로 서식 프로필(profiles, activeProfileId, isProfilesLoaded)은 useEditorProfiles로 이관됨]
  const [isAddonEnv, setIsAddonEnv] = useState(false);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [helpTitle, setHelpTitle] = useState('');
  const helpContentRef = useRef(helpContent);
  helpContentRef.current = helpContent;

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0008] MainEditorApp.tsx ➔ previewModeRef_sync
  // 🎯 @KICK  : previewModeRef.current를 previewMode 상태와 동기화
  // 🛡️ @GUARD : 이벤트 핸들러 및 비동기 콜백에서 스테일 ref 방지
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);



  const [rootFolder, setRootFolder] = useState<{ name: string, handle?: any } | null>(null);
  const [resourceFolder, setResourceFolder] = useState<string | null>(() => {
    const effective = getEffectiveResourceFolder();
    return (effective && typeof effective === 'string' && effective.trim() !== '') ? effective.trim() : null;
  });
  const [resourceFolderHandle, setResourceFolderHandle] = useState<any>(() => {
    if (typeof window !== 'undefined' && (window as any).__resourceFolderHandle) {
      return (window as any).__resourceFolderHandle;
    }
    return null;
  });


  // 💡 [Step 2 리팩토링으로 구글 드라이브 토큰 갱신 시 서식 로드 실시간 연동은 useEditorProfiles로 이관됨]

  const [workspaceType, setWorkspaceType] = useState<'local' | 'cloud' | 'browser'>(() => {
    if (typeof window !== 'undefined') {
      const savedWorkspace = localStorage.getItem('workspaceType');
      const savedLastMode = localStorage.getItem('onrivi_last_workspace_mode');
      const saved = savedWorkspace || savedLastMode;
      if (saved === 'cloud' || saved === 'gdrive') return 'cloud';
      try {
        const rawRoot = localStorage.getItem('rootFolder');
        if (rawRoot) {
          const parsedRoot = JSON.parse(rawRoot);
          if (parsedRoot && parsedRoot.name && parsedRoot.type !== 'GDRIVE') {
            return !(window as any).electronAPI ? 'browser' : 'local';
          }
        }
      } catch {}
      if (!(window as any).electronAPI) {
        return 'browser';
      }
    }
    return 'local';
  });


  // 💡 [Step 2 리팩토링으로 profileStorageRevision 및 서식 로드/리로드 이펙트는 useEditorProfiles로 이관됨]

  const [fileList, setFileList] = useState<FileNode[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('새 파일.md');
  const [currentFileNode, setCurrentFileNode] = useState<FileNode | null>(null);
  const [bibContent, setBibContent] = useState<string>('');

  // 💡 [Step 2 리팩토링으로 promptConfig 삭제됨 (useEditorModals로 이관)]


  const sessionRestoringRef = useRef<boolean>(false); // 세션 복원 진행 중 스킵 락
  const [driveLetter, setDriveLetter] = useState('D:');
  const [webBasePath, setWebBasePath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onrivi_web_base_path') || '';
    }
    return '';
  });


  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0012] MainEditorApp.tsx ➔ tabMetadata_sync
  // 🎯 @KICK  : 현재 파일 정보가 변경될 때 탭 메타데이터(fileName, path, node) 동기화
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : 2026-08-05 — 앱 시작 시 리소스 폴더 미지정 안내 메시지 표시 로직 추가 (hasShownResourceWarningRef)
  // 🔗 @CALLS : setTabs
  // ====================================================================

  // ☁️ [구글 드라이브 무중단 토큰 자동 갱신 엔진 가동 — 클라우드 작업장 활성화 시에만 실행]
  useEffect(() => {
    if (!mounted || (workspaceType !== 'cloud' && workspaceType !== 'gdrive')) return;
    initDriveTokenAutoRefresh();
  }, [mounted, workspaceType]);

  // ====================================================================
  useEffect(() => {
    if (activeTabId) {
      setTabs(prev => prev.map(t =>
        t.id === activeTabId
          ? {
            ...t,
            name: t.path || t.model ? currentFileName : t.name,
            path: currentFileNode?.path || null,
            node: currentFileNode
          }
          : t
      ));
    }
  }, [currentFileName, currentFileNode, activeTabId]);


  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIDraftModalOpen, setIsAIDraftModalOpen] = useState(false);
  const [aiDraftInitialMode, setAiDraftInitialMode] = useState<'draft' | 'editorial' | 'knowledge'>('draft');
  const [aiEditorContext, setAiEditorContext] = useState<{ selectedText: string; fullText: string }>({ selectedText: '', fullText: '' });

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0013] MainEditorApp.tsx ➔ searchOpen_sidebar_behavior
  // 🎯 @KICK  : 글로벌 검색이 열릴 때 사이드바 열기 및 검색 탭으로 전환
  // 🛡️ @GUARD : 검색이 닫힐 때 (여전히 검색 탭인 경우) 사이드바 탭을 TOC로 재설정
  // 🚨 @PATCH : None
  // 🔗 @CALLS : setIsSidebarOpen, setSidebarTab
  // ====================================================================
  useEffect(() => {
    if (isSearchOpen) {
      setIsSidebarOpen(true);
      setSidebarTab('search');
    } else if (sidebarTab === 'search') {
      setSidebarTab('toc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchOpen]);

  // 💡 [Step 2 리팩토링으로 각종 모달 상태들 삭제됨 (useEditorModals로 이관)]
  const youtubeEditRangeRef = useRef<any>(null);
  const visualFormulaInsertRef = useRef<((formula: string) => boolean | void) | null>(null);
  const [formulaModalInitialLatex, setFormulaModalInitialLatex] = useState<string>('');

  // 💡 [Step 2 리팩토링으로 문서 링크(DocLinkPicker) 상태 및 파일 로드 로직은 useEditorDocLinks로 이관됨]

  // 💡 [Step 2 리팩토링으로 세팅 및 스타일 모달 상태 삭제됨 (useEditorModals로 이관)]

  // ====================================================================
  // 📊 [OMD-AUTH-MainEditorApp-0015] MainEditorApp.tsx ➔ initDeviceId
  // 🎯 @KICK  : electronAPI, chrome.storage 또는 localStorage 폴백에서 고유 장치 ID 초기화
  // 🛡️ @GUARD : 순서가 다른 환경 처리; 존재하지 않으면 crypto-random UUID 생성
  // 🚨 @PATCH : 2026-06-28 — 크롬 스토리지 동기화 완전 제거 및 로컬스토리지 격리로 세션 기반 접속 관리 전환
  // 🔗 @CALLS : api.getMachineId, crypto.randomUUID, localStorage.getItem/setItem, setDeviceId
  // ====================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initDeviceId = async () => {
      const api = (window as any).electronAPI;
      if (api && typeof api.getMachineId === 'function') {
        // A. 데스크탑 Electron 실기기 ID 수집
        const realId = await api.getMachineId();
        setDeviceId(realId);
      } else {
        // B. 일반 웹 브라우저 (스토리지 동기화 완전 제거 및 로컬스토리지 격리)
        let localId = localStorage.getItem('onrivi_device_id');
        if (!localId) {
          localId = crypto.randomUUID();
          localStorage.setItem('onrivi_device_id', localId);
        }
        setDeviceId(localId);
      }
    };
    initDeviceId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====================================================================
  // 📊 [OMD-AUTH-MainEditorApp-0016] MainEditorApp.tsx ➔ loadAndVerifyLicense (payment_no)
  // 🎯 @KICK  : 저장소에서 라이선스 키 로드, Supabase DB로 검증; payment_no 없는 경우 user_id fallback
  // 🛡️ @GUARD : 암호화 캐시를 통한 오프라인 유예 기간(3일), 시간 조작 방어; 웹 SaaS는 count 조회만 (upsert/장비 체크 없음)
  // 🚨 @PATCH : 2026-06-28 — 확장프로그램(chrome.storage.local) 스토리지 읽기 로직 제거 (로컬스토리지 격리);
  //              2026-06-23 — payment_no 미존재 시의 subscriptions 폴백 쿼리에 다중구독 cardinality violation 방지용 활성 구독 필터(is_expired/plan_end_date/plan_status 등) 추가 개편;
  //              2026-06-22 — payment_no 미존재 시 supabase Auth 세션 → subscriptions → software_licenses fallback;
  //              웹 SaaS: count 조회만 수행, upsert/device UUID 완전 제거 (auth callback에서 insert 담당)
  // 🔗 @CALLS : api.loadLicenseFull, fetch(/api/license/activate, /api/license/check-session), crypto.subtle.digest, saveSecureData, loadSecureData, setLicenseStatus, setLicenseKey


  // 💡 [Step 2 리팩토링으로 내보내기, 어바웃, 컴펌 등 기타 모달 상태 싹 다 삭제됨 (useEditorModals로 이관)]

  const [isEditorReady, setIsEditorReady] = useState(false);

  const [isMergeMode, setIsMergeMode] = useState(false);
  const [selectedMergeNodes, setSelectedMergeNodes] = useState<FileNode[]>([]);
  // 💡 [Step 2 리팩토링으로 isMergeModalOpen 삭제됨]
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | ''>('');
  const [floatingHeadingLevel, setFloatingHeadingLevel] = useState(3);
  const [floatingQuoteDropdown, setFloatingQuoteDropdown] = useState<{ open: boolean; x: number; y: number; dropUp: boolean }>({ open: false, x: 0, y: 0, dropUp: false });
  const [dateTimeFormatDropdown, setDateTimeFormatDropdown] = useState<{ open: boolean; x: number; y: number; dropUp: boolean }>({ open: false, x: 0, y: 0, dropUp: false });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isMonacoDatePickerOpen, setIsMonacoDatePickerOpen] = useState(false);
  const [monacoDatePickerPos, setMonacoDatePickerPos] = useState({ top: 0, left: 0 });
  const [customDateTimeFormat, setCustomDateTimeFormat] = useState('YYYY-MM-DD HH:mm:ss');

  /**
   * ============================================================================
   * [toggleMergeNodeSelect]
   * 문서 병합 대상 목록(selectedMergeNodes)에서 지정한 파일 노드의 선택 상태를 토글합니다.
   *
   * @param {FileNode} node - 병합 선택 또는 해제할 파일 노드
   * ============================================================================
   */
  const toggleMergeNodeSelect = (node: FileNode) => {
    setSelectedMergeNodes(prev => {
      const exists = prev.some(n => n.path ? n.path === node.path : n.name === node.name);
      if (exists) {
        return prev.filter(n => n.path ? n.path !== node.path : n.name !== node.name);
      } else {
        return [...prev, node];
      }
    });
  };

  /**
   * ============================================================================
   * [handleOpenMergeModal]
   * 병합할 파일이 최소 2개 이상 선택되었는지 검증한 뒤 문서 병합 모달(MergeModal)을 엽니다.
   * ============================================================================
   */
  const handleOpenMergeModal = () => {
    if (selectedMergeNodes.length < 2) {
      showToast("병합하려면 최소 2개 이상의 파일을 선택해야 합니다.", 'warning');
      return;
    }
    setIsMergeModalOpen(true);
  };





  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  // 💡 다중 탭 관련 상태 선언 및 백업 레퍼런스
  const useEditorTabsResult = useEditorTabs(
    editorRef,
    setContent,
    setCurrentFileName,
    setCurrentFileNode,
    isEditorMountedRef,
    previewModeRef,
    previewDebounceRef,
    isComposingRef,
    workspaceType,
    showToast,
    getRelativePath,
    tabs,        // 💡 [TDZ 방어] 최상단에서 선언된 상태를 주입
    setTabs,
    activeTabId,
    setActiveTabId,
    setPreviewModeRaw,
    tabsRef,
    activeTabIdRef
  );

  // 💡 [TDZ 방어] useEditorTabs 반환값 중 상단에서 선언되지 않은 것들만 추가 추출
  const updateContent = useEditorTabsResult.updateContent;
  const switchTab = useEditorTabsResult.switchTab;
  const createNewTab = useEditorTabsResult.createNewTab;

  // Ref를 공유 tabsRef/activeTabIdRef에 동기화 (React state 직접 사용 — useEffect로 업데이트된 useEditorTabs ref는 stale할 수 있음)
  // 🚨 @PATCH : useEditorTabsResult.ref → React state 직접 참조로 변경 (stale ref가 closeTab에서 삭제된 탭을 복원하는 버그 수정) | 2026-06-18
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  // 💡 [OMD-HOOK-useEditorProfiles] 서식 프로필 및 프론트매터 동기화 전담 훅
  const {
    profiles,
    setProfiles,
    activeProfileId,
    setActiveProfileId,
    isProfilesLoaded,
    setIsProfilesLoaded,
    profileStorageRevision,
    setProfileStorageRevision,
    resolveEffectiveDocumentProfile,
    handleProfileChange,
  } = useEditorProfiles({
    mounted,
    content,
    contentRef,
    editorRef,
    isEditorMountedRef,
    resourceFolder,
    setResourceFolder,
    resourceFolderHandle,
    workspaceType,
    setWorkspaceType,
    rootFolder,
    setRootFolder,
    previewMode,
    previewModeRef,
    isStyleModalOpen,
    activeTabId,
    activeTabIdRef,
    tabs,
    setTabs,
    updateContent,
    showToast,
    isRestrictedUser,
    currentFileName,
    directEditEnabled,
    isComposingRef,
  });

  // ====================================================================
  // 📊 [OMD-EDIT-0012 TDZ-GUARD] MainEditorApp.tsx ➔ autoSaveRef/lastSavedContentRef 선행 선언
  // 🎯 @KICK  : autoSaveRef는 L1117 useEffect에서 먼저 참조되고, lastSavedContentRef는
  //             useFileExplorer 인자로 먼저 참조되므로 훅 호출 이전에 선행 선언
  // 🛡️ @GUARD : 기존 L1289 위치에 있던 선언을 사용 지점 이전으로 이동하여 TDZ 제거
  // 🚨 @PATCH : autoSaveRef 선언 위치를 L1289→L1101로 이동 | 2026-06-15 | rS TDZ(autoSaveRef_sync useEffect) 해결
  // 🔗 @CALLS : useRef (React)
  // ====================================================================
  // 💡 [TDZ 방어] lastSavedContentRef는 useFileExplorer에서 먼저 참조되므로 상단에 선언
  const lastSavedContentRef = useRef<string>('');
  const prevActiveTabRef = useRef<string | null>(null);

  // 💡 [WBS CORE-02 / 요구사항 4] State Stale Closure 방지를 위한 Ref 백업 시스템 도입
  const currentFileNodeRef = useRef(currentFileNode);
  const currentFileParentHandleRef = useRef<any>(null);
  const currentFileNameRef = useRef(currentFileName);
  const workspaceTypeRef = useRef(workspaceType);
  const rootFolderRef = useRef(rootFolder);
  const licenseStatusRef = useRef(effectiveLicenseStatus);
  const tabSizeRef = useRef(4);
  // 🚨 @PATCH : A4 조판 가드 스케일링 로직

  useEffect(() => {
    if (!isA4GuardEnabled) {
      setPreviewZoomScale(1);
      return;
    }

    const container = previewRef.current;
    if (!container) return;

    // ResizeObserver를 통해 custom-preview-container 너비를 감지하여 A4(210mm) 비율에 맞게 zoom 계산
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // 브라우저 기본 96 DPI 기준: 210mm = 793.7px (대략 794px)
        const A4_PIXEL_WIDTH = 794;

        // 여백(Padding) 등을 고려하여 컨테이너 너비보다 A4가 크면 축소, 아니면 1 유지
        // 40px은 양옆 여유 여백(패딩 및 스크롤바)
        if (width < A4_PIXEL_WIDTH + 40) {
          const scale = Math.max(0.3, (width - 40) / A4_PIXEL_WIDTH);
          setPreviewZoomScale(scale);
        } else {
          setPreviewZoomScale(1);
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isA4GuardEnabled, previewRef]);


  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0021] MainEditorApp.tsx ➔ currentFileNodeRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 currentFileNodeRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { currentFileNodeRef.current = currentFileNode; }, [currentFileNode]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0022] MainEditorApp.tsx ➔ currentFileNameRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 currentFileNameRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { currentFileNameRef.current = currentFileName; }, [currentFileName]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0023] MainEditorApp.tsx ➔ workspaceTypeRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 workspaceTypeRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { workspaceTypeRef.current = workspaceType; }, [workspaceType]);
  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0024] MainEditorApp.tsx ➔ rootFolderRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 rootFolderRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { rootFolderRef.current = rootFolder; }, [rootFolder]);
  const resourceFolderRef = useRef(resourceFolder);
  useEffect(() => { resourceFolderRef.current = resourceFolder; }, [resourceFolder]);

  const resourceFolderHandleRef = useRef(resourceFolderHandle);
  useEffect(() => { resourceFolderHandleRef.current = resourceFolderHandle; }, [resourceFolderHandle]);
  // ====================================================================
  // 📊 [OMD-LICENSE-MainEditorApp-0075] MainEditorApp.tsx ➔ licenseStatusRef_sync
  // 🎯 @KICK  : 핸들러에서 스테일 클로저 방지를 위해 licenseStatusRef 동기화
  // 🛡️ @GUARD : WBS CORE-02 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : **2026-06-21** — 신규: 만료 시 Ctrl+S/내보내기 차단을 위한 ref 추가
  // 🔗 @CALLS : None
  // ====================================================================
  useEffect(() => { licenseStatusRef.current = effectiveLicenseStatus; }, [effectiveLicenseStatus]);
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0025] MainEditorApp.tsx ➔ tabSizeRef_sync
  // 🎯 @KICK  : 활성 CSS 프로필 tabSize 설정에서 tabSizeRef 업데이트
  // 🛡️ @GUARD : None
  // 🚨 @PATCH : None
  // 🔗 @CALLS : parseInt
  // ====================================================================
  useEffect(() => {
    tabSizeRef.current = 4;
  }, []);

  const useFileExplorerResult = useFileExplorer({
    editorRef,
    contentRef,
    currentFileNode,
    currentFileName,
    lastSavedContentRef,
    currentFileParentHandleRef,
    tabsRef,
    isSearchOpen,
    activeTabIdRef,
    setContent,
    setCurrentFileName,
    setCurrentFileNode,
    setTabs,
    setActiveTabId,
    setSaveStatus,
    setIsSidebarOpen,
    setIsSearchOpen,
    setHelpContent,
    setHelpTitle,
    setPreviewModeRaw,
    previewModeRef,
    isEditorMountedRef,
    showToast,
    createNewTab,
    switchTab,
    rootFolder,
    setRootFolder,
    fileList,
    setFileList,
    workspaceType,
    setWorkspaceType,
    licenseStatus,
    sessionRestoringRef,
    setConfirmConfig
  });

  // 💡 [TDZ 방어] useFileExplorer 반환값에서 즉시 구조분해 할당하여 참조 에러 방지
  const {
    refreshFileList,
    saveFile,
    handleFileClick,
    selectRootFolder,
    restoreFolderPermission,
    handleFileOpenByPath,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveConnected,
    isDriveAuthExpired
  } = useFileExplorerResult;



  /**
   * ============================================================================
   * [setPreviewMode]
   * 에디터 본문 동기화, 제한사용자·도움말 탭 가드, 서식 설정 모달 연결을 포함하여 미리보기 모드를 전환합니다.
   *
   * @param {'edit' | 'both' | 'preview' | 'css-style' | Function} modeOrFn - 변경할 보기 모드 또는 상태 업데이터 함수
   * ============================================================================
   */
  const setPreviewMode = useCallback((modeOrFn: 'edit' | 'both' | 'preview' | 'css-style' | ((prev: 'edit' | 'both' | 'preview' | 'css-style') => 'edit' | 'both' | 'preview' | 'css-style')) => {
    if (!pendingVisualExportRef.current) {
      setDirectEditEnabled(true);
    }
    // 모드 전환 전 에디터 내용을 즉시 React 상태에 반영 (100ms 디바운스 손실 방지)
    if (editorRef.current && previewModeRef.current !== 'preview' && !previewRef.current?.querySelector('.visual-document-editor')) {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }
      const latestVal = editorRef.current.getValue();
      if (latestVal !== contentRef.current) {
        setContent(latestVal);
      }
    }
    setPreviewModeRaw(prev => {
      const requested = typeof modeOrFn === 'function' ? modeOrFn(prev) : modeOrFn;
      const next = requested === 'edit' ? 'both' : requested;

      if (isRestrictedUser) {
        if (next !== 'preview' && !isLicenseChecking) {
          if (isDuplicateInstance) {
            showToast("다른 탭에서 이미 편집 중입니다. 상단 '이 화면에서 편집 시작하기'를 눌러 편집 제어권을 가져올 수 있습니다.", "warning");
          } else if (licenseStatus.isConcurrentLimited) {
            showToast("다른 기기 또는 브라우저에서 사용 중입니다. 상단 '이 화면에서 편집 시작하기'를 눌러 편집 제어권을 가져올 수 있습니다.", "warning");
          } else {
            showToast("🔒 읽기 전용(제한사용자) 모드에서는 미리보기 화면만 제공됩니다.", "warning");
          }
        }
        return 'preview';
      }
      const activeTab = tabsRef.current.find(t => t.id === activeTabIdRef.current);
      if (activeTab?.name === '도움말.md' && next !== 'preview' && next !== 'css-style') return prev;

      // 💡 일반 보기 모드(edit, both, preview)로 변경하는 경우, 이를 전역 상태용 Ref에 백업해둡니다.
      if (next === 'edit' || next === 'both' || next === 'preview') {
        lastGeneralPreviewModeRef.current = next;
      }

      // 💡 서식 정의(css-style) 모드로 스위칭될 때 -> 기존 탭 생성 로직을 폐기하고, 새 모달을 띄우도록 가로챕니다.
      if (next === 'css-style') {
        setTimeout(() => setIsStyleModalOpen(true), 0);
        return prev; // 에디터 뷰잉 모드는 이전 상태 그대로 유지
      }

      previewModeRef.current = next;
      if (typeof window !== 'undefined' && next !== 'css-style') {
        localStorage.setItem('previewMode', next);
      }
      if (next === 'preview') {
        isEditorMountedRef.current = false;
      } else {
        isEditorMountedRef.current = true;
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setContent, createNewTab, setTabs, licenseStatus, showToast, isRestrictedUser, isDuplicateInstance, isLicenseChecking]);

  /**
   * ============================================================================
   * [closeTab]
   * 미저장 변경사항 확인, Monaco 모델 메모리 해제 및 다음 활성 탭 전환과 함께 지정한 탭을 닫습니다.
   *
   * @param {string} tabId - 닫을 대상 탭 ID
   * @param {React.MouseEvent} [event] - 마우스 클릭 이벤트 객체
   * ============================================================================
   */
  const closeTab = useCallback((tabId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const tabToClose = tabsRef.current.find(t => t.id === tabId);
    if (!tabToClose) return;

    const performClose = () => {
      if (tabToClose.model) {
        tabToClose.model.dispose();
      }

      // 💡 웰컴페이지 전용 'Onrivi Author 시작하기.md' 탭을 닫거나 도움말을 닫을 때의 모드 조정
      if (tabToClose.name === 'Onrivi Author 시작하기.md' || tabToClose.name === '도움말.md') {
        const targetMode = isRestrictedUser ? 'preview' : (previewModeRef.current === 'css-style' ? 'both' : previewModeRef.current);
        setPreviewModeRaw(targetMode);
        previewModeRef.current = targetMode;
        isEditorMountedRef.current = targetMode !== 'preview';
      }

      const nextTabs = tabsRef.current.filter(t => t.id !== tabId);
      const closeIndex = tabsRef.current.findIndex(t => t.id === tabId);
      tabsRef.current = nextTabs;
      setTabs(nextTabs);

      if (activeTabIdRef.current === tabId) {
        if (nextTabs.length > 0) {
          const nextActiveIndex = Math.max(0, closeIndex - 1);
          const nextActiveTab = nextTabs[nextActiveIndex] || nextTabs[0];
          switchTab(nextActiveTab.id);
        } else {
          setContent('');
          setCurrentFileName('새 파일.md');
          setCurrentFileNode(null);
          setActiveTabId(null);
          if (editorRef.current) {
            editorRef.current.setValue('');
          }
        }
      }
    };

    if (tabToClose.isModified) {
      setConfirmConfig({
        isOpen: true,
        title: "저장되지 않은 변경사항",
        message: `'${tabToClose.name}' 파일의 변경사항이 저장되지 않았습니다. 저장하지 않고 닫으시겠습니까?`,
        confirmText: "저장하지 않고 닫기",
        cancelText: "취소",
        isDanger: true,
        onConfirm: () => {
          performClose();
        }
      });
      return;
    }

    performClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewTab, switchTab, setTabs]);

  const useEditorSettingsResult = useEditorSettings(
    editorRef,
    mounted,
    setMounted,
    previewMode,
    setPreviewMode,
    setSidebarWidth,
    setActiveProfileId,
    setWorkspaceType,
    setRootFolder,
    setIsAddonEnv,
    showToast
  );

  // 💡 [TDZ 방어] useEditorSettings 반환값을 즉시 구조분해 할당하여 TDZ 에러 방지
  const {
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    wordWrap,
    setWordWrap,
    autoSave,
    setAutoSave,
    quoteStyle,
    setQuoteStyle,
    themePalette,
    setThemePalette,
    licenseKey,
    setLicenseKey,
    customHotkeys,
    setCustomHotkeys,
    customSlashCommands,
    setCustomSlashCommands,
    customSlashCommandsRef,
    handleThemeChange,
    autoClosingBrackets,
    setAutoClosingBrackets,
    editorFontWeight,
    setEditorFontWeight,
    editorHighContrast,
    setEditorHighContrast,
    geminiApiKey,
    setGeminiApiKey,
    aiModelName,
    setAiModelName
  } = useEditorSettingsResult;
  const {editorTabSize,setEditorTabSize,spellCheck,setSpellCheck}=useEditorSettingsResult;

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorLicense] 에디터 라이선스 및 세션 감시 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 라이선스 검증/하트비트/세션탈취/게스트타이머를 useEditorLicense로 1,044줄 분리 위임
  // ====================================================================
  const {
    isTakingOver,
    handleTakeover,
    handleSuccessActivation,
    loadAndVerifyLicense,
    formatTime,
  } = useEditorLicense({
    deviceId,
    licenseKey,
    setLicenseKey,
    licenseStatus,
    setLicenseStatus,
    isLicenseChecking,
    setIsLicenseChecking,
    showToast,
    previewModeRef,
    lastGeneralPreviewModeRef,
    isGuestMode,
    setIsGuestMode,
    isGuestExpired,
    setIsGuestExpired,
    guestRemainingSeconds,
    setGuestRemainingSeconds,
    setPreviewModeRaw,
    mounted,
    isDuplicateInstance,
    takeOverControl,
  });




  useEffect(()=>{tabSizeRef.current=editorTabSize;editorRef.current?.getModel()?.updateOptions({tabSize:editorTabSize,indentSize:editorTabSize,insertSpaces:true});},[editorTabSize]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorResourceFolder] 공통 리소스 폴더 관리 및 .bib·AI 자격증명·MCP 동기화 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] selectResourceFolder/clearResourceFolder 및 리소스 폴더 복원·MCP·.bib·AI 자격증명 이펙트를 useEditorResourceFolder로 분리 위임
  // ====================================================================
  const { selectResourceFolder, clearResourceFolder } = useEditorResourceFolder({
    mounted,
    workspaceType,
    rootFolder,
    resourceFolder,
    setResourceFolder,
    resourceFolderHandle,
    setResourceFolderHandle,
    setProfileStorageRevision,
    setBibContent,
    geminiApiKey,
    setGeminiApiKey,
    aiModelName,
    setAiModelName,
    licenseStatus,
    isDuplicateInstance,
    isRestrictedUser,
    isDismissedGuide,
    setIsDismissedGuide,
    setIsResourceGuideModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    setSettingsModalInitialTab,
    setIsImageModalOpen,
    setIsYoutubeModalOpen,
    setIsStyleModalOpen,
    setIsReferenceModalOpen,
    showToast,
  });


  const [isAiLoading, setIsAiLoading] = useState(false);



  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0028] MainEditorApp.tsx ➔ autoSaveRef_sync
  // 🎯 @KICK  : 자동 저장 로직에서 스테일 클로저 방지를 위해 autoSaveRef를 autoSave 상태와 동기화
  // 🛡️ @GUARD : 스테일 클로저 방지 시스템의 일부
  // 🚨 @PATCH : None
  // 🔗 @CALLS : None
  // ====================================================================
  const autoSaveRef = useRef(autoSave);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);

  const isActivated = !isDuplicateInstance && licenseStatus.isActivated;



  const decorationsCollectionRef = useRef<any>(null);
  const decorationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * ============================================================================
   * [updateDecorations]
   * 마크다운 구문 강조(제목, 굵게, 기울임, 취소선, 코드블록)를 위한 인라인 Monaco 데코레이션을 적용합니다.
   *
   * @param {any} editor - Monaco 에디터 인스턴스
   * ============================================================================
   */
  const updateDecorations = useCallback((editor: any) => {
    applyMarkdownDecorations(editor, decorationsCollectionRef);
  }, []);
    const isResizing = useRef(false);
  // autoSaveRef, lastSavedContentRef는 위(L1101)에서 이미 선언됨
  const isScrollingRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const prevCursorLineRef = useRef<number | null>(null);
  const frontmatterLinesRef = useRef<number>(0); // YAML frontmatter 라인 수 (syncPreviewInterpolated 전달용)
  const contentChangeTimeoutRef = useRef<any>(null);
  const completionProviderRef = useRef<any>(null);
  const wikilinkProviderRef = useRef<any>(null);
  const docLinkFilesRef = useRef<FileNode[]>([]);
  const [floatingToolbar, setFloatingToolbar] = useState<{ visible: boolean, top: number, left: number }>({ visible: false, top: 0, left: 0 });
  const floatingToolbarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!floatingToolbar.visible) return;
    floatingToolbarRef.current?.querySelector<HTMLButtonElement>('[data-floating-bold]')?.focus({ preventScroll: true });
  }, [floatingToolbar.visible]);
  const lastFloatingActionRef = useRef<number>(0);

  /**
   * ============================================================================
   * [executeFloatingItem]
   * 300ms 중복 실행 방지 디바운스와 함께 플로팅 서식 툴바의 액션을 실행하고 필요 시 툴바를 닫습니다.
   *
   * @param {() => void} action - 실행할 서식 액션 콜백
   * @param {boolean} [closeToolbar=false] - 실행 후 플로팅 툴바 닫기 여부
   * ============================================================================
   */
  const executeFloatingItem = useCallback((action: () => void, closeToolbar: boolean = false) => {
    const now = Date.now();
    if (now - lastFloatingActionRef.current < 200) return;
    lastFloatingActionRef.current = now;
    const activeBtn = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    action();
    if (closeToolbar) {
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      if (!visualFloatingOriginRef.current || !visualCommandRef.current?.('FOCUS')) {
        editorRef.current?.focus();
      }
    } else {
      // 8. 플로팅 툴바에서 서식 적용 후에도 플로팅 툴바에 포커스/커서 유지
      requestAnimationFrame(() => {
        if (activeBtn && floatingToolbarRef.current?.contains(activeBtn)) {
          activeBtn.focus({ preventScroll: true });
        }
      });
    }
  }, []);

  // 🎯 [플로팅 툴바 외부 클릭 및 에디터 클릭 시 자동 닫기]
  useEffect(() => {
    if (!floatingToolbar.visible) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const targetEl = (e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement);
      if (
        targetEl?.closest('#floating-toolbar') ||
        targetEl?.closest('#floating-quote-dropdown-fixed') ||
        targetEl?.closest('#floating-quote-dropdown-container')
      ) {
        return;
      }
      setFloatingToolbar(prev => ({ ...prev, visible: false }));
      setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    return () => window.removeEventListener('mousedown', handleOutsideClick, true);
  }, [floatingToolbar.visible]);

  // 🎯 [인용구 드롭다운 오픈 시 첫 번째 옵션 버튼에 자동 포커스]
  useEffect(() => {
    if (floatingQuoteDropdown.open) {
      const dropdown = document.getElementById('floating-quote-dropdown-fixed');
      const firstBtn = dropdown?.querySelector<HTMLButtonElement>('button');
      firstBtn?.focus({ preventScroll: true });
    }
  }, [floatingQuoteDropdown.open]);
  const aiDecorationsRef = useRef<string[]>([]);
  const generationIdRef = useRef<number>(0);
  const readFileTextRef = useRef<(node: FileNode) => Promise<string>>(null!);

  // 💡 [OMD-HOOK-useEditorDocLinks] 문서 연결(DocLinkPicker) 및 헤딩 파싱 전담 훅
  const {
    showDocLinkPicker,
    setShowDocLinkPicker,
    docLinkSearchText,
    setDocLinkSearchText,
    allMdFiles,
    setAllMdFiles,
    isDocLinkLoading,
    setIsDocLinkLoading,
    selectedDocNode,
    setSelectedDocNode,
    docHeadings,
    setDocHeadings,
    isHeadingLoading,
    setIsHeadingLoading,
    docHeadingSearchText,
    setDocHeadingSearchText,
    docLinkCustomTitle,
    setDocLinkCustomTitle,
    isDocLinkTitleManuallyEdited,
    setIsDocLinkTitleManuallyEdited,
    visualDocLinkInsertRef,
    visualDocLinkPositionRef,
    closeDocLinkPicker,
    readFileText,
    extractHeadings,
    handleDocFileClick,
    getDocLinkDefaultLabel,
    buildDocLinkTarget,
    handleDocLinkSelect,
    docLinkPickerStyle,
  } = useEditorDocLinks({
    workspaceType,
    fileList,
    rootFolder,
    rootFolderRef,
    resourceFolder,
    resourceFolderHandle,
    resourceFolderHandleRef,
    currentFileNode,
    tabsRef,
    editorRef,
    lastSelectionRef,
    docLinkFilesRef,
    readFileTextRef,
    floatingToolbar,
  });


  // 📱 모바일 상태 관리를 Rules of Hooks에 따라 최상위(Top-level)로 상향 조정
  const [isMobile, setIsMobile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // 마운트 시점 확인
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const cursorPositionRef = useRef<any>(null);
  const cursorSelectionRef = useRef<any>(null);
  const handlersRef = useRef<any>(null);
  const hotkeyDisposablesRef = useRef<any[]>([]);

  // ====================================================================


  // ====================================================================
  // 📊 [OMD-FILE-MainEditorApp-0039] MainEditorApp.tsx ➔ welcomeContentLoad
  // 🎯 @KICK  : 첫 마운트 시 탭이 없고 보류 중인 외부 파일이 없으면 웰컴 콘텐츠 로드
  // 🛡️ @GUARD : pendingExternalFileRef가 설정되어 있으면 건너뜀 (파일 열기로 연기)
  // 🚨 @PATCH : None
  // 🔗 @CALLS : getWelcomeContent, setTabs, setActiveTabId, setContent, setCurrentFileName
  // ====================================================================
  // 💡 초기 빈 탭을 생성하지 않음 — 사용자는 탐색기에서만 파일을 열거나 생성할 수 있음

  // 💡 [조치 완료] 애드온 구동 시 사용자의 클립보드 내용을 동의 없이 강제 읽기 하여 첫 웰컴페이지를 무조건 덮어쓰던 로직을 제거(주석 처리)하여 웰컴 페이지 노출을 보장합니다.
  // useEffect(() => {
  //   if (mounted && isAddonEnv && typeof navigator !== 'undefined' && navigator.clipboard) {
  //     (async () => {
  //       try {
  //         const text = await navigator.clipboard.readText();
  //         if (text) {
  //           updateContent(text);
  //           lastSavedContentRef.current = text;
  //         }
  //       } catch (e) {
  //         // 클립보드 읽기 실패 (권한 없음 등) - 무시
  //       }
  //     })();
  //   }
  // }, [mounted]);

  // ====================================================================

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorFormatting] Monaco 텍스트 삽입 및 서식 조작 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] insertAtCursor/scrollToLine/wrapSelection/insertLink/표 변환/미디어 편집/접두사/quickWrap/날짜 삽입/AI 초안 적용을 useEditorFormatting으로 분리 위임
  // ====================================================================
  const {
    insertAtCursor,
    findLineNumberByHeading,
    scrollToLine,
    insertBlockTag,
    wrapSelection,
    insertLink,
    parseHtmlTableToMarkdown,
    sanitizePastedText,
    fixMarkdownTable,
    replaceDocumentMedia,
    editDocumentMedia,
    applyLinePrefix,
    removePrefix,
    quickWrap,
    handleInsertFormattedDate,
    handleAIDraftApply,
  } = useEditorFormatting({
    editorRef,
    previewRef,
    lastSelectionRef,
    contentRef,
    activeTabIdRef,
    previewModeRef,
    visualFormulaInsertRef,
    visualMediaInsertRef,
    visualCommandRef,
    isRestrictedUser,
    showToast,
    updateContent,
    setTabs,
    setEditingImageInfo,
    setIsImageModalOpen,
    setMediaDialogSource,
    setIsMapModalOpen,
    setYoutubeInitialUrl,
    setIsYoutubeModalOpen,
    setIsAIDraftModalOpen,
  });
  // ====================================================================
  // 📊 [OMD-HOOK-useEditorPreviewSync] 미리보기 전처리·위치 동기화·하이라이트·인터랙션 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] handleCheckboxToggle/handlePreviewWheel/bindPreviewScrollContainer/handlePreviewClick/handleCopyPreviewContent/processedContent·lineMap/미리보기 추종·하이라이트 이펙트를 useEditorPreviewSync로 분리 위임
  // ====================================================================
  const {
    handleCheckboxToggle,
    handlePreviewWheel,
    bindPreviewScrollContainer,
    handlePreviewClick,
    handleCopyPreviewContent,
    processedContent,
    lineMap,
    frontmatterLines,
    handlePreviewImageLoaded,
  } = useEditorPreviewSync({
    editorRef,
    previewRef,
    contentRef,
    isScrollingRef,
    frontmatterLinesRef,
    previewContent,
    previewMode,
    activeLine,
    showToast,
    setPreviewZoomScale,
    scrollToLine,
  });

  // 💡 [Step 2 리팩토링으로 readFileText, extractHeadings, handleDocFileClick, getDocLinkDefaultLabel, buildDocLinkTarget, handleDocLinkSelect는 useEditorDocLinks로 이관됨]

  // ====================================================================
  // 📊 [OMD-EDIT-MainEditorApp-0064] MainEditorApp.tsx ➔ resolveClipboardImage
  // 🎯 @KICK  : 클립보드에서 이미지 Blob/File 추출 (items → files → native read → navigator.clipboard 순)
  // 🛡️ @GUARD : 모든 경로 실패 시 null 반환, 성공 시 Blob 반환; dataUrlToBlob 인라인 변환으로 CSP connect-src 차단 방어
  // 🚨 @PATCH : **2026-09-11** — dataUrlToBlob 순수 JS 바이너리 변환 헬퍼 적용 (CSP fetch 거부 방어 및 스크린샷 캡처 즉각 복원)
  // 🔗 @CALLS : 없음
  // ====================================================================
  // 📊 [OMD-HOOK-useEditorPaste] 클립보드 붙여넣기 및 이미지 저장 파이프라인 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 클립보드 이미지 파싱 및 저장을 useEditorPaste로 450줄 분리 위임
  // ====================================================================
  const {
    handlePasteImageFile,
    handleEditorPaste,
    insertImageMarkdown,
    handlePasteImageFileRef,
    isImageLikeFile,
  } = useEditorPaste({
    editorRef,
    lastSelectionRef,
    contentRef,
    rootFolderRef,
    activeTabIdRef,
    currentFileNodeRef,
    currentFileNode,
    tabsRef,
    resourceFolderHandle,
    showToast,
    updateContent,
    insertAtCursor,
    sanitizePastedText,
    parseHtmlTableToMarkdown,
    fixMarkdownTable,
  });

  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0068] MainEditorApp.tsx ➔ dynamicCssString
  // 🎯 @KICK  : 활성 CSS 프로필에서 타이포그래피, 코드 블록, 표, 체크박스, 구분선, 다크모드 재정의를 포함한 동적 CSS 생성
  // 🛡️ @GUARD : 기본 프로필은 빈 문자열 반환; blockquote, hr, color에 대한 다크모드 재정의; h2-h6 font-size 건너뜀(자동 계산)
  // 🚨 @PATCH : **2026-09-17** — [다크모드/어두운 배경 코드블록 내부 행 하이라이트 고대비 시인성 보장]: 코드블록 배경색(bgColor)의 명도를 판별하여 다크 계열일 경우 은은한 갈색 대신 고대비 코발트 블루(rgba(59,130,246,0.3)) 및 1px 인셋 아웃라인(rgba(96,165,250,0.65))을 동적 주입하여 어두운 배경에서도 활성 행이 즉각 식별되도록 개선; 박스 중첩 아티팩트 방지를 위한 codeBlock 중첩 border/background 투명 재정의
  // 🚨 @PATCH : 추가 CSS가 !important를 쓰거나 MarkdownViewer에서 재주입돼도 설정창의 선언이 이기도록 캐스케이드 계층을 분리한다.
  // 🔗 @CALLS : None
  // ====================================================================
  // 📊 [OMD-CORE-MainEditorApp-0068] MainEditorApp.tsx ➔ dynamicCssString
  // 🎯 @KICK  : 활성 CSS 프로필에서 타이포그래피, 코드 블록, 표, 체크박스, 구분선, 다크모드 재정의를 포함한 동적 CSS 생성
  // 🛡️ @GUARD : 기본 프로필은 빈 문자열 반환; dynamicCssGenerator로 분리 위임
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] dynamicCssString 생성 로직을 dynamicCssGenerator.ts로 1,234줄 분리 위임
  // 🔗 @CALLS : generateDynamicCss
  // ====================================================================
  const dynamicCssString = useMemo(() => {
    return generateDynamicCss(profiles, activeProfileId, previewMode, isStyleModalOpen);
  }, [profiles, activeProfileId, previewMode, isStyleModalOpen]);

  const handlers = useEditorHandlers({
    editorRef,
    previewModeRef,
    contentRef,
    currentFileNameRef,
    currentFileNodeRef,
    workspaceTypeRef,
    rootFolderRef,
    lastSavedContentRef,
    currentFileParentHandleRef,
    profiles,
    activeProfileId,
    isDarkMode,
    dynamicCssString,
    preferLiveProfile: previewMode === 'css-style' || isStyleModalOpen,
    setSaveStatus,
    setCurrentFileName,
    setCurrentFileNode,
    setRootFolder,
    setWorkspaceType,
    setIsSidebarOpen,
    setIsExportModalOpen,
    setIsYoutubeModalOpen,
    setIsMapModalOpen,
    setIsTableModalOpen,
    setIsFormulaModalOpen,
    setIsSearchOpen,
    setIsLicenseModalOpen,
    setIsSettingsModalOpen,
    setIsImageModalOpen,
    setIsReferenceModalOpen,
    setEditingImageInfo,
    setSettingsModalInitialTab,
    setFontSize,
    setHelpTitle,
    setHelpContent,
    setIsHelpModalOpen,
    setFloatingToolbar,
    setPromptConfig,
    showToast,
    refreshFileList,
    updateContent,
    wrapSelection,
    insertAtCursor,
    applyLinePrefix,
    removePrefix,
    insertLink,
    quickWrap,
    insertBlockTag,
    setShowDocLinkPicker,
    sanitizePastedText,
    isComposingRef,
    previewRef,
    createNewTab,
    switchTab,
    setTabs,
    activeTabIdRef,
    licenseStatusRef,
    lastSelectionRef,
    tabsRef,
    saveFile
  });

  handlersRef.current = handlers;
  useEffect(() => {
    if (!pendingVisualExportRef.current || directEditEnabled || previewMode !== 'preview' || previewContent !== content) return;
    const frame = requestAnimationFrame(() => {
      if (!previewRef.current?.querySelector('.markdown-viewer-root')) return;
      const type = pendingVisualExportRef.current;
      pendingVisualExportRef.current = null;
      const actions = { PRINT: 'print', EXPORT_HTML: 'exportHTML', EXPORT_EPUB: 'exportEPUB', EXPORT_PNG: 'exportPNG', EXPORT_DOCX: 'exportDOCX', EXPORT_HWPX: 'exportHWPX', OPEN_EXPORT: 'openExport' };
      const action = actions[type!];
      if (action) {
        Promise.resolve(handlersRef.current[action]()).finally(() => {
          if (type !== 'OPEN_EXPORT') setDirectEditEnabled(true);
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [directEditEnabled, previewMode, content, previewContent]);
  useEffect(() => {
    if (!isExportModalOpen && !pendingVisualExportRef.current && !directEditEnabled) {
      setDirectEditEnabled(true);
    }
  }, [isExportModalOpen, directEditEnabled]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorDocumentSession] 에디터 세션 복원 및 외부 파일 열기 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 세션 복원/자동저장/IPC/openExternalFile을 useEditorDocumentSession으로 445줄 분리 위임
  // ====================================================================
  const {
    desktopSessionReady,
    sessionRestoredRef,
    restoreSessionTabs,
    openExternalFile,
  } = useEditorDocumentSession({
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
    currentFileName,
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
  });

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorSaveActions] 에디터 파일 저장 및 새 문서 생성 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 로컬/웹드라이브 저장 및 새 문서 생성을 useEditorSaveActions로 237줄 분리 위임
  // ====================================================================
  const {
    handleSaveToLocal,
    handleSaveToWebDrive,
    handleCreateNewDocument,
    transferProgress,
  } = useEditorSaveActions({
    isRestrictedUser,
    isDuplicateInstance,
    isLicenseChecking,
    editorRef,
    contentRef,
    currentFileName,
    setCurrentFileName,
    rootFolder,
    refreshFileList,
    showToast,
    createNewTab,
    setCurrentFileNode,
    lastSavedContentRef,
    setSaveStatus,
    lastGeneralPreviewModeRef,
    setPreviewMode,
    setIsNewDocumentModalOpen,
  });

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorCommands] 에디터 통합 명령 디스패처 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] dispatchCommand를 useEditorCommands로 435줄 분리 위임
  // ====================================================================
  const { dispatchCommand } = useEditorCommands({
    isRestrictedUser,
    handlers,
    previewModeRef,
    previewRef,
    visualCommandRef,
    editorRef,
    executingVisualSourceActionRef,
    currentFileNodeRef,
    pendingVisualExportRef,
    emojiTargetRef,
    activeTabIdRef,
    youtubeEditRangeRef,
    handleInsertFormattedDate,
    handleSaveToWebDrive,
    handleSaveToLocal,
    setPreviewMode,
    insertAtCursor,
    removePrefix,
    quickWrap,
    selectResourceFolder,
    selectRootFolder,
    showToast,
    setPreviewFindReplaceMode,
    setDirectEditEnabled,
    setIsPreviewFindOpen,
    setMonacoDatePickerPos,
    setIsMonacoDatePickerOpen,
    setIsStyleModalOpen,
    setIsCitationModalOpen,
    setIsReferenceModalOpen,
    setIsSettingsModalOpen,
    setSettingsModalInitialTab,
    setIsHelpModalOpen,
    setIsLicenseModalOpen,
    setFloatingToolbar,
    setIsEmojiPanelOpen,
    setAiEditorContext,
    setAiDraftInitialMode,
    setIsAIDraftModalOpen,
    setIsToolbarOpen,
    setIsSidebarOpen,
    setThemePalette,
    setIsDarkMode,
    setIsMergeMode,
    setIsNewDocumentModalOpen,
    rootFolder,
    directEditEnabled,
    previewMode,
    setPreviewZoomScale,
    setSidebarTab,
    setIsSearchOpen,
    activeTabId,
    geminiApiKey,
    setYoutubeInitialUrl,
    setIsCalendarModalOpen,
  });


  // 🖨️ [인쇄 / 쪽 윤곽 모달 직결 이벤트 수신]
  useEffect(() => {
    const handleOpenPrint = () => {
      dispatchCommand('OPEN_EXPORT');
    };
    window.addEventListener('onrivi:open-print', handleOpenPrint);
    return () => window.removeEventListener('onrivi:open-print', handleOpenPrint);
  }, [dispatchCommand]);

  // 💡 [OMD-EDIT-MainEditorApp-0071] mapIdToCommandType는 @/types/editorCommand로 분리 이관
  const mapIdToCommandType = useCallback((id: string): EditorCommandType => {
    return importedMapIdToCommandType(id);
  }, []);

  useEffect(() => {
    const pending = visualSourceActionRef.current;
    if (!pending || !isEditorReady || content !== pending.source) return;
    if (pending.tabId !== activeTabId || isRestrictedUser) { visualSourceActionRef.current = null; return; }
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!model) return;
    if (model.getValue() !== pending.source) {
      model.setValue(pending.source);
    }
    const frame = requestAnimationFrame(() => {
      if (activeTabIdRef.current !== pending.tabId) return;
      const from = model.getPositionAt(pending.from);
      const to = model.getPositionAt(pending.to);
      editor.setSelection({ startLineNumber: from.lineNumber, startColumn: from.column,
        endLineNumber: to.lineNumber, endColumn: to.column });
      lastSelectionRef.current = editor.getSelection();
      visualSourceActionRef.current = null;
      executingVisualSourceActionRef.current = true;
      try { dispatchCommand(mapIdToCommandType(pending.id)); }
      finally { executingVisualSourceActionRef.current = false; }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTabId, content, dispatchCommand, isEditorReady, isRestrictedUser, mapIdToCommandType, previewMode]);

  // 💡 [Rule 3 비즈니스 로직 훅] Monaco 및 전역 단축키 처리를 useEditorKeybindings로 위임
  useEditorKeybindings({
    editorRef,
    customHotkeys,
    isEditorReady,
    dispatchCommand,
    mapIdToCommandType,
    geminiApiKey,
    showToast,
    previewModeRef,
    activeTabIdRef,
    contentRef,
    setAiEditorContext,
    setAiDraftInitialMode,
    setIsAIDraftModalOpen,
    floatingToolbar,
    setFloatingToolbar,
    floatingQuoteDropdown,
    isRestrictedUser
  });

  // 🛡️ [데스크톱/브라우저 전역 파일 드롭 방어]
  // 에디터나 미리보기 컨테이너 외부(사이드바, 타이틀바 등)에 파일 드롭 시 Electron/브라우저가 파일 URL로 새창을 띄우거나 페이지 이동하는 것 100% 원천 차단
  useEffect(() => {
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    window.addEventListener('dragenter', preventDrag, true);
    window.addEventListener('dragover', preventDrag, true);
    window.addEventListener('drop', preventDrag, true);
    document.addEventListener('dragenter', preventDrag, true);
    document.addEventListener('dragover', preventDrag, true);
    document.addEventListener('drop', preventDrag, true);
    return () => {
      window.removeEventListener('dragenter', preventDrag, true);
      window.removeEventListener('dragover', preventDrag, true);
      window.removeEventListener('drop', preventDrag, true);
      document.removeEventListener('dragenter', preventDrag, true);
      document.removeEventListener('dragover', preventDrag, true);
      document.removeEventListener('drop', preventDrag, true);
    };
  }, []);

  // 💡 플로팅 툴바 인용구 Alert 드롭다운 외부 클릭 시 자동 닫힘 감지기
  useEffect(() => {
    if (!floatingQuoteDropdown.open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#floating-quote-dropdown-container') && !target.closest('#floating-quote-dropdown-fixed')) {
        setFloatingQuoteDropdown(prev => ({ ...prev, open: false }));
      }
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    return () => window.removeEventListener('mousedown', handleOutsideClick, true);
  }, [floatingQuoteDropdown.open]);

  // 날짜/시간 형식 팝업은 툴바 밖을 클릭하거나 Escape를 누르면 닫습니다.
  useEffect(() => {
    if (!dateTimeFormatDropdown.open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent) {
        const target = event.target as HTMLElement;
        if (target.closest('#datetime-format-trigger') || target.closest('#datetime-format-dropdown-fixed')) return;
      }
      setDateTimeFormatDropdown(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('mousedown', close, true);
    window.addEventListener('keydown', close, true);
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('keydown', close, true);
    };
  }, [dateTimeFormatDropdown.open]);

  // ====================================================================
  // 📊 [OMD-HOOK-useEditorLifecycleEffects] 탭/파일 이벤트·테마·모드·자동저장 및 TOC 분리 훅
  // 🚨 @PATCH : 2026-11-04 - [MainEditorApp 모듈화] 탭 이름변경/삭제/라인점프 리스너, 에디터 테마·옵션 동기화, 제한사용자 웰컴 정리, 자동 저장, TOC 계산을 useEditorLifecycleEffects로 분리 위임
  // ====================================================================
  const { toc, handleMouseMove, stopResizing, startResizing } = useEditorLifecycleEffects({
    mounted,
    isEditorReady,
    editorRef,
    previewRef,
    tabs,
    setTabs,
    tabsRef,
    activeTabId,
    setActiveTabId,
    activeTabIdRef,
    prevActiveTabRef,
    prevCursorLineRef,
    switchTab,
    content,
    setContent,
    currentFileNode,
    setCurrentFileNode,
    currentFileName,
    setCurrentFileName,
    previewMode,
    setPreviewModeRaw,
    previewModeRef,
    lastGeneralPreviewModeRef,
    isEditorMountedRef,
    handleFileOpenByPath,
    themePalette,
    fontSize,
    wordWrap,
    editorFontWeight,
    editorHighContrast,
    isA4GuardEnabled,
    isLicenseChecking,
    isDuplicateInstance,
    isRestrictedUser,
    effectiveLicenseStatus,
    licenseStatus,
    sessionRestoringRef,
    helpContent,
    isResizing,
    setSidebarWidth,
    lastSavedContentRef,
    setSaveStatus,
    autoSave,
    saveFile,
    profiles,
    activeProfileId,
  });

  const heightClass = 'h-[calc(100vh-128px)]';
  const activeTab = tabs.find(t => t.id === activeTabId);
  // 🛡️ [EMBEDDED WELCOME 2026-07-07] 제한사용자 — licenseStatus로 직접 판단.
  // 탭/콘텐츠/activeTabId 상태와 무관하게 강제로 embedded 환영 페이지를 렌더링합니다.
  const showEmbeddedWelcome = false;
  const openTabPaths = useMemo(() => tabs.map(t => t.path).filter(Boolean) as string[], [tabs]);

  const contextValue = {
    content, setContent,
    tabs, setTabs,
    activeTabId, setActiveTabId,
    previewMode, setPreviewMode,
    isA4GuardEnabled, setIsA4GuardEnabled,
    currentFileName, setCurrentFileName,
    currentFileNode, setCurrentFileNode,
    workspaceType, setWorkspaceType,
    rootFolder, setRootFolder,
    resourceFolder, resourceFolderHandle,
    fileList, setFileList,
    dispatchCommand,
    isDarkMode, setIsDarkMode,
    themePalette, handleThemeChange,
    licenseStatus: effectiveLicenseStatus, isExpired: effectiveLicenseStatus.isExpired,
    isAddonEnv, editorRef, previewRef, showToast, openTabPaths, refreshFileList,
    driveLetter, profiles, activeProfileId, onSelectProfile: handleProfileChange, onOpenStyleSettings: () => setIsStyleModalOpen(true), DEFAULT_PROFILE: (window as any).DEFAULT_PROFILE || {},
    saveStatus, isToolbarOpen, setIsToolbarOpen, isSidebarOpen, setIsSidebarOpen, isActivated: (!isDuplicateInstance && effectiveLicenseStatus.isActivated), THEME_MAP,
    isDuplicateInstance, takeOverControl, isEditorPlan,
    cursorLine,
    cursorColumn,
    switchTab, closeTab, createNewTab,
    isSearchOpen, setIsSearchOpen,
    sidebarWidth, setSidebarWidth, sidebarTab, setSidebarTab,
    setCurrentFileName, lastSavedContentRef, toc, scrollToLine, openFile: handleFileClick,
    askConfirm: (config: any) => setConfirmConfig({ isOpen: true, ...config }),
    isMergeMode, setIsMergeMode, selectedMergeNodes, setSelectedMergeNodes, toggleMergeNodeSelect,
    onOpenMergeModal: handleOpenMergeModal, onSelectRootFolder: () => selectRootFolder('current', null),
    onRestoreFolder: restoreFolderPermission,
    isHelpModalOpen, setIsHelpModalOpen, helpTitle, setHelpTitle, helpContent, setHelpContent,
    tabs,
    geminiApiKey,
    aiModelName,
    setAiModelName,
    setIsAIDraftModalOpen,
    isAiButtonVisible,
    setIsAiButtonVisible,
    isRestrictedUser,
    connectGoogleDrive,
    disconnectGoogleDrive,
    isDriveConnected,
    isDriveAuthExpired
  };

  const { handleMount } = useMonacoSetup({
    editorRef, tabsRef, activeTabIdRef, contentRef, isComposingRef, previewDebounceRef,
    setContent, setTabs, activeTabId, setSaveStatus, currentFileNodeRef, lastSavedContentRef,
    saveFile, autoSaveRef, previewModeRef, previewRef, isScrollingRef, scrollTimeoutRef,
    isEditorReady, setIsEditorReady, themePalette, EDITOR_THEMES, updateDecorations,
    decorationsCollectionRef, isEditorHovered, prevCursorLineRef, frontmatterLinesRef,
    setActiveLine, setCursorLine, setCursorColumn, tabSizeRef, setFloatingToolbar, lastSelectionRef,
    completionProviderRef, getSlashCommands, customSlashCommandsRef,
    handleEditorPaste, handlePasteImageFile,
    wikilinkProviderRef, docLinkFilesRef, readFileTextRef, extractHeadings, getRelativePath,
    isEditorMountedRef, updateContent, editorFontWeight, isRestrictedUser
  });

  // 💡 [Step 2 리팩토링으로 docLinkPickerStyle 계산 로직은 useEditorDocLinks 내부로 이관됨]



  return (
    <>
      <style>{`
        .ai-changed-highlight {
          background-color: rgba(168, 85, 247, 0.25) !important;
          animation: ai-flash-fade 1.5s ease-out forwards;
        }
        @keyframes ai-flash-fade {
          0% { background-color: rgba(168, 85, 247, 0.35); }
          100% { background-color: rgba(168, 85, 247, 0); }
        }
        .ai-stream-pulse {
          animation: ai-pulse-bg 2s infinite ease-in-out;
        }
        @keyframes ai-pulse-bg {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .mic-pulse {
          animation: mic-pulse-anim 1.5s infinite;
        }
        @keyframes mic-pulse-anim {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
        }
      `}</style>
      <EditorProvider value={contextValue}>
        {/* ⏳ [게스트 즉시 체험 만료 가입 유도 모달 차단막] */}
        <GuestPaywallOverlay
          isGuestMode={isGuestMode}
          isGuestExpired={isGuestExpired}
          setIsGuestExpired={setIsGuestExpired}
          setGuestRemainingSeconds={setGuestRemainingSeconds}
          setLicenseStatus={setLicenseStatus}
        />

        <EditorLayout
          mounted={mounted}
          isDarkMode={isDarkMode}
          isDuplicateInstance={isDuplicateInstance}
          isEditorPlan={isEditorPlan}
          licenseStatus={licenseStatus}
          isTakingOver={isTakingOver}
          handleTakeover={handleTakeover}
          activeMainView={activeMainView}
          setActiveMainView={setActiveMainView}
          resourceFolder={resourceFolder}
          resourceFolderHandle={resourceFolderHandle}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          aiModelName={aiModelName}
          setAiModelName={setAiModelName}
          fileList={fileList}
          bottomBar={isAiButtonVisible && (
            <InlineAIAssistant
              documentId={activeTabId}
              disabled={!activeTabId || isRestrictedUser || currentFileName === '도움말.md'}
              disabledReason={!activeTabId ? '문서를 먼저 열거나 새 문서를 만들어 주세요.' : isRestrictedUser ? '현재 문서 편집 권한이 제한되어 있습니다. 로그인·인증 및 동시 접속 상태를 확인해 주세요.' : currentFileName === '도움말.md' ? '도움말은 수정할 수 없습니다. 작성할 문서를 열어 주세요.' : undefined}
              legacyKey={ensureDecryptedApiKey(geminiApiKey)}
              legacyModel={aiModelName}
              nickname={userNickname}
              resourceFolder={resourceFolder}
              resourceHandle={resourceFolderHandle}
              readDocument={() => editorRef.current?.hasTextFocus() ? editorRef.current.getValue() : contentRef.current}
              capture={(scope) => {
                if (resolveEffectiveDocumentProfile(contentRef.current).layout) {
                  if (previewModeRef.current !== 'preview' && editorRef.current?.hasTextFocus()) return captureMonacoAITarget(editorRef.current, activeTabIdRef.current || '', () => activeTabIdRef.current, scope);
                  if (scope === 'reference') return null;
                  throw Error('그림책은 질문·문서 정리를 사용할 수 있습니다. 문구 수정은 마크다운 편집창에서 글을 선택한 뒤 실행해 주세요.');
                }
                if(scope==='auto'){if(visualAITargetRef.current&&previewRef.current?.querySelector('.visual-document-editor'))return visualAITargetRef.current(scope);if(editorRef.current?.hasTextFocus()&&!editorRef.current.getSelection()?.isEmpty())return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,'selection');throw Error('문서 전체 수정은 문서보기에서 편집을 켠 뒤 실행해 주세요.');}
                if(scope==='document'){if(visualAITargetRef.current&&previewRef.current?.querySelector('.visual-document-editor'))return visualAITargetRef.current(scope);throw Error('문서 전체 수정은 문서보기에서 편집을 켠 뒤 실행해 주세요.');}
                if (editorRef.current?.hasTextFocus()) return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,scope);
                if (previewRef.current?.querySelector('.visual-document-editor') && visualAITargetRef.current) return visualAITargetRef.current(scope);
                if (previewModeRef.current === 'preview') throw Error('문서 편집을 켠 뒤 글을 선택해 주세요.');
                return captureMonacoAITarget(editorRef.current,activeTabIdRef.current || '',()=>activeTabIdRef.current,scope);
              }}
              onSettings={() => {setSettingsModalInitialTab('general');setIsSettingsModalOpen(true);}}
              isToolbarOpen={isToolbarOpen}
            />
          )}
        >
                    {/* 💡 [Rule 3 Core 영역] 에디터/미리보기 분할화면 본체를 EditorCore로 위임 */}
          <EditorCore
            isGuestMode={isGuestMode}
            isGuideMinimized={isGuideMinimized}
            setIsGuideMinimized={setIsGuideMinimized}
            guestRemainingSeconds={guestRemainingSeconds}
            guideStep={guideStep}
            setGuideStep={setGuideStep}
            formatTime={formatTime}
            webBasePath={webBasePath}
            setWebBasePath={setWebBasePath}
            showEmbeddedWelcome={showEmbeddedWelcome}
            handleFileOpenByPath={handleFileOpenByPath}
            handleDocFileClick={handleDocFileClick}
            handleMount={handleMount}
            fontSize={fontSize}
            editorFontWeight={editorFontWeight}
            editorHighContrast={editorHighContrast}
            wordWrap={wordWrap}
            spellCheck={spellCheck}
            editorTabSize={editorTabSize}
            contentRef={contentRef}
            activeTabIdRef={activeTabIdRef}
            previewModeRef={previewModeRef}
            isScrollingRef={isScrollingRef}
            scrollTimeoutRef={scrollTimeoutRef}
            handlersRef={handlersRef}
            handlers={handlers}
            updateContent={updateContent}
            insertAtCursor={insertAtCursor}
            insertImageMarkdown={insertImageMarkdown}
            handleCheckboxToggle={handleCheckboxToggle}
            handleCopyPreviewContent={handleCopyPreviewContent}
            handlePasteImageFile={handlePasteImageFile}
            handlePreviewImageLoaded={handlePreviewImageLoaded}
            editDocumentMedia={editDocumentMedia}
            isImageLikeFile={isImageLikeFile}
            dynamicCssString={dynamicCssString}
            lineMap={lineMap}
            processedContent={processedContent}
            previewContent={previewContent}
            previewZoomScale={previewZoomScale}
            setPreviewZoomScale={setPreviewZoomScale}
            isPreviewFindOpen={isPreviewFindOpen}
            setIsPreviewFindOpen={setIsPreviewFindOpen}
            previewFindReplaceMode={previewFindReplaceMode}
            setPreviewFindReplaceMode={setPreviewFindReplaceMode}
            bindPreviewScrollContainer={bindPreviewScrollContainer}
            isPreviewHovered={isPreviewHovered}
            bibContent={bibContent}
            customSlashCommands={customSlashCommands}
            customHotkeys={customHotkeys}
            directEditEnabled={directEditEnabled}
            setDirectEditEnabled={setDirectEditEnabled}
            visualAITargetRef={visualAITargetRef}
            visualCommandRef={visualCommandRef}
            visualDocLinkInsertRef={visualDocLinkInsertRef}
            visualDocLinkPositionRef={visualDocLinkPositionRef}
            visualFloatingOriginRef={visualFloatingOriginRef}
            visualFormulaInsertRef={visualFormulaInsertRef}
            visualImageInsertRef={visualImageInsertRef}
            visualMediaInsertRef={visualMediaInsertRef}
            visualSourceActionRef={visualSourceActionRef}
            floatingToolbar={floatingToolbar}
            setFloatingToolbar={setFloatingToolbar}
            floatingToolbarRef={floatingToolbarRef}
            floatingHeadingLevel={floatingHeadingLevel}
            setFloatingHeadingLevel={setFloatingHeadingLevel}
            setFloatingQuoteDropdown={setFloatingQuoteDropdown}
            executeFloatingItem={executeFloatingItem}
            showDocLinkPicker={showDocLinkPicker}
            setShowDocLinkPicker={setShowDocLinkPicker}
            docLinkPickerStyle={docLinkPickerStyle}
            docLinkSearchText={docLinkSearchText}
            setDocLinkSearchText={setDocLinkSearchText}
            allMdFiles={allMdFiles}
            isDocLinkLoading={isDocLinkLoading}
            selectedDocNode={selectedDocNode}
            setSelectedDocNode={setSelectedDocNode}
            docHeadings={docHeadings}
            setDocHeadings={setDocHeadings}
            isHeadingLoading={isHeadingLoading}
            docHeadingSearchText={docHeadingSearchText}
            setDocHeadingSearchText={setDocHeadingSearchText}
            docLinkCustomTitle={docLinkCustomTitle}
            setDocLinkCustomTitle={setDocLinkCustomTitle}
            setIsDocLinkTitleManuallyEdited={setIsDocLinkTitleManuallyEdited}
            closeDocLinkPicker={closeDocLinkPicker}
            handleDocLinkSelect={handleDocLinkSelect}
            getDocLinkDefaultLabel={getDocLinkDefaultLabel}
            buildDocLinkTarget={buildDocLinkTarget}
            setIsCitationModalOpen={setIsCitationModalOpen}
            setIsReferenceModalOpen={setIsReferenceModalOpen}
            setIsStyleModalOpen={setIsStyleModalOpen}
            setIsFormulaModalOpen={setIsFormulaModalOpen}
            setIsMapModalOpen={setIsMapModalOpen}
            setIsYoutubeModalOpen={setIsYoutubeModalOpen}
            setIsImageModalOpen={setIsImageModalOpen}
            setEditingImageInfo={setEditingImageInfo}
            setMediaDialogSource={setMediaDialogSource}
            setYoutubeInitialUrl={setYoutubeInitialUrl}
            setFormulaModalInitialLatex={setFormulaModalInitialLatex}
            setCursorLine={setCursorLine}
            setCursorColumn={setCursorColumn}
            resolveEffectiveDocumentProfile={resolveEffectiveDocumentProfile}
            autoClosingBrackets={autoClosingBrackets}
          />

            {isEmojiPanelOpen && (
              <EmojiPanel
                onClose={() => setIsEmojiPanelOpen(false)}
                isToolbarOpen={isToolbarOpen}
                onInsert={emoji => {
                  const target = emojiTargetRef.current;
                  if (!target || target.tabId !== activeTabIdRef.current) {
                    setIsEmojiPanelOpen(false);
                    return;
                  }
                  if (target.visual) {
                    visualCommandRef.current?.('INSERT_TEXT:' + emoji);
                  } else {
                    const editor = editorRef.current;
                    if (!editor) return;
                    if (target.selection) editor.setSelection(target.selection);
                    editor.focus();
                    editor.executeEdits('emoji-panel', [{ range: editor.getSelection(), text: emoji, forceMoveMarkers: true }]);
                    target.selection = editor.getSelection();
                  }
                }}
              />
            )}
            {isToolbarOpen && (
              <div className="no-print h-full w-12 flex flex-col justify-end bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700/60 pb-3">
                <Toolbar documentEditing={directEditEnabled && !!activeTabId && !isRestrictedUser && currentFileName !== '도움말.md'} />
              </div>
            )}
        </EditorLayout>

          {/* 💡 [Rule 3 Manager 영역] 모든 모달 및 플로팅 오버레이를 EditorOverlayManager로 통합 위임 */}
          <EditorOverlayManager
            modals={{
              isSettingsModalOpen, setIsSettingsModalOpen,
              settingsModalInitialTab, setSettingsModalInitialTab,
              isStyleModalOpen, setIsStyleModalOpen,
              isExportModalOpen, setIsExportModalOpen,
              isImageModalOpen, setIsImageModalOpen,
              editingImageInfo, setEditingImageInfo,
              isMergeModalOpen, setIsMergeModalOpen,
              isYoutubeModalOpen, setIsYoutubeModalOpen,
              youtubeInitialUrl, setYoutubeInitialUrl,
              isLicenseModalOpen, setIsLicenseModalOpen,
              isHelpModalOpen, setIsHelpModalOpen,
              isFormulaModalOpen, setIsFormulaModalOpen,
              isReferenceModalOpen, setIsReferenceModalOpen,
              promptConfig, setPromptConfig,
              confirmConfig, setConfirmConfig,
              isMapModalOpen, setIsMapModalOpen,
              isTableModalOpen, setIsTableModalOpen,
              isCitationModalOpen, setIsCitationModalOpen,
              isResourceGuideModalOpen,
              setIsResourceGuideModalOpen: (open: boolean) => {
                setIsResourceGuideModalOpen(open);
                if (!open) {
                  setIsDismissedGuide(true);
                }
              }
            }}
            deps={{
              isDarkMode, setIsDarkMode, fontSize, setFontSize, editorTabSize, setEditorTabSize, spellCheck, setSpellCheck, wordWrap, setWordWrap,
              autoSave, setAutoSave, rootFolder, selectRootFolder, driveLetter, setDriveLetter,
              workspaceType, setWorkspaceType, previewMode, setPreviewMode, customHotkeys, setCustomHotkeys,
              customSlashCommands, setCustomSlashCommands, licenseKey, setLicenseKey, themePalette, handleThemeChange,
              isActivated, autoClosingBrackets, setAutoClosingBrackets,
              editorFontWeight, setEditorFontWeight, editorHighContrast, setEditorHighContrast,
              geminiApiKey, setGeminiApiKey, aiModelName, setAiModelName,
              licenseStatus, deviceId, handleSuccessActivation, handlers, content, bibContent, activeTabId, currentFileNodeRef,
              setCurrentFileName, setCurrentFileNode, lastSavedContentRef, setSaveStatus, refreshFileList,
              showToast, editorRef, insertAtCursor, lastSelectionRef, setIsMergeMode, selectedMergeNodes, setSelectedMergeNodes,
              formulaModalInitialLatex,
              handleFileClick, profiles, activeProfileId, dynamicCssString, setActiveProfileId: handleProfileChange, setProfiles,
              isSystemProfileId,
              getApiUrl,
              DEFAULT_PROFILE,
              SYSTEM_PROFILES,
              vfsCreateFile,
              vfsWriteFile,
              vfsCreateFolder,
              helpTitle, helpContent, setHelpContent,
              resourceFolder, resourceFolderRef, resourceFolderHandle, selectResourceFolder, clearResourceFolder,
              userNickname, setUserNickname,
              updateContent,
              replaceDocumentMedia: (range,path,alt) => {
                const escaped = alt.replace(/([\[]])/g,'\$1');
                if (!replaceDocumentMedia(range,`![${escaped}](${path.includes(' ')?'<'+path+'>':path})`)) showToast('문서가 변경되었습니다. 다시 선택해 주세요.','warning');
              },
              mediaDialogSource,
              clearMediaDialog: () => {setMediaDialogSource(null);visualMediaInsertRef.current=null;},
              insertVisualMedia: (kind,code) => {
                const target = visualMediaInsertRef.current;
                if (!target || target.kind !== kind || target.documentId !== activeTabIdRef.current || !target.insert(code)) {
                  showToast('문서나 미디어 위치가 변경되었습니다. 다시 선택해 주세요.','warning');
                }
                setMediaDialogSource(null); visualMediaInsertRef.current=null;
              },
              replaceVisualImage: (range, path, alt, fullMarkdown) => {
                if (range.documentId !== activeTabIdRef.current || !visualImageInsertRef.current?.(path, alt, fullMarkdown)) {
                  showToast('문서나 이미지 위치가 변경되었습니다. 사진을 다시 선택해 주세요.', 'warning');
                }
                visualImageInsertRef.current = null;
              },
              replacePicturebookImage: (range, path, alt) => {
                if (range.documentId !== activeTabIdRef.current) { showToast('문서가 변경됐습니다. 그림을 다시 선택해 주세요.', 'warning'); return; }
                try {
                  const next = replaceSceneImage(contentRef.current,range.bookSceneIndex,path,alt,range.originalSceneRaw);
                  contentRef.current = next;
                  updateContent(next);
                  setTabs(previous => previous.map(tab => tab.id === activeTabIdRef.current ? {...tab,content:next,isModified:true} : tab));
                } catch(error) {
                  logError({
                    file: 'src/components/MainEditorApp.tsx',
                    func: 'replacePicturebookImage',
                    doing: '그림책(Story Book) 씬 이미지 교체 반영',
                    target: path,
                    error,
                  });
                  showToast(error.message,'warning');
                }
              }
            }}
            aiDraft={{
              isOpen: isAIDraftModalOpen,
              onClose: () => setIsAIDraftModalOpen(false),
              onApply: handleAIDraftApply,
              geminiApiKey: geminiApiKey || '',
              aiModelName: aiModelName || 'gemini-3.8-flash',
              onModelChange: (newModel) => setAiModelName?.(newModel),
              initialMode: aiDraftInitialMode,
              editorContext: {
                selectedText: aiEditorContext?.selectedText ?? (editorRef.current && !editorRef.current.getSelection()?.isEmpty() ? editorRef.current.getModel()?.getValueInRange(editorRef.current.getSelection()!) : '') ?? '',
                fullText: aiEditorContext?.fullText || editorRef.current?.getModel()?.getValue() || contentRef.current || content || '',
              },
              resourceFolder,
              resourceFolderHandle,
              rootFolder
            }}
            calendar={{
              isOpen: isCalendarModalOpen,
              onClose: () => setIsCalendarModalOpen(false),
              onInsert: handleInsertFormattedDate,
              isDarkMode
            }}
            newDocument={{
              isOpen: isNewDocumentModalOpen,
              onClose: () => setIsNewDocumentModalOpen(false),
              fileList,
              rootFolder,
              workspaceType,
              onConfirm: handleCreateNewDocument,
              isDarkMode
            }}
            dateTimePicker={{
              isOpen: isMonacoDatePickerOpen,
              position: monacoDatePickerPos,
              onClose: () => setIsMonacoDatePickerOpen(false),
              onInsert: handleInsertFormattedDate,
              isDarkMode
            }}
            floatingQuote={{
              dropdown: floatingQuoteDropdown,
              setDropdown: setFloatingQuoteDropdown,
              executeFloatingItem,
              dispatchCommand
            }}
            misc={{
              transferProgress,
              mounted,
              isMobile,
              isAiLoading,
              isRecording,
              setIsRecording,
              showToast,
              insertAtCursor
            }}
          />
      </EditorProvider>
    </>
  );
}
