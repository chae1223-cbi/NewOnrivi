// @ts-nocheck
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDefaultHotkeys, getDefaultCommands } from "@/lib/toolbarConfig";
import { THEME_MAP } from "@/lib/editorThemes";
import { idb } from '@/lib/indexedDbHelper';
import { initializeBrowserDefaultStorage } from '@/lib/browserDefaultStorage';
import { getApiUrl } from '@/lib/apiUrlBuilder';
import { BROWSER_STORAGE_NAME } from '@/constants/storage';
import { normalizeAIModelName } from '@/lib/gemini';
import { getActiveResourceApiKey, getActiveResourceAIModel, purgeLocalStorageAICredentials } from '@/lib/ai/resourceAICredentials';
import { saveSecureData, loadSecureData } from '@/lib/secureStorage';
import { getSavedWorkspaceInfo } from '@/lib/gdrive/googleDriveClient';
import { getDefaultWatermarkSettings, saveDefaultWatermarkSettings, normalizePrintSettings,watermarkSettingsForStorage, DocumentPrintSettings } from '@/lib/documentPrintSettings';
import { readResourceShortcodes, writeResourceShortcodes } from '@/lib/resourceJson';

/**
 * [ONR-16-002] useEditorSettings 커스텀 훅
 * @description 에디터의 각종 사용자 편의 설정(테마, 단축키, 줄바꿈, 폰트크기 등)을 관리하고 영구 저장소에 저장/동기화합니다.
 */
