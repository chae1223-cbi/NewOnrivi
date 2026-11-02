// ====================================================================
// 📊 [OMD-EDIT-StatusBar-0003] StatusBar.tsx ➔ StatusBar
// 🎯 @KICK  : 하단 상태표시줄 - 글자 수, 단어 수, 서식 프로필, 저장 상태, 뷰포트 모드, 행/열 정보 및 지식 색인 실시간 진행률 표시
// 🚨 @PATCH : **2026-10-20** — [하단 상태바 커서 좌표(Ln, Col) 불변 버그 해결 및 3중 실시간 동기화 체계 구축]:
//             1) Context의 cursorLine/cursorColumn 변경 감지 useEffect 추가 및 onrivi:cursor-position 전역 이벤트 리스너 신설
//             2) 문서보기(VisualDocumentEditor) 및 모나코 에디터 양방향에서 커서 이동 시 즉시 localCursor를 동기화하여 Ln 1, Col 1 동결 결함 완전 해소
// 🚨 @PATCH : **2026-10-19** — [상태표시줄 간격 균등 배분 및 3대 영역(좌/중/우) 황금비율 레이아웃 개편]:
//             1) 좌측: 조판 도구 3종(경계/나누기/인쇄) + 서식 선택 + 저장 상태를 배치하여 휑하던 좌측을 채우고 안정적인 문서 도구 영역 형성
//             2) 중앙: 뷰 모드 세그먼트(Layout Guard / 문서 보기 / 나란히 보기) 및 지식 색인 배지를 배치하여 시각적 무게 중심 확보
//             3) 우측: 프레임 토글(툴바/AI/사이드바) + 글자 수 + 단어 수 + 커서 위치(Ln/Col)를 고른 여백(mx-2 구분선)으로 정돈하여 우측 쏠림 및 과밀 현상 완전 해소
// 🚨 @PATCH : **2026-10-19** — [상태바 목표치/프로그레스바 제거 및 3대 인쇄/조판 도구 아이콘 재배치]:
//             1) 2,000자 목표치 텍스트 및 프로그레스바 UI를 완전히 제거하고 글자 수/단어 수를 우측 행/열(Ln, Col) 앞으로 이동
//             2) 좌측 시작 위치에 '예상 페이지 경계 끄기/켜기(Book)', '페이지 나누기(Cut)', '인쇄/쪽 윤곽(Print)' 3개 액션 아이콘 버튼 신설
//             3) 예상 페이지 경계(onrivi:toggle-page-guides) 상태 토글 및 양방향 동기화 연동
// 🚨 @PATCH : **2026-10-15** — [화면 흔들림 방어]: 모드 전환 및 사이드바 토글 버튼의 transition-all을 transition-colors로 고정하여 뷰포트 레이아웃 재계산 및 미세 떨림 방지
// 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(Loader2, CheckCircle2, AlertTriangle, BookOpen) 제거, Icon 컴포넌트(Loading, CheckCircle, AlertWarning)로 교체
// 🚨 @PATCH : **2026-09-16** — [지식 베이스 색인 실시간 진행 표시기(Progress Badge) 연동]: 백그라운드 지식 수집/색인 중(knowledge:queue-progress) 현재 파일명, 진행률(%), 완료 및 실패 상태를 상태바 중앙에 실시간 스피너 배지로 상시 노출하여 작업 가시성 100% 확보
//             **2026-09-13** — [플로팅 서식 툴바 및 팝업리스트 가시성 보장을 위한 StatusBar z-index 조정]: 상태표시줄의 z-index를 z-40에서 z-20으로 낮추어 플로팅 툴바 드롭다운 및 모달 위계 충돌 방지
//             **2026-09-11** — 하단 상태바 폰트를 Pretendard 최우선으로 일원화 적용
//             **2026-09-05** — 제한사용자/읽기 전용 모드(isRestrictedUser) 시 하단 상태바의 편집보기 및 분할모드 버튼을 비활성화(disabled, opacity-40, 안내 툴팁) 처리하고 미리보기 버튼만 상시 활성화 유지
//             **2026-09-05** — AI 연동 해제(!geminiApiKey) 시 흐릿하게 노출되던 상태바 AI 버튼(✨)을 완전히 숨김 처리하여 깔끔한 UI 유지
//             **2026-09-05** — AI 연동 해제(!geminiApiKey) 시 상태바 하단 AI 버튼(✨) 비활성화(disabled, opacity-30, grayscale) 및 안내 툴팁/토스트 적용
//             **2026-09-04** — 툴바 숨기기/보이기 옆에 에디터 하단 2줄 AI 버튼 숨기기/보이기 토글 버튼(✨) 및 다국어 툴팁(aiButtonHide/aiButtonShow) 추가 연동
//             **2026-09-03** — 모니터 해상도 축소 시 프로그레스바와 서식 이름이 겹치는 현상을 해결하기 위해 프로그레스바를 xl 브레이크포인트로 최적화하고 서식 이름에 max-w 및 truncate 적용
// 🔗 @CALLS : useEditorContext, EDITOR_THEMES, lucide-react
// ====================================================================
"use client";

