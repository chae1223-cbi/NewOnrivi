import { nextReportNumber, resolveCaptionConfig } from '@/lib/aiFriendlyReport';
/**
 * 프로그램명 : OnriviAuthor
 * 프로그램 ID : oaar-modal-manager
 * 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 내보내기(sns) 핸들러 및 서식 자동 감지 연동]: ExportModal에 isSnsCardProfile, defaultSnsRatio 전달 및 format === 'sns' 선택 시 handlers.exportSNS(exportSettings) 호출 연결
 * 🚨 @PATCH : **2026-10-24** — [문서보기 위지윅 이미지 캡션(fullMarkdown) 양방향 전달]: deps.replaceVisualImage 호출 시 fullMarkdown 파라미터를 함께 전달하여 캡션 문단과 이미지가 동시 삽입되도록 연동
 * 🚨 @PATCH : **2026-10-22** — [미디어 종류별 캡션 설정 전달]: 그림·동영상·지도·표 모달에 resolveCaptionConfig로 종류별 캡션 위치/구문(kindOverrides)을 병합해 전달
 * 🚨 @PATCH : **2026-10-18** — [인용 모달 useEffect 의존성 보강]: citationTarget 설정 시 deps.activeTabId 및 deps.editorRef 의존성 등록 및 불필요한 cancel-citation 이벤트 방어
 * 🚨 @PATCH : **2026-10-21** — [내보내기 모달 onExport 실행 시 모달 자동 닫기]: 인쇄/PDF/Word 등 내보내기 버튼 클릭 시 모달(ExportModal)을 닫아 저장 다이얼로그 및 진행 토스트가 에디터 화면에 즉시 노출되도록 개선
 * 🚨 @PATCH : **2026-10-20** — [내보내기 모달 워터마크 설정(exportSettings) handlers.print 직결 전달]: ExportModal에서 실시간 조정한 워터마크(사용 여부, 문구, 이미지, 진하기)가 인쇄/PDF 사출 시 즉각 반영되도록 handlers.print(false, exportSettings) 연동
 * 🚨 @PATCH : **2026-10-17** — [표 생성 시 하단 빈 행(\n\n) 보장]: TableModal에서 표 마크다운 삽입 시 항상 하단에 빈 행이 포함되도록 보장하여 마우스 클릭으로 다음 작업을 이어갈 수 있도록 지원
 * 🚨 @PATCH : **2026-10-14** — [표 생성 시 첫 번째 열 헤더("제목") 자동 선택 및 다단계 포커스 안착]: TableModal에서 표 생성 시 모델 내 첫 번째 헤더 라인(| 행)과 첫 번째 열("제목") 컬럼 범위를 동적으로 정밀 계산하고, 모달 언마운트 포커스 유실을 방어하기 위해 다단계(0ms, 40ms, 120ms, 250ms)로 커서 및 선택영역을 자동 안착시켜 즉시 타이핑 수정이 가능하도록 전면 개선
 * 🚨 @PATCH : **2026-10-14** — [수식 에디터 모달(FormulaModal) 기존 LaTeX(formulaModalInitialLatex) 전달 연동]: deps.formulaModalInitialLatex를 FormulaModal에 initialLatex로 주입하여 기존 수식 편집 완비
 * 🚨 @PATCH : **2026-10-03** — [리소스 폴더 변경에 따른 미디어 대상 폴더 동적 경로 동기화]: resourceFolder(구글 드라이브 및 로컬)의 구분자 동적 판별 및 targetFolder media 경로 완전 동기화
 * 🚨 @PATCH : **2026-10-03** — [구글 드라이브 파일/폴더 생성 지원 및 미구현 백엔드 API 404 차단]: createFile/createFolder 시 구글 드라이브(GDRIVE) 분기 탑재 및 웹 브라우저 VFS 폴백 강화로 404 에러 원천 방어
 * 🚨 @PATCH : **2026-10-01** — [한글(.hwpx) 내보내기 모달 핸들러 제거]: ExportModal의 hwpx 선택 핸들러 분기 완전 삭제
 * 🚨 @PATCH : **2026-09-30** — [내보내기 모달 onExport 핸들러 Word(.docx) 및 한글(.hwpx) 연동]: ExportModal의 docx, hwpx 선택 시 handlers.exportDOCX 및 handlers.exportHWPX 실행 연결
 * 🚨 @PATCH : **2026-09-24** — [새 서식 생성 시 Onrivi 기본서식 100% 완전체 정규화(normalizeCssProfile) 연동]: onAddProfile 호출 시 DEFAULT_PROFILE의 모든 7대 쇼케이스 태그 및 구조체를 100% 하이드레이션하여 누락 없는 완전체로 신규 서식 생성
 * 🚨 @PATCH : **2026-09-24** — [외부 서식 가져오기 표준 정규화(normalizeCssProfile) 연동]: ID 중복 방지 및 7대 쇼케이스·구조체 100% 자동 하이드레이션, 신규 서식 ID 반환 보장
 * 🚨 @PATCH : **2026-09-24** — [서식 관리 새 서식 추가 기본 이름 '새 서식 N' 표준화]: onAddProfile 생성 시 기본 이름을 '새 서식 N'으로 일원화
 * 🚨 @PATCH : **2026-09-24** — [서식 관리 모달 실제 편집 문서 연동]: CssStyleModal에 currentDocContent={content} 주입하여 현재 작성 중인 실제 원고로 서식 미리보기 지원
 * 🚨 @PATCH : **2026-09-23** — [에디터 글꼴 굵기 및 고대비 설정 모달 연동]: SettingsModal에 editorFontWeight, setEditorFontWeight, editorHighContrast, setEditorHighContrast props 전달 연동
 * 🚨 @PATCH : **2026-09-17** — [지식 문서 등록 실시간 진행 모달 연동]: KnowledgeIndexProgressModal 임포트 및 knowledge:open-index-progress 글로벌 이벤트 리스너 통합으로 문서 등록 4단계 및 AI 분석 실시간 시각화 지원
 * 🚨 @PATCH : **2026-09-06** — [미디어 삽입 후 2행 자동 추가 및 커서 이동] YoutubeModal·MapModal·ImageModal 삽입 시 insertMediaAtCursor 사용으로 교체: 삽입 후 빈 줄 2행 자동 추가 및 커서 마지막 빈 행 이동
 * 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 지식 허브를 모달 대신 독립 전용 페이지(/knowledge)로 분리하여 에디터 모달 난립 해소 및 Ctrl+Shift+K 단독 페이지 라우팅 적용
 * 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 12대 화면 통합 관리 센터 KnowledgeHubModal 연동 및 API Key / 모델명 양방향 동기화
 * 🚨 @PATCH : **2026-09-04** — [지식 문서 설정 상세 분석 모달 연동] KnowledgeDetailModal 임포트 및 knowledge:show-detail 글로벌 이벤트 리스너 통합
 * 🚨 @PATCH : **2026-09-03** — 표 모달(TableModal)에서 표 생성 시 에디터 첫 번째 칼럼('제목')으로 커서 및 선택 영역을 자동 안착시켜 즉시 타이핑할 수 있도록 개선
 * 🚨 @PATCH : **2026-07-06** — [시큐어코딩] 파일 및 폴더 생성 시 경로 탐색(Path Traversal) 공격 방지를 위해 생성명에서 슬래시(/) 및 백슬래시(\) 문자를 제거하는 정규식 필터 적용
 * -----------------------------------------------------------------------
 */
