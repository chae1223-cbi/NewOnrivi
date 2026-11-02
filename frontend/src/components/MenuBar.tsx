// ====================================================================
// 📊 [OMD-UI-menuBar-0001] MenuBar.tsx ➔ 에디터 상단 메뉴바
// 🚨 @PATCH : **2026-10-21** — [편집 메뉴 '서명/발신인 (공문서)' 연동]:
//             편집(Edit) 메뉴에 '서명/발신인 (공문서)'(Signature 아이콘, 단축키 Ctrl+Alt+R) 항목을 신설하여 마크다운 및 문서보기(위지윅) 어디서든 공문서 서명 서식을 원클릭 삽입·감싸기 지원
// 🚨 @PATCH : **2026-10-19** — [파일 메뉴 내보내기 하위 메뉴 제거 및 통합 인쇄/쪽 윤곽 모달 직결]:
//             1) 파일 메뉴의 '내보내기' 하위 메뉴(PDF, Word, 한글, HTML, EPUB, PNG)를 전면 제거하고 클릭 시 즉시 인쇄/쪽 윤곽 모달(ExportModal)이 열리도록 개편
//             2) dispatch('OPEN_EXPORT') 단독 핸들러 지정으로 상단 메뉴 접근 동선 단순화 및 사용자 경험 개선
// 🚨 @PATCH : **2026-10-15** — [메뉴바 단축키 표기 완전 제거 및 UI 컴팩트화]:
//             1) MenuDropdown 내부의 shortcut 텍스트 렌더링을 완전히 제거하여 간결하고 직관적인 데스크톱 메뉴 UI 제공
//             2) 불필요한 단축키 여백을 줄이고 w-52 슬림 규격으로 정돈
// 🚨 @PATCH : **2026-10-15** — [메뉴 드롭다운 스크롤바 완전 제거 및 파일열기/다른이름으로저장/내보내기 직결 실행 보장]:
//             1) MenuDropdown 및 서브메뉴의 max-h와 overflow-y-auto를 전면 제거하여 스크롤 없이 전체 메뉴 항목이 한눈에 즉시 펼쳐지도록 복원
//             2) py-1.5 컴팩트 높이 적용으로 어떤 해상도에서도 스크롤 이동 없이 모든 메뉴(새문서, 파일열기, 저장, 다른이름으로저장, 내보내기 등) 상시 노출
//             3) '다른 이름으로 저장(saveFileAs)'에 직접 onClick: dispatch('SAVE_AS') 바인딩 및 서브메뉴(내PC/웹드라이브) 양방향 지원
//             4) '내보내기(export)'의 previewMode !== 'preview' 가드를 해제하여 분할 화면(나란히 보기) 등 모든 화면 모드에서 원클릭 사출 지원
//             5) 부모 메뉴 아이템에 onClick이 있는 경우(파일 열기, 다른 이름으로 저장 등) 서브메뉴 유무와 무관하게 직접 클릭 시 즉각 실행 연동
// 🚨 @PATCH : **2026-10-15** — [편집 메뉴 확대/축소 항목 삭제 및 문서보기 전용 줌 체계 정립]:
//             1) 편집(Edit) 메뉴 내 불필요한 확대(zoomIn) 및 축소(zoomOut) 메뉴 항목 완전 제거
//             2) 확대/축소 책임 영역을 모나코 편집기가 아닌 '문서보기'(PreviewToolbar/VisualDocumentEditor) 전용 기능으로 단일화
// 🚨 @PATCH : **2026-10-15** — [다른 이름으로 저장 명칭 표준화 및 작업장 비종속 분기]:
//             1) 메뉴 명칭을 '내PC(로컬)로 저장' 및 '개인웹드라이브 저장'으로 표준화
//             2) '· 현재 저장소' 태그를 제거하여 작업장 소속 드라이브와 상관없이 원하는 저장소를 언제든 선택할 수 있도록 개편
// 🚨 @PATCH : **2026-10-14** — [도구 메뉴 '서식 관리 (갤러리)' 문서보기 전면 활성화]:
//             도구 메뉴의 서식 관리 항목을 dispatch('TOGGLE_CSS_STYLE')로 일원화 연동하여 문서보기(VisualDocumentEditor) 및 모든 뷰 모드에서 원클릭 호출 지원
// 🚨 @PATCH : **2026-10-14** — [도구 메뉴 '각주 정리' 문서보기(VisualDocumentEditor) 포함 전면 활성화]:
//             단일/문서보기(previewMode === 'preview') 모드에서 차단되어 있던 비활성화 가드를 해제하여 문서보기 및 마크다운 편집기 모두에서 각주 정리가 정상 작동하도록 지원
// 🚨 @PATCH : **2026-10-13** — [편집 메뉴 '달력 및 날짜/시간 삽입' 연동]:
//             상단 편집(Edit) 메뉴에 '달력 및 날짜/시간 삽입' 항목을 신설하여 언제든 인터랙티브 달력 모달을 호출할 수 있도록 연동
// 🚨 @PATCH : **2026-10-11** — [파일 메뉴 최상단 '새 문서(Ctrl+N)' 항목 추가]:
//             파일 메뉴 열기 시 맨 첫 번째 항목으로 '새 문서 (Ctrl+N)'를 배치하여 언제든 원클릭으로 새 집필 탭을 생성할 수 있도록 확장
// 🚨 @PATCH : **2026-10-03** — [파일 메뉴 내 구글 드라이브 연결 및 해제 항목 추가]: 상단 파일(File) 메뉴에 '내 구글 드라이브 연결' 및 '구글 드라이브 해제' 항목을 추가하여 워크스페이스 상태와 관계없이 언제든 원클릭으로 클라우드 서재를 바인딩/전환할 수 있도록 접근성 극대화
// 🚨 @PATCH : **2026-10-02** — [편집 메뉴 이모지 보관함(Ctrl+Shift+E) 연동]: 상단 편집(Edit) 메뉴에 '이모지 보관함' 항목 및 단축키(Ctrl+Shift+E)를 신설하여 데스크톱 및 웹 환경 어디서나 상단 메뉴를 통해 손쉽게 이모지 보관함을 토글할 수 있도록 확장
// 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 메뉴 삭제]: 상단 파일 > 내보내기 서브메뉴에서 한글 문서(.hwpx) 항목 및 번역 키 완전 제거
// 🚨 @PATCH : **2026-10-01** — [제한사용자 미리보기 모드 시 메뉴바 내보내기 활성화]: isRestrictedUser 조건으로 인해 미리보기 모드에서도 내보내기 메뉴가 비활성화되던 가드를 해제하여 previewMode === 'preview'일 때 제한사용자도 문서 내보내기(인쇄, Word, 한글, HTML, EPUB, PNG)를 정상 이용할 수 있도록 개선
// 🚨 @PATCH : **2026-09-30** — [내보내기 서브메뉴 Word(.docx) 및 한글(.hwpx) 항목 추가]: 파일 > 내보내기 메뉴에 Word 문서(.docx) 및 한글 문서(.hwpx) 사출 액션 등록
// 🚨 @PATCH : **2026-09-30** — [미리보기 모드 시 문서 병합 및 각주 정리 비활성화]: previewMode가 'preview'일 때 도구 메뉴의 '문서 병합' 및 '각주 정리' 버튼을 disabled 처리하고 비활성화 툴팁 및 클릭 가드 적용
// 🚨 @PATCH : **2026-09-28** — 제한사용자 메뉴에서 읽기·이동·설정 명령만 활성화하고 저장·편집·변환·병합 명령 비활성화
//             **2026-09-28** — 에디터의 블로그 게시 버튼과 파일 메뉴 항목 제거
// 🚨 @PATCH : **2026-09-20** — [편집 메뉴 인용구 항목 제거] 편집(Edit) 메뉴의 '인용구 스타일 (Alert)' 서브메뉴 전체 삭제
//             **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import(ChevronRight, FolderSync) 제거, Icon 컴포넌트(ArrowRight, FolderSync) 로 교체
// 🚨 @PATCH : **2026-09-18** — [타문서 변환 명칭 및 단축키(Ctrl+Alt+O) 표준화]: 상단 파일 메뉴의 '문서 가져오기'를 '타문서 변환'으로 변경하고 바로가기 단축키(Ctrl+Alt+O) 라벨 동기화
//             **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: 도구(Tools) 메뉴의 '지식 보관함 관리자' 항목을 isDesktop 전용으로 한정하여 웹 브라우저 메뉴 간결화
//             **2026-09-12** — 메뉴바 전체 드롭다운 메뉴 아이템의 이모지를 통합 Icon 컴포넌트로 일원화 교체 (Modern Technical Editorial 벡터 스타일 통일)
//             **2026-09-11** — 상단 메뉴바 폰트를 Pretendard 최우선으로 일원화 적용
//             **2026-09-11** — 편집(Edit) 메뉴에 GitHub Alert 인용구 스타일 5종(Note, Tip, Important, Warning, Caution) 및 일반 인용구 선택 서브메뉴 신설
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-04** — 도구 메뉴의 '서식 정의 (갤러리)' 아이콘을 🎨로 변경하여 우측 툴바 서식관리와 시각적 일관성 확보
//             **2026-09-04** — 상단 메뉴바의 AI 버튼 캡슐(에디터 하단으로 이전) 및 지식 베이스 버튼(우측 사이드바 툴바로 이전) 2종 제거하여 상단 메뉴바 간결화
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 새 탭 생성 제거 및 에디터 인라인 지식 화면 전환 이벤트(app:open-knowledge-manager) 연동
// 🔗 @CALLS : /knowledge
// ====================================================================
"use client";

