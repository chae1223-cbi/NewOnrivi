// 🚨 @PATCH : **2026-11-04** — [formatTime 방어 가드 강화]: formatTime 호출 시 옵셔널 체이닝 및 안전 폴백 적용으로 게스트 타이머 미정의 런타임 오류 원천 차단
// 🚨 @PATCH : **2026-11-04** — [Rule 3 역할 기반 분리 (4단계 EditorCore)]: Monaco Editor, MarkdownViewer/VisualDocumentEditor 스플릿뷰, 브레드크럼, 탭바, 플로팅 툴바, 문서링크 픽커를 포함하는 에디터 코어 렌더링 뷰를 MainEditorApp에서 독립 모듈로 분리
// @ts-nocheck
"use client";

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Editor from '@monaco-editor/react';
import MarkdownViewer, { isPathInsideWorkspace } from '@/components/MarkdownViewer';
import VisualDocumentEditor from '@/components/VisualDocumentEditor';
import { PreviewToolbar } from '@/components/preview/PreviewToolbar';
import { PreviewFindWidget } from '@/components/preview/PreviewFindWidget';
import UnifiedTabBar from '@/components/UnifiedTabBar';
import { Icon } from '@/components/icons/Icon';
import { useEditorContext } from '@/context/EditorContext';
import { EDITOR_THEMES, applySafeMarkdownMonarchTokenizer } from '@/lib/editorThemes';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { getWelcomeContent } from '@/constants/welcomeContent';
import { parseDroppedDataToBlob, fetchExternalImageFile } from '@/lib/resourceMedia';
import { visualImageDetails } from '@/lib/visualDocumentCodec';
import { picturebookImageReference } from '@/lib/imageResourceName';
import { parseBookScenes } from '@/lib/picturebook';
import { extractFrontmatter } from '@/lib/frontmatter';
import { FileNode } from '@/lib/indexedDbHelper';

export interface EditorCoreProps {
  isGuestMode?: boolean;
  isGuideMinimized?: boolean;
  setIsGuideMinimized?: (min: boolean) => void;
  guestRemainingSeconds?: number;
  guideStep?: number;
  setGuideStep?: (step: number) => void;
  formatTime?: (sec: number) => string;
  webBasePath?: string;
  setWebBasePath?: (path: string) => void;
  showEmbeddedWelcome?: boolean;
  handleFileOpenByPath?: (path: string, hash?: string, fromUserClick?: boolean) => Promise<any>;
  handleDocFileClick?: (node: any) => Promise<void>;
  handleMount?: (editor: any, monaco: any) => void;
  fontSize?: number;
  editorFontWeight?: string;
  editorHighContrast?: boolean;
  wordWrap?: string;
  spellCheck?: boolean;
  editorTabSize?: number;
  contentRef?: React.MutableRefObject<string>;
  activeTabIdRef?: React.MutableRefObject<string | null>;
  previewModeRef?: React.MutableRefObject<string>;
  isScrollingRef?: React.MutableRefObject<'editor' | 'preview' | null>;
  scrollTimeoutRef?: React.MutableRefObject<any>;
  handlersRef?: React.MutableRefObject<any>;
  handlers?: any;
  updateContent?: (val: string, immediate?: boolean, skipModelUpdate?: boolean) => void;
  insertAtCursor?: (text: string) => void;
  insertImageMarkdown?: (path: string) => void;
  handleCheckboxToggle?: (index: number, checked: boolean) => void;
  handleCopyPreviewContent?: () => Promise<void>;
  handlePasteImageFile?: (file: Blob, onSaved: (path: string) => void) => Promise<void>;
  handlePreviewImageLoaded?: () => void;
  editDocumentMedia?: (kind: 'image' | 'video' | 'map', path: string, line: number) => void;
  isImageLikeFile?: (file: File) => boolean;
  dynamicCssString?: string;
  lineMap?: any[];
  processedContent?: string;
  previewContent?: string;
  previewZoomScale?: number;
  setPreviewZoomScale?: React.Dispatch<React.SetStateAction<number>>;
  isPreviewFindOpen?: boolean;
  setIsPreviewFindOpen?: (open: boolean) => void;
  previewFindReplaceMode?: boolean;
  setPreviewFindReplaceMode?: (mode: boolean) => void;
  bindPreviewScrollContainer?: (el: HTMLElement | null) => void;
  isPreviewHovered?: React.MutableRefObject<boolean>;
  bibContent?: string;
  customSlashCommands?: any[];
  customHotkeys?: any[];
  directEditEnabled?: boolean;
  setDirectEditEnabled?: (enabled: boolean) => void;
  visualAITargetRef?: React.MutableRefObject<any>;
  visualCommandRef?: React.MutableRefObject<((cmd: string) => boolean) | null>;
  visualDocLinkInsertRef?: React.MutableRefObject<any>;
  visualDocLinkPositionRef?: React.MutableRefObject<any>;
  visualFloatingOriginRef?: React.MutableRefObject<boolean>;
  visualFormulaInsertRef?: React.MutableRefObject<any>;
  visualImageInsertRef?: React.MutableRefObject<any>;
  visualMediaInsertRef?: React.MutableRefObject<any>;
  visualSourceActionRef?: React.MutableRefObject<any>;
  floatingToolbar?: any;
  setFloatingToolbar?: React.Dispatch<React.SetStateAction<any>>;
  floatingToolbarRef?: React.MutableRefObject<any>;
  floatingHeadingLevel?: number;
  setFloatingHeadingLevel?: (lvl: number) => void;
  setFloatingQuoteDropdown?: React.Dispatch<React.SetStateAction<any>>;
  executeFloatingItem?: (item: any) => void;
  showDocLinkPicker?: boolean;
  setShowDocLinkPicker?: (show: boolean) => void;
  docLinkPickerStyle?: React.CSSProperties;
  docLinkSearchText?: string;
  setDocLinkSearchText?: (text: string) => void;
  allMdFiles?: FileNode[];
  isDocLinkLoading?: boolean;
  selectedDocNode?: FileNode | null;
  setSelectedDocNode?: (node: FileNode | null) => void;
  docHeadings?: string[];
  setDocHeadings?: (headings: string[]) => void;
  isHeadingLoading?: boolean;
  docHeadingSearchText?: string;
  setDocHeadingSearchText?: (text: string) => void;
  docLinkCustomTitle?: string;
  setDocLinkCustomTitle?: (title: string) => void;
  setIsDocLinkTitleManuallyEdited?: (edited: boolean) => void;
  closeDocLinkPicker?: () => void;
  handleDocLinkSelect?: (node: FileNode, heading?: string, customTitle?: string) => void;
  getDocLinkDefaultLabel?: (targetNode: FileNode) => string;
  buildDocLinkTarget?: (targetNode: FileNode, heading?: string) => string;
  setIsCitationModalOpen?: (open: boolean) => void;
  setIsReferenceModalOpen?: (open: boolean) => void;
  setIsStyleModalOpen?: (open: boolean) => void;
  setIsFormulaModalOpen?: (open: boolean) => void;
  setIsMapModalOpen?: (open: boolean) => void;
  setIsYoutubeModalOpen?: (open: boolean) => void;
  setIsImageModalOpen?: (open: boolean) => void;
  setEditingImageInfo?: (info: any) => void;
  setMediaDialogSource?: (src: any) => void;
  setYoutubeInitialUrl?: (url: string | null) => void;
  setFormulaModalInitialLatex?: (latex: string) => void;
  setCursorLine?: (line: number) => void;
  setCursorColumn?: (col: number) => void;
  resolveEffectiveDocumentProfile?: (docText: string) => any;
  autoClosingBrackets?: boolean;
}