import { requireResourceSettings } from '@/lib/resourceSettings';
import React, {useEffect} from 'react';

// 각종 모달 컴포넌트 임포트
import SettingsModal from '@/components/SettingsModal';        // 환경설정 모달 컴포넌트
import ExportModal from '@/components/ExportModal';        // 내보내기 모달 컴포넌트
import PromptModal from '@/components/PromptModal';        // 프롬프트 모달 컴포넌트
import ConfirmModal from '@/components/ConfirmModal';        // 확인 모달 컴포넌트
import ImageModal from '@/components/ImageModal';        // 이미지 모달 컴포넌트
import MapModal from '@/components/MapModal';        // 지도 모달 컴포넌트
import TableModal from '@/components/TableModal';        // 표 모달 컴포넌트
import MergeModal from '@/components/MergeModal';        // 병합 모달 컴포넌트
import YoutubeModal from '@/components/YoutubeModal';        // 유튜브 모달 컴포넌트
import HelpModal from '@/components/HelpModal';        // 도움말 모달 컴포넌트
import LicenseModal from '@/components/LicenseModal';        // 라이선스 모달 컴포넌트
import FormulaModal from '@/components/FormulaModal';        // 수식 모달 컴포넌트
import CssStyleModal from '@/components/CssStyleModal';        // 서식 모달 컴포넌트
import ReferenceManagerModal from '@/components/ReferenceManagerModal'; // 참조 관리 모달 컴포넌트
import CitationSelectionModal from '@/components/CitationSelectionModal'; // 참조자 선택 모달 컴포넌트
import ResourceFolderGuideModal from '@/components/editor/modals/ResourceFolderGuideModal'; // 리소스 폴더 안내 모달
import { KnowledgeDetailModal } from '@/components/KnowledgeDetailModal';
import { KnowledgeIndexProgressModal, type KnowledgeIndexProgressParams } from '@/components/knowledge/KnowledgeIndexProgressModal';

import { useEditorModals } from '@/hooks/editor/useEditorModals';
import { BROWSER_STORAGE_NAME } from '@/constants/storage'; // 모달 관련 상태와 함수들을 hook으로 관리하는 hooks
import { insertMediaAtCursor } from '@/utils/editorActions'; // 미디어 삽입 후 2행 추가 및 커서 이동 유틸
import { normalizeCssProfile } from '@/constants/cssProfile'; // 서식 프로필 정규화 및 살균 엔진
import {
  getSavedDriveToken,
  getSavedWorkspaceInfo,
  createDriveMarkdownFile,
  createDriveFolder
} from '@/lib/gdrive/googleDriveClient';

/**
 * props들의 타입을 선언
 */
interface ModalManagerProps {
  modals: ReturnType<typeof useEditorModals>;
  deps: any; // MainEditorApp에서 넘어오는 수많은 상태와 함수들 (점진적 타입 구체화 예정)
}

/**
 * [Step 4 리팩토링]
 * MainEditorApp 하단에 흩어져 있던 모든 모달/플러그인을 모아서 렌더링하는 관제 센터
 * 차후 AI 설정 모달 등 새로운 플러그인 추가 시 이 컴포넌트만 수정하면 됨.
 */