import React, { useEffect, useRef, useState } from 'react';


import { EDITOR_THEMES } from '@/lib/editorThemes';
import { useRouter } from 'next/navigation';
import { useEditorContext } from '@/context/EditorContext';
import { supabase } from '@/lib/supabaseClient';
import { Icon } from '@/components/icons/Icon';

const localTranslations: Record<string, Record<string, string>> = {
  ko: {
    file: "파일(F)",
    edit: "편집(E)",
    tools: "도구(T)",
    help: "도움말(H)",
    newFile: "새문서",
    openFolder: "파일 열기",
    openWorkspace: "작업장 폴더 열기",
    saveFile: "저장",
    saveFileAs: "다른 이름으로 저장",
    export: "내보내기",
    print: "인쇄/PDF",
    docx: "Word 문서 (.docx)",
    html: "HTML 파일 (.html)",
    epub: "EPUB 전자책 (.epub)",
    png: "PNG 이미지 (.png)",
    exit: "로그아웃",
    undo: "실행 취소",
    redo: "다시 실행",
    find: "찾기",
    replace: "바꾸기",
    insertImage: "이미지 삽입",
    insertDateTime: "날짜/시간 삽입",
    zoomIn: "확대",
    zoomOut: "축소",
    sidebarToggle: "사이드바 표시/숨김",
    viewMode: "화면 보기 모드",
    modeEdit: "편집 전용 모드",
    modeSplit: "분할 화면 모드",
    modePreview: "미리보기 전용 모드",
    themeSwitch: "테마 전환",
    globalSearch: "전역 검색",
    copyPreview: "마크다운 복사",
    toolbarToggle: "툴바 표시/숨김",
    search: "검색(S)",
    settings: "설정",
    userManual: "사용 설명서",
    shortcuts: "단축키 안내",
    license: "라이선스 등록",
    about: "프로그램 정보"
  },
  en: {
    file: "File",
    edit: "Edit",
    tools: "Tools",
    help: "Help",
    newFile: "New File",
    openFolder: "Open File",
    openWorkspace: "Open Workspace Folder",
    saveFile: "Save File",
    saveFileAs: "Save File As",
    export: "Export",
    print: "Print/PDF",
    docx: "Word Document (.docx)",
    html: "HTML File (.html)",
    epub: "EPUB E-book (.epub)",
    png: "PNG Image (.png)",
    exit: "Logout",
    undo: "Undo",
    redo: "Redo",
    find: "Find",
    replace: "Replace",
    insertImage: "Insert Image",
    insertDateTime: "Insert Date/Time",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    sidebarToggle: "Show/Hide Sidebar",
    viewMode: "View Mode",
    modeEdit: "Editor Only Mode",
    modeSplit: "Split View Mode",
    modePreview: "Preview Only Mode",
    themeSwitch: "Theme Switch",
    globalSearch: "Global Search",
    copyPreview: "Copy Preview",
    toolbarToggle: "Show/Hide Toolbar",
    settings: "Settings",
    userManual: "User Manual",
    shortcuts: "Keyboard Shortcuts",
    license: "Register License",
    about: "About Onrivi Author"
  }
};

