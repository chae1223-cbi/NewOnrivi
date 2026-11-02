// ====================================================================
// 📊 [OMD-HOOK-useEditorModals-0001] useEditorModals.ts ➔ 에디터 모달 상태 관리 훅
// 🚨 @PATCH : **2026-10-24** — [editingImageInfo에 captionPos(top|bottom) 속성 추가]:
//             1) 이미지 수정 모달 열림 시 기존 URL에 인코딩된 캡션 위치를 모달 UI에 정확히 복원하도록 타입 확장
// ====================================================================
import { useState } from 'react';

export interface PromptConfig {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  type: 'createFile' | 'createFolder' | 'rename' | null;
  error: string;
}

export interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * [Step 2 리팩토링 완료]
 * MainEditorApp에 산재해 있던 모든 모달 및 팝업의 열림/닫힘 상태를 한 곳에서 중앙 관리하는 훅
 */
export const useEditorModals = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);   // 환경설정 모달 열림/닫힘 상태
  const [settingsModalInitialTab, setSettingsModalInitialTab] = useState<'editor' | 'app' | 'shortcuts'>('editor');   // 환경설정 모달 초기 탭 설정
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);   // 서식 모달 열림/닫힘 상태
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);   // 내보내기 모달 열림/닫힘 상태

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);   // 이미지 모달 열림/닫힘 상태
  const [editingImageInfo, setEditingImageInfo] = useState<{   // 이미지 모달 편집 정보 상태
    range: any;
    alt: string;
    path: string;
    width: string;
    height: string;
    align: string;
    captionPos?: 'top' | 'bottom';
  } | null>(null);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);   // 지도 모달 열림/닫힘 상태
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);   // 표 모달 열림/닫힘 상태
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);   // 병합 모달 열림/닫힘 상태

  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);   // 유튜브 모달 열림/닫힘 상태
  const [youtubeInitialUrl, setYoutubeInitialUrl] = useState<string | null>(null);   // 유튜브 모달 초기 URL 설정

  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);   // 라이선스 모달 열림/닫힘 상태
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);   // 수식 모달 열림/닫힘 상태
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);   // 도움말 모달 열림/닫힘 상태
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false); // 참조 관리 모달 열림/닫힘 상태
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false); // 인용구 선택 모달 열림/닫힘 상태

  const [promptConfig, setPromptConfig] = useState<PromptConfig>({      // 프롬프트 모달 설정 상태
    isOpen: false, title: "", defaultValue: "", type: null, error: ""
  });

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({   // 확인 모달 설정 상태
    isOpen: false, title: "", message: "", onConfirm: () => { }
  });

  return {
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
  };
};