export default function ModalManager({ modals, deps }: ModalManagerProps) {
  const citationTarget=React.useRef<{documentId?:string;model:any;selection:any}|null>(null);
  React.useEffect(()=>{
    if(modals.isCitationModalOpen) {
      citationTarget.current={documentId:deps.activeTabId,model:deps.editorRef.current?.getModel(),selection:deps.editorRef.current?.getSelection()};
    } else {
      if (citationTarget.current) {
        citationTarget.current=null;
        window.dispatchEvent(new Event('onrivi:cancel-citation'));
      }
    }
  },[modals.isCitationModalOpen, deps.activeTabId, deps.editorRef]);
  const {
    isSettingsModalOpen, setIsSettingsModalOpen,                         // 환경설정 모달 열림/닫힘 상태
    settingsModalInitialTab, setSettingsModalInitialTab,                 // 환경설정 모달 초기 탭 설정
    isStyleModalOpen, setIsStyleModalOpen,                                 // 서식 모달 열림/닫힘 상태
    isExportModalOpen, setIsExportModalOpen,                             // 내보내기 모달 열림/닫힘 상태
    isImageModalOpen, setIsImageModalOpen,                                 // 이미지 모달 열림/닫힘 상태
    editingImageInfo, setEditingImageInfo,                                 // 이미지 모달 편집 정보 상태
    isMergeModalOpen, setIsMergeModalOpen,                                   // 병합 모달 열림/닫힘 상태
    isYoutubeModalOpen, setIsYoutubeModalOpen,                             // 유튜브 모달 열림/닫힘 상태
    youtubeInitialUrl, setYoutubeInitialUrl,                             // 유튜브 모달 초기 URL 설정
    isLicenseModalOpen, setIsLicenseModalOpen,                             // 라이선스 모달 열림/닫힘 상태
    isFormulaModalOpen, setIsFormulaModalOpen,                             // 수식 모달 열림/닫힘 상태
    promptConfig, setPromptConfig,                                         // 프롬프트 모달 설정 상태
    confirmConfig, setConfirmConfig,                                         // 확인 모달 설정 상태
    isMapModalOpen, setIsMapModalOpen,                                     // 지도 모달 열림/닫힘 상태
    isTableModalOpen, setIsTableModalOpen,                                 // 표 모달 열림/닫힘 상태
    isHelpModalOpen, setIsHelpModalOpen,                                 // 도움말 모달 열림/닫힘 상태
    isReferenceModalOpen, setIsReferenceModalOpen,                          // 참조 관리 모달 열림/닫힘 상태
    isCitationModalOpen, setIsCitationModalOpen                             // 참조자 선택 모달 열림/닫힘 상태
  } = modals;

  // deps에서 필요한 속성들 추출
  const activeProfile = deps.profiles?.find((p: any) => p.id === deps.activeProfileId) || deps.profiles?.[0] || deps.DEFAULT_PROFILE;

  const {
    isDarkMode, setIsDarkMode, fontSize, setFontSize, wordWrap, setWordWrap,   // 다크모드, 글자크기, 단어줄바꿈
    autoSave, setAutoSave, rootFolder, rootFolderRef, selectRootFolder, driveLetter, setDriveLetter,    // 자동저장, 루트폴더, 루트폴더참조, 루트폴더선택, 드라이브문자
    workspaceType, setWorkspaceType, previewMode, setPreviewMode, customHotkeys, setCustomHotkeys,       // 워크스페이스타입, 미리보기모드, 사용자지정단축키, 사용자지정단축키설정
    customSlashCommands, setCustomSlashCommands, licenseKey, setLicenseKey, themePalette, handleThemeChange,   // 사용자지정슬래시명령어, 사용자지정슬래시명령어설정, 라이선스키, 라이선스키설정, 테마팔레트, 테마변경
    geminiApiKey, setGeminiApiKey, aiModelName, setAiModelName,                                       // geminiAPI키, geminiAPI키설정, ai모델이름, ai모델이름설정
    isActivated, licenseStatus, deviceId, handleSuccessActivation, handlers, content, currentFileNodeRef,  // 활성화여부, 라이선스상태, 디바이스ID, 성공적인활성화처리, 핸들러, 콘텐츠, 현재파일노드참조
    setCurrentFileName, setCurrentFileNode, lastSavedContentRef, setSaveStatus, refreshFileList,       // 현재파일이름설정, 현재파일노드설정, 마지막저장콘텐츠참조, 저장상태설정, 파일목록갱신
    showToast, editorRef, insertAtCursor, lastSelectionRef, setIsMergeMode, selectedMergeNodes, setSelectedMergeNodes,   // 토스트보이기, 에디터참조, 커서에삽입, 마지막선택참조, 병합모드설정, 선택된병합노드, 선택된병합노드설정
    handleFileClick, profiles, activeProfileId, dynamicCssString, setActiveProfileId, setProfiles,   // 파일클릭핸들러, 프로필, 활성프로필ID, 동적CSS문자열, 활성프로필ID설정, 프로필설정
    isSystemProfileId, getApiUrl, DEFAULT_PROFILE, SYSTEM_PROFILES, vfsCreateFile, vfsWriteFile, vfsCreateFolder,   // 시스템프로파일ID, API URL 얻기, 기본프로파일, 시스템프로파일, 가상파일시스템생성파일, 가상파일시스템쓰기파일, 가상파일시스템생성폴더
    helpTitle, helpContent, setHelpContent,                                                                  // 도움말제목, 도움말콘텐츠, 도움말콘텐츠설정
    resourceFolder, resourceFolderRef, selectResourceFolder,
    updateContent
  } = deps;
  useEffect(()=>{
    const open=()=>setIsExportModalOpen(true);
    window.addEventListener('onrivi:open-print',open);
    return()=>window.removeEventListener('onrivi:open-print',open);
  },[setIsExportModalOpen]);

  const [knowledgeDetailData, setKnowledgeDetailData] = React.useState<any | null>(null);
  const [indexProgressParams, setIndexProgressParams] = React.useState<KnowledgeIndexProgressParams | null>(null);
  React.useEffect(() => {
    const handleShowDetail = (e: any) => {
      if (e.detail) {
        setKnowledgeDetailData(e.detail);
      }
    };

    const handleOpenIndexProgress = (e: any) => {
      if (e.detail) {
        setIndexProgressParams(e.detail);
      }
    };

    window.addEventListener('knowledge:show-detail', handleShowDetail);
    window.addEventListener('knowledge:open-index-progress', handleOpenIndexProgress);

    return () => {
      window.removeEventListener('knowledge:show-detail', handleShowDetail);
      window.removeEventListener('knowledge:open-index-progress', handleOpenIndexProgress);
    };
  }, []);

  return (
    <>
      {/* 환경설정 모달 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsModalInitialTab}
        isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
        fontSize={fontSize} setFontSize={setFontSize}
        editorTabSize={deps.editorTabSize} setEditorTabSize={deps.setEditorTabSize}
        spellCheck={deps.spellCheck} setSpellCheck={deps.setSpellCheck}
        wordWrap={wordWrap} setWordWrap={setWordWrap}
        autoSave={autoSave} setAutoSave={setAutoSave}
        rootFolder={rootFolder} onSelectRootFolder={selectRootFolder}
        driveLetter={driveLetter} setDriveLetter={setDriveLetter}
        workspaceType={workspaceType} setWorkspaceType={setWorkspaceType}
        cloudProvider={null}
        previewMode={previewMode} setPreviewMode={setPreviewMode}
        customHotkeys={customHotkeys} setCustomHotkeys={setCustomHotkeys}
        customSlashCommands={customSlashCommands} setCustomSlashCommands={setCustomSlashCommands}
        licenseKey={licenseKey} setLicenseKey={setLicenseKey}
        themePalette={themePalette}
        onThemeChange={handleThemeChange}
        isActivated={isActivated}
        isExpired={licenseStatus?.isExpired || false}
        autoClosingBrackets={deps.autoClosingBrackets}
        setAutoClosingBrackets={deps.setAutoClosingBrackets}
        editorFontWeight={deps.editorFontWeight}
        setEditorFontWeight={deps.setEditorFontWeight}
        editorHighContrast={deps.editorHighContrast}
        setEditorHighContrast={deps.setEditorHighContrast}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        aiModelName={aiModelName}
        setAiModelName={setAiModelName}
        resourceFolder={resourceFolder || (deps.resourceFolderHandle ? deps.resourceFolderHandle.name : null)} 
        onSelectResourceFolder={selectResourceFolder}
        onClearResourceFolder={deps.clearResourceFolder}
        userNickname={deps.userNickname}
        setUserNickname={deps.setUserNickname}
        userId={licenseStatus?.userId}
      />

      {/* 🌟 전체사용자 공통 리소스 폴더 미지정 시 초기 설정 안내 모달 */}
      <ResourceFolderGuideModal
        isOpen={(modals as any).isResourceGuideModalOpen || false}
        onClose={() => (modals as any).setIsResourceGuideModalOpen?.(false)}
        onSelectFolder={selectResourceFolder}
        onOpenSettings={() => {
          setSettingsModalInitialTab?.('editor');
          setIsSettingsModalOpen(true);
        }}
        isDarkMode={isDarkMode}
      />

      <ExportModal
        isPicturebook={profiles.find((profile:any) => profile.id === activeProfileId)?.layout?.type === 'picturebook'}
        isSnsCardProfile={Boolean(activeProfile?.pageStyle?.paperSize?.startsWith('sns_') || activeProfile?.id === 'sns-card-news')}
        defaultSnsRatio={activeProfile?.pageStyle?.paperSize === 'sns_portrait' ? '4:5' : '1:1'}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        isDarkMode={isDarkMode}
        documentId={deps.activeTabId} documentContent={content}
        onPrintSettingsChange={handlers.setPrintSettings}
        onPaginationSettingsChange={handlers.setPaginationSettings}
        onOpenWatermarkSettings={()=>{setIsExportModalOpen(false);modals.setSettingsModalInitialTab?.('editor');modals.setIsSettingsModalOpen(true);}}
        onPagePreview={(settings:any,signal:AbortSignal,pagination:any)=>handlers.print(true,settings,signal,pagination)}
        onExport={(format: any, exportSettings?: any, pagination?:any) => {
          if (!isActivated) {
            showToast("정품 라이선스 키 등록이 필요합니다. (설정 -> 애플리케이션 탭에서 등록)", 'error');
            return;
          }
          setIsExportModalOpen(false);
          if (format === 'print') handlers.print(false, exportSettings,undefined,pagination);
          else if (format === 'docx') handlers.exportDOCX();
          else if (format === 'hwpx') handlers.exportHWPX();
          else if (format === 'html') handlers.exportHTML();
          else if (format === 'png') handlers.exportPNG();
          else if (format === 'epub') handlers.exportEPUB();
          else if (format === 'sns') handlers.exportSNS?.(exportSettings);
        }}
      />
      {promptConfig.isOpen && (
        <PromptModal
          isOpen={promptConfig.isOpen}
          title={promptConfig.title}
          defaultValue={promptConfig.defaultValue}
          error={promptConfig.error}
          onConfirm={async (value: string) => {
            if (!value.trim()) {
              setPromptConfig((prev: any) => ({ ...prev, error: '이름을 입력해주세요.' }));
              return;
            }
            try {
              if (promptConfig.type === 'createFile') {
                // [시큐어코딩] 경로 탐색(Path Traversal) 공격 방지: 파일명에서 슬래시, 백슬래시 제거
                const safeValue = value.replace(/[\/\\]/g, '');
                const finalName = safeValue.endsWith('.md') ? safeValue : `${safeValue}.md`;

                // ☁️ [Google Drive 작업장 시 구글 드라이브 파일 생성]
                if (rootFolder?.type === 'GDRIVE') {
                  const token = getSavedDriveToken();
                  const wsInfo = getSavedWorkspaceInfo();
                  const targetFolderId = rootFolder?.id || rootFolder?.driveFolderId || wsInfo?.workspaceFolderId;
                  if (token && targetFolderId) {
                    const newDoc = await createDriveMarkdownFile(token, targetFolderId, finalName, content ?? '');
                    setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                    await refreshFileList();
                    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    const newFileNode = { name: finalName, kind: 'file' as const, path: `${rootFolder?.path || 'GoogleDrive'}/${finalName}`, driveId: newDoc.id, driveFileId: newDoc.id, id: newDoc.id };
                    setCurrentFileName(finalName);
                    setCurrentFileNode(newFileNode);
                    lastSavedContentRef.current = content;
                    setSaveStatus('saved');
                    if (handlers && handlers.setTabs) {
                      handlers.setTabs((prev: any[]) => prev.map(t => t.id === finalName || t.path === finalName ? { ...t, isModified: false } : t));
                    }
                    showToast(`${finalName} 구글 드라이브 생성 및 저장 완료`, 'success');
                    return;
                  }
                }

                const api = (window as any).electronAPI;
                if (api && rootFolder?.name && rootFolder.name !== BROWSER_STORAGE_NAME) {
                  const fullPath = rootFolder.name + '\\' + finalName;
                  const success = await api.saveFile(fullPath, content);
                  if (success) {
                    setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                    setCurrentFileName(finalName);
                    setCurrentFileNode({ name: finalName, kind: 'file', path: fullPath });
                    lastSavedContentRef.current = content;
                    setSaveStatus('saved');
                      if (handlers && handlers.setTabs) {
                        handlers.setTabs((prev: any[]) => prev.map(t => t.id === finalName || t.path === finalName ? { ...t, isModified: false } : t));
                      }
                    await refreshFileList();
                    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    showToast(`${finalName} 저장 완료`, 'success');
                  } else {
                    showToast("저장 실패", 'error');
                  }
                } else if (workspaceType === 'browser') {
                  if (rootFolder?.handle) {
                    const handle = await rootFolder.handle.getFileHandle(finalName, { create: true });
                    const writable = await handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                    setCurrentFileName(finalName);
                    setCurrentFileNode({ name: finalName, kind: 'file', handle });
                    lastSavedContentRef.current = content;
                    setSaveStatus('saved');
                      if (handlers && handlers.setTabs) {
                        handlers.setTabs((prev: any[]) => prev.map(t => t.id === finalName || t.path === finalName ? { ...t, isModified: false } : t));
                      }
                    await refreshFileList();
                    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    showToast(`${finalName} 저장 완료`, 'success');
                  } else {
                    vfsCreateFile('', finalName);
                    vfsWriteFile(finalName, content);
                    setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                    setCurrentFileName(finalName);
                    setCurrentFileNode({ name: finalName, kind: 'file', path: finalName });
                    lastSavedContentRef.current = content;
                    setSaveStatus('saved');
                      if (handlers && handlers.setTabs) {
                        handlers.setTabs((prev: any[]) => prev.map(t => t.id === finalName || t.path === finalName ? { ...t, isModified: false } : t));
                      }
                    await refreshFileList();
                    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    showToast(`${finalName} 저장 완료`, 'success');
                  }
                } else {
                  // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 생성 수행
                  vfsCreateFile('', finalName);
                  if (content) vfsWriteFile(finalName, content);
                  setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                  await refreshFileList();
                  window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                  const newFileNode = { name: finalName, kind: 'file' as const, path: finalName };
                  setCurrentFileName(finalName);
                  setCurrentFileNode(newFileNode);
                  lastSavedContentRef.current = content;
                  setSaveStatus('saved');
                  if (handlers && handlers.setTabs) {
                    handlers.setTabs((prev: any[]) => prev.map(t => t.id === finalName || t.path === finalName ? { ...t, isModified: false } : t));
                  }
                  showToast(`${finalName} 생성 및 저장 완료`, 'success');
                }
              } else if (promptConfig.type === 'createFolder') {
                // [시큐어코딩] 경로 탐색(Path Traversal) 공격 방지: 폴더명에서 슬래시, 백슬래시 제거
                const safeValue = value.replace(/[\/\\]/g, '');

                // ☁️ [Google Drive 작업장 시 구글 드라이브 폴더 생성]
                if (rootFolder?.type === 'GDRIVE') {
                  const token = getSavedDriveToken();
                  const wsInfo = getSavedWorkspaceInfo();
                  const targetFolderId = rootFolder?.id || rootFolder?.driveFolderId || wsInfo?.workspaceFolderId;
                  if (token && targetFolderId) {
                    await createDriveFolder(token, safeValue, targetFolderId);
                    setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                    await refreshFileList();
                    window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                    showToast(`${safeValue} 구글 드라이브 폴더 생성 완료`, 'success');
                    return;
                  }
                }

                if (workspaceType === 'browser') {
                  if (rootFolder?.handle) {
                    await rootFolder.handle.getDirectoryHandle(safeValue, { create: true });
                  } else {
                    vfsCreateFolder('', safeValue);
                  }
                } else {
                  const api = (window as any).electronAPI;
                  if (api?.createFolder) {
                    await api.createFolder('', safeValue);
                  } else {
                    // 🛡️ [웹 SaaS 백엔드 미구현 404 원천 차단]: electronAPI가 없는 웹 브라우저 환경에서는 VFS 폴더 생성 수행
                    vfsCreateFolder('', safeValue);
                  }
                }
                setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
                await refreshFileList();
                window.dispatchEvent(new CustomEvent('file:refresh-all-directories'));
                showToast(`${value} 폴더 생성 완료`, 'success');
              } else {
                setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }));
              }
            } catch (e: any) {
              showToast('작업 실패: ' + e.message, 'error');
            }
          }}
          onCancel={() => setPromptConfig((prev: any) => ({ ...prev, isOpen: false, error: '' }))}
        />
      )}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        isDanger={confirmConfig.isDanger}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => {
          if (confirmConfig.onCancel) confirmConfig.onCancel();
          setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
        }}
      />
      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        onInsert={(formula: string) => insertAtCursor(formula)}
        isDarkMode={isDarkMode}
        initialLatex={deps.formulaModalInitialLatex}
      />
      <MergeModal
        isOpen={isMergeModalOpen}
        onClose={() => { setIsMergeModalOpen(false); setIsMergeMode(false); setSelectedMergeNodes([]); }}
        selectedNodes={selectedMergeNodes}
        rootFolder={rootFolder}
        workspaceType={workspaceType}
        refreshParent={refreshFileList}
        openFile={handleFileClick}
      />
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        deviceId={deviceId}
        licenseStatus={licenseStatus}
        onSuccessActivation={handleSuccessActivation}
        isDarkMode={isDarkMode}
      />
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setEditingImageInfo(null);
        }}
        initialData={editingImageInfo}
        captionConfig={resolveCaptionConfig(activeProfile?.mediaCaptionStructure, 'image')}
        nextNumber={nextReportNumber(content, '그림')}
        targetFolder={(() => {
          const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
          if (api) {
            // 데스크탑: resourceFolderRef.current를 최우선 사용 (state보다 항상 최신)
            const rf = resourceFolderRef?.current ?? resourceFolder;
            if (rf) {
              const sep = rf.includes('\\') ? '\\' : '/';
              return rf + sep + 'media';
            }
            // resourceFolder 없으면 현재 파일 경로 기준 폴더 사용
            if (currentFileNodeRef?.current?.path) {
              const filePath = currentFileNodeRef.current.path;
              const lastSlash = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
              if (lastSlash !== -1) return filePath.substring(0, lastSlash);
            }
            return '';
          }
        // 웹 환경: resourceFolderHandle이 있으면 빈 문자열 (핸들로 처리), 없으면 rootFolder
        if (deps.resourceFolderHandle) return '';
        if (rootFolderRef?.current?.name && rootFolderRef.current.name !== BROWSER_STORAGE_NAME) {
          return rootFolderRef.current.name;
        }
        return '';
      })()}
      resourceFolder={resourceFolder}
      resourceFolderHandle={deps.resourceFolderHandle}
      workspaceType={deps.workspaceType}
      rootFolder={deps.rootFolder}
      showToast={showToast}
      onInsert={(path: string, alt: string, range: any, fullMarkdown?: string) => {
        const textToInsert = fullMarkdown || `![${alt}](${path})`;
        if (range?.documentMedia) {
          deps.replaceDocumentMedia?.(range,path,alt);
        } else if (range?.visualImage) {
          deps.replaceVisualImage?.(range,path,alt,fullMarkdown);
        } else if (range?.bookSceneIndex !== undefined) {
          deps.replacePicturebookImage?.(range,path,alt);
        } else if (range) {
          // 기존 이미지 편집: range 위치의 텍스트만 교체 (빈 줄 추가 없음)
          const editor = editorRef.current;
          if (editor) {
            editor.executeEdits("edit-image", [{
              range: range,
              text: textToInsert,
              forceMoveMarkers: true
            }]);
            editor.focus();
          }
        } else {
          // 새 이미지 삽입: 빈 줄 2행 추가 및 커서 이동
          insertMediaAtCursor(editorRef, lastSelectionRef, textToInsert, updateContent);
        }
        setEditingImageInfo(null);
      }}
      isDarkMode={isDarkMode}
    />
    <YoutubeModal
      isOpen={isYoutubeModalOpen}
      onClose={() => { setIsYoutubeModalOpen(false); setYoutubeInitialUrl(null); deps.clearMediaDialog?.(); }}
      captionConfig={resolveCaptionConfig(activeProfile?.mediaCaptionStructure, 'video')}
      nextNumber={nextReportNumber(content, '영상')}
      onInsert={(code: string) => {
        if (deps.mediaDialogSource?.kind === 'video') deps.insertVisualMedia?.('video',code);
        else insertMediaAtCursor(editorRef, lastSelectionRef, code, updateContent);
      }}
      initialSource={deps.mediaDialogSource?.kind === 'video' ? deps.mediaDialogSource.source : undefined}
      isDarkMode={isDarkMode}
      initialUrl={youtubeInitialUrl || undefined}
      targetFolder={resourceFolder ? resourceFolder + (resourceFolder.includes('\\') ? '\\media' : '/media') : (rootFolder?.name || '')}
      resourceFolder={resourceFolder}
      resourceFolderHandle={deps.resourceFolderHandle}
      workspaceType={deps.workspaceType}
      rootFolder={deps.rootFolder}
    />
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => {setIsMapModalOpen(false);deps.clearMediaDialog?.();}}
        captionConfig={resolveCaptionConfig(activeProfile?.mediaCaptionStructure, 'map')}
        nextNumber={nextReportNumber(content, '지도')}
        initialSource={deps.mediaDialogSource?.kind === 'map' ? deps.mediaDialogSource.source : undefined}
        onInsert={(code: string) => {
          if (deps.mediaDialogSource?.kind === 'map') deps.insertVisualMedia?.('map',code);
          else insertMediaAtCursor(editorRef, lastSelectionRef, code, updateContent);
        }}
        isDarkMode={isDarkMode}
      />
      <TableModal
        captionConfig={resolveCaptionConfig(activeProfile?.mediaCaptionStructure, 'table')}
        nextNumber={nextReportNumber(content, '표')}
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsert={(code: string) => {
          if (editorRef?.current) {
            const editor = editorRef.current;
            const model = editor.getModel();
            if (!model) {
              insertAtCursor(code);
              return;
            }

            let selection = editor.getSelection();
            if (!selection || (selection.isEmpty() && lastSelectionRef?.current && !lastSelectionRef.current.isEmpty())) {
              selection = lastSelectionRef.current;
            }
            if (!selection) {
              const pos = editor.getPosition?.() || { lineNumber: 1, column: 1 };
              selection = {
                startLineNumber: pos.lineNumber,
                startColumn: pos.column,
                endLineNumber: pos.lineNumber,
                endColumn: pos.column
              };
            }

            const currentLineContent = model.getLineContent(selection.startLineNumber);
            let formattedCode = code;
            // 만약 현재 커서 행이 완전히 빈 행이라면, code 시작 부분의 불필요한 빈 줄(\n)을 제거하여 해당 행부터 표 즉시 배치
            if (currentLineContent.trim() === '' && formattedCode.startsWith('\n')) {
              formattedCode = formattedCode.replace(/^\n/, '');
            }
            if (!formattedCode.endsWith('\n\n')) {
              formattedCode = formattedCode.replace(/\n*$/, '\n\n');
            }

            const monaco = (window as any).monaco;
            const range = monaco?.Range
              ? new monaco.Range(
                  selection.startLineNumber,
                  selection.startColumn,
                  selection.endLineNumber,
                  selection.endColumn
                )
              : selection;

            editor.pushUndoStop();
            editor.executeEdits("insertTable", [{ range, text: formattedCode, forceMoveMarkers: true }]);
            editor.pushUndoStop();

            // ─── 표 헤더 라인 동적 탐색 (삽입된 라인 기준 첫 번째 '|' 행) ───
            let targetHeaderLine = selection.startLineNumber;
            const totalLines = model.getLineCount();
            for (let l = selection.startLineNumber; l <= Math.min(selection.startLineNumber + 3, totalLines); l++) {
              const lineContent = model.getLineContent(l).trim();
              if (lineContent.startsWith('|')) {
                targetHeaderLine = l;
                break;
              }
            }

            // ─── 첫 번째 열의 헤더 텍스트("제목") 컬럼 범위 동적 계산 ───
            const headerLineContent = model.getLineContent(targetHeaderLine);
            let startCol = 3;
            let endCol = 5;
            const firstPipe = headerLineContent.indexOf('|');
            if (firstPipe !== -1) {
              const secondPipe = headerLineContent.indexOf('|', firstPipe + 1);
              if (secondPipe !== -1) {
                const cellRaw = headerLineContent.substring(firstPipe + 1, secondPipe);
                const leadingSpaces = cellRaw.length - cellRaw.trimStart().length;
                const cellTrimmed = cellRaw.trim();
                if (cellTrimmed.length > 0) {
                  startCol = (firstPipe + 1) + leadingSpaces + 1; // Monaco 1-based column
                  endCol = startCol + cellTrimmed.length;
                }
              }
            }

            const applyTargetSelection = () => {
              if (!editorRef?.current) return;
              const ed = editorRef.current;
              const m = ed.getModel();
              if (!m) return;

              ed.focus();
              const targetSelection = monaco?.Selection
                ? new monaco.Selection(targetHeaderLine, startCol, targetHeaderLine, endCol)
                : {
                    selectionStartLineNumber: targetHeaderLine,
                    selectionStartColumn: startCol,
                    positionLineNumber: targetHeaderLine,
                    positionColumn: endCol
                  };

              ed.setSelection(targetSelection);
              if (lastSelectionRef) {
                lastSelectionRef.current = targetSelection;
              }
              ed.revealLineInCenterIfOutsideViewport(targetHeaderLine);
            };

            // 🛡️ 모달 언마운트 및 브라우저 포커스 복원 이벤트에 덮어써지지 않도록 다단계(0ms, 40ms, 120ms, 250ms)로 확실하게 안착
            applyTargetSelection();
            setTimeout(applyTargetSelection, 40);
            setTimeout(applyTargetSelection, 120);
            setTimeout(applyTargetSelection, 250);

            try {
              if (typeof model.forceTokenization === 'function') {
                const lineCount = formattedCode.split('\n').length;
                for (let i = selection.startLineNumber; i <= targetHeaderLine + lineCount + 1; i++) {
                  model.forceTokenization(i);
                }
              }
              editor.layout();
            } catch (_) {}

            if (typeof updateContent === 'function') {
              updateContent(model.getValue(), true);
            }
            return;
          }
          insertAtCursor(code);
        }}
        isDarkMode={isDarkMode}
      />
      <CssStyleModal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        dynamicCssString={dynamicCssString}
        geminiApiKey={geminiApiKey}
        aiModelName={aiModelName}
        currentDocContent={content}
        onSelectProfile={setActiveProfileId}
        onUpdateProfile={(updated: any) => {
          try {requireResourceSettings();}catch(error:any){showToast(error.message,'warning');return;}
          if (isSystemProfileId(updated.id) || updated.id === 'default') return;
          setProfiles((prev: any) =>
          isSystemProfileId(updated.id) || updated.id === 'default'
            ? prev
            : prev.map((p: any) => p.id === updated.id && !isSystemProfileId(p.id) ? updated : p)
        );
          // 현재 서식의 변경값을 문서에도 기록하여 모달을 닫은 뒤 이전 스냅샷으로 돌아가지 않게 한다.
          if (updated.id === activeProfileId) setActiveProfileId(updated.id, updated);
        }}
        onAddProfile={() => {
          try {requireResourceSettings();}catch(error:any){showToast(error.message,'warning');return;}
          const newId = 'profile-' + Date.now();
          const count = profiles.filter((p: any) => !isSystemProfileId(p.id)).length + 1;
          const created = normalizeCssProfile({
            ...DEFAULT_PROFILE,
            id: newId,
            name: `새 서식 ${count}`,
          }, profiles);
          setProfiles((prev: any) => [...prev, created]);
          setActiveProfileId(newId);
        }}
        onDeleteProfile={(id: string) => {
          if (isSystemProfileId(id)) return;
          setProfiles((prev: any) => prev.filter((p: any) => p.id !== id));
          if (activeProfileId === id) {
            setActiveProfileId(SYSTEM_PROFILES[0].id);
          }
        }}
        onImportProfile={(imported: any) => {
          try {requireResourceSettings();}catch(error:any){showToast(error.message,'warning');return;}
          // 💡 [OMD-PATCH] 표준 정규화 엔진을 통해 ID 중복 방지, 7대 쇼케이스 태그 하이드레이션, 살균, 2-Depth 딥머지 일괄 수행
          const merged = normalizeCssProfile(imported, profiles);
          setProfiles((prev: any) => [...prev, merged]);
          setActiveProfileId(merged.id);
          showToast(`서식 '${merged.name}'이(가) 추가되었습니다.`, 'success');
          return merged.id;
        }}
        isDarkMode={isDarkMode}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => { setIsHelpModalOpen(false); setHelpContent(''); }}
        title={helpTitle}
        content={helpContent}
        isDarkMode={isDarkMode}
      />

      {/* 참조 관리(BibTeX) 모달 */}
      <ReferenceManagerModal
        currentDocument={deps.content || ''}
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        isDarkMode={isDarkMode}
        resourceFolderHandle={deps.resourceFolderHandle}
        workspaceType={workspaceType}
        rootFolder={rootFolder}
        resourceFolder={resourceFolder}
      />
      <CitationSelectionModal
        isOpen={isCitationModalOpen}
        onClose={() => {window.dispatchEvent(new Event('onrivi:cancel-citation'));setIsCitationModalOpen(false);}}
        isDarkMode={isDarkMode}
        bibContent={deps.bibContent || ''}
        resourceFolderHandle={deps.resourceFolderHandle}
        workspaceType={workspaceType}
        rootFolder={rootFolder}
        resourceFolder={resourceFolder}
        onSelect={(citekey) => {
          if(citationTarget.current?.documentId!==deps.activeTabId){deps.showToast('문서가 변경되었습니다. 인용을 다시 선택해 주세요.','warning');return;}
          const event=new CustomEvent('onrivi:insert-citation',{cancelable:true,detail:{key:citekey}});
          window.dispatchEvent(event);if(event.defaultPrevented)return;
          if (deps.editorRef.current) {
            const editor = deps.editorRef.current;
            if(editor.getModel()!==citationTarget.current?.model){deps.showToast('문서가 변경되었습니다. 인용을 다시 선택해 주세요.','warning');return;}
            const position = editor.getPosition();
            if (position) {
              editor.executeEdits('citation', [{
                range: citationTarget.current?.selection || new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: `[@${citekey}]`,
                forceMoveMarkers: true
              }]);
              editor.focus();
            }
          }
        }}
      />

      {/* 🧠 지식 문서 설정 상세 분석 모달 */}
      <KnowledgeDetailModal
        isOpen={Boolean(knowledgeDetailData)}
        onClose={() => setKnowledgeDetailData(null)}
        detail={knowledgeDetailData}
        onOpenKnowledgeManager={() => {
          setKnowledgeDetailData(null);
          window.dispatchEvent(new CustomEvent('app:open-knowledge-manager'));
        }}
        showToast={deps.showToast}
      />

      {/* 🚀 AI 지식 문서 등록 및 실시간 진행 모달 */}
      <KnowledgeIndexProgressModal
        isOpen={Boolean(indexProgressParams)}
        onClose={() => setIndexProgressParams(null)}
        params={indexProgressParams}
        showToast={deps.showToast}
      />
    </>
  );
}