// ====================================================================
// 📊 [OMD-EDIT-MenuBar-0004] MenuBar ➔ MenuBar
// 🎯 @KICK  : 상단 메뉴바 렌더링 - 파일/편집/도구/도움말 드롭다운 메뉴 제공
// 🛡️ @GUARD : previewMode가 'preview'일 때 편집 메뉴 숨김
// 🚨 @PATCH : **2026-09-05** — 제한사용자/읽기 전용 모드(isRestrictedUser) 시 상단 도구 메뉴의 '편집 전용' 및 '분할 화면' 서브메뉴를 비활성화(disabled, opacity-40) 처리하고 '미리보기'만 활성화 유지
//             **2026-09-05** — 다중 탭 실행 및 비인증 제한 상태(isRestrictedUser) 상단 사용자 정보 및 전체사용자 판별에 완벽 연동
//             **2026-09-03** — 에디터 및 미리보기 본문 가림 결함을 원천 차단하기 위해 상단 메뉴바 우측 끝에 고정형 AI 버튼 및 모델 선택 드롭다운 캡슐 장착 연동
//             **2026-09-03** — 상단 우측 사용자 정보 표시줄을 이메일 대신 별명(userNickname)으로 우선 표기 및 클릭 시 환경설정 '계정 관리' 탭(SETTINGS_ACCOUNT)으로 즉각 이동 연동; 환경설정에서 별명 변경 시 실시간 동기화 리스너 탑재
//             **2026-09-02** — [ONRIVI-DS-SYSTEM-002 v5.0] LINE Design System (LDSG) 표준 적용 (LINE Green #1d4ed8 호버 및 Surface High 드롭다운)
//             **2026-07-23** — 파일 메뉴 용어 변경: '불러오기'→'파일 열기', '폴더 열기'→'작업장 폴더 열기' (ko/en 모두 적용); **2026-07-05** — MainEditorApp의 Props 의존성을 전면 제거하고 EditorContext 참조 방식으로 아키텍처 리팩토링; PDF/HTML 내보내기 → PRINT(OS 인쇄)로 통합; 번역키 pdf/html 제거, print 추가
// 🔗 @CALLS : MenuDropdown, dispatch, setIsSidebarOpen, setIsToolbarOpen, setPreviewMode
// ====================================================================
export default function MenuBar() {
  const { 
    previewMode, setPreviewMode, 
    dispatchCommand: dispatch, setContent,
    isSearchOpen,
    isAddonEnv,
    handleThemeChange: onThemeChange,
    isDarkMode, setIsDarkMode, 
    isSidebarOpen, setIsSidebarOpen, 
    isToolbarOpen, setIsToolbarOpen, 
    themePalette,
    licenseStatus, isActivated,
    resourceFolder, resourceFolderHandle,
    isRestrictedUser, activeTabId,
    connectGoogleDrive, disconnectGoogleDrive, rootFolder
  } = useEditorContext();
  
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userNickname, setUserNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('onrivi_user_nickname') ||
        localStorage.getItem('onrivi_nick_name') ||
        ''
      ).trim();
    }
    return '';
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // 🌟 [리소스 폴더 미지정 및 전체사용자 여부 실시간 계산]
  const isResourceFolderMissing = !resourceFolder && !resourceFolderHandle;
  const isFullUser = !isRestrictedUser && (isActivated || !licenseStatus?.isExpired) && 
                     !licenseStatus?.planName?.includes('제한사용자');

  // 🌟 [별명 실시간 동기화 리스너] 환경설정 모달 등에서 별명이 변경되면 상단 메뉴바도 즉시 갱신
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        const metaNick = (session.user.user_metadata?.nick_name || session.user.user_metadata?.name || '').trim();
        if (metaNick) {
          setUserNickname(metaNick);
        }

        // DB 원장의 최신 별명 조회
        fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_id: session.user.id, p_email: session.user.email })
        })
          .then(res => res.json())
          .then(data => {
            if (data?.nick_name) {
              setUserNickname(data.nick_name);
              localStorage.setItem('onrivi_user_nickname', data.nick_name);
            }
          })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