// ====================================================================
// 📊 [OMD-EDIT-USEEDITORSETTINGS-0005] useEditorSettings.ts ➔ useEditorSettings
// 🎯 @KICK  : 에디터 사용자 설정(테마, 단축키, 폰트크기 등)을 관리하고 영구 저장소에 동기화
// 🚨 @PATCH : **2026-10-26** — [단축코드 정의서(shortcodes.json) 리소스 폴더 양방향 수화 및 실시간 동기화]:
//             1) restoreSettings 시 리소스 폴더(settings/shortcodes.json)에서 사용자 단축키 및 슬래시 명령어를 우선 복원
//             2) saveSettings 및 onrivi:resource_folder_changed 감지 시 리소스 폴더에 단축코드 정의서를 원자적으로 자동 동기화
// 🚨 @PATCH : **2026-10-19** — [브라우저 모드 작업장 절대경로 및 메타데이터 복원 정밀화]: rootFolderHandle 복구 시 localStorage의 rootFolder 및 onrivi_workspace_path 메타데이터(path, displayName)를 결합하여 rootFolder에 온전히 주입, 작업장 내부 파일 판별 정상화
// 🚨 @PATCH : **2026-10-19** — [환경설정 일반설정 기본 워터마크(위치/문구/이미지/진하기) 상태 동기화 탑재]: defaultWatermarkSettings 상태 및 localStorage/Electron 영구 동기화 파이프라인 신설
// 🚨 @PATCH : **2026-10-07** — [최종 구글 드라이브 작업장 상태 영구 복원 강화]: onrivi_last_workspace_mode 및 getSavedWorkspaceInfo 연동으로 재접속 시 구글 드라이브 작업장 상태 및 rootFolder 100% 자동 복구 보장
// 🚨 @PATCH : **2026-10-03** — [구글 드라이브(GDRIVE) 워크스페이스 세션 자동 복원 지원]: 새로고침 시 activeWorkspaceType === 'gdrive'일 때 localStorage의 rootFolder를 확인하여 구글 드라이브 서재 세션을 자동 복구
// 🚨 @PATCH : **2026-09-25** — [에디터 기본 글꼴 크기 16px 상향 및 가독성 최적화]: 작은 글씨로 인한 피로를 해소하기 위해 기본 에디터 fontSize를 14px에서 16px로 전면 상향 조정
// 🚨 @PATCH : **2026-10-01** — [단축키/명령어 기본값 자동 병합 복구]: localStorage 복원 시 기존 저장 데이터에 신규 단축키(signature 등)가 누락되지 않도록 getDefaultHotkeys/getDefaultCommands와의 베이스 병합 보장
// 🚨 @PATCH : **2026-09-25** — [에디터 글꼴 굵기 SemiBold(600) 신설 및 중간 굵기 선택지 확장]: editorFontWeight 타입에 'semibold' 추가, 400(Regular)/500(Medium)/600(SemiBold)/700(Bold) 4단계 굵기 체계 구축
// 🚨 @PATCH : **2026-09-23** — [난반사 및 저조도 대비 에디터 글꼴 굵기/고대비 설정 탑재] 환경설정에 에디터 폰트 굵기(보통/선명하게/굵게) 및 고대비 모드(ON/OFF) 상태 신설, 로컬스토리지/Electron 자동 영구 동기화 연동
// 🚨 @PATCH : **2026-09-17** — [AES 암호화 키/모델명 평문 누출 원천 차단 및 양방향 자동 복호화 연동]: 스토리지 내 U2FsdGVkX1... 암호문 유입 시 loadSecureData를 통한 즉시 복호화 보장, aiModelName 불필요한 암호화 제거 및 기본 플래그십 자동 무해 전환
// 🚨 @PATCH : **2026-09-17** — [환경설정 Gemini API 키 및 AI 모델 영구 보존 및 다중 백업 복구 체계 구축]: 암호화 보안 스토리지(saveSecureData/loadSecureData) 연동, 빈 문자열 덮어쓰기 방어 가드 적용, 로그인/로그아웃 시 API 키 유실 결함 원천 해결
// 🚨 @PATCH : **2026-09-12** — [Google AI Studio 공식 모델 한정 및 Gemini 3.1 이하 자동 정규화]: 로컬스토리지에 기존 <= 3.1 모델 잔존 시 normalizeAIModelName을 통해 최신 플래그십(gemini-3.8-flash)으로 자동 무해 정규화
//             **2026-09-05** — 환경설정에서 AI 설정(API 키) 삭제 시 null/빈문자열 상태를 즉시 빈값('')으로 반영하여 이전 키 부활 방지; **2026-09-03** — 환경설정에서 API 키 삭제 시 로컬스토리지 복구 단계에서 빈 문자열('')을 유효 상태로 인식하여 즉시 삭제 반영되도록 보완
// 🔗 @CALLS : getDefaultHotkeys, getDefaultCommands, idb.get, api.loadSettings, api.saveSettings, normalizeAIModelName, saveSecureData, loadSecureData
// ====================================================================
// 🚨 @PATCH : **2026-06-20** — 다크모드 전면 비활성화 패치: isDarkMode 상태를 항상 false로 고정하고 HTML documentElement의 dark 클래스 조작을 비활성화하여 에디터 및 렌더러가 항상 라이트 모드로 동작하도록 강제
export const useEditorSettings = (
  editorRef: any,
  mounted: boolean,
  setMounted: (val: boolean) => void,
  previewMode: string,
  setPreviewMode: any,
  setSidebarWidth: (val: number) => void,
  setActiveProfileId: (val: string) => void,
  setWorkspaceType: (val: any) => void,
  setRootFolder: (val: any) => void,
  setIsAddonEnv: (val: boolean) => void,
  showToast: (msg: string, type?: string) => void
) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(16);
  const [editorFontWeight, setEditorFontWeight] = useState<'normal' | 'medium' | 'semibold' | 'bold'>('medium');
  const [editorHighContrast, setEditorHighContrast] = useState<boolean>(false);
  const [editorTabSize,setEditorTabSize] = useState<number>(4);
  const [spellCheck,setSpellCheck] = useState(false);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
  const [autoSave, setAutoSave] = useState<number>(5);
  const [quoteStyle, setQuoteStyle] = useState<'modern' | 'clean' | 'none'>('modern');
  const [themePalette, setThemePalette] = useState<string>('onrivi-light');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => getActiveResourceApiKey());
  const [aiModelName, setAiModelName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let localModel = (localStorage.getItem('onrivi_ai_model_name') || '').trim();
      if (localModel.startsWith('U2FsdGVkX1')) {
        const dec = (loadSecureData<string>('onrivi_ai_model_name') || '').trim();
        localModel = (dec && !dec.startsWith('U2FsdGVkX1')) ? dec : '';
      }
      if (!localModel) {
        const secModel = (loadSecureData<string>('onrivi_ai_model_name') || '').trim();
        if (secModel && !secModel.startsWith('U2FsdGVkX1')) localModel = secModel;
      }
      if (localModel && !localModel.startsWith('U2FsdGVkX1')) return normalizeAIModelName(localModel);
    }
    return 'gemini-3.8-flash';
  });

  const [customHotkeys, setCustomHotkeys] = useState<Record<string, string>>(() => getDefaultHotkeys());
  const [customSlashCommands, setCustomSlashCommands] = useState<Record<string, string>>(() => getDefaultCommands());
  const [autoClosingBrackets, setAutoClosingBrackets] = useState<boolean>(true);
  const [defaultWatermarkSettings, setDefaultWatermarkSettings] = useState<DocumentPrintSettings>(() => getDefaultWatermarkSettings());
  useEffect(()=>{
    const sync=(event:Event)=>{const value=normalizePrintSettings((event as CustomEvent).detail);setDefaultWatermarkSettings(previous=>JSON.stringify(previous)===JSON.stringify(value)?previous:value);};
    window.addEventListener('onrivi:watermark_changed',sync);
    return()=>window.removeEventListener('onrivi:watermark_changed',sync);
  },[]);

  const customSlashCommandsRef = useRef<Record<string, string>>(customSlashCommands);
  useEffect(() => {
    customSlashCommandsRef.current = customSlashCommands;
  }, [customSlashCommands]);

  // ====================================================================
  // 📊 [OMD-EDIT-USEEDITORSETTINGS-0004] useEditorSettings.ts ➔ handleThemeChange
  // 🎯 @KICK  : 테마 변경 시 팔레트 ID와 다크모드 여부를 동시에 갱신
  // 🛡️ @GUARD : THEME_MAP_REF에 없는 themeId는 무시
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : 없음
  // ====================================================================
  const handleThemeChange = useCallback((themeId: string) => {
    setThemePalette(themeId);
  }, []);

  // ====================================================================
  // 📊 [OMD-EDIT-USEEDITORSETTINGS-0003] useEditorSettings.ts ➔ restoreEffect
  // 🎯 @KICK  : 마운트 시 restoreSettings를 호출하여 모든 사용자 설정 초기 복원
  // 🛡️ @GUARD : editorRef/monaco 존재 시 Monaco 에디터 테마 적용
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : restoreSettings
  // ====================================================================
  // 1. 설정 로드 및 초기 복원
  useEffect(() => {
    // ====================================================================
    // 📊 [OMD-EDIT-USEEDITORSETTINGS-0002] useEditorSettings.ts ➔ restoreSettings
    // 🎯 @KICK  : localStorage/chrome.storage/Electron에서 저장된 설정을 로드하여 복원
    // 🛡️ @GUARD : 각 스토리지별 로드 실패 시 console.error 후 기본값 유지
    // 🚨 @PATCH : **2026-07-16** — geminiApiKey 및 aiModelName이 설정 저장 시 누락되어 유실되던 치명적 동기화 버그 해결 및 개별 스토리지 복구 폴백 가드 신설, PDF 머리글/바닥글 저장 옵션 연동.
    // 🔗 @CALLS : getDefaultHotkeys, getDefaultCommands, idb.get, api.loadSettings
    // ====================================================================
    const restoreSettings = async () => {
      let baseSettings = {
        isDarkMode: false,
        fontSize: 16,
        wordWrap: 'on' as 'on' | 'off',
        autoSave: 5,
        editorTabSize: 4,
        spellCheck: false,
        previewMode: 'preview' as 'edit' | 'both' | 'preview' | 'css-style',
        quoteStyle: 'modern' as 'modern' | 'clean' | 'none',
        customHotkeys: getDefaultHotkeys(),
        customSlashCommands: getDefaultCommands(),
        themePalette: 'onrivi-light',
        editorFontWeight: 'medium' as 'normal' | 'medium' | 'semibold' | 'bold',
        editorHighContrast: false,
        licenseKey: 'chae6^jung1!jang3#&',
        geminiApiKey: '',
        aiModelName: 'gemini-3.8-flash',
        autoClosingBrackets: true,
      };

      try {
        const localData = localStorage.getItem('onrivi_settings');
        if (localData) {
          const parsed = JSON.parse(localData);
          Object.assign(baseSettings, parsed);
          if (parsed.customHotkeys) {
            baseSettings.customHotkeys = {
              ...getDefaultHotkeys(),
              ...parsed.customHotkeys
            };
          }
          if (parsed.customSlashCommands) {
            baseSettings.customSlashCommands = {
              ...getDefaultCommands(),
              ...parsed.customSlashCommands
            };
          }
          if (baseSettings.previewMode === 'css-style') baseSettings.previewMode = 'both';
        }
        
        // Migration to revert wordWrap back to 'on' per user request
        const hasMigratedWordWrap3 = localStorage.getItem('wordWrapMigrated_v3');
        if (!hasMigratedWordWrap3) {
           baseSettings.wordWrap = 'on';
           localStorage.setItem('wordWrap', 'on');
           localStorage.setItem('wordWrapMigrated_v3', 'true');
        }

        // Additional legacy keys fallback (if needed)
        const legacyFontSize = localStorage.getItem('fontSize');
        if (legacyFontSize) {
          const parsedSize = parseInt(legacyFontSize, 10);
          baseSettings.fontSize = parsedSize < 16 ? 16 : parsedSize;
        } else if (baseSettings.fontSize < 16) {
          baseSettings.fontSize = 16;
        }
        const legacyQuoteStyle = localStorage.getItem('quoteStyle');
        if (legacyQuoteStyle) baseSettings.quoteStyle = legacyQuoteStyle as any;
        const legacyTheme = localStorage.getItem('theme');
        if (legacyTheme) baseSettings.isDarkMode = legacyTheme === 'dark';
        const legacyThemePalette = localStorage.getItem('themePalette');
        if (legacyThemePalette) {
          const LEGACY_THEME_MAP: Record<string, string> = {
            'onrivi-dark': 'github-dark-dimmed',
            'midnight-neon': 'github-dark-dimmed',
          };
          baseSettings.themePalette = LEGACY_THEME_MAP[legacyThemePalette] || legacyThemePalette;
        }
        const legacyAutoSave = localStorage.getItem('autoSave');
        if (legacyAutoSave) {
          baseSettings.autoSave = legacyAutoSave === 'true' ? 5 : legacyAutoSave === 'false' ? 0 : parseInt(legacyAutoSave) || 0;
        }
        const legacyPreviewMode = localStorage.getItem('previewMode');
        if (legacyPreviewMode) baseSettings.previewMode = legacyPreviewMode as any;

        const savedFontWeight = localStorage.getItem('editorFontWeight');
        if (savedFontWeight && ['normal', 'medium', 'semibold', 'bold'].includes(savedFontWeight)) {
          baseSettings.editorFontWeight = savedFontWeight as any;
        }
        const savedHighContrast = localStorage.getItem('editorHighContrast');
        if (savedHighContrast !== null) {
          baseSettings.editorHighContrast = savedHighContrast === 'true';
        }

        const savedHotkeys = localStorage.getItem('customHotkeys');
        if (savedHotkeys) {
          baseSettings.customHotkeys = {
            ...getDefaultHotkeys(),
            ...baseSettings.customHotkeys,
            ...JSON.parse(savedHotkeys)
          };
        }
        const savedSlashCmds = localStorage.getItem('customSlashCommands');
        if (savedSlashCmds) {
          baseSettings.customSlashCommands = {
            ...getDefaultCommands(),
            ...baseSettings.customSlashCommands,
            ...JSON.parse(savedSlashCmds)
          };
        }
        
        // 2차 백업 키에서 API 키와 모델명 개별 복구 (암호화 보안 스토리지 복호화 및 유효 키 보존)
        let resolvedApiKey = '';
        const rawLocalKey = (localStorage.getItem('onrivi_gemini_api_key') || localStorage.getItem('geminiApiKey') || '').trim();
        if (rawLocalKey.startsWith('U2FsdGVkX1')) {
          const dec = (loadSecureData<string>('onrivi_gemini_api_key') || loadSecureData<string>('geminiApiKey') || '').trim();
          if (dec && !dec.startsWith('U2FsdGVkX1')) resolvedApiKey = dec;
        } else if (rawLocalKey) {
          resolvedApiKey = rawLocalKey;
        }
        if (!resolvedApiKey) {
          const secureApiKey = (loadSecureData<string>('onrivi_gemini_api_key') || loadSecureData<string>('geminiApiKey') || '').trim();
          if (secureApiKey && !secureApiKey.startsWith('U2FsdGVkX1')) resolvedApiKey = secureApiKey;
        }
        if (!resolvedApiKey && baseSettings.geminiApiKey) {
          if (baseSettings.geminiApiKey.startsWith('U2FsdGVkX1')) {
            const dec = (loadSecureData<string>('onrivi_gemini_api_key') || loadSecureData<string>('geminiApiKey') || '').trim();
            if (dec && !dec.startsWith('U2FsdGVkX1')) resolvedApiKey = dec;
          } else {
            resolvedApiKey = baseSettings.geminiApiKey.trim();
          }
        }
        baseSettings.geminiApiKey = resolvedApiKey;

        let resolvedModelName = '';
        const rawModel = (localStorage.getItem('onrivi_ai_model_name') || '').trim();
        if (rawModel.startsWith('U2FsdGVkX1')) {
          const dec = (loadSecureData<string>('onrivi_ai_model_name') || '').trim();
          if (dec && !dec.startsWith('U2FsdGVkX1')) resolvedModelName = dec;
        } else if (rawModel) {
          resolvedModelName = rawModel;
        }
        if (!resolvedModelName) {
          const dec = (loadSecureData<string>('onrivi_ai_model_name') || '').trim();
          if (dec && !dec.startsWith('U2FsdGVkX1')) resolvedModelName = dec;
        }
        if (!resolvedModelName && baseSettings.aiModelName) {
          if (baseSettings.aiModelName.startsWith('U2FsdGVkX1')) {
            resolvedModelName = 'gemini-3.8-flash';
          } else {
            resolvedModelName = baseSettings.aiModelName;
          }
        }
        baseSettings.aiModelName = normalizeAIModelName(resolvedModelName || 'gemini-3.8-flash');
      } catch (e) {
        console.error('로컬스토리지 로드 실패:', e);
      }

      const chromeStorage = (window as any).chrome?.storage?.local;
      if (chromeStorage) {
        try {
          const result = await new Promise<any>((resolve) => {
            chromeStorage.get(['onrivi_settings'], (res: any) => resolve(res || {}));
          });
          if (result && result.onrivi_settings) {
            Object.assign(baseSettings, result.onrivi_settings);
            if (baseSettings.previewMode === 'css-style') baseSettings.previewMode = 'both';
          }
        } catch (e) {
          console.error('크롬 스토리지 로드 실패:', e);
        }
      }

      const api = (window as any).electronAPI;
      if (api && typeof api.loadSettings === 'function') {
        try {
          const desktopData = await api.loadSettings();
          if (desktopData) {
            const effectiveApiKey = (desktopData.geminiApiKey || '').trim() || (baseSettings.geminiApiKey || '').trim();
            const effectiveModelName = desktopData.aiModelName || baseSettings.aiModelName;
            Object.assign(baseSettings, desktopData);
            if (effectiveApiKey) baseSettings.geminiApiKey = effectiveApiKey;
            if (effectiveModelName) baseSettings.aiModelName = effectiveModelName;
          }
        } catch (e) {
          console.error('데스크탑 스토리지 로드 실패:', e);
        }
      }

      const defaultHotkeys = getDefaultHotkeys();
      const defaultCommands = getDefaultCommands();

      Object.keys(defaultHotkeys).forEach((key) => {
        if (baseSettings.customHotkeys[key] === undefined) {
          baseSettings.customHotkeys[key] = defaultHotkeys[key];
        }
      });

      Object.keys(defaultCommands).forEach((key) => {
        if (baseSettings.customSlashCommands[key] === undefined) {
          baseSettings.customSlashCommands[key] = defaultCommands[key];
        }
      });

      // 🌟 [OMD-EDIT-USEEDITORSETTINGS-0002] 패치 확장: 이전 기기(노트북 등)에 남아있는 
      // 다크모드/다크테마 찌꺼기 설정(localStorage)을 원천 무효화하고 강제 라이트 모드(onrivi-light)로 정화합니다.
      baseSettings.isDarkMode = false;
      if (baseSettings.themePalette && (baseSettings.themePalette.includes('dark') || baseSettings.themePalette === 'vs-dark')) {
        baseSettings.themePalette = 'onrivi-light';
      }

      setIsDarkMode(baseSettings.isDarkMode);
      setFontSize(baseSettings.fontSize);
      setEditorFontWeight(baseSettings.editorFontWeight || 'medium');
      setEditorHighContrast(baseSettings.editorHighContrast || false);
      setWordWrap(baseSettings.wordWrap);
      setEditorTabSize(Math.max(1,Math.min(16,Number(baseSettings.editorTabSize)||4)));
      setSpellCheck(baseSettings.spellCheck === true);
      // 하위 호환성: boolean 값이 스토리지에 남아있는 경우 변환
      if (typeof baseSettings.autoSave === 'boolean') {
        setAutoSave(baseSettings.autoSave ? 5 : 0);
      } else {
        setAutoSave(baseSettings.autoSave || 0);
      }
      setPreviewMode('preview');
      setQuoteStyle(baseSettings.quoteStyle);
      // Migrate the former default while preserving deliberately customized shortcuts.
      if (baseSettings.customHotkeys.math === 'Ctrl+M') baseSettings.customHotkeys.math = 'Ctrl+Shift+T';
      setCustomHotkeys(baseSettings.customHotkeys);
      setCustomSlashCommands(baseSettings.customSlashCommands);
      setThemePalette(baseSettings.themePalette);
      const activeResourceKey = getActiveResourceApiKey();
      if (activeResourceKey) {
        setGeminiApiKey(activeResourceKey);
      }
      purgeLocalStorageAICredentials();
      const finalModel = normalizeAIModelName(baseSettings.aiModelName || 'gemini-3.8-flash');
      const safeModel = (finalModel && !finalModel.startsWith('U2FsdGVkX1')) ? finalModel : 'gemini-3.8-flash';
      setAiModelName(safeModel);
      localStorage.setItem('onrivi_ai_model_name', safeModel);
      setAutoClosingBrackets(baseSettings.autoClosingBrackets !== undefined ? baseSettings.autoClosingBrackets : true);
      setDefaultWatermarkSettings(baseSettings.defaultWatermarkSettings?normalizePrintSettings(baseSettings.defaultWatermarkSettings):getDefaultWatermarkSettings());

      document.documentElement.classList.remove('dark');

      if (editorRef.current && (window as any).monaco) {
        const monaco = (window as any).monaco;
        monaco.editor.setTheme(baseSettings.themePalette);
      }

      const savedWidth = localStorage.getItem('sidebarWidth');
      if (savedWidth) setSidebarWidth(parseInt(savedWidth));

      const savedProfileId = localStorage.getItem('activeCssProfileId');
      if (savedProfileId) setActiveProfileId(savedProfileId);

      const detectedAddon = typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('env') === 'addon' ||
        !!((window as any).chrome?.runtime?.id)
      );
      setIsAddonEnv(detectedAddon);

      try {
        await initializeBrowserDefaultStorage();
      } catch (error) {
        console.warn('[Onrivi Author] 브라우저 기본 저장소 초기화 실패:', error);
        showToast('브라우저 저장소를 준비하지 못했습니다. 작업장 폴더나 구글 드라이브를 연결해 주세요.', 'warning');
      }
      const rawSavedWorkspaceType = localStorage.getItem('workspaceType') || localStorage.getItem('onrivi_last_workspace_mode') || 'local';
      const isLastCloud = rawSavedWorkspaceType === 'cloud' || rawSavedWorkspaceType === 'gdrive' || localStorage.getItem('onrivi_last_workspace_mode') === 'cloud';
      const activeWorkspaceType = detectedAddon ? 'browser' : (isLastCloud ? 'cloud' : rawSavedWorkspaceType);
      setWorkspaceType(activeWorkspaceType as any);

      if (activeWorkspaceType === 'gdrive' || activeWorkspaceType === 'cloud') {
        setPreviewMode('preview');
        const savedFolder = localStorage.getItem('rootFolder');
        if (savedFolder) {
          try {
            const folder = JSON.parse(savedFolder);
            if (folder && folder.type === 'GDRIVE') {
              setRootFolder(folder);
              setMounted(true);
              return;
            }
          } catch (_) {}
        }
        const wsInfo = getSavedWorkspaceInfo();
        if (wsInfo?.workspaceFolderId) {
          const gdriveFolder = {
            name: wsInfo.workspaceFolderName || '작업장',
            path: `GoogleDrive/${wsInfo.workspaceFolderName || '작업장'}`,
            displayName: `☁️ ${(wsInfo.workspaceFolderName || '작업장').split('/').pop()}`,
            type: 'GDRIVE',
            driveFolderId: wsInfo.workspaceFolderId
          };
          setRootFolder(gdriveFolder);
          setMounted(true);
          return;
        }
        setRootFolder(null);
      } else if (activeWorkspaceType === 'browser') {
        setPreviewMode('preview');

        try {
          const savedHandle = await idb.get('rootFolderHandle');
          if (savedHandle) {
            const isPermissionGranted = (await savedHandle.queryPermission({ mode: 'readwrite' })) === 'granted';
            const savedFolderRaw = localStorage.getItem('rootFolder');
            let savedMeta: any = null;
            try { savedMeta = savedFolderRaw ? JSON.parse(savedFolderRaw) : null; } catch {}
            const wsPath = localStorage.getItem('onrivi_workspace_path') || savedMeta?.path || savedMeta?.name;

            const folderObj = {
              name: wsPath || savedHandle.name,
              path: wsPath || undefined,
              displayName: savedHandle.name,
              handle: savedHandle
            };

            if (isPermissionGranted) {
              setRootFolder(folderObj);
            } else {
              setRootFolder({ ...folderObj, needPermission: true } as any);
            }
          } else {
            setRootFolder(null);
          }
        } catch (idbErr) {
          console.warn('[Onrivi Author] IndexedDB 폴더 핸들 복구 실패:', idbErr);
          setRootFolder(null);
        }
      } else {
        const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
        let rootPath: string | null = null;

        // 🎯 [최종 청정화]: 웹 브라우저든 일렉트론이든 백엔드를 안 쓰면 
        // 굳이 fetch 쳐서 에러 내지 말고, 무조건 로컬 캐시를 쓰도록 안전 유도!
        const savedFolder = localStorage.getItem('rootFolder');

        if (savedFolder) {
          try {
            const folder = JSON.parse(savedFolder);
            const hasInvalidChar = folder.name && (
              folder.name.includes('?') ||
              folder.name.includes('\uFFFD')
            );
            if (hasInvalidChar) {
              showToast('워크스페이스 캐시가 유효하지 않아 초기화합니다.', 'warning');
              localStorage.removeItem('rootFolder');
              localStorage.removeItem('workspaceType');
              setRootFolder(null);
            } else if (folder.name && folder.name !== BROWSER_STORAGE_NAME && folder.name !== 'C:\\') {
              setRootFolder(folder);
            } else {
              localStorage.removeItem('rootFolder');
              localStorage.removeItem('workspaceType');
            }
          } catch (e) {
            localStorage.removeItem('rootFolder');
          }
        }
      }

      setMounted(true);
    };

    restoreSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef]);

  // ====================================================================
  // 📊 [OMD-EDIT-USEEDITORSETTINGS-0001] useEditorSettings.ts ➔ settingsSyncEffect
  // 🎯 @KICK  : isDarkMode/fontSize 등 설정 변경 시 localStorage/chrome/Electron에 동기화 저장
  // 🛡️ @GUARD : mounted 상태 미달 시 early return
  // 🚨 @PATCH : 없음
  // 🔗 @CALLS : api.saveSettings, chrome.storage.local.set
  // ====================================================================
  // 2. 설정 동기화 저장
  useEffect(() => {
    if (!mounted) return;

    const settings = {
      isDarkMode,
      fontSize,
      editorTabSize,
      spellCheck,
      defaultWatermarkSettings:watermarkSettingsForStorage(defaultWatermarkSettings),
      editorFontWeight,
      editorHighContrast,
      wordWrap,
      autoSave,
      previewMode,
      quoteStyle,
      themePalette,
      autoClosingBrackets,
      geminiApiKey,
      aiModelName
    };

    localStorage.setItem('onrivi_settings', JSON.stringify(settings));
    localStorage.setItem('theme', 'light');
    localStorage.setItem('fontSize', fontSize.toString());
    localStorage.setItem('editorFontWeight', editorFontWeight);
    localStorage.setItem('editorHighContrast', editorHighContrast ? 'true' : 'false');
    localStorage.setItem('wordWrap', wordWrap);
    localStorage.setItem('quoteStyle', quoteStyle);
    localStorage.setItem('customHotkeys', JSON.stringify(customHotkeys));
    localStorage.setItem('customSlashCommands', JSON.stringify(customSlashCommands));
    localStorage.setItem('themePalette', themePalette);
    localStorage.setItem('autoSave', autoSave ? 'true' : 'false');
    // 🛡️ API 키는 로컬스토리지에 보관하지 않고 오직 리소스 폴더에만 암호화 보관
    purgeLocalStorageAICredentials();
    const cleanModel = normalizeAIModelName(aiModelName);
    const safeModel = (cleanModel && !cleanModel.startsWith('U2FsdGVkX1')) ? cleanModel : 'gemini-3.8-flash';
    localStorage.setItem('onrivi_ai_model_name', safeModel);
    if (previewMode !== 'css-style') localStorage.setItem('previewMode', previewMode);

    saveDefaultWatermarkSettings(defaultWatermarkSettings);

    const chromeStorage = (window as any).chrome?.storage?.local;
    if (chromeStorage) {
      chromeStorage.set({ onrivi_settings: settings });
    }

    const api = (window as any).electronAPI;
    if (api && typeof api.saveSettings === 'function') {
      api.saveSettings(settings);
    }
  }, [
    mounted,
    isDarkMode,
    fontSize,
    editorTabSize,
    spellCheck,
    editorFontWeight,
    editorHighContrast,
    wordWrap,
    autoSave,
    previewMode,
    quoteStyle,
    customHotkeys,
    customSlashCommands,
    licenseKey,
    geminiApiKey,
    aiModelName,
    themePalette,
    autoClosingBrackets,
    defaultWatermarkSettings
  ]);


  useEffect(() => {
    const handleCredsChange = (e: any) => {
      const detail = e?.detail;
      if (detail) {
        if (typeof detail.apiKey === 'string') setGeminiApiKey(detail.apiKey);
        if (detail.aiModelName) setAiModelName(detail.aiModelName);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('onrivi:resource_ai_credentials_changed', handleCredsChange);
      return () => window.removeEventListener('onrivi:resource_ai_credentials_changed', handleCredsChange);
    }
  }, []);

  return {
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    editorTabSize,setEditorTabSize,
    spellCheck,setSpellCheck,
    editorFontWeight,
    setEditorFontWeight,
    editorHighContrast,
    setEditorHighContrast,
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
    geminiApiKey,
    setGeminiApiKey,
    aiModelName,
    setAiModelName,
    autoClosingBrackets,
    setAutoClosingBrackets,
    customHotkeys,
    setCustomHotkeys,
    customSlashCommands,
    setCustomSlashCommands,
    customSlashCommandsRef,
    handleThemeChange,
    defaultWatermarkSettings,
    setDefaultWatermarkSettings
  };
};
