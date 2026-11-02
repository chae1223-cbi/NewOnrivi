// ====================================================================
// 📊 [OMD-EDIT-SettingsModal-0006 ✅ FIXED] SettingsModal.tsx ➔ SettingsModal
// 🚨 @PATCH : **2026-10-28** — [환경설정 내 'AI 및 MCP 연동' 독립 탭 신설 및 외부 AI(Gemini, Claude) 원클릭 연동 탑재]:
//             1) activeTab에 'ai' 추가 및 좌측 내비게이션 바에 'AI 및 MCP 연동' 독립 탭 신설
//             2) 일반 설정에서 복잡하게 섞여 있던 AI 설정을 분리하고, 외부 AI 도구(Gemini, Claude Desktop)를 위한 원클릭 MCP 연동 UI 탑재
//             3) MCP 연동 시 외부 AI 자체 구독을 활용하므로 온리비 어서에 별도의 API 키 등록이 필요 없음을 명확히 안내
// 🚨 @PATCH : **2026-10-26** — [단축코드/단축키 정의서 리소스 폴더(settings/shortcodes.json) 원자적 자동 동기화 연동]:
//             1) 단축키 및 슬래시 명령어 변경/초기화 시 writeResourceShortcodes를 호출하여 리소스 폴더에 즉시 영구 저장
// 🚨 @PATCH : **2026-10-21** — [환경설정 오픈 시 현재 연결된 리소스 폴더 기반 AI 설정정보 즉시 강제 세팅]:
//             1) 모달 열림 즉시 loadResourceAICredentials 실행으로 리소스 폴더의 최신 키/모델을 화면에 즉각 동기화
// 🚨 @PATCH : **2026-10-21** — [리소스 폴더 변경 시 환경설정 모달 내부 AI 환경정보 실시간 자동 갱신]:
//             1) resourceFolder prop 변경 감지 즉시 loadResourceAICredentials를 실행하여 해당 폴더의 API 키와 모델을 즉각 반영
// 🚨 @PATCH : **2026-10-21** — [다중 AI 제공사 리소스 폴더 연동 보호]: Gemini 키 부재로 타 제공사 키가 삭제되던 결함 차단
// 🚨 @PATCH : **2026-10-20** — [ESLint react-hooks/exhaustive-deps 경고 해소]: 워터마크 리소스 갱신 effect cleanup 시 watermarkGeneration ref를 로컬 변수로 캡처하여 참조 안정성 확보
// 🚨 @PATCH : **2026-10-20** — [다중 AI(OpenAI, Claude, Google) 연동 보존 및 저장 토스트 안내 개선]: 다중 AI 중 하나라도 활성화 시 AI 연결 정상 유지로 인식하여 오안내 방어
// 🚨 @PATCH : **2026-10-19** — [환경설정 일반설정에 기본 워터마크(위치/문구/이미지/진하기/회전/너비/첫페이지제외) 설정 UI 신설]: PDF 및 EPUB 내보내기 시 적용할 기본 워터마크 조판 컨트롤 및 실시간 스토리지 동기화 구현
// 🚨 @PATCH : **2026-09-25** — [에디터 글꼴 크기(Font Size) 조절 UI 신설 및 가독성 개선]: 13px~22px 단계별 폰트 크기 선택 셀렉트박스를 신설하여 작은 글씨로 인한 눈 피로 완전 해소
// 🚨 @PATCH : **2026-09-25** — [에디터 글꼴 굵기 SemiBold(600) 옵션 추가]: 500(Medium)과 700(Bold) 사이 '더 선명하게 (600 - SemiBold)' 옵션을 신설하여 D2Coding 및 고해상도 모니터 가독성 선택지 극대화
// 🚨 @PATCH : **2026-09-23** — [에디터 글꼴 굵기(Font Weight) 및 고대비 텍스트(High Contrast) 설정 UI 탑재]: 난반사 및 어두운 환경에서 텍스트 흐림 방지를 위한 획 굵기(보통/선명하게/굵게) 조절 선택 및 고대비 모드 토글 연동
// 🚨 @PATCH : **2026-09-17** — [AI 모델 직접 입력 필드 전면 제거 및 공인 리스트박스 선택 강제]: 사용자 요구 반영에 따라 모델명 직접 입력란 및 Custom 옵션을 완전히 제거하고 오직 공인 모델 목록 리스트박스에서만 선택되도록 단일화하여 오입력 및 키 뒤바뀜 결함 원천 차단
// 🚨 @PATCH : **2026-09-17** — [AES 암호화 키/모델명 평문 누출 원천 차단 및 양방향 자동 복호화 연동]: 스토리지 내 U2FsdGVkX1... 암호문 유입 시 loadSecureData를 통한 즉시 복호화 보장, aiModelName 불필요한 암호화 제거 및 기본 플래그십 자동 무해 전환
// 🚨 @PATCH : **2026-09-17** — [환경설정 Gemini API 키 및 모델 암호화 보존 강화]: saveSecureData 연동으로 API 키 및 AI 모델명 다중 백업 보존 및 삭제 시 안전 동기화
// 🚨 @PATCH : **2026-09-12** — [Google AI Studio 공식 모델 한정 및 Gemini 3.1 이하 전면 제거, 동적 모델 탐색 연동]:
//             1) Gemini 3.1 이하 버전(gemini-3.1-flash-lite, 2.5, 2.0, 1.5) 및 구형 Gemma 완전 제거
//             2) Google AI Studio 최신 모델 라인업(Gemini 3.8/3.7/3.6/3.5 Flash 및 Gemma 4 31B/26B IT) 동적 탑재
//             3) fetchGoogleAIStudioModels 연동으로 API 키를 통한 Google Generative Language API 실시간 모델 자동 조회 및 캐싱
//             4) normalizeAIModelName을 통한 레거시 구버전 저장 모델 기본 플래그십(gemini-3.8-flash) 자동 정규화
// 🚨 @PATCH : **2026-09-12** — AI 모델 선택 옵션을 중앙 공인 모델(ONRIVI_AI_MODELS)과 100% 동기화하여 에디터 및 AI 모달 전반의 정합성 보장
//             **2026-09-11** — 단축키 및 슬래시 명령어 매핑 테이블에 플로팅 툴바와 일치하는 구분(그룹 배지) 열 추가 및 복사 텍스트 그룹 반영
//             **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-09-11** — 단축키 설정 입력창에서 non-Mac 환경(Windows/Linux)의 Meta(Win) 키를 Ctrl로 오인하지 않도록 isMac 분기 적용
//             **2026-09-05** — AI 설정(Gemini API 키) 즉시 영구 삭제 및 연동 해제 기능(handleDeleteAiSettings) 구현, 공통 리소스 폴더 연결 해제(onClearResourceFolder) 실시간 UI 및 스토리지 동기화 반영, 버튼 라벨 직관적 순화('연동 해제', '폴더 해제')
//             **2026-09-05** — 데스크톱 앱 내비게이션 결함 방어: 로그인 페이지 및 대시보드 이동 링크 클릭 시 Electron 환경(window.electronAPI.openExternal) 지원 및 target="_blank" 적용으로 Electron 창 내부 404 및 흰 화면 결함 해결
//             **2026-09-03** — 단축키/명령어 매핑 테이블의 아이콘, 명령어, 단축키 충돌을 플로팅 툴바 및 마크다운 표준과 100% 일치 동기화
//             **2026-09-03** — fetchAccountData를 useCallback으로 격리하고 useEffect 의존성 배열에 추가하여 ESLint react-hooks/exhaustive-deps 경고 완벽 해소
//             **2026-09-03** — 자원 관리(공통 자원 폴더)에 '전체사용자 필수 항목' 배지 및 미지정 시 강조 UI 적용; initialTab prop 지원을 통해 계정 관리 탭 다이렉트 전환 지원; 환경설정 모달 '계정 관리' 탭의 별명(활동명) 수정 시 [별명 저장] 및 좌측 하단 통합 [저장] 클릭 즉시 에디터 우측 하단 AI 챗봇 버튼명 및 DB users 테이블에 100% 실시간 영구 반영되도록 prop/이벤트/비동기 핸들러 전면 고도화; DB users 개인정보 실시간 조회 및 최신 Gemini 3.8 Flash 연동
//             **2026-07-16** — 단축키 설정 인풋 keydown 버블링 차단 및 PDF/인쇄 설정 모달 인터페이스 추가
// 🔗 @CALLS : testGeminiConnection, useToast, fetchGoogleAIStudioModels, saveSecureData, loadSecureData
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import AIConnectionSettings from '@/components/ai/AIConnectionSettings';
import { resolveCurrentProfile, loadResourceAICredentials, saveResourceAICredentials, deleteResourceAICredentials, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import {aiAccountScope, getProviderApiKey} from '@/lib/ai/client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveResourceMedia } from '@/lib/resourceMedia';
import { listWatermarkResources,watermarkResourceIdentity,watermarkReferenceKey,validateWatermarkImage,WatermarkResource } from '@/lib/watermarkResources';
import { useToast } from '@/components/ToastProvider';
import { createPortal } from 'react-dom';
import { ResourceFolderLocation } from '@/components/ResourceFolderLocation';
import { getResourceEnvironment } from '@/lib/resourceSettings';
import { Icon } from '@/components/icons/Icon';
import { TOOLBAR_ITEMS, getDefaultHotkeys, getDefaultCommands } from '@/lib/toolbarConfig';
import { writeResourceShortcodes } from '@/lib/resourceJson';
import { testGeminiConnection, ONRIVI_AI_MODELS, getCachedAIModels, fetchGoogleAIStudioModels, normalizeAIModelName, OnriviAIModelItem } from '@/lib/gemini';
import { supabase } from '@/lib/supabaseClient';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { getDefaultWatermarkSettings, saveDefaultWatermarkSettings, DocumentPrintSettings, WatermarkPosition, DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from '@/lib/documentPrintSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  editorTabSize?: number;
  spellCheck?: boolean;
  setSpellCheck?: (value:boolean)=>void;
  setEditorTabSize?: (value:number)=>void;
  fontSize: number;
  setFontSize: (v: number) => void;
  wordWrap: 'on' | 'off';
  setWordWrap: (v: 'on' | 'off') => void;
  autoSave: number;
  setAutoSave: (v: number) => void;
  autoClosingBrackets: boolean;
  setAutoClosingBrackets: (v: boolean) => void;
  editorFontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  setEditorFontWeight?: (v: 'normal' | 'medium' | 'semibold' | 'bold') => void;
  editorHighContrast?: boolean;
  setEditorHighContrast?: (v: boolean) => void;
  rootFolder: { name: string, handle?: any } | null;
  onSelectRootFolder: (type: 'local' | 'cloud' | 'browser', provider: string | null) => void;
  driveLetter: string;
  setDriveLetter: (v: string) => void;
  workspaceType: 'local' | 'cloud' | 'browser';
  setWorkspaceType: (v: 'local' | 'cloud' | 'browser') => void;
  cloudProvider: string | null;
  previewMode: 'edit' | 'both' | 'preview' | 'css-style';
  setPreviewMode: (v: 'edit' | 'both' | 'preview' | 'css-style') => void;
  customHotkeys: Record<string, string>;
  setCustomHotkeys: (v: Record<string, string>) => void;
  customSlashCommands: Record<string, string>;
  setCustomSlashCommands: (v: Record<string, string>) => void;
  licenseKey: string;
  setLicenseKey: (v: string) => void;
  themePalette: string;
  onThemeChange: (themeId: string) => void;
  isActivated: boolean;
  isExpired: boolean;
  geminiApiKey: string;
  setGeminiApiKey: (v: string) => void;
  aiModelName: string;
  setAiModelName: (v: string) => void;
  resourceFolder: string | null;
  onSelectResourceFolder: () => void;
  onClearResourceFolder?: () => void;
  userNickname?: string;
  setUserNickname?: (v: string) => void;
  userId?: string;
  initialTab?: string;
}

export default function SettingsModal({
  isOpen, onClose, isDarkMode, setIsDarkMode,
  fontSize, setFontSize, editorTabSize=4, setEditorTabSize, wordWrap, setWordWrap,
  spellCheck=false, setSpellCheck,
  autoSave, setAutoSave,
  previewMode, setPreviewMode,
  customHotkeys, setCustomHotkeys,
  customSlashCommands, setCustomSlashCommands,
  licenseKey, setLicenseKey,
  themePalette,
  onThemeChange,
  isActivated, isExpired,
  autoClosingBrackets, setAutoClosingBrackets,
  editorFontWeight = 'medium', setEditorFontWeight,
  editorHighContrast = false, setEditorHighContrast,
  geminiApiKey, setGeminiApiKey,
  aiModelName, setAiModelName,
  resourceFolder, onSelectResourceFolder, onClearResourceFolder, workspaceType,
  userNickname, setUserNickname, userId,
  initialTab
}: SettingsModalProps) {
  useModalEscape(isOpen, onClose);
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'hotkeys' | 'account'>(() => {
    if (initialTab === 'ai') return 'ai';
    if (initialTab === 'account') return 'account';
    if (initialTab === 'hotkeys') return 'hotkeys';
    return 'general';
  });
  const [availableAIModels, setAvailableAIModels] = useState<OnriviAIModelItem[]>(() => getCachedAIModels());
  const [currentProfileLabel, setCurrentProfileLabel] = useState<string>('');

  // 🔌 [MCP 타겟(Gemini, Claude) 연결 상태 및 핸들러]
  const [mcpTargets, setMcpTargets] = useState<Record<string, { name: string; available: boolean; installed: boolean; path: string }>>({});
  const [isMcpLoading, setIsMcpLoading] = useState(false);

  const reloadMcpTargets = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.checkMcpTargets) return;
    try {
      const res = await api.checkMcpTargets();
      if (res && typeof res === 'object') {
        setMcpTargets(res);
      }
    } catch (e) {
      console.warn('[SettingsModal] checkMcpTargets failed:', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'ai') {
      void reloadMcpTargets();
    }
  }, [isOpen, activeTab, reloadMcpTargets]);

  const handleInstallMcp = async (key: string) => {
    const api = (window as any).electronAPI;
    if (!api?.installMcpTarget) {
      showToast('데스크톱 앱 환경에서만 원클릭 연동이 지원됩니다.', 'info');
      return;
    }
    setIsMcpLoading(true);
    try {
      await api.installMcpTarget(key);
      await reloadMcpTargets();
      showToast(key === 'chatgpt'
        ? 'ChatGPT 개인 플러그인 목록에 등록했습니다. ChatGPT 데스크톱을 다시 시작하고 플러그인 목록에서 온리비 어서를 설치하세요.'
        : `${mcpTargets[key]?.name || key}에 온리비 어서가 연결되었습니다. 해당 AI 앱을 재시작하세요.`, 'success');
    } catch (err: any) {
      showToast('연동 실패: ' + (err?.message || '오류'), 'error');
    } finally {
      setIsMcpLoading(false);
    }
  };

  const handleUninstallMcp = async (key: string) => {
    const api = (window as any).electronAPI;
    if (!api?.uninstallMcpTarget) return;
    setIsMcpLoading(true);
    try {
      await api.uninstallMcpTarget(key);
      await reloadMcpTargets();
      showToast(key === 'chatgpt'
        ? 'ChatGPT 개인 플러그인 목록에서 등록을 해제했습니다. ChatGPT에서 설치된 플러그인은 별도로 제거해 주세요.'
        : `${mcpTargets[key]?.name || key}에서 온리비 어서 연결이 해제되었습니다.`, 'info');
    } catch (err: any) {
      showToast('연결 해제 실패: ' + (err?.message || '오류'), 'error');
    } finally {
      setIsMcpLoading(false);
    }
  };

  const handleCopyMcpSnippet = () => {
    const snippet = JSON.stringify({
      mcpServers: {
        "onrivi-author": {
          command: "node",
          args: [
            "-e",
            "import('file:///' + (process.env.ONRIVI_MCP_HOME || (process.env.APPDATA + '/Onrivi Author/plugins/onrivi-author')).replace(/\\\\/g, '/') + '/server/index.mjs')"
          ]
        }
      }
    }, null, 2);
    navigator.clipboard.writeText(snippet);
    showToast('환경변수(ONRIVI_MCP_HOME) 기반 MCP 설정 JSON이 클립보드에 복사되었습니다.', 'success');
  };

  useEffect(() => {
    if (!isOpen) return;
    // 🚀 [환경설정 열릴 때 현재 리소스 폴더 내용으로 AI 설정정보 100% 즉시 강제 세팅]
    loadResourceAICredentials(resourceFolder || undefined).then((creds: any) => {
      setGeminiApiKey(creds?.apiKey || '');
      setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('onrivi:ai-connections'));
      }
    }).catch(() => {});

    resolveCurrentProfile(resourceFolder || undefined).then((res) => {
      setCurrentProfileLabel(res.profileLabel);
    });

    // 🚀 [리소스 폴더 변경 시 해당 폴더의 AI 인증정보 즉각 재로드]
    loadResourceAICredentials(resourceFolder || undefined).then((creds: any) => {
      setGeminiApiKey(creds?.apiKey || '');
      setAiModelName(creds?.aiModelName || 'gemini-3.8-flash');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('onrivi:ai-connections'));
      }
    }).catch(() => {});
  }, [isOpen, resourceFolder, setGeminiApiKey, setAiModelName]);


  // 🌟 [기본 워터마크 설정 상태]
  const [watermarkSettings, setWatermarkSettings] = useState<DocumentPrintSettings>(() => getDefaultWatermarkSettings());
  const [watermarkResources,setWatermarkResources]=useState<WatermarkResource[]>([]),[watermarkBusy,setWatermarkBusy]=useState(false),[watermarkResourceError,setWatermarkResourceError]=useState(''),[watermarkPreview,setWatermarkPreview]=useState('');
  const watermarkGeneration=useRef(0),settingsOpen=useRef(isOpen);settingsOpen.current=isOpen;
  const reloadWatermarkResources=useCallback(async()=>{
    const generation=++watermarkGeneration.current;
    try{const entries=await listWatermarkResources();if(settingsOpen.current&&generation===watermarkGeneration.current){setWatermarkResources(entries);setWatermarkResourceError('');}}
    catch(error:any){if(settingsOpen.current&&generation===watermarkGeneration.current){setWatermarkResources([]);setWatermarkResourceError(error.message);}}
  },[]);
  useEffect(()=>{
    if(!isOpen)return;
    void reloadWatermarkResources();
    const refresh=()=>{void reloadWatermarkResources();};
    window.addEventListener('onrivi:resource_folder_changed',refresh);window.addEventListener('onrivi:media-updated',refresh);
    const wmGen = watermarkGeneration;
    return()=>{wmGen.current++;window.removeEventListener('onrivi:resource_folder_changed',refresh);window.removeEventListener('onrivi:media-updated',refresh);};
  },[isOpen,reloadWatermarkResources]);
  useEffect(()=>{
    let disposed=false,url='';setWatermarkPreview('');
    if(!isOpen)return;
    if(watermarkSettings.image.startsWith('data:')){setWatermarkPreview(watermarkSettings.image);return;}
    const entry=watermarkResources.find(file=>watermarkReferenceKey(file.reference)===watermarkReferenceKey(watermarkSettings.image));
    if(entry)void entry.read().then(blob=>{if(!disposed){url=URL.createObjectURL(blob);setWatermarkPreview(url);}}).catch(()=>{});
    return()=>{disposed=true;if(url)URL.revokeObjectURL(url);};
  },[isOpen,watermarkSettings.image,watermarkResources]);

  useEffect(() => {
    if (isOpen) {
      setWatermarkSettings(getDefaultWatermarkSettings());
    }
  }, [isOpen]);

  const handleWatermarkImageUpload = async (file?: File) => {
    if (!file) return;
    setWatermarkBusy(true);
    try {
      const resource=watermarkResourceIdentity();
      await validateWatermarkImage(file);
      const reference=await saveResourceMedia(file,`watermark_${Date.now()}_${file.name}`);
      if(!settingsOpen.current||watermarkResourceIdentity()!==resource)return;
      setWatermarkSettings(previous=>({...previous,image:reference,imageResource:resource,kind:'image',rotation:0}));
      await reloadWatermarkResources();showToast('리소스 폴더의 media에 워터마크 이미지를 저장했습니다.','success');
    } catch (err: any) {
      showToast('이미지 처리 실패: ' + (err?.message || '오류'), 'error');
    }finally{setWatermarkBusy(false);}
  };

  const handleRemoveWatermarkImage = () => {
    setWatermarkSettings(prev => ({ ...prev, image: DEFAULT_WATERMARK_IMAGE, imageResource:undefined,kind: 'image' }));
    showToast('기본 온리비 어서 엠블럼으로 초기화되었습니다.', 'info');
  };
  const chooseWatermarkResource=async(key:string)=>{
    const item=watermarkResources.find(file=>watermarkReferenceKey(file.reference)===key);if(!item)return;
    setWatermarkBusy(true);
    try{const resource=watermarkResourceIdentity();await validateWatermarkImage(await item.read());
      if(settingsOpen.current&&resource===watermarkResourceIdentity())setWatermarkSettings(previous=>({...previous,image:item.reference,imageResource:resource,kind:'image',rotation:0}));
    }catch(error:any){showToast(error.message,'error');}finally{setWatermarkBusy(false);}
  };

  // 구글 AI 스튜디오 적용 공식 모델 목록 실시간 동적 동기화
  useEffect(() => {
    if (isOpen && geminiApiKey) {
      fetchGoogleAIStudioModels(geminiApiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableAIModels(models);
        }
      }).catch(() => {});
    }
  }, [isOpen, geminiApiKey]);

  // 구버전(<= 3.1) 모델명이 로드된 경우 플래그십으로 안전하게 자동 정규화
  useEffect(() => {
    if (isOpen && aiModelName) {
      const clean = normalizeAIModelName(aiModelName);
      if (clean !== aiModelName) {
        setAiModelName(clean);
      }
    }
  }, [isOpen, aiModelName, setAiModelName]);

  useEffect(() => {
    if (isOpen && initialTab) {
      if (initialTab === 'account') {
        setActiveTab('account');
      } else if (initialTab === 'hotkeys' || initialTab === 'shortcuts') {
        setActiveTab('hotkeys');
      } else {
        setActiveTab('general');
      }
    }
  }, [isOpen, initialTab]);
  
  // 👤 [DB 개인정보/계정 관리 상태]
  const [dbUser, setDbUser] = useState<any>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [editNickName, setEditNickName] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('onrivi_user_nickname') ||
        localStorage.getItem('onrivi_nick_name') ||
        ''
      ).trim();
    }
    return '';
  });
  const [isSavingNick, setIsSavingNick] = useState(false);

  const fetchAccountData = useCallback(async () => {
    setIsLoadingUser(true);
    try {
      // 1. Supabase 세션 조회
      const { data: { session } } = await supabase.auth.getSession();
      let targetUser = session?.user || null;
      let targetId = targetUser?.id || '';
      let targetEmail = targetUser?.email || '';

      if (!targetId || !targetEmail) {
        const fallbackEmail = userId || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_user_id') : '') || '';
        if (fallbackEmail && !fallbackEmail.includes('GUEST')) {
          targetEmail = fallbackEmail;
        }
      }

      if (targetUser) {
        setSessionUser(targetUser);
      }

      // 2. /api/user/check API를 통해 RLS를 우회하고 실제 DB(users) 원장의 최신 nick_name 및 필드 조회
      if (targetId || targetEmail) {
        const res = await fetch('/api/user/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_id: targetId, p_email: targetEmail })
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData?.exists) {
            setDbUser({
              id: resData.id,
              email: resData.email || targetEmail,
              nick_name: resData.nick_name,
              provider: resData.provider || 'EMAIL',
              created_at: resData.created_at || targetUser?.created_at
            });
            const dbNick = resData.nick_name || targetUser?.user_metadata?.name || userNickname || '';
            setEditNickName(dbNick);
            if (dbNick) {
              localStorage.setItem('onrivi_user_nickname', dbNick);
              setUserNickname?.(dbNick);
            }
            setIsLoadingUser(false);
            return;
          }
        }
      }

      // 3. Fallback: 세션 기반 기본값
      if (targetUser) {
        const fallbackNick = targetUser.user_metadata?.nick_name || targetUser.user_metadata?.name || userNickname || '';
        setDbUser({
          id: targetUser.id,
          email: targetUser.email,
          nick_name: fallbackNick,
          provider: targetUser.app_metadata?.provider || 'EMAIL',
          created_at: targetUser.created_at
        });
        setEditNickName(fallbackNick);
      } else {
        const localNick = userNickname || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_user_nickname') : '') || '';
        setEditNickName(localNick);
        setSessionUser(null);
        setDbUser(null);
      }
    } catch (e) {
      console.warn('[SettingsModal] 계정 정보 조회 예외:', e);
      const localNick = userNickname || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_user_nickname') : '') || '';
      setEditNickName(localNick);
    } finally {
      setIsLoadingUser(false);
    }
  }, [userId, userNickname, setUserNickname]);

  useEffect(() => {
    if (isOpen) {
      fetchAccountData();
    }
  }, [isOpen, fetchAccountData]);

  const handleSaveNickname = async (customNick?: string) => {
    const cleanNick = (typeof customNick === 'string' ? customNick : editNickName).trim();
    
    // 🌟 [최우선] 부모 에디터 상태 및 브라우저 스토리지에 즉각 1ms 만에 실시간 반영!
    try {
      localStorage.setItem('onrivi_user_nickname', cleanNick);
      localStorage.setItem('onrivi_nick_name', cleanNick);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('onrivi:nickname_changed', { detail: cleanNick }));
      }
    } catch {}

    setUserNickname?.(cleanNick);
    setEditNickName(cleanNick);
    setDbUser((prev: any) => prev ? ({ ...prev, nick_name: cleanNick }) : null);

    // 🌟 [DB users 테이블 영구 저장]
    setIsSavingNick(true);
    try {
      const targetId = sessionUser?.id || dbUser?.id;
      const targetEmail = sessionUser?.email || dbUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_user_id') : '');
      const provider = dbUser?.provider || sessionUser?.app_metadata?.provider || 'EMAIL';

      if (targetId && targetEmail) {
        // 서버 API만 사용해 사용자 원장을 갱신한다.
        const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/user/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
          body: JSON.stringify({
            p_id: targetId,
            p_email: targetEmail,
            p_provider: provider,
            p_nick_name: cleanNick
          })
        });

        if (!res.ok) throw new Error('사용자 정보 저장 API 오류');
        showToast(`별명이 '${cleanNick || '기본값'}'(으)로 저장되었습니다. (에디터 즉시 반영)`, 'success');
      } else {
        // 비로그인/오프라인 환경이라도 로컬 반영 성공 알림
        showToast(`별명이 '${cleanNick || '기본값'}'(으)로 에디터에 반영되었습니다.`, 'success');
      }
    } catch (err: any) {
      console.warn('별명 DB 저장 오류 (로컬 표시만 반영):', err);
      showToast('별명을 서버에 저장하지 못했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setIsSavingNick(false);
    }
  };

  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // 🤖 [AI 설정 삭제 핸들러] Gemini API 키 및 AI 연동 상태를 스토리지에서 즉시 완전 삭제
  const handleDeleteAiSettings = useCallback(async () => {
    setGeminiApiKey('');
    setTestResult(null);
    try {
      await deleteResourceAICredentials(resourceFolder || undefined);
      purgeLocalStorageAICredentials();
      const raw = localStorage.getItem('onrivi_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.geminiApiKey = '';
        localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
      }
      const api = (window as any).electronAPI;
      if (api && typeof api.saveSettings === 'function') {
        const currentRaw = localStorage.getItem('onrivi_settings');
        if (currentRaw) api.saveSettings(JSON.parse(currentRaw));
      }
    } catch (err) {
      console.error('AI 연동 해제 중 오류:', err);
    }
    showToast('Gemini API 키가 리소스 폴더에서 안전하게 제거되었습니다.', 'info');
  }, [resourceFolder, setGeminiApiKey, showToast]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !closing) return null;
  if (!mounted) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 300); 
  };

  const handleTestGemini = async () => {
    if (!geminiApiKey) {
      setTestResult({ success: false, msg: 'API 키를 먼저 입력해주세요.' });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const isOk = await testGeminiConnection(geminiApiKey, aiModelName);
      if (isOk) {
        setTestResult({ success: true, msg: '테스트 성공! API 키 및 모델이 유효합니다.' });
        fetchGoogleAIStudioModels(geminiApiKey).then(models => {
          if (models && models.length > 0) {
            setAvailableAIModels(models);
          }
        }).catch(() => {});
      } else {
        setTestResult({ success: false, msg: '응답이 올바르지 않습니다.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || '연동 실패' });
    } finally {
      setIsTestingKey(false);
    }
  };

  return createPortal(
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`} 
      onClick={handleClose}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation?.();
        }
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;500;600;700&family=Geist+Mono&display=swap');
        
        .settings-shadow {
            box-shadow: 0 40px 100px rgba(15, 0, 109, 0.04), 0 10px 30px rgba(0, 0, 0, 0.04);
        }
        
        .settings-paper-feel {
            background-image: radial-gradient(#1e00a9 0.5px, transparent 0.5px);
            background-size: 24px 24px;
            background-color: transparent;
            opacity: 0.02;
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
      `}} />
      
      <main 
        className={`w-full max-w-6xl h-[85vh] flex flex-col md:flex-row ${isDarkMode ? 'bg-zinc-900 border border-white/10' : 'bg-white'} rounded-2xl settings-shadow overflow-hidden relative z-10 transition-all duration-300 font-sans`}
        style={{
          transform: closing ? 'translateY(20px) scale(0.98)' : 'translateY(0) scale(1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isDarkMode && <div className="settings-paper-feel"></div>}

        {/* Global Close Button (Top Right) */}
        <button 
          onClick={handleClose} 
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-50 text-outline hover:text-on-surface"
        >
          <Icon name="Close" size={24} />
        </button>

        {/* Sidebar */}
        <aside className={`w-full md:w-[260px] shrink-0 border-r ${isDarkMode ? 'border-white/10' : 'border-outline-variant/15'} p-6 flex flex-col relative z-10`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Icon name="Settings" size={18} />
            </div>
            <h2 className="text-lg font-bold text-[#1d4ed8] tracking-tight">환경 설정</h2>
          </div>
          
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all cursor-pointer ${
                activeTab === 'general' 
                  ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] font-extrabold shadow-xs' 
                  : 'text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon name="Settings" size={18} />
              일반 설정
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all cursor-pointer ${
                activeTab === 'ai' 
                  ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] font-extrabold shadow-xs' 
                  : 'text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon name="Bot" size={18} />
              AI 및 MCP 연동
            </button>
            <button 
              onClick={() => setActiveTab('hotkeys')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all cursor-pointer ${
                activeTab === 'hotkeys' 
                  ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] font-extrabold shadow-xs' 
                  : 'text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon name="Command" size={18} />
              단축키 / 명령어
            </button>
            <button 
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all cursor-pointer ${
                activeTab === 'account' 
                  ? 'bg-[#1d4ed8]/15 text-[#1d4ed8] font-extrabold shadow-xs' 
                  : 'text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon name="User" size={18} />
              계정 관리
            </button>
          </nav>

          <div className="mt-auto pt-8 flex flex-col gap-4">
             {/* 💡 라이선스 뱃지 (StatusBar에서 이동) */}
             <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-black/20' : 'bg-black/5'} border border-outline-variant/10 flex flex-col gap-2 items-center justify-center text-center`}>
               <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">라이선스 상태</span>
               {isExpired ? (
                 <span className="text-[12px] text-rose-600 dark:text-rose-400 font-extrabold px-3 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 w-full animate-pulse">
                   🔒 미리보기 전용
                 </span>
               ) : isActivated ? (
                 <span className="text-[12px] text-[#1d4ed8] font-extrabold px-3 py-1.5 rounded-md bg-[#1d4ed8]/10 border border-[#1d4ed8]/20 w-full">
                   ✅ 정품 인증됨
                 </span>
               ) : (
                 <span className="text-[12px] text-amber-600 dark:text-amber-400 font-extrabold px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 w-full">
                   ⚠️ 체험판 (인증 필요)
                 </span>
               )}
             </div>

              <button
                type="button"
                disabled={watermarkBusy}
                onClick={async () => {
                  let committedWatermark=watermarkSettings;
                  if(watermarkSettings.enabled&&watermarkSettings.kind==='image'){
                    setWatermarkBusy(true);
                    try{
                      const resource=watermarkResourceIdentity();
                      if(watermarkSettings.image.startsWith('data:')){
                        const blob=await(await fetch(watermarkSettings.image)).blob();await validateWatermarkImage(blob);
                        const extension=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
                        const reference=await saveResourceMedia(blob,`watermark_${Date.now()}.${extension}`);
                        if(resource!==watermarkResourceIdentity())throw Error('리소스 폴더가 변경되었습니다. 이미지를 다시 선택해 주세요.');
                        committedWatermark={...watermarkSettings,image:reference,imageResource:resource};
                        setWatermarkSettings(committedWatermark);
                      }else if(watermarkSettings.imageResource&&watermarkSettings.imageResource!==resource){
                        throw Error('현재 리소스 폴더의 워터마크 이미지를 다시 선택해 주세요.');
                      }
                    }catch(error:any){showToast(error.message,'error');return;}finally{setWatermarkBusy(false);}
                  }
                  const rawKey = (geminiApiKey || '').trim();
                  const cleanKey = rawKey.startsWith('U2FsdGVkX1')
                    ? ((loadSecureData<string>('onrivi_gemini_api_key') || loadSecureData<string>('geminiApiKey') || '').trim())
                    : rawKey;
                  setGeminiApiKey(cleanKey);

                  const rawModel = aiModelName || 'gemini-3.8-flash';
                  const cleanModel = rawModel.startsWith('U2FsdGVkX1')
                    ? (loadSecureData<string>('onrivi_ai_model_name') || 'gemini-3.8-flash')
                    : rawModel;
                  const modelToSave = (cleanModel && !cleanModel.startsWith('U2FsdGVkX1')) ? cleanModel : 'gemini-3.8-flash';
                  setAiModelName(modelToSave);

                  try {
    if (cleanKey && !cleanKey.startsWith('U2FsdGVkX1')) {
                      await saveResourceAICredentials({ apiKey: cleanKey, aiModelName: modelToSave }, resourceFolder || undefined);
                    }
    purgeLocalStorageAICredentials();
    localStorage.setItem('onrivi_ai_model_name', modelToSave);

                      const raw = localStorage.getItem('onrivi_settings');
                      if (raw) {
                        const parsed = JSON.parse(raw);
                        parsed.geminiApiKey = cleanKey;
                        parsed.aiModelName = modelToSave;
                        localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
                      }
                      const chromeStorage = (window as any).chrome?.storage?.local;
                      if (chromeStorage) {
                        chromeStorage.set({ onrivi_gemini_api_key: cleanKey });
                      }
                      const api = (window as any).electronAPI;
                      if (api && typeof api.saveSettings === 'function') {
                        const currentRaw = localStorage.getItem('onrivi_settings');
                        if (currentRaw) api.saveSettings(JSON.parse(currentRaw));
                      }
                    } catch {}

                  // 🌟 [기본 워터마크 영구 저장]
                  saveDefaultWatermarkSettings(committedWatermark);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('onrivi:watermark_changed', { detail: committedWatermark }));
                  }

                  // 🌟 [별명 저장 연동] 사용자가 계정 관리에서 입력/수정한 별명을 100% 즉시 반영 및 저장!
                  const cleanNick = editNickName.trim();
                  if (cleanNick !== (userNickname || '')) {
                    handleSaveNickname(cleanNick);
                  }

                  if (cleanKey) {
                    showToast(`설정이 성공적으로 저장되었습니다. (${modelToSave} 활성화)`, 'success');
                  } else {
                    const currentScope = aiAccountScope();
                    const hasAnyAI = Boolean(
                      cleanKey ||
                      getProviderApiKey(currentScope, 'openai') ||
                      getProviderApiKey(currentScope, 'google') ||
                      getProviderApiKey(currentScope, 'anthropic')
                    );
                    if (hasAnyAI) {
                      showToast('설정이 성공적으로 저장되었습니다. (AI 연결 활성화)', 'success');
                    } else {
                      showToast('설정이 저장되었습니다.', 'info');
                    }
                  }
                  onClose();
                }}
                className="w-full py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl font-bold text-sm shadow-md shadow-[#1d4ed8]/20 transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-98"
              >
                <Icon name="Save" size={16} />
                <span>저장</span>
              </button>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto relative z-10 p-8 md:p-12">
          
          {activeTab === 'general' && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-300">
              
              {/* 에디터 설정 그룹 */}
              <div className="space-y-6">
                <h3 className="font-serif text-[20px] font-semibold text-on-surface border-b pb-2 border-outline-variant/20 dark:border-white/10">에디터 동작</h3>
                
                <SettingRow 
                  icon={<Icon name="AlignLeft" size={18} />}
                  title="자동 줄 바꿈 (Word Wrap)"
                  description="에디터 너비에 맞춰 텍스트를 자동으로 줄바꿈합니다."
                  control={
                    <ToggleSwitch 
                      active={wordWrap === 'on'} 
                      onChange={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')} 
                    />
                  }
                />

                <SettingRow 
                  icon={<Icon name="Braces" size={18} />}
                  title="괄호 자동 완성 (Auto Closing Brackets)"
                  description="여는 괄호를 입력할 때 닫는 괄호를 자동으로 추가합니다."
                  control={
                    <ToggleSwitch 
                      active={autoClosingBrackets} 
                      onChange={() => setAutoClosingBrackets(!autoClosingBrackets)} 
                    />
                  }
                />

                <SettingRow 
                  icon={<Icon name="Save" size={18} />}
                  title="자동 저장 (Auto Save)"
                  description="문서를 자동으로 저장하는 주기를 설정합니다."
                  control={
                    <select
                      value={autoSave}
                      onChange={(e) => setAutoSave(parseInt(e.target.value))}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium outline-none cursor-pointer border transition-colors ${
                        isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <option value={0}>사용 안함</option>
                      <option value={5}>5초</option>
                      <option value={10}>10초</option>
                      <option value={30}>30초</option>
                      <option value={60}>1분</option>
                    </select>
                  }
                />

                <SettingRow icon={<Icon name="TypeIcon" size={18} />} title="자동 맞춤법 밑줄" description="문서보기에서 브라우저 기본 검사의 빨간 밑줄을 표시합니다. 제품명·전문용어는 잘못 표시될 수 있으며 글은 자동으로 고치지 않습니다."
                  control={<ToggleSwitch active={spellCheck} onChange={()=>setSpellCheck?.(!spellCheck)} />} />
                <SettingRow icon={<Icon name="TypeIcon" size={18} />} title="탭 간격" description="문서 보기와 나란히 보기에서 Tab 입력 시 사용할 공백 칸 수입니다."
                  control={<select aria-label="탭 간격" value={editorTabSize} onChange={event=>setEditorTabSize?.(Number(event.target.value))} className="rounded-lg border px-4 py-2">
                    {[1,2,3,4,6,8,12,16].map(size=><option key={size} value={size}>{size}칸</option>)}
                  </select>} />
                <SettingRow 
                  icon={<Icon name="TypeIcon" size={18} />}
                  title="에디터 글꼴 크기 (Font Size)"
                  description="에디터 텍스트의 글자 크기를 조절하여 가독성을 높입니다."
                  control={
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium outline-none cursor-pointer border transition-colors ${
                        isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <option value={13}>13px (작게)</option>
                      <option value={14}>14px (보통)</option>
                      <option value={15}>15px (약간 크게)</option>
                      <option value={16}>16px (크게) ★ 권장</option>
                      <option value={17}>17px (더 크게)</option>
                      <option value={18}>18px (아주 크게)</option>
                      <option value={20}>20px (특대)</option>
                      <option value={22}>22px (최대)</option>
                    </select>
                  }
                />

                <SettingRow 
                  icon={<Icon name="Bold" size={18} />}
                  title="에디터 글꼴 굵기 (Font Weight)"
                  description="모니터 난반사나 어두운 환경에서 텍스트가 흐릿하게 보이지 않도록 획 굵기를 조절합니다."
                  control={
                    <select
                      value={editorFontWeight}
                      onChange={(e) => setEditorFontWeight?.(e.target.value as 'normal' | 'medium' | 'semibold' | 'bold')}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium outline-none cursor-pointer border transition-colors ${
                        isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <option value="normal">보통 (400 - Regular)</option>
                      <option value="medium">선명하게 (500 - Medium)</option>
                      <option value="semibold">더 선명하게 (600 - SemiBold) ★ 권장</option>
                      <option value="bold">굵게 (700 - Bold)</option>
                    </select>
                  }
                />

                <SettingRow 
                  icon={<Icon name="ThemeLight" size={18} />}
                  title="고대비 텍스트 (High Contrast)"
                  description="빛 난반사 방지를 위해 에디터 글씨 색상을 순수 흑백(최대 명암비)으로 또렷하게 표시합니다."
                  control={
                    <ToggleSwitch 
                      active={!!editorHighContrast} 
                      onChange={() => setEditorHighContrast?.(!editorHighContrast)} 
                    />
                  }
                />
              </div>

              {/* 자원 관리 설정 그룹 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2 border-outline-variant/20 dark:border-white/10">
                  <h3 className="font-serif text-[20px] font-semibold text-on-surface">자원 관리 (서식 & 미디어)</h3>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    전체사용자 필수 항목
                  </span>
                </div>
                
                <div className="space-y-3 min-w-0">
                  <div className="font-semibold">공통 자원 폴더 (Resource Folder)</div>
                  <div className="text-[13px] text-on-surface-variant">현재 작업 환경에서 서식, 이미지·영상, AI 템플릿을 읽고 저장하는 폴더입니다.</div>
                  <ResourceFolderLocation environment={getResourceEnvironment()} folder={resourceFolder} />
                  <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectResourceFolder()}
                        className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-98 ${
                          resourceFolder
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                            : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-[#1d4ed8]/20'
                        }`}
                      >
                        {resourceFolder ? '폴더 변경' : '폴더 선택 (필수)'}
                      </button>
                      {resourceFolder && onClearResourceFolder && (
                        <button
                          type="button"
                          onClick={onClearResourceFolder}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-900/50 transition-all whitespace-nowrap cursor-pointer active:scale-98 shadow-xs"
                          title="공통 리소스 폴더 연결을 해제합니다"
                        >
                          폴더 해제
                        </button>
                      )}
                  </div>
                </div>
              </div>

              {/* 기본 워터마크 설정 그룹 */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2 border-outline-variant/20 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-[20px] font-semibold text-on-surface">기본 워터마크 (Watermark)</h3>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                      PDF · EPUB 공통 적용
                    </span>
                  </div>
                </div>

                <SettingRow 
                  icon={<Icon name="TypeIcon" size={18} />}
                  title="워터마크 기본 적용"
                  description="문서 내보내기(PDF/인쇄 및 EPUB 전자책) 시 기본으로 워터마크를 적용합니다. (문서별 설정이 없을 때 사용)"
                  control={
                    <ToggleSwitch 
                      active={watermarkSettings.enabled} 
                      onChange={() => setWatermarkSettings(prev => ({ ...prev, enabled: !prev.enabled }))} 
                    />
                  }
                />

                {watermarkSettings.enabled && (
                  <div className={`p-6 rounded-2xl border space-y-5 ${isDarkMode ? 'bg-zinc-800/50 border-white/10' : 'bg-surface-container-low/50 border-outline-variant/20'}`}>
                    {/* 워터마크 종류 선택 */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="block text-[14px] font-semibold text-on-surface mb-0.5">워터마크 종류</label>
                        <p className="text-[12px] text-on-surface-variant">표시할 워터마크 형태(문자 문구 또는 로고 이미지)를 선택합니다.</p>
                      </div>
                      <div className="flex rounded-xl p-1 bg-black/5 dark:bg-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => setWatermarkSettings(prev => ({ ...prev, kind: 'text' }))}
                          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                            watermarkSettings.kind === 'text'
                              ? 'bg-white dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-400 shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          문자
                        </button>
                        <button
                          type="button"
                          onClick={() => setWatermarkSettings(prev => ({ ...prev, kind: 'image' }))}
                          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                            watermarkSettings.kind === 'image'
                              ? 'bg-white dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-400 shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          이미지
                        </button>
                      </div>
                    </div>

                    {/* 문자 워터마크 입력 */}
                    {watermarkSettings.kind === 'text' ? (
                      <div className="space-y-4 pt-2 border-t border-outline-variant/15 dark:border-white/5">
                        <div>
                          <label className="block text-[14px] font-semibold text-on-surface mb-1">워터마크 문구</label>
                          <input
                            type="text"
                            maxLength={200}
                            placeholder="워터마크 문구를 입력하세요 (기본값: Onrivi Author)"
                            value={watermarkSettings.text}
                            onChange={(e) => setWatermarkSettings(prev => ({ ...prev, text: e.target.value }))}
                            className={`w-full px-4 py-2.5 rounded-xl text-[14px] font-semibold outline-none border transition-all ${
                              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-[#1d4ed8]' : 'bg-white border-[#E0DED7] text-slate-900 focus:border-[#1d4ed8]'
                            }`}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="block text-[14px] font-semibold text-on-surface mb-0.5">글자 크기 (Font Size)</label>
                            <p className="text-[12px] text-on-surface-variant">워터마크 글자의 크기를 지정합니다. (8px ~ 160px)</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={8}
                              max={160}
                              value={watermarkSettings.fontSize}
                              onChange={(e) => setWatermarkSettings(prev => ({ ...prev, fontSize: Math.max(8, Math.min(160, Number(e.target.value) || 48)) }))}
                              className={`w-24 px-3 py-1.5 text-right rounded-lg text-[13px] font-bold border outline-none ${
                                isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                              }`}
                            />
                            <span className="text-[13px] text-on-surface-variant font-medium">px</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 이미지 워터마크 업로드 */
                      <div className="space-y-4 pt-2 border-t border-outline-variant/15 dark:border-white/5">
                        <div>
                          <label className="block text-[14px] font-semibold text-on-surface mb-1">워터마크 이미지 (로고·서명 등)</label>
                          <p className="text-[12px] text-on-surface-variant mb-3">현재 리소스 폴더의 media 이미지에서 선택합니다. 새 이미지와 기본 엠블럼도 설정 저장 시 이 폴더에서 관리합니다.</p>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <select aria-label="리소스 워터마크 이미지" disabled={watermarkBusy} className="min-w-0 max-w-full rounded border bg-white p-2 text-black"
                              value={watermarkResources.some(file=>watermarkReferenceKey(file.reference)===watermarkReferenceKey(watermarkSettings.image))?watermarkReferenceKey(watermarkSettings.image):''}
                              onChange={e=>{void chooseWatermarkResource(e.target.value);}}>
                              <option value="">리소스 이미지 선택</option>{watermarkResources.map(file=><option key={file.reference} value={watermarkReferenceKey(file.reference)}>{file.name}</option>)}
                            </select>
                            <button type="button" className="rounded border px-3 py-2" disabled={watermarkBusy} onClick={()=>{void reloadWatermarkResources();}}>목록 새로고침</button>
                          </div>
                          {watermarkResourceError&&<p role="alert" className="mb-2 text-sm text-red-600">{watermarkResourceError}</p>}
                          {watermarkBusy&&<p role="status">리소스 이미지를 준비하고 있습니다.</p>}
                          
                          <div className="flex items-center gap-3">
                            <label className="px-4 py-2 rounded-xl text-[13px] font-bold bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-xs cursor-pointer transition-all active:scale-98">
                              <span>{watermarkSettings.image && watermarkSettings.image !== DEFAULT_WATERMARK_IMAGE ? '다른 이미지로 변경' : '새 이미지 등록'}</span>
                              <input
                                aria-label="워터마크 리소스 이미지 추가" disabled={watermarkBusy}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => {
                                  void handleWatermarkImageUpload(e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                            {watermarkSettings.image && watermarkSettings.image !== DEFAULT_WATERMARK_IMAGE && (
                              <button
                                type="button"
                                onClick={handleRemoveWatermarkImage}
                                className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-200 dark:border-amber-900/50 transition-all cursor-pointer active:scale-98 flex items-center gap-1.5"
                              >
                                <Icon name="RotateCcw" size={13} />
                                <span>기본 엠블럼으로 초기화</span>
                              </button>
                            )}
                          </div>

                          {watermarkSettings.image && (
                            <div className="mt-3 flex items-center gap-3 p-3 rounded-xl border bg-black/5 dark:bg-white/5 border-outline-variant/15">
                              <div className="w-16 h-16 rounded-lg border bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 p-1">
                                {watermarkPreview?<img src={watermarkPreview} alt="워터마크 미리보기" className="max-w-full max-h-full object-contain"/>:<span className="text-xs">리소스 연결 확인</span>}
                              </div>
                              <div className="text-[12px] text-on-surface-variant">
                                <div className="font-semibold text-on-surface">
                                  {watermarkSettings.image === DEFAULT_WATERMARK_IMAGE ? '🍀 기본 워터마크 이미지 (온리비 어서 공식 엠블럼)' : '등록된 사용자 지정 워터마크 이미지'}
                                </div>
                                <div>
                                  {watermarkSettings.image === DEFAULT_WATERMARK_IMAGE ? '사용자 이미지를 등록하지 않은 경우 이 엠블럼이 기본 사출됩니다.' : '내보내기 시 각 페이지에 배치됩니다.'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 위치 및 투명도, 각도, 너비 공통 설정 */}
                    <div className="grid gap-4 pt-3 border-t border-outline-variant/15 dark:border-white/5 sm:grid-cols-2">
                      <div>
                        <label className="block text-[13px] font-semibold text-on-surface mb-1">배치 위치</label>
                        <select
                          value={watermarkSettings.position}
                          onChange={(e) => setWatermarkSettings(prev => ({ ...prev, position: e.target.value as WatermarkPosition }))}
                          className={`w-full px-3 py-2 rounded-lg text-[13px] font-medium outline-none cursor-pointer border transition-colors ${
                            isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                          }`}
                        >
                          <option value="center">가운데 (Center)</option>
                          <option value="top-left">왼쪽 위 (Top Left)</option>
                          <option value="top-right">오른쪽 위 (Top Right)</option>
                          <option value="bottom-left">왼쪽 아래 (Bottom Left)</option>
                          <option value="bottom-right">오른쪽 아래 (Bottom Right)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-on-surface mb-1">
                          <span>진하기 (투명도)</span>
                          <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{watermarkSettings.opacity}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={watermarkSettings.opacity}
                          onChange={(e) => setWatermarkSettings(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                          className="w-full accent-[#1d4ed8] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-on-surface mb-1">
                          <span>회전 각도</span>
                          <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{watermarkSettings.rotation}°</span>
                        </div>
                        <input
                          type="range"
                          min={-90}
                          max={90}
                          value={watermarkSettings.rotation}
                          onChange={(e) => setWatermarkSettings(prev => ({ ...prev, rotation: Number(e.target.value) }))}
                          className="w-full accent-[#1d4ed8] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-on-surface mb-1">
                          <span>너비 비율</span>
                          <span className="font-bold text-[#1d4ed8] dark:text-blue-400">{watermarkSettings.width}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={watermarkSettings.width}
                          onChange={(e) => setWatermarkSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                          className="w-full accent-[#1d4ed8] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 첫 페이지 제외 */}
                    <div className="pt-2 border-t border-outline-variant/15 dark:border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-[14px] font-semibold text-on-surface">첫 페이지 / 표지 제외</div>
                        <div className="text-[12px] text-on-surface-variant">첫 번째 페이지(표지)에는 워터마크를 노출하지 않습니다.</div>
                      </div>
                      <ToggleSwitch
                        active={watermarkSettings.excludeFirst}
                        onChange={() => setWatermarkSettings(prev => ({ ...prev, excludeFirst: !prev.excludeFirst }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 dark:border-white/10">
                <div>
                  <h3 className="font-serif text-[22px] font-bold text-on-surface">AI 및 MCP 연동 관리</h3>
                  <p className="text-[13px] text-on-surface-variant mt-1">외부 AI 어시스턴트(ChatGPT, Google Gemini, Claude) 연결 및 온리비 어서 내장 AI 챗봇 설정을 관리합니다.</p>
                </div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-md bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
                  Model Context Protocol
                </span>
              </div>

              {/* 🔌 1. 외부 AI 도구 MCP 원클릭 연동 (API 키 불필요!) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔌</span>
                    <h4 className="text-[16px] font-bold text-on-surface">외부 AI 도구 MCP 원클릭 연동</h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      API 키 불필요
                    </span>
                  </div>
                </div>

                {/* 핵심 개념 안내 배너 */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-1.5">
                  <p className="font-semibold text-blue-900 dark:text-blue-300">
                    💡 MCP(Model Context Protocol)로 연결하면 온리비 어서에 별도의 유료 API 키를 등록할 필요가 없습니다.
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    사용자가 평소 사용하시는 AI 도구(ChatGPT Desktop, Google Gemini, Claude Desktop 등)의 자체 구독 및 AI 두뇌를 그대로 사용하며, 해당 AI가 온리비 어서의 로컬 마크다운 문서 읽기/수정 및 서식 조회를 안전하게 직접 호출합니다.
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-400 font-mono">
                    ⚠️ 로컬 MCP는 <strong>PC 설치형 AI 앱의 로컬 실행 채팅</strong>에서 사용하며, 온리비 어서 데스크톱 앱이 켜져 있어야 합니다. ChatGPT는 개인 플러그인 목록에 등록한 뒤 ChatGPT에서 별도로 설치해야 합니다.
                  </p>
                </div>

                {/* 타겟별 카드 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google Gemini / Antigravity */}
                  <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    mcpTargets.gemini?.installed
                      ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-xs'
                      : isDarkMode ? 'bg-zinc-800/40 border-white/10' : 'bg-surface-container-low/40 border-outline-variant/20'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">✨</span>
                          <span className="font-bold text-[15px] text-on-surface">Google Gemini / Antigravity</span>
                        </div>
                        {mcpTargets.gemini?.installed ? (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                            연결됨 ✅
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            미연결
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant">
                        Google Gemini 또는 Antigravity IDE에서 온리비 어서 문서를 직접 읽고 서식을 생성합니다.
                      </p>
                      {mcpTargets.gemini?.path && (
                        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate" title={mcpTargets.gemini.path}>
                          설정: {mcpTargets.gemini.path}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      {mcpTargets.gemini?.installed ? (
                        <button
                          type="button"
                          disabled={isMcpLoading}
                          onClick={() => handleUninstallMcp('gemini')}
                          className="w-full py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[12px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          {isMcpLoading ? '처리 중...' : '연결 해제'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isMcpLoading}
                          onClick={() => handleInstallMcp('gemini')}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 text-white text-[13px] font-bold transition-all shadow-xs"
                        >
                          {isMcpLoading ? '연결 중...' : 'Gemini에 원클릭 연결하기'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Claude Desktop */}
                  <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    mcpTargets.claude?.installed
                      ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-xs'
                      : isDarkMode ? 'bg-zinc-800/40 border-white/10' : 'bg-surface-container-low/40 border-outline-variant/20'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🤖</span>
                          <span className="font-bold text-[15px] text-on-surface">Claude Desktop</span>
                        </div>
                        {mcpTargets.claude?.installed ? (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                            연결됨 ✅
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            미연결
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant">
                        Claude Desktop 앱에서 온리비 어서 로컬 마크다운 문서 읽기/수정을 실행합니다.
                      </p>
                      {mcpTargets.claude?.path && (
                        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate" title={mcpTargets.claude.path}>
                          설정: {mcpTargets.claude.path}
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      {mcpTargets.claude?.installed ? (
                        <button
                          type="button"
                          disabled={isMcpLoading}
                          onClick={() => handleUninstallMcp('claude')}
                          className="w-full py-2 px-3 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[12px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          {isMcpLoading ? '처리 중...' : '연결 해제'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isMcpLoading}
                          onClick={() => handleInstallMcp('claude')}
                          className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white text-[13px] font-bold transition-all shadow-xs"
                        >
                          {isMcpLoading ? '연결 중...' : 'Claude Desktop에 연결하기'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ChatGPT Desktop local plugin marketplace */}
                  <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    mcpTargets.chatgpt?.installed
                      ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-xs'
                      : isDarkMode ? 'bg-zinc-800/40 border-white/10' : 'bg-surface-container-low/40 border-outline-variant/20'
                  }`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💬</span>
                          <span className="font-bold text-[15px] text-on-surface">ChatGPT Desktop</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${mcpTargets.chatgpt?.installed ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                          {mcpTargets.chatgpt?.installed ? '목록 등록됨' : '미등록'}
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant">
                        온리비 어서를 개인 플러그인 목록에 등록합니다. ChatGPT 데스크톱을 다시 시작한 뒤 플러그인 목록에서 설치하고 로컬 채팅에서 선택하세요.
                      </p>
                      {mcpTargets.chatgpt?.path && (
                        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate" title={mcpTargets.chatgpt.path}>
                          목록: {mcpTargets.chatgpt.path}
                        </p>
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isMcpLoading}
                        onClick={() => mcpTargets.chatgpt?.installed ? handleUninstallMcp('chatgpt') : handleInstallMcp('chatgpt')}
                        className={`w-full py-2.5 px-3 rounded-xl text-[13px] font-bold transition-all ${mcpTargets.chatgpt?.installed ? 'border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20' : 'bg-[#1d4ed8] hover:bg-blue-700 text-white'}`}
                      >
                        {isMcpLoading ? '처리 중...' : mcpTargets.chatgpt?.installed ? '목록 등록 해제' : 'ChatGPT 플러그인 목록에 등록'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 기타 도구(Cursor, VS Code) 수동 복사 지원 */}
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-zinc-800/20 border-white/5' : 'bg-surface-container-low/20 border-outline-variant/15'}`}>
                  <div className="text-[12px]">
                    <span className="font-bold text-on-surface">Cursor / VS Code 등 기타 도구 설정</span>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">다른 MCP 클라이언트에 직접 등록할 수 있는 JSON 설정 스니펫을 클립보드로 복사합니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMcpSnippet}
                    className="shrink-0 px-3.5 py-1.5 rounded-lg border border-outline-variant/30 text-[12px] font-semibold text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    설정 JSON 복사
                  </button>
                </div>
              </div>

              {/* 🔑 2. 온리비 어서 내장 AI 챗봇 API 키 설정 (선택 사항) */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/20 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔑</span>
                    <h4 className="text-[16px] font-bold text-on-surface">온리비 내장 AI 챗봇 연결 (선택 사항)</h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                      직접 API 키 등록
                    </span>
                  </div>
                </div>

                {/* 📁 AI 인증정보 리소스 폴더 암호화 보관 배너 */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔐</span>
                      <span className="text-[13px] font-bold text-blue-900 dark:text-blue-300">
                        AI API 키 리소스 폴더 암호화 관리 (로컬스토리지 보관 배제)
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-blue-600 text-white shadow-xs">
                      AES-256 암호화
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    온리비 어서 앱 내부의 내장 챗봇을 직접 쓰실 경우에만 API 키를 등록하시면 되며, 키는 브라우저 로컬스토리지에 저장되지 않고 연결된 공통 리소스 폴더의 <code className="font-mono text-zinc-800 dark:text-zinc-200 font-bold bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">settings/ai_credentials.enc</code> 파일에만 안전하게 암호화 보관됩니다.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <span>📁 리소스 폴더:</span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {resourceFolder || '⚠️ 미설정 (폴더를 먼저 선택해 주세요)'}
                      </span>
                    </div>
                    {currentProfileLabel && (
                      <div className="flex items-center gap-1.5">
                        <span>🖥️ 현재 식별 환경:</span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-800 font-mono font-bold text-blue-600 dark:text-blue-400 shadow-xs">
                          {currentProfileLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 다중 AI 제공자별 키 설정 컴포넌트 */}
                <AIConnectionSettings scope={aiAccountScope()} />
              </div>
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 dark:border-white/10">
                <div>
                  <h3 className="font-serif text-[20px] font-semibold text-on-surface">단축키 및 명령어 매핑</h3>
                  <p className="text-[13px] text-on-surface-variant mt-1">마크다운 에디터 내에서 사용할 단축키와 슬래시(/) 명령어를 커스텀하세요.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const textLines = ['[단축키 및 명령어 매핑]'];
                      TOOLBAR_ITEMS.forEach(item => {
                        const hk = customHotkeys[item.id] || '없음';
                        const cmd = customSlashCommands[item.id] || '없음';
                        textLines.push(`- [${item.group}] ${item.name}: 단축키 [${hk}], 명령어 [/${cmd}]`);
                      });
                      navigator.clipboard.writeText(textLines.join('\n')).then(() => {
                        showToast('단축키 및 명령어가 복사되었습니다.', 'success');
                      }).catch(() => {
                        showToast('복사에 실패했습니다.', 'error');
                      });
                    }}
                    className="px-4 py-2 text-[13px] font-bold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-2"
                  >
                    <Icon name="Copy" size={14} />
                    복사하기
                  </button>
                  <button
                    onClick={() => {
                      const defaultHotkeys = getDefaultHotkeys();
                    const defaultCmds = getDefaultCommands();
                    setCustomHotkeys(defaultHotkeys);
                    setCustomSlashCommands(defaultCmds);
                    localStorage.setItem('customHotkeys', JSON.stringify(defaultHotkeys));
                    localStorage.setItem('customSlashCommands', JSON.stringify(defaultCmds));
                    showToast('초기화 되었습니다.', 'success');
                  }}
                  className="px-4 py-2 text-[13px] font-bold rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Icon name="RotateCcw" size={14} />
                  초기화
                  </button>
                </div>
              </div>

              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-white/10' : 'border-outline-variant/20'}`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[12px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-surface-container-low text-on-surface-variant'}`}>
                      <th className="px-4 py-3.5 w-24 text-center">구분</th>
                      <th className="px-4 py-3.5 w-12 text-center">아이콘</th>
                      <th className="px-4 py-3.5 w-48">기능명</th>
                      <th className="px-4 py-3.5 text-center">단축키 조합</th>
                      <th className="px-4 py-3.5 text-center">명령어 (/)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-[14px] ${isDarkMode ? 'divide-white/5 text-zinc-200' : 'divide-outline-variant/10 text-on-surface'}`}>
                    {TOOLBAR_ITEMS.map((item) => (
                      <tr key={item.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold tracking-tight ${
                            item.group === '서식' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                            item.group === '제목' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            item.group === '목록' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                            item.group === '미디어' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            item.group === '코드' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                            item.group === '문서' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' :
                            'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                          }`}>
                            {item.group}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-lg">{item.icon}</td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={customHotkeys[item.id] !== undefined ? customHotkeys[item.id] : ''}
                            onChange={() => {}}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation?.();
                              if (e.key === 'Backspace' || e.key === 'Delete') {
                                e.preventDefault();
                                const newHotkeys = { ...customHotkeys, [item.id]: '' };
                                setCustomHotkeys(newHotkeys);
                                localStorage.setItem('customHotkeys', JSON.stringify(newHotkeys));
                                return;
                              }
                              if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') return;
                              const isCtrl = e.ctrlKey || e.metaKey;
                              const isShift = e.shiftKey;
                              const isAlt = e.altKey;
                              if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
                              e.preventDefault();
                              let key = e.key.toUpperCase();
                              if (e.code && e.code.startsWith('Key')) key = e.code.substring(3).toUpperCase();
                              else if (e.code && e.code.startsWith('Digit')) key = e.code.substring(5);
                              
                              const parts = [];
                              if (isCtrl) parts.push('Ctrl');
                              if (isShift) parts.push('Shift');
                              if (isAlt) parts.push('Alt');
                              parts.push(key);
                              const combo = parts.join('+');
                              
                              const conflictItem = TOOLBAR_ITEMS.find(t => t.id !== item.id && (customHotkeys[t.id] || t.defaultHotkey) === combo);
                              if (conflictItem) {
                                showToast(`⚠️ 이미 [${conflictItem.name}] 기능에 할당된 단축키입니다.`, 'warning');
                                return;
                              }
                              const newHotkeys = { ...customHotkeys, [item.id]: combo };
                              setCustomHotkeys(newHotkeys);
                              localStorage.setItem('customHotkeys', JSON.stringify(newHotkeys));
                            }}
                            className={`w-full max-w-[120px] mx-auto px-3 py-1.5 text-[12px] font-mono font-bold text-center rounded-lg outline-none transition-all cursor-pointer border ${
                              isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-primary-fixed-dim' : 'bg-white border-outline-variant/30 text-on-surface focus:border-primary-container shadow-sm'
                            }`}
                            placeholder="클릭 후 입력"
                            readOnly
                          />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border focus-within:border-primary-container transition-all ${
                            isDarkMode ? 'bg-zinc-900 border-zinc-700 focus-within:border-primary-fixed-dim' : 'bg-white border-outline-variant/30 shadow-sm'
                          }`}>
                            <span className="font-mono font-bold opacity-40">/</span>
                            <input
                              type="text"
                              value={customSlashCommands[item.id] !== undefined ? customSlashCommands[item.id] : ''}
                              onChange={(e) => {
                                const newCmds = { ...customSlashCommands, [item.id]: e.target.value };
                                setCustomSlashCommands(newCmds);
                                localStorage.setItem('customSlashCommands', JSON.stringify(newCmds));
                              }}
                              className="w-[80px] text-[12px] font-mono font-bold outline-none bg-transparent"
                              placeholder="명령어"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
              {/* 상단 헤더 */}
              <div className="border-b pb-4 border-outline-variant/20 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-on-surface flex items-center gap-2.5">
                    <Icon name="User" className="text-[#1d4ed8]" size={24} />
                    계정 관리 (개인정보)
                  </h3>
                  <p className="text-[13px] text-on-surface-variant mt-1">
                    데이터베이스(DB)에 안전하게 보관된 회원 개인정보 및 활동명을 확인하고 관리합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAccountData}
                  disabled={isLoadingUser}
                  className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="최신 DB 데이터 다시 불러오기"
                >
                  <Icon name="Refresh" size={14} className={isLoadingUser ? 'animate-spin' : ''} />
                  <span>새로고침</span>
                </button>
              </div>

              {isLoadingUser ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Icon name="Loading" className="w-8 h-8 animate-spin text-[#1d4ed8]" />
                  <span className="text-[14px] font-medium">데이터베이스에서 회원 정보를 불러오는 중입니다...</span>
                </div>
              ) : !sessionUser ? (
                <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-4">
                  <Icon name="AlertError" className="w-10 h-10 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100">현재 비로그인 (체험판/게스트) 모드입니다</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      온리비 계정으로 로그인하시면 데이터베이스(DB)에 저장된 고유 개인정보를 확인하고 별명을 수정할 수 있습니다.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="https://onrivi.com/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const api = (window as any).electronAPI;
                        if (api?.openExternal) {
                          e.preventDefault();
                          api.openExternal('https://onrivi.com/login');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1d4ed8] hover:bg-[#1e40af] text-white transition-all shadow-xs cursor-pointer"
                    >
                      <span>로그인 페이지로 이동</span>
                      <Icon name="External" size={14} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 1. 개인정보 기본 정보 카드 */}
                  <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50/80 border-slate-200/80'} shadow-xs space-y-5`}>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100 border-b pb-3 border-slate-200/60 dark:border-zinc-800">
                      <Icon name="Shield" className="text-[#1d4ed8]" size={18} />
                      <span>회원 기본 원장 (DB users)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                      {/* 이메일 */}
                      <div className="space-y-1">
                        <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] flex items-center gap-1.5">
                          <Icon name="Mail" size={12} /> 계정 이메일
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 font-mono bg-white dark:bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 select-all">
                          {dbUser?.email || sessionUser?.email || '-'}
                        </div>
                      </div>

                      {/* 가입 방식 */}
                      <div className="space-y-1">
                        <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] flex items-center gap-1.5">
                          <Icon name="KeyRound" size={12} /> 가입/로그인 제공자 (Provider)
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between">
                          <span className="uppercase font-bold text-[#1d4ed8]">
                            {dbUser?.provider || sessionUser?.app_metadata?.provider || 'EMAIL'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1d4ed8]/10 text-[#1d4ed8] font-bold">인증됨</span>
                        </div>
                      </div>

                      {/* 회원 고유식별자 UUID */}
                      <div className="space-y-1">
                        <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] flex items-center gap-1.5">
                          <Icon name="Key" size={12} /> 고유 식별자 (User UUID)
                        </span>
                        <div className="font-mono text-[12px] text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/60 flex items-center justify-between">
                          <span className="truncate max-w-[200px]">{dbUser?.id || sessionUser?.id || '-'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(dbUser?.id || sessionUser?.id || '');
                              showToast('UUID가 클립보드에 복사되었습니다.', 'success');
                            }}
                            className="text-[#1d4ed8] hover:underline text-[11px] font-bold shrink-0 cursor-pointer ml-2"
                          >
                            복사
                          </button>
                        </div>
                      </div>

                      {/* 가입일시 */}
                      <div className="space-y-1">
                        <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] flex items-center gap-1.5">
                          <Icon name="DateNow" size={12} /> 회원 가입 일시
                        </span>
                        <div className="font-medium text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/60">
                          {dbUser?.created_at ? new Date(dbUser.created_at).toLocaleString('ko-KR') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. 별명(활동명) 수정 및 AI 챗봇 연동 카드 */}
                  <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50/80 border-slate-200/80'} shadow-xs space-y-4`}>
                    <div className="flex items-center justify-between border-b pb-3 border-slate-200/60 dark:border-zinc-800">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">
                        <Icon name="User" className="text-[#8B5CF6]" size={18} />
                        <span>활동명 / 별명 관리 (AI 챗봇 호칭 연동)</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                        실시간 AI 버튼 연동
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                      설정하신 별명은 DB에 저장되며, 에디터 우측 하단 플로팅 버튼 라벨(예: <strong className="text-violet-600 dark:text-violet-400">탕수육 AI</strong>)에 즉시 반영됩니다.
                    </p>

                    <div className="flex gap-2.5 pt-1">
                      <input
                        type="text"
                        value={editNickName}
                        onChange={(e) => setEditNickName(e.target.value)}
                        placeholder="설정할 별명을 입력하세요 (예: 탕수육)"
                        className={`flex-1 px-4 py-2.5 rounded-xl text-[14px] font-bold outline-none border transition-all ${
                          isDarkMode
                            ? 'bg-zinc-800 border-zinc-700 text-white focus:border-[#8B5CF6]'
                            : 'bg-white border-[#E0DED7] text-slate-900 focus:border-[#8B5CF6]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNickname()}
                        disabled={isSavingNick || !editNickName.trim()}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-xs active:scale-98 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isSavingNick ? <Icon name="Loading" size={15} className="animate-spin" /> : <Icon name="Save" size={15} />}
                        <span>별명 저장</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. 계정 보안 및 대시보드 바로가기 안내 */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-slate-50 border-slate-200/60'} flex items-center justify-between gap-4`}>
                    <div className="space-y-0.5">
                      <div className="text-[13px] font-bold text-slate-800 dark:text-zinc-200">구독 플랜 및 기기 접속 관리</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        대시보드에서 동시접속 기기 해제, 요금제 변경, 비밀번호 재설정을 관리할 수 있습니다.
                      </div>
                    </div>
                    <a
                      href="https://onrivi.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const api = (window as any).electronAPI;
                        if (api?.openExternal) {
                          e.preventDefault();
                          api.openExternal('https://onrivi.com/dashboard');
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-[12px] font-bold bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <span>대시보드 이동</span>
                      <Icon name="External" size={13} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>,
    document.body
  );
}

function SettingRow({ icon, title, description, control }: { icon: React.ReactNode, title: string, description: string, control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 text-on-surface-variant/70">
          {icon}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-on-surface mb-0.5">{title}</div>
          <div className="text-[13px] text-on-surface-variant">{description}</div>
        </div>
      </div>
      <div className="shrink-0">
        {control}
      </div>
    </div>
  );
}

function ToggleSwitch({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-300 outline-none ${
        active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <div 
        className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300 ${
          active ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}