// ====================================================================
// 📊 [OMD-EDIT-MenuBar-0003] MenuBar ➔ handleThemeSelect
// 🎯 @KICK  : 테마 선택 시 onThemeChange 콜백 호출
// 🛡️ @GUARD : onThemeChange가 존재할 때만 호출
// 🚨 @PATCH : 없음
// 🔗 @CALLS : onThemeChange
// ====================================================================
  const handleThemeSelect = (themeId: string) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
  };

  const t = (key: string) => {
    const dict = localTranslations["ko"] || localTranslations['en'];
    return dict[key] || key;
  };

// ====================================================================
// 📊 [OMD-EDIT-MenuBar-0002] MenuBar ➔ useEffect (click outside)
// 🎯 @KICK  : 메뉴 외부 클릭 시 activeMenu를 닫는 클릭 감지 리스너 설치
// 🛡️ @GUARD : menuRef.contains로 클릭 대상이 메뉴 내부인지 확인
// 🚨 @PATCH : 없음
// 🔗 @CALLS : setActiveMenu
// ====================================================================
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fileItems = [
    { label: t('newFile'), icon: <Icon name="Plus" size={15} />, shortcut: 'Ctrl+N', onClick: () => dispatch('NEW_FILE') },
    { label: t('openFolder'), icon: <Icon name="FolderOpen" size={15} />, shortcut: 'Ctrl+O', onClick: () => dispatch('OPEN_FILE'), subItems: [
      { label: '내PC(로컬)에서 가져오기', icon: <Icon name="Folder" size={15} />, onClick: () => window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { source: 'local' } })) },
      { label: '웹드라이브에서 가져오기', icon: <Icon name="FolderSync" size={15} />, onClick: () => window.dispatchEvent(new CustomEvent('TRIGGER_IMPORT', { detail: { source: 'drive' } })) }
    ] },
    { label: t('openWorkspace'), icon: <Icon name="Folder" size={15} />, shortcut: 'Ctrl+Shift+O', onClick: () => dispatch('OPEN_WORKSPACE') },
    rootFolder?.type === 'GDRIVE'
      ? { label: "개인 웹드라이브 연결 해제", icon: <span className="text-[13px]">🔌</span>, onClick: () => disconnectGoogleDrive && disconnectGoogleDrive() }
      : { label: "개인 웹드라이브 연결", icon: <span className="text-[13px]">☁️</span>, onClick: () => connectGoogleDrive && connectGoogleDrive() },
    { divider: true },
    { label: t('saveFile'), icon: <Icon name="Save" size={15} />, shortcut: 'Ctrl+S', disabled: isRestrictedUser, onClick: () => dispatch('SAVE') },
    { label: t('saveFileAs'), icon: <Icon name="Export" size={15} />, shortcut: 'Ctrl+Shift+S', disabled: isRestrictedUser, onClick: () => dispatch('SAVE_AS'), subItems: [
      {label: '내PC(로컬)로 저장', icon: <Icon name="Folder" size={15} />, onClick: () => window.dispatchEvent(new CustomEvent('onrivi:save-as-target', {detail:'download'}))},
      {label: '개인웹드라이브 저장', icon: <Icon name="FolderSync" size={15} />, onClick: () => window.dispatchEvent(new CustomEvent('onrivi:save-as-target', {detail:'upload'}))}
    ] },
    { divider: true },
    { 
      label: t('export'), 
      icon: <Icon name="Export" size={15} />,
      disabled: isRestrictedUser,
      onClick: () => dispatch('OPEN_EXPORT')
    },
    { divider: true },
    // 📊 [OMD-EDIT-MenuBar-0005] 파일 메뉴 하단 홈/대시보드 네비게이션
    // 🎯 @KICK  : useRouter.push('/') / push('/dashboard') 로 페이지 이동
    // 🚨 @PATCH : 2026-06-22 — 에디터에서 랜딩/대시보드 이동 가능하도록 추가
    ...((typeof window !== 'undefined' && !!(window as any).electronAPI) ? [] : [
      { label: t('exit'), icon: <Icon name="LogOut" size={15} />, onClick: () => dispatch('EXIT') },
      { divider: true },
    ]),
    { label: "홈으로", icon: <Icon name="Home" size={15} />, onClick: () => router.push('/') },
    { label: "블로그 가기", icon: <Icon name="Book" size={15} />, onClick: () => router.push('/blog') },
    { label: "대시보드", icon: <Icon name="Dashboard" size={15} />, onClick: () => router.push('/dashboard') },
  ];


  /* [ONR-UI-003] 상단 메뉴바 이벤트 연동: 테마 스위칭, 내보내기 대화상자 등 전역 레이아웃 제어를 메뉴 트리거와 연결합니다. */
  return (
    <nav 
      ref={menuRef} 
      style={{ fontFamily: "'Pretendard', 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif" }}
      className="h-[36px] bg-surface-container border-b border-outline/10 flex items-center px-1 text-sm font-medium relative z-[100] text-on-surface whitespace-nowrap select-none shrink-0"
    >
      <MenuDropdown 
        label={t('file')} 
        isOpen={activeMenu === 'file'} 
        onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
        onClose={() => setActiveMenu(null)}
        items={fileItems}
        isDarkMode={isDarkMode}
      />
      <MenuDropdown 
        label={t('edit')} 
        isOpen={activeMenu === 'edit'} 
        onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
        onClose={() => setActiveMenu(null)}
        isDarkMode={isDarkMode}
        items={[
          { label: t('undo'), icon: <Icon name="Undo" size={15} />, shortcut: 'Ctrl+Z', disabled: isRestrictedUser || !activeTabId, onClick: () => dispatch('UNDO') },
          { label: t('redo'), icon: <Icon name="Redo" size={15} />, shortcut: 'Ctrl+Y', disabled: isRestrictedUser || !activeTabId, onClick: () => dispatch('REDO') },
          { divider: true },
          { label: t('find'), icon: <Icon name="Search" size={15} />, shortcut: 'Ctrl+F', disabled: isRestrictedUser, onClick: () => dispatch('FIND') },
          { label: t('replace'), icon: <Icon name="Refresh" size={15} />, shortcut: 'Ctrl+H', disabled: isRestrictedUser, onClick: () => dispatch('REPLACE') },
          { divider: true },
          { 
            label: "서명/발신인 (공문서)", 
            icon: <Icon name="Signature" size={15} />, 
            shortcut: 'Ctrl+Alt+R', 
            disabled: isRestrictedUser || !activeTabId, 
            title: isRestrictedUser ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." : "서명/발신인 서식을 삽입하거나 선택 영역을 공문서 서식으로 감쌉니다.",
            onClick: () => !isRestrictedUser && dispatch('SIGNATURE') 
          },
        ]}
      />
      <MenuDropdown 
        label={t('tools')} 
        isOpen={activeMenu === 'tools'} 
        onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
        onClose={() => setActiveMenu(null)}
        isDarkMode={isDarkMode}
        items={[
          { label: t('sidebarToggle'), icon: <Icon name="CloseSidebar" size={15} />, onClick: () => setIsSidebarOpen(!isSidebarOpen) },
          { label: t('toolbarToggle'), icon: <Icon name="Sliders" size={15} />, onClick: () => setIsToolbarOpen(!isToolbarOpen) },
          { 
            label: "화면 보기 모드", 
            icon: <Icon name="Preview" size={15} />, 
            subItems: [
              { 
                label: "나란히 보기", 
                icon: <Icon name="ClosePanel" size={14} />,
                disabled: isRestrictedUser,
                title: isRestrictedUser ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." : undefined,
                isActive: previewMode === 'both',
                onClick: () => !isRestrictedUser && setPreviewMode('both') 
              },
              { 
                label: "미리보기", 
                icon: <Icon name="Preview" size={14} />,
                isActive: previewMode === 'preview',
                onClick: () => setPreviewMode('preview') 
              }
            ]
          },
          ...(typeof window !== 'undefined' && (
            !!(window as any).electronAPI ||
            navigator.userAgent.toLowerCase().includes('electron') ||
            new URLSearchParams(window.location.search).get('env') === 'desktop'
          ) ? [
            { 
              label: "지식 보관함 관리자", 
              icon: <Icon name="KnowledgeHub" size={15} />, 
              shortcut: 'Ctrl+Shift+K', 
              disabled: isRestrictedUser,
              title: isRestrictedUser ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." : undefined,
              onClick: () => !isRestrictedUser && window.dispatchEvent(new CustomEvent('app:open-knowledge-manager')) 
            }
          ] : []),
          { divider: true },
          { 
            label: "서식 관리 (갤러리)", 
            icon: <Icon name="Palette" size={15} />, 
            disabled: isRestrictedUser, 
            title: isRestrictedUser ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." : "출판 및 테마 서식 관리 창을 엽니다.",
            onClick: () => !isRestrictedUser && dispatch('TOGGLE_CSS_STYLE') 
          },
          { divider: true },
          { label: t('globalSearch'), icon: <Icon name="Search" size={15} />, shortcut: 'Ctrl+Shift+F', onClick: () => dispatch('GLOBAL_SEARCH') },
          { label: t('copyPreview'), icon: <Icon name="Copy" size={15} />, onClick: () => dispatch('COPY_ALL') },
          { 
            label: "문서 병합", 
            icon: <Icon name="Layers" size={15} />, 
            disabled: isRestrictedUser || previewMode === 'preview', 
            title: previewMode === 'preview' 
              ? "미리보기 모드에서는 사용할 수 없습니다." 
              : (isRestrictedUser ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." : undefined),
            onClick: () => !isRestrictedUser && previewMode !== 'preview' && dispatch('MERGE') 
          },
          { 
            label: "각주 정리", 
            icon: <Icon name="Document" size={15} />, 
            disabled: isRestrictedUser, 
            title: isRestrictedUser 
              ? "읽기 전용(제한사용자) 모드에서는 사용할 수 없습니다." 
              : "본문 순서에 따라 각주 번호를 1번부터 순차적으로 재정렬하고 문서 하단에 모읍니다.",
            onClick: () => !isRestrictedUser && dispatch('ORGANIZE_FOOTNOTES') 
          },
          { label: "환경 설정", icon: <Icon name="Settings" size={15} />, onClick: () => dispatch('SETTINGS') },
        ]}
      />
      <MenuDropdown 
        label={t('help')} 
        isOpen={activeMenu === 'help'} 
        onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
        onClose={() => setActiveMenu(null)}
        isDarkMode={isDarkMode}
          items={[
            { label: "사용 설명서", icon: <Icon name="Book" size={15} />, onClick: () => dispatch('HELP') },
            { label: t('license'), icon: <Icon name="Key" size={15} />, onClick: () => dispatch('LICENSE') },
          ]}
      />
      
      {/* 📊 [OMD-EDIT-MenuBar-USER] 우측 끝 로그인 사용자 별명 표시 및 클릭 시 계정 관리 탭 이동 */}
      <div className="ml-auto flex items-center pr-4 gap-2">
        {/* 🌟 전체사용자 대상 리소스 폴더 미설정 퀵 알림 칩 */}
        {isResourceFolderMissing && isFullUser && (
          <button
             type="button"
             onClick={() => dispatch('SELECT_RESOURCE_FOLDER')}
             title="공통 리소스 폴더(서식/이미지/AI템플릿)가 지정되지 않았습니다. 클릭하여 폴더를 지정하세요."
             className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors text-xs font-bold cursor-pointer shadow-xs outline-none focus:outline-none"
           >
             <Icon name="FolderSync" size={13} strokeWidth={2.5} />
             <span>리소스 폴더 미설정</span>
           </button>
        )}

        {(userNickname || userEmail || licenseStatus?.userId) && (
          <button
            type="button"
            onClick={() => dispatch('SETTINGS_ACCOUNT')}
            title="계정 관리로 이동"
            className="flex items-center gap-2 px-2.5 py-1 bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-zinc-800/80 rounded-lg border border-black/5 dark:border-white/10 shadow-xs hover:shadow-sm transition-colors cursor-pointer group outline-none focus:outline-none"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-[10px] group-hover:ring-2 group-hover:ring-blue-400/50 transition-[box-shadow] shrink-0">
              {((userNickname || userEmail || licenseStatus?.userId) || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {userNickname || userEmail || licenseStatus?.userId}
              <span className="ml-1.5 opacity-80 font-bold text-[11px] text-zinc-500 dark:text-zinc-400">
                ({(isRestrictedUser || licenseStatus?.isExpired || licenseStatus?.planName?.includes('동시 접속 초과') || licenseStatus?.planName?.includes('미인증') || licenseStatus?.planName?.includes('제한사용자')) ? '제한사용자' : '전체사용자'})
              </span>
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}

// ====================================================================
// ====================================================================
// 📊 [OMD-EDIT-MenuBar-0001] MenuBar ➔ MenuDropdown
// 🎯 @KICK  : 상단 메뉴 드롭다운 렌더링 - 서브메뉴 호버 열림 및 단축키 표시
// 🛡️ @GUARD : item.disabled 적용하여 클릭 및 서브메뉴 방지
// 🚨 @PATCH : **2026-10-15** — [화면 흔들림 완전 방어]: font-semibold로 인한 너비 변경(Layout Shift) 방지(font-medium 고정), slide-in 애니메이션 제거(fade-in 최적화), type="button" 및 outline-none 표준화
// 🚨 @PATCH : **2026-06-19** — 메뉴 아이템 비활성화(disabled) 기능 추가: item.disabled가 true일 때 opacity 및 cursor 스타일을 비활성화 형태로 변환하고 클릭/서브메뉴 오픈을 차단하도록 보정
// 🔗 @CALLS : 없음
// ====================================================================
function MenuDropdown({ label, isOpen, onClick, onClose, items, isDarkMode }: { label: string, isOpen: boolean, onClick: () => void, onClose: () => void, items: any[], isDarkMode: boolean }) {
  return (
    <div className="relative h-full">
      <button 
        type="button"
        onClick={onClick}
        className={`h-full px-3 outline-none focus:outline-none select-none hover:bg-surface-high/60 transition-colors font-medium text-sm ${
          isOpen ? 'bg-primary-container/20 text-primary' : 'text-on-surface'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 w-52 border border-outline/10 rounded-md py-1 text-on-surface bg-surface-high shadow-xl"
          style={{ 
            zIndex: 9999
          }}
        >
          {items.map((item, i) => (
            item.divider ? (
              <div key={i} className="my-1 border-t border-outline/10" />
            ) : (
              <div key={i} className="relative group">
                <button 
                  type="button"
                  disabled={item.disabled}
                  title={item.title}
                  onClick={() => { 
                    if (item.disabled) return;
                    if (item.onClick) { 
                      item.onClick(); 
                      onClose(); 
                    } 
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm outline-none focus:outline-none select-none ${
                    item.disabled 
                      ? 'opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-500' 
                      : 'hover:bg-[#1d4ed8] hover:text-white transition-colors'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 flex justify-center opacity-70">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.subItems && <Icon name="ArrowRight" size={14} className="opacity-50 ml-auto" />}
                </button>

                {/* Submenu — CSS group-hover로 제어 (mouse leave 문제 해결) */}
                {item.subItems && !item.disabled && (
                  <div 
                    className="absolute top-0 left-full w-52 border border-outline/10 rounded-md py-1 invisible group-hover:visible ml-px text-on-surface bg-surface-high shadow-xl"
                    style={{ 
                      zIndex: 10000
                    }}
                  >
                    {item.subItems.map((sub: any, j: number) => (
                      <button 
                        key={j}
                        type="button"
                        disabled={sub.disabled}
                        title={sub.title}
                        onClick={() => { 
                          if (sub.disabled) return;
                          sub.onClick?.(); 
                          onClose(); 
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors text-left text-sm outline-none focus:outline-none select-none ${
                          sub.disabled
                            ? 'opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-500'
                            : sub.isActive
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
                              : 'hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 flex justify-center">{sub.icon}</span>
                          <span>{sub.label}</span>
                        </div>
                        {sub.isActive && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