import { browserAccountStorage } from '@/lib/browserAccountStorage';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/icons/Icon';

import { EDITOR_THEMES } from '@/lib/editorThemes';

import { useEditorContext } from '@/context/EditorContext';

const localTranslations: Record<string, Record<string, string>> = {
  ko: {
    charCount: "글자 수",
    wordCount: "단어 수",
    manuscript: "원고지",
    page: "매",
    target: "목표",
    path: "경로",
    saved: "저장됨",
    saving: "저장 중...",
    unsaved: "저장되지 않음",
    toolbarHide: "툴바 숨기기",
    toolbarShow: "툴바 보이기",
    aiButtonHide: "AI 버튼 숨기기",
    aiButtonShow: "AI 버튼 보이기",
    sidebarHide: "사이드바 숨기기",
    sidebarShow: "사이드바 보이기",
    toSplitMode: "분할 화면 모드로 전환",
    toPreviewMode: "미리보기 전용 모드로 전환",
    toEditMode: "편집 전용 모드로 전환",
    theme: "테마 전환"
  },
  en: {
    charCount: "Characters",
    wordCount: "Words",
    manuscript: "Ms.",
    page: "p",
    target: "Target",
    path: "Path",
    saved: "Saved",
    saving: "Saving...",
    unsaved: "Unsaved",
    toolbarHide: "Hide Toolbar",
    toolbarShow: "Show Toolbar",
    aiButtonHide: "Hide AI Button",
    aiButtonShow: "Show AI Button",
    sidebarHide: "Hide Sidebar",
    sidebarShow: "Show Sidebar",
    toSplitMode: "Switch to Split View",
    toPreviewMode: "Switch to Preview Only",
    toEditMode: "Switch to Editor Only",
    theme: "Toggle Dark/Light Mode"
  },
  ja: {
    charCount: "文字数",
    wordCount: "単語数",
    manuscript: "原稿用紙",
    page: "枚",
    target: "目標",
    path: "パス",
    saved: "保存済み",
    saving: "保存中...",
    unsaved: "未保存",
    toolbarHide: "ツールバーを隠す",
    toolbarShow: "ツールバーを表示",
    aiButtonHide: "AIボタンを隠す",
    aiButtonShow: "AIボタンを表示",
    sidebarHide: "サイドバーを隠す",
    sidebarShow: "サイドバーを表示",
    toSplitMode: "分割表示モードに切り替え",
    toPreviewMode: "プレビュー専用モードに切り替え",
    toEditMode: "編集専用モードに切り替え",
    theme: "テーマ切り替え"
  },
  zh: {
    charCount: "字数",
    wordCount: "词数",
    manuscript: "原稿纸",
    page: "张",
    target: "目标",
    path: "路径",
    saved: "已保存",
    saving: "保存中...",
    unsaved: "未保存",
    toolbarHide: "隐藏工具栏",
    toolbarShow: "显示工具栏",
    aiButtonHide: "隐藏AI按钮",
    aiButtonShow: "显示AI按钮",
    sidebarHide: "隐藏侧边栏",
    sidebarShow: "显示侧边栏",
    toSplitMode: "切换到双栏视图模式",
    toPreviewMode: "切换到仅预览模式",
    toEditMode: "切换到仅编辑模式",
    theme: "切换主题配色"
  }
};