export default function EditorCore(props: EditorCoreProps) {
  const {
    isGuestMode,
    isGuideMinimized,
    setIsGuideMinimized,
    guestRemainingSeconds,
    guideStep,
    setGuideStep,
    formatTime,
    webBasePath,
    setWebBasePath,
    showEmbeddedWelcome,
    handleFileOpenByPath,
    handleDocFileClick,
    handleMount,
    fontSize,
    editorFontWeight,
    editorHighContrast,
    wordWrap,
    spellCheck,
    editorTabSize,
    contentRef,
    activeTabIdRef,
    previewModeRef,
    isScrollingRef,
    scrollTimeoutRef,
    handlersRef,
    handlers,
    updateContent,
    insertAtCursor,
    insertImageMarkdown,
    handleCheckboxToggle,
    handleCopyPreviewContent,
    handlePasteImageFile,
    handlePreviewImageLoaded,
    editDocumentMedia,
    isImageLikeFile,
    dynamicCssString,
    lineMap,
    processedContent,
    previewContent,
    previewZoomScale,
    setPreviewZoomScale,
    isPreviewFindOpen,
    setIsPreviewFindOpen,
    previewFindReplaceMode,
    setPreviewFindReplaceMode,
    bindPreviewScrollContainer,
    isPreviewHovered,
    bibContent,
    customSlashCommands,
    customHotkeys,
    directEditEnabled,
    setDirectEditEnabled,
    visualAITargetRef,
    visualCommandRef,
    visualDocLinkInsertRef,
    visualDocLinkPositionRef,
    visualFloatingOriginRef,
    visualFormulaInsertRef,
    visualImageInsertRef,
    visualMediaInsertRef,
    visualSourceActionRef,
    floatingToolbar,
    setFloatingToolbar,
    floatingToolbarRef,
    floatingHeadingLevel,
    setFloatingHeadingLevel,
    setFloatingQuoteDropdown,
    executeFloatingItem,
    showDocLinkPicker,
    setShowDocLinkPicker,
    docLinkPickerStyle,
    docLinkSearchText,
    setDocLinkSearchText,
    allMdFiles,
    isDocLinkLoading,
    selectedDocNode,
    setSelectedDocNode,
    docHeadings,
    setDocHeadings,
    isHeadingLoading,
    docHeadingSearchText,
    setDocHeadingSearchText,
    docLinkCustomTitle,
    setDocLinkCustomTitle,
    setIsDocLinkTitleManuallyEdited,
    closeDocLinkPicker,
    handleDocLinkSelect,
    getDocLinkDefaultLabel,
    buildDocLinkTarget,
    setIsCitationModalOpen,
    setIsReferenceModalOpen,
    setIsStyleModalOpen,
    setIsFormulaModalOpen,
    setIsMapModalOpen,
    setIsYoutubeModalOpen,
    setIsImageModalOpen,
    setEditingImageInfo,
    setMediaDialogSource,
    setYoutubeInitialUrl,
    setFormulaModalInitialLatex,
    setCursorLine,
    setCursorColumn,
    resolveEffectiveDocumentProfile,
    autoClosingBrackets,
  } = props;

  const {
    content,
    setContent,
    tabs,
    setTabs,
    activeTabId,
    previewMode,
    setPreviewMode,
    isA4GuardEnabled,
    currentFileName,
    currentFileNode,
    workspaceType,
    rootFolder,
    resourceFolder,
    resourceFolderHandle,
    dispatchCommand,
    isDarkMode,
    themePalette,
    isRestrictedUser,
    editorRef,
    previewRef,
    showToast,
    driveLetter,
  } = useEditorContext();

  const activeTab = useMemo(() => (tabs || []).find((t: any) => t.id === activeTabId), [tabs, activeTabId]);

  return (
          <main className="flex flex-1 flex-col overflow-hidden bg-transparent relative">
              
              {/* ⏳ [게스트 즉시 체험판 인터랙티브 플로팅 가이드 위젯] */}
              {isGuestMode && (
                <div className="absolute top-16 right-6 z-[99] no-print" translate="no">
                  {isGuideMinimized ? (
                    <button 
                      onClick={() => setIsGuideMinimized(false)}
                      className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition duration-150 cursor-pointer border-none text-base font-bold"
                      title={`체험판 가이드 열기 (남은 시간: ${formatTime ? formatTime(guestRemainingSeconds ?? 0) : ''})`}
                    >
                      🌟
                    </button>
                  ) : (
                    <div className="w-[320px] bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl text-left select-none text-zinc-800 dark:text-zinc-200">
                      <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          🌟 5분 체험 가이드 ({guideStep}단계 / 5단계)
                        </span>
                        <button 
                          onClick={() => setIsGuideMinimized(true)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs bg-none border-none cursor-pointer"
                        >
                          접기
                        </button>
                      </div>

                      {/* ⏱️ 체험 남은 시간 및 접속 횟수 상시 노출 영역 */}
                      <div className="mb-3.5 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/40 rounded-xl flex justify-between items-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                        <div className="flex items-center gap-1.5 animate-pulse">
                          <span>⏱️ 남은 시간:</span>
                          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{formatTime ? formatTime(guestRemainingSeconds ?? 0) : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-2.5">
                          <span>🔄 접속:</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{typeof window !== 'undefined' ? localStorage.getItem('onrivi_guest_try_count') || '1' : '1'} / 5회</span>
                        </div>
                      </div>

                      {/* 단계별 내용 */}
                      {guideStep === 1 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">1단계: 작업장 폴더 설정 📂</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            윈도우 탐색기에서 <strong>my_writing</strong> 폴더를 만든 후, 온리비 메뉴바의 <strong>파일(F) &gt; 작업장 폴더 열기</strong>를 눌러 해당 폴더를 연동해 주세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 2 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">2단계: 공통 자원폴더 지정 ⚙️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            모든 서식과 미디어가 저장될 공통 자원 폴더를 PC에 만들고, 온리비 메뉴바의 <strong>도구(T) &gt; 환경설정 &gt; 일반설정 &gt; 자원관리</strong>에서 폴더를 지정해 주세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 3 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">3단계: 간단한 문서 만들기 ✍️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2.5">
                            아래 첨부파일을 다운받아 메모장으로 열고, 전체 내용을 복사해서 새 파일(Onrivi_Author)에 붙여넣어 주세요. (에디터 하단 <strong>분할모드</strong> 활성화 권장)
                          </p>
                          <a 
                            href="/onrivi_author.md" 
                            download 
                            className="inline-block py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 font-bold text-[10px] rounded-lg transition duration-150 cursor-pointer border-none text-center no-underline"
                          >
                            📥 실습용 onrivi_author.md 다운로드
                          </a>
                        </div>
                      )}
                      {guideStep === 4 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">4단계: 내보내기 및 인쇄 (출력) 🖨️</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            오른쪽 <strong>서식설정(프로필)</strong>을 열어 원하는 서식을 선택한 후, 상단 메뉴바의 <strong>파일(F) &gt; 내보내기 &gt; 인쇄/PDF</strong>를 클릭하여 문서를 PDF나 프린터로 고품질 출력하세요.
                          </p>
                        </div>
                      )}
                      {guideStep === 5 && (
                        <div>
                          <h4 className="font-bold text-xs mb-1 text-zinc-900 dark:text-white">5단계: 자유로운 글쓰기 시작 🍀</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2.5">
                            기본 1~4단계를 무사히 마치셨습니다! 이제 체험 챌린지 가이드를 닫고, 온리비 어서(Onrivi Author) 공간에서 자유롭고 멋지게 나만의 원고를 창작해 보셔요!
                          </p>
                          <button 
                            onClick={() => {
                              localStorage.removeItem('onrivi_guest_mode');
                              localStorage.removeItem('onrivi_guest_expired');
                              localStorage.removeItem('onrivi_guest_start_time');
                              localStorage.removeItem('onrivi_guest_try_count');
                              window.location.href = '/signup';
                            }}
                            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition duration-150 cursor-pointer border-none text-center"
                          >
                            무료 회원가입하고 계속 사용하기
                          </button>
                        </div>
                      )}

                      {/* 이전/다음 버튼 */}
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                        <button 
                          disabled={guideStep === 1}
                          onClick={() => setGuideStep(p => p - 1)}
                          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                        >
                          이전
                        </button>
                        <button 
                          disabled={guideStep === 5}
                          onClick={() => setGuideStep(p => p + 1)}
                          className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/70 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none"
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              

              {/* 탭 바를 오른쪽 에디터/미리보기 영역에만 위치하도록 main 상단에 배치 */}
              {!showEmbeddedWelcome && (
                <div className="no-print flex flex-col w-full">
                  <UnifiedTabBar />
                  {activeTab && (() => {
                    let rootDrive = '';
                    let baseFolders: string[] = [];
                    let rootName = '';
                    let folders: string[] = [];
                    let fileName = currentFileName || '';

                    const targetPath = currentFileNode?.path || activeTab?.path || '';

                    // 1. 데스크톱 / 로컬 파일 시스템 (targetPath에 OS 실제 절대경로가 있는 경우)
                    if (targetPath && (targetPath.includes(':') || targetPath.startsWith('/'))) {
                      const cleanPath = targetPath.replace(/\\/g, '/');
                      const parts = cleanPath.split('/').filter(Boolean);
                      if (cleanPath.includes(':')) {
                        rootDrive = parts[0]; // 예: "E:"
                        folders = parts.slice(1, parts.length - 1); // ["ZZ 개인자료", "블로그", "사업구상", "홈페이지 외주제작"]
                        fileName = parts[parts.length - 1] || currentFileName;
                      } else {
                        rootDrive = '/';
                        folders = parts.slice(0, parts.length - 1);
                        fileName = parts[parts.length - 1] || currentFileName;
                      }
                    } else if (workspaceType === 'browser') {
                      // 2. 웹 브라우저 환경 (W3C File System Access API: 보안상 상위 디렉터리 은닉)
                      // 사용자가 설정한 실제 상위 경로(예: "E:\ZZ 개인자료")가 있다면 프리픽스로 연결
                      if (webBasePath) {
                        const cleanBase = webBasePath.replace(/\\/g, '/');
                        const baseParts = cleanBase.split('/').filter(Boolean);
                        if (cleanBase.includes(':')) {
                          rootDrive = baseParts[0];
                          baseFolders = baseParts.slice(1);
                        } else {
                          baseFolders = baseParts;
                        }
                      }

                      rootName = rootFolder?.name || '블로그';
                      const subPath = targetPath;
                      const subSegments = subPath.replace(/\\/g, '/').split('/').filter(Boolean);
                      if (subSegments.length > 0) {
                        fileName = subSegments[subSegments.length - 1];
                        folders = subSegments.slice(0, subSegments.length - 1);
                      }
                    } else if (workspaceType === 'cloud') {
                      rootDrive = 'Cloud:';
                      const cloudName = rootFolder?.type === 'GDRIVE' ? 'Google Drive' : 'Cloud';
                      rootName = rootFolder?.displayName || rootFolder?.name || `[${cloudName}]`;
                      const subPath = targetPath;
                      const subSegments = subPath.replace(/\\/g, '/').split('/').filter(Boolean);
                      if (subSegments.length > 0) {
                        fileName = subSegments[subSegments.length - 1];
                        folders = subSegments.slice(0, subSegments.length - 1);
                      }
                    } else {
                      rootDrive = driveLetter || 'C:';
                      rootName = rootFolder?.name || 'Workspace';
                      fileName = currentFileName || '새 문서.md';
                    }

                    // 전체 절대경로 문자열 생성
                    const allParts = [rootDrive, ...baseFolders, rootName, ...folders, fileName].filter(Boolean);
                    const fullAbsolutePath = allParts.join('\\').replace(/\\\\+/g, '\\');

                    return (
                      <div
                        className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/90 dark:bg-zinc-900 text-[11px] font-bold text-slate-900 dark:text-zinc-100 overflow-x-auto no-scrollbar gap-2 select-none shadow-2xs z-10"
                        title={`절대경로: ${fullAbsolutePath}`}
                      >
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {/* 드라이브 루트 (존재할 경우) */}
                          {rootDrive && (
                            <>
                              <span className="flex items-center gap-1 shrink-0 text-slate-800 dark:text-zinc-300 font-bold bg-slate-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-300/60 dark:border-zinc-700">
                                <Icon name="HardDrive" size={12} className="text-slate-600 dark:text-zinc-400 shrink-0" />
                                <span>{rootDrive}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </>
                          )}

                          {/* 상위 기본 폴더들 (웹 베이스 경로 등) */}
                          {baseFolders.map((bFolder, idx) => (
                            <React.Fragment key={`base-${idx}`}>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-800 dark:text-zinc-200 font-bold">
                                <Icon name="FolderOpen" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{bFolder}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </React.Fragment>
                          ))}

                          {/* 워크스페이스 루트 폴더 */}
                          {rootName && (
                            <>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-900 dark:text-white font-bold">
                                <Icon name="FolderOpen" size={14} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{rootName}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </>
                          )}

                          {/* 하위 폴더들 */}
                          {folders.map((folder, idx) => (
                            <React.Fragment key={`folder-${idx}`}>
                              <span className="flex items-center gap-1.5 shrink-0 text-slate-900 dark:text-white font-bold">
                                <Icon name="FolderOpen" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                                <span>{folder}</span>
                              </span>
                              <Icon name="ArrowRight" size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 stroke-[2.5]" />
                            </React.Fragment>
                          ))}

                          {/* 현재 활성 파일명 */}
                          <span className="flex items-center gap-1.5 shrink-0 font-bold text-slate-950 dark:text-white bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-xs">
                            <Icon name="Document" size={13} strokeWidth={1.75} className="shrink-0 text-current opacity-80" />
                            <span className="truncate max-w-[350px]">{fileName}</span>
                          </span>
                        </div>

                        {/* 우측 퀵 액션 버튼들 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 웹 브라우저 전용: 실제 상위 절대경로 설정 버튼 */}
                          {workspaceType === 'browser' && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = localStorage.getItem('onrivi_web_base_path') || '';
                                const input = window.prompt(
                                  "웹 브라우저는 보안상 상위 폴더 경로(드라이브 명 등)를 노출하지 않습니다.\n실제 로컬 컴퓨터 상위 절대경로를 입력하시면 정확히 일치되어 표시됩니다:\n(예: E:\\ZZ 개인자료)",
                                  current || (rootDrive && baseFolders.length ? `${rootDrive}\\${baseFolders.join('\\')}` : "E:\\ZZ 개인자료")
                                );
                                if (input !== null) {
                                  const trimmed = input.trim();
                                  localStorage.setItem('onrivi_web_base_path', trimmed);
                                  setWebBasePath(trimmed);
                                  showToast(trimmed ? `기준 절대경로가 설정되었습니다:\n${trimmed}` : "기준 절대경로가 초기화되었습니다.", "success");
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-normal border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                              title="웹 환경 상위 절대경로(드라이브/폴더) 설정"
                            >
                              <Icon name="Settings" size={11} />
                              <span className="hidden md:inline">상위경로 설정</span>
                            </button>
                          )}

                          {/* 절대경로 클립보드 복사 버튼 */}
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(fullAbsolutePath);
                                showToast(`절대경로가 복사되었습니다:\n${fullAbsolutePath}`, 'success');
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors font-normal border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                            title="절대경로 복사"
                          >
                            <Icon name="Copy" size={11} />
                            <span className="hidden sm:inline">경로 복사</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {showEmbeddedWelcome ? (
                <div className="flex-1 overflow-y-auto bg-zinc-100">
                  <div className="max-w-4xl mx-auto py-8 px-4">
                    <MarkdownViewer
                      content={getWelcomeContent()}
                      originalContent={getWelcomeContent()}
                      lineMap={[]}
                      onFileOpen={handleFileOpenByPath}
                      rootFolderPath={rootFolder?.name}
                      rootFolder={rootFolder}
                      resourceFolderHandle={resourceFolderHandle}
                      resourceFolder={resourceFolder}

                      workspaceType={workspaceType}
                    />
                  </div>
                </div>
              ) : (
                // 💡 [지능형 빈 페이지 가드] 열려있는 탭이 아예 없을 때 에디터 및 미리보기를 회색 차단 영역으로 렌더링
                tabs.length === 0 || !activeTab ? (
                  <div className="flex-grow flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-900 text-center gap-4 transition-all duration-300 p-8 select-none">
                    <div className="p-4 bg-zinc-300/60 dark:bg-zinc-800/85 rounded-full text-zinc-500 dark:text-zinc-400 shadow-sm">
                      <Icon name="Lock" size={32} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                        열린 문서가 없습니다
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold max-w-sm leading-relaxed">
                        현재 열린 마크다운 문서가 없습니다.
                        <br />
                        좌측 파일 탐색기에서 마크다운(.md) 파일을 선택하여 문서를 열어주세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 overflow-hidden relative">



                    <div
                      id="onrivi-markdown-pane"
                      className={`flex-1 min-w-0 relative no-print bg-[#eef2f6] dark:bg-[#0b1120] pl-7 pr-4 sm:pl-9 sm:pr-6 ${
                        previewMode === 'both' ? 'border-l-2 border-slate-300 dark:border-slate-700 shadow-[inset_4px_0_12px_rgba(15,23,42,0.06)]' : ''
                      } ${editorHighContrast ? 'editor-high-contrast' : ''} editor-weight-${editorFontWeight}`}
                      style={{
                        order: 1,
                        width: previewMode === 'both' ? '50%' : '100%',
                        flexBasis: previewMode === 'both' ? '50%' : '100%',
                        display: (previewMode === 'preview' || activeTab?.isStyleTab === true) ? 'none' : 'block'
                      }}
                    >
                      <Editor
                        height="100%"
                        loading={
                          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                            <p>편집기를 불러오는 중입니다.</p>
                            <p className="text-sm text-slate-500">오래 걸리면 미리보기로 전환해 문서를 확인할 수 있습니다.</p>
                            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setPreviewMode('preview')}>
                              미리보기로 전환
                            </button>
                          </div>
                        }
                        language="markdown"
                        theme={themePalette}
                        // 💡 value={content} 속성을 배제하고 defaultValue를 적용하여
                        // React 상태 갱신 시 모나코 내부의 불필요한 setValue 호출로 인한 한글 composition 깨짐 및 중복 입력을 원천 방어합니다.
                        defaultValue={content}
                        // 콘텐츠 상태 갱신은 각 Monaco 모델의 onDidChangeContent 리스너가
                        // 단일하게 담당합니다. 여기서도 updateContent를 호출하면 입력 한 번에
                        // 즉시 갱신과 100ms 지연 갱신이 모두 발생해 미리보기가 두 번 리렌더링됩니다.
                        beforeMount={(monaco) => {
                          applySafeMarkdownMonarchTokenizer(monaco);
                          EDITOR_THEMES.forEach(t => {
                            const isDark = t.base === 'vs-dark';
                            const defaultFg = isDark ? '#e2e8f0' : '#1e293b';
                            const defaultPunctuation = isDark ? 'e2e8f0' : '1e293b';
                            const activeFg = editorHighContrast ? (isDark ? '#ffffff' : '#000000') : defaultFg;
                            const activePunctuation = editorHighContrast ? (isDark ? 'ffffff' : '000000') : defaultPunctuation;

                            monaco.editor.defineTheme(t.id, {
                              base: t.base,
                              inherit: true,
                              rules: [
                                ...(t.rules || []),
                                { token: 'punctuation', foreground: activePunctuation },
                                { token: 'delimiter.markdown', foreground: editorHighContrast ? (isDark ? '38bdf8' : '1d4ed8') : '60a5fa', fontStyle: 'bold' },
                                { token: 'string.link.markdown', foreground: isDark ? '94a3b8' : '64748b' },
                                { token: 'variable.md', foreground: 'f59e0b' }
                              ],
                              colors: {
                                ...t.colors,
                                'editor.background': isDark ? '#0b1120' : '#eef2f6', // 🎯 문서 보기(#ffffff)와 경계가 구분되는 슬레이트 배경색
                                'editorGutter.background': isDark ? '#090d16' : '#e2e8f0',
                                'editor.foreground': activeFg, // 🎯 사용자 명세: 다크 #e2e8f0 (고대비 모드 시 순수 흑백)
                                'editorLineNumber.foreground': isDark ? '#475569' : '#64748b', // 선명한 줄번호
                                'editorLineNumber.activeForeground': isDark ? '#60A5FA' : '#2563EB', // 활성 행 줄번호 강조
                                'editorCursor.foreground': isDark ? '#38bdf8' : '#1d4ed8', // 🎯 고대비 커서 시인성 강화 (다크: 네온 스카이블루 #38bdf8 / 라이트: 코발트 블루 #1d4ed8)
                                'editor.lineHighlightBackground': isDark ? '#1e293b50' : '#cbd5e155',
                                'editorIndentGuide.background': '#88888815',
                                'editorIndentGuide.activeBackground': '#88888830',
                              }
                            });
                          });
                        }}
                        onMount={handleMount}
                        options={{
                          readOnly: tabs.length === 0 || isRestrictedUser || previewMode === 'both',
                          domReadOnly: tabs.length === 0 || isRestrictedUser || previewMode === 'both',
                          padding: { top: 28, bottom: 28 },
                          scrollBeyondLastLine: false, // 마지막 줄 아래 과도한 여백 제거
                          glyphMargin: false, // 글리프 좌측 여백 제거
                          folding: false,
                          lineNumbersMinChars: 0,
                          lineDecorationsWidth: 8,
                          automaticLayout: true,
                          fontSize: fontSize || 16,
                          fontWeight: editorFontWeight === 'bold' ? '700' : editorFontWeight === 'semibold' ? '600' : editorFontWeight === 'medium' ? '500' : '400',
                          lineHeight: Math.round((fontSize || 16) * 1.75), // 글자 크기에 비례하는 동일 행간
                          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', 'Malgun Gothic', sans-serif",
                          fontLigatures: true, // 기호 연산자 리가처(->, != 등) 활성화
                          letterSpacing: 0,
                          // 🎯 커서 항상 가시성 보장 (단독/분할 모드 공통)
                          cursorBlinking: 'solid',
                          cursorSmoothCaretAnimation: 'off',
                          cursorStyle: 'line',
                          cursorWidth: 5,
                          'semanticHighlighting.enabled': true,
                          wordWrap: wordWrap || 'on',
                          wrappingStrategy: 'advanced',
                          wordWrapBreakAfterCharacters: ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々ㇻｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣',
                          wordWrapBreakBeforeCharacters: '([{\'"“‘«‹〈《「『【〔（［｛｢',
                          lineNumbers: 'off',
                          minimap: { enabled: false },
                          autoClosingBrackets: autoClosingBrackets ? 'languageDefined' : 'never',
                          scrollbar: { vertical: previewMode==='both'?'hidden':'visible', horizontal: previewMode==='both'?'hidden':'visible', handleMouseWheel:previewMode!=='both', verticalScrollbarSize: 16, horizontalScrollbarSize: 10 },
                          // 슬래시(/) 입력 시에만 자동완성 트리거 (일반 타이핑 시 팝업 방지)
                          quickSuggestions: false,
                          suggestOnTriggerCharacters: true,
                          // Enter/Tab 수락은 커스텀 핸들러에서 처리 (리스트 자동완성과 충돌 방지)
                          acceptSuggestionOnEnter: 'on',
                          tabCompletion: 'on',
                          fixedOverflowWidgets: true,
                          renderValidationDecorations: 'on',
                          matchBrackets: 'always',
                          wordBasedSuggestions: "off",
                          renderLineHighlight: 'all',
                          // 💡 마크다운 들여쓰기 규격 준수를 위해 4칸 강제 고정
                          tabSize: editorTabSize,
                          detectIndentation: false,
                          insertSpaces: true,
                          autoIndent: 'none',
                          links: false
                        }}
                      />

                      {floatingToolbar.visible && (() => {
                        const editorDom = editorRef.current?.getContainerDomNode();
                        let fixedTop = floatingToolbar.top;
                        let fixedLeft = floatingToolbar.left;
                        if (editorDom && !visualFloatingOriginRef.current) {
                          const rect = editorDom.getBoundingClientRect();
                          fixedTop += rect.top;
                          fixedLeft += rect.left;

                          // 💡 [플로팅 툴바 우측/상단 화면 이탈 방지 클램핑]
                          const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
                          const maxRight = winWidth - 68; // 우측 고정 사이드바 툴바(약 56px) 및 여백 고려
                          const toolbarWidth = floatingToolbarRef.current?.offsetWidth || 1200;
                          if (fixedLeft + toolbarWidth > maxRight) {
                            fixedLeft = maxRight - toolbarWidth;
                          }
                          fixedLeft = Math.max(16, fixedLeft);
                          fixedTop = Math.max(65, fixedTop);
                        }
                        if (visualFloatingOriginRef.current) {
                          const width = Math.min(floatingToolbarRef.current?.offsetWidth || 1200, window.innerWidth - 80);
                          fixedLeft = Math.max(16, Math.min(fixedLeft, window.innerWidth - 68 - width));
                          fixedTop = Math.max(65, fixedTop);
                        }

                        // 💡 플로팅 툴바가 화면 하단(상태바 부근)에 있을 때 드롭다운 상향(DropUp) 자동 반전 계산 (드롭다운 높이 ~240px)
                        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
                        const isDropUp = (winHeight - Math.max(fixedTop, 60)) < 260;

                        const handleDragStart = (dragEvent: React.MouseEvent) => {
                          const target = dragEvent.target as HTMLElement;
                          if (target.closest('button') || target.closest('input')) {
                            return;
                          }
                          dragEvent.preventDefault();
                          const startX = dragEvent.clientX;
                          const startY = dragEvent.clientY;
                          const startLeft = floatingToolbar.left;
                          const startTop = floatingToolbar.top;

                          const handleDragMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX;
                            const deltaY = moveEvent.clientY - startY;
                            setFloatingToolbar(prev => ({
                              ...prev,
                              left: startLeft + deltaX,
                              top: startTop + deltaY
                            }));
                          };

                          const handleDragEnd = () => {
                            document.removeEventListener('mousemove', handleDragMove);
                            document.removeEventListener('mouseup', handleDragEnd);
                          };

                          document.addEventListener('mousemove', handleDragMove);
                          document.addEventListener('mouseup', handleDragEnd);
                        };

                        return createPortal(
                          <div
                            ref={floatingToolbarRef}
                            id="floating-toolbar"
                            tabIndex={-1}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              const buttons = Array.from(e.currentTarget.querySelectorAll('button:not([disabled])')) as HTMLButtonElement[];
                              const activeEl = document.activeElement as HTMLButtonElement;
                              const currentIndex = buttons.indexOf(activeEl);
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                const nextIndex = currentIndex === -1
                                  ? (e.shiftKey ? buttons.length - 1 : 0)
                                  : (e.shiftKey ? (currentIndex - 1 + buttons.length) % buttons.length : (currentIndex + 1) % buttons.length);
                                buttons[nextIndex]?.focus();
                              } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
                                buttons[nextIndex]?.focus();
                              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                e.preventDefault();
                                const prevIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length;
                                buttons[prevIndex]?.focus();
                              } else if (e.key === 'Enter' || e.key === ' ') {
                                if (activeEl && buttons.includes(activeEl)) {
                                  e.preventDefault();
                                  activeEl.click();
                                }
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setFloatingToolbar(prev => ({ ...prev, visible: false }));
                                if (!visualFloatingOriginRef.current || !visualCommandRef.current?.('FOCUS')) editorRef.current?.focus();
                              }
                            }}
                            className="no-print fixed z-[99999] flex items-center bg-white dark:bg-zinc-800 shadow-2xl shadow-black/20 rounded-2xl border border-black/10 dark:border-white/10 px-3.5 py-1.5 gap-1.5 animate-in fade-in zoom-in-95 duration-100 focus:outline-none cursor-move select-none max-w-[calc(100vw-80px)] overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
                            style={{ top: Math.max(fixedTop, 60), left: fixedLeft, transform: 'translateY(-100%)' }}
                            onMouseDown={handleDragStart}
                          >
                            {(() => {
                              const model = editorRef.current?.getModel();
                              const pos = editorRef.current?.getPosition();
                              const curLine = (model && pos) ? model.getLineContent(pos.lineNumber) : '';
                              const isInTable = !visualFloatingOriginRef.current && curLine.trim().startsWith('|') && (curLine.match(/\|/g) || []).length >= 2;

                              return (
                                <div className="flex flex-row items-center gap-3.5 min-w-max">
                                  {/* 서식 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" data-floating-bold tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('BOLD'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-black cursor-pointer" title="굵게 (Enter)">B</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('ITALIC'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] italic font-serif cursor-pointer" title="기울임 (Enter)">I</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('INLINE_CODE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="인라인 코드 (Enter)">
                                      <img src="/icons/Password.png" alt="인라인 코드" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('UNDERLINE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] underline font-bold cursor-pointer" title="밑줄 (Enter)">U</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('STRIKETHROUGH'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold cursor-pointer" title="취소선 (Enter)"><span className="line-through">S</span></button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 제목 */}
                                  <div className="flex flex-row items-center gap-1">
                                    <div className="flex items-center border border-emerald-600/30 dark:border-emerald-500/40 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 py-0.5 px-1.5 gap-1.5 text-emerald-800 dark:text-emerald-300">
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const next = Math.max(1, floatingHeadingLevel - 1);
                                          setFloatingHeadingLevel(next);
                                          executeFloatingItem(() => dispatchCommand(`H${next}`));
                                        }}
                                        disabled={floatingHeadingLevel === 1}
                                        className="w-6 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                        title="제목 크기 키우기 및 즉시 적용 (Enter)"
                                      >▲</button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => executeFloatingItem(() => dispatchCommand(`H${floatingHeadingLevel}`))}
                                        className="w-8 h-7 flex items-center justify-center font-extrabold text-[13px] hover:bg-black/10 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded shrink-0 cursor-pointer"
                                        title={`제목 ${floatingHeadingLevel} 적용 (Enter)`}
                                      >H{floatingHeadingLevel}</button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const next = Math.min(6, floatingHeadingLevel + 1);
                                          setFloatingHeadingLevel(next);
                                          executeFloatingItem(() => dispatchCommand(`H${next}`));
                                        }}
                                        disabled={floatingHeadingLevel === 6}
                                        className="w-6 h-7 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-30 text-[10px] font-bold cursor-pointer"
                                        title="제목 크기 줄이기 및 즉시 적용 (Enter)"
                                      >▼</button>
                                    </div>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 문단 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('HR'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold cursor-pointer" title="구분선 (Enter)">—</button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('ORDERED_LIST'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="숫자 목록 (Enter)">
                                      <img src="/icons/ListNumbers.png" alt="숫자 목록" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LIST'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="글머리 기호 (Enter)">
                                      <img src="/icons/ListBullets.png" alt="글머리 기호" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <div id="floating-quote-dropdown-container" className="relative inline-flex items-center rounded-lg border border-zinc-400 dark:border-zinc-600 bg-white/70 dark:bg-zinc-800/70">
                                      <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => { dispatchCommand('QUOTE'); setFloatingQuoteDropdown(prev => ({ ...prev, open: false })); })} className="w-8 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-l-lg transition-all flex items-center justify-center cursor-pointer" title="인용구 (기본) (Enter)">
                                        <img src="/icons/WechatLogo.png" alt="인용구" className="w-5 h-5 object-contain dark:invert" />
                                      </button>
                                      <button
                                        type="button"
                                        tabIndex={0}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          executeFloatingItem(() => dispatchCommand('QUOTE'));
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const winH = window.innerHeight;
                                          const spaceBelow = winH - rect.bottom;
                                          const dropUp = spaceBelow < 210;
                                          setFloatingQuoteDropdown(prev => ({
                                            open: !prev.open,
                                            x: rect.left,
                                            y: dropUp ? rect.top : rect.bottom,
                                            dropUp,
                                          }));
                                        }}
                                        className="w-4 h-9 hover:bg-black/10 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-r-lg transition-all flex items-center justify-center text-[8px] text-zinc-700 dark:text-zinc-200 font-bold cursor-pointer"
                                        title="인용구 적용 및 Alert 태그 선택 (Enter)"
                                      >▼</button>
                                    </div>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CHECK'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="체크리스트 (Enter)">
                                      <img src="/icons/ListChecks.png" alt="체크리스트" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('REMOVE_PREFIX'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="태그 취소 (Enter)">
                                      <img src="/icons/Eraser.png" alt="태그 취소" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CLEAN_DOC'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="문서 서식 일괄 정리 (Enter)">
                                      <img src="/icons/MagicWand.png" alt="문서 서식 일괄 정리" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 삽입 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LINK'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="링크 (Enter)">
                                      <img src="/icons/Link.png" alt="링크" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('DOCLINK'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="문서 연결 (Enter)">
                                      <img src="/icons/BookBookmark.png" alt="문서 연결" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CITE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="인용(참조문헌) (Enter)">
                                      <Icon name="NewspaperClipping" size={20} className="text-zinc-800 dark:text-zinc-100" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('FOOTNOTE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[14px] font-black font-serif cursor-pointer" title="각주 (Enter)">fn</button>
                                    <div className="w-px h-5 mx-0.5 bg-black/15 dark:bg-white/15 shrink-0" />
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('IMAGE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="이미지 (Enter)">
                                      <img src="/icons/Farm.png" alt="이미지" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('YOUTUBE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="동영상삽입 (Enter)">
                                      <img src="/icons/FilmReel.png" alt="동영상삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={0}
                                      id="datetime-format-trigger"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        executeFloatingItem(() => dispatchCommand('NOW'));
                                      }}
                                      onClick={() => executeFloatingItem(() => dispatchCommand('NOW'))}
                                      className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer"
                                      title="달력 및 날짜/시간 삽입 (Enter)"
                                    >
                                      <img src="/icons/Calendar.png" alt="달력 및 날짜/시간 삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={0}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        executeFloatingItem(() => dispatchCommand('SIGNATURE'));
                                      }}
                                      onClick={() => executeFloatingItem(() => dispatchCommand('SIGNATURE'))}
                                      className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-zinc-800 dark:text-zinc-100 cursor-pointer"
                                      title="서명/발신인 (왼쪽 정렬) (Ctrl+Alt+R) (Enter)"
                                    >
                                      <Icon name="Signature" size={19} className="text-zinc-800 dark:text-zinc-100" />
                                    </button>
                                  </div>
                                  <div className="w-px h-7 bg-black/15 dark:bg-white/15" />
                                  {/* 고급 및 표 열 정렬 */}
                                  <div className="flex flex-row items-center gap-1 text-zinc-800 dark:text-zinc-100">
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('MAP'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="지도 삽입 (Enter)">
                                      <img src="/icons/MapTrifold.png" alt="지도 삽입" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('TABLE'), true)} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center cursor-pointer" title="표 생성 (Enter)">
                                      <img src="/icons/Table.png" alt="표 생성" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    {isInTable && (
                                      <>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('left');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('left');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 왼쪽 정렬 (Alt+Shift+L) (Enter)"
                                        >
                                          ⇤
                                        </button>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('center');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('center');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 가운데 정렬 (Alt+Shift+C) (Enter)"
                                        >
                                          ↔
                                        </button>
                                        <button
                                          type="button"
                                          tabIndex={0}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('right');
                                              }
                                            });
                                          }}
                                          onClick={() => {
                                            executeFloatingItem(() => {
                                              if (typeof window !== 'undefined' && (window as any).setTableColumnAlign) {
                                                (window as any).setTableColumnAlign('right');
                                              }
                                            });
                                          }}
                                          className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center text-[15px] font-bold text-blue-600 dark:text-blue-400"
                                          title="현재 열 오른쪽 정렬 (Alt+Shift+R) (Enter)"
                                        >
                                          ⇥
                                        </button>
                                      </>
                                    )}
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('CODE'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center" title="코드 블록 (Enter)">
                                      <img src="/icons/FileCode.png" alt="코드 블록" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                    <button type="button" tabIndex={0} onMouseDown={(e) => e.preventDefault()} onClick={() => executeFloatingItem(() => dispatchCommand('LATEX'))} className="w-9 h-9 hover:bg-black/5 dark:hover:bg-white/5 focus:bg-blue-500/15 dark:focus:bg-blue-500/25 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all flex items-center justify-center" title="수식(LaTeX) (Enter)">
                                      <img src="/icons/PlusMinus.png" alt="수식(LaTeX)" className="w-5 h-5 object-contain dark:invert" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        , document.body)
                      })()}
                    </div>

                    {showDocLinkPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onMouseDown={closeDocLinkPicker}
                        />
                        <div
                          className="fixed z-[9999] bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-xl shadow-2xl p-2.5 w-[420px] max-w-[95vw] max-h-[440px] flex flex-col"
                          style={docLinkPickerStyle}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              closeDocLinkPicker();
                            }
                          }}
                        >
                          {!selectedDocNode ? (
                            <>
                              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700 mb-2 flex items-center justify-between">
                                <span className="font-bold">다른 문서 연결 (Doc Link)</span>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    closeDocLinkPicker();
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold px-1 rounded cursor-pointer"
                                  title="닫기 (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="px-2 mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                                    링크명 (앞의 표시할 텍스트)
                                  </label>
                                  {docLinkCustomTitle && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[200px]">
                                      [{docLinkCustomTitle}]
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder="비워두면 확장자를 뺀 문서명이 표시됩니다"
                                  value={docLinkCustomTitle}
                                  onChange={(e) => {
                                    setDocLinkCustomTitle(e.target.value);
                                    setIsDocLinkTitleManuallyEdited(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-slate-300 dark:border-zinc-600 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="px-2 mb-2">
                                <input
                                  type="text"
                                  placeholder="파일 검색..."
                                  value={docLinkSearchText}
                                  onChange={(e) => setDocLinkSearchText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12.5px] border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                {isDocLinkLoading ? (
                                  <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                    문서 목록 로딩 중...
                                  </div>
                                ) : (() => {
                                  const registeredDocs = (() => {
                                    try {
                                      return JSON.parse(localStorage.getItem('onrivi_registered_knowledge_docs') || '[]');
                                    } catch { return []; }
                                  })();

                                  const query = (docLinkSearchText || '').normalize('NFC').trim().toLowerCase();

                                  const filtered = allMdFiles.filter(f => {
                                    if (!query) return true;
                                    const nameNorm = (f.name || '').normalize('NFC').toLowerCase();
                                    const pathNorm = (f.path || '').normalize('NFC').toLowerCase();
                                    const titleNorm = ((f as any).title || '').normalize('NFC').toLowerCase();
                                    return nameNorm.includes(query) || pathNorm.includes(query) || titleNorm.includes(query);
                                  }).sort((a, b) => {
                                    const aKnow = (a as any).isKnowledge || registeredDocs.includes(a.path) || registeredDocs.includes(a.name);
                                    const bKnow = (b as any).isKnowledge || registeredDocs.includes(b.path) || registeredDocs.includes(b.name);
                                    if (aKnow && !bKnow) return -1;
                                    if (!aKnow && bKnow) return 1;
                                    return (a.name || '').localeCompare(b.name || '');
                                  });

                                  const deduplicated = (() => {
                                    const map = new Map<string, FileNode>();
                                    const currentNorm = (currentFileNode?.path || '').replace(/\\/g, '/').toLowerCase();
                                    const isCurrentInHelp = currentNorm.includes('docs/help/') || currentNorm.includes('/help/') || currentNorm.startsWith('help/');
                                    const excludedDirs = ['out', '.next', '.next-web-build', 'dist', 'build', 'release', 'node_modules', '_dev_api_backup', '.vscode', '.idea', 'scratch'];

                                    for (const f of filtered) {
                                      const currPath = (f.path || '').replace(/\\/g, '/').toLowerCase();
                                      const segments = currPath.split('/');
                                      if (segments.some(seg => excludedDirs.includes(seg))) {
                                        continue;
                                      }

                                      const isHelpFile = currPath.startsWith('docs/help/') || currPath.includes('/docs/help/') ||
                                                         currPath.startsWith('frontend/public/help/') || currPath.includes('/frontend/public/help/') ||
                                                         currPath.startsWith('public/help/') || currPath.includes('/public/help/') ||
                                                         /^(?:00_시작하기|help-\d+)/i.test(f.name || '');

                                      // 1) 일반 문서 작성 시 내부 도움말 파일 일체 노출 차단
                                      if (!isCurrentInHelp && isHelpFile) {
                                        continue;
                                      }

                                      // 2) 도움말 작성/연결 시 정적 웹 미러(public/help) 제외하고 정식 docs/help만 1개 유지
                                      if (isCurrentInHelp && (currPath.includes('/public/help/') || currPath.startsWith('public/help/'))) {
                                        continue;
                                      }

                                      const key = currPath.normalize('NFC');
                                      if (!map.has(key)) {
                                        map.set(key, f);
                                      } else {
                                        const prev = map.get(key)!;
                                        const prevPath = (prev.path || '').replace(/\\/g, '/').toLowerCase();
                                        const prevHasFullPath = prevPath.includes('/') && prevPath !== key;
                                        const currHasFullPath = currPath.includes('/') && currPath !== key;
                                        if (!prevHasFullPath && currHasFullPath) {
                                          map.set(key, f);
                                        }
                                      }
                                    }
                                    return Array.from(map.values());
                                  })();

                                  if (deduplicated.length === 0) {
                                    return (
                                      <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                        검색 결과가 없습니다.
                                      </div>
                                    );
                                  }
                                  return deduplicated.map((node) => {
                                    const isKnowledge = (node as any).isKnowledge || registeredDocs.includes(node.path) || registeredDocs.includes(node.name);
                                    const displayTitle = (node as any).title && (node as any).title !== node.name
                                      ? `${(node as any).title} (${node.name})`
                                      : node.name;
                                    const rowTarget = buildDocLinkTarget(node);
                                    const rowLabel = docLinkCustomTitle.trim() || getDocLinkDefaultLabel(node);
                                    return (
                                      <div
                                        key={node.path || node.name}
                                        role="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleDocFileClick(node);
                                        }}
                                        title={`${node.path || node.name}\n클릭: 헤딩 선택 · [연결]: 문서로 바로 연결`}
                                        className={`w-full text-left px-2.5 py-2 text-[12.5px] rounded-lg flex flex-col transition-colors mb-1 cursor-pointer ${
                                          isKnowledge
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30'
                                            : 'hover:bg-slate-100 dark:hover:bg-zinc-700'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="font-semibold text-slate-800 dark:text-zinc-100 break-all whitespace-normal leading-snug">
                                            {displayTitle}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {isKnowledge && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1d4ed8] text-white font-bold">
                                                📗 지식 문서
                                              </span>
                                            )}
                                            <button
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDocLinkSelect(node, undefined, docLinkCustomTitle);
                                              }}
                                              className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold cursor-pointer"
                                              title={`[${rowLabel}](<${rowTarget}>) 삽입`}
                                            >
                                              연결
                                            </button>
                                          </div>
                                        </div>
                                        <span className="text-[10.5px] text-slate-700 dark:text-zinc-300 font-bold font-mono break-all whitespace-normal leading-tight mt-0.5">{node.path}</span>
                                        <span className="text-[10.5px] text-blue-700 dark:text-blue-300 font-mono break-all whitespace-normal leading-tight mt-0.5">
                                          [{rowLabel}](&lt;{rowTarget}&gt;)
                                        </span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-700 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedDocNode(null);
                                      setDocHeadings([]);
                                      setDocHeadingSearchText('');
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold cursor-pointer"
                                  >
                                    ← 이전으로
                                  </button>
                                  <span className="font-bold">헤딩(제목) 연결 선택</span>
                                </div>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    closeDocLinkPicker();
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-sm font-bold px-1 rounded cursor-pointer"
                                  title="닫기 (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="px-2 mb-2 bg-blue-50/50 dark:bg-zinc-900/60 p-2 rounded-lg border border-blue-200/60 dark:border-zinc-700">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                                    링크명 (앞의 표시할 텍스트 수정)
                                  </label>
                                  {docLinkCustomTitle && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[180px]">
                                      [{docLinkCustomTitle}]
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="비워두면 확장자를 뺀 문서명이 표시됩니다"
                                    value={docLinkCustomTitle}
                                    onChange={(e) => {
                                      setDocLinkCustomTitle(e.target.value);
                                      setIsDocLinkTitleManuallyEdited(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        closeDocLinkPicker();
                                      } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                      }
                                    }}
                                    className="flex-1 px-2.5 py-1 text-[12px] border border-slate-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                                  />
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                    }}
                                    className="px-2.5 py-1 text-[11.5px] font-bold bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-md shrink-0 cursor-pointer shadow-xs"
                                    title="문서 자체를 현재 링크명으로 바로 삽입"
                                  >
                                    문서 연결
                                  </button>
                                </div>
                                <div className="mt-1.5 text-[10.5px] font-mono text-blue-700 dark:text-blue-300 break-all leading-tight">
                                  {(() => {
                                    const t = buildDocLinkTarget(selectedDocNode);
                                    return `[${docLinkCustomTitle.trim() || getDocLinkDefaultLabel(selectedDocNode)}](<${t}>)`;
                                  })()}
                                </div>
                              </div>
                              <div className="px-2 mb-2">
                                <input
                                  type="text"
                                  placeholder="헤딩 검색..."
                                  value={docHeadingSearchText}
                                  onChange={(e) => setDocHeadingSearchText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      closeDocLinkPicker();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 text-[12.5px] border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                                {isHeadingLoading ? (
                                  <div className="px-2 py-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                                    헤딩 분석 중...
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleDocLinkSelect(selectedDocNode, undefined, docLinkCustomTitle);
                                      }}
                                      className="w-full text-left px-2.5 py-2 text-[12.5px] text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors mb-1 font-semibold cursor-pointer"
                                    >
                                      📂 [문서 자체를 바로 연결]
                                    </button>
                                    {(() => {
                                      const hQuery = (docHeadingSearchText || '').normalize('NFC').trim().toLowerCase();
                                      const filteredHeadings = docHeadings.filter(h =>
                                        !hQuery || h.normalize('NFC').toLowerCase().includes(hQuery)
                                      );
                                      if (filteredHeadings.length === 0) {
                                        return (
                                          <div className="px-2 py-2 text-[11px] text-slate-400 dark:text-zinc-500 text-center">
                                            문서 내에 감지된 헤딩이 없거나 검색 결과가 없습니다.
                                          </div>
                                        );
                                      }
                                      return filteredHeadings.map((h, i) => (
                                        <button
                                          key={i}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleDocLinkSelect(selectedDocNode, h, docLinkCustomTitle);
                                          }}
                                          title={h}
                                          className="w-full text-left px-2.5 py-2 text-[12.5px] hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-slate-700 dark:text-zinc-200 flex items-start gap-1.5 cursor-pointer"
                                        >
                                          <span className="text-blue-500 font-bold shrink-0">#</span>
                                          <span className="break-all whitespace-normal leading-snug">{h}</span>
                                        </button>
                                      ));
                                    })()}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div
                      className="flex-1 flex flex-col bg-surface-container-low text-on-surface overflow-hidden print:overflow-visible relative"
                      style={{
                        order: 0,
                        width: previewMode === 'preview' ? '100%' : '50%',
                        flexBasis: previewMode === 'preview' ? '100%' : '50%',
                        display: (previewMode === 'edit' || activeTab?.isStyleTab === true) ? 'none' : 'flex'
                      }}
                    >


                      {/* 🛠️ 미리보기 전용 컨트롤 툴바 (찾기, 바꾸기, 축소, 100% 리셋, 확대, 클립보드 복사) */}
                      <PreviewToolbar
                        zoomScale={previewZoomScale}
                        onZoomIn={() => setPreviewZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10))}
                        onZoomOut={() => setPreviewZoomScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        onZoomReset={() => setPreviewZoomScale(1.0)}
                        onToggleFind={() => {
                          if (isPreviewFindOpen && !previewFindReplaceMode) {
                            setIsPreviewFindOpen(false);
                          } else {
                            setPreviewFindReplaceMode(false);
                            setIsPreviewFindOpen(true);
                          }
                        }}
                        isFindOpen={isPreviewFindOpen && !previewFindReplaceMode}
                        onToggleReplace={() => {
                          if (isPreviewFindOpen && previewFindReplaceMode) {
                            setIsPreviewFindOpen(false);
                          } else {
                            setPreviewFindReplaceMode(true);
                            setDirectEditEnabled(true);
                            setIsPreviewFindOpen(true);
                          }
                        }}
                        isReplaceOpen={isPreviewFindOpen && previewFindReplaceMode}
                        onCopyPreview={handleCopyPreviewContent}
                        onCopyMarkdown={handlers.copyAll}
                      />

                      {/* 🔍 미리보기 텍스트 검색 및 탐색 위젯 */}
                      <PreviewFindWidget
                        previewContainerRef={previewRef}
                        isOpen={isPreviewFindOpen}
                        replaceMode={previewFindReplaceMode}
                        replaceEnabled={!isRestrictedUser && !!activeTabId && currentFileName !== '도움말.md'}
                        documentKey={activeTabId}
                        onClose={() => setIsPreviewFindOpen(false)}
                      />

                      {/* 🔍 스크롤 가능한 실제 본문 컨테이너 */}
                      <div
                        ref={bindPreviewScrollContainer}
                        className={`flex-1 print:h-auto print:overflow-visible prose prose-sm md:prose-base max-w-none break-words custom-preview-container onrivi-preview-container text-on-surface ${
                          previewMode === 'preview'
                            ? 'bg-surface-container-high p-4 pb-48 overflow-y-auto'
                            : 'bg-surface-container-low px-2 sm:px-4 pt-1 pb-48 overflow-y-auto overflow-x-hidden'
                        }`}
                        style={{scrollbarWidth:'auto',scrollbarGutter:'stable',overflowY:'scroll'}}
                        onMouseEnter={() => { isPreviewHovered.current = true; }}
                        onMouseLeave={() => { isPreviewHovered.current = false; }}
                        onDragOver={(e) => {
                          if (e.dataTransfer?.types?.some(t => t === 'Files' || t === 'text/html' || t === 'text/uri-list' || t === 'text/plain')) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const dt = e.dataTransfer;
                          if (!dt) return;

                          // 1) parseDroppedDataToBlob 정규화 엔진 우선 실행 (OS 파일, DataTransfer items, Base64 Data URL, Web SVG, 구글/웹 이미지 등)
                          const parsed = parseDroppedDataToBlob(dt);
                          if (parsed) {
                            if (parsed.file) {
                              await handlePasteImageFile(parsed.file, (savedPath) => {
                                if (visualCommandRef.current) {
                                  visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                } else {
                                  insertImageMarkdown(savedPath);
                                }
                              });
                              return;
                            } else if (parsed.webUrl) {
                              let fetchedFile: File | null = null;
                              try {
                                fetchedFile = await fetchExternalImageFile(parsed.webUrl, parsed.name);
                              } catch (_) {}

                              if (fetchedFile) {
                                await handlePasteImageFile(fetchedFile, (savedPath) => {
                                  if (visualCommandRef.current) {
                                    visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                  } else {
                                    insertImageMarkdown(savedPath);
                                  }
                                });
                                return;
                              }

                              // 다운로드 실패 시(CORS 제약 등)에도 웹 이미지 링크 직접 안전 삽입
                              if (visualCommandRef.current) {
                                visualCommandRef.current(`INSERT_SAVED_IMAGE:${parsed.webUrl}`);
                              } else {
                                insertAtCursor(`\n![](${parsed.webUrl})\n`);
                                if (editorRef.current) {
                                  updateContent(editorRef.current.getValue(), true);
                                  editorRef.current.focus();
                                }
                              }
                              return;
                            }
                          }

                          // 2) OS 다중 파일 드롭 처리
                          const files = dt.files ? Array.from(dt.files) : [];
                          const imageFiles = files.filter(isImageLikeFile);
                          if (imageFiles.length > 0) {
                            for (const imgFile of imageFiles) {
                              await handlePasteImageFile(imgFile, (savedPath) => {
                                if (visualCommandRef.current) {
                                  visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                } else {
                                  insertImageMarkdown(savedPath);
                                }
                              });
                            }
                            return;
                          }

                          // 3) 외부 웹 이미지 URL (다운로드 및 리소스 폴더 저장)
                          const html = dt.getData('text/html');
                          const uriList = dt.getData('text/uri-list');
                          const plainText = dt.getData('text/plain');
                          let imgSrc = '';
                          if (html) {
                            const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                            if (match && match[1]) imgSrc = match[1];
                          }
                          if (!imgSrc && uriList) {
                            const firstUri = uriList.split(/[\r\n]+/).map(s => s.trim()).find(s => s && !s.startsWith('#'));
                            if (firstUri) imgSrc = firstUri;
                          }
                          if (!imgSrc && plainText) {
                            const trimmed = plainText.trim();
                            if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(trimmed)) {
                              imgSrc = trimmed;
                            }
                          }
                          if (imgSrc && !imgSrc.startsWith('data:image/')) {
                            if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                              try {
                                const resp = await fetch(imgSrc);
                                if (resp.ok) {
                                  const blob = await resp.blob();
                                  await handlePasteImageFile(blob, (savedPath) => {
                                    if (visualCommandRef.current) {
                                      visualCommandRef.current(`INSERT_SAVED_IMAGE:${savedPath}`);
                                    } else {
                                      insertImageMarkdown(savedPath);
                                    }
                                  });
                                  return;
                                }
                              } catch (_) {}
                            }
                            if (visualCommandRef.current) {
                              visualCommandRef.current(`INSERT_SAVED_IMAGE:${imgSrc}`);
                            } else {
                              const markdownImg = `\n![](${imgSrc})\n`;
                              insertAtCursor(markdownImg);
                              if (editorRef.current) {
                                updateContent(editorRef.current.getValue(), true);
                                editorRef.current.focus();
                              }
                            }
                          }
                        }}
                        onScroll={(e) => {
                          if (previewModeRef.current === 'both' && e.currentTarget.querySelector('.book-page[data-line]')) {
                            if (!isPreviewHovered.current || isScrollingRef.current === 'editor') return;
                            const target=e.currentTarget,editor=editorRef.current;
                            if(!editor)return;
                            isScrollingRef.current='preview';
                            if(scrollTimeoutRef.current)clearTimeout(scrollTimeoutRef.current);
                            scrollTimeoutRef.current=setTimeout(()=>{isScrollingRef.current=null;},100);
                            const ratio=target.scrollTop/Math.max(1,target.scrollHeight-target.clientHeight);
                            editor.setScrollTop(ratio*Math.max(0,editor.getScrollHeight()-editor.getLayoutInfo().height));
                            return;
                          }
                          const target = e.target as HTMLElement;

                          // 💡 [요구사항 3 / SYNC-03] 미리보기 최상단(0점) 복귀 시 스크롤 락에 관계없이 에디터를 자석처럼 최상단 영점으로 복구
                          // 🛡️ [버그 예방 가드] 오직 사용자가 직접 미리보기를 마우스 호버하여 스크롤 중이거나, 에디터에 의한 연동 스크롤이 아닐 때만 동작
                          if (target.scrollTop === 0 && editorRef.current && isPreviewHovered.current && isScrollingRef.current !== 'editor') {
                            editorRef.current.setScrollTop(0);
                          }

                          // 💡 [요구사항 3 / SYNC-03] 미리보기 마우스 오버 상태일 때만 에디터로 스크롤 송신 허용 (관성 튕김 루프 원천 방쇄)
                          if (!isPreviewHovered.current || previewModeRef.current !== 'both' || !editorRef.current) return;
                            if (isScrollingRef.current === 'editor') return;

                          isScrollingRef.current = 'preview';
                          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                          scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 50);

                          const previewScrollTop = target.scrollTop;
                            const previewScrollHeight = target.scrollHeight;
                            const previewViewportHeight = target.clientHeight;
                            const previewMaxScroll = previewScrollHeight - previewViewportHeight;
                            
                            if (previewMaxScroll <= 0) return;
                            
                            const isAtBottom = previewScrollTop >= previewMaxScroll - 2;
                            const scrollRatio = isAtBottom ? 1 : Math.max(0, Math.min(1, previewScrollTop / previewMaxScroll));
                            const targetPreviewY = previewScrollTop + previewViewportHeight * scrollRatio;
                            
                            const elements = Array.from(target.querySelectorAll('[data-line]')) as HTMLElement[];
                            if (elements.length === 0) return;
                            
                            let elA: HTMLElement | null = null;
                            let elB: HTMLElement | null = null;
                            const containerRect = target.getBoundingClientRect();
                            
                            for (let i = 0; i < elements.length; i++) {
                              const rect = elements[i].getBoundingClientRect();
                              const elementTop = rect.top - containerRect.top + previewScrollTop;
                              if (elementTop > targetPreviewY) {
                                break;
                              }
                              elA = elements[i];
                            }
                            
                            if (elA && editorRef.current) {
                              const editor = editorRef.current;
                              const lineAStr = elA.getAttribute('data-line');
                              
                              if (lineAStr && typeof editor.getTopForLineNumber === 'function' && typeof editor.setScrollPosition === 'function') {
                                const lineA = parseInt(lineAStr, 10);
                                const indexA = elements.indexOf(elA);
                                for (let j = indexA + 1; j < elements.length; j++) {
                                  const nextEl = elements[j];
                                  const lineBStr = nextEl.getAttribute('data-line');
                                  if (lineBStr && parseInt(lineBStr, 10) > lineA) {
                                    elB = nextEl;
                                    break;
                                  }
                                }
                                
                                const viewportHeight = editor.getLayoutInfo().height || 800;
                                const scrollHeight = editor.getScrollHeight();
                                const editorMaxScroll = scrollHeight - viewportHeight;
                                
                                const topA = lineA === 1 ? 0 : editor.getTopForLineNumber(lineA);
                                const topB = elB ? editor.getTopForLineNumber(parseInt(elB.getAttribute('data-line')!, 10)) : scrollHeight;
                                
                                const previewTopA = elA.getBoundingClientRect().top - containerRect.top + previewScrollTop;
                                const previewTopB = elB ? (elB.getBoundingClientRect().top - containerRect.top + previewScrollTop) : previewScrollHeight;
                                
                                const previewRange = previewTopB - previewTopA;
                                const editorRange = topB - topA;
                                
                                let interpolatedEditorTop = topA;
                                if (previewRange > 0) {
                                  const progress = Math.max(0, Math.min(1, (targetPreviewY - previewTopA) / previewRange));
                                  interpolatedEditorTop = topA + progress * editorRange;
                                }
                                
                                let targetEditorScroll = interpolatedEditorTop - viewportHeight * scrollRatio;
                                targetEditorScroll = Math.max(0, Math.min(editorMaxScroll, targetEditorScroll));
                                
                                if (isAtBottom) {
                                  targetEditorScroll = editorMaxScroll;
                                }
                                
                                editor.setScrollPosition({ scrollTop: targetEditorScroll });
                                }
                              }
                        }}
                      >
                        {(() => {
                          const activeProfile = resolveEffectiveDocumentProfile(previewContent);
                          const isLandscape = activeProfile.pageStyle.orientation === 'landscape';
                          // A4 조판 가드가 켜져 있으면 편집+미리보기 모드라도 렌더링 규격은 미리보기 모드와 동일하게 취급
                          const isPreviewOnly = previewMode === 'preview' || isA4GuardEnabled;

                          const paperSizeKey = activeProfile.pageStyle.paperSize?.toLowerCase() || 'a4';
                          const ps = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.a4;
                          const paperWidth = isLandscape ? `${ps.height}mm` : `${ps.width}mm`;
                          const minHeight = isLandscape ? `${ps.width}mm` : `${ps.height}mm`;

                          const pTop = activeProfile.pageStyle.marginTop || '18mm';
                          const pBottom = activeProfile.pageStyle.marginBottom || '18mm';
                          const pLeft = activeProfile.pageStyle.marginLeft || '12mm';
                          const pRight = activeProfile.pageStyle.marginRight || '12mm';

                          const pageStyle: React.CSSProperties = {
                            boxSizing: 'border-box' as const,
                            maxWidth: '100%',
                            zoom: previewZoomScale,
                            ...(isPreviewOnly ? {
                              width: paperWidth,
                              minHeight: minHeight,
                              // zoom: previewZoomScale
                            } : {})
                          };

                          return (
                            <div
                              className={isPreviewOnly
                                ? "preview-page-sheet group relative mx-auto my-4 border border-purple-500/5 shadow-[0_16px_48px_rgba(15,0,109,0.04)] bg-white dark:bg-zinc-900 rounded-2xl origin-top overflow-hidden pb-12 max-w-full"
                                : `preview-page-sheet group relative mx-auto my-3 ${isLandscape ? 'max-w-6xl' : 'max-w-3xl'} w-full max-w-full bg-white dark:bg-zinc-900 border border-purple-500/5 shadow-[0_12px_42px_rgba(15,0,109,0.03)] rounded-2xl origin-top overflow-hidden pb-12`
                              }
                              style={pageStyle}
                            >
                              {/* 미리보기 복사 버튼 */}
                                <div className="hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!previewRef.current) return;
                                      
                                      const btn = e.currentTarget;
                                      const originalText = btn.innerHTML;
                                      
                                      try {
                                        const selection = window.getSelection();
                                        const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                                        
                                        const range = document.createRange();
                                        const targetEl = previewRef.current.querySelector('.markdown-viewer-root') || previewRef.current;
                                        
                                        // 이미지 blob URL을 base64로 임시 변환 (Electron fetch 차단 대비 캔버스 사용)
                                        const imgs = Array.from(targetEl.querySelectorAll('img'));
                                        const restoredImgs = [];
                                        for (const img of imgs) {
                                          const src = img.src;
                                          if (src && src.startsWith('blob:')) {
                                            try {
                                              if (img.complete && img.naturalWidth > 0) {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = img.naturalWidth;
                                                canvas.height = img.naturalHeight;
                                                const ctx = canvas.getContext('2d');
                                                if (ctx) {
                                                  ctx.drawImage(img, 0, 0);
                                                  img.dataset.originalSrc = src;
                                                  img.src = canvas.toDataURL('image/png');
                                                  restoredImgs.push(img);
                                                }
                                              }
                                            } catch (e) { console.error(e); }
                                          }
                                        }

                                        // 복사 버튼 훅 숨기기
                                          const hooks = Array.from(targetEl.querySelectorAll('.copy-button-hook'));
                                          const hookDisplays = hooks.map(h => h.style.display);
                                          hooks.forEach(h => h.style.display = 'none');
                                          
                                          range.selectNodeContents(targetEl);
                                          selection.removeAllRanges();
                                          selection.addRange(range);
                                          
                                          document.execCommand('copy');
                                          
                                          selection.removeAllRanges();
                                          if (originalRange) selection.addRange(originalRange);
                                          
                                          // 복사 버튼 훅 원상 복구
                                          hooks.forEach((h, i) => h.style.display = hookDisplays[i]);
                                        
                                        // 이미지 URL 원상 복구
                                        for (const img of restoredImgs) {
                                          if (img.dataset.originalSrc) {
                                            img.src = img.dataset.originalSrc;
                                            delete img.dataset.originalSrc;
                                          }
                                        }
                                        
                                        btn.innerHTML = '서식 복사 완료!';
                                        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                                      } catch (err) {
                                        console.error("서식 복사 실패:", err);
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 backdrop-blur-sm active:scale-95 transition-all"
                                    title="미리보기 결과 복사 (서식 포함)"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    복사
                                  </button>
                                </div>
                                {directEditEnabled && !isRestrictedUser && activeTabId && currentFileName !== '도움말.md' && !activeProfile.layout ? (
                                   <VisualDocumentEditor key={activeTabId} documentId={activeTabId} headingNumbering={activeProfile.headingNumbering} bibContent={bibContent} onCitation={()=>setIsCitationModalOpen(true)} onReferenceSettings={() => setIsReferenceModalOpen(true)} pageStyle={resolveEffectiveDocumentProfile(content).pageStyle} onPdfPagePreview={signal=>handlersRef.current.print(true,undefined,signal)} spellCheck={spellCheck} tabSize={editorTabSize} onToast={showToast} onStyleSettings={() => setIsStyleModalOpen(true)}
                                     onSourceScroll={offset => {
                                       const editor = editorRef.current;
                                       if (previewModeRef.current !== 'both' || !editor?.getModel() || isScrollingRef.current === 'editor') return;
                                       isScrollingRef.current = 'preview';
                                       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                       scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 150);
                                       const position = editor.getModel().getPositionAt(offset);
                                       const targetTop = Math.max(0, editor.getTopForLineNumber(position.lineNumber) - 30);
                                       editor.setScrollTop(targetTop);
                                     }}
                                     onSourceCursor={(offset, reveal = false) => {
                                       const editor = editorRef.current;
                                       if (typeof offset !== 'number' || offset < 0) return;
                                       const model = editor?.getModel();
                                       let line = 1;
                                       let column = 1;
                                       let pos: { lineNumber: number; column: number } | null = null;
                                       if (model && !model.isDisposed()) {
                                         pos = model.getPositionAt(offset);
                                         line = pos.lineNumber;
                                         column = pos.column;
                                       } else {
                                         const currentText = contentRef.current || content || '';
                                         const textBefore = currentText.slice(0, Math.min(offset, currentText.length));
                                         const lines = textBefore.split('\n');
                                         line = lines.length;
                                         column = lines[lines.length - 1].length + 1;
                                         pos = { lineNumber: line, column };
                                       }
                                       setCursorLine(line);
                                       setCursorColumn(column);
                                       window.dispatchEvent(new CustomEvent('onrivi:cursor-position', { detail: { line, column } }));

                                       if (previewModeRef.current !== 'both' || !editor || !model || model.isDisposed()) return;
                                       const position = editor.getModel().getPositionAt(offset);
                                       isScrollingRef.current = 'preview';
                                       if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                                       scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = null; }, 150);
                                       editor.setPosition(position);
                                       if (reveal) {
                                         editor.revealPositionInCenter(position);
                                       }
                                     }}
                                     commandRef={visualCommandRef} aiTargetRef={visualAITargetRef} customCommands={customSlashCommands} customHotkeys={customHotkeys}
                                    onDocLinkDialog={(pos, insert, initialSelectedText) => {
                                      visualDocLinkPositionRef.current = pos;
                                      visualDocLinkInsertRef.current = insert;
                                      if (initialSelectedText) {
                                        setDocLinkCustomTitle(initialSelectedText);
                                        setIsDocLinkTitleManuallyEdited(true);
                                      }
                                      setShowDocLinkPicker(true);
                                    }}
                                    onFormulaDialog={(apply, initialLatex) => {
                                      visualFormulaInsertRef.current = apply;
                                      setFormulaModalInitialLatex(initialLatex || '');
                                      setIsFormulaModalOpen(true);
                                    }}
                                    currentFilePath={currentFileNode?.path}
                                    onFileOpen={(path, hash) => {
                                      if (path.startsWith('knowledge://')) {
                                        void handleFileOpenByPath(path, hash);
                                        return;
                                      }
                                      const guard = isPathInsideWorkspace(path, currentFileNode?.path, rootFolder?.path || rootFolder?.name, rootFolder?.name);
                                      if (!guard.isInside) {
                                        showToast(`⚠️ ${guard.reason || '작업장 외부 문서는 연결할 수 없습니다.'}`, 'warning');
                                        return;
                                      }
                                      void handleFileOpenByPath(guard.resolvedPath || path, hash, true);
                                    }}
                                    onImageFile={async file => {
                                      let savedPath: string | null = null;
                                      await handlePasteImageFile(file, path => { savedPath = path; });
                                      return savedPath;
                                    }}
                                    onMediaDialog={(kind,source,insert) => {
                                      visualMediaInsertRef.current = {kind,documentId:activeTabIdRef.current,insert};
                                      setMediaDialogSource({kind,source:source || ''});
                                      if (kind === 'map') setIsMapModalOpen(true); else {setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
                                    }}
                                    onImageDialog={(source, insert) => {
                                      const details = source ? visualImageDetails(source) : {path:'',alt:''};
                                      const path = details.path;
                                      const params = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '');
                                      const captionPos = params.get('caption');
                                      visualImageInsertRef.current = insert;
                                      setEditingImageInfo({
                                        path,
                                        alt: details.alt,
                                        width: params.get('width') || '',
                                        height: params.get('height') || '',
                                        align: params.get('align') || 'center',
                                        captionPos: (captionPos === 'top' || captionPos === 'bottom') ? captionPos : undefined,
                                        range: { visualImage: true, documentId: activeTabIdRef.current }
                                      });
                                      setIsImageModalOpen(true);
                                    }}
                                    renderImage={source => <MarkdownViewer mediaControlsManaged picturebookProfile={activeProfile} content={source} currentFilePath={currentFileNode?.path} rootFolderPath={rootFolder?.name}
                                      rootFolder={rootFolder} resourceFolderHandle={resourceFolderHandle} resourceFolder={resourceFolder} workspaceType={workspaceType} />}
                                    floatingToolbarVisible={floatingToolbar.visible}
                                    onFloatingToolbar={(visible, position) => {
                                      visualFloatingOriginRef.current = visible;
                                      const top = position.top + 48;
                                      setFloatingToolbar(prev => prev.visible === visible && (!visible || (prev.top === top && prev.left === position.left))
                                        ? prev : { visible, top, left: position.left });
                                    }}
                                    onSourceAction={(id, source, from, to) => {
                                      if (!activeTabId || isRestrictedUser) return;
                                      const changed = source !== contentRef.current;
                                      visualSourceActionRef.current = { id, source, from, to, tabId: activeTabId };
                                      contentRef.current = source;
                                      updateContent(source);
                                      if (changed) setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: source, isModified: true } : tab));
                                    }} content={content} onChange={next => {
                                    contentRef.current = next;
                                    updateContent(next, false, true);
                                    setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
                                  }} />
                                ) : <MarkdownViewer
                                content={processedContent}
                                onMediaEdit={isRestrictedUser ? undefined : editDocumentMedia}
                                picturebookProfile={activeProfile}
                                picturebookEditorOptions={{documentId:activeTabId,tabSize:editorTabSize,spellCheck,customCommands:customSlashCommands,customHotkeys,commandRef:visualCommandRef,
                                  bibContent,onCitation:()=>setIsCitationModalOpen(true),
                                  onAction:command=>dispatchCommand(command),
                                  floatingToolbarVisible:floatingToolbar.visible,
                                  onFloatingToolbar:(visible,position)=>{
                                    visualFloatingOriginRef.current=visible;
                                    setFloatingToolbar(prev=>({...prev,visible,top:position.top+48,left:position.left}));
                                  },
                                  onImageFile:async file=>{let savedPath:string|null=null;await handlePasteImageFile(file,path=>{savedPath=path;});return savedPath;},
                                  onMediaDialog:(kind,insert)=>{
                                    visualMediaInsertRef.current={kind,documentId:activeTabIdRef.current,insert};
                                    setMediaDialogSource({kind,source:''});
                                    if(kind==='map')setIsMapModalOpen(true);else {setYoutubeInitialUrl(null);setIsYoutubeModalOpen(true);}
                                  },
                                  onFormulaDialog:insert=>{
                                    visualFormulaInsertRef.current=insert;
                                    setFormulaModalInitialLatex('');setIsFormulaModalOpen(true);
                                  },
                                  onImageDialog:(insert,source)=>{
                                    const details=source?visualImageDetails(source):{path:'',alt:''};
                                    const params=new URLSearchParams(details.path.includes('?')?details.path.slice(details.path.indexOf('?')+1):'');
                                    visualImageInsertRef.current=(path,alt)=>insert(picturebookImageReference(path,alt));
                                    setEditingImageInfo({path:details.path,alt:details.alt,width:params.get('width')||'',height:params.get('height')||'',align:params.get('align')||'center',range:{visualImage:true,documentId:activeTabIdRef.current}});
                                    setIsImageModalOpen(true);
                                  }
                                }}
                                onPicturebookImageEdit={index => {
                                  const original = contentRef.current;
                                  const scene = parseBookScenes(extractFrontmatter(original).content).scenes[index];
                                  if (!scene) return;
                                  const image = visualImageDetails(scene.image);
                                  setEditingImageInfo({path:image.path || '',alt:image.alt || '',width:'',height:'',align:'center',range:{bookSceneIndex:index, documentId:activeTabIdRef.current, originalSceneRaw:scene.raw}});
                                  setIsImageModalOpen(true);
                                }}
                                onPicturebookChange={!isRestrictedUser && directEditEnabled && currentFileName !== '도움말.md' ? (next) => {
                                  contentRef.current=next;
                                  updateContent(next, false, true);
                                  setTabs(prev => prev.map(tab => tab.id === activeTabId ? { ...tab, content: next, isModified: true } : tab));
                                } : undefined}
                                originalContent={previewContent}
                                lineMap={lineMap}
                                onCheckboxToggle={handleCheckboxToggle}
                                currentFilePath={currentFileNode?.path}
                                rootFolderPath={rootFolder?.name}
                                onFileOpen={handleFileOpenByPath}
                                listIndent={activeProfile.rules.ul?.['padding-left'] || activeProfile.rules.ol?.['padding-left']}
                                marginTop={pTop}
                                marginBottom={pBottom}
                                marginLeft={pLeft}
                                marginRight={pRight}
                                bibContent={bibContent}
                                rootFolder={rootFolder}
                                resourceFolderHandle={resourceFolderHandle}
                                resourceFolder={resourceFolder}

                                workspaceType={workspaceType}
                                onImageLoaded={handlePreviewImageLoaded}
                                customCss={dynamicCssString}
                              />}
                            </div>
                          );
                        })()}
                        {/*
                   * 동적 CSS 스타일 인젝션:
                   * custom-preview-container 내부의 태그들에 CssRuleSet을 적용합니다.
                   * activeProfileId === 'default'면 dynamicCssString이 빈 문자열이므로
                   * 이 <style> 태그는 자동으로 생략됩니다.
                   * 모든 값에 !important가 붙어 prose 클래스 스타일을 오버라이드합니다.
                   */}
                        {dynamicCssString && (
                          <style id="onrivi-dynamic-css" key="onrivi-dynamic-css" dangerouslySetInnerHTML={{ __html: dynamicCssString }} />
                        )}
                        {/* 미리보기 전용 모드이거나 A4 조판 가드가 켜져 있을 때 스킨의 배경색과 외부 감싸기용 회색 배경 분리 지정 */}
                        {(() => {
                          const activeProfile = resolveEffectiveDocumentProfile(previewContent);
                          const paperBg = activeProfile.pageStyle.backgroundColor || '#ffffff';
                          return (
                            <style id="onrivi-preview-page-css" key="onrivi-preview-page-css" dangerouslySetInnerHTML={{
                              __html: `
                        ${(previewMode === 'preview' || isA4GuardEnabled) ? `
                        .custom-preview-container {
                          background: ${isDarkMode ? '#13121a' : '#faf9f5'} !important;
                        }
                        ` : ''}
                        .preview-page-sheet {
                          background: ${paperBg} !important;
                          border-color: ${isDarkMode ? '#36343e' : '#e4e1ed'} !important;
                          box-shadow: none !important;
                        }
                      `}} />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )
              )}

            </main>
  );
}