// ====================================================================
// 📊 [OMD-EDIT-StatusBar-0003] StatusBar ➔ StatusBar
// 🎯 @KICK  : 상태 표시줄 컴포넌트 - 글자 수, 단어 수, 저장 상태, 라인/컬럼 정보, 테마, 프리뷰 모드 표시
// 🛡️ @GUARD : StatusBarProps 인터페이스로 props 타입 검증
// 🚨 @PATCH : **2026-10-25** — [하단 상태표시줄(StatusBar) 글자 수 표기 정돈]:
//             1) 글자 수 표시에서 불필요한 '(공백제외 ...)' 보조 문구를 제거하고 간결하고 명확한 순수 글자 수만 표시하도록 정돈
// 🚨 @PATCH : **2026-10-25** — [하단 상태표시줄(StatusBar) 실시간 현재 입력 태그(최종안 태그 뱃지) 탑재]:
//             1) onrivi:active-tag 이벤트 버스 연동으로 문서보기(위지윅) 및 마크다운 에디터에서 현재 커서가 위치한 최종안 태그(<p>, <h1>~<h6>, <td>, <th>, <li>, <strong>, <u>, <code> 등)를 실시간 수신
//             2) 상태표시줄 우측 단어 수와 행/열(Ln, Col) 사이에 고대비 태그 뱃지(태그: <최종안태그> (한글서식명))를 영구 고정 배치하여, 문서 스크롤 위치와 무관하게 사용자가 항상 즉시 태그를 식별할 수 있도록 가독성 완비
// 🚨 @PATCH : **2026-09-02** — 방향키 이동 시 커서 좌표 자릿수 가변에 따른 상태바 흔들림(Jitter) 방지를 위해 고정 너비 및 React.memo 렌더링 격리 적용
//             **2026-08-26** — StatusBar에서 커서 위치 동기화(setLocalCursor) 시 이전 값과 동일하면 업데이트를 무시하도록 방어 로직을 추가하여 무한 렌더링(Maximum update depth exceeded) 에러 해결; **2026-08-12** — 에디터 타이핑 중 상태바 서식 텍스트가 깜빡거리며 깜빡임/언마운트되는 현상을 이전 유효 서식명을 캐싱하는 Ref 기반 리텐션 가드 및 고정 렌더링으로 개편 완벽 해결;
// 🔗 @CALLS : getFullPath, t
// ====================================================================
function StatusBar() {
  const { 
    content, rootFolder, currentFileName: fileName, driveLetter, 
    workspaceType, cloudProvider, currentFileNode, cursorLine, cursorColumn, saveStatus,
    isToolbarOpen, setIsToolbarOpen,
    isAiButtonVisible, setIsAiButtonVisible,
    isSidebarOpen, setIsSidebarOpen,
    previewMode, setPreviewMode,
    isA4GuardEnabled, setIsA4GuardEnabled,
    isDarkMode, setIsDarkMode,
    themePalette, handleThemeChange: onThemeChange,
    isActivated,
    isExpired,
    activeProfileId, profiles, DEFAULT_PROFILE, onSelectProfile, onOpenStyleSettings,
    editorRef,
    geminiApiKey,
    showToast,
    isRestrictedUser,
    dispatchCommand
  } = useEditorContext();

  const folderName = rootFolder?.name;
  const relativePath = currentFileNode?.path;
  const activeProfileName = profiles?.find((p: any) => p.id === activeProfileId)?.name || DEFAULT_PROFILE?.name;

  // 💡 [서식 깜빡임 방지 리텐션 가드] 타이핑 도중 서식명이 undefined 가 되는 찰나에도 이전 이름을 유지
  const lastActiveProfileNameRef = React.useRef('기본 서식');
  if (activeProfileName) {
    lastActiveProfileNameRef.current = activeProfileName;
  }
  const displayProfileName = activeProfileName || lastActiveProfileNameRef.current || '기본 서식';
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setIsProfileMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isProfileMenuOpen]);

  // 📖 [예상 페이지 경계 가이드 동기화]
  const [pageGuides, setPageGuides] = useState<boolean>(() => {
    try {
      return browserAccountStorage.getItem('onrivi_tabs_page_guides') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleToggle = (e: any) => {
      if (typeof e.detail === 'boolean') {
        setPageGuides(e.detail);
      } else {
        setPageGuides(v => !v);
      }
    };
    window.addEventListener('onrivi:toggle-page-guides', handleToggle);
    return () => window.removeEventListener('onrivi:toggle-page-guides', handleToggle);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.onriviPageGuides = String(pageGuides);
  }, [pageGuides]);

  const handleTogglePageGuides = () => {
    const next = !pageGuides;
    setPageGuides(next);
    try {
      browserAccountStorage.setItem('onrivi_tabs_page_guides', String(next));
    } catch {}
    window.dispatchEvent(new CustomEvent('onrivi:toggle-page-guides', { detail: next }));
  };

  const [localCursor, setLocalCursor] = useState({ line: cursorLine || 1, column: cursorColumn || 1 });

  // 💡 [Context 커서 좌표 실시간 반영] VisualDocumentEditor 등 Context 변경 시 상태바 즉각 갱신
  React.useEffect(() => {
    if (typeof cursorLine === 'number' && typeof cursorColumn === 'number') {
      setLocalCursor(prev => {
        if (prev.line === cursorLine && prev.column === cursorColumn) return prev;
        return { line: cursorLine, column: cursorColumn };
      });
    }
  }, [cursorLine, cursorColumn]);

  // 💡 [전역 커서 이벤트 버스 감지] 위지윅 문서보기 및 모나코 에디터의 커서 변경 이벤트 즉시 수신
  React.useEffect(() => {
    const handleCursorPos = (e: any) => {
      const { line, column } = e.detail || {};
      if (typeof line === 'number' && typeof column === 'number') {
        setLocalCursor(prev => {
          if (prev.line === line && prev.column === column) return prev;
          return { line, column };
        });
      }
    };
    window.addEventListener('onrivi:cursor-position', handleCursorPos);
    return () => window.removeEventListener('onrivi:cursor-position', handleCursorPos);
  }, []);

  // 💡 [커서 실시간 업데이트 픽스] Editor의 Cursor 이벤트를 직접 감지하여 Context 지연/렌더링 블락 방지
  React.useEffect(() => {
    let disposable: any;
    
    const attachListener = () => {
      const editor = editorRef?.current || (window as any).monaco?.editor?.getEditors?.()?.[0];
      if (editor) {
        disposable = editor.onDidChangeCursorPosition((e: any) => {
          setLocalCursor(prev => {
            if (prev.line === e.position.lineNumber && prev.column === e.position.column) return prev;
            return { line: e.position.lineNumber, column: e.position.column };
          });
        });
        // 현재 위치 동기화
        const pos = editor.getPosition();
        if (pos) {
          setLocalCursor(prev => {
            if (prev.line === pos.lineNumber && prev.column === pos.column) return prev;
            return { line: pos.lineNumber, column: pos.column };
          });
        }
      } else {
        // 에디터가 아직 마운트되지 않은 경우 0.5초 후 재시도
        setTimeout(attachListener, 500);
      }
    };
    
    attachListener();
    
    return () => {
      if (disposable) disposable.dispose();
    };
  }, [editorRef, workspaceType, activeProfileId, fileName]); // 탭이나 모드가 변경될 때마다 재연결

  // 🏷️ [실시간 현재 입력 태그 감지] VisualDocumentEditor 등에서 전달되는 활성 태그 및 최종안 태그 동기화
  const [currentTag, setCurrentTag] = useState<{
    innermostTag: string;
    innermostLabel: string;
    pathString: string;
    labelPathString: string;
  }>({
    innermostTag: 'p',
    innermostLabel: '본문',
    pathString: 'p',
    labelPathString: '본문',
  });

  useEffect(() => {
    const handleTagChange = (e: any) => {
      if (e.detail && e.detail.innermostTag) {
        setCurrentTag(prev =>
          prev.innermostTag === e.detail.innermostTag &&
          prev.innermostLabel === e.detail.innermostLabel &&
          prev.pathString === e.detail.pathString
            ? prev
            : e.detail
        );
      }
    };
    window.addEventListener('onrivi:active-tag', handleTagChange);
    return () => window.removeEventListener('onrivi:active-tag', handleTagChange);
  }, []);

  // Monaco 커서 위치 기반 마크다운 태그 감지 (마크다운 에디터 포커스 시 보조 연동)
  useEffect(() => {
    if (previewMode === 'preview') return;
    const editor = editorRef?.current;
    if (!editor || !editor.hasTextFocus()) return;
    const model = editor.getModel();
    const pos = editor.getPosition();
    if (!model || !pos) return;
    const lineContent = model.getLineContent(pos.lineNumber);
    const trimmed = lineContent.trim();
    let innermostTag = 'p';
    let innermostLabel = '본문';
    let pathString = 'p';

    if (/^#{1}\s/.test(trimmed)) { innermostTag = 'h1'; innermostLabel = '제목 1'; pathString = 'h1'; }
    else if (/^#{2}\s/.test(trimmed)) { innermostTag = 'h2'; innermostLabel = '제목 2'; pathString = 'h2'; }
    else if (/^#{3}\s/.test(trimmed)) { innermostTag = 'h3'; innermostLabel = '제목 3'; pathString = 'h3'; }
    else if (/^#{4}\s/.test(trimmed)) { innermostTag = 'h4'; innermostLabel = '제목 4'; pathString = 'h4'; }
    else if (/^#{5}\s/.test(trimmed)) { innermostTag = 'h5'; innermostLabel = '제목 5'; pathString = 'h5'; }
    else if (/^#{6}\s/.test(trimmed)) { innermostTag = 'h6'; innermostLabel = '제목 6'; pathString = 'h6'; }
    else if (/^(\*|-|\+)\s/.test(trimmed)) { innermostTag = 'li'; innermostLabel = '목록 항목'; pathString = 'ul > li'; }
    else if (/^\d+\.\s/.test(trimmed)) { innermostTag = 'li'; innermostLabel = '목록 항목'; pathString = 'ol > li'; }
    else if (/^>\s/.test(trimmed)) { innermostTag = 'blockquote'; innermostLabel = '인용구'; pathString = 'blockquote > p'; }
    else if (trimmed.startsWith('|') && trimmed.endsWith('|')) { innermostTag = 'td'; innermostLabel = '내용 셀'; pathString = 'table > tr > td'; }

    setCurrentTag({ innermostTag, innermostLabel, pathString, labelPathString: innermostLabel });
  }, [localCursor, previewMode, editorRef]);

  // 🧠 [지식 엔진 백그라운드 색인 실시간 진행 가시성 보장]
  const [knowledgeProgress, setKnowledgeProgress] = useState<{
    isProcessing: boolean;
    total: number;
    completed: number;
    queued: number;
    running: number;
    percent: number;
    currentFile?: string;
    currentStep?: string;
    failedCount: number;
    isFinishedRecent: boolean;
  }>({
    isProcessing: false,
    total: 0,
    completed: 0,
    queued: 0,
    running: 0,
    percent: 0,
    failedCount: 0,
    isFinishedRecent: false
  });

  useEffect(() => {
    let finishTimer: any = null;

    const handleProgress = (e: any) => {
      const stats = e.detail;
      if (!stats) return;

      const total = stats.total || 0;
      const completed = stats.completed || 0;
      const running = stats.running || 0;
      const queued = stats.queued || 0;
      const failed = stats.failed || 0;
      const percent = stats.percent || (total > 0 ? Math.round((completed / total) * 100) : 0);
      const isProcessing = (running > 0 || queued > 0);

      setKnowledgeProgress(prev => {
        const wasProcessing = prev.isProcessing;
        const justFinished = wasProcessing && !isProcessing && completed > 0;

        if (justFinished) {
          if (finishTimer) clearTimeout(finishTimer);
          finishTimer = setTimeout(() => {
            setKnowledgeProgress(p => ({ ...p, isFinishedRecent: false }));
          }, 4500);
        }

        return {
          isProcessing,
          total,
          completed,
          queued,
          running,
          percent,
          currentFile: stats.currentFile || prev.currentFile,
          currentStep: stats.currentStep || prev.currentStep,
          failedCount: failed,
          isFinishedRecent: justFinished ? true : prev.isFinishedRecent
        };
      });
    };

    window.addEventListener('knowledge:queue-progress', handleProgress);

    // 최초 마운트 시 리소스 폴더의 큐 통계 1회 체크
    const checkInitialStats = async () => {
      try {
        const resFolder = localStorage.getItem('onrivi_resource_folder');
        if (!resFolder) return;
        const res = await fetch(`/api/knowledge/queue/stats?resourceFolder=${encodeURIComponent(resFolder)}`);
        const data = await res.json();
        if (data.ok && data.stats) {
          handleProgress({ detail: data.stats });
        }
      } catch {}
    };
    checkInitialStats();

    return () => {
      window.removeEventListener('knowledge:queue-progress', handleProgress);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, []);

  const currentTheme = EDITOR_THEMES.find(t => t.id === themePalette) || EDITOR_THEMES[0];
  const charCount = content.length;
  const charCountNoSpace = content.replace(/\s/g, '').length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  // 기자들을 위해 원고지 매수를 소수점 첫째 자리까지 표시 (제거됨)



// ====================================================================
// 📊 [OMD-EDIT-StatusBar-0002] StatusBar ➔ t
// 🎯 @KICK  : 다국어 키-값 조회 함수 - localTranslations에서 key에 해당하는 번역 문자열 반환
// 🛡️ @GUARD : dict[key]가 없으면 key 자체를 fallback으로 반환
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
  const t = (key: string) => {
    const dict = localTranslations["ko"] || localTranslations['en'];
    return dict[key] || key;
  };

  // 전체 경로 계산
// ====================================================================
// 📊 [OMD-EDIT-StatusBar-0001] StatusBar ➔ getFullPath
// 🎯 @KICK  : 전체 파일 경로를 workspaceType에 따라 조합하여 반환
// 🛡️ @GUARD : 없음
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
  const getFullPath = () => {
    if (workspaceType === 'browser') {
      const displayPath = relativePath || fileName;
      return folderName ? `${folderName} \\ ${displayPath.replace(/\//g, ' \\ ')}` : `🌐 Browser Storage \\ ${displayPath.replace(/\//g, ' \\ ')}`;
    }
    if (workspaceType === 'cloud') {
      const displayPath = relativePath || fileName;
      return `[${cloudProvider || 'Cloud'}] \\ ${folderName || 'Sync'} \\ ${displayPath.replace(/\//g, ' \\ ')}`;
    }
    
    // 저장된 파일의 전체 경로가 있으면 그대로 사용
    if (relativePath?.includes(':')) return relativePath;
    
    // folderName에서 끝 백슬래시 제거 후 경로 조합
    const cleanFolder = folderName ? folderName.replace(/\\+$/, '') : undefined;
    if (cleanFolder?.includes(':')) return `${cleanFolder}\\${fileName}`;
    
    return `${driveLetter}\\새 문서\\${fileName}`;
  };

  const saveStatusText = saveStatus ? t(saveStatus) : '';
  const saveStatusColor = saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'saving' ? 'text-blue-500' : saveStatus === 'unsaved' ? 'text-amber-500' : '';

  return (
    <footer 
      style={{ fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif" }}
      className="h-12 bg-zinc-100 dark:bg-zinc-900 border-t border-black/5 dark:border-white/10 flex justify-between items-center px-4 text-[12px] font-bold text-gray-700 dark:text-zinc-300 relative z-20 whitespace-nowrap select-none"
    >
      {/* 1. 좌측 영역: 조판 액션 도구 & 서식 & 저장 상태 */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 📖 예상 페이지 경계 켜기/끄기 */}
        <button
          type="button"
          onClick={handleTogglePageGuides}
          className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${
            pageGuides
              ? 'text-blue-600 dark:text-blue-400 bg-blue-500/15 font-bold shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title={pageGuides ? "PDF 기준 페이지 보기 끄기" : "PDF 기준 페이지 보기 켜기"}
          aria-label={pageGuides ? "PDF 기준 페이지 보기 끄기" : "PDF 기준 페이지 보기 켜기"}
        >
          <Icon name="Book" size={15} />
        </button>

        {/* 🖨️ 인쇄 / 쪽 윤곽 */}
        <button
          type="button"
          disabled={Boolean(isRestrictedUser)}
          onClick={() => {
            dispatchCommand?.('OPEN_EXPORT');
            window.dispatchEvent(new Event('onrivi:open-print'));
          }}
          className="p-1.5 rounded-md transition-colors flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          title="인쇄 / 쪽 윤곽"
          aria-label="인쇄 / 쪽 윤곽"
        >
          <Icon name="Print" size={15} />
        </button>

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 서식 선택 드롭다운 */}
        {displayProfileName && (
          <div ref={profileMenuRef} className="hidden md:block relative shrink-0">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(open => !open)}
              aria-haspopup="listbox"
              aria-expanded={isProfileMenuOpen}
              className="flex items-center gap-1 max-w-[170px] xl:max-w-[240px] text-blue-600 dark:text-blue-400 font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded px-1.5 py-1"
              title={`서식 선택: ${displayProfileName}`}
            >
              <span className="truncate">서식: {displayProfileName}</span>
              <span aria-hidden="true" className="text-[10px]">▾</span>
            </button>
            {isProfileMenuOpen && (
              <div role="listbox" aria-label="서식 선택" className="absolute bottom-full left-0 mb-2 w-64 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50 whitespace-normal">
                {(profiles || []).map((profile: any) => (
                  <button
                    key={profile.id}
                    type="button"
                    role="option"
                    aria-selected={profile.id === activeProfileId}
                    onClick={() => { onSelectProfile?.(profile.id); setIsProfileMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-blue-50 dark:hover:bg-zinc-800 ${profile.id === activeProfileId ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-zinc-200'}`}
                  >
                    <span className="truncate">{profile.name}</span>
                    {profile.id === activeProfileId && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
                <div className="border-t border-slate-200 dark:border-zinc-700 mt-1 pt-1">
                  <button type="button" onClick={() => { setIsProfileMenuOpen(false); onOpenStyleSettings?.(); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-zinc-800">서식 관리…</button>
                </div>
              </div>
            )}
          </div>
        )}

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 저장 상태 표시 */}
        <div className="min-w-[70px] flex justify-center shrink-0">
          {saveStatusText && (
            <span className={`${saveStatusColor} font-semibold text-center text-[11px]`}>{saveStatusText}</span>
          )}
        </div>
      </div>

      {/* 2. 중앙 영역: 뷰 모드 세그먼트 & 지식 색인 배지 */}
      <div className="flex items-center gap-3 shrink-0 mx-auto">
        {/* 🧠 지식 엔진 백그라운드 색인 실시간 진행 표시기 (Progress Badge) */}
        {knowledgeProgress.isProcessing ? (
          <div 
            onClick={() => window.open('/knowledge', '_blank')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/15 dark:bg-blue-400/20 border border-blue-500/40 text-blue-600 dark:text-blue-300 cursor-pointer hover:bg-blue-500/25 transition-all shrink-0 shadow-2xs"
            title="클릭하여 지식 베이스 관리 센터(/knowledge) 열기"
          >
            <Icon name="Loading" className="w-3.5 h-3.5 animate-spin text-[#1d4ed8] shrink-0" />
            <span className="font-extrabold text-[11px] tabular-nums">
              지식 색인 중 {knowledgeProgress.percent}% ({knowledgeProgress.completed}/{knowledgeProgress.total})
            </span>
            {knowledgeProgress.currentFile && (
              <span className="hidden lg:inline text-[11px] font-mono text-zinc-700 dark:text-zinc-200 max-w-[130px] truncate">
                - {knowledgeProgress.currentFile.split(/[/\\]/).pop()}
              </span>
            )}
          </div>
        ) : knowledgeProgress.isFinishedRecent ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shrink-0 animate-in fade-in">
            <Icon name="CheckCircle" className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-extrabold text-[11px]">지식 색인 완료 ({knowledgeProgress.completed}건)</span>
          </div>
        ) : knowledgeProgress.failedCount > 0 ? (
          <div 
            onClick={() => window.open('/knowledge', '_blank')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 cursor-pointer hover:bg-rose-500/25 shrink-0"
            title="클릭하여 지식 관리 센터에서 실패 내역 확인"
          >
            <Icon name="AlertWarning" className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="font-extrabold text-[11px]">지식 색인 오류 ({knowledgeProgress.failedCount}건)</span>
          </div>
        ) : null}

        {/* 모드 표시 세그먼트 */}
        {setPreviewMode && (
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-2xs">
            {/* 조판 가드(Layout Guard) 토글 */}
            {setIsA4GuardEnabled && (
              <button
                onClick={() => setIsA4GuardEnabled(!isA4GuardEnabled)}
                title={isA4GuardEnabled ? "조판 가드 끄기 (Disable Layout Guard)" : "조판 가드 켜기 (Enable Layout Guard)"}
                className={`px-3 py-1.5 text-[12px] font-bold transition-colors select-none border-r border-black/10 dark:border-white/10 ${
                  isA4GuardEnabled
                    ? 'bg-amber-500 text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/8 dark:hover:bg-white/8'
                }`}
              >
                Layout Guard {isA4GuardEnabled ? 'ON' : 'OFF'}
              </button>
            )}
            {(() => {
              const isEditDisabled = Boolean(isExpired || isRestrictedUser);
              const disabledTitle = isRestrictedUser
                ? "🔒 읽기 전용(제한사용자) 모드에서는 미리보기만 가능합니다. 상단 '이 화면에서 편집 시작하기'를 눌러주세요."
                : (isExpired ? "🔒 라이선스 만료로 편집 모드가 잠겨 있습니다." : "");

              return (
                <>
                  <button
                    onClick={() => setPreviewMode('preview')}
                    title={isEditDisabled ? "미리보기 전용 모드 (읽기 전용/제한 상태)" : "미리보기 - 렌더링된 문서만 표시"}
                    className={`px-3 py-1.5 text-[12px] font-bold transition-colors select-none ${
                      previewMode === 'preview'
                        ? 'bg-emerald-500 text-white'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/8 dark:hover:bg-white/8'
                    }`}
                  >문서 보기</button>
                  <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
                  <button
                    disabled={isEditDisabled}
                    onClick={() => !isEditDisabled && setPreviewMode('both')}
                    title={disabledTitle || "분할모드 - 에디터와 미리보기 함께 표시"}
                    className={`px-3 py-1.5 text-[12px] font-bold transition-colors select-none ${
                      isEditDisabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      previewMode === 'both' || previewMode === 'css-style'
                        ? 'bg-emerald-500 text-white'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/8 dark:hover:bg-white/8'
                    }`}
                  >{isEditDisabled ? '🔒' : ''}나란히 보기</button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 3. 우측 영역: UI 프레임 제어 & 계측 통계(글자 수/단어 수) & 커서 위치 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 툴바 숨기기/보이기 */}
        {setIsToolbarOpen && (
          <button
            onClick={() => setIsToolbarOpen(!isToolbarOpen)}
            className={`p-1.5 rounded-md text-[12px] font-semibold transition-all hover:bg-black/10 dark:hover:bg-white/10 ${
              isToolbarOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'
            }`}
            title={isToolbarOpen ? t('toolbarHide') : t('toolbarShow')}
          >
            <span className="leading-none text-[13px]">♻️</span>
          </button>
        )}
        {/* AI 버튼 숨기기/보이기 */}
        {setIsAiButtonVisible && Boolean(geminiApiKey) && (
          <button
            onClick={() => {
              if (!geminiApiKey) {
                showToast?.("AI 연동이 해제된 상태입니다. 환경설정에서 Gemini API Key를 등록해주세요.", "warning");
                return;
              }
              const next = !isAiButtonVisible;
              setIsAiButtonVisible(next);
              try {
                localStorage.setItem('onrivi_show_editor_ai_btn', String(next));
              } catch {}
            }}
            disabled={!geminiApiKey}
            className={`p-1.5 rounded-md text-[12px] font-semibold transition-all ${
              !geminiApiKey
                ? 'opacity-30 cursor-not-allowed grayscale text-gray-400 dark:text-zinc-600'
                : isAiButtonVisible 
                  ? 'text-purple-600 dark:text-purple-400 font-bold hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer' 
                  : 'text-gray-400 dark:text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'
            }`}
            title={
              !geminiApiKey 
                ? "AI 연동 해제됨 (환경설정에서 API 키 등록 필요)" 
                : isAiButtonVisible ? t('aiButtonHide') : t('aiButtonShow')
            }
          >
            <span className="leading-none text-[13px]">✨</span>
          </button>
        )}
        {/* 사이드바 숨기기/보이기 */}
        {setIsSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-md text-[12px] font-semibold transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
              isSidebarOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'
            }`}
            title={isSidebarOpen ? t('sidebarHide') : t('sidebarShow')}
          >
            <span className="leading-none text-[13px]">🗃️</span>
          </button>
        )}

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 글자 수 */}
        <span className="shrink-0 tabular-nums font-mono text-zinc-700 dark:text-zinc-300">
          {t('charCount')}: {charCount.toLocaleString()}
        </span>

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 단어 수 */}
        <span className="shrink-0 tabular-nums font-mono text-zinc-700 dark:text-zinc-300">
          {t('wordCount')}: {wordCount.toLocaleString()}
        </span>

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 🏷️ 현재 입력 태그 (최종안 태그 뱃지) */}
        <div
          className="flex items-center gap-1.5 shrink-0 select-none cursor-default"
          title={`전체 태그 경로: ${currentTag.labelPathString || currentTag.innermostLabel} (${currentTag.pathString || currentTag.innermostTag})`}
        >
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">태그:</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-400 dark:ring-blue-600 shadow-xs">
            <span>&lt;{currentTag.innermostTag}&gt;</span>
            <span className="font-sans font-semibold text-[10px] text-blue-700 dark:text-blue-400">({currentTag.innermostLabel})</span>
          </span>
          {currentTag.pathString && currentTag.pathString.includes(' > ') && (
            <span className="hidden xl:inline-flex items-center text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">
              <span className="text-zinc-400 mx-1">·</span>
              {currentTag.pathString}
            </span>
          )}
        </div>

        <span className="shrink-0 text-black/15 dark:text-white/15 mx-2">|</span>

        {/* 행 / 열 커서 위치 */}
        <span className="hover:text-[#0058bc] cursor-default text-[12px] tabular-nums font-mono min-w-[90px] text-right inline-block">
          Ln {localCursor.line}, Col {localCursor.column}
        </span>
      </div>
    </footer>
  );
}

export default React.memo(StatusBar);
